import React, { useMemo, useCallback } from 'react';
import {
  useNoetherApp,
  useVaultDocuments,
  useActiveDocument,
  useActiveTab,
  useMainViewMode,
  useNoetherStore,
} from 'noether';
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
import { useTreeDragDrop } from '@/components/file-tree/useTreeDragDrop';

interface BookmarkRowProps {
  doc: any;
  isActive: boolean;
  showBookmarkPath: boolean;
  documents: any[];
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onUnbookmark: () => void;
}

const BookmarkRow: React.FC<BookmarkRowProps> = React.memo(({
  doc,
  isActive,
  showBookmarkPath,
  documents,
  onOpen,
  onContextMenu,
  onUnbookmark,
}) => {
  const dragDrop = useTreeDragDrop({ item: doc });
  const fullPath = showBookmarkPath ? getDocumentPath(doc, documents) : '';
  const parentPath = fullPath.includes('/') ? fullPath.substring(0, fullPath.lastIndexOf('/')) : '';

  return (
    <div
      onPointerDown={dragDrop.handlePointerDown}
      onClick={() => {
        if (dragDrop.hasJustDragged()) return;
        onOpen();
      }}
      onContextMenu={onContextMenu}
      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer select-none ${
        isActive
          ? 'bg-[var(--noether-bg-sidebar-active)] text-[var(--noether-text-primary)] font-normal'
          : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-bg-sidebar-hover)] hover:text-[var(--noether-text-primary)] font-normal'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <File01Icon size={14} className={isActive ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted)] shrink-0'} />
        <span className="truncate">{doc.title}</span>
        {showBookmarkPath && parentPath && (
          <span className="text-[10px] text-[var(--noether-text-muted)] font-mono truncate max-w-[120px] bg-[var(--noether-bg-card)] px-1 py-0.5 rounded shrink-0">
            {parentPath}
          </span>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onUnbookmark();
        }}
        title="Remove bookmark"
        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer"
      >
        <Cancel01Icon size={11} />
      </button>
    </div>
  );
});

export const BookmarksView: React.FC = React.memo(() => {
  const app = useNoetherApp();
  const documents = useVaultDocuments();
  const activeDocument = useActiveDocument();
  const currentTab = useActiveTab();
  const mainViewMode = useMainViewMode();

  const isSplitView = useNoetherStore('workspace', (s) => s?.isSplitView ?? false);
  const activePane = useNoetherStore('workspace', (s) => s?.activePane ?? 'main');
  const splitActiveDocumentId = useNoetherStore('workspace', (s) => s?.splitActiveDocumentId);
  const vaultPath = useNoetherStore('workspace', (s) => s?.vaultPath) ?? app.vault.vaultPath;

  const setActiveDocumentById = useCallback((id: string, _opts?: any) => {
    app.vault.openDocument(id);
  }, [app]);
  const toggleBookmark = useCallback((id: string) => {
    return app.vault.toggleBookmark(id);
  }, [app]);
  const openTab = useCallback((docId: string, title?: string, opts?: any) => {
    app.workspace.openTab(docId, title, opts);
  }, [app]);
  const openSplitTab = useCallback((docId: string, title?: string, opts?: any) => {
    app.workspace.openSplitTab(docId, title, opts);
  }, [app]);
  const showToast = useCallback((msg: string, type?: any) => {
    app.workspace.showToast(msg, type);
  }, [app]);
  const { showContextMenu } = useAppContextMenu();

  const { autoSortBookmarks, showBookmarkPath } = useBookmarksSettings();

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
            openTab(doc.id, doc.title, { replaceCurrentTab: true });
            setActiveDocumentById(doc.id, { preserveViewMode: true });
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

          return (
            <BookmarkRow
              key={doc.id}
              doc={doc}
              isActive={isActive}
              showBookmarkPath={showBookmarkPath}
              documents={documents}
              onOpen={() => {
                if (isSplitView && activePane === 'split') {
                  openSplitTab(doc.id, doc.title);
                } else {
                  openTab(doc.id, doc.title, { replaceCurrentTab: true });
                  setActiveDocumentById(doc.id, { preserveViewMode: true });
                }
              }}
              onContextMenu={(e) => handleBookmarkContextMenu(e, doc)}
              onUnbookmark={() => {
                toggleBookmark(doc.id);
              }}
            />
          );
        })
      )}
    </div>
  );
});
