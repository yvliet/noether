# Noether SDK API Reference

The Noether Extension SDK (`src/sdk/index.ts`) is the official public programming interface for building extensions and themes. It exposes base classes, typed service registries, event subscribers, and data models while maintaining strict separation from host application internals.

## 1. The `Extension` Base Class
---

Every Noether extension extends the `Extension` base class. It provides automated resource tracking so that all commands, event listeners, status bar widgets, and tools registered through its methods are automatically disposed of when the extension is disabled or reloaded.

```typescript
import { Extension, NoetherApp } from 'noether';

export default class MyCustomExtension extends Extension {
  /**
   * Called once when the extension is loaded into the active Vault.
   * Initialize state, register commands, bind event listeners, and register MCP tools here.
   */
  async onload(): Promise<void> {
    console.log('Extension loaded in Vault:', this.app.vault.vaultPath);
  }

  /**
   * Called when the extension is disabled, uninstalled, or when Noether is switching Vaults.
   * Clean up non-tracked resources, custom WebSockets, or worker threads here.
   */
  async onunload(): Promise<void> {
    console.log('Extension cleanly unloaded.');
  }
}
```

### Core Registration Methods on `Extension`

| Category | Method Signature | Description |
| :--- | :--- | :--- |
| **Command & Ribbon** | `addCommand(command: CommandItem): void` | Registers an action into the Command Palette (`Ctrl+K`). Supports dynamic titles, icons, and hotkeys. |
| | `addActionRailIcon(id, icon, tooltip, callback, order?): void` | Adds an icon trigger to the left vertical Action Rail / Ribbon. |
| **Status Bar & Settings** | `addStatusBarItem(item: StatusBarItem): HTMLElement` | Adds a status indicator or live counter to the bottom status bar. |
| | `addSettingTab(tab: ExtensionSettingTab): void` | Injects a custom configuration tab into Noether Settings (`Ctrl+,`). |
| **Disposables & Timers** | `registerDisposable(disposable: Disposable): Disposable` | Automatically tracks any object with a `.dispose()` method for cleanup. |
| | `registerDomEvent<K>(target, type, listener, options?): Disposable` | Binds a DOM event listener with automatic unbinding on extension unload. |
| | `registerInterval(callback: () => void, ms: number): Disposable` | Registers a recurring interval timer cleared automatically on unload. |
| | `registerTimeout(callback: () => void, ms: number): Disposable` | Registers a one-shot timeout timer cleared automatically on unload. |
| | `registerStoreSubscription(store, listener): Disposable` | Subscribes to a Zustand or Vanilla store with automatic cleanup. |
| **UI Extension Points** | `registerViewportAction(action: ViewportActionDefinition): Disposable` | Adds floating corner action buttons over editor or spatial surfaces. |
| | `registerFileContextMenuAction(action: FileContextMenuActionDefinition): Disposable` | Injects custom actions into file tree node context menus. |
| | `registerTabContextMenuAction(action: TabContextMenuActionDefinition): Disposable` | Injects actions into workspace tab right-click menus. |
| | `registerSearchProvider(provider: OmniboxProvider): Disposable` | Registers custom search prefixes and results into the Command Palette. |
| | `registerTabDecorator(decorator: TabDecoratorDefinition): Disposable` | Dynamically decorates workspace tab titles, icons, and badges. |
| | `registerIconPackProvider(provider: IconPackProvider): Disposable` | Registers custom icon packs for file tree and note glyphs. |
| | `registerView(viewType: string, factory: ViewFactory): void` | Registers custom full-page views, tab modes, or spatial surfaces. |
| | `registerPortalSlot(slot: PortalSlotDefinition): void` | Injects React components into dynamic application portal slots. |
| **AI & Workers** | `registerTool(tool: McpToolDefinition \| McpZodToolDefinition): Disposable` | Exposes a Model Context Protocol tool to local and external AI agents. |
| | `registerPrompt(prompt: McpPromptDefinition): Disposable` | Exposes structured MCP prompts to AI assistants. |
| | `registerWorkerTask(task: WorkerTaskDefinition): Disposable` | Registers an off-thread background Web Worker task. |
| | `runTask(taskId, input, options?): Promise<TOutput>` | Executes a registered background worker task. |
| **Relational Data** | `defineTable<TRecord>(definition: TableDefinition): Promise<ExtensionTable<TRecord>>` | Declares a type-safe relational SQLite table with migrations. |
| | `loadData<T>(): Promise<T \| null>` | Loads lightweight JSON configuration from `.noether/extensions/<id>/data.json`. |
| | `saveData<T>(data: T): Promise<void>` | Persists lightweight JSON configuration to disk. |

