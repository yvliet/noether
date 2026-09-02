import React, { useState, useEffect, useCallback, useMemo } from 'react';
import clsx from 'clsx';
import {
  Brain02Icon,
  LinkSquare02Icon,
  SparklesIcon,
  RotateCcwIcon,
  Cancel01Icon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { FSRSCardRecord } from './types';
import { getDueCards, getDueCardCount, updateCardState } from './fsrsDb';
import { getSchedulingOptions, SchedulingOption } from './engine';
import { useFsrsSettings } from './fsrsSettings';

const FLASHCARD_STYLES = `
  .flint-plugin-flashcard-scene {
    perspective: 1000px;
  }
  .flint-plugin-flashcard-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .flint-plugin-flashcard-inner.is-flipped {
    transform: rotateY(180deg);
  }
  .flint-plugin-flashcard-face {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    border-radius: 12px;
    background-color: var(--flint-bg-card);
    border: 1px solid var(--flint-border-strong);
    box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 26px 28px;
    overflow-y: auto;
  }
  .flint-plugin-flashcard-back {
    transform: rotateY(180deg);
  }
`;

export const StudyReviewModal: React.FC = React.memo(() => {
  const isReviewModalOpen = useWorkspaceStore((s) => s.isReviewModalOpen);
  const setIsReviewModalOpen = useWorkspaceStore((s) => s.setIsReviewModalOpen);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);

  const [dueCards, setDueCards] = useState<FSRSCardRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load due cards when review opens
  useEffect(() => {
    if (isReviewModalOpen) {
      setIsLoading(true);
      setIsFinished(false);
      setCurrentIndex(0);
      setIsRevealed(false);

      getDueCards().then((cards) => {
        setDueCards(cards);
        setIsLoading(false);
      });
    }
  }, [isReviewModalOpen]);

  useEffect(() => {
    const handleOpen = () => setIsReviewModalOpen(true);
    window.addEventListener('flint:open-fsrs-review', handleOpen);
    return () => window.removeEventListener('flint:open-fsrs-review', handleOpen);
  }, [setIsReviewModalOpen]);

  const currentCard = dueCards[currentIndex];
  const { fsrsRetention, fsrsMaxInterval } = useFsrsSettings();
  const schedulingOptions: SchedulingOption[] = useMemo(() => {
    if (!currentCard) return [];
    const retention = parseFloat(fsrsRetention) || 0.9;
    const maxInterval = parseInt(fsrsMaxInterval, 10) || 36500;
    return getSchedulingOptions(currentCard, new Date(), retention, maxInterval);
  }, [currentCard, fsrsRetention, fsrsMaxInterval]);

  const handleFlip = useCallback(() => {
    setIsRevealed((prev) => !prev);
  }, []);

  const handleRate = useCallback(async (option: SchedulingOption) => {
    if (!currentCard) return;

    // Persist new FSRS state
    await updateCardState(option.nextCard);

    if (currentIndex + 1 < dueCards.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
    } else {
      setIsFinished(true);
      const { default: confetti } = await import('canvas-confetti');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      window.dispatchEvent(new CustomEvent('flint:fsrs-updated'));
    }
  }, [currentCard, currentIndex, dueCards.length]);

  const handleJumpToNote = useCallback(async () => {
    if (currentCard) {
      setIsReviewModalOpen(false);
      await setActiveDocumentById(currentCard.document_id);
    }
  }, [currentCard, setIsReviewModalOpen, setActiveDocumentById]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isReviewModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsReviewModalOpen(false);
        return;
      }

      if (isFinished || !currentCard) return;

      if (!isRevealed) {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          handleFlip();
        }
      } else {
        if (e.key === '1' && schedulingOptions[0]) {
          e.preventDefault();
          handleRate(schedulingOptions[0]);
        } else if (e.key === '2' && schedulingOptions[1]) {
          e.preventDefault();
          handleRate(schedulingOptions[1]);
        } else if (e.key === '3' && schedulingOptions[2]) {
          e.preventDefault();
          handleRate(schedulingOptions[2]);
        } else if (e.key === '4' && schedulingOptions[3]) {
          e.preventDefault();
          handleRate(schedulingOptions[3]);
        } else if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          handleFlip();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReviewModalOpen, isRevealed, isFinished, currentCard, schedulingOptions, handleFlip, handleRate, setIsReviewModalOpen]);

  if (!isReviewModalOpen) return null;

  // Cloze Formatting Helpers
  const renderFrontCardContent = (card: FSRSCardRecord) => {
    if (card.card_type === 'cloze') {
      const parts = card.front_text.split(/(\{.+?\})/g);
      return (
        <span>
          {parts.map((part, i) => {
            if (part.startsWith('{') && part.endsWith('}')) {
              return (
                <span
                  key={i}
                  className="inline-block px-2 py-0.5 mx-1 rounded border border-[var(--flint-border-strong)] bg-[var(--flint-bg-input)] text-[var(--flint-accent)] text-sm font-semibold"
                >
                  [...]
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </span>
      );
    }
    return <span>{card.front_text}</span>;
  };

  const renderBackCardContent = (card: FSRSCardRecord) => {
    if (card.card_type === 'cloze') {
      const parts = card.front_text.split(/(\{.+?\})/g);
      return (
        <div className="space-y-3">
          <div>
            {parts.map((part, i) => {
              if (part.startsWith('{') && part.endsWith('}')) {
                const inner = part.slice(1, -1);
                return (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 mx-1 rounded bg-[var(--flint-accent-subtle)] text-[var(--flint-accent)] font-semibold border border-[var(--flint-accent)]"
                  >
                    {inner}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
          {card.back_text && card.back_text !== card.front_text && (
            <div className="text-sm text-[var(--flint-text-muted)] mt-2">
              {card.back_text}
            </div>
          )}
        </div>
      );
    }

    return <span>{card.back_text}</span>;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsReviewModalOpen(false);
        }
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-150"
    >
      <style>{FLASHCARD_STYLES}</style>

      <div className="w-full max-w-[560px] flex flex-col items-center gap-3.5">
        <div className="w-full h-6 flex items-center justify-between text-xs text-[var(--flint-text-muted)] px-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--flint-text-secondary)]">Flashcard</span>
            {!isLoading && !isFinished && dueCards.length > 0 && (
              <span className="opacity-80">
                ({currentIndex + 1} of {dueCards.length})
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentCard && (
              <button
                onClick={handleJumpToNote}
                title="Jump to original note"
                className="flex items-center gap-1 hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
              >
                <LinkSquare02Icon size={13} />
                <span>Jump to note</span>
              </button>
            )}
            <button
              onClick={() => setIsReviewModalOpen(false)}
              className="p-1 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <Cancel01Icon size={15} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="w-full h-[320px] sm:h-[340px] rounded-xl border border-[var(--flint-border-base)] bg-[var(--flint-bg-card)] flex items-center justify-center text-xs text-[var(--flint-text-muted)] shrink-0">
            Loading flashcard queue...
          </div>
        ) : isFinished || dueCards.length === 0 ? (
          <div className="w-full h-[320px] sm:h-[340px] rounded-xl border border-[var(--flint-border-strong)] bg-[var(--flint-bg-card)] shadow-2xl p-8 flex flex-col items-center justify-center text-center shrink-0">
            <div className="w-12 h-12 rounded-full bg-[var(--flint-bg-card-hover)] border border-[var(--flint-border-base)] flex items-center justify-center text-[var(--flint-accent)] mb-3">
              <SparklesIcon size={24} />
            </div>
            <h3 className="text-lg font-semibold text-[var(--flint-text-primary)] mb-1">
              Review Complete!
            </h3>
            <p className="text-xs text-[var(--flint-text-muted)] max-w-xs mb-6">
              You have reviewed all cards due for today.
            </p>
            <button
              onClick={() => setIsReviewModalOpen(false)}
              className="obsidian-btn obsidian-btn-primary"
            >
              Back to Notes
            </button>
          </div>
        ) : (
          <div className="w-full h-[320px] sm:h-[340px] flint-plugin-flashcard-scene cursor-pointer shrink-0">
            <div
              onClick={handleFlip}
              className={clsx('flint-plugin-flashcard-inner', isRevealed && 'is-flipped')}
            >
              <div className="flint-plugin-flashcard-face">
                <div className="flex items-center justify-between text-[11px] text-[var(--flint-text-muted)]">
                  <span>{currentCard.card_type.replace(/_/g, ' ').toLowerCase()}</span>
                  <span className="text-[10px] opacity-75">
                    {currentCard.reps > 0 ? `rep #${currentCard.reps}` : 'new'}
                  </span>
                </div>

                <div className="my-auto py-2 text-xl sm:text-2xl font-serif text-[var(--flint-text-primary)] text-center leading-relaxed">
                  {renderFrontCardContent(currentCard)}
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--flint-text-muted)]">
                  <RotateCcwIcon size={12} />
                  <span>click or press space to flip</span>
                </div>
              </div>

              <div className="flint-plugin-flashcard-face flint-plugin-flashcard-back">
                <div className="flex items-center justify-between text-[11px] text-[var(--flint-text-muted)]">
                  <span>answer</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlip();
                    }}
                    className="text-[10px] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] flex items-center gap-1"
                  >
                    <RotateCcwIcon size={11} /> flip back
                  </button>
                </div>

                <div className="my-auto py-2 text-xl sm:text-2xl font-serif text-[var(--flint-text-primary)] text-center leading-relaxed">
                  {renderBackCardContent(currentCard)}
                </div>

                <div className="flex items-center justify-center text-xs text-[var(--flint-text-muted)]">
                  <span>rate your recall difficulty below</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full h-12 flex items-center justify-center shrink-0">
          {!isFinished && currentCard && !isLoading && isRevealed && (
            <div className="grid grid-cols-4 gap-2 w-full h-10 animate-in fade-in duration-150">
              {schedulingOptions.map((opt, idx) => {
                const hotkey = idx + 1;
                return (
                  <button
                    key={opt.rating}
                    onClick={() => handleRate(opt)}
                    className="obsidian-btn h-full flex flex-col items-center justify-center py-1 px-1 text-center cursor-pointer"
                  >
                    <div className="flex items-center gap-1 font-semibold text-xs text-[var(--flint-text-primary)] leading-tight">
                      <span>{opt.label}</span>
                      <span className="text-[10px] text-[var(--flint-text-muted)]">({hotkey})</span>
                    </div>
                    <div className="text-[10px] text-[var(--flint-text-muted)] leading-tight">
                      {opt.intervalText}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

