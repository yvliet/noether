export interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Parses raw git unified diff output into structured lines for display.
 */
export function parseGitDiff(diffText: string): DiffLine[] {
  if (!diffText || !diffText.trim()) return [];

  const lines = diffText.split('\n');
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse chunk header: @@ -1,5 +1,6 @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ type: 'header', content: line });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      result.push({
        type: 'add',
        content: line.slice(1),
        newLineNumber: newLine++,
      });
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.push({
        type: 'remove',
        content: line.slice(1),
        oldLineNumber: oldLine++,
      });
    } else if (line.startsWith(' ')) {
      result.push({
        type: 'context',
        content: line.slice(1),
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      });
    } else if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
      // Skip git metadata headers for a cleaner visual look
      continue;
    } else if (line.trim().length > 0) {
      result.push({ type: 'context', content: line });
    }
  }

  return result;
}

/**
 * Fast line-by-line diff algorithm to compare two arbitrary texts.
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  const result: DiffLine[] = [];
  const oldLen = oldLines.length;
  const newLen = newLines.length;

  let i = 0;
  let j = 0;

  while (i < oldLen || j < newLen) {
    if (i < oldLen && j < newLen && oldLines[i] === newLines[j]) {
      result.push({
        type: 'context',
        content: oldLines[i],
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
      });
      i++;
      j++;
    } else if (j < newLen && (i >= oldLen || !oldLines.includes(newLines[j]))) {
      result.push({
        type: 'add',
        content: newLines[j],
        newLineNumber: j + 1,
      });
      j++;
    } else if (i < oldLen && (j >= newLen || !newLines.includes(oldLines[i]))) {
      result.push({
        type: 'remove',
        content: oldLines[i],
        oldLineNumber: i + 1,
      });
      i++;
    } else {
      // Lines differ: record removal and addition
      if (i < oldLen) {
        result.push({
          type: 'remove',
          content: oldLines[i],
          oldLineNumber: i + 1,
        });
        i++;
      }
      if (j < newLen) {
        result.push({
          type: 'add',
          content: newLines[j],
          newLineNumber: j + 1,
        });
        j++;
      }
    }
  }

  return result;
}

/**
 * Converts a millisecond timestamp into warm, friendly relative time.
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return 'Earlier';

  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 30) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  if (diffDays < 7) return `${diffDays}d ago, ${timeStr}`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
