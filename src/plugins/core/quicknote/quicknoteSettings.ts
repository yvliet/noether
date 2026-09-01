/**
 * @module quicknoteSettings
 * @description
 * Settings and runtime UI state store for the Quicknote core extension.
 * Persisted in localStorage under `flint_quicknote_settings`.
 *
 * @since 0.2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StickyPaperColor = 'yellow' | 'pink' | 'green' | 'blue' | 'purple' | 'charcoal';

export interface StickyColorTheme {
  id: StickyPaperColor;
  label: string;
  bg: string;
  toolbarBg: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  btnHover: string;
}

export const STICKY_THEMES: Record<StickyPaperColor, StickyColorTheme> = {
  yellow: {
    id: 'yellow',
    label: 'Canary Yellow',
    bg: '#fff275',
    toolbarBg: '#f6e559',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#18181b',
    muted: '#52525b',
    accent: '#854d0e',
    btnHover: 'rgba(0, 0, 0, 0.07)',
  },
  blue: {
    id: 'blue',
    label: 'Sky Blue',
    bg: '#cbf0f8',
    toolbarBg: '#b6e7f2',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#18181b',
    muted: '#52525b',
    accent: '#0369a1',
    btnHover: 'rgba(0, 0, 0, 0.07)',
  },
  pink: {
    id: 'pink',
    label: 'Pastel Pink',
    bg: '#f8cbe6',
    toolbarBg: '#f1b9db',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#18181b',
    muted: '#52525b',
    accent: '#be185d',
    btnHover: 'rgba(0, 0, 0, 0.07)',
  },
  green: {
    id: 'green',
    label: 'Mint Green',
    bg: '#ccf6c8',
    toolbarBg: '#b9efb4',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#18181b',
    muted: '#52525b',
    accent: '#15803d',
    btnHover: 'rgba(0, 0, 0, 0.07)',
  },
  purple: {
    id: 'purple',
    label: 'Lavender',
    bg: '#e8d2f7',
    toolbarBg: '#dcbbf2',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#18181b',
    muted: '#52525b',
    accent: '#7e22ce',
    btnHover: 'rgba(0, 0, 0, 0.07)',
  },
  charcoal: {
    id: 'charcoal',
    label: 'Charcoal Dark',
    bg: '#2b2b2b',
    toolbarBg: '#222222',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#f4f4f5',
    muted: '#a1a1aa',
    accent: '#ea580c',
    btnHover: 'rgba(255, 255, 255, 0.1)',
  },
};

export interface QuicknoteSettingsState {
  quicknoteFolder: string;
  quicknoteShortcut: string;
  paperColor: StickyPaperColor;
  autoTitle: boolean;
  isModalOpen: boolean;
  isMinimized: boolean;

  // Setters
  setQuicknoteFolder: (folder: string) => void;
  setQuicknoteShortcut: (shortcut: string) => void;
  setPaperColor: (color: StickyPaperColor) => void;
  setAutoTitle: (autoTitle: boolean) => void;
  setIsModalOpen: (open: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  openQuicknote: () => void;
  closeQuicknote: () => void;
  toggleQuicknote: () => void;
  toggleMinimize: () => void;
}

export const DEFAULT_QUICKNOTE_SETTINGS = {
  quicknoteFolder: 'Quicknotes',
  quicknoteShortcut: 'Ctrl+Shift+Space',
  paperColor: 'yellow' as StickyPaperColor,
  autoTitle: true,
};

export const useQuicknoteSettings = create<QuicknoteSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_QUICKNOTE_SETTINGS,
      isModalOpen: false,
      isMinimized: false,

      setQuicknoteFolder: (folder) => set({ quicknoteFolder: (folder || 'Quicknotes').trim() }),
      setQuicknoteShortcut: (shortcut) => set({ quicknoteShortcut: shortcut || 'Ctrl+Shift+Space' }),
      setPaperColor: (paperColor) => set({ paperColor }),
      setAutoTitle: (autoTitle) => set({ autoTitle }),
      setIsModalOpen: (isModalOpen) => set({ isModalOpen }),
      setIsMinimized: (isMinimized) => set({ isMinimized }),
      openQuicknote: () => set({ isModalOpen: true, isMinimized: false }),
      closeQuicknote: () => set({ isModalOpen: false, isMinimized: false }),
      toggleQuicknote: () =>
        set((state) => {
          if (!state.isModalOpen) {
            return { isModalOpen: true, isMinimized: false };
          }
          if (state.isMinimized) {
            return { isMinimized: false };
          }
          return { isModalOpen: false };
        }),
      toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized })),
    }),
    {
      name: 'flint_quicknote_settings',
      partialize: (state) => ({
        quicknoteFolder: state.quicknoteFolder,
        quicknoteShortcut: state.quicknoteShortcut,
        paperColor: state.paperColor,
        autoTitle: state.autoTitle,
      }),
    }
  )
);
