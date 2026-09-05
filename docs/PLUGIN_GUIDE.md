# Flint Plugin Developer Guide

Welcome to the **Flint Plugin Ecosystem**! Flint is built with a micro-kernel architecture where both internal features and community additions are structured as modular plugins.

---

## 1. Quick Start: Creating Your First Plugin

Plugins reside in your vault's `.flint/plugins/<plugin-id>/` directory:

```
<My-Vault>/
  .flint/
    plugins/
      word-counter/
        manifest.json
        main.js
        styles.css (optional)
```

### `manifest.json`
```json
{
  "id": "word-counter",
  "name": "Live Reading Time Counter",
  "version": "1.0.0",
  "minAppVersion": "0.1.0",
  "description": "Calculates estimated reading time for your active note in the status bar.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet"
}
```

### `main.js`
```javascript
const { Plugin } = require('flint');

module.exports = class ReadingTimePlugin extends Plugin {
  async onload() {
    console.log('Reading Time Plugin loaded!');

    // 1. Add Ribbon Action Icon
    this.addRibbonIcon(
      'reading-time-icon',
      '⏱️',
      'Calculate Reading Time',
      (app) => {
        const words = app.vault.activeDocument?.title || '';
        app.workspace.showToast(`Active Note: ${words}`, 'info');
      }
    );

    // 2. Add Command to Command Palette (Ctrl+K)
    this.addCommand({
      id: 'show-reading-time',
      title: 'Show estimated reading time',
      hotkey: 'Ctrl+Shift+U',
      action: (app) => {
        app.workspace.showToast('Estimated reading time: ~2 mins', 'success');
      }
    });

    // 3. Add Live Status Bar Widget
    this.addStatusBarItem({
      id: 'reading-time-widget',
      alignment: 'right',
      render: (app) => {
        return React.createElement(
          'span',
          { className: 'text-[#888] cursor-default' },
          '📖 ~2 min read'
        );
      }
    });

    // 4. Listen to Workspace Events
    this.app.events.on('document:saved', (data) => {
      console.log('Note saved:', data.title);
    });
  }

  onunload() {
    console.log('Reading Time Plugin unloaded!');
    // All UI elements and event listeners registered via this.add* are cleaned up automatically!
  }
};
```

---

## 2. Plugin Extension Points

### A. Ribbon Icons
```javascript
this.addRibbonIcon(id, iconElementOrSvg, tooltipTitle, (app) => { ... }, orderIndex);
```

### B. Command Palette (`Ctrl+K`)
```javascript
this.addCommand({
  id: 'my-custom-command',
  title: 'Insert Date Stamp',
  section: 'Editing',
  hotkey: 'Ctrl+Alt+D',
  action: (app) => {
    // perform command
  }
});
```

### C. Status Bar Items
```javascript
this.addStatusBarItem({
  id: 'my-status-item',
  alignment: 'right', // 'left' or 'right'
  order: 15,
  render: (app) => {
    return React.createElement('div', null, 'My Status');
  }
});
```

### D. Custom Tab Views & Panes
```javascript
this.registerView({
  type: 'my-custom-view',
  title: 'Kanban Board',
  render: ({ app }) => {
    return React.createElement('div', { className: 'p-6' }, 'Hello Kanban!');
  }
});
```

### E. Persistent Plugin Settings
```javascript
// Load saved JSON settings
const config = await this.loadData() || { mySetting: true };

// Save updated JSON settings
await this.saveData({ mySetting: false });
```

### F. Settings Preferences Tab
```javascript
this.registerSettingTab({
  id: 'my-plugin-settings',
  name: 'Word Counter',
  render: () => {
    return React.createElement('div', null, 'Configure word counter rules...');
  }
});
```

### G. Custom Context Menu Items (Right-Click)
Plugins can register items directly into Flint's lightweight custom context menus for various scopes:
- `'file-tree'`: Right-clicking files or folders in the sidebar.
- `'file-tree-root'`: Right-clicking empty background space in the file tree.
- `'editor'`: Right-clicking inside the document editor or selection.
- `'tab'`: Right-clicking open tabs in the window header.
- `'bookmark'`: Right-clicking bookmarked items.
- `'universal'`: Appears in all context menus.

