/**
 * Pure helper utilities for smart autowrapping and auto-pairing in Flint.
 *
 * Extracted into pure utility functions with zero UI or framework dependencies so
 * that both TipTap's ProseMirror plugin (AutoPairing) and Source Mode Editor
 * (raw textarea) share identical, predictable syntactic behavior without code duplication.
 */

export interface SelectionWrapResult {
  /** Replacement text for the selected range or surrounding range */
  text: string;
  /** Absolute start position to replace in document */
  replaceFrom: number;
  /** Absolute end position to replace in document */
  replaceTo: number;
  /** New selection start position after replacement */
  selectionFrom: number;
  /** New selection end position after replacement */
  selectionTo: number;
}

export interface CollapsedPairResult {
  action: 'escalate' | 'step_over' | 'close_single' | 'pair' | 'bullet_space' | 'none';
  /** Text to insert at current position */
  insertText?: string;
  /** New caret offset relative to current position */
  caretDelta?: number;
  /** Characters to delete around current position */
  deleteBefore?: number;
  deleteAfter?: number;
}

/**
 * Checks whether text contains an unmatched opening delimiter before the caret on the current line.
 *
 * Handles:
 * - Escaped delimiters (`\*`, `\[`, etc.) are ignored.
 * - Delimiters inside inline code spans (`...`) are ignored.
 * - Leading bullet list markers (`* `, `- `, `+ `) at line start are ignored.
 * - Delimiters flanked by spaces (e.g. ` 5 * 3 `) are treated as literal math/punctuation, not formatting.
 */
