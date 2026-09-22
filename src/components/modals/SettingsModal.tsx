import React, { useRef } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { SettingsWindowContent } from '@/components/settings/SettingsWindow';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export const SettingsModal: React.FC = React.memo(() => {
  const isSettingsOpen = useWorkspaceStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useWorkspaceStore((state) => state.setIsSettingsOpen);
  const settingsInitialTab = useWorkspaceStore((state) => state.settingsInitialTab);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(isSettingsOpen, modalRef);

  if (!isSettingsOpen) return null;

  return (
    <div
      ref={modalRef}
      onClick={() => setIsSettingsOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden select-none"
    >
      <div onClick={(e) => e.stopPropagation()}>
        <SettingsWindowContent
          isModal
          initialTab={settingsInitialTab || undefined}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </div>
  );
});
