import React, { useMemo, useState, useEffect } from 'react';
import { useFlintApp } from '@/core/app/AppContext';
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
} from '@/components/common/Icons';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { DocLayoutWrapper } from '@/components/layout/DocLayoutWrapper';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { highlightCode } from './syntaxHighlighter';

export interface ExtensionDocViewerProps {
  extensionId?: string;
  pluginId?: string;
  tabId?: string;
  documentId?: string;
  app?: any;
}

// Resilient, pure Markdown renderer conforming 100% to Flint document styling and list rules
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
            className="my-3 space-y-2 text-[#cccccc] text-xs leading-relaxed pl-1"
          >
            {listBuffer.map((item, idx) => {
              const indentPadding = item.indent > 0 ? { paddingLeft: `${item.indent * 18}px` } : undefined;

              if (item.type === 'task') {
                return (
                  <li key={idx} style={indentPadding} className="flex items-start gap-2 list-none">
                    <span className="flex items-center justify-center h-[1.6em] shrink-0">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        readOnly
                        className="m-0 cursor-default accent-[var(--flint-accent)] rounded"
                      />
                    </span>
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
                    <span className="flint-numbered-prefix flint-list-prefix text-[#666666] font-normal select-none shrink-0 min-w-[18px] text-left">
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
                  <span className="flint-list-prefix text-[#666666] font-normal select-none shrink-0 text-center w-3">
                    ·
                  </span>
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
            <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-lg border border-[#2a2a2a] bg-[#161616]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#202020] border-b border-[#2a2a2a] text-[#e0e0e0] font-semibold">
                    {headerRow.map((cell, cIdx) => (
                      <th key={cIdx} className="px-3.5 py-2.5" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cell) }} />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222]">
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#1f1f1f]/50 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2 text-[#cccccc]" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cell) }} />
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks (```lang ... ```)
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const blockCode = codeBuffer.join('\n');
          const blockIndex = i;
          nodes.push(
            <div key={`code-${i}`} className="relative my-3.5 rounded-lg overflow-hidden border border-[#2d2d2d] bg-[#141414] group">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border-b border-[#2d2d2d] text-[11px] text-[#888] font-mono select-none">
                <span>{codeLanguage || 'text'}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(blockCode);
                    setCopiedIndex(blockIndex);
                    setTimeout(() => setCopiedIndex(null), 1500);
                  }}
                  className="flex items-center gap-1 text-[#888] hover:text-white transition-colors cursor-pointer"
                >
                  {copiedIndex === blockIndex ? <CheckIcon size={12} className="text-emerald-400" /> : <Copy01Icon size={12} />}
                  <span>{copiedIndex === blockIndex ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3.5 text-xs font-mono text-[#dcdcdc] overflow-x-auto leading-relaxed">
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
        inList = true;
        const indent = Math.floor(orderedMatch[1].length / 2);
        listBuffer.push({ type: 'ordered', marker: orderedMatch[2], text: orderedMatch[3], indent });
        continue;
      }

      // 3. Bullet List: - Item, * Item, + Item
      const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      if (bulletMatch) {
        flushTable(i);
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
        continue;
      }

      // Horizontal rules (--- or *** or ___)
      if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim()) || /^___+$/.test(line.trim())) {
        nodes.push(<hr key={`hr-${i}`} className="my-6 border-t border-[#2a2a2a]" />);
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        const title = line.slice(2);
        nodes.push(
          <h1 key={`h1-${i}`} className="text-xl font-bold text-white tracking-tight mt-6 mb-2">
            {formatHeadingTitle(title)}
          </h1>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        const title = line.slice(3);
        nodes.push(
          <h2 key={`h2-${i}`} className="text-base font-semibold text-[#f0f0f0] tracking-tight mt-5 mb-2">
            {formatHeadingTitle(title)}
          </h2>
        );
        continue;
      }
      if (line.startsWith('### ')) {
        const title = line.slice(4);
        nodes.push(
          <h3 key={`h3-${i}`} className="text-sm font-semibold text-[#e0e0e0] mt-4 mb-1.5">
            {formatHeadingTitle(title)}
          </h3>
        );
        continue;
      }
      if (line.startsWith('#### ')) {
        const title = line.slice(5);
        nodes.push(
          <h4 key={`h4-${i}`} className="text-xs font-semibold text-[#d4d4d4] mt-3 mb-1">
            {formatHeadingTitle(title)}
          </h4>
        );
        continue;
      }

      // Blockquotes & Callouts
      if (line.startsWith('> ')) {
        const quoteText = line.slice(2);
        const isCallout = quoteText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);

        if (isCallout) {
          const calloutType = isCallout[1].toUpperCase();
          const cleanText = quoteText.replace(/^\[![^\]]+\]\s*/i, '');
          const calloutColors: Record<string, { border: string; bg: string; text: string }> = {
            NOTE: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-400' },
            TIP: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
            IMPORTANT: { border: 'border-purple-500/40', bg: 'bg-purple-500/10', text: 'text-purple-400' },
            WARNING: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400' },
            CAUTION: { border: 'border-rose-500/40', bg: 'bg-rose-500/10', text: 'text-rose-400' },
          };
          const style = calloutColors[calloutType] || calloutColors.NOTE;

          nodes.push(
            <div key={`callout-${i}`} className={`my-3 p-3 border-l-3 ${style.border} ${style.bg} rounded-r-lg text-xs`}>
              <div className={`font-semibold ${style.text} mb-1 flex items-center gap-1.5`}>
                {calloutType}
              </div>
              {cleanText && <div className="text-[#cccccc] leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(cleanText) }} />}
            </div>
          );
          continue;
        }

        nodes.push(
          <div key={`quote-${i}`} className="my-3 pl-3.5 py-1 border-l-2 border-[var(--flint-accent)] bg-[var(--flint-accent)]/5 text-xs text-[#cccccc] rounded-r">
            <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(quoteText) }} />
          </div>
        );
        continue;
      }

      // Standard Paragraph
      nodes.push(
        <p
          key={`p-${i}`}
          className="text-xs text-[#cccccc] leading-relaxed my-2.5"
          dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(line) }}
        />
      );
    }

    flushList(lines.length);
    flushTable(lines.length);

    return nodes;
  }, [content, copiedIndex]);

  return <div className="markdown-prose flex flex-col">{elements}</div>;
});

