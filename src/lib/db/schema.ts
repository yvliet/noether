/**
 * @module schema
 * @description
 * Canonical SQLite relational schema statements for Flint's core database engine.
 *
 * Design Decisions:
 * 1. Native Isolation: The core schema defines only universal knowledge objects:
 *    `documents`, `blocks`, `blocks_fts` (Full-Text Search), `document_links`,
 *    `document_tags`, and `trash_items`.
 * 2. Extension Decoupling: Extension-specific tables (such as canvas spatial nodes
 *    or spaced-repetition cards) are initialized dynamically by the owning extension
 *    upon load. This prevents schema pollution and allows extensions to manage their
 *    own table schemas, migrations, and indexing lifecycle independently.
 * 3. FTS4 Virtual Tables: Enables sub-millisecond full-text search across thousands
 *    of atomic blocks with zero external search index dependencies.
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
  `CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts4(
    block_id,
    document_id,
    content_text
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

export const INITIAL_WELCOME_DOC_ID = 'welcome-to-flint';

export const INITIAL_DOCUMENTS_SEED = [
  {
    id: INITIAL_WELCOME_DOC_ID,
    parent_id: null,
    title: 'Welcome to Flint',
    is_daily_note: 0,
    is_folder: 0,
    is_bookmarked: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
    content_json: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Welcome to Flint ⚡' }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Flint is a local-first writing environment and knowledge engine combining a modern typography canvas with embedded ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'SQLite' },
            { type: 'text', text: ' relational persistence and a modular extension ecosystem.' }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Key Features & Hotkeys' }]
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Quick Open / Command Search: ' },
                  { type: 'text', marks: [{ type: 'code' }], text: 'Ctrl + K' },
                  { type: 'text', text: ' or ' },
                  { type: 'text', marks: [{ type: 'code' }], text: 'Cmd + K' }
                ]
              }]
            },
            {
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Slash Commands: ' },
                  { type: 'text', text: 'Type ' },
                  { type: 'text', marks: [{ type: 'code' }], text: '/' },
                  { type: 'text', text: ' at any empty line to insert headings, task lists, code blocks, or custom extension blocks.' }
                ]
              }]
            },
            {
              type: 'listItem',
              content: [{
                type: 'paragraph',
                content: [
                  { type: 'text', marks: [{ type: 'bold' }], text: 'Bi-directional Wiki-links: ' },
                  { type: 'text', text: 'Type ' },
                  { type: 'text', marks: [{ type: 'code' }], text: '[[' },
                  { type: 'text', text: ' to link to any note in your Hearth.' }
                ]
              }]
            }
          ]
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Getting Started' }]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Create notes, organize folders in the left sidebar, and explore installed extensions from Settings (Ctrl + ,).' }
          ]
        }
      ]
    })
  }
];
