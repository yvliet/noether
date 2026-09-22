import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileEmpty01Icon,
  DashboardSquare01Icon,
  CommandIcon,
  Search01Icon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSettingsStore } from '@/store/settingsStore';
import { searchFullText, FTSResult } from '@/lib/db/fts';
import { getDocumentPath } from '@/lib/db/documents';
import { useNoetherApp, useCommands } from '@/core/app/AppContext';
import type { NoetherApp } from '@/core/app/NoetherApp';
import type { DocumentItem } from '@/types';
import type { CommandItem } from '@/core/extensions/types';
import type { OmniboxItem, OmniboxProvider } from '@/core/registries/OmniboxProviderRegistry';

export const CommandPalette: React.FC = React.memo(() => {
  const app = useNoetherApp();
  const registeredCommands = useCommands();

  const isCommandPaletteOpen = useWorkspaceStore((s) => s.isCommandPaletteOpen);
  const setIsCommandPaletteOpen = useWorkspaceStore((s) => s.setIsCommandPaletteOpen);
  const setMainViewMode = useWorkspaceStore((s) => s.setMainViewMode);
  const openTab = useWorkspaceStore((s) => s.openTab);

  const documents = useDocumentStore((s) => s.documents);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);
  const excludedFolders = useSettingsStore((s) => s.excludedFolders);

  const isExcludedDoc = useCallback((doc: DocumentItem) => {
    if (excludedFolders.length === 0) return false;
    const path = getDocumentPath(doc, documents).toLowerCase();
    return excludedFolders.some((f) => {
      const folder = f.toLowerCase().replace(/^[\/\\]+|[\/\\]+$/g, '');
      return path.startsWith(folder + '/') || path === folder;
    });
  }, [excludedFolders, documents]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FTSResult[]>([]);
  const [providerResults, setProviderResults] = useState<OmniboxItem[]>([]);
  const [activeSearchProvider, setActiveSearchProvider] = useState<OmniboxProvider | undefined>(undefined);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus input on open, and restore previous active focus on close
  useEffect(() => {
    if (isCommandPaletteOpen) {
      previousFocusRef.current = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      setQuery('');
      setResults([]);
      setProviderResults([]);
      setActiveSearchProvider(undefined);
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.();
      previousFocusRef.current = null;
    }
  }, [isCommandPaletteOpen]);

  // Execute omnibox and FTS search on query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setProviderResults([]);
      setActiveSearchProvider(undefined);
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      const omniRes = await app.omnibox.searchAll(query, { app, documents });
      if (!isCurrent) return;

      setActiveSearchProvider(omniRes.activeProvider);
      setProviderResults(omniRes.items);

      if (omniRes.activeProvider) {
        setResults([]);
      } else {
        const searchRes = await searchFullText(query);
        if (isCurrent) {
          setResults(searchRes);
        }
      }
    }, 150);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query, app, documents]);

  // Recent notes for initial state (when query is empty)
  const recentNotes = useMemo(() => {
    return documents
      .filter((doc: DocumentItem) => !doc.is_folder && !isExcludedDoc(doc))
      .sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0))
      .slice(0, 5)
      .map((doc) => ({
        document_id: doc.id,
        document_title: doc.title || 'Untitled',
        is_canvas: doc.doc_type === 'canvas',
      }));
  }, [documents, isExcludedDoc]);

  // Instant document matches by title or path
  const matchedDocs = useMemo(() => {
    if (!query.trim() || activeSearchProvider) return [];
    const q = query.toLowerCase().trim();
    return documents
      .filter((doc: DocumentItem) => {
        if (doc.is_folder || isExcludedDoc(doc)) return false;
        const titleMatch = (doc.title || '').toLowerCase().includes(q);
        if (titleMatch) return true;
        const path = getDocumentPath(doc, documents).toLowerCase();
        return path.includes(q);
      })
      .slice(0, 15);
  }, [query, activeSearchProvider, documents, isExcludedDoc]);

  // Combined notes from title matches & FTS block matches
  const displayedNotes = useMemo(() => {
    if (!query.trim() || activeSearchProvider) return [];

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
        const doc = documents.find((d) => d.id === res.document_id);
        if (doc && isExcludedDoc(doc)) continue;
        seenDocIds.add(res.document_id);
        combined.push({
          document_id: res.document_id,
          document_title: doc?.title || res.document_title || 'Untitled',
          content_text: res.snippet || undefined,
          is_canvas: doc?.doc_type === 'canvas',
        });
      } else {
        const existing = combined.find((c) => c.document_id === res.document_id);
        if (existing && !existing.content_text && res.snippet) {
          existing.content_text = res.snippet;
        }
      }
    }

    return combined;
  }, [query, activeSearchProvider, matchedDocs, results, documents, isExcludedDoc]);

