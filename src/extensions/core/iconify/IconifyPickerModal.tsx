/**
 * @file IconifyPickerModal.tsx
 * @description
 * Unified icon selector modal leveraging the flint IconPicker component.
 * Allows choosing custom icons for both folders and files.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React from 'react';
import { IconPicker } from '@/components/common/IconPicker';
import { Folder01Icon, File01Icon } from '@/components/common/Icons';
import { useIconifyStore } from './iconifyStore';

export const IconifyPickerModal: React.FC = () => {
  const pickerTarget = useIconifyStore((s) => s.pickerTarget);
  const closePicker = useIconifyStore((s) => s.closePicker);
  const setIcon = useIconifyStore((s) => s.setIcon);
  const removeIcon = useIconifyStore((s) => s.removeIcon);
  const currentIconEntry = useIconifyStore((s) =>
    pickerTarget ? s.icons[pickerTarget.id] : undefined
  );
  const emojiStyle = useIconifyStore((s) => s.emojiStyle);

  if (!pickerTarget) return null;

  const isFolder = pickerTarget.isFolder;

  return (
    <IconPicker
      isOpen={Boolean(pickerTarget)}
      onClose={closePicker}
      variant="modal"
      emojiStyle={emojiStyle}
      title={`Icon for “${pickerTarget.title}”`}
      headerIcon={
        isFolder ? (
          <Folder01Icon size={14} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
        ) : (
          <File01Icon size={14} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
        )
      }
      currentIconId={currentIconEntry?.iconId}
      onSelectIcon={async (iconId) => {
        await setIcon(pickerTarget.id, iconId, undefined, isFolder ? 'folder' : 'file');
      }}
      onResetToDefault={
        currentIconEntry
          ? async () => {
              await removeIcon(pickerTarget.id);
            }
          : undefined
      }
      resetLabel="Reset default icon"
    />
  );
};

export default IconifyPickerModal;
