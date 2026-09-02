import React, { useState, useMemo, useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { BacklinkItem, UnlinkedMentionItem } from '@/types';
import {
  Search01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowUpNarrowWideIcon,
  ArrowShrink02Icon,
  LeftToRightListBulletIcon,
  Link2Icon,
  CheckIcon,
  File01Icon,
} from '@/components/common/Icons';

export interface DocumentBacklinksProps {
  documentId: string;
  documentTitle: string;
}

type SortOrder = 'file-az' | 'file-za' | 'newest' | 'oldest';

interface BacklinkGroup {
  docId: string;
  docTitle: string;
  updatedAt: number;
  items: BacklinkItem[];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const DocumentBacklinks: React.FC<DocumentBacklinksProps> = React.memo(({
  documentId,
  documentTitle,
}) => {
  const backlinks = useDocumentStore((s) => s.backlinks);
  const unlinkedMentions = useDocumentStore((s) => s.unlinkedMentions);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);
  const convertUnlinkedMention = useDocumentStore((s) => s.convertUnlinkedMention);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showMoreContext, setShowMoreContext] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('file-az');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isUnlinkedOpen, setIsUnlinkedOpen] = useState(false);
  const [linkingDocId, setLinkingDocId] = useState<string | null>(null);

  // Filter and group backlinks
  const groupedBacklinks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const map = new Map<string, BacklinkGroup>();

    for (const link of backlinks) {
      if (
        q &&
        !link.source_document_title.toLowerCase().includes(q) &&
        !link.snippet.toLowerCase().includes(q)
      ) {
        continue;
      }

      if (!map.has(link.source_document_id)) {
        map.set(link.source_document_id, {
          docId: link.source_document_id,
          docTitle: link.source_document_title || 'Untitled',
          updatedAt: link.updated_at || 0,
          items: [],
        });
      }
      map.get(link.source_document_id)!.items.push(link);
    }

    const groups = Array.from(map.values());

    // Sort groups
    groups.sort((a, b) => {
      if (sortOrder === 'file-az') return a.docTitle.localeCompare(b.docTitle);
      if (sortOrder === 'file-za') return b.docTitle.localeCompare(a.docTitle);
      if (sortOrder === 'newest') return b.updatedAt - a.updatedAt;
      if (sortOrder === 'oldest') return a.updatedAt - b.updatedAt;
      return 0;
    });

    return groups;
  }, [backlinks, searchQuery, sortOrder]);

  const totalBacklinkCount = useMemo(() => {
    return groupedBacklinks.reduce((acc, g) => acc + g.items.length, 0);
  }, [groupedBacklinks]);

  // Filter unlinked mentions
  const filteredUnlinked = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return unlinkedMentions;
    return unlinkedMentions.filter(
      (u) =>
        u.source_document_title.toLowerCase().includes(q) ||
        u.snippet.toLowerCase().includes(q)
    );
  }, [unlinkedMentions, searchQuery]);

  const handleToggleGroup = useCallback((docId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  }, []);

  const handleToggleCollapseAll = useCallback(() => {
    setCollapsedGroups((prev) => {
      const allCollapsed = groupedBacklinks.every((g) => prev[g.docId]);
      const next: Record<string, boolean> = {};
      groupedBacklinks.forEach((g) => {
        next[g.docId] = !allCollapsed;
      });
      return next;
    });
  }, [groupedBacklinks]);

  const handleCycleSort = useCallback(() => {
    setSortOrder((prevOrder) => {
      const modes: SortOrder[] = ['file-az', 'file-za', 'newest', 'oldest'];
      const nextIdx = (modes.indexOf(prevOrder) + 1) % modes.length;
      return modes[nextIdx];
    });
  }, []);

  const getSortTooltip = useCallback(() => {
    switch (sortOrder) {
      case 'file-az':
        return 'Change sort order (File name: A to Z)';
      case 'file-za':
        return 'Change sort order (File name: Z to A)';
      case 'newest':
        return 'Change sort order (Modified time: new to old)';
      case 'oldest':
        return 'Change sort order (Modified time: old to new)';
    }
  }, [sortOrder]);

  const handleConvertLink = useCallback(async (sourceDocId: string, title: string) => {
    setLinkingDocId(sourceDocId);
    try {
      await convertUnlinkedMention(sourceDocId, title);
    } finally {
      setTimeout(() => setLinkingDocId(null), 600);
    }
  }, [convertUnlinkedMention]);

  const highlightSnippet = useCallback((snippet: string, term: string) => {
    if (!term || !snippet) return snippet;
    const parts = snippet.split(new RegExp(`(${escapeRegex(term)})`, 'gi'));
    return parts.map((part, idx) => {
      if (part.toLowerCase() === term.toLowerCase()) {
        return (
          <span
            key={idx}
            className="text-[#38bdf8] font-semibold bg-[#38bdf8]/10 px-0.5 rounded"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);

  return (
    <div className="mt-8 pt-6 border-t border-[#262626] select-none font-sans text-xs">
      {/* 1. Linked Mentions Header Bar */}
      <div className="flex items-center justify-between py-1 text-[#dcddde]">
        {/* Left: Title & Count */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#dcddde] text-[13px]">
            Linked mentions
          </span>
          <span className="text-[#666] text-xs font-normal">
            {searchQuery ? `${totalBacklinkCount} of ${backlinks.length}` : backlinks.length}
          </span>
        </div>

        {/* Right: Action Toolbar */}
        <div className="flex items-center gap-1 text-[#777]">
          <button
            onClick={() => setShowMoreContext(!showMoreContext)}
            title={showMoreContext ? 'Collapse results' : 'Show more context'}
            className={`p-1.5 rounded hover:bg-[#222] transition-colors cursor-pointer ${
              showMoreContext ? 'text-white' : 'text-[#777] hover:text-[#dcddde]'
            }`}
          >
            <LeftToRightListBulletIcon size={14} />
          </button>

          <button
            onClick={handleCycleSort}
            title={getSortTooltip()}
            className="p-1.5 rounded hover:bg-[#222] text-[#777] hover:text-[#dcddde] transition-colors cursor-pointer"
          >
            <ArrowUpNarrowWideIcon size={14} />
          </button>

          <button
            onClick={handleToggleCollapseAll}
            title="Collapse all"
            className="p-1.5 rounded hover:bg-[#222] text-[#777] hover:text-[#dcddde] transition-colors cursor-pointer"
          >
            <ArrowShrink02Icon size={14} />
          </button>

          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            title={isSearchOpen ? 'Close search' : 'Show search filter'}
            className={`p-1.5 rounded hover:bg-[#222] transition-colors cursor-pointer ${
              isSearchOpen ? 'text-white bg-[#222]' : 'text-[#777] hover:text-[#dcddde]'
            }`}
          >
            <Search01Icon size={14} />
          </button>
        </div>
      </div>

      {/* 2. Optional Inline Search Filter */}
      {isSearchOpen && (
        <div className="mt-2 mb-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-[#2c2c2c] text-xs text-[#dcddde]">
            <Search01Icon size={13} className="text-[#666] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter backlinks & mentions..."
              autoFocus
              className="bg-transparent outline-none flex-1 text-xs text-[#dcddde] placeholder-[#555]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#666] hover:text-white text-[11px] px-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Linked Mentions Content */}
      <div className="mt-2">
        {groupedBacklinks.length === 0 ? (
          <div className="py-2 text-[#666] text-xs font-normal">
            No backlinks found.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {groupedBacklinks.map((group) => {
              const isCollapsed = !!collapsedGroups[group.docId];
              return (
                <div
                  key={group.docId}
                  className="rounded-lg bg-[#1c1c1c]/50 border border-[#262626] overflow-hidden"
                >
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#181818] hover:bg-[#202020] transition-colors">
                    <div
                      onClick={() => handleToggleGroup(group.docId)}
                      className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0"
                    >
                      {isCollapsed ? (
                        <ChevronRightIcon size={13} className="text-[#777] shrink-0" />
                      ) : (
                        <ChevronDownIcon size={13} className="text-[#777] shrink-0" />
                      )}
                      <File01Icon size={12} className="text-[#666] shrink-0" />
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDocumentById(group.docId);
                        }}
                        className="font-medium text-[#dcddde] hover:text-white hover:underline truncate cursor-pointer text-xs"
                      >
                        {group.docTitle}
                      </span>
                    </div>

                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#242424] text-[#888] font-mono shrink-0 ml-2">
                      {group.items.length}
                    </span>
                  </div>

                  {!isCollapsed && showMoreContext && (
                    <div className="p-2 flex flex-col gap-1.5 bg-[#141414]/40 divide-y divide-[#222]/60">
                      {group.items.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveDocumentById(item.source_document_id)}
                          className="pt-1.5 first:pt-0 cursor-pointer group"
                        >
                          <div className="p-2 rounded bg-[#161616] group-hover:bg-[#1f1f1f] border border-[#222] group-hover:border-[#333] transition-all text-[#999] group-hover:text-[#ccc] text-[11.5px] leading-relaxed">
                            {highlightSnippet(item.snippet, documentTitle)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Unlinked Mentions Section */}
      <div className="mt-5 pt-3">
        <button
          onClick={() => setIsUnlinkedOpen(!isUnlinkedOpen)}
          className="flex items-center gap-2 py-1 text-left text-[#888] hover:text-[#dcddde] transition-colors cursor-pointer group"
        >
          {isUnlinkedOpen ? (
            <ChevronDownIcon size={13} className="text-[#777] group-hover:text-white" />
          ) : (
            <ChevronRightIcon size={13} className="text-[#777] group-hover:text-white" />
          )}
          <span className="font-semibold text-xs text-[#888] group-hover:text-[#dcddde]">
            Unlinked mentions
          </span>
          <span className="text-[#666] text-xs font-normal">
            {filteredUnlinked.length}
          </span>
        </button>

        {isUnlinkedOpen && (
          <div className="mt-2 pl-2">
            {filteredUnlinked.length === 0 ? (
              <div className="py-2 text-[#666] text-xs">
                No unlinked mentions found.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredUnlinked.map((unlinked, idx) => {
                  const isLinking = linkingDocId === unlinked.source_document_id;
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#1c1c1c]/50 border border-[#262626] flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => setActiveDocumentById(unlinked.source_document_id)}
                          className="flex items-center gap-1.5 cursor-pointer truncate flex-1 min-w-0"
                        >
                          <File01Icon size={12} className="text-[#666] shrink-0" />
                          <span className="font-medium text-[#dcddde] hover:text-white hover:underline text-xs truncate">
                            {unlinked.source_document_title}
                          </span>
                        </div>

                        <button
                          onClick={() => handleConvertLink(unlinked.source_document_id, documentTitle)}
                          disabled={isLinking}
                          title={`Convert to [[${documentTitle}]]`}
                          className="px-2.5 py-0.5 rounded bg-[#242424] hover:bg-[#2f2f2f] text-[#38bdf8] hover:text-[#7dd3fc] text-[11px] font-medium transition-colors shrink-0 ml-2 flex items-center gap-1 border border-[#333] cursor-pointer"
                        >
                          {isLinking ? (
                            <CheckIcon size={11} className="text-emerald-400" />
                          ) : (
                            <Link2Icon size={11} />
                          )}
                          <span>{isLinking ? 'Linked' : 'Link'}</span>
                        </button>
                      </div>

                      <div
                        onClick={() => setActiveDocumentById(unlinked.source_document_id)}
                        className="text-[11.5px] text-[#888] hover:text-[#bbb] leading-relaxed bg-[#141414] p-2 rounded border border-[#202020] cursor-pointer transition-colors"
                      >
                        {highlightSnippet(unlinked.snippet, documentTitle)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

