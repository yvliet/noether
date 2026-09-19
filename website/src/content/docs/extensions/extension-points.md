# Extension Points Reference

Noether provides a rich set of declarative extension points allowing extensions to seamlessly inject buttons, views, menus, and editor behaviors into the workspace.

## 1. Action Rail (Left Ribbon Toolbar)
---

The Action Rail is the narrow vertical icon bar on the far-left side of the Noether window. Use it for high-frequency global actions or view toggles.

```typescript
import { Extension, NoetherApp } from 'noether';
import React from 'react';

export default class ActionRailExample extends Extension {
  async onload() {
    this.addActionRailIcon(
      'daily-quote',                            // Identifier (scoped automatically)
      React.createElement('span', null, '💡'), // React element or HugeIcon identifier
      'Show Daily Quote',                       // Hover tooltip
      (app: NoetherApp) => {
        app.workspace.showToast('Stay curious and keep writing.', 'info');
      },
      15,                                       // Order priority (lower numbers appear higher)
      (app: NoetherApp) => true                 // Optional isActive predicate
    );
  }
}
```

## 2. Command Palette (`Ctrl+K` / `Cmd+K`)
---

Commands appear in Noether's searchable Command Palette and can be bound to custom keyboard shortcuts. Noether supports dynamic stateful titles, dynamic icons, search aliases, and contextual enablement:

```typescript
this.addCommand({
  id: 'toggle-view-mode',
  // Dynamic functional title indicating current stateful action
  title: (app: NoetherApp) =>
    app.settings.defaultTabMode === 'Reading view' ? 'Switch to editing view' : 'Switch to reading view',
  section: 'View',
  hotkey: 'Ctrl+E',
  // Aliases ensure discoverability even when searching for "toggle"
  aliases: ['toggle reading view', 'toggle editing view', 'reading view', 'editing view'],
  // Grayed out and skipped during keyboard navigation when not in a valid context
  isEnabled: (app: NoetherApp) => Boolean(app.vault.activeDocument),
  action: (app: NoetherApp) => {
    const cur = app.settings.defaultTabMode;
    const next = cur === 'Reading view' ? 'Editing view' : 'Reading view';
    app.settings.setDefaultTabMode(next);
  },
  isVisible: (app: NoetherApp) => true,
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
  render: (app: NoetherApp) => {
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

Noether features contextual right-click menus scoped to specific UI targets:
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
```

## 5. Tab Context Menu Actions (`registerTabContextMenuAction`)
---

Contribute contextual actions when users right-click tabs in the tab bar or split panes:

```typescript
import { Extension, TabContextMenuActionDefinition, TabContextMenuContext } from 'noether';
import React from 'react';

export default class TabActionExample extends Extension {
  async onload() {
    this.registerTabContextMenuAction({
      id: 'copy-note-wikilink',
      title: 'Copy note link',
      section: 'actions', // 'tabs' | 'split' | 'actions' | 'danger'
      order: 40,
      isVisible: (ctx: TabContextMenuContext) => Boolean(ctx.doc),
      isEnabled: (ctx: TabContextMenuContext) => true,
      onClick: async (ctx: TabContextMenuContext) => {
        if (!ctx.doc) return;
        const link = `[[${ctx.doc.title}]]`;
        await navigator.clipboard.writeText(link);
        ctx.app.workspace.showToast(`Copied ${link}`, 'success');
      },
    });
  }
}
```

## 6. Omnibox Search Providers (`registerSearchProvider`)
---

Contribute searchable items and custom prefix routing to Noether's universal command palette (`Ctrl+K`):

