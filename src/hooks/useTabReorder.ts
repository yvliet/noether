import { useState, useRef, useCallback, useEffect } from 'react';
import {
  dragTooltipManager,
  STICKY_NOTE_02_SVG,
  FOLDER_SVG,
  GIT_FORK_SVG,
  CANVAS_LAYOUT_SVG,
} from '@/lib/dragTooltip';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSidebarDockStore, DockZone } from '@/store/sidebarDockStore';

export interface UseTabReorderOptions<T> {
  paneId?: string;
  items: T[];
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
  getDisplayTitle?: (item: T) => string;
  getIconSvg?: (item: T) => string;
  dragDistanceThreshold?: number;
}

export interface UseDockReorderOptions<T extends { id: string }> {
  zone: DockZone;
  items: T[];
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
  getDisplayTitle?: (item: T) => string;
  getIconSvg?: (item: T) => string;
  dragDistanceThreshold?: number;
}

export interface ActiveTabDrag {
  sourceType: 'tab' | 'dock';
  sourcePaneId?: string;
  sourceIndex: number;
  sourceDockZone?: DockZone;
  sourceDockItemId?: string;
  targetPaneId: string | null;
  targetDockZone: DockZone | null;
  targetSlotIndex: number;
  indicatorLeft: number | null;
}

interface PaneRegistryEntry {
  paneId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  tabRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  getItems: () => any[];
}

interface DockZoneRegistryEntry {
  zone: DockZone;
  containerRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  getItems: () => any[];
}

// Module-level global registry for cross-pane and sidebar dock drag coordination
const paneRegistries = new Map<string, PaneRegistryEntry>();
const dockZoneRegistries = new Map<DockZone, DockZoneRegistryEntry>();
const dragListeners = new Set<(state: ActiveTabDrag | null) => void>();
let currentGlobalDrag: ActiveTabDrag | null = null;

export const SIDEBAR_ONLY_VIEWS = new Set([
  'files',
  'file-tree',
  'file-explorer',
  'search',
  'bookmarks',
  'outline',
  'tags',
  'properties',
  'backlinks',
]);

export function isItemAllowedInEditorPane(item: any): boolean {
  if (!item) return true;
  // Documents / notes are always allowed
  if (
    item.type === 'document' ||
    (typeof item.id === 'string' && item.id.startsWith('doc:')) ||
    (item.documentId && !item.documentId.startsWith('__'))
  ) {
    return true;
  }
  const viewType =
    item.viewType ||
    (typeof item.id === 'string' && item.id.startsWith('view:')
      ? item.id.slice(5)
      : typeof item.id === 'string'
      ? item.id
      : '');
  if (viewType && SIDEBAR_ONLY_VIEWS.has(viewType.toLowerCase())) {
    return false;
  }
  return true;
}

function broadcastDragState(state: ActiveTabDrag | null) {
  currentGlobalDrag = state;
  dragListeners.forEach((listener) => listener(state));
}

export function useActiveTabDrag() {
  const [activeDrag, setActiveDrag] = useState<ActiveTabDrag | null>(currentGlobalDrag);
  useEffect(() => {
    const listener = (state: ActiveTabDrag | null) => {
      setActiveDrag(state ? { ...state } : null);
    };
    dragListeners.add(listener);
    return () => {
      dragListeners.delete(listener);
    };
  }, []);
  return activeDrag;
}

