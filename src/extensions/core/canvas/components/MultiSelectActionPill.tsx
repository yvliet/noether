import React, { useState, useRef, useEffect } from 'react';
import {
  AlignStartVerticalIcon,
  CenterFocusIcon,
  Delete02Icon,
  GroupIcon,
  PaletteIcon,
} from '@/components/common/Icons';
import { InlineColorPicker } from '@/components/common/ColorPicker';
import { Tooltip } from '@/components/common/Tooltip';
import { CARD_COLOR_PRESETS, resolveCardColorTheme } from './cardColors';
import { computePillScale } from './CardActionPill';
import { CanvasAlignMenu } from './CanvasAlignMenu';
import type { CanvasAlignmentType } from '../utils/canvasAlignment';

export interface MultiSelectActionPillProps {
  onDelete: () => void;
  onColorChange?: (color: string) => void;
  onFitToCenter?: () => void;
  onCreateGroup?: () => void;
  onAlign?: (type: CanvasAlignmentType) => void;
  currentColor?: string;
  zoom?: number;
  count?: number;
}

export const MultiSelectActionPill: React.FC<MultiSelectActionPillProps> = React.memo(
  ({
    onDelete,
    onColorChange,
    onFitToCenter,
    onCreateGroup,
    onAlign,
    currentColor,
    zoom = 1,
    count = 1,
  }) => {
    const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
    const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);
    const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);
    const colorMenuRef = useRef<HTMLDivElement>(null);

    const activeTheme = resolveCardColorTheme(currentColor);
    const pillScale = computePillScale(zoom);

    // Close menus on outside click or Escape key
    useEffect(() => {
      if (!isColorMenuOpen) return;

      const handleOutsideClick = (e: MouseEvent) => {
        if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
          setIsColorMenuOpen(false);
          setShowAdvancedPicker(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsColorMenuOpen(false);
          setShowAdvancedPicker(false);
        }
      };

      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('mousedown', handleOutsideClick);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isColorMenuOpen]);

    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          left: '50%',
          transform: `translateX(-50%) scale(${pillScale})`,
          transformOrigin: 'bottom center',
        }}
        className="absolute bottom-full mb-2 flex items-center gap-1 bg-[#1e1e1e] border border-[#383838] rounded-[6px] p-[3px] shadow-2xl select-none z-40 transition-none"
      >
        {/* 1. Align Menu */}
        {onAlign && (
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAlignMenuOpen((prev) => !prev);
                setIsColorMenuOpen(false);
              }}
              title="Align & distribute selected items"
              className={`w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0 ${
                isAlignMenuOpen ? 'text-white bg-[#282828]' : ''
              }`}
            >
              <AlignStartVerticalIcon size={14} />
            </button>

            <CanvasAlignMenu
              isOpen={isAlignMenuOpen}
              onClose={() => setIsAlignMenuOpen(false)}
              onSelect={onAlign}
              align="left"
            />
          </div>
        )}

        {/* 2. Create Group */}
        {onCreateGroup && (
          <Tooltip content={`Create group from ${count} selected items`} shortcut="Ctrl+G">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAlignMenuOpen(false);
                setIsColorMenuOpen(false);
                onCreateGroup();
              }}
              className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0"
            >
              <GroupIcon size={14} />
            </button>
          </Tooltip>
        )}

        {/* 3. Fit Selection to Center */}
        {onFitToCenter && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAlignMenuOpen(false);
              setIsColorMenuOpen(false);
              onFitToCenter();
            }}
            title="Fit selection to center"
            className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0"
          >
            <CenterFocusIcon size={14} />
          </button>
        )}

        {/* 4. Color Palette Menu */}
        {onColorChange && (
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsColorMenuOpen((prev) => !prev);
                setIsAlignMenuOpen(false);
              }}
              title="Change color of selected cards"
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

                  {/* 8th Swatch: Custom Color Picker */}
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

                {/* Noether's Custom Color Picker */}
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
        )}

        {/* 5. Delete Selected Items */}
        <Tooltip content={`Delete ${count} selected item${count > 1 ? 's' : ''}`} shortcuts={['Backspace', 'Delete']}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAlignMenuOpen(false);
              setIsColorMenuOpen(false);
              onDelete();
            }}
            className="w-6 h-6 flex items-center justify-center rounded-[4px] text-[#888] hover:text-rose-400 hover:bg-[#282828] cursor-pointer transition-none shrink-0"
          >
            <Delete02Icon size={14} />
          </button>
        </Tooltip>
      </div>
    );
  }
);
