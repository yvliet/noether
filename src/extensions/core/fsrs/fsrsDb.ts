/**
 * @module FsrsDb
 * @description
 * Isolated database persistence module for the FSRS Spaced Repetition extension.
 * Automatically initializes dynamic SQLite tables and indexes upon demand,
 * ensuring Flint native core requires zero hardcoded knowledge of FSRS schemas.
 */

import { dbAdapter } from '@/lib/db/adapter';
import type { FSRSCardRecord } from './types';
import { extractTextBlocksFromDocContent, parseCardsFromText, reconcileCards } from './parser';

let isInitialized = false;

/**
 * Initializes FSRS tables and indices dynamically if not already present.
 */
export async function initFsrsTables(): Promise<void> {
  if (isInitialized) return;
  try {
    await dbAdapter.execute(`
      CREATE TABLE IF NOT EXISTS fsrs_cards (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        block_id TEXT,
        card_type TEXT NOT NULL,
        front_text TEXT NOT NULL,
        back_text TEXT NOT NULL,
        cloze_index INTEGER,
        due INTEGER NOT NULL,
        stability REAL NOT NULL,
        difficulty REAL NOT NULL,
        elapsed_days REAL NOT NULL,
        scheduled_days REAL NOT NULL,
        reps INTEGER NOT NULL,
        lapses INTEGER NOT NULL,
        state INTEGER NOT NULL,
        last_review INTEGER
      );
    `);

    await dbAdapter.execute(`CREATE INDEX IF NOT EXISTS idx_fsrs_due ON fsrs_cards(due);`);
    await dbAdapter.execute(`CREATE INDEX IF NOT EXISTS idx_fsrs_doc_id ON fsrs_cards(document_id);`);
    isInitialized = true;
  } catch (err) {
    console.error('[Flint FSRS] Failed to initialize FSRS tables:', err);
  }
}

export async function getDueCards(): Promise<FSRSCardRecord[]> {
  await initFsrsTables();
  const now = Date.now();
  try {
    const rows = await dbAdapter.query<FSRSCardRecord>(
      `SELECT * FROM fsrs_cards WHERE due <= ? ORDER BY due ASC`,
      [now]
    );
    return rows;
  } catch (err) {
    console.error('[Flint FSRS] Error fetching due cards:', err);
    return [];
  }
}

export async function getAllCards(): Promise<FSRSCardRecord[]> {
  await initFsrsTables();
  try {
    const rows = await dbAdapter.query<FSRSCardRecord>(
      `SELECT * FROM fsrs_cards ORDER BY due ASC`
    );
    return rows;
  } catch (err) {
    return [];
  }
}

export async function getCardsForDocument(documentId: string): Promise<FSRSCardRecord[]> {
  await initFsrsTables();
  try {
    const rows = await dbAdapter.query<FSRSCardRecord>(
      `SELECT * FROM fsrs_cards WHERE document_id = ? ORDER BY due ASC`,
      [documentId]
    );
    return rows;
  } catch (err) {
    return [];
  }
}

