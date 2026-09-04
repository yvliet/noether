import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Search01Icon } from '@/components/common/Icons';

export const DefaultCommandsSettingsTab: React.FC = () => {
  const setIsCommandPaletteOpen = useWorkspaceStore((s) => s.setIsCommandPaletteOpen);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const handleOpenPalette = () => {
    setIsCommandPaletteOpen(true);
    showToast('Opened Command Palette', 'info');
  };

  const coreCommands = [
    { title: 'Create new note', hotkey: 'Ctrl+N', section: 'Files' },
    { title: 'Open command palette', hotkey: 'Ctrl+P', section: 'System' },
    { title: 'Open Settings & Preferences', hotkey: 'Ctrl+,', section: 'System' },
    { title: 'Toggle Left Sidebar', hotkey: 'Ctrl+\\', section: 'View' },
    { title: 'Toggle Right Sidebar', hotkey: 'Ctrl+Alt+\\', section: 'View' },
    { title: 'Toggle Reading/Editing view', hotkey: 'Ctrl+E', section: 'Editor' },
    { title: 'Toggle source mode', hotkey: 'Ctrl+Alt+S', section: 'Editor' },
    { title: 'Search in active document', hotkey: 'Ctrl+F', section: 'Editor' },
    { title: 'Replace in active document', hotkey: 'Ctrl+H', section: 'Editor' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Workspace Commands Settings</h3>
          <p className="text-[11px] text-[#777]">Built-in workspace operations and default keyboard bindings.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenPalette}
          className="flint-btn flint-btn-primary flex items-center gap-1.5"
        >
          <Search01Icon size={13} />
          <span>Open Command Palette</span>
        </button>
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {coreCommands.map((cmd) => (
          <div key={cmd.title} className="flex items-center justify-between p-3.5 px-4">
            <div className="flex flex-col">
              <span className="text-[13px] font-normal text-[#dcddde]">{cmd.title}</span>
              <span className="text-[10px] text-[#666]">{cmd.section}</span>
            </div>
            <kbd className="px-2.5 py-1 bg-[#161616] border border-[#333] rounded text-xs text-[#aaa] font-mono">
              {cmd.hotkey}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
};
