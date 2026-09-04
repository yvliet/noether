/**
 * @module apiTypes
 * @description
 * Public API type contracts for the FlintApp plugin surface.
 * These interfaces define the shape of `app.workspace`, `app.vault`,
 * and `app.settings` — the primary ways plugins interact with the
 * application without importing internal stores.
 *
 * @since 0.2.0
 */

import React from 'react';
import type { TabItem, DocumentItem, DocumentProperties } from '@/types';
import type { ContextMenuItemDefinition, OpenTabOptions } from '../extensions/types';

// ─── Dialog Configuration Types ──────────────────────────────────

/**
 * Configuration options for `app.workspace.openConfirmDialog()`.
 * @since 0.2.0
 */
export interface ConfirmDialogConfig {
  /** Title text shown in the dialog header. */
  title: string;
  /** Informational message body describing the action to confirm. */
  message: string;
  /** Text label for the confirmation button (defaults to 'OK' or 'Confirm'). */
  confirmText?: string;
  /** Text label for the cancel button (defaults to 'Cancel'). */
  cancelText?: string;
  /** If true, styles the confirmation action as dangerous/destructive (e.g. red button). */
  isDanger?: boolean;
  /** Callback invoked when the user confirms the action. */
  onConfirm: () => void | Promise<void>;
  /** Optional callback invoked when the user cancels the dialog. */
  onCancel?: () => void;
}

/**
 * Configuration options for `app.workspace.openInputDialog()`.
 * @since 0.2.0
 */
export interface InputDialogConfig {
  /** Title text shown in the dialog header. */
  title: string;
  /** Initial text pre-filled into the input field. */
  defaultValue?: string;
  /** Ghost placeholder text shown when the input field is empty. */
  placeholder?: string;
  /** Text label for the confirmation button (defaults to 'Save' or 'OK'). */
  confirmText?: string;
  /** Whether an empty or whitespace-only input is allowed upon confirmation. */
  allowEmpty?: boolean;
  /** Callback invoked with the trimmed input value upon confirmation. */
  onConfirm: (value: string) => void | Promise<void>;
  /** Optional callback invoked when the user cancels the dialog. */
  onCancel?: () => void;
}

/**
 * Configuration options for `app.workspace.promptFolderSelection()`.
 * @since 0.2.0
 */
export interface FolderPickerConfig {
  /** Title text shown in the folder selection banner header. */
  title?: string;
  /** Informational message body describing what folder to select. */
  message?: string;
  /** Whether selecting the root folder is allowed (defaults to true). */
  allowRoot?: boolean;
  /** Callback invoked when a folder is selected. */
  onSelect: (folderPath: string, folderItem?: DocumentItem | null) => void;
  /** Optional callback invoked when folder selection is cancelled. */
  onCancel?: () => void;
}

// ─── Workspace API ──────────────────────────────────────────────

/**
 * The Workspace API provides methods for controlling the application's
 * UI state: tabs, sidebars, view modes, dialogs, and navigation.
 *
 * Accessed via `app.workspace` inside any Plugin.
 *
 * @example
 * ```ts
 * // Open a sidebar tab
 * app.workspace.setActiveSidebarTab('right', 'backlinks');
 *
 * // Show a toast notification
 * app.workspace.showToast('File saved', 'success');
 * ```
 *
 * @since 0.2.0
 */
export interface WorkspaceAPI {
  // ── Tab Management ──

  /**
   * Returns the ID of the currently active tab, or `null` if no tab is active.
   * @since 0.2.0
   */
  readonly activeTabId: string | null;

  /**
   * Returns the current main view mode (e.g., 'document', 'graph', 'canvas').
   * @since 0.1.0
   */
  readonly mainViewMode: string;

  /**
   * Returns a snapshot of all open tabs.
   * The returned array is a shallow copy — mutations do not affect app state.
   * @since 0.2.0
   */
  getTabs(): readonly TabItem[];

  /**
   * Switches focus to the tab with the given ID.
   * No-op if the tab ID does not exist.
   *
   * @param tabId - The unique identifier of the tab to activate.
   * @since 0.2.0
   */
  setActiveTab(tabId: string): void;

  /**
   * Sets the main content area's view mode.
   *
   * @param mode - One of the registered view types (e.g., 'document', 'graph', 'canvas').
   * @since 0.1.0
   */
  setMainViewMode(mode: string): void;

