import React, { useLayoutEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DocNode } from '../../types';
import { Link04Icon } from '../common/Icons';
import { DocsMarkdownView } from './DocsMarkdownView';

export interface WikilinkHoverPreviewProps {
  targetDoc: DocNode | null;
  targetTitle: string;
  anchorRect: DOMRect;
  onSelectDoc: (doc: DocNode) => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onFindDoc?: (target: string) => DocNode | null;
}

export const WikilinkHoverPreview: React.FC<WikilinkHoverPreviewProps> = React.memo(({
  targetDoc,
  targetTitle,
  anchorRect,
  onSelectDoc,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onFindDoc,
}) => {
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

  const handleOpenDoc = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      if (targetDoc) {
        onSelectDoc(targetDoc);
      }
    },
    [targetDoc, onSelectDoc, onClose]
  );

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a.internal-link');
      if (link) {
        e.preventDefault();
        e.stopPropagation();
        const rawTarget = link.getAttribute('data-wikilink');
        if (rawTarget && onFindDoc) {
          const docTarget = rawTarget.split('#')[0];
          const match = onFindDoc(docTarget);
          if (match) {
            onClose();
            onSelectDoc(match);
          }
        }
      }
    },
    [onFindDoc, onSelectDoc, onClose]
  );

  const cleanDisplayTitle = targetDoc?.title || targetTitle || 'Untitled';

  // Suppress preview completely if target doc exists but has no content
  if (targetDoc && (!targetDoc.content || !targetDoc.content.trim())) {
    return null;
  }

  return createPortal(
    <div
      ref={containerRef}
      data-wikilink-hover-preview="true"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleContainerClick}
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
      <div className="relative flex flex-col w-full h-full rounded-xl border border-[#2e2e2e] bg-[#161616] shadow-[0_16px_40px_rgba(0,0,0,0.65)] overflow-hidden">
        {/* Top-Right Quick Action: Chain Link Button (matching Copy Link to Section) */}
        {targetDoc && (
          <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1">
            <button
              type="button"
              onClick={handleOpenDoc}
              data-tooltip={`Open ${cleanDisplayTitle}`}
              data-tooltip-position="bottom"
              className="p-1.5 rounded-md text-[#888888] hover:text-[#ffffff] hover:bg-[#252525] cursor-pointer"
            >
              <Link04Icon size={16} />
            </button>
          </div>
        )}

        {targetDoc ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pr-11 pb-7 relative">
            <DocsMarkdownView
              content={targetDoc.content || ''}
              docId={targetDoc.id}
              docSlug={targetDoc.slug}
              compact={true}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-[#888888]">
            <div className="font-semibold text-sm text-[#eeeeee] mb-1">
              {cleanDisplayTitle}
            </div>
            <div className="text-xs opacity-75">Documentation page not found</div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});

WikilinkHoverPreview.displayName = 'WikilinkHoverPreview';

