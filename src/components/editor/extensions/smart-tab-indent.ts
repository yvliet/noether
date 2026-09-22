import { Extension } from '@tiptap/core';
import { Selection, TextSelection } from '@tiptap/pm/state';
import { useSettingsStore } from '@/store/settingsStore';
import { isSuggestionActive } from './suggestion-state';
import { getVisualLineBounds } from '../editorCoords';

/**
 * Returns current tab indent size configured in settings (clamped between 2 and 8, default 5).
 */
export function getIndentSize(): number {
  const raw = useSettingsStore.getState().tabSize;
  const num = parseInt(raw, 10);
  return isNaN(num) || num < 2 || num > 8 ? 5 : num;
}

/**
 * Returns the text of a parent textblock preserving newlines (\n) across hardBreak nodes.
 */
export function getBlockText(parent: any): string {
  return parent.textBetween ? parent.textBetween(0, parent.content.size, '\n', '\n') : (parent.textContent || '');
}

/**
 * Calculates absolute document position from parent textblock start and string character offset,
 * accounting for inline child nodes (text with marks, hard breaks, etc.).
 */
export function getBlockPosFromOffset(parent: any, blockStart: number, targetOffset: number): number {
  if (targetOffset <= 0) return blockStart;

  let currentOffset = 0;
  let currentPos = blockStart;

  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    if (child.isText) {
      const textLen = child.text?.length || 0;
      if (currentOffset + textLen >= targetOffset) {
        return currentPos + (targetOffset - currentOffset);
      }
      currentOffset += textLen;
      currentPos += child.nodeSize;
    } else {
      if (currentOffset === targetOffset) {
        return currentPos;
      }
      currentOffset += child.nodeSize;
      currentPos += child.nodeSize;
    }
  }

  return currentPos;
}

/**
 * High-performance line indentation for single-line or multi-line selections.
 * Inserts indentSize spaces at line starts without deleting text, and ensures the resulting
 * selection covers only the actual text (excluding leading tabs/spaces).
 */
export function indentRange(editor: any, from: number, to: number, indentSize: number): boolean {
  const { state, view } = editor;
  const { selection } = state;
  const isBackward = selection.anchor > selection.head;
  const spaces = ' '.repeat(indentSize);
  let tr = state.tr;

  const insertPoints: number[] = [];
  let firstLineStart = -1;

  state.doc.nodesBetween(from, to, (node: any, pos: number) => {
    if (node.isTextblock) {
      const blockStart = pos + 1;
      const text = node.textContent;

      if (!text.includes('\n')) {
        // Fast-path: single-line block (paragraphs, headings, list items)
        insertPoints.push(blockStart);
        if (firstLineStart === -1) {
          firstLineStart = blockStart;
        }
      } else {
        // Multi-line block (e.g. codeBlock)
        let lineStart = blockStart;
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const lineLength = lines[i].length;
          const lineEnd = lineStart + lineLength;
          if (lineEnd >= from && lineStart <= to) {
            insertPoints.push(lineStart);
            if (firstLineStart === -1) {
              firstLineStart = lineStart;
            }
          }
          lineStart = lineEnd + 1; // +1 for '\n'
        }
      }
    }
  });

  if (insertPoints.length === 0) return false;

  // Sort descending and deduplicate to ensure safe reverse insertion
  insertPoints.sort((a, b) => b - a);
  let prev = -1;
  for (let i = 0; i < insertPoints.length; i++) {
    const pt = insertPoints[i];
    if (pt !== prev) {
      tr = tr.insertText(spaces, pt);
      prev = pt;
    }
  }

  // Calculate target selection boundaries that exclude leading tabs on the first line
  let mappedFrom = tr.mapping.map(from, 1);
  const mappedTo = tr.mapping.map(to, 1);

  if (firstLineStart !== -1) {
    const $firstLine = tr.doc.resolve(firstLineStart);
    const parent = $firstLine.parent;
    if (parent && parent.isTextblock) {
      const blockStart = $firstLine.start();
      const parentOffset = firstLineStart - blockStart;
      const blockText = getBlockText(parent);
      const nextNewline = blockText.indexOf('\n', parentOffset);
      const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
      const lineText = blockText.slice(parentOffset, lineEndOffset);
      const indentMatch = lineText.match(/^[ \t]+/);
      const indentLen = indentMatch ? indentMatch[0].length : 0;
      const firstNonWsPos = firstLineStart + indentLen;

      // Ensure selection starts after leading tabs/spaces so only actual text is selected
      if (mappedFrom < firstNonWsPos) {
        mappedFrom = firstNonWsPos;
      }
    }
  }

  const finalFrom = Math.min(mappedFrom, mappedTo);
  const finalTo = Math.max(mappedFrom, mappedTo);

  const newSelection = isBackward
    ? TextSelection.create(tr.doc, finalTo, finalFrom)
    : TextSelection.create(tr.doc, finalFrom, finalTo);

  view.dispatch(tr.setSelection(newSelection).scrollIntoView());
  return true;
}

