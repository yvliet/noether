import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SearchResult {
  from: number;
  to: number;
}

export interface SearchPluginState {
  searchTerm: string;
  replaceTerm: string;
  caseSensitive: boolean;
  results: SearchResult[];
  currentIndex: number;
}

export const SearchAndReplacePluginKey = new PluginKey<SearchPluginState>('searchAndReplace');

export function findMatches(
  doc: any,
  searchTerm: string,
  caseSensitive: boolean
): SearchResult[] {
  if (!searchTerm) return [];
  const results: SearchResult[] = [];
  const query = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) {
      const text = caseSensitive ? node.text : node.text.toLowerCase();
      let index = 0;
      while ((index = text.indexOf(query, index)) !== -1) {
        results.push({
          from: pos + index,
          to: pos + index + query.length,
        });
        index += query.length;
      }
    }
  });

  return results;
}

export const SearchAndReplace = Extension.create({
  name: 'searchAndReplace',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: SearchAndReplacePluginKey,
        state: {
          init: (): SearchPluginState => ({
            searchTerm: '',
            replaceTerm: '',
            caseSensitive: false,
            results: [] as SearchResult[],
            currentIndex: 0,
          }),
          apply: (tr, prev, oldState, newState): SearchPluginState => {
            const meta = tr.getMeta(SearchAndReplacePluginKey);

            if (meta) {
              if (meta.type === 'clear') {
                return {
                  searchTerm: '',
                  replaceTerm: '',
                  caseSensitive: false,
                  results: [],
                  currentIndex: 0,
                };
              }

              if (meta.type === 'setSearch') {
                const searchTerm = meta.searchTerm !== undefined ? meta.searchTerm : prev.searchTerm;
                const replaceTerm = meta.replaceTerm !== undefined ? meta.replaceTerm : prev.replaceTerm;
                const caseSensitive = meta.caseSensitive !== undefined ? meta.caseSensitive : prev.caseSensitive;
                const results = findMatches(newState.doc, searchTerm, caseSensitive);
                let currentIndex = meta.currentIndex !== undefined ? meta.currentIndex : prev.currentIndex;
                if (currentIndex >= results.length) {
                  currentIndex = Math.max(0, results.length - 1);
                }
                return {
                  searchTerm,
                  replaceTerm,
                  caseSensitive,
                  results,
                  currentIndex,
                };
              }

              if (meta.type === 'setIndex') {
                return {
                  ...prev,
                  currentIndex: meta.index,
                };
              }
            }

            // If document changed and search is active, incrementally map matches instead of scanning full doc
            if (tr.docChanged && prev.searchTerm) {
              const query = prev.caseSensitive ? prev.searchTerm : prev.searchTerm.toLowerCase();
              const termLen = prev.searchTerm.length;

              let minChanged = newState.doc.content.size;
              let maxChanged = 0;
              let hasChanges = false;
              tr.mapping.maps.forEach((stepMap) => {
                stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                  hasChanges = true;
                  minChanged = Math.min(minChanged, newStart);
                  maxChanged = Math.max(maxChanged, newEnd);
                });
              });

              if (!hasChanges) {
                return prev;
              }

              // Scan range expanded by term length to cover modified words
              const scanFrom = Math.max(0, minChanged - termLen);
              const scanTo = Math.min(newState.doc.content.size, maxChanged + termLen);

              const results: SearchResult[] = [];

              // 1. Retain mapped matches that fall outside the modified range
              for (const res of prev.results) {
                const mappedFrom = tr.mapping.map(res.from, 1);
                const mappedTo = tr.mapping.map(res.to, -1);
                if (mappedTo < scanFrom || mappedFrom > scanTo) {
                  if (mappedTo - mappedFrom === termLen && mappedTo <= newState.doc.content.size) {
                    const textAtPos = newState.doc.textBetween(mappedFrom, mappedTo);
                    const textMatch = prev.caseSensitive ? textAtPos : textAtPos.toLowerCase();
                    if (textMatch === query) {
                      results.push({ from: mappedFrom, to: mappedTo });
                    }
                  }
                }
              }

              // 2. Scan only the modified range for matches
              if (scanFrom < scanTo) {
                newState.doc.nodesBetween(scanFrom, scanTo, (node: any, pos: number) => {
                  if (node.isText && node.text) {
                    const text = prev.caseSensitive ? node.text : node.text.toLowerCase();
                    let index = 0;
                    while ((index = text.indexOf(query, index)) !== -1) {
                      const matchFrom = pos + index;
                      const matchTo = matchFrom + query.length;
                      if (matchFrom >= scanFrom && matchTo <= scanTo) {
                        results.push({ from: matchFrom, to: matchTo });
                      }
                      index += query.length;
                    }
                  }
                });
              }

              results.sort((a, b) => a.from - b.from);
              const currentIndex = Math.min(prev.currentIndex, Math.max(0, results.length - 1));
              return {
                ...prev,
                results,
                currentIndex,
              };
            }

            return prev;
          },
        },
        props: {
          decorations: (state) => {
            const pluginState = SearchAndReplacePluginKey.getState(state);
            if (!pluginState || !pluginState.searchTerm || pluginState.results.length === 0) {
              return DecorationSet.empty;
            }

            const decos = pluginState.results.map((res, i) => {
              const isActive = i === pluginState.currentIndex;
              return Decoration.inline(res.from, res.to, {
                class: isActive ? 'noether-find-active' : 'noether-find-match',
              });
            });

            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});
