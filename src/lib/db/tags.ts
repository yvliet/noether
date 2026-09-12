import { dbAdapter } from './adapter';
import { TagItem, TagTreeNode, DocumentItem } from '@/types';

/**
 * Regex for matching hashtags in text:
 * Matches `#tag` and `#parent/subtag`
 * Ignores hex codes (#ffffff) and markdown headings (# Heading)
 */
const TAG_REGEX = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_\-\/]*)/g;

/**
 * Scans all documents in SQLite to extract all unique tags, frequencies, and note associations.
 */
export async function getAllVaultTags(): Promise<TagItem[]> {
  try {
    // 1. Direct query from document_tags table
    const rows = await dbAdapter.query<{ tag: string; document_id: string; document_title: string }>(
      `SELECT dt.tag, dt.document_id, d.title as document_title
       FROM document_tags dt
       JOIN documents d ON d.id = dt.document_id
       WHERE d.is_folder = 0
       ORDER BY dt.tag ASC`
    );

    if (rows.length > 0) {
      const tagMap = new Map<string, { count: number; docMap: Map<string, string> }>();
      for (const row of rows) {
        const tag = row.tag;
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { count: 0, docMap: new Map() });
        }
        const entry = tagMap.get(tag)!;
        entry.count += 1;
        entry.docMap.set(row.document_id, row.document_title || 'Untitled');
      }

      const result: TagItem[] = [];
      for (const [tag, data] of tagMap.entries()) {
        const docsList: { id: string; title: string }[] = [];
        for (const [id, title] of data.docMap.entries()) {
          docsList.push({ id, title });
        }
        result.push({
          tag,
          count: data.count,
          docIds: Array.from(data.docMap.keys()),
          docs: docsList,
        });
      }
      return result.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    }

    // 2. Fallback / Migration scan if document_tags is not populated yet:
    // Avoids loading content_json blobs into memory. Uses blocks and properties metadata.
    const docs = await dbAdapter.query<any>(
      `SELECT id, title, properties FROM documents WHERE is_folder = 0`
    );
    if (docs.length === 0) return [];

    const blocks = await dbAdapter.query<any>(
      `SELECT document_id, content_text FROM blocks WHERE content_text LIKE '%#%'`
    );

    const docTagsMap = new Map<string, Set<string>>();
    for (const doc of docs) {
      const docTags = new Set<string>();
      if (doc.properties) {
        try {
          const props = JSON.parse(doc.properties);
          if (Array.isArray(props.tags)) {
            for (const t of props.tags) {
              const clean = String(t).trim().replace(/^#/, '');
              if (clean) docTags.add(clean.toLowerCase());
            }
          }
        } catch (e) {}
      }
      docTagsMap.set(doc.id, docTags);
    }

    for (const blk of blocks) {
      const docTags = docTagsMap.get(blk.document_id);
      if (!docTags) continue;
      const text = blk.content_text || '';
      let match;
      TAG_REGEX.lastIndex = 0;
      while ((match = TAG_REGEX.exec(text)) !== null) {
        const tagStr = match[1]?.trim().toLowerCase();
        if (tagStr && !/^[0-9a-fA-F]{3,6}$/.test(tagStr)) {
          docTags.add(tagStr);
        }
      }
    }

    const queries: { sql: string; params?: any[] }[] = [];
    const tagMap = new Map<string, { count: number; docMap: Map<string, string> }>();

    for (const doc of docs) {
      const docTags = docTagsMap.get(doc.id);
      if (!docTags) continue;
      for (const tag of docTags) {
        queries.push({
          sql: `INSERT OR IGNORE INTO document_tags (document_id, tag) VALUES (?, ?)`,
          params: [doc.id, tag],
        });
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { count: 0, docMap: new Map() });
        }
        const entry = tagMap.get(tag)!;
        entry.count += 1;
        entry.docMap.set(doc.id, doc.title || 'Untitled');
      }
    }

    if (queries.length > 0) {
      try {
        await dbAdapter.transaction(queries);
      } catch (e) {}
    }

    const result: TagItem[] = [];
    for (const [tag, data] of tagMap.entries()) {
      const docsList: { id: string; title: string }[] = [];
      for (const [id, title] of data.docMap.entries()) {
        docsList.push({ id, title });
      }
      result.push({
        tag,
        count: data.count,
        docIds: Array.from(data.docMap.keys()),
        docs: docsList,
      });
    }

    return result.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  } catch (err) {
    console.error('[Noether Tags] Error fetching vault tags:', err);
    return [];
  }
}

/**
 * Builds a hierarchical tag tree for nested tags like `#work/project/tasks`
 */
export function buildTagTree(tags: TagItem[]): TagTreeNode[] {
  const rootMap = new Map<string, any>();

  for (const tagItem of tags) {
    const parts = tagItem.tag.split('/').filter(Boolean);
    let currentLevel = rootMap;
    let accumulatedPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      if (!currentLevel.has(part)) {
        currentLevel.set(part, {
          name: part,
          fullPath: accumulatedPath,
          count: 0,
          children: new Map<string, any>(),
          docs: new Map<string, string>(),
        });
      }

      const node = currentLevel.get(part)!;
      node.count += tagItem.count;
      for (const d of tagItem.docs) {
        node.docs.set(d.id, d.title);
      }

      currentLevel = node.children;
    }
  }

  function convertMapToTree(map: Map<string, any>): TagTreeNode[] {
    const nodes: TagTreeNode[] = [];
    for (const data of map.values()) {
      const docsList = Array.from(data.docs.entries()).map(([id, title]: any) => ({ id, title }));
      nodes.push({
        name: data.name,
        fullPath: data.fullPath,
        count: data.count,
        children: convertMapToTree(data.children),
        docs: docsList,
      });
    }
    return nodes.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  return convertMapToTree(rootMap);
}
