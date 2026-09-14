import React, { useState, useEffect } from 'react';
import type { ExtensionIconConfig, ExtensionIconBackgroundType } from '@/core/extensions/types';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  getCachedIconDef,
  loadDynamicIcon,
  subscribeToIconCache,
} from '@/components/common/IconPicker';
import {
  BookOpen02Icon,
  SparklesIcon,
  StickyNote02Icon,
  Brain02Icon,
  PencilEdit02Icon,
  Download01Icon,
  DatabaseSync01Icon,
  Motion01Icon,
  Store01Icon,
  PuzzleIcon,
  PackageIcon,
  Folder01Icon,
  File01Icon,
  Tag01Icon,
  TerminalIcon,
  Bookmark01Icon,
  CheckmarkSquare02Icon,
  Calendar01Icon,
  GridTableIcon,
  NeuralNetworkIcon,
  CommandIcon,
  HashIcon,
  LeftToRightListBulletIcon,
  Link01Icon,
  DashboardSquare01Icon,
  HistoryIcon,
} from '@/components/common/Icons';

export interface ExtensionAppIconProps {
  /**
   * Icon glyph name, structured ExtensionIconConfig, or custom React node.
   */
  icon?: string | ExtensionIconConfig | React.ReactNode;
  /**
   * Optional standalone icon styling configuration.
   */
  iconConfig?: ExtensionIconConfig;
  /**
   * Optional fallback display name used for title or icon inference.
   */
  name?: string;
  /**
   * Outer square dimension in pixels. Defaults to 38.
   */
  size?: number;
  /**
   * Optional extra container CSS class names.
   */
  className?: string;
}

/**
 * Fast synchronous map for common built-in icons to guarantee instant 0ms initial paint.
 */
const FAST_STATIC_ICON_MAP: Record<string, React.ComponentType<any>> = {
  book: BookOpen02Icon,
  'book-open': BookOpen02Icon,
  'book-open-02': BookOpen02Icon,
  cascade: BookOpen02Icon,
  sparkle: SparklesIcon,
  sparkles: SparklesIcon,
  copilot: SparklesIcon,
  ai: SparklesIcon,
  'sticky-note': StickyNote02Icon,
  'sticky-note-02': StickyNote02Icon,
  quicknote: StickyNote02Icon,
  brain: Brain02Icon,
  'brain-02': Brain02Icon,
  fsrs: Brain02Icon,
  'spaced-repetition': Brain02Icon,
  pencil: PencilEdit02Icon,
  'pencil-edit': PencilEdit02Icon,
  'pencil-edit-02': PencilEdit02Icon,
  sketch: PencilEdit02Icon,
  download: Download01Icon,
  'download-01': Download01Icon,
  inbox: Download01Icon,
  sync: DatabaseSync01Icon,
  'database-sync': DatabaseSync01Icon,
  'database-sync-01': DatabaseSync01Icon,
  motion: Motion01Icon,
  'motion-01': Motion01Icon,
  canvas: DashboardSquare01Icon,
  'dashboard-square': DashboardSquare01Icon,
  'dashboard-square-01': DashboardSquare01Icon,
  folder: Folder01Icon,
  'folder-01': Folder01Icon,
  file: File01Icon,
  'file-01': File01Icon,
  tag: Tag01Icon,
  'tag-01': Tag01Icon,
  bookmark: Bookmark01Icon,
  'bookmark-01': Bookmark01Icon,
  task: CheckmarkSquare02Icon,
  tasks: CheckmarkSquare02Icon,
  'checkmark-square': CheckmarkSquare02Icon,
  'checkmark-square-02': CheckmarkSquare02Icon,
  calendar: Calendar01Icon,
  'calendar-01': Calendar01Icon,
  journal: Calendar01Icon,
  command: CommandIcon,
  terminal: TerminalIcon,
  table: GridTableIcon,
  tables: GridTableIcon,
  'grid-table': GridTableIcon,
  graph: NeuralNetworkIcon,
  'graph-view': NeuralNetworkIcon,
  'neural-network': NeuralNetworkIcon,
  hash: HashIcon,
  outline: LeftToRightListBulletIcon,
  'left-to-right-list-bullet': LeftToRightListBulletIcon,
  link: Link01Icon,
  'link-01': Link01Icon,
  history: HistoryIcon,
  'version-history': HistoryIcon,
  package: PackageIcon,
  puzzle: PuzzleIcon,
  store: Store01Icon,
  'store-01': Store01Icon,
};

/**
 * Curated fallback gradients dynamically chosen via deterministic string hashing
 * when an extension manifest does not specify any gradient or background color.
 */
