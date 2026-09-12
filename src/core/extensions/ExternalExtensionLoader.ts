/**
 * @module ExternalExtensionLoader
 * @description
 * Discovers, sandboxes, and executes third-party community extensions
 * located in the active vault's `.noether/extensions/` or `.noether/plugins/` directory.
 *
 * Exposes a sandboxed module scope with access to React and the Noether SDK.
 *
 * @since 0.2.0
 */

import React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import { z } from 'zod';
import { NoetherApp } from '../app/NoetherApp';
import { Extension } from './Extension';
import { ExtensionManifest } from './types';
import { platform } from '@/lib/platform/platformAdapter';

import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as clsxModule from 'clsx';
import * as twMergeModule from 'tailwind-merge';
import * as zustandModule from 'zustand';
import * as zustandVanillaModule from 'zustand/vanilla';
import * as hugeiconsReactModule from '@hugeicons/react';
import * as hugeiconsCoreModule from '@hugeicons/core-free-icons';

export class ExternalExtensionLoader {
  private app: NoetherApp;
  private injectedStyles: Map<string, HTMLStyleElement> = new Map();

  constructor(app: NoetherApp) {
    this.app = app;
  }

  /**
   * Scans and loads external extensions from the vault extensions folder.
   * @since 0.2.0
   */
  public async discoverAndLoadExtensions(): Promise<void> {
    if (!platform.isDesktop()) {
      return;
    }

    try {
      const installed = await platform.listInstalledExtensions();
      for (const item of installed) {
        await this.loadSingleExtension(item.folder, item);
      }
    } catch (err) {
      console.error('[ExternalExtensionLoader] Failed to discover extensions:', err);
    }
  }

  /**
   * Loads and evaluates an individual external extension bundle from disk.
   *
   * @param folderName - Folder name within extensions folder.
   * @param manifest - Extension manifest descriptor.
   * @returns `true` if loaded and registered successfully.
   * @since 0.2.0
   */
  public async loadSingleExtension(
    folderName: string,
    manifest: ExtensionManifest
  ): Promise<boolean> {
    if (!platform.isDesktop()) return false;

    try {
      const bundle = await platform.readExtensionBundle(folderName);
      if (!bundle.success || !bundle.jsCode) {
        console.warn(`[ExternalExtensionLoader] No main.js bundle found for extension in folder "${folderName}"`);
        return false;
      }

      return await this.loadFromSource(manifest, bundle.jsCode, bundle.cssCode);
    } catch (err) {
      console.error(`[ExternalExtensionLoader] Error reading extension "${manifest.id}":`, err);
      return false;
    }
  }

