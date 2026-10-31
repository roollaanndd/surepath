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
  /** Background color of the circle (hex) */
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
        // Tint = color at 12% opacity for the circle background
        const tintBg = `${action.color}1F`;  // hex alpha 0x1F = ~12%
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
                boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.4), 0 4px 12px -4px ${action.color}40`,
                // duotone icons read their fill from this var, so the glyph's
                // tint layer always matches its tile
                ['--ic-tint' as string]: `${action.color}2E`,
              }}
            >
              <Icon size={36} style={{ color: action.color }} strokeWidth={2} />
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
