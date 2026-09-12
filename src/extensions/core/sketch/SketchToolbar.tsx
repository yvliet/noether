/**
 * @module SketchToolbar
 * @description
 * Floating icon-only HUD toolbar for Noether Sketch.
 * Houses pen, highlighter, eraser, color palette presets, stroke widths,
 * anchoring toggles, undo/redo, and keyboard shortcut listeners.
 * Adheres strictly to Noether's unbloated dark desktop aesthetic with instant response.
 */

import React, { useCallback, useEffect } from 'react';
import { useSketchStore } from './sketchStore';
import {
  Cursor02Icon,
  PaintBrush01Icon,
  EraserIcon,
  HighlighterIcon,
  TextIcon,
  FullscreenIcon,
  UndoIcon,
  RedoIcon,
  Delete02Icon,
  Cancel01Icon,
} from '@/components/common/Icons';

const COLOR_PRESETS = [
  { label: 'Noether Accent', value: '#3b82f6' },
  { label: 'Highlighter Yellow', value: '#eab308' },
  { label: 'Signal Red', value: '#ef4444' },
  { label: 'Emerald Green', value: '#22c55e' },
  { label: 'Violet Purple', value: '#a855f7' },
  { label: 'Clean White', value: '#f3f4f6' },
];

const WIDTH_PRESETS = [
  { label: 'Fine (2px)', value: 2, dotClass: 'w-1 h-1' },
  { label: 'Medium (4px)', value: 4, dotClass: 'w-2 h-2' },
  { label: 'Bold (8px)', value: 8, dotClass: 'w-2.5 h-2.5' },
];

