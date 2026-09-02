/**
 * @file IconPicker.tsx
 * @description
 * Unified, high-performance icon picker component for Flint.
 * Dynamically indexes all 6,700+ free HugeIcons from `@hugeicons/core-free-icons`
 * with smart category classification, real-time keyword search, chunked lazy rendering,
 * and support for modal, popover, and context menu submenu variants.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import * as RawIcons from '@hugeicons/core-free-icons';
import {
  Search01Icon,
  Cancel01Icon,
  RotateCcwIcon,
  CheckIcon,
} from '@/components/common/Icons';

export type IconCategory =
  | 'All'
  | 'Common'
  | 'Content'
  | 'Status'
  | 'Tech'
  | 'Media'
  | 'Tools'
  | 'Arrows'
  | 'Symbols';

export interface CatalogIconDefinition {
  id: string;
  name: string;
  category: Exclude<IconCategory, 'All'>;
  keywords: string[];
  iconDef: any;
}

export type IconPickerVariant = 'modal' | 'popover' | 'submenu';

export interface IconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconId: string) => void;
  currentIconId?: string;
  title?: string;
  headerIcon?: React.ReactNode;
  variant?: IconPickerVariant;
  align?: 'left' | 'right';
  onResetToDefault?: () => void;
  resetLabel?: string;
  className?: string;
}

// ── Smart Category Classifier ──
function classifyCategory(rawKey: string): Exclude<IconCategory, 'All'> {
  if (/Code|Git|Database|Cpu|Server|Terminal|Cloud|Api|Bug|Wifi|Globe|Shield|Key|Lock|Command|Processor|Computer|Laptop|Phone|QrCode|Router|HardDrive|Usb|Robot|Ai|Programming|Developer/i.test(rawKey)) {
    return 'Tech';
  }
  if (/File|Folder|Book|Note|Document|Text|Edit|Pencil|Paragraph|Heading|Quote|List|Task|Paperclip|Sticky|Draft|Page|Bookmark|Alphabet|Number/i.test(rawKey)) {
    return 'Content';
  }
  if (/Image|Camera|Video|Music|Audio|Film|Palette|Color|Layer|Layout|Design|Play|Volume|Mic|Sound|Equalizer|Speaker|Brush|Canvas|Crop/i.test(rawKey)) {
    return 'Media';
  }
  if (/Check|Alert|Info|Help|Target|Flame|Zap|Activity|Chart|Sun|Moon|Star|Heart|Favourite|Flag|Pin|Notification|Bell|Warning|Battery|Gauge|Hourglass|Progress|Status/i.test(rawKey)) {
    return 'Status';
  }
  if (/Tool|Setting|Slider|Wrench|Search|Mail|Shop|Store|Bag|Briefcase|Coffee|Compass|Bulb|Calculator|Hammer|Scissors|Paint|Box|Archive|Cart|Shopping/i.test(rawKey)) {
    return 'Tools';
  }
  if (/Arrow|Chevron|Direction|Navigate|Corner|Exchange|Transfer|Sort|Move|Expand|Shrink/i.test(rawKey)) {
    return 'Arrows';
  }
  if (/Hash|At|Percent|Plus|Minus|Multiply|Divide|Equal|Circle|Square|Triangle|Diamond|Badge|Sparkle/i.test(rawKey)) {
    return 'Symbols';
  }
  return 'Common';
}

// ── Convert camelCase / PascalCase to Kebab & Words ──
function parseIconKey(rawKey: string): { id: string; name: string; keywords: string[] } {
  const base = rawKey.replace(/Icon$/, '');
  const kebab = base
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

  const words = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/);

  const synonyms: string[] = [];
  if (words.includes('favourite')) synonyms.push('favorite', 'heart', 'like');
  if (words.includes('folder')) synonyms.push('directory', 'collection');
  if (words.includes('file')) synonyms.push('document', 'page');
  if (words.includes('edit')) synonyms.push('write', 'pencil');
  if (words.includes('star')) synonyms.push('rating', 'favorite');
  if (words.includes('sparkles')) synonyms.push('magic', 'ai', 'clean');
  if (words.includes('code')) synonyms.push('dev', 'script', 'programming');
  if (words.includes('search')) synonyms.push('find', 'lookup');
  if (words.includes('settings')) synonyms.push('config', 'preferences', 'gear');

  const titleName = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

  return {
    id: kebab,
    name: titleName,
    keywords: Array.from(new Set([...words, kebab, ...synonyms])),
  };
}

// ── Build Full Catalog ──
export const UNIFIED_ICONS_CATALOG: CatalogIconDefinition[] = (() => {
  const list: CatalogIconDefinition[] = [];
  const entries = Object.entries(RawIcons);

  for (const [key, value] of entries) {
    if (key.endsWith('Icon') && !key.endsWith('FreeIcons') && Array.isArray(value)) {
      const parsed = parseIconKey(key);
      const category = classifyCategory(key);
      list.push({
        id: parsed.id,
        name: parsed.name,
        category,
        keywords: parsed.keywords,
        iconDef: value,
      });
    }
  }

  // Sort catalog: Common first, then alphabetical
  return list.sort((a, b) => {
    if (a.category === 'Common' && b.category !== 'Common') return -1;
    if (b.category === 'Common' && a.category !== 'Common') return 1;
    return a.name.localeCompare(b.name);
  });
})();

export const UNIFIED_ICON_MAP = new Map<string, CatalogIconDefinition>(
  UNIFIED_ICONS_CATALOG.map((icon) => [icon.id, icon])
);

export function getUnifiedIconDef(iconId?: string): CatalogIconDefinition | undefined {
  if (!iconId) return undefined;
  return UNIFIED_ICON_MAP.get(iconId);
}

export const HugeIconRenderer = React.memo<{
  iconDef: any;
  size?: number;
  className?: string;
  color?: string;
}>(({ iconDef, size = 14, className = '', color = 'currentColor' }) => {
  if (!iconDef) return null;
  return (
    <HugeiconsIcon
      icon={iconDef}
      size={size}
      className={className}
      color={color}
      strokeWidth={1.5}
    />
  );
});

HugeIconRenderer.displayName = 'HugeIconRenderer';

export function renderUnifiedIcon(
  iconId: string,
  options: { size?: number; className?: string; color?: string } = {}
): React.ReactNode {
  const def = getUnifiedIconDef(iconId);
  if (!def) return null;
  return (
    <HugeIconRenderer
      iconDef={def.iconDef}
      size={options.size ?? 14}
      className={options.className}
      color={options.color}
    />
  );
}

const CATEGORIES: IconCategory[] = [
  'All',
  'Common',
  'Content',
  'Status',
  'Tech',
  'Media',
  'Tools',
  'Arrows',
  'Symbols',
];

const INITIAL_RENDER_COUNT = 96;
const CHUNK_RENDER_COUNT = 96;

export const IconPicker: React.FC<IconPickerProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
  currentIconId,
  title = 'Select Icon',
  headerIcon,
  variant = 'modal',
  align = 'left',
  onResetToDefault,
  resetLabel = 'Reset default',
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IconCategory>('All');
  const [hoveredIcon, setHoveredIcon] = useState<CatalogIconDefinition | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_RENDER_COUNT);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Filter icons
  const filteredIcons = useMemo(() => {
    let list = UNIFIED_ICONS_CATALOG;

    if (selectedCategory !== 'All') {
      list = list.filter((i) => i.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.keywords.some((k) => k.includes(q))
      );
    }

    return list;
  }, [searchQuery, selectedCategory]);

  // Reset pagination on search or category switch
  useEffect(() => {
    setVisibleLimit(INITIAL_RENDER_COUNT);
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = 0;
    }
  }, [searchQuery, selectedCategory]);

  // Visible sliced icons for performance
  const displayedIcons = useMemo(() => {
    return filteredIcons.slice(0, visibleLimit);
  }, [filteredIcons, visibleLimit]);

  // Infinite scroll handler
  const handleGridScroll = useCallback(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      setVisibleLimit((prev) => {
        if (prev >= filteredIcons.length) return prev;
        return prev + CHUNK_RENDER_COUNT;
      });
    }
  }, [filteredIcons.length]);

  // Focus search input on open
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
      setVisibleLimit(INITIAL_RENDER_COUNT);
    }
  }, [isOpen]);

  // Escape & outside click handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (variant === 'popover' && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    if (variant === 'popover') {
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (variant === 'popover') {
        document.removeEventListener('mousedown', handleClickOutside, true);
      }
    };
  }, [isOpen, onClose, variant]);

  if (!isOpen) return null;

  const content = (
    <div
      ref={containerRef}
      style={{ zIndex: 100 }}
      className={`bg-[#1c1c1c] border border-[#303030] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex flex-col text-xs text-[#dcddde] select-none overflow-hidden ${
        variant === 'popover'
          ? `absolute top-full mt-1.5 ${align === 'right' ? 'right-0' : 'left-0'} w-72`
          : variant === 'submenu'
          ? 'w-72 max-w-xs'
          : 'w-full max-w-sm'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Title & Close Button */}
      <div className="p-2.5 border-b border-[#262626] flex flex-col gap-2 bg-[#1e1e1e]/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            {headerIcon}
            <span className="text-[11px] font-medium text-white truncate">
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer"
            title="Close (Esc)"
          >
            <Cancel01Icon size={12} />
          </button>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[#141414] border border-[#2b2b2b] focus-within:border-[#444] rounded-md">
          <Search01Icon size={12} className="text-[#666] shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${UNIFIED_ICONS_CATALOG.length}+ icons...`}
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
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5 pt-0.5">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--flint-accent,#ea580c)] text-white font-medium shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                    : 'bg-[#222222] hover:bg-[#2a2a2a] text-[#888] hover:text-[#ccc] border border-[#2b2b2b]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon Grid with Virtualized Infinite Chunk Scroll */}
      <div
        ref={gridScrollRef}
        onScroll={handleGridScroll}
        className={`p-2 overflow-y-auto custom-scrollbar ${
          variant === 'submenu' ? 'max-h-56' : variant === 'popover' ? 'max-h-52' : 'max-h-64'
        }`}
      >
        {filteredIcons.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-[#666]">
            No icons found matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {displayedIcons.map((icon) => {
              const isSelected = currentIconId === icon.id;

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
                  className={`h-8 rounded-lg flex items-center justify-center cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[var(--flint-accent,#ea580c)]/20 border border-[var(--flint-accent,#ea580c)] text-[var(--flint-accent,#ea580c)] shadow-[0_0_8px_rgba(234,88,12,0.2)]'
                      : 'bg-[#202020] hover:bg-[#282828] text-[#999] hover:text-white border border-[#282828] hover:border-[#3a3a3a]'
                  }`}
                >
                  <HugeIconRenderer iconDef={icon.iconDef} size={15} />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[var(--flint-accent,#ea580c)] text-white rounded-full flex items-center justify-center text-[7px] shadow-xs">
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
      <div className="px-2.5 py-1.5 border-t border-[#252525] bg-[#161616] flex items-center justify-between text-[10px] text-[#777]">
        <div className="truncate min-w-0 flex-1 pr-2">
          {hoveredIcon ? (
            <span className="text-[#ccc] font-medium">{hoveredIcon.name}</span>
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
            className="text-[10px] text-[#777] hover:text-[#bbb] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RotateCcwIcon size={10} />
            <span>{resetLabel}</span>
          </button>
        )}
      </div>
    </div>
  );

  if (variant === 'popover' || variant === 'submenu') {
    return content;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      {content}
    </div>
  );
};

export default IconPicker;
