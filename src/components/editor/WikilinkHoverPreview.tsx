import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DocumentView } from './DocumentView';
import { Link04Icon, FileAddIcon } from '@/components/common/Icons';
import { DocumentItem } from '@/types';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { getDocumentById } from '@/lib/db/documents';

export interface WikilinkHoverPreviewProps {
  target: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Resolves a raw wikilink target (such as "Note Title", "Note Title#Heading",
 * "Note Title|Alias", or an ID) against the in-memory documents list.
 */
export function resolveTargetDocument(
  rawTarget: string,
  documents: DocumentItem[]
): {
  doc: DocumentItem | null;
  targetTitle: string;
  headingPart: string | null;
} {
  let targetTitle = rawTarget;
  if (targetTitle.includes('|')) {
    targetTitle = targetTitle.split('|')[0];
  }
  targetTitle = targetTitle.replace(/^\[+|\]+$/g, '').trim();
  if (!targetTitle) return { doc: null, targetTitle: '', headingPart: null };

  let notePart = targetTitle;
  let headingPart: string | null = null;
  if (targetTitle.includes('#')) {
    const parts = targetTitle.split('#');
    notePart = parts[0].trim();
    headingPart = parts.slice(1).join('#').trim();
  }

  if (!notePart) {
    return { doc: null, targetTitle, headingPart };
  }

  const cleanTarget = notePart.trim().toLowerCase();
  const cleanWithoutExt = cleanTarget.replace(/\.md$/, '');
  const targetBaseName = cleanWithoutExt.split('/').pop() || cleanWithoutExt;

  const matched = documents.find((d) => {
    if (d.is_folder) return false;
    const titleLower = d.title.toLowerCase();

    // Check frontmatter aliases if defined
    let aliasMatch = false;
    if (d.properties) {
      try {
        const props = typeof d.properties === 'string' ? JSON.parse(d.properties) : d.properties;
        if (props && Array.isArray(props.aliases)) {
          aliasMatch = props.aliases.some(
            (a: any) => typeof a === 'string' && a.toLowerCase() === cleanWithoutExt
          );
        }
      } catch {}
    }

    return (
      d.id === notePart ||
      titleLower === cleanTarget ||
      titleLower === cleanWithoutExt ||
      titleLower === targetBaseName ||
      `${titleLower}.md` === cleanTarget ||
      aliasMatch
    );
  });

  return {
    doc: matched || null,
    targetTitle: notePart,
    headingPart,
  };
}

export const WikilinkHoverPreview: React.FC<WikilinkHoverPreviewProps> = React.memo(({
  target,
  anchorRect,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) => {
  const documents = useDocumentStore((s) => s.documents);
  const { doc, targetTitle } = useMemo(
    () => resolveTargetDocument(target, documents),
    [target, documents]
  );

  const [fullContent, setFullContent] = useState<string>(doc?.content_json || '');
  const [placementStyle, setPlacementStyle] = useState<{
    top: string;
    bottom: string;
    left: string;
    maxHeight: string;
  }>({
    top: '0px',
    bottom: 'auto',
    left: '0px',
    maxHeight: '380px',
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy fetch full document content if not present in memory
  useEffect(() => {
    if (doc) {
      if (doc.content_json) {
        setFullContent(doc.content_json);
      } else {
        let isCurrent = true;
        getDocumentById(doc.id).then((fullDoc) => {
          if (isCurrent && fullDoc?.content_json) {
            setFullContent(fullDoc.content_json);
          }
        });
        return () => {
          isCurrent = false;
        };
      }
    } else {
      setFullContent('');
    }
  }, [doc]);

  // Compute collision-free viewport placement that sits snug against the wikilink
  useLayoutEffect(() => {
    const popoverWidth = 480;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = anchorRect.left;
    if (left + popoverWidth > viewportWidth - 16) {
      left = Math.max(16, viewportWidth - 16 - popoverWidth);
    }
    if (left < 16) {
      left = 16;
    }

    const spaceBelow = viewportHeight - anchorRect.bottom - margin - 16;
    const spaceAbove = anchorRect.top - margin - 16;

    // Prefer below if there's comfortable space (at least 220px) or more space than above
    const isBelow = spaceBelow >= 220 || (spaceBelow >= spaceAbove && spaceBelow >= 120);

    if (isBelow) {
      setPlacementStyle({
        top: `${Math.round(anchorRect.bottom + margin)}px`,
        bottom: 'auto',
        left: `${left}px`,
        maxHeight: `${Math.min(380, Math.max(120, spaceBelow))}px`,
      });
    } else {
      // Snug on top: anchor bottom edge of popover exactly margin pixels above anchorRect.top
      setPlacementStyle({
        top: 'auto',
        bottom: `${Math.round(viewportHeight - anchorRect.top + margin)}px`,
        left: `${left}px`,
        maxHeight: `${Math.min(380, Math.max(120, spaceAbove))}px`,
      });
    }
  }, [anchorRect]);

  const handleOpenNote = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      if (doc) {
        const ws = useWorkspaceStore.getState();
        const ds = useDocumentStore.getState();
        ws.openTab(doc.id, doc.title);
        ds.setActiveDocumentById(doc.id);
        ws.setMainViewMode('document');
      }
    },
    [doc, onClose]
  );

  const handleCreateNote = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      const ds = useDocumentStore.getState();
      const ws = useWorkspaceStore.getState();
      const newDoc = await ds.createNewNote(targetTitle, null, 'base', false);
      if (newDoc) {
        ws.openTab(newDoc.id, newDoc.title);
        ds.setActiveDocumentById(newDoc.id);
        ws.setMainViewMode('document');
      }
    },
    [targetTitle, onClose]
  );

  const cleanDisplayTitle = targetTitle || 'Untitled';

  return createPortal(
    <div
      ref={containerRef}
      data-wikilink-hover-preview="true"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: placementStyle.top,
        bottom: placementStyle.bottom,
        left: placementStyle.left,
        maxHeight: placementStyle.maxHeight,
        width: 'min(480px, calc(100vw - 32px))',
      }}
      className="z-[9999] pointer-events-auto flex flex-col rounded-xl border border-[var(--noether-border-base,#2e2e2e)] bg-[var(--noether-bg-card,#181818)] shadow-[0_16px_40px_rgba(0,0,0,0.65)] overflow-hidden text-left"
    >
      {/* Top-Right Quick Action: Chain Link Button */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1">
        <button
          type="button"
          onClick={handleOpenNote}
          title={doc ? `Open ${doc.title}` : `Open ${cleanDisplayTitle}`}
          className="p-1.5 rounded-md text-[var(--noether-text-muted,#888888)] hover:text-[var(--noether-text-primary,#ffffff)] hover:bg-[var(--noether-bg-card-hover,#252525)] cursor-pointer"
        >
          <Link04Icon size={15} />
        </button>
      </div>

      {doc ? (
        <div
          className="flex-1 overflow-y-auto custom-scrollbar p-3.5 pr-8 relative"
          onClick={(e) => {
            const link = (e.target as HTMLElement).closest('.md-link, .md-wikilink, a');
            if (link) {
              onClose();
            }
          }}
        >
          <DocumentView
            documentId={doc.id}
            content={fullContent}
            isDocBacked={true}
            editable={false}
            compact={true}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--noether-text-muted,#888888)]">
          <div className="font-semibold text-sm text-[var(--noether-text-primary,#eeeeee)] mb-1">
            {cleanDisplayTitle}
          </div>
          <div className="mb-4 text-xs opacity-75">Note not created yet</div>
          <button
            type="button"
            onClick={handleCreateNote}
            className="noether-btn text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
          >
            <FileAddIcon size={14} />
            Create note
          </button>
        </div>
      )}
    </div>,
    document.body
  );
});

WikilinkHoverPreview.displayName = 'WikilinkHoverPreview';
