# AI Assistants & Model Context Protocol (MCP)

Flint is designed from the ground up to be **AI-Native**. It bridges the gap between local human thought and autonomous AI reasoning by implementing the open **Model Context Protocol (MCP)** specification.

Through a native stdio MCP server (`bin/flint-mcp-server.cjs`), external AI assistants (such as Claude Desktop, Google Antigravity, Cursor, and Gemini Code Assist) can search, read, write, and reason over your personal knowledge base without manual copy-pasting or cloud uploads.

```
[ External AI Assistants / Coding Agents ]
  Claude Desktop • Google Antigravity • Cursor • Gemini
  │
  │  JSON-RPC 2.0 over stdio (Model Context Protocol)
  ▼
[ Flint Native MCP Server ]
  bin/flint-mcp-server.cjs
  │
  │  Direct SQLite FTS5 Queries & Atomic File I/O
  ▼
[ Active Hearth Knowledge Base ]
  Markdown Notes (*.md) • flint.sqlite (WAL) • Tasks • FSRS Deck
```

---

## 1. Built-in MCP Tools Reference

Flint exposes **13 structured RPC tools** directly to connected AI agents:

| Tool Name | Scope | Capability |
| :--- | :--- | :--- |
| `flint_list_hearths` | Workspace | Discovers all known Hearths and their filesystem paths on the machine. |
| `flint_get_active_hearth` | Workspace | Retrieves the path, title, and configuration of the active workspace. |
| `flint_switch_hearth` | Workspace | Switches the active workspace context to a different Hearth folder. |
| `flint_search_notes` | Search | Queries notes using SQLite FTS5 with BM25 statistical relevance ranking. |
| `flint_search_across_hearths` | Search | Searches across every known vault on the computer in a single query. |
| `flint_read_note` | Document | Reads note text, parsing YAML frontmatter and raw CommonMark body. |
| `flint_create_note` | Document | Atomically creates a new Markdown note with frontmatter metadata. |
| `flint_update_note` | Document | Safely updates note content while preserving frontmatter properties. |
| `flint_delete_note` | Document | Moves a note to the `.trash/` folder (*destructive, requires confirmation*). |
| `flint_list_all_notes` | Document | Lists note titles, relative paths, tags, and timestamps. |
| `flint_get_backlinks` | Graph | Resolves incoming references, forward links, and unlinked mentions. |
| `tasks_get_all` | Tasks | Aggregates all open and completed `- [ ]` markdown tasks across the vault. |
| `fsrs-spaced-repetition_get_due_cards` | Study | Retrieves flashcards currently due for active recall review. |

---

## 2. Connecting Claude Desktop

To connect Claude Desktop to your Flint notes, edit your Claude Desktop configuration file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the `flint` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "flint": {
      "command": "node",
      "args": ["C:/absolute/path/to/flint/bin/flint-mcp-server.cjs"]
    }
  }
}
```
*(On macOS/Linux, use standard Unix paths like `"/Users/username/flint/bin/flint-mcp-server.cjs"`).*

Restart Claude Desktop. The hammer icon (🛠️) will appear in the chat prompt, confirming that Flint tools are loaded.

---

## 3. Connecting Google Antigravity & Agent Runtimes

In Antigravity or standard MCP client configurations:

```json
{
  "mcpServers": {
    "flint": {
      "command": "node",
      "args": ["<path-to-flint>/bin/flint-mcp-server.cjs"],
      "env": {}
    }
  }
}
```

Now you can prompt your AI:
> *"Search my Flint notes for our Q3 database migration plan, find open tasks, and summarize the key risks."*

The AI will call `flint_search_notes`, `tasks_get_all`, and `flint_get_backlinks` autonomously to produce a grounded response.

---

## 4. Connecting Cursor IDE

In Cursor:
1. Open **Cursor Settings** (`Ctrl+,`).
2. Navigate to **Features → MCP**.
3. Click **+ Add New MCP Server**.
4. Configure:
   - **Name**: `flint`
   - **Type**: `command`
   - **Command**: `node <path-to-flint>/bin/flint-mcp-server.cjs`

---

## 5. Built-in Flint Copilot (In-App AI Chat)

In addition to external MCP clients, Flint includes a pre-bundled showcase extension: **Copilot for Flint** (`flint-copilot`).

- **Multi-Provider BYOK**: Connect your own API key for Anthropic Claude, OpenAI, Google Gemini, Ollama (Local LLMs), Groq, DeepSeek, or OpenRouter.
- **Context-Aware Chat**: Automatically attaches the content of your currently active note to the chat conversation.
- **Sidebar Integration**: Dock the Copilot pane into the right sidebar or open it in a standalone tab.
- **In-App Tool Execution**: The Copilot extension runs tools natively against your Hearth to modify notes or generate flashcards upon command.
