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
 * Matched to the exact height and line-box of the document title heading.
 * If no custom icon is assigned, or if the setting is disabled, returns null.
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
  // Render null (preserves 100% natural undisturbed note title layout)
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

  // Title heading style in EditorCanvas is calc(var(--editor-font-size, 12px) * 2.3) with leading-tight (1.25).
  // We match the button to the exact title line-box height and the icon to the optical title height.
  const titleHeight = 'calc(var(--editor-font-size, 12px) * 2.3 * 1.25)';
  const iconPixelSize = 26;

  // 1. Emoji icon
  if (entry.iconId.startsWith('emoji:')) {
    const char = entry.iconId.slice(6);
    return (
      <button
        type="button"
        onClick={handleClick}
        title={`Change icon for “${title}”`}
        style={{
          height: titleHeight,
          width: titleHeight,
        }}
        className="rounded-lg flex items-center justify-center hover:bg-[#282828] cursor-pointer shrink-0 select-none"
      >
        <EmojiRenderer emoji={char} size={iconPixelSize} style={emojiStyle} />
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
        style={{
          height: titleHeight,
          width: titleHeight,
          color: entry.color || 'currentColor',
        }}
        className="rounded-lg flex items-center justify-center hover:bg-[#282828] cursor-pointer shrink-0 select-none"
      >
        <HugeIconRenderer
          iconDef={iconDef.iconDef}
          size={iconPixelSize}
          color={entry.color || 'currentColor'}
        />
      </button>
    );
  }

  return null;
};
