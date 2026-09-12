# Default Workspace Commands

Essential keyboard shortcuts, navigation commands, and workspace actions for Noether.

---

## 1. Overview & User Experience

The **Default Workspace Commands** extension equips Noether with universal keyboard controls and populates the central Command Palette (`Ctrl+K` / `Ctrl+P`).

Whether you prefer keyboard-first navigation or quick menu access, this extension provides the foundational controls for creating notes, toggling sidebars, adjusting zoom, navigating document history, and formatting Markdown without reaching for a mouse.

### Where It Lives in Noether
- **Command Palette**: Press `Ctrl+K` (or `Ctrl+P`) anywhere in the app to open the quick-action command modal.
- **Global Hotkeys**: Dedicated shortcuts trigger actions instantly across both desktop and web versions.
- **Settings**: Hotkey bindings and preferences can be reviewed under **Settings** (`Ctrl+,`) → **Default Commands**.

## 2. Features & Step-by-Step Guide

### 1. The Command Palette (`Ctrl+K` / `Ctrl+P`)
1. Press `Ctrl+K` to open the Command Palette overlay.
2. Start typing any keyword (such as "new", "sidebar", "zoom", or "heading") to filter commands in real time with fuzzy matching.
3. Use the `Up` and `Down` arrow keys to highlight an action, then press `Enter` to execute it immediately.
4. Press `Escape` at any time to dismiss the palette.

### 2. Core Workspace Shortcuts

| Action | Shortcut | Description |
| :--- | :--- | :--- |
| **New Note** | `Ctrl+N` | Instantly creates an untitled note in the active folder and focuses the editor. |
| **Command Palette** | `Ctrl+K` / `Ctrl+P` | Opens the fuzzy-search action palette. |
| **Open Settings** | `Ctrl+,` | Opens the preferences modal to customize themes, hotkeys, and extensions. |
| **Toggle Left Sidebar** | `Ctrl+\\` | Shows or collapses the left file tree, tags, and bookmarks drawer. |
| **Toggle Right Sidebar** | `Ctrl+Shift+\\` | Shows or collapses the right inspector panel (Outline, Properties, Backlinks). |
| **Zoom In / Out / Reset** | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` | Scales the UI interface smoothly between 70% and 150%. |
| **Back / Forward History** | `Alt+Left` / `Alt+Right` | Navigates backward and forward through your note browsing history. |

### 3. Editor Formatting Shortcuts

- **Headings 1-6**: `Ctrl+Alt+1` through `Ctrl+Alt+6` quickly formats the current paragraph as an H1 to H6 heading.
- **Task Item**: Converts the current line into an interactive checklist checkbox (`- [ ]`).
- **Bullet & Numbered Lists**: Formats bullet points and sequential numbered outlines.
- **Callout Blocks**: Wraps selection in clean Markdown callouts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`).

## 3. Architecture & SDK Blueprint (For Extension Builders)

This extension serves as the primary reference implementation for registering custom commands and hotkeys via the Noether SDK.

### SDK Extension Points Used
- `this.addCommand(definition)`: Registers an action in the Command Palette and binds global hotkey listeners.
- `this.registerSettingTab(tab)`: Adds a settings section to customize hotkeys.
- `this.app.workspace`: Controls active tabs, sidebars, and split views.
- `this.app.vault`: Creates and opens Markdown notes on disk.

### Real SDK Implementation Pattern

Extension builders can add their own commands to the Command Palette with section groupings, icons, and hotkey combinations:

```typescript
import { Extension, NoetherApp } from 'noether';
import React from 'react';

export default class QuickActionExtension extends Extension {
  async onload(): Promise<void> {
    // Register a grouped command in the Command Palette
    this.addCommand({
      id: 'quick-scratchpad',
      title: 'Open Daily Scratchpad',
      section: 'Productivity',
      hotkey: 'Ctrl+Shift+X',
      action: async (app: NoetherApp) => {
        // Switch view and open note programmatically
        app.workspace.setMainViewMode('document');
        const scratchNote = await app.vault.getOrCreateNote('Scratchpad.md');
        await app.workspace.openDocumentTab(scratchNote.id);
        app.workspace.showToast('Scratchpad opened', 'info');
      },
    });

    // Register a secondary editor command
    this.addCommand({
      id: 'insert-timestamp',
      title: 'Insert Current ISO Timestamp',
      section: 'Editor',
      hotkey: 'Ctrl+Alt+T',
      action: (app: NoetherApp) => {
        const now = new Date().toISOString();
        app.editor.insertText(now);
      },
    });
  }

  async onunload(): Promise<void> {
    // Commands registered via this.addCommand are automatically cleaned up
  }
}
```

### Command Dispatch Lifecycle
1. **Registration**: `this.addCommand()` normalizes hotkeys across Windows (`Ctrl`) and macOS (`Cmd`).
2. **Keyboard Listener**: Global `keydown` handlers match active key chords against the command registry before event propagation.
3. **Execution**: The command callback receives the active `NoetherApp` instance with zero UI lag or artificial frame delay.

## 4. MCP Tools & Command Automation

Default workspace commands can also be triggered programmatically by AI workflows and automated scripts through host workspace APIs:
- `workspace.createDocument`: Programmatic note creation.
- `workspace.toggleLeftSidebar`: Workspace drawer control.
- `workspace.setMainViewMode`: Mode switching between editor, graph, canvas, and tasks.
