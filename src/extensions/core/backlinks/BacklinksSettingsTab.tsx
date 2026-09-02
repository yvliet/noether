import React from 'react';
import { useBacklinksSettings, DEFAULT_BACKLINKS_SETTINGS } from './backlinksSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';

export const BacklinksSettingsTab: React.FC = () => {
  const {
    showBacklinksInDoc,
    setShowBacklinksInDoc,
    showBacklinksSearch,
    setShowBacklinksSearch,
    collapseBacklinksByDefault,
    setCollapseBacklinksByDefault,
    includeUnlinkedMentions,
    setIncludeUnlinkedMentions,
    restoreDefaults,
  } = useBacklinksSettings();

  const { showToast } = useWorkspaceStore();

  const isModified =
    showBacklinksInDoc !== DEFAULT_BACKLINKS_SETTINGS.showBacklinksInDoc ||
    showBacklinksSearch !== DEFAULT_BACKLINKS_SETTINGS.showBacklinksSearch ||
    collapseBacklinksByDefault !== DEFAULT_BACKLINKS_SETTINGS.collapseBacklinksByDefault ||
    includeUnlinkedMentions !== DEFAULT_BACKLINKS_SETTINGS.includeUnlinkedMentions;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Backlinks</h3>
          <p className="text-[11px] text-[#777]">
            Configure how linked and unlinked mentions are displayed in notes and sidebars.
          </p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Backlinks defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Backlinks in document */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Backlink in document</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display backlinks automatically at the bottom of notes.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showBacklinksInDoc !== DEFAULT_BACKLINKS_SETTINGS.showBacklinksInDoc && (
              <button
                type="button"
                onClick={() => setShowBacklinksInDoc(DEFAULT_BACKLINKS_SETTINGS.showBacklinksInDoc)}
                title="Restore default (Disabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={showBacklinksInDoc} onChange={setShowBacklinksInDoc} />
          </div>
        </div>

        {/* Collapse by default */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Collapse backlinks by default</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Start document backlinks section in a collapsed state.
            </span>
          </div>
          <ToggleSwitch checked={collapseBacklinksByDefault} onChange={setCollapseBacklinksByDefault} />
        </div>

        {/* Show search filter */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show search filter</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Show a search filter inside the backlinks sidebar panel.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showBacklinksSearch !== DEFAULT_BACKLINKS_SETTINGS.showBacklinksSearch && (
              <button
                type="button"
                onClick={() => setShowBacklinksSearch(DEFAULT_BACKLINKS_SETTINGS.showBacklinksSearch)}
                title="Restore default (Disabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={showBacklinksSearch} onChange={setShowBacklinksSearch} />
          </div>
        </div>

        {/* Unlinked Mentions */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Search unlinked mentions</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Scan documents for text occurrences matching the note title without explicit links.
            </span>
          </div>
          <ToggleSwitch checked={includeUnlinkedMentions} onChange={setIncludeUnlinkedMentions} />
        </div>
      </div>
    </div>
  );
};
