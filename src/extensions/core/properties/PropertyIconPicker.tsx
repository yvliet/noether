/**
 * @file PropertyIconPicker.tsx
 * @description
 * Property icon picker leveraging the unified Flint IconPicker component.
 * Rendered as an anchored popover next to property key rows.
 *
 * @author Yuliet Li
 * @since 0.1.0
 */

import React from 'react';
import { IconPicker } from '@/components/common/IconPicker';
import { getPropertyIconId } from './propertyIcons';

export interface PropertyIconPickerProps {
  propertyKey: string;
  currentIconId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconId: string) => void;
  onResetToDefault?: () => void;
  align?: 'left' | 'right';
}

export const PropertyIconPicker: React.FC<PropertyIconPickerProps> = ({
  propertyKey,
  currentIconId,
  isOpen,
  onClose,
  onSelectIcon,
  onResetToDefault,
  align = 'left',
}) => {
  const activeIconId = currentIconId || getPropertyIconId(propertyKey);

  return (
    <IconPicker
      isOpen={isOpen}
      onClose={onClose}
      variant="popover"
      align={align}
      title={`Icon for “${propertyKey}”`}
      currentIconId={activeIconId}
      onSelectIcon={onSelectIcon}
      onResetToDefault={onResetToDefault}
      resetLabel="Reset default"
    />
  );
};

export default PropertyIconPicker;
