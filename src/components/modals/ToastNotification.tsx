import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CheckmarkCircle02Icon } from '@/components/common/Icons';

export const ToastNotification: React.FC = React.memo(() => {
  const toast = useWorkspaceStore((state) => state.toast);
  const hideToast = useWorkspaceStore((state) => state.hideToast);

  if (!toast) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] pointer-events-auto select-none">
      <div
        onClick={hideToast}
        className="flex items-center gap-2 px-3.5 py-2 bg-[#202020] border border-[#333333] text-[#e0e0e0] text-xs rounded-lg shadow-2xl cursor-pointer hover:bg-[#252525]"
      >
        {toast.type === 'success' && <CheckmarkCircle02Icon size={14} className="text-emerald-400 shrink-0" />}
        <span className="font-medium tracking-tight">{toast.message}</span>
      </div>
    </div>
  );
});
