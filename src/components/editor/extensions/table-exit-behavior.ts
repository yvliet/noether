/**
 * @module TableExitBehavior
 * @description
 * TipTap extension that ensures users can easily exit table blocks, navigate
 * onto a newline after (or before) a table, delete selected columns/rows on Backspace/Delete
 * without leaving leftover CellSelection highlights, and seamlessly undo/redo table column
 * deletions, insertions, and resize adjustments.
 *
 * Supported interactions:
 * 1. Pressing ArrowDown from the bottom row of a table exits into a newline below the table.
 * 2. Pressing ArrowUp from the top row of a table at document start exits into a newline above.
 * 3. Pressing Mod+Enter (Ctrl+Enter / Cmd+Enter), Shift+Enter, or Alt+Enter anywhere in a table inserts a new line below.
 * 4. Pressing Mod+Shift+Enter or Alt+Shift+Enter inserts a new line above the table.
 * 5. Pressing Enter in an empty trailing cell exits the table into a new line below.
 * 6. Pressing Backspace / Delete with a CellSelection deletes the selected columns or rows and clears leftover selection.
 * 7. Table column resizing is captured into ProseMirror undo/redo history so Ctrl+Z / Ctrl+Y works properly.
 * 8. Clicking below a table at document end automatically appends and focuses an empty paragraph.
 *
 * @since 0.2.0
 */

import { Extension } from '@tiptap/core';
import { TextSelection, AllSelection } from '@tiptap/pm/state';

