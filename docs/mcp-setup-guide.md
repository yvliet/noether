# Noether MCP Setup Guide

How to connect AI assistants like Claude Desktop, Cursor, and Antigravity directly to your Noether notes and tasks.

---

## 1. What is MCP?

---

Model Context Protocol (MCP) is an open standard that allows AI agents to discover and call tools exposed by applications. Noether implements a native MCP tool registry that lets AI assistants interact directly with your notes, tasks, flashcards, graph, and more.

---

## 2. Architecture & Tool Scopes

---

Noether exposes tools at two levels:

1. **Native Core Tools** (`noether_*`): Always available to search, read, create, update, delete notes, manage properties, bookmarks, tags, and backlinks.
2. **Extension Tools** (`{extensionId}_*`): Available when the extension is enabled (tasks, flashcards, canvas, journal, cascade, etc.). Disabling an extension removes its tools automatically.

---

## 3. In-App Agent Usage

---

If you are writing an extension or internal feature, you can call tools directly in-process:

```typescript
import { appInstance } from 'noether';

// List all available tools
const tools = appInstance.tools.getAllTools();
console.log(tools.map(t => t.name));

// Execute a tool
const result = await appInstance.tools.executeTool('noether_search_notes', { query: 'meeting notes' });
console.log(result.content);

// Get MCP-formatted schemas for LLM function calling
const schemas = appInstance.tools.getMcpToolSchemas();
```

---

## 4. Automatic Vault Discovery

---

Noether discovers all your Vaults automatically without requiring you to hardcode folder paths in your AI client settings.

When an AI agent connects to Noether:
1. It automatically attaches to the currently active Vault.
2. It can call `noether_list_vaults` to discover all other known Vaults on your computer.
3. It can switch workspaces via `noether_switch_vault` without restarting the connection.
4. It can search across all workspaces via `noether_search_across_vaults`.

---

## 5. External Agent Setup (Claude Desktop / Cursor / Antigravity)

---

Because Noether finds your active vault on its own, connecting external assistants only requires pointing them to the Noether MCP server script:

### Claude Desktop

Add Noether to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": ["<path-to-noether>/bin/noether-mcp-server.cjs"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project or home directory:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": ["<path-to-noether>/bin/noether-mcp-server.cjs"]
    }
  }
}
```

### Antigravity & Agent CLI

Noether tools are auto-discovered when the MCP server is configured in your agent workspace settings.

---

## 6. Available Core Tools

---

| Tool | Description |
|:---|:---|
| `noether_search_notes` | Full-text search across all notes |
| `noether_read_note` | Read a note's content and frontmatter |
| `noether_create_note` | Create a new markdown note |
| `noether_update_note` | Update a note's content |
| `noether_delete_note` | Delete a note to .trash/ |
| `noether_rename_note` | Rename a note |
| `noether_list_all_notes` | List all notes in the active Vault |
| `noether_get_note_properties` | Get frontmatter properties |
| `noether_set_note_properties` | Set frontmatter properties |
| `noether_toggle_bookmark` | Toggle bookmark status |
| `noether_get_backlinks` | Get incoming backlinks and references |
| `noether_get_tags` | List all tags with counts |
| `noether_get_documents_by_tag` | Find documents by tag |
| `noether_list_vaults` | List all known Vaults (workspaces) |
| `noether_get_active_vault` | Get name, path, and stats for the active Vault |
| `noether_switch_vault` | Switch the active Vault workspace on the fly |
| `noether_create_vault` | Create a new Vault workspace |
| `noether_search_across_vaults` | Search for notes across all known Vaults |

---

## 7. Built-in MCP Prompts

---

Noether includes ready-to-use prompts to help AI models understand your notes and workflows right away:

| Prompt Name | Description | Arguments |
|:---|:---|:---|
| `noether_system_instructions` | Teaches the AI model about Noether's formatting, wikilink syntax, and flashcards | `mode?: "concise" \| "comprehensive"` |
| `noether_daily_review` | Pulls together today's journal entry, open tasks, and due flashcards for a morning or evening review | `date?: string` (YYYY-MM-DD) |
| `noether_synthesize_topic` | Collects relevant notes and backlinks on a subject to provide context for summaries or research | `topic: string` (required) |

---

## 8. Extension Tools & Custom Registration

---

When extensions are enabled, their custom tools become available automatically:

- `tasks_get_all`: Retrieve pending and completed tasks across the vault.
- `fsrs-spaced-repetition_get_due_cards`: Retrieve flashcards due for review.
- `canvas_get_board`: Retrieve canvas nodes and connection edges.
- `journal_open_today`: Open or create today's journal note.
- `noether-cascade_list`: List all sequential cascade books.

### Registering Tools in Extensions

Extensions register tools in their `onload()` method via the Noether SDK:

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
