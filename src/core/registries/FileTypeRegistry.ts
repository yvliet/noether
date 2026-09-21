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
   * Retrieves a file type definition by workspace view type identifier.
   */
  public getByViewType(viewType?: string | null): CustomFileTypeDefinition | undefined {
    if (!viewType) return undefined;
    const clean = viewType.toLowerCase().trim();
    for (const def of this.cachedList) {
      if (def.viewType && def.viewType.toLowerCase().trim() === clean) {
        return def;
      }
    }
    return undefined;
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
   * Strips any registered custom file extension or recognized media extension from a title or filename string.
   */
  public cleanTitle(pathOrTitle?: string | null, docType?: string | null): string {
    if (!pathOrTitle) return '';
    const custom = this.getByDocType(docType) || this.getByPath(pathOrTitle);
    if (custom && pathOrTitle.toLowerCase().endsWith(`.${custom.extension}`)) {
      const stripped = pathOrTitle.slice(0, -(custom.extension.length + 1)).trim();
      return stripped || 'Untitled';
    }
    if (pathOrTitle.toLowerCase().endsWith('.md')) {
      const stripped = pathOrTitle.slice(0, -3).trim();
      return stripped || 'Untitled';
    }
    const lastDot = pathOrTitle.lastIndexOf('.');
    if (lastDot > 0) {
      const ext = pathOrTitle.slice(lastDot + 1).toLowerCase();
      if (MEDIA_EXTENSIONS.has(ext)) {
        const stripped = pathOrTitle.slice(0, lastDot).trim();
        return stripped || 'Untitled';
      }
    }
    return pathOrTitle;
  }

  /**
   * Resolves the uppercase badge text for a file (e.g. "CANVAS", "MP4", "MOV", "GIF", "PNG", "PDF").
   * Returns null for standard markdown notes, and never returns generic "VIDEO" or "IMAGE" labels.
   */
  public getFileBadge(pathOrTitle?: string | null, docType?: string | null): string | null {
    if (!pathOrTitle && !docType) return null;
    const custom = this.getByDocType(docType) || (pathOrTitle ? this.getByPath(pathOrTitle) : undefined);
    if (custom) {
      return custom.badgeLabel || custom.extension.toUpperCase();
    }
    if (pathOrTitle) {
      const lastDot = pathOrTitle.lastIndexOf('.');
      if (lastDot > 0) {
        const ext = pathOrTitle.slice(lastDot + 1).trim();
        if (ext && MEDIA_EXTENSIONS.has(ext.toLowerCase())) {
          return ext.toUpperCase();
        }
      }
    }
    if (
      docType &&
      docType !== 'base' &&
      docType !== 'document' &&
      docType !== 'image' &&
      docType !== 'video' &&
      docType !== 'audio'
    ) {
      return docType.toUpperCase();
    }
    return null;
  }

  /**
   * Detects the high-level media doc_type identifier for a given filename or path.
   */
  public getMediaDocType(filenameOrPath?: string | null): 'image' | 'video' | 'audio' | 'pdf' | null {
    if (!filenameOrPath) return null;
    const lastDot = filenameOrPath.lastIndexOf('.');
    if (lastDot === -1) return null;
    const ext = filenameOrPath.slice(lastDot + 1).toLowerCase().trim();
    if (IMAGE_EXTENSIONS.has(ext)) return 'image';
    if (VIDEO_EXTENSIONS.has(ext)) return 'video';
    if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
    if (DOCUMENT_EXTENSIONS.has(ext)) return 'pdf';
    return null;
  }

  /**
   * Ensures a filename or title includes its registered custom file extension if it is a custom file type.
   *
   * @param pathOrTitle - Filename, title, or relative path.
   * @param docType - Optional document type identifier.
   */
  public ensureExtension(pathOrTitle?: string | null, docType?: string | null): string {
    if (!pathOrTitle) return 'Untitled';
    const custom = this.getByDocType(docType) || this.getByPath(pathOrTitle);
    if (custom && !pathOrTitle.toLowerCase().endsWith(`.${custom.extension}`)) {
      return `${pathOrTitle}.${custom.extension}`;
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

  /**
   * Checks whether a filename or title has a known media extension (image, audio, video, PDF).
   */
  public isMedia(pathOrTitle?: string | null): boolean {
    return isMediaFileName(pathOrTitle);
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

/** Known image and animated graphics formats supported across Noether. */
export const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp',
  'gif', 'apng', 'webp', 'avif',
  'svg', 'svgz',
  'ico', 'cur',
  'bmp', 'dib',
  'heic', 'heif', 'hif',
  'jxl', 'jp2', 'j2k', 'jpf', 'jpx', 'jpm', 'mj2',
  'tiff', 'tif',
  'raw', 'cr2', 'nef', 'arw', 'dng', 'orf', 'rw2', 'pef', 'raf',
  'hdr', 'exr', 'tga',
]);

/** Known video formats supported across Noether. */
export const VIDEO_EXTENSIONS = new Set([
  'mp4', 'm4v', 'mov', 'qt', 'webm', 'mkv',
  'avi', 'wmv', 'asf', 'flv', 'f4v', 'ogv',
  '3gp', '3g2', 'ts', 'mts', 'm2ts', 'vob',
  'mpg', 'mpeg', 'm1v', 'm2v', 'mpv', 'divx', 'rm', 'rmvb',
]);

/** Known audio formats supported across Noether. */
export const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'oga', 'opus', 'spx',
  'm4a', 'aac', 'm4b', 'flac', 'alac',
  'aiff', 'aif', 'aifc', 'wma', 'mid', 'midi',
  'amr', 'ac3', 'eac3',
]);

