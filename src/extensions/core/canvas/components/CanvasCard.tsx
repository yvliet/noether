import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { DocumentItem } from '@/types';
import type { CanvasNode, CanvasNodeSide } from '../types';
import {
  CardContentRenderer,
  isImageDocument,
  isAudioDocument,
  isVideoDocument,
  isPdfDocument,
} from './CardContentRenderer';
import { CardActionPill, computePillScale } from './CardActionPill';
import { resolveCardColorTheme } from './cardColors';

export type ResizeHandleType = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface CanvasCardProps {
  node: CanvasNode;
  doc: DocumentItem | null;
  contentJson?: string;
  isSelected: boolean;
  onSelect: (id: string, e: React.PointerEvent) => void;
  onOpenDoc?: (docId?: string) => void;
  onFitToCenter?: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange?: (id: string, color: string) => void;
  onTextChange?: (id: string, newText: string) => void;
  onDocContentChange?: (docId: string, newContent: string) => void;
  onResizeStart?: (id: string, e: React.PointerEvent, handle: ResizeHandleType) => void;
  onImageDimensions?: (id: string, naturalWidth: number, naturalHeight: number) => void;
  onTaskToggle?: (nodeId: string, taskText: string, currentChecked: boolean) => void;
  onSideDotPointerDown?: (nodeId: string, side: CanvasNodeSide, e: React.PointerEvent) => void;
  activeSnapSide?: CanvasNodeSide | null;
  isDraftingArrow?: boolean;
  isSpacePressed?: boolean;
  isPanModifier?: boolean;
  isPanning?: boolean;
  isDragging?: boolean;
  isReadOnly?: boolean;
  zoom?: number;
  autoFocus?: boolean;
  onAutoFocusConsumed?: () => void;
  isMultiSelected?: boolean;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
}

