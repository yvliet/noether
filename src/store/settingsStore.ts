import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { themeRegistry, ThemeDefinition } from '@/core/themes';
import { platform } from '@/lib/platform/platformAdapter';
import { bindFlintStores } from '@/core/app/storeBridge';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ThemePalette = string;
export type DocPropertiesMode = 'Visible' | 'Hidden' | 'Source';
export type DefaultTabMode = 'Editing view' | 'Reading view';
export type DefaultEditingMode = 'Live Preview' | 'Source mode';
export type NewNoteLocation = 'root' | 'same';
export type LinkFormat = 'shortest' | 'relative' | 'absolute';
export type TabSize = '2' | '3' | '4' | '5' | '6' | '7' | '8';

export interface SettingsState {
  // General
  autoUpdates: boolean;
  earlyAccess: boolean;
  language: string;

  // Appearance
  themeMode: ThemeMode;
  accentColor: string;
  highlightColor: string;
  colorHistory: string[];
  activeTheme: ThemePalette;
  interfaceFont: string;
  textFont: string;
  monospaceFont: string;
  fontSize: number;
  quickFontSize: boolean;

  // Interface
  showTabTitleBar: boolean;
  restoreTabs: boolean;
  showActionRail: boolean;
  showRibbon: boolean;
  zoomLevel: number;
  nativeMenus: boolean;
  windowFrameStyle: string;
  openSettingsInNewWindow: boolean;

  // Editor
  defaultTabMode: DefaultTabMode;
  defaultEditingMode: DefaultEditingMode;
  showModeInStatusBar: boolean;
  inlineTitle: boolean;
  readableLineLength: boolean;
  strictLineBreaks: boolean;
  propertiesInDoc: DocPropertiesMode;
  foldHeading: boolean;
  foldIndent: boolean;
  lineNumbers: boolean;
  indentationGuides: boolean;
  accentListPrefixes: boolean;
  autoPairing: boolean;
  tabSize: TabSize;

  // Files and Links
  skipDeleteConfirmation: boolean;
  skipRenameConfirmation: boolean;
  closeTabsOnDelete: boolean;
  newNoteLocation: NewNoteLocation;
  linkFormat: LinkFormat;
  autoUpdateLinks: boolean;
  attachmentFolder: string;
  showBrokenEmbedIndicators: boolean;

  // Hotkeys
  customHotkeys: Record<string, string>;

  // Setters
  setAutoUpdates: (val: boolean) => void;
  setEarlyAccess: (val: boolean) => void;
  setLanguage: (val: string) => void;
  setThemeMode: (val: ThemeMode) => void;
  setAccentColor: (val: string) => void;
  setHighlightColor: (val: string) => void;
  addColorHistory: (color: string) => void;
  setActiveTheme: (val: ThemePalette) => void;
  setInterfaceFont: (val: string) => void;
  setTextFont: (val: string) => void;
  setMonospaceFont: (val: string) => void;
  setFontSize: (val: number) => void;
  setQuickFontSize: (val: boolean) => void;
  setShowTabTitleBar: (val: boolean) => void;
  setRestoreTabs: (val: boolean) => void;
  setShowActionRail: (val: boolean) => void;
  setShowRibbon: (val: boolean) => void;
  setZoomLevel: (val: number, applyNow?: boolean) => void;
  setNativeMenus: (val: boolean) => void;
  setWindowFrameStyle: (val: string) => void;
  setOpenSettingsInNewWindow: (val: boolean) => void;
  setDefaultTabMode: (val: DefaultTabMode) => void;
  setDefaultEditingMode: (val: DefaultEditingMode) => void;
  setShowModeInStatusBar: (val: boolean) => void;
  setInlineTitle: (val: boolean) => void;
  setReadableLineLength: (val: boolean) => void;
  setStrictLineBreaks: (val: boolean) => void;
  setPropertiesInDoc: (val: DocPropertiesMode) => void;
  setFoldHeading: (val: boolean) => void;
  setFoldIndent: (val: boolean) => void;
  setLineNumbers: (val: boolean) => void;
  setIndentationGuides: (val: boolean) => void;
  setAccentListPrefixes: (val: boolean) => void;
  setAutoPairing: (val: boolean) => void;
  setTabSize: (val: TabSize) => void;
  setSkipDeleteConfirmation: (val: boolean) => void;
  setSkipRenameConfirmation: (val: boolean) => void;
  setCloseTabsOnDelete: (val: boolean) => void;
  setNewNoteLocation: (val: NewNoteLocation) => void;
  setLinkFormat: (val: LinkFormat) => void;
  setAutoUpdateLinks: (val: boolean) => void;
  setAttachmentFolder: (folder: string) => void;
  setShowBrokenEmbedIndicators: (val: boolean) => void;
  setCustomHotkey: (commandId: string, hotkey: string) => void;
  resetCustomHotkey: (commandId: string) => void;
  resetAllHotkeys: () => void;

