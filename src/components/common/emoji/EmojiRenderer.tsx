import React, { useState } from 'react';
import { emojiToHex } from './emojiCatalog';

export type EmojiStyle = 'native' | 'twemoji' | 'apple' | 'google' | 'whatsapp';

export interface EmojiRendererProps {
  emoji: string;
  size?: number;
  style?: EmojiStyle;
  className?: string;
}

export const EMOJI_STYLE_LABELS: Record<EmojiStyle, string> = {
  native: 'Native (System)',
  twemoji: 'Twemoji',
  apple: 'Apple Emoji',
  google: 'Google Noto',
  whatsapp: 'WhatsApp Emoji',
};

/**
 * High-performance Emoji renderer supporting Native OS rendering by default,
 * and CDN-based crisp vector/image rendering for Twemoji, Apple Emoji, Google Noto, and WhatsApp Emoji.
 * Automatically falls back to Native OS text rendering if an image fails to load.
 */
export const EmojiRenderer = React.memo<EmojiRendererProps>(({
  emoji,
  size = 14,
  style = 'native',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  // 1. Native OS (System Default) or Fallback on Error:
  if (style === 'native' || hasError) {
    return (
      <span
        className={`select-none inline-flex items-center justify-center leading-none font-["Apple_Color_Emoji","Segoe_UI_Emoji","Segoe_UI_Symbol","Noto_Color_Emoji",sans-serif] ${className}`}
        style={{ fontSize: `${size}px`, width: `${size}px`, height: `${size}px` }}
        aria-label={emoji}
      >
        {emoji}
      </span>
    );
  }

  const hex = emojiToHex(emoji);
  let src = '';

  switch (style) {
    case 'twemoji':
      src = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${hex}.svg`;
      break;
    case 'apple':
      src = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${hex}.png`;
      break;
    case 'google':
      src = `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u${hex.replace(/-/g, '_')}.svg`;
      break;
    case 'whatsapp':
      src = `https://cdn.jsdelivr.net/npm/emoji-datasource-facebook@15.1.2/img/facebook/64/${hex}.png`;
      break;
  }

  return (
    <img
      src={src}
      alt={emoji}
      draggable={false}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`select-none inline-block object-contain shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
});
