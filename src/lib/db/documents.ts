import { dbAdapter } from './adapter';
import { DocumentItem, BlockItem, HeadingItem, GlobalTaskItem, DocumentProperties } from '@/types';
import { moveToTrash, moveDocumentsToTrash } from './trash';
import { platform } from '@/lib/platform/platformAdapter';


export async function getAllDocuments(options?: { includeContent?: boolean }): Promise<DocumentItem[]> {
  const contentExpr = options?.includeContent
    ? 'content_json'
    : `CASE WHEN doc_type IN ('image', 'audio', 'video', 'canvas') THEN content_json ELSE '' END AS content_json`;

  try {
    const docs = await dbAdapter.query<DocumentItem>(
      `SELECT id, parent_id, title, ${contentExpr}, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at 
       FROM documents 
       ORDER BY is_folder DESC, title ASC`
    );
    return docs;
  } catch (err) {
    try {
      await dbAdapter.execute(`ALTER TABLE documents ADD COLUMN is_bookmarked INTEGER NOT NULL DEFAULT 0;`);
    } catch (e) {}
    try {
      await dbAdapter.execute(`ALTER TABLE documents ADD COLUMN doc_type TEXT NOT NULL DEFAULT 'base';`);
    } catch (e) {}
    try {
      await dbAdapter.execute(`ALTER TABLE documents ADD COLUMN properties TEXT DEFAULT '{}';`);
    } catch (e) {}
    try {
      const docs = await dbAdapter.query<DocumentItem>(
        `SELECT id, parent_id, title, ${contentExpr}, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at 
         FROM documents 
         ORDER BY is_folder DESC, title ASC`
      );
      return docs;
    } catch (fallbackErr) {
      const raw = await dbAdapter.query<any>(
        `SELECT id, parent_id, title, ${contentExpr}, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at FROM documents ORDER BY is_folder DESC, title ASC`
      );
      return raw.map((d: any) => ({
        id: d.id,
        parent_id: d.parent_id || null,
        title: d.title || 'Untitled',
        content_json: d.content_json || '',
        is_daily_note: d.is_daily_note || 0,
        is_folder: d.is_folder || 0,
        is_bookmarked: d.is_bookmarked || 0,
        doc_type: d.doc_type || 'base',
        properties: d.properties || '{}',
        created_at: d.created_at || Date.now(),
        updated_at: d.updated_at || Date.now(),
      }));
    }
  }
}

/**
 * Efficiently queries only non-folder documents containing embed directives (![[...]])
 * directly from SQLite to avoid holding all document content in the Zustand store.
 */
export async function getDocumentsWithEmbeds(): Promise<{ id: string; content_json: string }[]> {
  try {
    return await dbAdapter.query<{ id: string; content_json: string }>(
      `SELECT id, content_json FROM documents WHERE is_folder = 0 AND content_json LIKE '%![[%'`
    );
  } catch (err) {
    return [];
  }
}

/**
 * Checks if a document or document properties indicate that the document is locked / read-only.
 */
export function isDocumentLocked(
  docOrProps: DocumentItem | DocumentProperties | string | null | undefined
): boolean {
  if (!docOrProps) return false;
  let props: any = docOrProps;
  if (typeof docOrProps === 'object' && docOrProps !== null && 'properties' in docOrProps) {
    props = (docOrProps as DocumentItem).properties;
  }
  if (!props) return false;
  if (typeof props === 'string') {
    try {
      props = JSON.parse(props);
    } catch {
      return false;
    }
  }
  if (typeof props !== 'object' || props === null) return false;

  const val =
    props.locked ??
    props.Locked ??
    props.read_only ??
    props.Read_Only ??
    props.readonly ??
    props.ReadOnly ??
    props.lock ??
    props.Lock;

  return (
    val === true ||
    val === 'yes' ||
    val === 'Yes' ||
    val === 'true' ||
    val === 'True' ||
    val === 1 ||
    val === '1'
  );
}

export async function updateDocumentProperties(id: string, propertiesJson: string): Promise<void> {
  const now = Date.now();
  try {
    await dbAdapter.execute(
      `UPDATE documents SET properties = ?, updated_at = ? WHERE id = ?`,
      [propertiesJson, now, id]
    );
  } catch (err) {
    try {
      await dbAdapter.execute(`ALTER TABLE documents ADD COLUMN properties TEXT DEFAULT '{}';`);
      await dbAdapter.execute(
        `UPDATE documents SET properties = ?, updated_at = ? WHERE id = ?`,
        [propertiesJson, now, id]
      );
    } catch (e) {
      console.error('[Flint Docs] Failed to update properties:', e);
    }
  }

  // Persist updated YAML frontmatter to disk and apply OS file attributes (e.g. Read-Only)
  if (platform.isDesktop()) {
    try {
      const doc = (await dbAdapter.query<DocumentItem>(`SELECT * FROM documents WHERE id = ? LIMIT 1`, [id]))[0];
      if (doc && !doc.is_folder) {
        const allDocs = await dbAdapter.query<DocumentItem>(`SELECT id, parent_id, title FROM documents`);
        const relPath = getDocumentPath(doc, allDocs);
        const mdContent = jsonToMarkdown(doc.content_json, doc.title, propertiesJson);
        await platform.saveMarkdownFile(doc.title, mdContent, relPath);

        const normRel = (relPath || doc.title).replace(/\\/g, '/').toLowerCase();
        const manifestKey = normRel.endsWith('.md') ? normRel : `${normRel}.md`;
        const contentHash = computeFastHash(mdContent);
        try {
          await dbAdapter.execute(
            `INSERT OR REPLACE INTO file_manifest (relative_path, mtime, size, content_hash, indexed_at) VALUES (?, ?, ?, ?, ?)`,
            [manifestKey, now, mdContent.length, contentHash, now]
          );
        } catch (mErr) {}

        const isLocked = isDocumentLocked(propertiesJson);
        await platform.setFileAttributes(relPath || doc.title, { readonly: isLocked, mtime: now });
      }
    } catch (e) {
      console.error('[Flint Docs] Failed to sync updated properties to disk:', e);
    }
  }
}

export async function getDocumentById(id: string): Promise<DocumentItem | null> {
  try {
    const results = await dbAdapter.query<DocumentItem>(
      `SELECT * FROM documents WHERE id = ? LIMIT 1`,
      [id]
    );
    if (results && results.length > 0) return results[0];
  } catch (e) {}

  // Cross-platform web fallback: resolve from in-memory document store
  if (typeof window !== 'undefined' && (window as any).__flintStores?.documentStore) {
    const memDoc = (window as any).__flintStores.documentStore.getState().documents.find((d: any) => d.id === id);
    if (memDoc) return memDoc;
  }

  return null;
}

