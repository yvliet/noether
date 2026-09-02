import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Cancel01Icon } from '@/components/common/Icons';
import { renderPropertyIcon, getPropertyIconName } from './propertyIcons';
import { PropertyIconPicker } from './PropertyIconPicker';
import { usePropertyTypes } from '@/core/app/AppContext';

export interface PropertyRowProps {
  propertyKey: string;
  value: any;
  autoFocusKey?: boolean;
  autoFocusValue?: boolean;
  isReadOnlyKey?: boolean;
  isReadOnlyValue?: boolean;
  onSaveValue: (key: string, value: any) => Promise<void> | void;
  onRenameKey: (oldKey: string, newKey: string) => Promise<void> | void;
  onDelete: (key: string) => Promise<void> | void;
  onShiftFocusToValue?: (key: string) => void;
  propertyIcons: Record<string, string>;
  setPropertyIcon: (key: string, iconId: string) => void;
  removePropertyIcon: (key: string) => void;
  variant?: 'doc' | 'sidebar';
}

export const PropertyRow: React.FC<PropertyRowProps> = React.memo(({
  propertyKey,
  value,
  autoFocusKey = false,
  autoFocusValue = false,
  isReadOnlyKey = false,
  isReadOnlyValue = false,
  onSaveValue,
  onRenameKey,
  onDelete,
  onShiftFocusToValue,
  propertyIcons,
  setPropertyIcon,
  removePropertyIcon,
  variant = 'doc',
}) => {
  const propertyTypes = usePropertyTypes();
  const matchedCustomType = useMemo(
    () => propertyTypes.find((t) => t.matchKey(propertyKey)),
    [propertyTypes, propertyKey]
  );

  const [isEditingKey, setIsEditingKey] = useState(autoFocusKey && !isReadOnlyKey);
  const [localKey, setLocalKey] = useState(propertyKey);
  const [localVal, setLocalVal] = useState(() => {
    if (matchedCustomType?.formatDisplay) {
      return matchedCustomType.formatDisplay(value);
    }
    return value;
  });
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const keyInputRef = useRef<HTMLInputElement>(null);
  const valInputRef = useRef<HTMLInputElement>(null);
  const saveDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external changes
  useEffect(() => {
    setLocalKey(propertyKey);
  }, [propertyKey]);

  useEffect(() => {
    if (matchedCustomType?.formatDisplay) {
      setLocalVal(matchedCustomType.formatDisplay(value));
    } else {
      setLocalVal(value);
    }
  }, [value, matchedCustomType]);

  // Handle auto-focus on key input when newly created
  useEffect(() => {
    if (autoFocusKey && !isReadOnlyKey) {
      setIsEditingKey(true);
      setTimeout(() => {
        keyInputRef.current?.focus();
        keyInputRef.current?.select();
      }, 30);
    }
  }, [autoFocusKey, isReadOnlyKey]);

  // Handle auto-focus on value input (e.g. after pressing Enter in key input)
  useEffect(() => {
    if (autoFocusValue && !isReadOnlyValue) {
      setTimeout(() => {
        valInputRef.current?.focus();
        if (valInputRef.current?.type === 'text') {
          valInputRef.current?.select();
        }
      }, 40);
    }
  }, [autoFocusValue, isReadOnlyValue]);

  const handleCommitKey = useCallback(async () => {
    if (isReadOnlyKey) return;
    const trimmed = localKey.trim();
    if (!trimmed) {
      // If user emptied the key, delete this property
      setIsEditingKey(false);
      onDelete(propertyKey);
      return;
    }

    const cleanNewKey = trimmed.replace(/\s+/g, '_');
    setLocalKey(cleanNewKey);
    setIsEditingKey(false);

    if (cleanNewKey !== propertyKey) {
      await onRenameKey(propertyKey, cleanNewKey);
    }
  }, [isReadOnlyKey, localKey, propertyKey, onRenameKey, onDelete]);

  const handleDebouncedSaveValue = useCallback((newVal: any) => {
    setLocalVal(newVal);
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }
    saveDebounceTimer.current = setTimeout(() => {
      onSaveValue(propertyKey, newVal);
    }, 350);
  }, [propertyKey, onSaveValue]);

  const handleFlushValue = useCallback(() => {
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
      saveDebounceTimer.current = null;
    }
    onSaveValue(propertyKey, localVal);
  }, [propertyKey, localVal, onSaveValue]);

  const handleFlushCustomType = useCallback(() => {
    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
      saveDebounceTimer.current = null;
    }
    if (!matchedCustomType) return;
    const str = String(localVal ?? '').trim();
    if (matchedCustomType.parseInput) {
      const parsed = matchedCustomType.parseInput(str);
      if (parsed !== null && parsed !== undefined) {
        onSaveValue(propertyKey, parsed);
        setLocalVal(matchedCustomType.formatDisplay ? matchedCustomType.formatDisplay(parsed) : parsed);
        return;
      }
    }
    onSaveValue(propertyKey, str);
  }, [localVal, matchedCustomType, onSaveValue, propertyKey]);

  const lowerKey = propertyKey.toLowerCase();
  const isToggle =
    !matchedCustomType &&
    (lowerKey === 'locked' ||
      lowerKey === 'read_only' ||
      lowerKey === 'lock' ||
      lowerKey === 'readonly' ||
      typeof value === 'boolean' ||
      localVal === 'yes' ||
      localVal === 'no' ||
      localVal === 'Yes' ||
      localVal === 'No');

  const isYes = localVal === true || localVal === 'yes' || localVal === 'Yes';
  const isNumber = !isToggle && !matchedCustomType && (typeof value === 'number' || (typeof localVal === 'number' && !isNaN(localVal)));

  const isBuiltIn = isReadOnlyKey || ['created', 'modified', 'locked', 'read_only', 'lock', 'readonly', 'updated', 'tags', 'aliases'].includes(lowerKey);
  const iconName = useMemo(() => getPropertyIconName(propertyKey, propertyIcons), [propertyKey, propertyIcons]);
  const iconTooltip = useMemo(() => {
    if (isBuiltIn) {
      return iconName;
    }
    return `${iconName}\nChange icon for "${propertyKey}"`;
  }, [isBuiltIn, iconName, propertyKey]);

  const keyTooltip = useMemo(() => {
    if (lowerKey === 'locked' || lowerKey === 'read_only') {
      return 'Lock Status\nPrevents editing in Flint and sets file to OS Read-Only';
    }
    if (lowerKey === 'created') {
      return 'Created Date\nTimestamp when this note was first created';
    }
    if (lowerKey === 'modified') {
      return 'Modified Date\nTimestamp when this note was last saved';
    }
    if (isReadOnlyKey) {
      return propertyKey;
    }
    return `Property: ${propertyKey}\nClick to rename property`;
  }, [propertyKey, lowerKey, isReadOnlyKey]);

  const valueTooltip = useMemo(() => {
    if (lowerKey === 'locked' || lowerKey === 'read_only') {
      return isYes
        ? 'Locked (Read-Only)\nClick to unlock note and permit editing'
        : 'Unlocked (Editable)\nClick to lock note and make read-only';
    }
    if (isToggle) {
      return `Value: ${isYes ? 'Yes' : 'No'}\nClick to switch to ${isYes ? 'No' : 'Yes'}`;
    }
    if (isReadOnlyValue) {
      if (lowerKey === 'created') return `Created Date\n${localVal}`;
      if (lowerKey === 'modified') return `Modified Date\n${localVal}`;
      return String(localVal !== undefined && localVal !== null ? localVal : '');
    }
    return undefined;
  }, [lowerKey, isYes, isToggle, isReadOnlyValue, localVal]);

  return (
    <div className="flex items-center gap-2 min-h-[28px] group transition-colors">
      {/* Property Name + Icon */}
      <div className={`relative flex items-center shrink-0 ${variant === 'sidebar' ? 'w-24 min-w-[80px]' : 'w-24'}`}>
        {isBuiltIn ? (
          <span
            title={iconTooltip}
            className="p-1 -ml-1 text-[var(--flint-text-muted)] cursor-default flex items-center justify-center shrink-0 mr-1 select-none"
          >
            {renderPropertyIcon(propertyKey, propertyIcons, { size: 12, className: 'text-[var(--flint-text-muted)] shrink-0' })}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              title={iconTooltip}
              className="p-1 -ml-1 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer shrink-0 mr-1"
            >
              {renderPropertyIcon(propertyKey, propertyIcons, { size: 12, className: 'text-[var(--flint-text-muted)] shrink-0' })}
            </button>

            <PropertyIconPicker
              propertyKey={propertyKey}
              currentIconId={propertyIcons?.[propertyKey]}
              isOpen={isPickerOpen}
              onClose={() => setIsPickerOpen(false)}
              onSelectIcon={(iconId) => setPropertyIcon(propertyKey, iconId)}
              onResetToDefault={() => removePropertyIcon(propertyKey)}
            />
          </>
        )}

        {isEditingKey && !isReadOnlyKey ? (
          <input
            ref={keyInputRef}
            type="text"
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            onBlur={handleCommitKey}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const trimmed = localKey.trim();
                const cleanNewKey = trimmed ? trimmed.replace(/\s+/g, '_') : propertyKey;
                handleCommitKey();
                onShiftFocusToValue?.(cleanNewKey);
                setTimeout(() => {
                  valInputRef.current?.focus();
                  if (valInputRef.current?.type === 'text') {
                    valInputRef.current?.select();
                  }
                }, 30);
              } else if (e.key === 'Escape') {
                setLocalKey(propertyKey);
                setIsEditingKey(false);
              }
            }}
            placeholder="Property_name"
            className="bg-transparent border-none outline-none text-[11px] font-medium text-[var(--flint-text-primary)] placeholder:text-[var(--flint-text-muted)] w-full p-0 m-0 leading-tight"
          />
        ) : (
          <span
            onClick={() => {
              if (!isReadOnlyKey) {
                setIsEditingKey(true);
                setTimeout(() => {
                  keyInputRef.current?.focus();
                  keyInputRef.current?.select();
                }, 20);
              }
            }}
            title={keyTooltip}
            className={`text-[11px] font-medium text-[var(--flint-text-muted)] ${isReadOnlyKey ? 'cursor-default' : 'hover:text-[var(--flint-text-primary)] cursor-pointer'} truncate flex-1 min-w-0 leading-tight`}
          >
            {localKey || propertyKey}
          </span>
        )}
      </div>

      {/* Property Value Input */}
      <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${variant === 'sidebar' ? 'justify-end' : ''}`}>
        {isReadOnlyValue ? (
          <span
            title={valueTooltip}
            className="text-xs text-[var(--flint-text-secondary)] select-text px-0.5 py-0.5 font-normal truncate"
          >
            {String(localVal !== undefined && localVal !== null ? localVal : '')}
          </span>
        ) : matchedCustomType ? (
          <input
            ref={valInputRef}
            type="text"
            value={localVal !== undefined && localVal !== null ? String(localVal) : ''}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleFlushCustomType}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleFlushCustomType();
                valInputRef.current?.blur();
              }
            }}
            placeholder={matchedCustomType.placeholder || 'Empty'}
            className={`bg-transparent border-none outline-none text-[var(--flint-text-primary)] text-xs placeholder:text-[var(--flint-text-muted)] px-0.5 py-0.5 transition-colors ${
              variant === 'sidebar' ? 'text-right w-full' : 'flex-1'
            }`}
          />
        ) : isToggle ? (
          <button
            type="button"
            onClick={() => {
              const nextVal = isYes ? (localVal === 'Yes' || localVal === 'No' ? 'No' : 'no') : (localVal === 'Yes' || localVal === 'No' ? 'Yes' : 'yes');
              setLocalVal(nextVal);
              onSaveValue(propertyKey, nextVal);
            }}
            title={valueTooltip}
            className="text-xs font-medium text-[var(--flint-text-primary)] hover:text-[var(--flint-accent)] hover:underline cursor-pointer select-none px-0.5 py-0.5 transition-colors"
          >
            {isYes ? 'Yes' : 'No'}
          </button>
        ) : isNumber ? (
          <input
            ref={valInputRef}
            type="number"
            value={localVal !== undefined && localVal !== null ? localVal : ''}
            onChange={(e) => {
              const numVal = e.target.value === '' ? '' : Number(e.target.value);
              handleDebouncedSaveValue(numVal);
            }}
            onBlur={handleFlushValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleFlushValue();
                valInputRef.current?.blur();
              }
            }}
            placeholder="0"
            className={`bg-transparent border-none outline-none text-[var(--flint-text-primary)] text-xs placeholder:text-[var(--flint-text-muted)] px-0.5 py-0.5 transition-colors ${
              variant === 'sidebar' ? 'text-right w-full' : 'flex-1'
            }`}
          />
        ) : (
          <input
            ref={valInputRef}
            type="text"
            value={localVal !== undefined && localVal !== null ? String(localVal) : ''}
            onChange={(e) => handleDebouncedSaveValue(e.target.value)}
            onBlur={handleFlushValue}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleFlushValue();
                valInputRef.current?.blur();
              }
            }}
            placeholder="Empty"
            className={`bg-transparent border-none outline-none text-[var(--flint-text-primary)] text-xs placeholder:text-[var(--flint-text-muted)] px-0.5 py-0.5 transition-colors ${
              variant === 'sidebar' ? 'text-right w-full' : 'flex-1'
            }`}
          />
        )}

        {/* Delete Property Button (hidden for system/readOnly properties) */}
        {!isReadOnlyKey && (
          <button
            type="button"
            onClick={() => onDelete(propertyKey)}
            title={`Delete ${propertyKey}`}
            className="opacity-0 group-hover:opacity-100 text-[var(--flint-text-muted)] hover:text-rose-500 cursor-pointer p-0.5 transition-opacity shrink-0"
          >
            <Cancel01Icon size={11} />
          </button>
        )}
      </div>
    </div>
  );
});

PropertyRow.displayName = 'PropertyRow';
