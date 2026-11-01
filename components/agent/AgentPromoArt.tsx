import React from 'react';

/* ─── Mitra promo banner artwork ─────────────────────────────────────────────
   Wide (16:7) vector scenes drawn for the Beranda promo carousel. Vector, not
   raster: they ship inside the bundle (no extra request, no hotlinked stock
   photography — the same rule the customer onboarding already follows), stay
   sharp on every screen, and follow the SurePath emerald palette.
   Purely presentational — no logic, no external assets. */

export const PromoArtKeyframes: React.FC = () => (
  <style>{`
    @keyframes spp-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes spp-drift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(8px); } }
    @keyframes spp-pulse { 0%,100% { opacity: .45; transform: scale(1); } 50% { opacity: .85; transform: scale(1.06); } }
    @media (prefers-reduced-motion: reduce) { .spp * { animation: none !important; } }
  `}</style>
);

const float = (dur: string, delay = '0s'): React.CSSProperties => ({
  animation: `spp-float ${dur} ease-in-out ${delay} infinite`,
  transformOrigin: 'center',
  transformBox: 'fill-box',
});

const Canvas: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    className="spp absolute inset-0 h-full w-full"
    viewBox="0 0 320 140"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/* Shared soft background furniture so every scene reads as one family. */
const Backdrop: React.FC<{ from: string; to: string; id: string }> = ({ from, to, id }) => (
  <>
    <defs>
      <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
    <rect width="320" height="140" fill={`url(#${id}-bg)`} />
    <circle cx="286" cy="16" r="58" fill="rgba(255,255,255,0.08)" style={{ animation: 'spp-pulse 7s ease-in-out infinite' }} />
    <circle cx="252" cy="126" r="40" fill="rgba(255,255,255,0.06)" />
    <circle cx="26" cy="124" r="30" fill="rgba(255,255,255,0.05)" />
  </>
);

/* Scene 1 — Jual asuransi mobil: mobil + stempel polis terbit.
   Semua subjek berada di paruh kanan kanvas: paruh kiri tertutup lapis
   gelap pembaca teks, jadi apa pun yang digambar di sana tidak terlihat. */
export const PromoArtCar: React.FC = () => (
  <Canvas>
    <Backdrop id="ppc" from="#0B6844" to="#043A2B" />
    <g style={float('4.2s')}>
      <path d="M186 98h108a9 9 0 0 0 9-9V74c0-9-7-14-16-16l-18-18c-4-4-8-6-13-6h-36c-6 0-11 3-14 7l-15 17c-9 2-15 8-15 16v14a9 9 0 0 0 9 9h1Z" fill="#F6FBF8" />
      <path d="M217 42h29l12 15h-54l13-15Z" fill="#8FE3BC" />
      <circle cx="209" cy="98" r="12" fill="#0B1120" />
      <circle cx="209" cy="98" r="5" fill="#CBF3DF" />
      <circle cx="275" cy="98" r="12" fill="#0B1120" />
      <circle cx="275" cy="98" r="5" fill="#CBF3DF" />
      <rect x="186" y="74" width="20" height="7" rx="3.5" fill="#FDE047" />
    </g>
    {/* stempel "polis terbit" */}
    <g style={float('3.4s', '.45s')}>
      <circle cx="295" cy="34" r="20" fill="#FFFFFF" />
      <path d="M287 34.5l5.5 5.5 11-11.5" stroke="#0B6844" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <g style={{ animation: 'spp-drift 6s ease-in-out infinite' }}>
      <circle cx="176" cy="30" r="4" fill="#FDE047" />
      <circle cx="192" cy="122" r="3" fill="#8FE3BC" />
    </g>
  </Canvas>
);

