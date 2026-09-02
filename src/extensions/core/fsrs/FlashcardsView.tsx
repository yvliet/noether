import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Brain02Icon, Search01Icon, HelpCircleIcon, RotateCcwIcon, SparklesIcon } from '@/components/common/Icons';
import { getCardsForDocument, getDueCardCount } from './fsrsDb';
import { FSRSCardRecord } from './types';

export const FlashcardsView: React.FC = React.memo(() => {
  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const setIsReviewModalOpen = useWorkspaceStore((s) => s.setIsReviewModalOpen);
  const [cardsInNote, setCardsInNote] = useState<FSRSCardRecord[]>([]);
  const [dueCardCount, setDueCardCount] = useState<number>(0);

  useEffect(() => {
    if (activeDocument?.id) {
      getCardsForDocument(activeDocument.id).then(setCardsInNote);
    } else {
      setCardsInNote([]);
    }
    getDueCardCount().then(setDueCardCount);
  }, [activeDocument?.id, activeDocument?.updated_at]);

  const [filterType, setFilterType] = useState<'all' | 'concept_descriptor' | 'two_way' | 'cloze'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [flippedCardIds, setFlippedCardIds] = useState<Record<string, boolean>>({});

  const toggleCardFlip = useCallback((id: string) => {
    setFlippedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const filteredCards = useMemo(() => {
    let list = cardsInNote;
    if (filterType !== 'all') {
      list = list.filter((c) => c.card_type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.front_text.toLowerCase().includes(q) ||
          c.back_text.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cardsInNote, filterType, searchQuery]);

  const conceptCount = useMemo(() => cardsInNote.filter((c) => c.card_type === 'concept_descriptor').length, [cardsInNote]);
  const twoWayCount = useMemo(() => cardsInNote.filter((c) => c.card_type === 'two_way').length, [cardsInNote]);
  const clozeCount = useMemo(() => cardsInNote.filter((c) => c.card_type === 'cloze').length, [cardsInNote]);

  return (
    <div className="flex flex-col h-full select-none text-xs">
      {/* Top Header */}
      <div className="h-9 px-3 flex items-center justify-between text-[var(--flint-text-muted)] shrink-0 border-b border-[var(--flint-border-base)]">
        <div className="flex items-center gap-1.5 font-medium text-xs text-[var(--flint-text-secondary)]">
          <Brain02Icon size={14} className="text-[var(--flint-accent)]" />
          <span>Flashcards</span>
          <span className="text-[10px] text-[var(--flint-text-faint)] font-mono">({cardsInNote.length})</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            title={isSearchOpen ? 'Close search' : 'Search flashcards'}
            className={`p-1 rounded hover:bg-[var(--flint-bg-card-hover)] transition-colors ${
              isSearchOpen ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)]' : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)]'
            }`}
          >
            <Search01Icon size={13} />
          </button>
        </div>
      </div>

      {/* Launch Study Deck Button */}
      {cardsInNote.length > 0 && (
        <div className="p-2.5 pb-1.5">
          <button
            onClick={() => setIsReviewModalOpen(true)}
            className="w-full py-2 px-3 rounded-lg border border-[var(--flint-border-base)] hover:border-[var(--flint-border-strong)] bg-[var(--flint-bg-card)] hover:bg-[var(--flint-bg-card-hover)] flex items-center justify-between text-left transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <SparklesIcon size={14} className="text-[var(--flint-accent)]" />
              <div>
                <div className="text-[11px] font-medium text-[var(--flint-text-primary)]">
                  Review Flashcards
                </div>
                <div className="text-[10px] text-[var(--flint-text-muted)]">
                  {dueCardCount > 0 ? `${dueCardCount} cards due` : `${cardsInNote.length} cards in note`}
                </div>
              </div>
            </div>

            <kbd className="px-1.5 py-0.5 rounded bg-[var(--flint-bg-input)] text-[9px] font-mono text-[var(--flint-text-muted)] border border-[var(--flint-border-base)]">
              Ctrl+Shift+R
            </kbd>
          </button>
        </div>
      )}

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="px-2.5 py-1.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--flint-bg-input)] text-xs text-[var(--flint-text-primary)] border border-[var(--flint-border-base)]">
            <Search01Icon size={13} className="text-[var(--flint-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter cards..."
              autoFocus
              className="bg-transparent outline-none flex-1 text-xs text-[var(--flint-text-primary)] placeholder-[var(--flint-text-faint)]"
            />
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {cardsInNote.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-2 mb-1 flex-wrap border-b border-[var(--flint-border-base)]">
          {[
            { id: 'all', label: 'All', count: cardsInNote.length, show: true },
            { id: 'concept_descriptor', label: 'Concept', count: conceptCount, show: conceptCount > 0 },
            { id: 'two_way', label: 'Two-Way', count: twoWayCount, show: twoWayCount > 0 },
            { id: 'cloze', label: 'Cloze', count: clozeCount, show: clozeCount > 0 },
          ].filter((f) => f.show).map((f) => {
            const isSelected = filterType === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`px-2.5 py-0.5 rounded-[5px] text-[11px] transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
                  isSelected
                    ? 'bg-[var(--flint-accent)] text-white font-semibold border border-black/20'
                    : 'bg-[#252525] hover:bg-[#2e2e2e] text-[#999] hover:text-white border border-[#383838] hover:border-[#484848] font-medium'
                }`}
              >
                {f.label} <span className="text-[10px] opacity-70 font-mono ml-0.5">{f.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Flashcards List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1.5 custom-scrollbar flex flex-col gap-2">
        {filteredCards.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-2 select-none text-[var(--flint-text-muted)]">
            <Brain02Icon size={24} className="opacity-40" />
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]">No flashcards found in note.</span>
              <span
                data-tooltip="Create cards in note:&#10;• Concept :: Explanation&#10;• Term ;; Definition&#10;• Sentence with {cloze}"
                className="inline-flex items-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-help transition-colors"
              >
                <HelpCircleIcon size={13} />
              </span>
            </div>
          </div>
        ) : (
          filteredCards.map((card) => {
            const isFlipped = !flippedCardIds[card.id];
            const isCloze = card.card_type === 'cloze';

            return (
              <div
                key={card.id}
                onClick={() => toggleCardFlip(card.id)}
                className="p-2.5 rounded-lg bg-[var(--flint-bg-card)] border border-[var(--flint-border-base)] hover:border-[var(--flint-border-strong)] transition-all flex flex-col gap-1.5 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold uppercase tracking-wider text-[var(--flint-text-muted)] flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isFlipped ? 'bg-[var(--flint-accent)]' : 'bg-emerald-400'}`} />
                    {card.card_type.replace(/_/g, ' ')}
                  </span>

                  <span className="text-[10px] text-[var(--flint-text-faint)] flex items-center gap-1 group-hover:text-[var(--flint-text-muted)] transition-colors">
                    <RotateCcwIcon size={10} />
                    {isFlipped ? 'Click to show answer' : 'Showing answer'}
                  </span>
                </div>

                {isFlipped ? (
                  <div className="text-[12px] text-[var(--flint-text-primary)] font-normal leading-snug">
                    {isCloze ? (
                      card.front_text.split(/(\{.+?\})/g).map((part, i) =>
                        part.startsWith('{') && part.endsWith('}') ? (
                          <span
                            key={i}
                            className="inline-block px-1.5 py-0.5 mx-0.5 rounded-[5px] bg-[#222222] border border-[#383838] shadow-[0_1px_2px_rgba(0,0,0,0.35)] text-[var(--flint-accent)] font-mono text-[10px]"
                          >
                            [...]
                          </span>
                        ) : (
                          <span key={i}>{part}</span>
                        )
                      )
                    ) : (
                      card.front_text
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-[var(--flint-text-secondary)] leading-relaxed bg-[var(--flint-bg-input)] p-2 rounded border border-[var(--flint-border-base)]">
                    <div className="text-[9px] uppercase tracking-wider text-[var(--flint-accent)] font-semibold mb-0.5">
                      Answer
                    </div>
                    {card.back_text}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

