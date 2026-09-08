import React from 'react';

/* ─── SurePath Duotone Icon Base ─────────────────────────────────────────────
   The shared drawing recipe behind every custom SurePath icon set
   (`agent/AgentIcons.tsx`, `shared/CustomerIcons.tsx`):

   - 48×48 grid, 3px rounded strokes (friendly), stroke = currentColor
   - soft duotone tint layer behind the stroke (emerald 14% by default,
     overridable per-instance via the `tint` prop or the `--ic-tint` CSS var)
   - one small gold accent per icon — the premium "wink" that ties the
     customer app to the agent app

   Purely presentational. */

export interface DuotoneIconProps {
  size?: number;
  className?: string;
  /** duotone tint fill behind the stroke; defaults to soft emerald */
  tint?: string;
  /** inline style — callers colour the glyph via `color` */
  style?: React.CSSProperties;
}

/** Tint fill — reads `--ic-tint` so a parent tile can recolor the whole icon. */
export const TINT = 'var(--ic-tint, rgba(0,193,106,0.14))';
export const GOLD = '#FDE047';
export const GOLD_DK = '#EAB308';
/** Ink used inside gold badges (amber-900) — keeps contrast on the gold fill. */
export const GOLD_INK = '#713F12';

/** Shared 48-grid SVG frame. */
export const DuotoneSvg: React.FC<DuotoneIconProps & { children: React.ReactNode }> = ({
  size = 24,
  className = '',
  style,
  children,
}) => (
  <svg
    viewBox="0 0 48 48"
    width={size}
    height={size}
    fill="none"
    className={className}
    style={style}
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
