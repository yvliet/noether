import React from 'react';
import type { ExtensionIconConfig, ExtensionIconBackgroundType } from '@/core/extensions/types';
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
 * Maps known icon names or extension slugs to their corresponding Hugeicon component.
 */
function resolveIconComponent(rawName?: string): React.ComponentType<any> {
  if (!rawName) return Store01Icon;

  const key = rawName.toLowerCase().trim().replace(/^noether-/, '').replace(/^flint-/, '');

  switch (key) {
    case 'book':
    case 'book-open':
    case 'book-open-02':
    case 'bookopen02':
    case 'cascade':
      return BookOpen02Icon;

    case 'sparkle':
    case 'sparkles':
    case 'copilot':
    case 'ai':
      return SparklesIcon;

    case 'sticky-note':
    case 'sticky-note-02':
    case 'stickynote02':
    case 'quicknote':
    case 'note':
      return StickyNote02Icon;

    case 'brain':
    case 'brain-02':
    case 'brain02':
    case 'fsrs':
    case 'spaced-repetition':
    case 'flashcards':
      return Brain02Icon;

    case 'pencil':
    case 'pencil-edit':
    case 'pencil-edit-02':
    case 'penciledit02':
    case 'sketch':
    case 'sketch2text':
    case 'draw':
      return PencilEdit02Icon;

    case 'download':
    case 'download-01':
    case 'download01':
    case 'inbox':
    case 'inbox-download':
      return Download01Icon;

    case 'sync':
    case 'cloud':
    case 'database':
    case 'database-sync':
    case 'database-sync-01':
    case 'databasesync01':
      return DatabaseSync01Icon;

    case 'motion':
    case 'motion-01':
    case 'motion01':
      return Motion01Icon;

    case 'folder':
    case 'folder-01':
      return Folder01Icon;

    case 'file':
    case 'file-01':
      return File01Icon;

    case 'tag':
    case 'tag-01':
      return Tag01Icon;

    case 'bookmark':
    case 'bookmark-01':
      return Bookmark01Icon;

    case 'tasks':
    case 'task':
    case 'todo':
    case 'checkmark':
      return CheckmarkSquare02Icon;

    case 'calendar':
    case 'journal':
      return Calendar01Icon;

    case 'command':
    case 'cmd':
      return CommandIcon;

    case 'terminal':
    case 'code':
      return TerminalIcon;

    case 'table':
    case 'tables':
    case 'grid':
    case 'grid-table':
      return GridTableIcon;

    case 'graph':
    case 'graph-view':
    case 'neural-network':
    case 'network':
      return NeuralNetworkIcon;

    case 'hash':
    case 'hashtag':
      return HashIcon;

    case 'outline':
    case 'list':
    case 'toc':
    case 'headings':
    case 'left-to-right-list-bullet':
      return LeftToRightListBulletIcon;

    case 'link':
    case 'links':
    case 'backlink':
    case 'backlinks':
    case 'link-01':
      return Link01Icon;

    case 'package':
      return PackageIcon;

    case 'puzzle':
      return PuzzleIcon;

    default:
      return Store01Icon;
  }
}

/**
 * Resolves sensible default gradient colors for known extensions when not explicitly specified in the manifest.
 */
function resolveDefaultGradient(rawKey?: string): [string, string] {
  if (!rawKey) return ['#2b2b36', '#1c1c24'];

  const key = rawKey.toLowerCase().trim().replace(/^noether-/, '').replace(/^flint-/, '');

  switch (key) {
    case 'cascade':
    case 'book':
    case 'book-open':
    case 'book-open-02':
      return ['#312e81', '#1e1b4b']; // Deep Indigo

    case 'copilot':
    case 'sparkles':
    case 'ai':
      return ['#9333ea', '#6b21a8']; // Cosmic Purple

    case 'quicknote':
    case 'sticky-note':
    case 'sticky-note-02':
    case 'inbox':
      return ['#0284c7', '#0369a1']; // Vibrant Sky Blue

    case 'fsrs':
    case 'spaced-repetition':
    case 'brain':
    case 'brain-02':
      return ['#ec4899', '#be185d']; // Modern Rose

    case 'sketch':
    case 'sketch2text':
    case 'pencil':
    case 'pencil-edit':
    case 'pencil-edit-02':
      return ['#8b5cf6', '#6d28d9']; // Vivid Violet

    case 'sync':
    case 'universal-sync':
      return ['#059669', '#047857']; // Emerald Green

    default:
      return ['#2d2d38', '#1c1c22'];
  }
}

/**
 * Standard Noether extension icon component.
 *
 * Renders a tactile squircle container with customizable solid or gradient backgrounds,
 * a crisp light sheen outline along the top edge, and an immutable white icon glyph.
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
  const glyphName = resolvedConfig.name || (typeof icon === 'string' && !icon.trim().startsWith('{') ? icon.trim() : name);

  // 2. Compute background style (solid vs gradient)
  const isSolid = resolvedConfig.type === 'solid' || (resolvedConfig.backgroundColor && !resolvedConfig.gradientColors);
  const backgroundStyle: React.CSSProperties = {};

  if (isSolid) {
    backgroundStyle.backgroundColor = resolvedConfig.backgroundColor || '#2563eb';
  } else {
    const defaultStops = resolveDefaultGradient(glyphName || name);
    const gradientStops = resolvedConfig.gradientColors && resolvedConfig.gradientColors.length >= 2
      ? resolvedConfig.gradientColors
      : (resolvedConfig.backgroundColor ? [resolvedConfig.backgroundColor, resolvedConfig.backgroundColor] : defaultStops);

    const dir = resolvedConfig.gradientDirection
      ? (typeof resolvedConfig.gradientDirection === 'number' ? `${resolvedConfig.gradientDirection}deg` : resolvedConfig.gradientDirection)
      : '180deg';

    backgroundStyle.backgroundImage = `linear-gradient(${dir}, ${gradientStops.join(', ')})`;
  }

  // Geometry dimensions
  const borderRadius = Math.max(6, Math.round(size * 0.22));
  const glyphSize = Math.round(size * 0.52);

  // 3. Render icon glyph
  const renderGlyph = () => {
    if (directNode) {
      return (
        <div className="text-white flex items-center justify-center [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]">
          {directNode}
        </div>
      );
    }

    if (glyphName && (glyphName.startsWith('http://') || glyphName.startsWith('https://') || glyphName.startsWith('data:image'))) {
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

    const IconComp = resolveIconComponent(glyphName);
    return (
      <IconComp
        size={glyphSize}
        strokeWidth={1.8}
        className="text-white shrink-0 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]"
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
