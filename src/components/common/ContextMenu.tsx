import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useContextMenuStore, type ContextMenuItem, type ContextMenuItemType } from '@/store/contextMenuStore';
import { ChevronRightIcon, CheckIcon } from '@/components/common/Icons';
import { useFlintApp } from '@/core/app/AppContext';
import { ContextMenuItemDefinition, ContextMenuScope } from '@/core/extensions/types';

export type { ContextMenuItem, ContextMenuItemType };

interface SubmenuPosition {
  top: number;
  left: number;
  maxHeight?: number;
}

interface MenuItemProps {
  item: ContextMenuItem;
  itemId: string;
  onClose: () => void;
  isFocused?: boolean;
  isSubmenuOpen: boolean;
  onRequestOpenSubmenu: () => void;
  onRequestCloseSubmenu: () => void;
  onHoverChange: (hasSubmenu: boolean) => void;
}

const MenuItemRow: React.FC<MenuItemProps> = React.memo(({
  item,
  itemId,
  onClose,
  isFocused,
  isSubmenuOpen,
  onRequestOpenSubmenu,
  onRequestCloseSubmenu,
  onHoverChange,
}) => {
  const [submenuPos, setSubmenuPos] = useState<SubmenuPosition | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const hasSubmenu = Boolean((item.submenu && item.submenu.length > 0) || item.customSubmenu);

  const calculateSubmenuPosition = useCallback(() => {
    if (!rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const estimatedWidth = item.customSubmenu ? 230 : 170;
    const estimatedHeight = item.customSubmenu ? 280 : Math.min(320, (item.submenu?.length || 1) * 30 + 8);

    // Horizontal placement: prefer right, flip to left if clipping
    let left = rect.right + 2;
    if (left + estimatedWidth > viewportWidth - 8) {
      left = Math.max(8, rect.left - estimatedWidth - 2);
    }

    // Vertical placement: align with item top, clamp within screen
    let top = rect.top - 4;
    if (top + estimatedHeight > viewportHeight - 8) {
      top = Math.max(8, viewportHeight - estimatedHeight - 8);
    }
    if (top < 8) top = 8;
    if (left < 8) left = 8;

    setSubmenuPos({
      top,
      left,
      maxHeight: Math.max(120, viewportHeight - top - 8),
    });
  }, [item.submenu, item.customSubmenu]);

  // Recalculate position whenever submenu opens
  useEffect(() => {
    if (isSubmenuOpen) {
      calculateSubmenuPosition();
    }
  }, [isSubmenuOpen, calculateSubmenuPosition]);

  if (item.type === 'separator') {
    return <div className="border-t border-[var(--flint-border-base)] my-1 mx-1" />;
  }

  if (item.type === 'header') {
    return (
      <div className="px-2.5 py-1 text-[10px] font-semibold text-[var(--flint-text-muted,#777777)] uppercase tracking-wider select-none">
        {item.title}
      </div>
    );
  }

  if (item.customRender) {
    return (
      <div ref={rowRef} className="relative w-full">
        {item.customRender({ onClose })}
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.disabled) return;

    if (item.onClick) {
      item.onClick();
      onClose();
      return;
    }

    if (hasSubmenu) {
      if (isSubmenuOpen) {
        onRequestCloseSubmenu();
      } else {
        calculateSubmenuPosition();
        onRequestOpenSubmenu();
      }
      return;
    }

    onClose();
  };

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => onHoverChange(hasSubmenu)}
      onMouseDown={(e) => e.preventDefault()}
      className="relative w-full"
    >
      <div
        role="menuitem"
        tabIndex={0}
        onClick={handleClick}
        onMouseDown={(e) => e.preventDefault()}
        className={`w-full px-2.5 py-1.5 rounded-[5px] text-left text-xs flex items-center justify-between gap-3 cursor-pointer group outline-none select-none ${
          item.disabled
            ? 'opacity-40 cursor-not-allowed text-[var(--flint-text-muted,#777)]'
            : item.isDanger
            ? 'text-[#eb5757] hover:bg-rose-950/20 hover:text-[#ff6b6b]'
            : isFocused || isSubmenuOpen
            ? 'bg-[var(--flint-bg-card-hover,#2c2c2c)] text-[var(--flint-text-primary)]'
            : 'text-[var(--flint-text-primary,#dcddde)] hover:bg-[var(--flint-bg-card-hover,#2c2c2c)] hover:text-[var(--flint-text-primary)]'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          <span
            className={`w-3.5 h-3.5 shrink-0 flex items-center justify-center ${
              item.isDanger
                ? 'text-[#eb5757] group-hover:text-[#ff6b6b]'
                : 'text-[var(--flint-text-muted,#8b8e95)] group-hover:text-[var(--flint-text-primary)]'
            }`}
          >
            {item.icon ? (
              React.isValidElement(item.icon)
                ? React.cloneElement(item.icon as React.ReactElement<any>, {
                    size: 14,
                    className: 'shrink-0',
                  })
                : item.icon
            ) : null}
          </span>
          <span className="truncate flex-1">{item.title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.shortcut && (
            <span className="text-[11px] text-[var(--flint-text-muted,#777777)] group-hover:text-[var(--flint-text-secondary,#bbbbbb)]">
              {item.shortcut}
            </span>
          )}
          {item.checked && (
            <CheckIcon size={13} className="text-[var(--flint-text-primary)] shrink-0" />
          )}
          {hasSubmenu && (
            <ChevronRightIcon size={12} className="text-[var(--flint-text-muted,#777)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
          )}
        </div>
      </div>

      {/* Nested Submenu Portal or Absolute Container */}
      {hasSubmenu && isSubmenuOpen && submenuPos && (
        <div
          data-flint-popover="true"
          style={{
            position: 'fixed',
            top: `${submenuPos.top}px`,
            left: `${submenuPos.left}px`,
            maxHeight: submenuPos.maxHeight ? `${submenuPos.maxHeight}px` : undefined,
            zIndex: 100000,
            boxShadow: 'var(--flint-shadow-2)',
          }}
          className={
            item.customSubmenu
              ? 'w-max bg-transparent select-none'
              : 'w-max min-w-[160px] max-w-[280px] bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg p-1 text-xs flex flex-col gap-[1px] overflow-y-auto overflow-x-hidden select-none'
          }
          onClick={(e) => e.stopPropagation()}
        >
          {item.customSubmenu ? (
            typeof item.customSubmenu === 'function' ? (
              item.customSubmenu({ onClose })
            ) : (
              item.customSubmenu
            )
          ) : item.submenu ? (
            <MenuList items={item.submenu} onClose={onClose} />
          ) : null}
        </div>
      )}
    </div>
  );
});

interface MenuListProps {
  items: ContextMenuItem[];
  onClose: () => void;
  focusedIndex?: number;
  actionableItems?: ContextMenuItem[];
}

const MenuList: React.FC<MenuListProps> = React.memo(({
  items,
  onClose,
  focusedIndex = -1,
  actionableItems,
}) => {
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearHoverTimeout();
  }, []);

  const handleHoverChange = useCallback((itemId: string, hasSubmenu: boolean) => {
    clearHoverTimeout();
    if (hasSubmenu) {
      hoverTimeoutRef.current = setTimeout(() => {
        setActiveSubmenuId(itemId);
      }, 40);
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setActiveSubmenuId(null);
      }, 80);
    }
  }, []);

  return (
    <>
      {items.map((item, idx) => {
        const itemId = item.id || `${item.title || 'item'}-${idx}`;
        const actionIdx = actionableItems ? actionableItems.indexOf(item) : -1;
        const isFocused = actionIdx !== -1 && actionIdx === focusedIndex;
        return (
          <MenuItemRow
            key={itemId}
            item={item}
            itemId={itemId}
            onClose={onClose}
            isFocused={isFocused}
            isSubmenuOpen={activeSubmenuId === itemId}
            onRequestOpenSubmenu={() => {
              clearHoverTimeout();
              setActiveSubmenuId(itemId);
            }}
            onRequestCloseSubmenu={() => {
              clearHoverTimeout();
              setActiveSubmenuId(null);
            }}
            onHoverChange={(hasSubmenu) => handleHoverChange(itemId, hasSubmenu)}
          />
        );
      })}
    </>
  );
});

export const ContextMenuRenderer: React.FC = React.memo(() => {
  const isOpen = useContextMenuStore((s) => s.isOpen);
  const position = useContextMenuStore((s) => s.position);
  const items = useContextMenuStore((s) => s.items);
  const closeContextMenu = useContextMenuStore((s) => s.closeContextMenu);

  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const actionableItems = useMemo(
    () => items.filter((it) => it.type !== 'separator' && it.type !== 'header' && !it.disabled),
    [items]
  );

  // Synchronously compute initial position for the first frame
  const initialPos = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const estimatedWidth = 190;
    const estimatedHeight = Math.min(480, items.length * 30 + 8);

    let left = position.x;
    let top = position.y;

    if (left + estimatedWidth > vw - 8) {
      left = Math.max(8, vw - estimatedWidth - 8);
    }
    if (top + estimatedHeight > vh - 8) {
      top = Math.max(8, vh - estimatedHeight - 8);
    }
    if (left < 8) left = 8;
    if (top < 8) top = 8;

    return { top, left };
  }, [position.x, position.y, items.length]);

  // Adjust accurately using actual measured DOM dimensions before paint with zero flicker
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const el = menuRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth || 190;
    const h = el.offsetHeight || (items.length * 30 + 8);

    let left = position.x;
    let top = position.y;

    if (left + w > vw - 8) {
      left = Math.max(8, vw - w - 8);
    }
    if (top + h > vh - 8) {
      top = Math.max(8, vh - h - 8);
    }
    if (left < 8) left = 8;
    if (top < 8) top = 8;

    const maxHeight = Math.max(120, vh - top - 8);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.maxHeight = `${maxHeight}px`;
  }, [isOpen, position.x, position.y, items]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [position.x, position.y, items]);

  useEffect(() => {
    if (!isOpen) return;

    // Handle left click outside to dismiss
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.closest &&
        (target.closest('[data-flint-colorpicker="true"]') ||
          target.closest('[data-flint-popover="true"]'))
      ) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        // Left-click outside immediately closes
        if (e.button === 0) {
          closeContextMenu();
        }
      }
    };

    // If right-clicked on an unhandled element outside the menu, dismiss and prevent default context menu
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        (menuRef.current && menuRef.current.contains(target)) ||
        (target &&
          target.closest &&
          (target.closest('[data-flint-colorpicker="true"]') ||
            target.closest('[data-flint-popover="true"]')))
      ) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      closeContextMenu();
    };

    const handleScrollOrResize = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        (menuRef.current && menuRef.current.contains(target)) ||
        (target &&
          target.closest &&
          (target.closest('[data-flint-colorpicker="true"]') ||
            target.closest('[data-flint-popover="true"]')))
      ) {
        return;
      }
      closeContextMenu();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeContextMenu();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % (actionableItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + (actionableItems.length || 1)) % (actionableItems.length || 1));
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && actionableItems[focusedIndex]) {
          e.preventDefault();
          const target = actionableItems[focusedIndex];
          if (target.onClick) {
            target.onClick();
          }
          closeContextMenu();
        }
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('contextmenu', handleGlobalContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeContextMenu, actionableItems, focusedIndex]);

  if (!isOpen || items.length === 0) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${initialPos.top}px`,
        left: `${initialPos.left}px`,
        zIndex: 99999,
        boxShadow: 'var(--flint-shadow-2)',
      }}
      className="w-max min-w-[180px] max-w-[320px] max-h-[85vh] bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg p-1 text-xs flex flex-col gap-[1px] overflow-y-auto overflow-x-hidden select-none"
    >
      <MenuList
        items={items}
        onClose={closeContextMenu}
        focusedIndex={focusedIndex}
        actionableItems={actionableItems}
      />
    </div>,
    document.body
  );
});

