/**
 * @module useAutoUpdater
 * @description
 * React hook orchestrating automatic and manual update lifecycle checks against GitHub Releases.
 * Enforces user preferences for automatic background checks and early-access prereleases.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  type AppRelease,
  type UpdateCheckResult,
  checkForUpdates,
  STORAGE_LAST_CHECK_KEY,
} from '@/lib/updater/updateChecker';

// Auto-check cooldown: 4 hours
const AUTO_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export function useAutoUpdater() {
  const autoUpdates = useSettingsStore((s) => s.autoUpdates);
  const earlyAccess = useSettingsStore((s) => s.earlyAccess);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const setIsUpdateModalOpen = useWorkspaceStore((s) => s.setIsUpdateModalOpen);

  const [isChecking, setIsChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestRelease, setLatestRelease] = useState<AppRelease | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasCheckedInitialRef = useRef(false);

  const check = useCallback(
    async (options: { manual?: boolean } = {}): Promise<UpdateCheckResult> => {
      setIsChecking(true);
      setError(null);

      try {
        const result = await checkForUpdates({ earlyAccess });
        setHasUpdate(result.hasUpdate);
        setLatestRelease(result.release);
        setError(result.error || null);

        if (result.hasUpdate && result.release) {
          if (options.manual) {
            setIsUpdateModalOpen(true, result.release);
          } else {
            showToast(`Flint v${result.release.version} is available! Click to update.`, 'info');
          }
        } else if (options.manual) {
          if (result.error) {
            showToast(`Could not check for updates: ${result.error}`, 'warning');
          } else {
            showToast(`Flint is up to date (v${result.currentVersion} is the latest version)`, 'info');
          }
        }

        return result;
      } catch (err: any) {
        const msg = err?.message || String(err);
        setError(msg);
        if (options.manual) {
          showToast(`Update check failed: ${msg}`, 'warning');
        }
        return {
          hasUpdate: false,
          currentVersion: '',
          latestVersion: '',
          release: null,
          checkedAt: Date.now(),
          error: msg,
        };
      } finally {
        setIsChecking(false);
      }
    },
    [earlyAccess, setIsUpdateModalOpen, showToast]
  );

  // Background auto-update check on application launch
  useEffect(() => {
    if (!autoUpdates || hasCheckedInitialRef.current) return;
    hasCheckedInitialRef.current = true;

    // Check if cooldown has elapsed
    try {
      const lastCheck = localStorage.getItem(STORAGE_LAST_CHECK_KEY);
      if (lastCheck) {
        const elapsed = Date.now() - parseInt(lastCheck, 10);
        if (elapsed < AUTO_CHECK_INTERVAL_MS) {
          return;
        }
      }
    } catch {}

    // Run background check with 3-second gentle delay after application boot
    const timer = setTimeout(() => {
      check({ manual: false });
    }, 3000);

    return () => clearTimeout(timer);
  }, [autoUpdates, check]);

  return {
    isChecking,
    hasUpdate,
    latestRelease,
    error,
    checkForUpdatesNow: () => check({ manual: true }),
  };
}
