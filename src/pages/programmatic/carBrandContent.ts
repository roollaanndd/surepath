import { SiloPageContent } from '../site/SiloLandingTemplate';

// Phase 4 kickoff — programmatic SEO for car brands (docs/SEO_ARCHITECTURE.md
// Phase 4, "50 car brand pages" bucket). A shared generator keeps structure
// consistent, but every BrandFact below is genuinely differentiated —
// different popular models, price segment, service network, and claim
// considerations per brand — specifically to avoid the thin/mail-merge
// content trap the original brief warns against repeatedly. Facts here are
// well-established, widely-known Indonesian automotive market knowledge
// (GAIKINDO sales leaders, common model lineups), phrased with "umumnya"
// hedging rather than asserting precise unverifiable statistics.

const BASE_URL = 'https://myinsurepath.com';

interface BrandFact {
  slug: string;
  name: string;
  positioning: string;
  popularModels: { name: string; type: string; note: string }[];
  priceSegment: string;
  serviceNote: string;
  claimNote: string;
  coverageRecommendation: string;
  intro: string;
}

const rootCrumbs = [
  { name: 'Beranda', path: '/' },
  { name: 'Produk', path: '/products' },
  { name: 'Asuransi Mobil', path: '/asuransi-mobil' },
  { name: 'Per Merek', path: '/asuransi-mobil/merek' },
];

