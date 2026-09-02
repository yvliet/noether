import { FSRSCardRecord } from './types';
import { createNewFSRSCardState } from './engine';

export interface ParsedCardDraft {
  key: string;
  card_type: 'concept_descriptor' | 'cloze' | 'two_way';
  front_text: string;
  back_text: string;
  cloze_index: number | null;
  block_id: string | null;
}

/**
 * Parses block text lines for inline flashcard syntax:
 * 1. Concept :: Descriptor
 * 2. Term ;; Definition (Generates 2 cards: Forward & Reverse)
 * 3. Cloze {answer} or ==answer==
 */
export function parseCardsFromText(
  documentId: string,
  blockId: string | null,
  text: string
): ParsedCardDraft[] {
  const cards: ParsedCardDraft[] = [];
  if (!text || typeof text !== 'string') return cards;

  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 1. Two-Way Card (;;)
    if (trimmed.includes(';;')) {
      const parts = trimmed.split(';;').map((s) => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const front = parts[0];
        const back = parts[1];

        // Forward
        cards.push({
          key: `${documentId}:${front}->${back}`,
          card_type: 'two_way',
          front_text: front,
          back_text: back,
          cloze_index: null,
          block_id: blockId,
        });

        // Reverse
        cards.push({
          key: `${documentId}:${back}->${front}`,
          card_type: 'two_way',
          front_text: back,
          back_text: front,
          cloze_index: null,
          block_id: blockId,
        });
        continue;
      }
    }

    // 2. Concept / Descriptor Card (::)
    if (trimmed.includes('::')) {
      const parts = trimmed.split('::').map((s) => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const front = parts[0];
        const back = parts[1];
        cards.push({
          key: `${documentId}:${front}::${back}`,
          card_type: 'concept_descriptor',
          front_text: front,
          back_text: back,
          cloze_index: null,
          block_id: blockId,
        });
        continue;
      }
    }

    // 3. Cloze Deletions: {word} or ==word==
    const clozeRegexCurly = /\{([^{}]+)\}/g;
    const clozeRegexEqual = /==([^=]+)==/g;

    let clozeIdx = 0;
    let match: RegExpExecArray | null;

    // Process curly clozes
    while ((match = clozeRegexCurly.exec(trimmed)) !== null) {
      const answer = match[1].trim();
      if (!answer) continue;

      // Replace this specific cloze with [...]
      const frontPrompt =
        trimmed.slice(0, match.index) +
        `[...]` +
        trimmed.slice(match.index + match[0].length);

      cards.push({
        key: `${documentId}:cloze:${trimmed}:${clozeIdx}`,
        card_type: 'cloze',
        front_text: frontPrompt,
        back_text: answer,
        cloze_index: clozeIdx++,
        block_id: blockId,
      });
    }

    // Process equal clozes ==cloze==
    while ((match = clozeRegexEqual.exec(trimmed)) !== null) {
      const answer = match[1].trim();
      if (!answer) continue;

      const frontPrompt =
        trimmed.slice(0, match.index) +
        `[...]` +
        trimmed.slice(match.index + match[0].length);

      cards.push({
        key: `${documentId}:cloze_eq:${trimmed}:${clozeIdx}`,
        card_type: 'cloze',
        front_text: frontPrompt,
        back_text: answer,
        cloze_index: clozeIdx++,
        block_id: blockId,
      });
    }
  }

  return cards;
}

/**
 * Reconciles parsed cards with existing FSRS database records to maintain review histories.
 */
export function reconcileCards(
  parsedDrafts: ParsedCardDraft[],
  documentId: string,
  existingCards: FSRSCardRecord[]
): FSRSCardRecord[] {
  const existingMap = new Map<string, FSRSCardRecord>();
  existingCards.forEach((c) => {
    // Card ID is deterministic from key or ID
    existingMap.set(c.id, c);
  });

  return parsedDrafts.map((draft) => {
    // Deterministic ID hash
    const cardId = generateDeterministicCardId(draft.key);
    const existing = existingMap.get(cardId);

    if (existing) {
      // Keep existing FSRS states, update front/back/block
      return {
        ...existing,
        front_text: draft.front_text,
        back_text: draft.back_text,
        block_id: draft.block_id,
        card_type: draft.card_type,
        cloze_index: draft.cloze_index,
      };
    } else {
      // Create new FSRS card
      const baseState = createNewFSRSCardState();
      return {
        id: cardId,
        document_id: documentId,
        block_id: draft.block_id,
        card_type: draft.card_type,
        front_text: draft.front_text,
        back_text: draft.back_text,
        cloze_index: draft.cloze_index,
        ...baseState,
      };
    }
  });
}

function generateDeterministicCardId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `card-${Math.abs(hash).toString(36)}`;
}
