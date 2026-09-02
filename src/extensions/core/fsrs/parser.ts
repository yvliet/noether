/**
 * @module FsrsParser
 * @description
 * Robust markdown and TipTap AST parser for inline flashcard syntax.
 * Extracts Concept cards (::), Bidirectional cards (;;), and Cloze deletions ({...} and ==...==).
 * Handles list item prefixes, block IDs, and deterministic FSRS card reconciliation.
 *
 * @since 0.2.0
 */

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

export interface ExtractedBlock {
  blockId: string | null;
  text: string;
  type: string;
}

/**
 * Strips leading Markdown list markers, checklists, and quote prefixes
 * so card questions don't include unwanted list formatting noise.
 */
function stripMarkdownPrefix(line: string): string {
  return line
    .replace(/^(\s*[-*+]\s*\[[ xX]\]\s*)/, '') // - [ ] or - [x]
    .replace(/^(\s*[-*+]\s+)/, '')              // - or * or +
    .replace(/^(\s*\d+[\.\)]\s+)/, '')          // 1. or 1)
    .replace(/^(\s*>\s*)/, '')                  // > blockquote
    .trim();
}

/**
 * Traverses a TipTap document AST or raw markdown text and returns
 * structured text blocks suitable for flashcard parsing.
 */
export function extractTextBlocksFromDocContent(
  content: string | Record<string, unknown>,
  documentId: string
): ExtractedBlock[] {
  const blocks: ExtractedBlock[] = [];
  if (!content) return blocks;

  let docObj: any = null;
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        docObj = JSON.parse(trimmed);
      } catch {
        docObj = null;
      }
    }
    if (!docObj) {
      // Plain text / Markdown fallback: split into lines
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const t = line.trim();
        if (t) {
          blocks.push({
            blockId: `blk-${documentId}-${idx}`,
            text: t,
            type: 'paragraph',
          });
        }
      });
      return blocks;
    }
  } else {
    docObj = content;
  }

  let orderIndex = 0;

  function traverseNodes(node: any) {
    if (!node) return;

    // Skip code blocks to avoid false positives with :: (e.g. std::vector, C++ code)
    if (node.type === 'codeBlock') {
      return;
    }

    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'taskItem') {
      let blockText = '';
      if (Array.isArray(node.content)) {
        for (const child of node.content) {
          if (child.type === 'text' && typeof child.text === 'string') {
            // Check if text has highlight mark (==highlight== in TipTap)
            const isHighlight = child.marks?.some((m: any) => m.type === 'highlight');
            if (isHighlight && !child.text.startsWith('==') && !child.text.endsWith('==')) {
              blockText += `==${child.text}==`;
            } else {
              blockText += child.text;
            }
          } else if (child.text) {
            blockText += child.text;
          } else if (child.content) {
            traverseNodes(child);
          }
        }
      }

      const trimmed = blockText.trim();
      if (trimmed) {
        blocks.push({
          blockId: `blk-${documentId}-${orderIndex++}`,
          text: trimmed,
          type: node.type,
        });
      }
    } else if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverseNodes(child);
      }
    }
  }

  if (docObj?.content && Array.isArray(docObj.content)) {
    for (const topNode of docObj.content) {
      traverseNodes(topNode);
    }
  }

  return blocks;
}

/**
 * Parses block text lines for inline flashcard syntax:
 * 1. Concept :: Descriptor
 * 2. Term ;; Definition (Generates 2 cards: Forward & Reverse)
 * 3. Cloze {answer} or ==answer== (also {{c1::answer}} or {answer::hint})
 */
