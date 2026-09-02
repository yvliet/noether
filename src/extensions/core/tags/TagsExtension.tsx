/**
 * @module TagsExtension
 * @description
 * Built-in core extension that parses hashtag taxonomy across all hearth documents
 * and renders an interactive hierarchical nested tags tree in the right sidebar.
 *
 * @since 0.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { Tag01Icon } from '@/components/common/Icons';
import { getAllVaultTags, buildTagTree } from '@/lib/db/tags';
import { tagsReadme } from './readme';

const LazyTagsView = React.lazy(() =>
  import('./TagsView').then((m) => ({ default: m.TagsView }))
);
const LazyTagsSettingsTab = React.lazy(() =>
  import('./TagsSettingsTab').then((m) => ({ default: m.TagsSettingsTab }))
);

export const TAGS_MANIFEST: ExtensionManifest = {
  id: 'tags-explorer',
  name: 'Tags Explorer',
  version: '1.0.0',
  description: 'Hierarchical nested tags tree view across all documents in the hearth.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['tags', 'categories', 'organization', 'taxonomy', 'explorer'],
  readme: tagsReadme,
};

export class TagsExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = TAGS_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Right Sidebar Tab
    this.registerSidebarTab({
      id: 'tags',
      title: 'Tags Explorer',
      icon: <Tag01Icon size={14} />,
      side: 'right',
      order: 30,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyTagsView />
        </React.Suspense>
      ),
    });

    // 2. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'tags-settings',
      name: 'Tags explorer',
      icon: <Tag01Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyTagsSettingsTab />
        </React.Suspense>
      ),
    });

    // 3. Register MCP Tools
    // ── Tool: list_all ──
    this.registerTool({
      name: 'list_all',
      description: 'List all tags in the Hearth with their occurrence frequencies and document references.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<McpToolResult> => {
        try {
          const tags = await getAllVaultTags();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  totalTags: tags.length,
                  tags,
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

    // ── Tool: get_tree ──
    this.registerTool({
      name: 'get_tree',
      description: 'Get nested hierarchical tag tree (e.g. #parent/subtag) across all documents in the Hearth.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<McpToolResult> => {
        try {
          const tags = await getAllVaultTags();
          const tree = buildTagTree(tags);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(tree),
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

    // ── Tool: get_documents_for_tag ──
    this.registerTool({
      name: 'get_documents_for_tag',
      description: 'Find all documents associated with a specific tag (with or without # prefix).',
      parameters: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            description: 'The tag name to search for (e.g. "todo" or "#work/project")',
          },
        },
        required: ['tag'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const rawTag = String(args.tag || '').trim();
          if (!rawTag) {
            throw new Error("Parameter 'tag' is required.");
          }
          const cleanTag = rawTag.replace(/^#/, '').toLowerCase();
          const tags = await getAllVaultTags();
          const matched = tags.find((t) => t.tag.toLowerCase() === cleanTag);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  tag: cleanTag,
                  count: matched ? matched.count : 0,
                  documents: matched ? matched.docs : [],
                  docIds: matched ? matched.docIds : [],
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

// Backwards compatibility alias
export const TagsPlugin = TagsExtension;
export default TagsExtension;
