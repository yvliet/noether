import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileEmpty01Icon,
  Layout01Icon,
  CommandIcon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { searchFullText, FTSResult } from '@/lib/db/fts';
import { getDocumentPath } from '@/lib/db/documents';
import { useNoetherApp, useCommands } from '@/core/app/AppContext';
import type { NoetherApp } from '@/core/app/NoetherApp';
import type { DocumentItem } from '@/types';
import type { CommandItem } from '@/core/extensions/types';

export const CommandPalette: React.FC = React.memo(() => {
  const app = useNoetherApp();
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
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input and reset on open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
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
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Recent notes for initial state (when query is empty)
  const recentNotes = useMemo(() => {
    return documents
      .filter((doc: DocumentItem) => !doc.is_folder)
      .sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0))
      .slice(0, 5)
      .map((doc) => ({
        document_id: doc.id,
        document_title: doc.title || 'Untitled',
        is_canvas: doc.doc_type === 'canvas',
      }));
  }, [documents]);

  // Instant document matches by title or path
  const matchedDocs = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return documents
      .filter((doc: DocumentItem) => {
        if (doc.is_folder) return false;
        const titleMatch = (doc.title || '').toLowerCase().includes(q);
        if (titleMatch) return true;
        const path = getDocumentPath(doc, documents).toLowerCase();
        return path.includes(q);
      })
      .slice(0, 15);
  }, [query, documents]);

  // Combined notes from title matches & FTS block matches
  const displayedNotes = useMemo(() => {
    if (!query.trim()) return [];

    const seenDocIds = new Set<string>();
    const combined: Array<{
      document_id: string;
      document_title: string;
      content_text?: string;
      is_canvas?: boolean;
    }> = [];

    // Title / path matches first (instant)
    for (const doc of matchedDocs) {
      if (!seenDocIds.has(doc.id)) {
        seenDocIds.add(doc.id);
        combined.push({
          document_id: doc.id,
          document_title: doc.title || 'Untitled',
          is_canvas: doc.doc_type === 'canvas',
        });
      }
    }

    // FTS content matches
    for (const res of results) {
      if (!seenDocIds.has(res.document_id)) {
        seenDocIds.add(res.document_id);
        const doc = documents.find((d) => d.id === res.document_id);
        combined.push({
          document_id: res.document_id,
          document_title: doc?.title || res.document_title || 'Untitled',
          content_text: res.content_text,
          is_canvas: doc?.doc_type === 'canvas',
        });
      } else {
        const existing = combined.find((c) => c.document_id === res.document_id);
        if (existing && !existing.content_text && res.content_text) {
          existing.content_text = res.content_text;
        }
      }
    }

    return combined;
  }, [query, matchedDocs, results, documents]);

const KNOWN_EXTENSION_NAMES: Record<string, string> = {
  canvas: 'Canvas',
  graph: 'Graph view',
  'graph-view': 'Graph view',
  tables: 'Tables',
  tasks: 'Tasks',
  journal: 'Journal',
  bookmarks: 'Bookmarks',
  backlinks: 'Backlinks',
  marketplace: 'Marketplace',
  sketch: 'Sketch',
  sync: 'Sync',
  'more-icons': 'More icons',
  outline: 'Outline',
  tags: 'Tags',
  properties: 'Properties',
};

function getExtensionName(cmd: CommandItem): string | null {
  if (!cmd.extensionId || cmd.extensionId === 'defaults' || cmd.extensionId === 'default-commands') {
    return null;
  }
  if (KNOWN_EXTENSION_NAMES[cmd.extensionId]) {
    return KNOWN_EXTENSION_NAMES[cmd.extensionId];
  }
  if (cmd.extensionName) {
    return cmd.extensionName.replace(/\s+Extension$/i, '').trim();
  }
  return null;
}

function cleanCommandTitle(title: string, extName: string | null): string {
  let cleaned = title.trim();
  if (extName) {
    const escaped = extName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*[:\\-]\\s*`, 'i'), '');
    cleaned = cleaned.replace(new RegExp(`\\s*\\(${escaped}\\)\\s*$`, 'i'), '');
  }
  cleaned = cleaned.replace(/^extensions?:\s*/i, '');
  for (const known of Object.values(KNOWN_EXTENSION_NAMES)) {
    const escaped = known.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*[:\\-]\\s*`, 'i'), '');
    cleaned = cleaned.replace(new RegExp(`\\s*\\(${escaped}\\)\\s*$`, 'i'), '');
  }
  return cleaned.trim();
}

