import React from 'react';
import { RotateCcwIcon } from '@/components/common/Icons';

export interface SettingItemProps {
  /** Title of the setting */
  name: React.ReactNode;
  /** Explanatory subtitle or description */
  description?: React.ReactNode;
  /** Right-aligned interactive control element (Toggle, Select, Input, Button, Slider, etc.) */
  control?: React.ReactNode;
  /** Alternative to `control` prop via standard JSX children */
  children?: React.ReactNode;
  /** Whether the field is currently modified from its default value */
  isModified?: boolean;
  /** Callback triggered when the reset button is clicked */
  onReset?: () => void;
  /** Hover tooltip for the reset button */
  resetTitle?: string;
  /** Additional container className */
  className?: string;
  /** Additional className for the control wrapper */
  controlClassName?: string;
}

/**
 * Obsidian-grade single setting item row.
 * Displays a descriptive title and subtitle on the left, with controls and optional reset icon on the right.
 */
export const SettingItem: React.FC<SettingItemProps> = ({
  name,
  description,
  control,
  children,
  isModified = false,
  onReset,
  resetTitle = 'Restore default',
  className = '',
  controlClassName = '',
}) => {
  const effectiveControl = control !== undefined ? control : children;

  return (
    <div className={`flex items-center justify-between p-4 ${className}`}>
      <div className="flex flex-col pr-4 min-w-0 flex-1">
        <span className="text-[13px] font-normal text-[var(--flint-text-secondary,#dcddde)]">
          {name}
        </span>
        {description && (
          <span className="text-[11px] text-[var(--flint-text-muted,#777777)] mt-0.5">
            {description}
          </span>
        )}
      </div>

      <div className={`flex items-center gap-2 shrink-0 ${controlClassName}`}>
        {isModified && onReset && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            title={resetTitle}
            className="p-1 rounded-md text-[var(--flint-text-muted,#777777)] hover:text-[var(--flint-text-primary,#ffffff)] hover:bg-[var(--flint-bg-card-hover,#282828)] cursor-pointer shrink-0 flex items-center justify-center outline-none"
          >
            <RotateCcwIcon size={13} />
          </button>
        )}
        {effectiveControl}
      </div>
    </div>
  );
};
