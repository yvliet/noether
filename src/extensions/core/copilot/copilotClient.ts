/**
 * @module CopilotClient
 * @description
 * Resilient, multi-protocol LLM client and autonomous MCP tool execution loop for Copilot For Flint.
 * Supports standard Server-Sent Events (SSE) streaming and native function calling across:
 * - OpenAI Chat Completions (OpenAI, DeepSeek, Gemini OpenAI endpoint, OpenRouter, Local Ollama)
 * - Anthropic Messages API (Claude 3.5 Haiku, Claude 3.7 Sonnet)
 *
 * Automatically inspects Flint's native ToolRegistry (app.tools) and bridges workspace tools
 * (document retrieval, full-text search, backlinks, tag management, note manipulation)
 * directly into the model's function calling context.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import type { FlintApp } from '@/core/app/FlintApp';
import type { McpToolDefinition } from '@/core/extensions/types';
import {
  useCopilotStore,
  CopilotProvider,
  CopilotMessage,
  PROVIDER_CATALOG,
  ToolExecutionDetail,
} from './copilotStore';
import { pickSessionIconInBackground } from './copilotSessionHelper';

export interface StreamDeltaCallback {
  onDeltaText: (text: string) => void;
  onToolCallStart?: (tool: { id: string; name: string; args: Record<string, unknown> }) => void;
  onToolCallComplete?: (toolId: string, resultText: string, isError?: boolean) => void;
  onMetricsUpdate?: (metrics: {
    elapsedTimeMs: number;
    toolsExecutedCount: number;
    filesReadCount: number;
    filesEditedCount: number;
  }) => void;
}

export interface RunCopilotOptions extends StreamDeltaCallback {
  /** Optional message history override (defaults to active store messages) */
  history?: CopilotMessage[];
  /** Optional context override (e.g. selected text or specific document text) */
  contextOverride?: string | null;
  /** Optional system prompt override */
  systemPromptOverride?: string;
  /** Optional abort signal to cancel execution */
  signal?: AbortSignal;
}

/**
 * Converts Flint's McpToolDefinition array into OpenAI Function Calling format.
 */
function toOpenAiTools(tools: readonly McpToolDefinition[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters || { type: 'object', properties: {} },
    },
  }));
}

/**
 * Converts Flint's McpToolDefinition array into Anthropic Tool format.
 */
function toAnthropicTools(tools: readonly McpToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters || { type: 'object', properties: {} },
  }));
}

/**
 * Resolves the active document's plain text content from Flint for prompt injection.
 */
export function getActiveDocumentContext(app: FlintApp): string | null {
  try {
    const doc = app.vault.activeDocument;
    if (!doc || !doc.title) return null;

    let textContent = '';
    if (doc.content_json) {
      if (typeof doc.content_json === 'string') {
        try {
          const parsed = JSON.parse(doc.content_json);
          textContent = extractTextFromTipTap(parsed);
        } catch {
          textContent = doc.content_json;
        }
      } else {
        textContent = extractTextFromTipTap(doc.content_json);
      }
    }

    // Limit context preview to 15,000 characters to prevent overwhelming the context window
    const truncated = textContent.length > 15000 ? textContent.slice(0, 15000) + '\n...[Content truncated for length]' : textContent;

    return `Active Note Title: "${doc.title}"\nActive Note Content:\n\`\`\`markdown\n${truncated}\n\`\`\``;
  } catch (err) {
    console.warn('[CopilotClient] Failed to extract active document context:', err);
    return null;
  }
}

/**
 * Fast recursive helper to extract plaintext from TipTap JSON structure.
 */
function extractTextFromTipTap(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;

  let out = '';
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      out += extractTextFromTipTap(child);
      if (child.type === 'paragraph' || child.type === 'heading') {
        out += '\n';
      }
    }
  }
  return out;
}

/**
 * Sends a chat query to the configured BYOK provider and streams the response.
 * Handles multi-round autonomous MCP tool execution if the model requests function calling.
 */
