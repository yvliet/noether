use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::Sender;
use parking_lot::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};
use walkdir::WalkDir;

static LAST_INTERNAL_WRITE: AtomicU64 = AtomicU64::new(0);

pub fn mark_internal_write() {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
    LAST_INTERNAL_WRITE.store(now, Ordering::Relaxed);
}

pub fn is_recent_internal_write() -> bool {
    let last = LAST_INTERNAL_WRITE.load(Ordering::Relaxed);
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
    now.saturating_sub(last) < 2500
}

#[tauri::command]
pub fn notify_user_activity() -> Value {
    json!({ "success": true })
}

/// Helper to strip Windows verbatim UNC prefixes (`\\?\UNC\server\share` -> `\\server\share`)
/// and drive letter prefixes (`\\?\C:\...` -> `C:\...`).
fn strip_unc_prefix(path_str: &str) -> String {
    if path_str.len() >= 8 && path_str[..8].eq_ignore_ascii_case(r"\\?\UNC\") {
        format!(r"\\{}", &path_str[8..])
    } else if path_str.len() >= 4 && path_str[..4].eq_ignore_ascii_case(r"\\?\") {
        path_str[4..].to_string()
    } else {
        path_str.to_string()
    }
}

/// Normalizes path components and resolves relative traversals lexically without disk lookups
pub fn normalize_path(p: &Path) -> PathBuf {
    #[cfg(windows)]
    let s = p.to_string_lossy().replace('/', "\\");
    #[cfg(not(windows))]
    let s = p.to_string_lossy().replace('\\', "/");
    let stripped = strip_unc_prefix(&s);
    let path = PathBuf::from(stripped);
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => {
                normalized.pop();
            }
            std::path::Component::CurDir => {}
            _ => normalized.push(component),
        }
    }
    normalized
}

