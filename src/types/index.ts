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