export async function runCopilotTurn(
  app: FlintApp,
  userPrompt: string,
  callbacksOrOptions: StreamDeltaCallback | RunCopilotOptions
): Promise<string> {
  const store = useCopilotStore.getState();
  const provider = store.provider;
  const options = callbacksOrOptions as RunCopilotOptions;

  // 1. Validation check
  if (!provider) {
    throw new Error('Please select an AI model provider in Copilot Settings before starting.');
  }

  const apiKey = store.apiKeys[provider] || '';
  const model = store.models[provider] || PROVIDER_CATALOG[provider].defaultModel;
  const customEndpoint = store.customEndpoint;
  const systemPrompt = options.systemPromptOverride || store.systemPrompt;
  const includeContext = store.includeActiveNoteContext;
  const temperature = store.temperature;
  const maxTokens = store.maxTokens;

  if (!apiKey && provider !== 'custom') {
    throw new Error(`Please configure your API key for ${PROVIDER_CATALOG[provider].brandLabel} in Copilot Settings.`);
  }

  // 2. Abort controller initialization
  const abortController = new AbortController();
  store.setAbortController(abortController);
  store.setIsGenerating(true);

  if (options.signal) {
    if (options.signal.aborted) {
      abortController.abort();
    } else {
      options.signal.addEventListener('abort', () => abortController.abort(), { once: true });
    }
  }

  // 3. Assemble Context (with explicit override support)
  let contextualSystemPrompt = systemPrompt;
  if (options.contextOverride !== undefined) {
    if (options.contextOverride) {
      contextualSystemPrompt += `\n\n=== CONTEXT ===\n${options.contextOverride}\n=== END CONTEXT ===`;
    }
  } else if (includeContext) {
    const docContext = getActiveDocumentContext(app);
    if (docContext) {
      contextualSystemPrompt += `\n\n=== CONTEXT: CURRENTLY OPEN NOTE ===\n${docContext}\n=== END CONTEXT ===`;
    }
  }

  const messageHistory = options.history || store.messages;

  const startTime = Date.now();
  let toolsExecutedCount = 0;
  let filesReadCount = 0;
  let filesEditedCount = 0;

  // 4. Retrieve registered MCP tools from Flint
  const enableTools = store.enableMcpTools && store.toolMode !== 'chat_only';
  const mcpTools = enableTools ? app.tools.getAllTools() : [];

  const wrappedCallbacks: StreamDeltaCallback = {
    onDeltaText: options.onDeltaText,
    onToolCallStart: (tool) => {
      if (
        tool.name.includes('read') ||
        tool.name.includes('search') ||
        tool.name.includes('backlinks') ||
        tool.name.includes('list')
      ) {
        filesReadCount++;
      }
      if (
        tool.name.includes('create') ||
        tool.name.includes('update') ||
        tool.name.includes('delete')
      ) {
        filesEditedCount++;
      }
      options.onToolCallStart?.(tool);
    },
    onToolCallComplete: (toolId, resultText, isError) => {
      toolsExecutedCount++;
      options.onToolCallComplete?.(toolId, resultText, isError);
      options.onMetricsUpdate?.({
        elapsedTimeMs: Date.now() - startTime,
        toolsExecutedCount,
        filesReadCount,
        filesEditedCount,
      });
    },
    onMetricsUpdate: options.onMetricsUpdate,
  };

  try {
    let result = '';
    if (provider === 'anthropic') {
      result = await executeAnthropicLoop(
        app,
        apiKey,
        model,
        contextualSystemPrompt,
        messageHistory,
        userPrompt,
        mcpTools,
        temperature,
        maxTokens,
        abortController.signal,
        wrappedCallbacks
      );
    } else {
      result = await executeOpenAiCompatibleLoop(
        app,
        provider,
        apiKey,
        model,
        customEndpoint,
        contextualSystemPrompt,
        messageHistory,
        userPrompt,
        mcpTools,
        temperature,
        maxTokens,
        abortController.signal,
        wrappedCallbacks
      );
    }

    options.onMetricsUpdate?.({
      elapsedTimeMs: Date.now() - startTime,
      toolsExecutedCount,
      filesReadCount,
      filesEditedCount,
    });

    return result;
  } finally {
    store.setIsGenerating(false);
    store.setAbortController(null);
  }
}

