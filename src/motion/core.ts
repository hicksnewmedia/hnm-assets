// MOTION CORE — pure functions, zero dependencies.
// Imported by the Remotion render pipeline AND the browser studio.
// This is why a preview and a master are frame-identical: they run this
// exact code. Change the easing here and both change together.

export interface TemplateTiming {
  duration: number;
  glitchIn: number;
  lock: number;
  wordIn: number;
  wordLock: number;
  cut: number;
  inverted: boolean; // outro destabilizes instead of resolving
}

export const TIMING: Record<string, TemplateTiming> = {
  intro: { duration: 90, glitchIn: 6, lock: 32, wordIn: 30, wordLock: 40, cut: 84, inverted: false },
  outro: { duration: 90, glitchIn: 60, lock: 0, wordIn: 0, wordLock: 8, cut: 86, inverted: true },
  lowerThird: { duration: 150, glitchIn: 0, lock: 14, wordIn: 6, wordLock: 18, cut: 144, inverted: false },
};

export const FPS = 30;
export const MAX_AMPLITUDE = 110;
export const MAX_WORD_AMPLITUDE = 70;

// Seeded PRNG (FNV-1a derived). Deliberately NOT Math.random(): brand
// masters must be reproducible. Frame 18 glitches the same way on every
// render, on every machine, forever. Without this you can never re-cut
// a master that matches one you shipped six months ago.
export function prng(...seeds: number[]): number {
  let h = 2166136261;
  for (const s of seeds) {
    h ^= Math.floor(s) & 0xffffffff;
    h = Math.imul(h, 16777619) & 0xffffffff;
  }
  return ((h >>> 0) % 10000) / 10000;
}

export const quant = (v: number, step = 4): number => Math.round(v / step) * step;
export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

export function markAmplitude(frame: number, t: TemplateTiming): number {
  if (t.inverted) {
    if (frame < t.glitchIn) return 0;
    return clamp01((frame - t.glitchIn) / (t.cut - t.glitchIn)) ** 1.3 * MAX_AMPLITUDE;
  }
  if (frame < t.glitchIn || frame >= t.lock) return 0;
  return (1 - (frame - t.glitchIn) / (t.lock - t.glitchIn)) ** 1.4 * MAX_AMPLITUDE;
}

// Returns null when the wordmark hasn't entered the frame yet.
export function wordAmplitude(frame: number, t: TemplateTiming): number | null {
  if (t.inverted) {
    if (frame < t.glitchIn) return 0;
    return clamp01((frame - t.glitchIn) / (t.cut - t.glitchIn)) ** 1.3 * MAX_WORD_AMPLITUDE;
  }
  if (frame < t.wordIn) return null;
  return (1 - clamp01((frame - t.wordIn) / (t.wordLock - t.wordIn))) ** 1.4 * MAX_WORD_AMPLITUDE;
}

// Mark geometry copied exactly from hnm-mark-on-dark.svg in Drive.
export const BARS = [
  { x: 26, y: 30, w: 120, h: 24, accent: false },
  { x: 26, y: 78, w: 168, h: 24, accent: true },
  { x: 26, y: 126, w: 120, h: 24, accent: false },
];

export const SQUARE = { x: 170, y: 126, w: 24, h: 24 };

export interface Slice {
  x: number; y: number; w: number; h: number; fill: string; opacity: number;
}

// Resolves one frame of the mark into flat drawable slices.
export function markSlices(
  frame: number, t: TemplateTiming, accent: string, mark: string,
): Slice[] {
  const amp = markAmplitude(frame, t);
  const inst = amp / MAX_AMPLITUDE;
  const out: Slice[] = [];

  BARS.forEach((b, bi) => {
    const raw = (prng(frame, bi, 5) - 0.5) * 2 * amp;
    const dx = quant(raw);
    const corrupt = inst > 0.08 && prng(frame, bi, 91) > 0.78;
    const fill = b.accent || corrupt ? accent : mark;
    const w = b.w * (1 + (prng(frame, bi, 41) - 0.5) * 0.55 * inst);

    if (inst > 0.04) {
      const gdx = quant(raw + (prng(frame, bi, 63) - 0.5) * amp * 0.7);
      out.push({
        x: b.x + gdx, y: b.y, w, h: b.h,
        fill: fill === accent ? mark : accent,
        opacity: 0.55 * inst + 0.2,
      });
      if (prng(frame, bi, 84) > 0.5) {
        out.push({
          x: b.x + quant(raw + (prng(frame, bi, 96) - 0.5) * amp),
          y: b.y + prng(frame, bi, 12) * (b.h - 8),
          w, h: 8, fill, opacity: 0.85,
        });
      }
    }
    out.push({ x: b.x + dx, y: b.y, w, h: b.h, fill, opacity: 1 });
  });

  const locked = t.inverted ? frame < t.glitchIn : frame >= t.lock;
  if (locked) {
    out.push({ x: SQUARE.x, y: SQUARE.y, w: SQUARE.w, h: SQUARE.h, fill: accent, opacity: 1 });
  } else if (inst > 0.1) {
    out.push({
      x: SQUARE.x + quant((prng(frame, 9, 7) - 0.5) * 50),
      y: SQUARE.y, w: SQUARE.w, h: SQUARE.h, fill: accent, opacity: 0.6,
    });
  }
  return out;
}

export interface Tear { y: number; h: number; fill: string; opacity: number; }

export function tearSlices(
  frame: number, t: TemplateTiming, height: number, accent: string, mark: string,
): Tear[] {
  const inst = markAmplitude(frame, t) / MAX_AMPLITUDE;
  if (inst <= 0.02) return [];
  const out: Tear[] = [];
  const n = Math.floor(14 * inst) + 3;
  for (let k = 0; k < n; k++) {
    if (prng(frame, k, 77) > 0.35) {
      out.push({
        y: prng(frame, k, 11) * height,
        h: 2 + prng(frame, k, 22) * 8,
        fill: prng(frame, k, 55) > 0.6 ? accent : mark,
        opacity: (0.06 + prng(frame, k, 33) * 0.22) * inst,
      });
    }
  }
  return out;
}

export interface TextBand { dx: number; opacity: number; }

export function textBands(frame: number, wamp: number, bands = 8): TextBand[] {
  return Array.from({ length: bands }, (_, b) => ({
    dx: quant((prng(frame, b, 17) - 0.5) * 2 * wamp),
    opacity: prng(frame, b, 29) > 0.18 ? 1 : 0.3,
  }));
}
