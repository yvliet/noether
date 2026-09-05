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
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

export const TableExitPluginKey = new PluginKey('tableExitBehavior');

export const TableExitBehavior = Extension.create({
  name: 'tableExitBehavior',

  addKeyboardShortcuts() {
    return {
      // 1. ArrowDown: Exit table if at the bottom of the table
      ArrowDown: ({ editor }) => {
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

        const tableNode = $from.node(tableDepth);
        const tableEnd = $from.after(tableDepth);

        // Check if cursor is in the last row of the table
        let rowDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'tableRow' || $from.node(d).type.name === 'table_row') {
            rowDepth = d;
            break;
          }
        }

        const isLastRow = rowDepth !== -1 && $from.index(tableDepth) === tableNode.childCount - 1;
        const isNearTableEnd = $from.pos >= $from.end(tableDepth) - 6;

        if (isLastRow || isNearTableEnd) {
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
        const isFirstRow = $from.index(tableDepth) === 0;

        if (tablePos === 0 && (isFirstRow || $from.pos <= $from.start(tableDepth) + 6)) {
          const tr = state.tr.insert(0, schema.nodes.paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, 1));
          view.dispatch(tr);
          return true;
        }

        return false;
      },

      // 3. Mod+Enter / Shift+Enter / Alt+Enter: Insert newline below table from anywhere inside table
      'Mod-Enter': ({ editor }) => {
        return exitTableBelow(editor);
      },
      'Shift-Enter': ({ editor }) => {
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

      // 5. Enter in an empty trailing cell
      Enter: ({ editor }) => {
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

        const tableNode = $from.node(tableDepth);
        const isLastRow = $from.index(tableDepth) === tableNode.childCount - 1;
        const parentCell = $from.node($from.depth - 1);
        const isLastCellInRow = parentCell ? parentCell.type.name.includes('Cell') || parentCell.type.name.includes('cell') : false;

        // If the cell is completely empty and in the last row, exit table below
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
    };
  },

  addProseMirrorPlugins() {
    let resizeSnapshot: {
      tablePos: number;
      widths: (number[] | null)[];
    } | null = null;

    return [
      new Plugin({
        key: TableExitPluginKey,
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              const target = event.target as HTMLElement | null;
              const isTableRelated = Boolean(
                target?.closest('table') ||
                target?.closest('.flint-table') ||
                target?.closest('.column-resize-handle')
              );

              if (isTableRelated) {
                try {
                  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  if (coords && typeof coords.pos === 'number') {
                    const $pos = view.state.doc.resolve(coords.pos);
                    for (let d = $pos.depth; d > 0; d--) {
                      if ($pos.node(d).type.name === 'table') {
                        const tNode = $pos.node(d);
                        const tPos = $pos.before(d);
                        const widths: (number[] | null)[] = [];
                        tNode.descendants((child) => {
                          const name = child.type.name.toLowerCase();
                          if (name.includes('cell') || name.includes('header')) {
                            widths.push(child.attrs.colwidth ? [...child.attrs.colwidth] : null);
                          }
                        });
                        resizeSnapshot = { tablePos: tPos, widths };
                        break;
                      }
                    }
                  }
                } catch {}
              }
              return false;
            },

            mouseup: (view) => {
              if (resizeSnapshot) {
                const snap = resizeSnapshot;
                resizeSnapshot = null;
                try {
                  const doc = view.state.doc;
                  if (snap.tablePos < doc.content.size) {
                    const currentTable = doc.nodeAt(snap.tablePos);
                    if (currentTable && currentTable.type.name === 'table') {
                      const currentWidths: (number[] | null)[] = [];
                      currentTable.descendants((child) => {
                        const name = child.type.name.toLowerCase();
                        if (name.includes('cell') || name.includes('header')) {
                          currentWidths.push(child.attrs.colwidth ? [...child.attrs.colwidth] : null);
                        }
                      });

                      const hasChanged = JSON.stringify(currentWidths) !== JSON.stringify(snap.widths);
                      if (hasChanged) {
                        // Re-dispatch a history-tracked transaction so ProseMirror records this resize in the undo stack
                        const tr = view.state.tr;
                        tr.setMeta('addToHistory', true);
                        const tPos = snap.tablePos;
                        currentTable.descendants((child, offset) => {
                          const name = child.type.name.toLowerCase();
                          if (name.includes('cell') || name.includes('header')) {
                            const cellPos = tPos + 1 + offset;
                            tr.setNodeMarkup(cellPos, undefined, { ...child.attrs });
                          }
                        });
                        view.dispatch(tr);
                      }
                    }
                  }
                } catch {}
              }
              return false;
            },

            click: (view, event) => {
              const { state } = view;
              const { doc, schema } = state;

              // Check if the last node in the document is a table
              if (doc.lastChild && doc.lastChild.type.name === 'table') {
                const tables = view.dom.querySelectorAll('table');
                const lastTable = tables.length > 0 ? tables[tables.length - 1] : null;

                if (lastTable) {
                  const rect = lastTable.getBoundingClientRect();
                  // If clicked below the bottom edge of the last table
                  if (event.clientY > rect.bottom + 2) {
                    const insertPos = doc.content.size;
                    const tr = state.tr.insert(insertPos, schema.nodes.paragraph.create());
                    tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
                    view.dispatch(tr);
                    view.focus();
                    return true;
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

  if (!isCellSelection) {
    return false;
  }

  const sel = selection as any;
  const fallbackPos = selection.$from.pos;

  // 2. Check if whole columns are selected
  if (typeof sel.isColSelection === 'function' && sel.isColSelection()) {
    if (typeof sel.isRowSelection === 'function' && sel.isRowSelection()) {
      return editor.commands.deleteTable();
    }
    const ok = editor.commands.deleteColumn();
    if (ok) {
      clearCellSelectionToText(editor, fallbackPos);
      return true;
    }
    return false;
  }

  // 3. Check if whole rows are selected
  if (typeof sel.isRowSelection === 'function' && sel.isRowSelection()) {
    const ok = editor.commands.deleteRow();
    if (ok) {
      clearCellSelectionToText(editor, fallbackPos);
      return true;
    }
    return false;
  }

  // 4. Fallback inspection for rectangular CellSelection covering all rows in selected cols
  const $from = selection.$from;
  let tableDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'table') {
      tableDepth = d;
      break;
    }
  }

  if (tableDepth === -1) return false;

  const tableNode = $from.node(tableDepth);
  const totalRows = tableNode.childCount;
  const totalCols = tableNode.firstChild ? tableNode.firstChild.childCount : 0;

  const selectedCellPositions: number[] = [];
  if (typeof sel.forEachCell === 'function') {
    sel.forEachCell((_node: any, pos: number) => {
      selectedCellPositions.push(pos);
    });
  }

  if (selectedCellPositions.length === 0) {
    return false;
  }

  // If all cells in table are selected -> delete the entire table
  if (selectedCellPositions.length >= totalRows * totalCols) {
    return editor.commands.deleteTable();
  }

  // If selected cells cover entire columns (length is multiple of totalRows)
  if (totalRows > 0 && selectedCellPositions.length % totalRows === 0) {
    const ok = editor.commands.deleteColumn();
    if (ok) {
      clearCellSelectionToText(editor, fallbackPos);
      return true;
    }
    return false;
  }

  // If selected cells cover entire rows (length is multiple of totalCols)
  if (totalCols > 0 && selectedCellPositions.length % totalCols === 0) {
    const ok = editor.commands.deleteRow();
    if (ok) {
      clearCellSelectionToText(editor, fallbackPos);
      return true;
    }
    return false;
  }

  return false;
}

export default TableExitBehavior;
