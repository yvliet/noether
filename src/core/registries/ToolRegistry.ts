/**
 * @module ToolRegistry
 * @description
 * Central registry managing Model Context Protocol (MCP) tool definitions in Flint.
 * Enables extensions to register callable tools for AI agents and external MCP clients.
 *
 * Provides:
 * - O(1) case-insensitive tool lookup via normalized keys
 * - Array caching for fast iteration during MCP schema generation (`tools/list`)
 * - Isolated execution boundary with timing metrics and EventBus telemetry
 * - Synchronous subscriber notifications for reactive UI updates
 *
 * @since 0.3.0
 */

import {
  McpToolDefinition,
  McpToolResult,
  McpJsonSchema,
  McpPromptDefinition,
  McpPromptResult,
  McpPromptArgument,
  McpZodToolDefinition,
  Disposable,
} from '../extensions/types';
import { zodToMcpJsonSchema, formatZodIssues } from '@/lib/mcp/zodToJsonSchema';
import type { z } from 'zod';
import type { FlintApp } from '../app/FlintApp';

export class ToolRegistry {
  private tools: Map<string, McpToolDefinition> = new Map();
  private prompts: Map<string, McpPromptDefinition> = new Map();
  private listeners: Set<() => void> = new Set();
  private cachedTools: McpToolDefinition[] = [];
  private cachedPrompts: McpPromptDefinition[] = [];

  constructor(private app: FlintApp) {}

  /**
   * Registers an MCP Tool callable by AI agents and external clients.
   * Supports both raw JSON schema tool definitions and type-safe Zod-powered tool definitions.
   *
   * @param tool - Tool definition conforming to the MCP specification or Zod schema definition.
   * @returns A Disposable to unregister the tool.
   * @since 0.3.0
   */
  public registerTool<TSchema extends z.ZodTypeAny>(tool: McpZodToolDefinition<TSchema>): Disposable;
  public registerTool(tool: McpToolDefinition): Disposable;
  public registerTool(tool: McpToolDefinition | McpZodToolDefinition<any>): Disposable {
    let resolvedTool: McpToolDefinition;

    if ('schema' in tool && tool.schema) {
      const zodTool = tool as McpZodToolDefinition;
      const parameters = zodToMcpJsonSchema(zodTool.schema);

      resolvedTool = {
        name: zodTool.name,
        description: zodTool.description,
        category: zodTool.category,
        isDestructive: zodTool.isDestructive,
        parameters,
        handler: async (args: Record<string, unknown>, app: FlintApp) => {
          const parsed = zodTool.schema.safeParse(args);
          if (!parsed.success) {
            return {
              isError: true,
              content: [{ type: 'text', text: formatZodIssues(parsed.error) }],
            };
          }
          return zodTool.handler(parsed.data, app);
        },
      };
    } else {
      resolvedTool = tool as McpToolDefinition;
    }

    const key = resolvedTool.name.toLowerCase();
    this.tools.set(key, resolvedTool);
    this.recomputeCache();
    this.notify();
    this.app.events.emit('mcp:tools-changed', { count: this.tools.size });

    return {
      dispose: () => {
        this.unregisterTool(resolvedTool.name);
      },
    };
  }

  /**
   * Unregisters an MCP Tool by its registered name.
   *
   * @param name - Unique tool identifier name.
   * @since 0.3.0
   */
  public unregisterTool(name: string): void {
    const key = name.toLowerCase();
    if (this.tools.delete(key)) {
      this.recomputeCache();
      this.notify();
      this.app.events.emit('mcp:tools-changed', { count: this.tools.size });
    }
  }

  /**
   * Retrieves a tool definition by name (case-insensitive).
   *
   * @param name - Tool identifier name.
   * @returns The tool definition or undefined if not found.
   * @since 0.3.0
   */
  public getTool(name: string): McpToolDefinition | undefined {
    return this.tools.get(name.toLowerCase());
  }

  /**
   * Returns all currently registered MCP tools.
   *
   * @returns Readonly array of all active tool definitions.
   * @since 0.3.0
   */
  public getAllTools(): readonly McpToolDefinition[] {
    return this.cachedTools;
  }

