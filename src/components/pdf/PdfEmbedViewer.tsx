import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  DashboardSquare01Icon,
  LeftToRightListBulletIcon,
  ArrowDown01Icon,
  ArrowRight02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  MinusSignIcon,
  PlusSignIcon,
  CheckIcon,
  RotateCcwIcon,
  Presentation01Icon,
  CenterFocusIcon,
  FitToScreenIcon,
  ExternalLinkIcon,
  File01Icon,
  SourceCodeIcon,
  Cancel01Icon,
} from '@/components/common/Icons';
import { PdfSidebar } from './PdfSidebar';
import { PdfPageCanvas, preloadPdfPage } from './PdfPageCanvas';
import { loadPdfDocument, LoadedPdfData } from './pdfLoader';
import { PdfSidebarMode, PdfZoomMode } from './types';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { getDocumentDiskPath, getDocumentPath } from '@/lib/db/documents';
import platform from '@/lib/platform/platformAdapter';

export interface PdfEmbedViewerProps {
  target: string;
  rawTarget?: string;
  initialPage?: number;
  height?: number | string;
  width?: number | string | null;
  className?: string;
}

/**
 * High-performance embedded PDF viewer widget for inline note embeds (![[...]]).
 *
 * Technical Rationale:
 * - Direct single slide / page presentation view with instant pagination.
 * - Non-destructive collapsible thumbnail drawer floating as an absolute overlay
 *   above the canvas without compressing or shrinking the PDF geometry.
 * - Standardized workspace dropdown styling matching SortDropdown.
 * - Zero monospace font artifacts in UI inputs, counters, and controls.
 * - Full data-tooltip integration preventing default OS browser tooltips.
 */
