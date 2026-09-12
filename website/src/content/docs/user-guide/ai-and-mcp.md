# AI Assistants & Model Context Protocol (MCP)

Noether is designed from the ground up to be **AI-Native**. It bridges the gap between local human thought and autonomous AI reasoning by implementing the open **Model Context Protocol (MCP)** specification.

Through a native stdio MCP server (`bin/noether-mcp-server.cjs`), external AI assistants (such as Claude Desktop, Google Antigravity, Cursor, and Gemini Code Assist) can search, read, write, and reason over your personal knowledge base without manual copy-pasting or cloud uploads.

```
[ External AI Assistants / Coding Agents ]
  Claude Desktop • Google Antigravity • Cursor • Gemini
  │
  │  JSON-RPC 2.0 over stdio (Model Context Protocol)
  ▼
[ Noether Native MCP Server ]
  bin/noether-mcp-server.cjs
  │
  │  Direct SQLite FTS5 Queries & Atomic File I/O
  ▼
[ Active Vault Knowledge Base ]
  Markdown Notes (*.md) • noether.sqlite (WAL) • Tasks • FSRS Deck
```

## 1. Built-in MCP Tools Reference

---

Noether exposes **18 structured RPC tools** directly to connected AI agents:

| Tool Name | Scope | Capability |
| :--- | :--- | :--- |
| `noether_list_vaults` | Workspace | Discovers all known Vaults and their filesystem paths on the machine. |
| `noether_get_active_vault` | Workspace | Retrieves the path, title, and configuration of the active workspace. |
| `noether_switch_vault` | Workspace | Switches the active workspace context to a different Vault folder. |
| `noether_search_notes` | Search | Queries notes using SQLite FTS5 with BM25 statistical relevance ranking. |
| `noether_search_across_vaults` | Search | Searches across every known vault on the computer in a single query. |
| `noether_read_note` | Document | Reads note text, parsing YAML frontmatter and raw CommonMark body. |
| `noether_create_note` | Document | Atomically creates a new Markdown note with frontmatter metadata. |
| `noether_update_note` | Document | Safely updates note content while preserving frontmatter properties. |
| `noether_delete_note` | Document | Moves a note to the `.trash/` folder (*destructive, requires confirmation*). |
| `noether_list_all_notes` | Document | Lists note titles, relative paths, tags, and timestamps. |
| `noether_get_backlinks` | Graph | Resolves incoming references, forward links, and unlinked mentions. |
| `tasks_get_all` | Tasks | Aggregates all open and completed `- [ ]` markdown tasks across the vault. |
| `fsrs-spaced-repetition_get_due_cards` | Study | Retrieves flashcards currently due for active recall review. |
| `noether_run_script` | Automation | Executes ad-hoc JavaScript/Node.js scripts against the active Vault in a single round-trip. |
| `noether_create_custom_tool` | Automation | Authors and persists a new custom MCP tool into `.noether/tools/<name>.js`. |
| `noether_list_custom_tools` | Automation | Lists all custom MCP tools stored in the active Vault with load status. |
| `noether_run_custom_tool` | Automation | Executes a custom tool by name with arguments without waiting for cache refresh. |
| `noether_delete_custom_tool` | Automation | Deletes and unregisters a custom MCP tool from the active Vault. |


## 2. Connecting Claude Desktop

---

To connect Claude Desktop to your Noether notes, edit your Claude Desktop configuration file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the `noether` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": ["C:/absolute/path/to/noether/bin/noether-mcp-server.cjs"]
    }
  }
}
```
*(On macOS/Linux, use standard Unix paths like `"/Users/username/noether/bin/noether-mcp-server.cjs"`).*

Restart Claude Desktop. The hammer icon (🛠️) will appear in the chat prompt, confirming that Noether tools are loaded.


## 3. Connecting Google Antigravity & Agent Runtimes

---

In Antigravity or standard MCP client configurations:

```json
{
  "mcpServers": {
    "noether": {
      "command": "node",
      "args": ["<path-to-noether>/bin/noether-mcp-server.cjs"],
      "env": {}
    }
  }
}
```

Now you can prompt your AI:
> *"Search my Noether notes for our Q3 database migration plan, find open tasks, and summarize the key risks."*

The AI will call `noether_search_notes`, `tasks_get_all`, and `noether_get_backlinks` autonomously to produce a grounded response.


## 4. Connecting Cursor IDE

---

In Cursor:
1. Open **Cursor Settings** (`Ctrl+,`).
2. Navigate to **Features → MCP**.
3. Click **+ Add New MCP Server**.
4. Configure:
   - **Name**: `noether`
   - **Type**: `command`
   - **Command**: `node <path-to-noether>/bin/noether-mcp-server.cjs`


## 5. Dynamic Script Execution & Custom Agent Tools

---

When external AI assistants or autonomous agents encounter bespoke tasks, they can dynamically extend Noether's tool surface without waiting for host application releases or writing manual extensions:

- **Ad-Hoc Scripting (`noether_run_script`)**: Agents execute sandboxed Node.js scripts directly against the active Vault. The script receives an active `vault` interface, standard path helpers, and a clean logging buffer, returning calculated insights or performing batch updates in a single round-trip.
- **Custom Tool Authoring (`noether_create_custom_tool`)**: Agents can turn a validated workflow into a permanent MCP tool saved inside `.noether/tools/<name>.js`. The tool is automatically discovered, verified, added to `tools/list`, and broadcast to connected MCP clients via `notifications/tools/list_changed`.
- **Universal Tool Runner (`noether_run_custom_tool`)**: Execute authored custom tools immediately without waiting for IDE cache refreshes.
- **Tool Lifecycle (`noether_list_custom_tools`, `noether_delete_custom_tool`)**: Inspect tool parameters and operational status or delete obsolete custom tools.


## 6. Built-in Noether Copilot (In-App AI Chat)

---

In addition to external MCP clients, Noether includes a pre-bundled showcase extension: **Copilot for Noether** (`noether-copilot`).

- **Multi-Provider BYOK**: Connect your own API key for Anthropic Claude, OpenAI, Google Gemini, Ollama (Local LLMs), Groq, DeepSeek, or OpenRouter.
- **Context-Aware Chat**: Automatically attaches the content of your currently active note to the chat conversation.
- **Sidebar Integration**: Dock the Copilot pane into the right sidebar or open it in a standalone tab.
- **In-App Tool Execution**: The Copilot extension runs tools natively against your Vault to modify notes or generate flashcards upon command.
