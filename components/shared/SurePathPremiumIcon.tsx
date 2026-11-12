// ─── SurePath Premium Illustration System — "Aureate Emerald" (v2.8.11) ──────
//
// Replaces the v2.7.x "flat playful" set as the app-wide fallback artwork
// (PathyNavIcon → ManagedPortalIcon → PortalIconManager all render this).
// Owner brief: premium, illustrative, custom — no cartoon faces, no clip-art
// feel. The old set had eyes-and-smile people and toy cars; this set speaks
// the same visual language as the brand: deep-emerald plates, precision
// white line-work, mint support shapes, and ONE champagne-gold focal accent
// per mark. Restraint is the premium signal.
//
// Rules every art follows (keep them when adding new keys):
//  1. 48×48 canvas, plate spans 6..42 with rx 13 — identical plate geometry
//     everywhere, so a grid of icons reads as one family.
//  2. Primary glyph in P.glyph (near-white), secondary shapes in P.mint,
//     exactly one focal accent in P.gold. Nothing else.
//  3. Strokes 1.9, round caps/joins; fills only where the shape IS the glyph.
//  4. Gradients get a per-instance unique id (useId) — the same icon renders
//     dozens of times per screen and duplicated SVG ids are invalid HTML.
//  5. Pure vector, no raster, no filters heavier than a radial glow.
//
// Drop-in compatible with the old component: same props, same id→art regex
// chain (plus the ManagedPortalIcon glyph keys: trophy, gear, withdraw,
// shield, quote, pathy… all resolve through the same chain).

import { useId } from 'react';

type Props = { id: string; size?: number; className?: string; active?: boolean };

const P = {
  plateTop: '#11604D',
  plateBottom: '#07362C',
  glyph: '#F2FBF5',
  mint: '#A9EBD1',
  gold: '#EFC978',
  glowInner: 'rgba(53,212,154,0.30)',
  glowOuter: 'rgba(53,212,154,0)',
  hairline: 'rgba(255,255,255,0.16)',
  sweep: 'rgba(255,255,255,0.055)',
};

/** id → art key. Same chain as the retired playful set, so every existing
 *  nav/upload id keeps resolving to the same *meaning*. Art keys also
 *  self-resolve (tier, review, home…) so callers may pass either an upload id
 *  or a key directly. Exported for the design-system guard test. */
export function resolveArtKey(id: string): string {
  return /ojk_rates/i.test(id) ? 'protection'
    : /approvals|review/i.test(id) ? 'review'
    : /tier|trophy/i.test(id) ? 'tier'
    : /portal_icons|palette/i.test(id) ? 'palette'
    : /gear|setting|config|system/i.test(id) ? 'settings'
    : /shield|security|claim|approval|endorsement|protection|insurance/i.test(id) ? 'protection'
    : /insurers|b2b|corporate|bank|branch|banking|institution/i.test(id) ? 'bank'
    : /library|catalog|resource_center|knowledge|website_editor/i.test(id) ? 'library'
    : /network|referral|agents|partner/i.test(id) ? 'network'
    : /renewal|refresh/i.test(id) ? 'renewal'
    : /analytics|ops_console|ranking|leaderboard|chart/i.test(id) ? 'chart'
    : /product|upload|box/i.test(id) ? 'box'
    : /home|dashboard/i.test(id) ? 'home'
    : /wallet|commission|ledger|financial|money|withdraw/i.test(id) ? 'wallet'
    : /car|vehicle|motor|pricelist|rate/i.test(id) ? 'car'
    : /policy|document|inventory|report|history|activity|log|quote/i.test(id) ? 'document'
    : /payment|transaction/i.test(id) ? 'payment'
    : /notification|bell/i.test(id) ? 'bell'
    : /user|client|people|profile/i.test(id) ? 'people'
    : /travel|journey|flight|plane/i.test(id) ? 'travel'
    : /health|safety|accident|family/i.test(id) ? 'health'
    : /pathy|help|support|ai/i.test(id) ? 'help'
    : 'spark';
}

