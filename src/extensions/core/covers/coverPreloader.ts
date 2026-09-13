/**
 * @module coverPreloader
 * @description
 * High-performance in-memory decoded image cache and preloader for note cover banners.
 *
 * Performance & Responsiveness Invariants:
 * - Decoded Bitmap Retention: Keeps HTMLImageElement references resident in memory
 *   so the browser engine (Chromium / WebView2) does not evict decompressed GPU textures
 *   when CoverBanner unmounts during tab switching.
 * - Zero Frame Lag: Switching between tabs paints cached covers on frame 0 without blank flashes.
 * - Fast-Path Protocols: Directly bypasses vault attachment scans for HTTP/HTTPS/data/blob URIs.
 * - Non-Blocking Background Preload: Decodes images off-thread via `HTMLImageElement.prototype.decode()`.
 *
 * @since 1.0.0
 */

import { NoetherApp } from '@/core/app/NoetherApp';
import { DocumentItem } from '@/types';

/** Maximum number of decoded image elements kept resident in memory */
const MAX_CACHE_SIZE = 64;

/** In-memory cache holding decoded HTMLImageElement instances to preserve GPU textures */
const imageElementCache = new Map<string, HTMLImageElement>();

/** Set of URL strings whose bitmaps have completed decoding */
const decodedUrlSet = new Set<string>();

/**
 * Preload and decode a cover image in the background without blocking the UI thread.
 *
 * @param url - Image URL, data URI, or asset path to preload.
 */
export function preloadCoverImage(url: string | null | undefined): void {
  if (!url || typeof window === 'undefined') return;

  const trimmed = url.trim();
  if (!trimmed) return;

  // Already cached and decoded
  if (imageElementCache.has(trimmed)) {
    return;
  }

  try {
    const img = new Image();
    img.src = trimmed;

    // Utilize the browser's native off-thread decoding pipeline
    if (typeof img.decode === 'function') {
      img
        .decode()
        .then(() => {
          decodedUrlSet.add(trimmed);
        })
        .catch(() => {
          // Graceful fallback: even if decode rejects (e.g. SVG or format variation),
          // the image element has initiated network/disk caching.
          if (img.complete) {
            decodedUrlSet.add(trimmed);
          }
        });
    } else if (img.complete) {
      decodedUrlSet.add(trimmed);
    }

    imageElementCache.set(trimmed, img);

    // Evict oldest entries if cache exceeds capacity
    if (imageElementCache.size > MAX_CACHE_SIZE) {
      const oldestKey = imageElementCache.keys().next().value;
      if (oldestKey) {
        imageElementCache.delete(oldestKey);
        decodedUrlSet.delete(oldestKey);
      }
    }
  } catch {
    // Non-critical background task failure should never throw
  }
}

/**
 * Checks whether a cover image URL has finished decoding into memory.
 *
 * @param url - Target image URL string.
 */
export function isCoverPreloaded(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (decodedUrlSet.has(trimmed)) return true;
  const cached = imageElementCache.get(trimmed);
  return Boolean(cached && cached.complete);
}

/**
 * Resolves a raw cover string (URL, data URI, or vault attachment) to a usable image source,
 * initiating background pre-decoding automatically.
 *
 * Avoids reactive React store subscriptions by querying `app.vault.documents` synchronously in memory.
 *
 * @param rawCover - Raw frontmatter Cover value.
 * @param app - Central Noether application instance.
 * @returns Fully resolved image URI or original string.
 */
export function resolveCoverSource(rawCover: string, app: NoetherApp): string {
  if (!rawCover) return '';
  const trimmed = rawCover.trim();
  if (!trimmed) return '';

  // Fast-path: external web URLs, data URIs, local blob URIs, or Tauri asset URIs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('asset://')
  ) {
    preloadCoverImage(trimmed);
    return trimmed;
  }

  // Lookup vault attachment document by title without subscribing to reactive hooks
  const documents = app.vault.documents;
  if (!documents || documents.length === 0) {
    preloadCoverImage(trimmed);
    return trimmed;
  }

  const cleanTarget = trimmed.toLowerCase();
  const cleanWithoutExt = cleanTarget.replace(/\.[a-zA-Z0-9]+$/, '');

  const matched = documents.find((d: DocumentItem) => {
    if (d.is_folder) return false;
    const titleLower = d.title.toLowerCase();
    return (
      titleLower === cleanTarget ||
      titleLower === cleanWithoutExt ||
      d.title === trimmed
    );
  });

  if (matched && matched.content_json) {
    try {
      const parsed = JSON.parse(matched.content_json);
      const firstText = parsed.content?.[0]?.content?.[0]?.text;
      if (
        firstText &&
        (firstText.startsWith('data:image/') ||
          firstText.startsWith('http') ||
          firstText.startsWith('blob:') ||
          firstText.startsWith('asset://'))
      ) {
        preloadCoverImage(firstText);
        return firstText;
      }
    } catch {
      // Return trimmed target on parse error
    }
  }

  preloadCoverImage(trimmed);
  return trimmed;
}

/**
 * Proactively inspects all documents in the active vault and preloads any configured cover images.
 * Uses fast substring checks to avoid JSON parsing notes without covers.
 *
 * @param app - Central Noether application instance.
 */
export function preloadAllVaultCovers(app: NoetherApp): void {
  const documents = app.vault.documents;
  if (!documents || documents.length === 0) return;

  // Run in a deferred microtask/timeout to yield the main thread to initial layout
  const schedule = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: () => void) => setTimeout(cb, 50);

  schedule(() => {
    for (const doc of documents) {
      if (!doc.properties) continue;
      const rawProps = typeof doc.properties === 'string' ? doc.properties : '';
      if (rawProps && !rawProps.includes('Cover')) continue;

      try {
        const parsed = typeof doc.properties === 'string'
          ? JSON.parse(doc.properties)
          : doc.properties;
        const coverVal = parsed?.Cover;
        if (coverVal && typeof coverVal === 'string') {
          resolveCoverSource(coverVal, app);
        }
      } catch {
        // Skip unparseable frontmatter
      }
    }
  });
}