  restoreAllDefaults: () => void;
  restoreTabDefaults: (tabId: string) => void;
}

export const DEFAULT_SETTINGS = {
  autoUpdates: true,
  earlyAccess: false,
  language: 'English',

  themeMode: 'dark' as ThemeMode,
  accentColor: '#ea580c',
  highlightColor: '#ffd54f',
  colorHistory: ['#ffd54f', '#86efac', '#67e8f9', '#93c5fd', '#d8b4fe', '#f472b6', '#fb923c', '#f87171'],
  activeTheme: 'default' as ThemePalette,
  interfaceFont: '',
  textFont: '',
  monospaceFont: '',
  fontSize: 16,
  quickFontSize: false,

  showTabTitleBar: true,
  restoreTabs: true,
  showActionRail: true,
  showRibbon: true,
  zoomLevel: 100,
  nativeMenus: false,
  windowFrameStyle: 'Hidden (default)',
  openSettingsInNewWindow: true,

  defaultTabMode: 'Editing view' as DefaultTabMode,
  defaultEditingMode: 'Live Preview' as DefaultEditingMode,
  showModeInStatusBar: true,
  inlineTitle: true,
  readableLineLength: true,
  strictLineBreaks: false,
  propertiesInDoc: 'Visible' as DocPropertiesMode,
  foldHeading: true,
  foldIndent: true,
  lineNumbers: false,
  indentationGuides: true,
  accentListPrefixes: false,
  autoPairing: true,
  tabSize: '5' as TabSize,

  skipDeleteConfirmation: false,
  skipRenameConfirmation: false,
  closeTabsOnDelete: true,
  newNoteLocation: 'root' as NewNoteLocation,
  linkFormat: 'shortest' as LinkFormat,
  autoUpdateLinks: true,
  attachmentFolder: '',
  showBrokenEmbedIndicators: true,

  customHotkeys: {} as Record<string, string>,
};

let appearanceRaf: number | null = null;
let pendingAppearanceSettings: Partial<SettingsState> | undefined = undefined;

interface AppearanceCache {
  themeId?: string;
  themeMode?: string;
  customCss?: string;
  interfaceFont?: string;
  textFont?: string;
  monospaceFont?: string;
  fontSize?: number;
  zoomLevel?: number;
  language?: string;
}

const appliedAppearanceCache: AppearanceCache = {};

