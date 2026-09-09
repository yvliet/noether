/**
 * @module SyncEngine
 * @description
 * Robust bidirectional synchronization engine for Flint.
 * Integrates cleanly through the Flint SDK and Hearth API without
 * importing internal runtime modules or violating core sandbox isolation.
 */

import type { FlintApp } from '@/core/app/FlintApp';
import type { DocumentItem } from '@/types';
import {
  UniversalSyncConfig,
  SyncTelemetry,
  DocumentSyncItem,
} from '../types';
import { createProvider, BaseProvider } from '../providers';

export interface SyncEngineState {
  telemetry: SyncTelemetry;
  tombstones: [string, number][];
  remoteToLocalMap?: [string, string][];
  localToRemoteMap?: [string, string][];
}

export class SyncEngine {
  private app: FlintApp;
  private config: UniversalSyncConfig;
  private telemetry: SyncTelemetry;
  private tombstones: Map<string, number> = new Map();
  private remoteToLocal: Map<string, string> = new Map();
  private localToRemote: Map<string, string> = new Map();
  private isSyncing = false;
  private debounceTimer: any = null;
  private periodicTimer: any = null;
  private onTelemetryChange: (telemetry: SyncTelemetry) => void;
  private persistStateFn: (data: SyncEngineState) => Promise<void>;

  constructor(
    app: FlintApp,
    config: UniversalSyncConfig,
    initialTelemetry: Partial<SyncTelemetry> | undefined,
    initialTombstones: [string, number][] | undefined,
    initialRemoteToLocal: [string, string][] | undefined,
    initialLocalToRemote: [string, string][] | undefined,
    onTelemetryChange: (telemetry: SyncTelemetry) => void,
    persistStateFn: (data: SyncEngineState) => Promise<void>
  ) {
    this.app = app;
    this.config = config;
    this.onTelemetryChange = onTelemetryChange;
    this.persistStateFn = persistStateFn;

    this.telemetry = {
      lastSyncedAt: initialTelemetry?.lastSyncedAt ?? null,
      lastStatus: initialTelemetry?.lastStatus ?? 'idle',
      lastError: initialTelemetry?.lastError ?? null,
      syncedCount: initialTelemetry?.syncedCount ?? 0,
      conflictCount: initialTelemetry?.conflictCount ?? 0,
      deviceId: config.deviceId,
    };

    if (initialTombstones && Array.isArray(initialTombstones)) {
      this.tombstones = new Map(initialTombstones);
    }
    if (initialRemoteToLocal && Array.isArray(initialRemoteToLocal)) {
      this.remoteToLocal = new Map(initialRemoteToLocal);
    }
    if (initialLocalToRemote && Array.isArray(initialLocalToRemote)) {
      this.localToRemote = new Map(initialLocalToRemote);
    }

    this.setupPeriodicSync();
  }

  public updateConfig(newConfig: UniversalSyncConfig): void {
    this.config = newConfig;
    this.setupPeriodicSync();
  }

  public getTelemetry(): SyncTelemetry {
    return { ...this.telemetry };
  }

  public getTombstones(): [string, number][] {
    return Array.from(this.tombstones.entries());
  }

  public getRemoteToLocalMap(): [string, string][] {
    return Array.from(this.remoteToLocal.entries());
  }

  public getLocalToRemoteMap(): [string, string][] {
    return Array.from(this.localToRemote.entries());
  }

  /**
   * Records a local deletion event for cross-device tombstone propagation.
   */
  public recordDeletion(docId: string): void {
    const remoteId = this.localToRemote.get(docId) || docId;
    this.tombstones.set(remoteId, Date.now());
    this.persistState();

    if (this.config.autoSyncOnSave) {
      this.triggerDebouncedSync();
    }
  }

  /**
   * Invoked when a document is saved locally in Flint.
   */
  public onDocumentSaved(): void {
    if (this.config.autoSyncOnSave) {
      this.triggerDebouncedSync();
    }
  }

