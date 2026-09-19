# AI Assistants & Model Context Protocol (MCP)

Connect external AI assistants like Claude Desktop, Cursor, Windsurf, Google Antigravity, or Cline directly to your local notes using the Model Context Protocol (MCP).

## 1. What is Model Context Protocol (MCP)?
---

Normally, an AI assistant running in your browser or terminal is completely blind to what is on your hard drive. If you want it to know about your notes, you have to copy-paste text back and forth, upload files to third-party cloud servers, or re-explain your project context from scratch every conversation.

The **Model Context Protocol (MCP)** changes this. Noether includes an embedded local MCP server that gives external AI assistants direct, tool-based access to your vault over standard input/output (`stdio`).

Instead of sending your entire vault to the cloud, your AI assistant simply calls fast local tools (like `noether_search_notes`, `graph_find_path`, or `noether_get_backlinks`) whenever it needs specific information to answer your questions.

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
<summary><b>Claude Desktop & Claude Code CLI</b></summary>

Anthropic's Claude Desktop app and Claude Code CLI natively support MCP tools.

### Setup for Claude Desktop
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

3. Restart Claude Desktop. A **hammer icon** appears in the chat box showing all active Noether tools.

### Setup for Claude Code CLI
Run Claude Code with the Noether MCP server configuration flag:

```bash
claude mcp add noether node /path/to/noether/bin/noether-mcp-server.cjs
```

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
4. Alternatively, create a `.cursor/mcp.json` file in your workspace:

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

5. Click the refresh button in Cursor's MCP panel. The green indicator confirms Noether tools are active.

</details>

<details>
<summary><b>Windsurf IDE</b></summary>

Codeium's Windsurf IDE supports MCP tools through Cascade.

### Setup Instructions
1. Open your Windsurf MCP configuration file:
   - `~/.codeium/windsurf/mcp_config.json`
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
<summary><b>Cline & Roo Code (VS Code)</b></summary>

The Cline and Roo Code extensions for VS Code support full MCP integrations.

### Setup Instructions
1. Open the Cline / Roo Code panel in VS Code.
2. Click the **MCP Servers** icon in the header.
3. Click **Configure MCP Servers** (opens `cline_mcp_settings.json`).
4. Add the `noether` configuration:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": ["/path/to/noether/bin/noether-mcp-server.cjs"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

5. Save the configuration to activate all tools.

</details>

<details>
<summary><b>LibreChat & Continue.dev</b></summary>

### LibreChat Setup
In your `librechat.yaml` configuration file, add the Noether MCP endpoint:

```yaml
mcpServers:
  noether:
    type: stdio
    command: node
    args:
      - /path/to/noether/bin/noether-mcp-server.cjs
```

### Continue.dev Setup
In your `~/.continue/config.json` file, add the tool server:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "node",
          "args": ["/path/to/noether/bin/noether-mcp-server.cjs"]
        }
      }
    ]
  }
}
```

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
node bin/noether-mcp-server.cjs
```

The server listens on `stdin` and writes JSON-RPC 2.0 responses to `stdout`.

</details>

## 4. MCP Prompts Reference
---

Noether exposes structured prompts that guide connecting AI models in multi-step analysis and synthesis:

| Prompt Identifier | Parameters | Description |
| :--- | :--- | :--- |
| `noether_system_instructions` | `mode?: 'standard' \| 'concise' \| 'research'` | Emits domain protocol guidelines (Wikilinks, Flashcards, Tasks, Cascades) for connecting agents. |
| `noether_daily_review` | `date?: string` | Synthesizes daily journal entries, created notes, modified files, and open tasks for reflection. |
| `noether_synthesize_topic` | `topic: string`, `depth?: 'brief' \| 'detailed' \| 'exhaustive'` | Aggregates all notes, backlinks, and tags matching a topic for deep multi-document research synthesis. |

## 5. Built-in MCP Tools Reference
---

### Standalone Stdio Tools (`bin/noether-mcp-server.cjs`)

| Tool Identifier | Scope | Description |
| :--- | :--- | :--- |
| `noether_list_vaults` | Workspace | Discovers and returns all known vaults and paths. |
| `noether_get_active_vault` | Workspace | Retrieves path, document count, and active vault metadata. |
| `noether_switch_vault` | Workspace | Switches active vault workspace in config and hot-reloads custom tools. |
| `noether_search_notes` | Search | Fast text matching across all note titles and Markdown contents. |
| `noether_search_across_vaults` | Search | Multi-vault parallel full-text search. |
| `noether_read_note` | Notes | Reads note body and YAML frontmatter properties. |
| `noether_create_note` | Notes | Creates new note or updates existing note in place safely. |
| `noether_update_note` | Notes | Safely updates body Markdown while merging frontmatter properties. |
| `noether_delete_note` | Notes | Safely moves note file to `.trash/`. |
| `noether_list_all_notes` | Notes | Scans and lists all files and folders with metadata. |
| `tasks_get_all` | Tasks | Aggregates all open and completed `- [ ]` checklist items. |
| `fsrs-spaced-repetition_get_due_cards` | Study | Scans notes for flashcard patterns (`Concept :: Descriptor`, `{cloze}`). |
| `noether_get_backlinks` | Graph | Discovers incoming `[[wikilinks]]` referencing the target note. |
| `noether_run_script` | Automation | Executes ad-hoc JavaScript against `vault` API in a Node.js VM sandbox. |
| `noether_create_custom_tool` | Automation | Authors and saves custom tool module in `.noether/tools/<name>.js`. |
| `noether_list_custom_tools` | Automation | Lists custom tools stored in the active vault. |
| `noether_run_custom_tool` | Automation | Executes a custom tool by name with arguments. |
| `noether_delete_custom_tool` | Automation | Deletes custom tool file from `.noether/tools/`. |

### Core Extension In-App MCP Tools

When core extensions load inside Noether, they register domain-specific tools:

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
- **Freehand Sketch**: `sketch_get_document_drawings`, `sketch_export_svg`, `sketch_delete_drawings`
- **Database Sync**: `sync_sync_now`, `sync_get_sync_status`, `sync_test_connection`
- **Tags**: `tags_list_all`, `tags_get_tree`, `tags_get_documents_for_tag`
- **Tasks**: `tasks_get_all`, `tasks_get_by_document`, `tasks_toggle_status`

