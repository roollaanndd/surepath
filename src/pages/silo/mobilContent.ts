import { SiloPageContent } from '../site/SiloLandingTemplate';

// Flagship silo — Asuransi Mobil (docs/SEO_ARCHITECTURE.md Phase 3, batch P0).
// Rate figures below are derived from the same OJK SEOJK No.06/SEOJK.05/2017
// bands already used by the live calculator (src/pages/site/PremiumCalcWidget.tsx
// OJK_MIN/OJK_MAX), so the static text on each page never contradicts the
// interactive widget rendered on the same page.
//
// All Risk band overall: 1,05%–4,20% | TLO band overall: 0,20%–0,78%
// Wilayah 1 (Sumatera, Papua, Maluku, NTT): All Risk 1,05–4,20% | TLO 0,20–0,69%
// Wilayah 2 (DKI Jakarta, Banten, Jawa Barat): All Risk 1,05–3,59% | TLO 0,20–0,78%
// Wilayah 3 (Jateng, Jatim, Bali, Kalimantan, dst.): All Risk 1,05–2,96% | TLO 0,20–0,56%

const BASE_URL = 'https://myinsurepath.com';

const serviceJsonLd = (name: string, description: string, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: name,
  name,
  description,
  provider: { '@id': `${BASE_URL}/#organization` },
  areaServed: { '@type': 'Country', name: 'Indonesia' },
  url: `${BASE_URL}${path}`,
});

