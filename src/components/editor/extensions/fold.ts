import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useSettingsStore } from '@/store/settingsStore';
import { useDocumentStore } from '@/store/documentStore';
import {
  ChevronDownIcon as HugeChevronDownDef,
  ChevronRightIcon as HugeChevronRightDef,
} from '@hugeicons/core-free-icons';
import { renderHugeIconSvg } from '@/components/common/Icons';

export const FoldPluginKey = new PluginKey('foldPlugin');
/** Backward compatibility alias */
export const FoldHeadingPluginKey = FoldPluginKey;

const getHeadingChevronSvg = (level: number, isFolded: boolean) => {
  const size = level === 1 ? 18 : level === 2 ? 16 : level === 3 ? 14 : 13;
  return renderHugeIconSvg(isFolded ? HugeChevronRightDef : HugeChevronDownDef, {
    size,
    color: 'currentColor',
    strokeWidth: 2,
  });
};

const CHEVRON_DOWN_SVG = renderHugeIconSvg(HugeChevronDownDef, {
  size: 12,
  color: 'currentColor',
  strokeWidth: 2,
});
const CHEVRON_RIGHT_SVG = renderHugeIconSvg(HugeChevronRightDef, {
  size: 12,
  color: 'currentColor',
  strokeWidth: 2,
});

export interface FoldPluginState {
  foldedHeadings: Set<number>;
  foldedIndents: Set<number>;
  decorations: DecorationSet;
}

interface PersistedFoldState {
  headingKeys: string[];
  indentKeys: string[];
}

function getHeadingKey(node: any, idx: number): string {
  const text = (node.textContent || '').trim();
  const level = node.attrs?.level || 1;
  return `h:${level}:${text || idx}`;
}

function getIndentKey(node: any, idx: number): string {
  const text = (node.textContent || '').trim();
  return `l:${text || idx}`;
}

function getFoldStorageKey(docId?: string): string {
  const id = docId || useDocumentStore.getState().activeDocument?.id || 'default';
  return `flint_fold_state_${id}`;
}

function saveFoldState(doc: any, foldedHeadings: Set<number>, foldedIndents: Set<number>, docId?: string) {
  try {
    const key = getFoldStorageKey(docId);
    const headingKeys: string[] = [];
    const indentKeys: string[] = [];

    let headingIdx = 0;
    let listIdx = 0;

    doc.descendants((node: any, pos: number) => {
      if (!node.isBlock) return;

      if (node.type.name === 'heading') {
        const isFolded = Array.from<number>(foldedHeadings as any).some(
          (p) => p === pos || (p >= pos && p < pos + node.nodeSize)
        );
        if (isFolded) {
          headingKeys.push(getHeadingKey(node, headingIdx));
        }
        headingIdx++;
      } else if (node.type.name === 'paragraph' || node.type.name === 'listItem' || node.type.name === 'taskItem') {
        const isFolded = Array.from<number>(foldedIndents as any).some(
          (p) => p === pos || (p >= pos && p < pos + node.nodeSize)
        );
        if (isFolded) {
          indentKeys.push(getIndentKey(node, listIdx));
        }
        listIdx++;
      }
    });

    const data: PersistedFoldState = { headingKeys, indentKeys };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save fold state to localStorage:', err);
  }
}

function loadFoldState(doc: any, docId?: string): { foldedHeadings: Set<number>; foldedIndents: Set<number> } {
  const foldedHeadings = new Set<number>();
  const foldedIndents = new Set<number>();

  try {
    const key = getFoldStorageKey(docId);
    const raw = localStorage.getItem(key);
    if (!raw) return { foldedHeadings, foldedIndents };

    const data: PersistedFoldState = JSON.parse(raw);
    const savedHeadingKeys = new Set(data.headingKeys || []);
    const savedIndentKeys = new Set(data.indentKeys || []);

    let headingIdx = 0;
    let listIdx = 0;

    doc.descendants((node: any, pos: number) => {
      if (!node.isBlock) return;

      if (node.type.name === 'heading') {
        const hKey = getHeadingKey(node, headingIdx);
        if (savedHeadingKeys.has(hKey)) {
          foldedHeadings.add(pos);
        }
        headingIdx++;
      } else if (node.type.name === 'paragraph' || node.type.name === 'listItem' || node.type.name === 'taskItem') {
        const lKey = getIndentKey(node, listIdx);
        if (savedIndentKeys.has(lKey)) {
          foldedIndents.add(pos);
        }
        listIdx++;
      }
    });
  } catch (err) {
    console.error('Failed to load fold state from localStorage:', err);
  }

  return { foldedHeadings, foldedIndents };
}

