import React from 'react';
import { SparklesIcon } from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { CustomSelect } from '@/components/common/CustomSelect';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAutoUpdater } from '@/hooks/useAutoUpdater';
import { APP_VERSION } from '@/version';
import { platform } from '@/lib/platform/platformAdapter';
import {
  SettingRow,
  SettingSection,
  FieldResetButton,
} from '../shared/SettingRow';

export const GeneralTab: React.FC = React.memo(() => {
  const autoUpdates = useSettingsStore((s) => s.autoUpdates);
  const setAutoUpdates = useSettingsStore((s) => s.setAutoUpdates);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const setIsUpdateModalOpen = useWorkspaceStore((s) => s.setIsUpdateModalOpen);
  const { checkForUpdatesNow, isChecking, hasUpdate, latestRelease } = useAutoUpdater();

  const isGeneralModified =
    autoUpdates !== DEFAULT_SETTINGS.autoUpdates ||
    language !== DEFAULT_SETTINGS.language;

  return (
    <div className="flex flex-col gap-5">
      <SettingSection
        title="Application & System"
        description="Desktop application versioning, automatic update checks, and display language."
        tabName="General"
        sectionName="General"
        isModified={isGeneralModified}
        onReset={() => {
          restoreTabDefaults('general');
          showToast('Restored General settings to default', 'info');
        }}
        resetTitle="Restore default general settings"
      >
        {/* Row: Version & Updates */}
        <SettingRow
          title={`Version ${APP_VERSION}`}
          description={
            <div className="flex flex-col">
              <span className="text-xs text-[#888]">Installer version: {APP_VERSION}</span>
              <a
                href="https://github.com/yvliet/Noether/releases"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#38bdf8] hover:underline mt-0.5 inline-block w-fit"
              >
                Read the changelog.
              </a>
            </div>
          }
          descriptionText={`Installer version: ${APP_VERSION}. Check for updates or read the changelog.`}
          keywords={['version', 'update', 'installer', 'changelog', 'release']}
        >
          <div className="flex items-center gap-2">
            {hasUpdate && latestRelease && (
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true, latestRelease)}
                className="noether-btn noether-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <SparklesIcon size={13} />
                <span>Update to v{latestRelease.version}</span>
              </button>
            )}
            <button
              type="button"
              onClick={checkForUpdatesNow}
              disabled={isChecking}
              className="noether-btn text-xs py-1.5 px-3 disabled:opacity-50 cursor-pointer"
            >
              {isChecking ? 'Checking...' : 'Check for updates'}
            </button>
          </div>
        </SettingRow>

        {/* Row: Automatic updates */}
        <SettingRow
          title="Automatic updates"
          description="Turn this off to prevent the app from checking for updates."
          keywords={['automatic updates', 'auto updates', 'upgrade']}
          resetButton={
            <FieldResetButton
              isModified={autoUpdates !== DEFAULT_SETTINGS.autoUpdates}
              onReset={() => setAutoUpdates(DEFAULT_SETTINGS.autoUpdates)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={autoUpdates} onChange={setAutoUpdates} />
        </SettingRow>

        {/* Row: Language */}
        <SettingRow
          title="Display language"
          description="Change the display language."
          keywords={['language', 'display language', 'locale', 'translation']}
          resetButton={
            <FieldResetButton
              isModified={language !== DEFAULT_SETTINGS.language}
              onReset={() => setLanguage(DEFAULT_SETTINGS.language)}
              title="Restore default language (English)"
            />
          }
        >
          <CustomSelect
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'English', label: 'English' },
              { value: 'German', label: 'Deutsch' },
              { value: 'Spanish', label: 'Español' },
              { value: 'French', label: 'Français' },
              { value: 'Japanese', label: '日本語' },
            ]}
          />
        </SettingRow>

        {/* Row: Help */}
        <SettingRow
          title="Help"
          description="Learn how to use Noether and get help from the community."
          keywords={['help', 'community', 'documentation', 'guide']}
        >
          <button
            onClick={() => platform.openHelpWindow()}
            className="noether-btn"
          >
            Open
          </button>
        </SettingRow>
      </SettingSection>
    </div>
  );
});
