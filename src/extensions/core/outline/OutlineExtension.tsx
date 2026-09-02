/**
 * @module OutlineExtension
 * @description
 * Built-in core extension rendering a document outline and table of contents
 * in the right sidebar tab based on Markdown headings in the active note.
 *
 * @since 0.1.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { LeftToRightListBulletIcon } from '@/components/common/Icons';
import { HeadingItem } from '@/types';
import { getDocumentById } from '@/lib/db/documents';
import { outlineReadme } from './readme';

const LazyOutlineView = React.lazy(() =>
  import('./OutlineView').then((m) => ({ default: m.OutlineView }))
);
const LazyOutlineSettingsTab = React.lazy(() =>
  import('./OutlineSettingsTab').then((m) => ({ default: m.OutlineSettingsTab }))
);

export const OUTLINE_MANIFEST: ExtensionManifest = {
  id: 'outline',
  name: 'Document Outline',
  version: '1.0.0',
  description: 'Interactive table of contents and document outline navigator based on Markdown headings.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['outline', 'headings', 'toc', 'navigation', 'structure'],
  readme: outlineReadme,
};

export interface OutlineHeadingNode {
  id: string;
  level: number;
  text: string;
  pos: number;
  children: OutlineHeadingNode[];
}

/**
 * Transforms flat HeadingItem array into a hierarchical outline tree.
 */
export function buildHeadingOutlineTree(headings: HeadingItem[]): OutlineHeadingNode[] {
  const root: OutlineHeadingNode[] = [];
  const stack: OutlineHeadingNode[] = [];

  headings.forEach((h, index) => {
    const node: OutlineHeadingNode = {
      id: h.id || `h-${index}`,
      level: h.level,
      text: h.text,
      pos: h.pos ?? index,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return root;
}

export class OutlineExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = OUTLINE_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Right Sidebar Tab
    this.registerSidebarTab({
      id: 'outline',
      title: 'Outline',
      icon: <LeftToRightListBulletIcon size={14} />,
      side: 'right',
      order: 10,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyOutlineView />
        </React.Suspense>
      ),
    });

    // 2. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'outline-settings',
      name: 'Outline',
      icon: <LeftToRightListBulletIcon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyOutlineSettingsTab />
        </React.Suspense>
      ),
    });

    // 3. Register MCP Tools
    // ── Tool: get_headings ──
    this.registerTool({
      name: 'get_headings',
      description: 'Get heading outline for a note. Returns hierarchical headings array.',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'The unique ID of the document to extract headings from',
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

          let doc = this.app.hearth.getDocumentById(documentId);
          if (!doc || !doc.content_json) {
            const dbDoc = await getDocumentById(documentId);
            if (dbDoc) doc = dbDoc;
          }

          if (!doc) {
            throw new Error(`Document with ID "${documentId}" not found.`);
          }

          const headings: HeadingItem[] = [];
          if (doc.content_json) {
            try {
              const docObj = typeof doc.content_json === 'string' ? JSON.parse(doc.content_json) : doc.content_json;
              let orderIndex = 0;
              const traverse = (node: any) => {
                if (!node) return;
                if (node.type === 'heading') {
                  const text = node.content?.map((c: any) => c.text || '').join('') || '';
                  headings.push({
                    id: `h-${headings.length}-${text.slice(0, 15).replace(/\s+/g, '-').toLowerCase()}`,
                    level: node.attrs?.level || 1,
                    text,
                    pos: orderIndex++,
                  });
                }
                if (Array.isArray(node.content)) {
                  for (const child of node.content) {
                    traverse(child);
                  }
                }
              };
              if (docObj.content) {
                for (const node of docObj.content) {
                  traverse(node);
                }
              }
            } catch (err) {
              console.error('[OutlineExtension] Failed to parse document content JSON:', err);
            }
          }

          const outlineTree = buildHeadingOutlineTree(headings);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  documentId: doc.id,
                  title: doc.title,
                  headingCount: headings.length,
                  outline: outlineTree,
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
export const OutlinePlugin = OutlineExtension;
export default OutlineExtension;
