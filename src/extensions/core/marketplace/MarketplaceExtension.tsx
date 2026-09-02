/**
 * @module MarketplaceExtension
 * @description
 * Built-in core extension for discovering, browsing, and installing community extensions.
 * Registers the marketplace tab view, action rail icon button, and settings tab.
 *
 * Uses native FlintApp APIs (app.workspace.openCustomTab, app.workspace.getTabs).
 *
 * @since 0.1.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { Store01Icon } from '@/components/common/Icons';
import { marketplaceReadme } from './readme';
import { COMMUNITY_MARKETPLACE_CATALOGUE } from './MarketplaceView';

const LazyMarketplaceView = React.lazy(() =>
  import('./MarketplaceView').then((m) => ({ default: m.MarketplaceView }))
);
const LazyMarketplaceSettingsTab = React.lazy(() =>
  import('./MarketplaceSettingsTab').then((m) => ({ default: m.MarketplaceSettingsTab }))
);

export const MARKETPLACE_MANIFEST: ExtensionManifest = {
  id: 'plugin-marketplace',
  name: 'Community Extensions Marketplace',
  version: '1.0.0',
  description: 'Browse, discover, and install community extensions into your Hearth.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['marketplace', 'extensions', 'community', 'plugins', 'themes'],
  readme: marketplaceReadme,
};

export class MarketplaceExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = MARKETPLACE_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Main Marketplace View
    this.registerView({
      type: 'marketplace',
      title: 'Marketplace',
      icon: <Store01Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyMarketplaceView />
        </React.Suspense>
      ),
    });

    // 2. Register Action Rail item
    this.addActionRailIcon(
      'open-marketplace',
      <Store01Icon size={16} />,
      'Extensions Marketplace',
      (app) => {
        app.workspace.openCustomTab({
          viewType: 'marketplace',
          title: 'Marketplace',
          icon: <Store01Icon size={14} />,
        });
      },
      65,
      (app) => {
        const tabs = app.workspace.getTabs();
        const activeTabId = app.workspace.activeTabId;
        const mainViewMode = app.workspace.mainViewMode;
        const currentTab = tabs.find((t) => t.id === activeTabId);
        return (
          currentTab?.view_type === 'marketplace' ||
          currentTab?.view_mode === 'marketplace' ||
          mainViewMode === 'marketplace'
        );
      }
    );

    // 3. Register Command
    this.addCommand({
      id: 'cmd-open-marketplace',
      title: 'Marketplace: Browse extension marketplace',
      section: 'Navigation',
      icon: <Store01Icon size={16} />,
      action: (app) => {
        app.workspace.openCustomTab({
          viewType: 'marketplace',
          title: 'Marketplace',
          icon: <Store01Icon size={14} />,
        });
      },
    });

    // 4. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'marketplace-settings',
      name: 'Community extensions',
      icon: <Store01Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyMarketplaceSettingsTab />
        </React.Suspense>
      ),
    });

    // 5. Register MCP Tools
    // ── Tool: list_installed ──
    this.registerTool({
      name: 'list_installed',
      description: 'List all installed extensions (core and community) in the application.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<McpToolResult> => {
        try {
          const manifests = this.app.extensions.getAllManifests();
          const list = manifests.map((m) => ({
            id: m.id,
            name: m.name,
            version: m.version,
            description: m.description,
            author: m.author,
            isCore: Boolean(m.isCore),
            tags: m.tags || [],
            isEnabled: this.app.extensions.isExtensionEnabled(m.id),
          }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  totalInstalled: list.length,
                  extensions: list,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: msg }],
          };
        }
      },
    });

    // ── Tool: search ──
    this.registerTool({
      name: 'search',
      description: 'Search the community extension marketplace catalogue for available plugins and extensions.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term to match against extension names, descriptions, and authors',
          },
        },
        required: ['query'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const q = String(args.query || '').trim().toLowerCase();
          const matches = COMMUNITY_MARKETPLACE_CATALOGUE.filter(
            (p) =>
              !q ||
              p.name.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              p.author.toLowerCase().includes(q) ||
              p.category.toLowerCase().includes(q)
          );

          const results = matches.map((m) => ({
            id: m.id,
            name: m.name,
            version: m.version,
            author: m.author,
            description: m.description,
            downloads: m.downloads,
            stars: m.stars,
            category: m.category,
            featured: Boolean(m.featured),
            isInstalled: Boolean(this.app.extensions.getExtensionManifest(m.id)),
          }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  query: q,
                  totalMatches: results.length,
                  results,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: msg }],
          };
        }
      },
    });
  }
}

// Backwards-compat alias
export const MarketplacePlugin = MarketplaceExtension;
export default MarketplaceExtension;
