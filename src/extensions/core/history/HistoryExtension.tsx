import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { NoetherApp } from '@/core/app/NoetherApp';
import { HistoryIcon } from '@/components/common/Icons';
import { getDocumentPath, getDocumentById } from '@/lib/db/documents';
import { useHistorySettings } from './historySettings';
import { HistoryView } from './HistoryView';
import manifest from './manifest.json';
import historyReadme from './readme.md?raw';

const LazyHistorySettingsTab = React.lazy(() =>
  import('./HistorySettingsTab').then((m) => ({ default: m.HistorySettingsTab }))
);

export const HISTORY_MANIFEST: ExtensionManifest = {
  ...(manifest as ExtensionManifest),
  readme: historyReadme,
};

export class HistoryExtension extends Extension {
  private snapshotTimers: Map<string, any> = new Map();

  constructor(app: NoetherApp, manifest: ExtensionManifest = HISTORY_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Right Sidebar Tab for instant 0ms history inspection
    this.registerSidebarTab({
      id: 'history',
      title: 'Version History',
      icon: <HistoryIcon size={14} />,
      side: 'right',
      order: 25,
      render: () => <HistoryView />,
    });

    // 2. Register Command Palette Actions
    this.addCommand({
      id: 'cmd-open-note-history',
      title: 'Version History: Open note history',
      section: 'Navigation',
      icon: <HistoryIcon size={16} />,
      hotkey: 'Ctrl+Shift+H',
      aliases: ['history', 'versions', 'revisions', 'timeline', 'git history', 'diff'],
      action: (app) => {
        app.workspace.setActiveSidebarTab('right', 'history');
      },
    });

    this.addCommand({
      id: 'cmd-create-version-snapshot',
      title: 'Version History: Take snapshot now',
      section: 'Navigation',
      icon: <HistoryIcon size={16} />,
      isEnabled: (app) => Boolean(app.vault.activeDocument && !app.vault.activeDocument.is_folder),
      action: async (app) => {
        const active = app.vault.activeDocument;
        if (!active) return;
        const docs = app.vault.documents;
        const rawPath = getDocumentPath(active, docs);
        const relPath = rawPath ? (rawPath.endsWith('.md') ? rawPath : `${rawPath}.md`) : `${active.title}.md`;
        const res = await app.vcs.createSnapshot(relPath, `Snapshot: ${active.title}`);
        if (res.success) {
          app.workspace.showToast('Created version snapshot', 'success');
        } else {
          app.workspace.showToast(res.error || 'Failed to create snapshot', 'warning');
        }
      },
    });

    this.addCommand({
      id: 'cmd-init-version-history',
      title: 'Version History: Enable in vault',
      section: 'Navigation',
      icon: <HistoryIcon size={16} />,
      action: async (app) => {
        const res = await app.vcs.initVault();
        if (res.success) {
          app.workspace.showToast('Version History enabled for this vault', 'success');
        } else {
          app.workspace.showToast(res.error || 'Failed to initialize Git', 'warning');
        }
      },
    });

    // 4. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'history-settings',
      name: 'Version History',
      icon: <HistoryIcon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyHistorySettingsTab />
        </React.Suspense>
      ),
      onRestoreDefaults: () => {
        useHistorySettings.getState().restoreDefaults();
      },
    });

    // 5. Register AI MCP Tools (Rule 5 Compliance)
    this.registerTool({
      name: 'get_file_history',
      description: 'Retrieves chronological revision history and commit messages for a given document in the vault',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the document to inspect',
          },
          limit: {
            type: 'number',
            description: 'Optional maximum number of revisions to return (defaults to 20)',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, any>): Promise<McpToolResult> => {
        const documentId = String(args.documentId || '');
        const limit = typeof args.limit === 'number' ? args.limit : 20;

        const doc = await getDocumentById(documentId);
        if (!doc) {
          return {
            content: [{ type: 'text', text: `Error: Document with ID ${documentId} not found` }],
            isError: true,
          };
        }
        const docs = this.app.vault.documents;
        const rawPath = getDocumentPath(doc, docs);
        const relPath = rawPath ? (rawPath.endsWith('.md') ? rawPath : `${rawPath}.md`) : `${doc.title}.md`;

        const res = await this.app.vcs.getFileHistory(relPath, limit);
        if (!res.success) {
          return {
            content: [{ type: 'text', text: `Failed to retrieve history: ${res.error || 'Unknown error'}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(res.revisions || [], null, 2) }],
        };
      },
    });

    this.registerTool({
      name: 'get_file_diff',
      description: 'Retrieves unified diff lines comparing a historical revision to the current working copy or another commit',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The document ID to compare',
          },
          commitHash: {
            type: 'string',
            description: 'The historical commit hash to compare against',
          },
        },
        required: ['documentId', 'commitHash'],
      },
      handler: async (args: Record<string, any>): Promise<McpToolResult> => {
        const documentId = String(args.documentId || '');
        const commitHash = String(args.commitHash || '');

        const doc = await getDocumentById(documentId);
        if (!doc) {
          return {
            content: [{ type: 'text', text: `Error: Document with ID ${documentId} not found` }],
            isError: true,
          };
        }
        const docs = this.app.vault.documents;
        const rawPath = getDocumentPath(doc, docs);
        const relPath = rawPath ? (rawPath.endsWith('.md') ? rawPath : `${rawPath}.md`) : `${doc.title}.md`;

        const res = await this.app.vcs.getFileDiff(relPath, commitHash);
        if (!res.success) {
          return {
            content: [{ type: 'text', text: `Failed to retrieve diff: ${res.error || 'Unknown error'}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text', text: res.diff || 'No text differences detected.' }],
        };
      },
    });

    this.registerTool({
      name: 'restore_file_version',
      description: 'Restores a document in the vault to a previous historical version',
      isDestructive: true,
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The document ID to restore',
          },
          commitHash: {
            type: 'string',
            description: 'The historical commit hash to restore to',
          },
        },
        required: ['documentId', 'commitHash'],
      },
      handler: async (args: Record<string, any>): Promise<McpToolResult> => {
        const documentId = String(args.documentId || '');
        const commitHash = String(args.commitHash || '');

        const doc = await getDocumentById(documentId);
        if (!doc) {
          return {
            content: [{ type: 'text', text: `Error: Document with ID ${documentId} not found` }],
            isError: true,
          };
        }
        const docs = this.app.vault.documents;
        const rawPath = getDocumentPath(doc, docs);
        const relPath = rawPath ? (rawPath.endsWith('.md') ? rawPath : `${rawPath}.md`) : `${doc.title}.md`;

        // Retrieve historical content
        const contentRes = await this.app.vcs.getHistoricalContent(relPath, commitHash);
        if (!contentRes.success || contentRes.content === undefined) {
          return {
            content: [{ type: 'text', text: `Failed to fetch historical content: ${contentRes.error || 'Unknown error'}` }],
            isError: true,
          };
        }

        // Save back via app vault API
        await this.app.vault.saveDocument(documentId, contentRes.content);

        return {
          content: [{ type: 'text', text: `Successfully restored document "${doc.title}" to revision ${commitHash.slice(0, 7)}` }],
        };
      },
    });

    this.registerTool({
      name: 'create_file_snapshot',
      description: 'Creates a manual snapshot commit for a document or all modified files in the vault',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Optional document ID to snapshot. If omitted, snapshots the entire vault.',
          },
          message: {
            type: 'string',
            description: 'Optional snapshot message description',
          },
        },
      },
      handler: async (args: Record<string, any>): Promise<McpToolResult> => {
        const documentId = args.documentId ? String(args.documentId) : undefined;
        const message = args.message ? String(args.message) : undefined;

        let relPath: string | undefined = undefined;
        if (documentId) {
          const doc = await getDocumentById(documentId);
          if (doc) {
            const docs = this.app.vault.documents;
            const rawPath = getDocumentPath(doc, docs);
            relPath = rawPath ? (rawPath.endsWith('.md') ? rawPath : `${rawPath}.md`) : `${doc.title}.md`;
          }
        }

        const res = await this.app.vcs.createSnapshot(relPath, message);
        if (!res.success) {
          return {
            content: [{ type: 'text', text: `Failed to create snapshot: ${res.error || 'Unknown error'}` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: res.committed
                ? `Snapshot recorded successfully (${res.hash || 'committed'})`
                : 'No changes detected to snapshot',
            },
          ],
        };
      },
    });

    // 6. EventBus Listener for Debounced Auto-Snapshots
    this.onEvent('document:saved', (payload: any) => {
      const { autoSnapshot, debounceSeconds } = useHistorySettings.getState();
      if (!autoSnapshot) return;

      const docId = payload?.id || payload?.documentId || this.app.vault.activeDocument?.id;
      if (!docId) return;

      // Cancel previous pending timer for this document
      if (this.snapshotTimers.has(docId)) {
        clearTimeout(this.snapshotTimers.get(docId));
      }

      const timer = setTimeout(async () => {
        this.snapshotTimers.delete(docId);
        try {
          const doc = await getDocumentById(docId);
          if (!doc) return;
          const docs = this.app.vault.documents;
          const rawPath = getDocumentPath(doc, docs);
          if (!rawPath) return;
          const relPath = rawPath.endsWith('.md') ? rawPath : `${rawPath}.md`;
          await this.app.vcs.createSnapshot(relPath, 'Auto-saved changes');
        } catch (err) {
          console.warn('[Version History] Auto-snapshot failed silently:', err);
        }
      }, (debounceSeconds || 5) * 1000);

      this.snapshotTimers.set(docId, timer);
    });
  }

  public onunload(): void {
    // Clear all pending debounce timers
    for (const timer of this.snapshotTimers.values()) {
      clearTimeout(timer);
    }
    this.snapshotTimers.clear();
  }
}
