/**
 * @module CopilotStore
 * @description
 * Reactive Zustand state manager for Copilot For Flint.
 * Manages multi-provider BYOK configurations, persistent API keys, chat message history,
 * active model selection, MCP tool availability toggles, streaming lifecycle, and
 * dynamic live model discovery cache.
 *
 * Persists user configuration to localStorage for instantaneous restoration upon app launch.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import { create } from 'zustand';
import {
  CopilotProvider,
  ProviderMetadata,
  ModelOption,
  PROVIDER_CATALOG,
  fetchLiveModels,
} from './copilotModels';

export type { CopilotProvider, ProviderMetadata, ModelOption };
export { PROVIDER_CATALOG };

export interface ToolExecutionDetail {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'running' | 'success' | 'error';
  result?: string;
  error?: string;
}

export interface CopilotMessage {
  id: string;
  parentId?: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  toolCalls?: ToolExecutionDetail[];
  elapsedTimeMs?: number;
  thoughtDurationMs?: number;
  toolsExecutedCount?: number;
  filesReadCount?: number;
  filesEditedCount?: number;
}

export interface CopilotSession {
  id: string;
  topic: string;
  icon: string;
  messages: CopilotMessage[];
  activeVariantMap?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Normalizes legacy flat message histories to ensure every message has a deterministic parentId.
 */
export function normalizeSessionMessages(messages: CopilotMessage[]): CopilotMessage[] {
  if (!messages || messages.length === 0) return [];
  let prevId: string | null = null;
  return messages.map((m, idx) => {
    if (m.parentId === undefined) {
      const parentId = idx === 0 ? null : prevId;
      prevId = m.id;
      return { ...m, parentId };
    }
    prevId = m.id;
    return m;
  });
}

/**
 * Reconstructs the active linear conversation thread from the DAG starting from the root,
 * following the activeVariantMap selections at each branching point.
 */
export function computeActiveThread(
  messages: CopilotMessage[],
  activeVariantMap: Record<string, string> = {}
): CopilotMessage[] {
  if (!messages || messages.length === 0) return [];

  // Group children by parentId
  const childrenMap = new Map<string | null, CopilotMessage[]>();
  for (const msg of messages) {
    const pId = msg.parentId ?? null;
    const list = childrenMap.get(pId) || [];
    list.push(msg);
    childrenMap.set(pId, list);
  }

  // Find root message(s)
  const roots = childrenMap.get(null) || [];
  if (roots.length === 0) {
    // If no explicit root exists, fallback to sequential messages
    return messages;
  }

  const thread: CopilotMessage[] = [];
  const selectedRootId = activeVariantMap['root'];
  let current: CopilotMessage | undefined =
    roots.find((r) => r.id === selectedRootId) || roots[roots.length - 1];

  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    thread.push(current);

    const children = childrenMap.get(current.id);
    if (!children || children.length === 0) {
      break;
    }

    const selectedChildId: string | undefined = activeVariantMap[current.id];
    current =
      children.find((c) => c.id === selectedChildId) ||
      children[children.length - 1];
  }

  return thread;
}

export interface CopilotSettingsState {
  // BYOK Credentials & Model Config
  provider: CopilotProvider | null;
  models: Record<CopilotProvider, string>;
  apiKeys: Record<CopilotProvider, string>;
  customEndpoint: string;
  systemPrompt: string;
  includeActiveNoteContext: boolean;
  enableMcpTools: boolean;
  toolMode: 'auto' | 'chat_only';
  temperature: number;
  maxTokens: number;

  // Multi-Session Management
  sessions: CopilotSession[];
  activeSessionId: string;
  sessionTopic: string;

  // Dynamic Live Models Discovery State
  fetchedModels: Record<CopilotProvider, ModelOption[]>;
  isFetchingModels: boolean;
  fetchModelsError: string | null;

  // Chat Execution State
  messages: CopilotMessage[];
  isGenerating: boolean;
  abortController: AbortController | null;

