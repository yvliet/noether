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
import { getCachedImageSrc, resolveImageSrcAsync } from '@/components/editor/embed-renderer';
import { COVER_PRESETS } from './presets';
import { getPresetUrl, initPresetCache } from './presetCache';

/** Maximum number of decoded image elements kept resident in memory */
const MAX_CACHE_SIZE = 64;

/** In-memory cache holding decoded HTMLImageElement instances to preserve GPU textures */
const imageElementCache = new Map<string, HTMLImageElement>();

/** Set of URL strings whose bitmaps have completed decoding */
const decodedUrlSet = new Set<string>();

/**
 * Evicts preloaded cover image elements and decoded flags from cache.
 * If called without arguments, flushes the entire cover cache.
 */
export function evictCoverCache(urlOrKey?: string): void {
  if (!urlOrKey) {
    imageElementCache.clear();
    decodedUrlSet.clear();
    return;
  }
  const trimmed = urlOrKey.trim();
  imageElementCache.delete(trimmed);
  decodedUrlSet.delete(trimmed);
}

if (typeof window !== 'undefined') {
  import('@/core/app/NoetherApp')
    .then(({ appInstance }) => {
      appInstance?.events?.on('document:deleted', ({ id, title }) => {
        evictCoverCache(id);
        if (title) evictCoverCache(title);
      });
    })
    .catch(() => {});
}

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
    img.referrerPolicy = 'no-referrer';
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
 * Normalizes and strips wikilink `![[...]]` or `[[...]]` wrappers, dimensions, and whitespace from a cover string.
 */
export function cleanCoverTarget(rawCover: string): string {
  if (!rawCover) return '';
  let trimmed = rawCover.trim();
  if (!trimmed) return '';

  // 1. Strip wikilink embed wrapper ![[...]] or [[...]]
  if (trimmed.startsWith('![[') && trimmed.endsWith(']]')) {
    trimmed = trimmed.slice(3, -2).trim();
  } else if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
    trimmed = trimmed.slice(2, -2).trim();
  }

  // 2. Strip markdown image wrapper ![alt](url)
  const mdMatch = trimmed.match(/^!\[.*?\]\((.*?)\)$/);
  if (mdMatch && mdMatch[1]) {
    trimmed = mdMatch[1].trim();
  }

  // 3. Strip wikilink alias / dimension if present: image.png|300 -> image.png
  if (trimmed.includes('|')) {
    trimmed = trimmed.split('|')[0].trim();
  }

  return trimmed;
}

/**
 * Resolves a raw cover string (URL, data URI, preset, or vault attachment) to a usable image source synchronously.
 *
 * @param rawCover - Raw frontmatter Cover value.
 * @param app - Central Noether application instance.
 * @returns Fully resolved image URI or empty string if asynchronous resolution is needed.
 */
export function resolveCoverSource(rawCover: string, app?: NoetherApp): string {
  if (!rawCover) return '';
  const cleaned = cleanCoverTarget(rawCover);
  if (!cleaned) return '';

  // 1. Check if it matches a preset (url or id)
  const preset = COVER_PRESETS.find((p) => p.id === cleaned || p.url === cleaned);
  if (preset) {
    const presetSrc = getPresetUrl(preset);
    preloadCoverImage(presetSrc);
    return presetSrc;
  }

  // 2. Fast-path: external web URLs, data URIs, local blob URIs, Tauri asset URIs, or static paths
  if (
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('blob:') ||
    cleaned.startsWith('asset://') ||
    cleaned.startsWith('/') ||
    cleaned.startsWith('./')
  ) {
    preloadCoverImage(cleaned);
    return cleaned;
  }

  // 3. Synchronous hit in embed-renderer image cache
  const cached = getCachedImageSrc(cleaned);
  if (cached) {
    preloadCoverImage(cached);
    return cached;
  }

  // 4. Check in-memory app documents if content_json happens to be present
  const documents = app?.vault?.documents;
  if (documents && documents.length > 0) {
    const cleanTarget = cleaned.toLowerCase();
    const cleanWithoutExt = cleanTarget.replace(/\.[a-zA-Z0-9]+$/, '');

    const matched = documents.find((d: DocumentItem) => {
      if (d.is_folder) return false;
      const titleLower = d.title.toLowerCase();
      return (
        titleLower === cleanTarget ||
        titleLower === cleanWithoutExt ||
        d.title === cleaned
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
      } catch {}
    }
  }

  // If not yet resolvable synchronously, return empty string so CoverBanner avoids relative 404s
  return '';
}

/**
 * Asynchronously resolves a raw cover string, querying SQLite / disk storage if not loaded in memory.
 *
 * @param rawCover - Raw frontmatter Cover value.
 * @param app - Central Noether application instance.
 * @returns Fully resolved image URI or null if not found.
 */
export async function resolveCoverSourceAsync(rawCover: string, app?: NoetherApp): Promise<string | null> {
  const syncHit = resolveCoverSource(rawCover, app);
  if (syncHit) return syncHit;

  const cleaned = cleanCoverTarget(rawCover);
  if (!cleaned) return null;

  // Fast-path for external URLs
  if (
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.startsWith('data:') ||
    cleaned.startsWith('blob:') ||
    cleaned.startsWith('asset://')
  ) {
    preloadCoverImage(cleaned);
    return cleaned;
  }

  // Check preset cache initialization
  const preset = COVER_PRESETS.find((p) => p.id === cleaned || p.url === cleaned);
  if (preset) {
    await initPresetCache();
    const presetSrc = getPresetUrl(preset);
    preloadCoverImage(presetSrc);
    return presetSrc;
  }

  // Asynchronously resolve vault image attachment from SQLite / documents
  try {
    const src = await resolveImageSrcAsync(cleaned);
    if (src) {
      preloadCoverImage(src);
      return src;
    }
  } catch {}

  return null;
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
      if (rawProps && !rawProps.includes('Cover') && !rawProps.includes('cover') && !rawProps.includes('banner')) continue;

      try {
        const parsed = typeof doc.properties === 'string'
          ? JSON.parse(doc.properties)
          : doc.properties;
        const coverVal = parsed?.Cover || parsed?.cover || parsed?.banner;
        if (coverVal && typeof coverVal === 'string') {
          resolveCoverSourceAsync(coverVal, app).catch(() => {});
        }
      } catch {
        // Skip unparseable frontmatter
      }
    }
  });
}
