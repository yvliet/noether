/**
 * @module RegistrySeed
 * @description
 * Initial community catalog seed data definitions for the Flint Plugin Registry.
 * The community registry starts with a clean slate (zero fake extensions).
 */

import { ExtensionManifest } from '../types.js';

export interface SeedAuthor {
  id: string;
  github_username: string;
  display_name: string;
  avatar_url: string;
}

export interface SeedPlugin {
  id: string;
  name: string;
  description: string;
  author_id: string;
  category: 'Productivity' | 'Visualization' | 'Integration' | 'Formatting';
  tags: string[];
  icon: string;
  repo_url: string;
  banner_url: string;
  downloads: number;
  stars: number;
  is_verified: number;
  version: string;
  min_app_version: string;
  readme: string;
  bundle_url: string;
  styles_url?: string;
  sha256: string;
  manifest: ExtensionManifest;
}

export const SEED_AUTHORS: SeedAuthor[] = [];

export const SEED_PLUGINS: SeedPlugin[] = [];
