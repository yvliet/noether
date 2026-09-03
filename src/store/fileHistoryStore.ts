import { create } from 'zustand';
import { DocumentItem } from '@/types';
import { restoreTrashItem, restoreTrashItemsBatch, moveToTrash, moveDocumentsToTrash } from '@/lib/db/trash';
import { updateDocumentTitle, updateInternalLinksAcrossDocuments, moveDocument as dbMoveDocument, getAllDocuments } from '@/lib/db/documents';
import { useDocumentStore } from './documentStore';
import { useWorkspaceStore } from './workspaceStore';
import { useSettingsStore } from './settingsStore';
import { bindFlintStores } from '@/core/app/storeBridge';

export interface CreateFileAction {
  type: 'create';
  item: DocumentItem;
  previousActiveDocId?: string | null;
  timestamp: number;
}

export interface DeleteFileAction {
  type: 'delete';
  items: DocumentItem[];
  activeDocIdBefore?: string | null;
  timestamp: number;
}

export interface RenameFileAction {
  type: 'rename';
  id: string;
  oldTitle: string;
  newTitle: string;
  timestamp: number;
}

export interface MoveFileAction {
  type: 'move';
  id: string;
  oldParentId: string | null;
  newParentId: string | null;
  title: string;
  oldTitle?: string;
  newTitle?: string;
  timestamp: number;
}

export interface BatchMoveFileAction {
  type: 'batch_move';
  moves: {
    id: string;
    oldParentId: string | null;
    newParentId: string | null;
    title: string;
    oldTitle?: string;
    newTitle?: string;
  }[];
  timestamp: number;
}

export type FileHistoryAction =
  | CreateFileAction
  | DeleteFileAction
  | RenameFileAction
  | MoveFileAction
  | BatchMoveFileAction;

interface FileHistoryState {
  undoStack: FileHistoryAction[];
  redoStack: FileHistoryAction[];
  isExecuting: boolean;

  recordCreate: (item: DocumentItem, previousActiveDocId?: string | null) => void;
  recordDelete: (items: DocumentItem[], activeDocIdBefore?: string | null) => void;
  recordRename: (id: string, oldTitle: string, newTitle: string) => void;
  recordMove: (
    id: string,
    oldParentId: string | null,
    newParentId: string | null,
    title: string,
    oldTitle?: string,
    newTitle?: string
  ) => void;
  recordBatchMove: (
    moves: {
      id: string;
      oldParentId: string | null;
      newParentId: string | null;
      title: string;
      oldTitle?: string;
      newTitle?: string;
    }[]
  ) => void;
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  clearHistory: () => void;
}

const MAX_HISTORY_LENGTH = 50;