export const PdfEmbedViewer: React.FC<PdfEmbedViewerProps> = React.memo(({
  target,
  rawTarget,
  initialPage = 1,
  height = 520,
  width,
  className = '',
}) => {
  const documents = useDocumentStore((s) => s.documents);
  const openTab = useWorkspaceStore((s) => s.openTab);

  // 1. Resolve Document & Physical Disk Path
  const currentDoc = useMemo(() => {
    if (!target) return null;
    const clean = target.trim().toLowerCase();
    const cleanNoExt = clean.replace(/\.pdf$/, '');
    const baseName = cleanNoExt.split('/').pop() || cleanNoExt;
    const baseNameWithExt = clean.split('/').pop() || clean;

    return (
      documents.find((d) => {
        if (d.is_folder) return false;
        const lower = d.title.toLowerCase();
        return (
          lower === clean ||
          lower === cleanNoExt ||
          lower === baseName ||
          lower === baseNameWithExt ||
          `${lower}.pdf` === clean ||
          d.id === target
        );
      }) || null
    );
  }, [target, documents]);

  const diskPath = useMemo(() => {
    if (currentDoc) {
      return getDocumentDiskPath(currentDoc, getDocumentPath(currentDoc, documents));
    }
    return target;
  }, [currentDoc, target, documents]);

  const documentTitle = currentDoc?.title || target.split('/').pop() || 'PDF Document';

  // 2. Viewer State
  const [pdfData, setPdfData] = useState<LoadedPdfData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
  const [pageInput, setPageInput] = useState<string>(String(initialPage || 1));
  const [scale, setScale] = useState<number>(1.0);
  const [zoomMode, setZoomMode] = useState<PdfZoomMode>('fit-width');
  const [rotation, setRotation] = useState<number>(0);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [sidebarMode, setSidebarMode] = useState<PdfSidebarMode>('thumbnails');
  const [revealedPageNumber, setRevealedPageNumber] = useState<number | null>(null);
  const [isPresenting, setIsPresenting] = useState<boolean>(false);

  // Sidebar (drawer options) dropdown menu state
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const sidebarMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [sidebarMenuPos, setSidebarMenuPos] = useState({ top: 0, left: 0 });

  // Zoom dropdown menu state
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const zoomMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [zoomMenuPos, setZoomMenuPos] = useState({ top: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // 3. Load PDF Document asynchronously
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    loadPdfDocument(currentDoc || target, diskPath)
      .then((data) => {
        if (isCancelled) return;
        setPdfData(data);
        setIsLoading(false);
        if (initialPage && initialPage >= 1 && initialPage <= data.numPages) {
          setCurrentPage(initialPage);
          setPageInput(String(initialPage));
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[PdfEmbed] Failed to load PDF:', err);
        setErrorMessage(err?.message || 'Failed to load PDF');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentDoc?.id, diskPath, target, initialPage]);

  // Sync page input on page changes
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Preload adjacent pages for instant flipping
  useEffect(() => {
    if (!pdfData?.pdfDoc) return;
    if (currentPage < pdfData.numPages) {
      preloadPdfPage(pdfData.pdfDoc, currentPage + 1, scale, rotation);
    }
    if (currentPage > 1) {
      preloadPdfPage(pdfData.pdfDoc, currentPage - 1, scale, rotation);
    }
  }, [pdfData, currentPage, scale, rotation]);

  // 4. Auto-fit Calculation (Calculated against full viewport width regardless of overlay drawer)
  const recomputeFitScale = useCallback(() => {
    if (isPresenting || !viewportRef.current || !pdfData || pdfData.pageInfos.length === 0) return;

    const viewport = viewportRef.current;
    const vpWidth = viewport.clientWidth;
    const vpHeight = viewport.clientHeight;
    if (vpWidth <= 0 || vpHeight <= 0) return;

    const activeInfo = pdfData.pageInfos[currentPage - 1] || pdfData.pageInfos[0];
    const isSideways = rotation === 90 || rotation === 270;
    const pageWidth = isSideways ? activeInfo.height : activeInfo.width;
    const pageHeight = isSideways ? activeInfo.width : activeInfo.height;

    if (zoomMode === 'fit-width') {
      const horizontalPadding = 32;
      const targetScale = (vpWidth - horizontalPadding) / pageWidth;
      setScale(Math.max(0.2, Math.min(3.0, targetScale)));
    } else if (zoomMode === 'fit-page') {
      const verticalPadding = 24;
      const targetScale = (vpHeight - verticalPadding) / pageHeight;
      setScale(Math.max(0.2, Math.min(3.0, targetScale)));
    }
  }, [pdfData, currentPage, rotation, zoomMode, isPresenting]);

  useEffect(() => {
    recomputeFitScale();
  }, [recomputeFitScale]);

  useEffect(() => {
    const handleResize = () => {
      recomputeFitScale();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [recomputeFitScale]);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const targetEl = e.target as HTMLElement;
      if (!targetEl.closest('[data-pdf-dropdown]') && !targetEl.closest('[data-pdf-trigger]')) {
        setIsZoomMenuOpen(false);
        setIsSidebarMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZoomMenuOpen(false);
        setIsSidebarMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 5. Handlers
  const handlePageChange = (pageNum: number) => {
    if (!pdfData) return;
    const clamped = Math.max(1, Math.min(pdfData.numPages, pageNum));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
  };

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && pdfData && parsed >= 1 && parsed <= pdfData.numPages) {
      setCurrentPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setZoomMode('custom');
    setScale((prev) => Math.min(3.0, prev * 1.25));
  };

  const handleZoomOut = () => {
    setZoomMode('custom');
    setScale((prev) => Math.max(0.3, prev * 0.8));
  };

  const openSidebarMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sidebarMenuTriggerRef.current) return;
    const rect = sidebarMenuTriggerRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 228));
    setSidebarMenuPos({ top: rect.bottom + 4, left });
    setIsSidebarMenuOpen((prev) => !prev);
  };

  const openZoomMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!zoomMenuTriggerRef.current) return;
    const rect = zoomMenuTriggerRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 188));
    setZoomMenuPos({ top: rect.bottom + 4, left });
    setIsZoomMenuOpen((prev) => !prev);
  };

  const handleRotateCw = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleOpenInTab = () => {
    if (currentDoc) {
      openTab(currentDoc.id, currentDoc.title, { viewType: 'pdf' });
    } else {
      window.open(diskPath, '_blank');
    }
  };

  const handleFocusEmbedCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(
      new CustomEvent('noether:focus-embed-code', {
        detail: { target: rawTarget || target, cleanTarget: target },
      })
    );
  };

  // Keyboard navigation when hovered
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!pdfData) return;
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      handlePageChange(currentPage - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      handlePageChange(currentPage + 1);
    }
  };

  const zoomPresets = [
    { label: '50%', scale: 0.5 },
    { label: '75%', scale: 0.75 },
    { label: '100%', scale: 1.0 },
    { label: '125%', scale: 1.25 },
    { label: '150%', scale: 1.5 },
    { label: '200%', scale: 2.0 },
  ];

  const activePageInfo = pdfData?.pageInfos[currentPage - 1] || pdfData?.pageInfos[0];

  const containerHeight = typeof height === 'number' ? `${height}px` : height;
  const containerWidth = width ? (typeof width === 'number' ? `${width}px` : width) : '100%';

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ height: containerHeight, width: containerWidth }}
      className={`noether-embed-card noether-pdf-embed-card relative flex flex-col rounded-lg border border-[var(--noether-border-base,#2a2a2a)] bg-[#141414] overflow-hidden my-2.5 shadow-sm select-text focus:outline-none focus:ring-1 focus:ring-[var(--noether-accent,#eb584d)]/40 ${className}`}
    >
      {/* Top Control Toolbar */}
      <div
        data-pdf-toolbar="true"
        className="h-8 px-2.5 flex items-center justify-between bg-[#1a1a1a] border-b border-[#282828] text-xs text-[#888888] shrink-0 select-none"
      >
        {/* Left Actions: Drawer toggle & mode */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            data-tooltip={isSidebarOpen ? 'Collapse drawer' : 'Expand drawer'}
            aria-label={isSidebarOpen ? 'Collapse drawer' : 'Expand drawer'}
            data-active={isSidebarOpen ? 'true' : undefined}
            className={`noether-toolbar-btn w-[22px] h-[22px] rounded hover:bg-[#2c2c2c] hover:text-white flex items-center justify-center transition-none cursor-pointer ${
              isSidebarOpen ? 'text-white bg-[#2e2e2e]' : 'text-[#999999]'
            }`}
          >
            {sidebarMode === 'thumbnails' ? (
              <DashboardSquare01Icon size={13} />
            ) : (
              <LeftToRightListBulletIcon size={13} />
            )}
          </button>

          <button
            ref={sidebarMenuTriggerRef}
            data-pdf-trigger="sidebar"
            type="button"
            onClick={openSidebarMenu}
            data-tooltip="Drawer options"
            aria-label="Drawer options"
            data-active={isSidebarMenuOpen ? 'true' : undefined}
            className={`noether-toolbar-btn w-[18px] h-[22px] rounded hover:bg-[#2c2c2c] hover:text-white flex items-center justify-center transition-none cursor-pointer ${
              isSidebarMenuOpen ? 'text-white bg-[#2e2e2e]' : 'text-[#999999]'
            }`}
          >
            <ArrowDown01Icon size={11} />
          </button>

          <div className="w-[1px] h-3 bg-[#333333] mx-0.5 shrink-0" />

          {/* Zoom controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            data-tooltip="Zoom out"
            aria-label="Zoom out"
            className="noether-toolbar-btn w-[22px] h-[22px] rounded hover:bg-[#2c2c2c] hover:text-white text-[#999999] flex items-center justify-center transition-none cursor-pointer"
          >
            <MinusSignIcon size={12} />
          </button>

          <button
            ref={zoomMenuTriggerRef}
            data-pdf-trigger="zoom"
            type="button"
            onClick={openZoomMenu}
            data-tooltip="Zoom presets"
            aria-label="Zoom presets"
            className="px-1.5 py-0.5 text-[11px] tabular-nums font-sans rounded hover:bg-[#2c2c2c] hover:text-white text-[#aaaaaa] flex items-center gap-0.5 transition-none cursor-pointer"
          >
            <span>{Math.round(scale * 100)}%</span>
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            data-tooltip="Zoom in"
            aria-label="Zoom in"
            className="noether-toolbar-btn w-[22px] h-[22px] rounded hover:bg-[#2c2c2c] hover:text-white text-[#999999] flex items-center justify-center transition-none cursor-pointer"
          >
            <PlusSignIcon size={12} />
          </button>
        </div>

        {/* Center Actions: Page navigation ( < 1 of 5 > ) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!pdfData || currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            data-tooltip="Previous page (Left arrow / PageUp)"
            aria-label="Previous page"
            className="noether-toolbar-btn w-[20px] h-[20px] rounded hover:bg-[#2c2c2c] hover:text-white text-[#999999] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-default flex items-center justify-center transition-none cursor-pointer"
          >
            <ArrowLeft01Icon size={11} />
          </button>

          <form onSubmit={handlePageSubmit} className="flex items-center text-xs">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(pageInput, 10);
                if (!isNaN(parsed) && pdfData && parsed >= 1 && parsed <= pdfData.numPages) {
                  setCurrentPage(parsed);
                } else {
                  setPageInput(String(currentPage));
                }
              }}
              data-tooltip="Page number (press Enter to jump)"
              aria-label="Page number"
              className="w-7 h-5 text-center text-[11px] tabular-nums font-sans bg-[#222222] border border-[#333333] hover:border-[#444444] focus:border-[var(--noether-accent,#eb584d)] rounded text-white outline-none p-0 selection:bg-[var(--noether-accent,#eb584d)]"
            />
            <span className="text-[#666666] mx-1 text-[11px] font-sans select-none">of</span>
            <span className="text-[#aaaaaa] tabular-nums font-sans text-[11px] min-w-[12px] text-left select-none">
              {pdfData?.numPages || 1}
            </span>
          </form>

          <button
            type="button"
            disabled={!pdfData || currentPage >= pdfData.numPages}
            onClick={() => handlePageChange(currentPage + 1)}
            data-tooltip="Next page (Right arrow / PageDown)"
            aria-label="Next page"
            className="noether-toolbar-btn w-[20px] h-[20px] rounded hover:bg-[#2c2c2c] hover:text-white text-[#999999] disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-default flex items-center justify-center transition-none cursor-pointer"
          >
            <ArrowRight01Icon size={11} />
          </button>
        </div>

        {/* Right Actions: Rotate, Presentation, Open in Tab, Code Toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRotateCw}
            data-tooltip="Rotate clockwise"
            aria-label="Rotate clockwise"
            className="noether-toolbar-btn w-[22px] h-[22px] rounded hover:bg-[#2c2c2c] hover:text-white text-[#999999] flex items-center justify-center transition-none cursor-pointer"
          >
            <RotateCcwIcon size={12} />
          </button>

          <button
            type="button"
            onClick={() => setIsPresenting(true)}
            data-tooltip="Fullscreen slideshow presentation"
            aria-label="Fullscreen slideshow presentation"
            className="noether-toolbar-btn w-[22px] h-[22px] rounded hover:bg-[#2c2c2c] hover:text-white text-[#999999] flex items-center justify-center transition-none cursor-pointer"
          >
            <Presentation01Icon size={13} />
          </button>

          <button
            type="button"
            onClick={handleOpenInTab}
            data-tooltip="Open PDF in dedicated tab"
            aria-label="Open PDF in dedicated tab"
            className="noether-toolbar-btn w-[22px] h-[22px] rounded hover:bg-[#2c2c2c] hover:text-white text-[#999999] flex items-center justify-center transition-none cursor-pointer"
          >
            <ExternalLinkIcon size={12} />
          </button>

          <div className="w-[1px] h-3 bg-[#333333] mx-0.5 shrink-0" />

          {/* Source Code Toggle button (</>) */}
          <button
            type="button"
            onClick={handleFocusEmbedCode}
            data-tooltip="Edit raw embed source markdown"
            aria-label="Edit raw embed source markdown"
            className="noether-toolbar-btn w-[22px] h-[22px] rounded hover:bg-[#2c2c2c] hover:text-white text-[#999999] flex items-center justify-center transition-none cursor-pointer"
          >
            <SourceCodeIcon size={13} />
          </button>
        </div>
      </div>

      {/* Main Container: Absolute Overlay Drawer + Full Width Slide Canvas Viewport */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-[#111111]">
        {/* Full-width Viewport & Slide Display */}
        <div
          ref={viewportRef}
          className="w-full h-full overflow-auto custom-scrollbar flex items-center justify-center p-3 relative select-none"
        >
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 text-[#777777] text-xs">
              <div className="w-5 h-5 border-2 border-[var(--noether-accent,#eb584d)] border-t-transparent rounded-full animate-spin" />
              <span>Loading PDF...</span>
            </div>
          )}

          {errorMessage && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 text-[#777777] text-xs text-center px-4">
              <File01Icon size={28} className="text-rose-400/60" />
              <span className="text-[#cccccc] font-medium">{documentTitle}</span>
              <span className="text-rose-400 text-[11px]">{errorMessage}</span>
              <button
                type="button"
                onClick={handleOpenInTab}
                className="mt-1 px-2.5 py-1 bg-[#222222] hover:bg-[#2c2c2c] border border-[#333333] text-white rounded text-xs cursor-pointer transition-none"
              >
                Try opening file
              </button>
            </div>
          )}

          {pdfData && !isLoading && !errorMessage && (
            <div className="flex items-center justify-center">
              <PdfPageCanvas
                key={`slide-${currentPage}-${scale}-${rotation}`}
                pdfDoc={pdfData.pdfDoc}
                pageNumber={currentPage}
                scale={scale}
                rotation={rotation}
                isVisible={true}
                pageInfo={activePageInfo}
                className="shadow-[0_4px_24px_rgba(0,0,0,0.6)] rounded-xs border border-[#2a2a2a]"
              />
            </div>
          )}
        </div>

        {/* Left Collapsible Thumbnail Drawer (Absolute Overlay ABOVE the PDF) */}
        {pdfData && isSidebarOpen && (
          <div
            data-pdf-sidebar="true"
            className="absolute inset-y-0 left-0 z-30 shadow-2xl border-r border-[var(--noether-border-base,#282828)] bg-[var(--noether-bg-card,#161616)]/95 backdrop-blur-md"
          >
            <PdfSidebar
              isOpen={isSidebarOpen}
              mode={sidebarMode}
              pdfDoc={pdfData.pdfDoc}
              numPages={pdfData.numPages}
              currentPage={currentPage}
              outline={pdfData.outline || []}
              pageInfos={pdfData.pageInfos || []}
              revealedPageNumber={revealedPageNumber}
              onSelectPage={(pageNum) => {
                handlePageChange(pageNum);
              }}
              className="h-full border-none"
            />
          </div>
        )}
      </div>

      {/* Portaled Sidebar Mode Dropdown (Drawer Options) */}
      {isSidebarMenuOpen &&
        createPortal(
          <div
            data-pdf-dropdown="sidebar"
            data-noether-popover="true"
            style={{
              position: 'fixed',
              top: `${sidebarMenuPos.top}px`,
              left: `${sidebarMenuPos.left}px`,
              zIndex: 99999,
              background: 'var(--noether-bg-popover, var(--noether-bg-card))',
              border: '1px solid var(--noether-border-base)',
              boxShadow: 'var(--noether-shadow-2)',
            }}
            className="w-[220px] rounded-lg p-1 text-xs text-[var(--noether-text-secondary)] select-none z-[99999] backdrop-blur-md flex flex-col gap-[1px]"
          >
            <button
              type="button"
              onClick={() => {
                setSidebarMode('thumbnails');
                setIsSidebarOpen(true);
                setIsSidebarMenuOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 rounded-[5px] flex items-center justify-between text-left text-xs cursor-pointer select-none transition-none ${
                sidebarMode === 'thumbnails' && isSidebarOpen
                  ? 'text-[var(--noether-text-primary)] bg-[var(--noether-btn-active-bg)] font-normal'
                  : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)] font-normal'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <DashboardSquare01Icon size={14} className="text-[var(--noether-text-muted)] shrink-0" />
                <span className="truncate">Thumbnails</span>
              </div>
              {sidebarMode === 'thumbnails' && isSidebarOpen && (
                <CheckIcon size={13} className="text-[var(--noether-text-primary)] shrink-0 ml-1.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setSidebarMode('outline');
                setIsSidebarOpen(true);
                setIsSidebarMenuOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 rounded-[5px] flex items-center justify-between text-left text-xs cursor-pointer select-none transition-none ${
                sidebarMode === 'outline' && isSidebarOpen
                  ? 'text-[var(--noether-text-primary)] bg-[var(--noether-btn-active-bg)] font-normal'
                  : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)] font-normal'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <LeftToRightListBulletIcon size={14} className="text-[var(--noether-text-muted)] shrink-0" />
                <span className="truncate">Table of contents</span>
              </div>
              {sidebarMode === 'outline' && isSidebarOpen && (
                <CheckIcon size={13} className="text-[var(--noether-text-primary)] shrink-0 ml-1.5" />
              )}
            </button>

            <div className="h-[1px] bg-[var(--noether-border-base)] my-1 mx-1 shrink-0" />

            <button
              type="button"
              onClick={() => {
                setSidebarMode('outline');
                setIsSidebarOpen(true);
                setRevealedPageNumber(currentPage);
                setIsSidebarMenuOpen(false);
              }}
              className="w-full px-2.5 py-1.5 rounded-[5px] flex items-center gap-2.5 text-left text-xs text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)] cursor-pointer select-none transition-none"
            >
              <ArrowRight02Icon size={14} className="text-[var(--noether-text-muted)] shrink-0" />
              <span className="truncate">Reveal page in table of contents</span>
            </button>
          </div>,
          document.body
        )}

      {/* Portaled Zoom Preset Dropdown (Matching SortDropdown style) */}
      {isZoomMenuOpen &&
        createPortal(
          <div
            data-pdf-dropdown="zoom"
            style={{
              position: 'fixed',
              top: `${zoomMenuPos.top}px`,
              left: `${zoomMenuPos.left}px`,
              zIndex: 99999,
              background: 'var(--noether-bg-popover, var(--noether-bg-card))',
              border: '1px solid var(--noether-border-base)',
              boxShadow: 'var(--noether-shadow-2)',
            }}
            className="w-[180px] rounded-lg p-1 text-xs text-[var(--noether-text-secondary)] select-none z-[99999] backdrop-blur-md flex flex-col gap-[1px]"
          >
            <button
              type="button"
              onClick={() => {
                setZoomMode('fit-width');
                setIsZoomMenuOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 rounded-[5px] flex items-center justify-between text-left text-xs cursor-pointer select-none transition-none ${
                zoomMode === 'fit-width'
                  ? 'text-[var(--noether-text-primary)] bg-[var(--noether-btn-active-bg)] font-normal'
                  : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)] font-normal'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <CenterFocusIcon size={13} className="text-[var(--noether-text-muted)] shrink-0" />
                <span className="truncate">Fit to width</span>
              </div>
              {zoomMode === 'fit-width' && (
                <CheckIcon size={13} className="text-[var(--noether-text-primary)] shrink-0 ml-1.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setZoomMode('fit-page');
                setIsZoomMenuOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 rounded-[5px] flex items-center justify-between text-left text-xs cursor-pointer select-none transition-none ${
                zoomMode === 'fit-page'
                  ? 'text-[var(--noether-text-primary)] bg-[var(--noether-btn-active-bg)] font-normal'
                  : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)] font-normal'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FitToScreenIcon size={13} className="text-[var(--noether-text-muted)] shrink-0" />
                <span className="truncate">Fit to page</span>
              </div>
              {zoomMode === 'fit-page' && (
                <CheckIcon size={13} className="text-[var(--noether-text-primary)] shrink-0 ml-1.5" />
              )}
            </button>

            <div className="h-[1px] bg-[var(--noether-border-base)] my-1 mx-1" />

            {zoomPresets.map((preset) => {
              const isSelected = zoomMode === 'custom' && Math.abs(scale - preset.scale) < 0.05;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setZoomMode('custom');
                    setScale(preset.scale);
                    setIsZoomMenuOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-[5px] flex items-center justify-between text-left text-xs cursor-pointer select-none transition-none ${
                    isSelected
                      ? 'text-[var(--noether-text-primary)] bg-[var(--noether-btn-active-bg)] font-normal'
                      : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-btn-hover-bg)] hover:text-[var(--noether-text-primary)] font-normal'
                  }`}
                >
                  <span className="tabular-nums font-sans truncate">{preset.label}</span>
                  {isSelected && (
                    <CheckIcon size={13} className="text-[var(--noether-text-primary)] shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}

      {/* Fullscreen Slideshow Presentation Overlay */}
      {isPresenting && pdfData && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            const x = e.clientX;
            if (x < window.innerWidth * 0.3) {
              handlePageChange(currentPage - 1);
            } else {
              handlePageChange(currentPage + 1);
            }
          }}
          className="fixed inset-0 z-[100000] bg-black flex items-center justify-center select-none overflow-hidden"
          style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}
        >
          <div className="flex items-center justify-center pointer-events-none">
            <PdfPageCanvas
              key={`present-slide-${currentPage}`}
              pdfDoc={pdfData.pdfDoc}
              pageNumber={currentPage}
              scale={Math.min(
                (window.innerWidth - 64) / (activePageInfo?.width || 800),
                (window.innerHeight - 64) / (activePageInfo?.height || 600)
              )}
              rotation={rotation}
              isVisible={true}
              pageInfo={activePageInfo}
              className="shadow-[0_12px_48px_rgba(0,0,0,0.95)] pointer-events-auto"
            />
          </div>

          {/* Minimalist Bottom HUD Controls */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100001] flex items-center gap-2 bg-[#1c1c1c]/90 border border-[#333333] px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md select-none pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              data-tooltip="Previous slide (Left arrow)"
              aria-label="Previous slide"
              className="p-1 rounded text-white/60 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
            >
              <ArrowLeft01Icon size={14} />
            </button>

            <span className="tabular-nums font-sans px-1 text-xs text-white/80">
              {currentPage} / {pdfData.numPages}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= pdfData.numPages}
              data-tooltip="Next slide (Right arrow)"
              aria-label="Next slide"
              className="p-1 rounded text-white/60 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
            >
              <ArrowRight01Icon size={14} />
            </button>

            <div className="w-[1px] h-3.5 bg-white/20 mx-1 shrink-0" />

            <button
              type="button"
              onClick={() => setIsPresenting(false)}
              data-tooltip="Exit presentation (Esc)"
              aria-label="Exit presentation"
              className="p-1 rounded text-white/60 hover:text-white cursor-pointer"
            >
              <Cancel01Icon size={14} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

PdfEmbedViewer.displayName = 'PdfEmbedViewer';
export default PdfEmbedViewer;
