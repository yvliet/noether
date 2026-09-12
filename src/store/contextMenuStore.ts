import { create } from 'zustand';
import React from 'react';
import { bindFlintStores } from '@/core/app/storeBridge';


export type ContextMenuItemType = 'item' | 'separator' | 'header';

export interface ContextMenuItem {
  id?: string;
  type?: ContextMenuItemType;
  title?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  isDanger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  onClick?: () => void | Promise<void> | any;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  submenu?: ContextMenuItem[];
  customSubmenu?: React.ReactNode | ((props: { onClose: () => void }) => React.ReactNode);
  rightSlot?: React.ReactNode;
  customRender?: (props: { onClose: () => void }) => React.ReactNode;
}

export interface ContextMenuOptions {
  scope?: string;
  data?: any;
  onClose?: () => void;
}

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  options?: ContextMenuOptions;

  openContextMenu: (
    eventOrCoords: React.MouseEvent | MouseEvent | { x: number; y: number },
    items: ContextMenuItem[],
    options?: ContextMenuOptions
  ) => void;
  closeContextMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set, get) => ({
  isOpen: false,
  position: { x: 0, y: 0 },
  items: [],
  options: undefined,

  openContextMenu: (eventOrCoords, items, options) => {
    // If a menu is already open with an onClose handler, notify it before opening the new one
    const prevOptions = get().options;
    if (get().isOpen && prevOptions?.onClose) {
      try {
        prevOptions.onClose();
      } catch (err) {
        console.error('Error in context menu onClose handler:', err);
      }
    }

    let x = 0;
    let y = 0;

    if ('clientX' in eventOrCoords && 'clientY' in eventOrCoords) {
      if (typeof (eventOrCoords as any).preventDefault === 'function') {
        (eventOrCoords as any).preventDefault();
        (eventOrCoords as any).stopPropagation();
      }
      x = eventOrCoords.clientX;
      y = eventOrCoords.clientY;
    } else if ('x' in eventOrCoords && 'y' in eventOrCoords) {
      x = eventOrCoords.x;
      y = eventOrCoords.y;
    }

    set({
      isOpen: true,
      position: { x, y },
      items,
      options,
    });
  },

  closeContextMenu: () => {
    const currentOptions = get().options;
    if (currentOptions?.onClose) {
      try {
        currentOptions.onClose();
      } catch (err) {
        console.error('Error in context menu onClose handler:', err);
      }
    }

    set({
      isOpen: false,
      items: [],
      options: undefined,
    });
  },
}));

bindFlintStores({ contextMenu: useContextMenuStore });

