import React, { useEffect, useRef, useState } from 'react';
import { PdfPageInfo } from './types';

export interface PdfPageCanvasProps {
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  rotation: number;
  isVisible: boolean;
  pageInfo?: PdfPageInfo;
  onVisible?: (pageNumber: number) => void;
  className?: string;
}

interface CachedPage {
  canvas: HTMLCanvasElement;
  actualWidth: number;
  actualHeight: number;
}

const MAX_CACHE_ENTRIES = 30;
const pageRenderCache = new Map<string, CachedPage>();

function getCacheKey(pdfDoc: any, pageNumber: number, scale: number, rotation: number): string {
  const docKey = pdfDoc?.fingerprint || 'doc';
  const roundedScale = Math.round(scale * 100) / 100;
  return `${docKey}_${pageNumber}_${roundedScale}_${rotation}`;
}

function setCachedPage(key: string, data: CachedPage) {
  if (pageRenderCache.has(key)) {
    pageRenderCache.delete(key);
  } else if (pageRenderCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = pageRenderCache.keys().next().value;
    if (oldestKey !== undefined) {
      pageRenderCache.delete(oldestKey);
    }
  }
  pageRenderCache.set(key, data);
}

/**
 * Pre-renders a PDF page offscreen and stores it in the memory bitmap cache.
 * Enables zero-latency, flash-free transitions when navigating presentation slides.
 */
export const preloadPdfPage = async (
  pdfDoc: any,
  pageNumber: number,
  scale: number,
  rotation: number
): Promise<void> => {
  if (!pdfDoc || pageNumber < 1 || pageNumber > pdfDoc.numPages) return;
  const key = getCacheKey(pdfDoc, pageNumber, scale, rotation);
  if (pageRenderCache.has(key)) return;

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const roundedScale = Math.round(scale * 100) / 100;
    const viewport = page.getViewport({ scale: roundedScale, rotation });
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const offscreen = document.createElement('canvas');
    offscreen.width = Math.floor(viewport.width * dpr);
    offscreen.height = Math.floor(viewport.height * dpr);
    const offCtx = offscreen.getContext('2d', { alpha: false });
    if (!offCtx) return;

    const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
    await page.render({
      canvasContext: offCtx,
      viewport,
      transform,
    }).promise;

    setCachedPage(key, {
      canvas: offscreen,
      actualWidth: Math.floor(viewport.width),
      actualHeight: Math.floor(viewport.height),
    });
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      // Non-fatal background preloading error
    }
  }
};

/**
 * Individual PDF Page canvas renderer with High-DPI retina compensation,
 * double-buffered offscreen rendering, and instant memory caching to guarantee
 * zero visual white flashes during navigation.
 */
export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = React.memo(({
  pdfDoc,
  pageNumber,
  scale,
  rotation,
  isVisible,
  pageInfo,
  onVisible,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [actualSize, setActualSize] = useState<{ width: number; height: number } | null>(null);

  // Compute fallback CSS display dimensions
  const baseWidth = pageInfo?.width || 595;
  const baseHeight = pageInfo?.height || 842;
  const isSideways = rotation === 90 || rotation === 270;
  const cssWidth = Math.floor((isSideways ? baseHeight : baseWidth) * scale);
  const cssHeight = Math.floor((isSideways ? baseWidth : baseHeight) * scale);

  const renderedKeyRef = useRef<string | null>(null);

  // Render page when visible and not yet rendered for current scale/rotation/pageNumber
  useEffect(() => {
    const currentKey = getCacheKey(pdfDoc, pageNumber, scale, rotation);
    if (!isVisible || !pdfDoc) return;
    if (renderedKeyRef.current === currentKey) return;

    let isCancelled = false;

    // Fast-path: Check memory bitmap cache
    const cached = pageRenderCache.get(currentKey);
    if (cached) {
      const canvas = canvasRef.current;
      if (canvas) {
        setActualSize({ width: cached.actualWidth, height: cached.actualHeight });
        canvas.width = cached.canvas.width;
        canvas.height = cached.canvas.height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.drawImage(cached.canvas, 0, 0);
        }
        renderedKeyRef.current = currentKey;
        setIsRendered(true);
        return;
      }
    }

    if (renderedKeyRef.current !== currentKey) {
      setIsRendered(false);
    }

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const roundedScale = Math.round(scale * 100) / 100;
        const viewport = page.getViewport({ scale: roundedScale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const actualW = Math.floor(viewport.width);
        const actualH = Math.floor(viewport.height);

        // Cancel previous in-flight render task if scale/rotation/page changed
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        // Render into an offscreen double buffer first to eliminate white flash
        const offscreen = document.createElement('canvas');
        offscreen.width = Math.floor(viewport.width * dpr);
        offscreen.height = Math.floor(viewport.height * dpr);
        const offCtx = offscreen.getContext('2d', { alpha: false });
        if (!offCtx) return;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
        const renderTask = page.render({
          canvasContext: offCtx,
          viewport,
          transform,
        });

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!isCancelled && canvasRef.current) {
          // Store offscreen buffer in memory cache
          setCachedPage(currentKey, {
            canvas: offscreen,
            actualWidth: actualW,
            actualHeight: actualH,
          });

          // Atomically blit offscreen buffer to visible canvas in a single frame
          canvasRef.current.width = offscreen.width;
          canvasRef.current.height = offscreen.height;
          canvasRef.current.style.width = '100%';
          canvasRef.current.style.height = '100%';
          const visibleCtx = canvasRef.current.getContext('2d', { alpha: false });
          if (visibleCtx) {
            visibleCtx.drawImage(offscreen, 0, 0);
          }

          setActualSize({ width: actualW, height: actualH });
          renderedKeyRef.current = currentKey;
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`[PDF] Page ${pageNumber} render error:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, scale, rotation, isVisible]);

  const displayWidth = actualSize?.width ?? cssWidth;
  const displayHeight = actualSize?.height ?? cssHeight;

  return (
    <div
      ref={containerRef}
      data-page-number={pageNumber}
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
      }}
      className={`relative mx-auto bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] shadow-xl border border-[var(--noether-border-base,#2a2a2a)] select-text select-none overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
        }}
        className="block"
      />
    </div>
  );
});

PdfPageCanvas.displayName = 'PdfPageCanvas';
