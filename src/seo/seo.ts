// ─────────────────────────────────────────────────────────────────────────────
// SurePath SEO — per-route document head management (v1.54.0)
//
// The app is a client-rendered SPA on a custom pathname router (App.tsx). Before
// this module every route shared index.html's homepage <title>/description/
// canonical/OG — so Google saw 20+ pages of duplicate metadata and no per-page
// keyword targeting. `applyDocumentHead(resolveSeo(pathname))` gives each route a
// unique, crawlable title, meta description, canonical, robots directive, Open
// Graph / Twitter card, and (where useful) a page-level JSON-LD block.
//
// No dependency (no react-helmet) — a few idempotent DOM writes on route change.
// Googlebot renders JS and indexes the resulting DOM, so this is picked up.
// ─────────────────────────────────────────────────────────────────────────────

export const SITE = {
  origin: 'https://myinsurepath.com',
  name: 'SurePath',
  defaultOgImage: 'https://myinsurepath.com/surepath-logo.png',
  twitter: '@SurePathID',
} as const;

export interface SeoDescriptor {
  title: string;
  description: string;
  /** Path only (leading slash). Canonical is built as origin + path. */
  path: string;
  keywords?: string;
  ogImage?: string;
  /** Default true. When false, emits robots "noindex, follow". */
  index?: boolean;
  ogType?: 'website' | 'article' | 'product';
  /** Optional page-scoped JSON-LD object(s). Injected under a dedicated node. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

// ── Static per-route metadata ────────────────────────────────────────────────
// Titles kept in Bahasa Indonesia regardless of UI language — the indexed
// market is Indonesia. Titles target the primary keyword for each page; kept
// under ~60 chars where possible; descriptions under ~160.

// Homepage FAQ. This block used to live in index.html's static @graph, which the
// SPA never tears down on navigation — so /privacy, /product/car and every other
// route carried the homepage's FAQPage alongside their own schema. Keeping it here
// means it renders on '/' only, under the same managed node as every other page's
// JSON-LD. index.html keeps the four genuinely site-wide nodes (Organization,
// InsuranceAgency, WebSite, FinancialService).
const HOME_FAQ: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Apa itu SurePath?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "SurePath adalah platform asuransi digital terpercaya di Indonesia yang memungkinkan Anda membeli asuransi mobil, jiwa, perjalanan, dan properti secara online. PT Ruang Proteksi Indonesia bekerja sama dengan perusahaan asuransi berijin OJK."
        }
      },
      {
        "@type": "Question",
        "name": "Bagaimana cara beli asuransi mobil online di SurePath?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Beli asuransi mobil online di SurePath sangat mudah: 1) Foto STNK Anda, AI kami akan otomatis mengisi data kendaraan. 2) Pilih jenis perlindungan (All Risk atau TLO) dan add-on seperti banjir, gempa, SRCC. 3) Pilih perusahaan asuransi dan bandingkan premi. 4) Bayar via GoPay, DANA, OVO, QRIS, Virtual Account, atau kartu kredit. Polis aktif dalam hitungan menit."
        }
      },
      {
        "@type": "Question",
        "name": "Berapa premi asuransi mobil di SurePath?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Premi asuransi mobil di SurePath mengikuti tarif resmi OJK (SEOJK No. 6/SEOJK.05/2017). Premi bervariasi tergantung jenis kendaraan, tahun pembuatan, wilayah (Zona 1-3), dan jenis coverage (All Risk atau TLO). Gunakan kalkulator premi kami di /kalkulator untuk mendapatkan estimasi harga yang tepat."
        }
      },
      {
        "@type": "Question",
        "name": "Apa perbedaan Asuransi All Risk dan TLO?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Asuransi All Risk (Comprehensive) menanggung kerusakan akibat tabrakan, goresan, banjir, gempa, huru-hara, dan kehilangan total. Asuransi TLO (Total Loss Only) hanya menanggung kerusakan total (biaya perbaikan ≥ 75% nilai kendaraan) atau kehilangan. All Risk lebih mahal tapi proteksinya lebih lengkap. TLO lebih murah dan cocok untuk kendaraan tua."
        }
      },
      {
        "@type": "Question",
        "name": "Bagaimana cara klaim asuransi di SurePath?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Klaim asuransi di SurePath bisa dilakukan langsung dari HP Anda. Upload foto kerusakan, AI kami akan menganalisis tingkat kerusakan dan estimasi biaya perbaikan. Isi formulir klaim digital, dan tim kami akan memproses klaim dalam 24 jam. Anda akan mendapat notifikasi status klaim secara real-time."
        }
      },
      {
        "@type": "Question",
        "name": "Apakah saya bisa menjadi agen asuransi di SurePath?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ya, Anda bisa mendaftar sebagai mitra agen SurePath secara gratis. Daftar online, setujui perjanjian kemitraan digital, dan langsung mulai jual polis. Dapatkan komisi hingga 25% per polis, bonus koin, dan komisi override dari downline 2 level. Ada juga program tier STAR dan ELITE dengan bonus tambahan."
        }
      },
      {
        "@type": "Question",
        "name": "Metode pembayaran apa saja yang tersedia?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "SurePath menerima pembayaran via GoPay, DANA, OVO, ShopeePay, LinkAja, QRIS, Virtual Account (BCA, Mandiri, BNI), dan kartu kredit (Visa, Mastercard). Semua pembayaran diproses aman oleh Xendit dengan enkripsi PCI-DSS."
        }
      },
      {
        "@type": "Question",
        "name": "Apakah SurePath bekerja sama dengan perusahaan asuransi berijin OJK?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "PT Ruang Proteksi Indonesia bekerja sama dengan perusahaan-perusahaan asuransi berijin dan diawasi oleh OJK. SurePath adalah platform teknologi yang memfasilitasi akses ke produk asuransi. Tarif premi yang digunakan mengikuti SEOJK No. 6/SEOJK.05/2017. Mitra asuransi kami meliputi Zurich, Tugu, Sinar Mas, Sompo, dan Intra Asia."
        }
      },
      {
        "@type": "Question",
        "name": "Apakah ada diskon atau promo asuransi mobil?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ya, SurePath memiliki kode promo yang bisa Anda gunakan saat checkout. Gunakan kode WELCOME10 untuk diskon 10% sebagai pelanggan baru. Cek halaman promo atau ikuti Instagram kami untuk promo terbaru."
        }
      },
      {
        "@type": "Question",
        "name": "Bisakah saya memperpanjang polis asuransi yang sudah ada?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ya, SurePath menyediakan fitur perpanjangan polis (renewal) yang mudah. Anda akan mendapat notifikasi pengingat 30, 14, dan 7 hari sebelum polis berakhir. Cukup buka aplikasi, pilih polis yang akan diperpanjang, dan bayar premi — polis baru aktif langsung tanpa survey ulang."
        }
      }
    ]
  };

const HOME: SeoDescriptor = {
  title: 'SurePath | Asuransi Mobil, Jiwa & Properti Online — Klaim Cepat',
  description:
    'Beli asuransi mobil, jiwa, perjalanan & properti online di SurePath. Premi tarif OJK, klaim via foto HP dengan AI, polis aktif dalam menit. Daftar agen gratis.',
  path: '/',
  ogType: 'website',
  jsonLd: HOME_FAQ,
};

const breadcrumb = (items: { name: string; path: string }[]): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${SITE.origin}${it.path}`,
  })),
});

const service = (name: string, description: string): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: name,
  provider: { '@type': 'Organization', name: 'SurePath', url: SITE.origin },
  areaServed: { '@type': 'Country', name: 'Indonesia' },
  name,
  description,
});

// Product detail pages (/product/:slug)
const PRODUCTS: Record<string, SeoDescriptor> = {
  car: {
    path: '/product/car',
    ogType: 'product',
    title: 'Asuransi Mobil All Risk & TLO Online | Premi Tarif OJK — SurePath',
    description:
      'Asuransi mobil All Risk & TLO dengan premi resmi OJK. Klaim via foto HP pakai AI, 500+ bengkel rekanan, proteksi banjir & gempa. Hitung premi & beli online.',
    keywords: 'asuransi mobil, asuransi mobil all risk, asuransi mobil tlo, premi asuransi mobil, klaim asuransi mobil, asuransi kendaraan',
    jsonLd: [
      service('Asuransi Mobil All Risk & TLO', 'Perlindungan komprehensif kendaraan bermotor — tabrakan, kehilangan, banjir, gempa, dengan klaim berbasis AI.'),
      breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/products' }, { name: 'Asuransi Mobil', path: '/product/car' }]),
    ],
  },
  travel: {
    path: '/product/travel',
    ogType: 'product',
    title: 'Asuransi Perjalanan Online — Domestik & Internasional | SurePath',
    description:
      'Asuransi perjalanan domestik & internasional mulai Rp 45rb/trip. Proteksi darurat medis, delay pesawat, kehilangan bagasi & pembatalan trip. Beli online cepat.',
    keywords: 'asuransi perjalanan, travel insurance indonesia, asuransi trip, asuransi perjalanan internasional',
    jsonLd: [
      {
        ...service('Asuransi Perjalanan', 'Proteksi perjalanan domestik dan internasional: darurat medis, keterlambatan penerbangan, kehilangan bagasi, dan pembatalan trip.'),
        offers: {
          '@type': 'Offer',
          url: `${SITE.origin}/product/travel`,
          priceCurrency: 'IDR',
          price: 45000,
          priceSpecification: {
            '@type': 'PriceSpecification',
            priceCurrency: 'IDR',
            minPrice: 45000,
            valueAddedTaxIncluded: true,
          },
          availability: 'https://schema.org/InStock',
        },
      },
      breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/products' }, { name: 'Asuransi Perjalanan', path: '/product/travel' }]),
    ],
  },
  pa: {
    path: '/product/pa',
    ogType: 'product',
    title: 'Asuransi Kecelakaan Diri (PA) Online | Proteksi Jiwa — SurePath',
    description:
      'Asuransi Kecelakaan Diri (Personal Accident) — santunan meninggal, cacat tetap & biaya medis akibat kecelakaan. Premi terjangkau, beli online untuk keluarga.',
    keywords: 'asuransi kecelakaan diri, personal accident, asuransi jiwa, asuransi PA, santunan kecelakaan',
    jsonLd: [
      service('Asuransi Kecelakaan Diri (Personal Accident)', 'Santunan meninggal dunia, cacat tetap total/sebagian, dan biaya perawatan medis akibat kecelakaan.'),
      breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/products' }, { name: 'Asuransi Kecelakaan Diri', path: '/product/pa' }]),
    ],
  },
  property: {
    path: '/product/property',
    ogType: 'product',
    title: 'Asuransi Properti & Barang Online — Rumah & Gadget | SurePath',
    description:
      'Asuransi properti & barang: proteksi kerusakan fisik, cairan, pencurian & komponen internal. Lindungi rumah dan gadget Anda. Beli online dengan premi terjangkau.',
    keywords: 'asuransi properti, asuransi rumah, asuransi gadget, asuransi barang, proteksi properti',
    jsonLd: [
      service('Asuransi Properti & Barang', 'Perlindungan properti dan barang dari kerusakan fisik, cairan, pencurian, dan kerusakan komponen internal.'),
      breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/products' }, { name: 'Asuransi Properti', path: '/product/property' }]),
    ],
  },
  health: {
    path: '/product/health',
    ogType: 'product',
    title: 'Asuransi Kesehatan Keluarga Online | Rawat Inap & Jalan — SurePath',
    description:
      'Asuransi kesehatan keluarga: rawat inap, rawat jalan, gawat darurat & kesehatan gigi. Jaringan RS rekanan luas, klaim mudah. Lindungi keluarga Anda online.',
    keywords: 'asuransi kesehatan, asuransi kesehatan keluarga, asuransi rawat inap, asuransi rawat jalan',
    jsonLd: [
      service('Asuransi Kesehatan Keluarga', 'Perlindungan kesehatan keluarga: rawat inap, rawat jalan, gawat darurat 24 jam, dan perawatan gigi.'),
      breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/products' }, { name: 'Asuransi Kesehatan', path: '/product/health' }]),
    ],
  },
  climate: {
    path: '/product/climate',
    ogType: 'product',
    title: 'Asuransi Iklim & Banjir (Climate Shield) — Segera Hadir | SurePath',
    description:
      'Climate Shield: proteksi iklim parametrik untuk banjir, angin kencang & cuaca ekstrem — untuk rumah, UMKM, pertanian & bisnis. Dalam pengembangan, daftar minat gratis.',
    keywords: 'asuransi banjir, asuransi iklim, asuransi cuaca ekstrem, asuransi parametrik, proteksi banjir rumah, asuransi bencana alam',
    jsonLd: [
      service('Proteksi Iklim (Climate Shield)', 'Rencana produk proteksi iklim parametrik untuk risiko banjir, angin kencang, dan cuaca ekstrem di Indonesia. Dalam tahap pengembangan bersama mitra asuransi berizin OJK.'),
      breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Produk', path: '/products' }, { name: 'Proteksi Iklim', path: '/product/climate' }]),
    ],
  },
};

// Blog posts (/blog/:slug) — mirrors src/pages/BlogPage.tsx post list.
const BLOG_POSTS: Record<string, { title: string; description: string; date: string; updated?: string }> = {
  'asuransi-all-risk-vs-tlo': {
    title: 'Asuransi All Risk vs TLO: Pilih yang Mana? | SurePath',
    description: 'Bingung pilih All Risk atau TLO? Kami bedah perbedaan, kelebihan, dan tarif OJK-nya supaya kamu bisa pilih perlindungan mobil yang paling pas.',
    date: '2025-05-28',
  },
  'cara-klaim-asuransi-mobil': {
    title: 'Cara Klaim Asuransi Mobil yang Cepat dan Mudah | SurePath',
    description: 'Klaim asuransi mobil tidak harus ribet. Ikuti 7 langkah ini dan klaim kamu bisa selesai lebih cepat dari yang kamu kira.',
    date: '2025-05-20',
  },
  'premi-asuransi-mobil-2025': {
    title: 'Berapa Premi Asuransi Mobil 2025? Panduan Tarif OJK | SurePath',
    description: 'OJK menetapkan batas tarif premi resmi berdasarkan wilayah (Zona 1-3). Cek tarif 2025 dan hitung estimasi premi mobilmu di sini.',
    date: '2025-05-12',
  },
  'cara-daftar-mitra-asuransi': {
    title: 'Cara Daftar Jadi Mitra Asuransi — Panduan Lengkap | SurePath',
    description: 'Ingin income sampingan fleksibel? Jadi mitra agen asuransi di SurePath bisa kamu mulai dari nol, tanpa modal besar. Ini panduan lengkapnya.',
    date: '2025-05-05',
  },
  'manfaat-asuransi-perjalanan': {
    title: 'Manfaat Asuransi Perjalanan yang Wajib Kamu Tahu | SurePath',
    description: 'Perjalanan bisa berubah mendadak. Asuransi perjalanan memastikan kamu tidak menanggung biaya tak terduga sendirian. Ini manfaat lengkapnya.',
    date: '2025-04-28',
  },
};

// Simple marketing pages keyed by exact path.
const PAGES: Record<string, SeoDescriptor> = {
  '/products': {
    path: '/products',
    title: 'Produk Asuransi Online — Mobil, Jiwa, Perjalanan, Properti | SurePath',
    description:
      'Jelajahi produk asuransi SurePath: mobil (All Risk & TLO), kecelakaan diri, perjalanan, properti, kesehatan, dan proteksi iklim. Premi tarif OJK, beli online.',
    keywords: 'produk asuransi, asuransi online, beli asuransi, jenis asuransi',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Produk Asuransi', path: '/products' }]),
  },
  '/ai': {
    path: '/ai',
    title: 'Teknologi AI SurePath — Cara Kami Memakai AI di Asuransi',
    description:
      'Bagaimana SurePath memakai AI: baca STNK dari foto, pemeriksaan keaslian foto klaim, estimasi biaya perbaikan, dan survei kendaraan. Keputusan final tetap di tangan manusia.',
    keywords: 'asuransi AI, teknologi asuransi, insurtech indonesia, klaim asuransi AI, OCR STNK',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Teknologi AI', path: '/ai' }]),
  },
  '/how-it-works': {
    path: '/how-it-works',
    title: 'Cara Beli Asuransi Online di SurePath — Mudah dalam 4 Langkah',
    description:
      'Cara beli asuransi online di SurePath: foto STNK, pilih perlindungan, bandingkan premi, bayar. Polis aktif dalam menit. Klaim juga cukup lewat foto dari HP.',
    keywords: 'cara beli asuransi online, cara daftar asuransi, cara klaim asuransi',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Cara Kerja', path: '/how-it-works' }]),
  },
  '/kalkulator': {
    path: '/kalkulator',
    title: 'Kalkulator Premi Asuransi Mobil — Tarif OJK 2025 | SurePath',
    description:
      'Hitung estimasi premi asuransi mobil sesuai tarif resmi OJK (SEOJK 6/2017). Masukkan jenis kendaraan, tahun & wilayah untuk cek harga All Risk atau TLO gratis.',
    keywords: 'kalkulator asuransi mobil, hitung premi asuransi, premi asuransi mobil, tarif OJK asuransi',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Kalkulator Premi', path: '/kalkulator' }]),
  },
  '/about': {
    path: '/about',
    title: 'Tentang SurePath — Platform Asuransi Digital Indonesia',
    description:
      'SurePath (PT Ruang Proteksi Indonesia) adalah platform asuransi digital yang menghubungkan Anda dengan produk asuransi berijin OJK. Kenali misi dan tim kami.',
    keywords: 'tentang surepath, PT Ruang Proteksi Indonesia, platform asuransi digital',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Tentang Kami', path: '/about' }]),
  },
  '/contact': {
    path: '/contact',
    title: 'Kontak SurePath — Hubungi Layanan Pelanggan Asuransi',
    description:
      'Hubungi tim SurePath untuk pertanyaan seputar asuransi, klaim, atau kemitraan agen. Layanan pelanggan siap membantu via email dan WhatsApp.',
    keywords: 'kontak asuransi, hubungi surepath, customer service asuransi',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Kontak', path: '/contact' }]),
  },
  '/agents': {
    path: '/agents',
    title: 'Daftar Jadi Agen Asuransi Online — Komisi hingga 25% | SurePath',
    description:
      'Jadi mitra agen asuransi SurePath gratis. Jual polis online, komisi hingga 25% per polis, bonus koin & komisi override 2 level. Daftar dan mulai dari nol.',
    keywords: 'agen asuransi, daftar agen asuransi, mitra asuransi, komisi agen asuransi, jual asuransi online',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Mitra Agen', path: '/agents' }]),
  },
  '/partnership': {
    path: '/partnership',
    title: 'Kemitraan & Kerja Sama Asuransi — B2B | SurePath',
    description:
      'Peluang kerja sama dan kemitraan bisnis dengan SurePath — perusahaan asuransi, korporat, dan mitra distribusi. Bangun solusi proteksi digital bersama kami.',
    keywords: 'kerja sama asuransi, mitra asuransi, kemitraan bisnis asuransi, B2B asuransi',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Kemitraan', path: '/partnership' }]),
  },
  '/blog': {
    path: '/blog',
    title: 'Blog SurePath — Tips, Panduan & Info Tarif Asuransi',
    description:
      'Artikel dan panduan seputar asuransi: All Risk vs TLO, cara klaim, tarif premi OJK 2025, tips jadi agen, dan manfaat asuransi perjalanan. Belajar di blog SurePath.',
    keywords: 'blog asuransi, tips asuransi, info asuransi mobil, panduan asuransi',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Blog', path: '/blog' }]),
  },
  '/careers': {
    path: '/careers',
    title: 'Karier di SurePath — Bergabung dengan Tim Insurtech',
    description:
      'Bangun karier di SurePath, platform insurtech Indonesia. Lihat lowongan dan kesempatan bergabung dengan tim yang membangun masa depan asuransi digital.',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Karier', path: '/careers' }]),
  },
  '/privacy': {
    path: '/privacy',
    title: 'Kebijakan Privasi | SurePath',
    description: 'Kebijakan privasi SurePath — bagaimana kami mengumpulkan, menggunakan, dan melindungi data pribadi Anda sesuai peraturan yang berlaku di Indonesia.',
  },
  '/terms': {
    path: '/terms',
    title: 'Syarat & Ketentuan | SurePath',
    description: 'Syarat dan ketentuan penggunaan platform SurePath. Baca ketentuan layanan asuransi digital kami sebelum menggunakan aplikasi.',
  },
  '/security': {
    path: '/security',
    title: 'Keamanan Data & Sistem | SurePath',
    description: 'Bagaimana SurePath menjaga keamanan data dan transaksi Anda — enkripsi, pembayaran PCI-DSS via Xendit, dan perlindungan berlapis di setiap lapisan.',
  },
  '/cookie': {
    path: '/cookie',
    title: 'Kebijakan Cookie | SurePath',
    description: 'Kebijakan cookie SurePath — jenis cookie yang kami gunakan dan cara Anda mengelolanya untuk pengalaman yang lebih baik.',
  },
};

// ── Route inventory (sitemap source of truth) ────────────────────────────────
// public/sitemap.xml used to be hand-written, so it drifted from the routes in
// App.tsx and the descriptors above every time a page was added. scripts/
// generate-sitemap.mjs renders it from this list instead, which means a page
// cannot have metadata here and be missing from the sitemap.
//
// changefreq/priority are deliberately omitted — Google ignores both.
export interface SitemapEntry { path: string; lastmod: string }

/** Every indexable public URL, in crawl-priority order. */
export function indexablePaths(): SitemapEntry[] {
  const SITE_LASTMOD = '2026-10-23';
  const entries: SitemapEntry[] = [{ path: '/', lastmod: SITE_LASTMOD }];

  for (const key of ['/products', '/kalkulator', '/ai', '/how-it-works'] as const) {
    entries.push({ path: PAGES[key].path, lastmod: SITE_LASTMOD });
  }
  for (const slug of Object.keys(PRODUCTS)) {
    entries.push({ path: PRODUCTS[slug].path, lastmod: SITE_LASTMOD });
  }
  for (const key of ['/agents', '/partnership', '/blog'] as const) {
    entries.push({ path: PAGES[key].path, lastmod: SITE_LASTMOD });
  }
  for (const [slug, post] of Object.entries(BLOG_POSTS)) {
    entries.push({ path: `/blog/${slug}`, lastmod: post.updated ?? post.date });
  }
  for (const key of ['/about', '/contact', '/careers', '/privacy', '/terms', '/security', '/cookie'] as const) {
    entries.push({ path: PAGES[key].path, lastmod: SITE_LASTMOD });
  }
  return entries;
}

// App/portal routes and private token pages — must NOT be indexed.
function noindexDescriptor(path: string): SeoDescriptor {
  return {
    path,
    index: false,
    title: 'SurePath — Asuransi Digital Indonesia',
    description: 'Platform asuransi digital terpercaya di Indonesia.',
  };
}

const NOINDEX_PREFIXES = [
  '/login', '/custapp', '/agapps', '/operatorapp', '/insurerapp', '/insurer-portal',
  '/admin', '/select-app', '/review/', '/q/', '/payment',
];

/** Resolve the SEO descriptor for a given pathname. Trailing slashes and an
 *  empty path are normalised here, not at the call site. */
export function resolveSeo(rawPathname: string): SeoDescriptor {
  const pathname = rawPathname.replace(/\/+$/, '') || '/';
  if (pathname === '/') return HOME;

  const productMatch = pathname.match(/^\/product\/(car|travel|pa|property|health|climate)$/);
  if (productMatch) return PRODUCTS[productMatch[1]];

  const blogMatch = pathname.match(/^\/blog\/([a-z0-9-]+)$/);
  if (blogMatch) {
    const post = BLOG_POSTS[blogMatch[1]];
    if (post) {
      return {
        path: pathname,
        title: post.title,
        description: post.description,
        ogType: 'article',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title.replace(/ \| SurePath$/, ''),
            description: post.description,
            datePublished: post.date,
            dateModified: post.updated ?? post.date,
            image: [SITE.defaultOgImage],
            inLanguage: 'id-ID',
            author: { '@type': 'Organization', name: 'SurePath' },
            publisher: { '@type': 'Organization', name: 'SurePath', logo: { '@type': 'ImageObject', url: `${SITE.origin}/logo.png` } },
            mainEntityOfPage: `${SITE.origin}${pathname}`,
          },
          breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Blog', path: '/blog' }, { name: post.title.replace(/ \| SurePath$/, ''), path: pathname }]),
        ],
      };
    }
    // Unknown blog slug — index the listing signal but keep generic.
    return { ...PAGES['/blog'], path: pathname };
  }

  if (PAGES[pathname]) return PAGES[pathname];

  if (NOINDEX_PREFIXES.some(p => pathname === p || pathname.startsWith(p))) {
    return noindexDescriptor(pathname);
  }

  // Unknown path — do not let a soft-404 shell get indexed under homepage meta.
  return noindexDescriptor(pathname);
}