  /**
   * Evaluates an extension bundle from memory/network and registers it with the runtime.
   *
   * @param manifest - Extension manifest descriptor.
   * @param jsCode - Compiled JavaScript code.
   * @param cssCode - Optional CSS stylesheet code.
   * @returns `true` if loaded and registered successfully.
   */
  public async loadFromSource(
    manifest: ExtensionManifest,
    jsCode: string,
    cssCode?: string
  ): Promise<boolean> {
    try {
      // Handle CSS injection if present
      if (cssCode) {
        this.injectExtensionStyle(manifest.id, cssCode);
      }

      // Dynamically load the Noether SDK to break circular dependency during initialization
      const NoetherSdk = await import('@/sdk');

      // Create sandboxed module evaluation environment
      // We pass the complete Noether SDK exports to the extension module
      const noetherSdk = {
        ...NoetherSdk,
        Extension,
        Plugin: Extension,
        NoetherApp,
        appInstance: this.app,
        z,
      };

      const moduleScope = {
        exports: {} as Record<string, unknown>,
        module: { exports: {} as unknown },
        require: (moduleName: string) => {
          if (moduleName === 'react') return React;
          if (moduleName === 'react/jsx-runtime' || moduleName === 'react/jsx-dev-runtime') {
            return ReactJsxRuntime;
          }
          if (moduleName === 'react-dom') return ReactDOM;
          if (moduleName === 'react-dom/client') return ReactDOMClient;
          if (moduleName === 'zod') return { ...z, default: z, z };
          if (moduleName === 'clsx') return (clsxModule as any).default || clsxModule;
          if (moduleName === 'tailwind-merge') return twMergeModule;
          if (moduleName === 'zustand') return zustandModule;
          if (moduleName === 'zustand/vanilla') return zustandVanillaModule;
          if (moduleName === '@hugeicons/react') return hugeiconsReactModule;
          if (moduleName === '@hugeicons/core-free-icons') return hugeiconsCoreModule;
          if (
            moduleName === 'noether' ||
            moduleName === 'noether/sdk' ||
            moduleName === 'noether/react' ||
            moduleName === 'noether-sdk' ||
            moduleName === '@noether' ||
            moduleName === '@noether/core' ||
            moduleName === '@noether/api' ||
            moduleName === '@noether/sdk' ||
            moduleName === '@noether/react' ||
            moduleName === '@/sdk'
          ) {
            return noetherSdk;
          }
          throw new Error(
            `[Noether] Cannot require "${moduleName}" from an extension. ` +
            `Only 'react', 'react-dom', 'react/jsx-runtime', 'zod', 'clsx', 'tailwind-merge', 'zustand', 'zustand/vanilla', '@hugeicons/react', '@hugeicons/core-free-icons', and 'noether' (or '@noether/sdk', '@noether/react') are available.`
          );
        },
        Noether: noetherSdk,
        React,
        process: { env: { NODE_ENV: 'production' } },
        __dirname: '',
        __filename: '',
      };

      // Wrap code in a function with module scope
      const factory = new Function(
        'exports',
        'module',
        'require',
        'Noether',
        'React',
        'process',
        '__dirname',
        '__filename',
        jsCode
      );

      factory(
        moduleScope.exports,
        moduleScope.module,
        moduleScope.require,
        moduleScope.Noether,
        moduleScope.React,
        moduleScope.process,
        moduleScope.__dirname,
        moduleScope.__filename
      );

      const isConstructor = (candidate: unknown): boolean =>
        typeof candidate === 'function' && Boolean((candidate as { prototype?: unknown }).prototype);

      const modExports = moduleScope.module.exports as Record<string, unknown> | undefined;
      const namedExports = moduleScope.exports as Record<string, unknown> | undefined;

      let exportedExtension: unknown =
        modExports?.default ||
        namedExports?.default;

      if (!isConstructor(exportedExtension)) {
        exportedExtension = undefined;
        const candidates = [modExports, namedExports];
        for (const candidate of candidates) {
          if (candidate && typeof candidate === 'object') {
            // First priority: named keys matching Extension or Plugin patterns
            for (const [key, val] of Object.entries(candidate)) {
              if (
                isConstructor(val) &&
                (key.toLowerCase().includes('extension') ||
                 key.toLowerCase().includes('plugin') ||
                 key.toLowerCase() === manifest.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
              ) {
                exportedExtension = val;
                break;
              }
            }
            if (isConstructor(exportedExtension)) break;
            // Second priority: any exported function/class constructor
            for (const val of Object.values(candidate)) {
              if (isConstructor(val)) {
                exportedExtension = val;
                break;
              }
            }
            if (isConstructor(exportedExtension)) break;
          } else if (isConstructor(candidate)) {
            exportedExtension = candidate;
            break;
          }
        }
      }

      if (isConstructor(exportedExtension)) {
        // Enforce isCore: false for all external/community extensions so they can never spoof core status
        const communityManifest: ExtensionManifest = {
          ...manifest,
          isCore: false,
        };
        this.app.extensions.registerExtension(communityManifest, exportedExtension as any);
        console.log(`[ExternalExtensionLoader] Successfully registered community extension "${manifest.name}"`);
        return true;
      } else {
        this.removeExtensionStyle(manifest.id);
        console.warn(`[ExternalExtensionLoader] Extension "${manifest.id}" did not export an Extension class.`);
        return false;
      }
    } catch (err) {
      this.removeExtensionStyle(manifest.id);
      console.error(`[ExternalExtensionLoader] Error loading extension "${manifest.id}":`, err);
      return false;
    }
  }

  /**
   * Installs an external community extension:
   * 1. On desktop, saves manifest.json, main.js, and optional styles.css into `.noether/plugins/<id>/`.
   * 2. Evaluates the bundle code and registers it into ExtensionManager.
   * 3. Enables the extension.
   *
   * @param manifest - Extension manifest descriptor.
   * @param jsCode - Compiled JavaScript code or starter code.
   * @param cssCode - Optional CSS stylesheet code.
   * @returns `true` if installation and enablement succeeded.
   */
  public async installExtension(
    manifest: ExtensionManifest,
    jsCode?: string,
    cssCode?: string
  ): Promise<boolean> {
    try {
      const communityManifest: ExtensionManifest = {
        ...manifest,
        isCore: false,
      };
      const manifestJson = JSON.stringify(communityManifest, null, 2);

      let bundleCode = jsCode;
      if (!bundleCode || !bundleCode.trim()) {
        const cleanClassName = (manifest.name.replace(/[^a-zA-Z0-9]/g, '') || 'Community') + 'Extension';
        bundleCode = `const { Extension } = require('noether');

module.exports = class ${cleanClassName} extends Extension {
  async onload() {
    console.log('[Noether] Loaded community extension: ${manifest.name} (v${manifest.version})');
  }

  onunload() {
    console.log('[Noether] Unloaded extension: ${manifest.name}');
  }
};
`;
      }

      // 1. Evaluate and register into runtime memory first
      const loaded = await this.loadFromSource(communityManifest, bundleCode, cssCode);
      if (!loaded) {
        console.warn(`[ExternalExtensionLoader] Failed to evaluate extension from source: "${manifest.id}"`);
      }

      // 2. Persist to disk if running on desktop so it survives app restarts
      if (platform.isDesktop()) {
        try {
          const res = await platform.installExtensionBundle(
            manifest.id,
            manifestJson,
            bundleCode,
            cssCode || undefined
          );
          if (!res?.success) {
            console.warn('[ExternalExtensionLoader] Desktop persistence result:', res);
          }
        } catch (diskErr) {
          console.warn('[ExternalExtensionLoader] Could not persist extension to disk:', diskErr);
        }
      }

      // 3. Enable extension in runtime
      return await this.app.extensions.enableExtension(manifest.id);
    } catch (err) {
      console.error(`[ExternalExtensionLoader] Failed to install extension "${manifest.id}":`, err);
      return false;
    }
  }

  public async installPlugin(
    manifest: ExtensionManifest,
    jsCode?: string,
    cssCode?: string
  ): Promise<boolean> {
    return this.installExtension(manifest, jsCode, cssCode);
  }

  private injectExtensionStyle(extensionId: string, cssCode: string): void {
    if (typeof document === 'undefined') return;

    const styleId = 'noether-extension-style-' + extensionId;
    let styleEl = this.injectedStyles.get(extensionId);
    if (!styleEl) {
      const existingEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (existingEl) {
        styleEl = existingEl;
      } else {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      this.injectedStyles.set(extensionId, styleEl);
    }
    styleEl.textContent = cssCode;
  }

  public removeExtensionStyle(extensionId: string): void {
    const styleEl = this.injectedStyles.get(extensionId);
    if (styleEl) {
      styleEl.remove();
      this.injectedStyles.delete(extensionId);
    } else if (typeof document !== 'undefined') {
      const existingEl = document.getElementById('noether-extension-style-' + extensionId);
      if (existingEl) {
        existingEl.remove();
      }
    }
  }
}

export default ExternalExtensionLoader;