  /**
   * Opens a document in a new or existing tab.
   *
   * @param docId - The document's unique ID.
   * @param title - Display title for the tab.
   * @param options - Optional tab opening options (metadata, custom tab ID, etc.).
   * @since 0.1.0
   */
  openTab(docId: string, title?: string, options?: OpenTabOptions): void;

  /**
   * Closes the tab with the given ID.
   * No-op if the tab ID does not exist.
   *
   * @param tabId - The unique identifier of the tab to close.
   * @since 0.1.0
   */
  closeTab(tabId: string): void;

  /**
   * Opens a custom plugin view in a new tab.
   *
   * @param options - Configuration for the custom tab.
   * @param options.id - Optional explicit tab ID (auto-generated if omitted).
   * @param options.viewType - The registered view type string.
   * @param options.title - Display title for the tab.
   * @param options.icon - Optional React node for the tab icon.
   * @param options.documentId - Optional document ID to associate with the view.
   * @since 0.1.0
   */
  openCustomTab(options: {
    id?: string;
    viewType: string;
    title: string;
    icon?: React.ReactNode;
    documentId?: string;
  }): void;

  /**
   * Opens a registered view type in a new tab with sensible defaults.
   * Convenience wrapper around `openCustomTab`.
   *
   * @param viewType - The registered view type string.
   * @param title - Optional display title (defaults to capitalized viewType).
   * @param icon - Optional React node for the tab icon.
   * @since 0.1.0
   */
  openViewTab(viewType: string, title?: string, icon?: React.ReactNode): void;

  /**
   * Opens the extension documentation viewer for a specific extension.
   *
   * @param extensionId - The extension's unique identifier.
   * @param title - Optional display title for the tab.
   * @since 0.2.0
   */
  openExtensionDocTab(extensionId: string, title?: string): void;

  /**
   * Backwards-compatibility alias for `openExtensionDocTab`.
   * @deprecated Use `openExtensionDocTab` instead.
   */
  openPluginDocTab(pluginId: string, title?: string): void;

  // ── Sidebar Management ──

  /**
   * Toggles the visibility of the left sidebar panel.
   * @since 0.1.0
   */
  toggleLeftSidebar(): void;

  /**
   * Toggles the visibility of the right sidebar panel.
   * @since 0.1.0
   */
  toggleRightSidebar(): void;

  /**
   * Sets whether a sidebar is open or closed.
   *
   * @param side - Which sidebar to control ('left' or 'right').
   * @param open - `true` to open, `false` to close.
   * @since 0.2.0
   */
  setSidebarOpen(side: 'left' | 'right', open: boolean): void;

  /**
   * Switches the active tab/view within a sidebar panel.
   *
   * @param side - Which sidebar to update ('left' or 'right').
   * @param tabId - The registered sidebar tab ID to activate.
   * @since 0.2.0
   */
  setActiveSidebarTab(side: 'left' | 'right', tabId: string): void;

  // ── Split View ──

  /**
   * Toggles the split editor pane on or off.
   * @since 0.2.0
   */
  toggleSplitView(): void;

  // ── Navigation History ──

  /**
   * Navigates backward in the tab/document history stack.
   * Equivalent to browser back button behavior.
   * @since 0.2.0
   */
  navigateBack(): Promise<void>;

  /**
   * Navigates forward in the tab/document history stack.
   * Equivalent to browser forward button behavior.
   * @since 0.2.0
   */
  navigateForward(): Promise<void>;

  // ── File Operations History ──

  /**
   * Undoes the last file-level action (delete, rename, move).
   * This is separate from editor-level text undo.
   * @since 0.2.0
   */
  undoFileAction(): Promise<void>;

  /**
   * Redoes the last undone file-level action.
   * @since 0.2.0
   */
  redoFileAction(): Promise<void>;

  // ── Dialogs & Notifications ──

  /**
   * Displays a transient toast notification in the application viewport.
   *
   * @param message - The message to display.
   * @param type - Visual style: 'info' (default), 'success', or 'warning'.
   * @since 0.1.0
   */
  showToast(message: string, type?: 'info' | 'success' | 'warning'): void;

  /**
   * Opens a confirmation dialog modal with OK/Cancel buttons.
   *
   * @param config - Dialog configuration options.
   * @since 0.1.0
   */
  openConfirmDialog(config: ConfirmDialogConfig): void;

  /**
   * Opens an input prompt dialog with a text input field and OK/Cancel buttons.
   *
   * @param config - Input dialog configuration options.
   * @since 0.1.0
   */
  openInputDialog(config: InputDialogConfig): void;

