/**
 * @module DocumentHeaderActionRegistry
 * @description
 * Inversion of Control (IoC) registry allowing extensions to register custom
 * action buttons in the Document/Page sub-header without coupling native layout
 * components to extension-specific features (such as bookmarks).
 *
 * @since 0.4.6
 */

import React from 'react';
import type { FlintApp } from '../app/FlintApp';
import type { DocumentItem, TabItem } from '@/types';
import type { Disposable } from '../extensions/types';

export interface DocumentHeaderActionContext {
  document: DocumentItem | null;
  activeTab: TabItem | null;
  app: FlintApp;
}

export interface DocumentHeaderActionDefinition {
  id: string;
  title: string | ((ctx: DocumentHeaderActionContext) => string);
  icon: (ctx: DocumentHeaderActionContext) => React.ReactNode;
  onClick: (ctx: DocumentHeaderActionContext) => void | Promise<void>;
  isVisible?: (ctx: DocumentHeaderActionContext) => boolean;
  isEnabled?: (ctx: DocumentHeaderActionContext) => boolean;
  className?: string | ((ctx: DocumentHeaderActionContext) => string);
  order?: number;
}

export class DocumentHeaderActionRegistry {
  private actions: Map<string, DocumentHeaderActionDefinition> = new Map();
  private listeners: Set<() => void> = new Set();

  public registerAction(action: DocumentHeaderActionDefinition): Disposable {
    this.actions.set(action.id, action);
    this.notify();

    return {
      dispose: () => {
        this.actions.delete(action.id);
        this.notify();
      },
    };
  }

  public getActions(): DocumentHeaderActionDefinition[] {
    return Array.from(this.actions.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
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
        console.error('[DocumentHeaderActionRegistry] Notification error:', err);
      }
    }
  }
}

export const documentHeaderActionRegistry = new DocumentHeaderActionRegistry();
