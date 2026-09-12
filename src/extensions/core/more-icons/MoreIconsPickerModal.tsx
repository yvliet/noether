/**
 * @file MoreIconsPickerModal.tsx
 * @description
 * Unified icon selector modal leveraging the Noether IconPicker component.
 * Allows choosing custom icons for both folders and files.
 *
 * @author Yuliet Li
 * @since 1.2.0
 */

import React from 'react';
import { IconPicker } from '@/components/common/IconPicker';
import { Folder01Icon, File01Icon } from '@/components/common/Icons';
import { useMoreIconsStore } from './moreIconsStore';

export const MoreIconsPickerModal: React.FC = () => {
  const pickerTarget = useMoreIconsStore((s) => s.pickerTarget);
  const closePicker = useMoreIconsStore((s) => s.closePicker);
  const setIcon = useMoreIconsStore((s) => s.setIcon);
  const removeIcon = useMoreIconsStore((s) => s.removeIcon);
  const currentIconEntry = useMoreIconsStore((s) =>
    pickerTarget ? s.icons[pickerTarget.id] : undefined
  );
  const emojiStyle = useMoreIconsStore((s) => s.emojiStyle);

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
          <Folder01Icon size={14} className="text-[var(--noether-accent,#eb584d)] shrink-0" />
        ) : (
          <File01Icon size={14} className="text-[var(--noether-accent,#eb584d)] shrink-0" />
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

export const IconifyPickerModal = MoreIconsPickerModal;
export default MoreIconsPickerModal;
