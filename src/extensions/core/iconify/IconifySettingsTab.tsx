/**
 * @file IconifySettingsTab.tsx
 * @description
 * Settings panel for the Iconify extension.
 * Allows users to configure default icon visibility, inspect all folders and files
 * with active custom icons, filter by item type, and manage or reset icon assignments.
 * Zero artificial micro-interaction animations/transitions.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { useIconifyStore } from './iconifyStore';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DynamicHugeIcon } from '@/components/common/IconPicker';
import { EmojiRenderer, EmojiStyle, EMOJI_STYLE_LABELS } from '@/components/common/emoji';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { CustomSelect } from '@/components/common/CustomSelect';
import {
  Delete02Icon,
  RotateCcwIcon,
  Search01Icon,
} from '@/components/common/Icons';

export const IconifySettingsTab: React.FC = () => {
  const icons = useIconifyStore((s) => s.icons);
  const showDefaultFolderIcons = useIconifyStore((s) => s.showDefaultFolderIcons);
  const setShowDefaultFolderIcons = useIconifyStore((s) => s.setShowDefaultFolderIcons);
  const showDefaultFileIcons = useIconifyStore((s) => s.showDefaultFileIcons);
  const setShowDefaultFileIcons = useIconifyStore((s) => s.setShowDefaultFileIcons);
  const showEditorTitleIcon = useIconifyStore((s) => s.showEditorTitleIcon);
  const setShowEditorTitleIcon = useIconifyStore((s) => s.setShowEditorTitleIcon);
  const emojiStyle = useIconifyStore((s) => s.emojiStyle);
  const setEmojiStyle = useIconifyStore((s) => s.setEmojiStyle);
  const removeIcon = useIconifyStore((s) => s.removeIcon);
  const clearAllIcons = useIconifyStore((s) => s.clearAllIcons);
  const openPicker = useIconifyStore((s) => s.openPicker);
  const documents = useDocumentStore((s) => s.documents);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);

  const [filterType, setFilterType] = useState<'all' | 'folder' | 'file'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allEntries = useMemo(() => {
    return Object.entries(icons).map(([itemId, entry]) => {
      const doc = documents.find((d) => d.id === itemId);
      const isFolder = entry.itemType === 'folder' || (doc ? Boolean(doc.is_folder) : false);
      return {
        itemId,
        title: doc?.title || `${isFolder ? 'Folder' : 'File'} (${itemId})`,
        isFolder,
        doc,
        iconId: entry.iconId,
        iconName: entry.iconId,
        color: entry.color,
      };
    });
  }, [icons, documents]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((item) => {
      if (filterType === 'folder' && !item.isFolder) return false;
      if (filterType === 'file' && item.isFolder) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchIcon = item.iconName.toLowerCase().includes(query);
        return matchTitle || matchIcon;
      }
      return true;
    });
  }, [allEntries, filterType, searchQuery]);

  const folderCount = useMemo(() => allEntries.filter((e) => e.isFolder).length, [allEntries]);
  const fileCount = useMemo(() => allEntries.filter((e) => !e.isFolder).length, [allEntries]);

  const isModified =
    !showDefaultFolderIcons ||
    showDefaultFileIcons ||
    !showEditorTitleIcon ||
    emojiStyle !== 'native' ||
    allEntries.length > 0;

  const handleClearAll = () => {
    openConfirmDialog({
      title: 'Reset All Custom Icons',
      message: 'Are you sure you want to reset all custom folder and file icons back to their defaults?',
      confirmText: 'Reset all',
      isDanger: true,
      onConfirm: async () => {
        await clearAllIcons();
      },
    });
  };

  const handleRestoreDefaults = () => {
    setShowDefaultFolderIcons(true);
    setShowDefaultFileIcons(false);
    setShowEditorTitleIcon(true);
    setEmojiStyle('native');
    if (allEntries.length > 0) {
      handleClearAll();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header section */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Iconify</h3>
          <p className="text-[11px] text-[#777]">
            Customize icons for folders, notes, files, and tabs with persistent SQLite storage.
          </p>
        </div>
        {isModified && (
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="flint-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
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
              Display open and closed folder icons beside chevrons when no custom icon is assigned.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!showDefaultFolderIcons && (
              <button
                type="button"
                onClick={() => setShowDefaultFolderIcons(true)}
                title="Restore default (Enabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={showDefaultFolderIcons} onChange={setShowDefaultFolderIcons} />
          </div>
        </div>

        {/* Show default file icons */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show default file icons</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display note and canvas icons beside uncustomized files in the file tree.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showDefaultFileIcons && (
              <button
                type="button"
                onClick={() => setShowDefaultFileIcons(false)}
                title="Restore default (Disabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={showDefaultFileIcons} onChange={setShowDefaultFileIcons} />
          </div>
        </div>

        {/* Show icon next to note title in editor */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show icon next to note title in editor</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display the assigned custom icon to the left of the note title in the editor.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!showEditorTitleIcon && (
              <button
                type="button"
                onClick={() => setShowEditorTitleIcon(true)}
                title="Restore default (Enabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={showEditorTitleIcon} onChange={setShowEditorTitleIcon} />
          </div>
        </div>

        {/* Emoji Style Selection */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-normal text-[#dcddde]">Emoji Style</span>
              {/* Live preview */}
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#181818] border border-[#2b2b2b] rounded">
                <EmojiRenderer emoji="🔥" size={14} style={emojiStyle} />
                <EmojiRenderer emoji="🚀" size={14} style={emojiStyle} />
                <EmojiRenderer emoji="✨" size={14} style={emojiStyle} />
                <EmojiRenderer emoji="💡" size={14} style={emojiStyle} />
                <EmojiRenderer emoji="🎉" size={14} style={emojiStyle} />
              </div>
            </div>
            <span className="text-[11px] text-[#777] mt-0.5">
              Choose the rendering set for emoji icons.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {emojiStyle !== 'native' && (
              <button
                type="button"
                onClick={() => setEmojiStyle('native')}
                title="Restore default (Native (System))"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <CustomSelect<EmojiStyle>
              value={emojiStyle}
              onChange={setEmojiStyle}
              options={[
                { value: 'native', label: 'Native (System)' },
                { value: 'twemoji', label: 'Twemoji' },
                { value: 'apple', label: 'Apple Emoji' },
                { value: 'google', label: 'Google Noto' },
                { value: 'whatsapp', label: 'WhatsApp Emoji' },
              ]}
            />
          </div>
        </div>

        {/* Customized Items summary / reset all */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Customized Items</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              {allEntries.length} total custom icon{allEntries.length === 1 ? '' : 's'} assigned ({folderCount} folder{folderCount === 1 ? '' : 's'}, {fileCount} file{fileCount === 1 ? '' : 's'}).
            </span>
          </div>
          {allEntries.length > 0 && (
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

      {/* Active custom icon assignments list */}
      {allEntries.length > 0 && (
        <div className="flex flex-col gap-2 px-1">
          {/* Filter tabs and search bar */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center bg-[#1c1c1c] p-0.5 rounded-lg border border-[#2a2a2a]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 text-xs rounded-md cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#2a2a2a] text-white font-medium'
                    : 'text-[#888] hover:text-[#dcddde]'
                }`}
              >
                All ({allEntries.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('folder')}
                className={`px-2.5 py-1 text-xs rounded-md cursor-pointer ${
                  filterType === 'folder'
                    ? 'bg-[#2a2a2a] text-white font-medium'
                    : 'text-[#888] hover:text-[#dcddde]'
                }`}
              >
                Folders ({folderCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('file')}
                className={`px-2.5 py-1 text-xs rounded-md cursor-pointer ${
                  filterType === 'file'
                    ? 'bg-[#2a2a2a] text-white font-medium'
                    : 'text-[#888] hover:text-[#dcddde]'
                }`}
              >
                Files ({fileCount})
              </button>
            </div>

            <div className="relative flex items-center">
              <Search01Icon size={12} className="absolute left-2.5 text-[#666] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter items..."
                className="bg-[#1c1c1c] border border-[#2a2a2a] text-xs text-[#dcddde] placeholder-[#666] pl-7 pr-2.5 py-1 rounded-lg focus:outline-none focus:border-[#444] w-44"
              />
            </div>
          </div>

          <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
            {filteredEntries.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#777]">
                No items match your filter.
              </div>
            ) : (
              filteredEntries.map((item) => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between p-3 hover:bg-[#242424]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-6 h-6 rounded bg-[#282828] flex items-center justify-center text-[var(--flint-accent,#ea580c)] shrink-0"
                      style={item.color ? { color: item.color } : undefined}
                    >
                      {item.iconId.startsWith('emoji:') ? (
                        <EmojiRenderer emoji={item.iconId.slice(6)} size={14} style={emojiStyle} />
                      ) : (
                        <DynamicHugeIcon iconId={item.iconId} size={14} color={item.color || 'currentColor'} />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-normal text-white truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-[#181818] border border-[#282828] text-[#888]">
                          {item.isFolder ? 'Folder' : 'File'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#777]">
                        Icon: {item.iconName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        openPicker({
                          id: item.itemId,
                          title: item.title,
                          isFolder: item.isFolder,
                        })
                      }
                      className="px-2.5 py-1 text-xs text-[#aaa] hover:text-white hover:bg-[#2e2e2e] rounded-[5px] border border-[#333] cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => removeIcon(item.itemId)}
                      className="p-1.5 text-[#777] hover:text-rose-400 hover:bg-rose-500/10 rounded-[5px] cursor-pointer"
                      title="Remove custom icon"
                    >
                      <Delete02Icon size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IconifySettingsTab;
