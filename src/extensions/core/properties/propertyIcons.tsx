import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import * as Icons from '@hugeicons/core-free-icons';

export type PropertyIconCategory = 'All' | 'Common' | 'Content' | 'Status' | 'Tech' | 'Media' | 'Tools';

export interface PropertyIconDefinition {
  id: string;
  name: string;
  category: Exclude<PropertyIconCategory, 'All'>;
  keywords: string[];
  iconDef: any;
  component: React.ComponentType<{ size?: number; className?: string; color?: string; strokeWidth?: number }>;
}

const makeIcon = (iconDef: any) => {
  return React.memo<{ size?: number; className?: string; color?: string; strokeWidth?: number }>(
    ({ size = 14, className = '', color = 'currentColor', strokeWidth = 1.5, ...props }) => (
      <HugeiconsIcon
        icon={iconDef}
        size={size}
        className={className}
        color={color}
        strokeWidth={strokeWidth}
        {...(props as any)}
      />
    )
  );
};

export const PROPERTY_ICONS: PropertyIconDefinition[] = [
  // Common / General
  { id: 'tag', name: 'Tag', category: 'Common', keywords: ['label', 'metadata', 'category', 'keyword'], iconDef: Icons.Tag01Icon, component: makeIcon(Icons.Tag01Icon) },
  { id: 'tags', name: 'Tags', category: 'Common', keywords: ['labels', 'multi-tag'], iconDef: Icons.Tag02Icon, component: makeIcon(Icons.Tag02Icon) },
  { id: 'hash', name: 'Hashtag', category: 'Common', keywords: ['number', 'symbol', 'id', 'topic'], iconDef: Icons.HashIcon, component: makeIcon(Icons.HashIcon) },
  { id: 'star', name: 'Star', category: 'Common', keywords: ['favorite', 'rating', 'score', 'featured'], iconDef: Icons.StarIcon, component: makeIcon(Icons.StarIcon) },
  { id: 'sparkles', name: 'Sparkles', category: 'Common', keywords: ['ai', 'magic', 'special', 'shine'], iconDef: Icons.SparklesIcon, component: makeIcon(Icons.SparklesIcon) },
  { id: 'bookmark', name: 'Bookmark', category: 'Common', keywords: ['save', 'favorite', 'mark', 'reading'], iconDef: Icons.Bookmark01Icon, component: makeIcon(Icons.Bookmark01Icon) },
  { id: 'user', name: 'User', category: 'Common', keywords: ['author', 'person', 'owner', 'creator'], iconDef: Icons.UserIcon, component: makeIcon(Icons.UserIcon) },
  { id: 'users', name: 'Users', category: 'Common', keywords: ['team', 'people', 'collaborators', 'group'], iconDef: Icons.UserMultipleIcon, component: makeIcon(Icons.UserMultipleIcon) },
  { id: 'calendar', name: 'Calendar', category: 'Common', keywords: ['date', 'day', 'schedule', 'event'], iconDef: Icons.Calendar01Icon, component: makeIcon(Icons.Calendar01Icon) },
  { id: 'calendar-event', name: 'Calendar Event', category: 'Common', keywords: ['due', 'meeting', 'deadline'], iconDef: Icons.Calendar02Icon, component: makeIcon(Icons.Calendar02Icon) },
  { id: 'clock', name: 'Clock', category: 'Common', keywords: ['time', 'duration', 'hour', 'modified'], iconDef: Icons.Clock01Icon, component: makeIcon(Icons.Clock01Icon) },
  { id: 'time', name: 'Timer', category: 'Common', keywords: ['stopwatch', 'tracking', 'minutes'], iconDef: Icons.Time01Icon, component: makeIcon(Icons.Time01Icon) },
  { id: 'check', name: 'Check', category: 'Common', keywords: ['done', 'status', 'complete', 'task'], iconDef: Icons.CheckIcon, component: makeIcon(Icons.CheckIcon) },
  { id: 'check-circle', name: 'Check Circle', category: 'Common', keywords: ['verified', 'finished', 'active'], iconDef: Icons.CheckmarkCircle02Icon, component: makeIcon(Icons.CheckmarkCircle02Icon) },
  { id: 'link', name: 'Link', category: 'Common', keywords: ['url', 'href', 'source', 'reference'], iconDef: Icons.Link02Icon, component: makeIcon(Icons.Link02Icon) },
  { id: 'external-link', name: 'External Link', category: 'Common', keywords: ['website', 'outgoing', 'url'], iconDef: Icons.ExternalLinkIcon, component: makeIcon(Icons.ExternalLinkIcon) },
  { id: 'pin', name: 'Pin', category: 'Common', keywords: ['pinned', 'attach', 'priority', 'highlight'], iconDef: Icons.PinIcon, component: makeIcon(Icons.PinIcon) },
  { id: 'flag', name: 'Flag', category: 'Common', keywords: ['priority', 'milestone', 'goal', 'important'], iconDef: Icons.Flag01Icon, component: makeIcon(Icons.Flag01Icon) },
  { id: 'favourite', name: 'Heart', category: 'Common', keywords: ['love', 'like', 'favorite', 'heart'], iconDef: Icons.FavouriteIcon, component: makeIcon(Icons.FavouriteIcon) },

  // Content & Documents
  { id: 'note', name: 'Note', category: 'Content', keywords: ['description', 'summary', 'memo', 'text'], iconDef: Icons.StickyNote02Icon, component: makeIcon(Icons.StickyNote02Icon) },
  { id: 'file', name: 'File', category: 'Content', keywords: ['document', 'page', 'attachment'], iconDef: Icons.File01Icon, component: makeIcon(Icons.File01Icon) },
  { id: 'folder', name: 'Folder', category: 'Content', keywords: ['directory', 'group', 'collection'], iconDef: Icons.Folder01Icon, component: makeIcon(Icons.Folder01Icon) },
  { id: 'book', name: 'Book', category: 'Content', keywords: ['reading', 'library', 'journal', 'study'], iconDef: Icons.BookOpen01Icon, component: makeIcon(Icons.BookOpen01Icon) },
  { id: 'book-open', name: 'Open Book', category: 'Content', keywords: ['novel', 'reference', 'documentation'], iconDef: Icons.BookOpen02Icon, component: makeIcon(Icons.BookOpen02Icon) },
  { id: 'text', name: 'Text Font', category: 'Content', keywords: ['typography', 'title', 'string', 'letter'], iconDef: Icons.TextFontIcon, component: makeIcon(Icons.TextFontIcon) },
  { id: 'quote', name: 'Quote', category: 'Content', keywords: ['citation', 'statement', 'excerpt'], iconDef: Icons.QuoteDownIcon, component: makeIcon(Icons.QuoteDownIcon) },
  { id: 'list', name: 'Bullet List', category: 'Content', keywords: ['items', 'checklist', 'sequence'], iconDef: Icons.LeftToRightListBulletIcon, component: makeIcon(Icons.LeftToRightListBulletIcon) },
  { id: 'list-tree', name: 'List Tree', category: 'Content', keywords: ['hierarchy', 'nested', 'outline'], iconDef: Icons.ListTreeIcon, component: makeIcon(Icons.ListTreeIcon) },
  { id: 'arrow-az', name: 'Alphabetical', category: 'Content', keywords: ['sort', 'a-z', 'title', 'name'], iconDef: Icons.ArrowDownAZIcon, component: makeIcon(Icons.ArrowDownAZIcon) },
  { id: 'arrow-10', name: 'Numbers', category: 'Content', keywords: ['digits', 'score', 'count', 'numeric'], iconDef: Icons.ArrowDownOneZeroIcon, component: makeIcon(Icons.ArrowDownOneZeroIcon) },
  { id: 'edit', name: 'Edit', category: 'Content', keywords: ['pencil', 'write', 'authoring', 'draft'], iconDef: Icons.Edit02Icon, component: makeIcon(Icons.Edit02Icon) },
  { id: 'history', name: 'History', category: 'Content', keywords: ['version', 'timeline', 'backup', 'revision'], iconDef: Icons.HistoryIcon, component: makeIcon(Icons.HistoryIcon) },

  // Status & Flags
  { id: 'alert', name: 'Alert', category: 'Status', keywords: ['warning', 'caution', 'danger', 'notice'], iconDef: Icons.AlertCircleIcon, component: makeIcon(Icons.AlertCircleIcon) },
  { id: 'info', name: 'Info', category: 'Status', keywords: ['details', 'help', 'information', 'guide'], iconDef: Icons.InformationCircleIcon, component: makeIcon(Icons.InformationCircleIcon) },
  { id: 'help', name: 'Help', category: 'Status', keywords: ['question', 'support', 'faq'], iconDef: Icons.HelpCircleIcon, component: makeIcon(Icons.HelpCircleIcon) },
  { id: 'target', name: 'Target', category: 'Status', keywords: ['aim', 'objective', 'focus', 'kpi'], iconDef: Icons.Target01Icon, component: makeIcon(Icons.Target01Icon) },
  { id: 'flame', name: 'Flame', category: 'Status', keywords: ['fire', 'urgent', 'hot', 'streak'], iconDef: Icons.FlameIcon, component: makeIcon(Icons.FlameIcon) },
  { id: 'zap', name: 'Zap', category: 'Status', keywords: ['energy', 'lightning', 'fast', 'quick'], iconDef: Icons.ZapIcon, component: makeIcon(Icons.ZapIcon) },
  { id: 'activity', name: 'Activity', category: 'Status', keywords: ['pulse', 'health', 'fitness', 'metrics'], iconDef: Icons.Activity01Icon, component: makeIcon(Icons.Activity01Icon) },
  { id: 'chart', name: 'Chart', category: 'Status', keywords: ['analytics', 'graph', 'progress', 'stats'], iconDef: Icons.Chart01Icon, component: makeIcon(Icons.Chart01Icon) },
  { id: 'sun', name: 'Sun', category: 'Status', keywords: ['day', 'light', 'bright', 'weather'], iconDef: Icons.Sun01Icon, component: makeIcon(Icons.Sun01Icon) },
  { id: 'moon', name: 'Moon', category: 'Status', keywords: ['night', 'dark', 'sleep', 'rest'], iconDef: Icons.Moon01Icon, component: makeIcon(Icons.Moon01Icon) },

  // Tech & Code
  { id: 'database', name: 'Database', category: 'Tech', keywords: ['sql', 'storage', 'data', 'table'], iconDef: Icons.Database01Icon, component: makeIcon(Icons.Database01Icon) },
  { id: 'code', name: 'Code', category: 'Tech', keywords: ['programming', 'developer', 'syntax', 'script'], iconDef: Icons.CodeIcon, component: makeIcon(Icons.CodeIcon) },
  { id: 'source-code', name: 'Source Code', category: 'Tech', keywords: ['git', 'repo', 'branch', 'terminal'], iconDef: Icons.SourceCodeIcon, component: makeIcon(Icons.SourceCodeIcon) },
  { id: 'cpu', name: 'CPU', category: 'Tech', keywords: ['hardware', 'processor', 'chip', 'compute'], iconDef: Icons.CpuIcon, component: makeIcon(Icons.CpuIcon) },
  { id: 'globe', name: 'Globe', category: 'Tech', keywords: ['internet', 'world', 'web', 'country'], iconDef: Icons.GlobeIcon, component: makeIcon(Icons.GlobeIcon) },
  { id: 'shield', name: 'Shield', category: 'Tech', keywords: ['security', 'protect', 'private', 'safety'], iconDef: Icons.ShieldIcon, component: makeIcon(Icons.ShieldIcon) },
  { id: 'key', name: 'Key', category: 'Tech', keywords: ['access', 'password', 'token', 'secret'], iconDef: Icons.Key01Icon, component: makeIcon(Icons.Key01Icon) },
  { id: 'package', name: 'Package', category: 'Tech', keywords: ['box', 'module', 'plugin', 'library'], iconDef: Icons.PackageIcon, component: makeIcon(Icons.PackageIcon) },
  { id: 'sliders', name: 'Sliders', category: 'Tech', keywords: ['settings', 'controls', 'parameters', 'config'], iconDef: Icons.SlidersHorizontalIcon, component: makeIcon(Icons.SlidersHorizontalIcon) },
  { id: 'settings', name: 'Settings', category: 'Tech', keywords: ['gear', 'options', 'preferences'], iconDef: Icons.Settings02Icon, component: makeIcon(Icons.Settings02Icon) },
  { id: 'brain', name: 'Brain', category: 'Tech', keywords: ['ai', 'concept', 'knowledge', 'memory', 'fsrs'], iconDef: Icons.Brain02Icon, component: makeIcon(Icons.Brain02Icon) },

  // Media & Design
  { id: 'palette', name: 'Palette', category: 'Media', keywords: ['color', 'design', 'theme', 'art'], iconDef: Icons.PaletteIcon, component: makeIcon(Icons.PaletteIcon) },
  { id: 'image', name: 'Image', category: 'Media', keywords: ['photo', 'picture', 'cover', 'banner'], iconDef: Icons.Image01Icon, component: makeIcon(Icons.Image01Icon) },
  { id: 'music', name: 'Music', category: 'Media', keywords: ['audio', 'song', 'sound', 'track'], iconDef: Icons.MusicNote01Icon, component: makeIcon(Icons.MusicNote01Icon) },
  { id: 'video', name: 'Video', category: 'Media', keywords: ['movie', 'clip', 'film', 'recording'], iconDef: Icons.Video01Icon, component: makeIcon(Icons.Video01Icon) },
  { id: 'camera', name: 'Camera', category: 'Media', keywords: ['snapshot', 'photography', 'lens'], iconDef: Icons.Camera01Icon, component: makeIcon(Icons.Camera01Icon) },
  { id: 'layer', name: 'Layer', category: 'Media', keywords: ['stack', 'category', 'tier', 'level'], iconDef: Icons.LayersIcon, component: makeIcon(Icons.LayersIcon) },
  { id: 'layers', name: 'Layers', category: 'Media', keywords: ['multi-layer', 'hierarchy', 'sheets'], iconDef: Icons.Layers01Icon, component: makeIcon(Icons.Layers01Icon) },
  { id: 'layout', name: 'Layout', category: 'Media', keywords: ['canvas', 'grid', 'wireframe', 'board'], iconDef: Icons.Layout01Icon, component: makeIcon(Icons.Layout01Icon) },

  // Tools & Real-world
  { id: 'briefcase', name: 'Briefcase', category: 'Tools', keywords: ['work', 'project', 'business', 'job'], iconDef: Icons.Briefcase01Icon, component: makeIcon(Icons.Briefcase01Icon) },
  { id: 'coffee', name: 'Coffee', category: 'Tools', keywords: ['break', 'drink', 'cafe', 'habit'], iconDef: Icons.Coffee01Icon, component: makeIcon(Icons.Coffee01Icon) },
  { id: 'store', name: 'Store', category: 'Tools', keywords: ['shop', 'marketplace', 'price', 'product'], iconDef: Icons.Store01Icon, component: makeIcon(Icons.Store01Icon) },
  { id: 'shopping-bag', name: 'Shopping Bag', category: 'Tools', keywords: ['purchase', 'order', 'commerce'], iconDef: Icons.ShoppingBag01Icon, component: makeIcon(Icons.ShoppingBag01Icon) },
  { id: 'compass', name: 'Compass', category: 'Tools', keywords: ['location', 'place', 'direction', 'travel'], iconDef: Icons.Compass01Icon, component: makeIcon(Icons.Compass01Icon) },
  { id: 'mail', name: 'Mail', category: 'Tools', keywords: ['email', 'letter', 'message', 'contact'], iconDef: Icons.Mail01Icon, component: makeIcon(Icons.Mail01Icon) },
  { id: 'search', name: 'Search', category: 'Tools', keywords: ['query', 'find', 'lookup', 'explore'], iconDef: Icons.Search01Icon, component: makeIcon(Icons.Search01Icon) },
  { id: 'bulb', name: 'Idea', category: 'Tools', keywords: ['lightbulb', 'inspiration', 'insight', 'tip'], iconDef: Icons.LightbulbIcon, component: makeIcon(Icons.LightbulbIcon) },
];

