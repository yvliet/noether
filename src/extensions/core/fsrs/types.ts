/**
 * @module FsrsPluginTypes
 * @description
 * Domain models and data structures for the FSRS Spaced Repetition extension.
 * Encapsulates ts-fsrs types inside the FSRS plugin module to prevent
 * external library leakage into Flint native core.
 */

import type { State } from 'ts-fsrs';

export interface FSRSCardRecord {
  id: string;
  document_id: string;
  block_id: string | null;
  card_type: 'concept_descriptor' | 'cloze' | 'two_way';
  front_text: string;
  back_text: string;
  cloze_index: number | null;

  // FSRS State Parameters
  due: number; // timestamp in ms
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: State; // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review: number | null;
}
