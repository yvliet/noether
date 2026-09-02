import React, { useState, useMemo, useCallback } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useFlintApp, useSidebarTabs } from '@/core/app/AppContext';
import { useSidebarDockStore } from '@/store/sidebarDockStore';
import { SidebarDockPane } from './SidebarDockPane';
import { SidebarSecondaryIconBar } from './SidebarSecondaryIconBar';
import { useActiveTabDrag } from '@/hooks/useTabReorder';

export const RightSidebar: React.FC = React.memo(() => {

  const app = useFlintApp();
  const rightTabs = useSidebarTabs('right');
  const rightSidebarWidth = useWorkspaceStore((s) => s.rightSidebarWidth);
  const setRightSidebarWidth = useWorkspaceStore((s) => s.setRightSidebarWidth);
  const activeRightTab = useWorkspaceStore((s) => s.activeRightTab);
  const [isResizing, setIsResizing] = useState(false);
  const [isVerticalSplitResizing, setIsVerticalSplitResizing] = useState(false);

  const dockItems = useSidebarDockStore((s) => s.items);
  const splitRatioRight = useSidebarDockStore((s) => s.splitRatioRight);
  const setSplitRatio = useSidebarDockStore((s) => s.setSplitRatio);

  const bottomDockItems = useMemo(
    () => dockItems.filter((it) => it.zone === 'right-bottom' && it.enabled),
    [dockItems]
  );
  const hasBottomSplit = bottomDockItems.length > 0;

  const isDockedTop = useMemo(() => {
    return (
      (typeof activeRightTab === 'string' && activeRightTab.startsWith('doc:')) ||
      dockItems.some(
        (it) =>
          (it.id === activeRightTab ||
            it.viewType === activeRightTab ||
            it.extensionId === activeRightTab ||
            it.documentId === activeRightTab ||
            `doc:${it.documentId}` === activeRightTab ||
            it.id.endsWith(`:${activeRightTab}`)) &&
          it.zone === 'right-top' &&
          it.enabled
      )
    );
  }, [activeRightTab, dockItems]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      setRightSidebarWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [rightSidebarWidth, setRightSidebarWidth]);

  const handleVerticalSplitResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsVerticalSplitResizing(true);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const sidebarEl = (e.target as HTMLElement).closest('aside[data-sidebar="true"]');
      if (!sidebarEl) return;

      const sidebarRect = sidebarEl.getBoundingClientRect();
      const totalHeight = sidebarRect.height;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const relativeY = moveEvent.clientY - sidebarRect.top;
        const newRatio = relativeY / totalHeight;
        setSplitRatio('right', newRatio);
      };

      const handleMouseUp = () => {
        setIsVerticalSplitResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [setSplitRatio]
  );

  // Find active tab definition
  const currentTab = useMemo(
    () => rightTabs.find((t) => t.id === activeRightTab || t.id.endsWith(`:${activeRightTab}`)) || rightTabs[0],
    [rightTabs, activeRightTab]
  );

  const activeDrag = useActiveTabDrag();

  return (
    <aside
      data-sidebar="true"
      data-sidebar-side="right"
      style={{
        width: `${rightSidebarWidth}px`,
        background: 'var(--flint-bg-sidebar-gradient, var(--flint-bg-sidebar))',
      }}
      className="flex flex-col h-full select-none shrink-0 text-xs relative"
    >
      {activeDrag?.targetDockZone === 'right-bottom' && (
        <div
          style={{
            bottom: '8px',
            height: '46%',
            background: 'rgba(128, 128, 128, 0.42)',
          }}
          className="absolute inset-x-2 rounded-xl pointer-events-none z-50"
        />
      )}

      {/* Draggable left edge resize handle */}


      <div
        onMouseDown={handleResizeStart}
        className="absolute top-0 -left-1 w-2 h-full cursor-col-resize z-40 flex justify-center group"
      >
        <div
          className={`w-[2px] h-full ${
            isResizing ? 'bg-white' : 'bg-transparent group-hover:bg-white/50'
          }`}
        />
      </div>

      {/* Active Top Tab View */}
      <div
        style={hasBottomSplit ? { flex: splitRatioRight } : { flex: 1 }}
        className="min-h-0 flex flex-col overflow-hidden"
      >
        {isDockedTop ? (
          <SidebarDockPane zone="right-top" />
        ) : currentTab ? (
          currentTab.render(app)
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#666]">
            No inspector tabs enabled
          </div>
        )}
      </div>

      {/* Bottom Split (if any docked items in right-bottom) */}
      {hasBottomSplit && (
        <div
          style={{ flex: 1 - splitRatioRight }}
          className="min-h-0 flex flex-col relative overflow-hidden"
        >
          {/* Resizable horizontal divider */}
          <div
            onMouseDown={handleVerticalSplitResizeStart}
            className="w-full h-1 cursor-row-resize z-30 group flex items-center justify-center -my-0.5"
          >
            <div
              className={`w-full h-[1px] ${
                isVerticalSplitResizing ? 'bg-white' : 'bg-[var(--flint-border-base)] group-hover:bg-white/50'
              }`}
            />
          </div>

          <SidebarSecondaryIconBar zone="right-bottom" />

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col">
            <SidebarDockPane zone="right-bottom" />
          </div>
        </div>
      )}
    </aside>
  );
});



