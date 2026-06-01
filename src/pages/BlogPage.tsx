import React from 'react';
import { ArrowLeft, Clock, Tag } from 'lucide-react';

interface Props { slug?: string; onBack: () => void; onSignIn: () => void; }

interface Article {
  slug: string; title: string; category: string; readTime: string;
  date: string; excerpt: string; sections: { h: string; p: string }[];
}

const GREEN = 'hsl(119,99%,46%)';

const ARTICLES: Article[] = [
  {
    slug: 'asuransi-all-risk-vs-tlo',
    title: 'Asuransi All Risk vs TLO: Pilih yang Mana?',
    category: 'Edukasi', readTime: '5 menit', date: '28 Mei 2025',
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
    category: 'Panduan', readTime: '4 menit', date: '20 Mei 2025',
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
    category: 'Info Tarif', readTime: '6 menit', date: '12 Mei 2025',
    excerpt: 'OJK menetapkan batas tarif premi resmi berdasarkan wilayah. Cek tarif 2025 dan hitung estimasi premi mobilmu di sini.',
    sections: [
      { h: 'Tarif Wilayah 1 (Sumatera & Kepulauan)', p: 'All Risk: 1,05–2,08% | TLO: 0,24–0,44%. Wilayah ini umumnya punya tarif lebih rendah karena risiko kecelakaan lebih kecil.' },
      { h: 'Tarif Wilayah 2 (DKI Jakarta, Jabar, Banten)', p: 'All Risk: 1,05–3,10% | TLO: 0,25–0,57%. Jabodetabek masuk sini — kepadatan lalu lintas tinggi membuat tarif sedikit lebih mahal.' },
      { h: 'Tarif Wilayah 3 (Selain W1 & W2)', p: 'All Risk: 1,05–4,20% | TLO: 0,28–0,69%. Contoh: mobil Rp 200 juta di Jabodetabek → All Risk sekitar Rp 2,1–6,2 juta/tahun.' },
      { h: 'Cara Kurangi Premi', p: 'Sesuaikan uang pertanggungan dengan nilai pasar kendaraan, tambah add-on hanya yang benar-benar perlu, dan bandingkan penawaran dari 10+ insurer sekaligus di SurePath untuk dapat harga terbaik.' },
    ],
  },
  {
    slug: 'cara-daftar-agen-asuransi',
    title: 'Cara Daftar Jadi Agen Asuransi — Panduan Lengkap',
    category: 'Karir', readTime: '4 menit', date: '5 Mei 2025',
    excerpt: 'Ingin income sampingan fleksibel? Jadi agen asuransi di SurePath bisa kamu mulai dari nol — tanpa modal besar.',
    sections: [
      { h: 'Syarat & Sertifikasi OJK', p: 'Untuk asuransi jiwa kamu butuh sertifikasi AAJI; untuk asuransi umum (termasuk kendaraan) butuh AAUI. SurePath menyediakan modul pelatihan online untuk bantu kamu lulus ujian.' },
      { h: 'Langkah Daftar di SurePath', p: '1) Klik "Daftar Agen" di app. 2) Isi data diri & upload KTP. 3) Selesaikan training online. 4) Akun aktif dalam 3–5 hari kerja — dan kamu siap mulai jual.' },
      { h: 'Potensi Penghasilan', p: 'Komisi agen 5–15% per polis, tergantung produk. Banyak agen SurePath meraih Rp 5–20 juta/bulan hanya dari waktu luang mereka.' },
      { h: 'Keuntungan Bergabung', p: 'Jadwal fleksibel, tools gratis (CRM, kalkulator, materi marketing), dan leads organik dari platform — kamu fokus closing, SurePath urus sisanya.' },
    ],
  },
  {
    slug: 'manfaat-asuransi-perjalanan',
    title: 'Manfaat Asuransi Perjalanan yang Wajib Kamu Tahu',
    category: 'Edukasi', readTime: '3 menit', date: '28 Apr 2025',
    excerpt: 'Perjalanan kamu bisa berubah mendadak. Asuransi perjalanan pastikan kamu tidak harus menanggung biaya tak terduga sendirian.',
    sections: [
      { h: 'Apa yang Ditanggung?', p: 'Kecelakaan & sakit di luar negeri, pembatalan / penundaan penerbangan, kehilangan bagasi, dan evakuasi medis darurat — semuanya ter-cover dalam satu polis.' },
      { h: 'Berapa Biayanya?', p: 'Domestik mulai Rp 15 ribu/hari; internasional mulai Rp 50 ribu/hari. Sangat murah dibanding risiko biaya RS di Singapura yang bisa tembus Rp 50–100 juta.' },
      { h: 'Kenapa Wajib, Terutama ke Luar Negeri?', p: 'Banyak negara (termasuk Schengen) mewajibkan asuransi perjalanan. Tanpa itu, satu kali dirawat di luar negeri bisa menguras tabungan bertahun-tahun.' },
      { h: 'Beli di SurePath — Semudah Itu', p: 'Bisa dibeli menit terakhir sebelum berangkat. Pilih destinasi, durasi, lalu bayar — polis langsung dikirim ke email. Tidak perlu antri atau print.' },
    ],
  },
];

