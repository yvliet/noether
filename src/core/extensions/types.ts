/**
 * @module ExtensionTypes
 * @description
 * TypeScript interfaces and type definitions for Flint's extension architecture.
 * Defines manifests, extension points, registry contracts, and UI slot configurations.
 *
 * @since 0.2.0
 */

import React from 'react';
import type { Extension as TiptapExtension } from '@tiptap/react';
import type { Plugin as ProseMirrorPlugin, EditorState } from '@tiptap/pm/state';
import type { DecorationSet } from '@tiptap/pm/view';
import type { InputRule } from '@tiptap/core';
import type { NodeViewRenderer } from '@tiptap/react';
import type { z } from 'zod';
import type { FlintApp } from '../app/FlintApp';
import type { DocumentItem, TabItem } from '@/types';

/**
 * Handle representing a disposable resource (event listener, registry item, etc.).
 * Calling `dispose()` unregisters or cleans up the underlying resource.
 * @since 0.1.0
 */
export interface Disposable {
  dispose: () => void;
}

/**
 * Manifest metadata describing an extension's identity, author, version, and capabilities.
 * Every extension must declare a static manifest conforming to this interface.
 * @since 0.2.0
 */
export interface ExtensionManifest {
  /** Unique, slugified extension identifier (e.g., 'backlinks', 'my-custom-extension'). */
  id: string;
  /** Human-readable display name of the extension. */
  name: string;
  /** SemVer version string (e.g., '1.0.0'). */
  version: string;
  /** Minimum Flint host application version required. */
  minAppVersion?: string;
  /** Short summary of what the extension does. */
  description: string;
  /** Author or maintainer name. */
  author?: string;
  /** URL to the author's profile or website. */
  authorUrl?: string;
  /** Whether this extension is bundled as a built-in core extension. */
  isCore?: boolean;
  /** Icon identifier or custom React node for the extension card. */
  icon?: string | React.ReactNode;
  /** Full Markdown readme documentation content. */
  readme?: string;
  /** URL or asset path to a banner illustration image. */
  bannerImage?: string;
  /** Discovery and categorization tags. */
  tags?: string[];
}

/** Backwards compatibility alias */
export type PluginManifest = ExtensionManifest;

/**
 * Defines a custom settings tab rendered in the application settings modal.
 * @since 0.2.0
 */
export interface ExtensionSettingTab {
  /** Unique tab identifier. */
  id: string;
  /** Title shown in the settings sidebar navigation list. */
  name: string;
  /** Owning extension identifier. */
  extensionId?: string;
  /** Legacy plugin ID alias */
  pluginId?: string;
  /** Optional icon displayed next to the tab name. */
  icon?: React.ReactNode;
  /** Render function returning the tab's settings UI panel. */
  render: () => React.ReactNode;
}

/** Backwards compatibility alias */
export type PluginSettingTab = ExtensionSettingTab;

/**
 * Defines a command executable via the command palette or keyboard shortcuts.
 * @since 0.1.0
 */
export interface CommandItem {
  /** Unique command identifier. */
  id: string;
  /** Display title shown in the command palette. */
  title: string;
  /** Grouping section name (e.g., 'Navigation', 'Editor', 'Files'). */
  section?: string;
  /** Icon displayed next to the command title. */
  icon?: React.ReactNode;
  /** Keyboard shortcut combo string (e.g., 'Ctrl+Shift+B', 'Alt+.'). */
  hotkey?: string;
  /** Whether the hotkey should fire even when an input/textarea element has focus. */
  allowInInput?: boolean;
  /** Handler function executed when the command is triggered. */
  action: (app: FlintApp) => void | Promise<void>;
  /** Optional predicate determining if the command should appear in the palette. */
  isVisible?: (app: FlintApp) => boolean;
}

/**
 * Defines an icon item rendered in the left action rail bar.
 * @since 0.2.0
 */
