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
  MinusSignIcon,
  Brain02Icon,
  TableIcon,
  Link01Icon,
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
      const submenuRef = useRef<{ onKeyDown: (e: KeyboardEvent) => boolean } | null>(null);
      const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

      useEffect(() => {
        setSelectedIndex(0);
        selectedIndexRef.current = 0;
        setActiveSubmenu(null);
        activeSubmenuRef.current = null;
      }, [items]);

      useImperativeHandle(
        ref,
        () => ({
          onKeyDown: ({ event }) => {
            if (!items || items.length === 0) {
              return false;
            }

            // Submenu active: delegate to active submenu handler
            if (activeSubmenuRef.current) {
              if (activeSubmenuRef.current === 'table') {
                if (event.key === 'Escape' || event.key === 'ArrowLeft') {
                  setActiveSubmenu(null);
                  activeSubmenuRef.current = null;
                  return true;
                }
                const handled = gridPickerRef.current?.onKeyDown(event);
                if (handled) return true;
              } else {
                const handled = submenuRef.current?.onKeyDown(event);
                if (handled) return true;
                if (event.key === 'Escape' || event.key === 'ArrowLeft') {
                  setActiveSubmenu(null);
                  activeSubmenuRef.current = null;
                  return true;
                }
              }
            }

            if (event.key === 'ArrowUp') {
              const nextIndex = (selectedIndexRef.current + items.length - 1) % items.length;
              selectedIndexRef.current = nextIndex;
              setSelectedIndex(nextIndex);
              setActiveSubmenu(null);
              activeSubmenuRef.current = null;
              itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
              return true;
            }

            if (event.key === 'ArrowDown') {
              const nextIndex = (selectedIndexRef.current + 1) % items.length;
              selectedIndexRef.current = nextIndex;
              setSelectedIndex(nextIndex);
              setActiveSubmenu(null);
              activeSubmenuRef.current = null;
              itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
              return true;
            }

            const currentItem = items[selectedIndexRef.current];
            const isTable = currentItem && (currentItem.icon === 'table' || currentItem.title.toLowerCase() === 'table');
            const hasSubmenu = Boolean(currentItem?.submenu) || Boolean(isTable);
            const subId = currentItem?.submenu?.id || (isTable ? 'table' : null);

            if (event.key === 'ArrowRight' && hasSubmenu && subId) {
              setActiveSubmenu(subId);
              activeSubmenuRef.current = subId;
              return true;
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
              if (currentItem) {
                if (hasSubmenu && subId) {
                  if (activeSubmenuRef.current !== subId) {
                    setActiveSubmenu(subId);
                    activeSubmenuRef.current = subId;
                    return true;
                  } else {
                    command(currentItem);
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
          <div
            data-flint-suggestion-popup="true"
            onMouseDown={(e) => e.preventDefault()}
            style={{ boxShadow: 'var(--flint-shadow-2)' }}
            className="bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg p-2 text-xs text-[var(--flint-text-muted)] w-64 select-none"
          >
            No matching block commands
          </div>
        );
      }

      const currentItem = items[selectedIndex];
      const isTableItem = currentItem && (currentItem.icon === 'table' || currentItem.title.toLowerCase() === 'table');

      return (
        <div
          data-flint-suggestion-popup="true"
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
          className="relative flex items-start gap-2"
        >
          <div
            style={{ boxShadow: 'var(--flint-shadow-2)' }}
            className="bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg overflow-hidden w-72 max-h-80 overflow-y-auto py-1 z-50 text-xs select-none"
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--flint-text-muted)] uppercase tracking-wider">
              Insert Block
            </div>
            {items.map((item, index) => {
              const isSelected = index === selectedIndex;
              const isTable = item.icon === 'table' || item.title.toLowerCase() === 'table';
              const hasSub = Boolean(item.submenu) || isTable;
              const itemSubId = item.submenu?.id || (isTable ? 'table' : null);

              return (
                <button
                  key={item.title}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => {
                    if (hasSub && itemSubId) {
                      const nextSub = activeSubmenu === itemSubId ? null : itemSubId;
                      setActiveSubmenu(nextSub);
                      activeSubmenuRef.current = nextSub;
                    } else {
                      command(item);
                    }
                  }}
                  onMouseEnter={() => {
                    selectedIndexRef.current = index;
                    setSelectedIndex(index);
                    if (hasSub && itemSubId) {
                      setActiveSubmenu(itemSubId);
                      activeSubmenuRef.current = itemSubId;
                    } else {
                      setActiveSubmenu(null);
                      activeSubmenuRef.current = null;
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left cursor-pointer ${
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

                  {hasSub && (
                    <ChevronRightIcon
                      size={14}
                      className={`shrink-0 ${
                        activeSubmenu === itemSubId ? 'text-white' : 'text-[var(--flint-text-muted)]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Submenu Flyout (Table Grid, Icon Picker, or Extension Submenu) */}
          {activeSubmenu && currentItem && (
            <div>
              {activeSubmenu === 'table' && isTableItem ? (
                <TableGridPicker
                  ref={gridPickerRef}
                  onSelect={(dimensions) => {
                    if (currentItem) {
                      setActiveSubmenu(null);
                      activeSubmenuRef.current = null;
                      command(currentItem, dimensions);
                    }
                  }}
                  onClose={() => {
                    setActiveSubmenu(null);
                    activeSubmenuRef.current = null;
                  }}
                />
              ) : currentItem.submenu && currentItem.submenu.id === activeSubmenu ? (
                currentItem.submenu.render({
                  ref: submenuRef,
                  onSelect: (extra) => {
                    if (currentItem) {
                      setActiveSubmenu(null);
                      activeSubmenuRef.current = null;
                      command(currentItem, extra);
                    }
                  },
                  onClose: () => {
                    setActiveSubmenu(null);
                    activeSubmenuRef.current = null;
                    const editorEl = document.querySelector('.ProseMirror') as HTMLElement | null;
                    editorEl?.focus();
                  },
                })
              ) : null}
            </div>
          )}
        </div>
      );
    }
  )
);
SlashMenu.displayName = 'SlashMenu';

function renderIcon(name: string | React.ReactNode) {
  if (React.isValidElement(name)) {
    return name;
  }
  if (typeof name !== 'string') {
    return <QuoteDownIcon size={16} />;
  }
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
      return <MinusSignIcon size={16} />;
    case 'card':
      return <Brain02Icon size={16} />;
    case 'table':
      return <TableIcon size={16} />;
    case 'link':
      return <Link01Icon size={16} />;
    default:
      return <QuoteDownIcon size={16} />;
  }
}
