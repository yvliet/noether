# Model Context Protocol (MCP) Tools

Model Context Protocol (MCP) lets AI agents and language models discover and call tools exposed by local applications. In Noether, extensions that manage queryable data or perform state changes can expose tools directly to AI agents.

## 1. How MCP Works in Noether
---

Noether includes an internal MCP tool registry. When an extension registers a tool via `this.registerTool()`, it becomes available to:

1. **In-App AI Copilot**: Agents running inside Noether can search, create, and organize notes directly via in-memory stores and SQLite.
2. **External AI Clients**: Applications like **Claude Desktop**, **Cursor**, and **Antigravity** connect to Noether over standard I/O (`bin/noether-mcp-server.cjs`) and discover registered tools automatically.


## 2. Tool Registration Guidelines & Conventions
---

When authoring MCP tools in your extensions:

- **Automatic Namespacing**: Tool names are automatically prefixed with your extension's manifest ID. If an extension with `id: "tasks"` registers `get_all`, the resulting MCP tool identifier is `tasks_get_all`.
- **Naming Verbs**: Use standard `snake_case` verbs:
  - Read: `get_`, `list_`, `search_`, `read_`
  - Write: `create_`, `update_`, `toggle_`
  - Destructive: `delete_`, `remove_`, `archive_`
- **Destructive Flag**: If a tool permanently deletes data or performs irreversible mutations, set `isDestructive: true`. AI interfaces use this flag to request explicit human confirmation before invocation.
- **Non-Blocking Execution**: Tool handlers must execute asynchronously and query in-memory stores or SQLite. Never perform synchronous raw disk I/O on the main thread.

## 3. Style A: Registering Tools with JSON Schema
---

Use standard MCP JSON Schema definitions when you prefer raw schema declarations without extra dependencies:

```typescript
import { Extension, McpToolDefinition, McpToolResult } from 'noether';

export default class ReadingStatsExtension extends Extension {
  async onload() {
    this.registerTool({
      name: 'get_reading_stats',
      description: 'Calculates word count, character count, and estimated reading time for a document.',
      category: 'documents',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID or path of the document to inspect.',
          },
          wordsPerMinute: {
            type: 'number',
            description: 'Estimated reading speed in words per minute (default: 200).',
            default: 200,
          },
        },
        required: ['documentId'],
      },
      handler: async (args, app): Promise<McpToolResult> => {
        const docId = String(args.documentId);
        const wpm = Number(args.wordsPerMinute) || 200;

        const doc = await app.vault.readDocument(docId);
        if (!doc) {
          return {
            content: [
              { type: 'text', text: `Error: Document with ID "${docId}" not found.` }
            ],
            isError: true,
          };
        }

        const words = (doc.title || '').trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.ceil(words / wpm);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                documentId: doc.id,
                title: doc.title,
                wordCount: words,
                readingTimeMinutes: minutes,
              }, null, 2),
            },
          ],
        };
      },
    });
  }
}
```

## 4. Style B: Type-Safe Zod Schema Registration
---

For end-to-end type safety, Noether supports [Zod](https://zod.dev) schemas. Noether automatically infers TypeScript handler argument types and compiles the Zod schema into MCP-compliant JSON Schema at runtime:

```typescript
import { Extension, McpToolResult, z } from 'noether';

export default class TaskExtension extends Extension {
  async onload() {
    this.registerTool({
      name: 'create_task',
      description: 'Appends a new actionable task item to a note.',
      category: 'tasks',
      isDestructive: false,
      schema: z.object({
        documentId: z.string().describe('Target document ID'),
        taskDescription: z.string().min(3).describe('Description of the task'),
        dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      }),
      handler: async ({ documentId, taskDescription, dueDate }, app): Promise<McpToolResult> => {
        const doc = await app.vault.readDocument(documentId);
        if (!doc) {
          return {
            content: [{ type: 'text', text: `Document "${documentId}" does not exist.` }],
            isError: true,
          };
        }

        return {
          content: [
            { type: 'text', text: `Successfully processed task for "${doc.title}".` },
          ],
        };
      },
    });
  }
}
```

## 5. Registering Reusable MCP Prompts (`this.registerPrompt`)
---

Extensions can also define reusable prompt workflows for external agents and conversational copilots:

```typescript
this.registerPrompt({
  name: 'summarize_project',
  description: 'Gathers a project document and its backlinks for executive summary synthesis.',
  arguments: [
    { name: 'documentId', description: 'ID of the project overview note', required: true },
  ],
  getMessages: async ({ documentId }, app) => {
    const doc = await app.vault.readDocument(documentId);
    return {
      description: `Project summary context for ${doc?.title || documentId}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please generate a comprehensive status report for "${doc?.title}".`,
          },
        },
      ],
    };
  },
});
```

## 6. Built-in Core Extension Tools Index (47 Tools)
---

Below is the complete reference of tools registered by built-in core extensions:

- **Backlinks**: `backlinks_get_incoming`, `backlinks_get_outgoing`, `backlinks_get_unlinked_mentions`, `backlinks_convert_mention`, `backlinks_insert_link`
- **Bookmarks**: `bookmarks_list`, `bookmarks_toggle`
- **Canvas**: `canvas_create_board`, `canvas_get_board`, `canvas_create_node`, `canvas_create_edge`, `canvas_delete_node`
- **Covers**: `covers_get`, `covers_set`, `covers_remove`
- **Graph View**: `graph_get_network`, `graph_get_orphans`, `graph_get_local_graph`, `graph_get_related_notes`, `graph_find_path`, `graph_get_hub_notes`
- **Version History**: `history_get_file_history`, `history_get_file_diff`, `history_restore_file_version`, `history_create_file_snapshot`
- **Daily Journal**: `journal_open_today`, `journal_open_date`, `journal_append_entry`
- **Marketplace**: `marketplace_list_installed`, `marketplace_search`
- **More Icons**: `more-icons_list`, `more-icons_get`, `more-icons_update_icon`, `more-icons_delete_icon`
- **Outline**: `outline_get_headings`
- **Properties**: `properties_get`, `properties_set`, `properties_delete`
- **Database Sync**: `sync_sync_now`, `sync_get_sync_status`, `sync_test_connection`
- **Tags**: `tags_list_all`, `tags_get_tree`, `tags_get_documents_for_tag`
- **Tasks**: `tasks_get_all`, `tasks_get_by_document`, `tasks_toggle_status`

## 7. Compiled Extension Tools vs Dynamic Vault Tools
---

Noether supports two distinct modalities for custom MCP tools:

1. **Compiled Extension Tools**: Authored inside standalone extension packages via `this.registerTool()` in `onload()`. These tools are packaged, versioned, distributed through the community registry, and automatically namespaced with the extension ID.
2. **Dynamic Vault Tools**: Authored dynamically by AI agents (or users) on demand via `noether_create_custom_tool` and stored in `<vault>/.noether/tools/<name>.js`. These tools require zero compilation or packaging. They are hot-loaded, validated, and registered into `tools/list` as `custom_<name>`, allowing AI models to immediately create and call tools tailored to a specific vault's domain.

## 8. Related Reading & References
---

- [[Noether SDK API Reference]]: Complete MCP interfaces, Zod helpers, and tool definitions.
- [[Events & Relational Storage]]: Coordinate AI actions with database transactions.
- [[Dual-Storage Architecture]]: How AI tools query SQLite indexes without full disk scans.
- [[Database Schema Reference]]: Inspect tables exposed to AI query handlers.

