/**
 * @module FsrsExtension
 * @description
 * Built-in core extension embedding the FSRS-4.5 spaced repetition review engine.
 * Registers the flashcard modal host, action rail review launcher, sidebar cards tab,
 * status bar due counter, and card creation slash commands.
 *
 * Fully modular and decoupled from Flint native core: manages its own database tables
 * and cleans up document-associated cards via event listeners.
 *
 * @since 0.2.0
 */

import React, { useState, useEffect } from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { Brain02Icon } from '@/components/common/Icons';
import { fsrsReadme } from './readme';
import {
  initFsrsTables,
  getDueCards,
  getDueCardCount,
  getAllCards,
  getCardsForDocument,
  updateCardState,
  deleteCardsForDocument,
  syncDocumentCards,
  syncAllVaultCards,
} from './fsrsDb';
import { getSchedulingOptions } from './engine';

const LazyFlashcardsView = React.lazy(() =>
  import('./FlashcardsView').then((m) => ({ default: m.FlashcardsView }))
);
const LazyFsrsSettingsTab = React.lazy(() =>
  import('./FsrsSettingsTab').then((m) => ({ default: m.FsrsSettingsTab }))
);
const LazyStudyReviewModal = React.lazy(() =>
  import('./StudyReviewModal').then((m) => ({ default: m.StudyReviewModal }))
);

export const FSRS_MANIFEST: ExtensionManifest = {
  id: 'fsrs-spaced-repetition',
  name: 'Spaced Repetition (FSRS)',
  version: '1.0.0',
  description: 'Modern FSRS-4.5 spaced repetition flashcard review engine embedded directly in notes.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['spaced-repetition', 'fsrs', 'flashcards', 'learning', 'study'],
  readme: fsrsReadme,
};

const FsrsDueBadgeItem: React.FC<{ app: FlintApp }> = ({ app }) => {
  const [dueCount, setDueCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const updateCount = () => {
      getDueCardCount().then((count) => {
        if (isMounted) setDueCount(count);
      });
    };
    updateCount();

    const handleUpdateEvent = () => updateCount();
    window.addEventListener('flint:fsrs-updated', handleUpdateEvent);
    window.addEventListener('focus', handleUpdateEvent);

    const unsubDocSaved = app.events.on('document:saved', handleUpdateEvent);

    // Passive fallback interval: only check every 5 minutes and only if document is visible
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        updateCount();
      }
    }, 300000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('flint:fsrs-updated', handleUpdateEvent);
      window.removeEventListener('focus', handleUpdateEvent);
      unsubDocSaved.dispose();
    };
  }, [app.events]);

  if (dueCount <= 0) return null;

  return (
    <button
      onClick={() => {
        app.events.emit('editor:action', { action: 'open-fsrs-review' });
        window.dispatchEvent(new CustomEvent('flint:open-fsrs-review'));
      }}
      className="flex items-center gap-1 text-[#aaaaaa] hover:text-white cursor-pointer"
      title={`${dueCount} cards due for FSRS review`}
    >
      <Brain02Icon size={12} />
      <span>{dueCount} due</span>
    </button>
  );
};

