/**
 * @module SyncStatusIndicator
 * @description
 * Bottom status bar widget displaying real-time cloud database synchronization state.
 * Renders DatabaseIcon in red when unconfigured or on error, DatabaseSync01Icon
 * with animation during synchronization, and green DatabaseSync01Icon when connected.
 */

import React from 'react';
import { FlintApp } from '@/core/app/FlintApp';
import { DatabaseIcon, DatabaseSync01Icon } from '@/components/common/Icons';
import { useSyncStore } from './syncStore';

interface SyncStatusIndicatorProps {
  app: FlintApp;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ app }) => {
  const config = useSyncStore((s) => s.config);
  const telemetry = useSyncStore((s) => s.telemetry);
  const engine = useSyncStore((s) => s.engine);

  const isConfigured = ((): boolean => {
    switch (config.activeProvider) {
      case 'supabase':
        return Boolean(config.supabase.projectUrl && config.supabase.anonKey);
      case 'turso':
        return Boolean(config.turso.databaseUrl && config.turso.authToken);
      case 'cloudflare_d1':
        return Boolean(config.cloudflareD1.accountId && config.cloudflareD1.databaseId && config.cloudflareD1.apiToken);
      case 'custom_rest':
        return Boolean(config.customRest.endpointUrl);
      default:
        return false;
    }
  })();

  const handleClick = async () => {
    if (!isConfigured || telemetry.lastStatus === 'error') {
      app.workspace.openSettings('sync:sync-settings');
      return;
    }

    if (telemetry.lastStatus === 'syncing') {
      return;
    }

    if (engine) {
      try {
        app.workspace.showToast('Starting Sync...', 'info');
        const res = await engine.syncNow();
        if (res.success) {
          app.workspace.showToast(res.message, 'success');
        } else {
          app.workspace.showToast(res.message, 'warning');
        }
      } catch (err: any) {
        app.workspace.showToast(`Sync error: ${err?.message || err}`, 'warning');
      }
    } else {
      app.workspace.openSettings('sync:sync-settings');
    }
  };

  // 1. Unconfigured or Error state -> Red DatabaseIcon
  if (!isConfigured || telemetry.lastStatus === 'error') {
    const errorTooltip = !isConfigured
      ? 'Sync: Unconfigured (Click to configure)'
      : `Sync Error: ${telemetry.lastError || 'Unknown error'} (Click to open settings)`;

    return (
      <button
        type="button"
        onClick={handleClick}
        title={errorTooltip}
        className="p-1 rounded-[4px] flex items-center justify-center text-red-500 hover:text-red-400 cursor-pointer bg-transparent border-none outline-none select-none"
      >
        <DatabaseIcon size={12} className="text-red-500" />
      </button>
    );
  }

  // 2. Syncing state -> Spinning amber DatabaseSync01Icon
  if (telemetry.lastStatus === 'syncing') {
    return (
      <div
        title="Sync: Synchronizing changes..."
        className="p-1 rounded-[4px] flex items-center justify-center text-amber-400 cursor-default select-none"
      >
        <DatabaseSync01Icon size={12} className="animate-spin text-amber-400" />
      </div>
    );
  }

  // 3. Ready / Synced state -> Green DatabaseSync01Icon
  const successTooltip = telemetry.lastSyncedAt
    ? `Sync: Synced (${config.activeProvider}) - Click to sync now`
    : `Sync: Ready (${config.activeProvider}) - Click to sync now`;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={successTooltip}
      className="p-1 rounded-[4px] flex items-center justify-center text-emerald-400 hover:text-emerald-300 cursor-pointer bg-transparent border-none outline-none select-none"
    >
      <DatabaseSync01Icon size={12} className="text-emerald-400" />
    </button>
  );
};
