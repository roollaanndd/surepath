import React from 'react';
import { ArrowLeft, ArrowRight, Clock, Calendar } from 'lucide-react';

interface Props { slug?: string; onBack: () => void; onSignIn: () => void; navigate?: (path: string) => void; }

type IlloKey = 'shieldCar' | 'claim' | 'tariff' | 'agent' | 'travel';

interface Article {
  slug: string; title: string; category: string; readTime: string;
  date: string; excerpt: string; illo: IlloKey; tint: string;
  sections: { h: string; p: string }[];
  relatedLinks?: { label: string; path: string }[];
}

const GREEN = 'hsl(119,99%,46%)';

/* ── Illustrated SVG covers (self-contained, no external images) ─────────────── */
const Illo: React.FC<{ kind: IlloKey; tint: string }> = ({ kind, tint }) => {
  const S = { width: '100%', height: '100%', display: 'block' } as React.CSSProperties;
  const stroke = '#ffffff';
  const wrap = (children: React.ReactNode) => (
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${tint}, rgba(8,12,10,0.92))` }}>
      {/* dot texture */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: `radial-gradient(${GREEN}22 1px, transparent 1px)`, backgroundSize: '18px 18px' }} />
      <svg viewBox="0 0 200 120" style={S} fill="none" xmlns="http://www.w3.org/2000/svg">{children}</svg>
    </div>
  );

  switch (kind) {
    case 'shieldCar':
      return wrap(<>
        <path d="M100 22 L138 36 V64 C138 86 121 100 100 108 C79 100 62 86 62 64 V36 Z"
          fill={`${GREEN}22`} stroke={GREEN} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M82 70 l5-14 q1-3 4-3 h18 q3 0 4 3 l5 14" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.92"/>
        <rect x="82" y="70" width="36" height="13" rx="3" stroke={stroke} strokeWidth="2" opacity="0.92"/>
        <circle cx="90" cy="83" r="3.5" stroke={stroke} strokeWidth="2"/>
        <circle cx="110" cy="83" r="3.5" stroke={stroke} strokeWidth="2"/>
        <path d="M86 52 l9 9 16 -16" stroke={GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </>);
    case 'claim':
      return wrap(<>
        <rect x="66" y="26" width="56" height="72" rx="7" fill={`${GREEN}1c`} stroke={GREEN} strokeWidth="2.2"/>
        <line x1="76" y1="44" x2="112" y2="44" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" opacity="0.85"/>
        <line x1="76" y1="56" x2="112" y2="56" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" opacity="0.55"/>
        <line x1="76" y1="68" x2="100" y2="68" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" opacity="0.55"/>
        <circle cx="120" cy="82" r="20" fill="rgba(8,12,10,0.9)" stroke={GREEN} strokeWidth="2.4"/>
        <path d="M111 82 l6 6 12 -13" stroke={GREEN} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
      </>);
    case 'tariff':
      return wrap(<>
        <line x1="58" y1="98" x2="146" y2="98" stroke={stroke} strokeWidth="2" opacity="0.4"/>
        <rect x="66" y="70" width="16" height="28" rx="3" fill={`${GREEN}30`} stroke={GREEN} strokeWidth="2"/>
        <rect x="92" y="54" width="16" height="44" rx="3" fill={`${GREEN}40`} stroke={GREEN} strokeWidth="2"/>
        <rect x="118" y="38" width="16" height="60" rx="3" fill={`${GREEN}55`} stroke={GREEN} strokeWidth="2"/>
        <path d="M64 64 l24 -16 l24 -8 l24 -14" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" opacity="0.85"/>
        <path d="M136 26 l4 0 l0 4" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" opacity="0.85"/>
      </>);
    case 'agent':
      return wrap(<>
        <circle cx="100" cy="46" r="16" fill={`${GREEN}22`} stroke={GREEN} strokeWidth="2.2"/>
        <path d="M72 100 c0 -18 13 -28 28 -28 c15 0 28 10 28 28" fill={`${GREEN}14`} stroke={GREEN} strokeWidth="2.2" strokeLinejoin="round"/>
        <path d="M88 44 l8 8 14 -14" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="146" cy="34" r="11" fill="rgba(8,12,10,0.9)" stroke={GREEN} strokeWidth="2"/>
        <path d="M141 34 l4 4 7 -8" stroke={GREEN} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </>);
    case 'travel':
      return wrap(<>
        <circle cx="100" cy="60" r="34" fill={`${GREEN}14`} stroke={GREEN} strokeWidth="2.2"/>
        <ellipse cx="100" cy="60" rx="14" ry="34" stroke={stroke} strokeWidth="1.8" opacity="0.5"/>
        <line x1="66" y1="60" x2="134" y2="60" stroke={stroke} strokeWidth="1.8" opacity="0.5"/>
        <path d="M64 92 Q96 30 150 36" stroke={GREEN} strokeWidth="2.4" strokeDasharray="3 4" strokeLinecap="round"/>
        <path d="M150 30 l8 6 -8 6 2 -6 z" fill={GREEN}/>
      </>);
  }
};

const ARTICLES: Article[] = [
  {
    slug: 'asuransi-all-risk-vs-tlo',
    title: 'Asuransi All Risk vs TLO: Pilih yang Mana?',
    category: 'Edukasi', readTime: '5 menit', date: '28 Mei 2025', illo: 'shieldCar', tint: 'rgba(22,163,74,0.35)',
    excerpt: 'Bingung pilih All Risk atau TLO? Kita bedah perbedaannya lengkap dengan tarif OJK supaya kamu bisa pilih yang paling pas.',
    sections: [
      { h: 'Apa itu All Risk?', p: 'All Risk (Comprehensive) menanggung hampir semua risiko: benturan, lecet, banjir, kerusuhan, hingga tanggung jawab ke pihak ketiga. Cocok buat kamu yang mau ketenangan pikiran penuh.' },
      { h: 'Apa itu TLO?', p: 'TLO (Total Loss Only) hanya cair kalau kerugian ≥75% dari nilai kendaraan atau kendaraan dicuri dan tidak ditemukan. Preminya jauh lebih murah, tapi perlindungan terbatas.' },
      { h: 'Tarif Resmi OJK', p: 'All Risk: 1,05–4,20% dari harga pertanggungan per tahun. TLO: 0,24–0,69%. Perbedaan bisa jutaan rupiah, jadi pilihan yang tepat hemat banyak.' },
      { h: 'Kapan Pilih yang Mana?', p: 'Mobil baru atau masih kredit → All Risk supaya kamu tidak buntung kalau ada apa-apa. Mobil lama atau sudah lunas → TLO cukup, premi lebih ringan. Gunakan kalkulator SurePath untuk hitung selisihnya!' },
    ],
  },
  {
    slug: 'cara-klaim-asuransi-mobil',
    title: 'Cara Klaim Asuransi Mobil yang Cepat dan Mudah',
    category: 'Panduan', readTime: '4 menit', date: '20 Mei 2025', illo: 'claim', tint: 'rgba(16,185,129,0.32)',
    excerpt: 'Klaim asuransi tidak harus ribet. Ikuti 7 langkah ini dan klaim kamu bisa selesai lebih cepat dari yang kamu kira.',
    sections: [
      { h: '7 Langkah Klaim', p: '1) Foto kejadian dari berbagai sudut. 2) Buat laporan polisi jika ada pihak ketiga atau pencurian. 3) Hubungi insurer dalam 3×24 jam. 4) Isi formulir klaim digital. 5) Survei kendaraan dijadwalkan. 6) Perbaikan di bengkel rekanan resmi. 7) Kendaraan selesai diperbaiki & diserahkan.' },
      { h: 'Dokumen yang Dibutuhkan', p: 'SIM & STNK yang masih berlaku, polis asuransi, foto kerusakan, dan (jika ada) surat keterangan dari polisi.' },
      { h: 'Tips Klaim Lebih Cepat via SurePath', p: 'Upload semua dokumen di app SurePath — prosesnya paperless dan tim kita bantu pantau status klaim kamu sampai beres. Rata-rata klaim selesai 3–5 hari kerja.' },
    ],
  },
  {
    slug: 'premi-asuransi-mobil-2025',
    title: 'Berapa Premi Asuransi Mobil 2025? Panduan Tarif OJK',
    category: 'Info Tarif', readTime: '6 menit', date: '12 Mei 2025', illo: 'tariff', tint: 'rgba(5,150,105,0.34)',
    excerpt: 'OJK menetapkan batas tarif premi resmi berdasarkan wilayah. Cek tarif 2025 dan hitung estimasi premi mobilmu di sini.',
    sections: [
      { h: 'Tarif Wilayah 1 (Sumatera & Kepulauan)', p: 'All Risk: 1,05–2,08% | TLO: 0,24–0,44%. Wilayah ini umumnya punya tarif lebih rendah karena risiko kecelakaan lebih kecil.' },
      { h: 'Tarif Wilayah 2 (DKI Jakarta, Jabar, Banten)', p: 'All Risk: 1,05–3,10% | TLO: 0,25–0,57%. Jabodetabek masuk sini — kepadatan lalu lintas tinggi membuat tarif sedikit lebih mahal.' },
      { h: 'Tarif Wilayah 3 (Selain W1 & W2)', p: 'All Risk: 1,05–4,20% | TLO: 0,28–0,69%. Contoh: mobil Rp 200 juta di Jabodetabek → All Risk sekitar Rp 2,1–6,2 juta/tahun.' },
      { h: 'Cara Kurangi Premi', p: 'Sesuaikan uang pertanggungan dengan nilai pasar kendaraan, tambah add-on hanya yang benar-benar perlu, dan bandingkan penawaran dari 10+ insurer sekaligus di SurePath untuk dapat harga terbaik.' },
    ],
  },
  {
    slug: 'cara-daftar-mitra-asuransi',
    title: 'Cara Daftar Jadi Mitra Asuransi — Panduan Lengkap',
    category: 'Karir', readTime: '4 menit', date: '5 Mei 2025', illo: 'agent', tint: 'rgba(34,197,94,0.32)',
    excerpt: 'Ingin income sampingan fleksibel? Jadi mitra asuransi di SurePath bisa kamu mulai dari nol — tanpa modal besar.',
    sections: [
      { h: 'Syarat & Sertifikasi OJK', p: 'Untuk asuransi jiwa kamu butuh sertifikasi AAJI; untuk asuransi umum (termasuk kendaraan) butuh AAUI. SurePath menyediakan modul pelatihan online untuk bantu kamu lulus ujian.' },
      { h: 'Langkah Daftar di SurePath', p: '1) Klik "Daftar Mitra" di app. 2) Isi data diri & upload KTP secara sukarela — data ini akan diteruskan kepada perusahaan asuransi terkait. 3) Selesaikan training online. 4) Akun aktif dalam 3–5 hari kerja — dan kamu siap mulai jual.' },
      { h: 'Potensi Penghasilan', p: 'Komisi mitra 5–15% per polis, tergantung produk. Banyak mitra SurePath meraih Rp 5–20 juta/bulan hanya dari waktu luang mereka.' },
      { h: 'Keuntungan Bergabung', p: 'Jadwal fleksibel, tools gratis (CRM, kalkulator, materi marketing), dan leads organik dari platform — kamu fokus closing, SurePath urus sisanya.' },
    ],
  },
  {
    slug: 'manfaat-asuransi-perjalanan',
    title: 'Manfaat Asuransi Perjalanan yang Wajib Kamu Tahu',
    category: 'Edukasi', readTime: '3 menit', date: '28 Apr 2025', illo: 'travel', tint: 'rgba(20,184,166,0.32)',
    excerpt: 'Perjalanan kamu bisa berubah mendadak. Asuransi perjalanan pastikan kamu tidak harus menanggung biaya tak terduga sendirian.',
    sections: [
      { h: 'Apa yang Ditanggung?', p: 'Kecelakaan & sakit di luar negeri, pembatalan / penundaan penerbangan, kehilangan bagasi, dan evakuasi medis darurat — semuanya ter-cover dalam satu polis.' },
      { h: 'Berapa Biayanya?', p: 'Domestik mulai Rp 15 ribu/hari; internasional mulai Rp 50 ribu/hari. Sangat murah dibanding risiko biaya RS di Singapura yang bisa tembus Rp 50–100 juta.' },
      { h: 'Kenapa Wajib, Terutama ke Luar Negeri?', p: 'Banyak negara (termasuk Schengen) mewajibkan asuransi perjalanan. Tanpa itu, satu kali dirawat di luar negeri bisa menguras tabungan bertahun-tahun.' },
      { h: 'Beli di SurePath — Semudah Itu', p: 'Bisa dibeli menit terakhir sebelum berangkat. Pilih destinasi, durasi, lalu bayar — polis langsung dikirim ke email. Tidak perlu antri atau print.' },
    ],
  },
  {
    slug: 'asuransi-mobil-untuk-ojek-online',
    title: 'Asuransi Mobil untuk Ojek/Taksi Online: Yang Wajib Diketahui',
    category: 'Edukasi', readTime: '4 menit', date: '19 Jul 2026', illo: 'shieldCar', tint: 'rgba(22,163,74,0.34)',
    excerpt: 'Mobilmu dipakai narik Grab/Gojek? Ada satu hal soal polis asuransi yang sering terlewat dan bisa bikin klaim ditolak kalau tidak diketahui dari awal.',
    sections: [
      { h: 'Kenapa Ini Penting Dibahas', p: 'Avanza, Xpander, dan sejenisnya adalah mobil paling umum dipakai untuk layanan transportasi online di Indonesia. Tapi banyak pemilik tidak sadar bahwa polis asuransi mobil pribadi standar umumnya dirancang untuk penggunaan non-komersial.' },
      { h: 'Apa Risikonya Kalau Tidak Diungkapkan?', p: 'Jika kendaraan dipakai rutin untuk ride-hailing tapi polis dibeli sebagai kendaraan pribadi biasa, perusahaan asuransi berpotensi menolak klaim karena penggunaan aktual berbeda dari risiko yang dinilai saat polis diterbitkan.' },
      { h: 'Apa yang Harus Dilakukan', p: 'Sampaikan secara terbuka ke agen atau saat mendaftar polis bahwa kendaraan dipakai untuk ride-hailing. Tanyakan apakah ada produk atau ketentuan khusus yang sesuai — beberapa perusahaan asuransi punya opsi untuk kendaraan berpenggunaan komersial ringan seperti ini.' },
      { h: 'Baca Detail Lengkapnya', p: 'Kami sudah bahas ini lebih detail khusus untuk pemilik Toyota Avanza — model paling umum dipakai ride-hailing — lengkap dengan pertimbangan All Risk vs TLO untuk kasus ini.' },
    ],
    relatedLinks: [
      { label: 'Asuransi Mobil Toyota Avanza — Panduan Lengkap', path: '/asuransi-mobil/model/toyota-avanza' },
      { label: 'Asuransi Mobil (Hub)', path: '/asuransi-mobil' },
    ],
  },
  {
    slug: 'cashless-vs-reimbursement-asuransi-kesehatan',
    title: 'Cashless vs Reimbursement: Cara Klaim Asuransi Kesehatan yang Benar',
    category: 'Panduan', readTime: '4 menit', date: '19 Jul 2026', illo: 'claim', tint: 'rgba(16,185,129,0.32)',
    excerpt: 'Dua cara klaim asuransi kesehatan yang sering bikin bingung — ini bedanya, dan kenapa penting tahu sebelum kamu benar-benar butuh rawat inap.',
    sections: [
      { h: 'Apa Itu Cashless?', p: 'Cashless berarti kamu tidak perlu bayar dulu — cukup tunjukkan kartu digital di rumah sakit rekanan, dan biaya diselesaikan langsung antara rumah sakit dan perusahaan asuransi.' },
      { h: 'Apa Itu Reimbursement?', p: 'Kalau kamu berobat di rumah sakit non-rekanan, kamu bayar dulu di tempat, lalu ajukan penggantian biaya lewat aplikasi dengan kuitansi asli dan dokumen medis lengkap.' },
      { h: 'Mana yang Harus Dipilih?', p: 'Bukan soal pilihan — tergantung rumah sakit tempat kamu berobat. Kalau rekanan, otomatis cashless. Kalau bukan, otomatis jalur reimbursement. Dalam keadaan darurat, prioritaskan RS terdekat, jangan menunda demi mencari RS rekanan.' },
      { h: 'Tips Supaya Reimbursement Lancar', p: 'Simpan kuitansi asli (bukan fotokopi), minta rincian tagihan lengkap, dan minta resume medis dari dokter sebelum pulang — tiga dokumen ini yang paling sering diminta saat verifikasi klaim.' },
    ],
    relatedLinks: [
      { label: 'Cara Klaim Asuransi Kesehatan (Panduan Lengkap)', path: '/asuransi-kesehatan/klaim' },
      { label: 'Rawat Inap Mendadak? Baca Ini Dulu', path: '/panduan-klaim/rawat-inap-mendadak' },
    ],
  },
  {
    slug: 'istilah-asuransi-wajib-dipahami',
    title: '10 Istilah Asuransi yang Wajib Kamu Pahami Sebelum Beli Polis',
    category: 'Edukasi', readTime: '5 menit', date: '19 Jul 2026', illo: 'agent', tint: 'rgba(34,197,94,0.32)',
    excerpt: 'Risiko sendiri, uang pertanggungan, no claim bonus — istilah-istilah ini sering muncul di polis tapi jarang benar-benar dijelaskan. Ini rangkumannya.',
    sections: [
      { h: 'Kenapa Istilah Ini Penting', p: 'Polis asuransi penuh dengan istilah teknis yang menentukan apa yang sebenarnya kamu dapatkan — dan apa yang tidak. Memahaminya sebelum membeli mencegah kekecewaan saat harus klaim.' },
      { h: 'Yang Paling Sering Bikin Bingung', p: 'Risiko sendiri (own risk) — bagian biaya yang kamu tanggung sendiri per klaim. Uang pertanggungan — batas maksimum santunan. Masa tunggu — periode sebelum manfaat tertentu bisa diklaim. No Claim Bonus — insentif kalau tidak pernah klaim setahun penuh.' },
      { h: 'All Risk, TLO, dan Kawan-Kawannya', p: 'Untuk asuransi mobil khususnya, All Risk dan TLO adalah dua istilah paling fundamental yang menentukan seberapa luas cakupan polismu — beda jauh dari sekadar "asuransi mobil" secara umum.' },
      { h: 'Selengkapnya di Glosarium', p: 'Kami kumpulkan 12 istilah paling penting lengkap dengan contoh nyata di halaman Glosarium — bookmark untuk referensi cepat kapan pun kamu baca polis baru.' },
    ],
    relatedLinks: [
      { label: 'Glosarium Asuransi Lengkap', path: '/glosarium' },
      { label: 'Asuransi All Risk vs TLO', path: '/perbandingan/asuransi-all-risk-vs-tlo' },
    ],
  },
];

/* ── helpers ──────────────────────────────────────────────────────────────── */
const BLOG_CSS = `
@keyframes blogfade { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: none; } }
.blog-card { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease, border-color .35s ease; }
.blog-card:hover { transform: translateY(-6px); box-shadow: 0 24px 48px -24px rgba(1,235,2,0.35); border-color: rgba(1,235,2,0.4) !important; }
.blog-card:hover .blog-illo { transform: scale(1.06); }
.blog-illo { transition: transform .5s cubic-bezier(.22,1,.36,1); }
.blog-readmore { transition: gap .25s ease; }
.blog-card:hover .blog-readmore { gap: 10px; }
.blog-featured { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,1fr); }
@media (max-width: 720px) {
  .blog-featured { grid-template-columns: 1fr; }
  .blog-featured > .blog-featured-illo { min-height: 170px !important; }
}
@media (prefers-reduced-motion: reduce) { .blog-card, .blog-illo { transition: none; } .blog-card:hover { transform: none; } }
`;

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span style={{ background: 'rgba(1,235,2,0.12)', color: GREEN, border: `1px solid rgba(1,235,2,0.3)`, borderRadius: 6, padding: '3px 11px', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>
      {cat}
    </span>
  );
}

function SchemaScript({ a }: { a: Article }) {
  const schema = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: a.title, datePublished: a.date, author: { '@type': 'Organization', name: 'SurePath' },
    publisher: { '@type': 'Organization', name: 'SurePath', url: 'https://myinsurepath.com' },
    description: a.excerpt, inLanguage: 'id',
  };
  // Escape '<' so a title/excerpt containing "</script>" can't break out of
  // the JSON-LD block — JSON.stringify does not escape it by default.
  const json = JSON.stringify(schema).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/* ── Article Detail ───────────────────────────────────────────────────────── */
function ArticleView({ a, onBack, onSignIn, navigate }: { a: Article; onBack: () => void; onSignIn: () => void; navigate?: (path: string) => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
      <style>{BLOG_CSS}</style>
      <SchemaScript a={a} />

      {/* Illustrated hero banner */}
      <div style={{ position: 'relative', height: 260, overflow: 'hidden' }}>
        <Illo kind={a.illo} tint={a.tint} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.1), rgba(10,10,10,0.95))' }} />
        <div style={{ position: 'absolute', inset: 0, maxWidth: 720, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 28 }}>
          <button onClick={onBack} style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 6, color: '#fff', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontWeight: 600, fontSize: 13, borderRadius: 10, padding: '8px 14px', backdropFilter: 'blur(8px)' }}>
            <ArrowLeft size={15} /> Kembali ke Blog
          </button>
          <div style={{ animation: 'blogfade .6s cubic-bezier(.22,1,.36,1) both' }}>
            <CategoryBadge cat={a.category} />
            <h1 style={{ fontSize: 'clamp(24px,5vw,34px)', fontWeight: 800, color: '#fff', margin: '14px 0 0', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{a.title}</h1>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 80px' }}>
        <div style={{ display: 'flex', gap: 16, color: '#9ca3af', fontSize: 13, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #1f2937' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={14} />{a.readTime}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={14} />{a.date}</span>
        </div>
        <p style={{ color: '#d1d5db', fontSize: 17, lineHeight: 1.7, marginBottom: 36, fontWeight: 500 }}>{a.excerpt}</p>
        {a.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8, background: 'rgba(1,235,2,0.12)', color: GREEN, border: '1px solid rgba(1,235,2,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{i + 1}</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>{s.h}</h2>
            </div>
            <p style={{ color: '#d1d5db', lineHeight: 1.78, fontSize: 15, paddingLeft: 36 }}>{s.p}</p>
          </div>
        ))}
        {a.relatedLinks && a.relatedLinks.length > 0 && navigate && (
          <div style={{ marginTop: 8, marginBottom: 40, paddingTop: 24, borderTop: '1px solid #1f2937' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 14 }}>Baca Juga</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {a.relatedLinks.map(l => (
                <button key={l.path} onClick={() => navigate(l.path)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', padding: '14px 18px', borderRadius: 12, background: '#101511', border: '1px solid #1f2937', color: '#e5e7eb', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {l.label} <ArrowRight size={14} style={{ color: GREEN, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}
        {/* CTA */}
        <div style={{ marginTop: 48, background: 'linear-gradient(135deg,rgba(1,235,2,0.14),rgba(1,235,2,0.04))', border: '1px solid rgba(1,235,2,0.25)', borderRadius: 18, padding: 36, textAlign: 'center' }}>
          <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Mau coba hitung premi kamu?</h3>
          <p style={{ color: '#9ca3af', marginBottom: 22, fontSize: 14 }}>Bandingkan dari 10+ insurer terpercaya — gratis, cepat, dan langsung dapat harga terbaik.</p>
          <button onClick={onSignIn} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: GREEN, color: '#000', border: 'none', borderRadius: 12, padding: '13px 30px', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Hitung Sekarang <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Blog Listing ─────────────────────────────────────────────────────────── */
function FeaturedCard({ a, onSelect }: { a: Article; onSelect: () => void }) {
  return (
    <div onClick={onSelect} className="blog-card blog-featured"
      style={{ cursor: 'pointer', background: '#101511', border: '1px solid #1f2937', borderRadius: 20, overflow: 'hidden' }}>
      <div className="blog-featured-illo" style={{ position: 'relative', minHeight: 240, overflow: 'hidden' }}>
        <div className="blog-illo" style={{ position: 'absolute', inset: 0 }}><Illo kind={a.illo} tint={a.tint} /></div>
      </div>
      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CategoryBadge cat={a.category} />
          <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, letterSpacing: 0.5, textTransform: 'uppercase' }}>★ Unggulan</span>
        </div>
        <h2 style={{ fontSize: 'clamp(20px,3vw,26px)', fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: 0, letterSpacing: '-0.02em' }}>{a.title}</h2>
        <p style={{ color: '#9ca3af', fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{a.excerpt}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
          <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={13} />{a.readTime}</span>
          <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={13} />{a.date}</span>
          <span className="blog-readmore" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: GREEN, fontWeight: 700, fontSize: 14 }}>
            Baca <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ a, onSelect }: { a: Article; onSelect: () => void }) {
  return (
    <div onClick={onSelect} className="blog-card"
      style={{ cursor: 'pointer', background: '#101511', border: '1px solid #1f2937', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
        <div className="blog-illo" style={{ position: 'absolute', inset: 0 }}><Illo kind={a.illo} tint={a.tint} /></div>
        <div style={{ position: 'absolute', top: 12, left: 12 }}><CategoryBadge cat={a.category} /></div>
      </div>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <h2 style={{ fontSize: 16.5, fontWeight: 700, color: '#fff', lineHeight: 1.35, margin: 0, letterSpacing: '-0.01em' }}>{a.title}</h2>
        <p style={{ color: '#9ca3af', fontSize: 13.5, lineHeight: 1.6, margin: 0, flex: 1 }}>{a.excerpt}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 12, borderTop: '1px solid #1a1f1b' }}>
          <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} />{a.readTime}</span>
          <span className="blog-readmore" style={{ display: 'flex', alignItems: 'center', gap: 5, color: GREEN, fontSize: 13, fontWeight: 700 }}>
            Baca <ArrowRight size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}

function BlogListing({ onBack, onSelect }: { onBack: () => void; onSelect: (slug: string) => void }) {
  const [featured, ...rest] = ARTICLES;
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
      <style>{BLOG_CSS}</style>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 24px 80px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: GREEN, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: 36, fontSize: 15 }}>
          <ArrowLeft size={16} /> Kembali
        </button>

        {/* Header */}
        <div style={{ marginBottom: 36, maxWidth: 640 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase', color: GREEN }}>SurePath Journal</span>
          <h1 style={{ fontSize: 'clamp(30px,6vw,42px)', fontWeight: 800, color: '#fff', margin: '12px 0 12px', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Tips & panduan asuransi<br />yang <span style={{ color: GREEN }}>gampang dipahami</span>
          </h1>
          <p style={{ color: '#9ca3af', fontSize: 16, lineHeight: 1.6 }}>Edukasi, tarif resmi OJK, dan cara klaim — semua dikupas tuntas biar kamu makin yakin sebelum beli.</p>
        </div>

        {/* Featured */}
        <div style={{ marginBottom: 28 }}>
          <FeaturedCard a={featured} onSelect={() => onSelect(featured.slug)} />
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {rest.map(a => (
            <ArticleCard key={a.slug} a={a} onSelect={() => onSelect(a.slug)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Export ──────────────────────────────────────────────────────────── */
const BlogPage: React.FC<Props> = ({ slug, onBack, onSignIn, navigate }) => {
  const [currentSlug, setCurrentSlug] = React.useState<string | undefined>(slug);
  const article = currentSlug ? ARTICLES.find(a => a.slug === currentSlug) : undefined;

  if (article) {
    return <ArticleView a={article} onBack={() => setCurrentSlug(undefined)} onSignIn={onSignIn} navigate={navigate} />;
  }
  return <BlogListing onBack={onBack} onSelect={setCurrentSlug} />;
};

export default BlogPage;
