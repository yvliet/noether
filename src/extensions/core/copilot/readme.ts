export const copilotReadme = `
# Copilot For Flint

**Copilot For Flint** is a fast, unobtrusive, intelligent workspace copilot built specifically for Flint knowledge bases. It docks seamlessly into the right sidebar, offering instant assistance, note summarization, task extraction, and autonomous workspace access through Flint's built-in Model Context Protocol (MCP) tools.

---

## Key Features

- **Fast Right Sidebar Assistant**: Always available with zero distraction, perfectly matching Flint's native desktop aesthetics.
- **Dynamic Hugeicons Branding**: Automatically reflects your active AI engine in the sidebar tab icon, switching dynamically between Claude (\`ClaudeIcon\`), ChatGPT (\`ChatGptIcon\`), Gemini (\`GoogleGeminiIcon\`), DeepSeek (\`DeepseekIcon\`), and the master \`ArtificialIntelligence01Icon\`.
- **Bring Your Own Key (BYOK)**: Connect directly to your preferred provider with zero intermediary servers. Supports:
  - **Anthropic**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku
  - **OpenAI**: GPT-4o, GPT-4o Mini, o3-mini, o1, ChatGPT-4o Dynamic
  - **Google Gemini**: Gemini 2.0 Flash, Gemini 2.0 Flash Thinking, Gemini 2.0 Pro, Gemini 1.5 Pro
  - **DeepSeek**: DeepSeek-V3, DeepSeek-R1
  - **OpenRouter & Local**: Ollama, LM Studio, or any OpenAI-compatible API
- **Dynamic Live Model Discovery**: Automatically discovers all available models from provider APIs and custom endpoints with 1-click refresh and custom model ID support.
- **Direct Workspace MCP Tool Access**: Copilot autonomously calls Flint's native tools (\`flint_search_notes\`, \`flint_read_note\`, \`flint_get_backlinks\`, \`flint_create_note\`) to retrieve and verify factual knowledge from your vault.
- **Context Awareness**: 1-click toggle to include or exclude the currently active note in the editor as prompt context.
- **Quick Action Presets**: Instantly summarize notes, extract actionable todos, polish prose, and discover related notes with dedicated Hugeicon action chips.
- **Editor Actions**: 1-click copy, direct insertion into your active document, or instant creation of a new note in your vault.
- **Zero Micro-Interaction Lag**: Follows Flint's strict native desktop performance guidelines with instantaneous UI responsiveness.

---

## Getting Started

1. Open the **Copilot** tab in the right sidebar.
2. Choose your preferred AI provider (Anthropic, OpenAI, Google, DeepSeek, or OpenRouter).
3. Click the direct dashboard link to generate a personal API key.
4. Paste your key and click **Save & Connect**.

---

## MCP Tools Provided

Copilot For Flint also registers native MCP tools callable by other extensions and AI clients:
- \`copilot_chat\`: Prompt Copilot programmatically with query and system context.
- \`copilot_get_status\`: Retrieve active provider, model, and BYOK credential status.

---

*Authored with care by **Yuliet Li**.*
`;
