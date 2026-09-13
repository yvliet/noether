import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { setupMathLive } from './mathlive-setup';

export const MathLiveWysiwygPluginKey = new PluginKey('mathLiveWysiwyg');

/**
 * Finds the math delimiter range around a given position in the document.
 */
export function findMathRangeAtPos(doc: any, pos: number): {
  from: number;
  to: number;
  contentStart: number;
  contentEnd: number;
  latex: string;
  isBlock: boolean;
} | null {
  const $pos = doc.resolve(Math.min(pos, doc.content.size));
  const parent = $pos.parent;
  if (!parent || !parent.isTextblock) return null;

  const blockStart = $pos.start();
  const text = parent.textContent;
  if (!text || !text.includes('$')) return null;
  const offset = pos - blockStart;

  // 1. Check for block math: $$...$$
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;
  let bMatch: RegExpExecArray | null;
  while ((bMatch = blockRegex.exec(text)) !== null) {
    const mStart = bMatch.index;
    const mEnd = mStart + bMatch[0].length;
    if (offset >= mStart && offset <= mEnd) {
      return {
        from: blockStart + mStart,
        to: blockStart + mEnd,
        contentStart: blockStart + mStart + 2,
        contentEnd: blockStart + mEnd - 2,
        latex: bMatch[1],
        isBlock: true,
      };
    }
  }

  // 2. Check for inline math: $...$
  const inlineRegex = /(?:^|[^\$])\$([^\$\n]*)\$(?:[^\$]|$)/g;
  let iMatch: RegExpExecArray | null;
  while ((iMatch = inlineRegex.exec(text)) !== null) {
    const fullMatch = iMatch[0];
    const startOff = fullMatch.startsWith('$') ? 0 : 1;
    const endOff = fullMatch.endsWith('$') ? 0 : 1;
    const mStart = iMatch.index + startOff;
    const mEnd = iMatch.index + fullMatch.length - endOff;
    if (offset >= mStart && offset <= mEnd) {
      return {
        from: blockStart + mStart,
        to: blockStart + mEnd,
        contentStart: blockStart + mStart + 1,
        contentEnd: blockStart + mEnd - 1,
        latex: iMatch[1],
        isBlock: false,
      };
    }
  }

  return null;
}

export const MathLiveWysiwyg = Extension.create({
  name: 'mathLiveWysiwyg',

  onCreate() {
    setupMathLive();
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: MathLiveWysiwygPluginKey,
        props: {
          handleDOMEvents: {
            // Clicking on a rendered math element places the cursor inside and activates the WYSIWYG MathField
            click(view, event) {
              const target = event.target as HTMLElement;
              const mathEl = target.closest('.md-math-inline, .md-math-block') as HTMLElement | null;
              if (!mathEl) return false;

              const coords = { left: event.clientX, top: event.clientY };
              const posInfo = view.posAtCoords(coords);
              if (!posInfo) return false;

              const mathRange = findMathRangeAtPos(view.state.doc, posInfo.pos);
              if (!mathRange) return false;

              event.preventDefault();
              event.stopPropagation();

              view.focus();
              const tr = view.state.tr.setSelection(
                (view.state.selection.constructor as any).near(view.state.doc.resolve(mathRange.contentStart))
              );
              view.dispatch(tr);

              return true;
            },
          },
        },
      }),
    ];
  },
});
