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
    <div className="w-full h-full flex flex-col min-w-0 overflow-hidden font-sans select-none bg-[var(--flint-bg-main)]">
      {/* 1. View Subheader with interactive inline action link */}
      <PageSubHeader
        title={displayTitle}
        icon={<Alert02Icon size={14} className="text-amber-400" />}
        centerContent={
          <div className="text-[11px] text-[var(--flint-text-muted)] truncate max-w-lg px-2 py-0.5 text-center select-none flex items-center justify-center gap-1.5 font-sans">
            <Alert02Icon size={12} className="text-amber-400 shrink-0" />
            <span className="truncate">
              This file <strong className="text-[var(--flint-text-secondary)] font-medium">{displayTitle}</strong> has been deleted or cannot be found.{' '}
              {matchingTrashItem ? (
                <button
                  type="button"
                  onClick={handleRestore}
                  className="text-[var(--flint-accent)] hover:underline font-medium cursor-pointer transition-colors bg-transparent border-0 p-0 inline ml-1"
                >
                  Restore it back?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRecreate}
                  className="text-[var(--flint-accent)] hover:underline font-medium cursor-pointer transition-colors bg-transparent border-0 p-0 inline ml-1"
                >
                  Recreate note?
                </button>
              )}
            </span>
          </div>
        }
        showReadingToggle={false}
        showBookmark={false}
        showSearch={false}
        showDocOptions={false}
      />

      {/* 2. Empty Body (clean empty space matching DisabledExtensionView) */}
      <div className="flex-1 w-full h-full" />
    </div>
  );
});

export default DeadDocumentView;
