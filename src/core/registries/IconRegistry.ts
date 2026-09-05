/**
 * @file IconRegistry.ts
 * @description
 * Host-level Inversion of Control (IoC) registry for icon providers in Flint.
 * Manages icon pack providers (e.g. HugeIcons, Emoji, Lucide, React Icons)
 * allowing native components, rich text documents, file trees, and extensions
 * to render and query icons through a unified identifier interface (<pack>:<iconId>).
 *
 * Designed for zero-overhead dynamic resolution and extensible multi-pack ecosystems.
 *
 * @author Yuliet Li
 * @since 1.1.0
 */

import React from 'react';
import type { Disposable } from '../extensions/types';

export interface IconRenderOptions {
  size?: number;
  className?: string;
  color?: string;
  style?: React.CSSProperties;
}

export interface IconDescriptor {
  id: string;
  name: string;
  category?: string;
  keywords?: string[];
}

export interface IconPackProvider {
  /** Unique provider identifier (e.g., 'hugeicons', 'emoji', 'lucide', 'react-icons') */
  id: string;
  /** Human-readable display label */
  name: string;
  /** Short description of the icon set */
  description?: string;
  /** Synchronously or reactively renders an icon component */
  render: (iconId: string, options?: IconRenderOptions) => React.ReactNode;
  /** Optional icon search capability */
  searchIcons?: (query: string, category?: string) => Promise<IconDescriptor[]> | IconDescriptor[];
  /** Optional categories provided by this pack */
  getCategories?: () => string[];
  /** Optional predicate to check whether an icon exists in this pack */
  hasIcon?: (iconId: string) => boolean;
}

export class IconRegistry {
  private providers: Map<string, IconPackProvider> = new Map();
  private defaultProviderId: string = 'hugeicons';
  private listeners: Set<() => void> = new Set();
  private cachedProviders: IconPackProvider[] = [];

  /**
   * Registers a new icon pack provider into Flint.
   * Enables automatic rendering for `<packId>:<iconId>` shortcodes.
   */
  public registerProvider(provider: IconPackProvider): Disposable {
    this.providers.set(provider.id.toLowerCase(), provider);
    this.recomputeProviders();
    this.notify();

    return {
      dispose: () => {
        this.providers.delete(provider.id.toLowerCase());
        this.recomputeProviders();
        this.notify();
      },
    };
  }

  /**
   * Retrieves a registered icon pack provider by ID.
   */
  public getProvider(id: string): IconPackProvider | undefined {
    return this.providers.get(id.toLowerCase());
  }

  /**
   * Returns all active icon pack providers.
   */
  public getProviders(): IconPackProvider[] {
    return this.cachedProviders;
  }

  /**
   * Sets the default provider fallback for unqualified icon identifiers.
   */
  public setDefaultProviderId(id: string): void {
    this.defaultProviderId = id.toLowerCase();
  }

  /**
   * Gets the active default provider ID.
   */
  public getDefaultProviderId(): string {
    return this.defaultProviderId;
  }

  /**
   * Parses a full icon identifier string (`<pack>:<id>` or unprefixed `<id>`)
   * into its respective pack identifier and icon name.
   */
  public parseIconIdentifier(fullId: string): { pack: string; iconId: string } {
    if (!fullId) return { pack: this.defaultProviderId, iconId: '' };
    const colonIndex = fullId.indexOf(':');
    if (colonIndex > 0) {
      return {
        pack: fullId.slice(0, colonIndex).toLowerCase(),
        iconId: fullId.slice(colonIndex + 1),
      };
    }
    return {
      pack: this.defaultProviderId,
      iconId: fullId,
    };
  }

  /**
   * Formats a pack and icon identifier into a canonical full icon string.
   */
  public formatIconIdentifier(pack: string, iconId: string): string {
    return `${pack.toLowerCase()}:${iconId}`;
  }

  /**
   * Renders an icon given its full identifier (`<pack>:<id>` or `<id>`).
   * Seamlessly resolves to the registered provider or falls back gracefully.
   */
  public renderIcon(fullId: string, options?: IconRenderOptions): React.ReactNode {
    if (!fullId) return null;

    const { pack, iconId } = this.parseIconIdentifier(fullId);
    const provider = this.getProvider(pack) || this.getProvider(this.defaultProviderId);

    if (provider) {
      return provider.render(iconId, options);
    }

    return null;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private recomputeProviders(): void {
    this.cachedProviders = Array.from(this.providers.values());
  }

  public notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('[IconRegistry] Listener error:', err);
      }
    });
  }
}
