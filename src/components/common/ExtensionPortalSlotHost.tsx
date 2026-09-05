/**
 * @module ExtensionPortalSlotHost
 * @description
 * React host container component that renders active dynamic portal slots.
 * Anchors extension-provided UI components (floating contextual toolbars,
 * vector canvas overlays, minimaps, and workspace HUDs) cleanly into designated
 * host coordinate spaces without DOM monkey-patching.
 *
 * Performance & Responsiveness Invariants:
 * - Instant Rendering: Zero artificial CSS transitions, animations, or delays.
 * - Pointer Event Delegation: Host overlay container defaults to `pointer-events: none`
 *   to ensure zero interference with native text selection, scrollbars, or clicks.
 * - Error Isolation: Wraps each slot item in an error boundary so one failing extension
 *   cannot crash the core editor or workspace layout.
 *
 * @since 0.4.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { usePortalSlots } from '@/core/app/AppContext';
import type {
  PortalSlotLocation,
  PortalSlotContext,
  PortalSlotDefinition,
} from '@/core/extensions/types';

interface SlotErrorBoundaryProps {
  itemId: string;
  children: ReactNode;
}

interface SlotErrorBoundaryState {
  hasError: boolean;
}

class SlotErrorBoundary extends Component<SlotErrorBoundaryProps, SlotErrorBoundaryState> {
  constructor(props: SlotErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SlotErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ExtensionPortalSlotHost] Error rendering slot item "${this.props.itemId}":`, error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export interface ExtensionPortalSlotHostProps {
  /** Target slot anchor location */
  slot: PortalSlotLocation;
  /** Contextual state provided to slot render functions */
  context: PortalSlotContext;
  /** Optional container CSS class */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

export const ExtensionPortalSlotHost: React.FC<ExtensionPortalSlotHostProps> = React.memo(({
  slot,
  context,
  className,
  style,
}) => {
  const activeSlots = usePortalSlots(slot, context);

  if (!activeSlots || activeSlots.length === 0) {
    return null;
  }

  return (
    <div
      data-portal-slot={slot}
      style={style}
      className={className || 'pointer-events-none'}
    >
      {activeSlots.map((def: PortalSlotDefinition) => (
        <SlotErrorBoundary key={def.id} itemId={def.id}>
          {def.render(context)}
        </SlotErrorBoundary>
      ))}
    </div>
  );
});

export default ExtensionPortalSlotHost;
