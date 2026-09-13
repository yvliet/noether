use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use serde_json::{json, Value};
use crate::vault::{is_safe_vault_path, mark_internal_write, AppState};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Creates a `Command` targeting the `git` binary in the specified working directory,
/// ensuring that no command prompt / terminal window flashes on Windows.
fn create_git_command(dir: &Path) -> Command {
    let mut cmd = Command::new("git");
    cmd.current_dir(dir);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

/// Helper to extract the active vault path from AppState
fn get_active_vault_path(state: &tauri::State<AppState>) -> PathBuf {
    let cfg = state.config.lock();
    PathBuf::from(&cfg.current_vault_path)
}

/// Checks if `git` is installed on the host system and whether the current vault is initialized as a git repository.
#[tauri::command]
pub fn vcs_check_status(state: tauri::State<AppState>) -> Value {
    let vault_path = get_active_vault_path(&state);

    // 1. Check if git is installed
    let mut cmd = Command::new("git");
    cmd.arg("--version");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let version_output = match cmd.output() {
        Ok(out) if out.status.success() => {
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        }
        _ => {
            return json!({
                "installed": false,
                "initialized": false,
                "error": "Git binary was not detected on this system"
            });
        }
    };

    // 2. Check if .git directory exists in the active vault
    let git_dir = vault_path.join(".git");
    let initialized = git_dir.exists() && git_dir.is_dir();

    json!({
        "installed": true,
        "initialized": initialized,
        "version": version_output,
        "vaultPath": vault_path.to_string_lossy()
    })
}

/// Initializes a git repository inside the current vault and provisions a safe default .gitignore.
#[tauri::command]
pub fn vcs_init_vault(state: tauri::State<AppState>) -> Value {
    let vault_path = get_active_vault_path(&state);
    if !vault_path.exists() {
        return json!({ "success": false, "error": "Vault directory does not exist" });
    }

    // 1. Run git init
    let mut init_cmd = create_git_command(&vault_path);
    init_cmd.arg("init");

    match init_cmd.output() {
        Ok(out) if out.status.success() => {
            // Configure local fallback author identity if not set
            let mut name_cmd = create_git_command(&vault_path);
            name_cmd.args(["config", "--local", "user.name", "Noether User"]);
            let _ = name_cmd.output();

            let mut email_cmd = create_git_command(&vault_path);
            email_cmd.args(["config", "--local", "user.email", "vault@noether.local"]);
            let _ = email_cmd.output();

            // Provision a standard .gitignore if none exists
            let gitignore_path = vault_path.join(".gitignore");
            if !gitignore_path.exists() {
                let default_ignore = "# Noether Version History - Vault Ignore\n.trash/\n.DS_Store\nThumbs.db\n*.tmp\n.noether/tmp/\n";
                let _ = fs::write(&gitignore_path, default_ignore);
            }

            json!({ "success": true })
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            json!({ "success": false, "error": stderr })
        }
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

/// Takes a snapshot of an individual file or all modified files across the vault.
#[tauri::command]
pub fn vcs_create_snapshot(
    state: tauri::State<AppState>,
    relative_path: Option<String>,
    message: Option<String>,
) -> Value {
    let vault_path = get_active_vault_path(&state);
    let git_dir = vault_path.join(".git");
    if !git_dir.exists() {
        return json!({ "success": false, "error": "Vault is not a Git repository" });
    }

    // 1. Stage changes
    let mut add_cmd = create_git_command(&vault_path);
    if let Some(ref rel) = relative_path {
        let clean_rel = rel.trim_start_matches('/').trim_start_matches('\\');
        let full_path = vault_path.join(clean_rel);
        if !is_safe_vault_path(&vault_path, &full_path) {
            return json!({ "success": false, "error": "Path is outside the active vault" });
        }
        add_cmd.args(["add", "--", clean_rel]);
    } else {
        add_cmd.args(["add", "-A"]);
    }

    if let Err(e) = add_cmd.output() {
        return json!({ "success": false, "error": format!("Failed to stage changes: {}", e) });
    }

    // 2. Commit changes
    let commit_msg = message.unwrap_or_else(|| {
        let now = chrono_like_timestamp();
        if let Some(ref rel) = relative_path {
            format!("Snapshot: {} ({})", rel, now)
        } else {
            format!("Vault Snapshot ({})", now)
        }
    });

    let mut commit_cmd = create_git_command(&vault_path);
    commit_cmd.args([
        "-c", "user.name=Noether User",
        "-c", "user.email=vault@noether.local",
        "commit",
        "-m", &commit_msg,
    ]);

    match commit_cmd.output() {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);

            if out.status.success() {
                // Get commit hash
                let mut hash_cmd = create_git_command(&vault_path);
                hash_cmd.args(["rev-parse", "--short", "HEAD"]);
                let hash = hash_cmd.output().ok().map(|h| String::from_utf8_lossy(&h.stdout).trim().to_string());

                json!({
                    "success": true,
                    "committed": true,
                    "hash": hash,
                    "message": commit_msg
                })
            } else if stdout.contains("nothing to commit") || stderr.contains("nothing to commit") || stdout.contains("working tree clean") {
                json!({
                    "success": true,
                    "committed": false,
                    "message": "No changes detected to snapshot"
                })
            } else {
                json!({
                    "success": false,
                    "error": if !stderr.is_empty() { stderr.to_string() } else { stdout.to_string() }
                })
            }
        }
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

/// Retrieves the commit history affecting a specific note.
#[tauri::command]
pub fn vcs_get_file_history(
    state: tauri::State<AppState>,
    relative_path: String,
    limit: Option<usize>,
) -> Value {
    let vault_path = get_active_vault_path(&state);
    let clean_rel = relative_path.trim_start_matches('/').trim_start_matches('\\');
    let full_path = vault_path.join(clean_rel);

    if !is_safe_vault_path(&vault_path, &full_path) {
        return json!({ "success": false, "error": "Path is outside the active vault" });
    }

    let max_commits = limit.unwrap_or(50);
    let mut cmd = create_git_command(&vault_path);
    cmd.args([
        "log",
        "--follow",
        "--format=%H%x1f%an%x1f%at%x1f%s",
        &format!("-n{}", max_commits),
        "--",
        clean_rel,
    ]);

    match cmd.output() {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let mut revisions = Vec::new();

            for line in stdout.lines() {
                let parts: Vec<&str> = line.split('\x1f').collect();
                if parts.len() >= 4 {
                    let hash = parts[0].to_string();
                    let author = parts[1].to_string();
                    let ts_sec: i64 = parts[2].parse().unwrap_or(0);
                    let message = parts[3].to_string();

                    revisions.push(json!({
                        "hash": hash,
                        "shortHash": if hash.len() >= 7 { &hash[..7] } else { &hash },
                        "author": author,
                        "timestamp": ts_sec * 1000,
                        "message": message
                    }));
                }
            }

            json!({ "success": true, "revisions": revisions })
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            json!({ "success": false, "error": stderr.to_string() })
        }
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

/// Retrieves unified diff text between commits or against the working copy.
#[tauri::command]
pub fn vcs_get_file_diff(
    state: tauri::State<AppState>,
    relative_path: String,
    commit_a: String,
    commit_b: Option<String>,
) -> Value {
    let vault_path = get_active_vault_path(&state);
    let clean_rel = relative_path.trim_start_matches('/').trim_start_matches('\\');
    let full_path = vault_path.join(clean_rel);

    if !is_safe_vault_path(&vault_path, &full_path) {
        return json!({ "success": false, "error": "Path is outside the active vault" });
    }

    let mut cmd = create_git_command(&vault_path);
    if let Some(ref b) = commit_b {
        cmd.args(["diff", &commit_a, b, "--", clean_rel]);
    } else {
        // Diff between specified commit and current working tree
        cmd.args(["diff", &commit_a, "--", clean_rel]);
    }

    match cmd.output() {
        Ok(out) => {
            let diff_text = String::from_utf8_lossy(&out.stdout).to_string();
            json!({ "success": true, "diff": diff_text })
        }
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

/// Retrieves the raw content of a note at a historical commit.
#[tauri::command]
pub fn vcs_get_historical_content(
    state: tauri::State<AppState>,
    relative_path: String,
    commit: String,
) -> Value {
    let vault_path = get_active_vault_path(&state);
    let clean_rel = relative_path.trim_start_matches('/').trim_start_matches('\\').replace('\\', "/");
    let full_path = vault_path.join(&clean_rel);

    if !is_safe_vault_path(&vault_path, &full_path) {
        return json!({ "success": false, "error": "Path is outside the active vault" });
    }

    let mut cmd = create_git_command(&vault_path);
    let target = format!("{}:{}", commit, clean_rel);
    cmd.args(["show", &target]);

    match cmd.output() {
        Ok(out) if out.status.success() => {
            let content = String::from_utf8_lossy(&out.stdout).to_string();
            json!({ "success": true, "content": content })
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            json!({ "success": false, "error": stderr.to_string() })
        }
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

/// Restores a note to a historical version by writing the historical content to disk.
#[tauri::command]
pub fn vcs_restore_file(
    state: tauri::State<AppState>,
    relative_path: String,
    commit: String,
) -> Value {
    let vault_path = get_active_vault_path(&state);
    let clean_rel = relative_path.trim_start_matches('/').trim_start_matches('\\').replace('\\', "/");
    let full_path = vault_path.join(&clean_rel);

    if !is_safe_vault_path(&vault_path, &full_path) {
        return json!({ "success": false, "error": "Path is outside the active vault" });
    }

    let mut cmd = create_git_command(&vault_path);
    let target = format!("{}:{}", commit, clean_rel);
    cmd.args(["show", &target]);

    match cmd.output() {
        Ok(out) if out.status.success() => {
            let content = String::from_utf8_lossy(&out.stdout).to_string();
            mark_internal_write();
            if let Err(e) = fs::write(&full_path, &content) {
                return json!({ "success": false, "error": format!("Failed to write file: {}", e) });
            }

            // Create a rollback commit
            let rollback_msg = format!("Restored {} from version {}", clean_rel, if commit.len() >= 7 { &commit[..7] } else { &commit });
            let mut commit_cmd = create_git_command(&vault_path);
            commit_cmd.args([
                "add", "--", &clean_rel,
            ]);
            let _ = commit_cmd.output();

            let mut snap_cmd = create_git_command(&vault_path);
            snap_cmd.args([
                "-c", "user.name=Noether User",
                "-c", "user.email=vault@noether.local",
                "commit", "-m", &rollback_msg,
            ]);
            let _ = snap_cmd.output();

            json!({ "success": true, "content": content })
        }
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            json!({ "success": false, "error": stderr.to_string() })
        }
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    format!("{}", now)
}