interface BlockInfo {
  pos: number;
  nodeSize: number;
  node: any;
  indent: number;
  isList: boolean;
  isHeading: boolean;
  leadingLen: number;
}

function extractBlocks(doc: any): BlockInfo[] {
  const blocks: BlockInfo[] = [];
  doc.descendants((node: any, pos: number) => {
    if (!node.isBlock) return;

    if (node.type.name === 'paragraph') {
      const text = node.textContent || '';
      const listMatch = text.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+]|\[[ xX]\])(?:\s+|$)/);
      const indentMatch = text.match(/^([ \t]*)/);
      const leadingSpaces = indentMatch ? indentMatch[1].replace(/\t/g, '    ').length : 0;
      const leadingLen = listMatch ? listMatch[1].length : (indentMatch ? indentMatch[1].length : 0);

      blocks.push({
        pos,
        nodeSize: node.nodeSize,
        node,
        indent: leadingSpaces,
        isList: Boolean(listMatch),
        isHeading: false,
        leadingLen,
      });
    } else if (node.type.name === 'heading') {
      blocks.push({
        pos,
        nodeSize: node.nodeSize,
        node,
        indent: 0,
        isList: false,
        isHeading: true,
        leadingLen: 0,
      });
    }
  });
  return blocks;
}

function getChildBlocksForIndent(blocks: BlockInfo[], targetIdx: number): BlockInfo[] {
  const childBlocks: BlockInfo[] = [];
  if (targetIdx < 0 || targetIdx >= blocks.length) return childBlocks;

  const parentBlock = blocks[targetIdx];
  const parentIndent = parentBlock.indent;

  for (let j = targetIdx + 1; j < blocks.length; j++) {
    const nextBlock = blocks[j];
    if (nextBlock.isHeading) break;

    // 1. Any line indented further than the parent is part of this folded hierarchy
    if (nextBlock.indent > parentIndent) {
      childBlocks.push(nextBlock);
      continue;
    }

    // 2. If block has indent <= parentIndent, but is empty/whitespace,
    // check if there are further descendant blocks below it before the next sibling
    const isEmpty = !nextBlock.node.textContent || nextBlock.node.textContent.trim() === '';
    if (isEmpty) {
      let hasSubsequentChildren = false;
      for (let k = j + 1; k < blocks.length; k++) {
        if (blocks[k].isHeading) break;
        if (blocks[k].indent > parentIndent) {
          hasSubsequentChildren = true;
          break;
        }
        if (blocks[k].node.textContent && blocks[k].node.textContent.trim() !== '') {
          break;
        }
      }

      if (hasSubsequentChildren) {
        childBlocks.push(nextBlock);
        continue;
      }
    }

    // Reached a non-empty sibling or ancestor
    break;
  }

  return childBlocks;
}

