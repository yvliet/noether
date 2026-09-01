import React from 'react';
import {
  StickyNote02Icon,
  Folder01Icon,
  RotateCcwIcon,
  PaletteIcon,
  CheckIcon,
} from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import {
  useQuicknoteSettings,
  DEFAULT_QUICKNOTE_SETTINGS,
  STICKY_THEMES,
  StickyPaperColor,
} from './quicknoteSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const QuicknoteSettingsTab: React.FC = React.memo(() => {
  const quicknoteFolder = useQuicknoteSettings((s) => s.quicknoteFolder);
  const setQuicknoteFolder = useQuicknoteSettings((s) => s.setQuicknoteFolder);
  const quicknoteShortcut = useQuicknoteSettings((s) => s.quicknoteShortcut);
  const setQuicknoteShortcut = useQuicknoteSettings((s) => s.setQuicknoteShortcut);
  const paperColor = useQuicknoteSettings((s) => s.paperColor);
  const setPaperColor = useQuicknoteSettings((s) => s.setPaperColor);
  const autoTitle = useQuicknoteSettings((s) => s.autoTitle);
  const setAutoTitle = useQuicknoteSettings((s) => s.setAutoTitle);

  const showToast = useWorkspaceStore((s) => s.showToast);
  const promptFolderSelection = useWorkspaceStore((s) => s.promptFolderSelection);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Quicknote</h3>
          <p className="text-[11px] text-[#777]">
            Physical sticky note quick-capture overlay for rapid note taking.
          </p>
        </div>
      </div>

      {/* Sticky Note Appearance */}
      <div>
        <div className="px-4 mb-2.5 flex items-center gap-1.5">
          <PaletteIcon size={14} className="text-[var(--flint-accent)]" />
          <h4 className="text-sm font-semibold text-white">Sticky Note Style</h4>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {/* Paper Color */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Paper color</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Default paper tint for new sticky notes.
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

          {/* Auto-Title */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Auto-generate title</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Automatically name notes from the first line when the title field is left blank.
              </span>
            </div>
            <ToggleSwitch checked={autoTitle} onChange={setAutoTitle} />
          </div>
        </div>
      </div>

      {/* Storage & Location */}
      <div>
        <div className="px-4 mb-2.5 flex items-center gap-1.5">
          <Folder01Icon size={14} className="text-[var(--flint-accent)]" />
          <h4 className="text-sm font-semibold text-white">Storage Location</h4>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {/* Target Folder */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Quicknote folder</span>
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
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer"
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
                className="flex items-center gap-2 bg-[#181818] hover:bg-[#222222] active:bg-[#151515] border border-[#383838] hover:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors cursor-pointer group"
                title="Click to select folder in File Explorer"
              >
                <Folder01Icon size={13} className="text-[#888] group-hover:text-white transition-colors" />
                <span className="max-w-[130px] truncate text-[#dcddde]">
                  {quicknoteFolder ? quicknoteFolder : 'Quicknotes'}
                </span>
                <span className="text-[10px] text-[#888] group-hover:text-[#ccc] bg-[#282828] px-1.5 py-0.5 rounded border border-[#383838]">
                  Set
                </span>
              </button>
            </div>
          </div>

          {/* Shortcut */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Keyboard shortcut</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Quickly summon the sticky note capture overlay from anywhere.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {quicknoteShortcut !== DEFAULT_QUICKNOTE_SETTINGS.quicknoteShortcut && (
                <button
                  type="button"
                  onClick={() => {
                    setQuicknoteShortcut(DEFAULT_QUICKNOTE_SETTINGS.quicknoteShortcut);
                    showToast('Restored Quicknote shortcut to default (Ctrl+Shift+Space)', 'info');
                  }}
                  title="Restore default shortcut"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <span className="font-mono text-xs text-[#dcddde] bg-[#181818] px-2.5 py-1 rounded-[5px] border border-[#383838]">
                {quicknoteShortcut}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default QuicknoteSettingsTab;
