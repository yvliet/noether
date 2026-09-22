/**
 * @module SidebarActionHeader
 * @description
 * Modular, standardized action header container and button suite for Noether sidebars,
 * docks, and custom extension views.
 *
 * Guarantees pixel-perfect Y-baseline alignment with the Action Rail top icon
 * (y = 49px) and unified button dimensions (28x28px, 16px icons, 2px gaps).
 *
 * Performance Invariant:
 * Instant hover and click responsiveness with zero artificial CSS transition latency.
 */

import React from 'react';

export interface SidebarActionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional child action buttons, dropdowns, or controls */
  children?: React.ReactNode;
  /** Optional additional CSS classes */
  className?: string;
  /** Whether to render a bottom border separator */
  borderBottom?: boolean;
}

/**
 * Standardized top action bar container for sidebar views and docked panels.
 */
export const SidebarActionHeader: React.FC<SidebarActionHeaderProps> = React.memo(({
  children,
  className = '',
  borderBottom = false,
  ...props
}) => {
  return (
    <div
      className={`h-9 mt-1 px-2 flex items-center justify-center gap-0.5 text-[var(--noether-text-muted,#888)] shrink-0 select-none ${
        borderBottom ? 'border-b border-[var(--noether-border-base,rgba(255,255,255,0.08))]' : ''
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

SidebarActionHeader.displayName = 'SidebarActionHeader';

export interface SidebarActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon element (rendered at 16px by convention) */
  icon?: React.ReactNode;
  /** Active toggle state */
  isActive?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Standardized 28x28px action button for use inside SidebarActionHeader or sidebar views.
 */
export const SidebarActionButton = React.forwardRef<HTMLButtonElement, SidebarActionButtonProps>(
  ({ icon, children, isActive = false, disabled = false, className = '', title, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        title={title}
        aria-label={props['aria-label'] || (typeof title === 'string' ? title : undefined)}
        data-active={isActive ? 'true' : undefined}
        className={`w-7 h-7 rounded-md flex items-center justify-center select-none cursor-pointer outline-none border-none transition-none ${
          disabled
            ? 'opacity-35 text-[var(--noether-text-muted,#888)] cursor-not-allowed pointer-events-none'
            : isActive
            ? 'text-[var(--noether-text-primary,#fff)] bg-[var(--noether-bg-sidebar-active,#272727)]'
            : 'text-[var(--noether-text-muted,#888)] hover:text-[var(--noether-text-primary,#fff)] hover:bg-[var(--noether-bg-sidebar-hover,#1f1f1f)]'
        } ${className}`.trim()}
        {...props}
      >
        {icon || children}
      </button>
    );
  }
);

SidebarActionButton.displayName = 'SidebarActionButton';

export default SidebarActionHeader;