export const SketchToolbar: React.FC = React.memo(() => {
  const isSketchingActive = useSketchStore((s) => s.isSketchingActive);
  const activeTool = useSketchStore((s) => s.activeTool);
  const activeColor = useSketchStore((s) => s.activeColor);
  const activeWidth = useSketchStore((s) => s.activeWidth);
  const activeAnchoring = useSketchStore((s) => s.activeAnchoring);
  const undoStack = useSketchStore((s) => s.undoStack);
  const redoStack = useSketchStore((s) => s.redoStack);
  const strokes = useSketchStore((s) => s.strokes);
  const selectedStrokeIds = useSketchStore((s) => s.selectedStrokeIds);

  const setTool = useSketchStore((s) => s.setTool);
  const setColor = useSketchStore((s) => s.setColor);
  const setWidth = useSketchStore((s) => s.setWidth);
  const setAnchoring = useSketchStore((s) => s.setAnchoring);
  const undo = useSketchStore((s) => s.undo);
  const redo = useSketchStore((s) => s.redo);
  const clearAllStrokes = useSketchStore((s) => s.clearAllStrokes);
  const deleteSelectedStrokes = useSketchStore((s) => s.deleteSelectedStrokes);
  const clearSelection = useSketchStore((s) => s.clearSelection);
  const setSketchingActive = useSketchStore((s) => s.setSketchingActive);

  const handleClose = useCallback(() => {
    setSketchingActive(false);
  }, [setSketchingActive]);

  // Intercept hotkeys in the capture phase while sketching is active
  useEffect(() => {
    if (!isSketchingActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (isMod) {
        // Undo: Ctrl+Z
        if ((e.key.toLowerCase() === 'z' || e.code === 'KeyZ') && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          undo();
          return;
        }

        // Redo: Ctrl+Y or Ctrl+Shift+Z
        if (
          (e.key.toLowerCase() === 'y' || e.code === 'KeyY') ||
          ((e.key.toLowerCase() === 'z' || e.code === 'KeyZ') && e.shiftKey)
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          redo();
          return;
        }
      }

      if (!isMod && !isInput) {
        // Tool switching shortcuts
        const key = e.key.toLowerCase();
        if (key === 'v') {
          e.preventDefault();
          setTool('select');
          return;
        }
        if (key === 'b' || key === 'p') {
          e.preventDefault();
          setTool('pen');
          return;
        }
        if (key === 'h') {
          e.preventDefault();
          setTool('highlighter');
          return;
        }
        if (key === 'e') {
          e.preventDefault();
          setTool('eraser');
          return;
        }

        // Delete selected strokes
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (useSketchStore.getState().selectedStrokeIds.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            deleteSelectedStrokes();
            return;
          }
        }
      }

      // Escape: deselect first, or close HUD if nothing selected
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (useSketchStore.getState().selectedStrokeIds.length > 0) {
          clearSelection();
        } else {
          setSketchingActive(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isSketchingActive, undo, redo, setTool, deleteSelectedStrokes, clearSelection, setSketchingActive]);

  if (!isSketchingActive) return null;

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-1 bg-[#181818] border border-[#2e2e2e] rounded-lg p-1 shadow-2xl select-none"
      style={{ touchAction: 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Tool Selectors (Icon-only) */}
      <div className="flex items-center gap-0.5 bg-[#141414] p-0.5 rounded border border-[#262626]">
        <button
          type="button"
          onClick={() => setTool('select')}
          title="Select & Move (V)"
          className={`p-1.5 rounded cursor-pointer ${
            activeTool === 'select'
              ? 'bg-[#282828] text-white'
              : 'text-[#888] hover:text-[#dcddde] hover:bg-[#202020]'
          }`}
        >
          <Cursor02Icon size={14} />
        </button>

        <button
          type="button"
          onClick={() => setTool('pen')}
          title="Pen (Draw, B)"
          className={`p-1.5 rounded cursor-pointer ${
            activeTool === 'pen'
              ? 'bg-[#282828] text-white'
              : 'text-[#888] hover:text-[#dcddde] hover:bg-[#202020]'
          }`}
        >
          <PaintBrush01Icon size={14} />
        </button>

        <button
          type="button"
          onClick={() => setTool('highlighter')}
          title="Highlighter (H)"
          className={`p-1.5 rounded cursor-pointer ${
            activeTool === 'highlighter'
              ? 'bg-[#282828] text-white'
              : 'text-[#888] hover:text-[#dcddde] hover:bg-[#202020]'
          }`}
        >
          <HighlighterIcon size={14} />
        </button>

        <button
          type="button"
          onClick={() => setTool('eraser')}
          title="Eraser (E: Click or drag to erase strokes)"
          className={`p-1.5 rounded cursor-pointer ${
            activeTool === 'eraser'
              ? 'bg-[#282828] text-white'
              : 'text-[#888] hover:text-[#dcddde] hover:bg-[#202020]'
          }`}
        >
          <EraserIcon size={14} />
        </button>
      </div>

      {/* Color Palette (Active when drawing with pen/highlighter) */}
      {activeTool !== 'eraser' && activeTool !== 'select' && (
        <>
          <div className="w-px h-4 bg-[#2e2e2e] mx-0.5" />
          <div className="flex items-center gap-1">
            {COLOR_PRESETS.map((p) => {
              const isSelected = activeColor.toLowerCase() === p.value.toLowerCase();
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setColor(p.value)}
                  title={p.label}
                  className={`w-4 h-4 rounded-full cursor-pointer flex items-center justify-center ${
                    isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-[#181818]' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: p.value }}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Stroke Width Selector (Visual dots) */}
      {activeTool !== 'eraser' && activeTool !== 'select' && (
        <>
          <div className="w-px h-4 bg-[#2e2e2e] mx-0.5" />
          <div className="flex items-center gap-0.5 bg-[#141414] p-0.5 rounded border border-[#262626]">
            {WIDTH_PRESETS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => setWidth(w.value)}
                title={w.label}
                className={`w-5 h-5 flex items-center justify-center rounded cursor-pointer ${
                  activeWidth === w.value
                    ? 'bg-[#282828] text-white'
                    : 'text-[#777] hover:text-[#ccc] hover:bg-[#202020]'
                }`}
              >
                <span className={`${w.dotClass} rounded-full bg-current`} />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="w-px h-4 bg-[#2e2e2e] mx-0.5" />

      {/* Anchoring Mode Switcher (Icon-only: TextIcon vs FullscreenIcon) */}
      <div className="flex items-center gap-0.5 bg-[#141414] p-0.5 rounded border border-[#262626]">
        <button
          type="button"
          onClick={() => setAnchoring('content')}
          title="Attached to note: Drawings scroll naturally with the text"
          className={`p-1.5 rounded cursor-pointer ${
            activeAnchoring === 'content'
              ? 'bg-[#282828] text-white'
              : 'text-[#777] hover:text-[#ccc]'
          }`}
        >
          <TextIcon size={14} />
        </button>
        <button
          type="button"
          onClick={() => setAnchoring('viewport')}
          title="Fixed to viewport: Drawings stay pinned on screen (HUD glass)"
          className={`p-1.5 rounded cursor-pointer ${
            activeAnchoring === 'viewport'
              ? 'bg-[#282828] text-white'
              : 'text-[#777] hover:text-[#ccc]'
          }`}
        >
          <FullscreenIcon size={14} />
        </button>
      </div>

      <div className="w-px h-4 bg-[#2e2e2e] mx-0.5" />

      {/* Undo / Redo */}
      <button
        type="button"
        onClick={undo}
        disabled={undoStack.length === 0}
        title="Undo stroke (Ctrl+Z)"
        className="p-1.5 rounded text-[#888] hover:text-[#dcddde] hover:bg-[#222] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
      >
        <UndoIcon size={14} />
      </button>

      <button
        type="button"
        onClick={redo}
        disabled={redoStack.length === 0}
        title="Redo stroke (Ctrl+Y)"
        className="p-1.5 rounded text-[#888] hover:text-[#dcddde] hover:bg-[#222] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
      >
        <RedoIcon size={14} />
      </button>

      {/* Delete Selected Strokes (When select tool has an active selection) */}
      {selectedStrokeIds.length > 0 && (
        <button
          type="button"
          onClick={deleteSelectedStrokes}
          title={`Delete selected ${selectedStrokeIds.length > 1 ? `${selectedStrokeIds.length} drawings` : 'drawing'} (Del / Backspace)`}
          className="p-1.5 rounded text-[#f87171] hover:text-white hover:bg-[#dc2626] cursor-pointer"
        >
          <Delete02Icon size={14} />
        </button>
      )}

      {/* Clear All Strokes (When nothing selected but document has drawings) */}
      {selectedStrokeIds.length === 0 && strokes.length > 0 && (
        <button
          type="button"
          onClick={clearAllStrokes}
          title="Clear all drawings on this note"
          className="p-1.5 rounded text-[#888] hover:text-[#f87171] hover:bg-[#222] cursor-pointer"
        >
          <Delete02Icon size={14} />
        </button>
      )}

      <div className="w-px h-4 bg-[#2e2e2e] mx-0.5" />

      {/* Done / Close HUD button (Icon-only) */}
      <button
        type="button"
        onClick={handleClose}
        title="Close toolbar (Drawings remain visible on note, Esc)"
        className="p-1.5 rounded text-[#888] hover:text-white hover:bg-[#282828] cursor-pointer"
      >
        <Cancel01Icon size={14} />
      </button>
    </div>
  );
});
