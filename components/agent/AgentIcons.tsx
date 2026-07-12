import React from 'react';

/* ─── SurePath Agent — Custom Icon Set ───────────────────────────────────────
   Hand-drawn duotone icons for the bank-grade Agent app (Stitch design system):
   - 48×48 grid, 3px rounded strokes (friendly), stroke = currentColor
   - Soft duotone tint layer behind (emerald 12–16% by default, overridable
     via CSS var --ic-tint)
   - Small fixed gold (#FDE047) accent per icon for the premium wink
   Purely presentational. */

export interface AgentIconProps {
  size?: number;
  className?: string;
  /** duotone tint fill behind the stroke; defaults to soft emerald */
  tint?: string;
}

const S: React.FC<AgentIconProps & { children: React.ReactNode }> = ({ size = 24, className = '', children }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} fill="none" className={className}
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const TINT = 'var(--ic-tint, rgba(0,193,106,0.14))';
const GOLD = '#FDE047';
const GOLD_DK = '#EAB308';

/* Beranda — rounded home with door + gold spark */
export const IcHome: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <path d="M9 22.5 24 10l15 12.5V37a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V22.5z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M9 22.5 24 10l15 12.5" />
    <path d="M12.5 25.5V37a2.5 2.5 0 0 0 2.5 2.5h18a2.5 2.5 0 0 0 2.5-2.5V25.5" />
    <path d="M20 39v-8.5a4 4 0 0 1 8 0V39" />
    <path d="M37 8.6l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1 1-2.4z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.2" />
  </S>
);

/* Polis — shield + document lines + check */
export const IcPolicy: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <path d="M24 6l14 5v10c0 10.5-8 17-14 19.5C18 38 10 31.5 10 21V11l14-5z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M24 6l14 5v10c0 10.5-8 17-14 19.5C18 38 10 31.5 10 21V11l14-5z" />
    <path d="M18 19h12M18 25h8" strokeWidth="2.6" />
    <circle cx="32.5" cy="30.5" r="6.5" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.4" />
    <path d="M29.8 30.5l2 2 3.4-3.8" stroke="#713F12" strokeWidth="2.4" />
  </S>
);

/* Buat — squircle plus with spark (center nav action) */
export const IcCreate: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <rect x="8" y="8" width="32" height="32" rx="11" fill={p.tint ?? TINT} stroke="none" />
    <rect x="8" y="8" width="32" height="32" rx="11" />
    <path d="M24 17v14M17 24h14" strokeWidth="3.4" />
    <path d="M39 6.6l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9.9-2.2z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.1" />
  </S>
);

/* Dompet — wallet with peeking card + gold coin */
export const IcWallet: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <rect x="7" y="14" width="34" height="24" rx="6" fill={p.tint ?? TINT} stroke="none" />
    <path d="M10 14h25a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4V17a3 3 0 0 1 3-3z" />
    <path d="M7 20.5h20" strokeWidth="2.6" />
    <path d="M31 24h8v8h-8a4 4 0 0 1 0-8z" />
    <circle cx="34.5" cy="28" r="1.8" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="9.5" r="5" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.4" />
    <text x="13.5" y="12" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#713F12" stroke="none" fontFamily="Sora, sans-serif">Rp</text>
  </S>
);

/* Profil — person in squircle + verified badge */
export const IcProfile: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <rect x="7" y="7" width="34" height="34" rx="12" fill={p.tint ?? TINT} stroke="none" />
    <rect x="7" y="7" width="34" height="34" rx="12" />
    <circle cx="24" cy="20" r="5.5" />
    <path d="M14.5 37c1.6-6 5.3-9 9.5-9s7.9 3 9.5 9" />
    <circle cx="37" cy="12" r="6" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.4" />
    <path d="M34.6 12l1.8 1.8 3-3.4" stroke="#713F12" strokeWidth="2.2" />
  </S>
);

/* Penawaran — document with lightning bolt */
export const IcQuote: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <path d="M13 8h16l8 8v22a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M13 8h16l8 8v22a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" />
    <path d="M29 8v8h8" />
    <path d="M25.5 20l-6 9h5l-2 7 7.5-10h-5.5l1-6z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.4" />
  </S>
);

/* Klien — two friendly people + heart */
export const IcClients: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <circle cx="18" cy="17" r="9" fill={p.tint ?? TINT} stroke="none" />
    <circle cx="18" cy="17" r="6" />
    <path d="M7.5 38c1.5-6.5 5.6-10 10.5-10s9 3.5 10.5 10" />
    <circle cx="32.5" cy="19" r="4.5" />
    <path d="M40.5 36c-1.1-4.5-3.5-7.3-6.8-8.2" />
    <path d="M39 8.5c-1.7-2-4.8-.8-4.8 1.6 0 2 2.7 3.6 4.8 5.2 2.1-1.6 4.8-3.2 4.8-5.2 0-2.4-3.1-3.6-4.8-1.6z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.2" />
  </S>
);

/* Klaim — shield with camera lens */
export const IcClaims: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <path d="M24 6l14 5v10c0 10.5-8 17-14 19.5C18 38 10 31.5 10 21V11l14-5z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M24 6l14 5v10c0 10.5-8 17-14 19.5C18 38 10 31.5 10 21V11l14-5z" />
    <circle cx="24" cy="22" r="6" />
    <circle cx="24" cy="22" r="1.8" fill="currentColor" stroke="none" />
    <path d="M18 13.5l1.6-2.5h8.8l1.6 2.5" strokeWidth="2.4" />
    <circle cx="36" cy="34" r="4.5" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.3" />
    <path d="M34.3 34l1.3 1.3 2.1-2.4" stroke="#713F12" strokeWidth="1.8" />
  </S>
);

