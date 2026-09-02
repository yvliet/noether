/**
 * @module fts
 * @description
 * High-performance full-text search engine for Flint documents and atomic blocks.
 * Supports FTS5 BM25 statistical relevance ranking with automatic FTS4 and LIKE fallbacks.
 *
 * Rationale:
 * - BM25 scoring ensures the most relevant block matches (frequency + inverse document frequency)
 *   appear first in Command Palette and search results.
 * - Multi-token prefix expansion allows real-time instant search as the user types partial words.
 *
 * @since 0.1.0
 */

import { dbAdapter } from './adapter';

export interface FTSResult {
  document_id: string;
  document_title: string;
  block_id: string;
  content_text: string;
  snippet?: string;
  rank?: number;
}

/**
 * Prepares an FTS query string with prefix matching for individual words
 */
function buildFtsMatchQuery(rawQuery: string): string {
  // Strip special SQLite FTS control characters that could cause syntax errors
  const tokens = rawQuery
    .trim()
    .replace(/['"*^(){}\[\]:+\-~]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return '';
  // Format each token with trailing wildcard for instantaneous prefix search: "tok1* tok2*"
  return tokens.map((t) => `${t}*`).join(' ');
}

export async function searchFullText(queryText: string): Promise<FTSResult[]> {
  if (!queryText || !queryText.trim()) return [];

  const matchQuery = buildFtsMatchQuery(queryText);
  const rawClean = queryText.trim().replace(/['"*]/g, '');
  if (!matchQuery && !rawClean) return [];

  try {
    let ftsResults: FTSResult[] = [];

    if (matchQuery) {
      if (dbAdapter.supportsFts5()) {
        // FTS5 with native BM25 statistical relevance ranking
        ftsResults = await dbAdapter.query<FTSResult>(
          `SELECT b.block_id, b.document_id, b.content_text, d.title as document_title,
                  bm25(blocks_fts) as rank
           FROM blocks_fts b
           JOIN documents d ON d.id = b.document_id
           WHERE blocks_fts MATCH ?
           ORDER BY rank ASC
           LIMIT 30`,
          [matchQuery]
        );
      } else {
        // FTS4 fallback
        ftsResults = await dbAdapter.query<FTSResult>(
          `SELECT b.block_id, b.document_id, b.content_text, d.title as document_title
           FROM blocks_fts b
           JOIN documents d ON d.id = b.document_id
           WHERE blocks_fts MATCH ?
           LIMIT 30`,
          [matchQuery]
        );
      }
    }

    if (ftsResults.length > 0) {
      return ftsResults;
    }

    // Fallback LIKE query across blocks and titles if FTS returns no matches
    const fallbackResults = await dbAdapter.query<FTSResult>(
      `SELECT b.id as block_id, b.document_id, b.content_text, d.title as document_title
       FROM blocks b
       JOIN documents d ON d.id = b.document_id
       WHERE b.content_text LIKE ? OR d.title LIKE ?
       LIMIT 30`,
      [`%${rawClean}%`, `%${rawClean}%`]
    );

    return fallbackResults;
  } catch (err) {
    console.error('[Flint FTS] Search error:', err);
    return [];
  }
}
