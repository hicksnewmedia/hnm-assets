import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { loadFont as loadBebas } from '@remotion/google-fonts/BebasNeue';
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces';
import { loadFont as loadMono } from '@remotion/google-fonts/RedHatMono';
import { byId, BrandEntity } from './brand/entities';
import { FRAME, TemplateKey, Orientation } from './motion/core';
import { Glitch } from './treatments/Glitch';
import { Stamp } from './treatments/Stamp';
import { Editorial } from './treatments/Editorial';
import { Terminal } from './treatments/Terminal';

// Fonts load inside Remotion's browser — a face installed on your Mac is not
// automatically available to the renderer.
loadBebas();
loadFraunces();
loadMono();

const TREATMENTS = { glitch: Glitch, stamp: Stamp, editorial: Editorial, terminal: Terminal };

export interface IdentProps {
  entityId: string;
  template: TemplateKey;
  orientation: Orientation;
  /** Renders the sound cue. Silent variants leave this false. */
  audio?: boolean;
  /** Masters render transparent for compositing over footage. */
  transparent?: boolean;
  [key: string]: unknown;
}

export const Ident: React.FC<IdentProps> = ({
  entityId, template, orientation, audio = false, transparent = false,
}) => {
  const frame = useCurrentFrame();
  const entity: BrandEntity = byId(entityId);
  const { W, H } = FRAME[orientation];
  const Treatment = TREATMENTS[entity.treatment];
  const cue = entity.cue[template];

  return (
    <AbsoluteFill style={{ backgroundColor: transparent ? 'transparent' : entity.bg }}>
      {audio && (
        <Sequence from={cue}>
          <Audio src={staticFile(`audio/${entity.id}-${template}.mp3`)} />
        </Sequence>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        {!transparent && <rect width={W} height={H} fill={entity.bg} />}
        <Treatment frame={frame} entity={entity} template={template}
          orientation={orientation} transparent={transparent}
          markSrc={staticFile('marks/tns-crest.png')} />
      </svg>
    </AbsoluteFill>
  );
};
