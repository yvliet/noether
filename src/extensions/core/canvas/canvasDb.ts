/**
 * @module CanvasDb
 * @description
 * Isolated database persistence module for the Canvas extension.
 * Automatically initializes dynamic SQLite tables and indexes upon demand,
 * ensuring Noether native core requires zero hardcoded knowledge of canvas schemas.
 */

import { dbAdapter } from '@/lib/db/adapter';
import type { TableDefinition } from '@/core/extensions/types';
import type { CanvasNode, CanvasEdge } from './types';

export const CANVAS_NODES_TABLE_DEF: TableDefinition = {
  tableName: 'nodes',
  version: 1,
  columns: {
    id: { type: 'text', primaryKey: true },
    board_id: { type: 'text', default: 'default' },
    type: { type: 'text' },
    x: { type: 'real' },
    y: { type: 'real' },
    width: { type: 'real' },
    height: { type: 'real' },
    document_id: { type: 'text', nullable: true },
    text_content: { type: 'text', nullable: true },
    color: { type: 'text', nullable: true },
    url: { type: 'text', nullable: true },
  },
  indexes: [
    { name: 'idx_canvas_nodes_board', columns: ['board_id'] },
  ],
};

export const CANVAS_EDGES_TABLE_DEF: TableDefinition = {
  tableName: 'edges',
  version: 3,
  columns: {
    id: { type: 'text', primaryKey: true },
    board_id: { type: 'text', default: 'default' },
    from_node_id: { type: 'text' },
    from_side: { type: 'text', nullable: true },
    to_node_id: { type: 'text' },
    to_side: { type: 'text', nullable: true },
    label: { type: 'text', nullable: true },
    color: { type: 'text', nullable: true },
    direction: { type: 'text', nullable: true },
    style: { type: 'text', nullable: true },
    control_points: { type: 'text', nullable: true },
  },
  indexes: [
    { name: 'idx_canvas_edges_board', columns: ['board_id'] },
  ],
};

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Ensures canvas tables and indices exist in the active SQLite database.
 * Called automatically by canvas operations before querying.
 */
