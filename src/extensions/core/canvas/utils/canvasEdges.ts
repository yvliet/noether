/**
 * @module canvasEdges
 * @description
 * Spatial mathematics and path calculations for canvas card edge connections.
 * Handles side anchor coordinates, cubic Bezier curve generation, directional tangent
 * vectors, and magnetic proximity snapping for interactive edge creation.
 */

import type {
  CanvasNode,
  CanvasNodeSide,
  CanvasEdgeDirection,
  CanvasEdgeStyle,
  CanvasControlPoint,
} from '../types';

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

export interface EdgePathResult {
  path: string;
  arrowPath: string;
  sourceArrowPath?: string;
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
  mid: { x: number; y: number };
}

export type BezierCurveResult = EdgePathResult & {
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
};

/**
 * Generates a cubic Bezier curve path connecting two points with directional curvature.
 * Supports manual control point offset bending via Shift+drag.
 * The curve body terminates at the base center of any arrowheads without penetrating inside them.
 */
export function computeBezierPath(
  p1: { x: number; y: number },
  side1: CanvasNodeSide,
  p2: { x: number; y: number },
  side2?: CanvasNodeSide,
  arrowLength = 12,
  arrowWidth = 13,
  direction: CanvasEdgeDirection = 'unidirectional',
  controlPoints?: CanvasControlPoint[]
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
    // Drafting toward a free-floating pointer
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

  // Apply custom control point bend offset if defined
  if (controlPoints && controlPoints.length > 0) {
    const bend = controlPoints[0];
    if (bend && (bend.x !== 0 || bend.y !== 0)) {
      // Shifting both control points by (offset / 0.75) shifts the curve midpoint at t=0.5 exactly by offset
      cp1.x += bend.x * 1.3333;
      cp1.y += bend.y * 1.3333;
      cp2.x += bend.x * 1.3333;
      cp2.y += bend.y * 1.3333;
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

  // Midpoint at t = 0.5 along the visible curve for controls and labels
  const mid = {
    x: 0.125 * lineStart.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * lineEnd.x,
    y: 0.125 * lineStart.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * lineEnd.y,
  };

  const path = `M ${lineStart.x} ${lineStart.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${lineEnd.x} ${lineEnd.y}`;

  return { path, arrowPath, sourceArrowPath, cp1, cp2, mid };
}

/**
 * Builds an SVG path with smooth circular rounded corner fillets (radius R)
 * given a sequence of orthogonal waypoints.
 */
function renderRoundedOrthogonalPath(
  points: Array<{ x: number; y: number }>,
  radius = 10
): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.hypot(dx2, dy2);

    if (len1 < 1e-4 || len2 < 1e-4) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const u1 = { x: dx1 / len1, y: dy1 / len1 };
    const u2 = { x: dx2 / len2, y: dy2 / len2 };

    // Limit corner radius to at most half the length of incoming or outgoing segment
    const r = Math.min(radius, len1 / 2, len2 / 2);

    const startX = curr.x - u1.x * r;
    const startY = curr.y - u1.y * r;
    const endX = curr.x + u2.x * r;
    const endY = curr.y + u2.y * r;

    d += ` L ${startX} ${startY} Q ${curr.x} ${curr.y} ${endX} ${endY}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Calculates the exact point at 50% along an orthogonal polyline sequence.
 */
function getPolylineMidpoint(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  let totalLength = 0;
  const segLengths: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segLengths.push(l);
    totalLength += l;
  }

  if (totalLength === 0) return points[0];

  let half = totalLength / 2;
  for (let i = 0; i < segLengths.length; i++) {
    const l = segLengths[i];
    if (half <= l) {
      const t = half / l;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    }
    half -= l;
  }

  return points[points.length - 1];
}

/**
 * Removes redundant collinear intermediate points from an orthogonal polyline sequence.
 */
function simplifyCollinearPoints(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length <= 2) return points;
  const result: Array<{ x: number; y: number }> = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const isCollinearX = Math.abs(dy1) < 1e-4 && Math.abs(dy2) < 1e-4 && (dx1 * dx2 > 0);
    const isCollinearY = Math.abs(dx1) < 1e-4 && Math.abs(dx2) < 1e-4 && (dy1 * dy2 > 0);

    if (!isCollinearX && !isCollinearY) {
      result.push(curr);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Generates a smooth 90-degree orthogonal step path with rounded corner fillets.
 */
export function computeStepPath(
  p1: { x: number; y: number },
  side1: CanvasNodeSide,
  p2: { x: number; y: number },
  side2?: CanvasNodeSide,
  arrowLength = 12,
  arrowWidth = 13,
  direction: CanvasEdgeDirection = 'unidirectional',
  controlPoints?: CanvasControlPoint[]
): EdgePathResult {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const v1 = getSideVector(side1);
  let targetTangent: { x: number; y: number };

  if (side2) {
    const v2 = getSideVector(side2);
    targetTangent = { x: -v2.x, y: -v2.y };
  } else {
    targetTangent = { x: v1.x, y: v1.y };
  }

  const hasTargetArrow = direction === 'unidirectional' || direction === 'bidirectional';
  const hasSourceArrow = direction === 'bidirectional';

  const effectiveLength = Math.min(arrowLength, Math.max(2, dist * 0.5));
  const effectiveWidth = (effectiveLength / arrowLength) * arrowWidth;

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

  const bendOffset = controlPoints?.[0] || { x: 0, y: 0 };
  const stub = Math.min(24, Math.max(12, dist * 0.12));

  // Determine orthogonal route waypoints
  const waypoints: Array<{ x: number; y: number }> = [{ x: lineStart.x, y: lineStart.y }];

  const isH1 = side1 === 'left' || side1 === 'right';
  const isH2 = side2 ? side2 === 'left' || side2 === 'right' : isH1;

  if (isH1 && isH2) {
    // Both horizontal
    const forwardX = (lineEnd.x - lineStart.x) * v1.x;
    if (forwardX > stub * 2) {
      const midX = (lineStart.x + lineEnd.x) / 2 + bendOffset.x;
      waypoints.push({ x: midX, y: lineStart.y });
      waypoints.push({ x: midX, y: lineEnd.y });
    } else {
      const sX = lineStart.x + v1.x * (stub + Math.abs(bendOffset.x));
      const midY = (lineStart.y + lineEnd.y) / 2 + bendOffset.y;
      const v2 = side2 ? getSideVector(side2) : { x: -v1.x, y: 0 };
      const eX = lineEnd.x + v2.x * (stub + Math.abs(bendOffset.x));
      waypoints.push({ x: sX, y: lineStart.y });
      waypoints.push({ x: sX, y: midY });
      waypoints.push({ x: eX, y: midY });
      waypoints.push({ x: eX, y: lineEnd.y });
    }
  } else if (!isH1 && !isH2) {
    // Both vertical
    const forwardY = (lineEnd.y - lineStart.y) * v1.y;
    if (forwardY > stub * 2) {
      const midY = (lineStart.y + lineEnd.y) / 2 + bendOffset.y;
      waypoints.push({ x: lineStart.x, y: midY });
      waypoints.push({ x: lineEnd.x, y: midY });
    } else {
      const sY = lineStart.y + v1.y * (stub + Math.abs(bendOffset.y));
      const midX = (lineStart.x + lineEnd.x) / 2 + bendOffset.x;
      const v2 = side2 ? getSideVector(side2) : { x: 0, y: -v1.y };
      const eY = lineEnd.y + v2.y * (stub + Math.abs(bendOffset.y));
      waypoints.push({ x: lineStart.x, y: sY });
      waypoints.push({ x: midX, y: sY });
      waypoints.push({ x: midX, y: eY });
      waypoints.push({ x: lineEnd.x, y: eY });
    }
  } else if (isH1 && !isH2) {
    // Horizontal start, vertical end
    const forwardX = (lineEnd.x - lineStart.x) * v1.x;
    const v2 = side2 ? getSideVector(side2) : { x: 0, y: 1 };
    const isInsideOrOpposite = (lineStart.y - lineEnd.y) * v2.y <= 10;
    const hasCustomBend = Math.abs(bendOffset.x) > 1 || Math.abs(bendOffset.y) > 1;

    if (forwardX < 0) {
      // Exiting backwards from source port: stub out before turning
      const exitX = lineStart.x + v1.x * (stub + Math.abs(bendOffset.x));
      const midY = (lineStart.y + lineEnd.y) / 2 + bendOffset.y;
      waypoints.push({ x: exitX, y: lineStart.y });
      waypoints.push({ x: exitX, y: midY });
      waypoints.push({ x: lineEnd.x, y: midY });
    } else if (isInsideOrOpposite || hasCustomBend) {
      // Route around outside the card and allow user to shift the vertical segment freely
      const splitX = (lineStart.x + lineEnd.x) / 2 + bendOffset.x;
      const baseOffset = v2.y > 0 ? Math.max(lineStart.y, lineEnd.y + stub) : Math.min(lineStart.y, lineEnd.y - stub);
      const cornerY = baseOffset + v2.y * Math.max(0, bendOffset.y * v2.y);

      waypoints.push({ x: splitX, y: lineStart.y });
      waypoints.push({ x: splitX, y: cornerY });
      waypoints.push({ x: lineEnd.x, y: cornerY });
    } else {
      // Clean single 90-degree rotation
      waypoints.push({ x: lineEnd.x, y: lineStart.y });
    }
  } else {
    // Vertical start, horizontal end
    const forwardY = (lineEnd.y - lineStart.y) * v1.y;
    const v2 = side2 ? getSideVector(side2) : { x: 1, y: 0 };
    const isInsideOrOpposite = (lineStart.x - lineEnd.x) * v2.x <= 10;
    const hasCustomBend = Math.abs(bendOffset.x) > 1 || Math.abs(bendOffset.y) > 1;

    if (forwardY < 0) {
      // Exiting backwards from source port: stub out before turning
      const exitY = lineStart.y + v1.y * (stub + Math.abs(bendOffset.y));
      const midX = (lineStart.x + lineEnd.x) / 2 + bendOffset.x;
      waypoints.push({ x: lineStart.x, y: exitY });
      waypoints.push({ x: midX, y: exitY });
      waypoints.push({ x: midX, y: lineEnd.y });
    } else if (isInsideOrOpposite || hasCustomBend) {
      // Route around outside the card and allow user to shift the horizontal segment freely
      const splitY = (lineStart.y + lineEnd.y) / 2 + bendOffset.y;
      const baseOffset = v2.x > 0 ? Math.max(lineStart.x, lineEnd.x + stub) : Math.min(lineStart.x, lineEnd.x - stub);
      const cornerX = baseOffset + v2.x * Math.max(0, bendOffset.x * v2.x);

      waypoints.push({ x: lineStart.x, y: splitY });
      waypoints.push({ x: cornerX, y: splitY });
      waypoints.push({ x: cornerX, y: lineEnd.y });
    } else {
      // Clean single 90-degree rotation
      waypoints.push({ x: lineStart.x, y: lineEnd.y });
    }
  }

  waypoints.push({ x: lineEnd.x, y: lineEnd.y });

  // Deduplicate consecutive identical points
  const cleanPoints: Array<{ x: number; y: number }> = [waypoints[0]];
  for (let i = 1; i < waypoints.length; i++) {
    const last = cleanPoints[cleanPoints.length - 1];
    if (Math.hypot(waypoints[i].x - last.x, waypoints[i].y - last.y) > 0.5) {
      cleanPoints.push(waypoints[i]);
    }
  }

  // Remove redundant collinear intermediate points so straight lines stay straight
  const finalPoints = simplifyCollinearPoints(cleanPoints);
  const path = renderRoundedOrthogonalPath(finalPoints, 10);
  const mid = getPolylineMidpoint(finalPoints);

  return { path, arrowPath, sourceArrowPath, mid };
}

/**
 * Generates a direct straight line between two card anchor points.
 */
export function computeStraightPath(
  p1: { x: number; y: number },
  side1: CanvasNodeSide,
  p2: { x: number; y: number },
  side2?: CanvasNodeSide,
  arrowLength = 12,
  arrowWidth = 13,
  direction: CanvasEdgeDirection = 'unidirectional'
): EdgePathResult {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const u = dist > 0.001 ? { x: dx / dist, y: dy / dist } : { x: 1, y: 0 };

  const hasTargetArrow = direction === 'unidirectional' || direction === 'bidirectional';
  const hasSourceArrow = direction === 'bidirectional';

  const effectiveLength = Math.min(arrowLength, Math.max(2, dist * 0.5));
  const effectiveWidth = (effectiveLength / arrowLength) * arrowWidth;

  let arrowPath = '';
  let lineEnd = p2;
  if (hasTargetArrow) {
    const tip = p2;
    const baseCenter = {
      x: p2.x - u.x * effectiveLength,
      y: p2.y - u.y * effectiveLength,
    };
    const normal = {
      x: -u.y,
      y: u.x,
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
      x: p2.x - u.x * Math.max(0, effectiveLength - 1),
      y: p2.y - u.y * Math.max(0, effectiveLength - 1),
    };
  }

  let sourceArrowPath = '';
  let lineStart = p1;
  if (hasSourceArrow) {
    const tip = p1;
    const baseCenter = {
      x: p1.x + u.x * effectiveLength,
      y: p1.y + u.y * effectiveLength,
    };
    const normal = {
      x: -u.y,
      y: u.x,
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
      x: p1.x + u.x * Math.max(0, effectiveLength - 1),
      y: p1.y + u.y * Math.max(0, effectiveLength - 1),
    };
  }

  const mid = {
    x: (lineStart.x + lineEnd.x) / 2,
    y: (lineStart.y + lineEnd.y) / 2,
  };

  const path = `M ${lineStart.x} ${lineStart.y} L ${lineEnd.x} ${lineEnd.y}`;

  return { path, arrowPath, sourceArrowPath, mid };
}

/**
 * Unified edge routing geometry dispatcher supporting Bezier curves,
 * smooth 90° step orthogonal paths, and direct straight lines.
 */
export function computeEdgeGeometry(
  p1: { x: number; y: number },
  side1: CanvasNodeSide,
  p2: { x: number; y: number },
  side2?: CanvasNodeSide,
  style: CanvasEdgeStyle = 'bezier',
  arrowLength = 12,
  arrowWidth = 13,
  direction: CanvasEdgeDirection = 'unidirectional',
  controlPoints?: CanvasControlPoint[]
): EdgePathResult {
  switch (style) {
    case 'step':
      return computeStepPath(
        p1,
        side1,
        p2,
        side2,
        arrowLength,
        arrowWidth,
        direction,
        controlPoints
      );
    case 'straight':
      return computeStraightPath(
        p1,
        side1,
        p2,
        side2,
        arrowLength,
        arrowWidth,
        direction
      );
    case 'bezier':
    default:
      return computeBezierPath(
        p1,
        side1,
        p2,
        side2,
        arrowLength,
        arrowWidth,
        direction,
        controlPoints
      );
  }
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