  // Setters
  setProvider: (provider: CopilotProvider | null) => void;
  setModel: (provider: CopilotProvider, model: string) => void;
  setApiKey: (provider: CopilotProvider, key: string) => void;
  setCustomEndpoint: (endpoint: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setIncludeActiveNoteContext: (include: boolean) => void;
  setEnableMcpTools: (enabled: boolean) => void;
  setToolMode: (mode: 'auto' | 'chat_only') => void;
  setSessionTopic: (topic: string) => void;
  createNewSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  updateSessionIcon: (sessionId: string, icon: string) => void;
  updateSessionTopic: (sessionId: string, topic: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setFetchedModels: (provider: CopilotProvider, models: ModelOption[]) => void;
  refreshModels: (providerOverride?: CopilotProvider) => Promise<void>;

  // Message Operations
  setMessages: (messages: CopilotMessage[]) => void;
  addMessage: (message: CopilotMessage) => void;
  updateMessage: (id: string, updater: Partial<CopilotMessage> | ((prev: CopilotMessage) => CopilotMessage)) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;

  // Branch & Version Navigation
  getMessageVariants: (messageId: string) => { variants: CopilotMessage[]; currentIndex: number };
  switchVariant: (messageId: string, direction: 'prev' | 'next') => void;

  // Generator Lifecycle
  setIsGenerating: (generating: boolean) => void;
  setAbortController: (ctrl: AbortController | null) => void;
  stopGeneration: () => void;

  // Draft Input / External Prompt Prefill
  draftPrompt: string;
  setDraftPrompt: (prompt: string) => void;

  // Defaults
  restoreDefaults: () => void;
}

const SETTINGS_STORAGE_KEY = 'flint_copilot_settings_v1';
const HISTORY_STORAGE_KEY = 'flint_copilot_history_v1';

export const DEFAULT_SYSTEM_PROMPT =
  'You are Copilot for Flint, an intelligent, concise, and focused AI assistant embedded directly inside the user’s personal knowledge workspace. ' +
  'You have full access to workspace tools through Flint’s native Model Context Protocol (MCP) to read, search, list, and modify notes, backlinks, and tags. ' +
  'When referencing notes, provide clean markdown links or summaries. Keep responses sharp, accurate, and immediately useful. ' +
  'Never make up facts about the user’s vault: if you need to know what notes exist or what a note contains, call the appropriate workspace tool.';

function loadPersistedSettings(): Partial<CopilotSettingsState> {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadPersistedHistory(): CopilotMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSettings(state: CopilotSettingsState) {
  try {
    const payload = {
      provider: state.provider,
      models: state.models,
      apiKeys: state.apiKeys,
      customEndpoint: state.customEndpoint,
      systemPrompt: state.systemPrompt,
      includeActiveNoteContext: state.includeActiveNoteContext,
      enableMcpTools: state.enableMcpTools,
      toolMode: state.toolMode,
      sessionTopic: state.sessionTopic,
      temperature: state.temperature,
      maxTokens: state.maxTokens,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('[CopilotStore] Failed to save settings:', err);
  }
}

function persistHistory(messages: CopilotMessage[]) {
  try {
    // Retain only the most recent 100 messages for storage efficiency
    const sanitized = messages.slice(-100).map((m) => ({
      ...m,
      isStreaming: false,
    }));
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('[CopilotStore] Failed to save chat history:', err);
  }
}

const SESSIONS_STORAGE_KEY = 'flint_copilot_sessions_v2';
const ACTIVE_SESSION_STORAGE_KEY = 'flint_copilot_active_session_v1';

function loadPersistedSessions(
  fallbackHistory: CopilotMessage[],
  fallbackTopic: string
): { sessions: CopilotSession[]; activeSessionId: string } {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    let sessions: CopilotSession[] = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(sessions) || sessions.length === 0) {
      const initialId = `sess-${Date.now()}`;
      const normalizedFallback = normalizeSessionMessages(fallbackHistory);
      sessions = [
        {
          id: initialId,
          topic: fallbackTopic || 'New Chat',
          icon: 'ChatIcon',
          messages: normalizedFallback,
          activeVariantMap: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
    } else {
      sessions = sessions.map((s) => ({
        ...s,
        messages: normalizeSessionMessages(s.messages || []),
        activeVariantMap: s.activeVariantMap || {},
      }));
    }

    const savedActiveId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    const activeSessionId =
      savedActiveId && sessions.some((s) => s.id === savedActiveId)
        ? savedActiveId
        : sessions[0].id;

    return { sessions, activeSessionId };
  } catch {
    const initialId = `sess-${Date.now()}`;
    return {
      sessions: [
        {
          id: initialId,
          topic: 'New Chat',
          icon: 'ChatIcon',
          messages: [],
          activeVariantMap: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      activeSessionId: initialId,
    };
  }
}

function persistSessions(sessions: CopilotSession[], activeSessionId: string) {
  try {
    const sanitized = sessions.map((s) => ({
      ...s,
      messages: s.messages.slice(-200).map((m) => ({ ...m, isStreaming: false })),
      activeVariantMap: s.activeVariantMap || {},
    }));
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sanitized));
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
  } catch (err) {
    console.error('[CopilotStore] Failed to save sessions:', err);
  }
}

const saved = loadPersistedSettings();
const savedHistory = loadPersistedHistory();
const { sessions: initialSessions, activeSessionId: initialActiveSessionId } =
  loadPersistedSessions(savedHistory, saved.sessionTopic || 'New Chat');
const activeSession =
  initialSessions.find((s) => s.id === initialActiveSessionId) || initialSessions[0];
const initialActiveThread = computeActiveThread(
  activeSession.messages,
  activeSession.activeVariantMap
);

const defaultModels: Record<CopilotProvider, string> = {
  anthropic: PROVIDER_CATALOG.anthropic.defaultModel,
  openai: PROVIDER_CATALOG.openai.defaultModel,
  gemini: PROVIDER_CATALOG.gemini.defaultModel,
  deepseek: PROVIDER_CATALOG.deepseek.defaultModel,
  openrouter: PROVIDER_CATALOG.openrouter.defaultModel,
  custom: PROVIDER_CATALOG.custom.defaultModel,
};

const defaultKeys: Record<CopilotProvider, string> = {
  anthropic: '',
  openai: '',
  gemini: '',
  deepseek: '',
  openrouter: '',
  custom: '',
};

const initialFetchedModels: Record<CopilotProvider, ModelOption[]> = {
  anthropic: PROVIDER_CATALOG.anthropic.recommendedModels,
  openai: PROVIDER_CATALOG.openai.recommendedModels,
  gemini: PROVIDER_CATALOG.gemini.recommendedModels,
  deepseek: PROVIDER_CATALOG.deepseek.recommendedModels,
  openrouter: PROVIDER_CATALOG.openrouter.recommendedModels,
  custom: PROVIDER_CATALOG.custom.recommendedModels,
};

const validProviders: CopilotProvider[] = ['anthropic', 'openai', 'gemini', 'deepseek', 'openrouter', 'custom'];
const initialProvider: CopilotProvider | null =
  saved.provider && validProviders.includes(saved.provider as CopilotProvider) ? (saved.provider as CopilotProvider) : null;

// Resolve initial models, falling back to default catalog model if saved value is empty
const initialModels: Record<CopilotProvider, string> = { ...defaultModels };
if (saved.models) {
  for (const p of validProviders) {
    if (saved.models[p]) {
      initialModels[p] = saved.models[p];
    }
  }
}

export const useCopilotStore = create<CopilotSettingsState>((set, get) => ({
  provider: initialProvider,
  models: initialModels,
  apiKeys: { ...defaultKeys, ...(saved.apiKeys || {}) },
  customEndpoint: saved.customEndpoint || 'http://localhost:11434/v1',
  systemPrompt: saved.systemPrompt !== undefined ? saved.systemPrompt : DEFAULT_SYSTEM_PROMPT,
  includeActiveNoteContext: saved.includeActiveNoteContext !== undefined ? saved.includeActiveNoteContext : true,
  enableMcpTools: saved.enableMcpTools !== undefined ? saved.enableMcpTools : true,
  toolMode: saved.toolMode === 'chat_only' ? 'chat_only' : 'auto',
  sessions: initialSessions,
  activeSessionId: activeSession.id,
  sessionTopic: activeSession.topic,
  temperature: saved.temperature !== undefined ? saved.temperature : 0.7,
  maxTokens: saved.maxTokens !== undefined ? saved.maxTokens : 2048,

  fetchedModels: initialFetchedModels,
  isFetchingModels: false,
  fetchModelsError: null,

  messages: initialActiveThread,
  isGenerating: false,
  abortController: null,

  draftPrompt: '',
  setDraftPrompt: (prompt) => set({ draftPrompt: prompt }),

  setProvider: (provider) => {
    set({ provider });
    persistSettings(get());
    if (provider) {
      if (!get().models[provider] && PROVIDER_CATALOG[provider]?.defaultModel) {
        get().setModel(provider, PROVIDER_CATALOG[provider].defaultModel);
      }
      get().refreshModels(provider);
    }
  },

  setModel: (provider, model) => {
    const nextModels = { ...get().models, [provider]: model };
    set({ models: nextModels });
    persistSettings(get());
  },

  setApiKey: (provider, key) => {
    const trimmed = key.trim();
    const nextKeys = { ...get().apiKeys, [provider]: trimmed };
    set({ apiKeys: nextKeys });
    persistSettings(get());
    if (trimmed) {
      get().refreshModels(provider);
    }
  },

  setCustomEndpoint: (endpoint) => {
    set({ customEndpoint: endpoint.trim() });
    persistSettings(get());
    if (get().provider === 'custom') {
      get().refreshModels('custom');
    }
  },

  setSystemPrompt: (systemPrompt) => {
    set({ systemPrompt });
    persistSettings(get());
  },

  setIncludeActiveNoteContext: (includeActiveNoteContext) => {
    set({ includeActiveNoteContext });
    persistSettings(get());
  },

  setEnableMcpTools: (enableMcpTools) => {
    set({ enableMcpTools });
    persistSettings(get());
  },

  setToolMode: (toolMode) => {
    set({ toolMode });
    persistSettings(get());
  },

  setSessionTopic: (sessionTopic) => {
    const activeId = get().activeSessionId;
    const nextSessions = get().sessions.map((s) =>
      s.id === activeId ? { ...s, topic: sessionTopic, updatedAt: Date.now() } : s
    );
    set({ sessionTopic, sessions: nextSessions });
    persistSessions(nextSessions, activeId);
    persistSettings(get());
  },

  createNewSession: () => {
    const { sessions, activeSessionId, abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    const active = sessions.find((s) => s.id === activeSessionId);
    if (active && active.messages.length === 0 && active.topic === 'New Chat') {
      return;
    }

    const newId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newSession: CopilotSession = {
      id: newId,
      topic: 'New Chat',
      icon: 'ChatIcon',
      messages: [],
      activeVariantMap: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const nextSessions = [...sessions, newSession];
    set({
      sessions: nextSessions,
      activeSessionId: newId,
      sessionTopic: 'New Chat',
      messages: [],
      isGenerating: false,
      abortController: null,
    });
    persistSessions(nextSessions, newId);
    persistHistory([]);
    persistSettings(get());
  },

  switchSession: (sessionId: string) => {
    const { sessions, activeSessionId, abortController } = get();
    if (sessionId === activeSessionId) return;
    if (abortController) {
      abortController.abort();
    }
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) return;

    const normalized = normalizeSessionMessages(target.messages);
    const activeThread = computeActiveThread(normalized, target.activeVariantMap);

    set({
      activeSessionId: target.id,
      sessionTopic: target.topic,
      messages: activeThread,
      isGenerating: false,
      abortController: null,
    });
    persistSessions(sessions, target.id);
    persistHistory(activeThread);
  },

  deleteSession: (sessionId: string) => {
    const { sessions, activeSessionId, abortController } = get();
    if (sessions.length <= 1) {
      if (abortController) abortController.abort();
      const freshId = `sess-${Date.now()}`;
      const freshSession: CopilotSession = {
        id: freshId,
        topic: 'New Chat',
        icon: 'ChatIcon',
        messages: [],
        activeVariantMap: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set({
        sessions: [freshSession],
        activeSessionId: freshId,
        sessionTopic: 'New Chat',
        messages: [],
        isGenerating: false,
        abortController: null,
      });
      persistSessions([freshSession], freshId);
      persistHistory([]);
      return;
    }

    const nextSessions = sessions.filter((s) => s.id !== sessionId);
    let nextActiveId = activeSessionId;
    if (activeSessionId === sessionId) {
      if (abortController) abortController.abort();
      const removedIndex = sessions.findIndex((s) => s.id === sessionId);
      const nextIndex = Math.max(0, Math.min(removedIndex, nextSessions.length - 1));
      nextActiveId = nextSessions[nextIndex].id;
    }

    const active = nextSessions.find((s) => s.id === nextActiveId) || nextSessions[0];
    const normalized = normalizeSessionMessages(active.messages);
    const activeThread = computeActiveThread(normalized, active.activeVariantMap);

    set({
      sessions: nextSessions,
      activeSessionId: active.id,
      sessionTopic: active.topic,
      messages: activeThread,
      isGenerating: activeSessionId === sessionId ? false : get().isGenerating,
    });
    persistSessions(nextSessions, active.id);
    persistHistory(activeThread);
  },

  updateSessionIcon: (sessionId: string, icon: string) => {
    const nextSessions = get().sessions.map((s) =>
      s.id === sessionId ? { ...s, icon, updatedAt: Date.now() } : s
    );
    set({ sessions: nextSessions });
    persistSessions(nextSessions, get().activeSessionId);
  },

  updateSessionTopic: (sessionId: string, topic: string) => {
    const nextSessions = get().sessions.map((s) =>
      s.id === sessionId ? { ...s, topic, updatedAt: Date.now() } : s
    );
    set({
      sessions: nextSessions,
      sessionTopic: sessionId === get().activeSessionId ? topic : get().sessionTopic,
    });
    persistSessions(nextSessions, get().activeSessionId);
    persistSettings(get());
  },

  setTemperature: (temperature) => {
    set({ temperature });
    persistSettings(get());
  },

  setMaxTokens: (maxTokens) => {
    set({ maxTokens });
    persistSettings(get());
  },

  setFetchedModels: (provider, models) => {
    set((state) => ({
      fetchedModels: {
        ...state.fetchedModels,
        [provider]: models,
      },
    }));
  },

  refreshModels: async (providerOverride?: CopilotProvider) => {
    const targetProvider = providerOverride || get().provider;
    if (!targetProvider) return;

    const apiKey = get().apiKeys[targetProvider] || '';
    const customEndpoint = get().customEndpoint;

    // If no credentials for provider, clear fetchedModels and do not query
    if (!apiKey && targetProvider !== 'custom') {
      set((state) => ({
        fetchedModels: {
          ...state.fetchedModels,
          [targetProvider]: [],
        },
        isFetchingModels: false,
      }));
      return;
    }

    set({ isFetchingModels: true, fetchModelsError: null });

    try {
      const live = await fetchLiveModels(targetProvider, apiKey, customEndpoint);
      set((state) => ({
        fetchedModels: {
          ...state.fetchedModels,
          [targetProvider]: live || [],
        },
        isFetchingModels: false,
      }));

      if (live && live.length > 0) {
        const currentSelected = get().models[targetProvider];
        const exists = live.some((m) => m.value === currentSelected);
        if (!exists && live[0]) {
          get().setModel(targetProvider, live[0].value);
        }
      }
    } catch (err: any) {
      set({
        isFetchingModels: false,
        fetchModelsError: err.message || 'Failed to fetch live models.',
      });
    }
  },

  setMessages: (messages) => {
    const { sessions, activeSessionId } = get();
    const normalized = normalizeSessionMessages(messages);
    const activeThread = computeActiveThread(normalized);
    const nextSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? { ...s, messages: normalized, activeVariantMap: {}, updatedAt: Date.now() }
        : s
    );
    set({ messages: activeThread, sessions: nextSessions });
    persistHistory(activeThread);
    persistSessions(nextSessions, activeSessionId);
  },

  addMessage: (message) => {
    const { sessions, activeSessionId, messages } = get();
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) return;

    let parentId = message.parentId;
    if (parentId === undefined) {
      const lastActive = messages[messages.length - 1];
      parentId = lastActive ? lastActive.id : null;
    }

    const normalizedMessage: CopilotMessage = {
      ...message,
      parentId,
    };

    const parentKey = parentId ?? 'root';
    const nextVariantMap = {
      ...(session.activeVariantMap || {}),
      [parentKey]: normalizedMessage.id,
    };

    const nextSessionMessages = [...session.messages, normalizedMessage];
    const nextActiveThread = computeActiveThread(nextSessionMessages, nextVariantMap);

    const nextSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? {
            ...s,
            messages: nextSessionMessages,
            activeVariantMap: nextVariantMap,
            updatedAt: Date.now(),
          }
        : s
    );

    set({
      sessions: nextSessions,
      messages: nextActiveThread,
    });

    persistSessions(nextSessions, activeSessionId);
    persistHistory(nextActiveThread);
  },

  updateMessage: (id, updater) => {
    const { sessions, activeSessionId, messages } = get();
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) return;

    const updateMsg = (m: CopilotMessage) => {
      if (m.id !== id) return m;
      if (typeof updater === 'function') {
        return updater(m);
      }
      return { ...m, ...updater };
    };

    const nextSessionMessages = session.messages.map(updateMsg);
    const nextActiveThread = messages.map(updateMsg);

    const nextSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? { ...s, messages: nextSessionMessages, updatedAt: Date.now() }
        : s
    );

    set({ messages: nextActiveThread, sessions: nextSessions });
    persistHistory(nextActiveThread);
    persistSessions(nextSessions, activeSessionId);
  },

  deleteMessage: (id) => {
    const { sessions, activeSessionId } = get();
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) return;

    // Collect message and all its recursive descendant IDs
    const toDelete = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const m of session.messages) {
        if (m.parentId && toDelete.has(m.parentId) && !toDelete.has(m.id)) {
          toDelete.add(m.id);
          added = true;
        }
      }
    }

    const nextSessionMessages = session.messages.filter((m) => !toDelete.has(m.id));
    const nextVariantMap = { ...(session.activeVariantMap || {}) };
    for (const [parentKey, childId] of Object.entries(nextVariantMap)) {
      if (toDelete.has(parentKey) || toDelete.has(childId)) {
        delete nextVariantMap[parentKey];
      }
    }

    const nextActiveThread = computeActiveThread(nextSessionMessages, nextVariantMap);

    const nextSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? {
            ...s,
            messages: nextSessionMessages,
            activeVariantMap: nextVariantMap,
            updatedAt: Date.now(),
          }
        : s
    );

