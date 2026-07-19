# SurePath — Arsitektur & Strategi SEO Organik (Silo Konten)

**Status:** Phase 1 dari 10 — *Complete Website Structure*
**Terakhir diperbarui:** 2026-07-19
**Cakupan:** Technical SEO + content silo architecture untuk myinsurepath.com (marketing site publik). Untuk paid ads / social / WhatsApp funnel, lihat `docs/marketing-growth-plan.md` — dokumen ini tidak menduplikasi itu.

**Tujuan:** menjadikan SurePath sebagai otoritas topikal Google #1 di Indonesia untuk asuransi, menghasilkan leads berkualitas via organic search, memenuhi EEAT (Experience, Expertise, Authority, Trust) di setiap halaman.

---

## 0. Ringkasan Eksekutif & Temuan Kritis

Sebelum membangun 1.000+ halaman konten, ada **satu blocker teknis yang harus diperbaiki dulu** — tanpa ini, scaling konten tidak akan menghasilkan ranking:

| # | Temuan | Dampak | Prioritas |
|---|---|---|---|
| 1 | **Semua halaman berbagi satu `<title>`/meta description/canonical/OG tag** dari `index.html` — tidak ada per-route metadata. Halaman blog, produk, kalkulator, semua terindeks dengan title/description yang identik. | Google tidak bisa membedakan halaman satu sama lain di SERP; duplicate meta = salah satu penyebab utama halaman tidak terindeks/ranking rendah. | **P0 — blocker Phase 2+** |
| 2 | **Tidak ada SSR/prerendering** — SPA murni, `server.ts` prod hanya `express.static`. Crawler modern Google (Googlebot) umumnya bisa render JS, tapi AI search crawlers (GPTBot, PerplexityBot, ClaudeBot) sering **tidak** eksekusi JS, dan render budget Googlebot terbatas pada situs besar. | Konten programmatic SEO skala besar (1.000+ URL) berisiko under-indexed tanpa prerender. | **P0 — sebelum Phase 4 (programmatic SEO)** |
| 3 | Blog (`src/pages/BlogPage.tsx`) adalah **array hardcoded 7 artikel** di dalam komponen — tidak ada CMS/tabel Supabase. `sitemap.xml` statis, di-maintain manual. | Tidak scalable ke 500 blog + 100 landing page tanpa refactor arsitektur konten. | **P0 — keputusan arsitektur, lihat §15** |
| 4 | Routing **sudah bagus**: meski CLAUDE.md menyebut HashRouter, marketing site sebenarnya sudah pakai clean path URL (`/product/car`, `/blog/:slug`) via router manual di `App.tsx` (window.history.pushState). `HashRouter` dari react-router-dom di `index.tsx` adalah wrapper mati/tidak dipakai. | ✅ Tidak ada migrasi routing yang diperlukan — fondasi URL sudah SEO-friendly. | Info, bukan blocker |
| 5 | `robots.txt`, `sitemap.xml` statis, dan `llms.txt` **sudah ada** dan cukup baik sebagai starting point (§6, §7, §14). | ✅ Base sudah ada, perlu di-scale + otomasi. | — |
| 6 | JSON-LD di `index.html` sudah kaya (Organization, InsuranceAgency, WebSite, FinancialService, FAQPage, BreadcrumbList) tapi **global/statis** — sama di semua halaman, bukan per-page/per-produk. | Perlu dipecah: Organization tetap global, sisanya jadi per-route. | P1 |

**Rekomendasi urutan eksekusi:** §10 (metadata engine) → §6 (schema per-route) → §5 (sitemap generator) sebelum mulai Phase 3/4 (produksi konten massal). Detail keputusan arsitektur & pertanyaan yang perlu dijawab user ada di §15.

---

## 1. Arsitektur Situs (Silo)

SurePath punya **5 lini produk** (bukan cuma mobil seperti template generik), jadi silo-nya multi-vertikal dengan **Asuransi Mobil sebagai silo terdalam/flagship** (sesuai konten JSON-LD & blog yang sudah ada), lalu 4 vertikal lain mengikuti pola yang sama dengan kedalaman lebih ringkas.

