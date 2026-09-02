import React, { useState, useEffect, useRef } from 'react';
import { Cancel01Icon } from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const PromptModal: React.FC = React.memo(() => {
  const inputDialog = useWorkspaceStore((state) => state.inputDialog);
  const closeInputDialog = useWorkspaceStore((state) => state.closeInputDialog);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputDialog?.isOpen) {
      setValue(inputDialog.defaultValue || '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [inputDialog]);

  if (!inputDialog?.isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim()) {
      inputDialog.onConfirm(value.trim());
      closeInputDialog();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeInputDialog();
    }
  };

  return (
    <div
      onClick={closeInputDialog}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
    >
      <form
        data-card="true"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-subtle,#2e2e2e)] rounded-xl shadow-2xl overflow-hidden p-5 flex flex-col gap-4 text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--flint-text-primary)] tracking-tight">
            {inputDialog.title || 'Input'}
          </h3>
          <button
            type="button"
            onClick={closeInputDialog}
            className="p-1 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
          >
            <Cancel01Icon size={14} />
          </button>
        </div>

        {/* Input field */}
        <div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputDialog.placeholder || 'Enter value...'}
            className="w-full bg-[var(--flint-bg-input)] border border-[var(--flint-border-base)] focus:border-[var(--flint-border-strong)] rounded-[5px] px-3 py-2 text-xs text-[var(--flint-text-primary)] outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] transition-colors"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={closeInputDialog}
            className="obsidian-btn cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            style={{ backgroundColor: 'var(--flint-accent, #ea580c)' }}
            className="px-4 py-1.5 rounded-[5px] hover:brightness-110 active:brightness-90 disabled:opacity-40 text-white text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.35)] border border-black/20 transition-all cursor-pointer"
          >
            {inputDialog.confirmText || 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
});