export function hasUnclosedOpeningDelimiter(textBeforeOnLine: string, delimiter: string): boolean {
  if (!textBeforeOnLine) return false;

  // 1. Strip escaped characters so '\*' is not counted
  const unescaped = textBeforeOnLine.replace(/\\./g, '  ');

  // 2. Delimiters inside closed inline code spans `...` should not be counted
  const withoutCodeSpans = unescaped.replace(/`[^`\n]*`/g, (match) => ' '.repeat(match.length));

  if (delimiter === '*') {
    // In Markdown formatting, a closing delimiter cannot be immediately preceded by whitespace
    if (/\s$/.test(textBeforeOnLine)) {
      return false;
    }

    // Ignore leading bullet list marker at start of line (e.g. `   * list item`)
    const lineWithoutBullet = withoutCodeSpans.replace(/^(\s*)[-*+](\s+)/, (_, indent, space) => {
      return ' '.repeat(indent.length + 1 + space.length);
    });

    // Scan for unclosed opening asterisks
    let openSingles = 0;
    let openDoubles = 0;
    let i = 0;
    const len = lineWithoutBullet.length;

    while (i < len) {
      if (lineWithoutBullet[i] === '*') {
        // Check run length of asterisks
        let run = 0;
        while (i + run < len && lineWithoutBullet[i + run] === '*') {
          run++;
        }

        const charBefore = i > 0 ? lineWithoutBullet[i - 1] : ' ';
        const charAfter = i + run < len ? lineWithoutBullet[i + run] : '';

        // Left-flanking: cannot be followed by whitespace
        const canOpen = charAfter !== '' && !/\s/.test(charAfter);
        // Right-flanking: cannot be preceded by whitespace
        const canClose = charBefore !== '' && !/\s/.test(charBefore);

        if (run === 1) {
          if (canClose && openSingles > 0) {
            openSingles--;
          } else if (canClose && openDoubles > 0) {
            // Closing 1 of 2 open asterisks
            openDoubles--;
            openSingles++;
          } else if (canOpen) {
            openSingles++;
          }
        } else if (run === 2) {
          if (canClose && openDoubles > 0) {
            openDoubles--;
          } else if (canClose && openSingles >= 2) {
            openSingles -= 2;
          } else if (canOpen) {
            openDoubles++;
          }
        } else if (run >= 3) {
          if (canClose && (openSingles > 0 || openDoubles > 0)) {
            if (openDoubles > 0) openDoubles--;
            if (openSingles > 0) openSingles--;
          } else if (canOpen) {
            openSingles++;
            openDoubles++;
          }
        }

        i += run;
      } else {
        i++;
      }
    }

    return openSingles > 0 || openDoubles > 0;
  }

  if (delimiter === '`') {
    // Count unescaped backticks
    const matches = unescaped.match(/`/g);
    return matches ? matches.length % 2 === 1 : false;
  }

  if (delimiter === '~') {
    if (/\s$/.test(textBeforeOnLine)) return false;
    const matches = unescaped.match(/~~/g);
    return matches ? matches.length % 2 === 1 : false;
  }

  if (delimiter === '=') {
    if (/\s$/.test(textBeforeOnLine)) return false;
    const matches = unescaped.match(/==/g);
    return matches ? matches.length % 2 === 1 : false;
  }

  if (delimiter === '$') {
    // 1. Check for unclosed block math: odd count of $$
    const doubleMatches = unescaped.match(/\$\$/g);
    if (doubleMatches && doubleMatches.length % 2 === 1) {
      return true;
    }
    // 2. Check for unclosed inline math: odd count of single $ (excluding $$)
    const withoutDoubleDollars = unescaped.replace(/\$\$/g, '  ');
    const singleMatches = withoutDoubleDollars.match(/\$/g);
    return singleMatches ? singleMatches.length % 2 === 1 : false;
  }

  if (delimiter === '"') {
    const matches = unescaped.match(/"/g);
    return matches ? matches.length % 2 === 1 : false;
  }

  if (delimiter === "'") {
    const matches = unescaped.match(/'/g);
    return matches ? matches.length % 2 === 1 : false;
  }

  if (delimiter === ']' || delimiter === '[') {
    let openCount = 0;
    for (let j = 0; j < unescaped.length; j++) {
      if (unescaped[j] === '[') openCount++;
      else if (unescaped[j] === ']') openCount = Math.max(0, openCount - 1);
    }
    return openCount > 0;
  }

  if (delimiter === ')' || delimiter === '(') {
    let openCount = 0;
    for (let j = 0; j < unescaped.length; j++) {
      if (unescaped[j] === '(') openCount++;
      else if (unescaped[j] === ')') openCount = Math.max(0, openCount - 1);
    }
    return openCount > 0;
  }

  if (delimiter === '}' || delimiter === '{') {
    let openCount = 0;
    for (let j = 0; j < unescaped.length; j++) {
      if (unescaped[j] === '{') openCount++;
      else if (unescaped[j] === '}') openCount = Math.max(0, openCount - 1);
    }
    return openCount > 0;
  }

  return false;
}

/**
 * Computes the smart selection wrapping result for non-empty selections.
 *
 * Balances asymmetric cases:
 * - `*|selection|` + `*` -> `*selection*` (inserts 1 `*` on right, avoids `**selection*`)
 * - `|selection|*` + `*` -> `*selection*` (inserts 1 `*` on left, avoids `*selection**`)
 * - `|*selection|` + `*` -> `*selection*` (completes missing side)
 * - `|selection*|` + `*` -> `*selection*` (completes missing side)
 * - Symmetrical upgrade: `*selection*` + `*` -> `**selection**` -> `***selection***` -> unwrap
 */
export function analyzeSelectionWrap(
  from: number,
  to: number,
  selText: string,
  blockText: string,
  selStartInBlock: number,
  selEndInBlock: number,
  key: string
): SelectionWrapResult | null {
  const beforeOne = selStartInBlock >= 1 ? blockText.slice(selStartInBlock - 1, selStartInBlock) : '';
  const beforeTwo = selStartInBlock >= 2 ? blockText.slice(selStartInBlock - 2, selStartInBlock) : '';
  const beforeThree = selStartInBlock >= 3 ? blockText.slice(selStartInBlock - 3, selStartInBlock) : '';

  const afterOne = selEndInBlock <= blockText.length - 1 ? blockText.slice(selEndInBlock, selEndInBlock + 1) : '';
  const afterTwo = selEndInBlock <= blockText.length - 2 ? blockText.slice(selEndInBlock, selEndInBlock + 2) : '';
  const afterThree = selEndInBlock <= blockText.length - 3 ? blockText.slice(selEndInBlock, selEndInBlock + 3) : '';

  // 1. Asterisks (*): progressive wrapping and asymmetric balancing
  if (key === '*') {
    // Case 1A: Asymmetric - Left already has 2 asterisks (**), right has 0
    if (beforeTwo === '**' && afterOne !== '*') {
      return {
        text: `${selText}**`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + selText.length,
      };
    }

    // Case 1B: Asymmetric - Left already has 1 asterisk (*), right has 0
    if (beforeOne === '*' && beforeTwo !== '**' && afterOne !== '*') {
      return {
        text: `${selText}*`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + selText.length,
      };
    }

    // Case 1C: Asymmetric - Right already has 2 asterisks (**), left has 0
    if (afterTwo === '**' && beforeOne !== '*') {
      return {
        text: `**${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 2,
        selectionTo: from + 2 + selText.length,
      };
    }

    // Case 1D: Asymmetric - Right already has 1 asterisk (*), left has 0
    if (afterOne === '*' && afterTwo !== '**' && beforeOne !== '*') {
      return {
        text: `*${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 1,
        selectionTo: from + 1 + selText.length,
      };
    }

    // Case 1E: Selection itself has unbalanced asterisk at start or end
    if (selText.startsWith('**') && !selText.endsWith('**')) {
      const inner = selText;
      return {
        text: `${inner}**`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 2,
        selectionTo: from + inner.length,
      };
    }
    if (selText.startsWith('*') && !selText.startsWith('**') && !selText.endsWith('*')) {
      const inner = selText;
      return {
        text: `${inner}*`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 1,
        selectionTo: from + inner.length,
      };
    }
    if (selText.endsWith('**') && !selText.startsWith('**')) {
      return {
        text: `**${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 2,
        selectionTo: from + 2 + selText.length - 2,
      };
    }
    if (selText.endsWith('*') && !selText.endsWith('**') && !selText.startsWith('*')) {
      return {
        text: `*${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 1,
        selectionTo: from + 1 + selText.length - 1,
      };
    }

    // Case 1F: Progressive Escalation on Selection
    // If selected text is ***text*** -> unwrap to plain text
    if (selText.startsWith('***') && selText.endsWith('***') && selText.length >= 6) {
      const unwrapped = selText.slice(3, -3);
      return {
        text: unwrapped,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + unwrapped.length,
      };
    }
    if (beforeThree === '***' && afterThree === '***') {
      return {
        text: selText,
        replaceFrom: from - 3,
        replaceTo: to + 3,
        selectionFrom: from - 3,
        selectionTo: from - 3 + selText.length,
      };
    }

    // If selected text is **text** -> upgrade to ***text***
    if (selText.startsWith('**') && selText.endsWith('**') && selText.length >= 4) {
      const inner = selText.slice(2, -2);
      return {
        text: `***${inner}***`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 3,
        selectionTo: from + 3 + inner.length,
      };
    }
    if (beforeTwo === '**' && afterTwo === '**') {
      return {
        text: `***${selText}***`,
        replaceFrom: from - 2,
        replaceTo: to + 2,
        selectionFrom: from - 2 + 3,
        selectionTo: from - 2 + 3 + selText.length,
      };
    }

    // If selected text is *text* -> upgrade to **text**
    if (selText.startsWith('*') && selText.endsWith('*') && selText.length >= 2) {
      const inner = selText.slice(1, -1);
      return {
        text: `**${inner}**`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 2,
        selectionTo: from + 2 + inner.length,
      };
    }
    if (beforeOne === '*' && afterOne === '*') {
      return {
        text: `**${selText}**`,
        replaceFrom: from - 1,
        replaceTo: to + 1,
        selectionFrom: from - 1 + 2,
        selectionTo: from - 1 + 2 + selText.length,
      };
    }

    // Case 1G: Default plain text -> wrap in single asterisks *selText*
    return {
      text: `*${selText}*`,
      replaceFrom: from,
      replaceTo: to,
      selectionFrom: from + 1,
      selectionTo: from + 1 + selText.length,
    };
  }

  // 2. Backtick (`): inline code wrapping and code block escalation
  if (key === '`') {
    if (beforeOne === '`' && afterOne !== '`') {
      return {
        text: `${selText}\``,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + selText.length,
      };
    }
    if (afterOne === '`' && beforeOne !== '`') {
      return {
        text: `\`${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 1,
        selectionTo: from + 1 + selText.length,
      };
    }
    if (selText.startsWith('```') && selText.endsWith('```') && selText.length >= 6) {
      const unwrapped = selText.slice(3, -3);
      return {
        text: unwrapped,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + unwrapped.length,
      };
    }
    if (selText.startsWith('`') && selText.endsWith('`') && selText.length >= 2) {
      const unwrapped = selText.slice(1, -1);
      return {
        text: unwrapped,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + unwrapped.length,
      };
    }
    if (beforeOne === '`' && afterOne === '`') {
      return {
        text: selText,
        replaceFrom: from - 1,
        replaceTo: to + 1,
        selectionFrom: from - 1,
        selectionTo: from - 1 + selText.length,
      };
    }

    return {
      text: `\`${selText}\``,
      replaceFrom: from,
      replaceTo: to,
      selectionFrom: from + 1,
      selectionTo: from + 1 + selText.length,
    };
  }

  // 3. Tilde (~): strikethrough wrapping
  if (key === '~') {
    if (beforeTwo === '~~' && afterTwo !== '~~') {
      return {
        text: `${selText}~~`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + selText.length,
      };
    }
    if (afterTwo === '~~' && beforeTwo !== '~~') {
      return {
        text: `~~${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 2,
        selectionTo: from + 2 + selText.length,
      };
    }
    if (selText.startsWith('~~') && selText.endsWith('~~') && selText.length >= 4) {
      const unwrapped = selText.slice(2, -2);
      return {
        text: unwrapped,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + unwrapped.length,
      };
    }
    if (beforeTwo === '~~' && afterTwo === '~~') {
      return {
        text: selText,
        replaceFrom: from - 2,
        replaceTo: to + 2,
        selectionFrom: from - 2,
        selectionTo: from - 2 + selText.length,
      };
    }

    return {
      text: `~~${selText}~~`,
      replaceFrom: from,
      replaceTo: to,
      selectionFrom: from + 2,
      selectionTo: from + 2 + selText.length,
    };
  }

  // 4. Equal (=): highlight wrapping
  if (key === '=') {
    if (beforeTwo === '==' && afterTwo !== '==') {
      return {
        text: `${selText}==`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + selText.length,
      };
    }
    if (afterTwo === '==' && beforeTwo !== '==') {
      return {
        text: `==${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 2,
        selectionTo: from + 2 + selText.length,
      };
    }
    if (selText.startsWith('==') && selText.endsWith('==') && selText.length >= 4) {
      const unwrapped = selText.slice(2, -2);
      return {
        text: unwrapped,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + unwrapped.length,
      };
    }
    if (beforeTwo === '==' && afterTwo === '==') {
      return {
        text: selText,
        replaceFrom: from - 2,
        replaceTo: to + 2,
        selectionFrom: from - 2,
        selectionTo: from - 2 + selText.length,
      };
    }

    return {
      text: `==${selText}==`,
      replaceFrom: from,
      replaceTo: to,
      selectionFrom: from + 2,
      selectionTo: from + 2 + selText.length,
    };
  }

  // 5. Brackets ([ / ]): wikilink escalation [text] -> [[text]] -> unwrap
  if (key === '[' || key === ']') {
    if (beforeOne === '[' && afterOne !== ']') {
      return {
        text: `${selText}]`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + selText.length,
      };
    }
    if (afterOne === ']' && beforeOne !== '[') {
      return {
        text: `[${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 1,
        selectionTo: from + 1 + selText.length,
      };
    }
    if (selText.startsWith('[[') && selText.endsWith(']]') && selText.length >= 4) {
      const unwrapped = selText.slice(2, -2);
      return {
        text: unwrapped,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + unwrapped.length,
      };
    }
    if (beforeTwo === '[[' && afterTwo === ']]') {
      return {
        text: selText,
        replaceFrom: from - 2,
        replaceTo: to + 2,
        selectionFrom: from - 2,
        selectionTo: from - 2 + selText.length,
      };
    }
    if (selText.startsWith('[') && selText.endsWith(']') && selText.length >= 2) {
      const inner = selText.slice(1, -1);
      return {
        text: `[[${inner}]]`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 2,
        selectionTo: from + 2 + inner.length,
      };
    }
    if (beforeOne === '[' && afterOne === ']') {
      return {
        text: `[[${selText}]]`,
        replaceFrom: from - 1,
        replaceTo: to + 1,
        selectionFrom: from - 1 + 2,
        selectionTo: from - 1 + 2 + selText.length,
      };
    }

    return {
      text: `[${selText}]`,
      replaceFrom: from,
      replaceTo: to,
      selectionFrom: from + 1,
      selectionTo: from + 1 + selText.length,
    };
  }

  // 6. Dollar ($): math wrapping
  if (key === '$') {
    if (beforeOne === '$' && afterOne !== '$') {
      return {
        text: `${selText}$`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + selText.length,
      };
    }
    if (afterOne === '$' && beforeOne !== '$') {
      return {
        text: `$${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 1,
        selectionTo: from + 1 + selText.length,
      };
    }
    if (selText.startsWith('$$') && selText.endsWith('$$') && selText.length >= 4) {
      const unwrapped = selText.slice(2, -2);
      return {
        text: unwrapped,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + unwrapped.length,
      };
    }
    if (selText.startsWith('$') && selText.endsWith('$') && selText.length >= 2) {
      const inner = selText.slice(1, -1);
      return {
        text: `$$${inner}$$`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 2,
        selectionTo: from + 2 + inner.length,
      };
    }

    return {
      text: `$${selText}$`,
      replaceFrom: from,
      replaceTo: to,
      selectionFrom: from + 1,
      selectionTo: from + 1 + selText.length,
    };
  }

  // 7. Generic bracket and quote pairs: (), {}, ""
  const BRACKETS: Record<string, { open: string; close: string }> = {
    '(': { open: '(', close: ')' },
    ')': { open: '(', close: ')' },
    '{': { open: '{', close: '}' },
    '}': { open: '{', close: '}' },
    '"': { open: '"', close: '"' },
    "'": { open: "'", close: "'" },
  };

  if (BRACKETS[key]) {
    const { open, close } = BRACKETS[key];
    if (beforeOne === open && afterOne !== close) {
      return {
        text: `${selText}${close}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from,
        selectionTo: from + selText.length,
      };
    }
    if (afterOne === close && beforeOne !== open) {
      return {
        text: `${open}${selText}`,
        replaceFrom: from,
        replaceTo: to,
        selectionFrom: from + 1,
        selectionTo: from + 1 + selText.length,
      };
    }
    if (beforeOne === open && afterOne === close) {
      return {
        text: selText,
        replaceFrom: from - 1,
        replaceTo: to + 1,
        selectionFrom: from - 1,
        selectionTo: from - 1 + selText.length,
      };
    }

    return {
      text: `${open}${selText}${close}`,
      replaceFrom: from,
      replaceTo: to,
      selectionFrom: from + 1,
      selectionTo: from + 1 + selText.length,
    };
  }

  return null;
}

/**
 * Computes the smart action when typing at a collapsed cursor.
 */
export function getCollapsedPairingAction(
  key: string,
  blockText: string,
  caretPosInBlock: number
): CollapsedPairResult {
  const textBefore = blockText.slice(0, caretPosInBlock);
  const textAfter = blockText.slice(caretPosInBlock);

  const beforeOne = textBefore.slice(-1);
  const beforeTwo = textBefore.slice(-2);
  const beforeThree = textBefore.slice(-3);

  const afterOne = textAfter.slice(0, 1);
  const afterTwo = textAfter.slice(0, 2);
  const afterThree = textAfter.slice(0, 3);

  // 1. Space pressed: check if user typed `*` at start of line for a bullet list
  if (key === ' ') {
    if (beforeOne === '*' && afterOne === '*') {
      // Check if text before that single `*` is only whitespace / line start
      const lineStartToAsterisk = textBefore.slice(0, -1);
      if (/^\s*$/.test(lineStartToAsterisk)) {
        // User typed `*` at line start then `Space`: delete trailing `*` and insert space
        return {
          action: 'bullet_space',
          deleteAfter: 1,
          insertText: ' ',
          caretDelta: 1,
        };
      }
    }
    return { action: 'none' };
  }

  // 2. Asterisk (*) smart actions
  if (key === '*') {
    // 2A. Symmetrical empty-pair escalation:
    // If sitting inside `**|**`, expand to `***|***`
    if (beforeTwo === '**' && afterTwo === '**' && beforeThree !== '***') {
      return {
        action: 'escalate',
        insertText: '**', // Insert 1 * before and 1 * after
        caretDelta: 1,
      };
    }
    // If sitting inside `*|*`, expand to `**|**`
    if (beforeOne === '*' && afterOne === '*' && beforeTwo !== '**') {
      return {
        action: 'escalate',
        insertText: '**',
        caretDelta: 1,
      };
    }

    // 2B. Step-over when content is present before cursor:
    // e.g. `*word|*` -> step over to `*word*|`
    if (afterOne === '*' && beforeOne !== '*') {
      return {
        action: 'step_over',
        caretDelta: 1,
      };
    }

    // 2C. Closing unmatched delimiter on line:
    // If user has `*word|` or `**word|`, typing `*` closes the open formatting
    if (hasUnclosedOpeningDelimiter(textBefore, '*')) {
      return {
        action: 'close_single',
        insertText: '*',
        caretDelta: 1,
      };
    }

    // 2D. Default: auto-pair `**`, cursor at 1
    return {
      action: 'pair',
      insertText: '**',
      caretDelta: 1,
    };
  }

  // 3. Backtick (`) smart actions
  if (key === '`') {
    // Escalation: inside ``|`` -> ```|```
    if (beforeOne === '`' && afterOne === '`' && beforeTwo !== '``') {
      return {
        action: 'escalate',
        insertText: '``',
        caretDelta: 1,
      };
    }
    if (afterOne === '`' && beforeOne !== '`') {
      return {
        action: 'step_over',
        caretDelta: 1,
      };
    }
    if (hasUnclosedOpeningDelimiter(textBefore, '`')) {
      return {
        action: 'close_single',
        insertText: '`',
        caretDelta: 1,
      };
    }

    return {
      action: 'pair',
      insertText: '``',
      caretDelta: 1,
    };
  }

  // 4. Equal (=) highlight smart actions
  if (key === '=') {
    if (beforeOne === '=' && afterOne === '=') {
      return {
        action: 'escalate',
        insertText: '==',
        caretDelta: 1,
      };
    }
    if (afterOne === '=' && beforeOne !== '=') {
      return {
        action: 'step_over',
        caretDelta: 1,
      };
    }
    if (beforeOne === '=') {
      // User typed second `=`: auto-pair to `==|==`
      return {
        action: 'pair',
        insertText: '===',
        caretDelta: 1,
      };
    }
    if (hasUnclosedOpeningDelimiter(textBefore, '=')) {
      return {
        action: 'close_single',
        insertText: '=',
        caretDelta: 1,
      };
    }
    return { action: 'none' };
  }

  // 5. Tilde (~) strikethrough smart actions
  if (key === '~') {
    if (beforeOne === '~' && afterOne === '~') {
      return {
        action: 'escalate',
        insertText: '~~',
        caretDelta: 1,
      };
    }
    if (afterOne === '~' && beforeOne !== '~') {
      return {
        action: 'step_over',
        caretDelta: 1,
      };
    }
    if (beforeOne === '~') {
      // User typed second `~`: auto-pair to `~~|~~`
      return {
        action: 'pair',
        insertText: '~~~',
        caretDelta: 1,
      };
    }
    if (hasUnclosedOpeningDelimiter(textBefore, '~')) {
      return {
        action: 'close_single',
        insertText: '~',
        caretDelta: 1,
      };
    }
    return { action: 'none' };
  }

  // 6. Dollar ($) math smart actions
  if (key === '$') {
    if (beforeOne === '$' && afterOne === '$') {
      return {
        action: 'escalate',
        insertText: '$$',
        caretDelta: 1,
      };
    }
    if (afterOne === '$' && beforeOne !== '$') {
      return {
        action: 'step_over',
        caretDelta: 1,
      };
    }
    if (hasUnclosedOpeningDelimiter(textBefore, '$')) {
      return {
        action: 'close_single',
        insertText: '$',
        caretDelta: 1,
      };
    }
    return {
      action: 'pair',
      insertText: '$$',
      caretDelta: 1,
    };
  }

  // 7. Brackets and quotes
  const BRACKETS: Record<string, string> = {
    '[': ']',
    '(': ')',
    '{': '}',
    '"': '"',
  };

  const CLOSING_CHARS: Record<string, string> = {
    ']': '[',
    ')': '(',
    '}': '{',
    '"': '"',
  };

  // Step-over closing char
  if (CLOSING_CHARS[key] && key === afterOne) {
    return {
      action: 'step_over',
      caretDelta: 1,
    };
  }

  // Escalation for `[[|]]`
  if (key === '[' && beforeOne === '[' && afterOne === ']') {
    return {
      action: 'escalate',
      insertText: '[]',
      caretDelta: 1,
    };
  }

  // Single quote (') smart action: contractions vs quotes
  if (key === "'") {
    if (afterOne === "'" && beforeOne !== "'") {
      return {
        action: 'step_over',
        caretDelta: 1,
      };
    }
    // If preceded by an alphanumeric character, it's an apostrophe/contraction (don't, it's, etc.)
    if (/[a-zA-Z0-9]$/.test(textBefore)) {
      return {
        action: 'close_single',
        insertText: "'",
        caretDelta: 1,
      };
    }
    // If there's an unclosed single quote earlier on the line, close it
    if (hasUnclosedOpeningDelimiter(textBefore, "'")) {
      return {
        action: 'close_single',
        insertText: "'",
        caretDelta: 1,
      };
    }
    // If preceded by whitespace, start of line, or opening bracket/symbol, auto-pair
    if (/(^|[\s([{<=])$/.test(textBefore)) {
      return {
        action: 'pair',
        insertText: "''",
        caretDelta: 1,
      };
    }
    return {
      action: 'close_single',
      insertText: "'",
      caretDelta: 1,
    };
  }

  // Closing unclosed bracket/quote without pairing
  if (CLOSING_CHARS[key]) {
    if (hasUnclosedOpeningDelimiter(textBefore, key)) {
      return {
        action: 'close_single',
        insertText: key,
        caretDelta: 1,
      };
    }
  }

  // Open pair
  if (BRACKETS[key]) {
    return {
      action: 'pair',
      insertText: `${key}${BRACKETS[key]}`,
      caretDelta: 1,
    };
  }

  return { action: 'none' };
}

/**
 * Computes symmetrical contraction for Backspace deletion.
 */
export function getSmartBackspaceAction(
  blockText: string,
  caretPosInBlock: number
): { deleteBefore: number; deleteAfter: number } | null {
  const textBefore = blockText.slice(0, caretPosInBlock);
  const textAfter = blockText.slice(caretPosInBlock);

  const beforeOne = textBefore.slice(-1);
  const beforeTwo = textBefore.slice(-2);
  const beforeThree = textBefore.slice(-3);

  const afterOne = textAfter.slice(0, 1);
  const afterTwo = textAfter.slice(0, 2);
  const afterThree = textAfter.slice(0, 3);

  // 1. Triple asterisks: `***|***` contracts to `**|**`
  if (beforeThree === '***' && afterThree === '***') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }

  // 2. Double asterisks: `**|**` contracts to `*|*`
  if (beforeTwo === '**' && afterTwo === '**') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }

  // 3. Single asterisk: `*|*` deletes both to `|`
  if (beforeOne === '*' && afterOne === '*') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }

  // 4. Wikilinks: `[[|]]` contracts to `[|]`
  if (beforeTwo === '[[' && afterTwo === ']]') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }
  if (beforeOne === '[' && afterOne === ']') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }

  // 5. Math: `$$|$$` contracts to `$|$`
  if (beforeTwo === '$$' && afterTwo === '$$') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }
  if (beforeOne === '$' && afterOne === '$') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }

  // 6. Highlight: `==|==` contracts to `=|=`
  if (beforeTwo === '==' && afterTwo === '==') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }
  if (beforeOne === '=' && afterOne === '=') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }

  // 7. Strikethrough: `~~|~~` contracts to `~|~`
  if (beforeTwo === '~~' && afterTwo === '~~') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }
  if (beforeOne === '~' && afterOne === '~') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }

  // 8. Backtick code: ```|``` or ``|`` or `|`
  if (beforeThree === '```' && afterThree === '```') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }
  if (beforeTwo === '``' && afterTwo === '``') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }
  if (beforeOne === '`' && afterOne === '`') {
    return { deleteBefore: 1, deleteAfter: 1 };
  }

  // 9. Standard bracket/quote pairs: `()`, `{}`, `""`, `''`
  const BRACKET_PAIRS: Record<string, string> = {
    '(': ')',
    '{': '}',
    '"': '"',
    "'": "'",
  };
  if (BRACKET_PAIRS[beforeOne] === afterOne) {
    return { deleteBefore: 1, deleteAfter: 1 };
  }

  return null;
}