function deleteCollapsedIndent(view: any, targetPos: number): boolean {
  const state = view.state;
  const doc = state.doc;
  const $target = doc.resolve(targetPos + 1);
  const parent = $target.parent;

  // Check if target is a native TipTap listItem / taskItem with a nested list
  if (parent.type.name === 'listItem' || parent.type.name === 'taskItem') {
    let nestedListPos = -1;
    let nestedListSize = 0;
    parent.forEach((child: any, childOffset: number) => {
      if (
        child.type.name === 'bulletList' ||
        child.type.name === 'orderedList' ||
        child.type.name === 'taskList'
      ) {
        nestedListPos = targetPos + 1 + childOffset;
        nestedListSize = child.nodeSize;
      }
    });

    if (nestedListPos >= 0 && nestedListSize > 0) {
      let tr = state.tr.delete(nestedListPos, nestedListPos + nestedListSize);
      tr = tr.setMeta('unfoldIndent', targetPos);
      const lastCharPos = targetPos + parent.nodeSize - nestedListSize - 1;
      tr = tr.setSelection(TextSelection.create(tr.doc, lastCharPos));
      view.dispatch(tr);
      view.focus();
      return true;
    }
  }

  // Soft-indented paragraph blocks (multi-level tree)
  const blocks = extractBlocks(doc);
  const targetIdx = blocks.findIndex((b) => b.pos === targetPos || Math.abs(b.pos - targetPos) <= 2);

  let childStartPos: number | null = null;
  let childEndPos: number | null = null;

  if (targetIdx >= 0) {
    const childBlocks = getChildBlocksForIndent(blocks, targetIdx);
    if (childBlocks.length > 0) {
      childStartPos = childBlocks[0].pos;
      const lastChild = childBlocks[childBlocks.length - 1];
      childEndPos = lastChild.pos + lastChild.nodeSize;
    }
  }

  let tr = state.tr;
  if (childStartPos !== null && childEndPos !== null && childStartPos < childEndPos) {
    tr = tr.delete(childStartPos, childEndPos);
  }
  tr = tr.setMeta('unfoldIndent', targetPos);
  const targetSize = targetIdx >= 0 ? blocks[targetIdx].nodeSize : parent.nodeSize;
  const lastCharPos = targetPos + targetSize - 1;
  tr = tr.setSelection(TextSelection.create(tr.doc, lastCharPos));
  view.dispatch(tr);
  view.focus();
  return true;
}

function deleteCollapsedHeading(view: any, targetPos: number): boolean {
  const state = view.state;
  const $target = state.doc.resolve(targetPos + 1);
  const parent = $target.parent;
  const currentLevel = parent.attrs.level || 1;

  let endPos = state.doc.content.size;
  state.doc.descendants((node: any, pos: number) => {
    if (pos > targetPos && node.type.name === 'heading') {
      const level = node.attrs.level || 1;
      if (level <= currentLevel && endPos === state.doc.content.size) {
        endPos = pos;
        return false;
      }
    }
  });

  const startPos = targetPos + parent.nodeSize;
  let tr = state.tr;
  if (startPos < endPos) {
    tr = tr.delete(startPos, endPos);
  }
  tr = tr.setMeta('unfoldHeading', targetPos);
  const lastCharPos = targetPos + parent.nodeSize - 1;
  tr = tr.setSelection(TextSelection.create(tr.doc, lastCharPos));
  view.dispatch(tr);
  view.focus();
  return true;
}

