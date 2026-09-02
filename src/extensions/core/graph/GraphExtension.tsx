/**
 * @module GraphExtension
 * @description
 * Built-in core extension rendering a 2D force-directed interactive knowledge graph.
 * Registers the graph view, action rail shortcut, navigation command, and settings tab.
 *
 * Uses native FlintApp APIs (app.workspace.setMainViewMode).
 *
 * @since 0.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { NeuralNetworkIcon } from '@/components/common/Icons';
import { dbAdapter } from '@/lib/db/adapter';
import { GraphSettingsTab } from './GraphSettingsTab';
import { graphReadme } from './readme';

const LazyGraphView = React.lazy(() =>
  import('./GraphView').then((m) => ({ default: m.GraphView }))
);

export const GRAPH_MANIFEST: ExtensionManifest = {
  id: 'graph-view',
  name: 'Graph View',
  version: '1.0.0',
  description: 'Interactive force-directed graph visualizing knowledge network relationships between notes.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['graph', 'visualization', 'network', 'knowledge', 'links'],
  readme: graphReadme,
};

export class GraphExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = GRAPH_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Main View
    this.registerView({
      type: 'graph',
      title: 'Graph View',
      icon: <NeuralNetworkIcon size={14} />,
      render: (props) => (
        <React.Suspense fallback={<div className="w-full h-full bg-transparent" />}>
          <LazyGraphView
            tabId={(props as any)?.tabId}
            documentId={(props as any)?.documentId}
            isSidebar={(props as any)?.isSidebar}
          />
        </React.Suspense>
      ),
    });

    // 2. Register Action Rail item
    this.addActionRailIcon(
      'open-graph-view',
      <NeuralNetworkIcon size={16} />,
      'Open graph view (Ctrl+G)',
      (app) => {
        app.workspace.setMainViewMode('graph');
      },
      50
    );

    // 3. Register Command
    this.addCommand({
      id: 'cmd-open-graph-view',
      title: 'Open graph view',
      section: 'Navigation',
      icon: <NeuralNetworkIcon size={16} />,
      hotkey: 'Ctrl+G',
      action: (app) => {
        app.workspace.setMainViewMode('graph');
      },
    });

    // 4. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'graph-settings',
      name: 'Graph view',
      icon: <NeuralNetworkIcon size={14} />,
      render: () => <GraphSettingsTab />,
    });

    // ── MCP Tools Registration ──

    // 5. Tool: graph-view_get_network
    this.registerTool({
      name: 'get_network',
      description: 'Get the full knowledge graph topology including all note nodes (with link counts) and directional wikilink edges.',
      category: 'graph',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (_args: Record<string, unknown>, app: FlintApp): Promise<McpToolResult> => {
        try {
          const docs = (app.hearth.documents || []).filter((d) => !d.is_folder);
          let rawLinks: Array<{ source_document_id: string; target_document_id: string }> = [];
          try {
            rawLinks = await dbAdapter.query<{ source_document_id: string; target_document_id: string }>(
              `SELECT source_document_id, target_document_id FROM document_links`
            );
          } catch {
            rawLinks = [];
          }

          const linkCounts: Record<string, number> = {};
          rawLinks.forEach((l) => {
            if (l.source_document_id) linkCounts[l.source_document_id] = (linkCounts[l.source_document_id] || 0) + 1;
            if (l.target_document_id) linkCounts[l.target_document_id] = (linkCounts[l.target_document_id] || 0) + 1;
          });

          const nodes = docs.map((d) => ({
            id: d.id,
            title: d.title || 'Untitled',
            linkCount: linkCounts[d.id] || 0,
          }));

          const edges = rawLinks.map((l) => ({
            source: l.source_document_id,
            target: l.target_document_id,
          }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
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

    // 6. Tool: graph-view_get_orphans
    this.registerTool({
      name: 'get_orphans',
      description: 'Get all orphan notes that have zero incoming and zero outgoing links across the entire vault.',
      category: 'graph',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (_args: Record<string, unknown>, app: FlintApp): Promise<McpToolResult> => {
        try {
          const docs = (app.hearth.documents || []).filter((d) => !d.is_folder);
          let rawLinks: Array<{ source_document_id: string; target_document_id: string }> = [];
          try {
            rawLinks = await dbAdapter.query<{ source_document_id: string; target_document_id: string }>(
              `SELECT source_document_id, target_document_id FROM document_links`
            );
          } catch {
            rawLinks = [];
          }

          const linkedIds = new Set<string>();
          rawLinks.forEach((l) => {
            if (l.source_document_id) linkedIds.add(l.source_document_id);
            if (l.target_document_id) linkedIds.add(l.target_document_id);
          });

          const orphans = docs
            .filter((d) => !linkedIds.has(d.id))
            .map((d) => ({
              id: d.id,
              title: d.title || 'Untitled',
              parent_id: d.parent_id,
              created_at: d.created_at,
              updated_at: d.updated_at,
            }));

          return {
            content: [{ type: 'text', text: JSON.stringify({ orphans, total: orphans.length }) }],
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
export const GraphPlugin = GraphExtension;
export default GraphExtension;
