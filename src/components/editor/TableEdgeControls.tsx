import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { PlusSignIcon } from '@/components/common/Icons';

interface TableEdgeControlsProps {
  editor: Editor | null;
}

interface HoveredTableInfo {
  tableElement: HTMLTableElement;
  rect: DOMRect;
}

export const TableEdgeControls: React.FC<TableEdgeControlsProps> = ({ editor }) => {
  const [hoveredTable, setHoveredTable] = useState<HoveredTableInfo | null>(null);
  const hoveredTableRef = useRef(hoveredTable);
  hoveredTableRef.current = hoveredTable;

  const updateTableRect = useCallback(() => {
    if (!hoveredTableRef.current?.tableElement) return;
    if (!document.body.contains(hoveredTableRef.current.tableElement)) {
      setHoveredTable(null);
      return;
    }
    const rect = hoveredTableRef.current.tableElement.getBoundingClientRect();
    setHoveredTable({ tableElement: hoveredTableRef.current.tableElement, rect });
  }, []);

  // Track cursor selection changes in editor
  useEffect(() => {
    if (!editor || !editor.view || !editor.isEditable) return;

    const checkSelection = () => {
      if (editor.isFocused && editor.isActive('table')) {
        try {
          const sel = editor.state.selection;
          const domAtPos = editor.view.domAtPos(sel.from).node;
          const focusedTable = (domAtPos instanceof HTMLElement ? domAtPos : domAtPos.parentElement)?.closest('table') as HTMLTableElement | null;
          if (focusedTable && editor.view.dom.contains(focusedTable)) {
            const rect = focusedTable.getBoundingClientRect();
            setHoveredTable({ tableElement: focusedTable, rect });
            return;
          }
        } catch {}
      }
    };

    editor.on('selectionUpdate', checkSelection);
    return () => {
      editor.off('selectionUpdate', checkSelection);
    };
  }, [editor]);

  // Track mouse movements throttled via requestAnimationFrame
  useEffect(() => {
    if (!editor || !editor.view || !editor.isEditable) return;

    const editorDom = editor.view.dom;
    let rafId: number | null = null;
    let pendingEvent: MouseEvent | null = null;

    const processMouseMove = () => {
      rafId = null;
      const e = pendingEvent;
      if (!e) return;

      const target = e.target as HTMLElement | null;

      // 1. If mouse is directly over the button itself, keep active
      if (target?.closest('.flint-table-edge-btn-container')) {
        return;
      }

      // 2. If mouse is directly over a table in the editor, show immediately
      const table = target?.closest('table') as HTMLTableElement | null;
      if (table && editorDom.contains(table)) {
        const rect = table.getBoundingClientRect();
        if (hoveredTableRef.current?.tableElement !== table) {
          setHoveredTable({ tableElement: table, rect });
        }
        return;
      }

      // 3. If mouse is in the small gap right next to the edge button (+25px buffer)
      if (hoveredTableRef.current?.tableElement) {
        const rect = hoveredTableRef.current.tableElement.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const isNearRightEdge =
          mouseX >= rect.right - 2 &&
          mouseX <= rect.right + 30 &&
          mouseY >= rect.top &&
          mouseY <= rect.bottom;
        const isNearBottomEdge =
          mouseY >= rect.bottom - 2 &&
          mouseY <= rect.bottom + 30 &&
          mouseX >= rect.left &&
          mouseX <= rect.right;

        if (isNearRightEdge || isNearBottomEdge) {
          return;
        }
      }

      // 4. Mouse has left the table and edge buttons - dismiss immediately with 0 delay
      if (hoveredTableRef.current) {
        setHoveredTable(null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      pendingEvent = e;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(processMouseMove);
      }
    };

    const handleScroll = () => {
      updateTableRect();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [editor, updateTableRect]);

  if (!hoveredTable || !editor || !editor.isEditable) return null;

  const { rect, tableElement } = hoveredTable;

  // Add column at the right edge of this table
  const handleAddColumn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const lastCell = tableElement.querySelector('tr:first-child > *:last-child') as HTMLElement | null;
    if (lastCell) {
      const pos = editor.view.posAtDOM(lastCell, 0);
      if (typeof pos === 'number') {
        editor.chain().focus().setTextSelection(pos).addColumnAfter().run();
        updateTableRect();
        return;
      }
    }
    editor.chain().focus().addColumnAfter().run();
    updateTableRect();
  };

  // Add row at the bottom edge of this table
  const handleAddRow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const lastRowFirstCell = tableElement.querySelector('tr:last-child > *:first-child') as HTMLElement | null;
    if (lastRowFirstCell) {
      const pos = editor.view.posAtDOM(lastRowFirstCell, 0);
      if (typeof pos === 'number') {
        editor.chain().focus().setTextSelection(pos).addRowAfter().run();
        updateTableRect();
        return;
      }
    }
    editor.chain().focus().addRowAfter().run();
    updateTableRect();
  };

  return (
    <>
      {/* Right edge: Add Column button */}
      <div
        className="flint-table-edge-btn-container"
        style={{
          position: 'fixed',
          top: `${rect.top + rect.height / 2 - 11}px`,
          left: `${rect.right + 6}px`,
          zIndex: 45,
        }}
      >
        <button
          type="button"
          onClick={handleAddColumn}
          title="Add column"
          className="w-[22px] h-[22px] rounded-full bg-[var(--flint-bg-card,#222222)] hover:bg-[var(--flint-bg-card-hover,#2c2c2c)] active:bg-[var(--flint-bg-input,#181818)] border border-[var(--flint-border-base,#333333)] hover:border-[var(--flint-border-strong,#555555)] text-[var(--flint-text-muted,#888888)] hover:text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] flex items-center justify-center cursor-pointer group outline-none"
        >
          <PlusSignIcon size={12} className="group-hover:text-white" />
        </button>
      </div>

      {/* Bottom edge: Add Row button */}
      <div
        className="flint-table-edge-btn-container"
        style={{
          position: 'fixed',
          top: `${rect.bottom + 6}px`,
          left: `${rect.left + rect.width / 2 - 11}px`,
          zIndex: 45,
        }}
      >
        <button
          type="button"
          onClick={handleAddRow}
          title="Add row"
          className="w-[22px] h-[22px] rounded-full bg-[var(--flint-bg-card,#222222)] hover:bg-[var(--flint-bg-card-hover,#2c2c2c)] active:bg-[var(--flint-bg-input,#181818)] border border-[var(--flint-border-base,#333333)] hover:border-[var(--flint-border-strong,#555555)] text-[var(--flint-text-muted,#888888)] hover:text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] flex items-center justify-center cursor-pointer group outline-none"
        >
          <PlusSignIcon size={12} className="group-hover:text-white" />
        </button>
      </div>
    </>
  );
};
