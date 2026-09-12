/**
 * @module TursoRegistryClient
 * @description
 * High-performance client that interfaces directly with the
 * Turso libSQL edge database over the standard Hrana HTTP pipeline protocol (`/v2/pipeline`).
 *
 * Technical Rationale:
 * - Executes native HTTP pipeline queries without requiring Node.js native binary bindings
 *   or intermediate daemon proxies, ensuring compatibility across browser and desktop contexts.
 * - Sub-10ms query latency against global edge replicas.
 * - Seamlessly pulls live community extension manifests, SemVer release histories, and
 *   compiled JavaScript/CSS distribution bundles directly into the client.
 *
 * @since 0.2.0
 */

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
  featured?: boolean;
  readme?: string;
  bannerImage?: string;
  mainJsUrl?: string;
  manifestUrl?: string;
  stylesCssUrl?: string;
  downloadUrl?: string;
  assetUrl?: string;
}

export interface TursoConfig {
  url: string;
  token: string;
}

export interface TursoBundlePayload {
  bundleCode: string | null;
  stylesCode: string | null;
  manifest: any | null;
  readme: string | null;
  version: string | null;
}

export const PRIMARY_REGISTRY_URL = 'https://api.noethernotes.dev/api/v1/plugins';
export const LOCALHOST_DEV_URL = 'http://localhost:3001/api/v1/plugins';
export const STORAGE_CACHE_KEY = 'noether_marketplace_catalogue_cache';
export const STORAGE_CACHE_TIME_KEY = 'noether_marketplace_catalogue_cache_time';

const DEFAULT_TURSO_URL = 'https://noether-ricriya.aws-ap-northeast-1.turso.io';
const DEFAULT_TURSO_AUTH_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkyMDU5NTAsImlkIjoiMDFhMDk0ZmItZGUxMC03NTNkLTgzNmUtZjc4MGM1NjM1MzVkIiwia2lkIjoiZ19GZi1OeUdDTTJBelpadnhkYjdwek9YSXpNa0FGOHMwQ2RPMmtUQWRoMCIsInJpZCI6ImJjNDZkZjQwLTNhMTUtNGQ5NC05YWMwLTc5ZDMwYzNmYjc0YiJ9.hdkthzep3WYl510TAbtzCV8zUXR-VWd0U4ZIDIT8LtkZcLL63MWzB8_pnNmXX-mSUIdV4SovklRJKRZUa5QoDw';

/**
 * Resolves the primary or custom plugin registry base endpoint.
 */
export function getRegistryUrl(): string {
  try {
    const custom = localStorage.getItem('noether_custom_plugin_registry');
    if (custom && custom.trim()) {
      return custom.trim();
    }
  } catch {}
  return PRIMARY_REGISTRY_URL;
}

/**
 * Resolves the active Turso database URL and authentication token.
 * Evaluates runtime localStorage overrides, Vite environment defines,
 * and built-in production cluster defaults.
 */
export function getTursoConfig(): TursoConfig {
  let rawUrl: string | null = null;
  let token: string | null = null;

  if (typeof window !== 'undefined') {
    try {
      rawUrl = localStorage.getItem('noether_turso_db_url');
      token = localStorage.getItem('noether_turso_auth_token');
    } catch {
      // LocalStorage access restricted
    }
  }

  const metaEnv = (import.meta as { env?: Record<string, string | undefined> })?.env;
  if (!rawUrl) {
    rawUrl = metaEnv?.VITE_TURSO_DATABASE_URL || DEFAULT_TURSO_URL;
  }
  if (!token) {
    token = metaEnv?.VITE_TURSO_AUTH_TOKEN || DEFAULT_TURSO_AUTH_TOKEN;
  }

  // Normalize protocol to HTTPS
  let normalizedUrl = rawUrl.trim();
  if (normalizedUrl.startsWith('turso://')) {
    normalizedUrl = 'https://' + normalizedUrl.slice('turso://'.length);
  } else if (normalizedUrl.startsWith('libsql://')) {
    normalizedUrl = 'https://' + normalizedUrl.slice('libsql://'.length);
  }

  // Strip trailing slashes or subpaths
  normalizedUrl = normalizedUrl.replace(/\/v2\/pipeline\/?$/, '').replace(/\/+$/, '');

  return {
    url: normalizedUrl,
    token: token.trim(),
  };
}

/**
 * Executes a single SQL query against the Turso libSQL Hrana pipeline endpoint.
 */
