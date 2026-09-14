/**
 * @module ViewportActionSlotHost
 * @description
 * Universal host container component that renders dynamic action buttons registered
 * in any viewport corner (top-left, top-right, bottom-left, bottom-right) and orientation
 * (horizontal or vertical).
 *
 * Adheres to Noether native desktop styling standards:
 * - Instant micro-interaction responsiveness: zero artificial CSS transition or animation delays.
 * - Theme-reactive flat hover box: uses centralized CSS tokens (--noether-btn-hover-bg, --noether-btn-active-bg) via .noether-toolbar-btn.
 * - Viewport scoping: actions automatically filter by active view (document, canvas, graph, or custom).
 */

import React, { useMemo } from 'react';
import { useNoetherApp, useViewportActions } from '@/core/app/AppContext';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ToolbarIconButton } from '@/components/common/ToolbarIconButton';
import type {
  ViewportCorner,
  ViewportActionDirection,
  ViewportActionContext,
  ViewportActionDefinition,
} from '@/core/registries/ViewportActionRegistry';

export interface ViewportActionSlotHostProps {
  /** Viewport corner to mount */
  corner: ViewportCorner;
  /** Layout direction: horizontal (row) or vertical (column) */
  direction?: ViewportActionDirection;
  /** Optional context overrides */
  context?: Partial<ViewportActionContext>;
  /** Optional wrapper CSS classes */
  className?: string;
}

export const ViewportActionSlotHost: React.FC<ViewportActionSlotHostProps> = React.memo(({
  corner,
  direction = 'horizontal',
  context,
  className,
}) => {
  const app = useNoetherApp();
  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);

  const fullContext: ViewportActionContext = useMemo(() => {
    const doc = context?.document !== undefined ? context.document : activeDocument;
    const tab =
      context?.activeTab !== undefined
        ? context.activeTab
        : (tabs.find((t) => t.id === activeTabId) ?? null);
    const currentView =
      context?.viewType || tab?.view_type || tab?.view_mode || (doc ? 'document' : 'document');

    return {
      document: doc,
      activeTab: tab,
      app,
      viewType: currentView,
      isSidebar: context?.isSidebar ?? false,
      ...context,
    };
  }, [context, activeDocument, tabs, activeTabId, app]);

  const actions = useViewportActions(corner, direction, fullContext);

  if (!actions || actions.length === 0) {
    return null;
  }

  const defaultContainerClass =
    direction === 'vertical'
      ? 'flex flex-col items-center gap-0.5 pointer-events-auto'
      : 'flex items-center gap-0.5 pointer-events-auto';

  return (
    <div
      data-viewport-corner={corner}
      data-viewport-direction={direction}
      className={className || defaultContainerClass}
    >
      {actions.map((action: ViewportActionDefinition) => {
        try {
          const isVisible = action.isVisible ? action.isVisible(fullContext) : true;
          if (!isVisible) return null;

          const titleStr = typeof action.title === 'function' ? action.title(fullContext) : action.title;
          const isEnabled = action.isEnabled ? action.isEnabled(fullContext) : true;
          const isActive = action.isActive ? action.isActive(fullContext) : false;
          const customClass = typeof action.className === 'function' ? action.className(fullContext) : action.className;
          const badgeNode = action.badge ? action.badge(fullContext) : null;

          return (
            <ToolbarIconButton
              key={action.id}
              data-action-id={action.id}
              onClick={() => {
                if (isEnabled) {
                  action.onClick(fullContext);
                }
              }}
              disabled={!isEnabled}
              isActive={isActive}
              title={titleStr}
              className={customClass || ''}
              badge={badgeNode}
              icon={action.icon(fullContext)}
            />
          );
        } catch (err) {
          console.error(`[ViewportActionSlotHost] Error rendering action "${action.id}":`, err);
          return null;
        }
      })}
    </div>
  );
});

export default ViewportActionSlotHost;