export interface ActionRailItem {
  /** Unique action rail item identifier. */
  id: string;
  /** Tooltip title shown on hover. */
  title: string;
  /** Icon element rendered in the action rail slot. */
  icon: React.ReactNode;
  /** Display ordering priority (lower numbers appear higher). */
  order?: number;
  /** Optional notification badge count or indicator dot. */
  badge?: string | number | null;
  /** Whether this button is currently in an active/highlighted state. */
  isActive?: boolean | ((app: FlintApp) => boolean);
  /** Handler function executed when the action rail item is clicked. */
  onClick: (app: FlintApp) => void | Promise<void>;
}

/** Backwards compatibility alias */
export type RibbonItem = ActionRailItem;

/**
 * Defines a status bar widget rendered in the bottom information bar.
 * @since 0.1.0
 */
export interface StatusBarItem {
  /** Unique status bar item identifier. */
  id: string;
  /** Placement alignment along the status bar ('left' or 'right', default: 'right'). */
  alignment?: 'left' | 'right';
  /** Display ordering priority. */
  order?: number;
  /** Render function returning the widget's React node. */
  render: (app: FlintApp) => React.ReactNode;
}

/**
 * Defines a full workspace view type rendered in the main tab area.
 * @since 0.1.0
 */
export interface ViewDefinition {
  /** Unique view type identifier (e.g., 'graph', 'canvas', 'marketplace'). */
  type: string;
  /** Default display title for tabs running this view. */
  title: string;
  /** Optional tab icon for tabs running this view. */
  icon?: React.ReactNode;
  /** Owning extension identifier. */
  extensionId?: string;
  /** Legacy owning plugin identifier. */
  pluginId?: string;
  /** Render function for the view content. */
  render: (props: { tabId?: string; documentId?: string; app: FlintApp }) => React.ReactNode;
}

/**
 * Defines a tab panel rendered inside the left or right sidebar container.
 * @since 0.1.0
 */
export interface SidebarTabDefinition {
  /** Unique sidebar tab identifier. */
  id: string;
  /** Display title shown in tooltips and headers. */
  title: string;
  /** Icon element rendered in the sidebar switcher. */
  icon: React.ReactNode;
  /** Which sidebar container to place this tab in. */
  side: 'left' | 'right';
  /** Display ordering priority. */
  order?: number;
  /** Render function returning the sidebar tab contents. */
  render: (app: FlintApp) => React.ReactNode;
}

/**
 * Defines an autocomplete slash command in the TipTap rich text editor.
 * @since 0.1.0
 */
export interface SlashCommandDefinition {
  /** Title of the command displayed in the slash menu list. */
  title: string;
  /** Short description explaining what content or block this inserts. */
  description: string;
  /** Icon displayed next to the slash command. */
  icon: string | React.ReactNode;
  /** Optional badge label (e.g., 'New', 'Pro'). */
  badge?: string;
  /** Optional submenu flyout definition for auxiliary item selection (e.g. icon picker, table picker) */
  submenu?: {
    id: string;
    render: (props: { ref?: React.Ref<any>; onSelect: (extra?: any) => void; onClose: () => void }) => React.ReactNode;
    onKeyDown?: (event: KeyboardEvent) => boolean;
  };
  /** Optional predicate to conditionally show or hide this command */
  isEnabled?: () => boolean;
  /** Execution callback receiving the TipTap editor instance and cursor range. */
  command: (params: { editor: any; range: { from: number; to: number }; [key: string]: any }) => void;
}

/**
 * Defines a header widget rendered above the note content in the editor view.
 * @since 0.1.0
 */
export interface DocumentHeaderDefinition {
  /** Unique header widget identifier. */
  id: string;
  /** Display ordering priority. */
  order?: number;
  /** Optional predicate or boolean indicating whether this header starts folded by default. */
  defaultFolded?: boolean | ((app: FlintApp, docId?: string) => boolean);
  /** Render function returning the header component. */
  render: (props: {
    documentId: string;
    document?: DocumentItem;
    mode: 'Visible' | 'Source';
    isFolded?: boolean;
    app: FlintApp;
  }) => React.ReactNode;
}

/**
 * Defines a footer widget rendered below the note content in the editor view.
 * @since 0.1.0
 */
