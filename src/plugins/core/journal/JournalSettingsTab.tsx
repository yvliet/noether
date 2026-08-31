import React from 'react';
import { useJournalSettings, DEFAULT_JOURNAL_SETTINGS } from './journalSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { RotateCcwIcon, Folder01Icon } from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';

export const JournalSettingsTab: React.FC = () => {
  const {
    dailyFormat,
    setDailyFormat,
    dailyFolder,
    setDailyFolder,
    openOnStartup,
    setOpenOnStartup,
    headingFormat,
    setHeadingFormat,
    restoreDefaults,
  } = useJournalSettings();

  const { showToast, promptFolderSelection, setIsSettingsOpen } = useWorkspaceStore();

  const handlePickFolder = () => {
    promptFolderSelection({
      title: 'Click on a folder',
      allowRoot: true,
      onSelect: (folderPath) => {
        setDailyFolder(folderPath);
        setIsSettingsOpen(true, 'journal-settings');
        showToast(folderPath ? `Journal location set to "${folderPath}"` : 'Journal location set to Hearth root', 'success');
      },
      onCancel: () => {
        setIsSettingsOpen(true, 'journal-settings');
      },
    });
  };

  const isModified =
    dailyFormat !== DEFAULT_JOURNAL_SETTINGS.dailyFormat ||
    dailyFolder !== DEFAULT_JOURNAL_SETTINGS.dailyFolder ||
    openOnStartup !== DEFAULT_JOURNAL_SETTINGS.openOnStartup ||
    headingFormat !== DEFAULT_JOURNAL_SETTINGS.headingFormat;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Journal</h3>
          <p className="text-[11px] text-[#777]">Configure formatting, automation, and storage for daily journal entries.</p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Journal defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Date Format */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Date format</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Moment.js formatting tokens (e.g. YYYY-MM-DD, dddd, MMMM Do YYYY).
            </span>
          </div>
          <div className="flex items-center gap-2">
            {dailyFormat !== DEFAULT_JOURNAL_SETTINGS.dailyFormat && (
              <button
                type="button"
                onClick={() => setDailyFormat(DEFAULT_JOURNAL_SETTINGS.dailyFormat)}
                title="Restore default date format (YYYY-MM-DD)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <input
              type="text"
              value={dailyFormat}
              onChange={(e) => setDailyFormat(e.target.value)}
              className="w-40 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors"
            />
          </div>
        </div>

        {/* New file location */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">New entry location</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Folder where new journal entries will be created (leave blank for root).
            </span>
          </div>
          <div className="flex items-center gap-2">
            {dailyFolder !== DEFAULT_JOURNAL_SETTINGS.dailyFolder && (
              <button
                type="button"
                onClick={() => setDailyFolder(DEFAULT_JOURNAL_SETTINGS.dailyFolder)}
                title="Restore default folder (Root)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={handlePickFolder}
              className="flex items-center gap-2 bg-[#181818] hover:bg-[#222222] active:bg-[#151515] border border-[#383838] hover:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors cursor-pointer group"
              title="Click to select folder in File Explorer"
            >
              <Folder01Icon size={13} className="text-[#888] group-hover:text-white transition-colors" />
              <span className="max-w-[130px] truncate text-[#dcddde]">
                {dailyFolder ? dailyFolder : 'Hearth root ( / )'}
              </span>
              <span className="text-[10px] text-[#888] group-hover:text-[#ccc] bg-[#282828] px-1.5 py-0.5 rounded border border-[#383838]">
                Set
              </span>
            </button>
          </div>
        </div>

        {/* Open on startup */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Open on startup</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically open or create today's journal entry when Flint launches.
            </span>
          </div>
          <ToggleSwitch
            checked={openOnStartup}
            onChange={setOpenOnStartup}
          />
        </div>

        {/* Note heading format */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Default entry heading</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Optional Markdown heading prepended to newly created journal entries.
            </span>
          </div>
          <input
            type="text"
            value={headingFormat}
            onChange={(e) => setHeadingFormat(e.target.value)}
            placeholder="e.g. # Journal"
            className="w-40 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors"
          />
        </div>
      </div>
    </div>
  );
};

// Alias for backwards compatibility
export const DailyNotesSettingsTab = JournalSettingsTab;
export default JournalSettingsTab;
