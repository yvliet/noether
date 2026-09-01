/**
 * @module NativeMcpTools
 * @description
 * Native vault-level Model Context Protocol (MCP) tool provider for Flint.
 * Registers baseline core tools (document search, retrieval, creation, updates,
 * properties manipulation, tagging, and backlinks) that are permanently available
 * to AI agents and external MCP clients regardless of which extensions are loaded.
 *
 * Decision Rationale ("Why This, Not That"):
 * - In-Memory State vs Raw Disk I/O: Handlers query `app.hearth.documents` and reactive
 *   store bridges rather than performing synchronous file reads from disk. This ensures
 *   sub-millisecond tool execution latency and prevents blocking the main UI thread.
 * - Central Native Provider vs Extension Sandbox: Core tools are registered directly
 *   onto `app.tools` without extension prefixing (e.g., `flint_read_note` instead of
 *   `core_flint_read_note`) to maintain a clean, stable MCP namespace for LLM function calling.
 *
 * @since 0.3.0
 */

import type { FlintApp } from '../app/FlintApp';
import type { McpToolResult, McpToolDefinition, McpPromptDefinition } from '../extensions/types';
import type { DocumentItem } from '@/types';
import { platform } from '@/lib/platform/platformAdapter';

/**
 * Helper to construct the relative hierarchical path for a document within the vault.
 * Traverses parent references up to root to produce a clean path string like 'Folder/Subfolder/Note.md'.
 */
function buildRelativePath(doc: DocumentItem, docsMap: Map<string, DocumentItem>): string {
  const extension = doc.is_folder ? '' : '.md';
  const parts: string[] = [doc.title + extension];
  let curr = doc;
  const visited = new Set<string>([curr.id]);

  while (curr.parent_id) {
    const parent = docsMap.get(curr.parent_id);
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    parts.unshift(parent.title);
    curr = parent;
  }

  return parts.join('/');
}

/**
 * Registers all native vault-level MCP tools into the application's ToolRegistry.
 *
 * @param app - The central FlintApp host instance.
 */
