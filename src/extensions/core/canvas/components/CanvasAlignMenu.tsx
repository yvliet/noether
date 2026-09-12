import React, { useRef, useEffect } from 'react';
import {
  AlignLeftIcon,
  AlignHorizontalCenterIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignVerticalCenterIcon,
  AlignBottomIcon,
  AlignHorizontalJustifyStartIcon,
  AlignVerticalJustifyStartIcon,
  Grid2X2Icon,
  DistributeHorizontalCenterIcon,
  DistributeVerticalCenterIcon,
  AlignHorizontalJustifyCenterIcon,
  AlignVerticalJustifyCenterIcon,
} from '@/components/common/Icons';
import type { CanvasAlignmentType } from '../utils/canvasAlignment';

export interface CanvasAlignMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: CanvasAlignmentType) => void;
  align?: 'left' | 'center' | 'right';
}

interface MenuItemDef {
  type: CanvasAlignmentType;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ALIGN_SECTIONS: MenuItemDef[][] = [
  // 1. Horizontal alignments
  [
    { type: 'align-left', label: 'Align left', Icon: AlignLeftIcon },
    { type: 'align-center', label: 'Align center', Icon: AlignHorizontalCenterIcon },
    { type: 'align-right', label: 'Align right', Icon: AlignRightIcon },
  ],
  // 2. Vertical alignments
  [
    { type: 'align-top', label: 'Align top', Icon: AlignTopIcon },
    { type: 'align-middle', label: 'Align middle', Icon: AlignVerticalCenterIcon },
    { type: 'align-bottom', label: 'Align bottom', Icon: AlignBottomIcon },
  ],
  // 3. Arrangement layouts
  [
    { type: 'arrange-row', label: 'Arrange in a row', Icon: AlignHorizontalJustifyStartIcon },
    { type: 'arrange-column', label: 'Arrange in a column', Icon: AlignVerticalJustifyStartIcon },
    { type: 'arrange-grid', label: 'Arrange in a grid', Icon: Grid2X2Icon },
  ],
  // 4. Spacing distributions
  [
    { type: 'distribute-horizontal', label: 'Distribute horizontal spacing', Icon: DistributeHorizontalCenterIcon },
    { type: 'distribute-vertical', label: 'Distribute vertical spacing', Icon: DistributeVerticalCenterIcon },
  ],
  // 5. Centerpoint justifications
  [
    { type: 'justify-horizontal', label: 'Justify horizontally', Icon: AlignHorizontalJustifyCenterIcon },
    { type: 'justify-vertical', label: 'Justify vertically', Icon: AlignVerticalJustifyCenterIcon },
  ],
];

export const CanvasAlignMenu: React.FC<CanvasAlignMenuProps> = React.memo(
  ({ isOpen, onClose, onSelect, align = 'left' }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!isOpen) return;

      const handleOutsideClick = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('mousedown', handleOutsideClick);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const alignmentClasses =
      align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : align === 'right'
        ? 'right-0'
        : 'left-0';

    return (
      <div
        ref={menuRef}
        onPointerDown={(e) => e.stopPropagation()}
        className={`absolute top-full mt-1.5 ${alignmentClasses} w-60 bg-[#1e1e1e] border border-[#383838] rounded-[8px] p-1 shadow-2xl z-50 select-none transition-none`}
      >
        {ALIGN_SECTIONS.map((section, sIdx) => (
          <React.Fragment key={sIdx}>
            {sIdx > 0 && <div className="my-1 border-t border-[#2e2e2e]" />}
            {section.map(({ type, label, Icon }) => (
              <button
                key={type}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(type);
                  onClose();
                }}
                className="flex items-center gap-2.5 px-2.5 py-1.5 w-full text-[13px] text-[#cccccc] hover:text-white hover:bg-[#282828] rounded-[4px] cursor-pointer transition-none text-left"
              >
                <Icon size={15} className="text-[#9e9e9e] shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    );
  }
);
