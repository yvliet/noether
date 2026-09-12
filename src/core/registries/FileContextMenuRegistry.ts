/**
 * @module FileContextMenuRegistry
 * @description
 * Inversion of Control (IoC) registry allowing extensions to register contextual
 * actions for files and folders in the file tree and explorer context menus.
 *
 * @since 0.4.6
 */

import React from 'react';
import type { NoetherApp } from '../app/NoetherApp';
import type { DocumentItem } from '@/types';
import type { Disposable } from '../extensions/types';

export interface FileContextMenuContext {
  item: DocumentItem;
  selectedDocIds: string[];
  isMulti: boolean;
  app: NoetherApp;
}

export interface FileContextMenuActionDefinition {
  id: string;
  title: string | ((ctx: FileContextMenuContext) => string);
  icon?: React.ReactNode | ((ctx: FileContextMenuContext) => React.ReactNode);
  onClick: (ctx: FileContextMenuContext) => void | Promise<void>;
  isVisible?: (ctx: FileContextMenuContext) => boolean;
  isDanger?: boolean;
  section?: 'open' | 'modify' | 'path' | 'actions' | 'danger';
  order?: number;
}

export class FileContextMenuRegistry {
  private actions: Map<string, FileContextMenuActionDefinition> = new Map();
  private listeners: Set<() => void> = new Set();

  public registerAction(action: FileContextMenuActionDefinition): Disposable {
    this.actions.set(action.id, action);
    this.notify();

    return {
      dispose: () => {
        this.actions.delete(action.id);
        this.notify();
      },
    };
  }

  public getActions(ctx: FileContextMenuContext, section?: string): FileContextMenuActionDefinition[] {
    return Array.from(this.actions.values())
      .filter((a) => {
        if (section && a.section !== section) return false;
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
        console.error('[FileContextMenuRegistry] Notification error:', err);
      }
    }
  }
}

export const fileContextMenuRegistry = new FileContextMenuRegistry();
