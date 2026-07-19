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

// Positioning note (docs/SEO_KEYWORD_MAP.md §1.6): SurePath's insurer
// partners (Zurich, Tugu, Sinar Mas, Sompo, Intra Asia — per index.html
// JSON-LD) are NOT competitors, they're the underwriters whose products
// SurePath distributes. This page frames the choice correctly: platform
// convenience vs going direct to one insurer, NOT "SurePath's product is
// cheaper/better than theirs" — the premium is the same OJK-regulated rate
// either way. Misframing this as a head-to-head product comparison would
// misrepresent the relationship with underwriting partners.
export const surepathVsBeliLangsung: SiloPageContent = {
  breadcrumb: [
    { name: 'Beranda', path: '/' },
    { name: 'Produk', path: '/products' },
    { name: 'Beli Lewat SurePath vs Langsung', path: '/perbandingan/surepath-vs-beli-langsung' },
  ],
  seoTitle: 'Beli Asuransi Lewat SurePath vs Langsung ke Perusahaan Asuransi | SurePath',
  seoDescription: 'Premi sama — tarif diatur OJK. Bedanya di kemudahan bandingkan, proses digital, dan dukungan klaim. Ini yang sebenarnya berubah kalau beli lewat platform vs langsung.',
  category: 'Cara Membeli Asuransi',
  h1: 'Beli Lewat SurePath vs Langsung ke Perusahaan Asuransi',
  heroSubtitle: 'Penting dipahami dulu: SurePath bukan perusahaan asuransi — kami platform yang menyalurkan produk dari perusahaan asuransi berizin OJK seperti Zurich, Tugu, Sinar Mas, Sompo, dan Intra Asia. Preminya sama. Yang beda adalah prosesnya.',
  heroHighlights: ['Premi Sama (Tarif OJK)', 'Bandingkan 10+ Insurer Sekaligus', 'Bukan Kompetitor, Tapi Mitra'],
  bodyIntro: 'Ini pertanyaan yang wajar: kalau tarifnya sama-sama diatur OJK, kenapa harus beli lewat SurePath dan bukan langsung ke perusahaan asuransi? Jawabannya bukan soal harga — karena memang tidak ada selisih harga dari sisi tarif dasar. Bedanya ada di pengalaman: seberapa mudah kamu membandingkan opsi, seberapa cepat prosesnya, dan seberapa terbantu kamu saat harus klaim.',
  benefitsTitle: 'Apa yang Sebenarnya Berubah',
  benefits: [
    { title: 'Bandingkan Tanpa Hubungi Satu-Satu', desc: 'Lihat penawaran dari berbagai perusahaan asuransi sekaligus, alih-alih menghubungi masing-masing secara terpisah.' },
    { title: 'Proses Digital Penuh', desc: 'Foto STNK, isi data otomatis, bayar online — dibanding proses manual yang sering masih dilakukan langsung ke insurer.' },
    { title: 'Pendampingan Klaim', desc: 'Tim SurePath membantu memastikan dokumen klaim lengkap sebelum diajukan ke perusahaan asuransi, mengurangi risiko penolakan karena dokumen kurang.' },
    { title: 'Satu Akun untuk Semua Polis', desc: 'Kelola beberapa jenis asuransi (mobil, kesehatan, PA, perjalanan) dari berbagai insurer dalam satu aplikasi.' },
  ],
  coverageTitle: 'Yang Tidak Berubah',
  coverageIntro: 'Beberapa hal tetap sama di kedua jalur — penting untuk ekspektasi yang tepat.',
  coverageItems: [
    { title: 'Tarif Premi', desc: 'Sama-sama mengikuti batas resmi OJK — tidak ada markup dari SurePath maupun diskon rahasia dari membeli langsung.' },
    { title: 'Penerbit Polis', desc: 'Polis tetap diterbitkan oleh perusahaan asuransi mitra, bukan oleh SurePath — SurePath adalah platform teknologi yang memfasilitasi.' },
    { title: 'Ketentuan & Cakupan Polis', desc: 'Syarat, pengecualian, dan cakupan mengikuti ketentuan yang ditetapkan perusahaan asuransi penerbit, sama seperti jika kamu beli langsung.' },
  ],
  priceTitle: 'Soal Harga',
  priceIntro: 'Tidak ada perbedaan harga dasar — ini yang perlu dipahami dengan jelas.',
  priceTable: [{ label: 'Premi lewat SurePath vs langsung', value: 'Sama — mengikuti tarif resmi OJK yang berlaku untuk semua saluran' }],
  showCalculator: false,
  bodySections: [
    { h: 'Kenapa Tidak Ada Selisih Harga', p: 'Karena tarif premi asuransi kendaraan diatur resmi oleh OJK (SEOJK No.06/SEOJK.05/2017) dan berlaku sama untuk semua saluran distribusi — baik kamu beli langsung ke kantor cabang, lewat agen, atau lewat platform digital seperti SurePath. Platform digital tidak menambah biaya, dan juga tidak bisa memberi "diskon rahasia" di luar tarif resmi.' },
    { h: 'Kapan Beli Langsung Mungkin Lebih Masuk Akal', p: 'Jika kamu sudah punya hubungan lama dengan agen atau kantor cabang tertentu, sudah tahu persis produk yang diinginkan tanpa perlu membandingkan, dan tidak keberatan dengan proses yang lebih manual — beli langsung tetap opsi yang valid.' },
    { h: 'Kapan Platform Lebih Membantu', p: 'Jika kamu ingin membandingkan opsi sebelum memutuskan, lebih suka proses digital tanpa harus datang ke kantor cabang, atau menginginkan pendampingan saat proses klaim — platform seperti SurePath memberi nilai tambah nyata di luar sekadar harga.' },
  ],
  claimProcessTitle: 'Klaim — Bedanya di Sini',
  claimIntro: 'Proses inti klaim sama-sama ditentukan perusahaan asuransi, tapi pendampingannya beda.',
  claimSteps: [
    { title: 'Lewat SurePath', desc: 'Ajukan lewat app, tim SurePath membantu memastikan dokumen lengkap sebelum diteruskan ke insurer.' },
    { title: 'Langsung ke insurer', desc: 'Ajukan langsung sesuai prosedur masing-masing perusahaan asuransi, tanpa lapisan pendampingan tambahan.' },
  ],
  faqTitle: 'Pertanyaan Seputar Beli Lewat Platform',
  faq: [
    { q: 'Apakah SurePath adalah perusahaan asuransi?', a: 'Bukan — SurePath adalah platform teknologi yang memasarkan produk dari perusahaan asuransi berizin dan diawasi OJK. Polis diterbitkan oleh perusahaan asuransi mitra, bukan oleh SurePath.' },
    { q: 'Apakah premi lewat SurePath lebih murah?', a: 'Tidak lebih murah maupun lebih mahal — tarif premi asuransi kendaraan diatur resmi OJK dan berlaku sama di semua saluran distribusi.' },
    { q: 'Kalau ada masalah klaim, siapa yang bertanggung jawab?', a: 'Keputusan klaim tetap berada di tangan perusahaan asuransi penerbit polis — SurePath berperan membantu proses pengajuan dan pendampingan dokumen, bukan sebagai pemutus keputusan klaim.' },
    { q: 'Apakah saya bisa beli dari perusahaan asuransi tertentu lewat SurePath?', a: 'Bisa — SurePath menampilkan penawaran dari berbagai mitra asuransi, dan kamu bebas memilih penawaran dari perusahaan asuransi yang kamu inginkan.' },
  ],
  internalLinksTitle: 'Jelajahi Produk',
  internalLinks: [
    { label: 'Asuransi Mobil', path: '/asuransi-mobil' },
    { label: 'Tentang SurePath', path: '/about' },
    { label: 'Cara Kerja SurePath', path: '/how-it-works' },
  ],
  relatedArticlesTitle: 'Baca Juga',
  relatedArticles: [
    { title: 'SEOJK No.06/SEOJK.05/2017', excerpt: 'Regulasi OJK yang mengatur batas tarif premi asuransi kendaraan bermotor.', path: '/regulasi/seojk-6-2017-tarif-premi' },
  ],
  ctaTitle: 'Bandingkan Sebelum Memutuskan',
  ctaSubtitle: 'Lihat penawaran dari 10+ perusahaan asuransi sekaligus — gratis, tanpa komitmen.',
  extraJsonLd: [articleJsonLd(
    'Beli Lewat SurePath vs Langsung ke Perusahaan Asuransi',
    'Penjelasan perbedaan membeli asuransi lewat platform SurePath dibanding langsung ke perusahaan asuransi.',
    '/perbandingan/surepath-vs-beli-langsung',
  )],
};
