/**
 * @module sketchStore
 * @description
 * Reactive Zustand state manager for the Flint Sketch core extension.
 * Coordinates active tools, live pointer drawing sessions, stroke histories (undo/redo),
 * and automatic synchronization with SQLite WASM.
 */

import { create } from 'zustand';
import {
  SketchPoint,
  SketchStroke,
  SketchToolType,
  SketchAnchoringMode,
  SketchDocumentData,
  SketchBox,
} from './types';
import {
  pointsToSvgPath,
  distanceBetween,
  isStrokeIntersectedBy,
  doesStrokeIntersectBox,
  translateStrokes,
} from './sketchEngine';
import { loadSketchFromDb, saveSketchToDb, deleteSketchFromDb } from './sketchDb';

export interface SketchState {
  isSketchingActive: boolean;
  activeTool: SketchToolType;
  activeColor: string;
  activeWidth: number;
  activeAnchoring: SketchAnchoringMode;
  currentDocId: string | null;
  strokes: SketchStroke[];
  currentLiveStroke: SketchStroke | null;
  undoStack: SketchStroke[][];
  redoStack: SketchStroke[][];
  selectedStrokeIds: string[];

  // Actions
  toggleSketching: () => void;
  setSketchingActive: (active: boolean) => void;
  setTool: (tool: SketchToolType) => void;
  setColor: (color: string) => void;
  setWidth: (width: number) => void;
  setAnchoring: (mode: SketchAnchoringMode) => void;
  loadDocument: (docId: string | undefined | null) => Promise<void>;
  startStroke: (pt: SketchPoint) => void;
  appendPoint: (pt: SketchPoint) => void;
  finishStroke: () => void;
  cancelStroke: () => void;
  eraseAt: (pt: SketchPoint, radius?: number) => void;
  setSelectedStrokeIds: (ids: string[]) => void;
  toggleStrokeSelection: (id: string) => void;
  clearSelection: () => void;
  selectStrokesInBox: (box: SketchBox, isShift: boolean, anchoring: SketchAnchoringMode) => void;
  moveSelectedStrokes: (dx: number, dy: number) => void;
  deleteSelectedStrokes: () => void;
  undo: () => void;
  redo: () => void;
  clearAllStrokes: () => void;
}

