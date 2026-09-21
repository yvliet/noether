import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  FileAddIcon,
  FolderAddIcon,
  ArrowShrink02Icon,
  ArrowExpand01Icon,
  Search01Icon,
  HelpCircleIcon,
  Settings02Icon,
  ArrowUpDownIcon,
  Edit02Icon,
  FolderOpenIcon,
  CancelCircleIcon,
  Cancel01Icon,
  ClipboardPasteIcon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useFileClipboardStore } from '@/store/fileClipboardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useNoetherApp, useExtensionList, useFileTreeActions, useFileTreeSections, useSidebarTabs } from '@/core/app/AppContext';
import { FileTreeNode, getVisibleTreeItemIds } from '@/components/file-tree/FileTreeNode';
import { dragTooltipManager, NOTE_ICON_SVG, CANVAS_LAYOUT_SVG } from '@/lib/dragTooltip';

import { DocumentItem } from '@/types';
import { platform } from '@/lib/platform/platformAdapter';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { useSidebarDockStore } from '@/store/sidebarDockStore';
import { SidebarDockPane } from './SidebarDockPane';
import { SidebarSecondaryIconBar } from './SidebarSecondaryIconBar';
import { useActiveTabDrag } from '@/hooks/useTabReorder';
import {
  FileSortOrder,
  FILE_SORT_OPTIONS,
  FILE_SORT_OPTIONS as SORT_OPTIONS,
  sortDocuments,
} from '@/lib/sort';
import { CollapseAllButton } from '@/components/common/CollapseAllButton';
import { SortDropdown } from '@/components/common/SortDropdown';
import { SidebarActionHeader, SidebarActionButton } from '@/components/common/SidebarActionHeader';

export type { FileSortOrder };
export { SORT_OPTIONS, sortDocuments };

