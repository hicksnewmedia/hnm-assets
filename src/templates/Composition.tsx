import { loadFont } from '@remotion/google-fonts/BebasNeue';

loadFont();
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { GlitchFrame, TemplateKey, Orientation } from './GlitchFrame';
import { BrandEntity, byId } from '../brand/entities';

export interface CompositionProps {
  entityId: string;
  templateKey: TemplateKey;
  orientation: Orientation;
  name?: string;
  role?: string;
  transparent?: boolean;
  // Remotion requires composition props to satisfy Record<string, unknown>.
  // Declared fields above keep their real types; this just widens the shape.
  [key: string]: unknown;
}

// Thin Remotion wrapper. All motion lives in the shared core, so this
// component holds no animation logic of its own — it just supplies the
// current frame. That's what keeps studio previews and masters identical.
export const BrandComposition: React.FC<CompositionProps> = ({
  entityId, templateKey, orientation, name, role, transparent,
}) => {
  const frame = useCurrentFrame();
  const entity: BrandEntity = byId(entityId);
  return (
    <AbsoluteFill style={{ backgroundColor: transparent ? 'transparent' : entity.bg }}>
      <GlitchFrame
        frame={frame} entity={entity} templateKey={templateKey}
        orientation={orientation} name={name} role={role} transparent={transparent}
      />
    </AbsoluteFill>
  );
};
