# TypeScript API: `NoetherApp` Container

The `NoetherApp` instance (`this.app`) provides extensions with controlled, modular access to workspace services, document operations, vault files, and system events.

## 1. Interface Definition
---

```typescript
export interface NoetherApp {
  /** Document navigation, tab management, dialogs, and notifications */
  workspace: WorkspaceAPI;
  /** Active Vault directory, recent vaults, and note management */
  vault: VaultAPI;
  /** Active TipTap / ProseMirror editor instance */
  editor: EditorAPI;
  /** In-memory and disk SQLite database operations */
  db: ExtensionDatabaseManager;
  /** Central typed event bus */
  events: EventBus;
  /** Application settings manager */
  settings: SettingsAPI;
  /** Extension runtime lifecycle, registry, and update manager */
  extensions: ExtensionManager;
}
```

## 2. Workspace API (`app.workspace`)
---

The `WorkspaceAPI` provides inversion-of-control host controls across tabs, sidebars, dialogs, and view modes:

- `app.workspace.activeTabId`: Readonly ID of the active document or custom tab.
- `app.workspace.mainViewMode`: Current main workspace view mode (`'document'` | `'canvas'`).
- `app.workspace.isSidebarOpen(side: 'left' | 'right'): boolean`: Checks whether the left or right sidebar is currently visible.
- `app.workspace.toggleLeftSidebar(): void`: Collapses or expands the left sidebar.
- `app.workspace.toggleRightSidebar(): void`: Collapses or expands the right sidebar.
- `app.workspace.revealInFileTree(documentId: string): void`: Automatically opens the left sidebar, activates the files explorer tab, and highlights the target document in the file tree.
- `app.workspace.isSplitViewOpen(): boolean`: Checks whether split editor view is currently active.
- `app.workspace.toggleSplitView(): void`: Toggles side-by-side split view on or off.
- `app.workspace.openTab(documentId: string, title?: string): void`: Opens a document into a tab.
- `app.workspace.closeTab(tabId: string): void`: Closes an open tab.
- `app.workspace.showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error')`: Displays an instantaneous, non-blocking toast notification.
- `app.workspace.openConfirmDialog(config: ConfirmDialogConfig): void`: Opens a modal dialog with title, message, optional `subtext`, danger styling, and optional `onDontAskAgain` callback.
- `app.workspace.openInputDialog(config: InputDialogConfig): void`: Prompts user for structured text input.
- `app.workspace.openCommandPalette(): void`: Opens the universal Command Palette launcher.

## 3. Vault API (`app.vault`)
---

- `app.vault.activeDocument`: Returns currently open `DocumentItem` or `null`.
- `app.vault.documents`: Readonly array of all documents and folders in the vault.
- `app.vault.createNewNote(title: string, parentId?: string | null): Promise<DocumentItem | null>`: Creates a new note.
- `app.vault.deleteDocument(id: string): Promise<void>`: Moves a document to the `.trash/` safety folder.
- `app.vault.toggleBookmark(id: string): Promise<boolean>`: Toggles bookmark status for a note.
- `app.vault.readDocument(id: string): Promise<DocumentItem | null>`: Retrieves full note content and metadata from the SQLite index.

## 4. Extension Manager API (`app.extensions`)
---

- `app.extensions.updater.checkForUpdates()`: Asynchronously checks remote registry, Turso, and GitHub Releases for new extension versions.
- `app.extensions.updater.updateExtension(id: string)`: Downloads the bundle through the 5-tier pipeline, saves to `.noether/extensions/<id>/`, and hot-reloads in memory.
- `app.extensions.updater.updateAll()`: Sequentially updates all community extensions with available upgrades.
- `app.extensions.reloadExtension(id: string)`: Unloads an extension, flushes cached constructors and styles, and reloads from disk.
- `app.extensions.enableExtension(id: string)`: Instantiates and executes the extension `onload()` lifecycle.
- `app.extensions.disableExtension(id: string)`: Safely tears down the extension through `onunload()`.