```
Beranda (/)
│
├── Produk Asuransi (/produk)  ─── hub/silo utama, link ke 5 pilar
│   │
│   ├── 🚗 Asuransi Mobil (/asuransi-mobil)  ── SILO TERDALAM (flagship)
│   │   ├── Asuransi All Risk (/asuransi-mobil/all-risk)
│   │   │   ├── All Risk per Merek (/asuransi-mobil/all-risk/toyota, /honda, /suzuki, ...)
│   │   │   ├── All Risk per Kota (/asuransi-mobil/all-risk/jakarta, /surabaya, ...)
│   │   │   └── Simulasi Premi All Risk (/asuransi-mobil/all-risk/kalkulator)
│   │   ├── Asuransi TLO (/asuransi-mobil/tlo)
│   │   │   ├── TLO per Merek (/asuransi-mobil/tlo/toyota, ...)
│   │   │   └── Simulasi Premi TLO (/asuransi-mobil/tlo/kalkulator)
│   │   ├── Klaim Asuransi Mobil (/asuransi-mobil/klaim)
│   │   │   ├── Klaim per Jenis Kejadian (/asuransi-mobil/klaim/kecelakaan, /banjir, /pencurian, /kebakaran)
│   │   │   └── Timeline & Estimasi Klaim (/asuransi-mobil/klaim/estimasi)
│   │   ├── Premi Asuransi Mobil (/asuransi-mobil/premi)
│   │   │   ├── Premi per Zona OJK (/asuransi-mobil/premi/zona-1, /zona-2, /zona-3)
│   │   │   └── Premi per Rentang Harga (/asuransi-mobil/premi/di-bawah-200-juta, ...)
│   │   ├── Panduan Asuransi Mobil (/asuransi-mobil/panduan/:slug)
│   │   ├── Perbandingan Asuransi Mobil (/asuransi-mobil/perbandingan/:slug)
│   │   └── Kalkulator Premi Mobil (/kalkulator — tool bersama, di-link dari semua silo mobil)
│   │
│   ├── ✈️ Asuransi Perjalanan (/asuransi-perjalanan)
│   │   ├── Domestik (/asuransi-perjalanan/domestik) · Internasional (/asuransi-perjalanan/internasional)
│   │   ├── Klaim (/asuransi-perjalanan/klaim) · Premi (/asuransi-perjalanan/premi)
│   │   └── Panduan (/asuransi-perjalanan/panduan/:slug)
│   │
│   ├── 🏥 Asuransi Kesehatan (/asuransi-kesehatan)
│   │   ├── Rawat Inap · Rawat Jalan · Kesehatan Keluarga (sub-hub masing-masing)
│   │   ├── Klaim (/asuransi-kesehatan/klaim) · Premi (/asuransi-kesehatan/premi)
│   │   └── Panduan (/asuransi-kesehatan/panduan/:slug)
│   │
│   ├── 🧍 Asuransi Kecelakaan Diri / PA (/asuransi-kecelakaan-diri)
│   │   ├── Klaim · Premi · Panduan (pola sama)
│   │
│   └── 📱 Proteksi Barang (/proteksi-barang) — Gadget & Elektronik
│       ├── Kerusakan Fisik · Kerusakan Cairan · Pencurian (sub-hub)
│       ├── Klaim · Premi · Panduan (pola sama)
│
├── Blog / Edukasi (/blog) ─── silo horizontal, cross-link ke semua vertikal produk
│   └── /blog/:kategori/:slug  (kategori = mobil, perjalanan, kesehatan, pa, properti, regulasi, umum)
│
├── Glosarium (/glosarium/:istilah) ─── silo horizontal, istilah teknis asuransi
│
├── Perbandingan (/perbandingan/:slug) ─── silo horizontal (all-risk-vs-tlo, surepath-vs-X, per perusahaan asuransi)
│
├── Kalkulator & Tools (/kalkulator, /tools/:nama) ─── konversi tertinggi, link dari semua silo
│
├── Panduan Klaim (/panduan-klaim/:jenis) ─── silo horizontal lintas produk
│
├── Regulasi & OJK (/regulasi/:slug) ─── trust/authority signal, silo horizontal
│
├── Mitra Agen (/agent) · Cara Kerja (/how-it-works) · Tentang (/about) · Kontak (/contact)
│
└── Legal (/privacy, /terms, /security)
```

> **Koreksi (2026-07-19, saat eksekusi Phase 3):** vertikal ke-5 semula diasumsikan "Asuransi Properti" (rumah/ruko) mengikuti template generik. Setelah cek `src/pages/productInfoContent.ts`, produk riil di balik slug `/product/property` adalah **Proteksi Barang / Item Shield — proteksi gadget & elektronik** (HP, laptop: kerusakan fisik, cairan, pencurian, komponen internal), BUKAN asuransi rumah/properti fisik. Silo & keyword map diperbarui ke `/proteksi-barang` supaya tidak membangun halaman yang mengklaim cakupan produk yang tidak benar-benar dijual SurePath — ini murni soal akurasi/EEAT, bukan preferensi penamaan.

