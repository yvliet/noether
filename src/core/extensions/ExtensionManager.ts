import type { FlintApp } from '../app/FlintApp';
import { Extension } from './Extension';
import { ExtensionManifest, ViewDefinition } from './types';
import { ExternalExtensionLoader } from './ExternalExtensionLoader';
import { ExtensionUpdateManager } from './ExtensionUpdateManager';
import { platform } from '@/lib/platform/platformAdapter';

export type ExtensionConstructor = new (app: FlintApp, manifest: ExtensionManifest) => Extension;
export type PluginConstructor = ExtensionConstructor;

export interface ExtensionConfig {
  enabledExtensions: string[];
  disabledCoreExtensions: string[];
}
export type PluginConfig = ExtensionConfig;

export interface ExtensionListSnapshot {
  core: ExtensionManifest[];
  community: ExtensionManifest[];
  all: ExtensionManifest[];
}
export type PluginListSnapshot = ExtensionListSnapshot;

export class ExtensionManager {
  private app: FlintApp;
  private instances: Map<string, Extension> = new Map();
  private manifests: Map<string, ExtensionManifest> = new Map();
  private constructors: Map<string, ExtensionConstructor> = new Map();
  private enabledExtensionIds: Set<string> = new Set();
  private disabledCoreExtensionIds: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  public get isReady(): boolean {
    return this.isInitialized;
  }
  public externalLoader: ExternalExtensionLoader;
  public updateManager: ExtensionUpdateManager;

  public get updater(): ExtensionUpdateManager {
    return this.updateManager;
  }
  private syncTimer: any = null;
  private pendingSyncResolvers: Array<() => void> = [];

  private cachedSnapshot: ExtensionListSnapshot = { core: [], community: [], all: [] };

  constructor(app: FlintApp) {
    this.app = app;
    this.externalLoader = new ExternalExtensionLoader(app);
    this.updateManager = new ExtensionUpdateManager(app);
  }

