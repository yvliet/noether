import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OutlineSettingsState {
  collapseOutlineByDefault: boolean;
  showHeadingNumbers: boolean;
  maxHeadingLevel: number; // 1 to 6

  setCollapseOutlineByDefault: (val: boolean) => void;
  setShowHeadingNumbers: (val: boolean) => void;
  setMaxHeadingLevel: (val: number) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_OUTLINE_SETTINGS = {
  collapseOutlineByDefault: false,
  showHeadingNumbers: false,
  maxHeadingLevel: 6,
};

export const useOutlineSettings = create<OutlineSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_OUTLINE_SETTINGS,

      setCollapseOutlineByDefault: (collapseOutlineByDefault) => set({ collapseOutlineByDefault }),
      setShowHeadingNumbers: (showHeadingNumbers) => set({ showHeadingNumbers }),
      setMaxHeadingLevel: (maxHeadingLevel) => set({ maxHeadingLevel }),

      restoreDefaults: () => set({ ...DEFAULT_OUTLINE_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_outline',
    }
  )
);