function generateBrandContent(f: BrandFact): SiloPageContent {
  const path = `/asuransi-mobil/merek/${f.slug}`;
  return {
    breadcrumb: [...rootCrumbs, { name: f.name, path }],
    seoTitle: `Asuransi Mobil ${f.name} — All Risk & TLO, Tarif Resmi OJK | SurePath`,
    seoDescription: `Asuransi mobil ${f.name} dengan tarif resmi OJK. Cek pertimbangan khusus untuk pemilik ${f.name} — model populer, jaringan bengkel resmi, dan cara memilih All Risk vs TLO.`,
    category: `Asuransi Mobil ${f.name}`,
    h1: `Asuransi Mobil ${f.name}`,
    heroSubtitle: f.intro,
    heroHighlights: ['Tarif Resmi OJK', 'Bengkel Rekanan & Resmi', `${f.popularModels.length}+ Model Populer`],
    bodyIntro: f.intro,
    benefitsTitle: `Kenapa Pemilik ${f.name} Perlu Asuransi yang Tepat`,
    benefits: [
      { title: 'Pilih Sesuai Model & Segmen', desc: `${f.priceSegment} — harga pertanggungan yang tepat penting untuk premi yang akurat dan klaim yang tidak under-insured.` },
      { title: 'Jaringan Bengkel', desc: f.serviceNote },
      { title: 'Pola Klaim Spesifik Merek', desc: f.claimNote },
    ],
    coverageTitle: `Model ${f.name} Populer di Indonesia`,
    coverageIntro: `Pertimbangan asuransi bisa berbeda tergantung model dan segmen ${f.name} yang kamu miliki.`,
    coverageItems: f.popularModels.map(m => ({ title: `${m.name} (${m.type})`, desc: m.note })),
    priceTitle: 'Kisaran Premi',
    priceIntro: `Premi ${f.name} mengikuti tarif resmi OJK yang sama dengan merek lain — dihitung dari harga pertanggungan kendaraan, bukan mereknya secara langsung.`,
    priceTable: [
      { label: 'All Risk', value: '1,05% – 4,20% dari harga pertanggungan/tahun' },
      { label: 'TLO', value: '0,20% – 0,78% dari harga pertanggungan/tahun' },
    ],
    showCalculator: true,
    bodySections: [
      { h: `Cara Memilih All Risk atau TLO untuk ${f.name}`, p: f.coverageRecommendation },
      { h: 'Segmen Harga & Dampaknya ke Premi', p: `${f.priceSegment} Karena premi dihitung sebagai persentase dari harga pertanggungan, model dengan harga lebih tinggi otomatis punya premi tahunan lebih besar dalam nominal Rupiah meski persentase tarifnya bisa lebih rendah (kategori harga kendaraan yang lebih tinggi punya tarif persentase yang menurun sesuai SEOJK No.06/SEOJK.05/2017).` },
      { h: 'Jaringan Perbaikan', p: f.serviceNote },
    ],
    claimProcessTitle: `Klaim Asuransi Mobil ${f.name}`,
    claimIntro: 'Proses klaim sama seperti merek lain — lihat panduan lengkap di halaman Cara Klaim Asuransi Mobil.',
    claimSteps: [
      { title: 'Laporkan via app', desc: 'Foto kerusakan dan ajukan laporan dalam 3×24 jam.' },
      { title: 'Survei & approval', desc: 'Surveyor asuransi memverifikasi kerusakan.' },
      { title: 'Perbaikan', desc: 'Di bengkel rekanan resmi atau jaringan yang tersedia untuk merekmu.' },
    ],
    faqTitle: `Pertanyaan Seputar Asuransi Mobil ${f.name}`,
    faq: [
      { q: `Apakah premi ${f.name} lebih mahal dari merek lain?`, a: 'Tidak berdasarkan merek secara langsung — premi ditentukan oleh harga pertanggungan (nilai kendaraan) dan wilayah, sesuai tarif resmi OJK yang berlaku sama untuk semua merek.' },
      { q: `Model ${f.name} apa yang paling umum diasuransikan?`, a: `${f.popularModels[0].name} umumnya menjadi model paling populer dari ${f.name} yang diasuransikan pemilik di Indonesia, mengikuti volume penjualannya.` },
      { q: 'Apakah semua bengkel bisa memperbaiki mobil saya?', a: 'Untuk klaim All Risk, perbaikan umumnya diarahkan ke bengkel rekanan resmi perusahaan asuransi — bukan berdasarkan merek kendaraan, tapi jaringan kerja sama insurer.' },
      { q: `Apakah ${f.name} bekas tetap bisa diasuransikan?`, a: 'Bisa, selama usia kendaraan memenuhi syarat masing-masing perusahaan asuransi — cek ketentuan usia maksimum untuk All Risk vs TLO di halaman produk terkait.' },
    ],
    internalLinksTitle: 'Jelajahi Asuransi Mobil',
    internalLinks: [
      { label: 'Asuransi Mobil All Risk', path: '/asuransi-mobil/all-risk' },
      { label: 'Asuransi Mobil TLO', path: '/asuransi-mobil/tlo' },
      { label: 'Premi Asuransi Mobil 2026', path: '/asuransi-mobil/premi' },
      { label: 'Semua Merek', path: '/asuransi-mobil/merek' },
    ],
    relatedArticlesTitle: 'Baca Juga',
    relatedArticles: [
      { title: 'Asuransi All Risk vs TLO: Pilih yang Mana?', excerpt: 'Bedah lengkap perbedaan All Risk dan TLO beserta tarif OJK.', path: '/blog/asuransi-all-risk-vs-tlo' },
    ],
    ctaTitle: `Bandingkan Premi ${f.name}mu`,
    ctaSubtitle: 'Cek estimasi premi gratis dalam 2 menit — tanpa perlu daftar dulu.',
    extraJsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: `Asuransi Mobil ${f.name}`,
      name: `Asuransi Mobil ${f.name}`,
      description: `Asuransi mobil All Risk dan TLO untuk kendaraan ${f.name}, tarif resmi OJK.`,
      provider: { '@id': `${BASE_URL}/#organization` },
      areaServed: { '@type': 'Country', name: 'Indonesia' },
      url: `${BASE_URL}${path}`,
    }],
  };
}

