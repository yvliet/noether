import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSidebarDockStore } from '@/store/sidebarDockStore';
import { useSettingsStore } from '@/store/settingsStore';
import { TipTapEditor } from './TipTapEditor';
import { SourceModeEditor } from './SourceModeEditor';
import { DocOptionsMenu } from './DocOptionsMenu';
import { FindReplaceBar } from './FindReplaceBar';
import { DeadDocumentView } from './DeadDocumentView';
import { useFlintApp, useExtensionList, useDocumentHeaders, useDocumentFooters, useBreadcrumbProviders, useBreadcrumbDecorators, useDocumentTitleDecorators } from '@/core/app/AppContext';
import { getDocumentPath, getDocumentPathParts, getDocumentBreadcrumbParts, isDocumentLocked } from '@/lib/db/documents';
import { DocumentProperties } from '@/types';
import {
  FileAddIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BookOpen01Icon,
  Edit02Icon,
  Bookmark01Icon,
  Search01Icon,
  Tag01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@/components/common/Icons';

interface DocumentHeaderItemProps {
  header: import('@/core/extensions/types').DocumentHeaderDefinition;
  documentId: string;
  document: any;
  mode: 'Visible' | 'Source';
  isFolded: boolean;
  app: any;
}

const DocumentHeaderItem: React.FC<DocumentHeaderItemProps> = React.memo(({
  header,
  documentId,
  document,
  mode,
  isFolded,
  app,
}) => {
  return <>{header.render({ documentId, document, mode, isFolded, app })}</>;
});

interface DocumentFooterItemProps {
  footer: import('@/core/extensions/types').DocumentFooterDefinition;
  documentId: string;
  documentTitle: string;
  document: any;
  app: any;
}

const DocumentFooterItem: React.FC<DocumentFooterItemProps> = React.memo(({
  footer,
  documentId,
  documentTitle,
  document,
  app,
}) => {
  return <>{footer.render({ documentId, documentTitle, document, app })}</>;
});

interface EditorCanvasProps {
  pane?: 'main' | 'split';
  paneId?: string;
  documentId?: string;
  isSidebar?: boolean;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = React.memo(({ pane = 'main', paneId, documentId, isSidebar }) => {
  const currentPaneId = paneId || (pane === 'split' ? 'split' : 'main');
  const isSidebarMode = Boolean(isSidebar || currentPaneId.startsWith('sidebar:'));
  const documents = useDocumentStore((s) => s.documents);
  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const saveCurrentDocument = useDocumentStore((s) => s.saveCurrentDocument);
  const saveDocumentById = useDocumentStore((s) => s.saveDocumentById);
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);
  const updateDocumentTitleInMemory = useDocumentStore((s) => s.updateDocumentTitleInMemory);
  const toggleBookmark = useDocumentStore((s) => s.toggleBookmark);
  const renameDocument = useDocumentStore((s) => s.renameDocument);

  const app = useFlintApp();
  useExtensionList(); // Subscribe to reactive extension state changes
  const documentHeaders = useDocumentHeaders();
  const documentFooters = useDocumentFooters();
  const hasActiveHeaders = documentHeaders.length > 0;

  const inlineTitle = useSettingsStore((s) => s.inlineTitle);
  const readableLineLength = useSettingsStore((s) => s.readableLineLength);
  const defaultTabMode = useSettingsStore((s) => s.defaultTabMode);
  const defaultEditingMode = useSettingsStore((s) => s.defaultEditingMode);
  const propertiesInDoc = useSettingsStore((s) => s.propertiesInDoc);
  const foldHeading = useSettingsStore((s) => s.foldHeading);
  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const indentationGuides = useSettingsStore((s) => s.indentationGuides);
  const accentListPrefixes = useSettingsStore((s) => s.accentListPrefixes);
  const strictLineBreaks = useSettingsStore((s) => s.strictLineBreaks);

  const canGoBack = useWorkspaceStore((s) => s.canGoBack);
  const canGoForward = useWorkspaceStore((s) => s.canGoForward);
  const navigateBack = useWorkspaceStore((s) => s.navigateBack);
  const navigateForward = useWorkspaceStore((s) => s.navigateForward);
  const openSplitTab = useWorkspaceStore((s) => s.openSplitTab);
  const splitActiveDocumentId = useWorkspaceStore((s) => s.splitActiveDocumentId);
  const setSplitActiveDocumentId = useWorkspaceStore((s) => s.setSplitActiveDocumentId);
  const setActivePane = useWorkspaceStore((s) => s.setActivePane);
  const setFocusedPane = useWorkspaceStore((s) => s.setFocusedPane);
  const updateTabTitle = useWorkspaceStore((s) => s.updateTabTitle);
  const openTabInPane = useWorkspaceStore((s) => s.openTabInPane);
  const closeTabInPane = useWorkspaceStore((s) => s.closeTabInPane);
  const setIsCommandPaletteOpen = useWorkspaceStore((s) => s.setIsCommandPaletteOpen);
  const setIsHelpModalOpen = useWorkspaceStore((s) => s.setIsHelpModalOpen);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const splitTabs = useWorkspaceStore((s) => s.splitTabs);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const splitActiveTabId = useWorkspaceStore((s) => s.splitActiveTabId);
  const closeSplitTab = useWorkspaceStore((s) => s.closeSplitTab);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const panes = useWorkspaceStore((s) => s.panes);
  const paneModel = panes[currentPaneId];
  const breadcrumbProviders = useBreadcrumbProviders();
  const breadcrumbDecorators = useBreadcrumbDecorators();
  const documentTitleDecorators = useDocumentTitleDecorators();

  const activeTab = useMemo(() => {
    if (paneModel) {
      return paneModel.tabs.find((t) => t.id === paneModel.activeTabId) || null;
    }
    if (pane === 'split') {
      return splitTabs.find((t) => t.id === splitActiveTabId) || null;
    }
    return tabs.find((t) => t.id === activeTabId) || null;
  }, [paneModel, pane, splitTabs, splitActiveTabId, tabs, activeTabId]);

  // Determine current document based on explicit documentId prop / active tab / pane
  const currentDoc = useMemo(() => {
    let targetDocId: string | null = null;
    if (documentId) {
      targetDocId = documentId;
    } else if (activeTab) {
      const tabDocId = activeTab.document_id;
      if (tabDocId && !tabDocId.startsWith('__')) {
        targetDocId = tabDocId;
      } else {
        // Tab exists (e.g. empty tab or special non-document tab), but has no document ID
        return null;
      }
    } else if (paneModel) {
      if (paneModel.activeDocumentId && !paneModel.activeDocumentId.startsWith('__')) {
        targetDocId = paneModel.activeDocumentId;
      } else {
        return null;
      }
    }

    if (targetDocId) {
      if (activeDocument && activeDocument.id === targetDocId) {
        return activeDocument;
      }
      return documents.find((d) => d.id === targetDocId) || null;
    }
    return null;
  }, [documentId, activeTab, paneModel, documents, activeDocument]);


  const matchedBreadcrumbProvider = useMemo(() => {
    if (!currentDoc) return null;
    return (
      breadcrumbProviders.find((p) =>
        p.matches({ tab: activeTab || undefined, doc: currentDoc, isSplit: currentPaneId !== 'main' })
      ) || null
    );
  }, [breadcrumbProviders, activeTab, currentDoc, currentPaneId]);

  const breadcrumbItems = useMemo(() => {
    if (!currentDoc) return [];
    const defaultParts = getDocumentBreadcrumbParts(currentDoc, documents);
    if (matchedBreadcrumbProvider) {
      const custom = matchedBreadcrumbProvider.getBreadcrumbs({
        tab: activeTab || undefined,
        doc: currentDoc,
        defaultBreadcrumbs: defaultParts,
        app,
      });
      if (custom && custom.length > 0) return custom;
    }
    return defaultParts;
  }, [currentDoc, documents, matchedBreadcrumbProvider, activeTab, app]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isReadingMode, setIsReadingMode] = useState(defaultTabMode === 'Reading view');

  const breadcrumbTitleOverride = useMemo(() => {
    if (!currentDoc || !matchedBreadcrumbProvider?.getTitleOverride) return undefined;
    return matchedBreadcrumbProvider.getTitleOverride({
      tab: activeTab || undefined,
      doc: currentDoc,
      defaultTitle: title || currentDoc.title || 'Untitled',
    });
  }, [currentDoc, matchedBreadcrumbProvider, activeTab, title]);

  const isLocked = useMemo(() => {
    return isDocumentLocked(currentDoc);
  }, [currentDoc]);

  const isImageDoc = useMemo(() => {
    if (!currentDoc) return false;
    if (currentDoc.doc_type === 'image') return true;
    return /\.(png|jpe?g|gif|svg|webp|bmp|ico|avif)$/i.test(currentDoc.title);
  }, [currentDoc]);

  const isAudioDoc = useMemo(() => {
    if (!currentDoc) return false;
    if (currentDoc.doc_type === 'audio') return true;
    return /\.(mp3|wav|ogg|m4a|aac|flac|opus|wma)$/i.test(currentDoc.title);
  }, [currentDoc]);

  const isVideoDoc = useMemo(() => {
    if (!currentDoc) return false;
    if (currentDoc.doc_type === 'video') return true;
    return /\.(mp4|webm|ogv|mov|mkv|avi)$/i.test(currentDoc.title);
  }, [currentDoc]);

  const isPdfDoc = useMemo(() => {
    if (!currentDoc) return false;
    if (currentDoc.doc_type === 'pdf') return true;
    return /\.pdf$/i.test(currentDoc.title);
  }, [currentDoc]);

  const isMediaDoc = isImageDoc || isAudioDoc || isVideoDoc || isPdfDoc;

  const mediaSrc = useMemo(() => {
    if (!currentDoc) return '';
    if (currentDoc.content_json) {
      try {
        const parsed = JSON.parse(currentDoc.content_json);
        const text = parsed.content?.[0]?.content?.[0]?.text;
        if (text && (text.startsWith('data:') || text.startsWith('http') || text.startsWith('blob:') || text.startsWith('file:'))) {
          return text;
        }
      } catch {}
    }
    return currentDoc.title;
  }, [currentDoc]);

  const effectiveReadingMode = isReadingMode || isLocked || isMediaDoc;
  const isEditable = !effectiveReadingMode;
  const isSourceMode = !effectiveReadingMode && defaultEditingMode === 'Source mode';

  const titlePrefixNodes = useMemo(() => {
    if (!currentDoc || documentTitleDecorators.length === 0) return [];
    const ctx = {
      doc: currentDoc,
      tab: activeTab || undefined,
      app,
      isReadingMode: Boolean(effectiveReadingMode),
    };
    const nodes: React.ReactNode[] = [];
    for (const d of documentTitleDecorators) {
      if (d.matches && !d.matches(ctx)) continue;
      const res = d.renderPrefix?.(ctx);
      if (res !== undefined && res !== null) {
        nodes.push(res);
      }
    }
    return nodes;
  }, [currentDoc, documentTitleDecorators, activeTab, app, effectiveReadingMode]);

  const [isEditingSubheader, setIsEditingSubheader] = useState(false);
  const [isMainTitleFocused, setIsMainTitleFocused] = useState(false);
  const subheaderInputRef = useRef<HTMLInputElement>(null);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [editorMinHeight, setEditorMinHeight] = useState<number | undefined>(undefined);

  // Maintain minimum height of editor canvas when there is no scrollbar
  // so expanding footer widgets (e.g. linked mentions) expands downward and adds a scrollbar,
  // instead of shrinking the editor above and jumping upwards.
  useLayoutEffect(() => {
    const scrollEl = scrollViewportRef.current;
    const editorEl = editorWrapperRef.current;
    if (!scrollEl || !editorEl) return;
    if (documentFooters.length === 0) {
      if (editorMinHeight !== undefined) setEditorMinHeight(undefined);
      return;
    }

    // Check if there is currently NO vertical scrollbar (with a 2px subpixel threshold)
    const hasScrollbar = scrollEl.scrollHeight > scrollEl.clientHeight + 2;

    if (!hasScrollbar) {
      const currentHeight = editorEl.offsetHeight;
      if (currentHeight > 0 && currentHeight !== editorMinHeight) {
        setEditorMinHeight(currentHeight);
      }
    }
  });

  useEffect(() => {
    const handleResize = () => {
      setEditorMinHeight(undefined);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleBacklinksToggle = (e: Event) => {
      const isOpen = (e as CustomEvent).detail?.isOpen;
      if (!isOpen) {
        setEditorMinHeight(undefined);
      }
    };
    window.addEventListener('flint:backlinks-toggled', handleBacklinksToggle);
    return () => window.removeEventListener('flint:backlinks-toggled', handleBacklinksToggle);
  }, []);

  useEffect(() => {
    setEditorMinHeight(undefined);
  }, [currentDoc?.id, content, documentFooters.length]);

  const defaultHeaderFolded = useMemo(() => {
    return documentHeaders.some((h) =>
      typeof h.defaultFolded === 'function' ? h.defaultFolded(app, currentDoc?.id) : !!h.defaultFolded
    );
  }, [documentHeaders, app, currentDoc?.id]);

  const [isHeaderFolded, setIsHeaderFolded] = useState<boolean>(() => {
    if (!currentDoc) return defaultHeaderFolded;
    try {
      const stored = localStorage.getItem(`flint_props_folded_${currentDoc.id}`);
      return stored !== null ? JSON.parse(stored) : defaultHeaderFolded;
    } catch {
      return defaultHeaderFolded;
    }
  });

  useEffect(() => {
    const handleFindEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.paneId !== undefined && detail.paneId !== currentPaneId) return;
      setIsFindOpen((prevFind) => {
        if (prevFind) {
          setIsReplaceOpen(false);
          return false;
        }
        setIsReplaceOpen(false);
        return true;
      });
    };

    const handleReplaceEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.paneId !== undefined && detail.paneId !== currentPaneId) return;
      setIsFindOpen((prevFind) => {
        if (!prevFind) {
          setIsReplaceOpen(true);
          return true;
        }
        setIsReplaceOpen((prevReplace) => !prevReplace);
        return true;
      });
    };

    window.addEventListener('flint:find-in-note', handleFindEvent);
    window.addEventListener('flint:replace-in-note', handleReplaceEvent);

    return () => {
      window.removeEventListener('flint:find-in-note', handleFindEvent);
      window.removeEventListener('flint:replace-in-note', handleReplaceEvent);
    };
  }, [currentPaneId]);


  useEffect(() => {
    setIsReadingMode(defaultTabMode === 'Reading view');
  }, [defaultTabMode]);

  useEffect(() => {
    if (currentDoc) {
      try {
        const stored = localStorage.getItem(`flint_props_folded_${currentDoc.id}`);
        setIsHeaderFolded(stored !== null ? JSON.parse(stored) : defaultHeaderFolded);
      } catch {
        setIsHeaderFolded(defaultHeaderFolded);
      }
    }
  }, [currentDoc?.id, defaultHeaderFolded]);

  useEffect(() => {
    const handleDefaultFoldChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const nextStartFolded = detail?.startFolded ?? defaultHeaderFolded;
      if (currentDoc) {
        const stored = localStorage.getItem(`flint_props_folded_${currentDoc.id}`);
        if (stored === null) {
          setIsHeaderFolded(nextStartFolded);
        }
      } else {
        setIsHeaderFolded(nextStartFolded);
      }
    };
    window.addEventListener('flint:header-fold-default-changed', handleDefaultFoldChanged);
    return () => {
      window.removeEventListener('flint:header-fold-default-changed', handleDefaultFoldChanged);
    };
  }, [currentDoc?.id, defaultHeaderFolded]);

  const toggleHeaderFold = useCallback(() => {
    if (!currentDoc) return;
    setIsHeaderFolded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`flint_props_folded_${currentDoc.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [currentDoc]);

  const isDuplicateTitle = useMemo(() => {
    if (!currentDoc) return false;
    if (!isMainTitleFocused && !isEditingSubheader) return false;
    const trimmed = title.trim().toLowerCase();
    if (!trimmed) return false;
    if (trimmed === currentDoc.title.trim().toLowerCase()) return false;
    return documents.some(
      (d) =>
        d.id !== currentDoc.id &&
        !d.is_folder &&
        d.title.trim().toLowerCase() === trimmed
    );
  }, [documents, title, currentDoc, isMainTitleFocused, isEditingSubheader]);

  const activeDocIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<any>(null);
  const pendingContentRef = useRef<string | null>(null);

  // Helper to flush any pending save immediately
  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const docId = activeDocIdRef.current;
    const contentToSave = pendingContentRef.current;

    if (docId && contentToSave !== null) {
      pendingContentRef.current = null;

      const currentContent = contentToSave;

      useDocumentStore.setState((s) => ({
        documents: s.documents.map((d) =>
          d.id === docId ? { ...d, content_json: currentContent } : d
        ),
        activeDocument:
          s.activeDocument && s.activeDocument.id === docId
            ? { ...s.activeDocument, content_json: currentContent }
            : s.activeDocument,
      }));

      saveDocumentById(docId, currentContent);
    }
  }, [saveDocumentById]);

  // Sync state when active document changes
  useEffect(() => {
    if (currentDoc) {
      const docChanged = activeDocIdRef.current !== currentDoc.id;

      if (docChanged) {
        // 1. Immediately flush pending save for the OLD document before loading the new one!
        flushPendingSave();

        activeDocIdRef.current = currentDoc.id;
        setTitle(currentDoc.title);
        const safeContent =
          currentDoc.content_json && currentDoc.content_json !== '{}'
            ? currentDoc.content_json
            : JSON.stringify({
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [],
                  },
                ],
              });
        setContent(safeContent);
        setIsEditingSubheader(false);
      } else {
        // Same document updated (e.g. from background auto-save or edit from another pane)
        if (!isEditingSubheader && !isMainTitleFocused) {
          setTitle(currentDoc.title);
        }
        if (pendingContentRef.current === null && currentDoc.content_json) {
          setContent(currentDoc.content_json);
        }
      }
    } else {
      flushPendingSave();
      activeDocIdRef.current = null;
      setTitle('');
      setContent('');
      setIsEditingSubheader(false);
    }
  }, [currentDoc?.id, currentDoc?.title, currentDoc?.content_json, saveDocumentById, isEditingSubheader, isMainTitleFocused]);

  // Flush on unmount (e.g. switching views, closing pane)
  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  // Flush on window blur (alt-tabbing), beforeunload (closing tab/window), pagehide, visibility change, and explicit save event
  useEffect(() => {
    const handleBlurOrUnload = () => {
      flushPendingSave();
    };
    window.addEventListener('blur', handleBlurOrUnload);
    window.addEventListener('beforeunload', handleBlurOrUnload);
    window.addEventListener('pagehide', handleBlurOrUnload);
    document.addEventListener('visibilitychange', handleBlurOrUnload);
    window.addEventListener('flint:save-note', handleBlurOrUnload);
    return () => {
      window.removeEventListener('blur', handleBlurOrUnload);
      window.removeEventListener('beforeunload', handleBlurOrUnload);
      window.removeEventListener('pagehide', handleBlurOrUnload);
      document.removeEventListener('visibilitychange', handleBlurOrUnload);
      window.removeEventListener('flint:save-note', handleBlurOrUnload);
    };
  }, [flushPendingSave]);

  useEffect(() => {
    if (isEditingSubheader && subheaderInputRef.current) {
      subheaderInputRef.current.focus();
      subheaderInputRef.current.select();
    }
  }, [isEditingSubheader]);

  const commitTitleRename = useCallback(async (newVal: string) => {
    if (!currentDoc || isLocked) return;
    const trimmed = newVal.trim();
    if (!trimmed || trimmed === currentDoc.title) {
      setTitle(currentDoc.title);
      return;
    }
    const hasCollision = documents.some(
      (d) =>
        d.id !== currentDoc.id &&
        !d.is_folder &&
        (d.parent_id || null) === (currentDoc.parent_id || null) &&
        d.title.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (hasCollision) {
      setTitle(currentDoc.title);
      return;
    }
    await renameDocument(currentDoc.id, trimmed);
    if (isSidebarMode) {
      useSidebarDockStore.setState((s) => ({
        items: s.items.map((it) =>
          it.documentId === currentDoc.id ? { ...it, title: trimmed } : it
        ),
      }));
    }
  }, [currentDoc, isLocked, documents, renameDocument, isSidebarMode]);

  const scheduleDebouncedSave = useCallback((newContent?: string) => {
    if (newContent !== undefined) pendingContentRef.current = newContent;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushPendingSave();
    }, 400);
  }, [flushPendingSave]);

  const handleTitleChange = useCallback((val: string) => {
    if (isLocked) return;
    setTitle(val);
    if (currentDoc) {
      const trimmed = val.trim();
      if (trimmed) {
        updateTabTitle(currentDoc.id, trimmed);
      }
    }
  }, [isLocked, currentDoc, updateTabTitle]);

  const handleContentChange = useCallback((newJson: string) => {
    if (isLocked) return;
    pendingContentRef.current = newJson;
    scheduleDebouncedSave(newJson);
  }, [scheduleDebouncedSave, isLocked]);

  const handleSourceModeChange = useCallback(
    (newContentJson: string, newTitle?: string, newProps?: DocumentProperties) => {
      if (isLocked) return;
      pendingContentRef.current = newContentJson;
      if (newTitle && newTitle !== title && currentDoc) {
        commitTitleRename(newTitle);
      }
      if (newProps && currentDoc) {
        useDocumentStore.setState((s) => ({
          documentProperties: newProps,
          documents: s.documents.map((d) =>
            d.id === currentDoc.id ? { ...d, properties: JSON.stringify(newProps) } : d
          ),
          activeDocument:
            s.activeDocument && s.activeDocument.id === currentDoc.id
              ? { ...s.activeDocument, properties: JSON.stringify(newProps) }
              : s.activeDocument,
        }));
      }
      scheduleDebouncedSave(newContentJson);
    },
    [isLocked, title, currentDoc, commitTitleRename, scheduleDebouncedSave]
  );

  const handleBack = useCallback(async () => {
    await navigateBack();
  }, [navigateBack]);

  const handleForward = useCallback(async () => {
    await navigateForward();
  }, [navigateForward]);

  const handleViewToggle = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (currentDoc) {
        openSplitTab(currentDoc.id, currentDoc.title);
      }
    } else {
      if (isLocked) {
        showToast('Note is locked (Read-only). Unlock it in Properties to edit.', 'warning');
        return;
      }
      setIsReadingMode((prev) => !prev);
    }
  }, [currentDoc, openSplitTab, isLocked, showToast]);

  const isDeadTab = useMemo(() => {
    if (!activeTab) return false;
    const tabDocId = activeTab.document_id;
    if (!tabDocId || tabDocId.startsWith('__')) return false;
    return !documents.some((d) => d.id === tabDocId);
  }, [activeTab, documents]);

  if (isDeadTab && activeTab) {
    return (
      <DeadDocumentView
        paneId={currentPaneId}
        tabId={activeTab.id}
        documentId={activeTab.document_id}
        title={activeTab.title || 'Untitled'}
      />
    );
  }

  return (
    <div
      ref={editorContainerRef}
      onClick={() => {
        if (!isSidebarMode) {
          setFocusedPane(currentPaneId);
        }
      }}
      data-doc-view="true"
      style={{ touchAction: 'pan-x pan-y' }}
      className={`flint-doc-wrapper editor-canvas flex-1 flex flex-col h-full overflow-hidden ${
        isSidebarMode ? 'bg-transparent' : 'bg-[#181818]'
      }`}
    >

      {/* Obsidian Document Sub-Header: Navigation Arrows, Breadcrumbs & Options - Hidden in Sidebar Mode */}
      {!isSidebarMode && (
        <div data-sub-header="true" className="relative h-8 px-4 flex items-center justify-between text-xs text-[#777] shrink-0 select-none">

        {/* Left: Navigation History Arrows */}
        <div className="relative z-10 flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            data-tooltip="Navigate back"
            data-shortcuts={JSON.stringify(['Alt + Left', 'Alt + A'])}
            className="p-1 rounded hover:bg-[#222] disabled:opacity-20 disabled:hover:bg-transparent text-[#777] hover:text-[#dcddde] transition-colors"
          >
            <ArrowLeft01Icon size={14} />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            data-tooltip="Navigate forward"
            data-shortcuts={JSON.stringify(['Alt + Right', 'Alt + D'])}
            className="p-1 rounded hover:bg-[#222] disabled:opacity-20 disabled:hover:bg-transparent text-[#777] hover:text-[#dcddde] transition-colors"
          >
            <ArrowRight01Icon size={14} />
          </button>
        </div>

        {/* Center: Truly Absolute Centered Document Breadcrumb Title (Click to rename live in-place) */}
        <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center pointer-events-none px-20">
          {currentDoc ? (
            <div className="pointer-events-auto text-[12px] max-w-2xl px-1.5 py-0.5 text-center select-none flex items-center justify-center min-w-0 overflow-hidden">
              {(() => {
                const parts = breadcrumbItems;
                const hasFolders = parts.length > 1;
                const folderParts = parts.slice(0, -1);
                const isDeepHierarchy = folderParts.length >= 3;
                const rootFolder = folderParts.length > 0 ? folderParts[0] : null;
                const intermediateFolders = isDeepHierarchy ? folderParts.slice(1, -1) : [];
                const immediateParentFolder = folderParts.length > 1 ? folderParts[folderParts.length - 1] : null;
                const intermediateTooltip = intermediateFolders.map((f: any) => f.title).join(' / ');

                const handleFolderClick = (targetId: string, customOnClick?: (app: any, e: any) => void) => (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (customOnClick) {
                    customOnClick(app, e);
                    return;
                  }
                  const { isLeftSidebarOpen, toggleLeftSidebar, setActiveLeftView } =
                    useWorkspaceStore.getState();
                  if (!isLeftSidebarOpen) {
                    toggleLeftSidebar();
                  }
                  setActiveLeftView('files');
                  window.dispatchEvent(
                    new CustomEvent('flint:reveal-tree-item', {
                      detail: { id: targetId },
                    })
                  );
                };

                const renderBreadcrumbIcon = (item: any, index: number) => {
                  if (item?.icon) {
                    return <span className="shrink-0 inline-flex items-center">{item.icon}</span>;
                  }
                  if (breadcrumbDecorators.length > 0 && currentDoc) {
                    const ctx = {
                      tab: activeTab || undefined,
                      doc: currentDoc,
                      item,
                      index,
                      total: parts.length,
                      app,
                    };
                    for (const d of breadcrumbDecorators) {
                      if (d.matches && !d.matches(item, ctx)) continue;
                      const res = d.renderIcon?.(item, ctx);
                      if (res !== undefined && res !== null) {
                        return <span className="shrink-0 inline-flex items-center">{res}</span>;
                      }
                    }
                  }
                  return null;
                };

                return (
                  <>
                    {/* Root/Topmost Folder */}
                    {rootFolder && (
                      <React.Fragment key={rootFolder.id}>
                        <span
                          onClick={handleFolderClick(rootFolder.id, (rootFolder as any).onClick)}
                          className={`text-[#666] hover:text-[#999] cursor-pointer inline-flex items-center gap-1.5 shrink min-w-0 max-w-[130px] ${
                            (rootFolder as any).className || ''
                          }`}
                        >
                          {renderBreadcrumbIcon(rootFolder, 0)}
                          <span className="truncate">{rootFolder.title}</span>
                        </span>
                        <span className="text-[#444] select-none mx-1.5 shrink-0">/</span>
                      </React.Fragment>
                    )}

                    {/* Intermediate Folders Ellipsis (ONLY when 3 or more parent folders exist: Root / ... / Parent) */}
                    {isDeepHierarchy && intermediateFolders.length > 0 && (
                      <React.Fragment key="breadcrumb-middle-ellipsis">
                        <span
                          onClick={handleFolderClick(intermediateFolders[intermediateFolders.length - 1].id, (intermediateFolders[intermediateFolders.length - 1] as any).onClick)}
                          title={intermediateTooltip || undefined}
                          className="text-[#666] hover:text-[#999] hover:bg-[var(--flint-bg-card-hover)] px-1 py-0.5 rounded cursor-pointer font-medium select-none shrink-0"
                        >
                          ...
                        </span>
                        <span className="text-[#444] select-none mx-1.5 shrink-0">/</span>
                      </React.Fragment>
                    )}

                    {/* Immediate Parent Folder (when 2 or more folders exist) */}
                    {immediateParentFolder && (
                      <React.Fragment key={immediateParentFolder.id}>
                        <span
                          onClick={handleFolderClick(immediateParentFolder.id, (immediateParentFolder as any).onClick)}
                          className={`text-[#666] hover:text-[#999] cursor-pointer inline-flex items-center gap-1.5 shrink min-w-0 max-w-[130px] ${
                            (immediateParentFolder as any).className || ''
                          }`}
                        >
                          {renderBreadcrumbIcon(immediateParentFolder, folderParts.length - 1)}
                          <span className="truncate">{immediateParentFolder.title}</span>
                        </span>
                        <span className="text-[#444] select-none mx-1.5 shrink-0">/</span>
                      </React.Fragment>
                    )}

                    {/* Active File Title with in-place Inline Rename */}
                    {isEditingSubheader ? (
                      <div className="text-[#dcddde] font-normal py-0.5 inline-flex items-center gap-1.5 min-w-0 max-w-[340px] shrink">
                        {renderBreadcrumbIcon(parts[parts.length - 1], parts.length - 1)}
                        <div className="relative inline-flex items-center min-w-[30px] max-w-[300px]">
                          {/* Invisible sizer text with exact matching typography */}
                          <span
                            className="invisible whitespace-pre font-normal text-[12px] font-sans pointer-events-none select-none max-w-[300px] truncate"
                            aria-hidden="true"
                          >
                            {title || 'Untitled'}
                          </span>

                          <input
                            ref={subheaderInputRef}
                            type="text"
                            value={title}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            onBlur={() => {
                              setIsEditingSubheader(false);
                              commitTitleRename(title);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setIsEditingSubheader(false);
                                commitTitleRename(title);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                if (currentDoc) {
                                  setTitle(currentDoc.title);
                                }
                                setIsEditingSubheader(false);
                              }
                            }}
                            className="absolute inset-0 w-full h-full bg-transparent border-none outline-none p-0 m-0 text-left text-[12px] text-[#dcddde] font-normal caret-[#888] selection:bg-[#505560] selection:text-white font-sans truncate"
                          />

                          {/* Duplicate Name Warning Tooltip */}
                          {isDuplicateTitle && (
                            <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center select-none shadow-2xl">
                              <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-[#f85153]" />
                              <div className="bg-[#f85153] text-[#111111] text-[11px] font-medium leading-tight px-3 py-1.5 rounded-[6px] shadow-lg whitespace-nowrap">
                                There's already a file with the same name
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span
                        onClick={() => {
                          if (isLocked) {
                            showToast('Note is locked (Read-only). Unlock it in Properties to rename.', 'info');
                            return;
                          }
                          setIsEditingSubheader(true);
                        }}
                        title={isLocked ? 'Note is locked (Read-only)' : 'Click to rename'}
                        className={`text-[#dcddde] font-normal py-0.5 inline-flex items-center gap-1.5 min-w-0 max-w-full shrink ${
                          isLocked ? 'cursor-default' : 'cursor-text'
                        }`}
                      >
                        {renderBreadcrumbIcon(parts[parts.length - 1], parts.length - 1)}
                        <span className="truncate">{breadcrumbTitleOverride || title || (hasFolders ? parts[parts.length - 1].title : 'Untitled')}</span>
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>

        {/* Right: Reading View, Bookmark, Search & More Options */}
        <div className="relative z-10 flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleViewToggle}
            disabled={!currentDoc}
            title={
              !currentDoc
                ? 'Reading view'
                : isLocked
                ? 'Note is locked (Read-only)\nUnlock in Properties to enable Editing view\n(Ctrl+Click to split)'
                : effectiveReadingMode
                ? 'Reading view\n(Ctrl+Click to split)'
                : 'Editing view\n(Ctrl+Click to split)'
            }
            className={`p-1 rounded transition-colors ${
              !currentDoc
                ? 'opacity-20 cursor-default hover:bg-transparent text-[#777]'
                : isLocked
                ? 'text-[#666] opacity-40 hover:bg-transparent cursor-not-allowed'
                : 'hover:bg-[#222] text-[#777] hover:text-[#dcddde] cursor-pointer'
            }`}
          >
            {effectiveReadingMode ? <BookOpen01Icon size={14} /> : <Edit02Icon size={14} />}
          </button>

          <button
            onClick={async () => {
              if (!currentDoc) return;
              await toggleBookmark(currentDoc.id);
              showToast(
                currentDoc.is_bookmarked
                  ? `Removed bookmark: "${currentDoc.title || 'Untitled'}"`
                  : `Bookmarked: "${currentDoc.title || 'Untitled'}"`,
                'info'
              );
            }}
            disabled={!currentDoc}
            title={currentDoc?.is_bookmarked ? 'Remove bookmark' : 'Bookmark note'}
            className={`p-1 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer ${
              currentDoc?.is_bookmarked
                ? 'text-[#f59e0b] hover:text-[#fbbf24] hover:bg-[#282828]'
                : 'text-[#777] hover:text-[#dcddde] hover:bg-[#222]'
            }`}
          >
            <Bookmark01Icon size={14} className={currentDoc?.is_bookmarked ? 'fill-current' : ''} />
          </button>

          <button
            onClick={() => {
              setIsFindOpen((prevFind) => {
                if (prevFind) {
                  setIsReplaceOpen(false);
                  return false;
                }
                setIsReplaceOpen(false);
                return true;
              });
            }}
            disabled={!currentDoc}
            title={isFindOpen ? 'Close find (Ctrl+F)' : 'Find in document (Ctrl+F)'}
            className={`p-1 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer ${
              isFindOpen
                ? 'text-white bg-[#282828]'
                : 'text-[#777] hover:text-[#dcddde] hover:bg-[#222]'
            }`}
          >
            <Search01Icon size={14} />
          </button>

          <DocOptionsMenu document={currentDoc} />
        </div>
      </div>
      )}

      {/* Main Body: Minimal Obsidian Empty State or Document Prose Editor */}
      {!currentDoc ? (
        <div className={`flex-1 flex flex-col items-center justify-center select-none p-6 gap-3 ${isSidebarMode ? 'bg-transparent' : 'bg-[#181818]'}`}>
          <button
            onClick={async () => {
              const newDoc = await createNewNote('Untitled', null, 'base', false);
              if (newDoc) {
                openTabInPane(currentPaneId, newDoc.id, newDoc.title);
              }
            }}
            className="text-[13px] text-[#888888] hover:text-[#dcddde] transition-colors cursor-pointer"
          >
            Create new note <span className="text-[#555] ml-1">Ctrl + N</span>
          </button>

          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="text-[13px] text-[#888888] hover:text-[#dcddde] transition-colors cursor-pointer"
          >
            Go to file <span className="text-[#555] ml-1">Ctrl + O</span>
          </button>

          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="text-[13px] text-[#888888] hover:text-[#dcddde] transition-colors cursor-pointer"
          >
            Syntax & Help Guide <span className="text-[#555] ml-1">F1</span>
          </button>

          <button
            onClick={() => {
              if (activeTab) {
                closeTabInPane(currentPaneId, activeTab.id);
              } else if (pane === 'split' && splitActiveTabId) {
                closeSplitTab(splitActiveTabId);
              } else if (activeTabId) {
                closeTab(activeTabId);
              }
            }}
            className="text-[13px] text-[#888888] hover:text-[#dcddde] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative flex flex-col min-w-0">
          {/* Obsidian In-Note Find & Replace Top Floating Overlay Bar */}
          <FindReplaceBar
            editor={editorInstance}
            isOpen={isFindOpen}
            isReplaceOpen={isReplaceOpen}
            onClose={() => setIsFindOpen(false)}
            onToggleReplace={() => setIsReplaceOpen((prev) => !prev)}
          />

          <div
            ref={scrollViewportRef}
            style={{ touchAction: 'pan-x pan-y' }}
            className={`flex-1 overflow-y-auto custom-scrollbar ${isReadingMode ? 'cursor-default' : ''}`}
          >
            <div
              className={`mx-auto pt-3 pb-8 flex flex-col min-h-full ${
                isSidebarMode ? 'w-full pl-7 pr-3 max-w-none' : readableLineLength ? 'max-w-3xl px-10' : 'w-full px-12 max-w-none'
              }`}
            >
              {isImageDoc ? (
                <div className="flex-1 flex flex-col items-center justify-center py-4 select-none my-auto">
                  <div className="max-w-full flex items-center justify-center rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#141414] shadow-md p-2">
                    <img
                      src={mediaSrc}
                      alt={currentDoc.title}
                      onClick={() => useWorkspaceStore.getState().openImageLightbox(mediaSrc, currentDoc.title)}
                      className="max-w-full max-h-[calc(100vh-140px)] object-contain rounded cursor-zoom-in"
                    />
                  </div>
                </div>
              ) : isAudioDoc ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 my-auto">
                  <div className="w-full max-w-lg p-5 rounded-lg border border-[#2a2a2a] bg-[#161616]">
                    <audio controls src={mediaSrc} className="w-full" />
                  </div>
                </div>
              ) : isVideoDoc ? (
                <div className="flex-1 flex flex-col items-center justify-center py-4 my-auto">
                  <div className="max-w-3xl w-full rounded-lg overflow-hidden border border-[#2a2a2a] bg-black">
                    <video controls src={mediaSrc} className="w-full max-h-[calc(100vh-140px)]" />
                  </div>
                </div>
              ) : isPdfDoc ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 my-auto">
                  <div className="p-8 rounded-lg border border-[#2a2a2a] bg-[#161616] flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={() => window.open(mediaSrc, '_blank')}
                      className="px-3.5 py-1.5 bg-[#252525] hover:bg-[#303030] text-xs text-white rounded cursor-pointer transition-none"
                    >
                      Open PDF
                    </button>
                  </div>
                </div>
              ) : isSourceMode ? (
                <SourceModeEditor
                  key={`source-${currentDoc.id}`}
                  documentId={currentDoc.id}
                  contentJson={content}
                  title={title || currentDoc.title}
                  properties={currentDoc.properties}
                  editable={isEditable}
                  onChange={handleSourceModeChange}
                  onSave={flushPendingSave}
                />
              ) : (
                <>
                  {/* Document Header (Title + In-Document Properties & Tags) */}
                  <div className="relative group/title">
                    {/* Document Title Header */}
                    {inlineTitle && (
                      <div className={`${hasActiveHeaders ? 'mb-3' : 'mb-4'} relative`}>
                        {/* Fold button on Document Title Header */}
                        {foldHeading && hasActiveHeaders && currentDoc && (
                          <button
                            type="button"
                            onClick={toggleHeaderFold}
                            title={isHeaderFolded ? 'Unfold document header' : 'Fold document header'}
                            className={`absolute ${
                              isSidebarMode ? '-left-[22px] w-[22px]' : '-left-[36px] w-[36px]'
                            } top-[calc(50%-4px)] -translate-y-1/2 h-[32px] flex items-center justify-start pl-[2px] text-[#777] hover:text-[#dcddde] transition-opacity cursor-pointer z-10 ${
                              isHeaderFolded ? 'opacity-100 text-[#aaa]' : 'opacity-0 group-hover/title:opacity-100'
                            }`}
                          >
                            {isHeaderFolded ? <ChevronRightIcon size={18} /> : <ChevronDownIcon size={18} />}
                          </button>
                        )}


                        {titlePrefixNodes.length > 0 ? (
                          <div className="flex items-center gap-1.5 w-full pb-2">
                            <div className="shrink-0 flex items-center">{titlePrefixNodes}</div>
                            {effectiveReadingMode ? (
                              <h1
                                style={{ fontSize: 'calc(var(--editor-font-size, 12px) * 2.3)' }}
                                className="w-full font-bold text-[var(--flint-text-primary)] font-text tracking-tight leading-tight cursor-default select-text"
                              >
                                {breadcrumbTitleOverride || title || 'Untitled'}
                              </h1>
                            ) : (
                              <div className="relative w-full">
                                <input
                                  type="text"
                                  value={isMainTitleFocused ? title : (breadcrumbTitleOverride || title)}
                                  style={{ fontSize: 'calc(var(--editor-font-size, 12px) * 2.3)' }}
                                  onFocus={() => setIsMainTitleFocused(true)}
                                  onChange={(e) => handleTitleChange(e.target.value)}
                                  onBlur={() => {
                                    setIsMainTitleFocused(false);
                                    commitTitleRename(title);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      setIsMainTitleFocused(false);
                                      commitTitleRename(title);
                                      (e.target as HTMLInputElement).blur();
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      if (currentDoc) setTitle(currentDoc.title);
                                      setIsMainTitleFocused(false);
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  placeholder="Untitled"
                                  className="w-full font-bold bg-transparent text-[var(--flint-text-primary)] placeholder:text-[var(--flint-text-muted)] placeholder:opacity-40 outline-none font-text tracking-tight leading-tight"
                                />

                                {/* Duplicate Name Warning Tooltip */}
                                {isDuplicateTitle && (
                                  <div className="absolute top-[calc(100%+4px)] left-0 z-50 pointer-events-none flex flex-col items-start select-none shadow-2xl">
                                    <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-[#f85153] ml-4" />
                                    <div className="bg-[#f85153] text-[#111111] text-[11px] font-medium leading-tight px-3 py-1.5 rounded-[6px] shadow-lg whitespace-nowrap">
                                      There's already a file with the same name
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : effectiveReadingMode ? (
                          <h1
                            style={{ fontSize: 'calc(var(--editor-font-size, 12px) * 2.3)' }}
                            className="w-full font-bold text-[var(--flint-text-primary)] pb-2 font-text tracking-tight leading-tight cursor-default select-text"
                          >
                            {breadcrumbTitleOverride || title || 'Untitled'}
                          </h1>
                        ) : (
                          <div className="relative w-full">
                            <input
                              type="text"
                              value={isMainTitleFocused ? title : (breadcrumbTitleOverride || title)}
                              style={{ fontSize: 'calc(var(--editor-font-size, 12px) * 2.3)' }}
                              onFocus={() => setIsMainTitleFocused(true)}
                              onChange={(e) => handleTitleChange(e.target.value)}
                              onBlur={() => {
                                setIsMainTitleFocused(false);
                                commitTitleRename(title);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setIsMainTitleFocused(false);
                                  commitTitleRename(title);
                                  (e.target as HTMLInputElement).blur();
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  if (currentDoc) setTitle(currentDoc.title);
                                  setIsMainTitleFocused(false);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder="Untitled"
                              className="w-full font-bold bg-transparent text-[var(--flint-text-primary)] placeholder:text-[var(--flint-text-muted)] placeholder:opacity-40 outline-none pb-2 font-text tracking-tight leading-tight"
                            />

                            {/* Duplicate Name Warning Tooltip */}
                            {isDuplicateTitle && (
                              <div className="absolute top-[calc(100%+4px)] left-0 z-50 pointer-events-none flex flex-col items-start select-none shadow-2xl">
                                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-[#f85153] ml-4" />
                                <div className="bg-[#f85153] text-[#111111] text-[11px] font-medium leading-tight px-3 py-1.5 rounded-[6px] shadow-lg whitespace-nowrap">
                                  There's already a file with the same name
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dynamic In-Document Headers */}
                    {hasActiveHeaders && currentDoc && (
                      <div className="mb-3">
                        {documentHeaders.map((header) => (
                          <DocumentHeaderItem
                            key={header.id}
                            header={header}
                            documentId={currentDoc.id}
                            document={currentDoc}
                            mode={propertiesInDoc as 'Visible' | 'Source'}
                            isFolded={isHeaderFolded}
                            app={app}
                          />
                        ))}
                      </div>
                    )}
                  </div>


                  {/* TipTap Editor Prose Canvas */}
                  <div
                    ref={editorWrapperRef}
                    style={editorMinHeight ? { minHeight: `${editorMinHeight}px` } : undefined}
                    className={`flex-1 flex flex-col ${
                      lineNumbers ? 'flint-line-numbers' : ''
                    } ${indentationGuides ? 'flint-indent-guides' : ''} ${
                      accentListPrefixes ? 'flint-accent-lists' : ''
                    } ${strictLineBreaks ? 'flint-strict-line-breaks' : ''} ${
                      !isEditable ? 'tiptap-reading-view cursor-default' : ''
                    }`}
                  >
                    <TipTapEditor
                      key={currentDoc.id}
                      documentId={currentDoc.id}
                      content={content}
                      editable={isEditable}
                      onChange={handleContentChange}
                      onEditorReady={setEditorInstance}
                    />
                  </div>

                  {/* Dynamic In-Document Footers (Backlinks, Mentions, etc.) */}
                  {documentFooters.map((footer) => (
                    <DocumentFooterItem
                      key={footer.id}
                      footer={footer}
                      documentId={currentDoc.id}
                      documentTitle={currentDoc.title}
                      document={currentDoc}
                      app={app}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
      </div>
      )}
    </div>
  );
});

