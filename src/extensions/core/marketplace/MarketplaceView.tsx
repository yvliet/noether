import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNoetherApp, useExtensionList } from '@/core/app/AppContext';
import { useNoetherStore } from 'noether';
import { CustomSelect } from '@/components/common/CustomSelect';
import {
  Search01Icon,
  Download01Icon,
  CheckIcon,
  Cancel01Icon,
  BookOpen01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  Store01Icon,
  Folder01Icon,
  StickyNote02Icon,
  Brain02Icon,
  Tag01Icon,
} from '@/components/common/Icons';
import { DocOptionsMenu } from '@/components/editor/DocOptionsMenu';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { RotateCcwIcon } from '@/components/common/Icons';
import { platform } from '@/lib/platform/platformAdapter';
import type { ExtensionManifest } from '@/core/extensions/types';
import {
  COMMUNITY_MARKETPLACE_CATALOGUE,
  MarketplaceExtensionItem,
} from './marketplaceCatalogue';
import { useMarketplaceQuery, getRegistryUrl } from './useMarketplaceQuery';
import { fetchTursoPluginBundle } from './tursoClient';
import { installMarketplaceExtension } from './extensionInstaller';
import { compareSemVer } from '@/core/extensions/ExtensionUpdateManager';

// Re-export catalogue and models for consumers
export {
  COMMUNITY_MARKETPLACE_CATALOGUE,
  type MarketplaceExtensionItem,
};

