import React from 'react';

/**
 * Latar bergambar untuk pita sapaan super app — digambar sendiri, bukan foto.
 *
 * roland minta pita sapaan Beranda Mitra "lebih modern" dan boleh memakai
 * gambar sebagai latar yang bervariasi (1 Nov 2026). Ini jawabannya: satu
 * adegan SVG inline, bukan berkas foto dan bukan hotlink ke host luar.
 * Alasannya sama dengan yang membuat tujuh foto Unsplash dicopot dari
 * onboarding di v2.7.38 — layar pertama mitra tidak boleh bergantung pada
 * host pihak ketiga, dan di dalam APK Android foto jauh gagal dimuat.
 *
 * Motifnya "jalan yang pasti": punggung bukit berlapis dengan satu rute
 * putus-putus yang mendaki ke arah cakrawala. Itu nama produknya, bukan
 * dekorasi acak.
 *
 * **Variasinya menurut waktu**, mengikuti sapaan yang sudah berubah per jam,
 * jadi mitra yang membuka app pagi dan malam melihat pita yang berbeda tanpa
 * satu pun aset tambahan diunduh.
 *
 * Komposisinya sengaja menjauh dari pojok kanan atas: di sana ada tombol
 * tema, bel, dan avatar. Cahayanya pun bloom tanpa tepi keras, bukan cakram
 * pekat — satu cakram lime sebesar itu terbaca sebagai tombol bundar kedua
 * di sebelah avatar, dan itu sudah dicoba lalu dibuang setelah dilihat.
 *
 * Seluruh warnanya putih dan lime dengan alpha di atas pita hijau korporat;
 * tidak ada warna mentah yang dikunci pada latar, jadi ia ikut apa pun yang
 * dipasang pita di belakangnya, termasuk mode gelap. Murni dekoratif, karena
 * itu `aria-hidden`.
 */
export type DayPart = 'pagi' | 'siang' | 'sore' | 'malam';

/** Bagian hari dari jam setempat — dipakai juga untuk memilih kata sapaan. */
export const dayPartOf = (hour: number): DayPart =>
  hour < 11 ? 'pagi' : hour < 15 ? 'siang' : hour < 19 ? 'sore' : 'malam';

/** Letak dan kuat cahaya per bagian hari, plus bintang hanya di malam hari. */
const SCENE: Record<DayPart, { glowX: number; glowY: number; glow: number; stars: boolean }> = {
  pagi:  { glowX: 330, glowY: 150, glow: 0.30, stars: false },
  siang: { glowX: 250, glowY: 40,  glow: 0.20, stars: false },
  sore:  { glowX: 80,  glowY: 160, glow: 0.34, stars: false },
  malam: { glowX: 300, glowY: 60,  glow: 0.14, stars: true },
};

const STARS = [
  { x: 36, y: 108, r: 1.6 }, { x: 94, y: 128, r: 1.1 }, { x: 150, y: 102, r: 1.4 },
  { x: 208, y: 134, r: 1.2 }, { x: 256, y: 110, r: 1.5 }, { x: 312, y: 146, r: 1 },
];

export const SuperAppBackdrop: React.FC<{ part: DayPart }> = ({ part }) => {
  const s = SCENE[part];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 390 200"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="sp-bd-hill-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="sp-bd-hill-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.19" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id="sp-bd-glow">
          <stop offset="0%" stopColor="#E3EF26" stopOpacity={s.glow} />
          <stop offset="55%" stopColor="#E3EF26" stopOpacity={s.glow * 0.3} />
          <stop offset="100%" stopColor="#E3EF26" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cahaya hari — bloom tanpa tepi, posisinya bergeser menurut jam */}
      <circle cx={s.glowX} cy={s.glowY} r="130" fill="url(#sp-bd-glow)" />

      {s.stars &&
        STARS.map(st => (
          <circle key={`${st.x}-${st.y}`} cx={st.x} cy={st.y} r={st.r} fill="#FFFFFF" opacity="0.45" />
        ))}

      {/* Punggung bukit — dua lapis, kedalaman tanpa satu piksel raster */}
      <path d="M-10 142 C 60 112, 118 158, 186 130 C 250 104, 318 142, 400 116 L400 210 L-10 210 Z" fill="url(#sp-bd-hill-far)" />
      <path d="M-10 170 C 70 146, 132 184, 204 160 C 272 138, 336 170, 400 150 L400 210 L-10 210 Z" fill="url(#sp-bd-hill-near)" />

      {/* Rute putus-putus yang mendaki — motif "jalan yang pasti" */}
      <path
        d="M4 196 C 70 188, 96 166, 156 160 C 212 154, 236 136, 292 130"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="9 11"
      />
      <circle cx="292" cy="130" r="4" fill="#E3EF26" opacity="0.85" />
    </svg>
  );
};

export default SuperAppBackdrop;
