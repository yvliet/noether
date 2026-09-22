import React from 'react';
import { createRoot } from 'react-dom/client';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { getDocumentById, getDocumentPath, getDocumentDiskPath } from '@/lib/db/documents';
import { dbAdapter } from '@/lib/db/adapter';
import { platform } from '@/lib/platform/platformAdapter';
import {
  IMAGE_EXTENSIONS as IMAGE_EXTS,
  AUDIO_EXTENSIONS as AUDIO_EXTS,
  VIDEO_EXTENSIONS as VIDEO_EXTS,
  DOCUMENT_EXTENSIONS as PDF_EXTS,
  getMediaMimeType,
} from '@/core/registries/FileTypeRegistry';
import { DocumentItem } from '@/types';
import { PdfEmbedViewer } from '@/components/pdf/PdfEmbedViewer';
import katex from 'katex';

export type EmbedKind = 'note' | 'image' | 'audio' | 'video' | 'pdf' | 'youtube' | 'web';

export interface ParsedEmbed {
  kind: EmbedKind;
  target: string;
  noteTitle: string;
  headingAnchor: string | null;
  aliasOrDimensions: string | null;
  width: number | null;
  height: number | null;
  page: number | null;
  url: string;
  isExternalUrl: boolean;
  youtubeId: string | null;
}

let cachedDocsRef: any = null;
let cachedDocIndex: Map<string, any> = new Map();
const imageSrcCache = new Map<string, string>();

interface CachedPdfWidget {
  container: HTMLElement;
  wrapper: HTMLElement;
  root: import('react-dom/client').Root;
  lastTarget: string;
}
const pdfWidgetCache = new Map<string, CachedPdfWidget>();

/**
 * Evicts cached image source strings and PDF widgets for a deleted or renamed document/target.
 * If called without arguments, flushes the caches.
 */
export function evictImageSrcCache(targetOrTitleOrId?: string): void {
  if (!targetOrTitleOrId) {
    imageSrcCache.clear();
    for (const entry of pdfWidgetCache.values()) {
      try {
        entry.root?.unmount();
      } catch {}
    }
    pdfWidgetCache.clear();
    return;
  }
  const keys = normalizeTargetKeys(targetOrTitleOrId);
  for (const k of keys) {
    imageSrcCache.delete(k);
  }
  imageSrcCache.delete(targetOrTitleOrId.trim().toLowerCase());

  for (const [key, entry] of pdfWidgetCache.entries()) {
    if (keys.some((k) => key.toLowerCase().includes(k))) {
      try {
        entry.root?.unmount();
      } catch {}
      pdfWidgetCache.delete(key);
    }
  }
}

if (typeof window !== 'undefined') {
  import('@/core/app/NoetherApp')
    .then(({ appInstance }) => {
      appInstance?.events?.on('document:deleted', ({ id, title }) => {
        evictImageSrcCache(id);
        if (title) evictImageSrcCache(title);
      });
    })
    .catch(() => {});
}

/**
 * Normalizes target string into all possible canonical match keys (lowercase, without ext, basenames, URL decoded).
 */
export function normalizeTargetKeys(target: string): string[] {
  if (!target) return [];
  const keys = new Set<string>();
  const candidates = [target.trim()];
  try {
    const decoded = decodeURIComponent(target.trim());
    if (decoded !== target.trim()) candidates.push(decoded);
  } catch {}

  for (const raw of candidates) {
    const lower = raw.toLowerCase();
    keys.add(lower);
    const withoutExt = lower.replace(/\.[a-zA-Z0-9]+$/, '');
    keys.add(withoutExt);
    const slashBase = withoutExt.split('/').pop() || withoutExt;
    keys.add(slashBase);
    const slashBaseWithExt = lower.split('/').pop() || lower;
    keys.add(slashBaseWithExt);
    const backslashBase = withoutExt.split('\\').pop() || withoutExt;
    keys.add(backslashBase);
    const backslashBaseWithExt = lower.split('\\').pop() || lower;
    keys.add(backslashBaseWithExt);
  }

  return Array.from(keys);
}

export function getDocIndex(documents: any[]): Map<string, any> {
  if (cachedDocsRef === documents) {
    return cachedDocIndex;
  }
  cachedDocsRef = documents;
  cachedDocIndex = new Map();
  for (let i = 0; i < documents.length; i++) {
    const d = documents[i];
    if (d.is_folder) continue;
    const titleLower = d.title.toLowerCase();
    const cleanWithoutExt = titleLower.replace(/\.[a-zA-Z0-9]+$/, '');
    const targetBaseName = cleanWithoutExt.split('/').pop() || cleanWithoutExt;
    const targetBaseNameWithExt = titleLower.split('/').pop() || titleLower;
    const backslashBase = cleanWithoutExt.split('\\').pop() || cleanWithoutExt;
    const backslashBaseWithExt = titleLower.split('\\').pop() || titleLower;

    if (!cachedDocIndex.has(titleLower)) cachedDocIndex.set(titleLower, d);
    if (!cachedDocIndex.has(cleanWithoutExt)) cachedDocIndex.set(cleanWithoutExt, d);
    if (!cachedDocIndex.has(targetBaseName)) cachedDocIndex.set(targetBaseName, d);
    if (!cachedDocIndex.has(targetBaseNameWithExt)) cachedDocIndex.set(targetBaseNameWithExt, d);
    if (!cachedDocIndex.has(backslashBase)) cachedDocIndex.set(backslashBase, d);
    if (!cachedDocIndex.has(backslashBaseWithExt)) cachedDocIndex.set(backslashBaseWithExt, d);
    if (!cachedDocIndex.has(`${titleLower}.md`)) cachedDocIndex.set(`${titleLower}.md`, d);
    if (!cachedDocIndex.has(d.id)) cachedDocIndex.set(d.id, d);
  }
  return cachedDocIndex;
}

