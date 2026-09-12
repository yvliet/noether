mod vault;
mod icon_tint;
mod db;

use std::path::Path;
use parking_lot::Mutex;
use std::time::Duration;
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
            vault::save_markdown_file,
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
            vault::window_minimize,
            vault::window_maximize,
            vault::window_close,
            vault::window_is_maximized,
            vault::window_is_minimized,
            vault::window_start_dragging,
            vault::window_set_title,
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
        ])
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
                            // If Noether itself just saved/edited the file internally, ignore the event
                            if vault::is_recent_internal_write() {
                                continue;
                            }

                            let should_emit = paths.iter().any(|p| {
                                let p_str = p.to_string_lossy().replace('\\', "/");
                                !p_str.contains("/.noether") && !p_str.contains("/.git") && !p_str.contains("/.")
                            });

                            if should_emit {
                                // Debounce slightly
                                std::thread::sleep(Duration::from_millis(150));
                                if !vault::is_recent_internal_write() {
                                    let _ = handle_watcher.emit("vault-files-changed", ());
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
