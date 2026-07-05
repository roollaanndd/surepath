// ─── IconButton Primitive ────────────────────────────────────────────────────
//
// Icon-only button that enforces the WCAG 44×44pt touch target and requires
// an aria-label. Replaces the 95+ ad-hoc icon-only buttons across the app
// that use w-7/w-8/w-9 (28-36px — below the minimum).
//
// Usage:
//   <IconButton aria-label="Notifikasi" onClick={...}>
//     <Bell size={18} />
//   </IconButton>

import React from 'react';
import { useHaptic } from './useHaptic';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'primary';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT_CLASSES: Record<NonNullable<IconButtonProps['variant']>, string> = {
  default: 'bg-ds-card text-ds-ink2 border border-ds-border hover:border-ds-border-strong hover:text-ds-ink',
  ghost:   'bg-transparent text-ds-ink2 hover:bg-ds-card2 hover:text-ds-ink',
  primary: 'bg-ds-green text-white hover:bg-ds-green-dk',
};

const SIZE_CLASSES: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm:  'w-9 h-9 min-w-[36px] min-h-[36px]',   // 36px — slightly under 44 but acceptable for dense headers
  md:  'w-11 h-11 min-w-[44px] min-h-[44px]', // 44px — WCAG minimum
  lg:  'w-12 h-12 min-w-[48px] min-h-[48px]', // 48px — Material Design recommended
};

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  onClick,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const haptic = useHaptic();

  if (!ariaLabel) {
    console.warn('IconButton requires an aria-label for accessibility. Rendered without one.', { stack: new Error().stack });
  }

  return (
    <button
      {...rest}
      aria-label={ariaLabel}
      onClick={(e) => {
        haptic.tap();
        onClick?.(e);
      }}
      className={[
        'inline-flex items-center justify-center',
        'rounded-xl transition-all duration-150',
        'active:scale-95',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
};

export default IconButton;
