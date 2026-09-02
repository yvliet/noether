import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BookmarksSettingsState {
  autoSortBookmarks: boolean;
  showBookmarkPath: boolean;

  setAutoSortBookmarks: (val: boolean) => void;
  setShowBookmarkPath: (val: boolean) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_BOOKMARKS_SETTINGS = {
  autoSortBookmarks: false,
  showBookmarkPath: true,
};

export const useBookmarksSettings = create<BookmarksSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_BOOKMARKS_SETTINGS,

      setAutoSortBookmarks: (autoSortBookmarks) => set({ autoSortBookmarks }),
      setShowBookmarkPath: (showBookmarkPath) => set({ showBookmarkPath }),

      restoreDefaults: () => set({ ...DEFAULT_BOOKMARKS_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_bookmarks',
    }
  )
);
