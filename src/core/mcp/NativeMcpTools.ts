/**
 * @module NativeMcpTools
 * @description
 * Native vault-level Model Context Protocol (MCP) tool provider for Noether.
 * Registers baseline core tools (document search, retrieval, creation, updates,
 * properties manipulation, tagging, and backlinks) that are permanently available
 * to AI agents and external MCP clients regardless of which extensions are loaded.
 *
 * Technical Rationale:
 * - In-Memory State vs Raw Disk I/O: Handlers query `app.vault.documents` and reactive
 *   store bridges rather than performing synchronous file reads from disk. This ensures
 *   sub-millisecond tool execution latency and prevents blocking the main UI thread.
 * - Central Native Provider vs Extension Sandbox: Core tools are registered directly
 *   onto `app.tools` without extension prefixing (e.g., `noether_read_note` instead of
 *   `core_noether_read_note`) to maintain a clean, stable MCP namespace for LLM function calling.
 *
 * @since 0.3.0
 */

import type { NoetherApp } from '../app/NoetherApp';
import type { McpToolResult, McpToolDefinition, McpPromptDefinition } from '../extensions/types';
import type { DocumentItem, RecentVaultItem } from '@/types';
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
 * @param app - The central NoetherApp host instance.
 */
export function registerNativeTools(app: NoetherApp): void {
  const nativeTools: McpToolDefinition[] = [
    // ── 1. Full-Text Search Notes ──
    {
      name: 'noether_search_notes',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const query = String(args.query || '').trim().toLowerCase();
          const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : 20;

          if (!query) {
            return {
              content: [{ type: 'text', text: JSON.stringify([]) }],
            };
          }

          const docs = hostApp.vault.documents;
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
      name: 'noether_read_note',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const doc = (await hostApp.vault.readDocument(docId)) || hostApp.vault.getDocumentById(docId);
          if (!doc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          const properties = hostApp.vault.getDocumentProperties(docId);
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
      name: 'noether_create_note',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const title = String(args.title || 'Untitled').trim();
          const content = typeof args.content === 'string' ? args.content : undefined;
          const parentId = typeof args.parentId === 'string' ? args.parentId : undefined;

          const newDoc = await hostApp.vault.createNewNote(title, parentId);
          if (!newDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Failed to create document in Vault storage.' }],
            };
          }

          if (content !== undefined) {
            hostApp.vault.saveDocument(newDoc.id, content, title);
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
      name: 'noether_update_note',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          const content = typeof args.content === 'string' ? args.content : '';

          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const existingDoc = hostApp.vault.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          hostApp.vault.saveDocument(docId, content);

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
      name: 'noether_delete_note',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const existingDoc = hostApp.vault.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          hostApp.vault.deleteDocument(docId);

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
      name: 'noether_rename_note',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          const newTitle = String(args.newTitle || '').trim();

          if (!docId || !newTitle) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameters "documentId" and "newTitle" are required.' }],
            };
          }

          const existingDoc = hostApp.vault.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          hostApp.vault.renameDocument(docId, newTitle);

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
      name: 'noether_list_all_notes',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : 100;
          const offset = typeof args.offset === 'number' && args.offset >= 0 ? args.offset : 0;

          const allDocs = hostApp.vault.documents;
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
      name: 'noether_get_note_properties',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const existingDoc = hostApp.vault.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          const properties = hostApp.vault.getDocumentProperties(docId);

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
      name: 'noether_set_note_properties',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
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

          const existingDoc = hostApp.vault.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          await hostApp.vault.updateDocumentProperties(docId, properties);

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
      name: 'noether_toggle_bookmark',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const existingDoc = hostApp.vault.getDocumentById(docId);
          if (!existingDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          const isBookmarked = await hostApp.vault.toggleBookmark(docId);

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
      name: 'noether_get_backlinks',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const docId = String(args.documentId || '').trim();
          if (!docId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "documentId" is required.' }],
            };
          }

          const targetDoc = hostApp.vault.getDocumentById(docId);
          if (!targetDoc) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Document with ID "${docId}" was not found.` }],
            };
          }

          const targetTitle = targetDoc.title.toLowerCase();
          const backlinks: Array<{ sourceId: string; sourceTitle: string }> = [];
          const wikiRegex = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g;

          for (const doc of hostApp.vault.documents) {
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
      name: 'noether_get_tags',
      description: 'Aggregate and count all frontmatter tags across all notes in the vault.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (_args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const tagCounts = new Map<string, number>();

          for (const doc of hostApp.vault.documents) {
            const props = hostApp.vault.getDocumentProperties(doc.id);
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
      name: 'noether_get_documents_by_tag',
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
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
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

          for (const doc of hostApp.vault.documents) {
            const props = hostApp.vault.getDocumentProperties(doc.id);
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

    // ── 14. List All Known Vaults ──
    {
      name: 'noether_list_vaults',
      description: 'List all known and recent Vaults (workspaces/vaults) in Noether, including paths, names, and which one is active. Enables zero-config multi-vault access for agents.',
      category: 'vaults',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (_args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const data = await platform.getCurrentVault();
          const currentPath = hostApp.vault.vaultPath || data.path;
          const currentName = hostApp.vault.vaultName || data.name;

          const recentList = (data.recentVaults || []).map((h: RecentVaultItem) => ({
            name: h.name,
            path: h.path,
            lastOpened: (h as any).lastOpened || (h as any).last_opened || null,
            isActive: h.path === currentPath,
          }));

          // Ensure current active vault is present
          if (currentPath && !recentList.some((h: { path: string }) => h.path === currentPath)) {
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
                  activeVault: {
                    name: currentName,
                    path: currentPath,
                    documentCount: hostApp.vault.documents.length,
                  },
                  allVaults: recentList,
                  totalVaults: recentList.length,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error listing Vaults: ${message}` }],
          };
        }
      },
    },

    // ── 15. Get Active Vault ──
    {
      name: 'noether_get_active_vault',
      description: 'Get details about the currently active Vault workspace: name, root path, document count, and status.',
      category: 'vaults',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (_args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const name = hostApp.vault.vaultName;
          const path = hostApp.vault.vaultPath;
          const docCount = hostApp.vault.documents.length;
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
            content: [{ type: 'text', text: `Error getting active Vault: ${message}` }],
          };
        }
      },
    },

    // ── 16. Switch Active Vault ──
    {
      name: 'noether_switch_vault',
      description: 'Switch the active Vault workspace to a different known Vault by path or name. Seamlessly switches context without reconfiguring the agent.',
      category: 'vaults',
      parameters: {
        type: 'object',
        properties: {
          vaultPath: {
            type: 'string',
            description: 'The absolute directory path to the target Vault workspace',
          },
          name: {
            type: 'string',
            description: 'Optional name of a recent Vault (used to resolve path if vaultPath is omitted)',
          },
        },
      },
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          let targetPath = typeof args.vaultPath === 'string' ? args.vaultPath.trim() : '';
          const targetName = typeof args.name === 'string' ? args.name.trim().toLowerCase() : '';

          if (!targetPath && targetName) {
            const data = await platform.getCurrentVault();
            const match = (data.recentVaults || []).find(
              (h: RecentVaultItem) => h.name.toLowerCase() === targetName || h.name.toLowerCase().includes(targetName)
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
                  text: 'Could not resolve target Vault. Please provide a valid "vaultPath" or known "name". Use noether_list_vaults to view available Vaults.',
                },
              ],
            };
          }

          const res = await platform.setCurrentVault(targetPath);
          if (!res.success) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Failed to switch to Vault at "${targetPath}".` }],
            };
          }

          hostApp.events.emit('vault:changed', { path: res.path, name: res.name });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: `Successfully switched active Vault to "${res.name}".`,
                  activeVault: {
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
            content: [{ type: 'text', text: `Error switching Vault: ${message}` }],
          };
        }
      },
    },

    // ── 17. Create New Vault ──
    {
      name: 'noether_create_vault',
      description: 'Create a brand new Vault workspace folder and optionally switch to it.',
      category: 'vaults',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Display name and directory name for the new Vault',
          },
          parentPath: {
            type: 'string',
            description: 'Parent directory where the Vault folder should be created. If omitted, default system location is used.',
          },
        },
        required: ['name'],
      },
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const name = String(args.name || '').trim();
          const parentPath = typeof args.parentPath === 'string' ? args.parentPath.trim() : undefined;

          if (!name) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Parameter "name" is required.' }],
            };
          }

          const res = await platform.createNewVault(name, parentPath);
          if (!res.success) {
            return {
              isError: true,
              content: [{ type: 'text', text: `Failed to create Vault: ${res.error || 'Unknown error'}` }],
            };
          }

          hostApp.events.emit('vault:changed', { path: res.path, name: res.name });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: `Vault "${res.name}" created successfully at "${res.path}".`,
                  vault: {
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
            content: [{ type: 'text', text: `Error creating Vault: ${message}` }],
          };
        }
      },
    },

    // ── 18. Search Across All Vaults ──
    {
      name: 'noether_search_across_vaults',
      description: 'Search for notes across ALL known/recent Vaults in Noether simultaneously, returning results grouped by Vault workspace.',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to match against note titles and file paths across all Vaults',
          },
          limitPerVault: {
            type: 'number',
            description: 'Maximum results to return per Vault (default: 10)',
          },
        },
        required: ['query'],
      },
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const query = String(args.query || '').trim().toLowerCase();
          const limitPerVault = typeof args.limitPerVault === 'number' && args.limitPerVault > 0 ? args.limitPerVault : 10;

          if (!query) {
            return {
              content: [{ type: 'text', text: JSON.stringify([]) }],
            };
          }

          const vaultData = await platform.getCurrentVault();
          const currentPath = hostApp.vault.vaultPath || vaultData.path;
          const currentName = hostApp.vault.vaultName || vaultData.name;

          const vaultsToSearch: Array<{ name: string; path: string; isActive: boolean }> = [];
          if (currentPath) {
            vaultsToSearch.push({ name: currentName, path: currentPath, isActive: true });
          }

          for (const rh of vaultData.recentVaults || []) {
            if (rh.path && !vaultsToSearch.some((h) => h.path === rh.path)) {
              vaultsToSearch.push({ name: rh.name, path: rh.path, isActive: false });
            }
          }

          const crossResults: Array<{
            vaultName: string;
            vaultPath: string;
            isActive: boolean;
            matches: Array<{ title: string; relative_path: string; id?: string }>;
          }> = [];

          for (const targetVault of vaultsToSearch) {
            const matches: Array<{ title: string; relative_path: string; id?: string }> = [];

            if (targetVault.isActive) {
              // Fast in-memory scan for active vault
              const docsMap = new Map(hostApp.vault.documents.map((d) => [d.id, d]));
              for (const doc of hostApp.vault.documents) {
                if (doc.is_folder) continue;
                const titleMatch = doc.title ? doc.title.toLowerCase().includes(query) : false;
                const contentMatch = doc.content_json ? doc.content_json.toLowerCase().includes(query) : false;

                if (titleMatch || contentMatch) {
                  matches.push({
                    id: doc.id,
                    title: doc.title,
                    relative_path: buildRelativePath(doc, docsMap),
                  });
                  if (matches.length >= limitPerVault) break;
                }
              }
            } else {
              // Disk scan for background vaults
              try {
                const diskFiles = await platform.scanVaultFiles(targetVault.path);
                for (const item of diskFiles) {
                  if (item.isFolder) continue;
                  const nameMatch = item.name.toLowerCase().includes(query);
                  const pathMatch = item.relativePath.toLowerCase().includes(query);

                  if (nameMatch || pathMatch) {
                    matches.push({
                      title: item.name.replace(/\.md$/i, ''),
                      relative_path: item.relativePath,
                    });
                    if (matches.length >= limitPerVault) break;
                  }
                }
              } catch (e) {
                console.warn(`[NativeMcpTools] Could not scan background vault "${targetVault.name}":`, e);
              }
            }

            if (matches.length > 0) {
              crossResults.push({
                vaultName: targetVault.name,
                vaultPath: targetVault.path,
                isActive: targetVault.isActive,
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
            content: [{ type: 'text', text: `Error searching across Vaults: ${message}` }],
          };
        }
      },
    },

    // ── 23. Run Script ──
    {
      name: 'noether_run_script',
      description: 'Execute an ad-hoc JavaScript script against the in-app Vault state with instant access to documents, database, and workspace APIs.',
      category: 'workspace',
      parameters: {
        type: 'object',
        properties: {
          script: {
            type: 'string',
            description: 'JavaScript code to execute. Variables in scope: app, vault, args, console.',
          },
          args: {
            type: 'object',
            description: 'Optional arguments object',
          },
        },
        required: ['script'],
      },
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const scriptCode = String(args.script || '').trim();
          if (!scriptCode) {
            return { isError: true, content: [{ type: 'text', text: 'Script parameter is required.' }] };
          }

          const logs: Array<{ level: string; message: string }> = [];
          const logger = {
            log: (...a: unknown[]) => logs.push({ level: 'info', message: a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ') }),
            info: (...a: unknown[]) => logs.push({ level: 'info', message: a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ') }),
            warn: (...a: unknown[]) => logs.push({ level: 'warn', message: a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ') }),
            error: (...a: unknown[]) => logs.push({ level: 'error', message: a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ') }),
          };

          const startTime = performance.now();
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          const fn = new AsyncFunction('app', 'vault', 'args', 'console', scriptCode);
          const result = await fn(hostApp, hostApp.vault, args.args || {}, logger);
          const executionTimeMs = performance.now() - startTime;

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  result: result !== undefined ? result : null,
                  logs,
                  executionTimeMs: Math.round(executionTimeMs),
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Script execution error: ${message}` }],
          };
        }
      },
    },

    // ── 24. Create Custom Tool ──
    {
      name: 'noether_create_custom_tool',
      description: 'Create and dynamically register a custom MCP tool in the application ToolRegistry for in-app agents.',
      category: 'workspace',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Unique tool name identifier' },
          description: { type: 'string', description: 'Detailed tool description' },
          parameters: { type: 'object', description: 'JSON Schema for parameters' },
          script: { type: 'string', description: 'JavaScript code handler' },
        },
        required: ['name', 'description', 'script'],
      },
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        try {
          const rawName = String(args.name || '').trim().toLowerCase().replace(/^custom_/, '');
          if (!/^[a-z0-9_-]+$/.test(rawName)) {
            return { isError: true, content: [{ type: 'text', text: 'Invalid tool name. Use alphanumeric characters, underscores, or hyphens.' }] };
          }

          const description = String(args.description || `Custom tool: ${rawName}`);
          const scriptCode = String(args.script || '');
          const parameters = (args.parameters as any) || { type: 'object', properties: {} };
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

          const toolName = `custom_${rawName}`;
          hostApp.tools.registerTool({
            name: toolName,
            description,
            category: 'custom',
            parameters,
            handler: async (toolArgs: Record<string, unknown>, app: NoetherApp): Promise<McpToolResult> => {
              const logs: Array<{ level: string; message: string }> = [];
              const logger = {
                log: (...a: unknown[]) => logs.push({ level: 'info', message: a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ') }),
                info: (...a: unknown[]) => logs.push({ level: 'info', message: a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ') }),
                warn: (...a: unknown[]) => logs.push({ level: 'warn', message: a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ') }),
                error: (...a: unknown[]) => logs.push({ level: 'error', message: a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ') }),
              };
              const fn = new AsyncFunction('args', 'app', 'vault', 'console', scriptCode);
              const result = await fn(toolArgs, app, app.vault, logger);
              return {
                content: [{ type: 'text', text: JSON.stringify({ result, logs }) }],
              };
            },
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: `Custom tool "${rawName}" registered successfully.`,
                  toolName,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return { isError: true, content: [{ type: 'text', text: `Failed to create tool: ${message}` }] };
        }
      },
    },

    // ── 25. List Custom Tools ──
    {
      name: 'noether_list_custom_tools',
      description: 'List all custom dynamic MCP tools registered in the workspace.',
      category: 'workspace',
      parameters: { type: 'object', properties: {} },
      handler: async (_args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        const allTools = hostApp.tools.getAllTools();
        const custom = allTools
          .filter((t) => t.name.startsWith('custom_') || t.category === 'custom')
          .map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ totalCustomTools: custom.length, tools: custom }),
            },
          ],
        };
      },
    },

    // ── 26. Run Custom Tool ──
    {
      name: 'noether_run_custom_tool',
      description: 'Execute a custom MCP tool by name.',
      category: 'workspace',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the custom tool' },
          args: { type: 'object', description: 'Arguments payload' },
        },
        required: ['name'],
      },
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        const name = String(args.name || '').trim();
        const fullName = name.startsWith('custom_') ? name : `custom_${name}`;
        const toolArgs = (args.args as Record<string, unknown>) || {};
        return hostApp.tools.executeTool(fullName, toolArgs);
      },
    },

    // ── 27. Delete Custom Tool ──
    {
      name: 'noether_delete_custom_tool',
      description: 'Unregister a custom MCP tool by name.',
      category: 'workspace',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the custom tool to unregister' },
        },
        required: ['name'],
      },
      handler: async (args: Record<string, unknown>, hostApp: NoetherApp): Promise<McpToolResult> => {
        const name = String(args.name || '').trim();
        const fullName = name.startsWith('custom_') ? name : `custom_${name}`;
        hostApp.tools.unregisterTool(fullName);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Tool "${fullName}" unregistered.` }) }],
        };
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
      name: 'noether_system_instructions',
      description: 'Comprehensive system instructions and domain manual for AI agents operating in Noether. Explains Vaults, Wikilinks, FSRS flashcard syntax, Cascades, and optimal tool-chaining recipes.',
      arguments: [
        {
          name: 'mode',
          description: 'Detail level: "concise" (fast summary) or "comprehensive" (full manual). Defaults to "comprehensive".',
          required: false,
        },
      ],
      getMessages: async (args: Record<string, string>, hostApp: NoetherApp) => {
        const vaultName = hostApp.vault.vaultName || 'Default Vault';
        const vaultPath = hostApp.vault.vaultPath || 'Local';
        const docCount = hostApp.vault.documents.length;
        const mode = args.mode === 'concise' ? 'concise' : 'comprehensive';

        const instructions = `# Noether AI Agent System Manual & Operational Protocol

You are connected to Noether via native Model Context Protocol (MCP) tools and prompts.

## Active Workspace Context
- **Active Vault**: "${vaultName}" (${vaultPath})
- **Total Indexed Documents**: ${docCount}
- **Database Status**: ${hostApp.workspace.isDatabaseActive ? 'Online & Synchronized' : 'Offline'}

## 1. Domain Concepts & Primitives
- **Vault**: A self-contained knowledge workspace containing markdown notes, SQLite indices, and configurations.
- **Documents**: Markdown notes with optional YAML/JSON frontmatter properties (\`properties\`).
- **Wikilinks**: Bidirectional links formatted as \`[[Note Title]]\` or \`[[Note Title|Custom Display Label]]\`.
- **Flashcards (FSRS-4.5)**:
  - Concept/Descriptor: \`Concept :: Descriptor\`
  - Bidirectional: \`Term ;; Definition\` (generates two cards: forward and reverse)
  - Cloze Deletion: \`{Answer}\` or \`==Answer==\`
- **Checklist Tasks**: \`- [ ] Pending task\` and \`- [x] Completed task\`.
- **Cascade Books**: Sequential reader notes marked with frontmatter: \`Cascade: "Book Name"\` and \`Cascade Page: 1\` (or negative integers \`-1\` for Roman numeral preface \`i\`).

## 2. Tool-Chaining Best Practices
1. **Search Before Create**: Always call \`noether_search_notes({ query })\` before creating a document to avoid duplicating existing notes.
2. **Link Related Knowledge**: When creating or updating notes, add wikilinks (\`[[Target Note]]\`) to existing related concepts.
3. **Multi-Vault Navigation**: Use \`noether_list_vaults\` and \`noether_search_across_vaults\` to query notes across workspaces without asking users for filesystem paths. Switch with \`noether_switch_vault\`.
4. **Preserve Frontmatter**: When modifying note metadata, use \`noether_set_note_properties\` to safely merge key-value pairs without wiping existing properties.`;

        return {
          description: `Noether System Instructions (${mode})`,
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
      name: 'noether_daily_review',
      description: 'Generates a prompt containing today\'s daily journal note, pending checklist tasks, due flashcards, and vault stats for an end-of-day or morning synthesis.',
      arguments: [
        {
          name: 'date',
          description: 'Optional ISO date string (YYYY-MM-DD). Defaults to today.',
          required: false,
        },
      ],
      getMessages: async (args: Record<string, string>, hostApp: NoetherApp) => {
        const todayStr = args.date || new Date().toISOString().split('T')[0];
        const allDocs = hostApp.vault.documents;

        // Find journal note
        const journalDoc = allDocs.find((d) => d.title.includes(todayStr) || d.title.toLowerCase() === 'today');
        const journalContent = journalDoc?.content_json || 'No daily journal entry found for today.';

        const promptText = `Please synthesize my daily summary and priorities for ${todayStr}.

## Daily Journal Note: "${journalDoc?.title || todayStr}"
${journalContent}

## Workspace Overview
- Active Vault: ${hostApp.vault.vaultName}
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
      name: 'noether_synthesize_topic',
      description: 'Searches for all notes and incoming/outgoing links matching a topic and generates a comprehensive research synthesis prompt.',
      arguments: [
        {
          name: 'topic',
          description: 'The topic, keyword, or concept to synthesize across the Vault.',
          required: true,
        },
      ],
      getMessages: async (args: Record<string, string>, hostApp: NoetherApp) => {
        const topic = (args.topic || '').trim();
        if (!topic) {
          return {
            isError: true,
            description: 'Topic is required.',
            messages: [{ role: 'user', content: { type: 'text', text: 'Error: "topic" argument is required.' } }],
          };
        }

        const query = topic.toLowerCase();
        const docs = hostApp.vault.documents;
        const matchingNotes = docs.filter(
          (d) => !d.is_folder && (d.title.toLowerCase().includes(query) || (d.content_json && d.content_json.toLowerCase().includes(query)))
        ).slice(0, 10);

        const notesSummary = matchingNotes.map((d) => `### [[${d.title}]]\n${d.content_json?.slice(0, 500) || '(Empty)'}`).join('\n\n');

        const promptText = `I want a comprehensive knowledge synthesis on the topic: **"${topic}"**.

Here are the most relevant notes found in my Vault "${hostApp.vault.vaultName}":

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
