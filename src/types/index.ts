/**
 * @module CoreTypes
 * @description
 * Core domain models, state schemas, and host runtime types for Flint.
 * Maintained strictly isolated from extension-specific models to preserve
 * a pristine, modular native core architecture.
 */

export interface DocumentItem {
  id: string;
  parent_id: string | null;
  title: string;
  content_json?: string; // TipTap JSON string
  is_daily_note: number; // 0 or 1
  is_folder: number; // 0 or 1
  is_bookmarked?: number; // 0 or 1
  doc_type?: string;
  properties?: string; // JSON string of frontmatter / note properties
  created_at: number;
  updated_at: number;
}

export type DocumentMetaItem = Omit<DocumentItem, 'content_json'>;

export interface TrashItem {
  id: string;
  original_id: string;
  parent_id: string | null;
  title: string;
  content_json: string;
  is_daily_note: number;
  is_folder: number;
  is_bookmarked?: number;
  doc_type?: string;
  properties?: string;
  deleted_at: number;
  original_path?: string;
}

export interface DocumentProperties {
  aliases?: string[];
  tags?: string[];
  cssclasses?: string[];
  [key: string]: any;
}

export interface TagItem {
  tag: string;
  count: number;
  docIds: string[];
  docs: { id: string; title: string }[];
}

export interface TagTreeNode {
  name: string;
  fullPath: string;
  count: number;
  children: TagTreeNode[];
  docs: { id: string; title: string }[];
}

export interface OutgoingLinkItem {
  link_text: string;
  target_document_id: string | null;
  exists: boolean;
  snippet?: string;
}

export interface UnlinkedMentionItem {
  source_document_id: string;
  source_document_title: string;
  snippet: string;
  match_text: string;
  updated_at: number;
}

export interface BlockItem {
  id: string;
  document_id: string;
  parent_block_id: string | null;
  content_text: string;
  block_type: string;
  order_index: number;
  is_task: number;
  task_completed: number;
}

export interface DocumentLink {
  source_document_id: string;
  target_document_id: string;
  link_text: string;
}

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  pos: number;
}

export interface BacklinkItem {
  source_document_id: string;
  source_document_title: string;
  link_text: string;
  snippet: string;
  updated_at: number;
}

export interface TabItem {
  id: string;
  document_id: string;
  title: string;
  view_mode?: MainViewMode;
  view_type?: string;
  icon?: any;
  is_pinned?: boolean;
  metadata?: Record<string, any>;
}

export interface GlobalTaskItem {
  id: string;
  document_id: string;
  document_title: string;
  text: string;
  completed: boolean;
}

export type MainViewMode = string;
export type SidebarTab = string;
export type LeftNavView = string;

export interface HearthDiskItem {
  relativePath: string;
  name: string;
  isFolder: boolean;
  mtime: number;
  content?: string;
}

export interface RecentHearthItem {
  path: string;
  name: string;
  lastOpened: number;
}

// Backwards compatibility aliases
export type VaultDiskItem = HearthDiskItem;
export type RecentVaultItem = RecentHearthItem;

