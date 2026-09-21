import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PdfOutlineItem, PdfSidebarMode, PdfPageInfo } from './types';
import { ArrowDown01Icon, ArrowRight01Icon } from '@/components/common/Icons';

export interface PdfSidebarProps {
  isOpen: boolean;
  mode: PdfSidebarMode;
  pdfDoc: any;
  numPages: number;
  currentPage: number;
  outline: PdfOutlineItem[];
  pageInfos: PdfPageInfo[];
  onSelectPage: (pageNumber: number) => void;
  revealedPageNumber?: number | null;
  className?: string;
}

// In-memory cache for rendered thumbnail bitmaps across drawer toggle / tab switch
const thumbnailBitmapCache = new Map<string, ImageBitmap>();

const PDF_SIDEBAR_WIDTH_KEY = 'noether_pdf_sidebar_width';
const MIN_SIDEBAR_WIDTH = 130;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 240;
const THUMBNAIL_WIDTH = 100;

const getInitialSidebarWidth = (): number => {
  try {
    const saved = localStorage.getItem(PDF_SIDEBAR_WIDTH_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_SIDEBAR_WIDTH;
};

/**
 * Collapsible & Resizable PDF Left Drawer supporting Thumbnails and Table of Contents (Outline)
 * with compact multi-column thumbnail grid flow, theme-synchronized selection & hover plates,
 * wrapped heading titles, hierarchical guidelines, and instant desktop responsiveness.
 */
export const PdfSidebar: React.FC<PdfSidebarProps> = React.memo(({
  isOpen,
  mode,
  pdfDoc,
  numPages,
  currentPage,
  outline,
  pageInfos,
  onSelectPage,
  revealedPageNumber,
  className = '',
}) => {
  const [sidebarWidth, setSidebarWidth] = useState<number>(getInitialSidebarWidth);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const activeThumbnailRef = useRef<HTMLDivElement>(null);
  const activeOutlineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollTimeoutRef = useRef<any>(null);

  // Resize drag handler
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const cleanup = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      resizeCleanupRef.current = null;
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + delta));
      setSidebarWidth(newWidth);
      try {
        localStorage.setItem(PDF_SIDEBAR_WIDTH_KEY, String(newWidth));
      } catch {}
    };

    const handleMouseUp = () => {
      cleanup();
    };

    resizeCleanupRef.current = cleanup;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth]);

  // Clean up resize listeners if unmounted during active drag
  useEffect(() => {
    return () => {
      if (resizeCleanupRef.current) {
        resizeCleanupRef.current();
      }
    };
  }, []);

  // Auto-scroll active thumbnail into view when page changes (debounced calm catch-up)
  useEffect(() => {
    if (!isOpen || mode !== 'thumbnails' || !activeThumbnailRef.current) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const el = activeThumbnailRef.current;
      if (!el) return;
      const scrollContainer = el.parentElement;
      if (!scrollContainer) return;

      const elRect = el.getBoundingClientRect();
      const cRect = scrollContainer.getBoundingClientRect();

      // Only scroll if outside comfortable visible bounds with 32px padding
      const isInComfortZone = elRect.top >= cRect.top + 32 && elRect.bottom <= cRect.bottom - 32;
      if (!isInComfortZone) {
        el.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }, 250);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [currentPage, isOpen, mode]);

  // Scroll revealed page into view when triggered by "Reveal page in table of contents"
  useEffect(() => {
    if (isOpen && mode === 'outline' && revealedPageNumber && activeOutlineRef.current) {
      activeOutlineRef.current.scrollIntoView({
        block: 'center',
        behavior: 'auto',
      });
    }
  }, [revealedPageNumber, isOpen, mode]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: `${sidebarWidth}px`,
        background: 'var(--noether-bg-tab-active, var(--noether-bg-main))',
      }}
      className={`h-full shrink-0 border-r border-[var(--noether-border-base)] flex flex-col overflow-hidden select-none z-10 relative ${className}`}
    >
      {/* Draggable right edge resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-40 flex justify-center group"
      >
        <div
          className={`w-[2px] h-full ${
            isResizing ? 'bg-white' : 'bg-transparent group-hover:bg-white/50'
          }`}
        />
      </div>

      {mode === 'thumbnails' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-2.5 pb-2.5 pl-4 pr-2 flex flex-row flex-wrap justify-center content-start gap-2">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
            const isActive = pageNum === currentPage;
            const pageInfo = pageInfos[pageNum - 1];
            const aspect = pageInfo?.aspectRatio || 0.7;
            const thumbWidth = THUMBNAIL_WIDTH;
            const thumbHeight = Math.round(thumbWidth / aspect);

            return (
              <div
                key={`thumb-${pageNum}`}
                ref={isActive ? activeThumbnailRef : undefined}
                onClick={() => onSelectPage(pageNum)}
                className={`pdf-thumbnail-item p-1.5 rounded-md select-none flex flex-col items-center justify-center cursor-default ${
                  isActive ? 'active' : ''
                }`}
              >
                <ThumbnailCard
                  pdfDoc={pdfDoc}
                  pageNumber={pageNum}
                  width={thumbWidth}
                  height={thumbHeight}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar py-2 px-1 text-xs">
          {outline.length === 0 ? (
            <div className="p-4 text-center text-[var(--noether-text-muted)] italic text-xs">
              No table of contents found in document
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {outline.map((item) => (
                <OutlineTreeItem
                  key={item.id}
                  item={item}
                  currentPage={currentPage}
                  onSelectPage={onSelectPage}
                  activeRef={item.pageNumber === currentPage ? activeOutlineRef : undefined}
                  depth={0}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

PdfSidebar.displayName = 'PdfSidebar';

interface ThumbnailCardProps {
  pdfDoc: any;
  pageNumber: number;
  width: number;
  height: number;
}

const ThumbnailCard = React.memo<ThumbnailCardProps>(({ pdfDoc, pageNumber, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cacheKey = `${pdfDoc?.fingerprint || 'pdf'}_${pageNumber}_${width}`;

  // Instant restore from in-memory bitmap cache
  useEffect(() => {
    if (isRendered) return;
    const cached = thumbnailBitmapCache.get(cacheKey);
    if (cached && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = cached.width;
        canvasRef.current.height = cached.height;
        ctx.drawImage(cached, 0, 0);
        setIsRendered(true);
      }
    }
  }, [cacheKey, isRendered]);

  // Lazy load thumbnails only when scrolled into view
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render thumbnail canvas
  useEffect(() => {
    if (!isInView || !pdfDoc || isRendered) return;

    let isCancelled = false;

    const renderThumb = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const baseVp = page.getViewport({ scale: 1 });
        const scale = width / baseVp.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
        await page.render({
          canvasContext: context,
          viewport,
          transform,
        }).promise;

        if (!isCancelled) {
          setIsRendered(true);
          try {
            createImageBitmap(canvas)
              .then((bmp) => {
                thumbnailBitmapCache.set(cacheKey, bmp);
              })
              .catch(() => {});
          } catch {}
        }
      } catch {}
    };

    renderThumb();
    return () => {
      isCancelled = true;
    };
  }, [isInView, pdfDoc, pageNumber, width, isRendered, cacheKey]);

  return (
    <div
      ref={cardRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className="relative rounded-[3px] border border-[var(--noether-border-subtle)] select-none bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] shadow-sm overflow-hidden cursor-default"
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="block w-full h-full object-cover"
      />

      {/* Dark page number pill badge in bottom-right corner */}
      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-sans tabular-nums leading-none shadow pointer-events-none select-none">
        {pageNumber}
      </div>
    </div>
  );
});

