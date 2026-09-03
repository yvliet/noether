import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FileAddIcon,
  Layout01Icon,
  FolderAddIcon,
  Sorting01Icon,
  ArrowShrink02Icon,
  ArrowExpand01Icon,
  Search01Icon,
  HelpCircleIcon,
  Settings02Icon,
  ArrowUpDownIcon,
  CheckIcon,
  Edit02Icon,
  FolderOpenIcon,
  CancelCircleIcon,
  Cancel01Icon,
  ChevronsUpDownIcon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFlintApp, useExtensionList, useFileTreeActions, useFileTreeSections, useSidebarTabs } from '@/core/app/AppContext';
import { FileTreeNode, getVisibleTreeItemIds } from '@/components/file-tree/FileTreeNode';

import { DocumentItem } from '@/types';
import { platform } from '@/lib/platform/platformAdapter';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { useSidebarDockStore } from '@/store/sidebarDockStore';
import { SidebarDockPane } from './SidebarDockPane';
import { SidebarSecondaryIconBar } from './SidebarSecondaryIconBar';
import { useActiveTabDrag } from '@/hooks/useTabReorder';


export type FileSortOrder =
  | 'alphabetical'
  | 'alphabetical-reverse'
  | 'byModifiedTime'
  | 'byModifiedTimeReverse'
  | 'byCreatedTime'
  | 'byCreatedTimeReverse';

export const SORT_OPTIONS: { id: FileSortOrder; label: string; group: number }[] = [
  { id: 'alphabetical', label: 'File name (A to Z)', group: 1 },
  { id: 'alphabetical-reverse', label: 'File name (Z to A)', group: 1 },
  { id: 'byModifiedTime', label: 'Modified time (new to old)', group: 2 },
  { id: 'byModifiedTimeReverse', label: 'Modified time (old to new)', group: 2 },
  { id: 'byCreatedTime', label: 'Created time (new to old)', group: 3 },
  { id: 'byCreatedTimeReverse', label: 'Created time (old to new)', group: 3 },
];

export function sortDocuments(docs: DocumentItem[], sortOrder: FileSortOrder): DocumentItem[] {
  return [...docs].sort((a, b) => {
    if (a.is_folder !== b.is_folder) return b.is_folder - a.is_folder;
    switch (sortOrder) {
      case 'alphabetical':
        return a.title.localeCompare(b.title);
      case 'alphabetical-reverse':
        return b.title.localeCompare(a.title);
      case 'byModifiedTime':
        return (b.updated_at || 0) - (a.updated_at || 0);
      case 'byModifiedTimeReverse':
        return (a.updated_at || 0) - (b.updated_at || 0);
      case 'byCreatedTime':
        return (b.created_at || 0) - (a.created_at || 0);
      case 'byCreatedTimeReverse':
        return (a.created_at || 0) - (b.created_at || 0);
      default:
        return a.title.localeCompare(b.title);
    }
  });
}

