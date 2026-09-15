import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { appInstance, bindNoetherStores } from '@/core/app/NoetherApp';
import { registerAllCoreExtensions } from '@/extensions/core';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useContextMenuStore } from '@/store/contextMenuStore';
import { useSettingsStore, applyAppearanceDOM } from '@/store/settingsStore';
import { useFileHistoryStore } from '@/store/fileHistoryStore';

import { dbAdapter } from '@/lib/db/adapter';

// Bind all core stores to the app singleton
bindNoetherStores({
  workspace: useWorkspaceStore,
  document: useDocumentStore,
  contextMenu: useContextMenuStore,
  settings: useSettingsStore,
  fileHistory: useFileHistoryStore,
});

// Apply theme tokens and appearance settings to DOM root across all window modes
applyAppearanceDOM();

const isSettingsWindow = typeof window !== 'undefined' && (
  (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label === 'settings' ||
  (window as any).__TAURI_INTERNALS__?.metadata?.currentWebview?.label === 'settings' ||
  (window as any).__NOETHER_WINDOW_MODE__ === 'settings' ||
  window.location.search.includes('window=settings') ||
  window.location.hash.includes('window=settings')
);

// Pre-warm native SQLite connection and Vault info only for main workspace window
if (!isSettingsWindow) {
  dbAdapter.init().catch((err) => console.error('[Main] Pre-warm DB error:', err));
  useWorkspaceStore.getState().initVaultInfo().catch((err) => console.error('[Main] Pre-warm Vault info error:', err));
}

// Register and initialize core extensions across all window modes
registerAllCoreExtensions(appInstance);
appInstance.extensions.init();

if (typeof window !== 'undefined') {
  (window as any).appInstance = appInstance;
  (window as any).__noetherStores = {
    documentStore: useDocumentStore,
    fileHistoryStore: useFileHistoryStore,
    workspaceStore: useWorkspaceStore,
    settingsStore: useSettingsStore,
  };

  // Suppress default OS / browser context menu globally
  window.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
