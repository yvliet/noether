import React from 'react';
import { useJournalSettings, DEFAULT_JOURNAL_SETTINGS } from './journalSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { RotateCcwIcon, Folder01Icon } from '@/components/common/Icons';
import { SettingCard, SettingItem, TextInput, Toggle, Button } from '@/components/ui';

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
      <SettingCard
        title="Journal"
        description="Configure formatting, automation, and storage for daily journal entries."
        action={
          isModified ? (
            <Button
              size="sm"
              icon={<RotateCcwIcon size={12} />}
              onClick={() => {
                restoreDefaults();
                showToast('Restored Journal defaults', 'info');
              }}
            >
              Restore defaults
            </Button>
          ) : undefined
        }
      >
        {/* Date Format */}
        <SettingItem
          name="Date format"
          description="Moment.js formatting tokens (e.g. YYYY-MM-DD, dddd, MMMM Do YYYY)."
          isModified={dailyFormat !== DEFAULT_JOURNAL_SETTINGS.dailyFormat}
          onReset={() => setDailyFormat(DEFAULT_JOURNAL_SETTINGS.dailyFormat)}
          resetTitle="Restore default date format (YYYY-MM-DD)"
        >
          <TextInput
            isMono
            value={dailyFormat}
            onChange={(e) => setDailyFormat(e.target.value)}
            className="w-40"
          />
        </SettingItem>

        {/* New file location */}
        <SettingItem
          name="New entry location"
          description="Folder where new journal entries will be created (leave blank for root)."
          isModified={dailyFolder !== DEFAULT_JOURNAL_SETTINGS.dailyFolder}
          onReset={() => setDailyFolder(DEFAULT_JOURNAL_SETTINGS.dailyFolder)}
          resetTitle="Restore default folder (Root)"
        >
          <button
            type="button"
            onClick={handlePickFolder}
            className="flint-btn text-xs py-1 px-2.5 flex items-center gap-2 group"
            title="Click to select folder in File Explorer"
          >
            <Folder01Icon size={13} className="text-[#888] group-hover:text-white" />
            <span className="max-w-[130px] truncate text-[var(--flint-text-secondary,#dcddde)]">
              {dailyFolder ? dailyFolder : 'Hearth root ( / )'}
            </span>
            <span className="text-[10px] text-[#888] group-hover:text-[#ccc] bg-[var(--flint-bg-card-hover,#282828)] px-1.5 py-0.5 rounded border border-[var(--flint-border-strong,#383838)]">
              Set
            </span>
          </button>
        </SettingItem>

        {/* Open on startup */}
        <SettingItem
          name="Open on startup"
          description="Automatically open or create today's journal entry when Flint launches."
        >
          <Toggle
            checked={openOnStartup}
            onChange={setOpenOnStartup}
          />
        </SettingItem>

        {/* Note heading format */}
        <SettingItem
          name="Default entry heading"
          description="Optional Markdown heading prepended to newly created journal entries."
        >
          <TextInput
            value={headingFormat}
            onChange={(e) => setHeadingFormat(e.target.value)}
            placeholder="e.g. # Journal"
            className="w-40"
          />
        </SettingItem>
      </SettingCard>
    </div>
  );
};

// Alias for backwards compatibility
export const DailyNotesSettingsTab = JournalSettingsTab;
export default JournalSettingsTab;
