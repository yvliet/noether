/**
 * @module UniversalSyncExtension
 * @description
 * First-party core extension providing bidirectional cloud synchronization for Flint.
 * Integrates natively with Supabase, Turso, Cloudflare D1, and Custom REST endpoints.
 * Disabled by default to respect local-first privacy until configured by the user.
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { DatabaseSync01Icon } from '@/components/common/Icons';
import { UniversalSyncConfig, SyncTelemetry, DEFAULT_CONFIG } from './types';
import { SyncEngine, SyncEngineState } from './engine/SyncEngine';
import { createProvider } from './providers';
import { UniversalSyncStatusIndicator } from './UniversalSyncStatusIndicator';
import { UniversalSyncSettingsTab } from './ui/UniversalSyncSettingsTab';
import { useUniversalSyncStore } from './universalSyncStore';
import { universalSyncReadme } from './readme';

export const UNIVERSAL_SYNC_MANIFEST: ExtensionManifest = {
  id: 'universal-sync',
  name: 'Universal Sync',
  version: '1.0.0',
  description: 'Bidirectional cloud sync engine supporting Supabase, Turso, Cloudflare D1, and Custom REST APIs.',
  author: 'Yuliet Li',
  isCore: true,
  defaultDisabled: true,
  tags: ['sync', 'cloud', 'supabase', 'turso', 'd1', 'mobile'],
  readme: universalSyncReadme,
};

const UniversalSyncSettingsWrapper: React.FC<{
  app: FlintApp;
  onSaveConfig: (cfg: UniversalSyncConfig) => void;
}> = ({ app, onSaveConfig }) => {
  const config = useUniversalSyncStore((s) => s.config);
  const telemetry = useUniversalSyncStore((s) => s.telemetry);
  const engine = useUniversalSyncStore((s) => s.engine);

  return (
    <UniversalSyncSettingsTab
      config={config}
      telemetry={telemetry}
      engine={engine}
      onSaveConfig={onSaveConfig}
      showToast={(msg, type) => app.workspace.showToast(msg, type === 'error' ? 'warning' : type)}
    />
  );
};

export class UniversalSyncExtension extends Extension {
  private config: UniversalSyncConfig = { ...DEFAULT_CONFIG };
  private engine: SyncEngine | null = null;

  constructor(app: FlintApp, manifest: ExtensionManifest = UNIVERSAL_SYNC_MANIFEST) {
    super(app, manifest);
  }

  public async onload(): Promise<void> {
    // 1. Load persisted extension configuration and sync metadata
    const savedData = await this.loadData<{
      config?: UniversalSyncConfig;
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
        useUniversalSyncStore.getState().setTelemetry(telemetry);
      },
      async (engineState: SyncEngineState) => {
        await this.saveData({
          config: this.config,
          state: engineState,
        });
      }
    );

    useUniversalSyncStore.getState().setConfig(this.config);
    useUniversalSyncStore.getState().setTelemetry(this.engine.getTelemetry());
    useUniversalSyncStore.getState().setEngine(this.engine);

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
      render: () => <UniversalSyncStatusIndicator app={this.app} />,
    });

    // 5. Register Commands
    this.addCommand({
      id: 'universal-sync:sync-now',
      title: 'Universal Sync: Synchronize Now',
      action: async (app) => {
        if (!this.engine) {
          app.workspace.showToast('Sync engine is not initialized', 'warning');
          return;
        }
        app.workspace.showToast('Starting Universal Sync...', 'info');
        const res = await this.engine.syncNow();
        if (res.success) {
          app.workspace.showToast(res.message, 'success');
        } else {
          app.workspace.showToast(res.message, 'warning');
        }
      },
    });

    this.addCommand({
      id: 'universal-sync:open-settings',
      title: 'Universal Sync: Configure Cloud Provider',
      action: (app) => {
        app.workspace.openSettings('universal-sync:universal-sync-settings');
      },
    });

    // 6. Register Settings Tab
    this.registerSettingTab({
      id: 'universal-sync-settings',
      name: 'Universal Sync',
      icon: <DatabaseSync01Icon size={14} />,
      render: () => (
        <UniversalSyncSettingsWrapper
          app={this.app}
          onSaveConfig={async (newConfig) => {
            this.config = newConfig;
            this.engine?.updateConfig(newConfig);
            useUniversalSyncStore.getState().setConfig(newConfig);
            await this.saveData({
              config: this.config,
              state: {
                telemetry: this.engine?.getTelemetry() || useUniversalSyncStore.getState().telemetry,
                tombstones: this.engine?.getTombstones() || [],
                remoteToLocalMap: this.engine?.getRemoteToLocalMap() || [],
                localToRemoteMap: this.engine?.getLocalToRemoteMap() || [],
              },
            });
          }}
        />
      ),
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
      description: 'Returns the current Universal Sync status, active provider, last sync timestamp, and telemetry counts.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        const telemetry = this.engine?.getTelemetry() || useUniversalSyncStore.getState().telemetry;
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
    useUniversalSyncStore.getState().setEngine(null);
  }
}