  /**
   * Prompts the user to pick a folder from the File Explorer sidebar.
   * Closes any open settings modal and switches the left sidebar to the file tree.
   *
   * @param config - Folder picker configuration and callbacks.
   * @since 0.2.0
   */
  promptFolderSelection(config: FolderPickerConfig): void;

  /**
   * Cancels the active folder selection mode and invokes any onCancel callback.
   * @since 0.2.0
   */
  cancelFolderSelection(): void;

  /**
   * Opens the Quick Open (command palette) overlay.
   * @since 0.1.0
   */
  openCommandPalette(): void;

  /**
   * Opens the Quick Open notes & commands overlay.
   * @since 0.2.0
   */
  openQuickOpen(): void;

  /**
   * Opens the application settings modal window.
   *
   * @param tabId - Optional settings tab ID to navigate to directly.
   * @since 0.1.0
   */
  openSettings(tabId?: string): void;

  /**
   * Opens the help & keyboard shortcuts modal.
   * @since 0.2.0
   */
  openHelpModal(): void;

  /**
   * Programmatically shows a context menu at the given position.
   *
   * @param eventOrCoords - A MouseEvent or `{ x, y }` coordinate object.
   * @param items - Array of context menu item definitions.
   * @param options - Optional configuration options for the context menu.
   * @since 0.1.0
   */
  showContextMenu(
    eventOrCoords: MouseEvent | { x: number; y: number },
    items: ContextMenuItemDefinition[],
    options?: Record<string, unknown>
  ): void;

  /**
   * Closes any open context menu.
   * @since 0.1.0
   */
  closeContextMenu(): void;

  // ── Read-Only State Accessors ──

  /**
   * Whether the SQLite database connection is currently active and healthy.
   * @since 0.2.0
   */
  readonly isDatabaseActive: boolean;

  /**
   * Current word count of the active document. Returns 0 if no document is active.
   * @since 0.2.0
   */
  readonly wordCount: number;

  /**
   * Current character count of the active document. Returns 0 if no document is active.
   * @since 0.2.0
   */
  readonly charCount: number;

  /**
   * Number of backlinks pointing to the active document.
   * @since 0.2.0
   */
  readonly backlinkCount: number;
}

// ─── Hearth API (formerly Vault API) ────────────────────────────

/**
 * The Hearth API provides methods for interacting with documents,
 * notes, and the underlying Hearth storage layer.
 *
 * Accessed via `app.hearth` (or legacy `app.vault`) inside any Extension.
 *
 * @example
 * ```ts
 * // Get the active document
 * const doc = app.hearth.activeDocument;
 *
 * // Create a new note
 * const newDoc = await app.hearth.createNewNote('My Note');
 * ```
 *
 * @since 0.1.0
 */
export interface HearthAPI {
  /**
   * Active document currently loaded in the primary editor.
   * @since 0.1.0
   */
  readonly activeDocument: DocumentItem | null;

  /**
   * All documents and folders currently loaded in the Hearth.
   * @since 0.2.0
   */
  readonly documents: DocumentItem[];

  /**
   * Display name of the currently open Hearth.
   * @since 0.1.0
   */
  readonly hearthName: string;

  /**
   * Filesystem path of the currently open Hearth root directory.
   * @since 0.1.0
   */
  readonly hearthPath: string;

  /**
   * Backwards-compatible alias for hearthName.
   * @since 0.1.0
   */
  readonly vaultName: string;

  /**
   * Backwards-compatible alias for hearthPath.
   * @since 0.1.0
   */
  readonly vaultPath: string;

  /**
   * Retrieves a document by its unique ID.
   * Returns `undefined` if no document with that ID exists in the Hearth.
   *
   * @param docId - The document's unique identifier.
   * @since 0.2.0
   */
  getDocumentById(docId: string): DocumentItem | undefined;

  /**
   * Asynchronously reads a document with full content from the database.
   *
   * @param docId - The document's unique identifier.
   * @since 0.2.0
   */
  readDocument(docId: string): Promise<DocumentItem | undefined>;

  /**
   * Creates a new note document in the Hearth.
   *
   * @param title - Initial title for the note (default: 'Untitled').
   * @param parentId - Optional parent folder ID for nesting.
   * @returns The created document, or `undefined` if creation failed.
   * @since 0.1.0
   */
  createNewNote(title?: string, parentId?: string | null): Promise<DocumentItem | undefined>;

