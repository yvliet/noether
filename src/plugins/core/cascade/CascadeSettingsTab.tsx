import React from 'react';
import { useCascadeSettings, DEFAULT_CASCADE_SETTINGS } from './cascadeSettings';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const CascadeSettingsTab: React.FC = () => {
  const {
    showInStatusBar,
    setShowInStatusBar,
    autoRenameSuffix,
    setAutoRenameSuffix,
    prevPageHotkey,
    nextPageHotkey,
    restoreDefaults,
  } = useCascadeSettings();

  const showToast = useWorkspaceStore((s) => s.showToast);

  const isModified =
    showInStatusBar !== DEFAULT_CASCADE_SETTINGS.showInStatusBar ||
    autoRenameSuffix !== DEFAULT_CASCADE_SETTINGS.autoRenameSuffix ||
    prevPageHotkey !== DEFAULT_CASCADE_SETTINGS.prevPageHotkey ||
    nextPageHotkey !== DEFAULT_CASCADE_SETTINGS.nextPageHotkey;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Cascade</h3>
          <p className="text-[11px] text-[#777]">
            Organize notes into sequential cascades with status-bar linking, navigation hotkeys, and automatic numbering.
          </p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Cascade defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      {/* Main Settings Card */}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Status bar item */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Status bar cascade item</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Show the interactive Cascade icon in the status bar to link notes and adjust page numbers.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showInStatusBar !== DEFAULT_CASCADE_SETTINGS.showInStatusBar && (
              <button
                type="button"
                onClick={() => setShowInStatusBar(DEFAULT_CASCADE_SETTINGS.showInStatusBar)}
                title="Restore default (Enabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={showInStatusBar} onChange={setShowInStatusBar} />
          </div>
        </div>

        {/* Automatic [n] Title Suffix */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Automatic [n] title suffix</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically append or update &ldquo; [n]&rdquo; at the end of the note title when assigned to a cascade page.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {autoRenameSuffix !== DEFAULT_CASCADE_SETTINGS.autoRenameSuffix && (
              <button
                type="button"
                onClick={() => setAutoRenameSuffix(DEFAULT_CASCADE_SETTINGS.autoRenameSuffix)}
                title="Restore default (Enabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={autoRenameSuffix} onChange={setAutoRenameSuffix} />
          </div>
        </div>

        {/* Previous page shortcut */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Previous page hotkey</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Shortcut to navigate to the previous sequential note in the active cascade.
            </span>
          </div>
          <span className="font-mono text-xs text-[#dcddde] bg-[#181818] px-2.5 py-1 rounded-[5px] border border-[#383838]">
            {prevPageHotkey}
          </span>
        </div>

        {/* Next page shortcut */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Next page hotkey</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Shortcut to navigate to the next sequential note in the active cascade.
            </span>
          </div>
          <span className="font-mono text-xs text-[#dcddde] bg-[#181818] px-2.5 py-1 rounded-[5px] border border-[#383838]">
            {nextPageHotkey}
          </span>
        </div>
      </div>
    </div>
  );
};