/**
 * Synchronously retrieves cached image src (data URL, blob URL, or external URL) if loaded.
 */
export function getCachedImageSrc(target: string, docId?: string): string | null {
  if (!target) return null;
  if (/^(https?|data:image|data:audio|data:video|blob|file):/i.test(target)) return target;

  const keys = normalizeTargetKeys(target);
  for (const k of keys) {
    const cached = imageSrcCache.get(k);
    if (cached) return cached;
  }

  const ds = useDocumentStore.getState();
  const docIndex = getDocIndex(ds.documents);
  let matched: any = docId ? ds.documents.find((d) => d.id === docId) : null;
  if (!matched) {
    for (const k of keys) {
      matched = docIndex.get(k);
      if (matched) break;
    }
  }

  if (matched?.content_json) {
    try {
      const parsed = JSON.parse(matched.content_json);
      const firstText = parsed.content?.[0]?.content?.[0]?.text;
      if (
        firstText &&
        (firstText.startsWith('data:image/') ||
          firstText.startsWith('data:audio/') ||
          firstText.startsWith('data:video/') ||
          firstText.startsWith('http') ||
          firstText.startsWith('blob:') ||
          firstText.startsWith('file:'))
      ) {
        for (const k of keys) {
          imageSrcCache.set(k, firstText);
        }
        return firstText;
      }
    } catch {}
  } else if (
    (matched as any)?.content &&
    (String((matched as any).content).startsWith('data:image/') ||
      String((matched as any).content).startsWith('data:audio/') ||
      String((matched as any).content).startsWith('data:video/') ||
      String((matched as any).content).startsWith('http') ||
      String((matched as any).content).startsWith('blob:') ||
      String((matched as any).content).startsWith('file:'))
  ) {
    const rawContent = String((matched as any).content);
    for (const k of keys) {
      imageSrcCache.set(k, rawContent);
    }
    return rawContent;
  }
  return null;
}

/**
 * Asynchronously resolves the image/media src from memory or SQLite storage.
 */
export async function resolveImageSrcAsync(target: string, docId?: string): Promise<string | null> {
  const syncHit = getCachedImageSrc(target, docId);
  if (syncHit) return syncHit;

  const keys = normalizeTargetKeys(target);
  const ds = useDocumentStore.getState();
  let matched: any = docId ? ds.documents.find((d) => d.id === docId) : null;

  if (!matched) {
    const docIndex = getDocIndex(ds.documents);
    for (const k of keys) {
      matched = docIndex.get(k);
      if (matched) break;
    }
  }

  // Fallback: If not found in memory store, query SQLite directly
  if (!matched) {
    try {
      const placeholders = keys.map(() => '?').join(' OR LOWER(title) = ');
      const dbDocs = await dbAdapter.query<DocumentItem>(
        `SELECT id, title, content_json FROM documents WHERE LOWER(title) = ${placeholders} OR id = ? LIMIT 1`,
        [...keys, target]
      );
      if (dbDocs && dbDocs.length > 0) {
        matched = dbDocs[0];
      }
    } catch {}
  }

  if (!matched) {
    if (platform.isDesktop()) {
      try {
        const res = await platform.readBinaryFile(target);
        if (res.success && res.data) {
          const mime = getMediaMimeType(target);
          const dataUrl = `data:${mime};base64,${res.data}`;
          for (const k of keys) {
            imageSrcCache.set(k, dataUrl);
          }
          return dataUrl;
        }
      } catch {}
    }
    return null;
  }

  try {
    let fullDoc = matched;
    if (!fullDoc.content_json || fullDoc.content_json === '{}' || fullDoc.content_json === '') {
      fullDoc = await getDocumentById(matched.id);
    }
    if (fullDoc?.content_json) {
      const parsed = JSON.parse(fullDoc.content_json);
      const firstText = parsed.content?.[0]?.content?.[0]?.text;
      if (
        firstText &&
        (firstText.startsWith('data:image/') ||
          firstText.startsWith('data:audio/') ||
          firstText.startsWith('data:video/') ||
          firstText.startsWith('http') ||
          firstText.startsWith('blob:') ||
          firstText.startsWith('file:'))
      ) {
        for (const k of keys) {
          imageSrcCache.set(k, firstText);
        }
        return firstText;
      }
    } else if (
      (fullDoc as any)?.content &&
      (String((fullDoc as any).content).startsWith('data:image/') ||
        String((fullDoc as any).content).startsWith('data:audio/') ||
        String((fullDoc as any).content).startsWith('data:video/') ||
        String((fullDoc as any).content).startsWith('http') ||
        String((fullDoc as any).content).startsWith('blob:') ||
        String((fullDoc as any).content).startsWith('file:'))
    ) {
      const rawContent = String((fullDoc as any).content);
      for (const k of keys) {
        imageSrcCache.set(k, rawContent);
      }
      return rawContent;
    }

    // Disk fallback for media documents without in-memory data URLs
    if (platform.isDesktop()) {
      const targetDoc = fullDoc || matched;
      const allDocs = ds.documents;
      const relPath = getDocumentDiskPath(targetDoc, getDocumentPath(targetDoc, allDocs));
      const res = await platform.readBinaryFile(relPath);
      if (res.success && res.data) {
        const mime = getMediaMimeType(targetDoc?.title || target);
        const dataUrl = `data:${mime};base64,${res.data}`;
        for (const k of keys) {
          imageSrcCache.set(k, dataUrl);
        }
        return dataUrl;
      }
    }
  } catch {}

  return null;
}