/** Known document media formats recognized across Noether. */
export const DOCUMENT_EXTENSIONS = new Set([
  'pdf',
]);

/** Exhaustive union of all known image, animated graphic, video, audio, and document media file extensions recognized across Noether. */
export const MEDIA_EXTENSIONS = new Set<string>([
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
]);

/**
 * Checks whether an extension string represents a media asset.
 */
export function isMediaExtension(ext?: string | null): boolean {
  if (!ext) return false;
  return MEDIA_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, '').trim());
}

/**
 * Checks whether a filename or path ends with a recognized media extension.
 */
export function isMediaFileName(filenameOrPath?: string | null): boolean {
  if (!filenameOrPath) return false;
  const parts = filenameOrPath.trim().split('.');
  if (parts.length < 2) return false;
  const ext = parts.pop()?.toLowerCase() || '';
  return MEDIA_EXTENSIONS.has(ext);
}

/**
 * Checks whether a filename or path ends with an image or animated graphic extension.
 */
export function isImageFileName(filenameOrPath?: string | null): boolean {
  if (!filenameOrPath) return false;
  const parts = filenameOrPath.trim().split('.');
  if (parts.length < 2) return false;
  const ext = parts.pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Checks whether a filename or path ends with a video extension.
 */
export function isVideoFileName(filenameOrPath?: string | null): boolean {
  if (!filenameOrPath) return false;
  const parts = filenameOrPath.trim().split('.');
  if (parts.length < 2) return false;
  const ext = parts.pop()?.toLowerCase() || '';
  return VIDEO_EXTENSIONS.has(ext);
}

/**
 * Checks whether a filename or path ends with an audio extension.
 */
export function isAudioFileName(filenameOrPath?: string | null): boolean {
  if (!filenameOrPath) return false;
  const parts = filenameOrPath.trim().split('.');
  if (parts.length < 2) return false;
  const ext = parts.pop()?.toLowerCase() || '';
  return AUDIO_EXTENSIONS.has(ext);
}

/**
 * Checks whether a filename or path ends with a PDF document extension.
 */
export function isPdfFileName(filenameOrPath?: string | null): boolean {
  if (!filenameOrPath) return false;
  return filenameOrPath.toLowerCase().trim().endsWith('.pdf');
}

/**
 * Resolves standard MIME type string for media streaming and source tags.
 */
export function getMediaMimeType(filenameOrPath: string): string {
  const ext = filenameOrPath.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    // Images & Animated
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg':
    case 'jfif':
    case 'pjpeg':
    case 'pjp': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'apng': return 'image/apng';
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
    case 'svg':
    case 'svgz': return 'image/svg+xml';
    case 'bmp':
    case 'dib': return 'image/bmp';
    case 'ico':
    case 'cur': return 'image/x-icon';
    case 'heic': return 'image/heic';
    case 'heif':
    case 'hif': return 'image/heif';
    case 'jxl': return 'image/jxl';
    case 'tiff':
    case 'tif': return 'image/tiff';
    // Videos
    case 'mp4':
    case 'm4v': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'ogv': return 'video/ogg';
    case 'mov':
    case 'qt': return 'video/quicktime';
    case 'mkv': return 'video/x-matroska';
    case 'avi': return 'video/x-msvideo';
    case 'wmv': return 'video/x-ms-wmv';
    case 'flv': return 'video/x-flv';
    case '3gp': return 'video/3gpp';
    case '3g2': return 'video/3gpp2';
    case 'ts':
    case 'mts':
    case 'm2ts': return 'video/mp2t';
    case 'mpg':
    case 'mpeg':
    case 'm1v':
    case 'm2v':
    case 'mpv':
    case 'vob': return 'video/mpeg';
    // Audio
    case 'mp3': return 'audio/mpeg';
    case 'wav': return 'audio/wav';
    case 'ogg':
    case 'oga':
    case 'opus':
    case 'spx': return 'audio/ogg';
    case 'm4a':
    case 'aac':
    case 'm4b': return 'audio/mp4';
    case 'flac': return 'audio/flac';
    case 'alac': return 'audio/alac';
    case 'aiff':
    case 'aif':
    case 'aifc': return 'audio/aiff';
    case 'wma': return 'audio/x-ms-wma';
    case 'mid':
    case 'midi': return 'audio/midi';
    // Documents
    case 'pdf': return 'application/pdf';
    default: return 'application/octet-stream';
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

// Pre-register standard built-in PDF format so vault scanning and view routing work natively
fileTypeRegistry.registerFileType({
  extension: 'pdf',
  docType: 'pdf',
  badgeLabel: 'PDF',
  viewType: 'pdf',
  isRawContent: true,
});


