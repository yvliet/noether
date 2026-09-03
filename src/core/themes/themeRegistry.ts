import { ThemeDefinition, ThemeColorTokens } from './types';
import { CORE_THEME, PREINSTALLED_THEMES } from './preinstalled';

const CUSTOM_THEMES_STORAGE_KEY = 'flint_custom_themes_v1';

class ThemeRegistry {
  private coreTheme: ThemeDefinition = CORE_THEME;
  private preinstalledThemes: Map<string, ThemeDefinition> = new Map();
  private customThemes: Map<string, ThemeDefinition> = new Map();
  private isLoaded = false;

  constructor() {
    this.preinstalledThemes.set(this.coreTheme.id.toLowerCase(), this.coreTheme);
    PREINSTALLED_THEMES.forEach((theme) => {
      this.preinstalledThemes.set(theme.id.toLowerCase(), theme);
    });
  }

  private loadCustomThemes() {
    if (this.isLoaded || typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((theme: ThemeDefinition) => {
            if (theme && theme.id) {
              this.customThemes.set(theme.id.toLowerCase(), {
                ...theme,
                isBuiltIn: false,
                isPreinstalled: false,
                isCore: false,
              });
            }
          });
        }
      }
    } catch (e) {
      console.error('[ThemeRegistry] Failed to load custom themes from storage', e);
    }
    this.isLoaded = true;
  }

  private saveCustomThemes() {
    if (typeof window === 'undefined') return;
    try {
      const arr = Array.from(this.customThemes.values());
      localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.error('[ThemeRegistry] Failed to save custom themes to storage', e);
    }
  }

  public getAllThemes(): ThemeDefinition[] {
    this.loadCustomThemes();
    const preinstalled = Array.from(this.preinstalledThemes.values());
    const customs = Array.from(this.customThemes.values());
    return [...preinstalled, ...customs];
  }

  public getTheme(id: string): ThemeDefinition {
    this.loadCustomThemes();
    const cleanId = (id || 'default').toLowerCase();

    // Direct match
    if (this.preinstalledThemes.has(cleanId)) {
      return this.preinstalledThemes.get(cleanId)!;
    }
    if (this.customThemes.has(cleanId)) {
      return this.customThemes.get(cleanId)!;
    }

    // Alias matches for standard and legacy theme IDs
    const aliasMap: Record<string, string> = {
      default: 'default',
      dark: 'default',
      'flint-dark': 'default',
      'flint dark': 'default',
      light: 'flint-light',
      'flint-light': 'flint-light',
      'flint light': 'flint-light',
    };

    const mapped = aliasMap[cleanId];
    if (mapped && this.preinstalledThemes.has(mapped)) {
      return this.preinstalledThemes.get(mapped)!;
    }

    // Fallback to core engine baseline theme (Flint Dark)
    return this.coreTheme;
  }

  public registerCustomTheme(theme: ThemeDefinition): boolean {
    this.loadCustomThemes();
    if (!theme.id || !theme.name) return false;
    const cleanId = theme.id.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    this.customThemes.set(cleanId, {
      ...theme,
      id: cleanId,
      isCore: false,
      isPreinstalled: false,
      isBuiltIn: false,
    });
    this.saveCustomThemes();
    return true;
  }

  public deleteCustomTheme(id: string): boolean {
    this.loadCustomThemes();
    const cleanId = id.toLowerCase();
    if (this.preinstalledThemes.has(cleanId)) {
      return false; // Cannot delete preinstalled or core themes
    }
    const existed = this.customThemes.delete(cleanId);
    if (existed) {
      this.saveCustomThemes();
    }
    return existed;
  }

  public exportTheme(themeOrId: string | ThemeDefinition): string {
    const theme = typeof themeOrId === 'string' ? this.getTheme(themeOrId) : themeOrId;
    return JSON.stringify(theme, null, 2);
  }

  public createCustomThemeDefinition(params: {
    id: string;
    name: string;
    type: 'dark' | 'light';
    hasGradient?: boolean;
    author?: string;
    description?: string;
    variables: Partial<ThemeColorTokens> & {
      bgTopBar: string;
      bgSidebar: string;
      bgMain: string;
      accent: string;
    };
    customCss?: string;
  }): ThemeDefinition {
    const isLight = params.type === 'light';
    const baseTheme = this.getTheme(isLight ? 'flint-light' : 'default');

    const fullTokens: ThemeColorTokens = {
      ...baseTheme.variables,
      ...params.variables,
      bgApp: params.variables.bgSidebar || baseTheme.variables.bgApp,
      bgRibbon: params.variables.bgSidebar || baseTheme.variables.bgRibbon,
      bgTopBar: params.variables.bgTopBar,
      bgSidebar: params.variables.bgSidebar,
      bgMain: params.variables.bgMain,
      bgCard: params.variables.bgCard || (isLight ? '#ffffff' : '#222222'),
      bgCardHover: params.variables.bgCardHover || (isLight ? '#f4f4f5' : '#282828'),
      bgPopover: params.variables.bgPopover || (isLight ? '#ffffff' : '#242424'),
      bgInput: params.variables.bgInput || (isLight ? '#f4f4f5' : '#141414'),
      bgTabActive: params.variables.bgTabActive || params.variables.bgMain,
      bgTabHover: params.variables.bgTabHover || (isLight ? '#e4e4e7' : '#262626'),
      tabCornerFill: params.variables.tabCornerFill || params.variables.bgMain,
      tabCornerHoverFill: params.variables.tabCornerHoverFill || (isLight ? '#e4e4e7' : '#262626'),
      accent: params.variables.accent,
      topBarGradient: params.variables.topBarGradient,
      sidebarGradient: params.variables.sidebarGradient,
      mainGradient: params.variables.mainGradient,
    };

    return {
      id: params.id,
      name: params.name,
      type: params.type,
      hasGradient: !!params.hasGradient,
      isBuiltIn: false,
      author: params.author || 'User',
      description: params.description || 'Custom theme',
      previewColors: [
        params.variables.bgTopBar,
        params.variables.bgSidebar,
        params.variables.bgMain,
        params.variables.accent,
      ],
      variables: fullTokens,
      customCss: params.customCss,
    };
  }

  public importTheme(jsonString: string): ThemeDefinition | null {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.name || !parsed.variables) {
        throw new Error('Invalid theme format');
      }
      const id = (parsed.id || parsed.name.toLowerCase().replace(/\s+/g, '-')).toLowerCase();
      const newTheme = this.createCustomThemeDefinition({
        id,
        name: parsed.name,
        type: parsed.type === 'light' ? 'light' : 'dark',
        hasGradient: !!parsed.hasGradient,
        author: parsed.author || 'Imported',
        description: parsed.description || 'Custom imported theme',
        variables: parsed.variables,
        customCss: parsed.customCss || '',
      });
      this.registerCustomTheme(newTheme);
      return newTheme;
    } catch (e) {
      console.error('[ThemeRegistry] Import theme error', e);
      return null;
    }
  }

  /**
   * Translates theme color tokens into a map of CSS variables
   */
  public generateCssVariables(
    tokens: ThemeColorTokens,
    customAccent?: string
  ): Record<string, string> {
    const accent = customAccent || tokens.accent || '#ea580c';
    const accentHover = tokens.accentHover || accent;
    const accentActive = tokens.accentActive || accent;
    const accentSubtle = tokens.accentSubtle || `${accent}25`;
    const accentGradient = tokens.accentGradient || `linear-gradient(135deg, ${accent} 0%, ${accentHover} 100%)`;

    const vars: Record<string, string> = {
      // Backgrounds
      '--flint-bg-app': tokens.bgApp,
      '--flint-bg-topbar': tokens.bgTopBar,
      '--flint-bg-ribbon': tokens.bgRibbon || tokens.bgSidebar,
      '--flint-bg-sidebar': tokens.bgSidebar,
      '--flint-bg-sidebar-hover': tokens.bgSidebarHover,
      '--flint-bg-sidebar-active': tokens.bgSidebarActive,
      '--flint-bg-main': tokens.bgMain,
      '--flint-bg-card': tokens.bgCard,
      '--flint-bg-card-hover': tokens.bgCardHover,
      '--flint-bg-popover': tokens.bgPopover || tokens.bgCard,
      '--flint-bg-input': tokens.bgInput,
      '--flint-bg-input-focus': tokens.bgInputFocus || tokens.bgCardHover,
      '--flint-bg-tab-active': tokens.bgTabActive || tokens.bgMain,
      '--flint-bg-tab-hover': tokens.bgTabHover || tokens.bgCardHover,
      '--flint-bg-tab-inactive': tokens.bgTabInactive || 'transparent',
      '--flint-tab-corner-fill': tokens.tabCornerFill || tokens.bgMain,
      '--flint-tab-corner-hover-fill': tokens.tabCornerHoverFill || tokens.bgCardHover,
      '--flint-bg-statusbar': tokens.bgStatusBar || tokens.bgCard,

      // Borders
      '--flint-border-subtle': tokens.borderSubtle,
      '--flint-border-base': tokens.borderBase,
      '--flint-border-strong': tokens.borderStrong,

      // Text
      '--flint-text-primary': tokens.textPrimary,
      '--flint-text-secondary': tokens.textSecondary,
      '--flint-text-muted': tokens.textMuted,
      '--flint-text-faint': tokens.textFaint,

      // Accents
      '--flint-accent': accent,
      '--flint-accent-hover': accentHover,
      '--flint-accent-active': accentActive,
      '--flint-accent-subtle': accentSubtle,
      '--flint-accent-gradient': accentGradient,

      // Selection & Code
      '--flint-selection-bg': tokens.selectionBg || '#4a4e57',
      '--flint-selection-text': tokens.selectionText || '#ffffff',
      '--flint-code-bg': tokens.codeBg || tokens.bgInput,
      '--flint-code-text': tokens.codeText || tokens.textSecondary,

      // Tooltips
      '--flint-tooltip-bg': tokens.tooltipBg || (tokens.bgCardHover ? tokens.bgCardHover : '#1a1a1a'),
      '--flint-tooltip-text': tokens.tooltipText || tokens.textPrimary || '#ffffff',
      '--flint-tooltip-muted': tokens.tooltipMuted || tokens.textMuted || '#888888',
      '--flint-tooltip-border': tokens.tooltipBorder || tokens.borderBase || '#333333',

      // Shadows & Elevation
      '--flint-shadow-1': tokens.shadow1 || '0 1px 3px 0 rgba(0, 0, 0, 0.25)',
      '--flint-shadow-2': tokens.shadow2 || '0 4px 16px 0 rgba(0, 0, 0, 0.4)',
      '--flint-shadow-3': tokens.shadow3 || '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
    };

    // Gradients
    if (tokens.topBarGradient) {
      vars['--flint-bg-topbar-gradient'] = tokens.topBarGradient;
    } else {
      vars['--flint-bg-topbar-gradient'] = tokens.bgTopBar;
    }

    if (tokens.sidebarGradient) {
      vars['--flint-bg-sidebar-gradient'] = tokens.sidebarGradient;
    } else {
      vars['--flint-bg-sidebar-gradient'] = tokens.bgSidebar;
    }

    if (tokens.mainGradient) {
      vars['--flint-bg-main-gradient'] = tokens.mainGradient;
    } else {
      vars['--flint-bg-main-gradient'] = tokens.bgMain;
    }

    return vars;
  }
}

export const themeRegistry = new ThemeRegistry();