export async function initCanvasTables(): Promise<void> {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await Promise.allSettled([
          dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS ext_canvas_nodes (
              id TEXT PRIMARY KEY,
              board_id TEXT NOT NULL DEFAULT 'default',
              type TEXT NOT NULL,
              x REAL NOT NULL,
              y REAL NOT NULL,
              width REAL NOT NULL,
              height REAL NOT NULL,
              document_id TEXT,
              text_content TEXT,
              color TEXT,
              url TEXT
            );
          `),
          dbAdapter.execute(`
            CREATE TABLE IF NOT EXISTS ext_canvas_edges (
              id TEXT PRIMARY KEY,
              board_id TEXT NOT NULL DEFAULT 'default',
              from_node_id TEXT NOT NULL,
              from_side TEXT,
              to_node_id TEXT NOT NULL,
              to_side TEXT,
              label TEXT,
              color TEXT,
              direction TEXT,
              style TEXT,
              control_points TEXT
            );
          `),
        ]);

        // Concurrently run non-destructive column migrations for existing user vaults
        await Promise.allSettled([
          dbAdapter.execute(`ALTER TABLE ext_canvas_nodes ADD COLUMN url TEXT;`),
          dbAdapter.execute(`ALTER TABLE ext_canvas_edges ADD COLUMN from_side TEXT;`),
          dbAdapter.execute(`ALTER TABLE ext_canvas_edges ADD COLUMN to_side TEXT;`),
          dbAdapter.execute(`ALTER TABLE ext_canvas_edges ADD COLUMN color TEXT;`),
          dbAdapter.execute(`ALTER TABLE ext_canvas_edges ADD COLUMN direction TEXT;`),
          dbAdapter.execute(`ALTER TABLE ext_canvas_edges ADD COLUMN style TEXT;`),
          dbAdapter.execute(`ALTER TABLE ext_canvas_edges ADD COLUMN control_points TEXT;`),
        ]);


        await Promise.allSettled([
          dbAdapter.execute(`CREATE INDEX IF NOT EXISTS idx_canvas_nodes_board ON ext_canvas_nodes(board_id);`),
          dbAdapter.execute(`CREATE INDEX IF NOT EXISTS idx_canvas_edges_board ON ext_canvas_edges(board_id);`),
        ]);

        isInitialized = true;
      } catch (err) {
        console.error('[Noether Canvas] Failed to initialize canvas tables:', err);
      } finally {
        initPromise = null;
      }
    })();
  }
  return initPromise;
}

export async function getCanvasNodes(boardId = 'default'): Promise<CanvasNode[]> {
  await initCanvasTables();
  const nodes = await dbAdapter.query<CanvasNode>(
    `SELECT * FROM ext_canvas_nodes WHERE board_id = ?`,
    [boardId]
  );
  return nodes;
}

export async function getCanvasEdges(boardId = 'default'): Promise<CanvasEdge[]> {
  await initCanvasTables();
  const rawEdges = await dbAdapter.query<any>(
    `SELECT * FROM ext_canvas_edges WHERE board_id = ?`,
    [boardId]
  );
  return rawEdges.map((e) => ({
    ...e,
    control_points: typeof e.control_points === 'string' && e.control_points.trim()
      ? (() => {
          try {
            return JSON.parse(e.control_points);
          } catch {
            return undefined;
          }
        })()
      : (Array.isArray(e.control_points) ? e.control_points : undefined),
  }));
}

export async function saveCanvasNode(node: CanvasNode): Promise<void> {
  await initCanvasTables();
  await dbAdapter.execute(
    `INSERT OR REPLACE INTO ext_canvas_nodes (id, board_id, type, x, y, width, height, document_id, text_content, color, url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      node.id,
      node.board_id || 'default',
      node.type,
      node.x,
      node.y,
      node.width,
      node.height,
      node.document_id || null,
      node.text_content || null,
      node.color || null,
      node.url || null,
    ]
  );
}

export async function deleteCanvasNode(nodeId: string): Promise<void> {
  await initCanvasTables();
  await dbAdapter.execute(`DELETE FROM ext_canvas_nodes WHERE id = ?`, [nodeId]);
  await dbAdapter.execute(
    `DELETE FROM ext_canvas_edges WHERE from_node_id = ? OR to_node_id = ?`,
    [nodeId, nodeId]
  );
}

export async function saveCanvasEdge(edge: CanvasEdge): Promise<void> {
  await initCanvasTables();
  await dbAdapter.execute(
    `INSERT OR REPLACE INTO ext_canvas_edges (id, board_id, from_node_id, from_side, to_node_id, to_side, label, color, direction, style, control_points)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      edge.id,
      edge.board_id || 'default',
      edge.from_node_id,
      edge.from_side || 'right',
      edge.to_node_id,
      edge.to_side || 'left',
      edge.label || null,
      edge.color || null,
      edge.direction || 'unidirectional',
      edge.style || null,
      edge.control_points && edge.control_points.length > 0 ? JSON.stringify(edge.control_points) : null,
    ]
  );
}


export async function deleteCanvasEdge(edgeId: string): Promise<void> {
  await initCanvasTables();
  await dbAdapter.execute(`DELETE FROM ext_canvas_edges WHERE id = ?`, [edgeId]);
}

export async function purgeCanvasNodesForDocument(documentId: string): Promise<void> {
  await initCanvasTables();
  const nodes = await dbAdapter.query<{ id: string }>(
    `SELECT id FROM ext_canvas_nodes WHERE document_id = ?`,
    [documentId]
  );
  if (nodes.length > 0) {
    for (const node of nodes) {
      await deleteCanvasNode(node.id);
    }
  }
}

export async function purgeCanvasBoard(boardId: string): Promise<void> {
  await initCanvasTables();
  await dbAdapter.execute(`DELETE FROM ext_canvas_nodes WHERE board_id = ?`, [boardId]);
  await dbAdapter.execute(`DELETE FROM ext_canvas_edges WHERE board_id = ?`, [boardId]);
}

export async function serializeCanvasBoard(boardId: string): Promise<string> {
  const [nodes, edges] = await Promise.all([
    getCanvasNodes(boardId),
    getCanvasEdges(boardId),
  ]);

  const canvasNodes = nodes.map((n) => ({
    id: n.id,
    type: n.type === 'note' ? 'file' : n.type,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    file: n.document_id,
    text: n.text_content,
    label: n.type === 'group' ? n.text_content : undefined,
    color: n.color,
  }));

  const canvasEdges = edges.map((e) => ({
    id: e.id,
    fromNode: e.from_node_id,
    fromSide: e.from_side || 'right',
    toNode: e.to_node_id,
    toSide: e.to_side || 'left',
    label: e.label,
    color: e.color,
    direction: e.direction || 'unidirectional',
    style: e.style,
    controlPoints: e.control_points,
  }));

  return JSON.stringify({ nodes: canvasNodes, edges: canvasEdges }, null, 2);
}

export async function importCanvasBoard(boardId: string, json: string): Promise<{ nodes: CanvasNode[]; edges: CanvasEdge[] }> {
  try {
    const data = JSON.parse(json);
    const rawNodes = Array.isArray(data?.nodes) ? data.nodes : [];
    const rawEdges = Array.isArray(data?.edges) ? data.edges : [];

    const importedNodes: CanvasNode[] = rawNodes.map((n: any) => ({
      id: n.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      board_id: boardId,
      type: n.type === 'file' ? 'note' : (n.type || 'text'),
      x: typeof n.x === 'number' ? n.x : 0,
      y: typeof n.y === 'number' ? n.y : 0,
      width: typeof n.width === 'number' ? n.width : 240,
      height: typeof n.height === 'number' ? n.height : 160,
      document_id: n.file || n.document_id,
      text_content: n.label || n.text || n.text_content,
      color: n.color,
      url: n.url,
    }));

    const importedEdges: CanvasEdge[] = rawEdges.map((e: any) => ({
      id: e.id || `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      board_id: boardId,
      from_node_id: e.fromNode || e.from_node_id,
      from_side: e.fromSide || e.from_side || 'right',
      to_node_id: e.toNode || e.to_node_id,
      to_side: e.toSide || e.to_side || 'left',
      label: e.label,
      color: e.color,
      direction: e.direction || (e.fromEnd ? (e.toEnd ? 'bidirectional' : 'nondirectional') : 'unidirectional'),
      style: e.style || e.lineStyle,
      control_points: e.controlPoints || e.control_points,
    }));

    // Concurrently persist imported elements in SQLite in background via a single atomic WAL transaction
    const queries = [
      ...importedNodes.map((n) => ({
        sql: `INSERT OR REPLACE INTO ext_canvas_nodes (id, board_id, type, x, y, width, height, document_id, text_content, color, url)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          n.id,
          n.board_id || 'default',
          n.type,
          n.x,
          n.y,
          n.width,
          n.height,
          n.document_id || null,
          n.text_content || null,
          n.color || null,
          n.url || null,
        ],
      })),
      ...importedEdges.map((e) => ({
        sql: `INSERT OR REPLACE INTO ext_canvas_edges (id, board_id, from_node_id, from_side, to_node_id, to_side, label, color, direction, style, control_points)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          e.id,
          e.board_id || 'default',
          e.from_node_id,
          e.from_side || 'right',
          e.to_node_id,
          e.to_side || 'left',
          e.label || null,
          e.color || null,
          e.direction || 'unidirectional',
          e.style || null,
          e.control_points && e.control_points.length > 0 ? JSON.stringify(e.control_points) : null,
        ],
      })),
    ];


    if (queries.length > 0) {
      dbAdapter.transaction(queries).catch((err) => {
        console.error('[CanvasDb] Error persisting imported canvas elements:', err);
      });
    }

    return { nodes: importedNodes, edges: importedEdges };
  } catch (e) {
    console.error('[CanvasDb] Error importing canvas board JSON:', e);
    return { nodes: [], edges: [] };
  }
}

