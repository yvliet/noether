import React, { useRef, useCallback } from 'react';
import {
  StickyNote03Icon,
  FileEmpty02Icon,
  FileImageIcon,
} from '@/components/common/Icons';

export type CanvasDockActionType = 'card' | 'note' | 'media';

export interface CanvasBottomDockProps {
  onActionClick: (type: CanvasDockActionType) => void;
  onDragStart: (type: CanvasDockActionType, screenX: number, screenY: number) => void;
  onDragMove: (screenX: number, screenY: number) => void;
  onDragEnd: (type: CanvasDockActionType, screenX: number, screenY: number, didDrag: boolean) => void;
}

interface DockButtonDef {
  type: CanvasDockActionType;
  title: string;
  icon: React.ReactNode;
}

const DOCK_BUTTONS: DockButtonDef[] = [
  {
    type: 'card',
    title: 'Card (Click to add or drag to place)',
    icon: <StickyNote03Icon size={20} />,
  },
  {
    type: 'note',
    title: 'Note (Click to search or drag to place)',
    icon: <FileEmpty02Icon size={20} />,
  },
  {
    type: 'media',
    title: 'Media (Click to search or drag to place)',
    icon: <FileImageIcon size={20} />,
  },
];

export const CanvasBottomDock: React.FC<CanvasBottomDockProps> = React.memo(
  ({ onActionClick, onDragStart, onDragMove, onDragEnd }) => {
    const activeDragRef = useRef<{
      type: CanvasDockActionType;
      startX: number;
      startY: number;
      didDrag: boolean;
    } | null>(null);

    const handlePointerDown = useCallback(
      (type: CanvasDockActionType, e: React.PointerEvent) => {
        // Only primary mouse button
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;

        activeDragRef.current = {
          type,
          startX,
          startY,
          didDrag: false,
        };

        const handleWindowPointerMove = (moveEv: PointerEvent) => {
          const state = activeDragRef.current;
          if (!state) return;

          const dx = moveEv.clientX - state.startX;
          const dy = moveEv.clientY - state.startY;
          const dist = Math.hypot(dx, dy);

          if (!state.didDrag && dist >= 4) {
            state.didDrag = true;
            onDragStart(state.type, moveEv.clientX, moveEv.clientY);
          }

          if (state.didDrag) {
            onDragMove(moveEv.clientX, moveEv.clientY);
          }
        };

        const handleWindowPointerUp = (upEv: PointerEvent) => {
          window.removeEventListener('pointermove', handleWindowPointerMove);
          window.removeEventListener('pointerup', handleWindowPointerUp);
          window.removeEventListener('pointercancel', handleWindowPointerUp);

          const state = activeDragRef.current;
          activeDragRef.current = null;

          if (!state) return;

          if (state.didDrag) {
            onDragEnd(state.type, upEv.clientX, upEv.clientY, true);
          } else {
            onDragEnd(state.type, upEv.clientX, upEv.clientY, false);
            onActionClick(state.type);
          }
        };

        window.addEventListener('pointermove', handleWindowPointerMove);
        window.addEventListener('pointerup', handleWindowPointerUp);
        window.addEventListener('pointercancel', handleWindowPointerUp);
      },
      [onActionClick, onDragStart, onDragMove, onDragEnd]
    );

    return (
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 bg-[#181818]/90 backdrop-blur-sm border border-[#2a2a2a] rounded-lg shadow-xl select-none"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {DOCK_BUTTONS.map((btn) => (
          <button
            key={btn.type}
            type="button"
            title={btn.title}
            onPointerDown={(e) => handlePointerDown(btn.type, e)}
            className="p-2 rounded-md text-[#888888] hover:text-[#e0e0e0] hover:bg-[#252525] active:bg-[#2e2e2e] cursor-grab active:cursor-grabbing select-none transition-none flex items-center justify-center focus:outline-none"
          >
            {btn.icon}
          </button>
        ))}
      </div>
    );
  }
);