/**
 * Extracts YouTube video ID from standard YouTube URL patterns
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const match = url.match(ytRegex);
  return match ? match[1] : null;
}

/**
 * Parses dimension string like "300", "300x200", "300px" into width and height numbers
 */
export function parseDimensions(dimStr: string | null): { width: number | null; height: number | null } {
  if (!dimStr) return { width: null, height: null };
  const clean = dimStr.trim().toLowerCase().replace(/px/g, '');
  if (/^\d+x\d+$/.test(clean)) {
    const [w, h] = clean.split('x').map(Number);
    return { width: isNaN(w) ? null : w, height: isNaN(h) ? null : h };
  }
  if (/^\d+$/.test(clean)) {
    const w = Number(clean);
    return { width: isNaN(w) ? null : w, height: null };
  }
  return { width: null, height: null };
}

/**
 * Parses raw embed syntax string into a structured ParsedEmbed descriptor
 */
export function parseEmbedTarget(raw: string, format: 'wikilink' | 'markdown' = 'wikilink', altText: string = ''): ParsedEmbed {
  let target = raw.trim();
  let aliasOrDim: string | null = null;
  let headingAnchor: string | null = null;

  if (format === 'wikilink') {
    if (target.includes('|')) {
      const parts = target.split('|');
      target = parts[0].trim();
      aliasOrDim = parts.slice(1).join('|').trim();
    }
  } else {
    // Markdown format: altText may contain dimension like "alt|300x200" or "300"
    if (altText && altText.includes('|')) {
      const parts = altText.split('|');
      aliasOrDim = parts.slice(1).join('|').trim();
    } else if (altText && /^\d+(x\d+)?$/.test(altText.trim())) {
      aliasOrDim = altText.trim();
    }
  }

  let pageNumber: number | null = null;
  if (target.includes('#')) {
    const parts = target.split('#');
    const anchor = parts.slice(1).join('#').trim();
    const pageMatch = anchor.match(/^(?:page=|p=)?(\d+)$/i);
    if (pageMatch) {
      pageNumber = parseInt(pageMatch[1], 10);
      target = parts[0].trim();
    }
  }

  if (!pageNumber && aliasOrDim) {
    const pageMatch = aliasOrDim.match(/^(?:page=|p=)(\d+)$/i);
    if (pageMatch) {
      pageNumber = parseInt(pageMatch[1], 10);
    }
  }

  const { width, height } = parseDimensions(aliasOrDim);

  const isExternalUrl = /^https?:\/\//i.test(target) || /^data:/i.test(target) || /^blob:/i.test(target) || /^file:\/\//i.test(target);
  const ytId = extractYouTubeId(target);

  if (ytId) {
    return {
      kind: 'youtube',
      target,
      noteTitle: '',
      headingAnchor: null,
      aliasOrDimensions: aliasOrDim,
      width,
      height,
      page: null,
      url: target,
      isExternalUrl: true,
      youtubeId: ytId,
    };
  }

  // Check extension from target or URL path
  const pathWithoutQuery = target.split('?')[0].split('#')[0];
  const lastDot = pathWithoutQuery.lastIndexOf('.');
  const ext = lastDot !== -1 ? pathWithoutQuery.slice(lastDot + 1).toLowerCase() : '';

  if (IMAGE_EXTS.has(ext)) {
    return {
      kind: 'image',
      target,
      noteTitle: '',
      headingAnchor: null,
      aliasOrDimensions: aliasOrDim,
      width,
      height,
      page: null,
      url: target,
      isExternalUrl,
      youtubeId: null,
    };
  }

  if (AUDIO_EXTS.has(ext)) {
    return {
      kind: 'audio',
      target,
      noteTitle: '',
      headingAnchor: null,
      aliasOrDimensions: aliasOrDim,
      width,
      height,
      page: null,
      url: target,
      isExternalUrl,
      youtubeId: null,
    };
  }

  if (VIDEO_EXTS.has(ext)) {
    return {
      kind: 'video',
      target,
      noteTitle: '',
      headingAnchor: null,
      aliasOrDimensions: aliasOrDim,
      width,
      height,
      page: null,
      url: target,
      isExternalUrl,
      youtubeId: null,
    };
  }

  if (PDF_EXTS.has(ext)) {
    // If a single dimension was passed like ![[doc.pdf|600]], use it as height if no 'x' was present
    const resolvedHeight = height || (width && !aliasOrDim?.includes('x') ? width : null);
    const resolvedWidth = aliasOrDim?.includes('x') ? width : null;

    return {
      kind: 'pdf',
      target,
      noteTitle: '',
      headingAnchor: null,
      aliasOrDimensions: aliasOrDim,
      width: resolvedWidth,
      height: resolvedHeight,
      page: pageNumber,
      url: target,
      isExternalUrl,
      youtubeId: null,
    };
  }

  if (isExternalUrl) {
    return {
      kind: 'web',
      target,
      noteTitle: '',
      headingAnchor: null,
      aliasOrDimensions: aliasOrDim,
      width,
      height,
      page: null,
      url: target,
      isExternalUrl: true,
      youtubeId: null,
    };
  }

  // Otherwise, default to Note transclusion / Note embed
  let notePart = target;
  if (notePart.includes('#')) {
    const parts = notePart.split('#');
    notePart = parts[0].trim();
    headingAnchor = parts.slice(1).join('#').trim();
  }

  return {
    kind: 'note',
    target,
    noteTitle: notePart,
    headingAnchor,
    aliasOrDimensions: aliasOrDim,
    width,
    height,
    page: pageNumber,
    url: target,
    isExternalUrl: false,
    youtubeId: null,
  };
}

