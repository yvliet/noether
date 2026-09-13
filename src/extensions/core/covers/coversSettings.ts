/**
 * @module CoversSettings
 * @description
 * Persistent configuration store for the Covers core extension.
 * Manages user preferences such as banner height, top-to-down fade toggle,
 * hover controls, and Wallhaven API credentials.
 *
 * @since 1.0.0
 */

import { create } from 'zustand';

export interface CoversSettingsState {
  bannerHeight: number;
  fadeEffect: boolean;
  showControlsOnHover: boolean;
  wallhavenApiKey: string;
  defaultPreset: string;

  setBannerHeight: (height: number) => void;
  setFadeEffect: (enabled: boolean) => void;
  setShowControlsOnHover: (enabled: boolean) => void;
  setWallhavenApiKey: (key: string) => void;
  setDefaultPreset: (presetId: string) => void;
  restoreDefaults: () => void;
}

const STORAGE_KEY = 'noether_covers_settings';

const DEFAULT_SETTINGS = {
  bannerHeight: 270,
  fadeEffect: true,
  showControlsOnHover: true,
  wallhavenApiKey: '',
  defaultPreset: 'charcoal-cube-grid',
};

function loadSettings(): typeof DEFAULT_SETTINGS {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(state: typeof DEFAULT_SETTINGS): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export const useCoversSettings = create<CoversSettingsState>((set, get) => {
  const initial = loadSettings();

  return {
    ...initial,

    setBannerHeight: (bannerHeight: number) => {
      const clamped = Math.min(600, Math.max(120, bannerHeight));
      set({ bannerHeight: clamped });
      saveSettings({ ...get(), bannerHeight: clamped });
    },

    setFadeEffect: (fadeEffect: boolean) => {
      set({ fadeEffect });
      saveSettings({ ...get(), fadeEffect });
    },

    setShowControlsOnHover: (showControlsOnHover: boolean) => {
      set({ showControlsOnHover });
      saveSettings({ ...get(), showControlsOnHover });
    },

    setWallhavenApiKey: (wallhavenApiKey: string) => {
      set({ wallhavenApiKey });
      saveSettings({ ...get(), wallhavenApiKey });
    },

    setDefaultPreset: (defaultPreset: string) => {
      set({ defaultPreset });
      saveSettings({ ...get(), defaultPreset });
    },

    restoreDefaults: () => {
      set(DEFAULT_SETTINGS);
      saveSettings(DEFAULT_SETTINGS);
    },
  };
});
