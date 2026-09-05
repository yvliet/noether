import React, { useMemo, useCallback } from 'react';
import { useSidebarDockStore, DockZone, DockItem } from '@/store/sidebarDockStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useFlintApp, useSidebarTabs, useViews, useExtensionList } from '@/core/app/AppContext';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { Cancel01Icon } from '@/components/common/Icons';

const LazyDisabledExtensionView = React.lazy(() =>
  import('@/components/extension-viewer/DisabledExtensionView').then((m) => ({ default: m.DisabledExtensionView }))
);

interface SidebarDockPaneProps {
  zone: DockZone;
}

interface DockEmptyViewProps {
  zone: DockZone;
  activeItemId: string;
}

const DockEmptyView: React.FC<DockEmptyViewProps> = React.memo(({ zone, activeItemId }) => {
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const setIsCommandPaletteOpen = useWorkspaceStore((s) => s.setIsCommandPaletteOpen);
  const setIsHelpModalOpen = useWorkspaceStore((s) => s.setIsHelpModalOpen);
  const undockItem = useSidebarDockStore((s) => s.undockItem);

  const handleCreateNewNote = useCallback(async () => {
    const newDoc = await createNewNote('Untitled', null, 'base', false);
    if (newDoc) {
      useSidebarDockStore.setState((s) => ({
        items: s.items.map((it) =>
          it.id === activeItemId
            ? {
                ...it,
                id: `doc:${newDoc.id}`,
                documentId: newDoc.id,
                title: newDoc.title,
                type: 'document' as const,
              }
            : it
        ),
        activeItemByZone: {
          ...s.activeItemByZone,
          [zone]: `doc:${newDoc.id}`,
        },
      }));
      if (zone === 'left-top') {
        useWorkspaceStore.setState({ activeLeftView: `doc:${newDoc.id}` as any });
      } else if (zone === 'right-top') {
        useWorkspaceStore.setState({ activeRightTab: `doc:${newDoc.id}` as any });
      }
    }
  }, [createNewNote, activeItemId, zone]);

  const handleClose = useCallback(() => {
    undockItem(activeItemId);
    if (zone === 'left-top') {
      useWorkspaceStore.setState({ activeLeftView: 'files' });
    } else if (zone === 'right-top') {
      useWorkspaceStore.setState({ activeRightTab: undefined });
    }
  }, [undockItem, activeItemId, zone]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center select-none p-6 gap-3 bg-transparent">
      <button
        onClick={handleCreateNewNote}
        className="text-[13px] text-[#888888] hover:text-[#dcddde] transition-colors cursor-pointer"
      >
        Create new note <span className="text-[#555] ml-1">Ctrl + N</span>
      </button>

      <button
        onClick={() => setIsCommandPaletteOpen(true)}
        className="text-[13px] text-[#888888] hover:text-[#dcddde] transition-colors cursor-pointer"
      >
        Go to file <span className="text-[#555] ml-1">Ctrl + O</span>
      </button>

      <button
        onClick={() => setIsHelpModalOpen(true)}
        className="text-[13px] text-[#888888] hover:text-[#dcddde] transition-colors cursor-pointer"
      >
        Syntax & Help Guide <span className="text-[#555] ml-1">F1</span>
      </button>

      <button
        onClick={handleClose}
        className="text-[13px] text-[#888888] hover:text-[#dcddde] transition-colors cursor-pointer"
      >
        Close
      </button>
    </div>
  );
});

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
            `doc:${it.documentId}` === activeLeftView ||
            it.id.endsWith(`:${activeLeftView}`) ||
            (typeof activeLeftView === 'string' &&
              activeLeftView.includes(':') &&
              it.id === activeLeftView.split(':')[1]))
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
            it.id.endsWith(`:${activeRightTab}`) ||
            (typeof activeRightTab === 'string' &&
              activeRightTab.includes(':') &&
              it.id === activeRightTab.split(':')[1]))
      );
      if (match) return match;
    }

    // 3. Check direct match on activeItemId for this zone
    if (activeItemId) {
      const direct = items.find(
        (it) =>
          it.zone === zone &&
          it.enabled &&
          (it.id === activeItemId ||
            it.extensionId === activeItemId ||
            it.viewType === activeItemId ||
            it.id.endsWith(`:${activeItemId}`) ||
            (typeof activeItemId === 'string' &&
              activeItemId.includes(':') &&
              it.id === activeItemId.split(':')[1]))
      );
      if (direct) return direct;
    }

    // 4. Fallback to first enabled item in this zone
    const zoneItems = items
      .filter((it) => it.zone === zone && it.enabled)
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));

    if (zone === 'left-top') {
      // In left-top, do not arbitrarily fall back to bookmarks or other extensions
      return null;
    }

    return zoneItems.length > 0 ? zoneItems[0] : null;
  }, [items, activeItemId, zone, activeLeftView, activeRightTab]);

  if (!activeItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[#666] text-xs gap-2 select-none py-16">
        <Cancel01Icon size={24} className="opacity-40" />
        <span>There's nothing in here</span>
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

  // If it's a new or empty document tab in the dock, render the empty tab state
  const isDocLike =
    (activeItem.type === 'document' || activeItem.id.startsWith('doc:')) &&
    (!activeItem.documentId || activeItem.documentId.startsWith('__'));

  if (isDocLike) {
    return <DockEmptyView zone={zone} activeItemId={activeItem.id} />;
  }

  // 2. If it is a registered sidebar tab extension (Outline, Bookmarks, Backlinks, etc.)
  const allSidebarTabs = [...leftTabs, ...rightTabs];
  const extTab = allSidebarTabs.find(
    (t) =>
      t.id === activeItem.id ||
      t.id === activeItem.viewType ||
      t.id === activeItem.extensionId ||
      t.id.endsWith(`:${activeItem.id}`) ||
      (typeof activeItem.id === 'string' &&
        activeItem.id.includes(':') &&
        t.id === activeItem.id.split(':')[1])
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

  // Fallback: render the clean empty tab state rather than "Panel content unavailable"
  return <DockEmptyView zone={zone} activeItemId={activeItem.id} />;
});
