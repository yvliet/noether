/**
 * @module dragDropStore
 * @description
 * Centralized state store managing drag-and-drop interactions across Noether.
 * Coordinates dragged files, tabs, multi-selections, and cursor coordinates,
 * broadcasting reactive state and events to host registries and extensions.
 *
 * Technical Rationale:
 * Encapsulating drag lifecycle state into a single host store bound to storeBridge
 * allows both native UI components (file tree, tabs) and standalone workspace extensions
 * (such as Spatial Canvas or Kanban) to inspect and react to ongoing drags without
 * tight couplings or bespoke window event cascades.
 *
 * @since 0.1.0
 */

import { create } from 'zustand';
import { DocumentItem } from '@/types';
import type { ActiveDragData } from '@/core/app/apiTypes';
import { bindNoetherStores, emitBridgeAppEvent } from '@/core/app/storeBridge';

export interface StartDragOptions {
  item: DocumentItem;
  items?: DocumentItem[];
  selectedIds?: string[];
  source?: 'file-tree' | 'tab' | 'dock' | 'custom' | string;
  clientX: number;
  clientY: number;
}

export interface EndDragOptions {
  cancelled?: boolean;
  dropTarget?: HTMLElement | null;
}

interface DragDropState {
  activeDrag: ActiveDragData | null;
  draggedItem: DocumentItem | null; // Backwards-compatible alias for existing consumers
  dragOverFolderId: string | null; // null represents none or root
  isTargetValid: boolean;

  startDrag: (options: StartDragOptions) => void;
  updatePosition: (clientX: number, clientY: number, targetEl?: HTMLElement | null) => void;
  setDraggedItem: (item: DocumentItem | null) => void;
  setDragOverFolder: (folderId: string | null, isValid?: boolean) => void;
  endDrag: (options?: EndDragOptions) => void;
  resetDragState: () => void;
}

export const useDragDropStore = create<DragDropState>((set, get) => ({
  activeDrag: null,
  draggedItem: null,
  dragOverFolderId: null,
  isTargetValid: true,

  startDrag: ({ item, items, selectedIds, source = 'file-tree', clientX, clientY }) => {
    const allItems = items && items.length > 0 ? items : [item];
    const allIds = selectedIds && selectedIds.length > 0 ? selectedIds : [item.id];
    const activeDrag: ActiveDragData = {
      isDragging: true,
      item,
      items: allItems,
      selectedIds: allIds,
      source,
      clientX,
      clientY,
      targetEl: null,
    };
    set({ activeDrag, draggedItem: item });
    emitBridgeAppEvent('drag:start', activeDrag);
  },

  updatePosition: (clientX, clientY, targetEl) => {
    const current = get().activeDrag;
    if (!current) return;
    const updated: ActiveDragData = {
      ...current,
      clientX,
      clientY,
      targetEl: targetEl ?? current.targetEl,
    };
    set({ activeDrag: updated });
    emitBridgeAppEvent('drag:move', updated);
  },

  setDraggedItem: (item) => {
    if (get().draggedItem?.id !== item?.id) {
      set({ draggedItem: item });
    }
  },

  setDragOverFolder: (folderId, isValid = true) => {
    const state = get();
    if (state.dragOverFolderId !== folderId || state.isTargetValid !== isValid) {
      set({ dragOverFolderId: folderId, isTargetValid: isValid });
    }
  },

  endDrag: (options) => {
    const current = get().activeDrag;
    if (current) {
      if (!options?.cancelled) {
        emitBridgeAppEvent('drag:drop', {
          ...current,
          dropTarget: options?.dropTarget ?? current.targetEl ?? null,
        });
      }
      emitBridgeAppEvent('drag:end', {
        source: current.source,
        cancelled: options?.cancelled ?? false,
      });
    }
    set({
      activeDrag: null,
      draggedItem: null,
      dragOverFolderId: null,
      isTargetValid: true,
    });
  },

  resetDragState: () => {
    const current = get().activeDrag;
    if (current) {
      get().endDrag({ cancelled: true });
    } else {
      set({
        activeDrag: null,
        draggedItem: null,
        dragOverFolderId: null,
        isTargetValid: true,
      });
    }
  },
}));

// Bind to host store bridge for extension SDK access
bindNoetherStores({ dragDrop: useDragDropStore });
