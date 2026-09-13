import { create } from 'zustand';

export interface HistorySettings {
  autoSnapshot: boolean;
  debounceSeconds: number;
  maxHistoryItems: number;
}

export const DEFAULT_HISTORY_SETTINGS: HistorySettings = {
  autoSnapshot: true,
  debounceSeconds: 5,
  maxHistoryItems: 50,
};

const STORAGE_KEY = 'noether_history_settings';

function loadStoredSettings(): HistorySettings {
  if (typeof window === 'undefined') return DEFAULT_HISTORY_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_HISTORY_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('[Version History] Failed to load settings from storage:', err);
  }
  return DEFAULT_HISTORY_SETTINGS;
}

function persistSettings(settings: HistorySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('[Version History] Failed to persist settings to storage:', err);
  }
}

interface HistorySettingsState extends HistorySettings {
  setAutoSnapshot: (enabled: boolean) => void;
  setDebounceSeconds: (seconds: number) => void;
  setMaxHistoryItems: (items: number) => void;
  restoreDefaults: () => void;
}

export const useHistorySettings = create<HistorySettingsState>((set) => {
  const initial = loadStoredSettings();

  return {
    ...initial,
    setAutoSnapshot: (autoSnapshot: boolean) => {
      set((state) => {
        const next = { ...state, autoSnapshot };
        persistSettings(next);
        return next;
      });
    },
    setDebounceSeconds: (debounceSeconds: number) => {
      set((state) => {
        const next = { ...state, debounceSeconds };
        persistSettings(next);
        return next;
      });
    },
    setMaxHistoryItems: (maxHistoryItems: number) => {
      set((state) => {
        const next = { ...state, maxHistoryItems };
        persistSettings(next);
        return next;
      });
    },
    restoreDefaults: () => {
      persistSettings(DEFAULT_HISTORY_SETTINGS);
      set({ ...DEFAULT_HISTORY_SETTINGS });
    },
  };
});
