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
      {/* Vertical Tool Rail: directly below More Options with 4px (gap-1) spacing */}
      <div
        data-canvas-settings-rail="true"
        className="absolute right-4 top-[36px] z-20 flex flex-col gap-1 items-center pointer-events-auto select-none"
      >
        {/* Settings / Gear Button */}
        <button
          ref={gearBtnRef}
          type="button"
          onClick={handleToggleMenu}
          title="Canvas settings"
          className={`p-1 rounded cursor-pointer ${
            isMenuOpen
              ? 'text-white bg-[#282828]'
              : 'text-[#777] hover:text-[#dcddde] hover:bg-[#222]'
          }`}
        >
          <Settings02Icon size={14} />
        </button>

        {/* Undo Button */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}
          className={`p-1 rounded ${
            canUndo
              ? 'text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer'
              : 'text-[#555] opacity-40 cursor-not-allowed'
          }`}
        >
          <UndoIcon size={14} />
        </button>

        {/* Redo Button */}
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title={canRedo ? 'Redo (Ctrl+Y)' : 'Nothing to redo'}
          className={`p-1 rounded ${
            canRedo
              ? 'text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer'
              : 'text-[#555] opacity-40 cursor-not-allowed'
          }`}
        >
          <RedoIcon size={14} />
        </button>
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
            }}
            className="w-48 bg-[#1e1e1e] border border-[#333333] rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.65),0_2px_6px_rgba(0,0,0,0.3)] p-1 text-xs flex flex-col gap-0.5 select-none"
          >
            {/* Snap to grid */}
            <button
              type="button"
              onClick={() => setCanvasSnapGrid(!canvasSnapGrid)}
              className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-[5px] text-left text-xs text-[#c5c6c8] hover:text-white hover:bg-[#282828] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Grid02Icon size={14} className="text-[#888] shrink-0" />
                <span>Snap to grid</span>
              </div>
              {canvasSnapGrid && <CheckIcon size={14} className="text-[#dcddde] shrink-0" />}
            </button>

            {/* Snap to objects */}
            <button
              type="button"
              onClick={() => setCanvasSnapObjects(!canvasSnapObjects)}
              className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-[5px] text-left text-xs text-[#c5c6c8] hover:text-white hover:bg-[#282828] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SnapToObjectsIcon size={14} className="text-[#888] shrink-0" />
                <span>Snap to objects</span>
              </div>
              {canvasSnapObjects && <CheckIcon size={14} className="text-[#dcddde] shrink-0" />}
            </button>

            {/* Read-only */}
            <button
              type="button"
              onClick={() => setCanvasReadOnly(!canvasReadOnly)}
              className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-[5px] text-left text-xs text-[#c5c6c8] hover:text-white hover:bg-[#282828] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <LockIcon size={14} className="text-[#888] shrink-0" />
                <span>Read-only</span>
              </div>
              {canvasReadOnly && <CheckIcon size={14} className="text-[#dcddde] shrink-0" />}
            </button>
          </div>,
          document.body
        )}
    </>
  );
});
