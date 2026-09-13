import React, { useState, useEffect } from 'react';
import { useHistorySettings, DEFAULT_HISTORY_SETTINGS } from './historySettings';
import { useNoetherApp, useToast } from 'noether';
import { HistoryIcon, RotateCcwIcon, CheckIcon } from '@/components/common/Icons';
import { SettingCard, SettingItem, Button, Toggle, Slider } from '@/components/ui';

export const HistorySettingsTab: React.FC = () => {
  const app = useNoetherApp();
  const showToast = useToast();

  const {
    autoSnapshot,
    setAutoSnapshot,
    debounceSeconds,
    setDebounceSeconds,
    maxHistoryItems,
    setMaxHistoryItems,
    restoreDefaults,
  } = useHistorySettings();

  const [gitStatus, setGitStatus] = useState<{
    installed: boolean;
    initialized: boolean;
    version?: string;
  }>({ installed: true, initialized: true });

  useEffect(() => {
    app.vcs.checkStatus().then((res) => {
      setGitStatus({
        installed: res.installed ?? false,
        initialized: res.initialized ?? false,
        version: res.version,
      });
    });
  }, [app]);

  const isModified =
    autoSnapshot !== DEFAULT_HISTORY_SETTINGS.autoSnapshot ||
    debounceSeconds !== DEFAULT_HISTORY_SETTINGS.debounceSeconds ||
    maxHistoryItems !== DEFAULT_HISTORY_SETTINGS.maxHistoryItems;

  const handleInitVault = async () => {
    try {
      const res = await app.vcs.initVault();
      if (res.success) {
        showToast('Initialized Version History in vault', 'success');
        const updated = await app.vcs.checkStatus();
        setGitStatus({
          installed: updated.installed ?? false,
          initialized: updated.initialized ?? false,
          version: updated.version,
        });
      } else {
        showToast(res.error || 'Failed to initialize Git', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error initializing Git', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SettingCard
        title="Version History"
        description="Travel back in time to inspect earlier drafts, compare changes, and safely restore past versions."
        action={
          isModified ? (
            <Button
              size="sm"
              icon={<RotateCcwIcon size={12} />}
              onClick={() => {
                restoreDefaults();
                showToast('Restored Version History defaults', 'info');
              }}
            >
              Restore defaults
            </Button>
          ) : undefined
        }
      >
        {/* Environment Status */}
        <SettingItem
          name="Repository Status"
          description={
            gitStatus.installed
              ? gitStatus.initialized
                ? `Git active (${gitStatus.version || 'installed'}). Revisions are saved directly in your vault.`
                : 'Git is detected, but this vault has not been initialized for history tracking yet.'
              : 'Git binary was not found on your system. Please install Git to enable automatic snapshots.'
          }
        >
          {gitStatus.installed && !gitStatus.initialized ? (
            <Button onClick={handleInitVault} icon={<HistoryIcon size={13} />}>
              Initialize Vault
            </Button>
          ) : gitStatus.installed && gitStatus.initialized ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckIcon size={13} />
              <span>Active</span>
            </span>
          ) : null}
        </SettingItem>

        {/* Auto Snapshot Toggle */}
        <SettingItem
          name="Automatic Snapshots"
          description="Automatically take a lightweight version snapshot whenever you save changes to a note."
        >
          <Toggle
            checked={autoSnapshot}
            onChange={(val) => {
              setAutoSnapshot(val);
              showToast(val ? 'Automatic snapshots enabled' : 'Automatic snapshots disabled', 'info');
            }}
          />
        </SettingItem>

        {/* Snapshot Debounce Interval */}
        <SettingItem
          name="Snapshot Idle Delay"
          description={`Wait ${debounceSeconds} seconds of typing pause before capturing a revision checkpoint.`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#dcddde] w-6 text-right font-normal">
              {debounceSeconds}s
            </span>
            <Slider
              min={2}
              max={30}
              step={1}
              value={debounceSeconds}
              onChange={setDebounceSeconds}
              className="w-28"
            />
          </div>
        </SettingItem>

        {/* Max History Items */}
        <SettingItem
          name="Timeline History Limit"
          description="Maximum number of historical drafts to display in the note history timeline."
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#dcddde] w-6 text-right font-normal">
              {maxHistoryItems}
            </span>
            <Slider
              min={10}
              max={200}
              step={10}
              value={maxHistoryItems}
              onChange={setMaxHistoryItems}
              className="w-28"
            />
          </div>
        </SettingItem>
      </SettingCard>
    </div>
  );
};
