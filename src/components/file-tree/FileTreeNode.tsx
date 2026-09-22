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
  SplitDownIcon,
  Copy01Icon,
  ScissorIcon,
  ClipboardPasteIcon,
  Link01Icon,
  ExternalLinkIcon,
  FolderOpenIcon,
  Download01Icon,
  MoveFileIcon,
  ArrowShrink02Icon,
  ArrowExpand01Icon,
} from '@/components/common/Icons';
import { DocumentItem } from '@/types';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useFileClipboardStore } from '@/store/fileClipboardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { BrokenEmbedIndicator } from '@/components/common/BrokenEmbedAlert';
import { getUniqueTitleForMove, getDocumentPath, isDescendant } from '@/lib/db/documents';
import { FileSortOrder, sortDocuments } from '@/components/layout/LeftSidebar';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { platform } from '@/lib/platform/platformAdapter';
import { useFileTreeDecorators, useNoetherApp } from '@/core/app/AppContext';
import { fileTypeRegistry } from '@/core/registries/FileTypeRegistry';
import { TreeNodeRow, TreeNodeAction } from './TreeNodeRow';
import { TreeNodeRenameInput } from './TreeNodeRenameInput';
import { useTreeDragDrop } from './useTreeDragDrop';

export function getVisibleTreeItemIds(targetEl?: HTMLElement | null): string[] {
  if (typeof document === 'undefined') return [];
  const sectionContainer =
    targetEl?.closest('[data-tree-section]') ||
    document.querySelector('[data-tree-section="vault-files"]') ||
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
  allDocs?: DocumentItem[];
  childrenMap?: Map<string | null, DocumentItem[]>;
  sortOrder?: FileSortOrder;
}

