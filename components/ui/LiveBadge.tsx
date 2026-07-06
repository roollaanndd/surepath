// ─── LiveBadge — "Sedang Ramai" social proof ────────────────────────────────
//
// Inspired by Livin' by Mandiri's "Sedang Ramai" (busy) badge. Shows a
// pulsing dot + count of people currently viewing / recently active.
// Creates urgency + social proof at the conversion moment.
//
// Usage:
//   <LiveBadge count={43} label="orang melihat asuransi ini" />
//   <LiveBadge count={12} label="polis terjual minggu ini" />
//
// Reference: Screenshot_20260626_073808_Instagram.jpg (Livin' busy badge)

import React from 'react';

export interface LiveBadgeProps {
  count: number;
  label: string;
  /** Color of the dot + text — defaults to brand primary */
  color?: string;
  className?: string;
}

export const LiveBadge: React.FC<LiveBadgeProps> = ({
  count,
  label,
  color = 'var(--ds-primary)',
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ds-card border border-ds-border ${className}`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      {/* Pulsing live dot */}
      <span className="relative flex w-2 h-2">
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-60"
          style={{ background: color }}
        />
        <span
          className="relative inline-flex w-2 h-2 rounded-full"
          style={{ background: color }}
        />
      </span>
      <span className="text-[0.6rem] font-black text-ds-ink">
        {count.toLocaleString('id-ID')}
      </span>
      <span className="text-[0.6rem] font-medium text-ds-ink2">
        {label}
      </span>
    </div>
  );
};

export default LiveBadge;
