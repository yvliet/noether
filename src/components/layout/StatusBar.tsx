import React from 'react';
import { useFlintApp, useStatusBarItems } from '@/core/app/AppContext';

const StatusBarItemRenderer: React.FC<{
  item: import('@/core/extensions/types').StatusBarItem;
  app: import('@/core/app/FlintApp').FlintApp;
}> = React.memo(({ item, app }) => {
  return <>{item.render(app)}</>;
});

export const StatusBar: React.FC = React.memo(() => {
  const app = useFlintApp();
  const leftItems = useStatusBarItems('left');
  const rightItems = useStatusBarItems('right');

  if (leftItems.length === 0 && rightItems.length === 0) {
    return null;
  }

  return (
    <div
      data-flint-statusbar="true"
      style={{
        background: 'var(--flint-bg-statusbar, var(--flint-bg-card))',
        color: 'var(--flint-text-muted)',
      }}
      className="flint-status-bar absolute bottom-0 right-0 z-20 flex items-center gap-2 px-2 py-0.5 border-t border-l border-[var(--flint-border-base)] rounded-tl-md text-[11px] select-none shadow-sm"
    >
      {/* Left-aligned status items (if any) */}
      {leftItems.map((item) => (
        <StatusBarItemRenderer key={item.id} item={item} app={app} />
      ))}

      {/* Right-aligned status items */}
      {rightItems.map((item) => (
        <StatusBarItemRenderer key={item.id} item={item} app={app} />
      ))}
    </div>
  );
});


