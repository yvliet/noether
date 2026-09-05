import { Extension } from '@tiptap/core';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

export interface SlashSubmenuProps {
  ref?: React.Ref<any>;
  onSelect: (extra?: any) => void;
  onClose: () => void;
}

export interface SlashSubmenuDefinition {
  id: string;
  render: (props: SlashSubmenuProps) => React.ReactNode;
  onKeyDown?: (event: KeyboardEvent) => boolean;
}

export interface SlashItem {
  title: string;
  description: string;
  icon: string | React.ReactNode;
  badge?: string;
  submenu?: SlashSubmenuDefinition;
  isEnabled?: () => boolean;
  command: (props: { editor: any; range: any; [key: string]: any }) => void;
}

export const SlashCommandPluginKey = new PluginKey('slashCommands');

export const SlashCommands = Extension.create<{
  suggestion: Omit<SuggestionOptions<SlashItem>, 'editor'>;
}>({
  name: 'slashCommands',
  priority: 200,

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
