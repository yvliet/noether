import { create } from 'zustand';
import { LeftNavView, SidebarTab, TabItem, MainViewMode, RecentVaultItem, DocumentItem } from '@/types';
import { useDocumentStore } from './documentStore';
import { useSettingsStore } from './settingsStore';
import { useSidebarDockStore, DockItem, DockZone } from './sidebarDockStore';
import { dbAdapter } from '@/lib/db/adapter';
import { platform } from '@/lib/platform/platformAdapter';
import { bindFlintStores, emitBridgeAppEvent } from '@/core/app/storeBridge';
import type { OpenTabOptions } from '@/core/extensions/types';


import {
  LayoutNode,
  PaneModel,
  PaneId,
  createInitialLayoutTree,
  splitNode,
  removePaneNode,
  getAllPaneIds,
} from '@/lib/layout/layoutTree';

export type { LayoutNode, PaneModel, PaneId };

export interface PersistedTabsState {
  tabs: Array<{
    id: string;
    document_id: string;
    title: string;
    view_mode?: string;
    view_type?: string;
    icon?: string;
    metadata?: Record<string, unknown>;
  }>;
  activeTabId: string | null;
  mainViewMode: MainViewMode;
  isSplitView: boolean;
  splitDirection?: 'horizontal' | 'vertical';
  activePane: 'main' | 'split';
  splitTabs: Array<{
    id: string;
    document_id: string;
    title: string;
    view_mode?: string;
    view_type?: string;
    icon?: string;
    metadata?: Record<string, unknown>;
  }>;
  splitActiveTabId: string | null;
  splitActiveDocumentId: string | null;
  layoutTree?: LayoutNode;
  panes?: Record<string, PaneModel>;
  focusedPaneId?: string;
  isLeftSidebarOpen?: boolean;
  isRightSidebarOpen?: boolean;
  activeLeftView?: LeftNavView;
  activeRightTab?: SidebarTab;
  leftSidebarWidth?: number;
  rightSidebarWidth?: number;
  // Dock state integration
  dockItems?: DockItem[];
  dockActiveItemByZone?: Record<DockZone, string | null>;
  dockSplitRatioLeft?: number;
  dockSplitRatioRight?: number;
}

export interface NavigationHistoryItem {
  id: string;
  viewType: string;
  documentId?: string | null;
  title?: string;
  timestamp: number;
}

function getFolderOpenStateKey(vaultPath?: string): string {
  const vPath = (vaultPath || useWorkspaceStore?.getState?.()?.hearthPath || useWorkspaceStore?.getState?.()?.vaultPath || '').trim();
  return `flint_folder_open_state_v1:${vPath || 'default'}`;
}

export function loadPersistedFolderOpenState(vaultPath?: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getFolderOpenStateKey(vaultPath));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function savePersistedFolderOpenState(state: Record<string, boolean>, vaultPath?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getFolderOpenStateKey(vaultPath), JSON.stringify(state));
  } catch {}
}

export function saveTabsSession(vaultPath?: string) {
  if (typeof window === 'undefined') return;
  const { restoreTabs } = useSettingsStore.getState();
  const vPath = (vaultPath || useWorkspaceStore.getState().hearthPath || useWorkspaceStore.getState().vaultPath || '').trim();
  if (!vPath || vPath === 'default') return;
  const key = `flint_workspace_tabs_v1:${vPath}`;

  if (!restoreTabs) {
    localStorage.removeItem(key);
    return;
  }

  const state = useWorkspaceStore.getState();
  const dockState = useSidebarDockStore.getState();
  if (!state.tabs || state.tabs.length === 0) return;

  const data: PersistedTabsState = {
    tabs: state.tabs.map((t) => ({
      id: t.id,
      document_id: t.document_id,
      title: t.title,
      view_mode: t.view_mode,
      view_type: t.view_type,
      icon: typeof t.icon === 'string' ? t.icon : undefined,
      metadata: t.metadata,
    })),
    activeTabId: state.activeTabId,
    mainViewMode: state.mainViewMode,
    isSplitView: state.isSplitView,
    splitDirection: state.splitDirection || 'horizontal',
    activePane: state.activePane,
    splitTabs: (state.splitTabs || []).map((t) => ({
      id: t.id,
      document_id: t.document_id,
      title: t.title,
      view_mode: t.view_mode,
      view_type: t.view_type,
      icon: typeof t.icon === 'string' ? t.icon : undefined,
      metadata: t.metadata,
    })),
    splitActiveTabId: state.splitActiveTabId,
    splitActiveDocumentId: state.splitActiveDocumentId,
    layoutTree: state.layoutTree,
    panes: state.panes,
    focusedPaneId: state.focusedPaneId,
    isLeftSidebarOpen: state.isLeftSidebarOpen,
    isRightSidebarOpen: state.isRightSidebarOpen,
    activeLeftView: state.activeLeftView,
    activeRightTab: state.activeRightTab,
    leftSidebarWidth: state.leftSidebarWidth,
    rightSidebarWidth: state.rightSidebarWidth,
    // Dock state integration
    dockItems: dockState.items,
    dockActiveItemByZone: dockState.activeItemByZone,
    dockSplitRatioLeft: dockState.splitRatioLeft,
    dockSplitRatioRight: dockState.splitRatioRight,
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('[workspaceStore] Failed to save tabs session:', e);
  }
}

export function loadSavedTabsSession(vaultPath?: string): PersistedTabsState | null {
  if (typeof window === 'undefined') return null;
  const { restoreTabs } = useSettingsStore.getState();
  if (!restoreTabs) return null;

  const vPath = (vaultPath || useWorkspaceStore.getState().hearthPath || useWorkspaceStore.getState().vaultPath || '').trim();
  if (!vPath || vPath === 'default') return null;
  const key = `flint_workspace_tabs_v1:${vPath}`;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
      return parsed as PersistedTabsState;
    }
  } catch (e) {
    console.error('[workspaceStore] Failed to load tabs session:', e);
  }
  return null;
}

export interface ConfirmDialogConfig {
  isOpen: boolean;
  title: string;
  message: string;
  subtext?: string;
  confirmText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onDontAskAgain?: () => void;
}

export interface InputDialogConfig {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  onConfirm: (val: string) => void;
}

export interface ToastConfig {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
}

export interface FolderPickerConfig {
  isOpen: boolean;
  title?: string;
  message?: string;
  allowRoot?: boolean;
  onSelect: (folderPath: string, folderItem?: DocumentItem | null) => void;
  onCancel?: () => void;
}

export interface OpenCustomTabOptions {
  id?: string;
  viewType: string;
  title: string;
  icon?: any;
  documentId?: string;
}

interface WorkspaceState {
  // Navigation & Main Views
  mainViewMode: MainViewMode;
  setMainViewMode: (mode: MainViewMode) => void;
  activeLeftView: LeftNavView;
  setActiveLeftView: (view: LeftNavView) => void;
  isLeftSidebarOpen: boolean;
  setIsLeftSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleLeftSidebar: () => void;
  leftSidebarWidth: number;
  setLeftSidebarWidth: (width: number) => void;

  // Right Sidebar
  activeRightTab: SidebarTab;
  setActiveRightTab: (tab: SidebarTab) => void;
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleRightSidebar: () => void;
  rightSidebarWidth: number;
  setRightSidebarWidth: (width: number) => void;

  // Tabs & Navigation
  tabs: TabItem[];
  activeTabId: string | null;
  openTab: (documentId: string, title?: string, options?: OpenTabOptions) => void;
  openGraphTab: () => void;
  openCanvasTab: () => void;
  openTasksTab: () => void;
  openExtensionDocTab: (extensionId: string, title?: string) => void;
  openPluginDocTab: (pluginId: string, title?: string) => void;
  openCustomTab: (options: OpenCustomTabOptions) => void;
  openEmptyTab: () => void;
  closeTab: (tabId: string) => void;
  closeTabsForDocuments: (docIds: string[]) => void;
  cleanUpDeadTabs: () => void;
  setActiveTabId: (tabId: string) => void;
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void;
  updateTabTitle: (documentId: string, title: string) => void;
  restoreTabsSession: (docs: DocumentItem[]) => boolean;

  // History Navigation
  history: NavigationHistoryItem[];
  historyIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  isNavigatingHistory: boolean;
  recordNavigation: (item: { viewType?: string; documentId?: string | null; title?: string }) => void;
  applyNavigationEntry: (entry: NavigationHistoryItem) => Promise<void>;
  navigateBack: () => Promise<NavigationHistoryItem | null>;
  navigateForward: () => Promise<NavigationHistoryItem | null>;

  // Split View & Display
  isSplitView: boolean;
  splitDirection: 'horizontal' | 'vertical';
  setSplitDirection: (dir: 'horizontal' | 'vertical') => void;
  activePane: 'main' | 'split';
  setActivePane: (pane: 'main' | 'split') => void;
  toggleSplitView: (direction?: 'horizontal' | 'vertical') => void;
  splitTabs: TabItem[];
  splitActiveTabId: string | null;
  splitActiveDocumentId: string | null;
  openSplitTab: (documentId: string, title?: string, direction?: 'horizontal' | 'vertical') => void;
  openCustomSplitTab: (options: OpenCustomTabOptions & { direction?: 'horizontal' | 'vertical' }) => void;
  openEmptySplitTab: (direction?: 'horizontal' | 'vertical') => void;
  closeSplitTab: (tabId: string) => void;
  reorderSplitTabs: (sourceIndex: number, destinationIndex: number) => void;
  setSplitActiveTabId: (tabId: string) => void;
  closeSplitView: () => void;
  setSplitActiveDocumentId: (id: string | null) => void;

  // Tiling Layout Tree (Nested Splits)
  layoutTree: LayoutNode;
  panes: Record<PaneId, PaneModel>;
  focusedPaneId: PaneId;
  setFocusedPane: (paneId: PaneId) => void;
  splitPane: (
    targetPaneId: PaneId,
    direction: 'horizontal' | 'vertical',
    initialDocId?: string,
    initialTitle?: string,
    initialOptions?: {
      viewMode?: string;
      viewType?: string;
      icon?: any;
      metadata?: Record<string, unknown>;
    }
  ) => void;
  closeTabInPane: (paneId: PaneId, tabId: string) => void;
  closePane: (paneId: PaneId) => void;
  openTabInPane: (paneId: PaneId, docId: string, title?: string, options?: OpenTabOptions) => void;
  openEmptyTabInPane: (paneId: PaneId) => void;
  openCustomTabInPane: (paneId: PaneId, options: OpenCustomTabOptions) => void;
  reorderTabsInPane: (paneId: PaneId, sourceIndex: number, destinationIndex: number) => void;
  moveTabBetweenPanes: (sourcePaneId: PaneId, sourceIndex: number, targetPaneId: PaneId, targetIndex: number) => void;
  setActiveTabInPane: (paneId: PaneId, tabId: string) => void;

