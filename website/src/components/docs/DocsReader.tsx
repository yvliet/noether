import React, { useState, useMemo, useRef, useCallback } from 'react';
import katex from 'katex';
import { DocNode, TableOfContentItem } from '../../types';
import { highlightCode } from './syntaxHighlighter';
import {
  Copy01Icon,
  CheckIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Link04Icon,
  InformationCircleIcon,
  BulbIcon,
  Alert02Icon,
  AlertTriangleIcon,
  AlertDiamondIcon,
  QuoteUpIcon,
  QuoteIcon,
} from '../common/Icons';
import { ComponentPreviewMap } from './ComponentPreview';

export interface DocsReaderProps {
  doc: DocNode;
  allDocs: DocNode[];
  onSelectDoc: (doc: DocNode) => void;
}

// Generate URL slug from heading text
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Extract Table of Contents items from markdown content
export function extractTocItems(content: string): TableOfContentItem[] {
  if (!content) return [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const items: TableOfContentItem[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const rawText = match[2].trim();

      // Filter out code snippet file labels (e.g. manifest.json, src/main.ts, build.js, etc.)
      const cleaned = rawText.replace(/[`'"]/g, '').trim();
      const isFileHeader =
        /\.(json|ts|tsx|js|jsx|css|md|yaml|yml|toml|sql|sh|html)$/i.test(cleaned) ||
        /^(manifest|package|tsconfig|build|styles|theme|src\/)/i.test(cleaned);

      if (isFileHeader) continue;

      const text = rawText
        .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => display || target)
        .replace(/`([^`]+)`/g, '$1')
        .replace(/(?<!\\)\$([^\$\r\n]+?)(?<!\\)\$/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1');
      const id = slugify(text);
      items.push({ id, text, level });
    }
  }
  return items;
}

// Compute backlinks ("Links to this page") for a document across all docs
export function computeBacklinks(doc: DocNode, allDocs: DocNode[]): DocNode[] {
  const flattenedDocs: DocNode[] = [];
  const walk = (nodes: DocNode[]) => {
    for (const node of nodes) {
      if (!node.isFolder && node.content) {
        flattenedDocs.push(node);
      }
      if (node.children) {
        walk(node.children);
      }
    }
  };
  walk(allDocs);

  const targets = new Set<string>();
  targets.add(doc.title.toLowerCase());
  targets.add(doc.id.toLowerCase());
  if (doc.slug) targets.add(doc.slug.toLowerCase());
  if (doc.aliases) {
    for (const alias of doc.aliases) {
      targets.add(alias.toLowerCase());
    }
  }

  const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links: DocNode[] = [];

  for (const item of flattenedDocs) {
    if (item.id === doc.id || item.slug === doc.slug) continue;
    const content = item.content || '';
    let match: RegExpExecArray | null;
    let isLinked = false;
    while ((match = wikilinkRegex.exec(content)) !== null) {
      const rawTarget = match[1].split('#')[0].trim().toLowerCase();
      if (targets.has(rawTarget)) {
        isLinked = true;
        break;
      }
    }
    if (isLinked) {
      links.push(item);
    }
  }
  return links;
}

// Inline markdown renderer for bold, italic, code, KaTeX math, links, and Obsidian wikilinks
function renderInlineMarkdown(text: string): string {
  // 1. First extract all inline code spans according to CommonMark spec
  // Matches any sequence of 1 or more backticks: (`+)([\s\S]*?)\1
  const codeTokens: string[] = [];
  const codePlaceholder = (idx: number) => `\x01CODE_${idx}\x02`;

  let processed = text.replace(/(`+)([\s\S]*?)\1/g, (_, __, content) => {
    let codeText = content;
    // CommonMark stripping rule: if content begins and ends with a space and is not only spaces, strip one space
    if (codeText.length >= 2 && codeText.startsWith(' ') && codeText.endsWith(' ') && codeText.trim().length > 0) {
      codeText = codeText.slice(1, -1);
    }
    const escaped = codeText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const html = `<code class="px-1.5 py-0.5 rounded text-[0.875em] font-mono bg-[#1f1f1f] text-[#dadada] border border-[#363636]">${escaped}</code>`;
    const token = codePlaceholder(codeTokens.length);
    codeTokens.push(html);
    return token;
  });

  // 2. Extract math spans: $...$
  const mathTokens: string[] = [];
  const mathPlaceholder = (idx: number) => `\x01MATH_${idx}\x02`;

  // Matches $...$ where opening $ is not followed by space, closing $ is not preceded by space, and not escaped
  processed = processed.replace(/(?<!\\)\$(?!\s)([^\$\r\n]+?)(?<!\s)(?<!\\)\$/g, (match, tex) => {
    const trimmed = tex.trim();
    if (!trimmed) return match;
    try {
      const rendered = katex.renderToString(trimmed, {
        displayMode: false,
        throwOnError: false,
      });
      const token = mathPlaceholder(mathTokens.length);
      mathTokens.push(rendered);
      return token;
    } catch {
      return match;
    }
  });

  // 3. Escape HTML for remaining text
  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Restore HTML line break tags
    .replace(/&lt;br\s*\/?&gt;/gi, '<br />');

  // 4. Obsidian Wikilinks: [[Target|Label]] or [[Target]] with Flint orange accent
  processed = processed
    .replace(
      /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
      '<a href="#docs/$1" data-wikilink="$1" class="internal-link text-[#ea580c] hover:text-[#f97316] underline underline-offset-2 font-normal cursor-pointer">$2</a>'
    )
    .replace(
      /\[\[([^\]]+)\]\]/g,
      '<a href="#docs/$1" data-wikilink="$1" class="internal-link text-[#ea580c] hover:text-[#f97316] underline underline-offset-2 font-normal cursor-pointer">$1</a>'
    );

  // 5. Standard markdown links [text](url) with Flint orange accent
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-[#ea580c] hover:text-[#f97316] underline underline-offset-2 font-normal">$1</a>'
  );

  // 6. Highlight ==text==
  processed = processed.replace(
    /==([^=]+)==/g,
    '<mark class="px-1.5 py-0.5 rounded bg-[#ea580c]/20 text-[#f97316] font-medium border border-[#ea580c]/30">$1</mark>'
  );

  // 7. Bold **text** or __text__
  processed = processed
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/__([^_]+)__/g, '<strong class="font-bold text-white">$1</strong>');

  // 8. Italic *text* or _text_
  processed = processed
    .replace(/\*([^*]+)\*/g, '<em class="italic text-[#b3b3b3]">$1</em>')
    .replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em class="italic text-[#b3b3b3]">$1</em>');

  // 9. Strikethrough ~~text~~
  processed = processed.replace(/~~([^~]+)~~/g, '<del class="line-through text-[#888]">$1</del>');

  // 10. Restore math tokens
  for (let i = 0; i < mathTokens.length; i++) {
    processed = processed.replace(mathPlaceholder(i), () => mathTokens[i]);
  }

  // 11. Restore code tokens
  for (let i = 0; i < codeTokens.length; i++) {
    processed = processed.replace(codePlaceholder(i), () => codeTokens[i]);
  }

  return processed;
}

export const DocsReader: React.FC<DocsReaderProps> = React.memo(({
  doc,
  allDocs,
  onSelectDoc,
}) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [copiedHeadingId, setCopiedHeadingId] = useState<string | null>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Flatten docs list for sequential Prev / Next links
  const flattenedDocs = useMemo(() => {
    const list: DocNode[] = [];
    const flatten = (items: DocNode[]) => {
      items.forEach((item) => {
        if (!item.isFolder || (item.content && item.content.trim().length > 0)) {
          list.push(item);
        }
        if (item.children) flatten(item.children);
      });
    };
    flatten(allDocs);
    return list;
  }, [allDocs]);

  const currentIndex = flattenedDocs.findIndex((d) => d.id === doc.id || d.slug === doc.slug);
  const prevDoc = currentIndex > 0 ? flattenedDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex >= 0 && currentIndex < flattenedDocs.length - 1 ? flattenedDocs[currentIndex + 1] : null;

  // Helper to normalize strings for robust wikilink comparison
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Lookup doc by wikilink target with full alias, slug, and fuzzy keyword matching
  const findDocByTarget = useCallback((target: string): DocNode | null => {
    const cleanTarget = target.split('#')[0].replace(/&amp;/g, '&').trim();
    if (!cleanTarget) return null;
    const lowerTarget = cleanTarget.toLowerCase();
    const normTarget = normalize(cleanTarget);

    // 1. Exact case-insensitive match on id, title, slug, or aliases
    for (const item of flattenedDocs) {
      if (
        item.id.toLowerCase() === lowerTarget ||
        item.title.toLowerCase() === lowerTarget ||
        (item.slug && item.slug.toLowerCase() === lowerTarget)
      ) {
        return item;
      }
      if (item.aliases) {
        for (const alias of item.aliases) {
          if (alias.toLowerCase() === lowerTarget) {
            return item;
          }
        }
      }
    }

    // 2. Normalized alphanumeric match (ignores hyphens, ampersands, spaces, punctuation)
    for (const item of flattenedDocs) {
      if (
        normalize(item.id) === normTarget ||
        normalize(item.title) === normTarget ||
        (item.slug && normalize(item.slug) === normTarget)
      ) {
        return item;
      }
      if (item.aliases) {
        for (const alias of item.aliases) {
          if (normalize(alias) === normTarget) {
            return item;
          }
        }
      }
    }

    // 3. Keyword / semantic substring fallback
    for (const item of flattenedDocs) {
      const itemTitleNorm = normalize(item.title);
      const itemIdNorm = normalize(item.id);
      if (itemTitleNorm.includes(normTarget) || normTarget.includes(itemTitleNorm) ||
          itemIdNorm.includes(normTarget) || normTarget.includes(itemIdNorm)) {
        return item;
      }
    }

    // 4. Check allDocs recursively in case target is a folder node without direct content
    const findInTree = (nodes: DocNode[]): DocNode | null => {
      for (const n of nodes) {
        if (
          n.id.toLowerCase() === lowerTarget ||
          n.title.toLowerCase() === lowerTarget ||
          (n.slug && n.slug.toLowerCase() === lowerTarget) ||
          normalize(n.title) === normTarget ||
          (n.aliases && n.aliases.some((a) => normalize(a) === normTarget || a.toLowerCase() === lowerTarget))
        ) {
          if (n.content && n.content.trim().length > 0) return n;
          if (n.children && n.children.length > 0) {
            const firstWithContent = n.children.find((c) => c.content && c.content.trim().length > 0);
            if (firstWithContent) return firstWithContent;
          }
        }
        if (n.children) {
          const res = findInTree(n.children);
          if (res) return res;
        }
      }
      return null;
    };

    return findInTree(allDocs);
  }, [flattenedDocs, allDocs]);

  // Click delegation for internal wikilinks
  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a.internal-link');
    if (target) {
      e.preventDefault();
      const rawTarget = target.getAttribute('data-wikilink');
      if (rawTarget) {
        const [docTarget, anchor] = rawTarget.split('#');
        const match = findDocByTarget(docTarget);
        if (match) {
          onSelectDoc(match);
          if (anchor) {
            setTimeout(() => {
              const el = document.getElementById(slugify(anchor));
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }
        } else {
          window.location.hash = `#docs/${slugify(docTarget)}${anchor ? '#' + slugify(anchor) : ''}`;
        }
      }
    }
  }, [findDocByTarget, onSelectDoc]);

  // Parse markdown content into structured React elements
  const elements = useMemo(() => {
    const content = doc.content || '';
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const nodes: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    let fenceIndent = 0;

    let inTable = false;
    let tableBuffer: string[] = [];

    let inHtmlTable = false;
    let htmlTableBuffer: string[] = [];

    let inQuote = false;
    let quoteBuffer: string[] = [];

    let inMathBlock = false;
    let mathBuffer: string[] = [];

    type ListItem = {
      type: 'bullet' | 'ordered' | 'task';
      marker: string;
      text: string;
      checked?: boolean;
      indent: number;
    };
    let listBuffer: ListItem[] = [];
    let lastWasHeading = false;

    const flushList = (key: number) => {
      if (listBuffer.length > 0) {
        const isOrdered = listBuffer[0].type === 'ordered';
        const ListTag = isOrdered ? 'ol' : 'ul';

        nodes.push(
          <ListTag key={`list-${key}`} className="my-2 pl-6 space-y-1 text-[#dadada] text-[16px] leading-[1.75]">
            {listBuffer.map((item, idx) => {
              const indentPadding = item.indent > 0 ? { paddingLeft: `${item.indent * 24}px` } : undefined;

              if (item.type === 'task') {
                return (
                  <li key={idx} style={indentPadding} className="flex items-start gap-2 list-none mb-1">
                    <label className="flex items-center justify-center h-[1.75em] shrink-0 select-none">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        readOnly
                        className="w-[14px] h-[14px] cursor-default accent-[#ea580c] rounded"
                      />
                    </label>
                    <span
                      className={`flex-1 ${item.checked ? 'line-through text-[#666666]' : ''}`}
                      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
                    />
                  </li>
                );
              }

              if (item.type === 'ordered') {
                return (
                  <li key={idx} style={indentPadding} className="flex items-start gap-2 list-none">
                    <span className="text-[#888888] font-normal text-[14px] shrink-0 min-w-[20px]">
                      {item.marker}
                    </span>
                    <span
                      className="flex-1"
                      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
                    />
                  </li>
                );
              }

              return (
                <li key={idx} style={indentPadding} className="flex items-start gap-2 list-none">
                  <span className="text-[#888888] shrink-0 select-none text-[13px] pt-1 leading-none">•</span>
                  <span
                    className="flex-1"
                    dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
                  />
                </li>
              );
            })}
          </ListTag>
        );
        listBuffer = [];
      }
    };

    const flushTable = (key: number) => {
      if (tableBuffer.length > 0) {
        // 1. Split raw rows
        const rawRows = tableBuffer.map((line) =>
          line
            .split(/(?<!\\)\|/)
            .map((c) => c.trim().replace(/\\\|/g, '|'))
            .filter((c, idx, arr) => (idx > 0 && idx < arr.length - 1) || c !== '')
        );

        if (rawRows.length >= 1) {
          // Detect separator row
          let separatorIdx = -1;
          const alignments: ('left' | 'center' | 'right')[] = [];

          for (let r = 0; r < rawRows.length; r++) {
            const isSep = rawRows[r].length > 0 && rawRows[r].every((c) => /^:?-+:?$/.test(c.trim()));
            if (isSep) {
              separatorIdx = r;
              rawRows[r].forEach((c) => {
                const trimmed = c.trim();
                const starts = trimmed.startsWith(':');
                const ends = trimmed.endsWith(':');
                if (starts && ends) alignments.push('center');
                else if (ends) alignments.push('right');
                else alignments.push('left');
              });
              break;
            }
          }

          // Filter out separator row to get pure content rows
          const contentRows = separatorIdx >= 0
            ? rawRows.filter((_, idx) => idx !== separatorIdx)
            : rawRows;

          const numHeaderRows = separatorIdx > 0 ? separatorIdx : 1;
          const maxCols = Math.max(...contentRows.map((r) => r.length), alignments.length, 1);

          interface GridCell {
            content: string;
            colSpan: number;
            rowSpan: number;
            align: 'left' | 'center' | 'right';
            isMerged: boolean;
            isHeader: boolean;
          }

          // Initialize 2D grid
          const grid: GridCell[][] = contentRows.map((row, rIdx) => {
            const isHeader = rIdx < numHeaderRows;
            const cells: GridCell[] = [];
            for (let c = 0; c < maxCols; c++) {
              const raw = row[c] ?? '';
              cells.push({
                content: raw,
                colSpan: 1,
                rowSpan: 1,
                align: alignments[c] || 'left',
                isMerged: false,
                isHeader,
              });
            }
            return cells;
          });

          // Resolve cell spans across rows and columns
          for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < maxCols; c++) {
              const cell = grid[r][c];
              if (cell.isMerged) continue;

              let text = cell.content;
              // Explicit attributes like [colspan=2], [rowspan=2], [align=center]
              const colMatch = text.match(/\[(?:colspan|cols?)=(\d+)\]|\{(?:colspan|cols?)=(\d+)\}/i);
              if (colMatch) {
                cell.colSpan = parseInt(colMatch[1] || colMatch[2], 10);
                text = text.replace(colMatch[0], '').trim();
              }
              const rowMatch = text.match(/\[(?:rowspan|rows?)=(\d+)\]|\{(?:rowspan|rows?)=(\d+)\}/i);
              if (rowMatch) {
                cell.rowSpan = parseInt(rowMatch[1] || rowMatch[2], 10);
                text = text.replace(rowMatch[0], '').trim();
              }
              const alignMatch = text.match(/\[align=(left|center|right)\]|\{align=(left|center|right)\}/i);
              if (alignMatch) {
                cell.align = (alignMatch[1] || alignMatch[2]).toLowerCase() as 'left' | 'center' | 'right';
                text = text.replace(alignMatch[0], '').trim();
              }

              cell.content = text;

              // Horizontal merge character: '>' or '||'
              if (text === '>' || text === '||') {
                cell.isMerged = true;
                for (let prevC = c - 1; prevC >= 0; prevC--) {
                  if (!grid[r][prevC].isMerged) {
                    grid[r][prevC].colSpan += 1;
                    break;
                  }
                }
                continue;
              }

              // Vertical merge character: '^'
              if (text === '^') {
                cell.isMerged = true;
                for (let prevR = r - 1; prevR >= 0; prevR--) {
                  if (!grid[prevR][c].isMerged) {
                    grid[prevR][c].rowSpan += 1;
                    break;
                  }
                }
                continue;
              }

              // If colSpan > 1, mark subsequent cells as merged
              if (cell.colSpan > 1) {
                for (let k = 1; k < cell.colSpan && c + k < maxCols; k++) {
                  grid[r][c + k].isMerged = true;
                }
                if (!alignMatch && cell.isHeader) {
                  cell.align = 'center';
                }
              }

              // If rowSpan > 1, mark lower cells as merged
              if (cell.rowSpan > 1) {
                for (let k = 1; k < cell.rowSpan && r + k < grid.length; k++) {
                  grid[r + k][c].isMerged = true;
                }
              }
            }
          }

          const theadRows = grid.filter((_, idx) => idx < numHeaderRows);
          const tbodyRows = grid.filter((_, idx) => idx >= numHeaderRows);

          nodes.push(
            <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-lg border border-[#2e2e2e] bg-[#161616]">
              <table className="w-full text-left text-[13.5px] leading-[1.5] border-collapse">
                {theadRows.length > 0 && (
                  <thead>
                    {theadRows.map((row, rIdx) => (
                      <tr key={`th-row-${rIdx}`} className="bg-[#1c1c1c] text-[#dadada] font-semibold border-b border-[#2e2e2e]">
                        {row.map((cell, cIdx) => {
                          if (cell.isMerged) return null;
                          const alignClass = cell.align === 'center' ? 'text-center' : cell.align === 'right' ? 'text-right' : 'text-left';
                          const isMergedHeader = cell.colSpan > 1;
                          return (
                            <th
                              key={`th-${rIdx}-${cIdx}`}
                              colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                              rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                              className={`px-3.5 py-2.5 border-r border-[#2e2e2e] last:border-r-0 ${alignClass} ${isMergedHeader ? 'table-header-merged' : ''}`}
                              dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cell.content) }}
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                )}
                <tbody>
                  {tbodyRows.map((row, rIdx) => (
                    <tr key={`tb-row-${rIdx}`} className="border-b border-[#242424] last:border-b-0 hover:bg-[#1a1a1a]">
                      {row.map((cell, cIdx) => {
                        if (cell.isMerged) return null;
                        const alignClass = cell.align === 'center' ? 'text-center' : cell.align === 'right' ? 'text-right' : 'text-left';
                        const isSubHeader = cell.colSpan === maxCols;
                        return (
                          <td
                            key={`td-${rIdx}-${cIdx}`}
                            colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                            rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                            className={`px-3.5 py-2.5 border-r border-[#242424] last:border-r-0 text-[#dadada] ${alignClass} ${isSubHeader ? 'bg-[#1e1e1e] font-semibold text-[#f0f0f0]' : ''}`}
                            dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cell.content) }}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        tableBuffer = [];
        inTable = false;
      }
    };

    const flushHtmlTable = (key: number) => {
      if (htmlTableBuffer.length > 0) {
        const rawHtml = htmlTableBuffer.join('\n');
        // Render inner cells with markdown & math
        const processedHtml = rawHtml.replace(/<(t[hd])([^>]*)>([\s\S]*?)<\/\1>/gi, (_, tag, attrs, content) => {
          const rendered = renderInlineMarkdown(content.trim());
          return `<${tag}${attrs}>${rendered}</${tag}>`;
        });

        nodes.push(
          <div
            key={`html-table-${key}`}
            className="my-4 overflow-x-auto rounded-lg border border-[#2e2e2e] bg-[#161616]"
            dangerouslySetInnerHTML={{
              __html: processedHtml
                .replace(/<table(?:\s+[^>]*)?>/i, '<table class="w-full text-left text-[13.5px] leading-[1.5] border-collapse">')
                .replace(/<thead(?:\s+[^>]*)?>/gi, '<thead class="bg-[#1c1c1c] text-[#dadada] font-semibold border-b border-[#2e2e2e]">')
                .replace(/<tbody(?:\s+[^>]*)?>/gi, '<tbody>')
                .replace(/<tr(?:\s+[^>]*)?>/gi, '<tr class="border-b border-[#242424] last:border-b-0 hover:bg-[#1a1a1a]">')
                .replace(/<th(?:\s+([^>]*))?>/gi, '<th class="px-3.5 py-2.5 border-r border-[#2e2e2e] last:border-r-0 font-semibold" $1>')
                .replace(/<td(?:\s+([^>]*))?>/gi, '<td class="px-3.5 py-2.5 border-r border-[#242424] last:border-r-0 text-[#dadada]" $1>')
            }}
          />
        );
        htmlTableBuffer = [];
        inHtmlTable = false;
      }
    };

    const flushQuote = (key: number) => {
      if (quoteBuffer.length > 0) {
        const strippedLines = quoteBuffer.map((l) => {
          const match = l.trim().match(/^>\s?(.*)$/);
          return match ? match[1] : l.trim();
        });

        const firstLine = strippedLines[0].trim();
        const calloutMatch = firstLine.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|QUOTE)\](?:\s*(.*))?$/i);

        if (calloutMatch) {
          const calloutType = calloutMatch[1].toUpperCase();
          const inlineTitle = calloutMatch[2]?.trim() || '';

          const calloutColors: Record<
            string,
            {
              border: string;
              bg: string;
              text: string;
              icon: React.ComponentType<{ size?: number; className?: string }>;
            }
          > = {
            NOTE: { border: 'border-blue-500/50', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: InformationCircleIcon },
            TIP: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: BulbIcon },
            IMPORTANT: { border: 'border-purple-500/50', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Alert02Icon },
            WARNING: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertTriangleIcon },
            CAUTION: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-400', icon: AlertDiamondIcon },
            QUOTE: { border: 'border-[#555555]', bg: 'bg-[#1e1e1e]/90', text: 'text-[#aaaaaa]', icon: QuoteUpIcon },
          };
          const style = calloutColors[calloutType] || calloutColors.NOTE;
          const CalloutIcon = style.icon;

          const rawBodyLines = strippedLines.slice(1);
          let paragraphs: string[] = [];

          if (rawBodyLines.length === 0 && inlineTitle) {
            paragraphs = [inlineTitle];
          } else {
            let currentPara: string[] = [];
            for (const bl of rawBodyLines) {
              const trimmed = bl.trim();
              if (!trimmed) {
                if (currentPara.length > 0) {
                  paragraphs.push(currentPara.join(' '));
                  currentPara = [];
                }
              } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                if (currentPara.length > 0) {
                  paragraphs.push(currentPara.join(' '));
                  currentPara = [];
                }
                paragraphs.push(trimmed);
              } else {
                currentPara.push(trimmed);
              }
            }
            if (currentPara.length > 0) {
              paragraphs.push(currentPara.join(' '));
            }
          }

          nodes.push(
            <div
              key={`callout-${key}`}
              className={`my-3 p-3.5 border-l-[3px] ${style.border} ${style.bg} rounded-r-md text-[14px]`}
            >
              <div className={`font-semibold ${style.text} flex items-center gap-1.5 uppercase tracking-wide text-xs ${paragraphs.length > 0 ? 'mb-1.5' : ''}`}>
                <CalloutIcon size={14} className="shrink-0" />
                <span>{calloutType}</span>
                {inlineTitle && rawBodyLines.length > 0 && (
                  <span className="text-white/90 normal-case font-medium ml-1">• {inlineTitle}</span>
                )}
              </div>
              {paragraphs.length > 0 && (
                <div className="text-[#dadada] leading-[1.7] space-y-2">
                  {paragraphs.map((p, pIdx) => {
                    if (p.startsWith('- ') || p.startsWith('* ')) {
                      return (
                        <div key={pIdx} className="flex items-start gap-2 pl-1">
                          <span className="text-[#888888] select-none">•</span>
                          <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(p.slice(2)) }} />
                        </div>
                      );
                    }
                    return <p key={pIdx} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(p) }} />;
                  })}
                </div>
              )}
            </div>
          );
        } else {
          // Standard Blockquote
          let paragraphs: string[] = [];
          let currentPara: string[] = [];
          for (const bl of strippedLines) {
            const trimmed = bl.trim();
            if (!trimmed) {
              if (currentPara.length > 0) {
                paragraphs.push(currentPara.join(' '));
                currentPara = [];
              }
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              if (currentPara.length > 0) {
                paragraphs.push(currentPara.join(' '));
                currentPara = [];
              }
              paragraphs.push(trimmed);
            } else {
              currentPara.push(trimmed);
            }
          }
          if (currentPara.length > 0) {
            paragraphs.push(currentPara.join(' '));
          }

          nodes.push(
            <blockquote
              key={`quote-${key}`}
              className="my-3 pl-4 border-l-[3px] border-[#383838] text-[#a0a0a0] text-[15px] italic leading-[1.75] space-y-2"
            >
              {paragraphs.map((p, pIdx) => {
                if (p.startsWith('- ') || p.startsWith('* ')) {
                  return (
                    <div key={pIdx} className="flex items-start gap-2 not-italic pl-1">
                      <span className="text-[#888888] select-none">•</span>
                      <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(p.slice(2)) }} />
                    </div>
                  );
                }
                return <p key={pIdx} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(p) }} />;
              })}
            </blockquote>
          );
        }

        quoteBuffer = [];
        inQuote = false;
        lastWasHeading = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Interactive Component Preview Directives (:::preview button, :::preview textinput, etc.)
      const previewMatch = line.trim().match(/^:::preview\s+([a-zA-Z0-9_-]+)/i) || line.trim().match(/^<!--\s*preview:\s*([a-zA-Z0-9_-]+)\s*-->/i);
      if (previewMatch && !inCodeBlock) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        const compKey = previewMatch[1].toLowerCase().replace(/[^a-z0-9]/g, '');
        const PreviewComponent = ComponentPreviewMap[compKey];
        if (PreviewComponent) {
          nodes.push(<PreviewComponent key={`preview-${i}-${compKey}`} />);
        }
        lastWasHeading = false;
        continue;
      }

      // Code blocks (```lang ... ```)
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const blockCode = codeBuffer.join('\n');
          const blockIndex = i;
          const isCopied = copiedCodeIndex === blockIndex;
          const isVisualBlock = /^(diagram|text|txt|plain|flow|preview|ui)$/i.test(codeLanguage);
          const fontClass = isVisualBlock ? 'font-sans text-[14px]' : 'font-mono text-[13.5px]';

          nodes.push(
            <div key={`code-${i}`} className="relative group my-3 rounded-lg overflow-hidden border border-[#2e2e2e] bg-[#191919]">
              {/* Floating Copy Button (appears on top right on block hover) */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(blockCode);
                  setCopiedCodeIndex(blockIndex);
                  setTimeout(() => setCopiedCodeIndex(null), 1500);
                }}
                className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 flex items-center justify-center rounded-md bg-[#252525]/90 hover:bg-[#333333] text-[#888888] hover:text-white border border-[#383838]/80 cursor-pointer ${
                  isCopied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title={isCopied ? 'Copied' : 'Copy code'}
                aria-label="Copy code"
              >
                {isCopied ? (
                  <CheckIcon size={14} className="text-emerald-400" />
                ) : (
                  <Copy01Icon size={14} />
                )}
              </button>
              <pre className={`p-4 md:p-4.5 ${fontClass} text-[#dadada] overflow-x-auto leading-[1.65]`}>
                <code dangerouslySetInnerHTML={{ __html: isVisualBlock ? renderInlineMarkdown(blockCode) : highlightCode(blockCode, codeLanguage) }} />
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
          codeLanguage = '';
          fenceIndent = 0;
          lastWasHeading = false;
        } else {
          flushList(i);
          flushTable(i);
          flushHtmlTable(i);
          flushQuote(i);
          inCodeBlock = true;
          // Record leading whitespace of the fence line so it can be stripped
          // from every body line, removing indent added by list nesting.
          fenceIndent = line.length - line.trimStart().length;
          codeLanguage = line.trim().slice(3).trim();
          lastWasHeading = false;
        }
        continue;
      }

      if (inCodeBlock) {
        // Strip the same indentation that the opening fence had.
        const stripped = fenceIndent > 0 ? line.slice(fenceIndent) : line;
        codeBuffer.push(stripped);
        continue;
      }

      // Display Math Blocks ($$ ... $$)
      const singleLineMath = line.trim().match(/^\$\$(.+?)\$\$$/);
      if (singleLineMath) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        const mathCode = singleLineMath[1].trim();
        try {
          const html = katex.renderToString(mathCode, { displayMode: true, throwOnError: false });
          nodes.push(
            <div
              key={`math-${i}`}
              className="my-4 overflow-x-auto py-3 px-4 rounded-lg bg-[#161616] border border-[#2e2e2e] text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          nodes.push(
            <div key={`math-${i}`} className="my-4 p-4 rounded-lg bg-[#161616] border border-[#2e2e2e] text-center font-mono text-[#ea580c]">
              {mathCode}
            </div>
          );
        }
        lastWasHeading = false;
        continue;
      }

      if (line.trim() === '$$' || (line.trim().startsWith('$$') && !line.trim().slice(2).includes('$$'))) {
        if (inMathBlock) {
          const rest = line.trim().slice(2).trim();
          if (rest) mathBuffer.push(rest);
          const mathCode = mathBuffer.join('\n').trim();
          const mathIndex = i;
          try {
            const html = katex.renderToString(mathCode, { displayMode: true, throwOnError: false });
            nodes.push(
              <div
                key={`math-${mathIndex}`}
                className="my-4 overflow-x-auto py-3 px-4 rounded-lg bg-[#161616] border border-[#2e2e2e] text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            nodes.push(
              <div key={`math-${mathIndex}`} className="my-4 p-4 rounded-lg bg-[#161616] border border-[#2e2e2e] text-center font-mono text-[#ea580c]">
                {mathCode}
              </div>
            );
          }
          mathBuffer = [];
          inMathBlock = false;
          lastWasHeading = false;
          continue;
        } else {
          flushList(i);
          flushTable(i);
          flushQuote(i);
          inMathBlock = true;
          const rest = line.trim().slice(2).trim();
          if (rest) mathBuffer.push(rest);
          lastWasHeading = false;
          continue;
        }
      }

      if (inMathBlock) {
        mathBuffer.push(line);
        continue;
      }

      // HTML Tables (<table ...> ... </table>)
      if (line.trim().startsWith('<table') || inHtmlTable) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        inHtmlTable = true;
        htmlTableBuffer.push(line);
        if (line.includes('</table>')) {
          flushHtmlTable(i);
        }
        continue;
      }

      // Markdown Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushList(i);
        flushHtmlTable(i);
        flushQuote(i);
        inTable = true;
        tableBuffer.push(line.trim());
        continue;
      } else if (inTable) {
        flushTable(i);
      }

      // 1. Task Checklists: - [ ] or - [x]
      const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const indent = Math.floor(taskMatch[1].length / 2);
        const checked = taskMatch[2].toLowerCase() === 'x';
        listBuffer.push({ type: 'task', marker: checked ? '[x]' : '[ ]', text: taskMatch[3], checked, indent });
        lastWasHeading = false;
        continue;
      }

      // 2. Numbered List: 1. Item
      const orderedMatch = line.match(/^(\s*)(\d+\.|\w+\.)\s+(.*)$/);
      if (orderedMatch) {
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const indent = Math.floor(orderedMatch[1].length / 2);
        listBuffer.push({ type: 'ordered', marker: orderedMatch[2], text: orderedMatch[3], indent });
        lastWasHeading = false;
        continue;
      }

      // 3. Bullet List: - Item, * Item
      const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (bulletMatch) {
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const indent = Math.floor(bulletMatch[1].length / 2);
        listBuffer.push({ type: 'bullet', marker: '•', text: bulletMatch[2], indent });
        lastWasHeading = false;
        continue;
      }

      // Empty Line
      if (!line.trim()) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        continue;
      }

      // Helper to render headings with hoverable link icon button
      const renderHeading = (
        Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
        id: string,
        headingText: string,
        key: string,
        className: string,
        iconSize = 15
      ) => {
        const isCopied = copiedHeadingId === id;
        return (
          <Tag
            key={key}
            id={id}
            className={`group ${className}`}
          >
            <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(headingText) }} />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const baseUrl = window.location.origin + window.location.pathname;
                const docSlug = doc.slug || doc.id;
                const fullUrl = `${baseUrl}#docs/${docSlug}#${id}`;
                window.location.hash = `#docs/${docSlug}#${id}`;
                navigator.clipboard.writeText(fullUrl).then(() => {
                  setCopiedHeadingId(id);
                  setTimeout(() => {
                    setCopiedHeadingId((prev) => (prev === id ? null : prev));
                  }, 1500);
                });
              }}
              title={isCopied ? 'Copied link to section!' : 'Copy link to section'}
              aria-label={`Copy link to section ${headingText}`}
              className={`inline-flex items-center align-middle ml-1.5 p-0 rounded cursor-pointer transition-none ${
                isCopied
                  ? 'opacity-100 text-[#ea580c]'
                  : 'opacity-0 group-hover:opacity-100 text-[#777777] hover:text-[#ea580c]'
              }`}
            >
              {isCopied ? (
                <CheckIcon size={iconSize} />
              ) : (
                <Link04Icon size={iconSize} />
              )}
            </button>
          </Tag>
        );
      };

      // Headings (h1 - h6, matching Flint desktop typography & spacing)
      const h1Match = line.match(/^#\s+(.+)$/);
      if (h1Match) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const headingText = h1Match[1].trim();
        const id = slugify(headingText);
        const isDocTitle = nodes.length === 0;
        nodes.push(
          renderHeading(
            'h1',
            id,
            headingText,
            `h1-${i}`,
            isDocTitle
              ? 'text-[28px] sm:text-[32px] font-bold text-white tracking-tight mb-4 leading-[1.3] scroll-mt-6'
              : 'text-[26px] sm:text-[28px] font-bold text-white tracking-tight mt-6 mb-2 leading-[1.3] scroll-mt-6',
            25
          )
        );
        lastWasHeading = true;
        continue;
      }

      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const headingText = h2Match[1].trim();
        const id = slugify(headingText);
        nodes.push(
          renderHeading(
            'h2',
            id,
            headingText,
            `h2-${i}`,
            'text-[21px] sm:text-[23px] font-semibold text-white tracking-tight mt-5 mb-2 leading-[1.35] scroll-mt-6',
            20
          )
        );
        lastWasHeading = true;
        continue;
      }

      const h3Match = line.match(/^###\s+(.+)$/);
      if (h3Match) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const headingText = h3Match[1].trim();
        const id = slugify(headingText);
        nodes.push(
          renderHeading(
            'h3',
            id,
            headingText,
            `h3-${i}`,
            'text-[17px] sm:text-[19px] font-semibold text-[#f0f0f0] tracking-tight mt-4 mb-2 leading-[1.4] scroll-mt-6',
            17
          )
        );
        lastWasHeading = true;
        continue;
      }

      const h4Match = line.match(/^####\s+(.+)$/);
      if (h4Match) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const headingText = h4Match[1].trim();
        const id = slugify(headingText);
        nodes.push(
          renderHeading(
            'h4',
            id,
            headingText,
            `h4-${i}`,
            'text-[15px] sm:text-[17px] font-semibold text-[#d4d4d4] tracking-tight mt-3.5 mb-1.5 leading-[1.45] scroll-mt-6',
            15
          )
        );
        lastWasHeading = true;
        continue;
      }

      const h5Match = line.match(/^#####\s+(.+)$/);
      if (h5Match) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const headingText = h5Match[1].trim();
        const id = slugify(headingText);
        nodes.push(
          renderHeading(
            'h5',
            id,
            headingText,
            `h5-${i}`,
            'text-[14px] sm:text-[15px] font-semibold text-[#a0a0a0] tracking-tight mt-3 mb-1 leading-[1.45] scroll-mt-6',
            14
          )
        );
        lastWasHeading = true;
        continue;
      }

      const h6Match = line.match(/^######\s+(.+)$/);
      if (h6Match) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const headingText = h6Match[1].trim();
        const id = slugify(headingText);
        nodes.push(
          renderHeading(
            'h6',
            id,
            headingText,
            `h6-${i}`,
            'text-[13px] sm:text-[14px] font-semibold text-[#888888] tracking-tight mt-2.5 mb-1 leading-[1.45] scroll-mt-6',
            13
          )
        );
        lastWasHeading = true;
        continue;
      }

      // Blockquotes & Obsidian Callouts
      if (line.trim().startsWith('>')) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        inQuote = true;
        quoteBuffer.push(line);
        continue;
      } else if (inQuote) {
        flushQuote(i);
      }

      // Horizontal Rule
      if (/^(\*\*\*|---|___)$/.test(line.trim())) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const marginClass = lastWasHeading ? 'mt-1 mb-4' : 'my-7';
        nodes.push(
          <hr
            key={`hr-${i}`}
            className={`${marginClass} border-0 border-t border-[#363636]`}
          />
        );
        lastWasHeading = false;
        continue;
      }

      // Paragraph
      flushList(i);
      flushTable(i);
      flushHtmlTable(i);
      flushQuote(i);
      nodes.push(
        <p
          key={`p-${i}`}
          className="text-[16px] text-[#dadada] leading-[1.75] my-2"
          dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line) }}
        />
      );
      lastWasHeading = false;
    }

    flushList(lines.length);
    flushTable(lines.length);
    flushHtmlTable(lines.length);
    flushQuote(lines.length);
    if (inMathBlock && mathBuffer.length > 0) {
      const mathCode = mathBuffer.join('\n').trim();
      try {
        const html = katex.renderToString(mathCode, { displayMode: true, throwOnError: false });
        nodes.push(
          <div
            key="math-end"
            className="my-4 overflow-x-auto py-3 px-4 rounded-lg bg-[#161616] border border-[#2e2e2e] text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        nodes.push(
          <div key="math-end" className="my-4 p-4 rounded-lg bg-[#161616] border border-[#2e2e2e] text-center font-mono text-[#ea580c]">
            {mathCode}
          </div>
        );
      }
      mathBuffer = [];
      inMathBlock = false;
    }

    return nodes;
  }, [doc.content, doc.id, doc.slug, copiedCodeIndex, copiedHeadingId]);

  return (
    <div
      ref={contentContainerRef}
      onClick={handleContentClick}
      className="flex-1 min-w-0 px-6 sm:px-10 py-6 bg-transparent select-text"
    >
      <article className="max-w-3xl w-full mx-auto flex flex-col pb-24">
        {/* Rendered Document Prose (Starts directly with title matching Image 1) */}
        <div className="flex flex-col flex-1 leading-normal">
          {elements}
        </div>

        {/* Previous / Next Footer Navigation */}
        <div className="mt-12 pt-6 border-t border-[#363636] flex items-center justify-between gap-4 select-none">
          {prevDoc ? (
            <button
              type="button"
              onClick={() => onSelectDoc(prevDoc)}
              className="px-3.5 py-2.5 rounded-md bg-[#191919] hover:bg-[#202020] border border-[#363636] hover:border-[#484848] text-left flex items-center gap-2 max-w-[48%] cursor-pointer"
            >
              <ArrowLeft01Icon size={14} className="shrink-0 text-[#888888]" />
              <div className="min-w-0">
                <div className="text-[10px] text-[#777777] uppercase tracking-wider">Previous</div>
                <div className="text-xs font-medium text-[#dadada] truncate hover:text-[#ea580c]">{prevDoc.title}</div>
              </div>
            </button>
          ) : <div />}

          {nextDoc ? (
            <button
              type="button"
              onClick={() => onSelectDoc(nextDoc)}
              className="px-3.5 py-2.5 rounded-md bg-[#191919] hover:bg-[#202020] border border-[#363636] hover:border-[#484848] text-right flex items-center gap-2 max-w-[48%] ml-auto cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-[10px] text-[#777777] uppercase tracking-wider">Next</div>
                <div className="text-xs font-medium text-[#dadada] truncate hover:text-[#ea580c]">{nextDoc.title}</div>
              </div>
              <ArrowRight01Icon size={14} className="shrink-0 text-[#888888]" />
            </button>
          ) : <div />}
        </div>
      </article>
    </div>
  );
});

DocsReader.displayName = 'DocsReader';
