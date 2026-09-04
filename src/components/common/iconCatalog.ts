/**
 * @file iconCatalog.ts
 * @description
 * Lazy-loaded catalog generator for HugeIcons.
 *
 * Architectural Rationale:
 * By isolating the 14,716 SVG icon definitions into this dynamically imported module,
 * the primary application bundle avoids parsing and allocating ~76MB of raw icon geometry
 * at application boot. This module is only fetched and evaluated when the user explicitly
 * opens the IconPicker modal or popover interface.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import * as RawIcons from '@hugeicons/core-free-icons';

export type IconCategory =
  | 'All'
  | 'Common'
  | 'Content'
  | 'Status'
  | 'Tech'
  | 'Media'
  | 'Tools'
  | 'Arrows'
  | 'Symbols';

export interface CatalogIconDefinition {
  id: string;
  name: string;
  category: Exclude<IconCategory, 'All'>;
  keywords: string[];
  iconDef: any;
}

// ── Smart Category Classifier ──
export function classifyCategory(rawKey: string): Exclude<IconCategory, 'All'> {
  if (
    /Code|Git|Database|Cpu|Server|Terminal|Cloud|Api|Bug|Wifi|Globe|Shield|Key|Lock|Command|Processor|Computer|Laptop|Phone|QrCode|Router|HardDrive|Usb|Robot|Ai|Programming|Developer/i.test(
      rawKey
    )
  ) {
    return 'Tech';
  }
  if (
    /File|Folder|Book|Note|Document|Text|Edit|Pencil|Paragraph|Heading|Quote|List|Task|Paperclip|Sticky|Draft|Page|Bookmark|Alphabet|Number/i.test(
      rawKey
    )
  ) {
    return 'Content';
  }
  if (
    /Image|Camera|Video|Music|Audio|Film|Palette|Color|Layer|Layout|Design|Play|Volume|Mic|Sound|Equalizer|Speaker|Brush|Canvas|Crop/i.test(
      rawKey
    )
  ) {
    return 'Media';
  }
  if (
    /Check|Alert|Info|Help|Target|Flame|Zap|Activity|Chart|Sun|Moon|Star|Heart|Favourite|Flag|Pin|Notification|Bell|Warning|Battery|Gauge|Hourglass|Progress|Status/i.test(
      rawKey
    )
  ) {
    return 'Status';
  }
  if (
    /Tool|Setting|Slider|Wrench|Search|Mail|Shop|Store|Bag|Briefcase|Coffee|Compass|Bulb|Calculator|Hammer|Scissors|Paint|Box|Archive|Cart|Shopping/i.test(
      rawKey
    )
  ) {
    return 'Tools';
  }
  if (/Arrow|Chevron|Direction|Navigate|Corner|Exchange|Transfer|Sort|Move|Expand|Shrink/i.test(rawKey)) {
    return 'Arrows';
  }
  if (
    /Hash|At|Percent|Plus|Minus|Multiply|Divide|Equal|Circle|Square|Triangle|Diamond|Badge|Sparkle/i.test(
      rawKey
    )
  ) {
    return 'Symbols';
  }
  return 'Common';
}

// ── Convert camelCase / PascalCase to Kebab & Words ──
export function parseIconKey(rawKey: string): { id: string; name: string; keywords: string[] } {
  const base = rawKey.replace(/Icon$/, '');
  const kebab = base
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

  const words = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/);

  const synonyms: string[] = [];
  if (words.includes('favourite')) synonyms.push('favorite', 'heart', 'like');
  if (words.includes('folder')) synonyms.push('directory', 'collection');
  if (words.includes('file')) synonyms.push('document', 'page');
  if (words.includes('edit')) synonyms.push('write', 'pencil');
  if (words.includes('star')) synonyms.push('rating', 'favorite');
  if (words.includes('sparkles')) synonyms.push('magic', 'ai', 'clean');
  if (words.includes('code')) synonyms.push('dev', 'script', 'programming');
  if (words.includes('search')) synonyms.push('find', 'lookup');
  if (words.includes('settings')) synonyms.push('config', 'preferences', 'gear');

  const titleName = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

  return {
    id: kebab,
    name: titleName,
    keywords: Array.from(new Set([...words, kebab, ...synonyms])),
  };
}

// ── Build Full Catalog ──
export const UNIFIED_ICONS_CATALOG: CatalogIconDefinition[] = (() => {
  const list: CatalogIconDefinition[] = [];
  const entries = Object.entries(RawIcons);

  for (const [key, value] of entries) {
    if (key.endsWith('Icon') && !key.endsWith('FreeIcons') && Array.isArray(value)) {
      const parsed = parseIconKey(key);
      const category = classifyCategory(key);
      list.push({
        id: parsed.id,
        name: parsed.name,
        category,
        keywords: parsed.keywords,
        iconDef: value,
      });
    }
  }

  // Sort catalog: Common first, then alphabetical
  return list.sort((a, b) => {
    if (a.category === 'Common' && b.category !== 'Common') return -1;
    if (b.category === 'Common' && a.category !== 'Common') return 1;
    return a.name.localeCompare(b.name);
  });
})();

export const UNIFIED_ICON_MAP = new Map<string, CatalogIconDefinition>(
  UNIFIED_ICONS_CATALOG.map((icon) => [icon.id, icon])
);