  /**
   * Generates schemas compatible with the MCP `tools/list` protocol response.
   *
   * @returns Array of tool schemas with name, description, and JSON inputSchema.
   * @since 0.3.0
   */
  public getMcpToolSchemas(): Array<{ name: string; description: string; inputSchema: McpJsonSchema }> {
    return this.cachedTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    }));
  }

  /**
   * Executes an MCP tool by name with provided argument payload.
   * Wraps handler execution in a try/catch error boundary, timing duration,
   * and emitting lifecycle telemetry on the Flint EventBus.
   *
   * @param name - Tool identifier name to execute.
   * @param args - Key-value map of arguments conforming to tool schema.
   * @returns Structured MCP tool execution result.
   * @since 0.3.0
   */
  public async executeTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    const tool = this.getTool(name);
    if (!tool) {
      const errorMsg = `Tool "${name}" is not registered.`;
      return {
        isError: true,
        content: [{ type: 'text', text: errorMsg }],
      };
    }

    const startTime = performance.now();
    this.app.events.emit('mcp:tool-called', {
      toolName: name,
      args,
      source: 'in-app',
    });

    try {
      const result = await tool.handler(args, this.app);
      const durationMs = performance.now() - startTime;
      this.app.events.emit('mcp:tool-result', {
        toolName: name,
        success: !result.isError,
        durationMs,
      });
      return result;
    } catch (err: unknown) {
      const durationMs = performance.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[ToolRegistry] Error executing tool "${name}":`, err);
      this.app.events.emit('mcp:tool-result', {
        toolName: name,
        success: false,
        durationMs,
        error: errorMsg,
      });
      return {
        isError: true,
        content: [{ type: 'text', text: errorMsg }],
      };
    }
  }

  /**
   * Registers an MCP Prompt template callable by AI agents and external clients.
   *
   * @param prompt - Prompt definition conforming to the MCP specification.
   * @returns A Disposable to unregister the prompt.
   * @since 0.3.0
   */
  public registerPrompt(prompt: McpPromptDefinition): Disposable {
    const key = prompt.name.toLowerCase();
    this.prompts.set(key, prompt);
    this.recomputePromptCache();
    this.notify();

    return {
      dispose: () => {
        this.unregisterPrompt(prompt.name);
      },
    };
  }

  /**
   * Unregisters an MCP Prompt by name.
   *
   * @param name - Prompt identifier name.
   * @since 0.3.0
   */
  public unregisterPrompt(name: string): void {
    const key = name.toLowerCase();
    if (this.prompts.delete(key)) {
      this.recomputePromptCache();
      this.notify();
    }
  }

  /**
   * Retrieves a prompt definition by name (case-insensitive).
   *
   * @param name - Prompt identifier name.
   * @returns The prompt definition or undefined if not found.
   * @since 0.3.0
   */
  public getPrompt(name: string): McpPromptDefinition | undefined {
    return this.prompts.get(name.toLowerCase());
  }

  /**
   * Returns all currently registered MCP prompts.
   *
   * @returns Readonly array of active prompt definitions.
   * @since 0.3.0
   */
  public getAllPrompts(): readonly McpPromptDefinition[] {
    return this.cachedPrompts;
  }

  /**
   * Generates schemas compatible with the MCP `prompts/list` protocol response.
   *
   * @returns Array of prompt schemas with name, description, and arguments.
   * @since 0.3.0
   */
  public getMcpPromptSchemas(): Array<{ name: string; description?: string; arguments?: McpPromptArgument[] }> {
    return this.cachedPrompts.map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    }));
  }

  /**
   * Evaluates an MCP prompt template by name, returning populated messages.
   *
   * @param name - Prompt identifier name.
   * @param args - Key-value map of string arguments.
   * @returns Prompt messages array formatted for LLM context injection.
   * @since 0.3.0
   */
  public async getPromptMessages(name: string, args: Record<string, string> = {}): Promise<McpPromptResult> {
    const prompt = this.getPrompt(name);
    if (!prompt) {
      return {
        isError: true,
        description: `Prompt "${name}" is not registered.`,
        messages: [{ role: 'user', content: { type: 'text', text: `Error: Prompt "${name}" not found.` } }],
      };
    }

    try {
      return await prompt.getMessages(args, this.app);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[ToolRegistry] Error evaluating prompt "${name}":`, err);
      return {
        isError: true,
        description: `Error evaluating prompt "${name}": ${errorMsg}`,
        messages: [{ role: 'user', content: { type: 'text', text: `Error: ${errorMsg}` } }],
      };
    }
  }

  /**
   * Subscribes a listener to registry changes (tools or prompts added/removed).
   *
   * @param listener - Callback invoked on change.
   * @returns A Disposable to unregister the listener.
   * @since 0.3.0
   */
  public subscribe(listener: () => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private recomputeCache(): void {
    this.cachedTools = Array.from(this.tools.values());
  }

  private recomputePromptCache(): void {
    this.cachedPrompts = Array.from(this.prompts.values());
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[ToolRegistry] Error in listener:', err);
      }
    });
  }
}
