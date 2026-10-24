// ─── Button Primitive ────────────────────────────────────────────────────────
//
// World-class button with consistent variants, sizes, motion, haptics,
// and accessibility. Replaces the 5+ ad-hoc button patterns across the app:
//   - PrimaryBtn in VehicleUnderwritingWizard
//   - inline <button> with bg-emerald-500 everywhere
//   - LoginModal's gradient buttons
//   - AgentWallet's "Btn" class
//
// Variants:
//   primary   — emerald bg, white text, shadow-ds-green
//   secondary — surface bg, primary text, border
//   ghost     — transparent bg, primary text, hover tint
//   danger    — red bg, white text
//   outline   — transparent bg, border, primary text on hover
//
// Sizes:
//   sm  — 36px tall (compact UI)
//   md  — 44px tall (default — meets touch target minimum)
//   lg  — 52px tall (hero CTAs only)
//
// All buttons:
//   - Min 44px touch target (mobile accessibility)
//   - Haptic feedback on tap (respects sp_haptics_off)
//   - Active scale animation (0.97) for tactile feel
//   - Loading state with spinner
//   - Disabled state with reduced opacity + no pointer events
//   - aria-label support for icon-only buttons

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useHaptic } from './useHaptic';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-ds-green text-ds-on-green shadow-ds-green hover:bg-ds-green-dk active:bg-ds-green-dk',
  secondary:
    'bg-ds-card text-ds-ink border border-ds-border hover:border-ds-border-strong hover:bg-ds-card2',
  ghost:
    'bg-transparent text-ds-green hover:bg-ds-green-tint',
  danger:
    'bg-ds-red text-white hover:opacity-90',
  outline:
    'bg-transparent text-ds-ink border border-ds-border hover:border-ds-green hover:text-ds-green',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm:  'min-h-[36px] px-3 text-xs',
  md:  'min-h-[44px] px-5 text-sm',
  lg:  'min-h-[52px] px-6 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  onClick,
  ...rest
}) => {
  const haptic = useHaptic();

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      onClick={(e) => {
        haptic.tap();
        onClick?.(e);
      }}
      className={[
        'inline-flex items-center justify-center gap-2',
        'font-bold rounded-xl tracking-tight',
        'transition-all duration-150',
        'active:scale-[0.98]',
        'hover:shadow-ds-sm',
        'disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
};

export default Button;
