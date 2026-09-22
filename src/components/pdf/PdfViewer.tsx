import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { PdfSubHeaderLeftActions, PdfSubHeaderRightActions } from './PdfToolbar';
import { PdfSidebar } from './PdfSidebar';
import { PdfPageCanvas, preloadPdfPage } from './PdfPageCanvas';
import { loadPdfDocument, LoadedPdfData } from './pdfLoader';
import { usePdfSmoothZoom } from './usePdfSmoothZoom';
import { PdfSidebarMode, PdfZoomMode, PdfViewerProps } from './types';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { getDocumentDiskPath, getDocumentPath } from '@/lib/db/documents';
import platform from '@/lib/platform/platformAdapter';
import type { DocMenuActionDefinition } from '@/core/extensions/types';
import {
  File01Icon,
  RotateCcwIcon,
  Presentation01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PrinterIcon,
  Download01Icon,
  ExternalLinkIcon,
  FolderOpenIcon,
  Cancel01Icon,
  PlusSignIcon,
  MinusSignIcon,
} from '@/components/common/Icons';

/**
 * Universal Native Chrome-Style PDF Document Viewer for Noether.
 *
 * Technical Rationale:
 * - Operates entirely through Inversion of Control (IoC) registered via ViewRegistry
 *   and FileTypeRegistry, avoiding hardcoded conditional branches in editor core.
 * - Continuous vertical scroll with sharp High-DPI canvas rendering.
 * - Off-thread Web Worker parsing via Mozilla's pdfjs-dist generic distribution.
 * - Dual-mode collapsible drawer: Page Thumbnails and Table of Contents (Outline bookmarks).
 * - Instant desktop responsiveness (Rule 6: zero artificial animation or frame transition lag).
 */
