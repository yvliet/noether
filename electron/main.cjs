process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');
app.commandLine.appendSwitch('disable-pinch');
if (process.platform === 'win32') app.setAppUserModelId('com.flint.desktop');

let mainWindow;

// User Config for Vault Directory Management
const configPath = path.join(app.getPath('userData'), 'flint-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  const defaultVault = path.join(app.getPath('documents'), 'Flint Hearth');
  return {
    currentVaultPath: defaultVault,
    recentVaults: [{ path: defaultVault, name: 'Flint Hearth', lastOpened: Date.now() }],
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

let appConfig = loadConfig();

function getVaultDbPath(vaultPath) {
  const targetVault = vaultPath || appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
  const flintDir = path.join(targetVault, '.flint');
  if (!fs.existsSync(flintDir)) {
    fs.mkdirSync(flintDir, { recursive: true });
  }
  return path.join(flintDir, 'flint.sqlite');
}

// Ensure current vault directory exists
if (!fs.existsSync(appConfig.currentVaultPath)) {
  try {
    fs.mkdirSync(appConfig.currentVaultPath, { recursive: true });
  } catch (e) {}
}

let vaultWatcher = null;
let vaultWatcherTimeout = null;

function setupVaultWatcher(vaultPath) {
  if (vaultWatcher) {
    try {
      vaultWatcher.close();
    } catch (e) {}
    vaultWatcher = null;
  }

  if (!vaultPath || !fs.existsSync(vaultPath)) return;

  try {
    vaultWatcher = fs.watch(vaultPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const normalized = filename.replace(/\\/g, '/');
      // Ignore internal .flint directory, .git, and hidden dotfiles
      if (normalized.startsWith('.flint') || normalized.startsWith('.') || normalized.includes('/.')) return;

      if (vaultWatcherTimeout) clearTimeout(vaultWatcherTimeout);
      vaultWatcherTimeout = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
          mainWindow.webContents.send('vault-files-changed');
        }
      }, 500);
    });
  } catch (e) {
    console.warn('[Flint Watcher] Could not setup fs.watch on vault:', e);
  }
}

setupVaultWatcher(appConfig.currentVaultPath);

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function loadApp(window) {
  const devUrl = 'http://127.0.0.1:5173';
  let retries = 30;

  while (retries > 0) {
    const isUp = await checkUrl(devUrl);
    if (isUp) {
      console.log('[Flint Electron] Connected to Vite dev server at', devUrl);
      window.loadURL(devUrl);
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
    retries--;
  }

  // Fallback to built dist file
  console.log('[Flint Electron] Loading production build fallback');
  window.loadFile(path.join(__dirname, '../dist/index.html'));
}

let vaultWindow = null;
let settingsWindow = null;

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  const currentVaultName = path.basename(appConfig.currentVaultPath || '') || 'Flint Hearth';

  settingsWindow = new BrowserWindow({
    width: 960,
    height: 650,
    minWidth: 800,
    minHeight: 520,
    frame: false,
    backgroundColor: '#181818',
    icon: path.join(__dirname, 'assets', process.platform === 'darwin' ? 'icon.icns' : 'icon.png'),
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    title: `Settings﹕${currentVaultName}﹕Flint`,
  });

  attachWindowEvents(settingsWindow);

  const devUrl = 'http://127.0.0.1:5173?window=settings';
  checkUrl('http://127.0.0.1:5173').then((isUp) => {
    if (isUp) {
      settingsWindow.loadURL(devUrl);
    } else {
      settingsWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { window: 'settings' } });
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createVaultWindow() {
  if (vaultWindow && !vaultWindow.isDestroyed()) {
    vaultWindow.focus();
    return;
  }

  vaultWindow = new BrowserWindow({
    width: 820,
    height: 560,
    minWidth: 720,
    minHeight: 480,
    frame: false,
    backgroundColor: '#181818',
    icon: path.join(__dirname, 'assets', process.platform === 'darwin' ? 'icon.icns' : 'icon.png'),
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    title: 'Flint Hearth Switcher',
  });

  attachWindowEvents(vaultWindow);

  const devUrl = 'http://127.0.0.1:5173?window=vault-switcher';
  checkUrl('http://127.0.0.1:5173').then((isUp) => {
    if (isUp) {
      vaultWindow.loadURL(devUrl);
    } else {
      vaultWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { window: 'vault-switcher' } });
    }
  });

  vaultWindow.on('closed', () => {
    vaultWindow = null;
  });
}