export interface DocumentFooterDefinition {
  /** Unique footer widget identifier. */
  id: string;
  /** Display ordering priority. */
  order?: number;
  /** Render function returning the footer component. */
  render: (props: {
    documentId: string;
    documentTitle?: string;
    document?: DocumentItem;
    app: FlintApp;
  }) => React.ReactNode;
}

/**
 * Defines an action item in the document header dropdown menu ("...").
 * @since 0.1.0
 */
export interface DocMenuActionDefinition {
  /** Unique action identifier. */
  id: string;
  /** Label text shown in the dropdown menu. */
  title: string;
  /** Optional icon displayed alongside the label. */
  icon?: React.ReactNode;
  /** Display ordering priority within its group. */
  order?: number;
  /** Menu group section name. */
  group?: 'primary' | 'views' | 'tools' | 'danger' | 'linked-view' | 'universal';
  /** Optional submenu identifier for nesting. */
  submenu?: string;
  /** If true, the action is disabled when no document is active. */
  requiresDoc?: boolean;
  /** Whether the menu item shows a checked checkmark icon. */
  isChecked?: boolean | ((app: FlintApp, doc: DocumentItem | null) => boolean);
  /** Optional visibility filter predicate. */
  isVisible?: (app: FlintApp, doc: DocumentItem | null) => boolean;
  /** Handler function invoked when clicked. */
  onClick: (app: FlintApp, doc: DocumentItem | null) => void | Promise<void>;
}

/**
 * Defines a quick-action button in the file tree navigation header.
 * @since 0.1.0
 */
export interface FileTreeActionDefinition {
  /** Unique action identifier. */
  id: string;
  /** Tooltip label shown on hover. */
  title: string;
  /** Icon element rendered for the action button. */
  icon: React.ReactNode;
  /** Display ordering priority. */
  order?: number;
  /** Handler function invoked when clicked. */
  onClick: (app: FlintApp) => void | Promise<void>;
}

/**
 * Defines an empty-editor placeholder hint message.
 * @since 0.1.0
 */
export interface EditorPlaceholderHint {
  /** Unique placeholder hint identifier. */
  id: string;
  /** Hint string displayed when the editor is blank. */
  hint: string;
  /** Display ordering priority. */
  order?: number;
}

/**
 * Target UI scope for contextual right-click menus.
 * @since 0.1.0
 */
export type ContextMenuScope =
  | 'file-tree'
  | 'file-tree-root'
  | 'editor'
  | 'tab'
  | 'bookmark'
  | 'universal'
  | string;

/**
 * Defines a context menu action item for right-click menus.
 * @since 0.1.0
 */
export interface ContextMenuItemDefinition {
  /** Unique menu item identifier. */
  id: string;
  /** Item rendering type. Default is 'item'. */
  type?: 'item' | 'separator' | 'header';
  /** Text label displayed in the context menu. */
  title?: string;
  /** Optional icon element. */
  icon?: React.ReactNode;
  /** Optional keyboard shortcut hint text (e.g., 'Ctrl+C'). */
  shortcut?: string;
  /** Scope(s) where this context menu item should be active. */
  scope?: ContextMenuScope | ContextMenuScope[];
  /** Display ordering priority. */
  order?: number;
  /** Menu group category. */
  group?: 'primary' | 'tools' | 'views' | 'edit' | 'navigation' | 'danger' | 'plugin' | 'extension' | string;
  /** Nested submenu items. */
  submenu?: ContextMenuItemDefinition[];
  /** Whether the item is currently disabled. */
  disabled?: boolean | ((app: FlintApp, data?: unknown) => boolean);
  /** Whether the item renders a checkmark. */
  checked?: boolean | ((app: FlintApp, data?: unknown) => boolean);
  /** Whether the item uses destructive/danger styling. */
  isDanger?: boolean;
  /** Visibility filter predicate. */
  isVisible?: (app: FlintApp, data?: unknown) => boolean;
  /** Handler function invoked when clicked. */
  onClick?: (app: FlintApp, data?: unknown) => void | Promise<void>;
  /** Custom interactive submenu component rendered next to the menu item. */
  customSubmenu?:
    | React.ReactNode
    | ((context: { app: FlintApp; data?: unknown; onClose: () => void }) => React.ReactNode);
}

