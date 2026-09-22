/**
 * @module CanvasCardRegistry
 * @description
 * Inversion of Control (IoC) registry enabling extensions to register custom card renderers
 * for Noether's infinite canvas (e.g. Kanban boards, 3D model viewers, Excalidraw drawings,
 * interactive charts, specialized widgets).
 *
 * Decouples canvas card rendering from hardcoded file extension checks, allowing extensions
 * to provide tailored card representations while falling back to standard media/document views.
 *
 * @since 1.2.0
 */

import React from 'react';
import type { NoetherApp } from '@/core/app/NoetherApp';
import type { DocumentItem } from '@/types';
import type { Disposable } from '@/core/extensions/types';

export interface CanvasCardRenderContext {
  node: any;
  doc: DocumentItem | null;
  contentJson?: string;
  isEditingText?: boolean;
  app: NoetherApp;
  onTextChange?: (newText: string) => void;
  onDocContentChange?: (docId: string, newContent: string) => void;
  onTextBlur?: () => void;
  onImageDimensions?: (naturalWidth: number, naturalHeight: number) => void;
  onTaskToggle?: (taskText: string, currentChecked: boolean) => void;
}

export interface CanvasCardRendererDefinition {
  /** Unique renderer identifier (e.g. 'kanban', 'model-3d', 'excalidraw', 'chart'). */
  id: string;
  /** Human-readable display name. */
  name?: string;
  /**
   * Predicate determining if this renderer handles the given canvas node or document.
   * Can match on node.type, doc.doc_type, file extension, or metadata.
   */
  matches: (context: CanvasCardRenderContext) => boolean;
  /** React component or function rendering the card body. */
  render: (context: CanvasCardRenderContext) => React.ReactNode;
  /** Priority ordering (higher numbers execute first, default: 100). */
  order?: number;
}

export class CanvasCardRegistry {
  private renderers: Map<string, CanvasCardRendererDefinition> = new Map();
  private listeners: Set<() => void> = new Set();
  private cachedRenderers: CanvasCardRendererDefinition[] = [];

  public registerRenderer(renderer: CanvasCardRendererDefinition): Disposable {
    this.renderers.set(renderer.id, renderer);
    this.recompute();
    this.notify();

    return {
      dispose: () => {
        this.unregisterRenderer(renderer.id);
      },
    };
  }

  public unregisterRenderer(id: string): void {
    if (this.renderers.delete(id)) {
      this.recompute();
      this.notify();
    }
  }

  public getRenderers(): CanvasCardRendererDefinition[] {
    return this.cachedRenderers;
  }

  public findRenderer(ctx: CanvasCardRenderContext): CanvasCardRendererDefinition | undefined {
    return this.cachedRenderers.find((r) => {
      try {
        return r.matches(ctx);
      } catch (err) {
        console.error(`[CanvasCardRegistry] Error evaluating matches for renderer "${r.id}":`, err);
        return false;
      }
    });
  }

  private recompute(): void {
    this.cachedRenderers = Array.from(this.renderers.values()).sort(
      (a, b) => (b.order ?? 100) - (a.order ?? 100)
    );
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
        console.error('[CanvasCardRegistry] Notification error:', err);
      }
    }
  }
}

export const canvasCardRegistry = new CanvasCardRegistry();

export const useCanvasCardRenderers = (): CanvasCardRendererDefinition[] => {
  return React.useSyncExternalStore(
    (onStoreChange) => canvasCardRegistry.subscribe(onStoreChange),
    () => canvasCardRegistry.getRenderers()
  );
};

