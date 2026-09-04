import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Tag01Icon,
  Tag02Icon,
  HashIcon,
  StarIcon,
  SparklesIcon,
  Bookmark01Icon,
  UserIcon,
  UserMultipleIcon,
  Calendar01Icon,
  Calendar02Icon,
  Clock01Icon,
  Time01Icon,
  CheckIcon,
  CheckmarkCircle02Icon,
  Link02Icon,
  ExternalLinkIcon,
  PinIcon,
  Flag01Icon,
  FavouriteIcon,
  StickyNote02Icon,
  File01Icon,
  Folder01Icon,
  BookOpen01Icon,
  BookOpen02Icon,
  TextFontIcon,
  QuoteDownIcon,
  LeftToRightListBulletIcon,
  ListTreeIcon,
  ArrowDownAZIcon,
  ArrowDownOneZeroIcon,
  Edit02Icon,
  HistoryIcon,
  AlertCircleIcon,
  InformationCircleIcon,
  HelpCircleIcon,
  Target01Icon,
  FlameIcon,
  ZapIcon,
  Activity01Icon,
  Chart01Icon,
  Sun01Icon,
  Moon01Icon,
  Database01Icon,
  CodeIcon,
  SourceCodeIcon,
  CpuIcon,
  GlobeIcon,
  ShieldIcon,
  Key01Icon,
  PackageIcon,
  SlidersHorizontalIcon,
  Settings02Icon,
  Brain02Icon,
  PaletteIcon,
  Image01Icon,
  MusicNote01Icon,
  Video01Icon,
  Camera01Icon,
  LayersIcon,
  Layers01Icon,
  Layout01Icon,
  Briefcase01Icon,
  Coffee01Icon,
  Store01Icon,
  ShoppingBag01Icon,
  Compass01Icon,
  Mail01Icon,
  Search01Icon,
  LightbulbIcon,
} from '@hugeicons/core-free-icons';

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
  { id: 'tag', name: 'Tag', category: 'Common', keywords: ['label', 'metadata', 'category', 'keyword'], iconDef: Tag01Icon, component: makeIcon(Tag01Icon) },
  { id: 'tags', name: 'Tags', category: 'Common', keywords: ['labels', 'multi-tag'], iconDef: Tag02Icon, component: makeIcon(Tag02Icon) },
  { id: 'hash', name: 'Hashtag', category: 'Common', keywords: ['number', 'symbol', 'id', 'topic'], iconDef: HashIcon, component: makeIcon(HashIcon) },
  { id: 'star', name: 'Star', category: 'Common', keywords: ['favorite', 'rating', 'score', 'featured'], iconDef: StarIcon, component: makeIcon(StarIcon) },
  { id: 'sparkles', name: 'Sparkles', category: 'Common', keywords: ['ai', 'magic', 'special', 'shine'], iconDef: SparklesIcon, component: makeIcon(SparklesIcon) },
  { id: 'bookmark', name: 'Bookmark', category: 'Common', keywords: ['save', 'favorite', 'mark', 'reading'], iconDef: Bookmark01Icon, component: makeIcon(Bookmark01Icon) },
  { id: 'user', name: 'User', category: 'Common', keywords: ['author', 'person', 'owner', 'creator'], iconDef: UserIcon, component: makeIcon(UserIcon) },
  { id: 'users', name: 'Users', category: 'Common', keywords: ['team', 'people', 'collaborators', 'group'], iconDef: UserMultipleIcon, component: makeIcon(UserMultipleIcon) },
  { id: 'calendar', name: 'Calendar', category: 'Common', keywords: ['date', 'day', 'schedule', 'event'], iconDef: Calendar01Icon, component: makeIcon(Calendar01Icon) },
  { id: 'calendar-event', name: 'Calendar Event', category: 'Common', keywords: ['due', 'meeting', 'deadline'], iconDef: Calendar02Icon, component: makeIcon(Calendar02Icon) },
  { id: 'clock', name: 'Clock', category: 'Common', keywords: ['time', 'duration', 'hour', 'modified'], iconDef: Clock01Icon, component: makeIcon(Clock01Icon) },
  { id: 'time', name: 'Timer', category: 'Common', keywords: ['stopwatch', 'tracking', 'minutes'], iconDef: Time01Icon, component: makeIcon(Time01Icon) },
  { id: 'check', name: 'Check', category: 'Common', keywords: ['done', 'status', 'complete', 'task'], iconDef: CheckIcon, component: makeIcon(CheckIcon) },
  { id: 'check-circle', name: 'Check Circle', category: 'Common', keywords: ['verified', 'finished', 'active'], iconDef: CheckmarkCircle02Icon, component: makeIcon(CheckmarkCircle02Icon) },
  { id: 'link', name: 'Link', category: 'Common', keywords: ['url', 'href', 'source', 'reference'], iconDef: Link02Icon, component: makeIcon(Link02Icon) },
  { id: 'external-link', name: 'External Link', category: 'Common', keywords: ['website', 'outgoing', 'url'], iconDef: ExternalLinkIcon, component: makeIcon(ExternalLinkIcon) },
  { id: 'pin', name: 'Pin', category: 'Common', keywords: ['pinned', 'attach', 'priority', 'highlight'], iconDef: PinIcon, component: makeIcon(PinIcon) },
  { id: 'flag', name: 'Flag', category: 'Common', keywords: ['priority', 'milestone', 'goal', 'important'], iconDef: Flag01Icon, component: makeIcon(Flag01Icon) },
  { id: 'favourite', name: 'Heart', category: 'Common', keywords: ['love', 'like', 'favorite', 'heart'], iconDef: FavouriteIcon, component: makeIcon(FavouriteIcon) },

  // Content & Documents
  { id: 'note', name: 'Note', category: 'Content', keywords: ['description', 'summary', 'memo', 'text'], iconDef: StickyNote02Icon, component: makeIcon(StickyNote02Icon) },
  { id: 'file', name: 'File', category: 'Content', keywords: ['document', 'page', 'attachment'], iconDef: File01Icon, component: makeIcon(File01Icon) },
  { id: 'folder', name: 'Folder', category: 'Content', keywords: ['directory', 'group', 'collection'], iconDef: Folder01Icon, component: makeIcon(Folder01Icon) },
  { id: 'book', name: 'Book', category: 'Content', keywords: ['reading', 'library', 'journal', 'study'], iconDef: BookOpen01Icon, component: makeIcon(BookOpen01Icon) },
  { id: 'book-open', name: 'Open Book', category: 'Content', keywords: ['novel', 'reference', 'documentation'], iconDef: BookOpen02Icon, component: makeIcon(BookOpen02Icon) },
  { id: 'text', name: 'Text Font', category: 'Content', keywords: ['typography', 'title', 'string', 'letter'], iconDef: TextFontIcon, component: makeIcon(TextFontIcon) },
  { id: 'quote', name: 'Quote', category: 'Content', keywords: ['citation', 'statement', 'excerpt'], iconDef: QuoteDownIcon, component: makeIcon(QuoteDownIcon) },
  { id: 'list', name: 'Bullet List', category: 'Content', keywords: ['items', 'checklist', 'sequence'], iconDef: LeftToRightListBulletIcon, component: makeIcon(LeftToRightListBulletIcon) },
  { id: 'list-tree', name: 'List Tree', category: 'Content', keywords: ['hierarchy', 'nested', 'outline'], iconDef: ListTreeIcon, component: makeIcon(ListTreeIcon) },
  { id: 'arrow-az', name: 'Alphabetical', category: 'Content', keywords: ['sort', 'a-z', 'title', 'name'], iconDef: ArrowDownAZIcon, component: makeIcon(ArrowDownAZIcon) },
  { id: 'arrow-10', name: 'Numbers', category: 'Content', keywords: ['digits', 'score', 'count', 'numeric'], iconDef: ArrowDownOneZeroIcon, component: makeIcon(ArrowDownOneZeroIcon) },
  { id: 'edit', name: 'Edit', category: 'Content', keywords: ['pencil', 'write', 'authoring', 'draft'], iconDef: Edit02Icon, component: makeIcon(Edit02Icon) },
  { id: 'history', name: 'History', category: 'Content', keywords: ['version', 'timeline', 'backup', 'revision'], iconDef: HistoryIcon, component: makeIcon(HistoryIcon) },

  // Status & Flags
  { id: 'alert', name: 'Alert', category: 'Status', keywords: ['warning', 'caution', 'danger', 'notice'], iconDef: AlertCircleIcon, component: makeIcon(AlertCircleIcon) },
  { id: 'info', name: 'Info', category: 'Status', keywords: ['details', 'help', 'information', 'guide'], iconDef: InformationCircleIcon, component: makeIcon(InformationCircleIcon) },
  { id: 'help', name: 'Help', category: 'Status', keywords: ['question', 'support', 'faq'], iconDef: HelpCircleIcon, component: makeIcon(HelpCircleIcon) },
  { id: 'target', name: 'Target', category: 'Status', keywords: ['aim', 'objective', 'focus', 'kpi'], iconDef: Target01Icon, component: makeIcon(Target01Icon) },
  { id: 'flame', name: 'Flame', category: 'Status', keywords: ['fire', 'urgent', 'hot', 'streak'], iconDef: FlameIcon, component: makeIcon(FlameIcon) },
  { id: 'zap', name: 'Zap', category: 'Status', keywords: ['energy', 'lightning', 'fast', 'quick'], iconDef: ZapIcon, component: makeIcon(ZapIcon) },
  { id: 'activity', name: 'Activity', category: 'Status', keywords: ['pulse', 'health', 'fitness', 'metrics'], iconDef: Activity01Icon, component: makeIcon(Activity01Icon) },
  { id: 'chart', name: 'Chart', category: 'Status', keywords: ['analytics', 'graph', 'progress', 'stats'], iconDef: Chart01Icon, component: makeIcon(Chart01Icon) },
  { id: 'sun', name: 'Sun', category: 'Status', keywords: ['day', 'light', 'bright', 'weather'], iconDef: Sun01Icon, component: makeIcon(Sun01Icon) },
  { id: 'moon', name: 'Moon', category: 'Status', keywords: ['night', 'dark', 'sleep', 'rest'], iconDef: Moon01Icon, component: makeIcon(Moon01Icon) },

  // Tech & Code
  { id: 'database', name: 'Database', category: 'Tech', keywords: ['sql', 'storage', 'data', 'table'], iconDef: Database01Icon, component: makeIcon(Database01Icon) },
  { id: 'code', name: 'Code', category: 'Tech', keywords: ['programming', 'developer', 'syntax', 'script'], iconDef: CodeIcon, component: makeIcon(CodeIcon) },
  { id: 'source-code', name: 'Source Code', category: 'Tech', keywords: ['git', 'repo', 'branch', 'terminal'], iconDef: SourceCodeIcon, component: makeIcon(SourceCodeIcon) },
  { id: 'cpu', name: 'CPU', category: 'Tech', keywords: ['hardware', 'processor', 'chip', 'compute'], iconDef: CpuIcon, component: makeIcon(CpuIcon) },
  { id: 'globe', name: 'Globe', category: 'Tech', keywords: ['internet', 'world', 'web', 'country'], iconDef: GlobeIcon, component: makeIcon(GlobeIcon) },
  { id: 'shield', name: 'Shield', category: 'Tech', keywords: ['security', 'protect', 'private', 'safety'], iconDef: ShieldIcon, component: makeIcon(ShieldIcon) },
  { id: 'key', name: 'Key', category: 'Tech', keywords: ['access', 'password', 'token', 'secret'], iconDef: Key01Icon, component: makeIcon(Key01Icon) },
  { id: 'package', name: 'Package', category: 'Tech', keywords: ['box', 'module', 'plugin', 'library'], iconDef: PackageIcon, component: makeIcon(PackageIcon) },
  { id: 'sliders', name: 'Sliders', category: 'Tech', keywords: ['settings', 'controls', 'parameters', 'config'], iconDef: SlidersHorizontalIcon, component: makeIcon(SlidersHorizontalIcon) },
  { id: 'settings', name: 'Settings', category: 'Tech', keywords: ['gear', 'options', 'preferences'], iconDef: Settings02Icon, component: makeIcon(Settings02Icon) },
  { id: 'brain', name: 'Brain', category: 'Tech', keywords: ['ai', 'concept', 'knowledge', 'memory', 'fsrs'], iconDef: Brain02Icon, component: makeIcon(Brain02Icon) },

  // Media & Design
  { id: 'palette', name: 'Palette', category: 'Media', keywords: ['color', 'design', 'theme', 'art'], iconDef: PaletteIcon, component: makeIcon(PaletteIcon) },
  { id: 'image', name: 'Image', category: 'Media', keywords: ['photo', 'picture', 'cover', 'banner'], iconDef: Image01Icon, component: makeIcon(Image01Icon) },
  { id: 'music', name: 'Music', category: 'Media', keywords: ['audio', 'song', 'sound', 'track'], iconDef: MusicNote01Icon, component: makeIcon(MusicNote01Icon) },
  { id: 'video', name: 'Video', category: 'Media', keywords: ['movie', 'clip', 'film', 'recording'], iconDef: Video01Icon, component: makeIcon(Video01Icon) },
  { id: 'camera', name: 'Camera', category: 'Media', keywords: ['snapshot', 'photography', 'lens'], iconDef: Camera01Icon, component: makeIcon(Camera01Icon) },
  { id: 'layer', name: 'Layer', category: 'Media', keywords: ['stack', 'category', 'tier', 'level'], iconDef: LayersIcon, component: makeIcon(LayersIcon) },
  { id: 'layers', name: 'Layers', category: 'Media', keywords: ['multi-layer', 'hierarchy', 'sheets'], iconDef: Layers01Icon, component: makeIcon(Layers01Icon) },
  { id: 'layout', name: 'Layout', category: 'Media', keywords: ['canvas', 'grid', 'wireframe', 'board'], iconDef: Layout01Icon, component: makeIcon(Layout01Icon) },

  // Tools & Real-world
  { id: 'briefcase', name: 'Briefcase', category: 'Tools', keywords: ['work', 'project', 'business', 'job'], iconDef: Briefcase01Icon, component: makeIcon(Briefcase01Icon) },
  { id: 'coffee', name: 'Coffee', category: 'Tools', keywords: ['break', 'drink', 'cafe', 'habit'], iconDef: Coffee01Icon, component: makeIcon(Coffee01Icon) },
  { id: 'store', name: 'Store', category: 'Tools', keywords: ['shop', 'marketplace', 'price', 'product'], iconDef: Store01Icon, component: makeIcon(Store01Icon) },
  { id: 'shopping-bag', name: 'Shopping Bag', category: 'Tools', keywords: ['purchase', 'order', 'commerce'], iconDef: ShoppingBag01Icon, component: makeIcon(ShoppingBag01Icon) },
  { id: 'compass', name: 'Compass', category: 'Tools', keywords: ['location', 'place', 'direction', 'travel'], iconDef: Compass01Icon, component: makeIcon(Compass01Icon) },
  { id: 'mail', name: 'Mail', category: 'Tools', keywords: ['email', 'letter', 'message', 'contact'], iconDef: Mail01Icon, component: makeIcon(Mail01Icon) },
  { id: 'search', name: 'Search', category: 'Tools', keywords: ['query', 'find', 'lookup', 'explore'], iconDef: Search01Icon, component: makeIcon(Search01Icon) },
  { id: 'bulb', name: 'Idea', category: 'Tools', keywords: ['lightbulb', 'inspiration', 'insight', 'tip'], iconDef: LightbulbIcon, component: makeIcon(LightbulbIcon) },
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