/**
 * Defines a global application modal dialogue.
 * @since 0.1.0
 */
export interface ModalDefinition {
  /** Unique modal identifier. */
  id: string;
  /** Render function returning the modal dialog component. */
  render: (app: FlintApp) => React.ReactNode;
}

/**
 * Factory function creating a TipTap / ProseMirror extension.
 * @since 0.1.0
 */
export type TiptapExtensionFactory = () => TiptapExtension | any;

/**
 * Defines a custom frontmatter property data type handler.
 * @since 0.1.0
 */
export interface PropertyTypeDefinition {
  /** Unique property type identifier. */
  id: string;
  /** Predicate matching frontmatter property key names to this type. */
  matchKey: (key: string) => boolean;
  /** Custom display formatting function for rendered property values. */
  formatDisplay?: (value: unknown) => string;
  /** Parser function converting raw user text input into structured property value. */
  parseInput?: (input: string) => unknown;
  /** Placeholder text shown in the property input field. */
  placeholder?: string;
}

/**
 * Filter predicate determining whether specific frontmatter properties should be hidden.
 * @since 0.1.0
 */
export interface PropertyFilterDefinition {
  /** Unique filter identifier. */
  id: string;
  /** Predicate returning true if the property should be hidden from standard views. */
  shouldHideProperty: (
    key: string,
    value: unknown,
    context: { docId: string; properties: Record<string, unknown> }
  ) => boolean;
}

/**
 * Defines a custom icon mapping for frontmatter property keys.
 * @since 0.1.0
 */
export interface PropertyIconDefinition {
  /** Unique property icon identifier. */
  id: string;
  /** Human-readable property category name. */
  name: string;
  /** Grouping category. */
  category?: string;
  /** Search keywords for property icon pickers. */
  keywords?: string[];
  /** React component rendering the icon. */
  component: React.ComponentType<{ size?: number; className?: string }>;
  /** Default frontmatter key names associated with this icon. */
  defaultKeys?: string[];
}

/**
 * Defines a custom virtual folder or section injected into the file tree sidebar.
 * @since 0.1.0
 */
export interface FileTreeSectionDefinition {
  /** Unique section identifier. */
  id: string;
  /** Display ordering priority. */
  order?: number;
  /** Render function returning the custom tree section. */
  render: (props: {
    documents: DocumentItem[];
    sortOrder: string;
    app: FlintApp;
  }) => React.ReactNode;
}

/**
 * Context provided to file tree item decorators.
 * @since 0.2.0
 */
export interface FileTreeDecoratorContext {
  /** The target document being rendered. */
  doc: DocumentItem;
  /** Currently active tab, if any. */
  activeTab?: TabItem | null;
  /** Host application instance. */
  app: FlintApp;
  /** Whether the folder node is currently open/expanded. */
  isOpen?: boolean;
}

/**
 * Decorator modifying how individual document nodes render in the file tree.
 * @since 0.1.0
 */
export interface FileTreeItemDecorator {
  /** Unique decorator identifier. */
  id: string;
  /** Suppresses the standard document node active/selected highlight. */
  suppressHighlight?: (doc: DocumentItem, context?: FileTreeDecoratorContext) => boolean;
  /** Suppresses inline title editing for specific document nodes. */
  suppressEditing?: (doc: DocumentItem, context?: FileTreeDecoratorContext) => boolean;
  /** Injects prefix elements before the document name. */
  renderPrefix?: (doc: DocumentItem, context?: FileTreeDecoratorContext) => React.ReactNode;
  /** Injects suffix elements after the document name. */
  renderSuffix?: (doc: DocumentItem, context?: FileTreeDecoratorContext) => React.ReactNode;
  /** Custom icon element or renderer for document or folder nodes in the file tree. */
  renderIcon?: (
    doc: DocumentItem,
    context: FileTreeDecoratorContext & {
      isOpen: boolean;
      defaultIcon: React.ReactNode;
      toggleOpen: () => void;
    }
  ) => React.ReactNode | null | undefined;
}

