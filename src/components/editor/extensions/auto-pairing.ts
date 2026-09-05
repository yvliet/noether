import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { getEffectiveTextRange } from './markdown-shortcuts';
import { useSettingsStore } from '@/store/settingsStore';
import {
  analyzeSelectionWrap,
  getCollapsedPairingAction,
  getSmartBackspaceAction,
  getTabOutDelta,
} from './smart-pairing-utils';
import { findMathRangeAtPos } from './mathlive-wysiwyg';
import { isSuggestionActive } from './suggestion-state';

export const AutoPairingPluginKey = new PluginKey('autoPairing');

export interface AutoPairingStorage {
  autoPairing: boolean;
  unsubscribe: (() => void) | null;
}

/**
 * Smart Auto-Pairing and Autowrapping Extension for Flint.
 *
 * 1. Soft Undo: Immediately pressing Backspace after an auto-pair removes ONLY the auto-inserted
 *    closing character, allowing typists to type single characters (e.g. emoticons or footnotes)
 *    without being trapped in unwanted pairs.
 * 2. Tab Out: Pressing Tab immediately before a closing delimiter jumps out past the closing delimiter,
 *    keeping hands firmly anchored to the home row without reaching for arrow keys.
 * 3. Asymmetric Selection Balancing: Pre-existing delimiters on one side are balanced without creating
 *    malformed syntax like `**word*`.
 * 4. Math Subscript/Superscript: Auto-braces `^{}` and `_{}` when typing inside LaTeX math spans.
 * 5. Single Quote Intelligence: Distinguishes between English contractions (`don't`) and paired quotes.
 */
