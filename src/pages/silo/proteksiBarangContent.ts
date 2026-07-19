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
  internalLinksTitle: 'Proteksi Lain yang Relevan',
  internalLinks: [
    { label: 'Asuransi Kecelakaan Diri', path: '/asuransi-kecelakaan-diri' },
    { label: 'Asuransi Kesehatan', path: '/asuransi-kesehatan' },
    { label: 'Asuransi Mobil', path: '/asuransi-mobil' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Asuransi Kecelakaan Diri', excerpt: 'Daftar 60 detik, santunan cepat untuk kecelakaan kapan pun dan di mana pun.', path: '/asuransi-kecelakaan-diri' },
  ],
  ctaTitle: 'Lindungi Perangkatmu Sekarang',
  ctaSubtitle: 'Daftar dalam hitungan menit — mulai dari Rp 35rb/bulan per perangkat.',
  extraJsonLd: [serviceJsonLd('Proteksi Barang (Item Shield)', 'Proteksi gadget dan elektronik dari kerusakan fisik, cairan, pencurian, dan kerusakan komponen internal.', '/proteksi-barang')],
};
