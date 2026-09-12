import React, { useMemo, useState, useEffect } from 'react';
import { useNoetherApp, useExtensionList } from '@/core/app/AppContext';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  PackageIcon,
  PuzzleIcon,
  Settings02Icon,
  CheckIcon,
  Copy01Icon,
  Tag01Icon,
  GitForkIcon,
  LeftToRightListBulletIcon,
  LinkSquare02Icon,
  Download01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpen01Icon,
} from '@/components/common/Icons';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { DocLayoutWrapper } from '@/components/layout/DocLayoutWrapper';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { ExtensionAppIcon } from '@/components/common/ExtensionAppIcon';
import { platform } from '@/lib/platform/platformAdapter';
import { highlightCode } from './syntaxHighlighter';
import { parseCalloutHeader, getCalloutTypeInfo } from '@/lib/editor/callouts';
import {
  resolveExtensionMetadata,
  fetchGitHubReadme,
  fetchTursoReadme,
  getCachedReadme,
  setCachedReadme,
  extractGitHubRepo,
  rewriteGitHubRelativeImages,
  type ExtensionResolvedMeta,
} from './readmeResolver';

export interface ExtensionDocViewerProps {
  extensionId?: string;
  tabId?: string;
  documentId?: string;
  app?: any;
}

const ViewerCallout: React.FC<{
  typeInfo: any;
  headerMeta: any;
  bodyLines: string[];
}> = ({ typeInfo, headerMeta, bodyLines }) => {
  const [isCollapsed, setIsCollapsed] = useState(headerMeta.defaultCollapsed);
  const IconComp = typeInfo.iconComponent;
  const isFoldable = headerMeta.foldable;

  const displayTitle = headerMeta.title || typeInfo.title;

  return (
    <div
      className={`my-3 p-3.5 border-l-[3px] ${typeInfo.borderColor} ${typeInfo.bgColor} rounded-r-lg text-[var(--editor-font-size,16px)]`}
      data-callout={headerMeta.type}
    >
      <div
        className={`font-semibold text-sm ${typeInfo.textColor} flex items-center justify-between ${bodyLines.length > 0 && !isCollapsed ? 'mb-1.5' : ''} ${isFoldable ? 'cursor-pointer select-none' : ''}`}
        onClick={isFoldable ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <IconComp size={14} className="shrink-0 relative -top-px" />
          <span className="truncate">{displayTitle}</span>
        </div>
        {isFoldable && (
          <button
            type="button"
            className="text-[var(--noether-text-muted)] hover:text-white p-0.5 rounded transition-none"
            aria-label={isCollapsed ? 'Expand callout' : 'Collapse callout'}
          >
            {isCollapsed ? <ChevronRightIcon size={14} /> : <ChevronDownIcon size={14} />}
          </button>
        )}
      </div>
      {!isCollapsed && bodyLines.length > 0 && (
        <div className="text-[var(--noether-text-secondary)] leading-[1.75] space-y-1.5">
          {bodyLines.map((line, lIdx) => (
            <div key={lIdx} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line) }} />
          ))}
        </div>
      )}
    </div>
  );
};

