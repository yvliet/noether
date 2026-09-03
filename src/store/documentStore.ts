import { create } from 'zustand';
import { emitBridgeAppEvent } from '@/core/app/storeBridge';
import {
  DocumentItem,
  TrashItem,
  HeadingItem,
  BacklinkItem,
  GlobalTaskItem,
  TagItem,
  OutgoingLinkItem,
  UnlinkedMentionItem,
  DocumentProperties,
} from '@/types';
import { platform } from '@/lib/platform/platformAdapter';
import {
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocumentTitle,
  deleteDocument,
  deleteDocuments,
  saveDocumentAndSynchronize,
  updateInternalLinksAcrossDocuments,
  toggleBookmarkDocument,
  duplicateDocument,
  getAllGlobalTasks,
  updateGlobalTaskStatus,
  updateDocumentProperties,
  moveDocument as dbMoveDocument,
  getUniqueTitleForMove,
  getDocumentPath,
  isDescendant,
  syncVaultDiskToSQLite,
} from '@/lib/db/documents';
import {
  getTrashItems,
  restoreTrashItem,
  permanentlyDeleteTrashItem,
  emptyTrash,
  cleanExpiredTrash,
} from '@/lib/db/trash';
import {
  getBacklinksForDocument,
  getOutgoingLinksWithDetails,
  getUnlinkedMentionsForDocument,
  convertUnlinkedMentionToLink,
} from '@/lib/db/links';
import { getAllVaultTags } from '@/lib/db/tags';
import { useWorkspaceStore } from './workspaceStore';
import { useSidebarDockStore } from './sidebarDockStore';
import { useSettingsStore } from './settingsStore';
import { useFileHistoryStore } from './fileHistoryStore';
import { jsonToMarkdown } from '@/lib/db/documents';
import { dbAdapter } from '@/lib/db/adapter';
import { bindFlintStores } from '@/core/app/storeBridge';

interface DocumentState {
  documents: DocumentItem[];
  trashItems: TrashItem[];
  activeDocument: DocumentItem | null;
  headings: HeadingItem[];
  backlinks: BacklinkItem[];
  outgoingLinks: OutgoingLinkItem[];
  unlinkedMentions: UnlinkedMentionItem[];
  vaultTags: TagItem[];
  documentProperties: DocumentProperties;
  globalTasks: GlobalTaskItem[];
  isLoading: boolean;
  searchQuery: string;
  editingDocId: string | null;
  selectedDocIds: string[];
  lastSelectedDocId: string | null;

  // Actions
  loadInitialData: (options?: { showLoading?: boolean }) => Promise<void>;
  loadTrash: () => Promise<TrashItem[]>;
  restoreFromTrash: (id: string) => Promise<void>;
  deletePermanently: (id: string) => Promise<void>;
  emptyAllTrash: () => Promise<void>;
  setActiveDocumentById: (id: string, options?: { preserveViewMode?: boolean }) => Promise<void>;
  createNewNote: (
    title?: string,
    parentId?: string | null,
    docType?: string,
    autoOpenInMain?: boolean
  ) => Promise<DocumentItem>;
  createNewDocument: (
    title?: string,
    parentId?: string | null,
    docType?: string,
    autoOpenInMain?: boolean
  ) => Promise<DocumentItem>;
  createNewCanvas: (title?: string, parentId?: string | null) => Promise<DocumentItem>;
  createNewFolder: (name?: string, parentId?: string | null) => Promise<DocumentItem>;
  saveAttachmentDocument: (
    filename: string,
    dataUrlOrContent: string,
    parentId?: string | null
  ) => Promise<DocumentItem>;
  renameDocument: (id: string, newTitle: string, recordHistory?: boolean) => Promise<void>;
  updateDocumentTitleInMemory: (id: string, newTitle: string) => void;
  toggleBookmark: (id: string) => Promise<void>;
  toggleBookmarkDocuments: (ids: string[]) => Promise<void>;
  duplicateNote: (id: string) => Promise<DocumentItem | null>;
  moveDocument: (id: string, targetParentId: string | null, recordHistory?: boolean) => Promise<{ success: boolean; newTitle?: string; error?: string }>;
  moveDocuments: (ids: string[], targetParentId: string | null) => Promise<{ success: boolean; movedCount: number; error?: string }>;
  removeDocument: (id: string, recordHistory?: boolean) => Promise<void>;
  removeDocuments: (ids: string[], recordHistory?: boolean) => Promise<void>;
  saveCurrentDocument: (contentJson: string, title?: string) => Promise<void>;
  saveDocumentById: (id: string, contentJson: string, title?: string) => Promise<void>;
  refreshGlobalTasks: () => Promise<void>;
  refreshVaultTags: () => Promise<void>;
  loadLinksAndMentions: (docId: string, title: string) => Promise<void>;
  convertUnlinkedMention: (sourceDocId: string, title: string) => Promise<void>;
  updateProperties: (docId: string, props: DocumentProperties) => Promise<void>;
  toggleGlobalTask: (docId: string, taskText: string, completed: boolean) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setEditingDocId: (id: string | null) => void;
  setSelectedDocIds: (ids: string[]) => void;
  selectSingleDoc: (id: string) => void;
  toggleDocSelection: (id: string) => void;
  selectDocRange: (targetId: string, visibleIds: string[], preserveExisting?: boolean) => void;
  clearSelection: () => void;
  selectAll: (visibleIds: string[]) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  trashItems: [],
  activeDocument: null,
  headings: [],
  backlinks: [],
  outgoingLinks: [],
  unlinkedMentions: [],
  vaultTags: [],
  documentProperties: {},
  globalTasks: [],
  isLoading: true,
  searchQuery: '',
  editingDocId: null,
  selectedDocIds: [],
  lastSelectedDocId: null,

