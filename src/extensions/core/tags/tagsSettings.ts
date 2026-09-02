import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TagSortBy = 'frequency' | 'alphabetical';

export interface TagsSettingsState {
  showTagsCount: boolean;
  sortTagsBy: TagSortBy;
  showHashPrefix: boolean;
  nestedTags: boolean;

  setShowTagsCount: (val: boolean) => void;
  setSortTagsBy: (val: TagSortBy) => void;
  setShowHashPrefix: (val: boolean) => void;
  setNestedTags: (val: boolean) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_TAGS_SETTINGS = {
  showTagsCount: true,
  sortTagsBy: 'frequency' as TagSortBy,
  showHashPrefix: true,
  nestedTags: true,
};

export const useTagsSettings = create<TagsSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_TAGS_SETTINGS,

      setShowTagsCount: (showTagsCount) => set({ showTagsCount }),
      setSortTagsBy: (sortTagsBy) => set({ sortTagsBy }),
      setShowHashPrefix: (showHashPrefix) => set({ showHashPrefix }),
      setNestedTags: (nestedTags) => set({ nestedTags }),

      restoreDefaults: () => set({ ...DEFAULT_TAGS_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_tags',
    }
  )
);
