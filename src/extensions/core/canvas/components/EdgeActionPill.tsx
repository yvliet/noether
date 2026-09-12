import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight02Icon,
  Cancel01Icon,
  CenterFocusIcon,
  CheckIcon,
  Delete02Icon,
  PaletteIcon,
  PencilEdit02Icon,
  RotateCcwIcon,
} from '@/components/common/Icons';
import { InlineColorPicker } from '@/components/common/ColorPicker';
import { CARD_COLOR_PRESETS, resolveCardColorTheme } from './cardColors';
import type { CanvasEdgeDirection, CanvasEdgeStyle } from '../types';

export interface EdgeActionPillProps {
  onDelete: () => void;
  onFitToCenter: () => void;
  onColorChange: (color: string) => void;
  currentColor?: string;
  onDirectionChange: (direction: CanvasEdgeDirection) => void;
  currentDirection?: CanvasEdgeDirection;
  onStyleChange?: (style: CanvasEdgeStyle) => void;
  currentStyle?: CanvasEdgeStyle;
  hasCustomBend?: boolean;
  onResetBend?: () => void;
  hasLabel: boolean;
  onEditLabel: () => void;
  onClearLabel: () => void;
}

export const EdgeActionPill: React.FC<EdgeActionPillProps> = React.memo(
  ({
    onDelete,
    onFitToCenter,
    onColorChange,
    currentColor,
    onDirectionChange,
    currentDirection = 'unidirectional',
    onStyleChange,
    currentStyle = 'bezier',
    hasCustomBend = false,
    onResetBend,
    hasLabel,
    onEditLabel,
    onClearLabel,
  }) => {
    const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
    const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);
    const [isDirectionMenuOpen, setIsDirectionMenuOpen] = useState(false);
    const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);

    const colorMenuRef = useRef<HTMLDivElement>(null);
    const directionMenuRef = useRef<HTMLDivElement>(null);
    const styleMenuRef = useRef<HTMLDivElement>(null);

    const activeTheme = resolveCardColorTheme(currentColor);

    // Close menus on outside click or Escape key
    useEffect(() => {
      if (!isColorMenuOpen && !isDirectionMenuOpen && !isStyleMenuOpen) return;

      const handleOutsideClick = (e: MouseEvent) => {
        const target = e.target as Node;
        if (isColorMenuOpen && colorMenuRef.current && !colorMenuRef.current.contains(target)) {
          setIsColorMenuOpen(false);
          setShowAdvancedPicker(false);
        }
        if (isDirectionMenuOpen && directionMenuRef.current && !directionMenuRef.current.contains(target)) {
          setIsDirectionMenuOpen(false);
        }
        if (isStyleMenuOpen && styleMenuRef.current && !styleMenuRef.current.contains(target)) {
          setIsStyleMenuOpen(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsColorMenuOpen(false);
          setShowAdvancedPicker(false);
          setIsDirectionMenuOpen(false);
          setIsStyleMenuOpen(false);
        }
      };

      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('mousedown', handleOutsideClick);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isColorMenuOpen, isDirectionMenuOpen, isStyleMenuOpen]);


    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1 bg-[#1e1e1e] border border-[#333333] rounded-[6px] p-[3px] shadow-xl select-none z-30 pointer-events-auto"
      >
        {/* 1. Edit Label */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditLabel();
          }}
          title={hasLabel ? 'Edit label' : 'Add label'}
          className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0"
        >
          <PencilEdit02Icon size={14} />
        </button>

        {/* 2. Clear Label (if label exists) */}
        {hasLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClearLabel();
            }}
            title="Clear label"
            className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-rose-400 hover:bg-[#282828] cursor-pointer transition-none shrink-0"
          >
            <Cancel01Icon size={14} />
          </button>
        )}

        {/* 3. Line Direction Popover */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDirectionMenuOpen(!isDirectionMenuOpen);
              setIsColorMenuOpen(false);
            }}
            title="Line direction"
            className={`w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0 ${
              isDirectionMenuOpen ? 'text-white bg-[#282828]' : ''
            }`}
          >
            <ArrowRight02Icon size={14} />
          </button>

          {isDirectionMenuOpen && (
            <div
              ref={directionMenuRef}
              className="absolute top-full left-0 mt-1.5 flex flex-col bg-[#1e1e1e] border border-[#333333] rounded-[10px] py-1 shadow-2xl z-40 select-none min-w-[170px]"
            >
              {/* Nondirectional */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDirectionChange('nondirectional');
                  setIsDirectionMenuOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2 text-[14px] text-[#cccccc] hover:text-white hover:bg-[#282828] cursor-pointer transition-none w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="text-[#999999] shrink-0"
                  >
                    <line x1="2" y1="8" x2="14" y2="8" />
                  </svg>
                  <span>Nondirectional</span>
                </div>
                {currentDirection === 'nondirectional' && <CheckIcon size={14} className="text-white shrink-0 ml-2" />}
              </button>

              {/* Unidirectional */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDirectionChange('unidirectional');
                  setIsDirectionMenuOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2 text-[14px] text-[#cccccc] hover:text-white hover:bg-[#282828] cursor-pointer transition-none w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <ArrowRight02Icon size={15} className="text-[#999999] shrink-0" />
                  <span>Unidirectional</span>
                </div>
                {currentDirection === 'unidirectional' && <CheckIcon size={14} className="text-white shrink-0 ml-2" />}
              </button>

              {/* Bidirectional */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDirectionChange('bidirectional');
                  setIsDirectionMenuOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2 text-[14px] text-[#cccccc] hover:text-white hover:bg-[#282828] cursor-pointer transition-none w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#999999] shrink-0"
                  >
                    <path d="M4.5 4.5L1.5 8l3 3.5M11.5 4.5l3 3.5-3 3.5M1.5 8h13" />
                  </svg>
                  <span>Bidirectional</span>
                </div>
                {currentDirection === 'bidirectional' && <CheckIcon size={14} className="text-white shrink-0 ml-2" />}
              </button>
            </div>
          )}
        </div>

        {/* 4. Line Style Popover */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsStyleMenuOpen(!isStyleMenuOpen);
              setIsDirectionMenuOpen(false);
              setIsColorMenuOpen(false);
            }}
            title="Line style"
            className={`w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0 ${
              isStyleMenuOpen ? 'text-white bg-[#282828]' : ''
            }`}
          >
            {currentStyle === 'step' ? (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 13h4a2 2 0 0 0 2-2V5a2 2 0 0 1 2-2h4" />
              </svg>
            ) : currentStyle === 'straight' ? (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="2" y1="14" x2="14" y2="2" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 12C5 12 5 4 8 4C11 4 11 12 14 12" />
              </svg>
            )}
          </button>

          {isStyleMenuOpen && (
            <div
              ref={styleMenuRef}
              className="absolute top-full left-0 mt-1.5 flex flex-col bg-[#1e1e1e] border border-[#333333] rounded-[10px] py-1 shadow-2xl z-40 select-none min-w-[170px]"
            >
              {/* Curved (Bezier) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStyleChange?.('bezier');
                  setIsStyleMenuOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2 text-[14px] text-[#cccccc] hover:text-white hover:bg-[#282828] cursor-pointer transition-none w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[#999999] shrink-0">
                    <path d="M2 12C5 12 5 4 8 4C11 4 11 12 14 12" />
                  </svg>
                  <span>Curved</span>
                </div>
                {currentStyle === 'bezier' && <CheckIcon size={14} className="text-white shrink-0 ml-2" />}
              </button>

              {/* Smooth 90° (Step) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStyleChange?.('step');
                  setIsStyleMenuOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2 text-[14px] text-[#cccccc] hover:text-white hover:bg-[#282828] cursor-pointer transition-none w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#999999] shrink-0">
                    <path d="M2 13h4a2 2 0 0 0 2-2V5a2 2 0 0 1 2-2h4" />
                  </svg>
                  <span>Step</span>
                </div>
                {currentStyle === 'step' && <CheckIcon size={14} className="text-white shrink-0 ml-2" />}
              </button>

              {/* Straight */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStyleChange?.('straight');
                  setIsStyleMenuOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2 text-[14px] text-[#cccccc] hover:text-white hover:bg-[#282828] cursor-pointer transition-none w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[#999999] shrink-0">
                    <line x1="2" y1="14" x2="14" y2="2" />
                  </svg>
                  <span>Straight</span>
                </div>
                {currentStyle === 'straight' && <CheckIcon size={14} className="text-white shrink-0 ml-2" />}
              </button>

              {/* Reset Bend Button (if edge has manual bend) */}
              {hasCustomBend && (
                <>
                  <div className="my-1 border-t border-[#333333]" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResetBend?.();
                      setIsStyleMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#ff8888] hover:text-rose-300 hover:bg-[#282828] cursor-pointer transition-none w-full text-left"
                  >
                    <RotateCcwIcon size={13} className="shrink-0" />
                    <span>Reset curve bend</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>


        {/* 4. Fit Arrow to Center */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFitToCenter();
          }}
          title="Fit to center"
          className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0"
        >
          <CenterFocusIcon size={14} />
        </button>

        {/* 5. Recolour Arrow */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsColorMenuOpen(!isColorMenuOpen);
              setIsDirectionMenuOpen(false);
            }}
            title="Change arrow color"
            className={`w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0 ${
              isColorMenuOpen ? 'text-white bg-[#282828]' : ''
            }`}
          >
            <PaletteIcon size={14} />
          </button>

          {isColorMenuOpen && (
            <div
              ref={colorMenuRef}
              className="absolute top-full right-0 mt-1.5 flex flex-col items-center bg-[#1b1b1b] border border-[#333333] rounded-[10px] p-2.5 shadow-2xl z-40 select-none"
            >
              <div className="flex items-center gap-2.5">
                {CARD_COLOR_PRESETS.map((preset) => {
                  const isSelected = !activeTheme.isCustom && activeTheme.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onColorChange(preset.id === 'default' ? '' : preset.swatch);
                        setShowAdvancedPicker(false);
                      }}
                      title={preset.label}
                      style={{ backgroundColor: preset.swatch }}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-none shrink-0 flex items-center justify-center ${
                        isSelected
                          ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1b1b1b]'
                          : 'hover:scale-105'
                      }`}
                    />
                  );
                })}

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
                    showAdvancedPicker || activeTheme.isCustom
                      ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1b1b1b]'
                      : 'hover:scale-105'
                  }`}
                />
              </div>

              {showAdvancedPicker && (
                <div className="mt-2.5 pt-2 border-t border-[#2d2d2d] w-full flex justify-center">
                  <InlineColorPicker
                    value={activeTheme.swatch}
                    onChange={(color) => onColorChange(color)}
                    className="!border-0 !shadow-none !bg-transparent w-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. Delete Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete arrow (Backspace/Delete)"
          className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-rose-400 hover:bg-[#282828] cursor-pointer transition-none shrink-0"
        >
          <Delete02Icon size={14} />
        </button>
      </div>
    );
  }
);
