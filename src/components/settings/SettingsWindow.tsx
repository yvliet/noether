import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import {
  Search01Icon,
  Settings02Icon,
  PaletteIcon,
  MonitorIcon,
  Edit02Icon,
  Folder01Icon,
  KeyIcon,
  PackageIcon,
  PuzzleIcon,
  RotateCcwIcon,
  WindowMinimizeIcon,
  WindowMaximizeIcon,
  WindowRestoreIcon,
  WindowCloseIcon,
  CancelCircleIcon,
  BookOpen01Icon,
} from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useIsMaximized } from '@/hooks/useIsMaximized';
import { applyAppearanceDOM } from '@/store/settingsStore';
import noetherSpinGif from '@/assets/noether_spin.gif';
import { appInstance } from '@/core/app/NoetherApp';
import { AppProvider, useNoetherApp, useExtensionList, useSettingTabs, useCommands } from '@/core/app/AppContext';
import { ExtensionSettingTab } from '@/core/extensions/types';
import { platform } from '@/lib/platform/platformAdapter';
import {
  SettingsSearchContext,
  SETTINGS_SEARCH_INDEX,
  isTabMatch,
} from '@/components/settings/shared/SettingRow';

// Code-split all tab components with React.lazy
const GeneralTab = React.lazy(() => import('./tabs/GeneralTab').then((m) => ({ default: m.GeneralTab })));
const AppearanceTab = React.lazy(() => import('./tabs/AppearanceTab').then((m) => ({ default: m.AppearanceTab })));
const InterfaceTab = React.lazy(() => import('./tabs/InterfaceTab').then((m) => ({ default: m.InterfaceTab })));
const EditorTab = React.lazy(() => import('./tabs/EditorTab').then((m) => ({ default: m.EditorTab })));
const FilesTab = React.lazy(() => import('./tabs/FilesTab').then((m) => ({ default: m.FilesTab })));
const HotkeysTab = React.lazy(() => import('./tabs/HotkeysTab').then((m) => ({ default: m.HotkeysTab })));
const CoreExtensionsTab = React.lazy(() => import('./tabs/CoreExtensionsTab').then((m) => ({ default: m.CoreExtensionsTab })));
const CommunityExtensionsTab = React.lazy(() => import('./tabs/CommunityExtensionsTab').then((m) => ({ default: m.CommunityExtensionsTab })));
const FontPickerView = React.lazy(() => import('./tabs/FontPickerView').then((m) => ({ default: m.FontPickerView })));
const TrashView = React.lazy(() => import('./tabs/TrashView').then((m) => ({ default: m.TrashView })));

// Pre-warm lazy tab chunks on idle so tab switching is instantaneous
const prefetchTabs = () => {
  import('./tabs/GeneralTab');
  import('./tabs/AppearanceTab');
  import('./tabs/InterfaceTab');
  import('./tabs/EditorTab');
  import('./tabs/FilesTab');
  import('./tabs/HotkeysTab');
  import('./tabs/CoreExtensionsTab');
};

const TabLoadingSpinner = () => (
  <div className="w-full py-24 flex items-center justify-center select-none">
    <img
      src={noetherSpinGif}
      alt="Loading tab"
      width={32}
      height={32}
      className="w-8 h-8 object-contain select-none pointer-events-none"
      draggable={false}
    />
  </div>
);

export interface SettingsWindowContentProps {
  onClose?: () => void;
  isModal?: boolean;
  initialTab?: string;
}