const BRAND_FACTS: BrandFact[] = [
  {
    slug: 'toyota',
    name: 'Toyota',
    positioning: 'Pemimpin pasar mobil terlaris di Indonesia selama beberapa dekade.',
    intro: 'Toyota secara konsisten menjadi merek mobil terlaris di Indonesia, dengan rentang produk yang sangat luas — dari city car LCGC sampai MPV premium. Karena populasinya besar, jaringan bengkel resmi dan ketersediaan suku cadang Toyota tergolong paling luas di antara semua merek.',
    popularModels: [
      { name: 'Avanza', type: 'MPV', note: 'MPV keluarga terlaris di Indonesia — populasi besar berarti suku cadang dan bengkel rekanan sangat mudah ditemukan.' },
      { name: 'Innova', type: 'MPV Premium', note: 'Segmen lebih tinggi dari Avanza, sering dipakai untuk keperluan bisnis/armada — nilai pertanggungan lebih besar.' },
      { name: 'Rush', type: 'SUV Kompak', note: 'SUV kompak populer untuk keluarga muda, harga pertanggungan menengah.' },
      { name: 'Agya', type: 'LCGC Hatchback', note: 'Segmen entry-level — premi tahunan dalam nominal Rupiah relatif kecil karena harga pertanggungan rendah.' },
      { name: 'Fortuner', type: 'SUV Besar', note: 'Segmen premium dengan nilai pertanggungan tinggi — All Risk dengan perluasan lengkap umumnya lebih relevan.' },
    ],
    priceSegment: 'Toyota mencakup hampir semua segmen harga, dari LCGC (Agya) hingga premium (Alphard, Fortuner) — pastikan pilih kategori harga pertanggungan yang sesuai model spesifikmu, bukan asumsi umum "harga Toyota".',
    serviceNote: 'Jaringan bengkel resmi Toyota (Auto2000, Toyota dealer resmi lain) adalah salah satu yang terluas di Indonesia, tersebar hingga ke banyak kota tingkat kabupaten — memudahkan proses perbaikan klaim di luar kota besar.',
    claimNote: 'Karena populasi Toyota besar, ketersediaan suku cadang original maupun aftermarket berkualitas umumnya lebih cepat, yang bisa mempercepat proses perbaikan klaim dibanding merek dengan populasi lebih kecil.',
    coverageRecommendation: 'Untuk model keluarga seperti Avanza atau Innova yang masih baru/kredit, All Risk umumnya lebih masuk akal. Untuk unit yang sudah berusia 5+ tahun dan lunas, TLO cukup memadai mengingat suku cadang yang mudah didapat membuat biaya perbaikan minor relatif terjangkau untuk ditanggung sendiri.',
  },
  {
    slug: 'honda',
    name: 'Honda',
    positioning: 'Konsisten di posisi 2-3 penjualan nasional, dikenal reliabilitas dan efisiensi bahan bakar.',
    intro: 'Honda dikenal dengan reliabilitas mesin dan efisiensi bahan bakar, dengan basis penggemar yang loyal di segmen hatchback dan SUV kompak. Jaringan bengkel resmi Honda luas di kota-kota besar, meski sedikit lebih terbatas dari Toyota di daerah tingkat kabupaten.',
    popularModels: [
      { name: 'Brio', type: 'Hatchback/LCGC', note: 'Hatchback terlaris Honda, sering jadi pilihan pertama pengendara muda — populasi besar, suku cadang mudah.' },
      { name: 'HR-V', type: 'SUV Kompak', note: 'SUV kompak terlaris Honda, segmen menengah — kombinasi popularitas dan nilai pertanggungan yang cukup tinggi.' },
      { name: 'CR-V', type: 'SUV Besar', note: 'Segmen lebih premium, nilai pertanggungan lebih tinggi — perluasan jaminan lengkap direkomendasikan.' },
      { name: 'BR-V', type: 'MPV/SUV 7-Seater', note: 'Alternatif keluarga dengan harga lebih terjangkau dari HR-V.' },
    ],
    priceSegment: 'Honda umumnya berada di segmen menengah ke atas dibanding kompetitor LCGC-nya, dengan harga pertanggungan yang cenderung sedikit lebih tinggi dari model setara merek lain.',
    serviceNote: 'Bengkel resmi Honda (Honda Sensing/dealer resmi) terkonsentrasi di kota-kota besar dan menengah — pemilik di daerah lebih terpencil sebaiknya cek jarak bengkel resmi terdekat sebelum memutuskan jenis pertanggungan.',
    claimNote: 'Model populer seperti Brio dan HR-V punya suku cadang yang relatif mudah didapat karena volume penjualan tinggi, membantu mempercepat proses perbaikan klaim dibanding model niche.',
    coverageRecommendation: 'Brio yang masih baru sering jadi target pencurian karena permintaan pasar bekas yang tinggi — pertimbangkan All Risk untuk unit baru. Untuk HR-V/CR-V yang sudah lebih tua, TLO bisa jadi opsi hemat asalkan sudah lunas.',
  },
  {
    slug: 'daihatsu',
    name: 'Daihatsu',
    positioning: 'Merek satu grup dengan Toyota, kuat di segmen LCGC dan entry MPV.',
    intro: 'Daihatsu berbagi platform dengan sejumlah model Toyota (Ayla-Agya, Xenia-Avanza, Terios-Rush), tapi umumnya dijual dengan harga sedikit lebih terjangkau. Karena kesamaan platform, ketersediaan suku cadang sering ikut menguntungkan dari basis Toyota yang lebih besar.',
    popularModels: [
      { name: 'Sigra', type: 'LCGC MPV', note: 'MPV 7-seater termurah di segmennya — harga pertanggungan rendah, premi tahunan ringan.' },
      { name: 'Xenia', type: 'MPV', note: 'Kembar Avanza dengan harga sedikit lebih terjangkau — pertimbangan asuransi mirip dengan Avanza.' },
      { name: 'Ayla', type: 'LCGC Hatchback', note: 'Kembar Agya, segmen entry-level dengan premi paling ringan di lini Daihatsu.' },
      { name: 'Terios', type: 'SUV Kompak', note: 'Kembar Rush, segmen SUV keluarga dengan harga lebih kompetitif.' },
    ],
    priceSegment: 'Daihatsu umumnya berada 5-15% lebih murah dari model Toyota setara — ini berarti premi tahunan dalam nominal Rupiah juga proporsional lebih ringan meski persentase tarif OJK-nya bisa sama untuk kategori harga yang sama.',
    serviceNote: 'Jaringan bengkel resmi Daihatsu cukup luas mengikuti basis Astra yang sama dengan Toyota, meski jumlah outlet resmi murni Daihatsu sedikit lebih sedikit di beberapa daerah.',
    claimNote: 'Karena kesamaan platform dengan model Toyota, sejumlah komponen mekanis kompatibel — bisa membantu ketersediaan suku cadang di beberapa kasus, meski body part tetap spesifik per merek.',
    coverageRecommendation: 'Untuk Sigra atau Ayla yang harga pertanggungannya relatif rendah, selisih premi All Risk vs TLO dalam nominal Rupiah juga kecil — All Risk sering tetap terjangkau untuk unit baru. TLO lebih relevan untuk unit yang sudah cukup tua.',
  },
  {
    slug: 'suzuki',
    name: 'Suzuki',
    positioning: 'Dikenal efisiensi bahan bakar, kuat di segmen MPV kompak dan city car.',
    intro: 'Suzuki punya basis penggemar loyal terutama untuk model MPV kompak dan city car yang dikenal irit bahan bakar. Jaringan bengkel resmi Suzuki lebih terbatas dibanding Toyota/Honda, terkonsentrasi di kota-kota besar.',
    popularModels: [
      { name: 'Ertiga', type: 'MPV', note: 'MPV andalan Suzuki, alternatif populer dari Avanza dengan harga kompetitif.' },
      { name: 'XL7', type: 'SUV/MPV Crossover', note: 'Versi lebih premium dari Ertiga dengan tampilan SUV, nilai pertanggungan sedikit lebih tinggi.' },
      { name: 'Baleno', type: 'Hatchback', note: 'Hatchback dengan fitur lebih lengkap di kelasnya, segmen menengah.' },
      { name: 'Jimny', type: 'SUV Off-Road', note: 'Segmen niche dengan permintaan tinggi di pasar bekas — pertimbangkan perluasan jaminan pencurian mengingat popularitasnya di kalangan kolektor.' },
    ],
    priceSegment: 'Suzuki umumnya kompetitif di segmen MPV kompak dan city car, dengan Jimny sebagai pengecualian di segmen SUV niche bernilai lebih tinggi relatif terhadap ukurannya.',
    serviceNote: 'Bengkel resmi Suzuki terkonsentrasi di kota besar — pemilik di luar Jabodetabek/kota besar lain sebaiknya cek jarak bengkel resmi terdekat, terutama untuk klaim All Risk yang mengarah ke bengkel rekanan.',
    claimNote: 'Jimny memiliki permintaan pasar sekunder yang tinggi karena statusnya sebagai kendaraan kolektor/off-road — ini membuatnya profil risiko pencurian yang layak diperhatikan khusus.',
    coverageRecommendation: 'Untuk Ertiga/XL7 keluarga, pertimbangan All Risk vs TLO mengikuti pola umum berdasarkan usia kendaraan. Untuk Jimny, All Risk dengan perluasan pencurian lebih direkomendasikan mengingat nilai jual kembali dan minat pasar yang tinggi.',
  },
  {
    slug: 'mitsubishi',
    name: 'Mitsubishi',
    positioning: 'Xpander secara konsisten menjadi salah satu MPV terlaris nasional, sering bersaing ketat dengan Avanza.',
    intro: 'Mitsubishi Xpander adalah salah satu kisah sukses terbesar di pasar MPV Indonesia sejak diluncurkan, konsisten menempati posisi penjualan tinggi nasional. Popularitas ini membuat suku cadang dan bengkel rekanan cukup mudah diakses untuk model-model utama Mitsubishi.',
    popularModels: [
      { name: 'Xpander', type: 'MPV', note: 'MPV terlaris Mitsubishi dan salah satu terlaris nasional — populasi besar, suku cadang mudah didapat.' },
      { name: 'Xforce', type: 'SUV Kompak', note: 'SUV kompak yang relatif baru, segmen menengah dengan popularitas yang terus tumbuh.' },
      { name: 'Pajero Sport', type: 'SUV Besar', note: 'Segmen premium dengan nilai pertanggungan tinggi — cocok untuk All Risk dengan perluasan lengkap.' },
    ],
    priceSegment: 'Xpander berada di segmen MPV menengah yang kompetitif dengan Avanza/Ertiga, sementara Pajero Sport masuk segmen SUV premium dengan harga pertanggungan jauh lebih tinggi.',
    serviceNote: 'Jaringan bengkel resmi Mitsubishi berkembang mengikuti popularitas Xpander, kini cukup luas di kota-kota besar dan menengah di Jawa serta sejumlah kota besar luar Jawa.',
    claimNote: 'Volume penjualan Xpander yang tinggi berarti data klaim dan pola kerusakan umum sudah cukup dipahami bengkel rekanan, membantu estimasi dan proses perbaikan yang lebih cepat.',
    coverageRecommendation: 'Untuk Xpander baru atau kredit, All Risk sering jadi pilihan mayoritas pemilik mengingat popularitasnya di pasar bekas (yang juga berarti daya tarik pencurian). Untuk Pajero Sport, perluasan jaminan lengkap (banjir, SRCC) sangat direkomendasikan mengingat nilai pertanggungan yang besar.',
  },
  {
    slug: 'wuling',
    name: 'Wuling',
    positioning: 'Pendatang baru asal Tiongkok yang tumbuh cepat sejak 2017, termasuk lini kendaraan listrik.',
    intro: 'Wuling adalah salah satu merek yang tumbuh paling cepat di Indonesia sejak masuk pasar pada 2017, dengan lini produk mencakup MPV konvensional hingga kendaraan listrik. Sebagai merek yang relatif baru, jaringan bengkel resminya masih terus berkembang, terutama di luar Jawa.',
    popularModels: [
      { name: 'Confero', type: 'MPV', note: 'MPV entry-level Wuling dengan harga kompetitif di segmennya.' },
      { name: 'Almaz', type: 'SUV', note: 'SUV segmen menengah dengan fitur teknologi yang cukup lengkap di kelasnya.' },
      { name: 'Air ev', type: 'Mobil Listrik', note: 'Kendaraan listrik mungil — pertimbangan asuransi berbeda dari mobil konvensional, termasuk soal baterai dan kabel pengisian; tanyakan detail perluasan jaminan spesifik EV ke tim SurePath.' },
    ],
    priceSegment: 'Wuling umumnya kompetitif di harga dibanding merek Jepang setara, dengan Air ev sebagai kategori tersendiri (kendaraan listrik) yang perhitungan risikonya berbeda dari mobil bermesin konvensional.',
    serviceNote: 'Jaringan bengkel resmi Wuling masih terkonsentrasi di Jabodetabek dan kota-kota besar Jawa — pemilik di luar area ini disarankan mengecek jarak bengkel resmi terdekat sebelum menentukan jenis pertanggungan, karena ini mempengaruhi kenyamanan proses klaim.',
    claimNote: 'Sebagai merek yang relatif baru, riwayat data klaim jangka panjang belum sebanyak merek Jepang mapan — hal ini bisa memengaruhi ketersediaan estimasi cepat di sejumlah bengkel non-resmi.',
    coverageRecommendation: 'Untuk model konvensional seperti Confero/Almaz, pola pertimbangan All Risk vs TLO mengikuti prinsip umum berdasarkan usia dan status kredit. Untuk Air ev, diskusikan langsung dengan tim SurePath soal cakupan komponen spesifik EV sebelum memutuskan jenis polis.',
  },
];

export const CAR_BRANDS = BRAND_FACTS.map(f => ({ slug: f.slug, name: f.name, positioning: f.positioning }));

export const CAR_BRAND_CONTENT: Record<string, SiloPageContent> = Object.fromEntries(
  BRAND_FACTS.map(f => [f.slug, generateBrandContent(f)]),
);
