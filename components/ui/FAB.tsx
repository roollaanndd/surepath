// ─── FAB (Floating Action Button) ───────────────────────────────────────────
//
// Inspired by Astro / Livin' reference. Floating circular button above the
// bottom nav for the primary CTA. More discoverable than burying the action
// inside a tab.
//
// Usage:
//   <FAB icon={Plus} label="Beli Asuransi" onClick={() => navigate('buy-car')} />
//
// Position: fixed bottom-right, above the bottom nav (bottom-[90px] on mobile).
// On wide screens (sm+), shifts to bottom-right of the viewport.

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useHaptic } from './useHaptic';

export interface FABProps {
  icon: LucideIcon;
  label?: string;  // when provided, renders extended FAB (icon + label)
  onClick: () => void;
  /** Color of the FAB background — defaults to brand primary */
  color?: string;
  /** Position offset from bottom (px). Default clears the bottom nav. */
  bottomOffset?: number;
  className?: string;
  'aria-label'?: string;
}

export const FAB: React.FC<FABProps> = ({
  icon: Icon,
  label,
  onClick,
  color = 'var(--ds-primary)',
  bottomOffset = 90,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const haptic = useHaptic();

  const isExtended = !!label;

  return (
    <button
      onClick={() => {
        haptic.tap();
        onClick();
      }}
      aria-label={ariaLabel ?? label}
      className={[
        'fixed right-4 z-40 flex items-center justify-center gap-2',
        'rounded-full font-bold text-white',
        'shadow-ds-lg hover:scale-105 active:scale-95 transition-transform',
        isExtended ? 'h-14 px-5' : 'w-14 h-14',
        className,
      ].join(' ')}
      style={{
        bottom: `calc(env(safe-area-inset-bottom) + ${bottomOffset}px)`,
        background: `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`,
        boxShadow: `0 8px 24px -4px ${color}66, 0 4px 8px -2px rgba(0, 0, 0, 0.1)`,
      }}
    >
      <Icon size={22} strokeWidth={2.5} />
      {isExtended && (
        <span className="text-sm font-black uppercase tracking-wider pr-1">
          {label}
        </span>
      )}
    </button>
  );
};

export default FAB;
