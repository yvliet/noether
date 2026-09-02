import React from 'react';
import { useTagsSettings, DEFAULT_TAGS_SETTINGS, TagSortBy } from './tagsSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CustomSelect } from '@/components/common/CustomSelect';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';

export const TagsSettingsTab: React.FC = () => {
  const {
    showTagsCount,
    setShowTagsCount,
    sortTagsBy,
    setSortTagsBy,
    showHashPrefix,
    setShowHashPrefix,
    nestedTags,
    setNestedTags,
    restoreDefaults,
  } = useTagsSettings();

  const { showToast } = useWorkspaceStore();

  const isModified =
    showTagsCount !== DEFAULT_TAGS_SETTINGS.showTagsCount ||
    sortTagsBy !== DEFAULT_TAGS_SETTINGS.sortTagsBy ||
    showHashPrefix !== DEFAULT_TAGS_SETTINGS.showHashPrefix ||
    nestedTags !== DEFAULT_TAGS_SETTINGS.nestedTags;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Tags</h3>
          <p className="text-[11px] text-[#777]">Configure tag frequency counts, hierarchy, and sorting order.</p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Tags explorer defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Show tag count */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show tag count</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display the number of matching notes beside each tag badge.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showTagsCount !== DEFAULT_TAGS_SETTINGS.showTagsCount && (
              <button
                type="button"
                onClick={() => setShowTagsCount(DEFAULT_TAGS_SETTINGS.showTagsCount)}
                title="Restore default (Enabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={showTagsCount} onChange={setShowTagsCount} />
          </div>
        </div>

        {/* Sort tags */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Sort tags</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Sort tags in the sidebar by usage frequency or alphabetically.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {sortTagsBy !== DEFAULT_TAGS_SETTINGS.sortTagsBy && (
              <button
                type="button"
                onClick={() => setSortTagsBy(DEFAULT_TAGS_SETTINGS.sortTagsBy)}
                title="Restore default (Frequency)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <CustomSelect
              value={sortTagsBy}
              onChange={(val) => setSortTagsBy(val as TagSortBy)}
              options={[
                { value: 'frequency', label: 'Frequency (count)' },
                { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
              ]}
            />
          </div>
        </div>

        {/* Show # prefix */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show # symbol prefix</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Prepend a hash character before tag names in the explorer.
            </span>
          </div>
          <ToggleSwitch checked={showHashPrefix} onChange={setShowHashPrefix} />
        </div>

        {/* Enable nested tags */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Nested tags support</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Group slash-separated tags into expandable trees (e.g. #project/alpha).
            </span>
          </div>
          <ToggleSwitch checked={nestedTags} onChange={setNestedTags} />
        </div>
      </div>
    </div>
  );
};