### The `CommandItem` Specification

```typescript
export interface CommandItem {
  /** Unique command identifier (automatically prefixed with extension ID). */
  id: string;
  /** Static display title or dynamic function returning the stateful action label. */
  title: string | ((app: NoetherApp) => string);
  /** Grouping section name (e.g. 'View', 'Editor', 'Navigation', 'Files'). */
  section?: string;
  /** Static ReactNode or dynamic function returning a stateful icon. */
  icon?: React.ReactNode | ((app: NoetherApp) => React.ReactNode);
  /** Keyboard shortcut combination string (e.g. 'Ctrl+Shift+B'). */
  hotkey?: string;
  /** Search keywords and aliases that match this command in the palette. */
  aliases?: string[];
  /** Handler function executed when triggered. */
  action: (app: NoetherApp) => void | Promise<void>;
  /** Optional predicate determining if the command is currently active in this context. */
  isEnabled?: (app: NoetherApp) => boolean;
}
```

## 2. The `NoetherApp` Container
---

Extensions access host capabilities through the `NoetherApp` instance (`this.app`).

```typescript
export interface NoetherApp {
  /** Document navigation, tab management, sidebars, dialogs, and notifications */
  workspace: WorkspaceAPI;
  /** Active Vault directory, recent vaults, and note management */
  vault: VaultAPI;
  /** Active ProseMirror / TipTap editor controller */
  editor: EditorAPI;
  /** In-memory and disk SQLite database operations */
  db: ExtensionDatabaseManager;
  /** Central typed event bus */
  events: EventBus;
  /** Application settings manager */
  settings: SettingsAPI;
}
```

### Workspace API (`app.workspace`)

- `app.workspace.activeTabId`: Readonly ID of the active workspace tab.
- `app.workspace.mainViewMode`: Current view mode (`'document'` | `'canvas'`).
- `app.workspace.isSidebarOpen(side: 'left' | 'right'): boolean`: Returns whether the specified sidebar panel is currently expanded.
- `app.workspace.toggleLeftSidebar(): void`: Toggles the left file explorer sidebar.
- `app.workspace.toggleRightSidebar(): void`: Toggles the right backlinks and outline sidebar.
- `app.workspace.revealInFileTree(documentId: string): void`: Opens the left sidebar, activates the files tab, and highlights the note in the document tree.
- `app.workspace.isSplitViewOpen(): boolean`: Returns whether the editor is currently split side-by-side.
- `app.workspace.toggleSplitView(): void`: Toggles side-by-side editor pane splitting.
- `app.workspace.openTab(documentId: string, title?: string): void`: Opens a document in a tab.
- `app.workspace.closeTab(tabId: string): void`: Closes an open tab.
- `app.workspace.showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error')`: Shows an instant, non-blocking toast notification.
- `app.workspace.openConfirmDialog(config: ConfirmDialogConfig)`: Opens an interactive confirmation modal with custom title, message, optional `subtext`, danger styling, and optional `onDontAskAgain` callback.
- `app.workspace.openInputDialog(config: InputDialogConfig)`: Opens a text prompt dialog.
- `app.workspace.openCommandPalette(): void`: Launches the universal Command Palette.

### Vault API (`app.vault`)

- `app.vault.activeDocument`: Retrieves the currently opened `DocumentItem` or `null`.
- `app.vault.documents`: Readonly array of all documents and folders in the active Vault.
- `app.vault.vaultPath`: Absolute filesystem path to the currently opened Vault.
- `app.vault.vaultName`: Name of the active Vault.
- `app.vault.createNewNote(title: string, parentId?: string | null): Promise<DocumentItem | null>`: Creates a new note.
- `app.vault.deleteDocument(id: string): Promise<void>`: Moves a document to the Vault `.trash/` folder.
- `app.vault.toggleBookmark(id: string): Promise<boolean>`: Toggles the bookmark status of a document.
- `app.vault.readDocument(id: string): Promise<DocumentItem | null>`: Retrieves full note content and metadata from the SQLite index.

## 3. The `EventBus`
---

The `EventBus` enables loosely coupled communication between the Noether core and extensions. Always subscribe through `this.registerEvent(this.app.events.on(...))` to prevent memory leaks:

```typescript
// Subscribing to document save events
this.registerEvent(
  this.app.events.on('document:saved', ({ id, title }) => {
    console.log(`Note saved: ${title} (${id})`);
  })
);

// Subscribing to Vault switching
this.registerEvent(
  this.app.events.on('vault:loaded', ({ path, name }) => {
    this.reloadExtensionState(path);
  })
);
```