ThumbnailCard.displayName = 'ThumbnailCard';

interface OutlineTreeItemProps {
  item: PdfOutlineItem;
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
  activeRef?: React.Ref<HTMLDivElement>;
  depth: number;
}

const OutlineTreeItem: React.FC<OutlineTreeItemProps> = ({
  item,
  currentPage,
  onSelectPage,
  activeRef,
  depth,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const hasChildren = item.items && item.items.length > 0;
  const isSelected = item.pageNumber === currentPage;

  return (
    <div className="flex flex-col">
      <div
        ref={isSelected ? activeRef : undefined}
        onClick={() => onSelectPage(item.pageNumber)}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
        className={`pdf-outline-item group relative flex items-start gap-1.5 py-1.5 pr-2 rounded select-none cursor-default ${
          isSelected ? 'active' : ''
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="w-4 h-4 flex items-center justify-center text-[#777] hover:text-white rounded hover:bg-[#333] shrink-0 mt-0.5"
          >
            {isExpanded ? <ArrowDown01Icon size={12} /> : <ArrowRight01Icon size={12} />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span
          className="flex-1 min-w-0 text-[12px] leading-[1.35] break-words whitespace-normal"
          title={item.title}
        >
          {item.title}
        </span>

        <span className="ml-auto text-[10px] text-[#666] group-hover:text-[#999] font-sans tabular-nums shrink-0 mt-0.5 self-start">
          {item.pageNumber}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="relative flex flex-col w-full">
          {/* Indentation guideline centered under parent chevron */}
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 pointer-events-none w-0 border-l border-[var(--noether-border-subtle)] z-10"
            style={{ left: `${depth * 14 + 14}px` }}
          />
          {item.items.map((sub) => (
            <OutlineTreeItem
              key={sub.id}
              item={sub}
              currentPage={currentPage}
              onSelectPage={onSelectPage}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
