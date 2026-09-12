import React, { useMemo, useCallback, useEffect } from 'react';

import {
  Folder01Icon,
  Search01Icon,
  PlusSignIcon,
  Cancel01Icon,
  NeuralNetworkIcon,
  Layout01Icon,
  LayoutLeftIcon,
  LayoutAlignLeftIcon,
  LayoutRightIcon,
  LayoutAlignRightIcon,
  SplitRightIcon,
  SplitDownIcon,
  Copy01Icon,
  Alert02Icon,
  StickyNote02Icon,
  BookOpen01Icon,
  WindowMinimizeIcon,
  WindowMaximizeIcon,
  WindowRestoreIcon,
  WindowCloseIcon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSidebarTabs, useNoetherApp, useViews, useTabDecorators } from '@/core/app/AppContext';
import { useSidebarDockStore, DockItem, DockZone } from '@/store/sidebarDockStore';
import { BrokenEmbedIndicator } from '@/components/common/BrokenEmbedAlert';


import { useIsMaximized } from '@/hooks/useIsMaximized';
import { useTabReorder, useDockReorder } from '@/hooks/useTabReorder';
import { TabItem } from '@/types';
import { platform } from '@/lib/platform/platformAdapter';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { getDocumentPath } from '@/lib/db/documents';
import { getTopRowLeaves } from '@/lib/layout/layoutTree';
import { useContentScrolled } from '@/hooks/useContentScrolled';

interface WindowHeaderTopPaneTabsProps {
  paneId: string;
  isFirst: boolean;
  isLast: boolean;
  isOnly: boolean;
  totalColumns: number;
  renderTabIcon: (tab: TabItem, isActive: boolean, isDimmed?: boolean) => React.ReactNode;
  getTabDisplayTitle: (tab: TabItem) => string;
  getTabTooltip: (tab: TabItem) => string;
}