export class FsrsExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = FSRS_MANIFEST) {
    super(app, manifest);
  }

  public async onload(): Promise<void> {
    // Initialize FSRS tables on load and perform initial vault synchronization
    await initFsrsTables();
    await syncAllVaultCards();

    // Clean up cards when a document is deleted
    this.onEvent('document:deleted', ({ id }) => {
      deleteCardsForDocument(id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flint:fsrs-updated'));
      }
    });

    // Synchronize cards whenever a document is saved
    this.onEvent('document:saved', ({ id }) => {
      syncDocumentCards(id);
    });

    // Synchronize all cards whenever a vault is loaded or switched
    this.onEvent('vault:loaded', () => {
      syncAllVaultCards();
    });

    this.onEvent('vault:changed', () => {
      syncAllVaultCards();
    });

    // 0. Register Study Review Modal dynamically into the global app modal host
    this.registerModal({
      id: 'study-review-modal',
      render: () => (
        <React.Suspense fallback={null}>
          <LazyStudyReviewModal />
        </React.Suspense>
      ),
    });

    // 1. Register Action Rail item
    this.addActionRailIcon(
      'review-flashcards',
      <Brain02Icon size={16} />,
      'Review flashcards (Ctrl+Shift+R)',
      (app) => {
        app.events.emit('editor:action', { action: 'open-fsrs-review' });
        window.dispatchEvent(new CustomEvent('flint:open-fsrs-review'));
      },
      70
    );

    // 2. Register Right Sidebar Tab
    this.registerSidebarTab({
      id: 'cards',
      title: 'Flashcards in Note',
      icon: <Brain02Icon size={14} />,
      side: 'right',
      order: 50,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyFlashcardsView />
        </React.Suspense>
      ),
    });

    // 3. Register Command
    this.addCommand({
      id: 'cmd-fsrs-review',
      title: 'Review due flashcards (FSRS)',
      section: 'Study',
      icon: <Brain02Icon size={16} />,
      hotkey: 'Ctrl+Shift+R',
      action: (app) => {
        app.events.emit('editor:action', { action: 'open-fsrs-review' });
        window.dispatchEvent(new CustomEvent('flint:open-fsrs-review'));
      },
    });

    // 4. Register Status Bar item for due count
    this.addStatusBarItem({
      id: 'fsrs-due-badge',
      alignment: 'right',
      order: 30,
      render: (app) => <FsrsDueBadgeItem app={app} />,
    });

    // 5. Register Flashcard Slash Commands
    this.registerSlashCommand({
      title: 'Concept Flashcard',
      description: 'Insert Concept :: Descriptor inline card',
      icon: 'card',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent('Concept :: Explanation of concept').run();
      },
    });

    this.registerSlashCommand({
      title: 'Two-Way Flashcard',
      description: 'Insert Term ;; Definition bidirectional card',
      icon: 'card',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent('Term ;; Reverse Definition').run();
      },
    });

    this.registerSlashCommand({
      title: 'Cloze Flashcard',
      description: 'Insert Cloze deletion card',
      icon: 'card',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).insertContent('The speed of light is {299,792,458 m/s}.').run();
      },
    });

    // 6. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'fsrs-settings',
      name: 'Spaced repetition',
      icon: <Brain02Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyFsrsSettingsTab />
        </React.Suspense>
      ),
    });

    // 7. Register Dynamic Placeholder Hint
    this.registerPlaceholderHint({
      id: 'fsrs-card-syntax',
      hint: "'::' for flashcards",
      order: 10,
    });

    // ── MCP Tools Registration ──

    // 8. Tool: fsrs_get_due_cards
    this.registerTool({
      name: 'get_due_cards',
      description: 'Get all flashcards currently due for spaced repetition review, with optional document filter.',
      category: 'study',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Optional document ID to filter due flashcards belonging to a specific note',
          },
        },
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string | undefined;
          let cards = await getDueCards();
          if (documentId) {
            cards = cards.filter((c) => c.document_id === documentId);
          }
          return {
            content: [{ type: 'text', text: JSON.stringify({ cards, total: cards.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 9. Tool: fsrs_get_due_count
    this.registerTool({
      name: 'get_due_count',
      description: 'Get the total number of flashcards currently due for review across the entire vault.',
      category: 'study',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (_args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const count = await getDueCardCount();
          return {
            content: [{ type: 'text', text: JSON.stringify({ dueCount: count }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 10. Tool: fsrs_review_card
    this.registerTool({
      name: 'review_card',
      description: 'Record a study review outcome for a flashcard and advance its FSRS-4.5 spaced repetition state.',
      category: 'study',
      parameters: {
        type: 'object',
        properties: {
          cardId: {
            type: 'string',
            description: 'Unique identifier of the flashcard being reviewed',
          },
          rating: {
            type: 'string',
            description: 'Review outcome rating',
            enum: ['Again', 'Hard', 'Good', 'Easy'],
          },
        },
        required: ['cardId', 'rating'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const cardId = args.cardId as string;
          const rating = args.rating as string;
          if (!cardId || !rating) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'cardId and rating parameters are required' }],
            };
          }

          const allCards = await getAllCards();
          const card = allCards.find((c) => c.id === cardId);
          if (!card) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Flashcard with ID "${cardId}" not found.` }],
            };
          }

          const options = getSchedulingOptions(card, new Date());
          const selectedOption = options.find((opt) => opt.label.toLowerCase() === rating.toLowerCase());
          if (!selectedOption) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Invalid rating "${rating}". Must be one of: Again, Hard, Good, Easy.`,
                },
              ],
            };
          }

          await updateCardState(selectedOption.nextCard);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  cardId,
                  rating: selectedOption.label,
                  interval: selectedOption.intervalText,
                  nextDue: new Date(selectedOption.nextCard.due).toISOString(),
                  card: selectedOption.nextCard,
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

    // 11. Tool: fsrs_get_cards_for_document
    this.registerTool({
      name: 'get_cards_for_document',
      description: 'Retrieve all flashcards created in or associated with a specific note/document.',
      category: 'study',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Target document identifier',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string;
          if (!documentId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'documentId parameter is required' }],
            };
          }
          const cards = await getCardsForDocument(documentId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ documentId, cards, total: cards.length }) }],
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
export const FsrsPlugin = FsrsExtension;
export default FsrsExtension;
