/**
 * @module ExtensionRoutes
 * @description
 * REST API routes for the Noether Community Extension Registry.
 * Provides querying, searching, filtering, downloading, and publishing endpoints
 * for Noether desktop and web clients.
 */

import { Hono } from 'hono';
import { type InValue } from '@libsql/client';
import { getDb } from '../db/database.js';
import {
  PublishExtensionSchema,
  ExtensionListResponse,
  ExtensionSummaryItem,
  ExtensionDetailResponse,
  VersionSummary,
  ExtensionManifest,
} from '../types.js';

export const extensionRoutes = new Hono();

/**
 * GET /api/v1/extensions
 * Retrieves a paginated, searchable, categorized list of community extensions.
 * Supports query parameters:
 *  - `search`: Filter by name, description, tags, or author
 *  - `category`: Filter by category (e.g. Productivity, Visualization, Integration, Formatting)
 *  - `sort`: 'popular' (downloads DESC), 'rating' (stars DESC), 'newest' (created_at DESC), 'name' (name ASC)
 *  - `page`: Page number (1-based index, defaults to 1)
 *  - `limit`: Number of items per page (defaults to 20, max 100)
 */
extensionRoutes.get('/', async (c) => {
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
    whereClauses.push('LOWER(e.category) = LOWER(?)');
    queryArgs.push(category);
  }

  if (search) {
    whereClauses.push(
      '(LOWER(e.name) LIKE ? OR LOWER(e.description) LIKE ? OR LOWER(e.tags) LIKE ? OR LOWER(a.display_name) LIKE ? OR LOWER(a.github_username) LIKE ?)'
    );
    const searchPattern = `%${search.toLowerCase()}%`;
    queryArgs.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Order By mappings
  let orderBy = 'e.downloads DESC';
  if (sort === 'rating') {
    orderBy = 'e.stars DESC, e.downloads DESC';
  } else if (sort === 'newest') {
    orderBy = 'e.created_at DESC';
  } else if (sort === 'name') {
    orderBy = 'e.name ASC';
  }

  // Count total matching records
  const countSql = `
    SELECT COUNT(*) as total
    FROM extensions e
    JOIN authors a ON e.author_id = a.id
    ${whereSql}
  `;
  const countResult = await db.execute({ sql: countSql, args: queryArgs });
  const total = Number(countResult.rows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Retrieve matching paginated items with latest version string
  const itemsSql = `
    SELECT
      e.id,
      e.name,
      e.description,
      e.category,
      e.tags,
      e.icon,
      e.repo_url,
      e.banner_url,
      e.downloads,
      e.stars,
      e.is_verified,
      e.created_at,
      e.updated_at,
      a.id as author_id,
      a.github_username,
      a.display_name,
      a.avatar_url,
      (
        SELECT ev.version
        FROM extension_versions ev
        WHERE ev.extension_id = e.id
        ORDER BY ev.published_at DESC, ev.rowid DESC
        LIMIT 1
      ) as latest_version
    FROM extensions e
    JOIN authors a ON e.author_id = a.id
    ${whereSql}
    ORDER BY ${orderBy.replace(/\bp\./g, 'e.')}
    LIMIT ? OFFSET ?
  `;

  const itemArgs = [...queryArgs, limit, offset];
  const itemsResult = await db.execute({ sql: itemsSql, args: itemArgs });

  const items: ExtensionSummaryItem[] = itemsResult.rows.map((row) => {
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

  const response: ExtensionListResponse = {
    items,
    total,
    page,
    totalPages,
  };

  return c.json(response);
});

/**
 * GET /api/v1/extensions/:id
 * Retrieves complete detailed information for a single extension,
 * including author metadata, latest release manifest, full Markdown README,
 * and version release history.
 */
extensionRoutes.get('/:id', async (c) => {
  const db = getDb();
  const extensionId = c.req.param('id');

  const extensionSql = `
    SELECT
      e.id,
      e.name,
      e.description,
      e.category,
      e.tags,
      e.icon,
      e.repo_url,
      e.banner_url,
      e.downloads,
      e.stars,
      e.is_verified,
      e.created_at,
      e.updated_at,
      a.id as author_id,
      a.github_username,
      a.display_name,
      a.avatar_url
    FROM extensions e
    JOIN authors a ON e.author_id = a.id
    WHERE e.id = ?
    LIMIT 1
  `;

  const extensionResult = await db.execute({ sql: extensionSql, args: [extensionId] });
  if (extensionResult.rows.length === 0) {
    return c.json({ error: `Extension with id '${extensionId}' not found` }, 404);
  }

  const pRow = extensionResult.rows[0];

  // Fetch all versions ordered by publication timestamp descending
  const versionsSql = `
    SELECT id, version, min_app_version, readme, bundle_url, styles_url, manifest_json, sha256, published_at
    FROM extension_versions
    WHERE extension_id = ?
    ORDER BY published_at DESC, rowid DESC
  `;
  const versionsResult = await db.execute({ sql: versionsSql, args: [extensionId] });

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
    minAppVersion: '0.4.0',
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

  const response: ExtensionDetailResponse = {
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
 * GET /api/v1/extensions/:id/download
 * Increments the download counter for the extension and returns the asset bundle URL and manifest.
 * Supports optional `?version=` query parameter (defaults to latest published version).
 * Supports optional `?redirect=true` parameter for direct asset redirection.
 */
extensionRoutes.get('/:id/download', async (c) => {
  const db = getDb();
  const extensionId = c.req.param('id');
  const targetVersion = c.req.query('version')?.trim();
  const redirect = c.req.query('redirect') === 'true';

  // 1. Verify extension existence
  const check = await db.execute({
    sql: 'SELECT id FROM extensions WHERE id = ?',
    args: [extensionId],
  });
  if (check.rows.length === 0) {
    return c.json({ error: `Extension with id '${extensionId}' not found` }, 404);
  }

  // 2. Fetch specific version or latest version
  let versionQuery = 'SELECT * FROM extension_versions WHERE extension_id = ? ORDER BY published_at DESC, rowid DESC LIMIT 1';
  let versionArgs: InValue[] = [extensionId];

  if (targetVersion) {
    versionQuery = 'SELECT * FROM extension_versions WHERE extension_id = ? AND version = ? LIMIT 1';
    versionArgs = [extensionId, targetVersion];
  }

  const versionResult = await db.execute({ sql: versionQuery, args: versionArgs });
  if (versionResult.rows.length === 0) {
    return c.json(
      {
        error: targetVersion
          ? `Version '${targetVersion}' for extension '${extensionId}' not found`
          : `No release versions found for extension '${extensionId}'`,
      },
      404
    );
  }

  const versionRow = versionResult.rows[0];

  // 3. Increment download counter atomically
  await db.execute({
    sql: 'UPDATE extensions SET downloads = downloads + 1 WHERE id = ?',
    args: [extensionId],
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
    extensionId,
    pluginId: extensionId,
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
 * GET /api/v1/extensions/:id/bundle
 * Serves the compiled JavaScript extension bundle directly from the Turso database.
 * Supports optional `?version=` query parameter.
 */
extensionRoutes.get('/:id/bundle', async (c) => {
  const db = getDb();
  const extensionId = c.req.param('id');
  const targetVersion = c.req.query('version')?.trim();

  let query = 'SELECT bundle_code, bundle_url FROM extension_versions WHERE extension_id = ? ORDER BY published_at DESC, rowid DESC LIMIT 1';
  let args: InValue[] = [extensionId];

  if (targetVersion) {
    query = 'SELECT bundle_code, bundle_url FROM extension_versions WHERE extension_id = ? AND version = ? LIMIT 1';
    args = [extensionId, targetVersion];
  }

  const result = await db.execute({ sql: query, args });
  if (result.rows.length === 0) {
    return c.json({ error: `Bundle for extension '${extensionId}' not found` }, 404);
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
 * GET /api/v1/extensions/:id/styles
 * Serves the compiled CSS stylesheet directly from the Turso database.
 * Supports optional `?version=` query parameter.
 */
extensionRoutes.get('/:id/styles', async (c) => {
  const db = getDb();
  const extensionId = c.req.param('id');
  const targetVersion = c.req.query('version')?.trim();

  let query = 'SELECT styles_code, styles_url FROM extension_versions WHERE extension_id = ? ORDER BY published_at DESC, rowid DESC LIMIT 1';
  let args: InValue[] = [extensionId];

  if (targetVersion) {
    query = 'SELECT styles_code, styles_url FROM extension_versions WHERE extension_id = ? AND version = ? LIMIT 1';
    args = [extensionId, targetVersion];
  }

  const result = await db.execute({ sql: query, args });
  if (result.rows.length === 0) {
    return c.json({ error: `Styles for extension '${extensionId}' not found` }, 404);
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
 * GET /api/v1/extensions/:id/manifest.json
 * Serves the raw extension manifest JSON directly from the Turso database.
 * Supports optional `?version=` query parameter.
 */
extensionRoutes.get('/:id/manifest.json', async (c) => {
  const db = getDb();
  const extensionId = c.req.param('id');
  const targetVersion = c.req.query('version')?.trim();

  let query = 'SELECT manifest_json FROM extension_versions WHERE extension_id = ? ORDER BY published_at DESC, rowid DESC LIMIT 1';
  let args: InValue[] = [extensionId];

  if (targetVersion) {
    query = 'SELECT manifest_json FROM extension_versions WHERE extension_id = ? AND version = ? LIMIT 1';
    args = [extensionId, targetVersion];
  }

  const result = await db.execute({ sql: query, args });
  if (result.rows.length === 0) {
    return c.json({ error: `Manifest for extension '${extensionId}' not found` }, 404);
  }

  const row = result.rows[0];
  return c.text(String(row.manifest_json), 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  });
});

/**
 * POST /api/v1/extensions/publish
 * Publishes a new extension release or updates an existing extension in Turso.
 * Validates extension manifest and code payload schemas using Zod.
 * Enforces author ownership, validates SemVer release uniqueness, and supports
 * safe in-place updates when overwrite=true is provided.
 */
extensionRoutes.post('/publish', async (c) => {
  const db = getDb();
  let rawBody: unknown;

  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ error: 'Malformed JSON request body' }, 400);
  }

  const parseResult = PublishExtensionSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return c.json(
      {
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      },
      400
    );
  }

  const {
    manifest,
    bundleUrl: rawBundleUrl,
    stylesUrl: rawStylesUrl,
    bundleCode,
    stylesCode,
    readme,
    sha256,
    overwrite,
    author,
  } = parseResult.data;

  // Normalize bundle and styles URLs
  const bundleUrl = rawBundleUrl || `/api/v1/extensions/${manifest.id}/bundle`;
  const stylesUrl = rawStylesUrl || (stylesCode ? `/api/v1/extensions/${manifest.id}/styles` : null);

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

  // 2. Extension registration or ownership verification
  const existingExtension = await db.execute({
    sql: 'SELECT id, author_id FROM extensions WHERE id = ?',
    args: [manifest.id],
  });

  if (existingExtension.rows.length > 0) {
    const existingAuthorId = String(existingExtension.rows[0].author_id);
    if (existingAuthorId !== authorId) {
      return c.json(
        {
          error: 'Unauthorized: Extension identifier is owned by another registered developer.',
        },
        403
      );
    }

    // Check for duplicate version conflict
    const versionCheck = await db.execute({
      sql: 'SELECT id FROM extension_versions WHERE extension_id = ? AND version = ?',
      args: [manifest.id, manifest.version],
    });

    if (versionCheck.rows.length > 0) {
      if (!overwrite) {
        return c.json(
          {
            error: `Version '${manifest.version}' of extension '${manifest.id}' has already been published. Please increment SemVer version or set overwrite: true.`,
          },
          409
        );
      }

      // Safe in-place update of existing version
      await db.execute({
        sql: `UPDATE extension_versions
              SET min_app_version = ?, readme = ?, bundle_url = ?, styles_url = ?,
                  bundle_code = ?, styles_code = ?, manifest_json = ?, sha256 = ?, published_at = datetime('now')
              WHERE extension_id = ? AND version = ?`,
        args: [
          manifest.minAppVersion ?? '0.4.0',
          readme ?? null,
          bundleUrl,
          stylesUrl ?? null,
          bundleCode ?? null,
          stylesCode ?? null,
          JSON.stringify(manifest),
          sha256 ?? null,
          manifest.id,
          manifest.version,
        ],
      });
    } else {
      // Insert new version
      const versionId = `${manifest.id}_v${manifest.version}`;
      await db.execute({
        sql: `INSERT INTO extension_versions (
                id, extension_id, version, min_app_version, readme, bundle_url,
                styles_url, bundle_code, styles_code, manifest_json, sha256, published_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          versionId,
          manifest.id,
          manifest.version,
          manifest.minAppVersion ?? '0.4.0',
          readme ?? null,
          bundleUrl,
          stylesUrl ?? null,
          bundleCode ?? null,
          stylesCode ?? null,
          JSON.stringify(manifest),
          sha256 ?? null,
        ],
      });
    }

    // Update existing extension metadata
    await db.execute({
      sql: `UPDATE extensions
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
    // Insert new extension record
    await db.execute({
      sql: `INSERT INTO extensions (
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

    // Insert new version record
    const versionId = `${manifest.id}_v${manifest.version}`;
    await db.execute({
      sql: `INSERT INTO extension_versions (
              id, extension_id, version, min_app_version, readme, bundle_url,
              styles_url, bundle_code, styles_code, manifest_json, sha256, published_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        versionId,
        manifest.id,
        manifest.version,
        manifest.minAppVersion ?? '0.4.0',
        readme ?? null,
        bundleUrl,
        stylesUrl ?? null,
        bundleCode ?? null,
        stylesCode ?? null,
        JSON.stringify(manifest),
        sha256 ?? null,
      ],
    });
  }

  return c.json(
    {
      success: true,
      message: `Extension '${manifest.name}' (${manifest.version}) published successfully.`,
      extensionId: manifest.id,
      pluginId: manifest.id,
      version: manifest.version,
      endpoints: {
        detail: `/api/v1/extensions/${manifest.id}`,
        bundle: `/api/v1/extensions/${manifest.id}/bundle?version=${manifest.version}`,
        styles: stylesUrl ? `/api/v1/extensions/${manifest.id}/styles?version=${manifest.version}` : null,
        manifest: `/api/v1/extensions/${manifest.id}/manifest.json?version=${manifest.version}`,
        download: `/api/v1/extensions/${manifest.id}/download?version=${manifest.version}`,
      },
    },
    201
  );
});
