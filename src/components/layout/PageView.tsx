import React, { useCallback, useState } from 'react';
import { PageSubHeader } from './PageSubHeader';
import { ViewportActionSlotHost } from './ViewportActionSlotHost';
import { useSettingsStore } from '@/store/settingsStore';
import platform from '@/lib/platform/platformAdapter';
import { DocumentItem } from '@/types';
import { DocMenuActionDefinition } from '@/core/extensions/types';

export interface PageViewProps {
  /** Page title displayed in the floating subheader */
  title?: string;
  /** HugeIcon or custom React icon for the page */
  icon?: React.ReactNode;
  /** Document item if backing a document view */
  document?: DocumentItem | null;

  /** Custom subheader component to replace the default PageSubHeader */
  subHeader?: React.ReactNode;
  /** Set to true to completely omit the subheader */
  hideSubHeader?: boolean;
  /** Custom action controls rendered on the left of the subheader (next to history arrows) */
  customLeftActions?: React.ReactNode;
  /** Custom action controls rendered on the right of the subheader */
  customRightActions?: React.ReactNode;
  /** Custom center content in the subheader (replaces title) */
  centerContent?: React.ReactNode;

  /** Navigation history overrides */
  canGoBack?: boolean;
  canGoForward?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;

  /** Reading view toggle support */
  isReadingMode?: boolean;
  onToggleReadingMode?: () => void;
  showReadingToggle?: boolean;

  /** Bookmark support */
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  showBookmark?: boolean;

  /** In-page find / search support */
  isFindOpen?: boolean;
  onToggleFind?: () => void;
  showSearch?: boolean;

  /** Document options menu support */
  showDocOptions?: boolean;
  customDocMenuActions?: DocMenuActionDefinition[];

  /**
   * Whether the view body should scroll vertically.
   * Defaults to `true` (standard scrollable page).
   * Set to `false` for spatial or full-screen views (e.g. canvas, interactive boards).
   */
  scrollable?: boolean;

  /**
   * Whether to constrain content width to standard readable line length (`max-w-3xl px-10`).
   * When omitted or true, respects the user's global appearance setting.
   * Set to `false` to force full width (`w-full px-12`).
   */
  readableLineLength?: boolean;

  /** Additional classes for the outer container */
  className?: string;
  /** Additional classes for the scrollable container */
  scrollClassName?: string;
  /** Additional classes for the inner content wrapper */
  contentClassName?: string;

  /** Ref forwarded to the scrollable container */
  scrollRef?: React.Ref<HTMLDivElement>;

  /** Scroll event handler */
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;

  /** Page content */
  children: React.ReactNode;
}

/**
 * Standard page view shell for Noether views and community extensions.
 *
 * Provides out-of-the-box:
 * - Active tab cutout mask passthrough where content glides behind the window topbar.
 * - Floating modular subheader at `var(--noether-header-offset, 0px)` with navigation history.
 * - Dynamic subheader background transitioning to transparent with drop shadows on scroll.
 * - Proper scrollbar track offset below the subheader (`scrollbar-track-offset-subheader`).
 * - Authentic top padding so content begins naturally beneath the subheader when un-scrolled.
 * - Automatic interception of external links opening safely via the platform adapter.
 */
