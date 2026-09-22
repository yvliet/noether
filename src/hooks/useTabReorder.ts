import { useState, useRef, useCallback, useEffect } from 'react';
import {
  dragTooltipManager,
  NOTE_ICON_SVG,
  STICKY_NOTE_02_SVG,
  FOLDER_SVG,
  NEURAL_NETWORK_SVG,
  CANVAS_LAYOUT_SVG,
} from '@/lib/dragTooltip';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSidebarDockStore, DockZone } from '@/store/sidebarDockStore';
import { useDocumentStore } from '@/store/documentStore';
import { useDragDropStore } from '@/store/dragDropStore';
import { fileTypeRegistry, isMediaFileName } from '@/core/registries/FileTypeRegistry';
import { getCachedImageSrc, resolveImageSrcAsync } from '@/components/editor/embed-renderer';
import { appInstance } from '@/core/app/NoetherApp';
import { DocumentItem } from '@/types';

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
  sourceType: 'tab' | 'dock' | 'tree';
  sourcePaneId?: string;
  sourceIndex?: number;
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

export function setHeaderDragInteracting(interacting: boolean) {
  if (typeof document === 'undefined') return;
  const headerEl = document.querySelector('header[data-noether-header]') as HTMLElement | null;
  if (!headerEl) return;
  if (interacting) {
    headerEl.setAttribute('data-item-interacting', 'true');
  } else {
    headerEl.removeAttribute('data-item-interacting');
  }
}