function computeDragTargets(cursorX: number, cursorY: number, draggedItem?: any): {
  targetPaneId: string | null;
  targetDockZone: DockZone | null;
  targetSlotIndex: number;
  indicatorLeft: number | null;
} {
  // 1. Check all registered dock zone icon bars first (top & bottom icon strips)
  for (const [zone, reg] of dockZoneRegistries.entries()) {
    const cEl = reg.containerRef.current;
    if (!cEl || cEl.offsetParent === null) continue;
    const cRect = cEl.getBoundingClientRect();
    if (
      cursorX >= cRect.left - 10 &&
      cursorX <= cRect.right + 10 &&
      cursorY >= cRect.top - 15 &&
      cursorY <= cRect.bottom + 15
    ) {
      const items = reg.getItems();
      const N = items.length;
      const currentRects = items.map(
        (_, i) => reg.itemRefs.current[i]?.getBoundingClientRect() || new DOMRect()
      );

      let targetSlot = 0;
      if (N === 0) {
        targetSlot = 0;
      } else if (currentRects[0] && currentRects[N - 1]) {
        const firstMid = currentRects[0].left + currentRects[0].width / 2;
        const lastMid = currentRects[N - 1].left + currentRects[N - 1].width / 2;

        if (cursorX < firstMid) {
          targetSlot = 0;
        } else if (cursorX >= lastMid) {
          targetSlot = N;
        } else {
          for (let i = 0; i < N - 1; i++) {
            const midCurrent = currentRects[i].left + currentRects[i].width / 2;
            const midNext = currentRects[i + 1].left + currentRects[i + 1].width / 2;
            if (cursorX >= midCurrent && cursorX < midNext) {
              targetSlot = i + 1;
              break;
            }
          }
        }
      }

      const scrollLeft = cEl.scrollLeft || 0;
      let indicatorLeft: number | null = null;
      if (N === 0) {
        indicatorLeft = 8 + scrollLeft;
      } else if (targetSlot === 0 && currentRects[0]) {
        indicatorLeft = currentRects[0].left - cRect.left + scrollLeft - 2;
      } else if (targetSlot >= N && currentRects[N - 1]) {
        indicatorLeft = currentRects[N - 1].right - cRect.left + scrollLeft + 2;
      } else if (currentRects[targetSlot - 1] && currentRects[targetSlot]) {
        indicatorLeft =
          (currentRects[targetSlot - 1].right + currentRects[targetSlot].left) / 2 -
          cRect.left +
          scrollLeft -
          1.5;
      }

      return {
        targetPaneId: null,
        targetDockZone: zone,
        targetSlotIndex: targetSlot,
        indicatorLeft,
      };
    }
  }

  // 2. Check sidebar body regions for bottom split drop target
  const leftSidebarEl = document.querySelector('aside[data-sidebar-side="left"]');
  if (leftSidebarEl) {
    const rect = leftSidebarEl.getBoundingClientRect();
    if (
      cursorX >= rect.left &&
      cursorX <= rect.right &&
      cursorY >= rect.top &&
      cursorY <= rect.bottom
    ) {
      const midY = rect.top + rect.height * 0.45;
      if (cursorY >= midY) {
        return {
          targetPaneId: null,
          targetDockZone: 'left-bottom',
          targetSlotIndex: 999,
          indicatorLeft: null,
        };
      }
    }
  }

  const rightSidebarEl = document.querySelector('aside[data-sidebar-side="right"]');
  if (rightSidebarEl) {
    const rect = rightSidebarEl.getBoundingClientRect();
    if (
      cursorX >= rect.left &&
      cursorX <= rect.right &&
      cursorY >= rect.top &&
      cursorY <= rect.bottom
    ) {
      const midY = rect.top + rect.height * 0.45;
      if (cursorY >= midY) {
        return {
          targetPaneId: null,
          targetDockZone: 'right-bottom',
          targetSlotIndex: 999,
          indicatorLeft: null,
        };
      }
    }
  }

  // 3. Check center panes
  if (draggedItem && !isItemAllowedInEditorPane(draggedItem)) {
    return {
      targetPaneId: null,
      targetDockZone: null,
      targetSlotIndex: -1,
      indicatorLeft: null,
    };
  }

  let targetPane: PaneRegistryEntry | null = null;
  const elements =
    typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(cursorX, cursorY)
      : [];
  for (const el of elements) {
    const pId = el.getAttribute('data-pane-id');
    if (pId && paneRegistries.has(pId)) {
      targetPane = paneRegistries.get(pId) || null;
      break;
    }
    const closestPane = el.closest('[data-pane-id]');
    if (closestPane) {
      const closestId = closestPane.getAttribute('data-pane-id');
      if (closestId && paneRegistries.has(closestId)) {
        targetPane = paneRegistries.get(closestId) || null;
        break;
      }
    }
  }

  if (!targetPane) {
    for (const reg of paneRegistries.values()) {
      const cEl = reg.containerRef.current;
      if (!cEl) continue;
      const colEl = cEl.closest('[data-pane-id]') || cEl;
      const colRect = colEl.getBoundingClientRect();
      if (
        cursorX >= colRect.left &&
        cursorX <= colRect.right &&
        cursorY >= colRect.top - 20 &&
        cursorY <= colRect.bottom + 40
      ) {
        targetPane = reg;
        break;
      }
    }
  }

  if (!targetPane) {
    return {
      targetPaneId: null,
      targetDockZone: null,
      targetSlotIndex: -1,
      indicatorLeft: null,
    };
  }

  const tItems = targetPane.getItems();
  const N = tItems.length;
  const cEl = targetPane.containerRef.current;
  const cRect = cEl ? cEl.getBoundingClientRect() : null;
  const currentRects = tItems.map(
    (_, i) => targetPane!.tabRefs.current[i]?.getBoundingClientRect() || new DOMRect()
  );

  let targetSlot = 0;
  if (N > 0 && currentRects[0] && currentRects[N - 1]) {
    const firstMid = currentRects[0].left + currentRects[0].width / 2;
    const lastMid = currentRects[N - 1].left + currentRects[N - 1].width / 2;

    if (cursorX < firstMid) {
      targetSlot = 0;
    } else if (cursorX >= lastMid) {
      targetSlot = N;
    } else {
      for (let i = 0; i < N - 1; i++) {
        const midCurrent = currentRects[i].left + currentRects[i].width / 2;
        const midNext = currentRects[i + 1].left + currentRects[i + 1].width / 2;
        if (cursorX >= midCurrent && cursorX < midNext) {
          targetSlot = i + 1;
          break;
        }
      }
    }
  }

  const scrollLeft = cEl ? cEl.scrollLeft || 0 : 0;
  let indicatorLeft: number | null = null;
  if (cRect) {
    if (N === 0) {
      indicatorLeft = scrollLeft;
    } else if (targetSlot === 0 && currentRects[0]) {
      indicatorLeft = currentRects[0].left - cRect.left + scrollLeft - 1.5;
    } else if (targetSlot >= N && currentRects[N - 1]) {
      indicatorLeft = currentRects[N - 1].right - cRect.left + scrollLeft + 0.5;
    } else if (currentRects[targetSlot - 1] && currentRects[targetSlot]) {
      indicatorLeft =
        (currentRects[targetSlot - 1].right + currentRects[targetSlot].left) / 2 -
        cRect.left +
        scrollLeft -
        1.5;
    }
  }


  return {
    targetPaneId: targetPane.paneId,
    targetDockZone: null,
    targetSlotIndex: targetSlot,
    indicatorLeft,
  };
}

