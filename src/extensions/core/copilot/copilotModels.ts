/**
 * @module CopilotModels
 * @description
 * Provider catalogs, modern flagship LLM defaults, and dynamic live model discovery for Copilot For Flint.
 * Queries provider APIs dynamically to retrieve up-to-date models without hardcoded obsolescence.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

export type CopilotProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'custom';

export interface ModelOption {
  value: string;
  label: string;
  description?: string;
}

export interface ProviderMetadata {
  id: CopilotProvider;
  name: string;
  brandLabel: string;
  dashboardUrl: string;
  defaultEndpoint: string;
  defaultModel: string;
  recommendedModels: ModelOption[];
  keyPlaceholder: string;
  guideTitle: string;
  guideSteps: string[];
}

export const PROVIDER_CATALOG: Record<CopilotProvider, ProviderMetadata> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    brandLabel: 'Claude',
    dashboardUrl: 'https://console.anthropic.com/settings/keys',
    defaultEndpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-7-sonnet-latest',
    recommendedModels: [
      { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet', description: 'Flagship hybrid reasoning & coding' },
      { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', description: 'State-of-the-art vision & markdown analysis' },
      { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', description: 'Ultra-fast, cost-effective daily assistant' },
    ],
    keyPlaceholder: 'sk-ant-api03-...',
    guideTitle: 'Get an Anthropic API Key',
    guideSteps: [
      'Navigate to console.anthropic.com/settings/keys.',
      'Log in or register your Anthropic account.',
      'Click "Create Key", assign a name (e.g. "Flint Copilot"), and copy the generated secret key.',
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    brandLabel: 'ChatGPT',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    defaultEndpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    recommendedModels: [
      { value: 'gpt-4o', label: 'GPT-4o', description: 'Flagship high-intelligence multimodal model' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast, lightweight daily tasks assistant' },
      { value: 'o3-mini', label: 'o3-mini', description: 'High-speed reasoning, science, and coding' },
      { value: 'o1', label: 'o1', description: 'Deep reasoning & complex system analysis' },
      { value: 'chatgpt-4o-latest', label: 'ChatGPT-4o (Dynamic)', description: 'Continuously updated ChatGPT research model' },
    ],
    keyPlaceholder: 'sk-proj-...',
    guideTitle: 'Get an OpenAI API Key',
    guideSteps: [
      'Navigate to platform.openai.com/api-keys.',
      'Log in with your OpenAI account.',
      'Click "+ Create new secret key", copy the key string, and paste it below.',
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    brandLabel: 'Gemini',
    dashboardUrl: 'https://aistudio.google.com/app/apikey',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    recommendedModels: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Next-gen sub-second real-time speed' },
      { value: 'gemini-2.0-flash-thinking-exp-01-21', label: 'Gemini 2.0 Flash Thinking', description: 'Deep reasoning chain-of-thought' },
      { value: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro (Experimental)', description: 'Complex code & high-capacity synthesis' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: '2M token long-context vault analysis' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Fast, efficient multimodal' },
    ],
    keyPlaceholder: 'AIzaSy...',
    guideTitle: 'Get a Google Gemini API Key',
    guideSteps: [
      'Navigate to Google AI Studio at aistudio.google.com/app/apikey.',
      'Sign in with your Google account.',
      'Click "Create API key", select an existing project or create one, and copy the key.',
    ],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    brandLabel: 'DeepSeek',
    dashboardUrl: 'https://platform.deepseek.com/api_keys',
    defaultEndpoint: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    recommendedModels: [
      { value: 'deepseek-chat', label: 'DeepSeek-V3', description: 'Leading open-architecture workspace assistant' },
      { value: 'deepseek-reasoner', label: 'DeepSeek-R1', description: 'State-of-the-art chain-of-thought reasoning' },
    ],
    keyPlaceholder: 'sk-...',
    guideTitle: 'Get a DeepSeek API Key',
    guideSteps: [
      'Navigate to platform.deepseek.com/api_keys.',
      'Sign in or create your DeepSeek developer account.',
      'Click "Create API key" and paste your token below.',
    ],
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    brandLabel: 'OpenRouter',
    dashboardUrl: 'https://openrouter.ai/keys',
    defaultEndpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    recommendedModels: [
      { value: 'anthropic/claude-3.7-sonnet', label: 'Claude 3.7 Sonnet', description: 'Via OpenRouter router' },
      { value: 'openai/gpt-4o', label: 'GPT-4o', description: 'Via OpenRouter router' },
      { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1', description: 'Via OpenRouter router' },
      { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', description: 'Via OpenRouter router' },
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', description: 'Open-weights flagship' },
    ],
    keyPlaceholder: 'sk-or-v1-...',
    guideTitle: 'Get an OpenRouter API Key',
    guideSteps: [
      'Navigate to openrouter.ai/keys.',
      'Connect via GitHub or Google.',
      'Generate a new API key with your desired credit limit.',
    ],
  },
  custom: {
    id: 'custom',
    name: 'Local / Custom Endpoint',
    brandLabel: 'Custom',
    dashboardUrl: 'http://localhost:11434',
    defaultEndpoint: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    recommendedModels: [
      { value: 'llama3.2', label: 'Llama 3.2', description: 'Local Ollama model' },
      { value: 'deepseek-r1:8b', label: 'DeepSeek R1 8B', description: 'Local Ollama reasoning' },
      { value: 'qwen2.5:7b', label: 'Qwen 2.5 7B', description: 'Local Ollama multilingual coding' },
      { value: 'mistral', label: 'Mistral 7B', description: 'Local Ollama model' },
    ],
    keyPlaceholder: 'ollama (or leave blank if unauthenticated)',
    guideTitle: 'Connect to Local Ollama or LM Studio',
    guideSteps: [
      'Ensure Ollama or LM Studio is running locally (e.g. `ollama serve`).',
      'Set Endpoint to your local URL (default: http://localhost:11434/v1).',
      'Click refresh to automatically discover installed models.',
    ],
  },
};

/**
 * Fetches the live available model list dynamically from the provider's API.
 * Falls back to modern curated defaults if the API call fails or before key entry.
 */
