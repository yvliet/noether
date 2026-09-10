/**
 * @module SketchExtension
 * @description
 * Flint Sketch core extension.
 * Provides freehand vector drawing and markup overlays directly over markdown notes.
 * Integrates via general-purpose subheader and content overlay portal slots,
 * event-driven cascade cleanup, and document export/import transform hooks.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React from 'react';
import { z } from 'zod';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { sketchReadme } from './readme';
import { initSketchDb, loadSketchFromDb, saveSketchToDb, deleteSketchFromDb, SKETCH_TABLE_DEFINITION } from './sketchDb';
import { serializeSketchToComment, parseSketchFromComment, exportStrokesToSvg } from './sketchEngine';
import { useSketchStore } from './sketchStore';
import { SketchSubheaderButton } from './SketchSubheaderButton';
import { SketchCanvasOverlay } from './SketchCanvasOverlay';
import { SketchSettingsTab } from './SketchSettingsTab';
import { PaintBoardIcon } from '@/components/common/Icons';

export const SKETCH_MANIFEST: ExtensionManifest = {
  id: 'sketch',
  name: 'Sketch',
  version: '1.0.0',
  description: 'Lightweight freehand vector drawing and markup overlay for notes and canvases.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['sketch', 'drawing', 'overlay', 'canvas', 'freehand', 'annotations'],
  readme: sketchReadme,
};

export class SketchExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = SKETCH_MANIFEST) {
    super(app, manifest);
  }

  public async onload(): Promise<void> {
    // 1. Initialize SQLite Schema via declarative defineTable and migration helper
    await this.defineTable(SKETCH_TABLE_DEFINITION);
    await initSketchDb();

    // 2. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'sketch-settings',
      name: 'Sketch',
      icon: <PaintBoardIcon size={14} />,
      render: () => <SketchSettingsTab />,
    });

    // 3. Register Subheader Button Slot (Left of Editing view toggle)
    this.registerPortalSlot({
      id: 'sketch-subheader-btn',
      slot: 'editor:subheader-actions',
      order: 10,
      render: (context) => <SketchSubheaderButton context={context} />,
    });

    // 3. Register Content Overlay Slot (Moves with text flow)
    this.registerPortalSlot({
      id: 'sketch-content-overlay',
      slot: 'editor:content-overlay',
      order: 15,
      render: (context) => (
        <SketchCanvasOverlay anchoringMode="content" context={context} />
      ),
    });

    // 4. Register Viewport Overlay Slot (Pinned to screen glass + Toolbar)
    this.registerPortalSlot({
      id: 'sketch-viewport-overlay',
      slot: 'editor:viewport-overlay',
      order: 15,
      render: (context) => (
        <SketchCanvasOverlay anchoringMode="viewport" context={context} />
      ),
    });

    // 5. Register Document Transform Hook for Markdown HTML Comment Sync
    this.registerDocumentTransformHook({
      id: 'flint-sketch-sync',
      transformExport: async ({ documentId, markdown }) => {
        if (!documentId) return markdown;
        const sketch = await loadSketchFromDb(documentId);
        if (sketch && sketch.strokes && sketch.strokes.length > 0) {
          return markdown + serializeSketchToComment(sketch);
        }
        return markdown;
      },
      transformImport: ({ documentId, markdown }) => {
        const { cleanMarkdown, data } = parseSketchFromComment(markdown, documentId);
        if (data && documentId) {
          saveSketchToDb(data);
        }
        return { markdown: cleanMarkdown, data };
      },
    });

    // 6. Register Command Palette Hotkey (Ctrl+Shift+S)
    this.addCommand({
      id: 'toggle-sketch-overlay',
      title: 'Sketch: Toggle Drawing Overlay',
      hotkey: 'Ctrl+Shift+S',
      action: () => {
        useSketchStore.getState().toggleSketching();
      },
    });

    // 7. Automatic Cascade Cleanup on Document Deletion
    this.onEvent('document:deleted', async ({ id }) => {
      await deleteSketchFromDb(id);
    });

    // 8. Mandatory MCP AI Tool Registrations
    this.registerTool({
      name: 'get_document_drawings',
      description: 'Retrieves vector drawing metadata, stroke counts, and anchoring mode for a document',
      category: 'sketch',
      schema: z.object({
        documentId: z.string().describe('The document ID to inspect drawings for'),
      }),
      handler: async ({ documentId }): Promise<McpToolResult> => {
        const sketch = await loadSketchFromDb(documentId);
        if (!sketch || !sketch.strokes || sketch.strokes.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  documentId,
                  hasDrawings: false,
                  strokeCount: 0,
                }),
              },
            ],
          };
        }

        const toolsUsed = Array.from(new Set(sketch.strokes.map((s) => s.tool)));
        const colorsUsed = Array.from(new Set(sketch.strokes.map((s) => s.color)));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                documentId,
                hasDrawings: true,
                anchoring: sketch.anchoring,
                strokeCount: sketch.strokes.length,
                toolsUsed,
                colorsUsed,
                updatedAt: sketch.updatedAt,
              }),
            },
          ],
        };
      },
    });

    this.registerTool({
      name: 'export_svg',
      description: 'Exports the freehand vector drawings of a note as a clean standalone SVG XML graphic',
      category: 'sketch',
      schema: z.object({
        documentId: z.string().describe('The document ID to export drawing SVG for'),
      }),
      handler: async ({ documentId }): Promise<McpToolResult> => {
        const sketch = await loadSketchFromDb(documentId);
        if (!sketch || !sketch.strokes || sketch.strokes.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"></svg>',
              },
            ],
          };
        }

        const svg = exportStrokesToSvg(sketch.strokes);
        return {
          content: [
            {
              type: 'text',
              text: svg,
            },
          ],
        };
      },
    });

    this.registerTool({
      name: 'delete_drawings',
      description: 'Clears all freehand vector drawings from a note',
      category: 'sketch',
      isDestructive: true,
      schema: z.object({
        documentId: z.string().describe('The document ID whose drawing layer should be cleared'),
      }),
      handler: async ({ documentId }): Promise<McpToolResult> => {
        await deleteSketchFromDb(documentId);
        if (useSketchStore.getState().currentDocId === documentId) {
          useSketchStore.getState().clearAllStrokes();
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                documentId,
                success: true,
                message: 'All drawings cleared from document layer.',
              }),
            },
          ],
        };
      },
    });
  }

  public onunload(): void {
    // Automatically cleaned up by Extension base class disposables
  }
}
