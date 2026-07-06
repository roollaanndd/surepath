import React from 'react';

/* ─── Illustrative onboarding scenes — layered vector art, emerald palette ───
   Each scene is a self-contained animated SVG composition (no external assets
   except the official logo). Shared canvas: 300×300. */

const Canvas: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 300 300" width="300" height="300" fill="none" style={{ maxWidth: '78vw', height: 'auto' }}>
    {children}
  </svg>
);

const anim = (name: string, dur: string, delay = '0s') =>
  ({ animation: `${name} ${dur} ease-in-out ${delay} infinite`, transformOrigin: 'center', transformBox: 'fill-box' } as React.CSSProperties);

export const ArtKeyframes = () => (
  <style>{`
    @keyframes oa-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
    @keyframes oa-drift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(8px); } }
    @keyframes oa-pop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    @keyframes oa-blink { 0%,88%,100% { opacity: 1; } 92%,96% { opacity: 0.25; } }
    @keyframes oa-dash { to { stroke-dashoffset: -160; } }
    @keyframes oa-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .oa * { animation: none !important; } }
  `}</style>
);

/* Slide C1 — protection umbrella: family of product chips under big shield */
export const ArtProtection = () => (
  <Canvas>
    <circle cx="150" cy="150" r="118" fill="rgba(255,255,255,0.07)" />
    <circle cx="150" cy="150" r="88" fill="rgba(255,255,255,0.07)" />
    {/* big shield */}
    <g style={anim('oa-float', '3.4s')}>
      <path d="M150 52l58 22v44c0 44-34 70-58 80-24-10-58-36-58-80V74l58-22z" fill="url(#oa-g1)" />
      <path d="M150 52l58 22v44c0 44-34 70-58 80V52z" fill="rgba(255,255,255,0.14)" />
      <path d="M118 128l22 22 44-46" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    {/* product chips */}
    <g style={anim('oa-float', '3s', '0.4s')}>
      <rect x="42" y="196" width="60" height="42" rx="14" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.35)" />
      <path d="M56 222h32M60 216l4-7h16l5 7" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="62" cy="224" r="3.4" fill="#fff" /><circle cx="82" cy="224" r="3.4" fill="#fff" />
    </g>
    <g style={anim('oa-float', '3.2s', '0.9s')}>
      <rect x="198" y="196" width="60" height="42" rx="14" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.35)" />
      <path d="M228 208c-6-7-18-3-18 6 0 8 10 13 18 19 8-6 18-11 18-19 0-9-12-13-18-6z" fill="#fff" />
    </g>
    <g style={anim('oa-float', '2.8s', '1.3s')}>
      <rect x="120" y="228" width="60" height="42" rx="14" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.35)" />
      <path d="M136 256l12-12 6 5 10-11" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M158 238l6-1 1 6" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <linearGradient id="oa-g1" x1="92" y1="52" x2="208" y2="198">
        <stop stopColor="#a7f3d0" /><stop offset="1" stopColor="#34d399" />
      </linearGradient>
    </defs>
  </Canvas>
);

/* Slide C2 — photo claim: phone photographing a dented car, AI scan beam */
export const ArtClaim = () => (
  <Canvas>
    <circle cx="150" cy="150" r="118" fill="rgba(255,255,255,0.07)" />
    {/* car */}
    <g style={anim('oa-drift', '4s')}>
      <path d="M52 190h130c8 0 12-4 12-11v-16c0-6-4-11-10-12l-24-4-16-16c-3-3-8-6-13-6H83c-5 0-9 3-11 7l-10 19c-6 2-14 6-14 14v14c0 7 4 11 12 11h-8z" fill="url(#oa-g2)" />
      <circle cx="84" cy="192" r="15" fill="#0b3d2e" /><circle cx="84" cy="192" r="7" fill="#a7f3d0" />
      <circle cx="164" cy="192" r="15" fill="#0b3d2e" /><circle cx="164" cy="192" r="7" fill="#a7f3d0" />
      <path d="M92 142l8-14h32l13 14z" fill="rgba(255,255,255,0.35)" />
      {/* dent mark */}
      <g style={anim('oa-blink', '2.6s')}>
        <circle cx="176" cy="158" r="12" fill="none" stroke="#fde047" strokeWidth="3" strokeDasharray="4 5" />
        <path d="M172 158l4 4 6-7" stroke="#fde047" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </g>
    {/* phone */}
    <g style={anim('oa-float', '3.2s', '0.3s')}>
      <rect x="196" y="64" width="58" height="106" rx="14" fill="#fff" />
      <rect x="203" y="76" width="44" height="72" rx="7" fill="#065f46" />
      <circle cx="225" cy="160" r="5" fill="#065f46" />
      {/* viewfinder */}
      <path d="M209 84h10M209 84v10M241 84h-10M241 84v10M209 140h10M209 140v-10M241 140h-10M241 140v-10"
        stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      <circle cx="225" cy="112" r="10" fill="none" stroke="#34d399" strokeWidth="3" style={anim('oa-pop', '2s')} />
    </g>
    {/* scan beam */}
    <path d="M212 148L182 168" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 8" style={{ animation: 'oa-dash 1.6s linear infinite' }} />
    <defs>
      <linearGradient id="oa-g2" x1="48" y1="126" x2="196" y2="196">
        <stop stopColor="#d1fae5" /><stop offset="1" stopColor="#6ee7b7" />
      </linearGradient>
    </defs>
  </Canvas>
);