export const TableExitBehavior = Extension.create({
  name: 'tableExitBehavior',

  addKeyboardShortcuts() {
    return {
      // 1. ArrowDown: Exit table if at the bottom of the last cell in the table
      ArrowDown: ({ editor }) => {
        const { state, view } = editor;
        const { selection, doc, schema } = state;
        const { $from } = selection;

        let tableDepth = -1;
        let rowDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          const name = $from.node(d).type.name;
          if (name === 'table' && tableDepth === -1) tableDepth = d;
          if ((name === 'tableRow' || name === 'table_row') && rowDepth === -1) rowDepth = d;
        }
        if (tableDepth === -1 || rowDepth === -1) return false;

        const tableNode = $from.node(tableDepth);
        const tableEnd = $from.after(tableDepth);
        const isLastRow = $from.index(tableDepth) === tableNode.childCount - 1;
        const isAtEndOfCell = $from.parentOffset >= $from.parent.content.size;

        if (isLastRow && isAtEndOfCell) {
          // If table is at the very end of the document, insert an empty paragraph and move cursor
          if (tableEnd >= doc.content.size) {
            const tr = state.tr.insert(tableEnd, schema.nodes.paragraph.create());
            tr.setSelection(TextSelection.create(tr.doc, tableEnd + 1));
            view.dispatch(tr);
            return true;
          }

          // If there is a node after the table, jump selection into it
          const nextNode = doc.nodeAt(tableEnd);
          if (nextNode && nextNode.isTextblock) {
            const tr = state.tr.setSelection(TextSelection.create(doc, tableEnd + 1));
            view.dispatch(tr);
            return true;
          } else if (nextNode) {
            try {
              const tr = state.tr.setSelection(TextSelection.near(doc.resolve(tableEnd + 1)));
              view.dispatch(tr);
              return true;
            } catch {}
          }
        }

        return false;
      },

      // 2. ArrowUp: Exit table above if at the top of a table at document start
      ArrowUp: ({ editor }) => {
        const { state, view } = editor;
        const { selection, schema } = state;
        const { $from } = selection;

        let tableDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'table') {
            tableDepth = d;
            break;
          }
        }
        if (tableDepth === -1) return false;

        const tablePos = $from.before(tableDepth);
        const isFirstRow = $from.index(tableDepth) === 0;
        const isAtStartOfCell = $from.parentOffset === 0;

        if (tablePos === 0 && isFirstRow && isAtStartOfCell) {
          const tr = state.tr.insert(0, schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, 1));
          view.dispatch(tr);
          return true;
        }

        return false;
      },

      // 3. Mod+Enter / Alt+Enter: Insert newline below table from anywhere inside table
      // (Shift+Enter is deliberately omitted so users can insert soft line breaks inside cells)
      'Mod-Enter': ({ editor }) => {
        return exitTableBelow(editor);
      },
      'Alt-Enter': ({ editor }) => {
        return exitTableBelow(editor);
      },

      // 4. Mod+Shift+Enter / Alt+Shift+Enter: Insert newline above table
      'Mod-Shift-Enter': ({ editor }) => {
        return exitTableAbove(editor);
      },
      'Alt-Shift-Enter': ({ editor }) => {
        return exitTableAbove(editor);
      },

      // 5. Enter in an empty trailing cell: exit table below only if in the last cell of the last row
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        let tableDepth = -1;
        let rowDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          const name = $from.node(d).type.name;
          if (name === 'table' && tableDepth === -1) tableDepth = d;
          if ((name === 'tableRow' || name === 'table_row') && rowDepth === -1) rowDepth = d;
        }
        if (tableDepth === -1 || rowDepth === -1) return false;

        const tableNode = $from.node(tableDepth);
        const rowNode = $from.node(rowDepth);
        const isLastRow = $from.index(tableDepth) === tableNode.childCount - 1;
        const isLastCellInRow = $from.index(rowDepth) === rowNode.childCount - 1;

        // Only exit if the cell is completely empty and in the last cell of the last row
        if (isLastRow && isLastCellInRow && $from.parent.content.size === 0) {
          return exitTableBelow(editor);
        }

        return false;
      },

      // 6. Backspace & Delete: Delete selected columns, rows, or whole table when CellSelection is active
      Backspace: ({ editor }) => {
        return handleDeleteInTable(editor);
      },
      Delete: ({ editor }) => {
        return handleDeleteInTable(editor);
      },

      // 7. Tab: In table, advance to next cell; if in the last cell of the table, add row after
      Tab: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        let tableDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'table') {
            tableDepth = d;
            break;
          }
        }
        if (tableDepth === -1) return false;

        // Try navigating to next cell first
        if (editor.commands.goToNextCell()) {
          return true;
        }

        // If at the end of the table, append a new row and advance to its first cell
        const tableNode = $from.node(tableDepth);
        const isLastRow = $from.index(tableDepth) === tableNode.childCount - 1;
        if (isLastRow) {
          if (editor.commands.addRowAfter()) {
            editor.commands.goToNextCell();
            return true;
          }
        }
        return false;
      },

      // 8. Shift-Tab: Navigate to the previous cell
      'Shift-Tab': ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        let tableDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'table') {
            tableDepth = d;
            break;
          }
        }
        if (tableDepth === -1) return false;

        return editor.commands.goToPreviousCell();
      },
    };
  },
});

function exitTableBelow(editor: any): boolean {
  const { state, view } = editor;
  const { selection, doc, schema } = state;
  const { $from } = selection;

  let tableDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'table') {
      tableDepth = d;
      break;
    }
  }
  if (tableDepth === -1) return false;

  const tableEnd = $from.after(tableDepth);
  const tr = state.tr.insert(tableEnd, schema.nodes.paragraph.create());
  tr.setSelection(TextSelection.create(tr.doc, tableEnd + 1));
  view.dispatch(tr);
  view.focus();
  return true;
}

function exitTableAbove(editor: any): boolean {
  const { state, view } = editor;
  const { selection, doc, schema } = state;
  const { $from } = selection;

  let tableDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'table') {
      tableDepth = d;
      break;
    }
  }
  if (tableDepth === -1) return false;

  const tablePos = $from.before(tableDepth);
  const tr = state.tr.insert(tablePos, schema.nodes.paragraph.create());
  tr.setSelection(TextSelection.create(tr.doc, tablePos + 1));
  view.dispatch(tr);
  view.focus();
  return true;
}

