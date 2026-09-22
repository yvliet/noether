import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import {
  Download01Icon,
  RotateCcwIcon,
  FolderOpenIcon,
  BookOpen01Icon,
  Settings02Icon,
  Delete02Icon,
  Store01Icon,
} from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useNoetherApp, useExtensionList, useSettingTabs } from '@/core/app/AppContext';
import { platform } from '@/lib/platform/platformAdapter';
import {
  SettingsSearchContext,
  highlightMatch,
  isTabMatch,
} from '@/components/settings/shared/SettingRow';

export interface CommunityExtensionsTabProps {
  onNavigateTab: (tabId: string) => void;
  onClose?: () => void;
}

export const CommunityExtensionsTab: React.FC<CommunityExtensionsTabProps> = React.memo(({ onNavigateTab, onClose }) => {
  const app = useNoetherApp();
  const extensionList = useExtensionList();
  const allSettingTabs = useSettingTabs();
  const showToast = useWorkspaceStore((s) => s.showToast);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);

  const communityExtensionTabs = useMemo(() => {
    return allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return !manifest || manifest.isCore !== true;
    });
  }, [allSettingTabs, app]);

  const filteredCommunity = useMemo(() => {
    if (!searchQuery.trim()) return extensionList.community;
    const q = searchQuery.toLowerCase().trim();
    return extensionList.community.filter((ext) => {
      return (
        ext.name.toLowerCase().includes(q) ||
        (ext.description && ext.description.toLowerCase().includes(q)) ||
        ext.id.toLowerCase().includes(q) ||
        (ext.author && ext.author.toLowerCase().includes(q)) ||
        'community extensions'.includes(q)
      );
    });
  }, [extensionList.community, searchQuery]);

  const handleToggleExtension = useCallback(async (extensionId: string) => {
    const isEnabled = app.extensions.isExtensionEnabled(extensionId);
    if (isEnabled) {
      await app.extensions.disableExtension(extensionId);
    } else {
      await app.extensions.enableExtension(extensionId);
    }
  }, [app]);

  const handleUninstallExtension = useCallback((ext: { id: string; name: string }) => {
    openConfirmDialog({
      title: 'Uninstall Extension',
      message: `Are you sure you want to uninstall "${ext.name}"?`,
      subtext: 'This will remove the extension files from disk, reset its settings, and drop its database tables.',
      confirmText: 'Uninstall',
      isDanger: true,
      onConfirm: async () => {
        const ok = await app.extensions.uninstallExtension(ext.id);
        if (ok) {
          showToast(`Uninstalled "${ext.name}"`, 'info');
        } else {
          showToast(`Failed to uninstall "${ext.name}"`, 'warning');
        }
      },
    });
  }, [app, openConfirmDialog, showToast]);

  const handleOpenExtensionsFolder = useCallback(() => {
    if (platform.isDesktop()) {
      platform.openExtensionsFolder();
    } else {
      showToast('Extensions folder: .noether/extensions/ inside vault', 'info');
    }
  }, [showToast]);

  const handleReloadExtensions = useCallback(async () => {
    await app.extensions.refreshCommunityExtensions();
    showToast('Reloaded extensions from disk', 'success');
  }, [app, showToast]);

  const [, setUpdaterTick] = useState(0);
  useEffect(() => {
    return app.extensions.updater.subscribe(() => {
      setUpdaterTick((t) => t + 1);
    });
  }, [app]);

  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const availableUpdates = app.extensions.updater.getAvailableUpdates();

  const handleCheckUpdates = useCallback(async () => {
    setIsCheckingUpdates(true);
    try {
      const updates = await app.extensions.updater.checkForUpdates();
      if (updates.length > 0) {
        showToast(`Found ${updates.length} extension update${updates.length > 1 ? 's' : ''}`, 'info');
      } else {
        showToast('All community extensions are up to date', 'success');
      }
    } catch (err) {
      console.error('[CommunityExtensionsTab] Failed to check for updates:', err);
      showToast('Failed to check for extension updates', 'warning');
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [app, showToast]);

  const handleUpdateAll = useCallback(async () => {
    await app.extensions.updater.updateAll();
  }, [app]);

  const handleUpdateExtension = useCallback(
    async (id: string) => {
      await app.extensions.updater.updateExtension(id);
    },
    [app]
  );

  if (showAllOccurrences && searchQuery.trim() && filteredCommunity.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-[var(--noether-text-primary)] mb-0.5">
            {highlightMatch('Community Extensions', searchQuery)}
          </h3>
          <p className="text-[11px] text-[var(--noether-text-muted)] leading-relaxed">
            {highlightMatch('Manage third-party extensions installed in your vault (.noether/extensions/).', searchQuery)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {availableUpdates.length > 0 && (
            <button
              onClick={handleUpdateAll}
              className="noether-btn noether-btn-primary flex items-center gap-1.5"
            >
              <Download01Icon size={12} />
              <span>Update all ({availableUpdates.length})</span>
            </button>
          )}
          <button
            onClick={handleCheckUpdates}
            disabled={isCheckingUpdates || app.extensions.updater.checking}
            className="noether-btn flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcwIcon
              size={12}
              className={isCheckingUpdates || app.extensions.updater.checking ? 'animate-spin' : ''}
            />
            <span>{isCheckingUpdates || app.extensions.updater.checking ? 'Checking...' : 'Check for updates'}</span>
          </button>
          <button
            onClick={handleReloadExtensions}
            className="noether-btn flex items-center gap-1.5"
          >
            <RotateCcwIcon size={12} />
            <span>Reload</span>
          </button>
          <button
            onClick={handleOpenExtensionsFolder}
            className="noether-btn flex items-center gap-1.5"
          >
            <FolderOpenIcon size={12} />
            <span>Open extensions folder</span>
          </button>
        </div>
      </div>

      {filteredCommunity.length > 0 ? (
        <div className="bg-[var(--noether-bg-card)] border border-[var(--noether-border-base)] rounded-xl overflow-hidden divide-y divide-[var(--noether-border-base)] mt-1">
          {filteredCommunity.map((ext) => {
            const isEnabled = app.extensions.isExtensionEnabled(ext.id);
            const communityTab = communityExtensionTabs.find((t) => isTabMatch(t, ext.id));
            const updateInfo = app.extensions.updater.getUpdate(ext.id);
            const isUpdating = app.extensions.updater.isUpdating(ext.id);
            return (
              <div
                key={ext.id}
                className="p-3.5 flex items-center justify-between hover:bg-[var(--noether-btn-hover-bg)]"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-normal text-[var(--noether-text-primary)]">
                      {highlightMatch(ext.name, searchQuery)}
                    </span>
                    <span className="text-[11px] text-[var(--noether-text-muted)] font-normal">v{ext.version}</span>
                    {ext.author && (
                      <span className="text-[10px] text-[var(--noether-text-muted)]">
                        by {highlightMatch(ext.author, searchQuery)}
                      </span>
                    )}
                  </div>
                  {ext.description && (
                    <p className="text-[11px] text-[var(--noether-text-muted)] mt-0.5 leading-relaxed">
                      {highlightMatch(ext.description, searchQuery)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {updateInfo && (
                    <button
                      type="button"
                      onClick={() => handleUpdateExtension(ext.id)}
                      disabled={isUpdating}
                      className="noether-btn noether-btn-primary text-[11px] !py-1 !px-2.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download01Icon size={12} className={isUpdating ? 'animate-bounce' : ''} />
                      <span>{isUpdating ? 'Updating...' : `Update to v${updateInfo.latestVersion}`}</span>
                    </button>
                  )}
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
                      className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-btn-hover-bg)] cursor-pointer"
                    >
                      <BookOpen01Icon size={14} />
                    </button>
                  )}
                  {isEnabled && communityTab && (
                    <button
                      onClick={() => onNavigateTab(communityTab.id)}
                      title={`${ext.name} options`}
                      className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-btn-hover-bg)] cursor-pointer"
                    >
                      <Settings02Icon size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUninstallExtension(ext)}
                    title={`Uninstall ${ext.name}`}
                    className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[var(--noether-text-muted)] hover:text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                  >
                    <Delete02Icon size={14} />
                  </button>
                  <ToggleSwitch
                    checked={isEnabled}
                    onChange={() => handleToggleExtension(ext.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 flex flex-col items-center justify-center select-none gap-2 text-[var(--noether-text-muted)] text-xs">
          <Store01Icon size={36} className="opacity-40 mb-1" />
          <span className="text-[13px] text-[var(--noether-text-primary)] font-normal">No community extensions installed</span>
          <p className="text-xs text-[var(--noether-text-muted)] max-w-sm leading-relaxed mb-2">
            Extend Noether with community extensions for enhanced workflows, visualizations, and integrations.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                useWorkspaceStore.getState().openCustomTab({
                  viewType: 'marketplace',
                  title: 'Community Extensions',
                  icon: <Store01Icon size={14} />,
                });
                useWorkspaceStore.getState().setIsSettingsOpen(false);
                if (platform.isDesktop()) {
                  platform.closeSettingsWindow();
                }
              }}
              className="noether-btn noether-btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Store01Icon size={13} />
              <span>Browse Extensions</span>
            </button>
            <button
              onClick={handleOpenExtensionsFolder}
              className="noether-btn text-xs flex items-center gap-1.5 cursor-pointer"
            >
              Open folder
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