/* Scene 2 — Komisi & dompet: coins dropping into a wallet card. */
export const PromoArtCommission: React.FC = () => (
  <Canvas>
    <Backdrop id="ppm" from="#B4530A" to="#7A2E05" />
    <g style={float('3.8s')}>
      <rect x="150" y="56" width="134" height="64" rx="16" fill="#FFFFFF" />
      <rect x="150" y="56" width="134" height="20" rx="16" fill="#FFE8C2" />
      <rect x="166" y="88" width="58" height="12" rx="6" fill="#0B1120" />
      <rect x="166" y="106" width="36" height="6" rx="3" fill="#C7A179" />
      <circle cx="258" cy="100" r="14" fill="#FDE047" />
      <text x="258" y="105" textAnchor="middle" fontSize="13" fontWeight="700" fill="#7A2E05">Rp</text>
    </g>
    {[0, 1, 2].map(i => (
      <g key={i} style={float(`${3 + i * 0.5}s`, `${i * 0.35}s`)}>
        <ellipse cx={192 + i * 42} cy={28 + i * 10} rx="17" ry="17" fill="#FDE047" />
        <ellipse cx={192 + i * 42} cy={24 + i * 10} rx="17" ry="13" fill="#FFF3B0" />
        <text x={192 + i * 42} y={29 + i * 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#8A5A00">Rp</text>
      </g>
    ))}
  </Canvas>
);

/* Scene 3 — Survei AI: phone scanning a vehicle, score badge. */
export const PromoArtAi: React.FC = () => (
  <Canvas>
    <Backdrop id="ppa" from="#13487F" to="#071E3C" />
    <g style={float('4s')}>
      <rect x="168" y="22" width="80" height="100" rx="16" fill="#0B1120" />
      <rect x="174" y="29" width="68" height="86" rx="11" fill="#F6FBF8" />
      <rect x="184" y="41" width="48" height="28" rx="7" fill="#DCEBFB" />
      <path d="M189 63l11-12 8 8 7-6 12 10H189Z" fill="#13487F" />
      <rect x="184" y="78" width="32" height="5" rx="2.5" fill="#9DB7D2" />
      <rect x="184" y="90" width="48" height="5" rx="2.5" fill="#C7D6E6" />
    </g>
    <g style={float('3.2s', '.5s')}>
      <circle cx="282" cy="78" r="42" fill="rgba(255,255,255,0.12)" />
      <circle cx="282" cy="78" r="32" fill="#FFFFFF" />
      <text x="282" y="76" textAnchor="middle" fontSize="21" fontWeight="800" fill="#13487F">92</text>
      <text x="282" y="92" textAnchor="middle" fontSize="10" fontWeight="700" fill="#6B8CAE">SKOR AI</text>
    </g>
    {/* scan beam */}
    <g style={{ animation: 'spp-drift 4.5s ease-in-out infinite' }}>
      <rect x="134" y="58" width="30" height="3" rx="1.5" fill="#7FD1FF" opacity=".85" />
      <rect x="140" y="72" width="24" height="3" rx="1.5" fill="#7FD1FF" opacity=".45" />
    </g>
  </Canvas>
);


/* Scene 4 — Pendaftaran mitra: kartu identitas mitra + perisai verifikasi.
   Dipakai sebagai pita hero di layar pendaftaran Mitra. */
export const PromoArtSignup: React.FC = () => (
  <Canvas>
    <Backdrop id="pps" from="#0B6844" to="#06332A" />
    <g style={float('4.4s')}>
      {/* kartu mitra */}
      <rect x="146" y="30" width="118" height="80" rx="16" fill="#FFFFFF" />
      <rect x="146" y="30" width="118" height="24" rx="16" fill="#0B6844" />
      <rect x="158" y="39" width="50" height="6" rx="3" fill="rgba(255,255,255,0.85)" />
      <circle cx="176" cy="80" r="16" fill="#D9F3E5" />
      <circle cx="176" cy="74" r="6" fill="#0B6844" />
      <path d="M164 90c2-7 6-10 12-10s10 3 12 10h-24Z" fill="#0B6844" />
      <rect x="200" y="66" width="52" height="7" rx="3.5" fill="#0B1120" />
      <rect x="200" y="80" width="38" height="5" rx="2.5" fill="#9CC9B6" />
      <rect x="200" y="92" width="26" height="5" rx="2.5" fill="#CBE6DA" />
    </g>
    <g style={float('3.6s', '.5s')}>
      <path d="M288 22l30 11v26c0 19-12 32-30 39-18-7-30-20-30-39V33l30-11Z" fill="#FFFFFF" />
      <path d="M288 31l22 9v19c0 13-9 23-22 29-13-6-22-16-22-29V40l22-9Z" fill="#E3F7EC" />
      <path d="M278 61.5l6.5 6.5L299 53" stroke="#0B6844" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <g style={{ animation: 'spp-drift 6.5s ease-in-out infinite' }}>
      <circle cx="134" cy="34" r="3.5" fill="#FDE047" />
      <circle cx="140" cy="112" r="3" fill="#8FE3BC" />
      <circle cx="268" cy="124" r="4" fill="rgba(255,255,255,.55)" />
    </g>
  </Canvas>
);

export const PROMO_ART = {
  car: PromoArtCar,
  commission: PromoArtCommission,
  ai: PromoArtAi,
} as const;

export type PromoArtKey = keyof typeof PROMO_ART;
