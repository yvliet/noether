import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { useSettingsStore } from '@/store/settingsStore';

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
 * Handles Smart Home / Shift+Home navigation.
 * - If line has indentation:
 *   - 1st press (or from anywhere after indentation) -> jumps to after the indentation/tabs.
 *   - 2nd press (when already after the indentation) -> jumps to the true start of the line.
 *   - Subsequent presses toggle between the two positions.
 * - If line has no indentation -> jumps to start of line.
 */
export function handleSmartHome(editor: any, isShift: boolean): boolean {
  const { state, view } = editor;
  const { selection } = state;
  const $head = selection.$head || selection.$from;

  if (!$head.parent.isTextblock) return false;

  const parent = $head.parent;
  const parentOffset = $head.parentOffset;
  const blockStart = $head.start();
  const blockText = getBlockText(parent);

  // Find line boundaries within the textblock
  const lineStartOffset = parentOffset === 0 ? 0 : blockText.lastIndexOf('\n', parentOffset - 1) + 1;
  const nextNewline = blockText.indexOf('\n', parentOffset);
  const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
  const lineText = blockText.slice(lineStartOffset, lineEndOffset);

  // Measure leading whitespace on this line
  const indentMatch = lineText.match(/^[ \t]+/);
  const indentLen = indentMatch ? indentMatch[0].length : 0;

  // WHY THIS, NOT THAT:
  // If this line has NO indentation, delegate to native browser Home / Shift+Home.
  // The browser natively navigates visual line boxes (handling both wrapped text and hard breaks <br>)
  // without jumping to or selecting the preceding lines in the paragraph.
  if (indentLen === 0) {
    return false;
  }

  const trueLineStartOffset = lineStartOffset;
  const firstNonWsOffset = lineStartOffset + indentLen;

  const trueLineStartPos = getBlockPosFromOffset(parent, blockStart, trueLineStartOffset);
  const firstNonWsPos = getBlockPosFromOffset(parent, blockStart, firstNonWsOffset);

  const currentPos = $head.pos;

  let targetPos: number;

  // There is an indent:
  // If not currently at firstNonWsPos, go to firstNonWsPos (after tabs/indents)
  // If already at firstNonWsPos, go to trueLineStartPos (true start of line)
  if (currentPos !== firstNonWsPos) {
    targetPos = firstNonWsPos;
  } else {
    targetPos = trueLineStartPos;
  }

  // If already at targetPos and line has indent, toggle to the other position
  if (currentPos === targetPos) {
    if (targetPos === trueLineStartPos) {
      targetPos = firstNonWsPos;
    } else {
      targetPos = trueLineStartPos;
    }
  }

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
    };
  },
});
