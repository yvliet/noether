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
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import {
  Delete02Icon,
  RotateCcwIcon,
  Folder01Icon,
} from '@/components/common/Icons';

export const FolderIconsSettingsTab: React.FC = () => {
  const icons = useFolderIconsStore((s) => s.icons);
  const showDefaultIcons = useFolderIconsStore((s) => s.showDefaultIcons);
  const setShowDefaultIcons = useFolderIconsStore((s) => s.setShowDefaultIcons);
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

  const isModified = !showDefaultIcons || customFolderEntries.length > 0;

  const handleClearAll = () => {
    openConfirmDialog({
      title: 'Reset All Folder Icons',
      message: 'Are you sure you want to reset all custom folder icons back to their defaults?',
      confirmText: 'Reset all',
      isDanger: true,
      onConfirm: async () => {
        await clearAllIcons();
      },
    });
  };

  const handleRestoreDefaults = () => {
    setShowDefaultIcons(true);
    if (customFolderEntries.length > 0) {
      handleClearAll();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header section matching other settings */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Folder Icons</h3>
          <p className="text-[11px] text-[#777]">
            Configure folder icon appearance and manage custom folder assignments.
          </p>
        </div>
        {isModified && (
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      {/* General Configuration Card */}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Show default folder icons */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show default folder icons</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display closed and open folder icons next to chevrons when no custom icon is set.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!showDefaultIcons && (
              <button
                type="button"
                onClick={() => setShowDefaultIcons(true)}
                title="Restore default (Enabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={showDefaultIcons} onChange={setShowDefaultIcons} />
          </div>
        </div>

        {/* Customized Folders count / actions */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Customized Folders</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              You currently have {customFolderEntries.length} folder{customFolderEntries.length === 1 ? '' : 's'} with custom icons assigned.
            </span>
          </div>
          {customFolderEntries.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-[5px] cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcwIcon size={12} />
              <span>Reset all</span>
            </button>
          )}
        </div>
      </div>

      {/* Active custom folder icons list (if any) */}
      {customFolderEntries.length > 0 && (
        <div className="flex flex-col gap-2 px-1">
          <span className="text-xs font-medium text-[#aaa] px-3">Folder icon assignments</span>
          <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
            {customFolderEntries.map((item) => (
              <div
                key={item.folderId}
                className="flex items-center justify-between p-3 hover:bg-[#242424]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded bg-[#282828] flex items-center justify-center text-[var(--flint-accent,#ea580c)] shrink-0">
                    {item.iconDef ? (
                      <HugeIconRenderer iconDef={item.iconDef.iconDef} size={14} />
                    ) : (
                      <Folder01Icon size={14} />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-normal text-white truncate">
                      {item.folderTitle}
                    </span>
                    <span className="text-[11px] text-[#777]">
                      Icon: {item.iconName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.folderDoc && (
                    <button
                      type="button"
                      onClick={() => openPicker(item.folderDoc!)}
                      className="px-2.5 py-1 text-xs text-[#aaa] hover:text-white hover:bg-[#2e2e2e] rounded-[5px] border border-[#333] cursor-pointer"
                    >
                      Change
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFolderIcon(item.folderId)}
                    className="p-1.5 text-[#777] hover:text-rose-400 hover:bg-rose-500/10 rounded-[5px] cursor-pointer"
                    title="Remove custom icon"
                  >
                    <Delete02Icon size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