export const useSketchStore = create<SketchState>((set, get) => ({
  isSketchingActive: false,
  activeTool: 'pen',
  activeColor: '#3b82f6',
  activeWidth: 3,
  activeAnchoring: 'content',
  currentDocId: null,
  strokes: [],
  currentLiveStroke: null,
  undoStack: [],
  redoStack: [],
  selectedStrokeIds: [],

  toggleSketching: () => {
    set((s) => ({ isSketchingActive: !s.isSketchingActive }));
  },

  setSketchingActive: (active) => {
    set({ isSketchingActive: active });
  },

  setTool: (tool) => {
    set((s) => {
      let width = s.activeWidth;
      if (tool === 'highlighter' && width < 10) {
        width = 14;
      } else if (tool === 'pen' && width > 8) {
        width = 3;
      }
      return {
        activeTool: tool,
        activeWidth: width,
        selectedStrokeIds: tool === 'select' ? s.selectedStrokeIds : [],
      };
    });
  },

  setColor: (color) => {
    set({ activeColor: color });
  },

  setWidth: (width) => {
    set({ activeWidth: width });
  },

  setAnchoring: (mode) => {
    const docId = get().currentDocId;
    set({ activeAnchoring: mode });

    if (docId) {
      const currentStrokes = get().strokes;
      saveSketchToDb({
        documentId: docId,
        anchoring: mode,
        strokes: currentStrokes,
        updatedAt: Date.now(),
      });
    }
  },

  loadDocument: async (docId) => {
    if (!docId) {
      set({
        currentDocId: null,
        strokes: [],
        currentLiveStroke: null,
        undoStack: [],
        redoStack: [],
        selectedStrokeIds: [],
      });
      return;
    }

    if (get().currentDocId === docId) {
      return;
    }

    set({
      currentDocId: docId,
      currentLiveStroke: null,
      undoStack: [],
      redoStack: [],
      selectedStrokeIds: [],
    });

    const data = await loadSketchFromDb(docId);
    if (data && data.documentId === docId) {
      set({
        strokes: data.strokes || [],
        activeAnchoring: data.anchoring || 'content',
        selectedStrokeIds: [],
      });
    } else {
      set({ strokes: [], activeAnchoring: 'content', selectedStrokeIds: [] });
    }
  },

  startStroke: (pt) => {
    const { activeTool, activeColor, activeWidth, activeAnchoring } = get();
    if (activeTool === 'eraser') {
      get().eraseAt(pt, 16);
      return;
    }

    const strokeId = `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isHighlighter = activeTool === 'highlighter';
    const opacity = isHighlighter ? 0.45 : 1;
    const initialPoints = [pt];

    const liveStroke: SketchStroke = {
      id: strokeId,
      tool: activeTool,
      color: activeColor,
      width: activeWidth,
      opacity,
      anchoring: activeAnchoring,
      points: initialPoints,
      pathData: pointsToSvgPath(initialPoints),
    };

    set({ currentLiveStroke: liveStroke });
  },

  appendPoint: (pt) => {
    const { currentLiveStroke, activeTool } = get();
    if (activeTool === 'eraser') {
      get().eraseAt(pt, 16);
      return;
    }

    if (!currentLiveStroke) return;

    const lastPt = currentLiveStroke.points[currentLiveStroke.points.length - 1];
    // Decimate redundant points within 2px radius for optimal memory & SVG compactness
    if (lastPt && distanceBetween(lastPt, pt) < 2) {
      return;
    }

    const newPoints = [...currentLiveStroke.points, pt];
    const newPath = pointsToSvgPath(newPoints);

    set({
      currentLiveStroke: {
        ...currentLiveStroke,
        points: newPoints,
        pathData: newPath,
      },
    });
  },

  finishStroke: () => {
    const { currentLiveStroke, strokes, currentDocId, activeAnchoring, undoStack } = get();
    if (!currentLiveStroke) return;

    // Push previous state onto undo stack
    const newUndo = [...undoStack, strokes];
    const newStrokes = [...strokes, currentLiveStroke];

    set({
      strokes: newStrokes,
      currentLiveStroke: null,
      undoStack: newUndo,
      redoStack: [],
    });

    if (currentDocId) {
      saveSketchToDb({
        documentId: currentDocId,
        anchoring: activeAnchoring,
        strokes: newStrokes,
        updatedAt: Date.now(),
      });
    }
  },

  cancelStroke: () => {
    set({ currentLiveStroke: null });
  },

  eraseAt: (pt, radius = 16) => {
    const { strokes, currentDocId, activeAnchoring, undoStack, selectedStrokeIds } = get();
    const remaining = strokes.filter((s) => !isStrokeIntersectedBy(s, pt, radius));

    if (remaining.length !== strokes.length) {
      const remainingIds = new Set(remaining.map((s) => s.id));
      const newUndo = [...undoStack, strokes];
      set({
        strokes: remaining,
        selectedStrokeIds: selectedStrokeIds.filter((id) => remainingIds.has(id)),
        undoStack: newUndo,
        redoStack: [],
      });

      if (currentDocId) {
        if (remaining.length === 0) {
          deleteSketchFromDb(currentDocId);
        } else {
          saveSketchToDb({
            documentId: currentDocId,
            anchoring: activeAnchoring,
            strokes: remaining,
            updatedAt: Date.now(),
          });
        }
      }
    }
  },

  setSelectedStrokeIds: (ids) => {
    set({ selectedStrokeIds: ids });
  },

  toggleStrokeSelection: (id) => {
    set((s) => {
      const exists = s.selectedStrokeIds.includes(id);
      return {
        selectedStrokeIds: exists
          ? s.selectedStrokeIds.filter((x) => x !== id)
          : [...s.selectedStrokeIds, id],
      };
    });
  },

  clearSelection: () => {
    set({ selectedStrokeIds: [] });
  },

  selectStrokesInBox: (box, isShift, anchoring) => {
    const { strokes, selectedStrokeIds } = get();
    const matching = strokes
      .filter((s) => (s.anchoring || 'content') === anchoring && doesStrokeIntersectBox(s, box))
      .map((s) => s.id);

    if (isShift) {
      const setIds = new Set([...selectedStrokeIds, ...matching]);
      set({ selectedStrokeIds: Array.from(setIds) });
    } else {
      set({ selectedStrokeIds: matching });
    }
  },

  moveSelectedStrokes: (dx, dy) => {
    const { strokes, selectedStrokeIds, undoStack, currentDocId, activeAnchoring } = get();
    if (selectedStrokeIds.length === 0 || (dx === 0 && dy === 0)) return;

    const selectedSet = new Set(selectedStrokeIds);
    const newStrokes = translateStrokes(strokes, selectedSet, dx, dy);

    const newUndo = [...undoStack, strokes];
    set({
      strokes: newStrokes,
      undoStack: newUndo,
      redoStack: [],
    });

    if (currentDocId) {
      saveSketchToDb({
        documentId: currentDocId,
        anchoring: activeAnchoring,
        strokes: newStrokes,
        updatedAt: Date.now(),
      });
    }
  },

  deleteSelectedStrokes: () => {
    const { strokes, selectedStrokeIds, undoStack, currentDocId, activeAnchoring } = get();
    if (selectedStrokeIds.length === 0) return;

    const selectedSet = new Set(selectedStrokeIds);
    const remaining = strokes.filter((s) => !selectedSet.has(s.id));

    const newUndo = [...undoStack, strokes];
    set({
      strokes: remaining,
      selectedStrokeIds: [],
      undoStack: newUndo,
      redoStack: [],
    });

    if (currentDocId) {
      if (remaining.length === 0) {
        deleteSketchFromDb(currentDocId);
      } else {
        saveSketchToDb({
          documentId: currentDocId,
          anchoring: activeAnchoring,
          strokes: remaining,
          updatedAt: Date.now(),
        });
      }
    }
  },

  undo: () => {
    const { undoStack, strokes, redoStack, currentDocId, activeAnchoring, selectedStrokeIds } = get();
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const newRedo = [...redoStack, strokes];
    const prevIds = new Set(previous.map((s) => s.id));

    set({
      strokes: previous,
      selectedStrokeIds: selectedStrokeIds.filter((id) => prevIds.has(id)),
      undoStack: newUndo,
      redoStack: newRedo,
    });

    if (currentDocId) {
      if (previous.length === 0) {
        deleteSketchFromDb(currentDocId);
      } else {
        saveSketchToDb({
          documentId: currentDocId,
          anchoring: activeAnchoring,
          strokes: previous,
          updatedAt: Date.now(),
        });
      }
    }
  },

  redo: () => {
    const { redoStack, strokes, undoStack, currentDocId, activeAnchoring, selectedStrokeIds } = get();
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const newUndo = [...undoStack, strokes];
    const nextIds = new Set(next.map((s) => s.id));

    set({
      strokes: next,
      selectedStrokeIds: selectedStrokeIds.filter((id) => nextIds.has(id)),
      undoStack: newUndo,
      redoStack: newRedo,
    });

    if (currentDocId) {
      saveSketchToDb({
        documentId: currentDocId,
        anchoring: activeAnchoring,
        strokes: next,
        updatedAt: Date.now(),
      });
    }
  },

  clearAllStrokes: () => {
    const { strokes, undoStack, currentDocId } = get();
    if (strokes.length === 0) return;

    const newUndo = [...undoStack, strokes];
    set({
      strokes: [],
      selectedStrokeIds: [],
      undoStack: newUndo,
      redoStack: [],
    });

    if (currentDocId) {
      deleteSketchFromDb(currentDocId);
    }
  },
}));
