import { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';

/**
 * Observes whether a pane's content area has been scrolled away from the top.
 * Used by tab headers to show a subtle legibility shadow on the active tab
 * when page content sits behind the header region.
 *
 * Finds the scroll container by querying for the first overflow-y-auto
 * descendant inside the pane's DOM subtree (identified by data-pane-id),
 * and continuously captures scroll events across all view types.
 */
export function useContentScrolled(paneId: string | undefined): boolean {
  const [scrolled, setScrolled] = useState(false);
  const rafRef = useRef(0);
  const listenerRef = useRef<{ el: Element; handler: () => void } | null>(null);

  const activeTabId = useWorkspaceStore(
    (s) => s.panes[paneId || 'main']?.activeTabId
  );

  useEffect(() => {
    if (!paneId) return;

    let cleanupCapture: (() => void) | null = null;

    // Immediate and frame-delayed query to catch initial or re-rendered view DOM
    const paneEl = document.querySelector(`[data-pane-id="${paneId}"]`);
    if (paneEl) {
      const onCaptureScroll = (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (target && paneEl.contains(target)) {
          const isScrolled = target.scrollTop > 2;
          setScrolled(isScrolled);
        }
      };
      paneEl.addEventListener('scroll', onCaptureScroll, { capture: true, passive: true });
      cleanupCapture = () => {
        paneEl.removeEventListener('scroll', onCaptureScroll, { capture: true });
      };
    }

    const findTimer = setTimeout(() => {
      const el = document.querySelector(`[data-pane-id="${paneId}"]`);
      if (!el) return;

      const scrollEl =
        el.querySelector('.overflow-y-auto') ||
        el.querySelector('[style*="overflow-y: auto"]') ||
        el.querySelector('[style*="overflow: auto"]');

      if (!scrollEl) return;

      const check = () => {
        const isScrolled = scrollEl.scrollTop > 2;
        setScrolled(isScrolled);
      };

      check();

      const onScroll = () => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(check);
      };

      scrollEl.addEventListener('scroll', onScroll, { passive: true });
      listenerRef.current = { el: scrollEl, handler: onScroll };
    }, 50);

    return () => {
      clearTimeout(findTimer);
      cancelAnimationFrame(rafRef.current);
      if (listenerRef.current) {
        listenerRef.current.el.removeEventListener('scroll', listenerRef.current.handler);
        listenerRef.current = null;
      }
      if (cleanupCapture) {
        cleanupCapture();
      }
      setScrolled(false);
    };
  }, [paneId, activeTabId]);

  return scrolled;
}

