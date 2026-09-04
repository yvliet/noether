import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { getEffectiveTextRange } from './markdown-shortcuts';
import { useSettingsStore } from '@/store/settingsStore';

export const AutoPairingPluginKey = new PluginKey('autoPairing');

const BRACKET_PAIRS: Record<string, string> = {
  '[': ']',
  '(': ')',
  '{': '}',
  '"': '"',
};

const CLOSING_CHARS = new Set([']', ')', '}', '"', '*', '`', '~', '=']);

export interface AutoPairingStorage {
  autoPairing: boolean;
  unsubscribe: (() => void) | null;
}

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
    const editor = this.editor;

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

              // 1. Text is selected: wrap or unwrap via editor.chain()
              if (!empty) {
                const range = getEffectiveTextRange(state.doc, selection);
                if (range.empty) return false;
                const { from, to, text: selText } = range;

                const $from = state.doc.resolve(from);
                const blockStart = $from.start();
                const blockEnd = $from.end();
                const blockText = state.doc.textBetween(blockStart, blockEnd);
                const selStartInBlock = from - blockStart;
                const selEndInBlock = to - blockStart;

                const beforeTwo = selStartInBlock >= 2 ? blockText.slice(selStartInBlock - 2, selStartInBlock) : '';
                const afterTwo = selEndInBlock <= blockText.length - 2 ? blockText.slice(selEndInBlock, selEndInBlock + 2) : '';
                const beforeOne = selStartInBlock >= 1 ? blockText.slice(selStartInBlock - 1, selStartInBlock) : '';
                const afterOne = selEndInBlock <= blockText.length - 1 ? blockText.slice(selEndInBlock, selEndInBlock + 1) : '';

                if (key === '*') {
                  event.preventDefault();
                  event.stopPropagation();

                  if (selText.startsWith('*') && selText.endsWith('*') && !selText.startsWith('**') && selText.length >= 2) {
                    const unwrapped = selText.slice(1, -1);
                    const tr = state.tr.replaceWith(from, to, state.schema.text(unwrapped));
                    tr.setSelection(TextSelection.create(tr.doc, from, from + unwrapped.length));
                    view.dispatch(tr);
                  } else if (beforeOne === '*' && afterOne === '*' && beforeTwo !== '**' && afterTwo !== '**') {
                    const innerLength = to - from;
                    const tr = state.tr;
                    tr.delete(to, to + 1);
                    tr.delete(from - 1, from);
                    tr.setSelection(TextSelection.create(tr.doc, from - 1, from - 1 + innerLength));
                    view.dispatch(tr);
                  } else {
                    const tr = state.tr.replaceWith(from, to, state.schema.text(`*${selText}*`));
                    tr.setSelection(TextSelection.create(tr.doc, from + 1, from + 1 + selText.length));
                    view.dispatch(tr);
                  }
                  return true;
                }

                if (key === '`') {
                  event.preventDefault();
                  event.stopPropagation();

                  if (selText.startsWith('`') && selText.endsWith('`') && selText.length >= 2) {
                    const unwrapped = selText.slice(1, -1);
                    const tr = state.tr.replaceWith(from, to, state.schema.text(unwrapped));
                    tr.setSelection(TextSelection.create(tr.doc, from, from + unwrapped.length));
                    view.dispatch(tr);
                  } else if (beforeOne === '`' && afterOne === '`') {
                    const innerLength = to - from;
                    const tr = state.tr;
                    tr.delete(to, to + 1);
                    tr.delete(from - 1, from);
                    tr.setSelection(TextSelection.create(tr.doc, from - 1, from - 1 + innerLength));
                    view.dispatch(tr);
                  } else {
                    const tr = state.tr.replaceWith(from, to, state.schema.text(`\`${selText}\``));
                    tr.setSelection(TextSelection.create(tr.doc, from + 1, from + 1 + selText.length));
                    view.dispatch(tr);
                  }
                  return true;
                }

                if (key === '~') {
                  event.preventDefault();
                  event.stopPropagation();

                  if (selText.startsWith('~~') && selText.endsWith('~~') && selText.length >= 4) {
                    const unwrapped = selText.slice(2, -2);
                    const tr = state.tr.replaceWith(from, to, state.schema.text(unwrapped));
                    tr.setSelection(TextSelection.create(tr.doc, from, from + unwrapped.length));
                    view.dispatch(tr);
                  } else if (beforeTwo === '~~' && afterTwo === '~~') {
                    const innerLength = to - from;
                    const tr = state.tr;
                    tr.delete(to, to + 2);
                    tr.delete(from - 2, from);
                    tr.setSelection(TextSelection.create(tr.doc, from - 2, from - 2 + innerLength));
                    view.dispatch(tr);
                  } else {
                    const tr = state.tr.replaceWith(from, to, state.schema.text(`~~${selText}~~`));
                    tr.setSelection(TextSelection.create(tr.doc, from + 2, from + 2 + selText.length));
                    view.dispatch(tr);
                  }
                  return true;
                }

                if (key === '=') {
                  event.preventDefault();
                  event.stopPropagation();

                  if (selText.startsWith('==') && selText.endsWith('==') && selText.length >= 4) {
                    const unwrapped = selText.slice(2, -2);
                    const tr = state.tr.replaceWith(from, to, state.schema.text(unwrapped));
                    tr.setSelection(TextSelection.create(tr.doc, from, from + unwrapped.length));
                    view.dispatch(tr);
                  } else if (beforeTwo === '==' && afterTwo === '==') {
                    const innerLength = to - from;
                    const tr = state.tr;
                    tr.delete(to, to + 2);
                    tr.delete(from - 2, from);
                    tr.setSelection(TextSelection.create(tr.doc, from - 2, from - 2 + innerLength));
                    view.dispatch(tr);
                  } else {
                    const tr = state.tr.replaceWith(from, to, state.schema.text(`==${selText}==`));
                    tr.setSelection(TextSelection.create(tr.doc, from + 2, from + 2 + selText.length));
                    view.dispatch(tr);
                  }
                  return true;
                }

                if (key === '[' || key === ']') {
                  event.preventDefault();
                  event.stopPropagation();

                  // Case 1: Selection itself is [[...]] -> unwrap to plain text
                  if (selText.startsWith('[[') && selText.endsWith(']]') && selText.length >= 4) {
                    const unwrapped = selText.slice(2, -2);
                    const tr = state.tr.replaceWith(from, to, state.schema.text(unwrapped));
                    tr.setSelection(TextSelection.create(tr.doc, from, from + unwrapped.length));
                    view.dispatch(tr);
                    return true;
                  }

                  // Case 2: Selected text is surrounded by [[ before and ]] after -> unwrap
                  if (beforeTwo === '[[' && afterTwo === ']]') {
                    const innerLength = to - from;
                    const tr = state.tr;
                    tr.delete(to, to + 2);
                    tr.delete(from - 2, from);
                    tr.setSelection(TextSelection.create(tr.doc, from - 2, from - 2 + innerLength));
                    view.dispatch(tr);
                    return true;
                  }

                  // Case 3: Selection is single-bracketed [text] -> upgrade to [[text]]
                  if (selText.startsWith('[') && selText.endsWith(']') && selText.length >= 2) {
                    const inner = selText.slice(1, -1);
                    const tr = state.tr.replaceWith(from, to, state.schema.text(`[[${inner}]]`));
                    tr.setSelection(TextSelection.create(tr.doc, from + 2, from + 2 + inner.length));
                    view.dispatch(tr);
                    return true;
                  }

                  // Case 4: Selected text is surrounded by [ before and ] after -> upgrade to [[text]]
                  if (beforeOne === '[' && afterOne === ']') {
                    const innerLength = selText.length;
                    const tr = state.tr.replaceWith(from - 1, to + 1, state.schema.text(`[[${selText}]]`));
                    tr.setSelection(TextSelection.create(tr.doc, from + 1, from + 1 + innerLength));
                    view.dispatch(tr);
                    return true;
                  }

                  // Case 5: Plain text selected -> wrap in [...] first (progressive wrapping)
                  const tr = state.tr.replaceWith(from, to, state.schema.text(`[${selText}]`));
                  tr.setSelection(TextSelection.create(tr.doc, from + 1, from + 1 + selText.length));
                  view.dispatch(tr);
                  return true;
                }

                if (BRACKET_PAIRS[key]) {
                  event.preventDefault();
                  event.stopPropagation();

                  const closeChar = BRACKET_PAIRS[key];
                  if (beforeOne === key && afterOne === closeChar) {
                    const innerLength = to - from;
                    const tr = state.tr;
                    tr.delete(to, to + 1);
                    tr.delete(from - 1, from);
                    tr.setSelection(TextSelection.create(tr.doc, from - 1, from - 1 + innerLength));
                    view.dispatch(tr);
                  } else {
                    const tr = state.tr.replaceWith(from, to, state.schema.text(`${key}${selText}${closeChar}`));
                    tr.setSelection(TextSelection.create(tr.doc, from + 1, from + 1 + selText.length));
                    view.dispatch(tr);
                  }
                  return true;
                }
              }

              // 2. Selection is collapsed: auto-pair, step-over, or backspace
              if (empty) {
                const afterChar = state.doc.textBetween(from, Math.min(from + 1, state.doc.content.size));

                // Step over closing character
                if (CLOSING_CHARS.has(key) && key === afterChar) {
                  event.preventDefault();
                  event.stopPropagation();
                  const tr = state.tr.setSelection(TextSelection.create(state.doc, from + 1));
                  view.dispatch(tr);
                  return true;
                }

                // Auto-pair asterisks
                if (key === '*') {
                  event.preventDefault();
                  event.stopPropagation();

                  const beforeChar = from > 0 ? state.doc.textBetween(from - 1, from) : '';
                  const insertText = beforeChar === '*' ? '***' : '**';
                  const tr = state.tr.insertText(insertText, from);
                  tr.setSelection(TextSelection.create(tr.doc, from + 1));
                  view.dispatch(tr);
                  return true;
                }

                // Auto-pair inline code
                if (key === '`') {
                  event.preventDefault();
                  event.stopPropagation();

                  const tr = state.tr.insertText('``', from);
                  tr.setSelection(TextSelection.create(tr.doc, from + 1));
                  view.dispatch(tr);
                  return true;
                }

                // Auto-pair highlight
                if (key === '=') {
                  const beforeChar = from > 0 ? state.doc.textBetween(from - 1, from) : '';
                  if (beforeChar === '=') {
                    event.preventDefault();
                    event.stopPropagation();
                    const tr = state.tr.insertText('===', from);
                    tr.setSelection(TextSelection.create(tr.doc, from + 1));
                    view.dispatch(tr);
                    return true;
                  }
                }

                // Auto-pair brackets & quotes
                if (BRACKET_PAIRS[key]) {
                  event.preventDefault();
                  event.stopPropagation();

                  const closeChar = BRACKET_PAIRS[key];
                  const tr = state.tr.insertText(`${key}${closeChar}`, from);
                  tr.setSelection(TextSelection.create(tr.doc, from + 1));
                  view.dispatch(tr);
                  return true;
                }

                // Backspace deleting pairs
                if (key === 'Backspace') {
                  const pos = from;
                  if (pos > 0 && pos < state.doc.content.size) {
                    const prevChar = state.doc.textBetween(pos - 1, pos);
                    const nextChar = state.doc.textBetween(pos, pos + 1);

                    if (
                      (BRACKET_PAIRS[prevChar] && BRACKET_PAIRS[prevChar] === nextChar) ||
                      (prevChar === '*' && nextChar === '*') ||
                      (prevChar === '`' && nextChar === '`')
                    ) {
                      event.preventDefault();
                      event.stopPropagation();
                      const tr = state.tr.delete(pos - 1, pos + 1);
                      view.dispatch(tr);
                      return true;
                    }

                    if (pos >= 2 && pos + 2 <= state.doc.content.size) {
                      const prevTwo = state.doc.textBetween(pos - 2, pos);
                      const nextTwo = state.doc.textBetween(pos, pos + 2);
                      if (
                        (prevTwo === '**' && nextTwo === '**') ||
                        (prevTwo === '~~' && nextTwo === '~~') ||
                        (prevTwo === '==' && nextTwo === '==') ||
                        (prevTwo === '$$' && nextTwo === '$$') ||
                        (prevTwo === '[[' && nextTwo === ']]')
                      ) {
                        event.preventDefault();
                        event.stopPropagation();
                        const tr = state.tr.delete(pos - 2, pos + 2);
                        view.dispatch(tr);
                        return true;
                      }
                    }
                  }
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
