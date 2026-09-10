import React from 'react';
import {
  HugeInformationCircleIcon,
  HugeBulbIcon,
  HugeAlert01Icon,
  HugeAlert02Icon,
  HugeAlertDiamondIcon,
  HugeQuoteUpIcon,
  HugeBug01Icon,
  HugeHelpCircleIcon,
  HugeCheckmarkCircle02Icon,
  HugeCheckmarkSquare02Icon,
  HugeCancelCircleIcon,
  HugeCodeIcon,
  HugeFile01Icon,
  InformationCircleIcon,
  BulbIcon,
  AlertTriangleIcon,
  Alert02Icon,
  AlertDiamondIcon,
  QuoteUpIcon,
  Bug01Icon,
  HelpCircleIcon,
  CheckmarkCircle02Icon,
  CheckmarkSquare02Icon,
  CancelCircleIcon,
  CodeIcon,
  File01Icon,
} from '@/components/common/Icons';

export interface CalloutTypeDefinition {
  id: string;
  canonicalType: string;
  title: string;
  aliases: string[];
  description: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  accentHex: string;
  iconDef: any;
  iconComponent: React.ComponentType<{ size?: number; className?: string; color?: string }>;
}

export interface ParsedCalloutHeader {
  type: string;             // Raw or normalized type keyword (e.g. 'note', 'warning', 'idea')
  canonicalType: string;    // Canonical mapped type (e.g. 'note', 'warning')
  foldable: boolean;        // True if '+' or '-' is present
  defaultCollapsed: boolean;// True if '-'
  foldMarker: '+' | '-' | '';
  title: string;            // Custom inline title, if specified
  resolvedTitle: string;    // Custom title or default title (e.g. "Note", "Warning")
  depth: number;            // Quote depth (> = 1, >> = 2)
  quotePrefix: string;      // The leading '> ' prefix
}

/**
 * Standard Markdown callout types and their visual styles.
 * Colors and layout match the website documentation theme (crisp left border, subtle tint background).
 */
export const CALLOUT_DEFINITIONS: Record<string, CalloutTypeDefinition> = {
  note: {
    id: 'note',
    canonicalType: 'note',
    title: 'Note',
    aliases: [],
    description: 'General informational notes and contextual callouts',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    accentHex: '#3b82f6',
    iconDef: HugeInformationCircleIcon,
    iconComponent: InformationCircleIcon,
  },
  abstract: {
    id: 'abstract',
    canonicalType: 'abstract',
    title: 'Abstract',
    aliases: ['summary', 'tldr'],
    description: 'Summaries, executive overviews, and TL;DR sections',
    borderColor: 'border-cyan-500/50',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    accentHex: '#06b6d4',
    iconDef: HugeFile01Icon,
    iconComponent: File01Icon,
  },
  info: {
    id: 'info',
    canonicalType: 'info',
    title: 'Info',
    aliases: [],
    description: 'Supplemental background facts and reference details',
    borderColor: 'border-sky-500/50',
    bgColor: 'bg-sky-500/10',
    textColor: 'text-sky-400',
    accentHex: '#0284c7',
    iconDef: HugeInformationCircleIcon,
    iconComponent: InformationCircleIcon,
  },
  todo: {
    id: 'todo',
    canonicalType: 'todo',
    title: 'Todo',
    aliases: [],
    description: 'Action items, checklists, and next milestone tasks',
    borderColor: 'border-sky-500/50',
    bgColor: 'bg-sky-500/10',
    textColor: 'text-sky-400',
    accentHex: '#0ea5e9',
    iconDef: HugeCheckmarkSquare02Icon,
    iconComponent: CheckmarkSquare02Icon,
  },
  tip: {
    id: 'tip',
    canonicalType: 'tip',
    title: 'Tip',
    aliases: ['hint', 'important'],
    description: 'Helpful advice, shortcuts, and best practices',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    accentHex: '#10b981',
    iconDef: HugeBulbIcon,
    iconComponent: BulbIcon,
  },
  success: {
    id: 'success',
    canonicalType: 'success',
    title: 'Success',
    aliases: ['check', 'done'],
    description: 'Completed outcomes, positive verifications, and milestones',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    accentHex: '#22c55e',
    iconDef: HugeCheckmarkCircle02Icon,
    iconComponent: CheckmarkCircle02Icon,
  },
  question: {
    id: 'question',
    canonicalType: 'question',
    title: 'Question',
    aliases: ['help', 'faq'],
    description: 'Open questions, FAQ entries, and decisions to resolve',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    accentHex: '#f59e0b',
    iconDef: HugeHelpCircleIcon,
    iconComponent: HelpCircleIcon,
  },
  warning: {
    id: 'warning',
    canonicalType: 'warning',
    title: 'Warning',
    aliases: ['caution', 'attention'],
    description: 'Potential pitfalls, risks, and breaking changes to avoid',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    accentHex: '#f59e0b',
    iconDef: HugeAlert01Icon,
    iconComponent: AlertTriangleIcon,
  },
  failure: {
    id: 'failure',
    canonicalType: 'failure',
    title: 'Failure',
    aliases: ['fail', 'missing'],
    description: 'Missing requirements, test failures, and unresolved blockers',
    borderColor: 'border-rose-500/50',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-400',
    accentHex: '#f43f5e',
    iconDef: HugeCancelCircleIcon,
    iconComponent: CancelCircleIcon,
  },
  danger: {
    id: 'danger',
    canonicalType: 'danger',
    title: 'Danger',
    aliases: ['error'],
    description: 'Critical errors, data loss warnings, and destructive steps',
    borderColor: 'border-rose-500/50',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-400',
    accentHex: '#ef4444',
    iconDef: HugeAlertDiamondIcon,
    iconComponent: AlertDiamondIcon,
  },
  bug: {
    id: 'bug',
    canonicalType: 'bug',
    title: 'Bug',
    aliases: [],
    description: 'Defects, software bugs, and unexpected behavior',
    borderColor: 'border-orange-500/50',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    accentHex: '#f97316',
    iconDef: HugeBug01Icon,
    iconComponent: Bug01Icon,
  },
  example: {
    id: 'example',
    canonicalType: 'example',
    title: 'Example',
    aliases: [],
    description: 'Code snippets, conceptual walkthroughs, and usage examples',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    accentHex: '#8b5cf6',
    iconDef: HugeCodeIcon,
    iconComponent: CodeIcon,
  },
  quote: {
    id: 'quote',
    canonicalType: 'quote',
    title: 'Quote',
    aliases: ['cite'],
    description: 'Highlighted citations, quotes, and excerpts',
    borderColor: 'border-[#555555]',
    bgColor: 'bg-[#1e1e1e]/90',
    textColor: 'text-[#aaaaaa]',
    accentHex: '#9ca3af',
    iconDef: HugeQuoteUpIcon,
    iconComponent: QuoteUpIcon,
  },
};

