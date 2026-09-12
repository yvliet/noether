/**
 * @module SyncExtension
 * @description
 * First-party core extension providing bidirectional cloud synchronization for Noether.
 * Integrates natively with Supabase, Turso, Cloudflare D1, and Custom REST endpoints.
 * Disabled by default to respect local-first privacy until configured by the user.
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest } from '@/core/extensions/types';
import { NoetherApp } from '@/core/app/NoetherApp';
import { DatabaseSync01Icon } from '@/components/common/Icons';
import { SyncConfig, SyncTelemetry, DEFAULT_CONFIG } from './types';
import { SyncEngine, SyncEngineState } from './engine/SyncEngine';
import { createProvider } from './providers';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { SyncSettingsTab } from './ui/SyncSettingsTab';
import { useSyncStore } from './syncStore';
import manifest from './manifest.json';
import syncReadme from './readme.md?raw';

export const SYNC_MANIFEST: ExtensionManifest = {
  ...(manifest as ExtensionManifest),
  readme: syncReadme,
};

const SyncSettingsWrapper: React.FC<{
  app: NoetherApp;
  onSaveConfig: (cfg: SyncConfig) => void;
}> = ({ app, onSaveConfig }) => {
  const config = useSyncStore((s) => s.config);
  const telemetry = useSyncStore((s) => s.telemetry);
  const engine = useSyncStore((s) => s.engine);

  return (
    <SyncSettingsTab
      config={config}
      telemetry={telemetry}
      engine={engine}
      onSaveConfig={onSaveConfig}
      showToast={(msg, type) => app.workspace.showToast(msg, type === 'error' ? 'warning' : type)}
    />
  );
};

export class SyncExtension extends Extension {
  private config: SyncConfig = { ...DEFAULT_CONFIG };
  private engine: SyncEngine | null = null;

  constructor(app: NoetherApp, manifest: ExtensionManifest = SYNC_MANIFEST) {
    super(app, manifest);
  }

  public async onload(): Promise<void> {
    // 1. Load persisted extension configuration and sync metadata
    const savedData = await this.loadData<{
      config?: SyncConfig;
      state?: SyncEngineState;
    }>();

    if (savedData?.config) {
      this.config = {
        ...DEFAULT_CONFIG,
        ...savedData.config,
        supabase: { ...DEFAULT_CONFIG.supabase, ...savedData.config.supabase },
        turso: { ...DEFAULT_CONFIG.turso, ...savedData.config.turso },
        cloudflareD1: { ...DEFAULT_CONFIG.cloudflareD1, ...savedData.config.cloudflareD1 },
        customRest: { ...DEFAULT_CONFIG.customRest, ...savedData.config.customRest },
      };
    }

    // 2. Initialize sync engine
    this.engine = new SyncEngine(
      this.app,
      this.config,
      savedData?.state?.telemetry,
      savedData?.state?.tombstones,
      savedData?.state?.remoteToLocalMap,
      savedData?.state?.localToRemoteMap,
      (telemetry: SyncTelemetry) => {
        useSyncStore.getState().setTelemetry(telemetry);
      },
      async (engineState: SyncEngineState) => {
        await this.saveData({
          config: this.config,
          state: engineState,
        });
      }
    );

    useSyncStore.getState().setConfig(this.config);
    useSyncStore.getState().setTelemetry(this.engine.getTelemetry());
    useSyncStore.getState().setEngine(this.engine);

    // 3. Register EventBus listeners
    this.onEvent('document:saved', () => {
      this.engine?.onDocumentSaved();
    });

    this.onEvent('document:deleted', (data) => {
      if (data?.id) {
        this.engine?.recordDeletion(data.id);
      }
    });

    // 4. Register Status Bar Indicator (order 50, right-aligned)
    this.addStatusBarItem({
      id: 'status',
      alignment: 'right',
      order: 50,
      render: () => <SyncStatusIndicator app={this.app} />,
    });

    // 5. Register Commands
    this.addCommand({
      id: 'sync:sync-now',
      title: 'Synchronize now',
      action: async (app) => {
        if (!this.engine) {
          app.workspace.showToast('Sync engine is not initialized', 'warning');
          return;
        }
        app.workspace.showToast('Starting Sync...', 'info');
        const res = await this.engine.syncNow();
        if (res.success) {
          app.workspace.showToast(res.message, 'success');
        } else {
          app.workspace.showToast(res.message, 'warning');
        }
      },
    });

    this.addCommand({
      id: 'sync:open-settings',
      title: 'Configure cloud provider',
      action: (app) => {
        app.workspace.openSettings('sync:sync-settings');
      },
    });

    // 6. Register Settings Tab
    this.registerSettingTab({
      id: 'sync-settings',
      name: 'Sync',
      icon: <DatabaseSync01Icon size={14} />,
      render: () => (
        <SyncSettingsWrapper
          app={this.app}
          onSaveConfig={async (newConfig) => {
            this.config = newConfig;
            this.engine?.updateConfig(newConfig);
            useSyncStore.getState().setConfig(newConfig);
            await this.saveData({
              config: this.config,
              state: {
                telemetry: this.engine?.getTelemetry() || useSyncStore.getState().telemetry,
                tombstones: this.engine?.getTombstones() || [],
                remoteToLocalMap: this.engine?.getRemoteToLocalMap() || [],
                localToRemoteMap: this.engine?.getLocalToRemoteMap() || [],
              },
            });
          }}
        />
      ),
      onRestoreDefaults: async () => {
        this.config = { ...DEFAULT_CONFIG };
        this.engine?.updateConfig(this.config);
        useSyncStore.getState().restoreDefaults();
        await this.saveData({
          config: this.config,
          state: {
            telemetry: this.engine?.getTelemetry() || useSyncStore.getState().telemetry,
            tombstones: [],
            remoteToLocalMap: [],
            localToRemoteMap: [],
          },
        });
      },
    });

    // 7. Register MCP Tools
    this.registerTool({
      name: 'sync_now',
      description: 'Triggers a bidirectional synchronization cycle with the configured cloud database.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        if (!this.engine) {
          return {
            content: [{ type: 'text', text: 'Sync engine is not initialized.' }],
            isError: true,
          };
        }
        const res = await this.engine.syncNow();
        return {
          content: [{ type: 'text', text: JSON.stringify(res) }],
          isError: !res.success,
        };
      },
    });

    this.registerTool({
      name: 'get_sync_status',
      description: 'Returns the current Sync status, active provider, last sync timestamp, and telemetry counts.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const telemetry = this.engine?.getTelemetry() || useSyncStore.getState().telemetry;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                activeProvider: this.config.activeProvider,
                telemetry,
              }),
            },
          ],
        };
      },
    });

    this.registerTool({
      name: 'test_connection',
      description: 'Tests connectivity and schema access for the active cloud sync provider.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const provider = createProvider(this.config);
        const result = await provider.testConnection();
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          isError: !result.success,
        };
      },
    });
  }

  public onunload(): void {
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
    useSyncStore.getState().setEngine(null);
  }
}
