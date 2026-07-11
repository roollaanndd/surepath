import React from 'react';

/* ─── Agent App Illustration Kit ─────────────────────────────────────────────
   Custom layered vector art for the Agent app redesign (bank-grade look).
   Two families:
   1. Onboarding scenes (300×300) — rich, animated, drawn for the dark
      emerald onboarding background.
   2. Spot illustrations (compact) — used inside screen hero banners and
      empty states. Self-contained, no external assets.
   Purely presentational — no logic. */

/* ── Shared bits ── */

const anim = (name: string, dur: string, delay = '0s') =>
  ({ animation: `${name} ${dur} ease-in-out ${delay} infinite`, transformOrigin: 'center', transformBox: 'fill-box' } as React.CSSProperties);

export const AgentArtKeyframes = () => (
  <style>{`
    @keyframes aga-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes aga-drift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(7px); } }
    @keyframes aga-pop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
    @keyframes aga-dash { to { stroke-dashoffset: -160; } }
    @keyframes aga-blink { 0%,88%,100% { opacity: 1; } 92%,96% { opacity: 0.25; } }
    @media (prefers-reduced-motion: reduce) { .aga * { animation: none !important; } }
  `}</style>
);

const OnbCanvas: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg className="aga" viewBox="0 0 300 300" width="300" height="300" fill="none" style={{ maxWidth: '76vw', height: 'auto' }}>
    {children}
  </svg>
);

/* ═══ ONBOARDING SCENES (dark emerald background) ═══ */

/* Slide 1 — Welcome: professional agent with ID badge, phone dashboard, shield */
export const ObWelcome = () => (
  <OnbCanvas>
    <circle cx="150" cy="150" r="120" fill="rgba(255,255,255,0.06)" />
    <circle cx="150" cy="150" r="90" fill="rgba(255,255,255,0.06)" />
    {/* phone with dashboard */}
    <g style={anim('aga-float', '3.6s')}>
      <rect x="96" y="46" width="108" height="196" rx="22" fill="#0B1120" />
      <rect x="103" y="56" width="94" height="176" rx="15" fill="#F6FBF8" />
      {/* header strip */}
      <rect x="103" y="56" width="94" height="42" rx="15" fill="url(#agw-g1)" />
      <circle cx="120" cy="77" r="8" fill="rgba(255,255,255,0.9)" />
      <rect x="134" y="70" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.85)" />
      <rect x="134" y="80" width="26" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
      {/* balance card */}
      <rect x="111" y="106" width="78" height="40" rx="10" fill="#0B3D2E" />
      <rect x="118" y="114" width="30" height="4" rx="2" fill="#6EE7B7" />
      <rect x="118" y="124" width="48" height="7" rx="3.5" fill="#fff" />
      <circle cx="178" cy="118" r="6" fill="#FDE047" />
      {/* action tiles */}
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x={111 + i * 27} y="154" width="24" height="24" rx="8" fill="#D9F3E5" />
          <circle cx={123 + i * 27} cy="166" r="5.5" fill="#00A45C" />
        </g>
      ))}
      {/* list rows */}
      <rect x="111" y="188" width="78" height="10" rx="5" fill="#E7F2EC" />
      <rect x="111" y="204" width="60" height="10" rx="5" fill="#E7F2EC" />
    </g>
    {/* floating shield */}
    <g style={anim('aga-pop', '3s', '0.4s')}>
      <path d="M232 84l30 11v23c0 23-18 37-30 42-12-5-30-19-30-42V95l30-11z" fill="url(#agw-g2)" />
      <path d="M218 122l10 10 20-21" stroke="#0B3D2E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    {/* ID badge */}
    <g style={anim('aga-float', '3.2s', '0.8s')}>
      <rect x="34" y="150" width="58" height="74" rx="12" fill="#fff" />
      <rect x="52" y="142" width="22" height="14" rx="5" fill="#FDE047" />
      <circle cx="63" cy="178" r="12" fill="#B9E8CF" />
      <circle cx="63" cy="174" r="5" fill="#0B3D2E" />
      <path d="M53 186c2-6 6-8 10-8s8 2 10 8" fill="#0B3D2E" />
      <rect x="46" y="198" width="34" height="5" rx="2.5" fill="#D1E8DC" />
      <rect x="52" y="208" width="22" height="5" rx="2.5" fill="#D1E8DC" />
    </g>
    {/* sparkles */}
    <g style={anim('aga-blink', '2.4s')}>
      <path d="M58 92l4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10z" fill="#FDE047" />
    </g>
    <defs>
      <linearGradient id="agw-g1" x1="103" y1="56" x2="197" y2="98"><stop stopColor="#00A45C" /><stop offset="1" stopColor="#047857" /></linearGradient>
      <linearGradient id="agw-g2" x1="202" y1="84" x2="262" y2="160"><stop stopColor="#A7F3D0" /><stop offset="1" stopColor="#34D399" /></linearGradient>
    </defs>
  </OnbCanvas>
);

