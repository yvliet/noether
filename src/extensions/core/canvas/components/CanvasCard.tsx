import React, { useState, useCallback, useMemo } from 'react';
import type { DocumentItem } from '@/types';
import type { CanvasNode, CanvasNodeSide } from '../types';
import {
  CardContentRenderer,
  isImageDocument,
  isAudioDocument,
  isVideoDocument,
  isPdfDocument,
} from './CardContentRenderer';
import { CardActionPill } from './CardActionPill';
import { resolveCardColorTheme } from './cardColors';

export type ResizeHandleType = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface CanvasCardProps {
  node: CanvasNode;
  doc: DocumentItem | null;
  contentJson?: string;
  isSelected: boolean;
  onSelect: (id: string, e: React.PointerEvent) => void;
  onOpenDoc?: (docId?: string) => void;
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
}

export const CanvasCard: React.FC<CanvasCardProps> = React.memo(
  ({
    node,
    doc,
    contentJson,
    isSelected,
    onSelect,
    onOpenDoc,
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
  }) => {
    const isPanActive = isPanModifier || isSpacePressed;
    const [isHovered, setIsHovered] = useState(false);
    const [hoveredSide, setHoveredSide] = useState<CanvasNodeSide | null>(null);
    const [isEditingText, setIsEditingText] = useState(false);
    const isDraggable = !isReadOnly && !isEditingText;

    const isDocBacked = Boolean(doc || node.document_id);
    const showOutsideTitle = isDocBacked && node.type !== 'text';
    const isMediaDoc =
      isImageDocument(doc) || isAudioDocument(doc) || isVideoDocument(doc) || isPdfDocument(doc);
    const canEdit = !isReadOnly && (node.type === 'text' || isDocBacked) && !isMediaDoc && node.type !== 'link';

    const colorTheme = useMemo(() => resolveCardColorTheme(node.color), [node.color]);

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
        if (isReadOnly || isPanActive || isPanning || isDragging || isEditingText || isDraftingArrow) {
          if (hoveredSide !== null) setHoveredSide(null);
          return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const w = rect.width;
        const h = rect.height;

        const edgeThreshold = 36;
        const cornerThreshold = 28;

        let nextSide: CanvasNodeSide | null = null;

        if (relY <= edgeThreshold && relX >= cornerThreshold && relX <= w - cornerThreshold) {
          nextSide = 'top';
        } else if (relY >= h - edgeThreshold && relX >= cornerThreshold && relX <= w - cornerThreshold) {
          nextSide = 'bottom';
        } else if (relX <= edgeThreshold && relY >= cornerThreshold && relY <= h - cornerThreshold) {
          nextSide = 'left';
        } else if (relX >= w - edgeThreshold && relY >= cornerThreshold && relY <= h - cornerThreshold) {
          nextSide = 'right';
        }

        if (nextSide !== hoveredSide) {
          setHoveredSide(nextSide);
        }
      },
      [isReadOnly, isPanActive, isPanning, isDragging, isEditingText, isDraftingArrow, hoveredSide]
    );

    return (
      <div
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
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
          boxShadow: isSelected
            ? colorTheme.shadowActive
            : isHovered
            ? colorTheme.id !== 'default'
              ? `0 0 16px ${colorTheme.borderIdle}, 0 0 20px rgba(0,0,0,0.45)`
              : '0 0 16px rgba(0,0,0,0.45)'
            : '0 0 14px rgba(0,0,0,0.35)',
        }}
        className={`canvas-card absolute pointer-events-auto rounded-md flex flex-col border transition-none ${
          isSelected ? 'z-20 ring-1' : 'z-10'
        } ${
          isPanning || isDragging
            ? 'cursor-grabbing'
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
            title={doc?.title || 'Open note'}
            className={`absolute bottom-full left-0 mb-1.5 max-w-[calc(100%-80px)] truncate text-[12px] font-medium text-[#888888] hover:text-[#e0e0e0] select-none transition-none ${
              isPanActive || isPanning ? 'pointer-events-none' : 'cursor-pointer'
            }`}
          >
            {doc?.title || 'Untitled'}
          </div>
        )}

        {/* Floating Contextual Action Pill (Hover / Selected) */}
        {!isReadOnly && !isPanActive && !isPanning && !isDragging && (isSelected || isHovered) && (
          <CardActionPill
            onDelete={() => onDelete(node.id)}
            onOpenDoc={isDocBacked && onOpenDoc ? () => onOpenDoc(node.document_id) : undefined}
            onColorChange={onColorChange ? (c) => onColorChange(node.id, c) : undefined}
            currentColor={node.color}
            onEdit={canEdit ? () => setIsEditingText(true) : undefined}
            isDocBacked={isDocBacked}
          />
        )}

        {/* Card Body - Content Renderer */}
        <div className={`flex-1 w-full h-full min-h-0 overflow-hidden rounded-md ${
          isPanActive || isPanning || isDragging ? 'pointer-events-none' : ''
        } ${
          isDraggable
            ? 'cursor-grab active:cursor-grabbing [&_.flint-compact-doc]:!cursor-grab [&_.flint-compact-doc]:active:!cursor-grabbing [&_.tiptap-reading-view]:!cursor-grab [&_.tiptap-reading-view]:active:!cursor-grabbing [&_.ProseMirror]:!cursor-grab [&_.ProseMirror]:active:!cursor-grabbing [&_img]:!cursor-grab [&_img]:active:!cursor-grabbing [&_a]:!cursor-pointer [&_button]:!cursor-pointer'
            : ''
        }`}>
          <CardContentRenderer
            node={node}
            doc={doc}
            contentJson={contentJson}
            isEditingText={isEditingText}
            onTextChange={(val) => onTextChange?.(node.id, val)}
            onDocContentChange={onDocContentChange}
            onTextBlur={() => setIsEditingText(false)}
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
        {!isReadOnly && !isPanActive && !isPanning && !isDragging && !isEditingText && !isDraftingArrow && onSideDotPointerDown && (
          <>
            {/* North (Top Side) */}
            <div
              data-canvas-side="top"
              style={{ zIndex: 60 }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSideDotPointerDown(node.id, 'top', e);
              }}
              className={`canvas-side-dot absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#1e1e1e] shadow-md transition-none select-none cursor-crosshair ${
                hoveredSide === 'top' && activeSnapSide !== 'top'
                  ? 'bg-[#e0e0e0] hover:bg-white hover:scale-125 opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* South (Bottom Side) */}
            <div
              data-canvas-side="bottom"
              style={{ zIndex: 60 }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSideDotPointerDown(node.id, 'bottom', e);
              }}
              className={`canvas-side-dot absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#1e1e1e] shadow-md transition-none select-none cursor-crosshair ${
                hoveredSide === 'bottom' && activeSnapSide !== 'bottom'
                  ? 'bg-[#e0e0e0] hover:bg-white hover:scale-125 opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* West (Left Side) */}
            <div
              data-canvas-side="left"
              style={{ zIndex: 60 }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSideDotPointerDown(node.id, 'left', e);
              }}
              className={`canvas-side-dot absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#1e1e1e] shadow-md transition-none select-none cursor-crosshair ${
                hoveredSide === 'left' && activeSnapSide !== 'left'
                  ? 'bg-[#e0e0e0] hover:bg-white hover:scale-125 opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            />

            {/* East (Right Side) */}
            <div
              data-canvas-side="right"
              style={{ zIndex: 60 }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSideDotPointerDown(node.id, 'right', e);
              }}
              className={`canvas-side-dot absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#1e1e1e] shadow-md transition-none select-none cursor-crosshair ${
                hoveredSide === 'right' && activeSnapSide !== 'right'
                  ? 'bg-[#e0e0e0] hover:bg-white hover:scale-125 opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            />
          </>
        )}
      </div>
    );
  }
);
