import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { appInstance, bindFlintStores } from '@/core/app/FlintApp';
import { registerAllCoreExtensions } from '@/extensions/core';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useContextMenuStore } from '@/store/contextMenuStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFileHistoryStore } from '@/store/fileHistoryStore';

// Bind all core stores to the app singleton
bindFlintStores({
  workspace: useWorkspaceStore,
  document: useDocumentStore,
  contextMenu: useContextMenuStore,
  settings: useSettingsStore,
  fileHistory: useFileHistoryStore,
});

// Register and initialize core extensions across all window modes
registerAllCoreExtensions(appInstance);
appInstance.extensions.init();

if (typeof window !== 'undefined') {
  (window as any).appInstance = appInstance;
  (window as any).__flintStores = {
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
