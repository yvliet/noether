import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { Plugin, TextSelection, NodeSelection } from '@tiptap/pm/state';
import katex from 'katex';
import { setupMathLive } from './mathlive-setup';
import { buildPlaceholderLatex } from './math-snippets';
import { buildMathInsertSubmenus } from './math-insert-menu';
import { useContextMenuStore } from '@/store/contextMenuStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getVisualLineBounds } from '../editorCoords';

// High-speed in-memory KaTeX render cache to prevent duplicate AST compilation during mount and typing
const mathChipKatexCache = new Map<string, string>();
const MAX_MATH_CACHE_SIZE = 1500;

function getOrRenderMathChip(formattedLatex: string, displayMode: boolean): string {
  const cacheKey = `${displayMode ? 'B' : 'I'}:${formattedLatex}`;
  const hit = mathChipKatexCache.get(cacheKey);
  if (hit !== undefined) return hit;

  const html = katex.renderToString(formattedLatex, {
    displayMode,
    throwOnError: false,
  });

  if (mathChipKatexCache.size >= MAX_MATH_CACHE_SIZE) {
    const keysToDelete = Array.from(mathChipKatexCache.keys()).slice(0, 500);
    for (const k of keysToDelete) mathChipKatexCache.delete(k);
  }
  mathChipKatexCache.set(cacheKey, html);
  return html;
}

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

export interface MathChipOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mathChip: {
      /**
       * Insert a math chip at current selection
       */
      insertMathChip: (options?: { latex?: string; display?: 'inline' | 'block'; startEditing?: boolean }) => ReturnType;
    };
  }
}

