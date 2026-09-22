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
  Delete02Icon,
  GlobeIcon,
  FileImageIcon,
} from '@/components/common/Icons';
import { searchWallhaven, WallhavenWallpaper } from './wallhavenService';
import { COVER_PRESETS, PRESET_CATEGORIES, CoverPreset } from './presets';
import {
  initPresetCache,
  getPresetUrl,
  getPresetThumbUrl,
  downloadAllPresets,
  getCachedPresetCount,
} from './presetCache';
import { useCoversSettings } from './coversSettings';
import { NoetherApp } from '@/core/app/NoetherApp';
import { useVaultDocuments, isImageFileName } from 'noether';
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

const VaultImageThumbnailCard: React.FC<{
  doc: DocumentItem;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ doc, isSelected, onToggle }) => {
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
      onClick={onToggle}
      className={`group relative h-28 rounded-lg overflow-hidden border cursor-pointer bg-[var(--noether-bg-card,#222)] transition-none ${
        isSelected
          ? 'border-[var(--noether-accent,#eb584d)]'
          : 'border-[var(--noether-border-subtle)] hover:border-[var(--noether-border-strong)]'
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
        <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--noether-bg-input)] text-[var(--noether-text-muted)]">
          <FileImageIcon size={20} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-2">
        <span className="text-[11px] text-white font-medium truncate drop-shadow-sm">
          {doc.title}
        </span>
      </div>
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

  useEffect(() => {
    if (isOpen && activeTab === 'presets') {
      initPresetCache().then(() => {
        if (getCachedPresetCount() < COVER_PRESETS.length) {
          downloadAllPresets(COVER_PRESETS).catch(() => {});
        }
      });
    }
  }, [isOpen, activeTab]);

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
    return allVaultDocuments.filter((d) => {
      if (d.is_folder) return false;
      if (d.doc_type === 'image') return true;
      return isImageFileName(d.title);
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

  // Debounced automatic Wallhaven search
  useEffect(() => {
    if (!isOpen || activeTab !== 'wallhaven') return;
    const q = searchQuery.trim();
    if (!q) return;

    const timer = setTimeout(() => {
      fetchWallhaven(q);
    }, 350);

    return () => clearTimeout(timer);
  }, [isOpen, activeTab, searchQuery, fetchWallhaven]);

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

  const TABS: { id: PickerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'wallhaven', label: 'Wallhaven', icon: <GlobeIcon size={14} /> },
    { id: 'presets', label: 'Presets', icon: <SparklesIcon size={14} /> },
    { id: 'vault', label: 'Vault images', icon: <Folder01Icon size={14} /> },
    { id: 'link', label: 'Custom link', icon: <LinkSquare02Icon size={14} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none font-sans"
      onClick={onClose}
    >
      <div
        data-card="true"
        className="relative w-full max-w-[800px] h-[520px] bg-[var(--noether-bg-popover,var(--noether-bg-card))] border border-[var(--noether-border-subtle,#2b2b2b)] rounded-xl shadow-2xl overflow-hidden flex flex-row text-xs text-[var(--noether-text-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Close Button with consistent 14px top and right margins */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-30 w-7 h-7 rounded-md hover:bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] flex items-center justify-center cursor-pointer transition-none"
          title="Close (Esc)"
        >
          <Cancel01Icon size={14} />
        </button>

        {/* LEFT PANE: Sources Sidebar */}
        <div className="w-[200px] bg-[var(--noether-bg-sidebar,#141414)] border-r border-[var(--noether-border-subtle,#242424)] flex flex-col p-2.5 pt-3.5 shrink-0 overflow-hidden">
          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs cursor-pointer text-left transition-none ${
                    isActive
                      ? 'bg-[var(--noether-bg-sidebar-active,#242424)] text-[var(--noether-text-primary)] shadow-xs'
                      : 'text-[var(--noether-text-muted)] hover:bg-[var(--noether-bg-sidebar-hover,#1f1f1f)] hover:text-[var(--noether-text-primary)]'
                  }`}
                >
                  <span className={isActive ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted)]'}>
                    {tab.icon}
                  </span>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Action: Remove cover (centered) */}
          {currentUrl && onRemove && (
            <div className="pt-2 border-t border-[var(--noether-border-subtle,#242424)]">
              <button
                type="button"
                onClick={() => {
                  onRemove();
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/15 active:bg-rose-500/25 cursor-pointer text-center transition-none"
              >
                <Delete02Icon size={13} />
                <span>Remove cover</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Main Content Canvas */}
        <div className="flex-1 bg-[var(--noether-bg-main,#181818)] flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Header Bar: shifted down with h-14, centered vertically with the close button, with pr-14 buffer */}
          <div className="h-14 px-4 pr-14 border-b border-[var(--noether-border-subtle,#242424)] flex items-center justify-between gap-3 shrink-0">
            {/* Header Content per Active Tab */}
            <div className="flex-1 min-w-0 flex items-center">
              {activeTab === 'wallhaven' && (
                <div className="relative w-full flex items-center bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] focus-within:border-[var(--noether-border-strong)] rounded-md px-2.5 h-7 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
                  <Search01Icon size={13} className="text-[var(--noether-text-muted)] shrink-0 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        fetchWallhaven(searchQuery.trim());
                      }
                    }}
                    placeholder="Search Wallhaven wallpapers..."
                    className="bg-transparent border-none outline-none flex-1 text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer p-0.5 ml-1 transition-none"
                      title="Clear search"
                    >
                      <Cancel01Icon size={11} />
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'presets' && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {PRESET_CATEGORIES.map((cat) => {
                    const isSelected = presetCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPresetCategory(cat)}
                        className={`text-[11px] px-2.5 py-1 rounded-md cursor-pointer border transition-none shrink-0 ${
                          isSelected
                            ? 'bg-[var(--noether-bg-sidebar-active)] text-[var(--noether-text-primary)] border-[var(--noether-border-strong)] font-normal shadow-xs'
                            : 'bg-[var(--noether-bg-card)] text-[var(--noether-text-muted)] border-[var(--noether-border-subtle)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-btn-hover-bg)]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === 'vault' && (
                <span className="font-normal text-xs text-[var(--noether-text-primary)]">
                  Attachments in current vault
                </span>
              )}

              {activeTab === 'link' && (
                <span className="font-normal text-xs text-[var(--noether-text-primary)]">
                  Direct image link
                </span>
              )}
            </div>
          </div>

          {/* TAB 1: WALLHAVEN */}
          {activeTab === 'wallhaven' && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Error Notification */}
              {wallhavenError && (
                <div className="m-4 mb-0 p-3 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center justify-between shrink-0">
                  <span>{wallhavenError}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('presets')}
                    className="underline text-[11px] text-amber-200 hover:text-white cursor-pointer ml-2"
                  >
                    Use presets
                  </button>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--noether-text-muted)] gap-2">
                  <div className="w-5 h-5 border-2 border-[var(--noether-text-muted)] border-t-[var(--noether-text-primary)] rounded-full animate-spin" />
                  <span className="text-xs">Connecting to Wallhaven...</span>
                </div>
              )}

              {/* Wallpapers Grid */}
              {!isLoading && (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {wallpapers.map((wp) => {
                      const isSelected = currentUrl === wp.path;
                      return (
                        <div
                          key={wp.id}
                          onClick={() => {
                            if (isSelected) {
                              onRemove?.();
                            } else {
                              handleSelectCover(wp.path);
                            }
                          }}
                          className={`group relative h-28 rounded-lg overflow-hidden border cursor-pointer bg-[var(--noether-bg-card,#222)] transition-none ${
                            isSelected
                              ? 'border-[var(--noether-accent,#eb584d)]'
                              : 'border-[var(--noether-border-subtle)] hover:border-[var(--noether-border-strong)]'
                          }`}
                        >
                          <img
                            src={wp.thumbSmall}
                            alt="Wallpaper thumbnail"
                            loading="lazy"
                            className="w-full h-full object-cover select-none"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 flex items-end p-2 transition-none">
                            <span className="text-[10px] text-white/90 truncate font-medium bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded">
                              {wp.resolution}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OFFLINE PRESETS */}
          {activeTab === 'presets' && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredPresets.map((p) => {
                    const displayUrl = getPresetUrl(p);
                    const thumbUrl = getPresetThumbUrl(p);
                    const isSelected = currentUrl === p.url || currentUrl === displayUrl;

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (isSelected) {
                            onRemove?.();
                          } else {
                            handleSelectCover(p.url);
                          }
                        }}
                        className={`group relative h-28 rounded-lg overflow-hidden border cursor-pointer bg-[var(--noether-bg-card,#222)] transition-none ${
                          isSelected
                            ? 'border-[var(--noether-accent,#eb584d)]'
                            : 'border-[var(--noether-border-subtle)] hover:border-[var(--noether-border-strong)]'
                        }`}
                      >
                        <img
                          src={thumbUrl}
                          alt={p.name}
                          className="w-full h-full object-cover select-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex items-end p-2">
                          <span className="text-[11px] text-white font-medium truncate drop-shadow-sm">
                            {p.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VAULT IMAGES */}
          {activeTab === 'vault' && (
            <div className="flex flex-col flex-1 min-h-0">
              {vaultImages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-[var(--noether-text-muted)] gap-2 text-center">
                  <Folder01Icon size={32} className="opacity-40 mb-1" />
                  <span className="text-xs font-medium text-[var(--noether-text-secondary)]">No image attachments found in your vault</span>
                  <span className="text-[11px] text-[var(--noether-text-muted)] max-w-xs">
                    Images saved or linked in notes will appear here automatically.
                  </span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {vaultImages.map((doc) => {
                      const isSelected = currentUrl === doc.title;
                      return (
                        <VaultImageThumbnailCard
                          key={doc.id}
                          doc={doc}
                          isSelected={isSelected}
                          onToggle={() => {
                            if (isSelected) {
                              onRemove?.();
                            } else {
                              handleSelectCover(doc.title);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CUSTOM LINK */}
          {activeTab === 'link' && (
            <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar">
              <div className="w-full max-w-[460px] flex flex-col gap-4">
                {/* Input Card */}
                <div className="bg-[var(--noether-bg-card,#202020)] border border-[var(--noether-border-subtle,#2c2c2c)] rounded-xl p-4 shadow-xs flex flex-col gap-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[var(--noether-text-muted)]">
                      Paste any HTTP, HTTPS, or Data URI image address to set as note cover.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customLinkInput}
                      onChange={(e) => setCustomLinkInput(e.target.value)}
                      placeholder="https://example.com/wallpaper.jpg"
                      className="flex-1 bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] focus:border-[var(--noether-border-strong)] rounded-md px-2.5 py-1.5 text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)] outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                    />
                    <button
                      type="button"
                      disabled={!customLinkInput.trim()}
                      onClick={() => {
                        const trimmed = customLinkInput.trim();
                        if (trimmed) {
                          if (currentUrl === trimmed) {
                            onRemove?.();
                          } else {
                            handleSelectCover(trimmed);
                          }
                        }
                      }}
                      className="noether-btn noether-btn-primary shrink-0 text-xs !py-1.5 !px-3.5"
                    >
                      {currentUrl === customLinkInput.trim() ? 'Remove' : 'Apply'}
                    </button>
                  </div>
                </div>

                {/* Live Preview Card */}
                {customLinkInput.trim() && (
                  <div className="bg-[var(--noether-bg-card,#202020)] border border-[var(--noether-border-subtle,#2c2c2c)] rounded-xl p-3 shadow-xs flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--noether-text-muted)]">
                      Preview
                    </span>
                    <div className="w-full h-36 rounded-lg overflow-hidden border border-[var(--noether-border-subtle)] bg-[var(--noether-bg-main)]">
                      <img
                        src={customLinkInput.trim()}
                        alt="Cover preview"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
