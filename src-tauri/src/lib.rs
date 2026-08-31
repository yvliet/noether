mod vault;
mod icon_tint;

use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{Emitter, Manager};
use vault::{load_config, AppState};

#[cfg(target_os = "windows")]
mod win_mem {
    use std::mem::size_of;

    #[repr(C)]
    #[derive(Clone, Copy)]
    #[allow(non_snake_case)]
    pub struct PROCESSENTRY32W {
        pub dwSize: u32,
        pub cntUsage: u32,
        pub th32ProcessID: u32,
        pub th32DefaultHeapID: usize,
        pub th32ModuleID: u32,
        pub cntThreads: u32,
        pub th32ParentProcessID: u32,
        pub pcPriClassBase: i32,
        pub dwFlags: u32,
        pub szExeFile: [u16; 260],
    }

    extern "system" {
        pub fn GetCurrentProcess() -> isize;
        pub fn GetCurrentProcessId() -> u32;
        pub fn OpenProcess(dwDesiredAccess: u32, bInheritHandle: i32, dwProcessId: u32) -> isize;
        pub fn CloseHandle(hObject: isize) -> i32;
        pub fn SetProcessWorkingSetSize(hProcess: isize, dwMinimumWorkingSetSize: usize, dwMaximumWorkingSetSize: usize) -> i32;
        pub fn CreateToolhelp32Snapshot(dwFlags: u32, th32ProcessID: u32) -> isize;
        pub fn Process32FirstW(hSnapshot: isize, lppe: *mut PROCESSENTRY32W) -> i32;
        pub fn Process32NextW(hSnapshot: isize, lppe: *mut PROCESSENTRY32W) -> i32;
    }

    const TH32CS_SNAPPROCESS: u32 = 0x00000002;
    const PROCESS_SET_QUOTA: u32 = 0x0100;
    const PROCESS_QUERY_INFORMATION: u32 = 0x0400;

    pub fn trim_entire_process_tree() {
        unsafe {
            // 1. Trim host Flint process
            SetProcessWorkingSetSize(GetCurrentProcess(), usize::MAX, usize::MAX);

            // 2. Snapshot process tree to find child WebView2 processes (GPU, Renderer, Utilities)
            let cur_pid = GetCurrentProcessId();
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if snapshot == -1 || snapshot == 0 {
                return;
            }

            let mut entry: PROCESSENTRY32W = std::mem::zeroed();
            entry.dwSize = size_of::<PROCESSENTRY32W>() as u32;

            let mut child_pids = Vec::new();
            if Process32FirstW(snapshot, &mut entry) != 0 {
                loop {
                    if entry.th32ParentProcessID == cur_pid {
                        child_pids.push(entry.th32ProcessID);
                    }
                    if Process32NextW(snapshot, &mut entry) == 0 {
                        break;
                    }
                }
            }

            // Also find grandchildren (e.g. GPU / Renderer spawned by WebView2 manager)
            let mut all_pids = child_pids.clone();
            if Process32FirstW(snapshot, &mut entry) != 0 {
                loop {
                    if child_pids.contains(&entry.th32ParentProcessID) && !all_pids.contains(&entry.th32ProcessID) {
                        all_pids.push(entry.th32ProcessID);
                    }
                    if Process32NextW(snapshot, &mut entry) == 0 {
                        break;
                    }
                }
            }

            CloseHandle(snapshot);

            // 3. Trim each child and grandchild process
            for pid in all_pids {
                let h_proc = OpenProcess(PROCESS_SET_QUOTA | PROCESS_QUERY_INFORMATION, 0, pid);
                if h_proc != 0 && h_proc != -1 {
                    SetProcessWorkingSetSize(h_proc, usize::MAX, usize::MAX);
                    CloseHandle(h_proc);
                }
            }
        }
    }
}

#[tauri::command]
fn set_accent_icon(app_handle: tauri::AppHandle, accent_color: String) -> Result<(), String> {
    let icon = icon_tint::create_accent_tauri_image(&accent_color);
    for (_, window) in app_handle.webview_windows() {
        let _ = window.set_icon(icon.clone());
    }
    Ok(())
}

