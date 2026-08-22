import React from 'react';
import { Composition } from 'remotion';
import { BrandComposition } from './templates/Composition';
import { ENTITIES } from './brand/entities';
import { TIMING, FPS } from './motion/core';
import { TemplateKey, Orientation } from './templates/GlitchFrame';

const SIZES: Record<Orientation, { width: number; height: number }> = {
  horizontal: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
};

const TEMPLATES: TemplateKey[] = ['intro', 'outro', 'lowerThird'];
const ORIENTATIONS: Orientation[] = ['horizontal', 'vertical'];

// Compositions are generated, not hand-written. 5 entities x 3 templates
// x 2 orientations = 30 compositions from this loop. Adding a show adds
// six more without touching this file.
export const RemotionRoot: React.FC = () => (
  <>
    {ENTITIES.flatMap((entity) =>
      TEMPLATES.flatMap((templateKey) =>
        ORIENTATIONS.map((orientation) => {
          const id = `${entity.id}-${templateKey}-${orientation}`;
          return (
            <Composition
              key={id}
              id={id}
              component={BrandComposition}
              durationInFrames={TIMING[templateKey].duration}
              fps={FPS}
              {...SIZES[orientation]}
              defaultProps={{
                entityId: entity.id,
                templateKey,
                orientation,
                name: 'Guest Name',
                role: 'Role or title',
                transparent: false,
              }}
            />
          );
        }),
      ),
    )}
  </>
);