function runApplyAppearanceDOM(current: Partial<SettingsState>) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // 1. Get Theme definition
  const rawThemeId = current.activeTheme || 'default';
  const baseThemeDef = themeRegistry.getTheme(rawThemeId);

  // 2. Determine Dark vs Light mode:
  // If user selected an explicit light theme (e.g. 'flint-light'), prioritize light.
  // Otherwise, respect explicit themeMode ('light', 'dark', 'system').
  let isDark = baseThemeDef.type === 'dark';
  if (current.themeMode === 'light') {
    isDark = false;
  } else if (current.themeMode === 'dark') {
    isDark = baseThemeDef.type === 'light' ? false : true;
  } else if (current.themeMode === 'system') {
    isDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? (baseThemeDef.type === 'dark');
  }

  // 3. Resolve effective Theme definition
  let themeDef = baseThemeDef;
  if (!isDark && baseThemeDef.type === 'dark') {
    themeDef = themeRegistry.getTheme('flint-light');
  } else if (isDark && baseThemeDef.type === 'light') {
    themeDef = themeRegistry.getTheme('default');
  }

  const themeModeKey = `${current.themeMode}_${isDark}`;
  if (appliedAppearanceCache.themeMode !== themeModeKey) {
    appliedAppearanceCache.themeMode = themeModeKey;
    if (isDark) {
      root.classList.add('theme-dark', 'dark');
      root.classList.remove('theme-light', 'light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('theme-light', 'light');
      root.classList.remove('theme-dark', 'dark');
      root.style.colorScheme = 'light';
    }
  }

  // 4. Generate & Apply All Theme CSS Variables (only when theme, mode, or accent changed)
  const themeKey = `${themeDef.id}_${isDark ? 'dark' : 'light'}_${current.accentColor}`;
  if (appliedAppearanceCache.themeId !== themeKey) {
    appliedAppearanceCache.themeId = themeKey;
    const cssVars = themeRegistry.generateCssVariables(themeDef.variables, current.accentColor);
    Object.entries(cssVars).forEach(([prop, val]) => {
      if (val !== undefined) {
        root.style.setProperty(prop, val);
      }
    });

    const effectiveAccent = current.accentColor || themeDef.variables.accent || '#ea580c';
    platform.setAccentIcon(effectiveAccent);

    root.setAttribute('data-theme', themeDef.id);
    root.setAttribute('data-theme-type', themeDef.type);
    if (themeDef.hasGradient) {
      root.setAttribute('data-theme-gradient', 'true');
    } else {
      root.removeAttribute('data-theme-gradient');
    }
  }

  // 5. Injected Custom Theme CSS
  if (appliedAppearanceCache.customCss !== (themeDef.customCss || '')) {
    appliedAppearanceCache.customCss = themeDef.customCss || '';
    let customStyleEl = document.getElementById('flint-theme-custom-css') as HTMLStyleElement | null;
    if (themeDef.customCss) {
      if (!customStyleEl) {
        customStyleEl = document.createElement('style');
        customStyleEl.id = 'flint-theme-custom-css';
        document.head.appendChild(customStyleEl);
      }
      customStyleEl.textContent = themeDef.customCss;
    } else if (customStyleEl) {
      customStyleEl.remove();
    }
  }

  // 6. Fonts
  if (appliedAppearanceCache.interfaceFont !== current.interfaceFont) {
    appliedAppearanceCache.interfaceFont = current.interfaceFont;
    if (current.interfaceFont) {
      root.style.setProperty('--font-interface', `"${current.interfaceFont}", var(--font-interface-fallback)`);
    } else {
      root.style.removeProperty('--font-interface');
    }
  }

  if (appliedAppearanceCache.textFont !== current.textFont) {
    appliedAppearanceCache.textFont = current.textFont;
    if (current.textFont) {
      root.style.setProperty('--font-text', `"${current.textFont}", var(--font-text-fallback)`);
    } else {
      root.style.removeProperty('--font-text');
    }
  }

  if (appliedAppearanceCache.monospaceFont !== current.monospaceFont) {
    appliedAppearanceCache.monospaceFont = current.monospaceFont;
    if (current.monospaceFont) {
      root.style.setProperty('--font-monospace', `"${current.monospaceFont}", var(--font-monospace-fallback)`);
    } else {
      root.style.removeProperty('--font-monospace');
    }
  }

  // 7. Font size
  if (appliedAppearanceCache.fontSize !== current.fontSize) {
    appliedAppearanceCache.fontSize = current.fontSize;
    const fs = current.fontSize || 16;
    root.style.setProperty('--editor-font-size', `${fs}px`);
  }

  // 8. Zoom level (clamped safely between 50% and 200%)
  if (appliedAppearanceCache.zoomLevel !== current.zoomLevel) {
    appliedAppearanceCache.zoomLevel = current.zoomLevel;
    const clampedZoom = Math.min(200, Math.max(50, current.zoomLevel || 100));
    const zoomFactor = clampedZoom / 100;
    platform.setZoomFactor(zoomFactor);
  }

  // 9. Language
  if (current.language && appliedAppearanceCache.language !== current.language) {
    appliedAppearanceCache.language = current.language;
    const langMap: Record<string, string> = {
      English: 'en',
      German: 'de',
      Spanish: 'es',
      French: 'fr',
      Japanese: 'ja',
    };
    root.lang = langMap[current.language] || 'en';
  }
}

