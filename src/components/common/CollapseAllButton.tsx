import React from 'react';
import { ArrowExpand01Icon, ArrowShrink02Icon } from '@/components/common/Icons';

export interface CollapseAllButtonProps {
  /**
   * Whether the target container or items are currently all collapsed.
   */
  isCollapsed: boolean;
  /**
   * Action to toggle collapse/expand state.
   */
  onToggle: () => void;
  /**
   * If true, dims out the button and makes it unclickable (e.g. when there are no collapsible items).
   */
  disabled?: boolean;
  /**
   * Explicit title / tooltip override.
   */
  title?: string;
  /**
   * Tooltip to show when items are currently collapsed (action will expand). Defaults to 'Expand all'.
   */
  collapsedTitle?: string;
  /**
   * Tooltip to show when items are currently expanded (action will collapse). Defaults to 'Collapse all'.
   */
  expandedTitle?: string;
  /**
   * Tooltip to show when button is disabled. Defaults to 'Nothing to collapse or expand'.
   */
  disabledTitle?: string;
  /**
   * Icon size in pixels. Defaults to 14.
   */
  size?: number;
  /**
   * Optional additional class name.
   */
  className?: string;
}

/**
 * Standardized Flint Collapse All / Expand All toggle button.
 * Adheres to Flint GEMINI.md Rule 6: instant hover and click with zero artificial animation delay.
 */
export const CollapseAllButton: React.FC<CollapseAllButtonProps> = React.memo(({
  isCollapsed,
  onToggle,
  disabled = false,
  title,
  collapsedTitle = 'Expand all',
  expandedTitle = 'Collapse all',
  disabledTitle = 'Nothing to collapse or expand',
  size = 14,
  className = '',
}) => {
  const computedTitle = disabled
    ? (title || disabledTitle)
    : (title || (isCollapsed ? collapsedTitle : expandedTitle));

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onToggle}
      title={computedTitle}
      aria-label={computedTitle}
      className={`p-1.5 rounded select-none ${
        disabled
          ? 'opacity-35 text-[var(--flint-text-muted)] cursor-not-allowed pointer-events-none'
          : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer'
      } ${className}`}
    >
      {isCollapsed ? (
        <ArrowExpand01Icon size={size} />
      ) : (
        <ArrowShrink02Icon size={size} />
      )}
    </button>
  );
});

CollapseAllButton.displayName = 'CollapseAllButton';
