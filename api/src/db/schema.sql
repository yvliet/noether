-- Noether Community Extension Registry Database Schema
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

-- Extensions table: Central catalogue of published community extensions
CREATE TABLE IF NOT EXISTS extensions (
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

-- Extension Versions table: Release bundles, metadata, and SemVer histories
CREATE TABLE IF NOT EXISTS extension_versions (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  min_app_version TEXT,
  readme TEXT,
  bundle_url TEXT NOT NULL,
  styles_url TEXT,
  bundle_code TEXT,
  styles_code TEXT,
  manifest_json TEXT NOT NULL,
  sha256 TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
);

-- Indexes for performance and query optimization
CREATE INDEX IF NOT EXISTS idx_extensions_category ON extensions(category);
CREATE INDEX IF NOT EXISTS idx_extensions_downloads ON extensions(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_extensions_stars ON extensions(stars DESC);
CREATE INDEX IF NOT EXISTS idx_extensions_created_at ON extensions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extensions_author_id ON extensions(author_id);
CREATE INDEX IF NOT EXISTS idx_extension_versions_extension_id ON extension_versions(extension_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_extension_versions_unique_ver ON extension_versions(extension_id, version);
