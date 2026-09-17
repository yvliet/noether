import { Heading } from '@tiptap/extension-heading';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const HeadingBehaviorPluginKey = new PluginKey('headingBehavior');

interface HeadingAction {
  pos: number;
  kind: 'to-heading' | 'to-paragraph' | 'change-level' | 'prepend-fence' | 'replace-fence';
  level?: number;
  prefix?: string;
  stripLen?: number;
}

export const LivePreviewHeading = Heading.extend({
  // Disable default TipTap input rules so typing '# ' preserves raw characters in the buffer
  addInputRules() {
    return [];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: HeadingBehaviorPluginKey,
        appendTransaction(transactions, oldState, newState) {
          // Only inspect when document changed
          if (!transactions.some((tr) => tr.docChanged)) return null;

          // Find bounding range of document modifications for O(1) performance
          let minPos = newState.doc.content.size;
          let maxPos = 0;
          for (const tr of transactions) {
            if (!tr.docChanged) continue;
            for (const step of tr.steps) {
              step.getMap().forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                minPos = Math.min(minPos, newStart);
                maxPos = Math.max(maxPos, newEnd);
              });
            }
          }

          if (minPos > maxPos) return null;

          const clampedMin = Math.max(0, Math.min(minPos, newState.doc.content.size));
          const clampedMax = Math.max(clampedMin, Math.min(maxPos, newState.doc.content.size));

          const actions: HeadingAction[] = [];

          newState.doc.nodesBetween(clampedMin, clampedMax, (node, pos) => {
            if (!node.isTextblock) return;

            const text = node.textContent;

            if (node.type.name === 'paragraph') {
              const headingMatch = text.match(/^(#{1,6})[ \t]+/);
              if (headingMatch) {
                // User typed `#{1,6} `: convert paragraph to heading
                actions.push({
                  pos,
                  kind: 'to-heading',
                  level: headingMatch[1].length,
                });
              }
            } else if (node.type.name === 'heading') {
              const match = text.match(/^(#{1,6})([ \t]|$)/);
              if (!match) {
                const oldNode = oldState.doc.nodeAt(pos);
                if (oldNode && oldNode.type.name === 'paragraph') {
                  // Command converted paragraph to heading: prepend `#{level} `
                  const level = node.attrs.level || 1;
                  actions.push({
                    pos,
                    kind: 'prepend-fence',
                    prefix: `${'#'.repeat(level)} `,
                  });
                } else {
                  // User deleted space or `#` from heading: revert to paragraph without stripping any characters
                  actions.push({
                    pos,
                    kind: 'to-paragraph',
                  });
                }
              } else {
                const detectedLevel = match[1].length;
                const oldNode = oldState.doc.nodeAt(pos);
                if (
                  oldNode &&
                  oldNode.type.name === 'heading' &&
                  oldNode.attrs.level !== node.attrs.level &&
                  oldNode.attrs.level === detectedLevel
                ) {
                  // Command changed heading level: update fence in text to match new level
                  const oldPrefixLen = match[0].length;
                  const newPrefix = `${'#'.repeat(node.attrs.level)} `;
                  actions.push({
                    pos,
                    kind: 'replace-fence',
                    stripLen: oldPrefixLen,
                    prefix: newPrefix,
                  });
                } else if (node.attrs.level !== detectedLevel) {
                  // User changed `#` in text: update node attrs level to match text
                  actions.push({
                    pos,
                    kind: 'change-level',
                    level: detectedLevel,
                  });
                }
              }
            }
          });

          if (actions.length === 0) return null;

          const tr = newState.tr;

          // Apply actions in reverse position order to preserve character offsets
          actions.sort((a, b) => b.pos - a.pos);

          for (const act of actions) {
            if (act.kind === 'replace-fence' && act.stripLen && act.prefix) {
              tr.insertText(act.prefix, act.pos + 1, act.pos + 1 + act.stripLen);
            } else if (act.kind === 'prepend-fence' && act.prefix) {
              tr.insertText(act.prefix, act.pos + 1);
            } else if (act.kind === 'to-heading' && act.level) {
              tr.setNodeMarkup(act.pos, newState.schema.nodes.heading, { level: act.level });
            } else if (act.kind === 'to-paragraph') {
              tr.setNodeMarkup(act.pos, newState.schema.nodes.paragraph, {});
            } else if (act.kind === 'change-level' && act.level) {
              tr.setNodeMarkup(act.pos, newState.schema.nodes.heading, { level: act.level });
            }
          }

          return tr;
        },
      }),
    ];
  },
});
