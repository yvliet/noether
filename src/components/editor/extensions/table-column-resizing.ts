import { Plugin, PluginKey, Transaction, EditorState } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { EditorView, NodeView, DecorationSet, ViewMutationRecord } from '@tiptap/pm/view';
import { TableMap, columnResizingPluginKey, cellAround } from '@tiptap/pm/tables';

interface DraggingState {
  startX: number;
  startWidth: number;
  targetCol: number;
  initialWidths: number[];
  tableStart: number;
  tablePos: number;
}

export class CustomResizeState {
  activeHandle: number;
  dragging: DraggingState | false;

  constructor(activeHandle: number, dragging: DraggingState | false) {
    this.activeHandle = activeHandle;
    this.dragging = dragging;
  }

  apply(tr: Transaction): CustomResizeState {
    const action = tr.getMeta(columnResizingPluginKey);
    if (action && action.setHandle !== undefined) {
      return new CustomResizeState(action.setHandle, false);
    }
    if (action && action.setDragging !== undefined) {
      return new CustomResizeState(this.activeHandle, action.setDragging);
    }
    if (this.activeHandle > -1 && tr.docChanged) {
      const handle = tr.mapping.map(this.activeHandle, -1);
      const cell = tr.doc.nodeAt(handle);
      const isCell = Boolean(
        cell &&
          (cell.type.name.toLowerCase().includes('cell') ||
            cell.type.name.toLowerCase().includes('header'))
      );
      return new CustomResizeState(isCell ? handle : -1, this.dragging);
    }
    return this;
  }
}

/**
 * Traverses upwards to find the closest table cell element (TD or TH).
 */
function domCellAround(target: HTMLElement | null): HTMLElement | null {
  let curr = target;
  while (curr && curr.nodeName !== 'TD' && curr.nodeName !== 'TH') {
    if (curr.classList && curr.classList.contains('ProseMirror')) return null;
    curr = curr.parentElement;
  }
  return curr;
}

/**
 * Finds the resolved position of the cell whose edge is near the mouse coords.
 */
function edgeCell(
  view: EditorView,
  event: MouseEvent,
  side: 'left' | 'right',
  handleWidth: number
): number {
  const offset = side === 'right' ? -handleWidth : handleWidth;
  const found = view.posAtCoords({
    left: event.clientX + offset,
    top: event.clientY,
  });
  if (!found) return -1;
  const { pos } = found;
  const $cell = cellAround(view.state.doc.resolve(pos));
  if (!$cell) return -1;
  if (side === 'right') return $cell.pos;
  const map = TableMap.get($cell.node(-1));
  const start = $cell.start(-1);
  const index = map.map.indexOf($cell.pos - start);
  return index % map.width === 0 ? -1 : start + map.map[index - 1];
}

/**
 * Dispatches a transaction updating the activeHandle in the plugin state.
 */
function updateHandle(view: EditorView, value: number) {
  view.dispatch(view.state.tr.setMeta(columnResizingPluginKey, { setHandle: value }));
}

/**
 * Accurately measures the rendered DOM pixel widths of every column in the table,
 * respecting explicit colwidth attributes if present, or extracting actual rendered widths.
 */
function measureAllColumnWidths(
  view: EditorView,
  tableNode: ProseMirrorNode,
  tableStart: number,
  tableDOM: HTMLTableElement,
  cellMinWidth: number
): number[] {
  const map = TableMap.get(tableNode);
  const colCount = map.width;
  const widths: number[] = new Array(colCount).fill(0);

  // 1. Check if first row already has explicit colwidths
  const firstRow = tableNode.firstChild;
  if (firstRow) {
    let colIdx = 0;
    for (let i = 0; i < firstRow.childCount; i++) {
      const cell = firstRow.child(i);
      const { colspan = 1, colwidth } = cell.attrs;
      for (let j = 0; j < colspan; j++) {
        if (colwidth && typeof colwidth[j] === 'number' && colwidth[j] > 0) {
          widths[colIdx] = colwidth[j];
        }
        colIdx++;
      }
    }
  }

  // 2. For any column without an explicit width, measure from DOM
  for (let c = 0; c < colCount; c++) {
    if (widths[c] > 0) continue;

    let measured = 0;
    // Find a cell in any row covering column c with minimal colspan (ideally colspan 1)
    for (let r = 0; r < map.height; r++) {
      const cellOffset = map.map[r * colCount + c];
      const cellNode = tableNode.nodeAt(cellOffset);
      if (!cellNode) continue;
      const colspan = cellNode.attrs.colspan || 1;

      try {
        const domCell = view.nodeDOM(tableStart + cellOffset) as HTMLElement | null;
        if (domCell && domCell.getBoundingClientRect) {
          const rect = domCell.getBoundingClientRect();
          if (rect.width > 0) {
            measured = rect.width / colspan;
            if (colspan === 1) break; // Perfect match found
          }
        }
      } catch {}
    }

    // Fallback if measurement was unavailable
    if (measured <= 0 && tableDOM) {
      try {
        const tableRect = tableDOM.getBoundingClientRect();
        if (tableRect.width > 0) {
          measured = tableRect.width / colCount;
        }
      } catch {}
    }

    widths[c] = Math.max(cellMinWidth, Math.round(measured || 100));
  }

  return widths;
}

