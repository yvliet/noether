import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFlintApp, useExtensionList } from '@/core/app/AppContext';
import { Extension } from '@/core/extensions/Extension';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSettingsStore } from '@/store/settingsStore';
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
} from '@/components/common/Icons';
import { DocOptionsMenu } from '@/components/editor/DocOptionsMenu';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { renderPropertyIcon } from '@/extensions/core/properties/propertyIcons';
import { usePropertiesSettings } from '@/extensions/core/properties/propertiesSettings';
import { RotateCcwIcon } from '@/components/common/Icons';
import { platform } from '@/lib/platform/platformAdapter';
import type { ExtensionManifest } from '@/core/extensions/types';
import {
  COMMUNITY_MARKETPLACE_CATALOGUE,
  MarketplaceExtensionItem,
  MarketplacePluginItem,
} from './marketplaceCatalogue';
import { useMarketplaceQuery, getRegistryUrl } from './useMarketplaceQuery';

// Re-export catalogue and models for consumers
export {
  COMMUNITY_MARKETPLACE_CATALOGUE,
  type MarketplaceExtensionItem,
  type MarketplacePluginItem,
};

export const MarketplaceView: React.FC = () => {
  const app = useFlintApp();
  const extensionList = useExtensionList();
  const {
    canGoBack,
    canGoForward,
    navigateBack,
    navigateForward,
    showToast,
  } = useWorkspaceStore();

  const { propertyIcons, showInDocument: showPropsInDoc, startFolded: startPropsFolded } = usePropertiesSettings();
  const {
    readableLineLength,
    propertiesInDoc,
    foldHeading,
    fontSize,
  } = useSettingsStore();

  // Dynamic SWR marketplace hook with instant local fallback
  const { extensions, isUpdating, isError, refetch } = useMarketplaceQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'name'>('popular');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isPropertiesFolded, setIsPropertiesFolded] = useState(startPropsFolded);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());
  const [localInstalledIds, setLocalInstalledIds] = useState<Set<string>>(() => {
    try {
      const saved =
        localStorage.getItem('flint_installed_community_extensions') ||
        localStorage.getItem('flint_installed_community_plugins');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

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
    return (
      localInstalledIds.has(id) ||
      app.extensions.isExtensionEnabled(id)
    );
  };

  const handleInstallExtension = async (ext: MarketplaceExtensionItem) => {
    setInstallingIds((prev) => new Set(prev).add(ext.id));

    try {
      // 1. If already registered in runtime (e.g. bundled extension), enable directly
      if (app.extensions.getExtensionManifest(ext.id)) {
        await app.extensions.enableExtension(ext.id);
      } else {
        // 2. Third-party extension: attempt to fetch real assets from registry URLs
        const registryBase = getRegistryUrl().replace(/\/plugins\/?$/, '/plugins');
        const manifestUrl = ext.manifestUrl || `${registryBase}/${ext.id}/manifest.json`;
        const mainJsUrl = ext.mainJsUrl || ext.downloadUrl || `${registryBase}/${ext.id}/main.js`;
        const stylesCssUrl = ext.stylesCssUrl || `${registryBase}/${ext.id}/styles.css`;

        let manifestContent: string | null = null;
        let mainJsContent: string | null = null;
        let stylesCssContent: string | null = null;

        try {
          const res = await fetch(manifestUrl, { signal: AbortSignal.timeout(4000) });
          if (res.ok) manifestContent = await res.text();
        } catch {
          // Offline or custom assets not deployed yet
        }

        try {
          const res = await fetch(mainJsUrl, { signal: AbortSignal.timeout(4000) });
          if (res.ok) mainJsContent = await res.text();
        } catch {
          // Offline or custom assets not deployed yet
        }

        try {
          const res = await fetch(stylesCssUrl, { signal: AbortSignal.timeout(3000) });
          if (res.ok) stylesCssContent = await res.text();
        } catch {
          // Optional styles
        }

        // Parse or construct extension manifest descriptor
        let manifestData: ExtensionManifest | null = null;
        if (manifestContent) {
          try {
            manifestData = JSON.parse(manifestContent);
          } catch {}
        }

        if (!manifestData) {
          manifestData = {
            id: ext.id,
            name: ext.name,
            version: ext.version || '1.0.0',
            description: ext.description || '',
            author: ext.author || 'Community',
            isCore: false,
          };
          manifestContent = JSON.stringify(manifestData, null, 2);
        } else {
          manifestData.isCore = false;
          manifestContent = JSON.stringify(manifestData, null, 2);
        }

        // Provide standard starter code if remote entry bundle is not hosted
        if (!mainJsContent || !mainJsContent.trim()) {
          const cleanClassName = (ext.name.replace(/[^a-zA-Z0-9]/g, '') || 'Community') + 'Extension';
          mainJsContent = `const { Extension } = require('flint');

module.exports = class ${cleanClassName} extends Extension {
  async onload() {
    console.log('[Flint] Loaded community extension: ${ext.name} (v${ext.version})');
  }

  onunload() {
    console.log('[Flint] Unloaded extension: ${ext.name}');
  }
};
`;
        }

        // 3. Prepare the hearth extension directory on desktop
        if (platform.isDesktop()) {
          try {
            await platform.installExtensionBundle(
              ext.id,
              manifestContent,
              mainJsContent,
              stylesCssContent || undefined
            );
            await app.extensions.refreshCommunityExtensions();
          } catch (diskErr) {
            console.warn('[MarketplaceView] Could not prepare extension directory on disk:', diskErr);
          }
        }

        // 4. In-memory registration fallback if runtime has not loaded from disk
        if (!app.extensions.getExtensionManifest(ext.id)) {
          await app.extensions.externalLoader.loadFromSource(
            manifestData,
            mainJsContent,
            stylesCssContent || undefined
          );
        }

        // 5. Enable the extension
        await app.extensions.enableExtension(ext.id);
      }

      // 6. Record in local installed state
      setLocalInstalledIds((prev) => {
        const next = new Set(prev).add(ext.id);
        const json = JSON.stringify(Array.from(next));
        localStorage.setItem('flint_installed_community_extensions', json);
        localStorage.setItem('flint_installed_community_plugins', json);
        return next;
      });

      showToast(`Installed "${ext.name}"`, 'success');
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
    setLocalInstalledIds((prev) => {
      const next = new Set(prev);
      next.delete(ext.id);
      const json = JSON.stringify(Array.from(next));
      localStorage.setItem('flint_installed_community_extensions', json);
      localStorage.setItem('flint_installed_community_plugins', json);
      return next;
    });

    if (app.extensions.getExtensionManifest(ext.id)) {
      await app.extensions.disableExtension(ext.id);
    } else {
      await app.extensions.disableExtension(ext.id);
    }
    showToast(`Uninstalled "${ext.name}"`, 'info');
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
  }, [extensions, searchQuery, selectedCategory, sortBy, sortOrder, localInstalledIds, extensionList]);

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-[#181818] text-[var(--flint-text-primary)] select-none">
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
          {/* Document Header: Note Title + In-Document Properties */}
          <div className="relative group/title mb-4">
            {/* Note Title Header */}
            <div className={`${showPropsInDoc && propertiesInDoc !== 'Hidden' && !isPropertiesFolded ? 'mb-3' : 'mb-4'} relative`}>
              {/* Fold button on Document Title Header */}
              {foldHeading && showPropsInDoc && propertiesInDoc !== 'Hidden' && (
                <button
                  type="button"
                  onClick={() => setIsPropertiesFolded((prev) => !prev)}
                  title={isPropertiesFolded ? 'Unfold properties' : 'Fold properties'}
                  className={`absolute -left-[36px] top-[calc(50%-4px)] -translate-y-1/2 w-[36px] h-[32px] flex items-center justify-start pl-[2px] text-[#777] hover:text-[#dcddde] cursor-pointer z-10 ${
                    isPropertiesFolded ? 'opacity-100 text-[#aaa]' : 'opacity-0 group-hover/title:opacity-100'
                  }`}
                >
                  <ChevronDownIcon
                    size={18}
                    className={isPropertiesFolded ? '-rotate-90' : 'rotate-0'}
                  />
                </button>
              )}

              <h1
                style={{ fontSize: `calc(${fontSize || 12}px * 2.3)` }}
                className="w-full font-bold text-[#e5e7eb] pb-2 font-text tracking-tight leading-tight select-text"
              >
                Community Extensions
              </h1>
            </div>

            {/* Frontmatter Properties */}
            {showPropsInDoc && propertiesInDoc !== 'Hidden' && (
              <div className={isPropertiesFolded ? 'hidden' : 'block'}>
                <div className="flex flex-col gap-1 text-xs mb-3">
                  {/* Category */}
                  <div className="flex items-center gap-2 group/prop hover:bg-[#202020]/40 rounded px-1.5 py-0.5 -mx-1.5">
                    <div className="w-24 text-[11px] text-[#777] flex items-center gap-1.5 shrink-0">
                      {renderPropertyIcon('category', propertyIcons)}
                      <span>Category</span>
                    </div>
                    <div className="text-xs text-[#b0b0b0]">
                      {selectedCategory}
                    </div>
                  </div>

                  {/* Filter Count */}
                  <div className="flex items-center gap-2 group/prop hover:bg-[#202020]/40 rounded px-1.5 py-0.5 -mx-1.5">
                    <div className="w-24 text-[11px] text-[#777] flex items-center gap-1.5 shrink-0">
                      {renderPropertyIcon('count', propertyIcons)}
                      <span>Extensions</span>
                    </div>
                    <div className="text-xs text-[#b0b0b0]">
                      {filteredExtensions.length} of {extensions.length}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtle Divider under Properties Header */}
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
                className="flint-btn !p-1.5 flex items-center justify-center cursor-pointer"
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
                className="flint-btn !p-1.5 flex items-center justify-center cursor-pointer"
              >
                {sortOrder === 'asc' ? <ArrowUp01Icon size={14} /> : <ArrowDown01Icon size={14} />}
              </button>
            </div>
          </div>

          {/* 2-Column Extension Cards Grid matching page width */}
          {extensions.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-xl bg-[#202020] border border-[#2a2a2a] flex items-center justify-center mb-3 text-[var(--flint-accent,#ea580c)]">
                <Store01Icon size={24} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">No Community Extensions Yet</h3>
              <p className="text-xs text-[#888] leading-relaxed mb-4 text-center">
                The Flint community extensions registry is open with a clean slate. Publish or sync extensions from the registry.
              </p>
              <button
                onClick={() => refetch()}
                className="flint-btn flint-btn-primary !py-1.5 !px-3.5 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcwIcon size={13} className={isUpdating ? 'animate-spin' : ''} />
                <span>Check Registry Updates</span>
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
                className="flint-btn cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredExtensions.map((ext) => {
                const isInstalled = isExtensionInstalled(ext.id);
                const isInstalling = installingIds.has(ext.id);

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
                              onClick={() => useWorkspaceStore.getState().openExtensionDocTab(ext.id, ext.name)}
                              className="text-xs font-medium text-white hover:text-[var(--flint-accent)] truncate text-left cursor-pointer"
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
                            onClick={() => useWorkspaceStore.getState().openExtensionDocTab(ext.id, ext.name)}
                            title={`View ${ext.name} documentation`}
                            className="flint-btn w-7 h-7 !p-0 flex items-center justify-center"
                          >
                            <BookOpen01Icon size={13} />
                          </button>
                        )}

                        {isInstalled ? (
                          <button
                            type="button"
                            onClick={() => handleUninstallExtension(ext)}
                            className="group/btn flint-btn text-[11px] !py-1 !px-3 min-w-[78px] hover:!text-[#f85153] hover:!border-[#f85153]/40"
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
                            className="flint-btn flint-btn-primary text-[11px] !py-1 !px-3 min-w-[78px] disabled:opacity-50"
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
