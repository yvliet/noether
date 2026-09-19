# TypeScript API: `Extension` Base Class

The `Extension` base class (`src/sdk/Extension.ts`) is the primary entry point for all Noether extensions. It handles automatic lifecycle disposal, registry binding, and EventBus tracking.

## 1. Class Overview
---

```typescript
import { Extension, NoetherApp } from 'noether';

export default class MyExtension extends Extension {
  /**
   * Called once when the extension is initialized or enabled.
   */
  async onload(): Promise<void> {
    console.log(`[${this.manifest.name}] loaded.`);
  }

  /**
   * Called when the extension is disabled or uninstalled.
   * Auto-registered UI elements and events are cleaned up automatically.
   */
  async onunload(): Promise<void> {
    console.log(`[${this.manifest.name}] unloaded.`);
  }
}
```

## 2. Comprehensive Method Catalog
---

### Commands, Ribbon & Navigation
- `addCommand(command: CommandItem): void`: Registers an action in Command Palette (`Ctrl+K`).
- `addActionRailIcon(id: string, icon: string, tooltip: string, callback: (app: NoetherApp) => void, order?: number): void`: Injects an icon into the left Action Rail.
- `registerSearchProvider(provider: OmniboxProvider): Disposable`: Injects custom search providers and prefixes into the Omnibox.
- `registerView(viewType: string, factory: ViewFactory): void`: Registers a custom workspace view type or spatial canvas mode.

### Status Bar, Modals & Settings
- `addStatusBarItem(item: StatusBarItem): HTMLElement`: Adds a live widget or counter to the bottom status bar.
- `addSettingTab(tab: ExtensionSettingTab): void`: Injects a custom configuration tab in Noether Settings (`Ctrl+,`).
- `registerModal(modalId: string, factory: ModalFactory): Disposable`: Registers an interactive modal dialog.

### Lifecycle, Disposables & Timers
- `registerDisposable(disposable: Disposable): Disposable`: Automatically tracks any object implementing `.dispose()` for cleanup.
- `registerEvent(disposable: Disposable): Disposable`: Tracks EventBus listener subscriptions for cleanup.
- `registerDomEvent<K extends keyof WindowEventMap>(target: EventTarget, type: K, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): Disposable`: Attaches a DOM event listener with auto-removal on unload.
- `registerInterval(callback: () => void, ms: number): Disposable`: Creates an interval timer that clears automatically on unload.
- `registerTimeout(callback: () => void, ms: number): Disposable`: Creates a timeout timer that clears automatically on unload.
- `registerStoreSubscription<T>(store: StoreApi<T>, listener: (state: T, prevState: T) => void): Disposable`: Subscribes to a Zustand store with auto-unsubscribe.
- `onEvent<K extends keyof WorkspaceEvents>(event: K, callback: EventCallback<K>): Disposable`: Subscribes to typed EventBus events with auto-cleanup.

### Viewport, Context Menus & Decorators
- `registerViewportAction(action: ViewportActionDefinition): Disposable`: Adds corner action buttons over viewport surfaces.
- `registerFileContextMenuAction(action: FileContextMenuActionDefinition): Disposable`: Injects actions into file tree context menus.
- `registerTabContextMenuAction(action: TabContextMenuActionDefinition): Disposable`: Injects actions into tab right-click menus.
- `registerTabDecorator(decorator: TabDecoratorDefinition): Disposable`: Dynamically modifies workspace tab titles, icons, and badges.
- `registerIconPackProvider(provider: IconPackProvider): Disposable`: Registers custom icon packs for file tree and note glyphs.
- `registerPortalSlot(slot: PortalSlotDefinition): Disposable`: Injects React components into native UI slots.

### File Tree & Properties
- `registerFileTreeSection(section: FileTreeSectionDefinition): Disposable`: Adds custom collapsible sections to the sidebar file tree.
- `registerFileTreeDecorator(decorator: FileTreeItemDecorator): Disposable`: Modifies file tree node badges, prefixes, and styles.
- `registerFileTreeAction(action: FileTreeActionDefinition): Disposable`: Adds action buttons to file tree item hover toolbars.
- `registerFileType(def: CustomFileTypeDefinition): Disposable`: Registers custom file extensions with sidebar badges and view routing.
- `registerPropertyType(def: PropertyTypeDefinition): Disposable`: Adds custom frontmatter data types and custom inputs.
- `registerPropertyFilter(def: PropertyFilterDefinition): Disposable`: Dynamically hides or filters frontmatter keys in the UI.
- `registerPropertyIcon(def: PropertyIconDefinition): Disposable`: Assigns icons to specific frontmatter keys.

### Editor Bridge
- `registerEditorPlugin(plugin: EditorPluginDefinition): Disposable`: Bridges ProseMirror plugins, decorations, and input rules.
- `registerDocumentTransformHook(hook: DocumentTransformHook): Disposable`: Intercepts markdown serialization and parsing.
- `registerSlashCommand(item: SlashCommandDefinition): Disposable`: Injects commands into the in-editor `/` menu.
- `registerDocMenuAction(action: DocMenuActionDefinition): Disposable`: Adds items to the document options menu (`...`).
- `registerPlaceholderHint(hint: EditorPlaceholderHint): Disposable`: Displays contextual editor placeholder hints.
- `registerDocumentTitleDecorator(decorator: DocumentTitleDecoratorDefinition): Disposable`: Decorates note H1 title rendering.
- `registerBreadcrumbProvider(provider: BreadcrumbProviderDefinition): Disposable`: Provides custom path breadcrumbs.
- `registerBreadcrumbDecorator(decorator: BreadcrumbDecoratorDefinition): Disposable`: Styles individual breadcrumb chips.

### AI, Workers & Persistence
- `registerTool(tool: McpToolDefinition | McpZodToolDefinition): Disposable`: Exposes an MCP tool to AI assistants.
- `registerPrompt(prompt: McpPromptDefinition): Disposable`: Exposes structured MCP prompts to AI assistants.
- `registerWorkerTask<TInput, TOutput>(task: WorkerTaskDefinition<TInput, TOutput>): Disposable`: Offloads tasks to background Web Workers.
- `runTask<TInput, TOutput>(taskId: string, input: TInput, options?: RunTaskOptions): Promise<TOutput>`: Executes off-thread worker tasks.
- `defineTable<TRecord>(definition: TableDefinition): Promise<ExtensionTable<TRecord>>`: Declares type-safe relational SQLite tables.
- `loadData<T>(): Promise<T | null>`: Loads extension JSON settings from `.noether/extensions/<id>/data.json`.
- `saveData<T>(data: T): Promise<void>`: Saves extension JSON settings to disk.

