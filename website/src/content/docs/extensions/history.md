# Version History

Local revision tracking for notes using an embedded Git repository inside `.noether/history/`.

## 1. Overview
---

Version History automatically creates local snapshots of your notes as you edit. It uses standard Git under the hood, but runs entirely inside your vault directory without requiring external Git credentials or cloud accounts.

- **Local Storage**: Snapshots are saved to `.noether/history/` inside the active vault.
- **Automatic Checkpoints**: A lightweight commit is made a few seconds after you stop typing following a document save.
- **Visual Diffs**: Inspect additions in green and deletions in red in split-pane or inline mode.
- **Safe Restores**: Restoring an earlier draft creates a quick safety checkpoint of your active note first, so you can always undo a rollback.

## 2. Architecture & Storage
---

When enabled in a vault, Version History initializes a local Git repository:

- **Isolated Tracking**: The extension creates a `.gitignore` inside the vault to keep temporary caches and `.trash/` out of version history.
- **Background Operations**: Git staging, commits, and diff parsing run via the native Tauri backend, preventing UI freezes while writing large notes.
- **Sync Protection**: If you use Cloud Sync or external file sync tools, local history acts as a safety net. If a remote sync conflict ever overwrites a note, your previous local edits remain accessible in the history timeline.

## 3. Keyboard Shortcuts & Configuration
---

- **Open History Panel**: Press `Ctrl+Shift+H` or click the clock icon in the right sidebar.
- **Manual Snapshot**: Run `History: Take snapshot now` from `Ctrl+K`.

In **Settings (`Ctrl+,`) → Version History**, you can configure:

- **Typing Pause Delay**: How long to wait after you stop typing before capturing a snapshot (default: 5 seconds).
- **History Limit**: Maximum number of drafts to keep in the timeline (default: 50).
- **Auto-Snapshots**: Toggle whether background snapshots run automatically while writing.

