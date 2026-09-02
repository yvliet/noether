import React from 'react';
import { TreeNodeGuideline } from './TreeNodeGuideline';

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
  isFolderPickerTarget?: boolean;
  renameInput?: React.ReactNode;
  actions?: TreeNodeAction[];
  onSelect?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
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
  isFolderPickerTarget = false,
  renameInput,
  actions = [],
  onSelect,
  onDoubleClick,
  onContextMenu,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  dataAttributes = {},
  className = '',
  children,
}) => {
  return (
    <div
      data-tree-item-id={id}
      data-is-folder={isFolder ? 'true' : 'false'}
      className={`select-none text-xs w-full rounded-md ${
        isDropTarget ? 'bg-[#202020]' : ''
      } ${className}`}
      {...dataAttributes}
    >
      {/* Node Row */}
      <div
        id={`flint-tree-item-${id}`}
        onPointerDown={isDisabled ? undefined : onPointerDown}
        onClick={isDisabled ? undefined : onSelect}
        onDoubleClick={isDisabled ? undefined : onDoubleClick}
        onContextMenu={isDisabled ? undefined : onContextMenu}
        onPointerEnter={isDisabled ? undefined : onPointerEnter}
        onPointerLeave={isDisabled ? undefined : onPointerLeave}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        className={`group flex items-center justify-between py-1.5 pr-2.5 my-0 rounded-md w-full overflow-visible ${
          isDisabled
            ? 'cursor-not-allowed opacity-35 text-[var(--flint-text-muted,#888888)] hover:bg-transparent'
            : isFolderPickerTarget
            ? 'cursor-pointer text-[var(--flint-text-primary,#ffffff)] hover:bg-[var(--flint-accent,#ea580c)]/20 hover:border-[var(--flint-accent,#ea580c)]/40 border border-transparent font-medium'
            : isBeingDragged
            ? 'cursor-pointer opacity-40 bg-[var(--flint-bg-main,#1c1c1c)]'
            : isHighlighted
            ? 'cursor-pointer bg-[#82691b] text-white font-normal shadow-sm'
            : isDropTarget
            ? 'cursor-pointer bg-transparent text-[var(--flint-text-primary,#ffffff)] font-normal'
            : isSelected || isMultiSelected || (isActive && !isFolder) || isEditing
            ? 'cursor-pointer bg-[var(--flint-bg-sidebar-active,#2a2a2a)] text-[var(--flint-text-primary,#ffffff)] font-normal'
            : 'cursor-pointer text-[var(--flint-text-muted,#888888)] hover:bg-[var(--flint-bg-sidebar-hover,#202020)] hover:text-[var(--flint-text-primary,#dcddde)] font-normal'
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
          {prefix && (
            <div className="flex items-center justify-center shrink-0">
              {prefix}
            </div>
          )}

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

          {/* Optional Type Badge (e.g. CANVAS) */}
          {typeBadge && !isEditing && (
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 tracking-wider shrink-0">
              {typeBadge}
            </span>
          )}
        </div>

        {/* Hover Action Buttons on Right */}
        {!isEditing && !isDisabled && actions.length > 0 && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1.5">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                title={action.title}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick(e);
                }}
                className={`p-0.5 rounded hover:bg-[var(--flint-bg-card-hover,#333333)] ${
                  action.isDanger
                    ? 'text-[var(--flint-text-muted,#777777)] hover:text-rose-400'
                    : 'text-[var(--flint-text-muted,#777777)] hover:text-[var(--flint-text-primary,#ffffff)]'
                } ${action.className || ''}`}
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expanded Children Container with Guideline */}
      {isOpen && children && (
        <div className="relative flex flex-col w-full">
          <TreeNodeGuideline level={level} />
          {children}
        </div>
      )}
    </div>
  );
});

TreeNodeRow.displayName = 'TreeNodeRow';
