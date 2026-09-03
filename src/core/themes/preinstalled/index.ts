import { ThemeDefinition } from '../types';
import { FLINT_DARK_THEME } from './flintDark';
import { FLINT_LIGHT_THEME } from './flintLight';

export {
  FLINT_DARK_THEME,
  FLINT_LIGHT_THEME,
};

/**
 * The sole core baseline theme required by the Flint engine as fallback.
 */
export const CORE_THEME: ThemeDefinition = FLINT_DARK_THEME;

/**
 * All preinstalled modular themes shipped with Flint.
 */
export const PREINSTALLED_THEMES: ThemeDefinition[] = [
  FLINT_DARK_THEME,
  FLINT_LIGHT_THEME,
];
