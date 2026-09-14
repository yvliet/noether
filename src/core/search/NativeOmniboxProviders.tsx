/**
 * @module NativeOmniboxProviders
 * @description
 * Registers core omnibox search providers into NoetherApp.
 * Provides instant filtering for tasks, bookmarks, tags, and spatial canvases
 * through dedicated prefixes (e.g. `task:`, `bm:`, `tag:`, `canvas:`).
 *
 * @author Yuliet Li
 * @since 1.2.0
 */

import React from 'react';
import type { NoetherApp } from '../app/NoetherApp';
import {
  CheckmarkSquare02Icon,
  Bookmark01Icon,
  Tag01Icon,
  DashboardSquare01Icon,
} from '@/components/common/Icons';

export function registerNativeOmniboxProviders(app: NoetherApp): void {
  // ── Vault Tasks Provider (task: / tasks:) ──
  app.omnibox.registerProvider({
    id: 'native:tasks',
    name: 'Tasks',
    prefix: 'task:',
    placeholder: 'Filter tasks across vault...',
    prefixOnly: true,
    order: 10,
    search: async (query, ctx) => {
      const q = query.trim();
      const tasks = await ctx.app.vault.getGlobalTasks({
        query: q || undefined,
      });

      return tasks.slice(0, 50).map((t) => ({
        id: `native:task:${t.id}`,
        title: t.text,
        description: `${t.completed ? 'Completed' : 'Pending'} · ${t.document_title}`,
        icon: (
          <CheckmarkSquare02Icon
            size={14}
            className={t.completed ? 'text-emerald-500' : 'text-[var(--noether-text-muted)]'}
          />
        ),
        category: 'Tasks',
        onSelect: async () => {
          await ctx.app.workspace.openTab(t.document_id, t.document_title);
        },
      }));
    },
  });

  app.omnibox.registerProvider({
    id: 'native:tasks-plural',
    name: 'Tasks',
    prefix: 'tasks:',
    placeholder: 'Filter tasks across vault...',
    prefixOnly: true,
    order: 11,
    search: (query, ctx) => {
      const p = app.omnibox.getProvider('native:tasks');
      return p ? p.search(query, ctx) : [];
    },
  });

  // ── Bookmarked Notes Provider (bm: / bookmark:) ──
  app.omnibox.registerProvider({
    id: 'native:bookmarks',
    name: 'Bookmarks',
    prefix: 'bm:',
    placeholder: 'Filter bookmarked notes...',
    prefixOnly: true,
    order: 20,
    search: (query, ctx) => {
      const q = query.toLowerCase().trim();
      return ctx.documents
        .filter((d) => !d.is_folder && d.is_bookmarked && (!q || (d.title && d.title.toLowerCase().includes(q))))
        .slice(0, 30)
        .map((d) => ({
          id: `native:bm:${d.id}`,
          title: d.title || 'Untitled',
          description: 'Bookmarked Note',
          icon: <Bookmark01Icon size={14} className="text-amber-500" />,
          category: 'Bookmarks',
          onSelect: () => {
            ctx.app.workspace.openTab(d.id, d.title);
          },
        }));
    },
  });

  app.omnibox.registerProvider({
    id: 'native:bookmarks-full',
    name: 'Bookmarks',
    prefix: 'bookmark:',
    placeholder: 'Filter bookmarked notes...',
    prefixOnly: true,
    order: 21,
    search: (query, ctx) => {
      const p = app.omnibox.getProvider('native:bookmarks');
      return p ? p.search(query, ctx) : [];
    },
  });

  // ── Vault Tags Provider (tag: / #) ──
  app.omnibox.registerProvider({
    id: 'native:tags',
    name: 'Tags',
    prefix: 'tag:',
    placeholder: 'Search tags across vault...',
    prefixOnly: true,
    order: 30,
    search: async (query, ctx) => {
      const q = query.toLowerCase().trim();
      const tags = await ctx.app.vault.getTags();
      return tags
        .filter((t) => !q || t.tag.toLowerCase().includes(q))
        .slice(0, 30)
        .map((t) => ({
          id: `native:tag:${t.tag}`,
          title: `#${t.tag}`,
          description: `${t.count} note${t.count === 1 ? '' : 's'}`,
          icon: <Tag01Icon size={14} className="text-cyan-500" />,
          category: 'Tags',
          onSelect: () => {
            ctx.app.workspace.showToast(`Selected tag #${t.tag}`, 'info');
          },
        }));
    },
  });

  app.omnibox.registerProvider({
    id: 'native:tags-hash',
    name: 'Tags',
    prefix: '#',
    placeholder: 'Search tags across vault...',
    prefixOnly: true,
    order: 31,
    search: (query, ctx) => {
      const p = app.omnibox.getProvider('native:tags');
      return p ? p.search(query, ctx) : [];
    },
  });

  // ── Infinite Canvas Provider (canvas:) ──
  app.omnibox.registerProvider({
    id: 'native:canvases',
    name: 'Canvases',
    prefix: 'canvas:',
    placeholder: 'Filter spatial canvases...',
    prefixOnly: true,
    order: 40,
    search: (query, ctx) => {
      const q = query.toLowerCase().trim();
      return ctx.documents
        .filter(
          (d) =>
            !d.is_folder &&
            (d.doc_type === 'canvas' || d.title?.endsWith('.canvas')) &&
            (!q || (d.title && d.title.toLowerCase().includes(q)))
        )
        .slice(0, 30)
        .map((d) => ({
          id: `native:canvas:${d.id}`,
          title: d.title || 'Untitled Canvas',
          description: 'Infinite spatial canvas',
          icon: <DashboardSquare01Icon size={14} className="text-purple-400" />,
          category: 'Canvases',
          onSelect: () => {
            ctx.app.workspace.openTab(d.id, d.title, { viewType: 'canvas' });
          },
        }));
    },
  });
}
