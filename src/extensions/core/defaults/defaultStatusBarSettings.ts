import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DefaultStatusBarSettingsState {
  showWordCount: boolean;
  showCharCount: boolean;
  showReadingTime: boolean;
  showDocumentType: boolean;

  setShowWordCount: (val: boolean) => void;
  setShowCharCount: (val: boolean) => void;
  setShowReadingTime: (val: boolean) => void;
  setShowDocumentType: (val: boolean) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_STATUS_BAR_SETTINGS = {
  showWordCount: true,
  showCharCount: false,
  showReadingTime: false,
  showDocumentType: true,
};

export const useDefaultStatusBarSettings = create<DefaultStatusBarSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATUS_BAR_SETTINGS,

      setShowWordCount: (showWordCount) => set({ showWordCount }),
      setShowCharCount: (showCharCount) => set({ showCharCount }),
      setShowReadingTime: (showReadingTime) => set({ showReadingTime }),
      setShowDocumentType: (showDocumentType) => set({ showDocumentType }),

      restoreDefaults: () => set({ ...DEFAULT_STATUS_BAR_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_default-status-bar',
    }
  )
);
