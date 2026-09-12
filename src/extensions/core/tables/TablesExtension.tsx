/**
 * @module TablesExtension
 * @description
 * Built-in core extension for inserting and formatting interactive table blocks.
 * Registers settings tabs and editor insertion commands.
 *
 * @since 0.1.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { NoetherApp } from '@/core/app/NoetherApp';
import { GridTableIcon } from '@/components/common/Icons';
import manifest from './manifest.json';
import tablesReadme from './readme.md?raw';
import { useTablesSettings } from './tablesSettings';

const LazyTablesSettingsTab = React.lazy(() =>
  import('./TablesSettingsTab').then((m) => ({ default: m.TablesSettingsTab }))
);

export const TABLES_MANIFEST: ExtensionManifest = {
  ...(manifest as ExtensionManifest),
  readme: tablesReadme,
};

export class TablesExtension extends Extension {
  constructor(app: NoetherApp, manifest: ExtensionManifest = TABLES_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Extension Settings Tab in Settings Window
    this.registerSettingTab({
      id: 'tables-settings',
      name: 'Tables',
      icon: <GridTableIcon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyTablesSettingsTab />
        </React.Suspense>
      ),
      onRestoreDefaults: () => {
        useTablesSettings.getState().restoreDefaults();
      },
    });

    // 2. Register Command Palette Command
    this.addCommand({
      id: 'editor:insert-table',
      title: 'Insert table',
      icon: <GridTableIcon size={14} />,
      isEnabled: (app) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc || activeDoc.is_folder) return false;
        const nonMarkdownTypes = ['canvas', 'image', 'audio', 'video', 'pdf'];
        if (activeDoc.doc_type && nonMarkdownTypes.includes(activeDoc.doc_type)) {
          return false;
        }
        return true;
      },
      action: (app) => {
        const { defaultRows, defaultCols } = useTablesSettings.getState();
        const handled = app.editor.dispatchAction('insertTable', { rows: defaultRows, cols: defaultCols, withHeaderRow: true });
        if (!handled) {
          app.events.emit('editor:action', { action: 'insert-table', payload: { rows: defaultRows, cols: defaultCols } });
          window.dispatchEvent(new CustomEvent('noether:insert-table-command', { detail: { rows: defaultRows, cols: defaultCols } }));
        }
      },
    });

    // 3. Register Slash Command
    this.registerSlashCommand({
      title: 'Table',
      description: 'Insert an interactive table grid',
      icon: 'table',
      command: ({ editor, range, rows, cols }: any) => {
        const { defaultRows, defaultCols } = useTablesSettings.getState();
        const r = rows || defaultRows || 3;
        const c = cols || defaultCols || 3;
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: r, cols: c, withHeaderRow: true })
          .run();
      },
    });

    // 4. Register MCP Tools
    // ── Tool: insert ──
    this.registerTool({
      name: 'insert',
      description: 'Insert a new table grid block into the active document editor.',
      parameters: {
        type: 'object',
        properties: {
          rows: {
            type: 'number',
            description: 'Number of rows in the table (minimum 1, default 3)',
          },
          cols: {
            type: 'number',
            description: 'Number of columns in the table (minimum 1, default 3)',
          },
        },
        required: ['rows', 'cols'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const rows = Math.max(1, Math.floor(Number(args.rows) || 3));
          const cols = Math.max(1, Math.floor(Number(args.cols) || 3));

          const handled = this.app.editor.dispatchAction('insertTable', { rows, cols, withHeaderRow: true });
          if (!handled) {
            this.app.events.emit('editor:action', {
              action: 'insert-table',
              payload: { rows, cols },
            });

            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('noether:insert-table-command', {
                  detail: { rows, cols },
                })
              );
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  rows,
                  cols,
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

export default TablesExtension;
