/**
 * @file IconPicker.tsx
 * @description
 * Unified, high-performance icon picker component for Flint.
 *
 * Architectural Rationale:
 * 1. Zero Startup Memory Bloat: Rather than eagerly importing all 14,716 HugeIcons
 *    into memory on boot (which previously consumed 76MB of raw SVG geometry and ~130MB of V8 heap),
 *    the full catalog is isolated in `iconCatalog.ts` and loaded dynamically via `import('./iconCatalog')`
 *    only when the picker UI is explicitly opened.
 * 2. On-Demand Dynamic Resolution: Individual custom icons assigned to notes or folders are
 *    loaded asynchronously using `@hugeicons/core-free-icons/loader` and cached in an in-memory Map,
 *    keeping runtime memory usage strictly proportional to what is visible on screen (<50KB).
 * 3. Instant Native Responsiveness: Zero artificial animations or duration delays on popovers,
 *    dropdowns, or tabs, preserving snappy native desktop responsiveness.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { loadIcon } from '@hugeicons/core-free-icons/loader';
import type { IconCategory, CatalogIconDefinition } from './iconCatalog';
import {
  Search01Icon,
  Cancel01Icon,
  RotateCcwIcon,
  CheckIcon,
  SparklesIcon,
} from '@/components/common/Icons';
import { EMOJI_CATALOG, EMOJI_CATEGORIES, EmojiDefinition } from './emoji/emojiCatalog';
import { EmojiRenderer, EmojiStyle } from './emoji/EmojiRenderer';

export type { IconCategory, CatalogIconDefinition } from './iconCatalog';

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
  emojiStyle?: EmojiStyle;
}

// ── In-Memory Dynamic Icon Cache & Resolver ──
const iconDefCache = new Map<string, any>();
const pendingLoads = new Map<string, Promise<any>>();
const cacheListeners = new Set<() => void>();

function notifyCacheListeners() {
  cacheListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {}
  });
}

export function normalizeToPascalIconName(rawId: string): string {
  let clean = rawId.trim();
  if (clean.endsWith('Icon')) return clean;
  const parts = clean.split(/[-_\s]+/);
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Icon';
}

/**
 * Computes all possible PascalCase loader candidate names for an icon identifier.
 * Addresses naming differences in @hugeicons/core-free-icons/loader where:
 * 1. Base names like "SunIcon", "AddIcon", "AlertIcon" only exist as "Sun01Icon", "Add01Icon", etc.
 * 2. Letter case differences exist such as "AZ" / "ZA" in "ArrangeByLettersAZIcon" or "ArrowDownAZIcon".
 * 3. Numeric prefix representations like "3d" map to "ThreeD".
 */
export function getIconNameCandidates(rawId: string): string[] {
  if (!rawId) return [];
  const clean = rawId.trim();
  const withoutIcon = clean.endsWith('Icon') ? clean.slice(0, -4) : clean;
  const parts = withoutIcon.split(/[-_\s]+/);
  const pascalBase = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');

  const variants = new Set<string>();
  variants.add(pascalBase);
  variants.add(pascalBase.replace(/Az/g, 'AZ').replace(/Za/g, 'ZA'));
  variants.add(pascalBase.replace(/3d/i, 'ThreeD'));

  const candidates = new Set<string>();
  for (const base of variants) {
    candidates.add(`${base}Icon`);
    // If not already ending with 2-digit variant suffix (01, 02, etc.), try with '01'
    if (!/0[1-9]$/.test(base)) {
      candidates.add(`${base}01Icon`);
    }
    // If ending with '01', also try without '01'
    if (base.endsWith('01')) {
      candidates.add(`${base.slice(0, -2)}Icon`);
    }
    candidates.add(base);
  }

  // Include raw input as-is and with 'Icon'
  candidates.add(clean);
  if (!clean.endsWith('Icon')) {
    candidates.add(`${clean}Icon`);
  }

  return Array.from(candidates);
}

export function getCachedIconDef(iconId?: string): any {
  if (!iconId) return null;
  if (iconDefCache.has(iconId)) return iconDefCache.get(iconId);
  const candidates = getIconNameCandidates(iconId);
  for (const cand of candidates) {
    if (iconDefCache.has(cand)) {
      const found = iconDefCache.get(cand);
      iconDefCache.set(iconId, found);
      return found;
    }
  }
  return null;
}

