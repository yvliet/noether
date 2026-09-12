/**
 * @module useMarketplaceQuery
 * @description
 * Stale-While-Revalidate (SWR) hook for querying community extensions from
 * the Noether extension registry (https://api.noethernotes.dev/api/v1/plugins).
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
  MarketplaceExtensionItem,
} from './marketplaceCatalogue';
import {
  Store01Icon,
  Motion01Icon,
  SparklesIcon,
  StickyNote02Icon,
  Brain02Icon,
  DatabaseSync01Icon,
  BookOpen02Icon,
  PencilEdit02Icon,
} from '@/components/common/Icons';
import { fetchTursoPlugins } from './tursoClient';
import type { ExtensionIconConfig } from '@/core/extensions/types';

export const PRIMARY_REGISTRY_URL = 'https://api.noethernotes.dev/api/v1/extensions';
export const LOCALHOST_DEV_URL = 'http://localhost:3001/api/v1/extensions';
export const STORAGE_CACHE_KEY = 'noether_marketplace_catalogue_cache';
export const STORAGE_CACHE_TIME_KEY = 'noether_marketplace_catalogue_cache_time';

export interface RawRegistryPlugin {
  id: string;
  name?: string;
  version?: string;
  author?: string;
  authorUrl?: string;
  repoUrl?: string;
  repo_url?: string;
  description?: string;
  downloads?: string | number;
  stars?: number;
  category?: string;
  icon?: string;
  iconConfig?: ExtensionIconConfig | string;
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
  isOffline: boolean;
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
      const customUrl = localStorage.getItem('noether_marketplace_registry_url');
      if (customUrl && customUrl.trim()) {
        return customUrl.trim();
      }
    } catch {
      // LocalStorage access restricted or unavailable
    }
  }

  const metaEnv = (import.meta as { env?: Record<string, string | undefined> })?.env;
  if (metaEnv?.VITE_NOETHER_REGISTRY_URL) {
    return metaEnv.VITE_NOETHER_REGISTRY_URL;
  }

  return PRIMARY_REGISTRY_URL;
}

/**
 * Resolves the secondary/development fallback endpoint.
 */
export function getDevRegistryUrl(): string {
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> })?.env;
  if (metaEnv?.VITE_NOETHER_DEV_REGISTRY_URL) {
    return metaEnv.VITE_NOETHER_DEV_REGISTRY_URL;
  }
  return LOCALHOST_DEV_URL;
}

/**
 * Creates a default icon node for dynamic registry extensions that do not
 * ship bundled SVG components.
 */
function createFallbackIcon(name: string, iconUrl?: string): React.ReactNode {
  if (iconUrl) {
    const lower = iconUrl.toLowerCase().trim();
    if (lower === 'motion' || lower === 'motion-01' || lower === 'motion01') {
      return React.createElement(Motion01Icon, { size: 18, className: 'text-[#38bdf8]' });
    }
    if (lower === 'book-open' || lower === 'book' || lower === 'bookopen02' || lower === 'book-open-02' || lower === 'cascade') {
      return React.createElement(BookOpen02Icon, { size: 18, className: 'text-[#38bdf8]' });
    }
    if (lower === 'sparkles' || lower === 'sparkle') {
      return React.createElement(SparklesIcon, { size: 18, className: 'text-[#a855f7]' });
    }
    if (lower === 'sticky-note-02' || lower === 'quicknote' || lower === 'sticky-note') {
      return React.createElement(StickyNote02Icon, { size: 18, className: 'text-[#eab308]' });
    }
    if (lower === 'brain-02' || lower === 'brain' || lower === 'fsrs') {
      return React.createElement(Brain02Icon, { size: 18, className: 'text-[#ec4899]' });
    }
    if (lower === 'pencil' || lower === 'pencil-edit' || lower === 'sketch2text' || lower === 'sketch') {
      return React.createElement(PencilEdit02Icon, { size: 18, className: 'text-[#38bdf8]' });
    }
    if (lower === 'cloud' || lower === 'sync' || lower === 'database' || lower === 'databasesync') {
      return React.createElement(DatabaseSync01Icon, { size: 18, className: 'text-[#3ecf8e]' });
    }
    if (iconUrl.startsWith('http://') || iconUrl.startsWith('https://') || iconUrl.startsWith('data:image')) {
      return React.createElement('img', {
        src: iconUrl,
        alt: name,
        className: 'w-4 h-4 object-contain rounded-xs select-none',
        loading: 'lazy',
      });
    }
  }

  return React.createElement(Store01Icon, { size: 18, className: 'text-[#dcddde]' });
}

