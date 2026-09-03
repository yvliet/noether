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
  collapseBacklinksByDefault: true,
  includeUnlinkedMentions: false,
};

function getInitialBacklinksSettings() {
  if (typeof window === 'undefined') return DEFAULT_BACKLINKS_SETTINGS;
  try {
    const raw = localStorage.getItem('flint_plugin_data_backlinks');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.state) {
        return {
          ...DEFAULT_BACKLINKS_SETTINGS,
          ...parsed.state,
          collapseBacklinksByDefault:
            parsed.version >= 1
              ? Boolean(parsed.state.collapseBacklinksByDefault)
              : true,
        };
      }
    }
  } catch {}
  return DEFAULT_BACKLINKS_SETTINGS;
}

export const useBacklinksSettings = create<BacklinksSettingsState>()(
  persist(
    (set) => ({
      ...getInitialBacklinksSettings(),

      setShowBacklinksInDoc: (showBacklinksInDoc) => set({ showBacklinksInDoc }),
      setShowBacklinksSearch: (showBacklinksSearch) => set({ showBacklinksSearch }),
      setCollapseBacklinksByDefault: (collapseBacklinksByDefault) => set({ collapseBacklinksByDefault }),
      setIncludeUnlinkedMentions: (includeUnlinkedMentions) => set({ includeUnlinkedMentions }),

      restoreDefaults: () => set({ ...DEFAULT_BACKLINKS_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_backlinks',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (!version || version < 1) {
          return {
            ...DEFAULT_BACKLINKS_SETTINGS,
            ...persistedState,
            collapseBacklinksByDefault: true,
          };
        }
        return persistedState;
      },
    }
  )
);
