# Model Context Protocol (MCP) Tools

Model Context Protocol (MCP) is an open standard that allows AI agents and Large Language Models (LLMs) to discover and invoke tools exposed by local applications. In Noether, MCP is a first-class architectural primitive: **every extension that manages queryable data or performs state changes can expose tools to AI agents**.


## 1. How MCP Operates in Noether

---

Noether implements a native, in-process MCP tool registry. When an extension registers a tool via `this.registerTool()`, it becomes immediately available to:

1. **In-App AI Copilots & Assistants**: Agents running inside Noether can search, create, summarize, and reorganize notes directly in memory with zero IPC serialization latency.
2. **External Desktop Clients**: Applications like **Claude Desktop**, **Cursor**, and **Antigravity** connect to Noether over standard I/O (`noether-mcp-server`) and discover all core and extension tools automatically.

| Client & Protocol Layer | In-Process Resolution Pipeline |
|:---|:---|
| **AI Client Layer** | Applications communicating via standard Model Context Protocol (MCP) |
| **Supported Clients** | In-App AI Copilot, Claude Desktop, Cursor, Antigravity, custom LLM orchestrators |
| **Transport Layer** | In-memory direct call (In-App) or JSON-RPC 2.0 over standard I/O (`noether-mcp-server`) |
| **Noether `ToolRegistry` Engine** | Central discovery and dispatch coordinator |
| **Core Built-in Tools** | `noether_search_notes`, `noether_read_note`, `tasks_get_all`, `fsrs_get_due_cards`, etc. |
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

        // Query the document via Noether's database or workspace
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

For end-to-end type safety, Noether supports [Zod](https://zod.dev) schemas. Noether automatically infers TypeScript handler argument types and compiles the Zod schema into MCP-compliant JSON Schema at runtime:

```typescript
import { Extension, McpToolResult } from 'noether';
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

Because Noether's native MCP server auto-discovers all known Vaults, configuring external AI tools requires zero file path arguments:

### Claude Desktop Configuration
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "noether": {
      "command": "noether-mcp-server"
    }
  }
}
```

### Cursor Configuration
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "noether": {
      "command": "noether-mcp-server"
    }
  }
}
```

External agents can now search your notes (`noether_search_notes`), query your tasks (`tasks_get_all`), and invoke your custom extension tools seamlessly.


## 7. Compiled Extension Tools vs Dynamic Vault Tools

---

Noether supports two distinct modalities for custom MCP tools:

1. **Compiled Extension Tools**: Authored inside standalone extension packages via `this.registerTool()` in `onload()`. These tools are packaged, versioned, distributed through the community registry, and automatically namespaced with the extension ID (e.g. `tasks_get_all`, `fsrs-spaced-repetition_get_due_cards`).
2. **Dynamic Vault Tools**: Authored dynamically by AI agents (or users) on demand via `noether_create_custom_tool` and stored in `<vault>/.noether/tools/<name>.js`. These tools require zero compilation or packaging. They are hot-loaded, validated, and registered into `tools/list` as `custom_<name>`, allowing AI models to immediately create and call tools tailored to a specific vault's domain.


## 8. Related Reading & References

---

- [[Noether SDK API Reference]]: Complete MCP interfaces, Zod helpers, and tool definitions.
- [[Events & Relational Storage]]: Coordinate AI actions with database transactions.
- [[Dual-Storage Architecture]]: How AI tools query SQLite indexes with sub-millisecond latency.
- [[Database Schema Reference]]: Inspect tables exposed to AI query handlers.
