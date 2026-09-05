# Hearths & Workspace Management

In Flint, individual workspaces or note vaults are called **Hearths**. This document covers how Hearths work, multi-workspace switching, full-text search with SQLite FTS5, file safety in the `.trash/` folder, and cloud/Git synchronization best practices.

---

## 1. The "Hearth" Structure

A Hearth is simply any standard folder on your computer that contains Markdown files. When opened in Flint, an internal `.flint/` directory is established at the root:

```
My-Knowledge-Base/            <-- Hearth Root Directory
├── .flint/                   <-- Local Workspace Metadata & Cache
│   ├── flint.sqlite          <-- Native Rust SQLite database (WAL mode)
│   ├── flint.sqlite-wal      <-- SQLite Write-Ahead Log
│   ├── settings.json         <-- Hearth-specific settings & toggles
│   ├── canvas/               <-- Spatial canvas JSON definitions
│   └── plugins/              <-- Locally installed community extensions
├── .trash/                   <-- Soft-delete safety folder
├── Projects/
│   ├── Architecture.md
│   └── Roadmap.md
├── Journal/
│   └── 2026-09-06.md
└── Index.md
```

### Physical Ground Truth Invariant
- **Your files are never trapped in a database**: All text, frontmatter, and embedded media live as standard plain-text files on your hard drive.
- **The database is disposable**: If `flint.sqlite` is ever deleted or damaged, Flint automatically scans your markdown files on the next boot and reconstructs the relational index and search catalog in seconds.

---

## 2. Multi-Hearth Agility

Flint is engineered for seamless multi-workspace management:

- **Hearth Switcher (`Ctrl+Shift+O`)**: Press `Ctrl+Shift+O` or click the workspace name in the top titlebar to open the Hearth Switcher modal.
- **Instant Context Switching**: Switch between *Work*, *Personal*, *Research*, or *Client* vaults in milliseconds without restarting the desktop application.
- **Cross-Hearth Auto-Discovery**: Flint maintains a system-wide registry of recently opened vaults. External AI tools and the built-in MCP server can discover and search across all known Hearths automatically.

---

## 3. High-Performance Full-Text Search (SQLite FTS5 + BM25)

Finding notes across a library of thousands of documents is instantaneous in Flint.

### Quick Open (`Ctrl+K` or `Ctrl+O`)
Press `Ctrl+K` to open the Command & Note Search Palette. Start typing to filter notes by title, alias, or file path.

### Full-Text Deep Search
Click the **Search** icon in the sidebar or press `Ctrl+Shift+F` for deep body text search.

- **Statistical BM25 Ranking**: Search results are scored using the industry-standard Okapi BM25 ranking algorithm, matching term frequency and inverse document frequency.
- **Diacritics Removal**: Searching for `resume` finds `résumé` automatically via SQLite's `unicode61 remove_diacritics 1` tokenizer.
- **Syntax Filters**:
  - `tag:#architecture`: Restricts results to documents with the specified tag.
  - `path:Projects/`: Restricts search to a specific directory subtree.
  - `"exact phrase"`: Matches literal multi-word strings.

---

## 4. File Safety & Soft-Delete Recovery (`.trash/`)

Accidental file deletion should never result in permanent data loss. Flint implements a **safe soft-delete pipeline**:

1. **Trash Folder Relocation**: When a document is deleted via the file tree, command palette, or MCP tool, Flint moves the physical `.md` file into the hidden `.trash/` directory inside your Hearth.
2. **Metadata Preservation**: Original file paths, timestamps, and document IDs are recorded in the `trash_items` SQLite table.
3. **Restoration**: Deleted notes can be inspected and restored to their original location with a single click in *Settings → File Safety → Trash Bin*.

---

## 5. Synchronization & Backup Best Practices

Because Flint stores plain CommonMark files alongside lightweight SQLite journals, you have complete freedom to choose your synchronization tool:

### Using Git
Git is an ideal synchronization tool for Flint Hearths:
- Notes remain human-readable diffs in commit histories.
- Create a `.gitignore` inside your Hearth root:
  ```gitignore
  # Ignore temporary SQLite cache and WAL logs
  .flint/flint.sqlite*
  .flint/*.tmp*
  .trash/
  ```
  *(Flint will automatically regenerate `flint.sqlite` on other machines upon launch).*

### Using Syncthing, iCloud Drive, or Dropbox
- Set your Hearth folder directly within your synchronized cloud directory.
- Flint's **atomic temp-and-rename writes** and **echo suppression signatures** prevent file-watcher conflict loops during remote sync updates.
