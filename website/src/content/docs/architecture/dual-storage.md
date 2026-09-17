# Dual-Storage Architecture

Noether combines the permanence of plain CommonMark files on your hard drive with the speed of an embedded relational database. Plain Markdown files act as the single ground truth, while an embedded native SQLite engine accelerates search, backlinks, and graph traversals.

## 1. The 1,000-Note Performance Wall

---

If you build a note-taking app purely on top of plain Markdown files, you run directly into a performance wall once a vault grows past a few thousand notes:

- Resolving backlinks requires scanning every file on disk to find incoming `[[Wikilinks]]`. On a 5,000-note vault, that means reading gigabytes of text off disk on every document open.
- Graph view rendering requires parsing the entire vault's AST before it can calculate even a single force-directed physics edge.
- Full-text search across unindexed text files forces high CPU spikes and freezes the main UI thread.

The obvious naive alternative is stuffing every note into a monolithic SQLite or Postgres database. While that gives you instant indexed queries, it destroys the single most important quality of local-first software: **your notes are trapped in a binary format**. You cannot open them in VS Code, inspect them with standard Unix tools, or track them cleanly with Git.

Noether solves this with a **Dual-Storage Engine**:

1. **Local CommonMark Files (`*.md`)**: The sole permanent source of truth. If Noether crashes, your files remain 100% readable and intact on disk.
2. **Embedded Rust SQLite Index (`.noether/noether.sqlite`)**: A compiled native SQLite engine (`rusqlite` in WAL mode with FTS5 and BM25 ranking) that acts as an instant metadata cache.

If `.noether/noether.sqlite` is ever deleted, corrupted, or wiped, Noether automatically traverses the Markdown files in your vault, extracts frontmatter, links, and tags via the AST tokenizer, and rebuilds the relational cache in seconds without losing a single character of your writing.

```
+-------------------------------------------------------------------------+
|                              USER INTERFACE                             |
|               TipTap / ProseMirror Live Preview (In-Memory Buffer)      |
+-------------------------------------------------------------------------+
                                     |
              +----------------------+----------------------+
              |                                             |
   (Debounced 300ms Flush)                        (Relational Indexing)
              v                                             v
+---------------------------+                 +---------------------------+
|    FILE SYSTEM TRACK      |                 |    SQLITE METADATA TRACK  |
|  .noether-tmp-*  (Atomic) |                 |  rusqlite WAL Mode (Rust) |
|           v               |                 |  256MB Memory-Mapped I/O  |
|      note.md on Disk      |                 |  documents, links, tags   |
|   (Authoritative Truth)   |                 |  fts_documents (BM25 FTS) |
+---------------------------+                 +---------------------------+
              |                                             |
              +----------------------+----------------------+
                                     v
                          Tauri File System Watcher
                    (Signature-Based Echo Suppression)
```

## 2. The 3-Tier Save Lifecycle

---

Typing latency is the single fastest way to make a desktop editor feel sluggish. In early prototypes, serializing Markdown ASTs and executing SQLite write transactions on every keystroke introduced noticeable input lag.

To keep typing instant without dropping frames, Noether separates note persistence into three distinct tiers:

```
Tier 1: In-Memory Mutation (Instant)
User types → ProseMirror transaction updates in-memory document state immediately.

Tier 2: Debounced Disk Write (300ms)
Editor serializes document to UTF-8 CommonMark with YAML frontmatter.
Writes to '.noether-tmp-*' → Atomic OS rename to 'note.md'.

Tier 3: Background SQLite Indexing (Batch Transaction)
AST tokenizer extracts frontmatter, [[wikilinks]], #tags, task checkboxes, and outlines.
Updates 'documents', 'links', 'document_tags', and 'fts_documents' tables.
Emits 'document:saved' event across EventBus.
```

### Why Atomic Temp-File Renames Matter
On Windows and macOS, background file indexing services (like Windows Search Indexer or Spotlight) and antivirus scanners briefly lock files when they detect disk modifications. If an editor writes directly to `note.md` with standard truncation while another process holds a read handle, the write can fail silently or truncate the note to 0 bytes.

Noether writes new note contents to a hidden temporary file (`.noether-tmp-*`) in the vault and performs an atomic filesystem rename (`MoveFileEx` / `renameat`). The original note remains untouched on disk until the new bytes are completely flushed and verified.

## 3. File Watcher Echo Suppression

---

Because Noether supports editing notes externally in VS Code or pulling changes via Git, the Tauri backend runs a recursive filesystem watcher over the entire vault.

When Noether saves a note internally, the filesystem watcher detects that file modification on disk and fires an `on_file_changed` event. Without protection, this creates a dangerous recursive reload loop: the app saves, the watcher sees the save, the app reloads the file, and active typing caret positions get reset.

Noether prevents this with **Signature-Based Write Tracking**:

1. Before writing `note.md` to disk, the internal save pipeline records an in-memory signature containing the document ID, absolute path, and millisecond timestamp.
2. When the filesystem watcher receives a file modification event, it checks whether the file event matches an active internal write signature within a 500ms window.
3. If the signature matches, the watcher suppresses the event as an internal echo.
4. If an external tool (like Git or an external text editor) modified the file, the signature is absent, and Noether immediately updates the editor buffer and re-indexes SQLite.

## 4. Embedded SQLite Schema

---

The relational index resides at `.noether/noether.sqlite` inside the vault root. The database runs with `PRAGMA journal_mode = WAL;`, `PRAGMA synchronous = NORMAL;`, and `PRAGMA mmap_size = 268435456;` (256MB memory-mapped I/O) to keep queries instantaneous.

### Core Tables

```sql
-- Document Hierarchy and Metadata
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

-- Bidirectional Wikilink Graph Edges
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

-- Tag Associations
CREATE TABLE IF NOT EXISTS document_tags (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (document_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag);

-- Full-Text BM25 Search Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS fts_documents USING fts5(
  document_id UNINDEXED,
  title,
  content,
  tokenize = 'porter unicode61'
);
```

## 5. Instant Backlink Resolution

---

In pure text-based editors, resolving incoming backlinks for a note requires grepping through every file in the directory. In Noether, resolving backlinks is a single indexed SQL query that runs in under 1ms:

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

When you rename a note from `Architecture Ideas` to `Core Engine Blueprint`:
1. Noether renames the `.md` file on disk.
2. Updates `title = 'Core Engine Blueprint'` in the `documents` table.
3. Automatically refactors all referencing `[[Architecture Ideas]]` wikilinks across your other Markdown files in a single atomic transaction.

## 6. Related Architecture Reading

---

- [[Systems & Performance Engineering]]: How 3-tier persistence, memory trimming, and background physics suspension keep the UI responsive.
- [[Micro-Kernel & Extension Architecture]]: How extensions register custom SQLite schemas without touching core tables.
- [[Model Context Protocol (MCP) Tools]]: How local AI assistants query the SQLite index over stdio.
