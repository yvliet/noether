# Vaults & Workspace Storage

Learn how Noether manages your files on disk, organizes folders, indexes content with SQLite, docks workspace views, and protects your data.

## 1. What is a Vault?
---

A Vault is simply any standard folder on your computer that you open in Noether.

Inside your vault folder, Noether creates a hidden `.noether/` directory to store local settings and the SQLite search index. All your notes are saved as ordinary CommonMark `.md` files directly on your filesystem.

### Vault Manager (`Ctrl+Shift+O`)

You can create, switch, and manage multiple independent vaults:

- **Switch Vaults**: Press `Ctrl+Shift+O` or click the vault name at the bottom of the left sidebar to open the Vault Manager modal.
- **Recent Vaults**: Displays a list of recently opened workspaces with their disk paths, document counts, and last accessed timestamps.
- **Inline Renaming**: Rename vault display names directly within the manager without breaking underlying file paths.
- **Reveal in Explorer**: One-click button to open the vault root in Windows Explorer or macOS Finder.
- **Remove Stale Vaults**: Clean up recent history by removing vaults you no longer use (without deleting files on disk).

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
- **Use Wikilinks over Deep Nesting**: Instead of nesting folders five levels deep, keep folders shallow (1 to 2 levels) and connect related notes using [[Live Preview Editor & Markdown|Wikilinks]].
- **Use Properties for Metadata**: Use note properties (`status: in-progress`, `priority: high`) instead of moving files between status folders (see [[Properties]]).

## 3. File Tree Power Interactions & Multi-Selection
---

Noether provides an unthrottled native file tree with advanced power-user workflows:

- **Multi-Selection**:
  - `Ctrl+Click` (or `Cmd+Click` on macOS) to toggle individual files and folders.
  - `Shift+Click` to select contiguous ranges of items.
  - `Ctrl+A` while focusing the file tree to select all visible items.
- **Batch Clipboard Operations**:
  - Cut (`Ctrl+X`) / Copy (`Ctrl+C`) / Paste (`Ctrl+V`) across single or multi-selected items with instant visual cut dimming.
  - Duplicate (`Ctrl+D`) creates instant copies of selected files and folders.
  - Delete (`Delete` or `Backspace`) moves selected items to the local Trash bin.
- **Sorting Options**: Choose from 6 sorting modes via the header dropdown:
  1. `A → Z` (Alphabetical ascending)
  2. `Z → A` (Alphabetical descending)
  3. `Modified (New → Old)`
  4. `Modified (Old → New)`
  5. `Created (New → Old)`
  6. `Created (Old → New)`
- **Global Collapse & Expand**: Use the global toolbar buttons to collapse or expand all folders in the vault at once. Right-clicking any folder provides contextual "Collapse all subfolders" and "Expand all subfolders" commands.
- **Duplicate Name Safeguard**: Dragging or moving a note into a destination folder that already contains an identical filename triggers a non-destructive safeguard modal, offering to automatically rename the file (e.g. `Note (1).md`) with a "Don't ask again" preference.
- **Desktop Drag & Drop Ingestion**: Drag Markdown notes (`.md`), Whiteboard Canvas files (`.canvas`), plain text files (`.txt`), images, PDFs, or audio/video files directly from Windows File Explorer or macOS Finder into the left sidebar. Dropping onto a folder imports files into that folder; dropping onto the root background imports directly into the vault root.

## 4. Multi-Zone Sidebar Docking & Workspace Layout
---

Noether features a flexible **4-Zone Docking Engine** that lets you arrange notes and extension panels across your workspace:

- **4 Dock Zones**: `left-top`, `left-bottom`, `right-top`, and `right-bottom`.
- **Vertical Sidebar Splitting**: Both the left and right sidebars support vertical splitting with draggable separator bars.
- **Drag-to-Dock**: Drag tabs from the main workspace pane strip or secondary rails directly into any sidebar dock zone.
- **Simultaneous Panes**: Dock notes, file trees, outlines, backlinks, bookmarks, tags, and custom extension views simultaneously side-by-side.
- **Tab Strip Reordering**: Drag and drop tabs inside any dock zone strip to reorder active views.

## 5. Fast Full-Text Search (FTS5)
---

Noether runs an embedded SQLite database using FTS5 (Full-Text Search) to index your notes as you type:

- **Open Search**: Press `Ctrl+Shift+F` or click the search icon in the sidebar.
- **Search Operators**:
  - `tag:#physics`: Search for notes containing a specific tag.
  - `path:Projects/`: Restrict search to notes inside a specific folder.
  - `"exact phrase"`: Search for exact word sequences.
  - `[status:active]`: Search for notes with specific property keys and values.

Search results highlight matching sentences and open the exact paragraph when clicked.

## 6. Atomic Saves & Trash Recovery
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

## 7. Backups and Synchronization
---

Because your vault consists of plain files on disk, backing up and syncing your notes is simple:

- **Git Versioning**: Initialize a Git repository inside your vault folder to version all changes with `git commit`, or use the built-in [[Version History]] extension.
- **Cloud Drives**: You can store your vault in Dropbox, Google Drive, OneDrive, or iCloud Drive.
- **Syncthing**: For private peer-to-peer syncing across computers without third-party servers, point [Syncthing](https://syncthing.net) at your vault directory.
- **Noether Sync**: Use the built-in [[Sync]] extension to synchronize notes to free cloud databases (Turso, Supabase, Cloudflare D1) with optional end-to-end encryption.