const hubCrumb = { name: 'Asuransi Mobil', path: '/asuransi-mobil' };
const rootCrumbs = [{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/products' }];

const relatedBlog: Record<string, SiloPageContent['relatedArticles'][number]> = {
  allRiskVsTlo: { title: 'Asuransi All Risk vs TLO: Pilih yang Mana?', excerpt: 'Bedah lengkap perbedaan All Risk dan TLO beserta tarif OJK.', path: '/blog/asuransi-all-risk-vs-tlo' },
  klaim: { title: 'Cara Klaim Asuransi Mobil yang Cepat dan Mudah', excerpt: '7 langkah ringkas klaim asuransi mobil dari kejadian sampai selesai.', path: '/blog/cara-klaim-asuransi-mobil' },
  premi: { title: 'Berapa Premi Asuransi Mobil 2025? Panduan Tarif OJK', excerpt: 'Tarif OJK per wilayah dan cara hitung estimasi premi mobilmu.', path: '/blog/premi-asuransi-mobil-2025' },
};

const internalNavAll: SiloPageContent['internalLinks'] = [
  { label: 'Asuransi Mobil All Risk', path: '/asuransi-mobil/all-risk' },
  { label: 'Asuransi Mobil TLO', path: '/asuransi-mobil/tlo' },
  { label: 'Cara Klaim Asuransi Mobil', path: '/asuransi-mobil/klaim' },
  { label: 'Premi Asuransi Mobil 2026', path: '/asuransi-mobil/premi' },
  { label: 'Kalkulator Premi', path: '/kalkulator' },
];

// ─── 1. HUB — /asuransi-mobil ────────────────────────────────────────────────
export const mobilHub: SiloPageContent = {
  breadcrumb: [...rootCrumbs, hubCrumb],
  seoTitle: 'Asuransi Mobil Terpercaya — Premi Mulai 1,05% Tarif OJK | SurePath',
  seoDescription: 'Bandingkan asuransi mobil All Risk & TLO dari 10+ perusahaan berizin OJK. Premi transparan, foto STNK otomatis via AI, klaim cepat lewat HP. Cek premi gratis.',
  category: 'Asuransi Mobil',
  h1: 'Asuransi Mobil, Dibuat Sederhana',
  heroSubtitle: 'Bandingkan penawaran All Risk dan TLO dari perusahaan asuransi berizin OJK, hitung premi transparan tanpa markup tersembunyi, dan ajukan klaim langsung dari HP kapan pun kamu butuh.',
  heroHighlights: ['Terdaftar & Diawasi OJK', '10+ Mitra Asuransi', 'Klaim via Foto, Tanpa Antre'],
  bodyIntro: 'Asuransi mobil melindungi kamu dari beban biaya yang tidak terduga — mulai dari lecet kecil di parkiran sampai kendaraan hilang dicuri. Di Indonesia, premi asuransi mobil diatur oleh Otoritas Jasa Keuangan (OJK) lewat SEOJK No.06/SEOJK.05/2017, sehingga setiap perusahaan asuransi wajib mengenakan tarif dalam kisaran yang sama untuk kategori kendaraan dan wilayah yang sama. Bedanya ada di layanan: kecepatan klaim, jaringan bengkel rekanan, dan kemudahan proses. SurePath membantu kamu membandingkan semua itu dalam satu tempat, lalu membeli polis dalam hitungan menit.',
  benefitsTitle: 'Kenapa Beli Asuransi Mobil di SurePath',
  benefits: [
    { title: 'Bandingkan 10+ Perusahaan Asuransi', desc: 'Lihat penawaran dari berbagai mitra asuransi berizin OJK sekaligus — tidak perlu hubungi satu-satu.' },
    { title: 'Foto STNK, Data Terisi Otomatis', desc: 'AI kami membaca STNK dan mengisi data kendaraan secara otomatis — tidak perlu input manual satu per satu.' },
    { title: 'Tarif Sesuai OJK, Tanpa Markup', desc: 'Premi yang kamu lihat adalah tarif resmi OJK — bukan harga yang dinaikkan sepihak.' },
    { title: 'Klaim Online dari HP', desc: 'Upload foto kerusakan, AI membantu estimasi awal, dan tim kami memandu sampai klaim selesai.' },
    { title: 'Bayar Fleksibel', desc: 'GoPay, DANA, OVO, QRIS, Virtual Account, atau kartu kredit — polis aktif begitu pembayaran terkonfirmasi.' },
    { title: 'Bebas Pilih Bengkel Rekanan', desc: 'Akses jaringan bengkel rekanan resmi dari masing-masing mitra asuransi di kotamu.' },
  ],
  coverageTitle: 'Dua Jenis Perlindungan Utama',
  coverageIntro: 'Semua produk asuransi mobil di Indonesia pada dasarnya masuk ke salah satu dari dua kategori ini.',
  coverageItems: [
    { title: 'All Risk (Komprehensif)', desc: 'Menanggung hampir semua risiko — tabrakan, lecet, kebakaran, pencurian, hingga kerusuhan (SRCC) dan banjir sebagai perluasan jaminan. Premi lebih tinggi, cakupan paling lengkap.' },
    { title: 'TLO (Total Loss Only)', desc: 'Hanya menanggung kerugian total — kerusakan ≥75% nilai kendaraan atau kehilangan akibat pencurian. Premi jauh lebih murah, cocok untuk kendaraan yang sudah lebih tua.' },
    { title: 'Perluasan Jaminan (Add-On)', desc: 'Banjir, gempa bumi, kerusuhan (SRCC), dan tanggung jawab hukum pihak ketiga (TPL) bisa ditambahkan ke polis All Risk maupun TLO sesuai kebutuhan.' },
    { title: 'Tanggung Jawab Pihak Ketiga', desc: 'Melindungi kamu dari biaya ganti rugi jika kendaraanmu menyebabkan kerusakan pada properti atau kendaraan orang lain.' },
  ],
  priceTitle: 'Kisaran Premi (Tarif Resmi OJK)',
  priceIntro: 'Premi dihitung sebagai persentase dari harga pertanggungan (nilai kendaraan), berbeda menurut wilayah dan kategori harga kendaraan.',
  priceTable: [
    { label: 'All Risk — kisaran nasional', value: '1,05% – 4,20% /tahun' },
    { label: 'TLO — kisaran nasional', value: '0,20% – 0,78% /tahun' },
  ],
  showCalculator: true,
  bodySections: [
    { h: 'Kenapa Asuransi Mobil Penting di Indonesia', p: 'Kepadatan lalu lintas tinggi, risiko banjir musiman di banyak kota besar, dan tingginya angka pencurian kendaraan bermotor membuat proteksi finansial bukan pilihan, tapi kebutuhan. Biaya perbaikan bodi mobil setelah tabrakan sedang saja bisa mencapai puluhan juta rupiah — jauh lebih besar dari premi tahunan asuransi itu sendiri.' },
    { h: 'Cara Kerja Asuransi Mobil', p: 'Kamu membayar premi tahunan (atau cicilan bulanan pada beberapa produk), lalu perusahaan asuransi menanggung biaya perbaikan atau penggantian sesuai jenis polis yang dipilih, dikurangi risiko sendiri (own risk) yang telah disepakati di awal.' },
    { h: 'Cara Memilih Antara All Risk dan TLO', p: 'Mobil baru atau masih dalam masa kredit umumnya lebih cocok dengan All Risk — lembaga pembiayaan biasanya juga mensyaratkannya. Mobil berusia di atas 5–7 tahun atau yang sudah lunas cukup dilindungi TLO agar premi lebih ringan tanpa kehilangan proteksi terhadap risiko kehilangan total.' },
  ],
  claimProcessTitle: 'Klaim Cepat, Tanpa Ribet',
  claimIntro: 'Gambaran singkat proses klaim di SurePath — panduan lengkap per jenis kejadian ada di halaman Klaim.',
  claimSteps: [
    { title: 'Laporkan kejadian', desc: 'Foto kerusakan dari beberapa sudut, langsung dari aplikasi SurePath.' },
    { title: 'Estimasi otomatis', desc: 'AI kami memberi estimasi awal tingkat kerusakan dan biaya perbaikan.' },
    { title: 'Survei & approval', desc: 'Tim asuransi memverifikasi klaim, biasanya dalam 1×24 jam kerja.' },
    { title: 'Perbaikan di bengkel rekanan', desc: 'Kendaraan diperbaiki di jaringan bengkel resmi mitra asuransi.' },
  ],
  comparisonTitle: 'All Risk vs TLO — Ringkasan',
  comparisonIntro: 'Perbandingan cepat sebelum kamu memutuskan.',
  comparisonColA: 'All Risk',
  comparisonColB: 'TLO',
  comparisonRows: [
    { label: 'Kerusakan ringan (lecet/penyok)', a: 'Ditanggung', b: 'Tidak ditanggung' },
    { label: 'Kehilangan total / pencurian', a: 'Ditanggung', b: 'Ditanggung' },
    { label: 'Premi tahunan (indikatif)', a: 'Lebih tinggi', b: 'Lebih rendah' },
    { label: 'Cocok untuk', a: 'Mobil baru / kredit', b: 'Mobil tua / lunas' },
  ],
  faqTitle: 'Pertanyaan yang Sering Diajukan',
  faq: [
    { q: 'Apakah asuransi mobil wajib di Indonesia?', a: 'Tidak wajib secara hukum untuk kendaraan pribadi, tapi sangat direkomendasikan mengingat biaya perbaikan dan risiko kehilangan yang tinggi. Sejumlah lembaga pembiayaan mewajibkannya selama masa kredit berjalan.' },
    { q: 'Apakah mobil bekas bisa diasuransikan?', a: 'Bisa, selama usia kendaraan masih memenuhi syarat masing-masing perusahaan asuransi (umumnya di bawah 10–15 tahun untuk All Risk, dengan ketentuan yang lebih longgar untuk TLO).' },
    { q: 'Berapa lama polis aktif setelah membayar?', a: 'Polis aktif dalam hitungan menit setelah pembayaran terkonfirmasi, selama data kendaraan sudah lengkap dan terverifikasi.' },
    { q: 'Bisakah saya ganti dari TLO ke All Risk di tengah masa polis?', a: 'Umumnya perubahan jenis pertanggungan berlaku di periode perpanjangan berikutnya, bukan di tengah masa berjalan — konsultasikan dengan tim SurePath untuk opsi yang tersedia.' },
    { q: 'Apakah premi bisa dicicil?', a: 'Beberapa mitra asuransi menawarkan skema cicilan bulanan; ketersediaannya tergantung produk dan perusahaan asuransi yang dipilih.' },
  ],
  internalLinksTitle: 'Jelajahi Asuransi Mobil',
  internalLinks: internalNavAll,
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [relatedBlog.allRiskVsTlo, relatedBlog.klaim, relatedBlog.premi],
  ctaTitle: 'Siap Bandingkan Premi Mobilmu?',
  ctaSubtitle: 'Cek estimasi premi gratis dalam 2 menit — tanpa perlu daftar dulu.',
  extraJsonLd: [serviceJsonLd('Asuransi Mobil', 'Asuransi mobil All Risk dan TLO dengan tarif resmi OJK, dipasarkan melalui platform SurePath dari perusahaan asuransi berizin.', '/asuransi-mobil')],
};

// ─── 2. ALL RISK — /asuransi-mobil/all-risk ──────────────────────────────────
export const mobilAllRisk: SiloPageContent = {
  breadcrumb: [...rootCrumbs, hubCrumb, { name: 'All Risk', path: '/asuransi-mobil/all-risk' }],
  seoTitle: 'Asuransi Mobil All Risk — Premi 1,05%–4,20%, Cakupan Menyeluruh | SurePath',
  seoDescription: 'Asuransi mobil All Risk menanggung tabrakan, lecet, kebakaran, pencurian, hingga banjir & gempa (add-on). Cek tarif resmi OJK dan hitung premi All Risk mobilmu gratis.',
  category: 'Asuransi Mobil All Risk',
  h1: 'Asuransi Mobil All Risk',
  heroSubtitle: 'Perlindungan paling menyeluruh untuk mobilmu — dari lecet kecil di parkiran sampai kehilangan total. Cocok untuk mobil baru atau yang masih dalam masa kredit.',
  heroHighlights: ['Cakupan Paling Lengkap', 'Tarif Resmi OJK', 'Bengkel Rekanan Resmi'],
  bodyIntro: 'All Risk (Comprehensive) adalah jenis asuransi mobil dengan cakupan paling luas yang tersedia di pasar Indonesia. Berbeda dari TLO yang hanya menanggung kerugian total, All Risk menanggung hampir semua bentuk kerusakan — termasuk kerusakan sebagian (partial loss) seperti lecet, penyok, dan pecah kaca — selama penyebabnya termasuk dalam risiko yang dijamin polis. Karena cakupannya lebih luas, preminya juga lebih tinggi dibanding TLO, tapi untuk mobil baru atau yang masih dicicil, All Risk umumnya jadi pilihan yang lebih masuk akal karena nilai kendaraan yang dipertaruhkan jauh lebih besar dari selisih premi.',
  benefitsTitle: 'Kenapa Pilih All Risk',
  benefits: [
    { title: 'Kerusakan Sebagian Ditanggung', desc: 'Lecet, penyok, kaca pecah — kerusakan kecil sekalipun bisa diklaim, bukan cuma kerusakan besar.' },
    { title: 'Perluasan Risiko Alam', desc: 'Banjir, gempa bumi, dan angin topan bisa ditambahkan sebagai perluasan jaminan sesuai wilayah tempat tinggal.' },
    { title: 'Melindungi Nilai Investasi', desc: 'Untuk mobil baru atau kredit, All Risk menjaga nilai aset kamu tetap terlindungi penuh selama masa cicilan.' },
    { title: 'Sering Disyaratkan Leasing', desc: 'Sebagian besar lembaga pembiayaan mewajibkan All Risk selama kendaraan masih dalam masa kredit.' },
  ],
  coverageTitle: 'Apa Saja yang Ditanggung',
  coverageIntro: 'Rincian risiko yang dijamin polis All Risk standar di Indonesia.',
  coverageItems: [
    { title: 'Tabrakan & Benturan', desc: 'Kerusakan akibat tabrakan dengan kendaraan lain, benda diam, atau kecelakaan tunggal.' },
    { title: 'Lecet, Goresan & Kaca Pecah', desc: 'Kerusakan kosmetik sekalipun — sesuatu yang tidak ditanggung oleh TLO.' },
    { title: 'Kebakaran & Pencurian', desc: 'Termasuk kebakaran akibat korsleting listrik dan pencurian sebagian atau keseluruhan kendaraan.' },
    { title: 'Banjir, Gempa & SRCC (Add-On)', desc: 'Perluasan jaminan untuk bencana alam dan kerusuhan sosial — sangat direkomendasikan untuk wilayah rawan banjir seperti Jabodetabek.' },
  ],
  priceTitle: 'Tarif Premi All Risk per Wilayah OJK',
  priceIntro: 'Premi dihitung sebagai persentase dari harga pertanggungan kendaraan, sesuai SEOJK No.06/SEOJK.05/2017.',
  priceTable: [
    { label: 'Wilayah 1 — Sumatera, Papua, Maluku, NTT', value: '1,05% – 4,20% /tahun' },
    { label: 'Wilayah 2 — DKI Jakarta, Banten, Jawa Barat', value: '1,05% – 3,59% /tahun' },
    { label: 'Wilayah 3 — Jateng, Jatim, Bali, Kalimantan, dst.', value: '1,05% – 2,96% /tahun' },
  ],
  showCalculator: true,
  bodySections: [
    { h: 'Pengecualian — Apa yang Tidak Ditanggung', p: 'All Risk tidak menanggung keausan wajar (normal wear and tear), kerusakan akibat kelalaian berat pengemudi (mis. mengemudi dalam pengaruh alkohol), penggunaan kendaraan di luar tujuan yang dinyatakan dalam polis, atau kerusakan mekanis/elektrikal yang tidak disebabkan oleh kecelakaan. Selalu baca ringkasan polis sebelum membeli.' },
    { h: 'Add-On yang Direkomendasikan', p: 'Untuk kota-kota rawan banjir (Jakarta, Semarang, Surabaya), perluasan jaminan banjir sangat disarankan — kerusakan mesin akibat banjir tanpa add-on ini tidak akan ditanggung. Perluasan SRCC (kerusuhan) juga relevan untuk kota-kota besar dengan riwayat unjuk rasa.' },
    { h: 'Risiko Sendiri (Own Risk)', p: 'Setiap klaim kerusakan sebagian umumnya dikenakan risiko sendiri sekitar Rp 300.000 sesuai ketentuan yang berlaku, kecuali disepakati lain dalam polis. Nilai ini bisa berbeda untuk klaim kehilangan total atau klaim akibat kejadian tertentu — cek detail polis dari mitra asuransi yang kamu pilih.' },
  ],
  claimProcessTitle: 'Klaim All Risk — Langkah Ringkas',
  claimIntro: 'Untuk panduan klaim lengkap per jenis kejadian, lihat halaman Klaim Asuransi Mobil.',
  claimSteps: [
    { title: 'Foto kerusakan', desc: 'Dari beberapa sudut, sertakan foto pelat nomor dan kondisi sekitar.' },
    { title: 'Ajukan klaim di app', desc: 'Isi formulir digital, AI membantu estimasi awal biaya perbaikan.' },
    { title: 'Survei kendaraan', desc: 'Surveyor memverifikasi kerusakan sesuai laporan.' },
    { title: 'Perbaikan & serah terima', desc: 'Bengkel rekanan resmi memperbaiki kendaraan, rata-rata 3–5 hari kerja untuk kerusakan ringan.' },
  ],
  comparisonTitle: 'All Risk vs TLO',
  comparisonIntro: 'Kapan All Risk lebih masuk akal dibanding TLO.',
  comparisonColA: 'All Risk',
  comparisonColB: 'TLO',
  comparisonRows: [
    { label: 'Lecet & penyok ringan', a: 'Ditanggung', b: 'Tidak ditanggung' },
    { label: 'Premi tahunan', a: '1,05% – 4,20%', b: '0,20% – 0,78%' },
    { label: 'Disyaratkan leasing?', a: 'Umumnya ya', b: 'Jarang' },
    { label: 'Ideal untuk usia mobil', a: '0–5 tahun', b: '5+ tahun' },
  ],
  faqTitle: 'Pertanyaan Seputar All Risk',
  faq: [
    { q: 'Apakah All Risk menanggung banjir secara otomatis?', a: 'Tidak — banjir adalah perluasan jaminan (add-on) terpisah yang harus ditambahkan saat membeli polis, bukan bagian dari cakupan dasar.' },
    { q: 'Berapa risiko sendiri (own risk) All Risk?', a: 'Umumnya sekitar Rp 300.000 per klaim kerusakan sebagian, mengikuti ketentuan yang berlaku dan detail polis masing-masing mitra asuransi.' },
    { q: 'Apakah All Risk lebih mahal dari TLO?', a: 'Ya, karena cakupannya jauh lebih luas — All Risk berkisar 1,05%–4,20% dari nilai kendaraan per tahun, sementara TLO 0,20%–0,78%.' },
    { q: 'Bisakah menambah tanggung jawab pihak ketiga (TPL)?', a: 'Bisa, TPL adalah perluasan jaminan yang bisa ditambahkan pada polis All Risk untuk melindungi kamu dari tuntutan ganti rugi pihak lain.' },
    { q: 'Apakah kaca yang retak bisa diklaim tanpa mempengaruhi No Claim Bonus?', a: 'Tergantung ketentuan masing-masing perusahaan asuransi — beberapa insurer menyediakan klaim kaca terpisah tanpa mempengaruhi status klaim tahunan. Konfirmasikan saat membeli polis.' },
  ],
  internalLinksTitle: 'Jelajahi Asuransi Mobil',
  internalLinks: internalNavAll,
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [relatedBlog.allRiskVsTlo, relatedBlog.klaim],
  ctaTitle: 'Lindungi Mobilmu Sepenuhnya',
  ctaSubtitle: 'Hitung premi All Risk sesuai wilayah dan nilai kendaraanmu — gratis, 2 menit.',
  extraJsonLd: [serviceJsonLd('Asuransi Mobil All Risk', 'Asuransi mobil komprehensif yang menanggung kerusakan sebagian dan total, tarif resmi OJK.', '/asuransi-mobil/all-risk')],
};

// ─── 3. TLO — /asuransi-mobil/tlo ────────────────────────────────────────────
export const mobilTlo: SiloPageContent = {
  breadcrumb: [...rootCrumbs, hubCrumb, { name: 'TLO', path: '/asuransi-mobil/tlo' }],
  seoTitle: 'Asuransi Mobil TLO — Premi Mulai 0,20%, Proteksi Kehilangan Total | SurePath',
  seoDescription: 'Asuransi TLO (Total Loss Only) menanggung kehilangan total dan kerusakan ≥75% nilai kendaraan dengan premi lebih ringan dari All Risk. Cek tarif OJK & hitung premi TLO.',
  category: 'Asuransi Mobil TLO',
  h1: 'Asuransi Mobil TLO',
  heroSubtitle: 'Total Loss Only — proteksi fokus pada risiko terbesar (kehilangan total & kerusakan berat) dengan premi jauh lebih ringan dibanding All Risk.',
  heroHighlights: ['Premi Lebih Ringan', 'Cocok Mobil 5+ Tahun', 'Tarif Resmi OJK'],
  bodyIntro: 'TLO (Total Loss Only) adalah jenis asuransi mobil yang hanya menanggung dua skenario: kendaraan hilang akibat pencurian dan tidak ditemukan, atau kendaraan mengalami kerusakan yang biaya perbaikannya mencapai atau melebihi 75% dari nilai pertanggungan. Kerusakan ringan seperti lecet atau penyok tidak ditanggung. Karena cakupannya lebih sempit, premi TLO jauh lebih murah dari All Risk — menjadikannya pilihan populer untuk kendaraan yang sudah lebih tua atau sudah lunas, di mana risiko terbesar yang ingin dihindari pemilik adalah kehilangan aset sepenuhnya, bukan biaya perbaikan kecil.',
  benefitsTitle: 'Kenapa Pilih TLO',
  benefits: [
    { title: 'Premi Jauh Lebih Murah', desc: 'Mulai dari 0,20% nilai kendaraan per tahun — signifikan lebih ringan dibanding All Risk.' },
    { title: 'Tetap Terlindungi dari Risiko Terbesar', desc: 'Kehilangan total dan pencurian — risiko finansial paling besar — tetap ditanggung penuh.' },
    { title: 'Ideal untuk Kendaraan Tua', desc: 'Untuk mobil di atas 5–7 tahun, biaya perbaikan minor biasanya lebih terjangkau untuk ditanggung sendiri.' },
    { title: 'Bisa Ditambah TPL', desc: 'Tanggung jawab pihak ketiga tetap bisa ditambahkan sebagai perluasan jaminan terpisah.' },
  ],
  coverageTitle: 'Apa yang Ditanggung TLO',
  coverageIntro: 'TLO berfokus pada kerugian besar, bukan kerusakan kosmetik harian.',
  coverageItems: [
    { title: 'Kehilangan Total (Pencurian)', desc: 'Kendaraan dicuri dan tidak ditemukan dalam jangka waktu yang ditentukan polis (umumnya 60 hari).' },
    { title: 'Kerusakan Total (≥75% Nilai)', desc: 'Biaya perbaikan yang mencapai atau melebihi 75% dari harga pertanggungan kendaraan.' },
    { title: 'Tanggung Jawab Pihak Ketiga (Opsional)', desc: 'Bisa ditambahkan sebagai perluasan jaminan untuk melindungi dari tuntutan ganti rugi pihak lain.' },
    { title: 'Tidak Menanggung Lecet & Kerusakan Minor', desc: 'Transparansi penting: penyok, goresan, dan kerusakan kecil lain menjadi tanggung jawab pemilik kendaraan.' },
  ],
  priceTitle: 'Tarif Premi TLO per Wilayah OJK',
  priceIntro: 'Sama seperti All Risk, tarif TLO diatur SEOJK No.06/SEOJK.05/2017 dan dihitung dari harga pertanggungan.',
  priceTable: [
    { label: 'Wilayah 1 — Sumatera, Papua, Maluku, NTT', value: '0,20% – 0,69% /tahun' },
    { label: 'Wilayah 2 — DKI Jakarta, Banten, Jawa Barat', value: '0,20% – 0,78% /tahun' },
    { label: 'Wilayah 3 — Jateng, Jatim, Bali, Kalimantan, dst.', value: '0,20% – 0,56% /tahun' },
  ],
  showCalculator: true,
  bodySections: [
    { h: 'Apa Itu "Kerugian Total" dalam TLO?', p: 'Bukan berarti mobil harus hancur total secara fisik — cukup jika estimasi biaya perbaikan mencapai atau melebihi 75% dari harga pertanggungan yang tercantum di polis. Surveyor asuransi yang menentukan status ini berdasarkan estimasi bengkel resmi.' },
    { h: 'TLO Cocok untuk Siapa?', p: 'Pemilik mobil berusia 5 tahun ke atas yang sudah lunas, kendaraan operasional/armada dengan anggaran perawatan sendiri, atau siapa pun yang ingin proteksi dasar dengan biaya minimal tanpa mengorbankan perlindungan terhadap risiko kehilangan total.' },
    { h: 'Kapan Sebaiknya Upgrade ke All Risk?', p: 'Jika kamu baru membeli mobil, masih dalam masa kredit, atau tinggal di area rawan kecelakaan/banjir dengan mobilitas tinggi, selisih premi ke All Risk biasanya sepadan dengan ketenangan pikiran tambahan yang didapat.' },
  ],
  claimProcessTitle: 'Klaim TLO — Langkah Ringkas',
  claimIntro: 'Klaim kehilangan memerlukan dokumen tambahan dibanding klaim kerusakan.',
  claimSteps: [
    { title: 'Laporkan ke polisi', desc: 'Wajib untuk klaim pencurian — surat keterangan kehilangan dari kepolisian adalah syarat utama.' },
    { title: 'Ajukan klaim di app', desc: 'Lampirkan surat keterangan polisi, STNK, BPKB, dan dokumen pendukung lain.' },
    { title: 'Masa tunggu & verifikasi', desc: 'Umumnya 60 hari untuk memastikan kendaraan benar tidak ditemukan sebelum klaim disetujui.' },
    { title: 'Pencairan santunan', desc: 'Setelah disetujui, santunan dibayarkan sesuai harga pertanggungan dikurangi risiko sendiri.' },
  ],
  comparisonTitle: 'TLO vs All Risk',
  comparisonIntro: 'Bandingkan sebelum memutuskan jenis perlindungan.',
  comparisonColA: 'TLO',
  comparisonColB: 'All Risk',
  comparisonRows: [
    { label: 'Kerugian total / pencurian', a: 'Ditanggung', b: 'Ditanggung' },
    { label: 'Lecet & penyok ringan', a: 'Tidak ditanggung', b: 'Ditanggung' },
    { label: 'Premi tahunan', a: '0,20% – 0,78%', b: '1,05% – 4,20%' },
    { label: 'Ideal untuk usia mobil', a: '5+ tahun', b: '0–5 tahun' },
  ],
  faqTitle: 'Pertanyaan Seputar TLO',
  faq: [
    { q: 'Apakah TLO menanggung kerusakan akibat banjir?', a: 'Hanya jika kerusakan akibat banjir tersebut mencapai ambang kerugian total (≥75% nilai kendaraan) DAN perluasan jaminan banjir sudah ditambahkan ke polis.' },
    { q: 'Berapa lama proses klaim kehilangan TLO?', a: 'Umumnya melalui masa tunggu sekitar 60 hari sejak laporan polisi, untuk memastikan kendaraan benar-benar tidak ditemukan, sebelum santunan dicairkan.' },
    { q: 'Apakah TLO lebih murah dari All Risk?', a: 'Ya, signifikan — TLO berkisar 0,20%–0,78% per tahun dibanding All Risk yang 1,05%–4,20% dari nilai kendaraan yang sama.' },
    { q: 'Bisakah upgrade dari TLO ke All Risk?', a: 'Bisa, umumnya berlaku di periode perpanjangan polis berikutnya — hubungi tim SurePath untuk memproses perubahan.' },
    { q: 'Apakah mobil kredit boleh pakai TLO?', a: 'Tergantung kebijakan lembaga pembiayaan — sebagian besar mewajibkan All Risk selama masa kredit, jadi cek dulu ke leasing terkait.' },
  ],
  internalLinksTitle: 'Jelajahi Asuransi Mobil',
  internalLinks: internalNavAll,
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [relatedBlog.allRiskVsTlo, relatedBlog.premi],
  ctaTitle: 'Proteksi Ringan, Tetap Aman',
  ctaSubtitle: 'Hitung estimasi premi TLO mobilmu — gratis, tanpa daftar.',
  extraJsonLd: [serviceJsonLd('Asuransi Mobil TLO', 'Asuransi mobil Total Loss Only yang menanggung kehilangan total dan kerusakan berat, tarif resmi OJK.', '/asuransi-mobil/tlo')],
};

// ─── 4. KLAIM — /asuransi-mobil/klaim ────────────────────────────────────────
export const mobilKlaim: SiloPageContent = {
  breadcrumb: [...rootCrumbs, hubCrumb, { name: 'Klaim', path: '/asuransi-mobil/klaim' }],
  seoTitle: 'Cara Klaim Asuransi Mobil — Panduan Lengkap per Jenis Kejadian | SurePath',
  seoDescription: 'Panduan klaim asuransi mobil lengkap: kecelakaan, kehilangan, banjir, kebakaran. Dokumen yang dibutuhkan, timeline proses, dan cara menghindari klaim ditolak.',
  category: 'Klaim Asuransi Mobil',
  h1: 'Cara Klaim Asuransi Mobil',
  heroSubtitle: 'Panduan lengkap mengajukan klaim untuk setiap jenis kejadian — kecelakaan, kehilangan, banjir, hingga kebakaran — beserta dokumen yang dibutuhkan dan estimasi waktu prosesnya.',
  heroHighlights: ['Klaim via Foto', 'Estimasi AI', 'Rata-Rata 3–5 Hari Kerja'],
  bodyIntro: 'Salah satu alasan utama orang ragu membeli asuransi mobil adalah kekhawatiran proses klaim yang rumit. Kenyataannya, dengan dokumen yang lengkap dan pelaporan yang cepat, sebagian besar klaim kerusakan ringan bisa selesai dalam hitungan hari. Halaman ini merangkum proses klaim untuk setiap jenis kejadian yang paling umum terjadi di Indonesia, supaya kamu tahu persis apa yang harus disiapkan sebelum kejadian benar-benar terjadi — bukan setelahnya.',
  benefitsTitle: 'Kenapa Klaim di SurePath Lebih Cepat',
  benefits: [
    { title: 'Estimasi Kerusakan Otomatis', desc: 'AI kami menganalisis foto kerusakan dan memberi estimasi awal biaya perbaikan dalam hitungan menit.' },
    { title: 'Tidak Perlu Antre di Kantor Cabang', desc: 'Seluruh proses — dari laporan sampai pemantauan status — dilakukan lewat aplikasi.' },
    { title: 'Notifikasi Real-Time', desc: 'Kamu mendapat update status klaim di setiap tahap, tanpa harus telepon berulang kali.' },
    { title: 'Tim Pendamping Klaim', desc: 'Tim SurePath membantu memastikan dokumen lengkap sebelum diajukan ke perusahaan asuransi, mengurangi risiko penolakan.' },
  ],
  coverageTitle: 'Jenis Klaim yang Paling Umum',
  coverageIntro: 'Setiap jenis kejadian punya dokumen dan alur verifikasi yang sedikit berbeda.',
  coverageItems: [
    { title: 'Kecelakaan / Tabrakan', desc: 'Klaim paling umum — perlu foto lokasi kejadian, kronologi, dan laporan polisi jika melibatkan pihak ketiga.' },
    { title: 'Kehilangan / Pencurian', desc: 'Wajib surat keterangan kehilangan dari kepolisian, berlaku untuk polis TLO maupun All Risk.' },
    { title: 'Kerusakan Akibat Banjir', desc: 'Hanya ditanggung jika perluasan jaminan banjir sudah ada di polis — dokumentasikan ketinggian air dan kondisi mesin.' },
    { title: 'Kebakaran', desc: 'Termasuk kebakaran akibat korsleting listrik internal kendaraan — perlu laporan dari pemadam kebakaran jika unit dikerahkan.' },
  ],
  priceTitle: 'Biaya yang Perlu Disiapkan',
  priceIntro: 'Klaim tidak sepenuhnya gratis — ada risiko sendiri (own risk) yang jadi tanggungan pemegang polis.',
  priceTable: [
    { label: 'Risiko sendiri — kerusakan sebagian', value: '± Rp 300.000 /klaim' },
    { label: 'Risiko sendiri — kejadian khusus (banjir/SRCC)', value: 'Bervariasi per polis' },
  ],
  showCalculator: false,
  bodySections: [
    { h: 'Klaim Kecelakaan Tabrakan', p: 'Amankan lokasi kejadian, foto kondisi kedua kendaraan dan pelat nomor dari beberapa sudut, catat kronologi selagi masih segar, dan buat laporan polisi bila melibatkan pihak ketiga atau ada korban luka. Laporkan ke SurePath maksimal 3×24 jam sejak kejadian.' },
    { h: 'Klaim Kehilangan / Pencurian', p: 'Segera lapor ke kepolisian terdekat untuk mendapatkan surat keterangan kehilangan — dokumen ini adalah syarat mutlak. Siapkan juga STNK, BPKB, kunci cadangan (jika ada), dan KTP pemegang polis. Proses verifikasi biasanya memerlukan masa tunggu hingga 60 hari.' },
    { h: 'Klaim Kerusakan Akibat Banjir', p: 'Jangan menyalakan mesin jika mobil sempat terendam — ini bisa memperparah kerusakan dan berpotensi mempersulit klaim. Foto ketinggian air relatif terhadap kendaraan, lokasi, dan waktu kejadian sesegera mungkin.' },
    { h: 'Alasan Umum Klaim Ditolak & Cara Menghindarinya', p: 'Penyebab paling sering: perluasan jaminan yang relevan tidak dibeli (mis. banjir tanpa add-on banjir), keterlambatan lapor lebih dari batas waktu polis, dokumen tidak lengkap, atau kerusakan disebabkan pelanggaran berat (mengemudi tanpa SIM, dalam pengaruh alkohol). Baca ringkasan polis dengan teliti saat membeli, dan selalu laporkan kejadian secepat mungkin.' },
  ],
  claimProcessTitle: 'Timeline & Estimasi Proses Klaim',
  claimIntro: 'Perkiraan waktu untuk klaim kerusakan sebagian yang terdokumentasi lengkap.',
  claimSteps: [
    { title: 'Hari 0 — Laporkan kejadian', desc: 'Foto kerusakan dan ajukan laporan lewat aplikasi SurePath dalam 3×24 jam.' },
    { title: 'Hari 0–1 — Estimasi awal', desc: 'AI memberi estimasi kerusakan; tim SurePath memeriksa kelengkapan dokumen.' },
    { title: 'Hari 1–2 — Survei & approval', desc: 'Surveyor asuransi memverifikasi kerusakan dan menyetujui estimasi biaya.' },
    { title: 'Hari 2–3 — Penjadwalan bengkel', desc: 'Kendaraan dijadwalkan masuk ke bengkel rekanan resmi terdekat.' },
    { title: 'Hari 3–7 — Perbaikan', desc: 'Rata-rata 3–5 hari kerja untuk kerusakan ringan hingga sedang; kerusakan berat bisa lebih lama.' },
    { title: 'Selesai — Serah terima', desc: 'Kendaraan diperiksa ulang sebelum diserahkan kembali ke pemilik.' },
  ],
  faqTitle: 'Pertanyaan Seputar Klaim',
  faq: [
    { q: 'Berapa lama proses klaim asuransi mobil?', a: 'Untuk kerusakan ringan dengan dokumen lengkap, rata-rata 3–5 hari kerja sejak kendaraan masuk bengkel. Klaim kehilangan total memerlukan waktu lebih lama karena ada masa tunggu verifikasi.' },
    { q: 'Kenapa klaim asuransi mobil bisa ditolak?', a: 'Penyebab paling umum: kejadian tidak termasuk cakupan polis (mis. banjir tanpa add-on), laporan terlambat, dokumen tidak lengkap, atau pelanggaran berat oleh pengemudi saat kejadian.' },
    { q: 'Apakah wajib lapor polisi untuk semua klaim?', a: 'Tidak untuk semua kasus — kecelakaan tunggal ringan umumnya cukup dilaporkan ke asuransi. Namun laporan polisi wajib untuk klaim kehilangan/pencurian dan disarankan jika melibatkan pihak ketiga.' },
    { q: 'Apakah klaim mempengaruhi premi tahun berikutnya?', a: 'Bisa — riwayat klaim dapat mempengaruhi status No Claim Bonus/diskon perpanjangan pada beberapa perusahaan asuransi. Tanyakan kebijakan ini ke mitra asuransi terkait.' },
    { q: 'Apakah bisa klaim di bengkel pilihan sendiri?', a: 'Sebagian besar polis mengarahkan ke bengkel rekanan resmi untuk kemudahan proses; klaim reimbursement di bengkel non-rekanan biasanya dimungkinkan dengan prosedur berbeda — cek ketentuan polis.' },
  ],
  internalLinksTitle: 'Jelajahi Asuransi Mobil',
  internalLinks: internalNavAll,
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [relatedBlog.klaim, relatedBlog.allRiskVsTlo],
  ctaTitle: 'Belum Punya Asuransi Mobil?',
  ctaSubtitle: 'Bandingkan premi sekarang, supaya kamu siap sebelum kejadian tak terduga datang.',
  extraJsonLd: [serviceJsonLd('Layanan Klaim Asuransi Mobil', 'Panduan dan pendampingan proses klaim asuransi mobil untuk kecelakaan, kehilangan, banjir, dan kebakaran.', '/asuransi-mobil/klaim')],
};

// ─── 5. PREMI — /asuransi-mobil/premi ────────────────────────────────────────
export const mobilPremi: SiloPageContent = {
  breadcrumb: [...rootCrumbs, hubCrumb, { name: 'Premi', path: '/asuransi-mobil/premi' }],
  seoTitle: 'Premi Asuransi Mobil 2026 — Tarif Resmi OJK per Wilayah | SurePath',
  seoDescription: 'Cek tarif premi asuransi mobil 2026 sesuai SEOJK No.06/SEOJK.05/2017 untuk All Risk dan TLO di tiap wilayah OJK. Hitung estimasi premi mobilmu gratis dalam 2 menit.',
  category: 'Premi Asuransi Mobil',
  h1: 'Premi Asuransi Mobil 2026',
  heroSubtitle: 'Tarif premi asuransi mobil di Indonesia diatur resmi oleh OJK — bukan ditentukan bebas oleh masing-masing perusahaan. Ini penjelasan lengkapnya, plus kalkulator langsung.',
  heroHighlights: ['Tarif Resmi OJK', 'Berlaku Semua Insurer', 'Update 2026'],
  bodyIntro: 'Berbeda dari banyak produk asuransi lain, premi asuransi mobil di Indonesia tidak bebas ditentukan masing-masing perusahaan. Otoritas Jasa Keuangan (OJK) menetapkan batas bawah dan batas atas tarif premi lewat SEOJK No.06/SEOJK.05/2017, berdasarkan tiga wilayah dan lima kategori harga kendaraan. Artinya, penawaran dari perusahaan asuransi manapun untuk mobil dan wilayah yang sama akan berada dalam kisaran yang serupa — perbedaan nyata ada di layanan, jaringan bengkel, dan kecepatan klaim, bukan di harga dasar.',
  benefitsTitle: 'Kenapa Tarif Diatur OJK Menguntungkan Kamu',
  benefits: [
    { title: 'Tidak Ada Markup Sepihak', desc: 'Karena tarif dibatasi regulator, kamu terlindungi dari praktik harga yang terlalu tinggi dari oknum tertentu.' },
    { title: 'Mudah Dibandingkan', desc: 'Karena kisaran tarif serupa antar-perusahaan, kamu bisa fokus membandingkan layanan, bukan cuma harga.' },
    { title: 'Transparan Sejak Awal', desc: 'SurePath menampilkan persentase tarif resmi langsung di kalkulator — tidak ada biaya tersembunyi.' },
  ],
  coverageTitle: 'Kategori Harga Kendaraan',
  coverageIntro: 'OJK membagi tarif ke dalam 5 kategori berdasarkan harga pertanggungan kendaraan.',
  coverageItems: [
    { title: 'Kategori 1 — hingga Rp 125 juta', desc: 'Tarif persentase tertinggi karena nilai kendaraan lebih rendah membuat biaya perbaikan proporsional lebih besar.' },
    { title: 'Kategori 2 — Rp 125–200 juta', desc: 'Rentang paling umum untuk mobil city car dan LCGC baru.' },
    { title: 'Kategori 3 — Rp 200–400 juta', desc: 'Mencakup sebagian besar sedan dan SUV menengah.' },
    { title: 'Kategori 4 & 5 — di atas Rp 400 juta', desc: 'Tarif persentase menurun signifikan — kendaraan premium punya proporsi biaya perbaikan lebih kecil dibanding nilainya.' },
  ],
  priceTitle: 'Tabel Tarif Lengkap per Wilayah',
  priceIntro: 'Kisaran tarif tahunan (persentase dari harga pertanggungan) untuk All Risk dan TLO.',
  priceTable: [
    { label: 'Wilayah 1 — All Risk', value: '1,05% – 4,20%' },
    { label: 'Wilayah 1 — TLO', value: '0,20% – 0,69%' },
    { label: 'Wilayah 2 — All Risk', value: '1,05% – 3,59%' },
    { label: 'Wilayah 2 — TLO', value: '0,20% – 0,78%' },
    { label: 'Wilayah 3 — All Risk', value: '1,05% – 2,96%' },
    { label: 'Wilayah 3 — TLO', value: '0,20% – 0,56%' },
  ],
  showCalculator: true,
  bodySections: [
    { h: 'Apa yang Mempengaruhi Besaran Premi', p: 'Empat faktor utama: kategori harga kendaraan, wilayah plat/domisili, jenis pertanggungan (All Risk atau TLO), dan perluasan jaminan tambahan (banjir, gempa, SRCC, TPL) yang kamu pilih. Usia kendaraan dan riwayat klaim juga bisa mempengaruhi penawaran akhir dari masing-masing perusahaan asuransi dalam batas tarif yang diizinkan.' },
    { h: 'Zona Wilayah OJK dan Kenapa Berbeda', p: 'Wilayah 2 (Jabodetabek, Banten, Jawa Barat) umumnya punya tarif TLO tertinggi karena kepadatan lalu lintas dan risiko pencurian yang lebih tinggi. Wilayah 1 (Sumatera, Papua, Maluku, NTT) punya batas atas All Risk tertinggi. Perbedaan ini mencerminkan data klaim historis di masing-masing wilayah.' },
    { h: 'Cara Menghemat Premi Tanpa Mengurangi Perlindungan', p: 'Sesuaikan harga pertanggungan dengan nilai pasar kendaraan saat ini (bukan harga beli awal), pilih TLO jika mobil sudah berusia 5+ tahun, hanya tambahkan perluasan jaminan yang relevan dengan risiko di wilayahmu, dan bandingkan penawaran dari beberapa perusahaan asuransi sekaligus di SurePath untuk melihat variasi layanan pada tarif yang serupa.' },
  ],
  claimProcessTitle: 'Setelah Beli, Bagaimana Kalau Perlu Klaim?',
  claimIntro: 'Ringkasan singkat — panduan lengkap ada di halaman Klaim Asuransi Mobil.',
  claimSteps: [
    { title: 'Laporkan via app', desc: 'Foto kejadian dan ajukan laporan dalam 3×24 jam.' },
    { title: 'Survei & approval', desc: 'Verifikasi kerusakan oleh surveyor asuransi.' },
    { title: 'Perbaikan di bengkel rekanan', desc: 'Rata-rata 3–5 hari kerja untuk kerusakan ringan-sedang.' },
  ],
  comparisonTitle: 'Ilustrasi Premi — Mobil Rp 250 Juta di Jakarta',
  comparisonIntro: 'Contoh perhitungan pada kendaraan kategori 3 (Rp 200–400 juta), Wilayah 2.',
  comparisonColA: 'All Risk',
  comparisonColB: 'TLO',
  comparisonRows: [
    { label: 'Tarif (indikatif tengah)', a: '≈ 2,19%', b: '≈ 0,40%' },
    { label: 'Estimasi premi tahunan', a: '≈ Rp 5,5 juta', b: '≈ Rp 1 juta' },
    { label: 'Estimasi per bulan', a: '≈ Rp 458 ribu', b: '≈ Rp 83 ribu' },
  ],
  faqTitle: 'Pertanyaan Seputar Premi',
  faq: [
    { q: 'Kenapa premi saya beda dengan teman yang mobilnya sama?', a: 'Kemungkinan besar karena wilayah domisili/plat, kategori harga pertanggungan yang dipilih, perluasan jaminan tambahan, atau perusahaan asuransi yang menawarkan tarif berbeda dalam batas yang sama-sama diizinkan OJK.' },
    { q: 'Apakah premi bisa dinegosiasikan?', a: 'Tarif dasar mengikuti batas OJK dan tidak bisa turun di bawah batas bawah yang ditetapkan, tapi beberapa perusahaan menawarkan diskon dari faktor lain seperti bundling produk atau promo khusus.' },
    { q: 'Berapa premi untuk mobil bekas?', a: 'Dihitung berdasarkan harga pertanggungan saat ini (nilai pasar), bukan harga beli baru — gunakan kalkulator untuk estimasi sesuai nilai kendaraanmu sekarang.' },
    { q: 'Apakah tarif 2026 berbeda dari tahun sebelumnya?', a: 'Batas tarif resmi OJK (SEOJK No.06/SEOJK.05/2017) relatif stabil dari tahun ke tahun kecuali ada pembaruan regulasi baru — selalu cek kalkulator untuk angka paling terkini.' },
    { q: 'Apakah ada biaya tambahan selain premi?', a: 'Bisa ada biaya polis/materai kecil dan biaya perluasan jaminan tambahan (banjir, gempa, dst.) yang dipilih terpisah dari premi dasar.' },
  ],
  internalLinksTitle: 'Jelajahi Asuransi Mobil',
  internalLinks: internalNavAll,
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [relatedBlog.premi, relatedBlog.allRiskVsTlo],
  ctaTitle: 'Hitung Premi Pastimu Sekarang',
  ctaSubtitle: 'Masukkan nilai kendaraan dan wilayahmu — hasil langsung muncul, gratis.',
  extraJsonLd: [serviceJsonLd('Premi Asuransi Mobil', 'Informasi tarif resmi OJK untuk premi asuransi mobil All Risk dan TLO per wilayah.', '/asuransi-mobil/premi')],
};
