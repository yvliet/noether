import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Cancel01Icon } from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export const ConfirmModal: React.FC = React.memo(() => {
  const confirmDialog = useWorkspaceStore((state) => state.confirmDialog);
  const closeConfirmDialog = useWorkspaceStore((state) => state.closeConfirmDialog);
  const setSkipDeleteConfirmation = useSettingsStore((state) => state.setSkipDeleteConfirmation);
  const setSkipRenameConfirmation = useSettingsStore((state) => state.setSkipRenameConfirmation);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(Boolean(confirmDialog?.isOpen), modalContainerRef, {
    initialFocusRef: cancelButtonRef,
  });

  useEffect(() => {
    setDontAskAgain(false);
  }, [confirmDialog]);

  const shouldShowDontAskAgain = Boolean(
    confirmDialog?.showDontAskAgain !== false &&
    (confirmDialog?.onDontAskAgain || confirmDialog?.skipSettingKey)
  );

  const applyDontAskAgain = useCallback(() => {
    if (!dontAskAgain || !confirmDialog) return;
    if (confirmDialog.onDontAskAgain) {
      confirmDialog.onDontAskAgain();
    } else if (confirmDialog.skipSettingKey === 'skipDeleteConfirmation') {
      setSkipDeleteConfirmation(true);
    } else if (confirmDialog.skipSettingKey === 'skipRenameConfirmation') {
      setSkipRenameConfirmation(true);
    }
  }, [dontAskAgain, confirmDialog, setSkipDeleteConfirmation, setSkipRenameConfirmation]);

  const handleConfirm = useCallback(() => {
    if (!confirmDialog) return;
    applyDontAskAgain();
    confirmDialog.onConfirm();
    closeConfirmDialog();
  }, [confirmDialog, applyDontAskAgain, closeConfirmDialog]);

  useEffect(() => {
    if (!confirmDialog?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (confirmDialog.onCancel) confirmDialog.onCancel();
        closeConfirmDialog();
      } else if (e.key === 'Enter') {
        if (confirmDialog.isDanger) {
          // Destructive actions require explicit focus on the confirm button
          const isDangerConfirmFocused = document.activeElement?.getAttribute('data-danger-confirm') === 'true';
          if (isDangerConfirmFocused) {
            e.preventDefault();
            e.stopPropagation();
            handleConfirm();
          }
        } else {
          e.preventDefault();
          e.stopPropagation();
          handleConfirm();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [confirmDialog, closeConfirmDialog, handleConfirm]);

  if (!confirmDialog?.isOpen) return null;

  return (
    <div
      ref={modalContainerRef}
      onClick={() => {
        if (confirmDialog.onCancel) confirmDialog.onCancel();
        closeConfirmDialog();
      }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none"
    >
      <div
        data-card="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--noether-bg-popover,var(--noether-bg-card))] border border-[var(--noether-border-subtle,#2e2e2e)] rounded-xl shadow-2xl overflow-hidden p-5 flex flex-col gap-4 text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--noether-text-primary)] tracking-tight">
            {confirmDialog.title || 'Confirmation'}
          </h3>
          <button
            onClick={() => {
              if (confirmDialog.onCancel) confirmDialog.onCancel();
              closeConfirmDialog();
            }}
            className="p-1 rounded hover:bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer"
          >
            <Cancel01Icon size={14} />
          </button>
        </div>

        {/* Body Text */}
        <div className="text-[var(--noether-text-secondary)] leading-relaxed flex flex-col gap-1">
          <p className="text-xs">{confirmDialog.message}</p>
          {confirmDialog.subtext && (
            <p className="text-[11px] text-[var(--noether-text-muted)]">{confirmDialog.subtext}</p>
          )}
        </div>

        {/* Footer with Optional Checkbox and Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          {shouldShowDontAskAgain ? (
            <label className="flex items-center gap-2 text-[11px] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => setDontAskAgain(e.target.checked)}
                className="accent-[var(--noether-accent)] rounded"
              />
              <span>Don't ask again</span>
            </label>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              ref={cancelButtonRef}
              onClick={() => {
                if (confirmDialog.onCancel) confirmDialog.onCancel();
                closeConfirmDialog();
              }}
              className="noether-btn"
            >
              {confirmDialog.cancelText || 'Cancel'}
            </button>
            <button
              data-danger-confirm={confirmDialog.isDanger ? 'true' : undefined}
              onClick={handleConfirm}
              className={confirmDialog.isDanger ? 'noether-btn noether-btn-danger' : 'noether-btn noether-btn-primary'}
            >
              {confirmDialog.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
