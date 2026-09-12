/**
 * @file moreIconsCatalog.ts
 * @description
 * Re-exports the unified Noether icon catalog for the More icons extension.
 * Guarantees zero code duplication and synchronizes available icons across the entire app.
 *
 * @author Yuliet Li
 * @since 1.2.0
 */

export {
  UNIFIED_ICONS_CATALOG as MORE_ICONS_CATALOG,
  UNIFIED_ICON_MAP as MORE_ICONS_ICON_MAP,
  getUnifiedIconDef as getMoreIconsDef,
  renderUnifiedIcon as renderMoreIcon,
  UNIFIED_ICONS_CATALOG as ICONIFY_CATALOG,
  UNIFIED_ICON_MAP as ICONIFY_ICON_MAP,
  getUnifiedIconDef as getIconifyIconDef,
  renderUnifiedIcon as renderIconifyIcon,
} from '@/components/common/IconPicker';

export type {
  IconCategory as MoreIconsCategory,
  CatalogIconDefinition as MoreIconsIconDefinition,
  IconCategory as IconifyCategory,
  CatalogIconDefinition as IconifyIconDefinition,
} from '@/components/common/IconPicker';
