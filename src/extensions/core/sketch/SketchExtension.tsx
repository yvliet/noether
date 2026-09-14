/**
 * @module SketchExtension
 * @description
 * Noether Sketch core extension.
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
import { NoetherApp } from '@/core/app/NoetherApp';
import manifest from './manifest.json';
import sketchReadme from './readme.md?raw';
import { initSketchDb, loadSketchFromDb, saveSketchToDb, deleteSketchFromDb, SKETCH_TABLE_DEFINITION } from './sketchDb';
import { serializeSketchToComment, parseSketchFromComment, exportStrokesToSvg } from './sketchEngine';
import { useSketchStore } from './sketchStore';
import { SketchCanvasOverlay } from './SketchCanvasOverlay';
import { SketchSettingsTab } from './SketchSettingsTab';
import { PaintBoardIcon } from '@/components/common/Icons';

export const SKETCH_MANIFEST: ExtensionManifest = {
  ...(manifest as ExtensionManifest),
  readme: sketchReadme,
};

export class SketchExtension extends Extension {
  constructor(app: NoetherApp, manifest: ExtensionManifest = SKETCH_MANIFEST) {
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
      onRestoreDefaults: () => {
        useSketchStore.getState().restoreDefaults();
      },
    });

    // 3. Register Viewport Action Button (Left of Reading/Editing toggle in sub-header)
    this.registerViewportAction({
      id: 'sketch-toggle',
      corner: 'top-right',
      direction: 'horizontal',
      scope: 'document',
      order: 5,
      title: () => {
        const isSketchingActive = useSketchStore.getState().isSketchingActive;
        const strokes = useSketchStore.getState().strokes;
        const hasStrokes = strokes && strokes.length > 0;
        return isSketchingActive
          ? 'Close Sketch overlay (Ctrl+Shift+S)'
          : hasStrokes
          ? 'Sketch overlay active - Click to edit (Ctrl+Shift+S)'
          : 'Draw on note (Ctrl+Shift+S)';
      },
      icon: () => {
        const strokes = useSketchStore.getState().strokes;
        const isSketchingActive = useSketchStore.getState().isSketchingActive;
        const hasStrokes = strokes && strokes.length > 0;
        return (
          <div className="relative flex items-center justify-center">
            <PaintBoardIcon size={14} />
            {hasStrokes && !isSketchingActive && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#38bdf8] pointer-events-none" />
            )}
          </div>
        );
      },
      isActive: () => useSketchStore.getState().isSketchingActive,
      onClick: () => {
        useSketchStore.getState().toggleSketching();
      },
      isVisible: (ctx) => Boolean(ctx.document),
    });

    this.onEvent('document:opened', async ({ id }) => {
      await useSketchStore.getState().loadDocument(id);
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
      id: 'noether-sketch-sync',
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
      title: () => (useSketchStore.getState().isSketchingActive ? 'Hide drawing overlay' : 'Show drawing overlay'),
      section: 'Editor',
      hotkey: 'Ctrl+Shift+S',
      aliases: ['toggle drawing overlay', 'toggle sketch', 'drawing', 'sketch', 'overlay', 'draw', 'ink'],
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
