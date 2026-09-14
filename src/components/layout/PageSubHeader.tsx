import React, { useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useNoetherApp } from '@/core/app/AppContext';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BookOpen01Icon,
  Edit02Icon,
  Bookmark01Icon,
  Search01Icon,
} from '@/components/common/Icons';
import { DocOptionsMenu } from '@/components/editor/DocOptionsMenu';
import { DocumentItem } from '@/types';
import { isDocumentLocked } from '@/lib/db/documents';
import { DocMenuActionDefinition } from '@/core/extensions/types';
import { ViewportActionSlotHost } from './ViewportActionSlotHost';
import { useViewportActions } from '@/core/app/AppContext';

export interface PageSubHeaderProps {
  title: string;
  icon?: React.ReactNode;
  document?: DocumentItem | null;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  centerContent?: React.ReactNode;
  isReadingMode?: boolean;
  onToggleReadingMode?: () => void;
  showReadingToggle?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  showBookmark?: boolean;
  isFindOpen?: boolean;
  onToggleFind?: () => void;
  showSearch?: boolean;
  showDocOptions?: boolean;
  customLeftActions?: React.ReactNode;
  customRightActions?: React.ReactNode;
  customDocMenuActions?: DocMenuActionDefinition[];
  floating?: boolean;
  hideBar?: boolean;
  isSidebar?: boolean;
  isScrolled?: boolean;
}