const FileTreeNodeComponent: React.FC<FileTreeNodeProps> = ({
  item,
  level = 0,
  allDocs: propAllDocs,
  childrenMap,
  sortOrder = 'alphabetical',
}) => {
  const allDocs = propAllDocs || useDocumentStore.getState().documents;
  const isFolder = !!item.is_folder;
  const isSelected = useDocumentStore((s) => (isFolder ? s.selectedDocIds.length > 1 && s.selectedDocIds.includes(item.id) : s.selectedDocIds.includes(item.id)));
  const isMultiSelected = useDocumentStore((s) => s.selectedDocIds.length > 1 && s.selectedDocIds.includes(item.id));
  const isStoreEditing = useDocumentStore((s) => s.editingDocId === item.id);
  const activeDocId = useDocumentStore((s) => s.activeDocument?.id);

  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const createNewFolder = useDocumentStore((s) => s.createNewFolder);
  const renameDocument = useDocumentStore((s) => s.renameDocument);
  const updateDocumentTitleInMemory = useDocumentStore((s) => s.updateDocumentTitleInMemory);
  const moveDocument = useDocumentStore((s) => s.moveDocument);
  const moveDocuments = useDocumentStore((s) => s.moveDocuments);
  const removeDocument = useDocumentStore((s) => s.removeDocument);
  const removeDocuments = useDocumentStore((s) => s.removeDocuments);
  const setEditingDocId = useDocumentStore((s) => s.setEditingDocId);
  const selectSingleDoc = useDocumentStore((s) => s.selectSingleDoc);
  const toggleDocSelection = useDocumentStore((s) => s.toggleDocSelection);
  const selectDocRange = useDocumentStore((s) => s.selectDocRange);
  const duplicateNote = useDocumentStore((s) => s.duplicateNote);
  const duplicateDocuments = useDocumentStore((s) => s.duplicateDocuments);
  const isCut = useFileClipboardStore((s) => s.isCut(item.id));
  const showBrokenEmbedIndicators = useSettingsStore((s) => s.showBrokenEmbedIndicators);
  const brokenEmbedCounts = useDocumentStore((s) => (isFolder && showBrokenEmbedIndicators ? s.brokenEmbedCounts : null));
  const fileBrokenCount = useDocumentStore((s) => (!isFolder && showBrokenEmbedIndicators ? (s.brokenEmbedCounts[item.id] || 0) : 0));

  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const openInputDialog = useWorkspaceStore((s) => s.openInputDialog);
  const vaultPath = useWorkspaceStore((s) => s.vaultPath);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const openSplitTab = useWorkspaceStore((s) => s.openSplitTab);
  const openTab = useWorkspaceStore((s) => s.openTab);
  const folderPickerPrompt = useWorkspaceStore((s) => s.folderPickerPrompt);
  const isPickingFolder = !!folderPickerPrompt?.isOpen;

  const { showContextMenu } = useAppContextMenu();

  const isOpen = useWorkspaceStore((s) => (isFolder ? (s.folderOpenState[item.id] !== undefined ? s.folderOpenState[item.id] : true) : true));

  const setIsOpen = useCallback(
    (openOrUpdater: boolean | ((prev: boolean) => boolean)) => {
      const currentState = useWorkspaceStore.getState().folderOpenState[item.id];
      const currentVal = currentState !== undefined ? currentState : true;
      const nextVal = typeof openOrUpdater === 'function' ? openOrUpdater(currentVal) : openOrUpdater;
      useWorkspaceStore.getState().setFolderOpen(item.id, nextVal);
    },
    [item.id]
  );

  const [localIsEditing, setLocalIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const saveTimerRef = useRef<any>(null);
  const originalTitleRef = useRef(item.title);
  const prevIsEditingRef = useRef(false);

  const app = useNoetherApp();
  const decorators = useFileTreeDecorators();
  const activeTab = useWorkspaceStore(
    useCallback((s) => (decorators.length > 0 ? (s.tabs.find((t) => t.id === s.activeTabId) || null) : null), [decorators.length])
  );
  const isHighlightSuppressed = useMemo(() => {
    if (decorators.length === 0) return false;
    const ctx = { doc: item, activeTab, app, isOpen };
    return decorators.some((d) => d.suppressHighlight?.(item, ctx));
  }, [decorators, item, activeTab, app, isOpen]);

  const isEditingSuppressed = useMemo(() => {
    if (decorators.length === 0) return false;
    const ctx = { doc: item, activeTab, app, isOpen };
    return decorators.some((d) => d.suppressEditing?.(item, ctx));
  }, [decorators, item, activeTab, app, isOpen]);

  const defaultIcon = useMemo(() => {
    if (!isFolder) return <div className="w-4 h-4 shrink-0" />;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-4 h-4 flex items-center justify-center text-[#777777] group-hover:text-[#dcddde] hover:text-white shrink-0"
      >
        {isOpen ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
      </button>
    );
  }, [isFolder, isOpen, setIsOpen]);

  const treeNodeIcon = useMemo(() => {
    if (decorators.length === 0) return defaultIcon;
    const ctx = {
      doc: item,
      activeTab,
      app,
      isOpen,
      defaultIcon,
      toggleOpen: () => setIsOpen(!isOpen),
    };
    for (const d of decorators) {
      if (d.renderIcon) {
        const res = d.renderIcon(item, ctx);
        if (res !== undefined && res !== null) return res;
      }
    }
    return defaultIcon;
  }, [decorators, item, activeTab, app, isOpen, defaultIcon, setIsOpen]);

  const treeNodePrefix = useMemo(() => {
    if (decorators.length === 0) return null;
    const ctx = {
      doc: item,
      activeTab,
      app,
      isOpen,
    };
    const prefixes: React.ReactNode[] = [];
    for (const d of decorators) {
      if (d.renderPrefix) {
        const res = d.renderPrefix(item, ctx);
        if (res !== undefined && res !== null) {
          prefixes.push(<React.Fragment key={d.id}>{res}</React.Fragment>);
        }
      }
    }
    if (prefixes.length === 0) return null;
    return prefixes.length === 1 ? prefixes[0] : <>{prefixes}</>;
  }, [decorators, item, activeTab, app, isOpen]);

  const folderBrokenDocCount = useMemo(() => {
    if (!isFolder || !showBrokenEmbedIndicators || !brokenEmbedCounts) return 0;
    const docs = allDocs || useDocumentStore.getState().documents;
    let count = 0;
    for (const brokenId of Object.keys(brokenEmbedCounts)) {
      if (brokenEmbedCounts[brokenId] > 0 && isDescendant(brokenId, item.id, docs)) {
        count++;
      }
    }
    return count;
  }, [isFolder, showBrokenEmbedIndicators, brokenEmbedCounts, item.id, allDocs]);

  const hasBrokenEmbed = isFolder ? folderBrokenDocCount > 0 : fileBrokenCount > 0;

  const treeNodeSuffix = useMemo(() => {
    const suffixes: React.ReactNode[] = [];
    if (decorators.length > 0) {
      const ctx = {
        doc: item,
        activeTab,
        app,
        isOpen,
      };
      for (const d of decorators) {
        if (d.renderSuffix) {
          const res = d.renderSuffix(item, ctx);
          if (res !== undefined && res !== null) {
            suffixes.push(<React.Fragment key={d.id}>{res}</React.Fragment>);
          }
        }
      }
    }

    if (hasBrokenEmbed) {
      suffixes.push(
        <BrokenEmbedIndicator
          key="broken-embed-badge"
          documentId={item.id}
          isFolder={isFolder}
          folderBrokenDocCount={folderBrokenDocCount}
          position="right"
          className="ml-1.5"
        />
      );
    }

    if (suffixes.length === 0) return null;
    return suffixes.length === 1 ? suffixes[0] : <div className="flex items-center shrink-0">{suffixes}</div>;
  }, [decorators, item, activeTab, app, isOpen, hasBrokenEmbed, isFolder]);

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

  const customType = useMemo(() => {
    if (isFolder) return null;
    return fileTypeRegistry.getByDocType(item.doc_type) || fileTypeRegistry.getByPath(item.title);
  }, [isFolder, item.doc_type, item.title]);

  const displayTitle = useMemo(() => {
    if (isFolder) return item.title;
    return fileTypeRegistry.cleanTitle(item.title, item.doc_type);
  }, [isFolder, item.title, item.doc_type]);

  const typeBadge = useMemo(() => {
    if (isFolder) return null;
    return fileTypeRegistry.getFileBadge(item.title, item.doc_type);
  }, [isFolder, item.title, item.doc_type]);

  const sortedChildren = useMemo(() => {
    if (!isFolder) return [];
    const docs = allDocs || useDocumentStore.getState().documents;
    const children = childrenMap ? (childrenMap.get(item.id) || []) : docs.filter((d) => d.parent_id === item.id);
    return sortDocuments(children, sortOrder);
  }, [isFolder, childrenMap, allDocs, item.id, sortOrder]);

  const isDuplicateName = useMemo(() => {
    if (!isEditing) return false;
    const trimmed = editTitle.trim().toLowerCase();
    if (!trimmed || trimmed === originalTitleRef.current.trim().toLowerCase()) return false;
    const docs = allDocs || useDocumentStore.getState().documents;
    const siblings = childrenMap ? (childrenMap.get(item.parent_id || null) || []) : docs;
    return siblings.some(
      (d) =>
        d.id !== item.id &&
        !!d.is_folder === isFolder &&
        ((d.doc_type || 'base') === (item.doc_type || 'base')) &&
        (d.parent_id || null) === (item.parent_id || null) &&
        d.title.trim().toLowerCase() === trimmed
    );
  }, [isEditing, editTitle, childrenMap, allDocs, item.id, item.parent_id, isFolder, item.doc_type]);

  // Keep edit title in sync
  useEffect(() => {
    const clean = isFolder ? item.title : fileTypeRegistry.cleanTitle(item.title, item.doc_type);
    if (isEditing && !prevIsEditingRef.current) {
      setEditTitle(clean);
      originalTitleRef.current = clean;
    } else if (!isEditing) {
      setEditTitle(clean);
      originalTitleRef.current = clean;
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, item.title, isFolder, item.doc_type]);


  // Auto-expand folder only when active document explicitly changes during user navigation
  const prevActiveDocIdRef = useRef<string | null>(activeDocId || null);
  useEffect(() => {
    if (!isFolder) return;
    if (prevActiveDocIdRef.current !== activeDocId) {
      prevActiveDocIdRef.current = activeDocId || null;
      if (activeDocId && isDescendant(activeDocId, item.id, allDocs)) {
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
        openTab(item.id, displayTitle, {
          replaceCurrentTab: true,
          viewType: customType ? customType.viewType : 'document',
          viewMode: customType ? (customType.viewType as any) : 'document',
        });
        setActiveDocumentById(item.id, { preserveViewMode: true });
      }
    },
    [isPickingFolder, isFolder, folderPickerPrompt, item, allDocs, isOpen, openTab, displayTitle, customType, selectDocRange, selectSingleDoc, toggleDocSelection, setIsOpen, setActiveDocumentById]
  );

  const handleAuxClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPickingFolder || isFolder) return;
      if (e.button === 1) {
        // Middle-click: open explicitly in a new tab
        e.preventDefault();
        e.stopPropagation();
        openTab(item.id, displayTitle, {
          newTab: true,
          replaceCurrentTab: false,
          viewType: customType ? customType.viewType : 'document',
          viewMode: customType ? (customType.viewType as any) : 'document',
        });
        setActiveDocumentById(item.id, { preserveViewMode: true });
      }
    },
    [isPickingFolder, isFolder, item.id, displayTitle, customType, openTab, setActiveDocumentById]
  );

  const handleSaveRename = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (isDuplicateName) {
      const orig = originalTitleRef.current;
      if (isStoreEditing) setEditingDocId(null);
      setLocalIsEditing(false);
      setEditTitle(orig);
      updateDocumentTitleInMemory(item.id, orig);
      renameDocument(item.id, orig, false);
      return;
    }

    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== originalTitleRef.current) {
      originalTitleRef.current = trimmed;
      setEditTitle(trimmed);
      if (isStoreEditing) setEditingDocId(null);
      setLocalIsEditing(false);
      await renameDocument(item.id, trimmed);
    } else {
      const orig = originalTitleRef.current;
      if (isStoreEditing) setEditingDocId(null);
      setLocalIsEditing(false);
      setEditTitle(orig);
      updateDocumentTitleInMemory(item.id, orig);
      renameDocument(item.id, orig, false);
    }
  }, [isDuplicateName, editTitle, isStoreEditing, item.id, renameDocument, updateDocumentTitleInMemory, setEditingDocId]);

  const handleCancelRename = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const orig = originalTitleRef.current;
    if (isStoreEditing) setEditingDocId(null);
    setLocalIsEditing(false);
    setEditTitle(orig);
    updateDocumentTitleInMemory(item.id, orig);
    renameDocument(item.id, orig, false);
  }, [isStoreEditing, item.id, renameDocument, updateDocumentTitleInMemory, setEditingDocId]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const currentSelectedIds = useDocumentStore.getState().selectedDocIds;
      const isMulti = currentSelectedIds.includes(item.id) && currentSelectedIds.length > 1;

      if (isMulti) {
        openConfirmDialog({
          title: `Move ${currentSelectedIds.length} items to trash?`,
          message: `Are you sure you want to move these ${currentSelectedIds.length} items to trash?`,
          subtext: 'They can be restored from the trash within 48 hours.',
          confirmText: 'Move to trash',
          isDanger: true,
          skipSettingKey: 'skipDeleteConfirmation',
          onConfirm: async () => {
            await removeDocuments(currentSelectedIds);
          },
        });
      } else {
        openConfirmDialog({
          title: `Move ${isFolder ? 'folder' : 'file'} to trash`,
          message: `Are you sure you want to move "${item.title}" to trash? ${
            isFolder ? 'All contents inside this folder will also be moved to trash.' : ''
          }`,
          subtext: 'It can be restored from the trash within 48 hours.',
          confirmText: 'Move to trash',
          isDanger: true,
          skipSettingKey: 'skipDeleteConfirmation',
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
        const full = vaultPath ? `${vaultPath}/${relPath}`.replace(/\/+/g, '/') : relPath;
        navigator.clipboard.writeText(full);
        showToast('Absolute path copied to clipboard', 'info');
      }
    },
    [allDocs, item, showToast, vaultPath]
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
            window.dispatchEvent(new CustomEvent('noether:expand-folder', { detail: { id: targetParentId } }));
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
              targetParentId ? `“${targetTitle}”` : 'vault root'
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
            window.dispatchEvent(new CustomEvent('noether:expand-folder', { detail: { id: targetParentId } }));
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

  // HTML5 External File Drag & Drop Handlers
  const [isExternalDragOver, setIsExternalDragOver] = useState(false);

  const handleRowDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setIsExternalDragOver(true);
    }
  }, []);

  const handleRowDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsExternalDragOver(false);
  }, []);

  const handleRowDrop = useCallback(
    async (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        setIsExternalDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          const targetParentId = isFolder ? item.id : (item.parent_id || null);
          await useDocumentStore.getState().importExternalFiles(files, targetParentId);
        }
      }
    },
    [isFolder, item.id, item.parent_id]
  );

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
            await createNewNote('Untitled', item.id);
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

      const menuContext = {
        item,
        selectedDocIds: currentSelectedIds,
        isMulti,
        app,
      };

      const customActions = app.fileContextMenus?.getActions(menuContext) ?? [];
      const customMenuItems: ContextMenuItem[] = customActions.map((action) => ({
        id: action.id,
        title: typeof action.title === 'function' ? action.title(menuContext) : action.title,
        icon: typeof action.icon === 'function' ? action.icon(menuContext) : action.icon,
        isDanger: action.isDanger,
        onClick: () => action.onClick(menuContext),
      }));

      if (isMulti) {
        const clipboardMode = useFileClipboardStore.getState().mode;
        const clipboardCount = useFileClipboardStore.getState().itemIds.length;
        const canPaste = Boolean(clipboardMode && clipboardCount > 0);

        const items: ContextMenuItem[] = [
          ...customMenuItems,
          ...(customMenuItems.length > 0 ? [{ type: 'separator' as const }] : []),
          {
            id: 'multi-cut',
            title: `Cut ${currentSelectedIds.length} items`,
            icon: <ScissorIcon size={14} />,
            shortcut: 'Ctrl+X',
            onClick: () => useFileClipboardStore.getState().cut(currentSelectedIds),
          },
          {
            id: 'multi-copy',
            title: `Copy ${currentSelectedIds.length} items`,
            icon: <Copy01Icon size={14} />,
            shortcut: 'Ctrl+C',
            onClick: () => useFileClipboardStore.getState().copy(currentSelectedIds),
          },
          {
            id: 'multi-duplicate',
            title: `Duplicate ${currentSelectedIds.length} items`,
            icon: <Copy01Icon size={14} />,
            shortcut: 'Ctrl+D',
            onClick: async () => {
              await duplicateDocuments(currentSelectedIds);
            },
          },
          { type: 'separator' },
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
                allowEmpty: true,
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
            title: `Move ${currentSelectedIds.length} items to trash`,
            icon: <Delete02Icon size={14} />,
            shortcut: 'Del',
            isDanger: true,
            onClick: () => {
              openConfirmDialog({
                title: `Move ${currentSelectedIds.length} items to trash?`,
                message: `Are you sure you want to move these ${currentSelectedIds.length} items to trash?`,
                subtext: 'They can be restored from the trash within 48 hours.',
                confirmText: 'Move to trash',
                isDanger: true,
                skipSettingKey: 'skipDeleteConfirmation',
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
        const clipboardMode = useFileClipboardStore.getState().mode;
        const clipboardCount = useFileClipboardStore.getState().itemIds.length;
        const canPaste = Boolean((clipboardMode && clipboardCount > 0) || platform.isDesktop());

        const items: ContextMenuItem[] = [
          {
            id: 'new-note',
            title: 'New note',
            icon: <FileAddIcon size={14} />,
            onClick: async () => {
              setIsOpen(true);
              await createNewNote('Untitled', item.id);
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
            id: 'cut-folder',
            title: 'Cut folder',
            icon: <ScissorIcon size={14} />,
            shortcut: 'Ctrl+X',
            onClick: () => useFileClipboardStore.getState().cut([item.id]),
          },
          {
            id: 'copy-folder',
            title: 'Copy folder',
            icon: <Copy01Icon size={14} />,
            shortcut: 'Ctrl+C',
            onClick: () => useFileClipboardStore.getState().copy([item.id]),
          },
          {
            id: 'paste',
            title: 'Paste',
            icon: <ClipboardPasteIcon size={14} />,
            shortcut: 'Ctrl+V',
            disabled: !canPaste,
            onClick: async () => {
              setIsOpen(true);
              const { mode, itemIds } = useFileClipboardStore.getState();
              if (mode && itemIds.length > 0) {
                await useFileClipboardStore.getState().executePaste(item.id);
              } else if (platform.isDesktop()) {
                const files = await platform.readClipboardFiles();
                if (files && files.length > 0) {
                  await useDocumentStore.getState().importExternalPaths(files, item.id);
                } else {
                  showToast('No files in clipboard to paste', 'info');
                }
              }
            },
          },
          {
            id: 'duplicate-folder',
            title: 'Duplicate folder',
            icon: <Copy01Icon size={14} />,
            shortcut: 'Ctrl+D',
            onClick: async () => {
              await duplicateNote(item.id);
            },
          },
          { type: 'separator' },
          {
            id: 'rename',
            title: 'Rename',
            icon: <Edit02Icon size={14} />,
            shortcut: 'F2',
            onClick: () => setLocalIsEditing(true),
          },
          {
            id: 'move-folder-to',
            title: 'Move folder to...',
            icon: <MoveFileIcon size={14} />,
            onClick: () => {
              const availableFolders = allDocs.filter(
                (d) => d.is_folder && d.id !== item.id && !isDescendant(d.id, item.id, allDocs)
              );
              openInputDialog({
                title: `Move "${item.title}" to folder:`,
                placeholder: 'Folder path or name (leave empty for root)',
                confirmText: 'Move',
                allowEmpty: true,
                onConfirm: async (folderPath) => {
                  let targetParentId: string | null = null;
                  if (folderPath.trim()) {
                    const targetFolder = availableFolders.find(
                      (f) => getDocumentPath(f, allDocs).toLowerCase() === folderPath.trim().toLowerCase()
                    );
                    if (targetFolder) targetParentId = targetFolder.id;
                  }
                  await executeMoveToTarget(targetParentId);
                },
              });
            },
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
            id: 'collapse-subfolders',
            title: 'Collapse all subfolders',
            icon: <ArrowShrink02Icon size={14} />,
            onClick: () => {
              const descendants = allDocs.filter((d) => d.is_folder && isDescendant(d.id, item.id, allDocs));
              descendants.forEach((d) => useWorkspaceStore.getState().setFolderOpen(d.id, false));
              useWorkspaceStore.getState().setFolderOpen(item.id, false);
            },
          },
          {
            id: 'expand-subfolders',
            title: 'Expand all subfolders',
            icon: <ArrowExpand01Icon size={14} />,
            onClick: () => {
              const descendants = allDocs.filter((d) => d.is_folder && isDescendant(d.id, item.id, allDocs));
              descendants.forEach((d) => useWorkspaceStore.getState().setFolderOpen(d.id, true));
              useWorkspaceStore.getState().setFolderOpen(item.id, true);
            },
          },
          {
            id: 'show-in-explorer',
            title: 'Show in system explorer',
            icon: <FolderOpenIcon size={14} />,
            onClick: async () => {
              if (platform.isDesktop()) {
                const rel = getDocumentPath(item, allDocs);
                const res = await platform.revealInExplorer(rel);
                if (!res.success && res.error) {
                  showToast(res.error, 'warning');
                }
              } else {
                showToast('Vault folder: ' + (vaultPath || 'local memory'), 'info');
              }
            },
          },
          ...(customMenuItems.length > 0 ? [{ type: 'separator' as const }, ...customMenuItems] : []),
          { type: 'separator' },
          {
            id: 'delete',
            title: 'Delete folder',
            icon: <Delete02Icon size={14} />,
            shortcut: 'Del',
            isDanger: true,
            onClick: () => handleDelete({ stopPropagation: () => {} } as React.MouseEvent),
          },
        ];
        showContextMenu(e, items, { scope: 'file-tree', data: item });
      } else {
        const clipboardMode = useFileClipboardStore.getState().mode;
        const clipboardCount = useFileClipboardStore.getState().itemIds.length;
        const canPaste = Boolean((clipboardMode && clipboardCount > 0) || platform.isDesktop());

        const items: ContextMenuItem[] = [
          {
            id: 'open',
            title: 'Open',
            icon: <File01Icon size={14} />,
            onClick: () => {
              openTab(item.id, displayTitle, {
                replaceCurrentTab: true,
                viewType: customType ? customType.viewType : 'document',
                viewMode: customType ? (customType.viewType as any) : 'document',
              });
              setActiveDocumentById(item.id, { preserveViewMode: true });
            },
          },
          {
            id: 'open-tab',
            title: 'Open in new tab',
            icon: <ExternalLinkIcon size={14} />,
            onClick: () => {
              openTab(item.id, displayTitle, {
                newTab: true,
                replaceCurrentTab: false,
                viewType: customType ? customType.viewType : 'document',
                viewMode: customType ? (customType.viewType as any) : 'document',
              });
              setActiveDocumentById(item.id, { preserveViewMode: true });
            },
          },
          {
            id: 'open-split',
            title: 'Open to the right',
            icon: <SplitRightIcon size={14} />,
            shortcut: 'Ctrl+\\',
            onClick: () => {
              openSplitTab(item.id, displayTitle, 'horizontal');
            },
          },
          {
            id: 'open-split-down',
            title: 'Open to the bottom',
            icon: <SplitDownIcon size={14} />,
            onClick: () => {
              openSplitTab(item.id, displayTitle, 'vertical');
            },
          },
          { type: 'separator' },
          {
            id: 'cut-file',
            title: 'Cut file',
            icon: <ScissorIcon size={14} />,
            shortcut: 'Ctrl+X',
            onClick: () => useFileClipboardStore.getState().cut([item.id]),
          },
          {
            id: 'copy-file',
            title: 'Copy file',
            icon: <Copy01Icon size={14} />,
            shortcut: 'Ctrl+C',
            onClick: () => useFileClipboardStore.getState().copy([item.id]),
          },
          {
            id: 'paste',
            title: 'Paste',
            icon: <ClipboardPasteIcon size={14} />,
            shortcut: 'Ctrl+V',
            disabled: !canPaste,
            onClick: async () => {
              const targetParentId = item.parent_id || null;
              const { mode, itemIds } = useFileClipboardStore.getState();
              if (mode && itemIds.length > 0) {
                await useFileClipboardStore.getState().executePaste(targetParentId);
              } else if (platform.isDesktop()) {
                const files = await platform.readClipboardFiles();
                if (files && files.length > 0) {
                  await useDocumentStore.getState().importExternalPaths(files, targetParentId);
                } else {
                  showToast('No files in clipboard to paste', 'info');
                }
              }
            },
          },
          {
            id: 'duplicate',
            title: 'Duplicate',
            icon: <Copy01Icon size={14} />,
            shortcut: 'Ctrl+D',
            onClick: async () => {
              await duplicateNote(item.id);
            },
          },
          { type: 'separator' },
          {
            id: 'copy-link',
            title: 'Copy note link (Wikilink)',
            icon: <Link01Icon size={14} />,
            onClick: () => {
              const wikilink = `[[${item.title}]]`;
              navigator.clipboard.writeText(wikilink);
              showToast(`Copied ${wikilink} to clipboard`, 'info');
            },
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
            id: 'rename',
            title: 'Rename...',
            icon: <Edit02Icon size={14} />,
            shortcut: 'F2',
            onClick: () => setLocalIsEditing(true),
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
                allowEmpty: true,
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
            id: 'open-default-app',
            title: 'Open in default app',
            icon: <ExternalLinkIcon size={14} />,
            onClick: async () => {
              if (platform.isDesktop()) {
                const rel = getDocumentPath(item, allDocs) + '.md';
                const res = await platform.openInDefaultApp(rel);
                if (!res.success && res.error) {
                  showToast(res.error, 'warning');
                }
              } else {
                showToast('Opening in default application is supported in desktop mode', 'info');
              }
            },
          },
          {
            id: 'show-in-explorer',
            title: 'Show in system explorer',
            icon: <FolderOpenIcon size={14} />,
            onClick: async () => {
              if (platform.isDesktop()) {
                const rel = getDocumentPath(item, allDocs) + '.md';
                const res = await platform.revealInExplorer(rel);
                if (!res.success && res.error) {
                  showToast(res.error, 'warning');
                }
              } else {
                showToast('Vault folder: ' + (vaultPath || 'local memory'), 'info');
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
          ...(customMenuItems.length > 0 ? [{ type: 'separator' as const }, ...customMenuItems] : []),
          { type: 'separator' },
          {
            id: 'delete',
            title: 'Delete file',
            icon: <Delete02Icon size={14} />,
            shortcut: 'Del',
            isDanger: true,
            onClick: () => handleDelete({ stopPropagation: () => {} } as React.MouseEvent),
          },
        ];
        showContextMenu(e, items, { scope: 'file-tree', data: item });
      }
    },
    [allDocs, createNewFolder, createNewNote, customType, displayTitle, duplicateNote, duplicateDocuments, executeMoveToTarget, handleCopyPath, handleDelete, isFolder, item, moveDocuments, openConfirmDialog, openInputDialog, openSplitTab, openTab, removeDocuments, selectSingleDoc, setActiveDocumentById, showContextMenu, showToast, vaultPath, app]
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
      isHighlighted={false}
      isBeingDragged={isBeingDragged}
      isDropTarget={isDropTarget || isExternalDragOver}
      isEditing={isEditing}
      isDisabled={isPickingFolder && !isFolder}
      isCut={isCut}
      isFolderPickerTarget={isPickingFolder && isFolder}
      folderName={isFolder ? item.title : undefined}
      title={displayTitle}
      typeBadge={typeBadge}
      icon={treeNodeIcon}
      prefix={treeNodePrefix}
      suffix={treeNodeSuffix}
      renameInput={
        <TreeNodeRenameInput
          value={editTitle}
          onChange={(val) => {
            setEditTitle(val);
            updateDocumentTitleInMemory(item.id, val);
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
        if (isFolder) {
          setIsOpen((prev) => !prev);
        } else {
          openTab(item.id, displayTitle, {
            replaceCurrentTab: false,
            newTab: true,
            viewType: customType ? customType.viewType : 'document',
            viewMode: customType ? (customType.viewType as any) : 'document',
          });
        }
      }}
      onAuxClick={isPickingFolder ? undefined : handleAuxClick}
      onContextMenu={isPickingFolder ? undefined : handleContextMenu}
      onPointerDown={isPickingFolder ? undefined : handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onDragOver={isPickingFolder ? undefined : handleRowDragOver}
      onDragEnter={isPickingFolder ? undefined : handleRowDragOver}
      onDragLeave={isPickingFolder ? undefined : handleRowDragLeave}
      onDrop={isPickingFolder ? undefined : handleRowDrop}
    >
      {isFolder && sortedChildren.length > 0 && (
        <>
          {sortedChildren.map((child) => (
            <FileTreeNode
              key={child.id}
              item={child}
              level={level + 1}
              allDocs={allDocs}
              childrenMap={childrenMap}
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
