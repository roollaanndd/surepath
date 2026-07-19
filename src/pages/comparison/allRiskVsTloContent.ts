import { SiloPageContent } from '../site/SiloLandingTemplate';

// Standalone comparison guide — docs/SEO_KEYWORD_MAP.md §1.9/§1.10, targets
// "all risk vs tlo" (6.600/mo) and "perbedaan asuransi all risk dan tlo" (6.600/mo).
// Deeper and more decision-framework-oriented than the brief comparison table
// already embedded in the /asuransi-mobil hub — this page is the canonical
// destination for that specific comparison query, the hub links here rather
// than duplicating this depth.

const BASE_URL = 'https://myinsurepath.com';

export const allRiskVsTlo: SiloPageContent = {
  breadcrumb: [
    { name: 'Beranda', path: '/' },
    { name: 'Produk', path: '/products' },
    { name: 'Asuransi Mobil', path: '/asuransi-mobil' },
    { name: 'All Risk vs TLO', path: '/perbandingan/asuransi-all-risk-vs-tlo' },
  ],
  seoTitle: 'Asuransi All Risk vs TLO: Perbedaan & Cara Memilih | SurePath',
  seoDescription: 'Perbedaan lengkap asuransi mobil All Risk dan TLO — cakupan, tarif OJK, dan kapan masing-masing lebih cocok. Bandingkan langsung dan hitung premi kedua jenis polis.',
  category: 'Perbandingan Asuransi Mobil',
  h1: 'Asuransi All Risk vs TLO',
  heroSubtitle: 'Dua jenis pertanggungan asuransi mobil yang paling sering dibandingkan. Berikut perbedaan sebenarnya — bukan sekadar "mana yang lebih murah", tapi mana yang tepat untuk situasimu.',
  heroHighlights: ['Perbandingan Independen', 'Tarif Resmi OJK', 'Bukan Rekomendasi Sepihak'],
  bodyIntro: 'All Risk dan TLO bukan soal "lebih baik" secara mutlak — keduanya dirancang untuk kebutuhan yang berbeda. All Risk menanggung nyaris semua bentuk kerusakan, dari lecet kecil sampai kehilangan total, dengan premi yang lebih tinggi. TLO (Total Loss Only) hanya menanggung kerugian besar — kerusakan ≥75% nilai kendaraan atau kehilangan total — dengan premi jauh lebih ringan. Pilihan yang tepat tergantung usia kendaraan, apakah masih dalam masa kredit, dan seberapa besar risiko yang sanggup kamu tanggung sendiri.',
  benefitsTitle: 'Kenapa Perbandingan Ini Penting',
  benefits: [
    { title: 'Selisih Premi Bisa Jutaan Rupiah', desc: 'Pada mobil yang sama, selisih premi All Risk dan TLO bisa mencapai beberapa juta rupiah per tahun — pilihan yang salah berarti membayar lebih tanpa manfaat tambahan, atau kurang terlindungi.' },
    { title: 'Bukan Keputusan Sekali Seumur Hidup', desc: 'Kamu bisa beralih jenis pertanggungan di periode perpanjangan polis berikutnya, mengikuti perubahan usia dan kondisi kendaraan.' },
    { title: 'Sering Ditentukan Faktor di Luar Preferensi', desc: 'Jika mobil masih dalam masa kredit, lembaga pembiayaan biasanya sudah mewajibkan All Risk — bukan pilihan bebas.' },
  ],
  coverageTitle: 'Perbedaan Cakupan Inti',
  coverageIntro: 'Ini yang sebenarnya membedakan kedua jenis polis.',
  coverageItems: [
    { title: 'All Risk — Kerusakan Sebagian', desc: 'Lecet, penyok, kaca pecah, kerusakan ringan lainnya — semuanya bisa diklaim, bukan hanya kerusakan besar.' },
    { title: 'All Risk — Kerugian Total', desc: 'Sama seperti TLO, All Risk tetap menanggung kehilangan total dan kerusakan ≥75% nilai kendaraan.' },
    { title: 'TLO — Hanya Kerugian Total', desc: 'Kerusakan di bawah ambang 75% dan kerusakan kosmetik sepenuhnya menjadi tanggungan pemilik kendaraan.' },
    { title: 'Keduanya — Perluasan Jaminan Opsional', desc: 'Banjir, gempa, SRCC, dan tanggung jawab pihak ketiga bisa ditambahkan ke kedua jenis polis sebagai add-on terpisah.' },
  ],
  priceTitle: 'Perbandingan Tarif Resmi OJK',
  priceIntro: 'Tarif tahunan sebagai persentase dari harga pertanggungan kendaraan, berlaku nasional (SEOJK No.06/SEOJK.05/2017).',
  priceTable: [
    { label: 'All Risk', value: '1,05% – 4,20% /tahun' },
    { label: 'TLO', value: '0,20% – 0,78% /tahun' },
  ],
  showCalculator: true,
  bodySections: [
    { h: 'Kapan All Risk Lebih Masuk Akal', p: 'Mobil baru atau masih dalam masa kredit — nilai kendaraan yang dipertaruhkan jauh lebih besar dari selisih premi. Kamu juga sering berkendara di area padat dengan risiko lecet/gores tinggi (parkir sempit, jalan macet), di mana klaim kerusakan minor jadi lebih sering dibutuhkan.' },
    { h: 'Kapan TLO Sudah Cukup', p: 'Mobil berusia 5-7 tahun ke atas dan sudah lunas — di titik ini, pemilik biasanya lebih siap menanggung sendiri biaya perbaikan minor, sementara risiko finansial terbesar (kehilangan total) tetap terlindungi dengan premi yang jauh lebih ringan.' },
    { h: 'Ilustrasi Perhitungan', p: 'Untuk mobil senilai Rp 250 juta di Jakarta (Wilayah 2): All Risk berkisar Rp 2,6–9 juta/tahun tergantung tarif spesifik yang berlaku, sementara TLO jauh lebih ringan di kisaran Rp 500 ribu–2 juta/tahun. Gunakan kalkulator di bawah untuk angka yang sesuai kendaraan dan wilayahmu.' },
  ],
  claimProcessTitle: 'Perbedaan Proses Klaim',
  claimIntro: 'Alur dasarnya mirip, tapi cakupan yang bisa diklaim berbeda jauh.',
  claimSteps: [
    { title: 'All Risk — klaim kerusakan sebagian', desc: 'Foto kerusakan, ajukan lewat app, survei, lalu perbaikan di bengkel rekanan — bisa untuk kerusakan sekecil apa pun.' },
    { title: 'TLO — hanya klaim kerugian besar', desc: 'Klaim baru bisa diajukan jika kerusakan mencapai ambang 75% nilai kendaraan atau terjadi kehilangan total.' },
    { title: 'Keduanya — klaim kehilangan', desc: 'Prosedur sama: laporan polisi wajib, masa tunggu verifikasi hingga 60 hari sebelum santunan cair.' },
  ],
  comparisonTitle: 'Ringkasan Perbandingan',
  comparisonIntro: 'Semua perbedaan utama dalam satu tabel.',
  comparisonColA: 'All Risk',
  comparisonColB: 'TLO',
  comparisonRows: [
    { label: 'Lecet & penyok ringan', a: 'Ditanggung', b: 'Tidak ditanggung' },
    { label: 'Kerugian total / pencurian', a: 'Ditanggung', b: 'Ditanggung' },
    { label: 'Tarif tahunan (OJK)', a: '1,05% – 4,20%', b: '0,20% – 0,78%' },
    { label: 'Sering disyaratkan leasing', a: 'Ya', b: 'Jarang' },
    { label: 'Ideal untuk usia kendaraan', a: '0–5 tahun', b: '5+ tahun' },
    { label: 'Cocok untuk mobil kredit', a: 'Ya, umumnya wajib', b: 'Umumnya tidak diizinkan' },
  ],
  faqTitle: 'Pertanyaan Seputar All Risk vs TLO',
  faq: [
    { q: 'Mana yang lebih baik, All Risk atau TLO?', a: 'Tidak ada yang "lebih baik" secara mutlak — tergantung usia kendaraan, status kredit, dan toleransi risiko finansialmu. All Risk lebih menyeluruh, TLO lebih ekonomis untuk risiko besar saja.' },
    { q: 'Apakah TLO tetap menanggung mobil hilang dicuri?', a: 'Ya — kehilangan total akibat pencurian termasuk salah satu dari dua skenario utama yang ditanggung TLO, sama seperti All Risk.' },
    { q: 'Bisakah pindah dari TLO ke All Risk di tengah masa polis?', a: 'Umumnya perubahan jenis pertanggungan berlaku di periode perpanjangan berikutnya, bukan di tengah masa berjalan — konfirmasikan ke tim SurePath untuk opsi yang tersedia.' },
    { q: 'Kenapa mobil kredit harus All Risk?', a: 'Karena lembaga pembiayaan masih punya kepentingan finansial atas kendaraan selama masa kredit, mereka umumnya mensyaratkan cakupan paling menyeluruh untuk melindungi aset tersebut.' },
    { q: 'Apakah selisih premi All Risk dan TLO sepadan?', a: 'Tergantung nilai kendaraan dan frekuensi risiko kerusakan minor di lingkunganmu — gunakan kalkulator untuk melihat selisih nominal aktual pada kendaraanmu, bukan cuma persentase.' },
  ],
  internalLinksTitle: 'Jelajahi Asuransi Mobil',
  internalLinks: [
    { label: 'Asuransi Mobil (Hub)', path: '/asuransi-mobil' },
    { label: 'Asuransi Mobil All Risk', path: '/asuransi-mobil/all-risk' },
    { label: 'Asuransi Mobil TLO', path: '/asuransi-mobil/tlo' },
    { label: 'Premi Asuransi Mobil 2026', path: '/asuransi-mobil/premi' },
    { label: 'Cara Klaim Asuransi Mobil', path: '/asuransi-mobil/klaim' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Asuransi All Risk vs TLO: Pilih yang Mana?', excerpt: 'Versi ringkas — bedah cepat perbedaan All Risk dan TLO.', path: '/blog/asuransi-all-risk-vs-tlo' },
    { title: 'Berapa Premi Asuransi Mobil 2025? Panduan Tarif OJK', excerpt: 'Tarif OJK lengkap per wilayah untuk kedua jenis polis.', path: '/blog/premi-asuransi-mobil-2025' },
  ],
  ctaTitle: 'Sudah Tahu Pilihanmu?',
  ctaSubtitle: 'Bandingkan penawaran All Risk dan TLO dari 10+ perusahaan asuransi sekaligus.',
  extraJsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Asuransi All Risk vs TLO: Perbedaan & Cara Memilih',
    description: 'Perbandingan lengkap asuransi mobil All Risk dan TLO — cakupan, tarif resmi OJK, dan kapan masing-masing lebih cocok.',
    author: { '@type': 'Organization', name: 'SurePath' },
    publisher: { '@id': `${BASE_URL}/#organization` },
    inLanguage: 'id',
    url: `${BASE_URL}/perbandingan/asuransi-all-risk-vs-tlo`,
  }],
};