export function registerNativeTools(app: FlintApp): void {
  const nativeTools: McpToolDefinition[] = [
    // ── 1. Full-Text Search Notes ──
    {
      name: 'flint_search_notes',
      description: 'Search across all note titles and contents in the vault using full-text matching.',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term or keyword to match against note titles or content',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 20)',
          },
        },
        required: ['query'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const query = String(args.query || '').trim().toLowerCase();
          const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : 20;

          if (!query) {
            return {
              content: [{ type: 'text', text: JSON.stringify([]) }],
            };
          }

          const docs = hostApp.hearth.documents;
          const docsMap = new Map(docs.map((d) => [d.id, d]));
          const matched: Array<{ id: string; title: string; relative_path: string }> = [];

          for (const doc of docs) {
            if (doc.is_folder) continue;
            const titleMatch = doc.title ? doc.title.toLowerCase().includes(query) : false;
            const contentMatch = doc.content_json ? doc.content_json.toLowerCase().includes(query) : false;

            if (titleMatch || contentMatch) {
              matched.push({
                id: doc.id,
                title: doc.title,
                relative_path: buildRelativePath(doc, docsMap),
              });
              if (matched.length >= limit) break;
            }
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(matched) }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error searching notes: ${message}` }],
          };
        }
      },
    },

    // ── 2. Read Note ──
    {
      name: 'flint_read_note',
      description: 'Retrieve the content, title, and frontmatter properties of a specific note by ID.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the document to read',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const doc = hostApp.hearth.getDocumentById(docId);
          if (!doc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          const properties = hostApp.hearth.getDocumentProperties(docId);
          const data = {
            id: doc.id,
            title: doc.title,
            content: doc.content_json || '',
            properties,
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(data) }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error reading note: ${message}` }],
          };
        }
      },
    },

    // ── 3. Create Note ──
    {
      name: 'flint_create_note',
      description: 'Create a new markdown note in the vault with optional initial content and parent folder.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title for the new note',
          },
          content: {
            type: 'string',
            description: 'Initial content of the note (Markdown / serialized TipTap JSON)',
          },
          parentId: {
            type: 'string',
            description: 'Optional parent folder ID for folder hierarchy placement',
          },
        },
        required: ['title'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const title = String(args.title || 'Untitled').trim();
          const content = typeof args.content === 'string' ? args.content : undefined;
          const parentId = typeof args.parentId === 'string' ? args.parentId : undefined;

          const newDoc = await hostApp.hearth.createNewNote(title, parentId);
          if (!newDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Failed to create document in Hearth storage.' }],
            };
          }

          if (content !== undefined) {
            hostApp.hearth.saveDocument(newDoc.id, content, title);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: newDoc.id,
                  title: newDoc.title,
                  message: 'Document created successfully.',
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error creating note: ${message}` }],
          };
        }
      },
    },

    // ── 4. Update Note ──
    {
      name: 'flint_update_note',
      description: 'Update the content body of an existing note by ID.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the document to update',
          },
          content: {
            type: 'string',
            description: 'New document content',
          },
        },
        required: ['documentId', 'content'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          const content = typeof args.content === 'string' ? args.content : '';

          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const existingDoc = hostApp.hearth.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          hostApp.hearth.saveDocument(docId, content);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: docId,
                  success: true,
                  message: 'Note content updated successfully.',
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error updating note: ${message}` }],
          };
        }
      },
    },

    // ── 5. Delete Note ──
    {
      name: 'flint_delete_note',
      description: 'Permanently delete a note from the vault.',
      category: 'documents',
      isDestructive: true,
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the document to delete',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const existingDoc = hostApp.hearth.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          hostApp.hearth.deleteDocument(docId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: docId,
                  success: true,
                  message: `Document "${existingDoc.title}" (${docId}) deleted successfully.`,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error deleting note: ${message}` }],
          };
        }
      },
    },

    // ── 6. Rename Note ──
    {
      name: 'flint_rename_note',
      description: 'Rename an existing note or folder in the vault.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the document to rename',
          },
          newTitle: {
            type: 'string',
            description: 'The new title for the document',
          },
        },
        required: ['documentId', 'newTitle'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          const newTitle = String(args.newTitle || '').trim();

          if (!docId || !newTitle) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameters "documentId" and "newTitle" are required.' }],
            };
          }

          const existingDoc = hostApp.hearth.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          hostApp.hearth.renameDocument(docId, newTitle);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: docId,
                  newTitle,
                  success: true,
                  message: `Document renamed to "${newTitle}".`,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error renaming note: ${message}` }],
          };
        }
      },
    },

    // ── 7. List All Notes ──
    {
      name: 'flint_list_all_notes',
      description: 'List all documents and folders in the vault with pagination support.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of items to return (default: 100)',
          },
          offset: {
            type: 'number',
            description: 'Number of items to skip for pagination (default: 0)',
          },
        },
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : 100;
          const offset = typeof args.offset === 'number' && args.offset >= 0 ? args.offset : 0;

          const allDocs = hostApp.hearth.documents;
          const docsMap = new Map(allDocs.map((d) => [d.id, d]));
          const slice = allDocs.slice(offset, offset + limit);

          const result = slice.map((doc) => ({
            id: doc.id,
            title: doc.title,
            relative_path: buildRelativePath(doc, docsMap),
            is_folder: Boolean(doc.is_folder),
            is_bookmarked: Boolean(doc.is_bookmarked),
          }));

          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error listing notes: ${message}` }],
          };
        }
      },
    },

    // ── 8. Get Note Properties ──
    {
      name: 'flint_get_note_properties',
      description: 'Retrieve the parsed frontmatter properties (tags, aliases, custom metadata) of a document.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the document',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const existingDoc = hostApp.hearth.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          const properties = hostApp.hearth.getDocumentProperties(docId);

          return {
            content: [{ type: 'text', text: JSON.stringify(properties) }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error getting note properties: ${message}` }],
          };
        }
      },
    },

    // ── 9. Set Note Properties ──
    {
      name: 'flint_set_note_properties',
      description: 'Update or merge frontmatter properties on a document. Setting keys to null removes them.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the document',
          },
          properties: {
            type: 'object',
            description: 'Key-value map of frontmatter properties to merge or update',
          },
        },
        required: ['documentId', 'properties'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          const properties =
            args.properties && typeof args.properties === 'object' && !Array.isArray(args.properties)
              ? (args.properties as Record<string, unknown>)
              : {};

          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const existingDoc = hostApp.hearth.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          await hostApp.hearth.updateDocumentProperties(docId, properties);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: docId,
                  success: true,
                  message: 'Document properties updated successfully.',
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error setting note properties: ${message}` }],
          };
        }
      },
    },

    // ── 10. Toggle Bookmark ──
    {
      name: 'flint_toggle_bookmark',
      description: 'Toggle the bookmark status of a document between bookmarked and unbookmarked.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the document to toggle bookmark',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const existingDoc = hostApp.hearth.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          const isBookmarked = await hostApp.hearth.toggleBookmark(docId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: docId,
                  is_bookmarked: isBookmarked,
                  message: `Document is now ${isBookmarked ? 'bookmarked' : 'unbookmarked'}.`,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error toggling bookmark: ${message}` }],
          };
        }
      },
    },

    // ── 11. Get Backlinks ──
    {
      name: 'flint_get_backlinks',
      description: 'Find all documents in the vault that contain wikilinks pointing to the specified target note.',
      category: 'graph',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the target document',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const targetDoc = hostApp.hearth.getDocumentById(docId);
          if (!targetDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          const targetTitle = targetDoc.title.toLowerCase();
          const backlinks: Array<{ sourceId: string; sourceTitle: string }> = [];
          const wikiRegex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;

          for (const doc of hostApp.hearth.documents) {
            if (doc.id === docId || !doc.content_json) continue;

            let hasMatch = false;
            let match: RegExpExecArray | null;
            wikiRegex.lastIndex = 0;

            while ((match = wikiRegex.exec(doc.content_json)) !== null) {
              if (match[1]?.trim().toLowerCase() === targetTitle) {
                hasMatch = true;
                break;
              }
            }

            if (hasMatch) {
              backlinks.push({
                sourceId: doc.id,
                sourceTitle: doc.title || 'Untitled',
              });
            }
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(backlinks) }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error finding backlinks: ${message}` }],
          };
        }
      },
    },

    // ── 12. Get Tags ──
    {
      name: 'flint_get_tags',
      description: 'Aggregate and count all frontmatter tags across all notes in the vault.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (_args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const tagCounts = new Map<string, number>();

          for (const doc of hostApp.hearth.documents) {
            const props = hostApp.hearth.getDocumentProperties(doc.id);
            if (!props) continue;

            const rawTags: unknown = (props as Record<string, unknown>).tags;
            if (Array.isArray(rawTags)) {
              for (const tagItem of rawTags) {
                if (typeof tagItem === 'string' && tagItem.trim()) {
                  const normalized = tagItem.trim().replace(/^#/, '');
                  tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
                }
              }
            } else if (typeof rawTags === 'string' && rawTags.trim()) {
              const normalized = rawTags.trim().replace(/^#/, '');
              tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
            }
          }

          const result = Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error aggregating tags: ${message}` }],
          };
        }
      },
    },

    // ── 13. Get Documents by Tag ──
    {
      name: 'flint_get_documents_by_tag',
      description: 'Filter and return all documents that contain a specific frontmatter tag.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            description: 'Tag name to filter notes by (leading # optional)',
          },
        },
        required: ['tag'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const targetTag = String(args.tag || '')
            .trim()
            .replace(/^#/, '')
            .toLowerCase();

          if (!targetTag) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "tag" is required.' }],
            };
          }

          const matchedDocs: Array<{ id: string; title: string }> = [];

          for (const doc of hostApp.hearth.documents) {
            const props = hostApp.hearth.getDocumentProperties(doc.id);
            if (!props) continue;

            const rawTags: unknown = (props as Record<string, unknown>).tags;
            let hasTag = false;
            if (Array.isArray(rawTags)) {
              hasTag = rawTags.some(
                (t) => typeof t === 'string' && t.trim().replace(/^#/, '').toLowerCase() === targetTag
              );
            } else if (typeof rawTags === 'string') {
              hasTag = rawTags.trim().replace(/^#/, '').toLowerCase() === targetTag;
            }

            if (hasTag) {
              matchedDocs.push({ id: doc.id, title: doc.title });
            }
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(matchedDocs) }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error filtering documents by tag: ${message}` }],
          };
        }
      },
    },

    // ── 14. List All Known Hearths ──
    {
      name: 'flint_list_hearths',
      description: 'List all known and recent Hearths (workspaces/vaults) in Flint, including paths, names, and which one is active. Enables zero-config multi-vault access for agents.',
      category: 'hearths',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (_args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const data = await platform.getCurrentHearth();
          const currentPath = hostApp.hearth.hearthPath || data.path;
          const currentName = hostApp.hearth.hearthName || data.name;

          const recentList = (data.recentHearths || []).map((h) => ({
            name: h.name,
            path: h.path,
            lastOpened: (h as any).lastOpened || (h as any).last_opened || null,
            isActive: h.path === currentPath,
          }));

          // Ensure current active hearth is present
          if (currentPath && !recentList.some((h) => h.path === currentPath)) {
            recentList.unshift({
              name: currentName,
              path: currentPath,
              lastOpened: Date.now(),
              isActive: true,
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  activeHearth: {
                    name: currentName,
                    path: currentPath,
                    documentCount: hostApp.hearth.documents.length,
                  },
                  allHearths: recentList,
                  totalHearths: recentList.length,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error listing Hearths: ${message}` }],
          };
        }
      },
    },

    // ── 15. Get Active Hearth ──
    {
      name: 'flint_get_active_hearth',
      description: 'Get details about the currently active Hearth workspace: name, root path, document count, and status.',
      category: 'hearths',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (_args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const name = hostApp.hearth.hearthName;
          const path = hostApp.hearth.hearthPath;
          const docCount = hostApp.hearth.documents.length;
          const wordCount = hostApp.workspace.wordCount;

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  name,
                  path,
                  documentCount: docCount,
                  wordCount,
                  isDatabaseActive: hostApp.workspace.isDatabaseActive,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error getting active Hearth: ${message}` }],
          };
        }
      },
    },

    // ── 16. Switch Active Hearth ──
    {
      name: 'flint_switch_hearth',
      description: 'Switch the active Hearth workspace to a different known Hearth by path or name. Seamlessly switches context without reconfiguring the agent.',
      category: 'hearths',
      parameters: {
        type: 'object',
        properties: {
          hearthPath: {
            type: 'string',
            description: 'The absolute directory path to the target Hearth workspace',
          },
          name: {
            type: 'string',
            description: 'Optional name of a recent Hearth (used to resolve path if hearthPath is omitted)',
          },
        },
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          let targetPath = typeof args.hearthPath === 'string' ? args.hearthPath.trim() : '';
          const targetName = typeof args.name === 'string' ? args.name.trim().toLowerCase() : '';

          if (!targetPath && targetName) {
            const data = await platform.getCurrentHearth();
            const match = (data.recentHearths || []).find(
              (h) => h.name.toLowerCase() === targetName || h.name.toLowerCase().includes(targetName)
            );
            if (match) {
              targetPath = match.path;
            }
          }

          if (!targetPath) {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: 'Could not resolve target Hearth. Please provide a valid "hearthPath" or known "name". Use flint_list_hearths to view available Hearths.',
                },
              ],
            };
          }

          const res = await platform.setCurrentHearth(targetPath);
          if (!res.success) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Failed to switch to Hearth at "${targetPath}".` }],
            };
          }

          hostApp.events.emit('vault:changed', { path: res.path, name: res.name });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: `Successfully switched active Hearth to "${res.name}".`,
                  activeHearth: {
                    name: res.name,
                    path: res.path,
                  },
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error switching Hearth: ${message}` }],
          };
        }
      },
    },

    // ── 17. Create New Hearth ──
    {
      name: 'flint_create_hearth',
      description: 'Create a brand new Hearth workspace folder and optionally switch to it.',
      category: 'hearths',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Display name and directory name for the new Hearth',
          },
          parentPath: {
            type: 'string',
            description: 'Parent directory where the Hearth folder should be created. If omitted, default system location is used.',
          },
        },
        required: ['name'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const name = String(args.name || '').trim();
          const parentPath = typeof args.parentPath === 'string' ? args.parentPath.trim() : undefined;

          if (!name) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "name" is required.' }],
            };
          }

          const res = await platform.createNewHearth(name, parentPath);
          if (!res.success) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Failed to create Hearth: ${res.error || 'Unknown error'}` }],
            };
          }

          hostApp.events.emit('vault:changed', { path: res.path, name: res.name });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: `Hearth "${res.name}" created successfully at "${res.path}".`,
                  hearth: {
                    name: res.name,
                    path: res.path,
                  },
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error creating Hearth: ${message}` }],
          };
        }
      },
    },

    // ── 18. Search Across All Hearths ──
    {
      name: 'flint_search_across_hearths',
      description: 'Search for notes across ALL known/recent Hearths in Flint simultaneously, returning results grouped by Hearth workspace.',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to match against note titles and file paths across all Hearths',
          },
          limitPerHearth: {
            type: 'number',
            description: 'Maximum results to return per Hearth (default: 10)',
          },
        },
        required: ['query'],
      },
      handler: async (args: Record<string, unknown>, hostApp: FlintApp): Promise<McpToolResult> => {
        try {
          const query = String(args.query || '').trim().toLowerCase();
          const limitPerHearth = typeof args.limitPerHearth === 'number' && args.limitPerHearth > 0 ? args.limitPerHearth : 10;

          if (!query) {
            return {
              content: [{ type: 'text', text: JSON.stringify([]) }],
            };
          }

          const hearthData = await platform.getCurrentHearth();
          const currentPath = hostApp.hearth.hearthPath || hearthData.path;
          const currentName = hostApp.hearth.hearthName || hearthData.name;

          const hearthsToSearch: Array<{ name: string; path: string; isActive: boolean }> = [];
          if (currentPath) {
            hearthsToSearch.push({ name: currentName, path: currentPath, isActive: true });
          }

          for (const rh of hearthData.recentHearths || []) {
            if (rh.path && !hearthsToSearch.some((h) => h.path === rh.path)) {
              hearthsToSearch.push({ name: rh.name, path: rh.path, isActive: false });
            }
          }

          const crossResults: Array<{
            hearthName: string;
            hearthPath: string;
            isActive: boolean;
            matches: Array<{ title: string; relative_path: string; id?: string }>;
          }> = [];

          for (const targetHearth of hearthsToSearch) {
            const matches: Array<{ title: string; relative_path: string; id?: string }> = [];

            if (targetHearth.isActive) {
              // Fast in-memory scan for active hearth
              const docsMap = new Map(hostApp.hearth.documents.map((d) => [d.id, d]));
              for (const doc of hostApp.hearth.documents) {
                if (doc.is_folder) continue;
                const titleMatch = doc.title ? doc.title.toLowerCase().includes(query) : false;
                const contentMatch = doc.content_json ? doc.content_json.toLowerCase().includes(query) : false;

                if (titleMatch || contentMatch) {
                  matches.push({
                    id: doc.id,
                    title: doc.title,
                    relative_path: buildRelativePath(doc, docsMap),
                  });
                  if (matches.length >= limitPerHearth) break;
                }
              }
            } else {
              // Disk scan for background hearths
              try {
                const diskFiles = await platform.scanHearthFiles(targetHearth.path);
                for (const item of diskFiles) {
                  if (item.isFolder) continue;
                  const nameMatch = item.name.toLowerCase().includes(query);
                  const pathMatch = item.relativePath.toLowerCase().includes(query);

                  if (nameMatch || pathMatch) {
                    matches.push({
                      title: item.name.replace(/\.md$/i, ''),
                      relative_path: item.relativePath,
                    });
                    if (matches.length >= limitPerHearth) break;
                  }
                }
              } catch (e) {
                console.warn(`[NativeMcpTools] Could not scan background hearth "${targetHearth.name}":`, e);
              }
            }

            if (matches.length > 0) {
              crossResults.push({
                hearthName: targetHearth.name,
                hearthPath: targetHearth.path,
                isActive: targetHearth.isActive,
                matches,
              });
            }
          }

          return {
            content: [{ type: 'text', text: JSON.stringify(crossResults) }],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error searching across Hearths: ${message}` }],
          };
        }
      },
    },
  ];

  // Register each native tool directly on the application's ToolRegistry
  for (const tool of nativeTools) {
    app.tools.registerTool(tool);
  }

  // ── Native MCP Prompts ──
  const nativePrompts: McpPromptDefinition[] = [
    {
      name: 'flint_system_instructions',
      description: 'Comprehensive system instructions and domain manual for AI agents operating in Flint. Explains Hearths, Wikilinks, FSRS flashcard syntax, Cascades, and optimal tool-chaining recipes.',
      arguments: [
        {
          name: 'mode',
          description: 'Detail level: "concise" (fast summary) or "comprehensive" (full manual). Defaults to "comprehensive".',
          required: false,
        },
      ],
      getMessages: async (args: Record<string, string>, hostApp: FlintApp) => {
        const hearthName = hostApp.hearth.hearthName || 'Default Hearth';
        const hearthPath = hostApp.hearth.hearthPath || 'Local';
        const docCount = hostApp.hearth.documents.length;
        const mode = args.mode === 'concise' ? 'concise' : 'comprehensive';

        const instructions = `# Flint AI Agent System Manual & Operational Protocol

You are connected to Flint via native Model Context Protocol (MCP) tools and prompts.

## Active Workspace Context
- **Active Hearth**: "${hearthName}" (${hearthPath})
- **Total Indexed Documents**: ${docCount}
- **Database Status**: ${hostApp.workspace.isDatabaseActive ? 'Online & Synchronized' : 'Offline'}

## 1. Domain Concepts & Primitives
- **Hearth**: A self-contained knowledge workspace containing markdown notes, SQLite indices, and configurations.
- **Documents**: Markdown notes with optional YAML/JSON frontmatter properties (\`properties\`).
- **Wikilinks**: Bidirectional links formatted as \`[[Note Title]]\` or \`[[Note Title|Custom Display Label]]\`.
- **Flashcards (FSRS-4.5)**:
  - Concept/Descriptor: \`Concept :: Descriptor\`
  - Bidirectional: \`Term ;; Definition\` (generates two cards: forward and reverse)
  - Cloze Deletion: \`{Answer}\` or \`==Answer==\`
- **Checklist Tasks**: \`- [ ] Pending task\` and \`- [x] Completed task\`.
- **Cascade Books**: Sequential reader notes marked with frontmatter: \`Cascade: "Book Name"\` and \`Cascade Page: 1\` (or negative integers \`-1\` for Roman numeral preface \`i\`).

## 2. Tool-Chaining Best Practices
1. **Search Before Create**: Always call \`flint_search_notes({ query })\` before creating a document to avoid duplicating existing notes.
2. **Link Related Knowledge**: When creating or updating notes, add wikilinks (\`[[Target Note]]\`) to existing related concepts.
3. **Multi-Hearth Navigation**: Use \`flint_list_hearths\` and \`flint_search_across_hearths\` to query notes across workspaces without asking users for filesystem paths. Switch with \`flint_switch_hearth\`.
4. **Preserve Frontmatter**: When modifying note metadata, use \`flint_set_note_properties\` to safely merge key-value pairs without wiping existing properties.`;

        return {
          description: `Flint System Instructions (${mode})`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: instructions,
              },
            },
          ],
        };
      },
    },

    {
      name: 'flint_daily_review',
      description: 'Generates a prompt containing today\'s daily journal note, pending checklist tasks, due flashcards, and hearth stats for an end-of-day or morning synthesis.',
      arguments: [
        {
          name: 'date',
          description: 'Optional ISO date string (YYYY-MM-DD). Defaults to today.',
          required: false,
        },
      ],
      getMessages: async (args: Record<string, string>, hostApp: FlintApp) => {
        const todayStr = args.date || new Date().toISOString().split('T')[0];
        const allDocs = hostApp.hearth.documents;

        // Find journal note
        const journalDoc = allDocs.find((d) => d.title.includes(todayStr) || d.title.toLowerCase() === 'today');
        const journalContent = journalDoc?.content_json || 'No daily journal entry found for today.';

        const promptText = `Please synthesize my daily summary and priorities for ${todayStr}.

## Daily Journal Note: "${journalDoc?.title || todayStr}"
${journalContent}

## Workspace Overview
- Active Hearth: ${hostApp.hearth.hearthName}
- Total Notes: ${allDocs.length}

Please provide:
1. A concise executive summary of what was worked on or captured today.
2. Key takeaways, insights, or reflections.
3. Recommended follow-up actions or tasks for tomorrow.`;

        return {
          description: `Daily Review for ${todayStr}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: promptText,
              },
            },
          ],
        };
      },
    },

    {
      name: 'flint_synthesize_topic',
      description: 'Searches for all notes and incoming/outgoing links matching a topic and generates a comprehensive research synthesis prompt.',
      arguments: [
        {
          name: 'topic',
          description: 'The topic, keyword, or concept to synthesize across the Hearth.',
          required: true,
        },
      ],
      getMessages: async (args: Record<string, string>, hostApp: FlintApp) => {
        const topic = (args.topic || '').trim();
        if (!topic) {
          return {
            isError: true,
            description: 'Topic is required.',
            messages: [{ role: 'user', content: { type: 'text', text: 'Error: "topic" argument is required.' } }],
          };
        }

        const query = topic.toLowerCase();
        const docs = hostApp.hearth.documents;
        const matchingNotes = docs.filter(
          (d) => !d.is_folder && (d.title.toLowerCase().includes(query) || (d.content_json && d.content_json.toLowerCase().includes(query)))
        ).slice(0, 10);

        const notesSummary = matchingNotes.map((d) => `### [[${d.title}]]\n${d.content_json?.slice(0, 500) || '(Empty)'}`).join('\n\n');

        const promptText = `I want a comprehensive knowledge synthesis on the topic: **"${topic}"**.

Here are the most relevant notes found in my Hearth "${hostApp.hearth.hearthName}":

${notesSummary || 'No direct note matches found.'}

Please:
1. Provide a cohesive, structured synthesis connecting the concepts found across these notes.
2. Highlight any conceptual gaps or questions that remain unanswered.
3. Suggest 2-3 new notes or wikilinks I should create to bridge these ideas together.`;

        return {
          description: `Knowledge synthesis on "${topic}"`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: promptText,
              },
            },
          ],
        };
      },
    },
  ];

  for (const prompt of nativePrompts) {
    app.tools.registerPrompt(prompt);
  }
}
