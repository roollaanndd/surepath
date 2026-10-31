import React from 'react';
import ManagedPortalIcon, { type SurePathGlyph } from './ManagedPortalIcon';

/** Same call shape as a Lucide icon, so a module icon can sit wherever one did. */
export type IconComponent = React.FC<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>;

/**
 * One entry point for the SurePath illustrated icon language.
 *
 * Pass an Icon Manager id (see PortalIconManager) and the right art is picked
 * for you: an admin upload first, then bespoke Brand artwork, then the
 * illustrative set. Use it for icons that name a module, entity or feature
 * (policy, claim, wallet, agents ...); keep Lucide for plain controls such as
 * chevrons, close, search and spinners.
 */
export const ModuleIcon: React.FC<{ id: string; glyph?: SurePathGlyph; size?: number; className?: string }> = ({
  id, glyph, size = 24, className = '',
}) => (
  <ManagedPortalIcon
    id={id}
    glyph={glyph}
    size={size}
    className={className}
    imageClassName="object-contain"
  />
);

/** Lucide-shaped component for an id; call at module scope, not during render. */
export function moduleIcon(id: string, glyph?: SurePathGlyph): IconComponent {
  const Icon: IconComponent = ({ size = 24, className = '' }) => (
    <ModuleIcon id={id} glyph={glyph} size={size} className={className} />
  );
  Icon.displayName = `ModuleIcon(${id})`;
  return Icon;
}

export default ModuleIcon;