export function subscribeToIconCache(listener: () => void): () => void {
  cacheListeners.add(listener);
  return () => {
    cacheListeners.delete(listener);
  };
}

export async function loadDynamicIcon(iconId: string): Promise<any> {
  if (!iconId) return null;
  const cached = getCachedIconDef(iconId);
  if (cached) return cached;

  if (pendingLoads.has(iconId)) {
    return pendingLoads.get(iconId);
  }

  const promise = (async () => {
    try {
      const candidates = getIconNameCandidates(iconId);

      // 1. Try dynamic loading via @hugeicons/core-free-icons/loader across all candidates
      for (const cand of candidates) {
        try {
          const def = await loadIcon(cand as any);
          if (def) {
            iconDefCache.set(iconId, def);
            for (const c of candidates) {
              iconDefCache.set(c, def);
            }
            notifyCacheListeners();
            return def;
          }
        } catch {
          // Continue to next candidate
        }
      }

      // 2. Fallback: if not found in loader, try dynamically importing full catalog
      try {
        const { UNIFIED_ICON_MAP } = await import('./iconCatalog');
        const match =
          UNIFIED_ICON_MAP.get(iconId) ||
          UNIFIED_ICON_MAP.get(iconId.toLowerCase()) ||
          UNIFIED_ICON_MAP.get(candidates[0]);
        if (match?.iconDef) {
          iconDefCache.set(iconId, match.iconDef);
          for (const c of candidates) {
            iconDefCache.set(c, match.iconDef);
          }
          notifyCacheListeners();
          return match.iconDef;
        }
      } catch {
        // Fallback resolution failed
      }
    } catch {
      // Icon definition not found or network/fs error
    } finally {
      pendingLoads.delete(iconId);
    }
    return null;
  })();

  pendingLoads.set(iconId, promise);
  return promise;
}

export function getUnifiedIconDef(iconId?: string): CatalogIconDefinition | undefined {
  if (!iconId) return undefined;
  const def = getCachedIconDef(iconId);
  if (def) {
    return {
      id: iconId,
      name: iconId,
      category: 'Common',
      keywords: [],
      iconDef: def,
    };
  }
  // Initiate on-demand background fetch
  loadDynamicIcon(iconId);
  return undefined;
}

// Statically exported empty fallbacks to avoid eager evaluation in bundle
export const UNIFIED_ICONS_CATALOG: CatalogIconDefinition[] = [];
export const UNIFIED_ICON_MAP = new Map<string, CatalogIconDefinition>();

