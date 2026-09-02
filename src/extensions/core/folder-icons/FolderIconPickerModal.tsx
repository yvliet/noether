/**
 * @file FolderIconPickerModal.tsx
 * @description
 * Folder icon selector modal leveraging the unified Flint IconPicker component.
 * Provides consistent category filtering, search indexing, and theme styling.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React from 'react';
import { IconPicker } from '@/components/common/IconPicker';
import { Folder01Icon } from '@/components/common/Icons';
import { useFolderIconsStore } from './folderIconsStore';

export const FolderIconPickerModal: React.FC = () => {
  const pickerFolder = useFolderIconsStore((s) => s.pickerFolder);
  const closePicker = useFolderIconsStore((s) => s.closePicker);
  const setFolderIcon = useFolderIconsStore((s) => s.setFolderIcon);
  const removeFolderIcon = useFolderIconsStore((s) => s.removeFolderIcon);
  const currentIconEntry = useFolderIconsStore((s) =>
    pickerFolder ? s.icons[pickerFolder.id] : undefined
  );

  if (!pickerFolder) return null;

  return (
    <IconPicker
      isOpen={Boolean(pickerFolder)}
      onClose={closePicker}
      variant="modal"
      title={`Icon for “${pickerFolder.title}”`}
      headerIcon={<Folder01Icon size={14} className="text-[var(--flint-accent,#ea580c)] shrink-0" />}
      currentIconId={currentIconEntry?.iconId}
      onSelectIcon={async (iconId) => {
        await setFolderIcon(pickerFolder.id, iconId);
      }}
      onResetToDefault={
        currentIconEntry
          ? async () => {
              await removeFolderIcon(pickerFolder.id);
            }
          : undefined
      }
      resetLabel="Reset default icon"
    />
  );
};

export default FolderIconPickerModal;
