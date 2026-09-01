import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  Delete02Icon,
  Edit02Icon,
  FileAddIcon,
  FolderAddIcon,
  File01Icon,
  Folder01Icon,
  SplitRightIcon,
  Copy01Icon,
  Bookmark01Icon,
  ExternalLinkIcon,
  FolderOpenIcon,
  Download01Icon,
  MoveFileIcon,
} from '@/components/common/Icons';
import { DocumentItem } from '@/types';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getUniqueTitleForMove, getDocumentPath } from '@/lib/db/documents';
import { FileSortOrder, sortDocuments } from '@/components/layout/LeftSidebar';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { platform } from '@/lib/platform/platformAdapter';
import { useFileTreeDecorators, useFlintApp } from '@/core/app/AppContext';
import { TreeNodeRow, TreeNodeAction } from './TreeNodeRow';
import { TreeNodeRenameInput } from './TreeNodeRenameInput';
import { useTreeDragDrop } from './useTreeDragDrop';

export function getVisibleTreeItemIds(targetEl?: HTMLElement | null): string[] {
  if (typeof document === 'undefined') return [];
  const sectionContainer =
    targetEl?.closest('[data-tree-section]') ||
    document.querySelector('[data-tree-section="hearth-files"]') ||
    document.querySelector('[data-tree-section="vault-files"]') ||
    document.querySelector('[data-tree-section="search-results"]') ||
    document.querySelector('[data-sidebar-root]');

  if (!sectionContainer) return [];

  const elements = sectionContainer.querySelectorAll('[data-tree-item-id]');
  const ids: string[] = [];
  elements.forEach((el) => {
    const id = el.getAttribute('data-tree-item-id');
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  });
  return ids;
}

export interface FileTreeNodeProps {
  item: DocumentItem;
  level?: number;
  allDocs: DocumentItem[];
  sortOrder?: FileSortOrder;
}

