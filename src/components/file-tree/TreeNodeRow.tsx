import React from 'react';
import { TreeNodeGuideline } from './TreeNodeGuideline';
import { useDragDropStore } from '@/store/dragDropStore';

export interface TreeNodeAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  isDanger?: boolean;
}

export interface TreeNodeRowProps {
  id: string;
  level?: number;
  icon?: React.ReactNode;
  prefix?: React.ReactNode;
  title?: React.ReactNode;
  suffix?: React.ReactNode;
  typeBadge?: string | null;
  isFolder?: boolean;
  isOpen?: boolean;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  isActive?: boolean;
  isHighlighted?: boolean;
  isBeingDragged?: boolean;
  isDropTarget?: boolean;
  isEditing?: boolean;
  isDisabled?: boolean;
  isCut?: boolean;
  isFolderPickerTarget?: boolean;
  folderName?: string;
  renameInput?: React.ReactNode;
  actions?: TreeNodeAction[];
  onSelect?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onAuxClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  dataAttributes?: Record<string, string | undefined>;
  className?: string;
  children?: React.ReactNode;
}

export const TreeNodeRow: React.FC<TreeNodeRowProps> = React.memo(({
  id,
  level = 0,
  icon,
  prefix,
  title,
  suffix,
  typeBadge,
  isFolder = false,
  isOpen = false,
  isSelected = false,
  isMultiSelected = false,
  isActive = false,
  isHighlighted = false,
  isBeingDragged = false,
  isDropTarget = false,
  isEditing = false,
  isDisabled = false,
  isCut = false,
  isFolderPickerTarget = false,
  folderName,
  renameInput,
  actions = [],
  onSelect,
  onDoubleClick,
  onAuxClick,
  onContextMenu,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  dataAttributes = {},
  className = '',
  children,
}) => {
  const isAnyDragging = useDragDropStore((s) => Boolean(s.activeDrag?.isDragging || s.draggedItem));

  return (
    <div
      data-tree-item-id={id}
      data-is-folder={isFolder ? 'true' : 'false'}
      role="treeitem"
      aria-expanded={isFolder ? isOpen : undefined}
      aria-selected={isSelected || isActive}
      aria-level={level + 1}
      tabIndex={isSelected || isActive ? 0 : -1}
      className={`select-none text-xs rounded-md w-full relative ${className}`}
      {...dataAttributes}
    >
      {/* Drop target background highlight box starting at folder indentation without shifting contents */}
      {isDropTarget && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 rounded-md pointer-events-none bg-[var(--noether-bg-sidebar-hover,#282828)] z-0"
          style={{ left: `${level * 16}px` }}
        />
      )}

      {/* Node Row */}
      <div
        id={`noether-tree-item-${id}`}
        data-folder-picker-target={isFolderPickerTarget ? 'true' : undefined}
        data-folder-name={
          isFolderPickerTarget
            ? folderName || (typeof title === 'string' ? title : undefined)
            : undefined
        }
        onPointerDown={isDisabled ? undefined : onPointerDown}
        onClick={isDisabled ? undefined : onSelect}
        onDoubleClick={isDisabled ? undefined : onDoubleClick}
        onAuxClick={isDisabled ? undefined : onAuxClick}
        onContextMenu={isDisabled ? undefined : onContextMenu}
        onPointerEnter={isDisabled ? undefined : onPointerEnter}
        onPointerLeave={isDisabled ? undefined : onPointerLeave}
        onDragOver={isDisabled ? undefined : onDragOver}
        onDragEnter={isDisabled ? undefined : onDragEnter}
        onDragLeave={isDisabled ? undefined : onDragLeave}
        onDrop={isDisabled ? undefined : onDrop}
        style={{
          paddingLeft: `${8 + level * 16}px`,
        }}
        className={`group relative z-10 flex items-center justify-between py-1.5 pr-2.5 my-0 rounded-md w-full overflow-visible ${
          isCut ? 'opacity-50 ' : ''
        }${
          isDisabled
            ? 'cursor-not-allowed opacity-35 text-[var(--noether-text-muted,#888888)] hover:bg-transparent'
            : isFolderPickerTarget
            ? 'cursor-pointer text-[var(--noether-text-primary,#ffffff)] hover:bg-[var(--noether-accent,#eb584d)]/20 hover:border-[var(--noether-accent,#eb584d)]/40 border border-transparent font-medium'
            : isBeingDragged
            ? 'cursor-pointer opacity-40 bg-[var(--noether-bg-main,#1c1c1c)]'
            : isHighlighted
            ? 'cursor-pointer bg-[#82691b] text-white font-normal shadow-sm'
            : isDropTarget
            ? 'cursor-pointer text-[var(--noether-text-primary,#ffffff)] font-normal'
            : isSelected || isMultiSelected || (isActive && !isFolder) || isEditing
            ? 'cursor-pointer bg-[var(--noether-bg-sidebar-active)] text-[var(--noether-text-primary)] font-normal'
            : isAnyDragging
            ? 'cursor-pointer text-[var(--noether-text-muted)] font-normal'
            : 'cursor-pointer text-[var(--noether-text-muted)] hover:bg-[var(--noether-bg-sidebar-hover)] hover:text-[var(--noether-text-primary)] font-normal'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-visible">
          {/* Left Icon (Chevron or Spacer) */}
          {icon ? (
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              {icon}
            </div>
          ) : (
            <div className="w-4 h-4 shrink-0" />
          )}

          {/* Optional Prefix (e.g. Folder/File Icon, Decorator Badges) */}
          {prefix}

          {/* Title or Rename Input */}
          {isEditing && renameInput ? (
            renameInput
          ) : (
            <span
              style={{ overflowClipMargin: '4px' }}
              className="overflow-clip text-ellipsis whitespace-nowrap flex-1 min-w-0 text-[13px] tracking-tight font-normal leading-tight"
            >
              {title}
            </span>
          )}

          {/* Optional Suffix */}
          {suffix}

          {/* Optional Type Badge (e.g. CANVAS, PNG) */}
          {typeBadge && (
            <span className="text-[10px] text-[var(--noether-text-muted,#888888)] opacity-50 uppercase tracking-wider shrink-0 ml-1.5 select-none font-normal">
              {typeBadge}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Children Container with Guideline */}
      {isOpen && children && (
        <div className="relative z-10 flex flex-col w-full">
          <TreeNodeGuideline level={level} />
          {children}
        </div>
      )}
    </div>
  );
});

TreeNodeRow.displayName = 'TreeNodeRow';