function finishGlobalDrag(hasStartedDrag: boolean) {
  const drag = currentGlobalDrag;
  if (hasStartedDrag && drag) {
    if (drag.targetDockZone && drag.targetSlotIndex !== -1) {
      if (drag.sourceType === 'dock' && drag.sourceDockZone && drag.sourceDockItemId) {
        if (drag.sourceDockZone === drag.targetDockZone) {
          useSidebarDockStore
            .getState()
            .reorderItemInZone(drag.targetDockZone, drag.sourceDockItemId, drag.targetSlotIndex);
        } else {
          useSidebarDockStore
            .getState()
            .moveItemToZone(drag.sourceDockItemId, drag.targetDockZone, drag.targetSlotIndex);
        }

      } else if (drag.sourceType === 'tab' && drag.sourcePaneId) {
        // Center workspace tab -> Dock Zone
        const sourceTab = (useWorkspaceStore.getState().panes[drag.sourcePaneId]?.tabs[drag.sourceIndex]) as any;
        if (sourceTab) {
          useSidebarDockStore.getState().dockTab(sourceTab, drag.targetDockZone, drag.targetSlotIndex);
          if (drag.targetDockZone.startsWith('left')) {
            useWorkspaceStore.getState().setIsLeftSidebarOpen(true);
          } else {
            useWorkspaceStore.getState().setIsRightSidebarOpen(true);
          }
          useWorkspaceStore.getState().closeTabInPane(drag.sourcePaneId, sourceTab.id);
        }
      }
    } else if (drag.targetPaneId && drag.targetSlotIndex !== -1) {
      if (drag.sourceType === 'dock' && drag.sourceDockItemId) {
        const dockItem = useSidebarDockStore
          .getState()
          .items.find((it) => it.id === drag.sourceDockItemId);
        if (dockItem) {
          if (!isItemAllowedInEditorPane(dockItem)) {
            return;
          }
          const isDoc =
            (dockItem.type === 'document' || dockItem.id.startsWith('doc:')) &&
            dockItem.documentId &&
            !dockItem.documentId.startsWith('__');
          if (isDoc && dockItem.documentId) {
            useWorkspaceStore.getState().openTabInPane(drag.targetPaneId, dockItem.documentId, dockItem.title);
          } else {
            const viewType =
              dockItem.viewType ||
              (dockItem.id.startsWith('view:') ? dockItem.id.slice(5) : dockItem.id);
            if (viewType && !SIDEBAR_ONLY_VIEWS.has(viewType.toLowerCase())) {
              useWorkspaceStore.getState().openCustomTabInPane(drag.targetPaneId, {
                id: `tab-${viewType}-${Date.now()}`,
                viewType,
                title: dockItem.title || viewType,
                documentId: dockItem.documentId || `__${viewType}__`,
              });
            }
          }
        }
      } else if (drag.sourceType === 'tab' && drag.sourcePaneId) {
        if (drag.sourcePaneId === drag.targetPaneId) {
          const sIdx = drag.sourceIndex;
          const tSlot = drag.targetSlotIndex;
          const targetIdx = sIdx < tSlot ? tSlot - 1 : tSlot;
          if (sIdx !== targetIdx) {
            useWorkspaceStore.getState().reorderTabsInPane(drag.sourcePaneId, sIdx, targetIdx);
          }
        } else {
          useWorkspaceStore
            .getState()
            .moveTabBetweenPanes(
              drag.sourcePaneId,
              drag.sourceIndex,
              drag.targetPaneId,
              drag.targetSlotIndex
            );
        }
      }
    }
  }
}

