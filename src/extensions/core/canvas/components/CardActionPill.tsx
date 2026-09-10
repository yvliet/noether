import React, { useState } from 'react';
import { Delete02Icon, File01Icon, Tag01Icon } from '@/components/common/Icons';

export interface CardActionPillProps {
  onDelete: () => void;
  onOpenDoc?: () => void;
  onColorChange?: (color: string) => void;
  isDocBacked?: boolean;
}

const PRESET_COLORS = [
  { label: 'Default', value: '#1e1e1e', border: '#2c2c2c' },
  { label: 'Red', value: '#261616', border: '#4a2525' },
  { label: 'Amber', value: '#272013', border: '#4d3d1f' },
  { label: 'Green', value: '#152418', border: '#24472c' },
  { label: 'Blue', value: '#14202d', border: '#203d59' },
  { label: 'Purple', value: '#211629', border: '#422459' },
];

export const CardActionPill: React.FC<CardActionPillProps> = React.memo(
  ({ onDelete, onOpenDoc, onColorChange, isDocBacked }) => {
    const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);

    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-full right-0 mb-1.5 flex items-center gap-0.5 bg-[#1e1e1e] border border-[#333333] rounded-[5px] p-0.5 shadow-xl select-none z-30"
      >
        {/* Open in main workspace */}
        {isDocBacked && onOpenDoc && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDoc();
            }}
            title="Open in editor"
            className="p-1 rounded-[3px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none"
          >
            <File01Icon size={12} />
          </button>
        )}

        {/* Color Palette Menu */}
        {onColorChange && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsColorMenuOpen(!isColorMenuOpen);
              }}
              title="Change card color"
              className="p-1 rounded-[3px] text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer transition-none"
            >
              <Tag01Icon size={12} />
            </button>

            {isColorMenuOpen && (
              <div className="absolute top-full right-0 mt-1 flex items-center gap-1 bg-[#1e1e1e] border border-[#333333] rounded-[5px] p-1.5 shadow-2xl z-40">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorChange(c.value);
                      setIsColorMenuOpen(false);
                    }}
                    title={c.label}
                    style={{ backgroundColor: c.value, borderColor: c.border }}
                    className="w-4 h-4 rounded-full border hover:scale-110 cursor-pointer transition-none"
                  />
                ))}
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
          className="p-1 rounded-[3px] text-[#888] hover:text-rose-400 hover:bg-[#282828] cursor-pointer transition-none"
        >
          <Delete02Icon size={12} />
        </button>
      </div>
    );
  }
);
