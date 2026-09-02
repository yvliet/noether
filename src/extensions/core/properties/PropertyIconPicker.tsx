import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  PROPERTY_ICONS,
  PropertyIconCategory,
  PropertyIconDefinition,
  getPropertyIconDef,
  getPropertyIconId,
} from './propertyIcons';
import {
  Search01Icon,
  Cancel01Icon,
  RotateCcwIcon,
  CheckIcon,
} from '@/components/common/Icons';

export interface PropertyIconPickerProps {
  propertyKey: string;
  currentIconId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconId: string) => void;
  onResetToDefault?: () => void;
  align?: 'left' | 'right';
}

const CATEGORIES: PropertyIconCategory[] = [
  'All',
  'Common',
  'Content',
  'Status',
  'Tech',
  'Media',
  'Tools',
];

export const PropertyIconPicker: React.FC<PropertyIconPickerProps> = ({
  propertyKey,
  currentIconId,
  isOpen,
  onClose,
  onSelectIcon,
  onResetToDefault,
  align = 'left',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PropertyIconCategory>('All');
  const [hoveredIcon, setHoveredIcon] = useState<PropertyIconDefinition | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active resolved icon ID
  const activeIconId = currentIconId || getPropertyIconId(propertyKey);

  // Filter icons
  const filteredIcons = useMemo(() => {
    let list = PROPERTY_ICONS;

    if (selectedCategory !== 'All') {
      list = list.filter((i) => i.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }

    return list;
  }, [searchQuery, selectedCategory]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    } else {
      setSearchQuery('');
      setSelectedCategory('All');
      setHoveredIcon(null);
    }
  }, [isOpen]);

  // Click outside & escape handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{ zIndex: 100 }}
      className={`absolute top-full mt-1.5 ${
        align === 'right' ? 'right-0' : 'left-0'
      } w-72 bg-[#1c1c1c] border border-[#333333] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.7)] flex flex-col text-xs text-[#dcddde] select-none overflow-hidden`}
    >
      {/* Header with Title & Search Bar */}
      <div className="p-2.5 border-b border-[#282828] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-medium text-white truncate">
              Icon for &ldquo;{propertyKey}&rdquo;
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer transition-colors"
          >
            <Cancel01Icon size={12} />
          </button>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#141414] border border-[#2c2c2c] focus-within:border-[#444] rounded-md transition-colors">
          <Search01Icon size={12} className="text-[#666] shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search icons (e.g. user, star, date)..."
            className="bg-transparent border-none outline-none flex-1 text-[11px] text-white placeholder-[#555]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#666] hover:text-white cursor-pointer"
            >
              <Cancel01Icon size={10} />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 pt-0.5 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--flint-accent)] text-white font-medium shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                    : 'bg-[#222222] hover:bg-[#2a2a2a] text-[#888] hover:text-[#ccc] border border-[#2d2d2d]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon Grid */}
      <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar">
        {filteredIcons.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-[#666]">
            No icons found matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {filteredIcons.map((icon) => {
              const isSelected = activeIconId === icon.id;
              const IconComp = icon.component;

              return (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => {
                    onSelectIcon(icon.id);
                    onClose();
                  }}
                  onMouseEnter={() => setHoveredIcon(icon)}
                  onMouseLeave={() => setHoveredIcon(null)}
                  title={icon.name}
                  className={`h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[var(--flint-accent)]/20 border border-[var(--flint-accent)] text-[var(--flint-accent)] shadow-[0_0_8px_rgba(234,88,12,0.2)]'
                      : 'bg-[#202020] hover:bg-[#282828] text-[#999] hover:text-white border border-[#2b2b2b] hover:border-[#3c3c3c]'
                  }`}
                >
                  <IconComp size={15} />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--flint-accent)] text-white rounded-full flex items-center justify-center text-[7px]">
                      <CheckIcon size={7} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: Hovered info / Reset defaults */}
      <div className="px-2.5 py-1.5 border-t border-[#252525] bg-[#171717] flex items-center justify-between text-[10px] text-[#777]">
        <div className="truncate min-w-0 flex-1 pr-2">
          {hoveredIcon ? (
            <span className="text-[#bbb] font-medium">{hoveredIcon.name}</span>
          ) : (
            <span>{filteredIcons.length} icons</span>
          )}
        </div>

        {onResetToDefault && (
          <button
            type="button"
            onClick={() => {
              onResetToDefault();
              onClose();
            }}
            className="text-[10px] text-[#777] hover:text-[#bbb] hover:underline flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
          >
            <RotateCcwIcon size={10} />
            <span>Reset default</span>
          </button>
        )}
      </div>
    </div>
  );
};
