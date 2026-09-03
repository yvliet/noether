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
 *
 * Ensures consistent optical sizing across styles without clipping native glyphs.
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
    const nativeFontSize = Math.round(size * 0.88);

    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 select-none leading-none text-center font-["Apple_Color_Emoji","Segoe_UI_Emoji","Segoe_UI_Symbol","Noto_Color_Emoji",sans-serif] ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          fontSize: `${nativeFontSize}px`,
          lineHeight: 1,
        }}
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
      setUseAlternativeHex(true);
    } else {
      setHasError(true);
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      aria-label={emoji}
    >
      <img
        src={src}
        alt={emoji}
        draggable={false}
        decoding="async"
        onError={handleError}
        className="w-full h-full object-contain block select-none pointer-events-none"
      />
    </span>
  );
});
