/**
 * @module OmniboxProviderRegistry
 * @description
 * Inversion of Control (IoC) registry enabling extensions to contribute searchable items
 * and specialized prefix providers to the universal command palette / omnibox (Ctrl+P / Ctrl+K).
 *
 * Supports global multi-provider search (tasks, bookmarks, tags, symbols) and targeted
 * prefix queries (e.g. '#' for tags, '!' for tasks, '@' for symbols).
 *
 * @since 1.2.0
 */

import React from 'react';
import type { NoetherApp } from '../app/NoetherApp';
import type { DocumentItem } from '@/types';
import type { Disposable } from '../extensions/types';

export interface OmniboxItem {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  category?: string;
  hotkey?: string;
  onSelect: () => void | Promise<void>;
  order?: number;
}

export interface OmniboxSearchContext {
  query: string;
  rawQuery: string;
  app: NoetherApp;
  documents: DocumentItem[];
}

export interface OmniboxProvider {
  id: string;
  name?: string;
  prefix?: string;
  placeholder?: string;
  prefixOnly?: boolean;
  search: (query: string, ctx: OmniboxSearchContext) => Promise<OmniboxItem[]> | OmniboxItem[];
  order?: number;
}

export interface OmniboxSearchResult {
  items: OmniboxItem[];
  activeProvider?: OmniboxProvider;
}

export class OmniboxProviderRegistry {
  private providers: Map<string, OmniboxProvider> = new Map();
  private listeners: Set<() => void> = new Set();

  public registerProvider(provider: OmniboxProvider): Disposable {
    this.providers.set(provider.id, provider);
    this.notify();

    return {
      dispose: () => {
        this.unregisterProvider(provider.id);
      },
    };
  }

  public unregisterProvider(id: string): void {
    if (this.providers.delete(id)) {
      this.notify();
    }
  }

  public getProviders(): OmniboxProvider[] {
    return Array.from(this.providers.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  public getProvider(id: string): OmniboxProvider | undefined {
    return this.providers.get(id);
  }

  public async searchAll(
    rawQuery: string,
    ctx: { app: NoetherApp; documents: DocumentItem[] }
  ): Promise<OmniboxSearchResult> {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      return { items: [] };
    }

    // Check if query starts with any registered provider's prefix
    const matchingPrefixProvider = Array.from(this.providers.values()).find(
      (p) => p.prefix && trimmed.startsWith(p.prefix)
    );

    if (matchingPrefixProvider) {
      const stripped = trimmed.slice(matchingPrefixProvider.prefix!.length).trim();
      const searchCtx: OmniboxSearchContext = {
        query: stripped,
        rawQuery: trimmed,
        app: ctx.app,
        documents: ctx.documents,
      };

      try {
        const results = await matchingPrefixProvider.search(stripped, searchCtx);
        return {
          items: Array.isArray(results) ? results : [],
          activeProvider: matchingPrefixProvider,
        };
      } catch (err) {
        console.error(`[OmniboxProviderRegistry] Error searching provider ${matchingPrefixProvider.id}:`, err);
        return { items: [], activeProvider: matchingPrefixProvider };
      }
    }

    // Universal search across all providers that do not require prefixOnly
    const activeProviders = Array.from(this.providers.values()).filter((p) => !p.prefixOnly);
    if (activeProviders.length === 0) {
      return { items: [] };
    }

    const searchCtx: OmniboxSearchContext = {
      query: trimmed,
      rawQuery: trimmed,
      app: ctx.app,
      documents: ctx.documents,
    };

    const results = await Promise.allSettled(
      activeProviders.map((p) => Promise.resolve(p.search(trimmed, searchCtx)))
    );

    const allItems: OmniboxItem[] = [];
    results.forEach((res, i) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allItems.push(...res.value);
      } else if (res.status === 'rejected') {
        console.error(`[OmniboxProviderRegistry] Error searching provider ${activeProviders[i].id}:`, res.reason);
      }
    });

    allItems.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    return { items: allItems };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) {
      try {
        l();
      } catch (err) {
        console.error('[OmniboxProviderRegistry] Notification error:', err);
      }
    }
  }
}

export const omniboxProviderRegistry = new OmniboxProviderRegistry();
