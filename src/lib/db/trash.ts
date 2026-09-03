import { dbAdapter } from './adapter';
import { DocumentItem, TrashItem } from '@/types';
import { jsonToMarkdown, getDocumentPath, saveDocumentAndSynchronize } from './documents';
import { platform } from '@/lib/platform/platformAdapter';
import { appInstance } from '@/core/app/FlintApp';

// 48 hours in milliseconds = 172,800,000 ms
export const TRASH_RETENTION_MS = 48 * 60 * 60 * 1000;

/**
 * Automatically purges items in trash older than 48 hours
 */
export async function cleanExpiredTrash(): Promise<number> {
  const cutoff = Date.now() - TRASH_RETENTION_MS;
  try {
    const expired = await dbAdapter.query<{ id: string; original_id: string; title: string; original_path: string }>(
      `SELECT id, original_id, title, original_path FROM trash_items WHERE deleted_at < ?`,
      [cutoff]
    );
    if (expired.length > 0) {
      if (platform.isDesktop()) {
        for (const item of expired) {
          try {
            await platform.deleteTrashFile(item.original_path || item.title);
          } catch (e) {}
        }
      }
      await dbAdapter.execute(`DELETE FROM trash_items WHERE deleted_at < ?`, [cutoff]);
      await dbAdapter.persist();
      for (const item of expired) {
        if (item.original_id) {
          try {
            appInstance?.events?.emit('document:deleted', { id: item.original_id });
          } catch (e) {}
        }
      }
      console.log(`[Flint Trash] Cleaned up ${expired.length} expired items from trash.`);
    }
    return expired.length;
  } catch (err) {
    try {
      // Create table if it doesn't exist yet
      await dbAdapter.execute(`CREATE TABLE IF NOT EXISTS trash_items (
        id TEXT PRIMARY KEY,
        original_id TEXT NOT NULL,
        parent_id TEXT,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL DEFAULT '{}',
        is_daily_note INTEGER NOT NULL DEFAULT 0,
        is_folder INTEGER NOT NULL DEFAULT 0,
        is_bookmarked INTEGER NOT NULL DEFAULT 0,
        doc_type TEXT NOT NULL DEFAULT 'base',
        properties TEXT DEFAULT '{}',
        deleted_at INTEGER NOT NULL,
        original_path TEXT
      );`);
    } catch (e) {}
    return 0;
  }
}

/**
 * Moves multiple documents or folders (and their descendants) to Trash in a single batch
 */
