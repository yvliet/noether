import React, { useCallback } from 'react';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { PuzzleIcon } from '@/components/common/Icons';
import { useNoetherApp } from '@/core/app/AppContext';
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
  const app = useNoetherApp();
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
    <div data-main="true" className="w-full h-full flex flex-col min-w-0 overflow-hidden font-sans select-none bg-[var(--noether-bg-tab-active,var(--noether-bg-main))] relative">
      {/* 1. Standard View Subheader */}
      <PageSubHeader
        title={viewTitle || targetName}
        icon={<PuzzleIcon size={14} className="opacity-40" />}
        showReadingToggle={false}
        showBookmark={false}
        showSearch={false}
        showDocOptions={false}
      />

      {/* 2. Main Empty View Body */}
      <div className="flex-1 flex flex-col items-center justify-center text-center select-none p-6 gap-2 text-[#666] text-xs">
        <PuzzleIcon size={36} className="opacity-40 mb-1" />
        <span className="text-[13px] text-[#888]">Extension view disabled</span>
        <p className="text-xs text-[#666] max-w-sm leading-relaxed">
          This view belongs to <strong className="text-[#888] font-normal">&ldquo;{targetName}&rdquo;</strong>, which is currently disabled.
        </p>
        <button
          type="button"
          onClick={handleEnableExtension}
          className="text-[11px] text-[#888] hover:text-white cursor-pointer mt-1 underline underline-offset-2"
        >
          Enable extension
        </button>
      </div>
    </div>
  );
});

export default DisabledExtensionView;
