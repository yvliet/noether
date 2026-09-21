import React, { useState, useMemo, useCallback, useContext } from 'react';
import {
  Search01Icon,
  PlusSignIcon,
  Download01Icon,
  SparklesIcon,
  ChevronRightIcon,
  CheckIcon,
  Delete02Icon,
  FolderOpenIcon,
  Moon02Icon,
  Sun02Icon,
  ComputerIcon,
} from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { Slider } from '@/components/common/Slider';
import { ColorPicker } from '@/components/common/ColorPicker';
import { CustomSelect } from '@/components/common/CustomSelect';
import { themeRegistry, ThemeDefinition } from '@/core/themes';
import {
  useSettingsStore,
  DEFAULT_SETTINGS,
  ThemeMode,
} from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { platform } from '@/lib/platform/platformAdapter';
import {
  SettingRow,
  SettingSection,
  FieldResetButton,
  highlightMatch,
  SettingsSearchContext,
} from '../shared/SettingRow';

interface ThemeCardProps {
  theme: ThemeDefinition;
  isActive: boolean;
  themeMode: ThemeMode;
  accentColor: string;
  onSelect: (themeId: string, name: string) => void;
  onDelete?: (themeId: string, name: string) => void;
}

const ThemeCard: React.FC<ThemeCardProps> = React.memo(({
  theme,
  isActive,
  themeMode,
  accentColor,
  onSelect,
  onDelete,
}) => {
  const cardMode: 'dark' | 'light' = useMemo(() => {
    if (theme.modeSupport === 'dark-only') return 'dark';
    if (theme.modeSupport === 'light-only') return 'light';
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches === false
      ? 'light'
      : 'dark';
  }, [theme.modeSupport, themeMode]);

  const v = useMemo(() => themeRegistry.resolveThemeTokens(theme, cardMode), [theme, cardMode]);
  const modeSupport = theme.modeSupport || (theme.type === 'light' ? 'light-only' : 'both');

  return (
    <div
      onClick={() => onSelect(theme.id, theme.name)}
      className={`group relative flex flex-col rounded-xl overflow-hidden border cursor-pointer select-none transition-none ${
        isActive
          ? 'bg-[var(--noether-bg-card-hover,#242424)] border-[var(--noether-accent)] ring-1 ring-[var(--noether-accent)] shadow-md'
          : 'bg-[var(--noether-bg-card,#1e1e1e)] border-[var(--noether-border-base,#2a2a2a)] hover:border-[var(--noether-border-strong,#3a3a3a)] hover:bg-[var(--noether-bg-card-hover,#222222)]'
      }`}
    >
      {/* Top UI Preview Banner */}
      <div
        className="h-14 relative w-full flex flex-col p-1.5 overflow-hidden"
        style={{
          background: v.topBarGradient || v.bgTopBar || '#111',
        }}
      >
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <div
            className="ml-2 px-2 py-0.5 rounded-t text-[9px] font-medium"
            style={{
              background: v.bgTabActive || v.bgMain || '#1e1e1e',
              color: v.textPrimary || '#fff',
            }}
          >
            Tab
          </div>
        </div>

        <div className="flex-1 flex gap-1 mt-1 rounded overflow-hidden">
          <div
            className="w-1/4 h-full rounded-sm"
            style={{
              background: v.sidebarGradient || v.bgSidebar || '#141414',
            }}
          />
          <div
            className="flex-1 h-full rounded-sm flex items-center justify-between px-2"
            style={{
              background: v.mainGradient || v.bgMain || '#1e1e1e',
            }}
          >
            <div
              className="w-12 h-1 rounded"
              style={{ background: v.borderBase || 'rgba(255,255,255,0.1)' }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full shadow-xs"
              style={{ background: accentColor || v.accent || '#eb584d' }}
            />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-2">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--noether-text-primary)] group-hover:text-[var(--noether-accent)]">
              {theme.name}
            </span>
            <div className="flex items-center gap-1.5">
              {theme.hasGradient && (
                <span className="text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                  Gradient
                </span>
              )}
              <span
                className={`text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded ${
                  modeSupport === 'light-only'
                    ? 'bg-amber-950/50 text-amber-300 border border-amber-800/30'
                    : modeSupport === 'dark-only'
                      ? 'bg-zinc-800 text-zinc-300 border border-zinc-700/50'
                      : 'bg-blue-950/50 text-blue-300 border border-blue-800/30'
                }`}
              >
                {modeSupport === 'both' ? 'Dark & Light' : modeSupport === 'dark-only' ? 'Dark only' : 'Light only'}
              </span>
            </div>
          </div>

          {theme.description && (
            <p className="text-[11px] text-[var(--noether-text-muted)] mt-0.5 line-clamp-1">
              {theme.description}
            </p>
          )}
        </div>

        {/* Card Footer: Status & Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--noether-border-subtle,#262626)]">
          <span className="text-[10px] text-[var(--noether-text-muted,#666)]">
            By {theme.author || 'Noether'}
          </span>

          <div className="flex items-center gap-1.5">
            {!theme.isBuiltIn && !theme.isPreinstalled && !theme.isCore && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(theme.id, theme.name);
                }}
                title="Delete custom theme"
                className="p-1 text-[var(--noether-text-muted)] hover:text-rose-400 hover:bg-[var(--noether-btn-hover-bg)] rounded cursor-pointer"
              >
                <Delete02Icon size={13} />
              </button>
            )}

            {isActive ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--noether-accent)]">
                <CheckIcon size={12} />
                <span>Active</span>
              </span>
            ) : (
              <span className="text-[11px] text-[var(--noether-text-muted,#777)] group-hover:text-[var(--noether-text-primary,#ccc)]">
                Click to apply
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export interface AppearanceTabProps {
  onOpenFontPicker: (mode: 'interface' | 'text' | 'monospace') => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = React.memo(({ onOpenFontPicker }) => {
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const activeTheme = useSettingsStore((s) => s.activeTheme);
  const setActiveTheme = useSettingsStore((s) => s.setActiveTheme);
  const interfaceFont = useSettingsStore((s) => s.interfaceFont);
  const setInterfaceFont = useSettingsStore((s) => s.setInterfaceFont);
  const textFont = useSettingsStore((s) => s.textFont);
  const setTextFont = useSettingsStore((s) => s.setTextFont);
  const monospaceFont = useSettingsStore((s) => s.monospaceFont);
  const setMonospaceFont = useSettingsStore((s) => s.setMonospaceFont);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const quickFontSize = useSettingsStore((s) => s.quickFontSize);
  const setQuickFontSize = useSettingsStore((s) => s.setQuickFontSize);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);

  // Theme Manager state
  const [themeFilter, setThemeFilter] = useState<'all' | 'both' | 'dark' | 'light' | 'custom'>('all');
  const [themeSearchQuery, setThemeSearchQuery] = useState('');
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);
  const [isImportingTheme, setIsImportingTheme] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [themesVersion, setThemesVersion] = useState(0);

  // Custom Theme Form fields
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeModeSupport, setNewThemeModeSupport] = useState<'both' | 'dark-only' | 'light-only'>('both');
  const [newThemeType, setNewThemeType] = useState<'dark' | 'light'>('dark');
  const [newThemeHasGradient, setNewThemeHasGradient] = useState(false);
  const [newThemeTopbar, setNewThemeTopbar] = useState('#0d0d0d');
  const [newThemeTopbarGradient, setNewThemeTopbarGradient] = useState('linear-gradient(135deg, #090616 0%, #170d38 50%, #22104a 100%)');
  const [newThemeSidebar, setNewThemeSidebar] = useState('#151515');
  const [newThemeMain, setNewThemeMain] = useState('#1c1c1c');
  const [newThemeCard, setNewThemeCard] = useState('#222222');
  const [newThemeAccent, setNewThemeAccent] = useState('#eb584d');
  const [newThemeCss, setNewThemeCss] = useState('');

  const allThemes = useMemo(() => {
    return themeRegistry.getAllThemes();
  }, [themesVersion]);

  const filteredThemes = useMemo(() => {
    return allThemes.filter((theme) => {
      const modeSupport = theme.modeSupport || (theme.type === 'light' ? 'light-only' : 'both');
      if (themeFilter === 'both' && modeSupport !== 'both') return false;
      if (themeFilter === 'dark' && modeSupport !== 'dark-only') return false;
      if (themeFilter === 'light' && modeSupport !== 'light-only') return false;
      if (themeFilter === 'custom' && (theme.isBuiltIn || theme.isPreinstalled || theme.isCore)) return false;

      if (themeSearchQuery.trim()) {
        const q = themeSearchQuery.toLowerCase();
        return (
          theme.name.toLowerCase().includes(q) ||
          (theme.description && theme.description.toLowerCase().includes(q)) ||
          (theme.author && theme.author.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allThemes, themeFilter, themeSearchQuery]);

  const isAppearanceModified =
    themeMode !== DEFAULT_SETTINGS.themeMode ||
    accentColor !== DEFAULT_SETTINGS.accentColor ||
    activeTheme !== DEFAULT_SETTINGS.activeTheme ||
    interfaceFont !== DEFAULT_SETTINGS.interfaceFont ||
    textFont !== DEFAULT_SETTINGS.textFont ||
    monospaceFont !== DEFAULT_SETTINGS.monospaceFont ||
    fontSize !== DEFAULT_SETTINGS.fontSize ||
    quickFontSize !== DEFAULT_SETTINGS.quickFontSize;

  const isThemeSearchMatch = useMemo(() => {
    if (!showAllOccurrences || !searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      'theme'.includes(q) ||
      'themes'.includes(q) ||
      'appearance'.includes(q) ||
      allThemes.some(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      )
    );
  }, [showAllOccurrences, searchQuery, allThemes]);

  const handleOpenExtensionsFolder = useCallback(() => {
    if (platform.isDesktop()) {
      platform.openExtensionsFolder();
    } else {
      showToast('Extensions folder: .noether/extensions/ inside vault', 'info');
    }
  }, [showToast]);

  const handleSelectTheme = useCallback((themeId: string, _name: string) => {
    setActiveTheme(themeId);
  }, [setActiveTheme]);

  const handleDeleteTheme = useCallback((themeId: string, name: string) => {
    openConfirmDialog({
      title: 'Delete Custom Theme',
      message: `Are you sure you want to delete the custom theme "${name}"?`,
      subtext: 'This will permanently remove the theme definition from your vault.',
      confirmText: 'Delete Theme',
      isDanger: true,
      showDontAskAgain: false,
      onConfirm: () => {
        themeRegistry.deleteCustomTheme(themeId);
        setThemesVersion((prev) => prev + 1);
        if (activeTheme === themeId) setActiveTheme('default');
        showToast(`Deleted theme "${name}"`, 'info');
      },
    });
  }, [activeTheme, openConfirmDialog, setActiveTheme, showToast]);

  return (
    <div className="flex flex-col gap-6">
      {/* Section 1: Colors & Lighting */}
      <SettingSection
        title="Colors & Lighting"
        description="Interface illumination mode, custom accent color, and palette highlights."
        tabName="Appearance"
        sectionName="Colors"
        isModified={isAppearanceModified}
        onReset={() => {
          restoreTabDefaults('appearance');
          showToast('Restored Appearance settings to default', 'info');
        }}
        resetTitle="Restore default appearance settings"
      >
        {/* Row: Lighting Mode */}
        <SettingRow
          title="Lighting mode"
          description={
            <div className="flex flex-col">
              <span>{highlightMatch('Switch between dark, light, or automatic system appearance.', searchQuery)}</span>
            </div>
          }
          descriptionText="Switch between dark, light, or automatic system appearance."
          keywords={['lighting', 'mode', 'dark', 'light', 'system', 'appearance']}
          resetButton={
            <FieldResetButton
              isModified={themeMode !== DEFAULT_SETTINGS.themeMode}
              onReset={() => setThemeMode(DEFAULT_SETTINGS.themeMode)}
              title="Restore default lighting mode (dark)"
            />
          }
        >
          <div className="flex items-center p-0.5 rounded-lg bg-[var(--noether-bg-input,#181818)] border border-[var(--noether-border-base,#292929)] select-none">
            {[
              { id: 'dark', label: 'Dark', icon: <Moon02Icon size={13} /> },
              { id: 'light', label: 'Light', icon: <Sun02Icon size={13} /> },
              { id: 'system', label: 'System', icon: <ComputerIcon size={13} /> },
            ].map((opt) => {
              const isSelected = themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setThemeMode(opt.id as ThemeMode);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-none ${
                    isSelected
                      ? 'bg-[var(--noether-bg-card,#252525)] text-[var(--noether-text-primary,#ffffff)] shadow-xs border border-[var(--noether-border-subtle,transparent)]'
                      : 'text-[var(--noether-text-muted,#888888)] hover:text-[var(--noether-text-primary,#ffffff)] hover:bg-[var(--noether-btn-hover-bg)]'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </SettingRow>

        <SettingRow
          title="Accent color"
          description={
            <div className="flex flex-col">
              <span>{highlightMatch('Choose the primary accent highlight color.', searchQuery)}</span>
              <div className="flex items-center gap-1.5 mt-2.5">
                {[
                  { name: 'Noether Coral', color: '#eb584d' },
                  { name: 'Electric Blue', color: '#3b82f6' },
                  { name: 'Emerald Green', color: '#10b981' },
                  { name: 'Amethyst', color: '#8b5cf6' },
                  { name: 'Rose', color: '#ec4899' },
                  { name: 'Cyan Sea', color: '#06b6d4' },
                  { name: 'Amber', color: '#f59e0b' },
                  { name: 'Nord Frost', color: '#88c0d0' },
                ].map((swatch) => (
                  <button
                    key={swatch.color}
                    onClick={() => setAccentColor(swatch.color)}
                    title={swatch.name}
                    className={`w-5 h-5 rounded-full border cursor-pointer ${
                      accentColor.toLowerCase() === swatch.color.toLowerCase()
                        ? 'scale-125 border-white ring-2 ring-white/20'
                        : 'border-black/30 hover:scale-110'
                    }`}
                    style={{ backgroundColor: swatch.color }}
                  />
                ))}
              </div>
            </div>
          }
          descriptionText="Choose the primary accent highlight color."
          keywords={['accent', 'color', 'highlight', 'picker']}
          resetButton={
            <FieldResetButton
              isModified={accentColor !== DEFAULT_SETTINGS.accentColor}
              onReset={() => setAccentColor(DEFAULT_SETTINGS.accentColor)}
              title="Restore default accent color"
            />
          }
        >
          <ColorPicker value={accentColor} onChange={setAccentColor} />
        </SettingRow>
      </SettingSection>

      {/* Section 2: Themes Grid */}
      {isThemeSearchMatch && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--noether-text-primary)] mb-0.5">Themes</h3>
              <p className="text-[11px] text-[var(--noether-text-muted)]">
                Browse preinstalled themes, import JSON palettes, or craft custom color combinations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportingTheme(true)}
                className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
                title="Import Theme JSON"
              >
                <Download01Icon size={12} />
                <span>Import JSON</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingTheme(true)}
                className="noether-btn noether-btn-primary text-xs py-1 px-2.5 flex items-center gap-1.5"
              >
                <PlusSignIcon size={12} />
                <span>Create Theme</span>
              </button>
            </div>
          </div>

          {/* Theme Filters & Search */}
          <div className="px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'both', label: 'Adaptive' },
                { id: 'dark', label: 'Dark only' },
                { id: 'light', label: 'Light only' },
                { id: 'custom', label: 'Custom' },
              ].map((tab) => {
                const isSelected = themeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setThemeFilter(tab.id as any)}
                    className={`px-2.5 py-1 text-xs rounded-[5px] cursor-pointer shadow-xs transition-none ${
                      isSelected
                        ? 'bg-[var(--noether-bg-input,#2a2a2a)] text-[var(--noether-text-primary)] font-medium border border-[var(--noether-border-strong,#383838)]'
                        : 'bg-[var(--noether-bg-card,#181818)] text-[var(--noether-text-muted,#888)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-btn-hover-bg)] border border-[var(--noether-border-base,#282828)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 bg-[var(--noether-bg-input,#161616)] px-2 py-1 rounded-md border border-[var(--noether-border-base,#282828)] w-48">
              <Search01Icon size={12} className="text-[var(--noether-text-muted,#666)] shrink-0" />
              <input
                type="text"
                value={themeSearchQuery}
                onChange={(e) => setThemeSearchQuery(e.target.value)}
                placeholder="Search themes..."
                className="bg-transparent outline-none text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)] w-full"
              />
            </div>
          </div>

          {/* Theme Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredThemes.map((theme) => {
              const normalizedActive = (activeTheme || 'default').toLowerCase();
              const isActive =
                normalizedActive === theme.id.toLowerCase() ||
                ((normalizedActive === 'noether-dark' || normalizedActive === 'noether-light' || normalizedActive === 'default') && theme.id === 'noether');

              return (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={isActive}
                  themeMode={themeMode}
                  accentColor={accentColor}
                  onSelect={handleSelectTheme}
                  onDelete={handleDeleteTheme}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: CSS Snippets */}
      <SettingSection
        title="CSS Snippets"
        description="Manage custom CSS styling files and granular appearance overrides."
        tabName="Appearance"
        sectionName="CSS snippets"
      >
        <SettingRow
          title="CSS snippets"
          description="Manage your custom CSS snippet files for granular appearance modifications."
          keywords={['css', 'snippets', 'custom', 'styles']}
          onClick={handleOpenExtensionsFolder}
        >
          <div className="flex items-center gap-1 text-xs text-[#888]">
            <FolderOpenIcon size={14} className="mr-1" />
            <span>Open Snippets Folder</span>
            <ChevronRightIcon size={14} />
          </div>
        </SettingRow>
      </SettingSection>

      {/* Modal: Create Custom Theme */}
      {isCreatingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#1c1c1c] border border-[#333] rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-xs text-[#dcddde]">
            <div className="flex items-center justify-between pb-2 border-b border-[#282828]">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <SparklesIcon size={16} className="text-[var(--noether-accent)]" />
                <span>Create Custom Theme</span>
              </h4>
              <button
                onClick={() => setIsCreatingTheme(false)}
                className="text-[#777] hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Live Theme Preview Strip */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-[#888] font-medium uppercase tracking-wider">
                Live Palette Preview
              </span>
              <div
                className="h-16 rounded-lg border border-[#333] p-2 flex flex-col justify-between overflow-hidden"
                style={{
                  background: newThemeHasGradient ? newThemeTopbarGradient : newThemeTopbar,
                }}
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <div
                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: newThemeMain, color: '#fff' }}
                  >
                    Tab
                  </div>
                </div>
                <div className="flex gap-1.5 h-6">
                  <div
                    className="w-16 rounded flex items-center justify-center text-[9px] text-white/50"
                    style={{ background: newThemeSidebar }}
                  >
                    Sidebar
                  </div>
                  <div
                    className="flex-1 rounded flex items-center justify-between px-2 text-[9px] text-white/50"
                    style={{ background: newThemeMain }}
                  >
                    <span>Canvas</span>
                    <div
                      className="w-3 h-3 rounded-full shadow-xs"
                      style={{ background: newThemeAccent }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#888]">Theme Name</label>
                <input
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="e.g. Neon Emerald"
                  className="bg-[#141414] border border-[#2a2a2a] focus:border-[var(--noether-accent)] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#888]">Lighting Mode Support</label>
                <CustomSelect
                  value={newThemeModeSupport}
                  onChange={(val) => {
                    const mode = val as 'both' | 'dark-only' | 'light-only';
                    setNewThemeModeSupport(mode);
                    setNewThemeType(mode === 'light-only' ? 'light' : 'dark');
                  }}
                  options={[
                    { value: 'both', label: 'Dark & Light' },
                    { value: 'dark-only', label: 'Dark only' },
                    { value: 'light-only', label: 'Light only' },
                  ]}
                  className="w-full"
                  buttonClassName="w-full justify-between"
                />
              </div>
            </div>

            {/* Gradient Toggle */}
            <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
              <div className="flex flex-col">
                <span className="text-xs text-white">Enable Top Bar Gradient</span>
                <span className="text-[10px] text-[#666]">
                  Use a custom linear gradient for the top navigation bar.
                </span>
              </div>
              <ToggleSwitch
                checked={newThemeHasGradient}
                onChange={setNewThemeHasGradient}
              />
            </div>

            {newThemeHasGradient && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#888]">Top Bar Gradient CSS</label>
                <input
                  type="text"
                  value={newThemeTopbarGradient}
                  onChange={(e) => setNewThemeTopbarGradient(e.target.value)}
                  placeholder="linear-gradient(135deg, ...)"
                  className="bg-[#141414] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                />
              </div>
            )}

            {/* Color Palette Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
                <span className="text-xs">Top Bar Color</span>
                <ColorPicker value={newThemeTopbar} onChange={setNewThemeTopbar} />
              </div>
              <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
                <span className="text-xs">Sidebar Color</span>
                <ColorPicker value={newThemeSidebar} onChange={setNewThemeSidebar} />
              </div>
              <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
                <span className="text-xs">Main Canvas</span>
                <ColorPicker value={newThemeMain} onChange={setNewThemeMain} />
              </div>
              <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
                <span className="text-xs">Accent Color</span>
                <ColorPicker value={newThemeAccent} onChange={setNewThemeAccent} />
              </div>
            </div>

            {/* Custom CSS (optional) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#888]">Custom CSS Snippet (Optional)</label>
              <textarea
                rows={2}
                value={newThemeCss}
                onChange={(e) => setNewThemeCss(e.target.value)}
                placeholder=".cm-editor { ... }"
                className="bg-[#141414] border border-[#2a2a2a] rounded p-2 text-xs text-white font-mono outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#282828]">
              <button
                type="button"
                onClick={() => setIsCreatingTheme(false)}
                className="noether-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newThemeName.trim()) {
                    showToast('Please specify a theme name', 'warning');
                    return;
                  }
                  const themeId = `custom-${Date.now()}`;
                  const customDef = themeRegistry.createCustomThemeDefinition({
                    id: themeId,
                    name: newThemeName.trim(),
                    modeSupport: newThemeModeSupport,
                    type: newThemeModeSupport === 'light-only' ? 'light' : 'dark',
                    hasGradient: newThemeHasGradient,
                    author: 'You',
                    description: 'Custom user defined theme',
                    variables: {
                      bgTopBar: newThemeTopbar,
                      topBarGradient: newThemeHasGradient ? newThemeTopbarGradient : undefined,
                      bgSidebar: newThemeSidebar,
                      bgMain: newThemeMain,
                      bgCard: newThemeCard,
                      accent: newThemeAccent,
                      tabCornerFill: newThemeMain,
                      tabCornerHoverFill: newThemeCard,
                    },
                    customCss: newThemeCss.trim() || undefined,
                  });
                  themeRegistry.registerCustomTheme(customDef);
                  setThemesVersion((prev) => prev + 1);
                  setActiveTheme(themeId);
                  setIsCreatingTheme(false);
                  showToast(`Created & applied theme "${newThemeName}"`, 'success');
                }}
                className="noether-btn noether-btn-primary"
              >
                Save & Apply Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Import Theme JSON */}
      {isImportingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#1c1c1c] border border-[#333] rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-xs text-[#dcddde]">
            <div className="flex items-center justify-between pb-2 border-b border-[#282828]">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Download01Icon size={16} className="text-[var(--noether-accent)]" />
                <span>Import Theme JSON</span>
              </h4>
              <button
                onClick={() => setIsImportingTheme(false)}
                className="text-[#777] hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#888]">Paste Theme JSON Specification:</label>
              <textarea
                rows={6}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"name": "My Theme", "type": "dark", "variables": { ... }}'
                className="bg-[#141414] border border-[#2a2a2a] rounded p-2.5 text-xs text-white font-mono outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#282828]">
              <button
                type="button"
                onClick={() => setIsImportingTheme(false)}
                className="noether-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const imported = themeRegistry.importTheme(importJsonText);
                  if (imported) {
                    setThemesVersion((prev) => prev + 1);
                    setActiveTheme(imported.id);
                    setIsImportingTheme(false);
                    setImportJsonText('');
                    showToast(`Imported & applied theme "${imported.name}"`, 'success');
                  } else {
                    showToast('Invalid theme JSON format', 'warning');
                  }
                }}
                className="noether-btn noether-btn-primary"
              >
                Import & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Typography & Scaling */}
      <SettingSection
        title="Typography & Scaling"
        description="Custom font families for UI, reading, and code blocks alongside base sizing."
        tabName="Appearance"
        sectionName="Font"
      >
        <SettingRow
          title="Interface font"
          description="Set base font for all of Noether."
          keywords={['font', 'interface', 'system font', 'typography']}
          onClick={() => onOpenFontPicker('interface')}
          resetButton={
            <FieldResetButton
              isModified={interfaceFont !== DEFAULT_SETTINGS.interfaceFont}
              onReset={() => setInterfaceFont(DEFAULT_SETTINGS.interfaceFont)}
              title="Restore default interface font (System font)"
            />
          }
        >
          <div className="flex items-center gap-2 text-xs text-[#888]">
            {interfaceFont && <span className="text-white font-medium">{interfaceFont}</span>}
            <ChevronRightIcon size={14} />
          </div>
        </SettingRow>

        <SettingRow
          title="Text font"
          description="Set font for editing and reading views."
          keywords={['font', 'text', 'reading', 'typography']}
          onClick={() => onOpenFontPicker('text')}
          resetButton={
            <FieldResetButton
              isModified={textFont !== DEFAULT_SETTINGS.textFont}
              onReset={() => setTextFont(DEFAULT_SETTINGS.textFont)}
              title="Restore default text font"
            />
          }
        >
          <div className="flex items-center gap-2 text-xs text-[#888]">
            {textFont && <span className="text-white font-medium">{textFont}</span>}
            <ChevronRightIcon size={14} />
          </div>
        </SettingRow>

        <SettingRow
          title="Monospace font"
          description="Set font for places like code blocks and frontmatter."
          keywords={['font', 'code', 'monospace', 'mono']}
          onClick={() => onOpenFontPicker('monospace')}
          resetButton={
            <FieldResetButton
              isModified={monospaceFont !== DEFAULT_SETTINGS.monospaceFont}
              onReset={() => setMonospaceFont(DEFAULT_SETTINGS.monospaceFont)}
              title="Restore default monospace font"
            />
          }
        >
          <div className="flex items-center gap-2 text-xs text-[#888]">
            {monospaceFont && <span className="text-white font-medium">{monospaceFont}</span>}
            <ChevronRightIcon size={14} />
          </div>
        </SettingRow>

        <SettingRow
          title="Font size"
          description="Font size in pixels that affects editing and reading views."
          keywords={['font', 'size', 'pixels', 'zoom']}
          resetButton={
            <FieldResetButton
              isModified={fontSize !== DEFAULT_SETTINGS.fontSize}
              onReset={() => setFontSize(DEFAULT_SETTINGS.fontSize)}
              title="Restore default font size (16px)"
            />
          }
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#dcddde] w-4 text-right font-normal">{fontSize}</span>
            <Slider
              min={12}
              max={24}
              value={fontSize}
              onChange={setFontSize}
              className="w-28"
            />
          </div>
        </SettingRow>

        <SettingRow
          title="Quick font size adjustment"
          description="Adjust the font size using Ctrl + Scroll, or using the trackpad pinch-zoom gesture."
          keywords={['scroll', 'zoom', 'wheel', 'font', 'trackpad', 'pinch']}
          resetButton={
            <FieldResetButton
              isModified={quickFontSize !== DEFAULT_SETTINGS.quickFontSize}
              onReset={() => setQuickFontSize(DEFAULT_SETTINGS.quickFontSize)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={quickFontSize} onChange={setQuickFontSize} />
        </SettingRow>
      </SettingSection>

      {/* Section 5: Advanced Customization */}
      <SettingSection
        title="Advanced Customization"
        description="Custom desktop application icon branding."
        tabName="Appearance"
        sectionName="Advanced"
      >
        <SettingRow
          title="Custom app icon"
          description="Set a custom icon for the app."
          keywords={['app icon', 'icon', 'logo', 'custom']}
        >
          <button
            onClick={() => {}}
            className="noether-btn"
          >
            Choose
          </button>
        </SettingRow>
      </SettingSection>
    </div>
  );
});