  loadInitialData: async (options?: { showLoading?: boolean }) => {
    const shouldShowLoading = options?.showLoading ?? (get().documents.length === 0);
    if (shouldShowLoading) {
      set({ isLoading: true });
    }
    try {
      await cleanExpiredTrash();
      // Scan and synchronize physical vault markdown files from disk with SQLite
      await syncVaultDiskToSQLite();

      const [docs, globalTasks, tags, trash] = await Promise.all([
        getAllDocuments(),
        getAllGlobalTasks(),
        getAllVaultTags(),
        getTrashItems(),
      ]);

      set({ documents: docs, trashItems: trash, globalTasks, vaultTags: tags, isLoading: false });
      emitBridgeAppEvent('vault:loaded', { path: '', name: '' });

      const shouldRestoreTabs = useSettingsStore.getState().restoreTabs;
      const isRestored = shouldRestoreTabs
        ? useWorkspaceStore.getState().restoreTabsSession(docs)
        : false;

      if (isRestored) {
        const { tabs, activeTabId } = useWorkspaceStore.getState();
        const activeTab = tabs.find((t) => t.id === activeTabId);
        if (activeTab && activeTab.document_id && !activeTab.document_id.startsWith('__')) {
          const docExists = docs.some((d) => d.id === activeTab.document_id);
          if (docExists) {
            await get().setActiveDocumentById(activeTab.document_id, { preserveViewMode: true });
          } else {
            set({ activeDocument: null });
          }
        } else if (activeTab && (activeTab.view_type || activeTab.view_mode)) {
          useWorkspaceStore.getState().setMainViewMode((activeTab.view_type || activeTab.view_mode) as any);
          set({ activeDocument: null });
        } else {
          set({ activeDocument: null });
        }
      } else {
        if (docs.length > 0) {
          const welcomeDoc = docs.find((d) => d.id === 'welcome-to-flint') || docs.find((d) => !d.is_folder) || docs[0];
          if (welcomeDoc && !welcomeDoc.is_folder && !get().activeDocument) {
            await get().setActiveDocumentById(welcomeDoc.id);
          }
        } else {
          if (useWorkspaceStore.getState().tabs.length === 0) {
            useWorkspaceStore.getState().openEmptyTab();
          }
        }
      }
    } catch (e) {
      console.error('Failed to load initial data:', e);
      set({ isLoading: false });
    }
  },

  loadTrash: async () => {
    const trash = await getTrashItems();
    set({ trashItems: trash });
    return trash;
  },

  restoreFromTrash: async (id: string) => {
    const restored = await restoreTrashItem(id);
    const docs = await getAllDocuments();
    const trash = await getTrashItems();
    set({ documents: docs, trashItems: trash });

    if (restored.length > 0) {
      const root = restored[0];
      if (!root.is_folder) {
        await get().setActiveDocumentById(root.id);
      }
      useWorkspaceStore.getState().showToast(`Restored "${root.title}"`, 'success');
    }
  },

  deletePermanently: async (id: string) => {
    await permanentlyDeleteTrashItem(id);
    const trash = await getTrashItems();
    set({ trashItems: trash });
    useWorkspaceStore.getState().showToast('Permanently deleted from trash', 'info');
  },

  emptyAllTrash: async () => {
    await emptyTrash();
    set({ trashItems: [] });
    useWorkspaceStore.getState().showToast('Trash emptied', 'info');
  },