/* Slide 2 — Quote fast: quotation document, OJK stamp, stopwatch, send arrow */
export const ObQuote = () => (
  <OnbCanvas>
    <circle cx="150" cy="150" r="120" fill="rgba(255,255,255,0.06)" />
    {/* document */}
    <g style={anim('aga-float', '3.4s')}>
      <rect x="80" y="52" width="126" height="162" rx="18" fill="#fff" />
      <rect x="96" y="74" width="58" height="11" rx="5.5" fill="#00A45C" />
      <rect x="96" y="97" width="94" height="8" rx="4" fill="#DCEFE5" />
      <rect x="96" y="112" width="94" height="8" rx="4" fill="#DCEFE5" />
      <rect x="96" y="127" width="64" height="8" rx="4" fill="#DCEFE5" />
      {/* premium row highlight */}
      <rect x="96" y="146" width="94" height="24" rx="8" fill="#EFFBF4" stroke="#B9E8CF" />
      <rect x="103" y="154" width="30" height="8" rx="4" fill="#00A45C" />
      <rect x="150" y="154" width="33" height="8" rx="4" fill="#0B3D2E" />
      {/* CTA */}
      <rect x="96" y="182" width="94" height="20" rx="9" fill="url(#agq-g1)" />
      <rect x="122" y="189" width="42" height="6" rx="3" fill="rgba(255,255,255,0.85)" />
      {/* OJK stamp */}
      <g style={anim('aga-pop', '2.6s', '0.5s')}>
        <circle cx="196" cy="72" r="25" fill="#FDE047" />
        <circle cx="196" cy="72" r="19" fill="none" stroke="#A16207" strokeWidth="2.5" strokeDasharray="4 4" />
        <text x="196" y="78" textAnchor="middle" fontSize="13" fontWeight="900" fill="#713F12" fontFamily="Sora, sans-serif">OJK</text>
      </g>
    </g>
    {/* stopwatch */}
    <g style={anim('aga-float', '2.9s', '0.7s')}>
      <circle cx="56" cy="116" r="26" fill="#0B3D2E" />
      <circle cx="56" cy="116" r="19" fill="#EFFBF4" />
      <path d="M56 104v12l9 6" stroke="#00A45C" strokeWidth="4" strokeLinecap="round" />
      <rect x="50" y="84" width="12" height="7" rx="3.5" fill="#0B3D2E" />
    </g>
    {/* send path + paper plane */}
    <path d="M52 238 C 100 240, 110 208, 158 210 S 226 240, 258 218"
      stroke="rgba(255,255,255,0.5)" strokeWidth="4" strokeLinecap="round" strokeDasharray="9 12"
      style={{ animation: 'aga-dash 1.9s linear infinite' }} />
    <g style={anim('aga-drift', '2s')}>
      <path d="M238 200l26 14-30 8 6-11-2-11z" fill="#fff" />
    </g>
    <defs>
      <linearGradient id="agq-g1" x1="96" y1="182" x2="190" y2="202"><stop stopColor="#00A45C" /><stop offset="1" stopColor="#047857" /></linearGradient>
    </defs>
  </OnbCanvas>
);

