/**
 * @module EventBus
 * @description
 * High-performance, lightweight publish-subscribe event bus for decoupled
 * communication across Noether plugins and core systems.
 *
 * Supports synchronous execution for critical document lifecycle events
 * and microtask deferred execution for non-blocking UI notifications.
 *
 * @since 0.1.0
 */

import { EventKey, EventCallback, WorkspaceEvents } from './events';
import { Disposable } from '../extensions/types';

export class EventBus {
  private listeners: Map<EventKey, Set<EventCallback<any>>> = new Map();

  /**
   * Set of events that execute synchronously on the caller's stack frame.
   * Other events are queued via `queueMicrotask` to avoid blocking main thread renders.
   */
  private criticalEvents: Set<string> = new Set([
    'document:opened',
    'document:saved',
    'document:deleted',
    'document:renamed',
  ]);

  /**
   * Registers an event listener callback for the specified event key.
   *
   * @param event - Event key name.
   * @param callback - Event handler function.
   * @returns A Disposable object to unregister the listener.
   * @since 0.1.0
   */
  public on<K extends EventKey>(event: K, callback: EventCallback<K>): Disposable {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return {
      dispose: () => {
        this.off(event, callback);
      },
    };
  }

  /**
   * Unregisters an event listener callback.
   *
   * @param event - Event key name.
   * @param callback - The callback function to remove.
   * @since 0.1.0
   */
  public off<K extends EventKey>(event: K, callback: EventCallback<K>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Marks an event key as critical, causing its subscribers to be invoked synchronously.
   *
   * @param event - Event key name.
   * @since 0.2.0
   */
  public markCritical<K extends EventKey>(event: K): void {
    this.criticalEvents.add(event as string);
  }

  /**
   * Emits an event with strongly-typed payload data to all registered listeners.
   *
   * @param event - Event key name.
   * @param data - Strongly-typed payload data matching the event schema.
   * @since 0.1.0
   */
  public emit<K extends EventKey>(event: K, data: WorkspaceEvents[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks && callbacks.size > 0) {
      const isCritical = this.criticalEvents.has(event as string);

      callbacks.forEach((cb) => {
        if (isCritical) {
          try {
            cb(data);
          } catch (err) {
            console.error(`[EventBus] Error in synchronous listener for event "${event}":`, err);
          }
        } else {
          queueMicrotask(() => {
            try {
              cb(data);
            } catch (err) {
              console.error(`[EventBus] Error in async listener for event "${event}":`, err);
            }
          });
        }
      });
    }
  }

  /**
   * Removes all registered event listeners across all event types.
   * @since 0.1.0
   */
  public clear(): void {
    this.listeners.clear();
  }
}
