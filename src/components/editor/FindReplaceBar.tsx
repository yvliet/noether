import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TextSelection } from '@tiptap/pm/state';
import {
  SearchAndReplacePluginKey,
  findMatches,
  SearchResult,
} from './extensions/search-and-replace';
import {
  Search01Icon,
  ReplaceIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@/components/common/Icons';

export interface FindReplaceBarProps {
  editor: any;
  isOpen: boolean;
  isReplaceOpen: boolean;
  onClose: () => void;
  onToggleReplace?: () => void;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = React.memo(({
  editor,
  isOpen,
  isReplaceOpen,
  onClose,
  onToggleReplace,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Sync with editor ProseMirror search plugin
  const syncSearch = useCallback(
    (term: string, replace: string, caseSens: boolean, targetIndex?: number) => {
      if (!editor || editor.isDestroyed) return;

      const state = editor.state;
      const found = findMatches(state.doc, term, caseSens);
      setResults(found);

      let newIndex = targetIndex !== undefined ? targetIndex : 0;
      if (found.length === 0) {
        newIndex = 0;
      } else if (newIndex >= found.length) {
        newIndex = found.length - 1;
      }
      setCurrentIndex(newIndex);

      const tr = state.tr.setMeta(SearchAndReplacePluginKey, {
        type: 'setSearch',
        searchTerm: term,
        replaceTerm: replace,
        caseSensitive: caseSens,
        currentIndex: newIndex,
      });

      editor.view.dispatch(tr);
    },
    [editor]
  );

  // When isOpen changes, initialize or clear
  useEffect(() => {
    if (isOpen) {
      // If editor has selected text, pre-populate search input
      if (editor && !editor.isDestroyed) {
        const { from, to } = editor.state.selection;
        if (from !== to && to - from < 100) {
          const selectedText = editor.state.doc.textBetween(from, to);
          if (selectedText && !selectedText.includes('\n')) {
            setSearchTerm(selectedText);
            syncSearch(selectedText, replaceTerm, caseSensitive, 0);
          }
        }
      }

      setTimeout(() => {
        if (isReplaceOpen && replaceInputRef.current && searchTerm) {
          replaceInputRef.current.focus();
        } else if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }, 30);
    } else {
      // Clear highlights when closed
      if (editor && !editor.isDestroyed) {
        const tr = editor.state.tr.setMeta(SearchAndReplacePluginKey, { type: 'clear' });
        editor.view.dispatch(tr);
      }
      setResults([]);
      setCurrentIndex(0);
    }
  }, [isOpen, isReplaceOpen, editor]);

  // Navigate to current match in editor
  const jumpToMatch = useCallback(
    (idx: number, matchesList = results) => {
      if (!editor || editor.isDestroyed || matchesList.length === 0) return;
      const match = matchesList[idx];
      if (!match) return;

      setCurrentIndex(idx);

      const state = editor.state;
      let tr = state.tr.setMeta(SearchAndReplacePluginKey, {
        type: 'setIndex',
        index: idx,
      });

      try {
        const sel = TextSelection.create(tr.doc, match.from, match.to);
        tr = tr.setSelection(sel).scrollIntoView();
        editor.view.dispatch(tr);
      } catch (err) {
        editor.view.dispatch(tr);
      }
    },
    [editor, results]
  );

  const handleNext = useCallback(() => {
    if (results.length === 0) return;
    const nextIdx = (currentIndex + 1) % results.length;
    jumpToMatch(nextIdx);
  }, [results.length, currentIndex, jumpToMatch]);

  const handlePrev = useCallback(() => {
    if (results.length === 0) return;
    const prevIdx = (currentIndex - 1 + results.length) % results.length;
    jumpToMatch(prevIdx);
  }, [results.length, currentIndex, jumpToMatch]);

  const handleReplaceCurrent = useCallback(() => {
    if (!editor || editor.isDestroyed || results.length === 0) return;
    const match = results[currentIndex];
    if (!match) return;

    // Replace text at match position
    const tr = editor.state.tr.insertText(replaceTerm, match.from, match.to);
    editor.view.dispatch(tr);

    // Re-run search
    setTimeout(() => {
      syncSearch(searchTerm, replaceTerm, caseSensitive, currentIndex);
    }, 10);
  }, [editor, results, currentIndex, replaceTerm, syncSearch, searchTerm, caseSensitive]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || editor.isDestroyed || results.length === 0) return;

    // Replace all matches from last to first
    let tr = editor.state.tr;
    for (let i = results.length - 1; i >= 0; i--) {
      const match = results[i];
      tr = tr.insertText(replaceTerm, match.from, match.to);
    }
    editor.view.dispatch(tr);

    // Re-run search
    setTimeout(() => {
      syncSearch(searchTerm, replaceTerm, caseSensitive, 0);
    }, 10);
  }, [editor, results, replaceTerm, syncSearch, searchTerm, caseSensitive]);

  if (!isOpen) return null;


  return (
    <div className="absolute top-0 left-0 right-0 w-full bg-[var(--flint-bg-main)] border-b border-[var(--flint-border-subtle)] shadow-[var(--flint-shadow-1)] px-6 py-2 select-none z-30">
      {/* 2-Column Grid: Fixed right column keeps Search and Replace fields identically sized across both states */}
      <div className="grid grid-cols-[1fr_160px] gap-x-2.5 gap-y-1.5 items-center">
        {/* Row 1, Col 1: Search Input Box */}
        <div className="flex items-center bg-[var(--flint-bg-input)] border border-[var(--flint-border-base)] focus-within:border-[var(--flint-accent)] rounded-[6px] px-2.5 py-1 transition-colors min-w-0">
          <Search01Icon size={14} className="text-[var(--flint-text-muted)] shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              const val = e.target.value;
              setSearchTerm(val);
              syncSearch(val, replaceTerm, caseSensitive, 0);
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                onClose();
                if (editor) editor.commands.focus();
                return;
              }
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                onToggleReplace?.();
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) {
                  handlePrev();
                } else {
                  handleNext();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                if (editor) editor.commands.focus();
              }
            }}
            placeholder="Find..."
            className="w-full bg-transparent text-xs text-[var(--flint-text-primary)] placeholder:text-[var(--flint-text-muted)] outline-none ml-2 font-normal min-w-0"
          />

          {/* Results Count Indicator */}
          {searchTerm && (
            <span className="text-[11px] text-[var(--flint-text-muted)] font-normal shrink-0 mr-1.5 select-none">
              {results.length > 0 ? `${currentIndex + 1} of ${results.length}` : 'No results'}
            </span>
          )}

          {/* Case Sensitivity Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextCase = !caseSensitive;
              setCaseSensitive(nextCase);
              syncSearch(searchTerm, replaceTerm, nextCase, currentIndex);
            }}
            title="Match Case (Aa)"
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer shrink-0 ${
              caseSensitive
                ? 'bg-[var(--flint-bg-sidebar-active)] text-[var(--flint-text-primary)] font-bold border border-[var(--flint-border-strong)]'
                : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)]'
            }`}
          >
            Aa
          </button>
        </div>

        {/* Row 1, Col 2: Find Navigation & Controls spaced to fill the column */}
        <div className="w-[160px] flex items-center justify-between shrink-0">
          {/* Previous Match (Up) */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={results.length === 0}
            title="Previous match (Shift+Enter)"
            className="p-1.5 rounded-[4px] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--flint-text-muted)] transition-colors cursor-pointer shrink-0"
          >
            <ArrowUp01Icon size={14} />
          </button>

          {/* Next Match (Down) */}
          <button
            type="button"
            onClick={handleNext}
            disabled={results.length === 0}
            title="Next match (Enter)"
            className="p-1.5 rounded-[4px] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--flint-text-muted)] transition-colors cursor-pointer shrink-0"
          >
            <ArrowDown01Icon size={14} />
          </button>

          {/* Toggle Replace Row (Obsidian button styled) */}
          {onToggleReplace && (
            <button
              type="button"
              onClick={onToggleReplace}
              title={isReplaceOpen ? 'Hide replace (Ctrl+H)' : 'Show replace (Ctrl+H)'}
              className={`p-1.5 rounded-[5px] border transition-all cursor-pointer shrink-0 ${
                isReplaceOpen
                  ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-sidebar-active)] border-[var(--flint-border-strong)]'
                  : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)] hover:bg-[var(--flint-bg-sidebar-active)] border-[var(--flint-border-base)]'
              }`}
            >
              {isReplaceOpen ? <ChevronDownIcon size={13} /> : <ChevronRightIcon size={13} />}
            </button>
          )}

          {/* Close Button (✕) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (editor) editor.commands.focus();
            }}
            title="Close (Escape)"
            className="p-1.5 rounded-[4px] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer shrink-0"
          >
            <Cancel01Icon size={14} />
          </button>
        </div>

        {/* Row 2 (Visible when isReplaceOpen is true) */}
        {isReplaceOpen && (
          <>
            {/* Row 2, Col 1: Replace Input Box (Identical width to Search Box with its own icon) */}
            <div className="flex items-center bg-[var(--flint-bg-input)] border border-[var(--flint-border-base)] focus-within:border-[var(--flint-accent)] rounded-[6px] px-2.5 py-1 transition-colors min-w-0">
              <ReplaceIcon size={14} className="text-[var(--flint-text-muted)] shrink-0" />
              <input
                ref={replaceInputRef}
                type="text"
                value={replaceTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setReplaceTerm(val);
                  syncSearch(searchTerm, val, caseSensitive, currentIndex);
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                    e.preventDefault();
                    onClose();
                    if (editor) editor.commands.focus();
                    return;
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
                    e.preventDefault();
                    onToggleReplace?.();
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      handleReplaceAll();
                    } else {
                      handleReplaceCurrent();
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onClose();
                    if (editor) editor.commands.focus();
                  }
                }}
                placeholder="Replace..."
                className="w-full bg-transparent text-xs text-[var(--flint-text-primary)] placeholder:text-[var(--flint-text-muted)] outline-none ml-2 font-normal min-w-0"
              />
            </div>

            {/* Row 2, Col 2: Replace Action Buttons */}
            <div className="w-[160px] flex items-center justify-between shrink-0">
              {/* Replace Button */}
              <button
                type="button"
                onClick={handleReplaceCurrent}
                disabled={results.length === 0}
                className="flint-btn flex-1 !py-1 text-xs text-center mr-1.5"
              >
                Replace
              </button>

              {/* Replace All Button */}
              <button
                type="button"
                onClick={handleReplaceAll}
                disabled={results.length === 0}
                className="flint-btn flex-1 !py-1 text-xs text-center whitespace-nowrap"
              >
                Replace all
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