export const LeftSidebar: React.FC = React.memo(() => {
  const app = useFlintApp();
  const extensionList = useExtensionList();
  const fileTreeActions = useFileTreeActions();
  const fileTreeSections = useFileTreeSections();
  const sidebarTabs = useSidebarTabs('left');

  const activeLeftView = useWorkspaceStore((s) => s.activeLeftView);
  const leftSidebarWidth = useWorkspaceStore((s) => s.leftSidebarWidth);
  const setLeftSidebarWidth = useWorkspaceStore((s) => s.setLeftSidebarWidth);
  const hearthName = useWorkspaceStore((s) => s.hearthName || s.vaultName);
  const hearthPath = useWorkspaceStore((s) => s.hearthPath || s.vaultPath);
  const setIsSettingsOpen = useWorkspaceStore((s) => s.setIsSettingsOpen);
  const setIsHelpModalOpen = useWorkspaceStore((s) => s.setIsHelpModalOpen);
  const setIsHearthModalOpen = useWorkspaceStore((s) => s.setIsHearthModalOpen);
  const triggerCollapseAll = useWorkspaceStore((s) => s.triggerCollapseAll);
  const collapseAllFolders = useWorkspaceStore((s) => s.collapseAllFolders);
  const expandAllFolders = useWorkspaceStore((s) => s.expandAllFolders);
  const folderOpenState = useWorkspaceStore((s) => s.folderOpenState);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const openInputDialog = useWorkspaceStore((s) => s.openInputDialog);
  const folderPickerPrompt = useWorkspaceStore((s) => s.folderPickerPrompt);
  const cancelFolderSelection = useWorkspaceStore((s) => s.cancelFolderSelection);

  const documents = useDocumentStore((s) => s.documents);

  const folders = useMemo(() => documents.filter((d) => d.is_folder), [documents]);
  const areAllFoldersCollapsed = useMemo(() => {
    if (folders.length === 0) return false;
    return folders.every((f) => folderOpenState[f.id] === false);
  }, [folders, folderOpenState]);
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const createNewFolder = useDocumentStore((s) => s.createNewFolder);
  const searchQuery = useDocumentStore((s) => s.searchQuery);
  const setSearchQuery = useDocumentStore((s) => s.setSearchQuery);
  const selectedDocIds = useDocumentStore((s) => s.selectedDocIds);
  const clearSelection = useDocumentStore((s) => s.clearSelection);
  const selectAll = useDocumentStore((s) => s.selectAll);
  const removeDocuments = useDocumentStore((s) => s.removeDocuments);
  const selectSingleDoc = useDocumentStore((s) => s.selectSingleDoc);
  const selectDocRange = useDocumentStore((s) => s.selectDocRange);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);

  const [sortOrder, setSortOrder] = useState<FileSortOrder>('alphabetical');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isVerticalSplitResizing, setIsVerticalSplitResizing] = useState(false);
  const sortMenuRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeLeftView === 'search') {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeLeftView]);

  const dockItems = useSidebarDockStore((s) => s.items);
  const splitRatioLeft = useSidebarDockStore((s) => s.splitRatioLeft);
  const setSplitRatio = useSidebarDockStore((s) => s.setSplitRatio);

  const leftTopDockItems = useMemo(
    () => dockItems.filter((it) => it.zone === 'left-top' && it.enabled),
    [dockItems]
  );
  const hasLeftTopItems = leftTopDockItems.length > 0;
  const isFilesActive = hasLeftTopItems && activeLeftView === 'files' && leftTopDockItems.some((it) => it.id === 'files');
  const isSearchActive = hasLeftTopItems && activeLeftView === 'search' && leftTopDockItems.some((it) => it.id === 'search');

  const bottomDockItems = useMemo(
    () => dockItems.filter((it) => it.zone === 'left-bottom' && it.enabled),
    [dockItems]
  );
  const hasBottomSplit = bottomDockItems.length > 0;

  const isDockedTop = useMemo(() => {
    if (!hasLeftTopItems || !activeLeftView) return false;
    if (activeLeftView === 'files' || activeLeftView === 'search') return false;
    return leftTopDockItems.some(
      (it) =>
        it.id === activeLeftView ||
        it.viewType === activeLeftView ||
        it.extensionId === activeLeftView ||
        it.documentId === activeLeftView ||
        `doc:${it.documentId}` === activeLeftView ||
        (activeLeftView.startsWith('doc:') && it.id === activeLeftView)
    );
  }, [hasLeftTopItems, activeLeftView, leftTopDockItems]);

  const activeCustomTab = useMemo(() => {
    if (!hasLeftTopItems || !activeLeftView) return null;
    if (!leftTopDockItems.some((it) => it.id === activeLeftView || it.extensionId === activeLeftView)) return null;
    return sidebarTabs.find((t) => t.id === activeLeftView) || null;
  }, [hasLeftTopItems, activeLeftView, leftTopDockItems, sidebarTabs]);

  const handleVerticalSplitResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsVerticalSplitResizing(true);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const sidebarEl = (e.target as HTMLElement).closest('aside[data-sidebar="true"]');
      if (!sidebarEl) return;

      const sidebarRect = sidebarEl.getBoundingClientRect();
      const totalHeight = sidebarRect.height - 80;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const relativeY = moveEvent.clientY - sidebarRect.top - 40;
        const newRatio = relativeY / totalHeight;
        setSplitRatio('left', newRatio);
      };

      const handleMouseUp = () => {
        setIsVerticalSplitResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [setSplitRatio]
  );

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setLeftSidebarWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [leftSidebarWidth, setLeftSidebarWidth]);

  const [sortMenuPos, setSortMenuPos] = useState<{ top?: number; left?: number; right?: number; bottom?: number }>({});

  const updateSortMenuPos = useCallback(() => {
    if (!sortMenuRef.current) return;
    const rect = sortMenuRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuWidth = 185;
    const vw = window.innerWidth;

    let top: number | undefined = undefined;
    let bottom: number | undefined = undefined;
    let left: number | undefined = undefined;
    let right: number | undefined = undefined;

    if (spaceBelow < 280 && rect.top > 280) {
      bottom = window.innerHeight - rect.top + 4;
    } else {
      top = rect.bottom + 4;
    }

    if (rect.left + menuWidth > vw - 8) {
      right = Math.max(8, vw - rect.right);
    } else {
      left = Math.max(8, rect.left);
    }

    setSortMenuPos({
      top,
      bottom,
      left,
      right,
    });
  }, []);

  // Close sort menu on click outside
  useEffect(() => {
    if (!isSortMenuOpen) return;

    updateSortMenuPos();

    const handleOutsideClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };

    const handleScrollOrResize = () => updateSortMenuPos();

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isSortMenuOpen, updateSortMenuPos]);

  // Keyboard shortcut listener for file tree selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') ||
        target.closest('form')
      ) {
        return;
      }

      const { selectedDocIds: currentSelected, lastSelectedDocId } = useDocumentStore.getState();

      // Ctrl+A / Cmd+A: Select all visible items
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover'));
        if (isInsideSidebar || currentSelected.length > 0) {
          e.preventDefault();
          const visibleIds = getVisibleTreeItemIds();
          if (visibleIds.length > 0) {
            selectAll(visibleIds);
          }
        }
        return;
      }

      // Escape: Cancel folder picking or clear selection
      if (e.key === 'Escape') {
        if (useWorkspaceStore.getState().folderPickerPrompt?.isOpen) {
          e.preventDefault();
          cancelFolderSelection();
          return;
        }
        if (currentSelected.length > 0) {
          e.preventDefault();
          clearSelection();
          return;
        }
      }

      // Delete / Backspace: Delete selected items
      if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelected.length > 0) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover'));
        if (isInsideSidebar || document.activeElement === document.body) {
          e.preventDefault();
          const count = currentSelected.length;
          const { skipDeleteConfirmation } = useSettingsStore.getState();
          if (skipDeleteConfirmation) {
            removeDocuments(currentSelected);
            showToast(`Moved ${count} item${count > 1 ? 's' : ''} to trash`, 'info');
            return;
          }

          openConfirmDialog({
            title: count > 1 ? `Move ${count} items to trash` : 'Move to trash',
            message: `Are you sure you want to move ${count > 1 ? `${count} items` : 'this item'} to trash?`,
            subtext: 'They will be kept in trash for 48 hours before being automatically cleared.',
            confirmText: 'Move to trash',
            isDanger: true,
            onConfirm: () => {
              removeDocuments(currentSelected);
              showToast(`Moved ${count} item${count > 1 ? 's' : ''} to trash`, 'info');
            },
          });
        }
        return;
      }

      // ArrowUp / ArrowDown navigation
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && currentSelected.length > 0) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover'));
        if (isInsideSidebar) {
          e.preventDefault();
          const currentAnchor = lastSelectedDocId || currentSelected[currentSelected.length - 1];
          const anchorEl = currentAnchor ? document.getElementById(`flint-tree-item-${currentAnchor}`) : null;
          const visibleIds = getVisibleTreeItemIds(anchorEl);
          if (visibleIds.length === 0) return;

          const currIdx = visibleIds.indexOf(currentAnchor);
          const nextIdx =
            e.key === 'ArrowUp'
              ? Math.max(0, currIdx - 1)
              : Math.min(visibleIds.length - 1, currIdx + 1);

          const nextId = visibleIds[nextIdx];
          if (e.shiftKey) {
            selectDocRange(nextId, visibleIds, e.ctrlKey || e.metaKey);
          } else {
            selectSingleDoc(nextId);
            const doc = documents.find((d) => d.id === nextId);
            if (doc && !doc.is_folder) {
              setActiveDocumentById(doc.id);
            }
          }

          const targetNode = document.getElementById(`flint-tree-item-${nextId}`);
          if (targetNode) {
            targetNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectAll,
    clearSelection,
    removeDocuments,
    selectDocRange,
    selectSingleDoc,
    documents,
    setActiveDocumentById,
    showToast,
    openConfirmDialog,
  ]);

  // Filter root documents (parent_id === null)
  const rootDocs = useMemo(() => {
    return sortDocuments(
      documents.filter((d) => !d.parent_id),
      sortOrder
    );
  }, [documents, sortOrder]);

  // Filter search results with sorting and case sensitivity support
  const searchFilteredDocs = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];

    return sortDocuments(
      documents.filter((d) => {
        if (isCaseSensitive) {
          return d.title.includes(q);
        }
        return d.title.toLowerCase().includes(q.toLowerCase());
      }),
      sortOrder
    );
  }, [documents, searchQuery, isCaseSensitive, sortOrder]);

  const handleCreateNote = useCallback(async () => {
    setSearchQuery('');
    await createNewNote('Untitled');
  }, [setSearchQuery, createNewNote]);

  const { showContextMenu } = useAppContextMenu();

  const handleCreateFolder = useCallback(async () => {
    setSearchQuery('');
    await createNewFolder('Untitled');
  }, [setSearchQuery, createNewFolder]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('[data-tree-item-id]') ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('input')
    ) {
      return;
    }
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    clearSelection();
  }, [clearSelection]);

  const handleRootContextMenu = useCallback((e: React.MouseEvent) => {
    // Only handle if clicking background/root, not inside an existing file item
    if ((e.target as HTMLElement).closest('[data-tree-item-id]')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    clearSelection();

    const items: ContextMenuItem[] = [
      {
        id: 'root-new-note',
        title: 'New note',
        icon: <FileAddIcon size={14} />,
        shortcut: 'Ctrl+N',
        onClick: handleCreateNote,
      },
      {
        id: 'root-new-folder',
        title: 'New folder',
        icon: <FolderAddIcon size={14} />,
        onClick: handleCreateFolder,
      },
      { type: 'separator' },
      {
        id: 'root-collapse-all',
        title: areAllFoldersCollapsed ? 'Expand all folders' : 'Collapse all folders',
        icon: areAllFoldersCollapsed ? <ArrowExpand01Icon size={14} /> : <ArrowShrink02Icon size={14} />,
        onClick: areAllFoldersCollapsed ? expandAllFolders : collapseAllFolders,
      },
    ];

    showContextMenu(e, items, { scope: 'file-tree-root' });
  }, [handleCreateNote, handleCreateFolder, areAllFoldersCollapsed, expandAllFolders, collapseAllFolders, showContextMenu, clearSelection]);

  const activeDrag = useActiveTabDrag();

  return (
    <aside
      data-sidebar="true"
      data-sidebar-side="left"
      style={{
        width: `${leftSidebarWidth}px`,
        background: 'var(--flint-bg-sidebar-gradient, var(--flint-bg-sidebar))',
      }}
      className="flex flex-col h-full select-none shrink-0 relative"
    >
      {activeDrag?.targetDockZone === 'left-bottom' && (
        <div
          style={{
            bottom: '44px',
            height: '46%',
            background: 'rgba(128, 128, 128, 0.42)',
          }}
          className="absolute inset-x-2 rounded-xl pointer-events-none z-50"
        />
      )}

      {/* Draggable right edge resize handle */}


      <div
        onMouseDown={handleResizeStart}
        className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-40 flex justify-center group"
      >
        <div
          className={`w-[2px] h-full ${
            isResizing ? 'bg-white' : 'bg-transparent group-hover:bg-white/50'
          }`}
        />
      </div>

      {/* Top Action Header (Centered Minimal Obsidian Toolbar) - Hide if viewing docked pane or in search view */}
      {isFilesActive && (
        <div className="h-9 px-2 flex items-center justify-center gap-1.5 text-[var(--flint-text-muted)]">
          <button
            onClick={handleCreateNote}
            title="New note (Ctrl+N)"
            className="p-1.5 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
          >
            <FileAddIcon size={14} />
          </button>
          <button
            onClick={handleCreateFolder}
            title="New folder"
            className="p-1.5 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
          >
            <FolderAddIcon size={14} />
          </button>

          {/* Dynamic Plugin File Tree Actions */}
          {fileTreeActions.map((action) => (
            <button
              key={action.id}
              onClick={() => action.onClick(app)}
              title={action.title}
              className="p-1.5 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
            >
              {action.icon}
            </button>
          ))}

          {/* Sort Menu Button */}
          <div className="relative">
            <button
              ref={sortMenuRef}
              onClick={(e) => {
                e.stopPropagation();
                if (!isSortMenuOpen) updateSortMenuPos();
                setIsSortMenuOpen((prev) => !prev);
              }}
              title="Change sort order"
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isSortMenuOpen
                  ? 'bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-primary)]'
                  : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)]'
              }`}
            >
              <Sorting01Icon size={14} />
            </button>
          </div>

          <button
            onClick={areAllFoldersCollapsed ? expandAllFolders : collapseAllFolders}
            title={areAllFoldersCollapsed ? 'Expand all folders' : 'Collapse all folders'}
            className="p-1.5 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
          >
            {areAllFoldersCollapsed ? <ArrowExpand01Icon size={14} /> : <ArrowShrink02Icon size={14} />}
          </button>
        </div>
      )}

      {/* Top Search Header - Shown in search view (replaces top action toolbar) */}
      {isSearchActive && (
        <div className="pt-2 px-2 pb-1.5 flex flex-col gap-1.5">
          {/* Top Search Input Row */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--flint-bg-input)] border border-[var(--flint-border-base)] focus-within:border-[var(--flint-accent)] transition-colors">
              <Search01Icon size={14} className="text-[var(--flint-text-muted)] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-transparent outline-none flex-1 text-xs text-[var(--flint-text-primary)] placeholder-[var(--flint-text-faint)] min-w-0"
              />
              <button
                type="button"
                onClick={() => setIsCaseSensitive((prev) => !prev)}
                title={isCaseSensitive ? 'Match case: ON' : 'Match case: OFF'}
                className={`px-1 py-0.5 rounded text-[11px] font-semibold leading-none cursor-pointer transition-colors ${
                  isCaseSensitive
                    ? 'bg-[var(--flint-accent)] text-white'
                    : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)]'
                }`}
              >
                Aa
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  className="p-0.5 rounded text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-pointer transition-colors"
                >
                  <CancelCircleIcon size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Results Count & Sort Dropdown Row */}
          <div className="flex items-center justify-between px-1 text-xs text-[var(--flint-text-muted)] select-none">
            <span className="text-[11px]">
              {searchFilteredDocs.length} {searchFilteredDocs.length === 1 ? 'result' : 'results'}
            </span>
            <button
              ref={sortMenuRef}
              onClick={(e) => {
                e.stopPropagation();
                if (!isSortMenuOpen) updateSortMenuPos();
                setIsSortMenuOpen((prev) => !prev);
              }}
              title="Change sort order"
              className="flex items-center gap-1 text-[11px] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-pointer hover:bg-[var(--flint-bg-card-hover)] px-1.5 py-0.5 rounded transition-colors"
            >
              <span className="truncate max-w-[130px]">
                {SORT_OPTIONS.find((o) => o.id === sortOrder)?.label || 'File name (A to Z)'}
              </span>
              <ChevronsUpDownIcon size={12} className="shrink-0 opacity-70" />
            </button>
          </div>

          {/* Subtle separator line */}
          <div className="border-b border-[var(--flint-border-base)] -mx-2 mt-0.5 opacity-60" />
        </div>
      )}

      {/* Main Top Content Area */}
      <div
        data-sidebar-root="true"
        style={hasBottomSplit ? { flex: splitRatioLeft } : { flex: 1 }}
        onPointerDown={handleBackgroundClick}
        onClick={handleBackgroundClick}
        onContextMenu={handleRootContextMenu}
        className="min-h-0 overflow-y-auto px-2 py-1 custom-scrollbar flex flex-col"
      >
        {!hasLeftTopItems || (!isFilesActive && !isSearchActive && !isDockedTop && !activeCustomTab) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[#666] text-xs gap-2 select-none py-16">
            <Cancel01Icon size={24} className="opacity-40" />
            <span>There's nothing in here</span>
          </div>
        ) : isDockedTop ? (
          <SidebarDockPane zone="left-top" />
        ) : activeCustomTab ? (
          activeCustomTab.render(app)
        ) : isSearchActive ? (
          !searchQuery.trim() ? null : searchFilteredDocs.length === 0 ? (
            <div className="px-2 py-4 text-xs text-[var(--flint-text-muted)] select-none">
              No matches found.
            </div>
          ) : (
            <div data-tree-section="search-results" className="flex-1 flex flex-col gap-0.5">
              {searchFilteredDocs.map((doc) => (
                <FileTreeNode key={doc.id} item={doc} allDocs={documents} sortOrder={sortOrder} />
              ))}
            </div>
          )
        ) : isFilesActive ? (
          <div className="flex flex-col gap-0.5 flex-1">
            {/* Dynamic Plugin File Tree Sections */}
            {fileTreeSections.map((section) => (
              <div key={section.id} data-tree-section={section.id}>
                {section.render({ documents, sortOrder, app })}
              </div>
            ))}

            {/* Standard Hearth Root Documents & Folders */}
            <div data-tree-section="hearth-files" className="flex flex-col gap-0.5">
              {rootDocs.map((doc) => (
                <FileTreeNode key={doc.id} item={doc} allDocs={documents} sortOrder={sortOrder} />
              ))}
            </div>
            {rootDocs.length === 0 && fileTreeSections.length === 0 && (
              <div className="text-center py-8 text-xs text-[var(--flint-text-muted)]">
                No files in Hearth. Click <span className="text-[var(--flint-text-primary)] font-medium">+</span> above to create one.
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#666] text-xs gap-2 select-none py-16">
            <Cancel01Icon size={24} className="opacity-40" />
            <span>There's nothing in here</span>
          </div>
        )}
      </div>

      {/* Sort Menu Dropdown - Portal to body so it never clips inside sidebar */}
      {isSortMenuOpen &&
        createPortal(
          <div
            data-sort-menu="true"
            style={{
              position: 'fixed',
              top: sortMenuPos.top != null ? `${sortMenuPos.top}px` : undefined,
              left: sortMenuPos.left != null ? `${sortMenuPos.left}px` : undefined,
              right: sortMenuPos.right != null ? `${sortMenuPos.right}px` : undefined,
              bottom: sortMenuPos.bottom != null ? `${sortMenuPos.bottom}px` : undefined,
              background: 'var(--flint-bg-popover, var(--flint-bg-card))',
              border: '1px solid var(--flint-border-base)',
              boxShadow: 'var(--flint-shadow-2)',
            }}
            className="w-[185px] rounded-lg p-1 text-xs text-[var(--flint-text-secondary)] select-none z-[99999] backdrop-blur-md flex flex-col gap-[1px]"
          >
            {SORT_OPTIONS.map((opt, i) => (
              <React.Fragment key={opt.id}>
                {i > 0 && SORT_OPTIONS[i - 1].group !== opt.group && (
                  <div className="h-[1px] bg-[var(--flint-border-base)] my-1 mx-1" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSortOrder(opt.id);
                    setIsSortMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-[5px] flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                    sortOrder === opt.id
                      ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)] font-medium'
                      : 'hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {sortOrder === opt.id && <CheckIcon size={13} className="text-[var(--flint-text-primary)] shrink-0 ml-1.5" />}
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}

      {/* Bottom Split (if any docked items in left-bottom) */}
      {hasBottomSplit && (
        <div
          style={{ flex: 1 - splitRatioLeft }}
          className="min-h-0 flex flex-col relative overflow-hidden"
        >
          {/* Resizable horizontal divider */}
          <div
            onMouseDown={handleVerticalSplitResizeStart}
            className="w-full h-1 cursor-row-resize z-30 group flex items-center justify-center -my-0.5"
          >
            <div
              className={`w-full h-[1px] ${
                isVerticalSplitResizing ? 'bg-white' : 'bg-[var(--flint-border-base)] group-hover:bg-white/50'
              }`}
            />
          </div>

          <SidebarSecondaryIconBar zone="left-bottom" />

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
            <SidebarDockPane zone="left-bottom" />
          </div>
        </div>
      )}


      {/* Bottom Hearth Footer */}
      <div className="h-10 pr-2 flex items-center justify-between text-xs text-[var(--flint-text-muted)] bg-[var(--flint-bg-sidebar)] border-t border-[var(--flint-border-base)]">
        <button
          onClick={() => setIsHearthModalOpen(true)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e, [
              {
                id: 'open-switcher',
                title: 'Open Hearth switcher',
                icon: <ArrowUpDownIcon size={14} />,
                onClick: () => setIsHearthModalOpen(true),
              },
              { type: 'separator' },
              {
                id: 'reveal-in-explorer',
                title: 'Reveal Hearth in file explorer',
                icon: <FolderOpenIcon size={14} />,
                onClick: () => {
                  platform.openHearthInExplorer(hearthPath);
                },
              },
            ]);
          }}
          className="flex-1 min-w-0 h-full pl-3 pr-2 flex items-center gap-1.5 text-xs text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer group text-left"
          data-tooltip="Hearth switcher"
          data-tooltip-shortcut="Ctrl+Shift+O"
          data-tooltip-position="top"
          data-tooltip-anchor="[data-hearth-name]"
        >
          <ArrowUpDownIcon size={15} className="shrink-0 text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] transition-colors" />
          <span
            data-hearth-name
            style={{ overflowClipMargin: '4px' }}
            className="overflow-clip text-ellipsis whitespace-nowrap font-medium text-xs text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] transition-colors leading-tight"
          >
            {hearthName || 'Flint Hearth'}
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsHelpModalOpen(true)}
            title="Help & shortcuts (F1)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer"
          >
            <HelpCircleIcon size={16} />
          </button>
          <button
            onClick={() => {
              const { openSettingsInNewWindow } = useSettingsStore.getState();
              if (openSettingsInNewWindow && platform.isDesktop()) {
                platform.openSettingsWindow();
              } else {
                setIsSettingsOpen(true);
              }
            }}
            title="Settings (Ctrl+,)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer"
          >
            <Settings02Icon size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
});

