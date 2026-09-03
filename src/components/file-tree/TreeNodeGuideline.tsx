import React from 'react';

export interface TreeNodeGuidelineProps {
  level: number;
}

/**
 * Vertical indentation guideline for tree hierarchies under folder chevrons.
 * Uses a crisp 1px border-l (w-0) matching the sidebar/ribbon border thickness,
 * avoiding subpixel translation blur (-translate-x-1/2) so it aligns sharply
 * with the center tip of the chevron.
 */
export const TreeNodeGuideline: React.FC<TreeNodeGuidelineProps> = React.memo(({ level }) => {
  return (
    <div
      aria-hidden="true"
      className="absolute top-0 bottom-0 pointer-events-none w-0 border-l border-[#383838] z-20"
      style={{ left: `${8 + level * 16 + 8}px` }}
    />
  );
});

TreeNodeGuideline.displayName = 'TreeNodeGuideline';
