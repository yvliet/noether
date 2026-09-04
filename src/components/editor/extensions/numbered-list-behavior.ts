import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { FoldHeadingPluginKey } from './fold-heading';
import { getIndentSize } from './smart-tab-indent';
import { isSuggestionActive } from './suggestion-state';

/**
 * Gets the next sequential marker for numbers, single letters, or double letters.
 * e.g., "1." -> "2.", "a." -> "b.", "z." -> "aa.", "aa." -> "ab.", "-" -> "-"
 */
function getNextMarker(marker: string): string {
  // 1. Numbers: 1. -> 2.
  const numMatch = marker.match(/^(\d+)\.$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return `${num + 1}.`;
  }

  // 2. Letters (1 or 2 characters): a. -> b., z. -> aa., aa. -> ab.
  const letterMatch = marker.match(/^([a-zA-Z]{1,2})\.$/);
  if (letterMatch) {
    const letters = letterMatch[1];
    const isUpper = letters === letters.toUpperCase();
    const str = letters.toLowerCase();

    if (str.length === 1) {
      if (str === 'z') {
        return isUpper ? 'AA.' : 'aa.';
      }
      const nextChar = String.fromCharCode(str.charCodeAt(0) + 1);
      return isUpper ? `${nextChar.toUpperCase()}.` : `${nextChar}.`;
    } else if (str.length === 2) {
      const c1 = str.charCodeAt(0);
      const c2 = str.charCodeAt(1);
      const zCode = 'z'.charCodeAt(0);
      const aCode = 'a'.charCodeAt(0);

      if (c2 < zCode) {
        const nextStr = String.fromCharCode(c1, c2 + 1);
        return isUpper ? `${nextStr.toUpperCase()}.` : `${nextStr}.`;
      } else if (c1 < zCode) {
        const nextStr = String.fromCharCode(c1 + 1, aCode);
        return isUpper ? `${nextStr.toUpperCase()}.` : `${nextStr}.`;
      } else {
        return isUpper ? 'A.' : 'a.';
      }
    }
  }

  return marker;
}

/**
 * Returns the starting marker when nesting an item with Tab.
 */
function getNestedStartingMarker(marker: string): string {
  if (/^\d+\.$/.test(marker)) {
    return '1.';
  }
  if (/^[a-z]{1,2}\.$/.test(marker)) {
    return 'a.';
  }
  if (/^[A-Z]{1,2}\.$/.test(marker)) {
    return 'A.';
  }
  return marker;
}

/**
 * Renumbers immediately following sequential numbered or lettered paragraphs after an insertion.
 */
function renumberSubsequentItems(
  tr: any,
  startPos: number,
  leadingIndent: string,
  currentMarker: string
) {
  let checkPos = startPos;
  let nextExpected = currentMarker;
  while (checkPos < tr.doc.content.size) {
    const $check = tr.doc.resolve(checkPos);
    const node = $check.nodeAfter;
    if (!node || !node.isTextblock || node.type.name !== 'paragraph') break;

    const nodeText = node.textContent;
    const matchSub = nodeText.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.)(.*)$/);
    if (!matchSub) break;

    const subIndent = matchSub[1];
    const subMarker = matchSub[2];
    const subRest = matchSub[3];

    // Only renumber if it has identical leading indentation and matches the expected sequence
    if (subIndent === leadingIndent && subMarker === nextExpected) {
      const newSubMarker = getNextMarker(subMarker);
      const replacementText = `${subIndent}${newSubMarker}${subRest}`;
      const nodeStart = checkPos + 1;
      const nodeEnd = checkPos + node.nodeSize - 1;
      tr.replaceWith(nodeStart, nodeEnd, tr.doc.type.schema.text(replacementText));
      nextExpected = newSubMarker;
      checkPos += replacementText.length + 2;
    } else {
      break;
    }
  }
}

