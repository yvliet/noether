import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CancelCircleIcon } from '@/components/common/Icons';
import { useDocumentStore } from '@/store/documentStore';
import { getDocumentPath } from '@/lib/db/documents';
import type { DocumentItem } from '@/types';
import {
  isImageDocument,
  isAudioDocument,
  isVideoDocument,
  isPdfDocument,
} from './CardContentRenderer';

export interface CanvasItemSearchModalProps {
  isOpen: boolean;
  mode: 'note' | 'media';
  currentBoardId: string;
  onClose: () => void;
  onSelectDocument: (docId: string) => void;
}

export const CanvasItemSearchModal: React.FC<CanvasItemSearchModalProps> = React.memo(
  ({ isOpen, mode, currentBoardId, onClose, onSelectDocument }) => {
    const documents = useDocumentStore((s) => s.documents);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset state and focus input when modal opens
    useEffect(() => {
      if (isOpen) {
        setQuery('');
        setSelectedIndex(0);
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 30);
        return () => clearTimeout(timer);
      }
    }, [isOpen]);

    // Filter documents based on mode and query
    const filteredDocuments = useMemo(() => {
      if (!isOpen) return [];

      const filtered = documents.filter((doc: DocumentItem) => {
        if (doc.is_folder || doc.id === currentBoardId) return false;

        const isMedia =
          isImageDocument(doc) ||
          isAudioDocument(doc) ||
          isVideoDocument(doc) ||
          isPdfDocument(doc) ||
          doc.doc_type === 'image' ||
          doc.doc_type === 'audio' ||
          doc.doc_type === 'video' ||
          doc.doc_type === 'pdf';

        if (mode === 'media') {
          return isMedia;
        }

        // Mode 'note': non-canvas, non-media notes
        return !isMedia && doc.doc_type !== 'canvas';
      });

      if (!query.trim()) {
        return filtered;
      }

      const q = query.toLowerCase().trim();
      return filtered.filter((doc) => {
        const titleMatch = (doc.title || '').toLowerCase().includes(q);
        if (titleMatch) return true;
        const path = getDocumentPath(doc, documents).toLowerCase();
        return path.includes(q);
      });
    }, [documents, isOpen, mode, currentBoardId, query]);

    // Keep selectedIndex within bounds
    useEffect(() => {
      setSelectedIndex((prev) => {
        if (filteredDocuments.length === 0) return 0;
        return Math.min(prev, filteredDocuments.length - 1);
      });
    }, [filteredDocuments.length]);

    // Scroll active item into view
    useEffect(() => {
      if (listRef.current && filteredDocuments.length > 0) {
        const activeItem = listRef.current.children[selectedIndex] as HTMLElement | undefined;
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [selectedIndex, filteredDocuments.length]);

    const handleCreateNewNote = useCallback(async () => {
      const cleanTitle = query.trim();
      if (!cleanTitle) return;

      try {
        const newDoc = await useDocumentStore.getState().createNewDocument(
          cleanTitle,
          null,
          'base',
          false
        );
        if (newDoc && newDoc.id) {
          onSelectDocument(newDoc.id);
        }
      } catch (err) {
        console.error('Failed to create new document from canvas search:', err);
      }
    }, [query, onSelectDocument]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (filteredDocuments.length > 0) {
            setSelectedIndex((prev) => (prev + 1) % filteredDocuments.length);
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (filteredDocuments.length > 0) {
            setSelectedIndex((prev) => (prev - 1 + filteredDocuments.length) % filteredDocuments.length);
          }
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();

          if (e.shiftKey && mode === 'note' && query.trim()) {
            handleCreateNewNote();
            return;
          }

          if (filteredDocuments.length > 0 && filteredDocuments[selectedIndex]) {
            onSelectDocument(filteredDocuments[selectedIndex].id);
          } else if (mode === 'note' && query.trim()) {
            handleCreateNewNote();
          }
        }
      },
      [filteredDocuments, selectedIndex, mode, query, onClose, onSelectDocument, handleCreateNewNote]
    );

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40"
        onClick={onClose}
      >
        <div
          className="w-full max-w-xl bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Input */}
          <div className="relative flex items-center px-4 py-3 border-b border-[#2b2b2b]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type to search..."
              className="w-full bg-transparent text-sm text-[#e0e0e0] placeholder-[#666666] outline-none pr-7 font-normal"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                className="absolute right-3.5 text-[#777777] hover:text-[#cccccc] cursor-pointer p-0.5"
                title="Clear search"
              >
                <CancelCircleIcon size={16} />
              </button>
            )}
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            className="max-h-[320px] overflow-y-auto p-2 custom-scrollbar flex flex-col gap-0.5"
          >
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc, idx) => {
                const isSelected = idx === selectedIndex;
                const path = getDocumentPath(doc, documents);
                const displayPath = path || doc.title || 'Untitled';

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onSelectDocument(doc.id);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3 py-2 rounded-lg text-sm cursor-pointer select-none text-left truncate ${
                      isSelected
                        ? 'bg-[#2b2b2b] text-[#ffffff]'
                        : 'text-[#999999] hover:bg-[#252525] hover:text-[#e0e0e0]'
                    }`}
                  >
                    {displayPath}
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-[#666666]">
                {mode === 'note'
                  ? 'No notes found. Press Shift + Enter to create a new note.'
                  : 'No media files found.'}
              </div>
            )}
          </div>

          {/* Keyboard Navigation Footer */}
          <div className="px-4 py-2.5 border-t border-[#2a2a2a] flex items-center justify-center gap-4 text-[11px] text-[#777777] select-none">
            <span>↑↓ to navigate</span>
            <span>↵ to open</span>
            <span>
              <strong className="font-semibold text-[#888888]">shift ↵</strong> to create
            </span>
            <span>esc to dismiss</span>
          </div>
        </div>
      </div>
    );
  }
);
