/**
 * @module readmeResolver
 * @description
 * Multi-tier documentation and README resolver for Flint extensions.
 *
 * Technical Rationale:
 * - Dynamically resolves raw markdown from live GitHub repositories (e.g. raw.githubusercontent.com)
 *   so extension authors only maintain their standard root README.md, without needing static .ts files.
 * - Caches retrieved documentation in localStorage with 0ms initial render for offline resilience.
 * - Rewrites relative image links in GitHub markdown to raw CDN assets so media displays correctly.
 * - Queries the Turso edge database registry as a secondary fallback if GitHub is unreachable.
 */

export interface ExtensionResolvedMeta {
  id: string;
  name: string;
  version: string;
  author: string;
  authorUrl?: string;
  repoUrl?: string;
  description: string;
  tags: string[];
  bannerImage?: string;
  readme?: string;
  isInstalled: boolean;
  isCore: boolean;
}

const DEFAULT_TURSO_URL = 'https://flint-ricriya.aws-ap-northeast-1.turso.io';
const DEFAULT_TURSO_AUTH_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg2MzIxNDUsImlkIjoiMDFhMDcyYzEtMmUxMC03MTViLTk1ZDEtNmYyNzc5YWNiYjI0Iiwia2lkIjoiZ19GZi1OeUdDTTJBelpadnhkYjdwek9YSXpNa0FGOHMwQ2RPMmtUQWRoMCIsInJpZCI6IjQ1MjJhZjNiLTdlOTEtNDJkYi05M2Y5LWVkNzRjY2RkYmJiMiJ9.HZ8mk6RKqstJB-66oCYu6XP5pGreS2tEfQ5xX0vjB0RYwDYVQ2aZe9cL_Zqx2qbD5SQop1wjWB5wAhx0FNJrDw';

/**
 * Parses GitHub owner and repository name from any URL or author descriptor.
 */
export function extractGitHubRepo(
  repoUrl?: string,
  authorUrl?: string,
  extensionId?: string
): { owner: string; repo: string } | null {
  if (repoUrl && repoUrl.trim()) {
    const match = repoUrl.trim().match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/i, ''),
      };
    }
  }

  if (authorUrl && extensionId) {
    const match = authorUrl.trim().match(/github\.com\/([^/#?]+)/i);
    if (match) {
      return {
        owner: match[1],
        repo: extensionId,
      };
    }
  }

  return null;
}

/**
 * Rewrites relative markdown and HTML image paths to point directly to raw GitHub CDN URLs.
 */
export function rewriteGitHubRelativeImages(
  markdown: string,
  owner: string,
  repo: string,
  branch = 'HEAD'
): string {
  if (!markdown) return '';
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;

  // Rewrite markdown image syntax: ![alt](path/to/img.png)
  let result = markdown.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/|data:|\/)([^)]+)\)/g,
    (_match, alt, rawPath) => {
      const cleanPath = rawPath.trim().replace(/^\.\//, '');
      return `![${alt}](${rawBase}/${cleanPath})`;
    }
  );

  // Rewrite HTML img tag syntax: <img src="path/to/img.png" ... />
  result = result.replace(
    /<img([^>]+)src=["'](?!https?:\/\/|data:|\/)([^"']+)["']([^>]*)>/gi,
    (_match, prefix, rawPath, suffix) => {
      const cleanPath = rawPath.trim().replace(/^\.\//, '');
      return `<img${prefix}src="${rawBase}/${cleanPath}"${suffix}>`;
    }
  );

  return result;
}

/**
 * Fetches the live README.md directly from GitHub with branch fallbacks.
 */
export async function fetchGitHubReadme(
  owner: string,
  repo: string,
  signal?: AbortSignal
): Promise<string | null> {
  const branches = ['HEAD', 'main', 'master'];

  for (const branch of branches) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/plain, text/markdown' },
        signal: signal || AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 10) {
          return text;
        }
      }
    } catch {
      // Continue to next branch candidate
    }
  }

  return null;
}

/**
 * Queries the Turso libSQL edge database for the published extension readme.
 */