/* Slide 3 — Wallet: premium bank card, coins, withdraw arrow to bank */
export const ObWallet = () => (
  <OnbCanvas>
    <circle cx="150" cy="150" r="120" fill="rgba(255,255,255,0.06)" />
    {/* bank card */}
    <g style={anim('aga-float', '3.4s')}>
      <rect x="58" y="92" width="152" height="96" rx="18" fill="url(#agc-g1)" />
      <rect x="58" y="92" width="152" height="96" rx="18" fill="url(#agc-shine)" />
      {/* chip */}
      <rect x="74" y="112" width="26" height="20" rx="5" fill="#FDE047" />
      <path d="M74 122h26M87 112v20" stroke="#A16207" strokeWidth="1.6" />
      {/* contactless */}
      <path d="M116 114c4 4 4 12 0 16M123 110c7 7 7 17 0 24" stroke="rgba(255,255,255,0.7)" strokeWidth="2.6" strokeLinecap="round" />
      {/* number */}
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={74 + i * 32} y="150" width="24" height="7" rx="3.5" fill="rgba(255,255,255,0.75)" />
      ))}
      <rect x="74" y="166" width="44" height="6" rx="3" fill="rgba(255,255,255,0.45)" />
      {/* logo dot */}
      <circle cx="188" cy="118" r="10" fill="rgba(255,255,255,0.9)" />
      <circle cx="176" cy="118" r="10" fill="rgba(253,224,71,0.85)" />
    </g>
    {/* coins */}
    {[0, 1, 2].map(i => (
      <g key={i} style={anim('aga-float', `${2.5 + i * 0.4}s`, `${i * 0.45}s`)}>
        <ellipse cx={232 - i * 6} cy={78 - i * 22} rx="17" ry="15" fill="#FDE047" />
        <ellipse cx={232 - i * 6} cy={75 - i * 22} rx="17" ry="15" fill="#FACC15" />
        <text x={232 - i * 6} y={81 - i * 22} textAnchor="middle" fontSize="13" fontWeight="900" fill="#713F12" fontFamily="Sora, sans-serif">Rp</text>
      </g>
    ))}
    {/* withdraw to bank */}
    <g style={anim('aga-float', '3s', '0.8s')}>
      <rect x="64" y="214" width="70" height="48" rx="12" fill="#fff" />
      <path d="M74 232l25-12 25 12" stroke="#0B3D2E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="80" y="236" width="6" height="16" rx="3" fill="#0B3D2E" />
      <rect x="96" y="236" width="6" height="16" rx="3" fill="#0B3D2E" />
      <rect x="112" y="236" width="6" height="16" rx="3" fill="#0B3D2E" />
    </g>
    <path d="M158 218c22 4 40 14 52 30" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeLinecap="round" strokeDasharray="7 10" style={{ animation: 'aga-dash 1.8s linear infinite' }} />
    <path d="M204 236l10 14-17-2z" fill="#fff" />
    <defs>
      <linearGradient id="agc-g1" x1="58" y1="92" x2="210" y2="188"><stop stopColor="#065F46" /><stop offset="1" stopColor="#0B1120" /></linearGradient>
      <linearGradient id="agc-shine" x1="58" y1="92" x2="150" y2="140"><stop stopColor="rgba(255,255,255,0.22)" /><stop offset="1" stopColor="rgba(255,255,255,0)" /></linearGradient>
    </defs>
  </OnbCanvas>
);