function attachWindowEvents(win) {
  if (!win) return;
  const sendMaximizedState = () => {
    if (!win.isDestroyed() && win.webContents) {
      win.webContents.send('window-maximized-change', win.isMaximized());
    }
  };
  win.on('maximize', sendMaximizedState);
  win.on('unmaximize', sendMaximizedState);
  win.on('restore', sendMaximizedState);
  win.on('resized', sendMaximizedState);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Frameless Obsidian dark window
    backgroundColor: '#181818',
    icon: path.join(__dirname, 'assets', process.platform === 'darwin' ? 'icon.icns' : 'icon.png'),
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    title: 'Flint',
  });

  attachWindowEvents(mainWindow);
  mainWindow.maximize();

  // Pipe renderer console messages to terminal
  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log('[Renderer]', message);
  });

  loadApp(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpc() {
  // Window frame controls (sender window aware)
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) win.minimize();
  });

  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) win.close();
  });

  ipcMain.on('window-set-title', (event, title) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win && !win.isDestroyed() && typeof title === 'string') {
      win.setTitle(title);
    }
  });

  ipcMain.handle('is-window-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    return win ? win.isMaximized() : false;
  });

  ipcMain.on('is-window-maximized-sync', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    event.returnValue = win ? win.isMaximized() : false;
  });

  ipcMain.handle('open-vault-window', () => {
    createVaultWindow();
    return { success: true };
  });
  ipcMain.handle('open-hearth-window', () => {
    createVaultWindow();
    return { success: true };
  });

  ipcMain.handle('close-vault-window', () => {
    if (vaultWindow && !vaultWindow.isDestroyed()) {
      vaultWindow.close();
    }
    return { success: true };
  });
  ipcMain.handle('close-hearth-window', () => {
    if (vaultWindow && !vaultWindow.isDestroyed()) {
      vaultWindow.close();
    }
    return { success: true };
  });

  ipcMain.handle('open-settings-window', () => {
    createSettingsWindow();
    return { success: true };
  });

  ipcMain.handle('close-settings-window', () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
    }
    return { success: true };
  });  // Hearth & Vault Management IPC Handlers
  const handleGetCurrentHearth = async () => {
    const vaultPath = appConfig.currentVaultPath;
    const vaultName = path.basename(vaultPath) || 'Flint Hearth';
    return { path: vaultPath, name: vaultName, recentHearths: appConfig.recentVaults || [], recentVaults: appConfig.recentVaults || [] };
  };

  ipcMain.handle('get-current-hearth', handleGetCurrentHearth);
  ipcMain.handle('get-current-vault', handleGetCurrentHearth);

  function notifyVaultChanged(vaultData) {
    if (vaultData?.path) {
      setupVaultWatcher(vaultData.path);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hearth-changed', vaultData);
      mainWindow.webContents.send('vault-changed', vaultData);
      mainWindow.focus();
    }
    if (vaultWindow && !vaultWindow.isDestroyed()) {
      vaultWindow.close();
    }
  }

  const handleSelectHearthFolder = async () => {
    const parentWin = vaultWindow && !vaultWindow.isDestroyed() ? vaultWindow : mainWindow;
    if (!parentWin) return { canceled: true };
    const result = await dialog.showOpenDialog(parentWin, {
      title: 'Select Hearth Folder',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: appConfig.currentVaultPath || app.getPath('documents'),
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const chosenPath = result.filePaths[0];
    const chosenName = path.basename(chosenPath) || 'Hearth';

    appConfig.currentVaultPath = chosenPath;
    const recents = (appConfig.recentVaults || []).filter((v) => v.path !== chosenPath);
    recents.unshift({ path: chosenPath, name: chosenName, lastOpened: Date.now() });
    appConfig.recentVaults = recents.slice(0, 10);
    saveConfig(appConfig);

    const data = { canceled: false, path: chosenPath, name: chosenName, recentHearths: appConfig.recentVaults, recentVaults: appConfig.recentVaults };
    notifyVaultChanged(data);
    return data;
  };

  ipcMain.handle('select-hearth-folder', handleSelectHearthFolder);
  ipcMain.handle('select-vault-folder', handleSelectHearthFolder);

  const handleSetCurrentHearth = async (event, vaultPath) => {
    if (!fs.existsSync(vaultPath)) {
      try {
        fs.mkdirSync(vaultPath, { recursive: true });
      } catch (e) {}
    }
    const chosenName = path.basename(vaultPath) || 'Hearth';
    appConfig.currentVaultPath = vaultPath;
    const recents = (appConfig.recentVaults || []).filter((v) => v.path !== vaultPath);
    recents.unshift({ path: vaultPath, name: chosenName, lastOpened: Date.now() });
    appConfig.recentVaults = recents.slice(0, 10);
    saveConfig(appConfig);
    const data = { success: true, path: vaultPath, name: chosenName, recentHearths: appConfig.recentVaults, recentVaults: appConfig.recentVaults };
    notifyVaultChanged(data);
    return data;
  };

  ipcMain.handle('set-current-hearth', handleSetCurrentHearth);
  ipcMain.handle('set-current-vault', handleSetCurrentHearth);

  ipcMain.handle('select-parent-folder', async () => {
    const parentWin = vaultWindow && !vaultWindow.isDestroyed() ? vaultWindow : mainWindow;
    if (!parentWin) return { canceled: true };
    const result = await dialog.showOpenDialog(parentWin, {
      title: 'Select Folder for New Hearth',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: app.getPath('documents'),
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }
    return { canceled: false, path: result.filePaths[0] };
  });

  const handleCreateNewHearth = async (event, { name, parentPath }) => {
    try {
      const cleanName = (name || 'New Hearth').replace(/[/\\?%*:|"<>]/g, '_').trim();
      const baseDir = parentPath || app.getPath('documents');
      const newVaultPath = path.join(baseDir, cleanName);

      if (!fs.existsSync(newVaultPath)) {
        fs.mkdirSync(newVaultPath, { recursive: true });
      }

      appConfig.currentVaultPath = newVaultPath;
      const recents = (appConfig.recentVaults || []).filter((v) => v.path !== newVaultPath);
      recents.unshift({ path: newVaultPath, name: cleanName, lastOpened: Date.now() });
      appConfig.recentVaults = recents.slice(0, 10);
      saveConfig(appConfig);

      const data = { success: true, path: newVaultPath, name: cleanName, recentHearths: appConfig.recentVaults, recentVaults: appConfig.recentVaults };
      notifyVaultChanged(data);
      return data;
    } catch (err) {
      console.error('[Flint Hearth] Error creating new hearth:', err);
      return { success: false, error: err.message };
    }
  };

  ipcMain.handle('create-new-hearth', handleCreateNewHearth);
  ipcMain.handle('create-new-vault', handleCreateNewHearth);

  const handleRenameHearth = async (event, { targetPath, newName }) => {
    try {
      const cleanName = (newName || '').replace(/[/\\?%*:|"<>]/g, '_').trim();
      if (!cleanName) return { success: false, error: 'Name cannot be empty' };

      const target = path.resolve(targetPath || appConfig.currentVaultPath);
      let finalPath = target;

      if (target && fs.existsSync(target)) {
        const parentDir = path.dirname(target);
        const targetNewPath = path.resolve(parentDir, cleanName);

        if (targetNewPath !== target) {
          const isCaseOnlyRename = targetNewPath.toLowerCase() === target.toLowerCase();

          if (!isCaseOnlyRename && fs.existsSync(targetNewPath)) {
            return { success: false, error: `A folder named "${cleanName}" already exists at this location.` };
          }

          // Temporarily teardown file watcher and flush debounce timeout to release Windows OS handles
          if (vaultWatcherTimeout) {
            clearTimeout(vaultWatcherTimeout);
            vaultWatcherTimeout = null;
          }
          if (vaultWatcher) {
            try {
              vaultWatcher.close();
            } catch (e) {}
            vaultWatcher = null;
          }

          // Allow OS handles (like Windows ReadDirectoryChangesW) to be freed by the event loop
          await new Promise((r) => setTimeout(r, 120));

          let renamedOnDisk = false;
          let lastError = null;

          // If Windows case-only rename (e.g. "my hearth" -> "My Hearth"), use a temporary intermediary
          if (isCaseOnlyRename) {
            const tempPath = path.join(parentDir, `.__flint_rename_tmp_${Date.now()}__`);
            for (let attempt = 0; attempt < 5; attempt++) {
              try {
                fs.renameSync(target, tempPath);
                fs.renameSync(tempPath, targetNewPath);
                finalPath = targetNewPath;
                renamedOnDisk = true;
                break;
              } catch (renameErr) {
                lastError = renameErr;
                if (fs.existsSync(tempPath) && !fs.existsSync(target)) {
                  try { fs.renameSync(tempPath, target); } catch (_) {}
                }
                await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
              }
            }
          } else {
            for (let attempt = 0; attempt < 5; attempt++) {
              try {
                fs.renameSync(target, targetNewPath);
                finalPath = targetNewPath;
                renamedOnDisk = true;
                break;
              } catch (renameErr) {
                lastError = renameErr;
                await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
              }
            }
          }

          if (!renamedOnDisk) {
            console.warn('[Flint Hearth] Could not physically rename directory on disk:', lastError);
            setupVaultWatcher(appConfig.currentVaultPath);
            return {
              success: false,
              error: `Cannot rename Hearth folder on disk (${lastError?.message || 'File locked by OS'}). Please try again.`,
            };
          }
        }
      }

      // Update appConfig
      const isCurrent = appConfig.currentVaultPath && (
        path.resolve(appConfig.currentVaultPath).toLowerCase() === target.toLowerCase() ||
        path.resolve(appConfig.currentVaultPath).toLowerCase() === finalPath.toLowerCase()
      );

      if (isCurrent) {
        appConfig.currentVaultPath = finalPath;
      }

      let updatedRecents = (appConfig.recentVaults || []).map((v) => {
        if (v.path && path.resolve(v.path).toLowerCase() === target.toLowerCase()) {
          return { ...v, path: finalPath, name: cleanName };
        }
        return v;
      });

      if (!updatedRecents.some((v) => path.resolve(v.path).toLowerCase() === finalPath.toLowerCase())) {
        updatedRecents.unshift({ path: finalPath, name: cleanName, lastOpened: Date.now() });
      }

      appConfig.recentVaults = updatedRecents;
      saveConfig(appConfig);

      // Re-arm watcher on active path
      setupVaultWatcher(appConfig.currentVaultPath);

      const data = {
        success: true,
        path: finalPath,
        name: cleanName,
        recentHearths: appConfig.recentVaults,
        recentVaults: appConfig.recentVaults,
      };

      notifyVaultChanged(data);
      return data;
    } catch (err) {
      console.error('[Flint Hearth] Error renaming hearth:', err);
      setupVaultWatcher(appConfig.currentVaultPath);
      return { success: false, error: err.message };
    }
  };

  ipcMain.handle('rename-hearth', handleRenameHearth);
  ipcMain.handle('rename-vault', handleRenameHearth);

  const handleRemoveRecentHearth = async (event, targetPath) => {
    try {
      appConfig.recentVaults = (appConfig.recentVaults || []).filter((v) => v.path !== targetPath);
      saveConfig(appConfig);
      return { success: true, recentHearths: appConfig.recentVaults, recentVaults: appConfig.recentVaults };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  ipcMain.handle('remove-recent-hearth', handleRemoveRecentHearth);
  ipcMain.handle('remove-recent-vault', handleRemoveRecentHearth);

  const handleOpenHearthInExplorer = async (event, vaultPath) => {
    const target = vaultPath || appConfig.currentVaultPath;
    if (fs.existsSync(target)) {
      shell.openPath(target);
      return { success: true };
    }
    return { success: false, error: 'Folder does not exist' };
  };

  ipcMain.handle('open-hearth-in-explorer', handleOpenHearthInExplorer);
  ipcMain.handle('open-vault-in-explorer', handleOpenHearthInExplorer);

  ipcMain.handle('scan-hearth-files', async (event, customHearthPath) => {
    try {
      const targetVault = customHearthPath || appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      if (!fs.existsSync(targetVault)) {
        fs.mkdirSync(targetVault, { recursive: true });
      }
      return scanVaultDirectory(targetVault, targetVault);
    } catch (err) {
      console.error('[Flint Hearth] Error scanning hearth files:', err);
      return [];
    }
  });

  ipcMain.handle('save-database', async (event, payload) => {
    try {
      let bytes = payload;
      let targetPath = null;
      if (payload && (payload.bytes || payload.vaultPath)) {
        bytes = payload.bytes;
        targetPath = payload.vaultPath;
      }
      const dbFile = getVaultDbPath(targetPath || appConfig.currentVaultPath);
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(dbFile, buffer);
      return { success: true, path: dbFile };
    } catch (err) {
      console.error('[Flint DB] Error saving sqlite file to vault disk:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('load-database', async (event, customVaultPath) => {
    try {
      const dbFile = getVaultDbPath(customVaultPath || appConfig.currentVaultPath);
      if (fs.existsSync(dbFile)) {
        const buffer = fs.readFileSync(dbFile);
        return buffer;
      }
      return null;
    } catch (err) {
      console.error('[Flint DB] Error loading sqlite file from disk:', err);
      return null;
    }
  });

  function scanVaultDirectory(dir, baseDir = dir) {
    const items = [];
    if (!fs.existsSync(dir)) return items;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          items.push({
            relativePath: relPath,
            name: entry.name,
            isFolder: true,
            mtime: fs.statSync(fullPath).mtimeMs,
          });
          items.push(...scanVaultDirectory(fullPath, baseDir));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          const title = entry.name.replace(/\.md$/i, '');
          const stat = fs.statSync(fullPath);
          let content = '';
          try {
            content = fs.readFileSync(fullPath, 'utf8');
          } catch (e) {}
          items.push({
            relativePath: relPath,
            name: title,
            isFolder: false,
            mtime: stat.mtimeMs,
            content: content,
          });
        }
      }
    } catch (e) {
      console.error('[Flint Electron] Scan vault error:', e);
    }
    return items;
  }

  ipcMain.handle('scan-vault-files', async (event, customVaultPath) => {
    try {
      const targetVault = customVaultPath || appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      if (!fs.existsSync(targetVault)) {
        fs.mkdirSync(targetVault, { recursive: true });
      }
      return scanVaultDirectory(targetVault, targetVault);
    } catch (err) {
      console.error('[Flint Hearth] Error scanning hearth files:', err);
      return [];
    }
  });

  ipcMain.handle('save-markdown-file', async (event, { filename, content, relativePath, vaultPath }) => {
    try {
      const targetVault = vaultPath || appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      if (!fs.existsSync(targetVault)) {
        fs.mkdirSync(targetVault, { recursive: true });
      }
      let filePath;
      if (relativePath) {
        const cleanRel = relativePath.replace(/\\/g, '/');
        const fileWithExt = cleanRel.toLowerCase().endsWith('.md') ? cleanRel : cleanRel + '.md';
        filePath = path.join(targetVault, fileWithExt);
        const parentDir = path.dirname(filePath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
      } else {
        const safeFilename = (filename || 'Untitled').replace(/[/\\?%*:|"<>]/g, '_') + '.md';
        filePath = path.join(targetVault, safeFilename);
      }
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, path: filePath };
    } catch (err) {
      console.error('[Flint Hearth] Error saving file:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-markdown-file', async (event, payload) => {
    try {
      const filenameOrPath = typeof payload === 'string' ? payload : payload?.filenameOrPath;
      const vaultPath = typeof payload === 'object' ? payload?.vaultPath : null;
      const targetVault = vaultPath || appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      const cleanRel = (filenameOrPath || 'Untitled').replace(/\\/g, '/');
      const fileWithExt = cleanRel.toLowerCase().endsWith('.md') ? cleanRel : cleanRel + '.md';
      const filePath = path.join(targetVault, fileWithExt);
      if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      } else {
        const directPath = path.join(targetVault, cleanRel);
        if (fs.existsSync(directPath)) {
          if (fs.statSync(directPath).isDirectory()) {
            fs.rmSync(directPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(directPath);
          }
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Trash Directory IPC Handlers
  ipcMain.handle('open-trash-folder', async () => {
    try {
      const targetVault = appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      const trashDir = path.join(targetVault, '.trash');
      if (!fs.existsSync(trashDir)) {
        fs.mkdirSync(trashDir, { recursive: true });
      }
      shell.openPath(trashDir);
      return { success: true, path: trashDir };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-trash-file', async (event, { filename, content, relativePath }) => {
    try {
      const targetVault = appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      const trashDir = path.join(targetVault, '.trash');
      if (!fs.existsSync(trashDir)) {
        fs.mkdirSync(trashDir, { recursive: true });
      }
      let filePath;
      if (relativePath) {
        const cleanRel = relativePath.replace(/\\/g, '/');
        const fileWithExt = cleanRel.toLowerCase().endsWith('.md') ? cleanRel : cleanRel + '.md';
        filePath = path.join(trashDir, fileWithExt);
        const parentDir = path.dirname(filePath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
      } else {
        const safeFilename = (filename || 'Untitled').replace(/[/\\?%*:|"<>]/g, '_') + '.md';
        filePath = path.join(trashDir, safeFilename);
      }
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, path: filePath };
    } catch (err) {
      console.error('[Flint Hearth] Error saving trash file:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-trash-file', async (event, filenameOrPath) => {
    try {
      const targetVault = appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      const trashDir = path.join(targetVault, '.trash');
      const cleanRel = (filenameOrPath || 'Untitled').replace(/\\/g, '/');
      const fileWithExt = cleanRel.toLowerCase().endsWith('.md') ? cleanRel : cleanRel + '.md';
      const filePath = path.join(trashDir, fileWithExt);
      if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      } else {
        const directPath = path.join(trashDir, cleanRel);
        if (fs.existsSync(directPath)) {
          if (fs.statSync(directPath).isDirectory()) {
            fs.rmSync(directPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(directPath);
          }
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('empty-trash-folder', async () => {
    try {
      const targetVault = appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      const trashDir = path.join(targetVault, '.trash');
      if (fs.existsSync(trashDir)) {
        fs.rmSync(trashDir, { recursive: true, force: true });
        fs.mkdirSync(trashDir, { recursive: true });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('rename-markdown-file', async (event, { oldFilename, newFilename, oldRelativePath, newRelativePath }) => {
    try {
      const targetVault = appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      let oldPath, newPath;

      if (oldRelativePath && newRelativePath) {
        const oldClean = oldRelativePath.replace(/\\/g, '/');
        const newClean = newRelativePath.replace(/\\/g, '/');
        oldPath = path.join(targetVault, oldClean.toLowerCase().endsWith('.md') ? oldClean : oldClean + '.md');
        newPath = path.join(targetVault, newClean.toLowerCase().endsWith('.md') ? newClean : newClean + '.md');
      } else {
        const oldSafe = (oldFilename || 'Untitled').replace(/[/\\?%*:|"<>]/g, '_') + '.md';
        const newSafe = (newFilename || 'Untitled').replace(/[/\\?%*:|"<>]/g, '_') + '.md';
        oldPath = path.join(targetVault, oldSafe);
        newPath = path.join(targetVault, newSafe);
      }

      const parentDir = path.dirname(newPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Community Plugin IPC Handlers
  ipcMain.handle('open-plugins-folder', async () => {
    const targetVault = appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
    const pluginsDir = path.join(targetVault, '.flint', 'plugins');
    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
    }
    shell.openPath(pluginsDir);
    return { success: true, path: pluginsDir };
  });

  ipcMain.handle('list-installed-plugins', async () => {
    try {
      const targetVault = appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      const pluginsDir = path.join(targetVault, '.flint', 'plugins');
      if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
        return [];
      }
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
      const plugins = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const manifestPath = path.join(pluginsDir, entry.name, 'manifest.json');
          if (fs.existsSync(manifestPath)) {
            try {
              const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              plugins.push({
                id: manifest.id || entry.name,
                name: manifest.name || entry.name,
                version: manifest.version || '1.0.0',
                description: manifest.description || '',
                author: manifest.author || '',
                folder: entry.name,
                isCore: false,
              });
            } catch (e) {
              console.warn('[Flint Plugins] Failed to parse manifest in', entry.name, e);
            }
          }
        }
      }
      return plugins;
    } catch (err) {
      console.error('[Flint Plugins] Error listing plugins:', err);
      return [];
    }
  });

  ipcMain.handle('read-plugin-bundle', async (event, pluginFolder) => {
    try {
      const targetVault = appConfig.currentVaultPath || path.join(app.getPath('documents'), 'Flint Hearth');
      const pluginDir = path.join(targetVault, '.flint', 'plugins', pluginFolder);
      const mainJsPath = path.join(pluginDir, 'main.js');
      const stylesCssPath = path.join(pluginDir, 'styles.css');

      let jsCode = '';
      let cssCode = '';
      if (fs.existsSync(mainJsPath)) {
        jsCode = fs.readFileSync(mainJsPath, 'utf8');
      }
      if (fs.existsSync(stylesCssPath)) {
        cssCode = fs.readFileSync(stylesCssPath, 'utf8');
      }
      return { success: true, jsCode, cssCode };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// Register all IPC handlers immediately
registerIpc();

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
