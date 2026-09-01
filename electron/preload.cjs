const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Lock visual zoom level limits to disable Chromium window visual pinch zooming
try {
  webFrame.setVisualZoomLevelLimits(1, 1);
} catch (e) {}

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('is-window-maximized'),
  isMaximizedSync: () => {
    try {
      return ipcRenderer.sendSync('is-window-maximized-sync');
    } catch {
      return false;
    }
  },
  onMaximizedChange: (callback) => {
    const listener = (event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window-maximized-change', listener);
    return () => ipcRenderer.removeListener('window-maximized-change', listener);
  },
  // Hearth & Settings window controls
  openHearthWindow: () => ipcRenderer.invoke('open-hearth-window'),
  closeHearthWindow: () => ipcRenderer.invoke('close-hearth-window'),
  openVaultWindow: () => ipcRenderer.invoke('open-hearth-window'),
  closeVaultWindow: () => ipcRenderer.invoke('close-hearth-window'),
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window'),
  closeSettingsWindow: () => ipcRenderer.invoke('close-settings-window'),

  // General-purpose global hotkeys and window controls
  registerGlobalShortcut: (id, shortcut) => ipcRenderer.invoke('register-global-shortcut', id, shortcut),
  unregisterGlobalShortcut: (id) => ipcRenderer.invoke('unregister-global-shortcut', id),
  onGlobalShortcut: (callback) => {
    const listener = (event, id) => callback(id);
    ipcRenderer.on('global-shortcut-activated', listener);
    return () => ipcRenderer.removeListener('global-shortcut-activated', listener);
  },
  focusMainWindow: () => ipcRenderer.invoke('focus-main-window'),

  // Hearth event subscriptions
  onHearthChanged: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('hearth-changed', listener);
    return () => ipcRenderer.removeListener('hearth-changed', listener);
  },
  onVaultChanged: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('hearth-changed', listener);
    return () => ipcRenderer.removeListener('hearth-changed', listener);
  },
  onHearthFilesChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('vault-files-changed', listener);
    return () => ipcRenderer.removeListener('vault-files-changed', listener);
  },
  onVaultFilesChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('vault-files-changed', listener);
    return () => ipcRenderer.removeListener('vault-files-changed', listener);
  },

  // Hearth operations
  getCurrentHearth: () => ipcRenderer.invoke('get-current-hearth'),
  getCurrentVault: () => ipcRenderer.invoke('get-current-hearth'),
  selectHearthFolder: () => ipcRenderer.invoke('select-hearth-folder'),
  selectVaultFolder: () => ipcRenderer.invoke('select-hearth-folder'),
  selectParentFolder: () => ipcRenderer.invoke('select-parent-folder'),
  createNewHearth: (name, parentPath) => ipcRenderer.invoke('create-new-hearth', { name, parentPath }),
  createNewVault: (name, parentPath) => ipcRenderer.invoke('create-new-hearth', { name, parentPath }),
  renameHearth: (targetPath, newName) => ipcRenderer.invoke('rename-hearth', { targetPath, newName }),
  renameVault: (targetPath, newName) => ipcRenderer.invoke('rename-hearth', { targetPath, newName }),
  removeRecentHearth: (hearthPath) => ipcRenderer.invoke('remove-recent-hearth', hearthPath),
  removeRecentVault: (vaultPath) => ipcRenderer.invoke('remove-recent-hearth', vaultPath),
  setCurrentHearth: (hearthPath) => ipcRenderer.invoke('set-current-hearth', hearthPath),
  setCurrentVault: (vaultPath) => ipcRenderer.invoke('set-current-hearth', vaultPath),
  openHearthInExplorer: (hearthPath) => ipcRenderer.invoke('open-hearth-in-explorer', hearthPath),
  openVaultInExplorer: (vaultPath) => ipcRenderer.invoke('open-hearth-in-explorer', vaultPath),
  scanHearthFiles: (customHearthPath) => ipcRenderer.invoke('scan-hearth-files', customHearthPath),
  scanVaultFiles: (customVaultPath) => ipcRenderer.invoke('scan-hearth-files', customVaultPath),
  saveMarkdownFile: (filename, content, relativePath, vaultPath) =>
    ipcRenderer.invoke('save-markdown-file', { filename, content, relativePath, vaultPath }),
  deleteMarkdownFile: (filenameOrPath, vaultPath) =>
    ipcRenderer.invoke('delete-markdown-file', { filenameOrPath, vaultPath }),
  renameMarkdownFile: (oldFilename, newFilename, oldRelativePath, newRelativePath, vaultPath) =>
    ipcRenderer.invoke('rename-markdown-file', { oldFilename, newFilename, oldRelativePath, newRelativePath, vaultPath }),
  openPluginsFolder: () => ipcRenderer.invoke('open-plugins-folder'),
  openTrashFolder: () => ipcRenderer.invoke('open-trash-folder'),
  saveTrashFile: (filename, content, relativePath) =>
    ipcRenderer.invoke('save-trash-file', { filename, content, relativePath }),
  deleteTrashFile: (filenameOrPath) => ipcRenderer.invoke('delete-trash-file', filenameOrPath),
  emptyTrashFolder: () => ipcRenderer.invoke('empty-trash-folder'),
  listInstalledPlugins: () => ipcRenderer.invoke('list-installed-plugins'),
  readPluginBundle: (pluginFolder) => ipcRenderer.invoke('read-plugin-bundle', pluginFolder),
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
  setWindowTitle: (title) => ipcRenderer.send('window-set-title', title),
  isElectron: true,
});


