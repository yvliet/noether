import React, { useEffect, useRef, useState } from 'react';
import { PdfOutlineItem, PdfSidebarMode, PdfPageInfo } from './types';
import { ArrowDown01Icon, ArrowRight01Icon, DashboardSquare01Icon, LeftToRightListBulletIcon } from '@/components/common/Icons';

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

/**
 * Collapsible PDF Left Drawer supporting Thumbnails and Table of Contents (Outline)
 * with instant desktop responsiveness (zero artificial transition lag).
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
  const activeThumbnailRef = useRef<HTMLDivElement>(null);
  const activeOutlineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollTimeoutRef = useRef<any>(null);

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
      style={{ width: '220px' }}
      className={`h-full shrink-0 bg-[#161616] border-r border-[#2a2a2a] flex flex-col overflow-hidden select-none z-10 ${className}`}
    >
      {mode === 'thumbnails' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col items-center gap-3">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
            const isActive = pageNum === currentPage;
            const pageInfo = pageInfos[pageNum - 1];
            const aspect = pageInfo?.aspectRatio || 0.7;
            const thumbWidth = 160;
            const thumbHeight = Math.round(thumbWidth / aspect);

            return (
              <ThumbnailCard
                key={`thumb-${pageNum}`}
                pdfDoc={pdfDoc}
                pageNumber={pageNum}
                width={thumbWidth}
                height={thumbHeight}
                isActive={isActive}
                onClick={() => onSelectPage(pageNum)}
                ref={isActive ? activeThumbnailRef : undefined}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-1 text-xs">
          {outline.length === 0 ? (
            <div className="p-4 text-center text-[#777] italic text-xs">
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
  isActive: boolean;
  onClick: () => void;
  ref?: React.Ref<HTMLDivElement>;
}

const ThumbnailCard = React.memo(
  React.forwardRef<HTMLDivElement, ThumbnailCardProps>(
    ({ pdfDoc, pageNumber, width, height, isActive, onClick }, ref) => {
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
          ref={(el) => {
            cardRef.current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) (ref as any).current = el;
          }}
          onClick={onClick}
          style={{ width: `${width}px`, height: `${height}px` }}
          className={`relative rounded border cursor-pointer select-none bg-white shadow-md overflow-hidden ${
            isActive
              ? 'border-[var(--noether-accent,#eb584d)]'
              : 'border-[#333333] hover:border-[#666666]'
          }`}
        >
          <canvas
            ref={canvasRef}
            style={{ width: `${width}px`, height: `${height}px` }}
            className="block w-full h-full object-cover"
          />

          {/* Fallback skeleton placeholder while thumbnail renders */}
          {!isRendered && (
            <div className="absolute inset-0 bg-[#242424] flex items-center justify-center text-[10px] text-[#777] font-sans tabular-nums">
              {pageNumber}
            </div>
          )}

          {/* Dark page number pill badge in bottom-right corner */}
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-sans tabular-nums leading-none shadow pointer-events-none select-none">
            {pageNumber}
          </div>
        </div>
      );
    }
  )
);

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
        className={`group flex items-center gap-1.5 py-1.5 pr-2 rounded cursor-pointer select-none ${
          isSelected
            ? 'bg-[#2a2a2a] text-white font-medium'
            : 'text-[#bbbbbb] hover:bg-[#202020] hover:text-[#eeeeee]'
        }`}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="w-4 h-4 flex items-center justify-center text-[#777] hover:text-white rounded hover:bg-[#333] shrink-0"
          >
            {isExpanded ? <ArrowDown01Icon size={12} /> : <ArrowRight01Icon size={12} />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span className="truncate flex-1 text-[12px] leading-tight" title={item.title}>
          {item.title}
        </span>

        <span className="ml-auto text-[10px] text-[#666] group-hover:text-[#999] font-sans tabular-nums shrink-0">
          {item.pageNumber}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
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