export async function fetchLiveModels(
  provider: CopilotProvider,
  apiKey: string,
  customEndpoint: string
): Promise<ModelOption[]> {
  const trimmedKey = (apiKey || '').trim();

  // If no credentials supplied and provider requires authentication, return empty list
  if (!trimmedKey && provider !== 'custom') {
    return [];
  }

  try {
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': trimmedKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          const list: ModelOption[] = data.data.map((m: any) => ({
            value: m.id,
            label: m.display_name || formatModelLabel(m.id),
          }));

          // Sort so 3.7 Sonnet, 3.5 Sonnet, and 3.5 Haiku are prioritized
          return sortModels(list, ['claude-3-7-sonnet', 'claude-3-5-sonnet', 'claude-3-5-haiku']);
        }
      }
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${trimmedKey}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          // Filter to conversational chat completion models
          const chatModels = data.data
            .map((m: any) => m.id as string)
            .filter((id: string) => {
              const lower = id.toLowerCase();
              return (
                (lower.startsWith('gpt-4') || lower.startsWith('o1') || lower.startsWith('o3') || lower.startsWith('chatgpt')) &&
                !lower.includes('realtime') &&
                !lower.includes('audio') &&
                !lower.includes('transcription') &&
                !lower.includes('embedding') &&
                !lower.includes('tts') &&
                !lower.includes('moderation') &&
                !lower.includes('whisper') &&
                !lower.includes('dall-e')
              );
            });

          if (chatModels.length > 0) {
            const list: ModelOption[] = chatModels.map((id: string) => ({
              value: id,
              label: formatModelLabel(id),
            }));

            return sortModels(list, ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1', 'chatgpt-4o-latest']);
          }
        }
      }
    } else if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          const valid = data.models
            .filter((m: any) => {
              const name = (m.name || '').toLowerCase();
              const isGenContent = m.supportedGenerationMethods?.includes('generateContent');
              return isGenContent && name.includes('gemini') && !name.includes('embedding') && !name.includes('aqa');
            })
            .map((m: any) => {
              const cleanId = m.name.replace(/^models\//, '');
              return {
                value: cleanId,
                label: m.displayName || formatModelLabel(cleanId),
                description: m.description ? m.description.slice(0, 60) + '...' : undefined,
              };
            });

          if (valid.length > 0) {
            return sortModels(valid, ['gemini-2.0-flash', 'gemini-2.0-flash-thinking', 'gemini-2.0-pro', 'gemini-1.5-pro']);
          }
        }
      }
    } else if (provider === 'deepseek') {
      const res = await fetch('https://api.deepseek.com/models', {
        headers: { Authorization: `Bearer ${trimmedKey}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          return data.data.map((m: any) => ({
            value: m.id,
            label: m.id === 'deepseek-chat' ? 'DeepSeek-V3 (deepseek-chat)' : m.id === 'deepseek-reasoner' ? 'DeepSeek-R1 (deepseek-reasoner)' : m.id,
          }));
        }
      }
    } else if (provider === 'openrouter') {
      const headers: Record<string, string> = {};
      if (trimmedKey) {
        headers['Authorization'] = `Bearer ${trimmedKey}`;
      }
      const res = await fetch('https://openrouter.ai/api/v1/models', { headers });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          return data.data.slice(0, 120).map((m: any) => ({
            value: m.id,
            label: m.name || m.id,
            description: m.pricing?.prompt ? `$${(Number(m.pricing.prompt) * 1000000).toFixed(2)}/M prompt` : undefined,
          }));
        }
      }
    } else if (provider === 'custom') {
      const endpoint = customEndpoint || 'http://localhost:11434/v1';
      const baseUrl = endpoint.replace(/\/+v1\/?$/, '').replace(/\/+$/, '');

      // 1. Try Ollama tags endpoint
      let res = await fetch(`${baseUrl}/api/tags`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          return data.models.map((m: any) => ({
            value: m.name,
            label: m.name,
            description: m.details?.parameter_size ? `${m.details.parameter_size} • ${m.details.quantization_level || ''}` : undefined,
          }));
        }
      }

      // 2. Try standard OpenAI-compatible /v1/models endpoint
      res = await fetch(`${endpoint.replace(/\/+$/, '')}/models`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        const raw = data.data || data.models || [];
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((m: any) => ({
            value: m.id || m.name,
            label: m.id || m.name,
          }));
        }
      }
    }
  } catch (err) {
    console.warn(`[CopilotModels] Live model query failed for ${provider}:`, err);
  }

  return [];
}

/**
 * Cleanly formats raw model ID strings into readable user-facing labels.
 */
function formatModelLabel(id: string): string {
  if (id === 'gpt-4o') return 'GPT-4o';
  if (id === 'gpt-4o-mini') return 'GPT-4o Mini';
  if (id === 'o3-mini') return 'o3-mini';
  if (id === 'o1') return 'o1';
  if (id === 'chatgpt-4o-latest') return 'ChatGPT-4o Dynamic';
  if (id.includes('claude-3-7-sonnet')) return 'Claude 3.7 Sonnet';
  if (id.includes('claude-3-5-sonnet')) return 'Claude 3.5 Sonnet';
  if (id.includes('claude-3-5-haiku')) return 'Claude 3.5 Haiku';
  if (id.includes('gemini-2.0-flash')) return 'Gemini 2.0 Flash';
  if (id.includes('gemini-2.0-pro')) return 'Gemini 2.0 Pro';
  if (id.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
  if (id === 'deepseek-chat') return 'DeepSeek-V3';
  if (id === 'deepseek-reasoner') return 'DeepSeek-R1';

  return id;
}

/**
 * Sorts model options prioritizing specific keywords or prefixes.
 */
function sortModels(models: ModelOption[], priorityKeywords: string[]): ModelOption[] {
  return [...models].sort((a, b) => {
    const aVal = a.value.toLowerCase();
    const bVal = b.value.toLowerCase();

    let aPriority = -1;
    let bPriority = -1;

    for (let i = 0; i < priorityKeywords.length; i++) {
      if (aPriority === -1 && aVal.includes(priorityKeywords[i])) aPriority = i;
      if (bPriority === -1 && bVal.includes(priorityKeywords[i])) bPriority = i;
    }

    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;

    return a.label.localeCompare(b.label);
  });
}
