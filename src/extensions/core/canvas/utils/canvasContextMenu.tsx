/**
 * @module canvasContextMenu
 * @description
 * Context menu definitions and builder functions for the Infinite Canvas.
 * Covers background canvas actions, note cards, text cards, link cards,
 * and multi-card selections using Flint's custom context menu system.
 */

import React from 'react';
import type { ContextMenuItem } from '@/components/common/ContextMenu';
import type { DocumentItem } from '@/types';
import type { CanvasNode } from '../types';
import { CARD_COLOR_PRESETS } from '../components/cardColors';
import {
  StickyNote03Icon,
  FileEmpty02Icon,
  FileImageIcon,
  LinkSquare02Icon,
  RotateCcwIcon,
  RedoIcon,
  ClipboardPasteIcon,
  Grid02Icon,
  CenterFocusIcon,
  Lock01Icon,
  ReplaceIcon,
  Edit02Icon,
  ExternalLinkIcon,
  SplitRightIcon,
  OpenInWindowIcon,
  MoveFileIcon,
  Bookmark01Icon,
  Copy01Icon,
  FolderOpenIcon,
  PaletteIcon,
  Delete02Icon,
  FileAddIcon,
} from '@/components/common/Icons';

export const SnapToObjectsIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 5h14" />
    <circle cx="4" cy="5" r="1.75" />
    <circle cx="20" cy="5" r="1.75" />
    <rect x="7.5" y="8.5" width="9" height="7" rx="1.5" />
    <path d="M5 19h14" />
    <circle cx="4" cy="19" r="1.75" />
    <circle cx="20" cy="19" r="1.75" />
  </svg>
);

export interface CanvasBackgroundMenuParams {
  onAddCard: () => void;
  onHoverCard?: () => void;
  onAddNote: () => void;
  onHoverNote?: () => void;
  onAddMedia: () => void;
  onHoverMedia?: () => void;
  onLeaveItem?: () => void;
  onAddWebPage: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onPaste: () => void;
  canPaste: boolean;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  snapToObjects: boolean;
  onToggleSnapToObjects: () => void;
  readOnly: boolean;
  onToggleReadOnly: () => void;
}

export function buildCanvasBackgroundContextMenu(
  params: CanvasBackgroundMenuParams
): ContextMenuItem[] {
  return [
    {
      id: 'canvas-add-card',
      title: 'Add card',
      icon: <StickyNote03Icon size={14} />,
      onClick: params.onAddCard,
      onMouseEnter: params.onHoverCard,
      onMouseLeave: params.onLeaveItem,
    },
    {
      id: 'canvas-add-note',
      title: 'Add note from Hearth',
      icon: <FileEmpty02Icon size={14} />,
      onClick: params.onAddNote,
      onMouseEnter: params.onHoverNote,
      onMouseLeave: params.onLeaveItem,
    },
    {
      id: 'canvas-add-media',
      title: 'Add media from Hearth',
      icon: <FileImageIcon size={14} />,
      onClick: params.onAddMedia,
      onMouseEnter: params.onHoverMedia,
      onMouseLeave: params.onLeaveItem,
    },
    {
      id: 'canvas-add-webpage',
      title: 'Add web page',
      icon: <LinkSquare02Icon size={14} />,
      onClick: params.onAddWebPage,
    },
    { type: 'separator' },
    {
      id: 'canvas-undo',
      title: 'Undo',
      icon: <RotateCcwIcon size={14} />,
      shortcut: 'Ctrl+Z',
      disabled: !params.canUndo,
      onClick: params.onUndo,
    },
    ...(params.canRedo
      ? [
          {
            id: 'canvas-redo',
            title: 'Redo',
            icon: <RedoIcon size={14} />,
            shortcut: 'Ctrl+Y',
            onClick: params.onRedo,
          },
        ]
      : []),
    { type: 'separator' },
    {
      id: 'canvas-paste',
      title: 'Paste',
      icon: <ClipboardPasteIcon size={14} />,
      shortcut: 'Ctrl+V',
      disabled: !params.canPaste,
      onClick: params.onPaste,
    },
    { type: 'separator' },
    {
      id: 'canvas-snap-grid',
      title: 'Snap to grid',
      icon: <Grid02Icon size={14} />,
      checked: params.snapToGrid,
      onClick: params.onToggleSnapToGrid,
    },
    {
      id: 'canvas-snap-objects',
      title: 'Snap to objects',
      icon: <SnapToObjectsIcon size={14} />,
      checked: params.snapToObjects,
      onClick: params.onToggleSnapToObjects,
    },
    {
      id: 'canvas-read-only',
      title: 'Read-only',
      icon: <Lock01Icon size={14} />,
      checked: params.readOnly,
      onClick: params.onToggleReadOnly,
    },
  ];
}

