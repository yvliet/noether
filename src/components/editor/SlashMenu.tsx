import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Heading101Icon,
  Heading201Icon,
  Heading301Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  CheckmarkSquare02Icon,
  QuoteDownIcon,
  CodeIcon,
  Divide01Icon,
  Brain02Icon,
  TableIcon,
  ChevronRightIcon,
} from '@/components/common/Icons';
import { SlashItem } from './extensions/slash-command';
import { TableGridPicker, TableGridPickerHandle } from './TableGridPicker';

interface SlashMenuProps {
  items: SlashItem[];
  command: (item: SlashItem, extra?: any) => void;
}

export const SlashMenu = React.memo(
  forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, SlashMenuProps>(
    ({ items, command }, ref) => {
      const [selectedIndex, setSelectedIndex] = useState(0);
      const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
      const selectedIndexRef = useRef(selectedIndex);
      selectedIndexRef.current = selectedIndex;
      const activeSubmenuRef = useRef(activeSubmenu);
      activeSubmenuRef.current = activeSubmenu;

      const gridPickerRef = useRef<TableGridPickerHandle>(null);

      useEffect(() => {
        setSelectedIndex(0);
        setActiveSubmenu(null);
      }, [items]);

      useImperativeHandle(
        ref,
        () => ({
          onKeyDown: ({ event }) => {
            if (!items || items.length === 0) {
              return false;
            }
            if (activeSubmenuRef.current === 'table') {
              if (event.key === 'Escape' || event.key === 'ArrowLeft') {
                setActiveSubmenu(null);
                return true;
              }
              const handled = gridPickerRef.current?.onKeyDown(event);
              if (handled) return true;
            }

            if (event.key === 'ArrowUp') {
              setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
              setActiveSubmenu(null);
              return true;
            }
            if (event.key === 'ArrowDown') {
              setSelectedIndex((prev) => (prev + 1) % items.length);
              setActiveSubmenu(null);
              return true;
            }
            if (event.key === 'ArrowRight') {
              const currentItem = items[selectedIndexRef.current];
              if (currentItem && (currentItem.icon === 'table' || currentItem.title.toLowerCase() === 'table')) {
                setActiveSubmenu('table');
                return true;
              }
            }
            if (event.key === 'Enter') {
              const currentItem = items[selectedIndexRef.current];
              if (currentItem) {
                if (currentItem.icon === 'table' || currentItem.title.toLowerCase() === 'table') {
                  if (activeSubmenuRef.current !== 'table') {
                    setActiveSubmenu('table');
                    return true;
                  }
                } else {
                  command(currentItem);
                  return true;
                }
              }
            }
            return false;
          },
        }),
        [items, command]
      );

      if (!items.length) {
        return (
          <div className="bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg shadow-[var(--flint-shadow-2)] p-2 text-xs text-[var(--flint-text-muted)] w-64">
            No matching block commands
          </div>
        );
      }

      const currentItem = items[selectedIndex];
      const isTableItem = currentItem && (currentItem.icon === 'table' || currentItem.title.toLowerCase() === 'table');

      return (
        <div className="relative flex items-start gap-2">
          <div className="bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg shadow-[var(--flint-shadow-2)] overflow-hidden w-72 max-h-80 overflow-y-auto py-1 z-50 text-xs">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--flint-text-muted)] uppercase tracking-wider">
              Insert Block
            </div>
            {items.map((item, index) => {
              const isSelected = index === selectedIndex;
              const isTable = item.icon === 'table' || item.title.toLowerCase() === 'table';

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    if (isTable) {
                      setActiveSubmenu((prev) => (prev === 'table' ? null : 'table'));
                    } else {
                      command(item);
                    }
                  }}
                  onMouseEnter={() => {
                    setSelectedIndex(index);
                    if (isTable) {
                      setActiveSubmenu('table');
                    } else {
                      setActiveSubmenu(null);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--flint-bg-sidebar-active)] text-[var(--flint-text-primary)]'
                      : 'text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center border ${
                        isSelected
                          ? 'border-[var(--flint-border-strong)] bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-primary)]'
                          : 'border-[var(--flint-border-subtle)] bg-[var(--flint-bg-input)] text-[var(--flint-text-muted)]'
                      }`}
                    >
                      {renderIcon(item.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--flint-text-primary)] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[var(--flint-text-muted)] truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {isTable && (
                    <ChevronRightIcon
                      size={14}
                      className={`shrink-0 ${
                        activeSubmenu === 'table' ? 'text-white' : 'text-[var(--flint-text-muted)]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Table Grid Picker Flyout */}
          {activeSubmenu === 'table' && isTableItem && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-100">
              <TableGridPicker
                ref={gridPickerRef}
                onSelect={(dimensions) => {
                  if (currentItem) {
                    command(currentItem, dimensions);
                  }
                }}
                onClose={() => setActiveSubmenu(null)}
              />
            </div>
          )}
        </div>
      );
    }
  )
);
SlashMenu.displayName = 'SlashMenu';

function renderIcon(name: string) {
  switch (name) {
    case 'h1':
      return <Heading101Icon size={16} />;
    case 'h2':
      return <Heading201Icon size={16} />;
    case 'h3':
      return <Heading301Icon size={16} />;
    case 'bullet':
      return <LeftToRightListBulletIcon size={16} />;
    case 'number':
      return <LeftToRightListNumberIcon size={16} />;
    case 'task':
      return <CheckmarkSquare02Icon size={16} />;
    case 'quote':
      return <QuoteDownIcon size={16} />;
    case 'code':
      return <CodeIcon size={16} />;
    case 'divider':
      return <Divide01Icon size={16} />;
    case 'card':
      return <Brain02Icon size={16} />;
    case 'table':
      return <TableIcon size={16} />;
    default:
      return <QuoteDownIcon size={16} />;
  }
}