// ─────────────────────────────────────────────────────────────
// OpenAI-Compatible Streaming & Autonomous Tool Loop
// ─────────────────────────────────────────────────────────────

async function executeOpenAiCompatibleLoop(
  app: FlintApp,
  provider: CopilotProvider,
  apiKey: string,
  model: string,
  customEndpoint: string,
  systemPrompt: string,
  history: CopilotMessage[],
  newPrompt: string,
  mcpTools: readonly McpToolDefinition[],
  temperature: number,
  maxTokens: number,
  signal: AbortSignal,
  callbacks: StreamDeltaCallback,
  depth = 0
): Promise<string> {
  if (depth > 5) {
    return 'Tool execution limit reached.';
  }

  let endpointUrl = '';
  switch (provider) {
    case 'openai':
      endpointUrl = 'https://api.openai.com/v1/chat/completions';
      break;
    case 'gemini':
      endpointUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      break;
    case 'deepseek':
      endpointUrl = 'https://api.deepseek.com/chat/completions';
      break;
    case 'openrouter':
      endpointUrl = 'https://openrouter.ai/api/v1/chat/completions';
      break;
    case 'custom':
      endpointUrl = `${customEndpoint.replace(/\/+$/, '')}/chat/completions`;
      break;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://flint.app';
    headers['X-Title'] = 'Copilot for Flint';
  }

  // Format messages
  const formattedMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add past conversation context (last 10 messages)
  const recentHistory = history.slice(-10);
  for (const m of recentHistory) {
    if (m.content) {
      formattedMessages.push({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      });
    }
  }

  const lastAdded = formattedMessages[formattedMessages.length - 1];
  const alreadyIncluded =
    lastAdded &&
    lastAdded.role === 'user' &&
    lastAdded.content.trim() === newPrompt.trim();

  if (newPrompt && !alreadyIncluded) {
    formattedMessages.push({ role: 'user', content: newPrompt });
  }

  const payload: Record<string, unknown> = {
    model,
    messages: formattedMessages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  if (mcpTools.length > 0) {
    payload.tools = toOpenAiTools(mcpTools);
    payload.tool_choice = 'auto';
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = errorText;
    try {
      const errObj = JSON.parse(errorText);
      parsedMessage = errObj.error?.message || errorText;
    } catch {}
    throw new Error(`API error (${response.status}): ${parsedMessage}`);
  }

  if (!response.body) {
    throw new Error('No response stream received from provider.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let lineBuffer = '';

  // Tool calls accumulation state
  const pendingToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(dataStr);
        const choice = parsed.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (delta?.content) {
          accumulatedText += delta.content;
          callbacks.onDeltaText(delta.content);
        }

        // Detect and accumulate tool calls
        if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!pendingToolCalls.has(idx)) {
              pendingToolCalls.set(idx, {
                id: tc.id || `call_${idx}`,
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
              });
            } else {
              const current = pendingToolCalls.get(idx)!;
              if (tc.function?.name) current.name += tc.function.name;
              if (tc.function?.arguments) current.arguments += tc.function.arguments;
            }
          }
        }
      } catch {}
    }
  }

  // If tool calls were requested by the model, execute them and recurse
  if (pendingToolCalls.size > 0) {
    for (const [, toolCall] of pendingToolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(toolCall.arguments || '{}');
      } catch {
        parsedArgs = {};
      }

      callbacks.onToolCallStart?.({
        id: toolCall.id,
        name: toolCall.name,
        args: parsedArgs,
      });

      let toolResultStr = '';
      let isError = false;
      try {
        const executionResult = await app.tools.executeTool(toolCall.name, parsedArgs);
        isError = Boolean(executionResult.isError);
        toolResultStr = executionResult.content
          .map((c) => (c.type === 'text' ? c.text : JSON.stringify(c)))
          .join('\n');
      } catch (err: any) {
        isError = true;
        toolResultStr = `Error executing tool: ${err.message || String(err)}`;
      }

      callbacks.onToolCallComplete?.(toolCall.id, toolResultStr, isError);

      // Recursive continuation with tool outcome
      const followUpPrompt = `Tool "${toolCall.name}" returned:\n\`\`\`json\n${toolResultStr}\n\`\`\`\nPlease synthesize your response based on this tool result.`;
      const nextTurnText = await executeOpenAiCompatibleLoop(
        app,
        provider,
        apiKey,
        model,
        customEndpoint,
        systemPrompt,
        history,
        followUpPrompt,
        mcpTools,
        temperature,
        maxTokens,
        signal,
        callbacks,
        depth + 1
      );
      accumulatedText += (accumulatedText ? '\n\n' : '') + nextTurnText;
    }
  }

  return accumulatedText;
}

