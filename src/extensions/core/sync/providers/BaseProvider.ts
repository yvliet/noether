/**
 * @module BaseProvider
 * @description
 * Abstract base class for cloud database sync providers in Flint.
 */

import {
  DocumentSyncItem,
  RemoteSyncPayload,
  ConnectionTestResult,
} from '../types';

export abstract class BaseProvider {
  public abstract readonly name: string;
  public abstract readonly providerType: string;

  /**
   * Tests the connection to the remote database and validates table existence.
   */
  public abstract testConnection(): Promise<ConnectionTestResult>;

  /**
   * Pulls remote changes that have been updated or deleted since the given timestamp.
   *
   * @param sinceTimestamp - Epoch millisecond timestamp of the last successful sync.
   */
  public abstract pullChanges(sinceTimestamp: number): Promise<RemoteSyncPayload>;

  /**
   * Pushes local document upserts and deletions to the remote database.
   *
   * @param upserts - Documents modified or created locally.
   * @param deletedIds - IDs of documents deleted locally.
   */
  public abstract pushChanges(
    upserts: DocumentSyncItem[],
    deletedIds: string[]
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Returns copyable SQL DDL or configuration script required to set up the database.
   */
  public abstract getSchemaScript(): string;
}
