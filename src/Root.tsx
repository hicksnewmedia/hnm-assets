import React from 'react';
import { Composition } from 'remotion';
import { Ident } from './Ident';
import { ENTITIES } from './brand/entities';
import { FPS, DURATION, FRAME, TemplateKey, Orientation } from './motion/core';

const TEMPLATES: TemplateKey[] = ['intro', 'outro'];
const ORIENTATIONS: Orientation[] = ['horizontal', 'vertical'];

// 4 brands x 2 templates x 2 orientations = 16 compositions, generated.
// Audio is a render-time prop, not a separate composition — silent and SFX
// are the same 16 with the flag flipped.
export const RemotionRoot: React.FC = () => (
  <>
    {ENTITIES.flatMap((entity) =>
      TEMPLATES.flatMap((template) =>
        ORIENTATIONS.map((orientation) => (
          <Composition
            key={`${entity.id}-${template}-${orientation}`}
            id={`${entity.id}-${template}-${orientation}`}
            component={Ident}
            durationInFrames={DURATION}
            fps={FPS}
            width={FRAME[orientation].W}
            height={FRAME[orientation].H}
            defaultProps={{
              entityId: entity.id, template, orientation,
              audio: false, transparent: false,
            }}
          />
        )),
      ),
    )}
  </>
);
