import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sorting01Icon, ChevronsUpDownIcon, CheckIcon } from '@/components/common/Icons';
import { SortOption } from '@/lib/sort';

export interface SortDropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SortOption<T>[];
  variant?: 'icon' | 'text';
  disabled?: boolean;
  title?: string;
  disabledTitle?: string;
  className?: string;
}

/**
 * Standardized Sort Order Dropdown Menu for Flint.
 * Features:
 * - Clean portal-to-body dropdown that never clips inside scrollable panels.
 * - Accurate click-outside detection without premature mousedown dismissals.
 * - Supports icon-only toolbar trigger or text label + chevron trigger.
 * - Group separator dividers and active item checkmarks.
 * - Zero artificial animation / instant responsiveness per GEMINI.md Rule 6.
 */
export function SortDropdown<T extends string = string>({
  value,
  onChange,
  options,
  variant = 'icon',
  disabled = false,
  title = 'Change sort order',
  disabledTitle = 'No items to sort',
  className = '',
}: SortDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  }>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.id === value) || options[0],
    [options, value]
  );

  const updateMenuPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuWidth = 190;
    const vw = window.innerWidth;

    let top: number | undefined;
    let bottom: number | undefined;
    let left: number | undefined;
    let right: number | undefined;

    // Flip above if space below is too small and space above is sufficient
    if (spaceBelow < 260 && rect.top > 260) {
      bottom = window.innerHeight - rect.top + 4;
    } else {
      top = rect.bottom + 4;
    }

    if (rect.left + menuWidth > vw - 8) {
      right = Math.max(8, vw - rect.right);
    } else {
      left = Math.max(8, rect.left);
    }

    setMenuPos({ top, bottom, left, right });
  }, []);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updateMenuPos();
    }
    setIsOpen((prev) => !prev);
  }, [disabled, isOpen, updateMenuPos]);

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPos();

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => updateMenuPos();

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
  }, [isOpen, updateMenuPos]);

  const computedTitle = disabled ? (disabledTitle || title) : title;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {variant === 'text' ? (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          title={computedTitle}
          aria-label={computedTitle}
          className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded select-none ${
            disabled
              ? 'opacity-35 text-[var(--flint-text-muted)] cursor-not-allowed pointer-events-none'
              : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer'
          }`}
        >
          <span className="truncate max-w-[130px]">
            {selectedOption?.label || 'File name (A to Z)'}
          </span>
          <ChevronsUpDownIcon size={12} className="shrink-0 opacity-70" />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          title={computedTitle}
          aria-label={computedTitle}
          className={`p-1.5 rounded select-none ${
            disabled
              ? 'opacity-35 text-[var(--flint-text-muted)] cursor-not-allowed pointer-events-none'
              : isOpen
              ? 'bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-primary)] cursor-pointer'
              : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer'
          }`}
        >
          <Sorting01Icon size={14} />
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            data-sort-menu="true"
            style={{
              position: 'fixed',
              top: menuPos.top != null ? `${menuPos.top}px` : undefined,
              left: menuPos.left != null ? `${menuPos.left}px` : undefined,
              right: menuPos.right != null ? `${menuPos.right}px` : undefined,
              bottom: menuPos.bottom != null ? `${menuPos.bottom}px` : undefined,
              background: 'var(--flint-bg-popover, var(--flint-bg-card))',
              border: '1px solid var(--flint-border-base)',
              boxShadow: 'var(--flint-shadow-2)',
            }}
            className="w-[190px] rounded-lg p-1 text-xs text-[var(--flint-text-secondary)] select-none z-[99999] backdrop-blur-md flex flex-col gap-[1px]"
          >
            {options.map((opt, i) => (
              <React.Fragment key={opt.id}>
                {i > 0 && options[i - 1].group !== opt.group && (
                  <div className="h-[1px] bg-[var(--flint-border-base)] my-1 mx-1" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-[5px] flex items-center justify-between text-left text-xs cursor-pointer select-none ${
                    value === opt.id
                      ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)] font-medium'
                      : 'hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.id && (
                    <CheckIcon size={13} className="text-[var(--flint-text-primary)] shrink-0 ml-1.5" />
                  )}
                </button>
              </React.Fragment>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
