import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
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
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, unwrapped)
                      .setTextSelection({ from, to: from + unwrapped.length })
                      .run();
                  } else if (beforeOne === '*' && afterOne === '*' && beforeTwo !== '**' && afterTwo !== '**') {
                    const innerLength = to - from;
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: to, to: to + 1 })
                      .deleteRange({ from: from - 1, to: from })
                      .setTextSelection({ from: from - 1, to: from - 1 + innerLength })
                      .run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, `*${selText}*`)
                      .setTextSelection({ from: from + 1, to: from + 1 + selText.length })
                      .run();
                  }
                  return true;
                }

                if (key === '`') {
                  event.preventDefault();
                  event.stopPropagation();

                  if (selText.startsWith('`') && selText.endsWith('`') && selText.length >= 2) {
                    const unwrapped = selText.slice(1, -1);
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, unwrapped)
                      .setTextSelection({ from, to: from + unwrapped.length })
                      .run();
                  } else if (beforeOne === '`' && afterOne === '`') {
                    const innerLength = to - from;
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: to, to: to + 1 })
                      .deleteRange({ from: from - 1, to: from })
                      .setTextSelection({ from: from - 1, to: from - 1 + innerLength })
                      .run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, `\`${selText}\``)
                      .setTextSelection({ from: from + 1, to: from + 1 + selText.length })
                      .run();
                  }
                  return true;
                }

                if (key === '~') {
                  event.preventDefault();
                  event.stopPropagation();

                  if (selText.startsWith('~~') && selText.endsWith('~~') && selText.length >= 4) {
                    const unwrapped = selText.slice(2, -2);
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, unwrapped)
                      .setTextSelection({ from, to: from + unwrapped.length })
                      .run();
                  } else if (beforeTwo === '~~' && afterTwo === '~~') {
                    const innerLength = to - from;
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: to, to: to + 2 })
                      .deleteRange({ from: from - 2, to: from })
                      .setTextSelection({ from: from - 2, to: from - 2 + innerLength })
                      .run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, `~~${selText}~~`)
                      .setTextSelection({ from: from + 2, to: from + 2 + selText.length })
                      .run();
                  }
                  return true;
                }

                if (key === '=') {
                  event.preventDefault();
                  event.stopPropagation();

                  if (selText.startsWith('==') && selText.endsWith('==') && selText.length >= 4) {
                    const unwrapped = selText.slice(2, -2);
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, unwrapped)
                      .setTextSelection({ from, to: from + unwrapped.length })
                      .run();
                  } else if (beforeTwo === '==' && afterTwo === '==') {
                    const innerLength = to - from;
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: to, to: to + 2 })
                      .deleteRange({ from: from - 2, to: from })
                      .setTextSelection({ from: from - 2, to: from - 2 + innerLength })
                      .run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, `==${selText}==`)
                      .setTextSelection({ from: from + 2, to: from + 2 + selText.length })
                      .run();
                  }
                  return true;
                }

                if (key === '[' || key === ']') {
                  event.preventDefault();
                  event.stopPropagation();

                  // Case 1: Selection itself is [[...]] -> unwrap
                  if (selText.startsWith('[[') && selText.endsWith(']]') && selText.length >= 4) {
                    const unwrapped = selText.slice(2, -2);
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, unwrapped)
                      .setTextSelection({ from, to: from + unwrapped.length })
                      .run();
                    return true;
                  }

                  // Case 2: Selected text is surrounded by [[ before and ]] after -> unwrap
                  if (beforeTwo === '[[' && afterTwo === ']]') {
                    const innerLength = to - from;
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: to, to: to + 2 })
                      .deleteRange({ from: from - 2, to: from })
                      .setTextSelection({ from: from - 2, to: from - 2 + innerLength })
                      .run();
                    return true;
                  }

                  // Case 3: Selection is single-bracketed [text] -> upgrade to [[text]]
                  if (selText.startsWith('[') && selText.endsWith(']') && selText.length >= 2) {
                    const inner = selText.slice(1, -1);
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, `[[${inner}]]`)
                      .setTextSelection({ from: from + 2, to: from + 2 + inner.length })
                      .run();
                    return true;
                  }

                  // Case 4: Selected text is surrounded by [ before and ] after -> upgrade to [[text]]
                  if (beforeOne === '[' && afterOne === ']') {
                    const innerLength = selText.length;
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from: from - 1, to: to + 1 }, `[[${selText}]]`)
                      .setTextSelection({ from: from + 1, to: from + 1 + innerLength })
                      .run();
                    return true;
                  }

                  // Case 5: Plain text selected -> wrap in [[...]]
                  editor
                    .chain()
                    .focus()
                    .insertContentAt({ from, to }, `[[${selText}]]`)
                    .setTextSelection({ from: from + 2, to: from + 2 + selText.length })
                    .run();
                  return true;
                }

                if (BRACKET_PAIRS[key]) {
                  event.preventDefault();
                  event.stopPropagation();

                  const closeChar = BRACKET_PAIRS[key];
                  if (beforeOne === key && afterOne === closeChar) {
                    const innerLength = to - from;
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: to, to: to + 1 })
                      .deleteRange({ from: from - 1, to: from })
                      .setTextSelection({ from: from - 1, to: from - 1 + innerLength })
                      .run();
                  } else {
                    editor
                      .chain()
                      .focus()
                      .insertContentAt({ from, to }, `${key}${selText}${closeChar}`)
                      .setTextSelection({ from: from + 1, to: from + 1 + selText.length })
                      .run();
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
                  editor.chain().focus().setTextSelection(from + 1).run();
                  return true;
                }

                // Auto-pair asterisks
                if (key === '*') {
                  event.preventDefault();
                  event.stopPropagation();

                  const beforeChar = from > 0 ? state.doc.textBetween(from - 1, from) : '';
                  if (beforeChar === '*') {
                    editor.chain().focus().insertContentAt({ from, to }, '***').setTextSelection(from + 1).run();
                  } else {
                    editor.chain().focus().insertContentAt({ from, to }, '**').setTextSelection(from + 1).run();
                  }
                  return true;
                }

                // Auto-pair inline code
                if (key === '`') {
                  event.preventDefault();
                  event.stopPropagation();

                  editor.chain().focus().insertContentAt({ from, to }, '``').setTextSelection(from + 1).run();
                  return true;
                }

                // Auto-pair highlight
                if (key === '=') {
                  const beforeChar = from > 0 ? state.doc.textBetween(from - 1, from) : '';
                  if (beforeChar === '=') {
                    event.preventDefault();
                    event.stopPropagation();
                    editor.chain().focus().insertContentAt({ from, to }, '===').setTextSelection(from + 1).run();
                    return true;
                  }
                }

                // Auto-pair brackets & quotes
                if (BRACKET_PAIRS[key]) {
                  event.preventDefault();
                  event.stopPropagation();

                  const closeChar = BRACKET_PAIRS[key];
                  editor.chain().focus().insertContentAt({ from, to }, `${key}${closeChar}`).setTextSelection(from + 1).run();
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
                      editor.chain().focus().deleteRange({ from: pos - 1, to: pos + 1 }).run();
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
                        editor.chain().focus().deleteRange({ from: pos - 2, to: pos + 2 }).run();
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
