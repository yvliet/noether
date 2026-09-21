import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { TextSelection } from '@tiptap/pm/state';
import { getLineEdgePos, isInteractiveEditorTarget } from './editorCoords';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSidebarDockStore } from '@/store/sidebarDockStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDragDropStore } from '@/store/dragDropStore';
import { platform } from '@/lib/platform/platformAdapter';
import { TipTapEditor } from './TipTapEditor';
import { SourceModeEditor } from './SourceModeEditor';
import { DocOptionsMenu } from './DocOptionsMenu';
import { FindReplaceBar } from './FindReplaceBar';
import { DeadDocumentView } from './DeadDocumentView';
const LazyPdfViewer = React.lazy(() =>
  import('@/components/pdf/PdfViewer').then((m) => ({ default: m.PdfViewer }))
);
import { WikilinkHoverPreview, resolveTargetDocument, isDocumentContentEmpty } from './WikilinkHoverPreview';
import { useNoetherApp, useExtensionList, useDocumentHeaders, useDocumentFooters, useBreadcrumbProviders, useBreadcrumbDecorators, useDocumentTitleDecorators } from '@/core/app/AppContext';
import { ExtensionPortalSlotHost } from '@/components/common/ExtensionPortalSlotHost';
import { ViewportActionSlotHost } from '@/components/layout/ViewportActionSlotHost';
import type { PortalSlotContext } from '@/core/extensions/types';
import type { ViewportActionContext } from '@/core/registries/ViewportActionRegistry';
import { getDocumentPath, getDocumentPathParts, getDocumentBreadcrumbParts, isDocumentLocked, getDocumentById } from '@/lib/db/documents';
import { DocumentProperties } from '@/types';
import { useAppContextMenu } from '@/components/common/ContextMenu';
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
  RulerIcon,
  LeftToRightListNumberIcon,
  TextUnderlineIcon,
} from '@/components/common/Icons';

function isExternalUrlTarget(target?: string | null): boolean {
  if (!target) return false;
  const trimmed = target.trim();
  return (
    /^(https?|mailto|ftp|file|data|blob):/i.test(trimmed) ||
    trimmed.startsWith('www.') ||
    trimmed.includes('://')
  );
}

/**
 * Extracts a valid internal wikilink target from a mouse event target.
 * Explicitly ignores external URLs, media embeds, hover popovers, and temporary drop ghost previews.
 */
