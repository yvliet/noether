import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { parseFrontmatter, formatFrontmatter, jsonToMarkdown, markdownToTipTapJson } from '@/lib/db/documents';
import { useSettingsStore } from '@/store/settingsStore';
import { DocumentProperties } from '@/types';
import {
  analyzeSelectionWrap,
  getCollapsedPairingAction,
  getSmartBackspaceAction,
  getTabOutDelta,
  matchCodeFenceLine,
  matchBlockquoteLine,
  hasUnclosedOpeningDelimiter,
} from './extensions/smart-pairing-utils';

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
  const spellcheck = useSettingsStore((s) => s.spellcheck);
  const tabSizeSetting = useSettingsStore((s) => s.tabSize);
  const tabSize = typeof tabSizeSetting === 'number' ? tabSizeSetting : parseInt(String(tabSizeSetting || 2), 10) || 2;

  // Compute initial raw markdown text from properties + content
  const initialRawMarkdown = useMemo(() => {
    const frontmatter = formatFrontmatter(properties);
    const bodyMd = jsonToMarkdown(contentJson, '', '');
    const prefix = frontmatter ? (frontmatter.endsWith('\n') ? frontmatter : frontmatter + '\n') : '';
    return prefix + bodyMd;
  }, [contentJson, properties]);

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

    // Convert body text to TipTap JSON AST
    const newContentJson = markdownToTipTapJson(bodyText);

    onChange(newContentJson, undefined, parsedProps);
  }, [onChange]);

  // Soft-undo tracking for immediate backspace after auto-pair
  const lastAutoPairRef = useRef<{ pos: number; char: string } | null>(null);

  // Smart URL Paste: selecting text and pasting a URL automatically wraps it in [selected](url)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const { selectionStart, selectionEnd, value } = textarea;
      if (selectionStart !== selectionEnd) {
        const text = e.clipboardData.getData('text/plain')?.trim();
        if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('mailto:'))) {
          const selectedText = value.slice(selectionStart, selectionEnd);
          if (selectedText && !selectedText.startsWith('[') && !selectedText.includes('\n')) {
            e.preventDefault();
            const wrapped = `[${selectedText}](${text})`;
            const updated = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);
            handleChange(updated);
            pushHistory(updated);
            setTimeout(() => {
              textarea.selectionStart = selectionStart + 1;
              textarea.selectionEnd = selectionStart + 1 + selectedText.length;
            }, 0);
            return;
          }
        }
      }
    },
    [handleChange, pushHistory]
  );

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
          // Tab-Out: If sitting immediately before a closing delimiter, step over it
          const textAfter = value.slice(selectionStart);
          const tabDelta = getTabOutDelta(textAfter);
          if (tabDelta > 0) {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + tabDelta;
            lastAutoPairRef.current = null;
            return;
          }

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

    // 5. Enter Key: Smart Auto-Indentation, Code Fences, Blockquotes & List Continuation
    if (e.key === 'Enter' && !isCtrlOrMeta && !e.altKey) {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.slice(lineStart, selectionStart);

      // 5A. Code Fence expansion: ``` or ```lang
      const fence = matchCodeFenceLine(currentLine);
      if (fence) {
        e.preventDefault();
        const insertText = `\n${fence.indent}\n${fence.indent}\`\`\``;
        const updated = value.slice(0, selectionStart) + insertText + value.slice(selectionEnd);
        handleChange(updated);
        pushHistory(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + fence.indent.length;
        }, 0);
        return;
      }

      // 5B. Blockquote continuation & clean exit: > quote
      const blockquote = matchBlockquoteLine(currentLine);
      if (blockquote) {
        if (blockquote.isEmpty) {
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
        const nextPrefix = `${blockquote.marker} `;
        const insertText = '\n' + nextPrefix;
        const updated = value.slice(0, selectionStart) + insertText + value.slice(selectionEnd);
        handleChange(updated);
        pushHistory(updated);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
        }, 0);
        return;
      }

      // 5C. List Continuation
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

    // 6. Smart auto-pairing and autowrapping
    if (autoPairing && !isCtrlOrMeta && !e.altKey) {
      if (selectionStart !== selectionEnd) {
        const selFrom = selectionStart;
        const selTo = selectionEnd;
        const selText = value.slice(selFrom, selTo);
        const lineStart = value.lastIndexOf('\n', selFrom - 1) + 1;
        const lineEndIdx = value.indexOf('\n', selTo);
        const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
        const lineText = value.slice(lineStart, lineEnd);
        const selStartInLine = selFrom - lineStart;
        const selEndInLine = selTo - lineStart;

        const wrapResult = analyzeSelectionWrap(
          selFrom,
          selTo,
          selText,
          lineText,
          selStartInLine,
          selEndInLine,
          e.key
        );

        if (wrapResult) {
          e.preventDefault();
          const updated = value.slice(0, wrapResult.replaceFrom) + wrapResult.text + value.slice(wrapResult.replaceTo);
          handleChange(updated);
          pushHistory(updated);
          setTimeout(() => {
            textarea.selectionStart = wrapResult.selectionFrom;
            textarea.selectionEnd = wrapResult.selectionTo;
          }, 0);
          return;
        }
      } else {
        const pos = selectionStart;
        const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
        const lineEndIdx = value.indexOf('\n', pos);
        const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
        const lineText = value.slice(lineStart, lineEnd);
        const caretPosInLine = pos - lineStart;

        if (e.key === 'Backspace' && pos > 0) {
          // Soft Undo: If user immediately hits Backspace right after an auto-pair,
          // remove only the auto-inserted closing character.
          if (lastAutoPairRef.current && lastAutoPairRef.current.pos === pos) {
            e.preventDefault();
            const deleteLen = lastAutoPairRef.current.char.length;
            const updated = value.slice(0, pos) + value.slice(pos + deleteLen);
            handleChange(updated);
            pushHistory(updated);
            lastAutoPairRef.current = null;
            return;
          }
          lastAutoPairRef.current = null;

          const bsAction = getSmartBackspaceAction(lineText, caretPosInLine);
          if (bsAction) {
            e.preventDefault();
            const updated = value.slice(0, pos - bsAction.deleteBefore) + value.slice(pos + bsAction.deleteAfter);
            handleChange(updated);
            pushHistory(updated);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = pos - bsAction.deleteBefore;
            }, 0);
            return;
          }
        }

        // Reset soft undo tracking on any non-backspace keystroke
        lastAutoPairRef.current = null;

        // Math Subscript/Superscript Auto-Bracing inside $...$ or $$...$$
        if ((e.key === '^' || e.key === '_') && hasUnclosedOpeningDelimiter(lineText.slice(0, caretPosInLine), '$')) {
          e.preventDefault();
          const insert = `${e.key}{}`;
          const updated = value.slice(0, pos) + insert + value.slice(pos);
          handleChange(updated);
          pushHistory(updated);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = pos + 2;
          }, 0);
          lastAutoPairRef.current = { pos: pos + 2, char: '}' };
          return;
        }

        const pairResult = getCollapsedPairingAction(e.key, lineText, caretPosInLine);
        if (pairResult.action !== 'none') {
          e.preventDefault();
          if (pairResult.action === 'step_over') {
            textarea.selectionStart = textarea.selectionEnd = pos + (pairResult.caretDelta ?? 1);
            return;
          }
          if (pairResult.action === 'bullet_space') {
            const afterDelete = pairResult.deleteAfter ?? 0;
            const updated = value.slice(0, pos) + (pairResult.insertText ?? ' ') + value.slice(pos + afterDelete);
            handleChange(updated);
            pushHistory(updated);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = pos + (pairResult.caretDelta ?? 1);
            }, 0);
            return;
          }
          if (pairResult.action === 'close_single') {
            const insert = pairResult.insertText ?? e.key;
            const updated = value.slice(0, pos) + insert + value.slice(pos);
            handleChange(updated);
            pushHistory(updated);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = pos + (pairResult.caretDelta ?? 1);
            }, 0);
            return;
          }
          if (pairResult.action === 'escalate') {
            const insert = pairResult.insertText ?? '**';
            const half = Math.floor(insert.length / 2);
            const leftPart = insert.slice(0, half);
            const rightPart = insert.slice(half);
            const updated = value.slice(0, pos) + leftPart + rightPart + value.slice(pos);
            handleChange(updated);
            pushHistory(updated);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = pos + leftPart.length;
            }, 0);
            lastAutoPairRef.current = { pos: pos + leftPart.length, char: rightPart };
            return;
          }
          if (pairResult.action === 'pair') {
            const insert = pairResult.insertText ?? `${e.key}${e.key}`;
            const delta = pairResult.caretDelta ?? 1;
            const rightPart = insert.slice(delta);
            const updated = value.slice(0, pos) + insert + value.slice(pos);
            handleChange(updated);
            pushHistory(updated);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = pos + delta;
            }, 0);
            lastAutoPairRef.current = { pos: pos + delta, char: rightPart };
            return;
          }
        }
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
        onPaste={handlePaste}
        spellCheck={spellcheck}
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
