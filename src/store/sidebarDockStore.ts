import { create } from 'zustand';
import { TabItem } from '@/types';

export type DockZone = 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom';

export interface DockItem {
  id: string;
  type: 'document' | 'extension';
  documentId?: string;
  title: string;
  viewType?: string;
  viewMode?: string;
  iconType?: string;
  zone: DockZone;
  enabled: boolean;
  order: number;
  extensionId?: string;
  metadata?: Record<string, unknown>;
}

export interface SidebarDockState {
  items: DockItem[];
  activeItemByZone: Record<DockZone, string | null>;
  splitRatioLeft: number;
  splitRatioRight: number;

  // Actions
  loadSession: (
    vaultPath?: string,
    sessionData?: Partial<{
      items: DockItem[];
      activeItemByZone: Record<DockZone, string | null>;
      splitRatioLeft: number;
      splitRatioRight: number;
    }>
  ) => void;
  dockTab: (tab: TabItem, zone: DockZone, insertIndex?: number) => void;
  undockItem: (itemId: string) => void;
  toggleItemEnabled: (itemId: string, enabled?: boolean) => void;
  moveItemToZone: (itemId: string, targetZone: DockZone, insertIndex?: number) => void;
  setActiveItemInZone: (zone: DockZone, itemId: string | null) => void;
  reorderItemsInZone: (zone: DockZone, fromIndex: number, toIndex: number) => void;
  reorderItemInZone: (zone: DockZone, itemId: string, targetSlotIndex: number) => void;
  setSplitRatio: (side: 'left' | 'right', ratio: number) => void;
  syncExtensionTabs: (tabs: Array<{ id: string; title: string; side: 'left' | 'right'; order?: number }>) => void;
}

const GLOBAL_STORAGE_KEY = 'flint_sidebar_dock_state_v1';

export function getDockStorageKey(vaultPath?: string): string {
  const vp = (vaultPath || '').trim();
  if (!vp || vp === 'default') return GLOBAL_STORAGE_KEY;
  return `${GLOBAL_STORAGE_KEY}:${vp}`;
}

export function cleanDockItems(items: any[]): DockItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter((it: any) => {
    if (!it || !it.id) return false;
    // Transient or blank new tabs
    if (it.title === 'New tab' && (!it.documentId || it.documentId === '')) {
      return false;
    }
    if (it.id.startsWith('tab-') && (!it.viewType || it.viewType === 'document') && (!it.documentId || it.documentId.startsWith('__'))) {
      return false;
    }
    // Documents must only remain if enabled and have valid documentId
    const isDoc =
      (it.type === 'document' || it.id.startsWith('doc:')) &&
      it.documentId &&
      !it.documentId.startsWith('__');
    if (isDoc) {
      return it.enabled !== false;
    }
    return true;
  });
}

function loadPersistedState(vaultPath?: string): {
  items: DockItem[];
  activeItemByZone: Record<DockZone, string | null>;
  splitRatioLeft: number;
  splitRatioRight: number;
} {
  try {
    const key = getDockStorageKey(vaultPath);
    let raw = localStorage.getItem(key);
    if (!raw && key !== GLOBAL_STORAGE_KEY) {
      raw = localStorage.getItem(GLOBAL_STORAGE_KEY);
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      const cleanedItems = cleanDockItems(parsed.items);

      return {
        items: cleanedItems,
        activeItemByZone: {
          'left-top': parsed.activeItemByZone?.['left-top'] ?? null,
          'left-bottom': parsed.activeItemByZone?.['left-bottom'] ?? null,
          'right-top': parsed.activeItemByZone?.['right-top'] ?? null,
          'right-bottom': parsed.activeItemByZone?.['right-bottom'] ?? null,
        },
        splitRatioLeft: typeof parsed.splitRatioLeft === 'number' ? parsed.splitRatioLeft : 0.5,
        splitRatioRight: typeof parsed.splitRatioRight === 'number' ? parsed.splitRatioRight : 0.5,
      };
    }
  } catch (err) {
    console.error('[SidebarDockStore] Failed to load persisted state:', err);
  }

  return {
    items: [],
    activeItemByZone: {
      'left-top': null,
      'left-bottom': null,
      'right-top': null,
      'right-bottom': null,
    },
    splitRatioLeft: 0.5,
    splitRatioRight: 0.5,
  };
}

