import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDownIcon, CheckIcon } from '@/components/common/Icons';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  description?: string;
}

export interface CustomSelectProps<T = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

function CustomSelectInner<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  disabled = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    minWidth: number;
    maxHeight: number;
  }>({ minWidth: 130, maxHeight: 240 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(240, options.length * 36 + 12);

    let top: number | undefined;
    let bottom: number | undefined;
    let maxHeight = 240;

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      // Position above
      bottom = viewportHeight - rect.top + 4;
      maxHeight = Math.max(100, Math.min(240, spaceAbove - 12));
    } else {
      // Position below
      top = rect.bottom + 4;
      maxHeight = Math.max(100, Math.min(240, spaceBelow - 12));
    }

    // Align right edges by default
    let right: number | undefined = Math.max(8, viewportWidth - rect.right);
    let left: number | undefined = undefined;

    const minWidth = Math.max(rect.width, 140);
    // Ensure doesn't clip off left edge
    if (rect.right - minWidth < 8) {
      right = undefined;
      left = Math.max(8, rect.left);
    }

    setMenuPosition({
      top,
      bottom,
      left,
      right,
      minWidth,
      maxHeight,
    });
  }, [options.length]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button (Obsidian Styled) */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group obsidian-btn min-w-[130px] flex items-center justify-between gap-2.5 cursor-pointer select-none outline-none focus-visible:border-[var(--flint-accent,#ea580c)] disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className="truncate text-left text-xs font-normal text-[var(--flint-text-secondary)] group-hover:text-[var(--flint-text-primary)]">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="shrink-0 flex items-center justify-center text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)]">
          <ChevronsUpDownIcon
            size={13}
            className={isOpen ? 'text-[var(--flint-text-primary)]' : 'text-[var(--flint-text-muted)]'}
          />
        </span>
      </button>

      {/* Floating Menu Popover via Portal (Never clipped by overflow: hidden) */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPosition.top !== undefined ? `${menuPosition.top}px` : undefined,
              bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : undefined,
              left: menuPosition.left !== undefined ? `${menuPosition.left}px` : undefined,
              right: menuPosition.right !== undefined ? `${menuPosition.right}px` : undefined,
              minWidth: `${menuPosition.minWidth}px`,
              maxHeight: `${menuPosition.maxHeight}px`,
              zIndex: 99999,
              boxShadow: 'var(--flint-shadow-2)',
            }}
            className={`w-max max-w-[320px] bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg p-1 overflow-y-auto overflow-x-hidden select-none ${menuClassName}`}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 text-left text-xs rounded-[5px] flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--flint-bg-sidebar-active,var(--flint-bg-card-hover))] text-[var(--flint-text-primary)] font-medium'
                      : 'text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)]'
                  }`}
                >
                  <div className="flex flex-col pr-2">
                    <span className="truncate">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[10px] text-[var(--flint-text-muted)] font-normal">{opt.description}</span>
                    )}
                  </div>
                  {isSelected && (
                    <CheckIcon size={13} className="text-[var(--flint-text-primary)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

export const CustomSelect = React.memo(CustomSelectInner) as typeof CustomSelectInner;
