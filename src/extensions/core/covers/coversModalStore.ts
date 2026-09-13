/**
 * @module CoversModalStore
 * @description
 * Transient state store for orchestrating the CoverPickerModal dialog
 * across the Command Palette, document dropdown menus, and in-editor hover buttons.
 *
 * @since 1.0.0
 */

import { create } from 'zustand';

interface CoverModalStore {
  isOpen: boolean;
  targetDocId: string | null;
  open: (docId: string) => void;
  close: () => void;
}

export const useCoverModalStore = create<CoverModalStore>((set) => ({
  isOpen: false,
  targetDocId: null,
  open: (docId: string) => set({ isOpen: true, targetDocId: docId }),
  close: () => set({ isOpen: false, targetDocId: null }),
}));
