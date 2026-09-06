/**
 * @module SketchCanvasOverlay
 * @description
 * High-performance vector drawing overlay component for Flint Sketch.
 * Renders smooth SVG vector paths directly over note content or screen viewport.
 * Supports drawing (pen, highlighter), erasure, and Photoshop-style selection & translation
 * with dashed outlines, marquee highlight selection, and 8-point transform handles.
 * Captures pointer events when sketching is active; yields complete pass-through
 * (pointer-events: none) when inactive so text remains fully clickable and selectable.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { useSketchStore } from './sketchStore';
import { SketchAnchoringMode, SketchPoint, SketchBox } from './types';
import { computeMultiStrokeBoundingBox, isPointInBox, isStrokeIntersectedBy } from './sketchEngine';
import { SketchToolbar } from './SketchToolbar';
import type { PortalSlotContext } from '@/core/extensions/types';

interface SketchCanvasOverlayProps {
  anchoringMode: SketchAnchoringMode;
  context: PortalSlotContext;
}

export const SketchCanvasOverlay: React.FC<SketchCanvasOverlayProps> = React.memo(({
  anchoringMode,
}) => {
  const containerRef = useRef<SVGSVGElement>(null);
  const dragOpRef = useRef<{ mode: 'marquee' | 'move'; startPt: SketchPoint; isShift: boolean } | null>(null);

  const [marqueeBox, setMarqueeBox] = useState<SketchBox | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverState, setHoverState] = useState<'selection' | 'stroke' | 'canvas'>('canvas');

  const isSketchingActive = useSketchStore((s) => s.isSketchingActive);
  const activeAnchoring = useSketchStore((s) => s.activeAnchoring);
  const strokes = useSketchStore((s) => s.strokes);
  const currentLiveStroke = useSketchStore((s) => s.currentLiveStroke);
  const activeTool = useSketchStore((s) => s.activeTool);
  const selectedStrokeIds = useSketchStore((s) => s.selectedStrokeIds);

  const startStroke = useSketchStore((s) => s.startStroke);
  const appendPoint = useSketchStore((s) => s.appendPoint);
  const finishStroke = useSketchStore((s) => s.finishStroke);
  const cancelStroke = useSketchStore((s) => s.cancelStroke);
  const eraseAt = useSketchStore((s) => s.eraseAt);
  const setSelectedStrokeIds = useSketchStore((s) => s.setSelectedStrokeIds);
  const toggleStrokeSelection = useSketchStore((s) => s.toggleStrokeSelection);
  const clearSelection = useSketchStore((s) => s.clearSelection);
  const selectStrokesInBox = useSketchStore((s) => s.selectStrokesInBox);
  const moveSelectedStrokes = useSketchStore((s) => s.moveSelectedStrokes);

  // Filter strokes matching this overlay's anchoring mode
  const relevantStrokes = strokes.filter((s) => (s.anchoring || 'content') === anchoringMode);
  const isInteractive = isSketchingActive && activeAnchoring === anchoringMode;

  const selectedStrokes = useMemo(
    () => relevantStrokes.filter((s) => selectedStrokeIds.includes(s.id)),
    [relevantStrokes, selectedStrokeIds]
  );

  const unselectedStrokes = useMemo(
    () => relevantStrokes.filter((s) => !selectedStrokeIds.includes(s.id)),
    [relevantStrokes, selectedStrokeIds]
  );

  const selectionBox = useMemo(
    () => computeMultiStrokeBoundingBox(selectedStrokes),
    [selectedStrokes]
  );

  const getCoordinates = useCallback((e: React.PointerEvent<SVGSVGElement>): SketchPoint | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isInteractive || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const pt = getCoordinates(e);
    if (!pt) return;

    if (activeTool === 'select') {
      const isShift = e.shiftKey;

      // 1. Check if clicking inside current selection bounding box
      const hitInsideSelectionBox = selectionBox && isPointInBox(pt, selectionBox);

      // 2. Check if clicking directly on an already-selected stroke
      const hitSelectedStroke = selectedStrokes.some((s) =>
        isStrokeIntersectedBy(s, pt, Math.max(s.width / 2 + 6, 8))
      );

      if (hitInsideSelectionBox || hitSelectedStroke) {
        dragOpRef.current = { mode: 'move', startPt: pt, isShift };
        setDragOffset({ x: 0, y: 0 });
        return;
      }

      // 3. Check if clicking an unselected stroke
      const hitUnselected = [...relevantStrokes].reverse().find((s) =>
        !selectedStrokeIds.includes(s.id) && isStrokeIntersectedBy(s, pt, Math.max(s.width / 2 + 6, 8))
      );

      if (hitUnselected) {
        if (isShift) {
          toggleStrokeSelection(hitUnselected.id);
        } else {
          setSelectedStrokeIds([hitUnselected.id]);
        }
        dragOpRef.current = { mode: 'move', startPt: pt, isShift };
        setDragOffset({ x: 0, y: 0 });
        return;
      }

      // 4. Clicked on empty canvas -> Marquee highlight drag
      if (!isShift) {
        clearSelection();
      }
      dragOpRef.current = { mode: 'marquee', startPt: pt, isShift };
      setMarqueeBox({ minX: pt.x, minY: pt.y, maxX: pt.x, maxY: pt.y });
      return;
    }

    if (activeTool === 'eraser') {
      eraseAt(pt, 18);
    } else {
      startStroke(pt);
    }
  }, [
    isInteractive,
    activeTool,
    getCoordinates,
    selectionBox,
    selectedStrokes,
    relevantStrokes,
    selectedStrokeIds,
    toggleStrokeSelection,
    setSelectedStrokeIds,
    clearSelection,
    startStroke,
    eraseAt,
  ]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isInteractive) return;

    const pt = getCoordinates(e);
    if (!pt) return;

    if (activeTool === 'select') {
      const dragOp = dragOpRef.current;
      if (dragOp) {
        e.preventDefault();
        if (dragOp.mode === 'move') {
          setDragOffset({
            x: pt.x - dragOp.startPt.x,
            y: pt.y - dragOp.startPt.y,
          });
        } else if (dragOp.mode === 'marquee') {
          setMarqueeBox({
            minX: Math.min(dragOp.startPt.x, pt.x),
            minY: Math.min(dragOp.startPt.y, pt.y),
            maxX: Math.max(dragOp.startPt.x, pt.x),
            maxY: Math.max(dragOp.startPt.y, pt.y),
          });
        }
      } else {
        // Cursor hover detection
        if (selectionBox && isPointInBox(pt, selectionBox)) {
          setHoverState('selection');
        } else if (relevantStrokes.some((s) => isStrokeIntersectedBy(s, pt, Math.max(s.width / 2 + 6, 8)))) {
          setHoverState('stroke');
        } else {
          setHoverState('canvas');
        }
      }
      return;
    }

    if (activeTool === 'eraser') {
      if (e.buttons === 1) {
        eraseAt(pt, 18);
      }
      return;
    }

    if (currentLiveStroke) {
      e.preventDefault();
      // Handle coalesced pointer events for 120Hz/high-polling precision styluses & mice
      const coalescedEvents = (e.nativeEvent as any).getCoalescedEvents?.() as PointerEvent[] | undefined;
      if (coalescedEvents && coalescedEvents.length > 1 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        for (const ce of coalescedEvents) {
          appendPoint({
            x: ce.clientX - rect.left,
            y: ce.clientY - rect.top,
            pressure: ce.pressure > 0 ? ce.pressure : 0.5,
          });
        }
      } else {
        appendPoint(pt);
      }
    }
  }, [
    isInteractive,
    activeTool,
    currentLiveStroke,
    getCoordinates,
    appendPoint,
    eraseAt,
    selectionBox,
    relevantStrokes,
  ]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isInteractive) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (activeTool === 'select') {
      const dragOp = dragOpRef.current;
      dragOpRef.current = null;

      if (dragOp) {
        if (dragOp.mode === 'move') {
          const { x: dx, y: dy } = dragOffset;
          setDragOffset({ x: 0, y: 0 });
          if (Math.hypot(dx, dy) > 1) {
            moveSelectedStrokes(dx, dy);
          }
        } else if (dragOp.mode === 'marquee') {
          if (marqueeBox) {
            const width = marqueeBox.maxX - marqueeBox.minX;
            const height = marqueeBox.maxY - marqueeBox.minY;
            if (width > 3 || height > 3) {
              selectStrokesInBox(marqueeBox, dragOp.isShift, anchoringMode);
            }
          }
          setMarqueeBox(null);
        }
      }
      return;
    }

    if (currentLiveStroke) {
      finishStroke();
    }
  }, [
    isInteractive,
    activeTool,
    currentLiveStroke,
    dragOffset,
    marqueeBox,
    anchoringMode,
    moveSelectedStrokes,
    selectStrokesInBox,
    finishStroke,
  ]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isInteractive) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (activeTool === 'select') {
      dragOpRef.current = null;
      setDragOffset({ x: 0, y: 0 });
      setMarqueeBox(null);
      return;
    }

    if (currentLiveStroke) {
      cancelStroke();
    }
  }, [isInteractive, activeTool, currentLiveStroke, cancelStroke]);

  const hasContent = relevantStrokes.length > 0 || (currentLiveStroke && currentLiveStroke.anchoring === anchoringMode);

  const getCursorClass = () => {
    if (!isInteractive) return '';
    if (activeTool === 'select') {
      if (dragOpRef.current?.mode === 'move' || hoverState === 'selection') {
        return 'cursor-move';
      }
      if (hoverState === 'stroke') {
        return 'cursor-pointer';
      }
      if (dragOpRef.current?.mode === 'marquee') {
        return 'cursor-crosshair';
      }
      return 'cursor-default';
    }
    return 'cursor-crosshair';
  };

  return (
    <>
      {/* Floating Toolbar mounted in Viewport Overlay to stay pinned at top */}
      {anchoringMode === 'viewport' && isSketchingActive && <SketchToolbar />}

      {/* Vector Drawing SVG Surface */}
      <svg
        ref={containerRef}
        className={`absolute inset-0 w-full h-full ${
          isInteractive
            ? `pointer-events-auto ${getCursorClass()} z-30`
            : 'pointer-events-none z-20'
        } ${hasContent || isInteractive ? 'block' : 'hidden'}`}
        style={{
          touchAction: isInteractive ? 'none' : 'auto',
          overflow: 'visible',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Render Unselected Committed Strokes */}
        {unselectedStrokes.map((s) => (
          <path
            key={s.id}
            d={s.pathData}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeOpacity={s.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={s.tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined}
          />
        ))}

        {/* Render Selected Strokes with Live Transform and Halo */}
        {selectedStrokes.length > 0 && (
          <g transform={`translate(${dragOffset.x}, ${dragOffset.y})`}>
            {/* Subtle selection halo */}
            {selectedStrokes.map((s) => (
              <path
                key={`halo-${s.id}`}
                d={s.pathData}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={s.width + 4}
                strokeOpacity={0.35}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Stroke Paths */}
            {selectedStrokes.map((s) => (
              <path
                key={s.id}
                d={s.pathData}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width}
                strokeOpacity={s.opacity}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={s.tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined}
              />
            ))}

            {/* Photoshop-style Dashed Bounding Box & 8 Handles */}
            {selectionBox && (
              <g className="pointer-events-none">
                <rect
                  x={selectionBox.minX}
                  y={selectionBox.minY}
                  width={selectionBox.maxX - selectionBox.minX}
                  height={selectionBox.maxY - selectionBox.minY}
                  fill="rgba(56, 189, 248, 0.05)"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                />

                {/* 8 Transform Handles */}
                {[
                  { x: selectionBox.minX, y: selectionBox.minY },
                  { x: (selectionBox.minX + selectionBox.maxX) / 2, y: selectionBox.minY },
                  { x: selectionBox.maxX, y: selectionBox.minY },
                  { x: selectionBox.minX, y: (selectionBox.minY + selectionBox.maxY) / 2 },
                  { x: selectionBox.maxX, y: (selectionBox.minY + selectionBox.maxY) / 2 },
                  { x: selectionBox.minX, y: selectionBox.maxY },
                  { x: (selectionBox.minX + selectionBox.maxX) / 2, y: selectionBox.maxY },
                  { x: selectionBox.maxX, y: selectionBox.maxY },
                ].map((handle, idx) => (
                  <rect
                    key={idx}
                    x={handle.x - 3.5}
                    y={handle.y - 3.5}
                    width={7}
                    height={7}
                    fill="#ffffff"
                    stroke="#0284c7"
                    strokeWidth={1.5}
                  />
                ))}
              </g>
            )}
          </g>
        )}

        {/* Drag-to-select Marquee Highlight Box */}
        {marqueeBox && (
          <rect
            x={marqueeBox.minX}
            y={marqueeBox.minY}
            width={marqueeBox.maxX - marqueeBox.minX}
            height={marqueeBox.maxY - marqueeBox.minY}
            fill="rgba(56, 189, 248, 0.12)"
            stroke="#38bdf8"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            className="pointer-events-none"
          />
        )}

        {/* Render Live In-Progress Stroke */}
        {currentLiveStroke && currentLiveStroke.anchoring === anchoringMode && (
          <path
            d={currentLiveStroke.pathData}
            fill="none"
            stroke={currentLiveStroke.color}
            strokeWidth={currentLiveStroke.width}
            strokeOpacity={currentLiveStroke.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={currentLiveStroke.tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined}
          />
        )}
      </svg>
    </>
  );
});