/* Ranking — trophy with gold cup */
export const IcRank: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <path d="M16 8h16v9a8 8 0 0 1-16 0V8z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.6" />
    <path d="M16 10h-5.5c0 6 2.7 9.5 8 10.5M32 10h5.5c0 6-2.7 9.5-8 10.5" />
    <path d="M24 25v5" />
    <path d="M17 36c1-3.5 3.7-6 7-6s6 2.5 7 6" fill={p.tint ?? TINT} />
    <path d="M14 40h20" strokeWidth="3.2" />
    <path d="M24 11.5l1.2 2.6 2.9.3-2.2 2 .6 2.8-2.5-1.5-2.5 1.5.6-2.8-2.2-2 2.9-.3 1.2-2.6z" fill="#713F12" stroke="none" />
  </S>
);

/* Jaringan — hub with orbit nodes */
export const IcNetwork: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <circle cx="24" cy="24" r="16" fill={p.tint ?? TINT} stroke="none" />
    <path d="M24 24 12 34.5M24 24l12 10.5M24 24V10.5" strokeWidth="2.4" strokeDasharray="4 4" />
    <circle cx="24" cy="24" r="6.5" />
    <circle cx="24" cy="22.4" r="2" fill="currentColor" stroke="none" />
    <path d="M20.8 27.6c.7-2 1.9-2.8 3.2-2.8s2.5.8 3.2 2.8" strokeWidth="2.2" />
    <circle cx="12" cy="34.5" r="4.5" />
    <circle cx="36" cy="34.5" r="4.5" />
    <circle cx="24" cy="10.5" r="4.5" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.4" />
  </S>
);

/* Renewal — circular arrows + clock */
export const IcRenewal: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <circle cx="24" cy="24" r="15" fill={p.tint ?? TINT} stroke="none" />
    <path d="M11.5 20A13 13 0 0 1 35 16.5" />
    <path d="M35 10v6.5H28.5" />
    <path d="M36.5 28A13 13 0 0 1 13 31.5" />
    <path d="M13 38v-6.5h6.5" />
    <path d="M24 19.5V25l4 2.4" strokeWidth="2.6" />
    <circle cx="38.5" cy="38" r="4" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.3" />
    <path d="M38.5 36.4v1.8l1.2.8" stroke="#713F12" strokeWidth="1.6" />
  </S>
);

/* Endors — pen signing a document */
export const IcEndorse: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <path d="M11 9h20l6 6v13H11V9z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M31 40H14a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3h14l9 9v6" />
    <path d="M28 9v9h9" />
    <path d="M17 24h10M17 30h6" strokeWidth="2.4" />
    <path d="M27 37.5l9.5-11c1.2-1.4 3.4-1.4 4.6 0 1.1 1.3.9 3.3-.4 4.4L30 40l-4.5 1.5L27 37.5z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.5" />
  </S>
);

/* Koin — Rp coin stack */
export const IcCoin: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <ellipse cx="22" cy="32" rx="13" ry="6.5" fill={p.tint ?? TINT} stroke="none" />
    <ellipse cx="22" cy="31" rx="13" ry="6.5" />
    <path d="M9 31v5c0 3.6 5.8 6.5 13 6.5s13-2.9 13-6.5v-5" />
    <ellipse cx="29" cy="14.5" rx="10" ry="8" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.6" />
    <text x="29" y="18" textAnchor="middle" fontSize="9" fontWeight="800" fill="#713F12" stroke="none" fontFamily="Sora, sans-serif">Rp</text>
  </S>
);

/* Notifikasi — friendly bell + gold dot */
export const IcBell: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <path d="M24 8c-7 0-11 5.2-11 12v6l-3.5 6h29L35 26v-6c0-6.8-4-12-11-12z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M24 8c-7 0-11 5.2-11 12v6l-3.5 6h29L35 26v-6c0-6.8-4-12-11-12z" />
    <path d="M20 37a4.2 4.2 0 0 0 8 0" strokeWidth="2.6" />
    <circle cx="35.5" cy="10.5" r="5" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.4" />
  </S>
);

/* Target — dart board (daily goal) */
export const IcTarget: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <circle cx="24" cy="24" r="15" fill={p.tint ?? TINT} stroke="none" />
    <circle cx="24" cy="24" r="14" />
    <circle cx="24" cy="24" r="8" />
    <circle cx="24" cy="24" r="2.4" fill="currentColor" stroke="none" />
    <path d="M24 24l10-10" strokeWidth="2.6" />
    <path d="M34 14l5-1.5L37.5 17 34 14z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.3" />
  </S>
);

/* Grafik — growth chart (GWP / performance) */
export const IcChart: React.FC<AgentIconProps> = (p) => (
  <S {...p}>
    <rect x="8" y="8" width="32" height="32" rx="9" fill={p.tint ?? TINT} stroke="none" />
    <rect x="8" y="8" width="32" height="32" rx="9" />
    <path d="M15 30l6-7 5 4 8-9" strokeWidth="2.8" />
    <path d="M34 15.5l3.6 2.5-3 3.2" fill="none" strokeWidth="2.4" />
    <circle cx="15" cy="30" r="1.8" fill="currentColor" stroke="none" />
  </S>
);
