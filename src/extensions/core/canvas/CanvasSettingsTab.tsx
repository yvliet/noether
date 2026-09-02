import React from 'react';
import { useCanvasSettings, DEFAULT_CANVAS_SETTINGS } from './canvasSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';
import { ColorPicker } from '@/components/common/ColorPicker';

export const CanvasSettingsTab: React.FC = () => {
  const {
    canvasSnapGrid,
    setCanvasSnapGrid,
    gridSize,
    setGridSize,
    defaultNodeColor,
    setDefaultNodeColor,
    restoreDefaults,
  } = useCanvasSettings();

  const { showToast } = useWorkspaceStore();

  const isModified =
    canvasSnapGrid !== DEFAULT_CANVAS_SETTINGS.canvasSnapGrid ||
    gridSize !== DEFAULT_CANVAS_SETTINGS.gridSize ||
    defaultNodeColor !== DEFAULT_CANVAS_SETTINGS.defaultNodeColor;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Canvas</h3>
          <p className="text-[11px] text-[#777]">Configure infinite spatial board behavior and card defaults.</p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Canvas defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Snap to Grid */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Snap to grid</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Align cards and shapes to the spatial grid when dragging and moving.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canvasSnapGrid !== DEFAULT_CANVAS_SETTINGS.canvasSnapGrid && (
              <button
                type="button"
                onClick={() => setCanvasSnapGrid(DEFAULT_CANVAS_SETTINGS.canvasSnapGrid)}
                title="Restore default (Enabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={canvasSnapGrid} onChange={setCanvasSnapGrid} />
          </div>
        </div>

        {/* Grid Size */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Grid snap cell size</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Pixel dimension for spatial snap intervals.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[16, 20, 24, 32].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setGridSize(size)}
                className={`px-3 py-1 text-xs rounded-[5px] border transition-all cursor-pointer ${
                  gridSize === size
                    ? 'bg-[var(--flint-accent)] border-transparent text-white font-medium shadow-xs'
                    : 'bg-[#181818] border-[#333] text-[#888] hover:text-white hover:border-[#444]'
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        {/* Default Card Color */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Default card color</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Initial background color for new canvas cards.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {defaultNodeColor !== DEFAULT_CANVAS_SETTINGS.defaultNodeColor && (
              <button
                type="button"
                onClick={() => setDefaultNodeColor(DEFAULT_CANVAS_SETTINGS.defaultNodeColor)}
                title="Restore default card color"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ColorPicker value={defaultNodeColor} onChange={setDefaultNodeColor} />
          </div>
        </div>
      </div>
    </div>
  );
};