    set({ messages: nextActiveThread, sessions: nextSessions });
    persistHistory(nextActiveThread);
    persistSessions(nextSessions, activeSessionId);
  },

  clearMessages: () => {
    const { sessions, activeSessionId } = get();
    const nextSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? { ...s, messages: [], activeVariantMap: {}, updatedAt: Date.now() }
        : s
    );
    set({ messages: [], sessions: nextSessions });
    persistHistory([]);
    persistSessions(nextSessions, activeSessionId);
  },

  getMessageVariants: (messageId: string) => {
    const { sessions, activeSessionId } = get();
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) return { variants: [], currentIndex: -1 };

    const target = session.messages.find((m) => m.id === messageId);
    if (!target) return { variants: [], currentIndex: -1 };

    const parentId = target.parentId ?? null;
    const variants = session.messages.filter(
      (m) => (m.parentId ?? null) === parentId && m.role === target.role
    );
    const currentIndex = variants.findIndex((m) => m.id === target.id);

    return { variants, currentIndex: Math.max(0, currentIndex) };
  },

  switchVariant: (messageId: string, direction: 'prev' | 'next') => {
    const { sessions, activeSessionId, getMessageVariants } = get();
    const session = sessions.find((s) => s.id === activeSessionId);
    if (!session) return;

    const { variants, currentIndex } = getMessageVariants(messageId);
    if (variants.length <= 1) return;

    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= variants.length) return;

    const target = variants[targetIndex];
    const parentKey = target.parentId ?? 'root';

    const nextVariantMap = {
      ...(session.activeVariantMap || {}),
      [parentKey]: target.id,
    };

    const nextSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? {
            ...s,
            activeVariantMap: nextVariantMap,
            updatedAt: Date.now(),
          }
        : s
    );

    const activeThread = computeActiveThread(session.messages, nextVariantMap);

    set({
      sessions: nextSessions,
      messages: activeThread,
    });

    persistSessions(nextSessions, activeSessionId);
    persistHistory(activeThread);
  },

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setAbortController: (abortController) => set({ abortController }),

  stopGeneration: () => {
    const ctrl = get().abortController;
    if (ctrl) {
      ctrl.abort();
    }
    set({ isGenerating: false, abortController: null });
  },

  restoreDefaults: () => {
    set({
      provider: null,
      models: { ...defaultModels },
      customEndpoint: 'http://localhost:11434/v1',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      includeActiveNoteContext: true,
      enableMcpTools: true,
      temperature: 0.7,
      maxTokens: 2048,
      fetchedModels: initialFetchedModels,
    });
    persistSettings(get());
  },
}));

// Auto-fetch live models on startup if provider and credentials are configured
if (initialProvider) {
  const initialKey = (saved.apiKeys || {})[initialProvider];
  if (initialProvider === 'custom' || (initialKey && initialKey.trim())) {
    setTimeout(() => {
      useCopilotStore.getState().refreshModels(initialProvider);
    }, 0);
  }
}

