import React from 'react';
import { PageView, PageViewProps } from './PageView';

export interface DocLayoutWrapperProps extends Partial<PageViewProps> {
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
  hideSubHeader = true,
  ...props
}) => {
  return (
    <PageView
      hideSubHeader={hideSubHeader}
      isReadingMode={isReadingMode}
      className={className}
      {...props}
    >
      {children}
    </PageView>
  );
});

DocLayoutWrapper.displayName = 'DocLayoutWrapper';

