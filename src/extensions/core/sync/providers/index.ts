/**
 * @module ProvidersIndex
 * @description
 * Factory and provider exports for Flint Universal Sync.
 */

import { BaseProvider } from './BaseProvider';
import { SupabaseProvider } from './SupabaseProvider';
import { TursoProvider } from './TursoProvider';
import { CloudflareD1Provider } from './CloudflareD1Provider';
import { CustomRestProvider } from './CustomRestProvider';
import { SyncConfig } from '../types';

export {
  BaseProvider,
  SupabaseProvider,
  TursoProvider,
  CloudflareD1Provider,
  CustomRestProvider,
};

export function createProvider(config: SyncConfig): BaseProvider {
  switch (config.activeProvider) {
    case 'supabase':
      return new SupabaseProvider(config.supabase, config.deviceId);
    case 'turso':
      return new TursoProvider(config.turso, config.deviceId);
    case 'cloudflare_d1':
      return new CloudflareD1Provider(config.cloudflareD1, config.deviceId);
    case 'custom_rest':
      return new CustomRestProvider(config.customRest, config.deviceId);
    default:
      return new SupabaseProvider(config.supabase, config.deviceId);
  }
}
