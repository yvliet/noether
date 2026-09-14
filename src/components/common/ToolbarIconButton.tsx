/**
 * @module ToolbarIconButton
 * @description
 * Universal, theme-reactive icon button component for headers, viewports, corner slots,
 * and extension action rails. Automatically adapts to dark, light, and custom community
 * themes via centralized CSS variables (--noether-btn-hover-bg, --noether-btn-active-bg).
 *
 * Performance Invariant:
 * Zero artificial CSS transitions or animations for instantaneous native desktop feel.
 */

import React from 'react';

export interface ToolbarIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Optional icon element to render inside button */
  icon?: React.ReactNode;
  /** Whether the button is currently in an active / toggled-on state */
  isActive?: boolean;
  /** Optional dynamic badge indicator */
  badge?: React.ReactNode;
}

export const ToolbarIconButton = React.forwardRef<HTMLButtonElement, ToolbarIconButtonProps>(
  ({ icon, children, isActive, badge, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        data-active={isActive ? 'true' : undefined}
        className={`noether-toolbar-btn ${isActive ? 'active' : ''} ${className}`.trim()}
        {...props}
      >
        {icon || children}
        {badge}
      </button>
    );
  }
);

ToolbarIconButton.displayName = 'ToolbarIconButton';

export default ToolbarIconButton;
