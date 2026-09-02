import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useFlintApp } from '@/core/app/AppContext';
import { platform } from '@/lib/platform/platformAdapter';
import { Store01Icon, FolderOpenIcon, RotateCcwIcon } from '@/components/common/Icons';

export const MarketplaceSettingsTab: React.FC = () => {
  const app = useFlintApp();
  const showToast = useWorkspaceStore((s) => s.showToast);

  const handleOpenMarketplace = () => {
    useWorkspaceStore.getState().openCustomTab({
      viewType: 'marketplace',
      title: 'Marketplace',
      icon: <Store01Icon size={14} />,
    });
    showToast('Opened Marketplace', 'info');
  };

  const handleOpenExtensionsFolder = () => {
    if (platform.isDesktop()) {
      platform.openExtensionsFolder();
    } else {
      showToast('Extensions folder: .flint/extensions/ inside Hearth', 'info');
    }
  };

  const handleReloadExtensions = async () => {
    await app.extensions.refreshCommunityExtensions();
    showToast('Reloaded extensions from disk', 'success');
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Community Extensions</h3>
          <p className="text-[11px] text-[#777]">Explore, install, and manage community extensions.</p>
        </div>
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Open Marketplace Action */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Browse Marketplace</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Discover and install extensions created by the community.
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenMarketplace}
            className="px-3.5 py-1.5 bg-[var(--flint-accent)] hover:bg-[var(--flint-accent-hover)] text-white rounded-[5px] transition-colors cursor-pointer text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Store01Icon size={13} />
            <span>Open Marketplace</span>
          </button>
        </div>

        {/* Reload Extensions Action */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Reload installed extensions</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Scan the `.flint/extensions/` directory and refresh all active extensions.
            </span>
          </div>
          <button
            type="button"
            onClick={handleReloadExtensions}
            className="px-3.5 py-1.5 bg-[#282828] hover:bg-[#333] active:bg-[#222] text-[#dcddde] hover:text-white rounded-[5px] border border-[#383838] hover:border-[#484848] transition-colors cursor-pointer text-xs font-medium flex items-center gap-1.5"
          >
            <RotateCcwIcon size={12} />
            <span>Reload from Disk</span>
          </button>
        </div>

        {/* Open Folder Action */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Extensions folder</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Open the local directory storing manual or installed extensions.
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenExtensionsFolder}
            className="px-3.5 py-1.5 bg-[#282828] hover:bg-[#333] active:bg-[#222] text-[#dcddde] hover:text-white rounded-[5px] border border-[#383838] hover:border-[#484848] transition-colors cursor-pointer text-xs font-medium flex items-center gap-1.5"
          >
            <FolderOpenIcon size={12} />
            <span>Open Folder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
