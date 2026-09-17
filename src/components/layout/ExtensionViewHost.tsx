import React, { useRef } from 'react';
import { useViewSuspension, ViewSuspensionContext } from '@/sdk';
import type { ViewDefinition } from '@/core/extensions/types';

export interface ExtensionViewHostProps {
  view: ViewDefinition;
  tabId?: string;
  documentId?: string;
  app: any;
  isSidebar?: boolean;
  className?: string;
  onClick?: () => void;
  'data-sidebar-dock-pane'?: string;
}

/**
 * Universal host container for rendering active extension views.
 *
 * Technical Rationale:
 * Automatically provides zero-CPU background freezing and lifecycle awareness
 * across all extension views (workspace tabs, split panes, and sidebar dock panes)
 * without requiring extension developers to write repetitive observer boilerplate.
 *
 * Respects `view.suspendOnInactive !== false` so extensions can easily opt out
 * if continuous background processing is required (e.g. streaming, timers).
 *
 * @since 0.5.6
 */
export const ExtensionViewHost: React.FC<ExtensionViewHostProps> = React.memo(({
  view,
  tabId,
  documentId,
  app,
  isSidebar,
  className,
  onClick,
  'data-sidebar-dock-pane': dataSidebarDockPane,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSuspendEnabled = view.suspendOnInactive !== false;

  const suspensionState = useViewSuspension(containerRef, {
    enabled: autoSuspendEnabled,
    suspendOnBlur: true,
  });

  return (
    <ViewSuspensionContext.Provider value={suspensionState}>
      <div
        ref={containerRef}
        className={className || 'flex-1 h-full flex flex-col min-w-0 overflow-hidden'}
        onClick={onClick}
        data-sidebar-dock-pane={dataSidebarDockPane}
        data-view-type={view.type}
        data-view-suspended={suspensionState.isSuspended ? 'true' : 'false'}
      >
        {view.render({
          tabId,
          documentId,
          app,
          ...(isSidebar ? { isSidebar: true } : {}),
        } as any)}
      </div>
    </ViewSuspensionContext.Provider>
  );
});