/**
 * High-performance line outdenting for single-line or multi-line selections.
 * Removes up to indentSize leading spaces and ensures the selection covers only actual text.
 */
export function outdentRange(editor: any, from: number, to: number, indentSize: number): boolean {
  const { state, view } = editor;
  const { selection } = state;
  const isBackward = selection.anchor > selection.head;
  let tr = state.tr;
  let changed = false;

  const deletions: { from: number; to: number }[] = [];
  let firstLineStart = -1;

  state.doc.nodesBetween(from, to, (node: any, pos: number) => {
    if (node.isTextblock) {
      const blockStart = pos + 1;
      const text = node.textContent;

      if (!text.includes('\n')) {
        if (firstLineStart === -1) firstLineStart = blockStart;
        const match = text.match(/^[ ]+/);
        if (match) {
          const leadingSpaces = match[0].length;
          const remainder = leadingSpaces % indentSize;
          const countToRemove = remainder === 0 ? Math.min(indentSize, leadingSpaces) : remainder;
          const actualRemove = Math.min(countToRemove, leadingSpaces);
          if (actualRemove > 0) {
            deletions.push({
              from: blockStart,
              to: blockStart + actualRemove,
            });
          }
        }
      } else {
        let lineStart = blockStart;
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineLength = line.length;
          const lineEnd = lineStart + lineLength;
          if (lineEnd >= from && lineStart <= to) {
            if (firstLineStart === -1) firstLineStart = lineStart;
            const match = line.match(/^[ ]+/);
            if (match) {
              const leadingSpaces = match[0].length;
              const remainder = leadingSpaces % indentSize;
              const countToRemove = remainder === 0 ? Math.min(indentSize, leadingSpaces) : remainder;
              const actualRemove = Math.min(countToRemove, leadingSpaces);
              if (actualRemove > 0) {
                deletions.push({
                  from: lineStart,
                  to: lineStart + actualRemove,
                });
              }
            }
          }
          lineStart = lineEnd + 1;
        }
      }
    }
  });

  if (deletions.length === 0) return false;

  deletions.sort((a, b) => b.from - a.from);

  for (const del of deletions) {
    tr = tr.delete(del.from, del.to);
    changed = true;
  }

  if (changed) {
    let mappedFrom = tr.mapping.map(from, -1);
    const mappedTo = tr.mapping.map(to, -1);

    if (firstLineStart !== -1) {
      const mappedFirstLineStart = tr.mapping.map(firstLineStart, -1);
      const $firstLine = tr.doc.resolve(mappedFirstLineStart);
      const parent = $firstLine.parent;
      if (parent && parent.isTextblock) {
        const blockStart = $firstLine.start();
        const parentOffset = mappedFirstLineStart - blockStart;
        const blockText = getBlockText(parent);
        const nextNewline = blockText.indexOf('\n', parentOffset);
        const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
        const lineText = blockText.slice(parentOffset, lineEndOffset);
        const indentMatch = lineText.match(/^[ \t]+/);
        const indentLen = indentMatch ? indentMatch[0].length : 0;
        const firstNonWsPos = mappedFirstLineStart + indentLen;

        if (mappedFrom < firstNonWsPos) {
          mappedFrom = firstNonWsPos;
        }
      }
    }

    const finalFrom = Math.min(mappedFrom, mappedTo);
    const finalTo = Math.max(mappedFrom, mappedTo);

    const newSelection = isBackward
      ? TextSelection.create(tr.doc, finalTo, finalFrom)
      : TextSelection.create(tr.doc, finalFrom, finalTo);

    view.dispatch(tr.setSelection(newSelection).scrollIntoView());
    return true;
  }

  return false;
}

/**
 * Tracks the last navigated position and visual line affinity (-1 for upstream/line-end, 1 for downstream/line-start)
 * to ensure that repeatedly alternating Home and End toggles continuously back-and-forth across soft wraps
 * without stalling or escaping to adjacent visual lines.
 */
let lastNavPos: number | null = null;
let lastNavAffinity: -1 | 1 = 1;

