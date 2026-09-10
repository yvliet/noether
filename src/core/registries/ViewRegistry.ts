/**
 * @module ViewRegistry
 * @description
 * Registry for custom workspace views rendered in the main content area.
 * Plugins register views during onload(), and the workspace router
 * renders the appropriate view based on the active tab's view_type.
 *
 * Tracks plugin ownership dynamically to handle views from disabled
 * or uninstalled plugins gracefully.
 *
 * @since 0.1.0
 */

import { ViewDefinition, ViewBehaviorPolicy, Disposable } from '../extensions/types';

export class ViewRegistry {
  private views: Map<string, ViewDefinition> = new Map();
  private listeners: Set<() => void> = new Set();
  private cachedViews: ViewDefinition[] = [];

  /**
   * Dynamic mapping from view type string to owning extension metadata.
   * Populated automatically when extensions register views without hardcoded entries.
   */
  private viewTypeToExtension: Map<string, { extensionId: string; title?: string }> = new Map();

  /**
   * Registers a new custom view definition.
   *
   * @param view - View configuration including type key, title, icon, and render function.
   * @returns A Disposable to unregister the view.
   * @since 0.1.0
   */
  public registerView(view: ViewDefinition): Disposable {
    const raw = view as any;
    const typeKey = view.type || raw.id;
    const title = view.title || raw.name || typeKey;
    const normalizedView: ViewDefinition = {
      ...view,
      type: typeKey,
      title,
    };

    this.views.set(typeKey, normalizedView);
    if (raw.id && raw.id !== typeKey) {
      this.views.set(raw.id, normalizedView);
    }

    const extId = view.extensionId || raw.extensionId;
    if (extId) {
      this.viewTypeToExtension.set(typeKey, { extensionId: extId, title });
      if (raw.id && raw.id !== typeKey) {
        this.viewTypeToExtension.set(raw.id, { extensionId: extId, title });
      }
    }
    this.recomputeCache();
    this.notify();

    return {
      dispose: () => {
        this.unregisterView(typeKey);
      },
    };
  }

  /**
   * Unregisters a view definition by its type key.
   *
   * @param type - Unique view type key.
   * @since 0.1.0
   */
  public unregisterView(type: string): void {
    let changed = this.views.delete(type);
    for (const [key, v] of Array.from(this.views.entries())) {
      if (v.type === type || (v as any).id === type) {
        this.views.delete(key);
        changed = true;
      }
    }
    if (changed) {
      this.recomputeCache();
      this.notify();
    }
  }

  /**
   * Retrieves ownership information for a view type (for disabled extension placeholders).
   *
   * @param type - View type key.
   * @since 0.2.0
   */
  public getViewExtensionInfo(type: string): { extensionId: string; title?: string } | undefined {
    return this.viewTypeToExtension.get(type);
  }

  /**
   * Explicitly associates a view type with an extension identifier.
   *
   * @param type - View type key.
   * @param extensionId - Owning extension ID.
   * @param title - Display title for placeholder states.
   * @since 0.2.0
   */
  public registerViewExtensionMapping(type: string, extensionId: string, title?: string): void {
    this.viewTypeToExtension.set(type, { extensionId, title });
  }

  /**
   * Retrieves a registered view definition by its type key.
   *
   * @param type - View type key.
   * @since 0.1.0
   */
  public getView(type: string): ViewDefinition | undefined {
    if (!type) return undefined;
    const direct = this.views.get(type);
    if (direct) return direct;

    // View type alias resolution for core extension view types
    const VIEW_ALIASES: Record<string, string[]> = {
      marketplace: ['extensions-marketplace'],
      'extensions-marketplace': ['marketplace'],
      graph: ['graph-view'],
      'graph-view': ['graph'],
      tasks: ['tasks-view'],
      'tasks-view': ['tasks'],
      canvas: ['canvas-view'],
      'canvas-view': ['canvas'],
    };

    const aliases = VIEW_ALIASES[type];
    if (aliases) {
      for (const alias of aliases) {
        const found = this.views.get(alias);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * Retrieves behavioral policy flags for a view type.
   * @since 0.4.6
   */
  public getBehaviorPolicy(type: string): ViewBehaviorPolicy | undefined {
    return this.getView(type)?.behavior;
  }

  /**
   * Retrieves the display title for a view type, or returns a formatted fallback.
   * @since 0.4.6
   */
  public getViewTitle(type: string, fallback?: string): string {
    const view = this.getView(type);
    if (view?.title) return view.title;
    if (fallback !== undefined) return fallback;
    return type
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Retrieves the icon for a view type, if registered.
   * @since 0.4.6
   */
  public getViewIcon(type: string): React.ReactNode | undefined {
    return this.getView(type)?.icon;
  }

  /**
   * Checks whether a view type is currently registered.
   * @since 0.4.6
   */
  public isRegistered(type: string): boolean {
    return Boolean(this.getView(type));
  }

  /**
   * Returns a snapshot array of all currently registered active views.
   * @since 0.1.0
   */
  public getAllViews(): ViewDefinition[] {
    return this.cachedViews;
  }

  /**
   * Subscribes to changes in the view registry (additions/removals).
   *
   * @param listener - Callback invoked on registry changes.
   * @returns A Disposable to cancel the subscription.
   * @since 0.1.0
   */
  public subscribe(listener: () => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private recomputeCache(): void {
    this.cachedViews = Array.from(this.views.values());
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[ViewRegistry] Error in listener:', err);
      }
    });
  }
}

/**
 * Shared central ViewRegistry singleton instance.
 * Exposed on FlintApp.views and imported directly across layout headers and stores.
 * @since 0.4.6
 */
export const viewRegistry = new ViewRegistry();
