import { CanvasNode } from '../types';

export interface AlignmentPoint {
  x: number;
  y: number;
}

export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points: AlignmentPoint[];
  isCenter?: boolean;
}

export interface CanvasViewport {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SnapResult {
  x: number;
  y: number;
  guides: AlignmentGuide[];
}

interface SnapCandidate {
  delta: number;
  snapLine: number;
  isCenterToCenter: boolean;
}

/**
 * Calculates magnetic snapping between an active node and all other nodes on the canvas.
 * Produces alignment guidelines and corner / center dots matching modern design tool standards:
 * - When a card aligns by its center, only its center dot is drawn and the line stops at its center (not fullwidth).
 * - When a card aligns by an edge, its edge corner dots are drawn and the line spans along that edge.
 * - Out-of-view objects outside the visible canvas viewport are never snapped to.
 * - Guidelines connect all participating anchor points with zero lag or smoothing.
 */
export function calculateObjectSnap(
  draggedId: string,
  rawX: number,
  rawY: number,
  fallbackX: number,
  fallbackY: number,
  width: number,
  height: number,
  allNodes: CanvasNode[],
  threshold: number = 7,
  viewport?: CanvasViewport,
  ignoredNodeIds?: Set<string> | string[]
): SnapResult {
  const ignoredSet = ignoredNodeIds
    ? (ignoredNodeIds instanceof Set ? ignoredNodeIds : new Set(ignoredNodeIds))
    : null;

  const otherNodes = allNodes.filter((n) => {
    if (n.id === draggedId) return false;
    if (ignoredSet && ignoredSet.has(n.id)) return false;
    if (viewport) {
      const nW = n.width || 260;
      const nH = n.height || 180;
      // Target object must intersect the visible canvas viewport to participate in snapping
      const inView =
        n.x + nW >= viewport.left &&
        n.x <= viewport.right &&
        n.y + nH >= viewport.top &&
        n.y <= viewport.bottom;
      if (!inView) return false;
    }
    return true;
  });

  if (otherNodes.length === 0) {
    return { x: fallbackX, y: fallbackY, guides: [] };
  }

  // --- X AXIS ALIGNMENT (Vertical Guide Line) ---
  const rawRight = rawX + width;
  const rawCenterX = rawX + width / 2;

  let bestCandidateX: SnapCandidate | null = null;

  for (const other of otherNodes) {
    const oWidth = other.width || 260;
    const oLeft = other.x;
    const oRight = other.x + oWidth;
    const oCenterX = other.x + oWidth / 2;

    const candidates: SnapCandidate[] = [
      // 1. Center to Center
      { delta: oCenterX - rawCenterX, snapLine: oCenterX, isCenterToCenter: true },
      // 2. Dragged Center to other Left / Right
      { delta: oLeft - rawCenterX, snapLine: oLeft, isCenterToCenter: false },
      { delta: oRight - rawCenterX, snapLine: oRight, isCenterToCenter: false },
      // 3. Dragged Left / Right to other Center
      { delta: oCenterX - rawX, snapLine: oCenterX, isCenterToCenter: false },
      { delta: oCenterX - rawRight, snapLine: oCenterX, isCenterToCenter: false },
      // 4. Edge to Edge
      { delta: oLeft - rawX, snapLine: oLeft, isCenterToCenter: false },
      { delta: oRight - rawRight, snapLine: oRight, isCenterToCenter: false },
      { delta: oRight - rawX, snapLine: oRight, isCenterToCenter: false },
      { delta: oLeft - rawRight, snapLine: oLeft, isCenterToCenter: false },
    ];

    for (const cand of candidates) {
      const absDelta = Math.abs(cand.delta);
      if (absDelta <= threshold) {
        if (!bestCandidateX) {
          bestCandidateX = cand;
        } else {
          const currentAbs = Math.abs(bestCandidateX.delta);
          if (absDelta < currentAbs - 0.25) {
            bestCandidateX = cand;
          } else if (Math.abs(absDelta - currentAbs) <= 0.25 && cand.isCenterToCenter) {
            bestCandidateX = cand;
          }
        }
      }
    }
  }

  // --- Y AXIS ALIGNMENT (Horizontal Guide Line) ---
  const rawBottom = rawY + height;
  const rawCenterY = rawY + height / 2;

  let bestCandidateY: SnapCandidate | null = null;

  for (const other of otherNodes) {
    const oHeight = other.height || 180;
    const oTop = other.y;
    const oBottom = other.y + oHeight;
    const oCenterY = other.y + oHeight / 2;

    const candidates: SnapCandidate[] = [
      // 1. Center to Center
      { delta: oCenterY - rawCenterY, snapLine: oCenterY, isCenterToCenter: true },
      // 2. Dragged Center to other Top / Bottom (matches user target media_1789052836852.png)
      { delta: oTop - rawCenterY, snapLine: oTop, isCenterToCenter: false },
      { delta: oBottom - rawCenterY, snapLine: oBottom, isCenterToCenter: false },
      // 3. Dragged Top / Bottom to other Center
      { delta: oCenterY - rawY, snapLine: oCenterY, isCenterToCenter: false },
      { delta: oCenterY - rawBottom, snapLine: oCenterY, isCenterToCenter: false },
      // 4. Edge to Edge
      { delta: oTop - rawY, snapLine: oTop, isCenterToCenter: false },
      { delta: oBottom - rawBottom, snapLine: oBottom, isCenterToCenter: false },
      { delta: oBottom - rawY, snapLine: oBottom, isCenterToCenter: false },
      { delta: oTop - rawBottom, snapLine: oTop, isCenterToCenter: false },
    ];

    for (const cand of candidates) {
      const absDelta = Math.abs(cand.delta);
      if (absDelta <= threshold) {
        if (!bestCandidateY) {
          bestCandidateY = cand;
        } else {
          const currentAbs = Math.abs(bestCandidateY.delta);
          if (absDelta < currentAbs - 0.25) {
            bestCandidateY = cand;
          } else if (Math.abs(absDelta - currentAbs) <= 0.25 && cand.isCenterToCenter) {
            bestCandidateY = cand;
          }
        }
      }
    }
  }

  // Compute final card coordinates on both axes
  const finalX = bestCandidateX ? rawX + bestCandidateX.delta : fallbackX;
  const finalY = bestCandidateY ? rawY + bestCandidateY.delta : fallbackY;

  const guides: AlignmentGuide[] = [];

  // --- Construct Vertical Guide (X Axis Alignment) ---
  if (bestCandidateX) {
    const snapLine = bestCandidateX.snapLine;
    const points: AlignmentPoint[] = [];

    // Dragged card anchor points
    const draggedCenterX = finalX + width / 2;
    if (Math.abs(draggedCenterX - snapLine) < 1.5) {
      // Center aligned: only the center dot, line stops at center (not fullheight)
      points.push({ x: snapLine, y: finalY + height / 2 });
    } else {
      // Edge aligned: corner dots along the aligned edge
      if (Math.abs(finalX - snapLine) < 1.5 || Math.abs(finalX + width - snapLine) < 1.5) {
        points.push({ x: snapLine, y: finalY });
        points.push({ x: snapLine, y: finalY + height });
      }
    }

    // Other cards anchor points
    for (const other of otherNodes) {
      const oWidth = other.width || 260;
      const oHeight = other.height || 180;
      const oLeft = other.x;
      const oRight = other.x + oWidth;
      const oCenterX = other.x + oWidth / 2;

      if (Math.abs(oCenterX - snapLine) < 1.5) {
        // Center aligned: only the center dot
        points.push({ x: snapLine, y: other.y + oHeight / 2 });
      }
      if (Math.abs(oLeft - snapLine) < 1.5 || Math.abs(oRight - snapLine) < 1.5) {
        // Edge aligned: corner dots
        points.push({ x: snapLine, y: other.y });
        points.push({ x: snapLine, y: other.y + oHeight });
      }
    }

    const seen = new Set<string>();
    const uniquePoints = points.filter((p) => {
      const key = `${Math.round(p.x)},${Math.round(p.y)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniquePoints.length >= 2) {
      const allY = uniquePoints.map((p) => p.y);
      const minY = Math.min(...allY);
      const maxY = Math.max(...allY);

      guides.push({
        type: 'vertical',
        x1: snapLine,
        y1: minY,
        x2: snapLine,
        y2: maxY,
        points: uniquePoints,
        isCenter: bestCandidateX.isCenterToCenter,
      });
    }
  }

  // --- Construct Horizontal Guide (Y Axis Alignment) ---
  if (bestCandidateY) {
    const snapLine = bestCandidateY.snapLine;
    const points: AlignmentPoint[] = [];

    // Dragged card anchor points
    const draggedCenterY = finalY + height / 2;
    if (Math.abs(draggedCenterY - snapLine) < 1.5) {
      // Center aligned: only the center dot, line stops at center (not fullwidth)
      points.push({ x: finalX + width / 2, y: snapLine });
    } else {
      // Edge aligned: corner dots along the aligned edge
      if (Math.abs(finalY - snapLine) < 1.5 || Math.abs(finalY + height - snapLine) < 1.5) {
        points.push({ x: finalX, y: snapLine });
        points.push({ x: finalX + width, y: snapLine });
      }
    }

    // Other cards anchor points
    for (const other of otherNodes) {
      const oWidth = other.width || 260;
      const oHeight = other.height || 180;
      const oTop = other.y;
      const oBottom = other.y + oHeight;
      const oCenterY = other.y + oHeight / 2;

      if (Math.abs(oCenterY - snapLine) < 1.5) {
        // Center aligned: only the center dot
        points.push({ x: other.x + oWidth / 2, y: snapLine });
      }
      if (Math.abs(oTop - snapLine) < 1.5 || Math.abs(oBottom - snapLine) < 1.5) {
        // Edge aligned: corner dots
        points.push({ x: other.x, y: snapLine });
        points.push({ x: other.x + oWidth, y: snapLine });
      }
    }

    const seen = new Set<string>();
    const uniquePoints = points.filter((p) => {
      const key = `${Math.round(p.x)},${Math.round(p.y)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniquePoints.length >= 2) {
      const allX = uniquePoints.map((p) => p.x);
      const minX = Math.min(...allX);
      const maxX = Math.max(...allX);

      guides.push({
        type: 'horizontal',
        x1: minX,
        y1: snapLine,
        x2: maxX,
        y2: snapLine,
        points: uniquePoints,
        isCenter: bestCandidateY.isCenterToCenter,
      });
    }
  }

  return {
    x: Math.round(finalX),
    y: Math.round(finalY),
    guides,
  };
}
