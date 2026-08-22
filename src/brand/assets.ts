// The reference half of the repository. The Studio generates idents; this is
// where the fixed brand material lives — marks, palettes, type — so there is
// one place to grab an HNM SVG or check a hex value.
//
// The HNM marks are generated from the SAME coordinates the renderer animates
// (see BARS / SQUARE in src/treatments/Glitch.tsx). They cannot drift from
// the motion.

export interface BrandAsset {
  file: string;
  label: string;
  note: string;
  /** Preview tile background, so light marks aren't invisible on light. */
  on: 'dark' | 'light';
}

export interface Swatch {
  name: string;
  hex: string;
  role: string;
}

export interface BrandKit {
  entityId: string;
  name: string;
  tagline: string;
  palette: Swatch[];
  assets: BrandAsset[];
}

export const BRAND_KITS: BrandKit[] = [
  {
    entityId: 'hnm',
    name: 'HicksNewMedia',
    tagline: 'Network master · glitch resolve',
    palette: [
      { name: 'Signal', hex: '#F48022', role: 'Primary accent — the bar and the period' },
      { name: 'Paper', hex: '#F5F1EB', role: 'Mark on dark, light surfaces' },
      { name: 'Ink', hex: '#0A0A0A', role: 'Ident background, mark on light' },
      { name: 'Signal Deep', hex: '#B45309', role: 'Orange as text — signal fails contrast on paper' },
    ],
    assets: [
      { file: '/brand/hnm/hnm-lockup-horizontal.svg', label: 'Horizontal lockup', note: 'Mark, rule, wordmark. Primary signature.', on: 'dark' },
      { file: '/brand/hnm/hnm-mark-on-dark.svg', label: 'Mark — on dark', note: 'Paper bars, signal accent.', on: 'dark' },
      { file: '/brand/hnm/hnm-mark-on-light.svg', label: 'Mark — on light', note: 'Ink bars, signal accent.', on: 'light' },
      { file: '/brand/hnm/hnm-mark-mono-paper.svg', label: 'Mono — paper', note: 'Single color, for busy backgrounds.', on: 'dark' },
      { file: '/brand/hnm/hnm-mark-mono-ink.svg', label: 'Mono — ink', note: 'Single color, for light backgrounds.', on: 'light' },
      { file: '/brand/hnm/hnm-mark-currentcolor.svg', label: 'currentColor', note: 'Inherits CSS color. Use inline in web.', on: 'light' },
    ],
  },
  {
    entityId: 'tns',
    name: 'Team No Sleep',
    tagline: 'Sports and culture · gold stamp',
    palette: [
      { name: 'Crest Gold', hex: '#F3DC7D', role: 'Primary — crest highlight and shockwave' },
      { name: 'Deep Gold', hex: '#A97F34', role: 'Crest shadow, gradient floor' },
      { name: 'Hot White', hex: '#FFF3C4', role: 'Impact flash and light sweep' },
      { name: 'Ink', hex: '#0A0A0A', role: 'Ident background' },
      { name: 'Paper', hex: '#F5F1EB', role: '"NO SLEEP" lettering' },
    ],
    assets: [
      { file: '/brand/tns/tns-crest.png', label: 'Crest', note: 'Gold emblem, transparent. Built for dark backgrounds.', on: 'dark' },
    ],
  },
  {
    entityId: 'dc',
    name: 'Digital Collective',
    tagline: 'Resource library · editorial build',
    palette: [
      { name: 'Signal', hex: '#F48022', role: 'Accent — the italic "the" and the rule' },
      { name: 'Card Paper', hex: '#ECE8E2', role: 'Logo card stock' },
      { name: 'Deep Ink', hex: '#060606', role: 'The "DC" letterforms' },
      { name: 'Mono Gray', hex: '#74726F', role: 'DIGITAL COLLECTIVE line' },
    ],
    assets: [
      { file: '/brand/dc/dc-logo.png', label: 'Card logo', note: 'Paper card with frame. Ink on paper.', on: 'light' },
    ],
  },
  {
    entityId: 'vibecode',
    name: 'vibe.code',
    tagline: 'Building in public · terminal type',
    palette: [
      { name: 'Vibe Cyan', hex: '#00C6EE', role: 'The dot and the cursor. The only color used.' },
      { name: 'Slate', hex: '#1A2530', role: 'Ident background' },
      { name: 'Terminal Paper', hex: '#ECE8E2', role: 'Wordmark type' },
    ],
    assets: [
      { file: '/brand/vibecode/vibecode-logo.png', label: 'Wordmark', note: 'Monospace lockup on slate.', on: 'dark' },
    ],
  },
];

export interface TypeFace { role: string; family: string; note: string; }

export const TYPE_STACK: TypeFace[] = [
  { role: 'Display', family: 'Bebas Neue', note: 'Headlines and the HNM wordmark in motion' },
  { role: 'Body', family: 'Geist', note: 'Interface and running text' },
  { role: 'Mono', family: 'Red Hat Mono', note: 'Labels, data, the vibe.code wordmark' },
  { role: 'Accent', family: 'Fraunces', note: 'Editorial italic — the DC "the"' },
];

/** Every ident this system can produce, as a flat list. */
export const IDENT_MATRIX = (() => {
  const out: Array<{ entity: string; template: string; orientation: string; command: string }> = [];
  for (const e of ['hnm', 'tns', 'dc', 'vibecode'])
    for (const t of ['intro', 'outro'])
      for (const o of ['horizontal', 'vertical'])
        out.push({
          entity: e, template: t, orientation: o,
          command: `node render/render.mjs --entity ${e} --template ${t} --orientation ${o} --audio silent --format master`,
        });
  return out;
})();
