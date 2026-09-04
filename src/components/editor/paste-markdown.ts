/**
 * HTML-to-Markdown clipboard paste transformation engine for Flint.
 *
 * WHY THIS, NOT THAT:
 * Flint uses a pure Markdown architecture where all styling (bold, italic, links)
 * is represented as Markdown text tokens decorated by LivePreviewSyntax.
 * When pasting rich text from web browsers (Wikipedia, articles), Google Docs, or Word,
 * browsers provide an HTML clipboard representation containing <a>, <b>, <strong>, <i>, <em>, etc.
 * Without transforming HTML into Markdown, links are pasted as ProseMirror link marks (which lack
 * []() syntax and bypass LivePreviewSyntax orange styling), and bold/italic marks are dropped
 * because StarterKit disables native marks in favor of Markdown asterisks.
 *
 * Transforming HTML into native Markdown before ProseMirror parses it guarantees:
 * 1. Links are converted to [text](url) -> styled with orange accent color and trailing icon, editable via [].
 * 2. Bold and italic are converted to **text** and *text* -> styled with LivePreviewSyntax.
 * 3. Wikipedia footnote citations (<sup class="reference">) are cleanly converted to [^1].
 * 4. List items (<ul>, <ol>) are converted into Markdown list prefixes (- item, 1. item).
 * 5. Relative Wikipedia links (/wiki/...) are resolved to absolute URLs.
 */

/**
 * Transforms clipboard HTML into markdown-enhanced HTML suitable for Flint's editor.
 */
