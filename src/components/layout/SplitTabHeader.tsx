import React, { useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useFlintApp, useTabDecorators } from '@/core/app/AppContext';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { useTabReorder } from '@/hooks/useTabReorder';
import { TabItem } from '@/types';
import { getDocumentPath } from '@/lib/db/documents';
import {
  Cancel01Icon,
  PlusSignIcon,
  Alert02Icon,
  NeuralNetworkIcon,
  Layout01Icon,
  BookOpen01Icon,
  SplitRightIcon,
  Copy01Icon,
} from '@/components/common/Icons';

interface SplitTabHeaderProps {
  paneId?: string;
}

export const SplitTabHeader: React.FC<SplitTabHeaderProps> = React.memo(({ paneId }) => {
  const app = useFlintApp();
  const targetPaneId = paneId || 'split';

  const panes = useWorkspaceStore((s) => s.panes);
  const paneModel = panes[targetPaneId];
  const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId);

  const splitTabs = useMemo(() => paneModel?.tabs || [], [paneModel?.tabs]);
  const splitActiveTabId = paneModel?.activeTabId || null;

  const setActiveTabInPane = useWorkspaceStore((s) => s.setActiveTabInPane);
  const openEmptyTabInPane = useWorkspaceStore((s) => s.openEmptyTabInPane);
  const closeTabInPane = useWorkspaceStore((s) => s.closeTabInPane);
  const reorderTabsInPane = useWorkspaceStore((s) => s.reorderTabsInPane);
  const closePane = useWorkspaceStore((s) => s.closePane);
  const setFocusedPane = useWorkspaceStore((s) => s.setFocusedPane);
  const splitPane = useWorkspaceStore((s) => s.splitPane);

  const hearthPath = useWorkspaceStore((s) => s.hearthPath || s.vaultPath);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const documents = useDocumentStore((s) => s.documents);
  const { showContextMenu } = useAppContextMenu();

  const tabDecorators = useTabDecorators();

  const handleReorder = useCallback(
    (src: number, dst: number) => {
      reorderTabsInPane(targetPaneId, src, dst);
    },
    [reorderTabsInPane, targetPaneId]
  );

  const splitTabReorder = useTabReorder({
    paneId: targetPaneId,
    items: splitTabs,
    onReorder: handleReorder,
    getDisplayTitle: (tab) => getTabDisplayTitle(tab),
  });

  const isFocused = focusedPaneId === targetPaneId;

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
          ? 'text-[var(--flint-text-secondary)]'
          : 'text-[var(--flint-text-primary)]'
        : 'text-[var(--flint-text-muted)]';

      const viewType =
        tab.view_type ||
        tab.view_mode ||
        (tab.document_id === '__graph__'
          ? 'graph'
          : tab.document_id === '__canvas__'
          ? 'canvas'
          : tab.document_id === '__tasks__'
          ? 'tasks'
          : '');

      if (viewType && viewType !== 'document') {
        const pluginState = app.plugins.getViewPluginState(viewType);
        if (pluginState.state === 'disabled') {
          return <Alert02Icon size={13} className="shrink-0 text-amber-400" />;
        }
        if (pluginState.state === 'deleted') {
          return null;
        }
        const regView = pluginState.state === 'active' ? pluginState.view : app.views.getView(viewType);
        if (regView?.icon) {
          if (React.isValidElement(regView.icon)) {
            return React.cloneElement(regView.icon as React.ReactElement<any>, {
              size: 13,
              className: `shrink-0 ${iconColor}`,
            });
          }
          return <span className="shrink-0 text-[12px]">{regView.icon}</span>;
        }
        if (viewType === 'graph') {
          return <NeuralNetworkIcon size={13} className={`shrink-0 ${iconColor}`} />;
        }
        if (viewType === 'canvas') {
          return <Layout01Icon size={13} className={`shrink-0 ${iconColor}`} />;
        }
        if (viewType === 'plugin-doc' || viewType === 'extension-doc') {
          return <BookOpen01Icon size={13} className={`shrink-0 ${iconColor}`} />;
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
    [tabDecorators, documents, app.views, app.plugins]
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

      if (tab.document_id === '__graph__' || tab.view_type === 'graph' || tab.view_mode === 'graph') return 'Graph view';
      if (tab.document_id === '__canvas__' || tab.view_type === 'canvas' || tab.view_mode === 'canvas') return 'Canvas';
      if (tab.document_id === '__tasks__' || tab.view_type === 'tasks' || tab.view_mode === 'tasks') return 'Tasks';

      if (tab.view_type && tab.view_type !== 'document') {
        const regView = app.views.getView(tab.view_type);
        if (regView?.title) return regView.title;
      }

      return tab.title || (doc ? doc.title : 'Untitled');
    },
    [tabDecorators, documents, app.views]
  );

  const handleSplitTabContextMenu = useCallback(
    (e: React.MouseEvent, tab: TabItem, index: number) => {
      e.preventDefault();
      e.stopPropagation();

      const isDoc =
        (!tab.view_type || tab.view_type === 'document') &&
        (!tab.view_mode || tab.view_mode === 'document') &&
        Boolean(tab.document_id && !tab.document_id.startsWith('__'));
      const doc = isDoc ? documents.find((d) => d.id === tab.document_id) : null;

      const isTabEmpty = (!tab.document_id || tab.document_id === '') && (!tab.view_type || tab.view_type === 'document');
      const canCloseTab = splitTabs.length > 1 || !isTabEmpty;

      const items: ContextMenuItem[] = [
        {
          id: 'close-split-tab',
          title: 'Close tab',
          disabled: !canCloseTab,
          onClick: () => {
            closeTabInPane(targetPaneId, tab.id);
          },
        },
        {
          id: 'close-other-split-tabs',
          title: 'Close other tabs',
          disabled: splitTabs.length <= 1,
          onClick: () => {
            for (const other of splitTabs) {
              if (other.id !== tab.id) {
                closeTabInPane(targetPaneId, other.id);
              }
            }
          },
        },
        {
          id: 'close-split-tabs-right',
          title: 'Close tabs to the right',
          disabled: index >= splitTabs.length - 1,
          onClick: () => {
            const toClose = splitTabs.slice(index + 1);
            for (const other of toClose) {
              closeTabInPane(targetPaneId, other.id);
            }
          },
        },
        { type: 'separator' },
        {
          id: 'split-right',
          title: 'Split right',
          icon: <SplitRightIcon size={14} />,
          onClick: () => {
            splitPane(targetPaneId, 'horizontal', tab.document_id, tab.title, {
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
          onClick: () => {
            splitPane(targetPaneId, 'vertical', tab.document_id, tab.title, {
              viewMode: tab.view_mode,
              viewType: tab.view_type,
              icon: tab.icon,
              metadata: tab.metadata,
            });
          },
        },
        {
          id: 'duplicate-split-tab',
          title: 'Duplicate tab',
          onClick: () => {
            splitPane(targetPaneId, 'horizontal', tab.document_id, tab.title, {
              viewMode: tab.view_mode,
              viewType: tab.view_type,
              icon: tab.icon,
              metadata: tab.metadata,
            });
          },
        },
        { type: 'separator' },
        {
          id: 'close-split-view',
          title: 'Close pane',
          onClick: () => {
            closePane(targetPaneId);
          },
        },
      ];

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
                const abs = hearthPath ? `${hearthPath}/${rel}` : `/${rel}`;
                await navigator.clipboard.writeText(abs);
                showToast('Copied absolute path', 'success');
              },
            },
          ],
        });
      }

      showContextMenu(e, items, { scope: 'tab', data: tab });
    },
    [splitTabs, targetPaneId, closeTabInPane, closePane, splitPane, documents, hearthPath, showToast, showContextMenu]
  );

  const handleHeaderContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          id: 'new-tab',
          title: 'New tab',
          onClick: () => {
            setFocusedPane(targetPaneId);
            openEmptyTabInPane(targetPaneId);
          },
        },
        { type: 'separator' },
        {
          id: 'close-pane',
          title: 'Close pane',
          isDanger: true,
          onClick: () => {
            closePane(targetPaneId);
          },
        },
      ];

      showContextMenu(e, items);
    },
    [targetPaneId, setFocusedPane, openEmptyTabInPane, closePane, showContextMenu]
  );

  return (
    <div
      onClick={() => setFocusedPane(targetPaneId)}
      onContextMenu={handleHeaderContextMenu}
      style={{
        background: 'var(--flint-bg-header, var(--flint-bg-sidebar))',
      }}
      className="h-[38px] flex items-end justify-between pl-6 pr-2 select-none border-b border-[var(--flint-border-base)] shrink-0 relative z-20"
    >
      {/* Split Tabs Row */}
      <div
        ref={splitTabReorder.containerRef}
        className="flex items-end gap-[2px] shrink min-w-0 flex-1 overflow-visible relative -mb-[1px]"
      >
        {splitTabs.map((tab, index) => {
          const isTabActive = tab.id === splitActiveTabId;
          const isFocusedActive = isTabActive && isFocused;
          const isInactiveActive = isTabActive && !isFocused;
          const displayTitle = getTabDisplayTitle(tab);
          const isDraggingThis = splitTabReorder.isDragging && splitTabReorder.dragIndex === index;
          const tabReorderStyle = splitTabReorder.getTabStyle(index, isTabActive);
          const isTabEmpty = (!tab.document_id || tab.document_id === '') && (!tab.view_type || tab.view_type === 'document');
          const canCloseTab = splitTabs.length > 1 || !isTabEmpty;

          return (
            <div
              key={tab.id}
              ref={(el) => splitTabReorder.registerTabRef(index, el)}
              onPointerDown={(e) => splitTabReorder.handlePointerDown(index, e)}
              onClick={(e) => {
                if (splitTabReorder.hasDragged()) return;
                e.stopPropagation();
                setFocusedPane(targetPaneId);
                setActiveTabInPane(targetPaneId, tab.id);
              }}
              onAuxClick={(e) => {
                if (e.button === 1 && canCloseTab) {
                  e.preventDefault();
                  e.stopPropagation();
                  closeTabInPane(targetPaneId, tab.id);
                }
              }}
              onContextMenu={(e) => handleSplitTabContextMenu(e, tab, index)}
              style={{
                color: isFocusedActive
                  ? 'var(--flint-text-primary)'
                  : isInactiveActive
                  ? 'var(--flint-text-secondary)'
                  : 'var(--flint-text-muted)',
                ...tabReorderStyle,
              } as React.CSSProperties}
              className={`group relative flex items-center gap-1.5 px-2.5 text-xs cursor-pointer select-none w-[180px] max-w-[180px] min-w-[36px] h-[34px] shrink border-t border-l border-r border-b-0 ${
                isTabActive
                  ? 'rounded-t-[7px] border-[var(--flint-border-base)] bg-[var(--flint-bg-tab-active,var(--flint-bg-main))] font-normal z-20 shadow-xs'
                  : 'border-transparent bg-transparent font-normal hover:z-30'
              }`}
            >
              {/* Inactive Tab Hover */}
              {!isTabActive && (
                <div
                  style={{
                    background: 'var(--flint-bg-tab-hover, var(--flint-bg-card-hover))',
                    opacity: isDraggingThis ? 1 : undefined,
                  }}
                  className={`absolute inset-x-0 top-0 bottom-[3px] rounded-[6px] pointer-events-none z-0 ${
                    isDraggingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                />
              )}

              {/* Active Tab Inverted Curved Corners */}
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
                        fill: 'var(--flint-tab-corner-fill, var(--flint-bg-tab-active, var(--flint-bg-main)))',
                      }}
                    />
                    <path
                      d="M 0 8 A 8 8 0 0 0 8 0"
                      fill="none"
                      stroke="var(--flint-border-base)"
                      strokeWidth="1"
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
                        fill: 'var(--flint-tab-corner-fill, var(--flint-bg-tab-active, var(--flint-bg-main)))',
                      }}
                    />
                    <path
                      d="M 0 0 A 8 8 0 0 0 8 8"
                      fill="none"
                      stroke="var(--flint-border-base)"
                      strokeWidth="1"
                    />
                  </svg>

                  {/* Active Tab Bottom 1px Border Canceler */}
                  <div
                    style={{
                      background: 'var(--flint-tab-corner-fill, var(--flint-bg-tab-active, var(--flint-bg-main)))',
                    }}
                    className="absolute -bottom-[1px] left-0 right-0 h-[2px] pointer-events-none z-30 opacity-100"
                  />
                </>
              )}

              <div className="relative z-10 flex items-center gap-1.5 min-w-0 flex-1 -translate-y-[2px] group-hover:pr-6">
                {renderTabIcon(tab, isTabActive, isInactiveActive)}
                <span
                  className={`truncate flex-1 min-w-0 text-[12px] ${
                    isFocusedActive
                      ? 'text-[var(--flint-text-primary)]'
                      : isInactiveActive
                      ? 'text-[var(--flint-text-secondary)] opacity-85'
                      : 'text-[var(--flint-text-muted)]'
                  }`}
                >
                  {displayTitle}
                </span>
              </div>

              {canCloseTab && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTabInPane(targetPaneId, tab.id);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100 z-20 text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)]"
                >
                  <Cancel01Icon size={13} />
                </button>
              )}
            </div>
          );
        })}
        {splitTabReorder.dropIndicatorLeft !== null && (
          <div
            style={{
              left: `${splitTabReorder.dropIndicatorLeft}px`,
            }}
            className="absolute bottom-[7px] w-[3px] h-[20px] bg-white rounded-full pointer-events-none z-50 shadow-[0_0_4px_rgba(255,255,255,0.6)]"
          />
        )}

        <button
          onClick={() => {
            setFocusedPane(targetPaneId);
            openEmptyTabInPane(targetPaneId);
          }}
          title="New split tab"
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors shrink-0 self-center ml-1.5 cursor-pointer"
        >
          <PlusSignIcon size={14} />
        </button>
      </div>
    </div>
  );
});
