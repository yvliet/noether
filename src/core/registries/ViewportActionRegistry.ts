/**
 * @module ViewportActionRegistry
 * @description
 * Inversion of Control (IoC) registry enabling extensions to register interactive
 * action buttons across viewport corners (top-left, top-right, bottom-left, bottom-right)
 * in horizontal or vertical orientations with view scoping.
 *
 * Replaces the legacy DocumentHeaderActionRegistry with a universal, corner-aware architecture.
 */

import React from 'react';
import type { NoetherApp } from '../app/NoetherApp';
import type { DocumentItem, TabItem } from '@/types';
import type { Disposable } from '../extensions/types';

export type ViewportCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type ViewportActionDirection = 'horizontal' | 'vertical';
export type ViewportScope = 'all' | 'document' | 'canvas' | 'graph' | string;

export interface ViewportActionContext {
  document: DocumentItem | null;
  activeTab: TabItem | null;
  app: NoetherApp;
  viewType?: string;
  isSidebar?: boolean;
}

export interface ViewportActionDefinition {
  id: string;
  title: string | ((ctx: ViewportActionContext) => string);
  icon: (ctx: ViewportActionContext) => React.ReactNode;
  onClick: (ctx: ViewportActionContext) => void | Promise<void>;
  corner: ViewportCorner;
  direction?: ViewportActionDirection;
  scope?: ViewportScope | ViewportScope[];
  order?: number;
  isVisible?: (ctx: ViewportActionContext) => boolean;
  isEnabled?: (ctx: ViewportActionContext) => boolean;
  isActive?: (ctx: ViewportActionContext) => boolean;
  badge?: (ctx: ViewportActionContext) => React.ReactNode;
  className?: string | ((ctx: ViewportActionContext) => string);
}

function matchesScope(scope: ViewportScope | ViewportScope[] | undefined, viewType: string): boolean {
  if (!scope || scope === 'document') {
    return !viewType || viewType === 'document';
  }
  if (scope === 'all') return true;
  if (Array.isArray(scope)) {
    return scope.includes('all') || scope.includes(viewType || 'document');
  }
  return scope === (viewType || 'document');
}

export class ViewportActionRegistry {
  private actions: Map<string, ViewportActionDefinition> = new Map();
  private listeners: Set<() => void> = new Set();
  private version = 0;

  public getVersion(): number {
    return this.version;
  }

  public registerAction(action: ViewportActionDefinition): Disposable {
    this.actions.set(action.id, action);
    this.notify();

    return {
      dispose: () => {
        this.unregisterAction(action.id);
      },
    };
  }

  public unregisterAction(id: string): void {
    if (this.actions.delete(id)) {
      this.notify();
    }
  }

  public getActions(
    corner: ViewportCorner,
    direction: ViewportActionDirection = 'horizontal',
    ctx?: ViewportActionContext
  ): ViewportActionDefinition[] {
    const currentView = ctx?.viewType || (ctx?.activeTab?.view_type || ctx?.activeTab?.view_mode || 'document');

    return Array.from(this.actions.values())
      .filter((action) => {
        if (action.corner !== corner) return false;
        if ((action.direction || 'horizontal') !== direction) return false;
        if (!matchesScope(action.scope, currentView)) return false;
        if (ctx && action.isVisible && !action.isVisible(ctx)) return false;
        return true;
      })
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  public getAll(): ViewportActionDefinition[] {
    return Array.from(this.actions.values());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch (err) {
        console.error('[ViewportActionRegistry] Notification error:', err);
      }
    }
  }
}

export const viewportActionRegistry = new ViewportActionRegistry();