function getExtensionName(cmd: CommandItem, app: NoetherApp): string | null {
  if (!cmd.extensionId) {
    return null;
  }
  const manifest = app.extensions.getExtensionManifest(cmd.extensionId);
  if (manifest?.name) {
    return manifest.name.replace(/\s+Extension$/i, '').trim();
  }
  if (cmd.extensionName) {
    return cmd.extensionName.replace(/\s+Extension$/i, '').trim();
  }
  return cmd.extensionId
    .split(/[-_]/)
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function cleanCommandTitle(title: string, extName: string | null): string {
  let cleaned = title.trim();
  if (extName) {
    const escaped = extName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`^${escaped}\\s*[:\\-]\\s*`, 'i'), '');
    cleaned = cleaned.replace(new RegExp(`\\s*\\(${escaped}\\)\\s*$`, 'i'), '');
  }
  cleaned = cleaned.replace(/^extensions?:\s*/i, '');
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
    if (activeSearchProvider) return [];
    const q = query.toLowerCase().trim();
    return registeredCommands.filter((c) => {
      const extName = getExtensionName(c, app);
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
  }, [query, activeSearchProvider, registeredCommands, app]);

  const totalItems = query.trim()
    ? activeSearchProvider
      ? providerResults.length
      : displayedNotes.length + providerResults.length + filteredCommands.length
    : recentNotes.length + registeredCommands.length;

  // Check whether an item at a given index is selectable / enabled
  const isIndexEnabled = useCallback(
    (index: number): boolean => {
      if (!query.trim()) {
        if (index < recentNotes.length) return true;
        const cmd = registeredCommands[index - recentNotes.length];
        return cmd ? (cmd.isEnabled ? cmd.isEnabled(app) : true) : false;
      } else if (activeSearchProvider) {
        return index >= 0 && index < providerResults.length;
      } else {
        if (index < displayedNotes.length) return true;
        if (index < displayedNotes.length + providerResults.length) return true;
        const cmd = filteredCommands[index - displayedNotes.length - providerResults.length];
        return cmd ? (cmd.isEnabled ? cmd.isEnabled(app) : true) : false;
      }
    },
    [
      query,
      activeSearchProvider,
      recentNotes.length,
      registeredCommands,
      displayedNotes.length,
      providerResults.length,
      filteredCommands,
      app,
    ]
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

  const handleSelectProviderItem = useCallback(
    async (item: OmniboxItem) => {
      setIsCommandPaletteOpen(false);
      try {
        await item.onSelect();
      } catch (err) {
        console.error('[CommandPalette] Error executing omnibox item:', err);
      }
    },
    [setIsCommandPaletteOpen]
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
        const isSplitOpen = e.ctrlKey || e.metaKey;

        if (query.trim()) {
          if (activeSearchProvider) {
            const item = providerResults[selectedIndex];
            if (item) handleSelectProviderItem(item);
          } else {
            if (selectedIndex < displayedNotes.length) {
              const note = displayedNotes[selectedIndex];
              if (isSplitOpen) {
                setIsCommandPaletteOpen(false);
                const focusedId = useWorkspaceStore.getState().focusedPaneId || 'main';
                useWorkspaceStore.getState().splitPane(focusedId, 'horizontal', note.document_id, note.document_title);
              } else {
                handleSelectNote(note.document_id, note.document_title);
              }
            } else if (selectedIndex < displayedNotes.length + providerResults.length) {
              const item = providerResults[selectedIndex - displayedNotes.length];
              if (item) handleSelectProviderItem(item);
            } else {
              const cmdIndex = selectedIndex - displayedNotes.length - providerResults.length;
              const cmd = filteredCommands[cmdIndex];
              if (cmd) {
                handleExecuteCommand(cmd);
              }
            }
          }
        } else {
          if (selectedIndex < recentNotes.length) {
            const note = recentNotes[selectedIndex];
            if (isSplitOpen) {
              setIsCommandPaletteOpen(false);
              const focusedId = useWorkspaceStore.getState().focusedPaneId || 'main';
              useWorkspaceStore.getState().splitPane(focusedId, 'horizontal', note.document_id, note.document_title);
            } else {
              handleSelectNote(note.document_id, note.document_title);
            }
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
      activeSearchProvider,
      totalItems,
      selectedIndex,
      displayedNotes,
      providerResults,
      filteredCommands,
      recentNotes,
      registeredCommands,
      isIndexEnabled,
      handleSelectNote,
      handleSelectProviderItem,
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
        className="w-full max-w-xl bg-[var(--noether-bg-popover,#1e1e1e)] border border-[var(--noether-border-base,#333333)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Top Search Input - Pure and clean */}
        <div className="relative flex items-center px-4 py-3 border-b border-[var(--noether-border-subtle,#2b2b2b)]">
          {activeSearchProvider && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 mr-2.5 rounded bg-[var(--noether-bg-card)] border border-[var(--noether-border-base)] text-xs text-[var(--noether-text-primary)] shrink-0 font-normal select-none">
              <span className="text-[var(--noether-text-muted)] font-mono">{activeSearchProvider.prefix}</span>
              <span>{activeSearchProvider.name || activeSearchProvider.id}</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              activeSearchProvider?.placeholder ||
              (activeSearchProvider?.name ? `Search ${activeSearchProvider.name.toLowerCase()}...` : 'Type a command or search...')
            }
            className="w-full bg-transparent text-sm text-[var(--noether-text-primary)] placeholder-[var(--noether-text-muted)] outline-none font-normal"
          />
        </div>

        {/* Results / Commands List */}
        <div
          ref={listRef}
          className="max-h-[340px] overflow-y-auto p-2 custom-scrollbar flex flex-col gap-0.5"
        >
          {query.trim() ? (
            displayedNotes.length > 0 || providerResults.length > 0 || filteredCommands.length > 0 ? (
              <>
                {/* Document Matches */}
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
                          className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer select-none text-sm transition-none ${
                            isSelected
                              ? 'bg-[var(--noether-btn-active-bg)] text-[var(--noether-text-primary)]'
                              : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)]'
                          }`}
                        >
                          <span
                            className={`shrink-0 mt-0.5 ${
                              isSelected ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted)]'
                            }`}
                          >
                            {item.is_canvas ? (
                              <DashboardSquare01Icon size={16} />
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
                                  isSelected ? 'text-[var(--noether-text-secondary)]' : 'text-[var(--noether-text-muted)]'
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

                {/* Omnibox Provider Results */}
                {providerResults.length > 0 && (
                  <>
                    {!activeSearchProvider && displayedNotes.length > 0 && (
                      <div className="my-1 border-t border-[var(--noether-border-subtle,#282828)]" />
                    )}
                    <div className="flex flex-col gap-0.5">
                      {providerResults.map((item, index) => {
                        const overallIndex = (activeSearchProvider ? 0 : displayedNotes.length) + index;
                        const isSelected = overallIndex === selectedIndex;

                        return (
                          <div
                            key={item.id}
                            data-selected={isSelected ? 'true' : undefined}
                            onClick={() => handleSelectProviderItem(item)}
                            onMouseEnter={() => setSelectedIndex(overallIndex)}
                            className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer select-none text-sm transition-none ${
                              isSelected
                                ? 'bg-[var(--noether-btn-active-bg)] text-[var(--noether-text-primary)]'
                                : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)]'
                            }`}
                          >
                            <span
                              className={`shrink-0 mt-0.5 ${
                                isSelected ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted)]'
                              }`}
                            >
                              {item.icon || <Search01Icon size={16} />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-normal leading-tight">
                                  {item.title}
                                </span>
                                {item.category && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium tracking-wider shrink-0 ${
                                      isSelected
                                        ? 'bg-[var(--noether-bg-card)] text-[var(--noether-text-secondary)]'
                                        : 'bg-[var(--noether-bg-card)] text-[var(--noether-text-muted)]'
                                    }`}
                                  >
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <div
                                  className={`text-xs line-clamp-1 leading-relaxed mt-0.5 ${
                                    isSelected ? 'text-[var(--noether-text-secondary)]' : 'text-[var(--noether-text-muted)]'
                                  }`}
                                >
                                  {item.description}
                                </div>
                              )}
                            </div>
                            {item.hotkey && (
                              <span
                                className={`text-xs shrink-0 ml-3 ${
                                  isSelected ? 'text-[var(--noether-text-secondary)]' : 'text-[var(--noether-text-muted)]'
                                }`}
                              >
                                {item.hotkey}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Commands Divider */}
                {!activeSearchProvider &&
                  (displayedNotes.length > 0 || providerResults.length > 0) &&
                  filteredCommands.length > 0 && (
                    <div className="my-1 border-t border-[var(--noether-border-subtle,#282828)]" />
                )}

                {/* Filtered Commands */}
                {filteredCommands.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {filteredCommands.map((cmd, index) => {
                      const overallIndex = displayedNotes.length + providerResults.length + index;
                      const isSelected = overallIndex === selectedIndex;
                      const isEnabled = cmd.isEnabled ? cmd.isEnabled(app) : true;
                      const extName = getExtensionName(cmd, app);

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
                          className={`flex items-center justify-between px-3 py-2 rounded-lg select-none text-sm transition-none ${
                            !isEnabled
                              ? 'opacity-40 cursor-not-allowed text-[var(--noether-text-muted)]'
                              : isSelected
                              ? 'bg-[var(--noether-btn-active-bg)] text-[var(--noether-text-primary)] cursor-pointer'
                              : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`shrink-0 ${
                                !isEnabled
                                  ? 'text-[var(--noether-text-muted)]'
                                  : isSelected
                                  ? 'text-[var(--noether-text-primary)]'
                                  : 'text-[var(--noether-text-muted)]'
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
                                isSelected && isEnabled ? 'text-[var(--noether-text-secondary)]' : 'text-[var(--noether-text-muted)]'
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
              <div className="py-8 text-center text-xs text-[var(--noether-text-muted)]">
                {activeSearchProvider
                  ? `No matching ${activeSearchProvider.name?.toLowerCase() || 'items'} found`
                  : 'No matching notes or commands found'}
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
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer select-none text-sm transition-none ${
                          isSelected
                            ? 'bg-[var(--noether-btn-active-bg)] text-[var(--noether-text-primary)]'
                            : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)]'
                        }`}
                      >
                        <span
                          className={`shrink-0 mt-0.5 ${
                            isSelected ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted)]'
                          }`}
                        >
                          {item.is_canvas ? (
                            <DashboardSquare01Icon size={16} />
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
                <div className="my-1 border-t border-[var(--noether-border-subtle,#282828)]" />
              )}

              {/* Commands */}
              {registeredCommands.map((cmd, index) => {
                const overallIndex = recentNotes.length + index;
                const isSelected = overallIndex === selectedIndex;
                const isEnabled = cmd.isEnabled ? cmd.isEnabled(app) : true;
                const extName = getExtensionName(cmd, app);

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
                    className={`flex items-center justify-between px-3 py-2 rounded-lg select-none text-sm transition-none ${
                      !isEnabled
                        ? 'opacity-40 cursor-not-allowed text-[var(--noether-text-muted)]'
                        : isSelected
                        ? 'bg-[var(--noether-btn-active-bg)] text-[var(--noether-text-primary)] cursor-pointer'
                        : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`shrink-0 ${
                          !isEnabled
                            ? 'text-[var(--noether-text-muted)]'
                            : isSelected
                            ? 'text-[var(--noether-text-primary)]'
                            : 'text-[var(--noether-text-muted)]'
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
                          isSelected && isEnabled ? 'text-[var(--noether-text-secondary)]' : 'text-[var(--noether-text-muted)]'
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
        <div className="px-4 py-2.5 border-t border-[var(--noether-border-subtle,#2a2a2a)] flex items-center justify-center gap-4 text-[11px] text-[var(--noether-text-muted,#777777)] select-none">
          <span>
            <strong className="font-semibold text-[var(--noether-text-primary,#aaaaaa)]">↑↓</strong> to navigate
          </span>
          <span>
            <strong className="font-semibold text-[var(--noether-text-primary,#aaaaaa)]">↵</strong> to select
          </span>
          <span>
            <strong className="font-semibold text-[var(--noether-text-primary,#aaaaaa)]">esc</strong> to dismiss
          </span>
        </div>
      </div>
    </div>
  );
});