/**
 * Normalizes raw remote items into strongly typed MarketplaceExtensionItem models.
 */
function normalizePluginItem(raw: RawRegistryPlugin): MarketplaceExtensionItem {
  let parsedIconConfig: ExtensionIconConfig | undefined = undefined;

  if (raw.iconConfig) {
    if (typeof raw.iconConfig === 'object') {
      parsedIconConfig = raw.iconConfig;
    } else if (typeof raw.iconConfig === 'string') {
      try {
        parsedIconConfig = JSON.parse(raw.iconConfig);
      } catch {}
    }
  }

  let rawIconValue = raw.icon;
  if (raw.icon && typeof raw.icon === 'string' && raw.icon.trim().startsWith('{') && raw.icon.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(raw.icon.trim());
      if (parsed && typeof parsed === 'object') {
        parsedIconConfig = { ...parsed, ...parsedIconConfig };
        rawIconValue = parsed.name || raw.icon;
      }
    } catch {}
  }

  const rawDownloads = raw.downloads;
  let formattedDownloads = '0';
  if (typeof rawDownloads === 'number') {
    formattedDownloads =
      rawDownloads >= 1000
        ? `${(rawDownloads / 1000).toFixed(1)}k`
        : String(rawDownloads);
  } else if (typeof rawDownloads === 'string' && rawDownloads.trim()) {
    formattedDownloads = rawDownloads.trim();
  }

  const categoryCandidate = raw.category || 'Productivity';
  const validCategories: Array<MarketplaceExtensionItem['category']> = [
    'Productivity',
    'Visualization',
    'Integration',
    'Formatting',
  ];
  const category = validCategories.includes(categoryCandidate as any)
    ? (categoryCandidate as MarketplaceExtensionItem['category'])
    : 'Productivity';

  let authorName = 'Community';
  let authorUrl = raw.authorUrl;

  if (typeof raw.author === 'string' && raw.author.trim()) {
    authorName = raw.author.trim();
  } else if (raw.author && typeof raw.author === 'object') {
    const authorObj = raw.author as { display_name?: string; github_username?: string };
    authorName = authorObj.display_name || authorObj.github_username || 'Community';
    if (!authorUrl && authorObj.github_username) {
      authorUrl = `https://github.com/${authorObj.github_username}`;
    }
  }

  const registryUrl = getRegistryUrl();
  const rootUrl = registryUrl.replace(/\/api\/v1\/plugins\/?$/, '').replace(/\/plugins\/?$/, '');
  const resolveUrl = (u?: string) => {
    if (!u) return undefined;
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
    return `${rootUrl}${u.startsWith('/') ? '' : '/'}${u}`;
  };

  const rawJsUrl = raw.mainJsUrl || raw.downloadUrl || raw.assetUrl;

  return {
    id: raw.id,
    name: raw.name || raw.id,
    version: raw.version || '1.0.0',
    author: authorName,
    authorUrl,
    repoUrl: raw.repoUrl || raw.repo_url,
    description: raw.description || '',
    downloads: formattedDownloads,
    stars: typeof raw.stars === 'number' ? raw.stars : 5,
    category,
    icon: rawIconValue,
    iconConfig: parsedIconConfig,
    featured: raw.featured ?? false,
    readme: raw.readme,
    bannerImage: raw.bannerImage,
    mainJsUrl: resolveUrl(rawJsUrl) || `${registryUrl}/${raw.id}/bundle`,
    manifestUrl: resolveUrl(raw.manifestUrl) || `${registryUrl}/${raw.id}/manifest.json`,
    stylesCssUrl: resolveUrl(raw.stylesCssUrl) || `${registryUrl}/${raw.id}/styles`,
    downloadUrl: resolveUrl(raw.downloadUrl) || `${registryUrl}/${raw.id}/download`,
  };
}

const CORE_EXTENSION_IDS = new Set([
  'sync',
  'noether-sync',
  'graph',
  'canvas',
  'tasks',
  'journal',
  'backlinks',
  'tags',
  'outline',
  'properties',
  'tables',
  'bookmarks',
  'marketplace',
  'more-icons',
  'iconify',
  'sketch',
  'default-commands',
]);

