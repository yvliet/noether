import React, { useMemo } from 'react';
import { useSidebarDockStore, DockZone } from '@/store/sidebarDockStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useFlintApp, useSidebarTabs, useViews, useExtensionList } from '@/core/app/AppContext';
import { EditorCanvas } from '@/components/editor/EditorCanvas';

const LazyDisabledExtensionView = React.lazy(() =>
  import('@/components/extension-viewer/DisabledExtensionView').then((m) => ({ default: m.DisabledExtensionView }))
);

interface SidebarDockPaneProps {
  zone: DockZone;
}

export const SidebarDockPane: React.FC<SidebarDockPaneProps> = React.memo(({ zone }) => {
  const app = useFlintApp();
  useViews(); // Reactive updates on view registrations
  useExtensionList(); // Reactive updates on extension state changes
  const items = useSidebarDockStore((s) => s.items);
  const activeItemId = useSidebarDockStore((s) => s.activeItemByZone[zone]);
  const activeLeftView = useWorkspaceStore((s) => s.activeLeftView);
  const activeRightTab = useWorkspaceStore((s) => s.activeRightTab);
  const leftTabs = useSidebarTabs('left');
  const rightTabs = useSidebarTabs('right');

  const activeItem = useMemo(() => {
    // 1. If left-top zone, check activeLeftView first if it's not files/search
    if (zone === 'left-top' && activeLeftView && activeLeftView !== 'files' && activeLeftView !== 'search') {
      const match = items.find(
        (it) =>
          it.zone === 'left-top' &&
          it.enabled &&
          (it.id === activeLeftView ||
            it.viewType === activeLeftView ||
            it.extensionId === activeLeftView ||
            it.documentId === activeLeftView ||
            `doc:${it.documentId}` === activeLeftView)
      );
      if (match) return match;
    }

    // 2. If right-top zone, check activeRightTab first
    if (zone === 'right-top' && activeRightTab) {
      const match = items.find(
        (it) =>
          it.zone === 'right-top' &&
          it.enabled &&
          (it.id === activeRightTab ||
            it.viewType === activeRightTab ||
            it.extensionId === activeRightTab ||
            it.documentId === activeRightTab ||
            `doc:${it.documentId}` === activeRightTab ||
            it.id.endsWith(`:${activeRightTab}`))
      );
      if (match) return match;
    }

    // 3. Check direct match on activeItemId for this zone
    if (activeItemId) {
      const direct = items.find((it) => it.id === activeItemId && it.zone === zone && it.enabled);
      if (direct) return direct;
    }

    // 4. Fallback to first enabled item in this zone
    const zoneItems = items
      .filter((it) => it.zone === zone && it.enabled)
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));

    if (zone === 'left-top') {
      // In left-top, filter out files/search fallback since LeftSidebar handles those directly
      const nonBuiltIn = zoneItems.filter((it) => it.id !== 'files' && it.id !== 'search');
      return nonBuiltIn.length > 0 ? nonBuiltIn[0] : null;
    }

    return zoneItems.length > 0 ? zoneItems[0] : null;
  }, [items, activeItemId, zone, activeLeftView, activeRightTab]);

  if (!activeItem) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-[var(--flint-text-muted)] select-none">
        No active panel
      </div>
    );
  }

  // 1. If it is a real document, render full editable EditorCanvas
  const isDoc =
    (activeItem.type === 'document' || activeItem.id.startsWith('doc:')) &&
    activeItem.documentId &&
    !activeItem.documentId.startsWith('__');

  if (isDoc && activeItem.documentId) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <EditorCanvas
          key={`sidebar-canvas-${zone}-${activeItem.documentId}`}
          pane="split"
          paneId={`sidebar:${zone}`}
          documentId={activeItem.documentId}
          isSidebar={true}
        />
      </div>
    );
  }

  // 2. If it is a registered sidebar tab extension (Outline, Bookmarks, Backlinks, etc.)
  const allSidebarTabs = [...leftTabs, ...rightTabs];
  const extTab = allSidebarTabs.find(
    (t) =>
      t.id === activeItem.id ||
      t.id === activeItem.viewType ||
      t.id.endsWith(`:${activeItem.id}`) ||
      (activeItem.id.includes(':') && t.id === activeItem.id.split(':')[1])
  );

  if (extTab) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {extTab.render(app)}
      </div>
    );
  }

  // 3. If it is a workspace view (Graph View, Canvas, Marketplace, Tasks, Flashcards, etc.)
  const viewType =
    activeItem.viewType ||
    (activeItem.id.startsWith('view:') ? activeItem.id.slice(5) : activeItem.id);

  if (viewType && viewType !== 'document') {
    const extState = app.extensions.getViewExtensionState(viewType);
    if (extState.state === 'active') {
      return (
        <div data-sidebar-dock-pane="true" className="flex-1 flex flex-col h-full overflow-hidden relative">
          {extState.view.render({
            tabId: activeItem.id,
            documentId: activeItem.documentId || `__${viewType}__`,
            app,
            isSidebar: true,
          } as any)}
        </div>
      );
    }
    if (extState.state === 'disabled') {
      return (
        <div data-sidebar-dock-pane="true" className="flex-1 flex flex-col h-full overflow-hidden relative">
          <React.Suspense fallback={null}>
            <LazyDisabledExtensionView
              extensionId={extState.extensionId || extState.pluginId}
              extensionName={extState.manifest.name}
              viewTitle={extState.viewTitle}
              tabId={activeItem.id}
            />
          </React.Suspense>
        </div>
      );
    }

    const regView = app.views.getView(viewType);
    if (regView) {
      return (
        <div data-sidebar-dock-pane="true" className="flex-1 flex flex-col h-full overflow-hidden relative">
          {regView.render({
            tabId: activeItem.id,
            documentId: activeItem.documentId || `__${viewType}__`,
            app,
            isSidebar: true,
          } as any)}
        </div>
      );
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center text-xs text-[var(--flint-text-muted)] select-none">
      Panel content unavailable
    </div>
  );
});
