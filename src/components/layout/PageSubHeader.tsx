import React, { useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useFlintApp } from '@/core/app/AppContext';
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
  floating?: boolean;
  hideBar?: boolean;
  isSidebar?: boolean;
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
  floating = false,
  hideBar = false,
  isSidebar: propIsSidebar,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isSidebarDetected, setIsSidebarDetected] = React.useState(false);

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
  const app = useFlintApp();
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const mainViewMode = useWorkspaceStore((s) => s.mainViewMode);

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

  const [registeredActions, setRegisteredActions] = React.useState(() =>
    app.documentHeaderActions?.getActions() ?? []
  );

  React.useEffect(() => {
    if (!app.documentHeaderActions) return;
    setRegisteredActions(app.documentHeaderActions.getActions());
    return app.documentHeaderActions.subscribe(() => {
      setRegisteredActions(app.documentHeaderActions.getActions());
    });
  }, [app.documentHeaderActions]);

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) ?? null;
  }, [tabs, activeTabId]);

  const actionContext = useMemo(() => ({
    document,
    activeTab,
    app,
  }), [document, activeTab, app]);

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
            className={`p-1.5 rounded-md ${
              isFindOpen
                ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)]'
                : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)]'
            } cursor-pointer`}
          >
            <Search01Icon size={14} />
          </button>
        )}
        {showDocOptions && document && <DocOptionsMenu document={document} />}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-sub-header="true"
      className={
        isFrameless
          ? 'h-8 px-4 flex items-center justify-between text-xs text-[#777] shrink-0 select-none absolute top-0 left-0 right-0 z-20 pointer-events-none bg-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
          : 'h-8 px-4 flex items-center justify-between text-xs text-[#777] shrink-0 select-none relative z-20'
      }
    >
      {/* Left: Navigation History Arrows & Custom Left Actions */}
      <div className={`relative z-10 flex items-center gap-0.5 shrink-0 ${isFrameless ? 'pointer-events-auto' : ''}`}>
        <button
          type="button"
          onClick={handleBack}
          disabled={!canBack}
          data-tooltip="Navigate back"
          data-shortcuts={JSON.stringify(['Alt + Left', 'Alt + A'])}
          className="p-1 rounded hover:bg-[var(--flint-bg-card-hover)] disabled:opacity-20 disabled:hover:bg-transparent text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-pointer disabled:cursor-default"
        >
          <ArrowLeft01Icon size={14} />
        </button>
        <button
          type="button"
          onClick={handleForward}
          disabled={!canForward}
          data-tooltip="Navigate forward"
          data-shortcuts={JSON.stringify(['Alt + Right', 'Alt + D'])}
          className="p-1 rounded hover:bg-[var(--flint-bg-card-hover)] disabled:opacity-20 disabled:hover:bg-transparent text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-pointer disabled:cursor-default"
        >
          <ArrowRight01Icon size={14} />
        </button>
        {customLeftActions}
      </div>

      {/* Center: Truly Absolute Centered Title (100% dead center across ALL views) */}
      <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center pointer-events-none px-28">
        {centerContent ? (
          <div className={isFrameless ? 'pointer-events-auto' : ''}>
            {centerContent}
          </div>
        ) : (
          <div className={`text-[12px] truncate max-w-sm px-1.5 py-0.5 text-center select-none flex items-center justify-center gap-1.5 font-sans ${isFrameless ? 'pointer-events-auto' : ''}`}>
            {resolvedIcon && (
              <span className="shrink-0 text-[var(--flint-text-secondary)] flex items-center">
                {React.isValidElement(resolvedIcon)
                  ? React.cloneElement(resolvedIcon as React.ReactElement<any>, {
                      size: 13,
                      className: 'shrink-0',
                    })
                  : resolvedIcon}
              </span>
            )}
            <span className="text-[var(--flint-text-secondary)] font-medium truncate">
              {title}
            </span>
          </div>
        )}
      </div>

      {/* Right: Reading View, Bookmark, Search & Options */}
      <div className={`relative z-10 flex items-center gap-0.5 shrink-0 ${isFrameless ? 'pointer-events-auto' : ''}`}>
        {customRightActions}

        {/* Reading mode toggle button */}
        {showReadingToggle && (
          <button
            type="button"
            onClick={handleToggleReading}
            disabled={!onToggleReadingMode}
            title={
              !onToggleReadingMode
                ? 'Reading view'
                : isLocked
                ? 'Note is locked (Read-only)\nUnlock in Properties to enable Editing view'
                : effectiveReadingMode
                ? 'Reading view\n(Ctrl+Click to split)'
                : 'Editing view\n(Ctrl+Click to split)'
            }
            className={`p-1 rounded ${
              !onToggleReadingMode
                ? 'opacity-20 cursor-default text-[var(--flint-text-muted)]'
                : isLocked
                ? 'opacity-40 cursor-not-allowed text-[var(--flint-text-muted)] hover:bg-transparent'
                : 'hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-pointer'
            }`}
          >
            {effectiveReadingMode ? <BookOpen01Icon size={14} /> : <Edit02Icon size={14} />}
          </button>
        )}

        {/* Dynamic Registered Extension Header Actions */}
        {registeredActions.map((action) => {
          if (action.isVisible && !action.isVisible(actionContext)) return null;
          const titleStr = typeof action.title === 'function' ? action.title(actionContext) : action.title;
          const classNameStr = typeof action.className === 'function' ? action.className(actionContext) : action.className;
          const isEnabled = action.isEnabled ? action.isEnabled(actionContext) : true;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => action.onClick(actionContext)}
              disabled={!isEnabled}
              title={titleStr}
              className={`p-1 rounded ${
                classNameStr ||
                'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer'
              }`}
            >
              {action.icon(actionContext)}
            </button>
          );
        })}

        {/* Legacy fallback bookmark toggle button (only if explicitly passed as direct prop and not registered dynamically) */}
        {showBookmark && onToggleBookmark && !registeredActions.some((a) => a.id.includes('bookmark')) && (
          <button
            type="button"
            onClick={handleBookmarkClick}
            title={document?.is_bookmarked || isBookmarked ? 'Remove bookmark' : 'Bookmark note'}
            className={`p-1 rounded ${
              document?.is_bookmarked || isBookmarked
                ? 'text-[#f59e0b] hover:text-[#fbbf24] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer'
                : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer'
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
            className={`p-1 rounded ${
              onToggleFind
                ? isFindOpen
                  ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)] cursor-pointer'
                  : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer'
                : 'opacity-20 cursor-default text-[var(--flint-text-muted)]'
            }`}
          >
            <Search01Icon size={14} />
          </button>
        )}

        {/* Document Options Menu */}
        {showDocOptions && <DocOptionsMenu document={document} />}
      </div>
    </div>
  );
});

