# AI Assistants & MCP

Connect external AI assistants like Claude Desktop, Cursor, OpenAI Codex, Windsurf, Google Antigravity, or Roo Code directly to your local notes using the Model Context Protocol (MCP).

## 1. What is Model Context Protocol (MCP)?
---

Normally, an AI assistant running in your browser or terminal is completely blind to what is on your hard drive. If you want it to know about your notes, you have to copy-paste text back and forth, upload files to third-party cloud servers, or re-explain your project context from scratch every conversation.

The **Model Context Protocol (MCP)** changes this. Noether includes an embedded local MCP server that gives external AI assistants direct, tool-based access to your vault over standard input/output (`stdio`).

Instead of sending your entire vault to the cloud, your AI assistant simply calls fast local tools (like `noether_search_notes`, `graph_find_path`, or `noether_get_backlinks`) whenever it needs specific information to answer your questions.

## 2. How Local AI Reasoning Works
---

When an AI assistant connects to Noether:

- **100% Private & Local**: The AI communicates over local `stdio`. No notes or queries are ever sent to external Noether servers because Noether has no cloud servers.
- **On-Demand Precision**: The assistant does not ingest your whole disk. It searches indexed note titles, contents, and links on demand to pull only the specific notes and paragraphs relevant to your prompt.
- **Preference-Aware Formatting**: When an assistant creates or edits notes, Noether formats the output according to your active editor preferences (indentation width, bullet marker style, and callout casing).
- **Safety First**: File mutations are atomic, and any note deleted by an AI is moved to the `.trash/` folder rather than permanently removed.

## 3. Connect Your AI Assistant
---

Choose your preferred AI client below to view quick setup instructions:

<details open>
<summary><b>Claude Desktop & Claude Code CLI</b></summary>

Anthropic's [Claude Desktop](https://claude.ai/download) app and [Claude Code CLI](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview) natively support MCP tools.

**Claude Desktop Setup**:
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

**Claude Code CLI Setup**:
Run Claude Code with the Noether MCP server configuration flag:

```bash
claude mcp add noether node /path/to/noether/bin/noether-mcp-server.cjs
```

</details>

<details>
<summary><b>Cursor IDE</b></summary>

[Cursor](https://www.cursor.com) can query your notes directly during AI chat and agent composer workflows.

**Setup Steps**:
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
<summary><b>OpenAI Codex CLI</b></summary>

OpenAI's [Codex CLI](https://github.com/openai/codex) connects directly to Noether's MCP server for terminal pair programming workflows.

**Setup via CLI**:
```bash
codex mcp add noether --command node --args /path/to/noether/bin/noether-mcp-server.cjs
```

**Setup via Config File**:
Add the `noether` server block to your Codex configuration file (`~/.codex/config.toml`):

```toml
[mcp_servers.noether]
command = "node"
args = ["/path/to/noether/bin/noether-mcp-server.cjs"]
```

Restart or start a new Codex session to use note search, backlink queries, and task tools.

</details>

<details>
<summary><b>Windsurf IDE</b></summary>

Codeium's [Windsurf](https://codeium.com/windsurf) IDE supports MCP tools through Cascade.

**Setup Steps**:
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

**Setup Steps**:
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

**Setup Steps**:
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

**LibreChat Setup**:
In your `librechat.yaml` configuration file, add the Noether MCP endpoint:

```yaml
mcpServers:
  noether:
    type: stdio
    command: node
    args:
      - /path/to/noether/bin/noether-mcp-server.cjs
```

**Continue.dev Setup**:
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

**Setup Steps**:
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

**Test via Terminal**:
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

## 5. Built-in Tools Reference
---

Noether exposes native tools for discovering vaults, searching notes, reading frontmatter, creating notes, exploring backlinks, and running extensions.

> [!TIP]
> For the complete table of tools, parameters, and core extension tool endpoints, see [[MCP Tools Reference]]. To learn how to build your own tools in extensions, see [[Model Context Protocol (MCP) Runtime]] and [[Model Context Protocol (MCP) Tools]].
