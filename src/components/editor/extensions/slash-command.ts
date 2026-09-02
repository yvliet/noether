import { Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

export interface SlashItem {
  title: string;
  description: string;
  icon: string | React.ReactNode;
  command: (props: { editor: any; range: any; [key: string]: any }) => void;
}

export const SlashCommandPluginKey = new PluginKey('slashCommands');

export const SlashCommands = Extension.create<{
  suggestion: Omit<SuggestionOptions<SlashItem>, 'editor'>;
}>({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: SlashCommandPluginKey,
        command: ({ editor, range, props }) => {
          props.command({ editor, range, ...props });
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