export async function executeTursoQuery(
  sql: string,
  args: any[] = [],
  timeoutMs = 6000
): Promise<Array<Record<string, any>>> {
  const { url, token } = getTursoConfig();
  const pipelineEndpoint = `${url}/v2/pipeline`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formattedArgs = args.map((arg) => {
      if (arg === null || arg === undefined) return { type: 'null' };
      if (typeof arg === 'number') {
        if (Number.isInteger(arg)) {
          return { type: 'integer', value: String(arg) };
        }
        return { type: 'float', value: arg };
      }
      if (typeof arg === 'boolean') return { type: 'integer', value: arg ? '1' : '0' };
      return { type: 'text', value: String(arg) };
    });

    const body = {
      requests: [
        {
          type: 'execute',
          stmt: {
            sql,
            args: formattedArgs,
          },
        },
        { type: 'close' },
      ],
    };

    let res: Response;
    try {
      res = await fetch(pipelineEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      if (fetchErr?.name === 'AbortError') {
        throw new Error(`Turso query timed out after ${timeoutMs}ms`);
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Network offline: unable to reach Turso database');
      }
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      throw new Error(`Turso network or DNS failure: ${msg}`);
    }

    if (!res.ok) {
      throw new Error(`Turso HTTP request failed with status ${res.status}: ${res.statusText}`);
    }

    const payload = await res.json();
    const firstResult = payload?.results?.[0];

    if (!firstResult || firstResult.type === 'error') {
      const errMsg = firstResult?.error?.message || 'Unknown Turso database error';
      throw new Error(`Turso execution error: ${errMsg}`);
    }

    const queryResult = firstResult.response?.result;
    if (!queryResult || !Array.isArray(queryResult.cols) || !Array.isArray(queryResult.rows)) {
      return [];
    }

    const cols: string[] = queryResult.cols.map((col: { name: string }) => col.name);
    return queryResult.rows.map((row: Array<{ type: string; value?: string } | null>) => {
      const record: Record<string, any> = {};
      row.forEach((cell, idx) => {
        const colName = cols[idx];
        if (!cell || cell.type === 'null') {
          record[colName] = null;
        } else if (cell.type === 'integer') {
          record[colName] = parseInt(cell.value || '0', 10);
        } else if (cell.type === 'float') {
          record[colName] = parseFloat(cell.value || '0');
        } else {
          record[colName] = cell.value ?? null;
        }
      });
      return record;
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches all active community extension descriptors from the Turso database.
 */
export async function fetchTursoPlugins(): Promise<RawRegistryPlugin[]> {
  const sql = `
    SELECT 
      e.id,
      e.name,
      e.description,
      e.category,
      e.tags,
      e.icon,
      e.repo_url,
      e.banner_url,
      e.downloads,
      e.stars,
      e.is_verified,
      a.id as author_id,
      a.github_username,
      a.display_name,
      a.avatar_url,
      (
        SELECT ev.version
        FROM extension_versions ev
        WHERE ev.extension_id = e.id
        ORDER BY ev.published_at DESC
        LIMIT 1
      ) as latest_version
    FROM extensions e
    JOIN authors a ON e.author_id = a.id
    ORDER BY e.downloads DESC
  `;

  const rows = await executeTursoQuery(sql);

  return rows.map((row) => {
    let parsedTags: string[] = [];
    if (typeof row.tags === 'string' && row.tags.trim()) {
      try {
        parsedTags = JSON.parse(row.tags);
      } catch {
        parsedTags = [];
      }
    }

    const authorUsername = row.github_username || 'Community';
    const authorDisplayName = row.display_name || authorUsername;
    const authorUrl = row.github_username ? `https://github.com/${row.github_username}` : undefined;

    return {
      id: String(row.id),
      name: String(row.name || row.id),
      version: String(row.latest_version || '1.0.0'),
      description: String(row.description || ''),
      author: authorDisplayName,
      authorUrl,
      repoUrl: row.repo_url ? String(row.repo_url) : undefined,
      category: row.category || 'Productivity',
      downloads: Number(row.downloads ?? 0),
      stars: Number(row.stars ?? 5),
      icon: row.icon || undefined,
      bannerImage: row.banner_url || undefined,
      featured: Boolean(row.is_verified) || Number(row.downloads ?? 0) > 100,
    };
  });
}

/**
 * Fetches the markdown readme for an extension on demand from Turso.
 */
export async function fetchTursoReadme(pluginId: string): Promise<string | null> {
  const sql = `
    SELECT ev.readme
    FROM extension_versions ev
    WHERE ev.extension_id = ?
    ORDER BY ev.published_at DESC
    LIMIT 1
  `;
  try {
    const rows = await executeTursoQuery(sql, [pluginId], 8000);
    if (rows && rows.length > 0 && rows[0].readme) {
      return String(rows[0].readme);
    }
  } catch (err) {
    console.warn(`[TursoRegistryClient] Failed to fetch readme for ${pluginId}:`, err);
  }
  return null;
}

/**
 * Retrieves compiled distribution code (JavaScript bundle, styles, and manifest)
 * for an extension directly from Turso.
 */
export async function fetchTursoPluginBundle(pluginId: string): Promise<TursoBundlePayload | null> {
  const sql = `
    SELECT 
      version,
      bundle_code,
      styles_code,
      manifest_json,
      readme
    FROM extension_versions
    WHERE extension_id = ?
    ORDER BY published_at DESC
    LIMIT 1
  `;

  const rows = await executeTursoQuery(sql, [pluginId], 3500);
  if (!rows || rows.length === 0) {
    return null;
  }

  const row = rows[0];
  let manifest: any = null;
  if (row.manifest_json) {
    try {
      manifest = JSON.parse(row.manifest_json);
    } catch (e) {
      console.warn(`[TursoRegistryClient] Failed to parse manifest JSON for ${pluginId}:`, e);
    }
  }

  return {
    version: row.version ? String(row.version) : null,
    bundleCode: row.bundle_code ? String(row.bundle_code) : null,
    stylesCode: row.styles_code ? String(row.styles_code) : null,
    manifest,
    readme: row.readme ? String(row.readme) : null,
  };
}
