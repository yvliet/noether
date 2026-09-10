import React from 'react';
import { useGraphSettings, DEFAULT_GRAPH_SETTINGS, GraphColorMode } from './graphSettings';
import { useToast } from 'flint';
import { RotateCcwIcon } from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { CustomSelect } from '@/components/common/CustomSelect';

const SPEED_PRESETS = [
  { label: 'Fast (40ms)', value: 40 },
  { label: 'Normal (120ms)', value: 120 },
  { label: 'Slow (300ms)', value: 300 },
  { label: 'Relaxed (600ms)', value: 600 },
];

export const GraphSettingsTab: React.FC = () => {
  const {
    timelapseSpeed,
    setTimelapseSpeed,
    timelapseFocusCamera,
    setTimelapseFocusCamera,
    timelapseNodePopScale,
    setTimelapseNodePopScale,
    nodeRepulsion,
    setNodeRepulsion,
    linkDistance,
    setLinkDistance,
    linkStrength,
    setLinkStrength,
    centerGravity,
    setCenterGravity,
    nodeSize,
    setNodeSize,
    linkThickness,
    setLinkThickness,
    showLabels,
    setShowLabels,
    showArrows,
    setShowArrows,
    showOrphans,
    setShowOrphans,
    showTags,
    setShowTags,
    colorMode,
    setColorMode,
    restoreDefaults,
  } = useGraphSettings();

  const showToast = useToast();

  const isModified =
    timelapseSpeed !== DEFAULT_GRAPH_SETTINGS.timelapseSpeed ||
    timelapseFocusCamera !== DEFAULT_GRAPH_SETTINGS.timelapseFocusCamera ||
    timelapseNodePopScale !== DEFAULT_GRAPH_SETTINGS.timelapseNodePopScale ||
    nodeRepulsion !== DEFAULT_GRAPH_SETTINGS.nodeRepulsion ||
    linkDistance !== DEFAULT_GRAPH_SETTINGS.linkDistance ||
    linkStrength !== DEFAULT_GRAPH_SETTINGS.linkStrength ||
    centerGravity !== DEFAULT_GRAPH_SETTINGS.centerGravity ||
    nodeSize !== DEFAULT_GRAPH_SETTINGS.nodeSize ||
    linkThickness !== DEFAULT_GRAPH_SETTINGS.linkThickness ||
    showLabels !== DEFAULT_GRAPH_SETTINGS.showLabels ||
    showArrows !== DEFAULT_GRAPH_SETTINGS.showArrows ||
    showOrphans !== DEFAULT_GRAPH_SETTINGS.showOrphans ||
    showTags !== DEFAULT_GRAPH_SETTINGS.showTags ||
    colorMode !== DEFAULT_GRAPH_SETTINGS.colorMode;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Graph view</h3>
          <p className="text-[11px] text-[#777]">Customize time-lapse animations, physics forces, and visual rendering.</p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Graph view defaults', 'info');
            }}
            className="flint-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      {/* SECTION 1: ANIMATION & CAMERA (Directly below Graph view header) */}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Focus Camera (For both Time-lapse and Float) */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Focus camera</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically smoothly tracks and centers the viewport during time-lapse playback and float animation.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {timelapseFocusCamera !== DEFAULT_GRAPH_SETTINGS.timelapseFocusCamera && (
              <button
                type="button"
                onClick={() => setTimelapseFocusCamera(DEFAULT_GRAPH_SETTINGS.timelapseFocusCamera)}
                title="Restore default (Off)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch
              checked={timelapseFocusCamera}
              onChange={setTimelapseFocusCamera}
            />
          </div>
        </div>

        {/* Node appearance rate */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Node appearance rate</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              How fast each node appears during time-lapse playback.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {timelapseSpeed !== DEFAULT_GRAPH_SETTINGS.timelapseSpeed && (
              <button
                type="button"
                onClick={() => setTimelapseSpeed(DEFAULT_GRAPH_SETTINGS.timelapseSpeed)}
                title="Restore default speed (120ms)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <CustomSelect<number>
              value={timelapseSpeed}
              onChange={setTimelapseSpeed}
              options={[
                ...SPEED_PRESETS.map((preset) => ({
                  value: preset.value,
                  label: preset.label,
                })),
                ...(!SPEED_PRESETS.some((preset) => preset.value === timelapseSpeed)
                  ? [{ value: timelapseSpeed, label: `Custom (${timelapseSpeed}ms)` }]
                  : []),
              ]}
            />
          </div>
        </div>

        {/* Node Pop Scale */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Node pop animation scale</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Size multiplier for the pop effect when nodes materialize ({timelapseNodePopScale.toFixed(1)}x).
            </span>
          </div>
          <div className="flex items-center gap-2">
            {timelapseNodePopScale !== DEFAULT_GRAPH_SETTINGS.timelapseNodePopScale && (
              <button
                type="button"
                onClick={() => setTimelapseNodePopScale(DEFAULT_GRAPH_SETTINGS.timelapseNodePopScale)}
                title="Restore default (1.6x)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <input
              type="number"
              min={1.0}
              max={3.0}
              step={0.1}
              value={timelapseNodePopScale}
              onChange={(e) => setTimelapseNodePopScale(parseFloat(e.target.value) || 1.0)}
              className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors text-right"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: FORCES & PHYSICS */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Forces and physics</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {/* Node Repulsion Force */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Node repulsion force</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Controls how strongly nodes repel each other (higher = more spaced out).
              </span>
            </div>
            <div className="flex items-center gap-2">
              {nodeRepulsion !== DEFAULT_GRAPH_SETTINGS.nodeRepulsion && (
                <button
                  type="button"
                  onClick={() => setNodeRepulsion(DEFAULT_GRAPH_SETTINGS.nodeRepulsion)}
                  title="Restore default repulsion (150)"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <input
                type="number"
                min={20}
                max={600}
                step={10}
                value={nodeRepulsion}
                onChange={(e) => setNodeRepulsion(parseInt(e.target.value) || 20)}
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors text-right"
              />
            </div>
          </div>

          {/* Link Distance */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Link distance</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Ideal spring length between interconnected notes.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {linkDistance !== DEFAULT_GRAPH_SETTINGS.linkDistance && (
                <button
                  type="button"
                  onClick={() => setLinkDistance(DEFAULT_GRAPH_SETTINGS.linkDistance)}
                  title="Restore default link distance (100)"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <input
                type="number"
                min={20}
                max={400}
                step={10}
                value={linkDistance}
                onChange={(e) => setLinkDistance(parseInt(e.target.value) || 20)}
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors text-right"
              />
            </div>
          </div>

          {/* Link Strength */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Link spring strength</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Tension pulling linked nodes together ({linkStrength.toFixed(1)}x).
              </span>
            </div>
            <div className="flex items-center gap-2">
              {linkStrength !== DEFAULT_GRAPH_SETTINGS.linkStrength && (
                <button
                  type="button"
                  onClick={() => setLinkStrength(DEFAULT_GRAPH_SETTINGS.linkStrength)}
                  title="Restore default (1.0x)"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <input
                type="number"
                min={0.1}
                max={3.0}
                step={0.1}
                value={linkStrength}
                onChange={(e) => setLinkStrength(parseFloat(e.target.value) || 0.1)}
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors text-right"
              />
            </div>
          </div>

          {/* Center Gravity */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Center gravity pull</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Gravitational pull keeping floating clusters centered in the canvas.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {centerGravity !== DEFAULT_GRAPH_SETTINGS.centerGravity && (
                <button
                  type="button"
                  onClick={() => setCenterGravity(DEFAULT_GRAPH_SETTINGS.centerGravity)}
                  title="Restore default (0.05)"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <input
                type="number"
                min={0.005}
                max={0.3}
                step={0.01}
                value={centerGravity}
                onChange={(e) => setCenterGravity(parseFloat(e.target.value) || 0.01)}
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors text-right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: DISPLAY & FILTERS */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Display and filters</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {/* Node Size */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Node size scale</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Base radius scale for graph node circles ({nodeSize.toFixed(1)}x).
              </span>
            </div>
            <div className="flex items-center gap-2">
              {nodeSize !== DEFAULT_GRAPH_SETTINGS.nodeSize && (
                <button
                  type="button"
                  onClick={() => setNodeSize(DEFAULT_GRAPH_SETTINGS.nodeSize)}
                  title="Restore default (1.0x)"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <input
                type="number"
                min={0.5}
                max={3.0}
                step={0.1}
                value={nodeSize}
                onChange={(e) => setNodeSize(parseFloat(e.target.value) || 0.5)}
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors text-right"
              />
            </div>
          </div>

          {/* Link Thickness */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Link line thickness</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Width multiplier for connection lines ({linkThickness.toFixed(1)}x).
              </span>
            </div>
            <div className="flex items-center gap-2">
              {linkThickness !== DEFAULT_GRAPH_SETTINGS.linkThickness && (
                <button
                  type="button"
                  onClick={() => setLinkThickness(DEFAULT_GRAPH_SETTINGS.linkThickness)}
                  title="Restore default (1.0x)"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <input
                type="number"
                min={0.5}
                max={3.0}
                step={0.1}
                value={linkThickness}
                onChange={(e) => setLinkThickness(parseFloat(e.target.value) || 0.5)}
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors text-right"
              />
            </div>
          </div>

          {/* Show Labels */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Show node title labels</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Display note titles beneath graph nodes.
              </span>
            </div>
            <ToggleSwitch
              checked={showLabels}
              onChange={setShowLabels}
            />
          </div>

          {/* Show Arrows */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Show directional link arrows</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Render arrowheads indicating the direction of wiki links.
              </span>
            </div>
            <ToggleSwitch
              checked={showArrows}
              onChange={setShowArrows}
            />
          </div>

          {/* Show Orphan Nodes */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Show orphan / unconnected notes</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Include notes in the graph that do not currently have any links.
              </span>
            </div>
            <ToggleSwitch
              checked={showOrphans}
              onChange={setShowOrphans}
            />
          </div>

          {/* Show Tags */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Show #tag nodes</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Render tags as virtual nodes connecting tagged notes.
              </span>
            </div>
            <ToggleSwitch
              checked={showTags}
              onChange={setShowTags}
            />
          </div>

          {/* Color Mode */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Node color scheme</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Color notes by their folder hierarchy, tags, or theme accent.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {colorMode !== DEFAULT_GRAPH_SETTINGS.colorMode && (
                <button
                  type="button"
                  onClick={() => setColorMode(DEFAULT_GRAPH_SETTINGS.colorMode)}
                  title="Restore default color scheme"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <CustomSelect<GraphColorMode>
                value={colorMode}
                onChange={setColorMode}
                options={[
                  { value: 'default', label: 'Default' },
                  { value: 'folder', label: 'Folder hierarchy' },
                  { value: 'tag', label: 'First tag' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
