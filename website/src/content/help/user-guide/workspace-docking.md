# Workspace Layout & Docking

Noether features a flexible docking engine that lets you arrange notes, file trees, and tools side-by-side across your screen.

## 1. 4-Zone Sidebar Docking
---

Noether provides 4 customizable dock zones around your main editor:

- **Dock Zones**: `left-top`, `left-bottom`, `right-top`, and `right-bottom`.
- **Vertical Sidebar Splitting**: Both the left and right sidebars can be split vertically with draggable divider bars.
- **Drag-to-Dock**: Click and drag tabs from the main workspace pane or secondary rails directly into any sidebar zone.
- **Simultaneous Views**: Keep your file tree, note outlines, backlinks, bookmarks, and tags visible at the same time without jumping between menus.
- **Tab Reordering**: Drag tabs inside any dock strip to organize your active panels.

## 2. File Tree Controls & Multi-Selection
---

Manage files and folders in the left sidebar with fast mouse and keyboard tools:

- **Multi-Selection**:
  - `Ctrl+Click` (or `Cmd+Click` on macOS) to select multiple individual notes and folders.
  - `Shift+Click` to select a contiguous group of files.
  - `Ctrl+A` while focusing the file tree to select everything in the active view.
- **Batch Clipboard Actions**:
  - Cut (`Ctrl+X`), Copy (`Ctrl+C`), and Paste (`Ctrl+V`) across selected items with instant visual dimming.
  - Duplicate (`Ctrl+D`) creates instant copies of selected files.
  - Delete (`Delete` or `Backspace`) moves selected items to the local Trash folder.
- **Sorting Options**: Choose how your files are ordered via the sidebar header:
  - Alphabetical (`A → Z` or `Z → A`)
  - By Date Modified (`New → Old` or `Old → New`)
  - By Date Created (`New → Old` or `Old → New`)
- **Drag & Drop Ingestion**: Drag files directly from your computer's desktop, File Explorer, or Finder into the sidebar. Dropping onto a folder imports them into that directory; dropping onto empty space places them in the vault root.

## 3. Searching Notes (`Ctrl+Shift+F`)
---

Find any note or keyword instantly across your entire vault:

- **Open Search**: Press `Ctrl+Shift+F` (or `Cmd+Shift+F` on macOS) or click the magnifying glass in the sidebar.
- **Search Operators**:
  - `tag:#physics`: Find notes that contain a specific tag.
  - `path:Projects/`: Limit search results to a specific folder.
  - `"exact phrase"`: Search for an exact sequence of words in quotes.
  - `[status:active]`: Search for notes with specific property keys and values.

Clicking any search result highlights the matching phrase and jumps directly to that paragraph in your note.

## 4. Next Steps
---

- Learn about folder storage and vault backups in [[Vaults & Storage]].
- Master keyboard shortcuts with [[Keyboard Shortcuts & Commands]].
- Explore visual boards with [[Canvas]] and [[Graph View]].
