/**
 * @module PluginRoutes
 * @description
 * REST API routes for the Flint Community Plugin Registry.
 * Provides querying, searching, filtering, downloading, and publishing endpoints
 * for Flint desktop and web clients.
 */

import { Hono } from 'hono';
import { type InValue } from '@libsql/client';
import { getDb } from '../db/database.js';
import {
  PublishPluginSchema,
  PluginListResponse,
  PluginSummaryItem,
  PluginDetailResponse,
  VersionSummary,
  ExtensionManifest,
} from '../types.js';

export const pluginRoutes = new Hono();

/**
 * GET /api/v1/plugins
 * Retrieves a paginated, searchable, categorized list of community plugins.
 * Supports query parameters:
 *  - `search`: Filter by name, description, tags, or author
 *  - `category`: Filter by category (e.g. Productivity, Visualization, Formatting)
 *  - `sort`: 'popular' (downloads DESC), 'rating' (stars DESC), 'newest' (created_at DESC), 'name' (name ASC)
 *  - `page`: Page number (1-based index, defaults to 1)
 *  - `limit`: Number of items per page (defaults to 20, max 100)
 */
pluginRoutes.get('/', async (c) => {
  const db = getDb();
  const search = c.req.query('search')?.trim() || '';
  const category = c.req.query('category')?.trim() || '';
  const sort = c.req.query('sort') || 'popular';
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));
  const offset = (page - 1) * limit;

  // Build dynamic WHERE clauses
  const whereClauses: string[] = [];
  const queryArgs: InValue[] = [];

  if (category && category.toLowerCase() !== 'all') {
    whereClauses.push('LOWER(p.category) = LOWER(?)');
    queryArgs.push(category);
  }

  if (search) {
    whereClauses.push(
      '(LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.tags) LIKE ? OR LOWER(a.display_name) LIKE ? OR LOWER(a.github_username) LIKE ?)'
    );
    const searchPattern = `%${search.toLowerCase()}%`;
    queryArgs.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Order By mappings
  let orderBy = 'p.downloads DESC';
  if (sort === 'rating') {
    orderBy = 'p.stars DESC, p.downloads DESC';
  } else if (sort === 'newest') {
    orderBy = 'p.created_at DESC';
  } else if (sort === 'name') {
    orderBy = 'p.name ASC';
  }

  // Count total matching records
  const countSql = `
    SELECT COUNT(*) as total
    FROM plugins p
    JOIN authors a ON p.author_id = a.id
    ${whereSql}
  `;
  const countResult = await db.execute({ sql: countSql, args: queryArgs });
  const total = Number(countResult.rows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Retrieve matching paginated items with latest version string
  const itemsSql = `
    SELECT
      p.id,
      p.name,
      p.description,
      p.category,
      p.tags,
      p.icon,
      p.repo_url,
      p.banner_url,
      p.downloads,
      p.stars,
      p.is_verified,
      p.created_at,
      p.updated_at,
      a.id as author_id,
      a.github_username,
      a.display_name,
      a.avatar_url,
      (
        SELECT pv.version
        FROM plugin_versions pv
        WHERE pv.plugin_id = p.id
        ORDER BY pv.published_at DESC, pv.rowid DESC
        LIMIT 1
      ) as latest_version
    FROM plugins p
    JOIN authors a ON p.author_id = a.id
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const itemArgs = [...queryArgs, limit, offset];
  const itemsResult = await db.execute({ sql: itemsSql, args: itemArgs });

  const items: PluginSummaryItem[] = itemsResult.rows.map((row) => {
    let parsedTags: string[] = [];
    try {
      parsedTags = JSON.parse(String(row.tags || '[]'));
    } catch {
      parsedTags = [];
    }

    return {
      id: String(row.id),
      name: String(row.name),
      description: String(row.description),
      author: {
        id: String(row.author_id),
        github_username: String(row.github_username),
        display_name: String(row.display_name),
        avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      },
      category: String(row.category),
      tags: parsedTags,
      icon: row.icon ? String(row.icon) : null,
      repo_url: row.repo_url ? String(row.repo_url) : null,
      banner_url: row.banner_url ? String(row.banner_url) : null,
      downloads: Number(row.downloads ?? 0),
      stars: Number(row.stars ?? 0),
      is_verified: Boolean(row.is_verified),
      latest_version: row.latest_version ? String(row.latest_version) : '1.0.0',
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  });

  const response: PluginListResponse = {
    items,
    total,
    page,
    totalPages,
  };

  return c.json(response);
});

/**
 * GET /api/v1/plugins/:id
 * Retrieves complete detailed information for a single plugin,
 * including author metadata, latest release manifest, full Markdown README,
 * and version release history.
 */
pluginRoutes.get('/:id', async (c) => {
  const db = getDb();
  const pluginId = c.req.param('id');

  const pluginSql = `
    SELECT
      p.id,
      p.name,
      p.description,
      p.category,
      p.tags,
      p.icon,
      p.repo_url,
      p.banner_url,
      p.downloads,
      p.stars,
      p.is_verified,
      p.created_at,
      p.updated_at,
      a.id as author_id,
      a.github_username,
      a.display_name,
      a.avatar_url
    FROM plugins p
    JOIN authors a ON p.author_id = a.id
    WHERE p.id = ?
    LIMIT 1
  `;

  const pluginResult = await db.execute({ sql: pluginSql, args: [pluginId] });
  if (pluginResult.rows.length === 0) {
    return c.json({ error: `Plugin with id '${pluginId}' not found` }, 404);
  }

  const pRow = pluginResult.rows[0];

  // Fetch all versions ordered by publication timestamp descending
  const versionsSql = `
    SELECT id, version, min_app_version, readme, bundle_url, styles_url, manifest_json, sha256, published_at
    FROM plugin_versions
    WHERE plugin_id = ?
    ORDER BY published_at DESC, rowid DESC
  `;
  const versionsResult = await db.execute({ sql: versionsSql, args: [pluginId] });

  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(String(pRow.tags || '[]'));
  } catch {
    parsedTags = [];
  }

  const versionRows = versionsResult.rows;
  const latestRow = versionRows[0] || null;

  let latestManifest: ExtensionManifest = {
    id: String(pRow.id),
    name: String(pRow.name),
    version: latestRow ? String(latestRow.version) : '1.0.0',
    description: String(pRow.description),
    author: String(pRow.display_name),
    category: (pRow.category as 'Productivity' | 'Visualization' | 'Integration' | 'Formatting') || 'Productivity',
    tags: parsedTags,
    minAppVersion: '0.1.0',
  };

  if (latestRow?.manifest_json) {
    try {
      latestManifest = JSON.parse(String(latestRow.manifest_json));
    } catch {
      // Retain fallback manifest
    }
  }

  const versions: VersionSummary[] = versionRows.map((v) => ({
    id: String(v.id),
    version: String(v.version),
    min_app_version: v.min_app_version ? String(v.min_app_version) : null,
    bundle_url: String(v.bundle_url),
    styles_url: v.styles_url ? String(v.styles_url) : null,
    sha256: v.sha256 ? String(v.sha256) : null,
    published_at: String(v.published_at),
  }));

  const response: PluginDetailResponse = {
    id: String(pRow.id),
    name: String(pRow.name),
    description: String(pRow.description),
    category: String(pRow.category),
    tags: parsedTags,
    icon: pRow.icon ? String(pRow.icon) : null,
    repo_url: pRow.repo_url ? String(pRow.repo_url) : null,
    banner_url: pRow.banner_url ? String(pRow.banner_url) : null,
    downloads: Number(pRow.downloads ?? 0),
    stars: Number(pRow.stars ?? 0),
    is_verified: Boolean(pRow.is_verified),
    created_at: String(pRow.created_at),
    updated_at: String(pRow.updated_at),
    author: {
      id: String(pRow.author_id),
      github_username: String(pRow.github_username),
      display_name: String(pRow.display_name),
      avatar_url: pRow.avatar_url ? String(pRow.avatar_url) : null,
    },
    latest_version: latestRow
      ? {
          version: String(latestRow.version),
          min_app_version: latestRow.min_app_version ? String(latestRow.min_app_version) : null,
          bundle_url: String(latestRow.bundle_url),
          styles_url: latestRow.styles_url ? String(latestRow.styles_url) : null,
          manifest: latestManifest,
          sha256: latestRow.sha256 ? String(latestRow.sha256) : null,
          published_at: String(latestRow.published_at),
        }
      : null,
    readme: latestRow?.readme ? String(latestRow.readme) : '',
    versions,
  };

  return c.json(response);
});

/**
 * GET /api/v1/plugins/:id/download
 * Increments the download counter for the plugin and returns the asset bundle URL and manifest.
 * Supports optional `?version=` query parameter (defaults to latest published version).
 * Supports optional `?redirect=true` parameter for direct asset redirection.
 */
pluginRoutes.get('/:id/download', async (c) => {
  const db = getDb();
  const pluginId = c.req.param('id');
  const targetVersion = c.req.query('version')?.trim();
  const redirect = c.req.query('redirect') === 'true';

  // 1. Verify plugin existence
  const pluginCheck = await db.execute({
    sql: 'SELECT id FROM plugins WHERE id = ?',
    args: [pluginId],
  });
  if (pluginCheck.rows.length === 0) {
    return c.json({ error: `Plugin with id '${pluginId}' not found` }, 404);
  }

  // 2. Fetch specific version or latest version
  let versionQuery = 'SELECT * FROM plugin_versions WHERE plugin_id = ? ORDER BY published_at DESC, rowid DESC LIMIT 1';
  let versionArgs: InValue[] = [pluginId];

  if (targetVersion) {
    versionQuery = 'SELECT * FROM plugin_versions WHERE plugin_id = ? AND version = ? LIMIT 1';
    versionArgs = [pluginId, targetVersion];
  }

  const versionResult = await db.execute({ sql: versionQuery, args: versionArgs });
  if (versionResult.rows.length === 0) {
    return c.json(
      {
        error: targetVersion
          ? `Version '${targetVersion}' for plugin '${pluginId}' not found`
          : `No release versions found for plugin '${pluginId}'`,
      },
      404
    );
  }

  const versionRow = versionResult.rows[0];

  // 3. Increment download counter atomically
  await db.execute({
    sql: 'UPDATE plugins SET downloads = downloads + 1 WHERE id = ?',
    args: [pluginId],
  });

  const bundleUrl = String(versionRow.bundle_url);
  if (redirect) {
    return c.redirect(bundleUrl, 302);
  }

  let parsedManifest: unknown = null;
  try {
    parsedManifest = JSON.parse(String(versionRow.manifest_json));
  } catch {
    parsedManifest = null;
  }

  return c.json({
    success: true,
    pluginId,
    version: String(versionRow.version),
    bundleUrl,
    stylesUrl: versionRow.styles_url ? String(versionRow.styles_url) : null,
    bundleCode: versionRow.bundle_code ? String(versionRow.bundle_code) : null,
    stylesCode: versionRow.styles_code ? String(versionRow.styles_code) : null,
    manifest: parsedManifest,
    sha256: versionRow.sha256 ? String(versionRow.sha256) : null,
  });
});

/**
 * GET /api/v1/plugins/:id/bundle
 * Serves the compiled JavaScript extension bundle directly from the Turso database.
 * Supports optional `?version=` query parameter.
 */
pluginRoutes.get('/:id/bundle', async (c) => {
  const db = getDb();
  const pluginId = c.req.param('id');
  const targetVersion = c.req.query('version')?.trim();

  let query = 'SELECT bundle_code, bundle_url FROM plugin_versions WHERE plugin_id = ? ORDER BY published_at DESC, rowid DESC LIMIT 1';
  let args: InValue[] = [pluginId];

  if (targetVersion) {
    query = 'SELECT bundle_code, bundle_url FROM plugin_versions WHERE plugin_id = ? AND version = ? LIMIT 1';
    args = [pluginId, targetVersion];
  }

  const result = await db.execute({ sql: query, args });
  if (result.rows.length === 0) {
    return c.json({ error: `Plugin bundle for '${pluginId}' not found` }, 404);
  }

  const row = result.rows[0];
  if (row.bundle_code) {
    return c.text(String(row.bundle_code), 200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    });
  }

  if (row.bundle_url) {
    return c.redirect(String(row.bundle_url), 302);
  }

  return c.json({ error: 'No bundle code or URL available' }, 404);
});

/**
 * GET /api/v1/plugins/:id/styles
 * Serves the compiled CSS stylesheet directly from the Turso database.
 * Supports optional `?version=` query parameter.
 */
pluginRoutes.get('/:id/styles', async (c) => {
  const db = getDb();
  const pluginId = c.req.param('id');
  const targetVersion = c.req.query('version')?.trim();

  let query = 'SELECT styles_code, styles_url FROM plugin_versions WHERE plugin_id = ? ORDER BY published_at DESC, rowid DESC LIMIT 1';
  let args: InValue[] = [pluginId];

  if (targetVersion) {
    query = 'SELECT styles_code, styles_url FROM plugin_versions WHERE plugin_id = ? AND version = ? LIMIT 1';
    args = [pluginId, targetVersion];
  }

  const result = await db.execute({ sql: query, args });
  if (result.rows.length === 0) {
    return c.json({ error: `Styles for '${pluginId}' not found` }, 404);
  }

  const row = result.rows[0];
  if (row.styles_code) {
    return c.text(String(row.styles_code), 200, {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    });
  }

  if (row.styles_url) {
    return c.redirect(String(row.styles_url), 302);
  }

  return c.text('', 200, { 'Content-Type': 'text/css; charset=utf-8' });
});

/**
 * GET /api/v1/plugins/:id/manifest.json
 * Serves the raw extension manifest JSON directly from the Turso database.
 * Supports optional `?version=` query parameter.
 */
pluginRoutes.get('/:id/manifest.json', async (c) => {
  const db = getDb();
  const pluginId = c.req.param('id');
  const targetVersion = c.req.query('version')?.trim();

  let query = 'SELECT manifest_json FROM plugin_versions WHERE plugin_id = ? ORDER BY published_at DESC, rowid DESC LIMIT 1';
  let args: InValue[] = [pluginId];

  if (targetVersion) {
    query = 'SELECT manifest_json FROM plugin_versions WHERE plugin_id = ? AND version = ? LIMIT 1';
    args = [pluginId, targetVersion];
  }

  const result = await db.execute({ sql: query, args });
  if (result.rows.length === 0) {
    return c.json({ error: `Manifest for '${pluginId}' not found` }, 404);
  }

  const row = result.rows[0];
  return c.text(String(row.manifest_json), 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

/**
 * POST /api/v1/plugins/publish
 * Publishes a new extension version or updates an existing extension in Turso.
 * Validates extension manifest and bundle schemas using Zod.
 * Enforces author ownership and checks for duplicate version registrations.
 */
pluginRoutes.post('/publish', async (c) => {
  const db = getDb();
  let rawBody: unknown;

  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: 'Malformed JSON request body' }, 400);
  }

  const parseResult = PublishPluginSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      },
      400
    );
  }

  const { manifest, bundleUrl: rawBundleUrl, stylesUrl, bundleCode, stylesCode, readme, sha256, author } = parseResult.data;
  const bundleUrl = rawBundleUrl || `/api/v1/plugins/${manifest.id}/bundle`;

  // 1. Author verification / auto-registration
  const authorCheck = await db.execute({
    sql: 'SELECT id, github_username FROM authors WHERE github_username = ?',
    args: [author.githubUsername],
  });

  let authorId: string;
  if (authorCheck.rows.length === 0) {
    authorId = `author_${author.githubUsername}`;
    await db.execute({
      sql: `INSERT INTO authors (id, github_username, display_name, avatar_url, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))`,
      args: [authorId, author.githubUsername, author.displayName, author.avatarUrl ?? null],
    });
  } else {
    authorId = String(authorCheck.rows[0].id);
  }

  // 2. Plugin registration or ownership verification
  const existingPlugin = await db.execute({
    sql: 'SELECT id, author_id FROM plugins WHERE id = ?',
    args: [manifest.id],
  });

  if (existingPlugin.rows.length > 0) {
    const existingAuthorId = String(existingPlugin.rows[0].author_id);
    if (existingAuthorId !== authorId) {
      return c.json(
        {
          error: 'Unauthorized: Plugin identifier is owned by another registered developer.',
        },
        403
      );
    }

    // Check for duplicate version conflict
    const versionCheck = await db.execute({
      sql: 'SELECT id FROM plugin_versions WHERE plugin_id = ? AND version = ?',
      args: [manifest.id, manifest.version],
    });

    if (versionCheck.rows.length > 0) {
      return c.json(
        {
          error: `Version '${manifest.version}' of plugin '${manifest.id}' has already been published. Please increment SemVer version.`,
        },
        409
      );
    }

    // Update existing plugin metadata
    await db.execute({
      sql: `UPDATE plugins
            SET name = ?, description = ?, category = ?, tags = ?, icon = ?, repo_url = ?, banner_url = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        manifest.name,
        manifest.description,
        manifest.category,
        JSON.stringify(manifest.tags),
        manifest.icon ?? null,
        manifest.repoUrl ?? null,
        manifest.bannerImage ?? null,
        manifest.id,
      ],
    });
  } else {
    // Insert new plugin record
    await db.execute({
      sql: `INSERT INTO plugins (
              id, name, description, author_id, category, tags, icon, repo_url,
              banner_url, downloads, stars, is_verified, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, datetime('now'), datetime('now'))`,
      args: [
        manifest.id,
        manifest.name,
        manifest.description,
        authorId,
        manifest.category,
        JSON.stringify(manifest.tags),
        manifest.icon ?? null,
        manifest.repoUrl ?? null,
        manifest.bannerImage ?? null,
      ],
    });
  }

  // 3. Register new version record with bundle_code and styles_code in Turso
  const versionId = `${manifest.id}_v${manifest.version}`;
  await db.execute({
    sql: `INSERT INTO plugin_versions (
            id, plugin_id, version, min_app_version, readme, bundle_url,
            styles_url, bundle_code, styles_code, manifest_json, sha256, published_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [
      versionId,
      manifest.id,
      manifest.version,
      manifest.minAppVersion ?? '0.1.0',
      readme ?? null,
      bundleUrl,
      stylesUrl ?? null,
      bundleCode ?? null,
      stylesCode ?? null,
      JSON.stringify(manifest),
      sha256 ?? null,
    ],
  });

  return c.json(
    {
      success: true,
      message: `Plugin '${manifest.name}' (${manifest.version}) published successfully.`,
      pluginId: manifest.id,
      version: manifest.version,
    },
    201
  );
});
