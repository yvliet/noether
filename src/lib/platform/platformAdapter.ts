import { RecentVaultItem, VaultDiskItem } from '@/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { markLinkVisited } from '@/lib/visitedLinks';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { open as openShell } from '@tauri-apps/plugin-shell';

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

  // Multi-window / Modals
  openHearthWindow(): Promise<{ success: boolean }>;
  closeHearthWindow(): Promise<{ success: boolean }>;
  openVaultWindow(): Promise<{ success: boolean }>;
  closeVaultWindow(): Promise<{ success: boolean }>;
  openSettingsWindow(): Promise<{ success: boolean }>;
  closeSettingsWindow(): Promise<{ success: boolean }>;

  // Global hotkeys and focus
  registerGlobalShortcut(id: string, shortcut: string): Promise<{ success: boolean }>;
  unregisterGlobalShortcut(id: string): Promise<{ success: boolean }>;
  onGlobalShortcut(callback: (id: string) => void): () => void;
  focusMainWindow(): Promise<{ success: boolean }>;

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
  installExtensionBundle(extensionFolder: string, manifestJson: string, mainJs: string, stylesCss?: string): Promise<{ success: boolean; path?: string; error?: string }>;
  openPluginsFolder(): Promise<{ success: boolean; path?: string }>;
  listInstalledPlugins(): Promise<Array<{ id: string; name: string; version: string; description: string; author: string; folder: string; isCore: boolean }>>;
  readPluginBundle(pluginFolder: string): Promise<{ success: boolean; jsCode?: string; cssCode?: string; error?: string }>;
  installPluginBundle(pluginFolder: string, manifestJson: string, mainJs: string, stylesCss?: string): Promise<{ success: boolean; path?: string; error?: string }>;

  // Zoom
  setZoomFactor(factor: number): void;
  getZoomFactor(): number;

  // Dynamic Icon & Title & Activity
  setAccentIcon(accentColor: string): Promise<void>;
  setWindowTitle(title: string): Promise<void>;
  notifyUserActivity(): Promise<void>;

  // External URLs
  openUrl(url: string): Promise<{ success: boolean; error?: string }>;
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
    return false;
  }

  public isDesktop(): boolean {
    return this.isTauri();
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
      try {
        await invoke('window_minimize');
        return;
      } catch {
        await getCurrentWindow().minimize();
      }
    }
  }

  public async maximize(): Promise<void> {
    if (this.isTauri()) {
      try {
        await invoke('window_maximize');
        return;
      } catch {
        await getCurrentWindow().toggleMaximize();
      }
    }
  }

  public async close(): Promise<void> {
    if (this.isTauri()) {
      try {
        await invoke('window_close');
        return;
      } catch {
        await getCurrentWindow().close();
      }
    }
  }

  public async startDragging(): Promise<void> {
    if (this.isTauri()) {
      try {
        await invoke('window_start_dragging');
      } catch {
        await getCurrentWindow().startDragging();
      }
    }
  }

  public async isMaximized(): Promise<boolean> {
    if (this.isTauri()) {
      try {
        return Boolean(await invoke('window_is_maximized'));
      } catch {
        return (await getCurrentWindow().isMaximized()) || false;
      }
    }
    return false;
  }

  public onMaximizedChange(callback: (isMaximized: boolean) => void): () => void {
    if (this.isTauri()) {
      let unlistenResize: (() => void) | null = null;
      const current = getCurrentWindow();
      current.onResized(() => {
        current.isMaximized().then((max) => callback(Boolean(max)));
      }).then((unlisten) => {
        unlistenResize = unlisten;
      });
      return () => {
        if (unlistenResize) unlistenResize();
      };
    }
    return () => {};
  }

  public async isMinimized(): Promise<boolean> {
    if (this.isTauri()) {
      try {
        return Boolean(await invoke('window_is_minimized'));
      } catch {
        return (await getCurrentWindow().isMinimized()) || false;
      }
    }
    if (typeof document !== 'undefined') {
      return document.hidden;
    }
    return false;
  }

  public onMinimizedChange(callback: (isMinimized: boolean) => void): () => void {
    let unlistenResize: (() => void) | null = null;
    let unlistenVis: (() => void) | null = null;

    if (this.isTauri()) {
      const current = getCurrentWindow();
      current.onResized(() => {
        current.isMinimized().then((min) => callback(Boolean(min)));
      }).then((unlisten) => {
        unlistenResize = unlisten;
      });
    }

    const handleVis = () => callback(document.hidden);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVis);
      unlistenVis = () => document.removeEventListener('visibilitychange', handleVis);
    }

    return () => {
      if (unlistenResize) unlistenResize();
      if (unlistenVis) unlistenVis();
    };
  }

  // Multi-window / Modal management
  public async openHearthWindow(): Promise<{ success: boolean }> {
    useWorkspaceStore.getState().setIsHearthModalOpen(true);
    return { success: true };
  }

  public async closeHearthWindow(): Promise<{ success: boolean }> {
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
      return (await invoke('register_global_shortcut', { id, shortcut })) || { success: true };
    }
    return { success: true };
  }

  public async unregisterGlobalShortcut(id: string): Promise<{ success: boolean }> {
    if (this.isTauri()) {
      return (await invoke('unregister_global_shortcut', { id })) || { success: true };
    }
    return { success: true };
  }

  public onGlobalShortcut(callback: (id: string) => void): () => void {
    if (this.isTauri()) {
      let unlisten: (() => void) | null = null;
      listen('global-shortcut-activated', (event: any) => {
        const id = typeof event.payload === 'string' ? event.payload : (event.payload?.id || '');
        callback(id);
      }).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    }
    return () => {};
  }

  public async focusMainWindow(): Promise<{ success: boolean }> {
    if (this.isTauri()) {
      return (await invoke('focus_main_window')) || { success: true };
    }
    if (typeof window !== 'undefined') {
      window.focus();
    }
    return { success: true };
  }

  // Hearth Management
  public async getCurrentHearth(): Promise<{ path: string; name: string; recentHearths: RecentVaultItem[] }> {
    if (this.isTauri()) {
      const res: any = await invoke('get_current_vault');
      return {
        path: res?.path || '',
        name: res?.name || 'Flint Hearth',
        recentHearths: res?.recentHearths || res?.recentVaults || [],
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
      try {
        const selected = await openDialog({
          directory: true,
          multiple: false,
          title: 'Select Hearth Folder',
        });
        if (selected && typeof selected === 'string') {
          const res: any = await invoke('set_current_vault', { vaultPath: selected });
          return {
            canceled: false,
            path: res?.path || selected,
            name: res?.name,
            recentHearths: res?.recentHearths || res?.recentVaults || [],
          };
        }
        return { canceled: true };
      } catch (e) {
        console.warn('[PlatformAdapter] selectHearthFolder error:', e);
        return { canceled: true };
      }
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
      const res: any = await invoke('create_new_vault', { name, parentPath: parentPath || null });
      return { ...res, recentHearths: res?.recentVaults || [] };
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
        let res: any;
        try {
          res = await invoke('rename_hearth', { targetPath, newName });
        } catch {
          res = await invoke('rename_vault', { targetPath, newName });
        }
        return {
          success: Boolean(res?.success),
          path: res?.path,
          name: res?.name,
          recentHearths: res?.recentHearths || res?.recentVaults || [],
          error: res?.error,
        };
      } catch (e: any) {
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
      const res: any = await invoke('remove_recent_vault', { vaultPath: hearthPath });
      return { success: Boolean(res?.success), recentHearths: res?.recentVaults || [] };
    }
    return { success: false, recentHearths: [] };
  }

  public async removeRecentVault(vaultPath: string): Promise<{ success: boolean; recentVaults: RecentVaultItem[] }> {
    const res = await this.removeRecentHearth(vaultPath);
    return { success: res.success, recentVaults: res.recentHearths };
  }

  public async setCurrentHearth(hearthPath: string): Promise<{ success: boolean; path: string; name: string; recentHearths: RecentVaultItem[] }> {
    if (this.isTauri()) {
      const res: any = await invoke('set_current_vault', { vaultPath: hearthPath });
      return { ...res, recentHearths: res?.recentVaults || [] };
    }
    return { success: false, path: '', name: '', recentHearths: [] };
  }

  public async setCurrentVault(vaultPath: string): Promise<{ success: boolean; path: string; name: string; recentVaults: RecentVaultItem[] }> {
    const res = await this.setCurrentHearth(vaultPath);
    return { success: res.success, path: res.path, name: res.name, recentVaults: res.recentHearths };
  }

  public async openHearthInExplorer(hearthPath?: string): Promise<{ success: boolean; error?: string }> {
    if (this.isTauri()) {
      return await invoke('open_vault_in_explorer', { vaultPath: hearthPath || null });
    }
    return { success: false };
  }

  public async openVaultInExplorer(vaultPath?: string): Promise<{ success: boolean; error?: string }> {
    return this.openHearthInExplorer(vaultPath);
  }

  public async selectParentFolder(): Promise<{ canceled: boolean; path?: string }> {
    if (this.isTauri()) {
      try {
        const selected = await openDialog({
          directory: true,
          multiple: false,
          title: 'Select Folder for New Hearth',
        });
        if (selected && typeof selected === 'string') {
          return { canceled: false, path: selected };
        }
        return { canceled: true };
      } catch (e) {
        console.warn('[PlatformAdapter] selectParentFolder error:', e);
        return { canceled: true };
      }
    }
    return { canceled: true };
  }

  // Hearth / Vault File I/O
  public async scanHearthFiles(customHearthPath?: string): Promise<VaultDiskItem[]> {
    return this.scanVaultFiles(customHearthPath);
  }

  public async scanVaultFiles(customVaultPath?: string): Promise<VaultDiskItem[]> {
    if (this.isTauri()) {
      return (await invoke('scan_vault_files', { customVaultPath: customVaultPath || null })) || [];
    }
    return [];
  }

  public async saveMarkdownFile(filename: string, content: string, relativePath?: string, vaultPath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    this.recordInternalWrite(relativePath || filename);
    if (this.isTauri()) {
      return await invoke('save_markdown_file', { filename, content, relativePath: relativePath || null, vaultPath: vaultPath || null });
    }
    return { success: false };
  }

  public async setFileAttributes(filenameOrPath: string, options: { readonly?: boolean; mtime?: number }): Promise<{ success: boolean; path?: string; error?: string }> {
    if (this.isTauri()) {
      return (await invoke('set_file_attributes', {
        filenameOrPath,
        readonly: options.readonly !== undefined ? options.readonly : null,
        modifiedTime: options.mtime !== undefined ? options.mtime : null,
      })) || { success: true };
    }
    return { success: true };
  }

  public async deleteMarkdownFile(filenameOrPath: string, vaultPath?: string): Promise<{ success: boolean; error?: string }> {
    this.recordInternalWrite(filenameOrPath);
    if (this.isTauri()) {
      return await invoke('delete_markdown_file', { filenameOrPath, vaultPath: vaultPath || null });
    }
    return { success: false };
  }

  public async renameMarkdownFile(oldFilename: string, newFilename: string, oldRelativePath?: string, newRelativePath?: string, vaultPath?: string): Promise<{ success: boolean; error?: string }> {
    this.recordInternalWrite(newRelativePath || oldRelativePath || newFilename);
    if (this.isTauri()) {
      return await invoke('rename_markdown_file', {
        oldFilename: oldFilename || null,
        newFilename: newFilename || null,
        oldRelativePath: oldRelativePath || null,
        newRelativePath: newRelativePath || null,
        vaultPath: vaultPath || null,
      });
    }
    return { success: false };
  }

  public async openTrashFolder(): Promise<{ success: boolean; path?: string; error?: string }> {
    if (this.isTauri()) {
      return await invoke('open_trash_folder');
    }
    return { success: false, error: 'Desktop mode only' };
  }

  public async saveTrashFile(filename: string, content: string, relativePath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    this.recordInternalWrite(relativePath || filename);
    if (this.isTauri()) {
      return await invoke('save_trash_file', { filename, content, relativePath: relativePath || null });
    }
    return { success: false };
  }

  public async deleteTrashFile(filenameOrPath: string): Promise<{ success: boolean; error?: string }> {
    this.recordInternalWrite(filenameOrPath);
    if (this.isTauri()) {
      return await invoke('delete_trash_file', { filenameOrPath });
    }
    return { success: false };
  }

  public async emptyTrashFolder(): Promise<{ success: boolean; error?: string }> {
    this.recordInternalWrite('.trash');
    if (this.isTauri()) {
      return await invoke('empty_trash_folder');
    }
    return { success: false };
  }

  // Database persistence
  public async saveDatabase(bytes: Uint8Array, customVaultPath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
    if (this.isTauri()) {
      return await invoke('save_database', { bytes, vaultPath: customVaultPath || null });
    }
    return { success: false };
  }

  public async loadDatabase(customVaultPath?: string): Promise<Uint8Array | ArrayBuffer | null> {
    if (this.isTauri()) {
      const raw: any = await invoke('load_database', { vaultPath: customVaultPath || null });
      if (raw) {
        if (raw instanceof Uint8Array) return raw;
        if (Array.isArray(raw)) return new Uint8Array(raw);
        if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
      }
    }
    return null;
  }

  // Event Listeners
  public onHearthChanged(callback: (hearth: { path: string; name: string; recentHearths: RecentVaultItem[] }) => void): () => void {
    if (this.isTauri()) {
      let unlisten: (() => void) | null = null;
      listen('vault-changed', (event: any) => {
        callback({
          path: event.payload?.path,
          name: event.payload?.name || 'Flint Hearth',
          recentHearths: event.payload?.recentHearths || event.payload?.recentVaults || [],
        });
      }).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
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
      listen('vault-files-changed', () => {
        callback();
      }).then((fn) => {
        unlisten = fn;
      });
      return () => {
        if (unlisten) unlisten();
      };
    }
    return () => {};
  }

  // Extensions / Plugins
  public async openExtensionsFolder(): Promise<{ success: boolean; path?: string }> {
    return this.openPluginsFolder();
  }

  public async openPluginsFolder(): Promise<{ success: boolean; path?: string }> {
    if (this.isTauri()) {
      return await invoke('open_plugins_folder');
    }
    return { success: false };
  }

  public async listInstalledExtensions(): Promise<Array<{ id: string; name: string; version: string; description: string; author: string; folder: string; isCore: boolean }>> {
    return this.listInstalledPlugins();
  }

  public async listInstalledPlugins(): Promise<Array<{ id: string; name: string; version: string; description: string; author: string; folder: string; isCore: boolean }>> {
    if (this.isTauri()) {
      return (await invoke('list_installed_plugins')) || [];
    }
    return [];
  }

  public async readExtensionBundle(extensionFolder: string): Promise<{ success: boolean; jsCode?: string; cssCode?: string; error?: string }> {
    return this.readPluginBundle(extensionFolder);
  }

  public async readPluginBundle(pluginFolder: string): Promise<{ success: boolean; jsCode?: string; cssCode?: string; error?: string }> {
    if (this.isTauri()) {
      return await invoke('read_plugin_bundle', { pluginFolder });
    }
    return { success: false };
  }

  public async installExtensionBundle(
    extensionFolder: string,
    manifestJson: string,
    mainJs: string,
    stylesCss?: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    return this.installPluginBundle(extensionFolder, manifestJson, mainJs, stylesCss);
  }

  public async installPluginBundle(
    pluginFolder: string,
    manifestJson: string,
    mainJs: string,
    stylesCss?: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    if (this.isTauri()) {
      return await invoke('install_plugin_bundle', {
        pluginFolder,
        manifestJson,
        mainJs,
        stylesCss: stylesCss || null,
      });
    }
    return { success: false, error: 'Desktop only' };
  }

  // Zoom
  public setZoomFactor(factor: number): void {
    if (typeof document !== 'undefined') {
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
      try {
        await invoke('set_accent_icon', { accentColor });
      } catch (e) {
        console.warn('[PlatformAdapter] Failed to set accent icon', e);
      }
    }
  }

  public async setWindowTitle(title: string): Promise<void> {
    if (typeof document !== 'undefined') {
      document.title = title;
    }
    if (this.isTauri()) {
      try {
        try {
          await invoke('window_set_title', { title });
        } catch (err) {
          console.warn('[PlatformAdapter] tauri invoke window_set_title failed:', err);
        }
        const current = getCurrentWindow();
        if (current?.setTitle) {
          await current.setTitle(title);
        }
      } catch (e) {
        console.warn('[PlatformAdapter] Failed to set window title in Tauri', e);
      }
    }
  }

  public async notifyUserActivity(): Promise<void> {
    if (this.isTauri()) {
      try {
        await invoke('notify_user_activity');
      } catch {}
    }
  }

  private _lastOpenedUrl: string = '';
  private _lastOpenedTime: number = 0;

  public async openUrl(rawUrl: string): Promise<{ success: boolean; error?: string }> {
    if (!rawUrl) return { success: false, error: 'Empty URL' };
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:')) {
      if (url.startsWith('www.') || url.includes('.')) {
        url = `https://${url}`;
      }
    }

    const now = Date.now();
    markLinkVisited(url);
    if (rawUrl !== url) markLinkVisited(rawUrl);
    if (url === this._lastOpenedUrl && now - this._lastOpenedTime < 500) {
      return { success: true };
    }
    this._lastOpenedUrl = url;
    this._lastOpenedTime = now;

    if (this.isTauri()) {
      try {
        await openShell(url);
        return { success: true };
      } catch (e: any) {
        console.warn('[PlatformAdapter] Tauri plugin-shell open failed', e);
      }
    }

    try {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (opened) return { success: true };
    } catch (e: any) {
      console.error('[PlatformAdapter] Failed to open URL via window.open', e);
      return { success: false, error: e?.message || 'Failed to open URL' };
    }

    return { success: true };
  }
}

export const platform = new PlatformAdapterImpl();
export const platformAdapter = platform;
export default platform;