export const PageView: React.FC<PageViewProps> = React.memo(({
  title = '',
  icon,
  document = null,
  subHeader,
  hideSubHeader = false,
  customLeftActions,
  customRightActions,
  centerContent,
  canGoBack,
  canGoForward,
  onNavigateBack,
  onNavigateForward,
  isReadingMode = false,
  onToggleReadingMode,
  showReadingToggle = false,
  isBookmarked = false,
  onToggleBookmark,
  showBookmark = false,
  isFindOpen = false,
  onToggleFind,
  showSearch = false,
  showDocOptions = false,
  customDocMenuActions,
  scrollable = true,
  readableLineLength: propReadableLineLength,
  className = '',
  scrollClassName = '',
  contentClassName = '',
  scrollRef,
  onScroll,
  children,
}) => {
  const globalReadableSetting = useSettingsStore((s) => s.readableLineLength);
  const showExternalLinkIcon = useSettingsStore((s) => s.showExternalLinkIcon);

  const effectiveReadable =
    propReadableLineLength !== undefined ? propReadableLineLength : globalReadableSetting;

  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const top = e.currentTarget.scrollTop;
      setIsScrolled(top > 2);
      onScroll?.(e);
    },
    [onScroll]
  );

  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (
        href &&
        (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('www.'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        platform.openUrl(href);
      }
    }
  }, []);

  return (
    <div
      data-main="true"
      onClick={handleContainerClick}
      className={`noether-doc-wrapper flex-1 flex flex-col h-full overflow-hidden bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] select-none relative ${
        showExternalLinkIcon ? 'noether-show-link-icon' : ''
      } ${className}`}
    >
      {/* 1. Floating Modular Subheader */}
      {!hideSubHeader && (
        subHeader || (
          <PageSubHeader
            title={title}
            icon={icon}
            document={document}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onNavigateBack={onNavigateBack}
            onNavigateForward={onNavigateForward}
            centerContent={centerContent}
            isReadingMode={isReadingMode}
            onToggleReadingMode={onToggleReadingMode}
            showReadingToggle={showReadingToggle}
            isBookmarked={isBookmarked}
            onToggleBookmark={onToggleBookmark}
            showBookmark={showBookmark}
            isFindOpen={isFindOpen}
            onToggleFind={onToggleFind}
            showSearch={showSearch}
            showDocOptions={showDocOptions}
            customLeftActions={customLeftActions}
            customRightActions={customRightActions}
            customDocMenuActions={customDocMenuActions}
            isScrolled={isScrolled}
          />
        )
      )}

      {/* 2. Page Body Surface */}
      {scrollable ? (
        <div
          ref={scrollRef}
          data-doc-view="true"
          onScroll={handleScroll}
          style={{ touchAction: 'pan-x pan-y' }}
          className={`flex-1 overflow-y-auto custom-scrollbar scrollbar-track-offset-subheader ${
            isReadingMode ? 'cursor-default' : ''
          } ${scrollClassName}`}
        >
          <div
            style={{
              paddingTop: hideSubHeader
                ? 'var(--noether-header-offset, 0px)'
                : 'calc(var(--noether-header-offset, 0px) + 40px)',
            }}
            className={`mx-auto pt-3 pb-12 flex flex-col min-h-full ${
              effectiveReadable ? 'max-w-3xl px-10' : 'w-full px-12 max-w-none'
            } ${contentClassName}`}
          >
            {children}
          </div>
        </div>
      ) : (
        <div
          className={`flex-1 h-full w-full relative overflow-hidden ${contentClassName}`}
          style={{
            paddingTop: hideSubHeader
              ? 'var(--noether-header-offset, 0px)'
              : 'calc(var(--noether-header-offset, 0px) + 32px)',
          }}
        >
          {children}
        </div>
      )}

      {/* Bottom-Left Viewport Actions */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none select-none flex flex-col gap-1">
        <ViewportActionSlotHost corner="bottom-left" direction="vertical" context={{ document, isSidebar: false }} />
        <ViewportActionSlotHost corner="bottom-left" direction="horizontal" context={{ document, isSidebar: false }} />
      </div>

      {/* Bottom-Right Viewport Actions */}
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none select-none flex flex-col items-end gap-1">
        <ViewportActionSlotHost corner="bottom-right" direction="vertical" context={{ document, isSidebar: false }} />
        <ViewportActionSlotHost corner="bottom-right" direction="horizontal" context={{ document, isSidebar: false }} />
      </div>
    </div>
  );
});

PageView.displayName = 'PageView';
