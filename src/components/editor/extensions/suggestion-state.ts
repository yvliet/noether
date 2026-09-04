/**
 * @module SuggestionState
 * @description
 * Utility to query whether an autocomplete suggestion popup (WikiLinks or SlashCommands)
 * is currently active. Used by keyboard shortcut handlers (such as list renumbering and smart tabs)
 * to yield keypresses like Enter and Tab directly to the suggestion popup renderer.
 */

import { WikiLinkPluginKey } from './wikilink';
import { SlashCommandPluginKey } from './slash-command';

/**
 * Checks whether any suggestion popup (WikiLinks or SlashCommands) is currently active.
 * Combines ProseMirror plugin state verification with a DOM query fallback for maximum reliability.
 */
export function isSuggestionActive(state?: any): boolean {
  if (state) {
    try {
      const isWikiActive = Boolean(WikiLinkPluginKey.getState(state)?.active);
      const isSlashActive = Boolean(SlashCommandPluginKey.getState(state)?.active);
      if (isWikiActive || isSlashActive) {
        return true;
      }
    } catch {
      // Ignore if state resolution fails
    }
  }

  if (typeof document !== 'undefined') {
    return Boolean(document.querySelector('[data-flint-suggestion-popup="true"]'));
  }

  return false;
}
