import { ContextMenuItemDefinition, ContextMenuScope, Disposable } from '../extensions/types';
import type { NoetherApp } from '../app/NoetherApp';

export class ContextMenuRegistry {
  private items: Map<string, ContextMenuItemDefinition> = new Map();
  private listeners: Set<() => void> = new Set();
  private cachedItems: ContextMenuItemDefinition[] = [];

  public registerItem(item: ContextMenuItemDefinition): Disposable {
    this.items.set(item.id, item);
    this.recomputeCache();
    this.notify();

    return {
      dispose: () => {
        this.unregisterItem(item.id);
      },
    };
  }

  public unregisterItem(id: string): void {
    if (this.items.delete(id)) {
      this.recomputeCache();
      this.notify();
    }
  }

  public getAllItems(): ContextMenuItemDefinition[] {
    return this.cachedItems;
  }

  /**
   * Get items filtered for a specific context scope and evaluated for visibility.
   */
  public getItemsForScope(
    scope?: ContextMenuScope,
    data?: any,
    app?: NoetherApp
  ): ContextMenuItemDefinition[] {
    return this.cachedItems.filter((item) => {
      // 1. Scope filter
      if (scope) {
        if (!item.scope) {
          // If no scope specified, item is considered universal
        } else if (Array.isArray(item.scope)) {
          if (!item.scope.includes(scope) && !item.scope.includes('universal')) {
            return false;
          }
        } else {
          if (item.scope !== scope && item.scope !== 'universal') {
            return false;
          }
        }
      }

      // 2. Visibility filter
      if (item.isVisible && app) {
        try {
          if (!item.isVisible(app, data)) {
            return false;
          }
        } catch (err) {
          console.error(`[ContextMenuRegistry] Error in isVisible for item ${item.id}:`, err);
          return false;
        }
      }

      return true;
    });
  }

  public subscribe(listener: () => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private recomputeCache(): void {
    this.cachedItems = Array.from(this.items.values()).sort(
      (a, b) => (a.order ?? 50) - (b.order ?? 50)
    );
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[ContextMenuRegistry] Error in listener:', err);
      }
    });
  }
}
