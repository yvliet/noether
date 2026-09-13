import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { findMathRangeAtPos } from './mathlive-wysiwyg';

export const SmartMathNavigationPluginKey = new PluginKey('smartMathNavigation');

function findMatchingBrace(text: string, openIndex: number): number {
  if (text[openIndex] !== '{') return -1;
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

interface FractionInfo {
  start: number;
  end: number;
  numStart: number; // inner start (0-indexed in latex)
  numEnd: number;   // inner end
  denStart: number; // inner start
  denEnd: number;   // inner end
}

function parseFractions(latex: string): FractionInfo[] {
  const fractions: FractionInfo[] = [];
  const fracRegex = /\\frac\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = fracRegex.exec(latex)) !== null) {
    const fracStart = m.index;
    const numOpen = m.index + m[0].length - 1;
    const numClose = findMatchingBrace(latex, numOpen);
    if (numClose !== -1) {
      const afterNum = latex.slice(numClose + 1);
      const denMatch = afterNum.match(/^\s*\{/);
      if (denMatch) {
        const denOpen = numClose + 1 + denMatch.index! + denMatch[0].length - 1;
        const denClose = findMatchingBrace(latex, denOpen);
        if (denClose !== -1) {
          fractions.push({
            start: fracStart,
            end: denClose + 1,
            numStart: numOpen + 1,
            numEnd: numClose,
            denStart: denOpen + 1,
            denEnd: denClose,
          });
        }
      }
    }
  }
  return fractions;
}

interface ScriptInfo {
  basePos: number;
  innerStart: number;
  innerEnd: number;
}

function parseScripts(latex: string, prefix: '^' | '_'): ScriptInfo[] {
  const scripts: ScriptInfo[] = [];
  const regex = prefix === '^' ? /\^\{/g : /_\{/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(latex)) !== null) {
    const innerStart = m.index + 2;
    const close = findMatchingBrace(latex, innerStart - 1);
    if (close !== -1) {
      scripts.push({
        basePos: m.index,
        innerStart,
        innerEnd: close,
      });
    }
  }
  return scripts;
}

function parseSlots(latex: string): { start: number; end: number }[] {
  const slots: { start: number; end: number }[] = [];
  for (let i = 0; i < latex.length; i++) {
    if (latex[i] === '{') {
      const close = findMatchingBrace(latex, i);
      if (close !== -1) {
        slots.push({ start: i + 1, end: close });
      }
    }
  }
  return slots;
}

/**
 * Smart keyboard editing and navigation inside LaTeX formulas:
 * - '/' creates fractions from selection, preceding term, parentheses, or inserts \frac{}{}
 * - '^' auto-pairs '^{}' for powers
 * - '_' auto-pairs '_{}' for subscripts
 * - '{' auto-pairs '{}' for argument groups
 * - Up / Down arrows navigate between fraction numerator and denominator,
 *   as well as between base and superscripts/subscripts.
 * - Tab / Shift-Tab jumps between argument slots {...} or out of math.
 */
