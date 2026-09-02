import React from 'react';
import { usePropertiesSettings, DEFAULT_PROPERTIES_SETTINGS } from './propertiesSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CustomSelect } from '@/components/common/CustomSelect';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';

export const PropertiesSettingsTab: React.FC = () => {
  const {
    showInDocument,
    setShowInDocument,
    startFolded,
    setStartFolded,
    defaultPropertyType,
    setDefaultPropertyType,
    sortPropertiesAlphabetically,
    setSortPropertiesAlphabetically,
    hideEmptyProperties,
    setHideEmptyProperties,
    restoreDefaults,
  } = usePropertiesSettings();

  const { showToast } = useWorkspaceStore();

  const isModified =
    showInDocument !== DEFAULT_PROPERTIES_SETTINGS.showInDocument ||
    startFolded !== DEFAULT_PROPERTIES_SETTINGS.startFolded ||
    defaultPropertyType !== DEFAULT_PROPERTIES_SETTINGS.defaultPropertyType ||
    sortPropertiesAlphabetically !== DEFAULT_PROPERTIES_SETTINGS.sortPropertiesAlphabetically ||
    hideEmptyProperties !== DEFAULT_PROPERTIES_SETTINGS.hideEmptyProperties;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Properties</h3>
          <p className="text-[11px] text-[#777]">
            Configure how frontmatter and metadata properties are displayed, sorted, and styled in Flint.
          </p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored properties defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      {/* General Properties Options */}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Show properties in document */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show properties in document</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display frontmatter properties at the top of notes below the title.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showInDocument !== DEFAULT_PROPERTIES_SETTINGS.showInDocument && (
              <button
                type="button"
                onClick={() => setShowInDocument(DEFAULT_PROPERTIES_SETTINGS.showInDocument)}
                title="Restore default (Enabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch
              checked={showInDocument}
              onChange={setShowInDocument}
            />
          </div>
        </div>

        {/* Start folded */}
        <div
          className={`flex items-center justify-between p-4 transition-all duration-150 ${
            !showInDocument ? 'opacity-40 select-none' : ''
          }`}
        >
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Start folded</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically fold document properties when opening a note.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showInDocument && startFolded !== DEFAULT_PROPERTIES_SETTINGS.startFolded && (
              <button
                type="button"
                onClick={() => setStartFolded(DEFAULT_PROPERTIES_SETTINGS.startFolded)}
                title="Restore default (Disabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch
              checked={showInDocument ? startFolded : false}
              onChange={setStartFolded}
              disabled={!showInDocument}
            />
          </div>
        </div>

        {/* Default property type */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Default property type</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Initial data type selected when adding a new custom property.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {defaultPropertyType !== DEFAULT_PROPERTIES_SETTINGS.defaultPropertyType && (
              <button
                type="button"
                onClick={() => setDefaultPropertyType(DEFAULT_PROPERTIES_SETTINGS.defaultPropertyType)}
                title="Restore default (Text)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <CustomSelect
              value={defaultPropertyType}
              onChange={(val) => setDefaultPropertyType(val as any)}
              options={[
                { value: 'text', label: 'Text' },
                { value: 'number', label: 'Number' },
                { value: 'checkbox', label: 'Checkbox' },
                { value: 'tags', label: 'List of Tags' },
                { value: 'aliases', label: 'List of Aliases' },
              ]}
            />
          </div>
        </div>

        {/* Sort properties alphabetically */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Sort properties alphabetically</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Sort properties in alphabetical order in the properties panel.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {sortPropertiesAlphabetically !== DEFAULT_PROPERTIES_SETTINGS.sortPropertiesAlphabetically && (
              <button
                type="button"
                onClick={() => setSortPropertiesAlphabetically(DEFAULT_PROPERTIES_SETTINGS.sortPropertiesAlphabetically)}
                title="Restore default (Disabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch
              checked={sortPropertiesAlphabetically}
              onChange={setSortPropertiesAlphabetically}
            />
          </div>
        </div>

        {/* Hide empty properties */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Hide empty properties</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically hide properties with empty values when reading documents.
            </span>
          </div>
          <ToggleSwitch
            checked={hideEmptyProperties}
            onChange={setHideEmptyProperties}
          />
        </div>
      </div>
    </div>
  );
};