/**
 * Handles Smart Home / Shift+Home navigation on visual line boundaries.
 * - If line has leading indentation:
 *   - 1st press (or from anywhere after indentation) -> jumps to after the indentation.
 *   - 2nd press (when already after the indentation) -> jumps to the true start of the visual line (col 0).
 *   - Subsequent presses toggle between the two positions.
 * - If line has no indentation -> jumps directly to the true start of the visual line.
 * - Preserves selection anchor and extends selection when isShift is true.
 */
export function handleSmartHome(editor: any, isShift: boolean): boolean {
  const { state, view } = editor;
  const { selection } = state;
  const $head = selection.$head || selection.$from;

  if (!$head.parent.isTextblock) return false;

  const currentPos = $head.pos;
  let bias: -1 | 1 = -1;
  if (lastNavPos === currentPos && lastNavAffinity === 1) {
    bias = 1;
  }

  const bounds = getVisualLineBounds(view, currentPos, undefined, bias);
  const lineStart = bounds ? bounds.lineStart : $head.start();
  const lineEnd = bounds ? bounds.lineEnd : $head.end();

  // Extract the text of this visual line to detect leading whitespace
  const lineText = state.doc.textBetween(lineStart, lineEnd);
  const indentMatch = lineText.match(/^[ \t]+/);
  const indentLen = indentMatch ? indentMatch[0].length : 0;
  const firstNonWsPos = lineStart + indentLen;

  let targetPos: number;
  if (indentLen > 0) {
    if (currentPos !== firstNonWsPos) {
      targetPos = firstNonWsPos;
    } else {
      targetPos = lineStart;
    }
  } else {
    targetPos = lineStart;
  }

  // Toggle if already at targetPos
  if (currentPos === targetPos && indentLen > 0) {
    targetPos = targetPos === lineStart ? firstNonWsPos : lineStart;
  }

  lastNavPos = targetPos;
  lastNavAffinity = 1;

  let newSelection: TextSelection;
  if (isShift) {
    newSelection = TextSelection.create(state.doc, selection.anchor, targetPos);
  } else {
    newSelection = TextSelection.create(state.doc, targetPos);
  }

  const tr = state.tr.setSelection(newSelection).scrollIntoView();
  view.dispatch(tr);
  return true;
}

/**
 * Handles End / Shift+End navigation to visual line end.
 * Preserves selection anchor and extends selection when isShift is true.
 */
export function handleSmartEnd(editor: any, isShift: boolean): boolean {
  const { state, view } = editor;
  const { selection } = state;
  const $head = selection.$head || selection.$from;

  if (!$head.parent.isTextblock) return false;

  const currentPos = $head.pos;
  let bias: -1 | 1 = 1;
  if (lastNavPos === currentPos && lastNavAffinity === -1) {
    bias = -1;
  }

  const bounds = getVisualLineBounds(view, currentPos, undefined, bias);
  const lineEnd = bounds ? bounds.lineEnd : $head.end();

  lastNavPos = lineEnd;
  lastNavAffinity = -1;

  let newSelection: TextSelection;
  if (isShift) {
    newSelection = TextSelection.create(state.doc, selection.anchor, lineEnd);
  } else {
    newSelection = TextSelection.create(state.doc, lineEnd);
  }

  const tr = state.tr.setSelection(newSelection).scrollIntoView();
  view.dispatch(tr);
  return true;
}

/**
 * Handles Mod-Home (Ctrl+Home on Windows/Linux, Cmd+Home on macOS) navigation to document start.
 */
export function handleDocStart(editor: any, isShift: boolean): boolean {
  const { state, view } = editor;
  const startSel = Selection.atStart(state.doc);
  const targetPos = startSel.from;
  lastNavPos = targetPos;
  lastNavAffinity = 1;

  let newSelection: Selection;
  if (isShift) {
    newSelection = TextSelection.create(state.doc, state.selection.anchor, targetPos);
  } else {
    newSelection = startSel;
  }
  const tr = state.tr.setSelection(newSelection).scrollIntoView();
  view.dispatch(tr);
  return true;
}

/**
 * Handles Mod-End (Ctrl+End on Windows/Linux, Cmd+End on macOS) navigation to document end.
 */
export function handleDocEnd(editor: any, isShift: boolean): boolean {
  const { state, view } = editor;
  const endSel = Selection.atEnd(state.doc);
  const targetPos = endSel.from;
  lastNavPos = targetPos;
  lastNavAffinity = -1;

  let newSelection: Selection;
  if (isShift) {
    newSelection = TextSelection.create(state.doc, state.selection.anchor, targetPos);
  } else {
    newSelection = endSel;
  }
  const tr = state.tr.setSelection(newSelection).scrollIntoView();
  view.dispatch(tr);
  return true;
}