export interface ShowContextMenuOptions {
  scope?: ContextMenuScope;
  data?: any;
  pluginPosition?: 'before-danger' | 'after-base' | 'top';
}

export function useAppContextMenu() {
  const app = useFlintApp();
  const openContextMenu = useContextMenuStore((s) => s.openContextMenu);
  const closeContextMenu = useContextMenuStore((s) => s.closeContextMenu);

  const showContextMenu = useCallback(
    (
      eventOrCoords: React.MouseEvent | MouseEvent | { x: number; y: number },
      baseItems: ContextMenuItem[],
      options?: ShowContextMenuOptions
    ) => {
      if ('preventDefault' in eventOrCoords && typeof eventOrCoords.preventDefault === 'function') {
        eventOrCoords.preventDefault();
      }
      if ('stopPropagation' in eventOrCoords && typeof eventOrCoords.stopPropagation === 'function') {
        eventOrCoords.stopPropagation();
      }
      const { scope, data, pluginPosition = 'before-danger' } = options || {};
      let pluginItems: ContextMenuItem[] = [];

      if (scope && app?.contextMenu) {
        const rawPluginDefs = app.contextMenu.getItemsForScope(scope, data, app);
        pluginItems = rawPluginDefs.map((def): ContextMenuItem => {
          const isDisabled =
            typeof def.disabled === 'function' ? def.disabled(app, data) : Boolean(def.disabled);
          const isChecked =
            typeof def.checked === 'function' ? def.checked(app, data) : Boolean(def.checked);

          const convertSubmenu = (subDefs?: ContextMenuItemDefinition[]): ContextMenuItem[] | undefined => {
            if (!subDefs) return undefined;
            return subDefs.map((sub) => ({
              id: sub.id,
              type: sub.type,
              title: sub.title,
              icon: sub.icon,
              shortcut: sub.shortcut,
              isDanger: sub.isDanger,
              disabled: typeof sub.disabled === 'function' ? sub.disabled(app, data) : Boolean(sub.disabled),
              checked: typeof sub.checked === 'function' ? sub.checked(app, data) : Boolean(sub.checked),
              onClick: sub.onClick ? () => sub.onClick?.(app, data) : undefined,
              submenu: convertSubmenu(sub.submenu),
              customSubmenu: sub.customSubmenu
                ? ({ onClose }) =>
                    typeof sub.customSubmenu === 'function'
                      ? (sub.customSubmenu as any)({ app, data, onClose })
                      : sub.customSubmenu
                : undefined,
            }));
          };

          return {
            id: def.id,
            type: def.type,
            title: def.title,
            icon: def.icon,
            shortcut: def.shortcut,
            isDanger: def.isDanger,
            disabled: isDisabled,
            checked: isChecked,
            onClick: def.onClick ? () => def.onClick?.(app, data) : undefined,
            submenu: convertSubmenu(def.submenu),
            customSubmenu: def.customSubmenu
              ? ({ onClose }) =>
                  typeof def.customSubmenu === 'function'
                    ? (def.customSubmenu as any)({ app, data, onClose })
                    : def.customSubmenu
              : undefined,
          };
        });
      }

      let combined: ContextMenuItem[] = [];
      if (pluginItems.length > 0) {
        if (pluginPosition === 'before-danger') {
          const dangerIdx = baseItems.findIndex((it) => it.isDanger);
          if (dangerIdx !== -1) {
            const before = baseItems.slice(0, dangerIdx);
            const after = baseItems.slice(dangerIdx);
            const needsLeadingSep = before.length > 0 && before[before.length - 1].type !== 'separator';
            const needsTrailingSep = after.length > 0 && after[0].type !== 'separator';

            combined = [
              ...before,
              ...(needsLeadingSep ? [{ type: 'separator' as const }] : []),
              ...pluginItems,
              ...(needsTrailingSep ? [{ type: 'separator' as const }] : []),
              ...after,
            ];
          } else {
            const needsSep = baseItems.length > 0 && baseItems[baseItems.length - 1].type !== 'separator';
            combined = [
              ...baseItems,
              ...(needsSep ? [{ type: 'separator' as const }] : []),
              ...pluginItems,
            ];
          }
        } else if (pluginPosition === 'top') {
          combined = [
            ...pluginItems,
            { type: 'separator' as const },
            ...baseItems,
          ];
        } else {
          const needsSep = baseItems.length > 0 && baseItems[baseItems.length - 1].type !== 'separator';
          combined = [
            ...baseItems,
            ...(needsSep ? [{ type: 'separator' as const }] : []),
            ...pluginItems,
          ];
        }
      } else {
        combined = baseItems;
      }

      openContextMenu(eventOrCoords, combined, { scope, data });
    },
    [app, openContextMenu]
  );

  return { showContextMenu, closeContextMenu };
}
