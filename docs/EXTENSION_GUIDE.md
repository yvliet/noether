# Noether Extension Developer Guide

Noether is designed from the ground up to be fully modular and extensible. All built-in capabilities (such as Canvas, Tasks, Spaced Repetition, and Graph view) are implemented as native extensions using the identical SDK interfaces available to community developers.

## 1. Quick Start: Creating Your First Extension
---

Extensions reside inside your Vault's `.noether/extensions/<extension-id>/` directory:

```
<My-Vault>/
  .noether/
    extensions/
      reading-time/
        manifest.json
        main.js
        styles.css (optional)
```

### `manifest.json`
```json
{
  "id": "reading-time",
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
const { Extension } = require('noether');

module.exports = class ReadingTimeExtension extends Extension {
  async onload() {
    console.log('Reading Time Extension loaded!');

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
      section: 'Reading',
      hotkey: 'Ctrl+Shift+U',
      aliases: ['reading time', 'estimate', 'word count'],
      isEnabled: (app) => Boolean(app.vault.activeDocument),
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
    console.log('Reading Time Extension unloaded!');
    // All UI elements and event listeners registered via this.add* are cleaned up automatically!
  }
};
```

## 2. Extension Points Reference
---

### A. Ribbon Icons
Add quick-access launcher buttons to the primary vertical navigation ribbon:
```javascript
this.addRibbonIcon(id, iconElementOrSvg, tooltipTitle, (app) => { ... }, orderIndex);
```

### B. Command Palette (`Ctrl+K`)
Register commands searchable via the universal Command Palette. Noether supports dynamic stateful titles, dynamic icons, search aliases, and contextual enablement:

```javascript
this.addCommand({
  id: 'toggle-feature',
  // Dynamic title reflecting stateful verbs instead of ambiguous "Toggle"
  title: (app) => (app.workspace.isSidebarOpen('left') ? 'Collapse left sidebar' : 'Expand left sidebar'),
  section: 'View',
  icon: (app) => (app.workspace.isSidebarOpen('left') ? <CollapseIcon /> : <ExpandIcon />),
  hotkey: 'Ctrl+\\',
  // Aliases ensure commands remain discoverable when searching for "toggle"
  aliases: ['toggle left sidebar', 'toggle sidebar', 'left sidebar', 'sidebar'],
  // Grayed out and skipped during keyboard navigation when not applicable
  isEnabled: (app) => Boolean(app.vault.activeDocument),
  action: (app) => {
    app.workspace.toggleLeftSidebar();
  }
});
```

### C. Status Bar Items
Render lightweight widgets in the application footer:
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
Register custom view panes that can be opened into tabs:
```javascript
this.registerView({
  type: 'my-custom-view',
  title: 'Kanban Board',
  render: ({ app }) => {
    return React.createElement('div', { className: 'p-6' }, 'Hello Kanban!');
  }
});
```

### E. Persistent Extension Settings
Persist configuration in `.noether/extensions/<extension-id>/data.json`:
```javascript
// Load saved JSON settings
const config = await this.loadData() || { mySetting: true };

// Save updated JSON settings
await this.saveData({ mySetting: false });
```

### F. Settings Preferences Tab
Register a custom settings panel in Noether's global Settings window (`Ctrl+,`):
```javascript
this.registerSettingTab({
  id: 'my-extension-settings',
  name: 'Word Counter',
  render: () => {
    return React.createElement('div', null, 'Configure word counter rules...');
  },
  onRestoreDefaults: () => {
    // Reset internal store or persisted data back to defaults
  }
});
```

### G. Custom Context Menu Items
Register items into Noether's custom context menus:
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
```

### H. UI Layout Slots (React Portals)
Mount React components into built-in layout slots (`workspace:root`, `editor:subheader-actions`, `editor:viewport-overlay`, `editor:content-overlay`, `editor:floating-toolbar`):

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

### I. Editor Extensions (ProseMirror & TipTap)
Add custom syntax decorations, markdown shortcuts, input rules, or paste handlers without slowing down keystrokes:

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

### J. Custom SQLite Tables & Auto-Migrations
Store structured data in your own SQLite tables with automatic migrations and automatic cleanup when a note is deleted:

```javascript
this.myTable = await this.defineTable({
  tableName: 'my_extension_data',
  columns: [
    { name: 'documentId', type: 'TEXT', notNull: true, onDelete: 'cascade' },
    { name: 'score', type: 'REAL', default: '0.0' },
    { name: 'metadata', type: 'TEXT' }
  ],
  indexes: [
    { name: 'idx_my_extension_doc', columns: ['documentId'] }
  ]
});

// Query or modify data
await this.myTable.insert({ documentId: 'note-1', score: 9.5, metadata: '{}' });
const rows = await this.myTable.select({ where: { documentId: 'note-1' } });
```

### K. Registering AI Tools (MCP with Zod)
Expose tools to AI assistants with typed Zod parameter validation:

```javascript
const { z } = require('noether');

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

### L. Background Web Workers (Heavy Tasks)
Run CPU-intensive calculations in a background Web Worker so the main UI stays smooth, sending progress events back as needed:

```javascript
// Register the worker task
this.registerWorkerTask('heavy-calculation', (input, emitEvent) => {
  emitEvent('calc:progress', { percent: 50 });
  return input.numbers.reduce((a, b) => a + b, 0);
});

// Run task off-thread
const sum = await this.runTask('heavy-calculation', { numbers: [1, 2, 3, 4, 5] });
```

### M. Shared Host Dependencies & Subpaths
Noether shares common libraries with extensions so your bundles stay small and avoid duplicate runtime overhead:

- **SDK Aliases**: `require('noether')`, `require('noether/sdk')`, `require('@noether')`, `require('@noether/core')`, `require('noether-sdk')`
- **UI & React**: `require('react')`, `require('react/jsx-runtime')`, `require('react-dom')`, `require('react-dom/client')`
- **Schema Validation**: `require('zod')` (supports both named and default exports)
- **Styling Utilities**: `require('clsx')`, `require('tailwind-merge')`
- **State Management**: `require('zustand')`, `require('zustand/vanilla')`
- **Icon System**: `require('@hugeicons/react')`, `require('@hugeicons/core-free-icons')`

## 3. Core & Standalone Community Extensions
---

In Noether, all built-in features (Graph, Canvas, Tasks, Daily Notes, Backlinks, Tags, Outline, Properties) are built using the exact same Extension SDK. You can review their implementation in `src/extensions/core/`.

To build your own standalone community extension, generate your project from the official template repository:
```bash
# Using GitHub CLI
gh repo create my-extension --template yvliet/noether-extension-starter --public --clone

# Or via Git
git clone https://github.com/yvliet/noether-extension-starter.git my-extension
```

Community extensions live in their own dedicated GitHub repositories and are compiled to a standalone `main.js` placed in `<vault>/.noether/extensions/<id>/`.