/**
 * Handles Backspace with smart multi-space tab deletion.
 * Deletes whole 2-to-8 space tab stops at once instead of 1 space by 1.
 */
function handleSmartBackspace(editor: any): boolean {
  const { state, view } = editor;
  const { selection } = state;
  if (!selection.empty) return false;

  const { $from } = selection;
  if (!$from.parent.isTextblock) return false;

  const parent = $from.parent;
  const parentOffset = $from.parentOffset;
  if (parentOffset === 0) return false;

  const blockText = getBlockText(parent);
  const lineStartOffset = blockText.lastIndexOf('\n', parentOffset - 1) + 1;
  const textBeforeOnLine = blockText.slice(lineStartOffset, parentOffset);

  const trailingSpacesMatch = textBeforeOnLine.match(/ +$/);
  if (!trailingSpacesMatch) return false;

  const numTrailingSpaces = trailingSpacesMatch[0].length;
  if (numTrailingSpaces === 0) return false;

  const indentSize = getIndentSize();
  const col = textBeforeOnLine.length;
  const isLeading = (numTrailingSpaces === col);

  let deleteCount = 1;

  if (isLeading) {
    // Inside leading indentation: delete to previous tab stop
    const remainder = col % indentSize;
    const countToPrev = remainder === 0 ? indentSize : remainder;
    deleteCount = Math.min(countToPrev, numTrailingSpaces);
  } else if (numTrailingSpaces >= indentSize) {
    // indentSize or more spaces inserted (e.g. Tab pressed after text)
    const remainder = col % indentSize;
    if (remainder === 0) {
      deleteCount = indentSize;
    } else if (numTrailingSpaces % indentSize === 0) {
      deleteCount = indentSize;
    } else {
      deleteCount = remainder === 0 ? indentSize : remainder;
    }
    deleteCount = Math.min(deleteCount, numTrailingSpaces);
  } else if (col % indentSize === 0 && numTrailingSpaces > 1) {
    deleteCount = numTrailingSpaces;
  } else {
    deleteCount = 1;
  }

  if (deleteCount > 1) {
    const pos = $from.pos;
    const fromPos = pos - deleteCount;
    const tr = state.tr.delete(fromPos, pos);
    view.dispatch(tr.scrollIntoView());
    return true;
  }

  return false;
}

/**
 * Handles Delete (forward delete) with smart tab stop deletion.
 */
function handleSmartDelete(editor: any): boolean {
  const { state, view } = editor;
  const { selection } = state;
  if (!selection.empty) return false;

  const { $from } = selection;
  if (!$from.parent.isTextblock) return false;

  const parent = $from.parent;
  const parentOffset = $from.parentOffset;
  const blockText = getBlockText(parent);

  const nextNewline = blockText.indexOf('\n', parentOffset);
  const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
  const textAfterOnLine = blockText.slice(parentOffset, lineEndOffset);

  const leadingSpacesMatch = textAfterOnLine.match(/^ +/);
  if (!leadingSpacesMatch) return false;

  const numSpaces = leadingSpacesMatch[0].length;
  if (numSpaces === 0) return false;

  const indentSize = getIndentSize();

  const lineStartOffset = parentOffset === 0 ? 0 : blockText.lastIndexOf('\n', parentOffset - 1) + 1;
  const col = parentOffset - lineStartOffset;

  let deleteCount = 1;
  if (numSpaces >= indentSize) {
    const spacesToNextStop = indentSize - (col % indentSize);
    deleteCount = Math.min(spacesToNextStop || indentSize, numSpaces);
  } else if (col === 0 && numSpaces > 1) {
    const remainder = numSpaces % indentSize;
    deleteCount = remainder === 0 ? indentSize : remainder;
    deleteCount = Math.min(deleteCount, numSpaces);
  }

  if (deleteCount > 1) {
    const pos = $from.pos;
    const tr = state.tr.delete(pos, pos + deleteCount);
    view.dispatch(tr.scrollIntoView());
    return true;
  }

  return false;
}