export const MathChip = Node.create<MathChipOptions>({
  name: 'mathChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || '',
        renderHTML: (attributes) => ({
          'data-latex': attributes.latex,
        }),
      },
      display: {
        default: 'inline',
        parseHTML: (element) => element.getAttribute('data-display') || 'inline',
        renderHTML: (attributes) => ({
          'data-display': attributes.display,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-chip"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'math-chip' }, this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      insertMathChip:
        (options = {}) =>
        ({ commands, state }) => {
          const { from, to, empty } = state.selection;
          const selectedText = empty ? '' : state.doc.textBetween(from, to);
          const rawLatex = options.latex !== undefined ? options.latex : (selectedText ? selectedText : '');
          const latex = rawLatex.includes('‹') ? buildPlaceholderLatex(rawLatex, selectedText) : rawLatex;

          return commands.insertContent({
            type: 'mathChip',
            attrs: {
              latex,
              display: options.display || 'inline',
            },
          });
        },
    };
  },

  addInputRules() {
    return [
      // 1. Auto-convert $formula$ to inline mathChip upon typing closing $
      new InputRule({
        find: /(?<![\$\\])\$(?!\s)([^\$\n]+?)(?<!\s)\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          if (!latex || !latex.trim()) return;
          const { tr } = state;
          tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex: latex.trim(), display: 'inline' })
          );
        },
      }),
      // 2. Auto-convert $$formula$$ to block mathChip
      new InputRule({
        find: /(?<![\$\\])\$\$([^\$\n]+?)\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          if (!latex || !latex.trim()) return;
          const { tr } = state;
          tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex: latex.trim(), display: 'block' })
          );
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown(view, event) {
            const { state } = view;
            const { selection } = state;

            // Helper to resolve the chip's DOM element for entering edit mode
            const resolveChipDom = (pos: number) => {
              const chipDom = view.nodeDOM(pos) as HTMLElement | null;
              return (chipDom?.getAttribute?.('data-type') === 'math-chip' ? chipDom : null)
                || (chipDom?.querySelector?.('[data-type="math-chip"]') as HTMLElement | null)
                || (chipDom?.closest?.('[data-type="math-chip"]') as HTMLElement | null);
            };

            // 1. Guard against accidental node replacement when mathChip is selected as a NodeSelection
            if ((selection as any).node?.type?.name === 'mathChip') {
              const nodePos = selection.from;
              const node = (selection as any).node;

              // Backspace on selected mathChip: unwrap to raw Markdown text so dollar signs are freely editable
              if (event.key === 'Backspace') {
                event.preventDefault();
                event.stopPropagation();
                const latex = node.attrs.latex || '';
                const display = node.attrs.display || 'inline';
                const delim = display === 'block' ? '$$' : '$';
                const rawText = `${delim}${latex}${delim}`;
                const tr = state.tr.replaceWith(nodePos, nodePos + node.nodeSize, state.schema.text(rawText));
                // Place cursor before the closing delimiter so user can immediately delete it
                tr.setSelection(TextSelection.create(tr.doc, nodePos + rawText.length - delim.length));
                view.dispatch(tr);
                return true;
              }

              // Explicit forward delete (Delete key): delete the formula node cleanly
              if (event.key === 'Delete') {
                event.preventDefault();
                event.stopPropagation();
                const tr = state.tr.delete(nodePos, nodePos + node.nodeSize);
                view.dispatch(tr);
                return true;
              }

              // ArrowRight on selected mathChip: enter formula at the start
              if (event.key === 'ArrowRight' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                const targetDom = resolveChipDom(nodePos);
                if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                  (targetDom as any).__enterEditMode({ fromArrow: 'right' });
                } else {
                  view.dom.dispatchEvent(
                    new CustomEvent('noether-edit-math-at-pos', {
                      detail: { pos: nodePos, fromArrow: 'right' },
                    })
                  );
                }
                return true;
              }

              // ArrowLeft on selected mathChip: enter formula at the end
              if (event.key === 'ArrowLeft' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                const targetDom = resolveChipDom(nodePos);
                if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                  (targetDom as any).__enterEditMode({ fromArrow: 'left' });
                } else {
                  view.dom.dispatchEvent(
                    new CustomEvent('noether-edit-math-at-pos', {
                      detail: { pos: nodePos, fromArrow: 'left' },
                    })
                  );
                }
                return true;
              }

              // ArrowUp on selected mathChip: enter formula from the bottom/end
              if (event.key === 'ArrowUp' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                event.stopPropagation();
                const targetDom = resolveChipDom(nodePos);
                if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                  (targetDom as any).__enterEditMode({ fromArrow: 'up' });
                } else {
                  view.dom.dispatchEvent(
                    new CustomEvent('noether-edit-math-at-pos', {
                      detail: { pos: nodePos, fromArrow: 'up' },
                    })
                  );
                }
                return true;
              }

              // ArrowDown on selected mathChip: enter formula from the top/start
              if (event.key === 'ArrowDown' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                event.stopPropagation();
                const targetDom = resolveChipDom(nodePos);
                if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                  (targetDom as any).__enterEditMode({ fromArrow: 'down' });
                } else {
                  view.dom.dispatchEvent(
                    new CustomEvent('noether-edit-math-at-pos', {
                      detail: { pos: nodePos, fromArrow: 'down' },
                    })
                  );
                }
                return true;
              }

              // Enter on selected mathChip: enter edit mode
              if (event.key === 'Enter') {
                event.preventDefault();
                const targetDom = resolveChipDom(nodePos);
                if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                  (targetDom as any).__enterEditMode({ selectAll: false });
                } else {
                  view.dom.dispatchEvent(
                    new CustomEvent('noether-edit-math-at-pos', {
                      detail: { pos: nodePos, fromArrow: 'left' },
                    })
                  );
                }
                return true;
              }

              // Home on selected mathChip: jump to visual line start (or document start with Ctrl)
              if (event.key === 'Home') {
                event.preventDefault();
                event.stopPropagation();
                const $pos = state.doc.resolve(nodePos);
                const bounds = getVisualLineBounds(view, nodePos, undefined, -1);
                const targetPos = event.ctrlKey || event.metaKey ? 0 : (bounds ? bounds.lineStart : $pos.start());
                if (event.shiftKey) {
                  const anchorPos = nodePos + node.nodeSize;
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, Math.min(anchorPos, targetPos), Math.max(anchorPos, targetPos))
                  );
                  view.dispatch(tr);
                } else {
                  const tr = state.tr.setSelection(TextSelection.create(state.doc, targetPos));
                  view.dispatch(tr);
                }
                return true;
              }

              // End on selected mathChip: jump to visual line end (or document end with Ctrl)
              if (event.key === 'End') {
                event.preventDefault();
                event.stopPropagation();
                const $pos = state.doc.resolve(nodePos);
                const bounds = getVisualLineBounds(view, nodePos, undefined, 1);
                const targetPos = event.ctrlKey || event.metaKey ? state.doc.content.size : (bounds ? bounds.lineEnd : $pos.end());
                if (event.shiftKey) {
                  const anchorPos = nodePos;
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, Math.min(anchorPos, targetPos), Math.max(anchorPos, targetPos))
                  );
                  view.dispatch(tr);
                } else {
                  const tr = state.tr.setSelection(TextSelection.create(state.doc, targetPos));
                  view.dispatch(tr);
                }
                return true;
              }

              // Typing any printable character (Space, letters, etc.) on selected mathChip:
              // NEVER overwrite the node! Insert the character right after the node in the text block
              if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                event.stopPropagation();
                const afterPos = nodePos + node.nodeSize;
                const tr = state.tr.insertText(event.key, afterPos);
                tr.setSelection(TextSelection.create(tr.doc, afterPos + event.key.length));
                view.dispatch(tr);
                return true;
              }
            }

            // 2. Backspace when collapsed cursor is immediately after a mathChip: unwrap to raw Markdown
            // Directly remove the closing delimiter so user gets `$formula|` (or `$$formula|`) immediately
            if (event.key === 'Backspace' && selection.empty && selection.from > 0) {
              const $from = selection.$from;
              const nodeBefore = $from.nodeBefore;
              if (nodeBefore && nodeBefore.type.name === 'mathChip') {
                event.preventDefault();
                event.stopPropagation();
                const chipPos = selection.from - nodeBefore.nodeSize;
                const latex = nodeBefore.attrs.latex || '';
                const display = nodeBefore.attrs.display || 'inline';
                const leftDelim = display === 'block' ? '$$' : '$';
                const rightDelim = display === 'block' ? '$' : ''; // Closing dollar stripped by Backspace
                const rawText = `${leftDelim}${latex}${rightDelim}`;
                const tr = rawText.length > 0
                  ? state.tr.replaceWith(chipPos, chipPos + nodeBefore.nodeSize, state.schema.text(rawText))
                  : state.tr.delete(chipPos, chipPos + nodeBefore.nodeSize);
                tr.setSelection(TextSelection.create(tr.doc, chipPos + rawText.length));
                view.dispatch(tr);
                return true;
              }
            }

            // 3. Backspace when cursor is at start of empty line directly below a block mathChip:
            if (event.key === 'Backspace' && selection.empty && selection.$from.parentOffset === 0 && selection.$from.depth > 0) {
              const $from = selection.$from;
              const beforePos = $from.before($from.depth);
              const nodeBeforeBlock = state.doc.resolve(beforePos).nodeBefore;
              if (nodeBeforeBlock && nodeBeforeBlock.type.name === 'mathChip') {
                event.preventDefault();
                event.stopPropagation();
                const blockPos = beforePos - nodeBeforeBlock.nodeSize;

                // Delete the empty paragraph first
                if ($from.parent.content.size === 0) {
                  const tr = state.tr.delete(beforePos, $from.after($from.depth));
                  view.dispatch(tr);
                }

                // Then enter edit mode on the block math chip
                const chipDom = view.nodeDOM(blockPos) as HTMLElement | null;
                const targetDom = (chipDom?.getAttribute?.('data-type') === 'math-chip' ? chipDom : null)
                  || (chipDom?.querySelector?.('[data-type="math-chip"]') as HTMLElement | null)
                  || (chipDom?.closest?.('[data-type="math-chip"]') as HTMLElement | null);

                if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                  (targetDom as any).__enterEditMode({ fromArrow: 'left' });
                }
                return true;
              }
            }

            // 4. ArrowRight when collapsed cursor is immediately before a mathChip: enter formula at position 0
            if (event.key === 'ArrowRight' && selection.empty && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
              const nodeAfter = selection.$from.nodeAfter;
              if (nodeAfter && nodeAfter.type.name === 'mathChip') {
                event.preventDefault();
                const chipPos = selection.from;
                const chipDom = view.nodeDOM(chipPos) as HTMLElement | null;
                const targetDom = (chipDom?.getAttribute?.('data-type') === 'math-chip' ? chipDom : null)
                  || (chipDom?.querySelector?.('[data-type="math-chip"]') as HTMLElement | null)
                  || (chipDom?.closest?.('[data-type="math-chip"]') as HTMLElement | null);
                if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                  (targetDom as any).__enterEditMode({ fromArrow: 'right' });
                } else {
                  view.dom.dispatchEvent(
                    new CustomEvent('noether-edit-math-at-pos', {
                      detail: { pos: chipPos, fromArrow: 'right' },
                    })
                  );
                }
                return true;
              }
            }

            // 5. ArrowLeft when collapsed cursor is immediately after a mathChip: enter formula at the end
            if (event.key === 'ArrowLeft' && selection.empty && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && selection.from > 0) {
              const nodeBefore = selection.$from.nodeBefore;
              if (nodeBefore && nodeBefore.type.name === 'mathChip') {
                event.preventDefault();
                const chipPos = selection.from - nodeBefore.nodeSize;
                const chipDom = view.nodeDOM(chipPos) as HTMLElement | null;
                const targetDom = (chipDom?.getAttribute?.('data-type') === 'math-chip' ? chipDom : null)
                  || (chipDom?.querySelector?.('[data-type="math-chip"]') as HTMLElement | null)
                  || (chipDom?.closest?.('[data-type="math-chip"]') as HTMLElement | null);
                if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                  (targetDom as any).__enterEditMode({ fromArrow: 'left' });
                } else {
                  view.dom.dispatchEvent(
                    new CustomEvent('noether-edit-math-at-pos', {
                      detail: { pos: chipPos, fromArrow: 'left' },
                    })
                  );
                }
                return true;
              }
            }

            // 5b. ArrowDown when at the visual bottom of a textblock directly above a block mathChip: enter formula at the start
            if (event.key === 'ArrowDown' && selection.empty && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
              const $from = selection.$from;
              const afterPos = $from.after($from.depth);
              if (afterPos < state.doc.content.size) {
                const nextBlock = state.doc.nodeAt(afterPos);
                if (nextBlock && nextBlock.isTextblock) {
                  let blockChipPos = -1;
                  nextBlock.descendants((child, offset) => {
                    if (child.type.name === 'mathChip' && child.attrs.display === 'block') {
                      blockChipPos = afterPos + 1 + offset;
                      return false;
                    }
                  });
                  if (blockChipPos !== -1) {
                    const coords = view.coordsAtPos($from.pos);
                    const belowPos = view.posAtCoords({ left: coords.left, top: coords.bottom + 8 });
                    if (!belowPos || belowPos.pos >= afterPos) {
                      event.preventDefault();
                      const targetDom = resolveChipDom(blockChipPos);
                      if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                        (targetDom as any).__enterEditMode({ fromArrow: 'down', clickCoords: { x: coords.left, y: coords.bottom + 8 } });
                      } else {
                        view.dom.dispatchEvent(
                          new CustomEvent('noether-edit-math-at-pos', {
                            detail: { pos: blockChipPos, fromArrow: 'down' },
                          })
                        );
                      }
                      return true;
                    }
                  }
                }
              }
            }

            // 5c. ArrowUp when at the visual top of a textblock directly below a block mathChip: enter formula at the end
            if (event.key === 'ArrowUp' && selection.empty && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
              const $from = selection.$from;
              const beforePos = $from.before($from.depth);
              if (beforePos > 0) {
                const prevBlock = state.doc.resolve(beforePos - 1).nodeBefore;
                if (prevBlock && prevBlock.isTextblock) {
                  let blockChipPos = -1;
                  const prevBlockStart = beforePos - prevBlock.nodeSize;
                  prevBlock.descendants((child, offset) => {
                    if (child.type.name === 'mathChip' && child.attrs.display === 'block') {
                      blockChipPos = prevBlockStart + 1 + offset;
                      return false;
                    }
                  });
                  if (blockChipPos !== -1) {
                    const coords = view.coordsAtPos($from.pos);
                    const abovePos = view.posAtCoords({ left: coords.left, top: coords.top - 8 });
                    if (!abovePos || abovePos.pos <= beforePos) {
                      event.preventDefault();
                      const targetDom = resolveChipDom(blockChipPos);
                      if (targetDom && typeof (targetDom as any).__enterEditMode === 'function') {
                        (targetDom as any).__enterEditMode({ fromArrow: 'up', clickCoords: { x: coords.left, y: coords.top - 8 } });
                      } else {
                        view.dom.dispatchEvent(
                          new CustomEvent('noether-edit-math-at-pos', {
                            detail: { pos: blockChipPos, fromArrow: 'up' },
                          })
                        );
                      }
                      return true;
                    }
                  }
                }
              }
            }

            return false;
          },
          handleTextInput(view, from, to, text) {
            const { state } = view;
            const { selection } = state;
            if ((selection as any).node?.type?.name === 'mathChip') {
              const nodePos = selection.from;
              const node = (selection as any).node;
              const afterPos = nodePos + node.nodeSize;
              const tr = state.tr.insertText(text, afterPos);
              tr.setSelection(TextSelection.create(tr.doc, afterPos + text.length));
              view.dispatch(tr);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      setupMathLive();

      const dom = document.createElement('span');
      dom.className = 'wce-chip wce-math noether-math-node';
      dom.setAttribute('data-type', 'math-chip');
      dom.setAttribute('data-display', node.attrs.display || 'inline');
      dom.tabIndex = 0;

      let isEditing = false;
      let currentLatex = node.attrs.latex || '';
      let currentDisplay: 'inline' | 'block' = node.attrs.display === 'block' ? 'block' : 'inline';
      let activeMf: any = null;
      let lastCursorPos = editor.state.selection.from;

      const syncAttrs = (attrs: Partial<{ latex: string; display: 'inline' | 'block' }>, addToHistory = false) => {
        if (attrs.latex !== undefined) currentLatex = attrs.latex;
        if (attrs.display !== undefined) currentDisplay = attrs.display;
        if (typeof getPos === 'function') {
          const pos = getPos();
          if (typeof pos === 'number') {
            const currentNode = editor.state.doc.nodeAt(pos);
            if (currentNode && currentNode.type.name === 'mathChip') {
              const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
                ...currentNode.attrs,
                ...attrs,
              });
              if (!addToHistory) {
                tr.setMeta('addToHistory', false);
              }
              editor.view.dispatch(tr);
            }
          }
        }
      };

      (dom as any).__enterEditMode = (opts?: { selectAll?: boolean; fromArrow?: 'left' | 'right' | 'up' | 'down' | boolean; clickCoords?: { x: number; y: number } }) => {
        enterEditMode(opts);
      };

      const onEditAtPos = (ev: Event) => {
        const customEv = ev as CustomEvent;
        if (typeof getPos === 'function') {
          const pos = getPos();
          if (typeof pos === 'number' && pos === customEv.detail?.pos) {
            enterEditMode({ fromArrow: customEv.detail?.fromArrow || 'left', clickCoords: customEv.detail?.clickCoords });
          }
        }
      };
      editor.view.dom.addEventListener('noether-edit-math-at-pos', onEditAtPos);

      const onSelectionUpdate = () => {
        const sel = editor.state.selection;
        if (!(sel as any).node) {
          lastCursorPos = sel.from;
        }
      };
      editor.on('selectionUpdate', onSelectionUpdate);

      function openMathContextMenu(e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        const insertSubmenu = buildMathInsertSubmenus((latex) => {
          if (activeMf && typeof activeMf.insert === 'function') {
            activeMf.insert(latex);
          } else {
            currentLatex += latex;
            renderStaticView();
            syncAttrs({ latex: currentLatex });
          }
        });

        useContextMenuStore.getState().openContextMenu(e, [
          {
            type: 'item',
            title: 'Copy LaTeX',
            onClick: () => {
              const latexToCopy = isEditing && activeMf ? activeMf.value : currentLatex;
              navigator.clipboard.writeText(latexToCopy);
            },
          },
          {
            type: 'item',
            title: 'Copy MathML',
            onClick: () => {
              const mathml = activeMf?.getValue?.('math-ml') || '';
              if (mathml) {
                navigator.clipboard.writeText(mathml);
              }
            },
          },
          {
            type: 'item',
            title: currentDisplay === 'block' ? 'Convert to Inline Math ($)' : 'Convert to Block Math ($$)',
            onClick: () => {
              const nextDisplay = currentDisplay === 'block' ? 'inline' : 'block';
              currentDisplay = nextDisplay;
              dom.setAttribute('data-display', nextDisplay);
              if (nextDisplay === 'block') {
                dom.classList.add('wce-block');
              } else {
                dom.classList.remove('wce-block');
              }
              syncAttrs({ display: nextDisplay }, true);
            },
          },
          {
            type: 'separator',
          },
          {
            type: 'item',
            title: 'Insert Math Structure',
            submenu: insertSubmenu,
          },
          {
            type: 'item',
            title: 'Toggle Math Keyboard',
            onClick: () => {
              if (window.mathVirtualKeyboard) {
                if (window.mathVirtualKeyboard.visible) {
                  window.mathVirtualKeyboard.hide();
                } else {
                  window.mathVirtualKeyboard.show();
                }
              }
            },
          },
          {
            type: 'separator',
          },
          {
            type: 'item',
            title: 'Delete Formula',
            isDanger: true,
            onClick: () => {
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  editor.commands.deleteRange({ from: pos, to: pos + 1 });
                }
              }
            },
          },
        ]);
      }

      function renderStaticView() {
        isEditing = false;
        activeMf = null;
        dom.classList.remove('wce-editing');
        if (currentDisplay === 'block') {
          dom.classList.add('wce-block');
        } else {
          dom.classList.remove('wce-block');
        }
        dom.setAttribute('data-display', currentDisplay);
        dom.innerHTML = '';

        const renderSpan = document.createElement('span');
        renderSpan.className = 'wce-math-render';
        const latex = currentLatex.trim();
        const delim = currentDisplay === 'block' ? '$$' : '$';

        if (latex) {
          try {
            const formattedLatex = currentDisplay === 'block' || latex.startsWith('\\displaystyle')
              ? latex
              : `\\displaystyle ${latex}`;

            renderSpan.innerHTML = getOrRenderMathChip(formattedLatex, currentDisplay === 'block');
          } catch (e) {
            renderSpan.className = 'wce-math-render md-math-error';
            renderSpan.textContent = latex;
          }
        } else {
          renderSpan.innerHTML = `<span class="md-syntax-dimmed noether-math-delim">${delim}</span><span class="md-syntax-dimmed noether-math-delim">${delim}</span>`;
        }

        dom.appendChild(renderSpan);
      }

      function enterEditMode(opts: { selectAll?: boolean; fromArrow?: 'left' | 'right' | 'up' | 'down' | boolean; clickCoords?: { x: number; y: number } } = {}) {
        if (isEditing && activeMf) return;
        isEditing = true;
        const mountedTime = Date.now();
        dom.classList.add('wce-editing');
        if (currentDisplay === 'block') {
          dom.classList.add('wce-block');
        } else {
          dom.classList.remove('wce-block');
        }
        dom.setAttribute('data-display', currentDisplay);
        dom.innerHTML = '';

        const delim = currentDisplay === 'block' ? '$$' : '$';

        // Left dimmed dollar
        const leftDollar = document.createElement('span');
        leftDollar.className = 'md-syntax-dimmed noether-math-delim';
        leftDollar.textContent = delim;
        dom.appendChild(leftDollar);

        const mf = document.createElement('math-field') as any;
        activeMf = mf;
        mf.className = 'noether-live-math-field';
        mf.setAttribute('math-virtual-keyboard-policy', 'manual');
        mf.setAttribute('menu-items', 'none');
        mf.setAttribute('smart-mode', 'false');
        mf.setAttribute('default-mode', currentDisplay === 'block' ? 'math' : 'inline-math');
        mf.setAttribute('math-mode-space', '\\:');
        mf.mathModeSpace = '\\:';
        mf.value = currentLatex;
        dom.appendChild(mf);

        let hasConfiguredShortcuts = false;
        const applyMathfieldConfig = () => {
          if (hasConfiguredShortcuts || !mf.isConnected) return;
          try {
            mf.mathModeSpace = '\\:';
            mf.inlineShortcuts = {
              matrix: '\\begin{pmatrix} #? & #? \\\\ #? & #? \\end{pmatrix}',
              pmatrix: '\\begin{pmatrix} #? & #? \\\\ #? & #? \\end{pmatrix}',
              bmatrix: '\\begin{bmatrix} #? & #? \\\\ #? & #? \\end{bmatrix}',
              vmatrix: '\\begin{vmatrix} #? & #? \\\\ #? & #? \\end{vmatrix}',
              pmatrix3: '\\begin{pmatrix} #? & #? & #? \\\\ #? & #? & #? \\\\ #? & #? & #? \\end{pmatrix}',
              bmatrix3: '\\begin{bmatrix} #? & #? & #? \\\\ #? & #? & #? \\\\ #? & #? & #? \\end{bmatrix}',
              vmatrix3: '\\begin{vmatrix} #? & #? & #? \\\\ #? & #? & #? \\\\ #? & #? & #? \\end{vmatrix}',
              cases: '\\begin{cases} #? & #? \\\\ #? & #? \\end{cases}',
              lim: '\\lim_{#? \\to #?}',
              lim0: '\\lim_{x \\to 0}',
              liminf: '\\lim_{x \\to \\infty}',
              sum: '\\sum_{#?=1}^{#?}',
              prod: '\\prod_{#?=1}^{#?}',
              int: '\\int_{#?}^{#?}',
              iint: '\\iint_{#?}',
              oint: '\\oint_{#?}',
              partial: '\\frac{\\partial #?}{\\partial #?}',
              sqrt: '\\sqrt{#?}',
              root: '\\sqrt[#?]{#?}',
            };
            hasConfiguredShortcuts = true;
          } catch {}
        };
        mf.addEventListener('mount', applyMathfieldConfig);

        // Right dimmed dollar
        const rightDollar = document.createElement('span');
        rightDollar.className = 'md-syntax-dimmed noether-math-delim';
        rightDollar.textContent = delim;
        dom.appendChild(rightDollar);

        // Subtle quick trigger button to open the structure/matrix insert menu
        const insertBtn = document.createElement('button');
        insertBtn.type = 'button';
        insertBtn.className = 'noether-math-insert-trigger';
        insertBtn.title = 'Insert Math Structure (Matrix, Limit, Fraction, etc.)';
        insertBtn.tabIndex = -1;
        insertBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 4H6l7 8-7 8h12"/></svg>`;
        insertBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openMathContextMenu(e);
        });
        dom.appendChild(insertBtn);

        // Intercept right click on math-field to suppress MathLive's menu and show Noether's native context menu
        mf.addEventListener('contextmenu', openMathContextMenu, true);

        const commit = () => {
          if (!isEditing) return;
          const newLatex = mf.value;
          currentLatex = newLatex;
          syncAttrs({ latex: newLatex, display: currentDisplay }, true);
          renderStaticView();
        };

        mf.addEventListener('input', () => {
          currentLatex = mf.value;
          syncAttrs({ latex: currentLatex, display: currentDisplay }, false);
        });

        mf.addEventListener('move-out', (e: any) => {
          e.preventDefault(); // Suppress MathLive's dead-end plonk audio
          const dir = e.detail?.direction;
          if (dir === 'backward' || dir === 'left') {
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                editor.chain().focus().setTextSelection(pos).run();
              }
            }
          } else if (dir === 'forward' || dir === 'right') {
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                editor.chain().focus().setTextSelection(pos + 1).run();
              }
            }
          } else if (dir === 'upward' || dir === 'up') {
            let caretLeft = dom.getBoundingClientRect().left + 8;
            try {
              const mfCaretEl = mf.shadowRoot?.querySelector?.('.ML__caret') || mf.querySelector?.('.ML__caret');
              if (mfCaretEl) {
                const r = mfCaretEl.getBoundingClientRect();
                if (r.left > 0) caretLeft = r.left;
              }
            } catch {}

            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                const domRect = dom.getBoundingClientRect();
                const coords = { left: caretLeft, top: domRect.top - 12 };
                const target = editor.view.posAtCoords(coords);

                if (currentDisplay === 'block') {
                  const $pos = editor.state.doc.resolve(pos);
                  const beforeBlockPos = $pos.before($pos.depth);
                  if (target && target.pos < pos && target.pos >= (beforeBlockPos > 0 ? beforeBlockPos - 1 : 0)) {
                    editor.chain().focus().setTextSelection(target.pos).run();
                  } else if (beforeBlockPos > 0) {
                    const targetPos = TextSelection.near(editor.state.doc.resolve(beforeBlockPos - 1), -1).from;
                    editor.chain().focus().setTextSelection(targetPos).run();
                  } else {
                    editor.chain().focus().setTextSelection(0).run();
                  }
                } else {
                  if (target && target.pos < pos) {
                    editor.chain().focus().setTextSelection(target.pos).run();
                  } else {
                    editor.chain().focus().setTextSelection(pos).run();
                  }
                }
              }
            }
          } else if (dir === 'downward' || dir === 'down') {
            let caretLeft = dom.getBoundingClientRect().left + 8;
            try {
              const mfCaretEl = mf.shadowRoot?.querySelector?.('.ML__caret') || mf.querySelector?.('.ML__caret');
              if (mfCaretEl) {
                const r = mfCaretEl.getBoundingClientRect();
                if (r.left > 0) caretLeft = r.left;
              }
            } catch {}

            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                const domRect = dom.getBoundingClientRect();
                const coords = { left: caretLeft, top: domRect.bottom + 12 };
                const target = editor.view.posAtCoords(coords);

                if (currentDisplay === 'block') {
                  const $pos = editor.state.doc.resolve(pos);
                  const afterBlockPos = $pos.after($pos.depth);
                  if (target && target.pos > pos && target.pos <= (afterBlockPos < editor.state.doc.content.size ? afterBlockPos + 1 : editor.state.doc.content.size)) {
                    editor.chain().focus().setTextSelection(target.pos).run();
                  } else if (afterBlockPos < editor.state.doc.content.size) {
                    const targetPos = TextSelection.near(editor.state.doc.resolve(afterBlockPos + 1), 1).from;
                    editor.chain().focus().setTextSelection(targetPos).run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .insertContentAt(afterBlockPos, { type: 'paragraph' })
                      .setTextSelection(afterBlockPos + 1)
                      .run();
                  }
                } else {
                  if (target && target.pos > pos) {
                    editor.chain().focus().setTextSelection(target.pos).run();
                  } else {
                    editor.chain().focus().setTextSelection(pos + 1).run();
                  }
                }
              }
            }
          }
        });

        let lastKeyWasBackslash = false;

        mf.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
            return;
          }

          if (e.key === '\\') {
            lastKeyWasBackslash = true;
            return;
          }

          if (e.key === ' ') {
            lastKeyWasBackslash = false;
            e.preventDefault();
            e.stopPropagation();
            mf.executeCommand(['insert', '\\:']);
            return;
          }

          if (e.key === 'Home') {
            e.preventDefault();
            e.stopPropagation();
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                const $pos = editor.state.doc.resolve(pos);
                const bounds = getVisualLineBounds(editor.view, pos, undefined, -1);
                const targetPos = e.ctrlKey || e.metaKey ? 0 : (bounds ? bounds.lineStart : $pos.start());
                if (e.shiftKey) {
                  const anchorPos = pos + node.nodeSize;
                  editor.chain().focus().setTextSelection({
                    from: Math.min(anchorPos, targetPos),
                    to: Math.max(anchorPos, targetPos),
                  }).run();
                } else {
                  editor.chain().focus().setTextSelection(targetPos).run();
                }
              }
            }
            return;
          }

          if (e.key === 'End') {
            e.preventDefault();
            e.stopPropagation();
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                const $pos = editor.state.doc.resolve(pos);
                const bounds = getVisualLineBounds(editor.view, pos, undefined, 1);
                const targetPos = e.ctrlKey || e.metaKey ? editor.state.doc.content.size : (bounds ? bounds.lineEnd : $pos.end());
                if (e.shiftKey) {
                  const anchorPos = pos;
                  editor.chain().focus().setTextSelection({
                    from: Math.min(anchorPos, targetPos),
                    to: Math.max(anchorPos, targetPos),
                  }).run();
                } else {
                  editor.chain().focus().setTextSelection(targetPos).run();
                }
              }
            }
            return;
          }

          if (e.key === 'Tab') {
            e.stopPropagation();
            return;
          }

          if (e.key === 'Escape') {
            lastKeyWasBackslash = false;
            e.preventDefault();
            e.stopPropagation();
            commit();
            editor.commands.focus();
          } else if (e.key === 'Enter') {
            lastKeyWasBackslash = false;
            e.preventDefault();
            e.stopPropagation();
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                if (currentDisplay === 'block') {
                  editor.chain().focus().insertContentAt(pos + 1, { type: 'paragraph' }).run();
                } else {
                  editor.chain().focus().setTextSelection(pos + 1).run();
                }
              }
            }
          } else if (e.key === '$') {
            const val = (mf.value || '').trim();

            // 1. Literal dollar inside math:
            // Case 1A: If preceded by backslash (\$), or in latex command mode,
            // switch mode back to math and insert \$ into the formula
            if (lastKeyWasBackslash || mf.mode === 'latex' || mf.mode === 'command') {
              lastKeyWasBackslash = false;
              e.preventDefault();
              e.stopPropagation();
              mf.executeCommand(['deleteBackward']);
              mf.executeCommand(['switchMode', 'math']);
              mf.executeCommand(['insert', '\\$']);
              return;
            }

            e.preventDefault();
            e.stopPropagation();
            lastKeyWasBackslash = false;

            // Case 1B: If Alt+$ was pressed, or cursor is positioned inside the formula (before the end),
            // insert \$ into the math formula so users can add currency/dollars within math.
            if (e.altKey || (val && typeof mf.position === 'number' && typeof mf.lastOffset === 'number' && mf.position < mf.lastOffset)) {
              mf.executeCommand(['insert', '\\$']);
              return;
            }

            // Escalation / Exit behavior at end of formula:
            // 1. If currently inline ($), typing $ at the end escalates to block ($$), preserving all formula contents!
            if (currentDisplay !== 'block') {
              currentDisplay = 'block';
              dom.classList.add('wce-block');
              dom.setAttribute('data-display', 'block');
              leftDollar.textContent = '$$';
              rightDollar.textContent = '$$';
              mf.setAttribute('default-mode', 'math');
              syncAttrs({ display: 'block' }, true);
              return;
            }

            // 2. If already block math ($$):
            // If empty, typing another $ exits and converts to literal $$
            if (!val || val === '\\placeholder{}' || val === '\\square') {
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).insertContentAt(pos, '$$').run();
                }
              }
              return;
            }

            // Non-empty block math: typing closing $ at the end commits and steps out after chip
            commit();
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (typeof pos === 'number') {
                editor.chain().focus().setTextSelection(pos + 1).run();
              }
            }
          } else if (e.key === 'Backspace') {
            lastKeyWasBackslash = false;
            const val = (mf.value || '').trim();
            if (!val || val === '\\placeholder{}' || val === '\\square' || val === '') {
              e.preventDefault();
              e.stopPropagation();
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  if (currentDisplay === 'block') {
                    // Backspacing an empty block de-escalates to inline ($)
                    currentDisplay = 'inline';
                    dom.classList.remove('wce-block');
                    dom.setAttribute('data-display', 'inline');
                    leftDollar.textContent = '$';
                    rightDollar.textContent = '$';
                    mf.setAttribute('default-mode', 'inline-math');
                    syncAttrs({ display: 'inline' }, true);
                    return;
                  }
                  // Cleanly remove the empty math chip and return cursor to the text
                  editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
                }
              }
              return;
            }

            // If at position 0 with a collapsed cursor and non-empty formula, step out before the chip
            if (mf.position === 0 && (!mf.selection || mf.selectionIsCollapsed)) {
              e.preventDefault();
              e.stopPropagation();
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  commit();
                  editor.chain().focus().setTextSelection(pos).run();
                }
              }
              return;
            }
          } else {
            lastKeyWasBackslash = false;
          }

          if (e.key === 'ArrowLeft' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
            // Only step out when cursor is at the outer left boundary
            if (mf.position === 0) {
              e.preventDefault();
              e.stopPropagation();
              commit();
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  editor.chain().focus().setTextSelection(pos).run();
                }
              }
              return;
            }
          } else if (e.key === 'ArrowRight' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
            // Only step out when cursor is at the outer right boundary
            if (mf.position === mf.lastOffset) {
              e.preventDefault();
              e.stopPropagation();
              commit();
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (typeof pos === 'number') {
                  editor.chain().focus().setTextSelection(pos + 1).run();
                }
              }
              return;
            }
          } else if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            if (e.shiftKey) {
              const beforePos = mf.position;
              mf.executeCommand('moveToPreviousPlaceholder');
              if (mf.position === beforePos) {
                commit();
                if (typeof getPos === 'function') {
                  const pos = getPos();
                  if (typeof pos === 'number') {
                    editor.chain().focus().setTextSelection(pos).run();
                  }
                }
              }
            } else {
              const beforePos = mf.position;
              mf.executeCommand('moveToNextPlaceholder');
              if (mf.position === beforePos) {
                commit();
                if (typeof getPos === 'function') {
                  const pos = getPos();
                  if (typeof pos === 'number') {
                    editor.chain().focus().setTextSelection(pos + 1).run();
                  }
                }
              }
            }
          }
        }, true);

        mf.addEventListener('blur', (e: FocusEvent) => {
          if (Date.now() - mountedTime < 250) return;
          const nextTarget = (e.relatedTarget || document.activeElement) as HTMLElement | null;
          if (nextTarget && dom.contains(nextTarget)) return;
          setTimeout(() => {
            if (dom.contains(document.activeElement)) return;
            commit();
          }, 80);
        });

        let focusRetries = 0;
        const focusField = () => {
          try {
            if (!mf.isConnected && focusRetries < 20) {
              focusRetries++;
              requestAnimationFrame(focusField);
              return;
            }
            applyMathfieldConfig();
            mf.focus();
            if (opts.selectAll) {
              mf.executeCommand('selectAll');
            } else if (opts.clickCoords && typeof mf.getOffsetFromPoint === 'function') {
              // Precise caret placement at the clicked atom position
              const offset = mf.getOffsetFromPoint(opts.clickCoords.x, opts.clickCoords.y, { bias: 0 });
              if (offset >= 0) {
                mf.position = offset;
              }
            } else if (opts.fromArrow === 'left' || opts.fromArrow === 'up') {
              mf.executeCommand('moveToMathfieldEnd');
            } else if (opts.fromArrow === 'right' || opts.fromArrow === 'down') {
              mf.executeCommand('moveToMathfieldStart');
            } else if (/\\placeholder\{\}/.test(currentLatex)) {
              mf.executeCommand('moveToNextPlaceholder');
            }
          } catch {}
        };
        requestAnimationFrame(focusField);
      }

      // Initial render: immediately enter edit mode if newly inserted with empty latex or placeholder
      if (!currentLatex || currentLatex.includes('\\placeholder')) {
        enterEditMode();
      } else {
        renderStaticView();
      }

      // Right-click context menu on static chip view
      dom.addEventListener('contextmenu', openMathContextMenu, true);

      // Click to edit
      dom.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        enterEditMode({ selectAll: false, clickCoords: { x: e.clientX, y: e.clientY } });
      });

      // Keydown on chip when focused in view mode
      dom.addEventListener('keydown', (e) => {
        if (isEditing) return;
        if (e.key === 'Backspace') {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode({ fromArrow: 'left' });
          return;
        } else if (e.key === 'Delete') {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
              editor.commands.deleteRange({ from: pos, to: pos + 1 });
            }
          }
          return;
        } else if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode({ selectAll: false });
        } else if (e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
              const afterPos = pos + node.nodeSize;
              editor.chain().focus().insertContentAt(afterPos, ' ').setTextSelection(afterPos + 1).run();
            }
          }
          return;
        } else if (e.key === 'Home') {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
              const $pos = editor.state.doc.resolve(pos);
              const bounds = getVisualLineBounds(editor.view, pos, undefined, -1);
              const targetPos = e.ctrlKey || e.metaKey ? 0 : (bounds ? bounds.lineStart : $pos.start());
              if (e.shiftKey) {
                const anchorPos = pos + node.nodeSize;
                editor.chain().focus().setTextSelection({
                  from: Math.min(anchorPos, targetPos),
                  to: Math.max(anchorPos, targetPos),
                }).run();
              } else {
                editor.chain().focus().setTextSelection(targetPos).run();
              }
            }
          }
          return;
        } else if (e.key === 'End') {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number') {
              const $pos = editor.state.doc.resolve(pos);
              const bounds = getVisualLineBounds(editor.view, pos, undefined, 1);
              const targetPos = e.ctrlKey || e.metaKey ? editor.state.doc.content.size : (bounds ? bounds.lineEnd : $pos.end());
              if (e.shiftKey) {
                const anchorPos = pos;
                editor.chain().focus().setTextSelection({
                  from: Math.min(anchorPos, targetPos),
                  to: Math.max(anchorPos, targetPos),
                }).run();
              } else {
                editor.chain().focus().setTextSelection(targetPos).run();
              }
            }
          }
          return;
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
          e.preventDefault();
          e.stopPropagation();
          enterEditMode({ fromArrow: 'left' });
          setTimeout(() => {
            if (activeMf) activeMf.executeCommand(['insert', e.key]);
          }, 20);
        }
      });

      return {
        dom,
        selectNode: () => {
          dom.classList.add('ProseMirror-selectednode');
        },
        deselectNode: () => {
          dom.classList.remove('ProseMirror-selectednode');
        },
        stopEvent: (event: Event) => {
          // Intercept mouse events even when not editing to prevent ProseMirror
          // from swallowing the first click for drag/selection tracking
          if (event.type === 'mousedown' || event.type === 'pointerdown') {
            return true;
          }
          return isEditing;
        },
        ignoreMutation: () => true,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'mathChip') return false;
          node = updatedNode;
          if (updatedNode.attrs.display && updatedNode.attrs.display !== currentDisplay) {
            currentDisplay = updatedNode.attrs.display;
            dom.setAttribute('data-display', currentDisplay);
            if (currentDisplay === 'block') {
              dom.classList.add('wce-block');
            } else {
              dom.classList.remove('wce-block');
            }
          }
          if (isEditing) {
            return true;
          }
          if (updatedNode.attrs.latex !== currentLatex) {
            currentLatex = updatedNode.attrs.latex;
            renderStaticView();
          }
          return true;
        },
        destroy: () => {
          editor.off('selectionUpdate', onSelectionUpdate);
          editor.view.dom.removeEventListener('noether-edit-math-at-pos', onEditAtPos);
          dom.innerHTML = '';
        },
      };
    };
  },
});
