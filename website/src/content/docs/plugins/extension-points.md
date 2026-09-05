# Extension Points Reference

Flint provides a rich set of declarative extension points allowing plugins to seamlessly inject buttons, views, menus, and editor behaviors into the workspace.


## 1. Action Rail (Left Ribbon Toolbar)

---

The Action Rail is the narrow vertical icon bar on the far-left side of the Flint window. Use it for high-frequency global actions or view toggles.

```typescript
import { Extension, FlintApp } from 'flint';
import React from 'react';

export default class ActionRailExample extends Extension {
  async onload() {
    this.addActionRailIcon(
      'daily-quote',                            // Identifier (scoped automatically)
      React.createElement('span', null, '💡'), // React element or SVG icon
      'Show Daily Quote',                       // Hover tooltip
      (app: FlintApp) => {
        app.workspace.showToast('Stay curious and keep writing.', 'info');
      },
      15,                                       // Order priority (lower numbers appear higher)
      (app: FlintApp) => true                   // Optional isActive predicate
    );
  }
}
```


## 2. Command Palette (`Ctrl+K` / `Cmd+K`)

---

Commands appear in Flint's searchable Command Palette and can be bound to custom keyboard shortcuts.

```typescript
this.addCommand({
  id: 'insert-timestamp',
  title: 'Insert Current ISO Timestamp',
  section: 'Editor Actions',
  hotkey: 'Ctrl+Alt+T',
  allowInInput: true, // Enables firing even when an input or editor has focus
  action: (app: FlintApp) => {
    const timestamp = new Date().toISOString();
    app.workspace.showToast(`Timestamp: ${timestamp}`, 'success');
  },
  isVisible: (app: FlintApp) => true, // Optional conditional filter
});
```


## 3. Status Bar (Bottom Information Rail)

---

Widgets in the bottom status bar provide persistent, unobtrusive status information, counters, or quick triggers.

```typescript
this.addStatusBarItem({
  id: 'sync-indicator',
  alignment: 'right', // 'left' or 'right'
  order: 5,
  render: (app: FlintApp) => {
    return React.createElement(
      'div',
      {
        className: 'flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer',
        onClick: () => app.workspace.showToast('All changes synced locally.', 'info')
      },
      React.createElement('span', { className: 'w-2 h-2 rounded-full bg-emerald-500' }),
      React.createElement('span', null, 'Local Synced')
    );
  },
});
```


## 4. Context Menus (Right-Click Menus)

---

Flint features contextual right-click menus scoped to specific UI targets:
- `'file-tree'`: Right-clicking files or folders in the sidebar.
- `'file-tree-root'`: Right-clicking empty space in the file tree.
- `'editor'`: Right-clicking inside the document editor.
- `'tab'`: Right-clicking tabs in the window tab bar.
- `'universal'`: Appears across all context menus.

```typescript
// Registering a file action in the file tree
this.registerContextMenuItem({
  id: 'export-markdown',
  title: 'Export as Clean Markdown...',
  scope: 'file-tree',
  icon: React.createElement('span', null, '📄'),
  isVisible: (app, file: any) => !file?.is_folder,
  onClick: (app, file: any) => {
    app.workspace.showToast(`Exporting ${file.title}...`, 'info');
  },
});

// Registering an editor selection transformation with nested submenus
this.registerContextMenuItem({
  id: 'transform-text',
  title: 'Transform Selection',
  scope: 'editor',
  submenu: [
    {
      id: 'uppercase',
      title: 'UPPERCASE',
      onClick: (app, { editor, selectedText }: any) => {
        if (editor && selectedText) {
          editor.chain().focus().insertContent(selectedText.toUpperCase()).run();
        }
      },
    },
    {
      id: 'lowercase',
      title: 'lowercase',
      onClick: (app, { editor, selectedText }: any) => {
        if (editor && selectedText) {
          editor.chain().focus().insertContent(selectedText.toLowerCase()).run();
        }
      },
    },
  ],
});
```


## 5. Custom Workspace Views (Tab Panes)

---

