export type Treatment = 'glitch' | 'stamp' | 'editorial' | 'terminal';

export interface BrandEntity {
  id: string;
  name: string;
  treatment: Treatment;
  accent: string;
  mark: string;
  bg: string;
  /** Frame the sound cue fires on, per template. Silent renders ignore this. */
  cue: { intro: number; outro: number };
}

export const TOKENS = {
  paper: '#F5F1EB',
  ink: '#0A0A0A',
  signal: '#F48022',
  tnsGold: '#F3DC7D',
  vibeSlate: '#1A2530',
  vibeCyan: '#00C6EE',
} as const;

// Four brands. THE TEK STACK and tek FORUM were dropped from this system.
//
// Each carries its own treatment because motion is derived from the mark's
// own material — bars slice, gold takes light, paper registers, monospace
// types. Swapping any treatment onto another brand would be wrong the same
// way putting HNM's logo on Team No Sleep was wrong.
export const ENTITIES: BrandEntity[] = [
  {
    id: 'hnm',
    name: 'HicksNewMedia',
    treatment: 'glitch',
    accent: TOKENS.signal,
    mark: TOKENS.paper,
    bg: TOKENS.ink,
    cue: { intro: 32, outro: 60 },
  },
  {
    id: 'tns',
    name: 'Team No Sleep',
    treatment: 'stamp',
    accent: TOKENS.tnsGold,
    mark: TOKENS.paper,
    bg: TOKENS.ink,
    cue: { intro: 14, outro: 20 },
  },
  {
    id: 'dc',
    name: 'Digital Collective',
    treatment: 'editorial',
    accent: TOKENS.signal,
    mark: TOKENS.paper,
    bg: TOKENS.ink,
    cue: { intro: 16, outro: 18 },
  },
  {
    id: 'vibecode',
    name: 'vibe.code',
    treatment: 'terminal',
    accent: TOKENS.vibeCyan,
    mark: '#ECE8E2',
    bg: TOKENS.vibeSlate,
    cue: { intro: 8, outro: 10 },
  },
];

export const byId = (id: string): BrandEntity => {
  const e = ENTITIES.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown entity: ${id}. Known: ${ENTITIES.map((x) => x.id).join(', ')}`);
  return e;
};
