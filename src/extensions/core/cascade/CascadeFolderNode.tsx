import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DocumentItem } from '@/types';
import {
  Motion01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileAddIcon,
  Edit02Icon,
  Delete02Icon,
} from '@/components/common/Icons';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCascadeSettings } from './cascadeSettings';
import {
  assignNoteToCascade,
  removeNoteFromCascade,
  getCascadeNotes,
  formatTitleWithPageSuffix,
  stripPageSuffix,
  renameCascade,
  deleteCascade,
  getAllCascades,
  parseCascadePageString,
} from './cascadeManager';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { TreeNodeRow, TreeNodeAction } from '@/components/file-tree/TreeNodeRow';
import { TreeNodeRenameInput } from '@/components/file-tree/TreeNodeRenameInput';
import { useTreeDragDrop } from '@/components/file-tree/useTreeDragDrop';
import { getVisibleTreeItemIds } from '@/components/file-tree/FileTreeNode';

interface CascadeNoteItemProps {
  doc: DocumentItem;
  page: number;
  cascadeName: string;
  allCascadeNotes: Array<{ doc: DocumentItem; page: number }>;
  level: number;
  isSelected: boolean;
  onSelect: (doc: DocumentItem, page: number) => void;
}

const CascadeNoteItem: React.FC<CascadeNoteItemProps> = React.memo(({
  doc,
  page,
  cascadeName,
  allCascadeNotes,
  level,
  isSelected,
  onSelect,
}) => {
  const editingDocId = useDocumentStore((s) => s.editingDocId);
  const setEditingDocId = useDocumentStore((s) => s.setEditingDocId);
  const [localIsEditing, setLocalIsEditing] = useState(false);
  const isEditing = (editingDocId === doc.id && isSelected) || localIsEditing;

  const displayTitle = formatTitleWithPageSuffix(doc.title, page);
  const [editTitle, setEditTitle] = useState(() => displayTitle);
  const prevIsEditingRef = useRef(false);

  const renameDocument = useDocumentStore((s) => s.renameDocument);
  const removeDocument = useDocumentStore((s) => s.removeDocument);
  const moveDocument = useDocumentStore((s) => s.moveDocument);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const { showContextMenu } = useAppContextMenu();

  const isDuplicatePage = useMemo(() => {
    if (!isEditing) return false;
    const match = editTitle.trim().match(/^(.*?)(?:\s*\[\s*(-?\d+|[ivxlcdmIVXLCDM]+)\s*\])?$/);
    const pageRaw = match ? match[2] : undefined;
    if (pageRaw === undefined) return false;
    const targetPage = parseCascadePageString(pageRaw);
    if (targetPage === null || targetPage === page) return false;
    return allCascadeNotes.some((n) => n.doc.id !== doc.id && n.page === targetPage);
  }, [isEditing, editTitle, page, allCascadeNotes, doc.id]);

  useEffect(() => {
    if (isEditing && !prevIsEditingRef.current) {
      setEditTitle(displayTitle);
    } else if (!isEditing) {
      setEditTitle(displayTitle);
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, displayTitle]);

  const handleRenameSubmit = useCallback(async () => {
    if (isDuplicatePage) {
      if (editingDocId === doc.id) setEditingDocId(null);
      setLocalIsEditing(false);
      setEditTitle(displayTitle);
      return;
    }

    const val = editTitle.trim();
    if (editingDocId === doc.id) setEditingDocId(null);
    setLocalIsEditing(false);

    const match = val.match(/^(.*?)(?:\s*\[\s*(-?\d+|[ivxlcdmIVXLCDM]+)\s*\])?$/);
    const rawTitle = match ? match[1].trim() : '';
    const pageRaw = match ? match[2] : undefined;
    const parsedPage = pageRaw !== undefined ? parseCascadePageString(pageRaw) : null;

    const cleanPrevTitle = stripPageSuffix(doc.title) || 'Untitled';
    const finalTitle = rawTitle || cleanPrevTitle;
    const newPage = parsedPage !== null ? parsedPage : page;

    if (finalTitle !== cleanPrevTitle) {
      await renameDocument(doc.id, finalTitle);
    }

    if (newPage !== page) {
      await assignNoteToCascade(doc.id, cascadeName, newPage);
    }
  }, [isDuplicatePage, editingDocId, doc.id, doc.title, displayTitle, editTitle, page, cascadeName, renameDocument, setEditingDocId]);

  const handleCancelRename = useCallback(() => {
    if (editingDocId === doc.id) setEditingDocId(null);
    setLocalIsEditing(false);
    setEditTitle(displayTitle);
  }, [editingDocId, doc.id, setEditingDocId, displayTitle]);

  const handleDeleteNote = useCallback(() => {
    openConfirmDialog({
      title: 'Delete Note',
      message: `Are you sure you want to delete "${doc.title}"?`,
      confirmText: 'Delete',
      isDanger: true,
      onConfirm: async () => {
        await removeDocument(doc.id);
      },
    });
  }, [doc.id, doc.title, openConfirmDialog, removeDocument]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          id: 'cascade-note-rename',
          title: 'Rename',
          icon: <Edit02Icon size={14} />,
          onClick: () => setLocalIsEditing(true),
        },
        {
          id: 'cascade-note-delete',
          title: 'Delete',
          icon: <Delete02Icon size={14} />,
          isDanger: true,
          onClick: handleDeleteNote,
        },
      ];

      showContextMenu(e, items, { scope: 'file-tree' });
    },
    [handleDeleteNote, showContextMenu]
  );

  // Unified Drag & Drop Hook for Cascade Note
  const {
    handlePointerDown,
    handlePointerEnter,
    handlePointerLeave,
    isBeingDragged,
  } = useTreeDragDrop({
    item: doc,
    isEditing,
    getDisplayTitle: () => displayTitle,
    onCustomHover: (hoveredEl) => {
      const otherCascadeEl = hoveredEl?.closest('[data-cascade-folder]');
      const treeNodeEl = hoveredEl?.closest('[data-tree-item-id]');
      const sidebarRootEl = hoveredEl?.closest('[data-sidebar-root]');

      if (otherCascadeEl) {
        const targetCascadeName = otherCascadeEl.getAttribute('data-cascade-folder');
        if (targetCascadeName && targetCascadeName !== cascadeName) {
          return { subtitle: `Move into Cascade “${targetCascadeName}”`, isValid: true };
        }
        return { subtitle: `Inside Cascade “${cascadeName}”`, isValid: false };
      }
      if (treeNodeEl) {
        const isFolderNode = treeNodeEl.getAttribute('data-is-folder') === 'true';
        const targetDocId = treeNodeEl.getAttribute('data-tree-item-id');
        const allDocs = useDocumentStore.getState().documents;
        const targetDoc = allDocs.find((d) => d.id === targetDocId);

        if (isFolderNode && targetDoc) {
          return { subtitle: `Remove from Cascade & move into “${targetDoc.title}”`, isValid: true };
        }
        return { subtitle: 'Remove from Cascade', isValid: true };
      }
      if (sidebarRootEl) {
        return { subtitle: 'Remove from Cascade (move to root)', isValid: true };
      }
      return { subtitle: 'Remove from Cascade', isValid: true };
    },
    onCustomDrop: async (hoveredEl) => {
      const otherCascadeEl = hoveredEl?.closest('[data-cascade-folder]');
      const treeNodeEl = hoveredEl?.closest('[data-tree-item-id]');
      const sidebarRootEl = hoveredEl?.closest('[data-sidebar-root]');

      if (otherCascadeEl) {
        const targetCascadeName = otherCascadeEl.getAttribute('data-cascade-folder');
        if (targetCascadeName && targetCascadeName !== cascadeName) {
          const allDocs = useDocumentStore.getState().documents;
          const targetNotes = getCascadeNotes(targetCascadeName, allDocs);
          const nextPage = targetNotes.length + 1;
          await assignNoteToCascade(doc.id, targetCascadeName, nextPage);
          return true;
        }
      } else if (treeNodeEl) {
        const isFolderNode = treeNodeEl.getAttribute('data-is-folder') === 'true';
        const targetDocId = treeNodeEl.getAttribute('data-tree-item-id');
        await removeNoteFromCascade(doc.id);
        if (isFolderNode && targetDocId) {
          await moveDocument(doc.id, targetDocId);
        }
        return true;
      } else if (sidebarRootEl || hoveredEl) {
        await removeNoteFromCascade(doc.id);
        return true;
      }
      return false;
    },
  });

  const actions: TreeNodeAction[] = useMemo(
    () => [
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
        onClick: handleDeleteNote,
      },
    ],
    [handleDeleteNote]
  );

  return (
    <TreeNodeRow
      id={`cascade-item-${cascadeName}-${doc.id}`}
      level={level + 1}
      isFolder={false}
      isSelected={isSelected}
      isBeingDragged={isBeingDragged}
      isEditing={isEditing}
      title={displayTitle}
      renameInput={
        <TreeNodeRenameInput
          value={editTitle}
          onChange={setEditTitle}
          onSubmit={handleRenameSubmit}
          onCancel={handleCancelRename}
          errorMessage={isDuplicatePage ? "There's already a note on that page" : null}
        />
      }
      actions={actions}
      onSelect={(e) => {
        e.stopPropagation();
        if (isEditing) return;
        onSelect(doc, page);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setLocalIsEditing(true);
      }}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      dataAttributes={{
        'data-is-cascade-item': 'true',
      }}
    />
  );
});

