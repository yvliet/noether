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

    // 7. Tool: graph-view_get_local_graph
    this.registerTool({
      name: 'get_local_graph',
      description: 'Get the local knowledge graph neighborhood for a specific note, including direct incoming/outgoing wikilinks and optional 2nd-degree connections.',
      category: 'graph',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Unique ID of the note. If omitted, noteTitle or the active note is used.',
          },
          noteTitle: {
            type: 'string',
            description: 'Title of the note to inspect.',
          },
          depth: {
            type: 'number',
            description: 'Degrees of separation to traverse: 1 for immediate neighbors, 2 for second-degree connections (default: 1)',
          },
        },
      },
      handler: async (args: Record<string, unknown>, app: FlintApp): Promise<McpToolResult> => {
        try {
          const docs = (app.hearth.documents || []).filter((d) => !d.is_folder);
          const docMap = new Map(docs.map((d) => [d.id, d]));

          // Resolve target document
          const docId = args.documentId ? String(args.documentId).trim() : '';
          const title = args.noteTitle ? String(args.noteTitle).trim().toLowerCase() : '';
          let target = docId ? docMap.get(docId) : undefined;
          if (!target && title) {
            target = docs.find((d) => d.title.toLowerCase() === title || d.title.toLowerCase().includes(title));
          }
          if (!target) {
            target = app.vault.activeDocument || undefined;
          }

          if (!target) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Target note could not be resolved. Please provide a valid documentId or noteTitle.' }],
            };
          }

          const depth = Number(args.depth) === 2 ? 2 : 1;

          let rawLinks: Array<{ source_document_id: string; target_document_id: string }> = [];
          try {
            rawLinks = await dbAdapter.query<{ source_document_id: string; target_document_id: string }>(
              `SELECT source_document_id, target_document_id FROM document_links`
            );
          } catch {
            rawLinks = [];
          }

          const targetId = target.id;
          const outgoingIds = new Set<string>();
          const incomingIds = new Set<string>();

          rawLinks.forEach((l) => {
            if (l.source_document_id === targetId && l.target_document_id) outgoingIds.add(l.target_document_id);
            if (l.target_document_id === targetId && l.source_document_id) incomingIds.add(l.source_document_id);
          });

          const outgoing = Array.from(outgoingIds).map((id) => ({
            id,
            title: docMap.get(id)?.title || 'Untitled',
          }));

          const incoming = Array.from(incomingIds).map((id) => ({
            id,
            title: docMap.get(id)?.title || 'Untitled',
          }));

          const resultPayload: Record<string, unknown> = {
            target: { id: target.id, title: target.title },
            outgoingCount: outgoing.length,
            incomingCount: incoming.length,
            outgoing,
            incoming,
          };

          if (depth === 2) {
            const firstHopSet = new Set([...outgoingIds, ...incomingIds, targetId]);
            const secondHopMap = new Map<string, { id: string; title: string; via: string }>();

            rawLinks.forEach((l) => {
              if (firstHopSet.has(l.source_document_id) && l.source_document_id !== targetId) {
                if (l.target_document_id && !firstHopSet.has(l.target_document_id)) {
                  const bridgeTitle = docMap.get(l.source_document_id)?.title || 'Unknown';
                  secondHopMap.set(l.target_document_id, {
                    id: l.target_document_id,
                    title: docMap.get(l.target_document_id)?.title || 'Untitled',
                    via: bridgeTitle,
                  });
                }
              }
              if (firstHopSet.has(l.target_document_id) && l.target_document_id !== targetId) {
                if (l.source_document_id && !firstHopSet.has(l.source_document_id)) {
                  const bridgeTitle = docMap.get(l.target_document_id)?.title || 'Unknown';
                  secondHopMap.set(l.source_document_id, {
                    id: l.source_document_id,
                    title: docMap.get(l.source_document_id)?.title || 'Untitled',
                    via: bridgeTitle,
                  });
                }
              }
            });

            const secondHopNeighbors = Array.from(secondHopMap.values());
            resultPayload.secondDegreeCount = secondHopNeighbors.length;
            resultPayload.secondDegreeNeighbors = secondHopNeighbors.slice(0, 30);
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(resultPayload) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 8. Tool: graph-view_get_related_notes
    this.registerTool({
      name: 'get_related_notes',
      description: 'Find notes closely related to a given note based on shared link topology (co-citation and bibliographic coupling) and common tags, ranked by connection strength.',
      category: 'graph',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Unique ID of the note. If omitted, noteTitle or the active note is used.',
          },
          noteTitle: {
            type: 'string',
            description: 'Title of the note.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of related notes to return (default: 5)',
          },
        },
      },
      handler: async (args: Record<string, unknown>, app: FlintApp): Promise<McpToolResult> => {
        try {
          const docs = (app.hearth.documents || []).filter((d) => !d.is_folder);
          const docMap = new Map(docs.map((d) => [d.id, d]));

          // Resolve target note
          const docId = args.documentId ? String(args.documentId).trim() : '';
          const title = args.noteTitle ? String(args.noteTitle).trim().toLowerCase() : '';
          let target = docId ? docMap.get(docId) : undefined;
          if (!target && title) {
            target = docs.find((d) => d.title.toLowerCase() === title || d.title.toLowerCase().includes(title));
          }
          if (!target) {
            target = app.vault.activeDocument || undefined;
          }

          if (!target) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Target note could not be resolved. Please provide a valid documentId or noteTitle.' }],
            };
          }

          const limit = typeof args.limit === 'number' && args.limit > 0 ? Math.min(args.limit, 25) : 5;

          let rawLinks: Array<{ source_document_id: string; target_document_id: string }> = [];
          try {
            rawLinks = await dbAdapter.query<{ source_document_id: string; target_document_id: string }>(
              `SELECT source_document_id, target_document_id FROM document_links`
            );
          } catch {
            rawLinks = [];
          }

          // Build index of links
          const outgoingByDoc = new Map<string, Set<string>>();
          const incomingByDoc = new Map<string, Set<string>>();

          rawLinks.forEach((l) => {
            if (!outgoingByDoc.has(l.source_document_id)) outgoingByDoc.set(l.source_document_id, new Set());
            outgoingByDoc.get(l.source_document_id)!.add(l.target_document_id);

            if (!incomingByDoc.has(l.target_document_id)) incomingByDoc.set(l.target_document_id, new Set());
            incomingByDoc.get(l.target_document_id)!.add(l.source_document_id);
          });

          // Helper to extract tags from doc
          const getDocTags = (d: typeof target): Set<string> => {
            const tags = new Set<string>();
            if (!d) return tags;
            if (d.properties) {
              try {
                const parsed = JSON.parse(d.properties);
                if (Array.isArray(parsed.tags)) {
                  parsed.tags.forEach((t: unknown) => tags.add(String(t).toLowerCase().replace(/^#/, '')));
                }
              } catch {}
            }
            if (d.content_json) {
              const matches = d.content_json.match(/#([a-zA-Z0-9_\-/]+)/g);
              if (matches) {
                matches.forEach((m) => tags.add(m.slice(1).toLowerCase()));
              }
            }
            return tags;
          };

          const targetId = target.id;
          const targetOut = outgoingByDoc.get(targetId) || new Set<string>();
          const targetIn = incomingByDoc.get(targetId) || new Set<string>();
          const targetTags = getDocTags(target);

          const scoredCandidates: Array<{
            id: string;
            title: string;
            score: number;
            isDirectlyLinked: boolean;
            sharedOutgoingTitles: string[];
            sharedIncomingTitles: string[];
            sharedTags: string[];
          }> = [];

          for (const cand of docs) {
            if (cand.id === targetId) continue;

            const candOut = outgoingByDoc.get(cand.id) || new Set<string>();
            const candIn = incomingByDoc.get(cand.id) || new Set<string>();
            const candTags = getDocTags(cand);

            const isDirectlyLinked = targetOut.has(cand.id) || targetIn.has(cand.id);

            // Shared outgoing (both link to the same note)
            const sharedOutIds: string[] = [];
            targetOut.forEach((id) => {
              if (candOut.has(id)) sharedOutIds.push(id);
            });

            // Shared incoming (both are linked by the same note)
            const sharedInIds: string[] = [];
            targetIn.forEach((id) => {
              if (candIn.has(id)) sharedInIds.push(id);
            });

            // Shared tags
            const sharedTagsList: string[] = [];
            targetTags.forEach((tag) => {
              if (candTags.has(tag)) sharedTagsList.push(tag);
            });

            const score =
              (isDirectlyLinked ? 3 : 0) +
              sharedOutIds.length * 2 +
              sharedInIds.length * 2 +
              sharedTagsList.length * 1.5;

            if (score > 0) {
              scoredCandidates.push({
                id: cand.id,
                title: cand.title || 'Untitled',
                score: Number(score.toFixed(1)),
                isDirectlyLinked,
                sharedOutgoingTitles: sharedOutIds.map((id) => docMap.get(id)?.title || 'Untitled'),
                sharedIncomingTitles: sharedInIds.map((id) => docMap.get(id)?.title || 'Untitled'),
                sharedTags: sharedTagsList,
              });
            }
          }

          scoredCandidates.sort((a, b) => b.score - a.score);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  target: { id: target.id, title: target.title },
                  relatedNotes: scoredCandidates.slice(0, limit),
                  totalCandidatesFound: scoredCandidates.length,
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

    // 9. Tool: graph-view_find_path
    this.registerTool({
      name: 'find_path',
      description: 'Find the shortest connection path between two notes in the knowledge graph using link traversal.',
      category: 'graph',
      parameters: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            description: 'Starting note title or document ID',
          },
          target: {
            type: 'string',
            description: 'Destination note title or document ID',
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum link hops to search (default: 4, max: 6)',
          },
          directed: {
            type: 'boolean',
            description: 'If true, follows link arrow direction strictly. If false, traverses bidirectionally (default: false)',
          },
        },
        required: ['source', 'target'],
      },
      handler: async (args: Record<string, unknown>, app: FlintApp): Promise<McpToolResult> => {
        try {
          const sourceQuery = String(args.source || '').trim();
          const targetQuery = String(args.target || '').trim();
          if (!sourceQuery || !targetQuery) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Both "source" and "target" parameters are required.' }],
            };
          }

          const docs = (app.hearth.documents || []).filter((d) => !d.is_folder);
          const docMap = new Map(docs.map((d) => [d.id, d]));

          const resolveOne = (q: string) => {
            const lower = q.toLowerCase();
            return (
              docMap.get(q) ||
              docs.find((d) => d.title.toLowerCase() === lower || d.title.toLowerCase().includes(lower))
            );
          };

          const sourceDoc = resolveOne(sourceQuery);
          const targetDoc = resolveOne(targetQuery);

          if (!sourceDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Source note "${sourceQuery}" could not be found.` }],
            };
          }
          if (!targetDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Target note "${targetQuery}" could not be found.` }],
            };
          }
          if (sourceDoc.id === targetDoc.id) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ found: true, distance: 0, path: [sourceDoc.title] }) }],
            };
          }

          const maxDepth = typeof args.maxDepth === 'number' && args.maxDepth > 0 ? Math.min(args.maxDepth, 6) : 4;
          const directed = Boolean(args.directed);

          let rawLinks: Array<{ source_document_id: string; target_document_id: string }> = [];
          try {
            rawLinks = await dbAdapter.query<{ source_document_id: string; target_document_id: string }>(
              `SELECT source_document_id, target_document_id FROM document_links`
            );
          } catch {
            rawLinks = [];
          }

          // Build adjacency list
          const adj = new Map<string, Array<{ neighborId: string; isForward: boolean }>>();
          rawLinks.forEach((l) => {
            if (!adj.has(l.source_document_id)) adj.set(l.source_document_id, []);
            adj.get(l.source_document_id)!.push({ neighborId: l.target_document_id, isForward: true });

            if (!directed) {
              if (!adj.has(l.target_document_id)) adj.set(l.target_document_id, []);
              adj.get(l.target_document_id)!.push({ neighborId: l.source_document_id, isForward: false });
            }
          });

          // Standard BFS shortest path
          interface QueueNode {
            id: string;
            path: string[];
            steps: Array<{ from: string; to: string; direction: 'outgoing' | 'incoming' }>;
          }

          const queue: QueueNode[] = [{
            id: sourceDoc.id,
            path: [sourceDoc.title],
            steps: [],
          }];
          const visited = new Set<string>([sourceDoc.id]);
          let foundPath: QueueNode | null = null;

          while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.id === targetDoc.id) {
              foundPath = current;
              break;
            }

            if (current.path.length > maxDepth) continue;

            const neighbors = adj.get(current.id) || [];
            for (const { neighborId, isForward } of neighbors) {
              if (!visited.has(neighborId)) {
                visited.add(neighborId);
                const neighborDoc = docMap.get(neighborId);
                const neighborTitle = neighborDoc?.title || 'Untitled';
                const fromTitle = docMap.get(current.id)?.title || 'Untitled';

                queue.push({
                  id: neighborId,
                  path: [...current.path, neighborTitle],
                  steps: [
                    ...current.steps,
                    {
                      from: fromTitle,
                      to: neighborTitle,
                      direction: isForward ? 'outgoing' : 'incoming',
                    },
                  ],
                });
              }
            }
          }

          if (foundPath) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    found: true,
                    distance: foundPath.steps.length,
                    path: foundPath.path,
                    steps: foundPath.steps,
                  }),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  found: false,
                  message: `No link path found between "${sourceDoc.title}" and "${targetDoc.title}" within ${maxDepth} hops.`,
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

    // 10. Tool: graph-view_get_hub_notes
    this.registerTool({
      name: 'get_hub_notes',
      description: 'Identify the most interconnected hub notes across the vault ranked by total degree centrality (inbound + outbound links).',
      category: 'graph',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of hub notes to return (default: 10, max: 50)',
          },
        },
      },
      handler: async (args: Record<string, unknown>, app: FlintApp): Promise<McpToolResult> => {
        try {
          const docs = (app.hearth.documents || []).filter((d) => !d.is_folder);
          const docMap = new Map(docs.map((d) => [d.id, d]));
          const limit = typeof args.limit === 'number' && args.limit > 0 ? Math.min(args.limit, 50) : 10;

          let rawLinks: Array<{ source_document_id: string; target_document_id: string }> = [];
          try {
            rawLinks = await dbAdapter.query<{ source_document_id: string; target_document_id: string }>(
              `SELECT source_document_id, target_document_id FROM document_links`
            );
          } catch {
            rawLinks = [];
          }

          const inDegree = new Map<string, number>();
          const outDegree = new Map<string, number>();

          rawLinks.forEach((l) => {
            if (l.source_document_id) outDegree.set(l.source_document_id, (outDegree.get(l.source_document_id) || 0) + 1);
            if (l.target_document_id) inDegree.set(l.target_document_id, (inDegree.get(l.target_document_id) || 0) + 1);
          });

          const hubs = docs.map((d) => {
            const outCount = outDegree.get(d.id) || 0;
            const inCount = inDegree.get(d.id) || 0;
            return {
              id: d.id,
              title: d.title || 'Untitled',
              totalConnections: outCount + inCount,
              inboundLinks: inCount,
              outboundLinks: outCount,
            };
          });

          hubs.sort((a, b) => b.totalConnections - a.totalConnections);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  hubs: hubs.slice(0, limit),
                  totalNotesScanned: docs.length,
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
  }
}

// Backwards compatibility alias
export const GraphPlugin = GraphExtension;
export default GraphExtension;
