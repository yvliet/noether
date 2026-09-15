/**
 * @module smartMarkdownFormatter
 * @description
 * High-performance markdown content formatter that normalizes indentation,
 * list numbering, and callout syntax to match the user's active editor preferences.
 *
 * Technical Rationale:
 * - Content authored via Model Context Protocol (MCP) tools or external AI agents
 *   often contains arbitrary indentation (e.g. 2 spaces on a 4-space vault setup),
 *   lazy duplicate list numbers (e.g. '1. 1. 1.'), or unformatted callout tags.
 * - By transforming incoming markdown to respect the user's configured `tabSize`,
 *   indentation guides and folding lines in TipTap / Live Preview align perfectly,
 *   making machine-generated notes look as though they were typed directly by the user.
 * - Code fences (``` and ~~~) and display math blocks ($$) are preserved verbatim
 *   to avoid corrupting syntax or equations.
 *
 * @since 0.3.0
 */

export interface MarkdownFormattingOptions {
  /** Target indentation size in spaces (default: 2, or from user preferences) */
  tabSize?: number | string;
  /** Indentation style: 'spaces' or 'tabs' (default: 'spaces') */
  indentStyle?: 'spaces' | 'tabs';
  /** Whether to renumber consecutive ordered list items sequentially (default: true) */
  normalizeSequentialLists?: boolean;
  /** Whether to normalize callout headers to standard uppercase Obsidian format (default: true) */
  normalizeCallouts?: boolean;
  /** Whether to strip trailing whitespace on non-break lines (default: true) */
  trimTrailingWhitespace?: boolean;
}

interface ListLineMatch {
  rawLeading: string;
  marker: string;
  isOrdered: boolean;
  orderNumber?: number;
  orderDelimiter?: string;
  whitespaceAfter: string;
  content: string;
}

/**
 * Detects whether a line is a markdown list item.
 */
function parseListLine(line: string): ListLineMatch | null {
  // Matches:
  // 1: leading spaces/tabs
  // 2: unordered marker (-, *, +) OR ordered marker (\d+ followed by . or ))
  // 3: trailing delimiter for ordered lists
  // 4: spacing after marker
  // 5: remaining text
  const match = line.match(/^([ \t]*)([-*+]|(\d+)([\.\)]))(\s+)(.*)$/);
  if (!match) return null;

  const rawLeading = match[1];
  const marker = match[2];
  const orderNumStr = match[3];
  const orderDelimiter = match[4];
  const whitespaceAfter = match[5];
  const content = match[6];

  const isOrdered = Boolean(orderNumStr);
  const orderNumber = isOrdered ? parseInt(orderNumStr, 10) : undefined;

  return {
    rawLeading,
    marker,
    isOrdered,
    orderNumber,
    orderDelimiter,
    whitespaceAfter,
    content,
  };
}

/**
 * Measures the visual column indent of a leading whitespace string,
 * treating tabs as 4 spaces for depth calculation.
 */
function measureIndentSpaces(whitespace: string): number {
  let count = 0;
  for (let i = 0; i < whitespace.length; i++) {
    if (whitespace[i] === '\t') {
      count += 4;
    } else if (whitespace[i] === ' ') {
      count += 1;
    }
  }
  return count;
}

/**
 * Detects the prevailing indent step (e.g. 2, 4 spaces, or 1 tab) used across
 * a block of list lines.
 */
function detectListIndentStep(lines: string[]): number {
  const indents: number[] = [];
  let usesTabs = false;

  for (const line of lines) {
    if (/^\s*([-*+]|\d+[\.\)])\s+/.test(line)) {
      const match = line.match(/^([ \t]+)/);
      if (match) {
        if (match[1].includes('\t')) usesTabs = true;
        const spaces = measureIndentSpaces(match[1]);
        if (spaces > 0) indents.push(spaces);
      }
    }
  }

  if (usesTabs) return 4;
  if (indents.length === 0) return 2;

  // Determine greatest common divisor or standard stepping
  const allDivisibleBy4 = indents.every((n) => n % 4 === 0);
  if (allDivisibleBy4 && Math.min(...indents) >= 4) return 4;

  const allDivisibleBy2 = indents.every((n) => n % 2 === 0);
  if (allDivisibleBy2 && Math.min(...indents) >= 2) return 2;

  const minIndent = Math.min(...indents);
  return minIndent >= 2 ? minIndent : 2;
}

