import { dbAdapter } from './adapter';
import { BacklinkItem, OutgoingLinkItem, UnlinkedMentionItem, DocumentItem } from '@/types';
import { getDocumentById, saveDocumentAndSynchronize } from './documents';

export async function getBacklinksForDocument(targetDocId: string): Promise<BacklinkItem[]> {
  try {
    const results = await dbAdapter.query<any>(
      `SELECT dl.source_document_id, dl.link_text, d.title as source_document_title, d.updated_at,
              (SELECT content_text FROM blocks WHERE document_id = dl.source_document_id AND content_text LIKE '%' || dl.link_text || '%' LIMIT 1) as snippet
       FROM document_links dl
       JOIN documents d ON d.id = dl.source_document_id
       WHERE dl.target_document_id = ?
       ORDER BY d.updated_at DESC`,
      [targetDocId]
    );

    return results.map((r) => ({
      source_document_id: r.source_document_id,
      source_document_title: r.source_document_title || 'Untitled',
      link_text: r.link_text,
      snippet: r.snippet || `Referenced [[${r.link_text}]]`,
      updated_at: r.updated_at,
    }));
  } catch (err) {
    console.error('[Flint Links] Backlinks error:', err);
    return [];
  }
}

export async function getOutgoingLinks(sourceDocId: string): Promise<string[]> {
  try {
    const results = await dbAdapter.query<{ link_text: string }>(
      `SELECT link_text FROM document_links WHERE source_document_id = ?`,
      [sourceDocId]
    );
    return results.map((r) => r.link_text);
  } catch (err) {
    return [];
  }
}

/**
 * Returns outgoing links with resolved target document IDs and snippets
 */
