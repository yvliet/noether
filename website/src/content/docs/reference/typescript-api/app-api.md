# TypeScript API: `FlintApp` Container

The `FlintApp` instance (`this.app`) provides extensions with controlled, modular access to workspace services, document operations, vault files, and system events.


## 1. Interface Definition

---

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
  /** Extension runtime lifecycle, registry, and update manager */
  extensions: ExtensionManager;
}
```


## 2. Workspace API (`app.workspace`)

---

- `app.workspace.activeDocument`: Returns currently open `DocumentItem` or `null`.
- `app.workspace.openDocument(idOrPath: string)`: Opens a note in the active editor.
- `app.workspace.showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error')`: Displays a non-blocking toast.
- `app.workspace.showConfirmDialog(config: ConfirmDialogConfig)`: Opens a confirmation modal.
- `app.workspace.showInputDialog(config: InputDialogConfig)`: Prompts user for text input.


## 3. Vault API (`app.vault`)

---

- `app.vault.read(path: string): Promise<string>`: Reads a raw UTF-8 file.
- `app.vault.write(path: string, content: string): Promise<void>`: Atomically writes a note to disk.
- `app.vault.delete(path: string): Promise<void>`: Moves a note to the `.trash/` safety folder.
- `app.vault.readNote(documentId: string)`: Retrieves note content and parsed frontmatter.


## 4. Extension Manager API (`app.extensions`)

---

- `app.extensions.updater.checkForUpdates()`: Asynchronously checks remote registry, Turso, and GitHub Releases for new extension versions.
- `app.extensions.updater.updateExtension(id: string)`: Downloads the bundle through the 5-tier pipeline, saves to `.flint/extensions/<id>/`, and hot-reloads in memory.
- `app.extensions.updater.updateAll()`: Sequentially updates all community extensions with available upgrades.
- `app.extensions.reloadExtension(id: string)`: Unloads an extension, flushes cached constructors and styles, and reloads from disk.
- `app.extensions.enableExtension(id: string)`: Instantiates and executes the extension `onload()` lifecycle.
- `app.extensions.disableExtension(id: string)`: Safely tears down the extension through `onunload()`.

