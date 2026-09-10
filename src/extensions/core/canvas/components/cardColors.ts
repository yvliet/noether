export interface CardColorPreset {
  id: string;
  label: string;
  swatch: string;
  bg: string;
  borderIdle: string;
  borderHover: string;
  borderActive: string;
  shadowActive: string;
}

export const CARD_COLOR_PRESETS: CardColorPreset[] = [
  {
    id: 'default',
    label: 'Default',
    swatch: '#737373',
    bg: '#1e1e1e',
    borderIdle: '#2c2c2c',
    borderHover: '#444444',
    borderActive: '#888888',
    shadowActive: '0 0 18px rgba(255,255,255,0.06), 0 0 24px rgba(0,0,0,0.45)',
  },
  {
    id: 'red',
    label: 'Red',
    swatch: '#ef4444',
    bg: '#221515',
    borderIdle: 'rgba(239, 68, 68, 0.45)',
    borderHover: 'rgba(239, 68, 68, 0.8)',
    borderActive: '#ef4444',
    shadowActive: '0 0 20px rgba(239, 68, 68, 0.28), 0 0 24px rgba(0,0,0,0.45)',
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: '#f97316',
    bg: '#241a12',
    borderIdle: 'rgba(249, 115, 22, 0.45)',
    borderHover: 'rgba(249, 115, 22, 0.8)',
    borderActive: '#f97316',
    shadowActive: '0 0 20px rgba(249, 115, 22, 0.28), 0 0 24px rgba(0,0,0,0.45)',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    swatch: '#facc15',
    bg: '#232213',
    borderIdle: 'rgba(250, 204, 21, 0.45)',
    borderHover: 'rgba(250, 204, 21, 0.8)',
    borderActive: '#facc15',
    shadowActive: '0 0 20px rgba(250, 204, 21, 0.28), 0 0 24px rgba(0,0,0,0.45)',
  },
  {
    id: 'green',
    label: 'Green',
    swatch: '#22c55e',
    bg: '#132317',
    borderIdle: 'rgba(34, 197, 94, 0.45)',
    borderHover: 'rgba(34, 197, 94, 0.8)',
    borderActive: '#22c55e',
    shadowActive: '0 0 20px rgba(34, 197, 94, 0.28), 0 0 24px rgba(0,0,0,0.45)',
  },
  {
    id: 'cyan',
    label: 'Cyan',
    swatch: '#06b6d4',
    bg: '#122126',
    borderIdle: 'rgba(6, 182, 212, 0.45)',
    borderHover: 'rgba(6, 182, 212, 0.8)',
    borderActive: '#06b6d4',
    shadowActive: '0 0 20px rgba(6, 182, 212, 0.28), 0 0 24px rgba(0,0,0,0.45)',
  },
  {
    id: 'purple',
    label: 'Purple',
    swatch: '#a855f7',
    bg: '#211528',
    borderIdle: 'rgba(168, 85, 247, 0.45)',
    borderHover: 'rgba(168, 85, 247, 0.8)',
    borderActive: '#a855f7',
    shadowActive: '0 0 20px rgba(168, 85, 247, 0.28), 0 0 24px rgba(0,0,0,0.45)',
  },
];

const LEGACY_COLOR_MAP: Record<string, string> = {
  '#261616': 'red',
  '#272013': 'orange',
  '#152418': 'green',
  '#14202d': 'cyan',
  '#211629': 'purple',
  '#1a1a1a': 'default',
  '#242424': 'default',
  '#2a2a2a': 'default',
  '#141414': 'default',
  '#161616': 'default',
  '#181818': 'default',
  '#171717': 'default',
  '#121212': 'default',
  '#1e1e1e': 'default',
};

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : [r, g, b];
  }
  return null;
}

export function resolveCardColorTheme(rawColor?: string): CardColorPreset & { isCustom?: boolean } {
  if (!rawColor) {
    return CARD_COLOR_PRESETS[0];
  }

  const clean = rawColor.toLowerCase().trim();
  const mappedPresetId = LEGACY_COLOR_MAP[clean] || clean;

  const foundPreset = CARD_COLOR_PRESETS.find(
    (p) => p.id === mappedPresetId || p.swatch.toLowerCase() === clean
  );
  if (foundPreset) {
    return foundPreset;
  }

  // Custom hex color
  const rgb = hexToRgb(clean);
  if (rgb) {
    const [r, g, b] = rgb;
    return {
      id: clean,
      label: 'Custom',
      swatch: clean,
      bg: `rgb(${Math.round(20 + r * 0.05)}, ${Math.round(20 + g * 0.05)}, ${Math.round(20 + b * 0.05)})`,
      borderIdle: `rgba(${r}, ${g}, ${b}, 0.45)`,
      borderHover: `rgba(${r}, ${g}, ${b}, 0.8)`,
      borderActive: clean,
      shadowActive: `0 0 20px rgba(${r}, ${g}, ${b}, 0.28), 0 0 24px rgba(0,0,0,0.45)`,
      isCustom: true,
    };
  }

  return CARD_COLOR_PRESETS[0];
}
