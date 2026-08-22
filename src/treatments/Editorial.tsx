import React from 'react';
import { FRAME, CUT, span, easeOut } from '../motion/core';
import { TreatmentProps } from './types';

// Digital Collective. A typographic paper-first mark, built entirely from live
// type — no raster anywhere, so it stays sharp at any resolution.
//
// Intro: sequential editorial build.
// Outro: the build undoes itself in REVERSE ORDER — last element in is first
// out. An earlier version drove every element from one shared exit value,
// which made it a uniform fade rather than an un-build. Staggering is the
// whole point; without it this reads like a generic dissolve.

const T = {
  theIn: 8,
  dcIn: 16, dcLock: 28,
  ruleIn: 28, ruleOut: 42,
  nameIn: 38, nameOut: 56,
};

// Exit windows, reverse of build order.
const EXIT = {
  name: [56, 68],
  rule: [60, 72],
  dc: [64, 78],
  the: [68, 82],
} as const;

export const Editorial: React.FC<TreatmentProps> = ({ frame, entity, template, orientation }) => {
  const { W, H } = FRAME[orientation];
  const outro = template === 'outro';
  const vertical = orientation === 'vertical';
  if (frame >= CUT) return null;

  const cx = W / 2;
  const s = vertical ? 1.28 : 1.0;
  const theSize = 132 * s, dcSize = 400 * s, nameSize = 38 * s;
  const ruleW = 400 * s, ruleH = 13 * s;

  // Vertical recenters the stack rather than cropping the horizontal layout.
  const baseY = vertical ? H / 2 - 190 : 366;
  const yThe = baseY;
  const yDc = baseY + 324 * s;
  const yRule = baseY + 372 * s;
  const yName = baseY + 443 * s;

  const ex = (k: keyof typeof EXIT) =>
    outro ? easeOut(span(frame, EXIT[k][0], EXIT[k][1]), 2) : 0;

  const el: React.ReactNode[] = [];

  const eThe = ex('the');
  const theT = outro ? 1 : span(frame, T.theIn, T.theIn + 12);
  if ((outro || frame >= T.theIn) && eThe < 1) {
    const e = easeOut(theT);
    el.push(<text key="the" x={cx} y={yThe + 28 * (1 - e) - 40 * eThe} fill={entity.accent}
      textAnchor="middle" opacity={Math.min(1, theT * 1.8) * (1 - eThe)}
      style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 700, fontSize: theSize }}>
      the</text>);
  }

  // "DC" presses in from oversize and stops hard — struck, not dropped.
  // Letterpress doesn't bounce.
  const eDc = ex('dc');
  const dcT = outro ? 1 : span(frame, T.dcIn, T.dcLock);
  if ((outro || frame >= T.dcIn) && eDc < 1) {
    const e = easeOut(dcT, 4);
    const sc = (1.26 - 0.26 * e) * (1 + 0.14 * eDc);
    el.push(<g key="dc" transform={`translate(${cx},${yDc}) scale(${sc}) translate(${-cx},${-yDc})`}
      opacity={Math.min(1, dcT * 2.4) * (1 - eDc)}>
      <text x={cx} y={yDc} fill={entity.mark} textAnchor="middle"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: dcSize, letterSpacing: '-0.02em' }}>
        DC</text></g>);
  }

  // A printed rule is laid down, not faded in — and it closes back toward
  // center on the way out rather than fading.
  const eR = ex('rule');
  const ruleT = outro ? 1 : span(frame, T.ruleIn, T.ruleOut);
  if ((outro || frame >= T.ruleIn) && eR < 1) {
    const rw = ruleW * easeOut(ruleT, 2.6) * (1 - eR);
    el.push(<rect key="rule" x={cx - rw / 2} y={yRule} width={rw} height={ruleH} fill={entity.accent} />);
  }

  // Real letterspacing animation. Tracking opening up is the most editorial
  // move in typography; it collapses on exit.
  const eN = ex('name');
  const nameT = outro ? 1 : span(frame, T.nameIn, T.nameOut);
  if ((outro || frame >= T.nameIn) && eN < 1) {
    const e = easeOut(nameT, 2.2);
    const ls = (2 + 12 * e) * (1 - eN) + 2;
    el.push(<text key="name" x={cx} y={yName} fill={entity.mark} textAnchor="middle"
      opacity={Math.min(1, nameT * 2) * 0.88 * (1 - eN)}
      style={{ fontFamily: "'Red Hat Mono', monospace", fontSize: nameSize, letterSpacing: `${ls}px` }}>
      DIGITAL COLLECTIVE</text>);
  }

  return <>{el}</>;
};
