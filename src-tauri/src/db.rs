//! Flint Native SQLite Database Engine
//!
//! Architectural Rationale:
//! 1. Zero WASM Footprint: Replaces browser-sandboxed `sql.js` with native, compiled C/Rust SQLite,
//!    completely eliminating multi-megabyte WASM heap buffers and `db.export()` serialization lag.
//! 2. Native WAL Mode & Instant Persistence: Configures Write-Ahead Logging (`PRAGMA journal_mode = WAL`)
//!    and `PRAGMA synchronous = NORMAL` for page-level atomic commits to disk, eliminating whole-file dumps.
//! 3. Native FTS5 Search: Direct integration with SQLite FTS5 for sub-millisecond full-text retrieval.
//! 4. Thread-Safe Concurrency: Managed via `parking_lot::Mutex<Option<Connection>>` in `AppState`.

use std::path::PathBuf;
use parking_lot::Mutex;
use rusqlite::{types::ValueRef, Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

pub const SQL_SCHEMA_STATEMENTS: &[&str] = &[
    r#"CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        title TEXT NOT NULL DEFAULT 'Untitled',
        content_json TEXT NOT NULL DEFAULT '{}',
        is_daily_note INTEGER NOT NULL DEFAULT 0,
        is_folder INTEGER NOT NULL DEFAULT 0,
        is_bookmarked INTEGER NOT NULL DEFAULT 0,
        doc_type TEXT NOT NULL DEFAULT 'base',
        properties TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );"#,
    r#"CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        parent_block_id TEXT,
        content_text TEXT NOT NULL,
        block_type TEXT NOT NULL DEFAULT 'paragraph',
        order_index REAL NOT NULL,
        is_task INTEGER NOT NULL DEFAULT 0,
        task_completed INTEGER NOT NULL DEFAULT 0
    );"#,
    r#"CREATE TABLE IF NOT EXISTS document_links (
        source_document_id TEXT NOT NULL,
        target_document_id TEXT NOT NULL,
        link_text TEXT,
        PRIMARY KEY (source_document_id, target_document_id)
    );"#,
    r#"CREATE TABLE IF NOT EXISTS trash_items (
        id TEXT PRIMARY KEY,
        original_id TEXT NOT NULL,
        parent_id TEXT,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL DEFAULT '{}',
        is_daily_note INTEGER NOT NULL DEFAULT 0,
        is_folder INTEGER NOT NULL DEFAULT 0,
        is_bookmarked INTEGER NOT NULL DEFAULT 0,
        doc_type TEXT NOT NULL DEFAULT 'base',
        properties TEXT DEFAULT '{}',
        deleted_at INTEGER NOT NULL,
        original_path TEXT
    );"#,
    r#"CREATE TABLE IF NOT EXISTS document_tags (
        document_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (document_id, tag)
    );"#,
    r#"CREATE TABLE IF NOT EXISTS file_manifest (
        relative_path TEXT PRIMARY KEY,
        mtime INTEGER NOT NULL,
        size INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        indexed_at INTEGER NOT NULL
    );"#,
    r#"CREATE TABLE IF NOT EXISTS flint_meta (
        key TEXT PRIMARY KEY,
        value TEXT
    );"#,
    r#"CREATE INDEX IF NOT EXISTS idx_docs_parent_id ON documents(parent_id);"#,
    r#"CREATE INDEX IF NOT EXISTS idx_docs_title ON documents(title);"#,
    r#"CREATE INDEX IF NOT EXISTS idx_docs_is_folder ON documents(is_folder);"#,
    r#"CREATE INDEX IF NOT EXISTS idx_blocks_document_id ON blocks(document_id);"#,
    r#"CREATE INDEX IF NOT EXISTS idx_blocks_is_task ON blocks(is_task, task_completed);"#,
    r#"CREATE INDEX IF NOT EXISTS idx_doc_links_target ON document_links(target_document_id);"#,
    r#"CREATE INDEX IF NOT EXISTS idx_trash_deleted_at ON trash_items(deleted_at);"#,
    r#"CREATE INDEX IF NOT EXISTS idx_doc_tags_tag ON document_tags(tag);"#,
    r#"CREATE INDEX IF NOT EXISTS idx_manifest_mtime ON file_manifest(mtime);"#,
];

pub const FTS5_BLOCKS_STATEMENT: &str = r#"CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
    block_id UNINDEXED,
    document_id UNINDEXED,
    content_text,
    tokenize = 'unicode61 remove_diacritics 1'
);"#;

#[derive(Debug, Serialize, Deserialize)]
pub struct DbQueryItem {
    pub sql: String,
    pub params: Option<Vec<Value>>,
}

pub struct DbState {
    pub conn: Mutex<Option<Connection>>,
    pub active_path: Mutex<String>,
}

impl DbState {
    pub fn new() -> Self {
        Self {
            conn: Mutex::new(None),
            active_path: Mutex::new(String::new()),
        }
    }
}

