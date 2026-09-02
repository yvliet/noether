/**
 * @file folderIconsDb.ts
 * @description
 * SQLite persistence layer with local cache fallback for the Folder Icons extension.
 * Manages the dynamic `folder_icons` table schema, queries, mutations,
 * and automatic cleanup on document deletion.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import { dbAdapter } from '@/lib/db/adapter';

export interface FolderIconRecord {
  folder_id: string;
  icon_id: string;
  color?: string | null;
  updated_at: number;
}

function getLocalStorageKey(): string {
  return 'flint_folder_icons_cache_v1';
}

/**
 * Loads folder icon assignments synchronously from localStorage.
 * Ensures 0ms instant display upon page load/refresh before WASM SQLite initializes.
 */
export function loadFolderIconsFromLocalStorage(): Record<string, { iconId: string; color?: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getLocalStorageKey());
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

/**
 * Saves folder icon assignments to localStorage as a fast synchronous cache.
 */
export function saveFolderIconsToLocalStorage(
  icons: Record<string, { iconId: string; color?: string }>
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getLocalStorageKey(), JSON.stringify(icons));
  } catch {}
}

/**
 * Initializes the SQLite schema for custom folder icons.
 * Executed dynamically on extension onload and DB status transitions.
 */
export async function initFolderIconsDb(): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS folder_icons (
        folder_id TEXT PRIMARY KEY,
        icon_id TEXT NOT NULL,
        color TEXT,
        updated_at INTEGER NOT NULL
      );
    `);

    await dbAdapter.execute(`
      CREATE INDEX IF NOT EXISTS idx_folder_icons_folder_id ON folder_icons(folder_id);
    `);
  } catch (err) {
    console.error('[FolderIconsDb] Failed to initialize table:', err);
  }
}

/**
 * Retrieves all stored folder icon mappings from SQLite.
 */
export async function getAllFolderIconsFromDb(): Promise<Record<string, { iconId: string; color?: string }>> {
  if (!dbAdapter.isReady()) return {};

  try {
    await initFolderIconsDb();
    const rows = await dbAdapter.query<FolderIconRecord>(`
      SELECT folder_id, icon_id, color, updated_at FROM folder_icons;
    `);

    const result: Record<string, { iconId: string; color?: string }> = {};
    for (const row of rows) {
      result[row.folder_id] = {
        iconId: row.icon_id,
        color: row.color || undefined,
      };
    }
    return result;
  } catch (err) {
    console.error('[FolderIconsDb] Error loading folder icons from DB:', err);
    return {};
  }
}

/**
 * Saves or updates a custom folder icon in SQLite.
 */
export async function setFolderIconInDb(
  folderId: string,
  iconId: string,
  color?: string
): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await initFolderIconsDb();
    const now = Date.now();
    await dbAdapter.execute(
      `
      INSERT INTO folder_icons (folder_id, icon_id, color, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(folder_id) DO UPDATE SET
        icon_id = excluded.icon_id,
        color = excluded.color,
        updated_at = excluded.updated_at;
      `,
      [folderId, iconId, color || null, now]
    );
  } catch (err) {
    console.error('[FolderIconsDb] Error saving folder icon to DB:', err);
  }
}

/**
 * Removes a custom folder icon from SQLite.
 */
export async function removeFolderIconFromDb(folderId: string): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await initFolderIconsDb();
    await dbAdapter.execute(
      `DELETE FROM folder_icons WHERE folder_id = ?;`,
      [folderId]
    );
  } catch (err) {
    console.error('[FolderIconsDb] Error removing folder icon from DB:', err);
  }
}

/**
 * Clears all custom folder icons from SQLite.
 */
export async function clearAllFolderIconsInDb(): Promise<void> {
  if (!dbAdapter.isReady()) return;

  try {
    await initFolderIconsDb();
    await dbAdapter.execute(`DELETE FROM folder_icons;`);
  } catch (err) {
    console.error('[FolderIconsDb] Error clearing folder icons in DB:', err);
  }
}