const WindowHeaderTopPaneTabs: React.FC<WindowHeaderTopPaneTabsProps> = React.memo(
  ({ paneId, isFirst, isLast, isOnly, totalColumns, renderTabIcon, getTabDisplayTitle, getTabTooltip }) => {
    const panes = useWorkspaceStore((s) => s.panes);
    const paneModel = panes[paneId];
    const tabs = useMemo(() => paneModel?.tabs || [], [paneModel?.tabs]);
    const activeTabId = paneModel?.activeTabId || null;
    const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId);
    const setFocusedPane = useWorkspaceStore((s) => s.setFocusedPane);
    const setActiveTabInPane = useWorkspaceStore((s) => s.setActiveTabInPane);
    const openEmptyTabInPane = useWorkspaceStore((s) => s.openEmptyTabInPane);
    const closeTabInPane = useWorkspaceStore((s) => s.closeTabInPane);
    const reorderTabsInPane = useWorkspaceStore((s) => s.reorderTabsInPane);
    const closePane = useWorkspaceStore((s) => s.closePane);
    const splitPane = useWorkspaceStore((s) => s.splitPane);
    const togglePinTab = useWorkspaceStore((s) => s.togglePinTab);

    const vaultPath = useWorkspaceStore((s) => s.vaultPath);
    const showToast = useWorkspaceStore((s) => s.showToast);
    const documents = useDocumentStore((s) => s.documents);
    const { showContextMenu } = useAppContextMenu();

    const handleReorder = useCallback(
      (src: number, dst: number) => {
        reorderTabsInPane(paneId, src, dst);
      },
      [reorderTabsInPane, paneId]
    );

    const tabReorder = useTabReorder({
      paneId,
      items: tabs,
      onReorder: handleReorder,
      getDisplayTitle: (tab) => getTabDisplayTitle(tab),
    });

    const isFocused = focusedPaneId === paneId;
    const isContentScrolled = useContentScrolled(paneId);
    const activeIndex = useMemo(() => tabs.findIndex((t) => t.id === activeTabId), [tabs, activeTabId]);

    const handleContextMenu = useCallback(
      (e: React.MouseEvent, tab: TabItem, index: number) => {
        e.preventDefault();
        e.stopPropagation();

        const isDoc =
          (!tab.view_type || tab.view_type === 'document') &&
          (!tab.view_mode || tab.view_mode === 'document') &&
          Boolean(tab.document_id && !tab.document_id.startsWith('__'));
        const doc = isDoc ? documents.find((d) => d.id === tab.document_id) : null;

        const isTabEmpty = (!tab.document_id || tab.document_id === '') && (!tab.view_type || tab.view_type === 'document');
        const canCloseTab = tabs.length > 1 || !isOnly || !isTabEmpty;

        const items: ContextMenuItem[] = [
          {
            id: 'toggle-pin',
            title: tab.is_pinned ? 'Unpin tab' : 'Pin tab',
            onClick: () => {
              togglePinTab(tab.id);
            },
          },
          { type: 'separator' },
          {
            id: 'close-tab',
            title: 'Close tab',
            shortcut: 'Ctrl+W',
            disabled: !canCloseTab,
            onClick: () => {
              closeTabInPane(paneId, tab.id);
            },
          },
          {
            id: 'close-other-tabs',
            title: 'Close other tabs',
            disabled: tabs.length <= 1,
            onClick: () => {
              for (const other of tabs) {
                if (other.id !== tab.id && !other.is_pinned) {
                  closeTabInPane(paneId, other.id);
                }
              }
            },
          },
          {
            id: 'close-tabs-right',
            title: 'Close tabs to the right',
            disabled: index >= tabs.length - 1,
            onClick: () => {
              const toClose = tabs.slice(index + 1);
              for (const other of toClose) {
                if (!other.is_pinned) {
                  closeTabInPane(paneId, other.id);
                }
              }
            },
          },
          { type: 'separator' },
          {
            id: 'split-right',
            title: 'Split right',
            icon: <SplitRightIcon size={14} />,
            onClick: () => {
              splitPane(paneId, 'horizontal', tab.document_id, tab.title, {
                viewMode: tab.view_mode,
                viewType: tab.view_type,
                icon: tab.icon,
                metadata: tab.metadata,
              });
            },
          },
          {
            id: 'split-down',
            title: 'Split down',
            icon: <SplitDownIcon size={14} />,
            onClick: () => {
              splitPane(paneId, 'vertical', tab.document_id, tab.title, {
                viewMode: tab.view_mode,
                viewType: tab.view_type,
                icon: tab.icon,
                metadata: tab.metadata,
              });
            },
          },
          {
            id: 'duplicate-tab',
            title: 'Duplicate tab',
            onClick: () => {
              splitPane(paneId, 'horizontal', tab.document_id, tab.title, {
                viewMode: tab.view_mode,
                viewType: tab.view_type,
                icon: tab.icon,
                metadata: tab.metadata,
              });
            },
          },
        ];

        if (!isOnly) {
          items.push({ type: 'separator' });
          items.push({
            id: 'close-pane',
            title: 'Close split pane',
            onClick: () => {
              closePane(paneId);
            },
          });
        }

        if (doc) {
          items.push({ type: 'separator' });
          items.push({
            id: 'copy-path',
            title: 'Copy path',
            icon: <Copy01Icon size={14} />,
            submenu: [
              {
                id: 'copy-rel',
                title: 'Copy relative path',
                onClick: async () => {
                  const rel = getDocumentPath(doc, documents) + '.md';
                  await navigator.clipboard.writeText(rel);
                  showToast('Copied relative path', 'success');
                },
              },
              {
                id: 'copy-abs',
                title: 'Copy absolute path',
                onClick: async () => {
                  const rel = getDocumentPath(doc, documents) + '.md';
                  const abs = vaultPath ? `${vaultPath}/${rel}` : `/${rel}`;
                  await navigator.clipboard.writeText(abs);
                  showToast('Copied absolute path', 'success');
                },
              },
              {
                id: 'copy-md',
                title: 'Copy Markdown link',
                onClick: async () => {
                  await navigator.clipboard.writeText(`[[${doc.title}]]`);
                  showToast('Copied Markdown link', 'success');
                },
              },
            ],
          });
        }

        showContextMenu(e, items, { scope: 'tab', data: tab });
      },
      [tabs, paneId, isOnly, closeTabInPane, togglePinTab, splitPane, closePane, documents, vaultPath, showToast, showContextMenu]
    );

    const handleBarContextMenu = useCallback(
      (e: React.MouseEvent) => {
        if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('[data-tooltip]')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        const items: ContextMenuItem[] = [
          {
            id: 'new-tab',
            title: 'New tab',
            onClick: () => {
              setFocusedPane(paneId);
              openEmptyTabInPane(paneId);
            },
          },
        ];

        if (!isOnly) {
          items.push({ type: 'separator' });
          items.push({
            id: 'close-pane',
            title: 'Close split pane',
            isDanger: true,
            onClick: () => {
              closePane(paneId);
            },
          });
        }

        showContextMenu(e, items);
      },
      [paneId, isOnly, openEmptyTabInPane, setFocusedPane, closePane, showContextMenu]
    );

    const widthStyle = useMemo(() => {
      if (isOnly) {
        return { flex: 1 };
      }
      if (!isLast) {
        return {
          width: totalColumns === 2 ? 'var(--noether-split-pane-width, 50%)' : `calc(var(--noether-main-width, 100%) / ${totalColumns})`,
          flex: 'none',
          maxWidth: totalColumns === 2 ? 'var(--noether-split-pane-width, 50%)' : `calc(var(--noether-main-width, 100%) / ${totalColumns})`,
        };
      }
      return { flex: 1 };
    }, [isOnly, isLast, totalColumns]);

    return (
      <div
        data-pane-id={paneId}
        data-no-drag="true"
        onContextMenu={handleBarContextMenu}
        style={
          {
            WebkitAppRegion: 'no-drag',
            ...widthStyle,
          } as unknown as React.CSSProperties
        }
        className="flex items-end h-[41px] pl-6 pr-2 min-w-0 z-10 overflow-visible relative"
      >
        <div
          ref={tabReorder.containerRef}
          data-no-drag="true"
          className="flex items-end gap-[2px] shrink min-w-0 overflow-visible relative"
        >
          {tabs.map((tab, index) => {
            const isTabActive = tab.id === activeTabId;
            const isFocusedActive = isTabActive && isFocused;
            const isInactiveActive = isTabActive && !isFocused;
            const displayTitle = getTabDisplayTitle(tab);
            const isDraggingThis = tabReorder.isDragging && tabReorder.dragIndex === index;
            const isNext =
              activeIndex !== -1 &&
              tabs.length > 1 &&
              (index === activeIndex + 1 || (tabs.length > 2 && activeIndex === tabs.length - 1 && index === 0));
            const isPrev =
              activeIndex !== -1 &&
              tabs.length > 1 &&
              (index === activeIndex - 1 || (tabs.length > 2 && activeIndex === 0 && index === tabs.length - 1));

            const tabShortcuts: string[] = [];
            if (isNext) tabShortcuts.push('Ctrl + Tab', 'Alt + E');
            else if (isPrev) tabShortcuts.push('Ctrl + Shift + Tab', 'Alt + Q');

            let numberShortcut: string | undefined;
            if (index < 8) numberShortcut = `Ctrl + ${index + 1}`;
            else if (index === tabs.length - 1) numberShortcut = 'Ctrl + 9';
            if (numberShortcut) tabShortcuts.push(numberShortcut);

            const tabReorderStyle = tabReorder.getTabStyle(index, isTabActive);
            const isSingleTab = tabs.length <= 1 && isOnly;
            const isTabEmpty = (!tab.document_id || tab.document_id === '') && (!tab.view_type || tab.view_type === 'document');
            const canCloseTab = !isSingleTab || !isTabEmpty;

            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                data-tab-doc-id={tab.document_id || ''}
                ref={(el) => tabReorder.registerTabRef(index, el)}
                data-no-drag="true"
                onPointerDown={(e) => tabReorder.handlePointerDown(index, e)}
                onClick={(e) => {
                  if (tabReorder.hasDragged()) return;
                  e.stopPropagation();
                  setFocusedPane(paneId);
                  setActiveTabInPane(paneId, tab.id);
                }}
                onAuxClick={(e) => {
                  if (e.button === 1 && canCloseTab) {
                    e.preventDefault();
                    e.stopPropagation();
                    closeTabInPane(paneId, tab.id);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, tab, index)}
                data-tooltip={tabReorder.isDragging ? undefined : getTabTooltip(tab)}
                data-shortcuts={!tabReorder.isDragging && tabShortcuts.length > 0 ? JSON.stringify(tabShortcuts) : undefined}
                style={{
                  WebkitAppRegion: 'no-drag',
                  color: isFocusedActive
                    ? 'var(--noether-text-primary)'
                    : isInactiveActive
                    ? 'var(--noether-text-secondary)'
                    : 'var(--noether-text-muted)',
                  ...tabReorderStyle,
                } as React.CSSProperties}
                className={`group relative flex items-center gap-1.5 px-2.5 text-xs cursor-pointer select-none w-[180px] max-w-[180px] min-w-[36px] h-[36px] shrink border-0 ${
                  isTabActive
                    ? 'rounded-t-[7px] bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] font-normal z-20 shadow-xs overflow-visible'
                    : 'bg-transparent font-normal hover:z-30'
                }`}
              >
                {!isTabActive && (
                  <div
                    style={{
                      background: 'var(--noether-bg-tab-hover, var(--noether-bg-card-hover))',
                      opacity: isDraggingThis ? 1 : undefined,
                    }}
                    className={`absolute inset-x-0 top-0 bottom-[3px] rounded-[6px] pointer-events-none z-0 ${
                      isDraggingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  />
                )}

                {isTabActive && (
                  <>
                    <svg
                      className="absolute -bottom-[1px] -left-[8px] w-[8px] h-[9px] pointer-events-none z-30 opacity-100"
                      viewBox="0 0 8 9"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 0 8 A 8 8 0 0 0 8 0 V 9 H 0 Z"
                        style={{
                          fill: 'var(--noether-tab-corner-fill, var(--noether-bg-tab-active, var(--noether-bg-main)))',
                        }}
                      />
                    </svg>

                    <svg
                      className="absolute -bottom-[1px] -right-[8px] w-[8px] h-[9px] pointer-events-none z-30 opacity-100"
                      viewBox="0 0 8 9"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 0 0 A 8 8 0 0 0 8 8 V 9 H 0 Z"
                        style={{
                          fill: 'var(--noether-tab-corner-fill, var(--noether-bg-tab-active, var(--noether-bg-main)))',
                        }}
                      />
                    </svg>

                    <div
                      style={{
                        background: 'var(--noether-tab-corner-fill, var(--noether-bg-tab-active, var(--noether-bg-main)))',
                      }}
                      className="absolute -bottom-[1px] left-0 right-0 h-[2px] pointer-events-none z-30 opacity-100"
                    />
                  </>
                )}

                {/*
                 * Scroll-triggered shadow on the active tab icon + title.
                 *
                 * INTENTIONAL ANIMATION EXCEPTION: This 150ms opacity transition is explicitly
                 * allowed despite the zero-animation rule. Without it, the shadow pops in/out
                 * abruptly when elements are dragged across or content scrolls behind the tab
                 * header, creating a choppy visual artifact. The short fade keeps it smooth
                 * without feeling sluggish or "animated" in the UI sense.
                 */}
                <div
                  className="relative z-10 flex items-center gap-1.5 min-w-0 flex-1 -translate-y-[2px] group-hover:pr-6"
                  style={{
                    filter: isTabActive && isContentScrolled
                      ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))'
                      : 'none',
                    // Intentional transition exception: prevents choppy pop when elements move behind the tab
                    transition: 'filter 150ms ease',
                  }}
                >
                  {renderTabIcon(tab, isTabActive, isInactiveActive)}
                  <span
                    className={`truncate flex-1 min-w-0 text-[12px] ${
                      isFocusedActive
                        ? 'text-[var(--noether-text-primary)]'
                        : isInactiveActive
                        ? 'text-[var(--noether-text-secondary)] opacity-85'
                        : 'text-[var(--noether-text-muted)]'
                    }`}
                  >
                    {displayTitle}
                  </span>
                  <BrokenEmbedIndicator documentId={tab.document_id} position="bottom" className="ml-1" />
                </div>

                {canCloseTab && (
                  <button
                    type="button"
                    data-no-drag="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTabInPane(paneId, tab.id);
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 z-20 text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)]"
                  >
                    <Cancel01Icon size={13} />
                  </button>
                )}
              </div>
            );
          })}
          {tabReorder.dropIndicatorLeft !== null && (
            <div
              style={{
                left: `${tabReorder.dropIndicatorLeft}px`,
              }}
              className="absolute bottom-[7px] w-[3px] h-[20px] bg-white rounded-full pointer-events-none z-50 shadow-[0_0_4px_rgba(255,255,255,0.6)]"
            />
          )}
        </div>

        <button
          onClick={() => {
            setFocusedPane(paneId);
            openEmptyTabInPane(paneId);
          }}
          title="New tab (Ctrl+T)"
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] shrink-0 self-center ml-1.5 cursor-pointer"
        >
          <PlusSignIcon size={14} />
        </button>
      </div>
    );
  }
);

export const WindowHeader: React.FC = React.memo(() => {
  const app = useNoetherApp();
  useViews(); // Subscribes to view registry changes
  const rightTabs = useSidebarTabs('right');
  const leftTabs = useSidebarTabs('left');

  const showTabTitleBar = useSettingsStore((s) => s.showTabTitleBar);
  const activeLeftView = useWorkspaceStore((s) => s.activeLeftView);
  const setActiveLeftView = useWorkspaceStore((s) => s.setActiveLeftView);
  const isLeftSidebarOpen = useWorkspaceStore((s) => s.isLeftSidebarOpen);
  const toggleLeftSidebar = useWorkspaceStore((s) => s.toggleLeftSidebar);
  const leftSidebarWidth = useWorkspaceStore((s) => s.leftSidebarWidth);
  const isRightSidebarOpen = useWorkspaceStore((s) => s.isRightSidebarOpen);
  const toggleRightSidebar = useWorkspaceStore((s) => s.toggleRightSidebar);
  const rightSidebarWidth = useWorkspaceStore((s) => s.rightSidebarWidth);
  const activeRightTab = useWorkspaceStore((s) => s.activeRightTab);
  const setActiveRightTab = useWorkspaceStore((s) => s.setActiveRightTab);
  const layoutTree = useWorkspaceStore((s) => s.layoutTree);
  const panes = useWorkspaceStore((s) => s.panes);
  const closeTabInPane = useWorkspaceStore((s) => s.closeTabInPane);
  const documents = useDocumentStore((s) => s.documents);
  const isMaximized = useIsMaximized();
  const isMac = useMemo(() => platform.isMacOS(), []);

  const topRowLeaves = useMemo(() => getTopRowLeaves(layoutTree), [layoutTree]);

  const handleMinimize = useCallback(() => {
    platform.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    platform.maximize();
  }, []);

  const handleClose = useCallback(() => {
    platform.close();
  }, []);

  // Automatically delete tabs whose extension has been deleted from disk/system
  useEffect(() => {
    if (!app.extensions.isReady) return;
    for (const [paneId, model] of Object.entries(panes)) {
      for (const tab of model.tabs) {
        const viewType =
          tab.view_type ||
          tab.view_mode ||
          (tab.document_id?.startsWith('__') ? tab.document_id.replace(/^__/, '').replace(/__$/, '') : '');
        if (viewType && viewType !== 'document') {
          const state = app.extensions.getViewExtensionState(viewType);
          if (state.state === 'deleted') {
            closeTabInPane(paneId, tab.id);
          }
        }
      }
    }
  }, [panes, app.extensions, app.extensions.isReady, closeTabInPane]);

  const dockItems = useSidebarDockStore((s) => s.items);
  const syncExtensionTabs = useSidebarDockStore((s) => s.syncExtensionTabs);
  const undockItem = useSidebarDockStore((s) => s.undockItem);
  const toggleItemEnabled = useSidebarDockStore((s) => s.toggleItemEnabled);
  const moveItemToZone = useSidebarDockStore((s) => s.moveItemToZone);
  const openTabInPane = useWorkspaceStore((s) => s.openTabInPane);
  const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId);
  const { showContextMenu } = useAppContextMenu();

  useEffect(() => {
    const allExtTabs = [
      { id: 'files', title: 'Files & folders', side: 'left' as const, order: 0 },
      { id: 'search', title: 'Search', side: 'left' as const, order: 1 },
      ...leftTabs.map((t) => ({ id: t.id, title: t.title, side: 'left' as const, order: t.order })),
      ...rightTabs.map((t) => ({ id: t.id, title: t.title, side: 'right' as const, order: t.order })),
    ];
    syncExtensionTabs(allExtTabs);
  }, [leftTabs, rightTabs, syncExtensionTabs]);

  const leftTopDockItems = useMemo(
    () =>
      dockItems
        .filter((it) => it.zone === 'left-top' && it.enabled)
        .sort((a, b) => (a.order ?? 50) - (b.order ?? 50)),
    [dockItems]
  );

  const rightTopDockItems = useMemo(
    () =>
      dockItems
        .filter((it) => it.zone === 'right-top' && it.enabled)
        .sort((a, b) => (a.order ?? 50) - (b.order ?? 50)),
    [dockItems]
  );

  const leftTopReorder = useDockReorder({
    zone: 'left-top',
    items: leftTopDockItems,
    getDisplayTitle: (it) => it.title,
  });

  const rightTopReorder = useDockReorder({
    zone: 'right-top',
    items: rightTopDockItems,
    getDisplayTitle: (it) => it.title,
  });


  const getSidebarExtensionList = useCallback(
    (side: 'left' | 'right') => {
      const list: Array<{ id: string; title: string; icon: React.ReactNode }> = [];
      if (side === 'left') {
        list.push({ id: 'files', title: 'Files & folders', icon: <Folder01Icon size={14} /> });
        list.push({ id: 'search', title: 'Search', icon: <Search01Icon size={14} /> });
        leftTabs.forEach((t) => {
          list.push({ id: t.id, title: t.title, icon: t.icon || <Folder01Icon size={14} /> });
        });
      } else {
        rightTabs.forEach((t) => {
          list.push({ id: t.id, title: t.title, icon: t.icon || <Folder01Icon size={14} /> });
        });
      }
      return list;
    },
    [leftTabs, rightTabs]
  );

  const handleDockItemContextMenu = useCallback(
    (e: React.MouseEvent, item: DockItem, side: 'left' | 'right') => {
      e.preventDefault();
      e.stopPropagation();

      const targetBottomZone = side === 'left' ? 'left-bottom' : 'right-bottom';
      const oppositeTopZone = side === 'left' ? 'right-top' : 'left-top';

      const menuItems: ContextMenuItem[] = [
        {
          id: 'move-bottom',
          title: 'Move to bottom split',
          onClick: () => moveItemToZone(item.id, targetBottomZone),
        },
        {
          id: 'move-opposite',
          title: `Move to ${side === 'left' ? 'right' : 'left'} sidebar`,
          onClick: () => moveItemToZone(item.id, oppositeTopZone),
        },
      ];

      const isDoc =
        (item.type === 'document' || item.id.startsWith('doc:')) &&
        item.documentId &&
        !item.documentId.startsWith('__');

      if (isDoc) {
        menuItems.push({
          id: 'remove-dock',
          title: 'Remove from sidebar',
          isDanger: true,
          onClick: () => undockItem(item.id),
        });
      } else {
        menuItems.push({
          id: 'hide-dock',
          title: 'Hide from sidebar',
          isDanger: true,
          onClick: () => toggleItemEnabled(item.id, false),
        });
      }

      menuItems.push({
        id: 'sep-tabs',
        type: 'separator',
      });

      const currentZone: DockZone = side === 'left' ? 'left-top' : 'right-top';
      const extList = getSidebarExtensionList(side);
      extList.forEach((ext) => {
        const dockItem = dockItems.find(
          (it) => it.id === ext.id || it.extensionId === ext.id || it.viewType === ext.id
        );
        const isInThisZone = dockItem ? dockItem.zone === currentZone && dockItem.enabled : false;

        menuItems.push({
          id: `toggle-${ext.id}`,
          title: ext.title,
          icon: ext.icon,
          checked: isInThisZone,
          onClick: () => {
            if (isInThisZone) {
              if (dockItem) toggleItemEnabled(dockItem.id, false);
            } else {
              if (dockItem) {
                moveItemToZone(dockItem.id, currentZone);
                toggleItemEnabled(dockItem.id, true);
              } else {
                useSidebarDockStore.getState().dockTab(
                  { id: ext.id, title: ext.title, view_type: ext.id } as any,
                  currentZone
                );
              }
            }
          },
        });
      });

      showContextMenu(e, menuItems);
    },
    [moveItemToZone, openTabInPane, focusedPaneId, undockItem, toggleItemEnabled, getSidebarExtensionList, dockItems, showContextMenu]
  );

  const handleSidebarHeaderContextMenu = useCallback(
    (e: React.MouseEvent, side: 'left' | 'right') => {
      e.preventDefault();
      e.stopPropagation();

      const currentZone: DockZone = side === 'left' ? 'left-top' : 'right-top';
      const extList = getSidebarExtensionList(side);

      const menuItems: ContextMenuItem[] = [
        {
          id: 'tabs-header',
          title: `${side === 'left' ? 'Left' : 'Right'} sidebar tabs`,
          disabled: true,
        },
        ...extList.map((ext) => {
          const dockItem = dockItems.find(
            (it) => it.id === ext.id || it.extensionId === ext.id || it.viewType === ext.id
          );
          const isInThisZone = dockItem ? dockItem.zone === currentZone && dockItem.enabled : false;

          return {
            id: `toggle-${ext.id}`,
            title: ext.title,
            icon: ext.icon,
            checked: isInThisZone,
            onClick: () => {
              if (isInThisZone) {
                if (dockItem) toggleItemEnabled(dockItem.id, false);
              } else {
                if (dockItem) {
                  moveItemToZone(dockItem.id, currentZone);
                  toggleItemEnabled(dockItem.id, true);
                } else {
                  useSidebarDockStore.getState().dockTab(
                    { id: ext.id, title: ext.title, view_type: ext.id } as any,
                    currentZone
                  );
                }
              }
            },
          };
        }),
      ];

      showContextMenu(e, menuItems);
    },
    [getSidebarExtensionList, dockItems, toggleItemEnabled, moveItemToZone, showContextMenu]
  );





  const tabDecorators = useTabDecorators();

  const renderTabIcon = useCallback(
    (tab: TabItem, isActive: boolean, isDimmed = false) => {
      const isDoc =
        (!tab.view_type || tab.view_type === 'document') &&
        (!tab.view_mode || tab.view_mode === 'document') &&
        Boolean(tab.document_id && !tab.document_id.startsWith('__'));
      const doc = isDoc ? documents.find((d) => d.id === tab.document_id) || null : null;

      if (isDoc && !doc) {
        return <Alert02Icon size={13} className="shrink-0 text-amber-400" />;
      }

      for (const dec of tabDecorators) {
        if (dec.matches && !dec.matches(tab, doc)) continue;
        const customIcon = dec.getIcon?.(tab, doc, isActive);
        if (customIcon !== undefined) return customIcon;
      }

      const iconColor = isActive
        ? isDimmed
          ? 'text-[var(--noether-text-secondary)]'
          : 'text-[var(--noether-text-primary)]'
        : 'text-[var(--noether-text-muted)]';

      const viewType =
        tab.view_type ||
        tab.view_mode ||
        (tab.document_id?.startsWith('__') ? tab.document_id.replace(/^__/, '').replace(/__$/, '') : '');

      if (viewType && viewType !== 'document') {
        const extState = app.extensions.getViewExtensionState(viewType);
        if (extState.state === 'disabled') {
          return <Alert02Icon size={13} className="shrink-0 text-amber-400" />;
        }
        if (extState.state === 'deleted') {
          return null;
        }
        const regIcon = extState.state === 'active' ? extState.view.icon : app.views.getViewIcon(viewType);
        if (regIcon) {
          if (React.isValidElement(regIcon)) {
            return React.cloneElement(regIcon as React.ReactElement<any>, {
              size: 13,
              className: `shrink-0 ${iconColor}`,
            });
          }
          return <span className="shrink-0 text-[12px]">{regIcon}</span>;
        }
      }

      if (tab.icon) {
        if (React.isValidElement(tab.icon)) {
          return React.cloneElement(tab.icon as React.ReactElement<any>, {
            size: 13,
            className: `shrink-0 ${iconColor}`,
          });
        }
        return <span className="shrink-0 text-[12px]">{tab.icon}</span>;
      }

      return null;
    },
    [tabDecorators, documents, app.views, app.extensions]
  );

  const getTabDisplayTitle = useCallback(
    (tab: TabItem) => {
      const isDoc =
        (!tab.view_type || tab.view_type === 'document') &&
        (!tab.view_mode || tab.view_mode === 'document') &&
        Boolean(tab.document_id && !tab.document_id.startsWith('__'));
      const doc = isDoc ? documents.find((d) => d.id === tab.document_id) || null : null;

      for (const dec of tabDecorators) {
        if (dec.matches && !dec.matches(tab, doc)) continue;
        const customTitle = dec.getDisplayTitle?.(tab, doc);
        if (customTitle !== undefined) return customTitle;
      }

      if (tab.title) return tab.title;
      const viewType =
        tab.view_type ||
        tab.view_mode ||
        (tab.document_id?.startsWith('__') ? tab.document_id.replace(/^__/, '').replace(/__$/, '') : '');

      if (viewType && viewType !== 'document') {
        return app.views.getViewTitle(viewType);
      }

      return doc ? doc.title : 'Untitled';
    },
    [tabDecorators, documents, app.views]
  );

  const getTabTooltip = useCallback(
    (tab: TabItem) => {
      const isDoc =
        (!tab.view_type || tab.view_type === 'document') &&
        (!tab.view_mode || tab.view_mode === 'document') &&
        Boolean(tab.document_id && !tab.document_id.startsWith('__'));
      const doc = isDoc ? documents.find((d) => d.id === tab.document_id) || null : null;

      if (isDoc && !doc) {
        return `${tab.title || 'Untitled'} (File deleted)`;
      }

      for (const dec of tabDecorators) {
        if (dec.matches && !dec.matches(tab, doc)) continue;
        const customTooltip = dec.getTooltip?.(tab, doc);
        if (customTooltip !== undefined) return customTooltip;
      }

      if (doc) {
        return doc.title || getTabDisplayTitle(tab);
      }
      return getTabDisplayTitle(tab);
    },
    [tabDecorators, documents, getTabDisplayTitle]
  );

  const renderDockIcon = useCallback(
    (item: DockItem) => {
      if (item.id === 'files') {
        return <Folder01Icon size={15} />;
      }
      if (item.id === 'search') {
        return <Search01Icon size={15} />;
      }

      const isDoc =
        item.type === 'document' ||
        item.id.startsWith('doc:') ||
        (item.type !== 'extension' &&
          (item.id.startsWith('tab-') || !item.viewType || item.viewType === 'document'));

      if (isDoc && item.id !== 'files' && item.id !== 'search') {
        return <StickyNote02Icon size={14} />;
      }

      // 1. Check sidebar tabs across both sides
      const allSidebarTabs = [...leftTabs, ...rightTabs];
      const extTab = allSidebarTabs.find(
        (t) =>
          t.id === item.id ||
          t.id === item.viewType ||
          t.id === item.extensionId ||
          t.id.endsWith(`:${item.id}`) ||
          (typeof item.id === 'string' && item.id.includes(':') && t.id === item.id.split(':')[1]) ||
          (item.viewType && t.id.includes(item.viewType))
      );
      if (extTab && extTab.icon) {
        if (React.isValidElement(extTab.icon)) {
          return React.cloneElement(extTab.icon as React.ReactElement<any>, {
            size: 14,
          });
        }
        return extTab.icon;
      }

      // 2. Check registered workspace views (Graph, Canvas, Tasks, Marketplace, etc.)
      const viewType =
        item.viewType ||
        (item.id.startsWith('view:') ? item.id.slice(5) : item.id);

      if (viewType && viewType !== 'document') {
        const extState = app.extensions.getViewExtensionState(viewType);
        const regView = extState.state === 'active' ? extState.view : app.views.getView(viewType);
        if (regView?.icon) {
          if (React.isValidElement(regView.icon)) {
            return React.cloneElement(regView.icon as React.ReactElement<any>, {
              size: 14,
            });
          }
          return regView.icon;
        }
        if (viewType === 'graph') return <NeuralNetworkIcon size={14} />;
        if (viewType === 'canvas') return <Layout01Icon size={14} />;
      }

      return <Folder01Icon size={14} />;
    },
    [leftTabs, rightTabs, app.views, app.extensions]
  );

  const getDockItemTitle = useCallback(
    (item: DockItem) => {
      if (item.id === 'files') return 'Files & folders';
      if (item.id === 'search') return 'Search';
      if (item.title && item.title !== 'Tab') return item.title;

      const allSidebarTabs = [...leftTabs, ...rightTabs];
      const extTab = allSidebarTabs.find(
        (t) =>
          t.id === item.id ||
          t.id === item.viewType ||
          t.id === item.extensionId ||
          t.id.endsWith(`:${item.id}`) ||
          (typeof item.id === 'string' && item.id.includes(':') && t.id === item.id.split(':')[1])
      );
      if (extTab?.title) return extTab.title;

      const viewType =
        item.viewType ||
        (item.id.startsWith('view:') ? item.id.slice(5) : item.id);
      if (viewType && viewType !== 'document') {
        return app.views.getViewTitle(viewType);
      }

      return item.title || item.id;
    },
    [leftTabs, rightTabs, app.views]
  );

  return (
    <header
      data-noether-header="true"
      style={{
        background: 'var(--noether-bg-topbar-gradient, var(--noether-bg-topbar, #111111))',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
      className="noether-header h-[41px] flex items-center justify-between pl-0 pr-0 select-none shrink-0 relative z-30"
    >
      {/* 1. macOS Window Controls Reserved Area (w-[72px]) */}
      {isMac && (
        <div
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          className="w-[72px] h-full shrink-0"
          aria-hidden="true"
        />
      )}

      {/* 2. Left Sidebar Header & View Switchers */}
      {isMac ? (
        isLeftSidebarOpen ? (
          <div
            style={{
              width: `${Math.max(36, leftSidebarWidth + 44 - 72)}px`,
              WebkitAppRegion: 'no-drag',
            } as React.CSSProperties}
            className="h-full flex items-center pr-2 shrink-0 min-w-0 select-none relative"
            data-no-drag="true"
          >
            <div
              ref={leftTopReorder.containerRef}
              data-dock-zone="left-top"
              onContextMenu={(e) => handleSidebarHeaderContextMenu(e, 'left')}
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
              className="flex-1 h-full flex items-center gap-0.5 px-1 min-w-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden select-none relative"
            >
              {leftTopDockItems.map((item, index) => {
                const tabKey = item.id.includes(':') ? item.id.split(':')[1] : item.id;
                const extTab = leftTabs.find(
                  (t) => t.id === item.id || t.id.endsWith(`:${item.id}`) || t.id === item.viewType || t.id === item.extensionId
                );
                const icon = renderDockIcon(item);
                const isActive =
                  (item.id === 'files' && activeLeftView === 'files') ||
                  (item.id === 'search' && activeLeftView === 'search') ||
                  activeLeftView === item.id ||
                  activeLeftView === tabKey ||
                  activeLeftView === item.viewType ||
                  activeLeftView === item.extensionId ||
                  activeLeftView === item.documentId ||
                  activeLeftView === `doc:${item.documentId}` ||
                  (extTab && (activeLeftView === extTab.id || extTab.id.endsWith(`:${activeLeftView}`)));
                const itemTitle = getDockItemTitle(item);

                return (
                  <button
                    key={item.id}
                    ref={(el) => leftTopReorder.registerItemRef(index, el)}
                    onPointerDown={(e) => leftTopReorder.handlePointerDown(index, e)}
                    onClick={() => {
                      if (leftTopReorder.hasDragged()) return;
                      setActiveLeftView(item.id as any);
                      useSidebarDockStore.getState().setActiveItemInZone('left-top', item.id);
                    }}
                    onContextMenu={(e) => handleDockItemContextMenu(e, item, 'left')}
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        undockItem(item.id);
                      }
                    }}
                    title={itemTitle}
                    data-dock-item-id={item.id}
                    className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer shrink-0 ${
                      isActive
                        ? 'text-[var(--noether-text-secondary)] bg-[var(--noether-bg-card-hover)]'
                        : 'text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)]'
                    }`}
                  >
                    {icon}
                  </button>
                );
              })}

              {leftTopReorder.dropIndicatorLeft !== null && (
                <div
                  style={{
                    left: `${leftTopReorder.dropIndicatorLeft}px`,
                  }}
                  className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[20px] bg-white rounded-full pointer-events-none z-50 shadow-[0_0_4px_rgba(255,255,255,0.6)]"
                />
              )}
            </div>

            {/* Left sidebar collapse button at the trailing end (cursor position) */}
            <button
              type="button"
              onClick={toggleLeftSidebar}
              title="Collapse left sidebar (Ctrl+\)"
              className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer shrink-0 ml-1"
            >
              <LayoutLeftIcon size={16} />
            </button>
          </div>
        ) : (
          /* Collapsed on macOS: Expand button directly adjacent to the 72px window controls zone */
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="w-11 h-full flex items-center justify-center shrink-0"
            data-no-drag="true"
          >
            <button
              type="button"
              onClick={toggleLeftSidebar}
              title="Expand left sidebar (Ctrl+\)"
              className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
            >
              <LayoutAlignLeftIcon size={16} />
            </button>
          </div>
        )
      ) : (
        /* Windows / Linux layout (standard ribbon column + left dock items) */
        <>
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="w-11 h-full flex items-center justify-center shrink-0"
          >
            <button
              type="button"
              onClick={toggleLeftSidebar}
              title="Toggle left sidebar (Ctrl+\)"
              className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
            >
              {isLeftSidebarOpen ? <LayoutLeftIcon size={16} /> : <LayoutAlignLeftIcon size={16} />}
            </button>
          </div>

          {isLeftSidebarOpen && (
            <div
              ref={leftTopReorder.containerRef}
              data-dock-zone="left-top"
              onContextMenu={(e) => handleSidebarHeaderContextMenu(e, 'left')}
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              style={{
                width: `${leftSidebarWidth}px`,
                WebkitAppRegion: 'no-drag',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              } as React.CSSProperties}
              className="h-full flex items-center gap-0.5 px-2 shrink-0 min-w-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden select-none relative"
            >
              {leftTopDockItems.map((item, index) => {
                const tabKey = item.id.includes(':') ? item.id.split(':')[1] : item.id;
                const extTab = leftTabs.find(
                  (t) => t.id === item.id || t.id.endsWith(`:${item.id}`) || t.id === item.viewType || t.id === item.extensionId
                );
                const icon = renderDockIcon(item);
                const isActive =
                  (item.id === 'files' && activeLeftView === 'files') ||
                  (item.id === 'search' && activeLeftView === 'search') ||
                  activeLeftView === item.id ||
                  activeLeftView === tabKey ||
                  activeLeftView === item.viewType ||
                  activeLeftView === item.extensionId ||
                  activeLeftView === item.documentId ||
                  activeLeftView === `doc:${item.documentId}` ||
                  (extTab && (activeLeftView === extTab.id || extTab.id.endsWith(`:${activeLeftView}`)));
                const itemTitle = getDockItemTitle(item);

                return (
                  <button
                    key={item.id}
                    ref={(el) => leftTopReorder.registerItemRef(index, el)}
                    onPointerDown={(e) => leftTopReorder.handlePointerDown(index, e)}
                    onClick={() => {
                      if (leftTopReorder.hasDragged()) return;
                      setActiveLeftView(item.id as any);
                      useSidebarDockStore.getState().setActiveItemInZone('left-top', item.id);
                    }}
                    onContextMenu={(e) => handleDockItemContextMenu(e, item, 'left')}
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        undockItem(item.id);
                      }
                    }}
                    title={itemTitle}
                    data-dock-item-id={item.id}
                    className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer shrink-0 ${
                      isActive
                        ? 'text-[var(--noether-text-secondary)] bg-[var(--noether-bg-card-hover)]'
                        : 'text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)]'
                    }`}
                  >
                    {icon}
                  </button>
                );
              })}

              {leftTopReorder.dropIndicatorLeft !== null && (
                <div
                  style={{
                    left: `${leftTopReorder.dropIndicatorLeft}px`,
                  }}
                  className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[20px] bg-white rounded-full pointer-events-none z-50 shadow-[0_0_4px_rgba(255,255,255,0.6)]"
                />
              )}
            </div>
          )}
        </>
      )}

      {/* 3. Document Tabs Area across all top-row panes */}
      {showTabTitleBar ? (
        <div
          data-no-drag="true"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className="flex-1 flex items-end h-[41px] -mb-[1px] min-w-0 relative z-20 overflow-visible"
        >
          {topRowLeaves.map((leaf, index) => (
            <WindowHeaderTopPaneTabs
              key={leaf.id}
              paneId={leaf.id}
              isFirst={index === 0}
              isLast={index === topRowLeaves.length - 1}
              isOnly={topRowLeaves.length === 1}
              totalColumns={topRowLeaves.length}
              renderTabIcon={renderTabIcon}
              getTabDisplayTitle={getTabDisplayTitle}
              getTabTooltip={getTabTooltip}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 h-full" />
      )}

      {/* 4. Right Controls */}
      {isMac ? (
        <div
          data-no-drag="true"
          style={{
            width: isRightSidebarOpen ? `${rightSidebarWidth}px` : 'auto',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
          className="h-full flex items-center justify-end pr-0 shrink-0 relative z-30"
        >
          {isRightSidebarOpen && (
            <div
              ref={rightTopReorder.containerRef}
              data-dock-zone="right-top"
              onContextMenu={(e) => handleSidebarHeaderContextMenu(e, 'right')}
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
              className="flex-1 flex items-center gap-0.5 px-2 min-w-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden select-none relative"
            >
              {rightTopDockItems.map((item, index) => {
                const tabKey = item.id.includes(':') ? item.id.split(':')[1] : item.id;
                const extTab = rightTabs.find(
                  (t) => t.id === item.id || t.id.endsWith(`:${item.id}`) || t.id === item.viewType || t.id === item.extensionId
                );
                const icon = renderDockIcon(item);
                const isActive =
                  activeRightTab === item.id ||
                  activeRightTab === tabKey ||
                  activeRightTab === item.viewType ||
                  activeRightTab === item.extensionId ||
                  activeRightTab === item.documentId ||
                  activeRightTab === `doc:${item.documentId}` ||
                  (extTab && (activeRightTab === extTab.id || extTab.id.endsWith(`:${activeRightTab}`)));
                const itemTitle = getDockItemTitle(item);

                return (
                  <button
                    key={item.id}
                    ref={(el) => rightTopReorder.registerItemRef(index, el)}
                    onPointerDown={(e) => rightTopReorder.handlePointerDown(index, e)}
                    onClick={() => {
                      if (rightTopReorder.hasDragged()) return;
                      setActiveRightTab(item.id as any);
                      useSidebarDockStore.getState().setActiveItemInZone('right-top', item.id);
                    }}
                    onContextMenu={(e) => handleDockItemContextMenu(e, item, 'right')}
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        undockItem(item.id);
                      }
                    }}
                    title={itemTitle}
                    data-dock-item-id={item.id}
                    className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer shrink-0 ${
                      isActive
                        ? 'text-[var(--noether-text-secondary)] bg-[var(--noether-bg-card-hover)]'
                        : 'text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)]'
                    }`}
                  >
                    {icon}
                  </button>
                );
              })}

              {rightTopReorder.dropIndicatorLeft !== null && (
                <div
                  style={{
                    left: `${rightTopReorder.dropIndicatorLeft}px`,
                  }}
                  className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[20px] bg-white rounded-full pointer-events-none z-50 shadow-[0_0_4px_rgba(255,255,255,0.6)]"
                />
              )}
            </div>
          )}

          {/* Right sidebar toggle button on the far top-right edge (w-11) */}
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="w-11 h-full flex items-center justify-center shrink-0"
            data-no-drag="true"
          >
            <button
              type="button"
              onClick={toggleRightSidebar}
              title="Toggle right sidebar (Ctrl+Shift+\)"
              className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
            >
              {isRightSidebarOpen ? <LayoutRightIcon size={15} /> : <LayoutAlignRightIcon size={15} />}
            </button>
          </div>
        </div>
      ) : (
        /* Windows / Linux layout with button before items, and caption buttons to the right inside the container */
        <div
          data-no-drag="true"
          style={{
            width: isRightSidebarOpen ? `${rightSidebarWidth + 42}px` : 'auto',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
          className="h-full flex items-center justify-end pr-0 shrink-0 relative z-30"
        >
          <button
            type="button"
            onClick={toggleRightSidebar}
            title="Toggle right sidebar (Ctrl+Shift+\)"
            className={`w-7 h-7 rounded-md flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer shrink-0 mr-[14px]`}
          >
            {isRightSidebarOpen ? <LayoutRightIcon size={15} /> : <LayoutAlignRightIcon size={15} />}
          </button>

          {isRightSidebarOpen && (
            <div
              ref={rightTopReorder.containerRef}
              data-dock-zone="right-top"
              onContextMenu={(e) => handleSidebarHeaderContextMenu(e, 'right')}
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
              className="flex-1 flex items-center gap-0.5 ml-0.5 px-0.5 min-w-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden select-none relative"
            >
              {rightTopDockItems.map((item, index) => {
                const tabKey = item.id.includes(':') ? item.id.split(':')[1] : item.id;
                const extTab = rightTabs.find(
                  (t) => t.id === item.id || t.id.endsWith(`:${item.id}`) || t.id === item.viewType || t.id === item.extensionId
                );
                const icon = renderDockIcon(item);
                const isActive =
                  activeRightTab === item.id ||
                  activeRightTab === tabKey ||
                  activeRightTab === item.viewType ||
                  activeRightTab === item.extensionId ||
                  activeRightTab === item.documentId ||
                  activeRightTab === `doc:${item.documentId}` ||
                  (extTab && (activeRightTab === extTab.id || extTab.id.endsWith(`:${activeRightTab}`)));
                const itemTitle = getDockItemTitle(item);

                return (
                  <button
                    key={item.id}
                    ref={(el) => rightTopReorder.registerItemRef(index, el)}
                    onPointerDown={(e) => rightTopReorder.handlePointerDown(index, e)}
                    onClick={() => {
                      if (rightTopReorder.hasDragged()) return;
                      setActiveRightTab(item.id as any);
                      useSidebarDockStore.getState().setActiveItemInZone('right-top', item.id);
                    }}
                    onContextMenu={(e) => handleDockItemContextMenu(e, item, 'right')}
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault();
                        e.stopPropagation();
                        undockItem(item.id);
                      }
                    }}
                    title={itemTitle}
                    data-dock-item-id={item.id}
                    className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer shrink-0 ${
                      isActive
                        ? 'text-[var(--noether-text-secondary)] bg-[var(--noether-bg-card-hover)]'
                        : 'text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)]'
                    }`}
                  >
                    {icon}
                  </button>
                );
              })}

              {rightTopReorder.dropIndicatorLeft !== null && (
                <div
                  style={{
                    left: `${rightTopReorder.dropIndicatorLeft}px`,
                  }}
                  className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[20px] bg-white rounded-full pointer-events-none z-50 shadow-[0_0_4px_rgba(255,255,255,0.6)]"
                />
              )}
            </div>
          )}

          {/* Window Controls (Windows / Linux) nested inside the right container */}
          <div
            className="flex items-center h-full shrink-0 ml-auto"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            data-no-drag="true"
          >
            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                handleMinimize();
              }}
              title="Minimize"
              className="h-full w-11 flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
            >
              <WindowMinimizeIcon />
            </button>

            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                handleMaximize();
              }}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="h-full w-11 flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
            >
              {isMaximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
            </button>

            <button
              type="button"
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              title="Close"
              className="h-full w-11 flex items-center justify-center text-[var(--noether-text-muted)] hover:text-white hover:bg-[#e81123] cursor-pointer"
            >
              <WindowCloseIcon />
            </button>
          </div>
        </div>
      )}
    </header>
  );
});