export const SmartTabIndent = Extension.create({
  name: 'smartTabIndent',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { state } = this.editor;
        if (isSuggestionActive(state)) return false;
        const { selection } = state;
        const { $from, from, to, empty } = selection;

        // 1. If in a bullet list or ordered list, indent/sink the list item
        if (this.editor.can().sinkListItem('listItem')) {
          return this.editor.commands.sinkListItem('listItem');
        }
        // 2. If in a task list, indent/sink the task item
        if (this.editor.can().sinkListItem('taskItem')) {
          return this.editor.commands.sinkListItem('taskItem');
        }

        const indentSize = getIndentSize();

        // 3. Selection is NOT empty: Indent all lines touched by selection without replacing text!
        if (!empty) {
          return indentRange(this.editor, from, to, indentSize);
        }

        // 4. In textblock with collapsed cursor: calculate spaces to next tab stop
        if ($from.parent.isTextblock) {
          const parentOffset = $from.parentOffset;
          const blockText = $from.parent.textBetween ? $from.parent.textBetween(0, $from.parent.content.size, '\n', '\n') : $from.parent.textContent;
          const lineStartOffset = parentOffset === 0 ? 0 : blockText.lastIndexOf('\n', parentOffset - 1) + 1;
          const nextNewline = blockText.indexOf('\n', parentOffset);
          const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
          const lineText = blockText.slice(lineStartOffset, lineEndOffset);

          // Do NOT insert tab spaces in the middle of a list/number line; let NumberedListBehavior indent the whole line to the left
          if (/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])( *)/.test(lineText)) {
            return false;
          }

          const col = parentOffset - lineStartOffset;
          const spacesToAdd = indentSize - (col % indentSize);
          const spaces = ' '.repeat(spacesToAdd === 0 ? indentSize : spacesToAdd);
          return this.editor.commands.insertContent(spaces);
        }

        return this.editor.commands.insertContent(' '.repeat(indentSize));
      },

      'Shift-Tab': () => {
        if (isSuggestionActive(this.editor.state)) return false;
        if (this.editor.can().liftListItem('listItem')) {
          return this.editor.commands.liftListItem('listItem');
        }
        if (this.editor.can().liftListItem('taskItem')) {
          return this.editor.commands.liftListItem('taskItem');
        }

        const { selection } = this.editor.state;
        const { $from, from, to, empty } = selection;

        if (empty && $from.parent.isTextblock) {
          const parentOffset = $from.parentOffset;
          const blockText = getBlockText($from.parent);
          const lineStartOffset = parentOffset === 0 ? 0 : blockText.lastIndexOf('\n', parentOffset - 1) + 1;
          const nextNewline = blockText.indexOf('\n', parentOffset);
          const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
          const lineText = blockText.slice(lineStartOffset, lineEndOffset);

          if (/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])( *)/.test(lineText)) {
            return false;
          }
        }

        const indentSize = getIndentSize();
        return outdentRange(this.editor, from, to, indentSize);
      },

      Backspace: () => handleSmartBackspace(this.editor),

      Delete: () => handleSmartDelete(this.editor),

      Home: () => handleSmartHome(this.editor, false),

      'Shift-Home': () => handleSmartHome(this.editor, true),

      End: () => handleSmartEnd(this.editor, false),

      'Shift-End': () => handleSmartEnd(this.editor, true),

      'Mod-Home': () => handleDocStart(this.editor, false),

      'Mod-Shift-Home': () => handleDocStart(this.editor, true),

      'Mod-End': () => handleDocEnd(this.editor, false),

      'Mod-Shift-End': () => handleDocEnd(this.editor, true),

      // Code Block: Mod-Enter to create a new paragraph below code block
      'Mod-Enter': () => {
        const { state } = this.editor;
        const { $from } = state.selection;
        const parentType = $from.parent.type.name;
        if (parentType === 'codeBlock' || parentType === 'code_block') {
          const afterPos = $from.after();
          return this.editor
            .chain()
            .focus()
            .insertContentAt(afterPos, { type: 'paragraph' })
            .setTextSelection(afterPos + 1)
            .run();
        }
        return false;
      },

      // Code Block: ArrowDown at the end of a document-terminal code block appends a paragraph
      ArrowDown: () => {
        const { state, view } = this.editor;
        const { selection, doc } = state;
        const { $from } = selection;
        const parentType = $from.parent.type.name;
        if (parentType === 'codeBlock' || parentType === 'code_block') {
          const isAtEnd = $from.parentOffset === $from.parent.content.size;
          const afterPos = $from.after();
          if (isAtEnd && afterPos >= doc.content.size) {
            const tr = state.tr.insert(afterPos, state.schema.nodes.paragraph.create());
            tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
            view.dispatch(tr);
            return true;
          }
        }
        return false;
      },
    };
  },
});
