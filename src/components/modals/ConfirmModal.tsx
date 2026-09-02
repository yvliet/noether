import React, { useState, useEffect } from 'react';
import { Cancel01Icon } from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSettingsStore } from '@/store/settingsStore';

export const ConfirmModal: React.FC = React.memo(() => {
  const confirmDialog = useWorkspaceStore((state) => state.confirmDialog);
  const closeConfirmDialog = useWorkspaceStore((state) => state.closeConfirmDialog);
  const setSkipDeleteConfirmation = useSettingsStore((state) => state.setSkipDeleteConfirmation);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    setDontAskAgain(false);
  }, [confirmDialog]);

  useEffect(() => {
    if (!confirmDialog?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeConfirmDialog();
      } else if (e.key === 'Enter') {
        if (dontAskAgain) {
          if (confirmDialog.onDontAskAgain) {
            confirmDialog.onDontAskAgain();
          } else {
            setSkipDeleteConfirmation(true);
          }
        }
        confirmDialog.onConfirm();
        closeConfirmDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, closeConfirmDialog, dontAskAgain, setSkipDeleteConfirmation]);

  if (!confirmDialog?.isOpen) return null;

  const handleConfirm = () => {
    if (dontAskAgain) {
      if (confirmDialog.onDontAskAgain) {
        confirmDialog.onDontAskAgain();
      } else {
        setSkipDeleteConfirmation(true);
      }
    }
    confirmDialog.onConfirm();
    closeConfirmDialog();
  };

  return (
    <div
      onClick={closeConfirmDialog}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
    >
      <div
        data-card="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-subtle,#2e2e2e)] rounded-xl shadow-2xl overflow-hidden p-5 flex flex-col gap-4 text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--flint-text-primary)] tracking-tight">
            {confirmDialog.title || 'Confirmation'}
          </h3>
          <button
            onClick={closeConfirmDialog}
            className="p-1 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
          >
            <Cancel01Icon size={14} />
          </button>
        </div>

        {/* Body Text */}
        <div className="text-[var(--flint-text-secondary)] leading-relaxed flex flex-col gap-1">
          <p className="text-xs">{confirmDialog.message}</p>
          {confirmDialog.subtext && (
            <p className="text-[11px] text-[var(--flint-text-muted)]">{confirmDialog.subtext}</p>
          )}
        </div>

        {/* Footer with Optional Checkbox and Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 text-[11px] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="accent-[var(--flint-accent)] rounded"
            />
            <span>Don't ask again</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={closeConfirmDialog}
              className="obsidian-btn cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              style={!confirmDialog.isDanger ? { backgroundColor: 'var(--flint-accent, #ea580c)' } : undefined}
              className={`px-4 py-1.5 rounded-[5px] text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer ${
                confirmDialog.isDanger
                  ? 'bg-[#e11d48] hover:bg-[#f43f5e] active:bg-[#be123c] text-white border border-black/20'
                  : 'hover:brightness-110 active:brightness-90 text-white border border-black/20'
              }`}
            >
              {confirmDialog.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