/* Slide C3 — human support: agent + chat bubbles + heart */
export const ArtSupport = () => (
  <Canvas>
    <circle cx="150" cy="150" r="118" fill="rgba(255,255,255,0.07)" />
    {/* person */}
    <g style={anim('oa-float', '3.6s')}>
      <circle cx="150" cy="120" r="34" fill="url(#oa-g3)" />
      <path d="M96 226c6-34 28-52 54-52s48 18 54 52" fill="url(#oa-g3)" />
      {/* headset */}
      <path d="M118 116c0-18 14-32 32-32s32 14 32 32" stroke="#065f46" strokeWidth="7" strokeLinecap="round" />
      <rect x="110" y="112" width="12" height="22" rx="6" fill="#065f46" />
      <rect x="178" y="112" width="12" height="22" rx="6" fill="#065f46" />
      <path d="M184 134c0 12-14 20-24 20" stroke="#065f46" strokeWidth="5" strokeLinecap="round" />
      <circle cx="158" cy="155" r="5" fill="#065f46" />
      {/* smile */}
      <circle cx="139" cy="120" r="4" fill="#065f46" /><circle cx="161" cy="120" r="4" fill="#065f46" />
      <path d="M140 133q10 8 20 0" stroke="#065f46" strokeWidth="3.6" strokeLinecap="round" />
    </g>
    {/* chat bubbles */}
    <g style={anim('oa-float', '3s', '0.5s')}>
      <rect x="36" y="70" width="76" height="40" rx="16" fill="#fff" />
      <path d="M56 116l6-8h-12z" fill="#fff" />
      <circle cx="58" cy="90" r="4" fill="#059669" style={anim('oa-blink', '1.8s')} />
      <circle cx="74" cy="90" r="4" fill="#059669" style={anim('oa-blink', '1.8s', '0.2s')} />
      <circle cx="90" cy="90" r="4" fill="#059669" style={anim('oa-blink', '1.8s', '0.4s')} />
    </g>
    <g style={anim('oa-float', '3.4s', '1s')}>
      <rect x="196" y="58" width="70" height="40" rx="16" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" />
      <path d="M231 70c-4-5-12-2-12 4 0 5 7 9 12 13 5-4 12-8 12-13 0-6-8-9-12-4z" fill="#fff" style={anim('oa-pop', '2.2s')} />
    </g>
    <defs>
      <linearGradient id="oa-g3" x1="96" y1="86" x2="204" y2="226">
        <stop stopColor="#a7f3d0" /><stop offset="1" stopColor="#34d399" />
      </linearGradient>
    </defs>
  </Canvas>
);

