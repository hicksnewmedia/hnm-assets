export interface BrandEntity {
  id: string;
  name: string;
  /** Wordmark split into three parts: the middle one takes the accent color. */
  parts: [string, string, string];
  accent: string;
  mark: string;
  bg: string;
  url: string;
}

export const TOKENS = {
  paper: '#F5F1EB',
  ink: '#0A0A0A',
  signal: '#F48022',
  signalDeep: '#D96A14',
  ocean: '#20557B',
  tnsGold: '#A97F34',
  tnsGoldBright: '#F4C668',
} as const;

// Adding a show means adding an object here. Templates never change.
// Note: tek FORUM uses #FF6A00, which is NOT the HNM signal orange
// (#F48022). They are different oranges on purpose — don't merge them.
export const ENTITIES: BrandEntity[] = [
  {
    id: 'hnm', name: 'HicksNewMedia', parts: ['Hicks', 'New', 'Media'],
    accent: TOKENS.signal, mark: TOKENS.paper, bg: TOKENS.ink, url: 'hicksnewmedia.com',
  },
  {
    id: 'tns', name: 'Team No Sleep', parts: ['Team ', 'No', ' Sleep'],
    accent: TOKENS.tnsGoldBright, mark: TOKENS.paper, bg: TOKENS.ink, url: 'hnm.live',
  },
  {
    id: 'tekstack', name: 'THE TEK STACK', parts: ['THE ', 'TEK', ' STACK'],
    accent: TOKENS.signal, mark: TOKENS.paper, bg: TOKENS.ink, url: 'hicksnewmedia.com',
  },
  {
    id: 'tekforum', name: 'tek FORUM', parts: ['tek ', 'FOR', 'UM'],
    accent: '#FF6A00', mark: TOKENS.paper, bg: TOKENS.ink, url: 'tek.forum',
  },
  {
    id: 'dc', name: 'Digital Collective', parts: ['Digital ', 'Coll', 'ective'],
    accent: TOKENS.ocean, mark: TOKENS.paper, bg: TOKENS.ink, url: 'digitalcollective.media',
  },
];

export const byId = (id: string): BrandEntity => {
  const e = ENTITIES.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown entity: ${id}. Known: ${ENTITIES.map((x) => x.id).join(', ')}`);
  return e;
};
