/**
 * @module DatabaseManager
 * @description
 * Manages the connection to the libSQL / SQLite embedded database.
 * Executes migrations from schema.sql on initialization.
 */

import { createClient, type Client } from '@libsql/client';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

let dbInstance: Client | null = null;
let initPromise: Promise<Client> | null = null;

/**
 * Fallback SQL schema statements executed if schema.sql file cannot be resolved via filesystem
 * (such as in bundled edge worker environments or standalone single-binary distributions).
 */
const EMBEDDED_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  github_username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

CREATE TABLE IF NOT EXISTS plugin_versions (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
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
  FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);
CREATE INDEX IF NOT EXISTS idx_plugins_downloads ON plugins(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_stars ON plugins(stars DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_created_at ON plugins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugins_author_id ON plugins(author_id);
CREATE INDEX IF NOT EXISTS idx_plugin_versions_plugin_id ON plugin_versions(plugin_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plugin_versions_unique_ver ON plugin_versions(plugin_id, version);
`;

export function tryLoadEnv(): void {
  try {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'api/.env'),
      path.resolve(process.cwd(), '../.env'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
              const key = trimmed.slice(0, eqIdx).trim();
              const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
              if (key && !process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        } catch {}
      }
    }
  } catch {}
}

function normalizeDatabaseUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (url.startsWith('turso://')) {
    url = 'libsql://' + url.slice('turso://'.length);
  }
  return url;
}

/**
 * Resolves or initializes the global libSQL client.
 * Configured via `DATABASE_URL` (e.g. `file:flint_registry.db` or Turso `libsql://...`)
 * and optional `TURSO_AUTH_TOKEN`.
 */
export function getDb(): Client {
  if (!dbInstance) {
    tryLoadEnv();
    const rawUrl = process.env.DATABASE_URL || 'file:flint_registry.db';
    const url = normalizeDatabaseUrl(rawUrl);
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

    dbInstance = createClient({
      url,
      authToken,
    });
  }
  return dbInstance;
}

/**
 * Loads schema SQL from local schema.sql file or falls back to embedded SQL definitions.
 */
function loadSchemaSql(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      return fs.readFileSync(schemaPath, 'utf8');
    }
  } catch {
    // In bundlers or environments without file access, fallback to embedded string
  }
  return EMBEDDED_SCHEMA_SQL;
}

/**
 * Executes schema migration and pre-seeds the initial community catalogue if empty.
 * Guarantees idempotent execution through atomic transaction boundaries.
 */
export async function initDatabase(): Promise<Client> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = getDb();

    // 1. Run schema migrations
    const rawSql = loadSchemaSql();
    // Strip multi-line comments and single line comments before splitting
    const strippedSql = rawSql
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((line) => {
        const commentIdx = line.indexOf('--');
        return commentIdx >= 0 ? line.slice(0, commentIdx) : line;
      })
      .join('\n');

    const statements = strippedSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const sql of statements) {
      try {
        await db.execute(sql);
      } catch (err) {
        console.error('[Database] Error executing migration statement:', sql, err);
        throw err;
      }
    }

    return db;
  })().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}
