import React from 'react';

export interface TreeNodeGuidelineProps {
  level: number;
}

export const TreeNodeGuideline: React.FC<TreeNodeGuidelineProps> = React.memo(({ level }) => {
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none w-px bg-[var(--flint-border-subtle,#262626)] -translate-x-1/2 z-20"
      style={{ left: `${8 + level * 16 + 8}px` }}
    />
  );
});

TreeNodeGuideline.displayName = 'TreeNodeGuideline';
