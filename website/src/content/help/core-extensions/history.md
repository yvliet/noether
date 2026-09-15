# Version History

Version History tracks local snapshots of your notes as you edit, allowing you to inspect changes side-by-side and restore earlier drafts at any time.

## 1. Overview
---

Noether automatically records snapshots of modified documents every few minutes while you type. Revisions are stored locally inside `.noether/history/` without relying on cloud servers or external Git setups.

## 2. View Note History
---

1. Open the note you want to inspect.
2. Click the note options menu (`...`) in the top right of the editor.
3. Select **Version history** (or run `Command Palette → History: View note history`).
4. A side-by-side diff viewer opens showing chronological revision snapshots.

## 3. Compare and Restore Revisions
---

- **Side-by-Side Diff**: Highlights additions in green and deletions in red.
- **Unified Diff View**: Switch between split-pane diff and single-column inline diff.
- **Restore Revision**: Click **Restore this version** to overwrite the current editor buffer with the selected snapshot.
- **Copy Text**: Select and copy specific paragraphs from older snapshots without rolling back the entire file.

## 4. Retention and Storage Settings
---

Open **Settings (`Ctrl+,`) → Version History** to customize snapshot behavior:

- **Auto-Snapshot Interval**: Configure how often snapshots are saved (default: every 5 minutes during active edits).
- **Max Snapshot Age**: Automatically purge snapshots older than 30, 60, or 90 days to conserve disk space.
- **Exclude Folders**: Skip tracking temporary directories or scratch notes.

## 5. Keyboard Shortcuts & Commands
---

| Command | Action |
| :--- | :--- |
| `Command Palette → History: View note history` | Open history viewer for active note |
| `Command Palette → History: Create manual snapshot` | Force save a snapshot checkpoint |

> [!NOTE]
> History snapshots are purely local. If you sync your vault with Git or cloud storage, your revision files remain private in `.noether/history/`.
