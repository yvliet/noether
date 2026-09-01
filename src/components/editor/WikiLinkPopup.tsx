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

      useEffect(() => {
        setSelectedIndex(0);
      }, [items]);

      useImperativeHandle(
        ref,
        () => ({
          onKeyDown: ({ event }) => {
            if (event.key === 'ArrowUp') {
              setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
              return true;
            }
            if (event.key === 'ArrowDown') {
              setSelectedIndex((prev) => (prev + 1) % items.length);
              return true;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              if (items[selectedIndexRef.current]) {
                command(items[selectedIndexRef.current]);
                return true;
              }
            }
            return false;
          },
        }),
        [items, command]
      );

      if (!items.length) {
        return null;
      }

      return (
        <div className="bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg shadow-[var(--flint-shadow-2)] overflow-hidden w-64 max-h-72 overflow-y-auto py-1 z-50 text-xs">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--flint-text-muted)] uppercase tracking-wider">
            Link to Note
          </div>
          {items.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => command(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${
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