  public async initCore(): Promise<void> {
    this.loadConfig();

    // Initialize registered bundled core extensions immediately in parallel
    const coreInitPromises: Promise<boolean>[] = [];
    for (const [id, manifest] of this.manifests.entries()) {
      const isCore = manifest.isCore === true;
      let isEnabled = false;
      if (isCore) {
        if (manifest.defaultDisabled) {
          isEnabled = this.enabledExtensionIds.has(id) && !this.disabledCoreExtensionIds.has(id);
        } else {
          isEnabled = !this.disabledCoreExtensionIds.has(id);
        }
      } else {
        isEnabled = this.enabledExtensionIds.has(id);
      }

      if (isEnabled && !this.instances.has(id)) {
        coreInitPromises.push(this.enableExtension(id));
      }
    }
    await Promise.all(coreInitPromises);
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    await this.initCore();

    // 2. Discover external extensions from disk
    await this.externalLoader.discoverAndLoadExtensions();

    // 3. Initialize any newly discovered external extensions
    const externalPromises: Promise<boolean>[] = [];
    for (const [id, manifest] of this.manifests.entries()) {
      const isCore = manifest.isCore === true;
      let isEnabled = false;
      if (isCore) {
        if (manifest.defaultDisabled) {
          isEnabled = this.enabledExtensionIds.has(id) && !this.disabledCoreExtensionIds.has(id);
        } else {
          isEnabled = !this.disabledCoreExtensionIds.has(id);
        }
      } else {
        isEnabled = this.enabledExtensionIds.has(id);
      }

      if (isEnabled && !this.instances.has(id)) {
        externalPromises.push(this.enableExtension(id));
      }
    }
    await Promise.all(externalPromises);

    // 4. Listen for changes from other windows (e.g., Settings window)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'flint_plugins_config' || e.key === 'flint_extensions_config') {
          this.syncFromStorage();
        }
      });
    }

    this.isInitialized = true;
    this.recomputeSnapshot();
    this.notify();

    // Check for community extension updates in background shortly after boot
    this.updateManager.startAutoUpdateCheck(6000);
  }

  public syncFromStorage(): Promise<void> {
    return new Promise((resolve) => {
      this.pendingSyncResolvers.push(resolve);
      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
      }
      this.syncTimer = setTimeout(async () => {
        this.syncTimer = null;
        const resolvers = [...this.pendingSyncResolvers];
        this.pendingSyncResolvers = [];
        try {
          await this.doSyncFromStorage();
        } finally {
          resolvers.forEach((res) => res());
        }
      }, 50);
    });
  }

  private async doSyncFromStorage(): Promise<void> {
    await this.refreshCommunityExtensions();
    this.loadConfig();

    for (const [id, manifest] of this.manifests.entries()) {
      const isCore = manifest.isCore === true;
      const shouldBeEnabled = isCore
        ? !this.disabledCoreExtensionIds.has(id)
        : this.enabledExtensionIds.has(id);
      const isCurrentlyRunning = this.instances.has(id);

      if (shouldBeEnabled && !isCurrentlyRunning) {
        await this.enableExtension(id);
      } else if (!shouldBeEnabled && isCurrentlyRunning) {
        await this.disableExtension(id);
      }
    }
  }

  public async refreshCommunityExtensions(): Promise<void> {
    await this.externalLoader.discoverAndLoadExtensions();
    this.recomputeSnapshot();
    this.notify();
  }

  public async refreshCommunityPlugins(): Promise<void> {
    return this.refreshCommunityExtensions();
  }

  public registerExtension(manifest: ExtensionManifest, extensionClass: ExtensionConstructor): void {
    this.loadConfig();
    this.manifests.set(manifest.id, manifest);
    this.constructors.set(manifest.id, extensionClass);
    this.recomputeSnapshot();

    const isCore = manifest.isCore === true;
    const shouldEnable = isCore
      ? !this.disabledCoreExtensionIds.has(manifest.id)
      : this.enabledExtensionIds.has(manifest.id);

    if (this.isInitialized && shouldEnable && !this.instances.has(manifest.id)) {
      this.enableExtension(manifest.id);
    }
    this.notify();
  }

  public registerPlugin(manifest: ExtensionManifest, pluginClass: ExtensionConstructor): void {
    this.registerExtension(manifest, pluginClass);
  }

  public async installExtension(
    manifest: ExtensionManifest,
    jsCode?: string,
    cssCode?: string
  ): Promise<boolean> {
    const success = await this.externalLoader.installExtension(manifest, jsCode, cssCode);
    this.recomputeSnapshot();
    this.notify();
    return success;
  }

  public async installPlugin(
    manifest: ExtensionManifest,
    jsCode?: string,
    cssCode?: string
  ): Promise<boolean> {
    return this.installExtension(manifest, jsCode, cssCode);
  }

  public async enableExtension(extensionId: string): Promise<boolean> {
    const manifest = this.getExtensionManifest(extensionId);
    if (!manifest) {
      console.warn(`[ExtensionManager] Cannot enable unknown extension: "${extensionId}"`);
      return false;
    }
    const targetId = manifest.id;
    const Constructor = this.constructors.get(targetId) || this.constructors.get(extensionId);

    if (!Constructor) {
      console.warn(`[ExtensionManager] No constructor found for extension: "${targetId}"`);
      return false;
    }

    if (this.instances.has(targetId) || this.instances.has(extensionId)) {
      return true;
    }

    let instance: Extension | null = null;
    try {
      instance = new Constructor(this.app, manifest);
      await instance.onload();
      this.instances.set(targetId, instance);
      if (targetId !== extensionId) {
        this.instances.set(extensionId, instance);
      }
      this.app.events.emit('extension:loaded', { extensionId: targetId });

      if (manifest.isCore) {
        this.disabledCoreExtensionIds.delete(targetId);
        this.disabledCoreExtensionIds.delete(extensionId);
        if (manifest.defaultDisabled) {
          this.enabledExtensionIds.add(targetId);
          this.enabledExtensionIds.add(extensionId);
        }
      } else {
        this.enabledExtensionIds.add(targetId);
        this.enabledExtensionIds.add(extensionId);
      }

      this.saveConfig();
      this.app.events.emit('extension:enabled', { extensionId: targetId });
      this.recomputeSnapshot();
      this.notify();
      console.log(`[ExtensionManager] Enabled extension "${manifest.name}" (${targetId})`);
      return true;
    } catch (err) {
      if (instance) {
        try {
          instance.unload();
        } catch (unloadErr) {
          console.warn(`[ExtensionManager] Error during instance.unload() cleanup for "${targetId}":`, unloadErr);
        }
      }
      this.externalLoader.removeExtensionStyle(targetId);
      if (targetId !== extensionId) {
        this.externalLoader.removeExtensionStyle(extensionId);
      }
      this.instances.delete(targetId);
      this.instances.delete(extensionId);
      console.error(`[ExtensionManager] Failed to load extension "${targetId}":`, err);
      this.app.workspace.showToast(`Failed to load extension: ${manifest.name}`, 'warning');
      return false;
    }
  }

  public async enablePlugin(pluginId: string): Promise<boolean> {
    return this.enableExtension(pluginId);
  }

  public async disableExtension(extensionId: string): Promise<boolean> {
    const manifest = this.getExtensionManifest(extensionId);
    const targetId = manifest?.id || extensionId;
    const instance = this.instances.get(targetId) || this.instances.get(extensionId);

    if (!instance) {
      if (manifest?.isCore) {
        this.disabledCoreExtensionIds.add(targetId);
        this.disabledCoreExtensionIds.add(extensionId);
        this.saveConfig();
        this.recomputeSnapshot();
        this.notify();
      } else {
        this.enabledExtensionIds.delete(targetId);
        this.enabledExtensionIds.delete(extensionId);
        this.saveConfig();
        this.recomputeSnapshot();
        this.notify();
      }
      return true;
    }

    try {
      instance.unload();
      this.instances.delete(targetId);
      this.instances.delete(extensionId);
      this.externalLoader.removeExtensionStyle(targetId);
      this.externalLoader.removeExtensionStyle(extensionId);
      this.app.events.emit('extension:unloaded', { extensionId: targetId });

      if (manifest?.isCore) {
        this.disabledCoreExtensionIds.add(targetId);
        this.disabledCoreExtensionIds.add(extensionId);
        if (manifest.defaultDisabled) {
          this.enabledExtensionIds.delete(targetId);
          this.enabledExtensionIds.delete(extensionId);
        }
      } else {
        this.enabledExtensionIds.delete(targetId);
        this.enabledExtensionIds.delete(extensionId);
      }

      this.saveConfig();
      this.app.events.emit('extension:disabled', { extensionId: targetId });
      this.recomputeSnapshot();
      this.notify();
      console.log(`[ExtensionManager] Disabled extension "${targetId}"`);
      return true;
    } catch (err) {
      console.error(`[ExtensionManager] Error disabling extension "${targetId}":`, err);
      return false;
    }
  }

  public async disablePlugin(pluginId: string): Promise<boolean> {
    return this.disableExtension(pluginId);
  }

  /**
   * Hot-reloads an individual extension from disk or registered constructor:
   * 1. Unloads the running instance if active.
   * 2. Cleans up injected styles and cached constructor.
   * 3. Re-discovers bundle files from Hearth `.flint/extensions/<id>/` on desktop.
   * 4. Re-enables the extension if it was previously enabled.
   */
  public async reloadExtension(extensionId: string): Promise<boolean> {
    const manifest = this.getExtensionManifest(extensionId);
    const targetId = manifest?.id || extensionId;
    const wasEnabled = this.isExtensionEnabled(targetId);

    try {
      if (this.instances.has(targetId) || this.instances.has(extensionId)) {
        await this.disableExtension(targetId);
      }

      this.externalLoader.removeExtensionStyle(targetId);
      if (targetId !== extensionId) {
        this.externalLoader.removeExtensionStyle(extensionId);
      }

      this.constructors.delete(targetId);
      this.constructors.delete(extensionId);
      if (targetId.startsWith('flint-')) {
        this.constructors.delete(targetId.slice(6));
      } else {
        this.constructors.delete(`flint-${targetId}`);
      }

      let loaded = false;
      if (platform.isDesktop()) {
        const installed = await platform.listInstalledExtensions();
        const found = installed.find(
          (item) => item.id === targetId || item.folder === targetId || item.id === extensionId || item.folder === extensionId
        );
        if (found) {
          const freshManifest: ExtensionManifest = {
            id: found.id,
            name: found.name,
            version: found.version,
            description: found.description,
            author: found.author,
            isCore: found.isCore,
          };
          this.manifests.set(found.id, freshManifest);
          this.manifests.set(found.folder, freshManifest);
          loaded = await this.externalLoader.loadSingleExtension(found.folder, freshManifest);
        }
      }

      if (!loaded && manifest) {
        loaded = await this.externalLoader.loadSingleExtension(targetId, manifest);
      }

      if (loaded && wasEnabled) {
        await this.enableExtension(targetId);
      }

      this.recomputeSnapshot();
      this.notify();
      return loaded;
    } catch (err) {
      console.error(`[ExtensionManager] Error reloading extension "${targetId}":`, err);
      return false;
    }
  }

  public async reloadPlugin(pluginId: string): Promise<boolean> {
    return this.reloadExtension(pluginId);
  }

  /**
   * Uninstalls an extension:
   * 1. Disables the extension if currently active (triggering unload lifecycle).
   * 2. Executes automated table teardown via ExtensionDatabaseManager, dropping tables with 'drop-on-uninstall'.
   * 3. Deletes extension directory on disk if on desktop.
   * 4. Purges persistent localStorage configuration and metadata.
   * 5. Emits 'extension:uninstalled' event on the EventBus.
   *
   * @param extensionId - Manifest ID of the extension to uninstall.
   * @returns boolean indicating whether uninstallation completed successfully.
   * @since 0.4.0
   */
  public async uninstallExtension(extensionId: string): Promise<boolean> {
    try {
      const manifest = this.getExtensionManifest(extensionId);
      const targetId = manifest?.id || extensionId;

      // 1. Disable first
      await this.disableExtension(targetId);

      // 2. Teardown relational database tables
      await this.app.dbManager.teardownExtension(targetId);
      if (targetId !== extensionId) {
        await this.app.dbManager.teardownExtension(extensionId);
      }

      // 3. Remove physical files if on desktop
      if (platform.isDesktop()) {
        try {
          await platform.uninstallExtensionBundle(targetId);
          if (targetId !== extensionId) {
            await platform.uninstallExtensionBundle(extensionId);
          }
        } catch (diskErr) {
          console.warn(`[ExtensionManager] Failed to remove extension directory for "${targetId}":`, diskErr);
        }
      }

      // 4. Purge from registered sets & storage
      this.enabledExtensionIds.delete(targetId);
      this.enabledExtensionIds.delete(extensionId);
      this.disabledCoreExtensionIds.delete(targetId);
      this.disabledCoreExtensionIds.delete(extensionId);
      this.manifests.delete(targetId);
      this.manifests.delete(extensionId);
      this.constructors.delete(targetId);
      this.constructors.delete(extensionId);

      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`flint_extension_data_${targetId}`);
        localStorage.removeItem(`flint_plugin_data_${targetId}`);
        localStorage.removeItem(`flint_extension_data_${extensionId}`);
        localStorage.removeItem(`flint_plugin_data_${extensionId}`);

        const cleanLocalStorageArray = (key: string) => {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const next = list.filter((id) => id !== targetId && id !== extensionId);
                localStorage.setItem(key, JSON.stringify(next));
              }
            }
          } catch {}
        };
        cleanLocalStorageArray('flint_installed_community_extensions');
        cleanLocalStorageArray('flint_installed_community_plugins');
      }

      this.saveConfig();
      this.app.events.emit('extension:uninstalled' as any, { extensionId: targetId });
      this.app.events.emit('plugin:uninstalled' as any, { pluginId: targetId });
      this.recomputeSnapshot();
      this.notify();

      console.log(`[ExtensionManager] Uninstalled extension "${targetId}"`);
      return true;
    } catch (err) {
      console.error(`[ExtensionManager] Error uninstalling extension "${extensionId}":`, err);
      return false;
    }
  }

  public async uninstallPlugin(pluginId: string): Promise<boolean> {
    return this.uninstallExtension(pluginId);
  }

  public isExtensionEnabled(extensionId: string): boolean {
    const manifest = this.getExtensionManifest(extensionId);
    if (!manifest) {
      return false;
    }
    const targetId = manifest.id;
    const aliases = new Set<string>([targetId, extensionId]);
    if (targetId.startsWith('flint-')) {
      aliases.add(targetId.slice(6));
    } else {
      aliases.add(`flint-${targetId}`);
    }
    if (extensionId) {
      if (extensionId.startsWith('flint-')) {
        aliases.add(extensionId.slice(6));
      } else {
        aliases.add(`flint-${extensionId}`);
      }
    }

    if (manifest.isCore) {
      if (manifest.defaultDisabled) {
        for (const alias of aliases) {
          if (this.disabledCoreExtensionIds.has(alias)) {
            return false;
          }
        }
        for (const alias of aliases) {
          if (this.enabledExtensionIds.has(alias)) {
            return true;
          }
        }
        return false;
      }

      for (const alias of aliases) {
        if (this.disabledCoreExtensionIds.has(alias)) {
          return false;
        }
      }
      return true;
    }

    for (const alias of aliases) {
      if (this.enabledExtensionIds.has(alias)) {
        return true;
      }
    }
    return false;
  }

  public isPluginEnabled(pluginId: string): boolean {
    return this.isExtensionEnabled(pluginId);
  }

  public isExtensionInstalled(extensionId: string): boolean {
    return this.getExtensionManifest(extensionId) !== undefined;
  }

  public isPluginInstalled(pluginId: string): boolean {
    return this.isExtensionInstalled(pluginId);
  }

  public getExtension(extensionId: string): Extension | undefined {
    return this.instances.get(extensionId);
  }

  public getPlugin(pluginId: string): Extension | undefined {
    return this.getExtension(pluginId);
  }

  public getAllManifests(): ExtensionManifest[] {
    return this.cachedSnapshot.all;
  }

  public getCoreExtensions(): ExtensionManifest[] {
    return this.cachedSnapshot.core;
  }

  public getCorePlugins(): ExtensionManifest[] {
    return this.getCoreExtensions();
  }

  public getCommunityExtensions(): ExtensionManifest[] {
    return this.cachedSnapshot.community;
  }

  public getCommunityPlugins(): ExtensionManifest[] {
    return this.getCommunityExtensions();
  }

  public getExtensionManifest(id: string): ExtensionManifest | undefined {
    if (!id) return undefined;
    if (this.manifests.has(id)) return this.manifests.get(id);
    if (id.startsWith('flint-') && this.manifests.has(id.slice(6))) {
      return this.manifests.get(id.slice(6));
    }
    if (!id.startsWith('flint-') && this.manifests.has(`flint-${id}`)) {
      return this.manifests.get(`flint-${id}`);
    }
    const lower = id.toLowerCase();
    for (const [mId, manifest] of this.manifests.entries()) {
      if (mId.toLowerCase() === lower || manifest.name.toLowerCase() === lower) {
        return manifest;
      }
    }
    return undefined;
  }

  public getViewExtensionState(viewType: string): 
    | { state: 'active'; view: ViewDefinition }
    | { state: 'disabled'; extensionId: string; manifest: ExtensionManifest; viewTitle: string }
    | { state: 'deleted'; extensionId?: string; viewType: string }
    | { state: 'not_extension' } {
    if (!viewType || viewType === 'document') {
      return { state: 'not_extension' };
    }

    const regView = this.app.views.getView(viewType);
    if (regView) {
      return { state: 'active', view: regView };
    }

    const CORE_VIEW_TO_EXTENSION: Record<string, string> = {
      graph: 'graph-view',
      'graph-view': 'graph-view',
      marketplace: 'marketplace',
      canvas: 'canvas',
      'canvas-view': 'canvas',
      tasks: 'tasks',
      'tasks-view': 'tasks',
    };

    const coreExtensionId = CORE_VIEW_TO_EXTENSION[viewType];
    if (coreExtensionId) {
      const manifest = this.getExtensionManifest(coreExtensionId);
      if (manifest && this.disabledCoreExtensionIds.has(coreExtensionId)) {
        return {
          state: 'disabled',
          extensionId: coreExtensionId,
          manifest,
          viewTitle: manifest.name || viewType,
        };
      }
      const secondaryLookup = this.app.views.getView(coreExtensionId);
      if (secondaryLookup) {
        return { state: 'active', view: secondaryLookup };
      }
    }

    // Core built-in views are permanent and must never be marked as deleted or trigger tab removal
    const isBuiltinCore = ['graph', 'canvas', 'tasks', 'marketplace', 'extension-doc'].includes(viewType);
    if (isBuiltinCore) {
      return { state: 'not_extension' };
    }

    // Guard against marking views as deleted while extensions are still booting up asynchronously
    if (!this.isInitialized) {
      return { state: 'not_extension' };
    }

    const info = this.app.views.getViewExtensionInfo(viewType);
    if (!info) {
      return { state: 'deleted', viewType };
    }

    const manifest = this.getExtensionManifest(info.extensionId);
    if (manifest) {
      return {
        state: 'disabled',
        extensionId: info.extensionId,
        manifest,
        viewTitle: info.title || manifest.name || viewType,
      };
    }

    return { state: 'deleted', extensionId: info.extensionId, viewType };
  }

  public getSnapshot(): ExtensionListSnapshot {
    return this.cachedSnapshot;
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private recomputeSnapshot(): void {
    const all = Array.from(this.manifests.values());
    this.cachedSnapshot = {
      all,
      core: all.filter((m) => m.isCore === true),
      community: all.filter((m) => !m.isCore),
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[ExtensionManager] Listener error:', err);
      }
    });
  }

  // Configuration persistence
  private loadConfig(): void {
    try {
      const raw = localStorage.getItem('flint_extensions_config') || localStorage.getItem('flint_plugins_config');
      if (raw) {
        const config = JSON.parse(raw);
        const disabledCore =
          config.disabledCoreExtensions ||
          config.disabledCorePlugins ||
          config.disabledCorePluginIds ||
          [];
        this.disabledCoreExtensionIds = new Set(Array.isArray(disabledCore) ? disabledCore : []);
        const enabled = config.enabledExtensions || config.enabledPlugins;
        this.enabledExtensionIds = new Set(Array.isArray(enabled) ? enabled : []);
        if (this.enabledExtensionIds.has('flint-folder-icons')) {
          this.enabledExtensionIds.delete('flint-folder-icons');
        }
      } else {
        this.enabledExtensionIds = new Set();
      }
    } catch (e) {
      console.warn('[ExtensionManager] Error loading extension config:', e);
    }
  }

  private saveConfig(): void {
    try {
      const disabledList = Array.from(this.disabledCoreExtensionIds);
      const enabledList = Array.from(this.enabledExtensionIds);
      const config = {
        enabledExtensions: enabledList,
        disabledCoreExtensions: disabledList,
        enabledPlugins: enabledList,
        disabledCorePlugins: disabledList,
        disabledCorePluginIds: disabledList,
      };
      localStorage.setItem('flint_extensions_config', JSON.stringify(config));
      localStorage.setItem('flint_plugins_config', JSON.stringify(config));
    } catch (e) {
      console.warn('[ExtensionManager] Error saving extension config:', e);
    }
  }

  // Extension data storage
  public async loadExtensionData(extensionId: string): Promise<any> {
    try {
      const raw = localStorage.getItem(`flint_extension_data_${extensionId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`[ExtensionManager] Failed to load data for extension ${extensionId}:`, e);
      return null;
    }
  }

  public async saveExtensionData(extensionId: string, data: any): Promise<void> {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(`flint_extension_data_${extensionId}`, json);
    } catch (e) {
      console.warn(`[ExtensionManager] Failed to save data for extension ${extensionId}:`, e);
    }
  }
}

export default ExtensionManager;
