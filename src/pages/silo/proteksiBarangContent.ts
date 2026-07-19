import { SiloPageContent } from '../site/SiloLandingTemplate';

// Proteksi Barang (Item Shield) — gadget & electronics protection.
// docs/SEO_ARCHITECTURE.md flagged (2026-07-19) that the 5th vertical was
// originally assumed to be home/property insurance following the generic
// template. The real product behind /product/property in
// src/pages/productInfoContent.ts is device protection (phones, laptops:
// physical damage, liquid damage, theft, internal component failure) — NOT
// home/building insurance. This content reflects the real product only.

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

export const proteksiBarangHub: SiloPageContent = {
  breadcrumb: [
    { name: 'Beranda', path: '/' },
    { name: 'Produk', path: '/products' },
    { name: 'Proteksi Barang', path: '/proteksi-barang' },
  ],
  seoTitle: 'Proteksi Gadget & Elektronik — Klaim Cukup Foto Kerusakan | SurePath',
  seoDescription: 'Lindungi HP, laptop, dan elektronikmu dari layar retak, kena air, hingga pencurian. Klaim cukup upload foto, dapat perangkat pinjaman selama perbaikan. Mulai Rp 35rb/bulan.',
  category: 'Proteksi Barang',
  h1: 'Proteksi Gadget & Elektronik',
  heroSubtitle: 'Smartphone dan laptopmu adalah investasi berharga. SurePath Item Shield melindungi dari kerusakan tak terduga — jatuh, kena air, sampai pencurian — dengan klaim semudah upload foto.',
  heroHighlights: ['Klaim via Foto', 'Perangkat Pinjaman Saat Perbaikan', 'Teknisi Tersertifikasi'],
  bodyIntro: 'Harga smartphone flagship dan laptop kerja modern bisa menembus belasan juta rupiah — dan sebagian besar kerusakan seperti layar retak atau casing pecah terjadi di momen yang paling tidak terduga. SurePath Item Shield dirancang untuk skenario itu: proteksi terjangkau untuk perangkat elektronik, dengan proses klaim yang jauh lebih sederhana dibanding asuransi konvensional — cukup foto kerusakan lewat aplikasi, tanpa formulir panjang atau proses berbelit.',
  benefitsTitle: 'Kenapa Pilih Item Shield',
  benefits: [
    { title: 'Klaim Cukup Foto', desc: 'Upload foto kerusakan lewat aplikasi — tidak perlu formulir panjang atau kunjungan fisik ke kantor.' },
    { title: 'Perangkat Pinjaman Saat Perbaikan', desc: 'Dapatkan perangkat pengganti sementara selama perangkatmu diperbaiki, supaya aktivitas tidak terganggu.' },
    { title: 'Teknisi Tersertifikasi', desc: 'Perbaikan dilakukan teknisi bersertifikat dengan garansi hasil perbaikan.' },
    { title: 'Proteksi hingga 2 Tahun', desc: 'Perlindungan berlaku hingga 2 tahun per perangkat, melampaui garansi resmi pabrikan yang umumnya hanya 1 tahun.' },
  ],
  coverageTitle: 'Apa yang Ditanggung',
  coverageIntro: 'Empat kategori kerusakan utama yang paling sering dialami perangkat elektronik.',
  coverageItems: [
    { title: 'Kerusakan Fisik', desc: 'Layar retak, casing pecah, atau kerusakan fisik lain akibat jatuh dan benturan.' },
    { title: 'Kerusakan Akibat Cairan', desc: 'Kerusakan akibat terkena air, minuman tumpah, hujan, atau terendam banjir.' },
    { title: 'Pencurian', desc: 'Kehilangan perangkat akibat pencurian, dengan bukti laporan polisi resmi.' },
    { title: 'Kerusakan Komponen Internal', desc: 'Kerusakan IC, baterai kembung, atau komponen akibat lonjakan listrik.' },
  ],
  priceTitle: 'Estimasi Premi',
  priceIntro: 'Premi tergantung jenis perangkat, harga perangkat, dan durasi perlindungan yang dipilih.',
  priceTable: [{ label: 'Mulai dari', value: 'Rp 35.000 /bulan per perangkat' }],
  showCalculator: false,
  bodySections: [
    { h: 'Kenapa Garansi Resmi Saja Tidak Cukup', p: 'Garansi resmi pabrikan umumnya hanya menanggung kerusakan akibat cacat produksi, bukan kerusakan akibat pemakaian sehari-hari seperti terjatuh atau terkena air — dua penyebab kerusakan paling umum di lapangan. Item Shield mengisi celah ini secara spesifik.' },
    { h: 'Perangkat Apa Saja yang Bisa Diproteksi', p: 'Smartphone, laptop, tablet, dan sejumlah perangkat elektronik bernilai tinggi lainnya. Nilai perangkat memengaruhi besaran premi — semakin mahal perangkat, semakin besar pula premi dan limit klaimnya.' },
    { h: 'Yang Perlu Diperhatikan Sebelum Daftar', p: 'Perangkat umumnya harus dalam kondisi baik saat pendaftaran (tanpa kerusakan yang sudah ada sebelumnya), dan nomor IMEI/serial number akan diverifikasi sebagai bagian dari proses onboarding.' },
  ],
  claimProcessTitle: 'Klaim Semudah Ini',
  claimIntro: 'Dirancang untuk selesai jauh lebih cepat dari klaim asuransi konvensional.',
  claimSteps: [
    { title: 'Foto kerusakan', desc: 'Ambil foto kerusakan perangkat langsung dari aplikasi SurePath.' },
    { title: 'Verifikasi otomatis', desc: 'Sistem memverifikasi kesesuaian klaim dengan polis dan kondisi awal saat pendaftaran.' },
    { title: 'Perbaikan oleh teknisi bersertifikat', desc: 'Perangkat diperbaiki oleh teknisi rekanan, dengan garansi hasil perbaikan.' },
    { title: 'Perangkat pinjaman (opsional)', desc: 'Untuk kerusakan yang butuh waktu perbaikan lebih lama, perangkat pengganti sementara bisa dikirim.' },
  ],
  faqTitle: 'Pertanyaan Seputar Proteksi Barang',
  faq: [
    { q: 'Apakah beda dengan garansi resmi pabrikan?', a: 'Ya — garansi resmi hanya menanggung cacat produksi, sementara Item Shield menanggung kerusakan akibat pemakaian sehari-hari seperti jatuh, kena air, dan pencurian.' },
    { q: 'Perangkat apa saja yang bisa diproteksi?', a: 'Smartphone, laptop, tablet, dan perangkat elektronik bernilai tinggi lainnya — premi disesuaikan dengan harga dan jenis perangkat.' },
    { q: 'Berapa lama proses klaim?', a: 'Karena klaim cukup lewat foto dan verifikasi sistem, prosesnya jauh lebih cepat dibanding klaim asuransi konvensional yang memerlukan survei fisik.' },
    { q: 'Apakah perangkat bekas bisa didaftarkan?', a: 'Bisa, selama kondisi perangkat baik saat pendaftaran dan lolos verifikasi IMEI/serial number — kerusakan yang sudah ada sebelumnya tidak akan ditanggung.' },
    { q: 'Apakah ada perangkat pinjaman selama perbaikan?', a: 'Untuk kasus yang memerlukan waktu perbaikan lebih lama, SurePath dapat mengirimkan perangkat pengganti sementara agar aktivitasmu tidak terganggu.' },
  ],
  internalLinksTitle: 'Jelajahi Proteksi Barang',
  internalLinks: [
    { label: 'Cara Klaim Proteksi Barang', path: '/proteksi-barang/klaim' },
    { label: 'Premi Proteksi Barang', path: '/proteksi-barang/premi' },
    { label: 'Asuransi Kecelakaan Diri', path: '/asuransi-kecelakaan-diri' },
    { label: 'Asuransi Kesehatan', path: '/asuransi-kesehatan' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Asuransi Kecelakaan Diri', excerpt: 'Daftar 60 detik, santunan cepat untuk kecelakaan kapan pun dan di mana pun.', path: '/asuransi-kecelakaan-diri' },
  ],
  ctaTitle: 'Lindungi Perangkatmu Sekarang',
  ctaSubtitle: 'Daftar dalam hitungan menit — mulai dari Rp 35rb/bulan per perangkat.',
  extraJsonLd: [serviceJsonLd('Proteksi Barang (Item Shield)', 'Proteksi gadget dan elektronik dari kerusakan fisik, cairan, pencurian, dan kerusakan komponen internal.', '/proteksi-barang')],
};

const proteksiBarangCrumb = { name: 'Proteksi Barang', path: '/proteksi-barang' };
const rootCrumbs2 = [{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/products' }];

// ─── Proteksi Barang — Klaim ─────────────────────────────────────────────────
export const proteksiBarangKlaim: SiloPageContent = {
  breadcrumb: [...rootCrumbs2, proteksiBarangCrumb, { name: 'Klaim', path: '/proteksi-barang/klaim' }],
  seoTitle: 'Cara Klaim Proteksi Barang — HP & Laptop Rusak | SurePath',
  seoDescription: 'Panduan klaim Item Shield untuk layar retak, kena air, pencurian, dan kerusakan komponen internal. Klaim cukup foto, teknisi bersertifikat, dan perangkat pinjaman selama perbaikan.',
  category: 'Klaim Proteksi Barang',
  h1: 'Cara Klaim Proteksi Barang',
  heroSubtitle: 'Empat jenis kerusakan, satu proses klaim yang sama-sama sederhana — cukup foto lewat aplikasi, tanpa perlu datang ke mana pun.',
  heroHighlights: ['Klaim via Foto', 'Verifikasi Cepat', 'Perangkat Pinjaman Tersedia'],
  bodyIntro: 'Salah satu daya tarik utama Item Shield adalah kesederhanaan klaimnya dibanding asuransi konvensional. Tapi dokumen pendukung tetap berbeda sedikit tergantung jenis kerusakan — terutama untuk klaim pencurian yang memerlukan laporan polisi. Berikut panduan lengkap per jenis kerusakan.',
  benefitsTitle: 'Kenapa Klaim Item Shield Lebih Cepat',
  benefits: [
    { title: 'Cukup Foto Kerusakan', desc: 'Tidak perlu formulir panjang — foto kerusakan lewat aplikasi sudah cukup untuk memulai proses.' },
    { title: 'Verifikasi Sistem Otomatis', desc: 'Sistem membandingkan kondisi perangkat saat klaim dengan data pendaftaran awal.' },
    { title: 'Perangkat Pinjaman', desc: 'Untuk perbaikan yang butuh waktu lebih lama, perangkat pengganti sementara bisa dikirim.' },
  ],
  coverageTitle: 'Dokumen per Jenis Kerusakan',
  coverageIntro: 'Sebagian besar klaim hanya butuh foto — kecuali pencurian.',
  coverageItems: [
    { title: 'Kerusakan Fisik', desc: 'Foto kerusakan dari beberapa sudut sudah cukup untuk memulai proses klaim.' },
    { title: 'Kerusakan Cairan', desc: 'Foto kondisi perangkat dan penjelasan singkat kronologi kejadian.' },
    { title: 'Pencurian', desc: 'Wajib laporan polisi resmi sebagai bukti pendukung — tanpa ini klaim tidak bisa diproses.' },
    { title: 'Kerusakan Komponen Internal', desc: 'Perangkat perlu diperiksa teknisi untuk memastikan penyebab kerusakan sesuai cakupan polis.' },
  ],
  priceTitle: 'Yang Perlu Diperhatikan',
  priceIntro: 'Klaim tetap mengikuti limit tahunan dan ketentuan per perangkat.',
  priceTable: [{ label: 'Limit klaim', value: 'Sesuai nilai perangkat yang didaftarkan' }],
  showCalculator: false,
  bodySections: [
    { h: 'Kenapa Pencurian Butuh Laporan Polisi', p: 'Laporan polisi adalah bukti resmi bahwa kehilangan terjadi akibat tindak kriminal, bukan kehilangan biasa (misalnya tertinggal atau tercecer) — pembeda penting karena polis hanya menanggung pencurian, bukan kehilangan dalam pengertian umum.' },
    { h: 'Berapa Lama Proses Perbaikan', p: 'Tergantung jenis dan tingkat kerusakan — kerusakan ringan seperti layar retak umumnya lebih cepat diproses dibanding kerusakan komponen internal yang memerlukan pemeriksaan teknisi lebih mendalam.' },
    { h: 'Kapan Klaim Bisa Ditolak', p: 'Kerusakan yang sudah ada sebelum pendaftaran, kerusakan akibat modifikasi tidak resmi pada perangkat, atau dokumen pendukung yang tidak lengkap (terutama laporan polisi untuk kasus pencurian).' },
  ],
  claimProcessTitle: 'Langkah Klaim',
  claimIntro: 'Alur umum untuk semua jenis kerusakan.',
  claimSteps: [
    { title: 'Foto/dokumen kerusakan', desc: 'Sesuai jenis kerusakan — foto untuk fisik/cairan, laporan polisi untuk pencurian.' },
    { title: 'Ajukan lewat aplikasi', desc: 'Unggah dokumen dan deskripsi kejadian.' },
    { title: 'Verifikasi', desc: 'Sistem dan tim memverifikasi kesesuaian dengan ketentuan polis.' },
    { title: 'Perbaikan/penggantian', desc: 'Teknisi bersertifikat memperbaiki perangkat, atau proses penggantian untuk kasus pencurian.' },
  ],
  faqTitle: 'Pertanyaan Seputar Klaim Proteksi Barang',
  faq: [
    { q: 'Apakah HP hilang (bukan dicuri) bisa diklaim?', a: 'Tidak — polis hanya menanggung pencurian dengan bukti laporan polisi, bukan kehilangan dalam pengertian umum seperti tertinggal atau tercecer.' },
    { q: 'Berapa kali bisa klaim dalam setahun?', a: 'Tergantung ketentuan limit tahunan pada polis yang kamu pilih — cek ringkasan polis untuk batasan spesifik.' },
    { q: 'Apakah perbaikan dijamin dengan komponen asli?', a: 'Perbaikan dilakukan teknisi bersertifikat dengan garansi hasil perbaikan — detail komponen yang digunakan mengikuti ketentuan mitra perbaikan.' },
  ],
  internalLinksTitle: 'Jelajahi Proteksi Barang',
  internalLinks: [
    { label: 'HP Hilang atau Dicuri? Baca Ini Dulu', path: '/panduan-klaim/hp-hilang-dicuri' },
    { label: 'Proteksi Barang (Hub)', path: '/proteksi-barang' },
    { label: 'Premi Proteksi Barang', path: '/proteksi-barang/premi' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Asuransi Kecelakaan Diri', excerpt: 'Daftar 60 detik, santunan cepat untuk kecelakaan kapan pun dan di mana pun.', path: '/asuransi-kecelakaan-diri' },
  ],
  ctaTitle: 'Lindungi Perangkatmu Sekarang',
  ctaSubtitle: 'Daftar dalam hitungan menit — mulai dari Rp 35rb/bulan per perangkat.',
  extraJsonLd: [serviceJsonLd('Klaim Proteksi Barang', 'Panduan klaim kerusakan fisik, cairan, pencurian, dan komponen internal untuk Item Shield.', '/proteksi-barang/klaim')],
};

// ─── Proteksi Barang — Premi ─────────────────────────────────────────────────
export const proteksiBarangPremi: SiloPageContent = {
  breadcrumb: [...rootCrumbs2, proteksiBarangCrumb, { name: 'Premi', path: '/proteksi-barang/premi' }],
  seoTitle: 'Premi Proteksi Barang — Harga Proteksi HP & Laptop | SurePath',
  seoDescription: 'Premi proteksi gadget mulai Rp 35rb/bulan, tergantung jenis dan harga perangkat. Pelajari faktor yang mempengaruhi harga dan cara memilih durasi proteksi yang tepat.',
  category: 'Premi Proteksi Barang',
  h1: 'Premi Proteksi Barang',
  heroSubtitle: 'Harga proteksi disesuaikan dengan nilai perangkatmu — semakin mahal perangkat, semakin besar pula premi dan limit klaimnya.',
  heroHighlights: ['Mulai Rp 35rb/Bulan', 'Sesuai Nilai Perangkat', 'Proteksi hingga 2 Tahun'],
  bodyIntro: 'Premi Item Shield dihitung berdasarkan nilai dan jenis perangkat yang didaftarkan — logikanya sama seperti asuransi pada umumnya: semakin besar potensi kerugian (harga perangkat), semakin besar pula premi yang dikenakan. Berikut faktor-faktor yang membentuk harga akhir.',
  benefitsTitle: 'Faktor Penentu Premi',
  benefits: [
    { title: 'Harga Perangkat', desc: 'Perangkat lebih mahal dikenakan premi lebih tinggi, karena limit klaim juga lebih besar.' },
    { title: 'Jenis Perangkat', desc: 'Smartphone, laptop, dan tablet punya profil risiko kerusakan yang sedikit berbeda.' },
    { title: 'Durasi Proteksi', desc: 'Pilihan durasi (hingga 2 tahun) mempengaruhi total premi yang dibayarkan.' },
  ],
  coverageTitle: 'Cara Menghitung Kebutuhan Proteksi',
  coverageIntro: 'Pertimbangkan ini sebelum mendaftarkan perangkat.',
  coverageItems: [
    { title: 'Nilai Perangkat Saat Ini', desc: 'Gunakan harga pasar terkini, bukan harga beli jika perangkat sudah dipakai beberapa waktu.' },
    { title: 'Frekuensi Pemakaian di Luar Rumah', desc: 'Perangkat yang sering dibawa bepergian punya risiko kerusakan/kehilangan lebih tinggi.' },
    { title: 'Ketersediaan Garansi Resmi', desc: 'Jika garansi resmi masih berlaku, pertimbangkan mulai proteksi Item Shield mendekati masa garansi berakhir.' },
  ],
  priceTitle: 'Estimasi Premi',
  priceIntro: 'Ilustrasi kasar berdasarkan jenis perangkat.',
  priceTable: [{ label: 'Mulai dari', value: 'Rp 35.000/bulan per perangkat' }],
  showCalculator: false,
  bodySections: [
    { h: 'Kenapa Premi Berbeda per Perangkat', p: 'Laptop kerja seharga puluhan juta rupiah tentu akan dikenakan premi berbeda dari smartphone kelas menengah — prinsipnya sama seperti semua asuransi berbasis nilai aset, premi proporsional terhadap potensi kerugian.' },
    { h: 'Apakah Bisa Proteksi Lebih dari 1 Perangkat?', p: 'Bisa — setiap perangkat didaftarkan dan dihitung preminya secara terpisah sesuai nilai dan jenisnya masing-masing.' },
  ],
  claimProcessTitle: 'Setelah Daftar, Bagaimana Klaimnya?',
  claimIntro: 'Ringkasan singkat — panduan lengkap di halaman Klaim Proteksi Barang.',
  claimSteps: [
    { title: 'Foto kerusakan', desc: 'Ajukan lewat aplikasi dengan foto atau dokumen sesuai jenis kerusakan.' },
    { title: 'Verifikasi & perbaikan', desc: 'Setelah diverifikasi, perangkat diperbaiki oleh teknisi bersertifikat.' },
  ],
  faqTitle: 'Pertanyaan Seputar Premi Proteksi Barang',
  faq: [
    { q: 'Apakah premi turun jika perangkat makin tua?', a: 'Nilai perangkat cenderung menurun seiring waktu, yang bisa mempengaruhi premi di periode perpanjangan berikutnya — tergantung kebijakan penyesuaian nilai yang berlaku.' },
    { q: 'Apakah bisa upgrade proteksi jika ganti perangkat?', a: 'Bisa — daftarkan perangkat baru sebagai polis baru sesuai nilai dan jenisnya, biasanya setelah periode proteksi perangkat lama berakhir atau dibatalkan.' },
    { q: 'Apakah ada diskon untuk lebih dari 1 perangkat?', a: 'Tergantung promo yang berlaku — tanyakan opsi bundling saat mendaftarkan beberapa perangkat sekaligus.' },
  ],
  internalLinksTitle: 'Jelajahi Proteksi Barang',
  internalLinks: [
    { label: 'Proteksi Barang (Hub)', path: '/proteksi-barang' },
    { label: 'Cara Klaim Proteksi Barang', path: '/proteksi-barang/klaim' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Asuransi Kecelakaan Diri', excerpt: 'Daftar 60 detik, santunan cepat untuk kecelakaan kapan pun dan di mana pun.', path: '/asuransi-kecelakaan-diri' },
  ],
  ctaTitle: 'Lindungi Perangkat Barumu',
  ctaSubtitle: 'Daftar dalam hitungan menit — premi sesuai nilai perangkatmu.',
  extraJsonLd: [serviceJsonLd('Premi Proteksi Barang', 'Faktor yang mempengaruhi premi proteksi gadget dan elektronik Item Shield.', '/proteksi-barang/premi')],
};
