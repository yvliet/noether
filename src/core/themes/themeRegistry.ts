import { ThemeDefinition, ThemeColorTokens } from './types';
import { CORE_THEME, PREINSTALLED_THEMES } from './preinstalled';

const CUSTOM_THEMES_STORAGE_KEY = 'noether_custom_themes_v1';

/**
 * Parses a hex (#rgb, #rgba, #rrggbb, #rrggbbaa) or rgb/rgba color string into RGB integers in range 0-255.
 */
export function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
  if (!color || typeof color !== 'string') return null;
  const str = color.trim();

  // Hex format (#rgb, #rgba, #rrggbb, #rrggbbaa)
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return { r, g, b };
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return { r, g, b };
    }
  }

  // Functional rgb/rgba format: rgb(r, g, b)
  const rgbMatch = str.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)));
    return { r, g, b };
  }

  return null;
}

/**
 * Formats RGB integers into a normalized 6-character hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const hex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * Derives a hover shade from an accent color.
 * For standard accents, darkens by 9%. For very dark accents, lightens by 18% to preserve contrast.
 */
export function deriveAccentHover(accent: string): string {
  const rgb = parseColorToRgb(accent);
  if (!rgb) return accent;
  const { r, g, b } = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < 0.25) {
    return rgbToHex(r + (255 - r) * 0.18, g + (255 - g) * 0.18, b + (255 - b) * 0.18);
  }
  return rgbToHex(r * 0.91, g * 0.91, b * 0.91);
}

/**
 * Derives an active shade from an accent color.
 * For standard accents, darkens by 22%. For very dark accents, lightens by 32% to preserve contrast.
 */
export function deriveAccentActive(accent: string): string {
  const rgb = parseColorToRgb(accent);
  if (!rgb) return accent;
  const { r, g, b } = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < 0.25) {
    return rgbToHex(r + (255 - r) * 0.32, g + (255 - g) * 0.32, b + (255 - b) * 0.32);
  }
  return rgbToHex(r * 0.78, g * 0.78, b * 0.78);
}

/**
 * Derives a subtle translucent background from an accent color.
 */
