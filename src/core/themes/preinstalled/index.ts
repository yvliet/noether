import { ThemeDefinition } from '../types';
import { NOETHER_DARK_THEME, noetherDark } from './noetherDark';
import { NOETHER_LIGHT_THEME, noetherLight } from './noetherLight';

export {
  NOETHER_DARK_THEME,
  NOETHER_LIGHT_THEME,
  noetherDark,
  noetherLight,
};

/**
 * The sole core baseline theme required by the Noether engine as fallback.
 */
export const CORE_THEME: ThemeDefinition = NOETHER_DARK_THEME;

/**
 * All preinstalled modular themes shipped with Noether.
 */
export const PREINSTALLED_THEMES: ThemeDefinition[] = [
  NOETHER_DARK_THEME,
  NOETHER_LIGHT_THEME,
];