export function useTabReorder<T>({
  paneId = 'main',
  items,
  onReorder: _onReorder,
  getDisplayTitle,
  getIconSvg,
  dragDistanceThreshold = 4,
}: UseTabReorderOptions<T>) {
  const [activeDrag, setActiveDrag] = useState<ActiveTabDrag | null>(currentGlobalDrag);
  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const getDisplayTitleRef = useRef(getDisplayTitle);
  getDisplayTitleRef.current = getDisplayTitle;

  const getIconSvgRef = useRef(getIconSvg);
  getIconSvgRef.current = getIconSvg;

  const justDraggedRef = useRef(false);

  // Register this pane in the module registry
  useEffect(() => {
    paneRegistries.set(paneId, {
      paneId,
      containerRef,
      tabRefs,
      getItems: () => itemsRef.current,
    });

    const listener = (state: ActiveTabDrag | null) => {
      setActiveDrag(state ? { ...state } : null);
    };
    dragListeners.add(listener);

    return () => {
      paneRegistries.delete(paneId);
      dragListeners.delete(listener);
    };
  }, [paneId]);

  const registerTabRef = useCallback((index: number, el: HTMLElement | null) => {
    tabRefs.current[index] = el;
  }, []);

  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input')) {
        return;
      }

      const targetEl = e.currentTarget as HTMLElement;
      targetEl.setPointerCapture?.(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      let hasStartedDrag = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (!hasStartedDrag) {
          if (Math.hypot(dx, dy) >= dragDistanceThreshold) {
            hasStartedDrag = true;
            justDraggedRef.current = true;
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            const currentItem = itemsRef.current[index];
            const title = getDisplayTitleRef.current
              ? getDisplayTitleRef.current(currentItem)
              : (currentItem as any)?.title || 'Tab';
            const iconSvg = getIconSvgRef.current
              ? getIconSvgRef.current(currentItem)
              : (currentItem as any)?.view_type === 'graph' || (currentItem as any)?.document_id === '__graph__'
              ? GIT_FORK_SVG
              : (currentItem as any)?.view_type === 'canvas' || (currentItem as any)?.document_id === '__canvas__'
              ? CANVAS_LAYOUT_SVG
              : STICKY_NOTE_02_SVG;

            dragTooltipManager.show(
              title,
              null,
              iconSvg,
              moveEvent.clientX,
              moveEvent.clientY
            );
          } else {
            return;
          }
        }

        const currentItem = itemsRef.current[index];
        dragTooltipManager.updatePosition(moveEvent.clientX, moveEvent.clientY);

        const targets = computeDragTargets(moveEvent.clientX, moveEvent.clientY, currentItem);
        const isInvalidDrop = !targets.targetPaneId && !targets.targetDockZone;
        const cursorStyle = isInvalidDrop ? 'no-drop' : 'grabbing';
        targetEl.style.cursor = cursorStyle;
        document.body.style.cursor = cursorStyle;

        broadcastDragState({
          sourceType: 'tab',
          sourcePaneId: paneId,
          sourceIndex: index,
          ...targets,
        });
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        targetEl.releasePointerCapture?.(upEvent.pointerId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        targetEl.style.cursor = '';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        dragTooltipManager.hide();

        finishGlobalDrag(hasStartedDrag);

        setTimeout(() => {
          justDraggedRef.current = false;
        }, 50);

        broadcastDragState(null);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [paneId, dragDistanceThreshold]
  );

  const getTabStyle = useCallback(
    (_index: number, isActive = false): React.CSSProperties => {
      return {
        zIndex: isActive ? 20 : 1,
      };
    },
    []
  );

  const hasDragged = useCallback(() => {
    return justDraggedRef.current;
  }, []);

  const isDragging = activeDrag !== null && activeDrag.sourceType === 'tab' && activeDrag.sourcePaneId === paneId;
  const isDropTarget = activeDrag !== null && activeDrag.targetPaneId === paneId;
  const dropIndicatorLeft = isDropTarget ? activeDrag.indicatorLeft : null;

  return {
    containerRef,
    registerTabRef,
    handlePointerDown,
    getTabStyle,
    hasDragged,
    isDragging,
    isDropTarget,
    dragIndex: isDragging ? activeDrag.sourceIndex : -1,
    dropSlotIndex: isDropTarget ? activeDrag.targetSlotIndex : -1,
    dropIndicatorLeft,
  };
}

