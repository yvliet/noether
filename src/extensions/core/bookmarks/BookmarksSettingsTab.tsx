import React from 'react';
import { useBookmarksSettings, DEFAULT_BOOKMARKS_SETTINGS } from './bookmarksSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { Bookmark01Icon, RotateCcwIcon } from '@/components/common/Icons';
import { SettingCard, SettingItem, Button, Toggle } from '@/sdk';

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
      <SettingCard
        title="Bookmarks"
        description="Manage bookmarked notes and quick access shortcuts."
        action={
          isModified ? (
            <Button
              size="sm"
              icon={<RotateCcwIcon size={12} />}
              onClick={() => {
                restoreDefaults();
                showToast('Restored Bookmarks defaults', 'info');
              }}
            >
              Restore defaults
            </Button>
          ) : undefined
        }
      >
        {/* Bookmarks Count & Quick View */}
        <SettingItem
          name="Active Bookmarks"
          description={`You currently have ${bookmarkedDocs.length} bookmarked ${bookmarkedDocs.length === 1 ? 'note' : 'notes'} in this vault.`}
        >
          <Button
            onClick={handleOpenBookmarks}
            icon={<Bookmark01Icon size={13} />}
          >
            Open in Sidebar
          </Button>
        </SettingItem>

        {/* Auto-sort bookmarks */}
        <SettingItem
          name="Sort bookmarks alphabetically"
          description="Automatically order bookmarked items alphabetically from A to Z."
        >
          <Toggle checked={autoSortBookmarks} onChange={setAutoSortBookmarks} />
        </SettingItem>

        {/* Show folder path */}
        <SettingItem
          name="Show folder path badge"
          description="Display note parent folder directory path in bookmark entries."
        >
          <Toggle checked={showBookmarkPath} onChange={setShowBookmarkPath} />
        </SettingItem>

        {/* Keyboard Shortcut Info */}
        <SettingItem
          name="Toggle shortcut"
          description="Quickly bookmark or unbookmark the active note while editing."
        >
          <kbd className="px-2 py-1 bg-[var(--flint-bg-input,#181818)] border border-[var(--flint-border-strong,#383838)] rounded text-[11px] font-mono text-[var(--flint-text-muted,#888)]">
            Ctrl+Shift+B
          </kbd>
        </SettingItem>
      </SettingCard>
    </div>
  );
};

export default BookmarksSettingsTab;