function createFoldPlaceholder(onClick: () => void, onDelete?: () => void): HTMLElement {
  const container = document.createElement('span');
  container.className = 'flint-fold-placeholder-wrap';
  container.contentEditable = 'false';

  const badge = document.createElement('span');
  badge.className = 'flint-fold-placeholder';
  badge.textContent = '\u2026';
  badge.setAttribute('role', 'button');
  badge.setAttribute('aria-label', 'Expand folded section');
  badge.setAttribute('data-tooltip', 'Click to expand');
  badge.removeAttribute('title');
  badge.onmousedown = (e) => {
    if (e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  container.appendChild(badge);

  // Editable trailing tail for natural browser caret positioning after the ellipsis
  const tail = document.createElement('span');
  tail.className = 'flint-fold-tail';
  tail.contentEditable = 'true';
  tail.textContent = '\u200B';
  tail.style.userSelect = 'text';
  tail.style.outline = 'none';

  tail.onkeydown = (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      e.stopPropagation();
      if (onDelete) {
        onDelete();
      }
    }
  };

  container.appendChild(tail);
  return container;
}

function buildFoldDecorations(
  doc: any,
  foldedHeadings: Set<number>,
  foldedIndents: Set<number>
): DecorationSet {
  const { foldHeading, foldIndent } = useSettingsStore.getState();
  if (!foldHeading && !foldIndent) return DecorationSet.empty;

  const decorations: Decoration[] = [];

  // 1. Fold Headings
  if (foldHeading) {
    const headings: { pos: number; level: number; nodeSize: number }[] = [];
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'heading') {
        headings.push({
          pos,
          level: node.attrs.level || 1,
          nodeSize: node.nodeSize,
        });
      }
    });

    headings.forEach((h, idx) => {
      const isFolded = Array.from<number>(foldedHeadings as any).some(
        (pos) => pos === h.pos || (pos >= h.pos && pos < h.pos + h.nodeSize)
      );

      decorations.push(
        Decoration.widget(
          h.pos + 1,
          (view) => {
            const container = document.createElement('span');
            container.className = 'flint-fold-widget';
            container.contentEditable = 'false';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `flint-fold-btn flint-fold-h${h.level} ${isFolded ? 'is-folded' : 'is-unfolded'}`;
            btn.innerHTML = getHeadingChevronSvg(h.level, isFolded);
            btn.setAttribute('data-tooltip', isFolded ? 'Unfold section' : 'Fold section');
            btn.removeAttribute('title');
            btn.onmousedown = (e) => {
              e.preventDefault();
              e.stopPropagation();
              view.dispatch(view.state.tr.setMeta('toggleFoldHeading', h.pos));
            };

            container.appendChild(btn);
            return container;
          },
          { side: -1, ignoreSelection: true }
        )
      );

      if (isFolded) {
        let endPos = doc.content.size;
        for (let j = idx + 1; j < headings.length; j++) {
          if (headings[j].level <= h.level) {
            endPos = headings[j].pos;
            break;
          }
        }

        const startPos = h.pos + h.nodeSize;
        if (startPos < endPos) {
          doc.nodesBetween(startPos, endPos, (node: any, pos: number) => {
            if (pos >= startPos && pos < endPos && node.isBlock && node.type.name !== 'heading') {
              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  class: 'flint-folded-node',
                })
              );
            }
          });
        }

        // Add clickable literal unicode ellipsis placeholder at the end of the folded heading
        decorations.push(
          Decoration.widget(
            h.pos + h.nodeSize - 1,
            (view) =>
              createFoldPlaceholder(
                () => {
                  view.dispatch(view.state.tr.setMeta('toggleFoldHeading', h.pos));
                },
                () => {
                  deleteCollapsedHeading(view, h.pos);
                }
              ),
            { side: 1, ignoreSelection: false }
          )
        );
      }
    });
  }

  // 2. Fold Lists and Numbers (Indented list items & nested lists)
  if (foldIndent) {
    const blocks = extractBlocks(doc);

    // Evaluate foldable paragraph list items
    blocks.forEach((block, idx) => {
      if (!block.isList) return;

      const childBlocks = getChildBlocksForIndent(blocks, idx);

      if (childBlocks.length > 0) {
        const isFolded = Array.from<number>(foldedIndents as any).some(
          (pos) => pos === block.pos || (pos >= block.pos && pos < block.pos + block.nodeSize)
        );

        decorations.push(
          Decoration.widget(
            block.pos + 1 + block.leadingLen,
            (view) => {
              const container = document.createElement('span');
              container.className = 'flint-fold-widget';
              container.contentEditable = 'false';

              const btn = document.createElement('button');
              btn.type = 'button';
              btn.className = `flint-fold-btn flint-fold-list-btn ${isFolded ? 'is-folded' : 'is-unfolded'}`;
              btn.innerHTML = isFolded ? CHEVRON_RIGHT_SVG : CHEVRON_DOWN_SVG;
              btn.setAttribute('data-tooltip', isFolded ? 'Unfold list' : 'Fold list');
              btn.removeAttribute('title');
              btn.onmousedown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                view.dispatch(view.state.tr.setMeta('toggleFoldIndent', block.pos));
              };

              container.appendChild(btn);
              return container;
            },
            { side: -1, ignoreSelection: true }
          )
        );

        if (isFolded) {
          childBlocks.forEach((child) => {
            decorations.push(
              Decoration.node(child.pos, child.pos + child.nodeSize, {
                class: 'flint-folded-node',
              })
            );
          });

          // Add clickable literal unicode ellipsis placeholder at the end of the folded list item
          decorations.push(
            Decoration.widget(
              block.pos + block.nodeSize - 1,
              (view) =>
                createFoldPlaceholder(
                  () => {
                    view.dispatch(view.state.tr.setMeta('toggleFoldIndent', block.pos));
                  },
                  () => {
                    deleteCollapsedIndent(view, block.pos);
                  }
                ),
              { side: 1, ignoreSelection: false }
            )
          );
        }
      }
    });

    // Also support native TipTap listItem / taskItem nodes
    doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
        let hasNestedList = false;
        let nestedListPos = -1;
        let nestedListSize = 0;

        node.forEach((child: any, childOffset: number) => {
          if (
            child.type.name === 'bulletList' ||
            child.type.name === 'orderedList' ||
            child.type.name === 'taskList'
          ) {
            hasNestedList = true;
            nestedListPos = pos + 1 + childOffset;
            nestedListSize = child.nodeSize;
          }
        });

        if (hasNestedList && nestedListPos >= 0) {
          const isFolded = Array.from<number>(foldedIndents as any).some(
            (p) => p === pos || (p >= pos && p < pos + node.nodeSize)
          );

          decorations.push(
            Decoration.widget(
              pos + 1,
              (view) => {
                const container = document.createElement('span');
                container.className = 'flint-fold-widget';
                container.contentEditable = 'false';

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `flint-fold-btn flint-fold-list-btn ${isFolded ? 'is-folded' : 'is-unfolded'}`;
                btn.innerHTML = isFolded ? CHEVRON_RIGHT_SVG : CHEVRON_DOWN_SVG;
                btn.setAttribute('data-tooltip', isFolded ? 'Unfold list' : 'Fold list');
                btn.removeAttribute('title');
                btn.onmousedown = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  view.dispatch(view.state.tr.setMeta('toggleFoldIndent', pos));
                };

                container.appendChild(btn);
                return container;
              },
              { side: -1, ignoreSelection: true }
            )
          );

          if (isFolded) {
            decorations.push(
              Decoration.node(nestedListPos, nestedListPos + nestedListSize, {
                class: 'flint-folded-node',
              })
            );

            decorations.push(
              Decoration.widget(
                nestedListPos - 1,
                (view) =>
                  createFoldPlaceholder(
                    () => {
                      view.dispatch(view.state.tr.setMeta('toggleFoldIndent', pos));
                    },
                    () => {
                      deleteCollapsedIndent(view, pos);
                    }
                  ),
                { side: 1, ignoreSelection: false }
              )
            );
          }
        }
      }
    });
  }

  return DecorationSet.create(doc, decorations);
}