// Resilient, pure Markdown renderer conforming 100% to Noether document styling and typography rules
export const MarkdownDocRenderer: React.FC<{ content: string }> = React.memo(({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const elements = useMemo(() => {
    if (!content) return null;
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const nodes: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];

    let tableBuffer: string[] = [];
    let inTable = false;

    let quoteBuffer: string[] = [];
    let inQuote = false;

    type ListItem = {
      type: 'bullet' | 'ordered' | 'task';
      marker: string;
      text: string;
      checked?: boolean;
      indent: number;
    };
    let listBuffer: ListItem[] = [];
    let inList = false;

    const flushList = (key: number) => {
      if (listBuffer.length > 0) {
        const isOrdered = listBuffer[0].type === 'ordered';
        const ListTag = isOrdered ? 'ol' : 'ul';

        nodes.push(
          <ListTag
            key={`list-${key}`}
            className="my-2 space-y-1 text-[var(--noether-text-primary)] text-[var(--editor-font-size,16px)] leading-[1.75] pl-1"
          >
            {listBuffer.map((item, idx) => {
              const indentPadding = item.indent > 0 ? { paddingLeft: `${item.indent * 24}px` } : undefined;

              if (item.type === 'task') {
                return (
                  <li key={idx} style={indentPadding} className="flex items-start gap-2 list-none">
                    <span className="flex items-center justify-center h-[1.75em] shrink-0 select-none">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        readOnly
                        className="m-0 cursor-default accent-[var(--noether-accent)] rounded w-[14px] h-[14px]"
                      />
                    </span>
                    <span
                      className={`flex-1 ${item.checked ? 'line-through text-[var(--noether-text-muted)]' : 'text-[var(--noether-text-primary)]'}`}
                      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
                    />
                  </li>
                );
              }

              if (item.type === 'ordered') {
                return (
                  <li key={idx} style={indentPadding} className="flex items-start gap-2 list-none">
                    <span className="noether-numbered-prefix noether-list-prefix text-[#777] font-normal select-none shrink-0 min-w-[20px] text-left">
                      {item.marker}
                    </span>
                    <span
                      className="flex-1 text-[var(--noether-text-primary)]"
                      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
                    />
                  </li>
                );
              }

              return (
                <li key={idx} style={indentPadding} className="flex items-start gap-2 list-none">
                  <span className="noether-list-prefix text-[#777] font-normal select-none shrink-0 text-center w-4">
                    •
                  </span>
                  <span
                    className="flex-1 text-[var(--noether-text-primary)]"
                    dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
                  />
                </li>
              );
            })}
          </ListTag>
        );
        listBuffer = [];
        inList = false;
      }
    };

    const flushTable = (key: number) => {
      if (tableBuffer.length > 0) {
        const rows = tableBuffer.map((line) =>
          line
            .split('|')
            .map((c) => c.trim())
            .filter((c, idx, arr) => (idx > 0 && idx < arr.length - 1) || c !== '')
        );

        if (rows.length >= 2) {
          const headerRow = rows[0];
          const isSeparator = rows[1].every((c) => /^:?-+:?$/.test(c.trim()));
          const bodyRows = isSeparator ? rows.slice(2) : rows.slice(1);

          nodes.push(
            <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-lg border border-[var(--noether-border-subtle)] bg-[var(--noether-bg-card)]/40">
              <table className="w-full text-left text-[13.5px] border-collapse noether-table">
                <thead>
                  <tr className="bg-[var(--noether-bg-card)] border-b border-[var(--noether-border-subtle)] text-[var(--noether-text-primary)] font-semibold">
                    {headerRow.map((cell, cIdx) => (
                      <th key={cIdx} className="px-3.5 py-2.5 border border-[var(--noether-border-subtle)]" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cell) }} />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--noether-border-subtle)]">
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[var(--noether-bg-card)]/80">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2 text-[var(--noether-text-secondary)] border border-[var(--noether-border-subtle)]" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cell) }} />
                      ))}
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

    const flushQuote = (key: number) => {
      if (quoteBuffer.length > 0) {
        const header = quoteBuffer[0];
        const headerMeta = parseCalloutHeader(header);

        if (headerMeta) {
          const typeInfo = getCalloutTypeInfo(headerMeta.type);
          const bodyLines = quoteBuffer.slice(1).map((l) => l.replace(/^[ \t]*>[ \t]?/, ''));
          nodes.push(
            <ViewerCallout
              key={`callout-${key}`}
              typeInfo={typeInfo}
              headerMeta={headerMeta}
              bodyLines={bodyLines}
            />
          );
        } else {
          const bodyLines = quoteBuffer.map((l) => l.replace(/^[ \t]*>[ \t]?/, ''));
          nodes.push(
            <div
              key={`quote-${key}`}
              className="my-3 pl-4 pr-3 py-1.5 border-l-[3px] border-[var(--noether-border-strong)] bg-[var(--noether-bg-card)]/40 text-[var(--noether-text-muted)] italic text-[var(--editor-font-size,16px)] leading-[1.75] rounded-r space-y-1.5"
            >
              {bodyLines.map((line, lIdx) => (
                <div key={lIdx} dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line) }} />
              ))}
            </div>
          );
        }
        quoteBuffer = [];
        inQuote = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks (```lang ... ```)
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const blockCode = codeBuffer.join('\n');
          const blockIndex = i;
          nodes.push(
            <div key={`code-${i}`} className="relative my-4 rounded-lg overflow-hidden border border-[var(--noether-border-subtle)] bg-[var(--noether-bg-input)] group">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--noether-bg-card)] border-b border-[var(--noether-border-subtle)] text-[12px] text-[var(--noether-text-muted)] font-mono select-none">
                <span>{codeLanguage || 'text'}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(blockCode);
                    setCopiedIndex(blockIndex);
                    setTimeout(() => setCopiedIndex(null), 1500);
                  }}
                  className="flex items-center gap-1 text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer"
                >
                  {copiedIndex === blockIndex ? <CheckIcon size={12} className="text-emerald-400" /> : <Copy01Icon size={12} />}
                  <span>{copiedIndex === blockIndex ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3.5 text-[calc(var(--editor-font-size,16px)*0.85)] font-mono text-[var(--noether-text-primary)] overflow-x-auto leading-relaxed">
                <code dangerouslySetInnerHTML={{ __html: highlightCode(blockCode, codeLanguage) }} />
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          flushList(i);
          flushTable(i);
          flushQuote(i);
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Tables (| Col 1 | Col 2 |)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        flushList(i);
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
        flushQuote(i);
        inList = true;
        const indent = Math.floor(taskMatch[1].length / 2);
        const checked = taskMatch[2].toLowerCase() === 'x';
        listBuffer.push({ type: 'task', marker: checked ? '[x]' : '[ ]', text: taskMatch[3], checked, indent });
        continue;
      }

      // 2. Numbered / Ordered List: 1. Item
      const orderedMatch = line.match(/^(\s*)(\d+\.|\w+\.)\s+(.*)$/);
      if (orderedMatch) {
        flushTable(i);
        flushQuote(i);
        inList = true;
        const indent = Math.floor(orderedMatch[1].length / 2);
        listBuffer.push({ type: 'ordered', marker: orderedMatch[2], text: orderedMatch[3], indent });
        continue;
      }

      // 3. Bullet List: - Item, * Item, + Item
      const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (bulletMatch) {
        flushTable(i);
        flushQuote(i);
        inList = true;
        const indent = Math.floor(bulletMatch[1].length / 2);
        listBuffer.push({ type: 'bullet', marker: '•', text: bulletMatch[2], indent });
        continue;
      }

      if (inList && line.trim() === '') {
        flushList(i);
        continue;
      } else if (inList) {
        flushList(i);
      }

      // Empty lines
      if (!line.trim()) {
        flushQuote(i);
        continue;
      }

      // Horizontal rules (--- or *** or ___)
      if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim()) || /^___+$/.test(line.trim())) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        nodes.push(<hr key={`hr-${i}`} className="my-6 border-0 border-t border-[var(--noether-border-subtle)]" />);
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        const title = line.slice(2);
        nodes.push(
          <h1
            key={`h1-${i}`}
            style={{ fontSize: 'calc(var(--editor-font-size, 16px) * 1.85)' }}
            className="font-bold text-[var(--noether-text-primary)] tracking-tight mt-6 mb-2 leading-[1.3]"
          >
            {formatHeadingTitle(title)}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        const title = line.slice(3);
        nodes.push(
          <h2
            key={`h2-${i}`}
            style={{ fontSize: 'calc(var(--editor-font-size, 16px) * 1.45)' }}
            className="font-semibold text-[var(--noether-text-primary)] tracking-tight mt-5 mb-2 leading-[1.35]"
          >
            {formatHeadingTitle(title)}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        const title = line.slice(4);
        nodes.push(
          <h3
            key={`h3-${i}`}
            style={{ fontSize: 'calc(var(--editor-font-size, 16px) * 1.2)' }}
            className="font-semibold text-[var(--noether-text-secondary)] mt-4 mb-1.5 leading-[1.4]"
          >
            {formatHeadingTitle(title)}
          </h3>
        );
        continue;
      }
      if (line.startsWith('#### ')) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        const title = line.slice(5);
        nodes.push(
          <h4
            key={`h4-${i}`}
            style={{ fontSize: 'calc(var(--editor-font-size, 16px) * 1.08)' }}
            className="font-semibold text-[var(--noether-text-secondary)] mt-3 mb-1 leading-[1.45]"
          >
            {formatHeadingTitle(title)}
          </h4>
        );
        continue;
      }
      if (line.startsWith('##### ')) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        const title = line.slice(6);
        nodes.push(
          <h5
            key={`h5-${i}`}
            style={{ fontSize: 'calc(var(--editor-font-size, 16px) * 0.95)' }}
            className="font-semibold text-[var(--noether-text-muted)] mt-2.5 mb-1"
          >
            {formatHeadingTitle(title)}
          </h5>
        );
        continue;
      }
      if (line.startsWith('###### ')) {
        flushList(i);
        flushTable(i);
        flushQuote(i);
        const title = line.slice(7);
        nodes.push(
          <h6
            key={`h6-${i}`}
            style={{ fontSize: 'calc(var(--editor-font-size, 16px) * 0.88)' }}
            className="font-semibold text-[var(--noether-text-muted)] mt-2 mb-1"
          >
            {formatHeadingTitle(title)}
          </h6>
        );
        continue;
      }

      // Blockquotes & Callouts
      if (line.trim().startsWith('>')) {
        flushList(i);
        flushTable(i);
        inQuote = true;
        quoteBuffer.push(line);
        continue;
      } else if (inQuote) {
        flushQuote(i);
      }

      // Standard Paragraph
      nodes.push(
        <p
          key={`p-${i}`}
          style={{ fontSize: 'var(--editor-font-size, 16px)' }}
          className="text-[var(--noether-text-primary)] leading-[1.75] my-2"
          dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line) }}
        />
      );
    }

    flushList(lines.length);
    flushTable(lines.length);
    flushQuote(lines.length);

    return nodes;
  }, [content, copiedIndex]);

  return <div className="markdown-prose noether-doc-prose flex flex-col font-text text-[var(--editor-font-size,16px)] leading-[1.75] text-[var(--noether-text-primary)] select-text">{elements}</div>;
});

