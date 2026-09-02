import React from 'react';
import { useGraphSettings, DEFAULT_GRAPH_SETTINGS, GraphColorMode } from './graphSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { RotateCcwIcon } from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';

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

  const { showToast } = useWorkspaceStore();

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
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
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
        <div className="flex flex-col p-4 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Node appearance rate</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                How fast each node appears during time-lapse playback ({timelapseSpeed}ms per node).
              </span>
            </div>
            <div className="flex items-center gap-2">
              {timelapseSpeed !== DEFAULT_GRAPH_SETTINGS.timelapseSpeed && (
                <button
                  type="button"
                  onClick={() => setTimelapseSpeed(DEFAULT_GRAPH_SETTINGS.timelapseSpeed)}
                  title="Restore default speed (120ms)"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <input
                type="number"
                min={20}
                max={2000}
                step={10}
                value={timelapseSpeed}
                onChange={(e) => setTimelapseSpeed(Math.max(20, parseInt(e.target.value) || 20))}
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors text-right"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {SPEED_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setTimelapseSpeed(preset.value)}
                className={`px-2.5 py-1 text-[11px] rounded-[5px] border transition-all cursor-pointer ${
                  timelapseSpeed === preset.value
                    ? 'bg-[var(--flint-accent)] border-transparent text-white font-medium shadow-xs'
                    : 'bg-[#181818] border-[#333] text-[#888] hover:text-white hover:border-[#444]'
                }`}
              >
                {preset.label}
              </button>
            ))}
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
            <div className="flex items-center gap-1.5">
              {(['default', 'folder', 'tag'] as GraphColorMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setColorMode(mode)}
                  className={`px-3 py-1 text-xs capitalize rounded-[5px] border transition-all cursor-pointer ${
                    colorMode === mode
                      ? 'bg-[var(--flint-accent)] border-transparent text-white font-medium shadow-xs'
                      : 'bg-[#181818] border-[#333] text-[#888] hover:text-white hover:border-[#444]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
