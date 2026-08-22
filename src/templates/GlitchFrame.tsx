import React from 'react';
import { BrandEntity } from '../brand/entities';
import {
  TIMING, markSlices, tearSlices, textBands, wordAmplitude, TemplateTiming,
} from '../motion/core';

export type TemplateKey = 'intro' | 'outro' | 'lowerThird';
export type Orientation = 'horizontal' | 'vertical';

export interface FrameProps {
  frame: number;
  entity: BrandEntity;
  templateKey: TemplateKey;
  orientation: Orientation;
  name?: string;
  role?: string;
  transparent?: boolean;
}

interface Layout {
  W: number; H: number; scale: number;
  markX: number; markY: number;
  textX: number; textY: number; fontSize: number;
  subSize: number; subY: number;
  anchor: 'start' | 'middle';
  divider?: { x: number; y: number; h: number };
}

// Mark content occupies x 26..194 (width 168) and y 30..150 (height 120)
// inside its own 220x180 space. Every layout below is derived from those
// numbers rather than eyeballed, so the mark and the text cannot collide.
const MARK_CONTENT = { left: 26, right: 194, top: 30, bottom: 150 };

function layoutFor(templateKey: TemplateKey, orientation: Orientation): Layout {
  const vertical = orientation === 'vertical';
  const W = vertical ? 1080 : 1920;
  const H = vertical ? 1920 : 1080;

  if (templateKey === 'lowerThird') {
    // Lower third: mark sits left, text block sits to its right, separated
    // by a divider rule. Laid out left-to-right from a fixed inset so the
    // two never overlap regardless of name length.
    const scale = vertical ? 0.85 : 0.9;
    const inset = vertical ? W * 0.08 : W * 0.0625;
    const markW = (MARK_CONTENT.right - MARK_CONTENT.left) * scale;
    const markH = (MARK_CONTENT.bottom - MARK_CONTENT.top) * scale;
    const markTop = H * (vertical ? 0.78 : 0.759);
    const gutter = vertical ? 28 : 40;

    const dividerX = inset + markW + gutter / 2;
    const textLeft = dividerX + gutter / 2;
    const fontSize = Math.round(W * (vertical ? 0.058 : 0.0344));
    const subSize = Math.round(fontSize * 0.36);
    // Name and role centred as a block against the mark's vertical centre.
    const blockCenter = markTop + markH / 2;

    return {
      W, H, scale,
      markX: inset - MARK_CONTENT.left * scale,
      markY: markTop - MARK_CONTENT.top * scale,
      textX: textLeft,
      textY: blockCenter + fontSize * 0.12,
      subSize,
      subY: blockCenter + fontSize * 0.12 + subSize * 1.7,
      fontSize,
      anchor: 'start',
      divider: { x: dividerX, y: markTop - 4, h: markH + 8 },
    };
  }

  if (vertical) {
    // Stacked and centred. Content sits in the 36-64% band so platform UI
    // (captions, follow button) never covers anything brand-critical.
    const scale = 2.8;
    const fontSize = 92;
    return {
      W, H, scale,
      markX: 540 - 110 * scale,
      markY: 700 - MARK_CONTENT.top * scale,
      textX: 540, textY: 1215, fontSize,
      subSize: Math.round(fontSize * 0.24),
      subY: 1215 + fontSize * 0.62,
      anchor: 'middle',
    };
  }

  const scale = 1.9;
  const fontSize = 104;
  return {
    W, H, scale,
    markX: 520, markY: 390,
    textX: 960, textY: 600, fontSize,
    subSize: Math.round(fontSize * 0.24),
    subY: 600 + fontSize * 0.62,
    anchor: 'start',
  };
}

export const GlitchFrame: React.FC<FrameProps> = ({
  frame, entity, templateKey, orientation, name = '', role = '', transparent = false,
}) => {
  const t: TemplateTiming = TIMING[templateKey];
  const L = layoutFor(templateKey, orientation);
  const isLT = templateKey === 'lowerThird';
  const past = frame >= t.cut;

  const wamp = past ? null : wordAmplitude(frame, t);
  const settled = wamp !== null && wamp < 0.5;
  const sub = isLT ? role : entity.url;

  const wordmark = (
    <>
      {entity.parts[0]}
      <tspan fill={entity.accent}>{entity.parts[1]}</tspan>
      {entity.parts[2]}
      <tspan fill={entity.accent}>.</tspan>
    </>
  );
  const headline = isLT ? name : wordmark;

  const textStyle: React.CSSProperties = {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: L.fontSize,
    letterSpacing: '0.01em',
  };

  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {!transparent && !isLT && <rect width={L.W} height={L.H} fill={entity.bg} />}

      {!past && !isLT &&
        tearSlices(frame, t, L.H, entity.accent, entity.mark).map((s, i) => (
          <rect key={`t${i}`} x={0} y={s.y} width={L.W} height={s.h} fill={s.fill} opacity={s.opacity} />
        ))}

      {!past && (
        <g transform={`translate(${L.markX},${L.markY}) scale(${L.scale})`}>
          {markSlices(frame, t, entity.accent, entity.mark).map((s, i) => (
            <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} opacity={s.opacity} />
          ))}
        </g>
      )}

      {!past && L.divider && settled && (
        <rect x={L.divider.x} y={L.divider.y} width={2} height={L.divider.h}
          fill={entity.accent} opacity={0.5} />
      )}

      {!past && wamp !== null && (
        settled ? (
          <text x={L.textX} y={L.textY} fill={entity.mark} textAnchor={L.anchor} style={textStyle}>
            {headline}
          </text>
        ) : (
          <>
            <defs>
              {textBands(frame, wamp).map((_, b) => (
                <clipPath key={b} id={`cp-${templateKey}-${frame}-${b}`}>
                  <rect x={0}
                    y={L.textY - L.fontSize + L.fontSize * 0.12 + b * (L.fontSize / 7)}
                    width={L.W} height={L.fontSize / 7} />
                </clipPath>
              ))}
            </defs>
            {textBands(frame, wamp).map((band, b) => (
              <g key={b} clipPath={`url(#cp-${templateKey}-${frame}-${b})`}>
                <text x={L.textX + band.dx} y={L.textY} fill={entity.mark}
                  textAnchor={L.anchor} style={textStyle} opacity={band.opacity}>
                  {headline}
                </text>
              </g>
            ))}
          </>
        )
      )}

      {!past && sub && settled && (
        <text x={L.textX} y={L.subY} fill={entity.mark} textAnchor={L.anchor} opacity={0.62}
          style={{
            fontFamily: "'Red Hat Mono', monospace",
            fontSize: L.subSize,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
          {sub}
        </text>
      )}
    </svg>
  );
};