export function deriveAccentSubtle(accent: string, opacity: number = 0.15): string {
  const rgb = parseColorToRgb(accent);
  if (!rgb) return `${accent}26`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Derives a 2-stop linear gradient for buttons and active UI elements.
 */
export function deriveAccentGradient(accent: string): string {
  const rgb = parseColorToRgb(accent);
  if (!rgb) return `linear-gradient(135deg, ${accent} 0%, ${accent} 100%)`;
  const { r, g, b } = rgb;
  const lighter = rgbToHex(r + (255 - r) * 0.12, g + (255 - g) * 0.12, b + (255 - b) * 0.12);
  return `linear-gradient(135deg, ${accent} 0%, ${lighter} 100%)`;
}

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

    // Alias matches for standard theme IDs
    const aliasMap: Record<string, string> = {
      default: 'noether-dark',
      dark: 'noether-dark',
      'noether-dark': 'noether-dark',
      'noether dark': 'noether-dark',
      light: 'noether-light',
      'noether-light': 'noether-light',
      'noether light': 'noether-light',
    };

    const mapped = aliasMap[cleanId];
    if (mapped && this.preinstalledThemes.has(mapped)) {
      return this.preinstalledThemes.get(mapped)!;
    }

    // Fallback to core engine baseline theme (Noether Dark)
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
    const baseTheme = this.getTheme(isLight ? 'noether-light' : 'default');

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
   * Translates theme color tokens into a map of CSS variables.
   * When a custom accent is provided that differs from the theme base accent,
   * hover, active, subtle, and gradient tokens are dynamically derived from it
   * so interactive elements like links and filter pills stay true to the user chosen accent.
   */
  public generateCssVariables(
    tokens: ThemeColorTokens,
    customAccent?: string
  ): Record<string, string> {
    const trimmedCustom = customAccent?.trim();
    const isCustomAccent = Boolean(
      trimmedCustom &&
      trimmedCustom.toLowerCase() !== (tokens.accent || '').toLowerCase()
    );

    const accent = trimmedCustom || tokens.accent || '#eb584d';

    let accentHover: string;
    let accentActive: string;
    let accentSubtle: string;
    let accentGradient: string;

    if (isCustomAccent) {
      accentHover = deriveAccentHover(accent);
      accentActive = deriveAccentActive(accent);
      accentSubtle = deriveAccentSubtle(accent, 0.15);
      accentGradient = deriveAccentGradient(accent);
    } else {
      accentHover = tokens.accentHover || deriveAccentHover(accent);
      accentActive = tokens.accentActive || deriveAccentActive(accent);
      accentSubtle = tokens.accentSubtle || deriveAccentSubtle(accent, 0.15);
      accentGradient = tokens.accentGradient || deriveAccentGradient(accent);
    }

    const vars: Record<string, string> = {
      // Backgrounds
      '--noether-bg-app': tokens.bgApp,
      '--noether-bg-topbar': tokens.bgTopBar,
      '--noether-bg-ribbon': tokens.bgRibbon || tokens.bgSidebar,
      '--noether-bg-sidebar': tokens.bgSidebar,
      '--noether-bg-sidebar-hover': tokens.bgSidebarHover,
      '--noether-bg-sidebar-active': tokens.bgSidebarActive,
      '--noether-bg-main': tokens.bgMain,
      '--noether-bg-card': tokens.bgCard,
      '--noether-bg-card-hover': tokens.bgCardHover,
      '--noether-bg-popover': tokens.bgPopover || tokens.bgCard,
      '--noether-bg-input': tokens.bgInput,
      '--noether-bg-input-focus': tokens.bgInputFocus || tokens.bgCardHover,
      '--noether-bg-tab-active': tokens.bgTabActive || tokens.bgMain,
      '--noether-bg-tab-hover': tokens.bgTabHover || tokens.bgCardHover,
      '--noether-bg-tab-inactive': tokens.bgTabInactive || 'transparent',
      '--noether-tab-corner-fill': tokens.tabCornerFill || tokens.bgMain,
      '--noether-tab-corner-hover-fill': tokens.tabCornerHoverFill || tokens.bgCardHover,
      '--noether-bg-statusbar': tokens.bgStatusBar || tokens.bgCard,

      // Borders
      '--noether-border-subtle': tokens.borderSubtle,
      '--noether-border-base': tokens.borderBase,
      '--noether-border-strong': tokens.borderStrong,

      // Text
      '--noether-text-primary': tokens.textPrimary,
      '--noether-text-secondary': tokens.textSecondary,
      '--noether-text-muted': tokens.textMuted,
      '--noether-text-faint': tokens.textFaint,

      // Accents
      '--noether-accent': accent,
      '--noether-accent-hover': accentHover,
      '--noether-accent-active': accentActive,
      '--noether-accent-subtle': accentSubtle,
      '--noether-accent-gradient': accentGradient,

      // Selection & Code
      '--noether-selection-bg': tokens.selectionBg || '#4a4e57',
      '--noether-selection-text': tokens.selectionText || '#ffffff',
      '--noether-code-bg': tokens.codeBg || tokens.bgInput,
      '--noether-code-text': tokens.codeText || tokens.textSecondary,

      // Tooltips
      '--noether-tooltip-bg': tokens.tooltipBg || '#0d0d0d',
      '--noether-tooltip-text': tokens.tooltipText || tokens.textPrimary || '#ffffff',
      '--noether-tooltip-muted': tokens.tooltipMuted || tokens.textMuted || '#888888',
      '--noether-tooltip-border': tokens.tooltipBorder || tokens.borderBase || '#333333',

      // Shadows & Elevation
      '--noether-shadow-1': tokens.shadow1 || '0 1px 3px 0 rgba(0, 0, 0, 0.25)',
      '--noether-shadow-2': tokens.shadow2 || '0 4px 16px 0 rgba(0, 0, 0, 0.4)',
      '--noether-shadow-3': tokens.shadow3 || '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
    };

    // Gradients
    if (tokens.topBarGradient) {
      vars['--noether-bg-topbar-gradient'] = tokens.topBarGradient;
    } else {
      vars['--noether-bg-topbar-gradient'] = tokens.bgTopBar;
    }

    if (tokens.sidebarGradient) {
      vars['--noether-bg-sidebar-gradient'] = tokens.sidebarGradient;
    } else {
      vars['--noether-bg-sidebar-gradient'] = tokens.bgSidebar;
    }

    if (tokens.mainGradient) {
      vars['--noether-bg-main-gradient'] = tokens.mainGradient;
    } else {
      vars['--noether-bg-main-gradient'] = tokens.bgMain;
    }

    return vars;
  }
}

export const themeRegistry = new ThemeRegistry();
