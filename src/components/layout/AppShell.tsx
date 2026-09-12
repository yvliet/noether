import React, { useEffect, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSettingsStore, applyAppearanceDOM } from '@/store/settingsStore';
import { useDocumentStore } from '@/store/documentStore';
import { WindowHeader } from './WindowHeader';
import { ActionRail } from './ActionRail';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { StatusBar } from './StatusBar';
import { SplitTabHeader } from './SplitTabHeader';
import { EditorCanvas } from '@/components/editor/EditorCanvas';
import { ToastNotification } from '@/components/modals/ToastNotification';
import { TooltipProvider } from '@/components/common/TooltipProvider';
import { ContextMenuRenderer } from '@/components/common/ContextMenu';

const SettingsModal = React.lazy(() => import('@/components/modals/SettingsModal').then(m => ({ default: m.SettingsModal })));
const VaultModal = React.lazy(() => import('@/components/modals/VaultModal').then(m => ({ default: m.VaultModal })));
const CommandPalette = React.lazy(() => import('@/components/search/CommandPalette').then(m => ({ default: m.CommandPalette })));
const HelpModal = React.lazy(() => import('@/components/modals/HelpModal').then(m => ({ default: m.HelpModal })));
const ConfirmModal = React.lazy(() => import('@/components/modals/ConfirmModal').then(m => ({ default: m.ConfirmModal })));
const PromptModal = React.lazy(() => import('@/components/modals/PromptModal').then(m => ({ default: m.PromptModal })));
const ImageLightboxModal = React.lazy(() => import('@/components/modals/ImageLightboxModal').then(m => ({ default: m.ImageLightboxModal })));
const UpdateModal = React.lazy(() => import('@/components/modals/UpdateModal').then(m => ({ default: m.UpdateModal })));
import { dragTooltipManager, FOLDER_SVG } from '@/lib/dragTooltip';

import { NoetherLogoIcon } from '@/components/common/Icons';
import { dbAdapter } from '@/lib/db/adapter';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoUpdater } from '@/hooks/useAutoUpdater';
import { appInstance } from '@/core/app/NoetherApp';
import { AppProvider, useNoetherApp, useViews, useModals, useExtensionList } from '@/core/app/AppContext';
import { ExtensionPortalSlotHost } from '@/components/common/ExtensionPortalSlotHost';
import { platform } from '@/lib/platform/platformAdapter';

const LazyDisabledExtensionView = React.lazy(() =>
  import('@/components/extension-viewer/DisabledExtensionView').then((m) => ({ default: m.DisabledExtensionView }))
);

const DynamicModalHost: React.FC = React.memo(() => {
  const app = useNoetherApp();
  const modals = useModals();
  return (
    <>
      {modals.map((m) => (
        <div key={m.id} className="noether-modal-host">
          {m.render(app)}
        </div>
      ))}
    </>
  );
});


const PaneViewport: React.FC<{ paneId: string }> = React.memo(({ paneId }) => {
  const app = useNoetherApp();
  useViews();
  useExtensionList();
  const panes = useWorkspaceStore((s) => s.panes);
  const paneModel = panes[paneId];
  const tabs = useMemo(() => paneModel?.tabs || [], [paneModel?.tabs]);
  const activeTabId = paneModel?.activeTabId || null;
  const mainViewMode = useWorkspaceStore((s) => s.mainViewMode);
  const closeTabInPane = useWorkspaceStore((s) => s.closeTabInPane);
  const setFocusedPane = useWorkspaceStore((s) => s.setFocusedPane);

  const currentTab = useMemo(() => tabs.find((t) => t.id === activeTabId), [tabs, activeTabId]);
  const currentViewType = currentTab?.view_type || currentTab?.view_mode || (paneId === 'main' ? mainViewMode : 'document');
  const extensionState = currentViewType && currentViewType !== 'document'
    ? app.extensions.getViewExtensionState(currentViewType)
    : { state: 'not_plugin' as const };

  // If the extension has been completely deleted from files, automatically delete the tab
  useEffect(() => {
    const isBuiltinCore = ['graph', 'canvas', 'tasks', 'marketplace', 'extension-doc'].includes(currentViewType || '');
    if (!isBuiltinCore && app.extensions.isReady && extensionState.state === 'deleted' && currentTab) {
      closeTabInPane(paneId, currentTab.id);
    }
  }, [extensionState.state, currentTab, closeTabInPane, paneId, app.extensions.isReady, currentViewType]);

  if (extensionState.state === 'active') {
    return (
      <div
        className="flex-1 h-full flex flex-col min-w-0 overflow-hidden"
        onClick={() => setFocusedPane(paneId)}
      >
        {extensionState.view.render({ tabId: currentTab?.id, documentId: currentTab?.document_id, app })}
      </div>
    );
  }

  if (extensionState.state === 'disabled') {
    return (
      <div
        className="flex-1 h-full flex flex-col min-w-0 overflow-hidden"
        onClick={() => setFocusedPane(paneId)}
      >
        <React.Suspense fallback={null}>
          <LazyDisabledExtensionView
            extensionId={extensionState.extensionId}
            extensionName={extensionState.manifest.name}
            viewTitle={extensionState.viewTitle}
            tabId={currentTab?.id}
          />
        </React.Suspense>
      </div>
    );
  }

  return <EditorCanvas paneId={paneId} pane={paneId === 'main' ? 'main' : 'split'} />;
});