const CURATED_GRADIENTS: [string, string][] = [
  ['#3b82f6', '#1d4ed8'], // Royal Blue
  ['#8b5cf6', '#6d28d9'], // Vivid Violet
  ['#ec4899', '#be185d'], // Modern Rose
  ['#10b981', '#047857'], // Emerald Green
  ['#f59e0b', '#b45309'], // Warm Amber
  ['#06b6d4', '#0e7490'], // Ocean Cyan
  ['#f43f5e', '#be123c'], // Crimson Rose
  ['#6366f1', '#4338ca'], // Deep Indigo
  ['#14b8a6', '#0f766e'], // Modern Teal
  ['#84cc16', '#4d7c0f'], // Fresh Lime
  ['#f97316', '#c2410c'], // Tangerine Orange
  ['#0ea5e9', '#0369a1'], // Sky Blue
  ['#a855f7', '#7e22ce'], // Electric Purple
  ['#64748b', '#334155'], // Slate Gray
];

/**
 * Known default gradients for built-in core extensions when omitted from older manifests.
 */
const KNOWN_CORE_GRADIENTS: Record<string, [string, string]> = {
  history: ['#0ea5e9', '#0284c7'],
  'version-history': ['#0ea5e9', '#0284c7'],
  bookmarks: ['#f59e0b', '#d97706'],
  bookmark: ['#f59e0b', '#d97706'],
  canvas: ['#ec4899', '#db2777'],
  defaults: ['#64748b', '#475569'],
  command: ['#64748b', '#475569'],
  graph: ['#8b5cf6', '#7c3aed'],
  journal: ['#10b981', '#059669'],
  calendar: ['#10b981', '#059669'],
  marketplace: ['#f43f5e', '#e11d48'],
  'more-icons': ['#a855f7', '#9333ea'],
  outline: ['#3b82f6', '#2563eb'],
  properties: ['#14b8a6', '#0d9488'],
  tables: ['#84cc16', '#65a30d'],
  tags: ['#eab308', '#ca8a04'],
  tasks: ['#22c55e', '#16a34a'],
  backlinks: ['#6366f1', '#4f46e5'],
  sync: ['#059669', '#047857'],
};

/**
 * Hashes an identifier string into a deterministic gradient from the curated palette.
 */
function hashStringToGradient(str: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CURATED_GRADIENTS.length;
  return CURATED_GRADIENTS[index];
}

/**
 * Computes a harmonious deeper companion tone from a single hex color to create a gradient.
 */
