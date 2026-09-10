import { ActionRailItem, Disposable } from '../extensions/types';

export type { ActionRailItem };

export class ActionRailRegistry {
  private items: Map<string, ActionRailItem> = new Map();
  private listeners: Set<() => void> = new Set();
  private cachedItems: ActionRailItem[] = [];

  public registerActionRailItem(item: ActionRailItem): Disposable {
    this.items.set(item.id, item);
    this.recomputeCache();
    this.notify();

    return {
      dispose: () => {
        this.unregisterActionRailItem(item.id);
      },
    };
  }

  public unregisterActionRailItem(id: string): void {
    if (this.items.delete(id)) {
      this.recomputeCache();
      this.notify();
    }
  }

  public getItems(): ActionRailItem[] {
    return this.cachedItems;
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
    this.cachedItems = Array.from(this.items.values()).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[ActionRailRegistry] Error in listener:', err);
      }
    });
  }
}
