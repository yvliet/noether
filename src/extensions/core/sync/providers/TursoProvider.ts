/**
 * @module TursoProvider
 * @description
 * High-performance sync provider interfacing with Turso libSQL edge databases
 * over the standard Hrana v2 HTTP pipeline protocol.
 */

import { BaseProvider } from './BaseProvider';
import {
  DocumentSyncItem,
  RemoteSyncPayload,
  ConnectionTestResult,
  TursoConfig,
} from '../types';

export class TursoProvider extends BaseProvider {
  public readonly name = 'Turso / libSQL Edge Database';
  public readonly providerType = 'turso';

  private config: TursoConfig;
  private deviceId: string;

  constructor(config: TursoConfig, deviceId: string) {
    super();
    this.config = config;
    this.deviceId = deviceId;
  }

  private getNormalizedUrl(): string {
    let raw = (this.config.databaseUrl || '').trim();
    if (raw.startsWith('turso://')) {
      raw = 'https://' + raw.slice('turso://'.length);
    } else if (raw.startsWith('libsql://')) {
      raw = 'https://' + raw.slice('libsql://'.length);
    }
    return raw.replace(/\/v2\/pipeline\/?$/, '').replace(/\/+$/, '');
  }

  private getTableName(): string {
    return (this.config.tableName || 'noether_sync_documents').trim();
  }

  private async executePipeline(
    statements: Array<{ sql: string; args?: any[] }>
  ): Promise<any[]> {
    const baseUrl = this.getNormalizedUrl();
    const token = (this.config.authToken || '').trim();

    if (!baseUrl) throw new Error('Turso Database URL is missing.');
    if (!token) throw new Error('Turso Auth Token is missing.');

    const requests = statements.map(({ sql, args = [] }) => ({
      type: 'execute',
      stmt: {
        sql,
        args: args.map((arg) => {
          if (arg === null || arg === undefined) return { type: 'null' };
          if (typeof arg === 'number') return { type: 'integer', value: String(arg) };
          if (typeof arg === 'boolean') return { type: 'integer', value: arg ? '1' : '0' };
          return { type: 'text', value: String(arg) };
        }),
      },
    }));

    requests.push({ type: 'close' } as any);

    const res = await fetch(`${baseUrl}/v2/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Turso HTTP error (${res.status}): ${errText}`);
    }

    const payload = await res.json();
    return payload.results || [];
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const table = this.getTableName();

    try {
      const results = await this.executePipeline([
        { sql: `SELECT COUNT(*) as count FROM ${table} LIMIT 1` },
      ]);

      const first = results[0];
      const latencyMs = Date.now() - startTime;

      if (first?.type === 'error') {
        const msg = first.error?.message || 'Turso error';
        if (msg.includes('no such table')) {
          return {
            success: false,
            latencyMs,
            message: `Table "${table}" does not exist in Turso yet. Please execute the setup SQL in the Turso CLI or Web Shell.`,
          };
        }
        return { success: false, latencyMs, message: `Turso query error: ${msg}` };
      }

      return {
        success: true,
        latencyMs,
        message: `Connected to Turso successfully (${latencyMs}ms). Table "${table}" is operational.`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        message: `Connection failed: ${err?.message || String(err)}`,
      };
    }
  }

  public async pullChanges(sinceTimestamp: number): Promise<RemoteSyncPayload> {
    const table = this.getTableName();
    const sql = `SELECT id, parent_id, title, content_json, is_daily_note, is_folder, is_bookmarked, doc_type, properties, created_at, updated_at, deleted_at, device_id FROM ${table} WHERE updated_at >= ? ORDER BY updated_at ASC LIMIT 1000`;

    const results = await this.executePipeline([{ sql, args: [sinceTimestamp] }]);
    const first = results[0];

    if (first?.type === 'error') {
      throw new Error(`Turso error pulling changes: ${first.error?.message}`);
    }

    const queryResult = first?.response?.result;
    if (!queryResult || !Array.isArray(queryResult.rows)) {
      return { items: [], deletedIds: [], serverTimestamp: Date.now() };
    }

    const cols: string[] = queryResult.cols.map((c: any) => c.name);
    const items: DocumentSyncItem[] = [];
    const deletedIds: string[] = [];

    for (const row of queryResult.rows) {
      const record: Record<string, any> = {};
      row.forEach((cell: any, idx: number) => {
        const col = cols[idx];
        record[col] = cell && cell.type !== 'null' ? cell.value : null;
      });

      if (record.deleted_at && Number(record.deleted_at) > 0) {
        deletedIds.push(String(record.id));
      } else {
        items.push({
          id: String(record.id),
          parent_id: record.parent_id ? String(record.parent_id) : null,
          title: String(record.title || 'Untitled'),
          content_json: String(record.content_json || ''),
          is_daily_note: Number(record.is_daily_note || 0),
          is_folder: Number(record.is_folder || 0),
          is_bookmarked: Number(record.is_bookmarked || 0),
          doc_type: String(record.doc_type || 'base'),
          properties: String(record.properties || '{}'),
          created_at: Number(record.created_at || Date.now()),
          updated_at: Number(record.updated_at || Date.now()),
          deleted_at: record.deleted_at ? Number(record.deleted_at) : null,
          device_id: record.device_id ? String(record.device_id) : undefined,
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
    const statements: Array<{ sql: string; args?: any[] }> = [];

    // 1. Build upsert statements
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
      statements.push({
        sql,
        args: [
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
        ],
      });
    }

    // 2. Build tombstone statements
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
      statements.push({ sql, args: [id, now, now, this.deviceId] });
    }

    try {
      if (statements.length > 0) {
        await this.executePipeline(statements);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  public getSchemaScript(): string {
    const table = this.getTableName();
    return `-- Run this in your Turso Shell (turso db shell <database-name>):
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
