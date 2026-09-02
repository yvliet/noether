/**
 * @file folderIconsCatalog.tsx
 * @description
 * Re-exports the unified Flint icon catalog for the Folder Icons extension.
 * Guarantees zero code duplication and synchronizes available icons across the entire app.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

export {
  UNIFIED_ICONS_CATALOG as FOLDER_ICONS_CATALOG,
  UNIFIED_ICON_MAP as FOLDER_ICON_MAP,
  getUnifiedIconDef as getFolderIconDef,
  renderUnifiedIcon as renderFolderIcon,
} from '@/components/common/IconPicker';

export type {
  IconCategory as FolderIconCategory,
  CatalogIconDefinition as FolderIconDefinition,
} from '@/components/common/IconPicker';