  setActiveDocumentById: async (id: string, options?: { preserveViewMode?: boolean }) => {
    try {
      // 1. Instantaneous 0ms optimistic update from in-memory state.documents cache
      const cachedDoc = get().documents.find((d) => d.id === id);
      if (cachedDoc) {
        let cachedProps: DocumentProperties = {};
        if (cachedDoc.properties) {
          try {
            cachedProps = typeof cachedDoc.properties === 'string' ? JSON.parse(cachedDoc.properties) : cachedDoc.properties;
          } catch (e) {}
        }

        set((state) => ({
          activeDocument: cachedDoc,
          selectedDocIds: state.selectedDocIds.length <= 1 ? [cachedDoc.id] : state.selectedDocIds,
          lastSelectedDocId: state.selectedDocIds.length <= 1 ? cachedDoc.id : state.lastSelectedDocId,
          documentProperties: cachedProps,
        }));

        emitBridgeAppEvent('document:opened', { id, title: cachedDoc.title });

        const shouldPreserve = options?.preserveViewMode === true;
        if (!shouldPreserve) {
          const targetMode = (cachedDoc.doc_type && cachedDoc.doc_type !== 'base') ? cachedDoc.doc_type : 'document';
          useWorkspaceStore.getState().setMainViewMode(targetMode);
          useWorkspaceStore.getState().openTab(cachedDoc.id, cachedDoc.title, { viewType: targetMode });
        }
      }

      // 2. Fetch full document record and secondary metadata in background
      const doc = await getDocumentById(id);
      if (!doc) return;

      const shouldCheckUnlinkedMentions =
        doc.title &&
        doc.title.trim().length >= 2 &&
        !doc.title.startsWith('Untitled');

      const [backlinks, outgoingLinks, unlinkedMentions] = await Promise.all([
        getBacklinksForDocument(id),
        getOutgoingLinksWithDetails(id),
        shouldCheckUnlinkedMentions ? getUnlinkedMentionsForDocument(id, doc.title) : Promise.resolve([]),
      ]);

      let parsedProps: DocumentProperties = {};
      if (doc.properties) {
        try {
          parsedProps = typeof doc.properties === 'string' ? JSON.parse(doc.properties) : doc.properties;
        } catch (e) {}
      }

      let headings: HeadingItem[] = [];
      let wordCount = 0;
      let charCount = 0;
      try {
        const parsed = JSON.parse(doc.content_json || '{}');
        let fullText = '';
        const extract = (node: any) => {
          if (!node) return;
          if (node.type === 'heading') {
            const text = node.content?.map((c: any) => c.text || '').join('') || '';
            headings.push({
              id: `h-${headings.length}-${text.slice(0, 15).replace(/\s+/g, '-').toLowerCase()}`,
              level: node.attrs?.level || 1,
              text,
              pos: 0,
            });
            fullText += ' ' + text;
          } else if (node.type === 'paragraph' || node.type === 'taskItem') {
            const text = node.content?.map((c: any) => c.text || '').join('') || '';
            fullText += ' ' + text;
          }
          if (node.content) node.content.forEach(extract);
        };
        if (parsed.content) parsed.content.forEach(extract);
        const clean = fullText.trim();
        wordCount = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
        charCount = clean.length;
      } catch (e) {}

      const currentActive = get().activeDocument;
      const isStillActive = currentActive?.id === doc.id;

      set((state) => {
        const existing = state.documents.find((d) => d.id === doc.id);
        const docsNeedUpdate =
          !existing ||
          existing.title !== doc.title ||
          existing.updated_at !== doc.updated_at ||
          existing.parent_id !== doc.parent_id ||
          existing.doc_type !== doc.doc_type ||
          existing.content_json !== doc.content_json;

        return {
          ...(docsNeedUpdate
            ? { documents: state.documents.map((d) => (d.id === doc.id ? { ...d, ...doc } : d)) }
            : {}),
          ...(isStillActive
            ? {
                activeDocument: doc,
                selectedDocIds: state.selectedDocIds.length <= 1 ? [doc.id] : state.selectedDocIds,
                lastSelectedDocId: state.selectedDocIds.length <= 1 ? doc.id : state.lastSelectedDocId,
                headings,
                backlinks,
                outgoingLinks,
                unlinkedMentions,
                documentProperties: parsedProps,
              }
            : {}),
        };
      });

      const shouldPreserve = options?.preserveViewMode === true;
      if (!shouldPreserve && isStillActive) {
        const targetMode = (doc.doc_type && doc.doc_type !== 'base') ? doc.doc_type : 'document';
        useWorkspaceStore.getState().setMainViewMode(targetMode);
        useWorkspaceStore.getState().openTab(doc.id, doc.title, { viewType: targetMode });
      }

      if (isStillActive) {
        useWorkspaceStore.getState().setStatusMetrics({
          backlinkCount: backlinks.length,
          wordCount,
          charCount,
        });
      }
    } catch (err) {
      console.error('Error switching active document:', err);
    }
  },

