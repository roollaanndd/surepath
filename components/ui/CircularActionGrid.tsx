// ─── CircularActionGrid — Livin'-style quick actions ────────────────────────
//
// Inspired by Livin' by Mandiri's home screen: 4 circular icons in a row,
// each with a colored background, an icon, and a label below. Tappable.
// Common pattern in Indonesian fintech super-apps (GoPay, OVO, DANA, Livin').
//
// Usage:
//   <CircularActionGrid
//     actions={[
//       { id: 'buy', label: 'Beli Polis', icon: ShieldPlus, color: '#00C16A', onClick: ... },
//       { id: 'claim', label: 'Klaim', icon: FileText, color: '#3B82F6', onClick: ... },
//       { id: 'renew', label: 'Perpanjang', icon: RefreshCw, color: '#F59E0B', onClick: ... },
//       { id: 'help', label: 'Bantuan', icon: MessageCircle, color: '#7C3AED', onClick: ... },
//     ]}
//   />
//
// Reference: Screenshot_20260607_232228_Livin' by Mandiri.jpg

import React from 'react';
import { useHaptic } from './useHaptic';

/** Any SurePath icon — lucide or a duotone icon from the custom sets. */
export type ActionIcon = React.ComponentType<{
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}>;

export interface CircularAction {
  id: string;
  label: string;
  icon: ActionIcon;
  /**
   * Glyph colour. A hex value or any CSS colour, including a design token
   * such as `var(--ds-primary)` — the tile derives its tint and shadow with
   * `color-mix`, not by appending a hex alpha, so tokens work here.
   */
  color: string;
  /** Optional badge count (e.g. unread notifications) */
  badge?: number;
  onClick: () => void;
}

export interface CircularActionGridProps {
  actions: CircularAction[];
  className?: string;
}

export const CircularActionGrid: React.FC<CircularActionGridProps> = ({
  actions,
  className = '',
}) => {
  const haptic = useHaptic();

  return (
    <div className={`grid grid-cols-4 gap-2 ${className}`}>
      {actions.map((action) => {
        const Icon = action.icon;
        // Tint = the glyph colour at 12%. `color-mix` keeps this correct for a
        // CSS variable; the old `${color}1F` concatenation only worked for a
        // 6-digit hex and produced an invalid colour (so: no tile) for a token.
        const tintBg = `color-mix(in srgb, ${action.color} 12%, transparent)`;
        const glowShadow = `color-mix(in srgb, ${action.color} 25%, transparent)`;
        const glyphTint = `color-mix(in srgb, ${action.color} 18%, transparent)`;
        return (
          <button
            key={action.id}
            onClick={() => {
              haptic.tap();
              action.onClick();
            }}
            className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
            aria-label={action.label}
          >
            <div
              className="relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
              style={{
                backgroundColor: tintBg,
                boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.4), 0 4px 12px -4px ${glowShadow}`,
                // duotone icons read their fill from this var, so the glyph's
                // tint layer always matches its tile
                ['--ic-tint' as string]: glyphTint,
              }}
            >
              <Icon size={28} style={{ color: action.color }} strokeWidth={2} />
              {action.badge && action.badge > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-ds-red text-white text-badge font-black flex items-center justify-center"
                  style={{ boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)' }}
                >
                  {action.badge > 99 ? '99+' : action.badge}
                </span>
              )}
            </div>
            <span className="text-2xs font-bold text-ds-ink2 text-center leading-tight">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CircularActionGrid;
