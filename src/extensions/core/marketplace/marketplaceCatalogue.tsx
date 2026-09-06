import React from 'react';
import {
  Motion01Icon,
  SparklesIcon,
  StickyNote02Icon,
  Brain02Icon,
} from '@/components/common/Icons';

export interface MarketplaceExtensionItem {
  id: string;
  name: string;
  version: string;
  author: string;
  authorUrl?: string;
  description: string;
  downloads: string;
  stars: number;
  category: 'Productivity' | 'Visualization' | 'Integration' | 'Formatting';
  icon: React.ReactNode;
  featured?: boolean;
  readme?: string;
  bannerImage?: string;
  mainJsUrl?: string;
  manifestUrl?: string;
  stylesCssUrl?: string;
  downloadUrl?: string;
}

// Backwards compatibility alias
export type MarketplacePluginItem = MarketplaceExtensionItem;

/**
 * Built-in community marketplace catalogue seeded from the Turso database.
 * Provides instant 0ms offline availability while SWR revalidates live updates.
 */
export const COMMUNITY_MARKETPLACE_CATALOGUE: MarketplaceExtensionItem[] = [
  {
    id: 'flint-cascade',
    name: 'Cascade',
    version: '1.0.0',
    author: 'Yuliet Li',
    authorUrl: 'https://github.com/yvliet',
    description:
      'Organize notes into sequential cascades (books) with status-bar linking, graph backlinks, and custom sidebar folders.',
    downloads: '128',
    stars: 5,
    category: 'Productivity',
    icon: <Motion01Icon size={18} className="text-[#38bdf8]" />,
    featured: true,
    readme:
      '# Cascade\n\nOrganize notes into sequential cascades (books) with status-bar linking, graph backlinks, and custom sidebar folders.',
  },
  {
    id: 'flint-copilot',
    name: 'Copilot',
    version: '1.0.0',
    author: 'Yuliet Li',
    authorUrl: 'https://github.com/yvliet',
    description:
      'Native AI assistant with local LLM integration, multimodal reasoning, automated summarization, and context-aware chat.',
    downloads: '128',
    stars: 5,
    category: 'Productivity',
    icon: <SparklesIcon size={18} className="text-[#a855f7]" />,
    featured: true,
    readme:
      '# Copilot\n\nNative AI assistant with local LLM integration, multimodal reasoning, automated summarization, and context-aware chat.',
  },
  {
    id: 'quicknote',
    name: 'Quicknote',
    version: '1.0.0',
    author: 'Yuliet Li',
    authorUrl: 'https://github.com/yvliet',
    description:
      'Instant floating scratchpad for capturing thoughts, web snippets, and ideas without leaving your current note.',
    downloads: '128',
    stars: 5,
    category: 'Productivity',
    icon: <StickyNote02Icon size={18} className="text-[#eab308]" />,
    featured: true,
    readme:
      '# Quicknote\n\nInstant floating scratchpad for capturing thoughts, web snippets, and ideas without leaving your current note.',
  },
  {
    id: 'fsrs-spaced-repetition',
    name: 'Spaced Repetition (FSRS)',
    version: '1.0.0',
    author: 'Yuliet Li',
    authorUrl: 'https://github.com/yvliet',
    description:
      'State-of-the-art Free Spaced Repetition Scheduler (FSRS) flashcard review system built right inside Flint.',
    downloads: '128',
    stars: 5,
    category: 'Productivity',
    icon: <Brain02Icon size={18} className="text-[#ec4899]" />,
    featured: true,
    readme:
      '# Spaced Repetition (FSRS)\n\nState-of-the-art Free Spaced Repetition Scheduler (FSRS) flashcard review system built right inside Flint.',
  },
];
