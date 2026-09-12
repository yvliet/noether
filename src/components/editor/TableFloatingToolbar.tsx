import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  Delete02Icon,
} from '@/components/common/Icons';

interface TableFloatingToolbarProps {
  editor: Editor;
}

export const TableFloatingToolbar: React.FC<TableFloatingToolbarProps> = ({ editor }) => {
  if (!editor || !editor.isEditable) return null;

  const isTableActive = editor.isActive('table');
  if (!isTableActive) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 bg-[var(--noether-bg-popover,var(--noether-bg-card,#232323))] border border-[var(--noether-border-base,#2e2e2e)] rounded-lg shadow-[var(--noether-shadow-2,0_4px_16px_rgba(0,0,0,0.4))] p-1 text-xs select-none backdrop-blur-md"
    >
      {/* Row operations */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="Add row above"
          className="px-2 py-1 rounded-[4px] text-[11px] text-[var(--noether-text-secondary,#bbb)] hover:text-white hover:bg-[var(--noether-bg-card-hover,#2e2e2e)] transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>+ Row ↑</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="Add row below"
          className="px-2 py-1 rounded-[4px] text-[11px] text-[var(--noether-text-secondary,#bbb)] hover:text-white hover:bg-[var(--noether-bg-card-hover,#2e2e2e)] transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>+ Row ↓</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="Delete current row"
          className="px-2 py-1 rounded-[4px] text-[11px] text-[var(--noether-text-muted,#888)] hover:text-[#eb5757] hover:bg-rose-950/20 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>- Row</span>
        </button>
      </div>

      <div className="w-[1px] h-4 bg-[var(--noether-border-subtle,#333)] mx-0.5" />

      {/* Column operations */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title="Add column left"
          className="px-2 py-1 rounded-[4px] text-[11px] text-[var(--noether-text-secondary,#bbb)] hover:text-white hover:bg-[var(--noether-bg-card-hover,#2e2e2e)] transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>+ Col ←</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="Add column right"
          className="px-2 py-1 rounded-[4px] text-[11px] text-[var(--noether-text-secondary,#bbb)] hover:text-white hover:bg-[var(--noether-bg-card-hover,#2e2e2e)] transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>+ Col →</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="Delete current column"
          className="px-2 py-1 rounded-[4px] text-[11px] text-[var(--noether-text-muted,#888)] hover:text-[#eb5757] hover:bg-rose-950/20 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>- Col</span>
        </button>
      </div>

      <div className="w-[1px] h-4 bg-[var(--noether-border-subtle,#333)] mx-0.5" />

      {/* Header Row & Delete Table */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          title="Toggle header row"
          className="px-2 py-1 rounded-[4px] text-[11px] text-[var(--noether-text-secondary,#bbb)] hover:text-white hover:bg-[var(--noether-bg-card-hover,#2e2e2e)] transition-colors cursor-pointer"
        >
          <span>Header</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteTable().run()}
          title="Delete entire table"
          className="p-1 rounded-[4px] text-[#eb5757] hover:bg-rose-950/30 transition-colors cursor-pointer flex items-center justify-center"
        >
          <Delete02Icon size={14} />
        </button>
      </div>
    </div>
  );
};
