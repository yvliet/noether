/**
 * @module CoverPickerModal
 * @description
 * High-performance modal dialog for discovering, searching, and selecting note cover banners.
 * Supports Wallhaven online wallpaper queries, built-in offline presets, local vault attachments,
 * and custom image links.
 *
 * @since 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search01Icon,
  Cancel01Icon,
  LinkSquare02Icon,
  Folder01Icon,
  SparklesIcon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  RotateCcwIcon,
  GlobeIcon,
  FileImageIcon,
  Download01Icon,
} from '@/components/common/Icons';
import { searchWallhaven, WallhavenWallpaper } from './wallhavenService';
import { COVER_PRESETS, PRESET_CATEGORIES, CoverPreset } from './presets';
import {
  initPresetCache,
  isPresetCached,
  getPresetUrl,
  getPresetThumbUrl,
  downloadAllPresets,
  getCachedPresetCount,
} from './presetCache';
import { useCoversSettings } from './coversSettings';
import { NoetherApp } from '@/core/app/NoetherApp';
import { useVaultDocuments } from 'noether';
import { preloadCoverImage } from './coverPreloader';
import { getCachedImageSrc, resolveImageSrcAsync } from '@/components/editor/embed-renderer';
import { DocumentItem } from '@/types';

export interface CoverPickerModalProps {
  isOpen: boolean;
  currentUrl?: string;
  onSelect: (url: string) => void;
  onRemove?: () => void;
  onClose: () => void;
  app: NoetherApp;
}

type PickerTab = 'wallhaven' | 'presets' | 'vault' | 'link';

const POPULAR_TAGS = ['Pixel Art', 'Nature', 'Anime', 'Cyberpunk', 'City', 'Space', 'Minimalist'];

const VaultImageThumbnailCard: React.FC<{
  doc: DocumentItem;
  isSelected: boolean;
  onSelect: (target: string) => void;
}> = ({ doc, isSelected, onSelect }) => {
  const [src, setSrc] = useState<string | null>(() => getCachedImageSrc(doc.title, doc.id));

  useEffect(() => {
    if (src) return;
    let isMounted = true;
    resolveImageSrcAsync(doc.title, doc.id).then((resolved) => {
      if (isMounted && resolved) {
        setSrc(resolved);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [doc.title, doc.id, src]);

  return (
    <div
      onClick={() => onSelect(doc.title)}
      className={`group relative h-28 rounded-lg overflow-hidden border cursor-pointer bg-[#121212] ${
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
          : 'border-[#2a2a2a] hover:border-[#555]'
      }`}
    >
      {src ? (
        <img
          src={src}
          alt={doc.title}
          loading="lazy"
          className="w-full h-full object-cover select-none"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#181818] text-[#666]">
          <FileImageIcon size={20} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
        <span className="text-[11px] text-white font-medium truncate">
          {doc.title}
        </span>
      </div>
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
          <CheckmarkCircle02Icon size={12} />
        </div>
      )}
    </div>
  );
};

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  isOpen,
  currentUrl,
  onSelect,
  onRemove,
  onClose,
  app,
}) => {
  const [activeTab, setActiveTab] = useState<PickerTab>('wallhaven');
  const [searchQuery, setSearchQuery] = useState('pixel art');
  const [wallpapers, setWallpapers] = useState<WallhavenWallpaper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wallhavenError, setWallhavenError] = useState<string | null>(null);

  const [presetCategory, setPresetCategory] = useState<string>('All');
  const [customLinkInput, setCustomLinkInput] = useState('');
  const [cachedCount, setCachedCount] = useState<number>(() => getCachedPresetCount());
  const [isDownloadingPresets, setIsDownloadingPresets] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'presets') {
      initPresetCache().then(() => {
        setCachedCount(getCachedPresetCount());
      });
    }
  }, [isOpen, activeTab]);

  const handleDownloadAllPresets = useCallback(async () => {
    setIsDownloadingPresets(true);
    await downloadAllPresets(COVER_PRESETS);
    setCachedCount(getCachedPresetCount());
    setIsDownloadingPresets(false);
  }, []);

  const handleSelectCover = useCallback(
    (url: string) => {
      preloadCoverImage(url);
      onSelect(url);
    },
    [onSelect]
  );

  const { wallhavenApiKey } = useCoversSettings();
  const allVaultDocuments = useVaultDocuments();

  // Filter vault documents for image attachments
  const vaultImages = useMemo(() => {
    const IMAGE_REGEX = /\.(png|jpe?g|gif|svg|webp|bmp|ico|avif)$/i;
    return allVaultDocuments.filter((d) => {
      if (d.is_folder) return false;
      if (d.doc_type === 'image') return true;
      return IMAGE_REGEX.test(d.title);
    });
  }, [allVaultDocuments]);

  // Execute Wallhaven Search
  const fetchWallhaven = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setWallhavenError(null);
      const res = await searchWallhaven(query, 1, wallhavenApiKey);
      setIsLoading(false);
      if (res.success) {
        setWallpapers(res.data);
      } else {
        setWallhavenError(res.error || 'Failed to load Wallhaven wallpapers.');
      }
    },
    [wallhavenApiKey]
  );

  // Initial load for Wallhaven
  useEffect(() => {
    if (isOpen && activeTab === 'wallhaven' && wallpapers.length === 0) {
      fetchWallhaven('pixel art');
    }
  }, [isOpen, activeTab, wallpapers.length, fetchWallhaven]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPresets =
    presetCategory === 'All'
      ? COVER_PRESETS
      : COVER_PRESETS.filter((p) => p.category === presetCategory);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[var(--noether-bg-main,#181818)] border border-[var(--noether-border,#2e2e2e)] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--noether-border,#2a2a2a)] bg-[var(--noether-bg-card,#1a1a1a)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500/15 text-emerald-400">
              <FileImageIcon size={14} />
            </div>
            <div>
              <h2 className="text-[13px] font-semibold text-[var(--noether-text-primary,#dcddde)] leading-none">
                Note Cover Image
              </h2>
              <p className="text-[11px] text-[#888] mt-0.5 leading-none">
                Browse Wallhaven, select offline presets, or choose from your vault
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1 rounded text-[#777] hover:text-[#dcddde] hover:bg-[#252525] cursor-pointer"
          >
            <Cancel01Icon size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--noether-border,#2a2a2a)] bg-[var(--noether-bg-main,#161616)] text-[12px]">
          <button
            type="button"
            onClick={() => setActiveTab('wallhaven')}
            className={`px-3 py-1 rounded cursor-pointer font-medium flex items-center gap-1.5 ${
              activeTab === 'wallhaven'
                ? 'bg-[#282828] text-white shadow-sm'
                : 'text-[#888] hover:text-[#bbb] hover:bg-[#202020]'
            }`}
          >
            <GlobeIcon size={13} />
            <span>Wallhaven</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1 rounded cursor-pointer font-medium flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-[#282828] text-white shadow-sm'
                : 'text-[#888] hover:text-[#bbb] hover:bg-[#202020]'
            }`}
          >
            <SparklesIcon size={13} />
            <span>Offline Presets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vault')}
            className={`px-3 py-1 rounded cursor-pointer font-medium flex items-center gap-1.5 ${
              activeTab === 'vault'
                ? 'bg-[#282828] text-white shadow-sm'
                : 'text-[#888] hover:text-[#bbb] hover:bg-[#202020]'
            }`}
          >
            <Folder01Icon size={13} />
            <span>Vault Images ({vaultImages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-3 py-1 rounded cursor-pointer font-medium flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'bg-[#282828] text-white shadow-sm'
                : 'text-[#888] hover:text-[#bbb] hover:bg-[#202020]'
            }`}
          >
            <LinkSquare02Icon size={13} />
            <span>Custom Link</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-[300px]">
          {/* TAB 1: WALLHAVEN */}
          {activeTab === 'wallhaven' && (
            <div className="flex flex-col gap-3">
              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none">
                    <Search01Icon size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        fetchWallhaven(searchQuery);
                      }
                    }}
                    placeholder="Search Wallhaven (e.g. pixel art, nature, retro)..."
                    className="w-full bg-[#1e1e1e] border border-[#333] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-[#dcddde] placeholder-[#666] outline-none focus:border-emerald-500/70"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchWallhaven(searchQuery)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-md bg-[#252525] hover:bg-[#303030] text-[12px] text-[#dcddde] border border-[#383838] cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Search01Icon size={13} />
                  <span>Search</span>
                </button>
              </div>

              {/* Quick Filter Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#666] mr-1">Tags:</span>
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearchQuery(tag);
                      fetchWallhaven(tag);
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded cursor-pointer border ${
                      searchQuery.toLowerCase() === tag.toLowerCase()
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-[#202020] text-[#999] border-[#2e2e2e] hover:text-white hover:bg-[#282828]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Error Notification */}
              {wallhavenError && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[12px] flex items-center justify-between">
                  <span>{wallhavenError}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('presets')}
                    className="underline text-[11px] text-amber-200 hover:text-white cursor-pointer ml-2"
                  >
                    Use Offline Presets
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-[#777] gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[12px]">Connecting to Wallhaven...</span>
                </div>
              )}

              {/* Wallpapers Grid */}
              {!isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {wallpapers.map((wp) => {
                    const isSelected = currentUrl === wp.path;
                    return (
                      <div
                        key={wp.id}
                        onClick={() => {
                          handleSelectCover(wp.path);
                          onClose();
                        }}
                        className={`group relative h-28 rounded-lg overflow-hidden border cursor-pointer bg-[#121212] ${
                          isSelected
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-[#2a2a2a] hover:border-[#555]'
                        }`}
                      >
                        <img
                          src={wp.thumbSmall}
                          alt="Wallpaper thumbnail"
                          loading="lazy"
                          className="w-full h-full object-cover select-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 flex items-end p-2">
                          <span className="text-[10px] text-white/90 truncate font-mono">
                            {wp.resolution}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                            <CheckmarkCircle02Icon size={12} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OFFLINE PRESETS */}
          {activeTab === 'presets' && (
            <div className="flex flex-col gap-3">
              {/* Category Filter Pills */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPresetCategory(cat)}
                      className={`text-[11px] px-2.5 py-1 rounded cursor-pointer border ${
                        presetCategory === cat
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium'
                          : 'bg-[#202020] text-[#999] border-[#2e2e2e] hover:text-white hover:bg-[#282828]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {cachedCount < COVER_PRESETS.length && (
                  <button
                    type="button"
                    onClick={handleDownloadAllPresets}
                    disabled={isDownloadingPresets}
                    className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#303030] text-[11px] text-[#dcddde] border border-[#383838] cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Download presets for offline use"
                  >
                    {isDownloadingPresets ? (
                      <>
                        <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        <span>Downloading ({cachedCount}/{COVER_PRESETS.length})...</span>
                      </>
                    ) : (
                      <>
                        <Download01Icon size={12} className="text-emerald-400" />
                        <span>Download offline ({cachedCount}/{COVER_PRESETS.length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredPresets.map((p) => {
                  const displayUrl = getPresetUrl(p);
                  const thumbUrl = getPresetThumbUrl(p);
                  const isSelected = currentUrl === p.url || currentUrl === displayUrl;
                  const cached = isPresetCached(p.id);

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        handleSelectCover(p.url);
                        onClose();
                      }}
                      className={`group relative h-28 rounded-lg overflow-hidden border cursor-pointer bg-[#121212] ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'border-[#2a2a2a] hover:border-[#555]'
                      }`}
                    >
                      <img
                        src={thumbUrl}
                        alt={p.name}
                        className="w-full h-full object-cover select-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 justify-between">
                        <span className="text-[11px] text-white font-medium truncate">
                          {p.name}
                        </span>
                        {cached && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/70 text-emerald-400 font-mono shrink-0 ml-1 border border-emerald-500/30">
                            Offline
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                          <CheckmarkCircle02Icon size={12} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: VAULT IMAGES */}
          {activeTab === 'vault' && (
            <div className="flex flex-col gap-3">
              {vaultImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#777] gap-2">
                  <Folder01Icon size={24} className="opacity-40" />
                  <span className="text-[12px]">No image attachments found in your vault.</span>
                  <span className="text-[11px] text-[#555]">
                    Drop images into notes or use Wallhaven / Presets instead.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {vaultImages.map((doc) => (
                    <VaultImageThumbnailCard
                      key={doc.id}
                      doc={doc}
                      isSelected={currentUrl === doc.title}
                      onSelect={(target) => {
                        handleSelectCover(target);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CUSTOM LINK */}
          {activeTab === 'link' && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-[#aaa] font-medium">
                  Direct Image URL (HTTP / HTTPS / Data URI)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customLinkInput}
                    onChange={(e) => setCustomLinkInput(e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                    className="flex-1 bg-[#1e1e1e] border border-[#333] rounded-md px-3 py-1.5 text-[12px] text-[#dcddde] placeholder-[#666] outline-none focus:border-emerald-500/70"
                  />
                  <button
                    type="button"
                    disabled={!customLinkInput.trim()}
                    onClick={() => {
                      if (customLinkInput.trim()) {
                        handleSelectCover(customLinkInput.trim());
                        onClose();
                      }
                    }}
                    className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-[12px] text-white font-medium cursor-pointer"
                  >
                    Apply Cover
                  </button>
                </div>
              </div>

              {/* Live Image Preview */}
              {customLinkInput.trim() && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-[#666]">Preview:</span>
                  <div className="w-full h-36 rounded-lg overflow-hidden border border-[#333] bg-[#121212]">
                    <img
                      src={customLinkInput.trim()}
                      alt="Cover Preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--noether-border,#2a2a2a)] bg-[var(--noether-bg-card,#1a1a1a)]">
          <div>
            {currentUrl && onRemove && (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
                className="px-2.5 py-1 rounded text-[12px] text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer flex items-center gap-1.5"
              >
                <Delete02Icon size={13} />
                <span>Remove Cover</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded text-[12px] text-[#888] hover:text-[#dcddde] hover:bg-[#252525] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