export const AutoPairing = Extension.create<never, AutoPairingStorage>({
  name: 'autoPairing',

  addStorage() {
    return {
      autoPairing: useSettingsStore.getState().autoPairing ?? true,
      unsubscribe: null,
    };
  },

  onCreate() {
    this.storage.autoPairing = useSettingsStore.getState().autoPairing ?? true;
    this.storage.unsubscribe = useSettingsStore.subscribe((state) => {
      this.storage.autoPairing = state.autoPairing ?? true;
    });
  },

  onDestroy() {
    if (this.storage.unsubscribe) {
      this.storage.unsubscribe();
      this.storage.unsubscribe = null;
    }
  },

  addProseMirrorPlugins() {
    const extensionThis = this;
    let lastAutoPair: { pos: number; char: string } | null = null;

    return [
      new Plugin({
        key: AutoPairingPluginKey,
        props: {
          handleDOMEvents: {
            keydown(view, event) {
              if (event.ctrlKey || event.metaKey || event.altKey) return false;
              if (!extensionThis.storage.autoPairing) return false;

              const key = event.key;
              const { state } = view;
              const { selection } = state;
              const { from, to, empty } = selection;

              // 1. Text is selected: wrap or unwrap via smart selection wrapping
              if (!empty) {
                lastAutoPair = null;
                const range = getEffectiveTextRange(state.doc, selection);
                if (range.empty) return false;
                const { from: selFrom, to: selTo, text: selText } = range;

                const $from = state.doc.resolve(selFrom);
                const blockStart = $from.start();
                const blockEnd = $from.end();
                const blockText = state.doc.textBetween(blockStart, blockEnd);
                const selStartInBlock = selFrom - blockStart;
                const selEndInBlock = selTo - blockStart;

                const wrapResult = analyzeSelectionWrap(
                  selFrom,
                  selTo,
                  selText,
                  blockText,
                  selStartInBlock,
                  selEndInBlock,
                  key
                );

                if (wrapResult) {
                  event.preventDefault();
                  event.stopPropagation();
                  const tr = state.tr.replaceWith(
                    wrapResult.replaceFrom,
                    wrapResult.replaceTo,
                    state.schema.text(wrapResult.text)
                  );
                  tr.setSelection(
                    TextSelection.create(tr.doc, wrapResult.selectionFrom, wrapResult.selectionTo)
                  );
                  view.dispatch(tr);
                  return true;
                }
                return false;
              }

              // 2. Selection is collapsed: auto-pair, step-over, tab-out, or soft-undo
              if (empty) {
                const $from = state.doc.resolve(from);
                const blockStart = $from.start();
                const blockEnd = $from.end();
                const blockText = state.doc.textBetween(blockStart, blockEnd);
                const caretPosInBlock = from - blockStart;

                // 2A. Tab-Out: Pressing Tab before a closing delimiter steps out of it
                if (key === 'Tab' && !event.shiftKey) {
                  if (!isSuggestionActive(state)) {
                    const textAfter = blockText.slice(caretPosInBlock);
                    const tabDelta = getTabOutDelta(textAfter);
                    if (tabDelta > 0) {
                      event.preventDefault();
                      event.stopPropagation();
                      const tr = state.tr.setSelection(
                        TextSelection.create(state.doc, from + tabDelta)
                      );
                      view.dispatch(tr);
                      lastAutoPair = null;
                      return true;
                    }
                  }
                }

                // 2B. Backspace handling: Soft Undo or symmetrical contraction
                if (key === 'Backspace') {
                  // Soft Undo: If user immediately hits Backspace after an auto-pair,
                  // remove only the auto-inserted closing character, leaving the typed character intact.
                  if (lastAutoPair && lastAutoPair.pos === from) {
                    event.preventDefault();
                    event.stopPropagation();
                    const tr = state.tr.delete(from, from + lastAutoPair.char.length);
                    view.dispatch(tr);
                    lastAutoPair = null;
                    return true;
                  }
                  lastAutoPair = null;

                  const bsAction = getSmartBackspaceAction(blockText, caretPosInBlock);
                  if (bsAction) {
                    event.preventDefault();
                    event.stopPropagation();
                    const tr = state.tr.delete(
                      from - bsAction.deleteBefore,
                      from + bsAction.deleteAfter
                    );
                    view.dispatch(tr);
                    return true;
                  }
                  return false;
                }

                // Reset soft-undo tracking on non-backspace keystrokes
                lastAutoPair = null;

                // 2C. Math Subscript/Superscript Auto-Bracing inside $...$ or $$...$$
                if (key === '^' || key === '_') {
                  const mathRange = findMathRangeAtPos(state.doc, from);
                  if (mathRange) {
                    event.preventDefault();
                    event.stopPropagation();
                    const insert = `${key}{}`;
                    const tr = state.tr.insertText(insert, from);
                    tr.setSelection(TextSelection.create(tr.doc, from + 2));
                    view.dispatch(tr);
                    lastAutoPair = { pos: from + 2, char: '}' };
                    return true;
                  }
                }

                // 2D. Character pairing and smart actions
                const pairResult = getCollapsedPairingAction(key, blockText, caretPosInBlock);
                if (pairResult.action === 'none') {
                  return false;
                }

                event.preventDefault();
                event.stopPropagation();

                if (pairResult.action === 'step_over') {
                  const tr = state.tr.setSelection(
                    TextSelection.create(state.doc, from + (pairResult.caretDelta ?? 1))
                  );
                  view.dispatch(tr);
                  return true;
                }

                if (pairResult.action === 'bullet_space') {
                  const tr = state.tr;
                  if (pairResult.deleteAfter) {
                    tr.delete(from, from + pairResult.deleteAfter);
                  }
                  tr.insertText(pairResult.insertText ?? ' ', from);
                  tr.setSelection(
                    TextSelection.create(tr.doc, from + (pairResult.caretDelta ?? 1))
                  );
                  view.dispatch(tr);
                  return true;
                }

                if (pairResult.action === 'close_single') {
                  const tr = state.tr.insertText(pairResult.insertText ?? key, from);
                  tr.setSelection(
                    TextSelection.create(tr.doc, from + (pairResult.caretDelta ?? 1))
                  );
                  view.dispatch(tr);
                  return true;
                }

                if (pairResult.action === 'escalate') {
                  const insert = pairResult.insertText ?? '**';
                  const half = Math.floor(insert.length / 2);
                  const leftPart = insert.slice(0, half);
                  const rightPart = insert.slice(half);
                  const tr = state.tr;
                  tr.insertText(rightPart, from);
                  tr.insertText(leftPart, from);
                  tr.setSelection(TextSelection.create(tr.doc, from + leftPart.length));
                  view.dispatch(tr);
                  lastAutoPair = { pos: from + leftPart.length, char: rightPart };
                  return true;
                }

                if (pairResult.action === 'pair') {
                  const insert = pairResult.insertText ?? `${key}${key}`;
                  const delta = pairResult.caretDelta ?? 1;
                  const rightPart = insert.slice(delta);
                  const tr = state.tr.insertText(insert, from);
                  tr.setSelection(TextSelection.create(tr.doc, from + delta));
                  view.dispatch(tr);
                  lastAutoPair = { pos: from + delta, char: rightPart };
                  return true;
                }
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});