**Prinsip silo:** setiap child hanya link ke parent-nya, sibling-nya, dan hub horizontal (blog/glosarium/kalkulator) yang relevan — TIDAK sembarang link ke halaman tidak berkaitan. Ini menjaga "topical relevance flow" per Google's siloing best practice.

---

## 2. Struktur URL

Prinsip: **flat-readable, Bahasa Indonesia, tanpa stop-word berlebih, konsisten dengan pola `/product/:id` yang sudah ada**.

| Tipe halaman | Pola URL | Contoh |
|---|---|---|
| Hub produk | `/asuransi-{vertikal}` | `/asuransi-mobil` |
| Sub-kategori produk | `/asuransi-{vertikal}/{sub}` | `/asuransi-mobil/all-risk` |
| Programmatic (merek/kota/zona) | `/asuransi-{vertikal}/{sub}/{slug}` | `/asuransi-mobil/all-risk/toyota-avanza` |
| Blog | `/blog/{kategori}/{slug}` | `/blog/mobil/cara-klaim-asuransi-mobil` |
| Glosarium | `/glosarium/{istilah}` | `/glosarium/all-risk` |
| Perbandingan | `/perbandingan/{slug}` | `/perbandingan/asuransi-all-risk-vs-tlo` |
| Panduan klaim | `/panduan-klaim/{jenis}` | `/panduan-klaim/kecelakaan-mobil` |
| Regulasi | `/regulasi/{slug}` | `/regulasi/seojk-6-2017-tarif-premi` |
| Kalkulator | `/kalkulator` (existing) + `/kalkulator/{vertikal}` untuk kalkulator spesifik | `/kalkulator/asuransi-perjalanan` |
| FAQ | Tidak dapat halaman `/faq/:slug` terpisah — **FAQ jadi section di tiap hub/landing page** (lebih baik untuk relevance + FAQPage schema per-page) + satu `/faq` index yang mengumpulkan semuanya untuk internal linking. |

**Aturan wajib:**
- Semua lowercase, hyphen-separated, tanpa trailing slash (konsisten dengan route existing).
- Tidak ada parameter query untuk halaman yang perlu diindeks (query hanya untuk state UI, bukan konten unik).
- Slug bahasa Indonesia natural, bukan literal terjemahan (`asuransi-mobil` bukan `car-insurance`) — cocok untuk keyword lokal.
- Existing routes (`/product/car`, `/kalkulator`, `/blog`, dst.) **tidak di-rename** — jadi redirect source atau tetap alias (lihat §9 Redirect Strategy). `/asuransi-mobil` adalah silo baru yang lebih dalam; `/product/car` bisa 301 ke `/asuransi-mobil` setelah silo baru live, atau dipertahankan sebagai canonical produk generik dengan `/asuransi-mobil` sebagai top-of-funnel SEO hub yang link ke situ untuk konversi (keputusan bisnis, lihat §15).

---

## 3. Peta Internal Linking

Model **hub-and-spoke bertingkat**, setiap level maksimal 3 klik dari beranda:

```
Beranda
  → Produk Asuransi (hub) → 5 vertikal (hub L1)
       → sub-kategori (hub L2, mis. All Risk / TLO / Klaim / Premi)
            → halaman programmatic (leaf, mis. All Risk Toyota Avanza)
```

**Aturan linking:**
1. **Downward (parent→child):** setiap hub WAJIB list & link semua child langsung di bawahnya (mis. `/asuransi-mobil` link ke All Risk, TLO, Klaim, Premi, Panduan, Perbandingan).
2. **Upward (child→parent):** setiap leaf WAJIB breadcrumb + link teks kontekstual ke parent (bukan cuma breadcrumb — juga inline link "Baca juga: [Panduan Asuransi Mobil]").
3. **Sibling (child→child dalam silo sama):** boleh, mis. halaman "All Risk Toyota Avanza" link ke "TLO Toyota Avanza" (perbandingan) dan "Klaim All Risk" (next step).
4. **Cross-silo HANYA lewat hub horizontal:** halaman Mobil tidak link langsung ke halaman Perjalanan kecuali lewat `/blog` (artikel "5 asuransi yang wajib dimiliki sebelum road trip" boleh link ke keduanya) atau `/kalkulator` (tool bersama).
5. **Setiap leaf page WAJIB minimal 3 internal link:** 1 ke parent, 1 ke sibling relevan, 1 ke kalkulator/CTA konversi.
6. **Blog artikel WAJIB link ke minimal 1 landing page produk** (blog = top-of-funnel informational, landing page = commercial/transactional — ini jembatan konversi utama).
7. **Silo hub pages (`/asuransi-mobil`, dst.) di-link dari navbar/footer global** (via `SiteLayout.tsx`) supaya link equity mengalir dari setiap halaman situs.
8. **Orphan page = bug.** Setiap halaman baru yang dibuat di Phase 3/4 harus punya entry di internal linking map sebelum di-deploy — tidak ada halaman yang cuma bisa diakses lewat sitemap.