/// Converts a serde_json::Value to a rusqlite parameter
fn json_to_sqlite_param(val: &Value) -> rusqlite::types::ToSqlOutput<'_> {
    match val {
        Value::Null => rusqlite::types::ToSqlOutput::from(rusqlite::types::Null),
        Value::Bool(b) => rusqlite::types::ToSqlOutput::from(*b as i64),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                rusqlite::types::ToSqlOutput::from(i)
            } else if let Some(f) = n.as_f64() {
                rusqlite::types::ToSqlOutput::from(f)
            } else {
                rusqlite::types::ToSqlOutput::from(n.to_string())
            }
        }
        Value::String(s) => rusqlite::types::ToSqlOutput::from(s.as_str()),
        Value::Array(_) | Value::Object(_) => rusqlite::types::ToSqlOutput::from(val.to_string()),
    }
}

/// Converts a rusqlite ValueRef to a serde_json::Value
fn sqlite_to_json_val(val_ref: ValueRef) -> Value {
    match val_ref {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(i) => json!(i),
        ValueRef::Real(f) => json!(f),
        ValueRef::Text(t) => {
            let s = String::from_utf8_lossy(t);
            Value::String(s.into_owned())
        }
        ValueRef::Blob(b) => {
            let s = String::from_utf8_lossy(b);
            Value::String(s.into_owned())
        }
    }
}

/// Helper to resolve target SQLite path for a vault
pub fn get_vault_db_path(vault_path: &str) -> PathBuf {
    let base = if vault_path.trim().is_empty() {
        let cfg = crate::vault::load_config();
        if !cfg.current_vault_path.trim().is_empty() {
            PathBuf::from(cfg.current_vault_path)
        } else {
            dirs::document_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("Flint Vault")
        }
    } else {
        PathBuf::from(vault_path)
    };

    let flint_dir = base.join(".flint");
    let _ = std::fs::create_dir_all(&flint_dir);
    flint_dir.join("flint.sqlite")
}

/// Opens SQLite connection and applies high-performance WAL pragmas and schema
pub fn open_vault_db(vault_path: &str) -> Result<Connection, String> {
    let db_path = get_vault_db_path(vault_path);
    if let Some(parent) = db_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let flags = OpenFlags::SQLITE_OPEN_READ_WRITE
        | OpenFlags::SQLITE_OPEN_CREATE
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;

    let conn = Connection::open_with_flags(&db_path, flags)
        .map_err(|e| format!("Failed to open SQLite database at {:?}: {}", db_path, e))?;

    // Performance Invariants: WAL mode, memory temp store, 64MB page cache
    // Note: PRAGMAs that return row results (such as journal_mode and mmap_size)
    // must consume their returned row via query_row to avoid ExecuteReturnedResults errors.
    let _ = conn.query_row("PRAGMA journal_mode = WAL;", [], |_| Ok(()));
    let _ = conn.query_row("PRAGMA mmap_size = 268435456;", [], |_| Ok(()));
    conn.execute_batch(
        r#"
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA temp_store = MEMORY;
        PRAGMA cache_size = -64000;
        "#,
    )
    .map_err(|e| format!("Failed to configure SQLite PRAGMAs: {}", e))?;

    // Execute schema definitions
    for statement in SQL_SCHEMA_STATEMENTS {
        if let Err(e) = conn.execute(statement, []) {
            eprintln!("[Flint Native DB] Schema warning on {}: {}", statement, e);
        }
    }

    // Initialize FTS5 table
    if let Err(e) = conn.execute(FTS5_BLOCKS_STATEMENT, []) {
        eprintln!("[Flint Native DB] FTS5 initialization note: {}", e);
    }

    Ok(conn)
}

// ── Tauri Commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn flint_db_init(
    state: tauri::State<'_, DbState>,
    vault_path: Option<String>,
) -> Result<bool, String> {
    let path_str = vault_path.unwrap_or_default();
    let target_db_path = get_vault_db_path(&path_str);

    // Fast-path: If the connection is already initialized for the exact same database file,
    // avoid redundant file-reopen, PRAGMA re-application, and schema iteration.
    {
        let guard = state.conn.lock();
        let current_path = state.active_path.lock();
        if guard.is_some() {
            let current_db_path = get_vault_db_path(&current_path);
            if current_db_path == target_db_path {
                return Ok(true);
            }
        }
    }

    let conn = open_vault_db(&path_str)?;

    *state.conn.lock() = Some(conn);
    *state.active_path.lock() = path_str;

    Ok(true)
}

#[tauri::command]
pub fn flint_db_query(
    state: tauri::State<'_, DbState>,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<Vec<Value>, String> {
    let guard = state.conn.lock();
    let conn = guard.as_ref().ok_or_else(|| "Database connection not initialized".to_string())?;

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Query prepare error: {} | SQL: {}", e, sql))?;

    let column_names: Vec<String> = stmt
        .column_names()
        .into_iter()
        .map(|s| s.to_string())
        .collect();

    let raw_params = params.unwrap_or_default();
    let param_refs: Vec<rusqlite::types::ToSqlOutput<'_>> =
        raw_params.iter().map(json_to_sqlite_param).collect();

    let rusqlite_params: Vec<&dyn rusqlite::ToSql> = param_refs
        .iter()
        .map(|p| p as &dyn rusqlite::ToSql)
        .collect();

    let mut rows = stmt
        .query(rusqlite_params.as_slice())
        .map_err(|e| format!("Query execution error: {} | SQL: {}", e, sql))?;

    let mut results = Vec::new();
    while let Some(row) = rows.next().map_err(|e| format!("Row error: {}", e))? {
        let mut obj = Map::new();
        for (idx, name) in column_names.iter().enumerate() {
            let val_ref = row.get_ref(idx).unwrap_or(ValueRef::Null);
            obj.insert(name.clone(), sqlite_to_json_val(val_ref));
        }
        results.push(Value::Object(obj));
    }

    Ok(results)
}

