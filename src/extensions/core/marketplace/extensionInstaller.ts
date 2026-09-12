/**
 * @module extensionInstaller
 * @description
 * Coordinates the installation lifecycle of community extensions from the
 * registry, Turso edge database, or GitHub release assets into disk storage and runtime.
 *
 * Employs a resilient 5-tier fallback downloader to ensure zero installation failures
 * even if registry edge endpoints or database nodes experience transient downtime.
 *
 * @since 0.2.0
 */

import { NoetherApp } from '@/core/app/NoetherApp';
import type { ExtensionManifest } from '@/core/extensions/types';
import {
  downloadExtensionBundle,
  compareSemVer,
} from '@/core/extensions/ExtensionUpdateManager';

/**
 * Installs or updates a community extension:
 * 1. Checks if extension is already present; if newer version available, proceeds with bundle update.
 * 2. Fetches distribution code through the resilient 5-tier downloader pipeline.
 * 3. If download fails or times out, reports explicit error and returns false.
 * 4. Persists manifest, script, and styles to disk on desktop.
 * 5. Loads and evaluates the bundle into the active runtime.
 */
export async function installMarketplaceExtension(
  app: NoetherApp,
  ext: {
    id: string;
    name: string;
    version?: string;
    description?: string;
    author?: string;
    repoUrl?: string;
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

    // Execute resilient multi-tier download pipeline
    const downloadResult = await downloadExtensionBundle(
      {
        id: ext.id,
        name: ext.name,
        version: ext.version,
        repoUrl: ext.repoUrl,
        author: ext.author,
        mainJsUrl: ext.mainJsUrl,
        manifestUrl: ext.manifestUrl,
        stylesCssUrl: ext.stylesCssUrl,
        downloadUrl: ext.downloadUrl,
      },
      8000
    );

    // Require valid bundle code
    if (!downloadResult || !downloadResult.mainJs || !downloadResult.mainJs.trim()) {
      const errorMsg = `Failed to download extension "${ext.name}" (${ext.id}): distribution bundle could not be retrieved from remote registry or release repositories.`;
      console.error(`[extensionInstaller] ${errorMsg}`);
      app.workspace.showToast(errorMsg, 'warning');
      return false;
    }

    const manifestData: ExtensionManifest = {
      ...downloadResult.manifest,
      id: ext.id,
      name: ext.name || downloadResult.manifest.name || ext.id,
      version: ext.version || downloadResult.manifest.version || '1.0.0',
      description: ext.description || downloadResult.manifest.description || '',
      author: ext.author || downloadResult.manifest.author || 'Community',
      isCore: false,
    };

    // If updating an already installed extension, disable existing instance first
    if (existingManifest) {
      await app.extensions.disableExtension(ext.id);
    }

    // Delegate to unified ExtensionManager installer (persists to disk & loads into memory)
    const success = await app.extensions.installExtension(
      manifestData,
      downloadResult.mainJs,
      downloadResult.stylesCss
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