/**
 * Formats a raw markdown string to align with user editor preferences.
 *
 * @param rawMarkdown - The source markdown document string.
 * @param options - Configuration options for indentation and normalization.
 * @returns Clean, formatted markdown string.
 */
export function formatMarkdownToUserPreferences(
  rawMarkdown: string,
  options: MarkdownFormattingOptions = {}
): string {
  if (!rawMarkdown) return '';

  const rawTabSize = options.tabSize !== undefined ? options.tabSize : 2;
  const targetTabSize = Math.max(2, Math.min(8, typeof rawTabSize === 'number' ? rawTabSize : parseInt(String(rawTabSize), 10) || 2));
  const indentStyle = options.indentStyle || 'spaces';
  const normalizeSequentialLists = options.normalizeSequentialLists !== false;
  const normalizeCallouts = options.normalizeCallouts !== false;
  const trimTrailing = options.trimTrailingWhitespace !== false;

  const normalizedEol = rawMarkdown.replace(/\r\n/g, '\n');
  const lines = normalizedEol.split('\n');

  // 1. Separate YAML frontmatter if present at line 0
  let startIndex = 0;
  const frontmatterLines: string[] = [];

  if (lines.length > 0 && lines[0].trim() === '---') {
    frontmatterLines.push(lines[0]);
    let closed = false;
    for (let i = 1; i < lines.length; i++) {
      frontmatterLines.push(lines[i]);
      if (lines[i].trim() === '---') {
        startIndex = i + 1;
        closed = true;
        break;
      }
    }
    if (!closed) {
      // Unclosed frontmatter; treat as normal text
      frontmatterLines.length = 0;
      startIndex = 0;
    }
  }

  // 2. Scan remaining lines and detect prevailing list indentation step
  const bodyLines = lines.slice(startIndex);
  const detectedStep = detectListIndentStep(bodyLines);

  const formattedBodyLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockToken = '';
  let inMathBlock = false;

  // Track sequential list numbering counters per nesting level
  const listCounters: Map<number, number> = new Map();
  let consecutiveBlankLines = 0;
  let lastLineWasListItem = false;
  let lastListIndentLevel = 0;

  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    const trimmed = line.trim();

    // ── Code Fence Handling ──
    const codeFenceMatch = line.match(/^([ \t]*)(`{3,}|~{3,})(.*)$/);
    if (codeFenceMatch) {
      const token = codeFenceMatch[2][0];
      const tokenLen = codeFenceMatch[2].length;

      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockToken = token.repeat(tokenLen);
        formattedBodyLines.push(line);
        continue;
      } else if (line.trim().startsWith(codeBlockToken)) {
        inCodeBlock = false;
        codeBlockToken = '';
        formattedBodyLines.push(line);
        continue;
      }
    }

    if (inCodeBlock) {
      // Code blocks are strictly verbatim
      formattedBodyLines.push(line);
      continue;
    }

    // ── Display Math Block Handling ──
    if (trimmed === '$$') {
      inMathBlock = !inMathBlock;
      formattedBodyLines.push(line);
      continue;
    }

    if (inMathBlock) {
      // Math blocks are strictly verbatim
      formattedBodyLines.push(line);
      continue;
    }

    // ── Blank Lines & Counter Resets ──
    if (!trimmed) {
      consecutiveBlankLines++;
      if (consecutiveBlankLines >= 2) {
        listCounters.clear();
        lastLineWasListItem = false;
      }
      formattedBodyLines.push('');
      continue;
    }

    consecutiveBlankLines = 0;

    // Reset counters on headings, horizontal rules, or tables
    if (/^#{1,6}\s+/.test(trimmed) || /^(---|\*\*\*|___)\s*$/.test(trimmed) || /^\|.*\|\s*$/.test(trimmed)) {
      listCounters.clear();
      lastLineWasListItem = false;
    }

    // ── Callout Header Normalization ──
    if (normalizeCallouts) {
      // Match > [!type] Optional Title or >[!type]
      const calloutMatch = line.match(/^([ \t]*>(?:[ \t]*>)*)[ \t]*\[!([a-zA-Z0-9_\-]+)\]([+-]?)(?:[ \t]+(.*))?$/);
      if (calloutMatch) {
        const quotePrefix = calloutMatch[1].replace(/\s+/g, ' ').trim();
        const calloutType = calloutMatch[2].toUpperCase();
        const foldState = calloutMatch[3] || '';
        const title = calloutMatch[4] ? calloutMatch[4].trim() : '';

        const formattedCallout = title
          ? `${quotePrefix} [!${calloutType}${foldState}] ${title}`
          : `${quotePrefix} [!${calloutType}${foldState}]`;

        formattedBodyLines.push(formattedCallout);
        continue;
      }
    }

    // ── List Line Normalization ──
    const listMatch = parseListLine(line);
    if (listMatch) {
      lastLineWasListItem = true;

      // 1. Calculate Nesting Level based on detected step
      const rawIndentSpaces = measureIndentSpaces(listMatch.rawLeading);
      let indentLevel = 0;
      if (rawIndentSpaces > 0) {
        indentLevel = Math.max(1, Math.round(rawIndentSpaces / detectedStep));
      }
      lastListIndentLevel = indentLevel;

      // 2. Generate Normalized Indentation
      const targetIndent =
        indentStyle === 'tabs'
          ? '\t'.repeat(indentLevel)
          : ' '.repeat(indentLevel * targetTabSize);

      // 3. Handle Numbering or Bullet Marker
      let formattedMarker = listMatch.marker;
      if (listMatch.isOrdered && normalizeSequentialLists) {
        // Clear any deeper level counters
        for (const [lvl] of listCounters.entries()) {
          if (lvl > indentLevel) listCounters.delete(lvl);
        }

        const currentCount = (listCounters.get(indentLevel) || 0) + 1;
        listCounters.set(indentLevel, currentCount);

        const delim = listMatch.orderDelimiter || '.';
        formattedMarker = `${currentCount}${delim}`;
      } else {
        // Unordered list item clears ordered list counter at this level and deeper
        for (const [lvl] of listCounters.entries()) {
          if (lvl >= indentLevel) listCounters.delete(lvl);
        }
      }

      const formattedLine = `${targetIndent}${formattedMarker} ${listMatch.content}`;
      formattedBodyLines.push(trimTrailing ? formattedLine.trimEnd() : formattedLine);
      continue;
    }

    // ── List Continuation Line Alignment ──
    if (lastLineWasListItem && /^[ \t]+/.test(line)) {
      const rawIndentSpaces = measureIndentSpaces(line.match(/^[ \t]+/)?.[0] || '');
      // If continuation line has leading indent comparable to list indent
      if (rawIndentSpaces >= detectedStep) {
        const lineLevel = Math.max(1, Math.round(rawIndentSpaces / detectedStep));
        const targetIndent =
          indentStyle === 'tabs'
            ? '\t'.repeat(lineLevel)
            : ' '.repeat(lineLevel * targetTabSize);
        const trimmedContent = line.trim();
        const formattedLine = `${targetIndent}${trimmedContent}`;
        formattedBodyLines.push(trimTrailing ? formattedLine.trimEnd() : formattedLine);
        continue;
      }
    }

    // Line is not a list item: clear list item status
    lastLineWasListItem = false;

    // Normal paragraph or text line
    formattedBodyLines.push(trimTrailing ? line.trimEnd() : line);
  }

  // Reassemble full document with frontmatter preserved
  const allLines = [...frontmatterLines, ...formattedBodyLines];
  return allLines.join('\n');
}
