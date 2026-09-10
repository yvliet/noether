import React, { useState, useRef, useEffect } from 'react';
import { Delete02Icon, File01Icon, PaletteIcon, PencilEdit02Icon } from '@/components/common/Icons';
import { InlineColorPicker } from '@/components/common/ColorPicker';
import { CARD_COLOR_PRESETS, resolveCardColorTheme } from './cardColors';

export interface CardActionPillProps {
  onDelete: () => void;
  onOpenDoc?: () => void;
  onColorChange?: (color: string) => void;
  currentColor?: string;
  onEdit?: () => void;
  isDocBacked?: boolean;
}

export const CardActionPill: React.FC<CardActionPillProps> = React.memo(
  ({ onDelete, onOpenDoc, onColorChange, currentColor, onEdit, isDocBacked }) => {
    const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
    const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const activeTheme = resolveCardColorTheme(currentColor);

    // Close on outside click or Escape key
    useEffect(() => {
      if (!isColorMenuOpen) return;

      const handleOutsideClick = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
        className="absolute bottom-full right-0 mb-1.5 flex items-center gap-0.5 bg-[#1e1e1e] border border-[#333333] rounded-[5px] p-0.5 shadow-xl select-none z-30"
      >
        {/* Edit Card In-Place */}
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Edit card"
            className="w-5 h-5 flex items-center justify-center rounded-[3px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0"
          >
            <PencilEdit02Icon size={12} />
          </button>
        )}

        {/* Open in main workspace */}
        {isDocBacked && onOpenDoc && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDoc();
            }}
            title="Open in editor"
            className="w-5 h-5 flex items-center justify-center rounded-[3px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0"
          >
            <File01Icon size={12} />
          </button>
        )}

        {/* Color Palette Menu */}
        {onColorChange && (
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsColorMenuOpen(!isColorMenuOpen);
              }}
              title="Change card color"
              className={`w-5 h-5 flex items-center justify-center rounded-[3px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none shrink-0 ${
                isColorMenuOpen ? 'text-white bg-[#282828]' : ''
              }`}
            >
              <PaletteIcon size={12} />
            </button>

            {isColorMenuOpen && (
              <div
                ref={menuRef}
                className="absolute top-full right-0 mt-1.5 flex flex-col items-center bg-[#1b1b1b] border border-[#333333] rounded-[8px] p-2 shadow-2xl z-40 select-none"
              >
                {/* 8-Circle Swatch Bar */}
                <div className="flex items-center gap-2">
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
                        className={`w-5 h-5 rounded-full cursor-pointer transition-none shrink-0 flex items-center justify-center ${
                          isSelected
                            ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1b1b1b]'
                            : 'hover:scale-105'
                        }`}
                      />
                    );
                  })}

                  {/* 8th Swatch: Rainbow / Custom Color Picker (Toggles Flint's InlineColorPicker) */}
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
                    className={`w-5 h-5 rounded-full cursor-pointer transition-none shrink-0 flex items-center justify-center ${
                      showAdvancedPicker || activeTheme.isCustom
                        ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#1b1b1b]'
                        : 'hover:scale-105'
                    }`}
                  />
                </div>

                {/* Flint's Custom Color Picker (2D spectrum, hue slider, eyedropper, RGB/HEX) */}
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

        {/* Delete Card */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete card (Backspace/Delete)"
          className="w-5 h-5 flex items-center justify-center rounded-[3px] text-[#888] hover:text-rose-400 hover:bg-[#282828] cursor-pointer transition-none shrink-0"
        >
          <Delete02Icon size={12} />
        </button>
      </div>
    );
  }
);