  /**
   * Creates a new document of any archetype (note, canvas, custom extension document).
   *
   * @param title - Initial title for the document.
   * @param parentId - Optional parent folder ID for nesting.
   * @param docType - Document type identifier (default: 'base').
   * @returns The created document, or `undefined` if creation failed.
   * @since 0.2.0
   */
  createNewDocument(
    title?: string,
    parentId?: string | null,
    docType?: string
  ): Promise<DocumentItem | undefined>;

  /**
   * Backwards-compatible convenience helper for creating canvas documents.
   * @since 0.2.0
   */
  createNewCanvas(): Promise<DocumentItem | undefined>;

  /**
   * Sets the active document by its ID, loading its content into the active editor.
   *
   * @param docId - The document's unique identifier.
   * @since 0.1.0
   */
  openDocument(docId: string): Promise<void>;

  /**
   * Persists document content to the database.
   *
   * @param docId - The document's unique identifier.
   * @param contentJson - Serialized TipTap JSON content.
   * @param title - Optional updated title.
   * @since 0.1.0
   */
  saveDocument(docId: string, contentJson: string, title?: string): Promise<void>;

  /**
   * Permanently deletes a document from the Hearth.
   *
   * @param docId - The document's unique identifier.
   * @since 0.1.0
   */
  deleteDocument(docId: string): Promise<void>;

  /**
   * Renames a document.
   *
   * @param docId - The document's unique identifier.
   * @param newTitle - The new title string.
   * @since 0.1.0
   */
  renameDocument(docId: string, newTitle: string): Promise<void>;

  /**
   * Toggles the bookmark status of a document.
   *
   * @param docId - The document's unique identifier.
   * @returns The new bookmark state (`true` = bookmarked, `false` = unbookmarked).
   * @since 0.2.0
   */
  toggleBookmark(docId: string): Promise<boolean>;

  /**
   * Retrieves the parsed frontmatter properties for a document.
   * Returns an empty object if the document has no properties or parsing fails.
   *
   * @param docId - The document's unique identifier.
   * @returns Parsed key-value property map.
   *
   * @example
   * ```ts
   * const props = app.vault.getDocumentProperties(docId);
   * console.log(props.tags); // ['todo', 'work']
   * ```
   *
   * @since 0.2.0
   */
  getDocumentProperties(docId: string): DocumentProperties;

  /**
   * Merges the given properties into a document's existing frontmatter.
   * Does NOT replace existing properties — pass `null` or `undefined` values to delete specific keys.
   *
   * @param docId - The document's unique identifier.
   * @param properties - Key-value pairs to merge into the document's properties.
   *
   * @example
   * ```ts
   * await app.vault.updateDocumentProperties(docId, {
   *   status: 'done',
   *   temporary_tag: null, // removes key
   * });
   * ```
   *
   * @since 0.2.0
   */
  updateDocumentProperties(docId: string, properties: Partial<DocumentProperties>): Promise<void>;
}

// ─── Settings API ───────────────────────────────────────────────

/**
 * The Settings API provides access to application-level preferences
 * that affect the editor, interface, and display behavior.
 *
 * Accessed via `app.settings` inside any Plugin.
 *
 * @example
 * ```ts
 * const zoom = app.settings.zoomLevel;
 * app.settings.setZoomLevel(Math.min(200, zoom + 10));
 * ```
 *
 * @since 0.2.0
 */
export interface SettingsAPI {
  /**
   * Current UI zoom level as a percentage (50–200). Default: 100.
   * @since 0.2.0
   */
  readonly zoomLevel: number;

  /**
   * Sets the application UI zoom level percentage.
   * Clamped automatically between 50 and 200.
   *
   * @param level - Zoom percentage value.
   * @since 0.2.0
   */
  setZoomLevel(level: number): void;

  /**
   * The default view mode for newly opened tabs ('Editing view' or 'Reading view').
   * @since 0.2.0
   */
  readonly defaultTabMode: string;

  /**
   * Sets the default view mode for newly opened tabs.
   *
   * @param mode - 'Editing view' or 'Reading view'.
   * @since 0.2.0
   */
  setDefaultTabMode(mode: string): void;

  /**
   * The default editing mode when a tab is in editing view ('Live Preview' or 'Source mode').
   * @since 0.2.0
   */
  readonly defaultEditingMode: string;

  /**
   * Sets the default editing mode.
   *
   * @param mode - 'Live Preview' or 'Source mode'.
   * @since 0.2.0
   */
  setDefaultEditingMode(mode: string): void;
}

/**
 * Backwards compatibility alias for HearthAPI.
 * @since 0.1.0
 */
export type VaultAPI = HearthAPI;

