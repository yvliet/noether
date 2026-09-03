import React, { useCallback } from 'react';
import { useSidebarDockStore, DockZone, DockItem } from '@/store/sidebarDockStore';
import { useFlintApp, useSidebarTabs, useViews } from '@/core/app/AppContext';
import {
  StickyNote02Icon,
  Cancel01Icon,
  Folder01Icon,
  Search01Icon,
  NeuralNetworkIcon,
  Layout01Icon,
  Store01Icon,
  CheckmarkSquare02Icon,
  Brain02Icon,
} from '@/components/common/Icons';

import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDockReorder } from '@/hooks/useTabReorder';

interface SidebarSecondaryIconBarProps {
  zone: 'left-bottom' | 'right-bottom';
}

export const SidebarSecondaryIconBar: React.FC<SidebarSecondaryIconBarProps> = React.memo(({ zone }) => {
  const app = useFlintApp();
  useViews();
  const items = useSidebarDockStore((s) => s.items);
  const activeItemId = useSidebarDockStore((s) => s.activeItemByZone[zone]);
  const setActiveItemInZone = useSidebarDockStore((s) => s.setActiveItemInZone);
  const undockItem = useSidebarDockStore((s) => s.undockItem);
  const moveItemToZone = useSidebarDockStore((s) => s.moveItemToZone);
  const toggleItemEnabled = useSidebarDockStore((s) => s.toggleItemEnabled);
  const openTabInPane = useWorkspaceStore((s) => s.openTabInPane);
  const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId);
  const { showContextMenu } = useAppContextMenu();

  const side = zone.startsWith('left') ? 'left' : 'right';
  const leftTabs = useSidebarTabs('left');
  const rightTabs = useSidebarTabs('right');
  const sidebarTabs = side === 'left' ? leftTabs : rightTabs;

  const zoneItems = items
    .filter((it) => it.zone === zone && it.enabled)
    .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));

  const dockReorder = useDockReorder({
    zone,
    items: zoneItems,
    getDisplayTitle: (it) => it.title,
  });

  const renderIcon = (item: DockItem) => {
    if (item.id === 'files') {
      return <Folder01Icon size={15} />;
    }
    if (item.id === 'search') {
      return <Search01Icon size={15} />;
    }

    const isDoc =
      (item.type === 'document' || item.id.startsWith('doc:')) ||
      item.id.startsWith('tab-') ||
      (!item.viewType || item.viewType === 'document');

    if (isDoc && item.id !== 'files' && item.id !== 'search') {
      return <StickyNote02Icon size={14} />;
    }

    // 1. Check sidebar tabs across both sides
    const allSidebarTabs = [...leftTabs, ...rightTabs];
    const extTab = allSidebarTabs.find(
      (t) =>
        t.id === item.id ||
        t.id === item.viewType ||
        t.id.endsWith(`:${item.id}`) ||
        (item.id.includes(':') && t.id === item.id.split(':')[1])
    );
    if (extTab?.icon) {
      if (React.isValidElement(extTab.icon)) {
        return React.cloneElement(extTab.icon as React.ReactElement<any>, {
          size: 15,
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
            size: 15,
          });
        }
        return regView.icon;
      }
      if (viewType === 'graph') return <NeuralNetworkIcon size={15} />;
      if (viewType === 'canvas') return <Layout01Icon size={15} />;
      if (viewType === 'marketplace') return <Store01Icon size={15} />;
      if (viewType === 'tasks') return <CheckmarkSquare02Icon size={15} />;
      if (viewType === 'flashcards') return <Brain02Icon size={15} />;
    }

    return <Folder01Icon size={15} />;
  };

  const getSidebarExtensionList = useCallback(() => {
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
  }, [side, leftTabs, rightTabs]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: DockItem) => {
      e.preventDefault();
      e.stopPropagation();

      const targetTopZone: DockZone = side === 'left' ? 'left-top' : 'right-top';

      const menuItems: ContextMenuItem[] = [
        {
          id: 'move-to-top',
          title: 'Move to top zone',
          onClick: () => moveItemToZone(item.id, targetTopZone),
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

      const extList = getSidebarExtensionList();
      extList.forEach((ext) => {
        const dockItem = items.find(
          (it) => it.id === ext.id || it.extensionId === ext.id || it.viewType === ext.id
        );
        const isInThisZone = dockItem ? dockItem.zone === zone && dockItem.enabled : false;

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
                moveItemToZone(dockItem.id, zone);
                toggleItemEnabled(dockItem.id, true);
              } else {
                useSidebarDockStore.getState().dockTab(
                  { id: ext.id, title: ext.title, view_type: ext.id } as any,
                  zone
                );
              }
            }
          },
        });
      });

      menuItems.push({
        id: 'sep-collapse',
        type: 'separator',
      });
      menuItems.push({
        id: 'close-bottom-split',
        title: 'Close bottom split',
        isDanger: true,
        onClick: () => {
          const targetTopZone: DockZone = side === 'left' ? 'left-top' : 'right-top';
          zoneItems.forEach((it) => moveItemToZone(it.id, targetTopZone));
        },
      });

      showContextMenu(e, menuItems);
    },
    [side, zone, zoneItems, moveItemToZone, openTabInPane, focusedPaneId, undockItem, toggleItemEnabled, getSidebarExtensionList, items, showContextMenu]
  );

  const handleBarContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const extList = getSidebarExtensionList();

      const menuItems: ContextMenuItem[] = [
        {
          id: 'close-bottom-split',
          title: 'Close bottom split',
          isDanger: true,
          onClick: () => {
            const targetTopZone: DockZone = side === 'left' ? 'left-top' : 'right-top';
            zoneItems.forEach((it) => moveItemToZone(it.id, targetTopZone));
          },
        },
        {
          id: 'sep-header',
          type: 'separator',
        },
        {
          id: 'tabs-header',
          title: `${side === 'left' ? 'Left' : 'Right'} sidebar tabs`,
          disabled: true,
        },
        ...extList.map((ext) => {
          const dockItem = items.find(
            (it) => it.id === ext.id || it.extensionId === ext.id || it.viewType === ext.id
          );
          const isInThisZone = dockItem ? dockItem.zone === zone && dockItem.enabled : false;

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
                  moveItemToZone(dockItem.id, zone);
                  toggleItemEnabled(dockItem.id, true);
                } else {
                  useSidebarDockStore.getState().dockTab(
                    { id: ext.id, title: ext.title, view_type: ext.id } as any,
                    zone
                  );
                }
              }
            },
          };
        }),
      ];

      showContextMenu(e, menuItems);
    },
    [side, zone, zoneItems, moveItemToZone, getSidebarExtensionList, items, toggleItemEnabled, showContextMenu]
  );

  if (zoneItems.length === 0) return null;

  return (
    <div
      data-dock-zone={zone}
      onContextMenu={handleBarContextMenu}
      style={{
        background: 'var(--flint-bg-sidebar-gradient, var(--flint-bg-sidebar, #151515))',
        borderTop: '1px solid var(--flint-border-base)',
        borderBottom: '1px solid var(--flint-border-base)',
      }}
      className="flint-secondary-icon-bar h-[38px] px-2 flex items-center justify-between shrink-0 select-none z-10 relative"
    >
      <div
        ref={dockReorder.containerRef}
        className="flex items-center gap-0.5 min-w-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden relative"
      >
        {zoneItems.map((item, index) => {
          const isActive = activeItemId === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => dockReorder.registerItemRef(index, el)}
              onPointerDown={(e) => dockReorder.handlePointerDown(index, e)}
              onClick={() => {
                if (dockReorder.hasDragged()) return;
                setActiveItemInZone(zone, item.id);
              }}
              onContextMenu={(e) => handleContextMenu(e, item)}
              title={item.title}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'text-[var(--flint-text-secondary)] bg-[var(--flint-bg-card-hover)]'
                  : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)]'
              }`}
            >
              {renderIcon(item)}
            </button>
          );
        })}

        {dockReorder.dropIndicatorLeft !== null && (
          <div
            style={{
              left: `${dockReorder.dropIndicatorLeft}px`,
            }}
            className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[20px] bg-white rounded-full pointer-events-none z-50 shadow-[0_0_4px_rgba(255,255,255,0.6)]"
          />
        )}
      </div>
    </div>
  );
});