/**
 * Decorator modifying how workspace tabs render in the top window tab bar.
 * @since 0.2.0
 */
export interface TabDecoratorDefinition {
  /** Unique tab decorator identifier. */
  id: string;
  /** Sorting order priority (higher orders execute first). */
  order?: number;
  /** Predicate determining if this decorator applies to the given tab. */
  matches?: (tab: TabItem, doc: DocumentItem | null) => boolean;
  /** Computes the custom display title shown on the tab. */
  getDisplayTitle?: (tab: TabItem, doc: DocumentItem | null) => string | undefined;
  /** Computes the custom icon element shown on the tab. */
  getIcon?: (tab: TabItem, doc: DocumentItem | null, isActive: boolean) => React.ReactNode | undefined;
  /** Computes the tooltip description when hovering the tab. */
  getTooltip?: (tab: TabItem, doc: DocumentItem | null) => string | undefined;
  /** Computes an optional badge or indicator element on the tab. */
  getBadge?: (tab: TabItem, doc: DocumentItem | null) => React.ReactNode | undefined;
}

/**
 * Interactive breadcrumb segment item for the document subheader.
 * @since 0.2.0
 */
export interface BreadcrumbItem {
  /** Segment identifier (e.g. folder ID, virtual parent ID, or document ID). */
  id: string;
  /** Segment title text. */
  title: string;
  /** Whether this segment acts as a folder or collection. */
  isFolder?: boolean;
  /** Optional icon displayed before the segment text. */
  icon?: React.ReactNode;
  /** Custom click handler executed when the breadcrumb segment is clicked. */
  onClick?: (app: FlintApp, event: React.MouseEvent) => void;
  /** Custom CSS class names applied to the segment. */
  className?: string;
}

/**
 * Provider customizing the breadcrumb trail and title for documents in the editor subheader.
 * @since 0.2.0
 */
export interface BreadcrumbProviderDefinition {
  /** Unique breadcrumb provider identifier. */
  id: string;
  /** Sorting order priority. */
  order?: number;
  /** Predicate determining if this provider should format the given document/tab. */
  matches: (context: { tab?: TabItem; doc: DocumentItem; isSplit?: boolean }) => boolean;
  /** Computes the custom list of breadcrumb items. */
  getBreadcrumbs: (context: {
    tab?: TabItem;
    doc: DocumentItem;
    defaultBreadcrumbs: { id: string; title: string; isFolder: boolean }[];
    app: FlintApp;
  }) => BreadcrumbItem[] | undefined;
  /** Optional title override displayed in the header / subheader. */
  getTitleOverride?: (context: {
    tab?: TabItem;
    doc: DocumentItem;
    defaultTitle: string;
  }) => string | undefined;
}

/**
 * Context provided when evaluating breadcrumb item decorators.
 * @since 0.3.0
 */
export interface BreadcrumbDecoratorContext {
  tab?: TabItem;
  doc: DocumentItem;
  item: BreadcrumbItem;
  index: number;
  total: number;
  app: FlintApp;
}

/**
 * Decorator customizing individual breadcrumb items in the document subheader.
 * @since 0.3.0
 */
export interface BreadcrumbDecoratorDefinition {
  /** Unique decorator identifier. */
  id: string;
  /** Sorting order priority (higher orders execute first). */
  order?: number;
  /** Predicate determining if this decorator applies to the segment. */
  matches?: (item: BreadcrumbItem, context: BreadcrumbDecoratorContext) => boolean;
  /** Optional icon rendered immediately before the breadcrumb item text. */
  renderIcon?: (item: BreadcrumbItem, context: BreadcrumbDecoratorContext) => React.ReactNode | undefined;
  /** Optional prefix rendered before the item. */
  renderPrefix?: (item: BreadcrumbItem, context: BreadcrumbDecoratorContext) => React.ReactNode | undefined;
  /** Optional suffix rendered after the item. */
  renderSuffix?: (item: BreadcrumbItem, context: BreadcrumbDecoratorContext) => React.ReactNode | undefined;
}