/* Slide A1 — sell faster: phone with quote doc + rising rocket-path */
export const ArtQuote = () => (
  <Canvas>
    <circle cx="150" cy="150" r="118" fill="rgba(255,255,255,0.07)" />
    {/* document */}
    <g style={anim('oa-float', '3.4s')}>
      <rect x="86" y="58" width="118" height="150" rx="16" fill="#fff" />
      <rect x="102" y="80" width="60" height="10" rx="5" fill="#059669" />
      <rect x="102" y="102" width="86" height="8" rx="4" fill="#d1fae5" />
      <rect x="102" y="118" width="86" height="8" rx="4" fill="#d1fae5" />
      <rect x="102" y="134" width="60" height="8" rx="4" fill="#d1fae5" />
      <rect x="102" y="162" width="86" height="26" rx="9" fill="#059669" />
      <path d="M118 175h54" stroke="#a7f3d0" strokeWidth="5" strokeLinecap="round" />
      {/* % badge */}
      <g style={anim('oa-pop', '2.4s')}>
        <circle cx="204" cy="76" r="24" fill="#fde047" />
        <text x="204" y="83" textAnchor="middle" fontSize="20" fontWeight="900" fill="#065f46" fontFamily="Sora, sans-serif">%</text>
      </g>
    </g>
    {/* speed path */}
    <path d="M46 234 C 96 234, 92 196, 142 196 S 200 234, 254 224"
      stroke="rgba(255,255,255,0.5)" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 12"
      style={{ animation: 'oa-dash 1.8s linear infinite' }} />
    <path d="M236 208l18 14-22 4z" fill="#fff" style={anim('oa-drift', '1.8s')} />
  </Canvas>
);

/* Slide A2 — commission: coin stack + wallet + up arrow */
export const ArtCommission = () => (
  <Canvas>
    <circle cx="150" cy="150" r="118" fill="rgba(255,255,255,0.07)" />
    {/* wallet */}
    <g style={anim('oa-float', '3.4s')}>
      <rect x="72" y="118" width="132" height="96" rx="18" fill="url(#oa-g5)" />
      <rect x="72" y="118" width="132" height="26" rx="13" fill="rgba(255,255,255,0.25)" />
      <rect x="168" y="150" width="52" height="34" rx="12" fill="#fff" />
      <circle cx="186" cy="167" r="7" fill="#059669" />
    </g>
    {/* coins dropping */}
    {[0, 1, 2].map(i => (
      <g key={i} style={anim('oa-float', `${2.4 + i * 0.4}s`, `${i * 0.5}s`)}>
        <ellipse cx={104 + i * 30} cy={84 - i * 14} rx="17" ry="15" fill="#fde047" />
        <text x={104 + i * 30} y={90 - i * 14} textAnchor="middle" fontSize="15" fontWeight="900" fill="#a16207" fontFamily="Sora, sans-serif">Rp</text>
      </g>
    ))}
    {/* growth arrow */}
    <path d="M220 108l26-26M246 82h-18M246 82v18" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={anim('oa-pop', '2.6s')} />
    <defs>
      <linearGradient id="oa-g5" x1="72" y1="118" x2="204" y2="214">
        <stop stopColor="#6ee7b7" /><stop offset="1" stopColor="#10b981" />
      </linearGradient>
    </defs>
  </Canvas>
);

/* Slide A3 — network: connected agent nodes + rising chart */
export const ArtNetwork = () => (
  <Canvas>
    <circle cx="150" cy="150" r="118" fill="rgba(255,255,255,0.07)" />
    {/* links */}
    <path d="M150 128L86 196M150 128l64 68M150 128v-44" stroke="rgba(255,255,255,0.4)" strokeWidth="3.4" strokeDasharray="7 9" style={{ animation: 'oa-dash 2.2s linear infinite' }} />
    {/* hub node */}
    <g style={anim('oa-pop', '3s')}>
      <circle cx="150" cy="128" r="30" fill="#fff" />
      <circle cx="150" cy="121" r="9" fill="#059669" />
      <path d="M134 146c3-9 9-13 16-13s13 4 16 13" fill="#059669" />
    </g>
    {/* member nodes */}
    {[{ x: 86, y: 196 }, { x: 214, y: 196 }, { x: 150, y: 70 }].map((n, i) => (
      <g key={i} style={anim('oa-float', `${2.8 + i * 0.3}s`, `${i * 0.4}s`)}>
        <circle cx={n.x} cy={n.y} r="22" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <circle cx={n.x} cy={n.y - 5} r="7" fill="#fff" />
        <path d={`M${n.x - 12} ${n.y + 12}c2-7 7-10 12-10s10 3 12 10`} fill="#fff" />
      </g>
    ))}
    {/* mini chart */}
    <g style={anim('oa-float', '3.2s', '0.8s')}>
      <rect x="196" y="232" width="14" height="26" rx="4" fill="rgba(255,255,255,0.45)" />
      <rect x="216" y="220" width="14" height="38" rx="4" fill="rgba(255,255,255,0.7)" />
      <rect x="236" y="206" width="14" height="52" rx="4" fill="#fff" />
    </g>
  </Canvas>
);