export async function createDocument(
  title: string = 'Untitled',
  parentId: string | null = null,
  isFolder: boolean = false,
  docType: 'base' | 'canvas' = 'base'
): Promise<DocumentItem> {
  const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = Date.now();
  const defaultContent = isFolder
    ? '{}'
    : JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: []
          }
        ]
      });

  try {
    await dbAdapter.execute(
      `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, 0, ?, '{}', ?, ?)`,
      [id, parentId, title, defaultContent, isFolder ? 1 : 0, docType, now, now]
    );
  } catch (err) {
    try {
      await dbAdapter.execute(`ALTER TABLE documents ADD COLUMN is_bookmarked INTEGER NOT NULL DEFAULT 0;`);
    } catch (e) {}
    try {
      await dbAdapter.execute(`ALTER TABLE documents ADD COLUMN doc_type TEXT NOT NULL DEFAULT 'base';`);
    } catch (e) {}
    try {
      await dbAdapter.execute(`ALTER TABLE documents ADD COLUMN properties TEXT DEFAULT '{}';`);
    } catch (e) {}
    try {
      await dbAdapter.execute(
        `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, 0, ?, '{}', ?, ?)`,
        [id, parentId, title, defaultContent, isFolder ? 1 : 0, docType, now, now]
      );
    } catch (fallbackErr) {
      await dbAdapter.execute(
        `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
        [id, parentId, title, defaultContent, isFolder ? 1 : 0, now, now]
      );
    }
  }

  // Persist raw markdown file to disk if not a folder
  if (!isFolder && platform.isDesktop()) {
    try {
      const allDocs = await dbAdapter.query<DocumentItem>(`SELECT id, parent_id, title FROM documents`);
      const relPath = getDocumentPath({ id, title, parent_id: parentId }, allDocs);
      const md = jsonToMarkdown(defaultContent, title);
      await platform.saveMarkdownFile(title, md, relPath);

      const normRel = (relPath || title).replace(/\\/g, '/').toLowerCase();
      const manifestKey = normRel.endsWith('.md') ? normRel : `${normRel}.md`;
      const contentHash = computeFastHash(md);
      try {
        await dbAdapter.execute(
          `INSERT OR REPLACE INTO file_manifest (relative_path, mtime, size, content_hash, indexed_at) VALUES (?, ?, ?, ?, ?)`,
          [manifestKey, now, md.length, contentHash, now]
        );
      } catch (mErr) {}
    } catch (e) {}
  }

  return {
    id,
    parent_id: parentId,
    title,
    content_json: defaultContent,
    is_daily_note: 0,
    is_folder: isFolder ? 1 : 0,
    is_bookmarked: 0,
    doc_type: docType,
    created_at: now,
    updated_at: now,
  };
}

export async function updateInternalLinksAcrossDocuments(oldTitle: string, newTitle: string): Promise<number> {
  try {
    const affectedDocs = await dbAdapter.query<{ id: string; title: string; content_json: string }>(
      `SELECT d.id, d.title, d.content_json
       FROM documents d
       WHERE d.is_folder = 0 AND (
         d.id IN (SELECT source_document_id FROM document_links WHERE link_text = ?)
         OR d.content_json LIKE '%' || ? || '%'
       )`,
      [oldTitle, `[[${oldTitle}`]
    );
    let updatedCount = 0;
    const queries: { sql: string; params?: any[] }[] = [];
    const changedDocs: { doc: (typeof affectedDocs)[0]; contentStr: string }[] = [];

    for (const doc of affectedDocs) {
      if (!doc.content_json) continue;

      let contentStr = doc.content_json;
      let hasChanged = false;

      // Replace [[oldTitle]] with [[newTitle]] and [[oldTitle| with [[newTitle|
      const directMatch = `[[${oldTitle}]]`;
      const pipeMatch = `[[${oldTitle}|`;

      if (contentStr.includes(directMatch)) {
        contentStr = contentStr.split(directMatch).join(`[[${newTitle}]]`);
        hasChanged = true;
      }

      if (contentStr.includes(pipeMatch)) {
        contentStr = contentStr.split(pipeMatch).join(`[[${newTitle}|`);
        hasChanged = true;
      }

      if (hasChanged) {
        queries.push({
          sql: `UPDATE documents SET content_json = ?, updated_at = ? WHERE id = ?`,
          params: [contentStr, Date.now(), doc.id],
        });
        changedDocs.push({ doc, contentStr });
        updatedCount++;
      }
    }

    if (queries.length > 0) {
      await dbAdapter.transaction(queries);

      if (platform.isDesktop()) {
        const allDocs = await dbAdapter.query<DocumentItem>(`SELECT id, parent_id, title FROM documents`);
        for (const item of changedDocs) {
          try {
            const relPath = getDocumentPath(item.doc as DocumentItem, allDocs);
            const mdContent = jsonToMarkdown(item.contentStr, item.doc.title);
            await platform.saveMarkdownFile(item.doc.title, mdContent, relPath);

            const normRel = (relPath || item.doc.title).replace(/\\/g, '/').toLowerCase();
            const manifestKey = normRel.endsWith('.md') ? normRel : `${normRel}.md`;
            const contentHash = computeFastHash(mdContent);
            await dbAdapter.execute(
              `INSERT OR REPLACE INTO file_manifest (relative_path, mtime, size, content_hash, indexed_at) VALUES (?, ?, ?, ?, ?)`,
              [manifestKey, Date.now(), mdContent.length, contentHash, Date.now()]
            );
          } catch (e) {
            console.error('[Flint Links] Error saving updated link to disk:', e);
          }
        }
      }
    }
    return updatedCount;
  } catch (err) {
    console.error('[Flint Links] Error updating internal links across documents:', err);
    return 0;
  }
}

export async function updateDocumentTitle(id: string, newTitle: string): Promise<{ oldTitle?: string }> {
  const doc = await getDocumentById(id);
  const oldTitle = doc?.title;
  const now = Date.now();
  await dbAdapter.execute(
    `UPDATE documents SET title = ?, updated_at = ? WHERE id = ?`,
    [newTitle, now, id]
  );
  if (oldTitle && oldTitle !== newTitle && platform.isDesktop() && doc) {
    try {
      const allDocs = await dbAdapter.query<DocumentItem>(`SELECT id, parent_id, title FROM documents`);
      const oldRelPath = getDocumentPath({ id, title: oldTitle, parent_id: doc.parent_id }, allDocs);
      const newRelPath = getDocumentPath({ id, title: newTitle, parent_id: doc.parent_id }, allDocs);
      await platform.renameMarkdownFile(oldTitle, newTitle, oldRelPath, newRelPath);

      const oldNorm = (oldRelPath || oldTitle).replace(/\\/g, '/').toLowerCase();
      const oldKey = oldNorm.endsWith('.md') ? oldNorm : `${oldNorm}.md`;
      const newNorm = (newRelPath || newTitle).replace(/\\/g, '/').toLowerCase();
      const newKey = newNorm.endsWith('.md') ? newNorm : `${newNorm}.md`;
      try {
        await dbAdapter.execute(
          `UPDATE file_manifest SET relative_path = ? WHERE LOWER(relative_path) = LOWER(?)`,
          [newKey, oldKey]
        );
      } catch (mErr) {}
    } catch (e) {}
  }
  return { oldTitle };
}

export async function toggleBookmarkDocument(id: string, isBookmarked: boolean): Promise<void> {
  const now = Date.now();
  await dbAdapter.execute(
    `UPDATE documents SET is_bookmarked = ?, updated_at = ? WHERE id = ?`,
    [isBookmarked ? 1 : 0, now, id]
  );
}

export async function duplicateDocument(id: string): Promise<DocumentItem | null> {
  const doc = await getDocumentById(id);
  if (!doc) return null;

  const newTitle = `${doc.title} (Copy)`;
  const newId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = Date.now();
  const docType = doc.doc_type || 'base';

  try {
    await dbAdapter.execute(
      `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [newId, doc.parent_id, newTitle, doc.content_json, doc.is_daily_note, doc.is_folder, docType, doc.properties || '{}', now, now]
    );
  } catch (err) {
    try {
      await dbAdapter.execute(`ALTER TABLE documents ADD COLUMN properties TEXT DEFAULT '{}';`);
    } catch (e) {}
    await dbAdapter.execute(
      `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [newId, doc.parent_id, newTitle, doc.content_json, doc.is_daily_note, doc.is_folder, docType, doc.properties || '{}', now, now]
    );
  }

  if (platform.isDesktop() && doc.content_json) {
    try {
      const allDocs = await dbAdapter.query<DocumentItem>(`SELECT id, parent_id, title FROM documents`);
      const relPath = getDocumentPath({ id: newId, title: newTitle, parent_id: doc.parent_id }, allDocs);
      const md = jsonToMarkdown(doc.content_json, newTitle, doc.properties);
      await platform.saveMarkdownFile(newTitle, md, relPath);

      const normRel = (relPath || newTitle).replace(/\\/g, '/').toLowerCase();
      const manifestKey = normRel.endsWith('.md') ? normRel : `${normRel}.md`;
      const contentHash = computeFastHash(md);
      try {
        await dbAdapter.execute(
          `INSERT OR REPLACE INTO file_manifest (relative_path, mtime, size, content_hash, indexed_at) VALUES (?, ?, ?, ?, ?)`,
          [manifestKey, now, md.length, contentHash, now]
        );
      } catch (mErr) {}
    } catch (e) {}
  }

  return {
    ...doc,
    id: newId,
    title: newTitle,
    created_at: now,
    updated_at: now,
    is_bookmarked: 0,
    doc_type: docType,
  };
}

export async function deleteDocument(id: string): Promise<DocumentItem[]> {
  return await moveToTrash(id);
}

export async function deleteDocuments(ids: string[]): Promise<DocumentItem[]> {
  return await moveDocumentsToTrash(ids);
}

/**
 * Scans all documents in SQLite to aggregate all tasks (- [ ] and - [x])
 */
export async function getAllGlobalTasks(): Promise<GlobalTaskItem[]> {
  try {
    const rows = await dbAdapter.query<any>(
      `SELECT b.id, b.document_id, d.title AS document_title, b.content_text AS text, b.task_completed AS completed
       FROM blocks b
       JOIN documents d ON d.id = b.document_id
       WHERE b.is_task = 1
       ORDER BY b.order_index ASC`
    );

    return rows.map((r) => ({
      id: r.id,
      document_id: r.document_id,
      document_title: r.document_title || 'Untitled',
      text: (r.text || '').trim(),
      completed: Boolean(r.completed),
    }));
  } catch (err) {
    console.error('[Flint Docs] Failed to get global tasks:', err);
    return [];
  }
}

/**
 * Toggles a task item checked state inside the original note content_json
 */
export async function updateGlobalTaskStatus(docId: string, taskText: string, completed: boolean): Promise<void> {
  const doc = await getDocumentById(docId);
  if (!doc || !doc.content_json) return;

  try {
    const parsed = JSON.parse(doc.content_json);

    const updateTask = (node: any) => {
      if (!node) return;
      if (node.type === 'taskItem') {
        const text = node.content?.[0]?.content?.map((c: any) => c.text || '').join('') || '';
        if (text.trim() === taskText.trim()) {
          if (!node.attrs) node.attrs = {};
          node.attrs.checked = completed;
        }
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(updateTask);
      }
    };

    if (parsed.content) {
      parsed.content.forEach(updateTask);
    }

    const updatedJson = JSON.stringify(parsed);
    await saveDocumentAndSynchronize(docId, updatedJson, doc.title);
  } catch (e) {
    console.error('Failed to update task in doc:', e);
  }
}

/**
 * Formats properties into a standard YAML frontmatter block
 */
export function formatFrontmatter(properties?: DocumentProperties | string): string {
  if (!properties) return '';
  let parsedProps: DocumentProperties = {};
  try {
    parsedProps = typeof properties === 'string' ? JSON.parse(properties) : properties;
  } catch (e) {
    return '';
  }

  const entries = Object.entries(parsedProps).filter(([_, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return '';

  const lines: string[] = ['---'];
  for (const [k, v] of entries) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((item) => JSON.stringify(item)).join(', ')}]`);
    } else if (typeof v === 'boolean') {
      lines.push(`${k}: ${v ? 'yes' : 'no'}`);
    } else if (typeof v === 'number') {
      lines.push(`${k}: ${v}`);
    } else if (typeof v === 'string') {
      if (v === 'yes' || v === 'no') {
        lines.push(`${k}: ${v}`);
      } else {
        lines.push(`${k}: ${JSON.stringify(v)}`);
      }
    }
  }
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

/**
 * Parses YAML frontmatter from raw Markdown text
 */
export function parseFrontmatter(rawText: string): { properties: DocumentProperties; bodyText: string } {
  if (!rawText) return { properties: {}, bodyText: '' };
  const normalized = rawText.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---')) {
    return { properties: {}, bodyText: rawText };
  }

  const endIdx = normalized.indexOf('\n---', 3);
  if (endIdx === -1) {
    return { properties: {}, bodyText: rawText };
  }

  const frontmatterStr = normalized.slice(3, endIdx).trim();
  const bodyText = normalized.slice(endIdx + 4).replace(/^\n+/, '');
  const properties: DocumentProperties = {};

  for (const line of frontmatterStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().replace(/\s+/g, '_');
    let valStr = line.slice(colonIdx + 1).trim();
    if (!key) continue;

    if (valStr.startsWith('[') && valStr.endsWith(']')) {
      try {
        properties[key] = JSON.parse(valStr);
      } catch (e) {
        properties[key] = valStr.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
      }
    } else if (valStr.toLowerCase() === 'true' || valStr.toLowerCase() === 'yes') {
      properties[key] = valStr === 'yes' ? 'yes' : 'Yes';
    } else if (valStr.toLowerCase() === 'false' || valStr.toLowerCase() === 'no') {
      properties[key] = valStr === 'no' ? 'no' : 'No';
    } else if (!isNaN(Number(valStr)) && valStr !== '') {
      properties[key] = Number(valStr);
    } else {
      if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
        valStr = valStr.slice(1, -1);
      }
      properties[key] = valStr;
    }
  }

  return { properties, bodyText };
}

/**
 * Converts TipTap JSON to clean Markdown format with optional YAML frontmatter
 */
export function jsonToMarkdown(
  contentJson?: string,
  _title?: string,
  properties?: DocumentProperties | string
): string {
  try {
    const frontmatter = formatFrontmatter(properties);
    if (!contentJson) return frontmatter;
    const parsed = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
    let md = '';

    const processNode = (node: any): string => {
      if (!node) return '';

      if (node.type === 'text') {
        let text = node.text || '';
        if (node.marks) {
          for (const m of node.marks) {
            if (m.type === 'bold') text = `**${text}**`;
            if (m.type === 'italic') text = `*${text}*`;
            if (m.type === 'code') text = `\`${text}\``;
            if (m.type === 'strike') text = `~~${text}~~`;
            if (m.type === 'highlight') text = `==${text}==`;
          }
        }
        return text;
      }

      if (node.type === 'hardBreak') {
        return '\n';
      }

      if (node.type === 'mathChip') {
        const latex = node.attrs?.latex || '';
        return node.attrs?.display === 'block' ? `\n$$\n${latex}\n$$\n` : `$${latex}$`;
      }

      if (node.type === 'iconChip' || node.type === 'icon') {
        const pack = node.attrs?.pack || 'hugeicons';
        const iconId = node.attrs?.iconId || '';
        if (!iconId) return '';
        return `:${pack}:${iconId}:`;
      }

      if (node.type === 'heading') {
        const level = node.attrs?.level || 1;
        const prefix = '#'.repeat(level);
        const inner = (node.content || []).map(processNode).join('');
        const trimmed = inner.trim();
        if (trimmed.startsWith('#')) {
          return `${trimmed}\n`;
        }
        return `${prefix} ${inner}\n`;
      }

      if (node.type === 'paragraph') {
        const inner = (node.content || []).map(processNode).join('');
        return `${inner}\n`;
      }

      if (node.type === 'bulletList') {
        return (node.content || []).map((li: any) => `- ${(li.content || []).map(processNode).join('').trim()}\n`).join('');
      }

      if (node.type === 'orderedList') {
        return (node.content || []).map((li: any, i: number) => `${i + 1}. ${(li.content || []).map(processNode).join('').trim()}\n`).join('');
      }

      if (node.type === 'taskList') {
        return (node.content || []).map((ti: any) => {
          const checked = ti.attrs?.checked ? 'x' : ' ';
          const text = (ti.content || []).map(processNode).join('').trim();
          return `- [${checked}] ${text}\n`;
        }).join('');
      }

      if (node.type === 'blockquote') {
        const inner = (node.content || []).map(processNode).join('').trim();
        return `> ${inner}\n`;
      }

      if (node.type === 'codeBlock') {
        const lang = node.attrs?.language || '';
        const inner = (node.content || []).map((c: any) => c.text || '').join('');
        return `\`\`\`${lang}\n${inner}\n\`\`\`\n`;
      }

      if (node.type === 'horizontalRule') {
        return `---\n`;
      }

      if (node.type === 'table') {
        const rows = node.content || [];
        if (rows.length === 0) return '';

        const tableData: string[][] = [];
        for (const rowNode of rows) {
          const cells = rowNode.content || [];
          const rowData: string[] = [];
          for (const cell of cells) {
            const cellText = (cell.content || []).map(processNode).join('').replace(/\n+/g, ' ').trim();
            rowData.push(cellText);
          }
          tableData.push(rowData);
        }

        if (tableData.length === 0) return '';

        const numCols = Math.max(...tableData.map((r) => r.length), 1);
        for (const row of tableData) {
          while (row.length < numCols) {
            row.push('');
          }
        }

        let tableMd = '';
        const headerRow = tableData[0];
        tableMd += `| ${headerRow.join(' | ')} |\n`;
        tableMd += `| ${Array(numCols).fill('---').join(' | ')} |\n`;

        for (let i = 1; i < tableData.length; i++) {
          tableMd += `| ${tableData[i].join(' | ')} |\n`;
        }
        return tableMd;
      }

      if (node.content) {
        return node.content.map(processNode).join('');
      }

      return '';
    };

    if (parsed.content && Array.isArray(parsed.content)) {
      md += parsed.content.map(processNode).join('');
    }

    return frontmatter + md;
  } catch (e) {
    return '';
  }
}

/**
 * Parses raw table row cells from a markdown line
 */
function parseMarkdownTableRow(line: string): string[] {
  let clean = line.trim();
  if (clean.startsWith('|')) clean = clean.slice(1);
  if (clean.endsWith('|')) clean = clean.slice(0, -1);
  return clean.split('|').map((c) => c.trim());
}

/**
 * Checks if a line is a Markdown table separator (e.g. | --- | :---: | ---: |)
 */
function isTableDelimiterRow(line: string): boolean {
  const clean = line.trim();
  if (!clean.includes('-')) return false;
  const cells = parseMarkdownTableRow(clean);
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

/**
 * Converts a raw Markdown body string into TipTap JSON string
 * In Flint Live Preview, each line is stored as a paragraph so that LivePreviewSyntax
 * can perform high-performance, real-time token rendering.
 */
function parseInlineMarkdownTokens(line: string): any[] {
  const iconRegex = /:([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+):/g;
  if (!iconRegex.test(line)) {
    return [{ type: 'text', text: line }];
  }

  iconRegex.lastIndex = 0;
  const inlineNodes: any[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = iconRegex.exec(line)) !== null) {
    const start = match.index;
    const end = iconRegex.lastIndex;

    if (start > lastIndex) {
      inlineNodes.push({
        type: 'text',
        text: line.slice(lastIndex, start),
      });
    }

    const pack = match[1];
    const iconId = match[2];
    inlineNodes.push({
      type: 'iconChip',
      attrs: {
        pack,
        iconId,
      },
    });

    lastIndex = end;
  }

  if (lastIndex < line.length) {
    inlineNodes.push({
      type: 'text',
      text: line.slice(lastIndex),
    });
  }

  return inlineNodes.length > 0 ? inlineNodes : [{ type: 'text', text: line }];
}

export function markdownToTipTapJson(md: string): string {
  if (!md || !md.trim()) {
    return JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    });
  }

  const cleanMd = md.replace(/\r\n/g, '\n');
  // Strip trailing newline to prevent multiplying trailing empty lines on round-trip
  const normalized = cleanMd.endsWith('\n') ? cleanMd.slice(0, -1) : cleanMd;
  const lines = normalized.split('\n');
  const content: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      content.push({
        type: 'paragraph',
        content: [],
      });
    } else {
      content.push({
        type: 'paragraph',
        content: parseInlineMarkdownTokens(line),
      });
    }
  }

  return JSON.stringify({
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  });
}



/**
 * Parses TipTap JSON content, extracts text blocks, updates SQLite blocks & FTS table,
 * and synchronizes bi-directional wiki-links and tags.
 */
export async function saveDocumentAndSynchronize(
  documentId: string,
  contentJson: string,
  title?: string,
  options?: { skipDiskExport?: boolean }
): Promise<{ headings: HeadingItem[]; wordCount: number; charCount: number }> {
  const now = Date.now();

  let docObj: any = null;
  try {
    docObj = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
  } catch (e) {
    return { headings: [], wordCount: 0, charCount: 0 };
  }

  const queries: { sql: string; params?: any[] }[] = [];

  // Update doc row
  if (title !== undefined) {
    queries.push({
      sql: `UPDATE documents SET content_json = ?, title = ?, updated_at = ? WHERE id = ?`,
      params: [contentJson, title, now, documentId],
    });
  } else {
    queries.push({
      sql: `UPDATE documents SET content_json = ?, updated_at = ? WHERE id = ?`,
      params: [contentJson, now, documentId],
    });
  }

  // Extract blocks, headings, wiki-links, and full text
  const extractedBlocks: { id: string; text: string; type: string; isTask: boolean; taskCompleted: boolean }[] = [];
  const headings: HeadingItem[] = [];
  const wikiLinks: string[] = [];
  let fullText = '';

  let orderIndex = 0;
  function traverseNodes(node: any) {
    if (!node) return;

    if (node.type === 'heading') {
      const hText = node.content?.map((c: any) => c.text || '').join('') || '';
      headings.push({
        id: `h-${headings.length}-${hText.slice(0, 15).replace(/\s+/g, '-').toLowerCase()}`,
        level: node.attrs?.level || 1,
        text: hText,
        pos: orderIndex,
      });
      extractedBlocks.push({
        id: `blk-${documentId}-${orderIndex++}`,
        text: hText,
        type: 'heading',
        isTask: false,
        taskCompleted: false,
      });
      fullText += ' ' + hText;
    } else if (node.type === 'paragraph' || node.type === 'codeBlock' || node.type === 'blockquote') {
      const pText = node.content?.map((c: any) => c.text || '').join('') || '';
      if (pText.trim()) {
        extractedBlocks.push({
          id: `blk-${documentId}-${orderIndex++}`,
          text: pText,
          type: node.type,
          isTask: false,
          taskCompleted: false,
        });
        fullText += ' ' + pText;

        // Check for Wiki links: [[Target Note]] or [[Target Note|Alias]]
        const wikiRegex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = wikiRegex.exec(pText)) !== null) {
          if (match[1]?.trim()) {
            let targetTitle = match[1].trim();
            if (targetTitle.includes('|')) {
              targetTitle = targetTitle.split('|')[0].trim();
            }
            if (targetTitle.includes('#')) {
              targetTitle = targetTitle.split('#')[0].trim();
            }
            if (targetTitle) {
              wikiLinks.push(targetTitle);
            }
          }
        }

        // Check for Markdown links: [Text](Target Note)
        const mdLinkRegex = /\[(.*?)\]\((.*?)\)/g;
        let mdMatch;
        while ((mdMatch = mdLinkRegex.exec(pText)) !== null) {
          let target = mdMatch[2]?.trim();
          if (target && !target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('mailto:') && !target.startsWith('#')) {
            if (target.startsWith('[[') && target.endsWith(']]')) {
              target = target.slice(2, -2).trim();
              if (target.includes('|')) target = target.split('|')[0].trim();
            }
            if (target.includes('#')) target = target.split('#')[0].trim();
            target = decodeURIComponent(target).replace(/\.md$/, '').trim();
            if (target) {
              wikiLinks.push(target);
            }
          }
        }
      }
    } else if (node.type === 'taskItem') {
      const tText = node.content?.[0]?.content?.map((c: any) => c.text || '').join('') || '';
      extractedBlocks.push({
        id: `blk-${documentId}-${orderIndex++}`,
        text: tText,
        type: 'task',
        isTask: true,
        taskCompleted: !!node.attrs?.checked,
      });
      fullText += ' ' + tText;
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (child.type !== 'paragraph' && child.type !== 'heading' && child.type !== 'taskItem') {
          traverseNodes(child);
        }
      }
    }
  }

  if (docObj.content) {
    for (const node of docObj.content) {
      traverseNodes(node);
    }
  }

  // Calculate metrics
  const cleanText = fullText.trim();
  const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
  const chars = cleanText.length;

  // 1. Synchronize blocks and FTS in SQLite
  queries.push({ sql: `DELETE FROM blocks WHERE document_id = ?`, params: [documentId] });
  queries.push({ sql: `DELETE FROM blocks_fts WHERE document_id = ?`, params: [documentId] });

  for (let i = 0; i < extractedBlocks.length; i++) {
    const b = extractedBlocks[i];
    queries.push({
      sql: `INSERT INTO blocks (id, document_id, parent_block_id, content_text, block_type, order_index, is_task, task_completed)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
      params: [b.id, documentId, b.text, b.type, i, b.isTask ? 1 : 0, b.taskCompleted ? 1 : 0],
    });

    queries.push({
      sql: `INSERT INTO blocks_fts (block_id, document_id, content_text) VALUES (?, ?, ?)`,
      params: [b.id, documentId, b.text],
    });
  }

  // 2. Synchronize Document Wiki-Links
  queries.push({ sql: `DELETE FROM document_links WHERE source_document_id = ?`, params: [documentId] });
  const uniqueLinks = Array.from(new Set(wikiLinks));
  if (uniqueLinks.length > 0) {
    try {
      const placeholders = uniqueLinks.map(() => '?').join(',');
      const targetDocs = await dbAdapter.query<{ id: string; title: string }>(
        `SELECT id, title FROM documents WHERE title IN (${placeholders}) AND is_folder = 0`,
        uniqueLinks
      );
      const targetDocMap = new Map<string, string>();
      for (const td of targetDocs) {
        targetDocMap.set(td.title.toLowerCase(), td.id);
      }
      for (const targetTitle of uniqueLinks) {
        const targetId = targetDocMap.get(targetTitle.toLowerCase());
        if (targetId) {
          queries.push({
            sql: `INSERT OR REPLACE INTO document_links (source_document_id, target_document_id, link_text) VALUES (?, ?, ?)`,
            params: [documentId, targetId, targetTitle],
          });
        }
      }
    } catch (linkErr) {
      console.error('[Flint Links] Error querying link targets:', linkErr);
    }
  }

  // 3. Synchronize Tags (document_tags)
  queries.push({ sql: `DELETE FROM document_tags WHERE document_id = ?`, params: [documentId] });
  const docTags = new Set<string>();
  const TAG_REGEX = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_\-\/]*)/g;
  let tagMatch;
  while ((tagMatch = TAG_REGEX.exec(fullText)) !== null) {
    const tagStr = tagMatch[1]?.trim().toLowerCase();
    if (tagStr && !/^[0-9a-fA-F]{3,6}$/.test(tagStr)) {
      docTags.add(tagStr);
    }
  }
  for (const tag of docTags) {
    queries.push({
      sql: `INSERT OR REPLACE INTO document_tags (document_id, tag) VALUES (?, ?)`,
      params: [documentId, tag],
    });
  }

  // Execute all sync queries in a single atomic transaction
  try {
    await dbAdapter.transaction(queries);
  } catch (syncErr) {
    console.error('[Flint Docs] Error saving document in transaction, running direct document update fallback:', syncErr);
    try {
      const docUpdate = queries[0];
      if (docUpdate) {
        await dbAdapter.execute(docUpdate.sql, docUpdate.params);
      }
    } catch (fbErr) {
      console.error('[Flint Docs] Critical fallback failed:', fbErr);
    }
  }

  // 5. Auto-export to raw Markdown (.md) in Flint Vault on disk for 100% portability
  try {
    const docRecord = (await dbAdapter.query<{ id: string; parent_id: string | null; title: string; properties?: string }>(`SELECT id, parent_id, title, properties FROM documents WHERE id = ?`, [documentId]))[0];
    const docTitle = title || docRecord?.title || 'Untitled';
    const docProps = docRecord?.properties || '{}';
    const mdContent = jsonToMarkdown(contentJson, docTitle, docProps);
    if (platform.isDesktop() && docRecord && !options?.skipDiskExport) {
      const allDocs = await dbAdapter.query<DocumentItem>(`SELECT id, parent_id, title FROM documents`);
      const relPath = getDocumentPath({ id: documentId, title: docTitle, parent_id: docRecord.parent_id }, allDocs);
      await platform.saveMarkdownFile(docTitle, mdContent, relPath);
      const isLocked = isDocumentLocked(docProps);
      await platform.setFileAttributes(relPath || docTitle, { readonly: isLocked, mtime: now });

      const normRel = (relPath || docTitle).replace(/\\/g, '/').toLowerCase();
      const manifestKey = normRel.endsWith('.md') ? normRel : `${normRel}.md`;
      const contentHash = computeFastHash(mdContent);
      try {
        await dbAdapter.execute(
          `INSERT OR REPLACE INTO file_manifest (relative_path, mtime, size, content_hash, indexed_at) VALUES (?, ?, ?, ?, ?)`,
          [manifestKey, now, mdContent.length, contentHash, now]
        );
      } catch (manifestErr) {}
    }
  } catch (e) {
    console.error('Error auto-exporting markdown file:', e);
  }

  return { headings, wordCount: words, charCount: chars };
}

/**
 * Computes full path (e.g. folder/subfolder/file) for any document
 */
export function getDocumentPath(
  doc: { id: string; title: string; parent_id?: string | null },
  allDocs: Array<{ id: string; title: string; parent_id?: string | null }>
): string {
  return getDocumentPathParts(doc, allDocs).join('/');
}

export interface BreadcrumbPart {
  id: string;
  title: string;
  isFolder: boolean;
}

/**
 * Computes structured breadcrumb parts with IDs and folder flags
 */
export function getDocumentBreadcrumbParts(
  doc: { id: string; title: string; parent_id?: string | null },
  allDocs: Array<{ id: string; title: string; parent_id?: string | null; is_folder?: number | boolean }>
): BreadcrumbPart[] {
  const parts: BreadcrumbPart[] = [
    { id: doc.id, title: doc.title || 'Untitled', isFolder: false },
  ];
  let currentParentId = doc.parent_id;
  const visited = new Set<string>();

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId);
    const parent = allDocs.find((d) => d.id === currentParentId);
    if (!parent) break;
    parts.unshift({
      id: parent.id,
      title: parent.title || 'Untitled',
      isFolder: true,
    });
    currentParentId = parent.parent_id;
  }

  return parts;
}

/**
 * Computes array of path parts (e.g. ['folder', 'subfolder', 'file']) for any document
 */
export function getDocumentPathParts(
  doc: { id: string; title: string; parent_id?: string | null },
  allDocs: Array<{ id: string; title: string; parent_id?: string | null }>
): string[] {
  return getDocumentBreadcrumbParts(doc, allDocs).map((p) => p.title);
}

/**
 * Checks if targetDocId is a descendant of potentialAncestorId (prevent circular tree nesting)
 */
export function isDescendant(
  targetDocId: string | null | undefined,
  potentialAncestorId: string,
  allDocs: Array<{ id: string; parent_id?: string | null }>
): boolean {
  if (!targetDocId || !potentialAncestorId) return false;
  if (targetDocId === potentialAncestorId) return true;

  let currentId: string | null | undefined = targetDocId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const doc = allDocs.find((d) => d.id === currentId);
    if (!doc) break;
    if (doc.parent_id === potentialAncestorId) return true;
    currentId = doc.parent_id;
  }
  return false;
}

/**
 * Calculates a unique title when an item is moved to a target folder / root.
 * If an item with the same name already exists in target location,
 * appends " (1)", " (2)", etc. (e.g. "Note" -> "Note (1)" -> "Note (2)").
 */
export function getUniqueTitleForMove(
  title: string,
  targetParentId: string | null,
  docs: Array<{ id: string; title: string; parent_id?: string | null; is_folder?: number | boolean }>,
  excludeDocId?: string
): string {
  const existingTitles = new Set(
    docs
      .filter((d) => d.id !== excludeDocId && (d.parent_id || null) === (targetParentId || null))
      .map((d) => d.title.trim().toLowerCase())
  );

  const trimmedTitle = title.trim();
  if (!existingTitles.has(trimmedTitle.toLowerCase())) {
    return trimmedTitle;
  }

  // Handle extension if present (e.g., .canvas or .md)
  let nameWithoutExt = trimmedTitle;
  let ext = '';
  const extMatch = trimmedTitle.match(/^(.+?)(\.(?:canvas|md|markdown|txt|json))$/i);
  if (extMatch) {
    nameWithoutExt = extMatch[1];
    ext = extMatch[2];
  }

  let counter = 1;
  while (true) {
    const candidate = `${nameWithoutExt} (${counter})${ext}`;
    if (!existingTitles.has(candidate.trim().toLowerCase())) {
      return candidate;
    }
    counter++;
  }
}

/**
 * Moves a document or folder to a new parent folder (or to root if targetParentId is null)
 * Optionally updates the title if renamed during the move.
 */
export async function moveDocument(
  id: string,
  targetParentId: string | null,
  newTitle?: string
): Promise<boolean> {
  const now = Date.now();
  try {
    if (newTitle !== undefined) {
      await dbAdapter.execute(
        `UPDATE documents SET parent_id = ?, title = ?, updated_at = ? WHERE id = ?`,
        [targetParentId, newTitle, now, id]
      );
    } else {
      await dbAdapter.execute(
        `UPDATE documents SET parent_id = ?, updated_at = ? WHERE id = ?`,
        [targetParentId, now, id]
      );
    }
    return true;
  } catch (err) {
    console.error('[Flint Docs] Failed to move document:', err);
    return false;
  }
}

/**
 * Ultra-fast deterministic non-cryptographic content hash (cyrb53-based)
 */
export function computeFastHash(str: string): string {
  let h1 = 0xdeadbeef ^ 0;
  let h2 = 0x41c6ce57 ^ 0;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export const DEFAULT_WELCOME_MARKDOWN = `---
id: welcome-to-flint
title: Welcome to Flint
bookmarked: true
---

# Welcome to Flint ⚡

Flint is a local-first writing environment and knowledge engine combining a modern typography canvas with embedded SQLite relational persistence and a modular extension ecosystem.

## Key Features & Hotkeys

- **Quick Open / Command Search**: \`Ctrl + K\` or \`Cmd + K\`
- **Slash Commands**: Type \`/\` at any empty line to insert headings, task lists, code blocks, or custom extension blocks.
- **Bi-directional Wiki-links**: Type \`[[\` to link to any note in your Hearth.
- **Graph View**: Explore connections between ideas dynamically.
- **Daily Notes**: Keep track of daily thoughts and logs seamlessly.

## Getting Started

Create notes, organize folders in the left sidebar, and explore installed extensions from Settings (\`Ctrl + ,\`).
`;

/**
 * Scans the physical vault folder on disk and synchronizes all .md files and folders into SQLite.
 * Uses file_manifest for fast O(N stat) differential indexing, skipping untouched files.
 */
export async function syncVaultDiskToSQLite(): Promise<{ syncedCount: number }> {
  if (!platform.isDesktop()) {
    return { syncedCount: 0 };
  }

  try {
    let diskItems = await platform.scanVaultFiles();
    const existingDocs = await getAllDocuments();

    // If both disk and SQLite have zero documents, auto-seed the initial welcome document
    if ((!diskItems || diskItems.length === 0) && existingDocs.length === 0) {
      try {
        await platform.saveMarkdownFile('Welcome to Flint', DEFAULT_WELCOME_MARKDOWN, 'Welcome to Flint.md');
        diskItems = await platform.scanVaultFiles();
      } catch (seedErr) {
        console.error('[Flint Docs] Failed to auto-seed Welcome note to disk:', seedErr);
      }
    }

    if (!diskItems || diskItems.length === 0) return { syncedCount: 0 };
    let trashRows: { original_id: string; title: string; original_path: string }[] = [];
    try {
      trashRows = await dbAdapter.query<{ original_id: string; title: string; original_path: string }>(
        `SELECT original_id, title, original_path FROM trash_items`
      );
    } catch (e) {}
    const trashSet = new Set<string>();
    for (const t of trashRows) {
      if (t.title) trashSet.add(t.title.toLowerCase());
      if (t.original_path) trashSet.add(t.original_path.toLowerCase());
    }

    // Load file_manifest
    const manifestMap = new Map<string, { mtime: number; size: number; content_hash: string }>();
    try {
      const manifestRows = await dbAdapter.query<{ relative_path: string; mtime: number; size: number; content_hash: string }>(
        `SELECT relative_path, mtime, size, content_hash FROM file_manifest`
      );
      for (const m of manifestRows) {
        manifestMap.set(m.relative_path.toLowerCase(), m);
      }
    } catch (e) {}

    const folderMapByPath = new Map<string, string>(); // relative path -> folder ID
    const docMapByPath = new Map<string, DocumentItem>(); // relative path -> doc

    // Map existing documents
    for (const doc of existingDocs) {
      const docPath = getDocumentPath(doc, existingDocs);
      docMapByPath.set(docPath.toLowerCase(), doc);
      if (doc.is_folder) {
        folderMapByPath.set(docPath.toLowerCase(), doc.id);
      }
    }

    // 1. Process directories first
    const diskFolders = diskItems.filter((i) => i.isFolder);
    diskFolders.sort((a, b) => a.relativePath.split('/').length - b.relativePath.split('/').length);

    for (const folder of diskFolders) {
      const relPath = folder.relativePath.replace(/\\/g, '/');
      const parts = relPath.split('/');
      const folderName = parts[parts.length - 1];
      const parentRelPath = parts.slice(0, -1).join('/');
      const parentId = parentRelPath ? folderMapByPath.get(parentRelPath.toLowerCase()) || null : null;

      let folderId = folderMapByPath.get(relPath.toLowerCase());
      if (!folderId) {
        folderId = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const now = folder.mtime || Date.now();
        await dbAdapter.execute(
          `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
           VALUES (?, ?, ?, '{}', 0, 1, 0, 'base', '{}', ?, ?)`,
          [folderId, parentId, folderName, now, now]
        );
        folderMapByPath.set(relPath.toLowerCase(), folderId);
      }
    }

    // 2. Process markdown files differentially
    const diskFiles = diskItems.filter((i) => !i.isFolder);
    let syncedCount = 0;
    const modifiedOrAddedDocIds: string[] = [];

    for (const file of diskFiles) {
      const relPath = file.relativePath.replace(/\\/g, '/');
      const parts = relPath.split('/');
      const fileName = file.name; // without .md
      const parentRelPath = parts.slice(0, -1).join('/');
      const parentId = parentRelPath ? folderMapByPath.get(parentRelPath.toLowerCase()) || null : null;

      const pathKey = (parentRelPath ? `${parentRelPath}/${fileName}` : fileName).toLowerCase();
      const normKey = pathKey.endsWith('.md') ? pathKey : `${pathKey}.md`;

      // If a file actively exists on disk, clean up any stale trash record referencing this path
      if (trashSet.has(pathKey) || trashSet.has(normKey)) {
        try {
          await dbAdapter.execute(`DELETE FROM trash_items WHERE LOWER(original_path) = ? OR LOWER(original_path) = ?`, [pathKey, normKey]);
        } catch (e) {}
      }

      let matchedDoc = docMapByPath.get(pathKey);
      if (!matchedDoc) {
        matchedDoc = existingDocs.find(
          (d) => !d.is_folder && d.title.toLowerCase() === fileName.toLowerCase() && (d.parent_id || null) === (parentId || null)
        );
      }
      if (!matchedDoc && (fileName.toLowerCase() === 'welcome to flint' || fileName.toLowerCase() === 'welcome-to-flint')) {
        matchedDoc = existingDocs.find((d) => d.id === 'welcome-to-flint');
      }

      const fileContent = file.content || '';
      const fileMtime = file.mtime || Date.now();
      const fileSize = fileContent.length;
      const manifestEntry = manifestMap.get(normKey) || manifestMap.get(pathKey);

      // Fast-path: Check if file was already indexed and is untouched on disk
      if (matchedDoc && manifestEntry && manifestEntry.mtime === fileMtime && manifestEntry.size === fileSize) {
        // Document is 100% up-to-date in SQLite index! Skip parsing!
        continue;
      }

      const contentHash = computeFastHash(fileContent);
      if (matchedDoc && manifestEntry && manifestEntry.content_hash === contentHash) {
        // Content hash matches exactly
        continue;
      }

      if (!matchedDoc) {
        // Create new document
        const { properties, bodyText } = parseFrontmatter(fileContent);
        const contentJson = markdownToTipTapJson(bodyText);
        const propertiesJson = Object.keys(properties).length > 0 ? JSON.stringify(properties) : '{}';
        const isWelcomeDoc = fileName.toLowerCase() === 'welcome to flint' || fileName.toLowerCase() === 'welcome-to-flint';
        const newId = isWelcomeDoc ? 'welcome-to-flint' : `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const isBookmarked = isWelcomeDoc ? 1 : 0;
        const now = fileMtime;
        await dbAdapter.execute(
          `INSERT INTO documents (id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, 0, ?, 'base', ?, ?, ?)`,
          [newId, parentId, fileName, contentJson, isBookmarked, propertiesJson, now, now]
        );
        try {
          await dbAdapter.execute(
            `INSERT OR REPLACE INTO file_manifest (relative_path, mtime, size, content_hash, indexed_at) VALUES (?, ?, ?, ?, ?)`,
            [normKey, fileMtime, fileSize, contentHash, Date.now()]
          );
        } catch (e) {}
        modifiedOrAddedDocIds.push(newId);
        syncedCount++;
      } else {
        // Update modified existing document
        const { properties, bodyText } = parseFrontmatter(fileContent);
        const contentJson = markdownToTipTapJson(bodyText);
        const propertiesJson = Object.keys(properties).length > 0 ? JSON.stringify(properties) : (matchedDoc.properties || '{}');
        await dbAdapter.execute(
          `UPDATE documents SET content_json = ?, properties = ?, updated_at = ? WHERE id = ?`,
          [contentJson, propertiesJson, fileMtime, matchedDoc.id]
        );
        try {
          await dbAdapter.execute(
            `INSERT OR REPLACE INTO file_manifest (relative_path, mtime, size, content_hash, indexed_at) VALUES (?, ?, ?, ?, ?)`,
            [normKey, fileMtime, fileSize, contentHash, Date.now()]
          );
        } catch (e) {}
        modifiedOrAddedDocIds.push(matchedDoc.id);
        syncedCount++;
      }
    }

    // 3. Detect and remove external deletions from SQLite (files removed outside Flint e.g. git checkout)
    const diskPathSet = new Set<string>();
    for (const f of diskFiles) {
      const relPath = f.relativePath.replace(/\\/g, '/').toLowerCase();
      diskPathSet.add(relPath);
      diskPathSet.add(relPath.endsWith('.md') ? relPath : `${relPath}.md`);
    }

    const removedDocIds: string[] = [];
    const removedPaths: string[] = [];
    for (const doc of existingDocs) {
      if (doc.is_folder) continue;

      // Preserve media attachments (images, audio, video, pdf, canvas) stored in SQLite
      const isMediaOrAttachment =
        doc.doc_type === 'image' ||
        doc.doc_type === 'audio' ||
        doc.doc_type === 'video' ||
        doc.doc_type === 'pdf' ||
        doc.doc_type === 'canvas' ||
        /\.(png|jpe?g|gif|svg|webp|bmp|ico|avif|pdf|mp4|webm|mp3|wav|ogg|m4a|canvas)$/i.test(doc.title);

      if (isMediaOrAttachment) {
        continue;
      }

      const docPath = getDocumentPath(doc, existingDocs).replace(/\\/g, '/').toLowerCase();
      const docPathMd = docPath.endsWith('.md') ? docPath : `${docPath}.md`;

      const existsOnDisk = diskPathSet.has(docPath) || diskPathSet.has(docPathMd);
      const isTrashed = trashSet.has(docPath) || trashSet.has(docPathMd);

      if (!existsOnDisk && !isTrashed) {
        removedDocIds.push(doc.id);
        removedPaths.push(docPath);
      }
    }

    if (removedDocIds.length > 0) {
      syncedCount += removedDocIds.length;
      for (let i = 0; i < removedDocIds.length; i++) {
        const rId = removedDocIds[i];
        const rPath = removedPaths[i];
        await dbAdapter.execute(`DELETE FROM documents WHERE id = ?`, [rId]);
        await dbAdapter.execute(`DELETE FROM blocks WHERE document_id = ?`, [rId]);
        await dbAdapter.execute(`DELETE FROM blocks_fts WHERE document_id = ?`, [rId]);
        await dbAdapter.execute(`DELETE FROM document_links WHERE source_document_id = ? OR target_document_id = ?`, [rId, rId]);
        await dbAdapter.execute(`DELETE FROM document_tags WHERE document_id = ?`, [rId]);
        if (rPath) {
          try {
            await dbAdapter.execute(`DELETE FROM file_manifest WHERE LOWER(relative_path) = ? OR LOWER(relative_path) = ?`, [rPath, `${rPath}.md`]);
          } catch (e) {}
        }
      }
    }

    // 4. Synchronize blocks, headings, FTS, tags, cards, and wiki-links for all modified/added documents
    if (modifiedOrAddedDocIds.length > 0) {
      const allUpdated = await getAllDocuments();
      for (const id of modifiedOrAddedDocIds) {
        const doc = allUpdated.find((d) => d.id === id);
        if (doc && doc.content_json) {
          await saveDocumentAndSynchronize(doc.id, doc.content_json, doc.title, { skipDiskExport: true });
        }
      }
    }

    // 5. Persist database to disk
    await dbAdapter.persist();
    return { syncedCount };
  } catch (err) {
    console.error('[Flint Vault Sync] Error syncing disk files to SQLite:', err);
    return { syncedCount: 0 };
  }
}

