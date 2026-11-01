import React from 'react';

/* ─── Beranda Mitra — hero band backdrop ─────────────────────────────────────
   The greeting band at the top of the partner home used to be a bare two-stop
   gradient. On the default tier that gradient is graphite (#46505F → #23272E),
   so the first thing a partner saw each morning was a flat black slab with
   nothing on it — and it sat directly above the vivid green promo card, which
   made it read as broken rather than restrained.

   This is the layer that gives the band depth: concentric arcs, a dot field, a
   soft horizon, and a shield watermark. Everything is drawn in white at low
   opacity, so it works on top of ANY tier gradient (emerald, silver, platinum,
   diamond, bronze) without needing a variant per tier. The one tier-aware
   piece is the accent glow, which takes the tier's own `glow` colour.

   Purely decorative: `aria-hidden`, no pointer events, no logic. Motion is a
   slow drift that `prefers-reduced-motion` switches off. */

export const HeroArtKeyframes = () => (
  <style>{`
    @keyframes aghero-drift { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(-10px,6px,0); } }
    @keyframes aghero-pulse { 0%,100% { opacity: .42; transform: scale(1); } 50% { opacity: .72; transform: scale(1.06); } }
    @media (prefers-reduced-motion: reduce) {
      .ag-hero-art * { animation: none !important; }
    }
  `}</style>
);

interface Props {
  /** The tier's glow colour, e.g. `rgba(0,193,106,0.22)`. */
  glow: string;
}

const AgentHomeHeroArt: React.FC<Props> = ({ glow }) => (
  <div className="ag-hero-art pointer-events-none absolute inset-0 overflow-hidden rounded-b-[2.25rem]" aria-hidden="true">
    {/* Tier-coloured accent glow, top right */}
    <div
      className="absolute -right-16 -top-20 h-60 w-60 rounded-full blur-3xl"
      style={{ background: glow, animation: 'aghero-pulse 8s ease-in-out infinite' }}
    />
    {/* Cool counter-glow, bottom left, keeps the band from going flat */}
    <div
      className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full blur-3xl"
      style={{ background: 'rgba(255,255,255,0.10)', animation: 'aghero-pulse 11s ease-in-out 1.2s infinite' }}
    />

    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 390 250"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      focusable="false"
    >
      <defs>
        <pattern id="aghero-dots" width="17" height="17" patternUnits="userSpaceOnUse">
          <circle cx="1.4" cy="1.4" r="1.4" fill="rgba(255,255,255,0.14)" />
        </pattern>
        <linearGradient id="aghero-dotfade" x1="0" y1="0" x2="0.65" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="aghero-dotmask">
          <rect width="390" height="250" fill="url(#aghero-dotfade)" />
        </mask>
        <linearGradient id="aghero-horizon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Dot field, fading out downward so it never fights the quick actions */}
      <rect width="390" height="250" fill="url(#aghero-dots)" mask="url(#aghero-dotmask)" />

      {/* Concentric arcs sweeping out of the top-right corner */}
      <g style={{ animation: 'aghero-drift 18s ease-in-out infinite' }}>
        <circle cx="352" cy="-14" r="150" stroke="rgba(255,255,255,0.11)" strokeWidth="1" />
        <circle cx="352" cy="-14" r="114" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
        <circle cx="352" cy="-14" r="78" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      </g>

      {/* Shield watermark — SurePath's own mark, not a borrowed one */}
      <g style={{ animation: 'aghero-drift 24s ease-in-out 2s infinite' }}>
        <path
          d="M306 30l46 16v41c0 28-18 49-46 60-28-11-46-32-46-60V46z"
          fill="rgba(255,255,255,0.07)"
        />
        <path
          d="M306 44l32 11v29c0 20-13 35-32 42-19-7-32-22-32-42V55z"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M289 90l13 13 25-27"
          stroke="rgba(255,255,255,0.13)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Soft horizon line just above the quick-action row */}
      <path d="M0 196H390" stroke="url(#aghero-horizon)" strokeWidth="1.5" />
    </svg>

    {/* Gentle darkening at the very bottom so the white sheet meets a settled edge */}
    <div
      className="absolute inset-x-0 bottom-0 h-20"
      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.16) 100%)' }}
    />
  </div>
);

export default AgentHomeHeroArt;