/* ── helpers ──────────────────────────────────────────────────────────────── */
function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span style={{ background: 'rgba(1,235,2,0.12)', color: GREEN, border: `1px solid rgba(1,235,2,0.3)`, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
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
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

/* ── Article Detail ───────────────────────────────────────────────────────── */
function ArticleView({ a, onBack, onSignIn }: { a: Article; onBack: () => void; onSignIn: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
      <SchemaScript a={a} />
      <div style={{ maxWidth: 672, margin: '0 auto', padding: '40px 24px 80px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: GREEN, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: 32, fontSize: 15 }}>
          <ArrowLeft size={16} /> Kembali ke Blog
        </button>
        <CategoryBadge cat={a.category} />
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '16px 0 12px', lineHeight: 1.3 }}>{a.title}</h1>
        <div style={{ display: 'flex', gap: 16, color: '#9ca3af', fontSize: 13, marginBottom: 32 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} />{a.readTime}</span>
          <span>{a.date}</span>
        </div>
        <p style={{ color: '#d1d5db', fontSize: 16, lineHeight: 1.7, marginBottom: 32, fontStyle: 'italic' }}>{a.excerpt}</p>
        {a.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{s.h}</h2>
            <p style={{ color: '#d1d5db', lineHeight: 1.75, fontSize: 15 }}>{s.p}</p>
          </div>
        ))}
        {/* CTA */}
        <div style={{ marginTop: 48, background: 'linear-gradient(135deg,rgba(1,235,2,0.12),rgba(1,235,2,0.04))', border: '1px solid rgba(1,235,2,0.25)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
          <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Mau coba hitung premi kamu?</h3>
          <p style={{ color: '#9ca3af', marginBottom: 20, fontSize: 14 }}>Bandingkan dari 10+ insurer terpercaya — gratis, cepat, dan langsung dapat harga terbaik.</p>
          <button onClick={onSignIn} style={{ background: GREEN, color: '#000', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Hitung Sekarang →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Blog Listing ─────────────────────────────────────────────────────────── */
function ArticleCard({ a, onSelect }: { a: Article; onSelect: () => void }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <CategoryBadge cat={a.category} />
        <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{a.readTime}</span>
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.35, margin: 0 }}>{a.title}</h2>
      <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{a.excerpt}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={11} />{a.date}</span>
        <button onClick={onSelect} style={{ background: 'none', border: `1px solid ${GREEN}`, color: GREEN, borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Baca Selengkapnya →
        </button>
      </div>
    </div>
  );
}

function BlogListing({ onBack, onSelect }: { onBack: () => void; onSelect: (slug: string) => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e5e7eb', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 80px' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: GREEN, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginBottom: 40, fontSize: 15 }}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, color: '#fff', marginBottom: 10 }}>Blog SurePath</h1>
          <p style={{ color: '#9ca3af', fontSize: 16 }}>Tips, panduan, dan info tarif asuransi terkini untuk kamu.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {ARTICLES.map(a => (
            <ArticleCard key={a.slug} a={a} onSelect={() => onSelect(a.slug)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Export ──────────────────────────────────────────────────────────── */
const BlogPage: React.FC<Props> = ({ slug, onBack, onSignIn }) => {
  const [currentSlug, setCurrentSlug] = React.useState<string | undefined>(slug);
  const article = currentSlug ? ARTICLES.find(a => a.slug === currentSlug) : undefined;

  if (article) {
    return <ArticleView a={article} onBack={() => setCurrentSlug(undefined)} onSignIn={onSignIn} />;
  }
  return <BlogListing onBack={onBack} onSelect={setCurrentSlug} />;
};

export default BlogPage;
