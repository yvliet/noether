import React, { useState, useEffect } from 'react';
import { emojiToHex, emojiToRawHex } from './emojiCatalog';

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
  const [useAlternativeHex, setUseAlternativeHex] = useState(false);

  // Reset error & alternative state immediately when emoji or style changes
  useEffect(() => {
    setHasError(false);
    setUseAlternativeHex(false);
  }, [emoji, style]);

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

  const strippedHex = emojiToHex(emoji);
  const rawHex = emojiToRawHex(emoji);

  let src = '';

  switch (style) {
    case 'twemoji':
      src = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${useAlternativeHex ? rawHex : strippedHex}.svg`;
      break;
    case 'apple':
      src = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${useAlternativeHex ? strippedHex : rawHex}.png`;
      break;
    case 'google':
      src = `https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u${(useAlternativeHex ? rawHex : strippedHex).replace(/-/g, '_')}.svg`;
      break;
    case 'whatsapp':
      src = `https://cdn.jsdelivr.net/npm/emoji-datasource-facebook@15.1.2/img/facebook/64/${useAlternativeHex ? strippedHex : rawHex}.png`;
      break;
  }

  const handleError = () => {
    if (!useAlternativeHex && strippedHex !== rawHex) {
      // Try alternative hex code format (with/without variation selector-16)
      setUseAlternativeHex(true);
    } else {
      // Fallback gracefully to native system text
      setHasError(true);
    }
  };

  return (
    <img
      src={src}
      alt={emoji}
      draggable={false}
      loading="lazy"
      onError={handleError}
      className={`select-none inline-block object-contain shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
});
