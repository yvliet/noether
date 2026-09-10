/**
 * @file iconifyDb.ts
 * @description
 * SQLite persistence layer with local cache fallback for the Iconify extension.
 * Manages the dynamic `iconify_icons` table schema, queries, mutations,
 * and automatic cleanup on document/folder deletion.
 *
 * Per user request: Old folder_icons data is dropped to maintain a clean start without legacy debt.
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
}

function getLocalStorageKey(): string {
  return 'flint_iconify_cache_v1';
}

function getSettingsLocalStorageKey(): string {
  return 'flint_iconify_settings_v1';
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
 * Loads Iconify settings synchronously from localStorage.
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
    // Purge legacy folder icons cache if still present
    localStorage.removeItem('flint_folder_icons_cache_v1');
    localStorage.removeItem('flint_folder_icons_settings_v1');

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
 * Initializes the SQLite schema for Iconify.
 * Drops legacy folder_icons table if present and sets up `ext_iconify_icons`.
 */
export async function initIconifyDb(): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    // Clean up legacy table per requirement
    await dbAdapter.execute(`DROP TABLE IF EXISTS folder_icons;`);

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

    // Migrate from legacy un-prefixed table if present
    try {
      const legacyTable = await dbAdapter.query<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='iconify_icons'`
      );
      if (legacyTable.length > 0) {
        await dbAdapter.execute(
          `INSERT OR IGNORE INTO ext_iconify_icons SELECT * FROM iconify_icons;`
        );
      }
    } catch {
      // Legacy table missing or incompatible; safe to ignore
    }
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
