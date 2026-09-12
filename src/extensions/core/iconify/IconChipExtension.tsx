/**
 * @file IconChipExtension.tsx
 * @description
 * TipTap rich text inline atom node extension for in-document icons in Noether.
 * Visually renders as an inline icon in WYSIWYG mode, backed by lossless
 * :<pack>:<iconId>: shortcode serialization in raw Markdown.
 *
 * Provides instant zero-animation popover for changing icons and color customization.
 *
 * @author Yuliet Li
 * @since 1.1.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Node, mergeAttributes, InputRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { renderUnifiedIcon } from '@/components/common/IconPicker';
import { useIconifyStore } from './iconifyStore';
import {
  SparklesIcon,
  Delete02Icon,
  Cancel01Icon,
} from '@/components/common/Icons';

const COLOR_PRESETS = [
  { label: 'Default', value: undefined, bg: 'bg-[#555]' },
  { label: 'Coral', value: '#eb584d', bg: 'bg-[#eb584d]' },
  { label: 'Amber', value: '#f59e0b', bg: 'bg-[#f59e0b]' },
  { label: 'Emerald', value: '#10b981', bg: 'bg-[#10b981]' },
  { label: 'Blue', value: '#3b82f6', bg: 'bg-[#3b82f6]' },
  { label: 'Purple', value: '#8b5cf6', bg: 'bg-[#8b5cf6]' },
  { label: 'Rose', value: '#f43f5e', bg: 'bg-[#f43f5e]' },
  { label: 'Neutral', value: '#9ca3af', bg: 'bg-[#9ca3af]' },
];

export const IconChipView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const { iconId, pack = 'hugeicons', color } = node.attrs;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fullIdentifier = pack ? `${pack}:${iconId}` : iconId;

  // Close popover when clicking outside
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleDocumentClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as unknown as globalThis.Node)) {
        setIsPopoverOpen(false);
        setIsPickerActive(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPopoverOpen(false);
        setIsPickerActive(false);
      }
    };

    window.addEventListener('mousedown', handleDocumentClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleDocumentClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPopoverOpen]);

  const handleChipClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPopoverOpen((prev) => !prev);
  };

  const handleSelectColor = (newColor?: string) => {
    updateAttributes({ color: newColor || null });
  };

  return (
    <NodeViewWrapper
      as="span"
      data-icon-chip="true"
      data-selected={selected ? 'true' : undefined}
      className={`noether-icon-chip inline-flex items-center justify-center relative select-none cursor-pointer ${
        selected ? 'bg-[var(--noether-selection-bg,#4a4e57)]' : ''
      }`}
      style={{
        height: '1lh',
        verticalAlign: 'top',
        lineHeight: 'inherit',
      }}
      onClick={handleChipClick}
      title={`${fullIdentifier} (click to customize)`}
    >
      <span
        className="inline-flex items-center justify-center leading-none"
        style={{
          color: color || (selected ? 'var(--noether-selection-text,#ffffff)' : 'inherit'),
        }}
      >
        {renderUnifiedIcon(fullIdentifier, {
          size: '1.15em',
          color: color || (selected ? 'var(--noether-selection-text,#ffffff)' : 'currentColor'),
          className: 'shrink-0',
        })}
      </span>

      {/* Instant Action Popover (Zero Micro-Interaction Animation) */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 bottom-full mb-1 z-[100] w-56 bg-[#1e1e1e] border border-[#2e2e2e] rounded-lg shadow-xl p-2 text-xs select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#282828]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0 text-[var(--noether-accent,#eb584d)]">
                {renderUnifiedIcon(fullIdentifier, { size: 13, color: color || undefined })}
              </span>
              <span className="font-mono text-[11px] text-[#ccc] truncate">
                {fullIdentifier}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPopoverOpen(false)}
              className="p-0.5 text-[#777] hover:text-white rounded hover:bg-[#282828] cursor-pointer"
            >
              <Cancel01Icon size={12} />
            </button>
          </div>

          {/* Color Palettes */}
          <div className="mb-2">
            <div className="text-[10px] uppercase font-semibold text-[#777] mb-1">Color</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_PRESETS.map((preset) => {
                const isCurrent =
                  (!color && !preset.value) || color === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    title={preset.label}
                    onClick={() => handleSelectColor(preset.value)}
                    className={`w-4 h-4 rounded-full ${preset.bg} cursor-pointer relative flex items-center justify-center border ${
                      isCurrent ? 'border-white scale-110' : 'border-transparent'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-[#282828]">
            <button
              type="button"
              onClick={() => {
                deleteNode();
                setIsPopoverOpen(false);
              }}
              className="flex items-center gap-1 text-[11px] text-[#ef4444] hover:text-[#f87171] hover:bg-[#ef4444]/10 px-1.5 py-0.5 rounded cursor-pointer"
            >
              <Delete02Icon size={12} />
              <span>Remove</span>
            </button>

            <span className="text-[10px] text-[#666] font-mono">
              :{fullIdentifier}:
            </span>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const IconChipExtension = Node.create({
  name: 'iconChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      iconId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-icon-id') || '',
        renderHTML: (attributes) => ({
          'data-icon-id': attributes.iconId,
        }),
      },
      pack: {
        default: 'hugeicons',
        parseHTML: (element) => element.getAttribute('data-icon-pack') || 'hugeicons',
        renderHTML: (attributes) => ({
          'data-icon-pack': attributes.pack,
        }),
      },
      color: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-icon-color') || null,
        renderHTML: (attributes) =>
          attributes.color ? { 'data-icon-color': attributes.color } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-noether-icon="true"]',
      },
      {
        tag: 'span[data-type="icon-chip"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-noether-icon': 'true',
          class: 'noether-icon-chip-node',
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(IconChipView);
  },

  addInputRules() {
    // Markdown input rule: automatically transforms :<pack>:<iconId>: into an iconChip node
    return [
      new InputRule({
        find: /(?:^|\s)(:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+):)$/,
        handler: ({ state, range, match }) => {
          const [, fullMatch, pack, iconId] = match;
          const { tr } = state;

          if (!iconId) return null;

          const start = range.from + fullMatch.indexOf(':');
          const end = range.to;

          tr.replaceWith(
            start,
            end,
            this.type.create({
              pack: pack || 'hugeicons',
              iconId,
            })
          );
        },
      }),
    ];
  },
});

export default IconChipExtension;
