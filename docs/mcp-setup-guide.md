# Flint MCP Setup Guide

## What is MCP?

Model Context Protocol (MCP) is an open standard that allows AI agents to discover and call tools exposed by applications. Flint implements a native MCP tool registry that lets AI agents interact with your notes, tasks, flashcards, graph, and more.

## Architecture

Flint exposes tools at two levels:

1. **Native Core Tools** (`flint_*`): Always available to search, read, create, update, delete notes, manage properties, bookmarks, tags, and backlinks.
2. **Extension Tools** (`{extensionId}_*`): Available when the extension is enabled (tasks, flashcards, canvas, journal, cascade, etc.). Disabling an extension removes its tools.

## In-App Agent Usage (Phase 1)

Tools are available in-process with zero serialization overhead:

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

## Multi-Hearth Architecture (Zero-Config Connection)

Flint automatically auto-discovers **all your Hearths** (workspaces) without requiring users to configure explicit file paths in their agent settings!

When an AI agent connects to Flint:
1. It automatically attaches to the currently active Hearth.
2. It can call `flint_list_hearths` to discover all other known/recent Hearths.
3. It can seamlessly switch workspaces via `flint_switch_hearth` without restarting the connection.
4. It can perform cross-workspace searches via `flint_search_across_hearths`.

## External Agent Setup (Phase 2: Stdio/SSE Transport)

Because Flint auto-discovers your Hearths, you can connect external agents with **zero configuration flags**:

### Claude Desktop

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
*(No `--vault` or path arguments required! Flint connects to your active workspace and discovers all recent Hearths automatically.)*

### Cursor

Add to `.cursor/mcp.json` in your project or home directory:

```json
{
  "mcpServers": {
    "flint": {
      "command": "flint-mcp-server"
    }
  }
}
```

### Antigravity / Agent CLI

Flint tools are auto-discovered when the MCP server is running.

## Available Core Tools

| Tool | Description |
|:---|:---|
| `flint_search_notes` | Full-text search across all notes |
| `flint_read_note` | Read a note's content and properties |
| `flint_create_note` | Create a new markdown note |
| `flint_update_note` | Update a note's content |
| `flint_delete_note` | Delete a note |
| `flint_rename_note` | Rename a note |
| `flint_list_all_notes` | List all documents |
| `flint_get_note_properties` | Get frontmatter properties |
| `flint_set_note_properties` | Set frontmatter properties |
| `flint_toggle_bookmark` | Toggle bookmark status |
| `flint_get_backlinks` | Get incoming backlinks |
| `flint_get_tags` | List all tags with counts |
| `flint_get_documents_by_tag` | Find documents by tag |
| `flint_list_hearths` | List all known Hearths (workspaces) and active status |
| `flint_get_active_hearth` | Get name, path, and stats for the active Hearth |
| `flint_switch_hearth` | Switch the active Hearth workspace on the fly |
| `flint_create_hearth` | Create a new Hearth workspace |
| `flint_search_across_hearths` | Search for notes across all known Hearths |

## Native MCP Prompts (`prompts/list` & `prompts/get`)

Flint exposes built-in MCP prompts that external clients (Claude Desktop, Cursor, Antigravity) and in-app agents can evaluate dynamically:

| Prompt Name | Description | Arguments |
|:---|:---|:---|
| `flint_system_instructions` | Complete domain manual teaching the AI Flint's mental model, Wikilink rules, FSRS syntax, and tool-chaining recipes | `mode?: "concise" \| "comprehensive"` |
| `flint_daily_review` | Gathers today's journal note, pending tasks, due flashcards, and workspace stats for daily synthesis | `date?: string` (YYYY-MM-DD) |
| `flint_synthesize_topic` | Searches matching notes and backlinks to generate a structured synthesis context for any topic | `topic: string` (required) |

## Extension Tool Examples

When extensions are enabled, their tools are also available:

- `tasks_get_all`: Get pending/completed tasks across vault
- `fsrs-spaced-repetition_get_due_cards`: Get flashcards due for review
- `canvas_get_board`: Get canvas nodes and edges
- `journal_open_today`: Open or create today's journal note
- `flint-cascade_list`: List all cascade books

## Writing Extension Tools & Prompts

See the [Extension SDK documentation](../src/sdk/index.ts) for `McpToolDefinition` and `McpPromptDefinition` types. Every extension can register tools and prompts in its `onload()` method:

```typescript
// Inside Extension.onload()
this.registerTool({
  name: 'my_tool',
  description: '...',
  parameters: { type: 'object', properties: {} },
  handler: async (args, app) => ({ content: [{ type: 'text', text: 'result' }] }),
});

this.registerPrompt({
  name: 'my_workflow_prompt',
  description: '...',
  arguments: [{ name: 'query', required: true }],
  getMessages: async ({ query }, app) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `Context: ${query}` } }],
  }),
});
```
