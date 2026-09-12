import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { CanvasNode, CanvasNodeSide } from '../types';
import type { ResizeHandleType } from './CanvasCard';
import {
  AlignStartVerticalIcon,
  CenterFocusIcon,
  Delete02Icon,
  PaletteIcon,
  PencilEdit02Icon,
  UngroupIcon,
} from '@/components/common/Icons';
import { InlineColorPicker } from '@/components/common/ColorPicker';
import { CARD_COLOR_PRESETS, resolveCardColorTheme, resolveGroupBackground } from './cardColors';
import { computePillScale } from './CardActionPill';
import { CanvasAlignMenu } from './CanvasAlignMenu';
import type { CanvasAlignmentType } from '../utils/canvasAlignment';

export interface CanvasGroupProps {
  node: CanvasNode;
  isSelected: boolean;
  isMultiSelected?: boolean;
  onSelect: (id: string, e: React.PointerEvent) => void;
  onDelete: (id: string) => void;
  onUngroup?: (id: string) => void;
  onColorChange?: (id: string, color: string) => void;
  onLabelChange?: (id: string, newLabel: string) => void;
  onFitToCenter?: (id: string) => void;
  onAlign?: (groupId: string, type: CanvasAlignmentType) => void;
  onResizeStart?: (id: string, e: React.PointerEvent, handle: ResizeHandleType) => void;
  onSideDotPointerDown?: (nodeId: string, side: CanvasNodeSide, e: React.PointerEvent) => void;
  activeSnapSide?: CanvasNodeSide | null;
  isDraftingArrow?: boolean;
  isSpacePressed?: boolean;
  isPanModifier?: boolean;
  isPanning?: boolean;
  isDragging?: boolean;
  isReadOnly?: boolean;
  zoom?: number;
  depth?: number;
  onContextMenu?: (id: string, e: React.MouseEvent) => void;
}