export function parseCardsFromText(
  documentId: string,
  blockId: string | null,
  text: string
): ParsedCardDraft[] {
  const cards: ParsedCardDraft[] = [];
  if (!text || typeof text !== 'string') return cards;

  const lines = text.split('\n');

  for (const rawLine of lines) {
    const rawTrimmed = rawLine.trim();
    if (!rawTrimmed) continue;

    // Skip code fences and comments
    if (rawTrimmed.startsWith('```') || rawTrimmed.startsWith('~~~') || rawTrimmed.startsWith('<!--')) {
      continue;
    }

    const trimmed = stripMarkdownPrefix(rawTrimmed);
    if (!trimmed) continue;

    // 1. Two-Way Card (;;)
    if (trimmed.includes(';;')) {
      const parts = trimmed.split(';;').map((s) => s.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const front = parts[0];
        const back = parts.slice(1).join(';;').trim();

        // Forward Card
        cards.push({
          key: `${documentId}:${front}->${back}`,
          card_type: 'two_way',
          front_text: front,
          back_text: back,
          cloze_index: null,
          block_id: blockId,
        });

        // Reverse Card
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
        const back = parts.slice(1).join('::').trim();
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

    // 3. Cloze Deletions: {word}, {{c1::word}}, {word::hint}, or ==word==
    // Regex for {cloze} and {{c1::cloze}}
    const clozeRegexCurly = /\{+([^\{\}]+)\}+/g;
    const clozeRegexEqual = /==([^=\n]+)==/g;

    let clozeIdx = 0;
    let match: RegExpExecArray | null;

    // Process curly clozes {...}
    while ((match = clozeRegexCurly.exec(trimmed)) !== null) {
      let rawInner = match[1].trim();
      if (!rawInner) continue;

      // Handle Anki-style {{c1::answer}} or {answer::hint}
      let answer = rawInner;
      if (/^c\d+::/i.test(answer)) {
        answer = answer.replace(/^c\d+::/i, '').trim();
      }
      if (answer.includes('::')) {
        answer = answer.split('::')[0].trim();
      }

      if (!answer) continue;

      cards.push({
        key: `${documentId}:cloze:${trimmed}:${clozeIdx}`,
        card_type: 'cloze',
        front_text: trimmed,
        back_text: answer,
        cloze_index: clozeIdx++,
        block_id: blockId,
      });
    }

    // Process equal clozes ==cloze== (if no curly clozes were found on this line)
    if (clozeIdx === 0) {
      while ((match = clozeRegexEqual.exec(trimmed)) !== null) {
        const answer = match[1].trim();
        if (!answer) continue;

        cards.push({
          key: `${documentId}:cloze_eq:${trimmed}:${clozeIdx}`,
          card_type: 'cloze',
          front_text: trimmed,
          back_text: answer,
          cloze_index: clozeIdx++,
          block_id: blockId,
        });
      }
    }
  }

  return cards;
}

/**
 * Reconciles parsed cards with existing FSRS database records to maintain review histories.
 * Preserves stability, difficulty, reps, and next review date while updating text.
 */
export function reconcileCards(
  parsedDrafts: ParsedCardDraft[],
  documentId: string,
  existingCards: FSRSCardRecord[]
): FSRSCardRecord[] {
  const existingMap = new Map<string, FSRSCardRecord>();
  existingCards.forEach((c) => {
    existingMap.set(c.id, c);
  });

  return parsedDrafts.map((draft) => {
    // Deterministic ID hash derived from key
    const cardId = generateDeterministicCardId(draft.key);
    const existing = existingMap.get(cardId);

    if (existing) {
      // Preserve existing FSRS review states, update front/back/block/type
      return {
        ...existing,
        front_text: draft.front_text,
        back_text: draft.back_text,
        block_id: draft.block_id,
        card_type: draft.card_type,
        cloze_index: draft.cloze_index,
      };
    } else {
      // Create new FSRS card initialized ready for review
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
        due: Date.now(), // New cards are immediately due for first review
      };
    }
  });
}

/**
 * Generates a stable deterministic hash ID for a card key string.
 */
export function generateDeterministicCardId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `card-${Math.abs(hash).toString(36)}`;
}
