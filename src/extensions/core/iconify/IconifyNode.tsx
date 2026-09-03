/**
 * @file IconifyNode.tsx
 * @description
 * Tree node icon component for custom and default icons in the Hearth file tree.
 * Renders custom icons for both folders and files (notes, canvases, media).
 *
 * Adheres strictly to Flint Rule 6: Zero artificial micro-interaction animations/transitions.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React from 'react';
import {
  Folder01Icon,
  FolderOpenIcon,
  File01Icon,
  Layout01Icon,
} from '@/components/common/Icons';
import { getIconifyIconDef } from './iconifyCatalog';
import { HugeIconRenderer } from '@/components/common/IconPicker';
import { EmojiRenderer } from '@/components/common/emoji';
import { useIconifyStore } from './iconifyStore';
import { DocumentItem } from '@/types';

export interface IconifyNodeProps {
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

export const IconifyNode: React.FC<IconifyNodeProps> = React.memo(({
  isFolder,
  docType,
  title,
  iconId,
  color,
  isOpen = false,
  showDefaultFolderIcon = true,
  showDefaultFileIcon = false,
}) => {
  const emojiStyle = useIconifyStore((s) => s.emojiStyle);

  if (iconId?.startsWith('emoji:')) {
    const char = iconId.slice(6);
    return (
      <span className="w-4 h-4 flex items-center justify-center shrink-0 select-none pointer-events-none">
        <EmojiRenderer emoji={char} size={14} style={emojiStyle} />
      </span>
    );
  }

  const iconDef = iconId ? getIconifyIconDef(iconId) : null;

  if (iconDef) {
    return (
      <span
        className="w-4 h-4 flex items-center justify-center shrink-0 text-[#888888] group-hover:text-[#dcddde] select-none pointer-events-none"
        style={color ? { color } : undefined}
        title={iconDef.name}
      >
        <HugeIconRenderer iconDef={iconDef.iconDef} size={14} color={color || 'currentColor'} />
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

  const isCanvas = docType === 'canvas' || (title && title.toLowerCase().endsWith('.canvas'));
  return (
    <span
      className="w-4 h-4 flex items-center justify-center shrink-0 text-[#777777] group-hover:text-[#dcddde] select-none pointer-events-none"
      title={isCanvas ? 'Canvas' : 'Note'}
    >
      {isCanvas ? <Layout01Icon size={14} /> : <File01Icon size={14} />}
    </span>
  );
});

IconifyNode.displayName = 'IconifyNode';

export interface IconifySlotProps {
  doc: DocumentItem;
  isOpen?: boolean;
}

/**
 * Reactive slot component subscribed to `useIconifyStore`.
 * Guarantees immediate UI updates whenever an icon is assigned or removed.
 */
export const IconifySlot: React.FC<IconifySlotProps> = ({
  doc,
  isOpen = false,
}) => {
  const entry = useIconifyStore((s) => s.icons[doc.id]);
  const showDefaultFolderIcons = useIconifyStore((s) => s.showDefaultFolderIcons);
  const showDefaultFileIcons = useIconifyStore((s) => s.showDefaultFileIcons);

  const isFolder = Boolean(doc.is_folder);

  if (!entry) {
    if (isFolder && !showDefaultFolderIcons) return null;
    if (!isFolder && !showDefaultFileIcons) return null;
  }

  return (
    <IconifyNode
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

export interface IconifyBreadcrumbIconProps {
  itemId: string;
  isFolder: boolean;
}

/**
 * Reactive breadcrumb icon component subscribed to `useIconifyStore`.
 * Displays custom icons or default folder/file icons in subheader breadcrumbs.
 */
export const IconifyBreadcrumbIcon: React.FC<IconifyBreadcrumbIconProps> = ({
  itemId,
  isFolder,
}) => {
  const entry = useIconifyStore((s) => s.icons[itemId]);
  const showDefaultFolderIcons = useIconifyStore((s) => s.showDefaultFolderIcons);
  const showDefaultFileIcons = useIconifyStore((s) => s.showDefaultFileIcons);
  const emojiStyle = useIconifyStore((s) => s.emojiStyle);

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

    const iconDef = getIconifyIconDef(entry.iconId);
    if (iconDef) {
      return (
        <span
          className="w-3.5 h-3.5 flex items-center justify-center shrink-0 select-none pointer-events-none"
          style={entry.color ? { color: entry.color } : undefined}
          title={iconDef.name}
        >
          <HugeIconRenderer iconDef={iconDef.iconDef} size={12} color={entry.color || 'currentColor'} />
        </span>
      );
    }
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

export interface IconifyTabIconProps {
  docId: string;
}

/**
 * Reactive tab icon component subscribed to `useIconifyStore`.
 * Guarantees that tab icons atomically re-render on the exact frame
 * whenever an icon or emojiStyle is changed in settings or picker.
 */
export const IconifyTabIcon: React.FC<IconifyTabIconProps> = ({ docId }) => {
  const entry = useIconifyStore((s) => s.icons[docId]);
  const emojiStyle = useIconifyStore((s) => s.emojiStyle);

  if (!entry) return null;

  if (entry.iconId.startsWith('emoji:')) {
    const char = entry.iconId.slice(6);
    return (
      <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 select-none pointer-events-none">
        <EmojiRenderer emoji={char} size={13} style={emojiStyle} />
      </span>
    );
  }

  const iconDef = getIconifyIconDef(entry.iconId);
  if (!iconDef) return null;

  return (
    <span
      className="w-3.5 h-3.5 flex items-center justify-center shrink-0 select-none pointer-events-none"
      style={entry.color ? { color: entry.color } : undefined}
      title={iconDef.name}
    >
      <HugeIconRenderer
        iconDef={iconDef.iconDef}
        size={13}
        color={entry.color || 'currentColor'}
      />
    </span>
  );
};
