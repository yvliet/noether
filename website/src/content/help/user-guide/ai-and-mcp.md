# AI Assistants & Model Context Protocol (MCP)

Connect external AI tools like Claude Desktop, Cursor, or Antigravity directly to your local notes using the Model Context Protocol (MCP).

## 1. Overview
---

Noether includes a built-in stdio MCP server (`bin/noether-mcp-server.cjs`). With MCP, AI assistants can search your notes, read relevant context, create drafts, and query tasks without uploading your entire vault to third-party cloud servers.

## 2. Connect Claude Desktop
---

To connect Claude Desktop to your Noether vault, open your Claude configuration file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the `noether` server entry under `mcpServers`:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": [
        "/path/to/noether/bin/noether-mcp-server.cjs"
      ]
    }
  }
}
```

Restart Claude Desktop. A hammer icon appears showing all active Noether tools.

## 3. Connect Cursor or Other Agents
---

In Cursor or Antigravity, add an MCP server in settings:

- **Type**: `command` (stdio)
- **Command**: `node /path/to/noether/bin/noether-mcp-server.cjs`

## 4. Built-in MCP Tools Reference
---

| Tool Name | What It Does |
| :--- | :--- |
| `noether_list_vaults` | Discovers all known vaults and their folder paths. |
| `noether_get_active_vault` | Retrieves the path and settings of the active vault. |
| `noether_switch_vault` | Switches the active workspace context to a different vault folder. |
| `noether_search_notes` | Searches notes using SQLite FTS5 full-text search with relevance ranking. |
| `noether_read_note` | Reads a note, returning both YAML frontmatter and Markdown body. |
| `noether_create_note` | Creates a new Markdown note formatted to your editor preferences. |
| `noether_update_note` | Safely updates note content while preserving existing frontmatter. |
| `noether_delete_note` | Moves a note to the `.trash/` folder. |
| `noether_list_all_notes` | Lists all note titles, relative paths, tags, and timestamps. |
| `noether_get_backlinks` | Returns incoming links, outgoing links, and unlinked mentions. |
| `tasks_get_all` | Aggregates all open and completed `- [ ]` checklist items across the vault. |

> [!TIP]
> Notes created by MCP AI agents automatically follow your editor preferences (such as 2 or 4 space indentation, list renumbering, and callout formatting).
