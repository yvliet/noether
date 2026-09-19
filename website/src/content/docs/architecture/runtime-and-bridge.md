# Native Runtime & Platform Bridge

A comprehensive breakdown of Noether's desktop runtime layer, Tauri v2 IPC pipeline, crash-safe file persistence, native Rust commands, and background memory management.

## 1. Native Desktop Architecture with Tauri v2
---

Rather than bundling a complete Chromium browser binary (which bloats app distribution packages to 150MB+ and demands 800MB+ idle RAM), Noether uses **Tauri v2** with a native compiled Rust backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Webview Frontend (React 19)                  │
│   TipTap Editor • Force Graph • Zustand Stores • Tailwind UI   │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Tauri IPC Commands
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Compiled Rust Backend (Tauri v2)              │
│   • rusqlite WAL Engine        • Crash-Safe Atomic Saves        │
│   • Asynchronous File Watcher  • Win32 Memory Trimmer           │
│   • Native Git Version Control • Dynamic Icon Tinting           │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Direct OS Calls
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Local File System                         │
│   • Plain Text *.md Notes      • .noether/noether.sqlite        │
└─────────────────────────────────────────────────────────────────┘
```

The frontend interfaces with the operating system through strongly typed Tauri IPC commands declared in `src-tauri/src/`.

## 2. Native Rust Tauri IPC Commands Catalog (58 Commands)
---

Below is the complete catalog of native Rust commands registered via `tauri::generate_handler!`:

### A. Vault & Filesystem Operations (`vault.rs`)
| Command Name | Arguments | Description |
| :--- | :--- | :--- |
| `get_current_vault` | None | Returns the active vault filesystem path and metadata. |
| `set_current_vault` | `path: String` | Switches the active workspace vault in the native state. |
| `create_new_vault` | `name: String, path: Option<String>` | Initializes a new vault directory structure. |
| `rename_vault` | `old_path: String, new_name: String` | Renames a vault root folder. |
| `remove_recent_vault` | `path: String` | Removes a vault from recent history. |
| `open_vault_in_explorer` | `path: String` | Opens the vault root in Windows Explorer or macOS Finder. |
| `reveal_in_explorer` | `path: String` | Highlights a specific file in the OS file manager. |
| `open_in_default_app` | `path: String` | Launches the operating system default app for a file. |
| `scan_vault_files` | `vault_path: String` | Fast recursive filesystem walk indexing notes and assets. |
| `create_vault_folder` | `vault_path: String, folder_path: String` | Creates directory structure safely within vault bounds. |
| `save_markdown_file` | `vault_path: String, relative_path: String, content: String` | Atomic save pipeline with internal write timestamp registration. |
| `read_markdown_file` | `vault_path: String, relative_path: String` | Reads UTF-8 CommonMark note text. |
| `read_binary_file` | `vault_path: String, relative_path: String` | Reads binary media assets as Base64 strings. |
| `set_file_attributes` | `vault_path: String, relative_path: String, attributes: Value` | Updates OS file attributes. |
| `delete_markdown_file` | `vault_path: String, relative_path: String` | Boundary-safe note deletion. |
| `rename_markdown_file` | `vault_path: String, old_relative_path: String, new_relative_path: String` | Atomically renames a file on disk. |
| `open_plugins_folder` | `vault_path: String` | Opens `.noether/extensions/` in the OS file manager. |
| `open_trash_folder` | `vault_path: String` | Opens `.trash/` in the OS file manager. |
| `save_trash_file` | `vault_path: String, file_name: String, content: String` | Archives a note into `.trash/`. |
| `delete_trash_file` | `vault_path: String, file_name: String` | Permanently deletes a note from `.trash/`. |
| `empty_trash_folder` | `vault_path: String` | Purges all files inside `.trash/`. |

### B. Extension Bundle Management (`vault.rs`)
| Command Name | Arguments | Description |
| :--- | :--- | :--- |
| `list_installed_plugins` | `vault_path: String` | Scans `.noether/extensions/` and returns installed manifests. |
| `read_plugin_bundle` | `vault_path: String, plugin_id: String` | Reads compiled extension JS bundle and CSS stylesheets. |
| `install_plugin_bundle` | `vault_path, plugin_id, manifest, bundle_code, styles_code` | Writes extension bundle files into `.noether/extensions/<id>/`. |
| `uninstall_plugin_bundle` | `vault_path: String, plugin_id: String` | Removes extension directory from disk. |

### C. Native SQLite Caching & FTS5 (`db.rs`)
| Command Name | Arguments | Description |
| :--- | :--- | :--- |
| `noether_db_init` | `state, vault_path: String` | Initializes `.noether/noether.sqlite` in WAL mode with 256MB mmap. |
| `noether_db_query` | `state, query: String, params: Vec<Value>` | Executes parameter-bound SQL queries returning JSON row arrays. |
| `noether_db_execute` | `state, query: String, params: Vec<Value>` | Executes SQL statements returning affected row counts. |
| `noether_db_transaction` | `state, statements: Vec<TransactionStatement>` | Executes batch statements inside an atomic SQLite transaction. |
| `noether_db_supports_fts5` | `state` | Validates native compiled FTS5 module support. |

### D. Version Control & Snapshot Engine (`vcs.rs`)
| Command Name | Arguments | Description |
| :--- | :--- | :--- |
| `vcs_check_status` | `vault_path: String` | Checks local Git repository availability and dirty file status. |
| `vcs_init_vault` | `vault_path: String` | Initializes a local Git tracking repository. |
| `vcs_create_snapshot` | `vault_path: String, message: String` | Creates an atomic Git commit snapshot of modified files. |
| `vcs_get_file_history` | `vault_path: String, relative_path: String` | Returns commit history log for a note. |
| `vcs_get_file_diff` | `vault_path: String, relative_path: String, commit_hash: String` | Generates a unified diff against a target commit. |
| `vcs_get_historical_content` | `vault_path: String, relative_path: String, commit_hash: String` | Retrieves raw note text from a historical Git commit tree. |
| `vcs_restore_file` | `vault_path: String, relative_path: String, commit_hash: String` | Reverts a note file to a historical commit state. |

### E. Window Management, Memory Trimming & System Services
| Command Name | Arguments | Description |
| :--- | :--- | :--- |
| `window_minimize` / `window_maximize` / `window_close` | Window handle | Standard native window state controls. |
| `window_is_maximized` / `window_is_minimized` / `window_is_fullscreen` | Window handle | Queries window display geometry flags. |
| `window_set_fullscreen` | `fullscreen: bool` | Toggles window fullscreen mode. |
| `window_start_dragging` | Window handle | Initiates smooth native window dragging on custom title bars. |
| `window_set_title` | `title: String` | Updates OS native window title. |
| `window_trim_memory` | None | Calls Win32 `SetProcessWorkingSetSize` to flush RAM below 150MB when idle. |
| `notify_user_activity` | None | Resets idle timer on user keystroke or mouse movement. |
| `focus_main_window` | None | Brings primary application window to foreground. |
| `open_vault_window` / `close_vault_window` | None | Controls secondary multi-vault window instances. |
| `open_settings_window` / `close_settings_window` | None | Controls dedicated settings window instances. |
| `open_help_window` / `close_help_window` | None | Controls dedicated help documentation window instances. |
| `save_app_settings` / `load_app_settings` | `settings: Value` | Persists global application preferences in app data root. |
| `register_global_shortcut` / `unregister_global_shortcut` | `shortcut: String` | Binds system-wide OS hotkeys. |
| `download_remote_text` | `url: String` | Fetches remote extension bundles and marketplace manifests. |
| `read_clipboard_files` / `has_clipboard_files` / `copy_files_to_vault` | `vault_path` | Handles OS-level clipboard file drops and pastes into vault. |
| `set_accent_icon` | `accent_color: String` (`icon_tint.rs`) | Dynamically renders window taskbar icons tinted to theme accent. |

## 3. Crash-Safe Atomic Persistence & 3-Tier Asynchronous Pipeline
---

A primary risk in local-first note-taking software is data corruption if power cuts out or the OS crashes during a write operation, paired with UI micro-stutters when persisting large documents. Noether eliminates both risks through a **temp-and-rename atomic save pipeline** combined with a **3-tier asynchronous state separation**:

### 3-Tier Asynchronous Pipeline
To keep typing responsive and prevent UI stutter, document mutations are split across three decoupled tiers:

1. **Tier 1 (Instant In-Memory Keystroke)**: Keystrokes mutate the local ProseMirror document state synchronously. Primitive status metrics (character count, word count) update immediately without touching secondary stores or triggering parent component re-renders.
2. **Tier 2 (Debounced Disk Flush & Content Cache, 400ms)**: When the user pauses typing for 400ms, the active buffer flushes to disk.
   - **Atomic Write to Temp**: Rust writes the serialized CommonMark content to a unique temporary file in the same directory: `<filename>.tmp.<pid>`.
   - **Atomic Rename (`fs::rename`)**: Once the write completes, the OS atomically replaces the destination file with the temp file. On POSIX and Windows filesystems, atomic renames guarantee that notes are never left truncated or corrupt.
   - **In-Place Store Patching**: During pure content edits, `saveDocumentById` updates the document's cached `content_json` and timestamp in place without creating a new `documents` array reference. This prevents cascading re-renders across the file tree, sidebars, breadcrumb headers, and editor frames.
3. **Tier 3 (Idle Secondary Indexing, 1200ms)**: Heavy analytical work (full-text search re-indexing, unlinked mention scanning across all vault notes, and broken embed validation) is deferred to idle time using a 1200ms debounced queue. The JavaScript main thread never pauses during rapid typing.

## 4. Atomic File Saves & Watcher Loop Filtering
---

When Noether saves a note to disk, the operating system's filesystem watcher fires a change event. Without proper handling, this creates an infinite loop: save note → watcher detects change → reload note → re-save note.

Noether prevents this through internal write timestamp tracking:
- **Timestamp Registration**: When an internal save occurs, the timestamp is registered in memory via `mark_internal_write()`.
- **Internal Write Filtering**: When the watcher fires, it compares the event timestamp against `LAST_INTERNAL_WRITE`. If the event originated from Noether's own save within the last 500ms, the reload is silently discarded.
- **External Change Detection**: If an external modification occurs (from Git, another editor, or a background script), Noether detects it, debounces the burst, and reloads the note in the editor without losing external changes.
- **Conflict Protection**: When the editor is actively focused, ProseMirror maintains sole authority over its active buffer, preventing cursor jumps or typing interruptions during background file sync.

## 5. Win32 Working Set Memory Trimming
---

Electron applications frequently consume 1GB to 2GB of RAM because Chromium holds onto cached garbage collection heaps indefinitely.

In Noether, after 120 seconds of user inactivity, the native Rust backend calls the operating system's memory management API (`SetProcessWorkingSetSize` on Windows). This flushes non-essential working set pages from physical RAM back to the operating system's standby pool, consistently keeping Noether's idle memory footprint under **150MB**. The moment you interact with the app again, the OS pages the required buffers back into memory smoothly.

## 6. Lossless Markdown Round-Trip & Source Mode Fidelity
---

A fundamental challenge in modern rich-text editors is the impedance mismatch between hierarchical ProseMirror ASTs and plain CommonMark text:
- ProseMirror models documents as an abstract, typed hierarchical tree.
- Markdown is a loose, human-authored text stream with arbitrary indentation, distinct list markers (`-`, `*`, `+`), YAML frontmatter comments, raw HTML tags, and multiline table formatting.

Noether solves this through a multi-tier fidelity engine designed to protect physical Markdown integrity:

### Verbatim Raw Frontmatter Preservation
When you open a note containing YAML frontmatter, `parseFrontmatter` captures the exact raw frontmatter string (`_raw_frontmatter`) alongside parsed key-value metadata:
- **Zero Syntax Alteration**: YAML comments (`# Author notes`), custom multi-line indentation, folded scalars, and explicit YAML quote styles remain untouched.
- **Verbatim Serialization**: When writing back to disk, if properties were not structurally altered via the UI metadata inspector, `formatFrontmatter` re-emits the exact raw frontmatter block byte-for-byte instead of reconstructing synthetic YAML.

