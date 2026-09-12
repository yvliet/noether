import React from 'react';
import {
  useGraphSettings,
  DEFAULT_GRAPH_SETTINGS,
  GraphColorMode,
  GraphNodeType,
  GRAPH_PALETTES,
} from './graphSettings';
import { useToast } from 'noether';
import { RotateCcwIcon } from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { CustomSelect } from '@/components/common/CustomSelect';
import { ColorPicker } from '@/components/common/ColorPicker';

const SPEED_PRESETS = [
  { label: 'Fast (40ms)', value: 40 },
  { label: 'Normal (120ms)', value: 120 },
  { label: 'Slow (300ms)', value: 300 },
  { label: 'Relaxed (600ms)', value: 600 },
];

const NODE_TYPE_DEFINITIONS: Array<{
  type: GraphNodeType;
  label: string;
  description: string;
}> = [
  { type: 'note', label: 'Notes', description: '.md, .txt' },
  { type: 'canvas', label: 'Canvases', description: '.canvas' },
  { type: 'image', label: 'Images', description: '.png, .jpg, .svg, .webp' },
  { type: 'media', label: 'Media', description: '.mp3, .mp4, audio & video' },
  { type: 'document', label: 'Documents', description: '.pdf, .docx, .epub' },
  { type: 'tag', label: 'Tags', description: '#tag virtual nodes' },
  { type: 'other', label: 'Other', description: 'Uncategorized files' },
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
    enableNodeColors,
    setEnableNodeColors,
    colorMode,
    setColorMode,
    paletteId,
    setPaletteId,
    customTypeColors,
    setCustomTypeColor,
    resetCustomTypeColors,
    restoreDefaults,
  } = useGraphSettings();

  const [pressingPaletteId, setPressingPaletteId] = React.useState<string | null>(null);
  const pressingPaletteIdRef = React.useRef<string | null>(null);
  pressingPaletteIdRef.current = pressingPaletteId;

  React.useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      const currentPressed = pressingPaletteIdRef.current;
      if (!currentPressed) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const btn = el?.closest('[data-palette-button]');
      const releasedId = btn?.getAttribute('data-palette-button');

      if (releasedId === currentPressed) {
        setPaletteId(currentPressed);
      }
      setPressingPaletteId(null);
    };

    const handleGlobalPointerCancel = () => {
      setPressingPaletteId(null);
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerCancel);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerCancel);
    };
  }, [setPaletteId]);

  const showToast = useToast();

  const isAnyCustomColor = Object.values(customTypeColors).some((v) => v !== null);

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
    enableNodeColors !== DEFAULT_GRAPH_SETTINGS.enableNodeColors ||
    colorMode !== DEFAULT_GRAPH_SETTINGS.colorMode ||
    paletteId !== DEFAULT_GRAPH_SETTINGS.paletteId ||
    isAnyCustomColor;

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
            className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
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
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0"
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
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0"
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
              className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] text-right"
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
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0"
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
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] text-right"
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
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0"
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
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] text-right"
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
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0"
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
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] text-right"
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
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0"
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
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] text-right"
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
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0"
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
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] text-right"
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
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0"
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
                className="w-24 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] text-right"
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

        </div>
      </div>

      {/* SECTION 4: COLORING */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Coloring</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {/* Master Toggle: Color graph nodes */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Color graph nodes</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Enable custom color schemes and palette tints across nodes.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {enableNodeColors !== DEFAULT_GRAPH_SETTINGS.enableNodeColors && (
                <button
                  type="button"
                  onClick={() => setEnableNodeColors(DEFAULT_GRAPH_SETTINGS.enableNodeColors)}
                  title="Restore default (Off)"
                  className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <RotateCcwIcon size={13} />
                </button>
              )}
              <ToggleSwitch
                checked={enableNodeColors}
                onChange={setEnableNodeColors}
              />
            </div>
          </div>

          {/* Dependent Controls (Grayed out and unclickable when enableNodeColors is false) */}
          <div className={`divide-y divide-[#282828] ${!enableNodeColors ? 'opacity-40 select-none pointer-events-none' : ''}`}>
            {/* Color Mode Selector */}
            <div className="flex items-center justify-between p-4">
              <div className="flex flex-col pr-4">
                <span className="text-[13px] font-normal text-[#dcddde]">Node color scheme</span>
                <span className="text-[11px] text-[#777] mt-0.5">
                  Color graph nodes by file category, folder hierarchy, primary tags, or random distribution.
                </span>
              </div>
              <div className="flex items-center gap-2">
                {colorMode !== DEFAULT_GRAPH_SETTINGS.colorMode && (
                  <button
                    type="button"
                    onClick={() => setColorMode(DEFAULT_GRAPH_SETTINGS.colorMode)}
                    title="Restore default (Random)"
                    className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
                  >
                    <RotateCcwIcon size={13} />
                  </button>
                )}
                <CustomSelect<GraphColorMode>
                  value={colorMode}
                  onChange={setColorMode}
                  options={[
                    { value: 'type', label: 'By File Type' },
                    { value: 'folder', label: 'By Folder Hierarchy' },
                    { value: 'tag', label: 'By First Tag' },
                    { value: 'random', label: 'Random' },
                  ]}
                />
              </div>
            </div>

            {/* Palette Gallery */}
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[13px] font-normal text-[#dcddde]">Aesthetic palette</span>
                  <span className="text-[11px] text-[#777] mt-0.5">
                    Harmonious single-word color schemes applied across file types, folders, tags, and random distribution.
                  </span>
                </div>
                {paletteId !== DEFAULT_GRAPH_SETTINGS.paletteId && (
                  <button
                    type="button"
                    onClick={() => setPaletteId(DEFAULT_GRAPH_SETTINGS.paletteId)}
                    title="Restore default palette (Amber)"
                    className="noether-btn text-xs py-1 px-2 flex items-center gap-1 text-[#888] hover:text-white"
                  >
                    <RotateCcwIcon size={12} />
                    <span>Reset palette</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {Object.values(GRAPH_PALETTES).map((pal) => {
                  const activeDownPaletteId = pressingPaletteId !== null ? pressingPaletteId : paletteId;
                  const isDown = activeDownPaletteId === pal.id;

                  return (
                    <button
                      key={pal.id}
                      type="button"
                      data-palette-button={pal.id}
                      onPointerDown={(e) => {
                        if (e.button === 0) {
                          setPressingPaletteId(pal.id);
                        }
                      }}
                      onClick={() => {
                        setPaletteId(pal.id);
                        setPressingPaletteId(null);
                      }}
                      className={`flex flex-col p-3 rounded-lg text-left cursor-pointer select-none outline-none ${
                        isDown
                          ? 'bg-[#242424] border border-black/35 shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.35)] translate-y-[1px]'
                          : 'bg-[#242424] hover:bg-[#282828] border border-black/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_4px_0_rgba(0,0,0,0.28)] translate-y-0'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-[13px] ${isDown ? 'font-semibold text-white' : 'font-medium text-[#dcddde]'}`}>
                          {pal.name}
                        </span>
                      </div>
                      <span className={`text-[10px] line-clamp-1 mb-2 ${isDown ? 'text-[#888]' : 'text-[#777]'}`}>
                        {pal.description}
                      </span>
                      {/* Swatch Strip */}
                      <div className="flex h-2 w-full rounded-full overflow-hidden gap-0.5 bg-[#141414] p-0.5 border border-white/5">
                        <span className="flex-1 h-full rounded-sm" style={{ backgroundColor: pal.colors.note }} />
                        <span className="flex-1 h-full rounded-sm" style={{ backgroundColor: pal.colors.canvas }} />
                        <span className="flex-1 h-full rounded-sm" style={{ backgroundColor: pal.colors.image }} />
                        <span className="flex-1 h-full rounded-sm" style={{ backgroundColor: pal.colors.media }} />
                        <span className="flex-1 h-full rounded-sm" style={{ backgroundColor: pal.colors.document }} />
                        <span className="flex-1 h-full rounded-sm" style={{ backgroundColor: pal.colors.tag }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Per-Type Color Customization (When in By File Type mode) */}
            {colorMode === 'type' && (
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-normal text-[#dcddde]">File type colors</span>
                    <span className="text-[11px] text-[#777] mt-0.5">
                      Click any color swatch to pick custom hues for each file category.
                    </span>
                  </div>
                  {isAnyCustomColor && (
                    <button
                      type="button"
                      onClick={resetCustomTypeColors}
                      title="Reset all colors to active palette"
                      className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5 text-[#888] hover:text-white"
                    >
                      <RotateCcwIcon size={12} />
                      <span>Reset all to palette</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {NODE_TYPE_DEFINITIONS.map(({ type, label, description }) => {
                    const activePalette = GRAPH_PALETTES[paletteId] || GRAPH_PALETTES.amber;
                    const paletteColor = activePalette.colors[type];
                    const customColor = customTypeColors[type];
                    const currentColor = customColor || paletteColor;
                    const isOverridden = customColor !== null && customColor !== undefined;

                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-[#181818] border border-[#2e2e2e]"
                      >
                        <div className="flex items-center gap-3">
                          {/* Noether Custom ColorPicker Popover */}
                          <ColorPicker
                            value={currentColor}
                            onChange={(hex) => setCustomTypeColor(type, hex)}
                            disabled={!enableNodeColors}
                            presets={activePalette.colors.sequential}
                            triggerClassName="w-6 h-6 rounded-md border border-white/20 shadow-sm cursor-pointer shrink-0 block hover:border-white/50 outline-none"
                          />
                          <div className="flex flex-col">
                            <span className="text-[12px] font-medium text-[#dcddde]">{label}</span>
                            <span className="text-[10px] text-[#666] font-mono">{description}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-[#888]">{currentColor.toUpperCase()}</span>
                          {isOverridden && (
                            <button
                              type="button"
                              onClick={() => setCustomTypeColor(type, null)}
                              title="Revert to palette default"
                              className="p-1 rounded text-[#777] hover:text-white hover:bg-[#252525] cursor-pointer"
                            >
                              <RotateCcwIcon size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