export const PROPERTY_ICON_MAP = new Map<string, PropertyIconDefinition>(
  PROPERTY_ICONS.map((icon) => [icon.id, icon])
);

export const DEFAULT_PROPERTY_ICON_MAP: Record<string, string> = {
  tags: 'tag',
  tag: 'tag',
  aliases: 'link',
  alias: 'link',
  description: 'note',
  desc: 'note',
  author: 'user',
  creator: 'user',
  owner: 'user',
  created: 'calendar',
  date: 'calendar',
  modified: 'clock',
  updated: 'clock',
  locked: 'shield',
  lock: 'shield',
  read_only: 'shield',
  readonly: 'shield',
  status: 'check',
  rating: 'star',
  stars: 'star',
  priority: 'flag',
  source: 'external-link',
  url: 'link',
  website: 'globe',
  category: 'layer',
  type: 'package',
  title: 'text',
  summary: 'quote',
  location: 'compass',
  price: 'store',
  version: 'code',
  project: 'briefcase',
  time: 'clock',
  topic: 'hash',
  email: 'mail',
};

export function getPropertyIconDef(iconId?: string): PropertyIconDefinition | undefined {
  if (!iconId) return undefined;
  const staticDef = PROPERTY_ICON_MAP.get(iconId);
  if (staticDef) return staticDef;
  try {
    const { appInstance } = require('@/core/app/FlintApp');
    const dynamicIcons = appInstance?.properties?.getPropertyIcons?.() || [];
    return dynamicIcons.find((i: PropertyIconDefinition) => i.id === iconId);
  } catch {
    return undefined;
  }
}