// Format heading title with dimmed number prefixes if present
function formatHeadingTitle(title: string): React.ReactNode {
  const numberedMatch = title.match(/^(\d+\.|\w+\.)\s+(.*)$/);
  if (numberedMatch) {
    return (
      <span className="flex items-baseline gap-1.5">
        <span className="flint-numbered-prefix flint-list-prefix text-[#666666] font-normal select-none">
          {numberedMatch[1]}
        </span>
        <span>{numberedMatch[2]}</span>
      </span>
    );
  }
  return title;
}

// Helper for inline markdown bold, italic, code, kbd, links, wikilinks, and embeds
function renderInlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    // Keyboard tags: <kbd>Key</kbd>
    .replace(/<kbd>(.*?)<\/kbd>/g, '<kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-[#282828] border border-[#383838] rounded text-[#ddd] shadow-xs">$1</kbd>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 text-[11px] font-mono bg-[#222222] border border-[#333333] rounded text-[#e6b450]">$1</code>')
    // Bold: **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // Italic: *text*
    .replace(/\*([^*]+)\*/g, '<em class="italic text-[#ddd]">$1</em>')
    // Strikethrough: ~~text~~
    .replace(/~~([^~]+)~~/g, '<del class="line-through text-[#888]">$1</del>')
    // Markdown Embeds: ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, url) => {
      return `<img src="${url}" alt="${alt || ''}" class="flint-media-image rounded-md border border-[#2a2a2a] max-w-full my-2 block" loading="lazy" />`;
    })
    // Wikilink Embeds: ![[target|alias/size]]
    .replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
      const isImg = /\.(png|jpe?g|gif|svg|webp|bmp|ico|avif)$/i.test(target.trim());
      if (isImg) {
        return `<img src="${target.trim()}" alt="${alias || target.trim()}" class="flint-media-image rounded-md border border-[#2a2a2a] max-w-full my-2 block" loading="lazy" />`;
      }
      const label = alias || target;
      return `<div class="flint-embed-card flint-note-embed rounded-lg border border-[#2e2e2e] bg-[#161616]/90 p-3 my-2 text-xs text-[#cccccc]"><div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--flint-accent)] mb-1"><span>📄 Embedded: ${target}</span></div><div class="italic text-[#888888]">${label}</div></div>`;
    })
    // Standard Wikilinks: [[Target|Alias]] or [[Target]] (only when not preceded by !)
    .replace(/(?<!\!)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
      const label = alias || target;
      return `<span class="md-wikilink text-[var(--flint-accent)] hover:underline cursor-pointer select-text">${label}</span>`;
    })
    // Standard Markdown links: [text](url) (only when not preceded by !)
    .replace(/(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-[var(--flint-accent)] hover:underline inline-flex items-center gap-0.5">$1</a>');
}

export const ExtensionDocViewer: React.FC<ExtensionDocViewerProps> = React.memo(({
  extensionId: explicitExtensionId,
  pluginId: explicitPluginId,
  tabId: propTabId,
  documentId: propDocId,
}) => {
  const app = useFlintApp();
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
    if (explicitPluginId) return explicitPluginId;

    if (propDocId) {
      if (propDocId.startsWith('__extension_doc:')) {
        return propDocId.replace(/^__extension_doc:/, '').replace(/__$/, '');
      }
      if (propDocId.startsWith('__plugin_doc:')) {
        return propDocId.replace(/^__plugin_doc:/, '').replace(/__$/, '');
      }
      if (!propDocId.startsWith('__')) {
        return propDocId;
      }
    }

    if (currentTab?.document_id?.startsWith('__extension_doc:')) {
      return currentTab.document_id.replace(/^__extension_doc:/, '').replace(/__$/, '');
    }
    if (currentTab?.document_id?.startsWith('__plugin_doc:')) {
      return currentTab.document_id.replace(/^__plugin_doc:/, '').replace(/__$/, '');
    }

    if (propTabId?.startsWith('extension-doc:')) {
      return propTabId.replace(/^extension-doc:/, '');
    }
    if (propTabId?.startsWith('plugin-doc:')) {
      return propTabId.replace(/^plugin-doc:/, '');
    }

    if (currentTab?.id?.startsWith('extension-doc:')) {
      return currentTab.id.replace(/^extension-doc:/, '');
    }
    if (currentTab?.id?.startsWith('plugin-doc:')) {
      return currentTab.id.replace(/^plugin-doc:/, '');
    }

    if (currentTab?.document_id && !currentTab.document_id.startsWith('__')) {
      return currentTab.document_id;
    }

    if (currentTab?.title) {
      const match = app.extensions.getExtensionManifest(currentTab.title);
      if (match) return match.id;
    }

    return 'flint-cascade';
  }, [explicitExtensionId, explicitPluginId, propDocId, propTabId, currentTab, app]);

  const manifest = useMemo(() => {
    return app.extensions.getExtensionManifest(targetExtensionId);
  }, [app, targetExtensionId]);

  const [isEnabled, setIsEnabled] = useState(() => app.extensions.isExtensionEnabled(targetExtensionId));

  useEffect(() => {
    setIsEnabled(app.extensions.isExtensionEnabled(targetExtensionId));
    const sub = app.extensions.subscribe(() => {
      setIsEnabled(app.extensions.isExtensionEnabled(targetExtensionId));
    });
    return () => sub.dispose();
  }, [app, targetExtensionId]);

  const tags = manifest?.tags || ['extension'];
  const creatorName = manifest?.author || 'Yuliet Li';
  const version = manifest?.version || '1.0.0';
  const description = manifest?.description || '';
  const readmeContent = manifest?.readme || `# ${manifest?.name || targetExtensionId}\n\n${description}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#181818] overflow-hidden select-text">
      {/* 1. Shared Modular Document Sub-Header (Standard layout matching notes & graph view) */}
      <PageSubHeader
        title={manifest?.name || targetExtensionId}
        icon={manifest?.isCore ? <PackageIcon size={13} /> : <PuzzleIcon size={13} />}
        document={null}
        showReadingToggle={false}
        showBookmark={false}
        showSearch={false}
        showDocOptions={false}
        customRightActions={
          <>
            {/* Quick Configure Link to Settings */}
            <button
              type="button"
              onClick={() => {
                setIsSettingsOpen(true, targetExtensionId);
              }}
              title={`${manifest?.name || targetExtensionId} options`}
              className="p-1 rounded text-[#777] hover:text-[#dcddde] hover:bg-[#222] transition-colors cursor-pointer"
            >
              <Settings02Icon size={14} />
            </button>

            {/* Quick Enabled Toggle */}
            <div className="flex items-center px-1">
              <ToggleSwitch
                checked={isEnabled}
                onChange={async (val) => {
                  setIsEnabled(val);
                  if (val) {
                    await app.extensions.enableExtension(targetExtensionId);
                    showToast(`Enabled ${manifest?.name || 'extension'}`, 'success');
                  } else {
                    await app.extensions.disableExtension(targetExtensionId);
                    showToast(`Disabled ${manifest?.name || 'extension'}`, 'info');
                  }
                }}
              />
            </div>
          </>
        }
      />

      {/* 2. Shared Document Layout Canvas Wrapper (Identical pixel layout & margins to Note Document) */}
      <DocLayoutWrapper isReadingMode={true}>
        {/* Optional Banner Asset Image */}
        {manifest?.bannerImage && (
          <div className="w-full h-44 mb-6 rounded-xl overflow-hidden border border-[#2a2a2a] shadow-lg relative bg-[#1c1c1c]">
            <img
              src={manifest.bannerImage}
              alt={`${manifest?.name || targetExtensionId} Banner`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Document Header (Title + In-Document Properties) */}
        <div className="relative group/title">
          {/* Document Title Header */}
          <div className="mb-3 relative">
            <h1
              style={{ fontSize: 'calc(var(--editor-font-size, 12px) * 2.3)' }}
              className="w-full font-bold text-[#e5e7eb] pb-2 font-text tracking-tight leading-tight select-text"
            >
              {manifest?.name || targetExtensionId}
            </h1>
          </div>

          {/* In-Document Frontmatter Properties Header (Identical standard layout to notes) */}
          <div className="mb-3 text-xs">
            <div className="flex flex-col gap-1.5">
              {/* Property: Tags */}
              <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
                <div className="relative flex items-center shrink-0 w-24">
                  <span className="p-1 -ml-1 text-[#777] flex items-center mr-1">
                    <Tag01Icon size={12} className="text-[#888]" />
                  </span>
                  <span className="text-[11px] font-medium text-[#777]">Tags</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[5px] bg-[#252525] hover:bg-[#2d2d2d] text-[#b0b0b0] hover:text-white border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all font-medium text-xs"
                    >
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Property: Creator */}
              <div className="flex items-center gap-2 min-h-[28px]">
                <div className="relative flex items-center shrink-0 w-24">
                  <span className="p-1 -ml-1 text-[#777] flex items-center mr-1">
                    <PackageIcon size={12} className="text-[#888]" />
                  </span>
                  <span className="text-[11px] font-medium text-[#777]">Creator</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[11px] text-[#dcddde] font-normal leading-tight font-sans select-text">
                    {creatorName}
                  </span>
                </div>
              </div>

              {/* Property: Version */}
              <div className="flex items-center gap-2 min-h-[28px]">
                <div className="relative flex items-center shrink-0 w-24">
                  <span className="p-1 -ml-1 text-[#777] flex items-center mr-1">
                    <GitForkIcon size={12} className="text-[#888]" />
                  </span>
                  <span className="text-[11px] font-medium text-[#777]">Version</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[11px] text-[#dcddde] font-normal leading-tight font-sans select-text">
                    {version}
                  </span>
                </div>
              </div>

              {/* Property: Description */}
              {description && (
                <div className="flex items-center gap-2 min-h-[28px]">
                  <div className="relative flex items-center shrink-0 w-24">
                    <span className="p-1 -ml-1 text-[#777] flex items-center mr-1">
                      <LeftToRightListBulletIcon size={12} className="text-[#888]" />
                    </span>
                    <span className="text-[11px] font-medium text-[#777]">Description</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[11px] text-[#dcddde] font-normal leading-tight font-sans select-text">
                      {description}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divider Line under Document Header */}
          <div className="border-b border-[#282828] mb-5" />
        </div>

        {/* Rendered README.md Prose Body */}
        <div className="flex-1 flex flex-col">
          <MarkdownDocRenderer content={readmeContent} />
        </div>
      </DocLayoutWrapper>
    </div>
  );
});

// Backwards compatibility alias
export const PluginDocViewer = ExtensionDocViewer;
export default ExtensionDocViewer;
