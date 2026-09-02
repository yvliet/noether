/**
 * @module CanvasDb
 * @description
 * Isolated database persistence module for the Canvas extension.
 * Automatically initializes dynamic SQLite tables and indexes upon demand,
 * ensuring Flint native core requires zero hardcoded knowledge of canvas schemas.
 */

import { dbAdapter } from '@/lib/db/adapter';
import type { CanvasNode, CanvasEdge } from './types';

let isInitialized = false;

/**
 * Ensures canvas tables and indices exist in the active SQLite database.
 * Called automatically by canvas operations before querying.
 */
export async function initCanvasTables(): Promise<void> {
  if (isInitialized) return;
  try {
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS canvas_nodes (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL DEFAULT 'default',
        type TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL NOT NULL,
        height REAL NOT NULL,
        document_id TEXT,
        text_content TEXT,
        color TEXT
      );
    `);

    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS canvas_edges (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL DEFAULT 'default',
        from_node_id TEXT NOT NULL,
        to_node_id TEXT NOT NULL,
        label TEXT
      );
    `);

    await dbAdapter.execute(`CREATE INDEX IF NOT EXISTS idx_canvas_nodes_board ON canvas_nodes(board_id);`);
    await dbAdapter.execute(`CREATE INDEX IF NOT EXISTS idx_canvas_edges_board ON canvas_edges(board_id);`);
    isInitialized = true;
  } catch (err) {
    console.error('[Flint Canvas] Failed to initialize canvas tables:', err);
  }
}

export async function getCanvasNodes(boardId = 'default'): Promise<CanvasNode[]> {
  await initCanvasTables();
  const nodes = await dbAdapter.query<CanvasNode>(
    `SELECT * FROM canvas_nodes WHERE board_id = ?`,
    [boardId]
  );
  return nodes;
}

export async function getCanvasEdges(boardId = 'default'): Promise<CanvasEdge[]> {
  await initCanvasTables();
  const edges = await dbAdapter.query<CanvasEdge>(
    `SELECT * FROM canvas_edges WHERE board_id = ?`,
    [boardId]
  );
  return edges;
}

export async function saveCanvasNode(node: CanvasNode): Promise<void> {
  await initCanvasTables();
  await dbAdapter.execute(
    `INSERT OR REPLACE INTO canvas_nodes (id, board_id, type, x, y, width, height, document_id, text_content, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    ]
  );
}

export async function deleteCanvasNode(nodeId: string): Promise<void> {
  await initCanvasTables();
  await dbAdapter.execute(`DELETE FROM canvas_nodes WHERE id = ?`, [nodeId]);
  await dbAdapter.execute(
    `DELETE FROM canvas_edges WHERE from_node_id = ? OR to_node_id = ?`,
    [nodeId, nodeId]
  );
}

export async function saveCanvasEdge(edge: CanvasEdge): Promise<void> {
  await initCanvasTables();
  await dbAdapter.execute(
    `INSERT OR REPLACE INTO canvas_edges (id, board_id, from_node_id, to_node_id, label)
     VALUES (?, ?, ?, ?, ?)`,
    [edge.id, edge.board_id || 'default', edge.from_node_id, edge.to_node_id, edge.label || null]
  );
}

export async function deleteCanvasEdge(edgeId: string): Promise<void> {
  await initCanvasTables();
  await dbAdapter.execute(`DELETE FROM canvas_edges WHERE id = ?`, [edgeId]);
}