declare global {
  interface Window {
    electronAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized?: () => Promise<boolean>;
      isMaximizedSync?: () => boolean;
      onMaximizedChange?: (callback: (isMaximized: boolean) => void) => () => void;
      // Hearth & Vault window controls
      openHearthWindow?: () => Promise<{ success: boolean }>;
      closeHearthWindow?: () => Promise<{ success: boolean }>;
      openVaultWindow?: () => Promise<{ success: boolean }>;
      closeVaultWindow?: () => Promise<{ success: boolean }>;
      openSettingsWindow?: () => Promise<{ success: boolean }>;
      closeSettingsWindow?: () => Promise<{ success: boolean }>;
      // General-purpose global hotkeys and window focus
      registerGlobalShortcut?: (id: string, shortcut: string) => Promise<{ success: boolean }>;
      unregisterGlobalShortcut?: (id: string) => Promise<{ success: boolean }>;
      onGlobalShortcut?: (callback: (id: string) => void) => () => void;
      focusMainWindow?: () => Promise<{ success: boolean }>;
      // Hearth event subscriptions
      onHearthChanged?: (callback: (hearth: { path: string; name: string; recentHearths: RecentHearthItem[] }) => void) => () => void;
      onHearthFilesChanged?: (callback: () => void) => () => void;
      onVaultChanged?: (callback: (vault: { path: string; name: string; recentVaults: RecentVaultItem[] }) => void) => () => void;
      onVaultFilesChanged?: (callback: () => void) => () => void;
      // Hearth operations
      getCurrentHearth?: () => Promise<{ path: string; name: string; recentHearths: RecentHearthItem[] }>;
      getCurrentVault?: () => Promise<{ path: string; name: string; recentVaults: RecentVaultItem[] }>;
      selectHearthFolder?: () => Promise<{ canceled: boolean; path?: string; name?: string; recentHearths?: RecentHearthItem[] }>;
      selectVaultFolder?: () => Promise<{ canceled: boolean; path?: string; name?: string; recentVaults?: RecentVaultItem[] }>;
      selectParentFolder?: () => Promise<{ canceled: boolean; path?: string }>;
      createNewHearth?: (name: string, parentPath: string) => Promise<{ success: boolean; path: string; name: string; recentHearths: RecentHearthItem[]; error?: string }>;
      createNewVault?: (name: string, parentPath: string) => Promise<{ success: boolean; path: string; name: string; recentVaults: RecentVaultItem[]; error?: string }>;
      renameHearth?: (targetPath: string, newName: string) => Promise<{ success: boolean; path?: string; name?: string; recentHearths: RecentHearthItem[]; error?: string }>;
      renameVault?: (targetPath: string, newName: string) => Promise<{ success: boolean; path?: string; name?: string; recentVaults: RecentVaultItem[]; error?: string }>;
      removeRecentHearth?: (hearthPath: string) => Promise<{ success: boolean; recentHearths: RecentHearthItem[] }>;
      removeRecentVault?: (vaultPath: string) => Promise<{ success: boolean; recentVaults: RecentVaultItem[] }>;
      setCurrentHearth?: (hearthPath: string) => Promise<{ success: boolean; path: string; name: string; recentHearths: RecentHearthItem[] }>;
      setCurrentVault?: (vaultPath: string) => Promise<{ success: boolean; path: string; name: string; recentVaults: RecentVaultItem[] }>;
      openHearthInExplorer?: (hearthPath?: string) => Promise<{ success: boolean; error?: string }>;
      openVaultInExplorer?: (vaultPath?: string) => Promise<{ success: boolean; error?: string }>;
      scanHearthFiles?: (customHearthPath?: string) => Promise<HearthDiskItem[]>;
      scanVaultFiles?: (customVaultPath?: string) => Promise<VaultDiskItem[]>;
      // Database & Files
      saveDatabase?: (bytes: Uint8Array, customVaultPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      loadDatabase?: (customVaultPath?: string) => Promise<Uint8Array | ArrayBuffer | null>;
      saveMarkdownFile?: (filename: string, content: string, relativePath?: string, vaultPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      deleteMarkdownFile?: (filenameOrPath: string, vaultPath?: string) => Promise<{ success: boolean; error?: string }>;
      renameMarkdownFile?: (oldFilename: string, newFilename: string, oldRelativePath?: string, newRelativePath?: string, vaultPath?: string) => Promise<{ success: boolean; error?: string }>;
      openPluginsFolder?: () => Promise<{ success: boolean; path?: string }>;
      openExtensionsFolder?: () => Promise<{ success: boolean; path?: string }>;
      openTrashFolder?: () => Promise<{ success: boolean; path?: string; error?: string }>;
      saveTrashFile?: (filename: string, content: string, relativePath?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      deleteTrashFile?: (filenameOrPath: string) => Promise<{ success: boolean; error?: string }>;
      emptyTrashFolder?: () => Promise<{ success: boolean; error?: string }>;
      listInstalledPlugins?: () => Promise<Array<{ id: string; name: string; version: string; description: string; author: string; folder: string; isCore: boolean }>>;
      listInstalledExtensions?: () => Promise<Array<{ id: string; name: string; version: string; description: string; author: string; folder: string; isCore: boolean }>>;
      readPluginBundle?: (pluginFolder: string) => Promise<{ success: boolean; jsCode?: string; cssCode?: string; error?: string }>;
      readExtensionBundle?: (extensionFolder: string) => Promise<{ success: boolean; jsCode?: string; cssCode?: string; error?: string }>;
      setZoomFactor?: (factor: number) => void;
      getZoomFactor?: () => number;
      isElectron?: boolean;
    };
  }
}
