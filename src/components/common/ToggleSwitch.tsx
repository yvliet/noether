import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = React.memo(({
  checked,
  onChange,
  title,
  disabled = false,
  className = '',
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const trackWidth = isSm ? 'w-[28px]' : 'w-[34px]';
  const trackHeight = isSm ? 'h-[16px]' : 'h-[20px]';
  const knobSize = isSm ? 'h-[12px] w-[12px]' : 'h-[14px] w-[14px]';
  const knobTranslate = isSm ? 'translate-x-[12px]' : 'translate-x-[14px]';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`relative inline-flex ${trackWidth} ${trackHeight} shrink-0 cursor-pointer rounded-full p-[2px] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.35)] focus-visible:ring-1 focus-visible:ring-[var(--flint-accent,#ea580c)] disabled:opacity-40 disabled:cursor-not-allowed ${
        checked
          ? 'bg-[var(--flint-accent,#ea580c)] border border-transparent hover:brightness-105'
          : 'bg-[#333333] border border-[#404040] hover:bg-[#3a3a3a] hover:border-[#4c4c4c]'
      } ${className}`}
    >
      <span
        className={`pointer-events-none inline-block ${knobSize} rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
          checked ? knobTranslate : 'translate-x-0'
        }`}
      />
    </button>
  );
});
