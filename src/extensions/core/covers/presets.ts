/**
 * @module CoversPresets
 * @description
 * Curated high-aesthetic offline cover presets for Noether notes.
 * Formatted as optimized, standalone SVG data URIs so they load instantaneously
 * with zero network latency and work 100% offline.
 *
 * @since 1.0.0
 */

export interface CoverPreset {
  id: string;
  name: string;
  category: 'Pixel Art' | 'Nature' | 'Minimalist' | 'Cyberpunk';
  url: string;
  thumbnail: string;
}

// ── SVG Data URI Helpers ──
function svgToUri(svg: string): string {
  const cleaned = svg.replace(/\s+/g, ' ').trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(cleaned)}`;
}

// ── Curated Presets ──

const PRESET_PIXEL_TRAIN = svgToUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2d4245" />
      <stop offset="50%" stop-color="#3c575a" />
      <stop offset="100%" stop-color="#1e2c2e" />
    </linearGradient>
    <linearGradient id="train" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a4d5b2" />
      <stop offset="60%" stop-color="#c1e3cb" />
      <stop offset="100%" stop-color="#e8bfcb" />
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#sky)" />
  <!-- Distant rooftops -->
  <path d="M0 260 L80 230 L160 260 L240 220 L340 260 L460 210 L580 260 L720 200 L860 260 L1020 210 L1140 250 L1200 240 L1200 400 L0 400 Z" fill="#1b2829" opacity="0.8" />
  <!-- Wire grid & utility poles -->
  <path d="M0 120 Q300 180 600 130 T1200 140" stroke="#121a1b" stroke-width="2" fill="none" opacity="0.6" />
  <path d="M0 140 Q400 200 800 150 T1200 160" stroke="#121a1b" stroke-width="1.5" fill="none" opacity="0.5" />
  <rect x="180" y="80" width="8" height="280" fill="#141f20" />
  <rect x="740" y="60" width="10" height="300" fill="#141f20" />
  <!-- Lush foliage background -->
  <ellipse cx="140" cy="240" rx="90" ry="70" fill="#1b3b33" />
  <ellipse cx="280" cy="220" rx="120" ry="80" fill="#234a41" />
  <ellipse cx="680" cy="230" rx="140" ry="90" fill="#1f4239" />
  <ellipse cx="880" cy="210" rx="150" ry="95" fill="#2a574b" />
  <ellipse cx="1060" cy="230" rx="110" ry="80" fill="#1b3b33" />
  <!-- Bridge / Viaduct -->
  <rect x="0" y="300" width="1200" height="30" fill="#172223" />
  <rect x="0" y="330" width="1200" height="70" fill="#0f1617" />
  <!-- Train carriage -->
  <rect x="220" y="220" width="380" height="95" rx="8" fill="url(#train)" />
  <rect x="235" y="235" width="60" height="45" rx="3" fill="#304443" />
  <rect x="315" y="235" width="70" height="45" rx="3" fill="#304443" />
  <rect x="405" y="235" width="70" height="45" rx="3" fill="#304443" />
  <rect x="495" y="235" width="85" height="45" rx="3" fill="#304443" />
  <rect x="220" y="300" width="380" height="15" fill="#7ba085" />
  <rect x="220" y="315" width="380" height="8" fill="#1d2627" />
  <!-- Street Lantern / Pillar -->
  <rect x="790" y="190" width="65" height="150" fill="#dfe5dd" opacity="0.9" rx="2" />
  <rect x="805" y="210" width="35" height="110" fill="#2d3f3c" opacity="0.3" />
</svg>
`);

const PRESET_MISTY_PINE = svgToUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="pineSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1b1e" />
      <stop offset="60%" stop-color="#16292b" />
      <stop offset="100%" stop-color="#0a1213" />
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#pineSky)" />
  <!-- Distant mountain silhouette -->
  <path d="M0 240 Q300 130 600 200 T1200 170 L1200 400 L0 400 Z" fill="#132426" opacity="0.6" />
  <!-- Mid pines -->
  <g fill="#183234" opacity="0.8">
    <polygon points="120,180 90,260 150,260" />
    <polygon points="180,160 145,260 215,260" />
    <polygon points="260,190 230,280 290,280" />
    <polygon points="450,170 410,270 490,270" />
    <polygon points="540,150 495,270 585,270" />
    <polygon points="760,180 720,280 800,280" />
    <polygon points="850,160 805,270 895,270" />
    <polygon points="1020,175 980,275 1060,275" />
  </g>
  <!-- Foreground dense pines -->
  <g fill="#0e1f20">
    <polygon points="60,190 15,340 105,340" />
    <polygon points="140,210 90,360 190,360" />
    <polygon points="340,180 280,350 400,350" />
    <polygon points="420,200 370,360 470,360" />
    <polygon points="650,170 590,360 710,360" />
    <polygon points="720,190 665,370 775,370" />
    <polygon points="940,180 880,360 1000,360" />
    <polygon points="1120,190 1060,370 1180,370" />
  </g>
  <!-- Mist bands -->
  <ellipse cx="600" cy="270" rx="650" ry="30" fill="#a4c4b5" opacity="0.08" />
  <ellipse cx="400" cy="310" rx="550" ry="25" fill="#a4c4b5" opacity="0.06" />
