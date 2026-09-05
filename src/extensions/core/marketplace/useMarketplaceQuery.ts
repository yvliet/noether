/**
 * @module useMarketplaceQuery
 * @description
 * Stale-While-Revalidate (SWR) hook for querying community extensions from
 * the Flint extension registry (https://api.flintnotes.com/api/v1/plugins).
 *
 * Performance and Offline Strategy:
 * - Synchronously initializes from cached storage or built-in catalogue for 0ms initial render latency.
 * - Asynchronously revalidates against the remote registry when network connectivity is present.
 * - Automatically re-syncs upon browser/desktop 'online' events.
 * - Provides graceful fallback to localhost development server and offline catalogue during network degradation.
 *
 * @since 0.2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  COMMUNITY_MARKETPLACE_CATALOGUE,
  MarketplaceExtensionItem,
} from './marketplaceCatalogue';
import { Store01Icon } from '@/components/common/Icons';

export const PRIMARY_REGISTRY_URL = 'https://api.flintnotes.com/api/v1/plugins';
export const LOCALHOST_DEV_URL = 'http://localhost:8787/api/v1/plugins';
export const STORAGE_CACHE_KEY = 'flint_marketplace_catalogue_cache';
export const STORAGE_CACHE_TIME_KEY = 'flint_marketplace_catalogue_cache_time';

export interface RawRegistryPlugin {
  id: string;
  name?: string;
  version?: string;
  author?: string;
  authorUrl?: string;
  description?: string;
  downloads?: string | number;
  stars?: number;
  category?: string;
  icon?: string;
  featured?: boolean;
  readme?: string;
  bannerImage?: string;
  mainJsUrl?: string;
  manifestUrl?: string;
  stylesCssUrl?: string;
  downloadUrl?: string;
  assetUrl?: string;
}

export interface MarketplaceQueryResult {
  extensions: MarketplaceExtensionItem[];
  isLoading: boolean;
  isUpdating: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
}

/**
 * Resolves the active registry URL based on local storage overrides,
 * environment configuration, or the default production registry endpoint.
 */
export function getRegistryUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const customUrl = localStorage.getItem('flint_marketplace_registry_url');
      if (customUrl && customUrl.trim()) {
        return customUrl.trim();
      }
    } catch {
      // LocalStorage access restricted or unavailable
    }
  }

  const metaEnv = (import.meta as { env?: Record<string, string | undefined> })?.env;
  if (metaEnv?.VITE_FLINT_REGISTRY_URL) {
    return metaEnv.VITE_FLINT_REGISTRY_URL;
  }

  return PRIMARY_REGISTRY_URL;
}

/**
 * Resolves the secondary/development fallback endpoint.
 */
export function getDevRegistryUrl(): string {
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> })?.env;
  if (metaEnv?.VITE_FLINT_DEV_REGISTRY_URL) {
    return metaEnv.VITE_FLINT_DEV_REGISTRY_URL;
  }
  return LOCALHOST_DEV_URL;
}

/**
 * Creates a default icon node for dynamic registry extensions that do not
 * ship bundled SVG components.
 */
function createFallbackIcon(name: string, iconUrl?: string): React.ReactNode {
  if (iconUrl && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://') || iconUrl.startsWith('data:image'))) {
    return React.createElement('img', {
      src: iconUrl,
      alt: name,
      className: 'w-4 h-4 object-contain rounded-xs select-none',
      loading: 'lazy',
    });
  }

  return React.createElement(Store01Icon, { size: 18, className: 'text-[#dcddde]' });
}

/**
 * Normalizes raw remote items into strongly typed MarketplaceExtensionItem models,
 * preserving custom rich icons from the local bundled catalogue whenever IDs match.
 */