export const CanvasGroup: React.FC<CanvasGroupProps> = React.memo(
  ({
    node,
    isSelected,
    isMultiSelected = false,
    onSelect,
    onDelete,
    onUngroup,
    onColorChange,
    onLabelChange,
    onFitToCenter,
    onAlign,
    onResizeStart,
    onSideDotPointerDown,
    activeSnapSide = null,
    isDraftingArrow = false,
    isSpacePressed = false,
    isPanModifier = false,
    isPanning = false,
    isDragging = false,
    isReadOnly = false,
    zoom = 1,
    depth = 0,
    onContextMenu,
  }) => {
    const isPanActive = isPanModifier || isSpacePressed;
    const [isHovered, setIsHovered] = useState(false);
    const [hoveredSide, setHoveredSide] = useState<CanvasNodeSide | null>(null);
    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [labelDraft, setLabelDraft] = useState(node.text_content || 'Untitled group');
    const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
    const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);
    const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);

    const groupRef = useRef<HTMLDivElement>(null);
    const labelInputRef = useRef<HTMLInputElement>(null);
    const colorMenuRef = useRef<HTMLDivElement>(null);

    // Keep label draft in sync when node changes from outside
    useEffect(() => {
      setLabelDraft(node.text_content || 'Untitled group');
    }, [node.text_content]);

    // Auto-focus input when label editing starts
    useEffect(() => {
      if (isEditingLabel) {
        labelInputRef.current?.focus();
        labelInputRef.current?.select();
      }
    }, [isEditingLabel]);

    // Close color dropdown on outside click or Escape
    useEffect(() => {
      if (!isColorMenuOpen) return;

      const handleOutside = (e: MouseEvent) => {
        if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
          setIsColorMenuOpen(false);
          setShowAdvancedPicker(false);
        }
      };
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsColorMenuOpen(false);
          setShowAdvancedPicker(false);
        }
      };

      window.addEventListener('mousedown', handleOutside);
      window.addEventListener('keydown', handleKey);
      return () => {
        window.removeEventListener('mousedown', handleOutside);
        window.removeEventListener('keydown', handleKey);
      };
    }, [isColorMenuOpen]);

    const colorTheme = useMemo(() => resolveCardColorTheme(node.color), [node.color]);
    const dotScale = computePillScale(zoom);
    const pillScale = computePillScale(zoom);

    const handleCommitLabel = useCallback(() => {
      setIsEditingLabel(false);
      const trimmed = labelDraft.trim();
      const finalVal = trimmed || 'Untitled group';
      setLabelDraft(finalVal);
      if (finalVal !== node.text_content) {
        onLabelChange?.(node.id, finalVal);
      }
    }, [labelDraft, node.id, node.text_content, onLabelChange]);

    // Auto-commit label when group deselected
    useEffect(() => {
      if (!isSelected && isEditingLabel) {
        handleCommitLabel();
      }
    }, [isSelected, isEditingLabel, handleCommitLabel]);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (
          (e.target as HTMLElement).closest(
            'button, input, textarea, a, .resize-handle, .canvas-side-dot, .group-action-pill, .group-label-input'
          )
        ) {
          return;
        }
        if (isEditingLabel) {
          handleCommitLabel();
        }
        onSelect(node.id, e);
      },
      [handleCommitLabel, isEditingLabel, node.id, onSelect]
    );

    const handleGroupPointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (isReadOnly || isDragging || isEditingLabel || isDraftingArrow) {
          if (hoveredSide !== null) setHoveredSide(null);
          return;
        }

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

        const cornerThreshold = Math.min(32, Math.max(8, Math.min(w, h) * 0.15));
        const baseEdgeThreshold = Math.min(40, Math.max(16, Math.min(w, h) * 0.25));
        const hysteresis = hoveredSide ? 16 : 0;
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
      [isReadOnly, isDragging, isEditingLabel, isDraftingArrow, hoveredSide]
    );

    const borderColor = isSelected
      ? colorTheme.borderActive
      : isHovered
      ? colorTheme.borderHover
      : colorTheme.borderIdle;

    const groupState = isSelected ? 'selected' : isHovered ? 'hover' : 'idle';
    const bgColor = resolveGroupBackground(node.color, groupState);

    return (
      <>
        <div
        ref={groupRef}
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(node.id, e);
        }}
        onPointerEnter={() => setIsHovered(true)}
        onPointerMove={handleGroupPointerMove}
        onPointerLeave={() => {
          setIsHovered(false);
          setHoveredSide(null);
        }}
        style={{
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${node.width}px`,
          height: `${node.height}px`,
          backgroundColor: bgColor,
          borderColor,
          zIndex: 1 + depth * 2,
        }}
        className={`canvas-group absolute pointer-events-auto rounded-md border transition-none select-none ${
          isPanning || isDragging
            ? '!cursor-grabbing'
            : isPanActive
            ? 'cursor-grab'
            : !isReadOnly
            ? 'cursor-grab active:cursor-grabbing'
            : 'cursor-default'
        }`}
      >

        {/* 8-Directional Perimeter Resize Handles */}
        {!isReadOnly && onResizeStart && (
          <div
            className={
              !isPanActive && !isPanning && !isDragging && (isSelected || isHovered)
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            }
          >
            {/* North */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'n');
              }}
              onPointerEnter={() => setHoveredSide('top')}
              className="resize-handle absolute -top-2 left-4 right-4 h-4 cursor-ns-resize z-20 pointer-events-auto"
            />
            {/* South */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 's');
              }}
              onPointerEnter={() => setHoveredSide('bottom')}
              className="resize-handle absolute -bottom-2 left-4 right-4 h-4 cursor-ns-resize z-20 pointer-events-auto"
            />
            {/* East */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'e');
              }}
              onPointerEnter={() => setHoveredSide('right')}
              className="resize-handle absolute top-4 -right-2 bottom-4 w-4 cursor-ew-resize z-20 pointer-events-auto"
            />
            {/* West */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'w');
              }}
              onPointerEnter={() => setHoveredSide('left')}
              className="resize-handle absolute top-4 -left-2 bottom-4 w-4 cursor-ew-resize z-20 pointer-events-auto"
            />
            {/* Corners */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'nw');
              }}
              className="resize-handle absolute -top-2 -left-2 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto"
            />
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'ne');
              }}
              className="resize-handle absolute -top-2 -right-2 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto"
            />
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'sw');
              }}
              className="resize-handle absolute -bottom-2 -left-2 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto"
            />
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeStart(node.id, e, 'se');
              }}
              className="resize-handle absolute -bottom-2 -right-2 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto"
            />
          </div>
        )}

        {/* 4 Interactive Side Connection Dots */}
        {!isReadOnly && !isDragging && !isEditingLabel && !isDraftingArrow && onSideDotPointerDown && (
          <>
            {/* Top Side */}
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

            {/* Bottom Side */}
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

            {/* Left Side */}
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

            {/* Right Side */}
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

        {/* 2. Group Overlay Controls (z-40+ so floating title, action pill, and popovers render ABOVE all cards) */}
        <div
          style={{
            left: `${node.x}px`,
            top: `${node.y}px`,
            width: `${node.width}px`,
            height: 0,
            zIndex: 40 + depth,
          }}
          className="canvas-group-overlay absolute pointer-events-none"
        >
          {/* Group Title / Label (Matching note titles: no background box, transparent inline editing without boxes) */}
          {isEditingLabel ? (
            <input
              ref={labelInputRef}
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCommitLabel();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsEditingLabel(false);
                  setLabelDraft(node.text_content || 'Untitled group');
                }
              }}
              onBlur={handleCommitLabel}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: `${Math.min(
                  Math.max(node.width, 240),
                  Math.max(120, (labelDraft.length + 2) * 9)
                )}px`,
              }}
              className="group-label-input pointer-events-auto absolute bottom-full left-0 mb-2 p-0 bg-transparent border-none outline-none shadow-none ring-0 text-[14px] font-medium text-white select-text transition-none"
            />
          ) : (
            <div
              onPointerDown={(e) => {
                if (isPanActive || isPanning) return;
                e.stopPropagation();
                onSelect(node.id, e);
              }}
              onClick={(e) => {
                if (isPanActive || isPanning || isReadOnly) return;
                e.stopPropagation();
                if (isSelected) {
                  setIsEditingLabel(true);
                } else {
                  onSelect(node.id, e as any);
                }
              }}
              onDoubleClick={(e) => {
                if (isPanActive || isPanning || isReadOnly) return;
                e.stopPropagation();
                setIsEditingLabel(true);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu?.(node.id, e);
              }}
              title="Double-click to rename group"
              className={`group-label pointer-events-auto absolute bottom-full left-0 mb-2 ${
                isSelected ? 'max-w-none whitespace-nowrap' : 'max-w-full truncate'
              } text-[14px] font-medium text-[#888888] hover:text-[#e0e0e0] select-none transition-none cursor-pointer`}
            >
              {node.text_content || 'Untitled group'}
            </div>
          )}

          {/* Group Action Pill: [Edit label] [Align] [Fit to center] [Change colour] [Ungroup] [Delete] */}
          {!isReadOnly && !isDragging && !isMultiSelected && isSelected && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                left: '50%',
                transform: `translateX(-50%) scale(${pillScale})`,
                transformOrigin: 'bottom center',
              }}
              className="group-action-pill pointer-events-auto absolute bottom-full mb-2 flex items-center gap-1 bg-[#1e1e1e] border border-[#383838] rounded-[6px] p-[3px] shadow-2xl select-none z-40 transition-none"
            >
              {/* 1. Edit Label */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAlignMenuOpen(false);
                  setIsColorMenuOpen(false);
                  setIsEditingLabel(true);
                }}
                title="Edit group label"
                className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0"
              >
                <PencilEdit02Icon size={14} />
              </button>

              {/* 2. Align items inside group */}
              {onAlign && (
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAlignMenuOpen((prev) => !prev);
                      setIsColorMenuOpen(false);
                    }}
                    title="Align items inside group"
                    className={`w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0 ${
                      isAlignMenuOpen ? 'text-white bg-[#282828]' : ''
                    }`}
                  >
                    <AlignStartVerticalIcon size={14} />
                  </button>

                  <CanvasAlignMenu
                    isOpen={isAlignMenuOpen}
                    onClose={() => setIsAlignMenuOpen(false)}
                    onSelect={(type) => onAlign(node.id, type)}
                    align="left"
                  />
                </div>
              )}

              {/* 3. Fit to Center */}
              {onFitToCenter && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAlignMenuOpen(false);
                    setIsColorMenuOpen(false);
                    onFitToCenter(node.id);
                  }}
                  title="Fit group to center"
                  className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0"
                >
                  <CenterFocusIcon size={14} />
                </button>
              )}

              {/* 4. Change Colour */}
              {onColorChange && (
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsColorMenuOpen((prev) => !prev);
                      setIsAlignMenuOpen(false);
                    }}
                    title="Change group color"
                    className={`w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0 ${
                      isColorMenuOpen ? 'text-white bg-[#282828]' : ''
                    }`}
                  >
                    <PaletteIcon size={14} />
                  </button>

                  {isColorMenuOpen && (
                    <div
                      ref={colorMenuRef}
                      className="absolute top-full right-0 mt-1.5 flex flex-col items-center bg-[#1b1b1b] border border-[#333333] rounded-[10px] p-2.5 shadow-2xl z-50 select-none"
                    >
                      {/* 8-Circle Swatch Bar */}
                      <div className="flex items-center gap-2.5">
                        {CARD_COLOR_PRESETS.map((preset) => {
                          const isColorSelected = !colorTheme.isCustom && colorTheme.id === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onColorChange(node.id, preset.id === 'default' ? '' : preset.swatch);
                                setShowAdvancedPicker(false);
                              }}
                              title={preset.label}
                              style={{ backgroundColor: preset.swatch }}
                              className={`w-6 h-6 rounded-full cursor-pointer transition-none shrink-0 flex items-center justify-center ${
                                isColorSelected
                                  ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1b1b1b]'
                                  : 'hover:scale-105'
                              }`}
                            />
                          );
                        })}

                        {/* Custom color swatch */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAdvancedPicker((prev) => !prev);
                          }}
                          title="Custom color picker"
                          style={{
                            background:
                              'conic-gradient(from 0deg, #ef4444, #f97316, #facc15, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)',
                          }}
                          className={`w-6 h-6 rounded-full cursor-pointer transition-none shrink-0 flex items-center justify-center ${
                            showAdvancedPicker || colorTheme.isCustom
                              ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1b1b1b]'
                              : 'hover:scale-105'
                          }`}
                        />
                      </div>

                      {showAdvancedPicker && (
                        <div className="mt-2.5 pt-2 border-t border-[#2d2d2d] w-full flex justify-center">
                          <InlineColorPicker
                            value={colorTheme.swatch}
                            onChange={(color) => onColorChange(node.id, color)}
                            className="!border-0 !shadow-none !bg-transparent w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Ungroup items */}
              {onUngroup && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAlignMenuOpen(false);
                    setIsColorMenuOpen(false);
                    onUngroup(node.id);
                  }}
                  title="Ungroup items (Ctrl+Shift+G)"
                  className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0"
                >
                  <UngroupIcon size={14} />
                </button>
              )}

              {/* 6. Delete group and contents */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAlignMenuOpen(false);
                  setIsColorMenuOpen(false);
                  onDelete(node.id);
                }}
                title="Delete group and contents (Backspace/Delete)"
                className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-rose-400 hover:bg-[#282828] cursor-pointer transition-none shrink-0"
              >
                <Delete02Icon size={14} />
              </button>
            </div>
          )}
        </div>
      </>
    );
  }
);
