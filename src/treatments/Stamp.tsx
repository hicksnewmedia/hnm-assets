import React from 'react';
import { FRAME, CUT, prng, c01, span, easeIn } from '../motion/core';
import { TreatmentProps } from './types';

// Team No Sleep. A gold crest — the one mark in the network that responds to
// light.
//
// Intro: the seal is pressed and lands hard.
// Outro: the surface releases with a pulse and the seal is lifted up and out.
//
// The outro deliberately reuses the intro's vocabulary (flash, expanding
// ground ring) rather than inverting it. An earlier version contracted the
// ring inward, which meant nothing physically and faded out exactly when it
// should have been brightest. It also scaled the crest UP, which reads as
// arriving, not leaving.

const NAT_W = 417, NAT_H = 483;
const DROP_IN = 4, IMPACT = 14;
const SWEEP_IN = 38, SWEEP_OUT = 64;
const RELEASE = 56;

export const Stamp: React.FC<TreatmentProps> = ({
  frame, entity, template, orientation, markSrc = '/marks/tns-crest.png',
}) => {
  const { W, H } = FRAME[orientation];
  const outro = template === 'outro';
  if (frame >= CUT) return null;

  const targetH = orientation === 'vertical' ? 760 : 640;
  const bw = NAT_W * (targetH / NAT_H), bh = targetH;
  const cx = W / 2, cy = H / 2;
  const bx = cx - bw / 2, by = cy - bh / 2;
  const ground = cy + bh * 0.42;
  const src = markSrc;

  // d is frames since the defining event: impact on the intro, release on the
  // outro. Both drive a flash and an outward ground ring.
  const d = outro ? frame - RELEASE : frame - IMPACT;

  let scale: number | null = 1;
  let rise = 0;
  // The descent starts beyond frame so the seal rushes at camera. Vertical
  // needs a lower start: at 3.4x the crest is 1758px wide in a 1080 frame,
  // so the shield gets cropped off both edges and the mark is unreadable for
  // the first ten frames. Horizontal has the width to absorb that; vertical
  // doesn't.
  const startScale = orientation === 'vertical' ? 2.5 : 3.4;
  const travel = startScale - 1;
  if (outro) {
    const t = span(frame, RELEASE, CUT);
    rise = -easeIn(t, 1.9) * (H * 1.06);
    scale = 1 + 0.34 * easeIn(t, 1.9);
  } else if (frame < DROP_IN) {
    scale = null;
  } else if (frame < IMPACT) {
    scale = startScale - travel * (span(frame, DROP_IN, IMPACT) ** 2.3);
  } else if (d > 22) {
    scale = 1;
  } else {
    scale = 1 - 0.185 * Math.exp(-d / 6) * Math.sin((Math.PI * d) / 5);
  }

  const el: React.ReactNode[] = [];
  const defs: React.ReactNode[] = [
    <filter key="hot" id="tns-hot"><feColorMatrix type="matrix"
      values="2.1 0 0 0 0.18  0 2.1 0 0 0.18  0 0 2.1 0 0.18  0 0 0 1 0" /></filter>,
    <radialGradient key="bl" id="tns-bloom">
      <stop offset="0%" stopColor="#FFF3C4" stopOpacity="0.85" />
      <stop offset="50%" stopColor={entity.accent} stopOpacity="0.28" />
      <stop offset="100%" stopColor={entity.accent} stopOpacity="0" /></radialGradient>,
    <linearGradient key="fl" id="tns-flare" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor={entity.accent} stopOpacity="0" />
      <stop offset="26%" stopColor={entity.accent} stopOpacity="0.55" />
      <stop offset="50%" stopColor="#FFF3C4" stopOpacity="1" />
      <stop offset="74%" stopColor={entity.accent} stopOpacity="0.55" />
      <stop offset="100%" stopColor={entity.accent} stopOpacity="0" /></linearGradient>,
  ];

  let sx = 0, sy = 0;
  if (!outro && d >= 0 && d < 10) {
    const amp = 26 * Math.exp(-d / 3.2);
    sx = amp * (frame % 2 === 0 ? 1 : -1);
    sy = amp * 0.55 * (frame % 3 === 0 ? 1 : -1);
  }

  if (!outro && d >= 0 && d < 16) {
    const t = d / 16;
    const r = bw * (0.45 + 1.7 * (1 - (1 - t) ** 2));
    el.push(<ellipse key="bloom" cx={cx + sx} cy={cy + sy} rx={r} ry={r * 0.78}
      fill="url(#tns-bloom)" opacity={0.5 * (1 - t) ** 1.8} />);
  }

  // Ground-plane shockwaves, expanding outward in both templates. Flattened
  // hard so they read as a wave crossing a surface, not a halo in space.
  const life = outro ? 20 : 26;
  const rings: Array<[number, number, number]> = outro
    ? [[0, 1.0, 6], [4, 1.5, 3]]
    : [[0, 1.0, 7], [5, 1.6, 3.5]];
  rings.forEach(([delay, spd, wgt], ri) => {
    const rd = d - delay;
    if (rd < 0 || rd >= life) return;
    const t = rd / life;
    const r = bw * (0.3 + spd * (outro ? 1.5 : 1.6) * (1 - (1 - t) ** 2.2));
    el.push(<ellipse key={`r${ri}`} cx={cx + sx} cy={ground + sy} rx={r} ry={r * 0.2} fill="none"
      stroke={ri === 0 ? '#FFF3C4' : entity.accent}
      strokeWidth={wgt * (1 - t) + 0.8} opacity={(outro ? 0.8 : 0.85) * (1 - t) ** 1.3} />);
  });

  if (!outro && d >= 0 && d < 14) {
    const t = d / 14;
    const fw = W * (0.35 + 1.5 * (1 - (1 - t) ** 2.5));
    const fh = Math.max(2, 26 * (1 - t) ** 1.6);
    el.push(<rect key="flare" x={cx - fw / 2} y={cy - fh / 2 + sy} width={fw} height={fh}
      fill="url(#tns-flare)" opacity={(1 - t) ** 1.5} />);
  }

  if (!outro && d >= 0 && d < 34) {
    const t = d / 34;
    for (let k = 0; k < 16; k++) {
      const side = k % 2 === 0 ? 1 : -1;
      const spread = bw * (0.15 + prng(k, 13) * 1.35) * (1 - (1 - t) ** 1.8);
      const riseP = -70 * Math.sin(Math.PI * Math.min(1, t * 1.5)) * (0.4 + prng(k, 19));
      const sz = (3 + prng(k, 17) * 7) * (1 - t * 0.5);
      el.push(<rect key={`p${k}`} x={cx + side * spread} y={ground + riseP + t * t * 120}
        width={sz} height={sz * 0.42} fill={entity.accent} opacity={0.7 * (1 - t) ** 1.8} />);
    }
  }

  if (scale !== null) {
    const op = outro
      ? 1 - easeIn(span(frame, RELEASE + 8, CUT), 1.5)
      : (frame < DROP_IN + 3 ? c01((frame - DROP_IN) / 3) : 1);

    if (op > 0.01) {
      // Motion-blur trails, but ONLY while the crest is actually moving.
      // Rendering them on a locked frame stacks ghost copies under a still
      // mark and reads as a dirty render — motion blur with no motion.
      const moving = outro ? frame >= RELEASE + 2 : frame < IMPACT;
      if (moving) {
        for (let g = 1; g < (outro ? 4 : 5); g++) {
          // Trails follow the direction of travel: above on the descent,
          // below on the lift.
          const gy = outro ? rise + g * 52 : -g * 46;
          const gs = outro ? scale * (1 - g * 0.045) : scale * (1 + g * 0.14);
          el.push(<g key={`gh${g}`}
            transform={`translate(${cx},${cy + gy}) scale(${gs}) translate(${-cx},${-cy})`}
            opacity={(op * (outro ? 0.16 : 0.2)) / g}>
            <image href={src} x={bx} y={by} width={bw} height={bh} />
          </g>);
        }
      }

      el.push(
        <g key="crest"
          transform={`translate(${cx + sx},${cy + sy + rise}) scale(${scale}) translate(${-cx},${-cy})`}
          opacity={op}>
          <image href={src} x={bx} y={by} width={bw} height={bh} />
          {!outro && d >= 0 && d < 3 && (
            <g opacity={0.85 * (1 - d / 3)}>
              <image href={src} x={bx} y={by} width={bw} height={bh} filter="url(#tns-hot)" />
            </g>
          )}
          {!outro && frame >= SWEEP_IN && frame < SWEEP_OUT && (() => {
            const t = span(frame, SWEEP_IN, SWEEP_OUT);
            const band = bw * 0.32;
            const x = bx - band * 1.5 + (bw + band * 3) * t;
            return (<>
              <defs><clipPath id={`tns-sw-${frame}`}>
                <polygon points={`${x},${by - 70} ${x + band},${by - 70} ${x + band - band * 0.6},${by + bh + 70} ${x - band * 0.6},${by + bh + 70}`} />
              </clipPath></defs>
              <g clipPath={`url(#tns-sw-${frame})`} opacity={Math.sin(Math.PI * t) ** 0.6}>
                <image href={src} x={bx} y={by} width={bw} height={bh} filter="url(#tns-hot)" />
              </g>
            </>);
          })()}
        </g>
      );
    }
  }

  // Flash: full-force on impact, gentler on release.
  const flashLife = outro ? 4 : 3;
  if (d >= 0 && d < flashLife) {
    el.push(<rect key="flash" width={W} height={H} fill="#FFF3C4"
      opacity={(outro ? 0.3 : 0.5) * (1 - d / flashLife) ** 1.6} />);
  }

  return <><defs>{defs}</defs>{el}</>;
};
