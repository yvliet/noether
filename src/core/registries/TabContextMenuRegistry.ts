/**
 * @module TabContextMenuRegistry
 * @description
 * Inversion of Control (IoC) registry enabling extensions and host subsystems to register
 * contextual actions on document tabs (e.g. "Pin Tab", "Duplicate Tab", "Copy Note Link",
 * "Close Tabs to Left").
 *
 * @since 1.2.0
 */

import React from 'react';
import type { NoetherApp } from '../app/NoetherApp';
import type { DocumentItem, TabItem } from '@/types';
import type { Disposable } from '../extensions/types';

export interface TabContextMenuContext {
  tab: TabItem;
  paneId: string;
  index: number;
  totalTabs: number;
  doc: DocumentItem | null;
  app: NoetherApp;
}

export interface TabContextMenuActionDefinition {
  id: string;
  title: string | ((ctx: TabContextMenuContext) => string);
  icon?: React.ReactNode | ((ctx: TabContextMenuContext) => React.ReactNode);
  onClick: (ctx: TabContextMenuContext) => void | Promise<void>;
  isVisible?: (ctx: TabContextMenuContext) => boolean;
  isEnabled?: (ctx: TabContextMenuContext) => boolean;
  isDanger?: boolean;
  section?: 'tabs' | 'split' | 'actions' | 'danger';
  order?: number;
}

export class TabContextMenuRegistry {
  private actions: Map<string, TabContextMenuActionDefinition> = new Map();
  private listeners: Set<() => void> = new Set();

  public registerAction(action: TabContextMenuActionDefinition): Disposable {
    this.actions.set(action.id, action);
    this.notify();

    return {
      dispose: () => {
        this.actions.delete(action.id);
        this.notify();
      },
    };
  }

  public unregisterAction(id: string): void {
    if (this.actions.delete(id)) {
      this.notify();
    }
  }

  public getAllActions(): TabContextMenuActionDefinition[] {
    return Array.from(this.actions.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  public getActions(ctx: TabContextMenuContext, section?: string): TabContextMenuActionDefinition[] {
    return Array.from(this.actions.values())
      .filter((a) => {
        if (section) {
          const s = a.section || 'actions';
          if (s !== section) return false;
        }
        if (a.isVisible && !a.isVisible(ctx)) return false;
        return true;
      })
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
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
        console.error('[TabContextMenuRegistry] Notification error:', err);
      }
    }
  }
}

export const tabContextMenuRegistry = new TabContextMenuRegistry();