#[tauri::command]
pub fn flint_db_execute(
    state: tauri::State<'_, DbState>,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<usize, String> {
    let guard = state.conn.lock();
    let conn = guard.as_ref().ok_or_else(|| "Database connection not initialized".to_string())?;

    let raw_params = params.unwrap_or_default();
    if raw_params.is_empty() {
        match conn.execute_batch(&sql) {
            Ok(_) => Ok(1),
            Err(rusqlite::Error::ExecuteReturnedResults) => {
                // Statements like PRAGMAs or RETURNING clauses that produce rows
                // can be stepped through to completion
                let mut stmt = conn.prepare(&sql).map_err(|e| format!("Execute prepare error: {} | SQL: {}", e, sql))?;
                let mut rows = stmt.query([]).map_err(|e| format!("Execute query error: {} | SQL: {}", e, sql))?;
                while let Some(_) = rows.next().map_err(|e| format!("Execute row error: {} | SQL: {}", e, sql))? {}
                Ok(1)
            }
            Err(e) => Err(format!("Execute batch error: {} | SQL: {}", e, sql)),
        }
    } else {
        let param_refs: Vec<rusqlite::types::ToSqlOutput<'_>> =
            raw_params.iter().map(json_to_sqlite_param).collect();

        let rusqlite_params: Vec<&dyn rusqlite::ToSql> = param_refs
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        match conn.execute(&sql, rusqlite_params.as_slice()) {
            Ok(count) => Ok(count),
            Err(rusqlite::Error::ExecuteReturnedResults) => {
                let mut stmt = conn.prepare(&sql).map_err(|e| format!("Execute prepare error: {} | SQL: {}", e, sql))?;
                let mut rows = stmt.query(rusqlite_params.as_slice()).map_err(|e| format!("Execute query error: {} | SQL: {}", e, sql))?;
                while let Some(_) = rows.next().map_err(|e| format!("Execute row error: {} | SQL: {}", e, sql))? {}
                Ok(1)
            }
            Err(e) => Err(format!("Execute error: {} | SQL: {}", e, sql)),
        }
    }
}

#[tauri::command]
pub fn flint_db_transaction(
    state: tauri::State<'_, DbState>,
    queries: Vec<DbQueryItem>,
) -> Result<bool, String> {
    let mut guard = state.conn.lock();
    let conn = guard.as_mut().ok_or_else(|| "Database connection not initialized".to_string())?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;

    for q in queries {
        let raw_params = q.params.unwrap_or_default();
        let param_refs: Vec<rusqlite::types::ToSqlOutput<'_>> =
            raw_params.iter().map(json_to_sqlite_param).collect();

        let rusqlite_params: Vec<&dyn rusqlite::ToSql> = param_refs
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        match tx.execute(&q.sql, rusqlite_params.as_slice()) {
            Ok(_) => {},
            Err(rusqlite::Error::ExecuteReturnedResults) => {
                let mut stmt = tx.prepare(&q.sql).map_err(|e| format!("Transaction prepare error: {} | SQL: {}", e, q.sql))?;
                let mut rows = stmt.query(rusqlite_params.as_slice()).map_err(|e| format!("Transaction query error: {} | SQL: {}", e, q.sql))?;
                while let Some(_) = rows.next().map_err(|e| format!("Transaction row error: {} | SQL: {}", e, q.sql))? {}
            }
            Err(e) => return Err(format!("Transaction statement error: {} | SQL: {}", e, q.sql)),
        }
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub fn flint_db_supports_fts5() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_open_vault_db() {
        let temp_dir = std::env::temp_dir().join("flint_test_db");
        let res = open_vault_db(temp_dir.to_str().unwrap());
        assert!(res.is_ok(), "open_vault_db failed: {:?}", res.err());
    }

    #[test]
    fn test_icon_ico_entry_0_is_high_res() {
        let ico_bytes = include_bytes!("../icons/icon.ico");
        assert!(ico_bytes.len() > 22);
        // In ICO format, Entry 0 starts at offset 6:
        // byte 6 is width (0 represents 256px), byte 7 is height (0 represents 256px)
        let w = if ico_bytes[6] == 0 { 256 } else { ico_bytes[6] as u32 };
        let h = if ico_bytes[7] == 0 { 256 } else { ico_bytes[7] as u32 };
        assert_eq!(w, 256, "Icon entry 0 must be 256px wide for crisp rendering");
        assert_eq!(h, 256, "Icon entry 0 must be 256px high for crisp rendering");
    }
}
