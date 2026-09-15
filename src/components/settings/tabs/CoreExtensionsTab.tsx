import React, { useMemo, useCallback, useContext } from 'react';
import {
  BookOpen01Icon,
  Settings02Icon,
} from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { useNoetherApp, useExtensionList, useSettingTabs } from '@/core/app/AppContext';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { platform } from '@/lib/platform/platformAdapter';
import {
  highlightMatch,
  isTabMatch,
  SettingsSearchContext,
} from '../shared/SettingRow';

export interface CoreExtensionsTabProps {
  onNavigateTab: (tabId: string) => void;
  onClose?: () => void;
}

export const CoreExtensionsTab: React.FC<CoreExtensionsTabProps> = React.memo(({ onNavigateTab, onClose }) => {
  const app = useNoetherApp();
  const extensionList = useExtensionList();
  const allSettingTabs = useSettingTabs();
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);

  const coreExtensionTabs = useMemo(() => {
    return allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return manifest?.isCore === true;
    });
  }, [allSettingTabs, app]);

  const filteredCore = useMemo(() => {
    if (!searchQuery.trim()) return extensionList.core;
    const q = searchQuery.toLowerCase().trim();
    return extensionList.core.filter((ext) => {
      return (
        ext.name.toLowerCase().includes(q) ||
        (ext.description && ext.description.toLowerCase().includes(q)) ||
        ext.id.toLowerCase().includes(q) ||
        'core extensions'.includes(q) ||
        'core'.includes(q) ||
        'built-in extensions'.includes(q) ||
        'extensions'.includes(q)
      );
    });
  }, [extensionList.core, searchQuery]);

  const handleToggleExtension = useCallback(async (extensionId: string) => {
    const isEnabled = app.extensions.isExtensionEnabled(extensionId);
    if (isEnabled) {
      await app.extensions.disableExtension(extensionId);
    } else {
      await app.extensions.enableExtension(extensionId);
    }
  }, [app]);

  if (showAllOccurrences && searchQuery.trim() && filteredCore.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="px-4">
        <h3 className="text-sm font-semibold text-[var(--noether-text-primary)] mb-0.5">
          {highlightMatch('Core Extensions', searchQuery)}
        </h3>
        <p className="text-[11px] text-[var(--noether-text-muted)] leading-relaxed">
          {highlightMatch('Native capabilities designed as modular extensions. Toggle them anytime.', searchQuery)}
        </p>
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {filteredCore.map((ext) => {
          const isEnabled = app.extensions.isExtensionEnabled(ext.id);
          const settingsTab = coreExtensionTabs.find((tab) => isTabMatch(tab, ext.id));
          return (
            <div
              key={ext.id}
              className="p-3.5 flex items-center justify-between hover:bg-[#242424]/40"
            >
              <div className="flex-1 pr-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-normal text-white">
                    {highlightMatch(ext.name, searchQuery)}
                  </span>
                  <span className="text-[11px] text-[#777] font-normal">v{ext.version}</span>
                </div>
                {ext.description && (
                  <p className="text-[11px] text-[#777] mt-0.5 leading-relaxed">
                    {highlightMatch(ext.description, searchQuery)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {ext.readme && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('noether_open_extension_doc', JSON.stringify({ extensionId: ext.id, title: ext.name, timestamp: Date.now() }));
                      useWorkspaceStore.getState().openExtensionDocTab(ext.id, ext.name);
                      if (onClose) {
                        onClose();
                      } else {
                        useWorkspaceStore.getState().setIsSettingsOpen(false);
                        if (platform.isDesktop()) {
                          platform.closeSettingsWindow();
                        }
                      }
                    }}
                    title={`View ${ext.name} README`}
                    className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] cursor-pointer"
                  >
                    <BookOpen01Icon size={14} />
                  </button>
                )}
                {isEnabled && settingsTab && (
                  <button
                    onClick={() => onNavigateTab(settingsTab.id)}
                    title={`${ext.name} options`}
                    className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] cursor-pointer"
                  >
                    <Settings02Icon size={15} />
                  </button>
                )}
                <ToggleSwitch
                  checked={isEnabled}
                  onChange={() => handleToggleExtension(ext.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
