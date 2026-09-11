/**
 * @module canvasEdges
 * @description
 * Spatial mathematics and path calculations for canvas card edge connections.
 * Handles side anchor coordinates, cubic Bezier curve generation, directional tangent
 * vectors, and magnetic proximity snapping for interactive edge creation.
 */

import type { CanvasNode, CanvasNodeSide, CanvasEdgeDirection } from '../types';

export const ALL_CANVAS_SIDES: CanvasNodeSide[] = ['top', 'right', 'bottom', 'left'];

/**
 * Calculates the exact (x, y) spatial anchor coordinate on a given card's side.
 */
export function getSideAnchorPoint(
  node: { x: number; y: number; width: number; height: number },
  side: CanvasNodeSide
): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: node.x + node.width / 2, y: node.y };
    case 'right':
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 };
  }
}

/**
 * Returns the outward unit normal vector for a card side.
 */
export function getSideVector(side: CanvasNodeSide): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
  }
}

/**
 * Returns the opposite card side.
 */
export function getOppositeSide(side: CanvasNodeSide): CanvasNodeSide {
  switch (side) {
    case 'top':
      return 'bottom';
    case 'right':
      return 'left';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
  }
}

export interface BezierCurveResult {
  path: string;
  arrowPath: string;
  sourceArrowPath?: string;
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
  mid: { x: number; y: number };
}

/**
 * Generates a cubic Bezier curve path connecting two points with directional curvature.
 * The curve body terminates at the base center of any arrowheads without penetrating inside them.
 */
