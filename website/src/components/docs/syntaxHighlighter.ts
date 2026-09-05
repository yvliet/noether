/**
 * Lightweight, zero-dependency syntax highlighter for Flint documentation.
 * Tailored for TypeScript, TSX, JavaScript, JSON, YAML, SQL, Shell, and Markdown.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const TS_KEYWORDS = new Set([
  'import', 'export', 'default', 'from', 'as', 'const', 'let', 'var',
  'function', 'class', 'interface', 'type', 'enum', 'extends', 'implements',
  'public', 'private', 'protected', 'readonly', 'static', 'override',
  'async', 'await', 'return', 'yield', 'new', 'this', 'super',
  'if', 'else', 'switch', 'case', 'break', 'continue',
  'for', 'while', 'do', 'in', 'of', 'try', 'catch', 'finally', 'throw',
  'typeof', 'instanceof', 'void', 'delete', 'debugger',
]);

const TS_BUILTIN_TYPES = new Set([
  'string', 'number', 'boolean', 'any', 'unknown', 'never', 'void',
  'null', 'undefined', 'symbol', 'bigint', 'object', 'Record', 'Array',
  'Promise', 'Partial', 'Omit', 'Pick', 'Required', 'Readonly', 'Extract',
  'Exclude', 'NonNullable', 'Parameters', 'ReturnType', 'InstanceType',
  'React', 'ReactNode', 'FC', 'Component', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef',
  'Extension', 'ExtensionManifest', 'FlintApp',
]);

const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set',
  'delete', 'create', 'table', 'drop', 'alter', 'add', 'column', 'primary',
  'key', 'foreign', 'references', 'index', 'unique', 'distinct', 'join',
  'left', 'right', 'inner', 'outer', 'on', 'group', 'by', 'order', 'having',
  'limit', 'offset', 'and', 'or', 'not', 'in', 'is', 'null', 'like', 'as',
]);

export function highlightCode(code: string, lang = 'typescript'): string {
  const language = (lang || 'typescript').toLowerCase().trim();

  const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#(?![\w-]|[\da-fA-F]{3,8})[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|<\/?[A-Za-z0-9_.-]+|\/?=>|===|!==|==|!=|<=|>=|\+\+|--|\&\&|\|\||[a-zA-Z_$][a-zA-Z0-9_$]*|\b\d+(?:\.\d+)?\b|[^\s\w]|\s+)/g;

  let html = '';
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    const token = match[0];

    // 1. Comments
    if (token.startsWith('//') || token.startsWith('/*') || (token.startsWith('#') && (language === 'shell' || language === 'bash' || language === 'sh' || language === 'yaml' || language === 'yml'))) {
      html += `<span class="text-[#8b949e] italic">${escapeHtml(token)}</span>`;
      continue;
    }

    // 2. String Literals
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'")) ||
      (token.startsWith('`') && token.endsWith('`'))
    ) {
      // In JSON or object key positions, color as key (cyan #79c0ff)
      const rest = code.slice(tokenRegex.lastIndex);
      if (/^\s*:/.test(rest)) {
        html += `<span class="text-[#79c0ff]">${escapeHtml(token)}</span>`;
        continue;
      }
      html += `<span class="text-[#7ee787]">${escapeHtml(token)}</span>`;
      continue;
    }

    // 3. Numbers
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      html += `<span class="text-[#ffa657]">${escapeHtml(token)}</span>`;
      continue;
    }

    // 4. Booleans / Null / Undefined
    if (token === 'true' || token === 'false') {
      html += `<span class="text-[#ff7b72] font-semibold">${escapeHtml(token)}</span>`;
      continue;
    }
    if (token === 'null' || token === 'undefined') {
      html += `<span class="text-[#ff7b72]">${escapeHtml(token)}</span>`;
      continue;
    }

    // 5. JSX / HTML Tags
    if (token.startsWith('<') && !token.startsWith('<=') && !token.startsWith('<<')) {
      const isClosing = token.startsWith('</');
      const tagName = isClosing ? token.slice(2) : token.slice(1);
      if (/^[A-Za-z]/.test(tagName)) {
        html += `&lt;${isClosing ? '/' : ''}<span class="text-[#7ee787]">${escapeHtml(tagName)}</span>`;
        continue;
      }
    }
    if (token === '/>' || token === '>') {
      html += `<span class="text-[#8b949e]">${escapeHtml(token)}</span>`;
      continue;
    }

    // 6. Keywords & Identifiers
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) {
      const lower = token.toLowerCase();

      if (language === 'sql' && SQL_KEYWORDS.has(lower)) {
        html += `<span class="text-[#ff7b72] font-semibold">${escapeHtml(token.toUpperCase())}</span>`;
        continue;
      }

      if (TS_KEYWORDS.has(token)) {
        html += `<span class="text-[#ff7b72] font-medium">${escapeHtml(token)}</span>`;
        continue;
      }

      // Class names and types: warm yellow matching Image 1
      if (TS_BUILTIN_TYPES.has(token) || /^[A-Z][a-zA-Z0-9_$]*$/.test(token)) {
        html += `<span class="text-[#e5c07b] font-normal">${escapeHtml(token)}</span>`;
        continue;
      }

      const rest = code.slice(tokenRegex.lastIndex);
      const nextNonWs = rest.match(/^\s*([^\s])/);

      // Functions and method calls: cyan #79c0ff matching Image 1
      if (nextNonWs && nextNonWs[1] === '(') {
        html += `<span class="text-[#79c0ff]">${escapeHtml(token)}</span>`;
        continue;
      }

      if (nextNonWs && nextNonWs[1] === ':' && !code.slice(0, match.index).trim().endsWith('?')) {
        html += `<span class="text-[#79c0ff]">${escapeHtml(token)}</span>`;
        continue;
      }

      html += `<span class="text-[#e6edf3]">${escapeHtml(token)}</span>`;
      continue;
    }

    // 7. Operators & Arrow functions
    if (token === '=>' || token === '===' || token === '!==' || token === '&&' || token === '||') {
      html += `<span class="text-[#ff7b72]">${escapeHtml(token)}</span>`;
      continue;
    }

    // 8. Fallback / Plain text
    html += escapeHtml(token);
  }

  return html;
}