/**
 * Synchronizes colgroup <col> widths and table dimensions directly on the DOM for immediate feedback.
 */
function applyDOMColumnWidths(
  tableDOM: HTMLTableElement,
  columnWidths: number[]
) {
  let colgroup = tableDOM.querySelector('colgroup');
  if (!colgroup) {
    colgroup = document.createElement('colgroup');
    tableDOM.insertBefore(colgroup, tableDOM.firstChild);
  }

  let nextCol = colgroup.firstChild as HTMLElement | null;
  let totalWidth = 0;

  for (let i = 0; i < columnWidths.length; i++) {
    const w = columnWidths[i];
    totalWidth += w;
    const cssWidth = `${w}px`;

    if (!nextCol) {
      const col = document.createElement('col');
      col.style.width = cssWidth;
      colgroup.appendChild(col);
    } else {
      if (nextCol.style.width !== cssWidth) {
        nextCol.style.width = cssWidth;
      }
      nextCol = nextCol.nextSibling as HTMLElement | null;
    }
  }

  while (nextCol) {
    const after = nextCol.nextSibling as HTMLElement | null;
    nextCol.parentNode?.removeChild(nextCol);
    nextCol = after;
  }

  tableDOM.style.width = `${totalWidth}px`;
  tableDOM.style.minWidth = `${totalWidth}px`;
}

/**
 * Custom TableView that manages isolated colgroup widths and table wrapping.
 */
export class CustomTableView implements NodeView {
  node: ProseMirrorNode;
  cellMinWidth: number;
  view: EditorView;
  dom: HTMLDivElement;
  table: HTMLTableElement;
  colgroup: HTMLElement;
  contentDOM: HTMLTableSectionElement;

  constructor(node: ProseMirrorNode, cellMinWidth: number, view: EditorView) {
    this.node = node;
    this.cellMinWidth = cellMinWidth;
    this.view = view;

    this.dom = document.createElement('div');
    this.dom.className = 'tableWrapper';

    this.table = this.dom.appendChild(document.createElement('table'));
    this.table.className = 'noether-table';
    this.table.style.setProperty('--default-cell-min-width', `${cellMinWidth}px`);

    this.colgroup = this.table.appendChild(document.createElement('colgroup'));
    this.contentDOM = this.table.appendChild(document.createElement('tbody'));

    this.updateColumns(node);
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.updateColumns(node);
    return true;
  }

  updateColumns(node: ProseMirrorNode) {
    let totalWidth = 0;
    let allHaveWidth = true;
    let hasAnyWidth = false;
    let nextCol = this.colgroup.firstChild as HTMLElement | null;
    const firstRow = node.firstChild;

    if (!firstRow) return;

    for (let i = 0; i < firstRow.childCount; i++) {
      const { colspan = 1, colwidth } = firstRow.child(i).attrs;
      for (let j = 0; j < colspan; j++) {
        const width = colwidth && typeof colwidth[j] === 'number' && colwidth[j] > 0 ? colwidth[j] : null;
        const cssWidth = width ? `${width}px` : '';

        if (width) {
          hasAnyWidth = true;
          totalWidth += width;
        } else {
          allHaveWidth = false;
          totalWidth += this.cellMinWidth;
        }

        if (!nextCol) {
          const col = document.createElement('col');
          col.style.width = cssWidth;
          this.colgroup.appendChild(col);
        } else {
          if (nextCol.style.width !== cssWidth) {
            nextCol.style.width = cssWidth;
          }
          nextCol = nextCol.nextSibling as HTMLElement | null;
        }
      }
    }

    while (nextCol) {
      const after = nextCol.nextSibling as HTMLElement | null;
      nextCol.parentNode?.removeChild(nextCol);
      nextCol = after;
    }

    if (allHaveWidth || hasAnyWidth) {
      this.table.style.width = `${totalWidth}px`;
      this.table.style.minWidth = `${totalWidth}px`;
    } else {
      // Natural fluid layout for brand new, unresized tables
      this.table.style.width = '';
      this.table.style.minWidth = '';
    }
  }

