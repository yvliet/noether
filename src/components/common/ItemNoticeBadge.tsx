import React from 'react';

export type NoticeBadgeVariant = 'dot' | 'count';
export type NoticeBadgeTone = 'warning' | 'info' | 'error' | 'success' | 'muted';

export interface ItemNoticeBadgeProps {
  variant?: NoticeBadgeVariant;
  count?: number;
  maxCount?: number;
  tone?: NoticeBadgeTone;
  tooltip?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

const TONE_TEXT_CLASSES: Record<NoticeBadgeTone, string> = {
  warning: 'text-amber-400',
  info: 'text-sky-400',
  error: 'text-rose-400',
  success: 'text-emerald-400',
  muted: 'text-[var(--flint-text-muted,#888888)]',
};

const TONE_DOT_CLASSES: Record<NoticeBadgeTone, string> = {
  warning: 'bg-amber-400',
  info: 'bg-sky-400',
  error: 'bg-rose-400',
  success: 'bg-emerald-400',
  muted: 'bg-[var(--flint-text-muted,#888888)]',
};

/**
 * General-purpose modular notification badge for tree items, tabs, and headers.
 * Supports clean circular dots or bare numeric counts rendered in the default UI font (not monospace).
 */
export const ItemNoticeBadge: React.FC<ItemNoticeBadgeProps> = React.memo(({
  variant = 'count',
  count,
  maxCount = 99,
  tone = 'warning',
  tooltip,
  position = 'bottom',
  className = '',
  onClick,
}) => {
  if (variant === 'count' && (count === undefined || count <= 0)) {
    return null;
  }

  const tooltipAttr = tooltip ? { 'data-tooltip': tooltip, 'data-tooltip-position': position } : {};

  if (variant === 'dot') {
    return (
      <span
        {...tooltipAttr}
        onClick={onClick}
        style={{ width: 6, height: 6, minWidth: 6, minHeight: 6, maxWidth: 6, maxHeight: 6, aspectRatio: '1 / 1' }}
        className={`w-[6px] h-[6px] min-w-[6px] min-h-[6px] max-w-[6px] max-h-[6px] aspect-square rounded-full shrink-0 select-none cursor-help ${TONE_DOT_CLASSES[tone]} ${className}`}
        aria-label="Notice indicator"
      />
    );
  }

  // Bare number display without background box, using default font (font-sans / native system font, never monospace)
  const displayCount = count !== undefined && count > maxCount ? `${maxCount}+` : String(count);

  return (
    <span
      {...tooltipAttr}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-sans text-[11px] font-medium leading-none select-none shrink-0 cursor-help ${TONE_TEXT_CLASSES[tone]} ${className}`}
      aria-label={`${count} notices`}
    >
      {displayCount}
    </span>
  );
});

ItemNoticeBadge.displayName = 'ItemNoticeBadge';
