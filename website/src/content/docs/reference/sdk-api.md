# Flint SDK API Reference

The Flint Extension SDK (`src/sdk/index.ts`) is the official public programming interface for building extensions and themes. It exposes base classes, typed service registries, event subscribers, and data models while maintaining strict separation from host application internals.


## 1. The `Extension` Base Class

---

Every Flint extension extends the `Extension` (or `Plugin`) base class. It provides automated resource tracking so that all commands, event listeners, status bar widgets, and tools registered through its methods are automatically disposed of when the extension is disabled or reloaded.

```typescript
import { Extension, FlintApp } from 'flint';

export default class MyCustomExtension extends Extension {
  /**
   * Called once when the extension is loaded into the active Hearth.
   * Initialize state, register commands, bind event listeners, and register MCP tools here.
   */
  async onload(): Promise<void> {
    console.log('Extension loaded in Hearth:', this.app.hearth.activeHearthPath);
  }

  /**
   * Called when the extension is disabled, uninstalled, or when Flint is switching Hearths.
   * Clean up non-tracked resources, custom WebSockets, or worker threads here.
   */
  async onunload(): Promise<void> {
    console.log('Extension cleanly unloaded.');
  }
}
```

### Core Registration Methods on `Extension`

| Method | Description |
| :--- | :--- |
| `this.addCommand(command: CommandItem): void` | Registers an action into the Command Palette (`Ctrl+K` / `Cmd+K`). |
| `this.addActionRailIcon(id, icon, tooltip, callback, order?): void` | Adds a high-frequency icon trigger to the left vertical Action Rail / Ribbon. |
| `this.addStatusBarItem(item: StatusBarItem): HTMLElement` | Adds a status indicator or live counter to the bottom status bar. |
| `this.addSettingTab(tab: ExtensionSettingTab): void` | Injects a custom configuration panel into Flint Settings. |
| `this.registerEvent(disposable: Disposable): void` | Binds an EventBus listener and tracks it for automatic disposal. |
| `this.registerTool(tool: McpToolDefinition): void` | Exposes a Model Context Protocol tool to AI agents. |
| `this.registerView(viewType, factory): void` | Registers a custom main content view or tab mode. |
| `this.registerPortalSlot(slot: PortalSlotDefinition): void` | Injects React components into dynamic application portal slots. |
| `this.registerWorkerTask(task: WorkerTaskDefinition): void` | Registers an off-thread background Web Worker routine. |


## 2. The `FlintApp` Container

---

Extensions access host capabilities through the `FlintApp` instance (`this.app`).

```typescript
export interface FlintApp {
  /** Document navigation, tab management, dialogs, and notifications */
  workspace: WorkspaceAPI;
  /** Active Hearth directory, recent vaults, and workspace switching */
  hearth: HearthAPI;
  /** File read, write, rename, and directory operations */
  vault: VaultAPI;
  /** In-memory and disk SQLite database operations */
  db: ExtensionDatabaseManager;
  /** Central typed event bus */
  events: EventBus;
  /** Application settings manager */
  settings: SettingsAPI;
}
```

### Workspace API (`app.workspace`)

- `app.workspace.activeDocument`: Retrieves the currently opened `DocumentItem` or `null`.
- `app.workspace.openDocument(idOrPath: string)`: Opens a document in the active editor tab.
- `app.workspace.showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error')`: Shows a non-blocking toast notification.
- `app.workspace.showConfirmDialog(config: ConfirmDialogConfig)`: Opens an interactive confirmation modal dialog.
- `app.workspace.showInputDialog(config: InputDialogConfig)`: Opens a text prompt dialog.

### Hearth API (`app.hearth`)

- `app.hearth.activeHearthPath`: Absolute filesystem path to the currently opened Hearth.
- `app.hearth.switchHearth(path: string)`: Programmatically switches the active Hearth.
- `app.hearth.getRecentHearths()`: Returns a list of recently opened Hearth paths and names.

### Vault API (`app.vault`)

- `app.vault.read(path: string): Promise<string>`: Reads a raw UTF-8 file from the Hearth.
- `app.vault.write(path: string, content: string): Promise<void>`: Writes text to disk.
- `app.vault.delete(path: string): Promise<void>`: Moves a file to the Hearth `.trash/` folder or deletes it.


## 3. The `EventBus`

---

The `EventBus` enables loosely coupled communication between the Flint core and extensions. Always subscribe through `this.registerEvent(this.app.events.on(...))` to prevent memory leaks:

```typescript
// Subscribing to document creation
this.registerEvent(
  this.app.events.on('document:created', ({ documentId, title, path }) => {
    console.log(`Note created: ${title} (${path})`);
  })
);

// Subscribing to document changes
this.registerEvent(
  this.app.events.on('document:changed', ({ documentId, content }) => {
    this.recomputeMetrics(documentId, content);
  })
);

// Subscribing to Hearth switching
this.registerEvent(
  this.app.events.on('hearth:switched', ({ hearthPath }) => {
    this.reloadExtensionState(hearthPath);
  })
);
```

### Common Workspace Events

| Event Name | Payload | Trigger Condition |
| :--- | :--- | :--- |
| `document:created` | `{ documentId, path, title }` | A new markdown note is created. |
| `document:changed` | `{ documentId, content }` | Editor content is edited by the user. |
| `document:saved` | `{ documentId, path }` | Document is debounced and persisted to disk. |
| `document:deleted` | `{ documentId, path }` | Note is removed from the Hearth. |
| `hearth:switched` | `{ hearthPath }` | User switches to a different Hearth folder. |
| `tag:renamed` | `{ oldTag, newTag }` | A tag taxonomy is refactored across notes. |


## 4. Inversion of Control: `SlotRegistry`

---

Flint provides dynamic React portal slots that allow extensions to mount UI components directly into native application shell regions:

```typescript
import { PortalSlotLocation } from 'flint';

this.registerPortalSlot({
  id: 'header-reading-timer',
  location: 'editor:header' as PortalSlotLocation,
  order: 10,
  component: ({ activeDoc }) => {
    if (!activeDoc) return null;
    return <div className="text-xs text-neutral-400">Estimated: 3 min</div>;
  },
});
```

### Available Portal Locations

- `window:header:left`: Title bar left items (next to workspace name).
- `window:header:right`: Title bar right items (before window controls).
- `editor:header`: Top toolbar above the markdown reading canvas.
- `editor:footer`: Bottom bar below the markdown content.
- `sidebar:left:bottom`: Docked below the left file tree.
- `sidebar:right:bottom`: Docked below the backlinks outline panel.


## 5. Background Web Worker Pool (`ExtensionWorkerPool`)

---

To ensure the UI thread remains completely fluid (sub-8ms input latency), heavy computational tasks (such as large-scale natural language processing, vector embeddings, or dense PDF parsing) can be offloaded to the worker pool:

```typescript
const result = await this.app.workerPool.runTask({
  taskName: 'generate-embeddings',
  payload: { documentContent: '...' },
  timeoutMs: 5000,
});
```

To learn how extensions store relational data, read [[Database Schema Reference]] and [[Events & Relational Storage]]. To register AI tools, read [[Model Context Protocol (MCP) Tools]].