  ignoreMutation(record: ViewMutationRecord): boolean {
    return (
      record.type === 'attributes' &&
      (record.target === this.table || this.colgroup.contains(record.target as Node))
    );
  }
}

export interface TableColumnResizingOptions {
  handleWidth?: number;
  cellMinWidth?: number;
  lastColumnResizable?: boolean;
  View?: new (node: ProseMirrorNode, cellMinWidth: number, view: EditorView) => NodeView;
}

/**
 * Creates the isolated table column resizing plugin.
 * Resizing any column locks all other columns to their current rendered widths,
 * preventing any unintended shifting or squishing.
 * Completely eliminates the vertical highlight bar across table rows while
 * activating the horizontal resize cursor.
 */
export function tableColumnResizing({
  handleWidth = 6,
  cellMinWidth = 40,
  lastColumnResizable = true,
  View = CustomTableView,
}: TableColumnResizingOptions = {}): Plugin {
  return new Plugin({
    key: columnResizingPluginKey,
    state: {
      init(_, state) {
        return new CustomResizeState(-1, false);
      },
      apply(tr, prev) {
        return prev.apply(tr);
      },
    },
    props: {
      attributes(state): Record<string, string> {
        const pluginState = columnResizingPluginKey.getState(state);
        if (pluginState && (pluginState.activeHandle > -1 || Boolean(pluginState.dragging))) {
          return { class: 'resize-cursor' };
        }
        return {};
      },
      handleDOMEvents: {
        mousemove(view, event) {
          if (!view.editable) return false;
          const pluginState = columnResizingPluginKey.getState(view.state);
          if (!pluginState || pluginState.dragging) return false;

          const target = domCellAround(event.target as HTMLElement | null);
          let cellPos = -1;

          if (target) {
            const { left, right } = target.getBoundingClientRect();
            if (event.clientX - left <= handleWidth) {
              cellPos = edgeCell(view, event, 'left', handleWidth);
            } else if (right - event.clientX <= handleWidth) {
              cellPos = edgeCell(view, event, 'right', handleWidth);
            }
          }

          if (cellPos !== pluginState.activeHandle) {
            if (!lastColumnResizable && cellPos !== -1) {
              const $cell = view.state.doc.resolve(cellPos);
              const table = $cell.node(-1);
              const map = TableMap.get(table);
              const tableStart = $cell.start(-1);
              const col =
                map.colCount($cell.pos - tableStart) +
                ($cell.nodeAfter?.attrs.colspan || 1) -
                1;
              if (col === map.width - 1) return false;
            }
            updateHandle(view, cellPos);
          }
          return false;
        },

        mouseleave(view) {
          if (!view.editable) return false;
          const pluginState = columnResizingPluginKey.getState(view.state);
          if (pluginState && pluginState.activeHandle > -1 && !pluginState.dragging) {
            updateHandle(view, -1);
          }
          return false;
        },

        mousedown(view, event) {
          if (!view.editable || event.button !== 0) return false;
          const pluginState = columnResizingPluginKey.getState(view.state);
          if (!pluginState || pluginState.activeHandle === -1 || pluginState.dragging) {
            return false;
          }

          const $cell = view.state.doc.resolve(pluginState.activeHandle);
          let tableDepth = -1;
          for (let d = $cell.depth; d > 0; d--) {
            if ($cell.node(d).type.name === 'table') {
              tableDepth = d;
              break;
            }
          }
          if (tableDepth === -1) return false;

          const tableNode = $cell.node(tableDepth);
          const tableStart = $cell.start(tableDepth);
          const tablePos = $cell.before(tableDepth);
          const map = TableMap.get(tableNode);
          const targetCol =
            map.colCount($cell.pos - tableStart) +
            ($cell.nodeAfter?.attrs.colspan || 1) -
            1;

          let domTable = view.nodeDOM(tablePos) as HTMLElement | null;
          if (domTable && domTable.nodeName !== 'TABLE') {
            domTable = domTable.querySelector('table');
          }
          if (!domTable) {
            let curr = view.domAtPos($cell.pos).node as HTMLElement | null;
            while (curr && curr.nodeName !== 'TABLE') curr = curr.parentElement;
            domTable = curr;
          }
          if (!domTable) return false;

          const htmlTable = domTable as HTMLTableElement;
          const initialWidths = measureAllColumnWidths(
            view,
            tableNode,
            tableStart,
            htmlTable,
            cellMinWidth
          );
          const startWidth = initialWidths[targetCol];
          const startX = event.clientX;

          const draggingState: DraggingState = {
            startX,
            startWidth,
            targetCol,
            initialWidths: [...initialWidths],
            tableStart,
            tablePos,
          };

          view.dispatch(
            view.state.tr.setMeta(columnResizingPluginKey, { setDragging: draggingState })
          );

          // Render instant starting widths
          applyDOMColumnWidths(htmlTable, initialWidths);

          const win = view.dom.ownerDocument.defaultView || window;

          const onMouseMove = (moveEvent: MouseEvent) => {
            if ((moveEvent.buttons & 1) !== 1) {
              finish(moveEvent);
              return;
            }
            const delta = moveEvent.clientX - startX;
            const newWidth = Math.max(cellMinWidth, Math.round(startWidth + delta));
            const currentWidths = initialWidths.map((w, idx) =>
              idx === targetCol ? newWidth : w
            );
            applyDOMColumnWidths(htmlTable, currentWidths);
          };

          const finish = (upEvent: MouseEvent) => {
            win.removeEventListener('mousemove', onMouseMove);
            win.removeEventListener('mouseup', finish);

            const delta = upEvent.clientX - startX;
            const finalWidth = Math.max(cellMinWidth, Math.round(startWidth + delta));
            const finalWidths = initialWidths.map((w, idx) =>
              idx === targetCol ? finalWidth : w
            );

            // Commit final widths to document model
            try {
              const doc = view.state.doc;
              if (tablePos < doc.content.size) {
                const currentTableNode = doc.nodeAt(tablePos);
                if (currentTableNode && currentTableNode.type.name === 'table') {
                  const currentMap = TableMap.get(currentTableNode);
                  const currentTableStart = tablePos + 1;
                  const tr = view.state.tr;

                  // Update colwidth on all unique cells in the table
                  for (let r = 0; r < currentMap.height; r++) {
                    for (let c = 0; c < currentMap.width; c++) {
                      const mapIndex = r * currentMap.width + c;
                      // Skip merged cells already visited
                      if (r > 0 && currentMap.map[mapIndex] === currentMap.map[mapIndex - currentMap.width]) {
                        continue;
                      }
                      if (c > 0 && currentMap.map[mapIndex] === currentMap.map[mapIndex - 1]) {
                        continue;
                      }

                      const cellOffset = currentMap.map[mapIndex];
                      const cellNode = currentTableNode.nodeAt(cellOffset);
                      if (cellNode) {
                        const cellCol = currentMap.colCount(cellOffset);
                        const colspan = cellNode.attrs.colspan || 1;
                        const cellColWidths = finalWidths.slice(cellCol, cellCol + colspan);

                        tr.setNodeMarkup(currentTableStart + cellOffset, null, {
                          ...cellNode.attrs,
                          colwidth: cellColWidths,
                        });
                      }
                    }
                  }

                  tr.setMeta(columnResizingPluginKey, { setDragging: false, setHandle: -1 });
                  view.dispatch(tr);
                }
              }
            } catch (err) {
              console.error('Failed to commit table column widths:', err);
              view.dispatch(
                view.state.tr.setMeta(columnResizingPluginKey, { setDragging: false, setHandle: -1 })
              );
            }
          };

          win.addEventListener('mousemove', onMouseMove);
          win.addEventListener('mouseup', finish);
          event.preventDefault();
          return true;
        },
      },
      // Zero highlight decorations across the table rows
      decorations() {
        return DecorationSet.empty;
      },
      nodeViews: {
        table: (node, editorView) => new View(node, cellMinWidth, editorView),
      },
    },
  });
}
