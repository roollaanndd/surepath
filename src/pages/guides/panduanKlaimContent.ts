import { SiloPageContent } from '../site/SiloLandingTemplate';

// Panduan Klaim — horizontal silo per docs/SEO_ARCHITECTURE.md architecture
// (§1 diagram). Different framing from /asuransi-mobil/klaim (a product page
// explaining SurePath's process): these are "it just happened, what do I do
// right now" guides, written for someone mid-incident, cross-linking back to
// the product-specific claim pages for the account-level process.

const BASE_URL = 'https://myinsurepath.com';

const howToJsonLd = (name: string, steps: { title: string; desc: string }[], path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name,
  step: steps.map(s => ({ '@type': 'HowToStep', name: s.title, text: s.desc })),
  url: `${BASE_URL}${path}`,
});

const rootCrumbs = [{ name: 'Beranda', path: '/' }, { name: 'Panduan Klaim', path: '/panduan-klaim' }];

export const panduanKecelakaanMobil: SiloPageContent = {
  breadcrumb: [...rootCrumbs, { name: 'Kecelakaan Mobil', path: '/panduan-klaim/kecelakaan-mobil' }],
  seoTitle: 'Baru Kecelakaan Mobil? Ini yang Harus Dilakukan Sekarang | SurePath',
  seoDescription: 'Panduan darurat setelah kecelakaan mobil: keamanan dulu, dokumentasi, kapan wajib lapor polisi, dan cara mulai klaim asuransi — langkah demi langkah, ditulis untuk dibaca saat panik.',
  category: 'Panduan Darurat',
  h1: 'Baru Saja Kecelakaan Mobil?',
  heroSubtitle: 'Tenang dulu. Ikuti urutan ini — keselamatan dulu, baru dokumentasi dan klaim. Simpan halaman ini sebelum kamu benar-benar membutuhkannya.',
  heroHighlights: ['Urutan Prioritas Jelas', 'Kapan Wajib Lapor Polisi', 'Langsung ke Klaim'],
  bodyIntro: 'Momen setelah kecelakaan adalah saat paling membingungkan untuk berpikir jernih — itu sebabnya panduan ini disusun sebagai urutan langkah sederhana, bukan esai panjang. Ikuti dari atas ke bawah, dan jangan lewati langkah keselamatan demi buru-buru dokumentasi.',
  benefitsTitle: 'Kenapa Urutan Ini Penting',
  benefits: [
    { title: 'Keselamatan Selalu Nomor Satu', desc: 'Cedera fisik tidak bisa menunggu — pastikan semua pihak aman sebelum memikirkan apa pun soal kendaraan atau asuransi.' },
    { title: 'Dokumentasi yang Kurang = Klaim Lebih Lama', desc: 'Foto dan kronologi yang lengkap sejak awal mempercepat proses klaim secara signifikan dibanding melengkapi belakangan.' },
    { title: 'Laporan Polisi Bisa Jadi Wajib', desc: 'Untuk kasus tertentu (melibatkan pihak ketiga, cedera, atau perselisihan), laporan polisi adalah dokumen krusial, bukan opsional.' },
  ],
  coverageTitle: 'Yang Perlu Didokumentasikan',
  coverageIntro: 'Sambil menunggu bantuan atau setelah kondisi aman, kumpulkan ini.',
  coverageItems: [
    { title: 'Foto Lokasi & Kerusakan', desc: 'Dari beberapa sudut, termasuk posisi kendaraan relatif satu sama lain sebelum dipindahkan jika memungkinkan.' },
    { title: 'Data Pihak Lain (jika ada)', desc: 'Nama, nomor telepon, pelat nomor, dan foto SIM/STNK pihak lain yang terlibat.' },
    { title: 'Saksi (jika ada)', desc: 'Nama dan kontak saksi yang melihat kejadian, jika bersedia memberikan keterangan.' },
    { title: 'Kronologi Singkat', desc: 'Tulis apa yang terjadi selagi masih segar di ingatan — waktu, arah, dan urutan kejadian.' },
  ],
  priceTitle: 'Biaya yang Mungkin Timbul',
  priceIntro: 'Selain risiko sendiri klaim, ada biaya lain yang perlu diantisipasi.',
  priceTable: [{ label: 'Risiko sendiri (own risk)', value: '± Rp 300.000 untuk klaim kerusakan sebagian' }],
  showCalculator: false,
  bodySections: [
    { h: 'Langkah 1 — Pastikan Keamanan', p: 'Nyalakan lampu hazard, kenakan rompi reflektif jika ada, dan pindahkan kendaraan ke bahu jalan jika masih bisa dikendarai dan tidak ada cedera serius. Jika ada yang terluka, hubungi layanan darurat (118/119) sebelum melakukan apa pun lagi.' },
    { h: 'Langkah 2 — Kapan Wajib Lapor Polisi', p: 'Wajib jika ada cedera, melibatkan pihak ketiga dengan potensi perselisihan tanggung jawab, atau kerusakan signifikan. Untuk kecelakaan tunggal ringan tanpa pihak lain, laporan polisi tidak selalu wajib tapi tetap bisa membantu proses klaim.' },
    { h: 'Langkah 3 — Dokumentasikan Semuanya', p: 'Ambil waktu untuk foto dan catatan sebelum kondisi lokasi berubah (kendaraan dipindahkan, saksi pergi). Semakin lengkap dokumentasi di titik ini, semakin sedikit follow-up yang dibutuhkan nanti.' },
    { h: 'Langkah 4 — Mulai Klaim', p: 'Setelah kondisi aman dan dokumentasi terkumpul, ajukan laporan lewat aplikasi SurePath dalam 3×24 jam. Untuk panduan lengkap proses klaim setelah tahap ini, lihat halaman Cara Klaim Asuransi Mobil.' },
  ],
  claimProcessTitle: 'Urutan Lengkap',
  claimIntro: 'Ringkasan seluruh langkah dari kejadian sampai klaim diajukan.',
  claimSteps: [
    { title: '1. Amankan diri & orang lain', desc: 'Layanan darurat dulu jika ada cedera.' },
    { title: '2. Pindahkan kendaraan (jika aman)', desc: 'Ke bahu jalan, nyalakan hazard.' },
    { title: '3. Lapor polisi (jika perlu)', desc: 'Wajib untuk cedera/pihak ketiga/perselisihan.' },
    { title: '4. Dokumentasikan', desc: 'Foto, data pihak lain, saksi, kronologi.' },
    { title: '5. Ajukan klaim', desc: 'Lewat app SurePath dalam 3×24 jam.' },
  ],
  faqTitle: 'Pertanyaan Umum Saat Kecelakaan',
  faq: [
    { q: 'Apakah saya boleh memindahkan mobil sebelum polisi datang?', a: 'Jika tidak ada cedera dan kendaraan masih bisa dikendarai, memindahkan ke bahu jalan untuk keamanan lalu lintas umumnya dianjurkan — dokumentasikan posisi awal dengan foto sebelum memindahkan.' },
    { q: 'Bagaimana jika pihak lain menolak bertukar data?', a: 'Catat pelat nomor dan ciri kendaraan sebanyak mungkin, dan pertimbangkan melibatkan pihak berwajib di lokasi jika situasinya memungkinkan.' },
    { q: 'Berapa lama saya punya waktu untuk lapor ke asuransi?', a: 'Sebaiknya dalam 3×24 jam sejak kejadian — semakin cepat dilaporkan, semakin lancar prosesnya.' },
    { q: 'Apakah saya tetap perlu foto jika sudah ada laporan polisi?', a: 'Ya — foto tetap dibutuhkan untuk proses klaim asuransi, laporan polisi adalah dokumen tambahan, bukan pengganti dokumentasi foto.' },
  ],
  internalLinksTitle: 'Langkah Selanjutnya',
  internalLinks: [
    { label: 'Cara Klaim Asuransi Mobil (Lengkap)', path: '/asuransi-mobil/klaim' },
    { label: 'Kenapa Klaim Bisa Ditolak', path: '/panduan-klaim/klaim-ditolak' },
    { label: 'Asuransi Mobil (Hub)', path: '/asuransi-mobil' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Cara Klaim Asuransi Mobil yang Cepat dan Mudah', excerpt: '7 langkah ringkas klaim asuransi mobil dari kejadian sampai selesai.', path: '/blog/cara-klaim-asuransi-mobil' },
  ],
  ctaTitle: 'Belum Punya Asuransi Mobil?',
  ctaSubtitle: 'Bandingkan premi sekarang, supaya kamu siap sebelum kejadian tak terduga datang.',
  extraJsonLd: [howToJsonLd('Cara Menghadapi Kecelakaan Mobil', [
    { title: 'Amankan diri & orang lain', desc: 'Nyalakan hazard, hubungi layanan darurat jika ada cedera.' },
    { title: 'Pindahkan kendaraan jika aman', desc: 'Ke bahu jalan untuk keamanan lalu lintas.' },
    { title: 'Lapor polisi jika perlu', desc: 'Wajib untuk cedera, pihak ketiga, atau perselisihan.' },
    { title: 'Dokumentasikan kejadian', desc: 'Foto, data pihak lain, saksi, kronologi singkat.' },
    { title: 'Ajukan klaim', desc: 'Lewat aplikasi SurePath dalam 3×24 jam.' },
  ], '/panduan-klaim/kecelakaan-mobil')],
};

export const panduanKlaimDitolak: SiloPageContent = {
  breadcrumb: [...rootCrumbs, { name: 'Klaim Ditolak', path: '/panduan-klaim/klaim-ditolak' }],
  seoTitle: 'Kenapa Klaim Asuransi Ditolak? Penyebab & Cara Mengajukan Banding | SurePath',
  seoDescription: 'Penyebab paling umum klaim asuransi ditolak — mobil, kesehatan, kecelakaan diri, perjalanan — dan langkah konkret mengajukan banding jika kamu yakin penolakan tidak tepat.',
  category: 'Panduan Klaim',
  h1: 'Kenapa Klaim Asuransi Ditolak?',
  heroSubtitle: 'Penolakan klaim menyebalkan, tapi seringkali ada alasan spesifik yang bisa diperbaiki — atau dibantah lewat proses banding. Ini panduannya.',
  heroHighlights: ['Penyebab per Kategori', 'Cara Ajukan Banding', 'Cara Mencegah'],
  bodyIntro: 'Klaim ditolak bukan berarti selalu final atau tidak adil — sering kali penyebabnya bisa diidentifikasi dengan jelas, dan beberapa di antaranya bisa diajukan banding dengan dokumen tambahan. Panduan ini merangkum penyebab penolakan paling umum lintas produk, dan langkah konkret jika kamu yakin keputusan tersebut keliru.',
  benefitsTitle: 'Kenapa Memahami Ini Penting',
  benefits: [
    { title: 'Banyak Penolakan Bisa Dicegah', desc: 'Memahami pengecualian polis sebelum kejadian mengurangi risiko klaim ditolak karena kesalahan yang bisa dihindari.' },
    { title: 'Tidak Semua Penolakan Final', desc: 'Proses banding tersedia untuk kasus yang kamu yakini keliru diputuskan — jangan langsung menyerah.' },
    { title: 'Transparansi Sejak Awal', desc: 'SurePath menampilkan ringkasan pengecualian polis secara jelas sebelum kamu membeli, bukan tersembunyi di halaman terakhir.' },
  ],
  coverageTitle: 'Penyebab Penolakan per Kategori',
  coverageIntro: 'Alasan paling umum berbeda sedikit tergantung jenis produk.',
  coverageItems: [
    { title: 'Asuransi Mobil', desc: 'Perluasan jaminan relevan tidak dibeli (mis. banjir tanpa add-on), laporan terlambat, atau pelanggaran berat pengemudi.' },
    { title: 'Asuransi Kesehatan', desc: 'Kondisi pre-existing yang belum lewat masa tunggu, atau prosedur di luar cakupan plan yang dipilih.' },
    { title: 'Kecelakaan Diri (PA)', desc: 'Penyebab ternyata sakit bukan kecelakaan, atau dokumen medis tidak menjelaskan kausalitas dengan jelas.' },
    { title: 'Asuransi Perjalanan', desc: 'Delay di bawah ambang waktu minimum, atau kondisi medis pre-existing yang dikecualikan.' },
  ],
  priceTitle: 'Biaya Proses Banding',
  priceIntro: 'Mengajukan banding umumnya tidak dikenakan biaya tambahan.',
  priceTable: [{ label: 'Biaya banding', value: 'Umumnya tidak ada biaya tambahan — hanya perlu dokumen pendukung' }],
  showCalculator: false,
  bodySections: [
    { h: 'Cara Membaca Alasan Penolakan', p: 'Setiap penolakan klaim wajib disertai alasan tertulis dari perusahaan asuransi. Baca dengan teliti — apakah alasannya soal dokumen yang kurang (bisa dilengkapi), atau soal cakupan polis yang memang tidak mencakup kejadian tersebut (lebih sulit dibanding).' },
    { h: 'Kapan Layak Mengajukan Banding', p: 'Jika kamu yakin dokumen sudah lengkap dan kejadian seharusnya masuk cakupan polis, tapi penolakan tetap terjadi — ajukan banding dengan bukti tambahan yang memperkuat argumenmu, seperti keterangan ahli atau dokumen yang belum sempat disertakan.' },
    { h: 'Cara Mencegah Penolakan Sejak Awal', p: 'Baca ringkasan polis sebelum membeli — terutama bagian pengecualian. Tambahkan perluasan jaminan yang relevan dengan risiko nyata di sekitarmu (banjir untuk area rawan banjir, misalnya). Laporkan kejadian secepat mungkin, jangan menunda.' },
  ],
  claimProcessTitle: 'Langkah Mengajukan Banding',
  claimIntro: 'Jika kamu yakin penolakan tidak tepat.',
  claimSteps: [
    { title: 'Baca alasan penolakan', desc: 'Pahami dasar keputusan sebelum menyusun banding.' },
    { title: 'Kumpulkan bukti tambahan', desc: 'Dokumen yang belum disertakan, atau klarifikasi dari pihak terkait.' },
    { title: 'Ajukan banding lewat SurePath', desc: 'Tim SurePath membantu meneruskan banding ke perusahaan asuransi terkait.' },
    { title: 'Tunggu peninjauan ulang', desc: 'Perusahaan asuransi meninjau ulang klaim dengan bukti tambahan yang diajukan.' },
  ],
  faqTitle: 'Pertanyaan Seputar Klaim Ditolak',
  faq: [
    { q: 'Apakah semua penolakan klaim bisa dibanding?', a: 'Secara teknis bisa diajukan, tapi keberhasilannya tergantung apakah ada bukti tambahan yang cukup kuat untuk mengubah keputusan awal.' },
    { q: 'Berapa lama proses banding?', a: 'Tergantung kompleksitas kasus dan kelengkapan bukti tambahan yang diajukan — tidak ada patokan waktu tunggal untuk semua kasus.' },
    { q: 'Apakah saya bisa lihat detail alasan penolakan?', a: 'Ya — perusahaan asuransi wajib memberikan alasan tertulis untuk setiap penolakan klaim.' },
    { q: 'Apakah bisa minta bantuan SurePath untuk banding?', a: 'Bisa — tim SurePath dapat membantu meneruskan banding dan memastikan dokumen tambahan tersampaikan dengan lengkap ke perusahaan asuransi.' },
  ],
  internalLinksTitle: 'Panduan Terkait',
  internalLinks: [
    { label: 'Cara Klaim Asuransi Mobil', path: '/asuransi-mobil/klaim' },
    { label: 'Baru Kecelakaan Mobil?', path: '/panduan-klaim/kecelakaan-mobil' },
    { label: 'Cara Klaim Asuransi Kesehatan', path: '/asuransi-kesehatan/klaim' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Cara Klaim Asuransi Mobil yang Cepat dan Mudah', excerpt: '7 langkah ringkas klaim asuransi mobil dari kejadian sampai selesai.', path: '/blog/cara-klaim-asuransi-mobil' },
  ],
  ctaTitle: 'Cegah Penolakan Sejak Awal',
  ctaSubtitle: 'Bandingkan polis dengan ringkasan cakupan yang jelas — tidak ada kejutan tersembunyi.',
  extraJsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Kenapa Klaim Asuransi Ditolak? Penyebab & Cara Mengajukan Banding',
    description: 'Penyebab paling umum klaim asuransi ditolak dan langkah mengajukan banding.',
    author: { '@type': 'Organization', name: 'SurePath' },
    publisher: { '@id': `${BASE_URL}/#organization` },
    inLanguage: 'id',
    url: `${BASE_URL}/panduan-klaim/klaim-ditolak`,
  }],
};
