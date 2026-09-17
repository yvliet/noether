import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { platform } from '../lib/platform/platformAdapter';

/**
 * Snapshot of application visibility and view intersection state.
 * @since 0.5.6
 */
export interface ViewSuspensionState {
  /**
   * Whether the view is currently suspended and should halt animations,
   * physics simulations, render loops, and high-frequency timers.
   */
  isSuspended: boolean;
  /** Whether the application window currently holds OS input focus. */
  isWindowFocused: boolean;
  /** Whether the document is hidden (minimized, occluded, or background tab). */
  isDocumentHidden: boolean;
  /** Whether the native Tauri or desktop window is minimized. */
  isWindowMinimized: boolean;
  /** Whether the container element is currently visible in the DOM viewport. */
  isIntersecting: boolean;
}

/**
 * Options to configure view suspension behavior.
 * @since 0.5.6
 */
export interface UseViewSuspensionOptions {
  /**
   * Master switch to enable or disable suspension monitoring.
   * @default true
   */
  enabled?: boolean;
  /**
   * Whether to suspend when the application window loses focus (e.g. user switched to another app).
   * @default true
   */
  suspendOnBlur?: boolean;
  /**
   * IntersectionObserver threshold required to consider the container visible.
   * @default 0.01
   */
  threshold?: number;
  /** Callback fired immediately when entering suspended state. */
  onSuspend?: () => void;
  /** Callback fired immediately when resuming from suspended state. */
  onResume?: () => void;
}

/**
 * Context provided by host extension wrappers (`ExtensionViewHost`).
 * Views and sub-components can read suspension state without their own observers.
 */
export const ViewSuspensionContext = createContext<ViewSuspensionState>({
  isSuspended: false,
  isWindowFocused: true,
  isDocumentHidden: false,
  isWindowMinimized: false,
  isIntersecting: true,
});

/**
 * Hook to consume suspension state from an enclosing `ExtensionViewHost`.
 * @since 0.5.6
 */
export function useViewSuspensionContext(): ViewSuspensionState {
  return useContext(ViewSuspensionContext);
}

/**
 * Reusable SDK hook to monitor view visibility and automatically freeze
 * animations, canvas loops, WebGL contexts, and force physics simulations.
 *
 * Combines 5 distinct lifecycle channels into a single unified boolean:
 * 1. Native desktop window minimize state (Tauri Win32/macOS/Linux)
 * 2. Document visibility (`document.visibilitychange` / `document.hidden`)
 * 3. OS window blur and focus (`window.blur`, `window.focus`, `document.hasFocus()`)
 * 4. DOM container viewport intersection (`IntersectionObserver`)
 * 5. Tab and workspace pane switching
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { isSuspended } = useViewSuspension(containerRef, {
 *   onSuspend: () => cancelAnimationFrame(rafId),
 *   onResume: () => startAnimation(),
 * });
 * ```
 *
 * @since 0.5.6
 */
export function useViewSuspension(
  containerRef?: React.RefObject<Element | null>,
  options: UseViewSuspensionOptions = {}
): ViewSuspensionState {
  const {
    enabled = true,
    suspendOnBlur = true,
    threshold = 0.01,
    onSuspend,
    onResume,
  } = options;

  const onSuspendRef = useRef(onSuspend);
  onSuspendRef.current = onSuspend;
  const onResumeRef = useRef(onResume);
  onResumeRef.current = onResume;

  const [state, setState] = useState<ViewSuspensionState>(() => {
    const isDocHidden = typeof document !== 'undefined' ? document.hidden : false;
    const isFocused = typeof document !== 'undefined' ? document.hasFocus() : true;
    const isSuspended = enabled && (isDocHidden || (suspendOnBlur && !isFocused));
    return {
      isSuspended,
      isWindowFocused: isFocused,
      isDocumentHidden: isDocHidden,
      isWindowMinimized: false,
      isIntersecting: true,
    };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!enabled) {
      if (stateRef.current.isSuspended) {
        setState((prev) => ({ ...prev, isSuspended: false }));
        onResumeRef.current?.();
      }
      return;
    }

    let isWindowMin = false;
    let isDocHidden = typeof document !== 'undefined' ? document.hidden : false;
    let isWindowFocused = typeof document !== 'undefined' ? document.hasFocus() : true;
    let isIntersecting = true;

    const recompute = () => {
      const nextSuspended = Boolean(
        isWindowMin || isDocHidden || !isIntersecting || (suspendOnBlur && !isWindowFocused)
      );
      const prevSuspended = stateRef.current.isSuspended;

      setState({
        isSuspended: nextSuspended,
        isWindowFocused,
        isDocumentHidden: isDocHidden,
        isWindowMinimized: isWindowMin,
        isIntersecting,
      });

      if (nextSuspended && !prevSuspended) {
        onSuspendRef.current?.();
      } else if (!nextSuspended && prevSuspended) {
        onResumeRef.current?.();
      }
    };

    // 1. Cross-platform window minimize & focus events (Tauri / Web)
    const unlistenMin = platform.onMinimizedChange((minimized) => {
      isWindowMin = minimized;
      recompute();
    });

    // 2. Document visibility changes (tab switch, minimize)
    const handleVisibility = () => {
      isDocHidden = typeof document !== 'undefined' ? document.hidden : false;
      isWindowFocused = typeof document !== 'undefined' ? document.hasFocus() : true;
      recompute();
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    // 3. Window blur & focus tracking (user clicks to Antigravity, browser, etc.)
    const handleBlur = () => {
      isWindowFocused = false;
      recompute();
    };
    const handleFocus = () => {
      isWindowFocused = true;
      recompute();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
    }

    // 4. Container IntersectionObserver (off-screen, hidden behind non-active tab)
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && containerRef?.current) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            isIntersecting = entry.isIntersecting && entry.intersectionRatio > 0;
            recompute();
          }
        },
        { threshold }
      );
      observer.observe(containerRef.current);
    }

    recompute();

    return () => {
      unlistenMin();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [enabled, suspendOnBlur, threshold, containerRef]);

  return state;
}
