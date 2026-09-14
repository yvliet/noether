import { ThemeDefinition } from '../types';
import { NOETHER_THEME, noetherTheme } from './noether';

export {
  NOETHER_THEME,
  noetherTheme,
};

/**
 * The sole core baseline theme required by the Noether engine as fallback.
 * Supports both Dark and Light variants seamlessly.
 */
export const CORE_THEME: ThemeDefinition = NOETHER_THEME;

/**
 * All preinstalled modular themes shipped with Noether.
 */
export const PREINSTALLED_THEMES: ThemeDefinition[] = [
  NOETHER_THEME,
];

