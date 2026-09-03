import React from 'react';
import { useIconifyStore } from './iconifyStore';
import { getIconifyIconDef } from './iconifyCatalog';
import { HugeIconRenderer } from '@/components/common/IconPicker';
import { EmojiRenderer } from '@/components/common/emoji';

export interface IconifyEditorTitleIconProps {
  docId: string;
  title: string;
}

/**
 * Clickable icon rendered immediately to the left of the note title in the editor.
 * If no custom icon is assigned, or if the setting is disabled, returns null
 * to keep uncustomized notes visually natural and undisturbed.
 */
export const IconifyEditorTitleIcon: React.FC<IconifyEditorTitleIconProps> = ({
  docId,
  title,
}) => {
  const entry = useIconifyStore((s) => s.icons[docId]);
  const showEditorTitleIcon = useIconifyStore((s) => s.showEditorTitleIcon);
  const emojiStyle = useIconifyStore((s) => s.emojiStyle);
  const openPicker = useIconifyStore((s) => s.openPicker);

  // If user disabled showing icon in editor title, or no icon assigned:
  // Render null (preserves 100% natural undisturbed note title layout without intrusive placeholders)
  if (!showEditorTitleIcon || !entry) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPicker({
      id: docId,
      title: title || 'Untitled',
      isFolder: false,
    });
  };

  // 1. Emoji icon
  if (entry.iconId.startsWith('emoji:')) {
    const char = entry.iconId.slice(6);
    return (
      <button
        type="button"
        onClick={handleClick}
        title={`Change icon for “${title}”`}
        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#282828] cursor-pointer shrink-0 select-none p-0.5"
      >
        <EmojiRenderer emoji={char} size={22} style={emojiStyle} />
      </button>
    );
  }

  // 2. HugeIcon icon
  const iconDef = getIconifyIconDef(entry.iconId);
  if (iconDef) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={`Change icon for “${title}”`}
        style={entry.color ? { color: entry.color } : undefined}
        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#282828] cursor-pointer shrink-0 select-none p-0.5"
      >
        <HugeIconRenderer iconDef={iconDef.iconDef} size={22} color={entry.color || 'currentColor'} />
      </button>
    );
  }

  return null;
};
