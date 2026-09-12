/**
 * @module sketchEngine
 * @description
 * High-performance vector stroke engine and serialization utilities for Noether Sketch.
 * Provides real-time quadratic Bezier curve smoothing, eraser intersection testing,
 * SVG export generation, and zero-leakage markdown HTML comment parsing/serialization.
 */

import {
  SketchPoint,
  SketchStroke,
  SketchBox,
  SketchDocumentData,
  SerializedSketchPayload,
  SketchAnchoringMode,
} from './types';

/**
 * Converts a sequence of raw pointer points into a smooth quadratic Bezier SVG path string.
 * Uses midpoint interpolation for silky, anti-aliased vector paths with sub-millisecond execution.
 */
export function pointsToSvgPath(points: SketchPoint[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 0.1).toFixed(1)} ${(p.y + 0.1).toFixed(1)}`;
  }
  if (points.length === 2) {
    const p0 = points[0];
    const p1 = points[1];
    return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    d += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

/**
 * Calculates Euclidean distance between two points.
 */
export function distanceBetween(p1: SketchPoint, p2: SketchPoint): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Tests whether a point is within a given distance from a line segment (a -> b).
 */
function isPointNearSegment(p: SketchPoint, a: SketchPoint, b: SketchPoint, maxDist: number): boolean {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return distanceBetween(p, a) <= maxDist;

  // Projection scalar clamped between [0, 1]
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
  const projX = a.x + t * (b.x - a.x);
  const projY = a.y + t * (b.y - a.y);
  return Math.hypot(p.x - projX, p.y - projY) <= maxDist;
}

/**
 * Determines whether a stroke is hit by an eraser circle at (x, y) with radius.
 */
export function isStrokeIntersectedBy(stroke: SketchStroke, eraserPt: SketchPoint, eraserRadius: number): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;
  const effectiveRadius = eraserRadius + stroke.width / 2;

  // Single-point stroke check
  if (stroke.points.length === 1) {
    return distanceBetween(eraserPt, stroke.points[0]) <= effectiveRadius;
  }

  // Segment-by-segment check
  for (let i = 0; i < stroke.points.length - 1; i++) {
    if (isPointNearSegment(eraserPt, stroke.points[i], stroke.points[i + 1], effectiveRadius)) {
      return true;
    }
  }
  return false;
}

/**
 * Computes the minimum bounding box encompassing all points of a stroke.
 */
export function computeStrokeBoundingBox(stroke: SketchStroke): SketchBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of stroke.points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  const pad = stroke.width / 2;
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}

/**
 * Computes the combined bounding box enclosing an array of strokes,
 * with breathing room padding for the Photoshop-style selection outline.
 */
export function computeMultiStrokeBoundingBox(strokes: SketchStroke[]): SketchBox | null {
  if (!strokes || strokes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of strokes) {
    const bbox = computeStrokeBoundingBox(s);
    if (bbox.minX < minX) minX = bbox.minX;
    if (bbox.minY < minY) minY = bbox.minY;
    if (bbox.maxX > maxX) maxX = bbox.maxX;
    if (bbox.maxY > maxY) maxY = bbox.maxY;
  }

  if (!isFinite(minX) || !isFinite(minY)) return null;

  const pad = 4;
  return {
    minX: Math.round(minX - pad),
    minY: Math.round(minY - pad),
    maxX: Math.round(maxX + pad),
    maxY: Math.round(maxY + pad),
  };
}

/**
 * Checks if a point lies within a bounding box.
 */
export function isPointInBox(pt: SketchPoint, box: SketchBox): boolean {
  return pt.x >= box.minX && pt.x <= box.maxX && pt.y >= box.minY && pt.y <= box.maxY;
}

/**
 * Tests if two 2D line segments (p1 -> p2) and (p3 -> p4) intersect.
 */
function lineSegmentsIntersect(p1: SketchPoint, p2: SketchPoint, p3: SketchPoint, p4: SketchPoint): boolean {
  const ccw = (a: SketchPoint, b: SketchPoint, c: SketchPoint) => {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  };
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Determines whether any part of a stroke lies inside or intersects a selection bounding box.
 */
export function doesStrokeIntersectBox(stroke: SketchStroke, box: SketchBox): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;

  // 1. Quick point containment check
  for (const pt of stroke.points) {
    if (isPointInBox(pt, box)) return true;
  }

  // 2. Disjoint bounding box rejection check
  const sBox = computeStrokeBoundingBox(stroke);
  if (
    sBox.maxX < box.minX ||
    sBox.minX > box.maxX ||
    sBox.maxY < box.minY ||
    sBox.minY > box.maxY
  ) {
    return false;
  }

  // 3. Segment intersection against the 4 box edges
  const topLeft: SketchPoint = { x: box.minX, y: box.minY };
  const topRight: SketchPoint = { x: box.maxX, y: box.minY };
  const bottomLeft: SketchPoint = { x: box.minX, y: box.maxY };
  const bottomRight: SketchPoint = { x: box.maxX, y: box.maxY };

  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];

    if (
      lineSegmentsIntersect(p1, p2, topLeft, topRight) ||
      lineSegmentsIntersect(p1, p2, topRight, bottomRight) ||
      lineSegmentsIntersect(p1, p2, bottomRight, bottomLeft) ||
      lineSegmentsIntersect(p1, p2, bottomLeft, topLeft)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Translates a set of selected strokes by (dx, dy) and regenerates their vector SVG paths.
 * Rounds coordinates to 1 decimal place to eliminate floating-point drift over repeated moves.
 */
export function translateStrokes(
  strokes: SketchStroke[],
  selectedIds: Set<string>,
  dx: number,
  dy: number
): SketchStroke[] {
  if (dx === 0 && dy === 0) return strokes;

  return strokes.map((s) => {
    if (!selectedIds.has(s.id)) return s;

    const newPoints = s.points.map((p) => ({
      ...p,
      x: Math.round((p.x + dx) * 10) / 10,
      y: Math.round((p.y + dy) * 10) / 10,
    }));

    return {
      ...s,
      points: newPoints,
      pathData: pointsToSvgPath(newPoints),
    };
  });
}

/**
 * Exports strokes to a clean, standalone SVG XML string with proper viewBox and styles.
 */
export function exportStrokesToSvg(strokes: SketchStroke[], defaultWidth = 800, defaultHeight = 600): string {
  if (!strokes || strokes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${defaultWidth} ${defaultHeight}" width="${defaultWidth}" height="${defaultHeight}"></svg>`;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    const bbox = computeStrokeBoundingBox(stroke);
    if (bbox.minX < minX) minX = bbox.minX;
    if (bbox.minY < minY) minY = bbox.minY;
    if (bbox.maxX > maxX) maxX = bbox.maxX;
    if (bbox.maxY > maxY) maxY = bbox.maxY;
  }

  const padding = 16;
  const vbX = Math.floor(minX - padding);
  const vbY = Math.floor(minY - padding);
  const vbW = Math.ceil(maxX - minX + padding * 2);
  const vbH = Math.ceil(maxY - minY + padding * 2);

  const paths = strokes
    .map((s) => {
      const isHighlighter = s.tool === 'highlighter';
      const blendStyle = isHighlighter ? 'style="mix-blend-mode: multiply;"' : '';
      return `  <path d="${s.pathData}" fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${s.opacity}" ${blendStyle} />`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="${vbW}" height="${vbH}">\n${paths}\n</svg>`;
}

export const SKETCH_COMMENT_REGEX = /<!--\s*noether-sketch:\s*([\s\S]*?)\s*-->/g;

/**
 * Serializes sketch data into a compact HTML comment string appended to the markdown document.
 */
export function serializeSketchToComment(data: SketchDocumentData): string {
  if (!data || !data.strokes || data.strokes.length === 0) {
    return '';
  }

  const payload: SerializedSketchPayload = {
    v: 1,
    mode: data.anchoring,
    strokes: data.strokes.map((s) => ({
      id: s.id,
      t: s.tool,
      c: s.color,
      w: s.width,
      o: s.opacity,
      m: s.anchoring,
      pts: s.points.map((p) => (p.pressure !== undefined ? [p.x, p.y, p.pressure] : [p.x, p.y])),
      d: s.pathData,
    })),
  };

  return `\n\n<!-- noether-sketch: ${JSON.stringify(payload)} -->\n`;
}

/**
 * Extracts and cleans noether-sketch HTML comments from markdown text.
 * Returns the sanitized markdown with zero comment text and the parsed SketchDocumentData.
 */
export function parseSketchFromComment(
  markdown: string,
  documentId = ''
): { cleanMarkdown: string; data: SketchDocumentData | null } {
  if (!markdown) {
    return { cleanMarkdown: '', data: null };
  }

  let matchedPayload: SerializedSketchPayload | null = null;
  const cleanMarkdown = markdown.replace(SKETCH_COMMENT_REGEX, (_match, jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr.trim()) as SerializedSketchPayload;
      if (parsed && parsed.v === 1 && Array.isArray(parsed.strokes)) {
        matchedPayload = parsed;
      }
    } catch (e) {
      console.warn('[Noether Sketch] Failed to parse sketch comment payload:', e);
    }
    return '';
  }).trimEnd();

  if (!matchedPayload) {
    return { cleanMarkdown, data: null };
  }

  const payload = matchedPayload as SerializedSketchPayload;
  const strokes: SketchStroke[] = payload.strokes.map((s) => ({
    id: s.id,
    tool: s.t,
    color: s.c,
    width: s.w,
    opacity: s.o,
    anchoring: (s.m || payload.mode || 'content') as SketchAnchoringMode,
    points: s.pts.map(([x, y, pressure]) => ({ x, y, pressure })),
    pathData: s.d || pointsToSvgPath(s.pts.map(([x, y, pressure]) => ({ x, y, pressure }))),
  }));

  const data: SketchDocumentData = {
    documentId,
    anchoring: (payload.mode || 'content') as SketchAnchoringMode,
    strokes,
    updatedAt: Date.now(),
  };

  return { cleanMarkdown, data };
}
