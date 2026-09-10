/**
 * @module CloudflareD1Provider
 * @description
 * High-speed sync provider interfacing with Cloudflare D1 serverless SQL databases
 * via the Cloudflare v4 REST API.
 */

import { BaseProvider } from './BaseProvider';
import {
  DocumentSyncItem,
  RemoteSyncPayload,
  ConnectionTestResult,
  CloudflareD1Config,
} from '../types';

export class CloudflareD1Provider extends BaseProvider {
  public readonly name = 'Cloudflare D1 Database';
  public readonly providerType = 'cloudflare_d1';

  private config: CloudflareD1Config;
  private deviceId: string;

  constructor(config: CloudflareD1Config, deviceId: string) {
    super();
    this.config = config;
    this.deviceId = deviceId;
  }

  private getEndpoint(): string {
    const acc = (this.config.accountId || '').trim();
    const db = (this.config.databaseId || '').trim();
    return `https://api.cloudflare.com/client/v4/accounts/${acc}/d1/database/${db}/query`;
  }

  private getTableName(): string {
    return (this.config.tableName || 'flint_sync_documents').trim();
  }

  private async executeQuery(sql: string, params: any[] = []): Promise<any> {
    const token = (this.config.apiToken || '').trim();
    const endpoint = this.getEndpoint();

    if (!this.config.accountId) throw new Error('Cloudflare Account ID is missing.');
    if (!this.config.databaseId) throw new Error('Cloudflare D1 Database ID is missing.');
    if (!token) throw new Error('Cloudflare API Token is missing.');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql, params }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cloudflare D1 HTTP error (${res.status}): ${errText}`);
    }

    const payload = await res.json();
    if (!payload.success) {
      const msg = payload.errors?.[0]?.message || 'Cloudflare D1 query failed';
      throw new Error(msg);
    }

    return payload.result?.[0]?.results || [];
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const table = this.getTableName();

    try {
      await this.executeQuery(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        latencyMs,
        message: `Connected to Cloudflare D1 (${latencyMs}ms). Table "${table}" is operational.`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        message: `Cloudflare D1 connection failed: ${err?.message || String(err)}`,
      };
    }
  }

  public async pullChanges(sinceTimestamp: number): Promise<RemoteSyncPayload> {
    const table = this.getTableName();
    const sql = `SELECT id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at, deleted_at, device_id FROM ${table} WHERE updated_at >= ? ORDER BY updated_at ASC LIMIT 1000`;

    const rows: any[] = await this.executeQuery(sql, [sinceTimestamp]);
    const items: DocumentSyncItem[] = [];
    const deletedIds: string[] = [];

    for (const r of rows) {
      if (r.deleted_at && Number(r.deleted_at) > 0) {
        deletedIds.push(String(r.id));
      } else {
        items.push({
          id: String(r.id),
          parent_id: r.parent_id ? String(r.parent_id) : null,
          title: String(r.title || 'Untitled'),
          content_json: String(r.content_json || ''),
          is_daily_note: Number(r.is_daily_note || 0),
          is_folder: Number(r.is_folder || 0),
          is_bookmarked: Number(r.is_bookmarked || 0),
          doc_type: String(r.doc_type || 'base'),
          properties: String(r.properties || '{}'),
          created_at: Number(r.created_at || Date.now()),
          updated_at: Number(r.updated_at || Date.now()),
          deleted_at: r.deleted_at ? Number(r.deleted_at) : null,
          device_id: r.device_id ? String(r.device_id) : undefined,
        });
      }
    }

    return {
      items,
      deletedIds,
      serverTimestamp: Date.now(),
    };
  }

  public async pushChanges(
    upserts: DocumentSyncItem[],
    deletedIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    const table = this.getTableName();

    try {
      for (const doc of upserts) {
        const sql = `
          INSERT INTO ${table} (
            id, parent_id, title, content_json, is_daily_note, is_folder,
            is_bookmarked, doc_type, properties, created_at, updated_at, deleted_at, device_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
          ON CONFLICT(id) DO UPDATE SET
            parent_id = excluded.parent_id,
            title = excluded.title,
            content_json = excluded.content_json,
            is_daily_note = excluded.is_daily_note,
            is_folder = excluded.is_folder,
            is_bookmarked = excluded.is_bookmarked,
            doc_type = excluded.doc_type,
            properties = excluded.properties,
            updated_at = excluded.updated_at,
            deleted_at = NULL,
            device_id = excluded.device_id
        `;
        await this.executeQuery(sql, [
          doc.id,
          doc.parent_id,
          doc.title,
          doc.content_json,
          doc.is_daily_note,
          doc.is_folder,
          doc.is_bookmarked,
          doc.doc_type,
          doc.properties,
          doc.created_at,
          doc.updated_at,
          this.deviceId,
        ]);
      }

      const now = Date.now();
      for (const id of deletedIds) {
        const sql = `
          INSERT INTO ${table} (id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at, deleted_at, device_id)
          VALUES (?, '[Deleted Note]', '', 0, 0, 0, 'deleted', '{}', 0, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            deleted_at = excluded.deleted_at,
            updated_at = excluded.updated_at,
            device_id = excluded.device_id
        `;
        await this.executeQuery(sql, [id, now, now, this.deviceId]);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  public getSchemaScript(): string {
    const table = this.getTableName();
    return `-- Run via wrangler d1 execute <database-name> --command="...":
CREATE TABLE IF NOT EXISTS ${table} (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content_json TEXT NOT NULL DEFAULT '',
  is_daily_note INTEGER NOT NULL DEFAULT 0,
  is_folder INTEGER NOT NULL DEFAULT 0,
  is_bookmarked INTEGER NOT NULL DEFAULT 0,
  doc_type TEXT NOT NULL DEFAULT 'base',
  properties TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER DEFAULT NULL,
  device_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_${table}_updated ON ${table}(updated_at);
CREATE INDEX IF NOT EXISTS idx_${table}_deleted ON ${table}(deleted_at);
`;
  }
}
