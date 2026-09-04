import React, { useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import platform from '@/lib/platform/platformAdapter';

export interface DocLayoutWrapperProps {
  children: React.ReactNode;
  className?: string;
  isReadingMode?: boolean;
}

/**
 * Shared document canvas layout wrapper.
 * Guarantees 100% pixel-perfect layout parity across all document views,
 * including TipTap editor notes, plugin README viewers, and custom document renderers.
 */
export const DocLayoutWrapper: React.FC<DocLayoutWrapperProps> = React.memo(({
  children,
  className = '',
  isReadingMode = false,
}) => {
  const { readableLineLength, showExternalLinkIcon } = useSettingsStore();

  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const anchor = target?.closest('a');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href && (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('www.'))) {
        e.preventDefault();
        e.stopPropagation();
        platform.openUrl(href);
      }
    }
  }, []);

  return (
    <div
      data-doc-view="true"
      onClick={handleContainerClick}
      className={`flint-doc-wrapper flex-1 overflow-hidden relative flex flex-col min-w-0 ${
        showExternalLinkIcon ? 'flint-show-link-icon' : ''
      }`}
    >
      <div
        data-doc-view="true"
        style={{ touchAction: 'pan-x pan-y' }}
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          isReadingMode ? 'cursor-default' : ''
        } ${className}`}
      >
        <div
          className={`mx-auto pt-4 pb-12 flex flex-col min-h-full ${
            readableLineLength ? 'max-w-3xl px-10' : 'w-full px-12 max-w-none'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
});
