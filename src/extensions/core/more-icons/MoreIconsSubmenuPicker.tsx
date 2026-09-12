/**
 * @file MoreIconsSubmenuPicker.tsx
 * @description
 * Unified flyout icon selector rendered docked beside the slash command palette
 * when typing `/icon`.
 *
 * Uses the exact same unified IconPicker engine and category filters as the file/folder
 * icon picker, but configured with pure icon mode (`showModeSwitcher={false}`) and instant
 * keyboard navigation.
 *
 * @author Yuliet Li
 * @since 1.2.0
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { IconPicker, IconPickerHandle } from '@/components/common/IconPicker';

export interface MoreIconsSubmenuPickerHandle {
  onKeyDown: (e: KeyboardEvent) => boolean;
}

export type IconifySubmenuPickerHandle = MoreIconsSubmenuPickerHandle;

export interface MoreIconsSubmenuPickerProps {
  onSelect: (data: { iconId: string; pack: string; color?: string }) => void;
  onClose: () => void;
}

export type IconifySubmenuPickerProps = MoreIconsSubmenuPickerProps;

export const MoreIconsSubmenuPicker = React.memo(
  forwardRef<MoreIconsSubmenuPickerHandle, MoreIconsSubmenuPickerProps>(
    ({ onSelect, onClose }, ref) => {
      const pickerRef = useRef<IconPickerHandle>(null);

      useImperativeHandle(
        ref,
        () => ({
          onKeyDown: (e: KeyboardEvent) => {
            return pickerRef.current?.onKeyDown(e) || false;
          },
        }),
        []
      );

      return (
        <IconPicker
          ref={pickerRef}
          isOpen={true}
          onClose={onClose}
          variant="submenu"
          showModeSwitcher={false}
          autoFocus={true}
          onSelectIcon={(iconId) => {
            onSelect({ iconId, pack: 'hugeicons' });
            onClose();
          }}
        />
      );
    }
  )
);
MoreIconsSubmenuPicker.displayName = 'MoreIconsSubmenuPicker';

export const IconifySubmenuPicker = MoreIconsSubmenuPicker;
export default MoreIconsSubmenuPicker;
