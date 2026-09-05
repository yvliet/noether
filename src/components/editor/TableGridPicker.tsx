import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';

export interface TableGridPickerProps {
  onSelect: (dimensions: { rows: number; cols: number }) => void;
  onClose?: () => void;
  maxCols?: number;
  maxRows?: number;
  minCols?: number;
  minRows?: number;
  initialCols?: number;
  initialRows?: number;
}

export interface TableGridPickerHandle {
  onKeyDown: (e: KeyboardEvent) => boolean;
}

export const TableGridPicker = forwardRef<TableGridPickerHandle, TableGridPickerProps>(({
  onSelect,
  onClose,
  maxCols = 20,
  maxRows = 20,
  minCols = 5,
  minRows = 5,
  initialCols = 3,
  initialRows = 3,
}, ref) => {
  const [hovered, setHovered] = useState<{ cols: number; rows: number }>({
    cols: initialCols,
    rows: initialRows,
  });

  const hoveredRef = useRef(hovered);
  hoveredRef.current = hovered;

  // Dynamically compute visible columns and rows like Google Docs (starts compact 5x5, extends right & down on hover)
  const visibleCols = Math.min(maxCols, Math.max(minCols, hovered.cols + (hovered.cols < maxCols ? 1 : 0)));
  const visibleRows = Math.min(maxRows, Math.max(minRows, hovered.rows + (hovered.rows < maxRows ? 1 : 0)));

  useImperativeHandle(ref, () => ({
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setHovered((prev) => {
          const next = {
            ...prev,
            cols: Math.min(maxCols, prev.cols + 1),
          };
          hoveredRef.current = next;
          return next;
        });
        return true;
      }
      if (e.key === 'ArrowLeft') {
        if (hoveredRef.current.cols > 1) {
          setHovered((prev) => {
            const next = {
              ...prev,
              cols: Math.max(1, prev.cols - 1),
            };
            hoveredRef.current = next;
            return next;
          });
          return true;
        }
        return false;
      }
      if (e.key === 'ArrowDown') {
        setHovered((prev) => {
          const next = {
            ...prev,
            rows: Math.min(maxRows, prev.rows + 1),
          };
          hoveredRef.current = next;
          return next;
        });
        return true;
      }
      if (e.key === 'ArrowUp') {
        setHovered((prev) => {
          const next = {
            ...prev,
            rows: Math.max(1, prev.rows - 1),
          };
          hoveredRef.current = next;
          return next;
        });
        return true;
      }
      if (e.key === 'Enter') {
        onSelect({ rows: hoveredRef.current.rows, cols: hoveredRef.current.cols });
        return true;
      }
      if (e.key === 'Escape') {
        onClose?.();
        return true;
      }
      return false;
    },
  }));

  const handleCellClick = useCallback(
    (c: number, r: number) => {
      onSelect({ rows: r, cols: c });
    },
    [onSelect]
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ boxShadow: 'var(--flint-shadow-2)' }}
      className="bg-[var(--flint-bg-popover,var(--flint-bg-card,#232323))] border border-[var(--flint-border-base,#292929)] rounded-lg p-2.5 w-fit select-none text-xs flex flex-col gap-2 z-50"
    >

      {/* Visual Grid Selector directly on popover background */}
      <div
        className="grid gap-[3px] w-fit mx-auto"
        style={{
          gridTemplateColumns: `repeat(${visibleCols}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: visibleRows }).map((_, rowIndex) => {
          const r = rowIndex + 1;
          return Array.from({ length: visibleCols }).map((_, colIndex) => {
            const c = colIndex + 1;
            const isHighlighted = c <= hovered.cols && r <= hovered.rows;

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onMouseEnter={() => setHovered({ cols: c, rows: r })}
                onClick={() => handleCellClick(c, r)}
                className={`w-[18px] h-[18px] rounded-[3px] cursor-pointer border ${
                  isHighlighted
                    ? 'bg-white/15 border-white shadow-[0_0_2px_rgba(255,255,255,0.4)]'
                    : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                }`}
              />
            );
          });
        })}
      </div>

      {/* Dimension Label (standard font, centered, no 'Table' suffix) */}
      <div className="text-center text-xs font-medium text-[var(--flint-text-primary,#fff)] pt-0.5">
        {hovered.cols} × {hovered.rows}
      </div>
    </div>
  );
});
TableGridPicker.displayName = 'TableGridPicker';