export function getPropertyIconId(
  propertyKey: string,
  customIcons?: Record<string, string>
): string {
  const cleanKey = propertyKey.trim().toLowerCase();
  const normalizedKey = cleanKey.replace(/[-_]/g, ' ');
  const underscoredKey = cleanKey.replace(/[\s-]/g, '_');

  if (customIcons) {
    if (customIcons[cleanKey]) return customIcons[cleanKey];
    if (customIcons[normalizedKey]) return customIcons[normalizedKey];
    if (customIcons[underscoredKey]) return customIcons[underscoredKey];
  }
  if (DEFAULT_PROPERTY_ICON_MAP[cleanKey]) {
    return DEFAULT_PROPERTY_ICON_MAP[cleanKey];
  }
  if (DEFAULT_PROPERTY_ICON_MAP[normalizedKey]) {
    return DEFAULT_PROPERTY_ICON_MAP[normalizedKey];
  }
  if (DEFAULT_PROPERTY_ICON_MAP[underscoredKey]) {
    return DEFAULT_PROPERTY_ICON_MAP[underscoredKey];
  }

  try {
    const { appInstance } = require('@/core/app/FlintApp');
    const dynamicIcons = appInstance?.properties?.getPropertyIcons?.() || [];
    for (const dIcon of dynamicIcons) {
      if (dIcon.defaultKeys?.some((k: string) => {
        const lk = k.toLowerCase().trim();
        return lk === cleanKey || lk === normalizedKey || lk === underscoredKey;
      })) {
        return dIcon.id;
      }
    }
  } catch {
    // Ignore if not yet initialized
  }

  return 'hash';
}

export function getPropertyIconName(
  propertyKey: string,
  customIcons?: Record<string, string>
): string {
  const iconId = getPropertyIconId(propertyKey, customIcons);
  const iconDef = getPropertyIconDef(iconId) || getPropertyIconDef('hash');
  return iconDef ? iconDef.name : 'Icon';
}

export function renderPropertyIcon(
  propertyKey: string,
  customIcons?: Record<string, string>,
  options: { size?: number; className?: string; color?: string } = {}
): React.ReactNode {
  const iconId = getPropertyIconId(propertyKey, customIcons);
  const iconDef = getPropertyIconDef(iconId) || getPropertyIconDef('hash');
  if (!iconDef) return null;

  const IconComp = iconDef.component;
  return <IconComp size={options.size ?? 12} className={options.className} color={options.color} />;
}
