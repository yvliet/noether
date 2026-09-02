import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CascadeIcon, CascadeBookIcon } from './cascadeIcons';
import {
  getCascadeInfo,
  getCascadeNotes,
  getAllCascades,
  assignNoteToCascade,
  removeNoteFromCascade,
  navigateCascade,
  formatCascadePageDisplay,
  parseCascadePageString,
} from './cascadeManager';
import { useCascadeSettings } from './cascadeSettings';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PlusSignIcon,
  Cancel01Icon,
  Delete02Icon,
  CheckIcon,
  Link2Icon,
} from '@/components/common/Icons';

export const CascadeStatusBarItem: React.FC = React.memo(() => {
  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const documents = useDocumentStore((s) => s.documents);
  const openTab = useWorkspaceStore((s) => s.openTab);
  const showInStatusBar = useCascadeSettings((s) => s.showInStatusBar);
  const prevPageHotkey = useCascadeSettings((s) => s.prevPageHotkey);
  const nextPageHotkey = useCascadeSettings((s) => s.nextPageHotkey);
  const activeCascadeContext = useCascadeSettings((s) => s.activeCascadeContext);

  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ bottom: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Form states
  const [selectedBook, setSelectedBook] = useState('');
  const [customBookName, setCustomBookName] = useState('');
  const [pageInput, setPageInput] = useState<string>('1');
  const [isCreatingNewBook, setIsCreatingNewBook] = useState(false);

  const currentDoc = activeDocument;
  const cascadeInfo = useMemo(() => getCascadeInfo(currentDoc), [currentDoc, currentDoc?.properties]);

  const allCascades = useMemo(() => getAllCascades(documents), [documents]);
  const cascadeNotes = useMemo(() => {
    if (!cascadeInfo.isCascaded || !cascadeInfo.cascadeName) return [];
    return getCascadeNotes(cascadeInfo.cascadeName, documents);
  }, [cascadeInfo.isCascaded, cascadeInfo.cascadeName, documents]);

  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId), [tabs, activeTabId]);

  const totalPages = cascadeNotes.length;

  const isInCascadeMode = Boolean(
    currentDoc && activeTab?.document_id === currentDoc.id && activeTab?.metadata?.cascadeName
  );
  const isAlreadyCascadedOutside = Boolean(!isInCascadeMode && cascadeInfo.isCascaded);

  // Initialize form when popover opens or active doc changes
  useEffect(() => {
    if (isOpen) {
      if (cascadeInfo.isCascaded) {
        setSelectedBook(cascadeInfo.cascadeName);
        setCustomBookName('');
        setPageInput(formatCascadePageDisplay(cascadeInfo.pageNumber ?? 1));
        setIsCreatingNewBook(false);
      } else {
        if (allCascades.length > 0) {
          setSelectedBook(allCascades[0].name);
          const nextSuggestedPage = allCascades[0].notes.length + 1;
          setPageInput(String(nextSuggestedPage));
          setIsCreatingNewBook(false);
        } else {
          setSelectedBook('Default Cascade');
          setCustomBookName('Default Cascade');
          setPageInput('1');
          setIsCreatingNewBook(true);
        }
      }
    }
  }, [isOpen, cascadeInfo, allCascades]);

  // Handle outside click to close
  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleDown);
    return () => window.removeEventListener('mousedown', handleDown);
  }, [isOpen]);

  if (!showInStatusBar || !currentDoc || currentDoc.is_folder) {
    return null;
  }

  const handleTogglePopover = () => {
    if (isAlreadyCascadedOutside) return;
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPos({
        bottom: window.innerHeight - rect.top + 6,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    setIsOpen((prev) => !prev);
  };

  const handleSaveCascade = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentDoc) return;

    const bookName = isCreatingNewBook
      ? (customBookName.trim() || 'Default Cascade')
      : (selectedBook || 'Default Cascade');

    const parsedPage = parseCascadePageString(pageInput) ?? 1;
    await assignNoteToCascade(currentDoc.id, bookName, parsedPage);
    useCascadeSettings.getState().setActiveCascadeContext({
      docId: currentDoc.id,
      cascadeName: bookName,
      page: parsedPage,
    });
    openTab(currentDoc.id, currentDoc.title, {
      id: `tab-cascade-${bookName}-${currentDoc.id}`,
      metadata: {
        cascadeName: bookName,
        page: parsedPage,
      },
    });
    setIsOpen(false);
  };

  const handleRemove = async () => {
    if (!currentDoc) return;
    await removeNoteFromCascade(currentDoc.id);
    useCascadeSettings.getState().setActiveCascadeContext(null);
    setIsOpen(false);
  };

  return (
    <>
      {isAlreadyCascadedOutside ? (
        <button
          ref={buttonRef}
          type="button"
          disabled
          title={`This page is already in "${cascadeInfo.cascadeName || 'Cascade'}"`}
          className="p-1 rounded-[4px] select-none text-[#666] opacity-50 cursor-not-allowed bg-transparent flex items-center justify-center"
        >
          <CascadeIcon size={12} className="text-[#666]" />
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleTogglePopover}
          title={
            isInCascadeMode
              ? `Cascade: "${cascadeInfo.cascadeName}" (Page ${formatCascadePageDisplay(cascadeInfo.pageNumber ?? 0)}${
                  totalPages > 0 ? ` of ${totalPages}` : ''
                })\nClick to manage cascade links`
              : 'Add note to Cascade\n(Create sequential note books linked in graph view)'
          }
          className={`rounded-[4px] transition-colors cursor-pointer select-none flex items-center justify-center ${
            isInCascadeMode
              ? 'gap-1.5 px-1.5 py-0.5 text-[11px] text-[var(--flint-text-primary,#dcddde)] hover:text-white hover:bg-[var(--flint-bg-card-hover,#2a2a2a)] font-medium'
              : 'p-1 text-[var(--flint-text-muted,#777)] hover:text-[var(--flint-text-primary,#dcddde)] hover:bg-[#242424]'
          }`}
        >
          <CascadeIcon size={12} className={isInCascadeMode ? 'text-[var(--flint-text-primary,#dcddde)]' : 'text-[#777] hover:text-[#dcddde]'} />
          {isInCascadeMode && (
            <span className="truncate max-w-[140px]">
              {cascadeInfo.cascadeName} <span className="text-[10px] opacity-70">[{formatCascadePageDisplay(cascadeInfo.pageNumber ?? 0)}]</span>
            </span>
          )}
        </button>
      )}

      {/* Floating Cascade Quick Management Popover */}
      {isOpen && popoverPos && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            bottom: `${popoverPos.bottom}px`,
            right: `${popoverPos.right}px`,
          }}
          className="z-50 w-80 bg-[var(--flint-bg-card,#1e1e1e)] border border-[var(--flint-border-base,#333)] rounded-xl shadow-2xl p-3 text-xs text-[var(--flint-text-primary,#dcddde)] animate-in fade-in zoom-in-95 duration-100 font-sans"
        >
          {/* Quick Page Navigation if cascaded */}
          {cascadeInfo.isCascaded && (
            <div className="mb-3 p-2 rounded-lg bg-[#252525] border border-[#333] flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <CascadeBookIcon size={14} className="text-[#aaa] shrink-0" />
                <div className="truncate text-[11px]">
                  <span className="font-medium text-white">{cascadeInfo.cascadeName}</span>
                  <span className="text-[#888] ml-1">
                    (Page {formatCascadePageDisplay(cascadeInfo.pageNumber ?? 0)} / {totalPages})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => navigateCascade('prev')}
                  title={`Previous Page (${prevPageHotkey})`}
                  className="p-1 rounded bg-[#1c1c1c] hover:bg-[#333] text-[#aaa] hover:text-white transition-colors"
                >
                  <ArrowLeft01Icon size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => navigateCascade('next')}
                  title={`Next Page (${nextPageHotkey})`}
                  className="p-1 rounded bg-[#1c1c1c] hover:bg-[#333] text-[#aaa] hover:text-white transition-colors"
                >
                  <ArrowRight01Icon size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSaveCascade} className="space-y-3">
            {/* Cascade Book selection */}
            <div>
              <label className="block text-[11px] font-medium text-[#aaa] mb-1">
                Cascade (Book Name)
              </label>

              {!isCreatingNewBook && allCascades.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedBook}
                    onChange={(e) => {
                      setSelectedBook(e.target.value);
                      const matchingCascade = allCascades.find((c) => c.name === e.target.value);
                      if (matchingCascade && !cascadeInfo.isCascaded) {
                        setPageInput(String(matchingCascade.notes.length + 1));
                      }
                    }}
                    className="flex-1 bg-[#181818] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-[#555] transition-colors"
                  >
                    {allCascades.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.notes.length} pages)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewBook(true);
                      setCustomBookName('');
                    }}
                    title="Create new cascade book"
                    className="px-2 py-1.5 bg-[#252525] hover:bg-[#333] border border-[#333] rounded-md text-xs text-[#aaa] hover:text-white transition-colors"
                  >
                    <PlusSignIcon size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. Research Papers, Novel Vol 1"
                    value={customBookName}
                    onChange={(e) => setCustomBookName(e.target.value)}
                    autoFocus={isCreatingNewBook}
                    className="flex-1 bg-[#181818] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-[#555] transition-colors"
                  />
                  {allCascades.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewBook(false)}
                      className="px-2 py-1.5 bg-[#252525] hover:bg-[#333] border border-[#333] rounded-md text-[11px] text-[#aaa] hover:text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Page Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-[#aaa]">
                  Cascade Page Number
                </label>
                <span className="text-[10px] text-[#777]">Property: Cascade Page</span>
              </div>
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder="1"
                className="w-full bg-[#181818] border border-[#333] rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-[#555] transition-colors"
              />
            </div>

            {/* Book Pages List Overview */}
            {cascadeNotes.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-[#777] mb-1.5">
                  Pages in {cascadeInfo.cascadeName || selectedBook}
                </div>
                <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-0.5 bg-[#181818] border border-[#2e2e2e] rounded-md p-1">
                  {cascadeNotes.map((n) => {
                    const isCurrent = n.doc.id === currentDoc.id;
                    return (
                      <div
                        key={n.doc.id}
                        onClick={() => {
                          if (!isCurrent) {
                            openTab(n.doc.id, n.doc.title);
                            setIsOpen(false);
                          }
                        }}
                        className={`flex items-center justify-between px-2 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-[#2a2a2a] text-white font-medium'
                            : 'text-[#aaa] hover:bg-[#252525] hover:text-white'
                        }`}
                      >
                        <span className="truncate flex-1 pr-2">
                          <span className="text-[#666] mr-1.5">[{formatCascadePageDisplay(n.page)}]</span>
                          {n.doc.title}
                        </span>
                        {isCurrent && <CheckIcon size={11} className="shrink-0 text-white" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--flint-border-subtle,#2a2a2a)]">
              {cascadeInfo.isCascaded ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[#f87171] hover:bg-[#391a1a] transition-colors text-[11px]"
                >
                  <Delete02Icon size={12} />
                  Remove
                </button>
              ) : (
                <div className="text-[10px] text-[#666] flex items-center gap-1">
                  <Link2Icon size={11} /> Links in Graph View
                </div>
              )}

              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#383838] border border-[#444] text-white font-medium rounded-md transition-colors text-xs ml-auto shadow-sm"
              >
                {cascadeInfo.isCascaded ? 'Update Cascade' : 'Add to Cascade'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
});

CascadeStatusBarItem.displayName = 'CascadeStatusBarItem';