### AST List Marker Retention
Standard CommonMark serializers discard list bullet characters upon AST ingestion, defaulting to `-` for every item upon disk export. Noether preserves authored list markers through explicit node attributes:
- **Marker Extraction**: During parsing, `matchListItemLine` extracts the exact list marker (`-`, `*`, or `+`) and persists it into the list item's AST attributes (`attrs.marker`).
- **Targeted Serialization**: `jsonToMarkdown` inspects `li.attrs?.marker` when serializing bullet lists and task lists. Nested mixed-marker lists (`*` for top-level, `-` for sub-items) retain their original visual taxonomy on disk.

### Multiline Table Structure & Delimiter Escaping
Markdown pipe tables are notorious for mangling during AST conversions. Noether protects table cell integrity with delimiter normalization:
- **Multiline Cell Encoding**: Line breaks within table cells are converted to `<br>` tags during serialization (`replace(/\r?\n/g, '<br>')`) rather than collapsing into single-line spaces. Upon ingestion, `<br>` tags are converted into native `hardBreak` nodes, allowing multiline cell editing without breaking pipe table syntax.
- **Pipe Delimiter Escaping**: Literal pipe characters within cell text are automatically escaped (`\|`) during serialization and parsed cleanly via lookbehind splitters (`split(/(?<!\\)\|/)`), preventing column count corruption.

### Direct Plaintext Source Mode Disk Bypass
When editing in **Source Mode**, you are interacting directly with the raw Markdown buffer:
- **AST Serialization Bypass**: Keystrokes in Source Mode maintain a direct raw text ref (`pendingRawMarkdownRef`). When auto-save flushes, Noether pipes this raw string directly to the atomic save pipeline on disk via `rawMarkdownOverride`.
- **Zero Round-Trip Degradation**: Because disk writes completely bypass `jsonToMarkdown`, arbitrary Markdown extensions, custom indented code fences inside task lists, Setext headings, and raw HTML blocks never pass through AST normalization.
- **Asynchronous Search Indexing**: While disk writes remain 100% byte-for-byte identical to the raw textarea buffer, SQLite blocks and full-text search (FTS5) continue to update asynchronously in the background using the derived AST, preserving instant backlinks, tag indexing, and search capabilities without compromising file fidelity.