/**
 * Context provided when evaluating document title decorators.
 * @since 0.3.0
 */
export interface DocumentTitleDecoratorContext {
  doc: DocumentItem;
  tab?: TabItem;
  app: FlintApp;
  isReadingMode: boolean;
}

/**
 * Decorator customizing the document title header in the editor.
 * @since 0.3.0
 */
export interface DocumentTitleDecoratorDefinition {
  /** Unique decorator identifier. */
  id: string;
  /** Sorting order priority (higher orders execute first). */
  order?: number;
  /** Predicate determining if this decorator applies to the current document/context. */
  matches?: (context: DocumentTitleDecoratorContext) => boolean;
  /** Content rendered immediately to the left of the title (e.g. note icon). */
  renderPrefix?: (context: DocumentTitleDecoratorContext) => React.ReactNode | undefined;
  /** Content rendered immediately to the right of the title. */
  renderSuffix?: (context: DocumentTitleDecoratorContext) => React.ReactNode | undefined;
}

/**
 * Options passed when opening a workspace tab.
 * @since 0.2.0
 */
export interface OpenTabOptions {
  /** Explicit tab ID to create or focus. */
  id?: string;
  /** Title override for the tab. */
  title?: string;
  /** View type identifier. */
  viewType?: string;
  /** View mode identifier. */
  viewMode?: string;
  /** Custom icon for the tab. */
  icon?: React.ReactNode;
  /** Extension-provided contextual metadata stored on the tab. */
  metadata?: Record<string, unknown>;
  /** Whether to replace the currently active tab if it is an empty new tab. Defaults to true. */
  replaceCurrentEmpty?: boolean;
  /**
   * Whether to replace the page in the currently active tab instead of creating a new tab.
   * Defaults to true for standard in-app navigation (such as clicking notes in the nav sidebar).
   */
  replaceCurrentTab?: boolean;
  /**
   * Explicitly force creating a new tab even if replaceCurrentTab would otherwise apply.
   * Used for actions like "Open in new tab", middle-clicks, or tab bar "+" clicks.
   */
  newTab?: boolean;
}

/**
 * JSON Schema for MCP tool input parameters.
 * Follows the MCP 2024-11-05 specification for tool definition schemas.
 * @since 0.3.0
 */
export interface McpJsonSchema {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    enum?: string[];
    items?: Record<string, unknown>;
    default?: unknown;
  }>;
  required?: string[];
}

/**
 * Individual content block in an MCP tool result.
 * @since 0.3.0
 */
export type McpContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: { uri: string; text?: string } };

/**
 * Standard result returned from an MCP tool execution.
 * @since 0.3.0
 */
export interface McpToolResult {
  content: McpContentBlock[];
  isError?: boolean;
}

/**
 * MCP Tool registration definition.
 * Extensions register tools via `this.registerTool()` in their `onload()` method.
 * Tools are automatically unregistered when the extension is disabled or unloaded.
 *
 * Why generic `Record<string, unknown>` for handler args instead of typed generics:
 * MCP tool calls arrive as untyped JSON from external agents — the handler must
 * validate and cast at runtime regardless. This keeps the registry type-simple
 * while handlers remain fully type-safe internally.
 *
 * @since 0.3.0
 */
export interface McpToolDefinition {
  /** Unique tool name (auto-prefixed with extensionId_ by Extension.registerTool) */
  name: string;
  /** Description explaining to the LLM when and how to call this tool */
  description: string;
  /** JSON Schema defining the tool's input parameters */
  parameters: McpJsonSchema;
  /** Async execution handler */
  handler: (args: Record<string, unknown>, app: FlintApp) => Promise<McpToolResult>;
  /** Owning extension identifier (set automatically by Extension.registerTool) */
  extensionId?: string;
  /** Tool category for grouping in UI (e.g. 'documents', 'search', 'graph') */
  category?: string;
  /** If true, in-app agent UI should require user confirmation before executing */
  isDestructive?: boolean;
}

