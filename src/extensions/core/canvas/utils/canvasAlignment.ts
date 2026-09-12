/**
 * @module canvasAlignment
 * @description
 * Geometric transformation engine for Canvas node alignment, spatial arrangement,
 * gap distribution, and coordinate justification.
 */

import type { CanvasNode } from '../types';

export type CanvasAlignmentType =
  | 'align-left'
  | 'align-center'
  | 'align-right'
  | 'align-top'
  | 'align-middle'
  | 'align-bottom'
  | 'arrange-row'
  | 'arrange-column'
  | 'arrange-grid'
  | 'distribute-horizontal'
  | 'distribute-vertical'
  | 'justify-horizontal'
  | 'justify-vertical';

/**
 * Calculates updated node positions according to the chosen alignment algorithm.
 * Returns a new array of nodes with modified coordinates (does not mutate inputs).
 */
export function alignNodes(
  nodes: CanvasNode[],
  type: CanvasAlignmentType,
  snapToGrid: boolean = false,
  gridSize: number = 20
): CanvasNode[] {
  if (nodes.length < 2) return nodes;

  const step = gridSize > 0 ? gridSize : 20;
  const snap = (val: number) => (snapToGrid ? Math.round(val / step) * step : Math.round(val));

  const bounds = {
    minX: Math.min(...nodes.map((n) => n.x)),
    maxX: Math.max(...nodes.map((n) => n.x + n.width)),
    minY: Math.min(...nodes.map((n) => n.y)),
    maxY: Math.max(...nodes.map((n) => n.y + n.height)),
  };
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  switch (type) {
    case 'align-left': {
      const targetX = snap(bounds.minX);
      return nodes.map((n) => ({ ...n, x: targetX }));
    }

    case 'align-center': {
      return nodes.map((n) => ({
        ...n,
        x: snap(centerX - n.width / 2),
      }));
    }

    case 'align-right': {
      return nodes.map((n) => ({
        ...n,
        x: snap(bounds.maxX - n.width),
      }));
    }

    case 'align-top': {
      const targetY = snap(bounds.minY);
      return nodes.map((n) => ({ ...n, y: targetY }));
    }

    case 'align-middle': {
      return nodes.map((n) => ({
        ...n,
        y: snap(centerY - n.height / 2),
      }));
    }

    case 'align-bottom': {
      return nodes.map((n) => ({
        ...n,
        y: snap(bounds.maxY - n.height),
      }));
    }

    case 'arrange-row': {
      const sorted = [...nodes].sort((a, b) => a.x - b.x);
      const gap = snapToGrid ? Math.max(step, Math.round(24 / step) * step) : 24;
      const startX = snap(bounds.minX);
      const targetY = snap(bounds.minY);

      let currentX = startX;
      const resultMap = new Map<string, { x: number; y: number }>();
      for (const node of sorted) {
        resultMap.set(node.id, { x: currentX, y: targetY });
        currentX += node.width + gap;
      }

      return nodes.map((n) => {
        const pos = resultMap.get(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      });
    }

    case 'arrange-column': {
      const sorted = [...nodes].sort((a, b) => a.y - b.y);
      const gap = snapToGrid ? Math.max(step, Math.round(24 / step) * step) : 24;
      const startY = snap(bounds.minY);
      const targetX = snap(bounds.minX);

      let currentY = startY;
      const resultMap = new Map<string, { x: number; y: number }>();
      for (const node of sorted) {
        resultMap.set(node.id, { x: targetX, y: currentY });
        currentY += node.height + gap;
      }

      return nodes.map((n) => {
        const pos = resultMap.get(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      });
    }

    case 'arrange-grid': {
      // Sort reading order: top-to-bottom, then left-to-right
      const sorted = [...nodes].sort((a, b) => {
        const yDiff = a.y - b.y;
        if (Math.abs(yDiff) > 30) return yDiff;
        return a.x - b.x;
      });

      const cols = Math.ceil(Math.sqrt(nodes.length));
      const gap = snapToGrid ? Math.max(step, Math.round(24 / step) * step) : 24;
      const startX = snap(bounds.minX);
      const startY = snap(bounds.minY);

      const maxW = Math.max(...nodes.map((n) => n.width));
      const maxH = Math.max(...nodes.map((n) => n.height));
      const cellW = snapToGrid ? Math.ceil(maxW / step) * step : maxW;
      const cellH = snapToGrid ? Math.ceil(maxH / step) * step : maxH;

      const resultMap = new Map<string, { x: number; y: number }>();
      sorted.forEach((node, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        resultMap.set(node.id, {
          x: startX + c * (cellW + gap),
          y: startY + r * (cellH + gap),
        });
      });

      return nodes.map((n) => {
        const pos = resultMap.get(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      });
    }

    case 'distribute-horizontal': {
      if (nodes.length < 3) return nodes;
      const sorted = [...nodes].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const totalSpan = last.x + last.width - first.x;
      const totalWidths = sorted.reduce((acc, item) => acc + item.width, 0);
      const innerSlots = sorted.length - 1;
      let equalGap = (totalSpan - totalWidths) / innerSlots;
      if (equalGap < 0) equalGap = 20;

      const resultMap = new Map<string, number>();
      resultMap.set(first.id, first.x);
      resultMap.set(last.id, last.x);

      let curX = first.x + first.width + equalGap;
      for (let i = 1; i < sorted.length - 1; i++) {
        resultMap.set(sorted[i].id, snap(curX));
        curX += sorted[i].width + equalGap;
      }

      return nodes.map((n) => {
        const newX = resultMap.get(n.id);
        return newX !== undefined ? { ...n, x: newX } : n;
      });
    }

    case 'distribute-vertical': {
      if (nodes.length < 3) return nodes;
      const sorted = [...nodes].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const totalSpan = last.y + last.height - first.y;
      const totalHeights = sorted.reduce((acc, item) => acc + item.height, 0);
      const innerSlots = sorted.length - 1;
      let equalGap = (totalSpan - totalHeights) / innerSlots;
      if (equalGap < 0) equalGap = 20;

      const resultMap = new Map<string, number>();
      resultMap.set(first.id, first.y);
      resultMap.set(last.id, last.y);

      let curY = first.y + first.height + equalGap;
      for (let i = 1; i < sorted.length - 1; i++) {
        resultMap.set(sorted[i].id, snap(curY));
        curY += sorted[i].height + equalGap;
      }

      return nodes.map((n) => {
        const newY = resultMap.get(n.id);
        return newY !== undefined ? { ...n, y: newY } : n;
      });
    }

    case 'justify-horizontal': {
      const sorted = [...nodes].sort((a, b) => a.x + a.width / 2 - (b.x + b.width / 2));
      const firstCenter = sorted[0].x + sorted[0].width / 2;
      const lastCenter = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width / 2;
      const stepDist = (lastCenter - firstCenter) / (sorted.length - 1);

      const resultMap = new Map<string, number>();
      sorted.forEach((node, i) => {
        const targetCenter = firstCenter + i * stepDist;
        resultMap.set(node.id, snap(targetCenter - node.width / 2));
      });

      return nodes.map((n) => {
        const newX = resultMap.get(n.id);
        return newX !== undefined ? { ...n, x: newX } : n;
      });
    }

    case 'justify-vertical': {
      const sorted = [...nodes].sort((a, b) => a.y + a.height / 2 - (b.y + b.height / 2));
      const firstCenter = sorted[0].y + sorted[0].height / 2;
      const lastCenter = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height / 2;
      const stepDist = (lastCenter - firstCenter) / (sorted.length - 1);

      const resultMap = new Map<string, number>();
      sorted.forEach((node, i) => {
        const targetCenter = firstCenter + i * stepDist;
        resultMap.set(node.id, snap(targetCenter - node.height / 2));
      });

      return nodes.map((n) => {
        const newY = resultMap.get(n.id);
        return newY !== undefined ? { ...n, y: newY } : n;
      });
    }

    default:
      return nodes;
  }
}
