/**
 * @module CustomRestProvider
 * @description
 * Generic sync provider interfacing with self-hosted REST endpoints,
 * webhooks, or custom synchronization servers.
 */

import { BaseProvider } from './BaseProvider';
import {
  DocumentSyncItem,
  RemoteSyncPayload,
  ConnectionTestResult,
  CustomRestConfig,
} from '../types';

export class CustomRestProvider extends BaseProvider {
  public readonly name = 'Self-Hosted REST Server';
  public readonly providerType = 'custom_rest';

  private config: CustomRestConfig;
  private deviceId: string;

  constructor(config: CustomRestConfig, deviceId: string) {
    super();
    this.config = config;
    this.deviceId = deviceId;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.config.bearerToken?.trim()) {
      headers['Authorization'] = `Bearer ${this.config.bearerToken.trim()}`;
    }

    if (this.config.customHeadersJson?.trim()) {
      try {
        const parsed = JSON.parse(this.config.customHeadersJson);
        Object.assign(headers, parsed);
      } catch {}
    }

    return headers;
  }

  public async testConnection(): Promise<ConnectionTestResult> {
    const endpoint = (this.config.endpointUrl || '').trim();
    if (!endpoint) {
      return { success: false, message: 'REST Endpoint URL is missing.' };
    }

    const startTime = Date.now();
    try {
      const url = `${endpoint.replace(/\/+$/, '')}/health`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return {
          success: true,
          latencyMs,
          message: `Endpoint responded successfully (${latencyMs}ms).`,
        };
      }

      return {
        success: false,
        latencyMs,
        message: `HTTP ${res.status}: ${res.statusText}`,
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
    const endpoint = this.config.endpointUrl.trim().replace(/\/+$/, '');
    const url = `${endpoint}/pull?since=${sinceTimestamp}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Custom REST pull failed (${res.status}): ${text}`);
    }

    const payload = await res.json();
    return {
      items: payload.items || [],
      deletedIds: payload.deletedIds || [],
      serverTimestamp: payload.serverTimestamp || Date.now(),
    };
  }

  public async pushChanges(
    upserts: DocumentSyncItem[],
    deletedIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    const endpoint = this.config.endpointUrl.trim().replace(/\/+$/, '');
    const url = `${endpoint}/push`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          deviceId: this.deviceId,
          upserts,
          deletedIds,
          timestamp: Date.now(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Custom REST push failed (${res.status}): ${text}`);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  public getSchemaScript(): string {
    return `// Expected Custom REST API contract:
// 1. GET /health -> HTTP 200 { "status": "ok" }
// 2. GET /pull?since=<timestamp> -> HTTP 200 { "items": DocumentSyncItem[], "deletedIds": string[], "serverTimestamp": number }
// 3. POST /push -> body: { "deviceId": string, "upserts": DocumentSyncItem[], "deletedIds": string[] } -> HTTP 200 { "success": true }
`;
  }
}
