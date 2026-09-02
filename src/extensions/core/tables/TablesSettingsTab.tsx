import React from 'react';
import { useTablesSettings, DEFAULT_TABLES_SETTINGS } from './tablesSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';

export const TablesSettingsTab: React.FC = () => {
  const {
    defaultRows,
    defaultCols,
    enableColumnResizing,
    setDefaultRows,
    setDefaultCols,
    setEnableColumnResizing,
    restoreDefaults,
  } = useTablesSettings();

  const showToast = useWorkspaceStore((s) => s.showToast);

  const isModified =
    defaultRows !== DEFAULT_TABLES_SETTINGS.defaultRows ||
    defaultCols !== DEFAULT_TABLES_SETTINGS.defaultCols ||
    enableColumnResizing !== DEFAULT_TABLES_SETTINGS.enableColumnResizing;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Table Blocks</h3>
          <p className="text-[11px] text-[#777]">
            Configure interactive tables, default quick grid dimensions, and column resizing.
          </p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Table defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Column Resizing */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Interactive column resizing</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Allow dragging table borders horizontally to customize individual column widths.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {enableColumnResizing !== DEFAULT_TABLES_SETTINGS.enableColumnResizing && (
              <button
                type="button"
                onClick={() => setEnableColumnResizing(DEFAULT_TABLES_SETTINGS.enableColumnResizing)}
                title="Restore default (Enabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={enableColumnResizing} onChange={setEnableColumnResizing} />
          </div>
        </div>

        {/* Default Columns */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Default quick table columns</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Number of columns when inserting via command palette shortcut.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {defaultCols !== DEFAULT_TABLES_SETTINGS.defaultCols && (
              <button
                type="button"
                onClick={() => setDefaultCols(DEFAULT_TABLES_SETTINGS.defaultCols)}
                title="Restore default (3)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <input
              type="number"
              min={1}
              max={20}
              value={defaultCols}
              onChange={(e) => setDefaultCols(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="w-16 bg-[#161616] border border-[#2c2c2c] focus:border-[#444] rounded-lg px-2.5 py-1 text-xs text-white text-center outline-none"
            />
          </div>
        </div>

        {/* Default Rows */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Default quick table rows</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Number of rows when inserting via command palette shortcut.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {defaultRows !== DEFAULT_TABLES_SETTINGS.defaultRows && (
              <button
                type="button"
                onClick={() => setDefaultRows(DEFAULT_TABLES_SETTINGS.defaultRows)}
                title="Restore default (3)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <input
              type="number"
              min={1}
              max={50}
              value={defaultRows}
              onChange={(e) => setDefaultRows(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-16 bg-[#161616] border border-[#2c2c2c] focus:border-[#444] rounded-lg px-2.5 py-1 text-xs text-white text-center outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