</svg>
`);

const PRESET_CYBERPUNK_ALLEY = svgToUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="cyberSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#120c1f" />
      <stop offset="60%" stop-color="#1c102a" />
      <stop offset="100%" stop-color="#0a0510" />
    </linearGradient>
    <linearGradient id="neonPink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff2a85" />
      <stop offset="100%" stop-color="#ff7300" />
    </linearGradient>
    <linearGradient id="neonCyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#00f0ff" />
      <stop offset="100%" stop-color="#0066ff" />
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#cyberSky)" />
  <!-- Skyscraper blocks -->
  <rect x="40" y="80" width="160" height="320" fill="#150e22" />
  <rect x="230" y="40" width="180" height="360" fill="#181026" />
  <rect x="440" y="110" width="140" height="290" fill="#140c20" />
  <rect x="620" y="60" width="210" height="340" fill="#191028" />
  <rect x="860" y="90" width="170" height="310" fill="#150e22" />
  <rect x="1050" y="50" width="130" height="350" fill="#181026" />
  <!-- Neon billboards -->
  <rect x="250" y="80" width="140" height="35" rx="3" fill="url(#neonPink)" opacity="0.85" />
  <rect x="650" y="110" width="150" height="25" rx="2" fill="url(#neonCyan)" opacity="0.85" />
  <rect x="890" y="140" width="110" height="30" rx="3" fill="url(#neonPink)" opacity="0.75" />
  <!-- Neon reflection streaks -->
  <rect x="0" y="360" width="1200" height="40" fill="#08040d" />
  <ellipse cx="320" cy="380" rx="140" ry="12" fill="#ff2a85" opacity="0.15" />
  <ellipse cx="725" cy="380" rx="160" ry="12" fill="#00f0ff" opacity="0.15" />
</svg>
`);

const PRESET_OBSIDIAN_EMERALD = svgToUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <radialGradient id="mesh" cx="30%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#064e3b" stop-opacity="0.9" />
      <stop offset="40%" stop-color="#042f2e" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#0a1213" stop-opacity="1" />
    </radialGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#059669" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#mesh)" />
  <circle cx="850" cy="180" r="190" fill="#10b981" opacity="0.08" />
  <path d="M-100 350 Q400 120 900 260 T1400 100" stroke="url(#accentLine)" stroke-width="2" fill="none" />
  <path d="M-50 380 Q500 160 1000 300 T1450 140" stroke="url(#accentLine)" stroke-width="1.5" fill="none" opacity="0.5" />
</svg>
`);

const PRESET_AURORA_NIGHT = svgToUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="auroraSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#040810" />
      <stop offset="60%" stop-color="#08141f" />
      <stop offset="100%" stop-color="#050a10" />
    </linearGradient>
    <linearGradient id="auroraRibbon" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00ffaa" stop-opacity="0" />
      <stop offset="30%" stop-color="#00f2fe" stop-opacity="0.3" />
      <stop offset="60%" stop-color="#4facfe" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#9b51e0" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#auroraSky)" />
  <!-- Stars -->
  <circle cx="120" cy="60" r="1.5" fill="#fff" opacity="0.8" />
  <circle cx="280" cy="40" r="1" fill="#fff" opacity="0.6" />
  <circle cx="450" cy="80" r="1.5" fill="#fff" opacity="0.7" />
  <circle cx="680" cy="50" r="1.2" fill="#fff" opacity="0.9" />
  <circle cx="890" cy="70" r="1.5" fill="#fff" opacity="0.8" />
  <circle cx="1060" cy="35" r="1" fill="#fff" opacity="0.6" />
  <!-- Aurora curtains -->
  <path d="M0 160 Q350 40 700 130 T1200 80 L1200 240 Q800 160 400 250 T0 220 Z" fill="url(#auroraRibbon)" opacity="0.7" />
  <!-- Mountain silhouette -->
  <polygon points="0,400 150,280 340,360 520,260 710,340 890,250 1060,330 1200,270 1200,400" fill="#04090e" />
</svg>
`);

const PRESET_WARM_HORIZON = svgToUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" width="100%" height="100%">
  <defs>
    <linearGradient id="warmGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2d1720" />
      <stop offset="45%" stop-color="#54232d" />
      <stop offset="70%" stop-color="#8a3c30" />
      <stop offset="100%" stop-color="#140a0e" />
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#warmGrad)" />
  <circle cx="600" cy="240" r="90" fill="#fcd34d" opacity="0.85" />
  <path d="M0 310 Q300 260 600 290 T1200 270 L1200 400 L0 400 Z" fill="#1a0c12" />
  <path d="M0 340 Q400 300 800 330 T1200 315 L1200 400 L0 400 Z" fill="#10060a" />
</svg>
`);

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: 'pixel-train-scenery',
    name: 'Pixel Train & Street',
    category: 'Pixel Art',
    url: PRESET_PIXEL_TRAIN,
    thumbnail: PRESET_PIXEL_TRAIN,
  },
  {
    id: 'misty-pine-forest',
    name: 'Misty Pine Forest',
    category: 'Nature',
    url: PRESET_MISTY_PINE,
    thumbnail: PRESET_MISTY_PINE,
  },
  {
    id: 'cyberpunk-neon-alley',
    name: 'Cyberpunk Alley',
    category: 'Cyberpunk',
    url: PRESET_CYBERPUNK_ALLEY,
    thumbnail: PRESET_CYBERPUNK_ALLEY,
  },
  {
    id: 'obsidian-emerald',
    name: 'Obsidian Emerald',
    category: 'Minimalist',
    url: PRESET_OBSIDIAN_EMERALD,
    thumbnail: PRESET_OBSIDIAN_EMERALD,
  },
  {
    id: 'aurora-night-sky',
    name: 'Aurora Night Sky',
    category: 'Nature',
    url: PRESET_AURORA_NIGHT,
    thumbnail: PRESET_AURORA_NIGHT,
  },
  {
    id: 'warm-amber-horizon',
    name: 'Warm Sunset Horizon',
    category: 'Minimalist',
    url: PRESET_WARM_HORIZON,
    thumbnail: PRESET_WARM_HORIZON,
  },
];