/**
 * Renders inline markdown text (bold, italic, code, math, links) into sanitized HTML string
 */
function renderInlineFormatting(text: string): string {
  if (!text) return '';
  return text
    // Block / inline math
    .replace(/\$\$([\s\S]*?)\$\$/g, (_m, tex) => {
      try {
        return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
      } catch {
        return `$$${tex}$$`;
      }
    })
    .replace(/(?<![\$\\])\$(?!\s)([^\$\n]+?)(?<!\s)\$(?![\$0-9])/g, (_m, tex) => {
      try {
        return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return `$${tex}$`;
      }
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 text-[11px] font-mono bg-[#222222] border border-[#333333] rounded text-[#e6b450]">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em class="italic text-[#ddd]">$1</em>')
    // Strikethrough
    .replace(/~~([^~]+)~~/g, '<del class="line-through text-[#888]">$1</del>')
    // Highlight
    .replace(/==([^=]+)==/g, '<mark class="bg-[#ffd54f]/30 text-white px-0.5 rounded">$1</mark>')
    // Markdown links: [text](url) or [text]([[target]]) or [text](target)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
      const trimmed = url.trim();
      let wikiTarget: string | null = null;
      if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
        let inner = trimmed.slice(2, -2).trim();
        if (inner.includes('|')) inner = inner.split('|')[0].trim();
        if (inner) wikiTarget = inner;
      } else if (!/^(https?|mailto|ftp|file|data|blob):/i.test(trimmed) && !trimmed.startsWith('#')) {
        const decoded = decodeURIComponent(trimmed).replace(/\.md$/, '').trim();
        if (decoded) wikiTarget = decoded;
      }

      if (wikiTarget) {
        return `<span class="md-wikilink text-[var(--noether-link-color)] hover:underline cursor-pointer select-text" data-wikilink-target="${wikiTarget}">${text}</span>`;
      }
      return `<a href="${trimmed}" target="_blank" rel="noreferrer" class="text-[var(--noether-link-color)] hover:underline inline-flex items-center gap-0.5">${text}</a>`;
    })
    // Wikilinks: [[target|alias]] or [[target]]
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
      const label = alias || target;
      return `<span class="md-wikilink text-[var(--noether-link-color)] hover:underline cursor-pointer select-text" data-wikilink-target="${target}">${label}</span>`;
    });
}

/**
 * Extracts nodes under a specific heading from TipTap document JSON
 */
function filterNodesByHeading(nodes: any[], targetHeading: string): any[] {
  if (!nodes || nodes.length === 0) return [];
  const cleanTarget = targetHeading.trim().toLowerCase();

  let targetLevel = 1;
  let capturing = false;
  const captured: any[] = [];

  for (const node of nodes) {
    if (node.type === 'heading') {
      const hText = (node.content || []).map((c: any) => c.text || '').join('').trim().toLowerCase();
      const level = node.attrs?.level || 1;

      if (!capturing) {
        if (hText === cleanTarget || hText.includes(cleanTarget)) {
          capturing = true;
          targetLevel = level;
          captured.push(node);
        }
      } else {
        // If we hit another heading of same or higher level, stop capturing
        if (level <= targetLevel) {
          break;
        }
        captured.push(node);
      }
    } else if (capturing) {
      captured.push(node);
    }
  }

  return captured.length > 0 ? captured : nodes;
}

/**
 * Converts TipTap nodes into rendered HTML for note transclusion
 */
