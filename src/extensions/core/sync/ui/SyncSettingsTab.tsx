/**
 * @module SyncSettingsTab
 * @description
 * Complete settings tab UI for configuring the Universal Sync core extension.
 * Supports Supabase, Turso, Cloudflare D1, and Custom REST endpoints, with
 * real-time connection verification and instant bidirectional sync triggers.
 */

import React, { useState } from 'react';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import {
  SyncConfig,
  SyncTelemetry,
  SyncProviderType,
  ConflictStrategy,
} from '../types';
import { createProvider } from '../providers';
import { TursoProvider } from '../providers/TursoProvider';
import { CloudflareD1Provider } from '../providers/CloudflareD1Provider';
import { SupabaseWizard } from './SupabaseWizard';
import {
  RefreshIcon,
  CheckIcon,
  AlertCircleIcon,
  CloudIcon,
  DatabaseIcon,
  CopyIcon,
  ExternalLinkIcon,
} from './Icons';
import { SyncEngine } from '../engine/SyncEngine';

interface SyncSettingsTabProps {
  config: SyncConfig;
  telemetry: SyncTelemetry;
  engine: SyncEngine | null;
  onSaveConfig: (newConfig: SyncConfig) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const SyncSettingsTab: React.FC<SyncSettingsTabProps> = ({
  config,
  telemetry,
  engine,
  onSaveConfig,
  showToast,
}) => {
  const [localConfig, setLocalConfig] = useState<SyncConfig>({ ...config });
  const [isTesting, setIsTesting] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const updateConfig = (patch: Partial<SyncConfig>) => {
    const updated = { ...localConfig, ...patch };
    setLocalConfig(updated);
    onSaveConfig(updated);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const provider = createProvider(localConfig);
      const res = await provider.testConnection();
      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || `Successfully connected (${res.latencyMs || 0}ms latency)`,
        });
        showToast('Database connection verified successfully', 'success');
      } else {
        setTestResult({
          success: false,
          message: res.message || 'Connection test failed',
        });
        showToast(res.message || 'Connection test failed', 'error');
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      setTestResult({ success: false, message: msg });
      showToast(`Connection failed: ${msg}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleManualSync = async () => {
    if (!engine) {
      showToast('Sync engine is not initialized yet', 'warning');
      return;
    }
    setIsManualSyncing(true);
    try {
      const result = await engine.syncNow();
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast(`Sync error: ${err?.message || err}`, 'error');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleCopySchema = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
      showToast('Schema SQL copied to clipboard', 'info');
    } catch {}
  };

  const activeProvider = localConfig.activeProvider;

  return (
    <div className="flex flex-col gap-6 max-w-4xl pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Sync</h3>
          <p className="text-[11px] text-[#777]">
            Synchronize your notes bidirectionally across desktop and mobile devices using your own cloud database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleManualSync}
            disabled={isManualSyncing || telemetry.lastStatus === 'syncing'}
            icon={<RefreshIcon size={12} className={isManualSyncing || telemetry.lastStatus === 'syncing' ? 'animate-spin' : ''} />}
          >
            {isManualSyncing || telemetry.lastStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Sync Status Card */}
      <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
              telemetry.lastStatus === 'success'
                ? 'bg-[#14281f] border-[#065f46] text-[#34d399]'
                : telemetry.lastStatus === 'syncing'
                ? 'bg-[#292213] border-[#78350f] text-[#fbbf24]'
                : telemetry.lastStatus === 'error'
                ? 'bg-[#2b1616] border-[#7f1d1d] text-[#f87171]'
                : 'bg-[#242424] border-[#383838] text-[#888]'
            }`}
          >
            <CloudIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                {telemetry.lastStatus === 'success'
                  ? 'Connected & In Sync'
                  : telemetry.lastStatus === 'syncing'
                  ? 'Synchronizing...'
                  : telemetry.lastStatus === 'error'
                  ? 'Sync Error'
                  : 'Sync Idle'}
              </span>
              <span className="text-[10px] text-[#666] font-mono">
                {localConfig.activeProvider.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-[#777] mt-0.5">
              {telemetry.lastSyncedAt
                ? `Last synced: ${new Date(telemetry.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (${telemetry.syncedCount} items synced)`
                : 'Never synchronized yet'}
            </p>
            {telemetry.lastError && (
              <p className="text-[11px] text-red-400 mt-1 font-mono break-all max-w-xl">
                {telemetry.lastError}
              </p>
            )}
          </div>
        </div>

        {testResult && (
          <div
            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 shrink-0 ${
              testResult.success
                ? 'bg-[#14281f] border-[#065f46] text-[#34d399]'
                : 'bg-[#2b1616] border-[#7f1d1d] text-[#f87171]'
            }`}
          >
            {testResult.success ? <CheckIcon size={13} /> : <AlertCircleIcon size={13} />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Provider Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-[#dcddde] block">
          Select Sync Storage Provider
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { id: 'supabase', label: 'Supabase', desc: 'PostgreSQL Free Tier' },
            { id: 'turso', label: 'Turso', desc: 'LibSQL Serverless' },
            { id: 'cloudflare_d1', label: 'Cloudflare D1', desc: 'Serverless SQLite' },
            { id: 'custom_rest', label: 'Custom REST', desc: 'Self-Hosted API' },
          ].map((prov) => {
            const isSelected = activeProvider === prov.id;
            return (
              <button
                key={prov.id}
                type="button"
                onClick={() => updateConfig({ activeProvider: prov.id as SyncProviderType })}
                className={`p-3 rounded-xl text-left border cursor-pointer transition-none ${
                  isSelected
                    ? 'bg-[#242424] border-[var(--flint-accent,#ea580c)] shadow-sm'
                    : 'bg-[#1c1c1c] border-[#2a2a2a] hover:bg-[#202020] text-[#999]'
                }`}
              >
                <div className="text-xs font-semibold text-white">{prov.label}</div>
                <div className="text-[10px] text-[#777] mt-0.5">{prov.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider Credentials Settings */}
      {activeProvider === 'supabase' && (
        <SupabaseWizard
          projectUrl={localConfig.supabase.projectUrl}
          anonKey={localConfig.supabase.anonKey}
          onUpdateCredentials={(projectUrl, anonKey) => {
            updateConfig({
              supabase: {
                ...localConfig.supabase,
                projectUrl,
                anonKey,
              },
            });
          }}
          onTestConnection={handleTestConnection}
          isTesting={isTesting}
        />
      )}

      {activeProvider === 'turso' && (
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DatabaseIcon size={16} className="text-[#34d399]" />
              <span className="text-xs font-semibold text-white">Turso LibSQL Configuration</span>
            </div>
            <Button
              size="sm"
              onClick={() => handleCopySchema(new TursoProvider(localConfig.turso, 'wizard').getSchemaScript())}
              icon={copiedSchema ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            >
              {copiedSchema ? 'Copied' : 'Copy Table Schema SQL'}
            </Button>
          </div>

          <div className="space-y-3 bg-[#171717] p-3.5 rounded-lg border border-[#262626]">
            <div>
              <label className="block text-[11px] text-[#888] mb-1">Turso Database URL</label>
              <TextInput
                isMono
                value={localConfig.turso.databaseUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateConfig({
                    turso: { ...localConfig.turso, databaseUrl: e.target.value.trim() },
                  })
                }
                placeholder="libsql://[your-database]-[org].turso.io"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#888] mb-1">Turso Auth Token</label>
              <TextInput
                isMono
                type="password"
                value={localConfig.turso.authToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateConfig({
                    turso: { ...localConfig.turso, authToken: e.target.value.trim() },
                  })
                }
                placeholder="eyJhbGciOiJFZERTQ..."
                className="w-full"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href="https://turso.tech/app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--flint-accent,#ea580c)] hover:underline"
              >
                <span>Open Turso Dashboard</span>
                <ExternalLinkIcon size={11} />
              </a>
              <Button
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting || !localConfig.turso.databaseUrl || !localConfig.turso.authToken}
                icon={<RefreshIcon size={12} className={isTesting ? 'animate-spin' : ''} />}
              >
                {isTesting ? 'Testing...' : 'Verify Connection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeProvider === 'cloudflare_d1' && (
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DatabaseIcon size={16} className="text-[#fb923c]" />
              <span className="text-xs font-semibold text-white">Cloudflare D1 Configuration</span>
            </div>
            <Button
              size="sm"
              onClick={() => handleCopySchema(new CloudflareD1Provider(localConfig.cloudflareD1, 'wizard').getSchemaScript())}
              icon={copiedSchema ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            >
              {copiedSchema ? 'Copied' : 'Copy Table Schema SQL'}
            </Button>
          </div>

          <div className="space-y-3 bg-[#171717] p-3.5 rounded-lg border border-[#262626]">
            <div>
              <label className="block text-[11px] text-[#888] mb-1">Cloudflare Account ID</label>
              <TextInput
                isMono
                value={localConfig.cloudflareD1.accountId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateConfig({
                    cloudflareD1: { ...localConfig.cloudflareD1, accountId: e.target.value.trim() },
                  })
                }
                placeholder="4a9b..."
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#888] mb-1">D1 Database ID (UUID)</label>
              <TextInput
                isMono
                value={localConfig.cloudflareD1.databaseId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateConfig({
                    cloudflareD1: { ...localConfig.cloudflareD1, databaseId: e.target.value.trim() },
                  })
                }
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#888] mb-1">Cloudflare API Token (D1 Edit Permissions)</label>
              <TextInput
                isMono
                type="password"
                value={localConfig.cloudflareD1.apiToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateConfig({
                    cloudflareD1: { ...localConfig.cloudflareD1, apiToken: e.target.value.trim() },
                  })
                }
                placeholder="v1.0-..."
                className="w-full"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href="https://dash.cloudflare.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--flint-accent,#ea580c)] hover:underline"
              >
                <span>Open Cloudflare Dashboard</span>
                <ExternalLinkIcon size={11} />
              </a>
              <Button
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting || !localConfig.cloudflareD1.accountId || !localConfig.cloudflareD1.databaseId || !localConfig.cloudflareD1.apiToken}
                icon={<RefreshIcon size={12} className={isTesting ? 'animate-spin' : ''} />}
              >
                {isTesting ? 'Testing...' : 'Verify Connection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeProvider === 'custom_rest' && (
        <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <CloudIcon size={16} className="text-[#38bdf8]" />
            <span className="text-xs font-semibold text-white">Custom REST API Configuration</span>
          </div>

          <div className="space-y-3 bg-[#171717] p-3.5 rounded-lg border border-[#262626]">
            <div>
              <label className="block text-[11px] text-[#888] mb-1">REST Sync Endpoint URL</label>
              <TextInput
                isMono
                value={localConfig.customRest.endpointUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateConfig({
                    customRest: { ...localConfig.customRest, endpointUrl: e.target.value.trim() },
                  })
                }
                placeholder="https://sync.example.com/api/v1/sync"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#888] mb-1">Bearer Token (Optional)</label>
              <TextInput
                isMono
                type="password"
                value={localConfig.customRest.bearerToken || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateConfig({
                    customRest: { ...localConfig.customRest, bearerToken: e.target.value.trim() },
                  })
                }
                placeholder="secret-token-key"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#888] mb-1">Custom Headers (JSON Object)</label>
              <TextInput
                isMono
                value={localConfig.customRest.customHeadersJson || '{}'}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateConfig({
                    customRest: { ...localConfig.customRest, customHeadersJson: e.target.value },
                  })
                }
                placeholder='{"X-Custom-Auth": "secret"}'
                className="w-full"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting || !localConfig.customRest.endpointUrl}
                icon={<RefreshIcon size={12} className={isTesting ? 'animate-spin' : ''} />}
              >
                {isTesting ? 'Testing...' : 'Verify Connection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Behavior Preferences */}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Auto Sync on Save */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Auto-sync on save</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically synchronize deltas 2.5 seconds after editing or saving a note.
            </span>
          </div>
          <ToggleSwitch
            checked={localConfig.autoSyncOnSave}
            onChange={(checked) => updateConfig({ autoSyncOnSave: checked })}
          />
        </div>

        {/* Periodic Background Sync */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Periodic background sync</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Poll remote database periodically to pull changes made from other devices.
            </span>
          </div>
          <select
            value={localConfig.periodicIntervalSeconds}
            onChange={(e) => updateConfig({ periodicIntervalSeconds: Number(e.target.value) })}
            className="bg-[#181818] border border-[#333333] text-xs text-white rounded-[6px] px-3 py-1.5 cursor-pointer outline-none focus:border-[var(--flint-accent,#ea580c)]"
          >
            <option value={0}>Disabled</option>
            <option value={60}>Every 1 minute</option>
            <option value={300}>Every 5 minutes</option>
            <option value={900}>Every 15 minutes</option>
            <option value={1800}>Every 30 minutes</option>
          </select>
        </div>

        {/* Conflict Resolution Strategy */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Conflict resolution</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Determines how concurrent offline modifications across multiple devices are merged.
            </span>
          </div>
          <select
            value={localConfig.conflictStrategy}
            onChange={(e) => updateConfig({ conflictStrategy: e.target.value as ConflictStrategy })}
            className="bg-[#181818] border border-[#333333] text-xs text-white rounded-[6px] px-3 py-1.5 cursor-pointer outline-none focus:border-[var(--flint-accent,#ea580c)]"
          >
            <option value="last_write_wins">Last Write Wins (Recommended)</option>
            <option value="keep_both">Keep Both (Create [Conflict Copy])</option>
            <option value="local_wins">Local Device Wins</option>
            <option value="remote_wins">Remote Cloud Wins</option>
          </select>
        </div>

        {/* Device Identifier */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Device identifier</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Unique device tag used to prevent circular sync echoes.
            </span>
          </div>
          <span className="font-mono text-xs text-[#888] bg-[#171717] px-2.5 py-1 rounded border border-[#2b2b2b] select-all">
            {localConfig.deviceId}
          </span>
        </div>
      </div>
    </div>
  );
};
