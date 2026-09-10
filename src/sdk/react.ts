/**
 * @module @flint/react
 * @description
 * Official reactive React hooks for Flint extensions.
 *
 * Technical Rationale:
 * Provides zero-boilerplate reactive subscriptions for extension UI components.
 * Subscribes to host Zustand stores via selector hooks with fallback to React 18's
 * useSyncExternalStore, ensuring instant reactivity without memory leaks or race conditions.
 *
 * @since 0.4.6
 */

import { useSyncExternalStore } from 'react';
import { storeRefs } from '../core/app/storeBridge';
import { appInstance, FlintApp } from '../core/app/FlintApp';
import type {
  DocumentItem,
  TabItem,
  HeadingItem,
  BacklinkItem,
  OutgoingLinkItem,
  UnlinkedMentionItem,
  TagItem,
  GlobalTaskItem,
} from '../types';

/**
 * Accesses the central FlintApp host application instance.
 * @since 0.4.6
 */
export function useFlintApp(): FlintApp {
  return appInstance;
}

/**
 * Subscribes to a slice of an internal host store with full reactivity.
 */
function useStoreSlice<TStore, TSelected>(
  storeKey: 'document' | 'workspace' | 'settings' | 'sidebarDock',
  selector: (state: TStore) => TSelected,
  fallback: TSelected
): TSelected {
  const store = storeRefs[storeKey] as any;
  if (!store) return fallback;

  // When store is a callable Zustand hook (native desktop runtime)
  if (typeof store === 'function') {
    return store(selector);
  }

  // Fallback for non-hook environments using useSyncExternalStore
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof store.subscribe === 'function') {
        return store.subscribe(onStoreChange);
      }
      return () => {};
    },
    () => {
      const state = store.getState?.();
      return state ? selector(state) : fallback;
    },
    () => fallback
  );
}

/**
 * Subscribes to the currently active document loaded in the main editor.
 * Returns null if no document is active (e.g. empty tab, graph view, canvas).
 * @since 0.4.6
 */
export function useActiveDocument(): DocumentItem | null {
  return useStoreSlice('document', (s: any) => s?.activeDocument ?? null, null);
}

/**
 * Subscribes to all documents and folders currently loaded in the active Hearth.
 * @since 0.4.6
 */
export function useHearthDocuments(): DocumentItem[] {
  return useStoreSlice('document', (s: any) => s?.documents ?? [], []);
}

/**
 * Subscribes to the active tab in the currently focused workspace pane.
 * @since 0.4.6
 */
export function useActiveTab(): TabItem | null {
  return useStoreSlice(
    'workspace',
    (s: any) => {
      if (!s) return null;
      const focusedPane = s.panes?.[s.focusedPaneId] || s.panes?.['main'];
      if (!focusedPane) return null;
      return focusedPane.tabs?.find((t: TabItem) => t.id === focusedPane.activeTabId) ?? null;
    },
    null
  );
}

/**
 * Subscribes to all tabs currently open in the focused workspace pane.
 * @since 0.4.6
 */
export function useWorkspaceTabs(): readonly TabItem[] {
  return useStoreSlice(
    'workspace',
    (s: any) => {
      if (!s) return [];
      const focusedPane = s.panes?.[s.focusedPaneId] || s.panes?.['main'];
      return focusedPane?.tabs ?? s.tabs ?? [];
    },
    []
  );
}

/**
 * Subscribes to the current main view mode (e.g. 'document', 'graph', 'canvas').
 * @since 0.4.6
 */
export function useMainViewMode(): string {
  return useStoreSlice('workspace', (s: any) => s?.mainViewMode ?? 'document', 'document');
}

/**
 * Subscribes to the headings outline for the active document or specified docId.
 * @since 0.4.6
 */
export function useDocumentHeadings(docId?: string): HeadingItem[] {
  return useStoreSlice(
    'document',
    (s: any) => {
      if (!s) return [];
      if (!docId || s.activeDocument?.id === docId) {
        return s.headings ?? [];
      }
      return [];
    },
    []
  );
}

/**
 * Subscribes to incoming backlinks for the active document or specified docId.
 * @since 0.4.6
 */
export function useDocumentBacklinks(docId?: string): BacklinkItem[] {
  return useStoreSlice(
    'document',
    (s: any) => {
      if (!s) return [];
      if (!docId || s.activeDocument?.id === docId) {
        return s.backlinks ?? [];
      }
      return [];
    },
    []
  );
}

/**
 * Subscribes to outgoing wikilinks from the active document or specified docId.
 * @since 0.4.6
 */
export function useDocumentOutgoingLinks(docId?: string): OutgoingLinkItem[] {
  return useStoreSlice(
    'document',
    (s: any) => {
      if (!s) return [];
      if (!docId || s.activeDocument?.id === docId) {
        return s.outgoingLinks ?? [];
      }
      return [];
    },
    []
  );
}

/**
 * Subscribes to unlinked mentions for the active document or specified docId.
 * @since 0.4.6
 */
export function useDocumentUnlinkedMentions(docId?: string): UnlinkedMentionItem[] {
  return useStoreSlice(
    'document',
    (s: any) => {
      if (!s) return [];
      if (!docId || s.activeDocument?.id === docId) {
        return s.unlinkedMentions ?? [];
      }
      return [];
    },
    []
  );
}

/**
 * Subscribes to the list of unique tags indexed across the entire Hearth.
 * @since 0.4.6
 */
export function useVaultTags(): TagItem[] {
  return useStoreSlice('document', (s: any) => s?.vaultTags ?? [], []);
}

/**
 * Subscribes to all interactive tasks found across all documents in the Hearth.
 * @since 0.4.6
 */
export function useGlobalTasks(): GlobalTaskItem[] {
  return useStoreSlice('document', (s: any) => s?.globalTasks ?? [], []);
}
