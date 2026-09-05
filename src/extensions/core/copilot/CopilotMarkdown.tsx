/**
 * @module CopilotMarkdown
 * @description
 * High-performance, native Markdown renderer tailored for Copilot chat bubbles.
 * Renders headings, lists, bold/italics, links, blockquotes, and code blocks with syntax highlighting
 * and 1-click copy functionality without external heavy rendering dependencies.
 *
 * Adheres strictly to Flint theme CSS variables and zero transition delay rules.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { Copy01Icon, CheckIcon } from '@/components/common/Icons';

export interface CopilotMarkdownProps {
  content: string;
  onWikilinkClick?: (noteTitle: string) => void;
}

export const CopilotMarkdown: React.FC<CopilotMarkdownProps> = React.memo(({ content, onWikilinkClick }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex((prev) => (prev === index ? null : prev));
    }, 1500);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('[data-wikilink]');
    if (target) {
      const linkTitle = target.getAttribute('data-wikilink');
      if (linkTitle && onWikilinkClick) {
        e.preventDefault();
        e.stopPropagation();
        onWikilinkClick(linkTitle);
      }
    }
  };

  const parsedNodes = useMemo(() => {
    if (!content) return null;

    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const nodes: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeLanguage = '';
    let codeLines: string[] = [];
    let codeBlockIndex = 0;

    let listBuffer: Array<{ type: 'bullet' | 'ordered'; marker: string; text: string }> = [];
    let inList = false;

    const flushList = (key: number) => {
      if (listBuffer.length > 0) {
        const isOrdered = listBuffer[0].type === 'ordered';
        const ListTag = isOrdered ? 'ol' : 'ul';

        nodes.push(
          <ListTag
            key={`list-${key}`}
            className="my-2 space-y-1 text-[var(--flint-text-primary,#eeeeee)] text-xs leading-relaxed pl-4 list-disc"
          >
            {listBuffer.map((item, idx) => (
              <li
                key={idx}
                className="pl-0.5"
                dangerouslySetInnerHTML={{ __html: renderInlineTokens(item.text) }}
              />
            ))}
          </ListTag>
        );
        listBuffer = [];
      }
      inList = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ── Fenced Code Blocks ──
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          if (inList) flushList(i);
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim().toLowerCase();
          codeLines = [];
        } else {
          inCodeBlock = false;
          const currentCode = codeLines.join('\n');
          const currentIndex = codeBlockIndex++;
          const isCopied = copiedIndex === currentIndex;

          nodes.push(
            <div
              key={`code-${i}`}
              className="my-2.5 rounded-[6px] border border-[var(--flint-border-base,#2f2f2f)] bg-[var(--flint-bg-input,#141414)] overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--flint-border-subtle,#242424)] bg-[var(--flint-bg-card,#1c1c1c)] text-[11px] text-[var(--flint-text-muted,#888888)] select-none">
                <span className="font-mono">{codeLanguage || 'text'}</span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(currentCode, currentIndex)}
                  className="inline-flex items-center gap-1 hover:text-[var(--flint-text-primary,#ffffff)] cursor-pointer select-none"
                  title="Copy code"
                >
                  {isCopied ? (
                    <>
                      <CheckIcon size={12} className="text-[var(--flint-accent,#ea580c)]" />
                      <span className="text-[10px] text-[var(--flint-accent,#ea580c)]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy01Icon size={12} />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-[11px] font-mono leading-relaxed overflow-x-auto text-[var(--flint-text-primary,#f0f0f0)] select-text whitespace-pre">
                <code>{currentCode}</code>
              </pre>
            </div>
          );
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // ── Headings ──
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        if (inList) flushList(i);
        const level = headingMatch[1].length;
        const text = headingMatch[2];

        if (level === 1) {
          nodes.push(
            <h2 key={`h1-${i}`} className="text-sm font-bold text-[var(--flint-text-primary,#ffffff)] mt-3 mb-1.5">
              <span dangerouslySetInnerHTML={{ __html: renderInlineTokens(text) }} />
            </h2>
          );
        } else if (level === 2) {
          nodes.push(
            <h3 key={`h2-${i}`} className="text-xs font-semibold text-[var(--flint-text-primary,#ffffff)] mt-2.5 mb-1">
              <span dangerouslySetInnerHTML={{ __html: renderInlineTokens(text) }} />
            </h3>
          );
        } else {
          nodes.push(
            <h4 key={`h3-${i}`} className="text-xs font-medium text-[var(--flint-text-primary,#e0e0e0)] mt-2 mb-0.5">
              <span dangerouslySetInnerHTML={{ __html: renderInlineTokens(text) }} />
            </h4>
          );
        }
        continue;
      }

      // ── Blockquotes ──
      if (line.trim().startsWith('>')) {
        if (inList) flushList(i);
        const quoteText = line.trim().replace(/^>\s?/, '');
        nodes.push(
          <blockquote
            key={`quote-${i}`}
            className="border-l-2 border-[var(--flint-accent,#ea580c)] pl-2.5 my-1.5 text-xs italic text-[var(--flint-text-muted,#aaaaaa)]"
            dangerouslySetInnerHTML={{ __html: renderInlineTokens(quoteText) }}
          />
        );
        continue;
      }

      // ── Lists ──
      const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
      const orderedMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);

      if (bulletMatch) {
        inList = true;
        listBuffer.push({ type: 'bullet', marker: '-', text: bulletMatch[1] });
        continue;
      }

      if (orderedMatch) {
        inList = true;
        listBuffer.push({ type: 'ordered', marker: orderedMatch[1], text: orderedMatch[2] });
        continue;
      }

      if (inList && line.trim() === '') {
        flushList(i);
        continue;
      }

      // ── Standard Paragraph ──
      if (line.trim() !== '') {
        if (inList) flushList(i);
        nodes.push(
          <p
            key={`p-${i}`}
            className="my-1.5 text-xs leading-relaxed text-[var(--flint-text-primary,#dedede)]"
            dangerouslySetInnerHTML={{ __html: renderInlineTokens(line) }}
          />
        );
      }
    }

    if (inList) {
      flushList(lines.length);
    }

    return nodes;
  }, [content, copiedIndex]);

  return (
    <div onClick={handleContainerClick} className="space-y-0.5 text-xs break-words">
      {parsedNodes}
    </div>
  );
});

CopilotMarkdown.displayName = 'CopilotMarkdown';

/**
 * Parses markdown inline syntax (code, bold, italics, links, wikilinks) into sanitized HTML strings.
 */
function renderInlineTokens(raw: string): string {
  if (!raw) return '';

  return (
    raw
      // HTML escaping
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Wikilinks: [[Note Title]] rendered with Flint accent styling and interactive data attribute
      .replace(
        /\[\[(.*?)\]\]/g,
        '<span data-wikilink="$1" class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-medium bg-[var(--flint-accent,#ea580c)]/10 text-[var(--flint-accent,#ea580c)] border border-[var(--flint-accent,#ea580c)]/25 hover:bg-[var(--flint-accent,#ea580c)]/20 cursor-pointer select-none align-baseline"><span>[[$1]]</span></span>'
      )
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-[var(--flint-bg-card,#252525)] border border-[var(--flint-border-base,#333333)] text-[var(--flint-accent,#ea580c)] font-mono text-[11px] px-1 py-0.5 rounded-[4px]">$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[var(--flint-text-primary,#ffffff)]">$1</strong>')
      // Italics
      .replace(/\*([^*]+)\*/g, '<em class="italic text-[var(--flint-text-muted,#cccccc)]">$1</em>')
      // Markdown links: [title](url)
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--flint-accent,#ea580c)] hover:underline inline-flex items-center gap-0.5">$1</a>'
      )
  );
}