  createNewNote: async (
    title = 'Untitled',
    parentId = null,
    docType: string = 'base',
    autoOpenInMain = true
  ) => {
    const { newNoteLocation } = useSettingsStore.getState();
    let targetParentId = parentId;
    if (targetParentId === null || targetParentId === undefined) {
      if (newNoteLocation === 'same') {
        const active = get().activeDocument;
        if (active) {
          targetParentId = active.is_folder ? active.id : active.parent_id;
        }
      }
    }

    const docs = get().documents;
    const baseTitle = (title && title.trim()) || 'Untitled';
    let finalTitle = baseTitle;
    if (baseTitle === 'Untitled') {
      const existingTitles = new Set(
        docs
          .filter((d) => !d.is_folder && (d.parent_id || null) === (targetParentId || null))
          .map((d) => d.title)
      );
      if (existingTitles.has('Untitled')) {
        let counter = 1;
        while (existingTitles.has(`Untitled ${counter}`)) {
          counter++;
        }
        finalTitle = `Untitled ${counter}`;
      }
    }

    const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();
    const defaultContent = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: []
        }
      ]
    });

    const activeDocBefore = get().activeDocument?.id || null;
    const doc: DocumentItem = {
      id,
      parent_id: targetParentId,
      title: finalTitle,
      content_json: defaultContent,
      is_daily_note: 0,
      is_folder: 0,
      is_bookmarked: 0,
      doc_type: docType,
      created_at: now,
      updated_at: now,
    };

    const ws = useWorkspaceStore.getState();

    // 0ms instantaneous optimistic state update
    set((state) => ({
      documents: [doc, ...state.documents],
      editingDocId: doc.id,
      searchQuery: '',
      activeDocument: doc,
      selectedDocIds: [doc.id],
      lastSelectedDocId: doc.id,
    }));

    useFileHistoryStore.getState().recordCreate(doc, activeDocBefore);

    if (autoOpenInMain) {
      ws.setMainViewMode('document');
      ws.openTab(doc.id, doc.title);
    }

    // Persist in background without blocking UI thread
    (async () => {
      try {
        await dbAdapter.execute(
          `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, 0, 0, ?, '{}', ?, ?)`,
          [id, targetParentId, finalTitle, defaultContent, docType, now, now]
        );
        if (platform.isDesktop()) {
          const md = jsonToMarkdown(defaultContent, finalTitle);
          await platform.saveMarkdownFile(finalTitle, md);
        }
      } catch (err) {
        console.error('[DocumentStore] Failed to persist new note:', err);
      }
    })();

    return doc;
  },

  createNewDocument: async (
    title = 'Untitled',
    parentId = null,
    docType = 'base',
    autoOpenInMain = true
  ) => {
    return get().createNewNote(title, parentId, docType, autoOpenInMain);
  },

  createNewCanvas: async (title = 'Untitled', parentId = null) => {
    return get().createNewNote(title, parentId, 'canvas', true);
  },

  createNewFolder: async (name = 'Untitled', parentId = null) => {
    const docs = get().documents;
    let finalTitle = name;
    if (name === 'Untitled') {
      const existingTitles = new Set(
        docs
          .filter((d) => !!d.is_folder && (d.parent_id || null) === (parentId || null))
          .map((d) => d.title)
      );
      if (existingTitles.has('Untitled')) {
        let counter = 1;
        while (existingTitles.has(`Untitled ${counter}`)) {
          counter++;
        }
        finalTitle = `Untitled ${counter}`;
      }
    }

    const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();

    const activeDocBefore = get().activeDocument?.id || null;
    const doc: DocumentItem = {
      id,
      parent_id: parentId,
      title: finalTitle,
      content_json: '{}',
      is_daily_note: 0,
      is_folder: 1,
      is_bookmarked: 0,
      doc_type: 'base',
      created_at: now,
      updated_at: now,
    };

    set((state) => ({
      documents: [doc, ...state.documents],
      editingDocId: doc.id,
      searchQuery: '',
    }));

    useFileHistoryStore.getState().recordCreate(doc, activeDocBefore);

    useWorkspaceStore.getState().setActiveLeftView('files');
    useWorkspaceStore.getState().setIsLeftSidebarOpen(true);

    (async () => {
      try {
        await dbAdapter.execute(
          `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
           VALUES (?, ?, ?, '{}', 0, 1, 0, 'base', '{}', ?, ?)`,
          [id, parentId, finalTitle, now, now]
        );
        if (platform.isDesktop()) {
          const allDocs = get().documents;
          const folderPath = getDocumentPath(doc, allDocs);
          await platform.saveMarkdownFile('.flint_folder', '', `${folderPath}/.flint_folder`);
          await platform.deleteMarkdownFile(`${folderPath}/.flint_folder`);
        }
      } catch (err) {
        console.error('[DocumentStore] Failed to persist new folder:', err);
      }
    })();

    return doc;
  },

  saveAttachmentDocument: async (
    filename: string,
    dataUrlOrContent: string,
    parentId: string | null = null
  ) => {
    const docs = get().documents;
    let finalTitle = filename;
    const existingTitles = new Set(
      docs
        .filter((d) => !d.is_folder && (d.parent_id || null) === (parentId || null))
        .map((d) => d.title.toLowerCase())
    );

    if (existingTitles.has(finalTitle.toLowerCase())) {
      const dotIdx = finalTitle.lastIndexOf('.');
      const baseName = dotIdx !== -1 ? finalTitle.slice(0, dotIdx) : finalTitle;
      const ext = dotIdx !== -1 ? finalTitle.slice(dotIdx) : '';
      let counter = 1;
      while (existingTitles.has(`${baseName} (${counter})${ext}`.toLowerCase())) {
        counter++;
      }
      finalTitle = `${baseName} (${counter})${ext}`;
    }

    const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: dataUrlOrContent,
            },
          ],
        },
      ],
    });

    const isImg = /\.(png|jpe?g|gif|svg|webp|bmp|ico|avif)$/i.test(finalTitle);
    const isAud = /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(finalTitle);
    const isVid = /\.(mp4|webm|mov|mkv)$/i.test(finalTitle);
    const isPdf = /\.pdf$/i.test(finalTitle);
    const detectedDocType = isImg ? 'image' : isAud ? 'audio' : isVid ? 'video' : isPdf ? 'pdf' : 'base';

    const doc: DocumentItem = {
      id,
      parent_id: parentId,
      title: finalTitle,
      content_json: content,
      is_daily_note: 0,
      is_folder: 0,
      is_bookmarked: 0,
      doc_type: detectedDocType,
      created_at: now,
      updated_at: now,
    };

    set((state) => ({
      documents: [doc, ...state.documents],
    }));

    (async () => {
      try {
        await dbAdapter.execute(
          `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, 0, 0, ?, '{}', ?, ?)`,
          [id, parentId, finalTitle, content, detectedDocType, now, now]
        );
        await dbAdapter.persist();
      } catch (err) {
        console.error('[DocumentStore] Failed to persist attachment document:', err);
      }
    })();

    return doc;
  },

  renameDocument: async (id: string, newTitle: string, recordHistory = true) => {
    const doc = get().documents.find((d) => d.id === id);
    const { oldTitle } = await updateDocumentTitle(id, newTitle);
    const prevTitle = oldTitle || (doc ? doc.title : '');

    if (recordHistory && prevTitle && prevTitle !== newTitle) {
      useFileHistoryStore.getState().recordRename(id, prevTitle, newTitle);
    }

    const { autoUpdateLinks } = useSettingsStore.getState();
    if (autoUpdateLinks && prevTitle && prevTitle !== newTitle && !doc?.is_folder) {
      await updateInternalLinksAcrossDocuments(prevTitle, newTitle);
    }

    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, title: newTitle } : d)),
      activeDocument: state.activeDocument && state.activeDocument.id === id ? { ...state.activeDocument, title: newTitle } : state.activeDocument,
    }));

    emitBridgeAppEvent('document:renamed', { id, oldTitle: prevTitle, newTitle });

    useWorkspaceStore.getState().updateTabTitle(id, newTitle);
  },

  updateDocumentTitleInMemory: (id: string, newTitle: string) => {
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, title: newTitle } : d)),
      activeDocument: state.activeDocument && state.activeDocument.id === id ? { ...state.activeDocument, title: newTitle } : state.activeDocument,
    }));
    useWorkspaceStore.getState().updateTabTitle(id, newTitle);
  },

  toggleBookmark: async (id: string) => {
    const docs = get().documents;
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;

    const nextBookmarked = !doc.is_bookmarked;
    await toggleBookmarkDocument(id, nextBookmarked);

    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, is_bookmarked: nextBookmarked ? 1 : 0 } : d)),
      activeDocument: state.activeDocument && state.activeDocument.id === id ? { ...state.activeDocument, is_bookmarked: nextBookmarked ? 1 : 0 } : state.activeDocument,
    }));
  },

  toggleBookmarkDocuments: async (ids: string[]) => {
    const docs = get().documents;
    const selectedDocs = docs.filter((d) => ids.includes(d.id));
    if (selectedDocs.length === 0) return;

    const allBookmarked = selectedDocs.every((d) => d.is_bookmarked);
    const nextState = !allBookmarked;

    for (const doc of selectedDocs) {
      await toggleBookmarkDocument(doc.id, nextState);
    }

    set((state) => ({
      documents: state.documents.map((d) =>
        ids.includes(d.id) ? { ...d, is_bookmarked: nextState ? 1 : 0 } : d
      ),
      activeDocument:
        state.activeDocument && ids.includes(state.activeDocument.id)
          ? { ...state.activeDocument, is_bookmarked: nextState ? 1 : 0 }
          : state.activeDocument,
    }));
  },

  duplicateNote: async (id: string) => {
    const activeDocBefore = get().activeDocument?.id || null;
    const copy = await duplicateDocument(id);
    if (copy) {
      set((state) => ({ documents: [copy, ...state.documents] }));
      useFileHistoryStore.getState().recordCreate(copy, activeDocBefore);
      useWorkspaceStore.getState().setMainViewMode('document');
      await get().setActiveDocumentById(copy.id);
    }
    return copy;
  },

  moveDocument: async (id: string, targetParentId: string | null, recordHistory = true) => {
    const docs = get().documents;
    const docToMove = docs.find((d) => d.id === id);
    if (!docToMove) return { success: false, error: 'Item not found' };

    const oldParentId = docToMove.parent_id || null;
    const oldTitle = docToMove.title;

    // Same parent check
    if (oldParentId === (targetParentId || null)) {
      return { success: true, newTitle: oldTitle };
    }

    // Target parent validity check
    if (targetParentId) {
      if (targetParentId === id) {
        return { success: false, error: 'Cannot move an item into itself' };
      }
      const targetDoc = docs.find((d) => d.id === targetParentId);
      if (!targetDoc || !targetDoc.is_folder) {
        return { success: false, error: 'Target is not a folder' };
      }
      if (docToMove.is_folder && isDescendant(targetParentId, id, docs)) {
        return { success: false, error: 'Cannot move a folder into its own subfolder' };
      }
    }

    // Calculate unique title for destination (auto-increments: "name 1", "name 2", etc. if duplicate exists)
    const finalTitle = getUniqueTitleForMove(oldTitle, targetParentId, docs, id);
    const wasRenamed = finalTitle !== oldTitle;

    const oldRel = getDocumentPath(docToMove, docs);
    const newRel = getDocumentPath({ id, title: finalTitle, parent_id: targetParentId }, docs);

    const success = await dbMoveDocument(id, targetParentId, wasRenamed ? finalTitle : undefined);
    if (success) {
      if (platform.isDesktop()) {
        try {
          if (oldRel !== newRel || wasRenamed) {
            await platform.renameMarkdownFile(oldTitle, finalTitle, oldRel, newRel);
          }
        } catch (e) {
          console.error('[DocumentStore] Failed to move file on disk:', e);
        }
      }

      if (recordHistory) {
        useFileHistoryStore.getState().recordMove(id, oldParentId, targetParentId, finalTitle, oldTitle, finalTitle);
      }

      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, parent_id: targetParentId, title: finalTitle } : d
        ),
        activeDocument:
          state.activeDocument && state.activeDocument.id === id
            ? { ...state.activeDocument, parent_id: targetParentId, title: finalTitle }
            : state.activeDocument,
      }));

      if (wasRenamed) {
        useWorkspaceStore.getState().updateTabTitle(id, finalTitle);
      }

      return { success: true, newTitle: finalTitle };
    }
    return { success: false, error: 'Database update failed' };
  },

  moveDocuments: async (ids: string[], targetParentId: string | null) => {
    if (!ids || ids.length === 0) return { success: false, movedCount: 0, error: 'No items selected' };
    const docs = get().documents;
    const selectedSet = new Set(ids);

    const topLevelIds = ids.filter((id) => {
      let curr = docs.find((d) => d.id === id);
      while (curr && curr.parent_id) {
        if (selectedSet.has(curr.parent_id)) {
          return false;
        }
        curr = docs.find((d) => d.id === curr?.parent_id);
      }
      return true;
    });

    let movedCount = 0;
    let lastError: string | undefined;
    const isBatch = topLevelIds.length > 1;
    const batchMoves: {
      id: string;
      oldParentId: string | null;
      newParentId: string | null;
      title: string;
      oldTitle?: string;
      newTitle?: string;
    }[] = [];

    for (const id of topLevelIds) {
      if (id === targetParentId) continue;
      const doc = docs.find((d) => d.id === id);
      if (doc?.is_folder && targetParentId && isDescendant(targetParentId, id, docs)) {
        continue;
      }
      const oldParentId = doc?.parent_id || null;
      const oldTitle = doc?.title || '';

      const res = await get().moveDocument(id, targetParentId, !isBatch);
      if (res.success) {
        movedCount++;
        if (isBatch && doc) {
          batchMoves.push({
            id,
            oldParentId,
            newParentId: targetParentId,
            title: res.newTitle || oldTitle,
            oldTitle,
            newTitle: res.newTitle || oldTitle,
          });
        }
      } else if (res.error) {
        lastError = res.error;
      }
    }

    if (isBatch && batchMoves.length > 0) {
      useFileHistoryStore.getState().recordBatchMove(batchMoves);
    }

    return {
      success: movedCount > 0,
      movedCount,
      error: movedCount === 0 ? lastError : undefined,
    };
  },

  removeDocument: async (id: string, recordHistory = true) => {
    await get().removeDocuments([id], recordHistory);
  },

  removeDocuments: async (ids: string[], recordHistory = true) => {
    if (!ids || ids.length === 0) return;
    const { documents: prevDocs, activeDocument: active, selectedDocIds } = get();
    const activeIdBefore = active?.id || null;

    // 1. Instantaneously collect all deleted IDs and their descendants in memory
    const deletedIds = new Set<string>();
    const collectDescendants = (docId: string) => {
      deletedIds.add(docId);
      const children = prevDocs.filter((d) => d.parent_id === docId);
      for (const child of children) {
        collectDescendants(child.id);
      }
    };
    for (const id of ids) {
      collectDescendants(id);
    }

    const remainingDocs = prevDocs.filter((d) => !deletedIds.has(d.id));
    const nextSelectedDocIds = selectedDocIds.filter((selId) => !deletedIds.has(selId));

    // 2. Instantaneously close tabs for all deleted documents (if enabled by setting)
    const { closeTabsOnDelete } = useSettingsStore.getState();
    if (closeTabsOnDelete) {
      useWorkspaceStore.getState().closeTabsForDocuments(Array.from(deletedIds));
    }
    deletedIds.forEach((id) => {
      useSidebarDockStore.getState().undockItem(`doc:${id}`);
    });

    // 3. Instantaneously calculate next active document if current was deleted
    let nextActiveDoc = active;
    const isCurrentActiveDeleted = active && deletedIds.has(active.id);
    if (isCurrentActiveDeleted) {
      if (closeTabsOnDelete) {
        const focusedPane = useWorkspaceStore.getState().panes[useWorkspaceStore.getState().focusedPaneId || 'main'];
        const focusedTab = focusedPane?.tabs.find((t) => t.id === focusedPane.activeTabId);
        nextActiveDoc = focusedTab?.document_id && !focusedTab.document_id.startsWith('__')
          ? remainingDocs.find((d) => d.id === focusedTab.document_id) || null
          : null;
      } else {
        // Keeping dead tab open: active document becomes null (rendered as DeadDocumentView)
        nextActiveDoc = null;
      }
    }

    // 4. INSTANTANEOUS STATE UPDATE (0ms): UI updates immediately on the exact same tick!
    set({
      documents: remainingDocs,
      selectedDocIds: nextSelectedDocIds,
      lastSelectedDocId: nextSelectedDocIds[0] || null,
      activeDocument: nextActiveDoc,
    });

    if (isCurrentActiveDeleted && nextActiveDoc) {
      get().setActiveDocumentById(nextActiveDoc.id, { preserveViewMode: true });
    }

    // 5. Asynchronously persist to SQLite and physical disk in background without blocking UI
    try {
      const deletedItems = await deleteDocuments(Array.from(deletedIds));
      if (recordHistory && deletedItems && deletedItems.length > 0) {
        useFileHistoryStore.getState().recordDelete(deletedItems, activeIdBefore);
      }
      deletedIds.forEach((deletedId) => {
        emitBridgeAppEvent('document:deleted', { id: deletedId });
      });
      const trash = await getTrashItems(true);
      set({ trashItems: trash });
    } catch (err) {
      console.error('[DocumentStore] Error moving documents to trash in background:', err);
    }
  },

  saveCurrentDocument: async (contentJson: string, title?: string) => {
    const active = get().activeDocument;
    if (!active) return;
    const docId = active.id;
    const currentTitle = title !== undefined ? title : active.title;

    const { headings, wordCount, charCount } = await saveDocumentAndSynchronize(
      docId,
      contentJson,
      title
    );

    // Only refresh note-specific data on save (decoupled from vault-wide scans)
    const [backlinks, outgoingLinks, unlinkedMentions] = await Promise.all([
      getBacklinksForDocument(docId),
      getOutgoingLinksWithDetails(docId),
      getUnlinkedMentionsForDocument(docId, currentTitle),
    ]);

    const currentActive = get().activeDocument;
    const isStillActive = currentActive && currentActive.id === docId;

    const updatedDocs = get().documents.map((d) =>
      d.id === docId ? { ...d, title: currentTitle, content_json: contentJson } : d
    );

    if (isStillActive) {
      set({
        documents: updatedDocs,
        activeDocument: { ...currentActive, title: currentTitle, content_json: contentJson },
        headings,
        backlinks,
        outgoingLinks,
        unlinkedMentions,
      });

      useWorkspaceStore.getState().setStatusMetrics({
        wordCount,
        charCount,
        backlinkCount: backlinks.length,
      });
    } else {
      set({ documents: updatedDocs });
    }

    emitBridgeAppEvent('document:saved', { id: docId, title: currentTitle });

    if (title && title !== active.title) {
      useWorkspaceStore.getState().updateTabTitle(docId, title);
    }
  },

  saveDocumentById: async (id: string, contentJson: string, title?: string) => {
    const { headings, wordCount, charCount } = await saveDocumentAndSynchronize(
      id,
      contentJson,
      title
    );
    const currentActive = get().activeDocument;
    const isStillActive = currentActive && currentActive.id === id;
    const currentTitle = title || currentActive?.title || '';

    if (isStillActive) {
      const [backlinks, outgoingLinks, unlinkedMentions] = await Promise.all([
        getBacklinksForDocument(id),
        getOutgoingLinksWithDetails(id),
        getUnlinkedMentionsForDocument(id, currentTitle),
      ]);
      const updatedDocs = get().documents.map((d) =>
        d.id === id ? { ...d, title: currentTitle, content_json: contentJson } : d
      );
      set({
        documents: updatedDocs,
        activeDocument: { ...currentActive, title: currentTitle, content_json: contentJson },
        headings,
        backlinks,
        outgoingLinks,
        unlinkedMentions,
      });
      useWorkspaceStore.getState().setStatusMetrics({
        wordCount,
        charCount,
        backlinkCount: backlinks.length,
      });
    } else {
      set((state) => ({
        documents: state.documents.map((d) =>
          d.id === id ? { ...d, ...(title ? { title } : {}), content_json: contentJson } : d
        ),
      }));
    }

    emitBridgeAppEvent('document:saved', { id, title: currentTitle });

    if (title) {
      useWorkspaceStore.getState().updateTabTitle(id, title);
    }
  },

  refreshGlobalTasks: async () => {
    const tasks = await getAllGlobalTasks();
    set({ globalTasks: tasks });
  },

  refreshVaultTags: async () => {
    const tags = await getAllVaultTags();
    set({ vaultTags: tags });
  },

  loadLinksAndMentions: async (docId: string, title: string) => {
    const [backlinks, outgoingLinks, unlinkedMentions] = await Promise.all([
      getBacklinksForDocument(docId),
      getOutgoingLinksWithDetails(docId),
      getUnlinkedMentionsForDocument(docId, title),
    ]);
    set({ backlinks, outgoingLinks, unlinkedMentions });
  },

  convertUnlinkedMention: async (sourceDocId: string, title: string) => {
    const success = await convertUnlinkedMentionToLink(sourceDocId, title);
    if (success) {
      const active = get().activeDocument;
      if (active) {
        await get().loadLinksAndMentions(active.id, active.title);
      }
    }
  },

  updateProperties: async (docId: string, props: DocumentProperties) => {
    const propsJson = JSON.stringify(props);
    const active = get().activeDocument;

    // Instantaneous optimistic update in memory (0ms)
    set((state) => ({
      documents: state.documents.map((d) => (d.id === docId ? { ...d, properties: propsJson } : d)),
      activeDocument: active && active.id === docId ? { ...active, properties: propsJson } : active,
      documentProperties: active && active.id === docId ? props : state.documentProperties,
    }));

    try {
      await updateDocumentProperties(docId, propsJson);
    } catch (e) {
      console.error('[DocumentStore] Failed to update properties on disk:', e);
    }
  },

  toggleGlobalTask: async (docId: string, taskText: string, completed: boolean) => {
    await updateGlobalTaskStatus(docId, taskText, completed);
    await get().refreshGlobalTasks();
    const active = get().activeDocument;
    if (active && active.id === docId) {
      const updated = await getDocumentById(docId);
      if (updated) set({ activeDocument: updated });
    }
  },

  setSearchQuery: (q: string) => set({ searchQuery: q }),
  setEditingDocId: (id: string | null) => set({ editingDocId: id }),

  setSelectedDocIds: (ids: string[]) => set({ selectedDocIds: ids }),
  selectSingleDoc: (id: string) => set({ selectedDocIds: [id], lastSelectedDocId: id }),
  toggleDocSelection: (id: string) => {
    const current = get().selectedDocIds;
    if (current.includes(id)) {
      set({
        selectedDocIds: current.filter((i) => i !== id),
        lastSelectedDocId: id,
      });
    } else {
      set({
        selectedDocIds: [...current, id],
        lastSelectedDocId: id,
      });
    }
  },
  selectDocRange: (targetId: string, visibleIds: string[], preserveExisting = false) => {
    const { lastSelectedDocId, selectedDocIds, activeDocument } = get();

    // 1. Resolve robust anchor ID
    let anchorId: string | null = null;
    if (lastSelectedDocId && visibleIds.includes(lastSelectedDocId)) {
      anchorId = lastSelectedDocId;
    } else if (activeDocument && visibleIds.includes(activeDocument.id)) {
      anchorId = activeDocument.id;
    } else if (selectedDocIds.length > 0) {
      const firstVisible = selectedDocIds.find((id) => visibleIds.includes(id));
      if (firstVisible) anchorId = firstVisible;
    }

    if (!anchorId) {
      anchorId = targetId;
    }

    const fromIndex = visibleIds.indexOf(anchorId);
    const toIndex = visibleIds.indexOf(targetId);

    if (fromIndex === -1 || toIndex === -1) {
      set({ selectedDocIds: [targetId], lastSelectedDocId: targetId });
      return;
    }

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const range = visibleIds.slice(start, end + 1);

    if (preserveExisting) {
      const merged = Array.from(new Set([...selectedDocIds, ...range]));
      set({ selectedDocIds: merged, lastSelectedDocId: anchorId });
    } else {
      set({ selectedDocIds: range, lastSelectedDocId: anchorId });
    }
  },
  clearSelection: () => set({ selectedDocIds: [], lastSelectedDocId: null }),
  selectAll: (visibleIds: string[]) =>
    set({ selectedDocIds: visibleIds, lastSelectedDocId: visibleIds[0] || null }),
}));

bindFlintStores({ document: useDocumentStore });

