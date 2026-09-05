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
import { runCopilotTurn, executeCopilotChatPrompt } from './copilotClient';
import {
  SparklesIcon,
  Edit02Icon,
  File01Icon,
  CheckIcon,
  CheckmarkSquare02Icon,
  Brain02Icon,
  LayersIcon,
  GlobeIcon,
} from '@/components/common/Icons';

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

    // 3. Register Keyboard Hotkeys & Commands
    this.addCommand({
      id: 'copilot:inline-ask',
      title: 'Copilot: Open Chat & Ask',
      hotkey: 'Ctrl+J',
      allowInInput: true,
      action: (app) => {
        const ed = app.editor.getActiveEditor() || (window as any).__flintEditor;
        let selectedText = '';
        if (ed && ed.state) {
          const { from, to, empty } = ed.state.selection;
          if (!empty) {
            selectedText = ed.state.doc.textBetween(from, to, ' ');
          }
        }

        app.workspace.setActiveSidebarTab('right', 'copilot');
        app.workspace.setSidebarOpen('right', true);

        if (selectedText) {
          useCopilotStore.getState().setDraftPrompt(`Regarding this selection:\n> ${selectedText.slice(0, 400)}\n\n`);
        }
      },
    });

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
      action: (app) => {
        const title = app.vault.activeDocument?.title || 'the active note';
        executeCopilotChatPrompt(
          app,
          `Please provide a clear, structured summary of "${title}" with an executive overview and key takeaways.`
        );
      },
    });

    this.addCommand({
      id: 'copilot:extract-tasks',
      title: 'Copilot: Extract Action Items & Tasks',
      action: (app) => {
        const title = app.vault.activeDocument?.title || 'the active note';
        executeCopilotChatPrompt(
          app,
          `Extract all action items, tasks, and todos from "${title}" as a markdown checklist.`
        );
      },
    });

    this.addCommand({
      id: 'copilot:polish-writing',
      title: 'Copilot: Polish Writing & Clarity',
      action: (app) => {
        const ed = app.editor.getActiveEditor() || (window as any).__flintEditor;
        let selectedText = '';
        if (ed && ed.state) {
          const { from, to, empty } = ed.state.selection;
          if (!empty) {
            selectedText = ed.state.doc.textBetween(from, to, ' ');
          }
        }

        if (selectedText) {
          executeCopilotChatPrompt(
            app,
            `Please polish and improve the writing in this selection for clarity, natural flow, and sharp professional tone:\n\n> ${selectedText}`
          );
        } else {
          executeCopilotChatPrompt(
            app,
            'Please review and polish the writing throughout the active note for clarity, flow, and professional tone.'
          );
        }
      },
    });

    // 4. Register Editor Context Menu Items
    this.registerContextMenuItem({
      id: 'copilot-editor-menu',
      title: 'Copilot',
      icon: <CopilotSidebarIcon size={14} />,
      scope: 'editor',
      group: 'tools',
      order: 20,
      submenu: [
        {
          id: 'copilot-ask-inline',
          title: 'Ask Copilot...',
          shortcut: 'Ctrl+J',
          icon: <SparklesIcon size={14} />,
          onClick: (app, data: any) => {
            const selectedText = data?.selectedText || '';
            app.workspace.setActiveSidebarTab('right', 'copilot');
            app.workspace.setSidebarOpen('right', true);

            if (selectedText) {
              useCopilotStore.getState().setDraftPrompt(`Regarding this selection:\n> ${selectedText.slice(0, 400)}\n\n`);
            }
          },
        },
        {
          id: 'copilot-sep-editor-1',
          type: 'separator',
        },
        // Contextual Selection Actions (shown when text is selected)
        {
          id: 'copilot-polish-selection',
          title: 'Polish & Improve Writing',
          icon: <Edit02Icon size={14} />,
          isVisible: (_app, data: any) => Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            executeCopilotChatPrompt(
              app,
              `Please polish and improve the writing in this selection for clarity, natural flow, and sharp professional tone:\n\n> ${data?.selectedText}`
            );
          },
        },
        {
          id: 'copilot-fix-grammar',
          title: 'Fix Spelling & Grammar',
          icon: <CheckIcon size={14} />,
          isVisible: (_app, data: any) => Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            executeCopilotChatPrompt(
              app,
              `Please fix all grammar, spelling, and punctuation errors in this selection directly:\n\n> ${data?.selectedText}`
            );
          },
        },
        {
          id: 'copilot-summarize-selection',
          title: 'Summarize Selection',
          icon: <File01Icon size={14} />,
          isVisible: (_app, data: any) => Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            executeCopilotChatPrompt(
              app,
              `Please summarize the key points in this selection concisely with clean bullet points:\n\n> ${data?.selectedText}`
            );
          },
        },
        {
          id: 'copilot-explain-selection',
          title: 'Explain Selection',
          icon: <Brain02Icon size={14} />,
          isVisible: (_app, data: any) => Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            executeCopilotChatPrompt(
              app,
              `Please explain the core idea in this selection in simple, intuitive terms with an example:\n\n> ${data?.selectedText}`
            );
          },
        },
        {
          id: 'copilot-shorter-selection',
          title: 'Make Shorter',
          isVisible: (_app, data: any) => Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            executeCopilotChatPrompt(
              app,
              `Rewrite this selection to be concise and punchy, removing fluff without losing core meaning:\n\n> ${data?.selectedText}`
            );
          },
        },
        {
          id: 'copilot-longer-selection',
          title: 'Make Longer / Elaborate',
          isVisible: (_app, data: any) => Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            executeCopilotChatPrompt(
              app,
              `Elaborate on the ideas in this selection with deeper explanation, context, and examples:\n\n> ${data?.selectedText}`
            );
          },
        },
        {
          id: 'copilot-extract-tasks-selection',
          title: 'Extract Action Items',
          icon: <CheckmarkSquare02Icon size={14} />,
          isVisible: (_app, data: any) => Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            executeCopilotChatPrompt(
              app,
              `Extract all actionable tasks, todos, and follow-ups from this selection as markdown checkboxes (- [ ]):\n\n> ${data?.selectedText}`
            );
          },
        },
        {
          id: 'copilot-translate-selection',
          title: 'Translate Selection',
          icon: <GlobeIcon size={14} />,
          isVisible: (_app, data: any) => Boolean(data?.selectedText),
          submenu: [
            {
              id: 'copilot-trans-en',
              title: 'To English',
              onClick: (app, data: any) => {
                executeCopilotChatPrompt(
                  app,
                  `Translate this selection accurately and naturally into English:\n\n> ${data?.selectedText}`
                );
              },
            },
            {
              id: 'copilot-trans-es',
              title: 'To Spanish',
              onClick: (app, data: any) => {
                executeCopilotChatPrompt(
                  app,
                  `Translate this selection accurately and naturally into Spanish:\n\n> ${data?.selectedText}`
                );
              },
            },
            {
              id: 'copilot-trans-fr',
              title: 'To French',
              onClick: (app, data: any) => {
                executeCopilotChatPrompt(
                  app,
                  `Translate this selection accurately and naturally into French:\n\n> ${data?.selectedText}`
                );
              },
            },
            {
              id: 'copilot-trans-de',
              title: 'To German',
              onClick: (app, data: any) => {
                executeCopilotChatPrompt(
                  app,
                  `Translate this selection accurately and naturally into German:\n\n> ${data?.selectedText}`
                );
              },
            },
            {
              id: 'copilot-trans-ja',
              title: 'To Japanese',
              onClick: (app, data: any) => {
                executeCopilotChatPrompt(
                  app,
                  `Translate this selection accurately and naturally into Japanese:\n\n> ${data?.selectedText}`
                );
              },
            },
            {
              id: 'copilot-trans-zh',
              title: 'To Chinese (Simplified)',
              onClick: (app, data: any) => {
                executeCopilotChatPrompt(
                  app,
                  `Translate this selection accurately and naturally into Simplified Chinese:\n\n> ${data?.selectedText}`
                );
              },
            },
          ],
        },
        // Active Note Actions (shown when no text is selected)
        {
          id: 'copilot-summarize-note',
          title: 'Summarize Active Note',
          icon: <File01Icon size={14} />,
          isVisible: (_app, data: any) => !Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            const title = data?.document?.title || app.vault.activeDocument?.title || 'the active note';
            executeCopilotChatPrompt(
              app,
              `Provide a clear, structured summary of "${title}" with an executive overview and key takeaways.`
            );
          },
        },
        {
          id: 'copilot-extract-tasks-note',
          title: 'Extract Action Items from Note',
          icon: <CheckmarkSquare02Icon size={14} />,
          isVisible: (_app, data: any) => !Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            const title = data?.document?.title || app.vault.activeDocument?.title || 'the active note';
            executeCopilotChatPrompt(
              app,
              `Scan the active note "${title}" and extract all tasks, todos, and next actions as a checklist.`
            );
          },
        },
        {
          id: 'copilot-outline-note',
          title: 'Generate Note Outline',
          icon: <LayersIcon size={14} />,
          isVisible: (_app, data: any) => !Boolean(data?.selectedText),
          onClick: (app, data: any) => {
            const title = data?.document?.title || app.vault.activeDocument?.title || 'the active note';
            executeCopilotChatPrompt(
              app,
              `Create a structured hierarchical markdown outline of "${title}".`
            );
          },
        },
      ],
    });

    // 5. Register File Tree Context Menu Items
    this.registerContextMenuItem({
      id: 'copilot-file-tree-menu',
      title: 'Copilot',
      icon: <CopilotSidebarIcon size={14} />,
      scope: ['file-tree', 'file-tree-multi'],
      group: 'tools',
      order: 55,
      submenu: [
        {
          id: 'copilot-ask-file',
          title: 'Ask Copilot about Note...',
          icon: <SparklesIcon size={14} />,
          onClick: async (app, data: any) => {
            const doc = data as any;
            app.workspace.setActiveSidebarTab('right', 'copilot');
            app.workspace.setSidebarOpen('right', true);
            useCopilotStore.getState().setDraftPrompt(`Regarding note "${doc?.title || 'Untitled'}": `);
          },
        },
        {
          id: 'copilot-summarize-file',
          title: 'Summarize Note',
          icon: <File01Icon size={14} />,
          onClick: async (app, data: any) => {
            const doc = data as any;
            let contentText = doc?.content_json || '';
            if (doc?.id) {
              const fullDoc = await app.hearth.readDocument(doc.id);
              if (fullDoc?.content_json) {
                contentText = fullDoc.content_json;
              }
            }
            executeCopilotChatPrompt(
              app,
              `Please summarize the note "${doc?.title || 'Untitled'}" concisely with key takeaways.`,
              { contextOverride: contentText ? `NOTE "${doc?.title}":\n${contentText.slice(0, 15000)}` : undefined }
            );
          },
        },
        {
          id: 'copilot-extract-tasks-file',
          title: 'Extract Action Items from Note',
          icon: <CheckmarkSquare02Icon size={14} />,
          onClick: async (app, data: any) => {
            const doc = data as any;
            let contentText = doc?.content_json || '';
            if (doc?.id) {
              const fullDoc = await app.hearth.readDocument(doc.id);
              if (fullDoc?.content_json) {
                contentText = fullDoc.content_json;
              }
            }
            executeCopilotChatPrompt(
              app,
              `Extract all action items, tasks, and todos from "${doc?.title || 'Untitled'}" as markdown checkboxes.`,
              { contextOverride: contentText ? `NOTE "${doc?.title}":\n${contentText.slice(0, 15000)}` : undefined }
            );
          },
        },
      ],
    });

    // 6. Register Tab Context Menu Items
    this.registerContextMenuItem({
      id: 'copilot-tab-menu',
      title: 'Copilot',
      icon: <CopilotSidebarIcon size={14} />,
      scope: 'tab',
      group: 'tools',
      order: 40,
      submenu: [
        {
          id: 'copilot-tab-ask',
          title: 'Ask Copilot about Tab...',
          icon: <SparklesIcon size={14} />,
          onClick: (app, data: any) => {
            const tab = data as any;
            app.workspace.setActiveSidebarTab('right', 'copilot');
            app.workspace.setSidebarOpen('right', true);
            useCopilotStore.getState().setDraftPrompt(`Regarding "${tab?.title || 'this note'}": `);
          },
        },
        {
          id: 'copilot-tab-summarize',
          title: 'Summarize Tab Note',
          icon: <File01Icon size={14} />,
          onClick: (app, data: any) => {
            const tab = data as any;
            executeCopilotChatPrompt(
              app,
              `Summarize the note "${tab?.title || 'Untitled'}" with key takeaways.`
            );
          },
        },
      ],
    });

    // 7. Register Document Header Dropdown Actions
    this.registerDocMenuAction({
      id: 'copilot-doc-summarize',
      title: 'Copilot: Summarize Note',
      icon: <File01Icon size={14} />,
      group: 'tools',
      order: 30,
      requiresDoc: true,
      onClick: (app, doc) => {
        executeCopilotChatPrompt(
          app,
          `Provide a structured summary of "${doc?.title || 'this note'}" with an executive overview and key takeaways.`
        );
      },
    });

    this.registerDocMenuAction({
      id: 'copilot-doc-tasks',
      title: 'Copilot: Extract Action Items',
      icon: <CheckmarkSquare02Icon size={14} />,
      group: 'tools',
      order: 31,
      requiresDoc: true,
      onClick: (app, doc) => {
        executeCopilotChatPrompt(
          app,
          `Extract all tasks and action items from "${doc?.title || 'this note'}" as a markdown checklist.`
        );
      },
    });

    this.registerDocMenuAction({
      id: 'copilot-doc-polish',
      title: 'Copilot: Polish Writing',
      icon: <Edit02Icon size={14} />,
      group: 'tools',
      order: 32,
      requiresDoc: true,
      onClick: (app, doc) => {
        executeCopilotChatPrompt(
          app,
          `Review and polish the writing throughout "${doc?.title || 'this note'}" for clarity, flow, and tone.`
        );
      },
    });

    this.registerDocMenuAction({
      id: 'copilot-doc-ask',
      title: 'Copilot: Ask Question...',
      icon: <SparklesIcon size={14} />,
      group: 'tools',
      order: 33,
      requiresDoc: true,
      onClick: (app, doc) => {
        app.workspace.setActiveSidebarTab('right', 'copilot');
        app.workspace.setSidebarOpen('right', true);
        useCopilotStore.getState().setDraftPrompt(`Regarding "${doc?.title || 'this note'}": `);
      },
    });

    // 8. Register TipTap Slash Commands
    this.registerSlashCommand({
      title: 'Ask Copilot',
      description: 'Open Copilot chat to brainstorm, ask, or write',
      icon: <SparklesIcon size={14} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        this.app.workspace.setActiveSidebarTab('right', 'copilot');
        this.app.workspace.setSidebarOpen('right', true);
      },
    });

    this.registerSlashCommand({
      title: 'Copilot: Summarize note',
      description: 'Summarize the active note in Copilot chat',
      icon: <File01Icon size={14} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        executeCopilotChatPrompt(
          this.app,
          'Please summarize the active note concisely with key bullet points.'
        );
      },
    });

    this.registerSlashCommand({
      title: 'Copilot: Extract tasks',
      description: 'Extract action items into Copilot chat',
      icon: <CheckmarkSquare02Icon size={14} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        executeCopilotChatPrompt(
          this.app,
          'Extract all tasks and todos from this note into a markdown checklist.'
        );
      },
    });

    this.registerSlashCommand({
      title: 'Copilot: Generate outline',
      description: 'Generate note outline in Copilot chat',
      icon: <LayersIcon size={14} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        executeCopilotChatPrompt(
          this.app,
          'Generate a structured hierarchical markdown outline with headings and key points.'
        );
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