// Helper: Apply appearance settings directly to the DOM (batched with requestAnimationFrame)
export function applyAppearanceDOM(settings?: Partial<SettingsState>) {
  if (typeof document === 'undefined') return;

  const current = settings || useSettingsStore.getState();
  pendingAppearanceSettings = { ...(pendingAppearanceSettings || {}), ...current };

  if (typeof requestAnimationFrame !== 'undefined') {
    if (appearanceRaf !== null) {
      cancelAnimationFrame(appearanceRaf);
    }
    appearanceRaf = requestAnimationFrame(() => {
      appearanceRaf = null;
      if (pendingAppearanceSettings) {
        const toApply = pendingAppearanceSettings;
        pendingAppearanceSettings = undefined;
        runApplyAppearanceDOM(toApply);
      }
    });
  } else {
    runApplyAppearanceDOM(current);
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      setAutoUpdates: (autoUpdates) => set({ autoUpdates }),
      setEarlyAccess: (earlyAccess) => set({ earlyAccess }),
      setLanguage: (language) => {
        set({ language });
        applyAppearanceDOM({ ...get(), language });
      },

      setThemeMode: (themeMode) => {
        let activeTheme = get().activeTheme;
        if (themeMode === 'light') {
          if (!activeTheme || activeTheme === 'default' || themeRegistry.getTheme(activeTheme).type === 'dark') {
            activeTheme = 'flint-light';
          }
        } else if (themeMode === 'dark') {
          if (activeTheme === 'flint-light' || themeRegistry.getTheme(activeTheme).type === 'light') {
            activeTheme = 'default';
          }
        }
        set({ themeMode, activeTheme });
        applyAppearanceDOM({ ...get(), themeMode, activeTheme });
      },
      setAccentColor: (accentColor) => {
        set({ accentColor });
        applyAppearanceDOM({ ...get(), accentColor });
      },
      setHighlightColor: (highlightColor) => {
        set({ highlightColor });
      },
      addColorHistory: (color) => {
        if (!color) return;
        const clean = color.trim();
        const current = get().colorHistory || DEFAULT_SETTINGS.colorHistory;
        const next = [clean, ...current.filter((c) => c.toLowerCase() !== clean.toLowerCase())].slice(0, 16);
        set({ colorHistory: next });
      },
      setActiveTheme: (activeTheme) => {
        const themeDef = themeRegistry.getTheme(activeTheme);
        const nextMode: ThemeMode = themeDef.type === 'light' ? 'light' : 'dark';
        set({ activeTheme, themeMode: nextMode });
        applyAppearanceDOM({ ...get(), activeTheme, themeMode: nextMode });
      },
      setInterfaceFont: (interfaceFont) => {
        set({ interfaceFont });
        applyAppearanceDOM({ ...get(), interfaceFont });
      },
      setTextFont: (textFont) => {
        set({ textFont });
        applyAppearanceDOM({ ...get(), textFont });
      },
      setMonospaceFont: (monospaceFont) => {
        set({ monospaceFont });
        applyAppearanceDOM({ ...get(), monospaceFont });
      },
      setFontSize: (fontSize) => {
        set({ fontSize });
        applyAppearanceDOM({ ...get(), fontSize });
      },
      setQuickFontSize: (quickFontSize) => set({ quickFontSize }),

      setShowTabTitleBar: (showTabTitleBar) => set({ showTabTitleBar }),
      setRestoreTabs: (restoreTabs) => {
        set({ restoreTabs });
        if (typeof window !== 'undefined' && !restoreTabs) {
          try {
            // If disabled, remove saved tabs session for all vaults / default
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith('flint_workspace_tabs_v1')) {
                localStorage.removeItem(key);
              }
            });
          } catch (e) {}
        }
      },
      setShowActionRail: (showActionRail) => set({ showActionRail, showRibbon: showActionRail }),
      setShowRibbon: (showRibbon) => set({ showActionRail: showRibbon, showRibbon }),
      setZoomLevel: (val, applyNow = true) => {
        const zoomLevel = Math.min(200, Math.max(50, val));
        set({ zoomLevel });
        if (applyNow) {
          applyAppearanceDOM({ ...get(), zoomLevel });
        }
      },
      setNativeMenus: (nativeMenus) => set({ nativeMenus }),
      setWindowFrameStyle: (windowFrameStyle) => set({ windowFrameStyle }),
      setOpenSettingsInNewWindow: (openSettingsInNewWindow) => set({ openSettingsInNewWindow }),

      setDefaultTabMode: (defaultTabMode) => set({ defaultTabMode }),
      setDefaultEditingMode: (defaultEditingMode) => set({ defaultEditingMode }),
      setShowModeInStatusBar: (showModeInStatusBar) => set({ showModeInStatusBar }),
      setInlineTitle: (inlineTitle) => set({ inlineTitle }),
      setReadableLineLength: (readableLineLength) => set({ readableLineLength }),
      setStrictLineBreaks: (strictLineBreaks) => set({ strictLineBreaks }),
      setPropertiesInDoc: (propertiesInDoc) => set({ propertiesInDoc }),
      setFoldHeading: (foldHeading) => set({ foldHeading }),
      setFoldIndent: (foldIndent) => set({ foldIndent }),
      setLineNumbers: (lineNumbers) => set({ lineNumbers }),
      setIndentationGuides: (indentationGuides) => set({ indentationGuides }),
      setAccentListPrefixes: (accentListPrefixes) => set({ accentListPrefixes }),
      setAutoPairing: (autoPairing) => set({ autoPairing }),
      setTabSize: (tabSize) => set({ tabSize }),

      setSkipDeleteConfirmation: (skipDeleteConfirmation) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('flint_skip_delete_confirmation', skipDeleteConfirmation ? 'true' : 'false');
        }
        set({ skipDeleteConfirmation });
      },
      setSkipRenameConfirmation: (skipRenameConfirmation) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('flint_skip_rename_confirmation', skipRenameConfirmation ? 'true' : 'false');
        }
        set({ skipRenameConfirmation });
      },
      setCloseTabsOnDelete: (closeTabsOnDelete) => set({ closeTabsOnDelete }),
      setNewNoteLocation: (newNoteLocation) => set({ newNoteLocation }),
      setLinkFormat: (linkFormat) => set({ linkFormat }),
      setAutoUpdateLinks: (autoUpdateLinks) => set({ autoUpdateLinks }),
      setAttachmentFolder: (attachmentFolder) => set({ attachmentFolder }),
      setShowBrokenEmbedIndicators: (showBrokenEmbedIndicators) => set({ showBrokenEmbedIndicators }),

      setCustomHotkey: (commandId, hotkey) =>
        set((state) => ({
          customHotkeys: { ...state.customHotkeys, [commandId]: hotkey },
        })),
      resetCustomHotkey: (commandId) =>
        set((state) => {
          const next = { ...state.customHotkeys };
          delete next[commandId];
          return { customHotkeys: next };
        }),
      resetAllHotkeys: () => set({ customHotkeys: {} }),
      restoreAllDefaults: () => {
        set({ ...DEFAULT_SETTINGS });
        applyAppearanceDOM(DEFAULT_SETTINGS);
      },
      restoreTabDefaults: (tabId: string) => {
        if (tabId === 'general') {
          set({
            autoUpdates: DEFAULT_SETTINGS.autoUpdates,
            earlyAccess: DEFAULT_SETTINGS.earlyAccess,
            language: DEFAULT_SETTINGS.language,
          });
          applyAppearanceDOM({ ...get(), language: DEFAULT_SETTINGS.language });
        } else if (tabId === 'appearance') {
          set({
            themeMode: DEFAULT_SETTINGS.themeMode,
            accentColor: DEFAULT_SETTINGS.accentColor,
            activeTheme: DEFAULT_SETTINGS.activeTheme,
            interfaceFont: DEFAULT_SETTINGS.interfaceFont,
            textFont: DEFAULT_SETTINGS.textFont,
            monospaceFont: DEFAULT_SETTINGS.monospaceFont,
            fontSize: DEFAULT_SETTINGS.fontSize,
            quickFontSize: DEFAULT_SETTINGS.quickFontSize,
          });
          applyAppearanceDOM({
            ...get(),
            themeMode: DEFAULT_SETTINGS.themeMode,
            accentColor: DEFAULT_SETTINGS.accentColor,
            activeTheme: DEFAULT_SETTINGS.activeTheme,
            interfaceFont: DEFAULT_SETTINGS.interfaceFont,
            textFont: DEFAULT_SETTINGS.textFont,
            monospaceFont: DEFAULT_SETTINGS.monospaceFont,
            fontSize: DEFAULT_SETTINGS.fontSize,
          });
        } else if (tabId === 'interface') {
          set({
            showTabTitleBar: DEFAULT_SETTINGS.showTabTitleBar,
            restoreTabs: DEFAULT_SETTINGS.restoreTabs,
            showRibbon: DEFAULT_SETTINGS.showRibbon,
            zoomLevel: DEFAULT_SETTINGS.zoomLevel,
            nativeMenus: DEFAULT_SETTINGS.nativeMenus,
            windowFrameStyle: DEFAULT_SETTINGS.windowFrameStyle,
            openSettingsInNewWindow: DEFAULT_SETTINGS.openSettingsInNewWindow,
          });
        } else if (tabId === 'editor') {
          set({
            defaultTabMode: DEFAULT_SETTINGS.defaultTabMode,
            defaultEditingMode: DEFAULT_SETTINGS.defaultEditingMode,
            showModeInStatusBar: DEFAULT_SETTINGS.showModeInStatusBar,
            inlineTitle: DEFAULT_SETTINGS.inlineTitle,
            readableLineLength: DEFAULT_SETTINGS.readableLineLength,
            strictLineBreaks: DEFAULT_SETTINGS.strictLineBreaks,
            propertiesInDoc: DEFAULT_SETTINGS.propertiesInDoc,
            foldHeading: DEFAULT_SETTINGS.foldHeading,
            foldIndent: DEFAULT_SETTINGS.foldIndent,
            lineNumbers: DEFAULT_SETTINGS.lineNumbers,
            indentationGuides: DEFAULT_SETTINGS.indentationGuides,
            accentListPrefixes: DEFAULT_SETTINGS.accentListPrefixes,
            autoPairing: DEFAULT_SETTINGS.autoPairing,
            tabSize: DEFAULT_SETTINGS.tabSize,
          });
        } else if (tabId === 'files') {
          if (typeof window !== 'undefined') {
            localStorage.setItem('flint_skip_delete_confirmation', 'false');
            localStorage.setItem('flint_skip_rename_confirmation', 'false');
          }
          set({
            skipDeleteConfirmation: DEFAULT_SETTINGS.skipDeleteConfirmation,
            skipRenameConfirmation: DEFAULT_SETTINGS.skipRenameConfirmation,
            closeTabsOnDelete: DEFAULT_SETTINGS.closeTabsOnDelete,
            newNoteLocation: DEFAULT_SETTINGS.newNoteLocation,
            linkFormat: DEFAULT_SETTINGS.linkFormat,
            autoUpdateLinks: DEFAULT_SETTINGS.autoUpdateLinks,
            showBrokenEmbedIndicators: DEFAULT_SETTINGS.showBrokenEmbedIndicators,
          });
        } else if (tabId === 'hotkeys') {
          set({ customHotkeys: {} });
        }
      },
    }),
    {
      name: 'flint_app_settings_v1',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.fontSize || state.fontSize === 12) {
            state.fontSize = 16;
          }
          applyAppearanceDOM(state);
          const skipDel = state.skipDeleteConfirmation ?? false;
          const skipRen = state.skipRenameConfirmation ?? false;
          if (typeof window !== 'undefined') {
            localStorage.setItem('flint_skip_delete_confirmation', skipDel ? 'true' : 'false');
            localStorage.setItem('flint_skip_rename_confirmation', skipRen ? 'true' : 'false');
          }
        }
      },
    }
  )
);

// Cross-window storage synchronizer for multi-window electron setups
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'flint_app_settings_v1' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed.state) {
          const current = useSettingsStore.getState();
          const isDifferent = Object.keys(parsed.state).some(
            (k) => (parsed.state as any)[k] !== (current as any)[k]
          );
          if (isDifferent) {
            useSettingsStore.setState(parsed.state);
            applyAppearanceDOM(parsed.state);
            const skipDel = parsed.state.skipDeleteConfirmation ?? false;
            const skipRen = parsed.state.skipRenameConfirmation ?? false;
            localStorage.setItem('flint_skip_delete_confirmation', skipDel ? 'true' : 'false');
            localStorage.setItem('flint_skip_rename_confirmation', skipRen ? 'true' : 'false');
          }
        }
      } catch (e) {
        console.error('[SettingsStore] Failed to sync storage event across windows', e);
      }
    }
  });

  // Also listen for system color scheme changes if in 'system' mode
  window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener('change', () => {
    const current = useSettingsStore.getState();
    if (current.themeMode === 'system') {
      applyAppearanceDOM(current);
    }
  });
}

bindFlintStores({ settings: useSettingsStore });