/* Slide 4 — Growth: podium trophy, network of partners, rising chart */
export const ObGrowth = () => (
  <OnbCanvas>
    <circle cx="150" cy="150" r="120" fill="rgba(255,255,255,0.06)" />
    {/* rising bars */}
    <g style={anim('aga-float', '3.6s')}>
      <rect x="64" y="196" width="26" height="46" rx="8" fill="rgba(255,255,255,0.35)" />
      <rect x="98" y="176" width="26" height="66" rx="8" fill="rgba(255,255,255,0.55)" />
      <rect x="132" y="152" width="26" height="90" rx="8" fill="#fff" />
      <path d="M64 178 L 106 156 L 146 128 L 196 96" stroke="#FDE047" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 0" />
      <path d="M186 88l16-2-4 16z" fill="#FDE047" />
    </g>
    {/* trophy */}
    <g style={anim('aga-pop', '3s', '0.3s')}>
      <path d="M196 148h44v18c0 14-10 24-22 24s-22-10-22-24v-18z" fill="url(#agt-g1)" />
      <path d="M196 152h-12c0 14 6 22 16 24M240 152h12c0 14-6 22-16 24" stroke="#FDE047" strokeWidth="5" strokeLinecap="round" />
      <rect x="212" y="190" width="12" height="12" fill="#EAB308" />
      <rect x="202" y="202" width="32" height="10" rx="4" fill="#A16207" />
      <path d="M218 158l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1 4-8z" fill="#713F12" />
    </g>
    {/* partner nodes */}
    <path d="M84 96l40 26M84 96l-24 34M84 96l30-28" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeDasharray="6 9" style={{ animation: 'aga-dash 2.2s linear infinite' }} />
    {[{ x: 84, y: 96, r: 20 }, { x: 60, y: 130, r: 13 }, { x: 114, y: 68, r: 13 }, { x: 124, y: 122, r: 13 }].map((n, i) => (
      <g key={i} style={anim('aga-float', `${2.8 + i * 0.3}s`, `${i * 0.35}s`)}>
        <circle cx={n.x} cy={n.y} r={n.r} fill={i === 0 ? '#fff' : 'rgba(255,255,255,0.25)'} stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
        <circle cx={n.x} cy={n.y - n.r * 0.22} r={n.r * 0.3} fill={i === 0 ? '#00A45C' : '#fff'} />
        <path d={`M${n.x - n.r * 0.55} ${n.y + n.r * 0.55}c${n.r * 0.12}-${n.r * 0.38} ${n.r * 0.3}-${n.r * 0.5} ${n.r * 0.55}-${n.r * 0.5}s${n.r * 0.43} ${n.r * 0.12} ${n.r * 0.55} ${n.r * 0.5}`} fill={i === 0 ? '#00A45C' : '#fff'} />
      </g>
    ))}
    <defs>
      <linearGradient id="agt-g1" x1="196" y1="148" x2="240" y2="190"><stop stopColor="#FDE047" /><stop offset="1" stopColor="#EAB308" /></linearGradient>
    </defs>
  </OnbCanvas>
);

/* ═══ SPOT ILLUSTRATIONS (compact, for hero banners & empty states) ═══
   Drawn on 120×120 canvas, tuned to sit on the dark navy/emerald hero. */

interface SpotProps { size?: number; className?: string }
const Spot: React.FC<SpotProps & { children: React.ReactNode; vb?: string }> = ({ size = 96, className = '', children, vb = '0 0 120 120' }) => (
  <svg className={`aga ${className}`} viewBox={vb} width={size} height={size} fill="none">{children}</svg>
);

/* Wallet / commission — bank card + coin */
export const SpotWallet: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.4s')}>
      <rect x="14" y="34" width="76" height="50" rx="10" fill="url(#spw-g)" />
      <rect x="22" y="44" width="14" height="11" rx="3" fill="#FDE047" />
      <rect x="22" y="64" width="34" height="5" rx="2.5" fill="rgba(255,255,255,0.7)" />
      <rect x="22" y="73" width="22" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
      <circle cx="78" cy="48" r="6" fill="rgba(255,255,255,0.85)" />
    </g>
    <g style={anim('aga-pop', '2.6s', '0.4s')}>
      <circle cx="90" cy="82" r="17" fill="#FDE047" />
      <text x="90" y="88" textAnchor="middle" fontSize="13" fontWeight="900" fill="#713F12" fontFamily="Sora, sans-serif">Rp</text>
    </g>
    <defs><linearGradient id="spw-g" x1="14" y1="34" x2="90" y2="84"><stop stopColor="#34D399" /><stop offset="1" stopColor="#059669" /></linearGradient></defs>
  </Spot>
);

