/**
 * @module RegistryTypes
 * @description
 * Complete TypeScript interfaces and models for the Flint Community Plugin Registry API.
 * Encapsulates database row shapes, API request schemas, response models, and manifests.
 */

import { z } from 'zod';

/**
 * Author entity representing an extension developer.
 */
export interface Author {
  id: string;
  github_username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Raw plugin database row representation.
 */
export interface PluginRow {
  id: string;
  name: string;
  description: string;
  author_id: string;
  category: string;
  tags: string; // JSON serialized string[]
  icon: string | null;
  repo_url: string | null;
  banner_url: string | null;
  downloads: number;
  stars: number;
  is_verified: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

/**
 * Raw plugin version database row representation.
 */
export interface PluginVersionRow {
  id: string;
  plugin_id: string;
  version: string;
  min_app_version: string | null;
  readme: string | null;
  bundle_url: string;
  styles_url: string | null;
  bundle_code: string | null;
  styles_code: string | null;
  manifest_json: string; // JSON serialized manifest
  sha256: string | null;
  published_at: string;
}

/**
 * Public extension manifest shape conforming to Flint extension specifications.
 */
export const ExtensionManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-_]+$/, 'Plugin ID must be lowercase alphanumeric with hyphens or underscores'),
  name: z.string().min(1, 'Plugin name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Must follow SemVer format (e.g., 1.0.0)'),
  description: z.string().min(1, 'Description is required'),
  minAppVersion: z.string().optional().default('0.1.0'),
  author: z.string().optional(),
  authorUrl: z.string().url().optional(),
  category: z.enum(['Productivity', 'Visualization', 'Integration', 'Formatting']).optional().default('Productivity'),
  tags: z.array(z.string()).optional().default([]),
  icon: z.string().optional(),
  repoUrl: z.string().url().optional(),
  bannerImage: z.string().optional(),
});

export type ExtensionManifest = z.infer<typeof ExtensionManifestSchema>;

/**
 * Request payload schema for publishing a new extension version.
 */
export const PublishPluginSchema = z.object({
  manifest: ExtensionManifestSchema,
  bundleUrl: z.string().optional(),
  stylesUrl: z.string().optional(),
  bundleCode: z.string().optional(),
  stylesCode: z.string().optional(),
  readme: z.string().optional(),
  sha256: z.string().optional(),
  author: z.object({
    githubUsername: z.string().min(1, 'GitHub username is required'),
    displayName: z.string().min(1, 'Display name is required'),
    avatarUrl: z.string().url().optional(),
  }),
});

export type PublishPluginPayload = z.infer<typeof PublishPluginSchema>;

/**
 * Formatted plugin summary returned in list queries.
 */
export interface PluginSummaryItem {
  id: string;
  name: string;
  description: string;
  author: {
    id: string;
    github_username: string;
    display_name: string;
    avatar_url: string | null;
  };
  category: string;
  tags: string[];
  icon: string | null;
  repo_url: string | null;
  banner_url: string | null;
  downloads: number;
  stars: number;
  is_verified: boolean;
  latest_version: string;
  created_at: string;
  updated_at: string;
}

/**
 * Paginated plugin listing response.
 */
export interface PluginListResponse {
  items: PluginSummaryItem[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Plugin version summary for version histories.
 */
export interface VersionSummary {
  id: string;
  version: string;
  min_app_version: string | null;
  bundle_url: string;
  styles_url: string | null;
  sha256: string | null;
  published_at: string;
}

/**
 * Full detailed plugin response including complete metadata and version history.
 */
export interface PluginDetailResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string | null;
  repo_url: string | null;
  banner_url: string | null;
  downloads: number;
  stars: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    github_username: string;
    display_name: string;
    avatar_url: string | null;
  };
  latest_version: {
    version: string;
    min_app_version: string | null;
    bundle_url: string;
    styles_url: string | null;
    manifest: ExtensionManifest;
    sha256: string | null;
    published_at: string;
  } | null;
  readme: string;
  versions: VersionSummary[];
}
