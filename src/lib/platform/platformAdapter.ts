import { RecentVaultItem, VaultDiskItem } from '@/types';
import { useWorkspaceStore } from '@/store/workspaceStore';

// Dynamic import helpers for Tauri to avoid crashing in pure browser/electron contexts
let tauriCore: any = null;
let tauriWindow: any = null;
let tauriDialog: any = null;
let tauriEvent: any = null;

async function getTauriModules() {
  if (tauriCore) return { tauriCore, tauriWindow, tauriDialog, tauriEvent };
  try {
    if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
      tauriCore = await import('@tauri-apps/api/core');
      tauriWindow = await import('@tauri-apps/api/window');
      tauriEvent = await import('@tauri-apps/api/event');
      try {
        tauriDialog = await import('@tauri-apps/plugin-dialog');
      } catch (e) {}
    }
  } catch (e) {
    console.warn('[PlatformAdapter] Tauri API modules not available', e);
  }
  return { tauriCore, tauriWindow, tauriDialog, tauriEvent };
}

export interface IPlatformAdapter {
  isTauri(): boolean;
  isElectron(): boolean;
  isDesktop(): boolean;
  isMacOS(): boolean;
  isWindows(): boolean;
  isLinux(): boolean;

  // Window actions
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  startDragging(): Promise<void>;
  isMaximized(): Promise<boolean>;
  onMaximizedChange(callback: (isMaximized: boolean) => void): () => void;
  isMinimized(): Promise<boolean>;
  onMinimizedChange(callback: (isMinimized: boolean) => void): () => void;

  // Multi-window
  openHearthWindow(): Promise<{ success: boolean }>;
  closeHearthWindow(): Promise<{ success: boolean }>;
  openVaultWindow(): Promise<{ success: boolean }>;
  closeVaultWindow(): Promise<{ success: boolean }>;
  openSettingsWindow(): Promise<{ success: boolean }>;
  closeSettingsWindow(): Promise<{ success: boolean }>;
  // Hearth configuration & selection
  getCurrentHearth(): Promise<{ path: string; name: string; recentHearths: RecentVaultItem[] }>;
  selectHearthFolder(): Promise<{ canceled: boolean; path?: string; name?: string; recentHearths?: RecentVaultItem[] }>;
  selectParentFolder(): Promise<{ canceled: boolean; path?: string }>;
  createNewHearth(name: string, parentPath?: string): Promise<{ success: boolean; path: string; name: string; recentHearths: RecentVaultItem[]; error?: string }>;
  renameHearth(targetPath: string, newName: string): Promise<{ success: boolean; path?: string; name?: string; recentHearths: RecentVaultItem[]; error?: string }>;
  removeRecentHearth(hearthPath: string): Promise<{ success: boolean; recentHearths: RecentVaultItem[] }>;
  setCurrentHearth(hearthPath: string): Promise<{ success: boolean; path: string; name: string; recentHearths: RecentVaultItem[] }>;
  openHearthInExplorer(hearthPath?: string): Promise<{ success: boolean; error?: string }>;

  // Vault (Backwards compatibility)
  getCurrentVault(): Promise<{ path: string; name: string; recentVaults: RecentVaultItem[] }>;
  selectVaultFolder(): Promise<{ canceled: boolean; path?: string; name?: string; recentVaults?: RecentVaultItem[] }>;
  createNewVault(name: string, parentPath?: string): Promise<{ success: boolean; path: string; name: string; recentVaults: RecentVaultItem[]; error?: string }>;
  renameVault(targetPath: string, newName: string): Promise<{ success: boolean; path?: string; name?: string; recentVaults: RecentVaultItem[]; error?: string }>;
  removeRecentVault(vaultPath: string): Promise<{ success: boolean; recentVaults: RecentVaultItem[] }>;
  setCurrentVault(vaultPath: string): Promise<{ success: boolean; path: string; name: string; recentVaults: RecentVaultItem[] }>;
  openVaultInExplorer(vaultPath?: string): Promise<{ success: boolean; error?: string }>;

