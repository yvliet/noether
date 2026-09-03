/**
 * @file iconifyCatalog.ts
 * @description
 * Re-exports the unified Flint icon catalog for the Iconify extension.
 * Guarantees zero code duplication and synchronizes available icons across the entire app.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

export {
  UNIFIED_ICONS_CATALOG as ICONIFY_CATALOG,
  UNIFIED_ICON_MAP as ICONIFY_ICON_MAP,
  getUnifiedIconDef as getIconifyIconDef,
  renderUnifiedIcon as renderIconifyIcon,
} from '@/components/common/IconPicker';

export type {
  IconCategory as IconifyCategory,
  CatalogIconDefinition as IconifyIconDefinition,
} from '@/components/common/IconPicker';
