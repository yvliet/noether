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
  SparklesIcon,
} from '@/components/common/Icons';
import { DocOptionsMenu } from '@/components/editor/DocOptionsMenu';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { renderPropertyIcon } from '@/extensions/core/properties/propertyIcons';
import { usePropertiesSettings } from '@/extensions/core/properties/propertiesSettings';
import { CascadeIcon } from '@/extensions/core/cascade/cascadeIcons';
import { iconifyReadme } from '@/extensions/core/iconify/readme';

export interface MarketplaceExtensionItem {
  id: string;
  name: string;
  version: string;
  author: string;
  authorUrl?: string;
  description: string;
  downloads: string;
  stars: number;
  category: 'Productivity' | 'Visualization' | 'Integration' | 'Formatting';
  icon: React.ReactNode;
  featured?: boolean;
  readme?: string;
  bannerImage?: string;
}

// Backwards compatibility alias
export type MarketplacePluginItem = MarketplaceExtensionItem;

export const COMMUNITY_MARKETPLACE_CATALOGUE: MarketplaceExtensionItem[] = [
  {
    id: 'flint-cascade',
    name: 'Cascade',
    version: '1.0.0',
    author: 'Yuliet Li',
    description: 'Turn notes into sequential cascades (books) with status-bar linking, graph backlinks, and custom sidebar folders.',
    downloads: '52.4k',
    stars: 5,
    category: 'Productivity',
    featured: true,
    icon: <CascadeIcon size={18} className="text-[#dcddde]" />,
  },
  {
    id: 'iconify',
    name: 'Iconify',
    version: '1.0.0',
    author: 'Yuliet Li',
    description: 'Customize icons for folders, notes, files, and tabs with a rich HugeIcons selector and SQLite persistence.',
    downloads: '38.4k',
    stars: 5,
    category: 'Visualization',
    featured: true,
    icon: <SparklesIcon size={18} className="text-[var(--flint-accent,#ea580c)]" />,
    readme: iconifyReadme,
  },
];

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

  const handleInstallExtension = (ext: MarketplaceExtensionItem) => {
    setInstallingIds((prev) => new Set(prev).add(ext.id));

    setTimeout(async () => {
      // Register in local installed state
      setLocalInstalledIds((prev) => {
        const next = new Set(prev).add(ext.id);
        const json = JSON.stringify(Array.from(next));
        localStorage.setItem('flint_installed_community_extensions', json);
        localStorage.setItem('flint_installed_community_plugins', json);
        return next;
      });

      // Register or enable in extension manager
      try {
        if (app.extensions.getExtensionManifest(ext.id)) {
          await app.extensions.enableExtension(ext.id);
        } else {
          class CommunityExtensionStub extends Extension {
            onload() {
              console.log(`[Community Extension] Loaded ${ext.name}`);
            }
          }

          app.extensions.registerExtension(
            {
              id: ext.id,
              name: ext.name,
              version: ext.version,
              description: ext.description,
              author: ext.author,
              isCore: false,
            },
            CommunityExtensionStub
          );
          await app.extensions.enableExtension(ext.id);
        }
      } catch (err) {
        console.warn('Registered in runtime manager:', err);
      }

      setInstallingIds((prev) => {
        const next = new Set(prev);
        next.delete(ext.id);
        return next;
      });

      showToast(`Installed "${ext.name}"`, 'success');
    }, 600);
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
    let list = [...COMMUNITY_MARKETPLACE_CATALOGUE];

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
  }, [searchQuery, selectedCategory, sortBy, sortOrder, localInstalledIds, extensionList]);

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
                  className={`absolute -left-[36px] top-[calc(50%-4px)] -translate-y-1/2 w-[36px] h-[32px] flex items-center justify-start pl-[2px] text-[#777] hover:text-[#dcddde] transition-opacity cursor-pointer z-10 ${
                    isPropertiesFolded ? 'opacity-100 text-[#aaa]' : 'opacity-0 group-hover/title:opacity-100'
                  }`}
                >
                  <ChevronDownIcon
                    size={18}
                    className={`transition-transform duration-150 ${isPropertiesFolded ? '-rotate-90' : 'rotate-0'}`}
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
              <div
                className={`transition-all duration-150 ease-in-out ${
                  isPropertiesFolded ? 'hidden' : 'block'
                }`}
              >
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
                      {filteredExtensions.length} of {COMMUNITY_MARKETPLACE_CATALOGUE.length}
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
                className="p-1.5 rounded-[5px] bg-[#252525] hover:bg-[#2f2f2f] active:bg-[#202020] text-[#999] hover:text-white border border-[#383838] hover:border-[#484848] transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.35)] flex items-center justify-center"
              >
                {sortOrder === 'asc' ? <ArrowUp01Icon size={14} /> : <ArrowDown01Icon size={14} />}
              </button>
            </div>
          </div>

          {/* 2-Column Extension Cards Grid matching page width */}
          {filteredExtensions.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <p className="text-xs text-[#777] mb-3">
                No community extensions match your filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white rounded-[5px] text-xs font-medium border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
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
                    className="p-3.5 rounded-xl bg-[#1b1b1b] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#333333] transition-all flex flex-col justify-between gap-2.5 group relative shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
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
                              className="text-xs font-medium text-white hover:text-[var(--flint-accent)] transition-colors truncate text-left cursor-pointer"
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
                            className="w-7 h-7 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white rounded-[5px] border border-[#383838] hover:border-[#484848] transition-all cursor-pointer flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                          >
                            <BookOpen01Icon size={13} />
                          </button>
                        )}

                        {isInstalled ? (
                          <button
                            type="button"
                            onClick={() => handleUninstallExtension(ext)}
                            className="group/btn px-3 py-1 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-[#f85153] hover:border-[#f85153]/40 rounded-[5px] border border-[#383838] text-[11px] font-medium transition-none cursor-pointer flex items-center justify-center gap-1 shadow-[0_1px_2px_rgba(0,0,0,0.35)] min-w-[78px]"
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
                            className="px-3 py-1 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white rounded-[5px] border border-[#383838] hover:border-[#484848] text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 shadow-[0_1px_2px_rgba(0,0,0,0.35)] min-w-[78px] disabled:opacity-50"
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
