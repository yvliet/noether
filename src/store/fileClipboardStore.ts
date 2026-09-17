import { create } from 'zustand';
import { useDocumentStore } from './documentStore';
import { useWorkspaceStore } from './workspaceStore';

export type FileClipboardMode = 'copy' | 'cut';

export interface FileClipboardState {
  mode: FileClipboardMode | null;
  itemIds: string[];

  copy: (ids: string[]) => void;
  cut: (ids: string[]) => void;
  clear: () => void;
  isCut: (id: string) => boolean;
  executePaste: (targetParentId?: string | null) => Promise<void>;
}

/**
 * File clipboard store managing in-memory cut, copy, and paste state
 * for vault notes and folders.
 */
export const useFileClipboardStore = create<FileClipboardState>((set, get) => ({
  mode: null,
  itemIds: [],

  copy: (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    set({ mode: 'copy', itemIds: [...ids] });
    const count = ids.length;
    useWorkspaceStore.getState().showToast(
      count === 1 ? 'Copied 1 item to clipboard' : `Copied ${count} items to clipboard`,
      'info'
    );
  },

  cut: (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    set({ mode: 'cut', itemIds: [...ids] });
    const count = ids.length;
    useWorkspaceStore.getState().showToast(
      count === 1 ? 'Cut 1 item to clipboard' : `Cut ${count} items to clipboard`,
      'info'
    );
  },

  clear: () => {
    set({ mode: null, itemIds: [] });
  },

  isCut: (id: string) => {
    const { mode, itemIds } = get();
    return mode === 'cut' && itemIds.includes(id);
  },

  executePaste: async (targetParentId: string | null = null) => {
    const { mode, itemIds } = get();
    if (!mode || itemIds.length === 0) return;

    const docStore = useDocumentStore.getState();
    const existingDocs = docStore.documents;
    const validIds = itemIds.filter((id) => existingDocs.some((d) => d.id === id));

    if (validIds.length === 0) {
      set({ mode: null, itemIds: [] });
      return;
    }

    if (mode === 'cut') {
      const res = await docStore.moveDocuments(validIds, targetParentId);
      if (res.success) {
        set({ mode: null, itemIds: [] });
        const count = res.movedCount;
        useWorkspaceStore.getState().showToast(
          count === 1 ? 'Moved 1 item' : `Moved ${count} items`,
          'success'
        );
      } else if (res.error) {
        useWorkspaceStore.getState().showToast(res.error, 'warning');
      }
    } else if (mode === 'copy') {
      const copiedDocs = await docStore.duplicateDocuments(validIds, targetParentId);
      if (copiedDocs.length > 0) {
        const count = copiedDocs.length;
        useWorkspaceStore.getState().showToast(
          count === 1 ? 'Pasted 1 item' : `Pasted ${count} items`,
          'success'
        );
      }
    }
  },
}));
