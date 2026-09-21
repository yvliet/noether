import React, { useCallback, useMemo } from 'react';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { Alert02Icon } from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';

export interface DeadDocumentViewProps {
  paneId: string;
  tabId: string;
  documentId: string;
  title?: string;
}

export const DeadDocumentView: React.FC<DeadDocumentViewProps> = React.memo(({
  paneId,
  tabId,
  documentId,
  title,
}) => {
  const displayTitle = title || 'Untitled';
  const trashItems = useDocumentStore((s) => s.trashItems);
  const restoreFromTrash = useDocumentStore((s) => s.restoreFromTrash);
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const openTabInPane = useWorkspaceStore((s) => s.openTabInPane);

  const matchingTrashItem = useMemo(() => {
    return trashItems.find(
      (t) =>
        t.original_id === documentId ||
        t.id === documentId ||
        (t.title && t.title.toLowerCase() === displayTitle.toLowerCase())
    );
  }, [trashItems, documentId, displayTitle]);

  const handleRestore = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!matchingTrashItem) return;
    try {
      await restoreFromTrash(matchingTrashItem.id);
    } catch (err) {
      console.error('[DeadDocumentView] Error restoring note:', err);
      showToast(`Failed to restore "${displayTitle}"`, 'warning');
    }
  }, [matchingTrashItem, restoreFromTrash, displayTitle, showToast]);

  const handleRecreate = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const newDoc = await createNewNote(displayTitle, null, 'base', false);
      if (newDoc) {
        openTabInPane(paneId, newDoc.id, newDoc.title, { id: tabId });
        showToast(`Created new note "${newDoc.title}"`, 'success');
      }
    } catch (err) {
      console.error('[DeadDocumentView] Error recreating note:', err);
      showToast(`Failed to recreate "${displayTitle}"`, 'warning');
    }
  }, [createNewNote, displayTitle, openTabInPane, paneId, tabId, showToast]);

  return (
    <div data-main="true" className="w-full h-full flex flex-col min-w-0 overflow-hidden font-sans select-none bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] relative">
      {/* 1. Standard View Subheader */}
      <PageSubHeader
        title={displayTitle}
        icon={<Alert02Icon size={14} className="opacity-40" />}
        showReadingToggle={false}
        showBookmark={false}
        showSearch={false}
        showDocOptions={false}
      />

      {/* 2. Main Empty View Body */}
      <div className="flex-1 flex flex-col items-center justify-center text-center select-none p-6 gap-2 text-[#666] text-xs">
        <Alert02Icon size={36} className="opacity-40 mb-1" />
        <span className="text-[13px] text-[#888]">Note deleted or cannot be found</span>
        <p className="text-xs text-[#666] max-w-sm leading-relaxed">
          The file <strong className="text-[#888] font-normal">&ldquo;{displayTitle}&rdquo;</strong> is no longer in this vault.
        </p>
        {matchingTrashItem ? (
          <button
            type="button"
            onClick={handleRestore}
            className="text-[11px] text-[#888] hover:text-white cursor-pointer mt-1 underline underline-offset-2"
          >
            Restore from Trash
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRecreate}
            className="text-[11px] text-[#888] hover:text-white cursor-pointer mt-1 underline underline-offset-2"
          >
            Recreate note
          </button>
        )}
      </div>
    </div>
  );
});

export default DeadDocumentView;
