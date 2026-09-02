/**
 * @module PropertiesExtension
 * @description
 * Built-in core extension managing structured YAML frontmatter note properties.
 * Registers the properties sidebar tab, in-document header editor, and doc menu action.
 *
 * Uses native FlintApp APIs (app.workspace.setActiveSidebarTab, app.workspace.showToast).
 *
 * @since 0.1.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { PackageIcon, PlusCircleIcon } from '@/components/common/Icons';
import { propertiesReadme } from './readme';
import { PropertiesView } from './PropertiesView';
import { DocumentPropertiesHeader } from './DocumentPropertiesHeader';
import { PropertiesSettingsTab } from './PropertiesSettingsTab';
import { usePropertiesSettings } from './propertiesSettings';

export const PROPERTIES_MANIFEST: ExtensionManifest = {
  id: 'note-properties',
  name: 'Note Properties',
  version: '1.0.0',
  description: 'Structured frontmatter metadata and property fields editor.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['properties', 'frontmatter', 'yaml', 'metadata', 'editor'],
  readme: propertiesReadme,
};

export class PropertiesExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = PROPERTIES_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Right Sidebar Tab
    this.registerSidebarTab({
      id: 'properties',
      title: 'Properties',
      icon: <PackageIcon size={14} />,
      side: 'right',
      order: 40,
      render: () => <PropertiesView />,
    });

    // 2. Register In-Document Properties Header Widget
    this.registerDocumentHeader({
      id: 'note-properties-header',
      order: 10,
      defaultFolded: () => usePropertiesSettings.getState().startFolded,
      render: ({ documentId, mode, isFolded }) => {
        if (isFolded) return null;
        return <DocumentPropertiesHeader documentId={documentId} mode={mode} isFolded={isFolded} />;
      },
    });

    // 3. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'properties-settings',
      name: 'Properties',
      icon: <PackageIcon size={14} />,
      render: () => <PropertiesSettingsTab />,
    });

    // 4. Register Document Menu Action
    this.registerDocMenuAction({
      id: 'add-file-property',
      title: 'Add file property',
      icon: <PlusCircleIcon size={14} className="text-[#8b8e95] group-hover:text-white shrink-0" />,
      group: 'tools',
      order: 30,
      onClick: (app) => {
        app.workspace.setActiveSidebarTab('right', 'properties');
        app.workspace.showToast('Opened properties panel', 'info');
      },
    });

    // 5. Register MCP Tools
    // ── Tool: get ──
    this.registerTool({
      name: 'get',
      description: 'Get all frontmatter YAML properties for a document.',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Unique document identifier',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const documentId = String(args.documentId || '').trim();
          if (!documentId) {
            throw new Error("Parameter 'documentId' is required.");
          }
          const properties = this.app.hearth.getDocumentProperties(documentId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  documentId,
                  properties,
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

    // ── Tool: set ──
    this.registerTool({
      name: 'set',
      description: 'Set or update a frontmatter property on a document.',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Unique document identifier',
          },
          key: {
            type: 'string',
            description: 'Property key name to set (e.g. "status", "tags", "priority")',
          },
          value: {
            type: 'string',
            description: 'Property value (string or JSON-encoded value, e.g. ["tag1", "tag2"], true, 123)',
          },
        },
        required: ['documentId', 'key', 'value'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const documentId = String(args.documentId || '').trim();
          const key = String(args.key || '').trim();
          if (!documentId) {
            throw new Error("Parameter 'documentId' is required.");
          }
          if (!key) {
            throw new Error("Parameter 'key' is required.");
          }

          let value: unknown = args.value;
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch {
              // keep as string
            }
          }

          await this.app.hearth.updateDocumentProperties(documentId, { [key]: value });
          const updated = this.app.hearth.getDocumentProperties(documentId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  documentId,
                  key,
                  value,
                  properties: updated,
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

    // ── Tool: delete ──
    this.registerTool({
      name: 'delete',
      description: 'Delete a frontmatter property from a document.',
      isDestructive: true,
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Unique document identifier',
          },
          key: {
            type: 'string',
            description: 'Property key name to remove',
          },
        },
        required: ['documentId', 'key'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const documentId = String(args.documentId || '').trim();
          const key = String(args.key || '').trim();
          if (!documentId) {
            throw new Error("Parameter 'documentId' is required.");
          }
          if (!key) {
            throw new Error("Parameter 'key' is required.");
          }

          await this.app.hearth.updateDocumentProperties(documentId, { [key]: null });
          const updated = this.app.hearth.getDocumentProperties(documentId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  documentId,
                  deletedKey: key,
                  properties: updated,
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
export const PropertiesPlugin = PropertiesExtension;
export default PropertiesExtension;
