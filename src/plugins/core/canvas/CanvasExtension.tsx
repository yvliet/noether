/**
 * @module CanvasExtension
 * @description
 * Built-in core extension providing an infinite 2D spatial canvas view.
 * Registers the canvas view, action rail button, command, settings tab,
 * and file tree action button.
 *
 * Uses native FlintApp APIs (app.workspace.setMainViewMode, app.hearth.createNewCanvas).
 *
 * @since 0.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { Layout01Icon } from '@/components/common/Icons';
import { CanvasSettingsTab } from './CanvasSettingsTab';
import { canvasReadme } from './readme';
import { CanvasNode, CanvasEdge } from './types';
import {
  getCanvasNodes,
  getCanvasEdges,
  saveCanvasNode,
  deleteCanvasNode,
  saveCanvasEdge,
} from './canvasDb';

const LazyCanvasView = React.lazy(() =>
  import('./CanvasView').then((m) => ({ default: m.CanvasView }))
);

export const CANVAS_MANIFEST: ExtensionManifest = {
  id: 'canvas',
  name: 'Infinite Canvas',
  version: '1.0.0',
  description: 'Infinite 2D spatial canvas to map out notes, ideas, media, and visual cards.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['canvas', 'whiteboard', 'mindmap', 'spatial', 'visual'],
  readme: canvasReadme,
};

export class CanvasExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = CANVAS_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Main View
    this.registerView({
      type: 'canvas',
      title: 'Canvas',
      icon: <Layout01Icon size={14} />,
      render: () => (
        <React.Suspense fallback={<div className="w-full h-full bg-[#181818]" />}>
          <LazyCanvasView />
        </React.Suspense>
      ),
    });

    // 2. Register Action Rail item
    this.addActionRailIcon(
      'open-canvas',
      <Layout01Icon size={16} />,
      'Open spatial canvas',
      (app) => {
        app.workspace.setMainViewMode('canvas');
      },
      40
    );

    // 3. Register Command
    this.addCommand({
      id: 'cmd-open-canvas',
      title: 'Open spatial canvas',
      section: 'Navigation',
      icon: <Layout01Icon size={16} />,
      action: (app) => {
        app.workspace.setMainViewMode('canvas');
      },
    });

    // 4. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'canvas-settings',
      name: 'Canvas',
      icon: <Layout01Icon size={14} />,
      render: () => <CanvasSettingsTab />,
    });

    // 5. Register File Tree Action (New canvas button)
    this.registerFileTreeAction({
      id: 'create-canvas',
      title: 'New canvas',
      icon: <Layout01Icon size={14} />,
      order: 20,
      onClick: async (app) => {
        await app.hearth.createNewCanvas();
        app.workspace.setMainViewMode('canvas');
      },
    });

    // ── MCP Tools Registration ──

    // 6. Tool: canvas_create_board
    this.registerTool({
      name: 'create_board',
      description: 'Create a new infinite spatial canvas document board.',
      category: 'canvas',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Optional display title for the new canvas board (defaults to "Untitled Canvas")',
          },
        },
      },
      handler: async (args: Record<string, unknown>, app: FlintApp): Promise<McpToolResult> => {
        try {
          const title = (args.title as string) || 'Untitled Canvas';
          const doc = await app.hearth.createNewCanvas();
          if (doc && args.title) {
            await app.hearth.renameDocument(doc.id, title);
            doc.title = title;
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  boardId: doc?.id,
                  title: doc?.title,
                  doc,
                }),
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 7. Tool: canvas_get_board
    this.registerTool({
      name: 'get_board',
      description: 'Get all spatial nodes and connecting edges for a specific canvas board.',
      category: 'canvas',
      parameters: {
        type: 'object',
        properties: {
          boardId: {
            type: 'string',
            description: 'Canvas board identifier (or "default")',
          },
        },
        required: ['boardId'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const boardId = (args.boardId as string) || 'default';
          const [nodes, edges] = await Promise.all([
            getCanvasNodes(boardId),
            getCanvasEdges(boardId),
          ]);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  boardId,
                  nodes,
                  edges,
                  nodeCount: nodes.length,
                  edgeCount: edges.length,
                }),
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 8. Tool: canvas_add_node
    this.registerTool({
      name: 'add_node',
      description: 'Add a new visual node (note card, text sticky, or web link) onto a canvas board.',
      category: 'canvas',
      parameters: {
        type: 'object',
        properties: {
          boardId: {
            type: 'string',
            description: 'Target canvas board identifier',
          },
          type: {
            type: 'string',
            description: 'Type of canvas node card',
            enum: ['note', 'text', 'link'],
          },
          x: {
            type: 'number',
            description: 'X coordinate position on canvas',
          },
          y: {
            type: 'number',
            description: 'Y coordinate position on canvas',
          },
          width: {
            type: 'number',
            description: 'Optional card width in pixels (default: 240)',
          },
          height: {
            type: 'number',
            description: 'Optional card height in pixels (default: 160)',
          },
          textContent: {
            type: 'string',
            description: 'Text content for text/sticky card nodes',
          },
          documentId: {
            type: 'string',
            description: 'Target note document ID for note card nodes',
          },
        },
        required: ['boardId', 'type', 'x', 'y'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const boardId = (args.boardId as string) || 'default';
          const type = args.type as 'note' | 'text' | 'link';
          const x = Number(args.x);
          const y = Number(args.y);
          if (!boardId || !type || isNaN(x) || isNaN(y)) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'boardId, type, x, and y parameters are required.' }],
            };
          }
          const width = typeof args.width === 'number' ? args.width : 240;
          const height = typeof args.height === 'number' ? args.height : 160;
          const textContent = typeof args.textContent === 'string' ? args.textContent : undefined;
          const documentId = typeof args.documentId === 'string' ? args.documentId : undefined;

          const node: CanvasNode = {
            id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            board_id: boardId,
            type,
            x,
            y,
            width,
            height,
            text_content: textContent,
            document_id: documentId,
          };

          await saveCanvasNode(node);

          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, node }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 9. Tool: canvas_add_edge
    this.registerTool({
      name: 'add_edge',
      description: 'Connect two nodes on a canvas board with a directional connection line.',
      category: 'canvas',
      parameters: {
        type: 'object',
        properties: {
          boardId: {
            type: 'string',
            description: 'Target canvas board identifier',
          },
          fromNodeId: {
            type: 'string',
            description: 'Source node ID',
          },
          toNodeId: {
            type: 'string',
            description: 'Target node ID',
          },
          label: {
            type: 'string',
            description: 'Optional label text displayed along the edge line',
          },
        },
        required: ['boardId', 'fromNodeId', 'toNodeId'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const boardId = (args.boardId as string) || 'default';
          const fromNodeId = args.fromNodeId as string;
          const toNodeId = args.toNodeId as string;
          const label = typeof args.label === 'string' ? args.label : undefined;
          if (!boardId || !fromNodeId || !toNodeId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'boardId, fromNodeId, and toNodeId parameters are required.' }],
            };
          }

          const edge: CanvasEdge = {
            id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            board_id: boardId,
            from_node_id: fromNodeId,
            to_node_id: toNodeId,
            label,
          };

          await saveCanvasEdge(edge);

          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, edge }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 10. Tool: canvas_delete_node
    this.registerTool({
      name: 'delete_node',
      description: 'Remove a node and all its connected edges from a canvas board.',
      category: 'canvas',
      isDestructive: true,
      parameters: {
        type: 'object',
        properties: {
          nodeId: {
            type: 'string',
            description: 'Unique identifier of the node to remove',
          },
        },
        required: ['nodeId'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const nodeId = args.nodeId as string;
          if (!nodeId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'nodeId parameter is required.' }],
            };
          }
          await deleteCanvasNode(nodeId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, nodeId }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });
  }
}

// Backwards compatibility alias
export const CanvasPlugin = CanvasExtension;
export default CanvasExtension;