export function computeBezierPath(
  p1: { x: number; y: number },
  side1: CanvasNodeSide,
  p2: { x: number; y: number },
  side2?: CanvasNodeSide,
  arrowLength = 12,
  arrowWidth = 13,
  direction: CanvasEdgeDirection = 'unidirectional'
): BezierCurveResult {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Responsive curvature depth based on distance
  const delta = Math.max(28, Math.min(dist * 0.45, 160));

  const v1 = getSideVector(side1);
  let targetTangent: { x: number; y: number };
  let cp1: { x: number; y: number };
  let cp2: { x: number; y: number };

  if (side2) {
    const v2 = getSideVector(side2);
    // Inward approach tangent perpendicular to target card side
    targetTangent = { x: -v2.x, y: -v2.y };
    cp1 = {
      x: p1.x + v1.x * delta,
      y: p1.y + v1.y * delta,
    };
    cp2 = {
      x: p2.x + v2.x * delta,
      y: p2.y + v2.y * delta,
    };
  } else {
    // Drafting toward a free-floating pointer:
    // Arrowhead is locked to the departure side orientation (e.g. from left is always facing left)
    // until it snaps to a card side (where side2 sets the inward target orientation).
    targetTangent = { x: v1.x, y: v1.y };

    const draftDelta = Math.max(Math.min(dist * 0.5, 28), Math.min(dist * 0.45, 160));
    cp1 = {
      x: p1.x + v1.x * draftDelta,
      y: p1.y + v1.y * draftDelta,
    };
    cp2 = {
      x: p2.x - v1.x * draftDelta,
      y: p2.y - v1.y * draftDelta,
    };

    // When dragging backwards relative to the departure side orientation,
    // add perpendicular clearance so the cubic Bezier arches gracefully rather than collapsing.
    if (v1.x !== 0) {
      const proj = (p2.x - p1.x) * v1.x;
      if (proj < 0) {
        const perpSign = p2.y - p1.y >= 0 ? 1 : -1;
        const clearance = Math.max(0, 56 - Math.abs(p2.y - p1.y)) * perpSign;
        cp1.y += clearance;
        cp2.y += clearance;
      }
    } else if (v1.y !== 0) {
      const proj = (p2.y - p1.y) * v1.y;
      if (proj < 0) {
        const perpSign = p2.x - p1.x >= 0 ? 1 : -1;
        const clearance = Math.max(0, 56 - Math.abs(p2.x - p1.x)) * perpSign;
        cp1.x += clearance;
        cp2.x += clearance;
      }
    }
  }

  const hasTargetArrow = direction === 'unidirectional' || direction === 'bidirectional';
  const hasSourceArrow = direction === 'bidirectional';

  const effectiveLength = Math.min(arrowLength, Math.max(2, dist * 0.5));
  const effectiveWidth = (effectiveLength / arrowLength) * arrowWidth;

  // Target arrowhead geometry (pointing at p2)
  let arrowPath = '';
  let lineEnd = p2;
  if (hasTargetArrow) {
    const tip = p2;
    const baseCenter = {
      x: p2.x - targetTangent.x * effectiveLength,
      y: p2.y - targetTangent.y * effectiveLength,
    };

    const normal = {
      x: -targetTangent.y,
      y: targetTangent.x,
    };

    const base1 = {
      x: baseCenter.x + normal.x * (effectiveWidth / 2),
      y: baseCenter.y + normal.y * (effectiveWidth / 2),
    };
    const base2 = {
      x: baseCenter.x - normal.x * (effectiveWidth / 2),
      y: baseCenter.y - normal.y * (effectiveWidth / 2),
    };

    arrowPath = `M ${tip.x} ${tip.y} L ${base1.x} ${base1.y} L ${base2.x} ${base2.y} Z`;

    lineEnd = {
      x: p2.x - targetTangent.x * Math.max(0, effectiveLength - 1),
      y: p2.y - targetTangent.y * Math.max(0, effectiveLength - 1),
    };
  }

  // Source arrowhead geometry (pointing at p1 for bidirectional)
  let sourceArrowPath = '';
  let lineStart = p1;
  if (hasSourceArrow) {
    const tip = p1;
    const baseCenter = {
      x: p1.x + v1.x * effectiveLength,
      y: p1.y + v1.y * effectiveLength,
    };

    const normal = {
      x: -v1.y,
      y: v1.x,
    };

    const base1 = {
      x: baseCenter.x + normal.x * (effectiveWidth / 2),
      y: baseCenter.y + normal.y * (effectiveWidth / 2),
    };
    const base2 = {
      x: baseCenter.x - normal.x * (effectiveWidth / 2),
      y: baseCenter.y - normal.y * (effectiveWidth / 2),
    };

    sourceArrowPath = `M ${tip.x} ${tip.y} L ${base1.x} ${base1.y} L ${base2.x} ${base2.y} Z`;

    lineStart = {
      x: p1.x + v1.x * Math.max(0, effectiveLength - 1),
      y: p1.y + v1.y * Math.max(0, effectiveLength - 1),
    };
  }

  // Midpoint at t = 0.5 along the visible curve for controls
  const mid = {
    x: 0.125 * lineStart.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * lineEnd.x,
    y: 0.125 * lineStart.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * lineEnd.y,
  };

  const path = `M ${lineStart.x} ${lineStart.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${lineEnd.x} ${lineEnd.y}`;

  return { path, arrowPath, sourceArrowPath, cp1, cp2, mid };
}

export interface SideSnapTarget {
  nodeId: string;
  side: CanvasNodeSide;
  point: { x: number; y: number };
  distance: number;
}

/**
 * Searches all candidate canvas cards for the closest side anchor within magnetic snap threshold.
 * Snapping is evaluated against each side's full edge segment (matching the side trigger zone corridor,
 * with corner clearance) rather than solely against the single center anchor point.
 */
