import React from 'react';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Use monospace font stack (e.g. for code, formatting tokens, paths) */
  isMono?: boolean;
}

/**
 * Obsidian-grade single-line text input control.
 * Uses semantic theme input backgrounds and borders with inset shadow.
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(({
  isMono = false,
  className = '',
  type = 'text',
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={`bg-[var(--flint-bg-input,#181818)] border border-[var(--flint-border-strong,#383838)] focus:border-[var(--flint-accent,#ea580c)] text-[var(--flint-text-primary,#ffffff)] text-xs rounded-[5px] px-3 py-1.5 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] disabled:opacity-40 disabled:cursor-not-allowed ${
        isMono ? 'font-mono' : ''
      } ${className}`}
      {...props}
    />
  );
});

TextInput.displayName = 'TextInput';
