import { create } from 'zustand';

export interface CascadeContextInfo {
  docId: string;
  cascadeName: string;
  page?: number;
}

export const DEFAULT_CASCADE_SETTINGS = {
  prevPageHotkey: 'Alt+,',
  nextPageHotkey: 'Alt+.',
  showInStatusBar: true,
  autoRenameSuffix: true,
};

export interface CascadeSettingsState {
  prevPageHotkey: string;
  nextPageHotkey: string;
  showInStatusBar: boolean;
  autoRenameSuffix: boolean;
  activeCascadeContext: CascadeContextInfo | null;

  setPrevPageHotkey: (hotkey: string) => void;
  setNextPageHotkey: (hotkey: string) => void;
  setShowInStatusBar: (show: boolean) => void;
  setAutoRenameSuffix: (auto: boolean) => void;
  setActiveCascadeContext: (ctx: CascadeContextInfo | null) => void;
  restoreDefaults: () => void;
}

const STORAGE_KEY = 'flint_cascade_settings_v1';

function getStoredSettings(): Partial<CascadeSettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistSettings(state: CascadeSettingsState) {
  try {
    const data = {
      prevPageHotkey: state.prevPageHotkey,
      nextPageHotkey: state.nextPageHotkey,
      showInStatusBar: state.showInStatusBar,
      autoRenameSuffix: state.autoRenameSuffix,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('[CascadeSettings] Failed to save settings:', err);
  }
}

const initial = getStoredSettings();

export const useCascadeSettings = create<CascadeSettingsState>((set, get) => ({
  prevPageHotkey: initial.prevPageHotkey || DEFAULT_CASCADE_SETTINGS.prevPageHotkey,
  nextPageHotkey: initial.nextPageHotkey || DEFAULT_CASCADE_SETTINGS.nextPageHotkey,
  showInStatusBar: initial.showInStatusBar ?? DEFAULT_CASCADE_SETTINGS.showInStatusBar,
  autoRenameSuffix: initial.autoRenameSuffix ?? DEFAULT_CASCADE_SETTINGS.autoRenameSuffix,
  activeCascadeContext: null,

  setPrevPageHotkey: (hotkey) => {
    set({ prevPageHotkey: hotkey });
    persistSettings(get());
  },
  setNextPageHotkey: (hotkey) => {
    set({ nextPageHotkey: hotkey });
    persistSettings(get());
  },
  setShowInStatusBar: (show) => {
    set({ showInStatusBar: show });
    persistSettings(get());
  },
  setAutoRenameSuffix: (auto) => {
    set({ autoRenameSuffix: auto });
    persistSettings(get());
  },
  setActiveCascadeContext: (ctx) => {
    set({ activeCascadeContext: ctx });
  },
  restoreDefaults: () => {
    set({
      prevPageHotkey: DEFAULT_CASCADE_SETTINGS.prevPageHotkey,
      nextPageHotkey: DEFAULT_CASCADE_SETTINGS.nextPageHotkey,
      showInStatusBar: DEFAULT_CASCADE_SETTINGS.showInStatusBar,
      autoRenameSuffix: DEFAULT_CASCADE_SETTINGS.autoRenameSuffix,
    });
    persistSettings(get());
  },
}));
