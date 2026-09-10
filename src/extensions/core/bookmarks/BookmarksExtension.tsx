/**
 * @module BookmarksExtension
 * @description
 * Built-in core extension for bookmarking notes and searches for 1-click sidebar access.
 *
 * Uses native FlintApp APIs (app.hearth.toggleBookmark, app.workspace.setActiveSidebarTab, app.workspace.showToast).
 *
 * @since 0.1.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { Bookmark01Icon } from '@/components/common/Icons';
import { bookmarksReadme } from './readme';
import { BookmarksView } from './BookmarksView';

const LazyBookmarksSettingsTab = React.lazy(() =>
  import('./BookmarksSettingsTab').then((m) => ({ default: m.BookmarksSettingsTab }))
);

export const BOOKMARKS_MANIFEST: ExtensionManifest = {
  id: 'bookmarks',
  name: 'Bookmarks',
  version: '1.0.0',
  description: 'Bookmark important notes and searches for fast 1-click access in your workspace sidebar.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['bookmarks', 'favorites', 'pinned', 'sidebar', 'workspace'],
  readme: bookmarksReadme,
};

export class BookmarksExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = BOOKMARKS_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Left Sidebar Tab (Synchronously rendered for instant 0ms display)
    this.registerSidebarTab({
      id: 'bookmarks',
      title: 'Bookmarks',
      icon: <Bookmark01Icon size={14} />,
      side: 'left',
      order: 20,
      render: () => <BookmarksView />,
    });

    // 2. Register Toggle Bookmark Command
    this.addCommand({
      id: 'cmd-toggle-bookmark',
      title: 'Toggle bookmark for active note',
      section: 'Navigation',
      icon: <Bookmark01Icon size={16} />,
      hotkey: 'Ctrl+Shift+B',
      action: async (app) => {
        const activeDoc = app.hearth.activeDocument;
        if (activeDoc) {
          const isNowBookmarked = await app.hearth.toggleBookmark(activeDoc.id);
          app.workspace.showToast(
            isNowBookmarked ? `Bookmarked "${activeDoc.title}"` : `Removed bookmark for "${activeDoc.title}"`,
            'info'
          );
        }
      },
    });

    // 3. Register Open Bookmarks View Command
    this.addCommand({
      id: 'cmd-open-bookmarks-view',
      title: 'Open Bookmarks sidebar tab',
      section: 'Navigation',
      icon: <Bookmark01Icon size={16} />,
      action: (app) => {
        app.workspace.setActiveSidebarTab('left', 'bookmarks');
      },
    });

    // 4. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'bookmarks-settings',
      name: 'Bookmarks',
      icon: <Bookmark01Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyBookmarksSettingsTab />
        </React.Suspense>
      ),
    });

    // 5. Register Document Header Action Button (Sub-header star icon)
    this.registerDocumentHeaderAction({
      id: 'toggle-bookmark',
      title: (ctx) => (ctx.document?.is_bookmarked ? 'Remove bookmark' : 'Bookmark note'),
      icon: (ctx) => (
        <Bookmark01Icon
          size={14}
          className={ctx.document?.is_bookmarked ? 'fill-current' : ''}
        />
      ),
      className: (ctx) =>
        ctx.document?.is_bookmarked
          ? 'text-[#f59e0b] hover:text-[#fbbf24] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer'
          : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer',
      onClick: async (ctx) => {
        if (ctx.document) {
          const isNowBookmarked = await ctx.app.hearth.toggleBookmark(ctx.document.id);
          ctx.app.workspace.showToast(
            isNowBookmarked ? `Bookmarked "${ctx.document.title}"` : `Removed bookmark for "${ctx.document.title}"`,
            'info'
          );
        }
      },
      isVisible: (ctx) => Boolean(ctx.document),
      order: 10,
    });

    // 6. Register File Tree Context Menu Action (Bookmark / Remove bookmark)
    this.registerFileContextMenuAction({
      id: 'bookmark',
      title: (ctx) =>
        ctx.isMulti
          ? `Bookmark ${ctx.selectedDocIds.length} items`
          : ctx.item.is_bookmarked
          ? 'Remove bookmark'
          : 'Bookmark',
      icon: () => <Bookmark01Icon size={14} />,
      section: 'actions',
      order: 10,
      onClick: async (ctx) => {
        if (ctx.isMulti) {
          for (const id of ctx.selectedDocIds) {
            await ctx.app.hearth.toggleBookmark(id);
          }
          ctx.app.workspace.showToast(`Updated bookmarks for ${ctx.selectedDocIds.length} items`, 'info');
        } else {
          const isNow = await ctx.app.hearth.toggleBookmark(ctx.item.id);
          ctx.app.workspace.showToast(
            isNow ? `Bookmarked "${ctx.item.title}"` : `Removed bookmark for "${ctx.item.title}"`,
            'info'
          );
        }
      },
    });

    // ── MCP Tools Registration ──

    // 5. Tool: bookmarks_list
    this.registerTool({
      name: 'list',
      description: 'List all bookmarked documents in the active hearth/vault.',
      category: 'bookmarks',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (_args: Record<string, unknown>, app: FlintApp): Promise<McpToolResult> => {
        try {
          const docs = (app.hearth.documents || []).filter((d) => !d.is_folder && Boolean(d.is_bookmarked));
          const bookmarks = docs.map((d) => ({
            id: d.id,
            title: d.title,
            parent_id: d.parent_id,
            created_at: d.created_at,
            updated_at: d.updated_at,
          }));
          return {
            content: [{ type: 'text', text: JSON.stringify({ bookmarks, total: bookmarks.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 6. Tool: bookmarks_toggle
    this.registerTool({
      name: 'toggle',
      description: 'Toggle the bookmark status of a document in the vault.',
      category: 'bookmarks',
      isDestructive: false,
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Target document identifier to bookmark or unbookmark',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, app: FlintApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string;
          if (!documentId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'documentId parameter is required' }],
            };
          }
          const isBookmarked = await app.hearth.toggleBookmark(documentId);
          const doc = app.hearth.getDocumentById(documentId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  documentId,
                  title: doc?.title || 'Untitled',
                  isBookmarked,
                }),
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });
  }
}

