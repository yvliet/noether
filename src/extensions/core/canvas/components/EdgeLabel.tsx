import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export interface EdgeLabelProps {
  label?: string;
  mid: { x: number; y: number };
  isSelected?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (newLabel: string) => void;
  onCancel: () => void;
  onDraftChange?: (draft: string) => void;
}

export const EdgeLabel: React.FC<EdgeLabelProps> = React.memo(
  ({ label, mid, isSelected, isEditing, onStartEdit, onSave, onCancel, onDraftChange }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const wasEditingRef = useRef(false);
    const isSavingRef = useRef(false);
    const [hasText, setHasText] = useState(Boolean(label && label.trim()));

    // Synchronize DOM text content when entering or exiting editing mode
    useEffect(() => {
      if (isEditing && !wasEditingRef.current) {
        isSavingRef.current = false;
        const initial = label || '';
        if (textRef.current) {
          textRef.current.textContent = initial;
          setHasText(Boolean(initial.trim()));
          requestAnimationFrame(() => {
            if (!textRef.current) return;
            textRef.current.focus();
            try {
              const range = document.createRange();
              range.selectNodeContents(textRef.current);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch {}
          });
        }
        onDraftChange?.(initial);
      } else if (!isEditing && wasEditingRef.current) {
        isSavingRef.current = false;
        if (textRef.current) {
          textRef.current.textContent = label || '';
          setHasText(Boolean(label && label.trim()));
        }
      }
      wasEditingRef.current = isEditing;
    }, [isEditing, label, onDraftChange]);

    if (!isEditing && (!label || label.trim() === '')) {
      return null;
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        isSavingRef.current = true;
        const text = textRef.current?.textContent || '';
        onSave(text.trim());
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        isSavingRef.current = true;
        if (textRef.current) {
          textRef.current.textContent = label || '';
          setHasText(Boolean(label && label.trim()));
        }
        onCancel();
      }
    };

    const handleBlur = () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      const text = textRef.current?.textContent || '';
      onSave(text.trim());
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      const rawText = e.currentTarget.textContent || '';
      const trimmed = rawText.trim();
      setHasText(Boolean(trimmed));
      onDraftChange?.(rawText);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const plainText = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, plainText);
    };

    return (
      <div
        style={{
          position: 'absolute',
          left: `${mid.x}px`,
          top: `${mid.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
        className="canvas-edge-label pointer-events-auto z-20 select-none flex items-center justify-center"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          ref={textRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          data-placeholder="Type label..."
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onPaste={handlePaste}
          onClick={(e) => {
            if (!isEditing) {
              e.stopPropagation();
              onStartEdit();
            }
          }}
          onDoubleClick={(e) => {
            if (!isEditing) {
              e.stopPropagation();
              onStartEdit();
            }
          }}
          title={isEditing ? undefined : 'Click to edit label'}
          className={clsx(
            'relative px-2 h-7 leading-7 block text-[14px] font-medium text-center outline-none transition-none whitespace-nowrap min-w-[24px] max-w-[336px]',
            isEditing
              ? 'text-white cursor-text select-text'
              : 'text-[#dddddd] hover:text-white cursor-pointer select-none truncate',
            !hasText && isEditing && 'before:content-[attr(data-placeholder)] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-[#555555] before:pointer-events-none before:font-medium before:text-[14px] before:leading-none'
          )}
        >
          {!isEditing ? label : undefined}
        </div>
      </div>
    );
  }
);
