/**
 * @module UpdateChecker
 * @description
 * Native update discovery and release management service for the Noether desktop and web clients.
 * Queries official GitHub releases (https://api.github.com/repos/yvliet/noether/releases), evaluates
 * Semantic Versioning invariants, and handles automated or manual update distribution.
 *
 * Technical Rationale:
 * - Direct GitHub Releases API queries eliminate intermediate proxy dependencies while
 *   supporting immediate distribution of compiled installer binaries (.exe, .msi, etc.).
 * - Semantic version comparison robustly differentiates stable releases from early-access prereleases.
 * - Platform-neutral execution routes download links and installer launches through the platform adapter.
 */

import { APP_VERSION } from '@/version';
import { platform } from '@/lib/platform/platformAdapter';

export const GITHUB_REPO = 'yvliet/noether';
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases`;
export const STORAGE_LAST_CHECK_KEY = 'noether_last_update_check_time';
export const STORAGE_CACHED_RELEASE_KEY = 'noether_cached_latest_release';

export interface ReleaseAsset {
  name: string;
  browserDownloadUrl: string;
  size: number;
  contentType: string;
}

export interface AppRelease {
  version: string;
  tagName: string;
  title: string;
  notes: string;
  publishedAt: string;
  htmlUrl: string;
  isPrerelease: boolean;
  assets: ReleaseAsset[];
  windowsSetupAsset?: ReleaseAsset;
  windowsMsiAsset?: ReleaseAsset;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  release: AppRelease | null;
  checkedAt: number;
  error?: string;
}

/**
 * Normalizes a SemVer version string (e.g., "v0.4.1" -> "0.4.1").
 */
export function cleanVersion(version: string): string {
  return version.trim().replace(/^[vV]/, '');
}

/**
 * Compares two Semantic Versioning strings (v1 vs v2).
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemVer(v1: string, v2: string): number {
  const clean1 = cleanVersion(v1);
  const clean2 = cleanVersion(v2);

  const [core1, pre1] = clean1.split('-');
  const [core2, pre2] = clean2.split('-');

  const parts1 = core1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = core2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  // Core versions are identical. Handle prerelease suffixes (e.g. 0.4.0 vs 0.4.0-beta)
  // A version with a prerelease tag has LOWER precedence than normal version without it
  if (pre1 && !pre2) return -1;
  if (!pre1 && pre2) return 1;
  if (pre1 && pre2) {
    return pre1.localeCompare(pre2);
  }

  return 0;
}

/**
 * Normalizes a raw GitHub release payload into an AppRelease model.
 */
function normalizeGitHubRelease(raw: any): AppRelease {
  const tagName = String(raw.tag_name || '');
  const version = cleanVersion(tagName);
  const assets: ReleaseAsset[] = Array.isArray(raw.assets)
    ? raw.assets.map((a: any) => ({
        name: String(a.name || ''),
        browserDownloadUrl: String(a.browser_download_url || ''),
        size: Number(a.size || 0),
        contentType: String(a.content_type || ''),
      }))
    : [];

  const windowsSetupAsset = assets.find((a) => a.name.endsWith('-setup.exe') || a.name.endsWith('.exe'));
  const windowsMsiAsset = assets.find((a) => a.name.endsWith('.msi'));

  return {
    version,
    tagName,
    title: String(raw.name || tagName),
    notes: String(raw.body || ''),
    publishedAt: String(raw.published_at || ''),
    htmlUrl: String(raw.html_url || `https://github.com/${GITHUB_REPO}/releases/tag/${tagName}`),
    isPrerelease: Boolean(raw.prerelease),
    assets,
    windowsSetupAsset,
    windowsMsiAsset,
  };
}

/**
 * Checks GitHub Releases API for newer application versions.
 * Filters early-access prereleases based on user settings preference.
 */
export async function checkForUpdates(options: {
  earlyAccess?: boolean;
  timeoutMs?: number;
} = {}): Promise<UpdateCheckResult> {
  const { earlyAccess = false, timeoutMs = 7000 } = options;
  const currentVersion = cleanVersion(APP_VERSION);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(GITHUB_RELEASES_API, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`GitHub API responded with status ${res.status}: ${res.statusText}`);
    }

    const releasesList = await res.json();
    if (!Array.isArray(releasesList) || releasesList.length === 0) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        release: null,
        checkedAt: Date.now(),
      };
    }

    // Filter releases based on earlyAccess setting and published status
    const eligibleReleases = releasesList
      .filter((rel) => !rel.draft && (earlyAccess || !rel.prerelease))
      .map(normalizeGitHubRelease);

    if (eligibleReleases.length === 0) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        release: null,
        checkedAt: Date.now(),
      };
    }

    // Sort descending by SemVer to find highest available release
    eligibleReleases.sort((a, b) => compareSemVer(b.version, a.version));
    const latestRelease = eligibleReleases[0];

    const isNewer = compareSemVer(latestRelease.version, currentVersion) > 0;
    const now = Date.now();

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_LAST_CHECK_KEY, String(now));
        if (isNewer) {
          localStorage.setItem(STORAGE_CACHED_RELEASE_KEY, JSON.stringify(latestRelease));
        } else {
          localStorage.removeItem(STORAGE_CACHED_RELEASE_KEY);
        }
      } catch {}
    }

    return {
      hasUpdate: isNewer,
      currentVersion,
      latestVersion: latestRelease.version,
      release: latestRelease,
      checkedAt: now,
    };
  } catch (err: any) {
    console.warn('[UpdateChecker] Failed to check GitHub releases:', err);
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      release: null,
      checkedAt: Date.now(),
      error: err?.message || String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Downloads the Windows installer or opens the GitHub release download URL
 * using the platform bridge.
 */
export async function downloadAndInstallRelease(release: AppRelease): Promise<{ success: boolean; error?: string }> {
  const targetUrl =
    release.windowsSetupAsset?.browserDownloadUrl ||
    release.windowsMsiAsset?.browserDownloadUrl ||
    release.htmlUrl;

  return platform.openUrl(targetUrl);
}

/**
 * Opens the release notes / changelog page in the external browser.
 */
export async function openReleaseChangelog(release: AppRelease): Promise<{ success: boolean; error?: string }> {
  return platform.openUrl(release.htmlUrl);
}
