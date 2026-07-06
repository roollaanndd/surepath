// ─── ClayCard — Claymorphism card variant ────────────────────────────────────
//
// Inspired by the Astro / Claymorphism reference. Soft, rounded cards with
// subtle layered shadows that make elements feel tangible ("clay" effect).
//
// Visual recipe:
//   - 16-24px corner radius (larger than default Card's 12-16px)
//   - Two-layer shadow: outer soft drop + inner subtle highlight
//   - Slightly lighter background than the surface to "lift" off the page
//   - Optional gradient border (1px) for premium feel
//
// Use ClayCard for hero moments (home page welcome, premium breakdown,
// policy status, referral cards). Use the regular `Card` for dense lists
// and admin tables.
//
// Reference: Screenshot_20260706_024355_Astro.jpg

import React from 'react';

export interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual emphasis — hero gets the strongest clay effect */
  variant?: 'default' | 'hero' | 'inset';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /** When true, renders the gradient-border variant (premium feel) */
  gradientBorder?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<ClayCardProps['variant']>, string> = {
  // default: lifts off the page — outer shadow + inner top highlight
  default: 'bg-ds-card',
  // hero: stronger shadow + slight scale on hover
  hero: 'bg-ds-card',
  // inset: pressed-in look (for nested cards inside a hero)
  inset: 'bg-ds-card2',
};

const PADDING_CLASSES: Record<NonNullable<ClayCardProps['padding']>, string> = {
  none: '',
  sm:  'p-3',
  md:  'p-5',
  lg:  'p-6 sm:p-7',
};

/**
 * Claymorphism card — soft, rounded, tangible.
 * The clay effect comes from the inline boxShadow (two-layer) — Tailwind
 * doesn't have a built-in utility for this.
 */
export const ClayCard: React.FC<ClayCardProps> = ({
  variant = 'default',
  padding = 'md',
  gradientBorder = false,
  children,
  className = '',
  style,
  ...rest
}) => {
  // Two-layer shadow: outer soft drop + subtle inner top highlight
  // The outer shadow uses the surface color at low opacity for a soft lift.
  // The inner highlight (1px white at top) creates the "clay" tangibility.
  const clayShadow =
    variant === 'hero'
      ? {
          // Stronger lift for hero cards
          boxShadow:
            '0 12px 32px -8px rgba(0, 59, 47, 0.18), 0 4px 12px -4px rgba(0, 59, 47, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
        }
      : variant === 'inset'
      ? {
          // Pressed-in: inner shadow only
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06), inset 0 -1px 0 rgba(255, 255, 255, 0.4)',
        }
      : {
          // Default: subtle lift
          boxShadow:
            '0 6px 20px -6px rgba(0, 59, 47, 0.10), 0 2px 6px -2px rgba(0, 59, 47, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.5)',
        };

  // Dark mode: drop the inner white highlight (would look wrong on dark surfaces)
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const darkModeShadow =
    variant === 'hero'
      ? '0 12px 32px -8px rgba(0, 0, 0, 0.4), 0 4px 12px -4px rgba(0, 0, 0, 0.2)'
      : variant === 'inset'
      ? 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
      : '0 6px 20px -6px rgba(0, 0, 0, 0.25), 0 2px 6px -2px rgba(0, 0, 0, 0.15)';

  return (
    <div
      {...rest}
      style={{
        ...(isDark ? { boxShadow: darkModeShadow } : clayShadow),
        borderRadius: variant === 'hero' ? 24 : 20,
        ...(gradientBorder && {
          // 1px gradient border via mask trick — premium feel
          background:
            'linear-gradient(var(--ds-card), var(--ds-card)) padding-box, linear-gradient(135deg, var(--ds-primary) 0%, var(--ds-primary-tint) 100%) border-box',
          border: '1px solid transparent',
        }),
        ...style,
      }}
      className={[
        'transition-all duration-300',
        variant === 'hero' ? 'hover:-translate-y-0.5' : '',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
};

export default ClayCard;
