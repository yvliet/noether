import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings02Icon,
  UndoIcon,
  RedoIcon,
  Grid02Icon,
  LockIcon,
  CheckIcon,
} from '@/components/common/Icons';
import { Tooltip } from '@/components/common/Tooltip';
import { ViewportActionSlotHost } from '@/components/layout/ViewportActionSlotHost';
import { useCanvasSettings } from '../canvasSettings';

export interface CanvasSettingsRailProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const SnapToObjectsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 5h14" />
    <circle cx="4" cy="5" r="1.75" />
    <circle cx="20" cy="5" r="1.75" />
    <rect x="7.5" y="8.5" width="9" height="7" rx="1.5" />
    <path d="M5 19h14" />
    <circle cx="4" cy="19" r="1.75" />
    <circle cx="20" cy="19" r="1.75" />
  </svg>
);

export const CanvasSettingsRail: React.FC<CanvasSettingsRailProps> = React.memo(({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const canvasSnapGrid = useCanvasSettings((s) => s.canvasSnapGrid);
  const canvasSnapObjects = useCanvasSettings((s) => s.canvasSnapObjects);
  const canvasReadOnly = useCanvasSettings((s) => s.canvasReadOnly);

  const setCanvasSnapGrid = useCanvasSettings((s) => s.setCanvasSnapGrid);
  const setCanvasSnapObjects = useCanvasSettings((s) => s.setCanvasSnapObjects);
  const setCanvasReadOnly = useCanvasSettings((s) => s.setCanvasReadOnly);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const gearBtnRef = useRef<HTMLButtonElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  const updateMenuPos = useCallback(() => {
    if (!gearBtnRef.current) return;
    const rect = gearBtnRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, []);

  const handleToggleMenu = useCallback(() => {
    if (!isMenuOpen) {
      updateMenuPos();
    }
    setIsMenuOpen((prev) => !prev);
  }, [isMenuOpen, updateMenuPos]);

  useEffect(() => {
    if (!isMenuOpen) return;

    updateMenuPos();

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuDropdownRef.current &&
        !menuDropdownRef.current.contains(target) &&
        gearBtnRef.current &&
        !gearBtnRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', updateMenuPos);
    window.addEventListener('scroll', updateMenuPos, true);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updateMenuPos);
      window.removeEventListener('scroll', updateMenuPos, true);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen, updateMenuPos]);

  return (
    <>
      {/* Vertical Tool Rail: directly below More Options with 2px (gap-0.5) spacing and matching drop shadow */}
      <div
        data-canvas-settings-rail="true"
        style={{ top: 'calc(var(--noether-header-offset, 0px) + 29px)' }}
        className="absolute right-4 z-20 flex flex-col gap-0.5 items-center pointer-events-auto select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
      >
        {/* Settings / Gear Button */}
        <button
          ref={gearBtnRef}
          type="button"
          onClick={handleToggleMenu}
          title="Canvas settings"
          data-active={isMenuOpen ? 'true' : undefined}
          className={`noether-toolbar-btn ${isMenuOpen ? 'active' : ''}`}
        >
          <Settings02Icon size={14} />
        </button>

        {/* Undo Button */}
        <Tooltip content={canUndo ? 'Undo' : 'Nothing to undo'} shortcut={canUndo ? 'Ctrl+Z' : undefined}>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="noether-toolbar-btn"
          >
            <UndoIcon size={14} />
          </button>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip content={canRedo ? 'Redo' : 'Nothing to redo'} shortcut={canRedo ? 'Ctrl+Y' : undefined}>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="noether-toolbar-btn"
          >
            <RedoIcon size={14} />
          </button>
        </Tooltip>

        {/* Dynamic Extension Actions in Canvas Top-Right Rail */}
        <ViewportActionSlotHost
          corner="top-right"
          direction="vertical"
          context={{ viewType: 'canvas' }}
        />
      </div>

      {/* Settings Popover Dropdown */}
      {isMenuOpen &&
        createPortal(
          <div
            ref={menuDropdownRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              right: `${menuPos.right}px`,
              zIndex: 99999,
              boxShadow: 'var(--noether-shadow-2)',
            }}
            className="w-48 bg-[var(--noether-bg-popover,var(--noether-bg-card))] border border-[var(--noether-border-base)] rounded-lg p-1 text-xs flex flex-col gap-[1px] select-none"
          >
            {/* Snap to grid */}
            <button
              type="button"
              onClick={() => setCanvasSnapGrid(!canvasSnapGrid)}
              className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-[5px] text-left text-xs text-[var(--noether-text-secondary)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Grid02Icon size={14} className="text-[var(--noether-text-muted)] shrink-0" />
                <span>Snap to grid</span>
              </div>
              {canvasSnapGrid && <CheckIcon size={14} className="text-[var(--noether-text-primary)] shrink-0" />}
            </button>

            {/* Snap to objects */}
            <button
              type="button"
              onClick={() => setCanvasSnapObjects(!canvasSnapObjects)}
              className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-[5px] text-left text-xs text-[var(--noether-text-secondary)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SnapToObjectsIcon size={14} className="text-[var(--noether-text-muted)] shrink-0" />
                <span>Snap to objects</span>
              </div>
              {canvasSnapObjects && <CheckIcon size={14} className="text-[var(--noether-text-primary)] shrink-0" />}
            </button>

            {/* Read-only */}
            <button
              type="button"
              onClick={() => setCanvasReadOnly(!canvasReadOnly)}
              className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-[5px] text-left text-xs text-[var(--noether-text-secondary)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <LockIcon size={14} className="text-[var(--noether-text-muted)] shrink-0" />
                <span>Read-only</span>
              </div>
              {canvasReadOnly && <CheckIcon size={14} className="text-[var(--noether-text-primary)] shrink-0" />}
            </button>
          </div>,
          document.body
        )}
    </>
  );
});