function generateCompanionGradientColor(hex: string): string {
  const clean = hex.replace(/^#/, '');
  let r = 0;
  let g = 0;
  let b = 0;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else {
    return hex;
  }

  const factor = 0.82;
  const newR = Math.max(0, Math.min(255, Math.round(r * factor)));
  const newG = Math.max(0, Math.min(255, Math.round(g * factor)));
  const newB = Math.max(0, Math.min(255, Math.round(b * factor)));

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Dynamically loads and renders any HugeIcon on demand, updating seamlessly when resolved.
 */
const DynamicExtensionGlyph: React.FC<{
  glyphName: string;
  size: number;
  fallbackIcon: React.ComponentType<any>;
}> = React.memo(({ glyphName, size, fallbackIcon: FallbackIcon }) => {
  const [iconDef, setIconDef] = useState<any>(() => getCachedIconDef(glyphName));

  useEffect(() => {
    let isMounted = true;
    const current = getCachedIconDef(glyphName);
    if (current) {
      setIconDef(current);
      return;
    }

    const unsubscribe = subscribeToIconCache(() => {
      if (isMounted) {
        const found = getCachedIconDef(glyphName);
        if (found) setIconDef(found);
      }
    });

    loadDynamicIcon(glyphName).then((def) => {
      if (isMounted && def) {
        setIconDef(def);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [glyphName]);

  if (iconDef) {
    return (
      <HugeiconsIcon
        icon={iconDef}
        size={size}
        color="white"
        strokeWidth={1.8}
        className="text-white shrink-0 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]"
      />
    );
  }

  return (
    <FallbackIcon
      size={size}
      strokeWidth={1.8}
      className="text-white shrink-0 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]"
    />
  );
});
DynamicExtensionGlyph.displayName = 'DynamicExtensionGlyph';

/**
 * Standard Noether extension icon component.
 *
 * Renders a tactile squircle container with customizable solid or gradient backgrounds,
 * a crisp light sheen outline along the top edge, and an immutable white icon glyph.
 *
 * Fully modular and manifest-driven: dynamically resolves any HugeIcon, custom SVG,
 * or image asset without requiring manual code registration. Emojis are disallowed.
 *
 * @since 0.4.0
 */
export const ExtensionAppIcon: React.FC<ExtensionAppIconProps> = ({
  icon,
  iconConfig,
  name,
  size = 38,
  className = '',
}) => {
  // 1. Extract structured config from icon prop or standalone iconConfig
  let resolvedConfig: ExtensionIconConfig = {};
  let directNode: React.ReactNode = null;

  if (React.isValidElement(icon)) {
    directNode = icon;
  } else if (icon && typeof icon === 'object') {
    resolvedConfig = { ...(icon as ExtensionIconConfig) };
  } else if (typeof icon === 'string') {
    const trimmed = icon.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        resolvedConfig = JSON.parse(trimmed);
      } catch {
        resolvedConfig = { name: trimmed };
      }
    } else {
      resolvedConfig = { name: trimmed };
    }
  }

  // Merge any explicit iconConfig prop overrides
  if (iconConfig) {
    resolvedConfig = { ...resolvedConfig, ...iconConfig };
  }

  // Determine glyph identifier
  const glyphName =
    resolvedConfig.name ||
    (typeof icon === 'string' && !icon.trim().startsWith('{') ? icon.trim() : name);

  // 2. Compute background style (solid vs gradient)
  const isSolid = resolvedConfig.type === 'solid';
  const backgroundStyle: React.CSSProperties = {};

  if (isSolid && resolvedConfig.backgroundColor) {
    backgroundStyle.backgroundColor = resolvedConfig.backgroundColor;
  } else {
    const dir = resolvedConfig.gradientDirection
      ? typeof resolvedConfig.gradientDirection === 'number'
        ? `${resolvedConfig.gradientDirection}deg`
        : resolvedConfig.gradientDirection
      : '135deg';

    let gradientStops: [string, string] | string[];

    if (resolvedConfig.gradientColors && resolvedConfig.gradientColors.length >= 2) {
      gradientStops = resolvedConfig.gradientColors;
    } else if (resolvedConfig.backgroundColor) {
      gradientStops = [
        resolvedConfig.backgroundColor,
        generateCompanionGradientColor(resolvedConfig.backgroundColor),
      ];
    } else {
      const normalizedKey = (glyphName || name || '')
        .toLowerCase()
        .trim()
        .replace(/^noether-/, '');
      gradientStops =
        KNOWN_CORE_GRADIENTS[normalizedKey] ||
        hashStringToGradient(normalizedKey || 'extension');
    }

    backgroundStyle.backgroundImage = `linear-gradient(${dir}, ${gradientStops.join(', ')})`;
  }

  // Geometry dimensions
  const borderRadius = Math.max(6, Math.round(size * 0.22));
  const glyphSize = Math.round(size * 0.52);

  // 3. Render icon glyph
  const renderGlyph = () => {
    // 1. Direct React element
    if (directNode) {
      return (
        <div className="text-white flex items-center justify-center [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]">
          {directNode}
        </div>
      );
    }

    if (!glyphName) {
      return (
        <PackageIcon
          size={glyphSize}
          strokeWidth={1.8}
          className="text-white shrink-0 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]"
        />
      );
    }

    // 2. Remote image or Data URI
    if (
      glyphName.startsWith('http://') ||
      glyphName.startsWith('https://') ||
      glyphName.startsWith('data:image')
    ) {
      return (
        <img
          src={glyphName}
          alt={name || 'Extension icon'}
          className="object-contain select-none pointer-events-none brightness-0 invert [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]"
          style={{ width: glyphSize, height: glyphSize }}
          loading="lazy"
        />
      );
    }

    // 3. Raw SVG string
    if (glyphName.trim().startsWith('<svg')) {
      return (
        <div
          style={{ width: glyphSize, height: glyphSize }}
          className="flex items-center justify-center text-white shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:fill-current [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]"
          dangerouslySetInnerHTML={{ __html: glyphName }}
        />
      );
    }

    // 4. Emojis are strictly disallowed as extension icons.
    // If an extension attempts to declare an emoji, log a dev warning and fall back to PackageIcon.
    if (
      glyphName.startsWith('emoji:') ||
      glyphName.startsWith(':emoji:') ||
      /\p{Extended_Pictographic}/u.test(glyphName)
    ) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[ExtensionAppIcon] Emojis are disallowed for extension icons ("${glyphName}"). Please declare a HugeIcon identifier (e.g. 'clock-01', 'sparkles') or custom SVG instead.`
        );
      }
      return (
        <PackageIcon
          size={glyphSize}
          strokeWidth={1.8}
          className="text-white shrink-0 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]"
        />
      );
    }

    // 5. Fast synchronous match in pre-imported core map
    const normalizedKey = glyphName.toLowerCase().trim().replace(/^noether-/, '');
    const StaticComp = FAST_STATIC_ICON_MAP[normalizedKey] || FAST_STATIC_ICON_MAP[glyphName];
    if (StaticComp) {
      return (
        <StaticComp
          size={glyphSize}
          strokeWidth={1.8}
          className="text-white shrink-0 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]"
        />
      );
    }

    // 6. Dynamic HugeIcon loader for ANY icon in @hugeicons/core-free-icons
    return (
      <DynamicExtensionGlyph
        glyphName={glyphName}
        size={glyphSize}
        fallbackIcon={PackageIcon}
      />
    );
  };

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 overflow-hidden select-none shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius,
        ...backgroundStyle,
      }}
    >
      {/* 1. Consistent tactile light sheen outline rim */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.16)',
        }}
      />

      {/* 2. Centered pure white icon glyph (immutable color) */}
      <div className="relative z-10 flex items-center justify-center text-white">
        {renderGlyph()}
      </div>
    </div>
  );
};

export default ExtensionAppIcon;

