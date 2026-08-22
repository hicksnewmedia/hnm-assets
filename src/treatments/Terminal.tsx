import React from 'react';
import { FRAME, CUT, span } from '../motion/core';
import { TreatmentProps } from './types';

// vibe.code. A building-in-public show, so the motion is making rather than
// breaking — glitch would say "something malfunctioned", which is the wrong
// story.
//
// Intro: types the mark in.
// Outro: backspaces it away. The session ends, it doesn't crash.

const FULL = 'vibe.code';
const T = {
  type1In: 8, type1Out: 26,
  dot: 32,
  type2In: 36, type2Out: 56,
  delIn: 58, delOut: 78,
};

export const Terminal: React.FC<TreatmentProps> = ({ frame, entity, template, orientation }) => {
  const { W, H } = FRAME[orientation];
  const outro = template === 'outro';
  if (frame >= CUT) return null;

  // Vertical needs a larger face: at 128 the wordmark filled only 64% of a
  // 1080-wide frame and read as a thin strip lost in 1920px of height.
  const fs = orientation === 'vertical' ? 165 : 150;
  const cw = fs * 0.602; // monospace advance
  const x0 = (W - FULL.length * cw) / 2;
  const baseline = H / 2 + fs * 0.32;

  let n: number;
  if (outro) {
    n = frame < T.delIn ? FULL.length
      : Math.max(0, FULL.length - Math.ceil(span(frame, T.delIn, T.delOut) * FULL.length));
  } else if (frame < T.type1In) n = 0;
  else if (frame < T.type1Out) n = Math.min(4, Math.floor(span(frame, T.type1In, T.type1Out) * 4) + 1);
  else if (frame < T.dot) n = 4;
  else if (frame < T.type2In) n = 5;
  else if (frame < T.type2Out) n = Math.min(9, 5 + Math.floor(span(frame, T.type2In, T.type2Out) * 4) + 1);
  else n = 9;

  const el: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const ch = FULL[i];
    const isDot = ch === '.';
    const cxp = x0 + i * cw + cw / 2;
    const pop = !outro && isDot && frame >= T.dot && frame < T.dot + 3;
    el.push(<text key={i} x={cxp} y={baseline} fill={isDot ? entity.accent : entity.mark}
      textAnchor="middle"
      transform={pop ? `translate(${cxp},${baseline}) scale(1.35) translate(${-cxp},${-baseline})` : undefined}
      style={{ fontFamily: "'Red Hat Mono', monospace", fontWeight: 700, fontSize: fs }}>{ch}</text>);
  }

  // Solid while actively typing or deleting, blinking when idle — exactly how
  // a real terminal behaves.
  //
  // The cleared state also holds the cursor solid. Relying on the blink cycle
  // there left six cursorless frames before the cut, because the phase happened
  // to land off. A terminal is never cursorless, and ending on an empty frame
  // is a dead hole rather than a resolution.
  const active = outro
    ? frame >= T.delIn && frame < T.delOut
    : (frame >= T.type1In && frame < T.type1Out) || (frame >= T.type2In && frame < T.type2Out);
  const cleared = outro && frame >= T.delOut;
  const blink = Math.floor(frame / 15) % 2 === 0;

  if (active || cleared || blink) {
    el.push(<rect key="cur" x={x0 + n * cw} y={baseline - fs * 0.7} width={cw * 0.85} height={fs * 0.72}
      fill={entity.accent} opacity={active || cleared ? 0.9 : 0.75} />);
  }

  return <>{el}</>;
};
