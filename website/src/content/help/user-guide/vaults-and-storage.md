# Vaults & Workspace Storage

Learn how Noether manages your files on disk, organizes folders, indexes content with SQLite, and protects your data.

## 1. What is a Vault?
---

A Vault is simply any standard folder on your computer that you open in Noether.

Inside your vault folder, Noether creates a hidden `.noether/` directory to store local settings and the SQLite search index. All your notes are saved as ordinary CommonMark `.md` files directly on your filesystem.

## 2. Organizing Folders and Notes
---

You have total flexibility over your file hierarchy. Here is a practical, tested folder structure for keeping your vault organized:

```
My-Vault/
├── Life/                       ← Broad personal domains
│   ├── Personal/
│   │   └── Goals.md
│   └── Finances/
├── Projects/                   ← Active projects with clear end goals
│   ├── Website Redesign/
│   │   ├── Tasks.md
│   │   └── Research.md
│   └── Book Launch/
├── Areas/                      ← Long-term areas of responsibility
│   ├── Engineering/
│   └── Design/
├── Resources/                  ← Reference material, cheat sheets, bookmarks
│   └── Linux Commands.md
└── Journal/                    ← Daily reflection notes
    └── 2026-09-16.md
```

### Tips for Clean Organization

- **Limit Root Files**: Keep your vault root directory clean by grouping notes into broad top-level topic folders (such as `Life/`, `Projects/`, `Resources/`).
- **Use Wikilinks over Deep Nesting**: Instead of nesting folders five levels deep, keep folders shallow (1 to 2 levels) and connect related notes using `[[Wikilinks]]`.
- **Use Properties for Metadata**: Use note properties (`status: in-progress`, `priority: high`) instead of moving files between status folders.

## 3. Fast Full-Text Search (FTS5)
---

Noether runs an embedded SQLite database using FTS5 (Full-Text Search) to index your notes as you type:

- **Open Search**: Press `Ctrl+Shift+F` or click the search icon in the sidebar.
- **Search Operators**:
  - `tag:#physics`: Search for notes containing a specific tag.
  - `path:Projects/`: Restrict search to notes inside a specific folder.
  - `"exact phrase"`: Search for exact word sequences.
  - `[status:active]`: Search for notes with specific property keys and values.

Search results highlight matching sentences and open the exact paragraph when clicked.

## 4. Atomic Saves & Trash Bin
---

Noether protects your files against data corruption:

- **Atomic File Writes**: Saves write to a temporary file first before executing an atomic OS rename. If your computer shuts down or power cuts out mid-save, your notes are never left half-written.
- **Local Trash Bin**: When you delete a note, Noether moves it to `.trash/` inside your vault instead of permanently destroying it. You can inspect or restore deleted files anytime in **Settings (`Ctrl+,`) → Trash**.

## 5. Backups and Synchronization
---

Because your vault consists of plain files on disk, backing up and syncing your notes is simple:

- **Git Versioning**: Initialize a Git repository inside your vault folder to version all changes with `git commit`.
- **Cloud Drives**: You can store your vault in Dropbox, Google Drive, OneDrive, or iCloud Drive.
- **Syncthing**: For private peer-to-peer syncing across computers without third-party servers, point Syncthing at your vault directory.
- **Noether Sync**: Use the built-in [[Sync]] extension to synchronize notes to free cloud databases (Turso, Supabase, Cloudflare D1) with optional end-to-end encryption.