function buildColorSubmenu(
  currentColor: string | undefined,
  onColorChange: (color: string) => void
): ContextMenuItem[] {
  return CARD_COLOR_PRESETS.map((preset) => ({
    id: `color-${preset.id}`,
    title: preset.label,
    icon: (
      <span
        className="w-3 h-3 rounded-full shrink-0 border border-white/20"
        style={{ backgroundColor: preset.swatch }}
      />
    ),
    checked:
      preset.id === 'default'
        ? !currentColor || currentColor === 'default'
        : currentColor === preset.id,
    onClick: () => onColorChange(preset.id === 'default' ? '' : preset.id),
  }));
}

export interface NoteCardMenuParams {
  node: CanvasNode;
  doc: DocumentItem | null;
  onFitToCenter: () => void;
  onSwapFile: () => void;
  onEdit?: () => void;
  onOpenInNewTab: () => void;
  onOpenToRight: () => void;
  onOpenInNewWindow: () => void;
  onRename: () => void;
  onMoveFile: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onCopyRelativePath: () => void;
  onCopyAbsolutePath: () => void;
  onShowInExplorer: () => void;
  currentColor?: string;
  onColorChange: (color: string) => void;
  onDeleteCard: () => void;
  onDeleteFile: () => void;
  customFileActions?: ContextMenuItem[];
}

export function buildNoteCardContextMenu(params: NoteCardMenuParams): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: 'card-fit-center',
      title: 'Fit to center',
      icon: <CenterFocusIcon size={14} />,
      onClick: params.onFitToCenter,
    },
    {
      id: 'card-swap-file',
      title: 'Swap file',
      icon: <ReplaceIcon size={14} />,
      onClick: params.onSwapFile,
    },
  ];

  if (params.onEdit) {
    items.push({
      id: 'card-edit',
      title: 'Edit',
      icon: <Edit02Icon size={14} />,
      onClick: params.onEdit,
    });
  }

  items.push(
    { type: 'separator' },
    {
      id: 'card-open-tab',
      title: 'Open in new tab',
      icon: <ExternalLinkIcon size={14} />,
      onClick: params.onOpenInNewTab,
    },
    {
      id: 'card-open-split',
      title: 'Open to the right',
      icon: <SplitRightIcon size={14} />,
      onClick: params.onOpenToRight,
    },
    {
      id: 'card-open-window',
      title: 'Open in new window',
      icon: <OpenInWindowIcon size={14} />,
      onClick: params.onOpenInNewWindow,
    },
    { type: 'separator' },
    {
      id: 'card-rename',
      title: 'Rename...',
      icon: <Edit02Icon size={14} />,
      onClick: params.onRename,
    },
    {
      id: 'card-move-to',
      title: 'Move file to...',
      icon: <MoveFileIcon size={14} />,
      onClick: params.onMoveFile,
    },
    {
      id: 'card-bookmark',
      title: params.isBookmarked ? 'Remove bookmark' : 'Bookmark',
      icon: <Bookmark01Icon size={14} />,
      checked: params.isBookmarked,
      onClick: params.onToggleBookmark,
    },
    {
      id: 'card-copy-path',
      title: 'Copy path',
      icon: <Copy01Icon size={14} />,
      submenu: [
        {
          id: 'card-copy-rel-path',
          title: 'Copy relative path',
          icon: <Copy01Icon size={14} />,
          onClick: params.onCopyRelativePath,
        },
        {
          id: 'card-copy-abs-path',
          title: 'Copy absolute path',
          icon: <Copy01Icon size={14} />,
          onClick: params.onCopyAbsolutePath,
        },
      ],
    },
    {
      id: 'card-show-explorer',
      title: 'Show in system explorer',
      icon: <FolderOpenIcon size={14} />,
      onClick: params.onShowInExplorer,
    },
    { type: 'separator' },
    {
      id: 'card-color',
      title: 'Color',
      icon: <PaletteIcon size={14} />,
      submenu: buildColorSubmenu(params.currentColor, params.onColorChange),
    },
    {
      id: 'card-delete-node',
      title: 'Delete card',
      icon: <Delete02Icon size={14} />,
      onClick: params.onDeleteCard,
    }
  );

  if (params.customFileActions && params.customFileActions.length > 0) {
    items.push({ type: 'separator' }, ...params.customFileActions);
  }

  items.push(
    { type: 'separator' },
    {
      id: 'card-delete-file',
      title: 'Delete file...',
      icon: <Delete02Icon size={14} />,
      isDanger: true,
      onClick: params.onDeleteFile,
    }
  );

  return items;
}

