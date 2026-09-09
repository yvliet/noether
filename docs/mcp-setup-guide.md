# Flint MCP Setup Guide

How to connect AI assistants like Claude Desktop, Cursor, and Antigravity directly to your Flint notes and tasks.

---

## 1. What is MCP?

---

Model Context Protocol (MCP) is an open standard that allows AI agents to discover and call tools exposed by applications. Flint implements a native MCP tool registry that lets AI assistants interact directly with your notes, tasks, flashcards, graph, and more.

---

## 2. Architecture & Tool Scopes

---

Flint exposes tools at two levels:

1. **Native Core Tools** (`flint_*`): Always available to search, read, create, update, delete notes, manage properties, bookmarks, tags, and backlinks.
2. **Extension Tools** (`{extensionId}_*`): Available when the extension is enabled (tasks, flashcards, canvas, journal, cascade, etc.). Disabling an extension removes its tools automatically.

---

## 3. In-App Agent Usage

---

If you are writing an extension or internal feature, you can call tools directly in-process:

```typescript
import { appInstance } from 'flint';

// List all available tools
const tools = appInstance.tools.getAllTools();
console.log(tools.map(t => t.name));

// Execute a tool
const result = await appInstance.tools.executeTool('flint_search_notes', { query: 'meeting notes' });
console.log(result.content);

// Get MCP-formatted schemas for LLM function calling
const schemas = appInstance.tools.getMcpToolSchemas();
```

---

## 4. Automatic Vault Discovery

---

Flint discovers all your Hearths automatically without requiring you to hardcode folder paths in your AI client settings.

When an AI agent connects to Flint:
1. It automatically attaches to the currently active Hearth.
2. It can call `flint_list_hearths` to discover all other known Hearths on your computer.
3. It can switch workspaces via `flint_switch_hearth` without restarting the connection.
4. It can search across all workspaces via `flint_search_across_hearths`.

---

## 5. External Agent Setup (Claude Desktop / Cursor / Antigravity)

---

Because Flint finds your active vault on its own, connecting external assistants only requires pointing them to the Flint MCP server script:

### Claude Desktop

Add Flint to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "flint": {
      "command": "node",
      "args": ["<path-to-flint>/bin/flint-mcp-server.cjs"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project or home directory:

```json
{
  "mcpServers": {
    "flint": {
      "command": "node",
      "args": ["<path-to-flint>/bin/flint-mcp-server.cjs"]
    }
  }
}
```

### Antigravity & Agent CLI

Flint tools are auto-discovered when the MCP server is configured in your agent workspace settings.

---

## 6. Available Core Tools

---

| Tool | Description |
|:---|:---|
| `flint_search_notes` | Full-text search across all notes |
| `flint_read_note` | Read a note's content and frontmatter |
| `flint_create_note` | Create a new markdown note |
| `flint_update_note` | Update a note's content |
| `flint_delete_note` | Delete a note to .trash/ |
| `flint_rename_note` | Rename a note |
| `flint_list_all_notes` | List all notes in the active Hearth |
| `flint_get_note_properties` | Get frontmatter properties |
| `flint_set_note_properties` | Set frontmatter properties |
| `flint_toggle_bookmark` | Toggle bookmark status |
| `flint_get_backlinks` | Get incoming backlinks and references |
| `flint_get_tags` | List all tags with counts |
| `flint_get_documents_by_tag` | Find documents by tag |
| `flint_list_hearths` | List all known Hearths (workspaces) |
| `flint_get_active_hearth` | Get name, path, and stats for the active Hearth |
| `flint_switch_hearth` | Switch the active Hearth workspace on the fly |
| `flint_create_hearth` | Create a new Hearth workspace |
| `flint_search_across_hearths` | Search for notes across all known Hearths |

---

## 7. Built-in MCP Prompts

---

Flint includes ready-to-use prompts to help AI models understand your notes and workflows right away:

| Prompt Name | Description | Arguments |
|:---|:---|:---|
| `flint_system_instructions` | Teaches the AI model about Flint's formatting, wikilink syntax, and flashcards | `mode?: "concise" \| "comprehensive"` |
| `flint_daily_review` | Pulls together today's journal entry, open tasks, and due flashcards for a morning or evening review | `date?: string` (YYYY-MM-DD) |
| `flint_synthesize_topic` | Collects relevant notes and backlinks on a subject to provide context for summaries or research | `topic: string` (required) |

---

## 8. Extension Tools & Custom Registration

---

When extensions are enabled, their custom tools become available automatically:

- `tasks_get_all`: Retrieve pending and completed tasks across the vault.
- `fsrs-spaced-repetition_get_due_cards`: Retrieve flashcards due for review.
- `canvas_get_board`: Retrieve canvas nodes and connection edges.
- `journal_open_today`: Open or create today's journal note.
- `flint-cascade_list`: List all sequential cascade books.

### Registering Tools in Extensions

Extensions register tools in their `onload()` method via the Flint SDK:

```typescript
// Inside Extension.onload()
this.registerTool({
  name: 'my_tool',
  description: 'Calculates custom metrics for a document',
  schema: z.object({
    documentId: z.string().describe('Target document ID'),
  }),
  handler: async ({ documentId }) => {
    return {
      content: [{ type: 'text', text: 'Result computed successfully' }],
    };
  },
});
```
