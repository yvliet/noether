/**
 * @module CopilotSettingsTab
 * @description
 * Configuration and BYOK credential management panel for Copilot For Flint.
 * Registered into Flint's Settings window via this.registerSettingTab().
 *
 * Provides straightforward, zero-friction setup guides for all supported providers:
 * - Anthropic (Claude)
 * - OpenAI (ChatGPT)
 * - Google Gemini
 * - DeepSeek
 * - OpenRouter & Local Ollama / LM Studio
 *
 * Features:
 * - Real-time live model fetching from provider APIs with 1-click refresh
 * - Custom model ID input support for preview or private fine-tuned models
 * - Instant native desktop layout with controls right-aligned flush to container margins
 * - Pure Hugeicons branding (zero emojis, zero animation delays)
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useFlintApp } from '@/core/app/AppContext';
import { Tooltip } from '@/components/common/Tooltip';
import {
  useCopilotStore,
  CopilotProvider,
  PROVIDER_CATALOG,
  DEFAULT_SYSTEM_PROMPT,
} from './copilotStore';
import { runCopilotTurn } from './copilotClient';
import {
  SettingCard,
  SettingItem,
  TextInput,
  ToggleSwitch,
  CustomSelect,
  Button,
} from '@/components/ui';
import {
  ClaudeIcon,
  ChatGptIcon,
  GoogleGeminiIcon,
  DeepseekIcon,
  EyeIcon,
  EyeOffIcon,
} from './copilotIcons';
import {
  ExternalLinkIcon,
  CheckIcon,
  Alert02Icon,
  GlobeIcon,
  Database01Icon,
  RotateCcwIcon,
  Edit02Icon,
} from '@/components/common/Icons';

export const CopilotSettingsTab: React.FC = () => {
  const app = useFlintApp();

  const provider = useCopilotStore((s) => s.provider);
  const models = useCopilotStore((s) => s.models);
  const apiKeys = useCopilotStore((s) => s.apiKeys);
  const customEndpoint = useCopilotStore((s) => s.customEndpoint);
  const systemPrompt = useCopilotStore((s) => s.systemPrompt);
  const includeActiveNoteContext = useCopilotStore((s) => s.includeActiveNoteContext);
  const contextMode = useCopilotStore((s) => s.contextMode);
  const enableMcpTools = useCopilotStore((s) => s.enableMcpTools);
  const temperature = useCopilotStore((s) => s.temperature);
  const maxTokens = useCopilotStore((s) => s.maxTokens);

  const fetchedModels = useCopilotStore((s) => s.fetchedModels);
  const isFetchingModels = useCopilotStore((s) => s.isFetchingModels);
  const refreshModels = useCopilotStore((s) => s.refreshModels);

  const setProvider = useCopilotStore((s) => s.setProvider);
  const setModel = useCopilotStore((s) => s.setModel);
  const setApiKey = useCopilotStore((s) => s.setApiKey);
  const setCustomEndpoint = useCopilotStore((s) => s.setCustomEndpoint);
  const setSystemPrompt = useCopilotStore((s) => s.setSystemPrompt);
  const setIncludeActiveNoteContext = useCopilotStore((s) => s.setIncludeActiveNoteContext);
  const setContextMode = useCopilotStore((s) => s.setContextMode);
  const setEnableMcpTools = useCopilotStore((s) => s.setEnableMcpTools);
  const setTemperature = useCopilotStore((s) => s.setTemperature);
  const setMaxTokens = useCopilotStore((s) => s.setMaxTokens);
  const restoreDefaults = useCopilotStore((s) => s.restoreDefaults);

  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [isCustomModelInput, setIsCustomModelInput] = useState(false);
  const [customModelText, setCustomModelText] = useState('');

  const currentKey = provider ? apiKeys[provider] || '' : '';
  const hasKey = provider === 'custom' || Boolean(provider && currentKey.trim());
  const currentModel = provider ? models[provider] || '' : '';
  const providerMeta = provider ? PROVIDER_CATALOG[provider] : null;

  // On initial mount or when provider changes, fetch models if key is configured
  useEffect(() => {
    if (provider && hasKey) {
      refreshModels(provider);
    }
  }, [provider, hasKey, refreshModels]);

  const providerOptions = [
    { value: 'anthropic' as CopilotProvider, label: 'Anthropic (Claude)' },
    { value: 'openai' as CopilotProvider, label: 'OpenAI (ChatGPT)' },
    { value: 'gemini' as CopilotProvider, label: 'Google Gemini' },
    { value: 'deepseek' as CopilotProvider, label: 'DeepSeek' },
    { value: 'openrouter' as CopilotProvider, label: 'OpenRouter' },
    { value: 'custom' as CopilotProvider, label: 'Local / Custom (Ollama)' },
  ];

  // Resolve model options from dynamic fetched models (strictly empty if unauthenticated)
  const rawModelList = hasKey && provider && fetchedModels[provider]?.length > 0
    ? fetchedModels[provider]
    : [];

  const modelOptions = rawModelList.map((m) => ({
    value: m.value,
    label: m.label,
    description: m.description,
  }));

  const handleTestConnection = async () => {
    if (!provider) {
      setTestState('error');
      setTestError('Please select a provider first.');
      return;
    }

    if (!currentKey && provider !== 'custom') {
      setTestState('error');
      setTestError('Please provide an API key before testing.');
      return;
    }

    setTestState('testing');
    setTestError('');

    try {
      await runCopilotTurn(app, 'Ping! Please reply with exactly one word: "Connected".', {
        onDeltaText: () => {},
      });
      setTestState('success');
      setTimeout(() => setTestState('idle'), 3000);
    } catch (err: any) {
      setTestState('error');
      setTestError(err.message || 'Connection test failed.');
    }
  };

  const handleCustomModelSubmit = () => {
    if (provider && customModelText.trim()) {
      setModel(provider, customModelText.trim());
      setIsCustomModelInput(false);
      setCustomModelText('');
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none text-xs">
      {/* ── 1. Provider & Authentication Card ── */}
      <SettingCard
        title="Model Provider & Credentials"
        description="Select your preferred AI model provider and enter your private API key."
      >
        {/* Active Provider */}
        <SettingItem
          name="Active Provider"
          description="Choose between Anthropic Claude, OpenAI, Google Gemini, DeepSeek, OpenRouter, or Local endpoints."
          controlClassName="justify-end"
        >
          <CustomSelect
            value={provider || ''}
            placeholder="Select provider..."
            options={providerOptions}
            onChange={(val) => {
              setProvider(val as CopilotProvider);
              setIsCustomModelInput(false);
            }}
          />
        </SettingItem>

        {/* Active Model (Empty & grayed out with tooltip if no API key) */}
        <SettingItem
          name="Active Model"
          description={
            !provider
              ? 'Select a provider first to configure models.'
              : !hasKey
              ? 'Enter an API key below to check for available models.'
              : `Currently selected model for ${providerMeta?.name}.`
          }
          controlClassName="justify-end"
        >
          {isCustomModelInput ? (
            <div className="flex items-center gap-1.5">
              <TextInput
                value={customModelText}
                onChange={(e) => setCustomModelText(e.target.value)}
                placeholder="Enter model ID..."
                isMono
                className="w-48 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomModelSubmit();
                  if (e.key === 'Escape') setIsCustomModelInput(false);
                }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleCustomModelSubmit}
                disabled={!customModelText.trim()}
              >
                Set
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCustomModelInput(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {!hasKey ? (
                <Tooltip content="You have to put in an API key first to check for available models">
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      disabled={true}
                      className="!p-1.5 h-7 w-7 opacity-50 cursor-not-allowed"
                    >
                      <RotateCcwIcon size={13} />
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <Tooltip content="Fetch live models from provider API">
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      onClick={() => provider && refreshModels(provider)}
                      disabled={isFetchingModels}
                      className="!p-1.5 h-7 w-7"
                    >
                      <RotateCcwIcon size={13} className={isFetchingModels ? 'animate-spin text-[var(--flint-accent)]' : ''} />
                    </Button>
                  </span>
                </Tooltip>
              )}

              {!hasKey ? (
                <Tooltip content="You have to put in an API key first to check for available models">
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      disabled={true}
                      className="!p-1.5 h-7 w-7 opacity-50 cursor-not-allowed"
                    >
                      <Edit02Icon size={13} />
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <Tooltip content="Type custom model ID">
                  <span className="inline-flex">
                    <Button
                      size="sm"
                      onClick={() => {
                        setCustomModelText(currentModel);
                        setIsCustomModelInput(true);
                      }}
                      className="!p-1.5 h-7 w-7"
                    >
                      <Edit02Icon size={13} />
                    </Button>
                  </span>
                </Tooltip>
              )}

              {!hasKey ? (
                <Tooltip content="You have to put in an API key first to check for available models">
                  <span className="inline-flex cursor-not-allowed">
                    <CustomSelect
                      value=""
                      options={[]}
                      onChange={() => {}}
                      disabled={true}
                      placeholder="No models available"
                    />
                  </span>
                </Tooltip>
              ) : (
                <CustomSelect
                  value={currentModel}
                  options={modelOptions}
                  onChange={(val) => provider && setModel(provider, val)}
                  disabled={modelOptions.length === 0}
                  placeholder={isFetchingModels ? 'Fetching models...' : modelOptions.length === 0 ? 'No models available' : 'Select model...'}
                />
              )}
            </div>
          )}
        </SettingItem>

        {/* API Key */}
        <SettingItem
          name="API Key"
          description="Your private key is stored securely in local app storage and never leaves your device."
          controlClassName="justify-end"
        >
          <div className="flex items-center gap-1.5">
            <div className="relative flex items-center w-52">
              <TextInput
                type={showKey ? 'text' : 'password'}
                placeholder={providerMeta ? providerMeta.keyPlaceholder : 'Select provider first'}
                value={currentKey}
                onChange={(e) => provider && setApiKey(provider, e.target.value)}
                disabled={!provider}
                isMono
                className="w-full pr-7 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                disabled={!provider}
                className="absolute right-2 text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-pointer disabled:opacity-40"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOffIcon size={13} /> : <EyeIcon size={13} />}
              </button>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleTestConnection}
              disabled={!provider || testState === 'testing'}
              className="shrink-0"
            >
              {testState === 'testing' ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </SettingItem>

        {/* Quick Setup Guide Box */}
        {providerMeta ? (
          <div className="p-3 bg-[var(--flint-bg-input,#141414)] border-t border-[var(--flint-border-subtle,#242424)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[var(--flint-text-primary,#ffffff)] font-medium text-xs">
                {provider === 'anthropic' && <ClaudeIcon size={14} />}
                {provider === 'openai' && <ChatGptIcon size={14} />}
                {provider === 'gemini' && <GoogleGeminiIcon size={14} />}
                {provider === 'deepseek' && <DeepseekIcon size={14} />}
                {provider === 'openrouter' && <GlobeIcon size={14} />}
                {provider === 'custom' && <Database01Icon size={14} />}
                <span>{providerMeta.guideTitle}</span>
              </div>

              <a
                href={providerMeta.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-[var(--flint-accent,#ea580c)] hover:underline"
              >
                <span>Open Provider Dashboard</span>
                <ExternalLinkIcon size={11} />
              </a>
            </div>

            <ol className="list-decimal list-inside text-[11px] text-[var(--flint-text-muted,#888888)] space-y-1">
              {providerMeta.guideSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>

            {testState === 'success' && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#22c55e] pt-1">
                <CheckIcon size={13} />
                <span>Connection successful! Model is ready.</span>
              </div>
            )}

            {testState === 'error' && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#ef4444] pt-1">
                <Alert02Icon size={13} />
                <span>{testError || 'Connection failed'}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-[var(--flint-bg-input,#141414)] border-t border-[var(--flint-border-subtle,#242424)] text-[11px] text-[var(--flint-text-muted,#888888)] text-center">
            Select a provider above to view credentials and guided onboarding instructions.
          </div>
        )}
      </SettingCard>

      {/* ── 2. Local / Custom Endpoint (If using Custom) ── */}
      {provider === 'custom' && (
        <SettingCard
          title="Local Endpoint Configuration"
          description="Configure your local Ollama or OpenAI-compatible server endpoint."
        >
          <SettingItem
            name="API Endpoint URL"
            description="The base URL where your local LLM server accepts /chat/completions requests."
            controlClassName="justify-end"
          >
            <TextInput
              value={customEndpoint}
              onChange={(e) => setCustomEndpoint(e.target.value)}
              placeholder="http://localhost:11434/v1"
              isMono
              className="w-72 text-xs"
            />
          </SettingItem>
        </SettingCard>
      )}

      {/* ── 3. Workspace MCP Integration Card ── */}
      <SettingCard
        title="Workspace MCP Tools & Context"
        description="Control how Copilot reads notes and accesses your personal knowledge hearth."
      >
        <SettingItem
          name="Enable Flint MCP Tools"
          description="Allow Copilot to autonomously execute built-in tools (flint_search_notes, flint_read_note, backlinks, note creation) to answer questions about your hearth."
          controlClassName="justify-end"
        >
          <ToggleSwitch
            checked={enableMcpTools}
            onChange={setEnableMcpTools}
          />
        </SettingItem>

        <SettingItem
          name="Attach Active Note Context"
          description="Automatically include structural context for the note currently open in your editor when asking questions."
          controlClassName="justify-end"
        >
          <ToggleSwitch
            checked={includeActiveNoteContext}
            onChange={setIncludeActiveNoteContext}
          />
        </SettingItem>

        {includeActiveNoteContext && (
          <SettingItem
            name="Context Detail Mode"
            description="Smart Compact Outline includes title, tags, heading tree, and graph connections (~200 tokens, 10x faster). Full Document injects the verbatim note body."
            controlClassName="justify-end"
          >
            <CustomSelect
              value={contextMode}
              options={[
                { value: 'smart_compact', label: 'Smart Compact Outline (Recommended)' },
                { value: 'full_text', label: 'Full Document Text (Legacy)' },
              ]}
              onChange={(val) => setContextMode(val as any)}
            />
          </SettingItem>
        )}
      </SettingCard>

      {/* ── 4. System Prompt Persona ── */}
      <SettingCard
        title="System Instructions & Persona"
        description="Customize the baseline prompt instructing Copilot how to format responses and assist you."
        action={
          <Button
            size="sm"
            icon={<RotateCcwIcon size={12} />}
            onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
            title="Reset system prompt to default"
          >
            Reset Prompt
          </Button>
        }
      >
        <div className="p-3">
          <textarea
            rows={4}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-[var(--flint-bg-input,#141414)] border border-[var(--flint-border-base,#282828)] focus:border-[var(--flint-accent,#ea580c)] text-xs text-[var(--flint-text-primary,#ffffff)] outline-none leading-relaxed resize-y custom-scrollbar"
          />
        </div>
      </SettingCard>

      {/* ── 5. Generation Parameters ── */}
      <SettingCard
        title="Generation Parameters"
        description="Fine-tune sampling temperature and maximum output token generation."
      >
        <SettingItem
          name="Temperature"
          description={`Controls randomness and creativity (Current: ${temperature}).`}
          controlClassName="justify-end"
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-36 accent-[var(--flint-accent,#ea580c)] cursor-pointer"
            />
            <span className="font-mono text-xs text-[var(--flint-text-muted)] w-8">
              {temperature.toFixed(2)}
            </span>
          </div>
        </SettingItem>

        <SettingItem
          name="Max Tokens"
          description="Upper limit on the tokens generated per assistant response."
          controlClassName="justify-end"
        >
          <TextInput
            type="number"
            min={256}
            max={8192}
            step={256}
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 2048)}
            className="w-24 text-xs font-mono"
          />
        </SettingItem>
      </SettingCard>

      {/* ── Reset All Defaults Button ── */}
      <div className="pt-2">
        <Button
          variant="danger"
          size="sm"
          icon={<RotateCcwIcon size={13} />}
          onClick={restoreDefaults}
        >
          Restore All Settings to Defaults
        </Button>
      </div>
    </div>
  );
};
