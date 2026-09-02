import { DocumentItem, DocumentProperties } from '@/types';
import { dbAdapter } from '@/lib/db/adapter';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCascadeSettings } from './cascadeSettings';

export interface CascadeInfo {
  isCascaded: boolean;
  cascadeName: string;
  pageNumber: number | null;
  rawProperties: DocumentProperties;
}

export function parseDocumentProperties(doc?: DocumentItem | null): DocumentProperties {
  if (!doc || !doc.properties) return {};
  try {
    return typeof doc.properties === 'string' ? JSON.parse(doc.properties) : doc.properties;
  } catch {
    return {};
  }
}

export function getCascadeInfo(doc?: DocumentItem | null): CascadeInfo {
  if (!doc) {
    return { isCascaded: false, cascadeName: '', pageNumber: null, rawProperties: {} };
  }
  const props = parseDocumentProperties(doc);

  // Check for 'Cascade Page' or variants
  let pageVal: any = undefined;
  for (const [k, v] of Object.entries(props)) {
    const lk = k.toLowerCase().replace(/[-_]/g, ' ').trim();
    if (lk === 'cascade page' || lk === 'cascadepage') {
      pageVal = v;
      break;
    }
  }

  // Check for 'Cascade' or 'Cascade Book'
  let bookVal: any = undefined;
  for (const [k, v] of Object.entries(props)) {
    const lk = k.toLowerCase().replace(/[-_]/g, ' ').trim();
    if (lk === 'cascade' || lk === 'cascade book' || lk === 'cascadebook') {
      bookVal = v;
      break;
    }
  }

  const pageNum = pageVal !== undefined && pageVal !== null && !isNaN(Number(pageVal)) ? Number(pageVal) : null;
  const cascadeName = (bookVal !== undefined && bookVal !== null && String(bookVal).trim() !== '')
    ? String(bookVal).trim()
    : (pageNum !== null ? 'Default Cascade' : '');

  const isCascaded = pageNum !== null;

  return {
    isCascaded,
    cascadeName,
    pageNumber: pageNum,
    rawProperties: props,
  };
}

/**
 * Convert a positive integer to a lowercase Roman numeral string.
 * Example: 1 -> 'i', 2 -> 'ii', 3 -> 'iii', 4 -> 'iv', 5 -> 'v', etc.
 */
export function toRoman(num: number): string {
  if (num <= 0) return String(num);
  const romanMap: Array<[number, string]> = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];
  let result = '';
  let n = Math.floor(num);
  for (const [val, roman] of romanMap) {
    while (n >= val) {
      result += roman;
      n -= val;
    }
  }
  return result;
}

/**
 * Parse a Roman numeral string (case-insensitive) to a positive integer.
 * Example: 'i' -> 1, 'ii' -> 2, 'iv' -> 4, 'v' -> 5, etc.
 * Returns null if not a valid roman numeral.
 */
export function fromRoman(str: string): number | null {
  const clean = str.trim().toLowerCase();
  if (!clean || !/^[ivxlcdm]+$/.test(clean)) return null;

  const romanValues: Record<string, number> = {
    i: 1,
    v: 5,
    x: 10,
    l: 50,
    c: 100,
    d: 500,
    m: 1000,
  };

  let total = 0;
  let prev = 0;

  for (let i = clean.length - 1; i >= 0; i--) {
    const curr = romanValues[clean[i]];
    if (!curr) return null;
    if (curr < prev) {
      total -= curr;
    } else {
      total += curr;
      prev = curr;
    }
  }

  return total > 0 ? total : null;
}

/**
 * Formats a cascade page number for display.
 * - Negative numbers convert to lowercase Roman numerals (e.g. -1 -> 'i', -2 -> 'ii')
 * - 0 is allowed and rendered as '0'
 * - Positive numbers render as digits (e.g. 1 -> '1', 2 -> '2')
 */
export function formatCascadePageDisplay(pageNumber: number): string {
  if (pageNumber < 0) {
    return toRoman(Math.abs(pageNumber));
  }
  return String(pageNumber);
}

/**
 * Parses user-entered page string which can be a number ('-1', '0', '3')
 * or Roman numeral ('i', 'ii', 'iv', 'v').
 * Roman numerals map to negative page numbers (-1, -2, -4, -5, etc.).
 */
export function parseCascadePageString(str: string): number | null {
  const trimmed = str.trim().toLowerCase();
  if (!trimmed) return null;

  // Check if standard integer
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Check if Roman numeral (maps to negative page number)
  const romanVal = fromRoman(trimmed);
  if (romanVal !== null) {
    return -romanVal;
  }

  return null;
}

export function stripPageSuffix(title: string): string {
  if (!title) return '';
  return title.replace(/\s*\[\s*(?:-?\d+|[ivxlcdmIVXLCDM]+)\s*\]\s*$/, '').trim();
}

export function formatTitleWithPageSuffix(title: string, pageNumber: number): string {
  const base = stripPageSuffix(title) || 'Untitled';
  const pageStr = formatCascadePageDisplay(pageNumber);
  return `${base} [${pageStr}]`;
}