### Complete `WorkspaceEvents` Catalog

| Event Name | Payload Type | Trigger Condition |
| :--- | :--- | :--- |
| `vault:loaded` | `{ path: string, name: string }` | Vault workspace finishes cold startup and indexing. |
| `vault:changed` | `{ path: string, name: string }` | Active vault directory is switched. |
| `document:opened` | `{ id: string, title: string }` | Document is activated in an editor tab. |
| `document:saved` | `{ id: string, title: string }` | Note buffer is debounced and serialized to disk. |
| `document:deleted` | `{ id: string, title?: string }` | Note or folder is moved to `.trash/`. |
| `document:renamed` | `{ id: string, oldTitle: string, newTitle: string }` | File is renamed in tree or frontmatter. |
| `tab:changed` | `{ activeTabId: string \| null }` | Active workspace tab changes. |
| `view:mode-changed` | `{ mode: string }` | Viewport mode changes (`'document'`, `'canvas'`). |
| `extension:loaded` | `{ extensionId: string }` | Extension bundle evaluates and calls `onload()`. |
| `extension:unloaded` | `{ extensionId: string }` | Extension is disabled and unbinds resources. |
| `drag:start` / `drag:end` | `ActiveDragData` / `{ source, cancelled }` | Global drag-and-drop operations begin or conclude. |
| `editor:action` | `{ action: string, payload?: Record<string, unknown> }` | Editor dispatches high-level editing command. |
| `mcp:tool-called` | `{ toolName: string, args: Record<string, unknown>, source: string }` | MCP tool is invoked by an agent. |
| `mcp:tool-result` | `{ toolName: string, success: boolean, durationMs: number }` | MCP tool finishes execution. |
| `mcp:tools-changed` | `{ count: number }` | Tools are dynamically registered or unregistered. |
| `settings:defaults-restored` | `{ scope: 'all' \| string }` | User resets hotkeys or appearance settings. |
| `cache:purge` | `{ scope?: 'all' \| 'media' \| 'covers', key?: string }` | In-memory thumbnail or SQLite cache is cleared. |

## 4. Inversion of Control: `SlotRegistry`
---

Noether provides dynamic React portal slots that allow extensions to mount UI components directly into native application shell regions:

```typescript
import { PortalSlotLocation } from 'noether';

this.registerPortalSlot({
  id: 'header-reading-timer',
  location: 'editor:subheader-actions' as PortalSlotLocation,
  order: 10,
  predicate: (ctx) => Boolean(ctx.activeDoc),
  component: ({ activeDoc }) => {
    if (!activeDoc) return null;
    return <div className="text-xs text-neutral-400">Estimated: 3 min</div>;
  },
});
```

### Supported Portal Slot Locations (`PortalSlotLocation`)

- `'editor:viewport-overlay'`: Floating glass HUD pinned to viewport corners.
- `'editor:floating-toolbar'`: Floating toolbar docked above text selection.
- `'editor:minimap'`: Vertical right-side outline strip next to the editor.
- `'editor:gutter'`: Left-side gutter container for line badges and triggers.
- `'editor:subheader-actions'`: Action button dock in the document subheader.
- `'editor:content-overlay'`: In-editor canvas overlay scrolling naturally with document text.
- `'editor:banner'`: Header banner slot mounted directly below the subheader bar.
- `'workspace:root'`: Full viewport overlays, modal hosts, and floating panels.

## 5. Background Web Worker Pool (`ExtensionWorkerPool`)
---

To keep the UI responsive, heavy computational tasks (such as vector embeddings or dense PDF parsing) can be offloaded to the worker pool:

```typescript
// 1. Register worker task definition in onload()
this.registerWorkerTask({
  taskId: 'generate-embeddings',
  run: async (input: { texts: string[] }, emitEvent) => {
    emitEvent('embedding:progress', { percent: 50 });
    return [{ vector: [0.1, 0.2, 0.3] }];
  },
});

// 2. Execute off-thread when needed
const result = await this.runTask('generate-embeddings', { texts: ['Hello'] }, {
  priority: 'background',
  timeoutMs: 10000,
});
```

## 6. Reactive React Hooks (`@noether/react` and `noether`)
---

Extensions rendering React components can import reactive hooks directly from `noether` or `@noether/react`. These hooks subscribe directly to host state changes using React 18 external store synchronization with zero state leakage:

