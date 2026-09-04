/**
 * Visited links tracking utility for Flint.
 * Maintains a persistent set of visited external URLs and wikilink targets
 * so links accurately render visited styling (e.g. classic browser purple).
 */

const STORAGE_KEY = 'flint_visited_links';
const MAX_STORED_ENTRIES = 5000;

let visitedSet: Set<string> | null = null;
const listeners = new Set<() => void>();
let saveTimeout: any = null;

function normalizeTarget(target: string): string {
  if (!target) return '';
  let clean = target.trim();
  // Strip trailing slashes for standard HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(clean)) {
    clean = clean.replace(/\/+$/, '');
  }
  return clean;
}

function initVisitedSet(): Set<string> {
  if (visitedSet !== null) return visitedSet;
  visitedSet = new Set<string>();

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (typeof item === 'string' && item) {
              visitedSet.add(normalizeTarget(item));
            }
          }
        }
      }
    } catch (e) {
      console.warn('[visitedLinks] Failed to load visited links from localStorage', e);
    }
  }

  return visitedSet;
}

function scheduleSave(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    try {
      if (!visitedSet) return;
      const array = Array.from(visitedSet).slice(-MAX_STORED_ENTRIES);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
    } catch (e) {
      console.warn('[visitedLinks] Failed to save visited links to localStorage', e);
    }
  }, 300);
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (e) {
      console.error('[visitedLinks] Listener error', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('flint:visited-links-changed'));
  }
}

/**
 * Mark a URL or wikilink target as visited.
 */
export function markLinkVisited(rawTarget: string): void {
  if (!rawTarget) return;
  const target = normalizeTarget(rawTarget);
  if (!target) return;

  const set = initVisitedSet();
  if (set.has(target)) return;

  set.add(target);
  scheduleSave();
  notifyListeners();
}

/**
 * Check if a URL or wikilink target has been visited.
 */
export function isLinkVisited(rawTarget: string): boolean {
  if (!rawTarget) return false;
  const target = normalizeTarget(rawTarget);
  if (!target) return false;

  const set = initVisitedSet();
  return set.has(target);
}

/**
 * Clear all visited link history.
 */
export function clearVisitedLinks(): void {
  const set = initVisitedSet();
  set.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  notifyListeners();
}

/**
 * Subscribe to changes in visited links.
 */
export function subscribeVisitedLinks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
