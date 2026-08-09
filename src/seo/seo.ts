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

const HOME: SeoDescriptor = {
  title: 'SurePath | Asuransi Mobil, Jiwa & Properti Online — Klaim Cepat',
  description:
    'Beli asuransi mobil, jiwa, perjalanan & properti online di SurePath. Premi tarif OJK, klaim via foto HP dengan AI, polis aktif dalam menit. Daftar agen gratis.',
  path: '/',
  ogType: 'website',
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
      service('Asuransi Perjalanan', 'Proteksi perjalanan domestik dan internasional: darurat medis, keterlambatan penerbangan, kehilangan bagasi, dan pembatalan trip.'),
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
};

// Blog posts (/blog/:slug) — mirrors src/pages/BlogPage.tsx post list.
const BLOG_POSTS: Record<string, { title: string; description: string; date: string }> = {
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
      'Jelajahi produk asuransi SurePath: mobil (All Risk & TLO), kecelakaan diri, perjalanan, properti, dan kesehatan. Premi tarif OJK, beli online, klaim via AI.',
    keywords: 'produk asuransi, asuransi online, beli asuransi, jenis asuransi',
    jsonLd: breadcrumb([{ name: 'Beranda', path: '/' }, { name: 'Produk Asuransi', path: '/products' }]),
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

/** Resolve the SEO descriptor for a given pathname. */
export function resolveSeo(pathname: string): SeoDescriptor {
  if (pathname === '/' || pathname === '') return HOME;

  const productMatch = pathname.match(/^\/product\/(car|travel|pa|property|health)$/);
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

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
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
