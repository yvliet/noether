import React from 'react';
import { DocNode, TableOfContentItem } from '../../types';

export interface OnThisPageOutlineProps {
  items: TableOfContentItem[];
  activeHeadingId?: string;
  onSelectHeading: (id: string) => void;
  backlinks?: DocNode[];
  onSelectDoc?: (doc: DocNode) => void;
  className?: string;
}

export const OnThisPageOutline: React.FC<OnThisPageOutlineProps> = React.memo(({
  items,
  activeHeadingId,
  onSelectHeading,
  backlinks = [],
  onSelectDoc,
  className = '',
}) => {
  const hasItems = items.length > 0;
  const hasBacklinks = backlinks.length > 0;

  if (!hasItems && !hasBacklinks) return null;

  return (
    <div className={`flex flex-col px-1 pt-1 pb-6 select-none ${className}`}>
      {/* On this page */}
      {hasItems && (
        <div className="flex flex-col">
          <div className="text-[11px] font-semibold text-[#cccccc] uppercase tracking-wider mb-2.5">
            On this page
          </div>

          <nav className="flex flex-col pr-1">
            {items.map((item) => {
              const isActive = activeHeadingId === item.id;
              const indent = item.level > 2 ? (item.level - 2) * 14 + 4 : 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectHeading(item.id)}
                  title={item.text}
                  style={{ paddingLeft: `${indent}px` }}
                  className={`group relative text-left text-[13px] py-0.5 pr-1 whitespace-normal break-words cursor-pointer leading-[1.35] transition-none ${
                    isActive
                      ? 'text-[#ea580c] font-normal'
                      : 'text-[#999999] hover:text-white font-normal'
                  }`}
                >
                  {/* Nested indentation vertical guidelines */}
                  {item.level > 2 &&
                    Array.from({ length: item.level - 2 }).map((_, idx) => (
                      <span
                        key={idx}
                        style={{ left: `${idx * 14 + 3}px` }}
                        className="absolute top-0 bottom-0 w-[1px] bg-[#333333] pointer-events-none"
                      />
                    ))}
                  {item.text}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Links to this page (Backlinks) */}
      {hasBacklinks && (
        <div className={`flex flex-col ${hasItems ? 'mt-6' : ''}`}>
          <div className="text-[11px] font-semibold text-[#cccccc] uppercase tracking-wider mb-2.5">
            Links to this page
          </div>

          <nav className="flex flex-col pr-1">
            {backlinks.map((b) => (
              <a
                key={b.id}
                href={`#docs/${b.slug || b.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectDoc?.(b);
                }}
                title={b.title}
                className="text-left text-[13px] text-[#ea580c] hover:text-[#f97316] underline underline-offset-2 font-normal cursor-pointer py-0.5 pr-1 whitespace-normal break-words leading-[1.35] transition-none"
              >
                {b.title}
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
});

OnThisPageOutline.displayName = 'OnThisPageOutline';
