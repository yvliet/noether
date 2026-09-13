import React, { useMemo } from 'react';

interface TooltipProps {
  content: string;
  shortcut?: string | string[];
  shortcuts?: string[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  anchor?: string;
  children: React.ReactElement;
}

export const Tooltip: React.FC<TooltipProps> = React.memo(({ content, shortcut, shortcuts, position, anchor, children }) => {
  const tooltipProps = useMemo(() => {
    const allShortcuts = shortcuts || (Array.isArray(shortcut) ? shortcut : shortcut ? [shortcut] : undefined);
    return {
      'data-tooltip': content,
      ...(allShortcuts && allShortcuts.length > 0
        ? { 'data-shortcuts': JSON.stringify(allShortcuts) }
        : {}),
      ...(position ? { 'data-tooltip-position': position } : {}),
      ...(anchor ? { 'data-tooltip-anchor': anchor } : {}),
    } as React.HTMLAttributes<HTMLElement>;
  }, [content, shortcut, shortcuts, position, anchor]);

  return React.cloneElement(children, tooltipProps);
});

Tooltip.displayName = 'Tooltip';