function renderTipTapNodesToHtml(nodes: any[]): string {
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    return '<p class="text-xs text-[#777] italic my-1">Empty note</p>';
  }

  let html = '';

  for (const node of nodes) {
    if (!node) continue;

    if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      const text = (node.content || []).map((c: any) => c.text || '').join('');
      const Tag = `h${Math.min(6, level + 1)}`; // Render embedded headings slightly smaller
      const headingClass = level === 1 ? 'text-sm font-bold text-white mt-3 mb-1' : level === 2 ? 'text-xs font-semibold text-[#f0f0f0] mt-2.5 mb-1' : 'text-xs font-medium text-[#e0e0e0] mt-2 mb-1';
      html += `<${Tag} class="${headingClass}">${renderInlineFormatting(text)}</${Tag}>`;
    } else if (node.type === 'paragraph') {
      const text = (node.content || []).map((c: any) => c.text || '').join('');
      if (!text.trim()) {
        html += '<div class="h-2"></div>';
      } else {
        html += `<p class="text-xs text-[#cccccc] leading-relaxed my-1.5">${renderInlineFormatting(text)}</p>`;
      }
    } else if (node.type === 'codeBlock') {
      const lang = node.attrs?.language || '';
      const code = (node.content || []).map((c: any) => c.text || '').join('');
      html += `<div class="my-2 rounded border border-[#2d2d2d] bg-[#141414] overflow-hidden"><div class="px-2.5 py-1 bg-[#1e1e1e] border-b border-[#2d2d2d] text-[10px] text-[#888] font-mono">${lang || 'code'}</div><pre class="p-2.5 text-xs font-mono text-[#dcdcdc] overflow-x-auto"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre></div>`;
    } else if (node.type === 'blockquote') {
      const inner = (node.content || []).map((c: any) => (c.content || []).map((t: any) => t.text || '').join('')).join(' ');
      html += `<div class="my-2 pl-3 py-1 border-l-2 border-[var(--noether-accent)] bg-[var(--noether-accent)]/5 text-xs text-[#cccccc] rounded-r">${renderInlineFormatting(inner)}</div>`;
    } else if (node.type === 'bulletList') {
      html += '<ul class="my-1.5 space-y-1 text-xs text-[#cccccc] pl-4" style="list-style-type: \'•  \'">';
      for (const item of node.content || []) {
        const itemText = (item.content || []).map((c: any) => (c.content || []).map((t: any) => t.text || '').join('')).join('');
        html += `<li>${renderInlineFormatting(itemText)}</li>`;
      }
      html += '</ul>';
    } else if (node.type === 'orderedList') {
      html += '<ol class="my-1.5 space-y-1 text-xs text-[#cccccc] pl-4 list-decimal">';
      for (const item of node.content || []) {
        const itemText = (item.content || []).map((c: any) => (c.content || []).map((t: any) => t.text || '').join('')).join('');
        html += `<li>${renderInlineFormatting(itemText)}</li>`;
      }
      html += '</ol>';
    } else if (node.type === 'taskList') {
      html += '<ul class="my-1.5 space-y-1 text-xs text-[#cccccc] pl-1 list-none">';
      for (const item of node.content || []) {
        const checked = Boolean(item.attrs?.checked);
        const itemText = (item.content || []).map((c: any) => (c.content || []).map((t: any) => t.text || '').join('')).join('');
        html += `<li class="flex items-start gap-1.5"><span class="flex items-center justify-center h-4 shrink-0"><input type="checkbox" ${checked ? 'checked' : ''} disabled class="accent-[var(--noether-accent)] rounded m-0" /></span><span class="${checked ? 'line-through text-[#666]' : ''}">${renderInlineFormatting(itemText)}</span></li>`;
      }
      html += '</ul>';
    } else if (node.type === 'table') {
      html += '<div class="my-2 overflow-x-auto rounded border border-[#2a2a2a] bg-[#161616]"><table class="w-full text-xs text-left border-collapse">';
      const rows = node.content || [];
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const isHeader = r === 0;
        const CellTag = isHeader ? 'th' : 'td';
        const rowClass = isHeader ? 'bg-[#202020] border-b border-[#2a2a2a] text-[#e0e0e0] font-semibold' : 'border-b border-[#222222] text-[#cccccc]';
        html += `<tr class="${rowClass}">`;
        for (const cell of row.content || []) {
          const cellText = (cell.content || []).map((c: any) => (c.content || []).map((t: any) => t.text || '').join('')).join('');
          html += `<${CellTag} class="px-2.5 py-1.5">${renderInlineFormatting(cellText)}</${CellTag}>`;
        }
        html += '</tr>';
      }
      html += '</table></div>';
    } else if (node.type === 'horizontalRule') {
      html += '<hr class="my-3 border-t border-[#2a2a2a]" />';
    }
  }

  return html;
}

/**
 * Handles navigation to a note from inside an embed card
 */
export function navigateToNote(title: string, isSplit: boolean = false) {
  if (!title || !title.trim()) {
    return;
  }

  const ws = useWorkspaceStore.getState();
  const ds = useDocumentStore.getState();
  const allDocs = ds.documents;

  const cleanTarget = title.trim().toLowerCase();
  const cleanWithoutExt = cleanTarget.replace(/\.md$/, '');
  const targetBaseName = cleanWithoutExt.split('/').pop() || cleanWithoutExt;

  const matchedDoc = allDocs.find((d) => {
    if (d.is_folder) return false;
    const titleLower = d.title.toLowerCase();
    return (
      titleLower === cleanTarget ||
      titleLower === cleanWithoutExt ||
      titleLower === targetBaseName ||
      `${titleLower}.md` === cleanTarget
    );
  });

  const shouldSplit = isSplit || (ws.isSplitView && ws.activePane === 'split');

  if (matchedDoc) {
    if (shouldSplit) {
      ws.openSplitTab(matchedDoc.id, matchedDoc.title);
    } else {
      ws.openTab(matchedDoc.id, matchedDoc.title);
      ds.setActiveDocumentById(matchedDoc.id);
    }
    ws.setMainViewMode('document');
  } else {
    ds.createNewNote(title, null, 'base', false).then((newDoc) => {
      if (newDoc) {
        if (shouldSplit) {
          ws.openSplitTab(newDoc.id, newDoc.title);
        } else {
          ws.openTab(newDoc.id, newDoc.title);
          ds.setActiveDocumentById(newDoc.id);
        }
        ws.setMainViewMode('document');
      }
    });
  }
}

/**
 * Renders the live embed DOM widget for ProseMirror decorations
 */
