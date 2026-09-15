import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { SettingsWindowContent } from '@/components/settings/SettingsWindow';

export const SettingsModal: React.FC = React.memo(() => {
  const isSettingsOpen = useWorkspaceStore((state) => state.isSettingsOpen);
  const setIsSettingsOpen = useWorkspaceStore((state) => state.setIsSettingsOpen);
  const settingsInitialTab = useWorkspaceStore((state) => state.settingsInitialTab);

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 overflow-hidden">
      <div className="pointer-events-auto">
        <SettingsWindowContent
          isModal
          initialTab={settingsInitialTab || undefined}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </div>
  );
});
