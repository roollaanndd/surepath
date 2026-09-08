import React from 'react';
import { DuotoneSvg, DuotoneIconProps, TINT, GOLD, GOLD_DK, GOLD_INK } from './duotone';

/* ─── SurePath Customer — Custom Icon Set ────────────────────────────────────
   Same hand-drawn duotone recipe as the Agent app (`agent/AgentIcons.tsx`), so
   both portals read as one product: 48×48 grid, 3px rounded strokes, soft
   emerald tint layer, one small gold accent per icon.

   Shapes shared with the agent set (Beranda, Profil, Klaim) are drawn
   identically on purpose — the same concept should look the same in every
   portal. Purely presentational. */

export type CustomerIconProps = DuotoneIconProps;

const S = DuotoneSvg;

/* Beranda — rounded home with door + gold spark (identical to the agent set) */
export const IcHome: React.FC<CustomerIconProps> = (p) => (
  <S {...p}>
    <path d="M9 22.5 24 10l15 12.5V37a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V22.5z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M9 22.5 24 10l15 12.5" />
    <path d="M12.5 25.5V37a2.5 2.5 0 0 0 2.5 2.5h18a2.5 2.5 0 0 0 2.5-2.5V25.5" />
    <path d="M20 39v-8.5a4 4 0 0 1 8 0V39" />
    <path d="M37 8.6l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1 1-2.4z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.2" />
  </S>
);

/* Beli — shield with a plus: adding protection */
export const IcBuy: React.FC<CustomerIconProps> = (p) => (
  <S {...p}>
    <path d="M24 6l14 5v10c0 10.5-8 17-14 19.5C18 38 10 31.5 10 21V11l14-5z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M24 6l14 5v10c0 10.5-8 17-14 19.5C18 38 10 31.5 10 21V11l14-5z" />
    <path d="M24 16.5v11M18.5 22h11" strokeWidth="3.2" />
    <path d="M38 7.4l1.1 2.6 2.6 1.1-2.6 1.1L38 14.8l-1.1-2.6-2.6-1.1 2.6-1.1L38 7.4z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.2" />
  </S>
);

/* Pathy — the assistant's own face (mirrors PathyMascot), center nav action */
export const IcPathy: React.FC<CustomerIconProps> = (p) => (
  <S {...p}>
    <rect x="9" y="14" width="30" height="25" rx="10" fill={p.tint ?? TINT} stroke="none" />
    <path d="M24 6.5v5" strokeWidth="2.6" />
    <circle cx="24" cy="5" r="2.4" fill="currentColor" stroke="none" />
    <rect x="9" y="14" width="30" height="25" rx="10" />
    <path d="M5.5 23.5v6M42.5 23.5v6" strokeWidth="2.6" />
    <circle cx="18.5" cy="25.5" r="2.6" fill="currentColor" stroke="none" />
    <circle cx="29.5" cy="25.5" r="2.6" fill="currentColor" stroke="none" />
    <path d="M19 32q5 3.4 10 0" strokeWidth="2.6" />
    <path d="M39.5 9l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9.9-2.2z" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.2" />
  </S>
);

/* Klaim — shield with a camera lens: snap a photo, file a claim
   (identical to the agent set's IcClaims) */
export const IcClaim: React.FC<CustomerIconProps> = (p) => (
  <S {...p}>
    <path d="M24 6l14 5v10c0 10.5-8 17-14 19.5C18 38 10 31.5 10 21V11l14-5z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M24 6l14 5v10c0 10.5-8 17-14 19.5C18 38 10 31.5 10 21V11l14-5z" />
    <circle cx="24" cy="22" r="6.5" />
    <circle cx="24" cy="22" r="2.4" fill="currentColor" stroke="none" />
    <path d="M20.5 13.5h7" strokeWidth="2.6" />
    <circle cx="37.5" cy="11" r="4.2" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.3" />
  </S>
);

/* Riwayat — policy documents with a gold verified check */
export const IcHistory: React.FC<CustomerIconProps> = (p) => (
  <S {...p}>
    <path d="M15 7h13l8 8v22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M15 7h13l8 8v22a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3z" />
    <path d="M28 7v8h8" />
    <path d="M18 22h11M18 28h7" strokeWidth="2.6" />
    <circle cx="33" cy="32" r="6.5" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.4" />
    <path d="M30.3 32l2 2 3.4-3.8" stroke={GOLD_INK} strokeWidth="2.4" />
  </S>
);

/* Profil — person in squircle + verified badge (identical to the agent set) */
export const IcProfile: React.FC<CustomerIconProps> = (p) => (
  <S {...p}>
    <rect x="7" y="7" width="34" height="34" rx="12" fill={p.tint ?? TINT} stroke="none" />
    <rect x="7" y="7" width="34" height="34" rx="12" />
    <circle cx="24" cy="20" r="5.5" />
    <path d="M14.5 37c1.6-6 5.3-9 9.5-9s7.9 3 9.5 9" />
    <circle cx="37" cy="12" r="6" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.4" />
    <path d="M34.6 12l1.8 1.8 3-3.4" stroke={GOLD_INK} strokeWidth="2.2" />
  </S>
);

/* Notifikasi — bell with a gold clapper (identical to the agent set) */
export const IcBell: React.FC<CustomerIconProps> = (p) => (
  <S {...p}>
    <path d="M24 8a11 11 0 0 1 11 11v8l3 5H10l3-5v-8A11 11 0 0 1 24 8z" fill={p.tint ?? TINT} stroke="none" />
    <path d="M24 8a11 11 0 0 1 11 11v8l3 5H10l3-5v-8A11 11 0 0 1 24 8z" />
    <path d="M20 36a4 4 0 0 0 8 0" />
    <circle cx="24" cy="5.5" r="2.6" fill={GOLD} stroke={GOLD_DK} strokeWidth="1.2" />
  </S>
);
