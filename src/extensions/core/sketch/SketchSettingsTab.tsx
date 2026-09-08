import React from 'react';
import { useSketchStore } from './sketchStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Delete02Icon } from '@/components/common/Icons';
import { CustomSelect } from '@/components/common/CustomSelect';
import { SketchToolType, SketchAnchoringMode } from './types';

const COLOR_OPTIONS = [
  { label: 'Flint Accent', value: '#3b82f6' },
  { label: 'Highlighter Yellow', value: '#eab308' },
  { label: 'Signal Red', value: '#ef4444' },
  { label: 'Emerald Green', value: '#22c55e' },
  { label: 'Violet Purple', value: '#a855f7' },
  { label: 'Clean White', value: '#f3f4f6' },
];

const WIDTH_OPTIONS = [
  { label: 'Fine (2px)', value: 2 },
  { label: 'Medium (4px)', value: 4 },
  { label: 'Bold (8px)', value: 8 },
];

export const SketchSettingsTab: React.FC = () => {
  const activeTool = useSketchStore((s) => s.activeTool);
  const activeColor = useSketchStore((s) => s.activeColor);
  const activeWidth = useSketchStore((s) => s.activeWidth);
  const activeAnchoring = useSketchStore((s) => s.activeAnchoring);
  const strokes = useSketchStore((s) => s.strokes);

  const setTool = useSketchStore((s) => s.setTool);
  const setColor = useSketchStore((s) => s.setColor);
  const setWidth = useSketchStore((s) => s.setWidth);
  const setAnchoring = useSketchStore((s) => s.setAnchoring);
  const clearAllStrokes = useSketchStore((s) => s.clearAllStrokes);

  const showToast = useWorkspaceStore((s) => s.showToast);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Sketch</h3>
          <p className="text-[11px] text-[#777]">
            Lightweight freehand vector drawing and markup overlay for notes and documents.
          </p>
        </div>
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Default Tool Selection */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Default drawing tool</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Initial tool selected when activating the sketch overlay.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CustomSelect<SketchToolType>
              value={activeTool}
              onChange={setTool}
              options={[
                { value: 'pen', label: 'Pen' },
                { value: 'highlighter', label: 'Highlighter' },
                { value: 'select', label: 'Select' },
              ]}
            />
          </div>
        </div>

        {/* Default Stroke Width */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Stroke width</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Vector stroke line thickness for pen and markup tools.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CustomSelect<number>
              value={activeWidth}
              onChange={setWidth}
              options={WIDTH_OPTIONS}
            />
          </div>
        </div>

        {/* Default Stroke Color */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Stroke color</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Default drawing and highlighter ink color palette.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {COLOR_OPTIONS.map((c) => {
              const isSelected = activeColor.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={`w-5 h-5 rounded-full cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'ring-2 ring-white ring-offset-1 ring-offset-[#202020]'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              );
            })}
          </div>
        </div>

        {/* Anchoring Mode */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Drawing anchoring mode</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Choose whether drawings scroll naturally with markdown text or pin to screen glass.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CustomSelect<SketchAnchoringMode>
              value={activeAnchoring}
              onChange={setAnchoring}
              options={[
                { value: 'content', label: 'Note Text Flow' },
                { value: 'viewport', label: 'Screen Viewport' },
              ]}
            />
          </div>
        </div>

        {/* Active Note Drawing Management */}
        {strokes.length > 0 && (
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Clear active note drawings</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Remove all {strokes.length} drawing stroke{strokes.length > 1 ? 's' : ''} on the currently open note.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                clearAllStrokes();
                showToast('Cleared drawings on active note', 'info');
              }}
              className="flint-btn text-xs py-1 px-3 flex items-center gap-1.5 text-[#f87171] hover:text-[#ef4444] hover:bg-[#2a2020]"
            >
              <Delete02Icon size={13} />
              <span>Clear Drawings</span>
            </button>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Reference Card */}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs font-medium text-white">Keyboard Shortcuts</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-[#181818] rounded-lg border border-[#262626]">
            <span className="text-[#888]">Toggle Sketch HUD</span>
            <kbd className="px-1.5 py-0.5 bg-[#252525] border border-[#333] rounded text-[11px] text-white font-mono">
              Ctrl+Shift+S
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 bg-[#181818] rounded-lg border border-[#262626]">
            <span className="text-[#888]">Select & Move Mode</span>
            <kbd className="px-1.5 py-0.5 bg-[#252525] border border-[#333] rounded text-[11px] text-white font-mono">
              V
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 bg-[#181818] rounded-lg border border-[#262626]">
            <span className="text-[#888]">Pen / Draw Tool</span>
            <kbd className="px-1.5 py-0.5 bg-[#252525] border border-[#333] rounded text-[11px] text-white font-mono">
              B / P
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 bg-[#181818] rounded-lg border border-[#262626]">
            <span className="text-[#888]">Highlighter Tool</span>
            <kbd className="px-1.5 py-0.5 bg-[#252525] border border-[#333] rounded text-[11px] text-white font-mono">
              H
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 bg-[#181818] rounded-lg border border-[#262626]">
            <span className="text-[#888]">Eraser Tool</span>
            <kbd className="px-1.5 py-0.5 bg-[#252525] border border-[#333] rounded text-[11px] text-white font-mono">
              E
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 bg-[#181818] rounded-lg border border-[#262626]">
            <span className="text-[#888]">Undo Stroke</span>
            <kbd className="px-1.5 py-0.5 bg-[#252525] border border-[#333] rounded text-[11px] text-white font-mono">
              Ctrl+Z
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 bg-[#181818] rounded-lg border border-[#262626]">
            <span className="text-[#888]">Redo Stroke</span>
            <kbd className="px-1.5 py-0.5 bg-[#252525] border border-[#333] rounded text-[11px] text-white font-mono">
              Ctrl+Y
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 bg-[#181818] rounded-lg border border-[#262626]">
            <span className="text-[#888]">Delete Selected</span>
            <kbd className="px-1.5 py-0.5 bg-[#252525] border border-[#333] rounded text-[11px] text-white font-mono">
              Del / Backspace
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
