import { Extension } from '@tiptap/core';
import { useSettingsStore } from '@/store/settingsStore';

export function getEffectiveTextRange(doc: any, selection: any) {
  const { from, to, empty } = selection;
  if (empty) return { from, to, empty: true, text: '' };

  const $from = doc.resolve(from);
  const $to = doc.resolve(to);

  let actualFrom = from;
  let actualTo = to;

  if (!$from.parent.inlineContent) {
    doc.nodesBetween(from, to, (node: any, pos: number) => {
      if (actualFrom === from && node.isTextblock) {
        actualFrom = pos + 1;
        return false;
      }
    });
  }

  if (!$to.parent.inlineContent) {
    doc.nodesBetween(from, to, (node: any, pos: number) => {
      if (node.isTextblock) {
        actualTo = pos + 1 + node.content.size;
      }
    });
  }

  const clampedFrom = Math.min(actualFrom, doc.content.size);
  const clampedTo = Math.min(Math.max(clampedFrom, actualTo), doc.content.size);

  return {
    from: clampedFrom,
    to: clampedTo,
    empty: clampedFrom >= clampedTo,
    text: doc.textBetween(clampedFrom, clampedTo),
  };
}

export function toggleFormat(editor: any, marker: string) {
  const { state } = editor;
  const markerLen = marker.length;
  const range = getEffectiveTextRange(state.doc, state.selection);

  if (!range.empty) {
    const { from, to, text: selText } = range;
    const $from = state.doc.resolve(from);
    const blockStart = $from.start();
    const blockEnd = $from.end();
    const blockText = state.doc.textBetween(blockStart, blockEnd);
    const selStartInBlock = from - blockStart;
    const selEndInBlock = to - blockStart;

    // Case 1: Selection is already wrapped in marker...marker (e.g. `**text**`) -> unwrap
    if (selText.startsWith(marker) && selText.endsWith(marker) && selText.length >= markerLen * 2) {
      const unwrapped = selText.slice(markerLen, -markerLen);
      return editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, unwrapped)
        .setTextSelection({ from, to: from + unwrapped.length })
        .run();
    }

    // Case 2: Selected text is surrounded by marker before and marker after -> unwrap
    const beforeMarker = selStartInBlock >= markerLen ? blockText.slice(selStartInBlock - markerLen, selStartInBlock) : '';
    const afterMarker = selEndInBlock <= blockText.length - markerLen ? blockText.slice(selEndInBlock, selEndInBlock + markerLen) : '';

    if (beforeMarker === marker && afterMarker === marker) {
      const innerLength = to - from;
      return editor
        .chain()
        .focus()
        .insertContentAt({ from: from - markerLen, to: to + markerLen }, selText)
        .setTextSelection({ from: from - markerLen, to: from - markerLen + innerLength })
        .run();
    }

    // Case 3: Wrap selection with marker...marker and shift selection onto inner text
    return editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, `${marker}${selText}${marker}`)
      .setTextSelection({ from: from + markerLen, to: from + markerLen + selText.length })
      .run();
  } else {
    // Collapsed selection
    const from = state.selection.from;
    const $from = state.doc.resolve(from);
    if ($from.parent.inlineContent) {
      const blockStart = $from.start();
      const blockEnd = $from.end();
      const blockText = state.doc.textBetween(blockStart, blockEnd);
      const selStartInBlock = from - blockStart;

      // 1. Check if caret is directly between an empty marker pair (e.g. **|**), toggle OFF
      const beforeMarker = selStartInBlock >= markerLen ? blockText.slice(selStartInBlock - markerLen, selStartInBlock) : '';
      const afterMarker = selStartInBlock <= blockText.length - markerLen ? blockText.slice(selStartInBlock, selStartInBlock + markerLen) : '';

      if (beforeMarker === marker && afterMarker === marker) {
        return editor
          .chain()
          .focus()
          .deleteRange({ from: from - markerLen, to: from + markerLen })
          .setTextSelection(from - markerLen)
          .run();
      }

      // 2. Check if caret is inside an existing formatted span (e.g. **wo|rd**), unwrap it
      const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${escapedMarker}([^${marker.charAt(0)}\\n]*)${escapedMarker}`, 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(blockText)) !== null) {
        const mStart = match.index;
        const mEnd = mStart + match[0].length;
        if (selStartInBlock >= mStart && selStartInBlock <= mEnd) {
          const inner = match[1];
          const absStart = blockStart + mStart;
          const absEnd = blockStart + mEnd;
          const newPos = Math.min(from - markerLen, absStart + inner.length);
          return editor
            .chain()
            .focus()
            .insertContentAt({ from: absStart, to: absEnd }, inner)
            .setTextSelection(Math.max(absStart, newPos))
            .run();
        }
      }

      // 3. Check if caret is inside a plain word (e.g. wo|rd), wrap the word
      const wordRegex = /[\p{L}\p{N}_]+/gu;
      let wordMatch: RegExpExecArray | null;
      while ((wordMatch = wordRegex.exec(blockText)) !== null) {
        const wStart = wordMatch.index;
        const wEnd = wStart + wordMatch[0].length;
        if (selStartInBlock >= wStart && selStartInBlock <= wEnd) {
          const word = wordMatch[0];
          const absStart = blockStart + wStart;
          const absEnd = blockStart + wEnd;
          const offsetInWord = selStartInBlock - wStart;
          return editor
            .chain()
            .focus()
            .insertContentAt({ from: absStart, to: absEnd }, `${marker}${word}${marker}`)
            .setTextSelection(absStart + markerLen + offsetInWord)
            .run();
        }
      }
    }

    // Default: Insert empty marker pair and place caret in the middle
    return editor
      .chain()
      .focus()
      .insertContentAt({ from, to: from }, `${marker}${marker}`)
      .setTextSelection(from + markerLen)
      .run();
  }
}

export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addKeyboardShortcuts() {
    return {
      // Bold: Ctrl+B / Cmd+B
      'Mod-b': ({ editor }) => toggleFormat(editor, '**'),
      'Mod-B': ({ editor }) => toggleFormat(editor, '**'),

      // Italic: Ctrl+I / Cmd+I
      'Mod-i': ({ editor }) => toggleFormat(editor, '*'),
      'Mod-I': ({ editor }) => toggleFormat(editor, '*'),

      // Inline Code: Ctrl+E / Cmd+E
      'Mod-e': ({ editor }) => toggleFormat(editor, '`'),
      'Mod-E': ({ editor }) => toggleFormat(editor, '`'),

      // Strikethrough: Ctrl+Shift+X / Cmd+Shift+X or Ctrl+Shift+S
      'Mod-Shift-x': ({ editor }) => toggleFormat(editor, '~~'),
      'Mod-Shift-X': ({ editor }) => toggleFormat(editor, '~~'),
      'Mod-Shift-s': ({ editor }) => toggleFormat(editor, '~~'),
      'Mod-Shift-S': ({ editor }) => toggleFormat(editor, '~~'),

      // Highlight: Ctrl+Shift+H / Cmd+Shift+H
      'Mod-Shift-h': ({ editor }) => toggleFormat(editor, '=='),
      'Mod-Shift-H': ({ editor }) => toggleFormat(editor, '=='),
      'Shift-Mod-h': ({ editor }) => toggleFormat(editor, '=='),
      'Shift-Mod-H': ({ editor }) => toggleFormat(editor, '=='),

      // Explicit Undo: Ctrl+Z / Cmd+Z (all case variations)
      'Mod-z': ({ editor }) => editor.commands.undo(),
      'Mod-Z': ({ editor }) => editor.commands.undo(),

      // Explicit Redo: Ctrl+Y / Cmd+Y, Ctrl+Shift+Z / Cmd+Shift+Z
      'Mod-y': ({ editor }) => editor.commands.redo(),
      'Mod-Y': ({ editor }) => editor.commands.redo(),
      'Mod-Shift-z': ({ editor }) => editor.commands.redo(),
      'Mod-Shift-Z': ({ editor }) => editor.commands.redo(),
      'Shift-Mod-z': ({ editor }) => editor.commands.redo(),
      'Shift-Mod-Z': ({ editor }) => editor.commands.redo(),

      // Math: Ctrl+Shift+4 / Cmd+Shift+4 or Ctrl+$
      'Mod-Shift-4': ({ editor }) => editor.commands.insertMathChip({ startEditing: true }),
      'Mod-Shift-$': ({ editor }) => editor.commands.insertMathChip({ startEditing: true }),
      'Mod-$': ({ editor }) => editor.commands.insertMathChip({ startEditing: true }),

      // Markdown Link: Ctrl+K / Cmd+K
      'Mod-k': ({ editor }) => insertOrWrapMarkdownLink(editor),
      'Mod-K': ({ editor }) => insertOrWrapMarkdownLink(editor),
    };
  },
});

