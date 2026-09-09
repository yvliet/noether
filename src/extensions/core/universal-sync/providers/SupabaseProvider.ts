/**
 * @module SupabaseProvider
 * @description
 * High-performance sync provider interfacing with Supabase PostgreSQL
 * via the native PostgREST HTTP REST interface.
 *
 * Technical Rationale:
 * - Direct HTTP PostgREST calls with zero native PostgreSQL client dependencies.
 * - Leverages PostgREST `Prefer: resolution=merge-duplicates` for atomic upserts.
 * - Perfectly compatible with Supabase's permanent free-tier projects (500MB storage).
 */

import { BaseProvider } from './BaseProvider';
import {
  DocumentSyncItem,
  RemoteSyncPayload,
  ConnectionTestResult,
  SupabaseConfig,
} from '../types';

export class SupabaseProvider extends BaseProvider {
  public readonly name = 'Supabase PostgreSQL (Free Tier)';
  public readonly providerType = 'supabase';

  private config: SupabaseConfig;
  private deviceId: string;

  constructor(config: SupabaseConfig, deviceId: string) {
    super();
    this.config = config;
    this.deviceId = deviceId;
  }

  private getBaseUrl(): string {
    return (this.config.projectUrl || '').trim().replace(/\/+$/, '');
  }

  private getTableName(): string {
    return (this.config.tableName || 'flint_sync_documents').trim();
  }

  private getHeaders(): Record<string, string> {
    const key = (this.config.anonKey || '').trim();
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    const baseUrl = this.getBaseUrl();
    const key = this.config.anonKey.trim();
    const table = this.getTableName();

    if (!baseUrl) {
      return { success: false, message: 'Supabase Project URL is missing. Please enter your project URL.' };
    }
    if (!key) {
      return { success: false, message: 'Supabase Anon Key is missing. Please enter your API key.' };
    }

    const startTime = Date.now();
    try {
      const res = await fetch(`${baseUrl}/rest/v1/${table}?select=id&limit=1`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return {
          success: true,
          latencyMs,
          message: `Connected successfully (${latencyMs}ms). Database table "${table}" is ready.`,
        };
      }

      if (res.status === 404 || res.status === 400) {
        const errText = await res.text();
        if (errText.includes('relation') || errText.includes('does not exist')) {
          return {
            success: false,
            latencyMs,
            message: `Table "${table}" does not exist in Supabase yet. Please run the setup SQL in the Supabase SQL Editor.`,
          };
        }
      }

      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          latencyMs,
          message: 'Authentication failed (HTTP 401/403). Please verify your Supabase anon/public API key.',
        };
      }

      const text = await res.text();
      return {
        success: false,
        latencyMs,
        message: `HTTP ${res.status}: ${text.slice(0, 150)}`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        message: `Network error connecting to Supabase: ${err?.message || String(err)}`,
      };
    }
  }

  public async pullChanges(sinceTimestamp: number): Promise<RemoteSyncPayload> {
    const baseUrl = this.getBaseUrl();
    const table = this.getTableName();

    // Pull items modified since timestamp
    const url = `${baseUrl}/rest/v1/${table}?select=*&updated_at=gte.${sinceTimestamp}&order=updated_at.asc&limit=1000`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to pull changes from Supabase (${res.status}): ${errText}`);
    }

    const rows: any[] = await res.json();
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
          properties: typeof r.properties === 'object' ? JSON.stringify(r.properties) : String(r.properties || '{}'),
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
    const baseUrl = this.getBaseUrl();
    const table = this.getTableName();

    try {
      // 1. Push upsert batch
      if (upserts.length > 0) {
        const payload = upserts.map((doc) => ({
          ...doc,
          device_id: this.deviceId,
          deleted_at: null,
        }));

        const res = await fetch(`${baseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Error upserting notes to Supabase (${res.status}): ${errText}`);
        }
      }

      // 2. Push soft-deletions / tombstones
      if (deletedIds.length > 0) {
        const deletePayload = deletedIds.map((id) => ({
          id,
          title: '[Deleted Note]',
          content_json: '',
          is_daily_note: 0,
          is_folder: 0,
          is_bookmarked: 0,
          doc_type: 'deleted',
          properties: '{}',
          created_at: 0,
          updated_at: Date.now(),
          deleted_at: Date.now(),
          device_id: this.deviceId,
        }));

        const res = await fetch(`${baseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify(deletePayload),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Error syncing deletions to Supabase (${res.status}): ${errText}`);
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  public getSchemaScript(): string {
    const table = this.getTableName();
    return `-- 1. Create the Flint Sync Documents table
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
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT DEFAULT NULL,
  device_id TEXT
);

-- 2. Create performance indexes for rapid incremental delta sync
CREATE INDEX IF NOT EXISTS idx_${table}_updated ON ${table}(updated_at);
CREATE INDEX IF NOT EXISTS idx_${table}_deleted ON ${table}(deleted_at);

-- 3. Enable Row Level Security (RLS) and permit CRUD access for your API key
ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Flint Sync CRUD" ON ${table};
CREATE POLICY "Allow Flint Sync CRUD" ON ${table}
  FOR ALL
  USING (true)
  WITH CHECK (true);
`;
  }
}
