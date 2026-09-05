/**
 * @module CopilotSidebarView
 * @description
 * High-density right sidebar view for Copilot For Flint, mirroring the modern AI workspace
 * design pattern with native Flint theming:
 * - Dynamic model-branded accent session topic pill with instant 1-click new session
 * - Unified input card container with internal bottom controls (+ context, model picker, tool mode, circular send)
 * - Collapsible multi-step tool execution accordions (Read/Search tools, Edit/Create tools)
 * - Total work duration tracking ('Worked for 1m 12s')
 * - Clean assistant message actions (Insert into note, Copy, Save as new note, Regenerate)
 * - Interactive clickable wikilinks ([[Note Title]]) that navigate directly to workspace notes
 * - Instant desktop responsiveness with zero micro-interaction transition lag
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFlintApp } from '@/core/app/AppContext';
import { DynamicHugeIcon } from '@/components/common/IconPicker';
import {
  useCopilotStore,
  CopilotSession,
  CopilotProvider,
  PROVIDER_CATALOG,
  CopilotMessage,
  ModelOption,
} from './copilotStore';
import { runCopilotTurn } from './copilotClient';
import { pickSessionIconInBackground } from './copilotSessionHelper';
import {
  CopilotSidebarIcon,
  ArtificialIntelligence01Icon,
  ClaudeIcon,
  ChatGptIcon,
  GoogleGeminiIcon,
  DeepseekIcon,
  EyeIcon,
  EyeOffIcon,
} from './copilotIcons';
import {
  PlusSignIcon,
  Cancel01Icon,
  Delete02Icon,
  Settings02Icon,
  File01Icon,
  BookOpen01Icon,
  Search01Icon,
  Database01Icon,
  CheckIcon,
  Alert02Icon,
  Copy01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  FileAddIcon,
  RotateCcwIcon,
  ArrowUp01Icon,
  SquareIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeIcon,
  LayersIcon,
  Edit02Icon,
} from '@/components/common/Icons';
import { Button, TextInput } from '@/components/ui';
import { Tooltip } from '@/components/common/Tooltip';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { CopilotMarkdown } from './CopilotMarkdown';

const MATRIX_DELAYS = [
  0, 0.16, 0.32,
  0.16, 0.32, 0.48,
  0.32, 0.48, 0.64,
];

const CopilotMatrixLoader: React.FC<{ isWorking?: boolean }> = React.memo(({ isWorking = false }) => {
  return (
    <>
      {isWorking && (
        <style>{`
          @keyframes copilot-matrix-pulse {
            0%, 100% {
              opacity: 0.2;
              transform: scale(0.75);
            }
            50% {
              opacity: 1;
              transform: scale(1.15);
            }
          }
        `}</style>
      )}
      <span
        className="inline-grid grid-cols-3 grid-rows-3 gap-[2px] w-2.5 h-2.5 shrink-0 select-none text-[var(--flint-text-muted,#777777)]"
        aria-hidden="true"
      >
        {MATRIX_DELAYS.map((delay, i) => (
          <span
            key={i}
            style={
              isWorking
                ? {
                    animation: 'copilot-matrix-pulse 1.2s infinite ease-in-out',
                    animationDelay: `${delay}s`,
                  }
                : undefined
            }
            className={`w-[2px] h-[2px] rounded-full bg-current ${!isWorking ? 'opacity-70' : ''}`}
          />
        ))}
      </span>
    </>
  );
});
CopilotMatrixLoader.displayName = 'CopilotMatrixLoader';

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs}s`;
}

export const CopilotSidebarView: React.FC = () => {
  const app = useFlintApp();

  const provider = useCopilotStore((s) => s.provider);
  const models = useCopilotStore((s) => s.models);
  const apiKeys = useCopilotStore((s) => s.apiKeys);
  const messages = useCopilotStore((s) => s.messages);
  const isGenerating = useCopilotStore((s) => s.isGenerating);
  const includeActiveNoteContext = useCopilotStore((s) => s.includeActiveNoteContext);
  const fetchedModels = useCopilotStore((s) => s.fetchedModels);
  const refreshModels = useCopilotStore((s) => s.refreshModels);
  const draftPrompt = useCopilotStore((s) => s.draftPrompt);
  const setDraftPrompt = useCopilotStore((s) => s.setDraftPrompt);
  const sessionTopic = useCopilotStore((s) => s.sessionTopic);
  const toolMode = useCopilotStore((s) => s.toolMode);
  const sessions = useCopilotStore((s) => s.sessions);
  const activeSessionId = useCopilotStore((s) => s.activeSessionId);

  const setProvider = useCopilotStore((s) => s.setProvider);
  const setModel = useCopilotStore((s) => s.setModel);
  const setApiKey = useCopilotStore((s) => s.setApiKey);
  const setIncludeActiveNoteContext = useCopilotStore((s) => s.setIncludeActiveNoteContext);
  const setToolMode = useCopilotStore((s) => s.setToolMode);
  const setSessionTopic = useCopilotStore((s) => s.setSessionTopic);
  const createNewSession = useCopilotStore((s) => s.createNewSession);
  const switchSession = useCopilotStore((s) => s.switchSession);
  const deleteSession = useCopilotStore((s) => s.deleteSession);
  const addMessage = useCopilotStore((s) => s.addMessage);
  const updateMessage = useCopilotStore((s) => s.updateMessage);
  const clearMessages = useCopilotStore((s) => s.clearMessages);
  const stopGeneration = useCopilotStore((s) => s.stopGeneration);
  const getMessageVariants = useCopilotStore((s) => s.getMessageVariants);
  const switchVariant = useCopilotStore((s) => s.switchVariant);

  const [inputVal, setInputVal] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testErrorMessage, setTestErrorMessage] = useState('');
  const [expandedSummaryIds, setExpandedSummaryIds] = useState<Set<string>>(new Set());
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [modelMenuCoords, setModelMenuCoords] = useState<{ bottom: number; left: number }>({ bottom: 0, left: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelTriggerRef = useRef<HTMLButtonElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Toggle model dropdown menu popup
  const handleToggleModelMenu = () => {
    if (!modelTriggerRef.current) return;
    const rect = modelTriggerRef.current.getBoundingClientRect();
    setModelMenuCoords({
      bottom: window.innerHeight - rect.top + 4,
      left: rect.left,
    });
    setIsModelMenuOpen((prev) => !prev);
  };

  // Close model menu on outside click
  useEffect(() => {
    if (!isModelMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        modelTriggerRef.current &&
        !modelTriggerRef.current.contains(e.target as Node) &&
        modelMenuRef.current &&
        !modelMenuRef.current.contains(e.target as Node)
      ) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isModelMenuOpen]);

  const activeDoc = app.vault.activeDocument;
  const currentKey = provider ? apiKeys[provider] || '' : '';
  const currentModel = provider ? models[provider] || PROVIDER_CATALOG[provider].defaultModel : '';
  const providerMeta = provider ? PROVIDER_CATALOG[provider] : null;

  const hasConfiguredKey = provider === 'custom' || Boolean(provider && currentKey.trim());

  // Auto-fetch live models and normalize default model on mount if key is configured
  useEffect(() => {
    if (provider && hasConfiguredKey) {
      if (!models[provider] && PROVIDER_CATALOG[provider]?.defaultModel) {
        setModel(provider, PROVIDER_CATALOG[provider].defaultModel);
      }
      refreshModels(provider);
    }
  }, [provider, hasConfiguredKey, models, setModel, refreshModels]);

  // Auto-scroll to bottom of chat when new messages or chunks arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isGenerating]);

  // Consume any draft prompt passed externally from context menus or commands
  useEffect(() => {
    if (draftPrompt) {
      setInputVal(draftPrompt);
      setDraftPrompt('');
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
      }, 50);
    }
  }, [draftPrompt, setDraftPrompt]);

  // Adjust input textarea height dynamically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText !== undefined ? overrideText : inputVal).trim();
      if (!text || isGenerating) return;

      setInputVal('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const isFirstMessage = messages.length === 0;

      // Auto-name session topic if currently default "New Chat"
      if (sessionTopic === 'New Chat') {
        const derived = text.replace(/^[#\s*`-]+/, '').slice(0, 26).trim();
        if (derived) {
          setSessionTopic(derived);
        }
      }

      // At first message, copilot will pick an icon for the session and update it in the background
      if (isFirstMessage) {
        pickSessionIconInBackground(activeSessionId, text);
      }

      const activeThread = useCopilotStore.getState().messages;
      const lastMsg = activeThread[activeThread.length - 1];
      const parentId = lastMsg ? lastMsg.id : null;

      const userMsgId = `usr-${Date.now()}`;
      const assistantMsgId = `ast-${Date.now() + 1}`;

      // Append user message
      addMessage({
        id: userMsgId,
        parentId,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });

      // Prepare empty assistant placeholder
      addMessage({
        id: assistantMsgId,
        parentId: userMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        toolCalls: [],
      });

      try {
        await runCopilotTurn(app, text, {
          onDeltaText: (delta) => {
            updateMessage(assistantMsgId, (prev) => ({
              ...prev,
              content: prev.content + delta,
            }));
          },
          onToolCallStart: (tool) => {
            updateMessage(assistantMsgId, (prev) => {
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
            updateMessage(assistantMsgId, (prev) => {
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
            updateMessage(assistantMsgId, (prev) => ({
              ...prev,
              elapsedTimeMs: metrics.elapsedTimeMs,
              toolsExecutedCount: metrics.toolsExecutedCount,
              filesReadCount: metrics.filesReadCount,
              filesEditedCount: metrics.filesEditedCount,
            }));
          },
        });

        updateMessage(assistantMsgId, { isStreaming: false });
      } catch (err: any) {
        updateMessage(assistantMsgId, (prev) => ({
          ...prev,
          isStreaming: false,
          content: prev.content
            ? `${prev.content}\n\n*[Error: ${err.message || String(err)}]*`
            : `*[Error: ${err.message || String(err)}]*`,
        }));
      }
    },
    [app, inputVal, isGenerating, sessionTopic, messages.length, activeSessionId, addMessage, updateMessage, setSessionTopic]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleSummaryExpanded = (id: string) => {
    setExpandedSummaryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 1-Click Action: Copy response text
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    app.workspace.showToast('Copied to clipboard');
  };

  // 1-Click Action: Insert into active note
  const handleInsertIntoNote = (content: string) => {
    if (!activeDoc) {
      app.workspace.showToast('No active note to insert into.');
      return;
    }

    try {
      const currentContent = activeDoc.content_json || '';
      const updatedContent = currentContent ? `${currentContent}\n\n${content}` : content;
      app.hearth.saveDocument(activeDoc.id, updatedContent);
      app.workspace.showToast(`Inserted into "${activeDoc.title}"`);
    } catch {
      app.workspace.showToast('Failed to insert into document.');
    }
  };

  // 1-Click Action: Create as new note
  const handleCreateAsNewNote = async (content: string) => {
    try {
      const firstLine = content.split('\n')[0].replace(/^[#\s*`-]+/, '').slice(0, 40).trim();
      const title = firstLine || `Copilot Note ${new Date().toLocaleDateString()}`;

      const res = await app.tools.executeTool('flint_create_note', {
        title,
        content,
      });

      if (!res.isError) {
        try {
          const firstBlock = res.content[0];
          const textPayload = firstBlock?.type === 'text' ? firstBlock.text : '';
          const parsed = JSON.parse(textPayload || '{}');
          if (parsed.id) {
            app.workspace.openTab(parsed.id);
          }
        } catch {}
        app.workspace.showToast(`Created note "${title}"`);
      } else {
        app.workspace.showToast('Failed to create note.');
      }
    } catch {
      app.workspace.showToast('Failed to create note.');
    }
  };

  // 1-Click Action: Regenerate assistant response as a new sibling version
  const handleRegenerate = useCallback(
    async (messageId: string) => {
      if (isGenerating) return;
      const { sessions, activeSessionId } = useCopilotStore.getState();
      const session = sessions.find((s) => s.id === activeSessionId);
      if (!session) return;

      const targetMsg = session.messages.find((m) => m.id === messageId);
      if (!targetMsg) return;

      const parentUserMsg = session.messages.find((m) => m.id === targetMsg.parentId);
      if (!parentUserMsg || !parentUserMsg.content) return;

      const assistantMsgId = `ast-${Date.now()}`;
      addMessage({
        id: assistantMsgId,
        parentId: parentUserMsg.id,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        toolCalls: [],
      });

      try {
        await runCopilotTurn(app, parentUserMsg.content, {
          onDeltaText: (delta) => {
            updateMessage(assistantMsgId, (prev) => ({
              ...prev,
              content: prev.content + delta,
            }));
          },
          onToolCallStart: (tool) => {
            updateMessage(assistantMsgId, (prev) => {
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
            updateMessage(assistantMsgId, (prev) => {
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
            updateMessage(assistantMsgId, (prev) => ({
              ...prev,
              elapsedTimeMs: metrics.elapsedTimeMs,
              toolsExecutedCount: metrics.toolsExecutedCount,
              filesReadCount: metrics.filesReadCount,
              filesEditedCount: metrics.filesEditedCount,
            }));
          },
        });

        updateMessage(assistantMsgId, { isStreaming: false });
      } catch (err: any) {
        updateMessage(assistantMsgId, (prev) => ({
          ...prev,
          isStreaming: false,
          content: prev.content
            ? `${prev.content}\n\n*[Error: ${err.message || String(err)}]*`
            : `*[Error: ${err.message || String(err)}]*`,
        }));
      }
    },
    [app, isGenerating, addMessage, updateMessage]
  );

  // 1-Click Action: Open wikilink in editor
  const handleWikilinkClick = useCallback(
    async (noteTitle: string) => {
      try {
        const clean = noteTitle.trim();
        const docs = app.vault.documents;
        const found = docs.find((d) => d.title.toLowerCase() === clean.toLowerCase());
        if (found) {
          app.workspace.openTab(found.id);
          app.workspace.showToast(`Opened "${found.title}"`);
        } else {
          const res = await app.tools.executeTool('flint_search_notes', { query: clean });
          if (!res.isError && res.content.length > 0) {
            app.workspace.showToast(`Searched vault for "${clean}"`);
          } else {
            app.workspace.showToast(`Note "${clean}" not found`);
          }
        }
      } catch {
        app.workspace.showToast(`Unable to open note "${noteTitle}"`);
      }
    },
    [app]
  );

  // Save BYOK Key from Setup Card
  const handleSaveKey = () => {
    if (!provider || !tempApiKey.trim()) return;
    setApiKey(provider, tempApiKey.trim());
    setTempApiKey('');
    setTestStatus('success');
    setTimeout(() => setTestStatus('idle'), 2000);
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!provider) return;
    const keyToTest = tempApiKey.trim() || currentKey;
    if (!keyToTest && provider !== 'custom') {
      setTestStatus('error');
      setTestErrorMessage('Please enter an API key first.');
      return;
    }

    setTestStatus('testing');
    setTestErrorMessage('');

    try {
      if (tempApiKey.trim()) {
        setApiKey(provider, tempApiKey.trim());
      }

      await runCopilotTurn(app, 'Ping! Please reply with exactly one word: "Connected".', {
        onDeltaText: () => {},
      });

      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (err: any) {
      setTestStatus('error');
      setTestErrorMessage(err.message || 'Connection test failed.');
    }
  };

  // Open settings tab
  const handleOpenSettings = () => {
    app.workspace.openSettings('copilot-settings');
  };

  // Model select options: strictly empty if not configured
  const modelOptions = useMemo(() => {
    if (!provider || !hasConfiguredKey) return [];
    const list =
      fetchedModels[provider]?.length > 0
        ? fetchedModels[provider]
        : PROVIDER_CATALOG[provider]?.recommendedModels || [];

    const mapped: ModelOption[] = list.map((m) => ({
      value: m.value,
      label: m.label,
      description: m.description,
    }));

    if (currentModel && !mapped.some((m) => m.value === currentModel)) {
      mapped.unshift({
        value: currentModel,
        label: currentModel,
      });
    }

    return mapped;
  }, [provider, hasConfiguredKey, fetchedModels, currentModel]);

  const currentModelLabel = useMemo(() => {
    if (!currentModel) return 'Select Model';
    const found = modelOptions.find((m) => m.value === currentModel);
    return found ? found.label : currentModel;
  }, [currentModel, modelOptions]);

  const canCreateSession = useMemo(() => {
    const active = sessions.find((s) => s.id === activeSessionId);
    if (!active) return false;
    return !(active.messages.length === 0 && active.topic === 'New Chat') && !isGenerating;
  }, [sessions, activeSessionId, isGenerating]);

  const { showContextMenu } = useAppContextMenu();

  const handleTabContextMenu = useCallback(
    (e: React.MouseEvent, sess: CopilotSession, index: number) => {
      e.preventDefault();
      e.stopPropagation();

      const items: ContextMenuItem[] = [
        {
          id: 'close-tab',
          title: 'Close tab',
          icon: <Cancel01Icon size={13} />,
          onClick: () => {
            deleteSession(sess.id);
          },
        },
        {
          id: 'close-other-tabs',
          title: 'Close other tabs',
          disabled: sessions.length <= 1,
          onClick: () => {
            for (const other of sessions) {
              if (other.id !== sess.id) {
                deleteSession(other.id);
              }
            }
          },
        },
        {
          id: 'close-tabs-right',
          title: 'Close tabs to the right',
          disabled: index >= sessions.length - 1,
          onClick: () => {
            const toClose = sessions.slice(index + 1);
            for (const other of toClose) {
              deleteSession(other.id);
            }
          },
        },
        { type: 'separator' },
        {
          id: 'new-session',
          title: 'New session',
          icon: <PlusSignIcon size={14} />,
          disabled: !canCreateSession,
          onClick: () => {
            createNewSession();
          },
        },
      ];

      showContextMenu(e, items);
    },
    [sessions, deleteSession, createNewSession, showContextMenu, canCreateSession]
  );

  return (
    <div className="flex flex-col h-full select-none text-xs bg-[#151515] overflow-hidden">
      {/* ── 1. Top Header: Native Flint Rounded Tabs & Session Controls ── */}
      {hasConfiguredKey && (
        <div
          style={{
            background: '#101010',
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            showContextMenu(e, [
              {
                id: 'new-session',
                title: 'New session',
                icon: <PlusSignIcon size={14} />,
                disabled: !canCreateSession,
                onClick: () => {
                  createNewSession();
                },
              },
            ]);
          }}
          className="h-[38px] flex items-end justify-between pr-2.5 select-none border-b border-[var(--flint-border-base,#292929)] shrink-0 relative z-20"
        >
          {/* Split Tabs Row */}
          <div className="flex items-end gap-[2px] shrink min-w-0 flex-1 overflow-x-auto no-scrollbar relative -mb-[1px] pl-2 mr-1">
            {sessions.map((sess, index) => {
              const isActive = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  onClick={() => switchSession(sess.id)}
                  onContextMenu={(e) => handleTabContextMenu(e, sess, index)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteSession(sess.id);
                    }
                  }}
                  title={sess.topic}
                  style={{
                    color: isActive
                      ? 'var(--flint-text-primary)'
                      : 'var(--flint-text-muted)',
                  }}
                  className={`group relative flex items-center gap-1.5 px-2 text-xs cursor-pointer select-none flex-1 max-w-[140px] min-w-[36px] h-[34px] shrink ${
                    isActive
                      ? 'rounded-t-[7px] bg-[#151515] border-t border-x border-b-0 border-[var(--flint-border-base,#292929)] font-normal z-20 shadow-xs'
                      : 'bg-transparent font-normal border-0 hover:z-30'
                  }`}
                >
                  {/* Inactive Tab Hover */}
                  {!isActive && (
                    <div
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                      }}
                      className="absolute inset-x-0 top-0 bottom-[3px] rounded-[6px] pointer-events-none z-0 opacity-0 group-hover:opacity-100"
                    />
                  )}

                  {/* Active Tab Inverted Curved Corners */}
                  {isActive && (
                    <>
                      <svg
                        className="absolute -bottom-[1px] -left-[8px] w-[8px] h-[9px] pointer-events-none z-30 opacity-100 overflow-visible"
                        viewBox="0 0 8 9"
                      >
                        <path
                          d="M 0 8 A 8 8 0 0 0 8 0 V 9 H 0 Z"
                          fill="#151515"
                        />
                        <rect
                          x="7.5"
                          y="0"
                          width="2"
                          height="9"
                          fill="#151515"
                        />
                        <path
                          d="M 0 8 A 8 8 0 0 0 8 0"
                          fill="none"
                          stroke="var(--flint-border-base, #292929)"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>

                      <svg
                        className="absolute -bottom-[1px] -right-[8px] w-[8px] h-[9px] pointer-events-none z-30 opacity-100 overflow-visible"
                        viewBox="0 0 8 9"
                      >
                        <path
                          d="M 0 0 A 8 8 0 0 0 8 8 V 9 H 0 Z"
                          fill="#151515"
                        />
                        <rect
                          x="-1.5"
                          y="0"
                          width="2"
                          height="9"
                          fill="#151515"
                        />
                        <path
                          d="M 0 0 A 8 8 0 0 0 8 8"
                          fill="none"
                          stroke="var(--flint-border-base, #292929)"
                          strokeWidth="1"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>

                      {/* Active Tab Bottom 1px Border Canceler */}
                      <div
                        style={{
                          background: '#151515',
                        }}
                        className="absolute -bottom-[1px] left-0 right-0 h-[2px] pointer-events-none z-30 opacity-100"
                      />
                    </>
                  )}

                  <div className="relative z-10 flex items-center gap-1.5 min-w-0 flex-1 -translate-y-[2px] group-hover:pr-4">
                    <div
                      className={`w-3.5 h-3.5 flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'text-[var(--flint-text-primary)]'
                          : 'text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-secondary)]'
                      }`}
                    >
                      <DynamicHugeIcon iconId={sess.icon || 'ChatIcon'} size={13} />
                    </div>
                    <span
                      className={`truncate flex-1 min-w-0 text-[12px] ${
                        isActive
                          ? 'text-[var(--flint-text-primary)]'
                          : 'text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-secondary)]'
                      }`}
                    >
                      {sess.topic}
                    </span>
                  </div>

                  {/* Close Tab Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(sess.id);
                    }}
                    title="Close tab"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 z-20 text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)]"
                  >
                    <Cancel01Icon size={12} />
                  </button>
                </div>
              );
            })}

            {/* New Session Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={createNewSession}
              disabled={!canCreateSession}
              title={canCreateSession ? 'New session' : undefined}
              className="w-6 h-6 p-0 -translate-y-[8px] ml-2.5 shrink-0 text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)]"
            >
              <PlusSignIcon size={13} />
            </Button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-0.5 shrink-0 self-center pl-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              disabled={messages.length === 0}
              title="Clear Conversation"
              className="w-6 h-6 p-0 text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)]"
            >
              <Delete02Icon size={13} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenSettings}
              title="Copilot Settings"
              className="w-6 h-6 p-0 text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)]"
            >
              <Settings02Icon size={13} />
            </Button>
          </div>
        </div>
      )}

      {/* ── 2. Content Area: Chat or BYOK Setup ── */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 py-3 space-y-3.5 select-text bg-[#151515]">
        {!hasConfiguredKey ? (
          /* ── BYOK Setup / Onboarding Card ── */
          <div className="space-y-3 select-none">
            <div className="p-3.5 bg-[var(--flint-bg-card,#1e1e1e)] border border-[var(--flint-border-base,#2c2c2c)] rounded-xl space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-[var(--flint-accent,#ea580c)]">
                    <ArtificialIntelligence01Icon size={15} />
                  </div>
                  <h3 className="text-xs font-semibold text-[var(--flint-text-primary,#ffffff)]">
                    Welcome to Copilot
                  </h3>
                </div>
                <p className="text-[11px] text-[var(--flint-text-muted,#888888)] leading-relaxed">
                  Bring your own API key to start using Copilot with direct access to your Flint workspace.
                </p>
              </div>

              {/* Provider Selection Tabs */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--flint-text-muted,#666666)]">
                  1. Select Provider
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(['anthropic', 'openai', 'gemini', 'deepseek', 'openrouter', 'custom'] as CopilotProvider[]).map(
                    (p) => {
                      const isSelected = provider === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProvider(p)}
                          className={`h-7 px-1.5 rounded-[5px] text-[11px] flex items-center justify-center gap-1.5 border cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[var(--flint-accent,#ea580c)] text-white border-[var(--flint-accent,#ea580c)] font-medium'
                              : 'bg-[var(--flint-bg-input,#141414)] text-[var(--flint-text-muted,#888888)] border-[var(--flint-border-base,#282828)] hover:text-[var(--flint-text-primary,#ffffff)] hover:bg-[var(--flint-bg-card-hover,#242424)]'
                          }`}
                        >
                          {p === 'anthropic' && <ClaudeIcon size={12} />}
                          {p === 'openai' && <ChatGptIcon size={12} />}
                          {p === 'gemini' && <GoogleGeminiIcon size={12} />}
                          {p === 'deepseek' && <DeepseekIcon size={12} />}
                          {p === 'openrouter' && <GlobeIcon size={12} />}
                          {p === 'custom' && <Database01Icon size={12} />}
                          <span className="truncate">{PROVIDER_CATALOG[p].brandLabel}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {providerMeta && (
                <>
                  {/* Step 2: Get Key Link */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--flint-text-muted,#666666)]">
                      2. Get Your Key
                    </span>
                    <a
                      href={providerMeta.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--flint-bg-input,#141414)] border border-[var(--flint-border-base,#282828)] hover:border-[var(--flint-border-strong,#3c3c3c)] text-xs text-[var(--flint-text-primary,#ffffff)]"
                    >
                      <span className="text-[11px] truncate">{providerMeta.guideTitle}</span>
                      <ExternalLinkIcon size={12} className="text-[var(--flint-text-muted)] shrink-0" />
                    </a>
                  </div>

                  {/* Step 3: Enter Key */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--flint-text-muted,#666666)]">
                      3. Paste API Key
                    </span>
                    <div className="relative flex items-center">
                      <TextInput
                        type={showPassword ? 'text' : 'password'}
                        placeholder={providerMeta.keyPlaceholder}
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        isMono
                        className="w-full pr-8 text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-pointer"
                        title={showPassword ? 'Hide Key' : 'Show Key'}
                      >
                        {showPassword ? <EyeOffIcon size={13} /> : <EyeIcon size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Error or Success feedback */}
                  {testStatus === 'error' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 p-2 rounded-md">
                      <Alert02Icon size={13} className="shrink-0" />
                      <span className="truncate">{testErrorMessage || 'Connection failed'}</span>
                    </div>
                  )}

                  {testStatus === 'success' && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 p-2 rounded-md">
                      <CheckIcon size={13} className="shrink-0" />
                      <span>Key saved and connected!</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveKey}
                      disabled={!tempApiKey.trim() || testStatus === 'testing'}
                      className="flex-1"
                    >
                      Save & Connect
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={testStatus === 'testing'}
                    >
                      {testStatus === 'testing' ? 'Testing...' : 'Test'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : messages.length === 0 ? (
          /* ── Empty State ── */
          <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-4 select-none">
            <div className="text-[var(--flint-accent,#ea580c)] flex items-center justify-center">
              <CopilotSidebarIcon size={24} />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-[var(--flint-text-primary,#ffffff)]">
                Copilot is ready
              </h4>
              <p className="text-[11px] text-[var(--flint-text-muted,#777777)] max-w-[220px]">
                Ask anything about your notes, synthesize ideas, or execute workspace tools.
              </p>
            </div>
          </div>
        ) : (
          /* ── Chat Message Stream ── */
          <div className="space-y-4">
            {messages.map((m, index) => {
              const isUser = m.role === 'user';

              if (isUser) {
                // User Prompt: Lessened Rounding Card Bubble
                return (
                  <div key={m.id} className="w-full">
                    <div className="rounded-[8px] bg-[var(--flint-bg-card,#1c1c1c)] border border-[var(--flint-border-base,#2a2a2a)] p-3 text-[12px] leading-relaxed text-[var(--flint-text-primary,#ffffff)] whitespace-pre-wrap select-text">
                      {m.content}
                    </div>
                  </div>
                );
              }

              // Assistant Response: Stepped Tool Execution Accordion + Prose + Worked Duration Footer
              const hasTools = m.toolCalls && m.toolCalls.length > 0;
              const isSummaryExpanded = expandedSummaryIds.has(m.id);

              const readCount = m.filesReadCount ?? (m.toolCalls ? m.toolCalls.filter((tc) => tc.name.includes('read') || tc.name.includes('search') || tc.name.includes('list')).length : 0);
              const editCount = m.filesEditedCount ?? (m.toolCalls ? m.toolCalls.filter((tc) => tc.name.includes('create') || tc.name.includes('update') || tc.name.includes('delete')).length : 0);
              const totalTools = m.toolCalls ? m.toolCalls.length : 0;

              return (
                <div key={m.id} className="w-full space-y-2">
                  {/* Stepped Multi-Tool Execution Accordion */}
                  {hasTools && (
                    <div className="border border-[var(--flint-border-base,#2a2a2a)] rounded-[6px] bg-[var(--flint-bg-card,#181818)] overflow-hidden select-none">
                      <button
                        type="button"
                        onClick={() => toggleSummaryExpanded(m.id)}
                        className="w-full px-2.5 py-1.5 flex items-center justify-between text-left text-[11px] text-[var(--flint-text-muted,#888888)] hover:text-[var(--flint-text-primary,#ffffff)] hover:bg-[var(--flint-bg-card-hover,#222222)] cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <LayersIcon size={12} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
                          <span className="truncate">
                            {readCount > 0 && `Read ${readCount} file${readCount > 1 ? 's' : ''}`}
                            {readCount > 0 && totalTools > readCount && `, ran ${totalTools - readCount} tool${totalTools - readCount > 1 ? 's' : ''}`}
                            {readCount === 0 && `Ran ${totalTools} tool${totalTools > 1 ? 's' : ''}`}
                            {m.elapsedTimeMs ? `, worked for ${formatDuration(m.elapsedTimeMs)}` : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {isSummaryExpanded ? <ChevronDownIcon size={11} /> : <ChevronRightIcon size={11} />}
                        </div>
                      </button>

                      {/* Granular Tool Logs Preview */}
                      {isSummaryExpanded && (
                        <div className="p-2 border-t border-[var(--flint-border-subtle,#222222)] bg-[var(--flint-bg-input,#121212)] space-y-1.5">
                          {m.toolCalls?.map((tc) => {
                            const isSuccess = tc.status === 'success';
                            const isError = tc.status === 'error';
                            const isRunning = tc.status === 'running';

                            const ToolIcon =
                              tc.name.includes('search') ? Search01Icon : tc.name.includes('read') ? BookOpen01Icon : Database01Icon;

                            return (
                              <div
                                key={tc.id}
                                className="p-2 rounded-[4px] border border-[var(--flint-border-subtle,#262626)] bg-[var(--flint-bg-card,#161616)] text-[10px] font-mono space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <ToolIcon size={11} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
                                    <span className="text-[var(--flint-text-primary,#dddddd)] truncate">{tc.name}</span>
                                  </div>
                                  <div>
                                    {isRunning && <span className="text-[var(--flint-text-muted,#888888)]">Running...</span>}
                                    {isSuccess && <CheckIcon size={11} className="text-[#22c55e]" />}
                                    {isError && <Alert02Icon size={11} className="text-[#ef4444]" />}
                                  </div>
                                </div>
                                <div className="text-[var(--flint-text-muted,#666666)] truncate">
                                  args: {JSON.stringify(tc.args)}
                                </div>
                                {tc.result && (
                                  <div className="text-[var(--flint-text-muted,#888888)] line-clamp-2">
                                    result: {tc.result}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stepped Edit Summary Bar if files were edited */}
                  {editCount > 0 && !hasTools && (
                    <div className="px-2.5 py-1.5 flex items-center gap-2 text-[11px] text-[var(--flint-text-muted,#888888)] border border-[var(--flint-border-base,#2a2a2a)] rounded-[6px] bg-[var(--flint-bg-card,#181818)] select-none">
                      <Edit02Icon size={12} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
                      <span>Edited {editCount} note{editCount > 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Assistant Prose Content with Wikilinks */}
                  <div className="text-[12px] leading-relaxed text-[var(--flint-text-primary,#dedede)] px-2.5">
                    <CopilotMarkdown content={m.content} onWikilinkClick={handleWikilinkClick} />
                  </div>

                  {/* Message Footer: Duration & Right-Aligned Action Icons */}
                  <div className="flex items-center justify-between pt-1 px-2.5 select-none text-[11px] text-[var(--flint-text-muted,#777777)]">
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--flint-text-muted,#777777)]">
                      {m.elapsedTimeMs ? (
                        <>
                          <CopilotMatrixLoader isWorking={false} />
                          <span>Worked for {formatDuration(m.elapsedTimeMs)}</span>
                        </>
                      ) : m.isStreaming ? (
                        <span className="flex items-center gap-1.5 text-[var(--flint-text-muted,#777777)]">
                          <CopilotMatrixLoader isWorking={true} />
                          <span>Working...</span>
                        </span>
                      ) : null}
                    </div>

                    {!m.isStreaming && m.content && (
                      <div className="flex items-center gap-0.5">
                        {(() => {
                          const { variants, currentIndex } = getMessageVariants(m.id);
                          const totalVariants = Math.max(1, variants.length);
                          const isFirstVariant = currentIndex <= 0;
                          const isLatestVariant = currentIndex >= totalVariants - 1;

                          return (
                            <>
                              {/* Left Chevron (<): Back to previous version */}
                              <Tooltip content={isFirstVariant ? '' : 'Previous version'}>
                                <button
                                  type="button"
                                  disabled={isGenerating || isFirstVariant}
                                  onClick={() => switchVariant(m.id, 'prev')}
                                  aria-label="Previous version"
                                  className={`w-6 h-6 rounded flex items-center justify-center ${
                                    isFirstVariant
                                      ? 'text-[var(--flint-text-muted,#777777)]/30 cursor-not-allowed'
                                      : 'text-[var(--flint-text-muted,#777777)] hover:text-[var(--flint-text-primary,#ffffff)] hover:bg-[var(--flint-bg-card-hover,#262626)] cursor-pointer'
                                  }`}
                                >
                                  <ArrowLeft01Icon size={12} />
                                </button>
                              </Tooltip>

                              {/* Subtle Version Counter (e.g. 1/2) */}
                              <span className="text-[10px] tabular-nums text-[var(--flint-text-muted,#777777)] select-none px-0.5">
                                {currentIndex + 1}/{totalVariants}
                              </span>

                              {/* Right Chevron (>): Next version if earlier version exists, or Regenerate if on latest */}
                              <Tooltip content={isLatestVariant ? 'Regenerate response' : 'Next version'}>
                                <button
                                  type="button"
                                  disabled={isGenerating}
                                  onClick={() => {
                                    if (isLatestVariant) {
                                      handleRegenerate(m.id);
                                    } else {
                                      switchVariant(m.id, 'next');
                                    }
                                  }}
                                  aria-label={isLatestVariant ? 'Regenerate response' : 'Next version'}
                                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--flint-text-muted,#777777)] hover:text-[var(--flint-text-primary,#ffffff)] hover:bg-[var(--flint-bg-card-hover,#262626)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <ArrowRight01Icon size={12} />
                                </button>
                              </Tooltip>

                              {/* Copy Message */}
                              <Tooltip content="Copy message">
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(m.content)}
                                  aria-label="Copy message"
                                  className="w-6 h-6 rounded flex items-center justify-center text-[var(--flint-text-muted,#777777)] hover:text-[var(--flint-text-primary,#ffffff)] hover:bg-[var(--flint-bg-card-hover,#262626)] cursor-pointer"
                                >
                                  <Copy01Icon size={12} />
                                </button>
                              </Tooltip>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── 3. Unified Chat Input Container ── */}
      {hasConfiguredKey && (
        <div className="px-3 pb-3 pt-0 bg-transparent shrink-0">
          <div className="p-2 rounded-[8px] border border-[#222222] bg-[#151515] shadow-lg shadow-black/40 space-y-1.5">
            {/* Context Pill Indicator if active note attached */}
            {includeActiveNoteContext && activeDoc?.title && (
              <div className="flex items-center justify-between px-2 py-0.5 rounded-[4px] bg-[#1a1a1a] border border-[#222222] text-[10.5px] text-[var(--flint-text-muted,#888888)]">
                <div className="flex items-center gap-1.5 truncate">
                  <File01Icon size={11} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
                  <span className="truncate">Active note: {activeDoc.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeActiveNoteContext(false)}
                  title="Remove note context"
                  className="hover:text-[var(--flint-text-primary,#ffffff)] text-[var(--flint-text-muted,#666666)] cursor-pointer px-1 font-mono"
                >
                  ×
                </button>
              </div>
            )}

            {/* Prompt Textarea: Sleek & Shorter at start */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, @ to add context, / for commands"
              className="w-full bg-transparent border-none outline-none text-xs text-[var(--flint-text-primary,#ffffff)] placeholder:text-[var(--flint-text-muted,#666666)] resize-none min-h-[22px] max-h-32 px-1 py-0.5 leading-normal custom-scrollbar block"
            />

            {/* Bottom Inner Controls Bar (No Divider) */}
            <div className="flex items-center justify-between pt-0.5 gap-2 select-none">
              {/* Left Group: Context Attachment '+' & Model Selector */}
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Context Attach Button */}
                <Tooltip content={includeActiveNoteContext ? 'Context attached: active note' : 'Attach active note context'}>
                  <button
                    type="button"
                    onClick={() => setIncludeActiveNoteContext(!includeActiveNoteContext)}
                    className={`w-6 h-6 flex items-center justify-center cursor-pointer ${
                      includeActiveNoteContext
                        ? 'rounded bg-[var(--flint-accent,#ea580c)]/15 text-[var(--flint-accent,#ea580c)] border border-[var(--flint-accent,#ea580c)]/30'
                        : 'text-[var(--flint-text-muted,#777777)] hover:text-[var(--flint-text-primary,#ffffff)]'
                    }`}
                  >
                    <PlusSignIcon size={13} />
                  </button>
                </Tooltip>

                {/* Model Selector: Just model name in plus button color, Y-centered, with chevron */}
                {hasConfiguredKey && modelOptions.length > 0 ? (
                  <>
                    <button
                      ref={modelTriggerRef}
                      type="button"
                      onClick={handleToggleModelMenu}
                      className="h-6 flex items-center gap-1 text-[11px] font-medium text-[var(--flint-text-muted,#777777)] hover:text-[var(--flint-text-primary,#ffffff)] cursor-pointer select-none"
                    >
                      <span className="truncate max-w-[140px]">{currentModelLabel}</span>
                      <ChevronDownIcon size={10} className="shrink-0 opacity-70" />
                    </button>

                    {isModelMenuOpen &&
                      createPortal(
                        <div
                          ref={modelMenuRef}
                          style={{
                            position: 'fixed',
                            bottom: `${modelMenuCoords.bottom}px`,
                            left: `${modelMenuCoords.left}px`,
                            zIndex: 99999,
                          }}
                          className="w-max min-w-[180px] max-w-[280px] max-h-60 overflow-y-auto bg-[var(--flint-bg-card,#1a1a1a)] border border-[var(--flint-border-base,#282828)] rounded-[6px] p-1 shadow-lg shadow-black/60 select-none custom-scrollbar"
                        >
                          {modelOptions.map((opt) => {
                            const isSelected = opt.value === currentModel;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  if (provider) setModel(provider, opt.value);
                                  setIsModelMenuOpen(false);
                                }}
                                className={`w-full px-2 py-1.5 rounded-[4px] text-left text-[11px] flex items-center justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-[var(--flint-accent,#ea580c)]/15 text-[var(--flint-accent,#ea580c)] font-medium'
                                    : 'text-[var(--flint-text-secondary,#bbbbbb)] hover:text-[var(--flint-text-primary,#ffffff)] hover:bg-[var(--flint-bg-card-hover,#242424)]'
                                }`}
                              >
                                <span className="truncate">{opt.label}</span>
                                {isSelected && <CheckIcon size={12} className="text-[var(--flint-accent,#ea580c)] shrink-0" />}
                              </button>
                            );
                          })}
                        </div>,
                        document.body
                      )}
                  </>
                ) : (
                  <Tooltip content="You have to put in an API key first to check for available models">
                    <span className="h-6 flex items-center text-[11px] font-medium text-[var(--flint-text-muted,#777777)] truncate cursor-not-allowed">
                      No model selected
                    </span>
                  </Tooltip>
                )}
              </div>

              {/* Right Group: Mode Selector ('Auto' / 'Chat only') & Circular Send / Stop */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Mode Selector */}
                <Tooltip content="Tool execution mode">
                  <button
                    type="button"
                    onClick={() => setToolMode(toolMode === 'auto' ? 'chat_only' : 'auto')}
                    className="h-6 flex items-center gap-1 text-[11px] font-medium text-[var(--flint-text-muted,#888888)] hover:text-[var(--flint-text-primary,#ffffff)] cursor-pointer select-none"
                  >
                    <span className={toolMode === 'auto' ? 'text-[var(--flint-accent,#ea580c)]' : ''}>
                      {toolMode === 'auto' ? 'Auto' : 'Chat'}
                    </span>
                    <ChevronDownIcon size={10} className="shrink-0 opacity-70" />
                  </button>
                </Tooltip>

                {/* Square Send / Stop Button with native flint-btn styling */}
                {isGenerating ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    title="Stop Generating"
                    className="flint-btn flint-btn-danger w-7 h-7 !p-0 !rounded-[5px] flex items-center justify-center cursor-pointer"
                  >
                    <SquareIcon size={11} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputVal.trim()}
                    title="Send Message (Enter)"
                    className="flint-btn w-7 h-7 !p-0 !rounded-[5px] flex items-center justify-center text-[var(--flint-text-secondary,#dddddd)] hover:text-[var(--flint-text-primary,#ffffff)]"
                  >
                    <ArrowUp01Icon size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