/* Orders / policy — stacked documents + check */
export const SpotOrders: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.4s')}>
      <rect x="30" y="18" width="56" height="72" rx="10" fill="rgba(255,255,255,0.25)" />
      <rect x="22" y="26" width="56" height="74" rx="10" fill="#fff" />
      <rect x="30" y="38" width="28" height="6" rx="3" fill="#00A45C" />
      <rect x="30" y="52" width="40" height="5" rx="2.5" fill="#D6EAE0" />
      <rect x="30" y="62" width="40" height="5" rx="2.5" fill="#D6EAE0" />
      <rect x="30" y="72" width="26" height="5" rx="2.5" fill="#D6EAE0" />
    </g>
    <g style={anim('aga-pop', '2.4s', '0.3s')}>
      <circle cx="86" cy="86" r="18" fill="#00C16A" />
      <path d="M78 86l6 6 11-12" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </Spot>
);

/* Clients / CRM — two people + heart */
export const SpotClients: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.2s')}>
      <circle cx="46" cy="46" r="17" fill="#fff" />
      <circle cx="46" cy="41" r="7" fill="#0B3D2E" />
      <path d="M32 58c3-9 8-12 14-12s11 3 14 12" fill="#0B3D2E" />
      <path d="M24 96c4-20 12-28 22-28s18 8 22 28" fill="#fff" />
    </g>
    <g style={anim('aga-float', '3.5s', '0.4s')}>
      <circle cx="82" cy="54" r="14" fill="rgba(255,255,255,0.55)" />
      <circle cx="82" cy="50" r="5.5" fill="#0B3D2E" />
      <path d="M71 63c2.5-7 6.5-9 11-9s8.5 2 11 9" fill="#0B3D2E" />
      <path d="M64 96c3-16 9-22 18-22s15 6 18 22" fill="rgba(255,255,255,0.55)" />
    </g>
    <g style={anim('aga-pop', '2.2s', '0.6s')}>
      <path d="M96 26c-4-5-12-2-12 4 0 5 7 9 12 13 5-4 12-8 12-13 0-6-8-9-12-4z" fill="#FDE047" />
    </g>
  </Spot>
);

/* Claims — shield with bandage/check + camera */
export const SpotClaims: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.4s')}>
      <path d="M56 14l34 13v26c0 26-20 42-34 48-14-6-34-22-34-48V27l34-13z" fill="url(#spc-g)" />
      <path d="M42 56l10 10 22-24" stroke="#0B3D2E" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <g style={anim('aga-pop', '2.6s', '0.4s')}>
      <rect x="72" y="76" width="36" height="28" rx="8" fill="#fff" />
      <path d="M80 76l4-6h12l4 6" stroke="#0B3D2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="90" cy="90" r="8" fill="none" stroke="#00A45C" strokeWidth="3.5" />
    </g>
    <defs><linearGradient id="spc-g" x1="22" y1="14" x2="90" y2="101"><stop stopColor="#A7F3D0" /><stop offset="1" stopColor="#34D399" /></linearGradient></defs>
  </Spot>
);

/* Leaderboard — trophy + stars */
export const SpotTrophy: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.2s')}>
      <path d="M38 26h44v20c0 15-10 26-22 26S38 61 38 46V26z" fill="url(#spt-g)" />
      <path d="M38 30H26c0 14 6 21 15 23M82 30h12c0 14-6 21-15 23" stroke="#FDE047" strokeWidth="5" strokeLinecap="round" />
      <rect x="54" y="72" width="12" height="10" fill="#EAB308" />
      <rect x="44" y="82" width="32" height="10" rx="4" fill="#A16207" />
      <path d="M60 36l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7z" fill="#713F12" />
    </g>
    <g style={anim('aga-blink', '2.2s')}><path d="M96 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" fill="#FDE047" /></g>
    <g style={anim('aga-blink', '2.8s', '0.6s')}><path d="M22 78l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5 2.5-6z" fill="rgba(255,255,255,0.8)" /></g>
    <defs><linearGradient id="spt-g" x1="38" y1="26" x2="82" y2="72"><stop stopColor="#FDE047" /><stop offset="1" stopColor="#EAB308" /></linearGradient></defs>
  </Spot>
);

