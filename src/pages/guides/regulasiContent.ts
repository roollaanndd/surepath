import { SiloPageContent } from '../site/SiloLandingTemplate';

// Regulasi & OJK — trust/authority silo per docs/SEO_ARCHITECTURE.md §1.
// This page is the definitive source for the SEOJK No.06/SEOJK.05/2017 rate
// figures cited throughout the Asuransi Mobil silo (mobilContent.ts,
// PremiumCalcWidget.tsx) — high EEAT value: it explains the regulatory basis
// behind every premium claim on the site rather than just asserting numbers.

const BASE_URL = 'https://myinsurepath.com';

export const seojkTarifPremi: SiloPageContent = {
  breadcrumb: [
    { name: 'Beranda', path: '/' },
    { name: 'Regulasi', path: '/regulasi' },
    { name: 'SEOJK No.06/SEOJK.05/2017', path: '/regulasi/seojk-6-2017-tarif-premi' },
  ],
  seoTitle: 'SEOJK No.06/SEOJK.05/2017 — Regulasi Tarif Premi Asuransi Mobil | SurePath',
  seoDescription: 'Penjelasan lengkap SEOJK No.06/SEOJK.05/2017 — regulasi OJK yang mengatur batas tarif premi asuransi kendaraan bermotor di Indonesia. Apa isinya dan kenapa penting bagi konsumen.',
  category: 'Regulasi & OJK',
  h1: 'SEOJK No.06/SEOJK.05/2017',
  heroSubtitle: 'Regulasi Otoritas Jasa Keuangan yang jadi dasar setiap angka tarif premi asuransi kendaraan bermotor yang kamu lihat di SurePath — ini penjelasan lengkapnya.',
  heroHighlights: ['Diterbitkan OJK', 'Mengikat Semua Insurer', 'Basis Semua Tarif di SurePath'],
  bodyIntro: 'Setiap kali kamu melihat kisaran premi asuransi mobil di SurePath — baik di kalkulator maupun di halaman produk — angka itu bukan ditentukan sepihak oleh SurePath atau perusahaan asuransi mana pun. Angka itu berasal dari Surat Edaran Otoritas Jasa Keuangan (SEOJK) No.06/SEOJK.05/2017, regulasi yang menetapkan batas bawah dan batas atas tarif premi untuk asuransi kendaraan bermotor di seluruh Indonesia. Halaman ini menjelaskan apa isi regulasi tersebut dan kenapa itu penting bagi kamu sebagai konsumen.',
  benefitsTitle: 'Kenapa Regulasi Ini Menguntungkan Konsumen',
  benefits: [
    { title: 'Mencegah Tarif Predatori', desc: 'Batas atas tarif mencegah perusahaan asuransi mengenakan premi yang jauh melebihi kewajaran.' },
    { title: 'Mencegah Persaingan Harga Tidak Sehat', desc: 'Batas bawah tarif mencegah perusahaan asuransi banting harga secara tidak berkelanjutan, yang bisa mengorbankan kualitas layanan atau kemampuan bayar klaim.' },
    { title: 'Standar yang Bisa Diverifikasi', desc: 'Karena tarifnya publik dan resmi, kamu bisa memverifikasi apakah penawaran yang kamu terima wajar atau tidak.' },
  ],
  coverageTitle: 'Apa yang Diatur Regulasi Ini',
  coverageIntro: 'Empat komponen utama yang membentuk struktur tarif.',
  coverageItems: [
    { title: '3 Wilayah Tarif', desc: 'Indonesia dibagi menjadi 3 wilayah dengan batas tarif berbeda, mencerminkan data risiko klaim historis masing-masing area.' },
    { title: '5 Kategori Harga Kendaraan', desc: 'Kendaraan dikelompokkan berdasarkan harga pertanggungan, dari ≤Rp125 juta hingga di atas Rp800 juta.' },
    { title: 'Batas Tarif Comprehensive & TLO', desc: 'Batas atas dan bawah ditetapkan terpisah untuk pertanggungan Comprehensive (All Risk) dan TLO.' },
    { title: 'Ketentuan Perluasan Jaminan', desc: 'Regulasi turut mengatur bagaimana perluasan jaminan seperti banjir, gempa, dan SRCC diperhitungkan.' },
  ],
  priceTitle: 'Dampak Langsung ke Premi',
  priceIntro: 'Ini kenapa tarif All Risk dan TLO SurePath berada di rentang berikut.',
  priceTable: [
    { label: 'All Risk (nasional)', value: '1,05% – 4,20% dari harga pertanggungan/tahun' },
    { label: 'TLO (nasional)', value: '0,20% – 0,78% dari harga pertanggungan/tahun' },
  ],
  showCalculator: true,
  bodySections: [
    { h: 'Kenapa OJK Mengatur Tarif Asuransi Kendaraan', p: 'Sebelum regulasi ini, persaingan harga antar perusahaan asuransi berisiko menyebabkan race-to-the-bottom yang bisa mengorbankan kemampuan perusahaan membayar klaim di masa depan, atau sebaliknya, praktik tarif berlebihan yang merugikan konsumen. Batas atas dan bawah memberi keseimbangan antara persaingan sehat dan perlindungan konsumen.' },
    { h: 'Apakah Semua Perusahaan Asuransi Wajib Patuh?', p: 'Ya — setiap perusahaan asuransi umum yang beroperasi di Indonesia dan menawarkan produk asuransi kendaraan bermotor terikat batas tarif ini. Ini yang membuat perbandingan penawaran di SurePath relevan: perbedaan antar penawaran mencerminkan layanan, bukan manipulasi harga dasar.' },
    { h: 'Bagaimana Cara Memverifikasi Tarif yang Kamu Terima', p: 'Bandingkan persentase tarif yang ditawarkan dengan kisaran resmi untuk wilayah dan kategori kendaraanmu (lihat tabel di atas atau gunakan kalkulator). Jika penawaran jauh di luar kisaran ini tanpa penjelasan yang jelas, itu layak dipertanyakan ke perusahaan asuransi terkait.' },
  ],
  claimProcessTitle: 'Bagaimana Ini Terkait dengan Klaim?',
  claimIntro: 'Regulasi tarif dan proses klaim adalah dua hal terpisah, tapi saling berkaitan.',
  claimSteps: [
    { title: 'Tarif menentukan premi', desc: 'Bukan besaran klaim yang bisa diajukan — itu ditentukan uang pertanggungan di polis.' },
    { title: 'Baca polis untuk detail klaim', desc: 'Ketentuan klaim (risiko sendiri, pengecualian) diatur di level polis, bukan di SEOJK tarif ini.' },
  ],
  faqTitle: 'Pertanyaan Seputar Regulasi Tarif',
  faq: [
    { q: 'Apakah tarif ini berubah setiap tahun?', a: 'Batas tarif resmi relatif stabil kecuali ada pembaruan regulasi baru dari OJK — SurePath selalu menggunakan angka terkini yang berlaku.' },
    { q: 'Apakah regulasi ini juga mengatur asuransi selain kendaraan?', a: 'SEOJK No.06/SEOJK.05/2017 secara spesifik mengatur asuransi kendaraan bermotor dan kebakaran/harta benda — produk asuransi lain (kesehatan, jiwa, perjalanan) diatur regulasi terpisah.' },
    { q: 'Kenapa premi saya bisa berbeda dari orang lain dengan mobil sama?', a: 'Meski dalam batas tarif yang sama, faktor seperti wilayah domisili spesifik, kategori harga kendaraan, dan perluasan jaminan tambahan tetap mempengaruhi angka final.' },
    { q: 'Apakah SurePath diawasi OJK?', a: 'SurePath adalah platform teknologi yang memasarkan produk dari perusahaan asuransi berizin dan diawasi OJK — bukan perusahaan asuransi itu sendiri. Detail lengkap ada di halaman Tentang Kami.' },
  ],
  internalLinksTitle: 'Terapkan ke Perhitunganmu',
  internalLinks: [
    { label: 'Premi Asuransi Mobil 2026', path: '/asuransi-mobil/premi' },
    { label: 'Asuransi Mobil All Risk', path: '/asuransi-mobil/all-risk' },
    { label: 'Asuransi Mobil TLO', path: '/asuransi-mobil/tlo' },
    { label: 'Kalkulator Premi', path: '/kalkulator' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Berapa Premi Asuransi Mobil 2025? Panduan Tarif OJK', excerpt: 'Tarif OJK per wilayah dan cara hitung estimasi premi mobilmu.', path: '/blog/premi-asuransi-mobil-2025' },
  ],
  ctaTitle: 'Hitung Premi Sesuai Tarif Resmi',
  ctaSubtitle: 'Kalkulator SurePath menggunakan tarif SEOJK No.06/SEOJK.05/2017 secara langsung — transparan, tanpa markup.',
  extraJsonLd: [{
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'SEOJK No.06/SEOJK.05/2017 — Regulasi Tarif Premi Asuransi Mobil',
    description: 'Penjelasan lengkap regulasi OJK yang mengatur batas tarif premi asuransi kendaraan bermotor di Indonesia.',
    author: { '@type': 'Organization', name: 'SurePath' },
    publisher: { '@id': `${BASE_URL}/#organization` },
    inLanguage: 'id',
    url: `${BASE_URL}/regulasi/seojk-6-2017-tarif-premi`,
  }],
};