CascadeNoteItem.displayName = 'CascadeNoteItem';

export interface CascadeFolderNodeProps {
  cascade: {
    name: string;
    notes: Array<{ doc: DocumentItem; page: number }>;
  };
  level?: number;
  isOpen?: boolean;
  onToggleOpen?: (isOpen: boolean) => void;
}

export const CascadeFolderNode: React.FC<CascadeFolderNodeProps> = React.memo(({
  cascade,
  level = 0,
  isOpen: propsIsOpen,
  onToggleOpen,
}) => {
  const [localIsOpen, setLocalIsOpen] = useState(true);
  const isOpen = propsIsOpen !== undefined ? propsIsOpen : localIsOpen;

  const handleToggleOpen = useCallback(() => {
    if (onToggleOpen) {
      onToggleOpen(!isOpen);
    } else {
      setLocalIsOpen(!isOpen);
    }
  }, [isOpen, onToggleOpen]);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(cascade.name);
  const prevIsEditingRef = useRef(false);

  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const openTab = useWorkspaceStore((s) => s.openTab);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const { showContextMenu } = useAppContextMenu();

  const activeCascadeContext = useCascadeSettings((s) => s.activeCascadeContext);
  const setActiveCascadeContext = useCascadeSettings((s) => s.setActiveCascadeContext);

  const allDocs = useDocumentStore((s) => s.documents);
  const selectedDocIds = useDocumentStore((s) => s.selectedDocIds);
  const activeDocId = activeDocument?.id;

  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId), [tabs, activeTabId]);

  const isDuplicateCascadeName = useMemo(() => {
    if (!isEditing) return false;
    const trimmed = editName.trim().toLowerCase();
    if (!trimmed || trimmed === cascade.name.toLowerCase()) return false;
    const existingCascades = getAllCascades(allDocs);
    return existingCascades.some(
      (c) => c.name.toLowerCase() === trimmed && c.name.toLowerCase() !== cascade.name.toLowerCase()
    );
  }, [isEditing, editName, cascade.name, allDocs]);

  useEffect(() => {
    if (isEditing && !prevIsEditingRef.current) {
      setEditName(cascade.name);
    } else if (!isEditing) {
      setEditName(cascade.name);
    }
    prevIsEditingRef.current = isEditing;
  }, [isEditing, cascade.name]);

  const handleSelectCascadeNote = useCallback(
    (doc: DocumentItem, page: number) => {
      setActiveCascadeContext({
        docId: doc.id,
        cascadeName: cascade.name,
        page,
      });
      openTab(doc.id, doc.title, {
        id: `tab-cascade-${cascade.name}-${doc.id}`,
        metadata: {
          cascadeName: cascade.name,
          page,
        },
      });
    },
    [cascade.name, openTab, setActiveCascadeContext]
  );

  const handleCreateNewPageInCascade = useCallback(async () => {
    const nextPageNum = cascade.notes.length + 1;
    const newDoc = await createNewNote('Untitled');
    if (newDoc) {
      await assignNoteToCascade(newDoc.id, cascade.name, nextPageNum);
      setActiveCascadeContext({
        docId: newDoc.id,
        cascadeName: cascade.name,
        page: nextPageNum,
      });
      openTab(newDoc.id, newDoc.title, {
        id: `tab-cascade-${cascade.name}-${newDoc.id}`,
        metadata: {
          cascadeName: cascade.name,
          page: nextPageNum,
        },
      });
      useDocumentStore.getState().setEditingDocId(newDoc.id);
    }
  }, [cascade.notes.length, cascade.name, createNewNote, openTab, setActiveCascadeContext]);

  const handleRenameSubmit = useCallback(async () => {
    if (isDuplicateCascadeName) {
      setIsEditing(false);
      setEditName(cascade.name);
      return;
    }

    const trimmed = editName.trim();
    setIsEditing(false);

    if (trimmed && trimmed !== cascade.name) {
      await renameCascade(cascade.name, trimmed);
    } else {
      setEditName(cascade.name);
    }
  }, [isDuplicateCascadeName, editName, cascade.name]);

  const handleCancelRename = useCallback(() => {
    setIsEditing(false);
    setEditName(cascade.name);
  }, [cascade.name]);

  const handleDeleteCascade = useCallback(() => {
    openConfirmDialog({
      title: 'Delete Cascade',
      message: `Are you sure you want to delete the cascade "${cascade.name}"? Notes will be preserved in your vault.`,
      confirmText: 'Delete Cascade',
      isDanger: true,
      onConfirm: async () => {
        await deleteCascade(cascade.name);
      },
    });
  }, [cascade.name, openConfirmDialog]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          id: 'cascade-new-note',
          title: 'New note in Cascade',
          icon: <FileAddIcon size={14} />,
          onClick: handleCreateNewPageInCascade,
        },
        {
          id: 'cascade-rename',
          title: 'Rename Cascade',
          icon: <Edit02Icon size={14} />,
          onClick: () => setIsEditing(true),
        },
        {
          id: 'cascade-delete',
          title: 'Delete Cascade',
          icon: <Delete02Icon size={14} />,
          isDanger: true,
          onClick: handleDeleteCascade,
        },
      ];

      showContextMenu(e, items, { scope: 'cascade-folder' });
    },
    [handleCreateNewPageInCascade, handleDeleteCascade, showContextMenu]
  );

  // Folder Drag / Drop Hook
  const {
    handlePointerEnter,
    handlePointerLeave,
    isDropTarget,
  } = useTreeDragDrop({
    item: { id: `cascade-${cascade.name}`, title: cascade.name, is_folder: true },
    isEditing,
    canDrag: false,
  });

  // Auto-expand folder when hovered during drag
  useEffect(() => {
    if (isDropTarget && !isOpen) {
      const timer = setTimeout(() => {
        if (onToggleOpen) onToggleOpen(true);
        else setLocalIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDropTarget, isOpen, onToggleOpen]);

  // Listen for custom drops onto this Cascade Folder
  useEffect(() => {
    const handleCustomDrop = async (e: any) => {
      const detail = e.detail;
      if (!detail || detail.handled) return;

      const targetEl = detail.targetEl as HTMLElement | null;
      const cascadeEl = targetEl?.closest(`[data-cascade-folder="${cascade.name}"]`);
      if (!cascadeEl) return;

      detail.handled = true;
      e.preventDefault();

      const item = detail.item as DocumentItem;
      const selectedIds = (detail.selectedIds as string[]) || (item ? [item.id] : []);
      const currentDocs = useDocumentStore.getState().documents;
      const targetDocs = currentDocs.filter((d) => selectedIds.includes(d.id));

      let nextPage = cascade.notes.length + 1;
      for (const doc of targetDocs) {
        if (!doc.is_folder) {
          await assignNoteToCascade(doc.id, cascade.name, nextPage);
          nextPage++;
        }
      }
    };

    window.addEventListener('flint:custom-drop', handleCustomDrop);
    return () => window.removeEventListener('flint:custom-drop', handleCustomDrop);
  }, [cascade.name, cascade.notes.length]);

  const actions: TreeNodeAction[] = useMemo(
    () => [
      {
        id: 'new-note',
        title: 'New note in Cascade',
        icon: <FileAddIcon size={12} />,
        onClick: () => {
          if (onToggleOpen) onToggleOpen(true);
          else setLocalIsOpen(true);
          handleCreateNewPageInCascade();
        },
      },
      {
        id: 'rename',
        title: 'Rename Cascade',
        icon: <Edit02Icon size={12} />,
        onClick: () => setIsEditing(true),
      },
      {
        id: 'delete',
        title: 'Delete Cascade',
        icon: <Delete02Icon size={12} />,
        isDanger: true,
        onClick: handleDeleteCascade,
      },
    ],
    [handleCreateNewPageInCascade, handleDeleteCascade, onToggleOpen]
  );

  return (
    <TreeNodeRow
      id={`cascade-${cascade.name}`}
      level={level}
      isFolder={true}
      isOpen={isOpen}
      isDropTarget={isDropTarget}
      isEditing={isEditing}
      title={cascade.name}
      icon={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleOpen();
          }}
          className="w-4 h-4 flex items-center justify-center text-[#777777] group-hover:text-[#dcddde] hover:text-white shrink-0 transition-colors relative"
        >
          <div className="relative flex items-center justify-center w-3.5 h-3.5 overflow-hidden">
            <Motion01Icon
              size={12}
              className="absolute inset-0 m-auto transition-all duration-200 transform opacity-100 scale-100 rotate-0 group-hover:opacity-0 group-hover:scale-50 group-hover:rotate-90 group-hover:pointer-events-none text-[#777777] group-hover:text-[#dcddde]"
            />
            {isOpen ? (
              <ChevronDownIcon
                size={12}
                className="absolute inset-0 m-auto transition-all duration-200 transform opacity-0 scale-50 -rotate-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0 text-[#dcddde]"
              />
            ) : (
              <ChevronRightIcon
                size={12}
                className="absolute inset-0 m-auto transition-all duration-200 transform opacity-0 scale-50 -rotate-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:rotate-0 text-[#dcddde]"
              />
            )}
          </div>
        </button>
      }
      renameInput={
        <TreeNodeRenameInput
          value={editName}
          onChange={setEditName}
          onSubmit={handleRenameSubmit}
          onCancel={handleCancelRename}
          errorMessage={isDuplicateCascadeName ? "There's already a cascade with the same name" : null}
        />
      }
      actions={actions}
      onSelect={() => {
        if (!isEditing) handleToggleOpen();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      onContextMenu={handleContextMenu}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      dataAttributes={{
        'data-cascade-book': cascade.name,
        'data-cascade-folder': cascade.name,
        'data-custom-drop-target': 'true',
        'data-drop-subtitle': `Add to Cascade “${cascade.name}”`,
      }}
    >
      {cascade.notes.map(({ doc, page }) => {
        const isSelected = Boolean(
          activeTab?.document_id === doc.id &&
          activeTab?.metadata?.cascadeName &&
          String(activeTab.metadata.cascadeName).toLowerCase() === cascade.name.toLowerCase() &&
          (activeTab.metadata.page === undefined || activeTab.metadata.page === page)
        );
        return (
          <CascadeNoteItem
            key={`cascade-${cascade.name}-${doc.id}`}
            doc={doc}
            page={page}
            cascadeName={cascade.name}
            allCascadeNotes={cascade.notes}
            level={level}
            isSelected={isSelected}
            onSelect={handleSelectCascadeNote}
          />
        );
      })}
    </TreeNodeRow>
  );
});

CascadeFolderNode.displayName = 'CascadeFolderNode';