export function findTargetSideSnap(
  nodes: CanvasNode[],
  cursorCanvas: { x: number; y: number },
  excludeNodeId: string,
  thresholdCanvas: number = 36
): SideSnapTarget | null {
  let closestTarget: SideSnapTarget | null = null;
  let minDistance = thresholdCanvas;
  let insideTarget: SideSnapTarget | null = null;
  let minInsideDist = Infinity;

  for (const node of nodes) {
    if (node.id === excludeNodeId) continue;

    const w = node.width || 260;
    const h = node.height || 180;
    const isInside =
      cursorCanvas.x >= node.x &&
      cursorCanvas.x <= node.x + w &&
      cursorCanvas.y >= node.y &&
      cursorCanvas.y <= node.y + h;

    if (isInside) {
      const dTop = cursorCanvas.y - node.y;
      const dBottom = node.y + h - cursorCanvas.y;
      const dLeft = cursorCanvas.x - node.x;
      const dRight = node.x + w - cursorCanvas.x;

      let closestSide: CanvasNodeSide = 'top';
      let minDist = dTop;
      if (dBottom < minDist) {
        minDist = dBottom;
        closestSide = 'bottom';
      }
      if (dLeft < minDist) {
        minDist = dLeft;
        closestSide = 'left';
      }
      if (dRight < minDist) {
        minDist = dRight;
        closestSide = 'right';
      }

      if (minDist < minInsideDist) {
        minInsideDist = minDist;
        insideTarget = {
          nodeId: node.id,
          side: closestSide,
          point: getSideAnchorPoint(node, closestSide),
          distance: minDist,
        };
      }
      continue;
    }

    for (const side of ALL_CANVAS_SIDES) {
      const anchor = getSideAnchorPoint(node, side);
      const isHorizontal = side === 'top' || side === 'bottom';
      const sideLength = isHorizontal ? w : h;
      const cornerClearance = Math.min(16, sideLength * 0.15);

      let dist: number;
      if (side === 'top') {
        const clampedX = Math.max(node.x + cornerClearance, Math.min(node.x + w - cornerClearance, cursorCanvas.x));
        const dx = cursorCanvas.x - clampedX;
        const dy = cursorCanvas.y - node.y;
        dist = Math.sqrt(dx * dx + dy * dy);
      } else if (side === 'bottom') {
        const clampedX = Math.max(node.x + cornerClearance, Math.min(node.x + w - cornerClearance, cursorCanvas.x));
        const dx = cursorCanvas.x - clampedX;
        const dy = cursorCanvas.y - (node.y + h);
        dist = Math.sqrt(dx * dx + dy * dy);
      } else if (side === 'left') {
        const clampedY = Math.max(node.y + cornerClearance, Math.min(node.y + h - cornerClearance, cursorCanvas.y));
        const dx = cursorCanvas.x - node.x;
        const dy = cursorCanvas.y - clampedY;
        dist = Math.sqrt(dx * dx + dy * dy);
      } else {
        // 'right'
        const clampedY = Math.max(node.y + cornerClearance, Math.min(node.y + h - cornerClearance, cursorCanvas.y));
        const dx = cursorCanvas.x - (node.x + w);
        const dy = cursorCanvas.y - clampedY;
        dist = Math.sqrt(dx * dx + dy * dy);
      }

      if (dist < minDistance) {
        minDistance = dist;
        closestTarget = {
          nodeId: node.id,
          side,
          point: anchor,
          distance: dist,
        };
      }
    }
  }

  return insideTarget || closestTarget;
}

/**
 * Determines the most natural opposite connecting sides when none are explicitly provided.
 */
export function determineDefaultConnectingSides(
  sourceNode: { x: number; y: number; width: number; height: number },
  targetNode: { x: number; y: number; width: number; height: number }
): { fromSide: CanvasNodeSide; toSide: CanvasNodeSide } {
  const c1x = sourceNode.x + sourceNode.width / 2;
  const c1y = sourceNode.y + sourceNode.height / 2;
  const c2x = targetNode.x + targetNode.width / 2;
  const c2y = targetNode.y + targetNode.height / 2;

  const dx = c2x - c1x;
  const dy = c2y - c1y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { fromSide: 'right', toSide: 'left' }
      : { fromSide: 'left', toSide: 'right' };
  } else {
    return dy >= 0
      ? { fromSide: 'bottom', toSide: 'top' }
      : { fromSide: 'top', toSide: 'bottom' };
  }
}

let measureCtx: CanvasRenderingContext2D | null = null;

/**
 * Calculates bounding dimensions for an edge text label with spacing clearance.
 */
export function getEdgeLabelBox(text?: string): { width: number; height: number } {
  if (!text || text.length === 0) {
    return { width: 105, height: 28 };
  }

  let textWidth = text.length * 9.5;
  if (typeof document !== 'undefined') {
    if (!measureCtx) {
      const canvas = document.createElement('canvas');
      measureCtx = canvas.getContext('2d');
    }
    if (measureCtx) {
      measureCtx.font = '500 14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      textWidth = measureCtx.measureText(text).width;
    }
  }

  // 11px horizontal breathing room on each side, with 28px vertical clearance
  const width = Math.max(30, Math.ceil(textWidth + 22));
  const height = 28;
  return { width, height };
}
