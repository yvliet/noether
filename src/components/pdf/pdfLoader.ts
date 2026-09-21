import { pdfjsLib } from './pdfWorkerSetup';
import { PdfOutlineItem, PdfPageInfo } from './types';
import platform from '@/lib/platform/platformAdapter';
import { DocumentItem } from '@/types';
import { useDocumentStore } from '@/store/documentStore';
import { getDocumentDiskPath, getDocumentPath, getAllDocuments } from '@/lib/db/documents';

// In-memory document cache for instant zero-latency PDF switching
const pdfDocumentCache = new Map<string, LoadedPdfData>();

/**
 * Fast binary conversion from base64 string to Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = window.atob(cleanBase64.trim());
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export interface LoadedPdfData {
  pdfDoc: any;
  numPages: number;
  outline: PdfOutlineItem[];
  pageInfos: PdfPageInfo[];
  rawBytes?: Uint8Array;
}

/**
 * Clears the PDF document cache or invalidates a specific document entry.
 */
export function invalidatePdfCache(docIdOrPath?: string) {
  if (docIdOrPath) {
    pdfDocumentCache.delete(docIdOrPath);
  } else {
    pdfDocumentCache.clear();
  }
}

/**
 * Loads and parses a PDF document with multi-tier path resolution, parallel page parsing,
 * and instant in-memory caching.
 */
export async function loadPdfDocument(
  docOrId?: DocumentItem | string | null,
  customFilePath?: string
): Promise<LoadedPdfData> {
  const cacheKey = customFilePath || (typeof docOrId === 'string' ? docOrId : docOrId?.id);
  if (cacheKey && pdfDocumentCache.has(cacheKey)) {
    return pdfDocumentCache.get(cacheKey)!;
  }

  let doc: DocumentItem | null = null;
  let allDocs = useDocumentStore.getState().documents;

  // 1. Resolve document item
  if (typeof docOrId === 'string') {
    doc = allDocs.find((d) => d.id === docOrId || d.title.toLowerCase() === docOrId.toLowerCase()) || null;
  } else if (docOrId) {
    doc = docOrId;
  }

  // Fallback: If document list in Zustand hasn't populated yet, fetch from database
  if (!doc && typeof docOrId === 'string' && allDocs.length === 0) {
    try {
      allDocs = await getAllDocuments();
      doc = allDocs.find((d) => d.id === docOrId || d.title.toLowerCase() === docOrId.toLowerCase()) || null;
    } catch {}
  }

  let binaryBytes: Uint8Array | null = null;

  // 2. Try reading base64 data from doc.content_json if available
  if (doc?.content_json) {
    try {
      const parsed = JSON.parse(doc.content_json);
      const text = parsed.content?.[0]?.content?.[0]?.text;
      if (text && (text.startsWith('data:application/pdf') || text.startsWith('data:'))) {
        binaryBytes = base64ToUint8Array(text);
      }
    } catch {}
  }

  // 3. Multi-strategy physical disk file resolution
  if (!binaryBytes) {
    const candidatePaths: string[] = [];

    if (customFilePath) {
      const cleanCustom = customFilePath.replace(/\\/g, '/').replace(/^\/+/, '');
      candidatePaths.push(cleanCustom);
      if (!cleanCustom.toLowerCase().endsWith('.pdf')) {
        candidatePaths.push(`${cleanCustom}.pdf`);
      }
    }

    if (doc) {
      if (allDocs.length > 0) {
        const hierPath = getDocumentDiskPath(doc, getDocumentPath(doc, allDocs));
        candidatePaths.push(hierPath);
      }
      const directTitlePath = getDocumentDiskPath(doc, doc.title);
      candidatePaths.push(directTitlePath);

      if (!doc.title.toLowerCase().endsWith('.pdf')) {
        candidatePaths.push(`${doc.title}.pdf`);
      }
    }

    if (typeof docOrId === 'string' && !candidatePaths.includes(docOrId)) {
      const cleanStr = docOrId.replace(/\\/g, '/').replace(/^\/+/, '');
      candidatePaths.push(cleanStr);
      if (!cleanStr.toLowerCase().endsWith('.pdf')) {
        candidatePaths.push(`${cleanStr}.pdf`);
      }
    }

    // Try candidates in order
    for (const targetPath of candidatePaths) {
      try {
        const res = await platform.readBinaryFile(targetPath);
        if (res.success && res.data) {
          binaryBytes = base64ToUint8Array(res.data);
          break;
        }
      } catch {}
    }
  }

  if (!binaryBytes || binaryBytes.length === 0) {
    throw new Error('PDF document content could not be found or loaded');
  }

  // 4. Parse PDF document off-thread via PDF.js worker
  const loadingTask = pdfjsLib.getDocument({
    data: binaryBytes,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  // 5. Read outline (bookmarks / table of contents)
  let rawOutline: any[] | null = null;
  try {
    rawOutline = await pdfDoc.getOutline();
  } catch {}

  const outline = rawOutline ? await resolveOutlineTree(pdfDoc, rawOutline) : [];

  // 6. Fast parallel page dimension extraction across worker
  const pageInfoPromises = Array.from({ length: numPages }, async (_, i) => {
    const pageNum = i + 1;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale: 1 });
      return {
        pageNumber: pageNum,
        width: vp.width,
        height: vp.height,
        aspectRatio: vp.width / vp.height,
      };
    } catch {
      return {
        pageNumber: pageNum,
        width: 595,
        height: 842,
        aspectRatio: 595 / 842,
      };
    }
  });

  const pageInfos = await Promise.all(pageInfoPromises);

  const result: LoadedPdfData = {
    pdfDoc,
    numPages,
    outline,
    pageInfos,
    rawBytes: binaryBytes,
  };

  // Cache in memory for instant tab returns
  if (cacheKey) {
    pdfDocumentCache.set(cacheKey, result);
  }
  if (doc?.id) {
    pdfDocumentCache.set(doc.id, result);
  }

  return result;
}

/**
 * Resolves raw PDF outline items recursively into concrete page numbers.
 */
async function resolveOutlineTree(pdfDoc: any, items: any[]): Promise<PdfOutlineItem[]> {
  const result: PdfOutlineItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let pageNumber = 1;

    try {
      let dest = item.dest;
      if (typeof dest === 'string') {
        dest = await pdfDoc.getDestination(dest);
      }

      if (Array.isArray(dest) && dest[0]) {
        const pageRef = dest[0];
        const pageIndex = await pdfDoc.getPageIndex(pageRef);
        pageNumber = pageIndex + 1;
      }
    } catch {}

    const subItems = item.items && item.items.length > 0
      ? await resolveOutlineTree(pdfDoc, item.items)
      : [];

    result.push({
      id: `toc-${pageNumber}-${i}-${item.title || 'untitled'}`,
      title: item.title || 'Untitled section',
      pageNumber,
      dest: item.dest,
      items: subItems,
    });
  }

  return result;
}