/**
 * Parameter/argument definition for an MCP prompt template.
 * @since 0.3.0
 */
export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

/**
 * Message block returned by an MCP prompt template evaluation.
 * @since 0.3.0
 */
export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

/**
 * Result returned from evaluating an MCP prompt template.
 * @since 0.3.0
 */
export interface McpPromptResult {
  description?: string;
  messages: McpPromptMessage[];
  isError?: boolean;
}

/**
 * MCP Prompt template registration definition.
 * Extensions and core systems can register reusable prompt workflows for AI agents.
 * @since 0.3.0
 */
export interface McpPromptDefinition {
  /** Unique prompt name (e.g. 'flint_agent_guide', 'flint_daily_review') */
  name: string;
  /** Human-readable description explaining what this prompt accomplishes */
  description?: string;
  /** Arguments accepted by the prompt template */
  arguments?: McpPromptArgument[];
  /** Handler producing prompt messages populated with live application context */
  getMessages: (args: Record<string, string>, app: FlintApp) => Promise<McpPromptResult> | McpPromptResult;
  /** Owning extension identifier */
  extensionId?: string;
}

// ── Dynamic UI Layering & Portal Slot Contracts ──

/**
 * Designated UI injection locations for React Portal slots.
 * @since 0.4.0
 */
export type PortalSlotLocation =
  | 'editor:viewport-overlay'
  | 'editor:floating-toolbar'
  | 'editor:minimap'
  | 'editor:gutter'
  | 'workspace:root'
  | (string & {});

/**
 * Contextual state provided to Portal Slot render functions.
 * @since 0.4.0
 */
export interface PortalSlotContext {
  /** Reference to host FlintApp instance */
  app: FlintApp;
  /** Active note identifier, if mounted within an editor */
  documentId?: string;
  /** Current document record */
  document?: DocumentItem | null;
  /** Active TipTap Editor instance */
  editor?: any;
  /** Current editor view mode ('Visible' for Live Preview, 'Source' for Raw Markdown) */
  viewMode?: 'Visible' | 'Source';
  /** Bounding client rectangle of the host container */
  containerRect?: DOMRect;
  /** Scrollable DOM container element of the active viewport */
  scrollContainer?: HTMLElement | null;
}

/**
 * Configuration for registering a declarative UI portal slot.
 * @since 0.4.0
 */
export interface PortalSlotDefinition {
  /** Unique slot item identifier */
  id: string;
  /** Anchor slot target where the component should be mounted */
  slot: PortalSlotLocation;
  /** Sorting order priority (higher numbers render on top) */
  order?: number;
  /** Optional predicate determining if the slot item should be active */
  predicate?: (context: PortalSlotContext) => boolean;
  /** Render function returning the React element */
  render: (context: PortalSlotContext) => React.ReactNode;
}

// ── Native ProseMirror / TipTap Extension Contracts ──

/**
 * Context provided to community editor plugins during active editor lifecycle.
 * @since 0.4.0
 */
export interface EditorPluginContext {
  app: FlintApp;
  documentId: string;
  editor: any;
}

/**
 * Declarative registration for native ProseMirror plugins, decorations, input rules, and NodeViews.
 * @since 0.4.0
 */
export interface EditorPluginDefinition {
  /** Unique editor plugin identifier */
  id: string;
  /** Optional human-readable name */
  name?: string;
  /** Factory returning native ProseMirror Plugin instances */
  proseMirrorPlugins?: (context: EditorPluginContext) => ProseMirrorPlugin[];
  /** High-performance dynamic decoration generator mapped across transactions */
  decorations?: (state: EditorState, context: EditorPluginContext) => DecorationSet | null | undefined;
  /** Custom TipTap / React NodeView renderers for custom block or inline nodes */
  nodeViews?: Record<string, NodeViewRenderer>;
  /** Custom input rules for pattern-triggered markdown transformations */
  inputRules?: (context: EditorPluginContext) => InputRule[];
  /** Custom paste rules for clipboard content transformation */
  pasteRules?: (context: EditorPluginContext) => any[];
  /** Hotkey shortcut handlers intercepted before default editor actions */
  keyboardShortcuts?: Record<string, (context: { editor: any; event: KeyboardEvent }) => boolean>;
}

