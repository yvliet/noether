import type { EditorView } from '@tiptap/pm/view';
import { Selection } from '@tiptap/pm/state';

export interface LineEdgeResult {
  pos: number;
  isDeadSpace: boolean;
  isLineStart: boolean;
  isLineEnd: boolean;
}

function safeCoordsAtPos(view: EditorView, pos: number, side: number = 1) {
  try {
    const clampedPos = Math.max(0, Math.min(view.state.doc.content.size, pos));
    return view.coordsAtPos(clampedPos, side);
  } catch {
    const pmRect = (view.dom as HTMLElement).getBoundingClientRect();
    return { top: pmRect.top, bottom: pmRect.bottom, left: pmRect.left, right: pmRect.right };
  }
}

/**
 * Calculates document position when clicking or dragging in dead space or line margins.
 *
 * In Chromium, calling `caretPositionFromPoint` on a textblock's trailing whitespace
 * (e.g. clicking empty space to the right of text on a line) returns offset 0 of the
 * block element, causing the caret to jump to the leftmost character of the line.
 * Similarly, clicking in the left margin with naive coordinate clamping (`pmRect.left + 5`)
 * lands inside the first glyph's boundary, causing ProseMirror to round up by +1 character.
 *
 * This function resolves the visual line at `clientY` and inspects its exact screen geometry:
 * - If `clientX` is at or to the left of the line's first glyph (startCoords.left), it snaps
 *   directly to the exact start of that visual line (offset 0, before first character).
 * - If `clientX` is at or to the right of the line's last glyph (endCoords.right), it snaps
 *   directly to the exact end of that visual line (after last character).
 * - If `clientY` is below the editor's last child element, it snaps to the end of the document.
 * - If `clientY` is above the editor's first child element, it snaps to the start of the document.
 */
export function getLineEdgePos(
  view: EditorView | null | undefined,
  clientX: number,
  clientY: number
): number | null {
  const result = getLineEdgeInfo(view, clientX, clientY);
  return result ? result.pos : null;
}

export function getLineEdgeInfo(
  view: EditorView | null | undefined,
  clientX: number,
  clientY: number
): LineEdgeResult | null {
  if (!view || !view.dom || !view.state) return null;
  const doc = view.state.doc;
  if (!doc || doc.content.size === 0) return null;

  const pm = view.dom as HTMLElement;
  const pmRect = pm.getBoundingClientRect();

  const firstChild = pm.firstElementChild as HTMLElement | null;
  const lastChild = pm.lastElementChild as HTMLElement | null;
  const contentTop = firstChild ? firstChild.getBoundingClientRect().top : pmRect.top;
  const contentBottom = lastChild ? lastChild.getBoundingClientRect().bottom : pmRect.bottom;

  // 1. Above first content element: snap to doc start
  if (clientY < contentTop) {
    const pos = Selection.atStart(doc).from;
    return { pos, isDeadSpace: true, isLineStart: true, isLineEnd: false };
  }

  // 2. Below last content element: snap to doc end
  if (clientY > contentBottom) {
    const pos = Selection.atEnd(doc).from;
    return { pos, isDeadSpace: true, isLineStart: false, isLineEnd: true };
  }

  // 3. Probe document at clientY to find the textblock
  const probeLeft = (pmRect.left + pmRect.right) / 2;
  const probe =
    view.posAtCoords({ left: probeLeft, top: clientY }) ||
    view.posAtCoords({ left: pmRect.left + 35, top: clientY });

  let probePos = probe?.pos;
  if (probePos == null) {
    const el = document.elementFromPoint(probeLeft, clientY) as HTMLElement | null;
    if (el && pm.contains(el)) {
      try {
        probePos = view.posAtDOM(el, 0);
      } catch {}
    }
  }

  if (probePos == null) {
    const fallback = Selection.near(doc.resolve(Math.max(1, Math.min(doc.content.size - 1, 1)))).from;
    return { pos: fallback, isDeadSpace: true, isLineStart: false, isLineEnd: false };
  }

  // 4. Resolve position to nearest textblock
  let $pos = doc.resolve(probePos);
  if (!$pos.parent.isTextblock) {
    const nearSel = Selection.near($pos);
    $pos = doc.resolve(nearSel.from);
  }

  const start = $pos.start();
  const end = $pos.end();

  // Empty paragraph / empty line
  if (start >= end) {
    return { pos: start, isDeadSpace: true, isLineStart: true, isLineEnd: true };
  }

  // 5. Binary search for a character on the exact visual line matching clientY
  let low = start;
  let high = end;
  let lineProbePos = $pos.pos;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const coords = safeCoordsAtPos(view, mid, 1);
    if (coords.bottom < clientY) {
      low = mid + 1;
    } else if (coords.top > clientY) {
      high = mid - 1;
    } else {
      lineProbePos = mid;
      break;
    }
    lineProbePos = mid;
  }

  // 6. Expand outward from lineProbePos to find visual line boundaries
  const refCoords =
    lineProbePos === end
      ? safeCoordsAtPos(view, lineProbePos, -1)
      : safeCoordsAtPos(view, lineProbePos, 1);

  let lineStart = lineProbePos;
  while (lineStart > start) {
    const c = safeCoordsAtPos(view, lineStart - 1, 1);
    if (c.bottom <= refCoords.top + 3) break;
    lineStart--;
  }

  let lineEnd = lineProbePos;
  while (lineEnd < end) {
    const c = safeCoordsAtPos(view, lineEnd + 1, -1);
    if (c.top >= refCoords.bottom - 3) break;
    lineEnd++;
  }

  const startCoords = safeCoordsAtPos(view, lineStart, 1);
  const endCoords = safeCoordsAtPos(view, lineEnd, -1);

  // 7. Check horizontal margins relative to visual line bounds
  // Left dead space / margin: cursor is at or to the left of the first glyph
  if (clientX <= startCoords.left + 2) {
    return { pos: lineStart, isDeadSpace: true, isLineStart: true, isLineEnd: false };
  }

  // Right dead space / trailing whitespace: cursor is at or to the right of the last glyph
  if (clientX >= endCoords.right - 2) {
    return { pos: lineEnd, isDeadSpace: true, isLineStart: false, isLineEnd: true };
  }

  // Inside the text of this line: query posAtCoords vertically centered on the line
  const midY = (refCoords.top + refCoords.bottom) / 2;
  const midPos = view.posAtCoords({ left: clientX, top: midY });
  if (midPos && typeof midPos.pos === 'number') {
    const clampedPos = Math.max(lineStart, Math.min(lineEnd, midPos.pos));
    return {
      pos: clampedPos,
      isDeadSpace: false,
      isLineStart: clampedPos === lineStart,
      isLineEnd: clampedPos === lineEnd,
    };
  }

  const fallbackPos = clientX < (startCoords.left + endCoords.right) / 2 ? lineStart : lineEnd;
  return {
    pos: fallbackPos,
    isDeadSpace: false,
    isLineStart: fallbackPos === lineStart,
    isLineEnd: fallbackPos === lineEnd,
  };
}
