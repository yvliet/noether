/**
 * @module CoversSettingsTab
 * @description
 * Settings panel for the Covers extension.
 * Provides configuration for banner dimensions, top-to-bottom fading,
 * hover controls, and Wallhaven integration.
 *
 * @since 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useCoversSettings } from './coversSettings';
import { useToast } from 'noether';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon, Download01Icon, Delete02Icon } from '@/components/common/Icons';
import { COVER_PRESETS } from './presets';
import {
  initPresetCache,
  downloadAllPresets,
  clearPresetCache,
  getCachedPresetCount,
} from './presetCache';

export const CoversSettingsTab: React.FC = () => {
  const {
    bannerHeight,
    setBannerHeight,
    fadeEffect,
    setFadeEffect,
    showControlsOnHover,
    setShowControlsOnHover,
    wallhavenApiKey,
    setWallhavenApiKey,
    restoreDefaults,
  } = useCoversSettings();

  const showToast = useToast();

  const [cachedCount, setCachedCount] = useState<number>(() => getCachedPresetCount());
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    initPresetCache().then(() => {
      setCachedCount(getCachedPresetCount());
    });
  }, []);

  const handleDownloadAll = useCallback(async () => {
    setIsDownloading(true);
    const res = await downloadAllPresets(COVER_PRESETS);
    setCachedCount(getCachedPresetCount());
    setIsDownloading(false);
    if (res.failedCount === 0) {
      showToast(`Downloaded all ${COVER_PRESETS.length} presets for offline use`, 'success');
    } else {
      showToast(`Downloaded ${res.successCount} presets (${res.failedCount} failed)`, 'info');
    }
  }, [showToast]);

  const handleClearCache = useCallback(async () => {
    await clearPresetCache();
    setCachedCount(0);
    showToast('Cleared offline preset cache', 'info');
  }, [showToast]);

  const isModified =
    bannerHeight !== 270 ||
    fadeEffect !== true ||
    showControlsOnHover !== true ||
    wallhavenApiKey !== '';

  return (
    <div className="flex flex-col gap-2.5">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-[var(--noether-text-primary)] mb-0.5">Banner Display & Wallhaven</h3>
          <p className="text-[11px] text-[var(--noether-text-muted)] leading-relaxed">
            Configure note cover banners, top-to-bottom fade effects, and Wallhaven search integration.
          </p>
        </div>
        {isModified && (
          <button
            type="button"
            onClick={() => {
              restoreDefaults();
              showToast('Restored covers defaults', 'info');
            }}
            className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      {/* Main Options Group */}
      <div className="bg-[var(--noether-bg-card)] border border-[var(--noether-border-base)] rounded-xl overflow-hidden divide-y divide-[var(--noether-border-subtle)]">
        {/* Banner Height */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-xs font-medium text-[var(--noether-text-primary)]">Banner height</span>
            <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5">
              Default height of note cover images in pixels (160px - 450px).
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <input
              type="range"
              min={160}
              max={450}
              step={10}
              value={bannerHeight}
              onChange={(e) => setBannerHeight(Number(e.target.value))}
              className="w-28 accent-[var(--noether-accent,#eb584d)] cursor-pointer"
            />
            <span className="text-xs text-[var(--noether-text-muted)] w-12 text-right">
              {bannerHeight}px
            </span>
          </div>
        </div>

        {/* Top-to-Down Fade */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-xs font-medium text-[var(--noether-text-primary)]">Top-to-down fade</span>
            <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5">
              Smoothly fade the cover image into the note background color toward the bottom.
            </span>
          </div>
          <ToggleSwitch checked={fadeEffect} onChange={setFadeEffect} />
        </div>

        {/* Hover Controls */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-xs font-medium text-[var(--noether-text-primary)]">Show controls on hover</span>
            <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5">
              Display quick actions (Change cover, Reposition, Remove) when hovering over the banner.
            </span>
          </div>
          <ToggleSwitch checked={showControlsOnHover} onChange={setShowControlsOnHover} />
        </div>

        {/* Wallhaven API Key */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-xs font-medium text-[var(--noether-text-primary)]">Wallhaven API key (Optional)</span>
            <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5">
              Leave blank to use Wallhaven's free public SFW search, or provide an API key for custom collections.
            </span>
          </div>
          <div className="w-52">
            <input
              type="password"
              value={wallhavenApiKey}
              onChange={(e) => setWallhavenApiKey(e.target.value)}
              placeholder="Paste API key..."
              className="w-full bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] rounded px-2.5 py-1 text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)] outline-none focus:border-[var(--noether-border-strong)]"
            />
          </div>
        </div>

        {/* Offline Presets Setup */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-xs font-medium text-[var(--noether-text-primary)]">Offline presets</span>
            <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5">
              {cachedCount === COVER_PRESETS.length
                ? `All ${COVER_PRESETS.length} presets cached for offline use.`
                : `${cachedCount} of ${COVER_PRESETS.length} presets downloaded.`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {cachedCount < COVER_PRESETS.length && (
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isDownloading}
                className="noether-btn text-xs !py-1 !px-2.5 flex items-center gap-1.5 cursor-pointer"
              >
                {isDownloading ? (
                  <>
                    <div className="w-3 h-3 border border-[var(--noether-text-primary)] border-t-transparent rounded-full animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download01Icon size={12} className="text-[var(--noether-text-muted)]" />
                    <span>Download presets</span>
                  </>
                )}
              </button>
            )}
            {cachedCount > 0 && (
              <button
                type="button"
                onClick={handleClearCache}
                disabled={isDownloading}
                className="noether-btn text-xs !py-1 !px-2.5 flex items-center gap-1 cursor-pointer"
                title="Clear local preset cache"
              >
                <Delete02Icon size={12} />
                <span>Clear cache</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
