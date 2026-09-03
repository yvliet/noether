import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search01Icon,
  File01Icon,
  FileAddIcon,
  Calendar01Icon,
  Brain02Icon,
  Cancel01Icon,
  GitForkIcon,
  Layout01Icon,
  CheckmarkSquare02Icon,
  HelpCircleIcon,
  Database01Icon,
  CommandIcon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { searchFullText, FTSResult } from '@/lib/db/fts';
import { getDocumentPath } from '@/lib/db/documents';
import { useFlintApp, useCommands } from '@/core/app/AppContext';

export const CommandPalette: React.FC = React.memo(() => {
  const app = useFlintApp();
  const registeredCommands = useCommands();

  const isCommandPaletteOpen = useWorkspaceStore((s) => s.isCommandPaletteOpen);
  const setIsCommandPaletteOpen = useWorkspaceStore((s) => s.setIsCommandPaletteOpen);
  const setMainViewMode = useWorkspaceStore((s) => s.setMainViewMode);
  const openTab = useWorkspaceStore((s) => s.openTab);

  const documents = useDocumentStore((s) => s.documents);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FTSResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Execute FTS search on query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const searchRes = await searchFullText(query);
      setResults(searchRes);
      setSelectedIndex(0);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter commands by query if query is typed
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return registeredCommands;
    const q = query.toLowerCase();
    return registeredCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.section && c.section.toLowerCase().includes(q))
    );
  }, [query, registeredCommands]);

  const totalItems = query.trim() ? results.length + filteredCommands.length : registeredCommands.length;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + totalItems - 1) % Math.max(1, totalItems));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) {
        if (selectedIndex < results.length) {
          const item = results[selectedIndex];
          const doc = documents.find((d) => d.id === item.document_id);
          const docTitle = doc?.title || item.document_title || 'Untitled';
          setIsCommandPaletteOpen(false);
          openTab(item.document_id, docTitle);
          setActiveDocumentById(item.document_id);
          setMainViewMode('document');
        } else {
          const cmdIndex = selectedIndex - results.length;
          const cmd = filteredCommands[cmdIndex];
          if (cmd) {
            setIsCommandPaletteOpen(false);
            cmd.action(app);
          }
        }
      } else if (!query.trim() && registeredCommands[selectedIndex]) {
        setIsCommandPaletteOpen(false);
        registeredCommands[selectedIndex].action(app);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCommandPaletteOpen(false);
    }
  }, [query, results, filteredCommands, registeredCommands, selectedIndex, documents, openTab, setIsCommandPaletteOpen, setMainViewMode, setActiveDocumentById, app, totalItems]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      onClick={() => setIsCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 flex items-start justify-center pt-24"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[500px]"
      >
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#282828] bg-[#1a1a1a]">
          <Search01Icon size={18} className="text-[#8b8e95] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick Open notes or search commands..."
            className="w-full bg-transparent text-sm text-[#e5e7eb] placeholder-[#60636c] outline-none"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 rounded hover:bg-[#282828] text-[#8b8e95] hover:text-white"
          >
            <Cancel01Icon size={14} />
          </button>
        </div>

        {/* Results / Commands List */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {query.trim() ? (
            results.length > 0 || filteredCommands.length > 0 ? (
              <div className="flex flex-col gap-1">
                {results.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] uppercase font-semibold text-[#6b7280]">
                      Notes & Blocks
                    </div>
                    {results.map((res, index) => {
                      const isSelected = index === selectedIndex;
                      const doc = documents.find((d) => d.id === res.document_id);
                      const displayTitle = doc ? getDocumentPath(doc, documents) : res.document_title;
                      return (
                        <div
                          key={res.block_id || index}
                          onClick={() => {
                            const docTitle = doc?.title || res.document_title || 'Untitled';
                            setIsCommandPaletteOpen(false);
                            openTab(res.document_id, docTitle);
                            setActiveDocumentById(res.document_id);
                            setMainViewMode('document');
                          }}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                            isSelected ? 'bg-[#2a2a2a] text-white' : 'text-[#dcddde] hover:bg-[#222]'
                          }`}
                        >
                          <File01Icon size={16} className="text-[#dcddde] shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs text-[#e5e7eb] mb-0.5 truncate">
                              {displayTitle}
                            </div>
                            <div className="text-[11px] text-[#8b8e95] line-clamp-2 leading-relaxed">
                              {res.content_text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {filteredCommands.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] uppercase font-semibold text-[#6b7280] mt-1">
                      Commands
                    </div>
                    {filteredCommands.map((cmd, index) => {
                      const overallIndex = results.length + index;
                      const isSelected = overallIndex === selectedIndex;
                      return (
                        <div
                          key={cmd.id}
                          onClick={() => {
                            setIsCommandPaletteOpen(false);
                            cmd.action(app);
                          }}
                          onMouseEnter={() => setSelectedIndex(overallIndex)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${
                            isSelected ? 'bg-[#2a2a2a] text-white' : 'text-[#dcddde] hover:bg-[#222]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {cmd.icon || <CommandIcon size={16} className="text-[#8b8e95]" />}
                            <span className="text-xs font-medium">{cmd.title}</span>
                          </div>
                          {cmd.hotkey && (
                            <span className="text-xs text-[#8b8e95] shrink-0">
                              {cmd.hotkey}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-[#60636c]">
                No matching notes or commands found
              </div>
            )
          ) : (
            <div className="flex flex-col gap-1">
              <div className="px-3 py-1 text-[10px] uppercase font-semibold text-[#6b7280]">
                Commands
              </div>
              {registeredCommands.map((cmd, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={cmd.id}
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      cmd.action(app);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${
                      isSelected ? 'bg-[#2a2a2a] text-white' : 'text-[#dcddde] hover:bg-[#222]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {cmd.icon || <CommandIcon size={16} className="text-[#8b8e95]" />}
                      <span className="text-xs font-medium">{cmd.title}</span>
                    </div>
                    {cmd.hotkey && (
                      <span className="text-xs text-[#8b8e95] shrink-0">
                        {cmd.hotkey}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hotkey Guide */}
        <div className="h-8 px-4 bg-[#161616] border-t border-[#262626] flex items-center justify-between text-[10px] text-[#60636c]">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-[#242424] px-1 py-0.5 rounded text-[#9ca3af]">↑</kbd> <kbd className="bg-[#242424] px-1 py-0.5 rounded text-[#9ca3af]">↓</kbd> to navigate</span>
            <span><kbd className="bg-[#242424] px-1 py-0.5 rounded text-[#9ca3af]">Enter</kbd> to select</span>
            <span><kbd className="bg-[#242424] px-1 py-0.5 rounded text-[#9ca3af]">Esc</kbd> to close</span>
          </div>
          <span>Flint FTS Search</span>
        </div>
      </div>
    </div>
  );
});