export function broadcastDragState(state: ActiveTabDrag | null) {
  currentGlobalDrag = state;
  setHeaderDragInteracting(Boolean(state));
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

export function computeDragTargets(cursorX: number, cursorY: number, draggedItem?: any): {
  targetPaneId: string | null;
  targetDockZone: DockZone | null;
  targetSlotIndex: number;
  indicatorLeft: number | null;
} {
  // 1. Check all registered dock zone icon bars first (top & bottom icon strips)
  for (const [zone, reg] of dockZoneRegistries.entries()) {
    const cEl = reg.containerRef.current;
    if (!cEl || !cEl.isConnected) continue;
    const cRect = cEl.getBoundingClientRect();
    if (cRect.width === 0 && cRect.height === 0) continue;

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
      } else if (targetSlot === 0 && currentRects[0] && currentRects[0].width > 0) {
        indicatorLeft = currentRects[0].left - cRect.left + scrollLeft - 2;
      } else if (targetSlot >= N && currentRects[N - 1] && currentRects[N - 1].width > 0) {
        indicatorLeft = currentRects[N - 1].right - cRect.left + scrollLeft + 2;
      } else if (
        currentRects[targetSlot - 1] &&
        currentRects[targetSlot] &&
        currentRects[targetSlot - 1].width > 0 &&
        currentRects[targetSlot].width > 0
      ) {
        indicatorLeft =
          (currentRects[targetSlot - 1].right + currentRects[targetSlot].left) / 2 -
          cRect.left +
          scrollLeft -
          1.5;
      } else if (currentRects[targetSlot - 1] && currentRects[targetSlot - 1].width > 0) {
        indicatorLeft = currentRects[targetSlot - 1].right - cRect.left + scrollLeft + 2;
      } else {
        indicatorLeft = 8 + scrollLeft;
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
        const elUnderCursor = typeof document !== 'undefined' ? document.elementFromPoint(cursorX, cursorY) : null;
        const isOverTreeNode = Boolean(elUnderCursor?.closest('[data-tree-item-id]'));
        if (!isOverTreeNode) {
          return {
            targetPaneId: null,
            targetDockZone: 'left-bottom',
            targetSlotIndex: 999,
            indicatorLeft: null,
          };
        }
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

  // 3. Check center pane headers
  if (draggedItem && !isItemAllowedInEditorPane(draggedItem)) {
    return {
      targetPaneId: null,
      targetDockZone: null,
      targetSlotIndex: -1,
      indicatorLeft: null,
    };
  }

  let targetPane: PaneRegistryEntry | null = null;
  for (const reg of paneRegistries.values()) {
    const cEl = reg.containerRef.current;
    if (!cEl || !cEl.isConnected) continue;
    const cRect = cEl.getBoundingClientRect();
    if (cRect.width === 0 && cRect.height === 0) continue;

    // Check full pane header container (restricted strictly to header bars, never AppShell pane bodies)
    const headerEl = (
      cEl.closest('header[data-noether-header] [data-pane-id], [data-split-tab-header]') ||
      (typeof document !== 'undefined'
        ? document.querySelector(
            `header[data-noether-header] [data-pane-id="${reg.paneId}"], [data-split-tab-header][data-pane-id="${reg.paneId}"]`
          )
        : null) ||
      cEl.parentElement
    ) as HTMLElement | null;

    if (headerEl) {
      const hRect = headerEl.getBoundingClientRect();
      if (
        cursorX >= hRect.left &&
        cursorX <= hRect.right &&
        cursorY >= hRect.top - 2 &&
        cursorY <= hRect.bottom
      ) {
        targetPane = reg;
        break;
      }
    }

    // Fallback check tab strip cEl bounding box
    if (
      cursorX >= cRect.left - 8 &&
      cursorX <= cRect.right + 8 &&
      cursorY >= cRect.top - 2 &&
      cursorY <= cRect.bottom
    ) {
      targetPane = reg;
      break;
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
  if (N === 0) {
    targetSlot = 0;
  } else if (cRect && cursorX < cRect.left) {
    targetSlot = 0;
  } else if (cRect && cursorX > cRect.right) {
    targetSlot = N;
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

  const scrollLeft = cEl ? cEl.scrollLeft || 0 : 0;
  let indicatorLeft: number | null = null;
  if (cRect) {
    if (N === 0) {
      indicatorLeft = scrollLeft + 4;
    } else if (targetSlot === 0 && currentRects[0] && currentRects[0].width > 0) {
      indicatorLeft = currentRects[0].left - cRect.left + scrollLeft - 1.5;
    } else if (targetSlot >= N && currentRects[N - 1] && currentRects[N - 1].width > 0) {
      indicatorLeft = currentRects[N - 1].right - cRect.left + scrollLeft + 0.5;
    } else if (
      currentRects[targetSlot - 1] &&
      currentRects[targetSlot] &&
      currentRects[targetSlot - 1].width > 0 &&
      currentRects[targetSlot].width > 0
    ) {
      indicatorLeft =
        (currentRects[targetSlot - 1].right + currentRects[targetSlot].left) / 2 -
        cRect.left +
        scrollLeft -
        1.5;
    } else if (currentRects[targetSlot - 1] && currentRects[targetSlot - 1].width > 0) {
      indicatorLeft = currentRects[targetSlot - 1].right - cRect.left + scrollLeft + 0.5;
    } else {
      indicatorLeft = scrollLeft + 4;
    }
  }

  return {
    targetPaneId: targetPane.paneId,
    targetDockZone: null,
    targetSlotIndex: targetSlot,
    indicatorLeft,
  };
}

function finishGlobalDrag(hasStartedDrag: boolean, explicitDrag?: ActiveTabDrag | null) {
  const drag = explicitDrag || currentGlobalDrag;
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

      } else if (drag.sourceType === 'tab' && drag.sourcePaneId && typeof drag.sourceIndex === 'number') {
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
      } else if (drag.sourceType === 'tab' && drag.sourcePaneId && typeof drag.sourceIndex === 'number') {
        if (drag.sourcePaneId === drag.targetPaneId) {
          const sIdx = drag.sourceIndex;
          const tSlot = drag.targetSlotIndex;
          let targetIdx = sIdx < tSlot ? tSlot - 1 : tSlot;
          const currentTabs = (useWorkspaceStore.getState().panes[drag.sourcePaneId]?.tabs || []) as any[];
          const pinnedCount = currentTabs.filter((t) => Boolean(t.is_pinned)).length;
          const isDraggingPinned = Boolean(currentTabs[sIdx]?.is_pinned);

          if (isDraggingPinned) {
            targetIdx = Math.max(0, Math.min(targetIdx, pinnedCount - 1));
          } else if (pinnedCount > 0) {
            targetIdx = Math.max(pinnedCount, Math.min(targetIdx, currentTabs.length - 1));
          }

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

/**
 * Resolves a backing DocumentItem from any arbitrary tab or dock item representation.
 */
export function resolveDocumentItemFromTabOrDock(item: any): DocumentItem | null {
  if (!item) return null;
  const allDocs = useDocumentStore.getState().documents;

  // 1. Direct document item
  if (item.doc_type || item.is_folder !== undefined) {
    return item as DocumentItem;
  }

  // 2. TabItem with document_id or DockItem with documentId
  const docId =
    item.document_id && !item.document_id.startsWith('__')
      ? item.document_id
      : item.documentId && !item.documentId.startsWith('__')
      ? item.documentId
      : typeof item.id === 'string' && item.id.startsWith('doc:')
      ? item.id.slice(4)
      : null;

  if (docId) {
    const found = allDocs.find((d) => d.id === docId);
    if (found) return found;
    return {
      id: docId,
      title: item.title || 'Untitled',
      is_folder: false,
      doc_type: item.view_type || item.viewType || 'document',
    } as unknown as DocumentItem;
  }

  // 3. Document ID matching item id directly
  if (typeof item.id === 'string' && !item.id.startsWith('tab-') && !item.id.startsWith('view:')) {
    const found = allDocs.find((d) => d.id === item.id);
    if (found) return found;
  }

  return null;
}

/**
 * Handles cross-surface drag updates during tab or dock item pointer moves.
 */
function handleTabOrDockPointerMove({
  moveEvent,
  item,
  docItem,
  sourceType,
  sourcePaneId,
  sourceIndex,
  sourceDockZone,
  sourceDockItemId,
  targetEl,
}: {
  moveEvent: PointerEvent;
  item: any;
  docItem: DocumentItem | null;
  sourceType: 'tab' | 'dock';
  sourcePaneId?: string;
  sourceIndex?: number;
  sourceDockZone?: DockZone;
  sourceDockItemId?: string;
  targetEl: HTMLElement;
}) {
  const app = appInstance;
  dragTooltipManager.updatePosition(moveEvent.clientX, moveEvent.clientY);
  const hoveredEl =
    typeof document !== 'undefined' && typeof document.elementFromPoint === 'function'
      ? (document.elementFromPoint(moveEvent.clientX, moveEvent.clientY) as HTMLElement | null)
      : null;
  useDragDropStore.getState().updatePosition(moveEvent.clientX, moveEvent.clientY, hoveredEl);

  const isOverHeaderOrDock = Boolean(
    hoveredEl?.closest(
      'header, [data-noether-header], [data-split-tab-header], [data-dock-zone]'
    )
  );

  // 1. Tab Bar & Sidebar Dock Zone Check (Always prioritize header/dock targets)
  const targets = computeDragTargets(moveEvent.clientX, moveEvent.clientY, item);
  if (targets.targetPaneId || targets.targetDockZone) {
    app.events.emit('editor:drop-ghost', { ghost: null });

    let subtitle: string | null = null;
    if (targets.targetDockZone) {
      if (sourceType === 'dock' && sourceDockZone === targets.targetDockZone) {
        subtitle = 'Reorder dock item';
      } else if (sourceType === 'dock') {
        subtitle = targets.targetDockZone.endsWith('bottom')
          ? 'Move to bottom split'
          : targets.targetDockZone === 'left-top'
          ? 'Move to left sidebar'
          : 'Move to right sidebar';
      } else {
        subtitle = targets.targetDockZone.endsWith('bottom')
          ? 'Dock to bottom split'
          : targets.targetDockZone === 'left-top'
          ? 'Dock to left sidebar'
          : 'Dock to right sidebar';
      }
    } else if (targets.targetPaneId) {
      if (sourceType === 'tab' && sourcePaneId === targets.targetPaneId) {
        subtitle = 'Reorder tab';
      } else if (sourceType === 'tab' && sourcePaneId !== targets.targetPaneId) {
        subtitle = 'Move tab to split pane';
      } else {
        subtitle = 'Open in tab';
      }
    }

    dragTooltipManager.updateSubtitle(subtitle);
    targetEl.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    broadcastDragState({
      sourceType,
      sourcePaneId,
      sourceIndex,
      sourceDockZone,
      sourceDockItemId,
      ...targets,
    });
    return;
  }

  broadcastDragState(null);

  // 2. Spatial Canvas Surface Check (only when not over header/dock)
  const canvasEl = !isOverHeaderOrDock
    ? (hoveredEl?.closest('[data-canvas-view="true"]') as HTMLElement | null)
    : null;
  if (canvasEl && docItem) {
    app.events.emit('editor:drop-ghost', { ghost: null });
    if (docItem.is_folder || docItem.doc_type === 'canvas') {
      dragTooltipManager.updateSubtitle('Cannot add to canvas');
    } else {
      dragTooltipManager.updateSubtitle('Add note to canvas');
    }
    targetEl.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    return;
  }

  // 3. Generic Custom Drop Target DOM Check (only when not over header/dock)
  const customDropTarget = !isOverHeaderOrDock
    ? (hoveredEl?.closest('[data-custom-drop-target="true"]') as HTMLElement | null)
    : null;
  if (customDropTarget && docItem) {
    const dropSubtitle = customDropTarget.getAttribute('data-drop-subtitle');
    app.events.emit('editor:drop-ghost', { ghost: null });
    dragTooltipManager.updateSubtitle(dropSubtitle || null);
    targetEl.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    return;
  }

  // 4. Editor Surface Check (Wikilink & Media Embed Insertion + Live Drop Ghost)
  const editorEl = !isOverHeaderOrDock
    ? (hoveredEl?.closest(
        '.tiptap.prose, [data-editor-canvas="true"], [data-editor-view="true"], .ProseMirror, .cm-editor'
      ) as HTMLElement | null)
    : null;
  if (editorEl && docItem) {
    const isMedia = isMediaFileName(docItem.title);
    if (isMedia) {
      dragTooltipManager.updateSubtitle(`Embed “${docItem.title}”`);
    } else if (docItem.is_folder) {
      dragTooltipManager.updateSubtitle(`Link folder “${docItem.title}”`);
    } else {
      const clean = fileTypeRegistry.cleanTitle(docItem.title) || docItem.title.replace(/\.md$/, '');
      dragTooltipManager.updateSubtitle(`Link “${clean}”`);
    }

    const activeEditor =
      app.editor.getActiveEditor() ||
      (typeof window !== 'undefined' ? (window as any).__noetherEditor : null);
    if (activeEditor && activeEditor.view && !activeEditor.isDestroyed) {
      const docSize = activeEditor.state.doc.content.size;
      let targetPos = Math.max(0, docSize > 1 ? docSize - 1 : docSize);

      const posInfo = activeEditor.view.posAtCoords({
        left: moveEvent.clientX,
        top: moveEvent.clientY,
      });
      if (posInfo && typeof posInfo.pos === 'number') {
        targetPos = posInfo.pos;
      }

      const isImage = isMediaFileName(docItem.title);
      const clean = fileTypeRegistry.cleanTitle(docItem.title) || docItem.title.replace(/\.md$/, '');
      const token = isImage ? `![[${docItem.title}]]` : `[[${clean}]]`;
      const imageSrc = isImage ? getCachedImageSrc(docItem.title, docItem.id) : null;

      app.events.emit('editor:drop-ghost', {
        ghost: {
          pos: targetPos,
          previewTokens: [token],
          items: [{ token, display: isImage ? docItem.title : clean, isImage, imageSrc }],
          totalCount: 1,
        },
      });

      if (isImage && !imageSrc) {
        resolveImageSrcAsync(docItem.title, docItem.id).then((src) => {
          if (src && useDragDropStore.getState().draggedItem) {
            app.events.emit('editor:drop-ghost', {
              ghost: {
                pos: targetPos,
                previewTokens: [token],
                items: [{ token, display: docItem.title, isImage: true, imageSrc: src }],
                totalCount: 1,
              },
            });
          }
        });
      }
    }
    targetEl.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    return;
  }

  // Clear drop ghost if not over editor
  app.events.emit('editor:drop-ghost', { ghost: null });

  // 5. File Tree Node & Root Check
  const targetNode = hoveredEl?.closest('[data-tree-item-id], [data-sidebar-root]');
  if (targetNode && docItem && !docItem.is_folder) {
    const allDocs = useDocumentStore.getState().documents;
    if (targetNode.hasAttribute('data-sidebar-root') && !targetNode.hasAttribute('data-tree-item-id')) {
      const { vaultName } = useWorkspaceStore.getState();
      const currentVault = vaultName || 'Noether vault';
      if (docItem.parent_id) {
        dragTooltipManager.updateSubtitle(`Move into “${currentVault}”`);
        targetEl.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
        return;
      }
    } else {
      const targetId = targetNode.getAttribute('data-tree-item-id');
      const targetIsFolder = targetNode.getAttribute('data-is-folder') === 'true';
      if (targetId && targetIsFolder && targetId !== docItem.id && targetId !== docItem.parent_id) {
        const targetDoc = allDocs.find((d) => d.id === targetId);
        dragTooltipManager.updateSubtitle(`Move into “${targetDoc?.title || 'folder'}”`);
        targetEl.style.cursor = 'grabbing';
        document.body.style.cursor = 'grabbing';
        return;
      }
    }
  }

  dragTooltipManager.updateSubtitle(null);
  const isInvalidDrop = !targets.targetPaneId && !targets.targetDockZone;
  const cursorStyle = isInvalidDrop ? 'no-drop' : 'grabbing';
  targetEl.style.cursor = cursorStyle;
  document.body.style.cursor = cursorStyle;
}

/**
 * Executes cross-surface drop resolution when a tab or dock drag operation completes.
 */
async function handleTabOrDockPointerUp({
  upEvent,
  item,
  docItem,
  sourceType = 'tab',
  sourcePaneId,
  sourceIndex,
  sourceDockZone,
  sourceDockItemId,
  hasStartedDrag,
}: {
  upEvent: PointerEvent;
  item: any;
  docItem: DocumentItem | null;
  sourceType?: 'tab' | 'dock' | 'tree';
  sourcePaneId?: string;
  sourceIndex?: number;
  sourceDockZone?: DockZone;
  sourceDockItemId?: string;
  hasStartedDrag: boolean;
}): Promise<boolean> {
  const app = appInstance;
  app.events.emit('editor:drop-ghost', { ghost: null });

  if (!hasStartedDrag) {
    broadcastDragState(null);
    return false;
  }

  const hoveredEl =
    typeof document !== 'undefined' && typeof document.elementFromPoint === 'function'
      ? (document.elementFromPoint(upEvent.clientX, upEvent.clientY) as HTMLElement | null)
      : null;

  // 1. Tab Bar & Sidebar Dock Zone Reorder / Move Execution (Check targets first)
  const targets = computeDragTargets(upEvent.clientX, upEvent.clientY, item);
  if (
    (targets.targetDockZone && targets.targetSlotIndex !== -1) ||
    (targets.targetPaneId && targets.targetSlotIndex !== -1)
  ) {
    const dragPayload: ActiveTabDrag = {
      sourceType,
      sourcePaneId,
      sourceIndex,
      sourceDockZone,
      sourceDockItemId,
      ...targets,
    };
    finishGlobalDrag(hasStartedDrag, dragPayload);
    useDragDropStore.getState().resetDragState();
    broadcastDragState(null);
    return true;
  }

  const isOverHeaderOrDock = Boolean(
    hoveredEl?.closest(
      'header, [data-noether-header], [data-split-tab-header], [data-dock-zone]'
    )
  );

  // 2. Spatial Canvas Surface & Custom Drop Target Execution (only when not over header/dock)
  const canvasEl = !isOverHeaderOrDock
    ? (hoveredEl?.closest('[data-canvas-view="true"]') as HTMLElement | null)
    : null;
  const customDropTarget = !isOverHeaderOrDock
    ? (hoveredEl?.closest('[data-custom-drop-target="true"]') as HTMLElement | null)
    : null;

  if ((canvasEl || customDropTarget) && docItem) {
    broadcastDragState(null);
    const customDropEvent = new CustomEvent('noether:custom-drop', {
      detail: {
        item: docItem,
        selectedIds: [docItem.id],
        targetEl: hoveredEl,
        clientX: upEvent.clientX,
        clientY: upEvent.clientY,
        handled: false,
      },
      cancelable: true,
    });
    window.dispatchEvent(customDropEvent);
    useDragDropStore.getState().endDrag({ dropTarget: canvasEl || customDropTarget });
    useDragDropStore.getState().resetDragState();
    return true;
  }

  // 3. Editor Surface Drop Execution (Wikilink & Media Embed Insertion)
  const editorEl = !isOverHeaderOrDock
    ? (hoveredEl?.closest(
        '.tiptap.prose, [data-editor-canvas="true"], [data-editor-view="true"], .ProseMirror, .cm-editor'
      ) as HTMLElement | null)
    : null;

  if (editorEl && docItem) {
    broadcastDragState(null);
    useDragDropStore.getState().endDrag({ dropTarget: editorEl });
    useDragDropStore.getState().resetDragState();
    return true;
  }

  // 4. File Tree Folder Drop Execution (Move document)
  const targetNode = hoveredEl?.closest('[data-tree-item-id], [data-sidebar-root]') as HTMLElement | null;
  if (targetNode && docItem && !docItem.is_folder) {
    const allDocs = useDocumentStore.getState().documents;
    let targetParentId: string | null = null;
    let shouldMove = false;

    if (targetNode.hasAttribute('data-sidebar-root') && !targetNode.hasAttribute('data-tree-item-id')) {
      if (docItem.parent_id) {
        targetParentId = null;
        shouldMove = true;
      }
    } else {
      const targetId = targetNode.getAttribute('data-tree-item-id');
      const targetIsFolder = targetNode.getAttribute('data-is-folder') === 'true';
      if (targetId && targetIsFolder && targetId !== docItem.id && targetId !== docItem.parent_id) {
        targetParentId = targetId;
        shouldMove = true;
      }
    }

    if (shouldMove) {
      broadcastDragState(null);
      const res = await useDocumentStore.getState().moveDocuments([docItem.id], targetParentId);
      if (res.success) {
        if (targetParentId) {
          const targetFolder = allDocs.find((d) => d.id === targetParentId);
          window.dispatchEvent(new CustomEvent('noether:expand-folder', { detail: { id: targetParentId } }));
          useWorkspaceStore.getState().showToast(`Moved “${docItem.title}” into “${targetFolder?.title || 'folder'}”`, 'success');
        } else {
          useWorkspaceStore.getState().showToast(`Moved “${docItem.title}” to root`, 'success');
        }
      }
      useDragDropStore.getState().resetDragState();
      return true;
    }
  }

  // Fallback
  finishGlobalDrag(hasStartedDrag);
  useDragDropStore.getState().resetDragState();
  broadcastDragState(null);
  return false;
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
      setHeaderDragInteracting(true);

      const startX = e.clientX;
      const startY = e.clientY;
      let hasStartedDrag = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const currentItem = itemsRef.current[index];
        const docItem = resolveDocumentItemFromTabOrDock(currentItem);

        if (!hasStartedDrag) {
          if (Math.hypot(dx, dy) >= dragDistanceThreshold) {
            hasStartedDrag = true;
            justDraggedRef.current = true;
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            const title = getDisplayTitleRef.current
              ? getDisplayTitleRef.current(currentItem)
              : docItem?.title || (currentItem as any)?.title || 'Tab';
            const iconSvg = getIconSvgRef.current
              ? getIconSvgRef.current(currentItem)
              : docItem?.is_folder
              ? FOLDER_SVG
              : NOTE_ICON_SVG;

            if (docItem) {
              useDragDropStore.getState().startDrag({
                item: docItem,
                items: [docItem],
                selectedIds: [docItem.id],
                source: 'tab',
                clientX: moveEvent.clientX,
                clientY: moveEvent.clientY,
              });
            }

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

        handleTabOrDockPointerMove({
          moveEvent,
          item: currentItem,
          docItem,
          sourceType: 'tab',
          sourcePaneId: paneId,
          sourceIndex: index,
          targetEl,
        });
      };

      const onPointerUp = async (upEvent: PointerEvent) => {
        targetEl.releasePointerCapture?.(upEvent.pointerId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);

        setHeaderDragInteracting(false);
        targetEl.style.cursor = '';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        dragTooltipManager.hide();

        const currentItem = itemsRef.current[index];
        const docItem = resolveDocumentItemFromTabOrDock(currentItem);

        await handleTabOrDockPointerUp({
          upEvent,
          item: currentItem,
          docItem,
          sourceType: 'tab',
          sourcePaneId: paneId,
          sourceIndex: index,
          hasStartedDrag,
        });

        setTimeout(() => {
          justDraggedRef.current = false;
        }, 50);
      };

      const onPointerCancel = (cancelEvent: PointerEvent) => {
        setHeaderDragInteracting(false);
        onPointerUp(cancelEvent);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
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
      setHeaderDragInteracting(true);

      const startX = e.clientX;
      const startY = e.clientY;
      let hasStartedDrag = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const currentItem = itemsRef.current[index];
        const docItem = resolveDocumentItemFromTabOrDock(currentItem);

        if (!hasStartedDrag) {
          if (Math.hypot(dx, dy) >= dragDistanceThreshold) {
            hasStartedDrag = true;
            justDraggedRef.current = true;
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            const title = getDisplayTitleRef.current
              ? getDisplayTitleRef.current(currentItem)
              : docItem?.title || (currentItem as any)?.title || 'Item';

            const isDoc = Boolean(
              docItem ||
              (currentItem as any)?.type === 'document' ||
              (currentItem as any)?.id?.startsWith('doc:')
            );

            const iconSvg = getIconSvgRef.current
              ? getIconSvgRef.current(currentItem)
              : isDoc
              ? NOTE_ICON_SVG
              : FOLDER_SVG;

            if (docItem) {
              useDragDropStore.getState().startDrag({
                item: docItem,
                items: [docItem],
                selectedIds: [docItem.id],
                source: 'dock',
                clientX: moveEvent.clientX,
                clientY: moveEvent.clientY,
              });
            }

            dragTooltipManager.show(title, null, iconSvg, moveEvent.clientX, moveEvent.clientY);
          } else {
            return;
          }
        }

        handleTabOrDockPointerMove({
          moveEvent,
          item: currentItem,
          docItem,
          sourceType: 'dock',
          sourceDockZone: zone,
          sourceDockItemId: itemsRef.current[index]?.id,
          sourceIndex: index,
          targetEl,
        });
      };

      const onPointerUp = async (upEvent: PointerEvent) => {
        targetEl.releasePointerCapture?.(upEvent.pointerId);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);

        setHeaderDragInteracting(false);
        targetEl.style.cursor = '';
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        dragTooltipManager.hide();

        const currentItem = itemsRef.current[index];
        const docItem = resolveDocumentItemFromTabOrDock(currentItem);

        await handleTabOrDockPointerUp({
          upEvent,
          item: currentItem,
          docItem,
          sourceType: 'dock',
          sourceDockZone: zone,
          sourceDockItemId: itemsRef.current[index]?.id,
          sourceIndex: index,
          hasStartedDrag,
        });

        setTimeout(() => {
          justDraggedRef.current = false;
        }, 50);
      };

      const onPointerCancel = (cancelEvent: PointerEvent) => {
        setHeaderDragInteracting(false);
        onPointerUp(cancelEvent);
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
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
