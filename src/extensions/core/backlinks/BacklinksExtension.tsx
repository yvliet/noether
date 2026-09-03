/**
 * @module BacklinksExtension
 * @description
 * Built-in core extension that manages bidirectional backlinks and unlinked mentions.
 * Registers a right sidebar tab, in-document footer widget, status bar metric,
 * and document menu actions.
 *
 * Uses native FlintApp APIs for sidebar activation, toasts, and settings.
 *
 * @since 0.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { LinkSquare02Icon } from '@/components/common/Icons';
import {
  getBacklinksForDocument,
  getOutgoingLinksWithDetails,
  getUnlinkedMentionsForDocument,
  convertUnlinkedMentionToLink,
} from '@/lib/db/links';
import { useBacklinksSettings } from './backlinksSettings';
import { backlinksReadme } from './readme';
import { DocumentBacklinks } from './DocumentBacklinks';

const LazyBacklinksView = React.lazy(() =>
  import('./BacklinksView').then((m) => ({ default: m.BacklinksView }))
);
const LazyBacklinksSettingsTab = React.lazy(() =>
  import('./BacklinksSettingsTab').then((m) => ({ default: m.BacklinksSettingsTab }))
);

export const BACKLINKS_MANIFEST: ExtensionManifest = {
  id: 'backlinks',
  name: 'Backlinks & Unlinked Mentions',
  version: '1.0.0',
  description: 'Displays incoming bidirectional backlinks and unlinked mentions to the active note.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['backlinks', 'mentions', 'wikilinks', 'graph', 'navigation'],
  readme: backlinksReadme,
};

const BacklinkCountItem: React.FC<{ app: FlintApp }> = ({ app }) => {
  const count = app.workspace.backlinkCount;
  return (
    <span className="text-[#777777] cursor-default select-none">
      {count} {count === 1 ? 'backlink' : 'backlinks'}
    </span>
  );
};

const DocumentBacklinksFooter: React.FC<{
  documentId: string;
  documentTitle?: string;
  document?: any;
}> = ({ documentId, documentTitle, document }) => {
  const showBacklinksInDoc = useBacklinksSettings((s) => s.showBacklinksInDoc);
  if (!showBacklinksInDoc) return null;
  if (document?.is_folder || document?.doc_type === 'canvas') return null;
  return (
    <DocumentBacklinks
      documentId={documentId}
      documentTitle={documentTitle || document?.title || 'Untitled'}
    />
  );
};

export class BacklinksExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = BACKLINKS_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Right Sidebar Tab
    this.registerSidebarTab({
      id: 'backlinks',
      title: 'Backlinks & Mentions',
      icon: <LinkSquare02Icon size={14} />,
      side: 'right',
      order: 20,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyBacklinksView />
        </React.Suspense>
      ),
    });

    // 2. Register Document Footer Widget (In-Note Backlinks)
    this.registerDocumentFooter({
      id: 'document-backlinks',
      order: 10,
      render: (props) => <DocumentBacklinksFooter {...props} />,
    });

    // 3. Register Status Bar backlink count
    this.addStatusBarItem({
      id: 'backlink-count',
      alignment: 'right',
      order: 10,
      render: (app) => <BacklinkCountItem app={app} />,
    });

    // 4. Register Command to toggle in-document backlinks
    this.addCommand({
      id: 'cmd-toggle-backlinks-in-doc',
      title: 'Backlinks: Toggle backlinks in document',
      section: 'Backlinks',
      icon: <LinkSquare02Icon size={16} />,
      action: (app) => {
        const { showBacklinksInDoc, setShowBacklinksInDoc } = useBacklinksSettings.getState();
        const next = !showBacklinksInDoc;
        setShowBacklinksInDoc(next);
        app.workspace.showToast(
          next ? 'Backlinks in document enabled' : 'Backlinks in document disabled',
          'info'
        );
      },
    });

    // 5. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'backlinks',
      name: 'Backlinks',
      icon: <LinkSquare02Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyBacklinksSettingsTab />
        </React.Suspense>
      ),
    });

    // 6. Register Document Menu Actions
    this.registerDocMenuAction({
      id: 'toggle-backlinks-in-doc',
      title: 'Backlinks in document',
      icon: <LinkSquare02Icon size={14} className="text-[#8b8e95] group-hover:text-white shrink-0" />,
      group: 'primary',
      order: 10,
      isChecked: () => useBacklinksSettings.getState().showBacklinksInDoc,
      onClick: (app) => {
        const { showBacklinksInDoc, setShowBacklinksInDoc } = useBacklinksSettings.getState();
        const next = !showBacklinksInDoc;
        setShowBacklinksInDoc(next);
        app.workspace.showToast(
          next ? 'Backlinks in document enabled' : 'Backlinks in document disabled',
          'info'
        );
      },
    });

    this.registerDocMenuAction({
      id: 'open-backlinks-view',
      title: 'Backlinks',
      group: 'linked-view',
      order: 10,
      onClick: (app) => {
        app.workspace.setActiveSidebarTab('right', 'backlinks');
        app.workspace.setSidebarOpen('right', true);
      },
    });

    this.registerDocMenuAction({
      id: 'open-outgoing-links-view',
      title: 'Outgoing links',
      group: 'linked-view',
      order: 20,
      onClick: (app) => {
        app.workspace.setActiveSidebarTab('right', 'backlinks');
        app.workspace.setSidebarOpen('right', true);
      },
    });

    // ── MCP Tools Registration ──

    // 7. Tool: backlinks_get_incoming
    this.registerTool({
      name: 'get_incoming',
      description: 'Get incoming backlinks that link to the specified document from other notes.',
      category: 'backlinks',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Target document identifier to find backlinks for',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string;
          if (!documentId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'documentId parameter is required' }],
            };
          }
          const backlinks = await getBacklinksForDocument(documentId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ documentId, backlinks, total: backlinks.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 8. Tool: backlinks_get_outgoing
    this.registerTool({
      name: 'get_outgoing',
      description: 'Get all outgoing wikilinks and document references contained within a note.',
      category: 'backlinks',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Source document identifier to extract outgoing links from',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string;
          if (!documentId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'documentId parameter is required' }],
            };
          }
          const outgoingLinks = await getOutgoingLinksWithDetails(documentId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ documentId, outgoingLinks, total: outgoingLinks.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 9. Tool: backlinks_get_unlinked_mentions
    this.registerTool({
      name: 'get_unlinked_mentions',
      description: 'Find plain-text mentions of a document title in other notes that are not yet wikilinked.',
      category: 'backlinks',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Document identifier being mentioned',
          },
          title: {
            type: 'string',
            description: 'Title string to search unlinked mentions for',
          },
        },
        required: ['documentId', 'title'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string;
          const title = args.title as string;
          if (!documentId || !title) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'documentId and title parameters are required' }],
            };
          }
          const mentions = await getUnlinkedMentionsForDocument(documentId, title);
          return {
            content: [{ type: 'text', text: JSON.stringify({ documentId, title, mentions, total: mentions.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 10. Tool: backlinks_convert_mention
    this.registerTool({
      name: 'convert_mention',
      description: 'Convert a plain-text mention in a source document into a formal [[wikilink]].',
      category: 'backlinks',
      isDestructive: false,
      parameters: {
        type: 'object',
        properties: {
          sourceDocumentId: {
            type: 'string',
            description: 'Source document ID where the plain-text mention appears',
          },
          title: {
            type: 'string',
            description: 'The title string to wrap in wikilink brackets',
          },
        },
        required: ['sourceDocumentId', 'title'],
      },
      handler: async (args: Record<string, unknown>, _app: FlintApp): Promise<McpToolResult> => {
        try {
          const sourceDocumentId = args.sourceDocumentId as string;
          const title = args.title as string;
          if (!sourceDocumentId || !title) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'sourceDocumentId and title parameters are required' }],
            };
          }
          const success = await convertUnlinkedMentionToLink(sourceDocumentId, title);
          return {
            content: [{ type: 'text', text: JSON.stringify({ success, sourceDocumentId, title }) }],
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

// Backwards compatibility alias
export const BacklinksPlugin = BacklinksExtension;
export default BacklinksExtension;