export const SmartMathNavigation = Extension.create({
  name: 'smartMathNavigation',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: SmartMathNavigationPluginKey,
        props: {
          handleKeyDown(view, event) {
            if (event.ctrlKey || event.metaKey || event.altKey) return false;

            const { state } = view;
            const { selection } = state;
            const { from, to, empty, $from } = selection;
            const parentText = $from?.parent?.textContent;
            if (!parentText || !parentText.includes('$')) return false;

            const mathRange = findMathRangeAtPos(state.doc, from);
            if (!mathRange) return false;

            const { contentStart, contentEnd, latex } = mathRange;
            const posInMath = Math.max(0, Math.min(latex.length, from - contentStart));
            const key = event.key;

            // ── 1. Create Fraction on '/' ──
            if (key === '/') {
              event.preventDefault();
              event.stopPropagation();

              if (!empty) {
                const selLatex = state.doc.textBetween(from, to);
                const repl = `\\frac{${selLatex}}{}`;
                const targetPos = from + 6 + selLatex.length + 2;
                editor
                  .chain()
                  .focus()
                  .insertContentAt({ from, to }, repl)
                  .setTextSelection(targetPos)
                  .run();
                return true;
              }

              const latexBefore = latex.slice(0, posInMath);

              // A. Preceding parenthesized group (a+b)
              if (latexBefore.endsWith(')')) {
                let depth = 0;
                let matchIdx = -1;
                for (let i = latexBefore.length - 1; i >= 0; i--) {
                  if (latexBefore[i] === ')') depth++;
                  else if (latexBefore[i] === '(') {
                    depth--;
                    if (depth === 0) {
                      matchIdx = i;
                      break;
                    }
                  }
                }
                if (matchIdx !== -1) {
                  const numerator = latexBefore.slice(matchIdx + 1, -1);
                  const replaceFrom = contentStart + matchIdx;
                  const repl = `\\frac{${numerator}}{}`;
                  const targetPos = replaceFrom + 6 + numerator.length + 2;
                  editor
                    .chain()
                    .focus()
                    .insertContentAt({ from: replaceFrom, to: from }, repl)
                    .setTextSelection(targetPos)
                    .run();
                  return true;
                }
              }

              // B. Preceding brace group {x+y} or \sqrt{x}
              if (latexBefore.endsWith('}')) {
                let depth = 0;
                let matchIdx = -1;
                for (let i = latexBefore.length - 1; i >= 0; i--) {
                  if (latexBefore[i] === '}') depth++;
                  else if (latexBefore[i] === '{') {
                    depth--;
                    if (depth === 0) {
                      matchIdx = i;
                      break;
                    }
                  }
                }
                if (matchIdx !== -1) {
                  const beforeBrace = latexBefore.slice(0, matchIdx);
                  const cmdMatch = beforeBrace.match(/\\([a-zA-Z]+)$/);
                  const startIdx = cmdMatch ? matchIdx - cmdMatch[0].length : matchIdx;
                  const numerator = latexBefore.slice(startIdx);
                  const replaceFrom = contentStart + startIdx;
                  const repl = `\\frac{${numerator}}{}`;
                  const targetPos = replaceFrom + 6 + numerator.length + 2;
                  editor
                    .chain()
                    .focus()
                    .insertContentAt({ from: replaceFrom, to: from }, repl)
                    .setTextSelection(targetPos)
                    .run();
                  return true;
                }
              }

              // C. Preceding token (word, variable, number, command like \alpha)
              const tokenMatch = latexBefore.match(/(?:\\[a-zA-Z]+|[a-zA-Z0-9]+)$/);
              if (tokenMatch) {
                const token = tokenMatch[0];
                const replaceFrom = from - token.length;
                const repl = `\\frac{${token}}{}`;
                const targetPos = replaceFrom + 6 + token.length + 2;
                editor
                  .chain()
                  .focus()
                  .insertContentAt({ from: replaceFrom, to: from }, repl)
                  .setTextSelection(targetPos)
                  .run();
                return true;
              }

              // D. Empty fraction \frac{}{} with caret in numerator
              const repl = '\\frac{}{}';
              const targetPos = from + 6;
              editor
                .chain()
                .focus()
                .insertContentAt({ from, to: from }, repl)
                .setTextSelection(targetPos)
                .run();
              return true;
            }

            // ── 2. Superscript / Exponent on '^' ──
            if (key === '^') {
              event.preventDefault();
              event.stopPropagation();

              if (!empty) {
                const selLatex = state.doc.textBetween(from, to);
                const repl = `^{${selLatex}}`;
                const targetPos = from + repl.length;
                editor
                  .chain()
                  .focus()
                  .insertContentAt({ from, to }, repl)
                  .setTextSelection(targetPos)
                  .run();
                return true;
              }

              editor
                .chain()
                .focus()
                .insertContentAt({ from, to: from }, '^{}')
                .setTextSelection(from + 2)
                .run();
              return true;
            }

            // ── 3. Subscript on '_' ──
            if (key === '_') {
              event.preventDefault();
              event.stopPropagation();

              if (!empty) {
                const selLatex = state.doc.textBetween(from, to);
                const repl = `_{${selLatex}}`;
                const targetPos = from + repl.length;
                editor
                  .chain()
                  .focus()
                  .insertContentAt({ from, to }, repl)
                  .setTextSelection(targetPos)
                  .run();
                return true;
              }

              editor
                .chain()
                .focus()
                .insertContentAt({ from, to: from }, '_{}')
                .setTextSelection(from + 2)
                .run();
              return true;
            }

            // ── 4. Braces on '{' ──
            if (key === '{') {
              event.preventDefault();
              event.stopPropagation();

              if (!empty) {
                const selLatex = state.doc.textBetween(from, to);
                const repl = `{${selLatex}}`;
                const targetPos = from + repl.length;
                editor
                  .chain()
                  .focus()
                  .insertContentAt({ from, to }, repl)
                  .setTextSelection(targetPos)
                  .run();
                return true;
              }

              editor
                .chain()
                .focus()
                .insertContentAt({ from, to: from }, '{}')
                .setTextSelection(from + 1)
                .run();
              return true;
            }

            // ── 5. Auto-skip closing '}', ')', ']' ──
            if (empty && (key === '}' || key === ')' || key === ']')) {
              const afterChar = from < state.doc.content.size ? state.doc.textBetween(from, from + 1) : '';
              if (afterChar === key) {
                event.preventDefault();
                event.stopPropagation();
                editor.chain().focus().setTextSelection(from + 1).run();
                return true;
              }
            }

            // ── 6. Backspace pair deletion for '{}' ──
            if (empty && key === 'Backspace' && from > 0 && from < state.doc.content.size) {
              const prevChar = state.doc.textBetween(from - 1, from);
              const nextChar = state.doc.textBetween(from, from + 1);
              if (prevChar === '{' && nextChar === '}') {
                event.preventDefault();
                event.stopPropagation();
                editor.chain().focus().deleteRange({ from: from - 1, to: from + 1 }).run();
                return true;
              }
            }

            // ── 7. Up / Down arrow navigation in fractions & scripts ──
            if (empty && (key === 'ArrowUp' || key === 'ArrowDown')) {
              // A. Fractions: jump between numerator and denominator
              const fractions = parseFractions(latex);
              for (const frac of fractions) {
                // If cursor in numerator and pressing Down -> jump to denominator
                if (key === 'ArrowDown' && posInMath >= frac.numStart && posInMath <= frac.numEnd) {
                  event.preventDefault();
                  event.stopPropagation();
                  const offsetInNum = posInMath - frac.numStart;
                  const denLen = frac.denEnd - frac.denStart;
                  const targetPos = contentStart + frac.denStart + Math.min(offsetInNum, denLen);
                  editor.chain().focus().setTextSelection(targetPos).run();
                  return true;
                }

                // If cursor in denominator and pressing Up -> jump to numerator
                if (key === 'ArrowUp' && posInMath >= frac.denStart && posInMath <= frac.denEnd) {
                  event.preventDefault();
                  event.stopPropagation();
                  const offsetInDen = posInMath - frac.denStart;
                  const numLen = frac.numEnd - frac.numStart;
                  const targetPos = contentStart + frac.numStart + Math.min(offsetInDen, numLen);
                  editor.chain().focus().setTextSelection(targetPos).run();
                  return true;
                }
              }

              // B. Superscripts: jump up into exponent or down to base
              const sups = parseScripts(latex, '^');
              for (const sup of sups) {
                if (key === 'ArrowUp' && posInMath === sup.basePos) {
                  event.preventDefault();
                  event.stopPropagation();
                  editor.chain().focus().setTextSelection(contentStart + sup.innerStart).run();
                  return true;
                }
                if (key === 'ArrowDown' && posInMath >= sup.innerStart && posInMath <= sup.innerEnd) {
                  event.preventDefault();
                  event.stopPropagation();
                  editor.chain().focus().setTextSelection(contentStart + sup.innerEnd + 1).run();
                  return true;
                }
              }

              // C. Subscripts: jump down into subscript or up to base
              const subs = parseScripts(latex, '_');
              for (const sub of subs) {
                if (key === 'ArrowDown' && posInMath === sub.basePos) {
                  event.preventDefault();
                  event.stopPropagation();
                  editor.chain().focus().setTextSelection(contentStart + sub.innerStart).run();
                  return true;
                }
                if (key === 'ArrowUp' && posInMath >= sub.innerStart && posInMath <= sub.innerEnd) {
                  event.preventDefault();
                  event.stopPropagation();
                  editor.chain().focus().setTextSelection(contentStart + sub.innerEnd + 1).run();
                  return true;
                }
              }
            }

            // ── 8. Tab / Shift-Tab slot navigation ──
            if (empty && key === 'Tab') {
              const slots = parseSlots(latex);
              if (slots.length > 0) {
                if (event.shiftKey) {
                  for (let i = slots.length - 1; i >= 0; i--) {
                    if (slots[i].start < posInMath) {
                      event.preventDefault();
                      event.stopPropagation();
                      editor
                        .chain()
                        .focus()
                        .setTextSelection({
                          from: contentStart + slots[i].start,
                          to: contentStart + slots[i].end,
                        })
                        .run();
                      return true;
                    }
                  }
                } else {
                  for (let i = 0; i < slots.length; i++) {
                    if (slots[i].start > posInMath) {
                      event.preventDefault();
                      event.stopPropagation();
                      editor
                        .chain()
                        .focus()
                        .setTextSelection({
                          from: contentStart + slots[i].start,
                          to: contentStart + slots[i].end,
                        })
                        .run();
                      return true;
                    }
                  }

                  // Jump past closing delimiter if after last slot
                  event.preventDefault();
                  event.stopPropagation();
                  editor.chain().focus().setTextSelection(mathRange.to).run();
                  return true;
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