  private triggerDebouncedSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.syncNow().catch((err) => {
        console.warn('[UniversalSync] Debounced sync failed:', err);
      });
    }, 2500);
  }

  private setupPeriodicSync(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }

    const intervalSec = this.config.periodicIntervalSeconds || 0;
    if (intervalSec > 0) {
      this.periodicTimer = setInterval(() => {
        this.syncNow().catch((err) => {
          console.warn('[UniversalSync] Periodic sync failed:', err);
        });
      }, intervalSec * 1000);
    }
  }

  public destroy(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.periodicTimer) clearInterval(this.periodicTimer);
  }

  private setTelemetry(patch: Partial<SyncTelemetry>): void {
    this.telemetry = { ...this.telemetry, ...patch };
    this.onTelemetryChange(this.telemetry);
    this.persistState();
  }

  private persistState(): void {
    this.persistStateFn({
      telemetry: this.telemetry,
      tombstones: Array.from(this.tombstones.entries()),
      remoteToLocalMap: Array.from(this.remoteToLocal.entries()),
      localToRemoteMap: Array.from(this.localToRemote.entries()),
    }).catch((e) => console.warn('[UniversalSync] State persist error:', e));
  }

  /**
   * Executes a complete bidirectional synchronization cycle.
   */
  public async syncNow(): Promise<{ success: boolean; message: string; syncedCount: number }> {
    if (this.isSyncing) {
      return { success: false, message: 'Sync is already in progress', syncedCount: 0 };
    }

    this.isSyncing = true;
    this.setTelemetry({ lastStatus: 'syncing', lastError: null });

    const provider: BaseProvider = createProvider(this.config);
    const sinceTimestamp = this.telemetry.lastSyncedAt || 0;
    const currentSyncStart = Date.now();
    let appliedCount = 0;
    let conflictCount = 0;

    try {
      // 1. Gather all local documents via Hearth API
      const localDocs: DocumentItem[] = this.app.hearth.documents || [];
      const localMap = new Map<string, DocumentItem>();
      for (const d of localDocs) {
        localMap.set(d.id, d);
      }

      // 2. Identify local upserts modified since last sync
      const localUpserts: DocumentSyncItem[] = [];
      for (const d of localDocs) {
        if (Number(d.updated_at || 0) >= sinceTimestamp) {
          // Read full content if not present
          let content = d.content_json || '';
          if (!content) {
            const fullDoc = await this.app.hearth.readDocument(d.id);
            if (fullDoc?.content_json) {
              content = fullDoc.content_json;
            }
          }

          const remoteId = this.localToRemote.get(d.id) || d.id;
          localUpserts.push({
            id: remoteId,
            parent_id: d.parent_id ? String(d.parent_id) : null,
            title: String(d.title || 'Untitled'),
            content_json: content,
            is_daily_note: Number(d.is_daily_note || 0),
            is_folder: Number(d.is_folder || 0),
            is_bookmarked: Number(d.is_bookmarked || 0),
            doc_type: String(d.doc_type || 'base'),
            properties: typeof d.properties === 'object' ? JSON.stringify(d.properties) : String(d.properties || '{}'),
            created_at: Number(d.created_at || Date.now()),
            updated_at: Number(d.updated_at || Date.now()),
            device_id: this.config.deviceId,
          });
        }
      }

      // 3. Identify local deletions (tombstones) since last sync
      const localDeletions: string[] = [];
      for (const [id, deletedAt] of this.tombstones.entries()) {
        if (deletedAt >= sinceTimestamp) {
          localDeletions.push(id);
        }
      }

      // 4. Pull remote changes
      const remotePayload = await provider.pullChanges(sinceTimestamp);

      // 5. Apply remote deletions locally
      for (const delRemoteId of remotePayload.deletedIds) {
        const localId = this.remoteToLocal.get(delRemoteId) || delRemoteId;
        if (localMap.has(localId)) {
          try {
            await this.app.hearth.deleteDocument(localId);
            this.tombstones.set(delRemoteId, Date.now());
            localMap.delete(localId);
            appliedCount++;
          } catch (e) {
            console.error(`[UniversalSync] Failed to apply remote deletion for ${delRemoteId}:`, e);
          }
        }
      }

      // 6. Apply remote upserts locally
      const remoteHandledIds = new Set<string>();

      for (const rDoc of remotePayload.items) {
        // Skip changes originated from this exact device session
        if (rDoc.device_id === this.config.deviceId && sinceTimestamp > 0) {
          continue;
        }

        remoteHandledIds.add(rDoc.id);
        const localId = this.remoteToLocal.get(rDoc.id) || rDoc.id;
        let existingLocal = localMap.get(localId);

        // Secondary matching by title and folder if ID was not previously mapped
        if (!existingLocal) {
          existingLocal = localDocs.find(
            (d) => d.title === rDoc.title && (d.parent_id || null) === (rDoc.parent_id || null)
          );
          if (existingLocal) {
            this.remoteToLocal.set(rDoc.id, existingLocal.id);
            this.localToRemote.set(existingLocal.id, rDoc.id);
          }
        }

        if (!existingLocal) {
          // Document does not exist locally -> create new document
          const createdDoc = await this.app.hearth.createNewDocument(
            rDoc.title,
            rDoc.parent_id,
            rDoc.doc_type || 'base'
          );

          if (createdDoc) {
            this.remoteToLocal.set(rDoc.id, createdDoc.id);
            this.localToRemote.set(createdDoc.id, rDoc.id);
            await this.app.hearth.saveDocument(createdDoc.id, rDoc.content_json, rDoc.title);

            if (rDoc.properties) {
              try {
                const parsedProps = typeof rDoc.properties === 'string' ? JSON.parse(rDoc.properties) : rDoc.properties;
                await this.app.hearth.updateDocumentProperties(createdDoc.id, parsedProps);
              } catch {}
            }
            appliedCount++;
          }
        } else {
          // Document exists locally. Check for simultaneous modifications
          const localUpdated = Number(existingLocal.updated_at || 0);
          const remoteUpdated = Number(rDoc.updated_at || 0);

          if (localUpdated >= sinceTimestamp && localUpdated !== remoteUpdated) {
            // Simultaneous edit conflict
            const strategy = this.config.conflictStrategy;

            if (strategy === 'keep_both') {
              conflictCount++;
              const conflictDoc = await this.app.hearth.createNewDocument(
                `[Conflict Copy] ${rDoc.title}`,
                rDoc.parent_id,
                rDoc.doc_type || 'base'
              );
              if (conflictDoc) {
                await this.app.hearth.saveDocument(conflictDoc.id, rDoc.content_json, conflictDoc.title);
                appliedCount++;
              }
            } else if (strategy === 'local_wins') {
              continue;
            } else if (strategy === 'remote_wins' || strategy === 'last_write_wins') {
              if (strategy === 'remote_wins' || remoteUpdated > localUpdated) {
                await this.app.hearth.saveDocument(existingLocal.id, rDoc.content_json, rDoc.title);
                if (rDoc.properties) {
                  try {
                    const parsedProps = typeof rDoc.properties === 'string' ? JSON.parse(rDoc.properties) : rDoc.properties;
                    await this.app.hearth.updateDocumentProperties(existingLocal.id, parsedProps);
                  } catch {}
                }
                appliedCount++;
              }
            }
          } else if (remoteUpdated > localUpdated) {
            // Remote is newer without conflict -> apply remote
            await this.app.hearth.saveDocument(existingLocal.id, rDoc.content_json, rDoc.title);
            if (rDoc.properties) {
              try {
                const parsedProps = typeof rDoc.properties === 'string' ? JSON.parse(rDoc.properties) : rDoc.properties;
                await this.app.hearth.updateDocumentProperties(existingLocal.id, parsedProps);
              } catch {}
            }
            appliedCount++;
          }
        }
      }

      // 7. Push local upserts to remote (excluding documents we just pulled)
      const toPush = localUpserts.filter((doc) => !remoteHandledIds.has(doc.id));
      if (toPush.length > 0 || localDeletions.length > 0) {
        const pushResult = await provider.pushChanges(toPush, localDeletions);
        if (!pushResult.success) {
          throw new Error(pushResult.error || 'Failed to push changes to remote database');
        }
      }

      // 8. Prune old tombstones (> 30 days)
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      for (const [id, time] of this.tombstones.entries()) {
        if (time < thirtyDaysAgo) {
          this.tombstones.delete(id);
        }
      }

      const totalSynced = appliedCount + toPush.length;
      this.setTelemetry({
        lastSyncedAt: currentSyncStart,
        lastStatus: 'success',
        lastError: null,
        syncedCount: this.telemetry.syncedCount + totalSynced,
        conflictCount: this.telemetry.conflictCount + conflictCount,
      });

      return {
        success: true,
        message: `Sync completed successfully (${totalSynced} items synchronized).`,
        syncedCount: totalSynced,
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      this.setTelemetry({
        lastStatus: 'error',
        lastError: errMsg,
      });
      return { success: false, message: `Sync failed: ${errMsg}`, syncedCount: 0 };
    } finally {
      this.isSyncing = false;
    }
  }
}
