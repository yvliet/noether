import React from 'react';

export type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

/**
 * Obsidian-grade native desktop button component.
 * Adheres strictly to Flint GEMINI.md Rule 6 (Zero artificial transitions/animations for instant native feel).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'default',
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  disabled = false,
  children,
  ...props
}, ref) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs';

  let variantClasses = '';
  switch (variant) {
    case 'primary':
      variantClasses = 'obsidian-btn obsidian-btn-primary';
      break;
    case 'danger':
      variantClasses = 'obsidian-btn obsidian-btn-danger';
      break;
    case 'ghost':
      variantClasses = 'inline-flex items-center justify-center gap-1.5 rounded-[5px] text-[var(--flint-text-muted,#888)] hover:text-[var(--flint-text-primary,#fff)] hover:bg-[var(--flint-bg-card-hover,#282828)] cursor-pointer select-none outline-none disabled:opacity-40 disabled:cursor-not-allowed';
      break;
    case 'default':
    default:
      variantClasses = 'obsidian-btn';
      break;
  }

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={`${variantClasses} ${sizeClasses} cursor-pointer inline-flex items-center justify-center gap-1.5 select-none ${className}`}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
});

Button.displayName = 'Button';