export function transformPastedHtmlToMarkdown(html: string): string {
  if (!html || typeof html !== 'string') return html;

  try {
    // Normalize non-breaking spaces (&nbsp; and \u00A0) into standard breakable spaces.
    // Wikipedia and web browsers insert &nbsp; around links and punctuation, which glues
    // words together into unbreakable blocks and forces the browser to wrap prematurely.
    const normalizedHtml = html.replace(/&nbsp;|\u00a0/g, ' ');

    const parser = new DOMParser();
    const doc = parser.parseFromString(normalizedHtml, 'text/html');
    if (!doc || !doc.body) return html;

    // Check if there is any rich formatting to convert
    const hasRichFormatting = doc.body.querySelector(
      'a[href], b, strong, i, em, s, del, strike, code, mark, ul, ol, sup.reference, [style*="font-weight"], [style*="font-style"], [style*="text-decoration"]'
    );

    if (!hasRichFormatting) {
      return html;
    }

    // 1. Clean up known web clutter: Wikipedia edit buttons, script/style, non-printable elements
    doc.body
      .querySelectorAll('.mw-editsection, .noprint, style, script, noscript, svg')
      .forEach((el) => el.remove());

    // 2. Strip Wikipedia citation footnotes: <sup class="reference">, sup[id^="cite_ref"], a[href^="#cite_note"]
    doc.body
      .querySelectorAll('sup.reference, sup[id^="cite_ref"], a[href^="#cite_note"], a[href^="#cite_ref"], .reference')
      .forEach((el) => el.remove());

    // Detect base URL for relative link resolution
    const baseEl = doc.querySelector('base');
    const baseHref = baseEl?.getAttribute('href') || null;

    /**
     * Helper to wrap text with markdown markers while respecting leading/trailing whitespace.
     * Prevents invalid markdown like `** word **` by turning it into ` **word** `.
     */
    const wrapMarkdown = (text: string, marker: string): string => {
      if (!text) return '';
      const leading = text.match(/^\s*/)?.[0] || '';
      const trailing = text.match(/\s*$/)?.[0] || '';
      const core = text.trim();
      if (!core) return text;
      return `${leading}${marker}${core}${marker}${trailing}`;
    };

    /**
     * Recursively processes inline elements into markdown syntax.
     */
    function processInline(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent || '').replace(/\u00a0/g, ' ');
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Skip non-visible elements
      if (['script', 'style', 'noscript', 'meta', 'svg'].includes(tag)) {
        return '';
      }

      // Preserve <br>
      if (tag === 'br') {
        return '<br>';
      }

      // Check inline styling
      const fontWeight = el.style.fontWeight || '';
      const isBoldStyle = /bold|[6-9]00/i.test(fontWeight);
      const fontStyle = el.style.fontStyle || '';
      const isItalicStyle = /italic/i.test(fontStyle);
      const textDecoration = el.style.textDecoration || '';
      const isStrikeStyle = /line-through/i.test(textDecoration);

      // Process children first
      let childContent = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        childContent += processInline(el.childNodes[i]);
      }

      // 1. Inline code (when not in a pre block)
      if (tag === 'code' && el.parentElement?.tagName.toLowerCase() !== 'pre') {
        return wrapMarkdown(childContent, '`');
      }

      // Strip superscript footnote citations like <sup>[1]</sup> or <sup>1</sup>
      if (tag === 'sup') {
        const text = childContent.trim();
        if (/^\[?\d+\]?$/.test(text) || el.classList.contains('reference') || el.id?.startsWith('cite_ref')) {
          return '';
        }
      }

      // 2. Links
      if (tag === 'a') {
        let rawHref = el.getAttribute('href')?.trim() || '';
        // Strip Wikipedia citation anchors
        if (rawHref.startsWith('#cite_note') || rawHref.startsWith('#cite_ref')) {
          return '';
        }
        if (rawHref && rawHref !== '#' && !rawHref.startsWith('javascript:')) {
          // Resolve relative URLs (e.g. /wiki/Religion -> https://en.wikipedia.org/wiki/Religion)
          if (rawHref.startsWith('/') || (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawHref) && !rawHref.startsWith('#'))) {
            if (baseHref) {
              try {
                rawHref = new URL(rawHref, baseHref).href;
              } catch (e) {}
            } else if (rawHref.startsWith('/wiki/')) {
              rawHref = `https://en.wikipedia.org${rawHref}`;
            }
          }

          const leading = childContent.match(/^\s*/)?.[0] || '';
          const trailing = childContent.match(/\s*$/)?.[0] || '';
          const core = childContent.replace(/[\r\n\t]+/g, ' ').trim();
          if (core) {
            childContent = `${leading}[${core}](${rawHref})${trailing}`;
          } else {
            childContent = `[${rawHref}](${rawHref})`;
          }
        }
      }

      // 3. Bold & Italic
      const isBold = tag === 'b' || tag === 'strong' || isBoldStyle;
      const isItalic = tag === 'i' || tag === 'em' || isItalicStyle;

      if (isBold && isItalic) {
        const trimmed = childContent.trim();
        if (!trimmed.startsWith('***') || !trimmed.endsWith('***')) {
          childContent = wrapMarkdown(childContent, '***');
        }
      } else if (isBold) {
        const trimmed = childContent.trim();
        if (!trimmed.startsWith('**') || !trimmed.endsWith('**')) {
          childContent = wrapMarkdown(childContent, '**');
        }
      } else if (isItalic) {
        const trimmed = childContent.trim();
        if (!trimmed.startsWith('*') || !trimmed.endsWith('*')) {
          childContent = wrapMarkdown(childContent, '*');
        }
      }

      // 4. Strikethrough
      if (tag === 's' || tag === 'del' || tag === 'strike' || isStrikeStyle) {
        const trimmed = childContent.trim();
        if (!trimmed.startsWith('~~') || !trimmed.endsWith('~~')) {
          childContent = wrapMarkdown(childContent, '~~');
        }
      }

      // 5. Highlight / Mark
      if (tag === 'mark') {
        childContent = wrapMarkdown(childContent, '==');
      }

      return childContent;
    }

    /**
     * Recursively processes block-level elements into markdown paragraphs and headers.
     */
    function processBlock(node: Node, listPrefix = ''): string {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent || '').replace(/\u00a0/g, ' ').trim();
        return text ? `<p>${listPrefix}${text}</p>` : '';
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Headings
      if (/^h[1-6]$/.test(tag)) {
        const content = processInline(el).trim();
        const level = parseInt(tag[1], 10);
        if (level <= 3) {
          return `<h${level}>${content}</h${level}>`;
        } else {
          return `<p>${'#'.repeat(level)} ${content}</p>`;
        }
      }

      // Preformatted code
      if (tag === 'pre') {
        return `<pre><code>${el.textContent || ''}</code></pre>`;
      }

      // Blockquotes
      if (tag === 'blockquote') {
        const content = processInline(el).trim();
        return `<blockquote><p>${content}</p></blockquote>`;
      }

      // Bullet lists
      if (tag === 'ul') {
        let res = '';
        for (let i = 0; i < el.children.length; i++) {
          const child = el.children[i];
          if (child.tagName.toLowerCase() === 'li') {
            const itemText = processInline(child).trim();
            res += `<p>- ${itemText}</p>`;
          }
        }
        return res;
      }

      // Numbered lists
      if (tag === 'ol') {
        let res = '';
        let num = 1;
        for (let i = 0; i < el.children.length; i++) {
          const child = el.children[i];
          if (child.tagName.toLowerCase() === 'li') {
            const itemText = processInline(child).trim();
            res += `<p>${num++}. ${itemText}</p>`;
          }
        }
        return res;
      }

      // Table preservation: keep table structures intact while processing inline contents of cells
      if (tag === 'table' || tag === 'tbody' || tag === 'thead' || tag === 'tr') {
        let inner = '';
        for (let i = 0; i < el.childNodes.length; i++) {
          inner += processBlock(el.childNodes[i]);
        }
        return `<${tag}>${inner}</${tag}>`;
      }

      if (tag === 'th' || tag === 'td') {
        const content = processInline(el).trim();
        return `<${tag}>${content}</${tag}>`;
      }

      // Block container elements (p, div, section, article, main)
      const isBlockContainer = ['div', 'section', 'article', 'main', 'p'].includes(tag);
      if (isBlockContainer) {
        const hasBlockChildren = Array.from(el.children).some((c) =>
          ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'table', 'pre'].includes(
            c.tagName.toLowerCase()
          )
        );

        if (hasBlockChildren) {
          let res = '';
          for (let i = 0; i < el.childNodes.length; i++) {
            res += processBlock(el.childNodes[i]);
          }
          return res;
        }

        const content = processInline(el).trim();
        return content ? `<p>${listPrefix}${content}</p>` : '';
      }

      // Inline element at root level
      const inlineContent = processInline(el).trim();
      return inlineContent ? `<p>${listPrefix}${inlineContent}</p>` : '';
    }

    // Check if the snippet contains any block-level tags
    const hasBlockTags = doc.body.querySelector(
      'p, div, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, table, pre'
    );

    // If pure inline text/elements without block wrappers, return inline markdown text
    if (!hasBlockTags) {
      let inlineResult = '';
      for (let i = 0; i < doc.body.childNodes.length; i++) {
        inlineResult += processInline(doc.body.childNodes[i]);
      }
      return inlineResult || html;
    }

    // Otherwise, convert blocks cleanly
    let resultHtml = '';
    for (let i = 0; i < doc.body.childNodes.length; i++) {
      resultHtml += processBlock(doc.body.childNodes[i]);
    }

    return resultHtml || html;
  } catch (e) {
    console.warn('[paste-markdown] Error transforming pasted HTML', e);
    return html;
  }
}