/// Helper to normalize and ensure a target path stays strictly inside the vault root or .noether directory
pub fn is_safe_vault_path(target_vault: &Path, candidate: &Path) -> bool {
    if target_vault.as_os_str().is_empty() || candidate.as_os_str().is_empty() {
        return false;
    }

    let vault_canonical = match target_vault.canonicalize() {
        Ok(p) => normalize_path(&p),
        Err(_) => normalize_path(target_vault),
    };

    let candidate_canonical = if let Ok(p) = candidate.canonicalize() {
        normalize_path(&p)
    } else {
        let mut current = candidate.to_path_buf();
        let mut tail = Vec::new();
        while !current.as_os_str().is_empty() && !current.exists() {
            if let Some(name) = current.file_name() {
                tail.push(name.to_os_string());
            }
            if let Some(parent) = current.parent() {
                current = parent.to_path_buf();
            } else {
                break;
            }
        }

        if current.exists() {
            match current.canonicalize() {
                Ok(mut canon) => {
                    for seg in tail.into_iter().rev() {
                        canon.push(seg);
                    }
                    normalize_path(&canon)
                }
                Err(_) => normalize_path(candidate),
            }
        } else {
            normalize_path(candidate)
        }
    };

    let check_starts_with = |cand: &Path, base: &Path| -> bool {
        #[cfg(windows)]
        {
            let cand_lower = cand.to_string_lossy().to_lowercase();
            let base_lower = base.to_string_lossy().to_lowercase();
            Path::new(&cand_lower).starts_with(Path::new(&base_lower))
        }
        #[cfg(not(windows))]
        {
            cand.starts_with(base)
        }
    };

    check_starts_with(&candidate_canonical, &vault_canonical)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RecentVaultItem {
    pub path: String,
    pub name: String,
    pub last_opened: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoetherConfig {
    pub current_vault_path: String,
    pub recent_vaults: Vec<RecentVaultItem>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct VaultDiskItem {
    pub relative_path: String,
    pub name: String,
    pub is_folder: bool,
    pub mtime: u64,
    pub content: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub folder: String,
    pub is_core: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PluginBundle {
    pub success: bool,
    pub js_code: Option<String>,
    pub css_code: Option<String>,
    pub error: Option<String>,
}

pub struct AppState {
    pub config: Mutex<NoetherConfig>,
}

pub struct WatcherState {
    pub watcher: Mutex<Option<RecommendedWatcher>>,
    pub watched_path: Mutex<Option<PathBuf>>,
    pub tx: Sender<Result<Event, notify::Error>>,
}

impl WatcherState {
    pub fn new(tx: Sender<Result<Event, notify::Error>>) -> Self {
        Self {
            watcher: Mutex::new(None),
            watched_path: Mutex::new(None),
            tx,
        }
    }

    pub fn watch(&self, path: &Path) {
        let mut watcher_lock = self.watcher.lock();
        let mut path_lock = self.watched_path.lock();

        if let Some(existing) = path_lock.as_ref() {
            if existing == path && watcher_lock.is_some() {
                return;
            }
        }

        // Drop existing watcher to release Windows directory handle immediately
        *watcher_lock = None;
        *path_lock = None;

        if !path.exists() {
            return;
        }

        if let Ok(mut watcher) = RecommendedWatcher::new(self.tx.clone(), Config::default()) {
            if watcher.watch(path, RecursiveMode::Recursive).is_ok() {
                *watcher_lock = Some(watcher);
                *path_lock = Some(path.to_path_buf());
            }
        }
    }

    #[allow(dead_code)]
    pub fn unwatch(&self) {
        let mut watcher_lock = self.watcher.lock();
        let mut path_lock = self.watched_path.lock();
        *watcher_lock = None;
        *path_lock = None;
    }

    pub fn unwatch_if_matching(&self, target_path: &Path) -> Option<PathBuf> {
        let mut watcher_lock = self.watcher.lock();
        let mut path_lock = self.watched_path.lock();

        if let Some(watched) = path_lock.as_ref() {
            let watched_norm = normalize_path(watched);
            let target_norm = normalize_path(target_path);

            #[cfg(windows)]
            let is_match = {
                let w_s = watched_norm.to_string_lossy().to_lowercase();
                let t_s = target_norm.to_string_lossy().to_lowercase();
                w_s == t_s || w_s.starts_with(&t_s)
            };
            #[cfg(not(windows))]
            let is_match = watched_norm == target_norm || watched_norm.starts_with(&target_norm);

            if is_match {
                let prev = watched.clone();
                *watcher_lock = None;
                *path_lock = None;
                return Some(prev);
            }
        }
        None
    }
}

fn get_default_vault_path() -> String {
    let docs = dirs::document_dir().unwrap_or_else(|| PathBuf::from("."));
    docs.join("Noether Vault").to_string_lossy().to_string()
}

pub fn get_config_path() -> PathBuf {
    let config_dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    let noether_config_dir = config_dir.join("noether");
    let _ = fs::create_dir_all(&noether_config_dir);
    noether_config_dir.join("noether-config.json")
}

pub fn load_config() -> NoetherConfig {
    let path = get_config_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(cfg) = serde_json::from_str::<NoetherConfig>(&content) {
                return cfg;
            }
        }
    }

    let default_vault = get_default_vault_path();
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
    NoetherConfig {
        current_vault_path: default_vault.clone(),
        recent_vaults: vec![RecentVaultItem {
            path: default_vault,
            name: "Noether Vault".to_string(),
            last_opened: now,
        }],
    }
}

pub fn save_config(cfg: &NoetherConfig) {
    let path = get_config_path();
    if let Ok(serialized) = serde_json::to_string_pretty(cfg) {
        let _ = fs::write(path, serialized);
    }
}

#[tauri::command]
pub fn get_current_vault(state: tauri::State<AppState>) -> Value {
    let cfg = state.config.lock();
    let vault_name = Path::new(&cfg.current_vault_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Noether Vault".to_string());

    json!({
        "path": cfg.current_vault_path,
        "name": vault_name,
        "recentVaults": cfg.recent_vaults
    })
}

#[tauri::command]
pub fn set_current_vault(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    db_state: tauri::State<'_, crate::db::DbState>,
    watcher_state: tauri::State<'_, WatcherState>,
    vault_path: String,
) -> Value {
    let _ = fs::create_dir_all(&vault_path);
    let chosen_name = Path::new(&vault_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Vault".to_string());

    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);

    let mut cfg = state.config.lock();
    cfg.current_vault_path = vault_path.clone();
    cfg.recent_vaults.retain(|v| v.path != vault_path);
    cfg.recent_vaults.insert(0, RecentVaultItem {
        path: vault_path.clone(),
        name: chosen_name.clone(),
        last_opened: now,
    });
    if cfg.recent_vaults.len() > 10 {
        cfg.recent_vaults.truncate(10);
    }
    save_config(&cfg);

    // Switch watcher to the new vault directory
    watcher_state.watch(Path::new(&vault_path));

    // Re-bind native SQLite database to the newly chosen vault path
    let _ = crate::db::noether_db_init(db_state, Some(vault_path.clone()));

    let payload = json!({
        "success": true,
        "path": vault_path,
        "name": chosen_name,
        "recentVaults": cfg.recent_vaults
    });

    let _ = app.emit("vault-changed", payload.clone());

    if let Some(vault_win) = app.get_webview_window("vault-switcher") {
        let _ = vault_win.close();
    }

    payload
}

#[tauri::command]
pub fn create_new_vault(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    db_state: tauri::State<'_, crate::db::DbState>,
    watcher_state: tauri::State<'_, WatcherState>,
    name: String,
    parent_path: Option<String>,
) -> Value {
    let clean_name = name.replace(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'], "_").trim().to_string();
    let base_dir = match parent_path {
        Some(p) if !p.trim().is_empty() => PathBuf::from(p),
        _ => dirs::document_dir().unwrap_or_else(|| PathBuf::from(".")),
    };

    let new_vault_path = base_dir.join(&clean_name);
    let _ = fs::create_dir_all(&new_vault_path);
    let path_str = new_vault_path.to_string_lossy().to_string();

    set_current_vault(app, state, db_state, watcher_state, path_str)
}

fn format_rename_error(err: Option<&std::io::Error>) -> String {
    if let Some(e) = err {
        let code = e.raw_os_error();
        let err_str = e.to_string();
        if code == Some(5) || code == Some(32) || err_str.contains("Access is denied") || err_str.contains("used by another process") {
            "Cannot rename this vault because it is currently opened or in use. Please close any files or programs accessing this folder and try again.".to_string()
        } else {
            format!("Could not rename folder on disk: {}", err_str)
        }
    } else {
        "Could not rename folder on disk.".to_string()
    }
}

#[tauri::command]
pub fn rename_vault(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    db_state: tauri::State<'_, crate::db::DbState>,
    watcher_state: tauri::State<'_, WatcherState>,
    target_path: String,
    new_name: String,
) -> Value {
    let clean_name = new_name.replace(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'], "_").trim().to_string();
    if clean_name.is_empty() {
        return json!({ "success": false, "error": "Name cannot be empty" });
    }

    let target = if target_path.trim().is_empty() {
        let cfg = state.config.lock();
        cfg.current_vault_path.clone()
    } else {
        target_path.clone()
    };

    let target_path_buf = PathBuf::from(&target);
    if !target_path_buf.exists() {
        return json!({ "success": false, "error": "Vault folder not found on disk." });
    }

    let parent = target_path_buf.parent().unwrap_or_else(|| Path::new("."));
    let target_new_path = parent.join(&clean_name);

    if target_new_path == target_path_buf {
        let cfg = state.config.lock();
        return json!({
            "success": true,
            "path": target,
            "name": clean_name,
            "recentVaults": cfg.recent_vaults,
        });
    }

    let is_case_only = target_new_path.to_string_lossy().to_lowercase() == target_path_buf.to_string_lossy().to_lowercase();
    if !is_case_only && target_new_path.exists() {
        return json!({
            "success": false,
            "error": format!("A folder named \"{}\" already exists at this location.", clean_name)
        });
    }

    // Release Noether's own locks before attempting to rename directory on Windows
    let closed_db_path = db_state.close_if_matching(&target_path_buf);
    let unwatched_path = watcher_state.unwatch_if_matching(&target_path_buf);

    // If folder has read-only attribute on Windows, temporarily unset it
    if let Ok(mut perms) = fs::metadata(&target_path_buf).map(|m| m.permissions()) {
        if perms.readonly() {
            perms.set_readonly(false);
            let _ = fs::set_permissions(&target_path_buf, perms);
        }
    }

    // Give OS filter drivers and anti-virus scanners a brief pause to release handles
    #[cfg(windows)]
    std::thread::sleep(std::time::Duration::from_millis(60));

    let rename_res: Result<(), String> = if is_case_only {
        let temp_path = parent.join(format!("{}.__noether_tmp_rename_{}__", clean_name, std::process::id()));
        let mut step1_ok = false;
        let mut last_err: Option<std::io::Error> = None;
        for attempt in 0..10 {
            match fs::rename(&target_path_buf, &temp_path) {
                Ok(()) => {
                    step1_ok = true;
                    break;
                }
                Err(e) => {
                    let code = e.raw_os_error();
                    last_err = Some(e);
                    if code == Some(5) || code == Some(32) {
                        std::thread::sleep(std::time::Duration::from_millis(80 * (attempt + 1)));
                    } else {
                        break;
                    }
                }
            }
        }

        if !step1_ok {
            Err(format_rename_error(last_err.as_ref()))
        } else {
            let mut step2_ok = false;
            for attempt in 0..10 {
                match fs::rename(&temp_path, &target_new_path) {
                    Ok(()) => {
                        step2_ok = true;
                        break;
                    }
                    Err(e) => {
                        let code = e.raw_os_error();
                        last_err = Some(e);
                        if code == Some(5) || code == Some(32) {
                            std::thread::sleep(std::time::Duration::from_millis(80 * (attempt + 1)));
                        } else {
                            break;
                        }
                    }
                }
            }

            if !step2_ok {
                // Rollback step 1
                let _ = fs::rename(&temp_path, &target_path_buf);
                Err(format_rename_error(last_err.as_ref()))
            } else {
                Ok(())
            }
        }
    } else {
        let mut renamed = false;
        let mut last_err: Option<std::io::Error> = None;
        for attempt in 0..10 {
            match fs::rename(&target_path_buf, &target_new_path) {
                Ok(()) => {
                    renamed = true;
                    break;
                }
                Err(e) => {
                    let code = e.raw_os_error();
                    last_err = Some(e);
                    if code == Some(5) || code == Some(32) {
                        std::thread::sleep(std::time::Duration::from_millis(80 * (attempt + 1)));
                    } else {
                        break;
                    }
                }
            }
        }

        if !renamed {
            Err(format_rename_error(last_err.as_ref()))
        } else {
            Ok(())
        }
    };

    if let Err(err_msg) = rename_res {
        // Rollback: restore active database connection and watcher on original path
        if let Some(prev_db) = closed_db_path {
            let _ = crate::db::noether_db_init(db_state, Some(prev_db));
        }
        if let Some(prev_watched) = unwatched_path {
            watcher_state.watch(&prev_watched);
        }
        return json!({ "success": false, "error": err_msg });
    }

    let final_path = target_new_path.to_string_lossy().to_string();

    let mut cfg = state.config.lock();
    let target_norm = normalize_path(Path::new(&target));
    let current_norm = normalize_path(Path::new(&cfg.current_vault_path));

    #[cfg(windows)]
    let is_current = target.is_empty()
        || current_norm.to_string_lossy().eq_ignore_ascii_case(&target_norm.to_string_lossy());
    #[cfg(not(windows))]
    let is_current = target.is_empty() || current_norm == target_norm;

    if is_current {
        cfg.current_vault_path = final_path.clone();
    }

    for item in &mut cfg.recent_vaults {
        let item_norm = normalize_path(Path::new(&item.path));
        #[cfg(windows)]
        let matches = item_norm.to_string_lossy().eq_ignore_ascii_case(&target_norm.to_string_lossy());
        #[cfg(not(windows))]
        let matches = item_norm == target_norm;

        if matches {
            item.path = final_path.clone();
            item.name = clean_name.clone();
        }
    }
    save_config(&cfg);

    // Reopen database at new location if it was active
    if closed_db_path.is_some() || is_current {
        let _ = crate::db::noether_db_init(db_state, Some(final_path.clone()));
    }
    // Reattach file watcher at new location if it was active
    if unwatched_path.is_some() || is_current {
        watcher_state.watch(&target_new_path);
    }

    let payload = json!({
        "success": true,
        "path": if is_current { final_path.clone() } else { cfg.current_vault_path.clone() },
        "name": if is_current { clean_name.clone() } else { Path::new(&cfg.current_vault_path).file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default() },
        "recentVaults": cfg.recent_vaults,
    });

    let _ = app.emit("vault-changed", payload.clone());

    json!({
        "success": true,
        "path": final_path,
        "name": clean_name,
        "recentVaults": cfg.recent_vaults,
    })
}

#[tauri::command]
pub fn remove_recent_vault(state: tauri::State<AppState>, vault_path: String) -> Value {
    let mut cfg = state.config.lock();
    cfg.recent_vaults.retain(|v| v.path != vault_path);
    save_config(&cfg);

    json!({
        "success": true,
        "recentVaults": cfg.recent_vaults
    })
}

#[tauri::command]
pub fn open_vault_in_explorer(state: tauri::State<AppState>, vault_path: Option<String>) -> Value {
    let target = match vault_path {
        Some(p) if !p.is_empty() => {
            let cfg = state.config.lock();
            if cfg.current_vault_path == p || cfg.recent_vaults.iter().any(|v| v.path == p) {
                p
            } else {
                return json!({ "success": false, "error": "Invalid vault path" });
            }
        }
        _ => {
            let cfg = state.config.lock();
            cfg.current_vault_path.clone()
        }
    };

    let target_path = Path::new(&target);
    if target_path.exists() && target_path.is_dir() {
        #[cfg(target_os = "windows")]
        let _ = std::process::Command::new("explorer").arg(&target).spawn();

        #[cfg(target_os = "macos")]
        let _ = std::process::Command::new("open").arg(&target).spawn();

        #[cfg(target_os = "linux")]
        let _ = std::process::Command::new("xdg-open").arg(&target).spawn();

        json!({ "success": true })
    } else {
        json!({ "success": false, "error": "Folder does not exist or is not a directory" })
    }
}

#[tauri::command]
pub fn scan_vault_files(
    state: tauri::State<AppState>,
    custom_vault_path: Option<String>,
    allowed_extensions: Option<Vec<String>>,
) -> Vec<VaultDiskItem> {
    let target_dir = match custom_vault_path {
        Some(p) if !p.is_empty() => {
            let cfg = state.config.lock();
            let p_buf = PathBuf::from(&p);
            let is_known = cfg.current_vault_path == p
                || cfg.recent_vaults.iter().any(|v| v.path == p)
                || is_safe_vault_path(Path::new(&cfg.current_vault_path), &p_buf);
            if !is_known {
                return Vec::new();
            }
            p_buf
        }
        _ => {
            let cfg = state.config.lock();
            PathBuf::from(&cfg.current_vault_path)
        }
    };

    let _ = fs::create_dir_all(&target_dir);
    let mut items = Vec::new();

    let normalized_exts: Vec<String> = allowed_extensions
        .unwrap_or_else(|| vec!["md".to_string()])
        .into_iter()
        .map(|e| {
            let clean = e.to_lowercase();
            if clean.starts_with('.') {
                clean
            } else {
                format!(".{}", clean)
            }
        })
        .collect();

    for entry in WalkDir::new(&target_dir).into_iter().filter_entry(|e| {
        let name = e.file_name().to_string_lossy();
        !name.starts_with('.') && name != "node_modules"
    }).filter_map(|e| e.ok()) {
        let full_path = entry.path();
        if full_path == target_dir {
            continue;
        }

        if let Ok(rel_path) = full_path.strip_prefix(&target_dir) {
            let rel_str = rel_path.to_string_lossy().replace('\\', "/");
            let is_folder = entry.file_type().is_dir();
            let mtime = entry.metadata().ok().and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);

            if is_folder {
                items.push(VaultDiskItem {
                    relative_path: rel_str,
                    name: entry.file_name().to_string_lossy().to_string(),
                    is_folder: true,
                    mtime,
                    content: None,
                });
            } else {
                let lower_name = entry.file_name().to_string_lossy().to_lowercase();
                let is_match = normalized_exts.iter().any(|ext| lower_name.ends_with(ext));
                if is_match {
                    let stem = full_path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "Untitled".to_string());
                    let content = fs::read_to_string(full_path).ok();
                    items.push(VaultDiskItem {
                        relative_path: rel_str,
                        name: stem,
                        is_folder: false,
                        mtime,
                        content,
                    });
                }
            }
        }
    }

    items
}

#[tauri::command]
pub fn save_markdown_file(
    state: tauri::State<AppState>,
    filename: String,
    content: String,
    relative_path: Option<String>,
) -> Value {
    mark_internal_write();
    let cfg = state.config.lock();
    let target_vault = PathBuf::from(&cfg.current_vault_path);
    let _ = fs::create_dir_all(&target_vault);

    let file_path = match relative_path {
        Some(rel) if !rel.trim().is_empty() => {
            let clean = rel.replace('\\', "/");
            let file_with_ext = if Path::new(&clean).extension().is_some() {
                clean
            } else {
                format!("{}.md", clean)
            };
            target_vault.join(file_with_ext)
        }
        _ => {
            let safe_name = filename.replace(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'], "_");
            if Path::new(&safe_name).extension().is_some() {
                target_vault.join(safe_name)
            } else {
                target_vault.join(format!("{}.md", safe_name))
            }
        }
    };

    if !is_safe_vault_path(&target_vault, &file_path) {
        return json!({ "success": false, "error": "Security: Target path escapes vault directory boundary" });
    }

    if let Some(parent) = file_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    // If file is currently read-only, temporarily unset read-only flag to allow writing
    let was_readonly = if file_path.exists() {
        fs::metadata(&file_path).map(|m| m.permissions().readonly()).unwrap_or(false)
    } else {
        false
    };

    if was_readonly {
        if let Ok(mut perms) = fs::metadata(&file_path).map(|m| m.permissions()) {
            perms.set_readonly(false);
            let _ = fs::set_permissions(&file_path, perms);
        }
    }

    let temp_file = file_path.with_extension(format!("tmp.{}", std::process::id()));
    let write_res = fs::write(&temp_file, content);

    // Restore read-only permission if it was previously set
    if was_readonly {
        if let Ok(mut perms) = fs::metadata(&file_path).map(|m| m.permissions()) {
            perms.set_readonly(true);
            let _ = fs::set_permissions(&file_path, perms);
        }
    }

    match write_res {
        Ok(_) => {
            if let Err(e) = fs::rename(&temp_file, &file_path) {
                let _ = fs::remove_file(&temp_file);
                json!({ "success": false, "error": format!("Failed to persist file: {}", e) })
            } else {
                json!({ "success": true, "path": file_path.to_string_lossy() })
            }
        }
        Err(e) => {
            let _ = fs::remove_file(&temp_file);
            json!({ "success": false, "error": e.to_string() })
        }
    }
}

#[tauri::command]
pub fn set_file_attributes(
    state: tauri::State<AppState>,
    filename_or_path: String,
    readonly: Option<bool>,
    _modified_time: Option<u64>,
) -> Value {
    mark_internal_write();
    let cfg = state.config.lock();
    let target_vault = PathBuf::from(&cfg.current_vault_path);

    let clean = filename_or_path.replace('\\', "/");
    let trimmed = clean.trim_matches(|c| c == '.' || c == '/' || c == '\\');
    let file_with_ext = if clean.to_lowercase().ends_with(".md") { clean.clone() } else { format!("{}.md", clean) };
    let mut file_path = target_vault.join(&file_with_ext);
    if !file_path.exists() {
        let alt = target_vault.join(&clean);
        if alt.exists() {
            file_path = alt;
        }
    }

    let normalized_vault = normalize_path(&target_vault);
    let normalized_file = normalize_path(&file_path);

    if trimmed.is_empty() || normalized_file == normalized_vault {
        return json!({ "success": false, "error": "Cannot modify vault root directory attributes" });
    }

    if !is_safe_vault_path(&target_vault, &file_path) {
        return json!({ "success": false, "error": "Security: Target path escapes vault directory boundary" });
    }

    if !file_path.exists() {
        return json!({ "success": false, "error": "File does not exist" });
    }

    if let Some(ro) = readonly {
        if let Ok(mut perms) = fs::metadata(&file_path).map(|m| m.permissions()) {
            perms.set_readonly(ro);
            let _ = fs::set_permissions(&file_path, perms);
        }
    }

    json!({ "success": true, "path": file_path.to_string_lossy() })
}

#[tauri::command]
pub fn delete_markdown_file(state: tauri::State<AppState>, filename_or_path: String) -> Value {
    mark_internal_write();
    let cfg = state.config.lock();
    let target_vault = PathBuf::from(&cfg.current_vault_path);

    let clean = filename_or_path.replace('\\', "/");
    let trimmed = clean.trim_matches(|c| c == '.' || c == '/' || c == '\\');
    let direct_path = target_vault.join(&clean);
    let normalized_vault = normalize_path(&target_vault);
    let normalized_direct = normalize_path(&direct_path);

    if trimmed.is_empty() || normalized_direct == normalized_vault {
        return json!({ "success": false, "error": "Cannot delete vault root directory" });
    }

    let file_with_ext = if Path::new(&clean).extension().is_some() {
        clean.clone()
    } else {
        format!("{}.md", clean)
    };
    let file_path = target_vault.join(&file_with_ext);
    let normalized_file = normalize_path(&file_path);

    if normalized_file == normalized_vault {
        return json!({ "success": false, "error": "Cannot delete vault root directory" });
    }

    if !is_safe_vault_path(&target_vault, &file_path) {
        return json!({ "success": false, "error": "Security: Target path escapes vault directory boundary" });
    }

    if file_path.exists() {
        if file_path.is_dir() {
            let _ = fs::remove_dir_all(&file_path);
        } else {
            let _ = fs::remove_file(&file_path);
        }
    } else {
        if !is_safe_vault_path(&target_vault, &direct_path) {
            return json!({ "success": false, "error": "Security: Target path escapes vault directory boundary" });
        }
        if direct_path.exists() {
            if direct_path.is_dir() {
                let _ = fs::remove_dir_all(&direct_path);
            } else {
                let _ = fs::remove_file(&direct_path);
            }
        }
    }
    json!({ "success": true })
}

#[tauri::command]
pub fn rename_markdown_file(
    state: tauri::State<AppState>,
    old_filename: Option<String>,
    new_filename: Option<String>,
    old_relative_path: Option<String>,
    new_relative_path: Option<String>,
) -> Value {
    mark_internal_write();
    let cfg = state.config.lock();
    let target_vault = PathBuf::from(&cfg.current_vault_path);

    let (old_path, new_path) = match (old_relative_path, new_relative_path) {
        (Some(old_rel), Some(new_rel)) => {
            let old_clean = old_rel.replace('\\', "/");
            let new_clean = new_rel.replace('\\', "/");

            let old_dir = target_vault.join(&old_clean);
            let old_file = target_vault.join(if Path::new(&old_clean).extension().is_some() {
                old_clean.clone()
            } else {
                format!("{}.md", old_clean)
            });

            if old_dir.exists() && old_dir.is_dir() {
                (old_dir, target_vault.join(&new_clean))
            } else {
                let new_file = target_vault.join(if Path::new(&new_clean).extension().is_some() {
                    new_clean
                } else {
                    format!("{}.md", new_clean)
                });
                (old_file, new_file)
            }
        }
        _ => {
            let old_f = old_filename.unwrap_or_else(|| "Untitled".to_string());
            let new_f = new_filename.unwrap_or_else(|| "Untitled".to_string());
            let old_safe = old_f.replace(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'], "_");
            let new_safe = new_f.replace(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'], "_");

            let old_dir = target_vault.join(&old_safe);
            let old_file = target_vault.join(if Path::new(&old_safe).extension().is_some() { old_safe.clone() } else { format!("{}.md", old_safe) });

            if old_dir.exists() && old_dir.is_dir() {
                (old_dir, target_vault.join(&new_safe))
            } else {
                let new_file = target_vault.join(if Path::new(&new_safe).extension().is_some() { new_safe } else { format!("{}.md", new_safe) });
                (old_file, new_file)
            }
        }
    };

    if !is_safe_vault_path(&target_vault, &old_path) || !is_safe_vault_path(&target_vault, &new_path) {
        return json!({ "success": false, "error": "Security: Rename path escapes vault directory boundary" });
    }

    if let Some(parent) = new_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    if old_path.exists() {
        let _ = fs::rename(&old_path, &new_path);
    } else if let Some(file_name) = old_path.file_name() {
        let old_root = target_vault.join(file_name);
        if old_root.exists() && is_safe_vault_path(&target_vault, &old_root) {
            let _ = fs::rename(&old_root, &new_path);
        }
    }

    json!({ "success": true })
}

#[tauri::command]
pub fn open_plugins_folder(state: tauri::State<AppState>) -> Value {
    let cfg = state.config.lock();
    let plugins_dir = Path::new(&cfg.current_vault_path).join(".noether").join("extensions");
    let _ = fs::create_dir_all(&plugins_dir);

    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer").arg(&plugins_dir).spawn();

    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&plugins_dir).spawn();

    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&plugins_dir).spawn();

    json!({ "success": true, "path": plugins_dir.to_string_lossy() })
}

#[tauri::command]
pub fn open_trash_folder(state: tauri::State<AppState>) -> Value {
    let cfg = state.config.lock();
    let trash_dir = Path::new(&cfg.current_vault_path).join(".trash");
    let _ = fs::create_dir_all(&trash_dir);

    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer").arg(&trash_dir).spawn();

    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&trash_dir).spawn();

    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&trash_dir).spawn();

    json!({ "success": true, "path": trash_dir.to_string_lossy() })
}

#[tauri::command]
pub fn save_trash_file(
    state: tauri::State<AppState>,
    filename: String,
    content: String,
    relative_path: Option<String>,
) -> Value {
    mark_internal_write();
    let cfg = state.config.lock();
    let trash_dir = PathBuf::from(&cfg.current_vault_path).join(".trash");
    let _ = fs::create_dir_all(&trash_dir);

    let file_path = match relative_path {
        Some(rel) if !rel.trim().is_empty() => {
            let clean = rel.replace('\\', "/");
            let file_with_ext = if Path::new(&clean).extension().is_some() {
                clean
            } else {
                format!("{}.md", clean)
            };
            trash_dir.join(file_with_ext)
        }
        _ => {
            let safe_name = filename.replace(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'], "_");
            if Path::new(&safe_name).extension().is_some() {
                trash_dir.join(safe_name)
            } else {
                trash_dir.join(format!("{}.md", safe_name))
            }
        }
    };

    if !is_safe_vault_path(&trash_dir, &file_path) {
        return json!({ "success": false, "error": "Security: Trash path escapes vault directory boundary" });
    }

    if let Some(parent) = file_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    match fs::write(&file_path, content) {
        Ok(_) => json!({ "success": true, "path": file_path.to_string_lossy() }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

#[tauri::command]
pub fn delete_trash_file(state: tauri::State<AppState>, filename_or_path: String) -> Value {
    mark_internal_write();
    let cfg = state.config.lock();
    let trash_dir = PathBuf::from(&cfg.current_vault_path).join(".trash");

    let clean = filename_or_path.replace('\\', "/");
    let trimmed = clean.trim_matches(|c| c == '.' || c == '/' || c == '\\');
    let direct_path = trash_dir.join(&clean);
    let normalized_trash = normalize_path(&trash_dir);
    let normalized_direct = normalize_path(&direct_path);

    if trimmed.is_empty() || normalized_direct == normalized_trash {
        return json!({ "success": false, "error": "Cannot delete trash root directory" });
    }

    let file_with_ext = if Path::new(&clean).extension().is_some() {
        clean.clone()
    } else {
        format!("{}.md", clean)
    };
    let file_path = trash_dir.join(&file_with_ext);
    let normalized_file = normalize_path(&file_path);

    if normalized_file == normalized_trash {
        return json!({ "success": false, "error": "Cannot delete trash root directory" });
    }

    if !is_safe_vault_path(&trash_dir, &file_path) {
        return json!({ "success": false, "error": "Security: Trash path escapes vault directory boundary" });
    }

    if file_path.exists() {
        if file_path.is_dir() {
            let _ = fs::remove_dir_all(&file_path);
        } else {
            let _ = fs::remove_file(&file_path);
        }
    } else {
        if !is_safe_vault_path(&trash_dir, &direct_path) {
            return json!({ "success": false, "error": "Security: Trash path escapes vault directory boundary" });
        }
        if direct_path.exists() {
            if direct_path.is_dir() {
                let _ = fs::remove_dir_all(&direct_path);
            } else {
                let _ = fs::remove_file(&direct_path);
            }
        }
    }
    json!({ "success": true })
}

#[tauri::command]
pub fn empty_trash_folder(state: tauri::State<AppState>) -> Value {
    mark_internal_write();
    let cfg = state.config.lock();
    let trash_dir = PathBuf::from(&cfg.current_vault_path).join(".trash");

    if trash_dir.exists() {
        let _ = fs::remove_dir_all(&trash_dir);
        let _ = fs::create_dir_all(&trash_dir);
    }
    json!({ "success": true })
}

#[tauri::command]
pub fn list_installed_plugins(state: tauri::State<AppState>) -> Vec<PluginManifest> {
    let cfg = state.config.lock();
    let target_vault = Path::new(&cfg.current_vault_path);
    let plugins_dir = target_vault.join(".noether").join("plugins");
    let extensions_dir = target_vault.join(".noether").join("extensions");
    let _ = fs::create_dir_all(&extensions_dir);

    let mut plugins = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();
    let mut seen_folders = std::collections::HashSet::new();

    let scan_dirs = [plugins_dir, extensions_dir];

    for dir in &scan_dirs {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                if let Ok(ft) = entry.file_type() {
                    if ft.is_dir() {
                        let folder_name = entry.file_name().to_string_lossy().to_string();
                        let manifest_file = entry.path().join("manifest.json");
                        if manifest_file.exists() {
                            if let Ok(content) = fs::read_to_string(manifest_file) {
                                if let Ok(manifest_val) = serde_json::from_str::<Value>(&content) {
                                    let id = manifest_val
                                        .get("id")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or(&folder_name)
                                        .to_string();

                                    if seen_ids.insert(id.clone()) && seen_folders.insert(folder_name.clone()) {
                                        plugins.push(PluginManifest {
                                            id,
                                            name: manifest_val
                                                .get("name")
                                                .and_then(|v| v.as_str())
                                                .unwrap_or(&folder_name)
                                                .to_string(),
                                            version: manifest_val
                                                .get("version")
                                                .and_then(|v| v.as_str())
                                                .unwrap_or("1.0.0")
                                                .to_string(),
                                            description: manifest_val
                                                .get("description")
                                                .and_then(|v| v.as_str())
                                                .unwrap_or("")
                                                .to_string(),
                                            author: manifest_val
                                                .get("author")
                                                .and_then(|v| v.as_str())
                                                .unwrap_or("")
                                                .to_string(),
                                            folder: folder_name,
                                            is_core: false,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    plugins
}

#[tauri::command]
pub fn read_plugin_bundle(state: tauri::State<AppState>, plugin_folder: String) -> PluginBundle {
    let cfg = state.config.lock();
    let target_vault = PathBuf::from(&cfg.current_vault_path);

    let safe_folder = plugin_folder.replace(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>', '.'], "_");
    if safe_folder.trim().is_empty() {
        return PluginBundle {
            success: false,
            js_code: None,
            css_code: None,
            error: Some("Plugin folder name cannot be empty".to_string()),
        };
    }

    let plugins_dir = target_vault.join(".noether").join("plugins").join(&safe_folder);
    let extensions_dir = target_vault.join(".noether").join("extensions").join(&safe_folder);

    if !is_safe_vault_path(&target_vault, &plugins_dir) || !is_safe_vault_path(&target_vault, &extensions_dir) {
        return PluginBundle {
            success: false,
            js_code: None,
            css_code: None,
            error: Some("Security: Plugin path escapes vault boundary".to_string()),
        };
    }

    // Check .noether/plugins/ first, then fall back to .noether/extensions/
    let resolved_dir = if plugins_dir.join("main.js").exists() {
        plugins_dir
    } else if extensions_dir.join("main.js").exists() {
        extensions_dir
    } else if plugins_dir.exists() {
        plugins_dir
    } else {
        extensions_dir
    };

    let main_js = resolved_dir.join("main.js");
    let styles_css = resolved_dir.join("styles.css");

    let js_code = fs::read_to_string(&main_js).ok();
    let css_code = fs::read_to_string(&styles_css).ok();

    PluginBundle {
        success: js_code.is_some(),
        js_code,
        css_code,
        error: None,
    }
}

#[tauri::command]
pub fn install_plugin_bundle(
    state: tauri::State<AppState>,
    plugin_folder: String,
    manifest_json: String,
    main_js: String,
    styles_css: Option<String>,
) -> Value {
    mark_internal_write();
    let cfg = state.config.lock();
    let target_vault = PathBuf::from(&cfg.current_vault_path);
    let extensions_dir = target_vault.join(".noether").join("extensions");
    let safe_folder = plugin_folder.replace(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>', '.'], "_");
    let target_dir = extensions_dir.join(&safe_folder);

    if !is_safe_vault_path(&target_vault, &target_dir) {
        return json!({ "success": false, "error": "Security: Extension path escapes vault boundary" });
    }

    if let Err(e) = fs::create_dir_all(&target_dir) {
        return json!({ "success": false, "error": format!("Failed to create extension directory: {}", e) });
    }

    if let Err(e) = fs::write(target_dir.join("manifest.json"), &manifest_json) {
        return json!({ "success": false, "error": format!("Failed to write manifest.json: {}", e) });
    }

    if let Err(e) = fs::write(target_dir.join("main.js"), &main_js) {
        return json!({ "success": false, "error": format!("Failed to write main.js: {}", e) });
    }

    if let Some(css) = &styles_css {
        if !css.trim().is_empty() {
            let _ = fs::write(target_dir.join("styles.css"), css);
        }
    }

    // Clean up legacy .noether/plugins location if it exists
    let legacy_plugins_dir = target_vault.join(".noether").join("plugins");
    let legacy_target = legacy_plugins_dir.join(&safe_folder);
    if legacy_target.exists() && legacy_target != legacy_plugins_dir && is_safe_vault_path(&target_vault, &legacy_target) {
        let _ = fs::remove_dir_all(&legacy_target);
    }

    json!({ "success": true, "path": target_dir.to_string_lossy() })
}

#[tauri::command]
pub fn uninstall_plugin_bundle(state: tauri::State<AppState>, plugin_folder: String) -> Value {
    if plugin_folder.trim().is_empty() {
        return json!({ "success": false, "error": "Plugin folder cannot be empty" });
    }

    mark_internal_write();
    let cfg = state.config.lock();
    let target_vault = PathBuf::from(&cfg.current_vault_path);
    let safe_folder = plugin_folder.replace(['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>', '.'], "_");

    if safe_folder.trim().is_empty() {
        return json!({ "success": false, "error": "Invalid plugin folder name" });
    }

    // Remove from .noether/plugins directory if present
    let plugins_dir = target_vault.join(".noether").join("plugins");
    let target_dir = plugins_dir.join(&safe_folder);
    if target_dir != plugins_dir && is_safe_vault_path(&target_vault, &target_dir) && target_dir.exists() {
        let _ = fs::remove_dir_all(&target_dir);
    }

    // Also remove from .noether/extensions directory if present
    let extensions_dir = target_vault.join(".noether").join("extensions");
    let target_ext_dir = extensions_dir.join(&safe_folder);
    if target_ext_dir != extensions_dir && is_safe_vault_path(&target_vault, &target_ext_dir) && target_ext_dir.exists() {
        let _ = fs::remove_dir_all(&target_ext_dir);
    }

    json!({ "success": true })
}

#[tauri::command]
pub fn open_vault_window() -> Value {
    json!({ "success": true })
}

#[tauri::command]
pub fn close_vault_window() -> Value {
    json!({ "success": true })
}

#[tauri::command]
pub fn open_settings_window() -> Value {
    json!({ "success": true })
}

#[tauri::command]
pub fn close_settings_window() -> Value {
    json!({ "success": true })
}

#[tauri::command]
pub fn window_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn window_maximize(window: tauri::Window) {
    if let Ok(is_max) = window.is_maximized() {
        if is_max {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
pub fn window_close(window: tauri::Window) {
    if window.label() == "settings" || window.label() == "vault-switcher" || window.label() == "spark" {
        let _ = window.hide();
    } else {
        let _ = window.destroy();
    }
}

#[tauri::command]
pub fn window_is_maximized(window: tauri::Window) -> bool {
    window.is_maximized().unwrap_or(false)
}

#[tauri::command]
pub fn window_is_minimized(window: tauri::Window) -> bool {
    window.is_minimized().unwrap_or(false)
}

#[tauri::command]
pub fn window_start_dragging(window: tauri::Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
pub fn window_set_title(window: tauri::Window, title: String) {
    let _ = window.set_title(&title);
}

#[tauri::command]
pub fn focus_main_window(app: AppHandle) -> Value {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_minimized().unwrap_or(false) {
            let _ = window.unminimize();
        }
        let _ = window.show();
        let _ = window.set_focus();
    }
    json!({ "success": true })
}

#[cfg(target_os = "windows")]
mod win_hotkey {
    use std::collections::HashMap;
    use std::sync::mpsc::{channel, Sender};
    use std::sync::Mutex;
    use tauri::{AppHandle, Emitter, Manager};

    pub enum HotkeyAction {
        Register(String, String),
        Unregister(String),
    }

    pub static HOTKEY_SENDER: Mutex<Option<Sender<HotkeyAction>>> = Mutex::new(None);

    const MOD_ALT: u32 = 0x0001;
    const MOD_CONTROL: u32 = 0x0002;
    const MOD_SHIFT: u32 = 0x0004;
    const MOD_WIN: u32 = 0x0008;
    const MOD_NOREPEAT: u32 = 0x4000;
    const WM_HOTKEY: u32 = 0x0312;

    #[repr(C)]
    struct MSG {
        hwnd: isize,
        message: u32,
        wparam: usize,
        lparam: isize,
        time: u32,
        pt_x: i32,
        pt_y: i32,
    }

    extern "system" {
        fn RegisterHotKey(hWnd: isize, id: i32, fsModifiers: u32, vk: u32) -> i32;
        fn UnregisterHotKey(hWnd: isize, id: i32) -> i32;
        fn PeekMessageW(lpMsg: *mut MSG, hWnd: isize, wMsgFilterMin: u32, wMsgFilterMax: u32, wRemoveMsg: u32) -> i32;
    }

    fn parse_shortcut(shortcut: &str) -> (u32, u32) {
        let mut modifiers = MOD_NOREPEAT;
        let mut vk = 0u32;

        for part in shortcut.split('+').map(|s| s.trim()) {
            match part.to_lowercase().as_str() {
                "ctrl" | "control" | "commandorcontrol" | "cmdorctrl" => modifiers |= MOD_CONTROL,
                "alt" | "option" => modifiers |= MOD_ALT,
                "shift" => modifiers |= MOD_SHIFT,
                "super" | "win" | "cmd" | "command" => modifiers |= MOD_WIN,
                "space" => vk = 0x20,
                "enter" | "return" => vk = 0x0D,
                "tab" => vk = 0x09,
                "esc" | "escape" => vk = 0x1B,
                s if s.len() == 1 => {
                    let ch = s.chars().next().unwrap().to_ascii_uppercase();
                    vk = ch as u32;
                }
                s if s.starts_with('f') && s.len() <= 3 => {
                    if let Ok(num) = s[1..].parse::<u32>() {
                        if num >= 1 && num <= 24 {
                            vk = 0x70 + (num - 1);
                        }
                    }
                }
                _ => {}
            }
        }

        (modifiers, vk)
    }

    pub fn start_hotkey_loop(app: AppHandle) {
        let (tx, rx) = channel::<HotkeyAction>();
        if let Ok(mut lock) = HOTKEY_SENDER.lock() {
            *lock = Some(tx);
        }

        std::thread::spawn(move || {
            let mut id_to_int: HashMap<String, i32> = HashMap::new();
            let mut int_to_id: HashMap<i32, String> = HashMap::new();
            let mut next_int_id = 9000;

            loop {
                // Check for incoming register/unregister actions
                while let Ok(action) = rx.try_recv() {
                    match action {
                        HotkeyAction::Register(id, shortcut) => {
                            if let Some(&existing_int) = id_to_int.get(&id) {
                                unsafe { UnregisterHotKey(0, existing_int); }
                            }
                            let int_id = next_int_id;
                            next_int_id += 1;

                            let (mods, vk) = parse_shortcut(&shortcut);
                            if vk != 0 {
                                let res = unsafe { RegisterHotKey(0, int_id, mods, vk) };
                                if res != 0 {
                                    id_to_int.insert(id.clone(), int_id);
                                    int_to_id.insert(int_id, id);
                                }
                            }
                        }
                        HotkeyAction::Unregister(id) => {
                            if let Some(int_id) = id_to_int.remove(&id) {
                                int_to_id.remove(&int_id);
                                unsafe { UnregisterHotKey(0, int_id); }
                            }
                        }
                    }
                }

                // Process Windows hotkey messages
                let mut msg: MSG = unsafe { std::mem::zeroed() };
                let has_msg = unsafe { PeekMessageW(&mut msg, 0, 0, 0, 1) }; // PM_REMOVE = 1
                if has_msg != 0 {
                    if msg.message == WM_HOTKEY {
                        let int_id = msg.wparam as i32;
                        if let Some(id) = int_to_id.get(&int_id) {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_minimized().unwrap_or(false) {
                                    let _ = window.unminimize();
                                }
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            let _ = app.emit("global-shortcut-activated", id.clone());
                        }
                    }
                } else {
                    std::thread::sleep(std::time::Duration::from_millis(20));
                }
            }
        });
    }
}

pub fn init_global_hotkeys(app: AppHandle) {
    #[cfg(target_os = "windows")]
    {
        win_hotkey::start_hotkey_loop(app);
    }
}

#[tauri::command]
pub fn register_global_shortcut(id: String, shortcut: String) -> Value {
    #[cfg(target_os = "windows")]
    {
        if let Ok(lock) = win_hotkey::HOTKEY_SENDER.lock() {
            if let Some(tx) = lock.as_ref() {
                let _ = tx.send(win_hotkey::HotkeyAction::Register(id, shortcut));
            }
        }
    }
    json!({ "success": true })
}

#[tauri::command]
pub fn unregister_global_shortcut(id: String) -> Value {
    #[cfg(target_os = "windows")]
    {
        if let Ok(lock) = win_hotkey::HOTKEY_SENDER.lock() {
            if let Some(tx) = lock.as_ref() {
                let _ = tx.send(win_hotkey::HotkeyAction::Unregister(id));
            }
        }
    }
    json!({ "success": true })
}

#[tauri::command]
pub async fn download_remote_text(url: String) -> Value {
    let client = match reqwest::Client::builder()
        .user_agent("Noether-Desktop/0.4.6")
        .timeout(std::time::Duration::from_secs(12))
        .build()
    {
        Ok(c) => c,
        Err(e) => return json!({ "success": false, "error": format!("HTTP client error: {}", e) }),
    };

    match client.get(&url).send().await {
        Ok(resp) => {
            if !resp.status().is_success() {
                return json!({
                    "success": false,
                    "status": resp.status().as_u16(),
                    "error": format!("HTTP request failed with status {}", resp.status())
                });
            }
            match resp.text().await {
                Ok(text) => json!({ "success": true, "content": text }),
                Err(e) => json!({ "success": false, "error": format!("Failed to read response body: {}", e) }),
            }
        }
        Err(e) => json!({ "success": false, "error": format!("Network request failed: {}", e) }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_safe_vault_path_empty_vault() {
        let vault = Path::new("");
        let candidate = Path::new("some/file.md");
        assert!(!is_safe_vault_path(vault, candidate));

        let empty_cand = Path::new("");
        let valid_vault = Path::new("C:\\Vault");
        assert!(!is_safe_vault_path(valid_vault, empty_cand));
    }

    #[test]
    fn test_strip_unc_prefix() {
        assert_eq!(strip_unc_prefix(r"\\?\UNC\server\share\folder"), r"\\server\share\folder");
        assert_eq!(strip_unc_prefix(r"\\?\C:\Users\Noether"), r"C:\Users\Noether");
        assert_eq!(strip_unc_prefix(r"C:\Users\Noether"), r"C:\Users\Noether");
        assert_eq!(strip_unc_prefix(r"\\server\share\folder"), r"\\server\share\folder");
    }

    #[test]
    fn test_is_safe_vault_path_unc_and_case() {
        let vault = Path::new(r"C:\Vault");
        let valid_candidate = Path::new(r"c:\vault\notes\today.md");
        assert!(is_safe_vault_path(vault, valid_candidate));

        let escape_candidate = Path::new(r"C:\Vault\..\Windows\System32\cmd.exe");
        assert!(!is_safe_vault_path(vault, escape_candidate));

        let unc_vault = Path::new(r"\\?\UNC\server\share\vault");
        let unc_cand = Path::new(r"\\server\share\vault\notes\doc.md");
        assert!(is_safe_vault_path(unc_vault, unc_cand));
    }

    #[test]
    fn test_is_safe_vault_path_nonexistent_file() {
        let temp_dir = std::env::temp_dir().join("noether_vault_test");
        let _ = fs::create_dir_all(&temp_dir);
        let non_existent = temp_dir.join("subfolder").join("non_existent_note.md");
        assert!(is_safe_vault_path(&temp_dir, &non_existent));

        let escaping_non_existent = temp_dir.join("..").join("escaping_file.md");
        assert!(!is_safe_vault_path(&temp_dir, &escaping_non_existent));
        let _ = fs::remove_dir_all(&temp_dir);
    }
}