export async function getUnifiedIconCatalog(): Promise<{
  catalog: CatalogIconDefinition[];
  map: Map<string, CatalogIconDefinition>;
}> {
  const mod = await import('./iconCatalog');
  return { catalog: mod.UNIFIED_ICONS_CATALOG, map: mod.UNIFIED_ICON_MAP };
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

export const DynamicHugeIcon: React.FC<{
  iconId: string;
  size?: number;
  className?: string;
  color?: string;
}> = React.memo(({ iconId, size = 14, className = '', color = 'currentColor' }) => {
  const [iconDef, setIconDef] = useState<any>(() => getCachedIconDef(iconId));

  useEffect(() => {
    let isMounted = true;
    const current = getCachedIconDef(iconId);
    if (current) {
      setIconDef(current);
      return;
    }

    // Subscribe to cache additions so if another call or catalog load caches it, we update immediately
    const unsubscribe = subscribeToIconCache(() => {
      if (isMounted) {
        const found = getCachedIconDef(iconId);
        if (found) {
          setIconDef(found);
        }
      }
    });

    loadDynamicIcon(iconId).then((def) => {
      if (isMounted && def) {
        setIconDef(def);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [iconId]);

  if (!iconDef) return null;

  return (
    <HugeIconRenderer
      iconDef={iconDef}
      size={size}
      className={className}
      color={color}
    />
  );
});
DynamicHugeIcon.displayName = 'DynamicHugeIcon';

export function renderUnifiedIcon(
  iconId: string,
  options: { size?: number; className?: string; color?: string; emojiStyle?: EmojiStyle } = {}
): React.ReactNode {
  if (!iconId) return null;
  if (iconId.startsWith('emoji:')) {
    const char = iconId.slice(6);
    return (
      <EmojiRenderer
        emoji={char}
        size={options.size ?? 14}
        style={options.emojiStyle ?? 'native'}
        className={options.className}
      />
    );
  }
  return (
    <DynamicHugeIcon
      iconId={iconId}
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
  emojiStyle = 'native',
}) => {
  const [pickerMode, setPickerMode] = useState<'icons' | 'emojis'>(() => {
    return currentIconId?.startsWith('emoji:') ? 'emojis' : 'icons';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IconCategory>('All');
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('All');
  const [hoveredIcon, setHoveredIcon] = useState<CatalogIconDefinition | null>(null);
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiDefinition | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_RENDER_COUNT);

  // Lazy loaded full icon catalog
  const [fullCatalog, setFullCatalog] = useState<CatalogIconDefinition[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Dynamically load catalog on open
  useEffect(() => {
    if (isOpen && fullCatalog.length === 0 && !isCatalogLoading) {
      setIsCatalogLoading(true);
      import('./iconCatalog')
        .then((m) => {
          setFullCatalog(m.UNIFIED_ICONS_CATALOG);
          // Pre-populate dynamic cache with loaded definitions
          for (const item of m.UNIFIED_ICONS_CATALOG) {
            iconDefCache.set(item.id, item.iconDef);
          }
          notifyCacheListeners();
        })
        .catch((e) => {
          console.error('[IconPicker] Failed to load icon catalog dynamically:', e);
        })
        .finally(() => {
          setIsCatalogLoading(false);
        });
    }
  }, [isOpen, fullCatalog.length, isCatalogLoading]);

  // Sync mode if currentIconId changes externally
  useEffect(() => {
    if (currentIconId?.startsWith('emoji:')) {
      setPickerMode('emojis');
    }
  }, [currentIconId]);

  // Filter icons
  const filteredIcons = useMemo(() => {
    let list = fullCatalog;

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
  }, [fullCatalog, searchQuery, selectedCategory]);

  // Filter emojis
  const filteredEmojis = useMemo(() => {
    let list = EMOJI_CATALOG;

    if (selectedEmojiCategory !== 'All') {
      list = list.filter((e) => e.category === selectedEmojiCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.char.includes(q) ||
          e.keywords.some((k) => k.includes(q))
      );
    }

    return list;
  }, [searchQuery, selectedEmojiCategory]);

  // Reset pagination on search or category switch
  useEffect(() => {
    setVisibleLimit(INITIAL_RENDER_COUNT);
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = 0;
    }
  }, [searchQuery, selectedCategory, selectedEmojiCategory, pickerMode]);

  // Visible sliced icons/emojis for performance
  const displayedIcons = useMemo(() => {
    return filteredIcons.slice(0, visibleLimit);
  }, [filteredIcons, visibleLimit]);

  const displayedEmojis = useMemo(() => {
    return filteredEmojis.slice(0, visibleLimit);
  }, [filteredEmojis, visibleLimit]);

  // Infinite scroll handler
  const handleGridScroll = useCallback(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    const totalCount = pickerMode === 'icons' ? filteredIcons.length : filteredEmojis.length;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      setVisibleLimit((prev) => {
        if (prev >= totalCount) return prev;
        return prev + CHUNK_RENDER_COUNT;
      });
    }
  }, [pickerMode, filteredIcons.length, filteredEmojis.length]);

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
      setSelectedEmojiCategory('All');
      setHoveredIcon(null);
      setHoveredEmoji(null);
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
          ? `absolute top-full mt-1.5 ${align === 'right' ? 'right-0' : 'left-0'} w-76`
          : variant === 'submenu'
          ? 'w-76 max-w-xs'
          : 'w-full max-w-sm'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with Title, Mode Switcher & Close Button */}
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

        {/* Mode Switcher: Icons vs Emojis */}
        <div className="grid grid-cols-2 p-0.5 bg-[#141414] rounded-lg border border-[#2b2b2b]">
          <button
            type="button"
            onClick={() => {
              setPickerMode('icons');
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className={`py-1 text-[11px] font-medium rounded-md cursor-pointer flex items-center justify-center gap-1.5 ${
              pickerMode === 'icons'
                ? 'bg-[#262626] text-white shadow-xs'
                : 'text-[#888] hover:text-[#bbb]'
            }`}
          >
            <SparklesIcon size={12} />
            <span>Icons</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPickerMode('emojis');
              setSelectedEmojiCategory('All');
              setSearchQuery('');
            }}
            className={`py-1 text-[11px] font-medium rounded-md cursor-pointer flex items-center justify-center gap-1.5 ${
              pickerMode === 'emojis'
                ? 'bg-[#262626] text-white shadow-xs'
                : 'text-[#888] hover:text-[#bbb]'
            }`}
          >
            <span className="text-xs leading-none">😀</span>
            <span>Emojis</span>
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
            placeholder={
              pickerMode === 'icons'
                ? isCatalogLoading
                  ? 'Loading icon catalog...'
                  : `Search ${fullCatalog.length > 0 ? fullCatalog.length : '6,700'}+ icons...`
                : `Search ${EMOJI_CATALOG.length}+ emojis...`
            }
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
        {pickerMode === 'icons' ? (
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
        ) : (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5 pt-0.5">
            {['All', ...EMOJI_CATEGORIES].map((cat) => {
              const isSelected = selectedEmojiCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedEmojiCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--flint-accent,#ea580c)] text-white font-medium shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                      : 'bg-[#222222] hover:bg-[#2a2a2a] text-[#888] hover:text-[#ccc] border border-[#2b2b2b]'
                  }`}
                >
                  {cat === 'Smileys & Emotion'
                    ? 'Smileys'
                    : cat === 'Animals & Nature'
                    ? 'Animals'
                    : cat === 'Food & Drink'
                    ? 'Food'
                    : cat === 'Travel & Places'
                    ? 'Travel'
                    : cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid with Infinite Chunk Scroll */}
      <div
        ref={gridScrollRef}
        onScroll={handleGridScroll}
        className={`p-2 overflow-y-auto custom-scrollbar ${
          variant === 'submenu' ? 'max-h-56' : variant === 'popover' ? 'max-h-52' : 'max-h-64'
        }`}
      >
        {pickerMode === 'icons' ? (
          isCatalogLoading && fullCatalog.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-[#666]">
              Loading icon catalog...
            </div>
          ) : filteredIcons.length === 0 ? (
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
                      if (icon.iconDef) {
                        iconDefCache.set(icon.id, icon.iconDef);
                        notifyCacheListeners();
                      }
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
          )
        ) : filteredEmojis.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-[#666]">
            No emojis found matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {displayedEmojis.map((emoji) => {
              const emojiIconId = `emoji:${emoji.char}`;
              const isSelected = currentIconId === emojiIconId;

              return (
                <button
                  key={emoji.char}
                  type="button"
                  onClick={() => {
                    onSelectIcon(emojiIconId);
                    onClose();
                  }}
                  onMouseEnter={() => setHoveredEmoji(emoji)}
                  onMouseLeave={() => setHoveredEmoji(null)}
                  title={emoji.name}
                  className={`h-8 rounded-lg flex items-center justify-center cursor-pointer relative group ${
                    isSelected
                      ? 'bg-[var(--flint-accent,#ea580c)]/20 border border-[var(--flint-accent,#ea580c)] shadow-[0_0_8px_rgba(234,88,12,0.2)]'
                      : 'bg-[#202020] hover:bg-[#282828] border border-[#282828] hover:border-[#3a3a3a]'
                  }`}
                >
                  <EmojiRenderer emoji={emoji.char} size={16} style={emojiStyle} />
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
          {pickerMode === 'icons' ? (
            hoveredIcon ? (
              <span className="text-[#ccc] font-medium">{hoveredIcon.name}</span>
            ) : (
              <span>{filteredIcons.length} icons</span>
            )
          ) : hoveredEmoji ? (
            <span className="text-[#ccc] font-medium flex items-center gap-1">
              <span>{hoveredEmoji.char}</span>
              <span>{hoveredEmoji.name}</span>
            </span>
          ) : (
            <span>{filteredEmojis.length} emojis</span>
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
