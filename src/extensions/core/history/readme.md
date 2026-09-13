# Version History

Travel back in time to inspect earlier drafts, compare changes with clean visual diffs, and safely restore previous versions of your notes.

---

## 1. Overview & User Experience

Writing is an iterative journey. As you refine essays, update project roadmaps, or brainstorm ideas, you often want to look back at yesterday's draft or recover an idea you removed an hour ago.

The **Version History** extension turns your notes into a personal time machine. Every time you write, Noether automatically captures lightweight revision checkpoints directly on your computer using standard Git.

### Where It Lives in Noether
- **Right Sidebar Panel**: Click the clock icon in the right sidebar (or press `Ctrl+Shift+H`) to open the note history timeline.
- **Note Header Action**: A history clock icon appears in the document sub-header of every active note for instant inspection.
- **Command Palette**: Run "Open Note History" (`Ctrl+Shift+H`) or "Take snapshot now" via `Ctrl+K`.
- **Settings**: Adjust snapshot delay intervals and timeline limits under **Settings** (`Ctrl+,`) → **Version History**.

### Why Local Git Under the Hood
- **Zero Cloud Lock-In**: Your revisions live directly inside your vault in standard Git format. There are no proprietary databases, no remote server dependencies, and zero monthly subscriptions.
- **Effortless Privacy**: Your drafts never leave your device unless you choose to back them up.
- **Seamless Synergy with Sync**: Works naturally alongside the built-in Cloud Sync extension and community Git sync tools. When changes sync across devices, local snapshots keep a safety trail so you can always undo an accidental overwrite or collision.

## 2. Features & Step-by-Step Guide

### 1. Enabling History in Your Vault
1. Open any note in Noether.
2. Open the right sidebar and switch to the **History** tab (or press `Ctrl+Shift+H`).
3. If Git is installed on your computer, click **Enable History**. Noether provisions a clean local repository with an automatic `.gitignore` tailored for your vault (ignoring `.trash/` and temporary workspace caches).

### 2. Viewing Diffs & Timeline
1. Open the **History** tab in the right sidebar.
2. Browse through the chronological list of drafts. Each entry displays a human-readable timestamp (`"Just now"`, `"10m ago"`, `"Yesterday, 3:15 PM"`), a clean non-monospace commit hash, and a dimmed draft counter showing revision count.
3. Click any draft to inspect changes.
4. Toggle between **Diff** and **Draft** view:
   - **Diff View**: Displays color-coded additions in soft emerald green and deletions in muted rose relative to your current note state.
   - **Draft View**: Shows the complete historical document text at that moment in time, with a 1-click button to copy text directly to your clipboard.

### 3. One-Click Safe Restoration
1. When viewing a historical draft in the detail inspector, click **Restore draft**.
2. Noether automatically captures an instant safety checkpoint of your current document first.
3. The note content updates immediately on disk and in the live editor canvas, with zero data loss or application reloads.

### 4. Smart Automatic Snapshots & Settings
- Noether quietly monitors your typing pauses.
- When you stop typing after saving, Version History records an automatic snapshot.
- Customize your workflow under **Settings** (`Ctrl+,`) → **Version History**:
  - **Automatic Snapshots**: Toggle background auto-checkpoints on or off.
  - **Snapshot Delay**: Fine-tune the typing pause duration (1 to 30 seconds) using the smooth settings slider.
  - **History Limit**: Adjust maximum timeline revisions displayed per note (10 to 200 drafts).

### 5. Keyboard Shortcuts & Commands

| Action | Shortcut / Access | Description |
| :--- | :--- | :--- |
| **Open Note History** | `Ctrl+Shift+H` | Opens the right sidebar and activates the Version History tab. |
| **Take Snapshot Now** | Command Palette (`Ctrl+K`) | Creates an immediate version snapshot of the active note. |
| **Enable in Vault** | Command Palette (`Ctrl+K`) | Initializes local Git tracking inside the active vault root. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Version History extension demonstrates how to expose headless desktop VCS capabilities, register sidebar inspector panels, listen to reactive document save events, and integrate 1-click rollbacks via the Noether SDK.

