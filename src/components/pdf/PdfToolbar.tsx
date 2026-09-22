import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DashboardSquare01Icon,
  LeftToRightListBulletIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ZoomInIcon,
  ZoomOutIcon,
  CheckIcon,
  RotateCcwIcon,
  ArrowRight02Icon,
  Download01Icon,
  CenterFocusIcon,
  FitToScreenIcon,
  Presentation01Icon,
} from '@/components/common/Icons';
import { PdfSidebarMode, PdfZoomMode } from './types';

export interface PdfSubHeaderLeftActionsProps {
  isSidebarOpen: boolean;
  sidebarMode: PdfSidebarMode;
  onToggleSidebar: () => void;
  onSelectSidebarMode: (mode: PdfSidebarMode) => void;
  onRevealInToc: () => void;
}

/**
 * Left-side controls for PDF viewer inside the native document subheader:
 * Collapsible drawer toggle (thumbnails / table of contents) with dropdown switcher.
 */
export const PdfSubHeaderLeftActions: React.FC<PdfSubHeaderLeftActionsProps> = React.memo(({
  isSidebarOpen,
  sidebarMode,
  onToggleSidebar,
  onSelectSidebarMode,
  onRevealInToc,
}) => {
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const sidebarMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [sidebarMenuPos, setSidebarMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-pdf-dropdown]') && !target.closest('[data-pdf-trigger]')) {
        setIsSidebarMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  const openSidebarMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sidebarMenuTriggerRef.current) return;
    const rect = sidebarMenuTriggerRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 228));
    setSidebarMenuPos({ top: rect.bottom + 4, left });
    setIsSidebarMenuOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={onToggleSidebar}
        data-tooltip={isSidebarOpen ? 'Collapse drawer' : 'Expand drawer'}
        aria-label={isSidebarOpen ? 'Collapse drawer' : 'Expand drawer'}
        data-active={isSidebarOpen ? 'true' : undefined}
        className={`noether-toolbar-btn w-[21px] h-[21px] ${isSidebarOpen ? 'active' : ''}`}
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
        className={`noether-toolbar-btn w-[21px] h-[21px] ${isSidebarMenuOpen ? 'active' : ''}`}
      >
        <ArrowDown01Icon size={12} />
      </button>

      {/* Portaled Sidebar Mode Dropdown */}
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
                onSelectSidebarMode('thumbnails');
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
                onSelectSidebarMode('outline');
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
                onRevealInToc();
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
    </div>
  );
});
PdfSubHeaderLeftActions.displayName = 'PdfSubHeaderLeftActions';