const FileTreeNodeComponent: React.FC<FileTreeNodeProps> = ({
  item,
  level = 0,
  allDocs,
  sortOrder = 'alphabetical',
}) => {
  const isFolder = !!item.is_folder;
  const isSelected = useDocumentStore((s) => (isFolder ? s.selectedDocIds.length > 1 && s.selectedDocIds.includes(item.id) : s.selectedDocIds.includes(item.id)));
  const isMultiSelected = useDocumentStore((s) => s.selectedDocIds.length > 1 && s.selectedDocIds.includes(item.id));
  const isStoreEditing = useDocumentStore((s) => s.editingDocId === item.id);
  const activeDocId = useDocumentStore((s) => s.activeDocument?.id);

  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const createNewFolder = useDocumentStore((s) => s.createNewFolder);
  const renameDocument = useDocumentStore((s) => s.renameDocument);
  const moveDocument = useDocumentStore((s) => s.moveDocument);
  const moveDocuments = useDocumentStore((s) => s.moveDocuments);
  const removeDocument = useDocumentStore((s) => s.removeDocument);
  const removeDocuments = useDocumentStore((s) => s.removeDocuments);
  const toggleBookmark = useDocumentStore((s) => s.toggleBookmark);
  const toggleBookmarkDocuments = useDocumentStore((s) => s.toggleBookmarkDocuments);
  const setEditingDocId = useDocumentStore((s) => s.setEditingDocId);
  const selectSingleDoc = useDocumentStore((s) => s.selectSingleDoc);
  const toggleDocSelection = useDocumentStore((s) => s.toggleDocSelection);
  const selectDocRange = useDocumentStore((s) => s.selectDocRange);

  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const openInputDialog = useWorkspaceStore((s) => s.openInputDialog);
  const hearthPath = useWorkspaceStore((s) => s.hearthPath || s.vaultPath);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const collapseAllCount = useWorkspaceStore((s) => s.collapseAllCount);
  const openSplitTab = useWorkspaceStore((s) => s.openSplitTab);
  const openTab = useWorkspaceStore((s) => s.openTab);
  const folderPickerPrompt = useWorkspaceStore((s) => s.folderPickerPrompt);
  const isPickingFolder = !!folderPickerPrompt?.isOpen;

  const { showContextMenu } = useAppContextMenu();

  const folderOpenState = useWorkspaceStore((s) => s.folderOpenState);
  const setFolderOpen = useWorkspaceStore((s) => s.setFolderOpen);
  const isOpen = isFolder ? (folderOpenState[item.id] !== undefined ? folderOpenState[item.id] : true) : true;

  const setIsOpen = useCallback(
    (openOrUpdater: boolean | ((prev: boolean) => boolean)) => {
      const nextVal = typeof openOrUpdater === 'function' ? openOrUpdater(isOpen) : openOrUpdater;
      setFolderOpen(item.id, nextVal);
    },
    [item.id, isOpen, setFolderOpen]
  );

  const [localIsEditing, setLocalIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const saveTimerRef = useRef<any>(null);
  const originalTitleRef = useRef(item.title);
  const prevIsEditingRef = useRef(false);

  const app = useFlintApp();
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) || null, [tabs, activeTabId]);

  const decorators = useFileTreeDecorators();
  const isHighlightSuppressed = useMemo(() => {
    if (decorators.length === 0) return false;
    const ctx = { doc: item, activeTab, app };
    return decorators.some((d) => d.suppressHighlight?.(item, ctx));
  }, [decorators, item, activeTab, app]);

  const isEditingSuppressed = useMemo(() => {
    if (decorators.length === 0) return false;
    const ctx = { doc: item, activeTab, app };
    return decorators.some((d) => d.suppressEditing?.(item, ctx));
  }, [decorators, item, activeTab, app]);

  const isEditing = (!isEditingSuppressed && isStoreEditing) || localIsEditing;

  const isActive = useWorkspaceStore((s) => {
    if (isFolder || isHighlightSuppressed) return false;
    const currentMode = s.mainViewMode;
    if (currentMode !== 'document' && currentMode !== undefined) return false;
    if (s.isSplitView && s.activePane === 'split') {
      const splitTab = s.splitTabs.find((t) => t.id === s.splitActiveTabId);
      const docId = splitTab ? splitTab.document_id : s.splitActiveDocumentId;
      return docId === item.id;
    }
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    const docId = tab ? tab.document_id : activeDocId;
    return docId === item.id;
  });

  const isCanvas = item.doc_type === 'canvas' || item.title.toLowerCase().endsWith('.canvas');
  const typeBadge = isCanvas ? 'CANVAS' : null;

  const sortedChildren = useMemo(() => {
    const children = allDocs.filter((d) => d.parent_id === item.id);
    return sortDocuments(children, sortOrder);
  }, [allDocs, item.id, sortOrder]);

  const isDuplicateName = useMemo(() => {
    if (!isEditing) return false;
    const trimmed = editTitle.trim().toLowerCase();
    if (!trimmed || trimmed === originalTitleRef.current.trim().toLowerCase()) return false;
    return allDocs.some(
      (d) =>
        d.id !== item.id &&
        !!d.is_folder === isFolder &&
        (d.parent_id || null) === (item.parent_id || null) &&
        d.title.trim().toLowerCase() === trimmed
    );
  }, [isEditing, editTitle, allDocs, item.id, item.parent_id, isFolder]);

  // Keep edit title in sync
  useEffect(() => {
    if (isEditing && !prevIsEditingRef.current) {
      setEditTitle(item.title);
      originalTitleRef.current = item.title;
    } else if (!isEditing) {
      setEditTitle(item.title);
      originalTitleRef.current = item.title;
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, item.title]);

  // Collapse all trigger
  useEffect(() => {
    if (collapseAllCount > 0 && isFolder) {
      setIsOpen(false);
    }
  }, [collapseAllCount, isFolder]);

  // Expand on external event
  useEffect(() => {
    if (!isFolder) return;
    const handleExpand = (e: any) => {
      if (e.detail?.id === item.id) {
        setIsOpen(true);
      }
    };
    window.addEventListener('flint:expand-folder', handleExpand);
    return () => window.removeEventListener('flint:expand-folder', handleExpand);
  }, [isFolder, item.id]);

  // Reveal tree item event
  useEffect(() => {
    const handleReveal = (e: any) => {
      const targetId = e.detail?.id;
      if (!targetId) return;

      if (targetId === item.id) {
        setIsOpen(true);
        setIsHighlighted(true);
        setTimeout(() => {
          const domNode = document.getElementById(`flint-tree-item-${item.id}`);
          if (domNode) {
            domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 60);
        setTimeout(() => {
          setIsHighlighted(false);
        }, 1800);
      } else if (isFolder) {
        let curr = allDocs.find((d) => d.id === targetId);
        let isAncestor = false;
        while (curr) {
          if (curr.parent_id === item.id) {
            isAncestor = true;
            break;
          }
          curr = allDocs.find((d) => d.id === curr?.parent_id);
        }
        if (isAncestor) {
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('flint:reveal-tree-item', handleReveal as EventListener);
    return () => window.removeEventListener('flint:reveal-tree-item', handleReveal as EventListener);
  }, [item.id, isFolder, allDocs]);

  // Auto-expand folder only when active document explicitly changes during user navigation
  const prevActiveDocIdRef = useRef<string | null>(activeDocId || null);
  useEffect(() => {
    if (!isFolder) return;
    const checkDescendant = (docId: string | null | undefined): boolean => {
      if (!docId) return false;
      let curr = allDocs.find((d) => d.id === docId);
      while (curr) {
        if (curr.parent_id === item.id) return true;
        curr = allDocs.find((d) => d.id === curr?.parent_id);
      }
      return false;
    };

    if (prevActiveDocIdRef.current !== activeDocId) {
      prevActiveDocIdRef.current = activeDocId || null;
      if (activeDocId && checkDescendant(activeDocId)) {
        setIsOpen(true);
      }
    }
  }, [isFolder, activeDocId, allDocs, item.id, setIsOpen]);

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // Folder Picker Mode: clicking a folder chooses it
      if (isPickingFolder) {
        if (isFolder && folderPickerPrompt) {
          const folderPath = getDocumentPath(item, allDocs);
          const onSelect = folderPickerPrompt.onSelect;
          useWorkspaceStore.setState({ folderPickerPrompt: null });
          onSelect(folderPath, item);
        }
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (isShift) {
        e.preventDefault();
        if (typeof window !== 'undefined' && window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
        const visibleIds = getVisibleTreeItemIds(e.currentTarget as HTMLElement);
        selectDocRange(item.id, visibleIds, isCtrl);
        return;
      }

      if (isCtrl) {
        toggleDocSelection(item.id);
        return;
      }

      if (isFolder) {
        setIsOpen(!isOpen);
        if (useDocumentStore.getState().selectedDocIds.length <= 1) {
          useDocumentStore.setState({ selectedDocIds: [] });
        }
      } else {
        selectSingleDoc(item.id);
        openTab(item.id, item.title);
      }
    },
    [isPickingFolder, isFolder, folderPickerPrompt, item, allDocs, isOpen, openTab, selectDocRange, selectSingleDoc, toggleDocSelection, setIsOpen]
  );

  const handleSaveRename = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (isDuplicateName) {
      if (isStoreEditing) setEditingDocId(null);
      setLocalIsEditing(false);
      setEditTitle(originalTitleRef.current);
      return;
    }

    const trimmed = editTitle.trim();
    if (isStoreEditing) setEditingDocId(null);
    setLocalIsEditing(false);

    if (trimmed && trimmed !== originalTitleRef.current) {
      originalTitleRef.current = trimmed;
      await renameDocument(item.id, trimmed);
    } else {
      setEditTitle(originalTitleRef.current);
    }
  }, [isDuplicateName, editTitle, isStoreEditing, item.id, renameDocument, setEditingDocId]);

  const handleCancelRename = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (isStoreEditing) setEditingDocId(null);
    setLocalIsEditing(false);
    setEditTitle(originalTitleRef.current);
  }, [isStoreEditing, setEditingDocId]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const currentSelectedIds = useDocumentStore.getState().selectedDocIds;
      const isMulti = currentSelectedIds.includes(item.id) && currentSelectedIds.length > 1;

      if (isMulti) {
        openConfirmDialog({
          title: `Delete ${currentSelectedIds.length} items?`,
          message: `Are you sure you want to delete these ${currentSelectedIds.length} items? They will be permanently deleted from your Hearth.`,
          confirmText: 'Delete all',
          isDanger: true,
          onConfirm: async () => {
            await removeDocuments(currentSelectedIds);
          },
        });
      } else {
        openConfirmDialog({
          title: `Delete ${isFolder ? 'Folder' : 'File'}`,
          message: `Are you sure you want to delete "${item.title}"? ${
            isFolder ? 'All contents inside this folder will also be deleted.' : 'It will be permanently deleted from your Hearth.'
          }`,
          confirmText: 'Delete',
          isDanger: true,
          onConfirm: async () => {
            await removeDocument(item.id);
          },
        });
      }
    },
    [isFolder, item.id, item.title, openConfirmDialog, removeDocument, removeDocuments]
  );

  const handleCopyPath = useCallback(
    (type: 'absolute' | 'relative') => {
      const relPath = getDocumentPath(item, allDocs);
      if (type === 'relative') {
        navigator.clipboard.writeText(relPath);
        showToast('Relative path copied to clipboard', 'info');
      } else {
        const full = hearthPath ? `${hearthPath}/${relPath}`.replace(/\/+/g, '/') : relPath;
        navigator.clipboard.writeText(full);
        showToast('Absolute path copied to clipboard', 'info');
      }
    },
    [allDocs, item, showToast, hearthPath]
  );

  const executeMoveToTarget = useCallback(
    async (targetParentId: string | null) => {
      let targetTitle = 'root';
      if (targetParentId) {
        const targetFolder = allDocs.find((d) => d.id === targetParentId);
        targetTitle = targetFolder?.title || 'folder';
      }

      const performMove = async (proposedTitle?: string) => {
        const result = await moveDocument(item.id, targetParentId);
        if (result.success) {
          if (targetParentId) {
            window.dispatchEvent(new CustomEvent('flint:expand-folder', { detail: { id: targetParentId } }));
          }
          const movedTitle = result.newTitle || proposedTitle || item.title;
          if (targetParentId) {
            showToast(`Moved "${movedTitle}" into "${targetTitle}"`, 'success');
          } else {
            showToast(`Moved "${movedTitle}" to root`, 'success');
          }
        } else {
          showToast(result.error || 'Failed to move item', 'warning');
        }
      };

      const targetTitleLower = item.title.trim().toLowerCase();
      const hasDuplicate = allDocs.some(
        (d) =>
          d.id !== item.id &&
          !!d.is_folder === isFolder &&
          (d.parent_id || null) === (targetParentId || null) &&
          d.title.trim().toLowerCase() === targetTitleLower
      );

      if (hasDuplicate) {
        const candidateTitle = getUniqueTitleForMove(item.title, targetParentId, allDocs, item.id);
        const { skipRenameConfirmation, setSkipRenameConfirmation } = useSettingsStore.getState();

        if (skipRenameConfirmation) {
          await performMove(candidateTitle);
        } else {
          const typeLabel = isFolder ? 'Folder' : 'File';
          openConfirmDialog({
            title: `${typeLabel} already exists`,
            message: `A ${typeLabel.toLowerCase()} named “${item.title}” already exists in ${
              targetParentId ? `“${targetTitle}”` : 'Hearth root'
            }. Would you like to rename it to “${candidateTitle}”?`,
            subtext: `It will be renamed to “${candidateTitle}” and moved.`,
            confirmText: 'Rename and move',
            isDanger: false,
            onDontAskAgain: () => {
              setSkipRenameConfirmation(true);
            },
            onConfirm: async () => {
              await performMove(candidateTitle);
            },
          });
        }
      } else {
        await performMove();
      }
    },
    [allDocs, isFolder, item.id, item.title, moveDocument, openConfirmDialog, showToast]
  );

  // Drag & Drop Engine Hook
  const {
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
    isBeingDragged,
    isDropTarget,
  } = useTreeDragDrop({
    item,
    isEditing,
    onStandardDrop: async (targetParentId, isMultiDrag, currentSelectedIds) => {
      if (isMultiDrag) {
        const res = await moveDocuments(currentSelectedIds, targetParentId);
        if (res.success) {
          if (targetParentId) {
            const targetFolder = allDocs.find((d) => d.id === targetParentId);
            window.dispatchEvent(new CustomEvent('flint:expand-folder', { detail: { id: targetParentId } }));
            showToast(`Moved ${res.movedCount} items into “${targetFolder?.title || 'folder'}”`, 'success');
          } else {
            showToast(`Moved ${res.movedCount} items to root`, 'success');
          }
        } else if (res.error) {
          showToast(res.error, 'warning');
        }
      } else {
        if (targetParentId) {
          await executeMoveToTarget(targetParentId);
        } else if (item.parent_id) {
          await executeMoveToTarget(null);
        }
      }
    },
  });

  // Action Buttons
  const actions: TreeNodeAction[] = useMemo(() => {
    if (isFolder) {
      return [
        {
          id: 'new-note',
          title: 'New note',
          icon: <FileAddIcon size={12} />,
          onClick: async () => {
            setIsOpen(true);
            const newDoc = await createNewNote('Untitled', item.id);
            if (newDoc) {
              openTab(newDoc.id, newDoc.title);
              setActiveDocumentById(newDoc.id);
              setEditingDocId(newDoc.id);
            }
          },
        },
        {
          id: 'new-folder',
          title: 'New folder',
          icon: <FolderAddIcon size={12} />,
          onClick: async () => {
            setIsOpen(true);
            const newFolder = await createNewFolder('New folder', item.id);
            if (newFolder) {
              setEditingDocId(newFolder.id);
            }
          },
        },
        {
          id: 'rename',
          title: 'Rename',
          icon: <Edit02Icon size={12} />,
          onClick: () => setLocalIsEditing(true),
        },
        {
          id: 'delete',
          title: 'Delete',
          icon: <Delete02Icon size={12} />,
          isDanger: true,
          onClick: handleDelete,
        },
      ];
    }

    return [
      {
        id: 'rename',
        title: 'Rename',
        icon: <Edit02Icon size={12} />,
        onClick: () => setLocalIsEditing(true),
      },
      {
        id: 'delete',
        title: 'Delete',
        icon: <Delete02Icon size={12} />,
        isDanger: true,
        onClick: handleDelete,
      },
    ];
  }, [createNewFolder, createNewNote, handleDelete, isFolder, item.id, openTab, setActiveDocumentById, setEditingDocId]);

  // Context Menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentSelectedIds = useDocumentStore.getState().selectedDocIds;
      if (!currentSelectedIds.includes(item.id)) {
        selectSingleDoc(item.id);
      }

      const isMulti = currentSelectedIds.includes(item.id) && currentSelectedIds.length > 1;

      if (isMulti) {
        const items: ContextMenuItem[] = [
          {
            id: 'multi-bookmark',
            title: `Bookmark ${currentSelectedIds.length} items`,
            icon: <Bookmark01Icon size={14} />,
            onClick: () => toggleBookmarkDocuments(currentSelectedIds),
          },
          {
            id: 'multi-move',
            title: `Move ${currentSelectedIds.length} items to...`,
            icon: <MoveFileIcon size={14} />,
            onClick: () => {
              const folders = allDocs.filter((d) => d.is_folder && !currentSelectedIds.includes(d.id));
              openInputDialog({
                title: `Move ${currentSelectedIds.length} items to folder:`,
                placeholder: 'Folder path or name (leave empty for root)',
                confirmText: 'Move',
                onConfirm: async (folderPath) => {
                  let targetParentId: string | null = null;
                  if (folderPath.trim()) {
                    const targetFolder = folders.find((f) => getDocumentPath(f, allDocs).toLowerCase() === folderPath.trim().toLowerCase());
                    if (targetFolder) targetParentId = targetFolder.id;
                  }
                  await moveDocuments(currentSelectedIds, targetParentId);
                },
              });
            },
          },
          { type: 'separator' },
          {
            id: 'multi-delete',
            title: `Delete ${currentSelectedIds.length} items`,
            icon: <Delete02Icon size={14} />,
            isDanger: true,
            onClick: () => {
              openConfirmDialog({
                title: `Delete ${currentSelectedIds.length} items?`,
                message: `Are you sure you want to delete these ${currentSelectedIds.length} items? They will be permanently deleted from your Hearth.`,
                confirmText: 'Delete all',
                isDanger: true,
                onConfirm: async () => {
                  await removeDocuments(currentSelectedIds);
                },
              });
            },
          },
        ];
        showContextMenu(e, items, { scope: 'file-tree-multi', data: { selectedIds: currentSelectedIds } });
        return;
      }

      if (isFolder) {
        const items: ContextMenuItem[] = [
          {
            id: 'new-note',
            title: 'New note',
            icon: <FileAddIcon size={14} />,
            onClick: async () => {
              setIsOpen(true);
              const newDoc = await createNewNote('Untitled', item.id);
              if (newDoc) {
                openTab(newDoc.id, newDoc.title);
                setActiveDocumentById(newDoc.id);
                setEditingDocId(newDoc.id);
              }
            },
          },
          {
            id: 'new-folder',
            title: 'New folder',
            icon: <FolderAddIcon size={14} />,
            onClick: async () => {
              setIsOpen(true);
              const newFolder = await createNewFolder('New folder', item.id);
              if (newFolder) {
                setEditingDocId(newFolder.id);
              }
            },
          },
          { type: 'separator' },
          {
            id: 'rename',
            title: 'Rename',
            icon: <Edit02Icon size={14} />,
            onClick: () => setLocalIsEditing(true),
          },
          {
            id: 'copy-path',
            title: 'Copy relative path',
            icon: <Copy01Icon size={14} />,
            onClick: () => handleCopyPath('relative'),
          },
          {
            id: 'copy-abs-path',
            title: 'Copy absolute path',
            icon: <Copy01Icon size={14} />,
            onClick: () => handleCopyPath('absolute'),
          },
          { type: 'separator' },
          {
            id: 'bookmark',
            title: item.is_bookmarked ? 'Remove bookmark' : 'Bookmark',
            icon: <Bookmark01Icon size={14} />,
            onClick: () => toggleBookmark(item.id),
          },
          {
            id: 'delete',
            title: 'Delete',
            icon: <Delete02Icon size={14} />,
            isDanger: true,
            onClick: () => handleDelete({ stopPropagation: () => {} } as React.MouseEvent),
          },
        ];
        showContextMenu(e, items, { scope: 'file-tree', data: item });
      } else {
        const items: ContextMenuItem[] = [
          {
            id: 'open-tab',
            title: 'Open in new tab',
            icon: <ExternalLinkIcon size={14} />,
            onClick: () => {
              openTab(item.id, item.title);
              setActiveDocumentById(item.id);
            },
          },
          {
            id: 'open-split',
            title: 'Open to the right',
            icon: <SplitRightIcon size={14} />,
            onClick: () => {
              openSplitTab(item.id, item.title);
            },
          },
          { type: 'separator' },
          {
            id: 'rename',
            title: 'Rename...',
            icon: <Edit02Icon size={14} />,
            onClick: () => setLocalIsEditing(true),
          },
          {
            id: 'copy-path',
            title: 'Copy relative path',
            icon: <Copy01Icon size={14} />,
            onClick: () => handleCopyPath('relative'),
          },
          {
            id: 'copy-abs-path',
            title: 'Copy absolute path',
            icon: <Copy01Icon size={14} />,
            onClick: () => handleCopyPath('absolute'),
          },
          { type: 'separator' },
          {
            id: 'bookmark',
            title: item.is_bookmarked ? 'Remove bookmark' : 'Bookmark',
            icon: <Bookmark01Icon size={14} />,
            onClick: () => toggleBookmark(item.id),
          },
          {
            id: 'move-to',
            title: 'Move file to...',
            icon: <MoveFileIcon size={14} />,
            onClick: () => {
              const folders = allDocs.filter((d) => d.is_folder && d.id !== item.id);
              openInputDialog({
                title: `Move "${item.title}" to folder:`,
                placeholder: 'Folder path or name (leave empty for root)',
                confirmText: 'Move',
                onConfirm: async (folderPath) => {
                  let targetParentId: string | null = null;
                  if (folderPath.trim()) {
                    const targetFolder = folders.find((f) => getDocumentPath(f, allDocs).toLowerCase() === folderPath.trim().toLowerCase());
                    if (targetFolder) targetParentId = targetFolder.id;
                  }
                  await executeMoveToTarget(targetParentId);
                },
              });
            },
          },
          {
            id: 'show-in-explorer',
            title: 'Show in system explorer',
            icon: <FolderOpenIcon size={14} />,
            onClick: () => {
              if (platform.isDesktop()) {
                const openFn = platform.openHearthInExplorer || platform.openVaultInExplorer;
                openFn(hearthPath);
              } else {
                showToast('Hearth folder: ' + (hearthPath || 'local memory'), 'info');
              }
            },
          },
          {
            id: 'export-pdf',
            title: 'Export to PDF...',
            icon: <Download01Icon size={14} />,
            onClick: () => {
              window.print();
            },
          },
          { type: 'separator' },
          {
            id: 'delete',
            title: 'Delete file',
            icon: <Delete02Icon size={14} />,
            isDanger: true,
            onClick: () => handleDelete({ stopPropagation: () => {} } as React.MouseEvent),
          },
        ];
        showContextMenu(e, items, { scope: 'file-tree', data: item });
      }
    },
    [allDocs, createNewFolder, createNewNote, executeMoveToTarget, handleCopyPath, handleDelete, isFolder, item, moveDocuments, openConfirmDialog, openInputDialog, openSplitTab, openTab, removeDocuments, selectSingleDoc, setActiveDocumentById, showContextMenu, showToast, toggleBookmark, toggleBookmarkDocuments, hearthPath]
  );

  return (
    <TreeNodeRow
      id={item.id}
      level={level}
      isFolder={isFolder}
      isOpen={isOpen}
      isSelected={isHighlightSuppressed ? false : isSelected}
      isMultiSelected={isHighlightSuppressed ? false : isMultiSelected}
      isActive={isActive}
      isHighlighted={isHighlighted}
      isBeingDragged={isBeingDragged}
      isDropTarget={isDropTarget}
      isEditing={isEditing}
      isDisabled={isPickingFolder && !isFolder}
      isFolderPickerTarget={isPickingFolder && isFolder}
      title={item.title}
      typeBadge={typeBadge}
      icon={
        isFolder ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="w-4 h-4 flex items-center justify-center text-[#777777] group-hover:text-[#dcddde] hover:text-white shrink-0 transition-colors"
          >
            {isOpen ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
          </button>
        ) : (
          <div className="w-4 h-4 shrink-0" />
        )
      }
      renameInput={
        <TreeNodeRenameInput
          value={editTitle}
          onChange={(val) => {
            setEditTitle(val);
          }}
          onSubmit={handleSaveRename}
          onCancel={handleCancelRename}
          errorMessage={isDuplicateName ? `${isFolder ? 'Folder' : 'File'} already exists` : null}
        />
      }
      actions={actions}
      onSelect={handleSelect}
      onDoubleClick={(e) => {
        if (isPickingFolder) return;
        e.stopPropagation();
        setLocalIsEditing(true);
      }}
      onContextMenu={isPickingFolder ? undefined : handleContextMenu}
      onPointerDown={isPickingFolder ? undefined : handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {isFolder && sortedChildren.length > 0 && (
        <>
          {sortedChildren.map((child) => (
            <FileTreeNode
              key={child.id}
              item={child}
              level={level + 1}
              allDocs={allDocs}
              sortOrder={sortOrder}
            />
          ))}
        </>
      )}
    </TreeNodeRow>
  );
};

export const FileTreeNode: React.FC<FileTreeNodeProps> = React.memo(FileTreeNodeComponent);

FileTreeNode.displayName = 'FileTreeNode';
