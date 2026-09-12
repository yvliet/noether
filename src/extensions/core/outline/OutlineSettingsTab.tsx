import React from 'react';
import { useOutlineSettings, DEFAULT_OUTLINE_SETTINGS } from './outlineSettings';
import { useToast } from 'noether';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';
import { CustomSelect } from '@/components/common/CustomSelect';

export const OutlineSettingsTab: React.FC = () => {
  const {
    collapseOutlineByDefault,
    setCollapseOutlineByDefault,
    showHeadingNumbers,
    setShowHeadingNumbers,
    maxHeadingLevel,
    setMaxHeadingLevel,
    restoreDefaults,
  } = useOutlineSettings();

  const showToast = useToast();

  const isModified =
    collapseOutlineByDefault !== DEFAULT_OUTLINE_SETTINGS.collapseOutlineByDefault ||
    showHeadingNumbers !== DEFAULT_OUTLINE_SETTINGS.showHeadingNumbers ||
    maxHeadingLevel !== DEFAULT_OUTLINE_SETTINGS.maxHeadingLevel;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Outline</h3>
          <p className="text-[11px] text-[#777]">Configure table of contents heading hierarchy and display.</p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Outline defaults', 'info');
            }}
            className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Collapse by default */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Collapse outline by default</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Keep sub-headings collapsed when opening a document.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {collapseOutlineByDefault !== DEFAULT_OUTLINE_SETTINGS.collapseOutlineByDefault && (
              <button
                type="button"
                onClick={() => setCollapseOutlineByDefault(DEFAULT_OUTLINE_SETTINGS.collapseOutlineByDefault)}
                title="Restore default (Disabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={collapseOutlineByDefault} onChange={setCollapseOutlineByDefault} />
          </div>
        </div>

        {/* Show heading numbers */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show heading numbers</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display level tags (H1, H2, H3) next to outline entries.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showHeadingNumbers !== DEFAULT_OUTLINE_SETTINGS.showHeadingNumbers && (
              <button
                type="button"
                onClick={() => setShowHeadingNumbers(DEFAULT_OUTLINE_SETTINGS.showHeadingNumbers)}
                title="Restore default (Disabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={showHeadingNumbers} onChange={setShowHeadingNumbers} />
          </div>
        </div>

        {/* Max heading level */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Maximum heading level</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Only show headings up to this depth in the outline panel.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {maxHeadingLevel !== DEFAULT_OUTLINE_SETTINGS.maxHeadingLevel && (
              <button
                type="button"
                onClick={() => setMaxHeadingLevel(DEFAULT_OUTLINE_SETTINGS.maxHeadingLevel)}
                title="Restore default (H6)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <CustomSelect<number>
              value={maxHeadingLevel}
              onChange={setMaxHeadingLevel}
              options={[
                { value: 1, label: 'H1' },
                { value: 2, label: 'H2' },
                { value: 3, label: 'H3' },
                { value: 4, label: 'H4' },
                { value: 5, label: 'H5' },
                { value: 6, label: 'H6 (All levels)' },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
