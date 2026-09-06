/**
 * @module SketchSubheaderButton
 * @description
 * Quick-action toolbar button mounted in the document subheader next to the
 * Reading/Editing view toggle. Follows Flint's native desktop geometry and palette.
 */

import React, { useEffect } from 'react';
import { useSketchStore } from './sketchStore';
import { PaintBoardIcon } from '@/components/common/Icons';
import type { PortalSlotContext } from '@/core/extensions/types';

interface SketchSubheaderButtonProps {
  context: PortalSlotContext;
}

export const SketchSubheaderButton: React.FC<SketchSubheaderButtonProps> = React.memo(({ context }) => {
  const documentId = context.documentId;
  const isSketchingActive = useSketchStore((s) => s.isSketchingActive);
  const toggleSketching = useSketchStore((s) => s.toggleSketching);
  const loadDocument = useSketchStore((s) => s.loadDocument);
  const strokes = useSketchStore((s) => s.strokes);

  // Synchronize active note with sketch store
  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
    }
  }, [documentId, loadDocument]);

  if (!documentId) return null;

  const hasStrokes = strokes && strokes.length > 0;

  return (
    <button
      type="button"
      onClick={toggleSketching}
      title={
        isSketchingActive
          ? 'Close Sketch overlay (Ctrl+Shift+S)'
          : hasStrokes
          ? 'Sketch overlay active - Click to edit (Ctrl+Shift+S)'
          : 'Draw on note (Ctrl+Shift+S)'
      }
      className={`relative p-1 rounded cursor-pointer ${
        isSketchingActive
          ? 'text-white bg-[#282828]'
          : hasStrokes
          ? 'text-[#38bdf8] hover:text-[#7dd3fc] hover:bg-[#222]'
          : 'text-[#777] hover:text-[#dcddde] hover:bg-[#222]'
      }`}
    >
      <PaintBoardIcon size={14} />
      {/* Subtle indicator dot when strokes exist on this note */}
      {hasStrokes && !isSketchingActive && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#38bdf8] pointer-events-none" />
      )}
    </button>
  );
});