Internal linking map konkret (per silo, dengan anchor text) akan di-generate sebagai spreadsheet/CSV terpisah di Phase 3 setelah keyword map (Phase 2) selesai — supaya anchor text bisa dipetakan ke keyword cluster yang tepat, bukan digenerate sebelum tahu keyword-nya.

---

## 4. Breadcrumb

Breadcrumb visual (UI) + `BreadcrumbList` schema di setiap halaman non-beranda, mengikuti hierarki silo persis (bukan hierarki URL kalau beda):

```
Beranda › Produk Asuransi › Asuransi Mobil › All Risk › Toyota Avanza
Beranda › Blog › Mobil › Cara Klaim Asuransi Mobil
Beranda › Glosarium › All Risk
```

- Komponen breadcrumb baru: `src/pages/site/Breadcrumb.tsx` (belum ada — perlu dibuat), dipakai di semua halaman silo, generate `BreadcrumbList` JSON-LD otomatis dari array `{name, path}[]` yang sama dipakai untuk render visual — **satu source of truth**, supaya breadcrumb visual dan schema tidak pernah divergen (lihat contoh JSON-LD di `index.html:213-220`, itu polanya, tapi statis — perlu jadi fungsi generator).

---

## 5. Sitemap Strategy

`public/sitemap.xml` statis (saat ini 18 URL) **tidak akan scale** ke 1.000+ URL dan gampang basi (lihat 2 duplikat `/contact` di file saat ini — bukti maintenance manual sudah mulai berantakan).

**Rencana:**
1. **Sitemap index** (`sitemap-index.xml`) yang mereferensikan sitemap terpisah per silo, supaya masing-masing tetap <50.000 URL (jauh dari limit, tapi memudahkan maintenance & debugging index coverage per silo di GSC):
   - `sitemap-core.xml` (beranda, hub, legal, ~20 URL statis — bisa tetap manual)
   - `sitemap-mobil.xml`, `sitemap-perjalanan.xml`, `sitemap-kesehatan.xml`, `sitemap-pa.xml`, `sitemap-properti.xml`
   - `sitemap-blog.xml`, `sitemap-glosarium.xml`, `sitemap-perbandingan.xml`
2. **Generate otomatis saat build** (`vite build` prebuild step atau script `scripts/generate-sitemap.ts`), sumber data dari registry konten terpusat (lihat §15 — struktur data yang sama dipakai untuk routing, internal linking, DAN sitemap generation, supaya tidak ada 3 sumber kebenaran yang bisa desync).
3. `lastmod` diambil dari field `updatedAt` konten, bukan tanggal build (Google memakai ini untuk crawl priority).
4. `priority`/`changefreq` **tidak terlalu dipercaya Google lagi** secara resmi, tapi tetap diisi wajar (hub=0.8-0.9, leaf=0.5-0.6, legal=0.3) untuk sinyal minor + dokumentasi internal soal kepentingan halaman.
5. Submit `sitemap-index.xml` (bukan file individual) ke Google Search Console & Bing Webmaster Tools.

---

## 6. robots.txt

