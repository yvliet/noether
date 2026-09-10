import React, { useCallback } from 'react';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { Alert02Icon } from '@/components/common/Icons';
import { useFlintApp } from '@/core/app/AppContext';
import { useWorkspaceStore } from '@/store/workspaceStore';

export interface DisabledExtensionViewProps {
  extensionId?: string;
  extensionName?: string;
  viewTitle?: string;
  tabId?: string;
}

export const DisabledExtensionView: React.FC<DisabledExtensionViewProps> = React.memo(({
  extensionId,
  extensionName,
  viewTitle,
}) => {
  const app = useFlintApp();
  const showToast = useWorkspaceStore((s) => s.showToast);

  const targetId = extensionId || '';
  const targetName = extensionName || targetId;

  const handleEnableExtension = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const ok = await app.extensions.enableExtension(targetId);
      if (ok) {
        showToast(`Enabled "${targetName}" extension`, 'success');
      } else {
        showToast(`Failed to enable "${targetName}"`, 'warning');
      }
    } catch (err) {
      console.error('Error enabling extension:', err);
      showToast(`Error enabling "${targetName}"`, 'warning');
    }
  }, [app.extensions, targetId, targetName, showToast]);

  return (
    <div className="w-full h-full flex flex-col min-w-0 overflow-hidden font-sans select-none bg-[var(--flint-bg-main)]">
      {/* 1. View Subheader with interactive inline link */}
      <PageSubHeader
        title={viewTitle || targetName}
        icon={<Alert02Icon size={14} className="text-amber-400" />}
        centerContent={
          <div className="text-[11px] text-[var(--flint-text-muted)] truncate max-w-lg px-2 py-0.5 text-center select-none flex items-center justify-center gap-1.5 font-sans">
            <Alert02Icon size={12} className="text-amber-400 shrink-0" />
            <span className="truncate">
              This view belonged to <strong className="text-[var(--flint-text-secondary)] font-medium">{targetName}</strong>, but you disabled it.{' '}
              <button
                type="button"
                onClick={handleEnableExtension}
                className="text-[var(--flint-accent)] hover:underline font-medium cursor-pointer bg-transparent border-0 p-0 inline"
              >
                Enable it back?
              </button>
            </span>
          </div>
        }
        showReadingToggle={false}
        showBookmark={false}
        showSearch={false}
        showDocOptions={false}
      />

      {/* 2. Empty Body */}
      <div className="flex-1 w-full h-full" />
    </div>
  );
});

export default DisabledExtensionView;