/* Network — hub + partner nodes */
export const SpotNetwork: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <path d="M60 52L30 88M60 52l32 36M60 52V22" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeDasharray="6 8" style={{ animation: 'aga-dash 2.2s linear infinite' }} />
    <g style={anim('aga-pop', '3s')}>
      <circle cx="60" cy="52" r="17" fill="#fff" />
      <circle cx="60" cy="48" r="5.5" fill="#00A45C" />
      <path d="M50 62c2-6 6-8 10-8s8 2 10 8" fill="#00A45C" />
    </g>
    {[{ x: 30, y: 88 }, { x: 92, y: 88 }, { x: 60, y: 22 }].map((n, i) => (
      <g key={i} style={anim('aga-float', `${2.7 + i * 0.3}s`, `${i * 0.35}s`)}>
        <circle cx={n.x} cy={n.y} r="13" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
        <circle cx={n.x} cy={n.y - 3} r="4.4" fill="#fff" />
        <path d={`M${n.x - 7} ${n.y + 7}c1.4-4 4-6 7-6s5.6 2 7 6`} fill="#fff" />
      </g>
    ))}
  </Spot>
);

/* Renewal — circular arrows + calendar */
export const SpotRenewal: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.4s')}>
      <rect x="28" y="30" width="64" height="60" rx="12" fill="#fff" />
      <rect x="28" y="30" width="64" height="18" rx="9" fill="#00A45C" />
      <rect x="40" y="24" width="7" height="13" rx="3.5" fill="#0B3D2E" />
      <rect x="73" y="24" width="7" height="13" rx="3.5" fill="#0B3D2E" />
      {[0, 1, 2].map(r => [0, 1, 2, 3].map(c => (
        <rect key={`${r}${c}`} x={38 + c * 12} y={56 + r * 10} width="8" height="6" rx="2" fill={r === 1 && c === 2 ? '#00C16A' : '#DCEFE5'} />
      )))}
    </g>
    <g style={anim('aga-pop', '2.6s', '0.4s')}>
      <circle cx="88" cy="84" r="19" fill="#FDE047" />
      <path d="M80 84a8 8 0 0 1 14-5M96 84a8 8 0 0 1-14 5" stroke="#713F12" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M94 76l1 4-4 1M82 92l-1-4 4-1" stroke="#713F12" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </Spot>
);

/* Endorsement — document with pen edit */
export const SpotEndorse: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.4s')}>
      <rect x="26" y="18" width="58" height="76" rx="10" fill="#fff" />
      <rect x="34" y="30" width="28" height="6" rx="3" fill="#00A45C" />
      <rect x="34" y="44" width="42" height="5" rx="2.5" fill="#D6EAE0" />
      <rect x="34" y="54" width="42" height="5" rx="2.5" fill="#D6EAE0" />
      <rect x="34" y="64" width="28" height="5" rx="2.5" fill="#D6EAE0" />
    </g>
    <g style={anim('aga-drift', '2.8s', '0.3s')}>
      <path d="M66 84L94 50c3-4 9-4 12 0s3 9-1 12L74 92l-12 4 4-12z" fill="#FDE047" stroke="#A16207" strokeWidth="2" strokeLinejoin="round" />
    </g>
  </Spot>
);

/* Notifications — bell + dot */
export const SpotBell: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3s')}>
      <path d="M60 22c-16 0-26 12-26 28v14l-8 14h68l-8-14V50c0-16-10-28-26-28z" fill="#fff" />
      <path d="M50 82c1 6 5 10 10 10s9-4 10-10" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <rect x="56" y="14" width="8" height="10" rx="4" fill="#fff" />
    </g>
    <g style={anim('aga-pop', '2s', '0.3s')}><circle cx="88" cy="30" r="11" fill="#FDE047" /></g>
  </Spot>
);

/* Profile — avatar + verified badge */
export const SpotProfile: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.4s')}>
      <circle cx="60" cy="44" r="24" fill="#fff" />
      <circle cx="60" cy="37" r="10" fill="#0B3D2E" />
      <path d="M40 62c4-12 12-16 20-16s16 4 20 16" fill="#0B3D2E" />
      <path d="M22 102c5-26 18-36 38-36s33 10 38 36" fill="#fff" />
    </g>
    <g style={anim('aga-pop', '2.5s', '0.4s')}>
      <circle cx="90" cy="70" r="15" fill="#00C16A" />
      <path d="M83 70l5 5 9-10" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </Spot>
);

