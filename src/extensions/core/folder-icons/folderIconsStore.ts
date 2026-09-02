/**
 * @file folderIconsStore.ts
 * @description
 * In-memory Zustand state store for Folder Icons.
 * Synchronizes with localStorage immediately for 0ms refresh hydration,
 * and maintains SQLite persistence via dbAdapter.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import { create } from 'zustand';
import { DocumentItem } from '@/types';
import { dbAdapter } from '@/lib/db/adapter';
import {
  loadFolderIconsFromLocalStorage,
  saveFolderIconsToLocalStorage,
  initFolderIconsDb,
  getAllFolderIconsFromDb,
  setFolderIconInDb,
  removeFolderIconFromDb,
  clearAllFolderIconsInDb,
} from './folderIconsDb';

export interface FolderIconEntry {
  iconId: string;
  color?: string;
}

export interface FolderIconsState {
  /** Map of folderId -> FolderIconEntry */
  icons: Record<string, FolderIconEntry>;
  /** Folder currently targeted in the icon selector modal, or null if closed */
  pickerFolder: DocumentItem | null;
  /** Whether the store has completed initial DB hydration */
  isLoaded: boolean;

  /** Initialize store by loading existing icons from SQLite */
  loadIcons: () => Promise<void>;
  /** Open icon picker for a specific folder */
  openPicker: (folder: DocumentItem) => void;
  /** Close icon picker */
  closePicker: () => void;
  /** Assign or update a custom icon for a folder */
  setFolderIcon: (folderId: string, iconId: string, color?: string) => Promise<void>;
  /** Remove a custom icon from a folder */
  removeFolderIcon: (folderId: string) => Promise<void>;
  /** Clear all custom folder icons */
  clearAllIcons: () => Promise<void>;
}

export const useFolderIconsStore = create<FolderIconsState>((set, get) => ({
  // Synchronously load from localStorage so icons render on frame 0 upon refresh
  icons: loadFolderIconsFromLocalStorage(),
  pickerFolder: null,
  isLoaded: false,

  loadIcons: async () => {
    if (!dbAdapter.isReady()) {
      return;
    }
    await initFolderIconsDb();
    const dbIcons = await getAllFolderIconsFromDb();
    const current = get().icons;
    const merged = { ...current, ...dbIcons };
    set({ icons: merged, isLoaded: true });
    saveFolderIconsToLocalStorage(merged);
  },

  openPicker: (folder: DocumentItem) => {
    set({ pickerFolder: folder });
  },

  closePicker: () => {
    set({ pickerFolder: null });
  },

  setFolderIcon: async (folderId: string, iconId: string, color?: string) => {
    const next = {
      ...get().icons,
      [folderId]: { iconId, color },
    };

    // 1. Update in-memory reactive state immediately
    set({ icons: next });

    // 2. Persist to localStorage immediately
    saveFolderIconsToLocalStorage(next);

    // 3. Persist to SQLite database
    if (dbAdapter.isReady()) {
      await setFolderIconInDb(folderId, iconId, color);
    }
  },

  removeFolderIcon: async (folderId: string) => {
    const next = { ...get().icons };
    delete next[folderId];

    // 1. Update in-memory reactive state immediately
    set({ icons: next });

    // 2. Persist to localStorage immediately
    saveFolderIconsToLocalStorage(next);

    // 3. Delete from SQLite database
    if (dbAdapter.isReady()) {
      await removeFolderIconFromDb(folderId);
    }
  },

  clearAllIcons: async () => {
    set({ icons: {} });
    saveFolderIconsToLocalStorage({});
    if (dbAdapter.isReady()) {
      await clearAllFolderIconsInDb();
    }
  },
}));