export async function fetchTursoReadme(
  extensionId: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    let rawUrl = DEFAULT_TURSO_URL;
    let token = DEFAULT_TURSO_AUTH_TOKEN;

    if (typeof window !== 'undefined') {
      const customUrl = localStorage.getItem('flint_turso_db_url');
      const customToken = localStorage.getItem('flint_turso_auth_token');
      if (customUrl) rawUrl = customUrl;
      if (customToken) token = customToken;
    }

    let normalizedUrl = rawUrl.trim();
    if (normalizedUrl.startsWith('turso://')) {
      normalizedUrl = 'https://' + normalizedUrl.slice('turso://'.length);
    } else if (normalizedUrl.startsWith('libsql://')) {
      normalizedUrl = 'https://' + normalizedUrl.slice('libsql://'.length);
    }
    normalizedUrl = normalizedUrl.replace(/\/v2\/pipeline\/?$/, '').replace(/\/+$/, '');

    const body = {
      requests: [
        {
          type: 'execute',
          stmt: {
            sql: `
              SELECT pv.readme
              FROM plugin_versions pv
              WHERE pv.plugin_id = ?
              ORDER BY pv.published_at DESC
              LIMIT 1
            `,
            args: [{ type: 'text', value: extensionId }],
          },
        },
        { type: 'close' },
      ],
    };

    const res = await fetch(`${normalizedUrl}/v2/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: signal || AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const rows = data?.results?.[0]?.response?.result?.rows;
    if (Array.isArray(rows) && rows.length > 0) {
      const readmeCell = rows[0]?.[0];
      if (readmeCell && readmeCell.type === 'text' && readmeCell.value) {
        return String(readmeCell.value);
      }
    }
  } catch {
    // Turso query failed
  }

  return null;
}

/**
 * Synchronously retrieves cached README markdown from localStorage.
 */
export function getCachedReadme(extensionId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`flint_ext_readme_${extensionId}`);
  } catch {
    return null;
  }
}

/**
 * Persists README markdown to localStorage for 0ms offline availability.
 */
export function setCachedReadme(extensionId: string, content: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`flint_ext_readme_${extensionId}`, content);
  } catch {}
}

/**
 * Resolves extension metadata across installed manifests, local storage catalogue cache,
 * and built-in fallbacks.
 */
export function resolveExtensionMetadata(
  targetExtensionId: string,
  installedManifest?: any
): ExtensionResolvedMeta {
  if (installedManifest) {
    const rawRepo =
      installedManifest.repoUrl ||
      (typeof installedManifest.repository === 'string'
        ? installedManifest.repository
        : installedManifest.repository?.url);

    return {
      id: installedManifest.id,
      name: installedManifest.name || targetExtensionId,
      version: installedManifest.version || '1.0.0',
      author: installedManifest.author || 'Community',
      authorUrl: installedManifest.authorUrl,
      repoUrl: rawRepo,
      description: installedManifest.description || '',
      tags: Array.isArray(installedManifest.tags) ? installedManifest.tags : ['extension'],
      bannerImage: installedManifest.bannerImage,
      readme: installedManifest.readme,
      isInstalled: true,
      isCore: Boolean(installedManifest.isCore),
    };
  }

  // Check cached marketplace catalogue
  if (typeof window !== 'undefined') {
    try {
      const rawCache = localStorage.getItem('flint_marketplace_catalogue_cache');
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (Array.isArray(parsed)) {
          const match = parsed.find(
            (p: any) =>
              p.id === targetExtensionId ||
              p.id === targetExtensionId.replace(/^flint-/, '') ||
              (p.name && p.name.toLowerCase() === targetExtensionId.toLowerCase())
          );
          if (match) {
            return {
              id: match.id,
              name: match.name || targetExtensionId,
              version: match.version || '1.0.0',
              author: match.author || 'Community',
              authorUrl: match.authorUrl,
              repoUrl:
                match.repoUrl ||
                (match.authorUrl && match.authorUrl.includes('github.com')
                  ? `${match.authorUrl.replace(/\/+$/, '')}/${match.id}`
                  : undefined),
              description: match.description || '',
              tags: match.category ? [match.category.toLowerCase()] : ['extension'],
              bannerImage: match.bannerImage,
              readme: match.readme,
              isInstalled: false,
              isCore: false,
            };
          }
        }
      }
    } catch {}
  }

  // Built-in fallback metadata for first-party community extensions
  if (targetExtensionId === 'flint-universal-sync') {
    return {
      id: 'flint-universal-sync',
      name: 'Universal External Sync',
      version: '1.0.0',
      author: 'Yuliet Li',
      authorUrl: 'https://github.com/yvliet',
      repoUrl: 'https://github.com/yvliet/flint-universal-sync',
      description:
        'Cross-device note synchronization supporting Supabase (free tier with guided setup), Turso, Cloudflare D1, and Custom REST databases.',
      tags: ['integration', 'sync', 'cloud', 'supabase', 'database'],
      isInstalled: false,
      isCore: false,
    };
  }

  return {
    id: targetExtensionId,
    name: targetExtensionId,
    version: '1.0.0',
    author: 'Community',
    description: '',
    tags: ['extension'],
    isInstalled: false,
    isCore: false,
  };
}
