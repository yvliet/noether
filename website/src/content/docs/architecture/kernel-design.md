# Micro-Kernel & Extension Architecture

Flint is architected around a strict **micro-kernel** design. The host application provides core windowing, layout primitives, document persistence, and registry managers. Virtually all user-facing features are implemented as modular extensions that plug into host extension points, including the Graph View, Infinite Canvas, Task Manager, Flashcard Reviewer, and Backlinks Panel.


## 1. Zero Native Core Leakage

---

A fundamental architectural invariant in Flint is **strict native core isolation**:

> [!IMPORTANT]
> Native directories (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) must never import code, types, or models from extensions or plugins (`src/plugins/*`, `src/extensions/*`).

All interaction between the host application and extensions is decoupled using:
1. **The Flint SDK (`src/sdk`)**: A stable public contract exposing base classes, interfaces, and registry helpers.
2. **Inversion of Control (IoC) Registries**: Central registries where extensions contribute UI elements, commands, and views.
3. **The Typed EventBus (`EventBus`)**: A publish-subscribe system for lifecycle and document events.

| Architectural Layer | Scope & Subsystems |
|:---|:---|
| **Flint Extensions Layer** | Modular extensions consuming only the public SDK boundary |
| **Core Built-ins** | Graph View, Infinite Canvas, Task Manager, FSRS Flashcards, Journal, Backlinks |
| **Community & Custom** | Cascade Chat, AI Copilot, Quicknote, Custom User Plugins |
| **Public SDK Surface (`src/sdk`)** | Stable host-extension contract decoupling kernel internals from plugins |
| **Core Interfaces** | `Extension` base class, `FlintApp` locator, Disposable Manager, Event Hooks |
| **Tool Builder** | Schema builders, Typed MCP definitions, Settings API |
| **Micro-Kernel IoC Registries** | Central inversion-of-control registries managed by the host application |
| `CommandRegistry` | Palette commands, keybindings, and hotkey listeners |
| `ViewRegistry` | Leaf views, tab types, and split pane panels |
| `ActionRailRegistry` | Left activity bar icons and action triggers |
| `StatusBarRegistry` | Bottom status items and progress indicators |
| `ContextMenuRegistry` | File tree, editor, and tab context menus |
| `ToolRegistry` (MCP) | Model Context Protocol dynamic tool registration |
| `SlotRegistry` | Pluggable UI injection points and modal slots |
| `Typed EventBus` | Async publish-subscribe channel for document and workspace lifecycle events |

This isolation ensures that any extension can be enabled, disabled, hot-reloaded, or completely removed without breaking host compilation or causing runtime reference leaks.


## 2. The Host Application Container (`FlintApp`)

---

Every extension receives a reference to `FlintApp`, which serves as the host application's central service locator:

```typescript
export interface FlintApp {
  /** Workspace state: active document, open tabs, toasts */
  workspace: WorkspaceManager;
  /** Command palette items and hotkey bindings */
  commands: CommandRegistry;
  /** Left icon rail (Action Rail / Ribbon) */
  actionRail: ActionRailRegistry;
  /** Bottom status bar widgets */
  statusBar: StatusBarRegistry;
  /** Left and right sidebar tabs */
  sidebars: SidebarRegistry;
  /** Workspace content views (tabs) */
  views: ViewRegistry;
  /** Rich text editor extensions, headers, and footers */
  editor: EditorRegistry;
  /** Right-click context menus */
  contextMenu: ContextMenuRegistry;
  /** Application modal dialogs */
  modals: ModalRegistry;
  /** Frontmatter property types and filters */
  properties: PropertyRegistry;
  /** Model Context Protocol (MCP) tools and prompts */
  tools: ToolRegistry;
  /** Dynamic React layout portal slots */
  slots: SlotRegistry;
  /** Declarative SQLite tables and migrations */
  dbManager: ExtensionDbManager;
  /** Background Web Worker thread pool */
  workerPool: ExtensionWorkerPool;
  /** Central typed event bus */
  events: EventBus;
}
```


## 3. The `Disposable` Pattern & Resource Management

---

Extensions frequently register event listeners, interval timers, DOM elements, and UI widgets. If an extension is disabled or uninstalled, orphaned resources cause memory leaks and zombie UI artifacts.

Flint solves this by enforcing the **Disposable Pattern**:

```typescript
export interface Disposable {
  dispose: () => void;
}
```

Every registration method on the `Extension` base class tracks disposables automatically:

```typescript
import { Extension } from 'flint';

export default class ExampleExtension extends Extension {
  async onload() {
    // 1. Registering a command returns a Disposable tracked by the extension
    this.addCommand({
      id: 'greet',
      title: 'Show Greeting',
      action: (app) => app.workspace.showToast('Hello from extension!'),
    });

    // 2. Event subscriptions are also tracked automatically
    this.onEvent('document:saved', (data) => {
      console.log('Saved note:', data.title);
    });

    // 3. Custom resources (timers, sockets) can be tracked manually
    const timer = setInterval(() => this.tick(), 60000);
    this.registerDisposable({
      dispose: () => clearInterval(timer),
    });
  }

  onunload() {
    // Standard registrations are cleaned up automatically.
    // Custom non-disposable cleanup can be placed here.
  }
}
```

When `app.extensions.disableExtension(id)` is called:
1. `extension.unload()` executes `extension.onunload()`.
2. All registered disposables are invoked in reverse order.
3. Extension-scoped SQLite connections and Web Workers are terminated.
4. The extension is garbage collected with zero memory leakage.


## 4. Namespacing & Isolation Invariants

---

To avoid name collisions between independent extensions:

- **Command IDs**: Scoped as `${extensionId}:${commandId}`.
- **Action Rail & Status Bar IDs**: Scoped as `${extensionId}:${itemId}`.
- **MCP Tool Names**: Automatically prefixed as `${extensionId}_${toolName}`.
- **Storage**: Key-value data is isolated in `.flint/extensions/${extensionId}/data.json`.
- **Database Tables**: Tables created via `this.defineTable()` are namespaced with the extension ID prefix in SQLite to prevent cross-extension schema corruption.


## 5. Related Reading & References

---

- [[Flint SDK API Reference]]: Inspect all classes, lifecycle hooks, and service locators.
- [[Dual-Storage Architecture]]: How the host coordinates filesystem I/O with SQLite metadata.
- [[Extension Points Reference]]: Learn how to register commands, ribbons, and modals.
- [[Model Context Protocol (MCP) Tools]]: Expose safe AI agent tools with JSON schema and Zod.
- [[Developer Policies & Guidelines]]: Invariants for privacy, stability, and desktop performance.
