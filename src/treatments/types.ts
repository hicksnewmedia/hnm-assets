import { BrandEntity } from '../brand/entities';
import { TemplateKey, Orientation } from '../motion/core';

export interface TreatmentProps {
  frame: number;
  entity: BrandEntity;
  template: TemplateKey;
  orientation: Orientation;
  /** Masters render transparent for compositing; social renders don't. */
  transparent?: boolean;
  /**
   * Resolved URL for a treatment's raster mark.
   *
   * Injected rather than imported so treatments carry no Remotion
   * dependency. Remotion supplies staticFile(); the browser Studio supplies
   * a plain public path. Without this the Studio needed its own copy of the
   * stamp logic, which immediately went stale — the exact drift this system
   * exists to prevent.
   */
  markSrc?: string;
}