export async function getDueCardCount(): Promise<number> {
  await initFsrsTables();
  const now = Date.now();
  try {
    const res = await dbAdapter.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM fsrs_cards WHERE due <= ?`,
      [now]
    );
    return res[0]?.count || 0;
  } catch (err) {
    return 0;
  }
}

export async function deleteCardsForDocument(documentId: string): Promise<void> {
  await initFsrsTables();
  try {
    await dbAdapter.execute(`DELETE FROM fsrs_cards WHERE document_id = ?`, [documentId]);
  } catch (err) {
    console.error('[Flint FSRS] Error deleting cards for document:', err);
  }
}

export async function updateCardState(card: FSRSCardRecord): Promise<void> {
  await initFsrsTables();
  try {
    await dbAdapter.execute(
      `UPDATE fsrs_cards SET 
        due = ?, stability = ?, difficulty = ?, elapsed_days = ?, scheduled_days = ?,
        reps = ?, lapses = ?, state = ?, last_review = ?
       WHERE id = ?`,
      [
        card.due,
        card.stability,
        card.difficulty,
        card.elapsed_days,
        card.scheduled_days,
        card.reps,
        card.lapses,
        card.state,
        card.last_review,
        card.id,
      ]
    );
  } catch (err) {
    console.error('[Flint FSRS] Error updating card state:', err);
  }
}

/**
 * Saves or updates a document's reconciled cards, pruning any deleted ones.
 */
export async function saveCardsForDocument(
  documentId: string,
  cards: FSRSCardRecord[]
): Promise<void> {
  await initFsrsTables();
  try {
    const existingCards = await getCardsForDocument(documentId);
    const activeIds = new Set(cards.map((c) => c.id));
    const toDelete = existingCards.filter((c) => !activeIds.has(c.id));

    for (const card of toDelete) {
      await dbAdapter.execute(`DELETE FROM fsrs_cards WHERE id = ?`, [card.id]);
    }

    for (const card of cards) {
      await dbAdapter.execute(
        `INSERT INTO fsrs_cards (
          id, document_id, block_id, card_type, front_text, back_text, cloze_index,
          due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          front_text = excluded.front_text,
          back_text = excluded.back_text,
          block_id = excluded.block_id,
          card_type = excluded.card_type,
          cloze_index = excluded.cloze_index`,
        [
          card.id,
          card.document_id,
          card.block_id,
          card.card_type,
          card.front_text,
          card.back_text,
          card.cloze_index,
          card.due,
          card.stability,
          card.difficulty,
          card.elapsed_days,
          card.scheduled_days,
          card.reps,
          card.lapses,
          card.state,
          card.last_review,
        ]
      );
    }
  } catch (err) {
    console.error('[Flint FSRS] Error saving cards for document:', err);
  }
}

/**
 * Synchronizes flashcards for a specific document by ID.
 * Parses text blocks, reconciles with existing FSRS cards, and updates SQLite.
 */
export async function syncDocumentCards(
  documentId: string,
  contentJsonOrText?: string
): Promise<FSRSCardRecord[]> {
  await initFsrsTables();
  try {
    let content = contentJsonOrText;
    if (content === undefined) {
      const rows = await dbAdapter.query<{ content_json: string; is_folder: number }>(
        `SELECT content_json, is_folder FROM documents WHERE id = ?`,
        [documentId]
      );
      if (!rows.length || rows[0].is_folder) {
        await deleteCardsForDocument(documentId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('flint:fsrs-updated'));
        }
        return [];
      }
      content = rows[0].content_json;
    }

    const blocks = extractTextBlocksFromDocContent(content || '', documentId);
    const drafts = blocks.flatMap((b) => parseCardsFromText(documentId, b.blockId, b.text));

    const existingCards = await getCardsForDocument(documentId);
    const reconciled = reconcileCards(drafts, documentId, existingCards);

    await saveCardsForDocument(documentId, reconciled);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flint:fsrs-updated'));
    }
    return reconciled;
  } catch (err) {
    console.error('[Flint FSRS] Error syncing document cards:', err);
    return [];
  }
}

/**
 * Scans all documents in the active vault and synchronizes their flashcards.
 * Cleans up orphaned card records for deleted documents.
 */
export async function syncAllVaultCards(): Promise<number> {
  await initFsrsTables();
  try {
    const docs = await dbAdapter.query<{ id: string; content_json: string }>(
      `SELECT id, content_json FROM documents WHERE is_folder = 0`
    );

    let totalCards = 0;
    const activeDocIds = new Set(docs.map((d) => d.id));

    for (const doc of docs) {
      const cards = await syncDocumentCards(doc.id, doc.content_json);
      totalCards += cards.length;
    }

    // Clean up cards belonging to deleted / non-existent documents
    const allCards = await getAllCards();
    for (const card of allCards) {
      if (!activeDocIds.has(card.document_id)) {
        await dbAdapter.execute(`DELETE FROM fsrs_cards WHERE id = ?`, [card.id]);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flint:fsrs-updated'));
    }

    return totalCards;
  } catch (err) {
    console.error('[Flint FSRS] Error syncing all vault cards:', err);
    return 0;
  }
}
