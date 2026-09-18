import { pdfjsLib } from './pdfWorkerSetup';
import { PdfOutlineItem, PdfPageInfo } from './types';
import platform from '@/lib/platform/platformAdapter';
import { DocumentItem } from '@/types';
import { useDocumentStore } from '@/store/documentStore';
import { getDocumentDiskPath, getDocumentPath } from '@/lib/db/documents';

/**
 * Fast binary conversion from base64 string to Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Strip optional data URI scheme prefix (e.g. data:application/pdf;base64,)
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
 * Loads and parses a PDF document from either physical vault disk or SQLite data URL.
 */
export async function loadPdfDocument(
  docOrId?: DocumentItem | string | null,
  customFilePath?: string
): Promise<LoadedPdfData> {
  let doc: DocumentItem | null = null;
  const allDocs = useDocumentStore.getState().documents;

  if (typeof docOrId === 'string') {
    doc = allDocs.find((d) => d.id === docOrId) || null;
  } else if (docOrId) {
    doc = docOrId;
  }

  let binaryBytes: Uint8Array | null = null;

  // 1. Try reading base64 data from doc.content_json if available
  if (doc?.content_json) {
    try {
      const parsed = JSON.parse(doc.content_json);
      const text = parsed.content?.[0]?.content?.[0]?.text;
      if (text && (text.startsWith('data:application/pdf') || text.startsWith('data:'))) {
        binaryBytes = base64ToUint8Array(text);
      }
    } catch {}
  }

  // 2. If no data URL in database, read binary file from vault disk
  if (!binaryBytes) {
    let targetPath = customFilePath;
    if (!targetPath && doc) {
      targetPath = getDocumentDiskPath(doc, getDocumentPath(doc, allDocs));
    }

    if (targetPath) {
      const res = await platform.readBinaryFile(targetPath);
      if (res.success && res.data) {
        binaryBytes = base64ToUint8Array(res.data);
      } else if (res.error) {
        throw new Error(res.error);
      }
    }
  }

  if (!binaryBytes || binaryBytes.length === 0) {
    throw new Error('PDF document content could not be found or loaded');
  }

  // Load document using pdfjs-dist
  const loadingTask = pdfjsLib.getDocument({
    data: binaryBytes,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  // Read outline (bookmarks / table of contents)
  let rawOutline: any[] | null = null;
  try {
    rawOutline = await pdfDoc.getOutline();
  } catch {}

  const outline = rawOutline ? await resolveOutlineTree(pdfDoc, rawOutline) : [];

  // Read page dimensions for placeholder sizing & virtualization
  const pageInfos: PdfPageInfo[] = [];
  for (let p = 1; p <= numPages; p++) {
    try {
      const page = await pdfDoc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      pageInfos.push({
        pageNumber: p,
        width: vp.width,
        height: vp.height,
        aspectRatio: vp.width / vp.height,
      });
    } catch {
      pageInfos.push({
        pageNumber: p,
        width: 595,
        height: 842,
        aspectRatio: 595 / 842,
      });
    }
  }

  return {
    pdfDoc,
    numPages,
    outline,
    pageInfos,
    rawBytes: binaryBytes,
  };
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
