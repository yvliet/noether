import React, { useEffect, useLayoutEffect, useRef } from 'react';

export interface UsePdfSmoothZoomOptions {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
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
 * - Direct PDF.js canvas rasterization on every wheel event causes severe thread thrashing and frame drops.
 * - During active pinch/wheel gestures, this hook applies an immediate CSS transform (scale) centered
 *   on the pointer coordinates directly on the GPU compositor thread (60-120fps).
 * - A debounced timer (150ms) triggers scale commit to React state.
 * - Crucially, useLayoutEffect synchronizes the scroll offset adjustment and clears the CSS transform
 *   on the exact same browser frame where the DOM page wrappers expand to the new scale, preventing
 *   browser scroll clamping jumps, size popping, and visual stutter.
 */
export function usePdfSmoothZoom({
  viewportRef,
  contentRef,
  scale,
  minScale = 0.25,
  maxScale = 5.0,
  onScaleCommit,
  enabled = true,
}: UsePdfSmoothZoomOptions): void {
  const currentScaleRef = useRef(scale);
  currentScaleRef.current = scale;

  const targetScaleRef = useRef(scale);
  const debounceTimerRef = useRef<any>(null);
  const isZoomingRef = useRef(false);

  const gestureOriginRef = useRef<{
    cursorVpX: number;
    cursorVpY: number;
    originX: number;
    originY: number;
    contentOffsetTop: number;
    contentOffsetLeft: number;
    baseScale: number;
    wasHorizontallyCentered: boolean;
    initialScrollWidth: number;
  } | null>(null);

  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

  // Keep targetScale in sync with external scale changes (e.g. toolbar button clicks)
  useEffect(() => {
    if (!isZoomingRef.current) {
      targetScaleRef.current = scale;
    }
  }, [scale]);

  // Synchronously adjust scroll and release GPU transform on the exact DOM commit frame
  useLayoutEffect(() => {
    if (pendingScrollRef.current) {
      const { left, top } = pendingScrollRef.current;
      pendingScrollRef.current = null;

      const viewport = viewportRef.current;
      const content = contentRef.current;

      // Clear GPU transform synchronously with DOM size update
      if (content) {
        content.style.transform = '';
        content.style.transformOrigin = '';
        content.style.willChange = '';
      }

      // Force synchronous reflow so viewport scrollWidth/scrollHeight match the new scale
      if (viewport) {
        void viewport.scrollWidth;
        void viewport.scrollHeight;
        viewport.scrollLeft = left;
        viewport.scrollTop = top;
      }

      // Guard against layout shifts in the subsequent paint frame
      requestAnimationFrame(() => {
        if (viewportRef.current) {
          viewportRef.current.scrollLeft = left;
          viewportRef.current.scrollTop = top;
        }
      });

      isZoomingRef.current = false;
      gestureOriginRef.current = null;
    }
  }, [scale, viewportRef, contentRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !enabled) return;

    const handleWheel = (e: WheelEvent) => {
      // Only capture zoom gestures (Ctrl/Cmd + scroll or touchpad pinch)
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const content = contentRef.current;
      if (!content) return;

      const baseScale = currentScaleRef.current;

      // Natural exponential scaling factor: ~20% per notched wheel tick, silky on touchpad
      const rawDelta = e.deltaY;
      const clampedDelta = Math.max(-120, Math.min(120, rawDelta));
      const factor = Math.exp(-clampedDelta * 0.002);
      const nextScale = Math.max(minScale, Math.min(maxScale, targetScaleRef.current * factor));
      targetScaleRef.current = nextScale;

      // On initial gesture tick, record pristine unscaled coordinates relative to content
      if (!isZoomingRef.current || !gestureOriginRef.current) {
        isZoomingRef.current = true;
        const vpRect = viewport.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();

        // Check whether content is horizontally centered within the viewport
        const isHorizontallyCentered = content.scrollWidth <= viewport.clientWidth + 4;

        // When horizontally centered, anchor horizontally at the content midpoint
        // so scaling expands symmetrically without drifting sideways toward the off-center cursor
        const originX = isHorizontallyCentered
          ? content.clientWidth / 2
          : Math.max(0, e.clientX - contentRect.left);
        const originY = Math.max(0, e.clientY - contentRect.top);

        gestureOriginRef.current = {
          cursorVpX: e.clientX - vpRect.left,
          cursorVpY: e.clientY - vpRect.top,
          originX,
          originY,
          contentOffsetTop: content.offsetTop,
          contentOffsetLeft: content.offsetLeft,
          baseScale,
          wasHorizontallyCentered: isHorizontallyCentered,
          initialScrollWidth: content.scrollWidth,
        };

        content.style.transformOrigin = `${originX}px ${originY}px`;
        content.style.willChange = 'transform';
      }

      if (!gestureOriginRef.current) return;

      // GPU-accelerated immediate visual scaling without re-rendering PDF canvas
      const ratio = nextScale / gestureOriginRef.current.baseScale;
      content.style.transform = `scale(${ratio})`;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        if (!gestureOriginRef.current) {
          isZoomingRef.current = false;
          return;
        }

        const finalScale = +(targetScaleRef.current).toFixed(2);

        if (Math.abs(finalScale - currentScaleRef.current) < 0.001) {
          if (content) {
            content.style.transform = '';
            content.style.transformOrigin = '';
            content.style.willChange = '';
          }
          isZoomingRef.current = false;
          gestureOriginRef.current = null;
          return;
        }

        const {
          originX,
          originY,
          cursorVpX,
          cursorVpY,
          contentOffsetTop,
          contentOffsetLeft,
          baseScale: startScale,
          wasHorizontallyCentered,
          initialScrollWidth,
        } = gestureOriginRef.current as any;
        const commitRatio = finalScale / startScale;

        // Calculate exact vertical scroll offset to keep the focused content point anchored at cursor
        const newContentY = originY * commitRatio;
        const targetScrollTop = Math.max(0, Math.round((contentOffsetTop + newContentY) - cursorVpY));

        // Calculate horizontal scroll offset:
        let targetScrollLeft = 0;
        if (wasHorizontallyCentered) {
          const estimatedNewWidth = initialScrollWidth * commitRatio;
          if (estimatedNewWidth > viewport.clientWidth) {
            targetScrollLeft = Math.max(0, Math.round((estimatedNewWidth - viewport.clientWidth) / 2));
          } else {
            targetScrollLeft = 0;
          }
        } else {
          const newContentX = originX * commitRatio;
          targetScrollLeft = Math.max(0, Math.round((contentOffsetLeft + newContentX) - cursorVpX));
        }

        // Stash pending scroll offset for synchronous application in useLayoutEffect upon DOM mutation
        pendingScrollRef.current = { left: targetScrollLeft, top: targetScrollTop };

        // Commit resolution scale to trigger React render
        onScaleCommit(finalScale);
      }, 150);
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheel);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [viewportRef, contentRef, minScale, maxScale, onScaleCommit, enabled]);
}