export function getCascadeNotes(cascadeName: string, allDocs: DocumentItem[]): Array<{ doc: DocumentItem; page: number }> {
  const targetName = (cascadeName || '').toLowerCase().trim();
  const results: Array<{ doc: DocumentItem; page: number }> = [];

  for (const doc of allDocs) {
    if (doc.is_folder) continue;
    const info = getCascadeInfo(doc);
    if (info.isCascaded && info.pageNumber !== null) {
      if (!targetName || info.cascadeName.toLowerCase().trim() === targetName) {
        results.push({ doc, page: info.pageNumber });
      }
    }
  }

  // Sort ascending by page number, then by created_at/title
  results.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.doc.title.localeCompare(b.doc.title);
  });

  return results;
}

export function getAllCascades(allDocs: DocumentItem[]): Array<{ name: string; notes: Array<{ doc: DocumentItem; page: number }> }> {
  const map = new Map<string, Array<{ doc: DocumentItem; page: number }>>();

  for (const doc of allDocs) {
    if (doc.is_folder) continue;
    const info = getCascadeInfo(doc);
    if (info.isCascaded && info.pageNumber !== null) {
      const name = info.cascadeName || 'Default Cascade';
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push({ doc, page: info.pageNumber });
    }
  }

  const list: Array<{ name: string; notes: Array<{ doc: DocumentItem; page: number }> }> = [];
  for (const [name, notes] of map.entries()) {
    notes.sort((a, b) => a.page - b.page);
    list.push({ name, notes });
  }

  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

/**
 * Synchronize sequential cascade links in the SQLite document_links table so
 * Graph View and Backlinks display them as connected backlinks.
 */
export async function syncCascadeLinksForCascade(cascadeName: string, allDocs: DocumentItem[]): Promise<void> {
  try {
    const notesInOrder = getCascadeNotes(cascadeName, allDocs);
    const docIds = notesInOrder.map((n) => n.doc.id);

    if (docIds.length === 0) return;

    // Delete prior cascade links for these documents
    const placeholders = docIds.map(() => '?').join(',');
    await dbAdapter.execute(
      `DELETE FROM document_links WHERE (source_document_id IN (${placeholders}) OR target_document_id IN (${placeholders})) AND link_text LIKE '[Cascade]%'`,
      [...docIds, ...docIds]
    );

    // Insert new sequential links (page N -> page N+1)
    for (let i = 0; i < notesInOrder.length - 1; i++) {
      const source = notesInOrder[i].doc;
      const target = notesInOrder[i + 1].doc;
      const linkLabel = `[Cascade] ${cascadeName} (p.${notesInOrder[i].page} → p.${notesInOrder[i + 1].page})`;

      await dbAdapter.execute(
        `INSERT OR REPLACE INTO document_links (source_document_id, target_document_id, link_text) VALUES (?, ?, ?)`,
        [source.id, target.id, linkLabel]
      );
    }
  } catch (err) {
    console.error('[CascadeManager] Failed to sync cascade links in SQLite:', err);
  }
}

/**
 * Assigns or moves a note to a specific page in a cascade book.
 */
export async function assignNoteToCascade(
  docId: string,
  cascadeName: string,
  pageNumber: number
): Promise<void> {
  const ds = useDocumentStore.getState();
  const ws = useWorkspaceStore.getState();
  const allDocs = ds.documents;
  const doc = allDocs.find((d) => d.id === docId);
  if (!doc) return;

  const cleanBookName = cascadeName.trim() || 'Default Cascade';
  const cleanPage = Math.floor(pageNumber);

  // 1. Update properties
  const currentProps = parseDocumentProperties(doc);
  const nextProps: DocumentProperties = {
    ...currentProps,
    'Cascade': cleanBookName,
    'Cascade Page': cleanPage,
  };

  // 2. Save properties
  await ds.updateProperties(docId, nextProps);

  // 3. Update SQLite links for graph view
  const updatedDocs = useDocumentStore.getState().documents;
  await syncCascadeLinksForCascade(cleanBookName, updatedDocs);

  ws.showToast(`Cascaded "${doc.title}" (${cleanBookName} [${cleanPage}])`, 'success');
}

/**
 * Removes a note from its cascade and clears graph links.
 */
export async function removeNoteFromCascade(docId: string): Promise<void> {
  const ds = useDocumentStore.getState();
  const ws = useWorkspaceStore.getState();
  const allDocs = ds.documents;
  const doc = allDocs.find((d) => d.id === docId);
  if (!doc) return;

  const info = getCascadeInfo(doc);
  const prevBook = info.cascadeName;

  // Clean properties
  const nextProps = { ...info.rawProperties };
  delete nextProps['Cascade Page'];
  delete nextProps['cascade page'];
  delete nextProps['cascade_page'];
  delete nextProps['Cascade'];
  delete nextProps['cascade'];
  delete nextProps['Cascade Book'];

  await ds.updateProperties(docId, nextProps);

  // Remove SQLite cascade links
  try {
    await dbAdapter.execute(
      `DELETE FROM document_links WHERE (source_document_id = ? OR target_document_id = ?) AND link_text LIKE '[Cascade]%'`,
      [docId, docId]
    );
  } catch {}

  if (prevBook) {
    const updatedDocs = useDocumentStore.getState().documents;
    await syncCascadeLinksForCascade(prevBook, updatedDocs);
  }

  ws.showToast(`Removed note from Cascade`, 'info');
}

/**
 * Renames an entire cascade book across all its member notes.
 */
export async function renameCascade(oldName: string, newName: string): Promise<void> {
  const cleanOld = oldName.trim();
  const cleanNew = newName.trim();
  if (!cleanNew || cleanOld.toLowerCase() === cleanNew.toLowerCase()) return;

  const ds = useDocumentStore.getState();
  const ws = useWorkspaceStore.getState();
  const notes = getCascadeNotes(cleanOld, ds.documents);

  for (const { doc } of notes) {
    const currentProps = parseDocumentProperties(doc);
    const nextProps: DocumentProperties = {
      ...currentProps,
      Cascade: cleanNew,
    };
    if (nextProps['cascade']) delete nextProps['cascade'];
    if (nextProps['Cascade Book']) delete nextProps['Cascade Book'];
    if (nextProps['cascade_book']) delete nextProps['cascade_book'];

    await ds.updateProperties(doc.id, nextProps);
  }

  // Update active cascade context if currently pointing to oldName
  const activeCtx = useCascadeSettings.getState().activeCascadeContext;
  if (activeCtx && activeCtx.cascadeName.toLowerCase() === cleanOld.toLowerCase()) {
    useCascadeSettings.getState().setActiveCascadeContext({
      ...activeCtx,
      cascadeName: cleanNew,
    });
  }

  // Resync links for new cascade name in SQLite
  const updatedDocs = useDocumentStore.getState().documents;
  await syncCascadeLinksForCascade(cleanNew, updatedDocs);

  ws.showToast(`Renamed cascade to "${cleanNew}"`, 'success');
}

/**
 * Deletes a cascade book, uncascading all member notes.
 */
export async function deleteCascade(cascadeName: string): Promise<void> {
  const cleanName = cascadeName.trim();
  if (!cleanName) return;

  const ds = useDocumentStore.getState();
  const ws = useWorkspaceStore.getState();
  const notes = getCascadeNotes(cleanName, ds.documents);

  for (const { doc } of notes) {
    await removeNoteFromCascade(doc.id);
  }

  const activeCtx = useCascadeSettings.getState().activeCascadeContext;
  if (activeCtx && activeCtx.cascadeName.toLowerCase() === cleanName.toLowerCase()) {
    useCascadeSettings.getState().setActiveCascadeContext(null);
  }

  ws.showToast(`Deleted cascade "${cleanName}"`, 'info');
}

/**
 * Navigate to next or previous note in the active document's cascade.
 */
export async function navigateCascade(direction: 'next' | 'prev'): Promise<boolean> {
  const ds = useDocumentStore.getState();
  const ws = useWorkspaceStore.getState();
  const activeTab = ws.tabs.find((t) => t.id === ws.activeTabId);
  const activeDocId = activeTab?.document_id || ds.activeDocument?.id;
  const activeDoc = (activeDocId ? ds.documents.find((d) => d.id === activeDocId) : null) || ds.activeDocument;
  if (!activeDoc) return false;

  const info = getCascadeInfo(activeDoc);
  if (!info.isCascaded || info.pageNumber === null) {
    ws.showToast('Current note is not part of a Cascade', 'info');
    return false;
  }

  const cascadeNotes = getCascadeNotes(info.cascadeName, ds.documents);
  if (cascadeNotes.length <= 1) {
    ws.showToast(`No other pages in cascade "${info.cascadeName}"`, 'info');
    return false;
  }

  const currentIndex = cascadeNotes.findIndex((n) => n.doc.id === activeDoc.id);
  if (currentIndex === -1) return false;

  let targetIndex = -1;
  if (direction === 'next') {
    if (currentIndex < cascadeNotes.length - 1) {
      targetIndex = currentIndex + 1;
    } else {
      ws.showToast(`Reached end of cascade (page ${formatCascadePageDisplay(info.pageNumber)})`, 'info');
      return false;
    }
  } else {
    if (currentIndex > 0) {
      targetIndex = currentIndex - 1;
    } else {
      ws.showToast(`Already at the first page of cascade (page ${formatCascadePageDisplay(info.pageNumber)})`, 'info');
      return false;
    }
  }

  const target = cascadeNotes[targetIndex];
  if (!target) return false;

  // Set active cascade context and open note
  useCascadeSettings.getState().setActiveCascadeContext({
    docId: target.doc.id,
    cascadeName: info.cascadeName,
    page: target.page,
  });

  ws.openTab(target.doc.id, target.doc.title, {
    id: `tab-cascade-${info.cascadeName}-${target.doc.id}`,
    metadata: {
      cascadeName: info.cascadeName,
      page: target.page,
    },
  });
  return true;
}