Base sudah cukup baik. Tambahan yang perlu untuk Phase 3/4:

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /admin/
Disallow: /agapps
Disallow: /operatorapp
Disallow: /insurerapp
Disallow: /custapp
Disallow: /b2b
Disallow: /.supabase/
Disallow: /insurer-portal
Disallow: /review/
Disallow: /payment/
Disallow: /select-app
Disallow: /*?*utm_
Disallow: /*?*sessionid

Sitemap: https://myinsurepath.com/sitemap-index.xml
```

Perubahan: (a) eksplisit blokir semua portal berautentikasi (`/agapps`, `/operatorapp`, dst — sebelumnya cuma `/admin` & `/insurer-portal`, celah kecil tapi baiknya eksplisit), (b) blokir query string tracking supaya tidak crawl-budget-waste di duplikat URL, (c) point ke sitemap index baru.

AI crawler (`GPTBot`, `Google-Extended`, `PerplexityBot`, `ClaudeBot`, dll.) **sengaja TIDAK diblokir** — training/citation dari AI search adalah bagian dari strategi AI Search Optimization (§14), konsisten dengan `llms.txt` yang sudah ada.

---

## 7. Canonical Strategy

- Setiap halaman self-canonical (`<link rel="canonical" href="https://myinsurepath.com/{path-sendiri}">`), tanpa trailing slash, tanpa query string.
- Halaman programmatic dengan variasi tipis (mis. `/asuransi-mobil/all-risk/toyota-avanza` vs `/toyota-avanza-2023`) — kalau kontennya >70% mirip, yang lebih spesifik canonical ke yang lebih general **hanya jika** halaman spesifik tidak punya cukup konten unik berdiri sendiri. Default: setiap programmatic page punya data unik (harga OJK per merek/zona berbeda secara faktual) jadi **self-canonical**, bukan canonical ke parent — ini yang membedakan programmatic SEO yang sehat dari duplicate content.
- Paginasi blog/kategori: `?page=2` dst. **self-canonical per halaman** (bukan semua canonical ke page 1) + `rel=next/prev` di sitemap tidak perlu (Google sudah deprecate itu), cukup pastikan tiap halaman listing unik URL-nya dan linked dari halaman sebelumnya.
- Halaman hasil kalkulator dengan parameter (`/kalkulator?merek=toyota`) → `noindex` + canonical ke `/kalkulator` bersih (state UI, bukan konten unik untuk diindeks).

---

## 8. Redirect Strategy

- **301 permanen** untuk semua rename URL lama→baru (mis. kalau `/product/car` di-deprecate demi `/asuransi-mobil`, TAPI lihat §15 — kemungkinan besar `/product/car` dipertahankan sebagai transactional landing terpisah, jadi tidak semua perlu redirect).
- Implementasi via `vercel.json` `redirects` array (bukan client-side redirect — 301 harus server-level supaya crawler dapat status code yang benar, bukan 200 + JS redirect).
- `/insurer-portal` sudah ada pola redirect client-side di `App.tsx:412-417` — ini **bukan** contoh yang baik untuk SEO (butuh JS eksekusi + tidak return 301), tapi acceptable karena itu halaman berautentikasi non-publik/non-indexable, bukan SEO-facing.
- Trailing slash: `vercel.json` perlu eksplisit `trailingSlash: false` supaya `/asuransi-mobil/` selalu redirect 301 ke `/asuransi-mobil` (hindari duplicate content dari 2 variasi URL).
- Redirect map didaftarkan di `docs/SEO_ARCHITECTURE.md` §8 (living list) setiap kali ada URL yang di-deprecate — jangan pernah 404 halaman yang pernah punya backlink/index tanpa redirect.

---

## 9. Metadata Strategy — **ini fix P0**

**Masalah saat ini:** title/description/canonical/OG di-hardcode di `index.html`, sama untuk semua route.

**Solusi:** komponen `<SEO>` reusable, dipasang di setiap halaman `src/pages/*.tsx` dan setiap silo landing page baru. Karena repo **tidak pakai react-router** (routing manual via `window.history`) dan **tidak pakai react-helmet**, cara paling ringan yang konsisten dengan konvensi "no new dependency kalau bisa native" adalah komponen kecil yang langsung memanipulasi `document.head` via `useEffect`:

```tsx
// src/pages/site/SEO.tsx (baru)
interface SEOProps {
  title: string;              // ≤60 char, format: "{Fokus Keyword} | SurePath"
  description: string;        // ≤155 char, mengandung CTA + keyword utama
  path: string;                // "/asuransi-mobil/all-risk" — untuk canonical + OG url
  image?: string;               // default surepath-logo.png kalau tidak diisi
  jsonLd?: object | object[];  // schema spesifik halaman (§10)
  noindex?: boolean;           // untuk halaman hasil kalkulator/state, dsb.
}
function SEO({ title, description, path, image, jsonLd, noindex }: SEOProps) {
  useEffect(() => {
    document.title = title;
    setMeta('description', description);
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:url', `https://myinsurepath.com${path}`, 'property');
    setLink('canonical', `https://myinsurepath.com${path}`);
    setMeta('robots', noindex ? 'noindex, follow' : 'index, follow, max-snippet:-1, max-image-preview:large', 'name');
    // inject/replace <script type="application/ld+json" data-page-schema>
  }, [title, description, path, image, noindex, jsonLd]);
  return null;
}
```

- `index.html`'s static tags jadi **fallback untuk beranda saja** (SEO.tsx di HomePage.tsx meng-override dengan nilai yang sama, tapi eksplisit).
- Setiap silo/landing/blog/glosarium page WAJIB pakai `<SEO>` dengan title+description unik hasil riset keyword (Phase 2) — bukan template generik yang cuma ganti nama produk (itu jadi duplicate-ish thin content, salah satu kegagalan programmatic SEO paling umum).
- Title formula per tipe halaman (draft, difinalisasi di Phase 2 dengan data keyword riil):
  - Hub: `Asuransi {Vertikal} Terpercaya — Premi Mulai Rp {X} | SurePath`
  - Programmatic: `Asuransi {Vertikal} {Sub} {Entity} — Cek Premi & Klaim | SurePath`
  - Blog: `{Judul Artikel Natural} | Blog SurePath`
  - Glosarium: `Apa itu {Istilah}? Pengertian & Contoh | Glosarium SurePath`
- **Caveat penting:** `useEffect`-based head mutation tidak membantu crawler yang tidak eksekusi JS (lihat temuan #2 di §0). Ini memperbaiki Googlebot (yang render JS) dan share-preview (WhatsApp/FB pakai OG cache crawler sendiri yang **kadang tidak render JS** — perlu ditest). Untuk AI crawler non-JS, solusinya prerendering (§0 temuan #2), bukan bagian dari fix metadata ini — dua masalah terpisah, jangan digabung.

---

## 10. Schema.org Master Plan

| Schema | Halaman | Sumber |
|---|---|---|
| `Organization` + `WebSite` | Global (tetap di `index.html`, tidak berubah) | Sudah ada |
| `InsuranceAgency` / `FinancialService` | Beranda + hub `/produk` | Sudah ada, pertahankan |
| `Product`/`Service` + `Offer` | Setiap landing page produk (`/asuransi-mobil/all-risk`, dst.) — pakai `Service` bukan `Product` fisik (asuransi = jasa), dengan `AggregateRating` **hanya jika ada review asli** dari `sp_review_tokens`/testimoni tervalidasi | Baru, per-halaman via `<SEO jsonLd={...}>` |
| `FAQPage` | Setiap landing page dengan FAQ section (§ Landing Page Template) — FAQ **spesifik halaman itu**, bukan copy-paste FAQ global | Baru, per-halaman |
| `Article` / `BlogPosting` | Setiap artikel blog — `author` (nama + kredensial jika ada penulis riil, bukan "Admin"), `datePublished`, `dateModified`, `publisher` = Organization | Baru, per-artikel |
| `DefinedTerm` | Setiap halaman glosarium | Baru |
| `BreadcrumbList` | Semua halaman non-beranda (§4) | Baru, generator bersama breadcrumb component |
| `Review` (bukan hanya `AggregateRating`) | Halaman testimoni/perbandingan **hanya dari review token asli** (`sp_review_tokens`) — **JANGAN PERNAH generate review/rating palsu**, itu Google spam policy violation serius & merusak trust EEAT yang jadi tujuan utama proyek ini | Baru, sumber data riil |
| `LocalBusiness` | Ditambahkan ke Organization schema global — SurePath tidak (belum) punya kantor cabang fisik multi-kota, jadi ini **satu LocalBusiness** (kantor Jakarta) bukan multi-lokasi. Kalau nanti ada kantor cabang riil, baru pecah per kota. | Update `index.html` Organization block, tambah `@type: ["Organization","LocalBusiness"]` |
| `HowTo` | Halaman panduan klaim step-by-step (`/panduan-klaim/:jenis`) — cocok untuk rich snippet "Cara Klaim..." | Baru |
| `SoftwareApplication` (opsional) | Halaman kalkulator, kalau ingin tool schema terpisah dari FAQPage | Opsional, evaluasi Phase 6 |

**Aturan keras:** Schema harus **match konten visible di halaman** — jangan schema FAQ yang tidak ada FAQ-nya di UI, jangan rating yang tidak ada reviewnya. Google secara aktif men-deindex/memberi manual action untuk structured data spam sejak 2024-2025 update.

---

## 11. Image SEO Strategy

- `alt` text deskriptif Bahasa Indonesia mengandung konteks + keyword natural (bukan keyword stuffing): `alt="Simulasi premi asuransi mobil All Risk Toyota Avanza 2023"` bukan `alt="asuransi mobil murah terbaik"`.
- Format: WebP dengan fallback, konsisten dengan optimasi yang sudah dikerjakan di v1.50.0 (lihat `.memory/CONTEXT.md` — logo sudah dipecah jadi versi kecil untuk nav vs OG image).
- Nama file deskriptif sebelum upload: `asuransi-mobil-all-risk-toyota-avanza.webp`, bukan `IMG_2024.webp`.
- `loading="lazy"` untuk semua image below-the-fold (konsisten dengan pattern `IntersectionObserver` yang sudah dipakai untuk hero video).
- `width`/`height` eksplisit di setiap `<img>` untuk mencegah CLS (Core Web Vitals, §13).
- Setiap landing page/blog punya **1 featured image unik** (untuk OG `image` per-halaman, bukan selalu `surepath-logo.png` generik seperti sekarang) — infrastruktur image generation/sourcing untuk 700+ halaman dibahas di Phase 3 (butuh keputusan: stock/AI-generated/ilustrasi custom, ada budget/tooling implication).

---

## 12. Page Speed Strategy

Proyek ini sudah punya progres nyata (v1.50.0, Lighthouse mobile 64→82 — lihat `.memory/CONTEXT.md`). Yang relevan untuk SEO scaling:

- **Jangan regresi:** setiap landing/blog page baru wajib lazy-load below-fold, tidak menambah render-blocking resource baru, ikuti pola `HeroVideo`/font-loading async yang sudah ada.
- **manualChunks pitfall sudah didokumentasikan** (`pdf`/`recharts` manual chunk dihapus karena menyerap shared deps ke entry utama) — kalau Phase 3/4 menambah library baru (mis. chart untuk kalkulator premi di 50 halaman kalkulator), hati-hati chunking yang sama.
- 500+ halaman baru = 500+ entry potensial di route table `App.tsx` — **harus lazy-loaded per silo** (`React.lazy`), bukan bundle monolitik, supaya halaman blog tidak menambah initial bundle size halaman kalkulator.
- SW precache (`vite.config.ts` `globIgnores`) perlu direview ulang setelah volume halaman naik drastis — jangan sampai precache blog/glosarium ratusan halaman ke semua user.

## 13. Core Web Vitals Strategy

- **LCP:** setiap landing page baru pakai pola "poster + lazy video" yang sudah terbukti (`fetchpriority="high"` pada gambar hero, video `preload="none"`). Target LCP <2.5s tetap.
- **CLS:** width/height eksplisit di semua image (§11), skeleton loader untuk kalkulator premi (sudah ada pola loading state di komponen existing), reserve space untuk FAQ accordion sebelum expand.
- **INP** (menggantikan FID sejak 2024): kalkulator premi & comparison tool interaktif — pastikan tidak ada long task >200ms saat user input; debounce kalkulasi real-time.
- Monitoring: `VITE_SENTRY_DSN` sudah dikonfigurasi (per CLAUDE.md) — pastikan Web Vitals reporting terhubung, plus GSC Core Web Vitals report sebagai sumber data lapangan (field data), bukan cuma Lighthouse lab data.

## 14. AI Search Optimization (GEO)

`public/llms.txt` **sudah ada** dan sudah bagus sebagai starting point. Yang perlu ditambah seiring Phase 3/4:

- Update `llms.txt` setiap ada silo/hub baru live — tambahkan ke bagian "Key Pages".
- Structure konten agar **mudah di-extract sebagai jawaban langsung**: setiap artikel/landing page WAJIB ada 1 paragraf ringkasan jawaban di awal (40-60 kata) sebelum elaborasi — ini yang paling sering dikutip AI Overview/ChatGPT/Perplexity.
- FAQ schema (§10) berguna ganda: rich snippet Google DAN sumber ekstraksi AI search.
- Pastikan **fakta numerik konsisten** di semua halaman (tarif OJK, rentang premi, nomor kontak) — AI search sangat sensitif terhadap kontradiksi antar halaman dalam satu domain, ini juga sinyal EEAT untuk Google.
- `security.txt`, `humans.txt` (belum ada — kecil tapi mudah, tambah di Phase 6 Technical SEO bersama polish teknis lain) menambah trust signal untuk crawler yang membaca metadata situs.
- AI crawler tidak diblokir di robots.txt (§6) — konsisten dengan strategi ini.

---

## 15. Keputusan Arsitektur — FINALIZED (2026-07-19)

1. **Model penyimpanan konten: Hybrid.** Phase 3 (100 landing page) dan awal Phase 5 (blog) dibangun **hardcoded TS/TSX** mengikuti pola existing (`BlogPage.tsx`/`productInfoContent.ts`) — tervalidasi cepat, tidak butuh migration/RLS baru, konsisten dengan konvensi "jangan bangun abstraksi sebelum terbukti perlu" di `CLAUDE.md`. Migrasi ke tabel Supabase (`sp_blog_posts`/`sp_landing_pages` + data-gateway actions + admin UI) dipicu oleh **traksi terbukti** (volume/edit frequency), bukan diasumsikan di depan — jadi ini keputusan re-evaluasi di Phase 6, bukan keputusan sekali jalan sekarang. Struktur data hardcoded (interface `Article`/dst.) tetap dirancang supaya field-nya 1:1 dengan kolom tabel yang akan dipakai kalau migrasi terjadi (id/slug/title/meta/body/updatedAt/category) — supaya migrasi nanti adalah data-copy, bukan re-modeling.
2. **Prerendering/SSR: build-time prerendering, di-scope hanya untuk public SEO content routes** (silo produk, blog, glosarium, perbandingan, panduan) — **bukan** SSR penuh atau migrasi framework. Rasional:
   - App ini adalah SPA produksi dengan 5 portal berautentikasi (`/custapp`, `/agapps`, `/operatorapp`, `/insurerapp`, `/admin`) yang punya logic auth/session kompleks (`App.tsx`) — full SSR/framework rewrite adalah proyek besar dengan risiko tinggi terhadap fungsi transaksional (login, checkout, klaim) yang jadi revenue path utama. Itu bukan trade-off yang sepadan hanya demi SEO.
   - Halaman publik SEO (silo/blog/glosarium) sebaliknya **statis secara konten** (tidak butuh session/auth) — kandidat ideal untuk prerender di build time (`vite build` step tambahan yang render tiap route publik ke HTML statis, mis. via headless Chromium yang sudah tersedia di environment build, atau plugin prerender Vite) tanpa menyentuh runtime portal sama sekali.
   - Ini juga alasan keamanan: prerender scoped-ke-publik tidak mengekspos state/data auth apa pun ke build artifact — halaman portal tetap 100% client-rendered post-auth seperti sekarang.
   - Efek samping positif: LCP membaik (konten sudah ada di initial HTML, bukan cuma di JS bundle) — selaras dengan kerja optimasi v1.50.0 yang sudah jalan.
   - Implementasi konkret dijadwalkan di **Phase 6 (Technical SEO)** setelah silo/URL Phase 3-4 stabil — prerender step butuh route list final, jadi built setelah kontennya ada, bukan sebelum.

Kedua keputusan ini mengunci fondasi Phase 2 (Keyword Map) — siap dilanjutkan begitu ada instruksi lanjut.

---

## Roadmap Phase 2-10 (referensi)

| Phase | Isi | Status |
|---|---|---|
| 1 | Complete Website Structure (dokumen ini) | ✅ Selesai |
| 2 | Keyword Map (`docs/SEO_KEYWORD_MAP.md`) | ✅ Selesai (estimasi — verifikasi ulang via Semrush/GSC saat unit tersedia) |
| 3 | Landing Pages (100) | 🔶 34 dari 100 live: semua 5 vertikal punya hub + sub-halaman Klaim & Premi, Mobil All Risk/TLO + 3 Zona OJK, Perjalanan Internasional, 3 perbandingan, glosarium (index + 10 istilah), 1 halaman FAQ konsolidasi, Panduan Klaim (index + 4 panduan darurat lintas vertikal), Regulasi (index + 1 halaman SEOJK). Sisa: lebih banyak perbandingan & glosarium, panduan klaim untuk Perjalanan. |
| 4 | Programmatic SEO (kota/provinsi/merek/model/perusahaan asuransi/dst) | Belum mulai |
| 5 | Blog Content (500 topik) | Belum mulai |
| 6 | Technical SEO polish (security.txt, humans.txt, hreflang audit, dst.) | Belum mulai |
| 7 | Conversion Optimization | Belum mulai |
| 8 | Authority Building | Belum mulai |
| 9 | Backlink Strategy | Belum mulai |
| 10 | AI Search Optimization lanjutan | Belum mulai (dasar sudah di §14) |
