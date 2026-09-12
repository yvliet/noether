/**
 * @module ExtensionUpdateManager
 * @description
 * Coordinates checking, downloading, persisting, and hot-reloading
 * updates for community extensions in Noether.
 *
 * Implements a resilient 5-tier distribution retrieval pipeline:
 * 1. Primary and custom registry endpoints (/api/v1/extensions/:id/download)
 * 2. Turso libSQL Hrana edge database
 * 3. GitHub Releases (latest and version-tagged assets)
 * 4. Raw GitHub CDN distribution bundles
 * 5. Local Vault / filesystem discovery
 */

import type { NoetherApp } from '../app/NoetherApp';
import type { ExtensionManifest } from './types';
import { platform } from '@/lib/platform/platformAdapter';
import { fetchTursoPluginBundle, getRegistryUrl } from '@/lib/registry/tursoRegistryClient';

export interface ExtensionUpdateInfo {
  id: string;
  name: string;
  currentVersion: string;
  latestVersion: string;
  author?: string;
  description?: string;
  repoUrl?: string;
  releaseNotes?: string;
  bundleCode?: string;
  manifest?: any;
  stylesCode?: string;
}

export interface ExtensionDownloadTarget {
  id: string;
  name?: string;
  version?: string;
  repoUrl?: string;
  author?: string;
  mainJsUrl?: string;
  manifestUrl?: string;
  stylesCssUrl?: string;
  downloadUrl?: string;
}

export interface ExtensionDownloadResult {
  manifestJson: string;
  manifest: ExtensionManifest;
  mainJs: string;
  stylesCss?: string;
  source: 'registry' | 'turso' | 'github-release' | 'github-raw' | 'local';
}

/**
 * Normalizes a SemVer version string (e.g. "v1.2.3" -> "1.2.3").
 */
export function cleanSemVer(version?: string): string {
  if (!version) return '0.0.0';
  return version.trim().replace(/^[vV]/, '');
}

/**
 * Compares two Semantic Versioning strings.
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemVer(v1: string, v2: string): number {
  const clean1 = cleanSemVer(v1);
  const clean2 = cleanSemVer(v2);

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

  if (pre1 && !pre2) return -1;
  if (!pre1 && pre2) return 1;
  if (pre1 && pre2) {
    return pre1.localeCompare(pre2);
  }

  return 0;
}

/**
 * Executes a network fetch request with an explicit timeout.
 * On desktop, automatically routes via the native Rust HTTP client to bypass WebView2 CORS restrictions.
 */
async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response | null> {
  if (platform.isDesktop()) {
    try {
      const nativeRes = await platform.downloadRemoteText(url);
      if (nativeRes && nativeRes.success && nativeRes.content !== undefined) {
        return new Response(nativeRes.content, { status: 200, statusText: 'OK' });
      }
    } catch {}
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    return null;
  }
}

/**
 * Resolves the GitHub repository owner and name from a given URL or identifier.
 */
function resolveGitHubRepo(target: ExtensionDownloadTarget): { owner: string; repo: string } | null {
  const repoUrl = target.repoUrl;
  if (repoUrl && repoUrl.includes('github.com')) {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
    if (match && match[1] && match[2]) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  }

  // Fallback to author or default organization repository
  const cleanId = target.id.trim();

  // Author-based inference
  const authorMatch = target.author?.match(/github\.com\/([^/]+)/i);
  const authorName = authorMatch ? authorMatch[1] : 'yvliet';

  return { owner: authorName, repo: cleanId };
}

/**
 * Multi-tier distribution bundle retriever.
 * Queries registry endpoints, Turso edge replicas, GitHub Releases,
 * raw CDN mirrors, and local caches in deterministic fallback order.
 */
