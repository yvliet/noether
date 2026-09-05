# Model Context Protocol (MCP) Tools

Model Context Protocol (MCP) is an open standard that allows AI agents and Large Language Models (LLMs) to discover and invoke tools exposed by local applications. In Flint, MCP is a first-class architectural primitive: **every extension that manages queryable data or performs state changes can expose tools to AI agents**.


## 1. How MCP Operates in Flint

---

Flint implements a native, in-process MCP tool registry. When an extension registers a tool via `this.registerTool()`, it becomes immediately available to:

1. **In-App AI Copilots & Assistants**: Agents running inside Flint can search, create, summarize, and reorganize notes directly in memory with zero IPC serialization latency.
2. **External Desktop Clients**: Applications like **Claude Desktop**, **Cursor**, and **Antigravity** connect to Flint over standard I/O (`flint-mcp-server`) and discover all core and extension tools automatically.

| Client & Protocol Layer | In-Process Resolution Pipeline |
|:---|:---|
| **AI Client Layer** | Applications communicating via standard Model Context Protocol (MCP) |
| **Supported Clients** | In-App AI Copilot, Claude Desktop, Cursor, Antigravity, custom LLM orchestrators |
| **Transport Layer** | In-memory direct call (In-App) or JSON-RPC 2.0 over standard I/O (`flint-mcp-server`) |
| **Flint `ToolRegistry` Engine** | Central discovery and dispatch coordinator |
| **Core Built-in Tools** | `flint_search_notes`, `flint_read_note`, `tasks_get_all`, `fsrs_get_due_cards`, etc. |
| **Extension Registered Tools** | Dynamic tools registered during extension lifecycle via `this.registerTool()` |
| **Execution Handlers** | Type-safe async handlers querying SQLite database or in-memory stores with zero UI lag |


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
import { Extension, McpToolDefinition, McpToolResult } from 'flint';

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

        // Query the document via Flint's database or workspace
        const doc = await app.workspace.getDocument(docId);
        if (!doc) {
          return {
            content: [
              { type: 'text', text: `Error: Document with ID "${docId}" not found.` }
            ],
            isError: true,
          };
        }

        const words = (doc.content || '').trim().split(/\s+/).filter(Boolean).length;
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

For end-to-end type safety, Flint supports [Zod](https://zod.dev) schemas. Flint automatically infers TypeScript handler argument types and compiles the Zod schema into MCP-compliant JSON Schema at runtime:

```typescript
import { Extension, McpToolResult } from 'flint';
import { z } from 'zod';

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
        const doc = await app.workspace.getDocument(documentId);
        if (!doc) {
          return {
            content: [{ type: 'text', text: `Document "${documentId}" does not exist.` }],
            isError: true,
          };
        }

        const taskLine = `\n- [ ] ${taskDescription}${dueDate ? ` 📅 ${dueDate}` : ''}`;
        await app.workspace.updateDocument(documentId, (doc.content || '') + taskLine);

        return {
          content: [
            { type: 'text', text: `Successfully appended task to "${doc.title}".` },
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
    const doc = await app.workspace.getDocument(documentId);
    const backlinks = await app.workspace.getBacklinks(documentId);

    return {
      description: `Project summary context for ${doc?.title || documentId}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please generate a comprehensive status report for "${doc?.title}".\n\nContent:\n${doc?.content}\n\nLinked Notes:\n${JSON.stringify(backlinks)}`,
          },
        },
      ],
    };
  },
});
```


## 6. External Agent Setup

---

Because Flint's native MCP server auto-discovers all known Hearths, configuring external AI tools requires zero file path arguments:

### Claude Desktop Configuration
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "flint": {
      "command": "flint-mcp-server"
    }
  }
}
```

### Cursor Configuration
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "flint": {
      "command": "flint-mcp-server"
    }
  }
}
```

External agents can now search your notes (`flint_search_notes`), query your tasks (`tasks_get_all`), and invoke your custom extension tools seamlessly.


## 7. Related Reading & References

---

- [[Flint SDK API Reference]]: Complete MCP interfaces, Zod helpers, and tool definitions.
- [[Events & Relational Storage]]: Coordinate AI actions with database transactions.
- [[Dual-Storage Architecture]]: How AI tools query SQLite indexes with sub-millisecond latency.
- [[Database Schema Reference]]: Inspect tables exposed to AI query handlers.