export const useFileHistoryStore = create<FileHistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  isExecuting: false,

  recordCreate: (item, previousActiveDocId) => {
    if (!item) return;
    set((state) => ({
      undoStack: [
        { type: 'create', item, previousActiveDocId, timestamp: Date.now() },
        ...state.undoStack.slice(0, MAX_HISTORY_LENGTH - 1),
      ],
      redoStack: [],
    }));
  },

  recordDelete: (items, activeDocIdBefore) => {
    if (!items || items.length === 0) return;
    set((state) => ({
      undoStack: [
        { type: 'delete', items, activeDocIdBefore, timestamp: Date.now() },
        ...state.undoStack.slice(0, MAX_HISTORY_LENGTH - 1),
      ],
      redoStack: [],
    }));
  },

  recordRename: (id, oldTitle, newTitle) => {
    if (!id || !oldTitle || !newTitle || oldTitle === newTitle) return;
    set((state) => ({
      undoStack: [
        { type: 'rename', id, oldTitle, newTitle, timestamp: Date.now() },
        ...state.undoStack.slice(0, MAX_HISTORY_LENGTH - 1),
      ],
      redoStack: [],
    }));
  },

  recordMove: (id, oldParentId, newParentId, title, oldTitle, newTitle) => {
    if (!id || oldParentId === newParentId) return;
    set((state) => ({
      undoStack: [
        { type: 'move', id, oldParentId, newParentId, title, oldTitle, newTitle, timestamp: Date.now() },
        ...state.undoStack.slice(0, MAX_HISTORY_LENGTH - 1),
      ],
      redoStack: [],
    }));
  },

  recordBatchMove: (moves) => {
    if (!moves || moves.length === 0) return;
    set((state) => ({
      undoStack: [
        { type: 'batch_move', moves, timestamp: Date.now() },
        ...state.undoStack.slice(0, MAX_HISTORY_LENGTH - 1),
      ],
      redoStack: [],
    }));
  },

  undo: async () => {
    const { undoStack, isExecuting } = get();
    if (isExecuting || undoStack.length === 0) return false;

    set({ isExecuting: true });
    const action = undoStack[0];
    const remainingUndo = undoStack.slice(1);

    try {
      if (action.type === 'create') {
        // Undo file/folder creation by moving it to trash
        await moveToTrash(action.item.id);
        useWorkspaceStore.getState().closeTabsForDocuments([action.item.id]);

        const docs = await getAllDocuments();
        useDocumentStore.setState({ documents: docs });

        if (action.previousActiveDocId) {
          await useDocumentStore.getState().setActiveDocumentById(action.previousActiveDocId);
        } else {
          const nextDoc = docs.find((d) => !d.is_folder);
          if (nextDoc) {
            await useDocumentStore.getState().setActiveDocumentById(nextDoc.id);
          } else {
            useDocumentStore.setState({ activeDocument: null, headings: [], backlinks: [] });
          }
        }
        useWorkspaceStore.getState().showToast(`Undid creation of "${action.item.title}"`, 'info');
      } else if (action.type === 'delete') {
        // 1. Instantaneous 0ms Optimistic UI Update: Merge items back into store immediately
        const currentDocs = useDocumentStore.getState().documents;
        const currentIds = new Set(currentDocs.map((d) => d.id));
        const itemsToAdd = action.items.filter((i) => !currentIds.has(i.id));
        const optimisticDocs = [...itemsToAdd, ...currentDocs];

        useDocumentStore.setState({
          documents: optimisticDocs,
          selectedDocIds: action.items.map((i) => i.id),
        });

        if (action.activeDocIdBefore) {
          useDocumentStore.getState().setActiveDocumentById(action.activeDocIdBefore);
        } else {
          const firstNonFolder = action.items.find((i) => !i.is_folder);
          if (firstNonFolder) {
            useDocumentStore.getState().setActiveDocumentById(firstNonFolder.id);
          }
        }

        if (action.items.length > 1) {
          useWorkspaceStore.getState().showToast(`Restored ${action.items.length} items`, 'success');
        } else {
          useWorkspaceStore.getState().showToast(`Restored "${action.items[0]?.title || 'item'}"`, 'success');
        }

        // 2. High-speed atomic batch restore in SQLite
        const batchIds = action.items.map((i) => i.id);
        await restoreTrashItemsBatch(batchIds);
        const finalDocs = await getAllDocuments();
        useDocumentStore.setState({ documents: finalDocs });
      } else if (action.type === 'rename') {
        await updateDocumentTitle(action.id, action.oldTitle);

        const { autoUpdateLinks } = useSettingsStore.getState();
        if (autoUpdateLinks) {
          await updateInternalLinksAcrossDocuments(action.newTitle, action.oldTitle);
        }

        const docs = await getAllDocuments();
        const active = useDocumentStore.getState().activeDocument;
        useDocumentStore.setState({
          documents: docs,
          activeDocument: active && active.id === action.id ? { ...active, title: action.oldTitle } : active,
        });
        useWorkspaceStore.getState().updateTabTitle(action.id, action.oldTitle);
        useWorkspaceStore.getState().showToast(`Restored name to "${action.oldTitle}"`, 'success');
      } else if (action.type === 'move') {
        const titleToRestore = action.oldTitle || action.title;
        if (action.oldTitle && action.newTitle && action.oldTitle !== action.newTitle) {
          await useDocumentStore.getState().renameDocument(action.id, action.oldTitle, false);
        }
        await useDocumentStore.getState().moveDocument(action.id, action.oldParentId, false);
        useWorkspaceStore.getState().showToast(`Restored position of "${titleToRestore}"`, 'success');
      } else if (action.type === 'batch_move') {
        for (const m of action.moves) {
          const titleToRestore = m.oldTitle || m.title;
          if (m.oldTitle && m.newTitle && m.oldTitle !== m.newTitle) {
            await useDocumentStore.getState().renameDocument(m.id, m.oldTitle, false);
          }
          await useDocumentStore.getState().moveDocument(m.id, m.oldParentId, false);
        }
        useWorkspaceStore.getState().showToast(`Restored positions of ${action.moves.length} items`, 'success');
      }

      set((state) => ({
        undoStack: remainingUndo,
        redoStack: [action, ...state.redoStack.slice(0, MAX_HISTORY_LENGTH - 1)],
        isExecuting: false,
      }));
      return true;
    } catch (err) {
      console.error('[Flint History] Undo error:', err);
      set({ isExecuting: false });
      return false;
    }
  },

  redo: async () => {
    const { redoStack, isExecuting } = get();
    if (isExecuting || redoStack.length === 0) return false;

    set({ isExecuting: true });
    const action = redoStack[0];
    const remainingRedo = redoStack.slice(1);

    try {
      if (action.type === 'create') {
        // Redo file creation by restoring it from trash
        await restoreTrashItem(action.item.id);
        const docs = await getAllDocuments();
        useDocumentStore.setState({ documents: docs });
        if (!action.item.is_folder) {
          await useDocumentStore.getState().setActiveDocumentById(action.item.id);
        }
        useWorkspaceStore.getState().showToast(`Restored "${action.item.title}"`, 'success');
      } else if (action.type === 'delete') {
        const deletedIds = action.items.map((i) => i.id);
        const deletedSet = new Set(deletedIds);

        // 1. Instantaneous 0ms Optimistic UI Update: Remove items from store immediately
        const currentDocs = useDocumentStore.getState().documents;
        const optimisticDocs = currentDocs.filter((d) => !deletedSet.has(d.id));
        useDocumentStore.setState({ documents: optimisticDocs, selectedDocIds: [] });
        useWorkspaceStore.getState().closeTabsForDocuments(deletedIds);

        const active = useDocumentStore.getState().activeDocument;
        if (active && deletedSet.has(active.id)) {
          const nextDoc = optimisticDocs.find((d) => !d.is_folder);
          if (nextDoc) {
            useDocumentStore.getState().setActiveDocumentById(nextDoc.id);
          } else {
            useDocumentStore.setState({ activeDocument: null, headings: [], backlinks: [] });
          }
        }

        if (action.items.length > 1) {
          useWorkspaceStore.getState().showToast(`Deleted ${action.items.length} items`, 'info');
        } else {
          useWorkspaceStore.getState().showToast(`Deleted "${action.items[0]?.title || 'item'}"`, 'info');
        }

        // 2. High-speed atomic batch move to trash in SQLite
        await moveDocumentsToTrash(deletedIds);
        const finalDocs = await getAllDocuments();
        useDocumentStore.setState({ documents: finalDocs });
      } else if (action.type === 'rename') {
        await updateDocumentTitle(action.id, action.newTitle);

        const { autoUpdateLinks } = useSettingsStore.getState();
        if (autoUpdateLinks) {
          await updateInternalLinksAcrossDocuments(action.oldTitle, action.newTitle);
        }

        const docs = await getAllDocuments();
        const active = useDocumentStore.getState().activeDocument;
        useDocumentStore.setState({
          documents: docs,
          activeDocument: active && active.id === action.id ? { ...active, title: action.newTitle } : active,
        });
        useWorkspaceStore.getState().updateTabTitle(action.id, action.newTitle);
        useWorkspaceStore.getState().showToast(`Renamed to "${action.newTitle}"`, 'success');
      } else if (action.type === 'move') {
        const titleToApply = action.newTitle || action.title;
        if (action.oldTitle && action.newTitle && action.oldTitle !== action.newTitle) {
          await useDocumentStore.getState().renameDocument(action.id, action.newTitle, false);
        }
        await useDocumentStore.getState().moveDocument(action.id, action.newParentId, false);
        useWorkspaceStore.getState().showToast(`Moved "${titleToApply}"`, 'success');
      } else if (action.type === 'batch_move') {
        for (const m of action.moves) {
          const titleToApply = m.newTitle || m.title;
          if (m.oldTitle && m.newTitle && m.oldTitle !== m.newTitle) {
            await useDocumentStore.getState().renameDocument(m.id, m.newTitle, false);
          }
          await useDocumentStore.getState().moveDocument(m.id, m.newParentId, false);
        }
        useWorkspaceStore.getState().showToast(`Moved ${action.moves.length} items`, 'success');
      }

      set((state) => ({
        redoStack: remainingRedo,
        undoStack: [action, ...state.undoStack.slice(0, MAX_HISTORY_LENGTH - 1)],
        isExecuting: false,
      }));
      return true;
    } catch (err) {
      console.error('[Flint History] Redo error:', err);
      set({ isExecuting: false });
      return false;
    }
  },

  clearHistory: () => set({ undoStack: [], redoStack: [] }),
}));

bindFlintStores({ fileHistory: useFileHistoryStore });

