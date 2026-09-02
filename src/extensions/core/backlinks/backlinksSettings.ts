import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BacklinksSettingsState {
  showBacklinksInDoc: boolean;
  showBacklinksSearch: boolean;
  collapseBacklinksByDefault: boolean;
  includeUnlinkedMentions: boolean;

  setShowBacklinksInDoc: (val: boolean) => void;
  setShowBacklinksSearch: (val: boolean) => void;
  setCollapseBacklinksByDefault: (val: boolean) => void;
  setIncludeUnlinkedMentions: (val: boolean) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_BACKLINKS_SETTINGS = {
  showBacklinksInDoc: false,
  showBacklinksSearch: false,
  collapseBacklinksByDefault: false,
  includeUnlinkedMentions: false,
};

export const useBacklinksSettings = create<BacklinksSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_BACKLINKS_SETTINGS,

      setShowBacklinksInDoc: (showBacklinksInDoc) => set({ showBacklinksInDoc }),
      setShowBacklinksSearch: (showBacklinksSearch) => set({ showBacklinksSearch }),
      setCollapseBacklinksByDefault: (collapseBacklinksByDefault) => set({ collapseBacklinksByDefault }),
      setIncludeUnlinkedMentions: (includeUnlinkedMentions) => set({ includeUnlinkedMentions }),

      restoreDefaults: () => set({ ...DEFAULT_BACKLINKS_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_backlinks',
    }
  )
);