/**
 * Calculates the number of characters to jump forward when pressing Tab immediately
 * before a closing delimiter. Returns 0 if not sitting before a closing delimiter.
 */
export function getTabOutDelta(textAfter: string): number {
  if (!textAfter) return 0;
  if (
    textAfter.startsWith('**') ||
    textAfter.startsWith(']]') ||
    textAfter.startsWith('$$') ||
    textAfter.startsWith('==') ||
    textAfter.startsWith('~~') ||
    textAfter.startsWith('```')
  ) {
    return textAfter.startsWith('```') ? 3 : 2;
  }
  const SINGLE_DELIMITERS = new Set([')', ']', '}', '"', "'", '*', '`', '$', '>']);
  if (SINGLE_DELIMITERS.has(textAfter.charAt(0))) {
    return 1;
  }
  return 0;
}

export interface CodeFenceExpandResult {
  indent: string;
  lang: string;
}

/**
 * Matches a code fence trigger line such as ``` or ```typescript.
 */
export function matchCodeFenceLine(lineText: string): CodeFenceExpandResult | null {
  const match = lineText.match(/^([ \t]*)```([a-zA-Z0-9_-]*)$/);
  if (match) {
    return { indent: match[1], lang: match[2] };
  }
  return null;
}

export interface BlockquoteLineResult {
  marker: string;
  content: string;
  isEmpty: boolean;
}

/**
 * Matches a markdown blockquote line such as `> Quote text` or empty `> `.
 */
export function matchBlockquoteLine(lineText: string): BlockquoteLineResult | null {
  const match = lineText.match(/^([ \t]*>+)( *)(.*)$/);
  if (match) {
    const marker = match[1];
    const content = match[3];
    return {
      marker,
      content,
      isEmpty: content.trim() === '',
    };
  }
  return null;
}

export interface ListPrefixInfo {
  leadingIndent: string;
  openDelim: string;
  marker: string;
  closeDelim: string;
  spaceAfter: string;
  content: string;
  markerStartInLine: number;
  markerEndInLine: number;
  isBullet: boolean;
  prefixLen: number;
}

/**
 * Matches a list prefix in a line of markdown, supporting both standard prefixes (e.g. "1. ", "- ", "a. ")
 * and bolded/italicized prefixes (e.g. "**1. ", "**1.** ", "**1. **", "**- ", "**-** ").
 * Ensures numbers and list markers remain correctly identified and dimmed even when wrapped in bold syntax.
 */
export function matchLineListPrefix(lineText: string): ListPrefixInfo | null {
  // 1. Wrapped marker: bolded or styled
  // Case A: Marker followed by closing stars then space: e.g. "**1.** " or "**-** "
  // Case B: Marker followed by space then closing stars: e.g. "**1. **" or "**- **"
  // Case C: Marker followed by space (open bold): e.g. "**1. foo" or "**- foo"
  const wrappedMatch = lineText.match(
    /^([ \t]*)(\*{1,3})(\d+\.|[a-zA-Z]{1,2}\.|[-+])(?:(\2)( +)|( +)(\2)|( +))(.*)$/
  );
  if (wrappedMatch) {
    const leadingIndent = wrappedMatch[1];
    const openDelim = wrappedMatch[2];
    const marker = wrappedMatch[3];
    const closeDelim = wrappedMatch[4] || wrappedMatch[7] || '';
    const spaceAfter = wrappedMatch[5] || wrappedMatch[6] || wrappedMatch[8] || ' ';
    const content = wrappedMatch[9] ?? '';
    const markerStartInLine = leadingIndent.length + openDelim.length;
    const markerEndInLine = markerStartInLine + marker.length;
    const isBullet = /^[-+]$/.test(marker);
    const prefixLen =
      leadingIndent.length +
      openDelim.length +
      marker.length +
      (closeDelim ? closeDelim.length : 0) +
      spaceAfter.length;
    return {
      leadingIndent,
      openDelim,
      marker,
      closeDelim,
      spaceAfter,
      content,
      markerStartInLine,
      markerEndInLine,
      isBullet,
      prefixLen,
    };
  }

  // 2. Standard unstyled list prefix: e.g. "1. ", "a. ", "- ", "* ", "+ "
  const stdMatch = lineText.match(/^([ \t]*)(\d+\.|[a-zA-Z]{1,2}\.|[-*+])( +)(.*)$/);
  if (stdMatch) {
    const leadingIndent = stdMatch[1];
    const marker = stdMatch[2];
    const spaceAfter = stdMatch[3];
    const content = stdMatch[4] ?? '';
    const markerStartInLine = leadingIndent.length;
    const markerEndInLine = markerStartInLine + marker.length;
    const isBullet = /^[-*+]$/.test(marker);
    const prefixLen = leadingIndent.length + marker.length + spaceAfter.length;
    return {
      leadingIndent,
      openDelim: '',
      marker,
      closeDelim: '',
      spaceAfter,
      content,
      markerStartInLine,
      markerEndInLine,
      isBullet,
      prefixLen,
    };
  }

  return null;
}

