import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft01Icon,
  Search01Icon,
  Folder01Icon,
  File01Icon,
  DashboardSquare01Icon,
  RotateCcwIcon,
  Delete02Icon,
} from '@/components/common/Icons';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { platform } from '@/lib/platform/platformAdapter';
import { fileTypeRegistry } from '@/core/registries/FileTypeRegistry';

function formatRelativeTime(timestamp: number): string {
  const elapsedMs = Date.now() - timestamp;
  const mins = Math.floor(elapsedMs / (60 * 1000));
  if (mins < 1) return 'Deleted just now';
  if (mins < 60) return `Deleted ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Deleted ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Deleted ${days}d ago`;
}

export interface TrashViewProps {
  onClose: () => void;
}

export const TrashView: React.FC<TrashViewProps> = React.memo(({ onClose }) => {
  const trashItems = useDocumentStore((s) => s.trashItems);
  const loadTrash = useDocumentStore((s) => s.loadTrash);
  const restoreFromTrash = useDocumentStore((s) => s.restoreFromTrash);
  const deletePermanently = useDocumentStore((s) => s.deletePermanently);
  const emptyAllTrash = useDocumentStore((s) => s.emptyAllTrash);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const [trashSearchQuery, setTrashSearchQuery] = useState('');

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const filteredTrashItems = useMemo(() => {
    if (!trashSearchQuery.trim()) return trashItems;
    const q = trashSearchQuery.toLowerCase();
    return trashItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.original_path && item.original_path.toLowerCase().includes(q))
    );
  }, [trashItems, trashSearchQuery]);

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer -ml-1 w-fit"
        >
          <ArrowLeft01Icon size={14} />
          <span className="font-medium">Files and links / Trash</span>
        </button>

        <div className="flex items-center gap-2">
          {platform.isDesktop() && (
            <button
              onClick={async () => {
                const res = await platform.openTrashFolder();
                if (res?.success) {
                  showToast('Opened .trash folder in File Explorer', 'info');
                } else {
                  showToast('Failed to open .trash folder', 'warning');
                }
              }}
              className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
              title="Open .trash folder in system file manager"
            >
              <Folder01Icon size={12} />
              <span>Open folder</span>
            </button>
          )}

          {trashItems.length > 0 && (
            <button
              onClick={() => {
                openConfirmDialog({
                  title: 'Empty Trash',
                  message: 'Are you sure you want to permanently delete all items in the trash?',
                  subtext: 'All deleted files and folders will be permanently destroyed.',
                  confirmText: 'Empty Trash',
                  isDanger: true,
                  onConfirm: async () => {
                    await emptyAllTrash();
                  },
                });
              }}
              className="noether-btn noether-btn-danger text-xs py-1 px-2.5 flex items-center gap-1.5"
            >
              <Delete02Icon size={12} />
              <span>Empty trash</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4">
        <p className="text-xs text-[#777]">
          Items in trash are automatically cleared after 48 hours. You can restore them back to your vault anytime before they expire.
        </p>
      </div>

      <div className="bg-[var(--noether-bg-card,#202020)] border border-[var(--noether-border-base,#2c2c2c)] rounded-xl overflow-hidden p-3 flex flex-col gap-2">
        <div className="relative">
          <Search01Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--noether-text-muted)]" />
          <input
            type="text"
            value={trashSearchQuery}
            onChange={(e) => setTrashSearchQuery(e.target.value)}
            placeholder="Search deleted files..."
            className="w-full bg-[var(--noether-bg-input,#161616)] border border-[var(--noether-border-base,#2c2c2c)] focus:border-[var(--noether-border-strong)] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)] outline-none"
          />
        </div>

        {filteredTrashItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--noether-text-muted)]">
            <Delete02Icon size={32} className="text-[var(--noether-text-faint)] mb-2" />
            <div className="text-xs text-[var(--noether-text-secondary)] font-medium">Trash is empty</div>
            <div className="text-[11px] text-[var(--noether-text-muted)] mt-1 max-w-xs">
              Deleted files and folders will stay here for 48 hours before being automatically removed.
            </div>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar flex flex-col divide-y divide-[var(--noether-border-subtle,#282828)] mt-1">
            {filteredTrashItems.map((item) => {
              const elapsedMs = Date.now() - item.deleted_at;
              const remainingMs = Math.max(0, 48 * 60 * 60 * 1000 - elapsedMs);
              const remHours = Math.ceil(remainingMs / (60 * 60 * 1000));
              const customType = fileTypeRegistry.getByDocType(item.doc_type) || fileTypeRegistry.getByPath(item.title);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 hover:bg-[var(--noether-bg-card-hover)] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div className="w-7 h-7 rounded-lg bg-[var(--noether-bg-card)] flex items-center justify-center text-[var(--noether-text-muted)] shrink-0">
                      {item.is_folder ? (
                        <Folder01Icon size={15} />
                      ) : customType ? (
                        <DashboardSquare01Icon size={15} />
                      ) : (
                        <File01Icon size={15} />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--noether-text-primary)] truncate">
                          {customType ? fileTypeRegistry.cleanTitle(item.title) : item.title}
                        </span>
                        {customType && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] uppercase font-semibold">
                            {customType.badgeLabel || customType.extension}
                          </span>
                        )}
                        {item.is_folder ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] uppercase font-semibold">
                            Folder
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--noether-text-muted)] mt-0.5 truncate">
                        <span>{formatRelativeTime(item.deleted_at)}</span>
                        <span>•</span>
                        <span className="text-amber-500/80 font-medium">
                          Auto-clears in {remHours}h
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={async () => {
                        await restoreFromTrash(item.id);
                      }}
                      title="Restore to vault"
                      className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
                    >
                      <RotateCcwIcon size={12} />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => {
                        openConfirmDialog({
                          title: 'Delete Permanently',
                          message: `Permanently delete "${item.title}"?`,
                          subtext: 'This action cannot be undone.',
                          confirmText: 'Delete',
                          isDanger: true,
                          onConfirm: async () => {
                            await deletePermanently(item.id);
                          },
                        });
                      }}
                      title="Delete permanently"
                      className="p-1.5 text-[var(--noether-text-muted)] hover:text-rose-400 hover:bg-rose-500/15 rounded-[5px] cursor-pointer"
                    >
                      <Delete02Icon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
