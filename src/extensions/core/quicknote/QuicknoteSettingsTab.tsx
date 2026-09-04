import React from 'react';
import {
  useQuicknoteSettings,
  DEFAULT_QUICKNOTE_SETTINGS,
  STICKY_THEMES,
  StickyPaperColor,
} from './quicknoteSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { RotateCcwIcon, Folder01Icon, CheckIcon } from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';

export const QuicknoteSettingsTab: React.FC = React.memo(() => {
  const {
    quicknoteFolder,
    setQuicknoteFolder,
    quicknoteShortcut,
    setQuicknoteShortcut,
    paperColor,
    setPaperColor,
    autoTitle,
    setAutoTitle,
    restoreDefaults,
  } = useQuicknoteSettings();

  const { showToast, promptFolderSelection } = useWorkspaceStore();

  const isModified =
    quicknoteFolder !== DEFAULT_QUICKNOTE_SETTINGS.quicknoteFolder ||
    quicknoteShortcut !== DEFAULT_QUICKNOTE_SETTINGS.quicknoteShortcut ||
    paperColor !== DEFAULT_QUICKNOTE_SETTINGS.paperColor ||
    autoTitle !== DEFAULT_QUICKNOTE_SETTINGS.autoTitle;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Quicknote</h3>
          <p className="text-[11px] text-[#777]">
            Configure capture location, default styling, and behavior for quick sticky notes.
          </p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Quicknote defaults', 'info');
            }}
            className="flint-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      {/* Main Settings Card */}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Quicknote Folder Location */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Quicknote location</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Folder where captured sticky notes are saved (defaults to Quicknotes).
            </span>
          </div>
          <div className="flex items-center gap-2">
            {quicknoteFolder !== DEFAULT_QUICKNOTE_SETTINGS.quicknoteFolder && (
              <button
                type="button"
                onClick={() => {
                  setQuicknoteFolder(DEFAULT_QUICKNOTE_SETTINGS.quicknoteFolder);
                  showToast('Restored Quicknote folder to default (Quicknotes)', 'info');
                }}
                title="Restore default folder (Quicknotes)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                promptFolderSelection({
                  title: 'Click on a folder for Quicknotes',
                  allowRoot: true,
                  onSelect: (folderPath) => {
                    setQuicknoteFolder(folderPath || 'Quicknotes');
                    showToast(
                      folderPath
                        ? `Quicknote location set to "${folderPath}"`
                        : 'Quicknote location set to Quicknotes',
                      'success'
                    );
                  },
                });
              }}
              className="flint-btn text-xs py-1 px-2.5 flex items-center gap-2 group"
              title="Click to select folder in File Explorer"
            >
              <Folder01Icon size={13} className="text-[#888] group-hover:text-white" />
              <span className="max-w-[130px] truncate text-[#dcddde]">
                {quicknoteFolder ? quicknoteFolder : 'Quicknotes'}
              </span>
              <span className="text-[10px] text-[#888] group-hover:text-[#ccc] bg-[#282828] px-1.5 py-0.5 rounded border border-[#383838]">
                Set
              </span>
            </button>
          </div>
        </div>

        {/* Paper Color */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Default paper color</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Default paper tint for new sticky note captures.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(Object.keys(STICKY_THEMES) as StickyPaperColor[]).map((key) => {
              const item = STICKY_THEMES[key];
              const isSelected = paperColor === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setPaperColor(key);
                    showToast(`Paper color set to ${item.label}`, 'info');
                  }}
                  title={item.label}
                  style={{
                    backgroundColor: item.bg,
                    borderColor: isSelected ? '#ffffff' : 'rgba(0,0,0,0.2)',
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center shadow-sm ${
                    isSelected ? 'scale-110 shadow-md ring-2 ring-[var(--flint-accent)]' : 'hover:scale-105'
                  }`}
                >
                  {isSelected && <CheckIcon size={12} className="text-neutral-900" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto Title */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Auto-generate title</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically name notes from the first line when the title field is left blank.
            </span>
          </div>
          <ToggleSwitch checked={autoTitle} onChange={setAutoTitle} />
        </div>

        {/* Shortcut Info */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Keyboard shortcut</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Quickly summon the sticky note capture overlay from anywhere.
            </span>
          </div>
          <span className="font-mono text-xs text-[#dcddde] bg-[#181818] px-2.5 py-1 rounded-[5px] border border-[#383838]">
            {quicknoteShortcut}
          </span>
        </div>
      </div>
    </div>
  );
});

export default QuicknoteSettingsTab;
