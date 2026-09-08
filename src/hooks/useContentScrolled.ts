import { useState, useEffect, useRef } from 'react';

/**
 * Observes whether a pane's content area has been scrolled away from the top.
 * Used by tab headers to show a subtle legibility shadow on the active tab
 * when page content sits behind the header region.
 *
 * Finds the scroll container by querying for the first overflow-y-auto
 * descendant inside the pane's DOM subtree (identified by data-pane-id).
 */
export function useContentScrolled(paneId: string | undefined): boolean {
  const [scrolled, setScrolled] = useState(false);
  const rafRef = useRef(0);
  const listenerRef = useRef<{ el: Element; handler: () => void } | null>(null);

  useEffect(() => {
    if (!paneId) return;

    // Small delay to let the pane DOM mount before querying
    const findTimer = setTimeout(() => {
      const paneEl = document.querySelector(`[data-pane-id="${paneId}"]`);
      if (!paneEl) return;

      // The editor scroll container is the first element with overflow-y: auto
      const scrollEl =
        paneEl.querySelector('.overflow-y-auto') ||
        paneEl.querySelector('[style*="overflow-y: auto"]') ||
        paneEl.querySelector('[style*="overflow: auto"]');

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
    }, 100);

    return () => {
      clearTimeout(findTimer);
      cancelAnimationFrame(rafRef.current);
      if (listenerRef.current) {
        listenerRef.current.el.removeEventListener('scroll', listenerRef.current.handler);
        listenerRef.current = null;
      }
      setScrolled(false);
    };
  }, [paneId]);

  return scrolled;
}
