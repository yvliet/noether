# AI Assistants & Model Context Protocol (MCP)

Connect external AI assistants like Claude Desktop, Cursor, Windsurf, or Google Antigravity directly to your local notes using the Model Context Protocol (MCP).

## 1. What is Model Context Protocol (MCP)?

---

Normally, an AI assistant running in your browser or terminal is completely blind to what is on your hard drive. If you want it to know about your notes, you have to copy-paste text back and forth, upload files to third-party cloud servers, or re-explain your project context from scratch every conversation.

The **Model Context Protocol (MCP)** changes this. Noether includes an embedded local MCP server that gives external AI assistants direct, tool-based access to your vault over standard input/output (`stdio`).

Instead of sending your entire vault to the cloud, your AI assistant simply calls fast local tools (like `noether_search_notes` or `noether_get_backlinks`) whenever it needs specific information to answer your questions.

## 2. How Local AI Reasoning Works

---

When an AI assistant connects to Noether:

- **100% Private & Local**: The AI communicates over local `stdio`. No notes or queries are ever sent to external Noether servers because Noether has no cloud servers.
- **On-Demand Precision**: The assistant does not ingest your whole disk. It runs targeted SQLite queries (FTS5 BM25 search and indexed link lookups) to pull only the exact paragraphs relevant to your prompt.
- **Preference-Aware Formatting**: When an assistant creates or edits notes, Noether formats the output according to your active editor preferences (indentation width, bullet marker style, and callout casing).
- **Safety First**: File mutations are atomic, and any note deleted by an AI is moved to the `.trash/` folder rather than permanently removed.

## 3. Connect Your AI Assistant

---

Choose your preferred AI client below to view quick setup instructions:

<details open>
<summary><b>Claude Desktop & Claude Code</b></summary>

Anthropic's Claude Desktop app and Claude Code CLI natively support MCP tools.

### Setup Instructions

1. Open your Claude Desktop configuration file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Add the `noether` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": [
        "C:\\path\\to\\noether\\bin\\noether-mcp-server.cjs"
      ]
    }
  }
}
```

3. Restart Claude Desktop. A **hammer icon** appears in the chat box showing all 18 active Noether tools.

</details>

<details>
<summary><b>Cursor IDE</b></summary>

Cursor can query your notes directly during AI chat and agent composer workflows.

### Setup Instructions

1. Open **Cursor Settings → Features → MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in the server details:
   - **Name**: `noether`
   - **Type**: `command`
   - **Command**: `node /path/to/noether/bin/noether-mcp-server.cjs`
4. Alternatively, create a `.cursor/mcp.json` file in your project workspace:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": ["/path/to/noether/bin/noether-mcp-server.cjs"]
    }
  }
}
```

5. Click the refresh button in Cursor's MCP panel. The green status light indicates Noether tools are active.

</details>

<details>
<summary><b>Windsurf IDE</b></summary>

Codeium's Windsurf IDE supports MCP tools through Cascade.

### Setup Instructions

1. Open your Windsurf MCP configuration file:
   - **Windows / macOS / Linux**: `~/.codeium/windsurf/mcp_config.json`
2. Add the `noether` server entry:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": ["/path/to/noether/bin/noether-mcp-server.cjs"]
    }
  }
}
```

3. Save the file and reload Windsurf. Cascade can now search and write notes in your vault.

</details>

<details>
<summary><b>Google Antigravity</b></summary>

Google Antigravity connects directly to Noether via stdio MCP.

### Setup Instructions

1. Open Antigravity settings or edit your workspace `mcp.json`.
2. Add the `noether` tool server:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": ["/path/to/noether/bin/noether-mcp-server.cjs"]
    }
  }
}
```

3. Antigravity discovers all note tools, backlink queries, and task aggregators automatically.

</details>

<details>
<summary><b>Zed Editor</b></summary>

Zed supports Model Context Protocol servers natively via `context_servers`.

### Setup Instructions

1. Open Zed's `settings.json` (`Ctrl+,` or `Cmd+,`).
2. Add the Noether context server configuration:

```json
{
  "context_servers": {
    "noether": {
      "command": {
        "path": "node",
        "args": ["/path/to/noether/bin/noether-mcp-server.cjs"]
      }
    }
  }
}
```

3. In the Zed Assistant panel, type `/noether` to query your vault context.

</details>

<details>
<summary><b>Custom Node.js & CLI Scripts</b></summary>

You can test and call the MCP server directly from the command line or custom automation scripts.

### Test via Terminal

```bash
# Run the stdio MCP server directly
node bin/noether-mcp-server.cjs
```

The server listens on `stdin` and writes JSON-RPC 2.0 responses to `stdout`.

</details>

## 4. Built-in MCP Tools Reference

---

Noether exposes 18 tools for AI assistants:

| Tool Name | Scope | What It Does |
| :--- | :--- | :--- |
| `noether_list_vaults` | Workspace | Discovers all known vaults and their folder paths on your machine. |
| `noether_get_active_vault` | Workspace | Retrieves the path, title, and settings of the active vault. |
| `noether_switch_vault` | Workspace | Switches the active workspace context to a different vault folder. |
| `noether_search_notes` | Search | Searches notes using SQLite FTS5 full-text search with relevance ranking. |
| `noether_search_across_vaults` | Search | Searches across all known vaults in a single query. |
| `noether_read_note` | Notes | Reads note content, returning YAML frontmatter and Markdown body. |
| `noether_create_note` | Notes | Creates a new Markdown note formatted to your editor preferences. |
| `noether_update_note` | Notes | Safely updates note text while preserving existing frontmatter. |
| `noether_delete_note` | Notes | Moves a note to the `.trash/` folder. |
| `noether_list_all_notes` | Notes | Lists all note titles, relative paths, tags, and timestamps. |
| `noether_get_backlinks` | Graph | Returns incoming links, forward links, and unlinked mentions. |
| `tasks_get_all` | Tasks | Aggregates all open and completed `- [ ]` checklist items across the vault. |
| `fsrs-spaced-repetition_get_due_cards` | Study | Retrieves flashcards currently due for active recall review. |
| `noether_run_script` | Automation | Runs ad-hoc JavaScript scripts against the vault in a single round-trip. |
| `noether_create_custom_tool` | Automation | Authors and saves a new custom MCP tool into `.noether/tools/<name>.js`. |
| `noether_list_custom_tools` | Automation | Lists all custom MCP tools stored in the active vault. |
| `noether_run_custom_tool` | Automation | Runs a custom tool by name with arguments. |
| `noether_delete_custom_tool` | Automation | Removes a custom MCP tool from the active vault. |

> [!TIP]
> You can ask your AI assistant to *"search my research notes for quantum mechanics and summarize the key formulas"*, or *"find all open high-priority tasks across my vault"*, and it will execute the appropriate MCP tool automatically.
