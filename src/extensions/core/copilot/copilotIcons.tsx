/**
 * @module CopilotIcons
 * @description
 * Curated Hugeicons wrappers and dynamic model icon selector for Copilot For Flint.
 * Dynamically switches between ArtificialIntelligence01Icon (default) and vendor brand icons
 * (ClaudeIcon, ChatGptIcon, GoogleGeminiIcon, DeepseekIcon, MistralIcon, MetaIcon) based on
 * the active LLM provider and model.
 *
 * Adheres strictly to instant native desktop responsiveness (zero transition delays).
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArtificialIntelligence01Icon as HugeAIIcon,
  ClaudeIcon as HugeClaudeIcon,
  ChatGptIcon as HugeChatGptIcon,
  GoogleGeminiIcon as HugeGoogleGeminiIcon,
  DeepseekIcon as HugeDeepseekIcon,
  MistralIcon as HugeMistralIcon,
  MetaIcon as HugeMetaIcon,
  EyeIcon as HugeEyeIcon,
  EyeOffIcon as HugeEyeOffIcon,
} from '@hugeicons/core-free-icons';
import { useCopilotStore } from './copilotStore';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

const createIcon = (iconDef: any) => {
  const IconComponent = React.memo<IconProps>(({
    size = 16,
    className = '',
    color = 'currentColor',
    strokeWidth = 1.5,
    ...props
  }) => (
    <HugeiconsIcon
      icon={iconDef}
      size={size}
      className={className}
      color={color}
      strokeWidth={strokeWidth}
      {...(props as any)}
    />
  ));
  IconComponent.displayName = 'HugeIconWrapper';
  return IconComponent;
};

// ── Native AI & Model Brand Icons ──
export const ArtificialIntelligence01Icon = createIcon(HugeAIIcon);
export const ClaudeIcon = createIcon(HugeClaudeIcon);
export const ChatGptIcon = createIcon(HugeChatGptIcon);
export const GoogleGeminiIcon = createIcon(HugeGoogleGeminiIcon);
export const DeepseekIcon = createIcon(HugeDeepseekIcon);
export const MistralIcon = createIcon(HugeMistralIcon);
export const MetaIcon = createIcon(HugeMetaIcon);
export const EyeIcon = createIcon(HugeEyeIcon);
export const EyeOffIcon = createIcon(HugeEyeOffIcon);

/**
 * Resolves the appropriate brand icon component based on provider and model name.
 * Falls back to ArtificialIntelligence01Icon if a specific brand icon is not available.
 */
export function getModelBrandIcon(provider: string, model: string): React.ComponentType<IconProps> {
  const prov = (provider || '').toLowerCase();
  const mod = (model || '').toLowerCase();

  // 1. Anthropic / Claude
  if (prov === 'anthropic' || mod.includes('claude')) {
    return ClaudeIcon;
  }

  // 2. OpenAI / ChatGPT
  if (prov === 'openai' || mod.includes('gpt') || mod.includes('chatgpt') || mod.startsWith('o1') || mod.startsWith('o3')) {
    return ChatGptIcon;
  }

  // 3. Google Gemini
  if (prov === 'gemini' || mod.includes('gemini')) {
    return GoogleGeminiIcon;
  }

  // 4. DeepSeek
  if (prov === 'deepseek' || mod.includes('deepseek')) {
    return DeepseekIcon;
  }

  // 5. Mistral
  if (mod.includes('mistral') || mod.includes('codestral') || mod.includes('pixtral')) {
    return MistralIcon;
  }

  // 6. Meta / Llama
  if (mod.includes('llama') || mod.includes('meta')) {
    return MetaIcon;
  }

  // Default fallback icon
  return ArtificialIntelligence01Icon;
}

/**
 * Dynamic reactive icon component for Copilot sidebar tab and headers.
 * Automatically synchronizes with the active Copilot provider and model in store.
 * Strictly displays ArtificialIntelligence01Icon by default until an active provider
 * and model are configured.
 */
export const CopilotSidebarIcon: React.FC<IconProps> = React.memo((props) => {
  const provider = useCopilotStore((s) => s.provider);
  const models = useCopilotStore((s) => s.models);
  const apiKeys = useCopilotStore((s) => s.apiKeys);

  // If no provider is configured with an active key, always use the main default icon
  if (!provider) {
    return <ArtificialIntelligence01Icon {...props} />;
  }

  const hasKey = provider === 'custom' || Boolean(apiKeys[provider]?.trim());
  if (!hasKey) {
    return <ArtificialIntelligence01Icon {...props} />;
  }

  const model = models[provider] || '';
  const IconComponent = getModelBrandIcon(provider, model);

  return <IconComponent {...props} />;
});

CopilotSidebarIcon.displayName = 'CopilotSidebarIcon';