export function renderEmbedWidget(
  rawTarget: string,
  format: 'wikilink' | 'markdown' = 'wikilink',
  currentDocId: string | null = null,
  altText: string = '',
  visitedDocIds: Set<string> = new Set()
): HTMLElement {
  const embed = parseEmbedTarget(rawTarget, format, altText);
  const container = document.createElement('div');
  container.className = 'noether-embed-wrapper';

  // 1. YouTube Video Embed
  if (embed.kind === 'youtube' && embed.youtubeId) {
    const card = document.createElement('div');
    card.className = 'noether-embed-card noether-youtube-embed rounded-lg border border-[#2a2a2a] bg-[#141414] overflow-hidden my-2';
    
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${embed.youtubeId}`;
    iframe.className = 'w-full aspect-video border-0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    card.appendChild(iframe);
    container.appendChild(card);
    return container;
  }

  // 2. Image Embed
  if (embed.kind === 'image') {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'noether-embed-media noether-image-embed relative group my-0.5 inline-block max-w-full leading-none';

    const keys = normalizeTargetKeys(embed.target);
    let resolvedSrc: string | null = embed.isExternalUrl ? embed.url : null;
    let pendingFetchDocId: string | null = null;

    if (!embed.isExternalUrl) {
      for (const k of keys) {
        const cached = imageSrcCache.get(k);
        if (cached) {
          resolvedSrc = cached;
          break;
        }
      }

      if (!resolvedSrc) {
        const ds = useDocumentStore.getState();
        const docIndex = getDocIndex(ds.documents);
        let matched: any = null;
        for (const k of keys) {
          matched = docIndex.get(k);
          if (matched) break;
        }

        if (matched) {
          if (matched.content_json) {
            try {
              const parsed = JSON.parse(matched.content_json);
              const firstText = parsed.content?.[0]?.content?.[0]?.text;
              if (
                firstText &&
                (firstText.startsWith('data:image/') ||
                  firstText.startsWith('http') ||
                  firstText.startsWith('blob:') ||
                  firstText.startsWith('file:'))
              ) {
                resolvedSrc = firstText;
                for (const k of keys) {
                  imageSrcCache.set(k, firstText);
                }
              }
            } catch {}
          }
          if (!resolvedSrc) {
            pendingFetchDocId = matched.id;
          }
        }
      }
    }

    // Floating Hover Actions Pill: Zoom (+) and Code (</>)
    const actionsOverlay = document.createElement('div');
    actionsOverlay.className =
      'noether-embed-actions absolute top-2 right-2 hidden group-hover:flex items-center gap-0.5 bg-[#1e1e1e]/95 border border-[#383838] rounded-md px-1 py-0.5 shadow-lg z-20 transition-none pointer-events-auto select-none';

    const zoomBtn = document.createElement('button');
    zoomBtn.type = 'button';
    zoomBtn.setAttribute('data-tooltip', 'Zoom image');
    zoomBtn.setAttribute('aria-label', 'Zoom image');
    zoomBtn.setAttribute('data-embed-action', 'zoom');
    zoomBtn.className =
      'p-1 rounded text-[#a0a0a0] hover:text-white hover:bg-[#303030] cursor-pointer transition-none flex items-center justify-center';
    zoomBtn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
    zoomBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      useWorkspaceStore.getState().openImageLightbox(
        resolvedSrc || img.src || embed.url,
        embed.aliasOrDimensions || altText || embed.target || ''
      );
    };

    const codeBtn = document.createElement('button');
    codeBtn.type = 'button';
    codeBtn.setAttribute('data-tooltip', 'Edit embed source');
    codeBtn.setAttribute('aria-label', 'Edit embed source');
    codeBtn.setAttribute('data-embed-action', 'code');
    codeBtn.className =
      'p-1 rounded text-[#a0a0a0] hover:text-white hover:bg-[#303030] cursor-pointer transition-none flex items-center justify-center';
    codeBtn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
    codeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.dispatchEvent(
        new CustomEvent('noether:focus-embed-code', {
          detail: { target: rawTarget, cleanTarget: embed.target },
        })
      );
    };

    actionsOverlay.appendChild(zoomBtn);
    actionsOverlay.appendChild(codeBtn);
    imgWrapper.appendChild(actionsOverlay);

    const img = document.createElement('img');
    img.alt = embed.aliasOrDimensions || altText || embed.target;
    img.className = 'noether-media-image rounded-md border border-[#2a2a2a] max-w-full h-auto object-contain cursor-text select-none';
    img.loading = 'lazy';
    img.draggable = false;
    img.ondragstart = (e) => e.preventDefault();

    if (embed.width) {
      img.style.width = `${embed.width}px`;
    }
    if (embed.height) {
      img.style.height = `${embed.height}px`;
    }

    let fallbackEl: HTMLElement | null = null;
    const showFallback = () => {
      if (fallbackEl) return;
      img.style.display = 'none';
      actionsOverlay.style.display = 'none';
      fallbackEl = document.createElement('div');
      fallbackEl.className =
        'flex items-center gap-2 px-3 py-2 rounded-md border border-[#333333] bg-[#1a1a1a] text-xs text-[#888888]';
      fallbackEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span>Image not found: ${embed.target}</span>`;
      imgWrapper.appendChild(fallbackEl);
    };

    const hideFallback = () => {
      if (fallbackEl && fallbackEl.parentNode) {
        fallbackEl.parentNode.removeChild(fallbackEl);
        fallbackEl = null;
      }
      img.style.display = '';
      actionsOverlay.style.display = '';
    };

    if (resolvedSrc) {
      img.src = resolvedSrc;
    } else {
      // Keep img hidden while asynchronously fetching to prevent browser 404 network errors on relative target path
      img.style.display = 'none';
      actionsOverlay.style.display = 'none';

      const applyResolvedImage = (src: string | null) => {
        if (src) {
          for (const k of keys) {
            imageSrcCache.set(k, src);
          }
          resolvedSrc = src;
          img.src = src;
          hideFallback();
        } else {
          showFallback();
        }
      };

      if (pendingFetchDocId) {
        getDocumentById(pendingFetchDocId)
          .then((fullDoc) => {
            let found: string | null = null;
            if (fullDoc?.content_json) {
              try {
                const parsed = JSON.parse(fullDoc.content_json);
                const firstText = parsed.content?.[0]?.content?.[0]?.text;
                if (
                  firstText &&
                  (firstText.startsWith('data:image/') ||
                    firstText.startsWith('http') ||
                    firstText.startsWith('blob:') ||
                    firstText.startsWith('file:'))
                ) {
                  found = firstText;
                }
              } catch {}
            } else if ((fullDoc as any)?.content) {
              const raw = String((fullDoc as any).content);
              if (
                raw.startsWith('data:image/') ||
                raw.startsWith('http') ||
                raw.startsWith('blob:') ||
                raw.startsWith('file:')
              ) {
                found = raw;
              }
            }

            if (found) {
              applyResolvedImage(found);
            } else {
              resolveImageSrcAsync(embed.target, pendingFetchDocId).then(applyResolvedImage).catch(() => showFallback());
            }
          })
          .catch(() => {
            resolveImageSrcAsync(embed.target).then(applyResolvedImage).catch(() => showFallback());
          });
      } else {
        resolveImageSrcAsync(embed.target).then(applyResolvedImage).catch(() => showFallback());
      }
    }

    img.onerror = () => {
      if (img.src && !img.src.endsWith('/')) {
        showFallback();
      }
    };

    img.onload = () => {
      hideFallback();
    };

    const triggerLightbox = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const currentSrc = resolvedSrc || img.src || embed.url;
      if (currentSrc) {
        useWorkspaceStore.getState().openImageLightbox(
          currentSrc,
          embed.aliasOrDimensions || altText || embed.target || ''
        );
      }
    };

    img.ondblclick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      triggerLightbox(e);
    };

    img.onclick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      triggerLightbox(e);
    };

    imgWrapper.appendChild(img);
    container.appendChild(imgWrapper);
    return container;
  }

  // 3. Audio Embed
  if (embed.kind === 'audio') {
    const audioCard = document.createElement('div');
    audioCard.className = 'noether-embed-card noether-audio-embed rounded-lg border border-[#2a2a2a] bg-[#181818] p-3 my-2 max-w-lg';
    
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2 mb-2 text-xs font-medium text-[#cccccc] truncate';
    header.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[var(--noether-accent)] shrink-0"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span class="truncate">${embed.target}</span>`;
    audioCard.appendChild(header);

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.className = 'w-full h-8';
    
    if (embed.isExternalUrl) {
      audio.src = embed.url;
    } else {
      resolveImageSrcAsync(embed.target).then((src) => {
        if (src) audio.src = src;
      }).catch(() => {});
    }
    audioCard.appendChild(audio);

    container.appendChild(audioCard);
    return container;
  }

  // 4. Video Embed
  if (embed.kind === 'video') {
    const videoCard = document.createElement('div');
    videoCard.className = 'noether-embed-card noether-video-embed rounded-lg border border-[#2a2a2a] bg-[#141414] overflow-hidden my-2 max-w-2xl';

    const video = document.createElement('video');
    video.controls = true;
    video.className = 'w-full max-h-[460px] object-contain bg-black';
    if (embed.width) video.style.width = `${embed.width}px`;
    if (embed.height) video.style.height = `${embed.height}px`;

    if (embed.isExternalUrl) {
      video.src = embed.url;
    } else {
      resolveImageSrcAsync(embed.target).then((src) => {
        if (src) video.src = src;
      }).catch(() => {});
    }

    videoCard.appendChild(video);
    container.appendChild(videoCard);
    return container;
  }

  // 5. PDF Embed
  if (embed.kind === 'pdf') {
    const cacheKey = `${rawTarget}_${embed.target}_${embed.page || 1}_${embed.height || 520}_${embed.width || 'auto'}`;
    const cached = pdfWidgetCache.get(cacheKey);

    if (cached && cached.container) {
      cached.root.render(
        React.createElement(PdfEmbedViewer, {
          target: embed.target,
          rawTarget: rawTarget,
          initialPage: embed.page || 1,
          height: embed.height || 520,
          width: embed.width || null,
        })
      );
      return cached.container;
    }

    const pdfWrapper = document.createElement('div');
    pdfWrapper.className = 'noether-embed-media noether-pdf-embed-wrapper my-1.5 w-full max-w-full';

    const root = createRoot(pdfWrapper);
    root.render(
      React.createElement(PdfEmbedViewer, {
        target: embed.target,
        rawTarget: rawTarget,
        initialPage: embed.page || 1,
        height: embed.height || 520,
        width: embed.width || null,
      })
    );

    container.appendChild(pdfWrapper);

    if (pdfWidgetCache.size >= 16) {
      const oldestKey = pdfWidgetCache.keys().next().value;
      if (oldestKey) {
        const oldEntry = pdfWidgetCache.get(oldestKey);
        try {
          oldEntry?.root?.unmount();
        } catch {}
        pdfWidgetCache.delete(oldestKey);
      }
    }

    pdfWidgetCache.set(cacheKey, {
      container,
      wrapper: pdfWrapper,
      root,
      lastTarget: embed.target,
    });

    return container;
  }

  // 6. Note Transclusion / Note Embed
  const ds = useDocumentStore.getState();
  const cleanTarget = embed.noteTitle.trim().toLowerCase();
  const cleanWithoutExt = cleanTarget.replace(/\.md$/, '');
  const targetBaseName = cleanWithoutExt.split('/').pop() || cleanWithoutExt;

  const docIndex = getDocIndex(ds.documents);
  const matchedDoc =
    docIndex.get(cleanTarget) ||
    docIndex.get(cleanWithoutExt) ||
    docIndex.get(targetBaseName) ||
    docIndex.get(`${cleanTarget}.md`) ||
    docIndex.get(embed.noteTitle);

  const card = document.createElement('div');
  card.className = 'noether-embed-card noether-note-embed rounded-lg border border-[#2e2e2e] bg-[#161616]/90 my-2.5 overflow-hidden shadow-xs';

  // Circular embed detection
  const currentOrSelfId = currentDocId || ds.activeDocument?.id;
  const isCircular = Boolean(
    matchedDoc &&
    (matchedDoc.id === currentOrSelfId || visitedDocIds.has(matchedDoc.id))
  );

  // Header Bar
  const header = document.createElement('div');
  header.className = 'noether-embed-header flex items-center justify-between px-3 py-1.5 bg-[#1f1f1f] border-b border-[#282828] text-xs select-none cursor-default';

  const titleLeft = document.createElement('div');
  titleLeft.className = 'flex items-center gap-1.5 truncate text-[#dedede] font-medium';
  titleLeft.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[var(--noether-accent)] shrink-0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg><span class="truncate">${matchedDoc ? matchedDoc.title : embed.noteTitle}</span>${embed.headingAnchor ? `<span class="text-[#888888] font-normal text-[11px] truncate"># ${embed.headingAnchor}</span>` : ''}`;
  header.appendChild(titleLeft);

  const headerRight = document.createElement('div');
  headerRight.className = 'flex items-center gap-1.5 shrink-0';

  if (matchedDoc) {
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'noether-embed-action flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-[#999999] hover:text-white rounded hover:bg-[#2c2c2c] transition-none cursor-pointer';
    openBtn.setAttribute('data-tooltip', 'Open note in new tab');
    openBtn.setAttribute('aria-label', 'Open note in new tab');
    openBtn.innerHTML = `<span>Open</span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`;
    openBtn.onclick = (e) => {
      e.stopPropagation();
      navigateToNote(matchedDoc.title);
    };
    headerRight.appendChild(openBtn);
  }

  const codeBtn = document.createElement('button');
  codeBtn.type = 'button';
  codeBtn.className = 'noether-embed-action flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-[#999999] hover:text-white rounded hover:bg-[#2c2c2c] transition-none cursor-pointer';
  codeBtn.setAttribute('data-tooltip', 'Edit embed source');
  codeBtn.setAttribute('aria-label', 'Edit embed source');
  codeBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
  codeBtn.onclick = (e) => {
    e.stopPropagation();
    document.dispatchEvent(
      new CustomEvent('noether:focus-embed-code', {
        detail: { target: rawTarget, cleanTarget: embed.target },
      })
    );
  };
  headerRight.appendChild(codeBtn);

  header.appendChild(headerRight);
  card.appendChild(header);

  // Body Content
  const body = document.createElement('div');
  body.className = 'noether-embed-body px-3.5 py-2.5 text-xs text-[#cccccc] leading-relaxed max-h-[500px] overflow-y-auto';

  if (isCircular) {
    body.innerHTML = `<div class="text-xs text-amber-400/90 italic flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>Circular embed detected: ${matchedDoc?.title}</span></div>`;
  } else if (!matchedDoc) {
    body.innerHTML = `<div class="flex items-center justify-between gap-3 text-xs text-[#777777]"><span>Note "<strong>${embed.noteTitle}</strong>" does not exist yet.</span><button type="button" class="noether-embed-action px-2 py-1 text-xs rounded bg-[var(--noether-accent)]/20 hover:bg-[var(--noether-accent)]/30 text-[var(--noether-accent)] font-medium cursor-pointer transition-none">Create Note</button></div>`;
    const createBtn = body.querySelector('button');
    if (createBtn) {
      createBtn.onclick = (e) => {
        e.stopPropagation();
        navigateToNote(embed.noteTitle);
      };
    }
  } else {
    try {
      const renderContent = (jsonStr: string) => {
        let docNodes: any[] = [];
        if (jsonStr && jsonStr !== '{}') {
          const parsed = JSON.parse(jsonStr);
          docNodes = parsed.content || [];
        }
        if (embed.headingAnchor) {
          docNodes = filterNodesByHeading(docNodes, embed.headingAnchor);
        }
        body.innerHTML = renderTipTapNodesToHtml(docNodes);
        body.querySelectorAll('.md-wikilink').forEach((linkEl) => {
          linkEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = (linkEl as HTMLElement).getAttribute('data-wikilink-target');
            if (target) navigateToNote(target);
          });
        });
      };

      if (matchedDoc.content_json && matchedDoc.content_json !== '{}') {
        renderContent(matchedDoc.content_json);
      } else {
        // Content not held in memory to preserve RAM; load on-demand from SQLite
        getDocumentById(matchedDoc.id).then((fullDoc) => {
          if (fullDoc && fullDoc.content_json) {
            renderContent(fullDoc.content_json);
          }
        }).catch(() => {});
      }
    } catch (e) {
      body.innerHTML = `<p class="text-xs text-rose-400 italic">Error rendering embedded note content</p>`;
    }
  }

  card.appendChild(body);
  container.appendChild(card);
  return container;
}
