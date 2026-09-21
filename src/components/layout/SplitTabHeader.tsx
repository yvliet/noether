import React, { useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSettingsStore } from '@/store/settingsStore';
import { BrokenEmbedIndicator } from '@/components/common/BrokenEmbedAlert';
import { useNoetherApp, useTabDecorators } from '@/core/app/AppContext';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { useTabReorder } from '@/hooks/useTabReorder';
import { TabItem } from '@/types';
import type {
  TabContextMenuContext,
  TabContextMenuActionDefinition,
} from '@/core/registries/TabContextMenuRegistry';
import { getDocumentPath } from '@/lib/db/documents';
import { useContentScrolled } from '@/hooks/useContentScrolled';
import {
  Cancel01Icon,
  PlusSignIcon,
  Alert02Icon,
  SplitRightIcon,
  SplitDownIcon,
  Copy01Icon,
  PinIcon,
} from '@/components/common/Icons';

interface SplitTabHeaderProps {
  paneId?: string;
}

export const SplitTabHeader: React.FC<SplitTabHeaderProps> = React.memo(({ paneId }) => {
  const app = useNoetherApp();
  const targetPaneId = paneId || 'split';

  const panes = useWorkspaceStore((s) => s.panes);
  const paneModel = panes[targetPaneId];
  const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId);

  const splitTabs = useMemo(() => paneModel?.tabs || [], [paneModel?.tabs]);
  const splitActiveTabId = paneModel?.activeTabId || null;

  const setActiveTabInPane = useWorkspaceStore((s) => s.setActiveTabInPane);
  const openEmptyTabInPane = useWorkspaceStore((s) => s.openEmptyTabInPane);
  const openTabInPane = useWorkspaceStore((s) => s.openTabInPane);
  const closeTabInPane = useWorkspaceStore((s) => s.closeTabInPane);
  const reorderTabsInPane = useWorkspaceStore((s) => s.reorderTabsInPane);
  const closePane = useWorkspaceStore((s) => s.closePane);
  const setFocusedPane = useWorkspaceStore((s) => s.setFocusedPane);
  const splitPane = useWorkspaceStore((s) => s.splitPane);
  const togglePinTab = useWorkspaceStore((s) => s.togglePinTab);

  const vaultPath = useWorkspaceStore((s) => s.vaultPath);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const documents = useDocumentStore((s) => s.documents);
  const showBrokenEmbedIndicators = useSettingsStore((s) => s.showBrokenEmbedIndicators);
  const brokenEmbedCounts = useDocumentStore((s) => s.brokenEmbedCounts);
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
  const isContentScrolled = useContentScrolled(targetPaneId);

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
        const regIcon = app.views.getViewIcon(viewType);
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

      const viewType =
        tab.view_type ||
        tab.view_mode ||
        (tab.document_id?.startsWith('__') ? tab.document_id.replace(/^__/, '').replace(/__$/, '') : '');

      if (viewType && viewType !== 'document') {
        return app.views.getViewTitle(viewType, tab.title);
      }

      return tab.title || (doc ? doc.title : 'Untitled');
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

  const handleSplitTabContextMenu = useCallback(
    (e: React.MouseEvent, tab: TabItem, index: number) => {
      e.preventDefault();
      e.stopPropagation();

      const isDoc =
        (!tab.view_type || tab.view_type === 'document') &&
        (!tab.view_mode || tab.view_mode === 'document') &&
        Boolean(tab.document_id && !tab.document_id.startsWith('__'));
      const doc = isDoc ? documents.find((d) => d.id === tab.document_id) || null : null;

      const isTabEmpty = (!tab.document_id || tab.document_id === '') && (!tab.view_type || tab.view_type === 'document');
      const canCloseTab = splitTabs.length > 1 || !isTabEmpty;

      const context: TabContextMenuContext = {
        tab,
        paneId: targetPaneId,
        index,
        totalTabs: splitTabs.length,
        doc,
        app,
      };

      const mapAction = (action: TabContextMenuActionDefinition): ContextMenuItem => ({
        id: action.id,
        title: typeof action.title === 'function' ? action.title(context) : action.title,
        icon: typeof action.icon === 'function' ? action.icon(context) : action.icon,
        disabled: action.isEnabled ? !action.isEnabled(context) : false,
        isDanger: action.isDanger,
        onClick: () => action.onClick(context),
      });

      const registeredTabActions = app.tabContextMenu.getActions(context, 'tabs');
      const registeredSplitActions = app.tabContextMenu.getActions(context, 'split');
      const registeredCustomActions = app.tabContextMenu.getActions(context, 'actions');
      const registeredDangerActions = app.tabContextMenu.getActions(context, 'danger');

      const items: ContextMenuItem[] = [
        {
          id: 'toggle-pin',
          title: tab.is_pinned ? 'Unpin tab' : 'Pin tab',
          icon: <PinIcon size={14} />,
          onClick: () => {
            togglePinTab(tab.id);
          },
        },
        { type: 'separator' },
        {
          id: 'close-split-tab',
          title: 'Close tab',
          shortcut: 'Ctrl+W',
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
              if (other.id !== tab.id && !other.is_pinned) {
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
              if (!other.is_pinned) {
                closeTabInPane(targetPaneId, other.id);
              }
            }
          },
        },
        {
          id: 'close-split-tabs-left',
          title: 'Close tabs to the left',
          disabled: index === 0,
          onClick: () => {
            const toClose = splitTabs.slice(0, index);
            for (const other of toClose) {
              if (!other.is_pinned) {
                closeTabInPane(targetPaneId, other.id);
              }
            }
          },
        },
        {
          id: 'close-all-split-tabs',
          title: 'Close all tabs',
          disabled: !canCloseTab,
          onClick: () => {
            for (const other of splitTabs) {
              if (!other.is_pinned) {
                closeTabInPane(targetPaneId, other.id);
              }
            }
          },
        },
        ...registeredTabActions.map(mapAction),
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
          icon: <SplitDownIcon size={14} />,
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
          icon: <Copy01Icon size={14} />,
          onClick: () => {
            openTabInPane(targetPaneId, tab.document_id, tab.title, {
              newTab: true,
              replaceCurrentTab: false,
              insertIndex: index + 1,
              viewMode: tab.view_mode,
              viewType: tab.view_type,
              icon: tab.icon,
              metadata: tab.metadata,
            });
          },
        },
        ...registeredSplitActions.map(mapAction),
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
                const abs = vaultPath ? `${vaultPath}/${rel}` : `/${rel}`;
                await navigator.clipboard.writeText(abs);
                showToast('Copied absolute path', 'success');
              },
            },
            {
              id: 'copy-wikilink',
              title: 'Copy note link (Wikilink)',
              onClick: async () => {
                const link = `[[${doc.title || 'Untitled'}]]`;
                await navigator.clipboard.writeText(link);
                showToast(`Copied note link [[${doc.title || 'Untitled'}]]`, 'success');
              },
            },
          ],
        });
      }

      if (registeredCustomActions.length > 0) {
        items.push({ type: 'separator' });
        items.push(...registeredCustomActions.map(mapAction));
      }

      if (registeredDangerActions.length > 0) {
        items.push({ type: 'separator' });
        items.push(...registeredDangerActions.map(mapAction));
      }

      showContextMenu(e, items, { scope: 'tab', data: tab });
    },
    [splitTabs, targetPaneId, closeTabInPane, togglePinTab, closePane, openTabInPane, splitPane, documents, vaultPath, showToast, showContextMenu, app]
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
      data-pane-id={targetPaneId}
      data-split-tab-header="true"
      onClick={() => setFocusedPane(targetPaneId)}
      onContextMenu={handleHeaderContextMenu}
      style={{
        background: 'var(--noether-bg-header, var(--noether-bg-sidebar))',
      }}
      className="h-[38px] flex items-end justify-between pl-6 pr-2 select-none border-b border-[var(--noether-border-base)] shrink-0 relative z-20"
    >
      {/* Split Tabs Row: scrollable when tabs exceed available width */}
      <div
        ref={splitTabReorder.containerRef}
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}
        className="flex items-end gap-[2px] shrink min-w-0 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden relative -mb-[1px] px-2"
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
          const isClosable = canCloseTab && !tab.is_pinned;
          const hasBrokenEmbeds = Boolean(
            showBrokenEmbedIndicators &&
            tab.document_id &&
            (brokenEmbedCounts[tab.document_id] || 0) > 0
          );

          return (
            <div
              key={tab.id}
              role="tab"
              data-tab-id={tab.id}
              data-tab-doc-id={tab.document_id || ''}
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
              data-tooltip={splitTabReorder.isDragging ? undefined : getTabTooltip(tab)}
              style={{
                color: isFocusedActive
                  ? 'var(--noether-text-primary)'
                  : isInactiveActive
                  ? 'var(--noether-text-secondary)'
                  : 'var(--noether-text-muted)',
                ...tabReorderStyle,
              } as React.CSSProperties}
              className={`group relative flex items-center gap-1.5 px-2.5 text-xs cursor-pointer select-none w-[180px] max-w-[180px] min-w-[36px] h-[34px] shrink border-0 ${
                isTabActive
                  ? 'rounded-t-[7px] bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] font-normal z-20 shadow-xs overflow-visible'
                  : 'bg-transparent font-normal hover:z-30'
              }`}
            >
              {/* Inactive Tab Hover */}
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

                  {/* Active Tab Bottom 1px Border Canceler */}
                  <div
                    style={{
                      background: 'var(--noether-tab-corner-fill, var(--noether-bg-tab-active, var(--noether-bg-main)))',
                    }}
                    className="absolute -bottom-[1px] left-0 right-0 h-[2px] pointer-events-none z-30 opacity-100"
                  />
                </>
              )}

              {/*
               * Scroll-triggered shadow on the active tab icon + title (only for immersive/spatial views).
               */}
              <div
                className={`relative z-10 flex items-center gap-1.5 min-w-0 flex-1 -translate-y-[2px] ${
                  hasBrokenEmbeds && isClosable
                    ? 'pr-5 group-hover:pr-11'
                    : hasBrokenEmbeds
                    ? 'pr-5'
                    : 'group-hover:pr-5'
                }`}
                style={{
                  filter: isTabActive && isContentScrolled && (
                    tab.view_type === 'graph' ||
                    tab.view_type === 'canvas' ||
                    tab.view_mode === 'graph' ||
                    tab.view_mode === 'canvas' ||
                    app?.views?.isViewImmersive(tab.view_type || tab.view_mode)
                  )
                    ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))'
                    : 'none',
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
                {tab.is_pinned && (
                  <PinIcon size={11} className="shrink-0 opacity-70 ml-1 text-[var(--noether-text-muted)]" />
                )}
              </div>

              {/* Warning badge: centered where X is when idle; shifts to the left of X when hovering */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-auto z-20 ${
                  hasBrokenEmbeds && isClosable
                    ? 'right-1.5 group-hover:right-6'
                    : 'right-1.5'
                }`}
              >
                <BrokenEmbedIndicator documentId={tab.document_id} position="bottom" />
              </div>

              {isClosable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTabInPane(targetPaneId, tab.id);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 z-20 text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)]"
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
      </div>

      <button
        onClick={() => {
          setFocusedPane(targetPaneId);
          openEmptyTabInPane(targetPaneId);
        }}
        title="New split tab"
        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] shrink-0 self-center ml-0.5 cursor-pointer"
      >
        <PlusSignIcon size={14} />
      </button>
    </div>
  );
});
