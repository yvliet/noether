import React from 'react';
import { ChevronRightIcon } from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { Slider } from '@/components/common/Slider';
import { CustomSelect } from '@/components/common/CustomSelect';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  SettingRow,
  SettingSection,
  FieldResetButton,
} from '../shared/SettingRow';

export const InterfaceTab: React.FC = React.memo(() => {
  const showTabTitleBar = useSettingsStore((s) => s.showTabTitleBar);
  const setShowTabTitleBar = useSettingsStore((s) => s.setShowTabTitleBar);
  const restoreTabs = useSettingsStore((s) => s.restoreTabs);
  const setRestoreTabs = useSettingsStore((s) => s.setRestoreTabs);
  const showRibbon = useSettingsStore((s) => s.showRibbon);
  const setShowRibbon = useSettingsStore((s) => s.setShowRibbon);
  const zoomLevel = useSettingsStore((s) => s.zoomLevel);
  const setZoomLevel = useSettingsStore((s) => s.setZoomLevel);
  const nativeMenus = useSettingsStore((s) => s.nativeMenus);
  const setNativeMenus = useSettingsStore((s) => s.setNativeMenus);
  const windowFrameStyle = useSettingsStore((s) => s.windowFrameStyle);
  const setWindowFrameStyle = useSettingsStore((s) => s.setWindowFrameStyle);
  const openSettingsInNewWindow = useSettingsStore((s) => s.openSettingsInNewWindow);
  const setOpenSettingsInNewWindow = useSettingsStore((s) => s.setOpenSettingsInNewWindow);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const isInterfaceModified =
    showTabTitleBar !== DEFAULT_SETTINGS.showTabTitleBar ||
    restoreTabs !== DEFAULT_SETTINGS.restoreTabs ||
    showRibbon !== DEFAULT_SETTINGS.showRibbon ||
    zoomLevel !== DEFAULT_SETTINGS.zoomLevel ||
    nativeMenus !== DEFAULT_SETTINGS.nativeMenus ||
    windowFrameStyle !== DEFAULT_SETTINGS.windowFrameStyle ||
    openSettingsInNewWindow !== DEFAULT_SETTINGS.openSettingsInNewWindow;

  return (
    <div className="flex flex-col gap-6">
      {/* Section 1: Workspace & Navigation */}
      <SettingSection
        title="Workspace & Navigation"
        description="Tab bar visibility, startup session restoration, and action rail controls."
        tabName="Interface"
        sectionName="Interface"
        isModified={isInterfaceModified}
        onReset={() => {
          restoreTabDefaults('interface');
          showToast('Restored Interface settings to default', 'info');
        }}
        resetTitle="Restore default interface settings"
      >
        {/* Show tab title bar */}
        <SettingRow
          title="Show tab title bar"
          description="Display the header at the top of every tab."
          keywords={['tab', 'strip', 'titlebar', 'tabs', 'header']}
          resetButton={
            <FieldResetButton
              isModified={showTabTitleBar !== DEFAULT_SETTINGS.showTabTitleBar}
              onReset={() => setShowTabTitleBar(DEFAULT_SETTINGS.showTabTitleBar)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={showTabTitleBar} onChange={setShowTabTitleBar} />
        </SettingRow>

        {/* Restore open tabs on startup */}
        <SettingRow
          title="Restore open tabs"
          description="Automatically restore your open tabs and split panes when restarting or reloading the app."
          keywords={['restore', 'session', 'startup', 'tabs', 'split panes']}
          resetButton={
            <FieldResetButton
              isModified={restoreTabs !== DEFAULT_SETTINGS.restoreTabs}
              onReset={() => setRestoreTabs(DEFAULT_SETTINGS.restoreTabs)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={restoreTabs} onChange={setRestoreTabs} />
        </SettingRow>

        {/* Show Action Rail */}
        <SettingRow
          title="Show Action Rail"
          description="Display vertical action toolbar on the side of the window."
          keywords={['action rail', 'rail', 'sidebar', 'panel', 'toolbar']}
          resetButton={
            <FieldResetButton
              isModified={showRibbon !== DEFAULT_SETTINGS.showRibbon}
              onReset={() => setShowRibbon(DEFAULT_SETTINGS.showRibbon)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={showRibbon} onChange={setShowRibbon} />
        </SettingRow>

        {/* Action rail configuration */}
        <SettingRow
          title="Action rail configuration"
          description="Configure what commands appear in the action rail."
          keywords={['action rail', 'commands', 'configure']}
          onClick={() => showToast('Action Rail configuration', 'info')}
        >
          <ChevronRightIcon size={14} className="text-[#777]" />
        </SettingRow>
      </SettingSection>

      {/* Section 2: Display Scaling & Window Frame */}
      <SettingSection
        title="Display Scaling & Window Frame"
        description="UI scaling magnification, window frame styling modes, and standalone settings window behavior."
        tabName="Interface"
        sectionName="Advanced"
      >
        {/* Zoom level */}
        <SettingRow
          title="Zoom level"
          description="Controls the overall zoom level of the app."
          keywords={['zoom', 'scale', 'ui', 'display', 'size']}
          resetButton={
            <FieldResetButton
              isModified={zoomLevel !== DEFAULT_SETTINGS.zoomLevel}
              onReset={() => setZoomLevel(DEFAULT_SETTINGS.zoomLevel, true)}
              title="Restore default zoom level (100%)"
            />
          }
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#dcddde] w-10 text-right font-normal">{zoomLevel}%</span>
            <Slider
              min={75}
              max={150}
              step={5}
              value={zoomLevel}
              onChange={(val) => setZoomLevel(val, true)}
              className="w-28"
            />
          </div>
        </SettingRow>

        {/* Native menus */}
        <SettingRow
          title="Native menus"
          description="Menus throughout the app will match the operating system. They will not be affected by your theme."
          keywords={['native menus', 'context menu', 'os', 'menus']}
          resetButton={
            <FieldResetButton
              isModified={nativeMenus !== DEFAULT_SETTINGS.nativeMenus}
              onReset={() => setNativeMenus(DEFAULT_SETTINGS.nativeMenus)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={nativeMenus} onChange={setNativeMenus} />
        </SettingRow>

        {/* Window frame style */}
        <SettingRow
          title="Window frame style"
          description="Determines the styling of the title bar of Noether windows. Requires a full restart to take effect."
          keywords={['frame', 'window', 'titlebar', 'borders', 'native']}
          resetButton={
            <FieldResetButton
              isModified={windowFrameStyle !== DEFAULT_SETTINGS.windowFrameStyle}
              onReset={() => setWindowFrameStyle(DEFAULT_SETTINGS.windowFrameStyle)}
              title="Restore default (Hidden)"
            />
          }
        >
          <CustomSelect
            value={windowFrameStyle}
            onChange={setWindowFrameStyle}
            options={[
              { value: 'Hidden (default)', label: 'Hidden (default)' },
              { value: 'Native', label: 'Native' },
            ]}
          />
        </SettingRow>

        {/* Open settings in new window */}
        <SettingRow
          title="Open settings in new window"
          description="Open settings in its own window instead of embedded in the app."
          keywords={['window', 'settings', 'modal', 'separate', 'standalone']}
          resetButton={
            <FieldResetButton
              isModified={openSettingsInNewWindow !== DEFAULT_SETTINGS.openSettingsInNewWindow}
              onReset={() => setOpenSettingsInNewWindow(DEFAULT_SETTINGS.openSettingsInNewWindow)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={openSettingsInNewWindow} onChange={setOpenSettingsInNewWindow} />
        </SettingRow>
      </SettingSection>
    </div>
  );
});