/* Marketplace — storefront */
export const SpotMarket: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.4s')}>
      <rect x="26" y="52" width="68" height="44" rx="8" fill="#fff" />
      <path d="M22 52l8-22h60l8 22c0 7-5 12-12 12-6 0-10-4-11-8-1 4-6 8-12 8s-11-4-12-8c-1 4-5 8-11 8-7 0-13-5-12-12z" fill="url(#spm-g)" />
      <rect x="36" y="66" width="20" height="30" rx="4" fill="#0B3D2E" />
      <rect x="62" y="66" width="24" height="18" rx="4" fill="#DCEFE5" />
    </g>
    <defs><linearGradient id="spm-g" x1="22" y1="30" x2="98" y2="64"><stop stopColor="#34D399" /><stop offset="1" stopColor="#059669" /></linearGradient></defs>
  </Spot>
);

/* Empty search / generic empty state (light background) */
export const SpotEmpty: React.FC<SpotProps> = (p) => (
  <Spot {...p}>
    <g style={anim('aga-float', '3.4s')}>
      <rect x="30" y="24" width="60" height="74" rx="12" fill="#EFF6F1" stroke="#D6E7DD" strokeWidth="2" />
      <rect x="40" y="38" width="30" height="6" rx="3" fill="#C3DCCE" />
      <rect x="40" y="52" width="40" height="5" rx="2.5" fill="#DCEBE2" />
      <rect x="40" y="62" width="40" height="5" rx="2.5" fill="#DCEBE2" />
      <rect x="40" y="72" width="24" height="5" rx="2.5" fill="#DCEBE2" />
    </g>
    <g style={anim('aga-pop', '2.6s', '0.3s')}>
      <circle cx="84" cy="82" r="16" fill="#fff" stroke="#00A45C" strokeWidth="4" />
      <path d="M95 94l10 10" stroke="#00A45C" strokeWidth="5" strokeLinecap="round" />
    </g>
  </Spot>
);

/* ═══ AgentHero — shared gradient banner used at the top of agent screens ═══ */

export const AgentHero: React.FC<{
  title: string;
  subtitle?: string;
  art?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, art, children, className = '' }) => (
  <div className={`relative overflow-hidden rounded-[1.75rem] px-5 py-5 text-white ${className}`}
    style={{ background: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 55%, #0B5E3B 100%)', boxShadow: '0 14px 36px -14px rgba(11,17,32,0.55)' }}>
    {/* decorative rings + glow */}
    <div aria-hidden className="absolute -top-14 -right-10 w-48 h-48 rounded-full pointer-events-none"
      style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.28), transparent 70%)' }} />
    <svg aria-hidden className="absolute right-0 top-0 h-full opacity-[0.14] pointer-events-none" viewBox="0 0 200 140" fill="none">
      <circle cx="170" cy="30" r="70" stroke="#fff" strokeWidth="1.4" />
      <circle cx="170" cy="30" r="46" stroke="#fff" strokeWidth="1.4" />
      <circle cx="170" cy="30" r="24" stroke="#fff" strokeWidth="1.4" />
    </svg>
    <div className="relative z-10 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-black tracking-tight leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-white/60 font-medium mt-1 leading-snug">{subtitle}</p>}
        {children}
      </div>
      {art && <div className="flex-shrink-0 -my-1">{art}</div>}
    </div>
  </div>
);

/* Empty-state block for lists (light surface) */
export const AgentEmpty: React.FC<{ title: string; desc?: string; art?: React.ReactNode }> = ({ title, desc, art }) => (
  <div className="flex flex-col items-center text-center gap-3 py-10 px-6">
    {art ?? <SpotEmpty size={110} />}
    <p className="text-sm font-black text-ds-ink">{title}</p>
    {desc && <p className="text-xs text-ds-ink3 max-w-[16rem] leading-relaxed">{desc}</p>}
  </div>
);
