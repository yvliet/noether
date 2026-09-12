/**
 * @file moreIconsDb.ts
 * @description
 * SQLite persistence layer with local cache fallback for the More icons extension.
 * Manages the dynamic `ext_more_icons` table schema, queries, mutations,
 * automatic cleanup on document/folder deletion, and seamless migration
 * from legacy `ext_iconify_icons`.
 *
 * @author Yuliet Li
 * @since 1.2.0
 */

import { dbAdapter } from '@/lib/db/adapter';
import type { TableDefinition } from '@/core/extensions/types';
import { EmojiStyle } from '@/components/common/emoji';

export type IconItemType = 'folder' | 'file' | 'other';

export interface IconRecord {
  item_id: string;
  icon_id: string;
  color?: string | null;
  item_type?: IconItemType | null;
  updated_at: number;
}

export interface IconEntry {
  iconId: string;
  color?: string;
  itemType?: IconItemType;
  updatedAt: number;
}

function getLocalStorageKey(): string {
  return 'noether_more_icons_cache_v1';
}

function getLegacyLocalStorageKey(): string {
  return 'noether_iconify_icons_cache_v1';
}

function getSettingsLocalStorageKey(): string {
  return 'noether_more_icons_settings_v1';
}

function getLegacySettingsLocalStorageKey(): string {
  return 'noether_iconify_settings_v1';
}

export interface MoreIconsSettings {
  enableFolderIcons: boolean;
  enableFileIcons: boolean;
  enableDocumentIcons: boolean;
  showDefaultFolderIcons: boolean;
  showDefaultFileIcons: boolean;
  showEditorTitleIcon: boolean;
  emojiStyle: EmojiStyle;
}

export type IconifySettings = MoreIconsSettings;

export const DEFAULT_MORE_ICONS_SETTINGS: MoreIconsSettings = {
  enableFolderIcons: true,
  enableFileIcons: true,
  enableDocumentIcons: true,
  showDefaultFolderIcons: false,
  showDefaultFileIcons: false,
  showEditorTitleIcon: true,
  emojiStyle: 'native',
};

export const DEFAULT_ICONIFY_SETTINGS = DEFAULT_MORE_ICONS_SETTINGS;

/**
 * Loads More icons settings synchronously from localStorage with legacy fallback.
 */
export function loadMoreIconsSettingsFromLocalStorage(): MoreIconsSettings {
  if (typeof window === 'undefined') return DEFAULT_MORE_ICONS_SETTINGS;
  try {
    let raw = localStorage.getItem(getSettingsLocalStorageKey());
    if (!raw) {
      raw = localStorage.getItem(getLegacySettingsLocalStorageKey());
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enableFolderIcons:
          parsed.enableFolderIcons !== undefined
            ? Boolean(parsed.enableFolderIcons)
            : DEFAULT_MORE_ICONS_SETTINGS.enableFolderIcons,
        enableFileIcons:
          parsed.enableFileIcons !== undefined
            ? Boolean(parsed.enableFileIcons)
            : DEFAULT_MORE_ICONS_SETTINGS.enableFileIcons,
        enableDocumentIcons:
          parsed.enableDocumentIcons !== undefined
            ? Boolean(parsed.enableDocumentIcons)
            : DEFAULT_MORE_ICONS_SETTINGS.enableDocumentIcons,
        showDefaultFolderIcons:
          parsed.showDefaultFolderIcons !== undefined
            ? Boolean(parsed.showDefaultFolderIcons)
            : DEFAULT_MORE_ICONS_SETTINGS.showDefaultFolderIcons,
        showDefaultFileIcons:
          parsed.showDefaultFileIcons !== undefined
            ? Boolean(parsed.showDefaultFileIcons)
            : DEFAULT_MORE_ICONS_SETTINGS.showDefaultFileIcons,
        showEditorTitleIcon:
          parsed.showEditorTitleIcon !== undefined
            ? Boolean(parsed.showEditorTitleIcon)
            : DEFAULT_MORE_ICONS_SETTINGS.showEditorTitleIcon,
        emojiStyle:
          parsed.emojiStyle && ['native', 'twemoji', 'apple', 'google', 'whatsapp'].includes(parsed.emojiStyle)
            ? (parsed.emojiStyle as EmojiStyle)
            : DEFAULT_MORE_ICONS_SETTINGS.emojiStyle,
      };
    }
  } catch {}
  return DEFAULT_MORE_ICONS_SETTINGS;
}

export const loadIconifySettingsFromLocalStorage = loadMoreIconsSettingsFromLocalStorage;

/**
 * Saves More icons settings to localStorage.
 */
export function saveMoreIconsSettingsToLocalStorage(settings: MoreIconsSettings): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(settings);
    localStorage.setItem(getSettingsLocalStorageKey(), serialized);
    localStorage.setItem(getLegacySettingsLocalStorageKey(), serialized);
  } catch {}
}