export async function moveDocumentsToTrash(docIds: string[]): Promise<DocumentItem[]> {
  if (!docIds || docIds.length === 0) return [];

  // Get all documents to compute tree, paths, and descendants
  const allDocs = await dbAdapter.query<DocumentItem>(
    `SELECT id, parent_id, title, is_daily_note, is_folder, is_bookmarked, doc_type, properties, content_json, created_at, updated_at FROM documents`
  );
  const docMap = new Map(allDocs.map((d) => [d.id, d]));

  const itemsToTrash: DocumentItem[] = [];
  const addedIds = new Set<string>();

  const collectItemAndChildren = (id: string) => {
    if (addedIds.has(id)) return;
    const doc = docMap.get(id);
    if (!doc) return;

    itemsToTrash.push(doc);
    addedIds.add(id);

    if (doc.is_folder) {
      const children = allDocs.filter((d) => d.parent_id === id);
      for (const child of children) {
        collectItemAndChildren(child.id);
      }
    }
  };

  for (const id of docIds) {
    collectItemAndChildren(id);
  }

  if (itemsToTrash.length === 0) return [];

  const now = Date.now();
  const queries: { sql: string; params?: any[] }[] = [];

  for (const item of itemsToTrash) {
    const trashId = `trash-${item.id}-${now}`;
    const originalPath = getDocumentPath(item, allDocs);

    queries.push({
      sql: `INSERT INTO trash_items (id, original_id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, deleted_at, original_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        trashId,
        item.id,
        item.parent_id || null,
        item.title || 'Untitled',
        item.content_json || '{}',
        item.is_daily_note || 0,
        item.is_folder || 0,
        item.is_bookmarked || 0,
        item.doc_type || 'base',
        item.properties || '{}',
        now,
        originalPath,
      ],
    });

    queries.push({
      sql: `DELETE FROM documents WHERE id = ?`,
      params: [item.id],
    });

    queries.push({
      sql: `DELETE FROM blocks WHERE document_id = ?`,
      params: [item.id],
    });

    queries.push({
      sql: `DELETE FROM blocks_fts WHERE document_id = ?`,
      params: [item.id],
    });

    queries.push({
      sql: `DELETE FROM document_links WHERE source_document_id = ? OR target_document_id = ?`,
      params: [item.id, item.id],
    });

    queries.push({
      sql: `DELETE FROM document_tags WHERE document_id = ?`,
      params: [item.id],
    });

    const path = getDocumentPath(item, allDocs);
    const norm = (path || item.title).replace(/\\/g, '/').toLowerCase();
    const key = norm.endsWith('.md') ? norm : `${norm}.md`;
    queries.push({
      sql: `DELETE FROM file_manifest WHERE relative_path = ?`,
      params: [key],
    });
  }

  try {
    await dbAdapter.transaction(queries);
  } catch (err) {
    console.error('[Flint Trash] Failed to move items to trash in transaction:', err);
    throw err;
  }

  // Move physical files to .trash folder and clean from vault folder in parallel
  if (platform.isDesktop()) {
    await Promise.all(
      itemsToTrash.map(async (item) => {
        try {
          const path = getDocumentPath(item, allDocs);
          if (!item.is_folder && item.content_json) {
            const md = jsonToMarkdown(item.content_json, item.title);
            await platform.saveTrashFile(item.title, md, path || item.title);
          }
          await platform.deleteMarkdownFile(path || item.title);
        } catch (e) {}
      })
    );
  }

  return itemsToTrash;
}

/**
 * Moves a document or folder (and its descendants) to Trash
 */
export async function moveToTrash(docId: string): Promise<DocumentItem[]> {
  return await moveDocumentsToTrash([docId]);
}

/**
 * Retrieves all non-expired items in Trash sorted by deleted_at descending
 */
export async function getTrashItems(skipCleanup = false): Promise<TrashItem[]> {
  if (!skipCleanup) {
    await cleanExpiredTrash();
  }

  try {
    const rows = await dbAdapter.query<TrashItem>(
      `SELECT * FROM trash_items ORDER BY deleted_at DESC`
    );
    return rows;
  } catch (err) {
    try {
      await dbAdapter.execute(`CREATE TABLE IF NOT EXISTS trash_items (
        id TEXT PRIMARY KEY,
        original_id TEXT NOT NULL,
        parent_id TEXT,
        title TEXT NOT NULL,
        content_json TEXT NOT NULL DEFAULT '{}',
        is_daily_note INTEGER NOT NULL DEFAULT 0,
        is_folder INTEGER NOT NULL DEFAULT 0,
        is_bookmarked INTEGER NOT NULL DEFAULT 0,
        doc_type TEXT NOT NULL DEFAULT 'base',
        properties TEXT DEFAULT '{}',
        deleted_at INTEGER NOT NULL,
        original_path TEXT
      );`);
      return [];
    } catch (e) {
      return [];
    }
  }
}

/**
 * Restores multiple trash items (and their child items if folders) back to documents in a single atomic batch
 */
export async function restoreTrashItemsBatch(trashOrOriginalIds: string[]): Promise<DocumentItem[]> {
  if (!trashOrOriginalIds || trashOrOriginalIds.length === 0) return [];

  const allTrash = await dbAdapter.query<TrashItem>(`SELECT * FROM trash_items`);
  const targetIds = new Set(trashOrOriginalIds);
  const targets = allTrash.filter((t) => targetIds.has(t.id) || targetIds.has(t.original_id));
  if (targets.length === 0) return [];

  const itemsToRestore: TrashItem[] = [];
  const addedIds = new Set<string>();

  const collectTrashItemAndChildren = (item: TrashItem) => {
    if (addedIds.has(item.id)) return;
    itemsToRestore.push(item);
    addedIds.add(item.id);

    if (item.is_folder) {
      const children = allTrash.filter((t) => t.parent_id === item.original_id);
      for (const child of children) {
        collectTrashItemAndChildren(child);
      }
    }
  };

  for (const t of targets) {
    collectTrashItemAndChildren(t);
  }

  // Get current active documents to check if parent folder still exists
  const existingDocs = await dbAdapter.query<DocumentItem>(`SELECT id, is_folder FROM documents`);
  const existingFolderIds = new Set(existingDocs.filter((d) => d.is_folder).map((d) => d.id));
  for (const item of itemsToRestore) {
    if (item.is_folder) {
      existingFolderIds.add(item.original_id);
    }
  }

  const now = Date.now();
  const queries: { sql: string; params?: any[] }[] = [];
  const restoredDocs: DocumentItem[] = [];

  for (const item of itemsToRestore) {
    const validParentId = item.parent_id && existingFolderIds.has(item.parent_id) ? item.parent_id : null;

    queries.push({
      sql: `INSERT OR REPLACE INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        item.original_id,
        validParentId,
        item.title,
        item.content_json,
        item.is_daily_note,
        item.is_folder,
        item.is_bookmarked || 0,
        item.doc_type || 'base',
        item.properties || '{}',
        now,
        now,
      ],
    });

    queries.push({
      sql: `DELETE FROM trash_items WHERE id = ?`,
      params: [item.id],
    });

    restoredDocs.push({
      id: item.original_id,
      parent_id: validParentId,
      title: item.title,
      content_json: item.content_json,
      is_daily_note: item.is_daily_note,
      is_folder: item.is_folder,
      is_bookmarked: item.is_bookmarked || 0,
      doc_type: item.doc_type || 'base',
      properties: item.properties || '{}',
      created_at: now,
      updated_at: now,
    });
  }

  // Execute all SQL statements in a single fast WASM transaction
  await dbAdapter.transaction(queries);

  // Background non-blocking disk writes and full index synchronization
  (async () => {
    for (const item of itemsToRestore) {
      if (!item.is_folder && item.content_json) {
        try {
          await saveDocumentAndSynchronize(item.original_id, item.content_json, item.title);
          if (platform.isDesktop()) {
            await platform.deleteTrashFile(item.original_path || item.title);
          }
        } catch (e) {
          console.error('[Flint Trash] Error synchronizing restored document:', e);
        }
      }
    }
  })();

  return restoredDocs;
}

