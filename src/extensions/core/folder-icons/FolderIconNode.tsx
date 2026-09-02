/**
 * @file FolderIconNode.tsx
 * @description
 * Tree node icon component for custom and default folder icons in the Hearth file tree.
 * Rendered next to the expand/collapse chevron arrow, before the folder name.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React from 'react';
import { Folder01Icon, FolderOpenIcon } from '@/components/common/Icons';
import { getFolderIconDef } from './folderIconsCatalog';
import { HugeIconRenderer } from '@/components/common/IconPicker';
import { useFolderIconsStore } from './folderIconsStore';

export interface FolderIconNodeProps {
  folderId: string;
  iconId?: string;
  color?: string;
  isOpen?: boolean;
  showDefaultIcon?: boolean;
}

export const FolderIconNode: React.FC<FolderIconNodeProps> = React.memo(({
  iconId,
  color,
  isOpen = false,
  showDefaultIcon = true,
}) => {
  const iconDef = iconId ? getFolderIconDef(iconId) : null;

  if (iconDef) {
    return (
      <span
        className="w-4 h-4 flex items-center justify-center shrink-0 text-[#888888] group-hover:text-[#dcddde] select-none pointer-events-none"
        style={color ? { color } : undefined}
        title={iconDef.name}
      >
        <HugeIconRenderer iconDef={iconDef.iconDef} size={14} color={color || 'currentColor'} />
      </span>
    );
  }

  if (!showDefaultIcon) {
    return null;
  }

  return (
    <span
      className="w-4 h-4 flex items-center justify-center shrink-0 text-[#888888] group-hover:text-[#dcddde] select-none pointer-events-none"
      title="Folder"
    >
      {isOpen ? <FolderOpenIcon size={14} /> : <Folder01Icon size={14} />}
    </span>
  );
});

FolderIconNode.displayName = 'FolderIconNode';

export interface FolderIconSlotProps {
  folderId: string;
  isOpen?: boolean;
}

/**
 * Reactive slot component subscribed to `useFolderIconsStore`.
 * Guarantees immediate UI updates whenever a folder icon is assigned or removed.
 */
export const FolderIconSlot: React.FC<FolderIconSlotProps> = ({
  folderId,
  isOpen = false,
}) => {
  const entry = useFolderIconsStore((s) => s.icons[folderId]);
  const showDefaultIcons = useFolderIconsStore((s) => s.showDefaultIcons);

  if (!entry && !showDefaultIcons) {
    return null;
  }

  return (
    <FolderIconNode
      folderId={folderId}
      iconId={entry?.iconId}
      color={entry?.color}
      isOpen={isOpen}
      showDefaultIcon={showDefaultIcons}
    />
  );
};