export interface PdfSubHeaderRightActionsProps {
  currentPage: number;
  numPages: number;
  scale: number;
  zoomMode: PdfZoomMode;
  onPageChange: (pageNum: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoomMode: (mode: PdfZoomMode, customScale?: number) => void;
  onRotateCw: () => void;
  onDownload: () => void;
  onPresent: () => void;
}

/**
 * Right-side controls for PDF viewer inside the native document subheader:
 * Page jump [ 1 ] / N, zoom controls (- 100% + present), rotate CW, and download.
 */
export const PdfSubHeaderRightActions: React.FC<PdfSubHeaderRightActionsProps> = React.memo(({
  currentPage,
  numPages,
  scale,
  zoomMode,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onSetZoomMode,
  onRotateCw,
  onDownload,
  onPresent,
}) => {
  const [pageInput, setPageInput] = useState<string>(String(currentPage));
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      onPageChange(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {/* 1. Page Jump Navigation */}
      <div className="flex items-center gap-0.5 mr-0.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          data-tooltip="Previous page (PageUp)"
          aria-label="Previous page"
          className="noether-toolbar-btn"
        >
          <ArrowLeft01Icon size={12} />
        </button>

        <form onSubmit={handlePageSubmit} className="flex items-center text-xs select-none">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={() => {
              const parsed = parseInt(pageInput, 10);
              if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
                onPageChange(parsed);
              } else {
                setPageInput(String(currentPage));
              }
            }}
            data-tooltip="Page number (press Enter to jump)"
            aria-label="Page number"
            className="w-7 h-5 text-center text-[11px] tabular-nums font-sans bg-transparent hover:bg-[var(--noether-bg-card-hover)] focus:bg-[var(--noether-bg-card-active)] rounded text-[var(--noether-text-primary,#fff)] outline-none selection:bg-[var(--noether-accent,#eb584d)] p-0 border-none"
          />
          <span className="text-[#555] mx-0.5 select-none font-sans">/</span>
          <span className="text-[var(--noether-text-muted,#777)] tabular-nums font-sans min-w-[12px] text-left select-none">{numPages}</span>
        </form>

        <button
          type="button"
          disabled={currentPage >= numPages}
          onClick={() => onPageChange(currentPage + 1)}
          data-tooltip="Next page (PageDown)"
          aria-label="Next page"
          className="noether-toolbar-btn"
        >
          <ArrowRight01Icon size={12} />
        </button>
      </div>

      <div className="w-[1px] h-3.5 bg-[var(--noether-border-base,#333)] mx-1 shrink-0" />

      {/* 2. Zoom Controls */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onZoomOut}
          data-tooltip="Zoom out (Ctrl + -)"
          aria-label="Zoom out"
          className="noether-toolbar-btn"
        >
          <ZoomOutIcon size={13} />
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          data-tooltip="Zoom in (Ctrl + +)"
          aria-label="Zoom in"
          className="noether-toolbar-btn"
        >
          <ZoomInIcon size={13} />
        </button>

        <button
          type="button"
          onClick={onPresent}
          data-tooltip="Present slideshow"
          aria-label="Present slideshow"
          className="noether-toolbar-btn w-[21px] h-[21px]"
        >
          <Presentation01Icon size={13} />
        </button>
      </div>

      <div className="w-[1px] h-3.5 bg-[var(--noether-border-base,#333)] mx-1 shrink-0" />

      {/* 3. Rotate Clockwise */}
      <button
        type="button"
        onClick={onRotateCw}
        data-tooltip="Rotate clockwise (Ctrl + ])"
        aria-label="Rotate clockwise"
        className="noether-toolbar-btn"
      >
        <RotateCcwIcon size={13} />
      </button>

      {/* 4. Download / Save Copy */}
      <button
        type="button"
        onClick={onDownload}
        data-tooltip="Save a copy"
        aria-label="Save a copy"
        className="noether-toolbar-btn"
      >
        <Download01Icon size={13} />
      </button>
    </div>
  );
});
PdfSubHeaderRightActions.displayName = 'PdfSubHeaderRightActions';

export interface PdfToolbarProps {
  title: string;
  numPages: number;
  currentPage: number;
  scale: number;
  zoomMode: PdfZoomMode;
  rotation?: number;
  isSidebarOpen: boolean;
  sidebarMode: PdfSidebarMode;
  onToggleSidebar: () => void;
  onSelectSidebarMode: (mode: PdfSidebarMode) => void;
  onRevealInToc: () => void;
  onPageChange: (pageNumber: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoomMode: (mode: PdfZoomMode, customScale?: number) => void;
  onRotateCw: () => void;
  onRotateCcw?: () => void;
  onPrint?: () => void;
  onDownload: () => void;
  onPresent?: () => void;
  onOpenInDefaultApp?: () => void;
  onRevealInExplorer?: () => void;
  className?: string;
}

/**
 * Backward-compatible wrapper component.
 */
export const PdfToolbar: React.FC<PdfToolbarProps> = React.memo((props) => {
  return (
    <div className={`h-8 px-4 flex items-center justify-between bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] text-xs text-[#777] shrink-0 select-none border-b border-[var(--noether-border-base,#2b2b2b)] ${props.className || ''}`}>
      <PdfSubHeaderLeftActions
        isSidebarOpen={props.isSidebarOpen}
        sidebarMode={props.sidebarMode}
        onToggleSidebar={props.onToggleSidebar}
        onSelectSidebarMode={props.onSelectSidebarMode}
        onRevealInToc={props.onRevealInToc}
      />
      <div className="text-[12px] truncate max-w-sm px-1.5 py-0.5 text-center select-none font-sans text-[var(--noether-text-secondary,#dcddde)]">
        {props.title}
      </div>
      <PdfSubHeaderRightActions
        currentPage={props.currentPage}
        numPages={props.numPages}
        scale={props.scale}
        zoomMode={props.zoomMode}
        onPageChange={props.onPageChange}
        onZoomIn={props.onZoomIn}
        onZoomOut={props.onZoomOut}
        onSetZoomMode={props.onSetZoomMode}
        onRotateCw={props.onRotateCw}
        onDownload={props.onDownload}
        onPresent={props.onPresent || (() => {})}
      />
    </div>
  );
});
PdfToolbar.displayName = 'PdfToolbar';
