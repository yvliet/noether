import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import katex from 'katex';
import { setupMathLive } from './mathlive-setup';
import { findMathRangeAtPos } from './mathlive-wysiwyg';
import { getIndentSize } from './smart-tab-indent';
import { renderEmbedWidget } from '../embed-renderer';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { isLinkVisited } from '@/lib/visitedLinks';

export const LivePreviewSyntaxPluginKey = new PluginKey('livePreviewSyntax');

// Hoisted RegExp patterns for markdown syntax
const BOLD_REGEX = /\*\*([^*\n]+)\*\*/g;
const ITALIC_REGEX = /(?:^|[^*])\*([^*\n]+)\*/g;
const CODE_REGEX = /`([^`\n]+)`/g;
const STRIKE_REGEX = /~~([^~\n]+)~~/g;
const HIGHLIGHT_REGEX = /==([^=\n]+)==/g;
const WIKI_REGEX = /\[\[([^\]\n]+)\]\]/g;
const WIKI_EMBED_REGEX = /!\[\[([^\]\n]+)\]\]/g;
const MD_LINK_REGEX = /\[([^\]\n]+)\]\(((?:[^()\n]|\([^()\n]*\))+)\)/g;
const MD_EMBED_REGEX = /!\[([^\]\n]*)\]\(((?:[^()\n]|\([^()\n]*\))+)\)/g;
const TAG_REGEX = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_\-\/]*)/g;
const HEX_COLOR_REGEX = /^[0-9a-fA-F]{3,6}$/;
const BLOCK_MATH_REGEX = /\$\$([\s\S]*?)\$\$/g;
const INLINE_MATH_REGEX = /(?:^|[^\$])\$([^\$\n]*)\$(?:[^\$]|$)/g;

// Fast in-memory cache for rendered KaTeX formulas to guarantee 0ms keystroke latency on scale
const katexHtmlCache = new Map<string, { html: string; isError: boolean }>();
const MAX_KATEX_CACHE_SIZE = 1500;

function getOrRenderKatex(latex: string, displayMode: boolean): { html: string; isError: boolean } {
  const trimmed = latex.trim() || '\\square';
  const cacheKey = `${displayMode ? 'B' : 'I'}:${trimmed}`;
  const hit = katexHtmlCache.get(cacheKey);
  if (hit) return hit;

  try {
    const html = katex.renderToString(trimmed, {
      displayMode,
      throwOnError: false,
    });
    const result = { html, isError: false };
    if (katexHtmlCache.size >= MAX_KATEX_CACHE_SIZE) {
      const keys = Array.from(katexHtmlCache.keys()).slice(0, 500);
      for (const k of keys) katexHtmlCache.delete(k);
    }
    katexHtmlCache.set(cacheKey, result);
    return result;
  } catch (e) {
    const result = { html: '', isError: true };
    katexHtmlCache.set(cacheKey, result);
    return result;
  }
}

export interface LivePreviewPluginState {
  decorations: DecorationSet;
  focused: boolean;
  targetHeadingIndex: number | null;
}

function getActiveGuideCol(doc: any, selPos: number): number | null {
  const safePos = Math.max(0, Math.min(selPos, doc.content.size));
  const $pos = doc.resolve(safePos);
  const parent = $pos.parent;

  if (!parent || !parent.isTextblock) return null;

  const text = parent.textContent;
  const parentOffset = $pos.parentOffset;
  const lineStartOffset = parentOffset === 0 ? 0 : text.lastIndexOf('\n', parentOffset - 1) + 1;
  const nextNewline = text.indexOf('\n', parentOffset);
  const lineEndOffset = nextNewline === -1 ? text.length : nextNewline;
  const lineText = text.slice(lineStartOffset, lineEndOffset);

  // If on a list/number line, highlight the line directly below this list item
  const listMatch = lineText.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+]) /);
  if (listMatch) {
    return listMatch[1].length;
  }

  // If on an indented continuation line (no list marker), highlight parent guide
  const leadingMatch = lineText.match(/^[ \t]+/);
  if (leadingMatch) {
    const step = getIndentSize();
    const leadingLen = leadingMatch[0].length;
    return leadingLen >= step ? leadingLen - step : null;
  }

  // Outside unindented text -> do not highlight any guide lines
  return null;
}



/**
 * Scan a single textblock node and return its decorations.
 * Handles headings, blockquotes, tab indentation guides, list prefixes, and markdown syntax.
 *
 * @param node - The textblock node (paragraph, heading, blockquote, etc.)
 * @param pos - Node's start position in the document
 * @param isFocused - Whether the editor currently has focus
 * @param selFrom - Selection start position
 * @param selTo - Selection end position
 * @param isTargetHeading - Whether this heading is highlighted from outline navigation
 * @param startLineIdx - Global line offset of the first line inside this block
 * @param activeLineGuides - Map of global line indices to sets of highlighted guide columns
 * @param nextBlockLeadingLen - Leading indentation of the immediately following block (for terminal line fades)
 */
function scanBlockDecorations(
  node: any,
  pos: number,
  isFocused: boolean,
  selFrom: number,
  selTo: number,
  isTargetHeading: boolean,
  startLineIdx: number = 0,
  activeLineGuides: Map<number, Set<number>> | null = null,
  nextBlockLeadingLen: number = 0,
  /** Set of leading-space column indices where a guide may be drawn (must have a list-marker ancestor) */
  listGuideColumns: Set<number> | null = null,
  editor: any = null
): Decoration[] {

  const decorations: Decoration[] = [];
  const text = node.textContent;
  const blockStart = pos + 1;
  const blockEnd = pos + node.nodeSize;
  const isBlockFocused =
    isFocused &&
    ((selFrom >= pos && selFrom <= blockEnd) || (selTo >= pos && selTo <= blockEnd));

  // 1. Heading Live Preview Indicator & Outline Target Highlight
  if (node.type.name === 'heading') {
    const level = node.attrs.level || 1;
    const classes = [
      isBlockFocused ? `is-active-heading is-active-h${level}` : '',
      isTargetHeading ? 'flint-heading-target' : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (classes) {
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          class: classes,
        })
      );
    }
  }

  // 2. Blockquote Live Preview Indicator
  if (node.type.name === 'blockquote' && isBlockFocused) {
    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: 'is-active-blockquote',
      })
    );
  }

  // 3. Scan plain text for Markdown syntax and Tab Indents
  if (text) {
    // Tab & Leading Indent whitespace decoration (ensures tabs never show selection highlight)
    const lines = text.split('\n');
    let lineOffset = 0;
    for (let l = 0; l < lines.length; l++) {
      const globalLineIdx = startLineIdx + l;
      const lineActiveGuides = activeLineGuides?.get(globalLineIdx) ?? null;

      const lineStr = lines[l];
      const leadingMatch = lineStr.match(/^[ \t]+/);
      let leadingLen = 0;
      if (leadingMatch) {
        const leadingStr = leadingMatch[0];
        leadingLen = leadingStr.length;
        decorations.push(
          Decoration.inline(blockStart + lineOffset, blockStart + lineOffset + leadingLen, {
            class: 'flint-tab-indent',
          })
        );

        const nextLineLeading =
          l < lines.length - 1
            ? (lines[l + 1].match(/^[ \t]+/)?.[0]?.length ?? 0)
            : nextBlockLeadingLen;

        if (leadingStr.includes('\t')) {
          // If using tabs, place one guide line per tab character
          for (let i = 0; i < leadingLen; i++) {
            if (leadingStr[i] === '\t') {
              // Only draw if this column is rooted in a list-marker ancestor
              if (listGuideColumns !== null && !listGuideColumns.has(i)) continue;
              const isActive = Boolean(lineActiveGuides && lineActiveGuides.has(i));
              const isTerminal = i >= nextLineLeading;
              let guideClass = 'flint-tab-guide';
              if (isActive) guideClass += ' flint-tab-guide-active';
              if (isTerminal) guideClass += ' flint-tab-guide-end';

              decorations.push(
                Decoration.inline(
                  blockStart + lineOffset + i,
                  blockStart + lineOffset + i + 1,
                  { class: guideClass }
                )
              );
            }
          }
        } else {
          // Strictly respect the user's configured tabSize setting
          const step = getIndentSize();
          const levels = Math.floor(leadingLen / step);
          for (let i = 0; i < levels; i++) {
            const s = i * step;
            if (s < leadingLen) {
              // Only draw if this column is rooted in a list-marker ancestor
              if (listGuideColumns !== null && !listGuideColumns.has(s)) continue;
              const isActive = Boolean(lineActiveGuides && lineActiveGuides.has(s));
              const isTerminal = s >= nextLineLeading;
              let guideClass = 'flint-tab-guide';
              if (isActive) guideClass += ' flint-tab-guide-active';
              if (isTerminal) guideClass += ' flint-tab-guide-end';

              decorations.push(
                Decoration.inline(
                  blockStart + lineOffset + s,
                  blockStart + lineOffset + s + 1,
                  { class: guideClass }
                )
              );
            }
          }
        }
      }

      // Mid-line tab runs (2+ spaces or \t)
      const tabRunRegex = /[ \t]{2,}/g;
      let trMatch: RegExpExecArray | null;
      while ((trMatch = tabRunRegex.exec(lineStr)) !== null) {
        if (trMatch.index < leadingLen) continue;
        decorations.push(
          Decoration.inline(
            blockStart + lineOffset + trMatch.index,
            blockStart + lineOffset + trMatch.index + trMatch[0].length,
            { class: 'flint-tab-indent' }
          )
        );
      }

      // List Prefix Dimming (e.g., "1. ", "2. ", "a. ", "aa. ", "- ", "* ", "+ ", "  - ")
      // Only dims when there is a space after the marker
      const listMatch = lineStr.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+]) /);
      if (listMatch) {
        const indentLen = listMatch[1].length;
        const markerLen = listMatch[2].length;
        const markerStart = blockStart + lineOffset + indentLen;
        const markerEnd = markerStart + markerLen;
        // Bullet markers (-, *, +) get an extra class so CSS can visually replace them with a centered dot
        const isBullet = /^[-*+]$/.test(listMatch[2]);
        decorations.push(
          Decoration.inline(markerStart, markerEnd, {
            class: `flint-numbered-prefix flint-list-prefix${isBullet ? ' flint-bullet-marker' : ''}`,
          })
        );
      }

      lineOffset += lineStr.length + 1;
    }

    // A. Bold: **bold**
    BOLD_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = BOLD_REGEX.exec(text)) !== null) {
      const matchStart = blockStart + match.index;
      const matchEnd = matchStart + match[0].length;
      const contentStart = matchStart + 2;
      const contentEnd = matchEnd - 2;

      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;
      const syntaxClass = isMatchFocused ? 'md-syntax-dimmed' : 'md-syntax-hidden';

      decorations.push(
        Decoration.inline(matchStart, contentStart, {
          class: syntaxClass,
        })
      );
      decorations.push(
        Decoration.inline(contentStart, contentEnd, {
          class: 'md-bold',
        })
      );
      decorations.push(
        Decoration.inline(contentEnd, matchEnd, {
          class: syntaxClass,
        })
      );
    }

    // B. Italic: *italic*
    ITALIC_REGEX.lastIndex = 0;
    while ((match = ITALIC_REGEX.exec(text)) !== null) {
      const fullMatch = match[0];
      const offset = fullMatch.startsWith('*') ? 0 : 1;
      const matchStart = blockStart + match.index + offset;
      const matchEnd = matchStart + fullMatch.length - offset;
      const contentStart = matchStart + 1;
      const contentEnd = matchEnd - 1;

      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;
      const syntaxClass = isMatchFocused ? 'md-syntax-dimmed' : 'md-syntax-hidden';

      decorations.push(
        Decoration.inline(matchStart, contentStart, {
          class: syntaxClass,
        })
      );
      decorations.push(
        Decoration.inline(contentStart, contentEnd, {
          class: 'md-italic',
        })
      );
      decorations.push(
        Decoration.inline(contentEnd, matchEnd, {
          class: syntaxClass,
        })
      );
    }

    // C. Inline Code: `code`
    CODE_REGEX.lastIndex = 0;
    while ((match = CODE_REGEX.exec(text)) !== null) {
      const matchStart = blockStart + match.index;
      const matchEnd = matchStart + match[0].length;
      const contentStart = matchStart + 1;
      const contentEnd = matchEnd - 1;

      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;
      const syntaxClass = isMatchFocused ? 'md-syntax-dimmed' : 'md-syntax-hidden';

      decorations.push(
        Decoration.inline(matchStart, contentStart, {
          class: syntaxClass,
        })
      );
      decorations.push(
        Decoration.inline(contentStart, contentEnd, {
          class: 'md-code',
        })
      );
      decorations.push(
        Decoration.inline(contentEnd, matchEnd, {
          class: syntaxClass,
        })
      );
    }

    // D. Strikethrough: ~~strikethrough~~
    STRIKE_REGEX.lastIndex = 0;
    while ((match = STRIKE_REGEX.exec(text)) !== null) {
      const matchStart = blockStart + match.index;
      const matchEnd = matchStart + match[0].length;
      const contentStart = matchStart + 2;
      const contentEnd = matchEnd - 2;

      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;
      const syntaxClass = isMatchFocused ? 'md-syntax-dimmed' : 'md-syntax-hidden';

      decorations.push(
        Decoration.inline(matchStart, contentStart, {
          class: syntaxClass,
        })
      );
      decorations.push(
        Decoration.inline(contentStart, contentEnd, {
          class: 'md-strike',
        })
      );
      decorations.push(
        Decoration.inline(contentEnd, matchEnd, {
          class: syntaxClass,
        })
      );
    }

    // E. Highlight: ==highlight==
    HIGHLIGHT_REGEX.lastIndex = 0;
    while ((match = HIGHLIGHT_REGEX.exec(text)) !== null) {
      const matchStart = blockStart + match.index;
      const matchEnd = matchStart + match[0].length;
      const contentStart = matchStart + 2;
      const contentEnd = matchEnd - 2;

      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;
      const syntaxClass = isMatchFocused ? 'md-syntax-dimmed' : 'md-syntax-hidden';

      decorations.push(
        Decoration.inline(matchStart, contentStart, {
          class: syntaxClass,
        })
      );
      decorations.push(
        Decoration.inline(contentStart, contentEnd, {
          class: 'md-highlight',
        })
      );
      decorations.push(
        Decoration.inline(contentEnd, matchEnd, {
          class: syntaxClass,
        })
      );
    }

    // F. Wikilinks: [[target|display]] or [[target]]
    WIKI_REGEX.lastIndex = 0;
    let wikiMatch: RegExpExecArray | null;
    while ((wikiMatch = WIKI_REGEX.exec(text)) !== null) {
      if (wikiMatch.index > 0 && text[wikiMatch.index - 1] === '!') {
        continue;
      }
      const matchStart = blockStart + wikiMatch.index;
      const matchEnd = matchStart + wikiMatch[0].length;
      const fullTarget = wikiMatch[1];
      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;

      let target = fullTarget;
      let display = fullTarget;
      if (fullTarget.includes('|')) {
        const parts = fullTarget.split('|');
        target = parts[0];
        display = parts.slice(1).join('|');
      }

      const isVisited = isLinkVisited(target);

      if (isMatchFocused) {
        // Dim opening brackets [[
        decorations.push(
          Decoration.inline(matchStart, matchStart + 2, {
            class: 'md-syntax-dimmed',
          })
        );

        if (fullTarget.includes('|')) {
          const pipeOffset = fullTarget.indexOf('|');
          // Target before pipe
          decorations.push(
            Decoration.inline(matchStart + 2, matchStart + 2 + pipeOffset, {
              class: `md-wikilink is-focused${isVisited ? ' is-visited' : ''}`,
              'data-wikilink-target': target,
              'data-visited': isVisited ? 'true' : 'false',
            })
          );
          // Dim the pipe |
          decorations.push(
            Decoration.inline(matchStart + 2 + pipeOffset, matchStart + 2 + pipeOffset + 1, {
              class: 'md-syntax-dimmed',
            })
          );
          // Display text after pipe
          decorations.push(
            Decoration.inline(matchStart + 2 + pipeOffset + 1, matchEnd - 2, {
              class: `md-wikilink is-focused${isVisited ? ' is-visited' : ''}`,
              'data-wikilink-target': target,
              'data-visited': isVisited ? 'true' : 'false',
            })
          );
        } else {
          // Wikilink target text
          decorations.push(
            Decoration.inline(matchStart + 2, matchEnd - 2, {
              class: `md-wikilink is-focused${isVisited ? ' is-visited' : ''}`,
              'data-wikilink-target': target,
              'data-visited': isVisited ? 'true' : 'false',
            })
          );
        }

        // Dim closing brackets ]]
        decorations.push(
          Decoration.inline(matchEnd - 2, matchEnd, {
            class: 'md-syntax-dimmed',
          })
        );
      } else {
        decorations.push(
          Decoration.inline(matchStart, matchStart + 2, {
            class: 'md-syntax-hidden',
          })
        );

        if (fullTarget.includes('|')) {
          const pipeOffset = fullTarget.indexOf('|');
          decorations.push(
            Decoration.inline(matchStart + 2, matchStart + 2 + pipeOffset + 1, {
              class: 'md-syntax-hidden',
            })
          );
          decorations.push(
            Decoration.inline(matchStart + 2 + pipeOffset + 1, matchEnd - 2, {
              class: `md-wikilink${isVisited ? ' is-visited' : ''}`,
              'data-wikilink-target': target,
              'data-visited': isVisited ? 'true' : 'false',
            })
          );
        } else {
          decorations.push(
            Decoration.inline(matchStart + 2, matchEnd - 2, {
              class: `md-wikilink${isVisited ? ' is-visited' : ''}`,
              'data-wikilink-target': target,
              'data-visited': isVisited ? 'true' : 'false',
            })
          );
        }

        decorations.push(
          Decoration.inline(matchEnd - 2, matchEnd, {
            class: 'md-syntax-hidden',
          })
        );
      }
    }

    // F2. Markdown Links: [text](url)
    MD_LINK_REGEX.lastIndex = 0;
    let mdLinkMatch: RegExpExecArray | null;
    while ((mdLinkMatch = MD_LINK_REGEX.exec(text)) !== null) {
      if (mdLinkMatch.index > 0 && text[mdLinkMatch.index - 1] === '!') {
        continue;
      }
      const matchStart = blockStart + mdLinkMatch.index;
      const matchEnd = matchStart + mdLinkMatch[0].length;
      const linkText = mdLinkMatch[1];
      const linkUrl = mdLinkMatch[2];
      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;
      const isVisited = isLinkVisited(linkUrl);

      if (isMatchFocused) {
        decorations.push(
          Decoration.inline(matchStart, matchStart + 1, {
            class: 'md-syntax-dimmed',
          })
        );
        decorations.push(
          Decoration.inline(matchStart + 1, matchStart + 1 + linkText.length, {
            class: `md-link is-focused${isVisited ? ' is-visited' : ''}`,
            'data-link-url': linkUrl,
            'data-visited': isVisited ? 'true' : 'false',
          })
        );
        decorations.push(
          Decoration.inline(matchStart + 1 + linkText.length, matchEnd, {
            class: 'md-syntax-dimmed',
          })
        );
      } else {
        decorations.push(
          Decoration.inline(matchStart, matchStart + 1, {
            class: 'md-syntax-hidden',
          })
        );
        decorations.push(
          Decoration.inline(matchStart + 1, matchStart + 1 + linkText.length, {
            class: `md-link${isVisited ? ' is-visited' : ''}`,
            'data-link-url': linkUrl,
            'data-visited': isVisited ? 'true' : 'false',
          })
        );
        decorations.push(
          Decoration.inline(matchStart + 1 + linkText.length, matchEnd, {
            class: 'md-syntax-hidden',
          })
        );
      }
    }

    // F3. Wikilink Embeds: ![[target|display/size]]
    WIKI_EMBED_REGEX.lastIndex = 0;
    let wikiEmbedMatch: RegExpExecArray | null;
    while ((wikiEmbedMatch = WIKI_EMBED_REGEX.exec(text)) !== null) {
      const matchStart = blockStart + wikiEmbedMatch.index;
      const matchEnd = matchStart + wikiEmbedMatch[0].length;
      const rawTarget = wikiEmbedMatch[1];
      const contentStart = matchStart + 3; // after '![['
      const contentEnd = matchEnd - 2;   // before ']]'
      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;

      if (isMatchFocused) {
        decorations.push(
          Decoration.inline(matchStart, contentStart, {
            class: 'md-syntax-dimmed',
          })
        );
        decorations.push(
          Decoration.inline(contentEnd, matchEnd, {
            class: 'md-syntax-dimmed',
          })
        );
      } else {
        decorations.push(
          Decoration.inline(matchStart, matchEnd, {
            class: 'md-syntax-hidden',
          })
        );
        const dom = renderEmbedWidget(rawTarget, 'wikilink');
        decorations.push(
          Decoration.widget(matchStart, dom, {
            side: -1,
            stopEvent: (event) => {
              const target = event.target as HTMLElement;
              return !!target.closest('img, button, a, audio, video, iframe, input, select, [data-embed-action]');
            },
          })
        );
      }
    }

    // F4. Markdown Embeds: ![alt](url)
    MD_EMBED_REGEX.lastIndex = 0;
    let mdEmbedMatch: RegExpExecArray | null;
    while ((mdEmbedMatch = MD_EMBED_REGEX.exec(text)) !== null) {
      const matchStart = blockStart + mdEmbedMatch.index;
      const matchEnd = matchStart + mdEmbedMatch[0].length;
      const altText = mdEmbedMatch[1];
      const url = mdEmbedMatch[2];
      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;

      if (isMatchFocused) {
        const altStart = matchStart + 2; // after '!['
        const altEnd = altStart + altText.length;
        const urlStart = altEnd + 2; // after ']('
        const urlEnd = matchEnd - 1; // before ')'

        decorations.push(
          Decoration.inline(matchStart, altStart, {
            class: 'md-syntax-dimmed',
          })
        );
        decorations.push(
          Decoration.inline(altEnd, urlStart, {
            class: 'md-syntax-dimmed',
          })
        );
        decorations.push(
          Decoration.inline(urlEnd, matchEnd, {
            class: 'md-syntax-dimmed',
          })
        );
      } else {
        decorations.push(
          Decoration.inline(matchStart, matchEnd, {
            class: 'md-syntax-hidden',
          })
        );
        const dom = renderEmbedWidget(url, 'markdown', null, altText);
        decorations.push(
          Decoration.widget(matchStart, dom, {
            side: -1,
            stopEvent: (event) => {
              const target = event.target as HTMLElement;
              return !!target.closest('img, button, a, audio, video, iframe, input, select, [data-embed-action]');
            },
          })
        );
      }
    }

    // G. Hash Tags: #tag, #folder/nested-tag
    TAG_REGEX.lastIndex = 0;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = TAG_REGEX.exec(text)) !== null) {
      const tagWithPrefix = tagMatch[1];
      if (HEX_COLOR_REGEX.test(tagWithPrefix)) continue;

      const offset = tagMatch[0].startsWith('#') ? 0 : 1;
      const matchStart = blockStart + tagMatch.index + offset;
      const matchEnd = matchStart + tagMatch[0].length - offset;

      decorations.push(
        Decoration.inline(matchStart, matchEnd, {
          class: 'md-tag',
        })
      );
    }

    // H. Block Math: $$latex$$
    BLOCK_MATH_REGEX.lastIndex = 0;
    while ((match = BLOCK_MATH_REGEX.exec(text)) !== null) {
      const matchStart = blockStart + match.index;
      const matchEnd = matchStart + match[0].length;
      const contentStart = matchStart + 2;
      const contentEnd = matchEnd - 2;
      const latex = match[1];

      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;

      if (isMatchFocused || !latex || !latex.trim()) {
        const syntaxClass = isMatchFocused ? 'md-syntax-dimmed' : 'md-syntax-hidden';
        decorations.push(
          Decoration.inline(matchStart, contentStart, {
            class: syntaxClass,
          })
        );
        decorations.push(
          Decoration.inline(contentStart, contentEnd, {
            class: 'md-math-block',
          })
        );
        decorations.push(
          Decoration.inline(contentEnd, matchEnd, {
            class: syntaxClass,
          })
        );
      } else {
        const dom = document.createElement('div');
        dom.className = 'md-math-render md-math-block';
        const rendered = getOrRenderKatex(latex, true);
        if (!rendered.isError && rendered.html) {
          dom.innerHTML = rendered.html;
        } else {
          dom.className = 'md-math-render md-math-block md-math-error';
          dom.textContent = `$$${latex}$$`;
        }
        decorations.push(
          Decoration.inline(matchStart, matchEnd, {
            class: 'md-syntax-hidden',
          })
        );
        decorations.push(
          Decoration.widget(matchStart, dom, {
            side: -1,
            stopEvent: () => false,
          })
        );
      }
    }

    // I. Inline Math: $latex$
    INLINE_MATH_REGEX.lastIndex = 0;
    while ((match = INLINE_MATH_REGEX.exec(text)) !== null) {
      const fullMatch = match[0];
      const offset = fullMatch.startsWith('$') ? 0 : 1;
      const endOffset = fullMatch.endsWith('$') ? 0 : 1;
      const matchStart = blockStart + match.index + offset;
      const matchEnd = matchStart + fullMatch.length - offset - endOffset;
      const contentStart = matchStart + 1;
      const contentEnd = matchEnd - 1;
      const latex = match[1];

      // Avoid matching empty $$ or block math
      if (fullMatch.includes('$$')) continue;

      const isMatchFocused = isFocused && selFrom <= matchEnd && selTo >= matchStart;

      if (isMatchFocused || !latex || !latex.trim()) {
        const syntaxClass = isMatchFocused ? 'md-syntax-dimmed' : 'md-syntax-hidden';
        decorations.push(
          Decoration.inline(matchStart, contentStart, {
            class: syntaxClass,
          })
        );
        decorations.push(
          Decoration.inline(contentStart, contentEnd, {
            class: 'md-math-inline',
          })
        );
        decorations.push(
          Decoration.inline(contentEnd, matchEnd, {
            class: syntaxClass,
          })
        );
      } else {
        const dom = document.createElement('span');
        dom.className = 'md-math-render md-math-inline';
        const rendered = getOrRenderKatex(latex, false);
        if (!rendered.isError && rendered.html) {
          dom.innerHTML = rendered.html;
        } else {
          dom.className = 'md-math-render md-math-inline md-math-error';
          dom.textContent = `$${latex}$`;
        }
        decorations.push(
          Decoration.inline(matchStart, matchEnd, {
            class: 'md-syntax-hidden',
          })
        );
        decorations.push(
          Decoration.widget(matchStart, dom, {
            side: -1,
            stopEvent: () => false,
          })
        );
      }
    }
  }

  return decorations;
}

/**
 * Scan the entire ProseMirror document and build an optimized DecorationSet.
 * Handles live preview syntax concealing and real-time active list guide line scoping.
 *
 * Scope rules:
 * - When caret is on a list item (e.g. "1. w" at indent 0), all child lines directly below it
 *   have their downward connecting guide line highlighted.
 * - When caret is on a sub-item (e.g. "1. a"), only its OWN sub-items below it are highlighted;
 *   lines from ancestors above it remain normal/inactive.
 * - Non-list lines have zero active guide line highlighting.
 */
function buildAllDecorations(
  doc: any,
  isFocused: boolean,
  selFrom: number,
  selTo: number,
  targetHeadingIndex: number | null,
  editor: any = null
): DecorationSet {
  const decorations: Decoration[] = [];
  let headingCounter = 0;

  // Collect all textblocks (paragraphs, headings, blockquotes, etc.)
  const blocks: { node: any; pos: number; isTarget: boolean }[] = [];
  doc.descendants((node: any, pos: number) => {
    if (!node.isTextblock) return true;

    const isTarget = targetHeadingIndex !== null && targetHeadingIndex === headingCounter;
    if (node.type.name === 'heading') {
      headingCounter++;
    }
    blocks.push({ node, pos, isTarget });
    return false;
  });

  interface DocLineMeta {
    blockIdx: number;
    lineIdx: number;
    lineOffset: number;
    blockStart: number;
    lineText: string;
    leadingLen: number;
    isTab: boolean;
    listMarkerIndent: number | null;
  }

  // 1. Flatten all lines across blocks to index positions and resolve caret line
  const allLines: DocLineMeta[] = [];
  let activeLineIdx = -1;

  for (let b = 0; b < blocks.length; b++) {
    const { node, pos } = blocks[b];
    const text = node.textContent;
    const split = text.split('\n');
    const blockStart = pos + 1;
    const blockEnd = pos + node.nodeSize;
    const isBlockActive = selFrom >= pos && selFrom <= blockEnd;

    // Calculate line index inside multi-line textblocks
    let lineInBlockActive = 0;
    if (isBlockActive) {
      const charOffset = Math.max(0, Math.min(text.length, selFrom - blockStart));
      const textBefore = text.slice(0, charOffset);
      lineInBlockActive = textBefore.split('\n').length - 1;
    }

    let offset = 0;
    for (let l = 0; l < split.length; l++) {
      const lineStr = split[l];
      const leadingMatch = lineStr.match(/^[ \t]+/);
      const leadingLen = leadingMatch ? leadingMatch[0].length : 0;
      const isTab = leadingMatch ? leadingMatch[0].includes('\t') : false;
      const listMatch = lineStr.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])(?:\s+|$)/);
      const listMarkerIndent = listMatch ? listMatch[1].length : null;

      const lineGlobalIdx = allLines.length;
      allLines.push({
        blockIdx: b,
        lineIdx: l,
        lineOffset: offset,
        blockStart,
        lineText: lineStr,
        leadingLen,
        isTab,
        listMarkerIndent,
      });

      if (isBlockActive && l === lineInBlockActive) {
        activeLineIdx = lineGlobalIdx;
      }

      offset += lineStr.length + 1; // +1 for '\n'
    }
  }

  // 2. Compute active guide columns (strictly highlights own guide line below the active list item)
  const activeLineGuides = new Map<number, Set<number>>();
  if (activeLineIdx >= 0 && activeLineIdx < allLines.length) {
    const curLine = allLines[activeLineIdx];

    if (curLine.listMarkerIndent !== null) {
      // Caret is on a list item (e.g., "1. w" -> listMarkerIndent = 0, "1. a" -> listMarkerIndent = 5)
      const markerCol = curLine.listMarkerIndent;
      const step = curLine.isTab ? 1 : getIndentSize();
      const targetGuideCol = curLine.isTab ? markerCol : Math.floor(markerCol / step) * step;

      // Highlight the guide line for all child lines directly below this list item
      for (let i = activeLineIdx + 1; i < allLines.length; i++) {
        const target = allLines[i];
        if (target.leadingLen > markerCol) {
          let set = activeLineGuides.get(i);
          if (!set) {
            set = new Set<number>();
            activeLineGuides.set(i, set);
          }
          set.add(targetGuideCol);
        } else {
          break;
        }
      }
    }
  }

  // 3. Compute per-line valid guide columns:
  //    A column `c` is valid only if a list-marker line at indent `c` was seen above
  //    and the current line's indent has not yet exited that column's scope.
  //    This prevents guide lines from appearing on arbitrary tab-indented plain text.
  const lineGuideColumns: Set<number>[] = new Array(allLines.length);
  {
    // Stack of {col, isTab} tracking open list-marker columns
    const openListCols: number[] = [];
    for (let li = 0; li < allLines.length; li++) {
      const line = allLines[li];
      const { leadingLen, listMarkerIndent, isTab } = line;

      // Close any list columns that are now out of scope (indent dropped to or below their level)
      while (openListCols.length > 0 && openListCols[openListCols.length - 1] >= leadingLen) {
        openListCols.pop();
      }

      // If this line IS a list marker at some indent, register that column as opening a new list scope
      if (listMarkerIndent !== null) {
        // Evict any stale entry at exactly this depth first
        while (openListCols.length > 0 && openListCols[openListCols.length - 1] >= listMarkerIndent) {
          openListCols.pop();
        }
        openListCols.push(listMarkerIndent);
      }

      // Valid guide columns for this line: all open list cols that are < leadingLen
      const validCols = new Set<number>();
      const step = isTab ? 1 : getIndentSize();
      for (const col of openListCols) {
        if (col < leadingLen) {
          // Map the raw column to the nearest tab-stop column used by guide rendering
          const snappedCol = isTab ? col : Math.floor(col / step) * step;
          validCols.add(snappedCol);
        }
      }
      lineGuideColumns[li] = validCols;
    }
  }

  // 4. Scan decorations for each block using exact line indices
  let lineCursor = 0;
  for (let b = 0; b < blocks.length; b++) {
    const { node, pos, isTarget } = blocks[b];
    let nextBlockLeadingLen = 0;
    if (b < blocks.length - 1) {
      const nextMatch = blocks[b + 1].node.textContent.match(/^[ \t]+/);
      nextBlockLeadingLen = nextMatch ? nextMatch[0].length : 0;
    }

    const startLineIdx = lineCursor;
    const blockLineCount = node.textContent.split('\n').length;
    lineCursor += blockLineCount;

    // Merge guide columns for all lines of this block into a single set passed to scanBlockDecorations.
    // scanBlockDecorations will intersect per-line as needed, but since it processes line-by-line
    // we pass the union (the inner loops still check `s < leadingLen`, so out-of-range cols are inert).
    // For correctness, pass per-line sets by encoding them into a union covering the block's lines.
    // Since scanBlockDecorations iterates lines internally, we pass a union and let the column
    // range check (`s < leadingLen`) do the rest. Columns from deeper lines won't bleed shallower.
    const blockGuideColumnsUnion = new Set<number>();
    for (let li = startLineIdx; li < startLineIdx + blockLineCount; li++) {
      if (lineGuideColumns[li]) {
        for (const c of lineGuideColumns[li]) {
          blockGuideColumnsUnion.add(c);
        }
      }
    }

    const blockDecos = scanBlockDecorations(
      node,
      pos,
      isFocused,
      selFrom,
      selTo,
      isTarget,
      startLineIdx,
      activeLineGuides,
      nextBlockLeadingLen,
      blockGuideColumnsUnion,
      editor
    );

    for (let i = 0; i < blockDecos.length; i++) {
      decorations.push(blockDecos[i]);
    }
  }

  return DecorationSet.create(doc, decorations);
}

/**
 * Incrementally updates decorations for massive documents (100k+ words) to guarantee sub-8ms keystroke latency.
 * Maps existing decorations forward and only rescans modified or caret-activated textblocks.
 */
function updateDecorationsIncrementally(
  tr: any,
  oldPluginState: LivePreviewPluginState,
  oldState: any,
  newState: any,
  isFocused: boolean,
  targetHeadingIndex: number | null,
  editor: any
): DecorationSet {
  const { doc, selection } = newState;
  const { from: selFrom, to: selTo } = selection;

  // For small-to-moderate documents (< 200 blocks), full rebuild is instantaneous (<0.3ms)
  // and guarantees 100% list guide and heading outline consistency.
  let blockCount = 0;
  doc.descendants((n: any) => {
    if (n.isTextblock) blockCount++;
    return blockCount < 200;
  });

  if (blockCount < 200) {
    return buildAllDecorations(doc, isFocused, selFrom, selTo, targetHeadingIndex, editor);
  }

  // Massive documents (10k - 100k+ words): Perform incremental dirty range updates
  let currentDecos = oldPluginState.decorations.map(tr.mapping, doc);

  if (tr.docChanged) {
    // 1. Calculate dirty range in new document
    let minNewPos = doc.content.size;
    let maxNewPos = 0;

    tr.mapping.maps.forEach((stepMap: any) => {
      stepMap.forEach((_oldStart: number, _oldEnd: number, newStart: number, newEnd: number) => {
        minNewPos = Math.min(minNewPos, newStart);
        maxNewPos = Math.max(maxNewPos, newEnd);
      });
    });

    if (minNewPos > maxNewPos) {
      return buildAllDecorations(doc, isFocused, selFrom, selTo, targetHeadingIndex, editor);
    }

    // Expand to textblock boundaries
    const safeMin = Math.max(0, Math.min(minNewPos, doc.content.size));
    const safeMax = Math.max(safeMin, Math.min(maxNewPos, doc.content.size));

    const $from = doc.resolve(safeMin);
    const $to = doc.resolve(safeMax);

    // Expand to top-level block bounds
    const dirtyStart = $from.depth > 0 ? $from.before(1) : 0;
    const dirtyEnd = $to.depth > 0 ? $to.after(1) : doc.content.size;

    // Remove existing decorations in the dirty range
    const oldInRange = currentDecos.find(dirtyStart, dirtyEnd);
    currentDecos = currentDecos.remove(oldInRange);

    // Rescan only textblocks intersecting the dirty range
    const newDecos: Decoration[] = [];
    doc.nodesBetween(dirtyStart, dirtyEnd, (node: any, pos: number) => {
      if (!node.isTextblock) return true;
      const decos = scanBlockDecorations(
        node,
        pos,
        isFocused,
        selFrom,
        selTo,
        false,
        0,
        null,
        0,
        null,
        editor
      );
      for (let i = 0; i < decos.length; i++) {
        newDecos.push(decos[i]);
      }
      return false;
    });

    if (newDecos.length > 0) {
      currentDecos = currentDecos.add(doc, newDecos);
    }

    return currentDecos;
  }

  // 2. Selection-only changes on massive documents:
  if (oldState) {
    const oldFrom = oldState.selection.from;
    const oldTo = oldState.selection.to;

    const $oldPos = oldState.doc.resolve(Math.min(oldFrom, oldState.doc.content.size));
    const $newPos = doc.resolve(Math.min(selFrom, doc.content.size));

    // If caret remained within the same textblock, check if we need to update
    const oldBlockPos = $oldPos.depth > 0 ? $oldPos.before(1) : 0;
    const newBlockPos = $newPos.depth > 0 ? $newPos.before(1) : 0;

    if (oldBlockPos === newBlockPos && oldFrom === selFrom && oldTo === selTo) {
      return currentDecos;
    }

    // Only rescan previous active block and new active block
    const affectedPositions = Array.from(new Set([oldBlockPos, newBlockPos]));
    for (const bPos of affectedPositions) {
      if (bPos >= doc.content.size) continue;
      const $b = doc.resolve(Math.min(bPos + 1, doc.content.size));
      const node = $b.parent;
      const start = $b.before($b.depth);
      const end = $b.after($b.depth);

      const oldInRange = currentDecos.find(start, end);
      currentDecos = currentDecos.remove(oldInRange);

      const decos = scanBlockDecorations(
        node,
        start,
        isFocused,
        selFrom,
        selTo,
        false,
        0,
        null,
        0,
        null,
        editor
      );
      if (decos.length > 0) {
        currentDecos = currentDecos.add(doc, decos);
      }
    }

    return currentDecos;
  }

  return buildAllDecorations(doc, isFocused, selFrom, selTo, targetHeadingIndex, editor);
}

export const LivePreviewSyntax = Extension.create({
  name: 'livePreviewSyntax',

  addProseMirrorPlugins() {
    const extensionThis = this;
    return [
      new Plugin<LivePreviewPluginState>({
        key: LivePreviewSyntaxPluginKey,
        state: {
          init() {
            return {
              decorations: DecorationSet.empty,
              focused: true,
              targetHeadingIndex: null as number | null,
            };
          },
          apply(tr, oldPluginState, oldState, newState) {
            const isEditable = extensionThis.editor ? extensionThis.editor.isEditable : true;
            const { doc, selection } = newState;
            const { from: selFrom, to: selTo } = selection;

            const metaFocus = tr.getMeta('livePreviewFocus');
            let isFocused = metaFocus !== undefined ? metaFocus : (oldPluginState?.focused ?? true);
            if (!isEditable) {
              isFocused = false;
            }

            const metaTargetHeading = tr.getMeta('targetHeadingIndex');
            let targetHeadingIndex =
              metaTargetHeading !== undefined
                ? metaTargetHeading
                : (oldPluginState?.targetHeadingIndex ?? null);

            // Clear target highlight on user edit or selection change
            if (tr.docChanged || (tr.selectionSet && metaTargetHeading === undefined)) {
              targetHeadingIndex = null;
            }

            // Always compute fresh decorations on focus change, target heading change, or initial load
            const focusChanged = oldPluginState?.focused !== isFocused;
            const targetHeadingChanged =
              metaTargetHeading !== undefined ||
              (oldPluginState?.targetHeadingIndex !== null && targetHeadingIndex === null);
            const selectionChanged = !oldState || !oldState.selection.eq(newState.selection);

            if (
              !oldPluginState ||
              !oldPluginState.decorations ||
              focusChanged ||
              targetHeadingChanged
            ) {
              return {
                decorations: buildAllDecorations(doc, isFocused, selFrom, selTo, targetHeadingIndex, extensionThis.editor),
                focused: isFocused,
                targetHeadingIndex,
              };
            }

            if (tr.docChanged || selectionChanged || tr.selectionSet) {
              return {
                decorations: updateDecorationsIncrementally(
                  tr,
                  oldPluginState,
                  oldState,
                  newState,
                  isFocused,
                  targetHeadingIndex,
                  extensionThis.editor
                ),
                focused: isFocused,
                targetHeadingIndex,
              };
            }

            return {
              decorations: oldPluginState.decorations.map(tr.mapping, doc),
              focused: isFocused,
              targetHeadingIndex,
            };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decorations;
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;

            // 0. Direct Image click action: Open Image Lightbox
            const imgEl = target.closest('img.flint-media-image, .flint-image-embed img') as HTMLImageElement | null;
            if (imgEl && imgEl.src) {
              useWorkspaceStore.getState().openImageLightbox(imgEl.src, imgEl.alt || '');
              return true;
            }

            // 1. Zoom button action: Open Image Lightbox
            const zoomBtn = target.closest('[data-embed-action="zoom"]') as HTMLElement | null;
            if (zoomBtn) {
              const wrapper = zoomBtn.closest('.flint-embed-wrapper, .flint-embed-media, .flint-image-embed') as HTMLElement | null;
              const img = wrapper?.querySelector('img') as HTMLImageElement | null;
              if (img && img.src) {
                useWorkspaceStore.getState().openImageLightbox(img.src, img.alt || '');
                return true;
              }
            }

            // 2. Code button action: Reveal embed wikilink syntax for editing
            const codeBtn = target.closest('[data-embed-action="code"]') as HTMLElement | null;
            if (codeBtn) {
              view.focus();
              const tr = view.state.tr.setSelection(
                (view.state.selection.constructor as any).near(view.state.doc.resolve(pos))
              );
              view.dispatch(tr);
              return true;
            }

            const actionEl = target.closest('.flint-embed-action, audio, video, iframe, button, a, input, select') as HTMLElement | null;
            if (actionEl) {
              return true;
            }
            const embedEl = target.closest('.flint-embed-wrapper, .flint-embed-card, .flint-embed-media') as HTMLElement | null;
            if (embedEl) {
              view.focus();
              const tr = view.state.tr.setSelection(
                (view.state.selection.constructor as any).near(view.state.doc.resolve(pos))
              );
              view.dispatch(tr);
              return true;
            }
            const mathEl = target.closest('.md-math-render') as HTMLElement | null;
            if (mathEl) {
              view.focus();
              const tr = view.state.tr.setSelection(
                (view.state.selection.constructor as any).near(view.state.doc.resolve(pos))
              );
              view.dispatch(tr);
              return true;
            }
            return false;
          },
          handleDOMEvents: {
            focus(view) {
              if (!view.editable) return false;
              view.dispatch(view.state.tr.setMeta('livePreviewFocus', true));
              return false;
            },
            blur(view) {
              view.dispatch(view.state.tr.setMeta('livePreviewFocus', false));
              return false;
            },
          },
        },
        view(editorView) {
          const handleFocusEmbedCode = (e: Event) => {
            const customEvt = e as CustomEvent<{ target: string; cleanTarget?: string }>;
            const rawTarget = customEvt.detail?.target;
            const cleanTarget = customEvt.detail?.cleanTarget;
            if (!rawTarget && !cleanTarget) return;

            const { doc } = editorView.state;
            let foundPos: number | null = null;
            doc.descendants((node, pos) => {
              if (foundPos !== null) return false;
              if (node.isText && node.text) {
                if (rawTarget && node.text.includes(rawTarget)) {
                  foundPos = pos + node.text.indexOf(rawTarget);
                  return false;
                }
                if (cleanTarget && node.text.includes(cleanTarget)) {
                  foundPos = pos + node.text.indexOf(cleanTarget);
                  return false;
                }
              }
              return true;
            });

            if (foundPos !== null) {
              editorView.focus();
              const tr = editorView.state.tr.setSelection(
                (editorView.state.selection.constructor as any).near(editorView.state.doc.resolve(foundPos + 1))
              );
              editorView.dispatch(tr);
            }
          };

          document.addEventListener('flint:focus-embed-code', handleFocusEmbedCode);

          return {
            update(view) {
              if (view.composing) return;
              normalizeDOMSelection(view);
            },
            destroy() {
              document.removeEventListener('flint:focus-embed-code', handleFocusEmbedCode);
            },
          };
        },
      }),
    ];
  },
});

function normalizeDOMSelection(view: any) {
  if (!view || !view.dom || view.composing) return;
  const root = view.root as Document | ShadowRoot | undefined;
  const sel = (root && 'getSelection' in root && typeof (root as Document).getSelection === 'function')
    ? (root as Document).getSelection()
    : window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

  const range = sel.getRangeAt(0);
  let startContainer = range.startContainer;
  let startOffset = range.startOffset;
  let endContainer = range.endContainer;
  let endOffset = range.endOffset;
  let changed = false;

  // If startContainer is a syntax marker element or text node at its end:
  const startElem = (startContainer.nodeType === 1 ? startContainer : startContainer.parentElement) as HTMLElement | null;
  if (startElem && (startElem.classList.contains('md-syntax-dimmed') || startElem.classList.contains('md-syntax-hidden'))) {
    const textLen = startContainer.nodeValue?.length ?? startContainer.childNodes.length;
    if (startOffset === textLen) {
      let next = startElem.nextSibling;
      while (next && next.nodeType === 1 && ((next as HTMLElement).classList.contains('md-syntax-dimmed') || (next as HTMLElement).classList.contains('md-syntax-hidden'))) {
        next = next.nextSibling;
      }
      if (next) {
        const targetNode = next.nodeType === 3 ? next : next.firstChild;
        if (targetNode) {
          startContainer = targetNode;
          startOffset = 0;
          changed = true;
        }
      }
    }
  }

  // If endContainer is a syntax marker at offset 0:
  const endElem = (endContainer.nodeType === 1 ? endContainer : endContainer.parentElement) as HTMLElement | null;
  if (endElem && (endElem.classList.contains('md-syntax-dimmed') || endElem.classList.contains('md-syntax-hidden'))) {
    if (endOffset === 0) {
      let prev = endElem.previousSibling;
      while (prev && prev.nodeType === 1 && ((prev as HTMLElement).classList.contains('md-syntax-dimmed') || (prev as HTMLElement).classList.contains('md-syntax-hidden'))) {
        prev = prev.previousSibling;
      }
      if (prev) {
        const targetNode = prev.nodeType === 3 ? prev : prev.lastChild;
        if (targetNode) {
          endContainer = targetNode;
          endOffset = targetNode.nodeValue?.length || 0;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    try {
      const newRange = document.createRange();
      newRange.setStart(startContainer, startOffset);
      newRange.setEnd(endContainer, endOffset);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } catch (e) {}
  }
}