// ─────────────────────────────────────────────────────────────
// Anthropic Claude Streaming & Autonomous Tool Loop
// ─────────────────────────────────────────────────────────────

async function executeAnthropicLoop(
  app: FlintApp,
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: CopilotMessage[],
  newPrompt: string,
  mcpTools: readonly McpToolDefinition[],
  temperature: number,
  maxTokens: number,
  signal: AbortSignal,
  callbacks: StreamDeltaCallback,
  depth = 0
): Promise<string> {
  if (depth > 5) {
    return 'Tool execution limit reached.';
  }

  const endpointUrl = 'https://api.anthropic.com/v1/messages';
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };

  // Convert history to Anthropic messages
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of history.slice(-10)) {
    if (m.content) {
      messages.push({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      });
    }
  }

  const lastAdded = messages[messages.length - 1];
  const alreadyIncluded =
    lastAdded &&
    lastAdded.role === 'user' &&
    lastAdded.content.trim() === newPrompt.trim();

  if (newPrompt && !alreadyIncluded) {
    messages.push({ role: 'user', content: newPrompt });
  }

  const payload: Record<string, unknown> = {
    model,
    system: systemPrompt,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: true,
  };

  if (mcpTools.length > 0) {
    payload.tools = toAnthropicTools(mcpTools);
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMessage = errorText;
    try {
      const errObj = JSON.parse(errorText);
      parsedMessage = errObj.error?.message || errorText;
    } catch {}
    throw new Error(`Anthropic error (${response.status}): ${parsedMessage}`);
  }

  if (!response.body) {
    throw new Error('No response stream received from Anthropic.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let lineBuffer = '';

  const pendingToolCalls: Array<{ id: string; name: string; partialJson: string }> = [];
  let currentBlockType: string | null = null;
  let currentToolId = '';
  let currentToolName = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();

      try {
        const evt = JSON.parse(dataStr);

        if (evt.type === 'content_block_start') {
          currentBlockType = evt.content_block?.type;
          if (currentBlockType === 'tool_use') {
            currentToolId = evt.content_block.id;
            currentToolName = evt.content_block.name;
            pendingToolCalls.push({
              id: currentToolId,
              name: currentToolName,
              partialJson: '',
            });
          }
        } else if (evt.type === 'content_block_delta') {
          if (evt.delta?.type === 'text_delta') {
            const textChunk = evt.delta.text || '';
            accumulatedText += textChunk;
            callbacks.onDeltaText(textChunk);
          } else if (evt.delta?.type === 'input_json_delta') {
            const activeCall = pendingToolCalls.find((c) => c.id === currentToolId);
            if (activeCall) {
              activeCall.partialJson += evt.delta.partial_json || '';
            }
          }
        } else if (evt.type === 'content_block_stop') {
          currentBlockType = null;
        }
      } catch {}
    }
  }

  // Execute Anthropic tool calls
  if (pendingToolCalls.length > 0) {
    for (const tc of pendingToolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(tc.partialJson || '{}');
      } catch {
        parsedArgs = {};
      }

      callbacks.onToolCallStart?.({
        id: tc.id,
        name: tc.name,
        args: parsedArgs,
      });

      let toolResultStr = '';
      let isError = false;
      try {
        const res = await app.tools.executeTool(tc.name, parsedArgs);
        isError = Boolean(res.isError);
        toolResultStr = res.content
          .map((c) => (c.type === 'text' ? c.text : JSON.stringify(c)))
          .join('\n');
      } catch (err: any) {
        isError = true;
        toolResultStr = `Error: ${err.message || String(err)}`;
      }

      callbacks.onToolCallComplete?.(tc.id, toolResultStr, isError);

      const followUpPrompt = `Tool "${tc.name}" output:\n\`\`\`json\n${toolResultStr}\n\`\`\`\nPlease provide your final response incorporating this information.`;
      const nextTurnText = await executeAnthropicLoop(
        app,
        apiKey,
        model,
        systemPrompt,
        history,
        followUpPrompt,
        mcpTools,
        temperature,
        maxTokens,
        signal,
        callbacks,
        depth + 1
      );
      accumulatedText += (accumulatedText ? '\n\n' : '') + nextTurnText;
    }
  }

  return accumulatedText;
}

