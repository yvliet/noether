import React, { useRef, useCallback } from 'react';
import {
  StickyNote03Icon,
  FileEmpty01Icon,
  FileImageIcon,
} from '@/components/common/Icons';

import { Tooltip } from '@/components/common/Tooltip';

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
  shortcuts: string[];
  icon: React.ReactNode;
}

const DOCK_BUTTONS: DockButtonDef[] = [
  {
    type: 'card',
    title: 'Card',
    shortcuts: ['Click to add', 'Drag to place'],
    icon: <StickyNote03Icon size={26} />,
  },
  {
    type: 'note',
    title: 'Note',
    shortcuts: ['Click to search', 'Drag to place'],
    icon: <FileEmpty01Icon size={26} />,
  },
  {
    type: 'media',
    title: 'Media',
    shortcuts: ['Click to search', 'Drag to place'],
    icon: <FileImageIcon size={26} />,
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
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 select-none pointer-events-auto">
        <div
          style={{ backgroundColor: '#1c1c1c' }}
          className="noether-btn noether-btn-primary !bg-[#1c1c1c] !p-1.5 flex items-center gap-1.5 shadow-xl !cursor-default active:!translate-y-0 active:!filter-none active:!shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_5px_0_rgba(0,0,0,0.32)]"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {DOCK_BUTTONS.map((btn) => (
            <Tooltip
              key={btn.type}
              content={btn.title}
              shortcuts={btn.shortcuts}
              position="top"
            >
              <button
                type="button"
                onPointerDown={(e) => handlePointerDown(btn.type, e)}
                className="p-1.5 text-[#9e9e9e] hover:text-white cursor-grab active:cursor-grabbing select-none transition-none flex items-center justify-center focus:outline-none"
              >
                {btn.icon}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    );
  }
);