function saveState(
  state: {
    items: DockItem[];
    activeItemByZone: Record<DockZone, string | null>;
    splitRatioLeft: number;
    splitRatioRight: number;
  },
  vaultPath?: string
) {
  try {
    const payload = JSON.stringify({
      items: state.items,
      activeItemByZone: state.activeItemByZone,
      splitRatioLeft: state.splitRatioLeft,
      splitRatioRight: state.splitRatioRight,
    });
    const key = getDockStorageKey(vaultPath);
    localStorage.setItem(key, payload);
    if (key !== GLOBAL_STORAGE_KEY) {
      localStorage.setItem(GLOBAL_STORAGE_KEY, payload);
    }
  } catch (err) {
    console.error('[SidebarDockStore] Failed to save state:', err);
  }
}

const initialPersisted = loadPersistedState();

export const useSidebarDockStore = create<SidebarDockState>((set, get) => ({
  items: initialPersisted.items,
  activeItemByZone: initialPersisted.activeItemByZone,
  splitRatioLeft: initialPersisted.splitRatioLeft,
  splitRatioRight: initialPersisted.splitRatioRight,

  loadSession: (vaultPath, sessionData) => {
    let nextState: {
      items: DockItem[];
      activeItemByZone: Record<DockZone, string | null>;
      splitRatioLeft: number;
      splitRatioRight: number;
    };

    if (sessionData && sessionData.items && Array.isArray(sessionData.items)) {
      const cleaned = cleanDockItems(sessionData.items);
      nextState = {
        items: cleaned,
        activeItemByZone: {
          'left-top': sessionData.activeItemByZone?.['left-top'] ?? null,
          'left-bottom': sessionData.activeItemByZone?.['left-bottom'] ?? null,
          'right-top': sessionData.activeItemByZone?.['right-top'] ?? null,
          'right-bottom': sessionData.activeItemByZone?.['right-bottom'] ?? null,
        },
        splitRatioLeft: typeof sessionData.splitRatioLeft === 'number' ? sessionData.splitRatioLeft : 0.5,
        splitRatioRight: typeof sessionData.splitRatioRight === 'number' ? sessionData.splitRatioRight : 0.5,
      };
    } else {
      nextState = loadPersistedState(vaultPath);
    }

    set(nextState);
    saveState(nextState, vaultPath);
  },

  dockTab: (tab, zone, insertIndex) => {
    const { items, activeItemByZone } = get();

    // Determine strictly if the tab is a real markdown document in the vault
    const isDoc = !!(
      tab.document_id &&
      !tab.document_id.startsWith('__') &&
      (!tab.view_type || tab.view_type === 'document') &&
      (!tab.view_mode || tab.view_mode === 'document')
    );

    const resolvedViewType = !isDoc
      ? tab.view_type ||
        tab.view_mode ||
        (tab.document_id?.startsWith('__') ? tab.document_id.replace(/^__/, '').replace(/__$/, '') : undefined)
      : 'document';

    const newItemId = isDoc
      ? `doc:${tab.document_id}`
      : (resolvedViewType || tab.id);

    const existingIndex = items.findIndex((it) =>
      isDoc
        ? it.documentId === tab.document_id || it.id === newItemId
        : it.id === newItemId || (resolvedViewType && it.viewType === resolvedViewType) || it.id === tab.id
    );

    let updatedItems = [...items];

    if (existingIndex !== -1) {
      // Item already exists, move to target zone
      const [existing] = updatedItems.splice(existingIndex, 1);
      existing.zone = zone;
      existing.enabled = true;
      if (tab.title && (!existing.title || existing.title === 'Tab')) {
        existing.title = tab.title;
      }
      if (resolvedViewType && !existing.viewType) {
        existing.viewType = resolvedViewType;
      }
      
      const zoneItems = updatedItems.filter((it) => it.zone === zone).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
      const targetIdx = typeof insertIndex === 'number' ? Math.max(0, Math.min(zoneItems.length, insertIndex)) : zoneItems.length;
      zoneItems.splice(targetIdx, 0, existing);
      
      // Reassign sequential orders
      const orderMap = new Map<string, number>();
      zoneItems.forEach((it, idx) => orderMap.set(it.id, idx));
      updatedItems = updatedItems.map((it) => (orderMap.has(it.id) ? { ...it, order: orderMap.get(it.id)! } : it));
      if (!orderMap.has(existing.id)) {
        existing.order = targetIdx;
        updatedItems.push(existing);
      }
    } else {
      const zoneItems = items.filter((it) => it.zone === zone).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
      const targetIdx = typeof insertIndex === 'number' ? Math.max(0, Math.min(zoneItems.length, insertIndex)) : zoneItems.length;
      const newItem: DockItem = {
        id: newItemId,
        type: isDoc ? 'document' : 'extension',
        documentId: isDoc ? tab.document_id : (tab.document_id?.startsWith('__') ? undefined : tab.document_id),
        title: tab.title || (isDoc ? 'Untitled' : (resolvedViewType ? resolvedViewType.charAt(0).toUpperCase() + resolvedViewType.slice(1) : 'Tab')),
        viewType: resolvedViewType || (isDoc ? 'document' : undefined),
        viewMode: tab.view_mode,
        iconType: typeof tab.icon === 'string' ? tab.icon : undefined,
        zone,
        enabled: true,
        order: targetIdx,
        extensionId: (tab.metadata?.extensionId as string) || (resolvedViewType && resolvedViewType !== 'document' ? resolvedViewType : undefined),
        metadata: tab.metadata,
      };
      zoneItems.splice(targetIdx, 0, newItem);
      
      const orderMap = new Map<string, number>();
      zoneItems.forEach((it, idx) => orderMap.set(it.id, idx));
      updatedItems = updatedItems.map((it) => (orderMap.has(it.id) ? { ...it, order: orderMap.get(it.id)! } : it));
      if (!updatedItems.some((it) => it.id === newItem.id)) {
        updatedItems.push(newItem);
      }
    }

    const nextActiveByZone = {
      ...activeItemByZone,
      [zone]: newItemId,
    };

    set({ items: updatedItems, activeItemByZone: nextActiveByZone });
    saveState({ ...get(), items: updatedItems, activeItemByZone: nextActiveByZone });
  },

  undockItem: (itemId) => {
    const { items, activeItemByZone } = get();
    const target = items.find((it) => it.id === itemId);
    if (!target) return;

    let updatedItems: DockItem[];
    const isDocItem =
      (target.type === 'document' || target.id.startsWith('doc:')) &&
      target.documentId &&
      !target.documentId.startsWith('__');

    if (isDocItem) {
      // User documents are removed completely
      updatedItems = items.filter((it) => it.id !== itemId);
    } else {
      // Extensions and views are disabled rather than completely deleted
      updatedItems = items.map((it) => (it.id === itemId ? { ...it, enabled: false } : it));
    }

    const nextActiveByZone = { ...activeItemByZone };
    if (activeItemByZone[target.zone] === itemId) {
      const remainingZoneItems = updatedItems.filter((it) => it.zone === target.zone && it.enabled);
      nextActiveByZone[target.zone] = remainingZoneItems.length > 0 ? remainingZoneItems[0].id : null;
    }

    set({ items: updatedItems, activeItemByZone: nextActiveByZone });
    saveState({ ...get(), items: updatedItems, activeItemByZone: nextActiveByZone });
  },

  toggleItemEnabled: (itemId, enabled) => {
    const { items, activeItemByZone } = get();
    const target = items.find((it) => it.id === itemId);
    if (!target) return;

    const isDocItem =
      (target.type === 'document' || target.id.startsWith('doc:')) &&
      target.documentId &&
      !target.documentId.startsWith('__');

    if (isDocItem && (enabled === false || (enabled === undefined && target.enabled))) {
      get().undockItem(itemId);
      return;
    }

    const nextEnabled = enabled !== undefined ? enabled : !target.enabled;
    const updatedItems = items.map((it) => (it.id === itemId ? { ...it, enabled: nextEnabled } : it));

    const nextActiveByZone = { ...activeItemByZone };
    if (!nextEnabled && activeItemByZone[target.zone] === itemId) {
      const remaining = updatedItems.filter((it) => it.zone === target.zone && it.enabled);
      nextActiveByZone[target.zone] = remaining.length > 0 ? remaining[0].id : null;
    } else if (nextEnabled && !activeItemByZone[target.zone]) {
      nextActiveByZone[target.zone] = itemId;
    }

    set({ items: updatedItems, activeItemByZone: nextActiveByZone });
    saveState({ ...get(), items: updatedItems, activeItemByZone: nextActiveByZone });
  },


  moveItemToZone: (itemId, targetZone, insertIndex) => {
    const { items, activeItemByZone } = get();
    const target = items.find((it) => it.id === itemId);
    if (!target) return;

    const oldZone = target.zone;
    if (oldZone === targetZone) {
      if (typeof insertIndex === 'number') {
        const zoneItems = items.filter((it) => it.zone === targetZone).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
        const curIdx = zoneItems.findIndex((it) => it.id === itemId);
        if (curIdx !== -1 && curIdx !== insertIndex) {
          get().reorderItemsInZone(targetZone, curIdx, insertIndex);
        }
      }
      return;
    }

    let updatedItems = [...items];
    const targetZoneItems = updatedItems
      .filter((it) => it.zone === targetZone && it.id !== itemId)
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    
    const targetIdx = typeof insertIndex === 'number' ? Math.max(0, Math.min(targetZoneItems.length, insertIndex)) : targetZoneItems.length;
    
    const movedItem: DockItem = {
      ...target,
      zone: targetZone,
      enabled: true,
      order: targetIdx,
    };
    targetZoneItems.splice(targetIdx, 0, movedItem);

    const orderMap = new Map<string, number>();
    targetZoneItems.forEach((it, idx) => orderMap.set(it.id, idx));

    updatedItems = updatedItems.map((it) => {
      if (it.id === itemId) return movedItem;
      if (orderMap.has(it.id)) return { ...it, order: orderMap.get(it.id)! };
      return it;
    });

    const nextActiveByZone = {
      ...activeItemByZone,
      [targetZone]: itemId,
    };

    if (activeItemByZone[oldZone] === itemId) {
      const remainingOld = updatedItems.filter((it) => it.zone === oldZone && it.enabled && it.id !== itemId);
      nextActiveByZone[oldZone] = remainingOld.length > 0 ? remainingOld[0].id : null;
    }

    set({ items: updatedItems, activeItemByZone: nextActiveByZone });
    saveState({ ...get(), items: updatedItems, activeItemByZone: nextActiveByZone });
  },

  setActiveItemInZone: (zone, itemId) => {
    const { activeItemByZone } = get();
    const nextActive = {
      ...activeItemByZone,
      [zone]: itemId,
    };
    set({ activeItemByZone: nextActive });
    saveState({ ...get(), activeItemByZone: nextActive });
  },

  reorderItemInZone: (zone, itemId, targetSlotIndex) => {
    const { items } = get();
    const visibleZoneItems = items
      .filter((it) => it.zone === zone && it.enabled)
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));

    const fromIdx = visibleZoneItems.findIndex((it) => it.id === itemId);
    if (fromIdx === -1) return;

    const [moved] = visibleZoneItems.splice(fromIdx, 1);
    const insertIdx = fromIdx < targetSlotIndex ? targetSlotIndex - 1 : targetSlotIndex;
    const clampedInsertIdx = Math.max(0, Math.min(visibleZoneItems.length, insertIdx));
    visibleZoneItems.splice(clampedInsertIdx, 0, moved);

    // Reassign clean sequential 0, 1, 2... orders
    const orderMap = new Map<string, number>();
    visibleZoneItems.forEach((it, idx) => orderMap.set(it.id, idx));

    const updatedItems = items.map((it) => {
      if (it.zone === zone && orderMap.has(it.id)) {
        return { ...it, order: orderMap.get(it.id)! };
      }
      return it;
    });

    set({ items: updatedItems });
    saveState({ ...get(), items: updatedItems });
  },

  reorderItemsInZone: (zone, fromIndex, toIndex) => {
    const { items } = get();
    const visibleZoneItems = items
      .filter((it) => it.zone === zone && it.enabled)
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
    
    if (fromIndex < 0 || fromIndex >= visibleZoneItems.length) return;
    const item = visibleZoneItems[fromIndex];
    if (!item) return;

    get().reorderItemInZone(zone, item.id, toIndex > fromIndex ? toIndex + 1 : toIndex);
  },



  setSplitRatio: (side, ratio) => {
    const clamped = Math.max(0.15, Math.min(0.85, ratio));
    if (side === 'left') {
      set({ splitRatioLeft: clamped });
      saveState({ ...get(), splitRatioLeft: clamped });
    } else {
      set({ splitRatioRight: clamped });
      saveState({ ...get(), splitRatioRight: clamped });
    }
  },

  syncExtensionTabs: (tabs) => {
    const { items, activeItemByZone } = get();
    let changed = false;
    const updatedItems = [...items];
    const nextActiveByZone = { ...activeItemByZone };

    tabs.forEach((tab) => {
      const existing = updatedItems.find((it) => it.id === tab.id || it.extensionId === tab.id);
      const defaultZone: DockZone = tab.side === 'left' ? 'left-top' : 'right-top';

      if (!existing) {
        changed = true;
        updatedItems.push({
          id: tab.id,
          type: 'extension',
          title: tab.title,
          viewType: tab.id,
          zone: defaultZone,
          enabled: true,
          order: tab.order ?? 50,
          extensionId: tab.id,
        });

        if (!nextActiveByZone[defaultZone]) {
          nextActiveByZone[defaultZone] = tab.id;
        }
      } else if (!existing.title && tab.title) {
        existing.title = tab.title;
        changed = true;
      }
    });


    if (changed) {
      set({ items: updatedItems, activeItemByZone: nextActiveByZone });
      saveState({ ...get(), items: updatedItems, activeItemByZone: nextActiveByZone });
    }
  },
}));