export const PdfViewer: React.FC<PdfViewerProps> = React.memo(({
  documentId,
  tabId,
  doc: propDoc,
  filePath: propFilePath,
  app,
  className = '',
  isSidebar = false,
  embedded = false,
}) => {
  const documents = useDocumentStore((s) => s.documents);
  const showToast = useWorkspaceStore((s) => s.showToast);

  // Resolve target document
  const currentDoc = useMemo(() => {
    if (propDoc) return propDoc;
    if (documentId) return documents.find((d) => d.id === documentId) || null;
    return null;
  }, [propDoc, documentId, documents]);

  // Resolve disk path if physical file
  const diskPath = useMemo(() => {
    if (propFilePath) return propFilePath;
    if (currentDoc) {
      return getDocumentDiskPath(currentDoc, getDocumentPath(currentDoc, documents));
    }
    return '';
  }, [propFilePath, currentDoc, documents]);

  const documentTitle = currentDoc?.title || diskPath.split('/').pop() || 'PDF Document';

  // Core Viewer State
  const [pdfData, setPdfData] = useState<LoadedPdfData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [zoomMode, setZoomMode] = useState<PdfZoomMode>('fit-width');
  const [rotation, setRotation] = useState<number>(0);
  const [isPresenting, setIsPresenting] = useState<boolean>(false);

  // Default sidebar closed in narrow sidebar dock or mobile, open in full workspace tab
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(!isSidebar);
  const [sidebarMode, setSidebarMode] = useState<PdfSidebarMode>('thumbnails');
  const [revealedPageNumber, setRevealedPageNumber] = useState<number | null>(null);

  // Visible pages in or near viewport for virtualized rendering
  const [visiblePageSet, setVisiblePageSet] = useState<Set<number>>(new Set([1, 2]));

  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContentRef = useRef<HTMLDivElement>(null);

  // GPU-accelerated smooth touchpad pinch and Ctrl+scroll zoom
  usePdfSmoothZoom({
    viewportRef,
    contentRef: pagesContentRef,
    scale,
    onScaleCommit: (newScale) => {
      setZoomMode('custom');
      setScale(newScale);
    },
    enabled: !isPresenting,
  });

  const isPresentingRef = useRef<boolean>(false);
  isPresentingRef.current = isPresenting;

  // Unmount cleanup: guarantee the window exits OS fullscreen if PdfViewer unmounts during presentation
  useEffect(() => {
    return () => {
      if (isPresentingRef.current) {
        platform.setFullscreen(false).catch(() => {});
      }
    };
  }, []);

  // 1. Load PDF Document asynchronously
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMessage(null);

    loadPdfDocument(currentDoc || documentId, diskPath)
      .then((data) => {
        if (isCancelled) return;
        setPdfData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[PDF] Failed to load PDF document:', err);
        setErrorMessage(err?.message || 'Failed to load PDF document');
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentDoc?.id, currentDoc?.content_json, diskPath, documentId]);

  // Precompute page vertical layout offsets for instant math-based viewport culling without DOM reflow
  const pageOffsets = useMemo(() => {
    if (!pdfData || pdfData.pageInfos.length === 0) return [];
    const isSideways = rotation === 90 || rotation === 270;
    const gap = 8;
    let currentTop = 16;

    return pdfData.pageInfos.map((info, idx) => {
      const baseW = isSideways ? info.height : info.width;
      const baseH = isSideways ? info.width : info.height;
      // Border is 1px top + 1px bottom = 2px
      const height = Math.floor(baseH * scale) + 2;
      const top = currentTop;
      const bottom = top + height;
      currentTop = bottom + gap;
      return {
        pageNumber: idx + 1,
        top,
        bottom,
        height,
      };
    });
  }, [pdfData, scale, rotation]);

  // 2. Dynamic Auto-fit Zoom Calculation (Stable: uses canonical document dimensions)
  const recomputeFitScale = useCallback(() => {
    if (isPresenting) return;
    if (!viewportRef.current || !pdfData || pdfData.pageInfos.length === 0) return;

    const viewport = viewportRef.current;
    const vpWidth = viewport.clientWidth;
    const vpHeight = viewport.clientHeight;
    if (vpWidth <= 0 || vpHeight <= 0) return;

    // Use primary page geometry so scale does not recalculate or jitter while scrolling
    const pageInfo = pdfData.pageInfos[0];
    const isSideways = rotation === 90 || rotation === 270;
    const pageWidth = isSideways ? pageInfo.height : pageInfo.width;
    const pageHeight = isSideways ? pageInfo.width : pageHeightForAspect(pageInfo);

    if (zoomMode === 'fit-width') {
      const horizontalPadding = 48;
      const targetScale = (vpWidth - horizontalPadding) / pageWidth;
      setScale(Math.max(0.3, Math.min(3.0, targetScale)));
    } else if (zoomMode === 'fit-page') {
      const verticalPadding = 32;
      const targetScale = (vpHeight - verticalPadding) / pageHeight;
      setScale(Math.max(0.3, Math.min(3.0, targetScale)));
    }
  }, [pdfData, rotation, zoomMode, isPresenting]);

  // Helper to get orientation-adjusted page height
  function pageHeightForAspect(info: any) {
    const isSideways = rotation === 90 || rotation === 270;
    return isSideways ? info.width : info.height;
  }

  // Trigger fit recalculation on resize / mode change / load
  useEffect(() => {
    if (isPresenting) return;
    recomputeFitScale();
    const handleResize = () => {
      if (!isPresenting) recomputeFitScale();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [recomputeFitScale, isPresenting]);

  const scrollRafRef = useRef<number | null>(null);
  const currentPageRef = useRef<number>(currentPage);
  currentPageRef.current = currentPage;

  // Viewport Intersection & Virtualized Page Set calculation
  const updateVisiblePages = useCallback((explicitTargetPage?: number) => {
    const vp = viewportRef.current;
    if (!vp || !pdfData || pageOffsets.length === 0) return;

    const vpTop = vp.scrollTop;
    const vpBottom = vpTop + vp.clientHeight;
    const vpHeight = vp.clientHeight;
    const buffer = 800;

    const newVisible = new Set<number>();
    let bestCandidatePage = explicitTargetPage ?? currentPageRef.current;
    let maxVisibilityRatio = -1;
    let currentVisibilityRatio = 0;
    let currentCoverageRatio = 0;

    for (let i = 0; i < pageOffsets.length; i++) {
      const offset = pageOffsets[i];

      // 1. Buffer check for virtualization
      if (offset.bottom >= vpTop - buffer && offset.top <= vpBottom + buffer) {
        newVisible.add(offset.pageNumber);
      }

      // 2. Exact viewport intersection
      const overlapTop = Math.max(offset.top, vpTop);
      const overlapBottom = Math.min(offset.bottom, vpBottom);
      const visibleHeight = Math.max(0, overlapBottom - overlapTop);

      if (visibleHeight > 0) {
        const visibilityRatio = visibleHeight / offset.height;
        const coverageRatio = visibleHeight / vpHeight;

        if (offset.pageNumber === currentPageRef.current) {
          currentVisibilityRatio = visibilityRatio;
          currentCoverageRatio = coverageRatio;
        }

        if (visibilityRatio > maxVisibilityRatio) {
          maxVisibilityRatio = visibilityRatio;
          bestCandidatePage = offset.pageNumber;
        }
      }
    }

    // Stability Invariant: Guarantee active page and adjacent neighbors are always in visible set
    const active = explicitTargetPage ?? currentPageRef.current;
    newVisible.add(active);
    if (active > 1) newVisible.add(active - 1);
    if (active < pdfData.numPages) newVisible.add(active + 1);

    // Update visible canvas set only when content set changes
    setVisiblePageSet((prev) => {
      if (prev.size === newVisible.size) {
        let isSame = true;
        for (const p of newVisible) {
          if (!prev.has(p)) {
            isSame = false;
            break;
          }
        }
        if (isSame) return prev;
      }
      return newVisible;
    });

    if (explicitTargetPage !== undefined) {
      if (explicitTargetPage !== currentPageRef.current && explicitTargetPage >= 1 && explicitTargetPage <= pdfData.numPages) {
        currentPageRef.current = explicitTargetPage;
        setCurrentPage(explicitTargetPage);
      }
      return;
    }

    // PDF.js Stability Threshold (Hysteresis):
    // Switch active page only if candidate is truly dominant or current page has largely left view
    let targetPage = active;

    if (bestCandidatePage !== active) {
      const candidateDominant = maxVisibilityRatio > currentVisibilityRatio + 0.15;
      const currentLeftView = currentVisibilityRatio < 0.20 && currentCoverageRatio < 0.20;
      const candidateCoversMajority = maxVisibilityRatio > 0.55;

      if (candidateDominant || currentLeftView || candidateCoversMajority) {
        targetPage = bestCandidatePage;
      }
    }

    if (targetPage !== active && targetPage >= 1 && targetPage <= pdfData.numPages) {
      currentPageRef.current = targetPage;
      setCurrentPage(targetPage);
    }
  }, [pdfData, pageOffsets]);

  // Sync visible pages when pageOffsets update (scale / rotation change)
  useEffect(() => {
    updateVisiblePages();
  }, [updateVisiblePages]);

  // 3. Scroll to specific page
  const scrollToPage = useCallback((pageNum: number) => {
    if (!viewportRef.current) return;
    const pageIndex = Math.max(0, Math.min(pageOffsets.length - 1, pageNum - 1));
    const offset = pageOffsets[pageIndex];
    if (offset) {
      viewportRef.current.scrollTo({ top: Math.max(0, offset.top - 16), behavior: 'auto' });
      currentPageRef.current = pageNum;
      setCurrentPage(pageNum);
      updateVisiblePages(pageNum);
    }
  }, [pageOffsets, updateVisiblePages]);

  // 4. Viewport Scroll Listener for Virtualization & Dominant Page Tracking (PDF.js standard with hysteresis)
  const handleViewportScroll = useCallback(() => {
    if (scrollRafRef.current !== null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateVisiblePages();
    });
  }, [updateVisiblePages]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  // Zoom Actions
  const handleZoomIn = useCallback(() => {
    setZoomMode('custom');
    setScale((prev) => Math.min(4.0, +(prev + 0.15).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomMode('custom');
    setScale((prev) => Math.max(0.25, +(prev - 0.15).toFixed(2)));
  }, []);

  const handleSetZoomMode = useCallback((mode: PdfZoomMode, customScale?: number) => {
    setZoomMode(mode);
    if (customScale) {
      setScale(customScale);
    }
  }, []);

  // Rotation Actions
  const handleRotateCw = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleRotateCcw = useCallback(() => {
    setRotation((prev) => (prev + 270) % 360);
  }, []);

  // Table of Contents Reveal Action
  const handleRevealInToc = useCallback(() => {
    setIsSidebarOpen(true);
    setSidebarMode('outline');
    setRevealedPageNumber(currentPage);
  }, [currentPage]);

  // Print Action
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Download / Save Action
  const handleDownload = useCallback(() => {
    if (!pdfData?.rawBytes) return;
    try {
      const blob = new Blob([pdfData.rawBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentTitle.endsWith('.pdf') ? documentTitle : `${documentTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PDF downloaded successfully', 'info');
    } catch {
      showToast('Failed to save PDF copy', 'warning');
    }
  }, [pdfData?.rawBytes, documentTitle, showToast]);

  // OS App / Explorer Integration
  const handleOpenInDefaultApp = useCallback(() => {
    if (diskPath) {
      platform.openInDefaultApp(diskPath);
    }
  }, [diskPath]);

  const handleRevealInExplorer = useCallback(() => {
    if (diskPath) {
      platform.revealInExplorer(diskPath);
    }
  }, [diskPath]);

  // ── Presentation Mode ──
  const presentationContainerRef = useRef<HTMLDivElement>(null);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);
  const [viewportDims, setViewportDims] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));

  // Presentation Mode Zoom & Pan State (matching Image Lightbox physics)
  const [presentZoomScale, setPresentZoomScale] = useState<number>(1);
  const [presentPosition, setPresentPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPresent, setIsDraggingPresent] = useState<boolean>(false);

  const presentZoomScaleRef = useRef(presentZoomScale);
  const presentPositionRef = useRef(presentPosition);
  const presentMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const presentDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const presentMouseDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const presentHasMovedRef = useRef<boolean>(false);

  useEffect(() => {
    presentZoomScaleRef.current = presentZoomScale;
  }, [presentZoomScale]);

  useEffect(() => {
    presentPositionRef.current = presentPosition;
  }, [presentPosition]);

  // Reset presentation zoom & pan whenever the page changes or presentation starts
  useEffect(() => {
    setPresentZoomScale(1);
    setPresentPosition({ x: 0, y: 0 });
    setIsDraggingPresent(false);
    presentHasMovedRef.current = false;
  }, [currentPage, isPresenting]);

  // Anchor presentation zoom scaling relative to screen center coordinates
  const applyPresentationZoom = useCallback((zoomFactor: number, clientX: number, clientY: number) => {
    const currentScale = presentZoomScaleRef.current;
    const currentPos = presentPositionRef.current;
    let newScale = Math.min(20, Math.max(1, currentScale * zoomFactor));

    // Snap back cleanly to 1x and reset pan when zoom hits 1x
    if (newScale <= 1.02) {
      setPresentZoomScale(1);
      setPresentPosition({ x: 0, y: 0 });
      return;
    }

    if (Math.abs(newScale - currentScale) < 0.0001) return;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const mxRel = clientX - cx;
    const myRel = clientY - cy;

    const ratio = newScale / currentScale;
    const newX = mxRel - (mxRel - currentPos.x) * ratio;
    const newY = myRel - (myRel - currentPos.y) * ratio;

    setPresentZoomScale(newScale);
    setPresentPosition({ x: newX, y: newY });
  }, []);

  const syncView = useCallback(() => {
    recomputeFitScale();
    scrollToPage(currentPageRef.current);
    updateVisiblePages(currentPageRef.current);
  }, [recomputeFitScale, scrollToPage, updateVisiblePages]);

  const handleStartPresentation = useCallback(async () => {
    try {
      await platform.setFullscreen(true);
    } catch (e) {
      console.error('[PdfViewer] Failed to enter fullscreen:', e);
    }
    setIsPresenting(true);
    setIsControlsVisible(true);
  }, []);

  const handleExitPresentation = useCallback(async () => {
    try {
      await platform.setFullscreen(false);
    } catch (e) {
      console.error('[PdfViewer] Failed to exit fullscreen:', e);
    }
    setIsPresenting(false);
    setPresentZoomScale(1);
    setPresentPosition({ x: 0, y: 0 });
    // Multi-stage layout synchronization covering the OS window restore animation
    syncView();
    setTimeout(syncView, 60);
    setTimeout(syncView, 180);
    setTimeout(syncView, 380);
  }, [syncView]);

  // Keep viewport dimensions updated dynamically during presentation (handles monitor resize & fullscreen layout shifts)
  useEffect(() => {
    if (!isPresenting) return;
    const handleResize = () => {
      setViewportDims({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    const timer1 = setTimeout(handleResize, 100);
    const timer2 = setTimeout(handleResize, 300);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isPresenting]);

  // Handle system fullscreen change (e.g. user pressed Esc on browser/OS level)
  useEffect(() => {
    if (!isPresenting) return;
    const onFullscreenChange = async () => {
      const isFull = await platform.isFullscreen();
      if (!isFull) {
        setIsPresenting(false);
        setPresentZoomScale(1);
        setPresentPosition({ x: 0, y: 0 });
        syncView();
        setTimeout(syncView, 60);
        setTimeout(syncView, 180);
        setTimeout(syncView, 380);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [isPresenting, syncView]);

  // Native non-passive wheel and gesture listener: strictly zoom in/out, zero directional scroll
  useEffect(() => {
    if (!isPresenting) return;
    const container = presentationContainerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentScale = presentZoomScaleRef.current;
      const currentPos = presentPositionRef.current;

      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dy *= 16;
      } else if (e.deltaMode === 2) {
        dy *= window.innerHeight;
      }

      // Smooth zoom exclusively (no directional scroll or pan)
      let zoomFactor: number;
      if (Math.abs(dy) < 40 && e.deltaMode === 0) {
        // High-precision touchpad / continuous scroll
        zoomFactor = Math.exp(-dy * 0.005);
      } else {
        // Standard mouse wheel notches
        zoomFactor = dy < 0 ? 1.15 : 0.87;
      }

      let newScale = Math.min(20, Math.max(1, currentScale * zoomFactor));

      // Snap back cleanly to 1x when zooming all the way out
      if (newScale <= 1.02) {
        setPresentZoomScale(1);
        setPresentPosition({ x: 0, y: 0 });
        return;
      }

      if (Math.abs(newScale - currentScale) > 0.0001) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const mxRel = e.clientX - cx;
        const myRel = e.clientY - cy;

        const ratio = newScale / currentScale;
        const newX = mxRel - (mxRel - currentPos.x) * ratio;
        const newY = myRel - (myRel - currentPos.y) * ratio;

        setPresentZoomScale(newScale);
        setPresentPosition({ x: newX, y: newY });
      }
    };

    // WebKit / Safari Gesture Events
    let gestureInitialScale = 1;
    let gestureInitialTransform = { x: 0, y: 0 };

    const handleGestureStart = (e: any) => {
      e.preventDefault();
      gestureInitialScale = presentZoomScaleRef.current;
      gestureInitialTransform = { x: presentPositionRef.current.x, y: presentPositionRef.current.y };
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      let newScale = Math.min(20, Math.max(1, gestureInitialScale * (e.scale || 1)));
      if (newScale <= 1.02) {
        setPresentZoomScale(1);
        setPresentPosition({ x: 0, y: 0 });
        return;
      }
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const mouseX = (e.clientX !== undefined ? e.clientX : cx) - cx;
      const mouseY = (e.clientY !== undefined ? e.clientY : cy) - cy;

      const ratio = newScale / gestureInitialScale;
      const newX = mouseX - (mouseX - gestureInitialTransform.x) * ratio;
      const newY = mouseY - (mouseY - gestureInitialTransform.y) * ratio;

      setPresentZoomScale(newScale);
      setPresentPosition({ x: newX, y: newY });
    };

    const handleGestureEnd = (e: any) => {
      e.preventDefault();
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    container.addEventListener('gesturestart', handleGestureStart, { passive: false });
    container.addEventListener('gesturechange', handleGestureChange, { passive: false });
    container.addEventListener('gestureend', handleGestureEnd, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
      container.removeEventListener('gesturestart', handleGestureStart);
      container.removeEventListener('gesturechange', handleGestureChange);
      container.removeEventListener('gestureend', handleGestureEnd);
    };
  }, [isPresenting]);

  // Pan dragging - initiated strictly when zoomed in
  const handlePresentationMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      if (presentZoomScaleRef.current <= 1.01) return;
      setIsDraggingPresent(true);
      presentHasMovedRef.current = false;
      presentMouseDownPosRef.current = { x: e.clientX, y: e.clientY };
      presentDragStartRef.current = {
        x: e.clientX - presentPosition.x,
        y: e.clientY - presentPosition.y,
      };
    },
    [presentPosition]
  );

  useEffect(() => {
    if (!isDraggingPresent) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      presentMousePosRef.current = { x: e.clientX, y: e.clientY };
      const dist = Math.hypot(
        e.clientX - presentMouseDownPosRef.current.x,
        e.clientY - presentMouseDownPosRef.current.y
      );
      if (dist > 3) {
        presentHasMovedRef.current = true;
      }

      setPresentPosition({
        x: e.clientX - presentDragStartRef.current.x,
        y: e.clientY - presentDragStartRef.current.y,
      });
    };

    const handleWindowMouseUp = () => {
      setIsDraggingPresent(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDraggingPresent]);

  const handlePresentationDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (presentZoomScale > 1.02 || presentPosition.x !== 0 || presentPosition.y !== 0) {
        setPresentZoomScale(1);
        setPresentPosition({ x: 0, y: 0 });
      } else {
        applyPresentationZoom(2.5, e.clientX, e.clientY);
      }
    },
    [presentZoomScale, presentPosition, applyPresentationZoom]
  );

  // Auto-hide HUD controls after 3 seconds of inactivity during presentation
  const handlePresentationMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPresenting) return;
    presentMousePosRef.current = { x: e.clientX, y: e.clientY };
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 3000);
  }, [isPresenting]);

  const handlePresentationBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // If mouse moved during drag or if currently zoomed in, do not turn page
      if (presentHasMovedRef.current) return;
      if (presentZoomScaleRef.current > 1.01) return;
      if (!pdfData) return;

      const x = e.clientX;
      if (x < window.innerWidth * 0.3) {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else {
        setCurrentPage((prev) => Math.min(pdfData.numPages, prev + 1));
      }
    },
    [pdfData]
  );

  // Keyboard navigation & zoom shortcuts during presentation mode
  useEffect(() => {
    if (!isPresenting) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleExitPresentation();
        return;
      }

      if (e.key === '+' || e.key === '=' || e.key === 'NumpadAdd') {
        e.preventDefault();
        const curMouse =
          presentMousePosRef.current.x > 0
            ? presentMousePosRef.current
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        applyPresentationZoom(1.25, curMouse.x, curMouse.y);
        return;
      }

      if (e.key === '-' || e.key === '_' || e.key === 'NumpadSubtract') {
        e.preventDefault();
        const curMouse =
          presentMousePosRef.current.x > 0
            ? presentMousePosRef.current
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        applyPresentationZoom(0.8, curMouse.x, curMouse.y);
        return;
      }

      if (e.key === '0' || e.key === 'Numpad0') {
        e.preventDefault();
        setPresentZoomScale(1);
        setPresentPosition({ x: 0, y: 0 });
        return;
      }

      // Slide navigation: arrows always change slides (resetting zoom)
      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === ' ' ||
        e.key === 'Enter' ||
        e.key === 'PageDown'
      ) {
        e.preventDefault();
        setCurrentPage((prev) => Math.min(pdfData?.numPages || 1, prev + 1));
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowUp' ||
        e.key === 'Backspace' ||
        e.key === 'PageUp'
      ) {
        e.preventDefault();
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentPage(pdfData?.numPages || 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPresenting, pdfData?.numPages, handleExitPresentation, applyPresentationZoom]);

  const activePageInfo = useMemo(() => {
    if (!pdfData || pdfData.pageInfos.length === 0) return undefined;
    return pdfData.pageInfos[currentPage - 1];
  }, [pdfData, currentPage]);

  const presentationScale = useMemo(() => {
    if (!isPresenting || !activePageInfo) return 1;
    const isSideways = rotation === 90 || rotation === 270;
    const pw = isSideways ? activePageInfo.height : activePageInfo.width;
    const ph = isSideways ? activePageInfo.width : activePageInfo.height;
    // Clearance for comfortable viewing and to ensure bottom floating HUD doesn't overlap slide content
    const availW = Math.max(300, viewportDims.width - 48);
    const availH = Math.max(300, viewportDims.height - 80);
    const scaleW = availW / pw;
    const scaleH = availH / ph;
    return Math.min(scaleW, scaleH);
  }, [isPresenting, activePageInfo, rotation, viewportDims]);

  const getPresentationScaleForPage = useCallback((pageNum: number) => {
    if (!pdfData || pageNum < 1 || pageNum > pdfData.pageInfos.length) return presentationScale;
    const info = pdfData.pageInfos[pageNum - 1];
    const isSideways = rotation === 90 || rotation === 270;
    const pw = isSideways ? info.height : info.width;
    const ph = isSideways ? info.width : info.height;
    const availW = Math.max(300, viewportDims.width - 48);
    const availH = Math.max(300, viewportDims.height - 80);
    return Math.min(availW / pw, availH / ph);
  }, [pdfData, rotation, viewportDims, presentationScale]);

  // Preload adjacent slides in presentation mode for instant, zero-flash navigation
  useEffect(() => {
    if (!isPresenting || !pdfData?.pdfDoc) return;
    const prevPage = currentPage - 1;
    const nextPage = currentPage + 1;
    if (prevPage >= 1) {
      preloadPdfPage(pdfData.pdfDoc, prevPage, getPresentationScaleForPage(prevPage), rotation);
    }
    if (nextPage <= pdfData.numPages) {
      preloadPdfPage(pdfData.pdfDoc, nextPage, getPresentationScaleForPage(nextPage), rotation);
    }
  }, [isPresenting, currentPage, rotation, pdfData, getPresentationScaleForPage]);

  // Integrated Doc Menu Actions (PDF tools inside native three-dots menu)
  const customDocMenuActions = useMemo<DocMenuActionDefinition[]>(() => {
    const actions: DocMenuActionDefinition[] = [
      {
        id: 'pdf-rotate-cw',
        title: 'Rotate Clockwise',
        icon: <RotateCcwIcon size={14} />,
        order: 10,
        group: 'tools',
        onClick: () => handleRotateCw(),
      },
      {
        id: 'pdf-rotate-ccw',
        title: 'Rotate Counter-Clockwise',
        icon: <RotateCcwIcon size={14} className="scale-x-[-1]" />,
        order: 11,
        group: 'tools',
        onClick: () => handleRotateCcw(),
      },
      {
        id: 'pdf-present',
        title: 'Present Slideshow',
        icon: <Presentation01Icon size={14} />,
        order: 12,
        group: 'tools',
        onClick: () => handleStartPresentation(),
      },
      {
        id: 'pdf-print',
        title: 'Print PDF',
        icon: <PrinterIcon size={14} />,
        order: 13,
        group: 'tools',
        onClick: () => handlePrint(),
      },
      {
        id: 'pdf-download',
        title: 'Save a Copy...',
        icon: <Download01Icon size={14} />,
        order: 14,
        group: 'tools',
        onClick: () => handleDownload(),
      },
    ];

    if (diskPath) {
      actions.push(
        {
          id: 'pdf-open-default-app',
          title: 'Open in Default App',
          icon: <ExternalLinkIcon size={14} />,
          order: 15,
          group: 'tools',
          onClick: () => handleOpenInDefaultApp(),
        },
        {
          id: 'pdf-reveal-explorer',
          title: 'Reveal in File Explorer',
          icon: <FolderOpenIcon size={14} />,
          order: 16,
          group: 'tools',
          onClick: () => handleRevealInExplorer(),
        }
      );
    }

    return actions;
  }, [
    diskPath,
    handleRotateCw,
    handleRotateCcw,
    handleStartPresentation,
    handlePrint,
    handleDownload,
    handleOpenInDefaultApp,
    handleRevealInExplorer,
  ]);

  // Keyboard Shortcuts & Ctrl + MouseWheel Zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]'))
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleSetZoomMode('fit-width');
        } else if (e.key === ']') {
          e.preventDefault();
          handleRotateCw();
        } else if (e.key === '[') {
          e.preventDefault();
          handleRotateCcw();
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handlePrint();
        }
      } else {
        if (e.key === 'F5') {
          e.preventDefault();
          handleStartPresentation();
        } else if (
          e.key === 'ArrowRight' ||
          e.key === 'ArrowDown' ||
          e.key === 'PageDown' ||
          e.key === ' ' ||
          e.key === '>' ||
          e.key === '.'
        ) {
          e.preventDefault();
          if (pdfData && currentPage < pdfData.numPages) {
            scrollToPage(currentPage + 1);
          }
        } else if (
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowUp' ||
          e.key === 'PageUp' ||
          e.key === 'Backspace' ||
          e.key === '<' ||
          e.key === ','
        ) {
          e.preventDefault();
          if (currentPage > 1) {
            scrollToPage(currentPage - 1);
          }
        } else if (e.key === 'Home') {
          e.preventDefault();
          scrollToPage(1);
        } else if (e.key === 'End') {
          e.preventDefault();
          if (pdfData) {
            scrollToPage(pdfData.numPages);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const onCmdZoomIn = () => handleZoomIn();
    const onCmdZoomOut = () => handleZoomOut();
    const onCmdFitWidth = () => handleSetZoomMode('fit-width');
    const onCmdRotateCw = () => handleRotateCw();
    const onCmdToggleSidebar = () => setIsSidebarOpen((prev) => !prev);
    const onCmdPresent = () => handleStartPresentation();

    window.addEventListener('noether:pdf-zoom-in', onCmdZoomIn);
    window.addEventListener('noether:pdf-zoom-out', onCmdZoomOut);
    window.addEventListener('noether:pdf-fit-width', onCmdFitWidth);
    window.addEventListener('noether:pdf-rotate-cw', onCmdRotateCw);
    window.addEventListener('noether:pdf-toggle-sidebar', onCmdToggleSidebar);
    window.addEventListener('noether:pdf-present', onCmdPresent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('noether:pdf-zoom-in', onCmdZoomIn);
      window.removeEventListener('noether:pdf-zoom-out', onCmdZoomOut);
      window.removeEventListener('noether:pdf-fit-width', onCmdFitWidth);
      window.removeEventListener('noether:pdf-rotate-cw', onCmdRotateCw);
      window.removeEventListener('noether:pdf-toggle-sidebar', onCmdToggleSidebar);
      window.removeEventListener('noether:pdf-present', onCmdPresent);
    };
  }, [
    handleZoomIn,
    handleZoomOut,
    handleSetZoomMode,
    handleRotateCw,
    handleRotateCcw,
    handlePrint,
    handleStartPresentation,
    currentPage,
    pdfData,
    scrollToPage,
  ]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className={`flex-1 h-full flex flex-col min-w-0 overflow-hidden bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] select-none relative outline-none ${className}`}
    >
      {/* Native Document Subheader - 100% consistent with all documents in Noether */}
      {!isSidebar && !embedded && (
        <PageSubHeader
          title={documentTitle}
          document={currentDoc}
          icon={<File01Icon size={14} />}
          showReadingToggle={false}
          showBookmark={Boolean(currentDoc)}
          showSearch={false}
          showDocOptions={true}
          borderBottom={true}
          customDocMenuActions={customDocMenuActions}
          customLeftActions={
            <PdfSubHeaderLeftActions
              isSidebarOpen={isSidebarOpen && Boolean(pdfData)}
              sidebarMode={sidebarMode}
              onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
              onSelectSidebarMode={(mode) => {
                setSidebarMode(mode);
                setIsSidebarOpen(true);
              }}
              onRevealInToc={handleRevealInToc}
            />
          }
          customRightActions={
            <PdfSubHeaderRightActions
              currentPage={currentPage}
              numPages={pdfData?.numPages || 1}
              scale={scale}
              zoomMode={zoomMode}
              onPageChange={scrollToPage}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onSetZoomMode={handleSetZoomMode}
              onRotateCw={handleRotateCw}
              onDownload={handleDownload}
              onPresent={handleStartPresentation}
            />
          }
        />
      )}

      {/* Main Container: Collapsible Sidebar + Continuous Page Viewport */}
      <div
        style={{
          paddingTop: isSidebar || embedded ? undefined : 'calc(var(--noether-header-offset, 0px) + 32px)',
        }}
        className="flex-1 flex min-h-0 relative overflow-hidden"
      >
        {/* Left Collapsible Drawer */}
        <PdfSidebar
          isOpen={isSidebarOpen && Boolean(pdfData)}
          mode={sidebarMode}
          pdfDoc={pdfData?.pdfDoc}
          numPages={pdfData?.numPages || 0}
          currentPage={currentPage}
          outline={pdfData?.outline || []}
          pageInfos={pdfData?.pageInfos || []}
          onSelectPage={scrollToPage}
          revealedPageNumber={revealedPageNumber}
        />

        {/* Continuous Scroll Viewport */}
        <div
          ref={viewportRef}
          onScroll={handleViewportScroll}
          className="flex-1 h-full overflow-auto custom-scrollbar bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] p-4 flex flex-col items-center"
        >
          {errorMessage && (
            <div className="my-auto flex flex-col items-center justify-center text-[#666] text-xs gap-2 select-none py-16 text-center">
              <File01Icon size={32} className="opacity-40" />
              <span>PDF document not found</span>
              {diskPath && (
                <button
                  type="button"
                  onClick={handleOpenInDefaultApp}
                  className="text-[11px] text-[#555] hover:text-[#888] cursor-pointer mt-1"
                >
                  Open in default desktop app
                </button>
              )}
            </div>
          )}

          {pdfData && (
            <div ref={pagesContentRef} className="flex flex-col items-center gap-2 pb-12 w-fit min-w-full">
              {Array.from({ length: pdfData.numPages }, (_, i) => i + 1).map((pageNum) => (
                <PdfPageCanvas
                  key={`page-${pageNum}`}
                  pdfDoc={pdfData.pdfDoc}
                  pageNumber={pageNum}
                  scale={scale}
                  rotation={rotation}
                  isVisible={visiblePageSet.has(pageNum)}
                  pageInfo={pdfData.pageInfos[pageNum - 1]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Slideshow Presentation Overlay */}
      {isPresenting && pdfData && typeof document !== 'undefined' && createPortal(
        <div
          ref={presentationContainerRef}
          onMouseMove={handlePresentationMouseMove}
          onMouseDown={handlePresentationMouseDown}
          onDoubleClick={handlePresentationDoubleClick}
          onClick={handlePresentationBackdropClick}
          className={`fixed inset-0 z-[100000] bg-black flex items-center justify-center select-none overflow-hidden ${
            isDraggingPresent
              ? 'cursor-grabbing'
              : presentZoomScale > 1
              ? 'cursor-grab'
              : isControlsVisible
              ? 'cursor-default'
              : 'cursor-none'
          }`}
          style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, touchAction: 'none' }}
        >
          {/* Scaled & Panned Slide Canvas Viewport */}
          <div
            className="flex items-center justify-center pointer-events-none"
            style={{
              transform: `translate(${presentPosition.x}px, ${presentPosition.y}px) scale(${presentZoomScale})`,
              transformOrigin: 'center center',
              userSelect: 'none',
            }}
          >
            <PdfPageCanvas
              key="present-slide-canvas"
              pdfDoc={pdfData.pdfDoc}
              pageNumber={currentPage}
              scale={presentationScale}
              rotation={rotation}
              isVisible={true}
              pageInfo={activePageInfo}
              className="shadow-[0_12px_48px_rgba(0,0,0,0.95)] pointer-events-auto"
            />
          </div>

          {/* Minimalist Bottom HUD Controls (Directly on bottom black, zero pill container) */}
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className={`fixed bottom-2.5 left-1/2 -translate-x-1/2 z-[100001] flex items-center gap-1.5 select-none pointer-events-auto ${
              isControlsVisible ? 'opacity-100' : 'opacity-0 !pointer-events-none'
            }`}
          >
            {/* Page navigation: < page / total > */}
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
              data-tooltip="Previous slide (Left / Up / PageUp)"
              aria-label="Previous slide"
              className="p-1 rounded text-white/50 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
            >
              <ArrowLeft01Icon size={14} />
            </button>

            <span className="tabular-nums font-sans px-1 text-[12px] text-white/60 tracking-wider">
              {currentPage} / {pdfData.numPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(pdfData.numPages, prev + 1))}
              disabled={currentPage >= pdfData.numPages}
              data-tooltip="Next slide (Right / Down / Space / PageDown)"
              aria-label="Next slide"
              className="p-1 rounded text-white/50 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
            >
              <ArrowRight01Icon size={14} />
            </button>

            {/* Separator */}
            <div className="w-[1px] h-3 bg-white/20 mx-1 shrink-0" />

            {/* Zoom Controls: + - reset */}
            <button
              type="button"
              onClick={() => applyPresentationZoom(1.3, window.innerWidth / 2, window.innerHeight / 2)}
              data-tooltip="Zoom in (+)"
              aria-label="Zoom in"
              className="p-1 rounded text-white/50 hover:text-white cursor-pointer"
            >
              <PlusSignIcon size={14} />
            </button>

            <button
              type="button"
              onClick={() => applyPresentationZoom(0.75, window.innerWidth / 2, window.innerHeight / 2)}
              disabled={presentZoomScale <= 1.01}
              data-tooltip="Zoom out (-)"
              aria-label="Zoom out"
              className="p-1 rounded text-white/50 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
            >
              <MinusSignIcon size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                setPresentZoomScale(1);
                setPresentPosition({ x: 0, y: 0 });
              }}
              disabled={presentZoomScale <= 1.01 && presentPosition.x === 0 && presentPosition.y === 0}
              data-tooltip="Reset zoom (0)"
              aria-label="Reset zoom"
              className="p-1 rounded text-white/50 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default"
            >
              <RotateCcwIcon size={14} />
            </button>

            {/* Separator */}
            <div className="w-[1px] h-3 bg-white/20 mx-1 shrink-0" />

            {/* Exit Presentation: x */}
            <button
              type="button"
              onClick={handleExitPresentation}
              data-tooltip="Exit presentation (Esc)"
              aria-label="Exit presentation"
              className="p-1 rounded text-white/50 hover:text-white cursor-pointer"
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

PdfViewer.displayName = 'PdfViewer';
export default PdfViewer;
