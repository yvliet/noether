import React, { useState, useCallback } from 'react';
import type { DocumentItem } from '@/types';
import type { CanvasNode } from '../types';
import { CardContentRenderer } from './CardContentRenderer';
import { CardActionPill } from './CardActionPill';

export type ResizeHandleType = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface CanvasCardProps {
  node: CanvasNode;
  doc: DocumentItem | null;
  contentJson?: string;
  isSelected: boolean;
  onSelect: (id: string, e: React.PointerEvent) => void;
  onOpenDoc?: () => void;
  onDelete: (id: string) => void;
  onColorChange?: (id: string, color: string) => void;
  onTextChange?: (id: string, newText: string) => void;
  onResizeStart?: (id: string, e: React.PointerEvent, handle: ResizeHandleType) => void;
  onImageDimensions?: (id: string, naturalWidth: number, naturalHeight: number) => void;
  onTaskToggle?: (nodeId: string, taskText: string, currentChecked: boolean) => void;
}

const LEGACY_DEFAULT_COLORS = new Set([
  '#1a1a1a',
  '#242424',
  '#2a2a2a',
  '#141414',
  '#161616',
  '#181818',
  '#171717',
  '#121212',
]);

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
    onResizeStart,
    onImageDimensions,
    onTaskToggle,
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditingText, setIsEditingText] = useState(false);

    const isDocBacked = Boolean(doc || node.document_id);
    const showOutsideTitle = isDocBacked && node.type !== 'text';

    const cardBg =
      !node.color || LEGACY_DEFAULT_COLORS.has(node.color.toLowerCase())
        ? '#1e1e1e'
        : node.color;

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (
          (e.target as HTMLElement).closest(
            'button, textarea, input, a, .resize-handle, img, .md-wikilink, [data-interactive]'
          )
        ) {
          return;
        }
        onSelect(node.id, e);
      },
      [node.id, onSelect]
    );

    const handleDoubleClick = useCallback(() => {
      if (isDocBacked && onOpenDoc) {
        onOpenDoc();
      } else if (node.type === 'text') {
        setIsEditingText(true);
      }
    }, [isDocBacked, onOpenDoc, node.type]);

    return (
      <div
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        style={{
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          backgroundColor: cardBg,
        }}
        className={`canvas-card absolute pointer-events-auto rounded-md flex flex-col border transition-none ${
          isSelected
            ? 'border-[#888888] ring-1 ring-[#666666] shadow-[0_0_18px_rgba(255,255,255,0.06),0_0_24px_rgba(0,0,0,0.45)] z-20'
            : 'border-[#2c2c2c] hover:border-[#444444] shadow-[0_0_14px_rgba(0,0,0,0.35)] hover:shadow-[0_0_18px_rgba(0,0,0,0.45)] z-10'
        }`}
      >
        {/* Floating Outside Title (Matching Target img1) */}
        {showOutsideTitle && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDoc?.();
            }}
            title={doc?.title || 'Open note'}
            className="absolute bottom-full left-0 mb-1.5 max-w-[calc(100%-80px)] truncate text-[12px] font-medium text-[#888888] hover:text-[#e0e0e0] cursor-pointer select-none transition-none"
          >
            {doc?.title || 'Untitled'}
          </div>
        )}

        {/* Floating Contextual Action Pill (Hover / Selected) */}
        {(isSelected || isHovered) && (
          <CardActionPill
            onDelete={() => onDelete(node.id)}
            onOpenDoc={isDocBacked ? onOpenDoc : undefined}
            onColorChange={onColorChange ? (c) => onColorChange(node.id, c) : undefined}
            isDocBacked={isDocBacked}
          />
        )}

        {/* Card Body - Content Renderer */}
        <div className="flex-1 w-full h-full min-h-0 overflow-hidden rounded-md">
          <CardContentRenderer
            node={node}
            doc={doc}
            contentJson={contentJson}
            isEditingText={isEditingText}
            onTextChange={(val) => onTextChange?.(node.id, val)}
            onTextBlur={() => setIsEditingText(false)}
            onImageDimensions={onImageDimensions ? (w, h) => onImageDimensions(node.id, w, h) : undefined}
            onTaskToggle={onTaskToggle ? (txt, chk) => onTaskToggle(node.id, txt, chk) : undefined}
          />
        </div>

        {/* Interactive 8-Directional Resize Handles (Available on hover and when selected) */}
        {onResizeStart && (
          <div className={isSelected || isHovered ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}>
            {/* North (Top edge) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'n');
              }}
              title="Resize vertically"
              className="resize-handle absolute -top-1.5 left-2 right-2 h-3 cursor-ns-resize z-30 pointer-events-auto"
            />

            {/* South (Bottom edge) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 's');
              }}
              title="Resize vertically"
              className="resize-handle absolute -bottom-1.5 left-2 right-2 h-3 cursor-ns-resize z-30 pointer-events-auto"
            />

            {/* East (Right edge) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'e');
              }}
              title="Resize horizontally"
              className="resize-handle absolute top-2 -right-1.5 bottom-2 w-3 cursor-ew-resize z-30 pointer-events-auto"
            />

            {/* West (Left edge) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'w');
              }}
              title="Resize horizontally"
              className="resize-handle absolute top-2 -left-1.5 bottom-2 w-3 cursor-ew-resize z-30 pointer-events-auto"
            />

            {/* North-West (Top-Left corner) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'nw');
              }}
              title="Resize diagonally"
              className="resize-handle absolute -top-2 -left-2 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto"
            />

            {/* North-East (Top-Right corner) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'ne');
              }}
              title="Resize diagonally"
              className="resize-handle absolute -top-2 -right-2 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto"
            />

            {/* South-West (Bottom-Left corner) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'sw');
              }}
              title="Resize diagonally"
              className="resize-handle absolute -bottom-2 -left-2 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto"
            />

            {/* South-East (Bottom-Right corner) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'se');
              }}
              title="Resize diagonally"
              className="resize-handle absolute -bottom-2 -right-2 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto"
            />
          </div>
        )}
      </div>
    );
  }
);
