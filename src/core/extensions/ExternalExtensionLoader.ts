/**
 * @module ExternalExtensionLoader
 * @description
 * Discovers, sandboxes, and executes third-party community extensions
 * located in the active hearth's `.flint/extensions/` or `.flint/plugins/` directory.
 *
 * Exposes a sandboxed module scope with access to React and the Flint SDK.
 *
 * @since 0.2.0
 */

import React from 'react';
import { z } from 'zod';
import { FlintApp } from '../app/FlintApp';
import { Extension } from './Extension';
import { ExtensionManifest } from './types';
import { platform } from '@/lib/platform/platformAdapter';

import * as FlintSdk from '@/sdk';
import * as ReactJsxRuntime from 'react/jsx-runtime';

export class ExternalExtensionLoader {
  private app: FlintApp;
  private injectedStyles: Map<string, HTMLStyleElement> = new Map();

  constructor(app: FlintApp) {
    this.app = app;
  }

  /**
   * Scans and loads external extensions from the hearth extensions folder.
   * @since 0.2.0
   */
  public async discoverAndLoadExtensions(): Promise<void> {
    if (!platform.isDesktop()) {
      return;
    }

    try {
      const listFn = platform.listInstalledExtensions || platform.listInstalledPlugins;
      const installed = await listFn();
      for (const item of installed) {
        await this.loadSingleExtension(item.folder, item);
      }
    } catch (err) {
      console.error('[ExternalExtensionLoader] Failed to discover extensions:', err);
    }
  }

  // Alias for backwards compatibility
  public async discoverAndLoadPlugins(): Promise<void> {
    return this.discoverAndLoadExtensions();
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
      const readFn = platform.readExtensionBundle || platform.readPluginBundle;
      const bundle = await readFn(folderName);
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

      // Create sandboxed module evaluation environment
      // We pass the complete Flint SDK exports to the extension module
      const flintSdk = {
        ...FlintSdk,
        Extension,
        Plugin: Extension,
        FlintApp,
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
          if (moduleName === 'zod') return z;
          if (
            moduleName === 'flint' ||
            moduleName === '@flint/api' ||
            moduleName === '@flint/sdk' ||
            moduleName === '@/sdk'
          ) {
            return flintSdk;
          }
          throw new Error(
            `[Flint] Cannot require "${moduleName}" from an extension. ` +
            `Only 'react', 'react/jsx-runtime', 'zod', and 'flint' (or '@flint/sdk') are available.`
          );
        },
        Flint: flintSdk,
        React,
      };

      // Wrap code in a function with module scope
      const factory = new Function(
        'exports',
        'module',
        'require',
        'Flint',
        'React',
        jsCode
      );

      factory(
        moduleScope.exports,
        moduleScope.module,
        moduleScope.require,
        moduleScope.Flint,
        moduleScope.React
      );

      const modExports = moduleScope.module.exports as Record<string, unknown> | undefined;
      const namedExports = moduleScope.exports as Record<string, unknown> | undefined;

      const exportedExtension =
        modExports?.default ||
        namedExports?.default ||
        modExports ||
        namedExports;

      if (typeof exportedExtension === 'function') {
        // Enforce isCore: false for all external/community extensions so they can never spoof core status
        const communityManifest: ExtensionManifest = {
          ...manifest,
          isCore: false,
        };
        this.app.extensions.registerExtension(communityManifest, exportedExtension as any);
        console.log(`[ExternalExtensionLoader] Successfully registered community extension "${manifest.name}"`);
        return true;
      } else {
        console.warn(`[ExternalExtensionLoader] Extension "${manifest.id}" did not export a default Extension class.`);
        return false;
      }
    } catch (err) {
      console.error(`[ExternalExtensionLoader] Error loading extension "${manifest.id}":`, err);
      return false;
    }
  }

  // Alias for backwards compatibility
  public async loadSinglePlugin(folderName: string, manifest: ExtensionManifest): Promise<boolean> {
    return this.loadSingleExtension(folderName, manifest);
  }

  private injectExtensionStyle(extensionId: string, cssCode: string): void {
    if (typeof document === 'undefined') return;

    let styleEl = this.injectedStyles.get(extensionId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = `flint-extension-style-${extensionId}`;
      document.head.appendChild(styleEl);
      this.injectedStyles.set(extensionId, styleEl);
    }
    styleEl.textContent = cssCode;
  }

  public removeExtensionStyle(extensionId: string): void {
    const styleEl = this.injectedStyles.get(extensionId);
    if (styleEl) {
      styleEl.remove();
      this.injectedStyles.delete(extensionId);
    }
  }

  // Alias for backwards compatibility
  public removePluginStyle(pluginId: string): void {
    this.removeExtensionStyle(pluginId);
  }
}

// Backwards compatibility alias
export const ExternalPluginLoader = ExternalExtensionLoader;
export default ExternalExtensionLoader;