export const SettingsWindowContent: React.FC<SettingsWindowContentProps> = React.memo(({ onClose, isModal = false, initialTab }) => {
  const app = useNoetherApp();
  const allSettingTabs = useSettingTabs();
  const allCommands = useCommands();

  const vaultName = useWorkspaceStore((s) => s.vaultName);
  const setVaultName = useWorkspaceStore((s) => s.setVaultName);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);

  const [activeTab, setActiveTab] = useState<string>(initialTab || 'general');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([initialTab || 'general']));
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);
  const [isModalMaximized, setIsModalMaximized] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const tabScrollPositions = useRef<Record<string, number>>({});

  // Sub-view navigation (e.g. for Font Pickers & Trash)
  const [fontPickerMode, setFontPickerMode] = useState<'interface' | 'text' | 'monospace' | null>(null);
  const [isTrashViewOpen, setIsTrashViewOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      setVisitedTabs((prev) => {
        if (prev.has(initialTab)) return prev;
        const next = new Set(prev);
        next.add(initialTab);
        return next;
      });
    }
  }, [initialTab]);

  useEffect(() => {
    platform.getCurrentVault().then((data) => {
      if (data?.name) {
        setVaultName(data.name);
      }
    });
  }, [setVaultName]);

  // Pre-fetch remaining tab chunks on idle
  useEffect(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => prefetchTabs());
    } else {
      setTimeout(prefetchTabs, 50);
    }
  }, []);

  // When mounting, closing or unmounting Settings, apply appearance/zoom updates to DOM
  useEffect(() => {
    applyAppearanceDOM();
    platform.setWindowTitle(`Settings﹕${vaultName || 'Vault'}﹕Noether`);
    return () => {
      applyAppearanceDOM();
    };
  }, [vaultName]);

  const platformIsMaximized = useIsMaximized();
  const isMaximized = isModal ? isModalMaximized : platformIsMaximized;

  const handleMinimize = useCallback(() => {
    if (isModal) {
      if (onClose) {
        onClose();
      } else {
        useWorkspaceStore.getState().setIsSettingsOpen(false);
      }
    } else {
      platform.minimize();
    }
  }, [isModal, onClose]);

  const handleMaximize = useCallback(() => {
    if (isModal) {
      setIsModalMaximized((prev) => !prev);
    } else {
      platform.maximize();
    }
  }, [isModal]);

  const handleClose = useCallback(() => {
    if (isModal && onClose) {
      onClose();
    } else if (platform.isDesktop()) {
      platform.close();
      platform.closeSettingsWindow();
    } else if (onClose) {
      onClose();
    } else {
      useWorkspaceStore.getState().setIsSettingsOpen(false);
    }
  }, [isModal, onClose]);

  // Options Sidebar Items
  const optionsItems = useMemo(() => [
    { id: 'general', label: 'General', icon: <Settings02Icon size={14} />, keywords: ['general', 'updates', 'language', 'startup'] },
    { id: 'appearance', label: 'Appearance', icon: <PaletteIcon size={14} />, keywords: ['appearance', 'theme', 'color', 'accent', 'font', 'dark', 'light'] },
    { id: 'interface', label: 'Interface', icon: <MonitorIcon size={14} />, keywords: ['interface', 'zoom', 'ribbon', 'window', 'tab', 'action rail'] },
    { id: 'editor', label: 'Editor', icon: <Edit02Icon size={14} />, keywords: ['editor', 'line', 'preview', 'indent', 'heading', 'pairing', 'properties', 'reading', 'math', 'formulas', 'dollar', 'auto-pair'] },
    { id: 'files', label: 'Files and links', icon: <Folder01Icon size={14} />, keywords: ['files and links', 'files', 'links', 'trash', 'deleted', 'delete', 'vault', 'vault', 'wikilink'] },
    { id: 'hotkeys', label: 'Hotkeys', icon: <KeyIcon size={14} />, keywords: ['hotkeys', 'shortcuts', 'keys', 'commands'] },
    { id: 'core-extensions', label: 'Core extensions', icon: <PackageIcon size={14} />, keywords: ['core extensions', 'core', 'built-in extensions', 'plugins', 'modules', 'extensions'] },
    { id: 'community-extensions', label: 'Community extensions', icon: <PuzzleIcon size={14} />, keywords: ['community extensions', 'community plugins', 'plugins', 'marketplace', 'extensions'] },
  ], []);

  const extensionList = useExtensionList();

  // Dynamic Core & Community Extensions Setting Tabs from Registries + Enabled Extensions Fallback
  const coreExtensionTabs = useMemo(() => {
    const registered = allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return manifest?.isCore === true;
    });

    const result: ExtensionSettingTab[] = [...registered];
    const enabledCoreManifests = extensionList.core.filter((m) => app.extensions.isExtensionEnabled(m.id));

    for (const manifest of enabledCoreManifests) {
      if (!result.some((t) => isTabMatch(t, manifest.id))) {
        result.push({
          id: `${manifest.id}:${manifest.id}-settings`,
          name: manifest.name,
          extensionId: manifest.id,
          icon: <PackageIcon size={14} />,
          render: () => (
            <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{manifest.name}</h4>
                <p className="text-xs text-[#888] leading-relaxed">{manifest.description}</p>
              </div>
            </div>
          ),
        });
      }
    }

    return result;
  }, [allSettingTabs, app, extensionList.core]);

  const communityExtensionTabs = useMemo(() => {
    const registered = allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return !manifest || manifest.isCore !== true;
    });

    const result: ExtensionSettingTab[] = [...registered];
    const enabledCommunityManifests = extensionList.community.filter((m) => app.extensions.isExtensionEnabled(m.id));

    for (const manifest of enabledCommunityManifests) {
      if (!result.some((t) => isTabMatch(t, manifest.id))) {
        result.push({
          id: `${manifest.id}:${manifest.id}-settings`,
          name: manifest.name,
          extensionId: manifest.id,
          icon: <PuzzleIcon size={14} />,
          render: () => (
            <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{manifest.name}</h4>
                <p className="text-xs text-[#888] leading-relaxed">{manifest.description}</p>
              </div>
            </div>
          ),
        });
      }
    }

    return result;
  }, [allSettingTabs, app, extensionList.community]);

  const matchingTabIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    const matched = new Set<string>();
    for (const item of SETTINGS_SEARCH_INDEX) {
      if (
        item.tabName.toLowerCase().includes(q) ||
        item.sectionName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q)))
      ) {
        matched.add(item.tabId);
      }
    }
    const commandMatch = allCommands.some((cmd) => {
      const title = typeof cmd.title === 'function' ? cmd.title(app) : cmd.title;
      return (
        title.toLowerCase().includes(q) ||
        (cmd.section && cmd.section.toLowerCase().includes(q)) ||
        (cmd.hotkey && cmd.hotkey.toLowerCase().includes(q)) ||
        'hotkeys'.includes(q) ||
        'shortcuts'.includes(q)
      );
    });
    if (commandMatch) {
      matched.add('hotkeys');
    }
    return matched;
  }, [searchQuery, allCommands, app]);

  const hasAnyMatches = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (matchingTabIds.size > 0) return true;
    const coreMatch = extensionList.core.some(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        'core extensions'.includes(q) ||
        'core'.includes(q) ||
        'built-in extensions'.includes(q)
    );
    if (coreMatch) return true;
    const commMatch = extensionList.community.some(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.author && e.author.toLowerCase().includes(q)) ||
        'community extensions'.includes(q) ||
        'community'.includes(q)
    );
    if (commMatch) return true;
    return false;
  }, [searchQuery, matchingTabIds, extensionList]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return optionsItems;
    const q = searchQuery.toLowerCase().trim();
    return optionsItems.filter((i) =>
      matchingTabIds.has(i.id) ||
      i.label.toLowerCase().includes(q) ||
      i.keywords.some((k) => k.includes(q))
    );
  }, [searchQuery, optionsItems, matchingTabIds]);

  const filteredCoreExtensions = useMemo(() => {
    return coreExtensionTabs.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const extId = item.extensionId || item.id.split(':')[0];
        const manifest = app.extensions.getExtensionManifest(extId);
        const nameMatch = item.name.toLowerCase().includes(q);
        const manifestMatch =
          manifest?.name.toLowerCase().includes(q) ||
          manifest?.description?.toLowerCase().includes(q);
        const sectionMatch =
          'core extensions'.includes(q) ||
          'core'.includes(q) ||
          'built-in extensions'.includes(q);
        return nameMatch || manifestMatch || extId.toLowerCase().includes(q) || sectionMatch;
      }
      return true;
    });
  }, [coreExtensionTabs, searchQuery, app]);

  const filteredCommunityExtensions = useMemo(() => {
    return communityExtensionTabs.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const extId = item.extensionId || item.id.split(':')[0];
        const manifest = app.extensions.getExtensionManifest(extId);
        const nameMatch = item.name.toLowerCase().includes(q);
        const manifestMatch =
          manifest?.name.toLowerCase().includes(q) ||
          manifest?.description?.toLowerCase().includes(q);
        const sectionMatch =
          'community extensions'.includes(q) ||
          'community'.includes(q);
        return nameMatch || manifestMatch || extId.toLowerCase().includes(q) || sectionMatch;
      }
      return true;
    });
  }, [communityExtensionTabs, searchQuery, app]);

  const visitedExtensionTabIds = useMemo(() => {
    const BUILTIN_TABS = new Set([
      'general', 'appearance', 'interface', 'editor', 'files', 'hotkeys',
      'core-extensions', 'core-plugins', 'community-extensions', 'community-plugins',
    ]);
    const seenTabKeys = new Set<string>();
    const result: string[] = [];

    for (const id of visitedTabs) {
      if (BUILTIN_TABS.has(id)) continue;
      const tabObj =
        allSettingTabs.find((t) => isTabMatch(t, id)) ||
        coreExtensionTabs.find((t) => isTabMatch(t, id)) ||
        communityExtensionTabs.find((t) => isTabMatch(t, id));
      const canonicalKey = tabObj?.id || id;
      if (!seenTabKeys.has(canonicalKey)) {
        seenTabKeys.add(canonicalKey);
        result.push(id);
      }
    }
    return result;
  }, [visitedTabs, allSettingTabs, coreExtensionTabs, communityExtensionTabs]);

  const handleNavigateTab = useCallback((targetTabId: string) => {
    if (mainScrollRef.current) {
      tabScrollPositions.current[activeTab] = mainScrollRef.current.scrollTop;
    }
    setFontPickerMode(null);
    setIsTrashViewOpen(false);
    setShowAllOccurrences(false);
    setActiveTab(targetTabId);
    setVisitedTabs((prev) => {
      if (prev.has(targetTabId)) return prev;
      const next = new Set(prev);
      next.add(targetTabId);
      return next;
    });
    requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = tabScrollPositions.current[targetTabId] || 0;
      }
    });
  }, [activeTab]);

  const handleOpenFontPicker = useCallback((mode: 'interface' | 'text' | 'monospace') => {
    if (mainScrollRef.current) {
      tabScrollPositions.current[activeTab] = mainScrollRef.current.scrollTop;
      mainScrollRef.current.scrollTop = 0;
    }
    setFontPickerMode(mode);
  }, [activeTab]);

  const handleCloseFontPicker = useCallback(() => {
    setFontPickerMode(null);
    requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = tabScrollPositions.current[activeTab] || 0;
      }
    });
  }, [activeTab]);

  const handleOpenTrash = useCallback(() => {
    if (mainScrollRef.current) {
      tabScrollPositions.current[activeTab] = mainScrollRef.current.scrollTop;
      mainScrollRef.current.scrollTop = 0;
    }
    setIsTrashViewOpen(true);
  }, [activeTab]);

  const handleCloseTrash = useCallback(() => {
    setIsTrashViewOpen(false);
    requestAnimationFrame(() => {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTop = tabScrollPositions.current[activeTab] || 0;
      }
    });
  }, [activeTab]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setFontPickerMode(null);
    setIsTrashViewOpen(false);
    setShowAllOccurrences(Boolean(val.trim()));
  }, []);

  const handleSearchFocusOrClick = useCallback(() => {
    if (searchQuery.trim()) {
      setFontPickerMode(null);
      setIsTrashViewOpen(false);
      setShowAllOccurrences(true);
    }
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setShowAllOccurrences(false);
    searchInputRef.current?.focus();
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (searchQuery) {
        e.preventDefault();
        e.stopPropagation();
        handleClearSearch();
      } else {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    }
  }, [searchQuery, handleClearSearch, handleClose]);

  useEffect(() => {
    window.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fontPickerMode) {
          e.preventDefault();
          e.stopPropagation();
          handleCloseFontPicker();
        } else if (isTrashViewOpen) {
          e.preventDefault();
          e.stopPropagation();
          handleCloseTrash();
        } else if (searchQuery) {
          e.preventDefault();
          e.stopPropagation();
          handleClearSearch();
        } else {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [fontPickerMode, isTrashViewOpen, searchQuery, handleCloseFontPicker, handleCloseTrash, handleClearSearch, handleClose]);

  return (
    <div
      data-card="true"
      className={`${
        isModal
          ? isModalMaximized
            ? 'fixed inset-0 w-full h-full z-50 rounded-none border-none shadow-2xl'
            : 'relative w-[960px] h-[660px] max-w-[calc(100%-32px)] max-h-[calc(100%-32px)] rounded-xl border border-[var(--noether-border-subtle,#2c2c2c)] shadow-2xl'
          : 'w-full h-full'
      } flex flex-col bg-[var(--noether-bg-main,#181818)] text-[var(--noether-text-primary,#dcddde)] select-none font-sans overflow-hidden`}
    >
      {/* 1. Window Header Bar */}
      <header
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (!isModal && e.button === 0 && !(e.target as HTMLElement).closest('button, input, [data-no-drag="true"]')) {
            platform.startDragging();
          }
        }}
        onDoubleClick={(e) => {
          if (!(e.target as HTMLElement).closest('button, input, [data-no-drag="true"]')) {
            handleMaximize();
          }
        }}
        style={{ WebkitAppRegion: isModal ? undefined : 'drag' } as React.CSSProperties}
        className="relative h-10 bg-[var(--noether-bg-topbar,#181818)] border-b border-[var(--noether-border-subtle,#242424)] flex items-center justify-between px-3 select-none z-30 shrink-0 text-xs cursor-default"
      >
        {/* Left spacer */}
        <div className="w-16 h-full" />

        {/* Centered Window Title */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-medium text-xs text-[var(--noether-text-muted,#888)] flex items-center gap-1.5 select-none">
            <span className="text-[var(--noether-text-secondary,#ccc)]">Settings</span>
            <span className="text-[var(--noether-text-faint,#555)]">﹕</span>
            <span className="text-[var(--noether-text-primary)] font-medium">{vaultName || 'Noether vault'}</span>
            <span className="text-[var(--noether-text-faint,#555)]">﹕</span>
            <span className="text-[var(--noether-text-muted,#888)]">Noether</span>
          </span>
        </div>

        {/* Top-Right Frameless Window Controls */}
        <div
          className="flex items-center h-full -mr-3 z-10"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          data-no-drag="true"
        >
          <button
            type="button"
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
            className="h-full w-11 hover:bg-[var(--noether-bg-card-hover,#252525)] text-[var(--noether-text-muted,#888)] hover:text-[var(--noether-text-primary)] flex items-center justify-center cursor-pointer"
            title="Minimize"
          >
            <WindowMinimizeIcon />
          </button>
          <button
            type="button"
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              handleMaximize();
            }}
            className="h-full w-11 hover:bg-[var(--noether-bg-card-hover,#252525)] text-[var(--noether-text-muted,#888)] hover:text-[var(--noether-text-primary)] flex items-center justify-center cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
          </button>
          <button
            type="button"
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="h-full w-11 hover:bg-[#e81123] text-[var(--noether-text-muted,#888)] hover:text-white flex items-center justify-center cursor-pointer"
            title="Close"
          >
            <WindowCloseIcon />
          </button>
        </div>
      </header>

      {/* 2. Main 2-Column Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Navigation Sidebar */}
        <aside className="w-[230px] bg-[var(--noether-bg-sidebar,#161616)] border-r border-[var(--noether-border-subtle,#242424)] h-full flex flex-col p-3 shrink-0 overflow-hidden">
          {/* Search Box */}
          <div className="relative mb-3 shrink-0">
            <Search01Icon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--noether-text-muted)] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocusOrClick}
              onClick={handleSearchFocusOrClick}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search settings..."
              className="w-full bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] rounded-md pl-8 pr-7 py-1.5 text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                title="Clear search (Esc)"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer p-0.5"
              >
                <CancelCircleIcon size={13} />
              </button>
            )}
          </div>

          {/* Nav Categories List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
            {/* Section 1: Options */}
            {filteredOptions.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-medium text-[var(--noether-text-muted,#666)] px-2.5 py-1">Options</div>
                {filteredOptions.map((item) => {
                  const isActive = !showAllOccurrences && (activeTab === item.id || (isTrashViewOpen && item.id === 'files')) && !fontPickerMode;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigateTab(item.id)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer transition-none ${
                        isActive
                          ? 'bg-[var(--noether-bg-sidebar-active,#252525)] text-[var(--noether-text-primary)] font-normal shadow-xs'
                          : 'text-[var(--noether-text-secondary,#999)] hover:bg-[var(--noether-bg-sidebar-hover,#202020)] hover:text-[var(--noether-text-primary)] font-normal'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted,#888)]'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 2: Core Extensions */}
            {filteredCoreExtensions.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-normal text-[var(--noether-text-muted,#666)] px-2.5 py-1">Core extensions</div>
                {filteredCoreExtensions.map((item) => {
                  const isActive = !showAllOccurrences && isTabMatch(item, activeTab) && !fontPickerMode && !isTrashViewOpen;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigateTab(item.id)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer transition-none ${
                        isActive
                          ? 'bg-[var(--noether-bg-sidebar-active,#252525)] text-[var(--noether-text-primary)] font-normal shadow-xs'
                          : 'text-[var(--noether-text-secondary,#999)] hover:bg-[var(--noether-bg-sidebar-hover,#202020)] hover:text-[var(--noether-text-primary)] font-normal'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted,#888)]'}>{item.icon || <PackageIcon size={14} />}</span>
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 3: Community Extensions Settings */}
            {filteredCommunityExtensions.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-normal text-[var(--noether-text-muted,#666)] px-2.5 py-1">Community extensions</div>
                {filteredCommunityExtensions.map((tab) => {
                  const isActive = !showAllOccurrences && isTabMatch(tab, activeTab) && !fontPickerMode && !isTrashViewOpen;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleNavigateTab(tab.id)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer transition-none ${
                        isActive
                          ? 'bg-[var(--noether-bg-sidebar-active,#252525)] text-[var(--noether-text-primary)] font-normal shadow-xs'
                          : 'text-[var(--noether-text-secondary,#999)] hover:bg-[var(--noether-bg-sidebar-hover,#202020)] hover:text-[var(--noether-text-primary)] font-normal'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted,#888)]'}>{tab.icon || <PuzzleIcon size={14} />}</span>
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Global Reset Action */}
          <div className="pt-2 mt-auto border-t border-[var(--noether-border-subtle,#242424)] shrink-0">
            <button
              onClick={() => {
                openConfirmDialog({
                  title: 'Restore All Defaults',
                  message: 'Are you sure you want to restore all settings and extension defaults?',
                  subtext: 'All appearance styles, editor preferences, keyboard shortcuts, interface configs, and extension settings will be reset to factory defaults. Your vault notes and files will remain untouched.',
                  confirmText: 'Restore all defaults',
                  isDanger: true,
                  showDontAskAgain: false,
                  onConfirm: async () => {
                    await app.restoreAllDefaults();
                    showToast('Restored all settings and extension defaults', 'info');
                  },
                });
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--noether-text-muted,#777)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-sidebar-hover,#202020)] cursor-pointer transition-none"
              title="Restore all settings across all tabs and extensions to default"
            >
              <RotateCcwIcon size={12} />
              <span>Restore all defaults</span>
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: Tab Content */}
        <main
          ref={mainScrollRef}
          className="flex-1 bg-[var(--noether-bg-main,#181818)] h-full overflow-y-auto custom-scrollbar p-6"
        >
          <div className="max-w-2xl mx-auto">
            <SettingsSearchContext.Provider value={{ searchQuery, showAllOccurrences }}>
              <Suspense fallback={<TabLoadingSpinner />}>
                {showAllOccurrences && searchQuery.trim() ? (
                  <div className="flex flex-col gap-6">
                    {hasAnyMatches ? (
                      <>
                        <GeneralTab />
                        <AppearanceTab onOpenFontPicker={handleOpenFontPicker} />
                        <InterfaceTab />
                        <EditorTab />
                        <FilesTab onOpenTrash={handleOpenTrash} />
                        <HotkeysTab />
                        <CoreExtensionsTab onNavigateTab={handleNavigateTab} onClose={handleClose} />
                        <CommunityExtensionsTab onNavigateTab={handleNavigateTab} onClose={handleClose} />
                      </>
                    ) : (
                      <div className="text-center py-16 flex flex-col items-center justify-center select-none gap-2 text-[#666] text-xs">
                        <Search01Icon size={32} className="opacity-40 mb-1" />
                        <span className="text-[13px] text-[#888] font-normal">No settings found</span>
                        <p className="text-xs text-[#666] max-w-sm leading-relaxed">
                          No settings matching &ldquo;<span className="text-[#888]">{searchQuery}</span>&rdquo; were found.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* SUB-VIEW: FONT PICKER */}
                    {fontPickerMode && (
                      <FontPickerView
                        mode={fontPickerMode}
                        onClose={handleCloseFontPicker}
                      />
                    )}

                    {/* SUB-VIEW: TRASH VIEWER */}
                    {isTrashViewOpen && (
                      <TrashView onClose={handleCloseTrash} />
                    )}

                    {/* TAB: GENERAL */}
                    {visitedTabs.has('general') && (
                      <div style={{ display: !fontPickerMode && !isTrashViewOpen && activeTab === 'general' ? 'block' : 'none' }}>
                        <GeneralTab />
                      </div>
                    )}

                    {/* TAB: APPEARANCE */}
                    {visitedTabs.has('appearance') && (
                      <div style={{ display: !fontPickerMode && !isTrashViewOpen && activeTab === 'appearance' ? 'block' : 'none' }}>
                        <AppearanceTab onOpenFontPicker={handleOpenFontPicker} />
                      </div>
                    )}

                    {/* TAB: INTERFACE */}
                    {visitedTabs.has('interface') && (
                      <div style={{ display: !fontPickerMode && !isTrashViewOpen && activeTab === 'interface' ? 'block' : 'none' }}>
                        <InterfaceTab />
                      </div>
                    )}

                    {/* TAB: EDITOR */}
                    {visitedTabs.has('editor') && (
                      <div style={{ display: !fontPickerMode && !isTrashViewOpen && activeTab === 'editor' ? 'block' : 'none' }}>
                        <EditorTab />
                      </div>
                    )}

                    {/* TAB: FILES AND LINKS */}
                    {visitedTabs.has('files') && (
                      <div style={{ display: !fontPickerMode && !isTrashViewOpen && activeTab === 'files' ? 'block' : 'none' }}>
                        <FilesTab onOpenTrash={handleOpenTrash} />
                      </div>
                    )}

                    {/* TAB: HOTKEYS */}
                    {visitedTabs.has('hotkeys') && (
                      <div style={{ display: !fontPickerMode && !isTrashViewOpen && activeTab === 'hotkeys' ? 'block' : 'none' }}>
                        <HotkeysTab />
                      </div>
                    )}

                    {/* TAB: CORE EXTENSIONS */}
                    {(visitedTabs.has('core-extensions') || visitedTabs.has('core-plugins')) && (
                      <div style={{ display: !fontPickerMode && !isTrashViewOpen && (activeTab === 'core-extensions' || activeTab === 'core-plugins') ? 'block' : 'none' }}>
                        <CoreExtensionsTab onNavigateTab={handleNavigateTab} onClose={handleClose} />
                      </div>
                    )}

                    {/* TAB: COMMUNITY EXTENSIONS */}
                    {(visitedTabs.has('community-extensions') || visitedTabs.has('community-plugins')) && (
                      <div style={{ display: !fontPickerMode && !isTrashViewOpen && (activeTab === 'community-extensions' || activeTab === 'community-plugins') ? 'block' : 'none' }}>
                        <CommunityExtensionsTab onNavigateTab={handleNavigateTab} onClose={handleClose} />
                      </div>
                    )}

                    {/* DYNAMIC EXTENSION SETTING TABS (CORE & COMMUNITY) */}
                    {visitedExtensionTabIds.map((tabId) => {
                      const currentTab =
                        allSettingTabs.find((t) => isTabMatch(t, tabId)) ||
                        coreExtensionTabs.find((t) => isTabMatch(t, tabId)) ||
                        communityExtensionTabs.find((t) => isTabMatch(t, tabId));
                      const candidateId = tabId.includes(':') ? tabId.split(':')[0] : tabId;
                      const manifest = currentTab
                        ? app.extensions.getExtensionManifest(currentTab.extensionId || currentTab.id.split(':')[0])
                        : (app.extensions.getExtensionManifest(candidateId) || app.extensions.getExtensionManifest(tabId));

                      if (!currentTab && !manifest) return null;

                      const extId = currentTab?.extensionId || manifest?.id || candidateId;
                      const isEnabled = extId ? app.extensions.isExtensionEnabled(extId) : false;
                      const tabName = manifest?.name || currentTab?.name || extId;
                      const isCurrentlyActive = !fontPickerMode && !isTrashViewOpen && isTabMatch(currentTab || { id: tabId }, activeTab);

                      return (
                        <div
                          key={currentTab?.id || tabId}
                          style={{ display: isCurrentlyActive ? 'flex' : 'none', flexDirection: 'column' }}
                          className="gap-6"
                        >
                          {/* Top Extension Header with Enabled Toggle */}
                          <div className="bg-[var(--noether-bg-card,#202020)] border border-[var(--noether-border-base,#2a2a2a)] rounded-xl p-3.5 flex items-center justify-between">
                            <div className="flex-1 pr-4">
                              <div className="flex items-baseline gap-2">
                                <span className="text-[13px] font-normal text-white">
                                  {tabName}
                                </span>
                                {manifest?.version && (
                                  <span className="text-[11px] text-[#777] font-normal">
                                    v{manifest.version}
                                  </span>
                                )}
                              </div>
                              {manifest?.description && (
                                <p className="text-[11px] text-[#777] mt-0.5 leading-relaxed">
                                  {manifest.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {currentTab?.onRestoreDefaults && isEnabled && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await currentTab.onRestoreDefaults?.();
                                    showToast(`Restored ${tabName} defaults`, 'info');
                                  }}
                                  title={`Restore default ${tabName} settings`}
                                  className="px-2.5 py-1 rounded-[5px] flex items-center gap-1.5 text-xs text-[#888] hover:text-white hover:bg-[#2a2a2a] cursor-pointer"
                                >
                                  <RotateCcwIcon size={12} />
                                  <span>Restore defaults</span>
                                </button>
                              )}
                              {manifest?.readme && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    localStorage.setItem('noether_open_extension_doc', JSON.stringify({ extensionId: extId, title: tabName, timestamp: Date.now() }));
                                    useWorkspaceStore.getState().openExtensionDocTab(extId, tabName);
                                    handleClose();
                                  }}
                                  title={`View ${tabName} documentation`}
                                  className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] cursor-pointer"
                                >
                                  <BookOpen01Icon size={14} />
                                </button>
                              )}
                              <ToggleSwitch
                                checked={isEnabled}
                                onChange={async (val) => {
                                  if (val) {
                                    await app.extensions.enableExtension(extId);
                                  } else {
                                    await app.extensions.disableExtension(extId);
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {/* Extension Setting Content */}
                          {!isEnabled ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-[#666] text-xs select-none">
                              <PuzzleIcon size={36} className="opacity-40 mb-1" />
                              <span className="text-[13px] text-[#888] font-normal">{tabName} is disabled</span>
                              <p className="text-xs text-[#666] max-w-sm leading-relaxed mb-1">
                                Enable this extension to configure its settings.
                              </p>
                              <button
                                type="button"
                                onClick={async () => {
                                  await app.extensions.enableExtension(extId);
                                }}
                                className="noether-btn noether-btn-primary text-xs cursor-pointer"
                              >
                                Enable {tabName}
                              </button>
                            </div>
                          ) : currentTab?.render ? (
                            currentTab.render()
                          ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-[#666] text-xs select-none">
                              <span className="text-[13px] text-[#888] font-normal">{tabName}</span>
                              <p className="text-xs text-[#666] max-w-sm leading-relaxed">
                                {manifest?.description || `${tabName} is enabled and active.`}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </Suspense>
            </SettingsSearchContext.Provider>
          </div>
        </main>
      </div>
    </div>
  );
});

export const SettingsWindow: React.FC<{ initialTab?: string }> = ({ initialTab }) => {
  return (
    <AppProvider app={appInstance}>
      <SettingsWindowContent initialTab={initialTab} />
    </AppProvider>
  );
};