export async function getOutgoingLinksWithDetails(sourceDocId: string): Promise<OutgoingLinkItem[]> {
  try {
    const doc = await getDocumentById(sourceDocId);
    if (!doc || !doc.content_json) return [];

    const outgoingLinks: OutgoingLinkItem[] = [];
    const wikiRegex = /\[\[(.*?)\]\]/g;
    const foundLinks = new Set<string>();

    const parsed = JSON.parse(doc.content_json);
    const traverse = (node: any) => {
      if (!node) return;
      if (node.type === 'text' && typeof node.text === 'string') {
        let match;
        wikiRegex.lastIndex = 0;
        while ((match = wikiRegex.exec(node.text)) !== null) {
          let linkText = match[1]?.trim();
          if (linkText) {
            if (linkText.includes('|')) {
              linkText = linkText.split('|')[0].trim();
            }
            if (linkText && !foundLinks.has(linkText.toLowerCase())) {
              foundLinks.add(linkText.toLowerCase());
              outgoingLinks.push({
                link_text: linkText,
                target_document_id: null,
                exists: false,
                snippet: node.text.trim(),
              });
            }
          }
        }

        const mdRegex = /\[(.*?)\]\((.*?)\)/g;
        while ((match = mdRegex.exec(node.text)) !== null) {
          let linkTarget = match[2]?.trim();
          if (linkTarget && !linkTarget.startsWith('http://') && !linkTarget.startsWith('https://') && !linkTarget.startsWith('mailto:') && !linkTarget.startsWith('#')) {
            if (linkTarget.startsWith('[[') && linkTarget.endsWith(']]')) {
              linkTarget = linkTarget.slice(2, -2).trim();
              if (linkTarget.includes('|')) linkTarget = linkTarget.split('|')[0].trim();
            }
            if (linkTarget.includes('#')) linkTarget = linkTarget.split('#')[0].trim();
            linkTarget = decodeURIComponent(linkTarget).replace(/\.md$/, '').trim();
            if (linkTarget && !foundLinks.has(linkTarget.toLowerCase())) {
              foundLinks.add(linkTarget.toLowerCase());
              outgoingLinks.push({
                link_text: linkTarget,
                target_document_id: null,
                exists: false,
                snippet: node.text.trim(),
              });
            }
          }
        }
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    };

    if (parsed.content) {
      parsed.content.forEach(traverse);
    }

    // Resolve target documents in a single batched query
    if (outgoingLinks.length > 0) {
      const linkTexts = outgoingLinks.map((item) => item.link_text);
      const placeholders = linkTexts.map(() => '?').join(',');
      const matchDocs = await dbAdapter.query<{ id: string; title: string }>(
        `SELECT id, title FROM documents WHERE title IN (${placeholders}) AND is_folder = 0`,
        linkTexts
      );
      const docMap = new Map<string, string>();
      for (const doc of matchDocs) {
        docMap.set(doc.title.toLowerCase(), doc.id);
      }
      for (const item of outgoingLinks) {
        const targetId = docMap.get(item.link_text.toLowerCase());
        if (targetId) {
          item.target_document_id = targetId;
          item.exists = true;
        }
      }
    }

    return outgoingLinks;
  } catch (err) {
    console.error('[Flint Links] Outgoing links error:', err);
    return [];
  }
}

/**
 * Searches for plain-text mentions of the document's title in other documents
 * that are NOT yet [[wikilinked]].
 */
export async function getUnlinkedMentionsForDocument(
  targetDocId: string,
  targetTitle: string
): Promise<UnlinkedMentionItem[]> {
  if (!targetTitle || targetTitle.trim().length < 2) return [];

  const cleanTitle = targetTitle.trim();
  const sanitized = cleanTitle.replace(/['"*]/g, '');
  if (!sanitized) return [];

  try {
    let blocks: any[] = [];
    try {
      // Fast path: use FTS4 table MATCH for indexed full-text lookup
      blocks = await dbAdapter.query<any>(
        `SELECT b.document_id, b.content_text, d.title as source_document_title, d.updated_at
         FROM blocks_fts b
         JOIN documents d ON d.id = b.document_id
         WHERE blocks_fts MATCH ?
           AND b.document_id != ?
           AND d.is_folder = 0
         ORDER BY d.updated_at DESC`,
        [`"${sanitized}"`, targetDocId]
      );
    } catch (ftsErr) {
      // Fallback to LIKE if FTS query syntax error or FTS table issue
      blocks = await dbAdapter.query<any>(
        `SELECT b.document_id, b.content_text, d.title as source_document_title, d.updated_at
         FROM blocks b
         JOIN documents d ON d.id = b.document_id
         WHERE b.document_id != ? 
           AND d.is_folder = 0
           AND b.content_text LIKE '%' || ? || '%'
         ORDER BY d.updated_at DESC`,
        [targetDocId, cleanTitle]
      );
    }

    // Fallback if FTS returned 0 results (e.g. prefix/substring match)
    if (blocks.length === 0) {
      blocks = await dbAdapter.query<any>(
        `SELECT b.document_id, b.content_text, d.title as source_document_title, d.updated_at
         FROM blocks b
         JOIN documents d ON d.id = b.document_id
         WHERE b.document_id != ? 
           AND d.is_folder = 0
           AND b.content_text LIKE '%' || ? || '%'
         ORDER BY d.updated_at DESC`,
        [targetDocId, cleanTitle]
      );
    }

    // Filter out blocks that only have mentions inside existing [[...]] links
    const unlinked: UnlinkedMentionItem[] = [];
    const seenDocs = new Set<string>();

    for (const blk of blocks) {
      const text = blk.content_text || '';
      // Strip out all [[...]] links first to check for unlinked plain-text mentions
      const textWithoutLinks = text.replace(/\[\[[^\]]+\]\]/g, '');

      // Check if title appears as a word/phrase outside of any existing links
      const titlePattern = new RegExp(`\\b${escapeRegex(cleanTitle)}\\b`, 'i');
      if (titlePattern.test(textWithoutLinks)) {
        if (!seenDocs.has(blk.document_id)) {
          seenDocs.add(blk.document_id);
          unlinked.push({
            source_document_id: blk.document_id,
            source_document_title: blk.source_document_title || 'Untitled',
            snippet: text.trim(),
            match_text: cleanTitle,
            updated_at: blk.updated_at,
          });
        }
      }
    }

    return unlinked;
  } catch (err) {
    console.error('[Flint Links] Unlinked mentions error:', err);
    return [];
  }
}

/**
 * Converts a plain text mention into [[targetTitle]] in the source document.
 */
export async function convertUnlinkedMentionToLink(
  sourceDocId: string,
  targetTitle: string
): Promise<boolean> {
  try {
    const doc = await getDocumentById(sourceDocId);
    if (!doc || !doc.content_json) return false;

    const parsed = JSON.parse(doc.content_json);
    let modified = false;

    // Matches already-wrapped wikilinks OR plain-text mentions
    const pattern = new RegExp(`(\\[\\[[^\\]]+\\]\\])|\\b(${escapeRegex(targetTitle)})\\b`, 'gi');

    const replaceInNode = (node: any) => {
      if (!node) return;
      if (node.type === 'text' && typeof node.text === 'string') {
        const text = node.text;
        const newText = text.replace(pattern, (match: string, alreadyWrapped?: string, plainMention?: string) => {
          if (alreadyWrapped) {
            return alreadyWrapped; // Leave existing [[...]] wikilinks untouched
          }
          if (plainMention) {
            modified = true;
            return `[[${plainMention}]]`;
          }
          return match;
        });
        if (newText !== text) {
          node.text = newText;
        }
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(replaceInNode);
      }
    };

    if (parsed.content) {
      parsed.content.forEach(replaceInNode);
    }

    if (modified) {
      const newJson = JSON.stringify(parsed);
      await saveDocumentAndSynchronize(sourceDocId, newJson, doc.title);
      return true;
    }

    return false;
  } catch (err) {
    console.error('[Flint Links] Failed to convert unlinked mention to link:', err);
    return false;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