// Quick lookup map covering all canonical types and aliases
const ALIAS_LOOKUP = new Map<string, CalloutTypeDefinition>();

for (const def of Object.values(CALLOUT_DEFINITIONS)) {
  ALIAS_LOOKUP.set(def.id.toLowerCase(), def);
  for (const alias of def.aliases) {
    ALIAS_LOOKUP.set(alias.toLowerCase(), def);
  }
}

/**
 * Returns metadata for a callout type or alias.
 * Falls back to NOTE styling if the type is unknown, preserving custom type id for CSS targeting.
 */
export function getCalloutTypeInfo(typeOrAlias: string): CalloutTypeDefinition {
  const normalized = (typeOrAlias || '').trim().toLowerCase();
  const found = ALIAS_LOOKUP.get(normalized);
  if (found) return found;

  // Custom / Unknown type fallback
  const fallback = CALLOUT_DEFINITIONS.note;
  return {
    ...fallback,
    id: normalized || 'note',
    canonicalType: 'note',
    title: normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Note',
  };
}

/**
 * Returns the list of all primary canonical callout definitions for UI pickers.
 */
export function getAllCalloutDefinitions(): CalloutTypeDefinition[] {
  return Object.values(CALLOUT_DEFINITIONS);
}

/**
 * Parses a markdown line for callout header syntax:
 * e.g. `> [!tip]+ My Custom Title` or `>> [!warning]- Destructive operation`
 */
export function parseCalloutHeader(lineText: string): ParsedCalloutHeader | null {
  if (!lineText) return null;
  const match = lineText.match(/^([ \t]*>+)\s*\[!([a-zA-Z0-9_\-]+)\]([+-])?(?:\s*(.*))?$/i);
  if (!match) return null;

  const quotePrefix = match[1];
  const depth = (quotePrefix.match(/>/g) || []).length;
  const rawType = match[2];
  const type = rawType.toLowerCase();
  const foldMarker = (match[3] as '+' | '-' | undefined) || '';
  const title = (match[4] || '').trim();

  const typeInfo = getCalloutTypeInfo(type);
  const resolvedTitle = title || typeInfo.title;

  return {
    type,
    canonicalType: typeInfo.canonicalType,
    foldable: foldMarker === '+' || foldMarker === '-',
    defaultCollapsed: foldMarker === '-',
    foldMarker,
    title,
    resolvedTitle,
    depth,
    quotePrefix,
  };
}
