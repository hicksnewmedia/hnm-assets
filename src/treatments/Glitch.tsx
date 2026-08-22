import React from 'react';
import { FRAME, CUT, prng, quant, span } from '../motion/core';
import { TreatmentProps } from './types';

// HicksNewMedia. The mark is three horizontal bars — it already looks like a
// signal frozen mid-displacement. Intro resolves the corruption into the mark;
// outro destabilises the locked mark back into slices.

const BARS = [
  { x: 26, y: 30, w: 120, h: 24, accent: false },
  { x: 26, y: 78, w: 168, h: 24, accent: true },
  { x: 26, y: 126, w: 120, h: 24, accent: false },
];
const SQUARE = { x: 170, y: 126, w: 24, h: 24 };
const MAX_AMP = 110;

const T = {
  intro: { glitchIn: 6, lock: 32, wordIn: 30, wordLock: 40 },
  outro: { destabilise: 60 },
};

function amplitude(frame: number, outro: boolean): number {
  if (outro) {
    if (frame < T.outro.destabilise) return 0;
    return span(frame, T.outro.destabilise, CUT) ** 1.3 * MAX_AMP;
  }
  if (frame < T.intro.glitchIn || frame >= T.intro.lock) return 0;
  return (1 - span(frame, T.intro.glitchIn, T.intro.lock)) ** 1.4 * MAX_AMP;
}

function wordAmp(frame: number, outro: boolean): number | null {
  if (outro) {
    if (frame < T.outro.destabilise) return 0;
    return span(frame, T.outro.destabilise, CUT) ** 1.3 * 70;
  }
  if (frame < T.intro.wordIn) return null;
  return (1 - span(frame, T.intro.wordIn, T.intro.wordLock)) ** 1.4 * 70;
}

export const Glitch: React.FC<TreatmentProps> = ({ frame, entity, template, orientation }) => {
  const { W, H } = FRAME[orientation];
  const outro = template === 'outro';
  const vertical = orientation === 'vertical';
  if (frame >= CUT) return null;

  const amp = amplitude(frame, outro);
  const inst = amp / MAX_AMP;
  const wamp = wordAmp(frame, outro);

  const scale = vertical ? 2.8 : 1.9;
  const markX = vertical ? 540 - 110 * scale : 520;
  const markY = vertical ? 700 - 30 * scale : 390;
  const fontSize = vertical ? 92 : 104;
  const textX = vertical ? 540 : 960;
  const textY = vertical ? 1215 : 600;
  const anchor = vertical ? 'middle' : 'start';

  const el: React.ReactNode[] = [];

  // Full-frame tearing while unstable
  if (inst > 0.02) {
    const n = Math.floor(14 * inst) + 3;
    for (let k = 0; k < n; k++) {
      if (prng(frame, k, 77) > 0.35) {
        el.push(<rect key={`t${k}`} x={0} y={prng(frame, k, 11) * H} width={W}
          height={2 + prng(frame, k, 22) * 8}
          fill={prng(frame, k, 55) > 0.6 ? entity.accent : entity.mark}
          opacity={(0.06 + prng(frame, k, 33) * 0.22) * inst} />);
      }
    }
  }

  const bars: React.ReactNode[] = [];
  const showBars = outro || frame >= T.intro.glitchIn;
  if (showBars) {
    BARS.forEach((b, bi) => {
      const raw = (prng(frame, bi, 5) - 0.5) * 2 * amp;
      const dx = quant(raw);
      const corrupt = inst > 0.08 && prng(frame, bi, 91) > 0.78;
      const fill = b.accent || corrupt ? entity.accent : entity.mark;
      const w = b.w * (1 + (prng(frame, bi, 41) - 0.5) * 0.55 * inst);
      if (inst > 0.04) {
        bars.push(<rect key={`g${bi}`} x={b.x + quant(raw + (prng(frame, bi, 63) - 0.5) * amp * 0.7)}
          y={b.y} width={w} height={b.h}
          fill={fill === entity.accent ? entity.mark : entity.accent}
          opacity={0.55 * inst + 0.2} />);
        if (prng(frame, bi, 84) > 0.5) {
          bars.push(<rect key={`s${bi}`} x={b.x + quant(raw + (prng(frame, bi, 96) - 0.5) * amp)}
            y={b.y + prng(frame, bi, 12) * (b.h - 8)} width={w} height={8} fill={fill} opacity={0.85} />);
        }
      }
      bars.push(<rect key={`b${bi}`} x={b.x + dx} y={b.y} width={w} height={b.h} fill={fill} />);
    });
    const locked = outro ? frame < T.outro.destabilise : frame >= T.intro.lock;
    if (locked) {
      bars.push(<rect key="sq" x={SQUARE.x} y={SQUARE.y} width={SQUARE.w} height={SQUARE.h} fill={entity.accent} />);
    } else if (inst > 0.1) {
      bars.push(<rect key="sqg" x={SQUARE.x + quant((prng(frame, 9, 7) - 0.5) * 50)} y={SQUARE.y}
        width={SQUARE.w} height={SQUARE.h} fill={entity.accent} opacity={0.6} />);
    }
  }
  el.push(<g key="mark" transform={`translate(${markX},${markY}) scale(${scale})`}>{bars}</g>);

  if (wamp !== null) {
    const style: React.CSSProperties = {
      fontFamily: "'Bebas Neue', sans-serif", fontSize, letterSpacing: '0.01em',
    };
    const label = (<>Hicks<tspan fill={entity.accent}>New</tspan>Media<tspan fill={entity.accent}>.</tspan></>);
    if (wamp < 0.5) {
      el.push(<text key="wm" x={textX} y={textY} fill={entity.mark} textAnchor={anchor} style={style}>{label}</text>);
    } else {
      const bands = 8;
      const bh = fontSize / 7;
      const top = textY - fontSize + fontSize * 0.12;
      el.push(<defs key="d">{Array.from({ length: bands }, (_, b) => (
        <clipPath key={b} id={`gcp-${frame}-${b}`}>
          <rect x={0} y={top + b * bh} width={W} height={bh} />
        </clipPath>))}</defs>);
      for (let b = 0; b < bands; b++) {
        el.push(<g key={`wb${b}`} clipPath={`url(#gcp-${frame}-${b})`}>
          <text x={textX + quant((prng(frame, b, 17) - 0.5) * 2 * wamp)} y={textY}
            fill={entity.mark} textAnchor={anchor} style={style}
            opacity={prng(frame, b, 29) > 0.18 ? 1 : 0.3}>{label}</text>
        </g>);
      }
    }
  }

  return <>{el}</>;
};
