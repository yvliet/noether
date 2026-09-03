/**
 * @file iconifyStore.ts
 * @description
 * In-memory Zustand state store for Iconify.
 * Synchronizes with localStorage immediately for 0ms refresh hydration,
 * and maintains SQLite persistence via dbAdapter.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import { create } from 'zustand';
import { dbAdapter } from '@/lib/db/adapter';
import {
  IconEntry,
  IconItemType,
  loadIconifyFromLocalStorage,
  saveIconifyToLocalStorage,
  loadIconifySettingsFromLocalStorage,
  saveIconifySettingsToLocalStorage,
  initIconifyDb,
  getAllIconsFromDb,
  setIconInDb,
  removeIconFromDb,
  clearAllIconsInDb,
} from './iconifyDb';

export interface IconPickerTarget {
  id: string;
  title: string;
  isFolder: boolean;
}

export interface IconifyState {
  /** Map of itemId -> IconEntry */
  icons: Record<string, IconEntry>;
  /** Item currently targeted in the icon selector modal, or null if closed */
  pickerTarget: IconPickerTarget | null;
  /** Whether the store has completed initial DB hydration */
  isLoaded: boolean;
  /** Whether to show default folder open/close icons when no custom icon is set */
  showDefaultFolderIcons: boolean;
  /** Whether to show default file icons when no custom icon is set */
  showDefaultFileIcons: boolean;
  /** Whether to show custom icon next to note title in editor */
  showEditorTitleIcon: boolean;
  /** Active emoji set style ('native' | 'twemoji' | 'apple' | 'google' | 'whatsapp') */
  emojiStyle: import('@/components/common/emoji').EmojiStyle;

  /** Set showDefaultFolderIcons toggle */
  setShowDefaultFolderIcons: (show: boolean) => void;
  /** Set showDefaultFileIcons toggle */
  setShowDefaultFileIcons: (show: boolean) => void;
  /** Set showEditorTitleIcon toggle */
  setShowEditorTitleIcon: (show: boolean) => void;
  /** Set emojiStyle */
  setEmojiStyle: (style: import('@/components/common/emoji').EmojiStyle) => void;
  /** Initialize store by loading existing icons from SQLite */
  loadIcons: () => Promise<void>;
  /** Open icon picker for a specific folder or file */
  openPicker: (target: IconPickerTarget) => void;
  /** Close icon picker */
  closePicker: () => void;
  /** Assign or update a custom icon for an item */
  setIcon: (itemId: string, iconId: string, color?: string, itemType?: IconItemType) => Promise<void>;
  /** Remove a custom icon from an item */
  removeIcon: (itemId: string) => Promise<void>;
  /** Clear all custom icons */
  clearAllIcons: () => Promise<void>;
}

export const useIconifyStore = create<IconifyState>((set, get) => {
  const initialSettings = loadIconifySettingsFromLocalStorage();

  return {
    // Synchronously load from localStorage so icons render on frame 0 upon refresh
    icons: loadIconifyFromLocalStorage(),
    pickerTarget: null,
    isLoaded: false,
    showDefaultFolderIcons: initialSettings.showDefaultFolderIcons,
    showDefaultFileIcons: initialSettings.showDefaultFileIcons,
    showEditorTitleIcon: initialSettings.showEditorTitleIcon,
    emojiStyle: initialSettings.emojiStyle,

    setShowDefaultFolderIcons: (show: boolean) => {
      set({ showDefaultFolderIcons: show });
      saveIconifySettingsToLocalStorage({
        showDefaultFolderIcons: show,
        showDefaultFileIcons: get().showDefaultFileIcons,
        showEditorTitleIcon: get().showEditorTitleIcon,
        emojiStyle: get().emojiStyle,
      });
    },

    setShowDefaultFileIcons: (show: boolean) => {
      set({ showDefaultFileIcons: show });
      saveIconifySettingsToLocalStorage({
        showDefaultFolderIcons: get().showDefaultFolderIcons,
        showDefaultFileIcons: show,
        showEditorTitleIcon: get().showEditorTitleIcon,
        emojiStyle: get().emojiStyle,
      });
    },

    setShowEditorTitleIcon: (show: boolean) => {
      set({ showEditorTitleIcon: show });
      saveIconifySettingsToLocalStorage({
        showDefaultFolderIcons: get().showDefaultFolderIcons,
        showDefaultFileIcons: get().showDefaultFileIcons,
        showEditorTitleIcon: show,
        emojiStyle: get().emojiStyle,
      });
    },

    setEmojiStyle: (style: import('@/components/common/emoji').EmojiStyle) => {
      set({ emojiStyle: style });
      saveIconifySettingsToLocalStorage({
        showDefaultFolderIcons: get().showDefaultFolderIcons,
        showDefaultFileIcons: get().showDefaultFileIcons,
        showEditorTitleIcon: get().showEditorTitleIcon,
        emojiStyle: style,
      });
    },

    loadIcons: async () => {
      if (!dbAdapter.isReady()) {
        return;
      }
      await initIconifyDb();
      const dbIcons = await getAllIconsFromDb();
      const current = get().icons;
      const merged = { ...current, ...dbIcons };
      set({ icons: merged, isLoaded: true });
      saveIconifyToLocalStorage(merged);
    },

    openPicker: (target: IconPickerTarget) => {
      set({ pickerTarget: target });
    },

    closePicker: () => {
      set({ pickerTarget: null });
    },

    setIcon: async (itemId: string, iconId: string, color?: string, itemType?: IconItemType) => {
      const next = {
        ...get().icons,
        [itemId]: { iconId, color, itemType },
      };

      // 1. Update in-memory reactive state immediately
      set({ icons: next });

      // 2. Persist to localStorage immediately
      saveIconifyToLocalStorage(next);

      // 3. Persist to SQLite database
      if (dbAdapter.isReady()) {
        await setIconInDb(itemId, iconId, color, itemType);
      }
    },

    removeIcon: async (itemId: string) => {
      const next = { ...get().icons };
      delete next[itemId];

      // 1. Update in-memory reactive state immediately
      set({ icons: next });

      // 2. Persist to localStorage immediately
      saveIconifyToLocalStorage(next);

      // 3. Delete from SQLite database
      if (dbAdapter.isReady()) {
        await removeIconFromDb(itemId);
      }
    },

    clearAllIcons: async () => {
      set({ icons: {} });
      saveIconifyToLocalStorage({});
      if (dbAdapter.isReady()) {
        await clearAllIconsInDb();
      }
    },
  };
});