function normalizePluginItem(
  raw: RawRegistryPlugin,
  catalogueMap: Map<string, MarketplaceExtensionItem>
): MarketplaceExtensionItem {
  const localItem = catalogueMap.get(raw.id);

  const rawDownloads = raw.downloads;
  let formattedDownloads = '0';
  if (typeof rawDownloads === 'number') {
    formattedDownloads =
      rawDownloads >= 1000
        ? `${(rawDownloads / 1000).toFixed(1)}k`
        : String(rawDownloads);
  } else if (typeof rawDownloads === 'string' && rawDownloads.trim()) {
    formattedDownloads = rawDownloads.trim();
  } else if (localItem) {
    formattedDownloads = localItem.downloads;
  }

  const categoryCandidate = raw.category || localItem?.category || 'Productivity';
  const validCategories: Array<MarketplaceExtensionItem['category']> = [
    'Productivity',
    'Visualization',
    'Integration',
    'Formatting',
  ];
  const category = validCategories.includes(categoryCandidate as any)
    ? (categoryCandidate as MarketplaceExtensionItem['category'])
    : 'Productivity';

  return {
    id: raw.id,
    name: raw.name || localItem?.name || raw.id,
    version: raw.version || localItem?.version || '1.0.0',
    author: raw.author || localItem?.author || 'Community',
    authorUrl: raw.authorUrl || localItem?.authorUrl,
    description: raw.description || localItem?.description || '',
    downloads: formattedDownloads,
    stars: typeof raw.stars === 'number' ? raw.stars : localItem?.stars ?? 5,
    category,
    icon: localItem?.icon || createFallbackIcon(raw.name || raw.id, raw.icon),
    featured: raw.featured ?? localItem?.featured ?? false,
    readme: raw.readme || localItem?.readme,
    bannerImage: raw.bannerImage || localItem?.bannerImage,
    mainJsUrl: raw.mainJsUrl || raw.downloadUrl || raw.assetUrl,
    manifestUrl: raw.manifestUrl,
    stylesCssUrl: raw.stylesCssUrl,
    downloadUrl: raw.downloadUrl || raw.assetUrl,
  };
}

/**
 * Merges a list of remote registry plugins with the built-in offline catalogue,
 * ensuring all first-party extensions remain accessible even if omitted from the remote response.
 */
function mergeCatalogue(remoteItems: RawRegistryPlugin[]): MarketplaceExtensionItem[] {
  const catalogueMap = new Map<string, MarketplaceExtensionItem>();
  for (const item of COMMUNITY_MARKETPLACE_CATALOGUE) {
    catalogueMap.set(item.id, item);
  }

  const seenIds = new Set<string>();
  const merged: MarketplaceExtensionItem[] = [];

  for (const raw of remoteItems) {
    if (!raw.id || seenIds.has(raw.id)) continue;
    seenIds.add(raw.id);
    merged.push(normalizePluginItem(raw, catalogueMap));
  }

  // Ensure built-in offline items are never lost
  for (const item of COMMUNITY_MARKETPLACE_CATALOGUE) {
    if (!seenIds.has(item.id)) {
      merged.push(item);
      seenIds.add(item.id);
    }
  }

  return merged;
}

/**
 * Loads cached catalogue from localStorage synchronously to ensure instant 0ms render.
 */
function loadCachedExtensions(): {
  items: MarketplaceExtensionItem[];
  timestamp: number | null;
} {
  if (typeof window === 'undefined') {
    return { items: COMMUNITY_MARKETPLACE_CATALOGUE, timestamp: null };
  }

  try {
    const rawCache = localStorage.getItem(STORAGE_CACHE_KEY);
    const rawTime = localStorage.getItem(STORAGE_CACHE_TIME_KEY);
    const timestamp = rawTime ? parseInt(rawTime, 10) : null;

    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          items: mergeCatalogue(parsed),
          timestamp,
        };
      }
    }
  } catch (e) {
    console.warn('[useMarketplaceQuery] Failed to read cached catalogue:', e);
  }

  return { items: COMMUNITY_MARKETPLACE_CATALOGUE, timestamp: null };
}

