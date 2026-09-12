/**
 * @file iconifyDb.ts
 * @description
 * SQLite persistence layer with local cache fallback for the More icons extension.
 * Manages the dynamic `ext_iconify_icons` table schema, queries, mutations,
 * and automatic cleanup on document/folder deletion.
 *
 * @author Yuliet Li
 * @since 1.0.0
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
  return 'noether_iconify_icons_cache_v1';
}

function getSettingsLocalStorageKey(): string {
  return 'noether_iconify_settings_v1';
}

export interface IconifySettings {
  enableFolderIcons: boolean;
  enableFileIcons: boolean;
  enableDocumentIcons: boolean;
  showDefaultFolderIcons: boolean;
  showDefaultFileIcons: boolean;
  showEditorTitleIcon: boolean;
  emojiStyle: EmojiStyle;
}

export const DEFAULT_ICONIFY_SETTINGS: IconifySettings = {
  enableFolderIcons: true,
  enableFileIcons: true,
  enableDocumentIcons: true,
  showDefaultFolderIcons: true,
  showDefaultFileIcons: false,
  showEditorTitleIcon: true,
  emojiStyle: 'native',
};

/**
 * Loads iconify settings synchronously from localStorage.
 */
export function loadIconifySettingsFromLocalStorage(): IconifySettings {
  if (typeof window === 'undefined') return DEFAULT_ICONIFY_SETTINGS;
  try {
    const raw = localStorage.getItem(getSettingsLocalStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enableFolderIcons:
          parsed.enableFolderIcons !== undefined
            ? Boolean(parsed.enableFolderIcons)
            : DEFAULT_ICONIFY_SETTINGS.enableFolderIcons,
        enableFileIcons:
          parsed.enableFileIcons !== undefined
            ? Boolean(parsed.enableFileIcons)
            : DEFAULT_ICONIFY_SETTINGS.enableFileIcons,
        enableDocumentIcons:
          parsed.enableDocumentIcons !== undefined
            ? Boolean(parsed.enableDocumentIcons)
            : DEFAULT_ICONIFY_SETTINGS.enableDocumentIcons,
        showDefaultFolderIcons:
          parsed.showDefaultFolderIcons !== undefined
            ? Boolean(parsed.showDefaultFolderIcons)
            : DEFAULT_ICONIFY_SETTINGS.showDefaultFolderIcons,
        showDefaultFileIcons:
          parsed.showDefaultFileIcons !== undefined
            ? Boolean(parsed.showDefaultFileIcons)
            : DEFAULT_ICONIFY_SETTINGS.showDefaultFileIcons,
        showEditorTitleIcon:
          parsed.showEditorTitleIcon !== undefined
            ? Boolean(parsed.showEditorTitleIcon)
            : DEFAULT_ICONIFY_SETTINGS.showEditorTitleIcon,
        emojiStyle:
          parsed.emojiStyle && ['native', 'twemoji', 'apple', 'google', 'whatsapp'].includes(parsed.emojiStyle)
            ? (parsed.emojiStyle as EmojiStyle)
            : DEFAULT_ICONIFY_SETTINGS.emojiStyle,
      };
    }
  } catch {}
  return DEFAULT_ICONIFY_SETTINGS;
}

/**
 * Saves Iconify settings to localStorage.
 */
export function saveIconifySettingsToLocalStorage(settings: IconifySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getSettingsLocalStorageKey(), JSON.stringify(settings));
  } catch {}
}

/**
 * Loads icon assignments synchronously from localStorage.
 * Ensures 0ms instant display upon page load/refresh before WASM SQLite initializes.
 */
export function loadIconifyFromLocalStorage(): Record<string, IconEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getLocalStorageKey());
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

/**
 * Saves icon assignments to localStorage as a fast synchronous cache.
 */
export function saveIconifyToLocalStorage(
  icons: Record<string, IconEntry>
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getLocalStorageKey(), JSON.stringify(icons));
  } catch {}
}

export const ICONIFY_TABLE_DEFINITION: TableDefinition = {
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
    { name: 'idx_iconify_icons_item_id', columns: ['item_id'] },
  ],
};

/**
 * Initializes the SQLite schema for More icons.
 */
export async function initIconifyDb(): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS ext_iconify_icons (
        item_id TEXT PRIMARY KEY,
        icon_id TEXT NOT NULL,
        color TEXT,
        item_type TEXT,
        updated_at INTEGER NOT NULL
      );
    `);

    await dbAdapter.execute(`
      CREATE INDEX IF NOT EXISTS idx_iconify_icons_item_id ON ext_iconify_icons(item_id);
    `);
  } catch (err) {
    console.error('[IconifyDb] Failed to initialize table:', err);
  }
}

/**
 * Retrieves all stored icon mappings from SQLite.
 */
export async function getAllIconsFromDb(): Promise<Record<string, IconEntry>> {
  if (!dbAdapter.isReady()) return {};

  try {
    await initIconifyDb();
    const rows = await dbAdapter.query<IconRecord>(`
      SELECT item_id, icon_id, color, item_type, updated_at FROM ext_iconify_icons;
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
    console.error('[IconifyDb] Error loading icons from DB:', err);
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
    await initIconifyDb();
    const now = Date.now();
    await dbAdapter.execute(
      `
      INSERT INTO ext_iconify_icons (item_id, icon_id, color, item_type, updated_at)
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
    console.error('[IconifyDb] Error saving icon to DB:', err);
  }
}

/**
 * Removes a custom icon from SQLite.
 */
export async function removeIconFromDb(itemId: string): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await initIconifyDb();
    await dbAdapter.execute(
      `DELETE FROM ext_iconify_icons WHERE item_id = ?;`,
      [itemId]
    );
  } catch (err) {
    console.error('[IconifyDb] Error removing icon from DB:', err);
  }
}

/**
 * Clears all custom icons from SQLite.
 */
export async function clearAllIconsInDb(): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await initIconifyDb();
    await dbAdapter.execute(`DELETE FROM ext_iconify_icons;`);
  } catch (err) {
    console.error('[IconifyDb] Error clearing icons in DB:', err);
  }
}
