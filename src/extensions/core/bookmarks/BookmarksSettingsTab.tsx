import React from 'react';
import { useBookmarksSettings, DEFAULT_BOOKMARKS_SETTINGS } from './bookmarksSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { Bookmark01Icon, RotateCcwIcon } from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';

export const BookmarksSettingsTab: React.FC = () => {
  const documents = useDocumentStore((s) => s.documents);
  const setActiveLeftView = useWorkspaceStore((s) => s.setActiveLeftView);
  const isLeftSidebarOpen = useWorkspaceStore((s) => s.isLeftSidebarOpen);
  const toggleLeftSidebar = useWorkspaceStore((s) => s.toggleLeftSidebar);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const {
    autoSortBookmarks,
    setAutoSortBookmarks,
    showBookmarkPath,
    setShowBookmarkPath,
    restoreDefaults,
  } = useBookmarksSettings();

  const isModified =
    autoSortBookmarks !== DEFAULT_BOOKMARKS_SETTINGS.autoSortBookmarks ||
    showBookmarkPath !== DEFAULT_BOOKMARKS_SETTINGS.showBookmarkPath;

  const bookmarkedDocs = documents.filter((d) => d.is_bookmarked);

  const handleOpenBookmarks = () => {
    setActiveLeftView('bookmarks');
    if (!isLeftSidebarOpen) {
      toggleLeftSidebar();
    }
    showToast('Opened Bookmarks in left sidebar', 'info');
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Bookmarks</h3>
          <p className="text-[11px] text-[#777]">Manage bookmarked notes and quick access shortcuts.</p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Bookmarks defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Bookmarks Count & Quick View */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Active Bookmarks</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              You currently have {bookmarkedDocs.length} bookmarked {bookmarkedDocs.length === 1 ? 'note' : 'notes'} in this vault.
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenBookmarks}
            className="px-3.5 py-1.5 bg-[#282828] hover:bg-[#333] active:bg-[#222] text-[#dcddde] hover:text-white rounded-[5px] border border-[#383838] hover:border-[#484848] transition-colors cursor-pointer text-xs font-medium flex items-center gap-1.5"
          >
            <Bookmark01Icon size={13} />
            <span>Open in Sidebar</span>
          </button>
        </div>

        {/* Auto-sort bookmarks */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Sort bookmarks alphabetically</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically order bookmarked items alphabetically from A to Z.
            </span>
          </div>
          <ToggleSwitch checked={autoSortBookmarks} onChange={setAutoSortBookmarks} />
        </div>

        {/* Show folder path */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show folder path badge</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display note parent folder directory path in bookmark entries.
            </span>
          </div>
          <ToggleSwitch checked={showBookmarkPath} onChange={setShowBookmarkPath} />
        </div>

        {/* Keyboard Shortcut Info */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Toggle bookmark shortcut</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Press the keyboard shortcut to bookmark or unbookmark the active note.
            </span>
          </div>
          <kbd className="px-2.5 py-1 bg-[#161616] border border-[#333] rounded text-xs text-[#aaa] font-mono">
            Ctrl+Shift+B
          </kbd>
        </div>
      </div>
    </div>
  );
};
