import React, { useState, useMemo, useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import {
  LinkSquare02Icon,
  Link2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  Search01Icon,
  PlusSignIcon,
  CheckIcon,
  ArrowShrink02Icon,
  ArrowUpNarrowWideIcon,
  HelpCircleIcon,
} from '@/components/common/Icons';

export const BacklinksView: React.FC = React.memo(() => {
  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const backlinks = useDocumentStore((s) => s.backlinks);
  const outgoingLinks = useDocumentStore((s) => s.outgoingLinks);
  const unlinkedMentions = useDocumentStore((s) => s.unlinkedMentions);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const convertUnlinkedMention = useDocumentStore((s) => s.convertUnlinkedMention);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLinkedOpen, setIsLinkedOpen] = useState(true);
  const [isOutgoingOpen, setIsOutgoingOpen] = useState(true);
  const [isUnlinkedOpen, setIsUnlinkedOpen] = useState(true);
  const [linkingDocId, setLinkingDocId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'alpha' | 'recent'>('alpha');

  const filteredBacklinks = useMemo(() => {
    let list = backlinks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.source_document_title.toLowerCase().includes(q) ||
          b.snippet.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortOrder === 'alpha') {
        return a.source_document_title.localeCompare(b.source_document_title);
      }
      return (b.updated_at || 0) - (a.updated_at || 0);
    });
  }, [backlinks, searchQuery, sortOrder]);

  const filteredUnlinked = useMemo(() => {
    let list = unlinkedMentions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.source_document_title.toLowerCase().includes(q) ||
          u.snippet.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortOrder === 'alpha') {
        return a.source_document_title.localeCompare(b.source_document_title);
      }
      return (b.updated_at || 0) - (a.updated_at || 0);
    });
  }, [unlinkedMentions, searchQuery, sortOrder]);

  const filteredOutgoing = useMemo(() => {
    if (!searchQuery.trim()) return outgoingLinks;
    const q = searchQuery.toLowerCase();
    return outgoingLinks.filter((o) => o.link_text.toLowerCase().includes(q));
  }, [outgoingLinks, searchQuery]);

  const handleConvertLink = useCallback(async (sourceDocId: string, title: string) => {
    setLinkingDocId(sourceDocId);
    try {
      await convertUnlinkedMention(sourceDocId, title);
    } finally {
      setTimeout(() => setLinkingDocId(null), 600);
    }
  }, [convertUnlinkedMention]);

  const handleCreateUnresolvedDoc = useCallback(async (title: string) => {
    await createNewNote(title);
  }, [createNewNote]);

  const handleToggleCollapseAll = useCallback(() => {
    setIsLinkedOpen((prevLinked) => {
      setIsOutgoingOpen((prevOutgoing) => {
        setIsUnlinkedOpen((prevUnlinked) => {
          const shouldCollapse = prevLinked || prevOutgoing || prevUnlinked;
          return !shouldCollapse;
        });
        const shouldCollapse = prevLinked || prevOutgoing;
        return !shouldCollapse;
      });
      return !prevLinked;
    });
  }, []);

  if (!activeDocument) {
    return (
      <div className="text-center py-12 text-[#555] text-[13px] select-none">
        No document open.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none text-xs">
      {/* Top Centered Action Header */}
      <div className="h-9 px-2 flex items-center justify-center gap-1.5 text-[#777] shrink-0">
        <button
          onClick={handleToggleCollapseAll}
          title={isLinkedOpen || isOutgoingOpen || isUnlinkedOpen ? 'Collapse all sections' : 'Expand all sections'}
          className="p-1.5 rounded hover:bg-[#202020] text-[#777] hover:text-[#dcddde] transition-colors"
        >
          <ArrowShrink02Icon size={14} />
        </button>

        <button
          onClick={() => setSortOrder((prev) => (prev === 'alpha' ? 'recent' : 'alpha'))}
          title={`Sort order: ${sortOrder === 'alpha' ? 'Alphabetical (A to Z)' : 'Recent first'}`}
          className="p-1.5 rounded hover:bg-[#202020] text-[#777] hover:text-[#dcddde] transition-colors"
        >
          <ArrowUpNarrowWideIcon size={14} />
        </button>

        <button
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery('');
          }}
          title={isSearchOpen ? 'Close search' : 'Search links & mentions'}
          className={`p-1.5 rounded hover:bg-[#202020] transition-colors ${
            isSearchOpen ? 'text-white bg-[#202020]' : 'text-[#777] hover:text-[#dcddde]'
          }`}
        >
          <Search01Icon size={14} />
        </button>
      </div>

      {isSearchOpen && (
        <div className="px-2.5 py-1.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#1c1c1c] text-xs text-[#dcddde]">
            <Search01Icon size={13} className="text-[#666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter links & mentions..."
              autoFocus
              className="bg-transparent outline-none flex-1 text-xs text-[#dcddde] placeholder-[#555]"
            />
          </div>
        </div>
      )}

      {/* Main Backlinks Content */}
      <div className="flex-1 overflow-y-auto px-2 py-1 custom-scrollbar flex flex-col gap-3">
        {/* Accordion 1: Linked Mentions */}
        <div className="flex flex-col">
          <button
            onClick={() => setIsLinkedOpen(!isLinkedOpen)}
            className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-[#1a1a1a] text-left transition-colors group"
          >
            <div className="flex items-center gap-1.5 font-medium text-[#c0c0c0] group-hover:text-white">
              {isLinkedOpen ? <ChevronDownIcon size={13} className="text-[#777]" /> : <ChevronRightIcon size={13} className="text-[#777]" />}
              <span className="text-[12px]">Linked mentions</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#222] text-[#888] font-mono">
              {filteredBacklinks.length}
            </span>
          </button>

          {isLinkedOpen && (
            <div className="mt-1 flex flex-col gap-1.5 pl-2">
              {filteredBacklinks.length === 0 ? (
                <div className="py-2 text-center flex items-center justify-center gap-1.5 select-none text-[#555]">
                  <span className="text-[11px]">No linked mentions</span>
                  <span
                    data-tooltip={`Type [[${activeDocument.title}]]&#10;in other notes to link here`}
                    className="inline-flex items-center text-[#555] hover:text-[#bbb] cursor-help transition-colors"
                  >
                    <HelpCircleIcon size={12} />
                  </span>
                </div>
              ) : (
                filteredBacklinks.map((link, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveDocumentById(link.source_document_id)}
                    className="p-2 rounded-lg bg-[#181818] hover:bg-[#222] cursor-pointer transition-all border border-[#242424] hover:border-[#333] group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-[#dcddde] group-hover:text-white text-xs truncate">
                        {link.source_document_title}
                      </div>
                      <span className="text-[9px] text-[#555]">
                        {new Date(link.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#888] leading-relaxed line-clamp-2 bg-[#121212] p-1.5 rounded border border-[#1e1e1e]">
                      "{link.snippet}"
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Accordion 2: Outgoing Links */}
        <div className="flex flex-col">
          <button
            onClick={() => setIsOutgoingOpen(!isOutgoingOpen)}
            className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-[#1a1a1a] text-left transition-colors group"
          >
            <div className="flex items-center gap-1.5 font-medium text-[#c0c0c0] group-hover:text-white">
              {isOutgoingOpen ? <ChevronDownIcon size={13} className="text-[#777]" /> : <ChevronRightIcon size={13} className="text-[#777]" />}
              <span className="text-[12px]">Outgoing links</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#222] text-[#888] font-mono">
              {filteredOutgoing.length}
            </span>
          </button>

          {isOutgoingOpen && (
            <div className="mt-1 flex flex-col gap-1 pl-2">
              {filteredOutgoing.length === 0 ? (
                <div className="py-2 text-center flex items-center justify-center gap-1.5 select-none text-[#555]">
                  <span className="text-[11px]">No outgoing links</span>
                  <span
                    data-tooltip="Type [[Note Title]] in your note to link outward"
                    className="inline-flex items-center text-[#555] hover:text-[#bbb] cursor-help transition-colors"
                  >
                    <HelpCircleIcon size={12} />
                  </span>
                </div>
              ) : (
                filteredOutgoing.map((out, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded-md bg-[#181818] hover:bg-[#202020] transition-colors border border-[#222]"
                  >
                    <div
                      onClick={() => {
                        if (out.target_document_id) {
                          setActiveDocumentById(out.target_document_id);
                        } else {
                          handleCreateUnresolvedDoc(out.link_text);
                        }
                      }}
                      className="flex items-center gap-2 cursor-pointer truncate flex-1 min-w-0"
                    >
                      <Link2Icon size={12} className={out.exists ? 'text-[#38bdf8]' : 'text-[#666]'} />
                      <span className={`text-[12px] truncate ${out.exists ? 'text-[#dcddde] hover:text-white' : 'text-[#888] italic'}`}>
                        {out.link_text}
                      </span>
                    </div>

                    {!out.exists && (
                      <button
                        onClick={() => handleCreateUnresolvedDoc(out.link_text)}
                        title="Create note"
                        className="px-2 py-0.5 rounded bg-[#252525] hover:bg-[#303030] text-[#a0a0a0] hover:text-white text-[10px] shrink-0 ml-2 transition-colors flex items-center gap-1"
                      >
                        <PlusSignIcon size={10} />
                        <span>Create</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Accordion 3: Unlinked Mentions */}
        <div className="flex flex-col">
          <button
            onClick={() => setIsUnlinkedOpen(!isUnlinkedOpen)}
            className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-[#1a1a1a] text-left transition-colors group"
          >
            <div className="flex items-center gap-1.5 font-medium text-[#c0c0c0] group-hover:text-white">
              {isUnlinkedOpen ? <ChevronDownIcon size={13} className="text-[#777]" /> : <ChevronRightIcon size={13} className="text-[#777]" />}
              <span className="text-[12px]">Unlinked mentions</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#222] text-[#888] font-mono">
              {filteredUnlinked.length}
            </span>
          </button>

          {isUnlinkedOpen && (
            <div className="mt-1 flex flex-col gap-1.5 pl-2">
              {filteredUnlinked.length === 0 ? (
                <div className="py-2 text-center text-[#555] text-[11px]">
                  No unlinked mentions found
                </div>
              ) : (
                filteredUnlinked.map((unlinked, idx) => {
                  const isLinking = linkingDocId === unlinked.source_document_id;
                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-[#181818] border border-[#242424] flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => setActiveDocumentById(unlinked.source_document_id)}
                          className="font-medium text-[#dcddde] hover:text-white text-xs cursor-pointer truncate flex-1 min-w-0"
                        >
                          {unlinked.source_document_title}
                        </div>
                        <button
                          onClick={() => handleConvertLink(unlinked.source_document_id, activeDocument.title)}
                          disabled={isLinking}
                          title={`Link [[${activeDocument.title}]] in ${unlinked.source_document_title}`}
                          className="px-2 py-0.5 rounded bg-[#222] hover:bg-[#2e2e2e] text-[#38bdf8] hover:text-[#7dd3fc] text-[11px] font-medium transition-colors shrink-0 ml-2 flex items-center gap-1 border border-[#333]"
                        >
                          {isLinking ? <CheckIcon size={11} className="text-emerald-400" /> : <Link2Icon size={11} />}
                          <span>{isLinking ? 'Linked' : 'Link'}</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-[#888] leading-relaxed bg-[#121212] p-1.5 rounded border border-[#1e1e1e]">
                        {unlinked.snippet}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

