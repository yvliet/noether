export type ThemeType = 'dark' | 'light';
export type ThemeLightingSupport = 'both' | 'dark-only' | 'light-only';
export type ThemeLightingMode = 'system' | 'dark' | 'light';

export interface ThemeColorTokens {
  // Surface / Background tokens
  bgApp: string;
  bgTopBar: string;
  bgRibbon: string;
  bgSidebar: string;
  bgSidebarHover: string;
  bgSidebarActive: string;
  bgMain: string;
  bgCard: string;
  bgCardHover: string;
  bgPopover: string;
  bgInput: string;
  bgInputFocus?: string;
  bgTabActive: string;
  bgTabHover?: string;
  bgTabInactive?: string;
  tabCornerFill: string;
  tabCornerHoverFill?: string;
  bgStatusBar?: string;

  // Button interactive tokens
  btnHoverBg?: string;
  btnActiveBg?: string;

  // Border tokens
  borderSubtle: string;
  borderBase: string;
  borderStrong: string;

  // Text / Foreground tokens
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;

  // Accent tokens
  accent: string;
  accentHover?: string;
  accentActive?: string;
  accentSubtle?: string;
  accentGradient?: string;

  // Optional Gradient overlays
  topBarGradient?: string;
  sidebarGradient?: string;
  mainGradient?: string;

  // Selection & Scrollbars
  selectionBg?: string;
  selectionText?: string;
  scrollbarThumb?: string;
  scrollbarThumbHover?: string;

  // Code / Editor tokens
  codeBg?: string;
  codeText?: string;

  // Tooltip tokens
  tooltipBg?: string;
  tooltipText?: string;
  tooltipMuted?: string;
  tooltipBorder?: string;

  // Elevation / Shadow tokens
  shadow1?: string;
  shadow2?: string;
  shadow3?: string;

  // Extensible custom tokens
  [key: string]: string | undefined;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description?: string;
  author?: string;
  /**
   * Declares whether this theme supports both Dark and Light variants,
   * or is strictly dark-only or light-only.
   */
  modeSupport: ThemeLightingSupport;
  /**
   * Legacy theme type indicator ('dark' | 'light') maintained for backward compatibility.
   */
  type?: ThemeType;
  isCore?: boolean;
  isPreinstalled?: boolean;
  isBuiltIn?: boolean;
  hasGradient?: boolean;
  /** Default (or Dark) preview swatches: [Topbar, Sidebar, Canvas, Accent] */
  previewColors: [string, string, string, string];
  /** Optional Light mode preview swatches for themes supporting 'both' */
  previewColorsLight?: [string, string, string, string];
  /** Baseline tokens (defaults to Dark tokens for dual themes) */
  variables: ThemeColorTokens;
  /**
   * Mode-specific overrides merged into `variables` when the corresponding
   * lighting mode is active.
   */
  modes?: {
    dark?: Partial<ThemeColorTokens>;
    light?: Partial<ThemeColorTokens>;
  };
  customCss?: string;
}
