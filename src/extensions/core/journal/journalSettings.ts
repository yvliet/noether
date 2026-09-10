import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface JournalSettingsState {
  dailyFormat: string;
  dailyFolder: string;
  openOnStartup: boolean;
  headingFormat: string;

  setDailyFormat: (val: string) => void;
  setDailyFolder: (val: string) => void;
  setOpenOnStartup: (val: boolean) => void;
  setHeadingFormat: (val: string) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_JOURNAL_SETTINGS = {
  dailyFormat: 'YYYY-MM-DD',
  dailyFolder: '',
  openOnStartup: false,
  headingFormat: '',
};

export const useJournalSettings = create<JournalSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_JOURNAL_SETTINGS,

      setDailyFormat: (dailyFormat) => set({ dailyFormat }),
      setDailyFolder: (dailyFolder) => set({ dailyFolder }),
      setOpenOnStartup: (openOnStartup) => set({ openOnStartup }),
      setHeadingFormat: (headingFormat) => set({ headingFormat }),

      restoreDefaults: () => set({ ...DEFAULT_JOURNAL_SETTINGS }),
    }),
    {
      name: 'flint_extension_data_journal',
    }
  )
);

