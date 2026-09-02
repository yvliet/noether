/**
 * @file FolderIconNode.tsx
 * @description
 * Tree node icon component for custom folder icons.
 * Features an instant hover swap between the custom icon and the chevron arrow,
 * matching Cascade's visual mechanics with zero animation delays or jank.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@/components/common/Icons';
import { getFolderIconDef } from './folderIconsCatalog';
import { HugeIconRenderer } from '@/components/common/IconPicker';
import { useFolderIconsStore } from './folderIconsStore';

export interface FolderIconNodeProps {
  folderId: string;
  iconId: string;
  color?: string;
  isOpen: boolean;
  toggleOpen: () => void;
}

export const FolderIconNode: React.FC<FolderIconNodeProps> = React.memo(({
  iconId,
  color,
  isOpen,
  toggleOpen,
}) => {
  const iconDef = getFolderIconDef(iconId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleOpen();
      }}
      className="w-4 h-4 flex items-center justify-center text-[#777777] group-hover:text-[#dcddde] hover:text-white shrink-0 relative cursor-pointer"
      title={iconDef?.name || 'Folder Icon'}
    >
      <span
        className="flex items-center justify-center group-hover:hidden text-[#888888]"
        style={color ? { color } : undefined}
      >
        {iconDef ? (
          <HugeIconRenderer iconDef={iconDef.iconDef} size={12} color={color || 'currentColor'} />
        ) : null}
      </span>
      <span className="hidden group-hover:flex items-center justify-center text-[#dcddde]">
        {isOpen ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
      </span>
    </button>
  );
});

FolderIconNode.displayName = 'FolderIconNode';

export interface FolderIconSlotProps {
  folderId: string;
  isOpen: boolean;
  toggleOpen: () => void;
  defaultIcon: React.ReactNode;
}

/**
 * Reactive slot component subscribed to `useFolderIconsStore`.
 * Guarantees immediate UI updates whenever a folder icon is assigned or removed.
 */
export const FolderIconSlot: React.FC<FolderIconSlotProps> = ({
  folderId,
  isOpen,
  toggleOpen,
  defaultIcon,
}) => {
  const entry = useFolderIconsStore((s) => s.icons[folderId]);
  if (!entry) return <>{defaultIcon}</>;

  return (
    <FolderIconNode
      folderId={folderId}
      iconId={entry.iconId}
      color={entry.color}
      isOpen={isOpen}
      toggleOpen={toggleOpen}
    />
  );
};
