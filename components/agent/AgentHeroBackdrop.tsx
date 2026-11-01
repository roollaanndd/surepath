import React, { useId } from 'react';

/* ─── Latar pita hero Beranda Mitra ──────────────────────────────────────────
 * Sebelumnya pita ini hanya satu gradien rata dari `TierPalette.band`, dan
 * karena satu-satunya tier yang `is_default` di produksi memakai swatch
 * grafit, setiap mitra melihat blok abu-abu gelap yang kosong.
 *
 * Komponen ini mengisinya dengan adegan berlapis: langit yang berganti
 * mengikuti waktu setempat (pagi / siang / sore / malam), siluet kota dan
 * jalan sebagai isyarat mobilitas, serta cahaya lembut yang mengambil warna
 * aksen tier mitra. Vektor sepenuhnya — tidak ada berkas gambar yang diunduh,
 * tajam di setiap kerapatan layar, dan ikut berubah warna dengan tier tanpa
 * perlu aset per-tier.
 *
 * Murni dekoratif: `aria-hidden`, tanpa logika, tanpa state. */

export type HeroDaypart = 'MORNING' | 'DAY' | 'EVENING' | 'NIGHT';

export function heroDaypart(hour: number = new Date().getHours()): HeroDaypart {
  if (hour < 11) return 'MORNING';
  if (hour < 15) return 'DAY';
  if (hour < 18) return 'EVENING';
  return 'NIGHT';
}

/** Langit per waktu. Semuanya gelap-pekat agar teks putih di atasnya tetap
 *  lolos kontras AA tanpa bergantung pada lapisan peredup tambahan. */
const SKY: Record<HeroDaypart, { from: string; mid: string; to: string; bloom: string }> = {
  MORNING: { from: '#0E7A52', mid: '#0A5740', to: '#063728', bloom: 'rgba(253,224,71,0.30)' },
  DAY:     { from: '#0B6E4C', mid: '#07503A', to: '#053226', bloom: 'rgba(167,243,208,0.26)' },
  EVENING: { from: '#115E52', mid: '#0C4038', to: '#07241F', bloom: 'rgba(251,146,60,0.28)' },
  NIGHT:   { from: '#0A4438', mid: '#062B26', to: '#041A18', bloom: 'rgba(125,211,252,0.22)' },
};

interface Props {
  /** Warna aksen tier mitra — dipakai untuk cahaya dan garis sorot. */
  accent?: string;
  /** Diisi hanya oleh tes; selain itu diambil dari jam perangkat. */
  daypart?: HeroDaypart;
  className?: string;
}

const AgentHeroBackdrop: React.FC<Props> = ({ accent = '#00C16A', daypart, className = '' }) => {
  const part = daypart ?? heroDaypart();
  const sky = SKY[part];
  // useId menjaga gradien tetap unik bila pita ini dirender lebih dari sekali.
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      className={`absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 390 300"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={sky.from} />
          <stop offset="52%" stopColor={sky.mid} />
          <stop offset="100%" stopColor={sky.to} />
        </linearGradient>
        <radialGradient id={`${uid}-bloom`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={sky.bloom} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id={`${uid}-accent`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={accent} stopOpacity="0.34" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-sweep`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={`${uid}-city`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.065)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.015)" />
        </linearGradient>
        <linearGradient id={`${uid}-road`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Langit */}
      <rect width="390" height="300" fill={`url(#${uid}-sky)`} />

      {/* Cahaya waktu + cahaya aksen tier */}
      <circle cx="318" cy="24" r="118" fill={`url(#${uid}-bloom)`} />
      <circle cx="54" cy="196" r="132" fill={`url(#${uid}-accent)`} />

      {/* Sapuan cahaya diagonal */}
      <path d="M-40 0H168L54 300H-40Z" fill={`url(#${uid}-sweep)`} />

      {/* Kisi halus — memberi tekstur tanpa menaikkan berat visual */}
      <g opacity="0.5">
        {Array.from({ length: 13 }, (_, i) => (
          <line key={`v${i}`} x1={i * 32} y1="0" x2={i * 32} y2="300" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 32} x2="390" y2={i * 32} stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
        ))}
      </g>

      {/* Siluet kota */}
      <g fill={`url(#${uid}-city)`}>
        <rect x="8" y="214" width="34" height="86" rx="4" />
        <rect x="48" y="188" width="26" height="112" rx="4" />
        <rect x="80" y="232" width="40" height="68" rx="4" />
        <rect x="126" y="200" width="30" height="100" rx="4" />
        <rect x="162" y="238" width="48" height="62" rx="4" />
        <rect x="216" y="206" width="28" height="94" rx="4" />
        <rect x="250" y="226" width="44" height="74" rx="4" />
        <rect x="300" y="194" width="32" height="106" rx="4" />
        <rect x="338" y="228" width="44" height="72" rx="4" />
      </g>
      {/* Jendela menyala — lebih banyak saat malam */}
      <g fill={part === 'NIGHT' ? 'rgba(253,224,71,0.42)' : 'rgba(255,255,255,0.11)'}>
        {[
          [16, 226], [30, 226], [16, 244], [56, 200], [56, 220], [64, 200],
          [134, 212], [144, 212], [134, 232], [224, 218], [232, 218],
          [308, 206], [318, 206], [308, 226], [350, 240], [362, 240],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="6" height="8" rx="1.5" opacity={part === 'NIGHT' && i % 3 === 0 ? 0.9 : undefined} />
        ))}
      </g>

      {/* Garis jalan — isyarat mobilitas, inti bisnis Mitra */}
      <path d="M0 286C70 268 150 266 220 278s112 16 170 2" stroke={`url(#${uid}-road)`} strokeWidth="2" fill="none" />
      <g stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="10 16">
        <path d="M0 296C80 280 160 278 232 288s110 12 158 0" fill="none" />
      </g>
    </svg>
  );
};

export default AgentHeroBackdrop;