// ── DOM applier ──────────────────────────────────────────────────────────────

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string, hreflang?: string): void {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const PAGE_JSONLD_ID = 'sp-page-jsonld';

/** Apply a descriptor to the live document head. Idempotent per route change. */
export function applyDocumentHead(d: SeoDescriptor): void {
  if (typeof document === 'undefined') return;
  const canonical = `${SITE.origin}${d.path === '/' ? '/' : d.path.replace(/\/$/, '')}`;
  const ogImage = d.ogImage ?? SITE.defaultOgImage;
  const indexable = d.index !== false;

  document.title = d.title;
  upsertMeta('name', 'description', d.description);
  if (d.keywords) upsertMeta('name', 'keywords', d.keywords);
  upsertMeta(
    'name',
    'robots',
    indexable
      ? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
      : 'noindex, follow',
  );
  upsertLink('canonical', canonical);
  // The site serves one Indonesian URL set (the EN toggle is client-side, no /en/
  // URLs), so each page's only alternate is itself.
  upsertLink('alternate', canonical, 'id');
  upsertLink('alternate', canonical, 'x-default');

  // Open Graph
  upsertMeta('property', 'og:title', d.title);
  upsertMeta('property', 'og:description', d.description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:type', d.ogType ?? 'website');
  upsertMeta('property', 'og:image', ogImage);

  // Twitter
  upsertMeta('name', 'twitter:title', d.title);
  upsertMeta('name', 'twitter:description', d.description);
  upsertMeta('name', 'twitter:image', ogImage);

  // Page-scoped JSON-LD (replaces the previous page block; the static homepage
  // @graph in index.html is left untouched under its own unmarked node).
  const existing = document.getElementById(PAGE_JSONLD_ID);
  if (existing) existing.remove();
  if (d.jsonLd) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = PAGE_JSONLD_ID;
    script.textContent = JSON.stringify(d.jsonLd).replace(/</g, '\\u003c');
    document.head.appendChild(script);
  }
}
