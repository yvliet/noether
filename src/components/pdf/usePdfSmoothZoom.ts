import React, { useEffect, useLayoutEffect, useRef } from 'react';

export interface UsePdfSmoothZoomOptions {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  scale: number;
  minScale?: number;
  maxScale?: number;
  onScaleCommit: (newScale: number) => void;
  enabled?: boolean;
}

/**
 * High-performance, GPU-accelerated touchpad pinch and Ctrl+wheel zoom hook for PDF viewers.
 *
 * Technical Rationale:
 * - Rather than applying an artificial CSS transform to the outer container (which scales page gaps,
 *   borders, and padding incorrectly and causes violent layout jumps when cleared upon re-render),
 *   this hook updates the layout scale on each animation frame while keeping the exact document
 *   point under the cursor anchored.
 * - In useLayoutEffect, the scroll offsets are applied synchronously on the exact DOM frame when
 *   page wrappers resize, completely eliminating scroll clamping, jitter, and post-render shifting.
 */
export function usePdfSmoothZoom({
  viewportRef,
  scale,
  minScale = 0.25,
  maxScale = 5.0,
  onScaleCommit,
  enabled = true,
}: UsePdfSmoothZoomOptions): void {
  const currentScaleRef = useRef(scale);
  currentScaleRef.current = scale;

  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const accumulatedDeltaRef = useRef<number>(0);
  const cursorCoordsRef = useRef<{ x: number; y: number } | null>(null);

  // Synchronously apply anchored scroll coordinates on the exact DOM commit frame
  useLayoutEffect(() => {
    if (pendingScrollRef.current) {
      const { left, top } = pendingScrollRef.current;
      pendingScrollRef.current = null;

      const viewport = viewportRef.current;
      if (viewport) {
        void viewport.scrollWidth;
        void viewport.scrollHeight;
        viewport.scrollTop = top;
        viewport.scrollLeft = left;
      }
    }
  }, [scale, viewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !enabled) return;

    const handleWheel = (e: WheelEvent) => {
      // Only capture zoom gestures (Ctrl/Cmd + scroll or touchpad pinch)
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();

      const vpRect = viewport.getBoundingClientRect();
      cursorCoordsRef.current = {
        x: Math.max(0, e.clientX - vpRect.left),
        y: Math.max(0, e.clientY - vpRect.top),
      };

      accumulatedDeltaRef.current += e.deltaY;

      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;

        const delta = accumulatedDeltaRef.current;
        accumulatedDeltaRef.current = 0;

        const cursor = cursorCoordsRef.current;
        if (!cursor) return;

        // Natural exponential scaling factor
        const clampedDelta = Math.max(-100, Math.min(100, delta));
        const factor = Math.exp(-clampedDelta * 0.003);
        const prevScale = currentScaleRef.current;
        const nextScale = Math.max(minScale, Math.min(maxScale, +(prevScale * factor).toFixed(2)));

        if (Math.abs(nextScale - prevScale) < 0.001) return;

        const ratio = nextScale / prevScale;
        const currentScrollTop = viewport.scrollTop;
        const targetScrollTop = Math.max(0, Math.round((currentScrollTop + cursor.y) * ratio - cursor.y));

        let targetScrollLeft = 0;
        if (viewport.scrollWidth > viewport.clientWidth + 4) {
          const currentScrollLeft = viewport.scrollLeft;
          targetScrollLeft = Math.max(0, Math.round((currentScrollLeft + cursor.x) * ratio - cursor.x));
        }

        pendingScrollRef.current = { left: targetScrollLeft, top: targetScrollTop };
        onScaleCommit(nextScale);
      });
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [viewportRef, minScale, maxScale, onScaleCommit, enabled]);
}