// Format heading title with dimmed number prefixes if present
function formatHeadingTitle(title: string): React.ReactNode {
  const numberedMatch = title.match(/^(\d+\.|\w+\.)\s+(.*)$/);
  if (numberedMatch) {
    return (
      <span className="flex items-baseline gap-1.5">
        <span className="noether-numbered-prefix noether-list-prefix text-[#777] font-normal select-none">
          {numberedMatch[1]}
        </span>
        <span>{numberedMatch[2]}</span>
      </span>
    );
  }
  return title;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:') || trimmed.startsWith('data:text/html')) {
    return false;
  }
  return true;
}

// Helper for inline markdown bold, italic, code, kbd, links, wikilinks, and embeds
function renderInlineMarkdown(text: string): string {
  if (!text) return '';
  return escapeHtml(text)
    // Keyboard tags: <kbd>Key</kbd>
    .replace(/&lt;kbd&gt;(.*?)&lt;\/kbd&gt;/gi, '<kbd class="px-1.5 py-0.5 text-[0.75em] font-mono bg-[var(--noether-bg-card)] border border-[var(--noether-border-subtle)] rounded text-[var(--noether-text-secondary)] shadow-xs">$1</kbd>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 text-[0.875em] font-mono bg-[var(--noether-code-bg,var(--noether-bg-card))] border border-[var(--noether-border-subtle)] rounded text-[var(--noether-code-text,var(--noether-text-primary))]">$1</code>')
    // Bold: **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-[var(--noether-text-primary)]">$1</strong>')
    // Italic: *text*
    .replace(/\*([^*]+)\*/g, '<em class="italic text-[var(--noether-text-secondary)]">$1</em>')
    // Strikethrough: ~~text~~
    .replace(/~~([^~]+)~~/g, '<del class="line-through text-[var(--noether-text-muted)]">$1</del>')
    // Markdown Embeds: ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
      const trimmedUrl = url.trim();
      if (!isSafeUrl(trimmedUrl)) return '';
      return `<img src="${trimmedUrl}" alt="${alt || ''}" class="noether-media-image rounded-md border border-[var(--noether-border-subtle)] max-w-full my-3 block" loading="lazy" />`;
    })
    // Wikilink Embeds: ![[target|alias/size]]
    .replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
      const cleanTarget = target.trim();
      const isImg = /\.(png|jpe?g|gif|svg|webp|bmp|ico|avif)$/i.test(cleanTarget);
      if (isImg) {
        if (!isSafeUrl(cleanTarget)) return '';
        return `<img src="${cleanTarget}" alt="${alias || cleanTarget}" class="noether-media-image rounded-md border border-[var(--noether-border-subtle)] max-w-full my-3 block" loading="lazy" />`;
      }
      const label = alias || cleanTarget;
      return `<div class="noether-embed-card noether-note-embed rounded-lg border border-[var(--noether-border-subtle)] bg-[var(--noether-bg-card)]/90 p-3 my-3 text-[0.9em] text-[var(--noether-text-secondary)]"><div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--noether-accent)] mb-1"><span>📄 Embedded: ${cleanTarget}</span></div><div class="italic text-[var(--noether-text-muted)]">${label}</div></div>`;
    })
    // Standard Markdown links: [text](url) or [text]([[target]]) or [text](target)
    .replace(/(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
      const trimmed = url.trim();
      if (!isSafeUrl(trimmed)) return text;
      let wikiTarget: string | null = null;
      if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
        let inner = trimmed.slice(2, -2).trim();
        if (inner.includes('|')) inner = inner.split('|')[0].trim();
        if (inner) wikiTarget = inner;
      } else if (!/^(https?|mailto|ftp|file|data|blob):/i.test(trimmed) && !trimmed.startsWith('#')) {
        const decoded = decodeURIComponent(trimmed).replace(/\.md$/, '').trim();
        if (decoded) wikiTarget = decoded;
      }

      if (wikiTarget) {
        return `<span class="md-wikilink text-[var(--noether-link-color)] hover:underline cursor-pointer select-text" data-wikilink-target="${wikiTarget}">${text}</span>`;
      }
      return `<a href="${trimmed}" target="_blank" rel="noreferrer" class="text-[var(--noether-link-color)] hover:underline inline-flex items-center gap-0.5">${text}</a>`;
    })
    // Standard Wikilinks: [[Target|Alias]] or [[Target]] (only when not preceded by !)
    .replace(/(?<!\!)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
      const label = alias || target;
      return `<span class="md-wikilink text-[var(--noether-link-color)] hover:underline cursor-pointer select-text" data-wikilink-target="${target}">${label}</span>`;
    });
}

