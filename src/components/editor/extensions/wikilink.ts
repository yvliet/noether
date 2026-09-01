import { Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

export interface WikiLinkItem {
  id: string;
  title: string;
  isNew?: boolean;
}

export const WikiLinkPluginKey = new PluginKey('wikiLinks');

function findWikiSuggestionMatch(config: {
  char?: string;
  allowSpaces?: boolean;
  allowedPrefixes?: string[] | null;
  startOfLine?: boolean;
  $position: any;
}) {
  const { $position } = config;
  if (!$position || !$position.parent) return null;

  // Text in the current block from the start of the block up to the cursor position
  const textBefore = $position.parent.textBetween(0, $position.parentOffset, undefined, '\0');

  // Find the last '[[' before the cursor
  const lastOpenIndex = textBefore.lastIndexOf('[[');
  if (lastOpenIndex === -1) return null;

  // Extract query text between '[[' and cursor
  const textAfterOpen = textBefore.slice(lastOpenIndex + 2);

  // If query contains ']]', ']', another '[', newline, or exceeds reasonable query length,
  // it is already closed or not an active suggestion query.
  if (
    textAfterOpen.includes(']]') ||
    textAfterOpen.includes(']') ||
    textAfterOpen.includes('[') ||
    textAfterOpen.includes('\n') ||
    textAfterOpen.length > 120
  ) {
    return null;
  }

  const from = $position.start() + lastOpenIndex;
  const to = $position.pos;

  return {
    range: { from, to },
    query: textAfterOpen,
    text: textBefore.slice(lastOpenIndex),
  };
}

export const WikiLinks = Extension.create<{
  suggestion: Omit<SuggestionOptions<WikiLinkItem>, 'editor'>;
}>({
  name: 'wikiLinks',

  addOptions() {
    return {
      suggestion: {
        char: '[[',
        allowSpaces: true,
        pluginKey: WikiLinkPluginKey,
        findSuggestionMatch: findWikiSuggestionMatch,
        command: ({ editor, range, props }) => {
          const { state } = editor;
          const { from, to } = range;
          const docSize = state.doc.content.size;

          // Clean up any trailing closing brackets already inserted by auto-pairing
          const textAfter = state.doc.textBetween(to, Math.min(to + 2, docSize));
          let deleteTo = to;
          if (textAfter.startsWith(']]')) {
            deleteTo += 2;
          } else if (textAfter.startsWith(']')) {
            deleteTo += 1;
          }

          editor
            .chain()
            .focus()
            .deleteRange({ from, to: deleteTo })
            .insertContent(`[[${props.title}]] `)
            .run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default WikiLinks;