Extensions can register full-screen view types that render inside workspace tabs (similar to Flint's native Graph View or Canvas).

```typescript
// 1. Register the custom view definition
this.registerView({
  type: 'pomodoro-timer',
  title: 'Focus Timer',
  icon: React.createElement('span', null, '⏳'),
  render: ({ app, tabId }) => {
    return React.createElement(
      'div',
      { className: 'flex flex-col items-center justify-center h-full p-8 text-neutral-200' },
      React.createElement('h1', { className: 'text-3xl font-bold mb-4' }, '25:00'),
      React.createElement('button', {
        className: 'px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded text-sm font-medium',
        onClick: () => app.workspace.showToast('Pomodoro session started!', 'success')
      }, 'Start Focus Session')
    );
  },
});

// 2. Open the view from a command or button
this.addCommand({
  id: 'open-pomodoro',
  title: 'Open Focus Timer',
  action: (app) => {
    app.workspace.openTab({
      viewType: 'pomodoro-timer',
      title: 'Focus Timer',
      newTab: true,
    });
  },
});
```


## 6. Global Modals & Dialogs

---

Register modal dialogs managed centrally by Flint's modal system:

```typescript
this.registerModal({
  id: 'welcome-dialog',
  render: (app) => {
    return React.createElement(
      'div',
      { className: 'p-6 bg-neutral-900 border border-neutral-700 rounded-lg max-w-md w-full' },
      React.createElement('h2', { className: 'text-lg font-semibold text-white' }, 'Welcome to Flint!'),
      React.createElement('p', { className: 'text-sm text-neutral-400 mt-2' },
        'Your local-first sanctuary for ideas and structured knowledge.'
      ),
      React.createElement('button', {
        className: 'mt-4 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-white',
        onClick: () => app.modals.closeModal(`${this.manifest.id}:welcome-dialog`)
      }, 'Dismiss')
    );
  },
});
```


## 7. Settings Tabs

---

Provide a configuration interface in the Flint Settings modal:

```typescript
this.registerSettingTab({
  id: 'preferences',
  name: 'Focus Timer',
  render: () => {
    return React.createElement(
      'div',
      { className: 'space-y-4 p-4 text-neutral-300' },
      React.createElement('h3', { className: 'text-base font-medium text-white' }, 'Timer Settings'),
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement('span', { className: 'text-sm' }, 'Default Interval (minutes)'),
        React.createElement('input', {
          type: 'number',
          defaultValue: 25,
          className: 'bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm w-20'
        })
      )
    );
  },
});
```


## 8. Advanced Editor Extension Points

---

For deep integration with the TipTap/ProseMirror text editor:

### Document Headers & Footers
Inject collapsible metadata panels above or below document content:
```typescript
this.registerDocumentHeader({
  id: 'reading-summary',
  order: 10,
  render: ({ document, app }) => {
    return React.createElement(
      'div',
      { className: 'mb-4 p-3 bg-neutral-900/60 border border-neutral-800 rounded text-xs text-neutral-400' },
      `Metadata for "${document?.title || 'Untitled'}"`
    );
  },
});
```

### Editor Slash Commands
Provide autocompletes when users type `/` at the start of an empty line:
```typescript
this.registerSlashCommand({
  title: 'Callout Box',
  description: 'Insert an emphasized callout container',
  icon: '💡',
  command: ({ editor, range }) => {
    editor.chain().focus().deleteRange(range).insertContent('> [!NOTE]\n> ').run();
  },
});
```

### Dynamic React Portal Slots
Mount arbitrary React components into layout anchor slots (`editor:viewport-overlay`, `editor:floating-toolbar`, `editor:minimap`, `editor:gutter`):
```typescript
this.registerPortalSlot({
  id: 'editor-word-badge',
  slot: 'editor:floating-toolbar',
  order: 5,
  when: (ctx) => ctx.viewMode === 'Visible',
  render: (ctx) => {
    return React.createElement(
      'div',
      { className: 'px-2 py-0.5 bg-neutral-800/80 rounded text-[11px] text-neutral-400 font-mono' },
      'Editing Note'
    );
  },
});
```


## 7. Related Reading & References

---

- [[Flint UI Components]]: Use native buttons, inputs, toggles, cards, and setting builders.
- [[CSS Variables & Design Tokens]]: Style custom controls using Flint's theme variables.
- [[Flint SDK API Reference]]: Complete method signatures and hook definitions.
- [[Events & Relational Storage]]: Coordinate UI actions with database events.
- [[Model Context Protocol (MCP) Tools]]: Expose extension capabilities to AI agent copilots.