  // Modals & Panels
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  settingsInitialTab: string | null;
  setIsSettingsOpen: (open: boolean, initialTab?: string) => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (open: boolean) => void;
  isHearthModalOpen: boolean;
  setIsHearthModalOpen: (open: boolean) => void;
  isVaultModalOpen: boolean;
  setIsVaultModalOpen: (open: boolean) => void;

  // Custom Obsidian Dialogs & Toasts
  skipDeleteConfirmation: boolean;
  setSkipDeleteConfirmation: (skip: boolean) => void;
  skipRenameConfirmation: boolean;
  setSkipRenameConfirmation: (skip: boolean) => void;
  confirmDialog: ConfirmDialogConfig | null;
  openConfirmDialog: (config: Omit<ConfirmDialogConfig, 'isOpen'>) => void;
  closeConfirmDialog: () => void;

  inputDialog: InputDialogConfig | null;
  openInputDialog: (config: Omit<InputDialogConfig, 'isOpen'>) => void;
  closeInputDialog: () => void;

  toast: ToastConfig | null;
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
  hideToast: () => void;

  folderPickerPrompt: FolderPickerConfig | null;
  promptFolderSelection: (config: Omit<FolderPickerConfig, 'isOpen'>) => void;
  cancelFolderSelection: () => void;

  // Collapse all
  collapseAllCount: number;
  triggerCollapseAll: () => void;

  // Folder open/collapsed states in file tree
  folderOpenState: Record<string, boolean>;
  setFolderOpen: (folderId: string, isOpen: boolean) => void;
  toggleFolderOpen: (folderId: string) => void;
  collapseAllFolders: () => void;
  expandAllFolders: () => void;
  toggleCollapseExpandAll: () => void;

  // Hearth Management
  hearthName: string;
  hearthPath: string;
  recentHearths: RecentVaultItem[];
  setHearthName: (name: string) => void;
  setHearthPath: (path: string) => void;
  initHearthInfo: () => Promise<void>;
  selectHearthFolder: () => Promise<void>;
  selectParentFolder: () => Promise<string | null>;
  createNewHearth: (name: string, parentPath: string) => Promise<void>;
  renameHearth: (targetPath: string, newName: string) => Promise<{ success: boolean; path?: string; name?: string; error?: string }>;
  removeRecentHearth: (path: string) => Promise<void>;
  switchHearth: (path: string) => Promise<void>;
  openHearthInExplorer: () => Promise<void>;

  // Vault Management (Backwards compatibility)
  vaultName: string;
  vaultPath: string;
  recentVaults: RecentVaultItem[];
  setVaultName: (name: string) => void;
  setVaultPath: (path: string) => void;
  initVaultInfo: () => Promise<void>;
  selectVaultFolder: () => Promise<void>;
  createNewVault: (name: string, parentPath: string) => Promise<void>;
  renameVault: (targetPath: string, newName: string) => Promise<{ success: boolean; path?: string; name?: string; error?: string }>;
  removeRecentVault: (path: string) => Promise<void>;
  switchVault: (path: string) => Promise<void>;
  openVaultInExplorer: () => Promise<void>;

  // Status bar metrics
  wordCount: number;
  charCount: number;
  backlinkCount: number;
  isDatabaseActive: boolean;
  setIsDatabaseActive: (isActive: boolean) => void;
  setStatusMetrics: (metrics: { wordCount?: number; charCount?: number; backlinkCount?: number }) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  mainViewMode: 'document',
  setMainViewMode: (mode) => {
    if (mode !== 'document') {
      get().openCustomTab({
        viewType: mode,
        title: mode.charAt(0).toUpperCase() + mode.slice(1),
        documentId: `__${mode}__`,
      });
      return;
    }
    if (mode === 'document') {
      const { tabs, activeTabId } = get();
      const currentTab = tabs.find((t) => t.id === activeTabId);
      const activeDoc = useDocumentStore.getState().activeDocument;

      // If the currently active tab is already a document tab (including an empty tab), keep it
      if (
        currentTab &&
        (currentTab.view_type === 'document' || !currentTab.view_type) &&
        currentTab.document_id &&
        !currentTab.document_id.startsWith('__')
      ) {
        set({ mainViewMode: 'document' });
        return;
      }

      // If activeTabId is a custom view (or null), activate the tab for the currently active document
      if (activeDoc) {
        const existingDocTab = tabs.find((t) => t.document_id === activeDoc.id);
        if (existingDocTab) {
          set({ mainViewMode: 'document', activeTabId: existingDocTab.id });
          return;
        } else {
          get().openTab(activeDoc.id, activeDoc.title);
          return;
        }
      }

      // If no active document, check if current tab is an empty tab
      if (currentTab && (!currentTab.document_id || currentTab.document_id === '')) {
        set({ mainViewMode: 'document' });
        return;
      }

      // If no active document, find any existing document tab
      const lastDocTab = [...tabs].reverse().find(
        (t) =>
          (!t.view_type || t.view_type === 'document') &&
          t.document_id &&
          !t.document_id.startsWith('__')
      );
      if (lastDocTab) {
        set({ mainViewMode: 'document', activeTabId: lastDocTab.id });
        useDocumentStore.getState().setActiveDocumentById(lastDocTab.document_id);
        return;
      }

      set({ mainViewMode: 'document' });
      return;
    }
  },

