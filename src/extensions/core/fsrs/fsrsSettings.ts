import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FsrsSettingsState {
  fsrsRetention: string;
  fsrsMaxInterval: string;
  autoFlip: boolean;
  maxReviewsPerSession: number;
  showReviewSummary: boolean;

  setFsrsRetention: (val: string) => void;
  setFsrsMaxInterval: (val: string) => void;
  setAutoFlip: (val: boolean) => void;
  setMaxReviewsPerSession: (val: number) => void;
  setShowReviewSummary: (val: boolean) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_FSRS_SETTINGS = {
  fsrsRetention: '0.90',
  fsrsMaxInterval: '36500',
  autoFlip: true,
  maxReviewsPerSession: 50,
  showReviewSummary: true,
};

export const useFsrsSettings = create<FsrsSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_FSRS_SETTINGS,

      setFsrsRetention: (fsrsRetention) => set({ fsrsRetention }),
      setFsrsMaxInterval: (fsrsMaxInterval) => set({ fsrsMaxInterval }),
      setAutoFlip: (autoFlip) => set({ autoFlip }),
      setMaxReviewsPerSession: (maxReviewsPerSession) => set({ maxReviewsPerSession }),
      setShowReviewSummary: (showReviewSummary) => set({ showReviewSummary }),

      restoreDefaults: () => set({ ...DEFAULT_FSRS_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_fsrs-spaced-repetition',
    }
  )
);
