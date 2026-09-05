-- Flint Community Plugin Registry Database Schema
-- Compatible with SQLite3, libSQL, and Cloudflare D1 / Turso edge databases.

PRAGMA foreign_keys = ON;

-- Authors table: Stores verified GitHub contributors and extension developers
CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  github_username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Plugins table: Central catalogue of published community extensions and plugins
CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  icon TEXT,
  repo_url TEXT,
  banner_url TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  stars INTEGER NOT NULL DEFAULT 0,
  is_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Plugin Versions table: Release bundles, metadata, and SemVer histories
CREATE TABLE IF NOT EXISTS plugin_versions (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  min_app_version TEXT,
  readme TEXT,
  bundle_url TEXT NOT NULL,
  styles_url TEXT,
  manifest_json TEXT NOT NULL,
  sha256 TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

-- Indexes for performance and query optimization
CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);
CREATE INDEX IF NOT EXISTS idx_plugins_downloads ON plugins(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_stars ON plugins(stars DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_created_at ON plugins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_author_id ON plugins(author_id);
CREATE INDEX IF NOT EXISTS idx_plugin_versions_plugin_id ON plugin_versions(plugin_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plugin_versions_unique_ver ON plugin_versions(plugin_id, version);