  activeLeftView: 'files',
  setActiveLeftView: (view) => {
    set({ activeLeftView: view, isLeftSidebarOpen: true });
    try {
      useSidebarDockStore.getState().setActiveItemInZone('left-top', view);
    } catch {}
    saveTabsSession(get().vaultPath);
  },
  isLeftSidebarOpen: true,
  setIsLeftSidebarOpen: (open) => {
    set((state) => ({
      isLeftSidebarOpen: typeof open === 'function' ? open(state.isLeftSidebarOpen) : open,
    }));
    saveTabsSession(get().vaultPath);
  },
  toggleLeftSidebar: () => {
    set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen }));
    saveTabsSession(get().vaultPath);
  },
  leftSidebarWidth: 260,
  setLeftSidebarWidth: (width) => {
    const clamped = Math.max(200, Math.min(width, 450));
    set({ leftSidebarWidth: clamped });
    saveTabsSession(get().vaultPath);
  },

  activeRightTab: 'outline',
  setActiveRightTab: (tab) => {
    set({ activeRightTab: tab, isRightSidebarOpen: true });
    try {
      useSidebarDockStore.getState().setActiveItemInZone('right-top', tab);
    } catch {}
    saveTabsSession(get().vaultPath);
  },
  isRightSidebarOpen: true,
  setIsRightSidebarOpen: (open) => {
    set((state) => ({
      isRightSidebarOpen: typeof open === 'function' ? open(state.isRightSidebarOpen) : open,
    }));
    saveTabsSession(get().vaultPath);
  },
  toggleRightSidebar: () => {
    set((state) => ({ isRightSidebarOpen: !state.isRightSidebarOpen }));
    saveTabsSession(get().vaultPath);
  },
  rightSidebarWidth: 260,
  setRightSidebarWidth: (width) => {
    const clamped = Math.max(200, Math.min(width, 400));
    set({ rightSidebarWidth: clamped });
    saveTabsSession(get().vaultPath);
  },

  tabs: [],
  activeTabId: null,

  openTab: (documentId, title, options?: OpenTabOptions) => {
    const targetPaneId = get().focusedPaneId || 'main';
    get().openTabInPane(targetPaneId, documentId, title, options);
    get().recordNavigation({ viewType: options?.viewType || 'document', documentId, title: title || 'Untitled' });
  },

  openExtensionDocTab: (extensionId: string, title?: string) => {
    const tabId = `extension-doc:${extensionId}`;
    get().openCustomTab({
      id: tabId,
      viewType: 'extension-doc',
      title: title || extensionId,
      documentId: `__extension_doc:${extensionId}__`,
    });
  },

  openPluginDocTab: (pluginId: string, title?: string) => {
    get().openExtensionDocTab(pluginId, title);
  },

  openCustomTab: (options: OpenCustomTabOptions) => {
    const targetPaneId = get().focusedPaneId || 'main';
    get().openCustomTabInPane(targetPaneId, options);
    get().recordNavigation({
      viewType: options.viewType,
      documentId: options.documentId || `__${options.viewType}__`,
      title: options.title,
    });
  },

  openGraphTab: () => {
    get().openCustomTab({
      viewType: 'graph',
      title: 'Graph view',
      documentId: '__graph__',
    });
  },

  openCanvasTab: () => {
    get().openCustomTab({
      viewType: 'canvas',
      title: 'Canvas',
      documentId: '__canvas__',
    });
  },

  openTasksTab: () => {
    get().openCustomTab({
      viewType: 'tasks',
      title: 'Tasks',
      documentId: '__tasks__',
    });
  },

  openEmptyTab: () => {
    const targetPaneId = get().focusedPaneId || 'main';
    get().openEmptyTabInPane(targetPaneId);
  },

  closeTab: (tabId) => {
    const { panes, focusedPaneId } = get();
    for (const [paneId, model] of Object.entries(panes)) {
      if (model.tabs.some((t) => t.id === tabId)) {
        get().closeTabInPane(paneId, tabId);
        return;
      }
    }
    get().closeTabInPane(focusedPaneId || 'main', tabId);
  },

  closeTabsForDocuments: (docIds) => {
    if (!docIds || docIds.length === 0) return;
    const { closeTabsOnDelete } = useSettingsStore.getState();
    if (!closeTabsOnDelete) return;

    const idSet = new Set(docIds);
    const { layoutTree, panes, focusedPaneId } = get();
    const allPaneIds = getAllPaneIds(layoutTree);

    let newLayoutTree = layoutTree;
    const newPanes: Record<PaneId, PaneModel> = {};
    const panesToClose: PaneId[] = [];

    for (const paneId of allPaneIds) {
      const pModel = panes[paneId];
      if (!pModel) continue;

      const remainingTabs = pModel.tabs.filter((t) => !t.document_id || !idSet.has(t.document_id));

      if (remainingTabs.length === 0) {
        if (allPaneIds.length <= 1 || panesToClose.length === allPaneIds.length - 1) {
          const fallbackTab: TabItem = {
            id: `tab-empty-${Date.now()}`,
            document_id: '',
            title: 'New tab',
            view_mode: 'document',
            view_type: 'document',
          };
          newPanes[paneId] = {
            id: paneId,
            tabs: [fallbackTab],
            activeTabId: fallbackTab.id,
            activeDocumentId: null,
          };
        } else {
          panesToClose.push(paneId);
        }
      } else {
        let nextActiveTabId = pModel.activeTabId;
        const isActiveClosed = pModel.tabs.some((t) => t.id === pModel.activeTabId && t.document_id && idSet.has(t.document_id));
        if (isActiveClosed || !remainingTabs.some((t) => t.id === nextActiveTabId)) {
          const closedIndex = pModel.tabs.findIndex((t) => t.id === pModel.activeTabId);
          const nextIndex = Math.max(0, Math.min(closedIndex >= 0 ? closedIndex : 0, remainingTabs.length - 1));
          nextActiveTabId = remainingTabs[nextIndex].id;
        }
        const nextTab = remainingTabs.find((t) => t.id === nextActiveTabId);
        newPanes[paneId] = {
          ...pModel,
          tabs: remainingTabs,
          activeTabId: nextActiveTabId,
          activeDocumentId: nextTab?.document_id || null,
        };
      }
    }

    // Prune closed panes from layout tree
    for (const pId of panesToClose) {
      const pruned = removePaneNode(newLayoutTree, pId);
      if (pruned) {
        newLayoutTree = pruned;
      }
    }

    const finalPaneIds = getAllPaneIds(newLayoutTree);
    if (finalPaneIds.length === 0 || Object.keys(newPanes).length === 0) {
      const fallbackTab: TabItem = {
        id: `tab-empty-${Date.now()}`,
        document_id: '',
        title: 'New tab',
        view_mode: 'document',
        view_type: 'document',
      };
      newLayoutTree = createInitialLayoutTree('main');
      newPanes['main'] = {
        id: 'main',
        tabs: [fallbackTab],
        activeTabId: fallbackTab.id,
        activeDocumentId: null,
      };
    }

    // Normalize single pane root ID if needed
    if (newLayoutTree.type === 'pane' && newLayoutTree.id !== 'main') {
      const oldId = newLayoutTree.id;
      const oldModel = newPanes[oldId];
      delete newPanes[oldId];
      newLayoutTree.id = 'main';
      if (oldModel) {
        newPanes['main'] = {
          ...oldModel,
          id: 'main',
        };
      }
    }

    let nextFocusedId = focusedPaneId;
    const remainingIds = getAllPaneIds(newLayoutTree);
    if (!newPanes[nextFocusedId]) {
      nextFocusedId = remainingIds[0] || 'main';
    }

    const isNowSplit = newLayoutTree.type === 'split';
    const mainModel = newPanes['main'] || newPanes[remainingIds[0]];
    const splitModel = isNowSplit ? newPanes[remainingIds[1]] : undefined;

    set({
      layoutTree: newLayoutTree,
      panes: newPanes,
      focusedPaneId: nextFocusedId,
      isSplitView: isNowSplit,
      activePane: nextFocusedId === 'main' ? 'main' : 'split',
      tabs: mainModel?.tabs || [],
      activeTabId: mainModel?.activeTabId || null,
      splitTabs: isNowSplit ? splitModel?.tabs || [] : [],
      splitActiveTabId: isNowSplit ? splitModel?.activeTabId || null : null,
      splitActiveDocumentId: isNowSplit ? splitModel?.activeDocumentId || null : null,
    });

    // Update active document in DocumentStore for focused pane
    const focusedModel = newPanes[nextFocusedId];
    const focusedActiveTab = focusedModel?.tabs.find((t) => t.id === focusedModel.activeTabId);
    if (focusedActiveTab && focusedActiveTab.document_id && !focusedActiveTab.document_id.startsWith('__')) {
      useDocumentStore.getState().setActiveDocumentById(focusedActiveTab.document_id, { preserveViewMode: true });
    } else {
      useDocumentStore.setState({ activeDocument: null });
    }

    saveTabsSession(get().vaultPath);
  },

  cleanUpDeadTabs: () => {
    const { panes } = get();
    const docs = useDocumentStore.getState().documents;
    const docIdSet = new Set(docs.map((d) => d.id));

    const deadDocIds = new Set<string>();
    for (const pane of Object.values(panes || {})) {
      for (const tab of pane.tabs || []) {
        if (tab.document_id && !tab.document_id.startsWith('__')) {
          if (!docIdSet.has(tab.document_id)) {
            deadDocIds.add(tab.document_id);
          }
        }
      }
    }

    if (deadDocIds.size > 0) {
      get().closeTabsForDocuments(Array.from(deadDocIds));
    }
  },

  setActiveTabId: (tabId) => {
    const { panes, focusedPaneId } = get();
    for (const [paneId, model] of Object.entries(panes)) {
      if (model.tabs.some((t) => t.id === tabId)) {
        get().setActiveTabInPane(paneId, tabId);
        return;
      }
    }
    get().setActiveTabInPane(focusedPaneId || 'main', tabId);
  },

  reorderTabs: (sourceIndex: number, destinationIndex: number) => {
    const targetPaneId = get().focusedPaneId || 'main';
    get().reorderTabsInPane(targetPaneId, sourceIndex, destinationIndex);
  },

  updateTabTitle: (documentId, title) => {
    set((state) => {
      const newPanes: Record<PaneId, PaneModel> = {};
      for (const [pId, pModel] of Object.entries(state.panes || {})) {
        newPanes[pId] = {
          ...pModel,
          tabs: pModel.tabs.map((t) => (t.document_id === documentId ? { ...t, title } : t)),
        };
      }
      return {
        tabs: state.tabs.map((t) => (t.document_id === documentId ? { ...t, title } : t)),
        splitTabs: state.splitTabs.map((t) => (t.document_id === documentId ? { ...t, title } : t)),
        panes: newPanes,
      };
    });
  },

  restoreTabsSession: (docs: DocumentItem[]) => {
    const activePath = get().hearthPath || get().vaultPath;
    if (!activePath) return false;
    const saved = loadSavedTabsSession(activePath);
    if (!saved || !saved.tabs || saved.tabs.length === 0) return false;

    const docMap = new Map(docs.map((d) => [d.id, d]));

    const validateTab = (tab: any): TabItem | null => {
      if (!tab || !tab.id) return null;
      const isRealDoc = tab.document_id && !tab.document_id.startsWith('__');
      if (isRealDoc) {
        const doc = docMap.get(tab.document_id);
        if (doc) {
          return {
            id: tab.id,
            document_id: tab.document_id,
            title: doc.title || tab.title || 'Untitled',
            view_mode: (tab.view_mode as any) || (doc.doc_type === 'canvas' ? 'canvas' : 'document'),
            view_type: tab.view_type || (doc.doc_type === 'canvas' ? 'canvas' : 'document'),
            icon: tab.icon,
            metadata: tab.metadata,
          };
        }
        const { closeTabsOnDelete } = useSettingsStore.getState();
        if (!closeTabsOnDelete) {
          return {
            id: tab.id,
            document_id: tab.document_id,
            title: tab.title || 'Untitled',
            view_mode: (tab.view_mode as any) || 'document',
            view_type: tab.view_type || 'document',
            icon: tab.icon,
            metadata: tab.metadata,
          };
        }
        return null;
      }
      return {
        id: tab.id,
        document_id: tab.document_id || '',
        title: tab.title || 'Untitled',
        view_mode: tab.view_mode as any,
        view_type: tab.view_type,
        icon: tab.icon,
        metadata: tab.metadata,
      };
    };

    const validTabs = (saved.tabs || []).map(validateTab).filter((t): t is TabItem => t !== null);
    if (validTabs.length === 0) return false;

    let nextActiveTabId = saved.activeTabId;
    if (!nextActiveTabId || !validTabs.some((t) => t.id === nextActiveTabId)) {
      nextActiveTabId = validTabs[validTabs.length - 1].id;
    }

    let validSplitTabs: TabItem[] = [];
    if (saved.isSplitView && saved.splitTabs && saved.splitTabs.length > 0) {
      validSplitTabs = saved.splitTabs.map(validateTab).filter((t): t is TabItem => t !== null);
    }

    const isSplit = validSplitTabs.length > 0 && !!saved.isSplitView;
    let nextSplitActiveTabId = saved.splitActiveTabId;
    if (isSplit && (!nextSplitActiveTabId || !validSplitTabs.some((t) => t.id === nextSplitActiveTabId))) {
      nextSplitActiveTabId = validSplitTabs[0].id;
    }

    const activeTab = validTabs.find((t) => t.id === nextActiveTabId);
    let resolvedMainViewMode: MainViewMode = saved.mainViewMode || 'document';
    if (activeTab) {
      if (activeTab.view_type && activeTab.view_type !== 'document') {
        resolvedMainViewMode = activeTab.view_type as any;
      } else if (activeTab.view_mode && activeTab.view_mode !== 'document') {
        resolvedMainViewMode = activeTab.view_mode as any;
      } else if (activeTab.document_id === '__graph__') {
        resolvedMainViewMode = 'graph';
      } else if (activeTab.document_id === '__canvas__') {
        resolvedMainViewMode = 'canvas';
      } else if (activeTab.document_id === '__tasks__') {
        resolvedMainViewMode = 'tasks';
      } else {
        const doc = activeTab.document_id ? docMap.get(activeTab.document_id) : null;
        if (doc?.doc_type === 'canvas') {
          resolvedMainViewMode = 'canvas';
        } else {
          resolvedMainViewMode = 'document';
        }
      }
    }

    let initialPanes: Record<PaneId, PaneModel> = {};
    if (saved.panes && Object.keys(saved.panes).length > 0) {
      for (const [pId, pModel] of Object.entries(saved.panes)) {
        const cleanedTabs = (pModel.tabs || []).map(validateTab).filter((t): t is TabItem => t !== null);
        if (cleanedTabs.length > 0) {
          let activeId = pModel.activeTabId;
          if (!activeId || !cleanedTabs.some((t) => t.id === activeId)) {
            activeId = cleanedTabs[cleanedTabs.length - 1].id;
          }
          const activeTabItem = cleanedTabs.find((t) => t.id === activeId);
          initialPanes[pId] = {
            id: pId,
            tabs: cleanedTabs,
            activeTabId: activeId,
            activeDocumentId: activeTabItem?.document_id || null,
          };
        }
      }
    }
    if (!initialPanes['main']) {
      initialPanes['main'] = {
        id: 'main',
        tabs: validTabs,
        activeTabId: nextActiveTabId,
        activeDocumentId: activeTab?.document_id || null,
      };
    }
    if (isSplit && !initialPanes['split'] && validSplitTabs.length > 0) {
      initialPanes['split'] = {
        id: 'split',
        tabs: validSplitTabs,
        activeTabId: nextSplitActiveTabId,
        activeDocumentId: validSplitTabs.find((t) => t.id === nextSplitActiveTabId)?.document_id || null,
      };
    }

    const initialTree: LayoutNode =
      saved.layoutTree ||
      (isSplit
        ? {
            type: 'split',
            id: 'root-split',
            direction: saved.splitDirection || 'horizontal',
            children: [
              { type: 'pane', id: 'main', flex: 1 },
              { type: 'pane', id: 'split', flex: 1 },
            ],
          }
        : createInitialLayoutTree('main'));

    // Restore sidebar dock session
    try {
      useSidebarDockStore.getState().loadSession(activePath, {
        items: saved.dockItems,
        activeItemByZone: saved.dockActiveItemByZone,
        splitRatioLeft: saved.dockSplitRatioLeft,
        splitRatioRight: saved.dockSplitRatioRight,
      });

      // Synchronize activeLeftView with left-top dock zone
      const effectiveLeftView = saved.activeLeftView || saved.dockActiveItemByZone?.['left-top'] || 'files';
      useSidebarDockStore.getState().setActiveItemInZone('left-top', effectiveLeftView);

      // Synchronize activeRightTab with right-top dock zone
      const effectiveRightTab = saved.activeRightTab || saved.dockActiveItemByZone?.['right-top'] || 'outline';
      useSidebarDockStore.getState().setActiveItemInZone('right-top', effectiveRightTab);

      // Restore left-bottom and right-bottom active items
      if (saved.dockActiveItemByZone?.['left-bottom']) {
        useSidebarDockStore.getState().setActiveItemInZone('left-bottom', saved.dockActiveItemByZone['left-bottom']);
      }
      if (saved.dockActiveItemByZone?.['right-bottom']) {
        useSidebarDockStore.getState().setActiveItemInZone('right-bottom', saved.dockActiveItemByZone['right-bottom']);
      }
    } catch (dockErr) {
      console.error('[workspaceStore] Error restoring dock session:', dockErr);
    }

    set({
      tabs: validTabs,
      activeTabId: nextActiveTabId,
      mainViewMode: resolvedMainViewMode,
      isSplitView: isSplit,
      splitDirection: saved.splitDirection || 'horizontal',
      splitTabs: isSplit ? validSplitTabs : [],
      splitActiveTabId: isSplit ? nextSplitActiveTabId : null,
      splitActiveDocumentId: isSplit ? (validSplitTabs.find((t) => t.id === nextSplitActiveTabId)?.document_id || null) : null,
      activePane: saved.activePane || 'main',
      layoutTree: initialTree,
      panes: initialPanes,
      focusedPaneId: saved.focusedPaneId || (saved.activePane === 'split' ? 'split' : 'main'),
      ...(saved.isLeftSidebarOpen !== undefined ? { isLeftSidebarOpen: saved.isLeftSidebarOpen } : {}),
      ...(saved.isRightSidebarOpen !== undefined ? { isRightSidebarOpen: saved.isRightSidebarOpen } : {}),
      activeLeftView: saved.activeLeftView || saved.dockActiveItemByZone?.['left-top'] || 'files',
      activeRightTab: saved.activeRightTab || saved.dockActiveItemByZone?.['right-top'] || 'outline',
      ...(typeof saved.leftSidebarWidth === 'number' ? { leftSidebarWidth: saved.leftSidebarWidth } : {}),
      ...(typeof saved.rightSidebarWidth === 'number' ? { rightSidebarWidth: saved.rightSidebarWidth } : {}),
    });

    return true;
  },

  history: [],
  historyIndex: -1,
  canGoBack: false,
  canGoForward: false,
  isNavigatingHistory: false,

  recordNavigation: (item) => {
    const { history, historyIndex, isNavigatingHistory } = get();
    if (isNavigatingHistory) return;

    const targetDocId = item.documentId || null;
    const targetViewType = item.viewType || 'document';

    const currentEntry = history[historyIndex];
    if (
      currentEntry &&
      currentEntry.viewType === targetViewType &&
      (currentEntry.documentId || null) === targetDocId
    ) {
      return;
    }

    const newEntry: NavigationHistoryItem = {
      id: `nav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      viewType: targetViewType,
      documentId: targetDocId,
      title: item.title || (targetDocId ? 'Document' : targetViewType),
      timestamp: Date.now(),
    };

    const newHistory = [...history.slice(0, historyIndex + 1), newEntry];
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canGoBack: newHistory.length > 1,
      canGoForward: false,
    });
  },

  applyNavigationEntry: async (entry) => {
    set({ isNavigatingHistory: true });
    try {
      const { tabs } = get();
      if (entry.viewType === 'graph' || entry.documentId === '__graph__') {
        const graphTab = tabs.find((t) => t.view_type === 'graph' || t.view_mode === 'graph' || t.document_id === '__graph__');
        if (graphTab) {
          set({ mainViewMode: 'graph', activeTabId: graphTab.id });
        } else {
          get().openGraphTab();
        }
      } else if (entry.viewType === 'canvas' || entry.documentId === '__canvas__') {
        if (entry.documentId && !entry.documentId.startsWith('__')) {
          const canvasTab = tabs.find((t) => t.document_id === entry.documentId);
          if (canvasTab) {
            set({ mainViewMode: 'canvas', activeTabId: canvasTab.id });
          }
          await useDocumentStore.getState().setActiveDocumentById(entry.documentId, { preserveViewMode: true });
          set({ mainViewMode: 'canvas' });
        } else {
          const canvasTab = tabs.find((t) => t.view_type === 'canvas' || t.view_mode === 'canvas' || t.document_id === '__canvas__');
          if (canvasTab) {
            set({ mainViewMode: 'canvas', activeTabId: canvasTab.id });
          } else {
            get().openCanvasTab();
          }
        }
      } else if (entry.viewType === 'tasks' || entry.documentId === '__tasks__') {
        const tasksTab = tabs.find((t) => t.view_type === 'tasks' || t.view_mode === 'tasks' || t.document_id === '__tasks__');
        if (tasksTab) {
          set({ mainViewMode: 'tasks', activeTabId: tasksTab.id });
        } else {
          get().openTasksTab();
        }
      } else if ((entry.viewType === 'extension-doc' || entry.viewType === 'plugin-doc') && entry.documentId) {
        const extensionId = entry.documentId.replace(/^__(extension_doc|plugin_doc):/, '').replace(/__$/, '');
        get().openExtensionDocTab(extensionId, entry.title);
      } else if (entry.viewType && entry.viewType !== 'document') {
        get().openCustomTab({
          viewType: entry.viewType,
          documentId: entry.documentId || undefined,
          title: entry.title || entry.viewType,
        });
      } else if (entry.documentId && !entry.documentId.startsWith('__')) {
        const docTab = tabs.find((t) => t.document_id === entry.documentId);
        if (docTab) {
          set({ mainViewMode: 'document', activeTabId: docTab.id });
        } else {
          get().openTab(entry.documentId, entry.title || 'Untitled');
        }
        await useDocumentStore.getState().setActiveDocumentById(entry.documentId, { preserveViewMode: true });
        set({ mainViewMode: 'document' });
      } else {
        set({ mainViewMode: 'document' });
        useDocumentStore.setState({ activeDocument: null });
      }
    } catch (e) {
      console.error('[workspaceStore] Error applying navigation history entry:', e);
    } finally {
      set({ isNavigatingHistory: false });
    }
  },

  navigateBack: async () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const targetEntry = history[nextIndex];
      set({
        historyIndex: nextIndex,
        canGoBack: nextIndex > 0,
        canGoForward: true,
      });
      await get().applyNavigationEntry(targetEntry);
      return targetEntry;
    }
    return null;
  },

  navigateForward: async () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetEntry = history[nextIndex];
      set({
        historyIndex: nextIndex,
        canGoBack: true,
        canGoForward: nextIndex < history.length - 1,
      });
      await get().applyNavigationEntry(targetEntry);
      return targetEntry;
    }
    return null;
  },

  isSplitView: false,
  splitDirection: 'horizontal',
  setSplitDirection: (dir) => {
    const { layoutTree } = get();
    if (layoutTree.type === 'split') {
      set({
        splitDirection: dir,
        layoutTree: { ...layoutTree, direction: dir },
      });
    } else {
      set({ splitDirection: dir });
    }
  },
  activePane: 'main',
  setActivePane: (pane) => {
    const targetPaneId = pane === 'split' ? (get().focusedPaneId === 'main' ? (getAllPaneIds(get().layoutTree).find((id) => id !== 'main') || 'main') : get().focusedPaneId) : 'main';
    get().setFocusedPane(targetPaneId);
  },
  toggleSplitView: (direction) => {
    const { layoutTree, focusedPaneId } = get();
    if (layoutTree.type === 'split') {
      get().closeSplitView();
    } else {
      get().splitPane(focusedPaneId || 'main', direction || 'horizontal');
    }
  },
  splitTabs: [],
  splitActiveTabId: null,
  splitActiveDocumentId: null,

  // Tiling Layout Tree State
  layoutTree: createInitialLayoutTree('main'),
  panes: {
    main: {
      id: 'main',
      tabs: [],
      activeTabId: null,
      activeDocumentId: null,
    },
  },
  focusedPaneId: 'main',

  setFocusedPane: (paneId: PaneId) => {
    if (paneId.startsWith('sidebar:')) return;
    const { panes } = get();
    const currentPane = panes[paneId] || panes['main'];
    if (!currentPane) return;

    const activeTab = currentPane.tabs.find((t) => t.id === currentPane.activeTabId);
    const docId = activeTab?.document_id || currentPane.activeDocumentId;

    const isMain = paneId === 'main';
    set({
      focusedPaneId: paneId,
      activePane: isMain ? 'main' : 'split',
      ...(isMain
        ? {}
        : {
            splitTabs: currentPane.tabs,
            splitActiveTabId: currentPane.activeTabId,
            splitActiveDocumentId: docId || null,
          }),
    });

    if (docId && !docId.startsWith('__')) {
      useDocumentStore.getState().setActiveDocumentById(docId, { preserveViewMode: true });
    } else {
      useDocumentStore.setState({ activeDocument: null, selectedDocIds: [] });
    }
  },

  splitPane: (targetPaneId, direction, initialDocId, initialTitle, initialOptions) => {
    const { layoutTree, panes } = get();
    const newPaneId = `pane-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Target pane's active document or provided doc
    const targetPane = panes[targetPaneId] || panes['main'];
    const targetTab = targetPane?.tabs.find((t) => t.id === targetPane?.activeTabId);

    const activeDocId =
      initialDocId !== undefined
        ? initialDocId
        : (targetTab ? targetTab.document_id : (useDocumentStore.getState().activeDocument?.id || ''));
    const title =
      initialTitle !== undefined
        ? initialTitle
        : (targetTab ? targetTab.title : (useDocumentStore.getState().activeDocument?.title || 'Untitled'));

    const resolvedViewMode =
      initialOptions?.viewMode ||
      targetTab?.view_mode ||
      (activeDocId === '__graph__' ? 'graph' : activeDocId === '__canvas__' ? 'canvas' : activeDocId === '__tasks__' ? 'tasks' : 'document');

    const resolvedViewType =
      initialOptions?.viewType ||
      targetTab?.view_type ||
      (activeDocId === '__graph__' ? 'graph' : activeDocId === '__canvas__' ? 'canvas' : activeDocId === '__tasks__' ? 'tasks' : 'document');

    const resolvedIcon = initialOptions?.icon !== undefined ? initialOptions.icon : targetTab?.icon;
    const resolvedMetadata = initialOptions?.metadata !== undefined ? initialOptions.metadata : targetTab?.metadata;

    const newTab: TabItem = {
      id: `tab-${newPaneId}-${Date.now()}`,
      document_id: activeDocId,
      title: title,
      view_mode: resolvedViewMode as any,
      view_type: resolvedViewType,
      icon: resolvedIcon,
      metadata: resolvedMetadata,
    };

    const newPaneModel: PaneModel = {
      id: newPaneId,
      tabs: [newTab],
      activeTabId: newTab.id,
      activeDocumentId: activeDocId || null,
    };

    const newTree = splitNode(layoutTree, targetPaneId, direction, newPaneId);
    const newPanes = {
      ...panes,
      [newPaneId]: newPaneModel,
    };

    const isNowSplit = newTree.type === 'split';

    set({
      layoutTree: newTree,
      panes: newPanes,
      focusedPaneId: newPaneId,
      isSplitView: isNowSplit,
      splitDirection: newTree.type === 'split' ? newTree.direction : direction,
      activePane: 'split',
      splitTabs: newPaneModel.tabs,
      splitActiveTabId: newPaneModel.activeTabId,
      splitActiveDocumentId: newPaneModel.activeDocumentId || null,
    });

    if (activeDocId && !activeDocId.startsWith('__')) {
      useDocumentStore.getState().setActiveDocumentById(activeDocId, { preserveViewMode: true });
    }

    emitBridgeAppEvent('tab:changed', { activeTabId: newTab.id });
    saveTabsSession(get().vaultPath);
  },

  closeTabInPane: (paneId, tabId) => {
    const { layoutTree, panes, focusedPaneId } = get();
    const currentPane = panes[paneId];
    if (!currentPane) return;

    const tabToClose = currentPane.tabs.find((t) => t.id === tabId);
    if (!tabToClose) return;

    const isCurrentTabEmpty =
      (!tabToClose.document_id || tabToClose.document_id === '') &&
      (!tabToClose.view_type || tabToClose.view_type === 'document');

    const remainingTabs = currentPane.tabs.filter((t) => t.id !== tabId);

    // If no remaining tabs in this pane:
    if (remainingTabs.length === 0) {
      const allPaneIds = getAllPaneIds(layoutTree);
      if (allPaneIds.length <= 1) {
        // If it's already the one and only empty new tab, cannot close it
        if (isCurrentTabEmpty) {
          return;
        }

        // Fallback to empty new tab
        const fallbackTab: TabItem = {
          id: `tab-empty-${Date.now()}`,
          document_id: '',
          title: 'New tab',
          view_mode: 'document',
          view_type: 'document',
        };
        const updatedMain: PaneModel = {
          id: 'main',
          tabs: [fallbackTab],
          activeTabId: fallbackTab.id,
          activeDocumentId: null,
        };
        set({
          layoutTree: createInitialLayoutTree('main'),
          panes: { main: updatedMain },
          focusedPaneId: 'main',
          isSplitView: false,
          activePane: 'main',
          tabs: [fallbackTab],
          activeTabId: fallbackTab.id,
          splitTabs: [],
          splitActiveTabId: null,
          splitActiveDocumentId: null,
        });
        useDocumentStore.setState({ activeDocument: null });
        saveTabsSession(get().vaultPath);
        return;
      }

      // Close this pane and prune from tree
      get().closePane(paneId);
      return;
    }

    // Otherwise pane has remaining tabs
    let nextActiveTabId = currentPane.activeTabId;
    if (currentPane.activeTabId === tabId) {
      const closedIndex = currentPane.tabs.findIndex((t) => t.id === tabId);
      const nextIndex = Math.min(closedIndex, remainingTabs.length - 1);
      nextActiveTabId = remainingTabs[nextIndex].id;
    }

    const nextTab = remainingTabs.find((t) => t.id === nextActiveTabId);
    const updatedPane: PaneModel = {
      ...currentPane,
      tabs: remainingTabs,
      activeTabId: nextActiveTabId,
      activeDocumentId: nextTab?.document_id || null,
    };

    const newPanes = {
      ...panes,
      [paneId]: updatedPane,
    };

    const isMain = paneId === 'main';
    set({
      panes: newPanes,
      ...(isMain ? { tabs: remainingTabs, activeTabId: nextActiveTabId } : {}),
      ...(paneId === get().focusedPaneId && !isMain
        ? { splitTabs: remainingTabs, splitActiveTabId: nextActiveTabId, splitActiveDocumentId: nextTab?.document_id || null }
        : {}),
    });

    if (paneId === focusedPaneId && nextTab && nextTab.document_id && !nextTab.document_id.startsWith('__')) {
      useDocumentStore.getState().setActiveDocumentById(nextTab.document_id, { preserveViewMode: true });
    } else if (paneId === focusedPaneId) {
      useDocumentStore.setState({ activeDocument: null, selectedDocIds: [] });
    }

    saveTabsSession(get().vaultPath);
  },

  closePane: (paneId) => {
    const { layoutTree, panes, focusedPaneId } = get();
    const newTree = removePaneNode(layoutTree, paneId) || createInitialLayoutTree('main');
    const remainingPaneIds = getAllPaneIds(newTree);

    const newPanes: Record<PaneId, PaneModel> = {};
    for (const id of remainingPaneIds) {
      if (panes[id]) {
        newPanes[id] = panes[id];
      }
    }

    let nextFocusedId = focusedPaneId === paneId ? remainingPaneIds[0] || 'main' : focusedPaneId;
    if (!newPanes[nextFocusedId]) {
      nextFocusedId = remainingPaneIds[0] || 'main';
    }

    if (newTree.type === 'pane' && newTree.id !== 'main') {
      const oldId = newTree.id;
      const oldModel = newPanes[oldId];
      delete newPanes[oldId];
      newTree.id = 'main';
      if (oldModel) {
        newPanes['main'] = {
          ...oldModel,
          id: 'main',
        };
      }
      nextFocusedId = 'main';
    }

    const mainModel = newPanes['main'] || newPanes[remainingPaneIds[0]];
    const activeDocId =
      mainModel?.activeDocumentId ||
      (mainModel?.activeTabId ? mainModel.tabs.find((t) => t.id === mainModel.activeTabId)?.document_id : null);

    const isNowSplit = newTree.type === 'split';

    set({
      layoutTree: newTree,
      panes: newPanes,
      focusedPaneId: nextFocusedId,
      isSplitView: isNowSplit,
      activePane: nextFocusedId === 'main' ? 'main' : 'split',
      tabs: mainModel?.tabs || [],
      activeTabId: mainModel?.activeTabId || null,
      splitTabs: isNowSplit ? newPanes[remainingPaneIds[1]]?.tabs || [] : [],
      splitActiveTabId: isNowSplit ? newPanes[remainingPaneIds[1]]?.activeTabId || null : null,
      splitActiveDocumentId: isNowSplit ? newPanes[remainingPaneIds[1]]?.activeDocumentId || null : null,
    });

    if (activeDocId && !activeDocId.startsWith('__')) {
      useDocumentStore.getState().setActiveDocumentById(activeDocId, { preserveViewMode: true });
    }

    saveTabsSession(get().vaultPath);
  },

  openTabInPane: (paneId, docId, title = 'Untitled', options?: OpenTabOptions) => {
    const { panes } = get();
    const currentPane = panes[paneId] || panes['main'];
    if (!currentPane) return;

    const explicitTabId = options?.id;
    const metadata = options?.metadata;

    const currentTab = currentPane.tabs.find((t) => t.id === currentPane.activeTabId);
    let newTabs = [...currentPane.tabs];
    let nextTabId = currentPane.activeTabId;

    const isCurrentTabEmpty =
      options?.replaceCurrentEmpty !== false &&
      currentTab &&
      (!currentTab.document_id || currentTab.document_id === '' || currentTab.document_id.startsWith('__empty__')) &&
      (!currentTab.view_type || currentTab.view_type === 'document') &&
      !currentTab.metadata;

    if (isCurrentTabEmpty) {
      nextTabId = explicitTabId || currentTab.id;
      newTabs = currentPane.tabs.map((t) =>
        t.id === currentTab.id
          ? {
              ...t,
              id: nextTabId!,
              document_id: docId,
              title: title || 'Untitled',
              view_mode: (options?.viewMode as any) || 'document',
              view_type: options?.viewType || 'document',
              icon: options?.icon,
              metadata,
            }
          : t
      );
    } else {
      const existingIndex = currentPane.tabs.findIndex((t) => {
        if (explicitTabId && t.id === explicitTabId) return true;
        if (explicitTabId) return false;
        if (t.document_id !== docId) return false;
        if (!metadata && !t.metadata) return true;
        if (metadata && t.metadata) {
          const keysA = Object.keys(metadata);
          const keysB = Object.keys(t.metadata);
          return keysA.length === keysB.length && keysA.every((k) => metadata[k] === (t.metadata as Record<string, unknown>)[k]);
        }
        return false;
      });

      if (existingIndex >= 0) {
        nextTabId = currentPane.tabs[existingIndex].id;
        if (metadata !== undefined || options?.icon !== undefined || title) {
          newTabs = currentPane.tabs.map((t, idx) =>
            idx === existingIndex
              ? {
                  ...t,
                  title: title || t.title,
                  icon: options?.icon !== undefined ? options.icon : t.icon,
                  metadata: metadata !== undefined ? metadata : t.metadata,
                }
              : t
          );
        }
      } else {
        const newTab: TabItem = {
          id: explicitTabId || `tab-${docId}-${Date.now()}`,
          document_id: docId,
          title: title || 'Untitled',
          view_mode: (options?.viewMode as any) || 'document',
          view_type: options?.viewType || 'document',
          icon: options?.icon,
          metadata,
        };
        newTabs.push(newTab);
        nextTabId = newTab.id;
      }
    }

    const updatedPane: PaneModel = {
      ...currentPane,
      tabs: newTabs,
      activeTabId: nextTabId || null,
      activeDocumentId: docId,
    };

    const newPanes = {
      ...panes,
      [paneId]: updatedPane,
    };

    const isMain = paneId === 'main';
    set({
      panes: newPanes,
      focusedPaneId: paneId,
      activePane: isMain ? 'main' : 'split',
      ...(isMain ? { tabs: newTabs, activeTabId: nextTabId } : {}),
      ...(paneId === get().focusedPaneId && !isMain
        ? { splitTabs: newTabs, splitActiveTabId: nextTabId, splitActiveDocumentId: docId }
        : {}),
    });

    if (docId && !docId.startsWith('__')) {
      useDocumentStore.getState().setActiveDocumentById(docId, { preserveViewMode: true });
    }

    emitBridgeAppEvent('tab:changed', { activeTabId: nextTabId });
    saveTabsSession(get().vaultPath);
  },

  openEmptyTabInPane: (paneId) => {
    const { panes } = get();
    const currentPane = panes[paneId] || panes['main'];
    if (!currentPane) return;

    const newTab: TabItem = {
      id: `tab-empty-${Date.now()}`,
      document_id: '',
      title: 'New tab',
      view_mode: 'document',
      view_type: 'document',
    };

    const updatedPane: PaneModel = {
      ...currentPane,
      tabs: [...currentPane.tabs, newTab],
      activeTabId: newTab.id,
      activeDocumentId: null,
    };

    const newPanes = {
      ...panes,
      [paneId]: updatedPane,
    };

    const isMain = paneId === 'main';
    set({
      panes: newPanes,
      focusedPaneId: paneId,
      activePane: isMain ? 'main' : 'split',
      ...(isMain ? { tabs: updatedPane.tabs, activeTabId: newTab.id } : {}),
      ...(paneId === get().focusedPaneId && !isMain
        ? { splitTabs: updatedPane.tabs, splitActiveTabId: newTab.id, splitActiveDocumentId: null }
        : {}),
    });

    if (isMain || paneId === get().focusedPaneId) {
      useDocumentStore.setState({ activeDocument: null, selectedDocIds: [] });
    }

    emitBridgeAppEvent('tab:changed', { activeTabId: newTab.id });
    saveTabsSession(get().vaultPath);
  },

  openCustomTabInPane: (paneId, options) => {
    const { panes } = get();
    const currentPane = panes[paneId] || panes['main'];
    if (!currentPane) return;

    const targetDocId = options.documentId || `__${options.viewType}__`;
    const isDocViewer = options.viewType === 'extension-doc' || options.viewType === 'plugin-doc';
    const existing = currentPane.tabs.find(
      (t) =>
        (options.id && t.id === options.id) ||
        t.document_id === targetDocId ||
        (!isDocViewer && (t.view_type === options.viewType || t.view_mode === options.viewType))
    );

    if (existing) {
      get().setActiveTabInPane(paneId, existing.id);
      return;
    }

    const currentTab = currentPane.tabs.find((t) => t.id === currentPane.activeTabId);
    let newTabs = [...currentPane.tabs];
    let newTabId = options.id || `tab-${options.viewType}-${Date.now()}`;

    if (
      currentTab &&
      (!currentTab.document_id || currentTab.document_id === '') &&
      (!currentTab.view_type || currentTab.view_type === 'document')
    ) {
      newTabId = currentTab.id;
      newTabs = currentPane.tabs.map((t) =>
        t.id === currentTab.id
          ? {
              ...t,
              document_id: targetDocId,
              title: options.title,
              view_type: options.viewType,
              view_mode: options.viewType as any,
              icon: options.icon,
            }
          : t
      );
    } else {
      const newTab: TabItem = {
        id: newTabId,
        document_id: targetDocId,
        title: options.title,
        view_type: options.viewType,
        view_mode: options.viewType as any,
        icon: options.icon,
      };
      newTabs.push(newTab);
    }

    const updatedPane: PaneModel = {
      ...currentPane,
      tabs: newTabs,
      activeTabId: newTabId,
      activeDocumentId: targetDocId,
    };

    const newPanes = {
      ...panes,
      [paneId]: updatedPane,
    };

    const isMain = paneId === 'main';
    set({
      panes: newPanes,
      focusedPaneId: paneId,
      activePane: isMain ? 'main' : 'split',
      ...(isMain ? { tabs: newTabs, activeTabId: newTabId } : {}),
      ...(paneId === get().focusedPaneId && !isMain
        ? { splitTabs: newTabs, splitActiveTabId: newTabId, splitActiveDocumentId: targetDocId }
        : {}),
    });

    saveTabsSession(get().vaultPath);
  },

  reorderTabsInPane: (paneId, sourceIndex, destinationIndex) => {
    const { panes } = get();
    const currentPane = panes[paneId];
    if (!currentPane) return;

    if (
      sourceIndex < 0 ||
      sourceIndex >= currentPane.tabs.length ||
      destinationIndex < 0 ||
      destinationIndex >= currentPane.tabs.length ||
      sourceIndex === destinationIndex
    ) {
      return;
    }

    const newTabs = [...currentPane.tabs];
    const [moved] = newTabs.splice(sourceIndex, 1);
    newTabs.splice(destinationIndex, 0, moved);

    const updatedPane = { ...currentPane, tabs: newTabs };
    const newPanes = { ...panes, [paneId]: updatedPane };

    const isMain = paneId === 'main';
    set({
      panes: newPanes,
      ...(isMain ? { tabs: newTabs } : {}),
      ...(paneId === get().focusedPaneId && !isMain ? { splitTabs: newTabs } : {}),
    });

    saveTabsSession(get().vaultPath);
  },

  moveTabBetweenPanes: (sourcePaneId, sourceIndex, targetPaneId, targetIndex) => {
    const { layoutTree, panes } = get();
    const sourcePane = panes[sourcePaneId];
    const targetPane = panes[targetPaneId];
    if (!sourcePane || !targetPane) return;

    if (sourceIndex < 0 || sourceIndex >= sourcePane.tabs.length) return;
    const tabToMove = sourcePane.tabs[sourceIndex];
    if (!tabToMove) return;

    if (sourcePaneId === targetPaneId) {
      get().reorderTabsInPane(sourcePaneId, sourceIndex, targetIndex);
      return;
    }

    const remainingSourceTabs = sourcePane.tabs.filter((_, i) => i !== sourceIndex);
    const newTargetTabs = [...targetPane.tabs];
    const clampedTargetIndex = Math.max(0, Math.min(targetIndex, newTargetTabs.length));
    newTargetTabs.splice(clampedTargetIndex, 0, tabToMove);

    const updatedTargetPane: PaneModel = {
      ...targetPane,
      tabs: newTargetTabs,
      activeTabId: tabToMove.id,
      activeDocumentId: tabToMove.document_id || null,
    };

    const allPaneIds = getAllPaneIds(layoutTree);
    if (remainingSourceTabs.length === 0) {
      if (allPaneIds.length <= 1) {
        const fallbackTab: TabItem = {
          id: `tab-empty-${Date.now()}`,
          document_id: '',
          title: 'New tab',
          view_mode: 'document',
          view_type: 'document',
        };
        const updatedSource: PaneModel = {
          ...sourcePane,
          tabs: [fallbackTab],
          activeTabId: fallbackTab.id,
          activeDocumentId: null,
        };
        set({
          panes: {
            ...panes,
            [sourcePaneId]: updatedSource,
            [targetPaneId]: updatedTargetPane,
          },
          focusedPaneId: targetPaneId,
        });
      } else {
        const newTree = removePaneNode(layoutTree, sourcePaneId) || createInitialLayoutTree(targetPaneId);
        const remainingIds = getAllPaneIds(newTree);
        const newPanes: Record<PaneId, PaneModel> = {};
        for (const id of remainingIds) {
          if (id === targetPaneId) {
            newPanes[id] = updatedTargetPane;
          } else if (panes[id]) {
            newPanes[id] = panes[id];
          }
        }

        const isNowSplit = newTree.type === 'split';
        const mainModel = newPanes['main'] || newPanes[remainingIds[0]];
        set({
          layoutTree: newTree,
          panes: newPanes,
          focusedPaneId: targetPaneId,
          isSplitView: isNowSplit,
          activePane: targetPaneId === 'main' ? 'main' : 'split',
          tabs: mainModel?.tabs || [],
          activeTabId: mainModel?.activeTabId || null,
          splitTabs: isNowSplit ? newPanes[remainingIds[1]]?.tabs || [] : [],
          splitActiveTabId: isNowSplit ? newPanes[remainingIds[1]]?.activeTabId || null : null,
          splitActiveDocumentId: isNowSplit ? newPanes[remainingIds[1]]?.activeDocumentId || null : null,
        });
      }
    } else {
      let nextSourceActiveTabId = sourcePane.activeTabId;
      if (sourcePane.activeTabId === tabToMove.id) {
        const nextIndex = Math.min(sourceIndex, remainingSourceTabs.length - 1);
        nextSourceActiveTabId = remainingSourceTabs[nextIndex].id;
      }
      const nextSourceTab = remainingSourceTabs.find((t) => t.id === nextSourceActiveTabId);
      const updatedSourcePane: PaneModel = {
        ...sourcePane,
        tabs: remainingSourceTabs,
        activeTabId: nextSourceActiveTabId,
        activeDocumentId: nextSourceTab?.document_id || null,
      };

      const newPanes = {
        ...panes,
        [sourcePaneId]: updatedSourcePane,
        [targetPaneId]: updatedTargetPane,
      };

      const isTargetMain = targetPaneId === 'main';
      const mainModel = newPanes['main'];
      set({
        panes: newPanes,
        focusedPaneId: targetPaneId,
        activePane: isTargetMain ? 'main' : 'split',
        tabs: mainModel?.tabs || [],
        activeTabId: mainModel?.activeTabId || null,
        ...(targetPaneId === 'split'
          ? { splitTabs: updatedTargetPane.tabs, splitActiveTabId: updatedTargetPane.activeTabId, splitActiveDocumentId: updatedTargetPane.activeDocumentId }
          : {}),
      });
    }

    if (tabToMove.document_id && !tabToMove.document_id.startsWith('__')) {
      useDocumentStore.getState().setActiveDocumentById(tabToMove.document_id, { preserveViewMode: true });
    } else {
      useDocumentStore.setState({ activeDocument: null, selectedDocIds: [] });
    }

    emitBridgeAppEvent('tab:changed', { activeTabId: tabToMove.id });
    saveTabsSession(get().vaultPath);
  },

  setActiveTabInPane: (paneId, tabId) => {
    const { panes } = get();
    const currentPane = panes[paneId];
    if (!currentPane) return;

    const tab = currentPane.tabs.find((t) => t.id === tabId);
    const docId = tab?.document_id || null;

    const updatedPane = {
      ...currentPane,
      activeTabId: tabId,
      activeDocumentId: docId,
    };
    const newPanes = { ...panes, [paneId]: updatedPane };

    const isMain = paneId === 'main';
    set({
      panes: newPanes,
      focusedPaneId: paneId,
      activePane: isMain ? 'main' : 'split',
      ...(isMain ? { activeTabId: tabId } : {}),
      ...(paneId === get().focusedPaneId && !isMain
        ? { splitActiveTabId: tabId, splitActiveDocumentId: docId }
        : {}),
    });

    if (docId && !docId.startsWith('__')) {
      useDocumentStore.getState().setActiveDocumentById(docId, { preserveViewMode: true });
    } else if (!docId && (isMain || paneId === get().focusedPaneId)) {
      useDocumentStore.setState({ activeDocument: null, selectedDocIds: [] });
    }

    emitBridgeAppEvent('tab:changed', { activeTabId: tabId });
    saveTabsSession(get().vaultPath);
  },

  openSplitTab: (documentId: string, title = 'Untitled', direction?: 'horizontal' | 'vertical') => {
    const targetPaneId = get().focusedPaneId || 'main';
    get().splitPane(targetPaneId, direction || 'horizontal', documentId, title);
  },

  openCustomSplitTab: (options: OpenCustomTabOptions & { direction?: 'horizontal' | 'vertical' }) => {
    const targetPaneId = get().focusedPaneId || 'main';
    get().splitPane(targetPaneId, options.direction || 'horizontal', options.documentId, options.title, {
      viewMode: options.viewType,
      viewType: options.viewType,
      icon: options.icon,
    });
  },

  openEmptySplitTab: (direction?: 'horizontal' | 'vertical') => {
    const targetPaneId = get().focusedPaneId || 'main';
    get().splitPane(targetPaneId, direction || 'horizontal');
  },

  closeSplitTab: (tabId: string) => {
    const { panes, focusedPaneId } = get();
    for (const [paneId, model] of Object.entries(panes)) {
      if (model.tabs.some((t) => t.id === tabId)) {
        get().closeTabInPane(paneId, tabId);
        return;
      }
    }
    get().closeTabInPane(focusedPaneId || 'split', tabId);
  },

  reorderSplitTabs: (sourceIndex: number, destinationIndex: number) => {
    const targetPaneId = get().focusedPaneId === 'main' ? (getAllPaneIds(get().layoutTree).find((id) => id !== 'main') || 'main') : get().focusedPaneId;
    get().reorderTabsInPane(targetPaneId, sourceIndex, destinationIndex);
  },

  setSplitActiveTabId: (tabId: string) => {
    const { panes, focusedPaneId } = get();
    for (const [paneId, model] of Object.entries(panes)) {
      if (model.tabs.some((t) => t.id === tabId)) {
        get().setActiveTabInPane(paneId, tabId);
        return;
      }
    }
    get().setActiveTabInPane(focusedPaneId || 'split', tabId);
  },

  closeSplitView: () => {
    const { panes } = get();
    const mainModel = panes['main'] || {
      id: 'main',
      tabs: [],
      activeTabId: null,
      activeDocumentId: null,
    };
    set({
      layoutTree: createInitialLayoutTree('main'),
      panes: { main: mainModel },
      focusedPaneId: 'main',
      isSplitView: false,
      activePane: 'main',
      splitTabs: [],
      splitActiveTabId: null,
      splitActiveDocumentId: null,
    });
    saveTabsSession(get().vaultPath);
  },

  setSplitActiveDocumentId: (id) => set({ splitActiveDocumentId: id }),

  isCommandPaletteOpen: false,
  setIsCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  isReviewModalOpen: false,
  setIsReviewModalOpen: (open) => set({ isReviewModalOpen: open }),
  isSettingsOpen: false,
  settingsInitialTab: null,
  setIsSettingsOpen: (open, initialTab) =>
    set({
      isSettingsOpen: open,
      settingsInitialTab: open && initialTab ? initialTab : null,
    }),
  isHelpModalOpen: false,
  setIsHelpModalOpen: (open) => set({ isHelpModalOpen: open }),
  isHearthModalOpen: false,
  setIsHearthModalOpen: (open) => set({ isHearthModalOpen: open, isVaultModalOpen: open }),
  isVaultModalOpen: false,
  setIsVaultModalOpen: (open) => set({ isHearthModalOpen: open, isVaultModalOpen: open }),

  // Custom Obsidian Dialogs & Toasts
  skipDeleteConfirmation: false,
  setSkipDeleteConfirmation: (skip: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flint_skip_delete_confirmation', skip ? 'true' : 'false');
    }
    set({ skipDeleteConfirmation: skip });
    useSettingsStore.getState().setSkipDeleteConfirmation(skip);
  },
  skipRenameConfirmation: false,
  setSkipRenameConfirmation: (skip: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flint_skip_rename_confirmation', skip ? 'true' : 'false');
    }
    set({ skipRenameConfirmation: skip });
    useSettingsStore.getState().setSkipRenameConfirmation(skip);
  },
  confirmDialog: null,
  openConfirmDialog: (config) => {
    const { skipDeleteConfirmation } = useSettingsStore.getState();
    if (config.isDanger && skipDeleteConfirmation) {
      config.onConfirm();
      return;
    }
    set({ confirmDialog: { ...config, isOpen: true } });
  },
  closeConfirmDialog: () => set({ confirmDialog: null }),

  inputDialog: null,
  openInputDialog: (config) => set({ inputDialog: { ...config, isOpen: true } }),
  closeInputDialog: () => set({ inputDialog: null }),

  toast: null,
  showToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}`;
    set({ toast: { id, message, type } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 3000);
  },
  hideToast: () => set({ toast: null }),

  folderPickerPrompt: null,
  promptFolderSelection: (config) => {
    set({
      isSettingsOpen: false,
      isLeftSidebarOpen: true,
      activeLeftView: 'files',
      folderPickerPrompt: { ...config, isOpen: true },
    });
  },
  cancelFolderSelection: () => {
    const current = get().folderPickerPrompt;
    set({ folderPickerPrompt: null });
    current?.onCancel?.();
  },

  collapseAllCount: 0,
  folderOpenState: loadPersistedFolderOpenState(),
  setFolderOpen: (folderId, isOpen) => {
    const current = { ...get().folderOpenState, [folderId]: isOpen };
    savePersistedFolderOpenState(current, get().hearthPath || get().vaultPath);
    set({ folderOpenState: current });
  },
  toggleFolderOpen: (folderId) => {
    const currentState = get().folderOpenState[folderId] !== undefined ? get().folderOpenState[folderId] : true;
    const current = { ...get().folderOpenState, [folderId]: !currentState };
    savePersistedFolderOpenState(current, get().hearthPath || get().vaultPath);
    set({ folderOpenState: current });
  },
  collapseAllFolders: () => {
    const docs = useDocumentStore.getState().documents;
    const nextState: Record<string, boolean> = { ...get().folderOpenState };
    docs.filter((d) => d.is_folder).forEach((f) => {
      nextState[f.id] = false;
    });
    savePersistedFolderOpenState(nextState, get().hearthPath || get().vaultPath);
    set((s) => ({ folderOpenState: nextState, collapseAllCount: s.collapseAllCount + 1 }));
  },
  expandAllFolders: () => {
    const docs = useDocumentStore.getState().documents;
    const nextState: Record<string, boolean> = { ...get().folderOpenState };
    docs.filter((d) => d.is_folder).forEach((f) => {
      nextState[f.id] = true;
    });
    savePersistedFolderOpenState(nextState, get().hearthPath || get().vaultPath);
    set((s) => ({ folderOpenState: nextState, collapseAllCount: s.collapseAllCount + 1 }));
  },
  toggleCollapseExpandAll: () => {
    const docs = useDocumentStore.getState().documents;
    const folders = docs.filter((d) => d.is_folder);
    if (folders.length === 0) return;
    const openState = get().folderOpenState;
    const areAllCollapsed = folders.every((f) => openState[f.id] === false);
    if (areAllCollapsed) {
      get().expandAllFolders();
    } else {
      get().collapseAllFolders();
    }
  },
  triggerCollapseAll: () => {
    get().toggleCollapseExpandAll();
  },

  // Hearth & Vault state
  hearthName: 'Flint Hearth',
  hearthPath: '',
  recentHearths: [],
  vaultName: 'Flint Hearth',
  vaultPath: '',
  recentVaults: [],
  setHearthName: (name) => set({ hearthName: name, vaultName: name }),
  setHearthPath: (path) => {
    const persisted = loadPersistedFolderOpenState(path);
    set({ hearthPath: path, vaultPath: path, folderOpenState: persisted });
  },
  setVaultName: (name) => set({ hearthName: name, vaultName: name }),
  setVaultPath: (path) => {
    const persisted = loadPersistedFolderOpenState(path);
    set({ hearthPath: path, vaultPath: path, folderOpenState: persisted });
  },

  initHearthInfo: async () => {
    try {
      const hearth = await (platform.getCurrentHearth ? platform.getCurrentHearth() : platform.getCurrentVault());
      if (hearth && hearth.path) {
        const recentList = (hearth as any).recentHearths || (hearth as any).recentVaults || [];
        const persisted = loadPersistedFolderOpenState(hearth.path);
        set({
          hearthPath: hearth.path,
          hearthName: hearth.name || 'Flint Hearth',
          recentHearths: recentList,
          vaultPath: hearth.path,
          vaultName: hearth.name || 'Flint Hearth',
          recentVaults: recentList,
          folderOpenState: persisted,
        });
        dbAdapter.setActiveHearthPath(hearth.path);
      }
    } catch (e) {
      console.error('Error fetching hearth info:', e);
    }

    // Subscribe to external hearth change notifications
    const onHearth = platform.onHearthChanged || platform.onVaultChanged;
    onHearth((hearth) => {
      if (hearth?.path) {
        const currentPath = get().hearthPath || get().vaultPath;
        if (currentPath && hearth.path && currentPath.toLowerCase() === hearth.path.toLowerCase()) {
          return;
        }
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    });
  },

  initVaultInfo: async () => {
    return get().initHearthInfo();
  },

  selectHearthFolder: async () => {
    try {
      const currentPath = get().hearthPath || get().vaultPath;
      if (currentPath) {
        saveTabsSession(currentPath);
        await dbAdapter.persist();
      }
      dbAdapter.setSwitchingHearth(true);
      const res = await (platform.selectHearthFolder ? platform.selectHearthFolder() : platform.selectVaultFolder());
      if (!res.canceled && res.path) {
        if (typeof window !== 'undefined') {
          window.location.reload();
          return;
        }
      } else {
        dbAdapter.setSwitchingHearth(false);
      }
    } catch (e) {
      dbAdapter.setSwitchingHearth(false);
      console.error('Error selecting hearth folder:', e);
    }
  },

  selectVaultFolder: async () => {
    return get().selectHearthFolder();
  },

  selectParentFolder: async () => {
    try {
      const res = await platform.selectParentFolder();
      if (!res.canceled && res.path) {
        return res.path;
      }
    } catch (e) {
      console.error('Error selecting parent folder:', e);
    }
    return null;
  },

  createNewHearth: async (name: string, parentPath: string) => {
    try {
      const currentPath = get().hearthPath || get().vaultPath;
      if (currentPath) {
        saveTabsSession(currentPath);
        await dbAdapter.persist();
      }
      dbAdapter.setSwitchingHearth(true);
      const res = await platform.createNewHearth(name, parentPath);
      if (res.success && res.path) {
        if (typeof window !== 'undefined') {
          window.location.reload();
          return;
        }
      } else {
        dbAdapter.setSwitchingHearth(false);
      }
    } catch (e) {
      dbAdapter.setSwitchingHearth(false);
      console.error('Error creating new hearth:', e);
    }
  },

  createNewVault: async (name: string, parentPath: string) => {
    return get().createNewHearth(name, parentPath);
  },

  renameHearth: async (targetPath: string, newName: string) => {
    try {
      const cleanName = (newName || '').trim();
      if (!cleanName) return { success: false, error: 'Name cannot be empty' };

      const activePath = targetPath || get().hearthPath || get().vaultPath;
      const isCurrent = !activePath || activePath === get().hearthPath || activePath === get().vaultPath;

      // If the active hearth is being renamed, flush pending SQLite writes first
      if (isCurrent) {
        try {
          await dbAdapter.persist();
        } catch (_) {}
      }

      const res = await platform.renameHearth(activePath, cleanName);
      if (res && res.success) {
        const list = res.recentHearths || [];
        const finalPath = res.path || activePath;

        set((state) => ({
          recentHearths: list.length > 0 ? list : state.recentHearths.map((v) => (v.path === activePath ? { ...v, path: finalPath, name: cleanName } : v)),
          recentVaults: list.length > 0 ? list : state.recentVaults.map((v) => (v.path === activePath ? { ...v, path: finalPath, name: cleanName } : v)),
          hearthName: isCurrent ? cleanName : state.hearthName,
          vaultName: isCurrent ? cleanName : state.vaultName,
          hearthPath: isCurrent ? finalPath : state.hearthPath,
          vaultPath: isCurrent ? finalPath : state.vaultPath,
        }));

        if (isCurrent) {
          dbAdapter.setActiveHearthPath(finalPath);
          try {
            await platform.setWindowTitle(`Flint`);
          } catch (_) {}
        }

        get().showToast(`Renamed Hearth to "${cleanName}"`, 'success');
        return { success: true, path: finalPath, name: cleanName };
      } else {
        const errorMsg = res?.error || 'Failed to rename Hearth';
        get().showToast(errorMsg, 'warning');
        return { success: false, error: errorMsg };
      }
    } catch (e: any) {
      console.error('Error renaming hearth:', e);
      get().showToast(e.message || 'Failed to rename Hearth', 'warning');
      return { success: false, error: e.message };
    }
  },

  renameVault: async (targetPath: string, newName: string) => {
    return get().renameHearth(targetPath, newName);
  },

  removeRecentHearth: async (targetPath: string) => {
    try {
      const res = await platform.removeRecentHearth(targetPath);
      if (res.success) {
        const list = (res as any).recentHearths || (res as any).recentVaults || [];
        set({ recentHearths: list, recentVaults: list });
        get().showToast('Removed Hearth from list', 'info');
      }
    } catch (e) {
      console.error('Error removing recent hearth:', e);
    }
  },

  removeRecentVault: async (targetPath: string) => {
    return get().removeRecentHearth(targetPath);
  },

  switchHearth: async (hearthPath: string) => {
    try {
      const currentPath = get().hearthPath || get().vaultPath;
      if (hearthPath && currentPath && hearthPath.toLowerCase() === currentPath.toLowerCase()) {
        get().showToast('This Hearth is already open', 'info');
        return;
      }
      if (currentPath) {
        saveTabsSession(currentPath);
        await dbAdapter.persist();
      }
      dbAdapter.setSwitchingHearth(true);
      const res = await platform.setCurrentHearth(hearthPath);
      if (res.success && res.path) {
        if (typeof window !== 'undefined') {
          window.location.reload();
          return;
        }
      } else {
        dbAdapter.setSwitchingHearth(false);
      }
    } catch (e) {
      dbAdapter.setSwitchingHearth(false);
      console.error('Error switching hearth:', e);
    }
  },

  switchVault: async (vaultPath: string) => {
    return get().switchHearth(vaultPath);
  },

  openHearthInExplorer: async () => {
    const { hearthPath, vaultPath } = get();
    const openFn = platform.openHearthInExplorer || platform.openVaultInExplorer;
    await openFn(hearthPath || vaultPath);
  },

  openVaultInExplorer: async () => {
    return get().openHearthInExplorer();
  },

  wordCount: 0,
  charCount: 0,
  backlinkCount: 0,
  isDatabaseActive: true,
  setIsDatabaseActive: (isDatabaseActive) => set({ isDatabaseActive }),
  setStatusMetrics: (metrics) =>
    set((state) => ({
      wordCount: metrics.wordCount !== undefined ? metrics.wordCount : state.wordCount,
      charCount: metrics.charCount !== undefined ? metrics.charCount : state.charCount,
      backlinkCount: metrics.backlinkCount !== undefined ? metrics.backlinkCount : state.backlinkCount,
    })),
}));

// Automatically persist workspace tabs session on changes and beforeunload
if (typeof window !== 'undefined') {
  useWorkspaceStore.subscribe((state, prevState) => {
    if (
      state.tabs !== prevState.tabs ||
      state.activeTabId !== prevState.activeTabId ||
      state.mainViewMode !== prevState.mainViewMode ||
      state.isSplitView !== prevState.isSplitView ||
      state.splitTabs !== prevState.splitTabs ||
      state.splitActiveTabId !== prevState.splitActiveTabId ||
      state.splitActiveDocumentId !== prevState.splitActiveDocumentId ||
      state.activePane !== prevState.activePane ||
      state.panes !== prevState.panes ||
      state.focusedPaneId !== prevState.focusedPaneId ||
      state.layoutTree !== prevState.layoutTree ||
      state.activeLeftView !== prevState.activeLeftView ||
      state.activeRightTab !== prevState.activeRightTab ||
      state.isLeftSidebarOpen !== prevState.isLeftSidebarOpen ||
      state.isRightSidebarOpen !== prevState.isRightSidebarOpen ||
      state.leftSidebarWidth !== prevState.leftSidebarWidth ||
      state.rightSidebarWidth !== prevState.rightSidebarWidth
    ) {
      saveTabsSession(state.vaultPath);
    }
  });

  useSidebarDockStore.subscribe(() => {
    saveTabsSession();
  });

  window.addEventListener('beforeunload', () => {
    saveTabsSession();
  });
}

bindFlintStores({ workspace: useWorkspaceStore });


