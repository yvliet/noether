/**
 * @file MoreIconsNode.tsx
 * @description
 * Tree node icon component for custom and default icons in the Vault file tree.
 * Renders custom icons for both folders and files (notes, canvases, media).
 * Zero artificial micro-interaction animations/transitions.
 *
 * @author Yuliet Li
 * @since 1.2.0
 */

import React from 'react';
import {
  Folder01Icon,
  FolderOpenIcon,
  File01Icon,
  Layout01Icon,
} from '@/components/common/Icons';
import { DynamicHugeIcon } from '@/components/common/IconPicker';
import { EmojiRenderer } from '@/components/common/emoji';
import { useMoreIconsStore } from './moreIconsStore';
import { DocumentItem } from '@/types';
import { fileTypeRegistry } from '@/sdk';

export interface MoreIconsNodeProps {
  itemId: string;
  isFolder: boolean;
  docType?: string;
  title?: string;
  iconId?: string;
  color?: string;
  isOpen?: boolean;
  showDefaultFolderIcon?: boolean;
  showDefaultFileIcon?: boolean;
}

export const MoreIconsNode: React.FC<MoreIconsNodeProps> = React.memo(({
  isFolder,
  docType,
  title,
  iconId,
  color,
  isOpen = false,
  showDefaultFolderIcon = true,
  showDefaultFileIcon = false,
}) => {
  const emojiStyle = useMoreIconsStore((s) => s.emojiStyle);

  if (iconId?.startsWith('emoji:')) {
    const char = iconId.slice(6);
    return (
      <span className="w-4 h-4 flex items-center justify-center shrink-0 select-none pointer-events-none">
        <EmojiRenderer emoji={char} size={14} style={emojiStyle} />
      </span>
    );
  }

  if (iconId) {
    return (
      <span
        className="w-4 h-4 flex items-center justify-center shrink-0 text-[#888888] group-hover:text-[#dcddde] select-none pointer-events-none"
        style={color ? { color } : undefined}
        title={title}
      >
        <DynamicHugeIcon iconId={iconId} size={14} color={color || 'currentColor'} />
      </span>
    );
  }

  if (isFolder) {
    if (!showDefaultFolderIcon) {
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
  }

  // Non-folder (file, note, canvas)
  if (!showDefaultFileIcon) {
    return null;
  }

  const customType = fileTypeRegistry.getByDocType(docType) || (title ? fileTypeRegistry.getByPath(title) : undefined);
  return (
    <span
      className="w-4 h-4 flex items-center justify-center shrink-0 text-[#777777] group-hover:text-[#dcddde] select-none pointer-events-none"
      title={customType ? (customType.badgeLabel || customType.extension.toUpperCase()) : 'Note'}
    >
      {customType ? <Layout01Icon size={14} /> : <File01Icon size={14} />}
    </span>
  );
});

MoreIconsNode.displayName = 'MoreIconsNode';

export interface MoreIconsFileIconSlotProps {
  doc: DocumentItem;
}

/**
 * Reactive file icon component for the first (chevron/spacer) slot of the tree row.
 * If the file has a custom icon, renders it inside the 16px slot.
 * If no icon is set, renders null, preserving the 16px empty space so all filenames
 * on the same depth level start at the exact same horizontal X!
 */
export const MoreIconsFileIconSlot: React.FC<MoreIconsFileIconSlotProps> = ({ doc }) => {
  const entry = useMoreIconsStore((s) => s.icons[doc.id]);
  const showDefaultFileIcons = useMoreIconsStore((s) => s.showDefaultFileIcons);
  const emojiStyle = useMoreIconsStore((s) => s.emojiStyle);

  if (!entry && !showDefaultFileIcons) {
    return null;
  }

  // 1. Custom assigned icon
  if (entry) {
    if (entry.iconId.startsWith('emoji:')) {
      const char = entry.iconId.slice(6);
      return (
        <span className="w-4 h-4 flex items-center justify-center shrink-0 select-none pointer-events-none">
          <EmojiRenderer emoji={char} size={14} style={emojiStyle} />
        </span>
      );
    }

    return (
      <span
        className="w-4 h-4 flex items-center justify-center shrink-0 text-[#888888] group-hover:text-[#dcddde] select-none pointer-events-none"
        style={entry.color ? { color: entry.color } : undefined}
      >
        <DynamicHugeIcon iconId={entry.iconId} size={14} color={entry.color || 'currentColor'} />
      </span>
    );
  }

  // 2. Default file icon
  if (showDefaultFileIcons) {
    const customType = fileTypeRegistry.getByDocType(doc.doc_type) || (doc.title ? fileTypeRegistry.getByPath(doc.title) : undefined);
    return (
      <span
        className="w-4 h-4 flex items-center justify-center shrink-0 text-[#777777] group-hover:text-[#dcddde] select-none pointer-events-none"
        title={customType ? (customType.badgeLabel || customType.extension.toUpperCase()) : 'Note'}
      >
        {customType ? <Layout01Icon size={14} /> : <File01Icon size={14} />}
      </span>
    );
  }

  return null;
};

export interface MoreIconsFolderPrefixSlotProps {
  doc: DocumentItem;
  isOpen?: boolean;
}

/**
 * Reactive folder prefix component rendered in the prefix slot (between chevron and folder title).
 */
export const MoreIconsFolderPrefixSlot: React.FC<MoreIconsFolderPrefixSlotProps> = ({
  doc,
  isOpen = false,
}) => {
  const entry = useMoreIconsStore((s) => s.icons[doc.id]);
  const showDefaultFolderIcons = useMoreIconsStore((s) => s.showDefaultFolderIcons);
  const emojiStyle = useMoreIconsStore((s) => s.emojiStyle);

  if (!entry && !showDefaultFolderIcons) {
    return null;
  }

  if (entry) {
    if (entry.iconId.startsWith('emoji:')) {
      const char = entry.iconId.slice(6);
      return (
        <span className="w-4 h-4 flex items-center justify-center shrink-0 select-none pointer-events-none">
          <EmojiRenderer emoji={char} size={14} style={emojiStyle} />
        </span>
      );
    }

    return (
      <span
        className="w-4 h-4 flex items-center justify-center shrink-0 text-[#888888] group-hover:text-[#dcddde] select-none pointer-events-none"
        style={entry.color ? { color: entry.color } : undefined}
      >
        <DynamicHugeIcon iconId={entry.iconId} size={14} color={entry.color || 'currentColor'} />
      </span>
    );
  }

  if (showDefaultFolderIcons) {
    return (
      <span
        className="w-4 h-4 flex items-center justify-center shrink-0 text-[#888888] group-hover:text-[#dcddde] select-none pointer-events-none"
        title="Folder"
      >
        {isOpen ? <FolderOpenIcon size={14} /> : <Folder01Icon size={14} />}
      </span>
    );
  }

  return null;
};

export interface MoreIconsSlotProps {
  doc: DocumentItem;
  isOpen?: boolean;
}

/**
 * Reactive slot component subscribed to `useMoreIconsStore`.
 * Guarantees immediate UI updates whenever an icon is assigned or removed.
 */
export const MoreIconsSlot: React.FC<MoreIconsSlotProps> = ({
  doc,
  isOpen = false,
}) => {
  const entry = useMoreIconsStore((s) => s.icons[doc.id]);
  const showDefaultFolderIcons = useMoreIconsStore((s) => s.showDefaultFolderIcons);
  const showDefaultFileIcons = useMoreIconsStore((s) => s.showDefaultFileIcons);

  const isFolder = Boolean(doc.is_folder);

  if (!entry) {
    if (isFolder && !showDefaultFolderIcons) return null;
    if (!isFolder && !showDefaultFileIcons) return null;
  }

  return (
    <MoreIconsNode
      itemId={doc.id}
      isFolder={isFolder}
      docType={doc.doc_type}
      title={doc.title}
      iconId={entry?.iconId}
      color={entry?.color}
      isOpen={isOpen}
      showDefaultFolderIcon={showDefaultFolderIcons}
      showDefaultFileIcon={showDefaultFileIcons}
    />
  );
};

export interface MoreIconsBreadcrumbIconProps {
  itemId: string;
  isFolder: boolean;
}

/**
 * Reactive breadcrumb icon component subscribed to `useMoreIconsStore`.
 * Displays custom icons or default folder/file icons in subheader breadcrumbs.
 */
export const MoreIconsBreadcrumbIcon: React.FC<MoreIconsBreadcrumbIconProps> = ({
  itemId,
  isFolder,
}) => {
  const entry = useMoreIconsStore((s) => s.icons[itemId]);
  const showDefaultFolderIcons = useMoreIconsStore((s) => s.showDefaultFolderIcons);
  const showDefaultFileIcons = useMoreIconsStore((s) => s.showDefaultFileIcons);
  const emojiStyle = useMoreIconsStore((s) => s.emojiStyle);

  // 1. Custom assigned icon
  if (entry) {
    if (entry.iconId.startsWith('emoji:')) {
      const char = entry.iconId.slice(6);
      return (
        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 select-none pointer-events-none">
          <EmojiRenderer emoji={char} size={12} style={emojiStyle} />
        </span>
      );
    }

    return (
      <span
        className="w-3.5 h-3.5 flex items-center justify-center shrink-0 select-none pointer-events-none"
        style={entry.color ? { color: entry.color } : undefined}
      >
        <DynamicHugeIcon iconId={entry.iconId} size={12} color={entry.color || 'currentColor'} />
      </span>
    );
  }

  // 2. Default folder icon
  if (isFolder) {
    if (!showDefaultFolderIcons) return null;
    return (
      <span
        className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#888888] select-none pointer-events-none"
        title="Folder"
      >
        <Folder01Icon size={12} />
      </span>
    );
  }

  // 3. Default file icon
  if (!showDefaultFileIcons) return null;
  return (
    <span
      className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#777777] select-none pointer-events-none"
      title="Note"
    >
      <File01Icon size={12} />
    </span>
  );
};

export interface MoreIconsTabIconProps {
  docId: string;
}

/**
 * Reactive tab icon component subscribed to `useMoreIconsStore`.
 * Guarantees that tab icons atomically re-render on the exact frame
 * whenever an icon or emojiStyle is changed in settings or picker.
 */
export const MoreIconsTabIcon: React.FC<MoreIconsTabIconProps> = ({ docId }) => {
  const entry = useMoreIconsStore((s) => s.icons[docId]);
  const emojiStyle = useMoreIconsStore((s) => s.emojiStyle);

  if (!entry) return null;

  if (entry.iconId.startsWith('emoji:')) {
    const char = entry.iconId.slice(6);
    return (
      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 select-none pointer-events-none">
        <EmojiRenderer emoji={char} size={13} style={emojiStyle} />
      </span>
    );
  }

  return (
    <span
      className="w-3.5 h-3.5 flex items-center justify-center shrink-0 select-none pointer-events-none"
      style={entry.color ? { color: entry.color } : undefined}
    >
      <DynamicHugeIcon
        iconId={entry.iconId}
        size={13}
        color={entry.color || 'currentColor'}
      />
    </span>
  );
};

// ── Backward Compatibility Aliases ──
export const IconifyNode = MoreIconsNode;
export type IconifyNodeProps = MoreIconsNodeProps;
export const IconifyFileIconSlot = MoreIconsFileIconSlot;
export type IconifyFileIconSlotProps = MoreIconsFileIconSlotProps;
export const IconifyFolderPrefixSlot = MoreIconsFolderPrefixSlot;
export type IconifyFolderPrefixSlotProps = MoreIconsFolderPrefixSlotProps;
export const IconifySlot = MoreIconsSlot;
export type IconifySlotProps = MoreIconsSlotProps;
export const IconifyBreadcrumbIcon = MoreIconsBreadcrumbIcon;
export type IconifyBreadcrumbIconProps = MoreIconsBreadcrumbIconProps;
export const IconifyTabIcon = MoreIconsTabIcon;
export type IconifyTabIconProps = MoreIconsTabIconProps;
