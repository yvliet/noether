# More icons

Transform icons into first-class visual citizens across files, folders, tabs, and rich-text notes.

---

## 1. Overview & User Experience

Visual cues make browsing a knowledge base faster and more delightful. Recognizing a project by its dedicated icon or spotting a document category at a glance is significantly more intuitive than reading filenames line by line.

The **More icons** extension elevates icons throughout all of Noether. You can assign custom vector icons or emojis to folders, notes, canvases, and tabs, as well as insert inline visual icon chips directly into your Markdown documents.

### Where It Lives in Noether
- **File Explorer**: Custom icons appear beside folder and file names in the left sidebar tree.
- **Tab Bar & Breadcrumbs**: Active note tabs and navigation headers mirror their custom icons dynamically.
- **In-Document Notes**: Type `/icon` anywhere in a note to place inline icon chips.
- **Settings**: Granular feature toggles under **Settings** (`Ctrl+,`) → **More icons**.

## 2. Features & Step-by-Step Guide

### 1. In-Document Icons & `/icon` Slash Command
1. In any note, type `/icon` on any line to open the popup picker beside your cursor.
2. Search through 6,700+ curated HugeIcons or switch tabs to choose Unicode emojis.
3. Click an icon to insert it as an interactive visual chip.
4. **Custom Color**: Click on any inserted icon chip in your note to open a quick color popover.
5. **Clean Markdown Format**: Icons are saved to your `.md` files as clean shortcodes (such as `:hugeicons:sparkles:` or `:emoji:fire:`), guaranteeing zero file corruption.
6. **Deletion**: Pressing `Backspace` behind an icon deletes it cleanly like a single character.

### 2. Customizing Folder & File Icons
1. Right-click any folder, note, or canvas in the left sidebar file tree.
2. Select **Change icon...** from the context menu.
3. Search for an icon, select an optional color tint, and confirm.
4. The icon updates immediately across the file tree, active tabs, and top breadcrumb trail.
5. To reset to the default icon, right-click and select **Reset icon**.

### 3. Settings & Feature Switches

Customize exactly where icons appear from the settings tab:
- **Folder Icons**: Enable or disable custom folder icons in the file tree and breadcrumbs.
- **File Icons**: Enable or disable note, canvas, and document icons in the file tree.
- **In-Document Icons**: Toggle the `/icon` slash command and inline document chips.
- **Default Folder Icons**: Display subtle open and closed folder glyphs next to expandable chevrons.

## 3. Architecture & SDK Blueprint (For Extension Builders)

The More icons extension is the gold standard for full-stack Noether SDK extension engineering, demonstrating UI decorators, TipTap Prosemirror nodes, declarative SQLite tables, and event subscriptions.

### SDK Extension Points Used
- `this.defineTable(schema)`: Declares a persistent SQLite schema managed automatically by the host.
- `this.registerFileTreeDecorator()`: Injects custom icon render callbacks into the core file explorer without modifying native tree components.
- `this.registerTabDecorator()`: Decorates open workspace tabs with custom icon slots.
- `this.registerBreadcrumbDecorator()`: Dynamically decorates top navigation breadcrumb paths.
- `this.registerEditorExtension()`: Injects a custom TipTap inline NodeExtension for parsing and serializing icon shortcodes.
- `this.registerSlashCommand()`: Adds the `/icon` picker command to the editor popover.
- `this.registerFileContextMenuAction()`: Injects "Change icon..." into file and folder right-click menus.
- `this.onEvent('document:deleted')`: Cleans up database records automatically when files or folders are removed.

### Real SDK Implementation Pattern

Here is how an extension builder can define SQLite tables and register custom file tree decorators:

```typescript
import { Extension, NoetherApp } from 'noether';
import React from 'react';

export default class CustomDecoratorsExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Declarative SQLite Schema Registration
    await this.defineTable({
      tableName: 'custom_indicators',
      columns: [
        { name: 'id', type: 'TEXT', primaryKey: true },
        { name: 'item_id', type: 'TEXT', notNull: true, unique: true },
        { name: 'badge_color', type: 'TEXT' },
        { name: 'updated_at', type: 'TEXT', notNull: true },
      ],
      indexes: [
        { name: 'idx_indicators_item', columns: ['item_id'] },
      ],
    });

    // 2. Register File Tree Decorator Slot
    this.registerFileTreeDecorator({
      id: 'custom-status-badge',
      renderIcon: (doc, context) => {
        const badgeColor = this.getBadgeColor(doc.id);
        if (!badgeColor) return null;

        return React.createElement('span', {
          className: 'w-2 h-2 rounded-full shrink-0 mr-1.5',
          style: { backgroundColor: badgeColor },
        });
      },
    });

    // 3. Cleanup on Document Deletion via EventBus
    this.onEvent('document:deleted', async ({ id }) => {
      await this.app.dbManager.delete('custom_indicators', { where: { item_id: id } });
    });
  }
}
```

### Data Flow & Cache Strategy
1. **Memory First**: All icons are loaded into a fast in-memory Zustand store on boot for 0ms synchronous rendering.
2. **Asynchronous SQLite**: Database reads and writes execute non-blockingly via Noether's SQLite engine.
3. **Atomic Broadcast**: Store mutations notify `app.tabDecorators` and the file tree instantly without full UI re-renders.

## 4. MCP Tools Reference

More icons registers four MCP tools for automated workspace customization:

### 1. `more-icons_list`
- **Description**: Returns all folders and files with custom icons assigned.
- **Parameters**:
  - `type` (string, optional): Filter by `all`, `folder`, or `file`.

### 2. `more-icons_get`
- **Description**: Retrieves the custom icon definition and color for a specific item by ID.
- **Parameters**:
  - `itemId` (string, required): Document or folder identifier.

### 3. `more-icons_set`
- **Description**: Assigns a custom icon and optional color tint to a file or folder.
- **Parameters**:
  - `itemId` (string, required): Target document or folder identifier.
  - `iconId` (string, required): Icon identifier (e.g. `sparkles`, `folder-code`).
  - `color` (string, optional): Hex color code (e.g. `#3b82f6`).
  - `itemType` (string, optional): `file` or `folder`.

### 4. `more-icons_remove`
- **Description**: Removes the custom icon from an item, reverting it to the default icon.
- **Parameters**:
  - `itemId` (string, required): Target document or folder identifier.