/**
 * Dispatches a prompt directly into the active Copilot chat session in the right sidebar.
 * Automatically opens the right sidebar, focuses the copilot tab, updates session metadata,
 * appends messages to the reactive DAG, and streams the AI answer live into the chat thread.
 */
export async function executeCopilotChatPrompt(
  app: FlintApp,
  text: string,
  options?: { contextOverride?: string }
): Promise<void> {
  const store = useCopilotStore.getState();
  const prompt = text.trim();
  if (!prompt || store.isGenerating) return;

  // Open right sidebar and activate copilot tab
  app.workspace.setActiveSidebarTab('right', 'copilot');
  app.workspace.setSidebarOpen('right', true);

  const isFirstMessage = store.messages.length === 0;

  if (store.sessionTopic === 'New Chat') {
    const derived = prompt.replace(/^[#\s*`\->]+/, '').slice(0, 26).trim();
    if (derived) {
      store.setSessionTopic(derived);
    }
  }

  if (isFirstMessage) {
    pickSessionIconInBackground(store.activeSessionId, prompt);
  }

  const activeThread = store.messages;
  const lastMsg = activeThread[activeThread.length - 1];
  const parentId = lastMsg ? lastMsg.id : null;

  const userMsgId = `usr-${Date.now()}`;
  const assistantMsgId = `ast-${Date.now() + 1}`;

  // Append user message
  store.addMessage({
    id: userMsgId,
    parentId,
    role: 'user',
    content: prompt,
    timestamp: Date.now(),
  });

  // Prepare empty assistant placeholder
  store.addMessage({
    id: assistantMsgId,
    parentId: userMsgId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    isStreaming: true,
    toolCalls: [],
  });

  try {
    await runCopilotTurn(app, prompt, {
      contextOverride: options?.contextOverride,
      onDeltaText: (delta) => {
        store.updateMessage(assistantMsgId, (prev) => ({
          ...prev,
          content: prev.content + delta,
        }));
      },
      onToolCallStart: (tool) => {
        store.updateMessage(assistantMsgId, (prev) => {
          const existingCalls = prev.toolCalls || [];
          return {
            ...prev,
            toolCalls: [
              ...existingCalls,
              {
                id: tool.id,
                name: tool.name,
                args: tool.args,
                status: 'running',
              },
            ],
          };
        });
      },
      onToolCallComplete: (toolId, resultText, isError) => {
        store.updateMessage(assistantMsgId, (prev) => {
          const updatedCalls = (prev.toolCalls || []).map((tc) => {
            if (tc.id === toolId) {
              return {
                ...tc,
                status: isError ? ('error' as const) : ('success' as const),
                result: resultText,
              };
            }
            return tc;
          });
          return { ...prev, toolCalls: updatedCalls };
        });
      },
      onMetricsUpdate: (metrics) => {
        store.updateMessage(assistantMsgId, (prev) => ({
          ...prev,
          elapsedTimeMs: metrics.elapsedTimeMs,
          toolsExecutedCount: metrics.toolsExecutedCount,
          filesReadCount: metrics.filesReadCount,
          filesEditedCount: metrics.filesEditedCount,
        }));
      },
    });

    store.updateMessage(assistantMsgId, { isStreaming: false });
  } catch (err: any) {
    store.updateMessage(assistantMsgId, (prev) => ({
      ...prev,
      isStreaming: false,
      content: prev.content
        ? `${prev.content}\n\n*[Error: ${err.message || String(err)}]*`
        : `*[Error: ${err.message || String(err)}]*`,
    }));
  }
}

export { fetchLiveModels } from './copilotModels';