  // File I/O
  scanHearthFiles(customHearthPath?: string): Promise<VaultDiskItem[]>;
  scanVaultFiles(customVaultPath?: string): Promise<VaultDiskItem[]>;
  saveMarkdownFile(filename: string, content: string, relativePath?: string, vaultPath?: string): Promise<{ success: boolean; path?: string; error?: string }>;
  setFileAttributes(filenameOrPath: string, options: { readonly?: boolean; mtime?: number }): Promise<{ success: boolean; path?: string; error?: string }>;
  deleteMarkdownFile(filenameOrPath: string, vaultPath?: string): Promise<{ success: boolean; error?: string }>;
  renameMarkdownFile(oldFilename: string, newFilename: string, oldRelativePath?: string, newRelativePath?: string, vaultPath?: string): Promise<{ success: boolean; error?: string }>;
  openTrashFolder(): Promise<{ success: boolean; path?: string; error?: string }>;
  saveTrashFile(filename: string, content: string, relativePath?: string): Promise<{ success: boolean; path?: string; error?: string }>;
  deleteTrashFile(filenameOrPath: string): Promise<{ success: boolean; error?: string }>;
  emptyTrashFolder(): Promise<{ success: boolean; error?: string }>;

  // Database
  saveDatabase(bytes: Uint8Array, customVaultPath?: string): Promise<{ success: boolean; path?: string; error?: string }>;
  loadDatabase(customVaultPath?: string): Promise<Uint8Array | ArrayBuffer | null>;

  // Internal write echo suppression
  recordInternalWrite(pathOrContent?: string): void;
  isRecentInternalWrite(thresholdMs?: number): boolean;
  isInternalWriteMatch(relativePath: string, hashOrMtime?: string | number): boolean;

  // Events
  onHearthChanged(callback: (hearth: { path: string; name: string; recentHearths: RecentVaultItem[] }) => void): () => void;
  onHearthFilesChanged(callback: () => void): () => void;
  onVaultChanged(callback: (vault: { path: string; name: string; recentVaults: RecentVaultItem[] }) => void): () => void;
  onVaultFilesChanged(callback: () => void): () => void;

  // Extensions / Plugins
  openExtensionsFolder(): Promise<{ success: boolean; path?: string }>;
  listInstalledExtensions(): Promise<Array<{ id: string; name: string; version: string; description: string; author: string; folder: string; isCore: boolean }>>;
  readExtensionBundle(extensionFolder: string): Promise<{ success: boolean; jsCode?: string; cssCode?: string; error?: string }>;
  openPluginsFolder(): Promise<{ success: boolean; path?: string }>;
  listInstalledPlugins(): Promise<Array<{ id: string; name: string; version: string; description: string; author: string; folder: string; isCore: boolean }>>;
  readPluginBundle(pluginFolder: string): Promise<{ success: boolean; jsCode?: string; cssCode?: string; error?: string }>;

  // Zoom
  setZoomFactor(factor: number): void;
  getZoomFactor(): number;

  // Dynamic Icon & Title & Activity
  setAccentIcon(accentColor: string): Promise<void>;
  setWindowTitle(title: string): Promise<void>;
  notifyUserActivity(): Promise<void>;
}

class PlatformAdapterImpl implements IPlatformAdapter {
  private lastInternalWriteTimestamp = 0;
  private pendingInternalWrites = new Map<string, number>();

