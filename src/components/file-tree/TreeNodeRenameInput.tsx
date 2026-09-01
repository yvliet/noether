import React, { useRef, useEffect } from 'react';

export interface TreeNodeRenameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  errorMessage?: string | null;
  className?: string;
}

export const TreeNodeRenameInput: React.FC<TreeNodeRenameInputProps> = React.memo(({
  value,
  onChange,
  onSubmit,
  onCancel,
  errorMessage,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSelectedRef = useRef(false);

  useEffect(() => {
    if (!hasSelectedRef.current) {
      hasSelectedRef.current = true;
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const val = inputRef.current.value || '';
          const lastDot = val.lastIndexOf('.');
          if (lastDot > 0 && !val.startsWith('.')) {
            inputRef.current.setSelectionRange(0, lastDot);
          } else {
            inputRef.current.select();
          }
        }
      });
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 min-w-0 overflow-visible" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => handleSubmit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        style={{ overflowClipMargin: '4px' }}
        className={`w-full bg-transparent border-none outline-none p-0 m-0 text-[13px] tracking-tight text-white font-normal caret-white selection:bg-[#505560] selection:text-white leading-tight ${className}`}
      />

      {/* Warning / Error Tooltip */}
      {errorMessage && (
        <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center select-none shadow-2xl">
          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-[#f85153]" />
          <div className="bg-[#f85153] text-[#111111] text-[11px] font-medium leading-tight px-3 py-1.5 rounded-[6px] shadow-lg whitespace-nowrap">
            {errorMessage}
          </div>
        </div>
      )}
    </form>
  );
});

TreeNodeRenameInput.displayName = 'TreeNodeRenameInput';