### Dynamic Manifest-Driven Icon & Gradient
Extension icons are declared declaratively in `manifest.json` without hardcoded host registration:

```json
{
  "id": "history",
  "name": "Version History",
  "version": "1.0.0",
  "description": "Travel back in time to view earlier drafts, compare changes with clean visual diffs, and safely restore previous versions of your notes.",
  "icon": {
    "name": "history",
    "type": "gradient",
    "gradientColors": ["#0ea5e9", "#0284c7"],
    "gradientDirection": "135deg"
  }
}
```

### SDK Extension Points Used
- `this.registerSidebarTab()`: Registers the Version History timeline tab in the right sidebar (`order: 25`).
- `this.registerDocumentHeaderAction()`: Adds a quick-access clock button in the note sub-header.
- `this.addCommand()`: Registers hotkeys (`Ctrl+Shift+H`) and command palette actions.
- `this.registerSettingTab()`: Mounts repository configuration, auto-save toggles, and slider controls.
- `this.registerTool()`: Exposes 4 MCP AI tools for programmatic history queries and file rollbacks.
- `this.onEvent('document:saved')`: Listens to editor save events to schedule debounced background checkpoints.

### Real SDK Implementation Pattern

Extension builders can interact with vault version control and register inspector panels with this SDK pattern:

```typescript
import { Extension, NoetherApp } from 'noether';
import React from 'react';

export default class CustomHistoryExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Register Right Sidebar Inspector Panel
    this.registerSidebarTab({
      id: 'history',
      title: 'Version History',
      icon: <ClockIcon size={14} />,
      side: 'right',
      order: 25,
      render: () => <HistoryTimelineView />,
    });

    // 2. Register Document Header Action Button
    this.registerDocumentHeaderAction({
      id: 'open-history',
      title: 'Version history',
      icon: () => <ClockIcon size={14} />,
      onClick: () => {
        this.app.workspace.setActiveSidebarTab('right', 'history');
      },
    });

    // 3. Listen to Document Save Events for Debounced Snapshots
    this.registerEvent(
      this.app.workspace.eventBus.on('document:saved', async ({ path }) => {
        if (path) {
          await this.app.vcs.createSnapshot(path, 'Auto snapshot');
        }
      })
    );
  }
}
```

### Headless Git Architecture
1. **Rust Tauri Command Layer**: Executes native Git commands with `CREATE_NO_WINDOW` on Windows to suppress console popups.
2. **Vault Path Containment**: Validates all file targets with `is_safe_vault_path` to prevent path traversal outside the vault.
3. **Suppressed Write Echoes**: Writes historical file restorations with internal timestamps to prevent the file watcher from spamming redundant reload cycles.

## 4. MCP Tools Reference

Version History registers four MCP tools for agentic inspection and file restoration:

### 1. `history_get_file_history`
- **Description**: Retrieves chronological Git commit log items for a specific file.
- **Parameters**:
  - `path` (string, required): Relative path to the file inside the vault.
  - `limit` (number, optional): Maximum revisions to return (default: 50).
- **Returns**: Array of commit revisions with hash, shortHash, author, timestamp, and message.

### 2. `history_get_file_diff`
- **Description**: Returns unified Git diff text comparing revisions or working tree changes.
- **Parameters**:
  - `path` (string, required): Relative file path.
  - `commitHash` (string, optional): Specific commit hash to compare against.
- **Returns**: Formatted unified diff string.

### 3. `history_restore_file_version`
- **Description**: Safely restores a file to a previous Git revision.
- **Parameters**:
  - `path` (string, required): Relative path to the file.
  - `commitHash` (string, required): The target commit hash to restore.
- **Returns**: Status confirmation payload with success boolean and restored revision details.

### 4. `history_create_file_snapshot`
- **Description**: Stages and commits the target file or vault immediately with a message.
- **Parameters**:
  - `path` (string, required): File path or empty string for all changes.
  - `message` (string, optional): Commit message for the snapshot.
- **Returns**: Snapshot confirmation payload with commit status and hash.
