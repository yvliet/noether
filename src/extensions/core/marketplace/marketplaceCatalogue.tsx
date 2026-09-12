import React from 'react';
import type { ExtensionIconConfig } from '@/core/extensions/types';

export interface MarketplaceExtensionItem {
  id: string;
  name: string;
  version: string;
  author: string;
  authorUrl?: string;
  repoUrl?: string;
  description: string;
  downloads: string;
  stars: number;
  category: 'Productivity' | 'Visualization' | 'Integration' | 'Formatting';
  icon?: string | ExtensionIconConfig | React.ReactNode;
  iconConfig?: ExtensionIconConfig;
  featured?: boolean;
  readme?: string;
  bannerImage?: string;
  mainJsUrl?: string;
  manifestUrl?: string;
  stylesCssUrl?: string;
  downloadUrl?: string;
}

/**
 * Initial empty catalogue. All community extensions are dynamically loaded
 * from the Turso edge database or the local storage SWR cache.
 */
export const COMMUNITY_MARKETPLACE_CATALOGUE: MarketplaceExtensionItem[] = [];