function extractWikilinkFromTarget(rawTarget: EventTarget | null): { element: HTMLElement; target: string } | null {
  const targetElem = (
    rawTarget && (rawTarget as Node).nodeType === Node.ELEMENT_NODE
      ? (rawTarget as HTMLElement)
      : ((rawTarget as Node)?.parentElement as HTMLElement | null)
  );
  if (!targetElem) return null;

  // Ignore embeds, media, hover preview itself, drop ghosts, or explicit external links
  if (
    targetElem.closest(
      '.noether-embed-wrapper, .noether-embed-media, [data-wikilink-hover-preview="true"], .noether-drop-ghost-wrapper, [data-drop-ghost], a[target="_blank"], a[href^="http://"], a[href^="https://"], a[href^="mailto:"], a[href^="ftp:"], [data-link-url^="http://"], [data-link-url^="https://"], [data-link-url^="mailto:"], [data-link-url^="ftp:"]'
    )
  ) {
    return null;
  }

  // 1. Direct check for .md-wikilink
  const wikiElem = targetElem.closest('.md-wikilink') as HTMLElement | null;
  if (wikiElem) {
    const rawUrl = wikiElem.getAttribute('data-link-url') || wikiElem.getAttribute('href');
    if (rawUrl && isExternalUrlTarget(rawUrl)) {
      return null;
    }
    const target = wikiElem.getAttribute('data-wikilink-target') || wikiElem.textContent?.trim() || '';
    if (target && !isExternalUrlTarget(target)) {
      return { element: wikiElem, target };
    }
    return null;
  }

  // 2. Direct check for [data-wikilink-target]
  const dataWikiElem = targetElem.closest('[data-wikilink-target]') as HTMLElement | null;
  if (dataWikiElem) {
    const target = dataWikiElem.getAttribute('data-wikilink-target');
    if (target && !isExternalUrlTarget(target)) {
      return { element: dataWikiElem, target };
    }
    return null;
  }

  // 3. Check for .md-link pointing to internal wikilink
  const mdLinkElem = targetElem.closest('.md-link') as HTMLElement | null;
  if (mdLinkElem) {
    const explicitWikiTarget = mdLinkElem.getAttribute('data-wikilink-target');
    if (explicitWikiTarget && !isExternalUrlTarget(explicitWikiTarget)) {
      return { element: mdLinkElem, target: explicitWikiTarget };
    }
    const rawUrl = mdLinkElem.getAttribute('data-link-url') || mdLinkElem.getAttribute('href') || null;
    if (rawUrl) {
      const trimmed = rawUrl.trim();
      if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
        let inner = trimmed.slice(2, -2).trim();
        if (inner.includes('|')) inner = inner.split('|')[0].trim();
        if (inner && !isExternalUrlTarget(inner)) return { element: mdLinkElem, target: inner };
      } else if (!isExternalUrlTarget(trimmed) && !trimmed.startsWith('#')) {
        const decoded = decodeURIComponent(trimmed).trim();
        if (decoded && !isExternalUrlTarget(decoded)) return { element: mdLinkElem, target: decoded };
      }
    }
  }

  return null;
}

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
  const updateProperties = useDocumentStore((s) => s.updateProperties);

  const app = useNoetherApp();
  useExtensionList(); // Subscribe to reactive extension state changes
  const documentHeaders = useDocumentHeaders();
  const documentFooters = useDocumentFooters();
  const hasActiveHeaders = documentHeaders.length > 0;

  const inlineTitle = useSettingsStore((s) => s.inlineTitle);
  const setInlineTitle = useSettingsStore((s) => s.setInlineTitle);
  const readableLineLength = useSettingsStore((s) => s.readableLineLength);
  const setReadableLineLength = useSettingsStore((s) => s.setReadableLineLength);
  const defaultTabMode = useSettingsStore((s) => s.defaultTabMode);
  const defaultEditingMode = useSettingsStore((s) => s.defaultEditingMode);
  const propertiesInDoc = useSettingsStore((s) => s.propertiesInDoc);
  const foldHeading = useSettingsStore((s) => s.foldHeading);
  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const setLineNumbers = useSettingsStore((s) => s.setLineNumbers);
  const indentationGuides = useSettingsStore((s) => s.indentationGuides);
  const accentListPrefixes = useSettingsStore((s) => s.accentListPrefixes);
  const strictLineBreaks = useSettingsStore((s) => s.strictLineBreaks);
  const showExternalLinkIcon = useSettingsStore((s) => s.showExternalLinkIcon);

  const { showContextMenu } = useAppContextMenu();

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

  const [prevDocId, setPrevDocId] = useState(() => currentDoc?.id || null);
  const [title, setTitle] = useState(() => currentDoc?.title || '');
  const [content, setContent] = useState(() => currentDoc?.content_json || '');
  const [isReadingMode, setIsReadingMode] = useState(defaultTabMode === 'Reading view');

  // Adjust title and content immediately during render when currentDoc changes
  // to guarantee children components (TipTapEditor, header inputs) never receive stale values.
  if (currentDoc && currentDoc.id !== prevDocId) {
    setPrevDocId(currentDoc.id);
    setTitle(currentDoc.title);
    setContent(currentDoc.content_json || '');
  } else if (!currentDoc && prevDocId !== null) {
    setPrevDocId(null);
    setTitle('');
    setContent('');
  }

  const titleRef = useRef<string>(title);
  titleRef.current = title;
  const isDraggingDeadSpaceRef = useRef(false);

  const activeDocIdRef = useRef<string | null>(currentDoc?.id || null);
  const saveTimerRef = useRef<any>(null);
  const pendingContentRef = useRef<string | null>(null);
  const pendingRawMarkdownRef = useRef<string | null>(null);
  const isEditingTitleRef = useRef(false);
  const pendingTitleEditRef = useRef<{ docId: string; title: string } | null>(null);

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

  const isContentReady = useMemo(() => {
    return Boolean(currentDoc);
  }, [currentDoc]);

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
  }, [documentFooters.length, editorMinHeight]);

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
    window.addEventListener('noether:backlinks-toggled', handleBacklinksToggle);
    return () => window.removeEventListener('noether:backlinks-toggled', handleBacklinksToggle);
  }, []);

  useEffect(() => {
    setEditorMinHeight(undefined);
  }, [currentDoc?.id, content, documentFooters.length]);

  // Scoped Document Selection Engine (Ctrl+A / Cmd+A):
  // Confines selection strictly to document content, completely eliminating leakage
  // into the note title, YAML frontmatter properties, sidebar, or window controls.
  useEffect(() => {
    const handleDocumentSelectAll = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A') && !e.shiftKey && !e.altKey)) {
        return;
      }

      // Check if this EditorCanvas is within the currently focused pane
      const focusedPaneId = useWorkspaceStore.getState().focusedPaneId;
      if (!isSidebarMode && currentPaneId !== focusedPaneId) {
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const target = e.target as HTMLElement | null;

      // 1. If currently inside an interactive text input/textarea (like note title or property input),
      // let the input's native selection handle it and prevent it from bubbling out.
      const isInputOrTextarea =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA';

      if (isInputOrTextarea) {
        e.stopPropagation();
        return;
      }

      // 2. Check if the event or active focus is associated with this document canvas
      const container = editorContainerRef.current;
      if (!container) return;

      const isInsideEditor =
        container.contains(target) ||
        container.contains(activeEl);

      if (!isInsideEditor) return;

      e.preventDefault();
      e.stopPropagation();

      // 3. Document Content Selection:
      if (isSourceMode) {
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement | null;
        if (textarea) {
          textarea.focus();
          textarea.select();
        }
      } else if (isEditable && editorInstance && !editorInstance.isDestroyed) {
        editorInstance.chain().focus().selectAll().run();
      } else {
        // Reading view or locked document: scope selection strictly to the rendered content
        const proseEl = editorWrapperRef.current?.querySelector('.ProseMirror') ||
                        editorWrapperRef.current?.querySelector('.markdown-prose');
        if (proseEl) {
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            const range = document.createRange();
            range.selectNodeContents(proseEl);
            selection.addRange(range);
          }
        }
      }
    };

    window.addEventListener('keydown', handleDocumentSelectAll, true);
    return () => {
      window.removeEventListener('keydown', handleDocumentSelectAll, true);
    };
  }, [currentPaneId, isSidebarMode, isSourceMode, isEditable, editorInstance]);

  const handleDeadSpaceMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || !isEditable) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (isInteractiveEditorTarget(target)) {
        return;
      }

      if (isSourceMode) {
        const textarea = scrollViewportRef.current?.querySelector('textarea');
        if (textarea && target !== textarea) {
          textarea.focus();
        }
        return;
      }

      if (editorInstance && !editorInstance.isDestroyed) {
        const pm = scrollViewportRef.current?.querySelector('.ProseMirror') as HTMLElement | null;
        if (!pm || pm.contains(target)) return;

        const pmRect = pm.getBoundingClientRect();
        const { state, view } = editorInstance;

        // If doc ends with a table and clicked below it, insert trailing paragraph
        if (state.doc.lastChild && state.doc.lastChild.type.name === 'table' && e.clientY > pmRect.bottom - 20) {
          e.preventDefault();
          const insertPos = state.doc.content.size;
          const tr = state.tr.insert(insertPos, state.schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
          view.dispatch(tr);
          view.focus();
          return;
        }

        const anchorPos = getLineEdgePos(view, e.clientX, e.clientY);
        if (anchorPos === null) return;

        e.preventDefault();

        // Immediately set caret at line edge / position (which clears any existing selection!)
        try {
          const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, anchorPos));
          view.dispatch(tr);
          view.focus();
        } catch {}

        const startX = e.clientX;
        const startY = e.clientY;
        let hasMoved = false;

        // Track drag selection from dead space into content
        const onMouseMove = (moveEv: MouseEvent) => {
          if ((moveEv.buttons & 1) !== 1) {
            cleanup();
            return;
          }
          if (!hasMoved && Math.hypot(moveEv.clientX - startX, moveEv.clientY - startY) > 3) {
            hasMoved = true;
            isDraggingDeadSpaceRef.current = true;
          }
          if (!hasMoved) return;

          const headPos = getLineEdgePos(view, moveEv.clientX, moveEv.clientY);
          if (headPos === null) return;

          try {
            const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, anchorPos, headPos));
            view.dispatch(tr);
          } catch {}
        };

        const onMouseUp = () => {
          cleanup();
          if (hasMoved) {
            // Suppress the trailing synthetic click event so it doesn't collapse the selection
            const suppressClick = (clickEv: MouseEvent) => {
              clickEv.preventDefault();
              clickEv.stopPropagation();
              clickEv.stopImmediatePropagation();
            };
            window.addEventListener('click', suppressClick, { capture: true, once: true });
            setTimeout(() => {
              window.removeEventListener('click', suppressClick, { capture: true });
              isDraggingDeadSpaceRef.current = false;
            }, 100);
          }
        };

        const cleanup = () => {
          window.removeEventListener('mousemove', onMouseMove, true);
          window.removeEventListener('mouseup', onMouseUp, true);
        };

        window.addEventListener('mousemove', onMouseMove, true);
        window.addEventListener('mouseup', onMouseUp, true);
      }
    },
    [isEditable, isSourceMode, editorInstance]
  );

  const handleDeadSpaceClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || isDraggingDeadSpaceRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (isInteractiveEditorTarget(target)) {
        return;
      }

      if (!isEditable) return;

      if (isSourceMode) {
        const textarea = scrollViewportRef.current?.querySelector('textarea');
        if (textarea && target !== textarea) {
          textarea.focus();
        }
        return;
      }

      if (editorInstance && !editorInstance.isDestroyed) {
        const pm = scrollViewportRef.current?.querySelector('.ProseMirror') as HTMLElement | null;
        if (!pm || !pm.contains(target)) {
          const { state, schema, view } = editorInstance;
          // If a drag just occurred or non-empty selection is present, do not collapse the selection
          if (isDraggingDeadSpaceRef.current || !state.selection.empty) {
            return;
          }

          if (state.doc.lastChild && state.doc.lastChild.type.name === 'table') {
            const insertPos = state.doc.content.size;
            const tr = state.tr.insert(insertPos, schema.nodes.paragraph.create());
            tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
            editorInstance.view.dispatch(tr);
            editorInstance.view.focus();
          } else {
            const pos = getLineEdgePos(view, e.clientX, e.clientY);
            if (pos !== null) {
              const tr = state.tr.setSelection(TextSelection.create(state.doc, pos));
              view.dispatch(tr);
              view.focus();
              return;
            }
            editorInstance.commands.focus();
          }
        }
      }
    },
    [isEditable, isSourceMode, editorInstance]
  );

  const portalSlotContext: PortalSlotContext = useMemo(
    () => ({
      app,
      documentId: currentDoc?.id,
      document: currentDoc,
      editor: editorInstance,
      viewMode: isSourceMode ? 'Source' : 'Visible',
      scrollContainer: scrollViewportRef.current,
    }),
    [app, currentDoc, editorInstance, isSourceMode]
  );

  const viewportActionContext: ViewportActionContext = useMemo(
    () => ({
      document: currentDoc,
      activeTab: activeTab || null,
      app,
      viewType: 'document',
      isSidebar: isSidebarMode,
    }),
    [currentDoc, activeTab, app, isSidebarMode]
  );

  const defaultHeaderFolded = useMemo(() => {
    return documentHeaders.some((h) =>
      typeof h.defaultFolded === 'function' ? h.defaultFolded(app, currentDoc?.id) : !!h.defaultFolded
    );
  }, [documentHeaders, app, currentDoc?.id]);

  const [isHeaderFolded, setIsHeaderFolded] = useState<boolean>(() => {
    if (!currentDoc) return defaultHeaderFolded;
    try {
      const stored = localStorage.getItem(`noether_props_folded_${currentDoc.id}`);
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

    window.addEventListener('noether:find-in-note', handleFindEvent);
    window.addEventListener('noether:replace-in-note', handleReplaceEvent);

    return () => {
      window.removeEventListener('noether:find-in-note', handleFindEvent);
      window.removeEventListener('noether:replace-in-note', handleReplaceEvent);
    };
  }, [currentPaneId]);


  useEffect(() => {
    setIsReadingMode(defaultTabMode === 'Reading view');
  }, [defaultTabMode]);

  useEffect(() => {
    if (currentDoc) {
      try {
        const stored = localStorage.getItem(`noether_props_folded_${currentDoc.id}`);
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
        const stored = localStorage.getItem(`noether_props_folded_${currentDoc.id}`);
        if (stored === null) {
          setIsHeaderFolded(nextStartFolded);
        }
      } else {
        setIsHeaderFolded(nextStartFolded);
      }
    };
    window.addEventListener('noether:header-fold-default-changed', handleDefaultFoldChanged);
    return () => {
      window.removeEventListener('noether:header-fold-default-changed', handleDefaultFoldChanged);
    };
  }, [currentDoc?.id, defaultHeaderFolded]);

  const toggleHeaderFold = useCallback(() => {
    if (!currentDoc) return;
    setIsHeaderFolded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`noether_props_folded_${currentDoc.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [currentDoc]);

  const hasCover = useMemo(() => {
    if (!currentDoc?.properties) return false;
    try {
      const props = typeof currentDoc.properties === 'string'
        ? JSON.parse(currentDoc.properties)
        : currentDoc.properties;
      return Boolean(props?.Cover || props?.cover || props?.banner);
    } catch {
      return false;
    }
  }, [currentDoc?.properties]);

  const [isScrolled, setIsScrolled] = useState(false);

  // Wikilink hover preview state & timers
  const [wikilinkHoverPreview, setWikilinkHoverPreview] = useState<{
    target: string;
    anchorRect: DOMRect;
  } | null>(null);

  const hoverOpenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoveredLinkRef = useRef<HTMLElement | null>(null);
  const isMouseOverPreviewRef = useRef<boolean>(false);

  const clearHoverTimers = useCallback(() => {
    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const handleCloseHoverPreview = useCallback(() => {
    clearHoverTimers();
    isMouseOverPreviewRef.current = false;
    hoveredLinkRef.current = null;
    setWikilinkHoverPreview(null);
  }, [clearHoverTimers]);

  const handleViewportMouseOver = useCallback((e: React.MouseEvent) => {
    // Suppress hover preview if a drag operation is active or mouse button is held
    if (useDragDropStore.getState().activeDrag?.isDragging || e.buttons > 0) {
      return;
    }

    const result = extractWikilinkFromTarget(e.target);
    if (!result) return;

    const { element, target } = result;

    if (hoveredLinkRef.current === element) {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      return;
    }

    clearHoverTimers();
    hoveredLinkRef.current = element;

    hoverOpenTimerRef.current = setTimeout(async () => {
      if (useDragDropStore.getState().activeDrag?.isDragging) return;
      if (!element.isConnected) return;
      if (hoveredLinkRef.current !== element) return;

      // Suppress hover preview if the target note exists but has no content
      const documents = useDocumentStore.getState().documents;
      const { doc } = resolveTargetDocument(target, documents);
      if (doc) {
        let contentJson = doc.content_json;
        if (!contentJson) {
          const fullDoc = await getDocumentById(doc.id);
          contentJson = fullDoc?.content_json || '';
        }

        // Verify element is still hovered and mounted after async fetch
        if (hoveredLinkRef.current !== element || !element.isConnected) return;

        if (isDocumentContentEmpty(contentJson, doc.doc_type)) {
          return;
        }
      }

      const rect = element.getBoundingClientRect();
      setWikilinkHoverPreview({ target, anchorRect: rect });
    }, 250);
  }, [clearHoverTimers]);

  const handleViewportMouseOut = useCallback((e: React.MouseEvent) => {
    if (!hoveredLinkRef.current) return;

    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && hoveredLinkRef.current.contains(relatedTarget)) {
      return;
    }

    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }

    // Moving into the hover preview popover or its gap bridge: retain preview
    if (relatedTarget && (relatedTarget as HTMLElement).closest?.('[data-wikilink-hover-preview="true"]')) {
      return;
    }

    // Instant dismissal once cursor leaves the link boundary to an external element
    if (!isMouseOverPreviewRef.current) {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      setWikilinkHoverPreview(null);
      hoveredLinkRef.current = null;
    }
  }, []);

  const handleMouseEnterPreview = useCallback(() => {
    isMouseOverPreviewRef.current = true;
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  const handleMouseLeavePreview = useCallback((e?: React.MouseEvent) => {
    isMouseOverPreviewRef.current = false;
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }

    // Moving back to the active wikilink: retain preview
    const relatedTarget = e?.relatedTarget as Node | null;
    if (relatedTarget && hoveredLinkRef.current && hoveredLinkRef.current.contains(relatedTarget)) {
      return;
    }

    // Instant dismissal once leaving the preview card
    setWikilinkHoverPreview(null);
    hoveredLinkRef.current = null;
  }, []);

  // Dismiss hover preview on active doc change or tab switch
  useEffect(() => {
    handleCloseHoverPreview();
  }, [currentDoc?.id, handleCloseHoverPreview]);

  // Immediately dismiss hover preview when dragging starts or drop ghost appears
  useEffect(() => {
    if (!app) return;
    const unsubDragStart = app.events.on('drag:start', () => {
      handleCloseHoverPreview();
    });
    const unsubDropGhost = app.events.on('editor:drop-ghost', (data) => {
      if (data.ghost) {
        handleCloseHoverPreview();
      }
    });
    return () => {
      unsubDragStart.dispose();
      unsubDropGhost.dispose();
    };
  }, [app, handleCloseHoverPreview]);

  // Global escape key listener to dismiss hover preview
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseHoverPreview();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearHoverTimers();
    };
  }, [handleCloseHoverPreview, clearHoverTimers]);

  useEffect(() => {
    const top = scrollViewportRef.current?.scrollTop || 0;
    setIsScrolled(top > 0);
  }, [currentDoc?.id]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isMouseOverPreviewRef.current) return;
    handleCloseHoverPreview();
    const top = e.currentTarget.scrollTop;
    setIsScrolled(top > 0);
  }, [handleCloseHoverPreview]);

  const isDuplicateTitle = useMemo(() => {
    if (!currentDoc) return false;
    if (!isMainTitleFocused && !isEditingSubheader) return false;
    const trimmed = title.trim().toLowerCase();
    if (!trimmed) return false;
    if (trimmed === currentDoc.title.trim().toLowerCase()) return false;
    const allDocs = useDocumentStore.getState().documents;
    return allDocs.some(
      (d) =>
        d.id !== currentDoc.id &&
        !d.is_folder &&
        d.title.trim().toLowerCase() === trimmed
    );
  }, [title, currentDoc, isMainTitleFocused, isEditingSubheader]);

  const commitTitleRename = useCallback(async (newVal: string, targetDocId?: string) => {
    isEditingTitleRef.current = false;
    pendingTitleEditRef.current = null;
    const docId = targetDocId || currentDoc?.id;
    if (!docId || isLocked) return;
    const allDocs = useDocumentStore.getState().documents;
    const targetDoc = allDocs.find((d) => d.id === docId);
    if (!targetDoc) return;
    const trimmed = newVal.trim();
    if (!trimmed || trimmed === targetDoc.title) {
      if (currentDoc && currentDoc.id === docId) {
        setTitle(targetDoc.title);
        titleRef.current = targetDoc.title;
      }
      return;
    }
    const hasCollision = allDocs.some(
      (d) =>
        d.id !== docId &&
        !d.is_folder &&
        (d.parent_id || null) === (targetDoc.parent_id || null) &&
        d.title.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (hasCollision) {
      if (currentDoc && currentDoc.id === docId) {
        setTitle(targetDoc.title);
        titleRef.current = targetDoc.title;
      }
      return;
    }
    if (currentDoc && currentDoc.id === docId) {
      setTitle(trimmed);
      titleRef.current = trimmed;
    }
    await renameDocument(docId, trimmed);
    if (isSidebarMode) {
      useSidebarDockStore.setState((s) => ({
        items: s.items.map((it) =>
          it.documentId === docId ? { ...it, title: trimmed } : it
        ),
      }));
    }
  }, [currentDoc?.id, isLocked, renameDocument, isSidebarMode]);

  // Helper to flush any pending save immediately
  const flushPendingSave = useCallback((overrideDocId?: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const docId = overrideDocId || activeDocIdRef.current;
    const contentToSave = pendingContentRef.current;
    const rawMarkdownToSave = pendingRawMarkdownRef.current;

    // Only commit title rename if a title edit was explicitly in progress for THIS document
    let committedTitle: string | undefined = undefined;
    const pendingTitleEdit = pendingTitleEditRef.current;
    if (docId && pendingTitleEdit && pendingTitleEdit.docId === docId) {
      const trimmed = pendingTitleEdit.title.trim();
      const allDocs = useDocumentStore.getState().documents;
      const targetDoc = allDocs.find((d) => d.id === docId);
      if (trimmed && targetDoc && trimmed !== targetDoc.title) {
        renameDocument(docId, trimmed);
        committedTitle = trimmed;
      }
      isEditingTitleRef.current = false;
      pendingTitleEditRef.current = null;
    }

    if (docId && contentToSave !== null) {
      pendingContentRef.current = null;
      pendingRawMarkdownRef.current = null;
      saveDocumentById(docId, contentToSave, committedTitle, rawMarkdownToSave || undefined);
    }
  }, [saveDocumentById, renameDocument]);

  // Sync state when active document changes
  useEffect(() => {
    if (currentDoc) {
      const docChanged = activeDocIdRef.current !== currentDoc.id;

      if (docChanged) {
        // 1. Immediately flush pending save for the OLD document before loading the new one!
        if (activeDocIdRef.current) {
          flushPendingSave(activeDocIdRef.current);
        }

        isEditingTitleRef.current = false;
        pendingTitleEditRef.current = null;
        activeDocIdRef.current = currentDoc.id;
        setTitle(currentDoc.title);
        titleRef.current = currentDoc.title;
        setIsEditingSubheader(false);
        setContent(currentDoc.content_json || '');

        // If content was omitted to preserve memory (e.g. initial catalog load), fetch on demand from SQLite
        if (!currentDoc.is_folder && (!currentDoc.content_json || currentDoc.content_json === '')) {
          getDocumentById(currentDoc.id).then((fullDoc) => {
            if (fullDoc && fullDoc.content_json && activeDocIdRef.current === fullDoc.id) {
              setContent(fullDoc.content_json);
              useDocumentStore.setState((s) => ({
                documents: s.documents.map((d) => (d.id === fullDoc.id ? { ...d, content_json: fullDoc.content_json } : d)),
                activeDocument: s.activeDocument?.id === fullDoc.id ? { ...s.activeDocument, content_json: fullDoc.content_json } : s.activeDocument,
              }));
            }
          });
        }
      } else {
        // Same document updated (e.g. from background auto-save or edit from another pane)
        if (!isEditingSubheader && !isMainTitleFocused && !isEditingTitleRef.current) {
          setTitle(currentDoc.title);
          titleRef.current = currentDoc.title;
        }
        if (pendingContentRef.current === null && currentDoc.content_json !== undefined) {
          const nextContent = currentDoc.content_json || '';
          setContent((prev) => (prev === nextContent ? prev : nextContent));
        }
      }
    } else {
      if (activeDocIdRef.current) {
        flushPendingSave(activeDocIdRef.current);
      }
      isEditingTitleRef.current = false;
      pendingTitleEditRef.current = null;
      activeDocIdRef.current = null;
      setTitle('');
      titleRef.current = '';
      setContent('');
      setIsEditingSubheader(false);
    }
  }, [currentDoc?.id, currentDoc?.title, currentDoc?.content_json, flushPendingSave, isEditingSubheader, isMainTitleFocused]);

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
    window.addEventListener('noether:save-note', handleBlurOrUnload);
    return () => {
      window.removeEventListener('blur', handleBlurOrUnload);
      window.removeEventListener('beforeunload', handleBlurOrUnload);
      window.removeEventListener('pagehide', handleBlurOrUnload);
      document.removeEventListener('visibilitychange', handleBlurOrUnload);
      window.removeEventListener('noether:save-note', handleBlurOrUnload);
    };
  }, [flushPendingSave]);

  useEffect(() => {
    if (isEditingSubheader && subheaderInputRef.current) {
      subheaderInputRef.current.focus();
      subheaderInputRef.current.select();
    }
  }, [isEditingSubheader]);

  const scheduleDebouncedSave = useCallback((newContent?: string) => {
    if (newContent !== undefined) pendingContentRef.current = newContent;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      flushPendingSave();
    }, 400);
  }, [flushPendingSave]);

  const handleTyping = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        flushPendingSave();
      }, 800);
    }
  }, [flushPendingSave]);

  const handleTitleChange = useCallback((val: string) => {
    if (isLocked) return;
    setTitle(val);
    titleRef.current = val;
    isEditingTitleRef.current = true;
    if (currentDoc) {
      pendingTitleEditRef.current = { docId: currentDoc.id, title: val };
      updateDocumentTitleInMemory(currentDoc.id, val);
    }
  }, [isLocked, currentDoc, updateDocumentTitleInMemory]);

  const handleContentChange = useCallback(
    (newJson: string, sourceDocId?: string) => {
      if (isLocked) return;
      pendingRawMarkdownRef.current = null;
      // If update belongs to a previous or different document instance (e.g. unmount cleanup),
      // flush it directly to that document without corrupting active document state.
      if (sourceDocId && activeDocIdRef.current && sourceDocId !== activeDocIdRef.current) {
        saveDocumentById(sourceDocId, newJson);
        return;
      }
      pendingContentRef.current = newJson;
      scheduleDebouncedSave(newJson);
    },
    [scheduleDebouncedSave, isLocked, saveDocumentById]
  );

  const handleSourceModeChange = useCallback(
    (newContentJson: string, newTitle?: string, newProps?: DocumentProperties, rawMarkdown?: string) => {
      if (isLocked) return;
      pendingContentRef.current = newContentJson;
      if (rawMarkdown !== undefined) {
        pendingRawMarkdownRef.current = rawMarkdown;
      }
      if (newTitle && newTitle !== title && currentDoc) {
        commitTitleRename(newTitle);
      }
      if (newProps && currentDoc) {
        updateProperties(currentDoc.id, newProps);
      }
      scheduleDebouncedSave(newContentJson);
    },
    [isLocked, title, currentDoc, commitTitleRename, updateProperties, scheduleDebouncedSave]
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

  const handleDeadSpaceContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (e.defaultPrevented) return;

      showContextMenu(
        e,
        [
          {
            id: 'deadspace-readable-line-length',
            title: 'Readable line length',
            icon: <RulerIcon size={14} />,
            checked: readableLineLength,
            onClick: () => {
              setReadableLineLength(!readableLineLength);
            },
          },
          {
            id: 'deadspace-line-numbers',
            title: 'Line numbers',
            icon: <LeftToRightListNumberIcon size={14} />,
            checked: lineNumbers,
            onClick: () => {
              setLineNumbers(!lineNumbers);
            },
          },
          {
            id: 'deadspace-inline-title',
            title: 'Inline title',
            icon: <TextUnderlineIcon size={14} />,
            checked: inlineTitle,
            onClick: () => {
              setInlineTitle(!inlineTitle);
            },
          },
        ],
        {
          scope: 'editor-deadspace',
        }
      );
    },
    [readableLineLength, lineNumbers, inlineTitle, showContextMenu, setReadableLineLength, setLineNumbers, setInlineTitle]
  );

  const isDeadTab = useMemo(() => {
    if (!activeTab) return false;
    const tabDocId = activeTab.document_id;
    if (!tabDocId || tabDocId.startsWith('__')) return false;
    if (activeDocument && activeDocument.id === tabDocId) return false;
    return !documents.some((d) => d.id === tabDocId);
  }, [activeTab, documents, activeDocument]);

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
      data-main={isSidebarMode ? undefined : 'true'}
      data-sidebar-mode={isSidebarMode ? 'true' : undefined}
      style={{ touchAction: 'pan-x pan-y' }}
      className={`noether-doc-wrapper editor-canvas relative flex-1 flex flex-col h-full overflow-hidden ${
        isSidebarMode ? 'bg-transparent' : 'bg-[var(--noether-bg-tab-active,var(--noether-bg-main))]'
      }`}
    >

      {/* Obsidian Document Sub-Header: Navigation Arrows, Breadcrumbs & Options - Hidden in Sidebar Mode */}
      {!isSidebarMode && (
        <div
          data-sub-header="true"
          style={{ top: 'var(--noether-header-offset, 0px)' }}
          className="absolute left-0 right-0 h-8 px-4 flex items-center justify-between text-xs text-[#777] shrink-0 select-none z-20 pointer-events-none bg-[var(--noether-bg-tab-active,var(--noether-bg-main))]"
        >

        {/* Left: Navigation History Arrows */}
        <div className="relative z-10 flex items-center gap-0.5 shrink-0 pointer-events-auto">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            data-tooltip="Navigate back"
            data-shortcuts={JSON.stringify(['Alt + Left', 'Alt + A'])}
            className="noether-toolbar-btn"
          >
            <ArrowLeft01Icon size={14} />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            data-tooltip="Navigate forward"
            data-shortcuts={JSON.stringify(['Alt + Right', 'Alt + D'])}
            className="noether-toolbar-btn"
          >
            <ArrowRight01Icon size={14} />
          </button>
          <ViewportActionSlotHost corner="top-left" direction="horizontal" context={viewportActionContext} />
        </div>

        {/* Top-Left Vertical Floating Actions */}
        <div className="absolute left-4 top-[calc(var(--noether-header-offset,0px)+34px)] z-20 pointer-events-none select-none">
          <ViewportActionSlotHost corner="top-left" direction="vertical" context={viewportActionContext} />
        </div>

        {/* Center: Truly Absolute Centered Document Breadcrumb Title (Click to rename live in-place) */}
        <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center pointer-events-none px-20">
          {currentDoc ? (
            <div className="pointer-events-auto text-[12px] max-w-3xl px-1.5 py-0.5 text-center select-none flex items-center justify-center min-w-0 overflow-hidden text-[#777] drop-shadow-none">
              {(() => {
                const parts = breadcrumbItems;
                const hasFolders = parts.length > 1;
                const folderParts = parts.slice(0, -1);
                const isDeepHierarchy = folderParts.length > 1;
                const topFolder = folderParts.length > 0 ? folderParts[0] : null;
                const collapsedFolders = isDeepHierarchy ? folderParts.slice(1) : [];
                const collapsedTooltip = collapsedFolders.map((f: any) => f.title).join(' / ');
                const immediateParentFolder = isDeepHierarchy ? collapsedFolders[collapsedFolders.length - 1] : null;

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
                    new CustomEvent('noether:reveal-tree-item', {
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
                    {/* Topmost / Root Folder (a) */}
                    {topFolder && (
                      <React.Fragment key={topFolder.id}>
                        <span
                          onClick={handleFolderClick(topFolder.id, (topFolder as any).onClick)}
                          title={topFolder.title}
                          className={`text-[#666] hover:text-[#999] cursor-pointer inline-flex items-center gap-1.5 shrink min-w-0 max-w-[260px] overflow-hidden ${
                            (topFolder as any).className || ''
                          }`}
                        >
                          {renderBreadcrumbIcon(topFolder, 0)}
                          <span className="truncate block min-w-0">{topFolder.title}</span>
                        </span>
                        <span className="text-[#444] select-none mx-1.5 shrink-0">/</span>
                      </React.Fragment>
                    )}

                    {/* Intermediate Folders Ellipsis (...) when 2 or more folders exist: a / ... / b */}
                    {isDeepHierarchy && immediateParentFolder && (
                      <React.Fragment key="breadcrumb-middle-ellipsis">
                        <span
                          onClick={handleFolderClick(immediateParentFolder.id, (immediateParentFolder as any).onClick)}
                          title={collapsedTooltip || undefined}
                          className="text-[#666] hover:text-[#999] hover:bg-[var(--noether-bg-card-hover)] px-1.5 py-0.5 rounded cursor-pointer font-medium select-none shrink-0"
                        >
                          ...
                        </span>
                        <span className="text-[#444] select-none mx-1.5 shrink-0">/</span>
                      </React.Fragment>
                    )}

                    {/* Active File Title (b) with in-place Inline Rename */}
                    {isEditingSubheader ? (
                      <div className="text-[#dcddde] font-normal py-0.5 inline-flex items-center gap-1.5 min-w-0 max-w-[340px] shrink overflow-hidden">
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
                                  const orig = currentDoc._sortTitle !== undefined ? currentDoc._sortTitle : currentDoc.title;
                                  setTitle(orig);
                                  titleRef.current = orig;
                                  updateDocumentTitleInMemory(currentDoc.id, orig);
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
                        data-tooltip={isLocked ? 'Note is locked' : 'Click to rename'}
                        data-shortcuts={isLocked ? JSON.stringify(['Read-only']) : undefined}
                        className={`text-[#dcddde] font-normal py-0.5 inline-flex items-center gap-1.5 min-w-0 max-w-full shrink overflow-hidden ${
                          isLocked ? 'cursor-default' : 'cursor-text'
                        }`}
                      >
                        {renderBreadcrumbIcon(parts[parts.length - 1], parts.length - 1)}
                        <span className="truncate block min-w-0">{breadcrumbTitleOverride || title || (hasFolders ? parts[parts.length - 1].title : 'Untitled')}</span>
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>

        {/* Right: Reading View, Bookmark, Search & More Options */}
        <div className="relative z-10 flex items-center gap-0.5 shrink-0 pointer-events-auto">
          {/* Dynamic Extension Subheader Actions Slot (Left of View Mode Toggle) */}
          <ViewportActionSlotHost
            corner="top-right"
            direction="horizontal"
            context={viewportActionContext}
          />
          <ExtensionPortalSlotHost
            slot="editor:subheader-actions"
            context={portalSlotContext}
            className="flex items-center gap-0.5 shrink-0"
          />

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
            className={`noether-toolbar-btn ${
              !currentDoc
                ? 'opacity-20 cursor-default'
                : isLocked
                ? 'opacity-40 cursor-not-allowed hover:bg-transparent'
                : ''
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
            className={`noether-toolbar-btn ${
              currentDoc?.is_bookmarked
                ? '!text-[#f59e0b] hover:!text-[#fbbf24]'
                : ''
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
            data-active={isFindOpen ? 'true' : undefined}
            className={`noether-toolbar-btn ${isFindOpen ? 'active' : ''}`}
          >
            <Search01Icon size={14} />
          </button>

          <DocOptionsMenu document={currentDoc} />
        </div>

        {/* Top-Right Vertical Floating Actions */}
        <div className="absolute right-4 top-[calc(var(--noether-header-offset,0px)+34px)] z-20 pointer-events-none select-none">
          <ViewportActionSlotHost corner="top-right" direction="vertical" context={viewportActionContext} />
        </div>
      </div>
      )}

      {/* Main Body: Minimal Empty State or Document Prose Editor */}
      {!currentDoc ? (
        <div
          data-main={isSidebarMode ? undefined : 'true'}
          className={`flex-1 flex flex-col items-center justify-center select-none p-6 gap-3 ${
            isSidebarMode ? 'bg-transparent' : 'bg-[var(--noether-bg-tab-active,var(--noether-bg-main))]'
          }`}
        >

          <button
            type="button"
            onClick={async () => {
              const newDoc = await createNewNote('Untitled', null, 'base', false);
              if (newDoc) {
                openTabInPane(currentPaneId, newDoc.id, newDoc.title);
              }
            }}
            className="text-[13px] text-[#888888] hover:text-[#dcddde] cursor-pointer"
          >
            Create new note <span className="text-[#555] ml-1">Ctrl + N</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="text-[13px] text-[#888888] hover:text-[#dcddde] cursor-pointer"
          >
            Go to file <span className="text-[#555] ml-1">Ctrl + O</span>
          </button>

          <button
            type="button"
            onClick={() => platform.openHelpWindow()}
            className="text-[13px] text-[#888888] hover:text-[#dcddde] cursor-pointer"
          >
            Syntax & Help Guide <span className="text-[#555] ml-1">F1</span>
          </button>

          {(activeTab || activeTabId || splitActiveTabId) && (
            <button
              type="button"
              onClick={() => {
                if (activeTab) {
                  closeTabInPane(currentPaneId, activeTab.id);
                } else if (pane === 'split' && splitActiveTabId) {
                  closeSplitTab(splitActiveTabId);
                } else if (activeTabId) {
                  closeTab(activeTabId);
                }
              }}
              className="text-[13px] text-[#888888] hover:text-[#dcddde] cursor-pointer"
            >
              Close
            </button>
          )}
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

          {/* Dynamic Extension Minimap Slot */}
          <ExtensionPortalSlotHost
            slot="editor:minimap"
            context={portalSlotContext}
            className="absolute top-0 right-0 bottom-0 pointer-events-none z-20 flex justify-end"
          />

          {/* Dynamic Extension Viewport Overlay Slot */}
          <ExtensionPortalSlotHost
            slot="editor:viewport-overlay"
            context={portalSlotContext}
            className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
          />

          {/* Dynamic Extension Floating Contextual Toolbar Slot */}
          <ExtensionPortalSlotHost
            slot="editor:floating-toolbar"
            context={portalSlotContext}
            className="absolute inset-0 pointer-events-none z-40 overflow-visible"
          />

          <div
            ref={scrollViewportRef}
            style={{ touchAction: 'pan-x pan-y' }}
            onScroll={handleScroll}
            onMouseDown={handleDeadSpaceMouseDown}
            onClick={handleDeadSpaceClick}
            onContextMenu={handleDeadSpaceContextMenu}
            onMouseOver={handleViewportMouseOver}
            onMouseOut={handleViewportMouseOut}
            className={`flex-1 overflow-y-auto custom-scrollbar ${
              !isSidebarMode ? 'scrollbar-track-offset-subheader' : ''
            } ${isReadingMode ? 'cursor-default' : ''}`}
          >
            {/* Dynamic Extension Banner Slot */}
            <div
              style={
                hasCover && !isSidebarMode
                  ? { paddingTop: 'calc(var(--noether-header-offset, 0px) + 32px)' }
                  : undefined
              }
              className="w-full shrink-0"
            >
              <ExtensionPortalSlotHost
                slot="editor:banner"
                context={portalSlotContext}
                className="w-full shrink-0"
              />
            </div>
            <div
              style={
                !hasCover && !isSidebarMode
                  ? { paddingTop: 'calc(var(--noether-header-offset, 0px) + 40px)' }
                  : undefined
              }
              className={`mx-auto pt-3 pb-8 flex flex-col min-h-full relative z-10 ${
                isSidebarMode ? 'w-full pl-7 pr-3 max-w-none' : readableLineLength ? 'w-full max-w-3xl px-10' : 'w-full px-12 max-w-none'
              }`}
            >
              {/* Dynamic Extension Content Overlay Slot (Moves with text) */}
              <ExtensionPortalSlotHost
                slot="editor:content-overlay"
                context={portalSlotContext}
                className="absolute inset-0 pointer-events-none z-20 overflow-visible"
              />
              {isImageDoc ? (
                <div className="flex-1 flex flex-col items-center justify-center py-4 select-none my-auto">
                  <div className="max-w-full flex items-center justify-center">
                    <img
                      src={mediaSrc}
                      alt={currentDoc.title}
                      onClick={() => useWorkspaceStore.getState().openImageLightbox(mediaSrc, currentDoc.title)}
                      className="max-w-full max-h-[calc(100vh-140px)] object-contain cursor-zoom-in"
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
                <div className="flex-1 w-full h-full min-h-[500px] flex flex-col rounded-lg overflow-hidden border border-[#2a2a2a] my-2">
                  <React.Suspense
                    fallback={
                      <div className="flex-1 flex items-center justify-center text-xs text-[#888]">
                        Loading PDF...
                      </div>
                    }
                  >
                    <LazyPdfViewer doc={currentDoc} isSidebar={isSidebarMode} app={app} embedded />
                  </React.Suspense>
                </div>
              ) : isSourceMode ? (
                isContentReady ? (
                  <SourceModeEditor
                    key={`source-${currentDoc.id}`}
                    documentId={currentDoc.id}
                    contentJson={content || currentDoc.content_json || ''}
                    title={title || currentDoc.title}
                    properties={currentDoc.properties}
                    editable={isEditable}
                    onChange={handleSourceModeChange}
                    onSave={flushPendingSave}
                  />
                ) : (
                  <div className="flex-1 w-full min-h-[300px]" />
                )
              ) : (
                <>
                  {/* Document Header (Title + In-Document Properties & Tags) */}
                  <div className="relative group/title">
                    {/* Document Title Header */}
                    {inlineTitle && (
                      <div className={`${hasActiveHeaders ? 'mb-3' : 'mb-4'} relative -ml-1`}>
                        {/* Fold button on Document Title Header */}
                        {foldHeading && hasActiveHeaders && currentDoc && (
                          <button
                            type="button"
                            onClick={toggleHeaderFold}
                            title={isHeaderFolded ? 'Unfold document header' : 'Fold document header'}
                            className={`absolute ${
                              isSidebarMode ? '-left-[22px] w-[22px]' : '-left-[36px] w-[36px]'
                            } top-[calc(50%-4px)] -translate-y-1/2 h-[32px] flex items-center justify-start pl-[2px] text-[#777] hover:text-[#dcddde] z-10 ${
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
                              <h1 className="noether-doc-title w-full cursor-default select-text">
                                {breadcrumbTitleOverride || title || 'Untitled'}
                              </h1>
                            ) : (
                              <div className="relative w-full">
                                <input
                                  type="text"
                                  value={isMainTitleFocused ? title : (breadcrumbTitleOverride || title)}
                                  onFocus={() => setIsMainTitleFocused(true)}
                                  onChange={(e) => handleTitleChange(e.target.value)}
                                  onBlur={() => {
                                    setIsMainTitleFocused(false);
                                    commitTitleRename(title);
                                  }}
                                  onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      setIsMainTitleFocused(false);
                                      commitTitleRename(title);
                                      (e.target as HTMLInputElement).blur();
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      if (currentDoc) {
                                        const orig = currentDoc._sortTitle !== undefined ? currentDoc._sortTitle : currentDoc.title;
                                        setTitle(orig);
                                        titleRef.current = orig;
                                        updateDocumentTitleInMemory(currentDoc.id, orig);
                                      }
                                      setIsMainTitleFocused(false);
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  placeholder="Untitled"
                                  className="noether-doc-title-input bg-transparent placeholder:text-[var(--noether-text-muted)] placeholder:opacity-40"
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
                          <h1 className="noether-doc-title w-full pb-2 cursor-default select-text">
                            {breadcrumbTitleOverride || title || 'Untitled'}
                          </h1>
                        ) : (
                          <div className="relative w-full">
                            <input
                              type="text"
                              value={isMainTitleFocused ? title : (breadcrumbTitleOverride || title)}
                              onFocus={() => setIsMainTitleFocused(true)}
                              onChange={(e) => handleTitleChange(e.target.value)}
                              onBlur={() => {
                                setIsMainTitleFocused(false);
                                commitTitleRename(title);
                              }}
                              onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                                  e.stopPropagation();
                                  return;
                                }
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setIsMainTitleFocused(false);
                                  commitTitleRename(title);
                                  (e.target as HTMLInputElement).blur();
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  if (currentDoc) {
                                    const orig = currentDoc._sortTitle !== undefined ? currentDoc._sortTitle : currentDoc.title;
                                    setTitle(orig);
                                    titleRef.current = orig;
                                    updateDocumentTitleInMemory(currentDoc.id, orig);
                                  }
                                  setIsMainTitleFocused(false);
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              placeholder="Untitled"
                              className="noether-doc-title-input bg-transparent pb-2 placeholder:text-[var(--noether-text-muted)] placeholder:opacity-40"
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
                      <div data-document-header="true" className="mb-3">
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
                    data-editor-view="true"
                    data-editor-canvas="true"
                    style={editorMinHeight ? { minHeight: `${editorMinHeight}px` } : undefined}
                    className={`flex-1 w-full flex flex-col ${
                      lineNumbers ? 'noether-line-numbers' : ''
                    } ${indentationGuides ? 'noether-indent-guides' : ''} ${
                      accentListPrefixes ? 'noether-accent-lists' : ''
                    } ${strictLineBreaks ? 'noether-strict-line-breaks' : ''} ${
                      showExternalLinkIcon ? 'noether-show-link-icon' : ''
                    } ${
                      !isEditable ? 'tiptap-reading-view cursor-default' : 'cursor-text'
                    }`}
                  >
                    {isContentReady ? (
                      <TipTapEditor
                        key={`${currentPaneId}-${currentDoc.id}`}
                        documentId={currentDoc.id}
                        content={content || currentDoc.content_json || ''}
                        editable={isEditable}
                        onChange={handleContentChange}
                        onEditorReady={setEditorInstance}
                        onTyping={handleTyping}
                      />
                    ) : (
                      <div className="flex-1 w-full min-h-[200px]" />
                    )}
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

      {/* Bottom-Left Viewport Actions */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none select-none flex flex-col gap-1">
        <ViewportActionSlotHost corner="bottom-left" direction="vertical" context={viewportActionContext} />
        <ViewportActionSlotHost corner="bottom-left" direction="horizontal" context={viewportActionContext} />
      </div>

      {/* Bottom-Right Viewport Actions */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none select-none flex flex-col items-end gap-1">
        <ViewportActionSlotHost corner="bottom-right" direction="vertical" context={viewportActionContext} />
        <ViewportActionSlotHost corner="bottom-right" direction="horizontal" context={viewportActionContext} />
      </div>

      {/* Wikilink Floating Hover Preview */}
      {wikilinkHoverPreview && (
        <WikilinkHoverPreview
          target={wikilinkHoverPreview.target}
          anchorRect={wikilinkHoverPreview.anchorRect}
          onClose={handleCloseHoverPreview}
          onMouseEnter={handleMouseEnterPreview}
          onMouseLeave={handleMouseLeavePreview}
        />
      )}
    </div>
  );
});

