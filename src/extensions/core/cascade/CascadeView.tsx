/**
 * @file CascadeView.tsx
 * @description
 * Dedicated left sidebar view for the Cascade extension.
 * Renders sequential cascade books, their member pages, creation controls,
 * search filtering, and drag-and-drop support.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  CascadeIcon,
  CascadeBookIcon,
} from './cascadeIcons';
import {
  PlusSignIcon,
  Search01Icon,
  ArrowShrink02Icon,
  ArrowExpand01Icon,
  FileAddIcon,
  FolderAddIcon,
  CancelCircleIcon,
} from '@/components/common/Icons';
import { CascadeFolderNode } from './CascadeFolderNode';
import {
  getAllCascades,
  assignNoteToCascade,
  parseCascadePageString,
} from './cascadeManager';
import { useCascadeSettings } from './cascadeSettings';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';

export const CascadeView: React.FC = React.memo(() => {
  const documents = useDocumentStore((s) => s.documents);
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const openTab = useWorkspaceStore((s) => s.openTab);
  const openInputDialog = useWorkspaceStore((s) => s.openInputDialog);
  const setActiveCascadeContext = useCascadeSettings((s) => s.setActiveCascadeContext);
  const { showContextMenu } = useAppContextMenu();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Set of collapsed cascade names. If a name is NOT in the set, the cascade book is open (default open).
  const [collapsedCascadeNames, setCollapsedCascadeNames] = useState<Set<string>>(new Set());

  // Extract all cascades from the documents list
  const allCascades = useMemo(() => getAllCascades(documents), [documents]);

  // Check if all cascade books are currently collapsed
  const areAllCollapsed = useMemo(() => {
    if (allCascades.length === 0) return false;
    return allCascades.every((c) => collapsedCascadeNames.has(c.name));
  }, [allCascades, collapsedCascadeNames]);

  const handleToggleCollapseExpandAll = useCallback(() => {
    if (areAllCollapsed) {
      // Expand all: clear all collapsed names
      setCollapsedCascadeNames(new Set());
    } else {
      // Collapse all: add every cascade name to collapsed set
      setCollapsedCascadeNames(new Set(allCascades.map((c) => c.name)));
    }
  }, [areAllCollapsed, allCascades]);

  const handleToggleCascade = useCallback((cascadeName: string, nextOpen: boolean) => {
    setCollapsedCascadeNames((prev) => {
      const next = new Set(prev);
      if (nextOpen) {
        next.delete(cascadeName);
      } else {
        next.add(cascadeName);
      }
      return next;
    });
  }, []);

  // Filter cascades according to search query
  const filteredCascades = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allCascades;

    return allCascades
      .map((cascade) => {
        const matchesCascadeName = cascade.name.toLowerCase().includes(q);
        const matchingNotes = cascade.notes.filter(
          (n) =>
            n.doc.title.toLowerCase().includes(q) ||
            String(n.page).includes(q)
        );

        if (matchesCascadeName || matchingNotes.length > 0) {
          return {
            name: cascade.name,
            notes: matchesCascadeName ? cascade.notes : matchingNotes,
          };
        }
        return null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [allCascades, searchQuery]);

  // Create a new note in a newly named or specified cascade
  const handleCreateNewCascade = useCallback(() => {
    openInputDialog({
      title: 'Create new Cascade Book',
      placeholder: 'e.g. Research Papers, Novel Vol 1',
      confirmText: 'Create Book',
      onConfirm: async (val) => {
        const bookName = val.trim() || 'Default Cascade';
        const newDoc = await createNewNote('Untitled');
        if (newDoc) {
          await assignNoteToCascade(newDoc.id, bookName, 1);
          setActiveCascadeContext({
            docId: newDoc.id,
            cascadeName: bookName,
            page: 1,
          });
          openTab(newDoc.id, newDoc.title, {
            id: `tab-cascade-${bookName}-${newDoc.id}`,
            metadata: {
              cascadeName: bookName,
              page: 1,
            },
          });
          useDocumentStore.getState().setEditingDocId(newDoc.id);
        }
      },
    });
  }, [openInputDialog, createNewNote, openTab, setActiveCascadeContext]);

  // Background context menu for empty areas
  const handleBackgroundContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          id: 'new-cascade',
          title: 'New Cascade book...',
          icon: <FolderAddIcon size={14} />,
          onClick: handleCreateNewCascade,
        },
        { type: 'separator' },
        {
          id: 'collapse-expand-all',
          title: areAllCollapsed ? 'Expand all books' : 'Collapse all books',
          icon: areAllCollapsed ? <ArrowExpand01Icon size={14} /> : <ArrowShrink02Icon size={14} />,
          onClick: handleToggleCollapseExpandAll,
        },
      ];

      showContextMenu(e, items, { scope: 'cascade-view' });
    },
    [handleCreateNewCascade, areAllCollapsed, handleToggleCollapseExpandAll, showContextMenu]
  );

  return (
    <div
      data-cascade-view="true"
      onContextMenu={handleBackgroundContextMenu}
      className="flex flex-col h-full select-none text-xs"
    >
      {/* Top Action Toolbar Header */}
      <div className="h-9 px-2 flex items-center justify-center gap-1.5 text-[var(--flint-text-muted)] shrink-0">
        <button
          type="button"
          onClick={handleCreateNewCascade}
          title="New Cascade book"
          className="p-1.5 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
        >
          <FolderAddIcon size={14} />
        </button>

        <button
          type="button"
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery('');
          }}
          title={isSearchOpen ? 'Close search' : 'Search cascade pages'}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            isSearchOpen
              ? 'bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-primary)]'
              : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)]'
          }`}
        >
          <Search01Icon size={14} />
        </button>

        <button
          type="button"
          onClick={handleToggleCollapseExpandAll}
          title={areAllCollapsed ? 'Expand all books' : 'Collapse all books'}
          className="p-1.5 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
        >
          {areAllCollapsed ? <ArrowExpand01Icon size={14} /> : <ArrowShrink02Icon size={14} />}
        </button>
      </div>

      {/* Search Input Row (Toggled) */}
      {isSearchOpen && (
        <div className="pt-1 px-2 pb-1.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--flint-bg-input)] border border-[var(--flint-border-base)] focus-within:border-[var(--flint-accent)] transition-colors">
            <Search01Icon size={14} className="text-[var(--flint-text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cascade books & pages..."
              autoFocus
              className="bg-transparent outline-none flex-1 text-xs text-[var(--flint-text-primary)] placeholder-[var(--flint-text-faint)] min-w-0"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                className="p-0.5 rounded text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-pointer transition-colors"
              >
                <CancelCircleIcon size={13} />
              </button>
            )}
          </div>
          <div className="border-b border-[var(--flint-border-base)] -mx-2 mt-0.5 opacity-60" />
        </div>
      )}

      {/* Main Cascade Tree Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 custom-scrollbar flex flex-col gap-0.5">
        {allCascades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#666] text-xs gap-2 select-none text-center">
            <CascadeIcon size={24} className="opacity-40" />
            <span>No cascades yet</span>
            <span className="text-[11px] text-[#555]">Organize notes into sequential books</span>
          </div>
        ) : filteredCascades.length === 0 ? (
          <div className="px-2 py-4 text-xs text-[var(--flint-text-muted)] select-none text-center">
            No matching cascade books found.
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 flex-1">
            {filteredCascades.map((cascade) => (
              <CascadeFolderNode
                key={`cascade-tree-${cascade.name}`}
                cascade={cascade}
                isOpen={!collapsedCascadeNames.has(cascade.name)}
                onToggleOpen={(open) => handleToggleCascade(cascade.name, open)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

CascadeView.displayName = 'CascadeView';