export interface FoldOptions {
  documentId?: string;
}

export const Fold = Extension.create<FoldOptions>({
  name: 'fold',

  addOptions() {
    return {
      documentId: undefined,
    };
  },

  addProseMirrorPlugins() {
    const documentId = this.options.documentId;

    return [
      new Plugin<FoldPluginState>({
        key: FoldPluginKey,
        state: {
          init(config, instance) {
            const { foldedHeadings, foldedIndents } = instance
              ? loadFoldState(instance.doc, documentId)
              : { foldedHeadings: new Set<number>(), foldedIndents: new Set<number>() };
            const decorations = instance
              ? buildFoldDecorations(instance.doc, foldedHeadings, foldedIndents)
              : DecorationSet.empty;
            return {
              foldedHeadings,
              foldedIndents,
              decorations,
            };
          },
          apply(tr, oldState) {
            const toggleHeadingPos = tr.getMeta('toggleFoldHeading');
            const unfoldHeadingPos = tr.getMeta('unfoldHeading');
            const toggleIndentPos = tr.getMeta('toggleFoldIndent');
            const unfoldIndentPos = tr.getMeta('unfoldIndent');
            const reloadFoldState = tr.getMeta('reloadFoldState');

            if (
              toggleHeadingPos === undefined &&
              unfoldHeadingPos === undefined &&
              toggleIndentPos === undefined &&
              unfoldIndentPos === undefined &&
              reloadFoldState === undefined &&
              !tr.docChanged
            ) {
              return oldState;
            }

            let nextFoldedHeadings = new Set<number>();
            let nextFoldedIndents = new Set<number>();

            // Restore saved fold state only on reload, init, or when state was completely uninitialized
            if (reloadFoldState || (oldState.foldedHeadings.size === 0 && oldState.foldedIndents.size === 0 && !tr.docChanged)) {
              const loaded = loadFoldState(tr.doc, documentId);
              nextFoldedHeadings = loaded.foldedHeadings;
              nextFoldedIndents = loaded.foldedIndents;
            } else if (tr.docChanged) {
              oldState.foldedHeadings.forEach((pos: number) => {
                const mapped = tr.mapping.map(pos, -1);
                nextFoldedHeadings.add(mapped);
              });
              oldState.foldedIndents.forEach((pos: number) => {
                const mapped = tr.mapping.map(pos, -1);
                nextFoldedIndents.add(mapped);
              });
            } else {
              oldState.foldedHeadings.forEach((pos: number) => nextFoldedHeadings.add(pos));
              oldState.foldedIndents.forEach((pos: number) => nextFoldedIndents.add(pos));
            }

            if (unfoldHeadingPos !== undefined) {
              let existingMatch: number | null = null;
              nextFoldedHeadings.forEach((pos) => {
                if (pos === unfoldHeadingPos || Math.abs(pos - unfoldHeadingPos) <= 2) {
                  existingMatch = pos;
                }
              });
              if (existingMatch !== null) {
                nextFoldedHeadings.delete(existingMatch);
              }
            }

            if (unfoldIndentPos !== undefined) {
              let existingMatch: number | null = null;
              nextFoldedIndents.forEach((pos) => {
                if (pos === unfoldIndentPos || Math.abs(pos - unfoldIndentPos) <= 2) {
                  existingMatch = pos;
                }
              });
              if (existingMatch !== null) {
                nextFoldedIndents.delete(existingMatch);
              }
            }

            if (toggleHeadingPos !== undefined) {
              let existingMatch: number | null = null;
              nextFoldedHeadings.forEach((pos) => {
                if (pos === toggleHeadingPos || Math.abs(pos - toggleHeadingPos) <= 2) {
                  existingMatch = pos;
                }
              });

              if (existingMatch !== null) {
                nextFoldedHeadings.delete(existingMatch);
              } else {
                nextFoldedHeadings.add(toggleHeadingPos);
              }
            }

            if (toggleIndentPos !== undefined) {
              let existingMatch: number | null = null;
              nextFoldedIndents.forEach((pos) => {
                if (pos === toggleIndentPos || Math.abs(pos - toggleIndentPos) <= 2) {
                  existingMatch = pos;
                }
              });

              if (existingMatch !== null) {
                nextFoldedIndents.delete(existingMatch);
              } else {
                nextFoldedIndents.add(toggleIndentPos);
              }
            }

            const isFoldAction =
              toggleHeadingPos !== undefined ||
              unfoldHeadingPos !== undefined ||
              toggleIndentPos !== undefined ||
              unfoldIndentPos !== undefined;

            // Save folded state for cross-session persistence on user fold actions
            if (isFoldAction) {
              saveFoldState(tr.doc, nextFoldedHeadings, nextFoldedIndents, documentId);
            }

            const decorations = buildFoldDecorations(
              tr.doc,
              nextFoldedHeadings,
              nextFoldedIndents
            );

            return {
              foldedHeadings: nextFoldedHeadings,
              foldedIndents: nextFoldedIndents,
              decorations,
            };
          },
        },
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const textBlock = target.closest('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror li');
            if (textBlock) {
              const placeholder = textBlock.querySelector('.flint-fold-placeholder');
              const tail = textBlock.querySelector('.flint-fold-tail');
              if (placeholder && tail && tail.firstChild) {
                const phRect = placeholder.getBoundingClientRect();
                // If user clicked in front of the ellipsis (to the right of the ellipsis dots)
                if (event.clientX > phRect.right) {
                  event.preventDefault();
                  event.stopPropagation();
                  const sel = window.getSelection();
                  const range = document.createRange();
                  range.setStart(tail.firstChild, 1);
                  range.collapse(true);
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                  return true;
                }
              }
            }
            return false;
          },

          handleTextInput(view, from, to, text) {
            const domSel = window.getSelection();
            const isInTail = Boolean(
              domSel?.anchorNode &&
              ((domSel.anchorNode as HTMLElement).classList?.contains('flint-fold-tail') ||
               domSel.anchorNode.parentElement?.classList?.contains('flint-fold-tail') ||
               (domSel.anchorNode as HTMLElement).closest?.('.flint-fold-tail'))
            );

            if (isInTail) {
              const { state } = view;
              const { $from } = state.selection;
              const parent = $from.parent;
              const parentPos = $from.before();
              const lastCharPos = parentPos + parent.nodeSize - 1;

              let tr = state.tr;
              if (parent.type.name === 'heading') {
                tr = tr.setMeta('unfoldHeading', parentPos);
              } else {
                tr = tr.setMeta('unfoldIndent', parentPos);
              }

              tr = tr.insertText(text, lastCharPos);
              tr = tr.setSelection(TextSelection.create(tr.doc, lastCharPos + text.length));
              view.dispatch(tr);
              view.focus();
              return true;
            }
            return false;
          },

          handleKeyDown(view, event) {
            const { state } = view;
            const { selection } = state;
            const { $from, $to } = selection;

            const pluginState = FoldPluginKey.getState(state);
            const foldedHeadings = pluginState?.foldedHeadings || new Set<number>();
            const foldedIndents = pluginState?.foldedIndents || new Set<number>();

            // Check if DOM selection is inside .flint-fold-tail (in front of the ellipsis)
            const domSel = window.getSelection();
            const isInTail = Boolean(
              domSel?.anchorNode &&
              ((domSel.anchorNode as HTMLElement).classList?.contains('flint-fold-tail') ||
               domSel.anchorNode.parentElement?.classList?.contains('flint-fold-tail') ||
               (domSel.anchorNode as HTMLElement).closest?.('.flint-fold-tail'))
            );

            // 1. If currently inside .flint-fold-tail (after the ellipsis)
            if (isInTail) {
              const anchorEl = (domSel?.anchorNode as HTMLElement)?.nodeType === 1
                ? (domSel?.anchorNode as HTMLElement)
                : (domSel?.anchorNode?.parentElement as HTMLElement);
              const textBlock = anchorEl?.closest?.('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror li');

              let parentPos = $from.before();
              let parentNode = $from.parent;

              if (textBlock) {
                const domPos = view.posAtDOM(textBlock, 0);
                if (typeof domPos === 'number') {
                  const $res = state.doc.resolve(domPos);
                  parentPos = $res.before();
                  parentNode = $res.parent;
                }
              }

              const lastCharPos = parentPos + parentNode.nodeSize - 1;

              if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                event.stopPropagation();
                if (parentNode.type.name === 'heading') {
                  return deleteCollapsedHeading(view, parentPos);
                } else {
                  return deleteCollapsedIndent(view, parentPos);
                }
              }

              // Stepping Left (<) from the ellipsis moves caret to the EXACT last character
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                event.stopPropagation();
                const tr = state.tr.setSelection(TextSelection.create(state.doc, lastCharPos));
                view.dispatch(tr);
                view.focus();
                return true;
              }

              // Typing Enter after the ellipsis unfolds section and creates a newline
              if (event.key === 'Enter' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                event.preventDefault();
                event.stopPropagation();
                let tr = state.tr;
                if (parentNode.type.name === 'heading') {
                  tr = tr.setMeta('unfoldHeading', parentPos);
                } else {
                  tr = tr.setMeta('unfoldIndent', parentPos);
                }
                const paragraphType = state.schema.nodes.paragraph;
                const newParagraph = paragraphType ? paragraphType.createAndFill() : null;
                const insertPos = parentPos + parentNode.nodeSize;
                if (newParagraph) {
                  tr = tr.insert(insertPos, newParagraph);
                  tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + 1)).scrollIntoView();
                }
                view.dispatch(tr);
                view.focus();
                return true;
              }

              // Typing any printable character after the ellipsis expands section and appends to line
              if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                event.stopPropagation();
                let tr = state.tr;
                if (parentNode.type.name === 'heading') {
                  tr = tr.setMeta('unfoldHeading', parentPos);
                } else {
                  tr = tr.setMeta('unfoldIndent', parentPos);
                }
                tr = tr.insertText(event.key, lastCharPos);
                tr = tr.setSelection(TextSelection.create(tr.doc, lastCharPos + event.key.length));
                view.dispatch(tr);
                view.focus();
                return true;
              }
            }

            // 2. Normal cursor at the end of folded line
            if (selection.empty) {
              const parent = $from.parent;
              const parentPos = $from.before();
              const isAtEnd = $from.parentOffset >= parent.content.size;

              const isHeadingFolded = Array.from<number>(foldedHeadings as any).some(
                (pos) => pos === parentPos || Math.abs(pos - parentPos) <= 2
              );
              const isIndentFolded = Array.from<number>(foldedIndents as any).some(
                (pos) => pos === parentPos || Math.abs(pos - parentPos) <= 2
              );
              const isFolded = isHeadingFolded || isIndentFolded;

              if (isAtEnd && isFolded && !isInTail) {
                // When at the end of the text, pressing ArrowRight steps into the tail after the ellipsis
                if (event.key === 'ArrowRight') {
                  const domNode = view.nodeDOM(parentPos) as HTMLElement || (view.domAtPos(parentPos).node as HTMLElement);
                  const tail = domNode?.querySelector?.('.flint-fold-tail') || document.querySelector('.flint-fold-tail');
                  if (tail && tail.firstChild) {
                    event.preventDefault();
                    event.stopPropagation();
                    const sel = window.getSelection();
                    const range = document.createRange();
                    range.setStart(tail.firstChild, 1);
                    range.collapse(true);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                    return true;
                  }
                }

                // Forward Delete at the end of the line right before the ellipsis deletes the entire collapsed section
                if (event.key === 'Delete') {
                  event.preventDefault();
                  event.stopPropagation();
                  if (parent.type.name === 'heading') {
                    return deleteCollapsedHeading(view, parentPos);
                  } else {
                    return deleteCollapsedIndent(view, parentPos);
                  }
                }

                // Backspace on an empty or marker-only folded line deletes the collapsed section
                const isEmptyLine =
                  parent.content.size === 0 ||
                  /^[ \t]*(\d+\.|[a-zA-Z]{1,2}\.|[-*+]|\[[ xX]\])?[ \t]*$/.test(parent.textContent || '');

                if (event.key === 'Backspace' && isEmptyLine) {
                  event.preventDefault();
                  event.stopPropagation();
                  if (parent.type.name === 'heading') {
                    return deleteCollapsedHeading(view, parentPos);
                  } else {
                    return deleteCollapsedIndent(view, parentPos);
                  }
                }
              }
            }

            // 3. Handle Enter inside headings
            if (
              event.key === 'Enter' &&
              !event.ctrlKey &&
              !event.altKey &&
              !event.metaKey
            ) {
              if (!$from.sameParent($to)) return false;

              const parent = $from.parent;
              if (parent.type.name === 'heading') {
                const headingPos = $from.before();
                const isHeadingFolded = Array.from<number>(foldedHeadings as any).some(
                  (pos) => pos === headingPos || (pos >= headingPos && pos < headingPos + parent.nodeSize)
                );

                event.preventDefault();
                event.stopPropagation();

                let tr = state.tr;
                if (isHeadingFolded) {
                  tr = tr.setMeta('unfoldHeading', headingPos);
                }

                const paragraphType = state.schema.nodes.paragraph;

                if ($from.parentOffset >= parent.content.size) {
                  const insertPos = headingPos + parent.nodeSize;
                  const newParagraph = paragraphType ? paragraphType.createAndFill() : null;
                  if (newParagraph) {
                    tr = tr.insert(insertPos, newParagraph);
                    const newSel = TextSelection.create(tr.doc, insertPos + 1);
                    tr = tr.setSelection(newSel).scrollIntoView();
                  }
                } else {
                  const textAfter = parent.textBetween($from.parentOffset, parent.content.size);
                  const newParagraph = paragraphType
                    ? paragraphType.create(null, textAfter ? state.schema.text(textAfter) : null)
                    : null;
                  if (newParagraph) {
                    tr = tr.delete($from.pos, headingPos + parent.nodeSize - 1);
                    tr = tr.insert($from.pos, newParagraph);
                    const newSel = TextSelection.create(tr.doc, $from.pos + 1);
                    tr = tr.setSelection(newSel).scrollIntoView();
                  }
                }

                view.dispatch(tr);
                return true;
              }
            }
            return false;
          },

          decorations(state) {
            return FoldPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

/** Backward compatibility alias */
export const FoldHeading = Fold;