  constructor() {
    // Auto-bind all prototype methods so destructuring or passing references retains `this`
    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key !== 'constructor' && typeof (this as any)[key] === 'function') {
        (this as any)[key] = (this as any)[key].bind(this);
      }
    }
  }

  public recordInternalWrite(pathOrContent?: string): void {
    this.lastInternalWriteTimestamp = Date.now();
    if (pathOrContent) {
      const clean = pathOrContent.replace(/\\/g, '/').toLowerCase();
      this.pendingInternalWrites.set(clean, Date.now());
      // Clean up entries older than 10 seconds
      if (this.pendingInternalWrites.size > 100) {
        const cutoff = Date.now() - 10000;
        for (const [k, v] of this.pendingInternalWrites.entries()) {
          if (v < cutoff) this.pendingInternalWrites.delete(k);
        }
      }
    }
  }

  public isRecentInternalWrite(thresholdMs = 2500): boolean {
    return Date.now() - this.lastInternalWriteTimestamp < thresholdMs;
  }

  public isInternalWriteMatch(relativePath: string, _hashOrMtime?: string | number): boolean {
    if (!relativePath) return this.isRecentInternalWrite();
    const clean = relativePath.replace(/\\/g, '/').toLowerCase();
    const writeTime = this.pendingInternalWrites.get(clean);
    if (writeTime && Date.now() - writeTime < 4000) {
      this.pendingInternalWrites.delete(clean);
      return true;
    }
    return this.isRecentInternalWrite();
  }

  public isTauri(): boolean {
    return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
  }

  public isElectron(): boolean {
    return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
  }

  public isDesktop(): boolean {
    return this.isTauri() || this.isElectron();
  }

  public isMacOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  }

  public isWindows(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Win/.test(navigator.platform || navigator.userAgent);
  }

  public isLinux(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Linux/.test(navigator.platform || navigator.userAgent);
  }

  // Window Controls
  public async minimize(): Promise<void> {
    if (this.isTauri()) {
      const { tauriCore, tauriWindow } = await getTauriModules();
      if (tauriCore?.invoke) {
        try {
          await tauriCore.invoke('window_minimize');
          return;
        } catch (e) {}
      }
      const current = tauriWindow?.getCurrentWindow();
      await current?.minimize();
      return;
    }
    if (this.isElectron()) {
      window.electronAPI?.minimize();
    }
  }

  public async maximize(): Promise<void> {
    if (this.isTauri()) {
      const { tauriCore, tauriWindow } = await getTauriModules();
      if (tauriCore?.invoke) {
        try {
          await tauriCore.invoke('window_maximize');
          return;
        } catch (e) {}
      }
      const current = tauriWindow?.getCurrentWindow();
      await current?.toggleMaximize();
      return;
    }
    if (this.isElectron()) {
      window.electronAPI?.maximize();
    }
  }

  public async close(): Promise<void> {
    if (this.isTauri()) {
      const { tauriCore, tauriWindow } = await getTauriModules();
      if (tauriCore?.invoke) {
        try {
          await tauriCore.invoke('window_close');
          return;
        } catch (e) {}
      }
      const current = tauriWindow?.getCurrentWindow();
      await current?.close();
      return;
    }
    if (this.isElectron()) {
      window.electronAPI?.close();
    }
  }

  public async startDragging(): Promise<void> {
    if (this.isTauri()) {
      const { tauriCore, tauriWindow } = await getTauriModules();
      if (tauriCore?.invoke) {
        try {
          await tauriCore.invoke('window_start_dragging');
          return;
        } catch (e) {}
      }
      const current = tauriWindow?.getCurrentWindow();
      await current?.startDragging();
    }
  }

  public async isMaximized(): Promise<boolean> {
    if (this.isTauri()) {
      const { tauriCore, tauriWindow } = await getTauriModules();
      if (tauriCore?.invoke) {
        try {
          return Boolean(await tauriCore.invoke('window_is_maximized'));
        } catch (e) {}
      }
      const current = tauriWindow?.getCurrentWindow();
      return (await current?.isMaximized()) || false;
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.isMaximized?.()) || false;
    }
    return false;
  }

  public onMaximizedChange(callback: (isMaximized: boolean) => void): () => void {
    if (this.isTauri()) {
      let unlistenResize: (() => void) | null = null;
      getTauriModules().then(({ tauriWindow }) => {
        const current = tauriWindow?.getCurrentWindow();
        current?.onResized(() => {
          current?.isMaximized().then((max: boolean) => callback(Boolean(max)));
        }).then((unlisten: any) => {
          unlistenResize = unlisten;
        });
      });
      return () => {
        if (unlistenResize) unlistenResize();
      };
    }
    if (this.isElectron()) {
      return window.electronAPI?.onMaximizedChange?.(callback) || (() => {});
    }
    return () => {};
  }

  public async isMinimized(): Promise<boolean> {
    if (this.isTauri()) {
      const { tauriCore, tauriWindow } = await getTauriModules();
      if (tauriCore?.invoke) {
        try {
          return Boolean(await tauriCore.invoke('window_is_minimized'));
        } catch (e) {}
      }
      const current = tauriWindow?.getCurrentWindow();
      return (await current?.isMinimized()) || false;
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.isMinimized?.()) || false;
    }
    if (typeof document !== 'undefined') {
      return document.hidden;
    }
    return false;
  }

  public onMinimizedChange(callback: (isMinimized: boolean) => void): () => void {
    if (this.isTauri()) {
      let unlistenResize: (() => void) | null = null;
      let unlistenVis: (() => void) | null = null;
      getTauriModules().then(({ tauriWindow }) => {
        const current = tauriWindow?.getCurrentWindow();
        current?.onResized(() => {
          current?.isMinimized().then((min: boolean) => callback(Boolean(min)));
        }).then((unlisten: any) => {
          unlistenResize = unlisten;
        });
      });
      const handleVis = () => {
        callback(document.hidden);
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVis);
        unlistenVis = () => document.removeEventListener('visibilitychange', handleVis);
      }
      return () => {
        if (unlistenResize) unlistenResize();
        if (unlistenVis) unlistenVis();
      };
    }
    if (this.isElectron()) {
      const unlistenElectron = window.electronAPI?.onMinimizedChange?.(callback);
      let unlistenVis: (() => void) | null = null;
      const handleVis = () => {
        callback(document.hidden);
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVis);
        unlistenVis = () => document.removeEventListener('visibilitychange', handleVis);
      }
      return () => {
        if (unlistenElectron) unlistenElectron();
        if (unlistenVis) unlistenVis();
      };
    }
    if (typeof document !== 'undefined') {
      const handleVis = () => callback(document.hidden);
      document.addEventListener('visibilitychange', handleVis);
      return () => document.removeEventListener('visibilitychange', handleVis);
    }
    return () => {};
  }

  // Multi-window / Modal management
  public async openHearthWindow(): Promise<{ success: boolean }> {
    if (this.isElectron() && window.electronAPI?.openHearthWindow) {
      return await window.electronAPI.openHearthWindow();
    }
    useWorkspaceStore.getState().setIsHearthModalOpen(true);
    return { success: true };
  }

  public async closeHearthWindow(): Promise<{ success: boolean }> {
    if (this.isElectron() && window.electronAPI?.closeHearthWindow) {
      return await window.electronAPI.closeHearthWindow();
    }
    useWorkspaceStore.getState().setIsHearthModalOpen(false);
    return { success: true };
  }

  public async openVaultWindow(): Promise<{ success: boolean }> {
    return this.openHearthWindow();
  }

  public async closeVaultWindow(): Promise<{ success: boolean }> {
    return this.closeHearthWindow();
  }

  public async openSettingsWindow(): Promise<{ success: boolean }> {
    useWorkspaceStore.getState().setIsSettingsOpen(true);
    return { success: true };
  }

  public async closeSettingsWindow(): Promise<{ success: boolean }> {
    useWorkspaceStore.getState().setIsSettingsOpen(false);
    return { success: true };
  }

  // General-Purpose Global Hotkeys & Window Focus
  public async registerGlobalShortcut(id: string, shortcut: string): Promise<{ success: boolean }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return (await tauriCore?.invoke('register_global_shortcut', { id, shortcut })) || { success: true };
    }
    if (this.isElectron() && window.electronAPI?.registerGlobalShortcut) {
      return await window.electronAPI.registerGlobalShortcut(id, shortcut);
    }
    return { success: true };
  }

  public async unregisterGlobalShortcut(id: string): Promise<{ success: boolean }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return (await tauriCore?.invoke('unregister_global_shortcut', { id })) || { success: true };
    }
    if (this.isElectron() && window.electronAPI?.unregisterGlobalShortcut) {
      return await window.electronAPI.unregisterGlobalShortcut(id);
    }
    return { success: true };
  }

  public onGlobalShortcut(callback: (id: string) => void): () => void {
    if (this.isTauri()) {
      let unlisten: (() => void) | null = null;
      getTauriModules().then(({ tauriEvent }) => {
        tauriEvent?.listen('global-shortcut-activated', (event: any) => {
          const id = typeof event.payload === 'string' ? event.payload : (event.payload?.id || '');
          callback(id);
        }).then((fn: any) => {
          unlisten = fn;
        });
      });
      return () => {
        if (unlisten) unlisten();
      };
    }
    if (this.isElectron() && window.electronAPI?.onGlobalShortcut) {
      return window.electronAPI.onGlobalShortcut(callback);
    }
    return () => {};
  }

  public async focusMainWindow(): Promise<{ success: boolean }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return (await tauriCore?.invoke('focus_main_window')) || { success: true };
    }
    if (this.isElectron() && window.electronAPI?.focusMainWindow) {
      return await window.electronAPI.focusMainWindow();
    }
    window.focus();
    return { success: true };
  }

  // Hearth Management
  public async getCurrentHearth(): Promise<{ path: string; name: string; recentHearths: RecentVaultItem[] }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('get_current_vault');
    }
    if (this.isElectron()) {
      const data = (await window.electronAPI?.getCurrentHearth?.()) || (await window.electronAPI?.getCurrentVault?.()) || { path: '', name: 'Flint Hearth', recentHearths: [] };
      return {
        path: data.path,
        name: data.name || 'Flint Hearth',
        recentHearths: (data as any).recentHearths || (data as any).recentVaults || [],
      };
    }
    return { path: '', name: 'Flint Hearth', recentHearths: [] };
  }

  public async getCurrentVault(): Promise<{ path: string; name: string; recentVaults: RecentVaultItem[] }> {
    const h = await this.getCurrentHearth();
    return { path: h.path, name: h.name, recentVaults: h.recentHearths };
  }

  public async selectHearthFolder(): Promise<{ canceled: boolean; path?: string; name?: string; recentHearths?: RecentVaultItem[] }> {
    if (this.isTauri()) {
      const { tauriCore, tauriDialog } = await getTauriModules();
      if (tauriDialog?.open) {
        const selected = await tauriDialog.open({
          directory: true,
          multiple: false,
          title: 'Select Hearth Folder',
        });
        if (selected && typeof selected === 'string') {
          return await tauriCore?.invoke('set_current_vault', { vaultPath: selected });
        }
        return { canceled: true };
      }
      return await tauriCore?.invoke('select_vault_folder');
    }
    if (this.isElectron()) {
      const res = (await window.electronAPI?.selectHearthFolder?.()) || (await window.electronAPI?.selectVaultFolder?.()) || { canceled: true };
      return {
        canceled: res.canceled,
        path: res.path,
        name: res.name,
        recentHearths: (res as any).recentHearths || (res as any).recentVaults || [],
      };
    }
    return { canceled: true };
  }

  public async selectVaultFolder(): Promise<{ canceled: boolean; path?: string; name?: string; recentVaults?: RecentVaultItem[] }> {
    const res = await this.selectHearthFolder();
    return {
      canceled: res.canceled,
      path: res.path,
      name: res.name,
      recentVaults: res.recentHearths,
    };
  }

  public async createNewHearth(name: string, parentPath?: string): Promise<{ success: boolean; path: string; name: string; recentHearths: RecentVaultItem[]; error?: string }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      const res = await tauriCore?.invoke('create_new_vault', { name, parentPath: parentPath || null });
      return { ...res, recentHearths: res?.recentVaults || [] };
    }
    if (this.isElectron()) {
      const fn = window.electronAPI?.createNewHearth || window.electronAPI?.createNewVault;
      const res = (await fn?.(name, parentPath || '')) || { success: false, path: '', name: '', recentHearths: [], error: 'Unsupported' };
      return {
        success: res.success,
        path: res.path,
        name: res.name,
        recentHearths: (res as any).recentHearths || (res as any).recentVaults || [],
        error: res.error,
      };
    }
    return { success: false, path: '', name: '', recentHearths: [], error: 'Desktop mode only' };
  }

  public async createNewVault(name: string, parentPath?: string): Promise<{ success: boolean; path: string; name: string; recentVaults: RecentVaultItem[]; error?: string }> {
    const res = await this.createNewHearth(name, parentPath);
    return { ...res, recentVaults: res.recentHearths };
  }

  public async renameHearth(targetPath: string, newName: string): Promise<{ success: boolean; path?: string; name?: string; recentHearths: RecentVaultItem[]; error?: string }> {
    if (this.isTauri()) {
      try {
        const { tauriCore } = await getTauriModules();
        let res: any;
        try {
          res = await tauriCore?.invoke('rename_hearth', { targetPath, newName });
        } catch (_) {
          res = await tauriCore?.invoke('rename_vault', { targetPath, newName });
        }
        return { success: Boolean(res?.success), path: res?.path, name: res?.name, recentHearths: res?.recentHearths || res?.recentVaults || [], error: res?.error };
      } catch (e: any) {
        return { success: false, error: e.message, recentHearths: [] };
      }
    }
    if (this.isElectron()) {
      try {
        const fn = window.electronAPI?.renameHearth || window.electronAPI?.renameVault;
        if (fn) {
          const res: any = await fn(targetPath, newName);
          if (res) {
            return {
              success: Boolean(res.success),
              path: res.path || targetPath,
              name: res.name || newName,
              recentHearths: res.recentHearths || res.recentVaults || [],
              error: res.error,
            };
          }
        }
      } catch (e: any) {
        console.warn('[Platform] Electron rename error:', e);
        return { success: false, error: e?.message || 'Failed to rename Hearth', recentHearths: [] };
      }
    }
    return { success: true, path: targetPath, name: newName, recentHearths: [] };
  }

  public async renameVault(targetPath: string, newName: string): Promise<{ success: boolean; path?: string; name?: string; recentVaults: RecentVaultItem[]; error?: string }> {
    const res = await this.renameHearth(targetPath, newName);
    return { success: res.success, path: res.path, name: res.name, recentVaults: res.recentHearths, error: res.error };
  }

  public async removeRecentHearth(hearthPath: string): Promise<{ success: boolean; recentHearths: RecentVaultItem[] }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      const res = await tauriCore?.invoke('remove_recent_vault', { vaultPath: hearthPath });
      return { success: Boolean(res?.success), recentHearths: res?.recentVaults || [] };
    }
    if (this.isElectron()) {
      const fn = window.electronAPI?.removeRecentHearth || window.electronAPI?.removeRecentVault;
      const res = (await fn?.(hearthPath)) || { success: false, recentHearths: [] };
      return {
        success: res.success,
        recentHearths: (res as any).recentHearths || (res as any).recentVaults || [],
      };
    }
    return { success: false, recentHearths: [] };
  }

  public async removeRecentVault(vaultPath: string): Promise<{ success: boolean; recentVaults: RecentVaultItem[] }> {
    const res = await this.removeRecentHearth(vaultPath);
    return { success: res.success, recentVaults: res.recentHearths };
  }

  public async setCurrentHearth(hearthPath: string): Promise<{ success: boolean; path: string; name: string; recentHearths: RecentVaultItem[] }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      const res = await tauriCore?.invoke('set_current_vault', { vaultPath: hearthPath });
      return { ...res, recentHearths: res?.recentVaults || [] };
    }
    if (this.isElectron()) {
      const fn = window.electronAPI?.setCurrentHearth || window.electronAPI?.setCurrentVault;
      const res = (await fn?.(hearthPath)) || { success: false, path: '', name: '', recentHearths: [] };
      return {
        success: res.success,
        path: res.path,
        name: res.name,
        recentHearths: (res as any).recentHearths || (res as any).recentVaults || [],
      };
    }
    return { success: false, path: '', name: '', recentHearths: [] };
  }

  public async setCurrentVault(vaultPath: string): Promise<{ success: boolean; path: string; name: string; recentVaults: RecentVaultItem[] }> {
    const res = await this.setCurrentHearth(vaultPath);
    return { success: res.success, path: res.path, name: res.name, recentVaults: res.recentHearths };
  }

  public async openHearthInExplorer(hearthPath?: string): Promise<{ success: boolean; error?: string }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('open_vault_in_explorer', { vaultPath: hearthPath || null });
    }
    if (this.isElectron()) {
      const fn = window.electronAPI?.openHearthInExplorer || window.electronAPI?.openVaultInExplorer;
      return (await fn?.(hearthPath)) || { success: false };
    }
    return { success: false };
  }

  public async openVaultInExplorer(vaultPath?: string): Promise<{ success: boolean; error?: string }> {
    return this.openHearthInExplorer(vaultPath);
  }

  public async selectParentFolder(): Promise<{ canceled: boolean; path?: string }> {
    if (this.isTauri()) {
      const { tauriCore, tauriDialog } = await getTauriModules();
      if (tauriDialog?.open) {
        const selected = await tauriDialog.open({
          directory: true,
          multiple: false,
          title: 'Select Folder for New Vault',
        });
        if (selected && typeof selected === 'string') {
          return { canceled: false, path: selected };
        }
        return { canceled: true };
      }
      return await tauriCore?.invoke('select_parent_folder');
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.selectParentFolder?.()) || { canceled: true };
    }
    return { canceled: true };
  }

  // Hearth / Vault File I/O
  public async scanHearthFiles(customHearthPath?: string): Promise<VaultDiskItem[]> {
    return this.scanVaultFiles(customHearthPath);
  }

  public async scanVaultFiles(customVaultPath?: string): Promise<VaultDiskItem[]> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return (await tauriCore?.invoke('scan_vault_files', { customVaultPath: customVaultPath || null })) || [];
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.scanVaultFiles?.(customVaultPath)) || [];
    }
    return [];
  }

  public async saveMarkdownFile(filename: string, content: string, relativePath?: string, vaultPath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    this.recordInternalWrite();
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('save_markdown_file', { filename, content, relativePath: relativePath || null, vaultPath: vaultPath || null });
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.saveMarkdownFile?.(filename, content, relativePath, vaultPath)) || { success: false };
    }
    return { success: false };
  }

  public async setFileAttributes(filenameOrPath: string, options: { readonly?: boolean; mtime?: number }): Promise<{ success: boolean; path?: string; error?: string }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return (await tauriCore?.invoke('set_file_attributes', {
        filenameOrPath,
        readonly: options.readonly !== undefined ? options.readonly : null,
        modifiedTime: options.mtime !== undefined ? options.mtime : null,
      })) || { success: true };
    }
    if (this.isElectron()) {
      return (await (window.electronAPI as any)?.setFileAttributes?.(filenameOrPath, options)) || { success: true };
    }
    return { success: true };
  }

  public async deleteMarkdownFile(filenameOrPath: string, vaultPath?: string): Promise<{ success: boolean; error?: string }> {
    this.recordInternalWrite();
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('delete_markdown_file', { filenameOrPath, vaultPath: vaultPath || null });
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.deleteMarkdownFile?.(filenameOrPath, vaultPath)) || { success: false };
    }
    return { success: false };
  }

  public async renameMarkdownFile(oldFilename: string, newFilename: string, oldRelativePath?: string, newRelativePath?: string, vaultPath?: string): Promise<{ success: boolean; error?: string }> {
    this.recordInternalWrite();
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('rename_markdown_file', {
        oldFilename: oldFilename || null,
        newFilename: newFilename || null,
        oldRelativePath: oldRelativePath || null,
        newRelativePath: newRelativePath || null,
        vaultPath: vaultPath || null,
      });
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.renameMarkdownFile?.(oldFilename, newFilename, oldRelativePath, newRelativePath, vaultPath)) || { success: false };
    }
    return { success: false };
  }

  public async openTrashFolder(): Promise<{ success: boolean; path?: string; error?: string }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('open_trash_folder');
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.openTrashFolder?.()) || { success: false };
    }
    return { success: false, error: 'Desktop mode only' };
  }

  public async saveTrashFile(filename: string, content: string, relativePath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    this.recordInternalWrite();
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('save_trash_file', { filename, content, relativePath: relativePath || null });
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.saveTrashFile?.(filename, content, relativePath)) || { success: false };
    }
    return { success: false };
  }

  public async deleteTrashFile(filenameOrPath: string): Promise<{ success: boolean; error?: string }> {
    this.recordInternalWrite();
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('delete_trash_file', { filenameOrPath });
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.deleteTrashFile?.(filenameOrPath)) || { success: false };
    }
    return { success: false };
  }

  public async emptyTrashFolder(): Promise<{ success: boolean; error?: string }> {
    this.recordInternalWrite();
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('empty_trash_folder');
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.emptyTrashFolder?.()) || { success: false };
    }
    return { success: false };
  }

  // Database persistence
  public async saveDatabase(bytes: Uint8Array, customVaultPath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('save_database', { bytes, vaultPath: customVaultPath || null });
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.saveDatabase?.(bytes, customVaultPath)) || { success: false };
    }
    return { success: false };
  }

  public async loadDatabase(customVaultPath?: string): Promise<Uint8Array | ArrayBuffer | null> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      const raw: any = await tauriCore?.invoke('load_database', { vaultPath: customVaultPath || null });
      if (raw) {
        if (raw instanceof Uint8Array) return raw;
        if (Array.isArray(raw)) return new Uint8Array(raw);
        if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
      }
      return null;
    }
    if (this.isElectron()) {
      return (await window.electronAPI?.loadDatabase?.(customVaultPath)) || null;
    }
    return null;
  }

  // Event Listeners
  // Event Listeners
  public onHearthChanged(callback: (hearth: { path: string; name: string; recentHearths: RecentVaultItem[] }) => void): () => void {
    if (this.isTauri()) {
      let unlisten: (() => void) | null = null;
      getTauriModules().then(({ tauriEvent }) => {
        tauriEvent?.listen('vault-changed', (event: any) => {
          callback({
            path: event.payload?.path,
            name: event.payload?.name || 'Flint Hearth',
            recentHearths: event.payload?.recentHearths || event.payload?.recentVaults || [],
          });
        }).then((fn: any) => {
          unlisten = fn;
        });
      });
      return () => {
        if (unlisten) unlisten();
      };
    }
    if (this.isElectron()) {
      const onFn = window.electronAPI?.onHearthChanged || window.electronAPI?.onVaultChanged;
      return onFn?.((data: any) => {
        callback({
          path: data.path,
          name: data.name || 'Flint Hearth',
          recentHearths: data.recentHearths || data.recentVaults || [],
        });
      }) || (() => {});
    }
    return () => {};
  }

  public onVaultChanged(callback: (vault: { path: string; name: string; recentVaults: RecentVaultItem[] }) => void): () => void {
    return this.onHearthChanged((h) => {
      callback({
        path: h.path,
        name: h.name,
        recentVaults: h.recentHearths,
      });
    });
  }

  public onHearthFilesChanged(callback: () => void): () => void {
    return this.onVaultFilesChanged(callback);
  }

  public onVaultFilesChanged(callback: () => void): () => void {
    if (this.isTauri()) {
      let unlisten: (() => void) | null = null;
      getTauriModules().then(({ tauriEvent }) => {
        tauriEvent?.listen('vault-files-changed', () => {
          callback();
        }).then((fn: any) => {
          unlisten = fn;
        });
      });
      return () => {
        if (unlisten) unlisten();
      };
    }
    if (this.isElectron()) {
      const onFn = window.electronAPI?.onHearthFilesChanged || window.electronAPI?.onVaultFilesChanged;
      return onFn?.(callback) || (() => {});
    }
    return () => {};
  }

  // Extensions / Plugins
  public async openExtensionsFolder(): Promise<{ success: boolean; path?: string }> {
    return this.openPluginsFolder();
  }

  public async openPluginsFolder(): Promise<{ success: boolean; path?: string }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('open_plugins_folder');
    }
    if (this.isElectron()) {
      const fn = window.electronAPI?.openExtensionsFolder || window.electronAPI?.openPluginsFolder;
      return (await fn?.()) || { success: false };
    }
    return { success: false };
  }

  public async listInstalledExtensions(): Promise<Array<{ id: string; name: string; version: string; description: string; author: string; folder: string; isCore: boolean }>> {
    return this.listInstalledPlugins();
  }

  public async listInstalledPlugins(): Promise<Array<{ id: string; name: string; version: string; description: string; author: string; folder: string; isCore: boolean }>> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return (await tauriCore?.invoke('list_installed_plugins')) || [];
    }
    if (this.isElectron()) {
      const fn = window.electronAPI?.listInstalledExtensions || window.electronAPI?.listInstalledPlugins;
      return (await fn?.()) || [];
    }
    return [];
  }

  public async readExtensionBundle(extensionFolder: string): Promise<{ success: boolean; jsCode?: string; cssCode?: string; error?: string }> {
    return this.readPluginBundle(extensionFolder);
  }

  public async readPluginBundle(pluginFolder: string): Promise<{ success: boolean; jsCode?: string; cssCode?: string; error?: string }> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      return await tauriCore?.invoke('read_plugin_bundle', { pluginFolder });
    }
    if (this.isElectron()) {
      const fn = window.electronAPI?.readExtensionBundle || window.electronAPI?.readPluginBundle;
      return (await fn?.(pluginFolder)) || { success: false };
    }
    return { success: false };
  }

  // Zoom
  public setZoomFactor(factor: number): void {
    if (this.isElectron() && window.electronAPI?.setZoomFactor) {
      window.electronAPI.setZoomFactor(factor);
    } else if (typeof document !== 'undefined') {
      if (document.body && (document.body.style as any).zoom) {
        (document.body.style as any).zoom = '';
      }
      if (document.documentElement) {
        const targetZoom = String(factor);
        if ((document.documentElement.style as any).zoom !== targetZoom) {
          (document.documentElement.style as any).zoom = targetZoom;
        }
      }
    }
  }

  public getZoomFactor(): number {
    if (this.isElectron() && window.electronAPI?.getZoomFactor) {
      return window.electronAPI.getZoomFactor();
    }
    if (typeof document !== 'undefined') {
      const docZoom = (document.documentElement.style as any).zoom;
      if (docZoom) return parseFloat(docZoom);
      const bodyZoom = (document.body.style as any).zoom;
      return bodyZoom ? parseFloat(bodyZoom) : 1;
    }
    return 1;
  }

  public async setAccentIcon(accentColor: string): Promise<void> {
    if (this.isTauri()) {
      const { tauriCore } = await getTauriModules();
      if (tauriCore?.invoke) {
        try {
          await tauriCore.invoke('set_accent_icon', { accentColor });
        } catch (e) {
          console.warn('[PlatformAdapter] Failed to set accent icon', e);
        }
      }
    }
  }

  public async setWindowTitle(title: string): Promise<void> {
    if (typeof document !== 'undefined') {
      document.title = title;
    }
    if (this.isTauri()) {
      try {
        const { tauriCore, tauriWindow } = await getTauriModules();
        if (tauriCore?.invoke) {
          try {
            await tauriCore.invoke('window_set_title', { title });
          } catch (err) {
            console.warn('[PlatformAdapter] tauri invoke window_set_title failed:', err);
          }
        }
        const current = tauriWindow?.getCurrentWindow();
        if (current?.setTitle) {
          await current.setTitle(title);
        }
      } catch (e) {
        console.warn('[PlatformAdapter] Failed to set window title in Tauri', e);
      }
    }
    if (this.isElectron()) {
      try {
        (window as any).electronAPI?.setWindowTitle?.(title);
      } catch (e) {
        console.warn('[PlatformAdapter] Failed to set window title in Electron', e);
      }
    }
  }

  public async notifyUserActivity(): Promise<void> {
    if (this.isTauri()) {
      try {
        const { tauriCore } = await getTauriModules();
        if (tauriCore?.invoke) {
          await tauriCore.invoke('notify_user_activity');
        }
      } catch (e) {}
    }
  }
}

export const platform = new PlatformAdapterImpl();
export const platformAdapter = platform;
export default platform;
