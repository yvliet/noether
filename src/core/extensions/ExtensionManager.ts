import type { FlintApp } from '../app/FlintApp';
import { Extension } from './Extension';
import { ExtensionManifest, ViewDefinition } from './types';
import { ExternalExtensionLoader } from './ExternalExtensionLoader';

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
  public externalLoader: ExternalExtensionLoader;

  private cachedSnapshot: ExtensionListSnapshot = { core: [], community: [], all: [] };

  constructor(app: FlintApp) {
    this.app = app;
    this.externalLoader = new ExternalExtensionLoader(app);
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.loadConfig();

    // 1. Initialize registered bundled extensions immediately
    for (const [id, manifest] of this.manifests.entries()) {
      const isCore = manifest.isCore === true;
      const isEnabled = isCore
        ? !this.disabledCoreExtensionIds.has(id)
        : this.enabledExtensionIds.has(id);

      if (isEnabled && !this.instances.has(id)) {
        await this.enableExtension(id);
      }
    }

    // 2. Discover external extensions from disk
    await this.externalLoader.discoverAndLoadExtensions();

    // 3. Initialize any newly discovered external extensions
    for (const [id, manifest] of this.manifests.entries()) {
      const isCore = manifest.isCore === true;
      const isEnabled = isCore
        ? !this.disabledCoreExtensionIds.has(id)
        : this.enabledExtensionIds.has(id);

      if (isEnabled && !this.instances.has(id)) {
        await this.enableExtension(id);
      }
    }

    // 3. Listen for changes from other windows (e.g., Settings window)
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
  }

  public async syncFromStorage(): Promise<void> {
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

    if (shouldEnable && !this.instances.has(manifest.id)) {
      this.enableExtension(manifest.id);
    }
    this.notify();
  }

  public registerPlugin(manifest: ExtensionManifest, pluginClass: ExtensionConstructor): void {
    this.registerExtension(manifest, pluginClass);
  }

  public async enableExtension(extensionId: string): Promise<boolean> {
    const manifest = this.manifests.get(extensionId);
    const Constructor = this.constructors.get(extensionId);

    if (!manifest || !Constructor) {
      console.warn(`[ExtensionManager] Cannot enable unknown extension: "${extensionId}"`);
      return false;
    }

    if (this.instances.has(extensionId)) {
      return true;
    }

    try {
      const instance = new Constructor(this.app, manifest);
      await instance.onload();
      this.instances.set(extensionId, instance);
      this.app.events.emit('extension:loaded', { extensionId });
      this.app.events.emit('plugin:loaded', { pluginId: extensionId });

      if (manifest.isCore) {
        this.disabledCoreExtensionIds.delete(extensionId);
      } else {
        this.enabledExtensionIds.add(extensionId);
      }

      this.saveConfig();
      this.app.events.emit('extension:enabled', { extensionId });
      this.app.events.emit('plugin:enabled', { pluginId: extensionId });
      this.recomputeSnapshot();
      this.notify();
      console.log(`[ExtensionManager] Enabled extension "${manifest.name}" (${extensionId})`);
      return true;
    } catch (err) {
      console.error(`[ExtensionManager] Failed to load extension "${extensionId}":`, err);
      this.app.workspace.showToast(`Failed to load extension: ${manifest.name}`, 'warning');
      return false;
    }
  }

  public async enablePlugin(pluginId: string): Promise<boolean> {
    return this.enableExtension(pluginId);
  }

  public async disableExtension(extensionId: string): Promise<boolean> {
    const manifest = this.manifests.get(extensionId);
    const instance = this.instances.get(extensionId);

    if (!instance) {
      if (manifest?.isCore) {
        this.disabledCoreExtensionIds.add(extensionId);
        this.saveConfig();
        this.recomputeSnapshot();
        this.notify();
      }
      return true;
    }

    try {
      instance.unload();
      this.instances.delete(extensionId);
      this.externalLoader.removeExtensionStyle(extensionId);
      this.app.events.emit('extension:unloaded', { extensionId });
      this.app.events.emit('plugin:unloaded', { pluginId: extensionId });

      if (manifest?.isCore) {
        this.disabledCoreExtensionIds.add(extensionId);
      } else {
        this.enabledExtensionIds.delete(extensionId);
      }

      this.saveConfig();
      this.app.events.emit('extension:disabled', { extensionId });
      this.app.events.emit('plugin:disabled', { pluginId: extensionId });
      this.recomputeSnapshot();
      this.notify();
      console.log(`[ExtensionManager] Disabled extension "${extensionId}"`);
      return true;
    } catch (err) {
      console.error(`[ExtensionManager] Error disabling extension "${extensionId}":`, err);
      return false;
    }
  }

  public async disablePlugin(pluginId: string): Promise<boolean> {
    return this.disableExtension(pluginId);
  }

  /**
   * Uninstalls an extension:
   * 1. Disables the extension if currently active (triggering unload lifecycle).
   * 2. Executes automated table teardown via ExtensionDatabaseManager, dropping tables with 'drop-on-uninstall'.
   * 3. Purges persistent localStorage configuration and metadata.
   * 4. Emits 'extension:uninstalled' event on the EventBus.
   *
   * @param extensionId - Manifest ID of the extension to uninstall.
   * @returns boolean indicating whether uninstallation completed successfully.
   * @since 0.4.0
   */
  public async uninstallExtension(extensionId: string): Promise<boolean> {
    try {
      // 1. Disable first
      await this.disableExtension(extensionId);

      // 2. Teardown relational database tables
      await this.app.dbManager.teardownExtension(extensionId);

      // 3. Purge from registered sets & storage
      this.enabledExtensionIds.delete(extensionId);
      this.disabledCoreExtensionIds.delete(extensionId);
      this.manifests.delete(extensionId);
      this.constructors.delete(extensionId);

      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`flint_extension_data_${extensionId}`);
        localStorage.removeItem(`flint_plugin_data_${extensionId}`);
      }

      this.saveConfig();
      this.app.events.emit('extension:uninstalled' as any, { extensionId });
      this.app.events.emit('plugin:uninstalled' as any, { pluginId: extensionId });
      this.recomputeSnapshot();
      this.notify();

      console.log(`[ExtensionManager] Uninstalled extension "${extensionId}"`);
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
    const manifest = this.manifests.get(extensionId);
    if (!manifest || manifest.isCore) {
      return !this.disabledCoreExtensionIds.has(extensionId);
    }
    return this.enabledExtensionIds.has(extensionId);
  }

  public isPluginEnabled(pluginId: string): boolean {
    return this.isExtensionEnabled(pluginId);
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

  public getPluginManifest(id: string): ExtensionManifest | undefined {
    return this.getExtensionManifest(id);
  }

  public getViewExtensionState(viewType: string): 
    | { state: 'active'; view: ViewDefinition }
    | { state: 'disabled'; extensionId: string; pluginId: string; manifest: ExtensionManifest; viewTitle: string }
    | { state: 'deleted'; extensionId?: string; pluginId?: string; viewType: string }
    | { state: 'not_plugin' } {
    if (!viewType || viewType === 'document') {
      return { state: 'not_plugin' };
    }

    const regView = this.app.views.getView(viewType);
    if (regView) {
      return { state: 'active', view: regView };
    }

    const info = this.app.views.getViewPluginInfo(viewType);
    if (!info) {
      return { state: 'deleted', viewType };
    }

    const manifest = this.getExtensionManifest(info.pluginId);
    if (manifest) {
      return {
        state: 'disabled',
        extensionId: info.pluginId,
        pluginId: info.pluginId,
        manifest,
        viewTitle: info.title || manifest.name || viewType,
      };
    }

    return { state: 'deleted', extensionId: info.pluginId, pluginId: info.pluginId, viewType };
  }

  public getViewPluginState(viewType: string): any {
    return this.getViewExtensionState(viewType);
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
        this.enabledExtensionIds = new Set(Array.isArray(enabled) ? enabled : ['flint-cascade', 'iconify', 'flint-copilot']);
        if (Array.isArray(enabled) && !enabled.includes('flint-cascade') && !this.disabledCoreExtensionIds.has('flint-cascade')) {
          this.enabledExtensionIds.add('flint-cascade');
        }
        if (Array.isArray(enabled) && !enabled.includes('iconify') && !this.disabledCoreExtensionIds.has('iconify')) {
          this.enabledExtensionIds.add('iconify');
        }
        if (Array.isArray(enabled) && !enabled.includes('flint-copilot') && !this.disabledCoreExtensionIds.has('flint-copilot')) {
          this.enabledExtensionIds.add('flint-copilot');
        }
        if (this.enabledExtensionIds.has('flint-folder-icons')) {
          this.enabledExtensionIds.delete('flint-folder-icons');
        }
      } else {
        this.enabledExtensionIds = new Set(['flint-cascade', 'iconify', 'flint-copilot']);
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
      const raw =
        localStorage.getItem(`flint_extension_data_${extensionId}`) ||
        localStorage.getItem(`flint_plugin_data_${extensionId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`[ExtensionManager] Failed to load data for extension ${extensionId}:`, e);
      return null;
    }
  }

  public async loadPluginData(pluginId: string): Promise<any> {
    return this.loadExtensionData(pluginId);
  }

  public async saveExtensionData(extensionId: string, data: any): Promise<void> {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(`flint_extension_data_${extensionId}`, json);
      localStorage.setItem(`flint_plugin_data_${extensionId}`, json);
    } catch (e) {
      console.warn(`[ExtensionManager] Failed to save data for extension ${extensionId}:`, e);
    }
  }

  public async savePluginData(pluginId: string, data: any): Promise<void> {
    return this.saveExtensionData(pluginId, data);
  }
}

// Backwards compatibility alias
export const PluginManager = ExtensionManager;
export default ExtensionManager;
