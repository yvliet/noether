import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useBacklinksSettings } from './backlinksSettings';
import { BacklinkItem, UnlinkedMentionItem } from '@/types';
import {
  Search01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  LeftToRightListBulletIcon,
  Link2Icon,
  CheckIcon,
} from '@/components/common/Icons';
import { CollapseAllButton } from '@/components/common/CollapseAllButton';
import { SortDropdown } from '@/components/common/SortDropdown';
import { FileSortOrder, FILE_SORT_OPTIONS } from '@/lib/sort';

export interface DocumentBacklinksProps {
  documentId: string;
  documentTitle: string;
}

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
  const loadLinksAndMentions = useDocumentStore((s) => s.loadLinksAndMentions);

  // Ensure backlinks & mentions are loaded for this document immediately upon mount or prop changes
  useEffect(() => {
    if (documentId) {
      loadLinksAndMentions(documentId, documentTitle);
    }
  }, [documentId, documentTitle, loadLinksAndMentions]);

  const collapseBacklinksByDefault = useBacklinksSettings(
    (s) => s.collapseBacklinksByDefault ?? true
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showMoreContext, setShowMoreContext] = useState(true);
  const [sortOrder, setSortOrder] = useState<FileSortOrder>('alphabetical');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isUnlinkedOpen, setIsUnlinkedOpen] = useState(false);
  const [linkingDocId, setLinkingDocId] = useState<string | null>(null);

  // Reset collapsed state when switching notes
  useEffect(() => {
    setCollapsedGroups({});
  }, [documentId]);

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
      switch (sortOrder) {
        case 'alphabetical':
          return a.docTitle.localeCompare(b.docTitle);
        case 'alphabetical-reverse':
          return b.docTitle.localeCompare(a.docTitle);
        case 'byModifiedTime':
          return b.updatedAt - a.updatedAt;
        case 'byModifiedTimeReverse':
          return a.updatedAt - b.updatedAt;
        case 'byCreatedTime':
          return b.updatedAt - a.updatedAt;
        case 'byCreatedTimeReverse':
          return a.updatedAt - b.updatedAt;
        default:
          return a.docTitle.localeCompare(b.docTitle);
      }
    });

    return groups;
  }, [backlinks, searchQuery, sortOrder]);

  const areAllCollapsed = useMemo(() => {
    if (groupedBacklinks.length === 0) return false;
    return groupedBacklinks.every((g) => {
      return collapsedGroups[g.docId] !== undefined ? collapsedGroups[g.docId] : collapseBacklinksByDefault;
    });
  }, [groupedBacklinks, collapsedGroups, collapseBacklinksByDefault]);

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
    setCollapsedGroups((prev) => {
      const isCurrentlyCollapsed =
        prev[docId] !== undefined ? prev[docId] : collapseBacklinksByDefault;
      const nextCollapsed = !isCurrentlyCollapsed;
      const next = { ...prev, [docId]: nextCollapsed };

      const isAnyExpanded = groupedBacklinks.some((g) => {
        const c = next[g.docId] !== undefined ? next[g.docId] : collapseBacklinksByDefault;
        return !c;
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('flint:backlinks-toggled', { detail: { isOpen: isAnyExpanded } })
        );
      }
      return next;
    });
  }, [collapseBacklinksByDefault, groupedBacklinks]);

  const handleToggleCollapseAll = useCallback(() => {
    const nextCollapsed = !areAllCollapsed;
    const next: Record<string, boolean> = {};
    groupedBacklinks.forEach((g) => {
      next[g.docId] = nextCollapsed;
    });
    setCollapsedGroups(next);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('flint:backlinks-toggled', { detail: { isOpen: !nextCollapsed } })
      );
    }
  }, [areAllCollapsed, groupedBacklinks]);

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
    // Highlight [[term]] or term with warm amber/gold matching Image 2
    const regex = new RegExp(`(\\[\\[${escapeRegex(term)}\\]\\]|${escapeRegex(term)})`, 'gi');
    const parts = snippet.split(regex);
    return parts.map((part, idx) => {
      const lower = part.toLowerCase();
      const termLower = term.toLowerCase();
      if (lower === termLower || lower === `[[${termLower}]]`) {
        return (
          <span
            key={idx}
            className="text-white font-normal bg-[#82691b] px-1 py-0.5 rounded-[4px]"
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
        {/* Left: Title & Count (Clean plain title, matching Image 2) */}
        <div className="flex items-center gap-1.5 select-none">
          <span className="font-semibold text-[13px] text-white">
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
            className={`p-1.5 rounded hover:bg-[#222] transition-none cursor-pointer ${
              showMoreContext ? 'text-white' : 'text-[#777] hover:text-[#dcddde]'
            }`}
          >
            <LeftToRightListBulletIcon size={14} />
          </button>

          <CollapseAllButton
            isCollapsed={areAllCollapsed}
            onToggle={handleToggleCollapseAll}
            disabled={groupedBacklinks.length === 0}
            collapsedTitle="Expand all"
            expandedTitle="Collapse all"
            disabledTitle="No backlinks to collapse"
          />

          <SortDropdown
            value={sortOrder}
            onChange={setSortOrder}
            options={FILE_SORT_OPTIONS}
            disabled={groupedBacklinks.length === 0}
          />

          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            title={isSearchOpen ? 'Close search' : 'Show search filter'}
            className={`p-1.5 rounded hover:bg-[#222] transition-none cursor-pointer ${
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
          <div className="flex flex-col gap-2">
            {groupedBacklinks.map((group) => {
              const isCollapsed =
                collapsedGroups[group.docId] !== undefined
                  ? collapsedGroups[group.docId]
                  : collapseBacklinksByDefault;

              return (
                <div key={group.docId} className="flex flex-col">
                  {/* Clean group row: NO card container, NO border, NO file icon */}
                  <div
                    onClick={() => handleToggleGroup(group.docId)}
                    className="flex items-center justify-between py-1 cursor-pointer select-none text-[#dcddde] hover:text-white group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isCollapsed ? (
                        <ChevronRightIcon size={12} className="text-[#777] group-hover:text-white shrink-0" />
                      ) : (
                        <ChevronDownIcon size={12} className="text-[#777] group-hover:text-white shrink-0" />
                      )}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDocumentById(group.docId);
                        }}
                        className="font-normal text-xs text-[#dcddde] hover:text-white hover:underline truncate"
                      >
                        {group.docTitle}
                      </span>
                    </div>

                    {/* Plain count on right: NO badge pill */}
                    <span className="text-xs text-[#666] font-normal shrink-0 ml-2">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Snippet box */}
                  {!isCollapsed && showMoreContext && (
                    <div className="mt-1 flex flex-col gap-1.5">
                      {group.items.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveDocumentById(item.source_document_id)}
                          className="p-2.5 rounded-md bg-[#161616] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#333] transition-none cursor-pointer text-[#a0a0a0] hover:text-[#ccc] text-[12px] leading-relaxed select-text"
                        >
                          {highlightSnippet(item.snippet, documentTitle)}
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
      <div className="mt-6 pt-2">
        <div
          onClick={() => setIsUnlinkedOpen(!isUnlinkedOpen)}
          className="py-1 cursor-pointer select-none text-[#777] hover:text-[#bbb] font-semibold text-xs transition-none flex items-center gap-2"
        >
          <span>Unlinked mentions</span>
          {filteredUnlinked.length > 0 && (
            <span className="text-[#555] font-normal">{filteredUnlinked.length}</span>
          )}
        </div>

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
                          <span className="font-medium text-[#dcddde] hover:text-white hover:underline text-xs truncate">
                            {unlinked.source_document_title}
                          </span>
                        </div>

                        <button
                          onClick={() => handleConvertLink(unlinked.source_document_id, documentTitle)}
                          disabled={isLinking}
                          title={`Convert to [[${documentTitle}]]`}
                          className="px-2.5 py-0.5 rounded bg-[#242424] hover:bg-[#2f2f2f] text-[#38bdf8] hover:text-[#7dd3fc] text-[11px] font-medium transition-none shrink-0 ml-2 flex items-center gap-1 border border-[#333] cursor-pointer"
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
                        className="text-[11.5px] text-[#888] hover:text-[#bbb] leading-relaxed bg-[#141414] p-2 rounded border border-[#202020] cursor-pointer transition-none"
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

