/**
 * @module NativeTabActions
 * @description
 * Registers foundational tab context menu actions for document tabs.
 * Enables quick link copying, path copying, and tab duplication.
 *
 * @author Yuliet Li
 * @since 1.2.0
 */

import React from 'react';
import type { NoetherApp } from '../app/NoetherApp';
import { Link01Icon, Copy01Icon, SplitRightIcon } from '@/components/common/Icons';

export function registerNativeTabActions(app: NoetherApp): void {
  // ── Copy Note Wikilink ([[Title]]) ──
  app.tabContextMenu.registerAction({
    id: 'native:copy-note-link',
    title: 'Copy Note Link',
    icon: <Link01Icon size={14} />,
    section: 'actions',
    order: 10,
    isVisible: (ctx) => Boolean(ctx.doc),
    onClick: async (ctx) => {
      if (ctx.doc) {
        const link = `[[${ctx.doc.title || 'Untitled'}]]`;
        await navigator.clipboard.writeText(link);
        ctx.app.workspace.showToast('Copied note link [[...]]', 'success');
      }
    },
  });

  // ── Copy Vault-Relative Path ──
  app.tabContextMenu.registerAction({
    id: 'native:copy-relative-path',
    title: 'Copy Relative Path',
    icon: <Copy01Icon size={14} />,
    section: 'actions',
    order: 20,
    isVisible: (ctx) => Boolean(ctx.doc),
    onClick: async (ctx) => {
      if (ctx.doc) {
        const rel = await ctx.app.vault.getDocumentPath(ctx.doc.id);
        const fullRel = rel ? `${rel}.md` : `${ctx.doc.title || 'Untitled'}.md`;
        await navigator.clipboard.writeText(fullRel);
        ctx.app.workspace.showToast(`Copied path: ${fullRel}`, 'success');
      }
    },
  });
}
