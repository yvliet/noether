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
      className={`flint-switch ${trackWidth} ${trackHeight} disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <span
        className={`flint-switch-knob ${knobSize} ${
          checked ? knobTranslate : 'translate-x-0'
        }`}
      />
    </button>
  );
});
