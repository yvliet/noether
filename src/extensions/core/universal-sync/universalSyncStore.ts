/**
 * @module universalSyncStore
 * @description
 * Reactive Zustand store for Universal Sync config and live telemetry.
 * Powers status bar indicators and settings UI with instant updates.
 */

import { create } from 'zustand';
import { UniversalSyncConfig, SyncTelemetry, DEFAULT_CONFIG } from './types';
import { SyncEngine } from './engine/SyncEngine';

export interface UniversalSyncStoreState {
  config: UniversalSyncConfig;
  telemetry: SyncTelemetry;
  engine: SyncEngine | null;
  setConfig: (config: UniversalSyncConfig) => void;
  setTelemetry: (telemetry: SyncTelemetry) => void;
  setEngine: (engine: SyncEngine | null) => void;
}

export const useUniversalSyncStore = create<UniversalSyncStoreState>((set) => ({
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
}));
