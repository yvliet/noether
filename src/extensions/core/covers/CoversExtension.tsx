/**
 * @module CoversExtension
 * @description
 * Built-in core extension providing customizable banner cover images for notes.
 * Registers the 'editor:banner' portal slot, Wallhaven search modal,
 * command palette actions, document menu options, settings tab, and MCP AI tools.
 *
 * @since 1.0.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { NoetherApp } from '@/core/app/NoetherApp';
import { FileImageIcon } from '@/components/common/Icons';
import manifest from './manifest.json';
import coversReadme from './readme.md?raw';
import { CoverBanner } from './CoverBanner';
import { GlobalCoverPickerModal } from './GlobalCoverPickerModal';
import { useCoverModalStore } from './coversModalStore';
import { CoversSettingsTab } from './CoversSettingsTab';
import { useCoversSettings } from './coversSettings';
import { DocumentItem } from '@/types';
import { preloadCoverImage, preloadAllVaultCovers, resolveCoverSource } from './coverPreloader';

export const COVERS_MANIFEST: ExtensionManifest = {
  ...(manifest as ExtensionManifest),
  isCore: true,
  readme: coversReadme,
};

export class CoversExtension extends Extension {
  constructor(app: NoetherApp, manifest: ExtensionManifest = COVERS_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register In-Editor Banner Portal Slot
    this.registerPortalSlot({
      id: 'banner',
      slot: 'editor:banner',
      order: 10,
      predicate: (ctx) => {
        if (!ctx.document) return false;
        const props = ctx.document.properties;
        if (!props) return false;
        try {
          const parsed = typeof props === 'string' ? JSON.parse(props) : props;
          const coverVal = parsed?.Cover;
          if (coverVal && typeof coverVal === 'string') {
            preloadCoverImage(coverVal);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      render: (ctx) => {
        return <CoverBanner document={ctx.document} app={ctx.app} />;
      },
    });

    // 2. Register Global Cover Picker Modal
    this.registerModal({
      id: 'picker-modal',
      render: () => <GlobalCoverPickerModal />,
    });

    // 3. Register Document Menu ("...") Action
    this.registerDocMenuAction({
      id: 'toggle-note-cover',
      title: 'Add or change cover',
      icon: <FileImageIcon size={14} className="text-[#8b8e95] group-hover:text-white shrink-0" />,
      group: 'tools',
      order: 25,
      onClick: (app, doc) => {
        const targetId = doc?.id || app.vault.activeDocument?.id;
        if (targetId) {
          useCoverModalStore.getState().open(targetId);
        } else {
          app.workspace.showToast('No active note open', 'info');
        }
      },
    });

    // 4. Register Command Palette Commands
    this.addCommand({
      id: 'add-or-change-cover',
      title: 'Covers: Add or change cover image',
      hotkey: undefined,
      action: (app) => {
        const activeDoc = app.vault.activeDocument;
        if (activeDoc) {
          useCoverModalStore.getState().open(activeDoc.id);
        } else {
          app.workspace.showToast('No active note open to add a cover', 'info');
        }
      },
    });

    this.addCommand({
      id: 'remove-cover',
      title: 'Covers: Remove cover image from note',
      hotkey: undefined,
      action: async (app) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc) {
          app.workspace.showToast('No active note open', 'info');
          return;
        }
        let props: Record<string, any> = {};
        try {
          props = typeof activeDoc.properties === 'string'
            ? JSON.parse(activeDoc.properties)
            : { ...(activeDoc.properties || {}) };
        } catch {}

        if (!props.Cover) {
          app.workspace.showToast('Note does not have a cover image', 'info');
          return;
        }

        delete props.Cover;
        delete props.Cover_y;
        delete props.cover;
        delete props.banner;
        delete props.cover_y;
        delete props.banner_y;
        await app.vault.setDocumentProperties(activeDoc.id, props);
        app.workspace.showToast('Removed note cover', 'info');
      },
    });

    // 5. Register Settings Tab
    this.registerSettingTab({
      id: 'covers-settings',
      name: 'Covers',
      icon: <FileImageIcon size={14} />,
      render: () => <CoversSettingsTab />,
      onRestoreDefaults: () => {
        useCoversSettings.getState().restoreDefaults();
      },
    });

    // 6. Register MCP Tools
    // ── Tool: get ──
    this.registerTool({
      name: 'get',
      description: 'Get cover image URL and vertical positioning offset for a note.',
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

          const doc = this.app.vault.documents.find((d: DocumentItem) => d.id === documentId);
          if (!doc) {
            throw new Error(`Document with ID "${documentId}" was not found.`);
          }

          let props: Record<string, any> = {};
          try {
            props = typeof doc.properties === 'string'
              ? JSON.parse(doc.properties)
              : (doc.properties || {});
          } catch {}

          const coverUrl = (props.Cover || '') as string;
          const coverY = typeof props.Cover_y === 'number' ? props.Cover_y : 0.5;

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    documentId,
                    hasCover: Boolean(coverUrl),
                    Cover: coverUrl || null,
                    Cover_y: coverY,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (err: any) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to get cover: ${err.message}` }],
          };
        }
      },
    });

    // ── Tool: set ──
    this.registerTool({
      name: 'set',
      description: 'Set cover image URL and optional vertical positioning offset for a note.',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Unique document identifier',
          },
          url: {
            type: 'string',
            description: 'Cover image URL, data URI, or vault attachment path',
          },
          position: {
            type: 'number',
            description: 'Optional vertical offset between 0.0 (top) and 1.0 (bottom). Defaults to 0.5.',
          },
        },
        required: ['documentId', 'url'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const documentId = String(args.documentId || '').trim();
          const url = String(args.url || '').trim();
          const position = typeof args.position === 'number' ? Math.max(0, Math.min(1, args.position)) : 0.5;

          if (!documentId) throw new Error("Parameter 'documentId' is required.");
          if (!url) throw new Error("Parameter 'url' is required.");

          preloadCoverImage(url);

          const doc = this.app.vault.documents.find((d: DocumentItem) => d.id === documentId);
          if (!doc) {
            throw new Error(`Document with ID "${documentId}" was not found.`);
          }

          let props: Record<string, any> = {};
          try {
            props = typeof doc.properties === 'string'
              ? JSON.parse(doc.properties)
              : { ...(doc.properties || {}) };
          } catch {}

          props.Cover = url;
          props.Cover_y = position;
          delete props.cover;
          delete props.banner;
          delete props.cover_y;
          delete props.banner_y;

          await this.app.vault.setDocumentProperties(documentId, props);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, documentId, Cover: url, Cover_y: position }, null, 2),
              },
            ],
          };
        } catch (err: any) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to set cover: ${err.message}` }],
          };
        }
      },
    });

    // ── Tool: remove ──
    this.registerTool({
      name: 'remove',
      description: 'Remove the cover image from a note.',
      isDestructive: true,
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
          if (!documentId) throw new Error("Parameter 'documentId' is required.");

          const doc = this.app.vault.documents.find((d: DocumentItem) => d.id === documentId);
          if (!doc) {
            throw new Error(`Document with ID "${documentId}" was not found.`);
          }

          let props: Record<string, any> = {};
          try {
            props = typeof doc.properties === 'string'
              ? JSON.parse(doc.properties)
              : { ...(doc.properties || {}) };
          } catch {}

          delete props.Cover;
          delete props.Cover_y;
          delete props.cover;
          delete props.banner;
          delete props.cover_y;
          delete props.banner_y;

          await this.app.vault.setDocumentProperties(documentId, props);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, documentId, removed: true }, null, 2),
              },
            ],
          };
        } catch (err: any) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to remove cover: ${err.message}` }],
          };
        }
      },
    });

    // 7. Register Dynamic Property Icon for Cover
    this.registerPropertyIcon({
      id: 'banner-icon',
      name: 'Cover',
      category: 'Media',
      keywords: ['photo', 'picture', 'cover', 'banner', 'wallpaper'],
      component: ({ size = 12, className = '' }) => <FileImageIcon size={size} className={className} />,
      defaultKeys: ['Cover'],
    });

    // 8. Proactive Image Preloading for Zero Perceived Latency
    preloadAllVaultCovers(this.app);

    this.onEvent('vault:loaded', () => {
      preloadAllVaultCovers(this.app);
    });

    this.onEvent('document:opened', (evt) => {
      const doc = this.app.vault.documents.find((d: DocumentItem) => d.id === evt.id);
      if (doc?.properties) {
        const raw = typeof doc.properties === 'string' ? doc.properties : '';
        if (raw && !raw.includes('Cover')) return;
        try {
          const parsed = typeof doc.properties === 'string' ? JSON.parse(doc.properties) : doc.properties;
          if (parsed?.Cover && typeof parsed.Cover === 'string') {
            resolveCoverSource(parsed.Cover, this.app);
          }
        } catch {}
      }
    });
  }
}

export default CoversExtension;
