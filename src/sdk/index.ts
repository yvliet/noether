/**
 * @module FlintSDK
 * @description
 * Public Extension Development Kit for Flint.
 * Re-exports the complete set of base classes, interfaces, type definitions,
 * and API contracts necessary to build rich Flint extensions.
 *
 * @example
 * ```ts
 * import { Extension, ExtensionManifest, FlintApp } from 'flint';
 *
 * export const MANIFEST: ExtensionManifest = {
 *   id: 'my-extension',
 *   name: 'My Extension',
 *   version: '1.0.0',
 *   description: 'Does something awesome',
 * };
 *
 * export default class MyExtension extends Extension {
 *   onload() {
 *     this.addCommand({
 *       id: 'say-hello',
 *       title: 'Say Hello',
 *       action: (app) => app.workspace.showToast('Hello from extension!'),
 *     });
 *   }
 * }
 * ```
 *
 * @since 0.1.0
 */

// ── Core Classes & Singletons ──
export { Extension, Plugin } from '../core/extensions/Extension';
export { ExtensionManager, PluginManager } from '../core/extensions/ExtensionManager';
export { FlintApp, appInstance } from '../core/app/FlintApp';
export { registerNativeTools } from '../core/mcp/NativeMcpTools';
export { EventBus } from '../core/events/EventBus';
export { renderHugeIconSvg } from '../components/common/Icons';
export type { IconProps, RenderHugeIconSvgOptions } from '../components/common/Icons';
export {
  IconPicker,
  UNIFIED_ICONS_CATALOG,
  UNIFIED_ICON_MAP,
  getUnifiedIconDef,
  renderUnifiedIcon,
} from '../components/common/IconPicker';
export type {
  IconCategory,
  CatalogIconDefinition,
  IconPickerProps,
  IconPickerVariant,
} from '../components/common/IconPicker';

// ── Public API Contracts ──
export type {
  WorkspaceAPI,
  HearthAPI,
  VaultAPI,
  SettingsAPI,
  ConfirmDialogConfig,
  InputDialogConfig,
  FolderPickerConfig,
} from '../core/app/apiTypes';

// ── Extension Point Types ──
export type {
  ExtensionManifest,
  PluginManifest,
  ExtensionSettingTab,
  PluginSettingTab,
  CommandItem,
  ActionRailItem,
  RibbonItem,
  StatusBarItem,
  ViewDefinition,
  SidebarTabDefinition,
  SlashCommandDefinition,
  Disposable,
  TiptapExtensionFactory,
  DocumentHeaderDefinition,
  DocumentFooterDefinition,
  DocMenuActionDefinition,
  FileTreeActionDefinition,
  EditorPlaceholderHint,
  ContextMenuItemDefinition,
  ContextMenuScope,
  ModalDefinition,
  PropertyTypeDefinition,
  PropertyFilterDefinition,
  PropertyIconDefinition,
  FileTreeSectionDefinition,
  FileTreeItemDecorator,
} from '../core/extensions/types';

// ── MCP Tool & Prompt Types ──
export type {
  McpJsonSchema,
  McpContentBlock,
  McpToolResult,
  McpToolDefinition,
  McpPromptArgument,
  McpPromptMessage,
  McpPromptResult,
  McpPromptDefinition,
} from '../core/extensions/types';

// ── Event Bus Types ──
export type { WorkspaceEvents, EventKey, EventCallback } from '../core/events/events';

// ── Core Data Model Types ──
export type {
  DocumentItem,
  DocumentMetaItem,
  TrashItem,
  DocumentProperties,
  TagItem,
  TagTreeNode,
  HeadingItem,
  BacklinkItem,
  OutgoingLinkItem,
  UnlinkedMentionItem,
  TabItem,
  GlobalTaskItem,
  MainViewMode,
  SidebarTab,
  LeftNavView,
  VaultDiskItem,
  RecentVaultItem,
} from '../types';
