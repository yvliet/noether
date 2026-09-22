import { useEffect, useRef } from 'react';

/**
 * Traps keyboard focus within the specified container while active and restores
 * focus to the previous active element upon unmounting/closing.
 */
export function useFocusTrap(
  isOpen: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  options?: {
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    disableAutoRestore?: boolean;
  }
) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined') {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }

    const container = containerRef.current;
    if (container) {
      const timer = setTimeout(() => {
        if (options?.initialFocusRef?.current) {
          options.initialFocusRef.current.focus();
        } else {
          const focusable = container.querySelectorAll<HTMLElement>(
            'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }, 30);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const currentContainer = containerRef.current;
        if (!currentContainer) return;

        const focusable = Array.from(
          currentContainer.querySelectorAll<HTMLElement>(
            'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null); // only visible elements

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !currentContainer.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !currentContainer.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown, true);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown, true);
        if (!options?.disableAutoRestore && previousActiveElementRef.current) {
          previousActiveElementRef.current.focus?.();
          previousActiveElementRef.current = null;
        }
      };
    }
  }, [isOpen, containerRef, options?.initialFocusRef, options?.disableAutoRestore]);
}
