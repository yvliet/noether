import { TabDecoratorDefinition, Disposable } from '../extensions/types';

export class TabDecoratorRegistry {
  private decorators: Map<string, TabDecoratorDefinition> = new Map();
  private listeners: Set<() => void> = new Set();
  private cachedDecorators: TabDecoratorDefinition[] = [];

  public registerTabDecorator(decorator: TabDecoratorDefinition): Disposable {
    this.decorators.set(decorator.id, decorator);
    this.recomputeDecorators();
    this.notify();

    return {
      dispose: () => {
        this.decorators.delete(decorator.id);
        this.recomputeDecorators();
        this.notify();
      },
    };
  }

  public getDecorators(): TabDecoratorDefinition[] {
    return this.cachedDecorators;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private recomputeDecorators(): void {
    this.cachedDecorators = Array.from(this.decorators.values()).sort(
      (a, b) => (b.order ?? 0) - (a.order ?? 0)
    );
  }

  public notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('[TabDecoratorRegistry] Listener error:', err);
      }
    });
  }
}