// ── Declarative Schema & Migration Builder Contracts ──

/**
 * Supported column data types in Flint's relational SQLite database.
 * @since 0.4.0
 */
export type ColumnDataType = 'text' | 'integer' | 'real' | 'blob' | 'boolean' | 'json';

/**
 * Column definition specification for declarative table creation.
 * @since 0.4.0
 */
export interface ColumnDefinition {
  type: ColumnDataType;
  primaryKey?: boolean;
  nullable?: boolean;
  default?: string | number | boolean | null;
  unique?: boolean;
  indexed?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'cascade' | 'set null' | 'restrict';
  };
}

/**
 * Secondary index definition for declarative tables.
 * @since 0.4.0
 */
export interface TableIndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

/**
 * Migration helper passed to versioned migration functions.
 * @since 0.4.0
 */
export interface MigrationHelper {
  addColumn: (tableName: string, columnName: string, definition: ColumnDefinition) => Promise<void>;
  dropColumn?: (tableName: string, columnName: string) => Promise<void>;
  createIndex: (tableName: string, index: TableIndexDefinition) => Promise<void>;
  execute: (sql: string, params?: any[]) => Promise<void>;
}

/**
 * Declarative table configuration with automated migration and teardown specifications.
 * @since 0.4.0
 */
export interface TableDefinition<TColumns extends Record<string, ColumnDefinition> = Record<string, ColumnDefinition>> {
  tableName: string;
  version: number;
  columns: TColumns;
  indexes?: TableIndexDefinition[];
  migrations?: Record<number, (db: MigrationHelper) => Promise<void>>;
  teardownPolicy?: 'drop-on-uninstall' | 'preserve';
}

/**
 * Filter and pagination options for table queries.
 * @since 0.4.0
 */
export interface QueryOptions<T> {
  where?: Partial<T> | Record<string, any>;
  orderBy?: keyof T | string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

/**
 * Strongly typed CRUD query interface returned by `this.defineTable()`.
 * @since 0.4.0
 */
export interface ExtensionTable<TRecord extends Record<string, any>> {
  insert(record: Partial<TRecord>): Promise<void>;
  insertMany(records: Partial<TRecord>[]): Promise<void>;
  select(options?: QueryOptions<TRecord>): Promise<TRecord[]>;
  selectOne(options?: QueryOptions<TRecord>): Promise<TRecord | null>;
  update(where: Partial<TRecord>, patch: Partial<TRecord>): Promise<number>;
  delete(where: Partial<TRecord>): Promise<number>;
  count(where?: Partial<TRecord>): Promise<number>;
  rawQuery<R = any>(sql: string, params?: any[]): Promise<R[]>;
}

// ── Type-Safe Zod-to-MCP Tool Contracts ──

/**
 * Type-safe MCP tool registration definition accepting a Zod schema for input validation.
 * @since 0.4.0
 */
export interface McpZodToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  extensionId?: string;
  description: string;
  category?: string;
  isDestructive?: boolean;
  schema: TSchema;
  handler: (params: z.infer<TSchema>, app: FlintApp) => Promise<McpToolResult>;
}

// ── Background Web Worker Pipeline Contracts ──

/**
 * Specification for an off-thread task executed in a Web Worker.
 * @since 0.4.0
 */
export interface WorkerTaskDefinition<TInput = any, TOutput = any> {
  taskId: string;
  run: (input: TInput, emitEvent: (eventName: string, payload: any) => void) => Promise<TOutput> | TOutput;
}

/**
 * Dispatch options for running off-thread worker tasks.
 * @since 0.4.0
 */
export interface RunTaskOptions {
  priority?: 'background' | 'user-blocking';
  timeoutMs?: number;
}


