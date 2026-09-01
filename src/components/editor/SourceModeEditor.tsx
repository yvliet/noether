import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { parseFrontmatter, formatFrontmatter, jsonToMarkdown, markdownToTipTapJson } from '@/lib/db/documents';
import { useSettingsStore } from '@/store/settingsStore';
import { DocumentProperties } from '@/types';

export interface SourceModeEditorProps {
  documentId: string;
  contentJson: string;
  title: string;
  properties?: DocumentProperties | string;
  editable?: boolean;
  onChange: (contentJson: string, title?: string, properties?: DocumentProperties) => void;
  onSave?: () => void;
}

export const SourceModeEditor: React.FC<SourceModeEditorProps> = React.memo(({
  documentId,
  contentJson,
  title,
  properties,
  editable = true,
  onChange,
  onSave,
}) => {
  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const autoPairing = useSettingsStore((s) => s.autoPairing);
  const tabSizeSetting = useSettingsStore((s) => s.tabSize);
  const tabSize = typeof tabSizeSetting === 'number' ? tabSizeSetting : parseInt(String(tabSizeSetting || 2), 10) || 2;

  // Compute initial raw markdown text from properties + content
  const initialRawMarkdown = useMemo(() => {
    const frontmatter = formatFrontmatter(properties);
    let bodyMd = jsonToMarkdown(contentJson, '', '');
    
    // If the body doesn't start with a level 1 heading, and a title exists, prepend `# ${title}\n\n`
    if (!bodyMd.trim().startsWith('# ') && title) {
      bodyMd = `# ${title}\n\n${bodyMd}`.trim();
    }

    const prefix = frontmatter ? (frontmatter.endsWith('\n') ? frontmatter : frontmatter + '\n') : '';
    return prefix + bodyMd;
  }, [contentJson, title, properties]);

  const [text, setText] = useState<string>(initialRawMarkdown);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Local undo/redo history stack for raw editing
  const historyRef = useRef<{ stack: string[]; index: number }>({
    stack: [initialRawMarkdown],
    index: 0,
  });

  const lastPushedTextRef = useRef<string>(initialRawMarkdown);

  // Reset when active document switches
  useEffect(() => {
    setText(initialRawMarkdown);
    historyRef.current = { stack: [initialRawMarkdown], index: 0 };
    lastPushedTextRef.current = initialRawMarkdown;
  }, [documentId]);

  // Auto-resize textarea height so the canvas container handles scrolling naturally
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(500, textarea.scrollHeight)}px`;
  }, [text]);

  // Split lines for line numbers
  const lines = useMemo(() => {
    return text.split('\n');
  }, [text]);

  const historyPushTimerRef = useRef<any>(null);

  const pushHistory = useCallback((newText: string) => {
    if (historyPushTimerRef.current) {
      clearTimeout(historyPushTimerRef.current);
      historyPushTimerRef.current = null;
    }
    if (newText === lastPushedTextRef.current) return;
    const { stack, index } = historyRef.current;
    const newStack = stack.slice(0, index + 1);
    newStack.push(newText);
    if (newStack.length > 100) newStack.shift();
    historyRef.current = { stack: newStack, index: newStack.length - 1 };
    lastPushedTextRef.current = newText;
  }, []);

  const debouncedPushHistory = useCallback((newText: string) => {
    if (historyPushTimerRef.current) {
      clearTimeout(historyPushTimerRef.current);
    }
    // If text ends with whitespace, punctuation, or line break, push immediately
    if (/\s$/.test(newText) || /\n$/.test(newText) || Math.abs(newText.length - lastPushedTextRef.current.length) > 5) {
      pushHistory(newText);
    } else {
      historyPushTimerRef.current = setTimeout(() => {
        pushHistory(newText);
      }, 350);
    }
  }, [pushHistory]);

  // Handle changes and sync back to Flint document models
  const handleChange = useCallback((newText: string) => {
    setText(newText);

    // Parse YAML frontmatter and markdown body
    const { properties: parsedProps, bodyText } = parseFrontmatter(newText);

    // Extract title from first H1 heading if present
    const headingMatch = bodyText.match(/^#\s+([^\n]+)/);
    const extractedTitle = headingMatch && headingMatch[1].trim() ? headingMatch[1].trim() : undefined;

    // Convert body text to TipTap JSON AST
    const newContentJson = markdownToTipTapJson(bodyText);

    onChange(newContentJson, extractedTitle, parsedProps);
  }, [onChange]);

  // Keyboard enhancements: Tab/Shift-Tab, Smart Auto-Indent, Auto-Pairing, Ctrl+S
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    // 1. Explicit Save: Ctrl + S / Cmd + S
    if ((e.key === 's' || e.key === 'S') && isCtrlOrMeta && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      onSave?.();
      return;
    }

    // 2. Undo: Ctrl + Z
    if ((e.key === 'z' || e.key === 'Z') && isCtrlOrMeta && !e.shiftKey && !e.altKey) {
      if (historyRef.current.index > 0) {
        e.preventDefault();
        const nextIdx = historyRef.current.index - 1;
        historyRef.current.index = nextIdx;
        const prevText = historyRef.current.stack[nextIdx];
        setText(prevText);
        handleChange(prevText);
      }
      return;
    }

    // 3. Redo: Ctrl + Y or Ctrl + Shift + Z
    if (
      ((e.key === 'y' || e.key === 'Y') && isCtrlOrMeta && !e.altKey) ||
      ((e.key === 'z' || e.key === 'Z') && isCtrlOrMeta && e.shiftKey && !e.altKey)
    ) {
      if (historyRef.current.index < historyRef.current.stack.length - 1) {
        e.preventDefault();
        const nextIdx = historyRef.current.index + 1;
        historyRef.current.index = nextIdx;
        const nextText = historyRef.current.stack[nextIdx];
        setText(nextText);
        handleChange(nextText);
      }
      return;
    }

    if (!editable) return;

    // 4. Tab / Shift + Tab Indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const indentStr = ' '.repeat(tabSize);

      if (selectionStart === selectionEnd) {
        if (!e.shiftKey) {
          // Insert indent
          const updated = value.slice(0, selectionStart) + indentStr + value.slice(selectionEnd);
          handleChange(updated);
          pushHistory(updated);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + indentStr.length;
          }, 0);
        } else {
          // Outdent single line
          const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
          const linePrefix = value.slice(lineStart, selectionStart);
          if (linePrefix.startsWith(indentStr)) {
            const updated = value.slice(0, lineStart) + value.slice(lineStart + indentStr.length);
            handleChange(updated);
            pushHistory(updated);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, selectionStart - indentStr.length);
            }, 0);
          }
        }
      } else {
        // Multi-line indent/outdent
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const lineEnd = value.indexOf('\n', selectionEnd);
        const endPos = lineEnd === -1 ? value.length : lineEnd;
        const selectedBlock = value.slice(lineStart, endPos);
        const blockLines = selectedBlock.split('\n');

        let updatedBlock = '';
        if (!e.shiftKey) {
          updatedBlock = blockLines.map((l) => indentStr + l).join('\n');
        } else {
          updatedBlock = blockLines.map((l) => (l.startsWith(indentStr) ? l.slice(indentStr.length) : l.replace(/^\s{1,2}/, ''))).join('\n');
        }

        const updated = value.slice(0, lineStart) + updatedBlock + value.slice(endPos);
        handleChange(updated);
        pushHistory(updated);
        setTimeout(() => {
          textarea.selectionStart = lineStart;
          textarea.selectionEnd = lineStart + updatedBlock.length;
        }, 0);
      }
      return;
    }

    // 5. Enter Key: Smart Auto-Indentation & List Continuation
    if (e.key === 'Enter' && !isCtrlOrMeta && !e.altKey) {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.slice(lineStart, selectionStart);
      const indentMatch = currentLine.match(/^(\s+)/);
      const listMatch = currentLine.match(/^(\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?)/);

      if (listMatch) {
        const itemContent = currentLine.slice(listMatch[1].length).trim();
        // If empty list item, hitting enter clears the bullet
        if (!itemContent) {
          e.preventDefault();
          const updated = value.slice(0, lineStart) + value.slice(selectionStart);
          handleChange(updated);
          pushHistory(updated);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          }, 0);
          return;
        }

        e.preventDefault();
        let nextBullet = listMatch[1];
        // Increment ordered list
        const numMatch = nextBullet.match(/^(\s*)(\d+)\.\s+/);
        if (numMatch) {
          const nextNum = parseInt(numMatch[2], 10) + 1;
          nextBullet = `${numMatch[1]}${nextNum}. `;
        }

        const insertText = '\n' + nextBullet;
        const updated = value.slice(0, selectionStart) + insertText + value.slice(selectionEnd);
        handleChange(updated);
        pushHistory(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
        }, 0);
        return;
      } else if (indentMatch) {
        e.preventDefault();
        const insertText = '\n' + indentMatch[1];
        const updated = value.slice(0, selectionStart) + insertText + value.slice(selectionEnd);
        handleChange(updated);
        pushHistory(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
        }, 0);
        return;
      }
    }

    // 6. Auto-pairing brackets & quotes
    const pairs: Record<string, string> = {};
    if (autoPairing) {
      pairs['('] = ')';
      pairs['['] = ']';
      pairs['{'] = '}';
      pairs['"'] = '"';
      pairs['`'] = '`';
      pairs['*'] = '*';
      pairs['~'] = '~';
    }

    if (pairs[e.key] && !isCtrlOrMeta && !e.altKey) {
      const closing = pairs[e.key];
      if (selectionStart !== selectionEnd) {
        e.preventDefault();
        const selectedText = value.slice(selectionStart, selectionEnd);
        const wrapped = e.key + selectedText + closing;
        const updated = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);
        handleChange(updated);
        pushHistory(updated);
        setTimeout(() => {
          textarea.selectionStart = selectionStart + 1;
          textarea.selectionEnd = selectionEnd + 1;
        }, 0);
        return;
      } else {
        // Auto-close pair
        e.preventDefault();
        const updated = value.slice(0, selectionStart) + e.key + closing + value.slice(selectionEnd);
        handleChange(updated);
        pushHistory(updated);
        setTimeout(() => {
          textarea.selectionStart = selectionStart + 1;
        }, 0);
        return;
      }
    }

    // 7. Auto-skip closing character
    if (selectionStart === selectionEnd && (e.key === ')' || e.key === ']' || e.key === '}' || e.key === '"' || e.key === '`' || e.key === '*' || e.key === '~')) {
      if (value[selectionStart] === e.key) {
        e.preventDefault();
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        return;
      }
    }

    // 8. Backspace pair deletion
    if (e.key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
      const prevChar = value[selectionStart - 1];
      const nextChar = value[selectionStart];
      if (pairs[prevChar] === nextChar) {
        e.preventDefault();
        const updated = value.slice(0, selectionStart - 1) + value.slice(selectionStart + 1);
        handleChange(updated);
        pushHistory(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
        }, 0);
        return;
      }
    }
  };

  return (
    <div
      onClick={(e) => {
        if (textareaRef.current && editable && e.target === e.currentTarget) {
          textareaRef.current.focus();
        }
      }}
      className="relative w-full flex-1 flex flex-col min-h-full cursor-text select-text"
    >
      {/* Line Numbers Gutter */}
      {lineNumbers && (
        <div
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-monospace)',
            fontSize: 'calc(var(--editor-font-size, 16px) * 0.75)',
            lineHeight: '1.75',
          }}
          className="absolute -left-9 top-0 bottom-0 w-7 select-none text-right pr-2 text-[var(--flint-text-muted,#555)] pointer-events-none overflow-hidden"
        >
          {lines.map((_, idx) => (
            <div
              key={idx}
              style={{
                height: 'calc(var(--editor-font-size, 16px) * 1.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      )}

      {/* Raw Markdown Textarea: follows user Text Font and Font Size */}
      <textarea
        ref={textareaRef}
        value={text}
        disabled={!editable}
        readOnly={!editable}
        onChange={(e) => {
          handleChange(e.target.value);
          debouncedPushHistory(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Type markdown, YAML frontmatter, headings..."
        style={{
          fontFamily: 'var(--font-text)',
          fontSize: 'var(--editor-font-size, 16px)',
          lineHeight: '1.75',
        }}
        className="w-full flex-1 bg-transparent text-[var(--flint-text-primary)] placeholder:text-[var(--flint-text-muted)] outline-none border-none resize-none p-0 selection:bg-[var(--flint-selection-bg,#384152)] selection:text-[var(--flint-selection-text,#ffffff)] caret-[var(--flint-accent,#58a6ff)] whitespace-pre-wrap break-words overflow-hidden"
      />
    </div>
  );
});

SourceModeEditor.displayName = 'SourceModeEditor';