export function insertOrWrapMarkdownLink(editor: any): boolean {
  if (!editor) return false;
  const { state } = editor;
  const { selection } = state;
  const range = getEffectiveTextRange(state.doc, selection);

  if (!range.empty && range.text) {
    const selText = range.text;
    const from = range.from;
    const to = range.to;

    // If selected text already is a URL
    if (selText.startsWith('http://') || selText.startsWith('https://') || selText.startsWith('mailto:')) {
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, `[](${selText})`)
        .setTextSelection(from + 1)
        .run();
    } else {
      // Normal text -> wrap in [selectedText]() and place cursor in ()
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, `[${selText}]()`)
        .setTextSelection(from + selText.length + 3)
        .run();
    }
    return true;
  }

  // Collapsed selection -> insert []() and put cursor inside []
  const { from } = selection;
  editor
    .chain()
    .focus()
    .insertContentAt({ from, to: from }, '[]()')
    .setTextSelection(from + 1)
    .run();
  return true;
}

export function isFormatActive(editor: any, marker: string): boolean {
  if (!editor) return false;
  const { state } = editor;
  const range = getEffectiveTextRange(state.doc, state.selection);
  const markerLen = marker.length;
  const markerChar = marker.charAt(0);

  const getMarkerCountBefore = (text: string, pos: number, char: string): number => {
    let count = 0;
    for (let i = pos - 1; i >= 0 && text[i] === char; i--) {
      count++;
    }
    return count;
  };

  const getMarkerCountAfter = (text: string, pos: number, char: string): number => {
    let count = 0;
    for (let i = pos; i < text.length && text[i] === char; i++) {
      count++;
    }
    return count;
  };

  if (!range.empty) {
    const { from, to, text: selText } = range;
    const $from = state.doc.resolve(from);
    const blockStart = $from.start();
    const blockEnd = $from.end();
    const blockText = state.doc.textBetween(blockStart, blockEnd);
    const selStartInBlock = from - blockStart;
    const selEndInBlock = to - blockStart;

    // Case 1: The selection itself starts and ends with the marker
    if (selText.startsWith(marker) && selText.endsWith(marker) && selText.length >= markerLen * 2) {
      if (marker === '*') {
        if (!selText.startsWith('**') || selText.startsWith('***')) {
          return true;
        }
      } else {
        return true;
      }
    }

    // Case 2: Check markers surrounding the selection
    const countBefore = getMarkerCountBefore(blockText, selStartInBlock, markerChar);
    const countAfter = getMarkerCountAfter(blockText, selEndInBlock, markerChar);

    if (countBefore > 0 && countAfter > 0) {
      if (marker === '**') {
        return countBefore >= 2 && countAfter >= 2;
      }
      if (marker === '*') {
        return (countBefore === 1 || countBefore >= 3) && (countAfter === 1 || countAfter >= 3);
      }
      if (marker === '~~') {
        return countBefore >= 2 && countAfter >= 2;
      }
      if (marker === '`') {
        return countBefore === 1 && countAfter === 1;
      }
      if (marker === '$') {
        return countBefore === 1 && countAfter === 1;
      }
      if (marker === '%%') {
        return countBefore >= 2 && countAfter >= 2;
      }
      if (marker === '==') {
        return countBefore >= 2 && countAfter >= 2;
      }
    }
  } else {
    // Caret is collapsed
    const from = state.selection.from;
    const $from = state.doc.resolve(from);
    if ($from.parent.inlineContent) {
      const blockStart = $from.start();
      const blockEnd = $from.end();
      const blockText = state.doc.textBetween(blockStart, blockEnd);
      const selStartInBlock = from - blockStart;

      const countBefore = getMarkerCountBefore(blockText, selStartInBlock, markerChar);
      const countAfter = getMarkerCountAfter(blockText, selStartInBlock, markerChar);

      if (countBefore > 0 && countAfter > 0) {
        if (marker === '**') return countBefore >= 2 && countAfter >= 2;
        if (marker === '*') return (countBefore === 1 || countBefore >= 3) && (countAfter === 1 || countAfter >= 3);
        if (marker === '~~') return countBefore >= 2 && countAfter >= 2;
        if (marker === '==') return countBefore >= 2 && countAfter >= 2;
        if (marker === '`') return countBefore === 1 && countAfter === 1;
        if (marker === '$') return countBefore === 1 && countAfter === 1;
        if (marker === '%%') return countBefore >= 2 && countAfter >= 2;
      }

      // Check if caret is inside a formatted regex match
      if (marker === '**') {
        const regex = /\*\*([^*\n]+)\*\*/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(blockText)) !== null) {
          if (selStartInBlock >= match.index && selStartInBlock <= match.index + match[0].length) {
            return true;
          }
        }
      } else if (marker === '*') {
        const regex = /(?:^|[^*])\*([^*\n]+)\*(?:[^*]|$)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(blockText)) !== null) {
          const matchStart = match.index + (match[0].startsWith('*') ? 0 : 1);
          const matchEnd = matchStart + (match[1].length + 2);
          if (selStartInBlock >= matchStart && selStartInBlock <= matchEnd) {
            return true;
          }
        }
      } else if (marker === '~~') {
        const regex = /~~([^~\n]+)~~/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(blockText)) !== null) {
          if (selStartInBlock >= match.index && selStartInBlock <= match.index + match[0].length) {
            return true;
          }
        }
      } else if (marker === '==') {
        const regex = /==([^=\n]+)==/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(blockText)) !== null) {
          if (selStartInBlock >= match.index && selStartInBlock <= match.index + match[0].length) {
            return true;
          }
        }
      } else if (marker === '`') {
        const regex = /(?:^|[^`])`([^`\n]+)`(?:[^`]|$)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(blockText)) !== null) {
          const matchStart = match.index + (match[0].startsWith('`') ? 0 : 1);
          const matchEnd = matchStart + (match[1].length + 2);
          if (selStartInBlock >= matchStart && selStartInBlock <= matchEnd) {
            return true;
          }
        }
      } else if (marker === '$') {
        const regex = /(?:^|[^$])\$([^$\n]+)\$(?:[^$]|$)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(blockText)) !== null) {
          const matchStart = match.index + (match[0].startsWith('$') ? 0 : 1);
          const matchEnd = matchStart + (match[1].length + 2);
          if (selStartInBlock >= matchStart && selStartInBlock <= matchEnd) {
            return true;
          }
        }
      } else if (marker === '%%') {
        const regex = /%%([^%\n]+)%%/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(blockText)) !== null) {
          if (selStartInBlock >= match.index && selStartInBlock <= match.index + match[0].length) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

export function clearFormatting(editor: any) {
  if (!editor) return;
  const { state } = editor;
  const range = getEffectiveTextRange(state.doc, state.selection);
  if (!range.empty) {
    const { from, to, text } = range;
    const cleaned = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/==(.*?)==/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\$(.*?)\$/g, '$1')
      .replace(/%%(.*?)%%/g, '$1');
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, cleaned)
      .setTextSelection({ from, to: from + cleaned.length })
      .unsetAllMarks()
      .clearNodes()
      .run();
  } else {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  }
}
