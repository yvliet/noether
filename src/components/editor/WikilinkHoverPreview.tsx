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
  onMouseLeave?: (e: React.MouseEvent) => void;
}

export function isExternalUrlTarget(target?: string | null): boolean {
  if (!target) return false;
  const trimmed = target.trim();
  return (
    /^(https?|mailto|ftp|file|data|blob):/i.test(trimmed) ||
    trimmed.startsWith('www.') ||
    trimmed.includes('://')
  );
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
  if (!targetTitle || isExternalUrlTarget(targetTitle) || isExternalUrlTarget(rawTarget)) {
    return { doc: null, targetTitle: '', headingPart: null };
  }

  let notePart = targetTitle;
  let headingPart: string | null = null;
  if (targetTitle.includes('#')) {
    const parts = targetTitle.split('#');
    notePart = parts[0].trim();
    headingPart = parts.slice(1).join('#').trim();
  }

  if (!notePart || isExternalUrlTarget(notePart)) {
    return { doc: null, targetTitle: '', headingPart: null };
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

/**
 * Recursively inspects TipTap AST nodes to determine if any meaningful text,
 * media, code, math, or interactive block content exists.
 */
function hasMeaningfulTipTapContent(nodes: any[]): boolean {
  if (!Array.isArray(nodes) || nodes.length === 0) return false;

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;

    // Non-empty text node
    if (node.type === 'text') {
      if (typeof node.text === 'string' && node.text.trim().length > 0) {
        return true;
      }
      continue;
    }

    // Media and block content elements that represent meaningful visual content
    if (
      node.type === 'image' ||
      node.type === 'horizontalRule' ||
      node.type === 'mathChip' ||
      node.type === 'iconChip' ||
      node.type === 'icon' ||
      node.type === 'embed' ||
      node.type === 'table' ||
      node.type === 'drawio'
    ) {
      if (node.type === 'image' && !node.attrs?.src) continue;
      if (node.type === 'mathChip' && !node.attrs?.latex?.trim()) continue;
      return true;
    }

    // Recursive search in child content containers (e.g. headings, blockquotes, lists, tables)
    if (Array.isArray(node.content) && node.content.length > 0) {
      if (hasMeaningfulTipTapContent(node.content)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether a document's content is empty (contains no text, media, or visual elements).
 */
export function isDocumentContentEmpty(contentJson?: string | null, docType?: string): boolean {
  if (!contentJson) return true;
  const trimmed = contentJson.trim();
  if (!trimmed || trimmed === '{}' || trimmed === '[]') return true;

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return true;

    // 1. Canvas document check
    if (docType === 'canvas' || Array.isArray(parsed.nodes)) {
      return !Array.isArray(parsed.nodes) || parsed.nodes.length === 0;
    }

    // 2. TipTap AST doc check
    if (parsed.type === 'doc') {
      if (!Array.isArray(parsed.content) || parsed.content.length === 0) {
        return true;
      }
      return !hasMeaningfulTipTapContent(parsed.content);
    }

    return Object.keys(parsed).length === 0;
  } catch {
    // 3. Raw markdown / plaintext fallback: strip frontmatter and check text length
    let bodyText = trimmed;
    if (bodyText.startsWith('---')) {
      const match = bodyText.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
      if (match) bodyText = match[1];
    }
    return bodyText.trim().length === 0;
  }
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

  const [fullContent, setFullContent] = useState<string | null>(() => {
    return doc?.content_json || null;
  });
  const [hasLoaded, setHasLoaded] = useState<boolean>(() => Boolean(doc?.content_json));
  const [placementStyle, setPlacementStyle] = useState<{
    top: string;
    bottom: string;
    left: string;
    maxHeight: string;
    isBelow: boolean;
  }>({
    top: '0px',
    bottom: 'auto',
    left: '0px',
    maxHeight: '380px',
    isBelow: true,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy fetch full document content if not present in memory
  useEffect(() => {
    if (doc) {
      if (doc.content_json) {
        setFullContent(doc.content_json);
        setHasLoaded(true);
      } else {
        let isCurrent = true;
        getDocumentById(doc.id).then((fullDoc) => {
          if (isCurrent) {
            setFullContent(fullDoc?.content_json || '');
            setHasLoaded(true);
          }
        });
        return () => {
          isCurrent = false;
        };
      }
    } else {
      setFullContent('');
      setHasLoaded(true);
    }
  }, [doc]);

  // Determine if the linked note is completely empty
  const isEmptyNote = useMemo(() => {
    if (!doc) return false;
    if (!hasLoaded) return false;
    return isDocumentContentEmpty(fullContent, doc.doc_type);
  }, [doc, hasLoaded, fullContent]);

  // Automatically dismiss hover preview if the target is an external URL or empty note
  useEffect(() => {
    if (isExternalUrlTarget(target) || isEmptyNote) {
      onClose();
    }
  }, [target, isEmptyNote, onClose]);

  if (isExternalUrlTarget(target)) {
    return null;
  }

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
        isBelow: true,
      });
    } else {
      // Snug on top: anchor bottom edge of popover exactly margin pixels above anchorRect.top
      setPlacementStyle({
        top: 'auto',
        bottom: `${Math.round(viewportHeight - anchorRect.top + margin)}px`,
        left: `${left}px`,
        maxHeight: `${Math.min(380, Math.max(120, spaceAbove))}px`,
        isBelow: false,
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

  // Suppress preview completely if target note is empty or still hydrating from SQLite
  if (doc && (!hasLoaded || isEmptyNote)) {
    return null;
  }

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
      className="z-[9999] pointer-events-auto flex flex-col text-left"
    >
      {/* Invisible bridging safe-zone spanning the 8px gap between the link and the popover */}
      <div
        data-wikilink-hover-bridge="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '10px',
          top: placementStyle.isBelow ? '-10px' : 'auto',
          bottom: placementStyle.isBelow ? 'auto' : '-10px',
          background: 'transparent',
          pointerEvents: 'auto',
        }}
      />

      {/* Visual popover card */}
      <div className="relative flex flex-col w-full h-full rounded-xl border border-[var(--noether-border-base,#2e2e2e)] bg-[var(--noether-bg-card,#181818)] shadow-[0_16px_40px_rgba(0,0,0,0.65)] overflow-hidden">
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
              content={fullContent || ''}
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
      </div>
    </div>,
    document.body
  );
});

WikilinkHoverPreview.displayName = 'WikilinkHoverPreview';
