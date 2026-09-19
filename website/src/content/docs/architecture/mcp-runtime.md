# Model Context Protocol (MCP) Runtime

An architectural overview of Noether's native Model Context Protocol (MCP) server, tool registration pipeline, and AI assistant integration.

## 1. Local Stdio Server Architecture
---

Noether provides a dedicated standalone stdio server script (`bin/noether-mcp-server.cjs`) that speaks the open **Model Context Protocol (MCP)** specification over standard input/output (stdio).

```
┌─────────────────────────────────────────────────────────────┐
│                 AI Assistants / External Clients            │
│  Claude Desktop • Claude Code • Cursor • Antigravity • Cline│
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON-RPC 2.0 over stdio
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Noether MCP Server Runner                   │
│   • Auto-discovers local Vaults • Validates Zod Schemas     │
│   • Routes Tool Invocations     • Sandboxed VM Script Tools │
│   • Dynamic Tools Notification  • Formats Preferences       │
└──────────────────────────────┬──────────────────────────────┘
                               │ High-Speed In-Memory Reads
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Target Vault                          │
│   • noether.sqlite (FTS5 search, backlinks, graph query)    │
│   • Plain text Markdown documents (*.md)                    │
│   • Dynamic custom tools (.noether/tools/*.js)              │
└─────────────────────────────────────────────────────────────┘
```

This allows external AI agents to query your local knowledge base, read notes, search tags, find backlinks, and execute tasks without sending your notes to an unvetted cloud proxy.

## 2. Automatic Vault Auto-Discovery
---

Most local MCP servers require hardcoding exact vault absolute filesystem paths into your client's configuration file.

Noether eliminates manual path configuration through **automatic local vault discovery**:
1. When launched, `noether-mcp-server.cjs` inspects the operating system's local application data directory where Noether stores recent workspace metadata.
2. It detects the active Vault and recent Vault history automatically.
3. If multiple Vaults are active, the client can call `noether_list_vaults` and `noether_switch_vault` dynamically via MCP tools.

## 3. Extension Tool Registration via SDK
---

Every extension in Noether can expose structured tools to AI agents using `this.registerTool()`:

```typescript
import { Extension, z } from 'noether';

export default class TaskExtension extends Extension {
  async onload(): Promise<void> {
    this.registerTool({
      name: 'get_pending_tasks',
      description: 'Returns all pending tasks across the current vault.',
      schema: z.object({
        tag: z.string().optional().describe('Optional tag filter (e.g. #urgent)'),
      }),
      isDestructive: false,
      handler: async ({ tag }, app) => {
        const tasks = await this.queryTasks(tag);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tasks),
            },
          ],
        };
      },
    });
  }
}
```

- **Prefixing**: Tool names are automatically namespaced with the extension ID (e.g. `tasks_get_pending_tasks`) to prevent name collisions across extensions.
- **Safety Flags**: Destructive actions (deleting notes, clearing tables) must be declared with `isDestructive: true` to trigger client-side safety confirmations.
- **Fast Local Execution**: Queries run directly against the local SQLite database and in-memory caches without blocking the desktop UI or waiting on network roundtrips.

## 4. Dynamic Vault Custom Tools & Sandboxed VM Execution
---

Noether allows AI agents and users to create dynamic custom MCP tools on the fly via `noether_create_custom_tool`:

- **Storage**: Tool scripts are saved into `.noether/tools/<name>.js`.
- **Sandbox Execution**: Custom tools execute in an isolated Node.js `vm.Script` sandbox with access to the vault data provider and sanitized utilities.
- **Dynamic Hot-Reloading**: When a tool is created or deleted, the server hot-reloads the module and broadcasts a `notifications/tools/list_changed` JSON-RPC notification to connected MCP clients.

## 5. Structured MCP Prompts
---

In addition to tools, the MCP runtime dispatches structured prompts (`prompts/list`, `prompts/get`):

- `noether_system_instructions`: Emits domain protocol guidelines (Wikilinks, Flashcards, Tasks, Cascades) for connecting agents.
- `noether_daily_review`: Generates an aggregated synthesis of daily journal logs, newly created notes, and open tasks.
- `noether_synthesize_topic`: Aggregates notes, backlinks, and tags matching a query for deep research workflows.