export const ExtensionDocViewer: React.FC<ExtensionDocViewerProps> = React.memo(({
  extensionId: explicitExtensionId,
  tabId: propTabId,
  documentId: propDocId,
}) => {
  const app = useNoetherApp();
  const extensionList = useExtensionList();
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const panes = useWorkspaceStore((s) => s.panes);
  const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId || 'main');
  const showToast = useWorkspaceStore((s) => s.showToast);
  const setIsSettingsOpen = useWorkspaceStore((s) => s.setIsSettingsOpen);

  const currentTab = useMemo(() => {
    if (propTabId) {
      for (const p of Object.values(panes)) {
        const found = p.tabs.find((t) => t.id === propTabId);
        if (found) return found;
      }
      const foundInRoot = tabs.find((t) => t.id === propTabId);
      if (foundInRoot) return foundInRoot;
    }

    const focusedPane = panes[focusedPaneId] || panes['main'];
    if (focusedPane) {
      const found = focusedPane.tabs.find((t) => t.id === focusedPane.activeTabId);
      if (found) return found;
    }

    return tabs.find((t) => t.id === activeTabId);
  }, [propTabId, panes, focusedPaneId, tabs, activeTabId]);

  const targetExtensionId = useMemo(() => {
    if (explicitExtensionId) return explicitExtensionId;

    if (propDocId) {
      if (propDocId.startsWith('__extension_doc:')) {
        return propDocId.replace(/^__extension_doc:/, '').replace(/__$/, '');
      }
      if (!propDocId.startsWith('__')) {
        return propDocId;
      }
    }

    if (currentTab?.document_id?.startsWith('__extension_doc:')) {
      return currentTab.document_id.replace(/^__extension_doc:/, '').replace(/__$/, '');
    }

    if (propTabId?.startsWith('extension-doc:')) {
      return propTabId.replace(/^extension-doc:/, '');
    }

    if (currentTab?.id?.startsWith('extension-doc:')) {
      return currentTab.id.replace(/^extension-doc:/, '');
    }

    if (currentTab?.document_id && !currentTab.document_id.startsWith('__')) {
      return currentTab.document_id;
    }

    if (currentTab?.title) {
      const match = app.extensions.getExtensionManifest(currentTab.title);
      if (match) return match.id;
    }

    return 'noether-cascade';
  }, [explicitExtensionId, propDocId, propTabId, currentTab, app]);

  const manifest = useMemo(() => {
    return app.extensions.getExtensionManifest(targetExtensionId);
  }, [app, targetExtensionId, extensionList]);

  const meta: ExtensionResolvedMeta = useMemo(() => {
    return resolveExtensionMetadata(targetExtensionId, manifest);
  }, [targetExtensionId, manifest]);

  const isInstalled = meta.isInstalled;
  const [isEnabled, setIsEnabled] = useState(() => app.extensions.isExtensionEnabled(targetExtensionId));
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    setIsEnabled(app.extensions.isExtensionEnabled(targetExtensionId));
    const sub = app.extensions.subscribe(() => {
      setIsEnabled(app.extensions.isExtensionEnabled(targetExtensionId));
    });
    return () => sub.dispose();
  }, [app, targetExtensionId]);

  const [readmeContent, setReadmeContent] = useState<string>(() => {
    const cached = getCachedReadme(targetExtensionId);
    if (cached) return cached;
    if (meta.readme) return meta.readme;
    return `# ${meta.name}\n\n${meta.description || 'Loading extension documentation...'}`;
  });

  // Dynamic GitHub README and multi-tier documentation fetcher
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadDocumentation() {
      // 1. Live GitHub raw README fetch
      const gh = extractGitHubRepo(meta.repoUrl, meta.authorUrl, targetExtensionId);
      if (gh) {
        try {
          const ghReadme = await fetchGitHubReadme(gh.owner, gh.repo, controller.signal);
          if (ghReadme && isMounted) {
            const rewritten = rewriteGitHubRelativeImages(ghReadme, gh.owner, gh.repo);
            setReadmeContent(rewritten);
            setCachedReadme(targetExtensionId, rewritten);
            return;
          }
        } catch {
          // GitHub fetch failed or offline; continue to fallback
        }
      }

      // 2. Turso libSQL edge database fallback
      try {
        const tursoReadme = await fetchTursoReadme(targetExtensionId, controller.signal);
        if (tursoReadme && isMounted) {
          setReadmeContent(tursoReadme);
          setCachedReadme(targetExtensionId, tursoReadme);
          return;
        }
      } catch {
        // Turso fallback failed
      }

      // 3. Manifest/catalogue description fallback
      if (meta.readme && isMounted) {
        setReadmeContent(meta.readme);
      }
    }

    loadDocumentation();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [targetExtensionId, meta.repoUrl, meta.authorUrl, meta.readme]);

  const tags = meta.tags;
  const creatorName = meta.author;
  const version = meta.version;
  const description = meta.description;
  const repoUrl = meta.repoUrl;

  const accentListPrefixes = useSettingsStore((s) => s.accentListPrefixes);
  const indentationGuides = useSettingsStore((s) => s.indentationGuides);
  const strictLineBreaks = useSettingsStore((s) => s.strictLineBreaks);
  const showExternalLinkIcon = useSettingsStore((s) => s.showExternalLinkIcon);

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--noether-bg-main)] overflow-hidden select-text">
      {/* 1. Shared Modular Document Sub-Header (Standard layout matching notes & graph view) */}
      <PageSubHeader
        title={meta.name}
        icon={<BookOpen01Icon size={13} />}
        document={null}
        showReadingToggle={false}
        showBookmark={false}
        showSearch={false}
        showDocOptions={false}
        customRightActions={
          <>
            {/* Quick Configure Link to Settings */}
            {isInstalled && (
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(true, targetExtensionId);
                }}
                title={`${meta.name} options`}
                className="p-1 rounded text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-hover)] cursor-pointer"
              >
                <Settings02Icon size={14} />
              </button>
            )}

            {/* Quick Enabled Toggle or Install Button */}
            <div className="flex items-center px-1">
              {isInstalled ? (
                <ToggleSwitch
                  checked={isEnabled}
                  onChange={async (val) => {
                    setIsEnabled(val);
                    if (val) {
                      await app.extensions.enableExtension(targetExtensionId);
                      showToast(`Enabled ${meta.name}`, 'success');
                    } else {
                      await app.extensions.disableExtension(targetExtensionId);
                      showToast(`Disabled ${meta.name}`, 'info');
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setIsInstalling(true);
                    try {
                      const ok = await app.extensions.installExtension({
                        id: targetExtensionId,
                        name: meta.name,
                        version: meta.version,
                        description: meta.description,
                        author: meta.author,
                        isCore: false,
                      });
                      if (ok) {
                        showToast(`Installed ${meta.name}`, 'success');
                      } else {
                        showToast(`Failed to install ${meta.name}`, 'warning');
                      }
                    } catch (err) {
                      console.error('[ExtensionDocViewer] Install failed:', err);
                      showToast(`Failed to install ${meta.name}`, 'warning');
                    } finally {
                      setIsInstalling(false);
                    }
                  }}
                  disabled={isInstalling}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[5px] bg-[#e5e7eb] hover:bg-white text-black cursor-pointer"
                >
                  {isInstalling ? (
                    <span>Installing...</span>
                  ) : (
                    <>
                      <Download01Icon size={13} />
                      <span>Install</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        }
      />

      {/* 2. Shared Document Layout Canvas Wrapper (Identical pixel layout & margins to Note Document) */}
      <DocLayoutWrapper isReadingMode={true}>
        {/* Optional Banner Asset Image */}
        {meta.bannerImage && (
          <div className="w-full h-44 mb-6 rounded-xl overflow-hidden border border-[var(--noether-border-subtle)] shadow-lg relative bg-[var(--noether-bg-card)]">
            <img
              src={meta.bannerImage}
              alt={`${meta.name} Banner`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Document Header (Title + In-Document Properties) */}
        <div className="relative group/title">
          {/* Document Title Header with Left App Icon */}
          <div className="mb-4 flex items-center gap-3.5">
            <ExtensionAppIcon
              icon={meta.icon}
              iconConfig={meta.iconConfig}
              name={meta.name}
              size={42}
              className="shrink-0"
            />
            <h1
              style={{ fontSize: 'calc(var(--editor-font-size, 16px) * 2.3)' }}
              className="font-bold text-[var(--noether-text-primary)] font-text tracking-tight leading-tight select-text"
            >
              {meta.name}
            </h1>
          </div>

          {/* In-Document Frontmatter Properties Header (Identical standard layout to notes) */}
          <div className="mb-3 text-xs">
            <div className="flex flex-col gap-1.5">
              {/* Property: Tags */}
              <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
                <div className="relative flex items-center shrink-0 w-24">
                  <span className="p-1 -ml-1 text-[var(--noether-text-muted)] flex items-center mr-1">
                    <Tag01Icon size={12} className="text-[var(--noether-text-muted)]" />
                  </span>
                  <span className="text-[11px] font-medium text-[var(--noether-text-muted)]">Tags</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[5px] bg-[var(--noether-bg-card)] hover:bg-[var(--noether-bg-hover)] text-[var(--noether-text-secondary)] hover:text-[var(--noether-text-primary)] border border-[var(--noether-border-subtle)] shadow-xs font-medium text-xs"
                    >
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Property: Creator */}
              <div className="flex items-center gap-2 min-h-[28px]">
                <div className="relative flex items-center shrink-0 w-24">
                  <span className="p-1 -ml-1 text-[var(--noether-text-muted)] flex items-center mr-1">
                    <PackageIcon size={12} className="text-[var(--noether-text-muted)]" />
                  </span>
                  <span className="text-[11px] font-medium text-[var(--noether-text-muted)]">Creator</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {meta.authorUrl ? (
                    <button
                      type="button"
                      onClick={() => platform.openUrl(meta.authorUrl!)}
                      className="text-[11px] text-[var(--noether-link-color)] hover:underline font-normal leading-tight font-sans cursor-pointer text-left inline-flex items-center gap-1"
                    >
                      <span>{creatorName}</span>
                      {showExternalLinkIcon && <LinkSquare02Icon size={10} className="opacity-70 shrink-0" />}
                    </button>
                  ) : (
                    <span className="text-[11px] text-[var(--noether-text-secondary)] font-normal leading-tight font-sans select-text">
                      {creatorName}
                    </span>
                  )}
                </div>
              </div>

              {/* Property: Repository */}
              {repoUrl && (
                <div className="flex items-center gap-2 min-h-[28px]">
                  <div className="relative flex items-center shrink-0 w-24">
                    <span className="p-1 -ml-1 text-[var(--noether-text-muted)] flex items-center mr-1">
                      <LinkSquare02Icon size={12} className="text-[var(--noether-text-muted)]" />
                    </span>
                    <span className="text-[11px] font-medium text-[var(--noether-text-muted)]">Repository</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => platform.openUrl(repoUrl)}
                      className="text-[11px] text-[var(--noether-link-color)] hover:underline font-sans truncate text-left cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</span>
                      {showExternalLinkIcon && <LinkSquare02Icon size={10} className="opacity-70 shrink-0" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Property: Version */}
              <div className="flex items-center gap-2 min-h-[28px]">
                <div className="relative flex items-center shrink-0 w-24">
                  <span className="p-1 -ml-1 text-[var(--noether-text-muted)] flex items-center mr-1">
                    <GitForkIcon size={12} className="text-[var(--noether-text-muted)]" />
                  </span>
                  <span className="text-[11px] font-medium text-[var(--noether-text-muted)]">Version</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[11px] text-[var(--noether-text-secondary)] font-normal leading-tight font-sans select-text">
                    {version}
                  </span>
                </div>
              </div>

              {/* Property: Description */}
              {description && (
                <div className="flex items-center gap-2 min-h-[28px]">
                  <div className="relative flex items-center shrink-0 w-24">
                    <span className="p-1 -ml-1 text-[var(--noether-text-muted)] flex items-center mr-1">
                      <LeftToRightListBulletIcon size={12} className="text-[var(--noether-text-muted)]" />
                    </span>
                    <span className="text-[11px] font-medium text-[var(--noether-text-muted)]">Description</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[11px] text-[var(--noether-text-secondary)] font-normal leading-tight font-sans select-text">
                      {description}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divider Line under Document Header */}
          <div className="border-b border-[var(--noether-border-subtle)] mb-5" />
        </div>

        {/* Rendered README.md Prose Body */}
        <div
          className={`flex-1 flex flex-col font-text ${
            accentListPrefixes ? 'noether-accent-lists' : ''
          } ${indentationGuides ? 'noether-indent-guides' : ''} ${
            strictLineBreaks ? 'noether-strict-line-breaks' : ''
          } ${showExternalLinkIcon ? 'noether-show-link-icon' : ''} tiptap-reading-view`}
        >
          <MarkdownDocRenderer content={readmeContent} />
        </div>
      </DocLayoutWrapper>
    </div>
  );
});

export default ExtensionDocViewer;