/**
 * Normalizes an extension ID for collision-free deduplication and lookup.
 * Strips prefix and maps aliases so 'quicknote' matches 'noether-quicknote',
 * and 'fsrs-spaced-repetition' matches 'noether-fsrs'.
 */
function normalizeExtensionLookupKey(id: string): string {
  const stripped = id.trim().toLowerCase().replace(/^noether-/, '').replace(/^flint-/, '');
  if (stripped === 'fsrs' || stripped === 'fsrs-spaced-repetition' || stripped === 'spaced-repetition') {
    return 'fsrs';
  }
  if (stripped === 'quicknote') {
    return 'quicknote';
  }
  if (stripped === 'cascade') {
    return 'cascade';
  }
  if (stripped === 'copilot') {
    return 'copilot';
  }
  if (stripped === 'sketch2text' || stripped === 'sketch-to-text') {
    return 'sketch2text';
  }
  return stripped;
}

/**
 * Normalizes and deduplicates a list of remote registry plugins.
 * Excludes built-in native core extensions and deduplicates aliased IDs.
 */
function mergeCatalogue(remoteItems: RawRegistryPlugin[]): MarketplaceExtensionItem[] {
  const seenKeys = new Set<string>();
  const merged: MarketplaceExtensionItem[] = [];

  for (const raw of remoteItems) {
    if (!raw.id) continue;
    const lookupKey = normalizeExtensionLookupKey(raw.id);
    if (seenKeys.has(lookupKey) || CORE_EXTENSION_IDS.has(raw.id) || CORE_EXTENSION_IDS.has(lookupKey)) continue;
    seenKeys.add(lookupKey);
    merged.push(normalizePluginItem(raw));
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
    return { items: [], timestamp: null };
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

  return { items: [], timestamp: null };
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
      repoUrl: item.repoUrl,
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
      icon: typeof item.icon === 'string' ? item.icon : undefined,
      iconConfig: item.iconConfig,
      // Readmes are excluded to preserve localStorage quota and prevent quota exceeded errors
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
    if (data && Array.isArray(data.items)) {
      return data.items;
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
 * Hook providing stale-while-revalidate fetching for Noether community extensions.
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
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [error, setError] = useState<Error | null>(null);

  const fetchRegistry = useCallback(async () => {
    // Only attempt fetch if online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
      return;
    }
    setIsOffline(false);

    setIsUpdating(true);
    setIsError(false);
    setError(null);

    const primaryUrl = getRegistryUrl();
    const devUrl = getDevRegistryUrl();

    let rawPlugins: RawRegistryPlugin[] | null = null;
    let fetchError: Error | null = null;

    // 1. If custom registry endpoint is configured, query it first
    const hasCustomRegistry = primaryUrl !== PRIMARY_REGISTRY_URL;
    if (hasCustomRegistry) {
      try {
        rawPlugins = await fetchRegistryEndpoint(primaryUrl);
      } catch (err: any) {
        fetchError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[useMarketplaceQuery] Custom registry (${primaryUrl}) request failed:`, err);
      }
    }

    // 2. Direct Turso libSQL edge database query (fast production registry)
    if (!rawPlugins) {
      try {
        rawPlugins = await fetchTursoPlugins();
      } catch (tursoErr) {
        console.warn('[useMarketplaceQuery] Direct Turso query failed:', tursoErr);
      }
    }

    // 3. Primary HTTP endpoint attempt (if Turso failed and not already attempted)
    if (!rawPlugins && !hasCustomRegistry) {
      try {
        rawPlugins = await fetchRegistryEndpoint(primaryUrl, 2500);
      } catch (err: any) {
        fetchError = err instanceof Error ? err : new Error(String(err));
      }
    }

    // 4. Localhost development fallback if primary endpoint fails
    if (!rawPlugins && primaryUrl !== devUrl) {
      try {
        rawPlugins = await fetchRegistryEndpoint(devUrl, 1500);
      } catch {
        // Fallback also failed; retain primary error
      }
    }

    // 4. Process results or record failure
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

  // Revalidate automatically when network connectivity returns or goes offline
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOffline(false);
      console.info('[useMarketplaceQuery] Network restored; revalidating catalogue...');
      fetchRegistry();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchRegistry]);

  return {
    extensions,
    isLoading: false, // Always instant due to SWR synchronous cache initialization
    isUpdating,
    isError,
    isOffline,
    error,
    lastUpdated,
    refetch: fetchRegistry,
  };
}

export default useMarketplaceQuery;