export async function downloadExtensionBundle(
  target: ExtensionDownloadTarget,
  timeoutMs = 7000
): Promise<ExtensionDownloadResult | null> {
  const registryBase = getRegistryUrl().replace(/\/plugins\/?$/, '').replace(/\/extensions\/?$/, '');

  // -------------------------------------------------------------
  // Tier 1: Direct URLs & Official Registry Download API
  // -------------------------------------------------------------
  const candidateApiEndpoints = [
    target.downloadUrl,
    `${registryBase}/api/v1/extensions/${target.id}/download`,
    `${registryBase}/api/v1/plugins/${target.id}/download`,
    `https://api.noethernotes.dev/api/v1/extensions/${target.id}/download`,
  ]
    .filter(Boolean)
    .filter((url, idx, arr) => arr.indexOf(url) === idx) as string[];

  for (const endpoint of candidateApiEndpoints) {
    try {
      const res = await fetchWithTimeout(endpoint, 2500);
      if (res && res.ok) {
        const data = await res.json();
        if (data.bundleCode) {
          const manifestObj = data.manifest || {
            id: target.id,
            name: target.name || target.id,
            version: target.version || '1.0.0',
            description: target.name || target.id,
            isCore: false,
          };
          return {
            manifestJson: typeof data.manifest === 'string' ? data.manifest : JSON.stringify(manifestObj, null, 2),
            manifest: manifestObj,
            mainJs: data.bundleCode,
            stylesCss: data.stylesCode || undefined,
            source: 'registry',
          };
        }
      }
    } catch {}
  }

  // -------------------------------------------------------------
  // Tier 2: Turso libSQL Hrana Edge Database
  // -------------------------------------------------------------
  try {
    const tursoBundle = await fetchTursoPluginBundle(target.id);
    if (tursoBundle && tursoBundle.bundleCode) {
      const manifestObj = tursoBundle.manifest || {
        id: target.id,
        name: target.name || target.id,
        version: tursoBundle.version || target.version || '1.0.0',
        description: target.name || target.id,
        isCore: false,
      };
      return {
        manifestJson: JSON.stringify(manifestObj, null, 2),
        manifest: manifestObj,
        mainJs: tursoBundle.bundleCode,
        stylesCss: tursoBundle.stylesCode || undefined,
        source: 'turso',
      };
    }
  } catch {}

  // -------------------------------------------------------------
  // Tier 3: GitHub Releases (Latest & Tagged Assets)
  // -------------------------------------------------------------
  const ghRepo = resolveGitHubRepo(target);
  if (ghRepo) {
    const { owner, repo } = ghRepo;

    // Generate possible repository names (with and without 'noether-' prefix)
    const repoCandidates = [
      repo,
      repo.startsWith('noether-') ? repo.replace(/^noether-/, '') : `noether-${repo}`,
    ];

    for (const candidateRepo of repoCandidates) {
      const releaseBaseUrls = [
        `https://github.com/${owner}/${candidateRepo}/releases/latest/download`,
      ];
      if (target.version) {
        const cleanV = cleanSemVer(target.version);
        releaseBaseUrls.push(`https://github.com/${owner}/${candidateRepo}/releases/download/v${cleanV}`);
        releaseBaseUrls.push(`https://github.com/${owner}/${candidateRepo}/releases/download/${cleanV}`);
      }

      for (const base of releaseBaseUrls) {
        try {
          const mainJsRes = await fetchWithTimeout(`${base}/main.js`, timeoutMs);
          if (mainJsRes && mainJsRes.ok) {
            const mainJs = await mainJsRes.text();
            if (mainJs && mainJs.trim().length > 100) {
              let manifestObj: any = null;
              try {
                const manRes = await fetchWithTimeout(`${base}/manifest.json`, timeoutMs);
                if (manRes && manRes.ok) {
                  manifestObj = await manRes.json();
                }
              } catch {}

              let stylesCss: string | undefined;
              try {
                const cssRes = await fetchWithTimeout(`${base}/styles.css`, timeoutMs);
                if (cssRes && cssRes.ok) {
                  stylesCss = await cssRes.text();
                }
              } catch {}

              const finalManifest: ExtensionManifest = manifestObj || {
                id: target.id,
                name: target.name || target.id,
                version: target.version || '1.0.0',
                description: target.name,
                author: target.author || owner,
                isCore: false,
              };

              return {
                manifestJson: JSON.stringify(finalManifest, null, 2),
                manifest: finalManifest,
                mainJs,
                stylesCss: stylesCss?.trim() ? stylesCss : undefined,
                source: 'github-release',
              };
            }
          }
        } catch {}
      }
    }
  }

  // -------------------------------------------------------------
  // Tier 4: Raw GitHub & jsDelivr CDN
  // -------------------------------------------------------------
  if (ghRepo) {
    const { owner, repo } = ghRepo;
    const repoCandidates = [
      repo,
      repo.startsWith('noether-') ? repo.replace(/^noether-/, '') : `noether-${repo}`,
    ];

    for (const candidateRepo of repoCandidates) {
      const rawUrls = [
        `https://raw.githubusercontent.com/${owner}/${candidateRepo}/main/dist/main.js`,
        `https://cdn.jsdelivr.net/gh/${owner}/${candidateRepo}@main/dist/main.js`,
        `https://raw.githubusercontent.com/${owner}/${candidateRepo}/main/main.js`,
      ];

      for (const rawMainJsUrl of rawUrls) {
        try {
          const res = await fetchWithTimeout(rawMainJsUrl, timeoutMs);
          if (res && res.ok) {
            const mainJs = await res.text();
            if (mainJs && mainJs.trim().length > 100) {
              const manifestRawUrl = rawMainJsUrl
                .replace(/\/dist\/main\.js$/, '/manifest.json')
                .replace(/\/main\.js$/, '/manifest.json');

              let manifestObj: any = null;
              try {
                const mRes = await fetchWithTimeout(manifestRawUrl, timeoutMs);
                if (mRes && mRes.ok) manifestObj = await mRes.json();
              } catch {}

              let stylesCss: string | undefined;
              try {
                const stylesRawUrl = rawMainJsUrl
                  .replace(/\/dist\/main\.js$/, '/styles.css')
                  .replace(/\/main\.js$/, '/styles.css');
                const sRes = await fetchWithTimeout(stylesRawUrl, timeoutMs);
                if (sRes && sRes.ok) stylesCss = await sRes.text();
              } catch {}

              const finalManifest: ExtensionManifest = manifestObj || {
                id: target.id,
                name: target.name || target.id,
                version: target.version || '1.0.0',
                description: target.name || target.id,
                author: owner,
                isCore: false,
              };

              return {
                manifestJson: JSON.stringify(finalManifest, null, 2),
                manifest: finalManifest,
                mainJs,
                stylesCss: stylesCss?.trim() ? stylesCss : undefined,
                source: 'github-raw',
              };
            }
          }
        } catch {}
      }
    }
  }

  // -------------------------------------------------------------
  // Tier 5: Local Vault / Filesystem Cache
  // -------------------------------------------------------------
  if (platform.isDesktop()) {
    try {
      const bundle = await platform.readExtensionBundle(target.id);
      if (bundle.success && bundle.jsCode) {
        const fallbackManifest: ExtensionManifest = {
          id: target.id,
          name: target.name || target.id,
          version: target.version || '1.0.0',
          description: target.name || target.id,
          isCore: false,
        };
        return {
          manifestJson: JSON.stringify(fallbackManifest, null, 2),
          manifest: fallbackManifest,
          mainJs: bundle.jsCode,
          stylesCss: bundle.cssCode,
          source: 'local',
        };
      }
    } catch {}
  }

  return null;
}

