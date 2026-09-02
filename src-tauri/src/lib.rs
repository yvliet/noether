mod vault;
mod icon_tint;

use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{Emitter, Manager};
use vault::{load_config, AppState};
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
            vault::focus_main_window,
            vault::register_global_shortcut,
            vault::unregister_global_shortcut,
            set_accent_icon,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            let vault_to_watch = initial_vault.clone();

            // Initialize general-purpose global hotkey loop
            vault::init_global_hotkeys(handle.clone());

            let handle_watcher = handle.clone();
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
                                    let _ = handle_watcher.emit("vault-files-changed", ());
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
