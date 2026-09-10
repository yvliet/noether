/**
 * @module sketchDb
 * @description
 * Relational SQLite WASM persistence and memory caching for Flint Sketch.
 * Stores stroke paths, anchoring modes, and timestamps per document.
 */

import { dbAdapter } from '@/lib/db/adapter';
import { SketchDocumentData, SketchStroke, SketchAnchoringMode } from './types';
import { pointsToSvgPath } from './sketchEngine';

// Fast in-memory LRU-like cache for 0ms retrieval on note view switches
const sketchMemoryCache = new Map<string, SketchDocumentData>();

export const SKETCH_TABLE_DEFINITION = {
  tableName: 'document_sketches',
  version: 1,
  columns: {
    document_id: { type: 'text' as const, primaryKey: true },
    anchoring: { type: 'text' as const, default: 'content' },
    strokes_json: { type: 'text' as const, default: '[]' },
    updated_at: { type: 'integer' as const },
  },
};

/**
 * Initializes the ext_sketch_document_sketches SQLite table if it does not yet exist.
 */
export async function initSketchDb(): Promise<void> {
  try {
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS ext_sketch_document_sketches (
        document_id TEXT PRIMARY KEY,
        anchoring TEXT NOT NULL DEFAULT 'content',
        strokes_json TEXT NOT NULL DEFAULT '[]',
        updated_at INTEGER NOT NULL
      );
    `);
    await dbAdapter.execute(`
      CREATE INDEX IF NOT EXISTS idx_sketches_doc ON ext_sketch_document_sketches (document_id);
    `);
  } catch (err) {
    console.error('[Flint Sketch] Failed to initialize SQLite table:', err);
  }
}

/**
 * Loads sketch data for a given document from memory cache, falling back to SQLite WASM.
 */
export async function loadSketchFromDb(documentId: string): Promise<SketchDocumentData | null> {
  if (!documentId) return null;

  if (sketchMemoryCache.has(documentId)) {
    return sketchMemoryCache.get(documentId)!;
  }

  try {
    const rows = await dbAdapter.query<{
      document_id: string;
      anchoring: string;
      strokes_json: string;
      updated_at: number;
    }>(
      `SELECT document_id, anchoring, strokes_json, updated_at FROM ext_sketch_document_sketches WHERE document_id = ?`,
      [documentId]
    );

    if (rows && rows.length > 0) {
      const row = rows[0];
      let parsedStrokes: SketchStroke[] = [];
      try {
        parsedStrokes = JSON.parse(row.strokes_json || '[]');
      } catch {
        parsedStrokes = [];
      }

      // Ensure pathData is populated for each stroke
      for (const s of parsedStrokes) {
        if (!s.pathData && s.points && s.points.length > 0) {
          s.pathData = pointsToSvgPath(s.points);
        }
      }

      const data: SketchDocumentData = {
        documentId: row.document_id,
        anchoring: (row.anchoring || 'content') as SketchAnchoringMode,
        strokes: parsedStrokes,
        updatedAt: row.updated_at,
      };

      sketchMemoryCache.set(documentId, data);
      return data;
    }
  } catch (err) {
    console.error(`[Flint Sketch] Error loading sketch for doc ${documentId}:`, err);
  }

  return null;
}

/**
 * Persists sketch data to memory cache and asynchronously writes to SQLite WASM.
 */
export async function saveSketchToDb(data: SketchDocumentData): Promise<void> {
  if (!data || !data.documentId) return;

  sketchMemoryCache.set(data.documentId, data);

  try {
    const json = JSON.stringify(data.strokes || []);
    const now = Date.now();
    await dbAdapter.execute(
      `INSERT OR REPLACE INTO ext_sketch_document_sketches (document_id, anchoring, strokes_json, updated_at)
       VALUES (?, ?, ?, ?)`,
      [data.documentId, data.anchoring, json, now]
    );
  } catch (err) {
    console.error(`[Flint Sketch] Error saving sketch for doc ${data.documentId}:`, err);
  }
}

/**
 * Removes sketch record from memory cache and SQLite.
 */
export async function deleteSketchFromDb(documentId: string): Promise<void> {
  if (!documentId) return;
  sketchMemoryCache.delete(documentId);

  try {
    await dbAdapter.execute(`DELETE FROM ext_sketch_document_sketches WHERE document_id = ?`, [documentId]);
  } catch (err) {
    console.error(`[Flint Sketch] Error deleting sketch for doc ${documentId}:`, err);
  }
}

/**
 * Retrieves the total count of documents containing drawings.
 */
export async function getSketchDocumentCount(): Promise<number> {
  try {
    const res = await dbAdapter.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM ext_sketch_document_sketches WHERE strokes_json != '[]'`
    );
    return res[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Direct cache setter used during vault markdown import passes.
 */
export function setCachedSketch(data: SketchDocumentData): void {
  if (!data?.documentId) return;
  sketchMemoryCache.set(data.documentId, data);
}

/**
 * Direct cache getter.
 */
export function getCachedSketch(documentId: string): SketchDocumentData | undefined {
  return sketchMemoryCache.get(documentId);
}
