import React from 'react';
import { useDefaultStatusBarSettings, DEFAULT_STATUS_BAR_SETTINGS } from './defaultStatusBarSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';

export const DefaultStatusBarSettingsTab: React.FC = () => {
  const {
    showWordCount,
    setShowWordCount,
    showCharCount,
    setShowCharCount,
    showReadingTime,
    setShowReadingTime,
    showDocumentType,
    setShowDocumentType,
    restoreDefaults,
  } = useDefaultStatusBarSettings();

  const { showToast } = useWorkspaceStore();

  const isModified =
    showWordCount !== DEFAULT_STATUS_BAR_SETTINGS.showWordCount ||
    showCharCount !== DEFAULT_STATUS_BAR_SETTINGS.showCharCount ||
    showReadingTime !== DEFAULT_STATUS_BAR_SETTINGS.showReadingTime ||
    showDocumentType !== DEFAULT_STATUS_BAR_SETTINGS.showDocumentType;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Status bar metrics</h3>
          <p className="text-[11px] text-[#777]">Configure status bar indicators, counts, and reading metrics.</p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored status bar metric defaults', 'info');
            }}
            className="flint-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Show word count */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show word count</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display total word count in the active document.
            </span>
          </div>
          <ToggleSwitch checked={showWordCount} onChange={setShowWordCount} />
        </div>

        {/* Show character count */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show character count</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display total character count in the active document.
            </span>
          </div>
          <ToggleSwitch checked={showCharCount} onChange={setShowCharCount} />
        </div>

        {/* Show reading time */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show estimated reading time</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Calculate estimated reading duration based on 200 words/min.
            </span>
          </div>
          <ToggleSwitch checked={showReadingTime} onChange={setShowReadingTime} />
        </div>

        {/* Show doc type */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show document type badge</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display Markdown / Canvas document type indicator.
            </span>
          </div>
          <ToggleSwitch checked={showDocumentType} onChange={setShowDocumentType} />
        </div>
      </div>
    </div>
  );
};