export const PageSubHeader: React.FC<PageSubHeaderProps> = React.memo(({
  title,
  icon,
  document = null,
  canGoBack: customCanGoBack,
  canGoForward: customCanGoForward,
  onNavigateBack,
  onNavigateForward,
  centerContent,
  isReadingMode = false,
  onToggleReadingMode,
  showReadingToggle = true,
  isBookmarked = false,
  onToggleBookmark,
  showBookmark = true,
  isFindOpen = false,
  onToggleFind,
  showSearch = true,
  showDocOptions = true,
  customLeftActions,
  customRightActions,
  customDocMenuActions,
  floating = false,
  hideBar = false,
  isSidebar: propIsSidebar,
  isScrolled: propIsScrolled,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isSidebarDetected, setIsSidebarDetected] = React.useState(false);
  const [internalIsScrolled, setInternalIsScrolled] = React.useState(false);

  React.useEffect(() => {
    if (propIsSidebar !== undefined) {
      setIsSidebarDetected(propIsSidebar);
      return;
    }
    if (containerRef.current) {
      const inSidebar = !!containerRef.current.closest(
        '[data-sidebar], [data-dock-zone], [data-sidebar-root], [data-sidebar-dock-pane], aside'
      );
      setIsSidebarDetected(inSidebar);
    }
  }, [propIsSidebar]);

  const isSidebar = propIsSidebar ?? isSidebarDetected;
  const isFrameless = Boolean(floating || hideBar);
  const app = useNoetherApp();
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const mainViewMode = useWorkspaceStore((s) => s.mainViewMode);

  // Auto-detect container scroll to transition from solid to transparent with legibility drop shadows
  const isScrolled = propIsScrolled !== undefined ? propIsScrolled : internalIsScrolled;

  React.useEffect(() => {
    if (propIsScrolled !== undefined || isSidebar) return;
    const headerEl = containerRef.current;
    if (!headerEl) return;
    const parent = headerEl.parentElement;
    if (!parent) return;

    const findScrollTarget = () => {
      return (
        parent.querySelector<HTMLElement>('.overflow-y-auto') ||
        parent.querySelector<HTMLElement>('[data-doc-view="true"] .custom-scrollbar') ||
        parent.querySelector<HTMLElement>('[style*="overflow-y: auto"]')
      );
    };

    let scrollEl = findScrollTarget();

    const checkScroll = () => {
      const top = scrollEl ? scrollEl.scrollTop : 0;
      setInternalIsScrolled(top > 2);
    };

    checkScroll();

    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScroll, { passive: true });
    }

    const handleCaptureScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && parent.contains(target) && target !== headerEl) {
        if (!scrollEl) scrollEl = target;
        setInternalIsScrolled(target.scrollTop > 2);
      }
    };
    parent.addEventListener('scroll', handleCaptureScroll, { capture: true, passive: true });

    return () => {
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', checkScroll);
      }
      parent.removeEventListener('scroll', handleCaptureScroll, { capture: true });
    };
  }, [propIsScrolled, isSidebar, activeTabId]);

  const storeCanGoBack = useWorkspaceStore((s) => s.canGoBack);
  const storeCanGoForward = useWorkspaceStore((s) => s.canGoForward);
  const storeNavigateBack = useWorkspaceStore((s) => s.navigateBack);
  const storeNavigateForward = useWorkspaceStore((s) => s.navigateForward);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const toggleBookmark = useDocumentStore((s) => s.toggleBookmark);

  const canBack = customCanGoBack !== undefined ? customCanGoBack : storeCanGoBack;
  const canForward = customCanGoForward !== undefined ? customCanGoForward : storeCanGoForward;
  const handleBack = onNavigateBack || storeNavigateBack;
  const handleForward = onNavigateForward || storeNavigateForward;

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) ?? null;
  }, [tabs, activeTabId]);

  const actionContext = useMemo(() => ({
    document,
    activeTab,
    app,
    isSidebar,
  }), [document, activeTab, app, isSidebar]);

  const registeredTopRightActions = useViewportActions('top-right', 'horizontal', actionContext);

  const resolvedIcon = useMemo(() => {
    if (icon !== undefined) return icon;

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (activeTab?.icon) return activeTab.icon;

    const viewType =
      activeTab?.view_type ||
      activeTab?.view_mode ||
      mainViewMode ||
      (activeTab?.document_id?.startsWith('__')
        ? activeTab.document_id.replace(/^__/, '').replace(/__$/, '')
        : '');

    if (viewType && viewType !== 'document') {
      const regView = app?.views?.getView?.(viewType);
      if (regView?.icon) return regView.icon;
    }

    return null;
  }, [icon, tabs, activeTabId, mainViewMode, app?.views]);

  const handleBookmarkClick = useCallback(async () => {
    if (onToggleBookmark) {
      onToggleBookmark();
    } else if (document) {
      await toggleBookmark(document.id);
      showToast(
        document.is_bookmarked
          ? `Removed bookmark: "${document.title || 'Untitled'}"`
          : `Bookmarked: "${document.title || 'Untitled'}"`,
        'info'
      );
    }
  }, [onToggleBookmark, document, toggleBookmark, showToast]);

  const isLocked = useMemo(() => isDocumentLocked(document), [document]);
  const effectiveReadingMode = isReadingMode || isLocked;

  const handleToggleReading = useCallback(() => {
    if (isLocked) {
      showToast('Note is locked (Read-only). Unlock it in Properties to edit.', 'warning');
      return;
    }
    onToggleReadingMode?.();
  }, [isLocked, onToggleReadingMode, showToast]);

  // Sidebar docked mode: render ONLY floating top-right action buttons in a vertical column
  if (isSidebar) {
    const hasAnyAction =
      Boolean(customRightActions) ||
      Boolean(customLeftActions) ||
      (showSearch && Boolean(onToggleFind)) ||
      (showDocOptions && Boolean(document));

    if (!hasAnyAction) return null;

    return (
      <div
        ref={containerRef}
        data-sub-header="true"
        data-sidebar-sub-header="true"
        className="absolute top-2.5 right-2.5 z-30 flex flex-col items-center gap-1 pointer-events-auto select-none"
      >
        {customRightActions}
        {customLeftActions}
        {showSearch && onToggleFind && (
          <button
            type="button"
            onClick={onToggleFind}
            title={isFindOpen ? 'Close find (Ctrl+F)' : 'Find (Ctrl+F)'}
            data-active={isFindOpen ? 'true' : undefined}
            className={`noether-toolbar-btn ${isFindOpen ? 'active' : ''}`}
          >
            <Search01Icon size={14} />
          </button>
        )}
        {showDocOptions && (document || customDocMenuActions) && (
          <DocOptionsMenu document={document} customActions={customDocMenuActions} />
        )}
      </div>
    );
  }

  const isTransparent = isFrameless || isScrolled;

  return (
    <div
      ref={containerRef}
      data-sub-header="true"
      style={{ top: 'var(--noether-header-offset, 0px)' }}
      className={`h-8 px-4 flex items-center justify-between text-xs text-[#777] shrink-0 select-none absolute left-0 right-0 z-20 pointer-events-none ${
        isTransparent
          ? 'bg-transparent'
          : 'bg-[var(--noether-bg-tab-active,var(--noether-bg-main))]'
      }`}
    >
      {/* Left: Navigation History Arrows & Custom Left Actions */}
      <div
        className={`relative z-10 flex items-center gap-0.5 shrink-0 pointer-events-auto ${
          isTransparent ? '[&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={handleBack}
          disabled={!canBack}
          data-tooltip="Navigate back"
          data-shortcuts={JSON.stringify(['Alt + Left', 'Alt + A'])}
          className="noether-toolbar-btn"
        >
          <ArrowLeft01Icon size={14} />
        </button>
        <button
          type="button"
          onClick={handleForward}
          disabled={!canForward}
          data-tooltip="Navigate forward"
          data-shortcuts={JSON.stringify(['Alt + Right', 'Alt + D'])}
          className="noether-toolbar-btn"
        >
          <ArrowRight01Icon size={14} />
        </button>
        {customLeftActions}
        <ViewportActionSlotHost corner="top-left" direction="horizontal" context={actionContext} />
      </div>

      {/* Center: Truly Absolute Centered Title (100% dead center across ALL views) */}
      <div
        className={`absolute inset-x-0 inset-y-0 flex items-center justify-center pointer-events-none px-28 ${
          isTransparent ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]' : 'drop-shadow-none'
        }`}
      >
        {centerContent ? (
          <div className="pointer-events-auto">
            {centerContent}
          </div>
        ) : (
          <div className="text-[12px] truncate max-w-sm px-1.5 py-0.5 text-center select-none flex items-center justify-center gap-1.5 font-sans pointer-events-auto">
            {resolvedIcon && (
              <span className="shrink-0 text-[var(--noether-text-secondary)] flex items-center">
                {React.isValidElement(resolvedIcon)
                  ? React.cloneElement(resolvedIcon as React.ReactElement<any>, {
                      size: 13,
                      className: 'shrink-0',
                    })
                  : resolvedIcon}
              </span>
            )}
            <span className="truncate block min-w-0">{title || 'Untitled'}</span>
          </div>
        )}
      </div>

      {/* Right: Custom Actions, Dynamic Viewport Actions, Reading View, Bookmark, Search & More Options */}
      <div
        className={`relative z-10 flex items-center gap-0.5 shrink-0 pointer-events-auto ${
          isTransparent ? '[&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]' : ''
        }`}
      >
        {customRightActions}

        {/* Dynamic Registered Extension Header Actions */}
        <ViewportActionSlotHost corner="top-right" direction="horizontal" context={actionContext} />

        {/* Reading / Editing View Toggle */}
        {showReadingToggle && (
          <button
            type="button"
            onClick={onToggleReadingMode}
            disabled={!onToggleReadingMode || isLocked}
            title={
              !onToggleReadingMode
                ? 'Reading view'
                : isLocked
                ? 'Note is locked (Read-only)\nUnlock in Properties to enable Editing view'
                : effectiveReadingMode
                ? 'Reading view\n(Ctrl+Click to split)'
                : 'Editing view\n(Ctrl+Click to split)'
            }
            className={`noether-toolbar-btn ${
              !onToggleReadingMode
                ? 'opacity-20 cursor-default'
                : isLocked
                ? 'opacity-40 cursor-not-allowed hover:bg-transparent'
                : ''
            }`}
          >
            {effectiveReadingMode ? <BookOpen01Icon size={14} /> : <Edit02Icon size={14} />}
          </button>
        )}

        {/* Fallback bookmark toggle button (when explicitly passed as direct prop) */}
        {showBookmark && onToggleBookmark && !registeredTopRightActions.some((a) => a.id.includes('bookmark')) && (
          <button
            type="button"
            onClick={handleBookmarkClick}
            title={document?.is_bookmarked || isBookmarked ? 'Remove bookmark' : 'Bookmark note'}
            className={`noether-toolbar-btn ${
              document?.is_bookmarked || isBookmarked
                ? '!text-[#f59e0b] hover:!text-[#fbbf24]'
                : ''
            }`}
          >
            <Bookmark01Icon
              size={14}
              className={document?.is_bookmarked || isBookmarked ? 'fill-current' : ''}
            />
          </button>
        )}

        {/* In-Note Search button */}
        {showSearch && (
          <button
            type="button"
            onClick={onToggleFind}
            disabled={!onToggleFind}
            title={isFindOpen ? 'Close find (Ctrl+F)' : 'Find in document (Ctrl+F)'}
            data-active={isFindOpen ? 'true' : undefined}
            className={`noether-toolbar-btn ${isFindOpen ? 'active' : ''}`}
          >
            <Search01Icon size={14} />
          </button>
        )}

        {/* Document Options Menu */}
        {showDocOptions && <DocOptionsMenu document={document} customActions={customDocMenuActions} />}
      </div>

      {/* Top-Left Vertical Floating Actions (e.g. tools below navigation arrows) */}
      <div className="absolute left-4 top-8 pt-1 z-20 pointer-events-none select-none">
        <ViewportActionSlotHost corner="top-left" direction="vertical" context={actionContext} />
      </div>

      {/* Top-Right Vertical Floating Actions (e.g. tools below more options) */}
      <div className="absolute right-4 top-8 pt-1 z-20 pointer-events-none select-none">
        <ViewportActionSlotHost corner="top-right" direction="vertical" context={actionContext} />
      </div>
    </div>
  );
});

