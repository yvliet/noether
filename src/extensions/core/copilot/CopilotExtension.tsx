/**
 * @module CopilotExtension
 * @description
 * Built-in community extension for Copilot For Flint.
 * Registers into Flint's right sidebar tabs and settings, providing:
 * - Dynamic Hugeicon model branding (switching between ArtificialIntelligence01Icon, Claude, ChatGPT, etc.)
 * - Zero-friction Bring-Your-Own-Key (BYOK) setup for OpenAI, Anthropic, Gemini, DeepSeek, and OpenRouter
 * - Direct autonomous workspace access to Flint's native Model Context Protocol (MCP) tools
 * - Context-aware note analysis, summarization, and action item extraction
 * - MCP tools: copilot_chat, copilot_get_status
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { CopilotSidebarIcon } from './copilotIcons';
import { CopilotSidebarView } from './CopilotSidebarView';
import { CopilotSettingsTab } from './CopilotSettingsTab';
import { copilotReadme } from './readme';
import { useCopilotStore, PROVIDER_CATALOG } from './copilotStore';
import { runCopilotTurn } from './copilotClient';

export const COPILOT_MANIFEST: ExtensionManifest = {
  id: 'flint-copilot',
  name: 'Copilot For Flint',
  version: '1.0.0',
  description: 'Fast, intelligent AI copilot assistant with BYOK multi-provider support and direct access to Flint workspace MCP tools.',
  author: 'Yuliet Li',
  isCore: false,
  tags: ['ai', 'copilot', 'assistant', 'mcp', 'chat', 'byok', 'workspace'],
  readme: copilotReadme,
};

export class CopilotExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = COPILOT_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Right Sidebar Tab
    this.registerSidebarTab({
      id: 'copilot',
      title: 'Copilot',
      icon: <CopilotSidebarIcon size={14} />,
      side: 'right',
      order: 5,
      render: () => <CopilotSidebarView />,
    });

    // 2. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'copilot-settings',
      name: 'Copilot',
      icon: <CopilotSidebarIcon size={14} />,
      render: () => <CopilotSettingsTab />,
    });

    // 3. Register Quick Commands
    this.addCommand({
      id: 'copilot:open',
      title: 'Open Copilot in Right Sidebar',
      action: () => {
        this.app.workspace.setActiveSidebarTab('right', 'copilot');
        this.app.workspace.setSidebarOpen('right', true);
      },
    });

    this.addCommand({
      id: 'copilot:summarize-active-note',
      title: 'Copilot: Summarize Active Note',
      action: () => {
        this.app.workspace.setActiveSidebarTab('right', 'copilot');
        this.app.workspace.setSidebarOpen('right', true);
        // Dispatch to copilot store
        const store = useCopilotStore.getState();
        store.addMessage({
          id: `usr-${Date.now()}`,
          role: 'user',
          content: 'Please summarize the active note concisely with key bullet points.',
          timestamp: Date.now(),
        });
      },
    });

    this.addCommand({
      id: 'copilot:extract-tasks',
      title: 'Copilot: Extract Action Items & Tasks',
      action: () => {
        this.app.workspace.setActiveSidebarTab('right', 'copilot');
        this.app.workspace.setSidebarOpen('right', true);
        const store = useCopilotStore.getState();
        store.addMessage({
          id: `usr-${Date.now()}`,
          role: 'user',
          content: 'Extract all action items, tasks, and todos from the active note.',
          timestamp: Date.now(),
        });
      },
    });

    this.addCommand({
      id: 'copilot:polish-writing',
      title: 'Copilot: Polish Writing & Clarity',
      action: () => {
        this.app.workspace.setActiveSidebarTab('right', 'copilot');
        this.app.workspace.setSidebarOpen('right', true);
        const store = useCopilotStore.getState();
        store.addMessage({
          id: `usr-${Date.now()}`,
          role: 'user',
          content: 'Review and polish the writing in the active note for clarity and flow.',
          timestamp: Date.now(),
        });
      },
    });

    // 4. Register Extension MCP Tools
    // ── Tool: copilot_chat ──
    this.registerTool({
      name: 'copilot_chat',
      description: 'Query Copilot for Flint programmatically with prompt and receive an AI-synthesized answer.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The user prompt or query to send to Copilot',
          },
          includeContext: {
            type: 'boolean',
            description: 'Whether to attach the active note as context (default: true)',
          },
        },
        required: ['prompt'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const prompt = String(args.prompt || '').trim();
          if (!prompt) {
            throw new Error('Parameter "prompt" is required.');
          }

          let collectedText = '';
          await runCopilotTurn(this.app, prompt, {
            onDeltaText: (delta) => {
              collectedText += delta;
            },
          });

          return {
            content: [
              {
                type: 'text',
                text: collectedText || 'No response generated.',
              },
            ],
          };
        } catch (err: any) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Copilot chat error: ${err.message || String(err)}`,
              },
            ],
          };
        }
      },
    });

    // ── Tool: copilot_get_status ──
    this.registerTool({
      name: 'copilot_get_status',
      description: 'Check active Copilot provider, current model, and BYOK credential configuration.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<McpToolResult> => {
        const store = useCopilotStore.getState();
        const provider = store.provider;
        const model = provider ? store.models[provider] || PROVIDER_CATALOG[provider].defaultModel : 'none';
        const hasKey = provider ? (provider === 'custom' || Boolean(store.apiKeys[provider])) : false;
        const providerName = provider ? PROVIDER_CATALOG[provider].name : 'Not Configured';

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                extension: 'flint-copilot',
                author: 'Yuliet Li',
                provider: provider || 'unconfigured',
                providerName,
                model,
                hasKeyConfigured: hasKey,
                enableMcpTools: store.enableMcpTools,
                includeActiveNoteContext: store.includeActiveNoteContext,
              }),
            },
          ],
        };
      },
    });
  }
}
