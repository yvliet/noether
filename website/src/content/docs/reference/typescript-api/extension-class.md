# TypeScript API: `Extension` Base Class

The `Extension` base class (`src/sdk/Extension.ts`) is the primary entry point for all Flint plugins. It handles automatic lifecycle disposal, registry binding, and EventBus tracking.


## 1. Class Overview

---

```typescript
import { Extension, FlintApp, CommandItem, StatusBarItem } from 'flint';

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


## 2. Core Registration Methods

---

| Method | Signature | Description |
| :--- | :--- | :--- |
| `addCommand` | `(command: CommandItem) => void` | Registers an action in Command Palette (`Ctrl+K`). |
| `addActionRailIcon` | `(id, icon, tooltip, callback, order?) => void` | Injects an icon into the left Action Rail. |
| `addStatusBarItem` | `(item: StatusBarItem) => HTMLElement` | Adds a widget to the bottom status bar. |
| `registerSettingTab`| `(tab: ExtensionSettingTab) => void` | Adds a configuration panel in Settings. |
| `registerContextMenuItem`| `(item: ContextMenuItem) => void` | Injects right-click context menu options. |
| `registerPortalSlot`| `(slot: PortalSlotDefinition) => void` | Injects React components into UI portal slots. |
| `registerTool` | `(tool: McpToolDefinition) => void` | Exposes a Model Context Protocol tool to AI agents. |
| `registerEditorPlugin` | `(plugin: EditorPluginDefinition) => void` | Bridges ProseMirror / TipTap editor extensions. |
| `defineTable` | `(schema: TableSchema) => Promise<TableHandle>` | Creates declarative SQLite tables with cascade rules. |
| `registerWorkerTask` | `(taskName, handler) => void` | Offloads CPU tasks to background Web Workers. |
| `onEvent` / `registerEvent` | `(event, listener) => Disposable` | Listens to EventBus events with auto-cleanup. |
| `loadData` | `() => Promise<any>` | Loads persisted plugin JSON settings. |
| `saveData` | `(data: any) => Promise<void>` | Saves updated plugin JSON settings. |
