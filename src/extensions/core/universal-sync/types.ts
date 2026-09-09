/**
 * @module UniversalSyncTypes
 * @description
 * Shared type definitions, provider contracts, and configuration schemas
 * for the Flint Universal External Sync extension.
 */

export type SyncProviderType = 'supabase' | 'turso' | 'cloudflare_d1' | 'custom_rest';

export type ConflictStrategy =
  | 'last_write_wins'
  | 'keep_both'
  | 'local_wins'
  | 'remote_wins';

export interface DocumentSyncItem {
  id: string;
  parent_id: string | null;
  title: string;
  content_json: string;
  is_daily_note: number;
  is_folder: number;
  is_bookmarked: number;
  doc_type: string;
  properties: string;
  created_at: number;
  updated_at: number;
  deleted_at?: number | null;
  device_id?: string;
}

export interface RemoteSyncPayload {
  items: DocumentSyncItem[];
  deletedIds: string[];
  serverTimestamp: number;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncTelemetry {
  lastSyncedAt: number | null;
  lastStatus: SyncStatus;
  lastError: string | null;
  syncedCount: number;
  conflictCount: number;
  deviceId: string;
}

export interface SupabaseConfig {
  projectUrl: string;
  anonKey: string;
  tableName?: string;
}

export interface TursoConfig {
  databaseUrl: string;
  authToken: string;
  tableName?: string;
}

export interface CloudflareD1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
  tableName?: string;
}

export interface CustomRestConfig {
  endpointUrl: string;
  bearerToken?: string;
  customHeadersJson?: string;
}

export interface UniversalSyncConfig {
  activeProvider: SyncProviderType;
  autoSyncOnSave: boolean;
  periodicIntervalSeconds: number; // 0 = off, 60 = 1m, 300 = 5m, 900 = 15m
  conflictStrategy: ConflictStrategy;
  deviceId: string;
  supabase: SupabaseConfig;
  turso: TursoConfig;
  cloudflareD1: CloudflareD1Config;
  customRest: CustomRestConfig;
}

export const DEFAULT_CONFIG: UniversalSyncConfig = {
  activeProvider: 'supabase',
  autoSyncOnSave: true,
  periodicIntervalSeconds: 300,
  conflictStrategy: 'last_write_wins',
  deviceId: `device_${Math.random().toString(36).substring(2, 10)}`,
  supabase: {
    projectUrl: '',
    anonKey: '',
    tableName: 'flint_sync_documents',
  },
  turso: {
    databaseUrl: '',
    authToken: '',
    tableName: 'flint_sync_documents',
  },
  cloudflareD1: {
    accountId: '',
    databaseId: '',
    apiToken: '',
    tableName: 'flint_sync_documents',
  },
  customRest: {
    endpointUrl: '',
    bearerToken: '',
    customHeadersJson: '{}',
  },
};