export const MarketplaceView: React.FC = () => {
  const app = useNoetherApp();
  const extensionList = useExtensionList();

  const canGoBack = useNoetherStore('workspace', (s) => s?.canGoBack ?? false);
  const canGoForward = useNoetherStore('workspace', (s) => s?.canGoForward ?? false);
  const navigateBack = useCallback(() => (app.workspace as any).navigateBack?.(), [app]);
  const navigateForward = useCallback(() => (app.workspace as any).navigateForward?.(), [app]);
  const showToast = useCallback((msg: string, type?: any) => app.workspace.showToast(msg, type), [app]);

  const readableLineLength = useNoetherStore('settings', (s) => s?.readableLineLength ?? false);
  const fontSize = useNoetherStore('settings', (s) => s?.fontSize ?? 16);

  // Dynamic SWR marketplace hook with instant local fallback
  const { extensions, isUpdating, isError, isOffline, refetch } = useMarketplaceQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'name'>('popular');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isFindOpen, setIsFindOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());

  const categories = ['All', 'Featured', 'Productivity', 'Visualization', 'Integration', 'Formatting', 'Installed'];

  // Global find shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isFindOpen) {
        setIsFindOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFindOpen]);

  useEffect(() => {
    if (isFindOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 30);
    }
  }, [isFindOpen]);

  const isExtensionInstalled = (id: string) => {
    return app.extensions.isExtensionInstalled(id);
  };

  const handleInstallExtension = async (ext: MarketplaceExtensionItem) => {
    setInstallingIds((prev) => new Set(prev).add(ext.id));

    try {
      const ok = await installMarketplaceExtension(app, ext);
      if (ok) {
        showToast(`Installed "${ext.name}"`, 'success');
      } else {
        showToast(`Failed to install "${ext.name}"`, 'warning');
      }
    } catch (err) {
      console.error('[MarketplaceView] Failed to install extension:', err);
      showToast(`Failed to install "${ext.name}"`, 'warning');
    } finally {
      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(ext.id);
        return next;
      });
    }
  };

  const handleUninstallExtension = async (ext: MarketplaceExtensionItem) => {
    try {
      const ok = await app.extensions.uninstallExtension(ext.id);
      if (ok) {
        showToast(`Uninstalled "${ext.name}"`, 'info');
      } else {
        showToast(`Failed to uninstall "${ext.name}"`, 'warning');
      }
    } catch (err) {
      console.error('[MarketplaceView] Failed to uninstall extension:', err);
      showToast(`Failed to uninstall "${ext.name}"`, 'warning');
    }
  };

  const filteredExtensions = useMemo(() => {
    let list = [...extensions];

    // Category filter
    if (selectedCategory === 'Featured') {
      list = list.filter((p) => p.featured);
    } else if (selectedCategory === 'Installed') {
      list = list.filter((p) => isExtensionInstalled(p.id));
    } else if (selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === 'popular') {
      list.sort((a, b) => {
        const diff = parseFloat(b.downloads) - parseFloat(a.downloads);
        return sortOrder === 'asc' ? -diff : diff;
      });
    } else if (sortBy === 'rating') {
      list.sort((a, b) => {
        const diff = b.stars - a.stars;
        return sortOrder === 'asc' ? -diff : diff;
      });
    } else if (sortBy === 'name') {
      list.sort((a, b) => {
        const diff = a.name.localeCompare(b.name);
        return sortOrder === 'desc' ? -diff : diff;
      });
    }

    return list;
  }, [extensions, searchQuery, selectedCategory, sortBy, sortOrder, extensionList]);

  return (
    <div data-main="true" className="flex-1 h-full flex flex-col overflow-hidden bg-[var(--noether-bg-main)] text-[var(--noether-text-primary)] select-none">
      {/* 100% Consistent Page Subheader */}
      <PageSubHeader
        title="Marketplace"
        icon={<Store01Icon size={13} />}
        document={null}
        isFindOpen={isFindOpen}
        onToggleFind={() => setIsFindOpen((prev) => !prev)}
      />

      {/* Main Page Body: Respects exact Note Page margins and empty space */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* In-Note Find Floating Overlay Bar (Exact same search experience as basic pages) */}
        {isFindOpen && (
          <div className="sticky top-2 z-40 px-10 max-w-3xl mx-auto flex justify-end">
            <div className="bg-[#1c1c1c] border border-[#333333] rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.6)] p-1.5 text-xs flex items-center gap-2 w-80">
              <Search01Icon size={13} className="text-[#666] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find in community extensions..."
                className="bg-transparent outline-none flex-1 text-xs text-white placeholder-[#555]"
              />
              {searchQuery && (
                <span className="text-[10px] text-[#777] font-mono shrink-0">
                  {filteredExtensions.length} found
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsFindOpen(false);
                  setSearchQuery('');
                }}
                className="p-1 rounded text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer"
              >
                <Cancel01Icon size={12} />
              </button>
            </div>
          </div>
        )}

        <div
          className={`mx-auto pt-4 pb-12 flex flex-col min-h-full ${
            readableLineLength ? 'max-w-3xl px-10' : 'w-full px-12 max-w-none'
          }`}
        >
          {/* Page Header */}
          <div className="relative mb-4">
            <div className="mb-3 relative">
              <h1
                style={{ fontSize: `calc(${fontSize || 12}px * 2.3)` }}
                className="w-full font-bold text-[#e5e7eb] pb-2 font-text tracking-tight leading-tight select-text"
              >
                Community Extensions
              </h1>
            </div>

            {/* Header Metadata */}
            <div className="flex flex-col gap-1 text-xs mb-3">
              {/* Category */}
              <div className="flex items-center gap-2 px-1.5 py-0.5 -mx-1.5">
                <div className="w-24 text-[11px] text-[#777] flex items-center gap-1.5 shrink-0">
                  <Tag01Icon size={12} className="text-[#888]" />
                  <span>Category</span>
                </div>
                <div className="text-xs text-[#b0b0b0]">
                  {selectedCategory}
                </div>
              </div>

              {/* Filter Count */}
              <div className="flex items-center gap-2 px-1.5 py-0.5 -mx-1.5">
                <div className="w-24 text-[11px] text-[#777] flex items-center gap-1.5 shrink-0">
                  <Store01Icon size={12} className="text-[#888]" />
                  <span>Extensions</span>
                </div>
                <div className="text-xs text-[#b0b0b0]">
                  {filteredExtensions.length} of {extensions.length}
                </div>
              </div>
            </div>

            {/* Subtle Divider under Header */}
            <div className="border-b border-[#282828] mb-4" />
          </div>

          {/* Search, Filter Categories & Sort Controls Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5">
            {/* Category Tags Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-[5px] text-xs font-medium whitespace-nowrap cursor-pointer border ${
                    selectedCategory === cat
                      ? 'bg-[#2a2a2a] text-white border-[#444] shadow-xs'
                      : 'bg-[#1e1e1e] text-[#888] hover:text-[#ccc] border-[#2a2a2a] hover:bg-[#252525]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort & Order Dropdowns */}
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => refetch()}
                title={isUpdating ? 'Updating catalogue from registry...' : 'Refresh marketplace catalogue'}
                disabled={isUpdating}
                className="noether-btn !p-1.5 flex items-center justify-center cursor-pointer"
              >
                <RotateCcwIcon size={14} className={isUpdating ? 'animate-spin' : ''} />
              </button>
              <CustomSelect
                value={sortBy}
                onChange={(val) => setSortBy(val as 'popular' | 'rating' | 'name')}
                options={[
                  { value: 'popular', label: 'Most Downloads' },
                  { value: 'rating', label: 'Top Rated' },
                  { value: 'name', label: 'Name' },
                ]}
                className="w-32"
              />
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title={sortOrder === 'asc' ? 'Ascending\nClick for descending' : 'Descending\nClick for ascending'}
                className="noether-btn !p-1.5 flex items-center justify-center cursor-pointer"
              >
                {sortOrder === 'asc' ? <ArrowUp01Icon size={14} /> : <ArrowDown01Icon size={14} />}
              </button>
            </div>
          </div>

          {/* 2-Column Extension Cards Grid matching page width */}
          {extensions.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-xl bg-[#202020] border border-[#2a2a2a] flex items-center justify-center mb-3 text-[var(--noether-accent,#eb584d)]">
                <Store01Icon size={24} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">
                {isOffline ? 'You Are Currently Offline' : 'No Community Extensions Yet'}
              </h3>
              <p className="text-xs text-[#888] leading-relaxed mb-4 text-center">
                {isOffline
                  ? 'Connect to the internet to discover, explore, and install community extensions from the registry.'
                  : 'The Noether community extensions registry is open with a clean slate. Publish or sync extensions from the registry.'}
              </p>
              <button
                onClick={() => refetch()}
                className="noether-btn noether-btn-primary !py-1.5 !px-3.5 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcwIcon size={13} className={isUpdating ? 'animate-spin' : ''} />
                <span>{isOffline ? 'Retry Connection' : 'Check Registry Updates'}</span>
              </button>
            </div>
          ) : filteredExtensions.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <p className="text-xs text-[#777] mb-3">
                No community extensions match your filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="noether-btn cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredExtensions.map((ext) => {
                const isInstalled = isExtensionInstalled(ext.id);
                const installedManifest = app.extensions.getExtensionManifest(ext.id);
                const hasUpdate =
                  isInstalled &&
                  installedManifest &&
                  compareSemVer(ext.version, installedManifest.version || '0.0.0') > 0;
                const isInstalling =
                  installingIds.has(ext.id) || app.extensions.updater.isUpdating(ext.id);

                return (
                  <div
                    key={ext.id}
                    className="p-3.5 rounded-xl bg-[#1b1b1b] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#333333] flex flex-col justify-between gap-2.5 group relative shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                  >
                    {/* Optional Card Banner Image */}
                    {ext.bannerImage && (
                      <div className="w-full h-24 mb-1 rounded-lg overflow-hidden border border-[#2a2a2a] bg-[#161616]">
                        <img src={ext.bannerImage} alt={ext.name} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Top Row: Icon + Title + Version + Category */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-[#222222] border border-[#2c2c2c] flex items-center justify-center shrink-0">
                        {ext.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-baseline gap-1.5 truncate">
                            <button
                              type="button"
                              onClick={() => app.workspace.openExtensionDocTab(ext.id, ext.name)}
                              className="text-xs font-medium text-white hover:text-[var(--noether-accent)] truncate text-left cursor-pointer"
                            >
                              {ext.name}
                            </button>
                            <span className="text-[11px] text-[#777] font-normal">v{ext.version}</span>
                          </div>

                          <span className="text-[10px] px-2 py-0.5 rounded-[5px] bg-[#222222] text-[#999] border border-[#333333] shadow-[0_1px_2px_rgba(0,0,0,0.25)] shrink-0 font-medium">
                            {ext.category}
                          </span>
                        </div>

                        <div className="text-[10px] text-[#666] mt-0.5 flex items-center gap-1.5">
                          <span>by {ext.author}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Download01Icon size={10} className="text-[#555]" />
                            {ext.downloads}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-[#999] leading-relaxed line-clamp-2 min-h-[32px]">
                      {ext.description}
                    </p>

                    {/* Bottom Row: Rating & Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#242424] mt-auto">
                      <div className="flex items-center gap-1 text-[#f59e0b] text-[10px]">
                        <span>{'★'.repeat(ext.stars)}</span>
                        <span className="text-[#666] text-[10px] ml-0.5">{ext.stars.toFixed(1)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {ext.readme && (
                          <button
                            type="button"
                            onClick={() => app.workspace.openExtensionDocTab(ext.id, ext.name)}
                            title={`View ${ext.name} documentation`}
                            className="noether-btn w-7 h-7 !p-0 flex items-center justify-center"
                          >
                            <BookOpen01Icon size={13} />
                          </button>
                        )}

                        {hasUpdate ? (
                          <button
                            type="button"
                            onClick={() => handleInstallExtension(ext)}
                            disabled={isInstalling}
                            title={`Update from v${installedManifest?.version} to v${ext.version}`}
                            className="noether-btn noether-btn-primary text-[11px] !py-1 !px-3 min-w-[78px] disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Download01Icon size={11} className={isInstalling ? 'animate-bounce' : ''} />
                            <span>{isInstalling ? 'Updating...' : `Update v${ext.version}`}</span>
                          </button>
                        ) : isInstalled ? (
                          <button
                            type="button"
                            onClick={() => handleUninstallExtension(ext)}
                            className="group/btn noether-btn text-[11px] !py-1 !px-3 min-w-[78px] hover:!text-[#f85153] hover:!border-[#f85153]/40"
                          >
                            <span className="flex items-center gap-1 group-hover/btn:hidden">
                              <CheckIcon size={11} />
                              <span>Installed</span>
                            </span>
                            <span className="hidden group-hover/btn:flex items-center gap-1 text-[#f85153]">
                              <Cancel01Icon size={11} />
                              <span>Uninstall</span>
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleInstallExtension(ext)}
                            disabled={isInstalling}
                            className="noether-btn noether-btn-primary text-[11px] !py-1 !px-3 min-w-[78px] disabled:opacity-50"
                          >
                            <Download01Icon size={11} className={isInstalling ? 'animate-bounce' : ''} />
                            <span>{isInstalling ? 'Installing...' : 'Install'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