export const LeftSidebar: React.FC = React.memo(() => {
  const app = useNoetherApp();
  const extensionList = useExtensionList();
  const fileTreeActions = useFileTreeActions();
  const fileTreeSections = useFileTreeSections();
  const sidebarTabs = useSidebarTabs('left');

  const activeLeftView = useWorkspaceStore((s) => s.activeLeftView);
  const leftSidebarWidth = useWorkspaceStore((s) => s.leftSidebarWidth);
  const setLeftSidebarWidth = useWorkspaceStore((s) => s.setLeftSidebarWidth);
  const vaultName = useWorkspaceStore((s) => s.vaultName);
  const vaultPath = useWorkspaceStore((s) => s.vaultPath);
  const setIsSettingsOpen = useWorkspaceStore((s) => s.setIsSettingsOpen);
  const setIsVaultModalOpen = useWorkspaceStore((s) => s.setIsVaultModalOpen);
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

  const sortOrder = useWorkspaceStore((s) => s.fileSortOrder);
  const setSortOrder = useWorkspaceStore((s) => s.setFileSortOrder);
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isVerticalSplitResizing, setIsVerticalSplitResizing] = useState(false);
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
        (activeLeftView.startsWith('doc:') && it.id === activeLeftView) ||
        it.id.endsWith(`:${activeLeftView}`) ||
        (typeof activeLeftView === 'string' &&
          activeLeftView.includes(':') &&
          it.id === activeLeftView.split(':')[1])
    );
  }, [hasLeftTopItems, activeLeftView, leftTopDockItems]);

  const activeCustomTab = useMemo(() => {
    if (!hasLeftTopItems || !activeLeftView) return null;
    if (
      !leftTopDockItems.some(
        (it) =>
          it.id === activeLeftView ||
          it.extensionId === activeLeftView ||
          it.viewType === activeLeftView ||
          it.id.endsWith(`:${activeLeftView}`) ||
          (typeof activeLeftView === 'string' &&
            activeLeftView.includes(':') &&
            it.id === activeLeftView.split(':')[1])
      )
    )
      return null;
    return (
      sidebarTabs.find(
        (t) =>
          t.id === activeLeftView ||
          t.id.endsWith(`:${activeLeftView}`) ||
          (typeof activeLeftView === 'string' &&
            activeLeftView.includes(':') &&
            t.id === activeLeftView.split(':')[1])
      ) || null
    );
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

  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (resizeCleanupRef.current) {
        resizeCleanupRef.current();
      }
    };
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const cleanup = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      resizeCleanupRef.current = null;
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setLeftSidebarWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      cleanup();
    };

    resizeCleanupRef.current = cleanup;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [leftSidebarWidth, setLeftSidebarWidth]);


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

      // Ctrl+A / Cmd+A: Select all visible items (only when interacting with sidebar)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover') || sidebarEl.contains(document.activeElement));
        if (isInsideSidebar) {
          e.preventDefault();
          const visibleIds = getVisibleTreeItemIds();
          if (visibleIds.length > 0) {
            selectAll(visibleIds);
          }
        }
        return;
      }

      // Ctrl+C / Cmd+C: Copy selected item(s) to clipboard
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover') || sidebarEl.contains(document.activeElement));
        if (isInsideSidebar && currentSelected.length > 0) {
          e.preventDefault();
          useFileClipboardStore.getState().copy(currentSelected);
        }
        return;
      }

      // Ctrl+X / Cmd+X: Cut selected item(s) to clipboard
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover') || sidebarEl.contains(document.activeElement));
        if (isInsideSidebar && currentSelected.length > 0) {
          e.preventDefault();
          useFileClipboardStore.getState().cut(currentSelected);
        }
        return;
      }

      // Ctrl+V / Cmd+V: Paste items into selected folder or root
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover') || sidebarEl.contains(document.activeElement));
        if (isInsideSidebar) {
          const { mode, itemIds } = useFileClipboardStore.getState();
          let targetParentId: string | null = null;
          if (currentSelected.length > 0) {
            const anchorId = lastSelectedDocId || currentSelected[currentSelected.length - 1];
            const targetDoc = documents.find((d) => d.id === anchorId);
            if (targetDoc) {
              targetParentId = targetDoc.is_folder ? targetDoc.id : (targetDoc.parent_id || null);
            }
          }
          if (mode && itemIds.length > 0) {
            e.preventDefault();
            if (targetParentId) {
              useWorkspaceStore.getState().setFolderOpen(targetParentId, true);
            }
            useFileClipboardStore.getState().executePaste(targetParentId);
          } else if (platform.isDesktop()) {
            e.preventDefault();
            platform.readClipboardFiles().then(async (files) => {
              if (files && files.length > 0) {
                if (targetParentId) {
                  useWorkspaceStore.getState().setFolderOpen(targetParentId, true);
                }
                await useDocumentStore.getState().importExternalPaths(files, targetParentId);
              }
            });
          }
        }
        return;
      }

      // Ctrl+D / Cmd+D: Duplicate selected item(s)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover') || sidebarEl.contains(document.activeElement));
        if (isInsideSidebar && currentSelected.length > 0) {
          e.preventDefault();
          useDocumentStore.getState().duplicateDocuments(currentSelected);
        }
        return;
      }

      // F2: Trigger inline rename on active tree item
      if (e.key === 'F2' && currentSelected.length > 0) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover') || sidebarEl.contains(document.activeElement));
        if (isInsideSidebar) {
          e.preventDefault();
          useDocumentStore.getState().setEditingDocId(currentSelected[0]);
        }
        return;
      }

      // Enter: Open document or toggle folder expand/collapse
      if (e.key === 'Enter' && currentSelected.length === 1) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover') || sidebarEl.contains(document.activeElement));
        if (isInsideSidebar) {
          const targetDoc = documents.find((d) => d.id === currentSelected[0]);
          if (targetDoc) {
            e.preventDefault();
            if (targetDoc.is_folder) {
              const isOpen = useWorkspaceStore.getState().folderOpenState[targetDoc.id] !== false;
              useWorkspaceStore.getState().setFolderOpen(targetDoc.id, !isOpen);
            } else {
              setActiveDocumentById(targetDoc.id, { replaceCurrentTab: false });
            }
          }
        }
        return;
      }

      // ArrowRight: If folder closed → expand; if open → select first child
      if (e.key === 'ArrowRight' && currentSelected.length === 1 && !e.ctrlKey && !e.metaKey) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover'));
        if (isInsideSidebar) {
          const targetDoc = documents.find((d) => d.id === currentSelected[0]);
          if (targetDoc && targetDoc.is_folder) {
            e.preventDefault();
            const isOpen = useWorkspaceStore.getState().folderOpenState[targetDoc.id] !== false;
            if (!isOpen) {
              useWorkspaceStore.getState().setFolderOpen(targetDoc.id, true);
            } else {
              const anchorEl = document.getElementById(`noether-tree-item-${targetDoc.id}`);
              const visibleIds = getVisibleTreeItemIds(anchorEl);
              const currIdx = visibleIds.indexOf(targetDoc.id);
              if (currIdx >= 0 && currIdx + 1 < visibleIds.length) {
                selectSingleDoc(visibleIds[currIdx + 1]);
                const nextNode = document.getElementById(`noether-tree-item-${visibleIds[currIdx + 1]}`);
                if (nextNode) nextNode.scrollIntoView({ block: 'nearest' });
              }
            }
            return;
          }
        }
      }

      // ArrowLeft: If folder open → collapse; if closed folder or note → select parent folder
      if (e.key === 'ArrowLeft' && currentSelected.length === 1 && !e.ctrlKey && !e.metaKey) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover'));
        if (isInsideSidebar) {
          const targetDoc = documents.find((d) => d.id === currentSelected[0]);
          if (targetDoc) {
            e.preventDefault();
            const isOpen = targetDoc.is_folder && useWorkspaceStore.getState().folderOpenState[targetDoc.id] !== false;
            if (isOpen) {
              useWorkspaceStore.getState().setFolderOpen(targetDoc.id, false);
            } else if (targetDoc.parent_id) {
              selectSingleDoc(targetDoc.parent_id);
              const parentNode = document.getElementById(`noether-tree-item-${targetDoc.parent_id}`);
              if (parentNode) parentNode.scrollIntoView({ block: 'nearest' });
            }
            return;
          }
        }
      }

      // Home / End: Jump to first or last item in visible list
      if ((e.key === 'Home' || e.key === 'End') && currentSelected.length > 0 && !e.ctrlKey && !e.metaKey) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover'));
        if (isInsideSidebar) {
          e.preventDefault();
          const visibleIds = getVisibleTreeItemIds();
          if (visibleIds.length > 0) {
            const targetId = e.key === 'Home' ? visibleIds[0] : visibleIds[visibleIds.length - 1];
            if (e.shiftKey) {
              selectDocRange(targetId, visibleIds, false);
            } else {
              selectSingleDoc(targetId);
              const doc = documents.find((d) => d.id === targetId);
              if (doc && !doc.is_folder) {
                setActiveDocumentById(doc.id, { replaceCurrentTab: true });
              }
            }
            const targetNode = document.getElementById(`noether-tree-item-${targetId}`);
            if (targetNode) targetNode.scrollIntoView({ block: 'nearest' });
          }
          return;
        }
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

      // Delete / Backspace: Delete selected items (only when interacting with sidebar)
      if ((e.key === 'Delete' || e.key === 'Backspace') && currentSelected.length > 0) {
        const sidebarEl = document.querySelector('[data-sidebar="true"]');
        const isInsideSidebar = sidebarEl && (sidebarEl.contains(target) || sidebarEl.matches(':hover') || sidebarEl.contains(document.activeElement));
        if (isInsideSidebar) {
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
          const anchorEl = currentAnchor ? document.getElementById(`noether-tree-item-${currentAnchor}`) : null;
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
              setActiveDocumentById(doc.id, { replaceCurrentTab: true });
            }
          }

          const targetNode = document.getElementById(`noether-tree-item-${nextId}`);
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

  // System Clipboard Paste listener for external files
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const sidebarEl = document.querySelector('[data-sidebar="true"]');
      const isInsideSidebar =
        sidebarEl &&
        (sidebarEl.contains(target) ||
          sidebarEl.matches(':hover') ||
          sidebarEl.contains(document.activeElement));
      if (!isInsideSidebar) return;

      const { mode, itemIds } = useFileClipboardStore.getState();
      if (mode && itemIds.length > 0) return;

      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        e.stopPropagation();

        const currentSelected = useDocumentStore.getState().selectedDocIds;
        const lastSelected = useDocumentStore.getState().lastSelectedDocId;
        const docs = useDocumentStore.getState().documents;

        let targetParentId: string | null = null;
        if (currentSelected.length > 0) {
          const anchorId = lastSelected || currentSelected[currentSelected.length - 1];
          const targetDoc = docs.find((d) => d.id === anchorId);
          if (targetDoc) {
            targetParentId = targetDoc.is_folder ? targetDoc.id : (targetDoc.parent_id || null);
          }
        }

        await useDocumentStore.getState().importExternalFiles(files, targetParentId);
      } else if (platform.isDesktop()) {
        const osFiles = await platform.readClipboardFiles();
        if (osFiles && osFiles.length > 0) {
          e.preventDefault();
          e.stopPropagation();

          const currentSelected = useDocumentStore.getState().selectedDocIds;
          const lastSelected = useDocumentStore.getState().lastSelectedDocId;
          const docs = useDocumentStore.getState().documents;

          let targetParentId: string | null = null;
          if (currentSelected.length > 0) {
            const anchorId = lastSelected || currentSelected[currentSelected.length - 1];
            const targetDoc = docs.find((d) => d.id === anchorId);
            if (targetDoc) {
              targetParentId = targetDoc.is_folder ? targetDoc.id : (targetDoc.parent_id || null);
            }
          }

          await useDocumentStore.getState().importExternalPaths(osFiles, targetParentId);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Native Desktop Webview Drag & Drop Listener for external OS files
  useEffect(() => {
    if (!platform.isDesktop()) return;

    let activeHoveredRow: HTMLElement | null = null;
    let activeRootHovered = false;

    const clearDropHighlights = () => {
      if (activeHoveredRow) {
        activeHoveredRow.removeAttribute('data-drop-target');
        activeHoveredRow.classList.remove('!bg-[var(--noether-bg-card-hover)]', '!ring-1', '!ring-[var(--noether-accent,#eb584d)]');
        activeHoveredRow = null;
      }
      if (activeRootHovered) {
        setIsExternalDragOverRoot(false);
        activeRootHovered = false;
      }
    };

    const cachedPathsRef: { current: string[] } = { current: [] };

    const unlisten = platform.onWebviewDragDrop(async (event) => {
      if (event.type === 'enter') {
        const paths = event.paths || [];
        cachedPathsRef.current = paths;
        if (paths.length === 0) return;

        const pos = event.position || { x: 0, y: 0 };
        const dpr = window.devicePixelRatio || 1;
        const clientX = pos.x / dpr;
        const clientY = pos.y / dpr;

        const firstName = paths[0].split(/[/\\]/).pop() || 'File';
        const title = paths.length > 1 ? `${firstName} (+${paths.length - 1} more)` : firstName;
        const isCanvas = /\.canvas$/i.test(firstName);
        const iconSvg = isCanvas ? CANVAS_LAYOUT_SVG : NOTE_ICON_SVG;

        dragTooltipManager.show(title, 'Import file', iconSvg, clientX + 16, clientY + 16);
      } else if (event.type === 'over') {
        const pos = event.position || { x: 0, y: 0 };
        const dpr = window.devicePixelRatio || 1;
        const clientX = pos.x / dpr;
        const clientY = pos.y / dpr;

        dragTooltipManager.updatePosition(clientX + 16, clientY + 16);

        const el = document.elementFromPoint(clientX, clientY);
        const sidebarEl = el?.closest('[data-sidebar="true"]');

        if (sidebarEl) {
          const treeItemEl = el?.closest('[data-tree-item-id]') as HTMLElement | null;
          if (treeItemEl) {
            const isFolder = treeItemEl.getAttribute('data-is-folder') === 'true';
            const docId = treeItemEl.getAttribute('data-tree-item-id');
            const docs = useDocumentStore.getState().documents;
            const targetDoc = docs.find((d) => d.id === docId);

            if (isFolder) {
              dragTooltipManager.updateSubtitle(`Import into "${targetDoc?.title || 'Folder'}"`);
            } else {
              const parentFolder = targetDoc?.parent_id ? docs.find((d) => d.id === targetDoc.parent_id) : null;
              dragTooltipManager.updateSubtitle(parentFolder ? `Import into "${parentFolder.title}"` : 'Import into vault root');
            }

            if (activeHoveredRow !== treeItemEl) {
              if (activeHoveredRow) {
                activeHoveredRow.removeAttribute('data-drop-target');
                activeHoveredRow.classList.remove('!bg-[var(--noether-bg-card-hover)]', '!ring-1', '!ring-[var(--noether-accent,#eb584d)]');
              }
              activeHoveredRow = treeItemEl;
              activeHoveredRow.setAttribute('data-drop-target', 'true');
              activeHoveredRow.classList.add('!bg-[var(--noether-bg-card-hover)]', '!ring-1', '!ring-[var(--noether-accent,#eb584d)]');
            }
            if (activeRootHovered) {
              setIsExternalDragOverRoot(false);
              activeRootHovered = false;
            }
          } else {
            dragTooltipManager.updateSubtitle('Import into vault root');
            if (activeHoveredRow) {
              activeHoveredRow.removeAttribute('data-drop-target');
              activeHoveredRow.classList.remove('!bg-[var(--noether-bg-card-hover)]', '!ring-1', '!ring-[var(--noether-accent,#eb584d)]');
              activeHoveredRow = null;
            }
            if (!activeRootHovered) {
              setIsExternalDragOverRoot(true);
              activeRootHovered = true;
            }
          }
        } else {
          dragTooltipManager.updateSubtitle('Drop into Noether');
          clearDropHighlights();
        }
      } else if (event.type === 'leave') {
        dragTooltipManager.hide();
        clearDropHighlights();
        cachedPathsRef.current = [];
      } else if (event.type === 'drop') {
        dragTooltipManager.hide();
        clearDropHighlights();

        const paths = event.paths && event.paths.length > 0 ? event.paths : cachedPathsRef.current;
        cachedPathsRef.current = [];
        if (!paths || paths.length === 0) return;

        const pos = event.position || { x: 0, y: 0 };
        const dpr = window.devicePixelRatio || 1;
        const clientX = pos.x / dpr;
        const clientY = pos.y / dpr;

        const el = document.elementFromPoint(clientX, clientY);
        const sidebarEl = el?.closest('[data-sidebar="true"]');
        if (!sidebarEl) return;

        let targetParentId: string | null = null;
        const treeItemEl = el?.closest('[data-tree-item-id]');
        if (treeItemEl) {
          const docId = treeItemEl.getAttribute('data-tree-item-id');
          const isFolder = treeItemEl.getAttribute('data-is-folder') === 'true';
          if (isFolder) {
            targetParentId = docId;
          } else {
            const doc = useDocumentStore.getState().documents.find((d) => d.id === docId);
            targetParentId = doc?.parent_id || null;
          }
        }

        await useDocumentStore.getState().importExternalPaths(paths, targetParentId);
      }
    });

    return () => {
      unlisten();
      clearDropHighlights();
      dragTooltipManager.hide();
    };
  }, []);

  // Root Drag & Drop Handlers for External OS Files
  const [isExternalDragOverRoot, setIsExternalDragOverRoot] = useState(false);

  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setIsExternalDragOverRoot(true);
    }
  }, []);

  const handleRootDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsExternalDragOverRoot(false);
  }, []);

  const handleRootDrop = useCallback(async (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setIsExternalDragOverRoot(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        await useDocumentStore.getState().importExternalFiles(files, null);
      }
    }
  }, []);

  // Centralized tree-level event listener: replaces per-node window listeners across the tree
  useEffect(() => {
    const handleExpandFolder = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>;
      const targetId = customEvent.detail?.id;
      if (targetId) {
        useWorkspaceStore.getState().setFolderOpen(targetId, true);
      }
    };

    const handleRevealTreeItem = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>;
      const targetId = customEvent.detail?.id;
      if (!targetId) return;

      const ws = useWorkspaceStore.getState();
      ws.setActiveLeftView('files');
      ws.setIsLeftSidebarOpen(true);

      const docs = useDocumentStore.getState().documents;
      let curr = docs.find((d) => d.id === targetId);
      const ancestors: string[] = [];
      while (curr && curr.parent_id) {
        ancestors.push(curr.parent_id);
        curr = docs.find((d) => d.id === curr?.parent_id);
      }
      for (const parentFolderId of ancestors) {
        ws.setFolderOpen(parentFolderId, true);
      }

      setTimeout(() => {
        const domNode = document.getElementById(`noether-tree-item-${targetId}`);
        if (domNode) {
          domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
          domNode.classList.add('!bg-[#82691b]', '!text-white');
          setTimeout(() => {
            domNode.classList.remove('!bg-[#82691b]', '!text-white');
          }, 1800);
        }
      }, 80);
    };

    window.addEventListener('noether:expand-folder', handleExpandFolder);
    window.addEventListener('noether:reveal-tree-item', handleRevealTreeItem);

    return () => {
      window.removeEventListener('noether:expand-folder', handleExpandFolder);
      window.removeEventListener('noether:reveal-tree-item', handleRevealTreeItem);
    };
  }, []);

  // Pre-bucket documents by parent_id into a Map for O(1) child tree lookups
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, DocumentItem[]>();
    for (const d of documents) {
      const p = d.parent_id || null;
      const list = map.get(p);
      if (list) {
        list.push(d);
      } else {
        map.set(p, [d]);
      }
    }
    return map;
  }, [documents]);

  // Filter root documents (parent_id === null)
  const rootDocs = useMemo(() => {
    return sortDocuments(
      childrenMap.get(null) || [],
      sortOrder
    );
  }, [childrenMap, sortOrder]);

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
    const { selectedDocIds, documents } = useDocumentStore.getState();
    let targetParentId: string | null = null;
    if (selectedDocIds.length === 1) {
      const selectedDoc = documents.find((d) => d.id === selectedDocIds[0]);
      if (selectedDoc?.is_folder) {
        targetParentId = selectedDoc.id;
      } else if (selectedDoc?.parent_id) {
        targetParentId = selectedDoc.parent_id;
      }
    }
    if (targetParentId) {
      useWorkspaceStore.getState().setFolderOpen(targetParentId, true);
    }
    await createNewNote('Untitled', targetParentId);
  }, [setSearchQuery, createNewNote]);

  const { showContextMenu } = useAppContextMenu();

  const handleCreateFolder = useCallback(async () => {
    setSearchQuery('');
    const { selectedDocIds, documents } = useDocumentStore.getState();
    let targetParentId: string | null = null;
    if (selectedDocIds.length === 1) {
      const selectedDoc = documents.find((d) => d.id === selectedDocIds[0]);
      if (selectedDoc?.is_folder) {
        targetParentId = selectedDoc.id;
      } else if (selectedDoc?.parent_id) {
        targetParentId = selectedDoc.parent_id;
      }
    }
    if (targetParentId) {
      useWorkspaceStore.getState().setFolderOpen(targetParentId, true);
    }
    const newFolder = await createNewFolder('Untitled', targetParentId);
    if (newFolder) {
      useDocumentStore.getState().setEditingDocId(newFolder.id);
    }
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

    const clipboardMode = useFileClipboardStore.getState().mode;
    const clipboardCount = useFileClipboardStore.getState().itemIds.length;
    const canPaste = Boolean((clipboardMode && clipboardCount > 0) || platform.isDesktop());

    const rootContext = {
      item: null,
      selectedDocIds: [],
      isMulti: false,
      isRoot: true,
      app,
    };
    const customActions = app.fileContextMenus?.getActions(rootContext) ?? [];
    const customMenuItems: ContextMenuItem[] = customActions.map((action) => ({
      id: action.id,
      title: typeof action.title === 'function' ? action.title(rootContext) : action.title,
      icon: typeof action.icon === 'function' ? action.icon(rootContext) : action.icon,
      isDanger: action.isDanger,
      onClick: () => action.onClick(rootContext),
    }));

    const items: ContextMenuItem[] = [
      {
        id: 'root-new-note',
        title: 'New note',
        icon: <FileAddIcon size={14} />,
        shortcut: 'Ctrl+N',
        onClick: async () => {
          setSearchQuery('');
          await createNewNote('Untitled', null);
        },
      },
      {
        id: 'root-new-folder',
        title: 'New folder',
        icon: <FolderAddIcon size={14} />,
        onClick: async () => {
          setSearchQuery('');
          const nf = await createNewFolder('Untitled', null);
          if (nf) useDocumentStore.getState().setEditingDocId(nf.id);
        },
      },
      ...(customMenuItems.length > 0 ? customMenuItems : []),
      {
        id: 'root-paste',
        title: 'Paste',
        icon: <ClipboardPasteIcon size={14} />,
        shortcut: 'Ctrl+V',
        disabled: !canPaste,
        onClick: async () => {
          const { mode, itemIds } = useFileClipboardStore.getState();
          if (mode && itemIds.length > 0) {
            await useFileClipboardStore.getState().executePaste(null);
          } else if (platform.isDesktop()) {
            const files = await platform.readClipboardFiles();
            if (files && files.length > 0) {
              await useDocumentStore.getState().importExternalPaths(files, null);
            } else {
              showToast('No files in clipboard to paste', 'info');
            }
          }
        },
      },
      { type: 'separator' },
      {
        id: 'root-collapse-all',
        title: areAllFoldersCollapsed ? 'Expand all folders' : 'Collapse all folders',
        icon: areAllFoldersCollapsed ? <ArrowExpand01Icon size={14} /> : <ArrowShrink02Icon size={14} />,
        onClick: areAllFoldersCollapsed ? expandAllFolders : collapseAllFolders,
      },
      {
        id: 'root-show-in-explorer',
        title: 'Show in system explorer',
        icon: <FolderOpenIcon size={14} />,
        onClick: () => {
          if (platform.isDesktop()) {
            platform.openVaultInExplorer(vaultPath);
          } else {
            showToast('Vault root: ' + (vaultPath || 'local memory'), 'info');
          }
        },
      },
    ];

    showContextMenu(e, items, { scope: 'file-tree-root' });
  }, [createNewNote, createNewFolder, setSearchQuery, areAllFoldersCollapsed, expandAllFolders, collapseAllFolders, showContextMenu, clearSelection, vaultPath, showToast, app]);

  const activeDrag = useActiveTabDrag();

  return (
    <aside
      data-sidebar="true"
      data-sidebar-side="left"
      style={{
        width: `${leftSidebarWidth}px`,
        background: 'var(--noether-bg-sidebar-gradient, var(--noether-bg-sidebar))',
      }}
      className="noether-sidebar-left flex flex-col h-full pt-[41px] select-none shrink-0 relative border-r border-[var(--noether-border-base)]"
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
        <SidebarActionHeader>
          <SidebarActionButton
            onClick={handleCreateNote}
            title="New note (Ctrl+N)"
            icon={<FileAddIcon size={16} />}
          />
          <SidebarActionButton
            onClick={handleCreateFolder}
            title="New folder"
            icon={<FolderAddIcon size={16} />}
          />

          {/* Dynamic Extension File Tree Actions */}
          {fileTreeActions.map((action) => (
            <SidebarActionButton
              key={action.id}
              onClick={() => action.onClick(app)}
              title={action.title}
              icon={action.icon}
            />
          ))}

          {/* Sort Menu Dropdown */}
          <SortDropdown
            value={sortOrder}
            onChange={setSortOrder}
            options={SORT_OPTIONS}
            disabled={documents.length === 0}
          />

          {/* Collapse / Expand All Folders */}
          <CollapseAllButton
            isCollapsed={areAllFoldersCollapsed}
            onToggle={areAllFoldersCollapsed ? expandAllFolders : collapseAllFolders}
            disabled={folders.length === 0}
            collapsedTitle="Expand all folders"
            expandedTitle="Collapse all folders"
            disabledTitle="No folders to collapse or expand"
          />
        </SidebarActionHeader>
      )}

      {/* Top Search Header - Shown in search view (replaces top action toolbar) */}
      {isSearchActive && (
        <div className="pt-2 px-2 pb-1.5 flex flex-col gap-1.5">
          {/* Top Search Input Row */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)]">
              <Search01Icon size={13} className="text-[var(--noether-text-muted)] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-transparent outline-none flex-1 text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)] min-w-0"
              />
              <button
                type="button"
                onClick={() => setIsCaseSensitive((prev) => !prev)}
                title={isCaseSensitive ? 'Match case: ON' : 'Match case: OFF'}
                className={`px-1 py-0.5 rounded text-[11px] font-semibold leading-none cursor-pointer ${
                  isCaseSensitive
                    ? 'bg-[var(--noether-accent)] text-white'
                    : 'text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)]'
                }`}
              >
                Aa
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  className="w-4 h-4 flex items-center justify-center rounded text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer"
                >
                  <CancelCircleIcon size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Results Count & Sort Dropdown Row */}
          <div className="flex items-center justify-between px-1 text-xs text-[var(--noether-text-muted)] select-none">
            <span className="text-[11px]">
              {searchFilteredDocs.length} {searchFilteredDocs.length === 1 ? 'result' : 'results'}
            </span>
            <SortDropdown
              variant="text"
              value={sortOrder}
              onChange={setSortOrder}
              options={SORT_OPTIONS}
              disabled={searchFilteredDocs.length === 0}
            />
          </div>

          {/* Subtle separator line */}
          <div className="border-b border-[var(--noether-border-base)] -mx-2 mt-0.5 opacity-60" />
        </div>
      )}

      {/* Main Top Content Area */}
      <div
        data-sidebar-root="true"
        style={hasBottomSplit ? { flex: splitRatioLeft } : { flex: 1 }}
        onPointerDown={handleBackgroundClick}
        onClick={handleBackgroundClick}
        onContextMenu={handleRootContextMenu}
        onDragOver={handleRootDragOver}
        onDragEnter={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
        className={`min-h-0 flex flex-col ${
          isExternalDragOverRoot
            ? 'ring-1 ring-inset ring-[var(--noether-accent,#eb584d)]/60 bg-[var(--noether-accent,#eb584d)]/5 '
            : ''
        }${
          isDockedTop || activeCustomTab
            ? 'overflow-hidden'
            : 'overflow-y-auto px-2 py-1 custom-scrollbar'
        }`}
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
            <div className="px-2 py-4 text-xs text-[var(--noether-text-muted)] select-none">
              No matches found.
            </div>
          ) : (
            <div data-tree-section="search-results" className="flex-1 flex flex-col gap-0.5">
              {searchFilteredDocs.map((doc) => (
                <FileTreeNode key={doc.id} item={doc} allDocs={documents} childrenMap={childrenMap} sortOrder={sortOrder} />
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

            {/* Standard Vault Root Documents & Folders */}
            <div data-tree-section="vault-files" className="flex flex-col gap-0.5">
              {rootDocs.map((doc) => (
                <FileTreeNode key={doc.id} item={doc} allDocs={documents} childrenMap={childrenMap} sortOrder={sortOrder} />
              ))}
            </div>
            {rootDocs.length === 0 && fileTreeSections.length === 0 && (
              <div className="text-center py-8 text-xs text-[var(--noether-text-muted)] leading-relaxed">
                No files in vault. Click{' '}
                <FileAddIcon
                  size={14}
                  className="inline-block align-[-2.5px]"
                />{' '}
                above to create one.
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
                isVerticalSplitResizing ? 'bg-white' : 'bg-[var(--noether-border-base)] group-hover:bg-white/50'
              }`}
            />
          </div>

          <SidebarSecondaryIconBar zone="left-bottom" />

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <SidebarDockPane zone="left-bottom" />
          </div>
        </div>
      )}


      {/* Bottom Vault Footer */}
      <div className="h-10 pr-2 flex items-center justify-between text-xs text-[var(--noether-text-muted)] bg-[var(--noether-bg-sidebar)] border-t border-[var(--noether-border-base)]">
        <button
          onClick={() => setIsVaultModalOpen(true)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(e, [
              {
                id: 'open-switcher',
                title: 'Open vault switcher',
                icon: <ArrowUpDownIcon size={14} />,
                onClick: () => setIsVaultModalOpen(true),
              },
              { type: 'separator' },
              {
                id: 'reveal-in-explorer',
                title: 'Reveal vault in file explorer',
                icon: <FolderOpenIcon size={14} />,
                onClick: () => {
                  platform.openVaultInExplorer(vaultPath);
                },
              },
            ]);
          }}
          className="flex-1 min-w-0 h-full pl-3 pr-2 flex items-center gap-1.5 text-xs text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer group text-left"
          data-tooltip="Vault switcher"
          data-tooltip-shortcut="Ctrl+Shift+O"
          data-tooltip-position="top"
          data-tooltip-anchor="[data-vault-name]"
        >
          <ArrowUpDownIcon size={15} className="shrink-0 text-[var(--noether-text-muted)] group-hover:text-[var(--noether-text-primary)]" />
          <span
            data-vault-name
            style={{ overflowClipMargin: '4px' }}
            className="overflow-clip text-ellipsis whitespace-nowrap font-medium text-xs text-[var(--noether-text-muted)] group-hover:text-[var(--noether-text-primary)] leading-tight"
          >
            {vaultName || 'Noether vault'}
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => platform.openHelpWindow()}
            title="Help (F1)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
          >
            <HelpCircleIcon size={16} />
          </button>
          <button
            onClick={() => {
              platform.openSettingsWindow();
            }}
            title="Settings (Ctrl+,)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
          >
            <Settings02Icon size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
});

