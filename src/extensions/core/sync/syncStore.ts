/**
 * @module syncStore
 * @description
 * Reactive Zustand store for Sync config and live telemetry.
 * Powers status bar indicators and settings UI with instant updates.
 */

import { create } from 'zustand';
import { SyncConfig, SyncTelemetry, DEFAULT_CONFIG } from './types';
import { SyncEngine } from './engine/SyncEngine';

export interface SyncStoreState {
  config: SyncConfig;
  telemetry: SyncTelemetry;
  engine: SyncEngine | null;
  setConfig: (config: SyncConfig) => void;
  setTelemetry: (telemetry: SyncTelemetry) => void;
  setEngine: (engine: SyncEngine | null) => void;
  restoreDefaults: () => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  config: { ...DEFAULT_CONFIG },
  telemetry: {
    lastSyncedAt: null,
    lastStatus: 'idle',
    lastError: null,
    syncedCount: 0,
    conflictCount: 0,
    deviceId: DEFAULT_CONFIG.deviceId,
  },
  engine: null,
  setConfig: (config) => set({ config }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setEngine: (engine) => set({ engine }),
  restoreDefaults: () =>
    set({
      config: { ...DEFAULT_CONFIG },
      telemetry: {
        lastSyncedAt: null,
        lastStatus: 'idle',
        lastError: null,
        syncedCount: 0,
        conflictCount: 0,
        deviceId: DEFAULT_CONFIG.deviceId,
      },
    }),
}));