```typescript
import React from 'react';
import {
  useNoetherApp,
  useActiveDocument,
  useVaultDocuments,
  useActiveTab,
  useWorkspaceTabs,
  useDocumentBacklinks,
  useViewSuspension,
  useCurrentDrag,
} from 'noether';

export const MyExtensionView: React.FC = () => {
  const app = useNoetherApp();
  const activeDoc = useActiveDocument();
  const documents = useVaultDocuments();
  const backlinks = useDocumentBacklinks();
  const activeDrag = useCurrentDrag();

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold">{activeDoc?.title || 'No note open'}</h2>
      <p className="text-xs text-neutral-400">Total documents: {documents.length}</p>
      <p className="text-xs text-neutral-400">Incoming backlinks: {backlinks.length}</p>
      {activeDrag && <p className="text-xs text-accent">Dragging item...</p>}
    </div>
  );
};
```

### Hook Reference

| Hook | Return Type | Description |
| :--- | :--- | :--- |
| `useNoetherApp()` | `NoetherApp` | Returns the host application instance. |
| `useActiveDocument()` | `DocumentItem \| null` | Subscribes to the active document in the primary editor. |
| `useVaultDocuments()` | `DocumentItem[]` | Subscribes to all documents in the active Vault. |
| `useActiveTab()` | `TabItem \| null` | Subscribes to the active workspace tab. |
| `useWorkspaceTabs()` | `readonly TabItem[]` | Subscribes to all open workspace tabs. |
| `useMainViewMode()` | `string` | Subscribes to the current main view mode (`'document'`, `'canvas'`). |
| `useDocumentHeadings(docId?)` | `HeadingItem[]` | Subscribes to outline headings for a note. |
| `useDocumentBacklinks(docId?)` | `BacklinkItem[]` | Subscribes to incoming backlinks for a note. |
| `useDocumentOutgoingLinks(docId?)` | `OutgoingLinkItem[]` | Subscribes to outgoing wikilinks from a note. |
| `useDocumentUnlinkedMentions(docId?)` | `UnlinkedMentionItem[]` | Subscribes to unlinked text mentions of a note title. |
| `useVaultTags()` | `TagItem[]` | Subscribes to all indexed hashtags across the Vault. |
| `useGlobalTasks()` | `GlobalTaskItem[]` | Subscribes to interactive checklist items across all notes. |
| `useDocumentProperties(docId?)` | `Record<string, any>` | Subscribes to frontmatter properties with stable object identity. |
| `useCurrentDrag()` | `ActiveDragData \| null` | Subscribes to active application-wide drag-and-drop actions. |
| `useToast()` | `(msg, type?) => void` | Returns a toast notification dispatcher. |
| `useViewSuspension(ref?, opts?)` | `ViewSuspensionState` | Subscribes to window blur, focus, OS minimize, tab switching, and container intersection to freeze animation loops and physics when inactive. |
| `useViewSuspensionContext()` | `ViewSuspensionState` | Consumes the ambient view suspension state provided by the enclosing host container. |

## 7. View Layout & Action Components
---

The SDK exports unified layout wrappers that guarantee custom views match Noether's native desktop geometry and theming:

### `PageView`

The root layout container for all custom full-page workspace views. Encapsulates active tab cutout mask passthrough, sticky floating `PageSubHeader`, dynamic scroll dissolve transparency, custom scrollbar tracks, and navigation history.

```typescript
import { PageView } from 'noether';

export const MyView: React.FC = () => {
  return (
    <PageView
      title="Extension View"
      icon={<MyIcon />}
      options={[{ id: 'reload', label: 'Reload', onClick: handleReload }]}
    >
      <div className="p-6">Content here</div>
    </PageView>
  );
};
```

### `SidebarActionHeader` & `SidebarActionButton`

The canonical action toolbar suite for sidebar views, dock panels, and extension explorer tabs. Encapsulates pixel-perfect Action Rail baseline alignment (`y = 49px`), 28×28px buttons, 2px gaps, and instant click response.

```typescript
import {
  SidebarActionHeader,
  SidebarActionButton,
  CollapseAllButton,
} from 'noether';

export const MySidebarView: React.FC = () => {
  return (
    <div className="flex flex-col h-full select-none text-xs">
      <SidebarActionHeader borderBottom>
        <SidebarActionButton
          title="New Item"
          icon={<PlusIcon size={16} />}
          onClick={handleCreate}
        />
        <CollapseAllButton
          isCollapsed={isCollapsed}
          onToggle={handleToggleCollapse}
        />
      </SidebarActionHeader>
      <div className="flex-1 overflow-y-auto p-2">...</div>
    </div>
  );
};
```