function resolveKey(id: string): string {
  return resolveArtKey(id);
}

/** Shared plate + ambient glow. Every mark sits on this, so grids align. */
function Plate({ u }: { u: string }) {
  return <>
    <defs>
      <linearGradient id={`pl${u}`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={P.plateTop} />
        <stop offset="1" stopColor={P.plateBottom} />
      </linearGradient>
      <radialGradient id={`gl${u}`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={P.glowInner} />
        <stop offset="1" stopColor={P.glowOuter} />
      </radialGradient>
    </defs>
    <ellipse cx="24" cy="41.5" rx="14" ry="3" fill={`url(#gl${u})`} />
    <rect x="6" y="6" width="36" height="36" rx="13" fill={`url(#pl${u})`} />
    <rect x="6" y="6" width="36" height="36" rx="13" fill="none" stroke={P.hairline} strokeWidth="1" />
    {/* top-light hairline: the "machined edge" that reads as premium */}
    <path d="M11 10.5 Q24 5.5 37 10.5" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.2" strokeLinecap="round" />
    {/* diagonal light sweep */}
    <path d="M6 24 L24 6 H36 L6 36 Z" fill={P.sweep} />
  </>;
}

function Art({ key_ }: { key_: string }) {
  const g = P.glyph, m = P.mint, au = P.gold;
  switch (key_) {
    case 'protection': return <>
      <path d="M24 12.5 L32.5 15.8 V24 C32.5 29.6 28.8 33.1 24 35.2 C19.2 33.1 15.5 29.6 15.5 24 V15.8 Z"
        fill="none" stroke={g} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M24 12.5 L32.5 15.8 V24 C32.5 29.6 28.8 33.1 24 35.2 Z" fill="rgba(255,255,255,0.07)" stroke="none" />
      <path d="M20.4 23.6 L23 26.2 L28.2 20.6" fill="none" stroke={au} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="33.8" cy="12.2" r="1.5" fill={m} />
    </>;
    case 'home': return <>
      <path d="M13.5 23.5 L24 14.2 L34.5 23.5" fill="none" stroke={g} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.8 22.6 V33.4 H32.2 V22.6" fill="none" stroke={g} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="21.4" y="26.8" width="5.2" height="6.6" rx="2" fill={au} />
      <rect x="17.6" y="25.6" width="2.4" height="2.4" rx="0.8" fill={m} />
      <rect x="28" y="25.6" width="2.4" height="2.4" rx="0.8" fill={m} />
    </>;
    case 'wallet': return <>
      <rect x="14" y="16.8" width="20" height="14.4" rx="3.2" fill="none" stroke={g} strokeWidth="1.9" />
      <path d="M14 21 H34" stroke={m} strokeWidth="1.4" />
      <circle cx="28.6" cy="24.2" r="1.9" fill={au} />
      <path d="M17.4 26.8 H24" stroke={m} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M31 13.4 L34.6 15.2" stroke={au} strokeWidth="1.6" strokeLinecap="round" />
    </>;
    case 'car': return <>
      <path d="M13 27.4 L15.4 21.6 Q16.3 19.4 18.7 19.4 H29.3 Q31.7 19.4 32.6 21.7 L35 27.4 V32 H13 Z"
        fill="none" stroke={g} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M17.6 21.4 H23 V26 H15.7 Z M25 21.4 H30.4 Q31.3 21.4 31.9 23.3 L33.3 26 H25 Z" fill="rgba(255,255,255,0.10)" stroke="none" />
      <circle cx="17.6" cy="32" r="2.7" fill={P.plateBottom} stroke={g} strokeWidth="1.6" />
      <circle cx="30.4" cy="32" r="2.7" fill={P.plateBottom} stroke={g} strokeWidth="1.6" />
      <circle cx="34.3" cy="24.9" r="1.2" fill={au} />
    </>;
    case 'document': return <>
      <path d="M17 13 H25.5 L31 18.5 V35 H17 Z" fill="none" stroke={g} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M25.5 13 V18.5 H31" fill="none" stroke={m} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 24 H28 M20 27.5 H28 M20 31 H24" stroke={m} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="28.6" cy="31.6" r="2.5" fill="none" stroke={au} strokeWidth="1.6" />
    </>;
    case 'payment': return <>
      <rect x="13.5" y="16.5" width="21" height="15" rx="3" fill="none" stroke={g} strokeWidth="1.9" />
      <path d="M13.5 21 H34.5" stroke={m} strokeWidth="2.6" />
      <rect x="16.4" y="24" width="4" height="3.2" rx="0.9" fill={au} />
      <path d="M29.5 25.4 H31.6" stroke={g} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M28 27.8 H31.6" stroke={m} strokeWidth="1.4" strokeLinecap="round" />
    </>;
    case 'bell': return <>
      <path d="M18.6 27.4 Q18.4 18.8 24 18.8 Q29.6 18.8 29.4 27.4 Z" fill="none" stroke={g} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M16.6 27.6 H31.4 Q30.2 31 24 31 Q17.8 31 16.6 27.6 Z" fill={g} stroke="none" />
      <circle cx="24" cy="33.8" r="1.5" fill={au} />
      <path d="M31.8 15.6 Q33.6 17.2 33.9 19.6" fill="none" stroke={m} strokeWidth="1.6" strokeLinecap="round" />
    </>;
    case 'people': return <>
      <circle cx="20.6" cy="19.4" r="3.6" fill={g} />
      <path d="M13.6 32.6 Q14.5 25.4 20.6 25.4 Q26.7 25.4 27.6 32.6 Z" fill={g} />
      <circle cx="29.8" cy="21.2" r="2.5" fill={m} />
      <path d="M30 27 Q33.8 27.8 34.6 32.6 H31" fill={m} />
      <path d="M31.8 14.8 L33 17.2 L35.6 17.6 L33.7 19.4" fill="none" stroke={au} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>;
    case 'travel': return <>
      <path d="M14.8 28.6 L20.8 26.8 L22.6 17.8 Q22.9 16.5 24.2 17 L25.9 17.8 L25.2 25.4 L32.2 27.6 Q33.6 28.2 32.9 29.6 L31.4 30.2 L24.9 28.4 L20.4 33.8 L18.6 33.4 L20.2 27.9 L15.2 29.6 Z"
        fill={g} stroke="none" />
      <path d="M12.5 16.5 Q16 12.5 22 12" fill="none" stroke={m} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2.4 2.6" />
      <circle cx="33.8" cy="15" r="1.4" fill={au} />
    </>;
    case 'health': return <>
      <path d="M24 33 C17.6 28.8 15.4 25 15.4 21.4 C15.4 18 17.9 16.2 20.4 16.2 C22.1 16.2 23.6 17.1 24 18.3 C24.4 17.1 25.9 16.2 27.6 16.2 C30.1 16.2 32.6 18 32.6 21.4 C32.6 25 30.4 28.8 24 33 Z"
        fill="none" stroke={g} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M18.6 23.6 H21.4 L22.9 21 L24.9 26.6 L26.4 24.2 H29.4" fill="none" stroke={au} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>;
    case 'settings': return <>
      <circle cx="24" cy="24" r="6.8" fill="none" stroke={g} strokeWidth="1.9" />
      <circle cx="24" cy="24" r="2.3" fill={au} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
        const r = (a * Math.PI) / 180, x1 = 24 + Math.cos(r) * 8.6, y1 = 24 + Math.sin(r) * 8.6,
          x2 = 24 + Math.cos(r) * 10.8, y2 = 24 + Math.sin(r) * 10.8;
        return <path key={a} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`} stroke={g} strokeWidth="2.1" strokeLinecap="round" />;
      })}
    </>;
    case 'help': return <>
      <path d="M14.5 17.2 Q14.5 14 17.8 14 H30.2 Q33.5 14 33.5 17.2 V26.8 Q33.5 30 30.2 30 H23.4 L18 34.6 V30 H17.8 Q14.5 30 14.5 26.8 Z"
        fill="none" stroke={g} strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M21.6 19.8 Q21.6 17.4 24 17.4 Q26.4 17.4 26.4 19.8 Q26.4 21.4 24 22.4 V24.2" fill="none" stroke={m} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24" cy="26.6" r="1.2" fill={au} />
    </>;
    case 'bank': return <>
      <path d="M13.8 20.4 L24 13.6 L34.2 20.4 Z" fill={g} stroke="none" />
      <path d="M15.8 23.4 V31 M20.6 23.4 V31 M27.4 23.4 V31 M32.2 23.4 V31" stroke={g} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M14.4 33.6 H33.6" stroke={m} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="17.4" r="1.3" fill={au} />
    </>;
    case 'library': return <>
      <rect x="14" y="16" width="5" height="17.5" rx="1.2" fill={m} />
      <rect x="20.4" y="13.8" width="5" height="19.7" rx="1.2" fill={g} />
      <path d="M27 16.4 L31.8 17.3 L30 33.2 L25.3 32.3 Z" fill="none" stroke={g} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 35.8 H34" stroke={au} strokeWidth="2" strokeLinecap="round" />
    </>;
    case 'review': return <>
      <rect x="16" y="14.6" width="16" height="19" rx="2.6" fill="none" stroke={g} strokeWidth="1.9" />
      <rect x="20.4" y="12" width="7.2" height="4.4" rx="1.6" fill={g} />
      <path d="M20 24.4 L22.8 27.2 L28.4 21.2" fill="none" stroke={m} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="29.6" cy="31.4" r="2.6" fill="none" stroke={au} strokeWidth="1.6" />
    </>;
    case 'tier': return <>
      <rect x="13.6" y="26.8" width="6" height="8.6" rx="1.4" fill={m} />
      <rect x="21" y="22.4" width="6" height="13" rx="1.4" fill={g} />
      <rect x="28.4" y="17.6" width="6" height="17.8" rx="1.4" fill={au} />
      <path d="M24 11.6 L25.2 13.8 L27.6 14.2 L25.8 15.9 L26.3 18.3 L24 17.1 L21.7 18.3 L22.2 15.9 L20.4 14.2 L22.8 13.8 Z" fill={g} stroke="none" />
    </>;
    case 'palette': return <>
      <path d="M15.6 24 C15.6 18.2 19.8 14 24.6 14 C30.4 14 34.4 18.4 34.4 23.4 C34.4 28 31.4 30.8 27.8 30.8 H25.4 Q23.8 30.8 23.8 32.4 Q23.8 34.6 21.8 34.6 Q15.6 34.2 15.6 24 Z"
        fill="none" stroke={g} strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="21" cy="20" r="1.7" fill={m} />
      <circle cx="26.6" cy="18.6" r="1.7" fill={g} />
      <circle cx="30.2" cy="23.4" r="1.7" fill={au} />
    </>;
    case 'network': return <>
      <path d="M24 24 L14.6 15.4 M24 24 L33.4 15.8 M24 24 L15 33.8 M24 24 L33 33.4" stroke={m} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="4.2" fill={g} />
      <circle cx="13.8" cy="14.6" r="2.6" fill="none" stroke={g} strokeWidth="1.6" />
      <circle cx="34.2" cy="15" r="2.6" fill="none" stroke={g} strokeWidth="1.6" />
      <circle cx="14.2" cy="34.6" r="2.6" fill="none" stroke={g} strokeWidth="1.6" />
      <circle cx="33.8" cy="34.2" r="2.6" fill={au} />
    </>;
    case 'renewal': return <>
      <path d="M17.2 22.6 A7 7 0 0 1 29.2 18.4 L31.6 20.6" fill="none" stroke={g} strokeWidth="2" strokeLinecap="round" />
      <path d="M31.8 15.4 V20.8 H26.4" fill="none" stroke={g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30.8 25.4 A7 7 0 0 1 18.8 29.6 L16.4 27.4" fill="none" stroke={m} strokeWidth="2" strokeLinecap="round" />
      <path d="M16.2 32.6 V27.2 H21.6" fill="none" stroke={m} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="1.6" fill={au} />
    </>;
    case 'chart': return <>
      <path d="M15 32.6 V26.2 M21.8 32.6 V21.4 M28.6 32.6 V24" stroke={g} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M14.6 20.4 L20.6 15.8 L25.4 18.4 L32.4 12.6" fill="none" stroke={m} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29.8 12.6 H32.6 V15.4" fill="none" stroke={au} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>;
    case 'box': return <>
      <path d="M24 13.6 L33 18.4 L24 23.2 L15 18.4 Z" fill={g} stroke="none" />
      <path d="M15 18.4 V29.6 L24 34.4 V23.2 Z" fill={m} stroke="none" />
      <path d="M33 18.4 V29.6 L24 34.4 V23.2 Z" fill="rgba(255,255,255,0.14)" stroke="none" />
      <path d="M19.5 16 L28.5 20.8" stroke={P.plateBottom} strokeWidth="1.2" />
      <circle cx="32.9" cy="31.8" r="1.5" fill={au} />
    </>;
    case 'spark': return <>
      <path d="M24 12.4 L27.4 20.6 L35.6 24 L27.4 27.4 L24 35.6 L20.6 27.4 L12.4 24 L20.6 20.6 Z" fill={g} stroke="none" />
      <path d="M33.2 12.4 L34.2 14.6 L36.4 15.6 L34.2 16.6 L33.2 18.8 L32.2 16.6 L30 15.6 L32.2 14.6 Z" fill={au} stroke="none" />
      <circle cx="14.8" cy="33.2" r="1.3" fill={m} />
    </>;
    default: return <path d="M24 12.4 L27.4 20.6 L35.6 24 L27.4 27.4 L24 35.6 L20.6 27.4 L12.4 24 L20.6 20.6 Z" fill={g} stroke="none" />;
  }
}

/** Hero artwork for role/account-type selection — same language, richer scene. */
export type RoleSceneKey = 'CUSTOMER' | 'AGENT' | 'B2B_CLIENT';

function RoleSceneArt({ role, u }: { role: RoleSceneKey; u: string }) {
  const g = P.glyph, m = P.mint, au = P.gold;
  if (role === 'CUSTOMER') return <>
    <defs>
      <linearGradient id={`rpl${u}`} x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={P.plateTop} /><stop offset="1" stopColor={P.plateBottom} />
      </linearGradient>
      <radialGradient id={`rgl${u}`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={P.glowInner} /><stop offset="1" stopColor={P.glowOuter} />
      </radialGradient>
    </defs>
    <ellipse cx="32" cy="58" rx="20" ry="4" fill={`url(#rgl${u})`} />
    <rect x="4" y="4" width="56" height="56" rx="18" fill={`url(#rpl${u})`} />
    <rect x="4" y="4" width="56" height="56" rx="18" fill="none" stroke={P.hairline} />
    <path d="M12 11 Q32 4 52 11" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.3" strokeLinecap="round" />
    {/* person */}
    <circle cx="26" cy="24.5" r="5.4" fill={g} />
    <path d="M15 44 Q16.4 33.6 26 33.6 Q35.6 33.6 37 44 Z" fill={g} />
    {/* shield badge, gold check */}
    <path d="M41 27.5 L48 30 V36.5 C48 41.6 45 44.6 41 46.2 C37 44.6 34 41.6 34 36.5 V30 Z"
      fill={P.plateBottom} stroke={m} strokeWidth="1.9" strokeLinejoin="round" />
    <path d="M37.8 36.4 L40.2 38.8 L44.6 33.8" fill="none" stroke={au} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    {/* pulse line */}
    <path d="M16 49 H21 L23.4 46 L26.4 52 L28.8 48.6 H34" fill="none" stroke={m} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </>;
  if (role === 'AGENT') return <>
    <defs>
      <linearGradient id={`rpl${u}`} x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={P.plateTop} /><stop offset="1" stopColor={P.plateBottom} />
      </linearGradient>
      <radialGradient id={`rgl${u}`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={P.glowInner} /><stop offset="1" stopColor={P.glowOuter} />
      </radialGradient>
    </defs>
    <ellipse cx="32" cy="58" rx="20" ry="4" fill={`url(#rgl${u})`} />
    <rect x="4" y="4" width="56" height="56" rx="18" fill={`url(#rpl${u})`} />
    <rect x="4" y="4" width="56" height="56" rx="18" fill="none" stroke={P.hairline} />
    <path d="M12 11 Q32 4 52 11" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.3" strokeLinecap="round" />
    {/* briefcase */}
    <rect x="14" y="26" width="22" height="16" rx="3.4" fill="none" stroke={g} strokeWidth="2" />
    <path d="M22.5 26 V22.4 Q22.5 20.6 24.4 20.6 H25.6 Q27.5 20.6 27.5 22.4 V26" fill="none" stroke={g} strokeWidth="2" />
    <path d="M14 31.5 H36" stroke={m} strokeWidth="1.6" />
    {/* growth bars + gold arrow */}
    <path d="M40 44 V38 M45 44 V33 M50 44 V28" stroke={au} strokeWidth="2.8" strokeLinecap="round" />
    <path d="M39.5 27 L46 19.5 L51.5 24" fill="none" stroke={m} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="51.5" cy="24" r="1.7" fill={m} />
    {/* coin */}
    <circle cx="18" cy="18" r="3.4" fill="none" stroke={au} strokeWidth="1.7" />
    <path d="M18 16 V20 M16.4 17.2 H19.6" stroke={au} strokeWidth="1.2" strokeLinecap="round" />
  </>;
  return <>
    <defs>
      <linearGradient id={`rpl${u}`} x1="12" y1="4" x2="52" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={P.plateTop} /><stop offset="1" stopColor={P.plateBottom} />
      </linearGradient>
      <radialGradient id={`rgl${u}`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={P.glowInner} /><stop offset="1" stopColor={P.glowOuter} />
      </radialGradient>
    </defs>
    <ellipse cx="32" cy="58" rx="20" ry="4" fill={`url(#rgl${u})`} />
    <rect x="4" y="4" width="56" height="56" rx="18" fill={`url(#rpl${u})`} />
    <rect x="4" y="4" width="56" height="56" rx="18" fill="none" stroke={P.hairline} />
    <path d="M12 11 Q32 4 52 11" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="1.3" strokeLinecap="round" />
    {/* corporate tower */}
    <rect x="14" y="18" width="13" height="30" rx="2" fill="none" stroke={g} strokeWidth="2" />
    <path d="M27 26 H38 Q39.8 26 39.8 27.8 V48 H27 Z" fill="rgba(255,255,255,0.10)" stroke={g} strokeWidth="2" />
    <path d="M17.6 23 H23.4 M17.6 28 H23.4 M17.6 33 H23.4 M17.6 38 H23.4 M29.6 30 H33.8 M29.6 35 H33.8 M29.6 40 H33.8" stroke={m} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 48 H46" stroke={au} strokeWidth="2.2" strokeLinecap="round" />
    {/* network node crown */}
    <path d="M32 10 L36 12.4 L36 16.6 L32 19 L28 16.6 L28 12.4 Z" fill="none" stroke={au} strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="44" cy="16" r="1.6" fill={m} />
  </>;
}

/** Main export — drop-in replacement for the retired playful set. */
export default function SurePathPremiumIcon({ id, size = 48, className = '', active = false }: Props) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true" focusable="false" role="img">
      <Plate u={u} />
      <Art key_={resolveKey(id)} />
      {active && <circle cx="39.4" cy="38.6" r="3.4" fill={P.gold} stroke={P.plateBottom} strokeWidth="1.6" />}
    </svg>
  );
}

/** Role-selection hero (64 viewBox, richer scene) for RoleSelectionScreen. */
export function RoleScene({ role, size = 56, className = '' }: { role: RoleSceneKey; size?: number; className?: string }) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true" focusable="false" role="img">
      <RoleSceneArt role={role} u={u} />
    </svg>
  );
}
