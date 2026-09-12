/**
 * @module FileTypeRegistry
 * @description
 * Registry for custom file types and extensions supported in Noether.
 * Extensions register custom file types (e.g., .canvas, .excalidraw, .sheet) during onload(),
 * enabling native core features (file tree badges, vault disk scanning, tab view routing,
 * and document stores) to operate purely via Inversion of Control without hardcoded extension rules.
 *
 * @since 0.5.0
 */

import { CustomFileTypeDefinition, Disposable } from '../extensions/types';

export class FileTypeRegistry {
  private fileTypesByExtension: Map<string, CustomFileTypeDefinition> = new Map();
  private fileTypesByDocType: Map<string, CustomFileTypeDefinition> = new Map();
  private listeners: Set<() => void> = new Set();
  private cachedList: CustomFileTypeDefinition[] = [];

  /**
   * Registers a new custom file type definition.
   *
   * @param def - Configuration specifying the extension, docType, viewType, and badge label.
   * @returns A Disposable to unregister the file type.
   */
  public registerFileType(def: CustomFileTypeDefinition): Disposable {
    const ext = def.extension.toLowerCase().replace(/^\./, '').trim();
    const docType = (def.docType || ext).toLowerCase().trim();
    const normalized: CustomFileTypeDefinition = {
      ...def,
      extension: ext,
      docType,
      isRawContent: def.isRawContent ?? true,
    };

    this.fileTypesByExtension.set(ext, normalized);
    this.fileTypesByDocType.set(docType, normalized);
    this.recomputeCache();
    this.notify();

    return {
      dispose: () => {
        this.unregisterFileType(ext);
      },
    };
  }

  /**
   * Unregisters a file type by its primary extension.
   *
   * @param extension - File extension without leading dot.
   */
  public unregisterFileType(extension: string): void {
    const ext = extension.toLowerCase().replace(/^\./, '').trim();
    const def = this.fileTypesByExtension.get(ext);
    if (def) {
      this.fileTypesByExtension.delete(ext);
      this.fileTypesByDocType.delete(def.docType);
      this.recomputeCache();
      this.notify();
    }
  }

  /**
   * Retrieves a file type definition by file extension.
   */
  public getByExtension(ext: string): CustomFileTypeDefinition | undefined {
    if (!ext) return undefined;
    const clean = ext.toLowerCase().replace(/^\./, '').trim();
    return this.fileTypesByExtension.get(clean);
  }

  /**
   * Retrieves a file type definition by document type identifier.
   */
  public getByDocType(docType?: string | null): CustomFileTypeDefinition | undefined {
    if (!docType) return undefined;
    return this.fileTypesByDocType.get(docType.toLowerCase().trim());
  }

  /**
   * Resolves a file type definition matching a filepath or filename based on its extension.
   */
  public getByPath(pathOrTitle?: string | null): CustomFileTypeDefinition | undefined {
    if (!pathOrTitle) return undefined;
    const lower = pathOrTitle.toLowerCase().trim();
    for (const [ext, def] of this.fileTypesByExtension.entries()) {
      if (lower.endsWith(`.${ext}`)) {
        return def;
      }
    }
    return undefined;
  }

  /**
   * Checks whether a given document item or string path represents a registered custom file type.
   */
  public isCustomFileType(item: { doc_type?: string; title?: string } | string | null | undefined): boolean {
    if (!item) return false;
    if (typeof item === 'string') {
      return Boolean(this.getByPath(item) || this.getByExtension(item) || this.getByDocType(item));
    }
    if (item.doc_type && this.getByDocType(item.doc_type)) return true;
    if (item.title && this.getByPath(item.title)) return true;
    return false;
  }

  /**
   * Strips any registered custom file extension from a title or filename string.
   */
  public cleanTitle(pathOrTitle?: string | null): string {
    if (!pathOrTitle) return '';
    const custom = this.getByPath(pathOrTitle);
    if (custom && pathOrTitle.toLowerCase().endsWith(`.${custom.extension}`)) {
      const stripped = pathOrTitle.slice(0, -(custom.extension.length + 1)).trim();
      return stripped || 'Untitled';
    }
    return pathOrTitle;
  }

  /**
   * Returns a snapshot array of all currently registered custom file types.
   */
  public getAll(): CustomFileTypeDefinition[] {
    return this.cachedList;
  }

  /**
   * Returns an array of all registered file extension strings (e.g. ['canvas', 'excalidraw']).
   */
  public getAllExtensions(): string[] {
    return Array.from(this.fileTypesByExtension.keys());
  }

  /**
   * Subscribes to changes in the file type registry.
   */
  public subscribe(listener: () => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private recomputeCache(): void {
    this.cachedList = Array.from(this.fileTypesByExtension.values());
  }

  private notify(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('[FileTypeRegistry] Error in listener:', err);
      }
    });
  }
}

export const fileTypeRegistry = new FileTypeRegistry();

// Pre-register standard built-in spatial canvas format so scanning works before async extension load
fileTypeRegistry.registerFileType({
  extension: 'canvas',
  docType: 'canvas',
  badgeLabel: 'CANVAS',
  viewType: 'canvas',
  defaultContent: JSON.stringify({ nodes: [], edges: [] }, null, 2),
  isRawContent: true,
});
