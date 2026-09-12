# Journal & Periodic Logging

Calendar-based daily note creation, template pre-filling, and continuous journaling.

---

## 1. Overview & User Experience

Daily notes serve as the morning launchpad and evening debrief for productive thinkers. Capturing daily priorities, meeting logs, fleeting thoughts, and habits should take zero friction.

The **Journal** extension gives you instant, 1-click access to date-stamped notes (such as `2026-09-13.md`). If today's note already exists, Noether jumps straight to it; if it doesn't, Noether creates it instantly inside your designated journal folder and pre-fills your custom Markdown template.

### Where It Lives in Noether
- **Left Action Rail**: Click the calendar icon (or press `Ctrl+Shift+D`) to open today's journal note.
- **Command Palette**: Run actions for today's, yesterday's, or tomorrow's journal.
- **Settings**: Configure date formats, folder locations, templates, and startup options under **Settings** (`Ctrl+,`) → **Journal**.

## 2. Features & Step-by-Step Guide

### 1. Opening Today's Journal
1. Click the **Calendar** icon on the Left Action Rail (or press `Ctrl+Shift+D`).
2. Noether resolves the date string for today, creates or finds the note, and opens it in the editor.
3. If configured, Noether populates your custom template with pre-built task lists, headings, and morning check-ins.

### 2. Navigating Yesterday & Tomorrow
Press `Ctrl+K` and type "Journal" to access relative date commands:
- **Open Yesterday's Journal**: Useful during morning standups to review yesterday's unfinished tasks.
- **Open Tomorrow's Journal**: Great for end-of-day planning and scheduling future items.

### 3. Date Formatting Tokens & Folders
Configure your journal schema in Settings:
- **Date Format Tokens**: `YYYY-MM-DD` (default), `YYYY/MM/DD`, `MMMM D, YYYY`, or `dddd, DD MMMM YYYY`.
- **Target Folder**: Set a dedicated directory (e.g. `Journal` or `Daily Notes`). Noether automatically creates missing subfolders on demand.
- **Open on Startup**: Automatically opens today's journal whenever you launch Noether.

### 4. Keyboard Shortcuts & Commands

| Action | Shortcut | Description |
| :--- | :--- | :--- |
| **Open Today's Journal** | `Ctrl+Shift+D` | Opens or creates the daily note for the current calendar date. |
| **Yesterday's Journal** | Command Palette | Navigates to the note for the previous calendar day. |
| **Tomorrow's Journal** | Command Palette | Navigates to the note for the following calendar day. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Journal extension showcases how to implement date-driven vault workflows, register Left Action Rail icons, hook into application startup events, and manipulate TipTap documents via the Noether SDK.

### SDK Extension Points Used
- `this.addActionRailIcon()`: Registers an action rail icon with custom tooltip and shortcut badge.
- `this.addCommand()`: Registers palette commands for relative date offsets.
- `this.onEvent('vault:loaded')`: Listens for initial vault hydration before running startup routines.
- `this.registerSettingTab()`: Registers options for date format strings, templates, and startup behavior.
- `this.registerTool()`: Exposes MCP AI tools for creating and appending journal entries.

### Real SDK Implementation Pattern

Extension builders can implement date-based note automation using this SDK pattern:

```typescript
import { Extension, NoetherApp } from 'noether';

export default class DailyReviewExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Add Action Rail Shortcut
    this.addActionRailIcon(
      'daily-review-action',
      <CalendarCheckIcon size={16} />,
      "Today's Standup (Ctrl+Shift+D)",
      async (app: NoetherApp) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const note = await app.vault.getOrCreateNote(`Daily/${todayStr}.md`);
        await app.workspace.openDocumentTab(note.id);
      },
      45
    );

    // 2. Automated Action on Vault Load
    this.onEvent('vault:loaded', async () => {
      const openOnStartup = this.app.settings.get('daily:startup');
      if (openOnStartup) {
        // Execute startup routine safely after vault index is ready
      }
    });
  }
}
```

## 4. MCP Tools Reference

Journal registers three MCP tools enabling AI agents to log and manage periodic notes:

### 1. `journal_open_today`
- **Description**: Opens or creates today's daily journal note according to configured preferences.
- **Parameters**: None.
- **Returns**: Object with note `id`, `title`, and folder `parent_id`.

### 2. `journal_open_date`
- **Description**: Opens or creates a daily note for a specific ISO date string.
- **Parameters**:
  - `date` (string, required): Target date formatted as `YYYY-MM-DD` (e.g. `2026-09-13`).
- **Returns**: Object with note `id`, `title`, and folder `parent_id`.

### 3. `journal_append_entry`
- **Description**: Appends text content directly to today's daily journal note without replacing existing text.
- **Parameters**:
  - `text` (string, required): Paragraph text or bullet items to append.
- **Returns**: Confirmation payload with operation success status.