export function useDockReorder<T extends { id: string; title: string }>({
  zone,
  items,
  getDisplayTitle,
  getIconSvg,
  dragDistanceThreshold = 4,
}: UseDockReorderOptions<T>) {
  const [activeDrag, setActiveDrag] = useState<ActiveTabDrag | null>(currentGlobalDrag);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const getDisplayTitleRef = useRef(getDisplayTitle);
  getDisplayTitleRef.current = getDisplayTitle;

  const getIconSvgRef = useRef(getIconSvg);
  getIconSvgRef.current = getIconSvg;

  const justDraggedRef = useRef(false);

  useEffect(() => {
    dockZoneRegistries.set(zone, {
      zone,
      containerRef,
      itemRefs,
      getItems: () => itemsRef.current,
    });

    const listener = (state: ActiveTabDrag | null) => {
      setActiveDrag(state ? { ...state } : null);
    };
    dragListeners.add(listener);

    return () => {
      dockZoneRegistries.delete(zone);
      dragListeners.delete(listener);
    };
  }, [zone]);

  const registerItemRef = useCallback((index: number, el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('input')) return;

      const targetEl = e.currentTarget as HTMLElement;
      targetEl.setPointerCapture?.(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      let hasStartedDrag = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (!hasStartedDrag) {
          if (Math.hypot(dx, dy) >= dragDistanceThreshold) {
            hasStartedDrag = true;
            justDraggedRef.current = true;
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            const currentItem = itemsRef.current[index];
            const title = getDisplayTitleRef.current
              ? getDisplayTitleRef.current(currentItem)
              : (currentItem as any)?.title || 'Item';

            const isDoc =
              ((currentItem as any)?.type === 'document' || (currentItem as any)?.id?.startsWith('doc:')) &&
              (currentItem as any)?.documentId &&
              !(currentItem as any)?.documentId?.startsWith('__');

            const iconSvg = getIconSvgRef.current
              ? getIconSvgRef.current(currentItem)
              : isDoc
              ? STICKY_NOTE_02_SVG
              : (currentItem as any)?.viewType === 'graph' || (currentItem as any)?.id === 'graph'
              ? GIT_FORK_SVG
              : (currentItem as any)?.viewType === 'canvas' || (currentItem as any)?.id === 'canvas'
              ? CANVAS_LAYOUT_SVG
              : FOLDER_SVG;

            dragTooltipManager.show(title, null, iconSvg, moveEvent.clientX, moveEvent.clientY);
          } else {
            return;
          }
        }

        const currentItem = itemsRef.current[index];
        dragTooltipManager.updatePosition(moveEvent.clientX, moveEvent.clientY);

        const targets = computeDragTargets(moveEvent.clientX, moveEvent.clientY, currentItem);
        const isInvalidDrop = !targets.targetPaneId && !targets.targetDockZone;
        const cursorStyle = isInvalidDrop ? 'no-drop' : 'grabbing';
        targetEl.style.cursor = cursorStyle;
        document.body.style.cursor = cursorStyle;

        broadcastDragState({
          sourceType: 'dock',
          sourceDockZone: zone,
          sourceDockItemId: itemsRef.current[index]?.id,
          sourceIndex: index,
          ...targets,
        });
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        targetEl.releasePointerCapture?.(upEvent.pointerId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        targetEl.style.cursor = '';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        dragTooltipManager.hide();

        finishGlobalDrag(hasStartedDrag);

        setTimeout(() => {
          justDraggedRef.current = false;
        }, 50);

        broadcastDragState(null);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    },
    [zone, dragDistanceThreshold]
  );

  const hasDragged = useCallback(() => justDraggedRef.current, []);
  const isDragging = activeDrag !== null && activeDrag.sourceType === 'dock' && activeDrag.sourceDockZone === zone;
  const isDropTarget = activeDrag !== null && activeDrag.targetDockZone === zone;
  const dropIndicatorLeft = isDropTarget ? activeDrag.indicatorLeft : null;

  return {
    containerRef,
    registerItemRef,
    handlePointerDown,
    hasDragged,
    isDragging,
    isDropTarget,
    dragIndex: isDragging ? activeDrag.sourceIndex : -1,
    dropSlotIndex: isDropTarget ? activeDrag.targetSlotIndex : -1,
    dropIndicatorLeft,
  };
}