import { getTopRowLeafIds } from '@/lib/layout/layoutTree';

interface TilingLayoutRendererProps {
  node: import('@/store/workspaceStore').LayoutNode;
}

const TilingLayoutRenderer: React.FC<TilingLayoutRendererProps> = React.memo(({ node }) => {
  const setFocusedPane = useWorkspaceStore((s) => s.setFocusedPane);
  const layoutTree = useWorkspaceStore((s) => s.layoutTree);

  if (node.type === 'split') {
    const isHorizontal = node.direction === 'horizontal';
    return (
      <div
        className={`flex-1 flex ${isHorizontal ? 'flex-row' : 'flex-col'} min-w-0 min-h-0 h-full overflow-hidden`}
        style={{ flex: node.flex || 1 }}
      >
        {node.children.map((child, index) => (
          <React.Fragment key={child.id}>
            {index > 0 && (
              <div
                className={`${isHorizontal ? 'border-l' : 'border-t'} border-[var(--noether-border-base)] shrink-0`}
              />
            )}
            <TilingLayoutRenderer node={child} />
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Leaf Pane: Only render an inline header if this pane is NOT touching the top window bar
  const topRowLeafIds = getTopRowLeafIds(layoutTree);
  const showInlineHeader = !topRowLeafIds.includes(node.id);

  return (
    <div
      data-pane-id={node.id}
      onClick={() => setFocusedPane(node.id)}
      style={{ background: 'var(--noether-bg-main-gradient, var(--noether-bg-main))', flex: node.flex || 1 }}
      className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden"
    >
      {showInlineHeader && <SplitTabHeader paneId={node.id} />}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <PaneViewport paneId={node.id} />
      </div>
    </div>
  );
});

const MainViewport: React.FC = React.memo(() => {
  useViews(); // Ensure reactive update when views are registered
  useExtensionList(); // Ensure reactive update when extensions are enabled/disabled
  const layoutTree = useWorkspaceStore((s) => s.layoutTree);
  const isRightSidebarOpen = useWorkspaceStore((s) => s.isRightSidebarOpen);
  const mainRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mainRef.current) return;
    const updatePaneWidth = (width: number) => {
      const halfWidth = Math.floor(width / 2);
      document.documentElement.style.setProperty('--noether-main-width', `${width}px`);
      document.documentElement.style.setProperty('--noether-split-pane-width', `${halfWidth}px`);
    };

    updatePaneWidth(mainRef.current.getBoundingClientRect().width);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          updatePaneWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(mainRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <main
      ref={mainRef}
      data-noether-viewport="true"
      style={{ background: 'var(--noether-bg-main-gradient, var(--noether-bg-main))' }}
      className={`noether-main-viewport flex-1 flex min-w-0 h-full overflow-hidden ${
        isRightSidebarOpen ? 'border-r' : ''
      } border-[var(--noether-border-base)]`}
    >
      <TilingLayoutRenderer node={layoutTree} />
    </main>
  );
});

const WindowTitleSync: React.FC = React.memo(() => {
  const vaultName = useWorkspaceStore((s) => s.vaultName);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const isSplitView = useWorkspaceStore((s) => s.isSplitView);
  const activePane = useWorkspaceStore((s) => s.activePane);
  const splitTabs = useWorkspaceStore((s) => s.splitTabs);
  const splitActiveTabId = useWorkspaceStore((s) => s.splitActiveTabId);
  const activeDocument = useDocumentStore((s) => s.activeDocument);

  // Dynamic window title format: Tabname﹕Vaultname﹕Noether
  useEffect(() => {
    const currentTabs = activePane === 'split' && isSplitView ? splitTabs : tabs;
    const currentActiveId = activePane === 'split' && isSplitView ? splitActiveTabId : activeTabId;
    const currentTab = currentTabs.find((t) => t.id === currentActiveId) || currentTabs[0] || tabs[0];

    const effectiveVault = vaultName || 'Vault';

    if (currentTab) {
      let tabTitle = currentTab.title;
      if (activeDocument && currentTab.document_id === activeDocument.id && activeDocument.title) {
        tabTitle = activeDocument.title;
      } else if (!tabTitle && currentTab.document_id && !currentTab.document_id.startsWith('__')) {
        const doc = useDocumentStore.getState().documents.find((d) => d.id === currentTab.document_id);
        if (doc?.title) tabTitle = doc.title;
      }
      if (!tabTitle) {
        const viewType =
          currentTab.view_type ||
          currentTab.view_mode ||
          (currentTab.document_id?.startsWith('__')
            ? currentTab.document_id.replace(/^__/, '').replace(/__$/, '')
            : '');
        if (viewType && viewType !== 'document') {
          const regView = appInstance.views.getView(viewType);
          tabTitle = regView?.title || (viewType.charAt(0).toUpperCase() + viewType.slice(1));
        } else {
          tabTitle = 'Untitled';
        }
      }
      platform.setWindowTitle(`${tabTitle}﹕${effectiveVault}﹕Noether`);
    } else {
      platform.setWindowTitle(`${effectiveVault}﹕Noether`);
    }
  }, [vaultName, tabs, activeTabId, isSplitView, activePane, splitTabs, splitActiveTabId, activeDocument]);

  return null;
});
WindowTitleSync.displayName = 'WindowTitleSync';

export const AppShell: React.FC = React.memo(() => {
  useKeyboardShortcuts();
  useAutoUpdater();

  const isLeftSidebarOpen = useWorkspaceStore((s) => s.isLeftSidebarOpen);
  const isRightSidebarOpen = useWorkspaceStore((s) => s.isRightSidebarOpen);
  const initVaultInfo = useWorkspaceStore((s) => s.initVaultInfo);
  const showActionRail = useSettingsStore((s) => s.showActionRail);
  const loadInitialData = useDocumentStore((s) => s.loadInitialData);
  const isLoading = useDocumentStore((s) => s.isLoading);

  useEffect(() => {
    // 0. Apply appearance settings & sync dialog preferences
    applyAppearanceDOM();
    const currentSettings = useSettingsStore.getState();
    const skipDel = currentSettings.skipDeleteConfirmation ?? false;
    const skipRen = currentSettings.skipRenameConfirmation ?? false;
    useWorkspaceStore.setState({
      skipDeleteConfirmation: skipDel,
      skipRenameConfirmation: skipRen,
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('noether_skip_delete_confirmation', skipDel ? 'true' : 'false');
      localStorage.setItem('noether_skip_rename_confirmation', skipRen ? 'true' : 'false');
    }

    // 1. Subscribe to SQLite database status
    const unsubDb = dbAdapter.onStatusChange((isActive) => {
      useWorkspaceStore.getState().setIsDatabaseActive(isActive);
    });


    // 2. External Vault files changed listener (Git pulls, external edits, sync)
    let syncTimeout: any = null;
    const unsubFiles = platform.onVaultFilesChanged(() => {
      // Suppress full vault reload storm when the change was initiated internally by Noether
      if (platform.isRecentInternalWrite()) {
        return;
      }
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(async () => {
        try {
          await loadInitialData({ showLoading: false });
        } catch (e) {
          console.error('[AppShell] External files sync error:', e);
        }
      }, 600);
    });

    // 3. Initialize Vault folder config, SQLite and load workspace
    initVaultInfo()
      .then(() => dbAdapter.init())
      .catch((err) => {
        console.error('[AppShell] Vault/DB initialization error:', err);
      })
      .finally(() => {
        loadInitialData();
      });

    const unsubVault = platform.onVaultChanged(async (data) => {
      // If the current window state has already updated to the new Vault path, do not reload
      const currentPath = useWorkspaceStore.getState().vaultPath;
      if (currentPath && data?.path && currentPath.toLowerCase() === data.path.toLowerCase()) {
        return;
      }
      // Reload window to start completely fresh for the new Vault
      window.location.reload();
    });

    // 4. Cross-window communication listener (e.g. opening tabs from Settings window)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'noether_open_extension_doc' && e.newValue) {
        try {
          const { extensionId, title } = JSON.parse(e.newValue);
          if (extensionId) {
            useWorkspaceStore.getState().openExtensionDocTab(extensionId, title);
          }
        } catch (err) {
          console.error('Error handling cross-window navigation event', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // 5. User activity heartbeat reporter (reports activity to keep-awake manager)
    let lastActivityReport = 0;
    const reportUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityReport > 15000) {
        lastActivityReport = now;
        platform.notifyUserActivity();
      }
    };
    window.addEventListener('keydown', reportUserActivity, { passive: true });
    window.addEventListener('pointerdown', reportUserActivity, { passive: true });

    return () => {
      unsubDb();
      if (unsubFiles) unsubFiles();
      if (unsubVault) unsubVault();
      if (syncTimeout) clearTimeout(syncTimeout);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('keydown', reportUserActivity);
      window.removeEventListener('pointerdown', reportUserActivity);
    };
  }, [initVaultInfo, loadInitialData]);

  const folderPickerPrompt = useWorkspaceStore((s) => s.folderPickerPrompt);
  const cancelFolderSelection = useWorkspaceStore((s) => s.cancelFolderSelection);

  // Folder Picker cursor tooltip using native Noether dragTooltipManager
  useEffect(() => {
    if (!folderPickerPrompt?.isOpen) {
      dragTooltipManager.hide();
      return;
    }

    const defaultTitle = folderPickerPrompt.title || 'Click on a folder';
    const subtitle = 'Right-click to cancel';

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      // Dynamic folder picker title: when hovering over a selectable folder, show its name
      // otherwise fall back to prompt default title (e.g. 'Click on a folder for attachments')
      const targetEl = e.target instanceof Element ? e.target : (e.target as Node | null)?.parentElement;
      const folderEl = targetEl?.closest?.('[data-folder-picker-target="true"]') as HTMLElement | null;
      const hoveredFolderName = folderEl?.getAttribute('data-folder-name') || null;
      const currentTitle = hoveredFolderName || defaultTitle;

      dragTooltipManager.show(currentTitle, subtitle, FOLDER_SVG, e.clientX + 12, e.clientY + 12);
    };

    const handleCancel = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      dragTooltipManager.hide();
      cancelFolderSelection();
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 2) {
        handleCancel(e);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel(e);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('contextmenu', handleCancel, true);
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      dragTooltipManager.hide();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('contextmenu', handleCancel, true);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [folderPickerPrompt?.isOpen, folderPickerPrompt?.title, cancelFolderSelection]);

  if (isLoading) {
    return (
      <div
        style={{ background: 'var(--noether-bg-main)', color: 'var(--noether-text-muted)' }}
        className="w-full h-full flex flex-col items-center justify-center select-none font-sans"
      >
        <div className="mb-4">
          <NoetherLogoIcon size={36} className="animate-pulse text-[var(--noether-accent)]" />
        </div>
        <div className="text-sm font-medium text-[var(--noether-text-primary)]">Initializing Noether...</div>
        <div className="text-xs text-[var(--noether-text-muted)] mt-1">Booting SQLite relational store & Modular Extensions</div>
      </div>
    );
  }

  return (
    <AppProvider app={appInstance}>
      <div
        style={{ background: 'var(--noether-bg-app)', color: 'var(--noether-text-secondary)' }}
        className="noether-app-shell w-full h-full flex flex-col select-none overflow-hidden font-sans"
      >
        <WindowTitleSync />
        {/* Top Window Bar */}
        <WindowHeader />

        {/* Main 3-Column Workspace Area */}
        <div
          style={{
            background: isLeftSidebarOpen
              ? 'var(--noether-bg-sidebar-gradient, var(--noether-bg-sidebar))'
              : 'var(--noether-bg-ribbon, var(--noether-bg-sidebar))',
          }}
          className="noether-workspace-layout flex-1 flex min-h-0 overflow-hidden relative"
        >
          {/* Left Action Rail (Slim) */}
          {showActionRail && <ActionRail />}

          {/* Left Collapsible Sidebar */}
          {isLeftSidebarOpen && <LeftSidebar />}

          {/* Dynamic Center Workspace Viewport */}
          <MainViewport />

          {/* Right Collapsible Sidebar */}
          {isRightSidebarOpen && <RightSidebar />}

          {/* Bottom-Right Condensed Status Bar */}
          <StatusBar />
        </div>

        {/* Global Interactive Modals, Dialogs, Context Menu & Tooltips */}
        <React.Suspense fallback={null}>
          <CommandPalette />
          <DynamicModalHost />
          <SettingsModal />
          <VaultModal />
          <HelpModal />
          <ConfirmModal />
          <PromptModal />
          <ImageLightboxModal />
          <UpdateModal />
        </React.Suspense>

        <ToastNotification />
        <ContextMenuRenderer />
        <TooltipProvider />

        {/* Global Extension Portal Overlay (HUDs, floating canvas tools, ambient timers) */}
        <ExtensionPortalSlotHost
          slot="workspace:root"
          context={{ app: appInstance }}
          className="absolute inset-0 pointer-events-none z-40 overflow-hidden"
        />
      </div>
    </AppProvider>
  );
});


