/**
 * @module CoversPresets
 * @description
 * Curated high-aesthetic cover presets for Noether notes.
 * Presets are downloaded to the extension's local offline cache during setup
 * rather than bloating the Noether core desktop repository with binary files.
 *
 * @since 1.1.0
 */

export const PRESET_CATEGORIES = ['All', 'Minimalist', 'Geometric', 'Texture'] as const;

export type CoverPresetCategory = 'Minimalist' | 'Geometric' | 'Texture';

export interface CoverPreset {
  id: string;
  name: string;
  category: CoverPresetCategory;
  url: string;
  thumbnail: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: 'charcoal-cube-grid',
    name: 'Charcoal Cube Grid',
    category: 'Geometric',
    url: 'https://w.wallhaven.cc/full/42/wallhaven-42pwqm.jpg',
    thumbnail: 'https://th.wallhaven.cc/small/42/42pwqm.jpg',
  },
  {
    id: 'obsidian-angular-rays',
    name: 'Obsidian Angular Rays',
    category: 'Minimalist',
    url: 'https://w.wallhaven.cc/full/43/wallhaven-43p27v.jpg',
    thumbnail: 'https://th.wallhaven.cc/small/43/43p27v.jpg',
  },
  {
    id: 'gothic-damask-tapestry',
    name: 'Gothic Damask Tapestry',
    category: 'Texture',
    url: 'https://w.wallhaven.cc/full/ne/wallhaven-nexv7o.jpg',
    thumbnail: 'https://th.wallhaven.cc/small/ne/nexv7o.jpg',
  },
  {
    id: 'prism-slate-triangles',
    name: 'Prism Slate Triangles',
    category: 'Geometric',
    url: 'https://w.wallhaven.cc/full/nk/wallhaven-nkwyy6.jpg',
    thumbnail: 'https://th.wallhaven.cc/small/nk/nkwyy6.jpg',
  },
  {
    id: 'monochrome-diamond-facets',
    name: 'Monochrome Diamond Facets',
    category: 'Geometric',
    url: 'https://w.wallhaven.cc/full/d5/wallhaven-d55zdo.png',
    thumbnail: 'https://th.wallhaven.cc/small/d5/d55zdo.jpg',
  },
  {
    id: 'minimalist-orbital-rings',
    name: 'Minimalist Orbital Rings',
    category: 'Minimalist',
    url: 'https://w.wallhaven.cc/full/0q/wallhaven-0qlvxd.png',
    thumbnail: 'https://th.wallhaven.cc/small/0q/0qlvxd.jpg',
  },
  {
    id: 'slate-material-papercraft',
    name: 'Slate Material Papercraft',
    category: 'Minimalist',
    url: 'https://w.wallhaven.cc/full/45/wallhaven-45k117.jpg',
    thumbnail: 'https://th.wallhaven.cc/small/45/45k117.jpg',
  },
];