```typescript
import { Extension, OmniboxProvider, OmniboxSearchContext, OmniboxItem } from 'noether';
import React from 'react';

export default class SnippetSearchProvider extends Extension {
  async onload() {
    this.registerSearchProvider({
      id: 'code-snippets',
      name: 'Snippets',
      prefix: 'snip:',
      placeholder: 'Filter code snippets...',
      prefixOnly: true, // Only triggers when search query begins with "snip:"
      order: 25,
      search: async (query: string, ctx: OmniboxSearchContext): Promise<OmniboxItem[]> => {
        const q = query.toLowerCase().trim();
        const snippets = [
          { id: '1', title: 'React Functional Component', body: 'export function Component() {}' },
          { id: '2', title: 'Rust Match Pattern', body: 'match res { Ok(v) => v, Err(e) => panic!() }' },
        ];

        return snippets
          .filter((s) => !q || s.title.toLowerCase().includes(q))
          .map((s) => ({
            id: `snip-${s.id}`,
            title: s.title,
            description: 'Insert snippet code',
            category: 'Snippets',
            onSelect: () => {
              ctx.app.workspace.showToast(`Selected ${s.title}`, 'info');
            },
          }));
      },
    });
  }
}
```

## 7. Viewport Actions (`registerViewportAction`)
---

Mount floating action buttons pinned to any viewport corner (`top-left`, `top-right`, `bottom-left`, `bottom-right`) in horizontal or vertical orientations with view scoping (`document`, `canvas`, `graph`, `all`):

```typescript
this.registerViewportAction({
  id: 'focus-zen-mode',
  corner: 'top-right',
  direction: 'horizontal',
  scope: 'document',
  order: 10,
  render: ({ app, activeDoc }) => (
    <button
      className="p-1.5 rounded bg-surface/80 hover:bg-surface border border-border text-xs"
      onClick={() => app.workspace.toggleLeftSidebar()}
    >
      Zen View
    </button>
  ),
});
```

## 8. Tab Decorators (`registerTabDecorator`)
---

Dynamically modify workspace tab titles, icons, tooltips, and badges:

```typescript
this.registerTabDecorator({
  id: 'git-dirty-tab-decorator',
  order: 10,
  getBadge: ({ doc }) => {
    if (doc && isModifiedLocally(doc.id)) {
      return { text: 'M', className: 'bg-amber-500 text-black font-bold' };
    }
    return undefined;
  },
});
```

## 9. Custom Breadcrumb Providers (`registerBreadcrumbProvider`)
---

Customize the subheader navigation trail and title overrides for specialized view types or virtual documents:

```typescript
import { Extension, BreadcrumbProviderDefinition, BreadcrumbMatchContext, BreadcrumbContext } from 'noether';
import React from 'react';

export default class CustomBreadcrumbsProvider extends Extension {
  async onload() {
    this.registerBreadcrumbProvider({
      id: 'kanban-breadcrumbs',
      order: 20,
      matches: (ctx: BreadcrumbMatchContext) => ctx.viewType === 'kanban',
      getBreadcrumbs: (ctx: BreadcrumbContext) => [
        { id: 'projects-root', title: 'Projects', isFolder: true, onClick: () => {} },
        { id: 'board-node', title: 'Sprint Board', isFolder: false },
      ],
      getTitleOverride: (ctx) => 'Sprint Kanban Board',
    });
  }
}
```

## 10. Custom Workspace Views (Tab Panes)
---

