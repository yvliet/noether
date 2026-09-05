/**
 * @module CopilotSessionHelper
 * @description
 * Background icon discovery and categorization helper for Copilot for Flint sessions.
 * On first message in a session, analyzes the user prompt using heuristic rule evaluation
 * and queries the active provider model in the background to pick a representative HugeIcon.
 * Uses dynamic icon loading via @hugeicons/core-free-icons/loader to resolve icons on demand.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import { useCopilotStore } from './copilotStore';
import { PROVIDER_CATALOG } from './copilotModels';

const HEURISTIC_MAP: Array<{ regex: RegExp; icon: string }> = [
  { regex: /\b(code|coding|function|debug|error|bug|script|const|let|var|class|interface|type|react|component|python|rust|css|html|tailwind|sql|query|endpoint|api|json|git|repo|pr|commit)\b/i, icon: 'SourceCodeIcon' },
  { regex: /\b(read|book|chapter|summary|summarize|study|paper|article|literature|learn|history|reading|novel)\b/i, icon: 'BookOpen01Icon' },
  { regex: /\b(think|why|philosophy|theory|concept|explain|understand|reason|brain|logic|idea|mind|psychology|ponder)\b/i, icon: 'Brain02Icon' },
  { regex: /\b(find|search|where|look|lookup|locate|vault|backlink|query|discover)\b/i, icon: 'Search01Icon' },
  { regex: /\b(database|sql|sqlite|schema|table|store|persist|storage|row|column|index)\b/i, icon: 'Database01Icon' },
  { regex: /\b(write|draft|essay|letter|blog|post|article|compose|poem|story|edit|review|rewrite|prose)\b/i, icon: 'Edit02Icon' },
  { regex: /\b(todo|task|plan|checklist|action|goal|step|schedule|priority|habit|roadmap)\b/i, icon: 'CheckmarkSquare02Icon' },
  { regex: /\b(design|color|theme|ui|ux|style|art|css|layout|palette|gradient|font)\b/i, icon: 'PaletteIcon' },
  { regex: /\b(date|calendar|event|meeting|deadline|timeline|week|month|year|today|tomorrow|schedule)\b/i, icon: 'Calendar01Icon' },
  { regex: /\b(world|web|url|http|network|internet|translate|language|global|site|domain)\b/i, icon: 'GlobeIcon' },
  { regex: /\b(secure|password|auth|key|secret|encrypt|crypto|token|permission|credential)\b/i, icon: 'Key01Icon' },
  { regex: /\b(solve|puzzle|riddle|game|strategy|math|calculate|count|formula|number|equation)\b/i, icon: 'PuzzleIcon' },
  { regex: /\b(sparkle|magic|creative|brainstorm|inspire|awesome|cool|fun|imagine)\b/i, icon: 'SparklesIcon' },
  { regex: /\b(note|memo|scratchpad|vault|journal|diary|log)\b/i, icon: 'StickyNote02Icon' },
  { regex: /\b(folder|organize|directory|sort|structure|archive|tree)\b/i, icon: 'Folder01Icon' },
  { regex: /\b(tag|category|label|classify|taxonomy)\b/i, icon: 'Tag01Icon' },
];

export const ALLOWED_SESSION_ICONS = new Set([
  'ChatIcon',
  'SourceCodeIcon',
  'BookOpen01Icon',
  'Brain02Icon',
  'Search01Icon',
  'Database01Icon',
  'SparklesIcon',
  'Folder01Icon',
  'Tag01Icon',
  'Calendar01Icon',
  'PaletteIcon',
  'GlobeIcon',
  'Key01Icon',
  'PuzzleIcon',
  'Edit02Icon',
  'CheckmarkSquare02Icon',
  'StickyNote02Icon',
  'File01Icon',
  'ArrowUpDownIcon',
  'HelpCircleIcon',
]);

export function inferHeuristicIcon(text: string): string | null {
  for (const item of HEURISTIC_MAP) {
    if (item.regex.test(text)) {
      return item.icon;
    }
  }
  return null;
}

/**
 * Picks an appropriate icon for a session in the background.
 * First applies an instant heuristic match if one exists.
 * Then calls the active AI model in the background to refine the chosen icon.
 */
export async function pickSessionIconInBackground(
  sessionId: string,
  userPrompt: string
): Promise<void> {
  const store = useCopilotStore.getState();

  // 1. Instant heuristic categorization
  const heuristic = inferHeuristicIcon(userPrompt);
  if (heuristic && heuristic !== 'ChatIcon') {
    store.updateSessionIcon(sessionId, heuristic);
  }

  // 2. Query active AI model in the background
  const provider = store.provider;
  if (!provider) return;
  const apiKey = store.apiKeys[provider];
  if (!apiKey && provider !== 'custom') return;

  try {
    const meta = PROVIDER_CATALOG[provider];
    const model = store.models[provider] || meta.defaultModel;
    const prompt = `Choose the single best HugeIcon name representing this chat topic: "${userPrompt.slice(0, 140)}".
Options: [ChatIcon, SourceCodeIcon, BookOpen01Icon, Brain02Icon, Search01Icon, Database01Icon, SparklesIcon, Folder01Icon, Tag01Icon, Calendar01Icon, PaletteIcon, GlobeIcon, Key01Icon, PuzzleIcon, Edit02Icon, CheckmarkSquare02Icon, StickyNote02Icon, File01Icon, ArrowUpDownIcon, HelpCircleIcon].
Reply with ONLY the exact icon name and nothing else.`;

    let pickedIcon = '';

    if (provider === 'anthropic') {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 15,
          temperature: 0,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        pickedIcon = data.content?.[0]?.text?.trim() || '';
      }
    } else {
      let endpoint = meta.defaultEndpoint;
      if (provider === 'custom') {
        endpoint = store.customEndpoint || 'http://localhost:11434/v1';
      }
      const url = `${endpoint.replace(/\/+$/, '')}/chat/completions`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 15,
          temperature: 0,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        pickedIcon = data.choices?.[0]?.message?.content?.trim() || '';
      }
    }

    if (pickedIcon) {
      const cleanMatch = pickedIcon.match(/[A-Za-z0-9]+Icon/);
      const iconCandidate = cleanMatch ? cleanMatch[0] : pickedIcon;
      if (ALLOWED_SESSION_ICONS.has(iconCandidate)) {
        useCopilotStore.getState().updateSessionIcon(sessionId, iconCandidate);
      }
    }
  } catch {
    // Non-blocking: silent catch maintains the current heuristic or default icon
  }
}
