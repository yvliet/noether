/**
 * @module events
 * @description
 * Strongly-typed event map for Flint's central publish-subscribe EventBus.
 * Defines all lifecycle, workspace, document, and editor events available
 * for plugins and core systems to broadcast and subscribe to.
 *
 * @since 0.1.0
 */

export interface WorkspaceEvents {
  // ── Vault Lifecycle ──
  /** Emitted after a vault is loaded and indexed. */
  'vault:loaded': { path: string; name: string };
  /** Emitted when switching active vaults. */
  'vault:changed': { path: string; name: string };

  // ── Document Lifecycle ──
  /** Emitted synchronously when a document is opened. */
  'document:opened': { id: string; title: string };
  /** Emitted synchronously after a document is saved to storage. */
  'document:saved': { id: string; title: string };
  /** Emitted synchronously after a document is deleted. */
  'document:deleted': { id: string };
  /** Emitted synchronously when a document title is renamed. */
  'document:renamed': { id: string; oldTitle: string; newTitle: string };

  // ── Workspace State ──
  /** Emitted when the active tab selection changes. */
  'tab:changed': { activeTabId: string | null };
  /** Emitted when the main view mode changes (e.g., 'document' -> 'graph'). */
  'view:mode-changed': { mode: string };

  // ── Plugin Lifecycle ──
  /** Emitted when a plugin instance has loaded. */
  'plugin:loaded': { pluginId: string };
  /** Emitted when a plugin instance has unloaded. */
  'plugin:unloaded': { pluginId: string };
  /** Emitted when a plugin is enabled. */
  'plugin:enabled': { pluginId: string };
  /** Emitted when a plugin is disabled. */
  'plugin:disabled': { pluginId: string };

  // ── Editor & Inter-Plugin Actions ──
  /**
   * Generic editor action event. Allows plugins to trigger editor-level
   * operations (like inserting blocks or navigating headings) without
   * tight coupling to ProseMirror/TipTap internals.
   * @since 0.2.0
   */
  'editor:action': { action: string; payload?: Record<string, unknown> };

  /**
   * File tree drag-and-drop or custom drop action event.
   * @since 0.2.0
   */
  'file-tree:drop': { sourceId: string; targetId: string; position?: 'inside' | 'before' | 'after' };

  // ── MCP Tool Lifecycle ──
  /** Emitted when an MCP tool is invoked by an agent or external client. */
  'mcp:tool-called': { toolName: string; args: Record<string, unknown>; source: string };
  /** Emitted after an MCP tool execution completes (success or failure). */
  'mcp:tool-result': { toolName: string; success: boolean; durationMs: number; error?: string };
  /** Emitted when the set of registered MCP tools changes (extension loaded/unloaded). */
  'mcp:tools-changed': { count: number };
}

/**
 * Event key union derived from `WorkspaceEvents`.
 * @since 0.1.0
 */
export type EventKey = keyof WorkspaceEvents;

/**
 * Callback function signature for event listeners.
 * @since 0.1.0
 */
export type EventCallback<K extends EventKey> = (data: WorkspaceEvents[K]) => void;
