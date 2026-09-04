import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { File01Icon, FileAddIcon } from '@/components/common/Icons';
import { WikiLinkItem } from './extensions/wikilink';

interface WikiLinkPopupProps {
  items: WikiLinkItem[];
  command: (item: WikiLinkItem) => void;
}

export const WikiLinkPopup = React.memo(
  forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, WikiLinkPopupProps>(
    ({ items, command }, ref) => {
      const [selectedIndex, setSelectedIndex] = useState(0);
      const selectedIndexRef = useRef(selectedIndex);
      selectedIndexRef.current = selectedIndex;
      const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

      const displayItems = items.slice(0, 30);

      useEffect(() => {
        setSelectedIndex(0);
        selectedIndexRef.current = 0;
      }, [items]);

      useImperativeHandle(
        ref,
        () => ({
          onKeyDown: ({ event }) => {
            if (!displayItems || displayItems.length === 0) {
              return false;
            }
            if (event.key === 'ArrowUp') {
              const nextIndex = (selectedIndexRef.current + displayItems.length - 1) % displayItems.length;
              selectedIndexRef.current = nextIndex;
              setSelectedIndex(nextIndex);
              itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
              return true;
            }
            if (event.key === 'ArrowDown') {
              const nextIndex = (selectedIndexRef.current + 1) % displayItems.length;
              selectedIndexRef.current = nextIndex;
              setSelectedIndex(nextIndex);
              itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
              return true;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              const currentItem = displayItems[selectedIndexRef.current];
              if (currentItem) {
                command(currentItem);
                return true;
              }
            }
            return false;
          },
        }),
        [displayItems, command]
      );

      if (!displayItems.length) {
        return null;
      }

      return (
        <div
          data-flint-suggestion-popup="true"
          onMouseDown={(e) => e.preventDefault()}
          className="bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg shadow-[var(--flint-shadow-2)] overflow-hidden w-64 max-h-72 overflow-y-auto py-1 z-50 text-xs select-none"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--flint-text-muted)] uppercase tracking-wider">
            Link to Note
          </div>
          {displayItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                onClick={() => command(item)}
                onMouseEnter={() => {
                  selectedIndexRef.current = index;
                  setSelectedIndex(index);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer ${
                  isSelected ? 'bg-[var(--flint-bg-sidebar-active)] text-[var(--flint-text-primary)]' : 'text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)]'
                }`}
              >
                {item.isNew ? (
                  <FileAddIcon size={16} className="text-[var(--flint-accent)] shrink-0" />
                ) : (
                  <File01Icon size={16} className="text-[var(--flint-text-muted)] shrink-0" />
                )}
                <div className="flex-1 min-w-0 truncate">
                  <span className="font-medium text-sm text-[var(--flint-text-primary)]">{item.title}</span>
                  {item.isNew && (
                    <span className="ml-1.5 text-[10px] text-[var(--flint-text-secondary)] bg-[var(--flint-bg-card-hover)] px-1 py-0.5 rounded border border-[var(--flint-border-subtle)]">
                      Create new
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      );
    }
  )
);
WikiLinkPopup.displayName = 'WikiLinkPopup';

