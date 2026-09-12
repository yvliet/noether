# Vaults & Workspace Management

In Noether, individual workspaces or note vaults are called **Vaults**. This document covers how Vaults work, multi-workspace switching, full-text search with SQLite FTS5, file safety in the `.trash/` folder, and cloud/Git synchronization best practices.

## 1. The "Vault" Structure
---

A Vault is simply any standard folder on your computer that contains Markdown files. When opened in Noether, an internal `.noether/` directory is established at the root:

```
My-Knowledge-Base/            ← Vault Root Directory
├── .noether/                   ← Local Workspace Metadata & Cache
│   ├── noether.sqlite          ← Native Rust SQLite database (WAL mode)
│   ├── noether.sqlite-wal      ← SQLite Write-Ahead Log
│   ├── settings.json           ← Vault-specific settings & toggles
│   ├── canvas/                 ← Spatial canvas JSON definitions
│   └── extensions/             ← Locally installed community extensions
├── .trash/                   ← Soft-delete safety folder
├── Projects/
│   ├── Architecture.md
│   └── Roadmap.md
├── Journal/
│   └── 2026-09-12.md
└── Index.md
```

### Physical Ground Truth Invariant
- **Your files are never trapped in a database**: All text, frontmatter, and embedded media live as standard plain-text files on your hard drive.
- **The database is disposable**: If `noether.sqlite` is ever deleted or damaged, Noether automatically scans your markdown files on the next boot and reconstructs the relational index and search catalog in seconds.

## 2. Multi-Vault Agility
---

Noether is engineered for seamless multi-workspace management:

- **Vault Switcher (`Ctrl+Shift+O`)**: Press `Ctrl+Shift+O` or click the workspace name in the top titlebar to open the Vault Switcher modal.
- **Instant Context Switching**: Switch between *Work*, *Personal*, *Research*, or *Client* vaults in milliseconds without restarting the desktop application.
- **Cross-Vault Auto-Discovery**: Noether maintains a system-wide registry of recently opened vaults. External AI tools and the built-in MCP server can discover and search across all known Vaults automatically.

## 3. High-Performance Full-Text Search (SQLite FTS5 + BM25)
---

Finding notes across a library of thousands of documents is instantaneous in Noether.

### Quick Open & File Switching (`Ctrl+K` or `Ctrl+O`)
Press `Ctrl+K` to open the Command Palette and Note Search. Start typing to filter notes instantly by title, folder path, or excerpt matches. When opened with an empty query, it surfaces your 5 most recently modified notes.

### Full-Text Deep Search (`Ctrl+Shift+F`)
Click the **Search** icon in the sidebar or press `Ctrl+Shift+F` for deep body text search across your entire vault.

- **Statistical BM25 Ranking**: Search results are scored using the industry-standard Okapi BM25 ranking algorithm, matching term frequency and inverse document frequency.
- **Diacritics Removal**: Searching for `resume` finds `résumé` automatically via SQLite's `unicode61 remove_diacritics 1` tokenizer.
- **Syntax Filters**:
  - `tag:#architecture`: Restricts results to documents with the specified tag.
  - `path:Projects/`: Restricts search to a specific directory subtree.
  - `"exact phrase"`: Matches literal multi-word strings.

## 4. File Safety & Soft-Delete Recovery (`.trash/`)
---

Accidental file deletion should never result in permanent data loss. Noether implements a **safe soft-delete pipeline**:

1. **Confirmation Prompt**: Triggering note deletion prompts a confirmation dialog explaining where the file will be placed, with a "Don't ask again" choice for instant deletion workflows.
2. **Trash Folder Relocation**: When confirmed, Noether moves the physical `.md` file into the hidden `.trash/` directory inside your Vault.
3. **Metadata Preservation**: Original file paths, timestamps, and document IDs are recorded in the `trash_items` SQLite table.
4. **Restoration**: Deleted notes can be inspected and restored to their original location with a single click in *Settings → File Safety → Trash Bin*.

## 5. Synchronization & Backup Best Practices
---

Because Noether stores plain CommonMark files alongside lightweight SQLite journals, you have complete freedom to choose your synchronization tool:

### Using Git
Git is an ideal synchronization tool for Noether Vaults:
- Notes remain human-readable diffs in commit histories.
- Create a `.gitignore` inside your Vault root:
  ```gitignore
  # Ignore temporary SQLite cache and WAL logs
  .noether/noether.sqlite*
  .noether/*.tmp*
  .trash/
  ```
  *(Noether will automatically regenerate `noether.sqlite` on other machines upon launch).*

### Using Syncthing, iCloud Drive, or Dropbox
- Set your Vault folder directly within your synchronized cloud directory.
- Noether's **atomic temp-and-rename writes** and **echo suppression signatures** prevent file-watcher conflict loops during remote sync updates.
