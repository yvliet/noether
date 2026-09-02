import React, { useMemo, useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  Bookmark01Icon,
  File01Icon,
  Cancel01Icon,
  SplitRightIcon,
  Copy01Icon,
} from '@/components/common/Icons';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { getDocumentPath } from '@/lib/db/documents';
import { useBookmarksSettings } from './bookmarksSettings';

export const BookmarksView: React.FC = React.memo(() => {
  const documents = useDocumentStore((s) => s.documents);
  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);
  const toggleBookmark = useDocumentStore((s) => s.toggleBookmark);

  const { autoSortBookmarks, showBookmarkPath } = useBookmarksSettings();

  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const splitTabs = useWorkspaceStore((s) => s.splitTabs);
  const splitActiveTabId = useWorkspaceStore((s) => s.splitActiveTabId);
  const isSplitView = useWorkspaceStore((s) => s.isSplitView);
  const activePane = useWorkspaceStore((s) => s.activePane);
  const openSplitTab = useWorkspaceStore((s) => s.openSplitTab);
  const openTab = useWorkspaceStore((s) => s.openTab);
  const splitActiveDocumentId = useWorkspaceStore((s) => s.splitActiveDocumentId);
  const mainViewMode = useWorkspaceStore((s) => s.mainViewMode);
  const vaultPath = useWorkspaceStore((s) => s.vaultPath);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const { showContextMenu } = useAppContextMenu();

  const currentTab = useMemo(() => {
    if (isSplitView && activePane === 'split') {
      return splitTabs.find((t) => t.id === splitActiveTabId);
    }
    return tabs.find((t) => t.id === activeTabId);
  }, [isSplitView, activePane, splitTabs, splitActiveTabId, tabs, activeTabId]);

  const currentViewType = currentTab?.view_type || currentTab?.view_mode || mainViewMode;
  const isDocumentMode = (!currentViewType || currentViewType === 'document') && mainViewMode !== 'graph' && mainViewMode !== 'canvas' && mainViewMode !== 'marketplace';

  const bookmarkedDocs = useMemo(() => {
    const list = documents.filter((d) => !d.is_folder && d.is_bookmarked);
    if (autoSortBookmarks) {
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [documents, autoSortBookmarks]);

  const handleBookmarkContextMenu = useCallback((e: React.MouseEvent, doc: any) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        id: 'open',
        title: 'Open note',
        icon: <File01Icon size={14} />,
        onClick: () => {
          if (isSplitView && activePane === 'split') {
            openSplitTab(doc.id, doc.title);
          } else {
            openTab(doc.id, doc.title);
            setActiveDocumentById(doc.id);
          }
        },
      },
      {
        id: 'split-right',
        title: 'Open to the right',
        icon: <SplitRightIcon size={14} />,
        onClick: () => {
          openSplitTab(doc.id, doc.title);
        },
      },
      { type: 'separator' },
      {
        id: 'copy-link',
        title: 'Copy note link',
        icon: <Copy01Icon size={14} />,
        onClick: () => {
          navigator.clipboard.writeText(`[[${doc.title}]]`);
          showToast(`Copied [[${doc.title}]] link`, 'info');
        },
      },
      {
        id: 'copy-path',
        title: 'Copy relative path',
        icon: <Copy01Icon size={14} />,
        onClick: () => {
          const path = getDocumentPath(doc, documents);
          navigator.clipboard.writeText(path);
          showToast('Copied path to clipboard', 'info');
        },
      },
      { type: 'separator' },
      {
        id: 'unbookmark',
        title: 'Remove bookmark',
        icon: <Cancel01Icon size={14} className="text-red-400" />,
        onClick: () => {
          toggleBookmark(doc.id);
          showToast(`Removed bookmark for "${doc.title}"`, 'info');
        },
      },
    ];

    showContextMenu(e, items);
  }, [isSplitView, activePane, openSplitTab, openTab, setActiveDocumentById, showToast, showContextMenu, documents, toggleBookmark]);

  return (
    <div className="flex flex-col h-full overflow-y-auto px-2 py-1 select-none">
      {bookmarkedDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-[#666] text-xs gap-2">
          <Bookmark01Icon size={24} className="opacity-40" />
          <span>No bookmarked notes</span>
          <span className="text-[11px] text-[#555]">Bookmark notes with Ctrl+Shift+B</span>
        </div>
      ) : (
        bookmarkedDocs.map((doc) => {
          const isActive =
            isDocumentMode &&
            (isSplitView && activePane === 'split'
              ? (currentTab ? currentTab.document_id === doc.id : splitActiveDocumentId === doc.id)
              : (currentTab ? currentTab.document_id === doc.id : activeDocument?.id === doc.id));
          const fullPath = showBookmarkPath ? getDocumentPath(doc, documents) : '';
          const parentPath = fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/')) : '';

          return (
            <div
              key={doc.id}
              onClick={() => {
                if (isSplitView && activePane === 'split') {
                  openSplitTab(doc.id, doc.title);
                } else {
                  openTab(doc.id, doc.title);
                  setActiveDocumentById(doc.id);
                }
              }}
              onContextMenu={(e) => handleBookmarkContextMenu(e, doc)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#2a2a2a] text-white font-normal'
                  : 'text-[#9ca3af] hover:bg-[#202020] hover:text-[#dcddde] font-normal'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <File01Icon size={14} className={isActive ? 'text-white' : 'text-[#777] shrink-0'} />
                <span className="truncate">{doc.title}</span>
                {showBookmarkPath && parentPath && (
                  <span className="text-[10px] text-[#666] font-mono truncate max-w-[120px] bg-[#1a1a1a] px-1 py-0.5 rounded shrink-0">
                    {parentPath}
                  </span>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(doc.id);
                }}
                title="Remove bookmark"
                className="opacity-0 group-hover:opacity-100 p-1 text-[#777] hover:text-white transition-all"
              >
                <Cancel01Icon size={11} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
});
