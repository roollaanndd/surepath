// ─── Card Primitive ──────────────────────────────────────────────────────────
//
// Surface card with consistent radius, padding, border, and shadow.
// Replaces the inline `rounded-[2.5rem]` patterns scattered across the app.

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'inset' | 'hero';
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const VARIANT_CLASSES: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-ds-card border border-ds-border shadow-ds-card',
  inset:   'bg-ds-card2 border border-ds-border',
  hero:    'border border-ds-border shadow-ds-lg', // hero cards use --ds-surface-hero via inline style
};

const PADDING_CLASSES: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm:  'p-3',
  md:  'p-4 sm:p-5',
  lg:  'p-6',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  style,
  ...rest
}) => {
  return (
    <div
      {...rest}
      style={style}
      className={[
        'rounded-2xl transition-shadow duration-200',
        VARIANT_CLASSES[variant],
        PADDING_CLASSES[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
};

export default Card;