pub fn run() {
    #[cfg(target_os = "windows")]
    {
        // High-performance Chromium & GPU flags to minimize memory footprint (<100MB RAM target)
        let flags = [
            // Feature exclusions & background telemetry removal
            "--disable-features=Translate,OptimizationHints,MediaRouter,CalculateNativeWinOcclusion,InterestFeedContentSuggestions,UseSkiaGraphite",
            "--disable-background-networking",
            "--disable-component-update",
            "--disable-domain-reliability",
            "--disable-sync",
            // Process count constraints
            "--renderer-process-limit=1",
            "--process-per-site",
            // GPU & Media buffer optimizations (Saves ~50-60MB in GPU process)
            "--disable-accelerated-video-decode",
            "--disable-accelerated-video-encode",
            "--disable-gpu-memory-buffer-video-frames",
            "--disable-direct-composition-video-overlays",
            "--disable-2d-canvas-image-chromium",
            "--gpu-rasterization-msaa-sample-count=0",
            "--canvas-msaa-sample-count=0",
            "--num-raster-threads=1",
            // V8 JS heap constraints
            "--js-flags=--max-semi-space-size=4,--initial-heap-size=16",
        ].join(" ");
        std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", flags);

        // Smart background working set trimming across entire WebView2 process tree when user is idle (>= 120s)
        std::thread::spawn(|| {
            // Initial warm-up delay after boot
            std::thread::sleep(Duration::from_secs(15));
            win_mem::trim_entire_process_tree();

            loop {
                std::thread::sleep(Duration::from_secs(30));
                // Only trim physical RAM working set if the user has been inactive for >= 120s
                // This completely prevents page-fault micro-stutters during active typing!
                if vault::get_user_idle_seconds() >= 120 {
                    win_mem::trim_entire_process_tree();
                }
            }
        });
    }

    let initial_config = load_config();
    let initial_vault = initial_config.current_vault_path.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            config: Mutex::new(initial_config),
        })
        .invoke_handler(tauri::generate_handler![
            vault::get_current_vault,
            vault::set_current_vault,
            vault::create_new_vault,
            vault::rename_hearth,
            vault::rename_vault,
            vault::remove_recent_vault,
            vault::open_vault_in_explorer,
            vault::scan_vault_files,
            vault::save_markdown_file,
            vault::set_file_attributes,
            vault::delete_markdown_file,
            vault::rename_markdown_file,
            vault::save_database,
            vault::load_database,
            vault::open_plugins_folder,
            vault::open_trash_folder,
            vault::save_trash_file,
            vault::delete_trash_file,
            vault::empty_trash_folder,
            vault::list_installed_plugins,
            vault::read_plugin_bundle,
            vault::open_vault_window,
            vault::close_vault_window,
            vault::open_settings_window,
            vault::close_settings_window,
            vault::window_minimize,
            vault::window_maximize,
            vault::window_close,
            vault::window_is_maximized,
            vault::window_start_dragging,
            vault::window_set_title,
            vault::notify_user_activity,
            set_accent_icon,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            let vault_to_watch = initial_vault.clone();

            // Background thread for real-time vault file watcher (cross-platform)
            std::thread::spawn(move || {
                let (tx, rx) = std::sync::mpsc::channel();
                let mut watcher = match RecommendedWatcher::new(tx, Config::default()) {
                    Ok(w) => w,
                    Err(e) => {
                        eprintln!("[Flint Watcher] Failed to initialize file watcher: {}", e);
                        return;
                    }
                };

                let path_to_watch = Path::new(&vault_to_watch);
                if path_to_watch.exists() {
                    let _ = watcher.watch(path_to_watch, RecursiveMode::Recursive);
                }

                while let Ok(res) = rx.recv() {
                    match res {
                        Ok(Event { paths, .. }) => {
                            // If Flint itself just saved/edited the file internally, ignore the event
                            if vault::is_recent_internal_write() {
                                continue;
                            }

                            let should_emit = paths.iter().any(|p| {
                                let p_str = p.to_string_lossy().replace('\\', "/");
                                !p_str.contains("/.flint") && !p_str.contains("/.git") && !p_str.contains("/.")
                            });

                            if should_emit {
                                // Debounce slightly
                                std::thread::sleep(Duration::from_millis(150));
                                if !vault::is_recent_internal_write() {
                                    let _ = handle.emit("vault-files-changed", ());
                                }
                            }
                        }
                        Err(e) => eprintln!("[Flint Watcher] Watch error: {:?}", e),
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running flint application");
}
