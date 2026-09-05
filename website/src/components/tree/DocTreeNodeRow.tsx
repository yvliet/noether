import React from 'react';

export interface DocTreeNodeRowProps {
  id: string;
  level?: number;
  title?: React.ReactNode;
  suffix?: React.ReactNode;
  typeBadge?: string | null;
  isFolder?: boolean;
  isOpen?: boolean;
  isActive?: boolean;
  isHighlighted?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onToggle?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Obsidian Docs-style tree row: strictly chevrons for collapsible folders,
 * clean typography without decorative icons, and proportional numerals.
 */
export const DocTreeNodeRow: React.FC<DocTreeNodeRowProps> = React.memo(({
  id,
  level = 0,
  title,
  suffix,
  typeBadge,
  isFolder = false,
  isOpen = false,
  isActive = false,
  isHighlighted = false,
  onSelect,
  onToggle,
  className = '',
  children,
}) => {
  const handleRowClick = (e: React.MouseEvent) => {
    if (isFolder) {
      if (onToggle) {
        onToggle(e);
      } else if (onSelect) {
        onSelect(e);
      }
    } else {
      onSelect?.(e);
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(e);
  };

  return (
    <div
      data-tree-item-id={id}
      data-is-folder={isFolder ? 'true' : 'false'}
      className={`select-none text-sm w-full ${className}`}
    >
      {/* Node Row */}
      <div
        onClick={handleRowClick}
        style={{ paddingLeft: level === 0 ? (isFolder ? 6 : 22) : 0 }}
        className={`group relative flex items-start justify-between py-1 pr-2 my-0 cursor-pointer transition-none bg-transparent ${
          isActive && !isFolder
            ? 'text-[#ea580c] hover:text-[#f97316] font-normal'
            : isHighlighted
            ? 'text-[#fef08a] font-normal'
            : isFolder
            ? 'text-[#cccccc] hover:text-white font-normal'
            : 'text-[#999999] hover:text-white font-normal'
        }`}
      >
        {/* Left vertical rail indicator on children items */}
        {level > 0 && (
          <span
            style={{
              left: level === 1 ? -14.5 : -15,
              width: 1,
            }}
            className={`absolute top-0 bottom-0 pointer-events-none transition-none ${
              isActive && !isFolder
                ? 'bg-[#ea580c] z-10'
                : 'bg-transparent group-hover:bg-white z-10'
            }`}
          />
        )}

        <div className="flex items-start gap-1.5 min-w-0 flex-1">
          {/* Strictly Chevron for Folders */}
          {isFolder && (
            <button
              type="button"
              onClick={handleChevronClick}
              className="w-4 h-4 mt-0.5 flex items-center justify-center shrink-0 text-[#777777] group-hover:text-white cursor-pointer"
              title={isOpen ? 'Collapse' : 'Expand'}
            >
              {isOpen ? (
                <svg
                  viewBox="0 0 24 24"
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="11"
                  height="11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </button>
          )}

          {/* Clean Title (Strictly regular weight, zero bolding, wraps naturally to newline) */}
          <span className="flex-1 min-w-0 text-[13.5px] leading-snug font-normal whitespace-normal break-words">
            {title}
          </span>

          {/* Optional Suffix */}
          {suffix}

          {/* Type Badge */}
          {typeBadge && (
            <span className="text-[10px] text-[#777777] uppercase tracking-wider shrink-0 ml-1 select-none">
              {typeBadge}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Children Container with continuous vertical guideline rail */}
      {isOpen && children && (
        <div
          className={`relative flex flex-col border-l border-[#262626] ${
            level === 0 ? 'ml-[14px] pl-[14px]' : 'ml-[8px] pl-[14px]'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
});

DocTreeNodeRow.displayName = 'DocTreeNodeRow';
