/**
 * @file FolderIconsSettingsTab.tsx
 * @description
 * Settings panel for the Folder Icons extension.
 * Allows users to inspect all folders with active custom icons,
 * reset individual folder icons, or clear all custom icons.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React, { useMemo } from 'react';
import { useFolderIconsStore } from './folderIconsStore';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { getFolderIconDef } from './folderIconsCatalog';
import { HugeIconRenderer } from '@/components/common/IconPicker';
import {
  Delete02Icon,
  RotateCcwIcon,
  Folder01Icon,
  SparklesIcon,
} from '@/components/common/Icons';

export const FolderIconsSettingsTab: React.FC = () => {
  const icons = useFolderIconsStore((s) => s.icons);
  const removeFolderIcon = useFolderIconsStore((s) => s.removeFolderIcon);
  const clearAllIcons = useFolderIconsStore((s) => s.clearAllIcons);
  const openPicker = useFolderIconsStore((s) => s.openPicker);
  const documents = useDocumentStore((s) => s.documents);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);

  const customFolderEntries = useMemo(() => {
    return Object.entries(icons).map(([folderId, entry]) => {
      const folderDoc = documents.find((d) => d.id === folderId);
      const iconDef = getFolderIconDef(entry.iconId);
      return {
        folderId,
        folderTitle: folderDoc?.title || `Folder (${folderId})`,
        folderDoc,
        iconId: entry.iconId,
        iconName: iconDef?.name || entry.iconId,
        iconDef,
      };
    });
  }, [icons, documents]);

  const handleClearAll = () => {
    openConfirmDialog({
      title: 'Reset All Folder Icons',
      message: 'Are you sure you want to reset all custom folder icons back to their default chevrons?',
      confirmText: 'Reset all',
      isDanger: true,
      onConfirm: async () => {
        await clearAllIcons();
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 text-xs text-[#dcddde] max-w-2xl">
      {/* Header section */}
      <div className="flex flex-col gap-1 pb-4 border-b border-[#2d2d2d]">
        <div className="flex items-center gap-2">
          <SparklesIcon size={16} className="text-[var(--flint-accent,#ea580c)]" />
          <h3 className="text-sm font-semibold text-white">Folder Icons</h3>
        </div>
        <p className="text-[11px] text-[#888888]">
          Right-click any folder in the file tree to assign custom HugeIcons with smooth hover animations.
        </p>
      </div>

      {/* Active custom folder icons list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-white">
            Customized Folders ({customFolderEntries.length})
          </span>
          {customFolderEntries.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcwIcon size={11} />
              <span>Reset all</span>
            </button>
          )}
        </div>

        {customFolderEntries.length === 0 ? (
          <div className="p-6 rounded-lg border border-[#282828] bg-[#1a1a1a]/50 text-center text-[#777] flex flex-col items-center gap-2">
            <Folder01Icon size={24} className="text-[#555]" />
            <p className="text-[11px]">No custom folder icons configured yet.</p>
            <p className="text-[10px] text-[#666]">
              Right-click any folder in your Hearth sidebar to choose an icon.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {customFolderEntries.map((item) => {
              return (
                <div
                  key={item.folderId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#282828] bg-[#1a1a1a] hover:border-[#383838] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded bg-[#242424] flex items-center justify-center text-[var(--flint-accent,#ea580c)] shrink-0">
                      {item.iconDef ? (
                        <HugeIconRenderer iconDef={item.iconDef.iconDef} size={14} />
                      ) : (
                        <Folder01Icon size={14} />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium text-white truncate">
                        {item.folderTitle}
                      </span>
                      <span className="text-[10px] text-[#777]">
                        Icon: {item.iconName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {item.folderDoc && (
                      <button
                        type="button"
                        onClick={() => openPicker(item.folderDoc!)}
                        className="px-2 py-1 text-[10px] text-[#999] hover:text-white hover:bg-[#282828] rounded transition-colors cursor-pointer"
                      >
                        Change
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFolderIcon(item.folderId)}
                      className="p-1 text-[#777] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                      title="Remove custom icon"
                    >
                      <Delete02Icon size={12} />
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
};
