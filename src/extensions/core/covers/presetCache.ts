/**
 * @module presetCache
 * @description
 * Resilient client-side offline storage and setup downloader for Covers presets.
 * Presets are fetched and stored as Blobs in IndexedDB rather than bundling
 * large image binary files into the Noether core desktop repository.
 *
 * Performance & Responsiveness Invariants:
 * - Zero Binary Bloat: Keeps Noether repository and release binaries lightweight.
 * - Frame-0 In-Memory Blob URLs: Decoded blob URLs are retained in memory across views.
 * - Non-Blocking Idle Setup: Downloads missing presets during idle frames on extension setup.
 *
 * @since 1.1.0
 */

import { CoverPreset } from './presets';

const DB_NAME = 'noether_covers_presets';
const DB_VERSION = 1;
const STORE_NAME = 'presets';

interface CachedPresetRecord {
  id: string;
  imageBlob: Blob;
  thumbBlob?: Blob;
  contentType: string;
  cachedAt: number;
}

/** In-memory mapping of preset ID to generated object URLs for instant access */
const activeObjectUrls = new Map<string, string>();
const activeThumbObjectUrls = new Map<string, string>();
const cachedIdSet = new Set<string>();
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Open or upgrade the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not available in this environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open preset cache database.'));
  });
}

/**
 * Initializes the preset cache in memory, loading all existing cached preset blob URLs.
 */
export async function initPresetCache(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const db = await openDatabase();
      const records = await new Promise<CachedPresetRecord[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      for (const record of records) {
        cachedIdSet.add(record.id);
        if (record.imageBlob && !activeObjectUrls.has(record.id)) {
          activeObjectUrls.set(record.id, URL.createObjectURL(record.imageBlob));
        }
        if (record.thumbBlob && !activeThumbObjectUrls.has(record.id)) {
          activeThumbObjectUrls.set(record.id, URL.createObjectURL(record.thumbBlob));
        }
      }

      isInitialized = true;
    } catch (err) {
      console.warn('[Covers:presetCache] Failed to initialize preset cache from IndexedDB:', err);
    }
  })();

  return initPromise;
}

/**
 * Synchronous check whether a preset is currently cached in memory/IndexedDB.
 */
export function isPresetCached(id: string): boolean {
  return cachedIdSet.has(id);
}

/**
 * Get count of presets currently stored in the offline cache.
 */
export function getCachedPresetCount(): number {
  return cachedIdSet.size;
}

/**
 * Resolves the display URL for a preset, preferring the offline local blob URL if cached.
 */
export function getPresetUrl(preset: CoverPreset): string {
  return activeObjectUrls.get(preset.id) || preset.url;
}

/**
 * Resolves the thumbnail URL for a preset, preferring the offline local thumbnail blob if cached.
 */
export function getPresetThumbUrl(preset: CoverPreset): string {
  return activeThumbObjectUrls.get(preset.id) || preset.thumbnail;
}

/**
 * Downloads a single preset (full image and thumbnail) and persists it into IndexedDB.
 */
export async function downloadPreset(preset: CoverPreset): Promise<{ success: boolean; error?: string }> {
  try {
    await initPresetCache();

    // Fetch full image and thumbnail concurrently
    const [imageRes, thumbRes] = await Promise.all([
      fetch(preset.url),
      fetch(preset.thumbnail).catch(() => null),
    ]);

    if (!imageRes.ok) {
      return {
        success: false,
        error: `Failed to download image for ${preset.name}: HTTP ${imageRes.status}`,
      };
    }

    const imageBlob = await imageRes.blob();
    const thumbBlob = thumbRes && thumbRes.ok ? await thumbRes.blob() : imageBlob;

    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: CachedPresetRecord = {
        id: preset.id,
        imageBlob,
        thumbBlob,
        contentType: imageBlob.type || 'image/jpeg',
        cachedAt: Date.now(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Revoke previous URLs if any
    const prevImage = activeObjectUrls.get(preset.id);
    if (prevImage) URL.revokeObjectURL(prevImage);
    const prevThumb = activeThumbObjectUrls.get(preset.id);
    if (prevThumb) URL.revokeObjectURL(prevThumb);

    // Register active blob URLs
    activeObjectUrls.set(preset.id, URL.createObjectURL(imageBlob));
    activeThumbObjectUrls.set(preset.id, URL.createObjectURL(thumbBlob));
    cachedIdSet.add(preset.id);

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || `Failed to download preset ${preset.name}`,
    };
  }
}

/**
 * Downloads all presets for offline storage on setup.
 *
 * @param presets - List of presets to download.
 * @param onProgress - Optional callback reporting (completed, total).
 */
export async function downloadAllPresets(
  presets: CoverPreset[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ successCount: number; failedCount: number }> {
  await initPresetCache();

  let completed = 0;
  let successCount = 0;
  let failedCount = 0;

  for (const preset of presets) {
    if (isPresetCached(preset.id)) {
      completed++;
      successCount++;
      if (onProgress) onProgress(completed, presets.length);
      continue;
    }

    const res = await downloadPreset(preset);
    if (res.success) {
      successCount++;
    } else {
      failedCount++;
    }

    completed++;
    if (onProgress) onProgress(completed, presets.length);
  }

  return { successCount, failedCount };
}

/**
 * Clears all presets from the local offline cache.
 */
export async function clearPresetCache(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    for (const url of activeObjectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    for (const url of activeThumbObjectUrls.values()) {
      URL.revokeObjectURL(url);
    }

    activeObjectUrls.clear();
    activeThumbObjectUrls.clear();
    cachedIdSet.clear();
  } catch (err) {
    console.warn('[Covers:presetCache] Failed to clear preset cache:', err);
  }
}
