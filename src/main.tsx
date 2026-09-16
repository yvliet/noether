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

const isAuxiliaryWindow = typeof window !== 'undefined' && (
  (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label === 'settings' ||
  (window as any).__TAURI_INTERNALS__?.metadata?.currentWebview?.label === 'settings' ||
  (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label === 'help' ||
  (window as any).__TAURI_INTERNALS__?.metadata?.currentWebview?.label === 'help' ||
  (window as any).__NOETHER_WINDOW_MODE__ === 'settings' ||
  (window as any).__NOETHER_WINDOW_MODE__ === 'help' ||
  window.location.search.includes('window=settings') ||
  window.location.search.includes('window=help') ||
  window.location.hash.includes('window=settings') ||
  window.location.hash.includes('window=help')
);

// Pre-warm native SQLite connection and Vault info only for main workspace window
if (!isAuxiliaryWindow) {
  dbAdapter.init().catch((err) => console.error('[Main] Pre-warm DB error:', err));
  useWorkspaceStore.getState().initVaultInfo().catch((err) => console.error('[Main] Pre-warm Vault info error:', err));
}

const isHelpWindow = typeof window !== 'undefined' && (
  (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label === 'help' ||
  (window as any).__TAURI_INTERNALS__?.metadata?.currentWebview?.label === 'help' ||
  (window as any).__NOETHER_WINDOW_MODE__ === 'help' ||
  window.location.search.includes('window=help') ||
  window.location.hash.includes('window=help')
);

// Register and initialize core extensions (bypassed in lightweight Help window)
if (!isHelpWindow) {
  registerAllCoreExtensions(appInstance);
  appInstance.extensions.init();
}

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
