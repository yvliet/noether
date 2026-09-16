/**
 * @module HelpModal
 * @description
 * In-app overlay modal fallback for the Help window in browser or non-Tauri environments.
 * Reuses HelpWindowContent with isModal={true}.
 */

import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { HelpWindowContent } from '@/components/help/HelpWindow';

export const HelpModal: React.FC = React.memo(() => {
  const isHelpModalOpen = useWorkspaceStore((state) => state.isHelpModalOpen);
  const setIsHelpModalOpen = useWorkspaceStore((state) => state.setIsHelpModalOpen);

  if (!isHelpModalOpen) return null;

  return (
    <div
      onClick={() => setIsHelpModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-hidden select-none"
    >
      <div
        className="pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <HelpWindowContent
          isModal
          onClose={() => setIsHelpModalOpen(false)}
        />
      </div>
    </div>
  );
});

export default HelpModal;
