import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { appInstance, bindNoetherStores } from '@/core/app/NoetherApp';
import { registerAllCoreExtensions } from '@/extensions/core';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useContextMenuStore } from '@/store/contextMenuStore';
import { useSettingsStore } from '@/store/settingsStore';
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

// Pre-warm native SQLite connection and Vault info concurrently with module evaluation
dbAdapter.init().catch((err) => console.error('[Main] Pre-warm DB error:', err));
useWorkspaceStore.getState().initVaultInfo().catch((err) => console.error('[Main] Pre-warm Vault info error:', err));

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