/**
 * Manages the lifecycle of community extension updates.
 */
export class ExtensionUpdateManager {
  private app: NoetherApp;
  private updatesAvailable: Map<string, ExtensionUpdateInfo> = new Map();
  private isChecking = false;
  private updatingExtensions: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  private autoCheckTimer: any = null;

  constructor(app: NoetherApp) {
    this.app = app;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public getAvailableUpdates(): ExtensionUpdateInfo[] {
    return Array.from(this.updatesAvailable.values());
  }

  public hasUpdate(extensionId: string): boolean {
    return this.updatesAvailable.has(extensionId);
  }

  public getUpdate(extensionId: string): ExtensionUpdateInfo | undefined {
    return this.updatesAvailable.get(extensionId);
  }

  public get checking(): boolean {
    return this.isChecking;
  }

  public isUpdating(extensionId: string): boolean {
    return this.updatingExtensions.has(extensionId);
  }

  /**
   * Scans installed community extensions and identifies newer versions available
   * from the registry, Turso, or GitHub Releases.
   */
  public async checkForUpdates(targetExtensionId?: string): Promise<ExtensionUpdateInfo[]> {
    if (this.isChecking) {
      return this.getAvailableUpdates();
    }

    this.isChecking = true;
    this.notify();

    try {
      const snapshot = this.app.extensions.getSnapshot();
      let installedCommunity = snapshot.community;

      if (targetExtensionId) {
        installedCommunity = installedCommunity.filter(
          (e) => e.id === targetExtensionId || e.id === targetExtensionId.replace(/^noether-/, '')
        );
      }

      if (installedCommunity.length === 0) {
        return [];
      }

      const discoveredUpdates: ExtensionUpdateInfo[] = [];

      for (const installed of installedCommunity) {
        const id = installed.id;
        const currentVersion = cleanSemVer(installed.version || '1.0.0');
        let latestVersion = currentVersion;
        let releaseNotes: string | undefined;
        let repoUrl = (installed as any).repoUrl;

        // 1. Check GitHub Releases API for dynamic tags
        const ghRepo = resolveGitHubRepo({ id, repoUrl });
        if (ghRepo) {
          try {
            const ghApiRes = await fetchWithTimeout(
              `https://api.github.com/repos/${ghRepo.owner}/${ghRepo.repo}/releases/latest`,
              4000
            );
            if (ghApiRes && ghApiRes.ok) {
              const releaseData = await ghApiRes.json();
              if (releaseData.tag_name) {
                const ghVer = cleanSemVer(releaseData.tag_name);
                if (compareSemVer(ghVer, latestVersion) > 0) {
                  latestVersion = ghVer;
                  releaseNotes = releaseData.body;
                }
              }
            }
          } catch {}
        }

        if (compareSemVer(latestVersion, currentVersion) > 0) {
          const updateInfo: ExtensionUpdateInfo = {
            id,
            name: installed.name || id,
            currentVersion,
            latestVersion,
            author: installed.author,
            description: installed.description,
            repoUrl,
            releaseNotes,
          };
          this.updatesAvailable.set(id, updateInfo);
          discoveredUpdates.push(updateInfo);
        } else {
          this.updatesAvailable.delete(id);
        }
      }

      return discoveredUpdates;
    } catch (err) {
      console.error('[ExtensionUpdateManager] Error checking for updates:', err);
      return [];
    } finally {
      this.isChecking = false;
      this.notify();
    }
  }

  /**
   * Downloads the latest distribution bundle, updates physical files in the Vault,
   * and hot-reloads the extension in memory.
   */
  public async updateExtension(extensionId: string): Promise<boolean> {
    if (this.updatingExtensions.has(extensionId)) {
      return false;
    }

    this.updatingExtensions.add(extensionId);
    this.notify();

    try {
      const existingManifest = this.app.extensions.getExtensionManifest(extensionId);
      const updateInfo = this.updatesAvailable.get(extensionId);

      const targetVersion = updateInfo?.latestVersion || '1.0.1';
      const targetName = updateInfo?.name || existingManifest?.name || extensionId;
      const targetRepoUrl = updateInfo?.repoUrl || (existingManifest as any)?.repoUrl;

      console.info(
        `[ExtensionUpdateManager] Initiating update for "${targetName}" (${extensionId}) to v${targetVersion}`
      );

      const downloadResult = await downloadExtensionBundle(
        {
          id: extensionId,
          name: targetName,
          version: targetVersion,
          repoUrl: targetRepoUrl,
          author: updateInfo?.author || existingManifest?.author,
        },
        8000
      );

      if (!downloadResult || !downloadResult.mainJs) {
        const msg = `Could not retrieve update bundle for "${targetName}".`;
        console.error(`[ExtensionUpdateManager] ${msg}`);
        this.app.workspace.showToast(msg, 'warning');
        return false;
      }

      if (platform.isDesktop()) {
        const diskRes = await platform.installExtensionBundle(
          extensionId,
          downloadResult.manifestJson,
          downloadResult.mainJs,
          downloadResult.stylesCss
        );
        if (!diskRes.success) {
          console.warn('[ExtensionUpdateManager] Disk write warning:', diskRes.error);
        }
      }

      const reloaded = await this.app.extensions.reloadExtension(extensionId);
      if (!reloaded) {
        await this.app.extensions.installExtension(
          downloadResult.manifest,
          downloadResult.mainJs,
          downloadResult.stylesCss
        );
      }

      this.updatesAvailable.delete(extensionId);
      this.notify();

      this.app.workspace.showToast(`Updated "${targetName}" to v${targetVersion}`, 'success');
      this.app.events.emit('extension:updated' as any, {
        extensionId,
        version: targetVersion,
      });

      return true;
    } catch (err) {
      console.error(`[ExtensionUpdateManager] Failed to update "${extensionId}":`, err);
      this.app.workspace.showToast(
        `Failed to update "${extensionId}": ${err instanceof Error ? err.message : String(err)}`,
        'warning'
      );
      return false;
    } finally {
      this.updatingExtensions.delete(extensionId);
      this.notify();
    }
  }

  public async updateAll(): Promise<{ succeeded: string[]; failed: string[] }> {
    const updates = this.getAvailableUpdates();
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const update of updates) {
      const ok = await this.updateExtension(update.id);
      if (ok) {
        succeeded.push(update.name);
      } else {
        failed.push(update.name);
      }
    }

    if (succeeded.length > 0) {
      this.app.workspace.showToast(
        `Successfully updated ${succeeded.length} extension${succeeded.length > 1 ? 's' : ''}`,
        'success'
      );
    }

    return { succeeded, failed };
  }

  public startAutoUpdateCheck(delayMs = 5000): void {
    if (this.autoCheckTimer) {
      clearTimeout(this.autoCheckTimer);
    }

    this.autoCheckTimer = setTimeout(async () => {
      const updates = await this.checkForUpdates();
      if (updates.length > 0) {
        const names = updates.map((u) => u.name).join(', ');
        this.app.workspace.showToast(
          `Updates available for: ${names}`,
          'info'
        );
      }
    }, delayMs);
  }
}
