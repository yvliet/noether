import { ExtensionSettingTab, Disposable } from '../extensions/types';

export class SettingRegistry {
  private tabs: Map<string, ExtensionSettingTab> = new Map();
  private listeners: Set<() => void> = new Set();
  private cachedTabs: ExtensionSettingTab[] = [];

  public registerSettingTab(tab: ExtensionSettingTab): Disposable {
    this.tabs.set(tab.id, tab);
    this.recomputeCache();
    this.notify();

    return {
      dispose: () => {
        this.unregisterSettingTab(tab.id);
      },
    };
  }

  public unregisterSettingTab(id: string): void {
    if (this.tabs.delete(id)) {
      this.recomputeCache();
      this.notify();
    }
  }

  public getTabs(): ExtensionSettingTab[] {
    return this.cachedTabs;
  }

  public getTab(id: string): ExtensionSettingTab | undefined {
    return this.tabs.get(id);
  }

  public subscribe(listener: () => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  /**
   * Invokes onRestoreDefaults callbacks across all registered extension setting tabs.
   * Executes sequentially with error isolation to ensure one faulty extension cannot block others.
   */
  public async restoreAllExtensionDefaults(): Promise<void> {
    for (const tab of this.tabs.values()) {
      try {
        if (typeof tab.onRestoreDefaults === 'function') {
          await tab.onRestoreDefaults();
        }
      } catch (err) {
        console.error(`[SettingRegistry] Error restoring defaults for tab "${tab.id}":`, err);
      }
    }
  }

  /**
   * Restores default settings for an individual extension tab by tab ID or alias.
   */
  public async restoreTabDefaults(tabId: string): Promise<void> {
    let tab = this.tabs.get(tabId);
    if (!tab) {
      for (const t of this.tabs.values()) {
        if (t.id === tabId || t.extensionId === tabId || t.id.endsWith(`:${tabId}`)) {
          tab = t;
          break;
        }
      }
    }
    if (tab && typeof tab.onRestoreDefaults === 'function') {
      try {
        await tab.onRestoreDefaults();
      } catch (err) {
        console.error(`[SettingRegistry] Error restoring defaults for tab "${tabId}":`, err);
      }
    }
  }

  private recomputeCache(): void {
    this.cachedTabs = Array.from(this.tabs.values());
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[SettingRegistry] Error in listener:', err);
      }
    });
  }
}