export const NumberedListBehavior = Extension.create({
  name: 'numberedListBehavior',

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { state, view } = this.editor;
        if (isSuggestionActive(state)) return false;
        const { selection } = state;
        const { $from, $to } = selection;

        if (!$from.sameParent($to)) return false;
        if (!selection.empty) return false;

        const parent = $from.parent;
        if (parent.type.name !== 'paragraph') return false;

        const blockStart = $from.start();
        const blockText = parent.textBetween ? parent.textBetween(0, parent.content.size, '\n', '\n') : parent.textContent;
        const parentOffset = $from.parentOffset;

        const lineStartOffset = parentOffset === 0 ? 0 : blockText.lastIndexOf('\n', parentOffset - 1) + 1;
        const nextNewline = blockText.indexOf('\n', parentOffset);
        const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
        const lineText = blockText.slice(lineStartOffset, lineEndOffset);
        const col = parentOffset - lineStartOffset;

        // Check for List item (Number, Letter a./aa., or Dash/Bullet): ^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])( *)(.*)$
        const listMatch = lineText.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])( *)(.*)$/);
        if (listMatch) {
          const leadingIndent = listMatch[1];
          const marker = listMatch[2];
          const spaceAfterMarker = listMatch[3];
          const content = listMatch[4];
          const oldPrefixLen = leadingIndent.length + marker.length + spaceAfterMarker.length;

          const indentSize = getIndentSize();
          const indentStep = ' '.repeat(indentSize);
          const newIndent = leadingIndent + indentStep;
          const startMarker = getNestedStartingMarker(marker);
          const newPrefix = `${newIndent}${startMarker} `;
          const newFullLine = `${newPrefix}${content}`;

          const linePosStart = blockStart + lineStartOffset;
          const linePosEnd = blockStart + lineEndOffset;

          let newCol = newPrefix.length;
          if (col >= oldPrefixLen) {
            newCol = newPrefix.length + (col - oldPrefixLen);
          } else {
            newCol = newPrefix.length;
          }

          let tr = state.tr;
          if (linePosEnd > linePosStart) {
            tr = tr.replaceWith(linePosStart, linePosEnd, state.schema.text(newFullLine));
          } else {
            tr = tr.insert(linePosStart, state.schema.text(newFullLine));
          }

          const targetPos = linePosStart + newCol;
          view.dispatch(tr.setSelection(TextSelection.create(tr.doc, targetPos)).scrollIntoView());
          return true;
        }

        return false;
      },

      'Shift-Tab': () => {
        const { state, view } = this.editor;
        if (isSuggestionActive(state)) return false;
        const { selection } = state;
        const { $from, $to } = selection;

        if (!$from.sameParent($to)) return false;
        if (!selection.empty) return false;

        const parent = $from.parent;
        if (parent.type.name !== 'paragraph') return false;

        const blockStart = $from.start();
        const blockText = parent.textContent;
        const parentOffset = $from.parentOffset;

        const lineStartOffset = parentOffset === 0 ? 0 : blockText.lastIndexOf('\n', parentOffset - 1) + 1;
        const nextNewline = blockText.indexOf('\n', parentOffset);
        const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
        const lineText = blockText.slice(lineStartOffset, lineEndOffset);
        const col = parentOffset - lineStartOffset;

        // Check for List item with leading indent to outdent
        const listMatch = lineText.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])( *)(.*)$/);
        if (listMatch && listMatch[1].length > 0) {
          const leadingIndent = listMatch[1];
          const marker = listMatch[2];
          const spaceAfterMarker = listMatch[3];
          const content = listMatch[4];
          const oldPrefixLen = leadingIndent.length + marker.length + spaceAfterMarker.length;

          const indentSize = getIndentSize();
          const removeCount = Math.min(indentSize, leadingIndent.length);
          const newIndent = leadingIndent.slice(0, -removeCount);
          const startMarker = getNestedStartingMarker(marker);
          const newPrefix = `${newIndent}${startMarker} `;
          const newFullLine = `${newPrefix}${content}`;

          const linePosStart = blockStart + lineStartOffset;
          const linePosEnd = blockStart + lineEndOffset;

          let newCol = newPrefix.length;
          if (col >= oldPrefixLen) {
            newCol = newPrefix.length + (col - oldPrefixLen);
          } else {
            newCol = Math.min(col, newPrefix.length);
          }

          let tr = state.tr;
          if (linePosEnd > linePosStart) {
            tr = tr.replaceWith(linePosStart, linePosEnd, state.schema.text(newFullLine));
          } else {
            tr = tr.insert(linePosStart, state.schema.text(newFullLine));
          }

          const targetPos = linePosStart + newCol;
          view.dispatch(tr.setSelection(TextSelection.create(tr.doc, targetPos)).scrollIntoView());
          return true;
        }

        return false;
      },

      Enter: () => {
        const { state, view } = this.editor;
        if (isSuggestionActive(state)) return false;
        const { selection } = state;
        const { $from, $to } = selection;

        if (!$from.sameParent($to)) return false;
        if (!selection.empty) return false;

        const parent = $from.parent;
        if (parent.type.name !== 'paragraph') return false;

        const blockStart = $from.start();
        const blockEnd = $from.end();
        const blockText = parent.textBetween ? parent.textBetween(0, parent.content.size, '\n', '\n') : parent.textContent;
        const parentOffset = $from.parentOffset;

        // Line boundaries inside the paragraph
        const lineStartOffset = parentOffset === 0 ? 0 : blockText.lastIndexOf('\n', parentOffset - 1) + 1;
        const nextNewline = blockText.indexOf('\n', parentOffset);
        const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
        const lineText = blockText.slice(lineStartOffset, lineEndOffset);
        const col = parentOffset - lineStartOffset;

        // 1. Check for Numbered List, Letter List (a./aa.), or Bullet/Dash item: ^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])( *)(.*)$
        const listMatch = lineText.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])( *)(.*)$/);
        if (listMatch && listMatch[3].length >= 1) {
          const leadingIndent = listMatch[1];
          const marker = listMatch[2];
          const spaceAfterMarker = listMatch[3];
          const contentAfterPrefix = listMatch[4];
          const prefixLen = leadingIndent.length + marker.length + spaceAfterMarker.length;
          const isSequential = /^\d+\.$|^[a-zA-Z]{1,2}\.$/.test(marker);

          // Case A: Empty list line (nothing typed after the space, e.g. "2. ", "b. ", or "- ")
          if (contentAfterPrefix.trim() === '') {
            const linePosStart = blockStart + lineStartOffset;
            const linePosEnd = blockStart + lineEndOffset;

            // If nested (has leading indent), outdent by one level on first Enter
            if (leadingIndent.length > 0) {
              const indentSize = getIndentSize();
              const removeCount = Math.min(indentSize, leadingIndent.length);
              const newIndent = leadingIndent.slice(0, -removeCount);
              const startMarker = getNestedStartingMarker(marker);
              const newPrefix = `${newIndent}${startMarker} `;
              const tr = state.tr.replaceWith(linePosStart, linePosEnd, state.schema.text(newPrefix));
              const targetPos = linePosStart + newPrefix.length;
              view.dispatch(tr.setSelection(TextSelection.create(tr.doc, targetPos)).scrollIntoView());
              return true;
            }

            // At root level: "i click enter, it removes it" -> clear the prefix/line
            const tr = state.tr.delete(linePosStart, linePosEnd);
            view.dispatch(tr.scrollIntoView());
            return true;
          }

          // Case B: List line has content after space (e.g. "1. a", "a. foo", or "- sadsa")
          if (col >= prefixLen) {
            const textAfterCursor = lineText.slice(col);
            const nextMarker = getNextMarker(marker);
            const nextPrefix = `${leadingIndent}${nextMarker} `;

            if (col === lineEndOffset) {
              // Cursor at line end
              const insertPos = $from.after();
              const nextContent = `${nextPrefix}${textAfterCursor}`;
              const newParagraph = state.schema.nodes.paragraph.create(
                null,
                state.schema.text(nextContent)
              );
              let tr = state.tr.insert(insertPos, newParagraph);
              if (isSequential) {
                renumberSubsequentItems(tr, insertPos + newParagraph.nodeSize, leadingIndent, nextMarker);
              }

              const cursorTarget = insertPos + 1 + nextPrefix.length;
              tr = tr.setSelection(TextSelection.create(tr.doc, cursorTarget)).scrollIntoView();
              view.dispatch(tr);
              return true;
            } else {
              // Cursor in the middle of content -> split line
              const linePosEnd = blockStart + lineEndOffset;
              let tr = state.tr.delete($from.pos, linePosEnd);
              const afterPos = tr.mapping.map($from.after());
              const nextContent = `${nextPrefix}${textAfterCursor}`;
              const newParagraph = state.schema.nodes.paragraph.create(
                null,
                state.schema.text(nextContent)
              );
              tr = tr.insert(afterPos, newParagraph);
              if (isSequential) {
                renumberSubsequentItems(tr, afterPos + newParagraph.nodeSize, leadingIndent, nextMarker);
              }

              const cursorTarget = afterPos + 1 + nextPrefix.length;
              tr = tr.setSelection(TextSelection.create(tr.doc, cursorTarget)).scrollIntoView();
              view.dispatch(tr);
              return true;
            }
          }

          // Cursor at the very start of the line before prefix -> insert empty paragraph before
          if (col === 0) {
            const insertPos = $from.before();
            const emptyParagraph = state.schema.nodes.paragraph.createAndFill();
            if (emptyParagraph) {
              const tr = state.tr.insert(insertPos, emptyParagraph);
              view.dispatch(tr.scrollIntoView());
              return true;
            }
          }
        }

        // 2. Check for indented continuation line: ^([ \t]+)(.*)$
        const indentMatch = lineText.match(/^([ \t]+)(.*)$/);
        if (indentMatch) {
          const indentStr = indentMatch[1];
          const indentContent = indentMatch[2];

          // If line contains only whitespace spaces -> clear it
          if (indentContent.trim() === '') {
            const linePosStart = blockStart + lineStartOffset;
            const linePosEnd = blockStart + lineEndOffset;
            const tr = state.tr.delete(linePosStart, linePosEnd);
            view.dispatch(tr.scrollIntoView());
            return true;
          }

          // If cursor is at or after indent
          if (col >= indentStr.length) {
            const textAfterCursor = lineText.slice(col);
            if (col === lineEndOffset) {
              const insertPos = $from.after();
              const nextContent = `${indentStr}${textAfterCursor}`;
              const newParagraph = state.schema.nodes.paragraph.create(
                null,
                nextContent ? state.schema.text(nextContent) : null
              );
              let tr = state.tr.insert(insertPos, newParagraph);
              const cursorTarget = insertPos + 1 + indentStr.length;
              tr = tr.setSelection(TextSelection.create(tr.doc, cursorTarget)).scrollIntoView();
              view.dispatch(tr);
              return true;
            } else {
              const linePosEnd = blockStart + lineEndOffset;
              let tr = state.tr.delete($from.pos, linePosEnd);
              const afterPos = tr.mapping.map($from.after());
              const nextContent = `${indentStr}${textAfterCursor}`;
              const newParagraph = state.schema.nodes.paragraph.create(
                null,
                nextContent ? state.schema.text(nextContent) : null
              );
              tr = tr.insert(afterPos, newParagraph);
              const cursorTarget = afterPos + 1 + indentStr.length;
              tr = tr.setSelection(TextSelection.create(tr.doc, cursorTarget)).scrollIntoView();
              view.dispatch(tr);
              return true;
            }
          }
        }

        return false;
      },

      'Shift-Enter': () => {
        const { state, dispatch } = this.editor.view;
        const { selection } = state;
        const { $from, $to } = selection;
        if (!$from.sameParent($to)) return false;

        const parent = $from.parent;

        // 1. Heading Shift-Enter behavior: create normal paragraph below
        if (parent.type.name === 'heading') {
          const headingPos = $from.before();
          const pluginState = FoldHeadingPluginKey.getState(state);
          const foldedHeadings: Set<number> = pluginState?.foldedHeadings || new Set();

          const isHeadingFolded = Array.from(foldedHeadings).some(
            (pos) => pos === headingPos || (pos >= headingPos && pos < headingPos + parent.nodeSize)
          );

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

          dispatch(tr);
          return true;
        }

        if (parent.type.name !== 'paragraph') {
          return false;
        }

        const blockText = parent.textBetween ? parent.textBetween(0, parent.content.size, '\n', '\n') : parent.textContent;
        const parentOffset = $from.parentOffset;

        const lineStartOffset = parentOffset === 0 ? 0 : blockText.lastIndexOf('\n', parentOffset - 1) + 1;
        const nextNewline = blockText.indexOf('\n', parentOffset);
        const lineEndOffset = nextNewline === -1 ? blockText.length : nextNewline;
        const lineText = blockText.slice(lineStartOffset, lineEndOffset);

        const hardBreakType = state.schema.nodes.hardBreak;

        // 2. Shift-Enter on a List item (Number, Letter a./aa., or Bullet/Dash):
        // WHY THIS, NOT THAT:
        // Use an inline hardBreak node (<br>) without injecting manual spaces.
        // Because the paragraph has visual hanging indent (.flint-list-hanging), continuation lines
        // after <br> are already visually aligned flush beneath the list item text (Google Docs style)
        // while preserving clean markdown and effortless single-keystroke Backspace deletion.
        const listMatch = lineText.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])( *)(.*)$/);
        if (listMatch && hardBreakType) {
          let tr = state.tr.replaceSelectionWith(hardBreakType.create());
          dispatch(tr.scrollIntoView());
          return true;
        }

        // 3. Shift-Enter on an already indented continuation line:
        const indentMatch = lineText.match(/^([ \t]+)(.*)$/);
        if (indentMatch && hardBreakType) {
          const indentSpaces = indentMatch[1];
          let tr = state.tr.replaceSelectionWith(hardBreakType.create());
          if (indentSpaces.length > 0) {
            tr = tr.insertText(indentSpaces);
          }
          dispatch(tr.scrollIntoView());
          return true;
        }

        // 4. Default plain paragraph / task list item / blockquote Shift-Enter -> standard hard break:
        // Produces the exact single-block line-height spacing without paragraph margins.
        return this.editor.commands.setHardBreak();
      },
    };
  },
});
