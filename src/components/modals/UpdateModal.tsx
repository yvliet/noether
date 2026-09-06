/**
 * @module UpdateModal
 * @description
 * Modal dialog presenting newly discovered Flint application updates from GitHub releases.
 * Allows users to inspect changelogs, download compiled installer packages (.exe, .msi),
 * or navigate to the GitHub release page.
 */

import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { APP_VERSION } from '@/version';
import {
  Cancel01Icon,
  Download01Icon,
  ExternalLinkIcon,
  CheckmarkCircle02Icon,
} from '@/components/common/Icons';
import {
  type AppRelease,
  downloadAndInstallRelease,
  openReleaseChangelog,
} from '@/lib/updater/updateChecker';

export const UpdateModal: React.FC = React.memo(() => {
  const isUpdateModalOpen = useWorkspaceStore((s) => s.isUpdateModalOpen);
  const setIsUpdateModalOpen = useWorkspaceStore((s) => s.setIsUpdateModalOpen);
  const release = useWorkspaceStore((s) => s.availableUpdateRelease) as AppRelease | null;
  const showToast = useWorkspaceStore((s) => s.showToast);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!isUpdateModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUpdateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUpdateModalOpen, setIsUpdateModalOpen]);

  if (!isUpdateModalOpen || !release) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      showToast(`Opening installer for Flint v${release.version}...`, 'info');
      await downloadAndInstallRelease(release);
    } catch (err: any) {
      showToast(`Could not open installer: ${err?.message || err}`, 'warning');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenChangelog = async () => {
    await openReleaseChangelog(release);
  };

  return (
    <div
      onClick={() => setIsUpdateModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 select-none"
    >
      <div
        data-card="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#1e1e1e] border border-[#2e2e2e] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[580px]"
      >
        {/* Floating Close Button */}
        <button
          type="button"
          onClick={() => setIsUpdateModalOpen(false)}
          className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-lg text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer"
          title="Close dialog"
        >
          <Cancel01Icon size={16} />
        </button>

        {/* Modal Body */}
        <div className="p-5 pt-8 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          {/* Version Highlights Card */}
          <div className="p-4 rounded-xl bg-[#252525] border border-[#333] flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-base font-bold text-white tracking-tight">
                Flint v{release.version}
              </span>
              <span className="text-[11px] text-[#888]">
                Current: v{APP_VERSION} → Newest: v{release.version}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--flint-accent,#ea580c)] text-[11px] font-semibold">
              <CheckmarkCircle02Icon size={13} />
              <span>Ready to Install</span>
            </div>
          </div>

          {/* Release Title */}
          {release.title && release.title !== release.tagName && (
            <div className="text-xs font-semibold text-[#e0e0e0] px-4">
              {release.title}
            </div>
          )}

          {/* Release Notes / Changelog */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-[#aaa] uppercase tracking-wider px-4">
              Release Notes
            </span>
            <div className="p-3.5 rounded-lg bg-[#181818] border border-[#282828] text-[#ccc] leading-relaxed max-h-56 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap select-text">
              {release.notes || 'No release notes provided for this release.'}
            </div>
          </div>

          {/* Installer Details */}
          {release.windowsSetupAsset && (
            <div className="text-[11px] text-[#777] flex items-center gap-1.5 px-4">
              <span>Package:</span>
              <span className="font-mono text-[#aaa]">{release.windowsSetupAsset.name}</span>
              <span>•</span>
              <span>{(release.windowsSetupAsset.size / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-[#282828] bg-[#181818] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleOpenChangelog}
            className="text-xs text-[#38bdf8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View on GitHub</span>
            <ExternalLinkIcon size={12} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(false)}
              className="flint-btn text-xs py-1.5 px-3 cursor-pointer"
            >
              Later
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flint-btn flint-btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download01Icon size={14} className={isDownloading ? 'animate-bounce' : ''} />
              <span>{isDownloading ? 'Opening...' : 'Download Update'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