/**
 * Persists serializable registry metadata to localStorage for offline access.
 */
function persistCache(extensions: MarketplaceExtensionItem[]): void {
  if (typeof window === 'undefined') return;

  try {
    const serializable = extensions.map((item) => ({
      id: item.id,
      name: item.name,
      version: item.version,
      author: item.author,
      authorUrl: item.authorUrl,
      description: item.description,
      downloads: item.downloads,
      stars: item.stars,
      category: item.category,
      featured: item.featured,
      bannerImage: item.bannerImage,
      mainJsUrl: item.mainJsUrl,
      manifestUrl: item.manifestUrl,
      stylesCssUrl: item.stylesCssUrl,
      downloadUrl: item.downloadUrl,
      readme: item.readme && item.readme.length < 50000 ? item.readme : undefined,
    }));

    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(serializable));
    localStorage.setItem(STORAGE_CACHE_TIME_KEY, String(Date.now()));
  } catch (e) {
    console.warn('[useMarketplaceQuery] Failed to persist cache:', e);
  }
}

/**
 * Fetches plugins from an API endpoint with an explicit timeout.
 */
async function fetchRegistryEndpoint(url: string, timeoutMs = 6000): Promise<RawRegistryPlugin[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Registry responded with HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.plugins)) {
      return data.plugins;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }

    throw new Error('Unrecognized registry response schema; expected array of plugin descriptors.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Hook providing stale-while-revalidate fetching for Flint community extensions.
 */
export function useMarketplaceQuery(): MarketplaceQueryResult {
  const initialDataRef = useRef<{
    items: MarketplaceExtensionItem[];
    timestamp: number | null;
  } | null>(null);

  if (!initialDataRef.current) {
    initialDataRef.current = loadCachedExtensions();
  }

  const [extensions, setExtensions] = useState<MarketplaceExtensionItem[]>(
    initialDataRef.current.items
  );
  const [lastUpdated, setLastUpdated] = useState<number | null>(
    initialDataRef.current.timestamp
  );
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRegistry = useCallback(async () => {
    // Only attempt fetch if online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    setIsUpdating(true);
    setIsError(false);
    setError(null);

    const primaryUrl = getRegistryUrl();
    const devUrl = getDevRegistryUrl();

    let rawPlugins: RawRegistryPlugin[] | null = null;
    let fetchError: Error | null = null;

    // 1. Primary endpoint attempt
    try {
      rawPlugins = await fetchRegistryEndpoint(primaryUrl);
    } catch (err: any) {
      fetchError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[useMarketplaceQuery] Primary registry (${primaryUrl}) request failed:`, err);
    }

    // 2. Localhost development fallback if primary endpoint fails
    if (!rawPlugins && primaryUrl !== devUrl) {
      try {
        console.info(`[useMarketplaceQuery] Attempting localhost fallback (${devUrl})...`);
        rawPlugins = await fetchRegistryEndpoint(devUrl, 2500);
      } catch {
        // Fallback also failed; retain primary error
      }
    }

    // 3. Process results or record failure
    if (rawPlugins) {
      const merged = mergeCatalogue(rawPlugins);
      setExtensions(merged);
      const now = Date.now();
      setLastUpdated(now);
      persistCache(merged);
      setIsError(false);
      setError(null);
    } else if (fetchError) {
      setIsError(true);
      setError(fetchError);
    }

    setIsUpdating(false);
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  // Revalidate automatically when network connectivity returns
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.info('[useMarketplaceQuery] Network restored; revalidating catalogue...');
      fetchRegistry();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchRegistry]);

  return {
    extensions,
    isLoading: false, // Always instant due to SWR synchronous cache initialization
    isUpdating,
    isError,
    error,
    lastUpdated,
    refetch: fetchRegistry,
  };
}

export default useMarketplaceQuery;
