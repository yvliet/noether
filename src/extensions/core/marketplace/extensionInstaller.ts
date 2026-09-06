/**
 * @module extensionInstaller
 * @description
 * Coordinates the installation lifecycle of community extensions from the
 * registry or showcase catalog into desktop disk storage and the runtime ExtensionManager.
 */

import { FlintApp } from '@/core/app/FlintApp';
import type { ExtensionManifest } from '@/core/extensions/types';
import { platform } from '@/lib/platform/platformAdapter';
import { getRegistryUrl } from './useMarketplaceQuery';
import { fetchTursoPluginBundle } from './tursoClient';

/**
 * Normalizes a SemVer version string (e.g. "v1.2.3" -> "1.2.3").
 */
function cleanVersion(version: string): string {
  return version.trim().replace(/^[vV]/, '');
}

/**
 * Compares two Semantic Versioning strings.
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
function compareSemVer(v1: string, v2: string): number {
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

  if (pre1 && !pre2) return -1;
  if (!pre1 && pre2) return 1;
  if (pre1 && pre2) {
    return pre1.localeCompare(pre2);
  }

  return 0;
}

/**
 * Executes a fetch request with an explicit timeout signal.
 */
async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response | null> {
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
 * Installs or updates a community extension:
 * 1. Checks if extension is already present; if newer version available, proceeds with bundle update.
 * 2. Fetches distribution code from remote registry or Turso edge database with 5000ms timeout.
 * 3. If download fails or times out, reports explicit error and returns false.
 * 4. Persists manifest, script, and styles to disk on desktop.
 * 5. Loads and evaluates the bundle into the active runtime.
 */
export async function installMarketplaceExtension(
  app: FlintApp,
  ext: {
    id: string;
    name: string;
    version?: string;
    description?: string;
    author?: string;
    mainJsUrl?: string;
    manifestUrl?: string;
    stylesCssUrl?: string;
    downloadUrl?: string;
  }
): Promise<boolean> {
  try {
    const existingManifest = app.extensions.getExtensionManifest(ext.id);
    if (existingManifest) {
      const currentVersion = existingManifest.version || '0.0.0';
      const targetVersion = ext.version || '1.0.0';
      const isNewer = compareSemVer(targetVersion, currentVersion) > 0;

      if (!isNewer) {
        // Already installed and up-to-date, ensure enabled
        return await app.extensions.enableExtension(ext.id);
      }
      console.info(
        `[extensionInstaller] Updating extension "${ext.id}" from v${currentVersion} to v${targetVersion}`
      );
    }

    const registryBase = getRegistryUrl().replace(/\/plugins\/?$/, '/plugins');
    const downloadApiUrl = `${registryBase}/${ext.id}/download`;

    let manifestContent: string | null = null;
    let mainJsContent: string | null = null;
    let stylesCssContent: string | null = null;

    // 1. Attempt: Download API endpoint (5000ms timeout)
    try {
      const downloadRes = await fetchWithTimeout(downloadApiUrl, 5000);
      if (downloadRes && downloadRes.ok) {
        const downloadData = await downloadRes.json();
        if (downloadData.bundleCode) mainJsContent = downloadData.bundleCode;
        if (downloadData.stylesCode) stylesCssContent = downloadData.stylesCode;
        if (downloadData.manifest) manifestContent = JSON.stringify(downloadData.manifest, null, 2);
      }
    } catch {}

    // 2. Attempt: Turso edge database
    if (!mainJsContent) {
      try {
        const tursoBundle = await fetchTursoPluginBundle(ext.id);
        if (tursoBundle) {
          if (tursoBundle.bundleCode) mainJsContent = tursoBundle.bundleCode;
          if (tursoBundle.stylesCode) stylesCssContent = tursoBundle.stylesCode;
          if (tursoBundle.manifest) manifestContent = JSON.stringify(tursoBundle.manifest, null, 2);
        }
      } catch {}
    }

    // 3. Attempt: Direct asset URLs (5000ms timeout)
    if (!mainJsContent) {
      const mainJsUrl = ext.mainJsUrl || ext.downloadUrl || `${registryBase}/${ext.id}/bundle`;
      try {
        const res = await fetchWithTimeout(mainJsUrl, 5000);
        if (res && res.ok) mainJsContent = await res.text();
      } catch {}
    }

    if (!manifestContent) {
      const manifestUrl = ext.manifestUrl || `${registryBase}/${ext.id}/manifest.json`;
      try {
        const res = await fetchWithTimeout(manifestUrl, 5000);
        if (res && res.ok) manifestContent = await res.text();
      } catch {}
    }

    if (!stylesCssContent && ext.stylesCssUrl) {
      try {
        const res = await fetchWithTimeout(ext.stylesCssUrl, 5000);
        if (res && res.ok) stylesCssContent = await res.text();
      } catch {}
    }

    // Explicit error check: require valid bundle code
    if (!mainJsContent || !mainJsContent.trim()) {
      const errorMsg = `Failed to download extension "${ext.name}" (${ext.id}): distribution bundle could not be retrieved from remote registry or timed out.`;
      console.error(`[extensionInstaller] ${errorMsg}`);
      app.workspace.showToast(errorMsg, 'warning');
      return false;
    }

    // Build or validate manifest
    let manifestData: ExtensionManifest | null = null;
    if (manifestContent) {
      try {
        manifestData = JSON.parse(manifestContent);
      } catch (e) {
        console.warn(`[extensionInstaller] Failed to parse manifest JSON for "${ext.id}":`, e);
      }
    }

    if (!manifestData) {
      manifestData = {
        id: ext.id,
        name: ext.name,
        version: ext.version || '1.0.0',
        description: ext.description || '',
        author: ext.author || 'Community',
        isCore: false,
      };
    } else {
      manifestData.isCore = false;
      if (ext.version) {
        manifestData.version = ext.version;
      }
    }

    // If updating an already installed extension, disable existing instance first
    if (existingManifest) {
      await app.extensions.disableExtension(ext.id);
    }

    // Delegate to unified ExtensionManager installer
    const success = await app.extensions.installExtension(
      manifestData,
      mainJsContent,
      stylesCssContent || undefined
    );

    if (!success) {
      const errorMsg = `Failed to install extension "${ext.name}" into runtime.`;
      console.error(`[extensionInstaller] ${errorMsg}`);
      app.workspace.showToast(errorMsg, 'warning');
      return false;
    }

    return true;
  } catch (err) {
    const errorMsg = `Failed to install extension "${ext.name || ext.id}": ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[extensionInstaller] ${errorMsg}`, err);
    app.workspace.showToast(errorMsg, 'warning');
    return false;
  }
}
