// MOTION CORE — shared primitives only.
// Each brand's actual treatment lives in src/motion/treatments/.
//
// The unifying grammar across the network is NOT one effect. It's timing:
// 90 frames at 30fps, resolve into stillness, hard cut — never a fade.
// The effect itself is derived from each mark's own material.

export const FPS = 30;
export const DURATION = 90;
export const CUT = 84;

export type TemplateKey = 'intro' | 'outro';
export type Orientation = 'horizontal' | 'vertical';

export interface Frame {
  W: number;
  H: number;
}

export const FRAME: Record<Orientation, Frame> = {
  horizontal: { W: 1920, H: 1080 },
  vertical: { W: 1080, H: 1920 },
};

// Seeded PRNG (FNV-1a derived). Deliberately NOT Math.random(): masters must
// be byte-reproducible. Frame 18 must glitch the same way on every render, on
// every machine, forever — otherwise you can never re-cut a master to match
// one you shipped six months ago.
export function prng(...seeds: number[]): number {
  let h = 2166136261;
  for (const s of seeds) {
    h ^= Math.floor(s) & 0xffffffff;
    h = Math.imul(h, 16777619) & 0xffffffff;
  }
  return ((h >>> 0) % 10000) / 10000;
}

export const quant = (v: number, step = 4): number => Math.round(v / step) * step;
export const c01 = (x: number): number => Math.max(0, Math.min(1, x));
export const easeOut = (t: number, p = 3): number => 1 - (1 - c01(t)) ** p;
export const easeIn = (t: number, p = 2.3): number => c01(t) ** p;

/** Normalised 0..1 progress across an inclusive frame window. */
export const span = (frame: number, from: number, to: number): number =>
  c01((frame - from) / (to - from));

/**
 * Outros are their intros reversed in meaning, not played backwards.
 * Each treatment decides what "leaving" means for its own material.
 */
export const isOutro = (t: TemplateKey): boolean => t === 'outro';