export const CanvasCard: React.FC<CanvasCardProps> = React.memo(
  ({
    node,
    doc,
    contentJson,
    isSelected,
    onSelect,
    onOpenDoc,
    onFitToCenter,
    onDelete,
    onColorChange,
    onTextChange,
    onDocContentChange,
    onResizeStart,
    onImageDimensions,
    onTaskToggle,
    onSideDotPointerDown,
    activeSnapSide = null,
    isDraftingArrow = false,
    isSpacePressed = false,
    isPanModifier = false,
    isPanning = false,
    isDragging = false,
    isReadOnly = false,
    zoom = 1,
    autoFocus = false,
    onAutoFocusConsumed,
    isMultiSelected = false,
    onContextMenu,
  }) => {
    const isPanActive = isPanModifier || isSpacePressed;
    const [isHovered, setIsHovered] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const [hoveredSide, setHoveredSide] = useState<CanvasNodeSide | null>(null);

    const isDocBacked = Boolean(doc || node.document_id);
    const showOutsideTitle = isDocBacked && node.type !== 'text';
    const isMediaDoc =
      isImageDocument(doc) || isAudioDocument(doc) || isVideoDocument(doc) || isPdfDocument(doc);
    const canEdit = !isReadOnly && (node.type === 'text' || isDocBacked) && !isMediaDoc && node.type !== 'link';

    const [isEditingText, setIsEditingText] = useState(Boolean(autoFocus && canEdit));
    const isDraggable = !isReadOnly && !isEditingText;

    useEffect(() => {
      if (autoFocus && canEdit) {
        setIsEditingText(true);
        onAutoFocusConsumed?.();
      }
    }, [autoFocus, canEdit, onAutoFocusConsumed]);

    // Synchronize text editing state when card deselected
    useEffect(() => {
      if (!isSelected && isEditingText) {
        setIsEditingText(false);
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          sel.removeAllRanges();
        }
      }
    }, [isSelected, isEditingText]);

    // Handle outside clicks: clear text selection and exit editing mode if pointer down occurs outside this card
    useEffect(() => {
      const handleGlobalPointerDown = (e: PointerEvent) => {
        if (!cardRef.current) return;
        if (!cardRef.current.contains(e.target as Node)) {
          if (isEditingText) {
            setIsEditingText(false);
          }
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            try {
              const range = selection.getRangeAt(0);
              if (
                cardRef.current.contains(range.startContainer) ||
                cardRef.current.contains(range.endContainer) ||
                cardRef.current.contains(range.commonAncestorContainer)
              ) {
                selection.removeAllRanges();
              }
            } catch {
              selection.removeAllRanges();
            }
          }
          if (document.activeElement && cardRef.current.contains(document.activeElement)) {
            (document.activeElement as HTMLElement).blur();
          }
        }
      };

      window.addEventListener('pointerdown', handleGlobalPointerDown, true);
      return () => {
        window.removeEventListener('pointerdown', handleGlobalPointerDown, true);
      };
    }, [isEditingText]);

    const colorTheme = useMemo(() => resolveCardColorTheme(node.color), [node.color]);
    const dotScale = computePillScale(zoom);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (
          (e.target as HTMLElement).closest(
            `button, textarea, input, a, .resize-handle, .md-wikilink, [data-interactive], .canvas-side-dot${
              isEditingText ? ', .ProseMirror, [contenteditable="true"]' : ''
            }`
          )
        ) {
          return;
        }
        if (isEditingText) {
          setIsEditingText(false);
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            sel.removeAllRanges();
          }
        }
        onSelect(node.id, e);
      },
      [isEditingText, node.id, onSelect]
    );

    const handleDoubleClick = useCallback(() => {
      // Both regular text cards and doc-backed note cards enter live WYSIWYG editing directly on the canvas
      if (node.type === 'text' || isDocBacked) {
        setIsEditingText(true);
      }
    }, [isDocBacked, node.type]);

    const handleCardPointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (isReadOnly || isDragging || isEditingText || isDraftingArrow) {
          if (hoveredSide !== null) setHoveredSide(null);
          return;
        }

        // Maintain active side if cursor is directly over any side connection dot to prevent flashing
        const targetDot = (e.target as HTMLElement).closest<HTMLElement>('.canvas-side-dot');
        if (targetDot) {
          const side = targetDot.getAttribute('data-canvas-side') as CanvasNodeSide | null;
          if (side) {
            if (side !== hoveredSide) setHoveredSide(side);
            return;
          }
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        // Dynamic edge and corner thresholds adapted to card screen dimensions so zones never collapse
        const cornerThreshold = Math.min(28, Math.max(6, Math.min(w, h) * 0.2));
        const baseEdgeThreshold = Math.min(36, Math.max(12, Math.min(w, h) * 0.35));

        // Hysteresis: keep active hovered side if cursor is within slightly extended boundary
        const hysteresis = hoveredSide ? 14 : 0;
        const edgeThreshold = baseEdgeThreshold + hysteresis;

        let nextSide: CanvasNodeSide | null = null;

        if (relY <= edgeThreshold && relX >= cornerThreshold - hysteresis && relX <= w - cornerThreshold + hysteresis) {
          nextSide = 'top';
        } else if (relY >= h - edgeThreshold && relX >= cornerThreshold - hysteresis && relX <= w - cornerThreshold + hysteresis) {
          nextSide = 'bottom';
        } else if (relX <= edgeThreshold && relY >= cornerThreshold - hysteresis && relY <= h - cornerThreshold + hysteresis) {
          nextSide = 'left';
        } else if (relX >= w - edgeThreshold && relY >= cornerThreshold - hysteresis && relY <= h - cornerThreshold + hysteresis) {
          nextSide = 'right';
        }

        if (nextSide !== hoveredSide) {
          setHoveredSide(nextSide);
        }
      },
      [isReadOnly, isDragging, isEditingText, isDraftingArrow, hoveredSide]
    );

    return (
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(node.id, e);
        }}
        onPointerEnter={() => setIsHovered(true)}
        onPointerMove={handleCardPointerMove}
        onPointerLeave={() => {
          setIsHovered(false);
          setHoveredSide(null);
        }}
        style={{
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          backgroundColor: colorTheme.bg,
          borderColor: isSelected
            ? colorTheme.borderActive
            : isHovered
            ? colorTheme.borderHover
            : colorTheme.borderIdle,
        }}
        className={`canvas-card absolute pointer-events-auto rounded-md flex flex-col border transition-none ${
          isSelected ? 'z-20' : 'z-10'
        } ${
          isPanning || isDragging
            ? '!cursor-grabbing [&_*]:!cursor-grabbing'
            : isPanActive
            ? 'cursor-grab'
            : isDraggable
            ? 'cursor-grab active:cursor-grabbing'
            : isReadOnly
            ? 'cursor-default'
            : ''
        }`}
      >
        {/* Floating Outside Title (Matching Target img1) */}
        {showOutsideTitle && (
          <div
            onPointerDown={(e) => {
              if (isPanActive || isPanning) return;
              e.stopPropagation();
            }}
            onClick={(e) => {
              if (isPanActive || isPanning) return;
              e.stopPropagation();
              onOpenDoc?.(node.document_id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContextMenu?.(node.id, e);
            }}
            title={doc?.title || 'Open note'}
            className={`absolute bottom-full left-0 mb-2 ${
              isSelected ? 'max-w-none whitespace-nowrap' : 'max-w-full truncate'
            } text-[14px] font-medium text-[#888888] hover:text-[#e0e0e0] select-none transition-none ${
              isPanActive || isPanning ? 'pointer-events-none' : 'cursor-pointer'
            }`}
          >
            {doc?.title || 'Untitled'}
          </div>
        )}

        {/* Floating Contextual Action Pill (Hover / Selected) */}
        {!isReadOnly && !isDragging && !isMultiSelected && (isSelected || isHovered) && (
          <CardActionPill
            onDelete={() => onDelete(node.id)}
            onOpenDoc={isDocBacked && onOpenDoc ? () => onOpenDoc(node.document_id) : undefined}
            onFitToCenter={onFitToCenter ? () => onFitToCenter(node.id) : undefined}
            onColorChange={onColorChange ? (c) => onColorChange(node.id, c) : undefined}
            currentColor={node.color}
            onEdit={canEdit ? () => setIsEditingText(true) : undefined}
            isDocBacked={isDocBacked}
            zoom={zoom}
          />
        )}

        {/* Card Body - Content Renderer */}
        <div className={`flex-1 w-full h-full min-h-0 overflow-hidden rounded-md ${
          isPanActive || isPanning || isDragging ? 'pointer-events-none' : ''
        } ${
          isDraggable
            ? 'cursor-grab active:cursor-grabbing [&_.noether-compact-doc]:!cursor-grab [&_.noether-compact-doc]:active:!cursor-grabbing [&_.tiptap-reading-view]:!cursor-grab [&_.tiptap-reading-view]:active:!cursor-grabbing [&_.ProseMirror]:!cursor-grab [&_.ProseMirror]:active:!cursor-grabbing [&_img]:!cursor-grab [&_img]:active:!cursor-grabbing [&_a]:!cursor-pointer [&_button]:!cursor-pointer'
            : ''
        }`}>
          <CardContentRenderer
            node={node}
            doc={doc}
            contentJson={contentJson}
            isEditingText={isEditingText}
            onTextChange={(val) => onTextChange?.(node.id, val)}
            onDocContentChange={onDocContentChange}
            onTextBlur={() => {
              setIsEditingText(false);
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                sel.removeAllRanges();
              }
            }}
            onImageDimensions={onImageDimensions ? (w, h) => onImageDimensions(node.id, w, h) : undefined}
            onTaskToggle={onTaskToggle ? (txt, chk) => onTaskToggle(node.id, txt, chk) : undefined}
          />
        </div>

        {/* Interactive 8-Directional Resize Handles (Available on hover and when selected) */}
        {!isReadOnly && onResizeStart && (
          <div className={!isPanActive && !isPanning && !isDragging && (isSelected || isHovered) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}>
            {/* North (Top edge) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'n');
              }}
              onPointerEnter={() => setHoveredSide('top')}
              title="Resize vertically"
              className="resize-handle absolute -top-2 left-3 right-3 h-4 cursor-ns-resize z-20 pointer-events-auto"
            />

            {/* South (Bottom edge) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 's');
              }}
              onPointerEnter={() => setHoveredSide('bottom')}
              title="Resize vertically"
              className="resize-handle absolute -bottom-2 left-3 right-3 h-4 cursor-ns-resize z-20 pointer-events-auto"
            />

            {/* East (Right edge) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'e');
              }}
              onPointerEnter={() => setHoveredSide('right')}
              title="Resize horizontally"
              className="resize-handle absolute top-3 -right-2 bottom-3 w-4 cursor-ew-resize z-20 pointer-events-auto"
            />

            {/* West (Left edge) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'w');
              }}
              onPointerEnter={() => setHoveredSide('left')}
              title="Resize horizontally"
              className="resize-handle absolute top-3 -left-2 bottom-3 w-4 cursor-ew-resize z-20 pointer-events-auto"
            />

            {/* North-West (Top-Left corner) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'nw');
              }}
              onPointerEnter={() => setHoveredSide(null)}
              title="Resize diagonally"
              className="resize-handle absolute -top-2 -left-2 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto"
            />

            {/* North-East (Top-Right corner) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'ne');
              }}
              onPointerEnter={() => setHoveredSide(null)}
              title="Resize diagonally"
              className="resize-handle absolute -top-2 -right-2 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto"
            />

            {/* South-West (Bottom-Left corner) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'sw');
              }}
              onPointerEnter={() => setHoveredSide(null)}
              title="Resize diagonally"
              className="resize-handle absolute -bottom-2 -left-2 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto"
            />

            {/* South-East (Bottom-Right corner) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'se');
              }}
              onPointerEnter={() => setHoveredSide(null)}
              title="Resize diagonally"
              className="resize-handle absolute -bottom-2 -right-2 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto"
            />
          </div>
        )}

        {/* Interactive Side Connection Anchor Dots (Strictly on-dot trigger, higher priority over Resize Handles) */}
        {!isReadOnly && !isDragging && !isEditingText && !isDraftingArrow && onSideDotPointerDown && (
          <>
            {/* North (Top Side) */}
            <div
              data-canvas-side="top"
              style={{
                zIndex: 60,
                left: '50%',
                top: 0,
                transform: `translate(-50%, -50%) scale(${dotScale})`,
                transformOrigin: 'center center',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSideDotPointerDown(node.id, 'top', e);
              }}
              onPointerEnter={() => setHoveredSide('top')}
              className={`canvas-side-dot absolute w-4 h-4 rounded-full border-2 border-[#1e1e1e] transition-none select-none cursor-pointer ${
                hoveredSide === 'top' && activeSnapSide !== 'top'
                  ? 'bg-[#e0e0e0] hover:bg-white opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* South (Bottom Side) */}
            <div
              data-canvas-side="bottom"
              style={{
                zIndex: 60,
                left: '50%',
                bottom: 0,
                transform: `translate(-50%, 50%) scale(${dotScale})`,
                transformOrigin: 'center center',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSideDotPointerDown(node.id, 'bottom', e);
              }}
              onPointerEnter={() => setHoveredSide('bottom')}
              className={`canvas-side-dot absolute w-4 h-4 rounded-full border-2 border-[#1e1e1e] transition-none select-none cursor-pointer ${
                hoveredSide === 'bottom' && activeSnapSide !== 'bottom'
                  ? 'bg-[#e0e0e0] hover:bg-white opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* West (Left Side) */}
            <div
              data-canvas-side="left"
              style={{
                zIndex: 60,
                left: 0,
                top: '50%',
                transform: `translate(-50%, -50%) scale(${dotScale})`,
                transformOrigin: 'center center',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSideDotPointerDown(node.id, 'left', e);
              }}
              onPointerEnter={() => setHoveredSide('left')}
              className={`canvas-side-dot absolute w-4 h-4 rounded-full border-2 border-[#1e1e1e] transition-none select-none cursor-pointer ${
                hoveredSide === 'left' && activeSnapSide !== 'left'
                  ? 'bg-[#e0e0e0] hover:bg-white opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* East (Right Side) */}
            <div
              data-canvas-side="right"
              style={{
                zIndex: 60,
                right: 0,
                top: '50%',
                transform: `translate(50%, -50%) scale(${dotScale})`,
                transformOrigin: 'center center',
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSideDotPointerDown(node.id, 'right', e);
              }}
              onPointerEnter={() => setHoveredSide('right')}
              className={`canvas-side-dot absolute w-4 h-4 rounded-full border-2 border-[#1e1e1e] transition-none select-none cursor-pointer ${
                hoveredSide === 'right' && activeSnapSide !== 'right'
                  ? 'bg-[#e0e0e0] hover:bg-white opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            />
          </>
        )}
      </div>
    );
  }
);