```javascript
this.registerContextMenuItem({
  id: 'my-file-action',
  title: 'Export as Markdown Slide...',
  scope: 'file-tree',
  icon: '📽️',
  isVisible: (app, file) => !file?.is_folder,
  onClick: (app, file) => {
    app.workspace.showToast(`Exporting ${file.title} as slide presentation...`, 'info');
  }
});

// Context menu item with nested submenu in editor:
this.registerContextMenuItem({
  id: 'my-editor-tools',
  title: 'Text Transformation',
  scope: 'editor',
  submenu: [
    {
      id: 'uppercase',
      title: 'UPPERCASE Selection',
      onClick: (app, { editor, selectedText }) => {
        if (editor && selectedText) {
          editor.chain().focus().insertContent(selectedText.toUpperCase()).run();
        }
      }
    },
    {
      id: 'lowercase',
      title: 'lowercase selection',
      onClick: (app, { editor, selectedText }) => {
        if (editor && selectedText) {
          editor.chain().focus().insertContent(selectedText.toLowerCase()).run();
        }
      }
    }
  ]
});
```

### H. Dynamic React Portal Slots
Mount React components into built-in layout slots (`workspace:root`, `editor:minimap`, `editor:viewport-overlay`, `editor:floating-toolbar`):

```javascript
this.registerPortalSlot({
  id: 'my-floating-badge',
  slot: 'editor:floating-toolbar',
  order: 10,
  when: (ctx) => ctx.viewMode === 'Visible',
  render: (ctx) => {
    return React.createElement('div', { className: 'badge' }, 'Active Note');
  }
});
```

### I. Native ProseMirror & TipTap Extensions
Register transaction-mapped ProseMirror plugins, input rules, paste rules, or custom shortcuts without degrading typing latency:

```javascript
this.registerEditorPlugin({
  id: 'my-mention-decorator',
  decorations: (state, ctx) => {
    // Return DecorationSet mapped efficiently on keystrokes
    return null;
  },
  shortcuts: {
    'Mod-Alt-m': (editor) => {
      editor.chain().focus().insertContent('@').run();
      return true;
    }
  }
});
```

### J. Declarative SQLite Tables & Dynamic Migrations
Define typed SQLite tables with automatic column migrations, version tracking, and cascade deletions when notes are deleted:

```javascript
this.myTable = await this.defineTable({
  tableName: 'my_plugin_data',
  columns: [
    { name: 'documentId', type: 'TEXT', notNull: true, onDelete: 'cascade' },
    { name: 'score', type: 'REAL', default: '0.0' },
    { name: 'metadata', type: 'TEXT' }
  ],
  indexes: [
    { name: 'idx_my_plugin_doc', columns: ['documentId'] }
  ]
});

// Query or modify data
await this.myTable.insert({ documentId: 'note-1', score: 9.5, metadata: '{}' });
const rows = await this.myTable.select({ where: { documentId: 'note-1' } });
```

### K. Type-Safe Zod-to-MCP Tool Automation
Register AI tools using Zod schemas for automated validation:

```javascript
const { z } = require('flint');

this.registerTool({
  name: 'calculate_metric',
  description: 'Calculates a metric for a document',
  schema: z.object({
    documentId: z.string(),
    multiplier: z.number().default(1)
  }),
  handler: async ({ documentId, multiplier }) => {
    return {
      content: [{ type: 'text', text: `Result: ${multiplier * 42}` }]
    };
  }
});
```

### L. Off-Thread Web Worker Pipeline
Run CPU-intensive tasks in a Web Worker off the main UI thread with live EventBus telemetry:

```javascript
// Register the worker task
this.registerWorkerTask('heavy-calculation', (input, emitEvent) => {
  emitEvent('calc:progress', { percent: 50 });
  return input.numbers.reduce((a, b) => a + b, 0);
});

// Run task off-thread
const sum = await this.runTask('heavy-calculation', { numbers: [1, 2, 3, 4, 5] });
```

---

## 3. Core & Community Extensions

In Flint, all built-in features (Graph, Canvas, Tasks, Daily Notes, Backlinks, Tags, Outline, Properties) are built using the exact same Extension API! You can review their implementation in `src/extensions/core/`.

To build your own standalone community extension, clone the official template repository:
```bash
git clone https://github.com/yvliet/flint-extension-starter.git
```

