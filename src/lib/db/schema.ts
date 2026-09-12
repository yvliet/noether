/**
 * @module schema
 * @description
 * Canonical SQLite relational schema statements for Noether's core database engine.
 *
 * Design Decisions:
 * 1. Native Isolation: The core schema defines only universal knowledge objects:
 *    `documents`, `blocks`, `blocks_fts` (Full-Text Search), `document_links`,
 *    `document_tags`, and `trash_items`.
 * 2. Extension Decoupling: Extension-specific tables (such as canvas spatial nodes
 *    or spaced-repetition cards) are initialized dynamically by the owning extension
 *    upon load. This prevents schema pollution and allows extensions to manage their
 *    own table schemas, migrations, and indexing lifecycle independently.
 * 3. FTS5 Virtual Tables: Enables sub-millisecond full-text search with BM25
 *    relevance ranking and unicode61 tokenization, with dynamic fallback to FTS4
 *    if running on fallback WASM builds.
 *
 * @since 0.1.0
 */

export const SQL_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS documents (
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
  );`,
  `CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    parent_block_id TEXT,
    content_text TEXT NOT NULL,
    block_type TEXT NOT NULL DEFAULT 'paragraph',
    order_index REAL NOT NULL,
    is_task INTEGER NOT NULL DEFAULT 0,
    task_completed INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS document_links (
    source_document_id TEXT NOT NULL,
    target_document_id TEXT NOT NULL,
    link_text TEXT,
    PRIMARY KEY (source_document_id, target_document_id)
  );`,
  `CREATE TABLE IF NOT EXISTS trash_items (
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
  );`,
  `CREATE TABLE IF NOT EXISTS document_tags (
    document_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (document_id, tag)
  );`,
  `CREATE TABLE IF NOT EXISTS file_manifest (
    relative_path TEXT PRIMARY KEY,
    mtime INTEGER NOT NULL,
    size INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    indexed_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_docs_parent_id ON documents(parent_id);`,
  `CREATE INDEX IF NOT EXISTS idx_docs_title ON documents(title);`,
  `CREATE INDEX IF NOT EXISTS idx_docs_is_folder ON documents(is_folder);`,
  `CREATE INDEX IF NOT EXISTS idx_blocks_document_id ON blocks(document_id);`,
  `CREATE INDEX IF NOT EXISTS idx_blocks_is_task ON blocks(is_task, task_completed);`,
  `CREATE INDEX IF NOT EXISTS idx_doc_links_target ON document_links(target_document_id);`,
  `CREATE INDEX IF NOT EXISTS idx_trash_deleted_at ON trash_items(deleted_at);`,
  `CREATE INDEX IF NOT EXISTS idx_doc_tags_tag ON document_tags(tag);`,
  `CREATE INDEX IF NOT EXISTS idx_manifest_mtime ON file_manifest(mtime);`
];

export const FTS5_BLOCKS_STATEMENT = `CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
  block_id UNINDEXED,
  document_id UNINDEXED,
  content_text,
  tokenize = 'unicode61 remove_diacritics 1'
);`;

export const FTS4_BLOCKS_STATEMENT = `CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts4(
  block_id,
  document_id,
  content_text
);`;

export const INITIAL_WELCOME_DOC_ID = 'welcome-to-noether';

export const INITIAL_DOCUMENTS_SEED = [
  {
    id: INITIAL_WELCOME_DOC_ID,
    parent_id: null,
    title: 'Welcome to Noether',
    is_daily_note: 0,
    is_folder: 0,
    is_bookmarked: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
    content_json: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Welcome to Noether' }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: "Welcome! You're looking at your first note." }
          ]
        },
        {
          type: 'paragraph',
          content: []
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Noether is a fast, local-first workspace for your thoughts, notes, and projects. Everything is stored as plain Markdown files right on your computer, indexed with an embedded SQLite database so search and backlinks feel instantaneous.' }
          ]
        },
        {
          type: 'paragraph',
          content: []
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Quick Start' }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Here are a few handy things to try right away:' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '- **Create a note**: Click the **+** button in the sidebar or press `Ctrl + N` (`Cmd + N` on macOS).' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '- **Find anything**: Press `Ctrl + K` (`Cmd + K`) to open Quick Search and jump to any note or command.' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: "- **Link your ideas**: Type `[[` to create a bi-directional link to any other note. If the note doesn't exist yet, Noether creates it for you on the fly." }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '- **Slash commands**: Type `/` on an empty line to quickly insert headings, lists, tables, callouts, or math blocks.' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '- **Explore connections**: Open the **Graph View** in the ribbon to see your thoughts branch out as your notes grow.' }
          ]
        },
        {
          type: 'paragraph',
          content: []
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Your Notes, Your Machine' }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'There is no proprietary lock-in here. Your notes live in your Vault folder as standard `.md` files that you can edit in any text editor, back up with Git, or sync with whatever tool you prefer.' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Feel free to edit this note, delete it, or keep it around as a quick reference. Happy writing!' }
          ]
        }
      ]
    })
  }
];