/**
 * Restores a specific trash item (and its child items if folder) back to documents
 */
export async function restoreTrashItem(trashOrOriginalId: string): Promise<DocumentItem[]> {
  return restoreTrashItemsBatch([trashOrOriginalId]);
}

/**
 * Permanently deletes a single item from Trash (and child items if folder)
 */
export async function permanentlyDeleteTrashItem(trashOrOriginalId: string): Promise<void> {
  const allTrash = await dbAdapter.query<TrashItem>(`SELECT * FROM trash_items`);
  const targetTrash = allTrash.find((t) => t.id === trashOrOriginalId || t.original_id === trashOrOriginalId);
  if (!targetTrash) return;

  const itemsToDelete: TrashItem[] = [targetTrash];
  if (targetTrash.is_folder) {
    const findChildren = (parentId: string) => {
      const children = allTrash.filter((t) => t.parent_id === parentId);
      for (const child of children) {
        itemsToDelete.push(child);
        if (child.is_folder) {
          findChildren(child.original_id);
        }
      }
    };
    findChildren(targetTrash.original_id);
  }

  for (const item of itemsToDelete) {
    if (platform.isDesktop()) {
      try {
        await platform.deleteTrashFile(item.original_path || item.title);
      } catch (e) {}
    }
    await dbAdapter.execute(`DELETE FROM trash_items WHERE id = ?`, [item.id]);
    try {
      appInstance.events.emit('document:deleted', { id: item.original_id });
    } catch (e) {}
  }

  await dbAdapter.persist();
}

/**
 * Empties all items from the Trash
 */
export async function emptyTrash(): Promise<void> {
  const allTrash = await dbAdapter.query<TrashItem>(`SELECT original_id FROM trash_items`);
  if (platform.isDesktop()) {
    try {
      await platform.emptyTrashFolder();
    } catch (e) {}
  }
  await dbAdapter.execute(`DELETE FROM trash_items`);
  await dbAdapter.persist();

  for (const item of allTrash) {
    try {
      appInstance.events.emit('document:deleted', { id: item.original_id });
    } catch (e) {}
  }
}
