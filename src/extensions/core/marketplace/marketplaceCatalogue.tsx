import React from 'react';

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
 * Community marketplace catalogue starts empty (zero fake seed extensions).
 * Live community extensions are fetched dynamically from the Flint registry API.
 */
export const COMMUNITY_MARKETPLACE_CATALOGUE: MarketplaceExtensionItem[] = [];