export async function syncCanvasToDisk(boardId: string): Promise<void> {
  if (!boardId || boardId === 'default' || boardId.startsWith('__')) return;
  const { platform } = await import('@/lib/platform/platformAdapter');
  const { getAllDocuments, getDocumentPath, computeFastHash } = await import('@/lib/db/documents');

  const docs = await getAllDocuments();
  const doc = docs.find((d) => d.id === boardId);
  if (!doc) return;

  const json = await serializeCanvasBoard(boardId);
  const now = Date.now();

  // Update in SQLite documents table
  await dbAdapter.execute(
    `UPDATE documents SET content_json = ?, updated_at = ? WHERE id = ?`,
    [json, now, boardId]
  );

  // Write to disk
  if (platform.isDesktop()) {
    try {
      const relPath = getDocumentPath(doc, docs);
      const targetRelPath = relPath.endsWith('.canvas') ? relPath : `${relPath}.canvas`;
      await platform.saveMarkdownFile(doc.title, json, targetRelPath);

      const normRel = targetRelPath.replace(/\\/g, '/').toLowerCase();
      const manifestKey = normRel.endsWith('.canvas') ? normRel : `${normRel}.canvas`;
      const contentHash = computeFastHash(json);
      try {
        await dbAdapter.execute(
          `INSERT OR REPLACE INTO file_manifest (relative_path, mtime, size, content_hash, indexed_at) VALUES (?, ?, ?, ?, ?)`,
          [manifestKey, now, json.length, contentHash, now]
        );
      } catch (mErr) {}
    } catch (err) {
      console.error('[CanvasDb] Error syncing canvas file to disk:', err);
    }
  }
}
