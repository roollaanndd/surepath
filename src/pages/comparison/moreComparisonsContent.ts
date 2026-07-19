import { SiloPageContent } from '../site/SiloLandingTemplate';

// Second wave of standalone comparison guides — docs/SEO_KEYWORD_MAP.md §1.9.
// Both topics already have a brief table embedded in their hub page
// (kesehatanHub, kecelakaanDiriHub); these are the deeper canonical
// destinations those hubs link out to, same pattern as allRiskVsTlo.

const BASE_URL = 'https://myinsurepath.com';

const articleJsonLd = (headline: string, description: string, path: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline,
  description,
  author: { '@type': 'Organization', name: 'SurePath' },
  publisher: { '@id': `${BASE_URL}/#organization` },
  inLanguage: 'id',
  url: `${BASE_URL}${path}`,
});

export const kesehatanVsBpjs: SiloPageContent = {
  breadcrumb: [
    { name: 'Beranda', path: '/' },
    { name: 'Produk', path: '/products' },
    { name: 'Asuransi Kesehatan', path: '/asuransi-kesehatan' },
    { name: 'vs BPJS Kesehatan', path: '/perbandingan/asuransi-kesehatan-vs-bpjs' },
  ],
  seoTitle: 'Asuransi Kesehatan Swasta vs BPJS: Perlu Keduanya? | SurePath',
  seoDescription: 'BPJS Kesehatan wajib, tapi asuransi swasta melengkapi dengan akses lebih cepat dan fleksibel. Perbandingan lengkap kapan kamu butuh keduanya sekaligus.',
  category: 'Perbandingan Asuransi Kesehatan',
  h1: 'Asuransi Kesehatan Swasta vs BPJS Kesehatan',
  heroSubtitle: 'Pertanyaan yang sering muncul: kalau sudah punya BPJS, masih perlu asuransi swasta? Jawaban singkatnya: keduanya punya peran berbeda, bukan saling menggantikan.',
  heroHighlights: ['Bukan Pengganti, Tapi Pelengkap', 'Akses Lebih Fleksibel', 'Cashless di RS Rekanan'],
  bodyIntro: 'BPJS Kesehatan adalah program jaminan sosial wajib yang menjadi fondasi perlindungan kesehatan seluruh warga negara Indonesia — cakupannya luas tapi mengikuti sistem rujukan berjenjang dan pilihan fasilitas sesuai kelas kepesertaan. Asuransi kesehatan swasta bukan pengganti BPJS, melainkan pelengkap yang memberi fleksibilitas lebih: pilihan rumah sakit lebih luas, proses lebih cepat, dan kelas kamar sesuai preferensi.',
  benefitsTitle: 'Kenapa Banyak Orang Punya Keduanya',
  benefits: [
    { title: 'BPJS untuk Jaring Pengaman Dasar', desc: 'Kewajiban hukum yang memastikan setiap warga negara punya akses kesehatan minimum, dengan iuran terjangkau.' },
    { title: 'Swasta untuk Kecepatan & Fleksibilitas', desc: 'Saat butuh penanganan cepat atau rumah sakit pilihan di luar rujukan BPJS, asuransi swasta mengisi celah ini.' },
    { title: 'Perlindungan Berlapis', desc: 'Jika satu manfaat tidak mencukupi di satu sisi, sisi lain bisa membantu menutup kebutuhan yang tersisa.' },
  ],
  coverageTitle: 'Perbedaan Cara Kerja',
  coverageIntro: 'Memahami mekanisme masing-masing membantu memutuskan kapan pakai yang mana.',
  coverageItems: [
    { title: 'Sistem Rujukan BPJS', desc: 'Mulai dari fasilitas kesehatan tingkat pertama, baru dirujuk ke rumah sakit sesuai kebutuhan medis — prosesnya berjenjang.' },
    { title: 'Akses Langsung Asuransi Swasta', desc: 'Bisa langsung ke rumah sakit rekanan pilihan tanpa proses rujukan berjenjang.' },
    { title: 'Kelas Kamar BPJS', desc: 'Mengikuti kelas kepesertaan (I, II, atau III) yang telah didaftarkan.' },
    { title: 'Kelas Kamar Asuransi Swasta', desc: 'Sesuai plan yang dipilih, bisa lebih fleksibel dari kelas BPJS.' },
  ],
  priceTitle: 'Pertimbangan Biaya',
  priceIntro: 'Kombinasi keduanya sering lebih hemat daripada mengandalkan satu saja untuk semua skenario.',
  priceTable: [{ label: 'Asuransi kesehatan swasta', value: 'Mulai Rp 200.000/bulan, sebagai pelengkap BPJS' }],
  showCalculator: false,
  bodySections: [
    { h: 'Kapan BPJS Saja Sudah Cukup', p: 'Untuk kondisi yang tidak mendesak dan kamu tidak keberatan mengikuti sistem rujukan berjenjang serta kelas kamar sesuai kepesertaan, BPJS saja bisa mencukupi kebutuhan dasar.' },
    { h: 'Kapan Sebaiknya Tambah Asuransi Swasta', p: 'Jika pekerjaanmu menuntut mobilitas tinggi, kamu ingin akses lebih cepat tanpa rujukan berjenjang, atau menginginkan kelas kamar dan rumah sakit pilihan yang lebih fleksibel — asuransi swasta jadi pelengkap yang relevan.' },
    { h: 'Bisakah Klaim di Kedua Sisi Sekaligus?', p: 'Umumnya tidak untuk kejadian yang sama (koordinasi manfaat/coordination of benefits berlaku di banyak polis) — tapi kamu bisa memilih memakai BPJS untuk satu kejadian dan asuransi swasta untuk kejadian lain sesuai kebutuhan saat itu.' },
  ],
  claimProcessTitle: 'Alur Klaim Keduanya',
  claimIntro: 'Berbeda mekanisme, sama-sama penting dipahami.',
  claimSteps: [
    { title: 'BPJS — via rujukan berjenjang', desc: 'Mulai dari faskes tingkat pertama sesuai domisili terdaftar.' },
    { title: 'Swasta — cashless di RS rekanan', desc: 'Tunjukkan kartu digital, verifikasi langsung tanpa rujukan.' },
    { title: 'Swasta — reimbursement di RS lain', desc: 'Bayar dulu, ajukan penggantian dengan dokumen lengkap.' },
  ],
  comparisonTitle: 'Ringkasan Perbandingan',
  comparisonIntro: 'Semua perbedaan utama dalam satu tabel.',
  comparisonColA: 'BPJS Kesehatan',
  comparisonColB: 'Asuransi Swasta',
  comparisonRows: [
    { label: 'Sifat kepesertaan', a: 'Wajib', b: 'Sukarela / pelengkap' },
    { label: 'Pilihan rumah sakit', a: 'Sesuai rujukan berjenjang', b: 'Bebas pilih RS rekanan' },
    { label: 'Proses klaim', a: 'Rujukan & verifikasi berjenjang', b: 'Cashless langsung di RS rekanan' },
    { label: 'Kelas kamar', a: 'Sesuai kelas kepesertaan', b: 'Sesuai plan yang dipilih' },
    { label: 'Iuran/premi', a: 'Terjangkau, sesuai kelas', b: 'Mulai Rp 200rb/bulan' },
  ],
  faqTitle: 'Pertanyaan Seputar BPJS vs Asuransi Swasta',
  faq: [
    { q: 'Apakah wajib punya BPJS jika sudah punya asuransi swasta?', a: 'Ya — BPJS Kesehatan adalah kewajiban hukum untuk seluruh warga negara, terlepas dari kepemilikan asuransi swasta.' },
    { q: 'Bisakah pindah kelas BPJS ke kelas lebih tinggi?', a: 'Bisa, dengan mengajukan perubahan kelas kepesertaan ke BPJS Kesehatan sesuai prosedur yang berlaku, biasanya dengan penyesuaian iuran.' },
    { q: 'Apakah asuransi swasta menanggung apa yang tidak ditanggung BPJS?', a: 'Tergantung plan — beberapa manfaat seperti kelas kamar lebih tinggi atau akses RS tertentu di luar jaringan BPJS bisa jadi nilai tambah asuransi swasta.' },
  ],
  internalLinksTitle: 'Jelajahi Asuransi Kesehatan',
  internalLinks: [
    { label: 'Asuransi Kesehatan (Hub)', path: '/asuransi-kesehatan' },
    { label: 'Cara Klaim Asuransi Kesehatan', path: '/asuransi-kesehatan/klaim' },
    { label: 'Premi Asuransi Kesehatan', path: '/asuransi-kesehatan/premi' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Asuransi Kecelakaan Diri', excerpt: 'Daftar 60 detik, santunan cepat untuk kecelakaan kapan pun dan di mana pun.', path: '/asuransi-kecelakaan-diri' },
  ],
  ctaTitle: 'Lengkapi Proteksimu',
  ctaSubtitle: 'Daftar asuransi kesehatan swasta sebagai pelengkap BPJS dalam hitungan menit.',
  extraJsonLd: [articleJsonLd(
    'Asuransi Kesehatan Swasta vs BPJS: Perlu Keduanya?',
    'Perbandingan BPJS Kesehatan dan asuransi kesehatan swasta — kapan masing-masing dibutuhkan.',
    '/perbandingan/asuransi-kesehatan-vs-bpjs',
  )],
};

export const paVsAsuransiJiwa: SiloPageContent = {
  breadcrumb: [
    { name: 'Beranda', path: '/' },
    { name: 'Produk', path: '/products' },
    { name: 'Asuransi Kecelakaan Diri', path: '/asuransi-kecelakaan-diri' },
    { name: 'vs Asuransi Jiwa', path: '/perbandingan/personal-accident-vs-asuransi-jiwa' },
  ],
  seoTitle: 'Personal Accident vs Asuransi Jiwa: Apa Bedanya? | SurePath',
  seoDescription: 'Personal Accident hanya menanggung kecelakaan, asuransi jiwa menanggung kecelakaan dan sakit. Perbandingan lengkap premi, cakupan, dan kapan butuh keduanya.',
  category: 'Perbandingan Proteksi Jiwa',
  h1: 'Personal Accident vs Asuransi Jiwa',
  heroSubtitle: 'Dua jenis proteksi yang sering disamakan padahal berbeda fungsi — ini perbedaan sebenarnya, dan kenapa banyak orang punya keduanya sekaligus.',
  heroHighlights: ['Beda Cakupan, Beda Fungsi', 'PA Lebih Terjangkau', 'Bisa Saling Melengkapi'],
  bodyIntro: 'Personal Accident (PA) dan asuransi jiwa sama-sama memberi santunan finansial ke ahli waris, tapi pemicunya berbeda jauh. PA hanya membayar jika penyebabnya kecelakaan — bukan penyakit. Asuransi jiwa menanggung kematian karena sebab apa pun, termasuk sakit, dengan premi yang jauh lebih tinggi dan proses underwriting yang lebih ketat, sering memerlukan medical checkup.',
  benefitsTitle: 'Kenapa Perbedaan Ini Penting',
  benefits: [
    { title: 'Cakupan Risiko Berbeda Jauh', desc: 'Memilih hanya salah satu bisa meninggalkan celah proteksi besar tergantung penyebab risiko yang sebenarnya kamu khawatirkan.' },
    { title: 'Selisih Premi Signifikan', desc: 'PA jauh lebih terjangkau karena cakupannya lebih sempit — tapi itu berarti proteksinya juga lebih terbatas.' },
    { title: 'Kombinasi Sering Jadi Strategi Terbaik', desc: 'Banyak orang memakai asuransi jiwa sebagai proteksi utama dan PA sebagai lapisan tambahan murah untuk risiko kecelakaan spesifik.' },
  ],
  coverageTitle: 'Apa yang Membedakan Keduanya',
  coverageIntro: 'Empat perbedaan inti yang perlu dipahami sebelum memilih.',
  coverageItems: [
    { title: 'Penyebab yang Ditanggung', desc: 'PA: kecelakaan saja. Asuransi jiwa: kecelakaan dan sakit, cakupan jauh lebih luas.' },
    { title: 'Proses Pendaftaran', desc: 'PA: instan, ~60 detik, tanpa medical checkup. Asuransi jiwa: lebih lama, sering perlu pemeriksaan kesehatan.' },
    { title: 'Struktur Premi', desc: 'PA: flat/terjangkau. Asuransi jiwa: dipengaruhi usia dan riwayat kesehatan secara signifikan.' },
    { title: 'Manfaat Tambahan', desc: 'Asuransi jiwa sering punya komponen investasi/tabungan (unit link); PA murni proteksi tanpa komponen investasi.' },
  ],
  priceTitle: 'Perbandingan Premi',
  priceIntro: 'Ilustrasi kasar untuk melihat skala perbedaannya.',
  priceTable: [
    { label: 'Personal Accident', value: 'Mulai Rp 50.000/bulan' },
    { label: 'Asuransi Jiwa (term life)', value: 'Umumnya lebih tinggi, tergantung usia & uang pertanggungan' },
  ],
  showCalculator: false,
  bodySections: [
    { h: 'Kapan PA Saja Sudah Cukup', p: 'Jika kamu mencari proteksi tambahan murah khusus untuk risiko kecelakaan — misalnya karena sering berkendara motor/mobil — dan sudah punya bentuk proteksi lain untuk risiko sakit, PA sendiri bisa jadi pelengkap yang efisien.' },
    { h: 'Kapan Butuh Asuransi Jiwa', p: 'Jika kamu adalah pencari nafkah utama keluarga dan ingin memastikan keluarga terlindungi dari risiko apa pun — bukan cuma kecelakaan — asuransi jiwa memberi jaring pengaman yang jauh lebih luas.' },
    { h: 'Kenapa Banyak Orang Punya Keduanya', p: 'PA memberi lapisan tambahan murah khusus risiko kecelakaan tanpa perlu menaikkan uang pertanggungan asuransi jiwa utama yang preminya jauh lebih mahal per tambahan nominal.' },
  ],
  claimProcessTitle: 'Perbedaan Proses Klaim',
  claimIntro: 'Alur dasarnya mirip, dokumen pendukungnya beda.',
  claimSteps: [
    { title: 'PA — santunan kecelakaan', desc: 'Perlu bukti bahwa penyebab kematian/cacat/biaya medis adalah kecelakaan, bukan sakit.' },
    { title: 'Asuransi jiwa — santunan sebab apa pun', desc: 'Dokumen medis lengkap diperlukan terlepas dari penyebab kematian.' },
  ],
  comparisonTitle: 'Ringkasan Perbandingan',
  comparisonIntro: 'Semua perbedaan utama dalam satu tabel.',
  comparisonColA: 'Personal Accident',
  comparisonColB: 'Asuransi Jiwa',
  comparisonRows: [
    { label: 'Penyebab yang ditanggung', a: 'Kecelakaan saja', b: 'Kecelakaan & sakit' },
    { label: 'Medical checkup', a: 'Umumnya tidak perlu', b: 'Sering diperlukan' },
    { label: 'Premi', a: 'Lebih ringan', b: 'Lebih tinggi' },
    { label: 'Proses pendaftaran', a: 'Instan, ~60 detik', b: 'Lebih lama, ada underwriting' },
    { label: 'Komponen investasi', a: 'Tidak ada', b: 'Kadang ada (unit link)' },
  ],
  faqTitle: 'Pertanyaan Seputar PA vs Asuransi Jiwa',
  faq: [
    { q: 'Bisakah punya PA dan asuransi jiwa sekaligus?', a: 'Bisa, bahkan disarankan — keduanya melindungi risiko berbeda dan bisa saling melengkapi tanpa tumpang tindih manfaat.' },
    { q: 'Mana yang harus didaftar duluan?', a: 'Tergantung prioritas dan budget — jika dana terbatas, asuransi jiwa dengan cakupan lebih luas sering diprioritaskan, dengan PA ditambahkan belakangan sebagai pelengkap.' },
    { q: 'Apakah PA bisa jadi pengganti asuransi jiwa?', a: 'Tidak disarankan sebagai pengganti penuh — PA tidak menanggung risiko sakit yang menjadi penyebab kematian paling umum secara statistik.' },
  ],
  internalLinksTitle: 'Jelajahi Asuransi Kecelakaan Diri',
  internalLinks: [
    { label: 'Asuransi Kecelakaan Diri (Hub)', path: '/asuransi-kecelakaan-diri' },
    { label: 'Cara Klaim Kecelakaan Diri', path: '/asuransi-kecelakaan-diri/klaim' },
    { label: 'Premi Kecelakaan Diri', path: '/asuransi-kecelakaan-diri/premi' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'Asuransi Kesehatan', excerpt: 'Cashless di 3.000+ rumah sakit rekanan, dilengkapi asisten medis AI 24 jam.', path: '/asuransi-kesehatan' },
  ],
  ctaTitle: 'Tentukan Proteksi yang Tepat',
  ctaSubtitle: 'Daftar Personal Accident online 60 detik — mulai dari Rp 50rb/bulan.',
  extraJsonLd: [articleJsonLd(
    'Personal Accident vs Asuransi Jiwa: Apa Bedanya?',
    'Perbandingan cakupan, premi, dan proses pendaftaran Personal Accident dan asuransi jiwa.',
    '/perbandingan/personal-accident-vs-asuransi-jiwa',
  )],
};
