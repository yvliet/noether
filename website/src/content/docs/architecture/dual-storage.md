# Dual-Storage Architecture

Flint combines the transparency of plain-text Markdown files with the query power of an embedded relational database. This document details how Flint separates document files on disk from the SQLite metadata engine, how synchronization occurs, and the performance characteristics of this design.


## 1. Architectural Motivation

---

Note-taking systems typically select one of two extremes:

1. **Pure File-Tree Architecture** (e.g., standard markdown folders):
   - *Pros*: Complete user ownership, inspectable via standard tools, easy to back up with Git.
   - *Cons*: O(N) file system scans for backlink resolution, slow full-text search across thousands of files, and sluggish graph traversal.
2. **Pure Relational/Document Database** (e.g., proprietary cloud databases):
   - *Pros*: O(1) indexed queries, fast graph traversal, and instant full-text search.
   - *Cons*: Vendor lock-in, proprietary storage formats, inability to inspect raw notes, and complex conflict resolution.

Flint eliminates this trade-off with a **Dual-Storage Engine**:
- **Disk Markdown Files (`.md`)**: The authoritative source of truth.
- **Relational SQLite Database (`.flint/flint.sqlite`)**: A compiled native Rust SQLite engine (`rusqlite` with WAL mode and FTS5) acting as an instant metadata cache and query accelerator.

If `.flint/flint.sqlite` is ever deleted or corrupted, Flint simply re-scans the Markdown files in the Hearth using the differential `file_manifest` and rebuilds the relational cache in seconds.


## 2. Synchronization Pipeline

---

Synchronization between the file system and SQLite operates through a bidirectional, event-driven pipeline:

| Storage Layer | Synchronization Pipeline |
|:---|:---|
| **Track 1: Authoritative Disk Storage** | Local filesystem Markdown (`*.md`) serving as the permanent source of truth |
| **Atomic Write Engine** | Writes to temp file `.flint-tmp-*` then atomic-renames to prevent data loss |
| **Filesystem Watcher** | Debounced cross-platform file monitoring for external edits |
| **AST Metadata Tokenizer** | Extracts frontmatter, `[[wikilinks]]`, `#tags`, headings, and task checkboxes |
| **Track 2: SQLite Relational Index** | Embedded `rusqlite` WAL-mode cache for high-speed indexing & graph queries |
| **`documents` & `blocks_fts`** | Fast document metadata lookup and BM25 full-text search index |
| **`document_links`** | Indexed forward and backward links for instant graph rendering & backlinks |
| **`extension_storage`** | Dynamic SQLite tables managed by extensions (e.g. FSRS card state, task boards) |
| **Central `EventBus`** | Dispatches `document:saved` and `document:deleted` across host & extension handlers |

### Save Lifecycle (Internal Edit)

1. **Typing in Editor**: The user types in the TipTap/ProseMirror editor. Changes mutate the in-memory document state immediately for sub-8ms input latency.
2. **Debounced Disk Flush**: A 300ms debounce timer triggers file writing. The editor serializes the document into standard UTF-8 CommonMark with YAML frontmatter.
3. **AST Metadata Extraction**: As part of the save pipeline, the AST tokenizer extracts:
   - Frontmatter properties (`tags`, `aliases`, custom YAML fields).
   - Wikilinks (`[[Target Document]]` or `[[Target Document|Alias]]`).
   - Task checkboxes (`- [ ]`, `- [x]`).
   - Heading outlines (`#`, `##`, `###`).
4. **Relational Indexing**: In a single SQLite transaction:
   - Updates the `documents` row with current title, modified timestamp (`mtime`), and frontmatter JSON.
   - Synchronizes forward edges in the `links` table.
   - Updates tag relations in `document_tags`.
   - Re-indexes the full text in `fts_documents`.
5. **Event Broadcast**: Emits `document:saved` on the `EventBus`, alerting UI tabs and listening extensions.


## 3. Database Schema Overview

---

The embedded SQLite schema lives in `.flint/flint.sqlite`. Key tables include:

### `documents`
Stores file metadata and hierarchy:

```sql
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  parent_id TEXT,
  is_folder INTEGER DEFAULT 0,
  mtime INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER DEFAULT NULL,
  properties TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_mtime ON documents(mtime);
```

### `links`
Stores bidirectional Wikilink graph edges:

```sql
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_title TEXT NOT NULL,
  target_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  link_text TEXT,
  line_number INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
CREATE INDEX IF NOT EXISTS idx_links_target_title ON links(target_title);
```

### `document_tags`
Stores tag associations:

```sql
CREATE TABLE IF NOT EXISTS document_tags (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (document_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag);
```

### `fts_documents` (FTS5 Full-Text Search)
Enables instantaneous BM25 ranking across note collections:

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS fts_documents USING fts5(
  document_id UNINDEXED,
  title,
  content,
  tokenize = 'porter unicode61'
);
```


## 4. Backlink Resolution Engine

---

Resolving backlinks in pure file-based editors requires searching every file in the directory. In Flint, resolving incoming backlinks for any document is a sub-millisecond query:

```sql
SELECT
  d.id,
  d.title,
  d.path,
  l.line_number,
  l.link_text
FROM links l
JOIN documents d ON l.source_id = d.id
WHERE l.target_id = ? OR l.target_title = ?
ORDER BY d.mtime DESC;
```

When a document is renamed from `Project Alpha` to `Project Beta`:
1. The filesystem file is renamed on disk.
2. The `documents` table updates `title = 'Project Beta'`.
3. Flint triggers an automated link refactoring pass, updating all referencing Markdown files and relational rows within the same atomic operation.


## 5. Storage Engine Implementations

---

Flint supports two runtime execution targets for SQLite:

### A. Desktop Mode: Native Rusqlite (Tauri IPC)
- Uses native C/Rust SQLite compiled directly into the Tauri binary.
- Configured with `PRAGMA journal_mode = WAL;` (Write-Ahead Logging) and `PRAGMA synchronous = NORMAL;`.
- Eliminates the ~100MB memory footprint of WebAssembly runtimes.
- Page commits execute on disk in microseconds on background worker threads, guaranteeing that typing in the UI thread never drops frames.

### B. Web Mode: WebAssembly SQLite (`sql.js`)
- Runs when previewing Flint in standard browsers or web playgrounds.
- In-memory execution using WebAssembly with debounced IndexedDB binary dumps.
- Full SQL compatibility ensures extensions run without code changes between desktop and web builds.


## 6. Related Reading & References

---

- [[Database Schema Reference]]: Inspect all tables, columns, indexes, and FTS5 definitions.
- [[Micro-Kernel & Extension Architecture]]: Understand how extensions safely interact with the host.
- [[Events & Relational Storage]]: Learn how extensions register dynamic SQLite tables.
- [[Model Context Protocol (MCP) Tools]]: Expose database queries to AI agent copilots.
