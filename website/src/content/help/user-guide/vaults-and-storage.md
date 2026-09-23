# Vaults & Storage

Learn how Noether stores your notes on disk, organizes folders, protects your data with atomic saves, and recovers deleted files.

## 1. What is a Vault?
---

A Vault is simply any standard folder on your computer that you open in Noether.

Inside your vault folder, Noether creates a hidden `.noether/` directory to store local preferences and search indexes. All your notes are saved as ordinary CommonMark `.md` files directly on your filesystem. If you ever stop using Noether, your notes remain completely accessible in any text editor.

### Vault Manager (`Ctrl+Shift+O`)

You can create, switch, and manage multiple independent vaults:

- **Switch Vaults**: Press `Ctrl+Shift+O` (or `Cmd+Shift+O` on macOS) or click the vault name at the bottom of the left sidebar to open the Vault Manager modal.
- **Recent Vaults**: Displays a list of recently opened workspaces with their disk paths and document counts.
- **Inline Renaming**: Rename vault display names directly within the manager without changing underlying folder paths on disk.
- **Reveal in Explorer**: One-click button to open the vault root folder in Windows File Explorer or macOS Finder.
- **Remove Stale Vaults**: Clean up recent history by removing vaults you no longer use (without deleting any files on disk).

## 2. Organizing Folders and Notes
---

You have total flexibility over your file hierarchy. Here is a practical, tested folder structure for keeping your vault tidy:

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
- **Use Wikilinks over Deep Nesting**: Instead of nesting folders five levels deep, keep folders shallow (1 to 2 levels) and connect related notes using [[Basic Formatting|Wikilinks]].
- **Use Properties for Metadata**: Use note properties (`status: in-progress`, `priority: high`) instead of moving files between status folders (see [[Properties]]).

## 3. Atomic Saves & Trash Recovery
---

Noether protects your files against data corruption and accidental loss:

- **Atomic File Writes**: Saves write to a temporary file first before executing an atomic OS rename. If your computer shuts down or power cuts out mid-save, your notes are never left half-written.
- **Local Trash Bin (`.trash/`)**: When you delete a note, Noether moves it to `.trash/` inside your vault instead of permanently destroying it.
- **Trash Inspector (`Settings → Files & Links → Trash`)**:
  - View all soft-deleted notes with their original paths and deletion timestamps.
  - Filter and search deleted notes by name or content.
  - Preview deleted markdown content before taking action.
  - **Restore**: Reinstates the file back to its original parent folder path.
  - **Empty Trash**: Permanently purges all files in `.trash/` to free disk space.

## 4. Backups and Synchronization
---

Because your vault consists of plain files on disk, backing up and syncing your notes is simple:

- **Git Versioning**: Initialize a Git repository inside your vault folder to version all changes with `git commit`, or use the built-in [[Version History]] extension.
- **Cloud Drives**: You can store your vault in Dropbox, Google Drive, OneDrive, or iCloud Drive.
- **Syncthing**: For private peer-to-peer syncing across computers without third-party servers, point [Syncthing](https://syncthing.net) at your vault directory.
- **Noether Sync**: Use the built-in [[Sync]] extension to synchronize notes to free cloud databases (Turso, Supabase, Cloudflare D1) with optional end-to-end encryption.

## 5. Next Steps
---

- Arrange your panels and search notes in [[Workspace Layout & Docking]].
- Master keyboard controls with [[Keyboard Shortcuts & Commands]].
- Start writing and formatting with [[Editor]] and [[Basic Formatting]].
