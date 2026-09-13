/**
 * @module WallhavenService
 * @description
 * High-performance client service for querying high-resolution wallpapers from Wallhaven.
 * Provides instant search, category filtering, and image resolution extraction.
 *
 * @since 1.0.0
 */

export interface WallhavenWallpaper {
  id: string;
  url: string;
  path: string;
  thumbSmall: string;
  thumbLarge: string;
  resolution: string;
  category: string;
}

export interface WallhavenSearchResult {
  success: boolean;
  data: WallhavenWallpaper[];
  error?: string;
}

const WALLHAVEN_API_BASE = 'https://wallhaven.cc/api/v1/search';

/**
 * Searches Wallhaven wallpapers using public SFW API.
 *
 * @param query - Keyword search term (e.g. "pixel art", "nature", "cyberpunk")
 * @param page - Page number (default: 1)
 * @param apiKey - Optional Wallhaven user API key
 * @param timeoutMs - Network timeout in milliseconds (default: 7000ms)
 */
export async function searchWallhaven(
  query: string = 'pixel art',
  page: number = 1,
  apiKey?: string,
  timeoutMs: number = 7000
): Promise<WallhavenSearchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      q: query.trim() || 'pixel art',
      purity: '100', // SFW only
      categories: '110', // General + Anime
      sorting: 'toplist',
      order: 'desc',
      page: String(page),
    });

    if (apiKey && apiKey.trim()) {
      params.append('apikey', apiKey.trim());
    }

    const res = await fetch(`${WALLHAVEN_API_BASE}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        data: [],
        error: `Wallhaven API error: HTTP ${res.status}`,
      };
    }

    const payload = await res.json();
    const items: WallhavenWallpaper[] = (payload.data || []).map((item: any) => ({
      id: item.id,
      url: item.url,
      path: item.path,
      thumbSmall: item.thumbs?.small || item.path,
      thumbLarge: item.thumbs?.large || item.thumbs?.original || item.path,
      resolution: item.resolution || `${item.dimension_x}x${item.dimension_y}`,
      category: item.category || 'general',
    }));

    return {
      success: true,
      data: items,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        data: [],
        error: 'Wallhaven request timed out. Please check your internet connection or use offline presets.',
      };
    }
    return {
      success: false,
      data: [],
      error: err.message || 'Failed to connect to Wallhaven.',
    };
  }
}
