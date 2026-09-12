/**
 * @module communityRegistry
 * @description
 * Community extension metadata interface contracts.
 * Metadata is dynamically resolved from Turso edge replicas, installed manifests,
 * and online extension registries.
 *
 * @since 0.4.0
 */

export interface KnownExtensionMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  authorUrl?: string;
  repoUrl: string;
  description: string;
  category: 'Productivity' | 'Visualization' | 'Integration' | 'Formatting';
}

export const KNOWN_COMMUNITY_EXTENSIONS: KnownExtensionMetadata[] = [];
