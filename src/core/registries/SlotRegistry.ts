/**
 * @module SlotRegistry
 * @description
 * Inversion of Control (IoC) registry for dynamic UI Portal slots in Flint.
 * Enables community extensions and core plugins to mount React components
 * directly into designated host layout slots (such as viewport overlays,
 * floating toolbars, minimaps, and workspace root) without DOM monkey-patching.
 *
 * Performance Invariants:
 * - O(1) slot collection lookups via Map-indexed bucket storage.
 * - Array caching for sub-millisecond iteration during React re-renders.
 * - Synchronous listener notifications for instant UI mounting and unmounting.
 *
 * @since 0.4.0
 */

import type {
  PortalSlotDefinition,
  PortalSlotLocation,
  PortalSlotContext,
  Disposable,
} from '../extensions/types';

const EMPTY_SLOTS: readonly PortalSlotDefinition[] = Object.freeze([]);

export class SlotRegistry {
  /** Map of slot location -> Map of slot ID -> PortalSlotDefinition */
  private slots: Map<string, Map<string, PortalSlotDefinition>> = new Map();
  /** Cached array of definitions per slot location for instant render passes */
  private cachedSlots: Map<string, PortalSlotDefinition[]> = new Map();
  /** Event listeners subscribed to slot registration changes */
  private listeners: Set<() => void> = new Set();

  /**
   * Registers a dynamic portal slot item into the application slot registry.
   *
   * @param definition - Configuration including target slot, order, predicate, and render function.
   * @returns Disposable that unregisters the slot item on cleanup.
   */
  public registerSlot(definition: PortalSlotDefinition): Disposable {
    const loc = definition.slot;
    let bucket = this.slots.get(loc);
    if (!bucket) {
      bucket = new Map();
      this.slots.set(loc, bucket);
    }

    bucket.set(definition.id, definition);
    this.recomputeSlotCache(loc);
    this.notify();

    return {
      dispose: () => {
        this.unregisterSlot(loc, definition.id);
      },
    };
  }

  /**
   * Unregisters a previously registered slot item by location and ID.
   */
  public unregisterSlot(location: PortalSlotLocation, id: string): void {
    const bucket = this.slots.get(location);
    if (bucket && bucket.delete(id)) {
      if (bucket.size === 0) {
        this.slots.delete(location);
      }
      this.recomputeSlotCache(location);
      this.notify();
    }
  }

  /**
   * Retrieves raw registered slot definitions for a given location without evaluating predicates.
   * Returns a referentially stable cached array or frozen empty array suitable for useSyncExternalStore snapshots.
   *
   * @param location - Target slot anchor location.
   * @returns Stable readonly array of active definitions sorted by order priority.
   */
  public getRawSlots(location: PortalSlotLocation): readonly PortalSlotDefinition[] {
    return this.cachedSlots.get(location) ?? EMPTY_SLOTS;
  }

  /**
   * Retrieves all registered slot definitions for a given location, filtered by predicate and sorted by order.
   *
   * @param location - Target slot anchor location.
   * @param context - Optional context to evaluate active predicates against.
   * @returns Readonly array of active definitions sorted by order priority.
   */
  public getSlots(
    location: PortalSlotLocation,
    context?: PortalSlotContext
  ): readonly PortalSlotDefinition[] {
    const cached = this.cachedSlots.get(location);
    if (!cached || cached.length === 0) {
      return EMPTY_SLOTS;
    }

    if (!context) {
      return cached;
    }

    const hasPredicates = cached.some((item) => typeof item.predicate === 'function');
    if (!hasPredicates) {
      return cached;
    }

    return cached.filter((item) => {
      if (!item.predicate) return true;
      try {
        return item.predicate(context);
      } catch (err) {
        console.error(`[SlotRegistry] Error evaluating predicate for slot item "${item.id}":`, err);
        return false;
      }
    });
  }

  /**
   * Subscribes to registry changes for reactive React UI re-rendering.
   */
  public subscribe(listener: () => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private recomputeSlotCache(location: string): void {
    const bucket = this.slots.get(location);
    if (!bucket || bucket.size === 0) {
      this.cachedSlots.delete(location);
      return;
    }

    const list = Array.from(bucket.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this.cachedSlots.set(location, list);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[SlotRegistry] Error in change listener:', err);
      }
    });
  }
}
