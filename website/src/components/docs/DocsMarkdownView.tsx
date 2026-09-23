import React, { useState, useMemo } from 'react';
import katex from 'katex';
import { highlightCode } from './syntaxHighlighter';
import {
  Copy01Icon,
  CheckIcon,
  Link04Icon,
  InformationCircleIcon,
  BulbIcon,
  Alert02Icon,
  AlertTriangleIcon,
  AlertDiamondIcon,
  QuoteUpIcon,
  File01Icon,
  CheckmarkCircle02Icon,
  CheckmarkSquare02Icon,
  HelpCircleIcon,
  CancelCircleIcon,
  CodeIcon,
  Bug01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '../common/Icons';
import { slugify, renderInlineMarkdown, splitTableRow } from './DocsReader';

interface DocsCalloutItemProps {
  calloutType: string;
  foldMarker: '+' | '-' | '';
  inlineTitle: string;
  rawBodyLinesCount: number;
  paragraphs: string[];
  compact?: boolean;
  style: {
    border: string;
    bg: string;
    text: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  };
}

const DocsCalloutItem: React.FC<DocsCalloutItemProps> = ({
  calloutType,
  foldMarker,
  inlineTitle,
  paragraphs,
  compact = false,
  style,
}) => {
  const isFoldable = foldMarker === '+' || foldMarker === '-';
  const [isCollapsed, setIsCollapsed] = useState(foldMarker === '-');
  const CalloutIcon = style.icon;
  const displayTitle = inlineTitle || calloutType;

  return (
    <div
      className={`${compact ? 'my-2 p-2.5 text-[13px]' : 'my-3 p-3.5 text-[14px]'} border-l-[3px] ${style.border} ${style.bg} rounded-r-md`}
    >
      <div
        className={`font-semibold ${style.text} flex items-center justify-between ${compact ? 'text-[13px]' : 'text-sm'} ${paragraphs.length > 0 && !isCollapsed ? 'mb-1.5' : ''} ${isFoldable ? 'cursor-pointer select-none' : ''}`}
        onClick={isFoldable ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalloutIcon size={compact ? 13 : 14} className="shrink-0 relative -top-px" />
          <span className="truncate">{displayTitle}</span>
        </div>
        {isFoldable && (
          <button
            type="button"
            className="text-[var(--noether-text-muted,#888888)] hover:text-white p-0.5 rounded transition-none"
            aria-label={isCollapsed ? 'Expand callout' : 'Collapse callout'}
          >
            {isCollapsed ? <ChevronRightIcon size={14} /> : <ChevronDownIcon size={14} />}
          </button>
        )}
      </div>
      {!isCollapsed && paragraphs.length > 0 && (
        <div className={`text-[#dadada] ${compact ? 'leading-[1.6] space-y-1.5' : 'leading-[1.7] space-y-2'}`}>
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
};

export interface DocsAccordionItemProps {
  title: string;
  isOpenDefault?: boolean;
  contentLines: string[];
  compact?: boolean;
  portal?: string;
  docId?: string;
  docSlug?: string;
}

export const DocsAccordionItem: React.FC<DocsAccordionItemProps> = ({
  title,
  isOpenDefault = false,
  contentLines,
  compact = false,
  portal,
  docId,
  docSlug,
}) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault);

  return (
    <div
      className={`${
        compact ? 'my-2' : 'my-3'
      } rounded-lg border border-[#2e2e2e] bg-[#161616] overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#1a1a1a] hover:bg-[#222222] text-left cursor-pointer transition-none select-none border-none outline-none group"
      >
        <span
          className={`font-medium ${
            compact ? 'text-[13px]' : 'text-[14.5px]'
          } text-white flex items-center gap-2 transition-none`}
          dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(title) }}
        />
        <span className="text-[#888888] group-hover:text-white shrink-0 ml-2 transition-none">
          {isOpen ? <ChevronDownIcon size={15} /> : <ChevronRightIcon size={15} />}
        </span>
      </button>
      {isOpen && (
        <div
          className={`${
            compact ? 'p-2.5 text-[13px]' : 'p-3.5 sm:p-4 text-[14.5px]'
          } border-t border-[#262626] bg-[#131313] [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0`}
        >
          <DocsMarkdownView
            content={contentLines.join('\n')}
            compact={compact}
            portal={portal}
            docId={docId}
            docSlug={docSlug}
          />
        </div>
      )}
    </div>
  );
};

export interface DocsMarkdownViewProps {
  content: string;
  docId?: string;
  docSlug?: string;
  portal?: string;
  compact?: boolean;
}

export const DocsMarkdownView: React.FC<DocsMarkdownViewProps> = React.memo(({
  content,
  docId,
  docSlug,
  portal = 'help',
  compact = false,
}) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [copiedHeadingId, setCopiedHeadingId] = useState<string | null>(null);

  const elements = useMemo(() => {
    const raw = content || '';
    const lines = raw.replace(/\r\n/g, '\n').split('\n');
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
          <ListTag
            key={`list-${key}`}
            className={`${compact ? 'my-1.5 pl-5 text-[13.5px] leading-[1.65]' : 'my-2 pl-6 text-[16px] leading-[1.75]'} space-y-1 text-[#dadada]`}
          >
            {listBuffer.map((item, idx) => {
              const indentPadding = item.indent > 0 ? { paddingLeft: `${item.indent * (compact ? 16 : 24)}px` } : undefined;

              if (item.type === 'task') {
                return (
                  <li key={idx} style={indentPadding} className="flex items-start gap-2 list-none mb-1">
                    <label className="flex items-center justify-center h-[1.75em] shrink-0 select-none">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        readOnly
                        className="w-[14px] h-[14px] cursor-default accent-[#eb584d] rounded"
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
                    <span className="text-[#888888] font-normal text-[13.5px] shrink-0 min-w-[20px]">
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
        // Split raw rows with protected inline code, math, and escaped pipes
        const rawRows = tableBuffer.map((line) => splitTableRow(line)).filter((row) => row.length > 0);

        if (rawRows.length >= 1) {
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

          const grid: GridCell[][] = contentRows.map((row, rIdx) => {
            const isHeader = rIdx < numHeaderRows;
            const cells: GridCell[] = [];
            for (let c = 0; c < maxCols; c++) {
              const rawCell = row[c] ?? '';
              cells.push({
                content: rawCell,
                colSpan: 1,
                rowSpan: 1,
                align: alignments[c] || 'left',
                isMerged: false,
                isHeader,
              });
            }
            return cells;
          });

          for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < maxCols; c++) {
              const cell = grid[r][c];
              if (cell.isMerged) continue;

              let text = cell.content;
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
              cell.content = text;
            }
          }

          const theadRows = grid.filter((_, idx) => idx < numHeaderRows);
          const tbodyRows = grid.filter((_, idx) => idx >= numHeaderRows);

          nodes.push(
            <div key={`table-${key}`} className={`${compact ? 'my-2.5' : 'my-4'} overflow-x-auto rounded-lg border border-[#2e2e2e] bg-[#161616]`}>
              <table className={`w-full text-left ${compact ? 'text-[12.5px]' : 'text-[13.5px]'} leading-[1.5] border-collapse`}>
                {theadRows.length > 0 && (
                  <thead>
                    {theadRows.map((row, rIdx) => (
                      <tr key={`th-row-${rIdx}`} className="bg-[#1c1c1c] text-[#dadada] font-semibold border-b border-[#2e2e2e]">
                        {row.map((cell, cIdx) => {
                          if (cell.isMerged) return null;
                          const alignClass = cell.align === 'center' ? 'text-center' : cell.align === 'right' ? 'text-right' : 'text-left';
                          return (
                            <th
                              key={`th-${rIdx}-${cIdx}`}
                              colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                              rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                              className={`px-3 py-2 border-r border-[#2e2e2e] last:border-r-0 ${alignClass}`}
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
                        return (
                          <td
                            key={`td-${rIdx}-${cIdx}`}
                            colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                            rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                            className={`px-3 py-2 border-r border-[#242424] last:border-r-0 text-[#dadada] ${alignClass}`}
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
        const processedHtml = rawHtml.replace(/<(t[hd])([^>]*)>([\s\S]*?)<\/\1>/gi, (_, tag, attrs, cellContent) => {
          const rendered = renderInlineMarkdown(cellContent.trim());
          return `<${tag}${attrs}>${rendered}</${tag}>`;
        });

        nodes.push(
          <div
            key={`html-table-${key}`}
            className={`${compact ? 'my-2.5' : 'my-4'} overflow-x-auto rounded-lg border border-[#2e2e2e] bg-[#161616]`}
            dangerouslySetInnerHTML={{
              __html: processedHtml
                .replace(/<table(?:\s+[^>]*)?>/i, `<table class="w-full text-left ${compact ? 'text-[12.5px]' : 'text-[13.5px]'} leading-[1.5] border-collapse">`)
                .replace(/<thead(?:\s+[^>]*)?>/gi, '<thead class="bg-[#1c1c1c] text-[#dadada] font-semibold border-b border-[#2e2e2e]">')
                .replace(/<tbody(?:\s+[^>]*)?>/gi, '<tbody>')
                .replace(/<tr(?:\s+[^>]*)?>/gi, '<tr class="border-b border-[#242424] last:border-b-0 hover:bg-[#1a1a1a]">')
                .replace(/<th(?:\s+([^>]*))?>/gi, '<th class="px-3 py-2 border-r border-[#2e2e2e] last:border-r-0 font-semibold" $1>')
                .replace(/<td(?:\s+([^>]*))?>/gi, '<td class="px-3 py-2 border-r border-[#242424] last:border-r-0 text-[#dadada]" $1>')
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
        const calloutMatch = firstLine.match(/^\[!([a-zA-Z0-9_\-]+)\]([+-])?(?:\s*(.*))?$/i);

        if (calloutMatch) {
          const calloutType = calloutMatch[1].toUpperCase();
          const foldMarker = (calloutMatch[2] as '+' | '-' | undefined) || '';
          const inlineTitle = calloutMatch[3]?.trim() || '';

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
            ABSTRACT: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: File01Icon },
            SUMMARY: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: File01Icon },
            TLDR: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: File01Icon },
            INFO: { border: 'border-sky-500/50', bg: 'bg-sky-500/10', text: 'text-sky-400', icon: InformationCircleIcon },
            TODO: { border: 'border-sky-500/50', bg: 'bg-sky-500/10', text: 'text-sky-400', icon: CheckmarkSquare02Icon },
            TIP: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: BulbIcon },
            HINT: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: BulbIcon },
            IMPORTANT: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: BulbIcon },
            SUCCESS: { border: 'border-green-500/50', bg: 'bg-green-500/10', text: 'text-green-400', icon: CheckmarkCircle02Icon },
            CHECK: { border: 'border-green-500/50', bg: 'bg-green-500/10', text: 'text-green-400', icon: CheckmarkCircle02Icon },
            DONE: { border: 'border-green-500/50', bg: 'bg-green-500/10', text: 'text-green-400', icon: CheckmarkCircle02Icon },
            QUESTION: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: HelpCircleIcon },
            HELP: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: HelpCircleIcon },
            FAQ: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: HelpCircleIcon },
            WARNING: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertTriangleIcon },
            CAUTION: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertTriangleIcon },
            ATTENTION: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertTriangleIcon },
            FAILURE: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-400', icon: CancelCircleIcon },
            FAIL: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-400', icon: CancelCircleIcon },
            MISSING: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-400', icon: CancelCircleIcon },
            DANGER: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-400', icon: AlertDiamondIcon },
            ERROR: { border: 'border-rose-500/50', bg: 'bg-rose-500/10', text: 'text-rose-400', icon: AlertDiamondIcon },
            BUG: { border: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: Bug01Icon },
            EXAMPLE: { border: 'border-purple-500/50', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: CodeIcon },
            QUOTE: { border: 'border-[#555555]', bg: 'bg-[#1e1e1e]/90', text: 'text-[#aaaaaa]', icon: QuoteUpIcon },
            CITE: { border: 'border-[#555555]', bg: 'bg-[#1e1e1e]/90', text: 'text-[#aaaaaa]', icon: QuoteUpIcon },
          };
          const style = calloutColors[calloutType] || calloutColors.NOTE;

          const rawBodyLines = strippedLines.slice(1);
          const paragraphs: string[] = [];
          let currentPara: string[] = [];
          for (const bl of rawBodyLines) {
            const trimmed = bl.trim();
            if (!trimmed) {
              if (currentPara.length > 0) {
                paragraphs.push(currentPara.join(' '));
                currentPara = [];
              }
            } else {
              currentPara.push(trimmed);
            }
          }
          if (currentPara.length > 0) {
            paragraphs.push(currentPara.join(' '));
          }

          nodes.push(
            <DocsCalloutItem
              key={`callout-${key}`}
              calloutType={calloutType}
              foldMarker={foldMarker}
              inlineTitle={inlineTitle}
              rawBodyLinesCount={rawBodyLines.length}
              paragraphs={paragraphs}
              compact={compact}
              style={style}
            />
          );
        } else {
          // Standard Markdown Blockquote
          nodes.push(
            <blockquote
              key={`quote-${key}`}
              className={`${compact ? 'my-2 pl-3 py-0.5 text-[13px]' : 'my-4 pl-4 py-1 text-[15px]'} border-l-2 border-[#eb584d] text-[#aaaaaa] italic bg-[#1e1e1e]/40 rounded-r-md`}
            >
              {strippedLines.map((l, lIdx) => (
                <p key={lIdx} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(l) }} />
              ))}
            </blockquote>
          );
        }
        quoteBuffer = [];
        inQuote = false;
      }
    };

    // Helper to render headings
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
          {!compact && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const baseUrl = window.location.origin + window.location.pathname;
                const currentPortal = portal || 'help';
                const slug = docSlug || docId || '';
                const fullUrl = `${baseUrl}#${currentPortal}/${slug}#${id}`;
                window.location.hash = `#${currentPortal}/${slug}#${id}`;
                navigator.clipboard.writeText(fullUrl).then(() => {
                  setCopiedHeadingId(id);
                  setTimeout(() => {
                    setCopiedHeadingId((prev) => (prev === id ? null : prev));
                  }, 1500);
                });
              }}
              data-tooltip={isCopied ? 'Copied link to section!' : 'Copy link to section'}
              data-tooltip-position="top"
              aria-label={`Copy link to section ${headingText}`}
              className={`inline-flex items-center align-middle ml-1.5 p-0 rounded cursor-pointer transition-none ${
                isCopied
                  ? 'opacity-100 text-[#eb584d]'
                  : 'opacity-0 group-hover:opacity-100 text-[#777777] hover:text-[#eb584d]'
              }`}
            >
              {isCopied ? (
                <CheckIcon size={iconSize} />
              ) : (
                <Link04Icon size={iconSize} />
              )}
            </button>
          )}
        </Tag>
      );
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Accordion Details Blocks (<details> ... </details>)
      const detailsMatch = line.trim().match(/^<details(\s+[^>]*)?>/i);
      if (detailsMatch) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);

        const isOpenDefault = /\bopen\b/i.test(detailsMatch[1] || '') || line.includes('open');
        const detailLines: string[] = [];
        let summaryText = 'Details';
        let j = i;
        let foundClosing = false;

        // Check if summary is on the same line as <details>
        const sameLineSummary = line.match(/<summary(?:\s+[^>]*)?>([\s\S]*?)<\/summary>/i);
        if (sameLineSummary) {
          summaryText = sameLineSummary[1].trim();
        }

        // Also check if <details> and </details> are on the exact same single line
        if (line.includes('</details>')) {
          foundClosing = true;
          const singleLineContent = line.replace(/^<details[^>]*>/i, '').replace(/<\/details>$/i, '');
          const innerWithoutSummary = singleLineContent.replace(/<summary(?:\s+[^>]*)?>[\s\S]*?<\/summary>/i, '').trim();
          if (innerWithoutSummary) {
            detailLines.push(innerWithoutSummary);
          }
        } else {
          j = i + 1;
          while (j < lines.length) {
            const curLine = lines[j];

            // Check for summary tag if not yet extracted
            if (summaryText === 'Details' && /<summary/i.test(curLine)) {
              const sumMatch = curLine.match(/<summary(?:\s+[^>]*)?>([\s\S]*?)<\/summary>/i);
              if (sumMatch) {
                summaryText = sumMatch[1].trim();
                j++;
                continue;
              } else {
                let sumContent = curLine.replace(/^.*?<summary(?:\s+[^>]*)?>/i, '');
                while (j < lines.length && !sumContent.includes('</summary>')) {
                  j++;
                  if (j < lines.length) {
                    sumContent += ' ' + lines[j];
                  }
                }
                const sumEndMatch = sumContent.match(/([\s\S]*?)<\/summary>/i);
                if (sumEndMatch) {
                  summaryText = sumEndMatch[1].trim();
                }
                j++;
                continue;
              }
            }

            if (/<\/details>/i.test(curLine)) {
              foundClosing = true;
              const beforeClosing = curLine.replace(/<\/details>[\s\S]*$/i, '').trim();
              if (beforeClosing && !/<summary/i.test(beforeClosing)) {
                detailLines.push(beforeClosing);
              }
              break;
            }

            detailLines.push(curLine);
            j++;
          }
        }

        nodes.push(
          <DocsAccordionItem
            key={`accordion-${i}`}
            title={summaryText}
            isOpenDefault={isOpenDefault}
            contentLines={detailLines}
            compact={compact}
            portal={portal}
            docId={docId}
            docSlug={docSlug}
          />
        );

        if (foundClosing) {
          i = j;
        }
        lastWasHeading = false;
        continue;
      }

      // Code blocks ```
      if (line.trim().startsWith('```')) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);

        if (inCodeBlock) {
          const code = codeBuffer.join('\n');
          const codeIdx = i;
          const isCopied = copiedCodeIndex === codeIdx;

          nodes.push(
            <div
              key={`code-${i}`}
              className={`${compact ? 'my-2.5' : 'my-4'} rounded-lg overflow-hidden border border-[#2e2e2e] bg-[#141414] group relative`}
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1a1a] border-b border-[#2e2e2e] text-xs text-[#888888] select-none">
                <span className="font-mono text-[11px] uppercase tracking-wider">{codeLanguage || 'text'}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    setCopiedCodeIndex(codeIdx);
                    setTimeout(() => setCopiedCodeIndex((prev) => (prev === codeIdx ? null : prev)), 2000);
                  }}
                  className="flex items-center gap-1 hover:text-white transition-none cursor-pointer"
                  data-tooltip={isCopied ? 'Copied!' : 'Copy code'}
                  data-tooltip-position="top"
                >
                  {isCopied ? (
                    <>
                      <CheckIcon size={12} className="text-emerald-400" />
                      <span className="text-[11px] text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy01Icon size={12} />
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className={`${compact ? 'p-3 text-[12px]' : 'p-4 text-[13.5px]'} overflow-x-auto font-mono text-[#dadada] leading-relaxed`}>
                <code dangerouslySetInnerHTML={{ __html: highlightCode(code, codeLanguage) }} />
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
          codeBuffer = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Display math blocks $$
      if (line.trim().startsWith('$$')) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);

        if (inMathBlock) {
          const mathCode = mathBuffer.join('\n').trim();
          try {
            const html = katex.renderToString(mathCode, { displayMode: true, throwOnError: false });
            nodes.push(
              <div
                key={`math-${i}`}
                className={`${compact ? 'my-2.5 py-2 px-3 text-[13px]' : 'my-4 py-3 px-4 text-base'} overflow-x-auto rounded-lg bg-[#161616] border border-[#2e2e2e] text-center`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            nodes.push(
              <div key={`math-${i}`} className="my-2.5 p-3 rounded-lg bg-[#161616] border border-[#2e2e2e] text-center font-mono text-[#eb584d] text-xs">
                {mathCode}
              </div>
            );
          }
          mathBuffer = [];
          inMathBlock = false;
        } else {
          inMathBlock = true;
          mathBuffer = [];
        }
        continue;
      }

      if (inMathBlock) {
        mathBuffer.push(line);
        continue;
      }

      // Dividers ---
      if (/^---{1,}$/.test(line.trim())) {
        flushList(i);
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        nodes.push(<hr key={`hr-${i}`} className={`${compact ? 'my-2.5' : 'my-4'} border-t border-[#2e2e2e]`} />);
        continue;
      }

      // Headings
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
            compact
              ? isDocTitle
                ? 'text-[17px] font-bold text-white tracking-tight mb-2 leading-[1.3]'
                : 'text-[16px] font-bold text-white tracking-tight mt-3.5 mb-1.5 leading-[1.3]'
              : isDocTitle
                ? 'text-[28px] sm:text-[32px] font-bold text-white tracking-tight mb-4 leading-[1.3] scroll-mt-6'
                : 'text-[26px] sm:text-[28px] font-bold text-white tracking-tight mt-6 mb-2 leading-[1.3] scroll-mt-6',
            compact ? 13 : 25
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
            compact
              ? 'text-[15px] font-semibold text-white tracking-tight mt-3 mb-1.5 leading-[1.35]'
              : 'text-[21px] sm:text-[23px] font-semibold text-white tracking-tight mt-5 mb-2 leading-[1.35] scroll-mt-6',
            compact ? 13 : 20
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
            compact
              ? 'text-[14px] font-semibold text-[#f0f0f0] tracking-tight mt-2.5 mb-1 leading-[1.4]'
              : 'text-[17px] sm:text-[19px] font-semibold text-[#f0f0f0] tracking-tight mt-4 mb-2 leading-[1.4] scroll-mt-6',
            compact ? 12 : 17
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
            compact
              ? 'text-[13px] font-semibold text-[#d4d4d4] tracking-tight mt-2 mb-1 leading-[1.45]'
              : 'text-[15px] sm:text-[17px] font-semibold text-[#d4d4d4] tracking-tight mt-3.5 mb-1.5 leading-[1.45] scroll-mt-6',
            compact ? 12 : 15
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
            compact
              ? 'text-[12.5px] font-semibold text-[#a0a0a0] tracking-tight mt-2 mb-0.5 leading-[1.45]'
              : 'text-[14px] sm:text-[15px] font-semibold text-[#a0a0a0] tracking-tight mt-3 mb-1 leading-[1.45] scroll-mt-6',
            compact ? 11 : 14
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
            compact
              ? 'text-[12px] font-semibold text-[#888888] tracking-tight mt-1.5 mb-0.5 leading-[1.45]'
              : 'text-[13px] sm:text-[14px] font-semibold text-[#888888] tracking-tight mt-2.5 mb-1 leading-[1.45] scroll-mt-6',
            compact ? 11 : 13
          )
        );
        lastWasHeading = true;
        continue;
      }

      // Blockquotes & Callouts
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

      // Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushList(i);
        flushQuote(i);
        inTable = true;
        tableBuffer.push(line);
        continue;
      } else if (inTable) {
        flushTable(i);
      }

      // HTML Tables
      if (line.trim().startsWith('<table') || inHtmlTable) {
        flushList(i);
        flushQuote(i);
        inHtmlTable = true;
        htmlTableBuffer.push(line);
        if (line.trim().includes('</table>')) {
          flushHtmlTable(i);
        }
        continue;
      }

      // Lists
      const taskMatch = line.match(/^(\s*)([-*]|\d+\.)\s+\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const indent = Math.floor(taskMatch[1].length / 2);
        listBuffer.push({
          type: 'task',
          marker: '',
          text: taskMatch[4],
          checked: taskMatch[3].toLowerCase() === 'x',
          indent,
        });
        continue;
      }

      const bulletMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
      if (bulletMatch) {
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const indent = Math.floor(bulletMatch[1].length / 2);
        listBuffer.push({
          type: 'bullet',
          marker: bulletMatch[2],
          text: bulletMatch[3],
          indent,
        });
        continue;
      }

      const orderedMatch = line.match(/^(\s*)(\d+\.)\s+(.+)$/);
      if (orderedMatch) {
        flushTable(i);
        flushHtmlTable(i);
        flushQuote(i);
        const indent = Math.floor(orderedMatch[1].length / 2);
        listBuffer.push({
          type: 'ordered',
          marker: orderedMatch[2],
          text: orderedMatch[3],
          indent,
        });
        continue;
      }

      // Flush buffers on non-list line
      flushList(i);

      if (!line.trim()) {
        lastWasHeading = false;
        continue;
      }

      // Paragraph
      nodes.push(
        <p
          key={`p-${i}`}
          className={`${compact ? 'text-[13.5px] leading-relaxed my-1.5 first:mt-0' : 'text-[16px] leading-[1.75] my-3'} text-[#dadada] font-normal`}
          dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line) }}
        />
      );
      lastWasHeading = false;
    }

    flushList(lines.length);
    flushTable(lines.length);
    flushHtmlTable(lines.length);
    flushQuote(lines.length);

    return nodes;
  }, [content, docId, docSlug, portal, compact, copiedCodeIndex, copiedHeadingId]);

  return <>{elements}</>;
});

DocsMarkdownView.displayName = 'DocsMarkdownView';
