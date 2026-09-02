/**
 * @module FsrsDb
 * @description
 * Isolated database persistence module for the FSRS Spaced Repetition extension.
 * Automatically initializes dynamic SQLite tables and indexes upon demand,
 * ensuring Flint native core requires zero hardcoded knowledge of FSRS schemas.
 */

import { dbAdapter } from '@/lib/db/adapter';
import type { FSRSCardRecord } from './types';

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