export const saveIconifySettingsToLocalStorage = saveMoreIconsSettingsToLocalStorage;

/**
 * Loads icon assignments synchronously from localStorage with legacy fallback.
 * Ensures 0ms instant display upon page load/refresh before WASM SQLite initializes.
 */
export function loadMoreIconsFromLocalStorage(): Record<string, IconEntry> {
  if (typeof window === 'undefined') return {};
  try {
    let raw = localStorage.getItem(getLocalStorageKey());
    if (!raw) {
      raw = localStorage.getItem(getLegacyLocalStorageKey());
    }
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export const loadIconifyFromLocalStorage = loadMoreIconsFromLocalStorage;

/**
 * Saves icon assignments to localStorage as a fast synchronous cache.
 */
export function saveMoreIconsToLocalStorage(
  icons: Record<string, IconEntry>
): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(icons);
    localStorage.setItem(getLocalStorageKey(), serialized);
    localStorage.setItem(getLegacyLocalStorageKey(), serialized);
  } catch {}
}

export const saveIconifyToLocalStorage = saveMoreIconsToLocalStorage;

export const MORE_ICONS_TABLE_DEFINITION: TableDefinition = {
  tableName: 'icons',
  version: 1,
  columns: {
    item_id: { type: 'text', primaryKey: true },
    icon_id: { type: 'text' },
    color: { type: 'text', nullable: true },
    item_type: { type: 'text', nullable: true },
    updated_at: { type: 'integer' },
  },
  indexes: [
    { name: 'idx_more_icons_item_id', columns: ['item_id'] },
  ],
};

export const ICONIFY_TABLE_DEFINITION = MORE_ICONS_TABLE_DEFINITION;

/**
 * Initializes the SQLite schema for More icons and migrates legacy rows if present.
 */
export async function initMoreIconsDb(): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS ext_more_icons (
        item_id TEXT PRIMARY KEY,
        icon_id TEXT NOT NULL,
        color TEXT,
        item_type TEXT,
        updated_at INTEGER NOT NULL
      );
    `);

    await dbAdapter.execute(`
      CREATE INDEX IF NOT EXISTS idx_more_icons_item_id ON ext_more_icons(item_id);
    `);

    // Migrate from legacy ext_iconify_icons if table exists
    try {
      await dbAdapter.execute(`
        INSERT OR IGNORE INTO ext_more_icons (item_id, icon_id, color, item_type, updated_at)
        SELECT item_id, icon_id, color, item_type, updated_at FROM ext_iconify_icons;
      `);
    } catch {}
  } catch (err) {
    console.error('[MoreIconsDb] Failed to initialize table:', err);
  }
}

export const initIconifyDb = initMoreIconsDb;

/**
 * Retrieves all stored icon mappings from SQLite.
 */
export async function getAllIconsFromDb(): Promise<Record<string, IconEntry>> {
  if (!dbAdapter.isReady()) return {};

  try {
    await initMoreIconsDb();
    const rows = await dbAdapter.query<IconRecord>(`
      SELECT item_id, icon_id, color, item_type, updated_at FROM ext_more_icons;
    `);

    const result: Record<string, IconEntry> = {};
    for (const row of rows) {
      result[row.item_id] = {
        iconId: row.icon_id,
        color: row.color || undefined,
        itemType: (row.item_type as IconItemType) || undefined,
        updatedAt: row.updated_at || Date.now(),
      };
    }
    return result;
  } catch (err) {
    console.error('[MoreIconsDb] Error loading icons from DB:', err);
    return {};
  }
}

/**
 * Saves or updates a custom icon in SQLite.
 */
export async function setIconInDb(
  itemId: string,
  iconId: string,
  color?: string,
  itemType?: IconItemType
): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await initMoreIconsDb();
    const now = Date.now();
    await dbAdapter.execute(
      `
      INSERT INTO ext_more_icons (item_id, icon_id, color, item_type, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(item_id) DO UPDATE SET
        icon_id = excluded.icon_id,
        color = excluded.color,
        item_type = excluded.item_type,
        updated_at = excluded.updated_at;
      `,
      [itemId, iconId, color || null, itemType || null, now]
    );
  } catch (err) {
    console.error('[MoreIconsDb] Error saving icon to DB:', err);
  }
}

/**
 * Removes a custom icon from SQLite.
 */
export async function removeIconFromDb(itemId: string): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await initMoreIconsDb();
    await dbAdapter.execute(
      `DELETE FROM ext_more_icons WHERE item_id = ?;`,
      [itemId]
    );
  } catch (err) {
    console.error('[MoreIconsDb] Error removing icon from DB:', err);
  }
}

/**
 * Clears all custom icons from SQLite.
 */
export async function clearAllIconsInDb(): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await initMoreIconsDb();
    await dbAdapter.execute(`DELETE FROM ext_more_icons;`);
  } catch (err) {
    console.error('[MoreIconsDb] Error clearing icons in DB:', err);
  }
}
