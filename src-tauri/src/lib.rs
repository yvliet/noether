mod vault;
mod icon_tint;
mod db;
mod vcs;

use std::path::{Path, PathBuf};
use parking_lot::Mutex;
use notify::Event;
use tauri::{Emitter, Manager};
use vault::{load_config, AppState, WatcherState};

#[tauri::command]
fn set_accent_icon(app_handle: tauri::AppHandle, accent_color: String) -> Result<(), String> {
    let icon = icon_tint::create_accent_tauri_image(&accent_color);
    for (_, window) in app_handle.webview_windows() {
        let _ = window.set_icon(icon.clone());
    }
    Ok(())
}

pub fn run() {
    let initial_config = load_config();
    let initial_vault = initial_config.current_vault_path.clone();

    let (watcher_tx, watcher_rx) = std::sync::mpsc::channel();
    let watcher_state = WatcherState::new(watcher_tx);

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            config: Mutex::new(initial_config),
        })
        .manage(db::DbState::new())
        .manage(watcher_state)
        .invoke_handler(tauri::generate_handler![
            vault::get_current_vault,
            vault::set_current_vault,
            vault::create_new_vault,
            vault::rename_vault,
            vault::remove_recent_vault,
            vault::open_vault_in_explorer,
            vault::scan_vault_files,
            vault::create_vault_folder,
            vault::save_markdown_file,
            vault::read_markdown_file,
            vault::set_file_attributes,
            vault::delete_markdown_file,
            vault::rename_markdown_file,
            vault::open_plugins_folder,
            vault::open_trash_folder,
            vault::save_trash_file,
            vault::delete_trash_file,
            vault::empty_trash_folder,
            vault::list_installed_plugins,
            vault::read_plugin_bundle,
            vault::install_plugin_bundle,
            vault::uninstall_plugin_bundle,
            vault::open_vault_window,
            vault::close_vault_window,
            vault::open_settings_window,
            vault::close_settings_window,
            vault::open_help_window,
            vault::close_help_window,
            vault::save_app_settings,
            vault::load_app_settings,
            vault::window_minimize,
            vault::window_maximize,
            vault::window_close,
            vault::window_is_maximized,
            vault::window_is_minimized,
            vault::window_start_dragging,
            vault::window_set_title,
            vault::window_trim_memory,
            vault::notify_user_activity,
            vault::focus_main_window,
            vault::register_global_shortcut,
            vault::unregister_global_shortcut,
            vault::download_remote_text,
            set_accent_icon,
            db::noether_db_init,
            db::noether_db_query,
            db::noether_db_execute,
            db::noether_db_transaction,
            db::noether_db_supports_fts5,
            vcs::vcs_check_status,
            vcs::vcs_init_vault,
            vcs::vcs_create_snapshot,
            vcs::vcs_get_file_history,
            vcs::vcs_get_file_diff,
            vcs::vcs_get_historical_content,
            vcs::vcs_restore_file,
        ])
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::Resized(_)
            | tauri::WindowEvent::Focused(_)
            | tauri::WindowEvent::Moved(_) => {
                let is_min = window.is_minimized().unwrap_or(false);
                let _ = window.emit("window-minimized-change", is_min);
                if is_min {
                    vault::window_trim_memory();
                }
            }
            _ => {}
        })
        .setup(move |app| {
            let handle = app.handle().clone();
            let vault_to_watch = initial_vault.clone();

            // Auto-initialize native SQLite database on cold startup
            let _ = db::noether_db_init(app.state::<db::DbState>(), Some(initial_vault.clone()));

            // Initialize sharp high-resolution window icon
            let initial_icon = icon_tint::create_accent_tauri_image("#eb584d");
            for (_, window) in app.webview_windows() {
                let _ = window.set_icon(initial_icon.clone());
            }

            // On macOS, activate decorations so the Overlay title bar renders native traffic lights
            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_decorations(true);
                }
            }

            // Initialize general-purpose global hotkey loop
            vault::init_global_hotkeys(handle.clone());

            // Initialize watcher for initial vault path
            let watcher = app.state::<WatcherState>();
            let initial_path = Path::new(&vault_to_watch);
            if initial_path.exists() {
                watcher.watch(initial_path);
            }

            let handle_watcher = handle.clone();
            // Background thread for real-time vault file watcher (cross-platform)
            std::thread::spawn(move || {
                while let Ok(res) = watcher_rx.recv() {
                    match res {
                        Ok(Event { paths, .. }) => {
                            let current_vault = {
                                let app_state = handle_watcher.state::<AppState>();
                                let cfg = app_state.config.lock();
                                PathBuf::from(&cfg.current_vault_path)
                            };

                            // Filter paths: ignore vault root, directory-only events, dotfolders, temp files, and verified internal echoes
                            let non_echo_paths: Vec<PathBuf> = paths
                                .into_iter()
                                .filter(|p| {
                                    if p == &current_vault || p.is_dir() {
                                        return false;
                                    }
                                    let p_str = p.to_string_lossy().replace('\\', "/");
                                    if p_str.contains("/.noether") || p_str.contains("/.git") || p_str.contains("/.trash") {
                                        return false;
                                    }
                                    if p_str.contains(".tmp.") || p_str.ends_with(".tmp") {
                                        return false;
                                    }
                                    // Deterministic echo suppression: verify against per-path fingerprint
                                    if vault::is_internal_echo(p) {
                                        return false;
                                    }
                                    true
                                })
                                .collect();

                            if !non_echo_paths.is_empty() {
                                let verified_relative_paths: Vec<String> = non_echo_paths
                                    .iter()
                                    .filter(|p| !p.is_dir())
                                    .map(|p| vault::relative_to_vault(&current_vault, p))
                                    .filter(|rel| !rel.is_empty() && rel != ".")
                                    .collect();

                                if !verified_relative_paths.is_empty() {
                                    let _ = handle_watcher.emit(
                                        "vault-files-changed",
                                        serde_json::json!({ "paths": verified_relative_paths }),
                                    );
                                }
                            }
                        }
                        Err(e) => eprintln!("[Noether Watcher] Watch error: {:?}", e),
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running noether application");
}