export interface TextCardMenuParams {
  node: CanvasNode;
  onFitToCenter: () => void;
  onEdit: () => void;
  onConvertToFile: () => void;
  currentColor?: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

export function buildTextCardContextMenu(params: TextCardMenuParams): ContextMenuItem[] {
  return [
    {
      id: 'card-fit-center',
      title: 'Fit to center',
      icon: <CenterFocusIcon size={14} />,
      onClick: params.onFitToCenter,
    },
    {
      id: 'card-edit',
      title: 'Edit',
      icon: <Edit02Icon size={14} />,
      onClick: params.onEdit,
    },
    {
      id: 'card-convert-to-file',
      title: 'Convert to file...',
      icon: <FileAddIcon size={14} />,
      onClick: params.onConvertToFile,
    },
    { type: 'separator' },
    {
      id: 'card-color',
      title: 'Color',
      icon: <PaletteIcon size={14} />,
      submenu: buildColorSubmenu(params.currentColor, params.onColorChange),
    },
    { type: 'separator' },
    {
      id: 'card-delete',
      title: 'Delete',
      icon: <Delete02Icon size={14} />,
      isDanger: true,
      onClick: params.onDelete,
    },
  ];
}

export interface LinkCardMenuParams {
  node: CanvasNode;
  onFitToCenter: () => void;
  onOpenLink: () => void;
  onCopyUrl: () => void;
  onEditUrl: () => void;
  currentColor?: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

export function buildLinkCardContextMenu(params: LinkCardMenuParams): ContextMenuItem[] {
  return [
    {
      id: 'card-fit-center',
      title: 'Fit to center',
      icon: <CenterFocusIcon size={14} />,
      onClick: params.onFitToCenter,
    },
    {
      id: 'card-open-link',
      title: 'Open in browser',
      icon: <ExternalLinkIcon size={14} />,
      onClick: params.onOpenLink,
    },
    {
      id: 'card-copy-url',
      title: 'Copy URL',
      icon: <Copy01Icon size={14} />,
      onClick: params.onCopyUrl,
    },
    {
      id: 'card-edit-url',
      title: 'Edit URL...',
      icon: <Edit02Icon size={14} />,
      onClick: params.onEditUrl,
    },
    { type: 'separator' },
    {
      id: 'card-color',
      title: 'Color',
      icon: <PaletteIcon size={14} />,
      submenu: buildColorSubmenu(params.currentColor, params.onColorChange),
    },
    { type: 'separator' },
    {
      id: 'card-delete',
      title: 'Delete',
      icon: <Delete02Icon size={14} />,
      isDanger: true,
      onClick: params.onDelete,
    },
  ];
}

export interface MultiSelectMenuParams {
  selectedCount: number;
  onFitToCenter: () => void;
  onDuplicate: () => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

export function buildMultiSelectContextMenu(params: MultiSelectMenuParams): ContextMenuItem[] {
  return [
    {
      id: 'multi-fit-center',
      title: 'Fit to center',
      icon: <CenterFocusIcon size={14} />,
      onClick: params.onFitToCenter,
    },
    {
      id: 'multi-duplicate',
      title: `Duplicate ${params.selectedCount} cards`,
      icon: <Copy01Icon size={14} />,
      shortcut: 'Ctrl+D',
      onClick: params.onDuplicate,
    },
    {
      id: 'multi-color',
      title: 'Color',
      icon: <PaletteIcon size={14} />,
      submenu: buildColorSubmenu(undefined, params.onColorChange),
    },
    { type: 'separator' },
    {
      id: 'multi-delete',
      title: `Delete ${params.selectedCount} cards`,
      icon: <Delete02Icon size={14} />,
      isDanger: true,
      onClick: params.onDelete,
    },
  ];
}

export interface UnconnectedEdgeMenuParams {
  onAddCard: () => void;
  onHoverCard: () => void;
  onAddNote: () => void;
  onHoverNote: () => void;
  onAddMedia: () => void;
  onHoverMedia: () => void;
  onLeaveItem: () => void;
}

export function buildUnconnectedEdgeContextMenu(
  params: UnconnectedEdgeMenuParams
): ContextMenuItem[] {
  return [
    {
      id: 'canvas-edge-add-card',
      title: 'Add card',
      icon: <StickyNote03Icon size={14} />,
      onClick: params.onAddCard,
      onMouseEnter: params.onHoverCard,
      onMouseLeave: params.onLeaveItem,
    },
    {
      id: 'canvas-edge-add-note',
      title: 'Add note from Hearth',
      icon: <FileEmpty02Icon size={14} />,
      onClick: params.onAddNote,
      onMouseEnter: params.onHoverNote,
      onMouseLeave: params.onLeaveItem,
    },
    {
      id: 'canvas-edge-add-media',
      title: 'Add media from Hearth',
      icon: <FileImageIcon size={14} />,
      onClick: params.onAddMedia,
      onMouseEnter: params.onHoverMedia,
      onMouseLeave: params.onLeaveItem,
    },
  ];
}

