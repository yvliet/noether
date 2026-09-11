/**
 * @module canvasEdges
 * @description
 * Spatial mathematics and path calculations for canvas card edge connections.
 * Handles side anchor coordinates, cubic Bezier curve generation, directional tangent
 * vectors, and magnetic proximity snapping for interactive edge creation.
 */

import type { CanvasNode, CanvasNodeSide } from '../types';

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
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
  mid: { x: number; y: number };
}

/**
 * Generates a cubic Bezier curve path connecting two points with directional curvature.
 * The curve body terminates at the base center of the arrowhead without penetrating inside it.
 */
export function computeBezierPath(
  p1: { x: number; y: number },
  side1: CanvasNodeSide,
  p2: { x: number; y: number },
  side2?: CanvasNodeSide,
  arrowLength = 12,
  arrowWidth = 13
): BezierCurveResult {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Responsive curvature depth based on distance
  const delta = Math.max(28, Math.min(dist * 0.45, 160));

  const v1 = getSideVector(side1);
  const cp1 = {
    x: p1.x + v1.x * delta,
    y: p1.y + v1.y * delta,
  };

  let targetTangent: { x: number; y: number };
  let cp2: { x: number; y: number };

  if (side2) {
    const v2 = getSideVector(side2);
    // Inward approach tangent perpendicular to target card side
    targetTangent = { x: -v2.x, y: -v2.y };
    cp2 = {
      x: p2.x + v2.x * delta,
      y: p2.y + v2.y * delta,
    };
  } else {
    // Drafting toward a free-floating pointer:
    // Natural smooth arrival tangent along the trajectory from cp1 to p2 (no S-curve kinks)
    const approachX = p2.x - cp1.x;
    const approachY = p2.y - cp1.y;
    const approachDist = Math.sqrt(approachX * approachX + approachY * approachY) || 1;
    targetTangent = {
      x: approachX / approachDist,
      y: approachY / approachDist,
    };
    cp2 = {
      x: p2.x - targetTangent.x * (delta * 0.5),
      y: p2.y - targetTangent.y * (delta * 0.5),
    };
  }

  // Arrowhead geometry:
  // Tip is placed precisely at p2 (target card border or pointer position)
  // The line body terminates at the base center of the arrowhead
  const effectiveLength = Math.min(arrowLength, Math.max(2, dist * 0.5));
  const effectiveWidth = (effectiveLength / arrowLength) * arrowWidth;

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

  const arrowPath = `M ${tip.x} ${tip.y} L ${base1.x} ${base1.y} L ${base2.x} ${base2.y} Z`;

  // Curve stroke terminates at the base center with a 1px overlap to ensure zero subpixel gap
  const lineEnd = {
    x: p2.x - targetTangent.x * Math.max(0, effectiveLength - 1),
    y: p2.y - targetTangent.y * Math.max(0, effectiveLength - 1),
  };

  // Midpoint at t = 0.5 along the visible curve for controls
  const mid = {
    x: 0.125 * p1.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * lineEnd.x,
    y: 0.125 * p1.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * lineEnd.y,
  };

  const path = `M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${lineEnd.x} ${lineEnd.y}`;

  return { path, arrowPath, cp1, cp2, mid };
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

  for (const node of nodes) {
    if (node.id === excludeNodeId) continue;

    for (const side of ALL_CANVAS_SIDES) {
      const anchor = getSideAnchorPoint(node, side);
      const isHorizontal = side === 'top' || side === 'bottom';
      const sideLength = isHorizontal ? node.width : node.height;
      const cornerClearance = Math.min(28, sideLength * 0.25);

      let dist: number;
      if (side === 'top') {
        const clampedX = Math.max(node.x + cornerClearance, Math.min(node.x + node.width - cornerClearance, cursorCanvas.x));
        const dx = cursorCanvas.x - clampedX;
        const dy = cursorCanvas.y - node.y;
        dist = Math.sqrt(dx * dx + dy * dy);
      } else if (side === 'bottom') {
        const clampedX = Math.max(node.x + cornerClearance, Math.min(node.x + node.width - cornerClearance, cursorCanvas.x));
        const dx = cursorCanvas.x - clampedX;
        const dy = cursorCanvas.y - (node.y + node.height);
        dist = Math.sqrt(dx * dx + dy * dy);
      } else if (side === 'left') {
        const clampedY = Math.max(node.y + cornerClearance, Math.min(node.y + node.height - cornerClearance, cursorCanvas.y));
        const dx = cursorCanvas.x - node.x;
        const dy = cursorCanvas.y - clampedY;
        dist = Math.sqrt(dx * dx + dy * dy);
      } else {
        // 'right'
        const clampedY = Math.max(node.y + cornerClearance, Math.min(node.y + node.height - cornerClearance, cursorCanvas.y));
        const dx = cursorCanvas.x - (node.x + node.width);
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

  return closestTarget;
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
