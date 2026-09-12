import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { getAllCalloutDefinitions, CalloutTypeDefinition } from '@/lib/editor/callouts';

export interface CalloutPickerProps {
  onSelect: (calloutType: CalloutTypeDefinition) => void;
  onClose?: () => void;
}

export interface CalloutPickerHandle {
  onKeyDown: (e: KeyboardEvent) => boolean;
}

export const CalloutPicker = forwardRef<CalloutPickerHandle, CalloutPickerProps>(
  ({ onSelect, onClose }, ref) => {
    const definitions = getAllCalloutDefinitions();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedIndexRef = useRef(selectedIndex);
    selectedIndexRef.current = selectedIndex;

    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
      setSelectedIndex(0);
      selectedIndexRef.current = 0;
    }, []);

    useImperativeHandle(ref, () => ({
      onKeyDown: (e: KeyboardEvent) => {
        if (!definitions.length) return false;

        if (e.key === 'ArrowUp') {
          const nextIndex = (selectedIndexRef.current + definitions.length - 1) % definitions.length;
          selectedIndexRef.current = nextIndex;
          setSelectedIndex(nextIndex);
          itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return true;
        }

        if (e.key === 'ArrowDown') {
          const nextIndex = (selectedIndexRef.current + 1) % definitions.length;
          selectedIndexRef.current = nextIndex;
          setSelectedIndex(nextIndex);
          itemRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return true;
        }

        if (e.key === 'Enter' || e.key === 'Tab') {
          const chosen = definitions[selectedIndexRef.current];
          if (chosen) {
            onSelect(chosen);
            return true;
          }
        }

        if (e.key === 'Escape') {
          onClose?.();
          return true;
        }

        return false;
      },
    }));

    return (
      <div
        data-noether-suggestion-popup="true"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: 'var(--noether-shadow-2)' }}
        className="pointer-events-auto bg-[var(--noether-bg-popover,var(--noether-bg-card,#232323))] border border-[var(--noether-border-base,#292929)] rounded-lg overflow-hidden w-64 max-h-80 overflow-y-auto py-1 z-50 text-xs select-none"
      >
        <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--noether-text-muted)] uppercase tracking-wider">
          Callout Types
        </div>
        {definitions.map((def, idx) => {
          const isSelected = idx === selectedIndex;
          const IconComp = def.iconComponent;

          return (
            <button
              key={def.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              type="button"
              onClick={() => onSelect(def)}
              onMouseEnter={() => {
                selectedIndexRef.current = idx;
                setSelectedIndex(idx);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left cursor-pointer transition-none ${
                isSelected
                  ? 'bg-[var(--noether-bg-sidebar-active)] text-[var(--noether-text-primary)]'
                  : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-bg-card-hover)]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center border shrink-0 ${
                  isSelected
                    ? 'border-[var(--noether-border-strong)] bg-[var(--noether-bg-card-hover)]'
                    : 'border-[var(--noether-border-subtle)] bg-[var(--noether-bg-input)]'
                }`}
                style={{ color: def.accentHex }}
              >
                <IconComp size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-xs text-[var(--noether-text-primary)] truncate">
                  {def.title}
                </div>
                <div className="text-[10.5px] text-[var(--noether-text-muted)] truncate">
                  {def.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);
CalloutPicker.displayName = 'CalloutPicker';
