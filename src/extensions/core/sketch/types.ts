/**
 * @module SketchTypes
 * @description
 * Domain models and type definitions for the Noether Sketch core extension.
 * Defines point coordinates, vector stroke representations, tool modes,
 * and serialization formats.
 *
 * Kept strictly within the Sketch extension directory to prevent type leakage into Noether native core.
 */

export interface SketchPoint {
  x: number;
  y: number;
  pressure?: number;
}

export type SketchToolType = 'pen' | 'highlighter' | 'eraser' | 'select';

export interface SketchBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type SketchAnchoringMode = 'content' | 'viewport';

export interface SketchStroke {
  id: string;
  tool: SketchToolType;
  color: string;
  width: number;
  opacity: number;
  anchoring: SketchAnchoringMode;
  points: SketchPoint[];
  pathData: string;
}

export interface SketchDocumentData {
  documentId: string;
  anchoring: SketchAnchoringMode;
  strokes: SketchStroke[];
  updatedAt: number;
}

export interface SerializedSketchPayload {
  v: number;
  mode: SketchAnchoringMode;
  strokes: {
    id: string;
    t: SketchToolType;
    c: string;
    w: number;
    o: number;
    m: SketchAnchoringMode;
    pts: [number, number, number?][];
    d: string;
  }[];
}