Extensions can register full-screen view types that render inside workspace tabs (similar to Noether's native Graph View, Tasks, and Marketplace).

When rendering custom views, wrap your content in the SDK's `PageView` component. `PageView` provides the native Noether view architecture:
- **Active Tab Cutout Passthrough**: The active workspace tab cutout seamlessly connects to the view background.
- **Floating Subheader**: Mounts navigation history (back and forward), view icon, title, and custom action buttons or option menus floating at `var(--noether-header-offset)`.
- **Dynamic Scroll Dissolve**: The subheader dissolves to transparent on scroll, with subtle drop-shadows keeping controls crisp over scrolling content.
- **Scrollbar Track Offset**: Applies `.scrollbar-track-offset-subheader` so custom scrollbar thumbs never overlap the floating header.

```typescript
import React from 'react';
import { Extension, PageView } from 'noether';

// 1. Register the custom view definition
this.registerView({
  type: 'pomodoro-timer',
  title: 'Focus Timer',
  icon: React.createElement('span', null, '⏳'),
  render: ({ app, tabId }) => {
    return (
      <PageView
        title="Focus Timer"
        icon={<span>⏳</span>}
        options={[
          {
            id: 'settings',
            label: 'Timer Settings',
            onClick: () => app.workspace.showToast('Opening settings...', 'info'),
          },
        ]}
      >
        <div className="flex flex-col items-center justify-center p-8 text-neutral-200">
          <h1 className="text-3xl font-bold mb-4">25:00</h1>
          <button
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded text-sm font-medium"
            onClick={() => app.workspace.showToast('Pomodoro session started!', 'success')}
          >
            Start Focus Session
          </button>
        </div>
      </PageView>
    );
  },
});
```

## 11. Custom Sidebar Tabs (`registerSidebarTab`)
---

When building custom inspectors, outlines, or bookshelf managers, you can mount dedicated explorer views directly into the left or right dock panels using `this.registerSidebarTab()`.

Wrapping your controls in `<SidebarActionHeader>` and `<SidebarActionButton>` ensures your custom tab inherits the exact same baseline alignment (`y = 49px`), 28×28px buttons, 2px gaps, and instant responsiveness as Noether's native file explorer and document views:

```typescript
import React, { useState } from 'react';
import {
  Extension,
  SidebarActionHeader,
  SidebarActionButton,
  CollapseAllButton,
} from 'noether';

export default class BookmarksExtension extends Extension {
  async onload() {
    this.registerSidebarTab({
      id: 'bookmarks-explorer',
      title: 'Bookmarks',
      icon: <span>🔖</span>,
      side: 'left', // 'left' or 'right'
      order: 10,
      render: () => <BookmarksSidebarView />,
    });
  }
}
```

## 12. Global Modals & Dialogs
---

Register modal dialogs managed centrally by Noether's modal system:

```typescript
this.registerModal({
  id: 'welcome-dialog',
  render: (app) => {
    return React.createElement(
      'div',
      { className: 'p-6 bg-neutral-900 border border-neutral-700 rounded-lg max-w-md w-full' },
      React.createElement('h2', { className: 'text-lg font-semibold text-white' }, 'Welcome to Noether!'),
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

## 13. Settings Tabs
---

Provide a configuration interface in the Noether Settings modal:

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
  onRestoreDefaults: () => {
    // Reset extension configuration back to defaults
  },
});
```

## 14. Advanced Editor Extension Points
---

For deep integration with the TipTap/ProseMirror text editor:

### Document Headers & Footers
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
Mount arbitrary React components into layout anchor slots (`editor:subheader-actions`, `editor:content-overlay`, `editor:viewport-overlay`, `editor:floating-toolbar`, `editor:minimap`, `editor:gutter`):

```typescript
this.registerPortalSlot({
  id: 'editor-word-badge',
  location: 'editor:floating-toolbar',
  order: 5,
  predicate: (ctx) => Boolean(ctx.activeDoc),
  component: (ctx) => {
    return React.createElement(
      'div',
      { className: 'px-2 py-0.5 bg-neutral-800/80 rounded text-[11px] text-neutral-400 font-mono' },
      'Editing Note'
    );
  },
});
```

## 15. Custom File Types (`registerFileType`)
---

Noether allows extensions to register custom file extensions (such as `.canvas`, `.excalidraw`, `.sheet`, or `.mindmap`). When registered, Noether automatically:
- Scans and indexes the file extension during vault synchronization.
- Displays the custom badge (e.g. `CANVAS`) next to the file title in the navigation tree.
- Routes opening the file directly to your custom registered view.
- Isolates title conflict checks between standard markdown notes and custom file types.

```typescript
this.registerFileType({
  extension: 'canvas',
  docType: 'canvas',
  badgeLabel: 'CANVAS',
  viewType: 'canvas',
  defaultContent: JSON.stringify({ nodes: [], edges: [] }, null, 2),
  isRawContent: true,
});
```

## 16. Related Reading & References
---

- [[Noether UI Components]]: Use native buttons, inputs, toggles, cards, and setting builders.
- [[CSS Variables & Design Tokens]]: Style custom controls using Noether's theme variables.
- [[Noether SDK API Reference]]: Complete method signatures and hook definitions.
- [[Events & Relational Storage]]: Coordinate UI actions with database events.
- [[Model Context Protocol (MCP) Tools]]: Expose extension capabilities to AI agent copilots.