function clearCellSelectionToText(editor: any, targetPos: number): void {
  try {
    const { state, view } = editor;
    const maxPos = state.doc.content.size;
    const safePos = Math.min(Math.max(1, targetPos), maxPos);
    const tr = state.tr.setSelection(TextSelection.near(state.doc.resolve(safePos)));
    view.dispatch(tr);
  } catch {}
}

function handleDeleteInTable(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;

  // 1. Check if selection is a CellSelection (from prosemirror-tables / tiptap)
  const isCellSelection =
    selection.constructor.name === 'CellSelection' ||
    Boolean((selection as any).$anchorCell && (selection as any).$headCell) ||
    typeof (selection as any).forEachCell === 'function';

  if (isCellSelection) {
    const sel = selection as any;
    const fallbackPos = selection.$from.pos;
    const { $from } = selection;

    let tableDepth = -1;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'table') {
        tableDepth = d;
        break;
      }
    }

    if (tableDepth !== -1) {
      const tableNode = $from.node(tableDepth);
      const totalRows = tableNode.childCount;
      const totalCols = tableNode.firstChild ? tableNode.firstChild.childCount : 0;

      const selectedCellPositions: number[] = [];
      if (typeof sel.forEachCell === 'function') {
        sel.forEachCell((_node: any, pos: number) => {
          selectedCellPositions.push(pos);
        });
      }

      if (selectedCellPositions.length > 0) {
        // If all cells in table are selected -> delete the entire table
        if (selectedCellPositions.length >= totalRows * totalCols) {
          return editor.commands.deleteTable();
        }

        // Check if whole columns are selected
        const isColSel = typeof sel.isColSelection === 'function' ? sel.isColSelection() : false;
        const isRowSel = typeof sel.isRowSelection === 'function' ? sel.isRowSelection() : false;

        if (isColSel && isRowSel) {
          return editor.commands.deleteTable();
        }

        if (isColSel) {
          const ok = editor.commands.deleteColumn();
          if (ok) {
            clearCellSelectionToText(editor, fallbackPos);
            return true;
          }
          return false;
        }

        if (isRowSel) {
          const ok = editor.commands.deleteRow();
          if (ok) {
            clearCellSelectionToText(editor, fallbackPos);
            return true;
          }
          return false;
        }

        // Partial cell selection: empty cell contents rather than deleting columns or rows
        let tr = state.tr;
        selectedCellPositions.forEach((pos) => {
          const cellNode = state.doc.nodeAt(pos);
          if (cellNode && cellNode.content.size > 0) {
            tr = tr.replaceWith(pos + 1, pos + cellNode.nodeSize - 1, state.schema.nodes.paragraph.create());
          }
        });
        clearCellSelectionToText(editor, fallbackPos);
        editor.view.dispatch(tr);
        return true;
      }
    }
    return false;
  }

  // 2. Non-CellSelection (e.g. AllSelection covering whole document)
  if (!selection.empty) {
    const { from, to } = selection;
    const isAllSelection =
      selection instanceof AllSelection ||
      (from === 0 && to >= state.doc.content.size);

    // If entire document is selected (e.g. Ctrl+A -> Backspace)
    if (isAllSelection) {
      const tr = state.tr.replaceWith(0, state.doc.content.size, state.schema.nodes.paragraph.create());
      tr.setSelection(TextSelection.create(tr.doc, 1));
      editor.view.dispatch(tr);
      return true;
    }

    // Check if selection intersects or encloses any table
    let intersectsTable = false;
    state.doc.nodesBetween(from, to, (node: any) => {
      if (node.type.name === 'table') {
        intersectsTable = true;
        return false;
      }
      return true;
    });

    if (intersectsTable) {
      try {
        const tr = state.tr.delete(from, to);
        if (tr.doc.content.size === 0) {
          tr.insert(0, state.schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, 1));
        } else {
          const safePos = Math.min(from, tr.doc.content.size);
          tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(1, safePos))));
        }
        editor.view.dispatch(tr);
        return true;
      } catch {}
    }
  }

  return false;
}

export default TableExitBehavior;
