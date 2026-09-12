/**
 * @module storeBridge
 * @description
 * Zero-dependency bridge connecting internal Zustand state stores to the NoetherApp
 * singleton. Kept in an isolated module to prevent circular dependency TDZ errors
 * during ES module evaluation.
 *
 * @since 0.2.0
 */

export interface StoreGetter<T = any> {
  getState: () => T;
}

export interface NoetherStoreRefs {
  workspace: StoreGetter | null;
  sidebarDock: StoreGetter | null;
  document: StoreGetter | null;
  contextMenu: StoreGetter | null;
  settings: StoreGetter | null;
  fileHistory: StoreGetter | null;
  appInstance: any | null;
}

const internalStores: NoetherStoreRefs = {
  workspace: null,
  sidebarDock: null,
  document: null,
  contextMenu: null,
  settings: null,
  fileHistory: null,
  appInstance: null,
};

const STORE_KEYS: Array<keyof NoetherStoreRefs> = [
  'workspace',
  'sidebarDock',
  'document',
  'contextMenu',
  'settings',
  'fileHistory',
  'appInstance',
];

const createProtectedStoreRefs = (): NoetherStoreRefs => {
  const target = {} as NoetherStoreRefs;

  for (const key of STORE_KEYS) {
    Object.defineProperty(target, key, {
      get() {
        return internalStores[key];
      },
      set(val) {
        if (internalStores[key] !== null && val !== null && val !== internalStores[key]) {
          console.warn(`[storeBridge] Blocked external overwrite of host store "${String(key)}". Host stores are immutable once bound.`);
          return;
        }
        internalStores[key] = val;
      },
      enumerable: true,
      configurable: false,
    });
  }

  return target;
};

// Global-safe singleton object that survives circular imports without TDZ
export var storeRefs: NoetherStoreRefs = createProtectedStoreRefs();

if (typeof globalThis !== 'undefined') {
  try {
    Object.defineProperty(globalThis, '__noetherStoreRefs', {
      get: () => storeRefs,
      set: (_val) => {
        // Silently preserve host store container against global reassignments
      },
      configurable: false,
      enumerable: false,
    });
  } catch {
    // If already defined or non-configurable in some test runner environments
    (globalThis as any).__noetherStoreRefs = storeRefs;
  }
}

/**
 * Connects internal Zustand state stores to the NoetherApp bridge.
 * Host stores become immutable once bound to prevent third-party extension hijacking.
 *
 * @param stores - Map of store getters.
 * @since 0.1.0
 */
export function bindNoetherStores(stores: {
  workspace?: StoreGetter;
  sidebarDock?: StoreGetter;
  document?: StoreGetter;
  contextMenu?: StoreGetter;
  settings?: StoreGetter;
  fileHistory?: StoreGetter;
}): void {
  if (stores.workspace) storeRefs.workspace = stores.workspace;
  if (stores.sidebarDock) storeRefs.sidebarDock = stores.sidebarDock;
  if (stores.document) storeRefs.document = stores.document;
  if (stores.contextMenu) storeRefs.contextMenu = stores.contextMenu;
  if (stores.settings) storeRefs.settings = stores.settings;
  if (stores.fileHistory) storeRefs.fileHistory = stores.fileHistory;
}

export function setAppInstanceBridge(app: any): void {
  storeRefs.appInstance = app;
}

export function getAppInstanceBridge(): any | null {
  return storeRefs.appInstance;
}

export function emitBridgeAppEvent(event: string, payload?: any): void {
  try {
    storeRefs.appInstance?.events?.emit(event, payload);
  } catch (err) {
    console.warn('[storeBridge] Failed to emit app event:', event, err);
  }
}