function getCommandTitle(cmd: CommandItem, app: NoetherApp): string {
  if (typeof cmd.title === 'function') {
    try {
      return cmd.title(app);
    } catch {
      return cmd.id;
    }
  }
  return cmd.title;
}

function getCommandIcon(cmd: CommandItem, app: NoetherApp): React.ReactNode {
  if (typeof cmd.icon === 'function') {
    try {
      return cmd.icon(app);
    } catch {
      return null;
    }
  }
  return cmd.icon;
}

  // Filter commands by query if query is typed
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return registeredCommands;
    const q = query.toLowerCase().trim();
    return registeredCommands.filter((c) => {
      const extName = getExtensionName(c);
      const dynamicTitle = getCommandTitle(c, app);
      const cleanTitle = cleanCommandTitle(dynamicTitle, extName);
      const extSuffix = extName ? ` (${extName})` : '';
      const fullTitle = `${cleanTitle}${extSuffix}`.toLowerCase();
      const section = (c.section || '').toLowerCase();
      
      if (fullTitle.includes(q) || section.includes(q)) return true;

      // Check search aliases (e.g. ['toggle', 'sidebar', ...])
      if (c.aliases && c.aliases.some((alias) => alias.toLowerCase().includes(q))) {
        return true;
      }

      // Fallback: If user queries "toggle", match commands with "toggle" in id or aliases
      if (q === 'toggle' && (c.id.toLowerCase().includes('toggle') || c.id.toLowerCase().includes('sidebar'))) {
        return true;
      }

      return false;
    });
  }, [query, registeredCommands, app]);

  const totalItems = query.trim()
    ? displayedNotes.length + filteredCommands.length
    : recentNotes.length + registeredCommands.length;

  // Check whether an item at a given index is selectable / enabled
  const isIndexEnabled = useCallback(
    (index: number): boolean => {
      if (!query.trim()) {
        if (index < recentNotes.length) return true;
        const cmd = registeredCommands[index - recentNotes.length];
        return cmd ? (cmd.isEnabled ? cmd.isEnabled(app) : true) : false;
      } else {
        if (index < displayedNotes.length) return true;
        const cmd = filteredCommands[index - displayedNotes.length];
        return cmd ? (cmd.isEnabled ? cmd.isEnabled(app) : true) : false;
      }
    },
    [query, recentNotes.length, registeredCommands, displayedNotes.length, filteredCommands, app]
  );

  // Keep selectedIndex in bounds and on an enabled item
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (totalItems === 0) return 0;
      let target = Math.min(prev, totalItems - 1);
      if (isIndexEnabled(target)) return target;

      // Scan forward
      for (let i = target; i < totalItems; i++) {
        if (isIndexEnabled(i)) return i;
      }
      // Scan backward
      for (let i = target - 1; i >= 0; i--) {
        if (isIndexEnabled(i)) return i;
      }
      return 0;
    });
  }, [totalItems, isIndexEnabled]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeItem = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelectNote = useCallback(
    (documentId: string, title?: string) => {
      const doc = documents.find((d) => d.id === documentId);
      const docTitle = doc?.title || title || 'Untitled';
      setIsCommandPaletteOpen(false);
      openTab(documentId, docTitle);
      setActiveDocumentById(documentId);
      setMainViewMode('document');
    },
    [documents, openTab, setActiveDocumentById, setMainViewMode, setIsCommandPaletteOpen]
  );

  const handleExecuteCommand = useCallback(
    (cmd: CommandItem) => {
      if (cmd.isEnabled && !cmd.isEnabled(app)) return;
      setIsCommandPaletteOpen(false);
      cmd.action(app);
    },
    [app, setIsCommandPaletteOpen]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen(false);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (totalItems > 0) {
          let next = (selectedIndex + 1) % totalItems;
          let count = 0;
          while (!isIndexEnabled(next) && count < totalItems) {
            next = (next + 1) % totalItems;
            count++;
          }
          if (count < totalItems) {
            setSelectedIndex(next);
          }
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (totalItems > 0) {
          let prev = (selectedIndex - 1 + totalItems) % totalItems;
          let count = 0;
          while (!isIndexEnabled(prev) && count < totalItems) {
            prev = (prev - 1 + totalItems) % totalItems;
            count++;
          }
          if (count < totalItems) {
            setSelectedIndex(prev);
          }
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();

        if (totalItems === 0 || !isIndexEnabled(selectedIndex)) return;

        if (query.trim()) {
          if (selectedIndex < displayedNotes.length) {
            const note = displayedNotes[selectedIndex];
            handleSelectNote(note.document_id, note.document_title);
          } else {
            const cmdIndex = selectedIndex - displayedNotes.length;
            const cmd = filteredCommands[cmdIndex];
            if (cmd) {
              handleExecuteCommand(cmd);
            }
          }
        } else {
          if (selectedIndex < recentNotes.length) {
            const note = recentNotes[selectedIndex];
            handleSelectNote(note.document_id, note.document_title);
          } else {
            const cmdIndex = selectedIndex - recentNotes.length;
            const cmd = registeredCommands[cmdIndex];
            if (cmd) {
              handleExecuteCommand(cmd);
            }
          }
        }
      }
    },
    [
      query,
      totalItems,
      selectedIndex,
      displayedNotes,
      filteredCommands,
      recentNotes,
      registeredCommands,
      isIndexEnabled,
      handleSelectNote,
      handleExecuteCommand,
      setIsCommandPaletteOpen,
    ]
  );

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      onClick={() => setIsCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#1e1e1e] border border-[#333333] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Top Search Input - Pure and clean without icons */}
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
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-sm text-[#e0e0e0] placeholder-[#666666] outline-none font-normal"
          />
        </div>

        {/* Results / Commands List */}
        <div
          ref={listRef}
          className="max-h-[340px] overflow-y-auto p-2 custom-scrollbar flex flex-col gap-0.5"
        >
          {query.trim() ? (
            displayedNotes.length > 0 || filteredCommands.length > 0 ? (
              <>
                {displayedNotes.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {displayedNotes.map((item, index) => {
                      const isSelected = index === selectedIndex;
                      const doc = documents.find((d) => d.id === item.document_id);
                      const displayTitle = doc ? getDocumentPath(doc, documents) : item.document_title;

                      return (
                        <div
                          key={item.document_id}
                          data-selected={isSelected ? 'true' : undefined}
                          onClick={() => handleSelectNote(item.document_id, item.document_title)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer select-none text-sm ${
                            isSelected
                              ? 'bg-[#2b2b2b] text-[#ffffff]'
                              : 'text-[#999999] hover:bg-[#252525] hover:text-[#e0e0e0]'
                          }`}
                        >
                          <span
                            className={`shrink-0 mt-0.5 ${
                              isSelected ? 'text-[#ffffff]' : 'text-[#777777]'
                            }`}
                          >
                            {item.is_canvas ? (
                              <Layout01Icon size={16} />
                            ) : (
                              <FileEmpty01Icon size={16} />
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-normal leading-tight">
                              {displayTitle}
                            </div>
                            {item.content_text && (
                              <div
                                className={`text-xs line-clamp-1 leading-relaxed mt-0.5 ${
                                  isSelected ? 'text-[#cccccc]' : 'text-[#666666]'
                                }`}
                              >
                                {item.content_text}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {displayedNotes.length > 0 && filteredCommands.length > 0 && (
                  <div className="my-1 border-t border-[#282828]" />
                )}

                {filteredCommands.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {filteredCommands.map((cmd, index) => {
                      const overallIndex = displayedNotes.length + index;
                      const isSelected = overallIndex === selectedIndex;
                      const isEnabled = cmd.isEnabled ? cmd.isEnabled(app) : true;
                      const extName = getExtensionName(cmd);

                      return (
                        <div
                          key={cmd.id}
                          data-selected={isSelected ? 'true' : undefined}
                          onClick={() => {
                            if (isEnabled) handleExecuteCommand(cmd);
                          }}
                          onMouseEnter={() => {
                            if (isEnabled) setSelectedIndex(overallIndex);
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg select-none text-sm ${
                            !isEnabled
                              ? 'opacity-40 cursor-not-allowed text-[#666666]'
                              : isSelected
                              ? 'bg-[#2b2b2b] text-[#ffffff] cursor-pointer'
                              : 'text-[#999999] hover:bg-[#252525] hover:text-[#e0e0e0] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`shrink-0 ${
                                !isEnabled
                                  ? 'text-[#555555]'
                                  : isSelected
                                  ? 'text-[#ffffff]'
                                  : 'text-[#777777]'
                              }`}
                            >
                              {getCommandIcon(cmd, app) || <CommandIcon size={16} />}
                            </span>
                            <div className="truncate font-normal">
                              <span>{cleanCommandTitle(getCommandTitle(cmd, app), extName)}</span>
                            </div>
                          </div>
                          {cmd.hotkey && (
                            <span
                              className={`text-xs shrink-0 ml-3 ${
                                isSelected && isEnabled ? 'text-[#aaaaaa]' : 'text-[#666666]'
                              }`}
                            >
                              {cmd.hotkey}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-xs text-[#666666]">
                No matching notes or commands found
              </div>
            )
          ) : (
            <div className="flex flex-col gap-0.5">
              {/* Recent Files */}
              {recentNotes.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {recentNotes.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    const doc = documents.find((d) => d.id === item.document_id);
                    const displayTitle = doc ? getDocumentPath(doc, documents) : item.document_title;

                    return (
                      <div
                        key={item.document_id}
                        data-selected={isSelected ? 'true' : undefined}
                        onClick={() => handleSelectNote(item.document_id, item.document_title)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer select-none text-sm ${
                          isSelected
                            ? 'bg-[#2b2b2b] text-[#ffffff]'
                            : 'text-[#999999] hover:bg-[#252525] hover:text-[#e0e0e0]'
                        }`}
                      >
                        <span
                          className={`shrink-0 mt-0.5 ${
                            isSelected ? 'text-[#ffffff]' : 'text-[#777777]'
                          }`}
                        >
                          {item.is_canvas ? (
                            <Layout01Icon size={16} />
                          ) : (
                            <FileEmpty01Icon size={16} />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-normal leading-tight">
                            {displayTitle}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {recentNotes.length > 0 && registeredCommands.length > 0 && (
                <div className="my-1 border-t border-[#282828]" />
              )}

              {/* Commands */}
              {registeredCommands.map((cmd, index) => {
                const overallIndex = recentNotes.length + index;
                const isSelected = overallIndex === selectedIndex;
                const isEnabled = cmd.isEnabled ? cmd.isEnabled(app) : true;
                const extName = getExtensionName(cmd);

                return (
                  <div
                    key={cmd.id}
                    data-selected={isSelected ? 'true' : undefined}
                    onClick={() => {
                      if (isEnabled) handleExecuteCommand(cmd);
                    }}
                    onMouseEnter={() => {
                      if (isEnabled) setSelectedIndex(overallIndex);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg select-none text-sm ${
                      !isEnabled
                        ? 'opacity-40 cursor-not-allowed text-[#666666]'
                        : isSelected
                        ? 'bg-[#2b2b2b] text-[#ffffff] cursor-pointer'
                        : 'text-[#999999] hover:bg-[#252525] hover:text-[#e0e0e0] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`shrink-0 ${
                          !isEnabled
                            ? 'text-[#555555]'
                            : isSelected
                            ? 'text-[#ffffff]'
                            : 'text-[#777777]'
                        }`}
                      >
                        {getCommandIcon(cmd, app) || <CommandIcon size={16} />}
                      </span>
                      <div className="truncate font-normal">
                        <span>{cleanCommandTitle(getCommandTitle(cmd, app), extName)}</span>
                      </div>
                    </div>
                    {cmd.hotkey && (
                      <span
                        className={`text-xs shrink-0 ml-3 ${
                          isSelected && isEnabled ? 'text-[#aaaaaa]' : 'text-[#666666]'
                        }`}
                      >
                        {cmd.hotkey}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Keyboard Navigation Footer */}
        <div className="px-4 py-2.5 border-t border-[#2a2a2a] flex items-center justify-center gap-4 text-[11px] text-[#777777] select-none">
          <span>
            <strong className="font-semibold text-[#aaaaaa]">↑↓</strong> to navigate
          </span>
          <span>
            <strong className="font-semibold text-[#aaaaaa]">↵</strong> to select
          </span>
          <span>
            <strong className="font-semibold text-[#aaaaaa]">esc</strong> to dismiss
          </span>
        </div>
      </div>
    </div>
  );
});
