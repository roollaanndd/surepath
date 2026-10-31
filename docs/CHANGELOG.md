# SurePath — Changelog

## v2.7.27 — 2026-10-31

### Icon Manager dibangun ulang — satu sistem ikon terbaru untuk semua apps & dashboard

- Roland minta Icon Manager yang lama dihapus dan dibangun ulang dengan
  ilustrasi terbaru untuk **semua** ikon di seluruh apps dan dashboard,
  bukan hanya opsi tambahan. Pemilihan gaya per-ikon (Studio/Orbit/Bold/
  Illustrative/Brand — 5 pilihan manual) dihapus total; sekarang hanya
  **satu** sistem visual otomatis: ikon dengan ilustrasi bespoke dari
  roland (`car_protection`, `travel_safe`, `personal_safety`,
  `item_shield`, `family_health`, `quotes`, `claims`/`claims_admin`,
  `commission`/`commission_ledger`/`withdraw`/`withdrawals`, `security`,
  `documents`, `vehicle_pricelist`) otomatis memakai ilustrasi "Brand"
  itu; semua ikon lain otomatis memakai set ilustratif yang sudah jadi
  default aplikasi — tidak ada lagi pilihan manual, tidak ada ikon yang
  bolong/placeholder.
- `components/shared/SurePathBrandIcon.tsx`: ditambah `hasBrandArt(id)`
  agar pemanggil bisa memeriksa apakah id punya ilustrasi bespoke sebelum
  memilih fallback.
- `components/shared/PathyNavIcon.tsx` dan `ManagedPortalIcon.tsx` (dua
  tempat yang merender ikon navigasi di keenam portal) disederhanakan:
  tidak lagi membaca peta gaya per-ikon dari CMS, cukup
  `hasBrandArt(id) ? Brand : Illustrative`. Upload ikon kustom tetap
  menang di atas keduanya seperti sebelumnya.
- `services/portalIcons.ts`: seluruh penyimpanan "styles" (CMS
  `app_icons.extra_json.styles`) dihapus — hanya peta ikon kustom yang
  tersisa. Data gaya lama di database (jika ada) diam-diam diabaikan,
  tidak di-migrasikan, tidak menyebabkan error.
- `components/admin/PortalIconManager.tsx` dibangun ulang: grid ikon
  per-id (46 ikon di 7 kategori) tanpa tombol pilih-gaya; tiap kartu
  menampilkan ilustrasi yang otomatis berlaku, badge **BRAND** untuk id
  dengan ilustrasi bespoke, **CUSTOM** untuk upload sendiri. Stat "Gaya
  visual" di header diganti "Ilustrasi brand" (jumlah id dengan art
  bespoke).
- Tidak ada perubahan pada data gateway, upload storage, atau logika
  bisnis apa pun — murni penyederhanaan lapisan presentasi ikon.
- Terverifikasi: `tsc --noEmit` bersih, ESLint bersih (file yang
  diubah), `npm run build` sukses, 459/459 unit test lolos.

## v2.7.26 — 2026-10-31

### Icon Manager — gaya "Brand" dari ilustrasi kustom roland

- Roland memberikan 20 komponen ilustrasi SVG siap pakai (brand shield,
  7 kategori produk asuransi, climate shield, STNK/KTP OCR scanner, AI
  vehicle audit, instant quote, fast claim tracker, wallet & komisi,
  verified security, plus 6 ikon per-portal Admin/Agent/Customer/
  Operator/Insurer/B2B), dipakai palet ALTITUDE yang sama
  (`#076653`/`#06231D`/`#0C342C`/`#E3EF26`/`#E2FBCE`/`#FFFDEE`/`#FF6B2C`).
  Disimpan verbatim di `components/shared/SurePathBrandIcon.tsx`.
- Icon Manager (`components/admin/PortalIconManager.tsx`) kini punya gaya
  ke-5, **"Brand"**, di samping Studio/Orbit/Bold/Illustrative. Dipilih
  per-ikon seperti gaya lain (`setPortalIconStyle`,
  `PortalIconStyleMap` di `services/portalIcons.ts` diperluas dengan
  `'brand'`).
- `SurePathBrandIcon` memetakan id Icon Manager yang cocok secara makna
  ke ilustrasi bersangkutan (`car_protection`→mobil, `travel_safe`→
  perjalanan, `personal_safety`, `item_shield`, `family_health`,
  `quotes`→instant quote, `claims`/`claims_admin`→fast claim,
  `commission`/`commission_ledger`/`withdraw`/`withdrawals`→wallet,
  `security`→verified security, `documents`→STNK/KTP OCR,
  `vehicle_pricelist`→AI vehicle audit); id lain jatuh ke ilustrasi
  shield brand generik. `PathyNavIcon` dan `ManagedPortalIcon` (dua
  tempat lain yang membaca `PortalIconStyleMap`) diperbarui agar gaya
  "Brand" juga tampil benar di navigasi portal, bukan hanya di Icon
  Manager. Enam ikon per-portal (`PORTAL_BRAND_ICONS`) diekspor untuk
  dipakai nanti di halaman pemilihan portal/app.
- Terverifikasi: `tsc --noEmit` bersih, ESLint bersih, `npm run build`
  sukses, 459/459 unit test lolos (tidak ada test baru — ikon statis +
  satu opsi gaya baru, tidak ada logika bisnis yang diubah).

## v2.7.25 — 2026-10-31

### Admin Portal 2.0 — modul Keuangan ke primitif bersama

- `PaymentsAdminView` (`components/admin/AdminViews.tsx`): filter pill +
  tombol refresh hand-rolled dimigrasikan ke `FilterBar`; tabel `<table>`
  literal dimigrasikan ke `DataTable` generik (kolom, sort per kolom,
  paginasi) — data fetch (`getAdminPayments`), mapping order/klien/produk,
  dan kalkulasi KPI (total terbayar/pending/expired) tidak disentuh.
- `WithdrawalsAdminView`: filter pill dimigrasikan ke `FilterBar`; modal
  tolak-penarikan tengah dimigrasikan ke `DetailDrawer`. Daftar kartu
  penarikan **tetap kartu** (bukan tabel literal) sesuai bentuk aslinya.
  **Tidak disentuh sama sekali**: logika tier L1/L2/L3
  (`approvalLevelForUser`, `canApprove`), alur `approveWithdrawal` →
  `triggerDisbursement` di `handleApprove`, `rejectWithdrawal` di
  `handleReject`, dan ambang Rp 10 juta / Rp 25 juta — hanya cangkang JSX
  yang dipindah, fungsi dan urutan panggilan gateway sama persis.
- `CommissionLedger.tsx`: filter tab + search hand-rolled dimigrasikan ke
  `FilterBar`. Baris komisi tetap kartu (sama seperti Withdrawals) karena
  bukan tabel literal. `payCommission`/`cancelCommission`/`payAllPending`
  dan rute `admin_update_commission` tidak disentuh.
- Terverifikasi: `tsc --noEmit` bersih, ESLint bersih (file yang diubah),
  `npm run build` sukses, `vitest run` tidak regresi dari baseline.

## v2.7.24 — 2026-10-31

### Admin Portal 2.0 — langkah 3: modul Klaim ke primitif bersama

- `ClaimsAdminView` (Klaim): toolbar status chip + tombol "Needs Review"
  diganti `FilterBar` (menambah search klien/no. klaim/lokasi yang
  sebelumnya tidak ada, mempertahankan gaya rose khusus chip "Needs
  Review" lewat slot `extra`). `ClaimDetailModal` dimigrasikan ke
  `DetailDrawer` (panel 480px, badge status di `headerExtra`). **Hanya
  cangkang tampilan yang disentuh** — status transition (review/approve/
  reject/tandai dibayar) dengan busy-state + rollback optimistik tidak
  diubah sama sekali.
- `EndorsementsAdminView` sengaja **tidak** dimigrasikan pada pass ini —
  pola confirm-modalnya kecil dan tidak cocok dengan anatomi `DetailDrawer`
  (lihat `docs/ADMIN_PORTAL_2.0_PLAN.md`).
- Terverifikasi: `tsc --noEmit` bersih, ESLint bersih, `npm run build`
  sukses, 459/459 unit test lolos (tidak ada test baru — migrasi murni
  presentasional, logika bisnis tidak berubah).

## v2.7.23 — 2026-10-31

### Ikon navigasi — set illustrative jadi default di semua portal

- Roland minta ikon navigasi di seluruh aplikasi (bukan hanya admin)
  diganti ke gaya yang lebih bagus dan illustrative. `PathyNavIcon`
  (dipakai bersama Customer/Agent/Operator/Insurer/Admin) sudah punya dua
  set ikon siap pakai — `SurePathIcon` (gaya "studio", flat+kotak rounded)
  dan `SurePathIllustrationIcon` (gaya "illustrative", lebih playful) —
  jadi diganti **default aplikasi**-nya ke `illustrative`, bukan menulis
  ulang 29+ ikon dari nol. Admin tetap bisa override per-ikon ke
  studio/orbit/bold lewat halaman Icon Manager yang sudah ada.
- `SurePathIllustrationIcon.tsx`: menambah 9 kategori ilustrasi baru
  (bank/insurer/b2b, library/catalog, review/approval, tier, icon-manager/
  palette, network/referral, renewal, chart/analytics, box/produk) yang
  sebelumnya hanya ada di set "studio" — supaya id-id itu (termasuk
  banyak menu khusus admin) tidak jatuh ke ikon generik "spark" begitu
  illustrative jadi default. Juga memperbaiki `ojk_rates` yang salah
  kena regex "rate" → ikon mobil; sekarang benar ke ikon proteksi.
- Terverifikasi: `tsc --noEmit` bersih, ESLint bersih, `npm run build`
  sukses, 459/459 unit test lolos (tidak ada test ikon sebelumnya, tidak
  ada yang baru ditambahkan — murni SVG + pemilihan kategori).

## v2.7.21 — 2026-10-31

### Admin Portal 2.0 — langkah 2: DataTable/FilterBar/DetailDrawer bersama

- `components/admin/shared/`: tiga primitif presentasi baru, generik dan
  tanpa state data sendiri (caller tetap memegang fetch & logika bisnis).
  - `FilterBar` — search + chip filter + refresh, diekstrak dari pola yang
    sebelumnya ditulis ulang per view.
  - `DetailDrawer` — panel geser 480px (anatomi sesuai
    `docs/UI_REDESIGN_2026-10.md` §4: header ringkasan, body scroll, footer
    aksi sticky, Esc + focus trap), menggantikan modal tengah penuh layar.
  - `DataTable` + `dataTable.ts` — tabel generik dengan sort & pagination;
    logika murni di `dataTable.ts` diuji 12 kasus di
    `services/__tests__/dataTable.test.ts`. **Belum dipakai view manapun**
    di PR ini — siap untuk modul Polis/Klaim, Keuangan, Mitra, Katalog,
    Platform di PR berikutnya.
- `PolicyOrdersAdmin.tsx` (Pesanan Polis + Antrean Review) dimigrasikan ke
  `FilterBar`+`DetailDrawer` sebagai bukti produksi pertama. **Hanya
  cangkang tampilan yang disentuh** — approve/reject/upload polis,
  perhitungan komisi & koin, notifikasi agen, submit ke insurer: semua
  logika di dalam modal lama dipindah apa adanya ke `children`/`footer`.
- Terverifikasi: `tsc --noEmit` bersih, ESLint bersih, `npm run build`
  sukses, **459/459 unit test lolos** (447 sebelumnya + 12 baru untuk
  `dataTable.ts`).

## v2.7.20 — 2026-10-31

### Admin Portal 2.0 — langkah 1: design tokens ALTITUDE + Dashboard reinvented

- **Audit & rencana bertahap** di `docs/ADMIN_PORTAL_2.0_PLAN.md`: 32 file,
  ~700KB, 29 view admin diaudit; keputusan dibuat untuk memperluas token
  `ds-*` yang sudah ada (bukan membuat sistem warna admin terpisah), menjaga
  IA 6-grup dari S1 (PR #328), dan tetap **light-only** (keputusan
  `design.md §4` yang sudah ada, bukan isu terbuka).
- **Token baru**: `--ds-admin-forest` (#076653), `--ds-admin-emerald`
  (#0C342C), `--ds-admin-dark-forest` (#06231D), `--ds-admin-lime`
  (#E3EF26), `--ds-admin-lime-tint` (#E2FBCE), `--ds-admin-warm-white`
  (#FFFDEE) — admin-only, kontras AA diukur di browser nyata (6.93:1 /
  13.6:1 / 16.6:1 untuk teks putih; 5.49:1 untuk teks hijau di atas lime).
- **Dashboard admin (`AdminDashboard.tsx`, dilihat role ADMIN) dirombak**:
  hero editorial (premi diterbitkan + sparkline tren 6 bulan recharts,
  bukan 4 kartu KPI identik), financial intelligence (tren premi
  interaktif + komposisi produk recharts), **Mitra Terbaik** baru (dari
  `adminStats.topAgents`, sudah dihitung backend, sebelumnya tidak dipakai
  di dashboard mana pun), **Aktivitas Terbaru** baru (feed notifikasi,
  dialirkan dari poll yang sudah ada di `AdminPortal`, bukan fetch baru).
  Seluruh data tetap dari `buildDashboardModel()` (dashboardData.ts) — tidak
  ada metrik yang dikarang.
- `components/admin/notifMeta.ts` baru: ikon+waktu-relatif notifikasi
  diekstrak dari `AdminPortal.tsx` agar panel bell header dan feed aktivitas
  dashboard memakai satu sumber kebenaran.
- `WorkspaceShell` (dipakai 7 dashboard berbasis peran) memakai gradient
  token baru di chip logo.
- Terverifikasi: `tsc --noEmit`, ESLint, `npm run build`, 447/447 unit test
  (termasuk `adminDesignFloor.test.ts` — 0 lantai sub-11px, 0 teks putih di
  permukaan terang), kontras token diukur langsung di Chromium.

## v2.7.18 — 2026-10-30

### Pendaftaran mitra tidak lagi buntu di gerbang perjanjian (dilaporkan pemilik)

- **Akar masalah.** `accept_agreement` digerbang pada `TIER_VERIFIED`
  (`supabase/functions/_shared/trust.ts`). Untuk AGENT tier itu HANYA dicapai
  lewat `verified = true`, yang disetel operator **setelah** mitra mendaftar.
  Karena `AgentAgreementGate` memblokir seluruh aplikasi sampai perjanjian
  ditandatangani, mitra baru membaca perjanjian, menekan setuju, lalu ditolak
  "Agen belum diverifikasi operator" — tanpa jalan keluar. Tanda tangan
  perjanjian adalah **prasyarat** verifikasi, bukan hak sesudahnya.
- **Perbaikan.** `accept_agreement` kini `TIER_EMAIL_OK`. Domain email sampah
  dan email yang belum dikonfirmasi tetap tertahan (keduanya tier 0), dan
  `create_policy_order`, `submit_claim`, `agent_request_withdrawal`,
  `redeem_coins`, `apply_referral` tetap `TIER_VERIFIED`. Tiga tes regresi
  mengunci perilaku ini di `services/__tests__/trust.test.ts`.
- **Mode "menunggu verifikasi" di portal Mitra** (keputusan pemilik
  REGISTRATION_VERIFICATION_PLAN §8 no. 4 — dashboard terbatas, transaksi
  terkunci): pita status di atas isi tab, layar penjelasan untuk tab **Buat**
  dan **Dompet** (dua permukaan yang aksi intinya memang ditolak server pada
  tier ini), aksi "+ Buat Penawaran" disembunyikan di tab Polis, dan penanda
  kunci pada bar navigasi — bentuk, bukan hanya warna, plus sebabnya ikut ke
  nama aksesibilitasnya. Beranda, Polis, Profil, notifikasi dan Pathy terbuka.
- **`get_my_profile` mengembalikan `trust_tier`/`trust_reasons`.** Aturan tier
  tetap hidup di satu tempat di server; klien tidak menyalinnya — menyalin masa
  tenggang akun lama akan salah mengunci mitra lama. Klien fail-**open**:
  server tetap penjaga setiap aksi berisiko.

### UI upload STNK portal Mitra disamakan dengan portal Nasabah

- `components/shared/StnkScanCard.tsx` — satu pemilik untuk kedua portal
  (`StnkCaptureCard` + `StnkOcrNotice`). Portal Mitra sebelumnya memakai tombol
  garis putus-putus setinggi satu baris hasil salinan-tangan; kini memakai kartu
  bergradien "Ambil Foto STNK · Proses Cepat dengan AI" yang sama dengan
  wizard Nasabah, beserta susunan hasil OCR yang sama (berhasil / sebagian
  dengan daftar field / tidak terbaca).
- Portal Nasabah (`car-wizard/StepVehicle`) ikut memakai komponen bersama itu,
  jadi perbaikan berikutnya mendarat di kedua portal sekaligus. Ukuran teks
  kecilnya dinaikkan ke lantai 11px yang berlaku sejak revamp (sebelumnya
  0.65rem/0.55rem ≈ 10.4px/8.8px); tombol "Simpan PDF" tetap milik layar Nasabah.
- Verifikasi: tsc bersih, ESLint 0 error, 447 tes unit lolos, build+prerender+PWA
  hijau, tangkapan layar 390px terang & gelap untuk pita/layar kunci/kartu STNK
  (0 simpul <11px pada komponen baru).

## v2.7.17 — 2026-10-30

### Admin CMS: light-first theme (design.md §4, owner-approved design-proposals/2026-10-admin-agent)

- **Admin CMS kini terang tetap.** Tanpa tema gelap, tanpa jadwal gelap
  otomatis 18:00–06:00 (#326 dipensiunkan). `components/admin/themeMode.ts`
  dihapus; shell AdminPortal memaksa light pada `<html>` selama CMS terpasang
  dan memulihkan preferensi `sp_dark_mode` portal customer/agent saat CMS
  ditutup — **tanpa pernah menulis key `sp_dark_mode` yang shared** (perilaku
  lama menimpanya tiap 5 menit lewat tick auto-dark; bug lintas-portal ikut
  tertutup).
- **Selector dark-twin admin dibedah dari `src/styles/portal-modernization.css`**
  (blok `:has(> aside)` & `:has(> main > header)` + rule/rule tunggal
  `.dark` yang admin-scoped). Verifikasi scan: **0 selector
  dark-activated admin tersisa**; rule dark global/agent/operator tetap untuk
  permukaan yang masih mendukung dark sesuai §4.
- **Kontrol tema dihapus dari UI**: tombol tema di header CMS, aksi cepat
  "Ganti tema" di command palette, kartu Pengaturan "Mode Tema CMS +
  Jadwal Gelap Otomatis", tombol sun/moon di WorkspaceShell, dan properti
  `darkMode`/`onToggleDark` di 7 workspace dashboard.
- **Uji diganti, bukan dilonggarkan**: `adminThemeMode.test.ts` yang
  menguji mesin auto-dark kini menjadi guard anti-drift light-only (modul
  tema dilarang kembali; `storeDarkMode` dilarang di AdminPortal;
  `darkMode`/`onToggleDark` dilarang di komponen admin).
- Verifikasi: tsc ✓ · eslint ✓ (0 error) · vitest 444/444 (38 file) ✓
  · check:functions ✓ · Android selaras **2.7.17 (versionCode 49)** ✓.
  Edge functions TIDAK berubah → tanpa deploy edge; render divalidasi via
  build + Playwright.

## v2.7.16 — 2026-10-30

**Batch keamanan audit 2026-10-28 (P1) + guideline root `product.md`/`design.md`
+ merge main #327–#328.** Direktif pemilik: "ok push merge and deploy"

- **Merge main dulu** (pola rilis ini): document registry (#327: actions
  `documents.ts` + whitelist `ai_score`/`ai_verdict` di orders + migration
  `20261028100000_document_registry.sql`) dan enforcement spesifikasi UI Admin
  (#328: lantai 11px, tema, kontras, komponen bersama). APP_VERSION di main
  sudah 2.7.15 → rilis ini lompat ke **2.7.16**.
- **P1-A — filter injection `.or()`:** `p.coverage_type` mentah diinterpolasi
  ke string filter `.or()` PostgREST di 3 situs `orders.ts` (gateway
  service_role). Kini disanitasi lewat primitive bersama
  `supabase/functions/_shared/sanitize.ts` (`sanitizeFilterValue`, satu
  implementasi teruji) dengan pola repo: payload kotor **ditolak 400**, bukan
  dipaksa diam-diam. Regression test parameterized:
  `services/__tests__/postgrestSanitize.test.ts`
  (anti-injection + enum legit + truncate + null-coercion).
- **P1-B — admin gate `/api/*`:** lima endpoint internal `server.ts`
  (`/api/aistudio-test`, `/api/ai-audit-log`, `/api/ai-cache-stats`,
  `/api/ai-admin/run|status`) kini wajib `SERVER_ADMIN_TOKEN` — **fail-closed**
  503 bila token tak diset, 401 bila salah (SHA-256 `timingSafeEqual`,
  `Authorization: Bearer` atau `x-admin-key`); `aistudio-test` (Gemini
  berbayar) dibatasi 10 req/menit.
- **P1-C — kamera di Vercel:** `vercel.json` Permissions-Policy
  `camera=(self)` — paritas dengan `server.ts`; capture kamera tidak lagi
  terblokir di produksi Vercel.
- **P2-3 — CSP tightening** (server.ts + vercel.json): allowance mati
  `esm.sh` / `prod.spline.design` dihapus dari `script-src`/`connect-src`;
  `news.google.com` tetap (widget Preferred Sources). `'unsafe-inline'`/eval
  dipertahankan sementara (inline boot + gtag) dengan catatan nonce.
- **P3 — payments hygienic:** simulator (`/api/payments/create` token `mok_…`)
  menjawab 404 di produksi kecuali `PAYMENT_SIMULATION_ENABLED=true`; stub
  `/api/payments/webhook` menjawab 404 korektif (callback Xendit asli =
  edge function `xendit-webhook`).
- **Guideline root:** `product.md` + `design.md` ditulis berdasarkan kode riil,
  terdaftar di `docs/DOCS_INDEX.md`; mockup approved admin/agent light-first ikut
  di-commit (`design-proposals/2026-10-admin-agent/`). Angka debt register
  di-scan ulang pasca-merge (356 sub-11px · ~1.130 hex · 19 fixed-width ·
  59 div-onClick).
- **Tooling:** `design-proposals/**` di-ignore ESLint (artefak mockup browser,
  bukan source).

**Checks:** `check:functions` ✓ · tsc 0 · ESLint 0 error / 28 warning
(baseline) · vitest **446/446** (38 file — naik dari 410 karena suite baru
#327–#328) · build + PWA ✓ · Android selaras (2.7.16, versionCode 48).
Catatan lingkungan: run vitest paralel pertama kena storm spawn worker
(fork timeout Windows/OneDrive) — run ulang serial hijau penuh; bukan
kegagalan tes.

## v2.7.15 - 2026-10-28

**Admin CMS dirapikan sesuai `docs/UI_REDESIGN_2026-10.md` (Sprint S1).**
Permintaan pemilik: perbaiki UI dashboard admin agar sesuai spesifikasi yang
sudah tertulis, dan tidak mengerjakan hal lain.

- **Lantai tipografi 11px ditegakkan.** 494 kelas `text-[10px]`/`[9px]`/`[8px]`
  dan padanan rem di 33 berkas `components/admin/` menjadi `text-2xs`. Satu
  pengecualian yang memang didokumentasikan tetap: `text-badge` (8.8px), angka
  di dalam titik hitung berukuran tetap.
- **Teks putih di permukaan terang diperbaiki.** Admin CMS dibangun gelap lalu
  dikonversi ke terang; `text-white` yang tertinggal di atas `bg-ds-card`
  (#FFFFFF) dan `bg-ds-card2` (#F3FAF6) membuat judul dan isian drawer klaim,
  drawer pengguna, hampir semua input, dan tombol "Keluar" di sidebar tidak
  terbaca sama sekali. Termasuk 33 `hover:text-white` yang membuat tombol
  menghilang saat kursor di atasnya.
- **Mode gelap admin hidup kembali.** 99 aturan `!important` di
  `portal-modernization.css` ditulis tanpa memandang tema (dua di antaranya
  mengunci `color-scheme: light`), sehingga tombol tema tidak mengubah apa pun.
  Semua aturan tersebut kini dipagari ke `:root:not(.dark)`, dengan padanan
  gelap untuk sidebar dan tinta samar.
- **Kontras WCAG AA.** Tinta samar dinaikkan (`#70877c`→`#5A7064`,
  `#748398`→`#5C6B7A`, dll.), chip rose gelap dinaikkan ke `rose-300`. Hasil
  sapuan terukur: **0 kegagalan kontras di 11 bagian × 2 tema**, juga di 390px.
- **Komponen bersama dipakai.** `workspaces/shared/KpiCard` kini adaptor tipis
  di atas `adminUI.AdminKpiCard`, jadi tujuh dashboard role memakai satu kartu
  KPI, bukan dua yang saling menyimpang. `AdminPageHeader` dipakai di Kelola
  User dan Penarikan Dana Mitra; `AdminStatusBadge` + `CLAIM_STATUS_META`
  menggantikan palet chip lokal di Antrean Klaim (pola acuan spesifikasi).
- **Bar navigasi bawah di <1024px.** Sebelumnya satu-satunya jalan berpindah di
  layar kecil adalah drawer di balik ikon hamburger. Kini empat tujuan tersibuk
  (Ringkasan, Review, Polis, Klaim) plus pintu ke menu lengkap duduk permanen,
  difilter per izin role.
- **Tes regresi** `services/__tests__/adminDesignFloor.test.ts` mengunci kedua
  lantai (sub-11px, dan putih di permukaan terang) beserta satu pemilik kartu
  KPI. Dikalibrasi dengan cacat yang sengaja ditanam.

## v2.7.14 — 2026-10-28

**Integrasi PR #241 ke main terbaru** (permintaan pemilik: "should be good
if you can make it but update to the newest deployment so there will be no
errors").

- Isi inti PR #241 (perbandingan insurer + kontrol diskon berbasis komisi)
  **sudah hidup di main** via sejarah full-portal redesign — tree pr-241
  nyaris identik dengan main. Delta tersisa hanya satu berkas:
  `VehicleUnderwritingWizard.tsx`, yang kini dibawa masuk (`ee24b55`).
- **Pagar bisnis 25%** (title PR: "Enforce 25 percent combined commission
  and discount ceiling"): rate komisi dasar dibatasi `min(0.25, …)`; diskon
  maksimum efektif `max(0, min(configured, baseComm))` — diskon nasabah
  selalu dibiayai dari komisi; premium untuk akuntansi insurer tetap utuh,
  tampilan neto nasabah dipotong jumlah yang sama; panel diskon di wizard
  memakai guardrail identik.
- **Merk insurer + data perbandingan**: kartu insurer memakai
  `InsurerLogo` / `INSURER_BRANDS` (latar merek per kode), rating ⭐5,
  manfaat utama, kelebihan/kekurangan — semua opsional dengan fallback
  ("Rating belum tersedia"), sebab kolom
  rating/benefits/advantages/disadvantages **belum ada** di
  `sp_insurer_products` (tidak ada migrasi). `SpInsurerProduct` kini
  mendeklarasikan kolom itu opsional — type-safe, akses langsung tanpa
  `p as any` (perbaikan tsc atas state awal PR).
- **Ketahanan**: gagal muat daftar produk insurer kini tertangkap `.catch`
  (kosong + log, tidak lagi spinner menggantung); deps effect menyertakan
  `vehicleType`; state muat spinner + state kosong berbahasa Indonesia yang
  menjelaskan kenapa daftar kosong (insurer aktif, kecocokan jenis/usia
  kendaraan) dan apa yang perlu diperiksa admin (menu Mitra Asuransi +
  pemetaan produk).

**Checks:** tsc 0 · ESLint 0 error · vitest **410/410** · Playwright agent
**6/6** · build+PWA ✓ · Android selaras (2.7.14, versionCode 47).

**Catatan CI (pre-existing, BUKAN dari release ini):** job CI `unit-tests`
gagal di main **sebelum** commit kita juga (`9c4f0b2`) — lokal 410/410
hijau; diduga masalah lingkungan/waktu CI. Job **Deploy Edge Functions**
gagal di step `supabase functions deploy` (secrets ADA — step guard lolos;
penyebab pasti butuh log Actions yang butuh hak admin). Push kita mengubah
`pathy-agent-proxy` (berkas baru dari merge main) → fungsi produksi bisa
jadi **belum diperbarui**. Rekomendasi: re-run "Deploy Edge Functions" di
tab Actions.

## v2.7.13 — 2026-10-28

Gabungan `main` (redesign Admin #322–#326) ke branch + perbaikan dark/night
mode yang dilaporkan pemilik: "hanya bagian tertentu yang berubah jadi hitam,
tulisan/kontras di admin tidak kelihatan".

**Merge main → branch (`702dc61`)**
- Arsitektur route-split branch dipertahankan (`src/app/routes/*`); perbaikan
  App-level dari main (union `effectiveApps`, refresh harga kendaraan CMS,
  sinkronisasi profil) ikut masuk.
- AdminPortal mengambil redesign penuh main (rail + dashboard #325 + dark
  mode otomatis #326) dan fitur branch **routing workspace per-peran**
  (`getAdminWorkspace` + 7 dashboard) ditanam kembali di atasnya — tema
  mengikuti mekanisme aman tema admin (`isDarkNow`, kunci `ADMIN_THEME_KEY`).
- `server.ts`: CSP/header keamanan produksi milik branch dipertahankan.

**Dark mode — akar masalah & perbaikan (`portal-modernization.css`)**
- *Kanvas apps tetap putih di malam*: gradien kanvas terang (:1331) dan
  kembar gelapnya tertulis `.sp-modern-app.dark` — selector MATI sebab kelas
  `dark` berada di `<html>`, bukan di div. Customer/B2B/Insurer jadi
  "sebagian hitam". Perbaikan: selector `html.dark .sp-modern-app`.
- *Admin: kartu putih + teks putih tak terlihat*: pass "redesign v2" admin
  memaksa variabel terang + `background #fff !important` TANPA guard `.dark`,
  sementara tema admin (#326) menyalakan `html.dark`. Ditambahkan **dark twin
  lengkap** untuk seluruh aturan pass v2 (canvas, header, kartu ds-*,
  `bg-white`/`bg-slate-50`, input/tabel/glass/fokus) — mengikuti nilai tokon
  `styles.css .dark`.
- *Bottom nav putih menyala di semua tema*: pertahankan pill kaca putih di
  portal terang, tambahkan twin gelap (latar `rgba(21,27,40,.93)`, label
  aktif `#4ADE80`, nonaktif `#99A0B2`).
- Temuan audit lain sudah beres lewat merge main: chip `bg-white
  text-sp-emerald` (AgentClaims/AgentEndorsements) kini tertangkap blok umum
  `.dark .sp-modern-app :where(.bg-white:…)`, SketchPngLibrary punya varian
  `dark:`, Operator punya aturan gelap sendiri.

**Checks:** tsc 0 · ESLint 0 error (33 warning lama) · vitest **410/410**
(35 file — bertambah dari merge) · Playwright **75 pass / 0 fail / 1
flaky-pass / 15 skip** · build+PWA ✓ 26 rute · `check:android` selaras
(2.7.13, versionCode 46). Audit `npm audit` pasca-merge: 4 low severity di
rantai build dev (workbox/vite-plugin-pwa via rollup) — diterima: dev-only,
tidak ter-shipped, pantau di AGENTS.md.

**Pass refinement UI/error-hardening (2026-10-28, lanjutan merge)**
- Kode mati & hook: `successCount` yang di-increment tapi tak pernah dibaca
  dihapus dari modal impor CSV (AdminViews); dep `useEffect` dipasang benar
  (ClaimsAdminView, AdminLogin OAuth-callback via ref agar tetap sekali jalan);
  `TierRequestsTab` kini menangkap error load (toast + berhenti loading) —
  sebelumnya `.then` tanpa `.catch` meninggalkan spinner abadi saat gateway
  gagal. `roleConfig.ts`: dua export tanpa pemakai (`ADMIN_WORKSPACE_ROLES`,
  `isAdminWorkspaceRole`) dihapus; `WORKSPACE_BY_ROLE` menjadi privat.
- Ikon admin nav baru (SurePathIcon): kunci artwork `review` (Antrean Review —
  sebelumnya serial `shield` sama persis dengan Klaim), `tier` & `palette`
  (menggantikan `spark` generik untuk tier_promo/portal_icons), serta
  `insurers`/`b2b` ke artwork `bank` (sebelumnya `people` — tiga section
  bersebelahan ikon identik). Matcher id-spesifik; tab id portal lain tidak
  berubah.
- Ikon insurer: kartu "Total Premi" diberi chip `Banknote` (satu-satunya kartu
  Beranda tanpa ikon).
- Transisi: momen masuk dashboard yang terkoordinasi — grid kartu KPI/banner
  admin & Beranda insurer memakai `sp-stagger-cards` (relaks berurutan 40ms,
  hormat `prefers-reduced-motion`), di atas `sp-page-enter` yang sudah ada.
- Security/pen-test statis + dinamis: `check:functions` ✓ (22 fungsi, semua
  punya sikap tertulis), `npm audit --omit=dev` 0, pola berbahaya 0 (tanpa
  `eval`, tanpa `dangerouslySetInnerHTML`, tanpa secret keras di area
  admin/insurer/src/services), semua `createObjectURL` di-`revokeObjectURL`,
  token insurer tersimpan di sessionStorage (komentar usang "localStorage"
  diperbaiki). e2e smoke lokal 5/5 tanpa overflow horizontal di 1440/390px
  dan 0 error JS aplikasi (hanya DNS gagal karena env Supabase placeholder).
- Detector Impeccable: warning "side-tab accent" (garis gradien 3px di kiri
  tiap kartu admin) dihapus; `font-family: Inter !important` yang redundan
  (sama dengan tailwind `fontFamily.sans`) dilepas. Advisory ambien grid di
  `.sp-modern-app` dipertahankan sebagai pilihan desain sengaja.



## v2.7.12 — 2026-10-28

Dua laporan pemilik: (1) jumlah tier di apps (3) ≠ dashboard admin (2);
(2) "audit foto" di pembelian asuransi mobil dilaporkan error dan tidak jalan.

**Tier apps = dashboard admin (`AgentLeaderboard.tsx`, `AgentNetwork.tsx`)**
- Root cause: keduanya membaca action yang sama (`get_tier_definitions`),
  tapi kartu ringkas **Agents** di admin sengaja menyaring tier default
  (`AdminViews.tsx` `.filter(tier => !tier.is_default)`), sedangkan
  **Syarat Tier** (Leaderboard) dan tabel **Cara Kerja** (Network) di apps
  mengulang seluruh baris aktif termasuk *Standard* — baseline, bukan tier
  yang dikejar.
- Apps kini memakai aturan yang sama: tier default disembunyikan dari
  kedua daftar → keduanya menampilkan **Mitra Bintang ⭐ + Mitra Elite 💎**
  (jumlah identik dengan admin). Deteksi tier milik mitra tetap memakai
  daftar penuh.
- Mock e2e diperbarui ke bentuk `sp_agent_tiers` asli (seed migrasi:
  STANDARD/STAR/ELITE) — dulu masih bentuk *poin* (SILVER/GOLD) lama.

**Audit foto di wizard mobil (`components/car-wizard/StepSurvey.tsx`)**
- Alur audit kini audit ulang penuh: per-foto kompres 800px ✓ · token sesi
  (bukan anon key — bug lama v2.1.0 sudah diperbaiki) ✓ · `openai/gpt-4o`
  ada di whitelist `ai-proxy` ✓ · multim-image survey tsc & build bersih ✓.
- **Sebab sesungguhnya yang ditemukan:** kegagalan apa pun tersamar jadi
  "Mohon maaf, kami sedang offline saat ini" — pemilik tak bisa tahu
  berbedanya jaringan putus / sesi habis / kuota AI harian penuh / layanan
  AI belum dikonfigurasi. Kini sebab yang dikenali dipetakan jadi pesan
  bisa-diselesaikan ("Sesi loginmu sudah berakhir — masuk lagi…",
  "Jatah analisa AI jam ini penuh — coba lagi sejam berikutnya", dll);
  kegagalan jaringan murni tetap pesan offline. Tekan teknik tetap
  tercatat di rekaman Pathy + console.
- Jika pemilik mengujinya di **dev server lokal**, catat: `.env.development`
  masih placeholder (`your-dev-project-id`) — semua panggilan AI akan gagal
  di sana; gunakan `.env.development.local` dengan URL proyek sungguhan.

**Checks:** tsc 0 · ESLint 0 error · vitest **383/383** · Playwright agent
suite **6/6** · build+PWA ✓ · `check:android` selaras (2.7.12, versionCode 45).

## v2.7.11 — 2026-10-28

Upgrade Pathy AI (permintaan owner: "upgrade pathy ai", "saya mau semuanya,
tapi tampilan lebih simple dan rapih; pastikan OCR & foto klaim jalan baik").
Semua tahap gratis (P0–P4, tanpa layanan berbayar) in one batch, plus
perbaikan pipeline foto yang ditemukan saat audit.

**Perbaikan foto/OCR (hasil audit `pathy-agent` & layanan OCR)**
- **KTP kini dipampatkan sebelum dikirim ke OCR** (`services/ktpOcr.ts`): foto
  ponsel 12 MB utuh terus masuk ai-proxy dan membuat WebView/edge permission
  sessak — kini 1400px dulu, mengikuti pola STNK 1600px. Kompresi tidak
  pernah menolak (fallback gambar asli) sehingga pembacaan tetap berjalan.
- **Jalur proxy tidak lagi membuang dokumen** (`services/website.ts`): jika
  pesan membawa hasil OCR (STNK/KTP/…), request langsung ke `pathy-agent`
  (yang punya alat) daripada `pathy-agent-proxy` yang menjalankan mode teks —
  dulu Pathy menjawab "buta konteks" walau OCR sudah berhasil.
- **Guard ukuran foto klaim** (`components/ClaimManager.tsx`): foto klaim
  kendaraan & kuitansi kesehatan >12 MB ditolak dengan pesan sebelum diunggah.
- **Kuitansi kesehatan dipampatkan 1200px sebelum dianalisa & disimpan** —
  baris klaim tidak lagi menampung data-URL resolusi penuh (bengkak & lambat).
- Baris gagal-baca kini punya tombol **"Coba lagi"** yang membuka kamera.

**P0 — Simple: 3 ketukan (`components/shared/PathyChat.tsx`)**
- **Greet card "Mau mulai dari mana?"**: mitra mendapat ketukan *Buat kutipan ·
  Tulis balasan · Cek komisi*; nasabah *Status polis · Cara bayar · Ajukan
  klaim*. Chips footer mengikuti peran yang sama (satu bahasa, satu tata rias).
- **Kutipan 3 ketukan**: produk (Mobil/Motor) → kartu foto STNK → OCR jalan →
  request harga dikirim otomatis → kartu opsi → PDF siap. Semua memakai alat
  yang sudah ada (OCR perangkat, compare_offers, build_quotation).
- **Bagikan ke WA — dua jalur** (keputusan owner): tombol **Bagikan** (Web
  Share API, sheet OS) di kartu draft follow-up + tombol **WhatsApp** (link
  wa.me teks siap-kirim) di kartu kutipan; Pathy tetap tidak pernah mengirim
  atas nama user.
- **Resume sesi**: transkrip terakhir (teks saja, per perangkat) ditawarkan
  kembali "lanjutkan percakapan terakhir?" — Lanjutkan / Mulai baru.

**P1 — Briefing pagi mitra (deterministik, tanpa AI → gratis)**
- Sekali per hari saat portal dibuka: kartu briefing dari `get_my_orders` +
  `get_leaderboard` — jumlah pipeline yang belum ditindak, peringkat bulan
  ini, dan satu CTA follow-up. Tanpa tabel uang (patuh trust rules).

**P2 — Suara (`services/speech.ts`, default MATI — keputusan owner)**
- Toggle ikon volume di kepala obrolan; saat menyala jawaban dibacakan
  (teks tetap tampil utuh, offline tidak apa-apa). `speakAnswer`/`stopSpeaking`
  memilih voice `id-ID` bila ada; gagal = bersuara diam tanpa merusak chat.
- **Mic tekan-tahan**: tahan = merekam, lepas = transkrip terkirim langsung
  (mode ketuk-lama ke draf tetap dihapus; diktasi lama ke input dipertahankan
  sebagai perilaku toggle bila tombol dilepas di perangkat yang sulit).

**P3 — Jalin relasi**
- **Sapaan perpanjangan** (nasabah, sekali per hari): polis yang jatuh tempo
  ≤14 hari mendapat kartu hangat + CTA "Siapkan penawaran perpanjangan".
- **Nada klaim diperbaiki** (`supabase/functions/pathy-agent/index.ts`):
  setiap jawaban klaim ditutup langkah berikutnya + tawaran bantuan lanjut.
- **Perayaan halus**: kartu kutipan jadi menampilkan "🎉 Kutipan jadi" dengan
  animasi pop ringan (CSS, reduksi-gerak dihormati).

**Keputusan yang berlaku**
- Suara default MATI & tidak pernah menyalakan sendiri (owner, §6 plan).
- Share memakai keduanya: sheet OS + link WA (owner, §6 plan).

**Checks:** tsc 0 error · ESLint 0 error (33 warning profil lama, tidak ada
yang baru kunci) · vitest **383/383** · Playwright **76 pass / 15 skip /
0 fail** (2 uji Pathy baru, APP_VERSION fixture 2.5.19 → 2.7.11) · build+PWA
✓ 26 rute · `check:android` selaras (2.7.11, versionCode 44).

## v2.7.10 — 2026-10-28

Batch penyempurnaan lanjutan atas v2.7.9 dari instruksi owner: warna hero
mengikuti kartu partner, ikon premium, kosakata mudah, Beranda dibersihkan,
tier mewarnai kartu, dan mode gelap Admin CMS dibereskan.

**Apps Mitra — tier mempengaruhi warna (`components/agent/AgentPartnerCard.tsx`, baru)**
- Partner Card diekstrak dari Beranda ke komponen sendiri dan kini tinggal di
  **My Profile** — Beranda jadi bersih (hero + grid, tanpa kartu uang).
- Palet warna kartu **digerakkan tier** (`resolveTierPalette`): STANDARD/tier
  awal/tidak dikenal = **grafit abu-abu metalik**; kode mengandung GOLD (atau
  EMERALD) = tampilan jade + emas saat ini (dipertahankan sebagai template);
  SILVER = perak, PLATINUM = bak platinum es, DIAMOND = navy/sian, BRONZE/
  COPPER = tembaga; tier kustom dgn warna DB sendiri memakai grafit + warna
  tier sebagai aksen (ring, glow, tinta chip). Baris `is_default` selalu
  grafit meski kodenya memuat kata kunci warna.
- **Hero band Beranda memakai gradien palet tier yang sama** (permintaan
  owner: "warna hero disesuaikan partner card"), tinta putih konstan.
- CTA "Buka dompet" di kartu memakai warna aksen tier, bukan lagi `ds-green`.

**Premium icons + bahasa (`AgentHome`)**
- Semua tile hero + grid beralih dari ikon lucide ke set duotone
  `AgentIcons` (IcQuote/IcPolicy/IcClients/IcClaims/IcRenewal/IcNetwork/
  IcRank/IcEndorse/IcWallet/IcCoin/IcProfile); tile yang dikelola
  `ManagedPortalIcon` tetap memakai ikon kustom dengan fallback duotone.
- Kosakata: 'Kutipan' → **Quotation**, 'Jaringan' → **Network**, 'Papan
  Skor' → **Leaderboard**; Klaim/Klien/Polis/Endorsemen/Renewals tidak
  berubah. Label 'Leaderboard' diberi soft-hyphen agar melipat rapi
  ("Leader-board") di grid 4 kolom 390 px (akibat `overflow-wrap: anywhere`
  global ≤640 px).
- `AgentProfile` kini menerima `onNavigate` (sebelumnya tidak di-oper oleh
  `AgentPortal` — nav Bisnis/Penghasilan di profil jadi aktif kembali).

**Admin CMS — dark mode dibereskan**
- `AdminPortal.tsx`: wrapper `SidebarContent` membawa kelas `sp-modern-app`
  ganda yang melukis gradien TERANG di atas aside gelap — penyebab
  "sebagian gelap, sebagian tetap putih" yang dilaporkan owner. Kelas
  ganda dihapus; sidebar kini mengikuti tema.
- `CommandDashboard.tsx`: tiga item "Aksi Kritis" tanpa `icon` membuat
  `<item.icon>` = element `undefined` → crash ke error boundary (dashboard
  putih kembali lebih dulu). Ikon diisi (Users/Settings/KeyRound).
- `AIAdminView.tsx`: semua permukaan terang keras → token
  (`bg-white`→`bg-ds-card`, `bg-gray-100/200`→`bg-ds-card2/ds-border`,
  chip `bg-*-100/text-*-700` → translusen `bg-*-500/10 text-*-400`,
  `bg-emerald-50`/`bg-blue-50` → tint translusen, modal & pill
  auto-apply mengikuti tema).
- `CommissionLedger.tsx`: 5× `bg-white` → `bg-ds-card`; tombol disabled
  `bg-gray-100` → `bg-ds-card2` + border; `STATUS_BADGE` translusen
  (`bg-amber-500/10 text-amber-400`, dst.).
- `AdminLogin.tsx`: tombol Google + 2 input dengan inline `#ffffff` /
  `rgba(255,255,255,.85)` kini memakai `var(--ds-card2/--ds-ink/--ds-border)`
  agar tidak menol di mode gelap.

**Checks:** tsc 0 error; ESLint 0 warning baru; vitest **383/383**;
`vite build` + PWA ✓; Playwright E2E **74 pass / 15 skipped / 0 failed**;
detector mekanis impeccable (`detect --json`): 0 failure di
`components/agent` + `components/admin`. Verifikasi visual (mock e2e,
390 px + 1366 px): hero GOLD muat palet, beranda bersih, kartu + CTA dompet
di profil, admin dashboard/AI/ledger serba gelap tanpa error console.

## v2.7.9 — 2026-10-28

Beranda Apps Mitra (`/agapps`) dirancang ulang mengikuti pola "saturated brand
hero" dari mock yang diberikan owner: band warna jenuh → avatar + 4 ikon
bulat → kartu gelap menjembatani band & sheet putih → sheet putih berisi dua
grid ikon. Diterjemahkan ke tema SurePath dan dipetakan ke fitur asli portal —
tanpa upsell palsu, tanpa layar baru.

**Layout baru (murni layout; tidak ada layar/tool/destinasi yang ditambah
atau dihapus)**
- Hero ds-green dengan `ds-on-green`: salam + nama + kode agen + emoji tier,
  lalu 4 aksi cepat bulat (Kutipan, Klaim, Jaringan, Renewals) — semuanya
  tujuan `handleTabChange` yang sudah ada.
- Kartu gelap "SurePath A◆ Partner Card" menjembatani hero dan sheet: kartu
  uang NYATA mitra (komisi berjalan, ring progres target, mikro-stat
  Penawaran/Klien/Polis, CTA "Buka dompet"), bukan paywall — SurePath tidak
  punya paywall.
- Sheet putih dengan dua grid: **Fitur Mitra** (8 tile seragam hijau:
  Kutipan/Polis/Klien/Klaim/Renewals/Jaringan/Papan Skor/Endorsemen) dan
  **Lainnya** (multicolor: Dompet amber, Komisi biru, Pathy ungu — membuka
  `PATHY_OPEN_EVENT` — dan Profil).
- Seluruh isi lama dipertahankan 1:1: banner lanjutkan draf penawaran,
  PromoBanner, GWP/konversi, pelatih AI Pathy, RenewalAlerts, daftar komisi
  terbaru. `PortalHeader` + `PortalTabBar` tidak disentuh.
- Ikon grid tetap `ManagedPortalIcon` (fallback duotone AgentIcons) sehingga
  ikon kustom yang sudah dikelola ikut tampil.

**Perbaikan harness e2e yang mengikuti redesign**
- `getByText('Dompet'|'Polis'|'Profil').first()` di e2e tersedot ke tile home
  yang sah (label barunya identik dengan label tab), sehingga uji membuka
  AgentWallet via tile → `console.error` sesi supabase mock → uji merah
  4/5 run. Klik tab sekarang dipatok ke `getByRole('navigation',
  { name: 'Navigasi utama' })` — niat uji "pindah tab via tab bar" jadi
  persis, dan home bebas punya label apa pun. Klik "Buat" ikut dipatok.
- Budget default 30 s ternyata terlalu tipis untuk dev-server dingin
  (wait portal lazy 25 s + 4 screenshot + 3×700 ms): flap `page.screenshot`
  timeout yang dialami 2× di awal sebelum mask. Test diberi `setTimeout(90 s)`.

**Checks:** tsc 0 error; ESLint 0/22 baseline; vitest 383/383;
`vite build` + PWA ✓; Playwright E2E **74 pass / 15 skipped / 0 failed**;
detector mekanis impeccable di AgentHome kosong. Verifikasi visual 390 px
dilakukan dengan mock penuh milik e2e (potret floating & fullpage).

## v2.7.8 — 2026-10-28

Pemisahan routing App.tsx ke `src/app/routes/`: satu dispatcher, modul per
peran, urutan gerbang tidak berubah sama sekali.

**Refactor routing (perilaku dipertahankan, bukan "diperbaiki")**
- Seluruh pemetaan pathname → layar pindah dari satu `if`-berantai di
  `App.tsx` (~790 → ~515 baris) ke `src/app/routes/index.tsx` (dispatcher) dan
  modul-modul `auth/admin/operator/marketing/agent/b2b/customer/public` +
  `standalone`/`insurer` yang sudah ada. Urutan lama dipertahankan APA ADANYA —
  termasuk yang tampak aneh: admin melihat CMS di pathname mana pun, B2B di
  `/operatorapp` melihat login operator, operator di `/agapps` melihat portal
  nasabah, dan recovery `?reset=1` menang atas semua tangga. Daftar
  invarian ditulis di komentar atas `src/app/routes/index.tsx`.
- `AppRouteProps` ditambahkan di `routeHelpers.ts`; `rolePath` milik App.tsx
  tetap SATU-SATUNYA otoritas routing lewat prop `resolvePortalPath`
  (`routeHelpers.rolePath` yang membaca `default_app/active_app` sengaja
  TIDAK dipasang — risiko membangkitkan bug "semua jadi nasabah" v1.57.0).
- Keputusan kecil yang dipulihkan saat split: `FinancingPage` tetap menerima
  `handleSetLang` (pengali bahasa yang persist) lewat prop opsional
  `persistLang` — halaman publik lain tetap `setLang` mentah, persis pohon lama.

**Perbaikan yang mengikuti refactor**
- `financingUnlisted.test.ts` (penjaga keputusan "rute /financing tetap hidup
  walau tak terdaftar") sekarang membaca `routes/public.tsx` + menguji wiring
  dispatcher di `routes/index.tsx` — maksudnya sama, plus 1 asersi wiring baru.
- `pathyQuotationPdf.test.ts`: uji PDF diberi takaran 20 dtk untuk uji
  "menghasilkan PDF dari slip" (berjalan ~7 dtk saat 30 berkas uji paralel;
  batas 5 dtk terlampaui secara alami karena beban mesin, bukan regresi).
- `scripts/generate-sitemap.mjs`, `scripts/prerender.mjs`,
  `scripts/check-prerender.mjs`: bungkus `pathToFileURL()` untuk `await
  import()` berabsolut-jalur — Windows (Node ≥ 11) menolak penunjuk `c:\…`
  telanjang (`ERR_UNSUPPORTED_ESM_URL_SCHEME`); POSIX-aman juga.

**Pemeriksaan FUNGSI pada rilis ini**
- `npm run lint` → edge gate ✓, tsc 0 error, ESLint **0 error / 33 warning**
  (dasar tidak berubah; tidak ada warning baru), vitest **383/383**.
- `npm run build` → sitemap 26 URL, vite 3835 modul, prerender 26 rute +
  fallback, PWA check ✓, dist bersih 155 berkas.
- Playwright E2E (dev server lokal): **74 pas / 15 dilewati / 0 gagal**.
- `npm audit`: **15 temuan (0 critical)** — semua pra-eksisting di pohon
  dev/build (transitif `@capacitor/cli → xcode → uuid`, dll.); pohon
  dependensi tidak berubah pada rilis ini (diff package-lock hanya versi).
  Triase: tidak ada jalur di runtime produk; diperlakukan terpisah dari
  refactor ini.

**Artefak mati dan rencana registrasi**
- `App.tsx.bak` (cadangan dari refactor sebelumnya) dan `temp_mig.txt` (tersesat
  saat komit 654c401) dihapus dari repo — riwayat git mengawetkan keduanya,
  tidak ada yang hilang.
- `docs/REGISTRATION_VERIFICATION_PLAN.md` — riset + rencana mekanisme daftar
  yang benar dan verifikasi gratis (Fonnte dulu; email cukup untuk Nasabah; B2B
  ke formulir unjuk diri; dashboard terbatas sambil menunggu Approval admin).
  Tidak ada kode implementasi dalam rilis ini; jadwal Tahap 0 mengikuti.

## v2.7.7 — 2026-10-24

Kelola akun mitra dari CMS admin: tambah manual, dorong setel ulang kata sandi,
dan kata sandi sementara untuk mitra yang terkunci.

**Tambah mitra manual**
- `admin_register_agent` yang lama HANYA menulis baris `sp_users`, tanpa
  pengguna auth. Mitranya muncul di daftar CMS dan tidak pernah bisa masuk —
  tidak ada kredensial untuk dipakai. `admin_create_mitra` membuat keduanya
  dalam urutan yang sama dengan pendaftaran sendiri: pengguna auth dulu, lalu
  profil dengan id yang sama. Kalau penulisan profil gagal, pengguna auth-nya
  dihapus kembali; tanpa itu mitranya bisa masuk tanpa baris `sp_users` dan
  `ensure_profile` akan membuatkannya sebagai CUSTOMER.
- Nilai bawaannya persis cabang AGENT di `ensure_profile` (komisi 10%, target
  Rp 50 juta, trust 80, `verified: false`), jadi mitra buatan admin tidak
  berbeda dari mitra yang mendaftar sendiri. Kode upline opsional dicocokkan ke
  `agent_code`/`referral_code` dengan nilai yang dibersihkan lebih dulu.

**Dorong setel ulang kata sandi**
- `admin_send_mitra_reset` memanggil `POST /auth/v1/recover` dengan
  `redirect_to=…?reset=1`, parameter yang sudah dibaca `AuthGate` untuk tetap
  di formulir setel ulang. MASTER_ADMIN juga menerima tautannya sebagai
  cadangan bila email tidak sampai.

**"Lihat kata sandi" → "setel kata sandi sementara"**
- Permintaan aslinya adalah melihat kata sandi mitra. Itu tidak bisa dipenuhi:
  Supabase Auth menyimpan bcrypt hash, dan tidak ada jalan dari hash ke teks
  aslinya. Satu-satunya cara adalah menyimpan salinan teks terang setiap kata
  sandi, yang menjadikan satu kebocoran basis data sebagai kebocoran seluruh
  kredensial mitra — tepat kebiasaan yang audit 2026-10-23 habis dibersihkan.
- `admin_set_mitra_temp_password` (MASTER_ADMIN) menyetel kata sandi sementara
  yang ditampilkan **sekali** lalu hilang, dan secara bawaan memaksa mitra
  menggantinya saat login berikutnya lewat `user_metadata.must_change_password`.
  Secara operasional setara dengan permintaan aslinya, tanpa menyimpan satu pun
  kata sandi yang bisa dibaca.
- `AuthGate` memasang paksaan ganti itu di `resolveAndLogin`, satu titik yang
  dilewati login kata sandi, OTP, dan sesi yang dipulihkan. Benderanya
  dibersihkan dalam panggilan `updateUser` yang sama dengan penyimpanan sandi
  baru; kalau dipisah, kegagalan di antaranya meninggalkan akun yang sandinya
  sudah baru tapi tetap terkunci di formulir itu.

**Otorisasi**
- Ketiganya digerbang per-kapabilitas (`CAN_MANAGE_MITRA_ACCOUNT`,
  `CAN_SET_MITRA_PASSWORD`), BUKAN `caller.isAdmin`. `ADMIN_ROLES` memuat
  `OPERATOR`, `FINANCE*`, dan `INSURANCE_ADMIN`; audit 2026-10-23 menemukan
  empat aksi uang yang bocor justru karena digerbang `isAdmin`, dan kredensial
  mitra tidak boleh jadi yang kelima. Dua aksi kata sandi juga menolak target
  yang bukan `AGENT` — tanpa itu layar Manajemen Mitra menjadi alat
  pengambilalihan akun admin lain. `services/__tests__/mitraAccounts.test.ts`
  memaku ketiganya, termasuk bahwa tidak ada baris yang ditulis memuat kata
  sandinya.

**Perbaikan yang ikut ketemu**
- Peran admin di `AgentManagementView` dibaca dari `sessionStorage` saja,
  padahal `App.tsx` menulis sesi ke `localStorage` dan hanya MEMBACA
  `sessionStorage` sebagai cadangan. Perannya karena itu selalu string kosong,
  sehingga pemilih tier di layar Manajemen Mitra tidak pernah muncul untuk
  siapa pun — kegagalan yang diam, karena UI-nya cuma tidak ada. Urutan
  pembacaannya sekarang sama dengan `App.tsx`.
- Tipe balikan `callGateway` dibuat terbuka (`GatewayResponse`). Ia
  mengembalikan badan respons utuh, jadi mendaftar empat kunci saja membuat
  `tsc` menolak pembacaan kunci yang memang dikirim server.

**Keacakan kode identitas (CodeQL js/insecure-randomness)**
- Kode mitra (`SP-AGT-####`), kode pelanggan (`SP-#####`), dan nomor rujukan
  T&C dibangkitkan dengan `Math.random()` di tiga tempat terpisah. Itu bukan
  label tampilan: kode mitra dipakai sebagai **kode rujukan upline**, dicocokkan
  ke `agent_code`/`referral_code` di `admin_create_mitra` dan `apply_referral`,
  jadi siapa pun yang bisa menduga kode mitra orang lain bisa menautkan dirinya
  ke upline itu. `Math.random()` di V8 adalah xorshift128+ dengan state yang
  bisa direkonstruksi dari beberapa keluaran.
- Ketiganya dipindahkan ke satu `_shared/codes.ts` yang memakai
  `crypto.getRandomValues`. Bentuk kodenya tidak berubah, jadi data yang sudah
  ada tetap cocok. `send-otp` sudah memakai crypto untuk alasan yang sama; ini
  menyusulkan sisanya.

**Deploy**
- `data-gateway` **harus di-deploy** agar ketiga aksi ini hidup; kode di `main`
  saja tidak mengubah produksi.

## v2.7.6 — 2026-10-24

Mode gelap: lima portal masih mengurusnya sendiri, dan B2B justru mematikannya.

**Temuan**

v2.6.10 memindahkan mode gelap ke satu modul, `components/shared/theme.ts`, dengan
aturan: jangan pernah baca/tulis `sp_dark_mode` langsung — pakai `useDarkMode`.
Lima pemilik terlewat: `OperatorPortal`, `AgentPortal`, `InsurerPortal`,
`InsurerProfile`, dan `B2BPortal`.

B2B yang terburuk. Ia memakai `useState(false)`, jadi membuka portal Mitra bukan
hanya mengabaikan preferensi yang tersimpan — efeknya **menghapus** class `dark`
dari dokumen, sehingga mode gelap yang dipilih di portal lain ikut mati.

**Perbaikan**

- Kelima portal kini memakai `useDarkMode()` dari `shared/theme.ts`; effect
  buatan sendiri dihapus.
- `InsurerProfile` dan `OperatorProfile` menerima `darkMode` + `onToggleDark`
  sebagai prop dari portalnya, bukan memanggil `useDarkMode()` sendiri. Dua
  instance `useDarkMode()` dalam satu pohon menyimpan state React terpisah di
  atas storage yang sama, jadi ikon bulan di header berbohong setelah tombol di
  Profil ditekan.

**Label emas di kartu komisi Mitra**

Label `KOMISI BULAN INI` memakai kuning 75% buram lewat inline style. Gradien
kartunya ternyata dihitung lebih terang daripada sumbernya (`#087A58` di ujung
terang), jadi kuning penuh pun hanya 4,09:1. Token baru `--ds-amber-on-dark`
(`#FEF08A`, 4,64:1) melengkapi tiga serangkai amber, sejajar dengan
`--ds-primary-on-dark` untuk hijau.

**Catatan alat ukur**

Harness kontras sempat melaporkan empat kegagalan palsu di tile beranda Mitra.
Chrome kini menyajikan sebagian latar sebagai `color(srgb 0.99 0.99 0.99)` —
komponen 0..1, bukan 0..255 — sehingga tombol yang nyaris putih terbaca nyaris
hitam. Harness kini menskalakan sintaks itu, dan setiap kegagalan yang
dilaporkan ikut menyebut elemen mana yang memberi latarnya.

**Layar interior B2B, diukur untuk pertama kalinya**

Setiap sweep sebelumnya berhenti di tab Beranda, persis jebakan yang sama
seperti portal Insurer. Begitu Ajuan, Tawaran, Buat dan Profil benar-benar
dirender, isinya:

- **24 label di bawah lantai 11px** (Ajuan 15, Tawaran 9) — tab filter dan
  semua badge status. Kini `text-2xs`.
- **Tab filter menampilkan enum mentah berbahasa Inggris** (`SUBMITTED`,
  `REVIEWING`, `QUOTED`, `PENDING`) padahal badge di kartunya sudah memakai
  label Indonesia dari tabel yang sama. Kini keduanya memakai `STATUS_LABEL`.
- **Putih di atas hijau** pada tab aktif, tombol Terima, pemilih produk dan
  avatar Profil — luput dari seluruh sweep kontras, yang tidak pernah membuka
  layar ini. Kini `text-ds-on-green`.
- **`Deductible 1500000`** — `coverage_details` adalah JSON bebas, dan layar
  ini mencetak kuncinya apa adanya dan nilainya lewat `String()`. Kunci yang
  dikenal kini punya label Indonesia, dan nilai rupiah diformat:
  "Risiko sendiri — Rp 1.500.000".
- **Avatar Profil kosong.** `profile?.company_name ?? client?.company_name ??
  'B2B'` — `??` tidak jatuh ke cadangan untuk string kosong, dan klien yang
  belum mengisi nama perusahaan menyimpan `''`. Jadi cadangan `'B2B'` tidak
  pernah terpakai dan kotak hijaunya kosong.
- Sisa class slate mentah tanpa varian gelap dipindah ke token.

**Verifikasi**

Diukur ulang di keenam portal, dua tema: B2B kini benar-benar gelap
(`bodyBg` gelap), dan kontras **0 kegagalan** di keenamnya. Kelima layar
interior B2B: sub-11px **0**, slate mentah **0**, di terang maupun gelap.


## v2.7.5 — 2026-10-24

Kontras warna: hijau brand dipakai sebagai teks, dan itu tidak terbaca.

**Temuan**
- Saya ukur rasio kontras setiap simpul teks di keenam portal, mode terang dan
  gelap, terhadap latar belakangnya sendiri. Mode gelap pada dasarnya bersih.
  Mode terang tidak: hijau brand `#00C16A` sebagai **teks** hanya 2,18:1 di
  latar halaman dan 2,38:1 di kartu, jauh di bawah minimum WCAG AA 4,5.
  Itu muncul di label nav aktif, "Lihat semua", kata "Path" pada logo, dan
  kode pengguna (SP-AGT, SP-OP, Klien B2B) — di semua portal.
- Berkas ini sudah pernah menaikkan `--ds-text-muted` "for WCAG AA", jadi
  standarnya memang sudah dipakai; hijau brand-nya saja yang terlewat.

**Pemisahan warna isian dan warna teks**
- `--ds-primary-text` baru (`#047857` terang, `#00E07A` gelap) hanya dipakai
  oleh utilitas `text-ds-green`, lewat `textColor` di konfigurasi Tailwind.
  Semua `bg-`, `border-`, `ring-`, `from-` tetap memakai `--ds-primary` yang
  lama, jadi **warna brand tidak berubah sedikit pun**.
- Amber mendapat perlakuan yang sama (`--ds-warning-text`, `#B45309`): pil
  "PAID" tadinya 1,93:1.
- Token saja tidak cukup — hanya 206 tempat memakainya, sementara 170 tempat
  di portal memakai `text-emerald-500/600` mentah yang sama sekali tidak lewat
  token (plus 55 amber dan 9 slate/green di B2B, yang memang belum pernah
  ditokenisasi). Semuanya dipindahkan. Varian `dark:` dibiarkan utuh.
- `--ds-text-muted` dinaikkan dari `#6B7280` ke `#616875`. Yang lama tepat
  4,50 di latar halaman, artinya **gagal** begitu kartunya bertint (rose-50,
  amber-50) — "Klaim Pending" terukur 4,4.

**Satu bug mode gelap yang hanya terlihat setelah diukur**
- `.dark .bg-white { background-color: #0F1829 !important }` adalah aturan
  selimut untuk kartu yang latarnya di-hardcode. Tapi tombol CTA di
  `FeaturedCard` memang sengaja pil putih di atas gradien warna: di mode gelap
  pil-nya berubah gelap sementara labelnya tetap `#003B2F`. Hasilnya 1,41:1 —
  tombol yang benar-benar tidak terbaca. Karena aturannya `!important`,
  utilitas `dark:` tidak bisa menang, jadi sekarang ada kelas `sp-keep-white`
  sebagai jalan keluar yang diberi nama.

**Permukaan yang gelap di kedua tema butuh tokennya sendiri**
- Kartu Pathy latarnya `linear-gradient(135deg, #003B2F, #00512E)` — gelap di
  mode terang maupun gelap. Saat teks hijaunya saya pindahkan ke token teks
  (yang digelapkan untuk latar terang), hasilnya **1,73:1**, lebih buruk dari
  sebelumnya. Pengukuran ulang langsung menangkapnya. Permukaan seperti ini
  tidak ikut berganti tema, jadi sekarang ada `--ds-primary-on-dark`
  (`#00E07A`, 5,39:1 di sisi tergelap kartu itu).
- Tiga `style={{ color: '#00C16A' }}` inline di `cards.tsx` melewati token
  sepenuhnya dan tertinggal di 3,99:1; sekarang memakai kelas. Hex yang tersisa
  di berkas itu adalah fill untuk gambar SVG, dan memang seharusnya begitu.
- Gradien `FeaturedCard` dimulai dari `#4D7CFE`, di mana teks putih hanya
  3,73:1. Digelapkan ke `#3B62D9` (5,34:1), hue-nya tetap biru.

**Teks putih di atas hijau: pasangan yang memang salah sejak awal**
- Sisa kegagalan terakhir semuanya satu sebab: teks putih di atas isian hijau
  (2,38:1). Pilihan yang jelas tampak cuma dua — gelapkan hijau brand, atau
  biarkan. Ternyata ada jalan ketiga yang lebih baik: **luminansi relatif
  `#00C16A` adalah 0,392**, artinya hijau itu sebenarnya warna *terang*. Teks
  putih di atasnya memang tidak pernah cocok. Emerald gelap milik brand sendiri
  (`#003B2F`) di atasnya memberi **5,30:1**, dan 7,17:1 di atas hijau mode
  gelap yang lebih terang.
- Jadi token `--ds-on-primary` dipakai untuk label yang duduk di atas isian
  hijau: varian `primary` pada primitif `Button`, 60 pasangan
  `bg-ds-green` + `text-white`, dan CTA B2B yang meng-hardcode keduanya.
  **Warna hijau brand sama sekali tidak berubah** — hanya labelnya.
- Avatar di header tidak bisa ikut cara itu: gradiennya `#00C16A → #047857`,
  dan tidak ada satu warna teks yang lolos di kedua ujungnya. Gradiennya
  dipindah ke pasangan emerald brand (`#047857 → #003B2F`) dengan teks putih.

**Hasil terukur (enam portal, dua tema)**
- Mode terang **70 → 0**. Mode gelap **25 → 0**.

**Catatan untuk berikutnya**
- B2B adalah satu-satunya portal yang **tidak punya mode gelap sama sekali**:
  latarnya tetap `#F4F7FB` walau tema gelap aktif. Konsisten dengan sisa
  penyimpangannya (belum pernah ditokenisasi, chrome-nya hasil salin tangan).

**Catatan: dua item backlog ternyata bukan cacat**
- "826 `<button>` mentah" adalah hitungan grep, bukan masalah yang dirasakan
  pengguna: diukur di enam portal plus kelima layar interior Insurer, **tidak
  ada satu pun kontrol di bawah 44px** dan tidak ada tombol ikon tanpa
  `aria-label`. Mengonversinya ke primitif `Button` tidak akan memperbaiki apa
  pun yang bisa dilihat pengguna.
- Overflow horizontal di `/ai` (dulu 470px pada viewport 390px) sudah tidak
  terjadi lagi; kesembilan halaman publik bersih.


## v2.7.4 — 2026-10-24

**Gelombang 0 integrasi: tiga titik di mana data hilang permanen begitu transaksi nyata pertama terjadi.**

Dari audit korelasi data antar portal (apps ↔ dashboard ↔ insurer). Ketiganya
dipilih lebih dulu bukan karena paling besar, tapi karena kerugiannya tidak bisa
dipulihkan: begitu ada satu pembayaran atau satu klaim sungguhan, datanya sudah
salah dan harus direkonsiliasi tangan.

- **`xendit-webhook` sekarang menulis `sp_commissions` saat mengkredit dompet.**
  Sebelumnya `credit_agent_wallet()` memindahkan uangnya, tapi tak ada satu pun
  baris masuk ke `sp_commissions` — padahal itulah tabel yang dibaca halaman
  Komisi agen, `admin_financial_reports`, `admin_stats`, dan
  `admin_transaksi_overview`. Satu-satunya penulisnya adalah
  `admin_create_commission`, yakni tangan admin. Akibatnya dua buku yang tak
  mungkin cocok: saldo dompet agen bertambah sementara laporan laba-rugi mencatat
  beban komisi Rp 0. Di produksi `sp_commissions` berisi 13 baris dan **13-nya
  `order_id` NULL** — tak satu pun tertaut order nyata. Tidak perlu penjaga replay
  tambahan: update `sp_payments` di atasnya sudah mengklaim baris dengan
  `.neq('status','PAID')`, jadi hanya satu callback yang sampai ke blok ini.
- **`submit_claim` mencocokkan `policy_number`, bukan hanya `order_number`.**
  Yang dipegang nasabah adalah nomor polis di PDF insurer
  (`sp_policy_orders.policy_number`, ditulis `insurer_upload_policy`), sementara
  `order_number` adalah nomor internal. Klaim yang diajukan dengan nomor polis
  asli tidak menemukan apa pun, lalu tersimpan tanpa `policy_id` dan tanpa
  `agent_id` — yatim: tak muncul di daftar agen, tak bisa dirutekan ke insurer.
  Referensinya disaring ke `[A-Za-z0-9._/-]` sebelum masuk string `.or()`, karena
  filter `.or()` diparse PostgREST dan bukan di-bind sebagai parameter: satu koma
  di nilainya akan menulis ulang predikatnya, bukan dicocokkan olehnya.
- **`sp_claims.insurer_id` ditambahkan, dan `submit_claim` mengisinya.** Action
  itu sudah mengambil `insurer_id` dari order yang ditaut sejak v1.42.0 tapi tak
  pernah menuliskannya ke mana pun — kolomnya tidak ada. Jadi portal insurer tidak
  punya apa pun untuk memfilter, yang sebabnya tab "Klaim" di sana sampai sekarang
  menampilkan daftar **order**, bukan klaim (diakui sendiri di komentar
  `InsurerClaims.tsx:30`). Nilainya diturunkan server-side dari ordernya, tidak
  pernah diterima dari klien — aturan yang sama dengan `agent_id`/`client_id`.
- 6 tes baru di `services/__tests__/claimPolicyLink.test.ts` memaku ketiga
  perilaku penautan itu, termasuk bahwa referensi tidak bisa menulis ulang filter
  dan bahwa `insurer_id` tidak pernah diambil dari payload.

**Urutan rilis — penting.** Migrasi `20261023120000_claims_insurer_id.sql` bersifat aditif dan nullable. Kode menulis `insurer_id` melalui update terpisah setelah klaim tersimpan, sehingga kegagalan update tidak menggagalkan pengajuan klaim. Apply migrasi dan deploy `data-gateway`/`xendit-webhook` sebagai langkah backend tersendiri; keduanya **tidak** ikut auto-deploy Vercel.

**Gelombang 1: nasabah akhirnya melihat polis yang dibelinya.**

- **`client_id` diisi saat agen membuat order.** Sebelumnya kolom itu hanya
  terisi kalau nasabah memesan sendiri; order yang dijual agen menyimpan
  nasabahnya sebagai teks (`client_name`, `client_email`) dan `client_id`-nya
  NULL selamanya — 5 dari 5 order di produksi. Karena `get_my_orders`,
  `get_my_payments`, `cancel_my_order` dan pemeriksaan kepemilikan di
  `submit_claim` semuanya bersandar pada `client_id`, nasabah tidak melihat
  polisnya di `/custapp`, tidak melihat pembayarannya, dan ditolak 403 saat
  mengklaim polis yang memang miliknya.
- **Aturan pencocokannya ada di satu berkas, `clientLink.ts`, beserta
  alasannya.** `client_id` menentukan siapa yang boleh melihat *dan* mengklaim
  sebuah polis, jadi satu pencocokan yang salah berarti polis seseorang terbaca
  oleh orang lain. Aturannya dibuat salah ke arah "tidak menautkan": lewat email
  saja, harus tepat satu baris yang cocok, email baris itu harus sama persis
  setelah di-lowercase (bukan sekadar cocok menurut pola), perannya harus
  CUSTOMER, dan agen tidak pernah ditautkan ke ordernya sendiri. **Nomor telepon
  sengaja tidak dipakai**: satu nomor sering dipakai bergantian dalam satu
  keluarga, ditulis dalam tiga format (`08xx`/`+628xx`/`628xx`), dan agen kadang
  mengisi nomornya sendiri supaya OTP masuk ke dirinya. Wildcard LIKE di-escape
  sebelum masuk `.ilike()` dan hasilnya dibandingkan ulang sebagai string, karena
  `client_email` datang dari payload klien: tanpa itu `%@gmail.com` akan
  mencocokkan nasabah mana pun.
- **`ensure_profile` menautkan order yang dijual sebelum nasabahnya punya akun.**
  Emailnya dari sesi terverifikasi, bukan params, dan hanya order yang `client_id`-nya
  masih NULL yang disentuh. Ini satu-satunya tempat yang menulis `client_id` ke
  order yang sudah ada — tidak ada backfill massal.
- **Keputusan insurer dan polis terbit sekarang juga memberi kabar ke nasabah.**
  `sp_notifications` punya satu kolom pemilik dan selama ini hanya `order.agent_id`
  yang diisi, jadi nasabah tidak pernah tahu polisnya sudah terbit. Type-nya
  dirapikan: keputusan order jadi `ORDER_UPDATE` (dulu `CLAIM_UPDATE`, hal yang
  sama sekali lain) dan penerbitan jadi `POLICY_ISSUED` (dulu `SYSTEM`). Union di
  `services/dbTypes.ts` dan peta ikon `NotificationDrawer` menyusul: ketiga type
  itu sudah ditulis server tapi tidak ada di keduanya, sehingga tampil sebagai
  ikon "info" generik.
- 20 tes baru di `services/__tests__/clientLink.test.ts`, sebagian besar memaku
  apa yang **tidak** boleh menghasilkan penautan: nol baris, dua baris yang
  berbagi alamat, email yang tidak sama persis, peran bukan CUSTOMER, agen atas
  ordernya sendiri, dan serangan wildcard utuh dari ujung ke ujung.

`android/app/build.gradle` ikut dikoreksi: `versionName` tertinggal di 2.6.17
saat app sudah 2.6.18, persis masalah yang diperingatkan komentar di berkas itu
sendiri. Sekarang 2.7.1 dengan `versionCode` 35.

`zod` dinaikkan ke 4.6.7 (GHSA-mrhx-c7xc-m3w5, high: habisnya memori saat
memvalidasi koleksi terbatas yang kelewat besar). Bukan temuan dari pekerjaan
ini: `zod` dependensi transitif `openai`, advisory-nya baru terbit hari ini, dan
check "Runtime dependency audit" merah juga di main. `npm update zod` dipakai
alih-alih `npm audit fix` supaya yang berubah hanya `zod`; `package.json` tidak
disentuh.

## v2.7.2 — 2026-10-24

Ikon navigasi kembar, dan sisa terakhir teks di bawah 11px.

**Ikon kembar — keputusan yang diserahkan ke saya**
- Tiga tab B2B ("Buat", "Ajuan", "Tawaran") menggambar ikon yang sama persis,
  begitu juga "Agen" dan "Profil" di Operator. Penyebabnya `fallback` di
  `ManagedPortalIcon` hanya dipakai saat `id` kosong, padahal semua pemanggil
  mengirim `id` — jadi ikon yang dideklarasikan tiap tab tidak pernah terpakai,
  dan `SurePathIcon` menebak lewat regex yang memetakan `new`, `submissions`,
  dan `quotes` ke satu gambar.
- Membetulkan `!id` jadi `!src` memang "bug"-nya, tapi itu akan mengganti
  seluruh ikon ilustrasi SurePath dengan ikon garis biasa di keenam portal —
  penurunan kualitas visual, bukan perbaikan. Regex-nya juga tidak bisa
  dirapikan begitu saja, karena `id` yang sama berarti hal berbeda di tiap
  portal: `quotes` berarti "buat" di nav Mitra, tapi "penawaran masuk" di B2B.
- Jadi sekarang tiap portal menyebut sendiri ikon yang dimaksudnya, lewat
  prop `glyph` baru. `id` tidak berubah, jadi ikon kustom yang diunggah admin
  tetap aman, dan gaya ikon portal lain tidak tersentuh.
- Nilainya diketik (`SurePathGlyph`). Sempat terjadi: saya mengirim `'money'`,
  yang merupakan nama kunci internal, bukan kata yang dicocokkan regex — ikon
  "Tawaran" diam-diam jadi bintang. Hitungannya tetap "0 masalah"; ketahuan
  karena layarnya dilihat. Tipe itu sekarang mencegahnya.

**Teks di bawah 11px — tuntas**
- Nasabah 14 → 0, Admin 5 → 1, Insurer 3 → 0.
- Satu sisa di Admin adalah huruf awal pada avatar berukuran tetap, yaitu
  pengecualian `text-badge` yang memang disepakati.
- Primitif kartu bersama (`SectionLabel`, `ActionGrid`, eyebrow) ikut naik,
  jadi keenam portal diperiksa ulang setelahnya.

**Koreksi**
- Di v2.6.20 saya menulis bahwa `break-words` memperbaiki "perpanjangan" yang
  terpotong jadi "perpanjang/an". **Itu tidak benar.** Diukur di browser:
  dalam kotak 71px pada 11px, `anywhere` dan `break-word` berperilaku sama
  persis — keduanya memotong di tengah kata. Hanya `normal` yang menjaga kata
  tetap utuh. Sekarang memakai `[overflow-wrap:normal]`, dan teks cadangannya
  dipendekkan jadi "belum ada" supaya muat.

**Layar interior Insurer — pertama kali benar-benar diukur**
- Lima layar di balik nav Insurer (Polis, Klaim, Bayar, Profil, Notifikasi)
  tidak pernah muncul di satu pun sapuan audit: harness-nya selalu berhenti di
  Beranda, jadi 31 kelas di bawah 11px di sana tidak pernah terlihat. Harness
  baru menekan tiap tab dan lonceng notifikasi, lalu mengukur yang benar-benar
  tergambar. Hasilnya sekarang **0 di keenam layar**.
- Menaikkan ukuran teks selalu berisiko membuat baris yang tadinya muat jadi
  terpotong, jadi pengukurannya memakai kotak baris teks itu sendiri (lewat
  `Range.getClientRects()`), bukan tinggi elemen: tinggi elemen ikut menghitung
  padding, dan itu melaporkan pil satu baris ("Baru") sebagai dua baris.

**Tiga cacat yang ketahuan karena layarnya akhirnya terlihat**
- Total di kartu Bayar patah setelah "Rp", angkanya turun ke baris kedua —
  persis kelas bug yang diperbaiki untuk dasbor Admin di #269. Sekarang
  `text-base` + `whitespace-nowrap`: angka penuh sembilan digit muat satu
  baris. Sempat saya pendekkan jadi "Rp 4,9 jt", lalu saya batalkan — ini layar
  rekonsiliasi, angkanya harus persis.
- Baris meta di daftar pembayaran jadi dua baris setelah naik ke 11px, dan
  timestamp-nya terbelah setelah koma. Kendalanya lebar, bukan ukuran, jadi
  isinya yang dipendekkan: enum `VIRTUAL_ACCOUNT` jadi "Virtual Account", dan
  detik yang tidak direkonsiliasi siapa pun dibuang.
- Di Klaim, "Coverage: … · Sum Insured: …" memecah labelnya sendiri jadi
  "Sum / Insured:". Sekarang dua kolom berlabel, Indonesia, di bawah barisnya
  (percobaan pertama menaruhnya sebaris dengan pil status, dan di lebar ~105px
  kata "PERTANGGUNGAN" sendiri ikut terpotong).

**Penomoran**
- Cabang ini duduk di 2.6.23 sementara main sudah terbit v2.7.0 dari #258,
  jadi merge apa adanya akan **menurunkan** `APP_VERSION`. PR #267 sudah
  memegang 2.7.1 di cabangnya, maka rilis ini mengambil 2.7.2.

## v2.7.0 — 2026-10-23

**SEO: halaman yang bisa ditemukan, ditautkan, dan diukur.**

- Artikel blog akhirnya memakai URL-nya. `BlogPage` memilih artikel dari state
  React tanpa `pushState`, jadi membuka artikel dari `/blog` tidak mengubah
  pathname: router tidak pernah berjalan ulang, `resolveSeo()` tidak pernah
  melihat path artikel, dan kelima artikel diindeks serta dibagikan memakai
  judul, deskripsi, dan JSON-LD halaman daftar. Metadata per artikel di
  `src/seo/seo.ts` sudah ditulis sejak awal tapi tidak pernah terjangkau.
  Sekarang artikel ditentukan URL, dan kartunya berupa `<a href>`.
- Setiap halaman marketing kini punya HTML statis sendiri. Semua metadata
  per-rute sebelumnya dipasang dari sisi klien, jadi hanya Googlebot yang
  melihatnya — WhatsApp, Facebook, X, LinkedIn, dan crawler LLM membaca HTML
  mentah lalu berhenti. Akibatnya setiap URL membawa judul dan OG image
  homepage: halaman asuransi mobil yang dibagikan ke WhatsApp tampil sebagai
  homepage. Terukur sebelum perbaikan ini, HTML tanpa JS untuk `/product/car`,
  `/kalkulator`, dan `/blog/asuransi-all-risk-vs-tlo` mengembalikan `<title>`
  dan `og:title` yang **identik**. Untuk pasar yang berbagi lewat WhatsApp, ini
  cacat SEO terbesar di situs ini. `npm run build` sekarang menulis satu berkas
  per rute indexable ke `dist/` (26 rute); Vercel memeriksa filesystem sebelum
  menerapkan rewrite SPA, jadi berkas-berkas ini yang dipakai. SPA tetap
  hydrate dan mengambil alih routing seperti sebelumnya.
- Path yang tidak dikenal tidak lagi menawarkan dirinya untuk diindeks. Catch-all
  di `vercel.json` dulu mengarah ke `/index.html`, jadi path tak dikenal
  disajikan dokumen homepage apa adanya — `index, follow`, judul homepage,
  canonical homepage — lalu SPA memperbaikinya dari sisi klien. Itu justru
  koreksi yang keberadaan prerender ini dimaksudkan untuk tidak lagi
  diandalkan: crawler tanpa JavaScript sedang diundang mengindeks soft-404
  dalam jumlah tak terbatas dengan metadata homepage. Sekarang catch-all
  mengarah ke `_fallback.html` yang `noindex, follow` dan tanpa canonical (satu
  berkas menjawab banyak URL, jadi tidak boleh mengklaim satu pun). `/` tetap
  indexable karena disajikan dari filesystem, bukan lewat catch-all. Rute
  berautentikasi (`/admin`, `/agapps`, `/login`, `/review/:uuid`, `/payment`)
  juga lewat sini, dan `noindex` memang benar untuk semuanya. Ditemukan saat
  memverifikasi prerender di preview, bukan dari test.
- Daftar tag `<head>` jadi data, bukan kode. `headTags()` di `src/seo/seo.ts`
  mendefinisikan sekali tag apa saja yang didapat sebuah halaman; dua konsumen
  hanya tahu cara merendernya — `applyDocumentHead()` ke DOM saat runtime, dan
  `scripts/prerender.mjs` ke HTML statis saat build. Prerenderer yang menyusun
  daftarnya sendiri akan jadi sumber kebenaran kedua, dan keduanya akan melenceng
  persis seperti sitemap tulisan tangan dulu melenceng dari daftar rute.
- `scripts/check-prerender.mjs` masuk rantai build, bukan cuma test suite:
  regresi prerender tidak terlihat oleh test apa pun yang jalan di browser —
  SPA tetap memasang head yang benar begitu JavaScript jalan — jadi hanya
  crawler yang melihatnya. Rusakkan prerender, `npm run build` exit non-zero.
- Satu test saya sendiri ternyata tidak menguji apa pun. Test detail kontak
  memeriksa `/kontak`, padahal rutenya `/contact`. Path yang tidak dirutekan
  jatuh ke catch-all: HTTP 200, shell generik, `noindex` — jadi semua assertion
  tentangnya lolos tanpa menguji apa pun. Assertion berupa *ketidakhadiran*
  paling rentan terhadap ini, karena lolos di halaman yang tidak ada. Blok
  `Indexable route sweep` sekarang mengunjungi seluruh 26 path dari
  `indexablePaths()` dan menuntut masing-masing merender konten nyata serta
  menyajikan `index, follow`. Itu yang menutup kelasnya, bukan satu path yang
  dikoreksi.
- Nomor telepon dan alamat kantor dihapus dari seluruh situs. Belum ada kantor
  dan belum ada nomor WhatsApp kantor (keputusan owner, 2026-10-23), sementara
  situs memasang empat kontak palsu yang saling berbeda: `telephone`
  `+62-21-5060-1234` di dua simpul schema dan di fallback `<noscript>`,
  `(021) 5050-1234` plus WhatsApp `+62 811-1234-5678` di `/kontak`, dan
  `wa.me/6281234567890` di tombol "tanya agen" halaman kalkulator — CTA hidup
  yang mengarah ke nomor yang tidak ada. `addressLocality` ikut dilepas dari
  schema dan baris alamat dilepas dari footer. Satu-satunya nomor yang tersisa
  adalah `SUREPATH_WHATSAPP` di `constants.ts`, nomor yang memang sudah dipakai
  tombol WhatsApp mengambang dan Pathy; `/kontak` dan kalkulator sekarang
  memakai konstanta itu, bukan nomor karangan sendiri.
- Footer, menu mobile, kartu produk, dan kartu blog menjadi tautan sebenarnya.
  Sebelumnya semuanya `<button onClick={navigate})`, sehingga hanya ada 7 tautan
  yang bisa dirayapi di seluruh situs dan 19 dari 24 URL — termasuk `/kalkulator`
  dan keenam halaman produk — tidak punya satu pun tautan internal masuk. Mesin
  pencari hanya menemukannya dari sitemap, tanpa anchor text. Perilaku SPA tidak
  berubah: `preventDefault()` lalu `navigate()`, sama seperti nav desktop yang
  sudah memakai pola ini. Ini sekaligus memperbaiki aksesibilitas — tautan bisa
  dibuka di tab baru dan diumumkan sebagai tautan, bukan tombol.
- Trailing slash tidak lagi men-`noindex` halaman yang seharusnya diindeks.
  `App.tsx` mengirim `currentPath` mentah ke `resolveSeo()` sementara normalisasi
  trailing slash-nya dilakukan terpisah saat render, jadi `/products/` menampilkan
  halaman yang benar lalu jatuh ke cabang path-tak-dikenal dan menyajikan
  `noindex`. Normalisasi sekarang ada di dalam `resolveSeo()`, dan
  `trailingSlash: false` di `vercel.json` membuat `/products/` dialihkan ke
  `/products` sehingga satu halaman tidak lagi punya dua URL.
- `hreflang` mengikuti canonical. `upsertLink()` mencocokkan hanya berdasarkan
  `rel`, sedangkan `index.html` mendeklarasikan dua `rel="alternate"`; akibatnya
  canonical diperbarui per halaman tapi alternate tetap menunjuk `/` — sinyal
  yang saling bertentangan di 23 dari 24 halaman.
- FAQ beranda tidak lagi bocor ke setiap rute. `@graph` statis di `index.html`
  tidak pernah dibongkar saat navigasi, jadi `/privacy` dan semua halaman produk
  membawa `FAQPage` beranda bersama schema mereka sendiri. FAQ-nya pindah ke
  descriptor `HOME` di `seo.ts`, dikelola seperti JSON-LD halaman lain.
  `index.html` menyimpan empat node yang memang berlaku site-wide.
- `BreadcrumbList` statis dihapus: item ketiganya menunjuk `/agent`, rute yang
  tidak ada (yang benar `/agents`), dan isinya bukan hierarki. `breadcrumb()`
  per halaman sudah menangani ini dengan benar.
- NAP dibetulkan. `telephone` masih placeholder `+62-800-1234-5678` dan email di
  schema (`info@`) berbeda dari yang ditampilkan footer (`halo@`). Keduanya kini
  mengikuti footer, dan `addressLocality` menjadi Jakarta Selatan. `logo` yang
  dideklarasikan 512×512 sebenarnya 348×400.
- Schema `Article` mendapat `dateModified` dan `image` — keduanya wajib untuk
  rich result artikel, dan keduanya tidak ada. Asuransi perjalanan mendapat
  `Offer` dengan harga yang memang sudah dipublikasikan situs (Rp 45rb/trip);
  produk lain tidak diberi harga karena tarifnya per kendaraan/nilai
  pertanggungan.
- `public/sitemap.xml` di-generate dari `seo.ts` lewat
  `scripts/generate-sitemap.mjs`, dijalankan di awal `npm run build`. Sebelumnya
  ditulis tangan dan melar dari daftar rute setiap kali halaman bertambah.
  `changefreq` dan `priority` dibuang — Google mengabaikan keduanya.
- `robots.txt` menyatakan sikap eksplisit terhadap crawler AI: diizinkan, karena
  `llms.txt` memang ada untuk mereka. Daftar `Disallow` diulang penuh di grup itu
  dengan sengaja — grup user-agent bernama *menggantikan* grup `*`, bukan
  mewarisinya, jadi grup yang hanya berisi `Allow: /` justru akan membuka portal
  dan halaman bertoken ke crawler tersebut.
- GA4 mendapat `page_view` saat rute berubah. `send_page_view` hanya menyala
  sekali per muat dokumen, jadi di SPA ini seluruh trafik diatribusikan ke URL
  pendaratan dan tidak ada halaman marketing yang punya pageview sendiri.
- Blok `<noscript>` di `index.html` masih memakai `info@myinsurepath.com`
  padahal schema dan footer sudah `halo@`. Justru blok itulah yang dibaca crawler
  yang tidak menjalankan JavaScript, jadi inkonsistensi NAP-nya tetap terkirim.
  Ketahuan saat memeriksa deploy preview, bukan dari tes — tes sebelumnya hanya
  memeriksa node JSON-LD. Sekarang ada tes yang memeriksa seluruh dokumen.
- `tests/seo.spec.ts`: 38 kasus yang mengunci semua hal di atas. Tidak ada satu
  pun yang terlihat di UI, jadi semuanya mudah rusak kembali tanpa disadari.

## v2.6.22 — 2026-10-24

Portal Operator dan Insurer — dua salinan terakhir dari komponen bersama.

- Keduanya juga punya header dan navigasi bawah hasil salin-tempel, persis
  seperti B2B di v2.6.21. Keduanya tertinggal di 9px dan kehilangan penanda tab
  aktif berbentuk batang, jadi tab aktif hanya dibedakan warna. Sekarang
  memakai `PortalHeader` dan `PortalTabBar`.
- Header Insurer menjejalkan nama portal, nama perusahaan, dan nomor versi ke
  satu baris — di layar 390px melipat jadi tiga baris. Sekarang masing-masing
  punya tempatnya sendiri.
- Kartu KPI di kedua dashboard menampilkan **angka yang sama dua kali**: satu
  pil kecil di kanan atas dan satu angka besar di bawahnya. Pilnya dihapus.
- Teks di bawah 11px: Operator 14 → 2, Insurer 25 → 5.
- Catatan: angka Insurer sebelumnya selalu terbaca "0" karena yang terukur
  adalah halaman login, bukan portalnya. Portal Insurer memakai token bearer
  di `sessionStorage`, bukan Supabase Auth, jadi alat ujinya perlu jalur
  sendiri. Ini pertama kalinya layar itu benar-benar diukur.

## v2.6.21 — 2026-10-23

Portal B2B — layar yang selama ini tidak pernah benar-benar terukur.

- Navigasi bawahnya ternyata salinan lama `PortalTabBar` yang sudah menyimpang:
  tertinggal di 9px, tanpa penanda tab aktif berbentuk batang, dan tanpa cincin
  fokus keyboard. Sekarang memakai komponen bersamanya.
- Label navigasinya terpotong di tengah kata — "PENGAJ/UAN", "BERA/NDA".
  Menaikkan ukurannya saja justru memperparah, karena masalahnya lebar, bukan
  ukuran. Lima tab teks di satu baris tidak muat kata sembilan huruf, jadi
  labelnya dipendekkan: "Pengajuan" → "Ajuan", "Penawaran" → "Tawaran",
  "Kuotasi" → "Buat" (kata yang sama dengan portal Mitra).
- Headernya juga salinan lama `PortalHeader`, lengkap dengan bug sesak yang
  sudah diperbaiki di versi bersamanya. "KLIEN B2B" melipat dua baris.
  Sekarang memakai komponen bersamanya, sekalian mendapat cincin fokus di tiga
  tombolnya dan nama aksesibilitas untuk tombol avatar yang sebelumnya kosong.
- Teks di bawah 11px: 11 → 0.
- `PortalTabBar` memakai padding mendatar lebih rapat supaya label panjang
  punya ruang; Nasabah dan Mitra diperiksa ulang, tidak ada yang berubah.

## v2.6.20 — 2026-10-23

Portal Operator dan Mitra, hasil melihat layarnya langsung di lebar 390px.

**Operator**
- Teks sumber `t('Hello', 'Halo')` tampil apa adanya di header dashboard — kurung
  JSX-nya hilang, jadi yang terbaca pengguna adalah kode, bukan sapaan. Diperbaiki.
- Header sesak sampai nama operator terdesak; sisi kiri dikunci, sisi kanan
  dibiarkan menyusut, dan dua label 10px naik ke 11px.

**Mitra**
- "GWP Bulan Ini" memotong angka di tengah: `Rp 58.800.0 / 00`. Sekarang memakai
  `formatIDRCompact` (`Rp 58,8 jt`) dengan angka persisnya di `title`.
- Tiga kolom di kartu partner tidak sejajar: hanya label "Penawaran berjalan"
  yang melipat, jadi angkanya turun satu baris sendirian. Kolomnya kini
  memanjang penuh dan labelnya dipendekkan jadi "Penawaran".
- Label header terbaca "AGENT PORT…" karena "Agent Portal" tidak pernah muat di
  layar ponsel. Diganti jadi label satu kata yang diterjemahkan, "Mitra" —
  sama seperti portal Nasabah, dan sama dengan nama di navigasi bawah.
- 32 teks di bawah 11px menjadi 0.

**Dipakai bersama**
- Label navigasi bawah naik dari 9px ke 11px (Nasabah, Mitra, Marketing).
- `StatCard` menyediakan dua baris untuk labelnya, supaya "TOTAL PREMI" yang
  melipat tidak lagi menjatuhkan angkanya di bawah "AKTIF" dan "SISA HARI".
- Teks pendukung `StatCard` pakai `break-words`, bukan `anywhere` yang
  diwarisi dari CSS: "perpanjangan" sempat terpotong jadi "perpanjang/an".

## v2.6.19 — 2026-10-23

**Dasbor Admin memecah angka rupiah di tengah digit — dan audit sebelumnya tidak pernah melihatnya.**

- Di 390px, kartu KPI Admin render `Rp 2.418.7` / `50.000` dan
  `Rp 1.942.3` / `00.000` — dua baris, putus di tengah angka. Ini layar uang
  yang dipakai operator setiap hari.
- **Tiga audit sebelumnya melewatkannya karena datanya tidak pernah masuk.**
  Harness mengirim bentuk `get_dashboard_stats` yang salah, sedangkan layar ini
  membaca `admin_stats` dan `admin_transaksi_overview`. Jadi tiap kartu render
  `—`, dan yang dihitung selama ini adalah barisan placeholder, bukan dasbor.
  Bentuk aslinya kini dibaca dari `services/dbTypes.ts` dan daftar kartunya
  sendiri.
- Perbaikan sejalan dengan v2.6.17: nilai kartu pakai `formatIDRCompact`
  (`Rp 2,4 M`), ukurannya `text-xl sm:text-2xl` dengan `tabular-nums`, dan
  padding `p-4 sm:p-6` — `p-6` hanya menyisakan 122px isi di 390px.
- **Ketelitian tidak hilang.** Memendekkan angka di dasbor uang berarti
  membuang ~18 juta dari `Rp 2.418.750.000`. Karena itu tiap kartu rupiah
  membawa `title` berisi angka persisnya, jadi nilai penuh tinggal di-hover
  (atau dibacakan pembaca layar), bukan lenyap.
- Label kartu, eyebrow "Sistem Aktif"/"Transaksi Overview", dan tautan
  "Lihat detail →" naik ke lantai 11px, dengan tracking dilonggarkan supaya
  ukuran baru tidak membuatnya membungkus.
- Simpul <11px di Admin: **25 → 5**. Sapuan enam portal: tidak ada overflow,
  tidak ada regresi. `npm run lint` tetap 0 error / 33 warning / 316 tes.

## v2.6.18 — 2026-10-23

**Audit keamanan: tutup injeksi filter pada lookup identitas dan tegakkan tangga persetujuan penarikan.**

- `data-gateway`, `quotations-gateway` dan `pathy-agent` menentukan identitas
  pemanggil dengan menyisipkan email dari JWT ke dalam grammar filter PostgREST:
  `.or(`id.eq.${authId},email.ilike.${email}`)`. Email itu tidak di-escape, dan
  `ilike` memperlakukan `*` sebagai wildcard — jadi mendaftar dengan alamat yang
  dirancang khusus membuat lookup mengembalikan baris user lain. Baris itu *adalah*
  pemanggil: `role`, `isAdmin`, `isFinanceAdmin` dan `ownerId` semuanya diambil
  dari situ, sehingga ini eskalasi privilese dari pendaftaran mandiri.
  `_shared/auth.ts` sudah memakai bentuk `.eq()` terparameterisasi lengkap dengan
  komentar yang memperingatkan hal ini; ketiga file itu tidak pernah ikut
  diperbarui. Sekarang ketiganya memakai pola yang sama. Setiap `sp_users.email`
  di database tersimpan lowercase, jadi `.eq()` setara dengan pencocokan
  case-insensitive sebelumnya tanpa semantik pattern-matching.

- `admin_approve_withdrawal` mengambil tingkat persetujuan dari parameter klien,
  dan cabang `else`-nya men-set `status: 'APPROVED'` tanpa syarat — sehingga
  `level: 3`, `level: 0`, bahkan `level: "x"` menyetujui jumlah berapa pun dalam
  satu panggilan, tanpa memeriksa apakah baris itu sedang menunggu persetujuan
  dan tanpa memeriksa L1/L2 sudah lewat. Tangga <10jt/≥10jt/≥25jt efektif tidak
  ditegakkan. Sekarang tingkatnya diturunkan dari baris, bukan dari request;
  UPDATE-nya mengklaim stage secara atomik lewat `.eq('status', …)` sehingga dua
  approver yang berlomba tidak bisa sama-sama maju; dan satu orang tidak bisa
  menandatangani penarikan yang sama dua kali.

- Persetujuan penarikan jadi **finance-only di semua tier** (keputusan pemilik,
  2026-10-23, sementara). `OPERATOR` ada di `ADMIN_ROLES` tapi tidak di
  `FINANCE_ROLES`, jadi operator tidak lagi bisa menandatangani tier mana pun —
  termasuk L1 untuk permintaan di bawah 10jt. Tombol "L1" di portal operator
  dihapus beserta `approveWithdrawalL1` di `services/operatorService.ts`, supaya
  tidak ada tombol yang pasti membalas 403. Operator tetap melihat antrian dan
  tetap bisa **menolak**, karena menolak hanya membalikkan deduksi yang sudah
  dilakukan agen dan tidak bisa mencairkan dana.

- Migration `20261023073000_close_token_table_rls_gaps.sql`: `sp_insurer_auth_tokens`
  dan `sp_review_tokens` terbuka untuk setiap user terautentikasi di produksi
  (policy SELECT/INSERT/UPDATE `true` untuk role `public`). Policy
  `sp_insurer_auth_tokens` di-drop tanpa pengganti karena jalur kliennya sudah
  mati; `admins_manage_tokens` pada `sp_review_tokens` diganti policy ber-scope
  `is_admin()` karena tombol kirim-link-ulasan di admin masih INSERT langsung ke
  tabel itu. **Migration ini belum diterapkan ke produksi.**

## v2.6.17 — 2026-10-23

**Kartu "Proteksi Saya" di beranda Nasabah pecah di layar ponsel — dan sebabnya bukan yang diduga.**

- Di 390px, nilai premi `Rp 1.850.000` terbelah jadi tiga baris di tengah
  angka: `Rp 1.8` / `50.0` / `00`. Label `ke perpanjangan` putus jadi
  `perpanjang` / `an`. Ini layar pertama yang dilihat setiap nasabah.
- **Dugaan pertama salah dan dibuang.** Ada `overflow-wrap: anywhere` di
  `src/styles/portal-modernization.css` yang berlaku untuk keenam portal di
  bawah 640px, dan itu tampak seperti sebabnya. Diubah ke `break-word`, lalu
  diukur lagi: **angkanya sama persis**. Diuji terpisah dalam kasus flex
  terkendali — dua mode itu berperilaku identik. Perubahan CSS-nya dibatalkan,
  karena mengubah perilaku enam portal atas teori yang gagal dibuktikan bukan
  perbaikan.
- **Sebab sebenarnya adalah tata letak, bukan pembungkusan kata.**
  `grid-cols-3` mengunci tiap kolom di 95px; dengan `p-4` tersisa **61px**
  untuk isi, sementara nilai premi 20px butuh ~140px. Teks itu memang tidak
  muat, jadi ia harus putus.
- Perbaikannya: `StatCard` kini `p-3 sm:p-4` dan nilainya `text-base sm:text-xl`
  dengan `tabular-nums`, dan premi memakai `formatIDRCompact` yang baru
  (`Rp 1,9 jt`; satuan rb/jt/M/T, K/M/B/T untuk EN) di `src/i18n.ts`.
- Sub-label kartu "Sisa Hari" berhenti mengulang labelnya sendiri: dulu
  `ke perpanjangan` (12 huruf di kotak 71px), kini **tanggal perpanjangan**
  (`23 Okt 2027`) — muat, dan memberi tahu hal yang labelnya tidak.
- Label dan sub `StatCard` naik ke lantai 11px (`text-2xs`).
- Hasil di 390px: tiap elemen satu baris, tinggi kartu **181px → 103px**, tidak
  ada lagi putus di tengah kata. Di 360px dan 320px masih membungkus, tapi
  **selalu di spasi** — `Rp 1,9` / `jt`, `23 Okt` / `2027` — bukan di tengah
  angka. Diperiksa sebagai gambar, bukan cuma sebagai hitungan.
- Sapuan enam portal: tidak ada overflow, tidak ada regresi. `npm run lint`
  tetap 0 error / 33 warning / 316 tes.

## v2.6.16 — 2026-10-23

**Dua cacat di header Admin Portal, ditemukan karena interiornya akhirnya bisa dilihat.**

- Interior portal berautentikasi akhirnya terbuka untuk diperiksa — **tanpa
  membuat akun produksi**. Gerbang login memanggil `signInWithPassword` lalu
  `get_my_profile`; dua-duanya panggilan jaringan, jadi dua-duanya dijawab
  lokal di harness uji. Gerbangnya lewat lewat jalur kodenya sendiri dan yang
  render setelahnya adalah portal asli. Nol sentuhan ke produksi, nol password
  yang harus disimpan.
- **Badge "BACKUP SELESAI" di header pecah jadi satu huruf per baris** di 390px.
  Flex memerasnya sampai setiap karakter turun baris sendiri — kolom vertikal
  B/A/C/K/U/P/… yang menjebol header. Sekarang disembunyikan di bawah `sm`
  (header ponsel sudah penuh: kolom cari plus empat kontrol) dan diberi
  `whitespace-nowrap shrink-0` supaya tidak pernah pecah di lebar mana pun.
- **Tiga kontrol di kanan header terpotong di tepi layar** pada 390px. Kolom
  cari dipatok `w-52` (208px) sementara grup kirinya tidak dibatasi, jadi grup
  kanan yang terdorong keluar. Sekarang grup kiri `flex-1 min-w-0`, kolom cari
  ikut menyusut dengan batas `max-w-xs`, dan grup kanan `shrink-0` sehingga
  bukan dia yang mengalah.
- Cacat kedua ini **tidak terdeteksi penghitung**: header memotong ke dalam, jadi
  `scrollWidth` tetap 390 dan sapuan otomatis melaporkan "tidak ada overflow".
  Hanya ketahuan dengan melihat gambarnya. Dicatat karena itu mengubah cara
  verifikasi berikutnya harus dilakukan.
- Chip email admin ikut naik ke lantai 11px, dan inisial avatar di dalam
  lingkaran berukuran tetap memakai `text-badge` — primitif dari v2.6.15.
- `components/admin/` **tetap** pada aturan lint inline-saja. Baru dasbornya yang
  benar-benar dilihat; 135 class `text-[0.XXrem]` sisanya tersebar di layar yang
  belum dibuka, dan menaikkannya tanpa melihat persis cara label jadi kepotong.

## v2.6.15 — 2026-10-23

**Lantai tipografi v2.6.13 ternyata bocor di tiga tempat. Ditutup, plus guardrailnya diperbaiki.**

- Guardrail v2.6.13 hanya menangkap satu bentuk: class Tailwind `text-[Npx]`.
  Ada **tiga bentuk lain** yang lolos sepenuhnya — `fontSize` inline dalam rem,
  `fontSize` inline dalam px, dan class `text-[0.XXrem]`. Jadi angka audit
  "765 simpul sub-11px" terlalu kecil. Hitungan sebenarnya sebelum rilis ini
  **1.297**: 725 class px, 571 class rem, 1 inline — hampir 70% lebih banyak.
- Yang terburuk ada di **gerbang login Admin, Operator, dan Insurer**:
  `SECURE SESSION`, `AUTHORIZED ACCESS ONLY`, `EMAIL`, `PASSWORD` ditulis
  `fontSize: '0.42rem'` sampai `'0.47rem'` — **6,72px sampai 7,52px**, huruf
  kapital dengan letter-spacing 0,42em. Itu teks terkecil di seluruh aplikasi,
  di layar yang dilihat setiap admin dan operator setiap kali masuk. Semua naik
  ke lantai 11px, dan letter-spacing-nya diturunkan supaya labelnya tidak wrap
  di 390px — di 11px, tracking 0,42em membuat `AUTHORIZED ACCESS ONLY` pecah
  dua baris dan garis hias di kiri-kanannya jadi melenceng.
- Total **80 simpul** dinaikkan: 49 `fontSize` inline (semua yang ada di repo,
  nol tersisa) dan 31 class rem di direktori yang layarnya bisa saya buka —
  gerbang login, halaman `/login`, halaman marketing, `components/ui/`.
- **`text-badge` (8,8px)** ditambahkan di `tailwind.config.cjs`: satu-satunya
  pengecualian sub-11px yang disahkan, untuk angka di dalam badge hitung
  berukuran tetap. v2.6.13 mencatat ini butuh primitif sendiri, bukan komentar
  pengecualian — ini primitifnya, jadi ukurannya hidup di satu tempat.
- Guardrail ESLint sekarang menangkap ketiga bentuk itu. Direktori yang layarnya
  belum bisa dilihat (`admin/`, `operator/`, `insurer/` bagian dalam) dapat
  aturan **inline saja**, di blok terpisah — karena flat config *mengganti*
  `no-restricted-syntax`, bukan menggabung, kalau dua blok kena berkas yang sama.
  Keempat selector sudah di-probe non-vacuous, dan aturan hex v2.6.10 dipastikan
  masih hidup di `components/ui/`.
- **Koreksi verifikasi v2.6.13.** Sapuan browser waktu itu memakai path
  `/tentang-kami`, `/produk`, `/cara-kerja` — ketiganya **bukan rute**. Path
  sebenarnya `/about`, `/products`, `/how-it-works`. Jadi "16/16 di lima
  halaman" sebetulnya menguji beranda empat kali. Kali ini: 10 halaman publik
  yang benar-benar berbeda, 9 lolos bersih.
- **Cacat yang ditemukan, belum diperbaiki:** `/ai` meluber horizontal di ponsel
  (scrollWidth 470px di viewport 390px). Sudah ada sebelum perubahan ini —
  diukur 473px pada kode lama — jadi dilaporkan, bukan diklaim beres.
- Sisa pekerjaan: 1.288 simpul sub-11px di layar yang masih butuh login untuk
  dilihat. Jumlahnya tercatat di `docs/APP_REVAMP_EXECUTION.md`.

## v2.6.14 — 2026-10-23

**React Router dihapus dari bundel: −24 kB yang dimuat setiap pengunjung.**

- `index.tsx` membungkus `<App />` dengan `<HashRouter>` dari `react-router-dom`,
  padahal **tidak ada satu berkas pun** di app ini yang memakai API-nya — tidak
  ada `Route`, tidak ada `Link`, tidak ada hook. Routing SurePath ditulis tangan
  di atas History API di `App.tsx` (`currentPath` dari `window.location.pathname`,
  `navigate()` memanggil `history.pushState`, listener `popstate` menyinkronkan
  keduanya). Jadi seluruh library itu ikut terkirim ke setiap pengunjung tanpa
  mengerjakan apa pun. Dihapus, dan paketnya dicabut dari `package.json`.
- Entry chunk — satu-satunya chunk yang **wajib** dimuat semua orang sebelum apa
  pun tampil — turun dari 445,6 kB (141,6 kB gzip) ke 421,4 kB (132,8 kB gzip):
  **−24,2 kB mentah, −8,8 kB gzip**. Di koneksi seluler Indonesia itu yang paling
  terasa, karena biayanya dibayar di muka sebelum splash screen muncul.
- Tidak mengubah perilaku URL. Sebelum penghapusan saya cek dulu di browser:
  HashRouter **tidak** menambahkan `#/` ke URL mana pun, jadi ini murni bobot
  bundel yang mati, bukan bug routing. Setelah penghapusan, 10/10 asersi:
  `pathname` utuh di `/`, `/tentang-kami`, `/produk`, `/agapps`, `/admin`,
  `/custapp`, `/operatorapp`; `pushState` memindahkan URL; tombol Back kembali ke
  path sebelumnya; nol error halaman.
- Koreksi temuan audit: "AnalyticsDashboard 395 kB perlu code-splitting"
  **salah**. Berkas itu sudah `lazy()`-loaded di `AdminPortal.tsx`, recharts
  hanya diimpor di satu berkas, dan komentar di `vite.config.ts` mencatat bahwa
  manual chunk untuk recharts/jspdf memang sengaja dihapus (manual chunk menyerap
  dependensi bersama dan justru memaksa entry mengimpor ~240 kB di setiap
  halaman). Tidak ada cacat di sana, jadi tidak ada yang "diperbaiki".
- Juga dikoreksi: `CLAUDE.md` menyatakan `react-router` "tidak diimpor di mana
  pun". Itu tidak benar — ada satu impor, di `index.tsx`. Sekarang pernyataannya
  cocok dengan kode.

## v2.6.13 — 2026-10-23

**Lantai tipografi: 11px, didefinisikan sekali, dijaga lint.**

- 765 simpul teks di app ditulis di bawah 11px dengan nilai arbitrer —
  `text-[10px]` sampai `text-[7px]`. Di bawah ambang nyaman baca di ponsel, dan
  karena tiap simpul menulis angkanya sendiri, lantainya tidak bisa dinaikkan
  dari satu tempat. Sekarang ada `text-2xs` (11px) di `tailwind.config.cjs`:
  satu tempat itu. Skala Tailwind sendiri mulai dari `text-xs` (12px), jadi
  `2xs` duduk satu langkah di bawahnya, bukan memaksa setiap caption naik 20%.
- Dimigrasikan: 40 simpul di permukaan yang bisa saya buka dan periksa langsung
  di browser — halaman marketing, splash screen, halaman e-quotation dan
  financing. **Enam portal belum**, karena butuh sesi login untuk dilihat;
  ~725 simpul sisanya menunggu pass per portal dengan mata manusia atau URL
  preview. Jumlah pastinya tercatat di `docs/APP_REVAMP_EXECUTION.md`.
- Guardrail ESLint menolak `text-[Npx]` di bawah 11px, tapi hanya di direktori
  yang sudah dimigrasikan (`src/`, `components/ui/`, `landing/`, `public/`).
  Ratchet yang sama seperti aturan hex: tambah direktori saat selesai, jangan
  nyalakan di mana-mana lalu tenggelam di 725 error.
- Pengecualian yang disengaja: angka di dalam badge hitung berukuran tetap
  (angka `1` di dalam titik 14px). Itu glyph dalam bentuk, bukan teks untuk
  dibaca, dan menaikkannya membuat titiknya jebol. Tidak ada satu pun di
  direktori yang sudah dimigrasikan; saat portal menyusul, mereka butuh
  primitif sendiri, bukan komentar pengecualian.
- Dikonfirmasi di browser pada lebar 390px, 16/16 asersi: setiap simpul
  `text-2xs` benar-benar merender 11px (class Tailwind yang tidak ter-generate
  diam-diam merender di ukuran warisan — unit test tidak bisa melihat itu),
  nol class arbitrer di bawah 11px tersisa di DOM, dan tidak ada overflow
  horizontal di lima halaman.

## v2.6.12 — 2026-10-23

**Latar halaman akhirnya ikut tema, dan dark mode tidak berkedip putih lagi.**

- `index.html` menulis `body { background: #fafaf9; color: #1e293b }` langsung,
  tanpa pasangan gelap. Jadi satu permukaan yang ada di belakang setiap halaman
  adalah satu-satunya permukaan yang tidak pernah ikut tema: token `--ds-*` di
  `:root` sudah berbalik gelap, `body` tetap terang. Ini yang membuat dark mode
  terasa setengah jadi walau token dan portalnya sudah benar sejak v2.6.10.
  Sekarang `body` membaca `var(--ds-bg)` dan `var(--ds-text-primary)` seperti
  komponen lain, dengan nilai literal hanya sebagai cadangan untuk paint pertama
  sebelum `styles.css` termuat.
- Class `dark` dulu baru dipasang setelah React mount, jadi pengguna dark mode
  melihat kilat putih di setiap kali buka. Sekarang ada script kecil di `<head>`
  yang membaca preferensi tersimpan sebelum paint pertama. Kuncinya sama persis
  dengan `components/shared/theme.ts` — ini cuma pembacaan awal dari state yang
  sama, bukan pemilik kedua.
- Thumb scrollbar ikut token `--ds-border-strong`, tidak lagi abu-abu mati yang
  nyaris tidak terlihat di latar gelap.
- Dikonfirmasi di browser: 8/8 asersi, termasuk `body` berpindah dari
  `rgb(244,247,251)` ke `rgb(26,29,41)` dan warna teksnya ikut. 3 unit test baru
  menjaga `index.html` dari drift, karena berkas itu di luar build TypeScript dan
  tidak ada yang akan menyadarinya kalau berubah.

## v2.6.11 — 2026-10-23

**Dialog konfirmasi yang bisa meminta alasan, dan satu primitif empty state.**

- Layar tier admin masih memakai `window.confirm`, `window.alert` dan
  `window.prompt`: kotak dialog milik browser, tidak mengikuti tema, tidak bisa
  diberi label "Nonaktifkan" atau diwarnai sebagai aksi destruktif, dan memblokir
  thread utama. Ia juga satu-satunya tempat yang masih begitu — `useConfirmDialog`
  sudah dipakai di 10 berkas lain dan `useToast` di 23. Sekarang ketiganya memakai
  primitif dalam app: konfirmasi destruktif lewat `useConfirmDialog`, pesan hasil
  lewat `useToast`.
- `ConfirmDialog` sendiri tidak bisa meminta teks, padahal penolakan permintaan
  tier perlu merekam alasan. Ia kini mendukung satu kolom input (satu baris atau
  multiline, wajib atau opsional) dan mengekspor `usePromptDialog` yang
  mengembalikan teks pada konfirmasi dan `null` saat dibatalkan — semantik yang
  sama dengan `window.prompt` yang digantikannya, jadi pemanggil yang memeriksa
  `== null` untuk membatalkan tetap benar. Kolom wajib yang masih kosong atau
  hanya spasi membuat tombol konfirmasi non-aktif.
- Dialog yang dibuka saat dialog lain masih menunggu dulu meninggalkan promise
  pemanggil pertama menggantung selamanya. Sekarang promise itu diselesaikan
  sebagai pembatalan. 7 unit test baru menutup kontrak ini.
- Layar order polis admin punya masalah terkait: empat pesan untuk pengguna hanya
  ditulis ke `console` — "Wajib isi catatan penolakan", "Upload gagal", "Gagal
  membuat link", dan kegagalan unduh slip. Artinya admin yang menekan Tolak tanpa
  catatan melihat **tidak terjadi apa-apa sama sekali**. Keempatnya kini jadi toast.
  Fallback `window.prompt('Salin link berikut:')` saat clipboard diblokir juga
  diganti toast yang menampilkan linknya. Setelah ini tidak ada lagi dialog native
  di seluruh app, kecuali fallback di dalam `ConfirmDialog` sendiri untuk kasus
  tanpa provider.
- `components/ui/EmptyState.tsx` dihapus. Nol pemakaian: empty state yang benar-benar
  dipakai app adalah `AgentEmpty` (`components/agent/AgentArt.tsx`) di 17 berkas
  Mitra, Operator dan Insurer, lengkap dengan ilustrasi `SpotEmpty`. Menyimpan dua
  komponen bernama "empty state" dengan satu yang tidak pernah dipakai hanya membuat
  "pakai primitif EmptyState" jadi instruksi yang ambigu.
- Koreksi angka audit: beberapa figur di rencana revamp sebelumnya terlalu tinggi
  karena pola grep yang salah. Yang benar: `Button` dan `Card` dari `components/ui/`
  nol pemakaian (bukan 5 dan 21), `window.confirm` hanya di 1 berkas (bukan 21),
  1.003 hex di kode, 826 `<button>` mentah, 765 teks di bawah 11px, 38% class warna
  sudah memakai token. Temuan sebenarnya lebih tajam: primitif umpan balik (toast,
  confirm, skeleton) sudah diadopsi luas, primitif struktural (Button, Card,
  IconButton, EmptyState) nol.

## v2.6.10 — 2026-10-23

**Satu pemilik untuk dark mode, dan primitif UI ganda dimatikan.**

- Dark mode sebelumnya dimiliki empat komponen secara terpisah, dan dua di antaranya
  tidak sepakat soal di mana class `dark` dipasang: `App.tsx` membungkus situs
  marketing dengan `<div className="dark">` dan tidak pernah menyentuh
  `documentElement`, sementara Nasabah, Admin CMS dan Operator memasangnya di
  `documentElement`. Akibatnya class `dark` yang ditinggalkan satu portal tetap
  menempel saat pengguna pindah ke situs marketing: token `--ds-*` di `<html>`
  sudah berbalik ke nilai gelap, sementara wrapper `div` mengira halamannya terang.
  Wrapper itu hanya menguasai varian `dark:` di subtree-nya dan tidak bisa
  membatalkan pembalikan token di root, jadi permukaan berbasis token dan turunan
  `dark:` tampil gelap di halaman yang seharusnya terang.
- Admin CMS juga tidak bisa mengingat pilihan mode terang: state-nya di-seed dari
  `useState(true)` dan tidak pernah menulis preferensi balik. Sekarang CMS tetap
  membuka gelap bila pengguna belum pernah memilih, tapi pilihan pengguna tersimpan
  dan bertahan setelah reload.
- Keempatnya kini memakai satu modul, `components/shared/theme.ts`: satu kunci
  localStorage, satu tempat class dipasang, satu jawaban untuk "apakah app sedang
  gelap". 6 unit test baru.
- `components/shared/UI.tsx` mengekspor `Button` kedua di samping primitif
  `components/ui/Button.tsx` — dua komponen berbeda dengan nama sama, tinggi, radius
  dan kosakata varian yang berbeda. Keduanya nol pemakaian bersama `GlassCard`, jadi
  dihapus. `Badge` tetap ada dan sekarang memakai token `ds-*`, bukan class palet mentah.
- Guardrail baru: ESLint menolak warna hex yang ditulis langsung di
  `components/ui/**`. Lapis primitif itu dipakai enam portal dan kini bebas hex;
  aturan ini mengunci keadaannya sebelum drift kembali. Hijau brand WhatsApp
  dipindah ke token `--ds-whatsapp`, dan gradien hero `ReferralCard` memakai
  `--ds-surface-hero` yang sudah ada.
- Diverifikasi di browser (Chromium, server dev lokal): 9/9 asersi lolos — token
  `--ds-bg` berbalik `#F4F7FB` ↔ `#1A1D29`, permukaan ter-render benar-benar
  berganti cat, preferensi bertahan setelah reload, dan tidak ada lagi wrapper
  `div.dark` di bawah `<html>`.
- Catatan terpisah, belum diperbaiki: `index.html` meng-hardcode
  `body { background: #fafaf9; color: #1e293b }` tanpa pasangan gelap, jadi `body`
  sendiri tidak pernah ikut bertema. Tidak termasuk cakupan rilis ini karena
  mengubah cat setiap halaman; dicatat untuk fase tipografi/permukaan berikutnya.
- Tidak mengubah logika bisnis, autentikasi, otorisasi, perhitungan premi/komisi,
  maupun kontrak data-gateway.

## v2.6.9 — 2026-10-23

**Posisi scroll kembali ke atas saat berpindah menu di semua portal.**

- Setiap portal menyimpan `activeTab` sendiri, jadi berpindah view adalah perubahan
  state — bukan navigasi dokumen — sehingga browser tidak punya alasan memindahkan
  posisi scroll. Akibatnya view yang dibuka dari tengah daftar panjang muncul dalam
  keadaan sudah ter-scroll, dan animasi `sp-page-enter` jalan di luar layar.
- Sebelumnya hanya portal Nasabah yang menanganinya. Sekarang Nasabah, Mitra,
  Operator, Insurer, B2B, dan Admin CMS memakai satu primitif bersama
  (`components/shared/scrollReset.ts`).
- Admin CMS: area konten adalah container scroll sendiri, jadi reset dilakukan pada
  container itu — bukan window. Keenam titik navigasi CMS (menu sidebar, kartu KPI
  dashboard, kartu Transaksi Overview, kartu Online Users, dan dua jalur notifikasi)
  kini melewati satu handler.
- Portal Nasabah dulu memaksa `behavior: 'smooth'`; sekarang scroll halus ikut
  dimatikan bila pengguna memilih `prefers-reduced-motion`.
- Tidak mengubah logika bisnis, autentikasi, otorisasi, perhitungan premi/komisi,
  maupun alur pembayaran. Perubahan perilaku navigasi UI saja.

## v2.6.8 — 2026-10-22

**Responsive UI, smooth motion, and warm orange accents.**

- Added a restrained orange secondary accent while keeping emerald as the primary brand color; light and dark themes have coordinated tokens.
- Refined authenticated portal interactions with quicker transitions, subtle hover/press feedback, visible touch targets, and less intrusive screen-entry motion.
- Improved mobile form sizing, horizontal table scrolling, and small-screen overflow behavior.
- Respects reduced-motion preferences and avoids changing business logic, pricing, authorization, or transaction rules.

## v2.6.7 — 2026-10-22

**Revamp alur penawaran dan pembelian agen.**

- Kartu tier yang besar dipindahkan dari beranda ke bagian Profil; beranda tetap menampilkan badge tier yang ringkas.
- Alur produk agen menampilkan pilihan Buat Penawaran atau Beli Langsung sebelum input untuk produk non-kendaraan; pembelian langsung diarahkan ke wizard produk.
- Penawaran kendaraan kini membawa data klien, kendaraan, coverage, perluasan, dan diskon ke wizard pembelian sehingga agen hanya melengkapi data yang belum tersedia.
- Form penawaran menambahkan diskon estimasi (maksimum 15%); diskon final tetap tunduk pada batas produk/insurer dan persetujuan.
- PWA version badge dan update notification menggunakan versi 2.6.7.

## v2.6.6 — 2026-10-22

**Keandalan dashboard keamanan admin.**

- Dashboard keamanan kini menangani kegagalan pemuatan dan menampilkan pesan serta tombol coba lagi; polling tidak lagi membiarkan rejection tidak tertangani.
- Analytics mempertahankan label periode GWP berbasis tahun-bulan dan tidak menampilkan Claims Ratio sebelum denominator premi tervalidasi tersedia.
- Pemeriksaan akses action server tetap perlu diuji dengan akun tiap role; perubahan ini bukan sertifikasi keamanan menyeluruh.


## v2.6.5 — 2026-10-22

**Perbaikan akurasi analytics admin.**

- Tren GWP enam bulan memakai kunci tahun-bulan, sehingga Januari dari tahun berbeda tidak tercampur dan label periode menunjukkan tahun.
- Claims Ratio ditampilkan `N/A` sampai denominator premi yang sebanding dan tervalidasi tersedia; mencegah persentase menyesatkan dari baris klaim saja.
- Ini perubahan frontend analytics; definisi dan query denominator server masih memerlukan validasi bisnis sebelum rasio dapat diaktifkan kembali.


## v2.6.4 — 2026-10-22

**Notifikasi update aplikasi dan konsistensi versi.**

- Notifikasi pasca-pembaruan menampilkan versi yang aktif kepada pengguna PWA yang sudah dikendalikan service worker.
- Jika service worker berganti saat aplikasi terbuka, tampilkan notifikasi pembaruan dengan tindakan muat ulang.
- Versi aplikasi diselaraskan: `src/version.ts`, `package.json`, dan Android `versionName` menjadi 2.6.4; Android `versionCode` naik dari 16 ke 17.
- Catatan perubahan ini menjadi sumber urutan versi berikutnya; setiap rilis harus menaikkan versi semver dan Android versionCode.
- Batasan: notifikasi dalam aplikasi hanya terlihat ketika aplikasi dibuka/aktif; perangkat tidak dapat dipaksa menampilkan pop-up ketika aplikasi benar-benar tertutup.

## v2.6.3 — 2026-10-22

**Notifikasi pembaruan aplikasi.**

- Naikkan versi aplikasi ke v2.6.3 agar instalasi PWA yang pernah mencatat versi sebelumnya dapat mendeteksi pembaruan.
- Pop-up pada aplikasi terpasang menampilkan versi terbaru dan tombol **Buka ulang** untuk memuat versi terbaru.
- Selaraskan versi package dan versi Android (`versionCode` 16, `versionName` 2.6.3).
- Catatan: notifikasi muncul saat aplikasi terpasang dibuka; situs web tidak dapat memaksa membuka aplikasi di perangkat secara otomatis.


## Login page revamp — 2026-10-13 (proposed)

- Add a responsive SurePath-green hero panel and refine login-card spacing, field styling, and mobile safe-area padding.
- Keep the existing official SurePath logo component, sign-in/register modes, Google OAuth, email OTP/magic link, password reset, and existing authentication/profile resolution unchanged.
- UI-only change; no backend, authorization, role, or business-flow changes.


---

> **Skema versi baru mulai rilis ini.** Deret `1.x` ditutup di v1.57.0; penomoran dilanjutkan dari **2.1.0**.

## v2.6.2 — 2026-10-22

**Pesan gagal analisa Pathy jadi ramah, dan layar Masuk/Daftar lebih terbaca.**

- **Analisa foto kendaraan:** bila analisa Pathy gagal, pengguna kini melihat
  *"Mohon maaf, kami sedang offline saat ini."* (permintaan pemilik). Sebab
  teknisnya tidak dibuang — tetap tercatat di `console.warn` dan di rekaman
  percakapan Pathy (CMS) supaya masih bisa ditelusuri. Pesanan tetap lanjut
  dengan verifikasi manual.
- **Login & daftar (`AuthGate.tsx`)** — tampilan saja, alur autentikasi tidak
  berubah:
  - Teks error/peringatan tadinya merah/kuning pucat (`rose-400`, `red-400`,
    `amber-400`) di atas putih — nyaris tak terbaca. Kontrasnya dinaikkan.
  - Label mini 0,5–0,6rem (tab Masuk/Daftar, Nasabah/Mitra, "Lupa password?",
    pemisah, footer) dinaikkan ke ukuran terbaca.
  - Tombol Nasabah/Mitra yang belum dipilih dulu abu pucat — tampak seperti
    tombol nonaktif padahal wajib dipilih. Kini jelas bisa ditekan.
  - Aksesibilitas: tab Masuk/Daftar memakai `role="tab"` + `aria-selected`,
    pilihan peran memakai `aria-pressed`, input nama/OTP/password baru dan
    tombol tampilkan-password diberi label; `autoComplete` untuk nama, OTP, dan
    password baru.
  - Bahasa: "Reset Password" → "Atur Ulang Password", "Secure Connection" →
    "Koneksi aman".

## v2.6.1 — 2026-10-21

**Analisa foto kendaraan: penyebabnya ditemukan, dan analisanya kini milik Pathy.**

Laporan pemilik: analisa foto AI di menu pembelian asuransi kendaraan tidak
berfungsi.

Sisi server ternyata SEHAT, dan itu dibuktikan bukan diasumsikan: kunci
OpenRouter diuji langsung dan menjawab 200, model `openai/gpt-4o` ada di
allowlist `ai-proxy`, dan fungsinya terdeploy. Yang menentukan justru log
produksi: **`ai-proxy` nol invokasi dalam 24 jam** padahal fiturnya dilaporkan
mati. Permintaannya memang tidak pernah dikirim — jadi kegagalannya di klien,
sebelum apa pun keluar.

- **`compressImageBase64()` bisa menggantung selamanya.** Ia dipanggil SEBELUM
  setiap permintaan AI, dan promise-nya hanya diselesaikan di `onload` atau
  `onerror`. Kalau dua-duanya tidak pernah menyala — HEIC/HEIF dari iPhone pada
  sebagian browser, berkas rusak, data URL terpotong — `await` tidak pernah
  kembali: spinner menyala terus, nol permintaan, nol error. Sekarang promise-nya
  dijamin selesai (penjaga sekali-pakai + timeout 10 detik), dan gagal kompresi
  memulangkan gambar asli supaya pemanggilnya jalan terus. Perbaikan ini juga
  menyembuhkan jalur lain yang memakai fungsi sama: validasi foto, OCR STNK/KTP,
  analisa klaim.
- **Sebab kegagalan kini ditampilkan.** Dulu semua sebab diganti menjadi "AI
  tidak tersedia", sehingga laporan datang tanpa satu petunjuk pun dan harus
  ditelusuri dari nol. Sekarang pesannya membawa sebab aslinya.
- **Analisa dilakukan Pathy.** Jalurnya lewat `services/pathyVision.ts`, dan
  hasilnya ikut tercatat di rekaman percakapan Pathy (`sp_pathy_messages`)
  sehingga muncul di CMS bersama percakapan Pathy lainnya. Label UI mengikuti.
- Perekaman tidak boleh pernah menggagalkan analisa yang sudah berhasil. `void`
  saja tidak cukup — ia tetap mengevaluasi ekspresinya, jadi throw sinkron akan
  merambat. Ditemukan oleh ujinya sendiri, lalu ditutup dengan try/catch.

**Batasan yang perlu diketahui:** `pathy-agent` hari ini TIDAK bisa melihat
gambar — parameter `documents`-nya hanya menerima field teks, dan
`sanitizeDocuments()` membuang objek/array. Jadi panggilan vision-nya masih
lewat `ai-proxy`, satu-satunya jalur vision yang ada dan terbukti sehat.
Memindahkannya ke dalam `pathy-agent` butuh kemampuan vision baru di sisi
server, dan itu berarti men-deploy `pathy-agent` — yang per 21 Okt berarti
menaruh fungsi kedua di jalur darurat. Belum dilakukan, dan sengaja.

Dua pemanggil lain (`VehicleUnderwritingWizard` di apps mitra dan
`MPARInsuranceWizard`) masih memanggil jalur vision langsung, jadi hasilnya
tidak masuk rekaman Pathy. Perbaikan anti-gantung tetap berlaku untuk keduanya.

tsc bersih · ESLint 0 error · 294/294 uji · build bersih

## v2.6.0 — 2026-10-21

**CRM & KPI marketing/sales — Fase 1.** Portal baru `/marketingapp` untuk karyawan
ber-role `MARKETING`: pipeline rekrutmen agen, daftar agen yang dipegang,
pencatatan follow-up, dan antrean tindakan.

Dibangun **lebih dulu** dari Fase 0 (tulang belakang produksi) dengan sengaja,
karena bagian CRM tidak bergantung pada data produksi sama sekali — semua yang
dibutuhkan pipeline sudah ada di `sp_users`.

- **Peran baru `MARKETING`**, dan ia **tidak** masuk `ADMIN_ROLES` maupun
  `FINANCE_ROLES`: ia mengelola orang, bukan uang.
- **`sp_users.handler_id` dipisah dari `upline_id`.** `upline_id` semantiknya
  referral antar-agen dan per 21 Okt 2026 terisi 0 dari 47 baris. Menumpanginya
  akan mencampur dua hubungan berbeda dan membuat komisi override tidak bisa
  dipertanggungjawabkan.
- **`sp_agent_handler_history` append-only, ditulis oleh TRIGGER** — bukan oleh
  kode aplikasi. Alasannya bukan kerapian: override dihitung dari siapa yang
  memegang agen saat polis terbit, jadi kalau hanya nilai terkini tersimpan,
  komisi historis berubah diam-diam. Trigger-nya dibuktikan di produksi untuk
  tiga kasus: penugasan membuka 1 baris, update dengan handler sama tidak
  menambah baris, pelepasan menutup baris.
- **`sp_marketing_activities`** dengan `next_action` + `next_action_at` — dua
  kolom itu yang mengubah buku harian menjadi CRM, karena darinya lahir antrean
  "janji lewat tanggal".
- **Antrean diurutkan berdasarkan UMUR**, mengikuti pola `OpsConsoleView`:
  daftar yang diurutkan tanggal buat membuat yang mandek tenggelam.
- **Kolom angka produksi belum dimunculkan**, dan itu dinyatakan terbuka di UI.
  Sumbernya belum sah: `sp_payments` 0 baris, `sp_commissions` 0 dari 13 tertaut
  order, `policy_number` 0 dari 5 terisi. Menampilkannya sekarang berarti angka
  yang meyakinkan dan salah.
- **Kartu "Marketing pendamping Anda"** di profil agen, read-only. Agen tidak
  bisa mengganti handler-nya sendiri — kalau bisa, ia bisa mengalihkan komisi
  orang lain.
- Penugasan manual **ADMIN saja**; seorang marketing tidak bisa menugaskan agen
  ke dirinya sendiri.
- Tabel baru deny-all RLS; seluruh akses lewat `data-gateway`, otorisasi subtree
  per aksi di `actions/marketing.ts`.

tsc bersih · ESLint 0 error · 288/288 uji · build bersih

> **Catatan deploy:** aksi gateway baru belum aktif di produksi sampai
> `data-gateway` di-deploy ulang. Lihat `docs/INCIDENT_2026-10-21_data-gateway.md`.

## v2.5.20 — 2026-10-21

### PDF penawaran Pathy: generatornya tidak pernah gagal, pengirimannya yang gagal diam

Dilaporkan "PDF-nya tidak berfungsi". Yang ditemukan justru sebaliknya: PDF-nya **selalu berhasil dibuat**.

Dibuktikan dengan menjalankan payload `sp_quotes` produksi terbaru (20 Okt) lewat jalur yang persis dipakai tombol itu — `fromAgentQuote()` → `generateQuotationSlipPDF()` — dan keduanya lolos. Server Pathy juga sehat: 7 quotation tersimpan, terakhir sehari sebelum laporan.

Akarnya ada di langkah terakhir. `doc.save()` bekerja lewat `<a download>`, dan **WebView Android tidak menghormati atribut `download`**: tidak ada berkas, tidak ada error, tidak ada apa pun. PDF selesai dibuat di memori lalu hilang. Di dalam shell native berkas kini dibuka sebagai blob supaya WebView menyerahkannya ke penangan PDF sistem; browser biasa tetap memakai jalur unduh lama. Tanpa plugin baru — `@capacitor/filesystem` akan menuntut build ulang native.

Sekalian dikeraskan: `fromAgentQuote()` dulu memanggil `q.rows.find(...)` tanpa penjaga, jadi satu bentuk quotation tanpa `rows` mematikan seluruh unduhan dengan `Cannot read properties of undefined`. Setiap nilai sudah punya fallback-nya sendiri, jadi daftar kosong kini tetap menghasilkan slip yang benar.

### Pathy layar penuh

Panel Pathy dulu 22rem × 70vh di pojok. Ia menampilkan proposal, tabel opsi dan kartu PDF — isi yang terlalu besar untuk lubang sekecil itu. Kini layar penuh, menghormati safe-area notch/gesture bar, dan `aria-modal` dijujurkan jadi `true` karena ia memang menutupi seluruh layar.

### Tab aktif kini terlihat

Status aktif di navigasi bawah dulu hanya dibedakan **warna** hijau pada ikon dan label — terlalu halus untuk dilihat sekilas, dan tidak terbaca sama sekali oleh mata yang sulit membedakan warna. Kini tab aktif mendapat batang penanda, latar bertint, dan garis ikon yang lebih tebal: tiga isyarat, salah satunya bentuk. Tombol tengah mendapat ring saat aktif.

## v2.5.19 — 2026-10-21

### Financing Core tidak lagi terdaftar di situs publik

Permintaan pemilik: hanya yang punya tautannya yang bisa masuk; orang umum tidak menemukannya dari website.

Financing punya **tiga** pintu masuk dari situs, bukan satu — dan itu yang membuatnya mudah setengah-selesai:

| Pintu masuk | Letak |
|---|---|
| Entri navbar `Pembiayaan / Financing` | `NAV_LINKS` — satu entri ini mengisi menu **desktop dan mobile** sekaligus |
| Tombol CTA `Masuk Pembiayaan` (desktop) | header `SiteNav` |
| Tombol CTA `Masuk Pembiayaan` (mobile) | menu tarik-turun |

Ketiganya dihapus, plus impor ikon `WalletCards` yang jadi menganggur. Nol rujukan `/financing` tersisa di `SiteLayout`.

**Rutenya sengaja dibiarkan hidup** — itu intinya. `/financing` dan `/financing/dashboard` tetap dilayani, jadi tautan yang sudah dibagikan tetap berfungsi.

**Tidak ditambahkan ke `robots.txt`**, dan itu keputusan sadar: berkas itu bisa dibaca siapa pun, jadi menulis `Disallow: /financing` di sana justru mengumumkan alamat yang ingin disembunyikan. Tidak perlu pula — `/financing` tidak terdaftar di `PAGES` milik `src/seo/seo.ts`, sehingga `resolveSeo()` sudah memulangkan `noindex` untuk path tak dikenal, dan ia memang tidak ada di `sitemap.xml`. Diperiksa, bukan diasumsikan.

9 uji baru menjaganya dari dua arah berlawanan: tautannya tidak boleh kembali, **dan** rutenya tidak boleh ikut terhapus saat ada yang "merapikan". Uji itu dibuktikan merah lebih dulu dengan mengembalikan entri navbar sementara — penjaga yang belum pernah terbukti gagal tidak menjaga apa pun.

**Catatan penting:** tidak terdaftar bukan kontrol akses. Siapa pun yang tahu alamatnya tetap masuk, dan rutenya terbawa di bundel JS. Data produksi tetap aman di sisi server (`financing-api` menolak tanpa peran financing yang sah), tapi ruang kerja demo-nya terbuka bagi siapa pun yang sampai ke URL itu.

## v2.5.18 — 2026-10-13

### Penyegaran UI lintas portal

- Modernisasi onboarding dengan identitas warna hijau SurePath dan layout yang lebih nyaman di mobile.
- Perbaikan hierarki teks, jarak konten, dan target sentuh pada portal nasabah dan agen.
- Perbaikan safe-area dan navigasi mobile pada portal operator dan B2B, serta padding responsif pada admin.
- Tidak ada perubahan yang dimaksudkan pada flow bisnis, kalkulasi premi, backend, autentikasi, atau hak akses.

## v2.5.17 — 2026-09-15

### Rekaman percakapan Pathy per pengguna, terlihat di CMS

Pathy selama ini **tidak menyimpan apa pun** — tidak ada satu pun `insert` di `pathy-agent`. Setiap percakapan hilang begitu tab ditutup, jadi tidak ada cara menelusuri keluhan pengguna, dan tidak ada cara tahu apa yang sebenarnya ditanyakan orang.

Menu **Rekaman Pathy** di CMS: ringkasan per pengguna (berapa percakapan, berapa pesan, terakhir kapan) → klik → transkrip lengkap, dikelompokkan per percakapan, dengan penanda tool yang dipakai dan jawaban yang *degraded*.

**Ditulis dari browser, bukan dari agen — dan itu bukan kompromi keamanan.** `pathy-agent` belum bisa di-deploy dari lingkungan ini, dan menunggu berarti fitur ini tidak ada sama sekali. Browser memang peserta percakapannya, jadi ia tahu isinya. Yang tidak dipercayakan padanya adalah **identitas**: `user_id`, `user_email` dan `source` ditimpa dari JWT oleh trigger database sebelum baris tersimpan. Diuji langsung di produksi dengan menyamar sebagai dua pengguna: A mencoba menulis atas nama B dan mengaku `source=AGENT` — keduanya ditolak, dan B tidak bisa melihat satu pun baris A.

RLS: pemilik membaca miliknya sendiri, admin membaca semua, dan **tidak ada policy UPDATE/DELETE sama sekali** — ini rekaman, bukan draf. Append-only untuk semua peran, admin sekalipun.

Perekaman duduk di pembungkus `pathyChat`, bukan di dalamnya, karena jalur suksesnya ada empat; menempelkannya satu per satu berarti cepat atau lambat ada yang terlewat — dan cacat semacam itu diam.

13 uji mengunci dua hal yang paling mahal kalau salah: perekaman **tidak pernah** boleh menggagalkan obrolan (RLS menolak, jaringan putus — dua-duanya harus lewat tanpa melempar), dan ringkasan per pengguna harus menghitung benar.

### Catatan jujur soal Jejak Aktivitas

Tabel `sp_activity_log` **sudah ada di produksi, tapi 0 baris dan tanpa satu pun RLS policy** (deny-all, gateway-only). Penulisnya ada di dispatcher `data-gateway` yang belum ter-deploy, jadi menu Jejak Aktivitas masih kosong dan akan tetap kosong sampai gateway naik. Itu tidak berubah di rilis ini.

## v2.5.16 — 2026-09-15

### Konsol Operasi — CMS akhirnya bisa menunjukkan apa yang TIDAK terjadi

CMS selama ini bisa menampilkan apa yang **ada**, tapi tidak apa yang **seharusnya ada tapi tidak terjadi**. Untuk bisnis asuransi, justru yang kedua itu uangnya: 5 order mandek sejak Juli dan **0 invoice** pernah terbentuk sepanjang aplikasi hidup — dua-duanya tidak salah di layar mana pun, karena tidak ada layar yang menghitung selisih antar tahap.

Menu **Konsol Operasi** ditaruh paling atas, di atas Dashboard, karena ini yang harus dibuka duluan.

**Corong** — order dibuat → invoice terbit → dibayar → polis terbit. Selisih antar tahap ditampilkan *di antara* tahapnya (`−2`), bukan sebagai kolom terpisah, supaya kebocoran terbaca sebagai bagian dari alur dan bukan statistik yang harus dicari sendiri. Kondisi "ada order, nol invoice" memunculkan peringatan eksplisit: itu menghentikan pendapatan sepenuhnya, bukan memperlambatnya.

**Antrean bertindak** — diurutkan berdasarkan **umur**, bukan tanggal buat. Order berumur 60 hari harus berteriak, dan pengurutan terbaru-di-atas justru menguburnya. Antrean menjawab "siapa yang harus bergerak", bukan sekadar "order ini di mana": `APPROVED` tanpa invoice dan `APPROVED` dengan invoice belum dibayar punya status yang **sama persis** tapi pekerjaannya di meja orang yang berbeda — yang pertama kebocoran uang, yang kedua menunggu nasabah. Nilai rupiah yang menunggu ditagih dijumlahkan.

**Tidak menunggu deploy gateway.** Seluruhnya komposisi ulang dari dua action yang sudah hidup di produksi sejak 16 Juli (`admin_list_orders`, `admin_list_payments`) — diverifikasi byte-identical antara versi terpasang dan repo sebelum dipakai. Lapis 1 di `docs/CMS_ARCHITECTURE.md` selesai.

12 uji baru mengunci aritmetikanya — termasuk kasus invoice kedaluwarsa setelah dibayar (tidak boleh membatalkan pembayaran), order batal/ditolak (keputusan, bukan kebocoran), dan tanggal yang hilang (tidak boleh menyamar sebagai paling mendesak).

## v2.5.15 — 2026-09-14

### Submenu website berlatar hitam — video-nya tidak dihapus, justru ditambahkan

Empat dari sepuluh halaman situs berlatar hitam polos sementara sisanya memutar video. Penyebabnya ternyata **dua hal berbeda**, dan itu yang membuatnya tidak selesai dengan satu perbaikan.

**Penyebab 1 — `bgVideo` tidak dikirim.** `SiteLayout` memakai
`background: bgVideo ? 'transparent' : th.sectionBg1`, jadi tanpa prop itu latarnya jatuh ke `hsl(222 47% 11%)`. Contact dan StaticInfo (rumah semua submenu: Privasi, Syarat, Cookie, FAQ) tidak pernah mengirimnya.

**Penyebab 2 — section-nya opaque.** Ini yang lebih halus. Menambahkan `bgVideo` saja **tidak cukup**: kedua halaman membungkus isinya dalam `<section style={{ background: sectionBg2 }}>` yang menutupi video dari atas.

Bukti bahwa ini memang akarnya — halaman yang video-nya terlihat tidak memakai `sectionBg` sama sekali:

| Halaman | pemakaian `sectionBg` | video terlihat |
|---|---|---|
| About, Products | **0** | ✅ |
| Contact | 5 | ❌ |
| StaticInfo | 2 | ❌ |

Jadi section-nya dibuat transparan, mengikuti bentuk yang sudah benar di About/Products. Kartu di dalamnya **tetap opaque** — `sectionBg3` di Contact baris 111 sengaja dibiarkan, karena itu kotak berisi teks yang harus tetap terbaca di atas video.

### Dua halaman lain: hitam hardcoded, di luar `SiteLayout`

`BlogPage` (`#0a0a0a`) dan `ProductInfoPage` (`hsl(0 0% 8%)`) tidak memakai `SiteLayout` sama sekali, jadi prop apa pun tidak akan menyentuhnya. Keduanya diberi `<video>` fixed sendiri — persis pola yang sudah terbukti jalan di `PremiumCalculatorPage`, yang juga di luar `SiteLayout`.

Latarnya tidak dibuat transparan melainkan **scrim semi-transparan** `rgba(6,9,18,0.86)`, nilai yang sama dipakai halaman kalkulator: keduanya halaman bacaan panjang, dan bobot itu menjaga teks tetap terbaca sementara geraknya tetap tembus.

Satu ketidakselarasan lagi ikut ketahuan: `ProductInfoPage` memaksa `body { background: hsl(0 0% 8%) !important }` — **hitam yang berbeda** dari `hsl(222 47% 11%)` milik situs. Dua hitam berbeda itu sendiri sudah jadi sumber ketidakselarasan; kini disamakan.

### Hasil

| | Sebelum | Sesudah |
|---|---|---|
| Halaman dengan latar video | 6 / 10 | **10 / 10** |
| Latar hitam hardcoded | 4 | **0** |

Tidak ada satu pun video yang dihapus. `bg4` yang tadinya hanya dipakai kalkulator kini tetap di sana; `bg1`–`bg3` dipakai ulang agar halaman bersebelahan tidak kembar.

---

## v2.5.14 — 2026-09-13

### Jejak aktivitas per pengguna, dicatat di satu titik

Sebelum ini tidak ada log aktivitas pengguna sama sekali. Yang terlihat seperti log ternyata bukan:

| Tabel | Isi sebenarnya |
|---|---|
| `sp_page_views` (1.101 baris) | halaman + user agent — **tanpa identitas pengguna** |
| `sp_user_sessions` (24) | heartbeat `last_seen`, bukan aktivitas |
| `sp_audit_log` (4) | perubahan baris DB, hanya ditulis AI agent + trigger |
| `sp_insurer_activity_log` (0) | khusus insurer, ditempel manual di 6 tempat |

`sp_activity_log` baru menjawab pertanyaan yang berbeda: **siapa melakukan apa, mengakses apa, dan apa yang ditolak.**

Ditulis di **dispatcher data-gateway**, bukan ditempel di 100+ action satu per satu. Itu keputusan arsitektural: setiap aksi terautentikasi lewat satu titik itu dengan `caller` yang sudah diverifikasi, jadi cakupannya lengkap dengan sendirinya dan tidak bisa dipalsukan klien — alasan yang sama kenapa gerbang kepercayaan v2.5.6 juga duduk di sana. Penolakan ikut dicatat; percobaan yang gagal justru bagian paling berguna untuk keamanan.

**Nilai parameter sengaja tidak pernah disimpan** — hanya nama kuncinya. Payload aplikasi ini membawa NIK, foto base64, dan kata sandi; menyalinnya ke tabel audit hanya menciptakan salinan kedua dari data yang sedang kita lindungi. `action` + `target_id` + nama kunci sudah cukup menjawab "mengakses apa" tanpa itu.

Menu **Jejak Aktivitas** di CMS punya dua mode: ringkasan per pengguna (siapa paling aktif, berapa ditolak, terakhir kapan) lalu klik untuk turun ke rinciannya. Membuka langsung ke ribuan baris mentah hanya memindahkan pekerjaan menyaring ke mata admin.

Tulisan audit bersifat *fire-and-forget* — sebuah log tidak boleh menggagalkan permintaan yang sedang dicatatnya.

### `docs/CMS_ARCHITECTURE.md`

Menjawab "CMS seharusnya berfungsi bagaimana dan tersambung ke apps bagaimana".

Intinya: **tidak ada backend CMS terpisah.** CMS, apps nasabah, apps mitra, operator, dan asuransi berbagi satu database dan satu pintu — data-gateway. Jadi **kemampuan CMS = daftar action `admin_*` di gateway**, tidak lebih, dan tidak ada push dari CMS ke apps (apps menarik saat dibuka; kalau butuh seketika, jalurnya notifikasi).

Diagnosisnya: CMS ini **editor konfigurasi, bukan konsol operasi**. Dari 25 menu, mayoritas menjawab "atur sekali lalu ditinggal". Buktinya nyata — 5 order mandek sejak Juli tanpa ada yang sadar, 0 invoice sepanjang hidup aplikasi, `pathy-agent` tertinggal berhari-hari. Polanya satu: **CMS bisa menampilkan apa yang ADA, tapi tidak apa yang SEHARUSNYA ada tapi tidak terjadi** — dan untuk bisnis asuransi, justru yang kedua itu uangnya.

Usulan berikutnya, tanpa tabel baru: antrean bertindak diurutkan berdasarkan **umur**, dan corong order → invoice → bayar → polis.

### ⚠️ Belum aktif sampai gateway di-deploy

Tabel sudah ada di produksi dan menunya sudah naik lewat Vercel, tapi **penulis dan pembacanya ada di data-gateway** yang masih belum ter-deploy. Sampai koneksi Supabase↔GitHub dibuat, layarnya hidup tapi datanya kosong. Layar kosong itu menjelaskan sendiri penyebabnya, bukan diam.

---

## v2.5.13 — 2026-09-13

### Nasabah dirayakan atas polis yang tidak pernah ditagih

Ini penyebab **5 order / 0 invoice / 0 pembayaran**, dan jauh lebih buruk daripada sekadar funnel mampet.

Di `CarInsuranceWizard`, saat pembuatan invoice gagal:

```ts
if (invoice?.invoice_url) { link = invoice.invoice_url; window.open(link); }
// ...tidak ada else
setInvoiceUrl(link);       // null
setIsSuccess(true);        // layar sukses
setShowBurst(true);        // confetti
```

Nasabah menyelesaikan seluruh wizard, pembuatan tagihan gagal diam-diam, lalu **aplikasi merayakannya dengan confetti**. Layar sukses hanya menampilkan tautan bayar lewat `{invoiceUrl && ...}` — jadi yang terlihat adalah "Pesanan Diterima" tanpa satu pun cara membayar. Mereka pulang dengan keyakinan sudah punya polis yang tidak pernah ada tagihannya.

Sekarang kegagalan ditampilkan apa adanya: pesanan **tetap disimpan** (membuangnya hanya akan memancing pesanan ganda), confetti tidak jalan, dan muncul blok amber berisi nomor pesanan plus kalimat yang tidak bisa disalahpahami — *"Polis kamu belum aktif sampai premi dibayar."*

Tiga titik lain dengan pola yang sama ikut diperbaiki:

| Berkas | Dulu | Sekarang |
|---|---|---|
| `CarInsuranceWizard` | confetti + tanpa tautan bayar | blok amber + nomor pesanan |
| `CustomInsuranceWizard` | `setError` ada tapi dirender di form, sedangkan layar sukses mengambil alih | pesan dipindah ke layar sukses |
| `PAInsuranceWizard` | sama — `submitError` tidak pernah terlihat | pesan dipindah ke layar sukses |
| `AgentOrderStatus` | tombol Bayar berhenti berputar, tanpa kata | banner amber + nomor pesanan |

Dua di antaranya menarik: `setError` **sudah dipanggil**, hanya saja dirender di cabang form sementara `if (isSuccess)` mengambil alih layar lebih dulu. Perbaikan pertama saya sendiri kena jebakan ini dan baru ketahuan saat diperiksa ulang.

`VehicleUnderwritingWizard` sudah benar sejak awal dan tidak disentuh.

### Dua lubang keamanan dari advisor — sudah ditutup di produksi

Keduanya bisa dijangkau hanya dengan anon key yang memang ikut terkirim ke browser.

**`sp_db_object_backup` tanpa RLS.** Tabel ini menyimpan kolom `definition` — sumber SQL fungsi, trigger, dan policy database. Siapa pun bisa membacanya: peta lengkap logika keamanan sisi server. RLS dinyalakan, deny-all, sama seperti tabel sensitif lain.

**`soft_delete()` bisa dipanggil pengguna biasa.** `SECURITY DEFINER`, dan satu-satunya pemeriksaannya adalah "sudah login" — **tidak ada cek kepemilikan**. Nasabah mana pun yang memegang sebuah row id bisa menghapus komisi, penarikan, atau pembayaran milik agen lain. `force_delete()` sebenarnya aman (ada `is_admin()`), tapi keduanya **tidak dipanggil dari kode aplikasi sama sekali** — diverifikasi di `services/`, `components/`, dan `supabase/functions/`. Keduanya alat operator, jadi PUBLIC memang tidak pernah butuh EXECUTE. Dicabut; `service_role` tidak terpengaruh.

Diverifikasi setelah migrasi: `anon` dan `authenticated` kini `false`, `service_role` tetap `true`.

---

## v2.5.12 — 2026-09-12

### Apps mitra: hijaunya ternyata bukan hijau brand

169 hex hardcoded di `components/agent/` diganti token. Yang paling menonjol: **`#16a34a` dipakai 116 kali** — itu Tailwind green-600, sedangkan primary SurePath adalah `#00C16A`. Tidak ada token yang mendefinisikannya dan tidak ada dokumen yang menyebutnya sebagai warna mitra; ini drift, bukan sub-brand. Itulah sebabnya apps mitra selalu terasa "hampir" sewarna dengan produk lain tapi tidak pernah persis.

Kelompok kedua lebih halus: beberapa hex adalah **salinan literal nilai token mode-gelap** —

| Hex | Sebenarnya |
|---|---|
| `#8E95A8` | `--ds-text-muted` (dark) |
| `#2C3142` | `--ds-surface-2` (dark) |
| `#3A3F52` | `--ds-border` (dark) |
| `#242836` | `--ds-surface` (dark) |
| `#B8BFD0` | `--ds-text-secondary` (dark) |

Disalin sebagai konstanta, nilai-nilai itu membeku di versi gelap dan tidak bisa mengikuti tema di mode terang.

**Kelas `slate/gray` mentah di apps mitra sengaja TIDAK disentuh.** Berbeda dari CMS, apps mitra sudah light-first dan sehat: 464 varian `dark:`, root sudah `bg-ds-bg dark:bg-ds-dk-bg`. Mengganti `text-slate-400` yang berpasangan dengan `dark:text-slate-500` justru merusak — token-nya akan dikalahkan oleh override `dark:` di sebelahnya. Itu perlu penggantian berpasangan, bukan per kelas.

**Apps nasabah tidak diubah** — sudah bersih sejak awal: 198 token, 0 warna mentah, 0 hex.

### Kesiapan rilis Android

`versionName` masih **"1.0.1"** sementara aplikasi sudah 2.5.11 — dua puluhan rilis melenceng. Upload Play dengan versi salah tidak bisa dikaitkan dengan laporan crash atau entri changelog, dan tidak ada apa pun di build yang menyuarakan ketidakcocokan itu.

- `scripts/sync-android-version.mjs` menyelaraskan `versionName` dari `src/version.ts` dan menaikkan `versionCode` satu langkah (tidak pernah menurunkan — Play tidak pernah memakai ulang nomor).
- `npm run check:android` gagal bila melenceng · `npm run build:android` melakukan sync → build → `cap sync`.
- `allowBackup` **true → false** plus `data_extraction_rules.xml`. Aplikasi ini menyimpan NIK, dokumen polis, dan sesi aktif; auto-backup Android akan menyalinnya ke Google Drive pengguna, di luar kendali kita.
- **`keystore.properties` ternyata belum ada di `.gitignore`** — berkas itu berisi `storePassword` dan `keyPassword` polos. Berkas `*.keystore` sudah diabaikan, properties-nya tidak. Sudah ditambahkan; riwayat git diperiksa dan tidak pernah ada yang ter-commit.

`docs/PLAY_STORE.md` berisi rencana lengkap: apa yang sudah siap (targetSdk 36, signing config, ikon 512×512, feature graphic 1024×500, halaman privasi), apa yang hanya bisa dikerjakan pemilik (keystore, akun developer, data safety), urutan eksekusi, dan risiko penolakan — termasuk satu yang nyata: **reviewer Play akan mencoba membeli polis, dan `sp_payments` masih kosong.**

---

## v2.5.11 — 2026-09-12

### CMS akhirnya memakai tema aplikasi

Pemeriksaan adopsi design system per portal menunjukkan CMS sebagai satu-satunya yang berdiri sendiri:

| Portal | `ds-*` | warna mentah |
|---|---|---|
| **admin (CMS)** | **0** | **709** |
| customer | 198 | 0 |
| agent | 572 | 553 |
| operator | 164 | 57 |
| insurer | 139 | 12 |

Nol. Bukan karena tokennya tidak cocok, tapi karena **token `ds-*` tidak akan pernah bekerja di CMS**: token itu adalah CSS variable yang berganti nilai lewat kelas `.dark` pada elemen root — dan `AdminPortal` satu-satunya portal yang **tidak pernah menyetel kelas itu**. Customer, agent, dan operator semuanya punya `document.documentElement.classList.toggle('dark', darkMode)`; CMS tidak.

Sebagai gantinya CMS membangun sistem tema keduanya sendiri: helper lokal `th(darkMode, kelasGelap, kelasTerang)` dengan 75 pemanggilan, plus hex hardcoded (`bg-[#08120d]`, `bg-[#0a1510]`, `bg-[#111]`, `bg-[#0a0a0a]`) yang tidak mungkin mengikuti tema apa pun.

Perbaikannya berurutan, bukan ganti warna asal:

1. **Sambungkan `darkMode` ke `.dark`**, persis seperti portal lain. Ini yang membuat token mulai berfungsi.
2. **75 panggilan `th()` → token `ds-*`**, lalu helpernya dihapus. Token sudah sadar-mode, jadi percabangan gelap/terang tidak perlu lagi. Skripnya memakai tabel pemetaan eksplisit dan **gagal kalau ada pola tak terpetakan** — dan itu benar-benar terjadi: dua panggilan multi-baris tertangkap dan ikut dipetakan, bukan lolos diam-diam.
3. **1.058 kelas mentah di 20 berkas view → token.**
4. **34 hex hardcoded → token.**

Hasil: `ds-*` **0 → 1.224**, warna mentah **709 → 20**. CMS kini justru portal dengan adopsi tema tertinggi.

#### Yang sengaja TIDAK disentuh

`text-white` (277) dan `bg-white` polos (22) dibiarkan. Di permukaan ini keduanya banyak duduk di tombol emerald dan knob toggle, tempat putih memang nilai literal yang benar — bukan "teks utama" yang bisa ditema. Mengganti 277 titik itu secara buta akan membuat teks tombol lenyap. Konsekuensinya jujur: mode terang di CMS masih belum sempurna, dan itu perlu penilaian per-titik, bukan sed.

---

## v2.5.10 — 2026-09-12

### Deploy edge function yang gagal kini merah, bukan hijau

`deploy-edge-functions.yml` menulis peringatan ke run summary lalu **keluar dengan status sukses**. Sebuah centang hijau dibaca sebagai "sudah terkirim", jadi `pathy-agent` tertinggal dua rilis di belakang produksi selama berhari-hari sementara setiap run melaporkan berhasil — persis penyakit gagal-diam yang dikejar sepanjang v2.5.2–v2.5.5, kali ini di perkakasnya sendiri.

Sekarang, kalau ada fungsi yang **berubah** tapi tidak ter-deploy karena secret belum diset, run-nya **gagal**:

```
::error::Edge functions changed but were NOT deployed (pathy-agent).
```

Push yang tidak menyentuh `supabase/functions/**` tetap hijau — tidak ada yang perlu dikirim, jadi tidak ada yang perlu dilaporkan. Yang merah hanya keadaan yang memang rusak.

### Catatan deploy: mengapa `pathy-agent` tetap tidak bisa dari sesi Claude

Bukan soal izin. Tiga jalur diuji dan semuanya buntu:

| Jalur | Hasil |
|---|---|
| Supabase CLI | tidak terpasang, `SUPABASE_ACCESS_TOKEN` tidak ada |
| Egress langsung | `api.supabase.com` → HTTP 000, diblokir kebijakan sandbox |
| MCP `deploy_edge_function` | butuh 11 berkas = **152.543 karakter** inline dalam satu panggilan |

`xendit-webhook` (v2.5.8) bisa di-deploy justru karena kecil: 19.487 karakter, satu berkas — muat dalam satu panggilan, dan hasilnya bisa diverifikasi byte-per-byte lewat readback. `pathy-agent` delapan kali lebih besar; menyalin-ulang 4.000 baris termasuk `serviceTools.ts` yang menghitung premi, tanpa jaminan byte-parity, bukan taruhan yang sepadan melawan satu toggle dashboard yang memperbaikinya permanen.

`.memory/CONTEXT.md` disegarkan supaya sesi berikutnya tidak mengulang penelusuran yang sama.

---

## v2.5.9 — 2026-09-12

### STNK: foto mentah dikirim apa adanya — itu penyebab gagal baca *dan* keluar dari apps

Satu akar, dua gejala. `services/stnkOcr.ts` mem-POST hasil jepretan kamera **tanpa dikompres**:

```ts
const rawBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
await supabase.functions.invoke('stnk-ocr', { body: { image_base64: rawBase64, ... } });
```

Foto HP modern 4–12 MB menjadi ±5,5–16 MB setelah base64 dan di-JSON-kan ke dalam request body. Itu cukup besar untuk **menghabiskan memori WebView Android** (aplikasi tampak menutup sendiri) dan cukup besar untuk **ditolak edge function sebelum model melihat gambarnya** — yang bagi pengguna terbaca sebagai "AI tidak bisa membaca STNK saya".

Yang ganjil: kompresornya **sudah ada** di `geminiService.ts` dan dipakai jalur Gemini lama (1024–1200px), tapi tidak diekspor — sehingga jalur `stnk-ocr`, yang justru jalur utama, tidak pernah memakainya.

| Perbaikan | Berkas |
|---|---|
| `compressImageBase64` diekspor | `services/geminiService.ts` |
| Kompres ke 1600px sebelum dikirim (turun ±1 orde besaran) | `services/stnkOcr.ts` |
| `mime_type` diturunkan dari hasil kompresi | `services/stnkOcr.ts` |
| State hanya menyimpan salinan terkompresi | `StepVehicle.tsx` |

`mime_type` penting dan nyaris terlewat: kompresor selalu menghasilkan JPEG, jadi mengirim `image/png` dari file asli akan membuat model gagal men-decode. Sekarang dibaca balik dari prefix `data:`.

Karena perbaikan ada di `extractStnkOcr`, **kedua** wizard ikut sembuh — pembelian nasabah dan underwriting agen.

### Uji komponen 11 buah ternyata tidak pernah dijalankan

Menulis regression test untuk kegagalan STNK menyingkap bahwa `vitest.config.ts` hanya menyertakan `*.test.ts` — sedangkan `services/__tests__/components.test.tsx` sudah ada di repo dan **tidak pernah ikut berjalan**. Setelah pola `.tsx` ditambahkan, 11 uji itu hidup dan 2 di antaranya merah: bukan bug produk, melainkan `getByText(/Operator/i)` yang kini ambigu karena layar memuat "Operator Session" *dan* "Operator App". Diperbaiki jadi `getByRole('heading')`.

Total suite: 216 → **239 lulus**.

### Pathy: dari "hanya mobil" menjadi seluruh katalog

Pathy bukan dilarang membahas lini lain — prompt-nya **tidak pernah menyebut apa yang dijual SurePath**, sementara semua contoh alur di dalamnya kendaraan. Model menggeneralisasi dari contoh.

`catalog.ts` baru menuliskan katalog sebenarnya, diverifikasi ke produksi (bukan diasumsikan):

| Lini | Sifat |
|---|---|
| Kendaraan roda 4 & roda 2 (Komprehensif/TLO) | **bisa dihitung premi** — ada tarif OJK |
| Jiwa (Term, Whole, Unit Link, Endowment) | pengajuan lewat agen |
| Kesehatan Kumpulan karyawan | pengajuan portal B2B |
| Armada korporasi, Surety Bond | pengajuan portal B2B |

Pemisahan **QUOTABLE vs SUBMISSION** adalah inti rancangannya. Hanya kendaraan yang punya tabel tarif, jadi hanya kendaraan yang boleh menghasilkan angka. Membiarkan Pathy mengarang premi kesehatan akan jadi bug yang jauh lebih buruk daripada kesempitan yang digantikannya.

Kesehatan perorangan dijawab jujur: belum tersedia di aplikasi, tawarkan dihubungkan ke tim — bukan mengarang plafon atau daftar rumah sakit. Edukasi umum lintas lini tetap boleh, karena itu penjelasan, bukan penawaran.

⚠️ Bagian Pathy ini **belum aktif di produksi** — `pathy-agent` masih versi 3 sementara repo sudah v2.5.0+. Butuh deploy edge function (lihat catatan v2.5.1).

---

## v2.5.8 — 2026-09-11

### Verifikasi email agen: sudah terpasang, tinggal dinyalakan

Seluruh alur "link unik ke email terdaftar" **sudah ada di dalam kode** dan tidak pernah aktif. Bukti dari produksi:

```
35 akun auth, 32 terkonfirmasi, jeda konfirmasi rata-rata 0,08 detik
```

Jeda 0,08 detik berarti tidak ada manusia yang mengklik apa pun — **auto-confirm menyala**, jadi Supabase tidak pernah mengirim email konfirmasi sama sekali. Yang sudah siap di kode:

| Bagian | Berkas | Status |
|---|---|---|
| Layar "Cek Email Kamu" (nasabah) | `AuthGate.tsx` — cabang `!data.session` | sudah ada |
| Layar "Cek Email Kamu" (agen) | `AgentOnboarding.tsx` — `setCheckEmail(true)` | sudah ada |
| Penanganan link balik | `App.tsx` — `#access_token=` / `?code=` | sudah ada |
| Gerbang tier kepercayaan | `_shared/trust.ts` membaca `email_confirmed_at` | sudah ada (v2.5.6) |

Yang ditambahkan rilis ini agar alurnya utuh saat toggle dimatikan:

- `emailRedirectTo: window.location.origin` pada kedua `signUp()` — link balik tidak lagi bergantung pada Site URL dashboard yang bisa salah tanpa ketahuan.
- Tombol **kirim ulang link konfirmasi** di pendaftaran agen. Tanpa ini, agen yang emailnya masuk spam buntu: tidak bisa masuk, tidak bisa daftar ulang dengan alamat yang sama.

Semua bersifat *no-op* selama auto-confirm masih menyala — `signUp()` tetap mengembalikan sesi dan alurnya persis seperti sekarang.

### STNK gagal terbaca tidak lagi diam

Tiga jalur AI ditelusuri. Dua sudah benar, satu bisu:

| Jalur | Saat AI gagal | Sebelum rilis ini |
|---|---|---|
| Foto mobil (`StepSurvey`) | kotak amber "Perlu Pemeriksaan Manual" + langkah selanjutnya | ✅ benar |
| Scan KTP (`StepKYC`) | kotak amber berisi `scanNote` | ✅ benar |
| Scan STNK (`StepVehicle`) | **tidak ada apa-apa** — hanya `console.warn`, lalu diam-diam pindah ke isian manual | ❌ bisu |

Penyebabnya: pada kegagalan total `extractedStnk` di-set `null`, sedangkan seluruh pesan OCR — termasuk peringatan amber — berada di dalam blok yang hanya dirender kalau `extractedStnk` ada. Kondisi peringatannya pun `status !== 'UNCLEAR'`, yang justru mengecualikan kasus gagal total.

Ditambahkan blok notifikasi terpisah di luar region sukses, sejajar dengan notifikasi KTP: menjelaskan kemungkinan penyebab (buram, terpotong, bukan STNK), menawarkan unggah ulang, dan menegaskan pesanan tetap bisa diproses.

### Tindakan pemilik (tidak bisa dilakukan dari kode)

1. **Supabase → Authentication → Providers → Email → matikan "Confirm email" auto-confirm.** Ini satu-satunya saklar yang memisahkan "sudah terpasang" dari "berjalan".
2. **Supabase → Authentication → SMTP Settings → arahkan ke Resend.** Domain `noreply@myinsurepath.com` sudah dipakai `send-insurer-email`. SMTP bawaan Supabase dibatasi beberapa email per jam dan tidak layak untuk pendaftaran.

---

## v2.5.7 — 2026-09-11

### Email palsu ditolak di titik pendaftaran

v2.5.6 menahan akun berdomain sampah di tier 0 *setelah* mereka mendaftar. Rilis ini menolaknya **sebelum akun terbentuk**, di tiga lapis:

| Lapis | Tempat | Berlaku |
|---|---|---|
| Klien — nasabah | `AuthGate.tsx`, sebelum `signUp()` | **otomatis via Vercel** |
| Klien — agen | `AgentOnboarding.tsx`, sebelum `signUp()` | **otomatis via Vercel** |
| Server | `ensure_profile` di data-gateway | saat gateway di-deploy |

Menolak sebelum `signUp()` penting: kalau ditolak belakangan, akun auth terlanjur ada dan menjadi yatim tanpa profil.

Satu sumber kebenaran — klien mengimpor `isUntrustedEmail` langsung dari `supabase/functions/_shared/trust.ts`, bukan daftar kembar yang bisa melenceng. Diverifikasi ikut ter-bundle (`AuthGate-*.js`).

### ⚠️ Cacat yang ditangkap uji sendiri — dan kenapa itu penting

Versi **pertama** penjaga sisi server salah: ia menolak **sebelum** memeriksa apakah profil sudah ada. Karena `ensure_profile` dipanggil di **setiap login**, itu akan **mengunci enam akun berdomain mencurigakan yang sudah ada di produksi** — pengguna sungguhan, terkunci di luar aplikasinya.

`services/__tests__/signupRole.test.ts` menangkapnya (6 uji merah) sebelum apa pun ter-commit. Penjaga dipindahkan ke jalur profil-baru saja, dan dua uji ditambahkan untuk mengunci keduanya: profil baru berdomain palsu **ditolak**, akun lama berdomain sama **tetap bisa login**.

Prinsipnya sama dengan grandfathering di v2.5.6: mengencangkan keamanan tidak boleh mengorbankan pengguna yang sudah ada.

### Yang sengaja TIDAK dikerjakan

Memindahkan `services/vehicleDatabase.ts` (352 KB harga kendaraan) ke server: **31 titik panggil sinkron** harus jadi async, termasuk wizard pembelian — jalur uang. Data itu sudah berada di lazy-chunk, bukan bundle utama. Melakukannya tanpa bisa menjalankan aplikasi adalah cara membuat aplikasi rusak; ia butuh satu pass tersendiri. Rancangannya ada di `docs/SECURITY_LAYERING.md`.

---

## v2.5.6 — 2026-09-11

### Gerbang kepercayaan akun — hanya akun terverifikasi untuk aksi berisiko

Berangkat dari akun `@example.com` yang mendaftar 11 September. Audit menunjukkan itu bukan kejadian tunggal.

**Temuan (35 akun produksi)**

| | |
|---|---|
| Dikonfirmasi instan <2 detik → auto-confirm menyala | **30 dari 32** |
| Benar-benar klik tautan email | **2** |
| Domain sampah (`example`, `test`, dll) | **6 akun (17%)** |

Lebih dalam: pendaftar CUSTOMER langsung ditulis `verified: true` (`verified: role !== 'AGENT'`), jadi kolom `verified` **tidak pernah bisa** membedakan nasabah asli dari akun karangan. Dan `identity_status` — terisi di 40 baris — **tidak dibaca satu baris kode pun**. Kolom mati.

**Rancangannya** (`supabase/functions/_shared/trust.ts`)

Tiga tingkat, diturunkan dari data yang sudah ada, **tanpa perubahan skema**: tier 0 belum tepercaya · tier 1 email wajar · tier 2 terverifikasi penuh.

Kuncinya **pemeriksaan domain email**, bukan `email_confirmed_at`: selama auto-confirm menyala kolom itu selalu terisi sehingga bernilai nol sebagai sinyal. Domain `@example.com` mengunci di tier 0 **meskipun `verified: true`** — persis celah yang terlihat.

**Cakupan sengaja sempit.** Dari 103 action, hanya enam yang digerbang: `create_policy_order`, `submit_claim`, `agent_request_withdrawal`, `redeem_coins`, `apply_referral`, `accept_agreement`. Semua aksi baca, simulasi premi, penawaran draf, profil, notifikasi dan Pathy **tetap terbuka** — pendaftar baru harus tetap bisa mencoba produk.

**Tidak mengubah apa pun bagi pengguna lama.** Akun yang dibuat sebelum 12 Sep 2026 dibebaskan sepenuhnya, termasuk 6 akun domain sampah yang sudah ada. Ada uji khusus yang mengunci jaminan itu.

**Ditegakkan di satu tempat**: dispatcher `data-gateway`, setelah identitas caller terbentuk dan sebelum dispatch — satu titik untuk 103 action, bukan 103 penjaga yang bisa lupa dipasang. Peran admin selalu lolos. Penolakan → **403** dengan `code: 'VERIFICATION_REQUIRED'` supaya klien bisa menampilkan ajakan verifikasi yang tepat.

17 uji baru (`services/__tests__/trust.test.ts`).

### `docs/SECURITY_LAYERING.md` — rancangan pelapisan

Menjawab permintaan "kamuflase kode" dengan jujur: **kode yang berjalan di browser tidak bisa dibuat tak-terbaca** — browser wajib mengeksekusinya. Obfuscation menaikkan biaya menyalin, tidak mencegahnya, dan merusak stack trace Sentry.

Pertanyaan yang benar: **bagaimana membuat kode yang tersalin menjadi tidak berguna.** Dokumen ini memetakan lima lapis, menempatkan yang menentukan (otorisasi server + gerbang akun) di atas yang kosmetik (minify/obfuscation).

**Temuan aset:** yang benar-benar berharga dan ikut terkirim ke browser bukan kode React-nya, melainkan **`services/vehicleDatabase.ts` — 2.572 baris / 352 KB daftar harga pasar kendaraan**, plus tabel tarif OJK. Menyalinnya tidak butuh membaca logika apa pun; cukup ambil arraynya dari bundle.

Rekomendasi memindahkannya ke server (bonus: bundle turun ±350 KB) **sengaja tidak dikerjakan** — itu mengubah jalur data wizard pembelian, dan owner meminta tanpa mengubah fungsi. Keputusan owner, bukan efek samping.

### Yang butuh tangan owner

- **Matikan auto-confirm email** di Supabase Dashboard → Authentication → Providers → Email. Satu-satunya cara menghentikan email karangan di sumbernya. Tidak saya ubah sendiri karena mengubah alur pendaftaran.
- **Pastikan repo GitHub privat.**

---

## v2.5.5 — 2026-09-11

### Kode sumber server ikut terpublikasi lewat sourcemap

Ditemukan saat menjawab pertanyaan owner: bagaimana mencegah kode dilihat atau disalin orang luar.

`npm run build` menulis bundle server **langsung ke `dist/`** — folder yang dipublikasikan Vercel:

```
esbuild server.ts … --sourcemap --outfile=dist/server.cjs
```

Sourcemap itu dibuat dengan `sourcesContent`, artinya **kode sumber TypeScript asli ikut di dalamnya**, lengkap dengan komentar:

- `server.ts` — termasuk AI gateway berikut lapisan validasi PII-leak dan anti-halusinasi
- `services/aiAdminEngine.ts` — mesin AI admin otonom

Siapa pun yang menebak `/server.cjs.map` bisa mengunduhnya utuh. Ironisnya `server.ts` menurut `CLAUDE.md` **hanya untuk dev lokal** — ia tidak pernah punya urusan berada di folder publik.

> Keterjangkauannya dari internet **tidak diverifikasi langsung** (sandbox tidak punya akses keluar ke domain produksi). Yang pasti: berkasnya ada di direktori yang dipublikasikan.

**Perbaikannya**

- Bundle server pindah ke `build-server/` (di luar `dist/`, masuk `.gitignore`). `npm start` menyesuaikan.
- `scripts/check-dist-clean.mjs` (baru) berjalan di **akhir `npm run build`** dan menggagalkan build bila `dist/` memuat sourcemap, bundle server, atau berkas kredensial. Karena melekat di `build`, CI **dan** Vercel ikut memeriksanya otomatis — tidak perlu langkah terpisah yang bisa lupa dipasang.

Diuji dua arah: terhadap `dist/` lama penjaga menggagalkan build dan menyebut kedua berkasnya; setelah perbaikan, `dist/` bersih (119 berkas, nol sourcemap).

### Yang sudah benar dan diverifikasi ulang

Pemeriksaan yang sama memastikan hal-hal berikut **tidak** bermasalah, jadi tidak perlu diutak-atik:

| Diperiksa | Hasil |
|---|---|
| Sourcemap bundle **klien** | tidak diproduksi — kode TS klien tidak bisa diunduh |
| Rahasia di bundle klien | nihil (`service_role`, `xnd_`, `sk_live`, JWT — semua nol) |
| Env yang sampai ke browser | hanya `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, keduanya memang publik |
| `SUPABASE_SERVICE_ROLE_KEY` di `services/aiAdminEngine.ts` | aman — `vite.config.ts` tidak meng-`define` `process.env`, dan berkasnya hanya di-import `server.ts` |
| Pola mirip kunci Resend (`re_`) di bundle | positif palsu — ternyata nama variabel `re_profile` |

---

## v2.5.4 — 2026-09-10

### Ranjau KEDUA di jalur uang: setiap UPDATE ke `sp_payments` di-rollback

Memeriksa daftar PR terbuka memunculkan laporan lama (#95) tentang cacat trigger yang belum pernah diverifikasi maupun diperbaiki. Diverifikasi sekarang: **benar, dan lebih serius dari yang terlihat.**

`audit_critical_update()` terpasang di dua tabel — `sp_policy_orders` dan `sp_payments` — tetapi mendereferensi `OLD.total_premium`, `OLD.commission_amount`, dan `OLD.discount_amount` tanpa syarat. `sp_payments` tidak punya satu pun dari ketiganya (17 kolom, hanya `status` yang cocok), dan di PL/pgSQL field record yang tidak ada adalah **error runtime, bukan NULL**.

Karena ini trigger `AFTER UPDATE` dalam transaksi yang sama, errornya membatalkan transaksi pemanggil. **Setiap UPDATE ke `sp_payments` gagal.** `INSERT` aman (trigger ini hanya UPDATE) — itulah sebabnya `create-xendit-invoice` jalan normal dan tidak ada yang menyadarinya.

**Dibuktikan empiris di produksi**, dalam transaksi yang dibatalkan sendiri:

```
UPDATE GAGAL -> record "old" has no field "total_premium"
```

**Kenapa ini penting: ini ranjau kedua di jalur yang sama.** v2.5.2 memperbaiki `verify_jwt = true` yang membuat callback Xendit ditolak sebelum fungsinya jalan. Ternyata memperbaiki itu saja tidak cukup — setelah callback akhirnya sampai, `xendit-webhook` menandai PAID lewat `UPDATE`, dan update itu di-rollback oleh trigger ini. Rantai lengkapnya: pembayaran tidak pernah PAID → komisi agen tidak dikredit → order tidak maju → insurer tidak dinotifikasi.

**Perbaikannya** (`supabase/migrations/20260910_fix_audit_critical_update.sql`, **sudah diterapkan ke produksi**): bandingkan lewat `to_jsonb()` supaya kolom yang tidak ada menghasilkan NULL, bukan error. Ekuivalensi untuk `sp_policy_orders` dijaga ketat — `status` tetap dibandingkan sebagai text, dan ketiga kolom uang di-cast kembali ke `numeric` sehingga perbandingannya tetap numerik, bukan perbandingan teks yang akan menganggap `1.0` dan `1.00` berbeda. Atribut fungsi dipertahankan apa adanya (SECURITY INVOKER, `search_path = public, pg_temp`).

**Verifikasi sesudah perbaikan**, keduanya dalam transaksi yang dibatalkan:

| Uji | Hasil |
|---|---|
| `sp_payments`: update kolom sepele | berhasil |
| `sp_payments`: `status` → `PAID` | berhasil |
| `sp_payments`: baris audit tercatat | tepat 1 — update sepele benar tidak dicatat |
| `sp_policy_orders`: update sepele | **+0** baris audit |
| `sp_policy_orders`: ubah `status` | **+1** baris audit |
| `sp_policy_orders`: ubah `total_premium` | **+1** baris audit |

Tidak ada regresi pada tabel yang punya data nyata.

**Catatan status:** berbeda dengan perbaikan v2.5.2 yang menunggu deploy edge function, perbaikan ini ada di database sehingga **sudah aktif sekarang**. Jalur pembayaran masih menunggu satu hal: deploy `xendit-webhook` dengan `verify_jwt = false`.

---

## v2.5.3 — 2026-09-10

### Memutus pola "gagal tanpa bersuara"

Hampir setiap cacat yang ditemukan dalam audit 9–10 September punya bentuk yang sama: sistem gagal **tanpa memberi tahu siapa pun**. Auto-deploy melaporkan sukses tanpa men-deploy. `functions.invoke()` gagal dan hasilnya tidak diperiksa. Kanal notifikasi dilewati diam-diam karena tokennya kosong. Percakapan Pathy tidak pernah disimpan, jadi jawaban salah tidak pernah terdeteksi.

Selama sistem tidak bisa memberi tahu saat dirinya rusak, setiap perbaikan berikutnya adalah tebakan. Rilis ini menambahkan dua perkakas untuk memutus pola itu, plus satu temuan baru.

**1. Penjaga deklarasi edge function** — `npm run check:functions`, memblokir di CI

Setiap direktori di `supabase/functions/` wajib punya sikap **tertulis** di `config.toml`: dideklarasikan, atau ditandai sengaja mati lewat `#!undeclared <nama> — alasan`. Diam bukan pilihan — diam persis yang membuat `send-insurer-email` hilang berbulan-bulan. Penjaga ini menangkap dua arah: fungsi tanpa deklarasi, dan deklarasi tanpa sumber.

**2. Pemeriksa kesehatan produksi** — `docs/PRODUCTION_READINESS.md`

Satu query SQL yang bisa ditempel di Supabase SQL Editor kapan saja. Read-only, tidak butuh kredensial tambahan, dan tidak pernah menampilkan **nilai** rahasia — hanya ada/tidaknya. Melaporkan: rahasia yang dipakai fungsi DB tapi hilang dari Vault, baris `sp_bot_config` yang kosong, status tiap kanal notifikasi, prasyarat pembayaran, dan rate set OJK aktif.

**3. Temuan baru: dua dari tiga kanal notifikasi admin mati**

Dijalankan terhadap produksi, pemeriksa itu langsung menemukan:

| Kanal | Status | Sebab |
|---|---|---|
| Telegram | ✅ jalan | — |
| WhatsApp (Fonnte) | ❌ mati | `FONNTE_TOKEN` tidak ada di Vault — padahal **nomor admin sudah diisi**, jadi kanal ini tampak menyala |
| Email (Resend) | ❌ mati | `RESEND_API_KEY` tidak ada **dan** `admin_email` kosong |

Kedua kanal dilewati tanpa log — itu desain yang disengaja (notifikasi gagal tidak boleh menggagalkan transaksi), tetapi akibatnya tidak ada yang tahu. Cara mengisinya ada di `docs/PRODUCTION_READINESS.md`; nilainya tidak pernah menyentuh repo.

Juga diverifikasi ulang: perubahan `verify_jwt = false` pada `xendit-webhook` (v2.5.2) **tidak** membuka lubang. Pengecekan `x-callback-token` di dalam fungsinya fail-closed secara eksplisit (token tidak terkonfigurasi → 500, bukan lolos), dan `XENDIT_WEBHOOK_TOKEN` terkonfirmasi ada di Vault — jadi setelah ter-deploy webhook itu benar-benar berfungsi, bukan sekadar berganti mode gagal.

---

## v2.5.2 — 2026-09-10

### Dua cacat yang ditemukan saat memverifikasi `config.toml` — satu di jalur uang

Merapikan `config.toml` di v2.5.1 memaksa setiap fungsi diperiksa satu per satu. Dua di antaranya ternyata salah, dan keduanya diam.

**1. `xendit-webhook` akan gagal di pembayaran pertama** ⚠️ jalur uang

Produksi menjalankannya dengan `verify_jwt = true`. Fungsinya mengautentikasi dengan `x-callback-token` milik Xendit dan sudah fail-closed — ia tidak pernah mengharapkan JWT pengguna. Dengan `verify_jwt = true`, platform Supabase menolak request dengan **401 sebelum fungsinya sempat jalan**, sehingga pengecekan `x-callback-token` tidak pernah tereksekusi.

Konsekuensinya berantai: callback Xendit tidak pernah sampai → pembayaran tidak pernah ditandai `PAID` → komisi agen tidak pernah dikredit → insurer tidak pernah dinotifikasi.

Belum ada yang menyadarinya karena **`sp_payments` masih kosong** — platform belum pernah memproses satu pembayaran pun (order terakhir Juli 2026). Jadi ini ranjau pra-peluncuran, bukan kerusakan yang sedang berjalan. Diperbaiki jadi `verify_jwt = false`, alasan identik dengan `data-gateway`: fungsi yang mengautentikasi sendiri tidak boleh dijaga ganda oleh gerbang JWT platform yang tidak paham mekanismenya.

**2. `send-insurer-email` tidak pernah ter-deploy padahal dipanggil klien**

Di v2.5.1 fungsi ini sengaja tidak dideklarasikan, dengan alasan "menghidupkan endpoint baru adalah keputusan produk". **Alasan itu keliru.** `services/website.ts` memanggilnya lewat `supabase.functions.invoke('send-insurer-email', …)` — persis setelah menerbitkan token insurer dan menyusun review URL. Fungsinya tidak ada di produksi, jadi panggilan itu gagal dan insurer **tidak pernah menerima email review-link**.

Artinya langkah terakhir alur review insurer (kerja v1.20.0–v1.22.0) mati diam-diam selama ini. Mendeklarasikannya bukan menambah fitur, melainkan memperbaiki yang rusak. `verify_jwt = true` benar di sini: dipanggil dari sesi pengguna yang sudah login, dan `verifyAuth` + `adminOnly` tetap berjalan di dalamnya.

**Yang tetap dibiarkan mati**

`ai-gateway` hanya kembaran AI gateway lokal di `server.ts`; klien menjangkaunya lewat `/api/ai-gateway` yang hanya ada saat `npm run dev`. Tidak ada yang memanggil versi edge function-nya, jadi mendeklarasikannya hanya menambah permukaan serang.

**Catatan penerapan**

Kedua perbaikan ada di `supabase/config.toml`, jadi baru berlaku **saat deploy berikutnya benar-benar berjalan** — yaitu setelah integrasi GitHub di dashboard Supabase dinyalakan (lihat `docs/DEPLOYMENT.md`). Sampai itu terjadi, produksi masih membawa kedua cacat di atas.

---

## v2.5.1 — 2026-09-10

### `supabase/config.toml` — berkas yang hilang, dan kenapa deploy tidak pernah jalan

Rilis v2.5.0 menemukan bahwa auto-deploy edge function **belum pernah benar-benar berjalan** karena dua secret repo tidak pernah diset. Menelusuri lebih jauh, ternyata ada penghalang kedua yang lebih dalam: **repo ini tidak punya `supabase/config.toml`**.

Itu penting karena jalur deploy yang paling mudah — **integrasi GitHub dari dashboard Supabase**, yang tersedia di semua paket dan **tidak memerlukan secret GitHub sama sekali** — hanya men-deploy edge function yang **dideklarasikan di `config.toml`**. Tanpa berkas itu, menyalakan integrasinya pun hanya akan menjalankan migrasi dan nol fungsi. Jadi selama ini kedua jalur deploy sama-sama buntu, dengan sebab yang berbeda.

**Yang ditambahkan**

`supabase/config.toml` mendeklarasikan 19 edge function milik repo ini beserta `verify_jwt`-nya. Nilainya **dicerminkan persis dari produksi** (dibaca lewat Management API dan diverifikasi terprogram, bukan dengan mata), sehingga memperkenalkan berkas ini tidak mengubah perilaku apa pun — ia hanya menuliskan keadaan yang sudah berjalan.

Berkas ini sengaja **minimal**: hanya `project_id` dan blok `[functions.*]`, tanpa `[api]`/`[auth]`/`[db]`, supaya tidak ada setelan layanan produksi yang ikut tertimpa saat deploy.

**Yang sengaja TIDAK dideklarasikan**

- `send-insurer-email` dan `ai-gateway` ada di repo tapi **tidak pernah ter-deploy**. Mendeklarasikannya berarti membuat endpoint baru yang selama ini tidak hidup — itu keputusan produk, bukan efek samping merapikan config, jadi keduanya dikomentari. ⚠️ Konsekuensinya: fitur kirim review-link ke insurer (didokumentasikan sejak v1.20.0) kemungkinan besar mati di produksi. Perlu dicek.
- `generate-daily-renungan`, `backup-daily`, `admin-auth`, `push-notify`, `signup-member` hidup di project Supabase yang sama tapi sumbernya bukan milik repo ini. Mendeklarasikannya berarti men-deploy dari sumber yang tidak kita punya.

**Satu sumber kebenaran untuk verify_jwt**

Workflow CI dulu meng-hardcode `--no-verify-jwt` untuk `data-gateway` dan `quotations-gateway`. Sekarang CLI membaca `config.toml`, jadi special-case itu dihapus — sebuah fungsi tidak bisa lagi ter-deploy dengan postur auth berbeda tergantung jalur mana yang men-deploy-nya.

**Catatan yang perlu ditinjau**

Produksi menyetel `verify_jwt = true` untuk `xendit-webhook`, padahal callback Xendit membawa `x-callback-token`, bukan JWT pengguna. Nilai itu dicerminkan apa adanya agar config ini tidak diam-diam mengubah jalur pembayaran, tapi layak diperiksa bersama konfigurasi callback di dashboard Xendit.

---

## v2.5.0 — 2026-09-09

### Pathy: unggah dokumen apa pun, dan berhenti memvonis klaim

**1. Pathy tidak lagi memutuskan klaim — itu wewenang asuransi**

`check_coverage` dan `start_claim` dulu menjawab `covered: true/false` dan kartunya menulis "Ditanggung" dengan centang hijau. Itu terbaca sebagai janji, padahal yang memutuskan liable atau tidaknya sebuah klaim adalah insurer setelah survei dan pemeriksaan berkas — SurePath adalah distributor, bukan penanggung.

Keduanya sekarang mengembalikan `indication` (`LIKELY_COVERED` / `LIKELY_NOT_COVERED` / `NEEDS_REVIEW`) plus `decision_by: 'INSURER'`, dan setiap kalimat alasannya ditulis indikatif ("berdasarkan data polismu, indikasinya…"). Kartunya ikut berubah: glyph `≈`/`≉`/`?`, bukan centang/silang. Dua kondisi yang dulu jadi vonis sekarang jadi `NEEDS_REVIEW`: polis yang belum aktif, dan tanggal kejadian di luar periode polis — dua-duanya fakta untuk insurer timbang, bukan penolakan dari Pathy.

Field lama `covered`/`eligible` tetap dikirim, jadi tidak ada jendela rusak saat web sudah rilis tapi edge function-nya belum.

**2. Disclaimer yang tidak bergantung pada kerelaan model**

`supabase/functions/pathy-agent/disclaimers.ts` (baru) menghitung caveat per giliran dari tool yang benar-benar berjalan dan kata yang benar-benar keluar — jadi disclaimer tetap ada di giliran ketika model lupa. Isinya: Pathy AI dan bisa keliru, plus siapa yang berwenang — **asuransi** untuk jaminan/klaim/nominal, **dokter** untuk hal medis, **OJK/kepolisian/penasihat hukum** untuk hal hukum. Maksimal dua baris otoritas supaya masih dibaca orang.

System prompt dapat dua bagian baru: `DIPLOMASI SOAL KLAIM & JAMINAN` (dilarang bilang "pasti dibayar"/"ditolak", jangan memihak dalam sengketa, empati dulu saat orang baru kecelakaan) dan `DISCLAIMER`. Banner atas chat diganti dari "Pathy tidak bisa mengubah polis" jadi "Pathy AI bisa keliru dan tidak memutuskan klaim".

**3. Tombol unggah gambar — yang memang belum pernah ada**

Composer dulu hanya punya "Foto STNK" dan "Foto KTP", keduanya `capture="environment"`: di ponsel itu langsung membuka kamera, sehingga foto yang **sudah ada di galeri tidak pernah bisa dipilih**. Itulah "fitur upload tidak ada".

Sekarang ada dua input: **Unggah gambar** (tanpa `capture` → galeri, file, screenshot) dan **Kamera**. Jenis dokumennya tidak perlu disebut lagi — `services/docOcr.ts` (baru) mengklasifikasi sendiri: STNK, KTP, SIM, polis, invoice/kuitansi, atau dokumen lain. STNK dan KTP tetap diarahkan ke pembaca khususnya (`stnkOcr` dengan resolusi harga pasar, `ktpOcr` dengan validasi NIK 16 digit); sisanya dibaca `extractDocumentData()` yang baru di `geminiService`. Maksimal 4 lampiran, batas 12 MB, thumbnail tampil di composer dan di gelembung pesan pengguna. Gambarnya tetap tidak pernah keluar dari browser — hanya hasil ekstraksinya yang dikirim.

**4. Data hasil ekstraksi dipakai dan disimpan**

- **Dipakai di penawaran.** `compare_offers` dan `build_quotation` kini mengisi argumen yang tidak disebut model dari lampiran giliran itu (nilai pertanggungan, provinsi, merk/tipe/tahun/plat dari STNK; nama & alamat tertanggung dari KTP). Argumen eksplisit tetap menang — pengguna bisa mengoreksi hasil OCR lewat chat.
- **Diarsipkan otomatis.** Tabel baru `sp_user_documents` (deny-all RLS, hanya service_role) menyimpan **field hasil ekstraksi, bukan gambarnya**. Berjalan deterministik sebelum model dipanggil, jadi tidak bergantung pada keputusan model, dan tidak pernah menggagalkan giliran bila tabelnya tidak ada.
- **Melengkapi akun.** Tool tulis ketiga, `save_document_data`, hanya dipanggil setelah pengguna setuju: nasabah → melengkapi profilnya sendiri (`name`, `phone`, `ktp`, `address` — tidak ada kolom lain), agen → membuat/memperbarui data klien di `sp_clients` miliknya, tidak pernah profilnya sendiri. Default-nya **hanya mengisi kolom kosong**; menimpa data yang sudah ada butuh `overwrite: true` yang hanya boleh dikirim kalau pengguna eksplisit memintanya.

**Catatan rilis**

- `supabase/migrations/20260909_pathy_user_documents.sql` **sudah diapply ke production**.
- ⚠️ `pathy-agent` **wajib di-deploy ulang** — seluruh poin 1, 2 dan 4 ada di edge function:
  `supabase functions deploy pathy-agent --project-ref uyjgeteelnswphyzkjwi`
- Uji baru: `services/__tests__/pathyDocuments.test.ts` (21 uji) mengunci bahwa tidak ada jalur kode yang menjanjikan klaim dibayar, disclaimer selalu terbit, dan tulis dokumen tetap sempit.

---

## v2.4.0 — 2026-09-08

### Aplikasi Nasabah kini satu keluarga dengan aplikasi Agen — plus satu bug token yang mematikan seluruh mode terang

**Temuan terpenting: token desain mode terang mati sejak DS v3 (2026-07-06)**

Komentar pembuka `styles.css` berbunyi `Tailwind lp-*/primary/brand` — urutan `*/` di situ **menutup komentar CSS lebih awal**. Sisa kalimatnya lalu terbaca sebagai selector, dan blok `:root { --ds-bg … }` tepat sesudahnya tertelan sebagai badan selector rusak itu. Akibatnya seluruh custom property mode terang tidak pernah terdefinisi: setiap kelas `bg-ds-*`, `text-ds-*`, `border-ds-*` di seluruh aplikasi jatuh ke `transparent`/warna warisan. Blok `.dark` tidak terdampak, jadi mode gelap selama ini justru satu-satunya yang benar.

Satu kata diganti, dan seluruh sistem token hidup kembali — di semua portal, bukan hanya nasabah.

**Kerangka portal jadi satu komponen bersama**

Header dan navigasi bawah tidak lagi disalin per portal:

- `components/shared/PortalHeader.tsx` — logo, label portal, identitas, lonceng + badge angka, tombol tema, avatar → Profil. Identitas dipotong (`truncate`), bukan dibungkus, supaya tinggi header tetap 70px; versi aplikasi menyingkir di layar sempit (profil tetap menampilkannya penuh).
- `components/shared/PortalTabBar.tsx` — pil mengambang dengan aksi tengah terangkat, ikon 23/26px, status aktif berupa chip bertint.

Agen dan nasabah sekarang memakai keduanya, jadi keduanya tidak bisa lagi berbeda diam-diam.

**Navigasi nasabah: Pathy naik ke tengah**

Susunannya kini Beranda · Beli · **[Pathy]** · Klaim · Riwayat — bentuk yang sama dengan agen (dua tab, aksi tengah, dua tab). Slot tengah membuka Pathy sebagai overlay lewat `PATHY_OPEN_EVENT`, bukan berpindah halaman, dan tombol mengambang Pathy dimatikan di portal nasabah supaya pintunya cuma satu. Profil pindah ke avatar di header — persis seperti agen. Ini melanjutkan keputusan v2.3.0: Pathy adalah pintu layanan.

**Ikon nasabah naik kelas**

`components/shared/duotone.tsx` mengangkat resep menggambar `AgentIcons` (grid 48, goresan 3px, lapisan tint, satu aksen emas) menjadi milik bersama; `components/shared/CustomerIcons.tsx` memakainya. Beranda, Profil dan Klaim sengaja digambar identik dengan set agen — konsep yang sama harus terlihat sama di semua portal. Set outline tipis 24-grid lama (`CustomIcons`) tidak lagi dipakai portal nasabah.

**Sisanya**

- Notifikasi nasabah naik dari dropdown 288px jadi drawer penuh. `AgentNotifications` sekarang tipis membungkus `shared/NotificationDrawer` — satu implementasi, dan warnanya pindah ke token sehingga mode gelap ikut benar.
- `HeroCard` punya dua rupa (`emerald`, `navy`) dengan geometri sama. Hero ungu satu-satunya di halaman Klaim dan gradien inline di Riwayat diganti; sekarang hanya ada satu bahasa hero.
- Token semantik `ds-blue-lt` / `ds-amber-lt` / `ds-red-lt` ditambahkan ke Tailwind, dipetakan ke `--ds-*-tint` yang sudah ada, lalu semua `bg-amber-50` / `bg-rose-50` / `bg-gray-100` / `bg-slate-100` / `dark:bg-[#161616]` di `CustomerPortal`, `OrderDetailSheet` dan `AccessibilitySettings` diganti. Chip status akhirnya terbaca di mode gelap.
- Portal nasabah memakai `font-sora` seperti agen.
- Aksi cepat "AI Bantu" dan CTA "Chat dengan Pathy" kini benar-benar membuka Pathy, bukan halaman HealthChat.

**Tidak disentuh:** data-gateway, dompet, alur pembayaran, dan seluruh edge function. Ini murni lapisan tampilan.

---

## v2.3.0 — 2026-09-08

### Pathy jadi satu-satunya pintu layanan + kunci zoom di aplikasi

**Keputusan desain: satu wajah, banyak otak**

Sebelum ini ada 8 mesin AI dengan 4 nama produk dan 5 pintu masuk berbeda (Pathy, ClaimSense, HealthChat, InsurerAI, plus forensik foto & review admin tanpa nama). Untuk mendapat estimasi klaim, nasabah harus tahu bahwa ada menu Klaim, di dalamnya ada panel bernama "ClaimSense AI", dan panel itu harus diketuk manual. Kalau dia tanya Pathy "mobil saya nabrak, gimana?", Pathy hanya punya `get_my_claims` — **dia tidak bisa memulai klaim sama sekali.**

Sekarang Pathy jadi satu-satunya nama yang dilihat nasabah dan agen. Mesin-mesinnya tetap terpisah — yang disatukan pintunya, bukan otaknya. Alat internal (review polis & keuangan admin, InsurerAI) sengaja **tidak** diberi persona: penggunanya bukan nasabah, dan model otorisasinya berbeda.

**Sembilan tool baru — semuanya baca-saja atau siapkan-saja**

Tidak satu pun menulis. Ini bukan jalan pintas. Pengiriman klaim sudah punya rantai kepercayaan yang dibangun hati-hati di `data-gateway/actions/claims.ts`: forensik foto berjalan lebih dulu di `analyze-claim-photos`, hasilnya di-*stage* server-side, lalu `submit_claim` mengonsumsi baris itu sekali, berdasarkan id, setelah memastikan miliknya dan belum kedaluwarsa — justru supaya pemalsu yang jadi target fitur itu tidak bisa mengirim `fraud_verdict: CLEAN` sendiri. Pembayaran lewat `create-xendit-invoice`. Memberi model AI pintu kedua ke salah satunya berarti menduplikasi penjaganya (dua tempat yang harus benar) atau melubanginya. Jadi Pathy mengerjakan bagian yang memang cocok untuknya — polis mana yang berlaku, apa yang dijamin, apa yang kurang, berapa biayanya — lalu menyerahkan tautan terisi ke alur yang sudah ada.

| Tool | Untuk | Isi |
|---|---|---|
| `check_coverage` | semua | "Spion pecah ditanggung nggak?" dijawab dari polis **dia sendiri** + risiko sendiri |
| `start_claim` | semua | Cari polis yang berlaku di tanggal kejadian, daftar dokumen, prefill formulir |
| `claim_status` | semua | Tahap saat ini, langkah berikutnya, dan apa yang masih kurang |
| `renewal_check` | semua | Polis jatuh tempo + premi perpanjangan **dihitung ulang** dengan tarif OJK berjalan |
| `explain_my_policy` | semua | Ditanggung / TIDAK ditanggung, dari polisnya sendiri |
| `payment_help` | semua | Tagihan tertunda + tautan yang **sudah ada** (tidak membuat tagihan baru) |
| `pipeline_nudge` | agen | Penawaran mendekati kedaluwarsa + pengajuan mandek |
| `commission_forecast` | agen | Dompet, komisi tertunda, perkiraan dari pengajuan berjalan |
| `draft_followup` | agen | Draft pesan WhatsApp — **agen** yang menekan kirim |

**Aturan jaminan yang paling penting**

Banjir, gempa, huru-hara, terorisme, tanggung jawab pihak ketiga, dan kecelakaan diri **BUKAN jaminan dasar** polis kendaraan Indonesia (PSAKBI) — semuanya perluasan berbayar. Mengatakan "ditanggung" pada mobil terendam yang tidak punya perluasan banjir adalah jawaban paling merugikan yang bisa diberikan asisten ini. Karena itu setiap risiko punya *bucket*-nya sendiri dan jawabannya selalu diresolusi terhadap kolom `addons` pada order — bukan dari pengetahuan umum model. Ada 20 kasus ujinya.

**Struktur**

- `supabase/functions/pathy-agent/common.ts` (baru) — tipe + penjaga bersama. `ownerFilter` hidup di satu tempat supaya tidak mungkin menulis tool tanpa melewatinya.
- `supabase/functions/pathy-agent/serviceTools.ts` (baru) — sembilan tool di atas.
- `services/claimHandoff.ts` (baru) — kontrak antara chat dan formulir klaim. Payload divalidasi saat keluar (nomor polis cacat dibuang, bukan diketik ke formulir) dan sekali pakai.

**Suara**

`services/speech.ts` (baru) — dikte Web Speech API, `id-ID`. Momen paling butuh Pathy adalah berdiri di samping mobil penyok, satu tangan, sering hujan. Mengetik kronologi di situ menyiksa; bicara tidak. Transkrip masuk ke kotak input untuk dibaca dulu — tidak pernah langsung terkirim, karena dikte salah membaca nama dan nomor plat.

**Kunci zoom + fullscreen di aplikasi**

`services/appViewport.ts` (baru) — pinch-zoom, double-tap zoom, ctrl+scroll zoom, dan rubber-band dimatikan, **hanya saat berjalan sebagai aplikasi** (PWA terpasang atau build Capacitor). Di tab browser biasa halaman tetap bisa di-zoom.

Pemisahan itu disengaja: `user-scalable=no` di situs publik melanggar WCAG 1.4.4 dan menurunkan skor aksesibilitas Lighthouse, dan orang yang perlu memperbesar teks di halaman pemasaran tidak punya chrome aplikasi sebagai pengganti. Pengguna yang sudah memasang aplikasinya punya pengaturan ukuran tampilan OS, dan di sanalah pinch-zoom browser justru merusak rasa "aplikasi": cubitan tak sengaja meninggalkan tata letak melenceng tanpa cara kembali. Seleksi teks tetap menyala — nomor polis dan nomor klaim harus bisa disalin.

**Belum dikerjakan, dan alasannya**

- **Push notification & WhatsApp dua arah** — butuh kunci VAPID dan konfigurasi provider yang tidak ada di repo. Fondasinya sudah siap (`sp_notifications`, `send-whatsapp`, dan PWA-nya baru diperbaiki di v2.2.0).
- **Pathy publik tanpa login** — permukaan penyalahgunaan biaya model. Perlu rate-limit per-IP tersendiri dan review keamanan sendiri, bukan ditempel di rilis ini.
- **Bengkel rekanan** — tidak ada tabelnya; hanya teks di `aiKnowledge.ts`. Ini pekerjaan data, bukan AI.

**Uji:** `services/__tests__/pathyService.test.ts` (51 kasus), termasuk satu yang menjalankan **kesembilan** tool terhadap database palsu yang melempar error pada setiap verba tulis — jadi tool baru yang menyisipkan baris akan langsung menggagalkan suite.

---

## v2.2.0 — 2026-09-08

### "Install App" sekarang benar-benar memasang aplikasi

**Akar masalah: event pemasangan sudah lewat sebelum tombolnya lahir**

Chrome menembakkan `beforeinstallprompt` **satu kali**, tepat setelah pemeriksaan installability-nya lolos, dan **tidak pernah mengulanginya**. Sebelum rilis ini ada **tiga** komponen React yang masing-masing memasang pendengarnya sendiri di dalam `useEffect`:

| Komponen | Kapan mount |
|---|---|
| `components/InstallPrompt.tsx` | bersama app shell |
| `components/Navbar.tsx` | bersama app shell |
| `src/pages/site/SiteLayout.tsx` | **chunk lazy** — baru diunduh setelah render pertama |

Yang lazy selalu kalah balapan: saat `SiteLayout-*.js` selesai diunduh dan mount, event-nya sudah lewat. `pwaPrompt` tetap `null`, dan `handleInstallClick` jatuh ke `InstallModal` — lembar instruksi "buka menu ⋮ → Add to Home screen". **"Add to Home screen" hanya menaruh pintasan bookmark di layar utama**, bukan memasang aplikasi: tidak ada WebAPK, tetap ada bar alamat, tidak ada ikon aplikasi sungguhan. Persis keluhan yang dilaporkan.

Tiga salinan itu juga saling merebut: satu `beforeinstallprompt` hanya boleh di-`prompt()` **sekali**, jadi komponen yang lebih dulu memakainya meninggalkan dua lainnya memegang objek mati.

**Perbaikan — satu sumber kebenaran, ditangkap sedini mungkin**

- **Skrip inline di `index.html`**, di atas semua bundle, menangkap event dan memarkirnya di `window.__spInstall`. Sekarang tidak peduli selambat apa pun aplikasi mount, prompt-nya tetap ada.
- **`services/pwaInstall.ts` (baru)** — satu-satunya pembaca parkiran itu. Menyediakan `getInstallState()`, `promptInstall()`, `subscribeInstall()` dan hook `usePwaInstall()`. Melepas event setelah dipakai sekali, mendengar `appinstalled`, dan **membatalkan** penanda "sudah terpasang" begitu browser menawarkan pemasangan lagi (browser hanya menawarkan yang belum terpasang — artinya pengguna sudah menghapusnya).
- **`components/shared/InstallAppSheet.tsx` (baru)** — satu tampilan pemasangan untuk seluruh aplikasi. Aturannya: **jangan pernah menampilkan instruksi kalau browser bisa memasang sendiri.** Setiap tombol memanggil `promptInstall()` lebih dulu; panduan langkah hanya muncul kalau jawabannya `'unavailable'`.
- Panduannya jujur per platform: iOS (Bagikan → Tambahkan ke Layar Utama, dengan glif Share digambar inline karena kata "Share" tidak dikenali orang), webview dalam aplikasi (Instagram/Facebook/WhatsApp — **tidak bisa memasang sama sekali**, jadi diarahkan membuka browser + tombol salin tautan), Android tanpa prompt (menu ⋮ → **"Instal aplikasi"**, ditegaskan *bukan* "Tambahkan ke layar utama"), desktop (ikon pasang di address bar), dan browser yang memang tidak mendukung.
- Lembarnya di-**portal ke `<body>`**: navbar memakai `backdrop-blur`, dan `backdrop-filter` apa pun menjadikan elemennya containing block untuk `position: fixed` — tanpa portal lembarnya terpotong setinggi navbar.
- Tombol "Pasang" di navbar tidak lagi disembunyikan saat prompt belum ada; ia bersembunyi **hanya** kalau aplikasinya memang sudah terpasang.
- iPhone kini mendapat tawaran pemasangan pada kunjungan pertama. Sebelumnya tidak ada apa pun di iOS, jadi pengguna iPhone tidak pernah tahu aplikasinya bisa dipasang.

**Manifest — dialog pasang yang kaya, bukan infobar mungil**

- `screenshots` menunjuk `logo.png` dan mendeklarasikannya `3508x2481`; **file aslinya 348x400**. Chrome menolak screenshot yang ukurannya tidak cocok, jadi tidak ada satu pun screenshot sah — dan tanpa screenshot `form_factor: 'narrow'`, Chrome Android hanya memunculkan infobar mungil, bukan dialog pasang besar. Diganti empat screenshot 1080x1920 yang sudah ada di `public/` plus satu `wide`.
- `id: '/'` ditambahkan supaya identitas aplikasi tidak berubah kalau `start_url` disunting kelak.
- `display_override: ['standalone', 'minimal-ui']`.

**Lain-lain**

- `src/pages/site/SiteLayout.tsx:324` — satu-satunya **error** ESLint di repo (pre-existing sejak v1.50.0) diperbaiki. `npm run lint` sekarang **0 error** untuk pertama kalinya.
- `InstallModal` dan `isStandaloneMode` di `siteKit.tsx` dihapus (mati setelah perubahan ini).
- Uji: `services/__tests__/pwaInstall.test.ts` (18 kasus) — penangkapan awal, sekali-pakai, deteksi platform termasuk iPadOS yang menyamar sebagai Mac, dan penanda terpasang yang basi.

---

## v2.1.0 — 2026-09-07

### KTP kembali berfungsi, dan Pathy bisa menerbitkan proposal penawaran

**1. Akar masalah KTP: salah kredensial, bukan salah prompt**
`services/geminiService.ts` mengautentikasi ke `ai-proxy` memakai **anon key** sebagai bearer token. `ai-proxy` memverifikasi token itu dengan `auth.getUser()`, dan anon key adalah JWT proyek tanpa klaim `sub` — jadi verifikasinya gagal dan **setiap permintaan dijawab 401**. Tiap pemanggil menelan error itu dan mengembalikan `{ success: false }`, sehingga pemindaian KTP diam saja: formulir tetap kosong tanpa satu pun pesan.

Ini bukan cuma soal KTP — **semua** panggilan di file itu ikut mati: validasi foto, analisis klaim, survei kendaraan, pembaca kuitansi medis, dan penjelas produk.

- `getClient()` kini async dan memakai **access token sesi**; tanpa sesi ia melempar pesan yang jelas, bukan gagal diam-diam.
- **`services/ktpOcr.ts` (baru)** — pembaca KTP tervalidasi, sebangun dengan `stnkOcr.ts`. NIK dibersihkan dari spasi/titik/strip lalu **wajib 16 digit**; kalau tidak, dikembalikan `null` daripada mengisi formulir dengan nomor salah. Nama dan alamat dinormalkan. Statusnya `OK` / `PARTIAL` / `UNCLEAR` dengan catatan berbahasa Indonesia yang memberi tahu apa yang harus dilakukan.
- **`StepKYC`** memakai layanan itu dan **menampilkan catatannya**. Sebelumnya kegagalan tidak menghasilkan apa pun di layar.

**2. Pathy menerbitkan proposal penawaran — format yang sama dengan menu beli asuransi kendaraan**

Lampiran diproses **di klien**, bukan di edge function: browser sudah memiliki `stnk-ocr`, pembaca KTP, dan database harga kendaraan 2.500 baris. Yang dikirim ke server hanya kolom hasil ekstraksi — **gambar tidak pernah melewati `pathy-agent`**.

Tiga tool baru:
- **`read_attachment({ type })`** — membaca lampiran STNK/KTP milik giliran ini. Isinya hanya bisa dijangkau lewat tool, tidak pernah masuk system prompt.
- **`compare_offers(...)`** — menghitung **tiga opsi sekaligus** dengan tarif OJK aktif: Comprehensive, Comprehensive + perluasan (banjir, gempa, huru-hara, TPL 25 juta, PA sopir + 4 penumpang), dan TLO. Tiap opsi membawa rincian baris premi yang jumlahnya persis sama dengan totalnya.
- **`build_quotation({ option_id, … })`** — menyusun proposal untuk opsi terpilih dan menyimpannya sebagai draf. Payload-nya berbentuk `AgentQuoteSource`, jadi klien meneruskannya ke `fromAgentQuote()` → `publishAndDownloadQuotation()` — **pipeline yang sama persis dengan `StepFinal.tsx` di wizard beli kendaraan**. PDF-nya slip SurePath 4 halaman ber-QR ke `/q/{code}`, bukan dokumen tiruan.

**Premi dihitung ulang saat proposal dibangun**, bukan dibawa dari hasil `compare_offers` beberapa giliran sebelumnya. Angka yang tercetak di dokumen komersial tidak boleh berasal dari percakapan.

**3. UI chat**
- Dua tombol kamera di composer: **Foto STNK** dan **Foto KTP**. Lampiran tampil sebagai chip yang bisa dihapus; kegagalan baca memberi tahu apa yang harus diperbaiki.
- Melampirkan foto **saja sudah cukup** — tidak perlu mengetik kalimat untuk menjelaskan foto STNK sendiri.
- Kartu baru: `document_read` (hasil baca + keyakinan), `offers` (tiga opsi berdampingan), dan `quotation_ready` dengan tombol **Unduh PDF penawaran**.
- Chip cepat baru: "Proposal dari STNK".

**4. Proposal kini mencantumkan alamat tertanggung**
`AgentQuoteSource` menerima `clientAddress`; `fromAgentQuote()` dulu menulis `insuredAddress: '-'` mati. Alamat dari KTP sekarang tercetak di slip.

**5. Skema versi** — `1.57.0` → **`2.1.0`**.

Uji: `services/__tests__/pathyQuotation.test.ts` (15 kasus) — normalisasi NIK, penolakan lampiran yang tidak ada, paritas harga tiga opsi dengan mesin browser, penjumlahan baris premi, penolakan nilai pertanggungan tak masuk akal, bentuk payload proposal, dan **pengabaian premi palsu yang disodorkan ke `build_quotation`**.

---

## v1.57.0 — 2026-09-07

### Tipe akun wajib dipilih — pendaftar baru tidak lagi otomatis jadi nasabah

**Gejalanya:** setiap pendaftar baru langsung masuk ke aplikasi nasabah. Layar pemilihan tipe akun (Nasabah / Mitra / Klien Korporat) yang sudah ada di kode praktis tidak pernah muncul.

**Akar masalahnya bukan layar itu, tapi siapa yang membuat profil lebih dulu.**
`AuthGate.buildUserObj` memanggil `ensureProfile()` **tanpa argumen**. Di sisi server, `ensure_profile` waktu itu jatuh ke `'CUSTOMER'` kalau tidak ada role dari pemanggil maupun dari metadata signup. Jadi begitu `AuthGate` melihat sesi hidup, ia langsung mencetak baris `sp_users` ber-role `CUSTOMER` — dan `RoleSelectionScreen` di `App.tsx` hanya tampil kalau profil **belum** ada. Profilnya sudah keburu ada. Pemilihan tipe akun kalah cepat dari kodenya sendiri.

Ada tiga jalan masuk ke kondisi itu:
1. **APK Android** — OAuth deep link (`com.myinsurepath.os://auth-callback`) tidak membawa `?code=` di URL, jadi penjaga `oauthLoading` di `App.tsx` tidak pernah aktif. `AuthGate` tetap ter-render dan ikut menangkap `SIGNED_IN`. Pengguna Android **selalu** berakhir sebagai nasabah.
2. **Web, koneksi lambat** — timeout 10 detik menurunkan `oauthLoading` walaupun pencarian profil masih berjalan, `AuthGate` mount di tengah jalan, lalu membuat profil `CUSTOMER` di bawah kaki pemilih role.
3. **Kegagalan sementara** — `resolveAndLogin` menangkap error apa pun lalu tetap login memakai objek fallback ber-role `CUSTOMER`.

**Perbaikannya — role dinyatakan, tidak pernah diasumsikan:**
- **`AuthGate.buildUserObj` sekarang read-only** (`get_my_profile` via `fetchMyProfileForLogin`). Ia hanya membuat profil kalau rolenya sudah diketahui dari `user_metadata` (ditanam saat `signUp`). Kalau tidak ada role sama sekali → prop baru `onNeedsRoleSelection` menyerahkan pengguna ke `RoleSelectionScreen`.
- **`App.tsx`** meneruskan `onNeedsRoleSelection` ke `AuthGate`, sehingga pemilih role bisa dipanggil dari jalur mana pun — bukan cuma dari alur OAuth web. State-nya diganti nama `pendingOAuthUser` → `pendingRoleUser` (dan prop `RoleSelectionScreen` `oauthUser` → `authUser`) karena layar ini bukan milik OAuth saja.
- **Timeout `oauthLoading` 10 detik** tidak lagi berlaku selagi pencarian profil berjalan.
- **Konfirmasi email tetap menghormati pilihan awal.** Saat pengguna kembali dari tautan email, `App.tsx` membaca `user_metadata.role` dan membuat profil dengan role itu — tidak menanyakan ulang. Menanyakan ulang berarti pilihan "Mitra" bisa berubah jadi "Nasabah".
- **Toggle Nasabah/Mitra di form registrasi akhirnya terpakai.** `options.data.role` di-hardcode `UserRole.CUSTOMER` dan mengabaikan `regRole`; sekarang mengirim pilihan pengguna. (Cabang AGENT memang dialihkan ke `AgentOnboarding`, jadi ini laten — tapi metadata itulah yang harus bertahan melewati konfirmasi email.)
- **Kegagalan sementara tidak lagi berujung login sebagai nasabah** — tampilkan error dan minta coba lagi. Role yang salah menulis baris yang salah dan tidak memperbaiki diri sendiri.

**Pertahanan di server (agar tidak terulang):** `ensure_profile` menolak membuat profil kalau tidak ada role dari `params.role` maupun `user_metadata.role` → **409 `ROLE_REQUIRED`**, tanpa menulis baris apa pun. Satu-satunya pemanggil tanpa role adalah `AuthGate` yang baru saja diperbaiki, jadi tidak ada jalur sah yang terdampak. Aturan "role immutable setelah profil ada" (v1.52.0) tetap berlaku.

Uji: `services/__tests__/signupRole.test.ts` (8 kasus) mengunci kontraknya — penolakan tanpa role tanpa menulis baris, pembuatan AGENT/CUSTOMER sesuai pilihan, fallback ke metadata signup, penolakan penurunan role, penautan upline referral, dan 404 `get_my_profile` yang menjadi sinyal "tampilkan pemilih role".

Dokumen: `docs/AUTH_FLOW.md` diperbarui menyeluruh.

---

## v1.56.0 — 2026-09-07

### Pathy hidup lagi + bisa membuat penawaran & membaca laporan polis

**1. Kenapa Pathy "tidak jalan" (akar masalahnya, bukan konfigurasi)**
Infrastrukturnya sehat sejak awal: `ai-proxy` v5 ACTIVE dan `OPENROUTER_KEY` ada di Vault. Yang rusak ada di jalur klien:
- `pathyChat()` memanggil `askPathy()` di dalam `try`, lalu `catch`-nya jatuh ke gateway action `pathy_chat`. Action itu butuh `ANTHROPIC_API_KEY` yang **tidak diset**, jadi selalu balas `503 "AI not configured"`.
- `PathyChat.tsx` menerjemahkan pesan itu menjadi *"Fitur AI Pathy akan segera hadir!"*. Akibatnya **setiap** kegagalan — sesi kedaluwarsa, kena rate limit, gangguan jaringan, model down — tampil sebagai "coming soon". Chatbot terlihat mati permanen padahal penyebabnya berbeda-beda.
- Setiap pesan juga membakar satu round-trip gagal ke `/api/ai-gateway`. Endpoint itu hanya ada di `server.ts` (dev); `vercel.json` mengecualikan `api/` dari rewrite SPA dan tidak ada direktori `api/`, jadi di produksi pasti 404.
- Tombol "Chat WhatsApp agen" membuka `wa.me/6280000000000` — **nomor placeholder yang tidak ada**.
- Banner "Pathy dapat melihat data kamu" tidak benar: jalur `askPathy` tidak mengirim data pengguna sama sekali. Konteks polis/klaim hanya ada di action `pathy_chat` yang sudah mati itu.

**2. Edge function baru `pathy-agent` (DEPLOYED v1)** — `supabase/functions/pathy-agent/`
Pathy sekarang asisten ber-*tools* yang jalan di server dengan `service_role`, di-scope ke JWT pemanggil. 8 tool: `get_my_policies`, `get_policy_detail`, `get_my_claims`, `get_my_quotes`, `list_products`, `estimate_premium`, `create_quote`, dan `get_sales_report` (khusus agen).
- **Membuat penawaran via chat** — `create_quote` menulis ke `sp_quotes` status `DRAFT`, berlaku 14 hari. Satu-satunya tool tulis. Untuk CUSTOMER, `agent_id` diambil dari agen pada order terakhirnya supaya penawaran masuk pipeline agen tersebut.
- **Laporan polis pengguna** — `get_my_policies` / `get_policy_detail` / `get_my_claims` membaca baris milik caller sendiri; AGENT lewat `agent_id`, CUSTOMER lewat `client_id`, memakai `ownerIds` kanonik (FIX v1.50.0) agar akun lama tetap kebaca.
- **Laporan penjualan agen** — order, premi bruto/terbayar, komisi, dan saldo dompet (read-only).
- Batas: 4 ronde tool, 60 pesan/jam/user via `sp_rate_limits`, argumen di-clamp di server, identitas tidak pernah diambil dari argumen model, teks pengguna tidak pernah masuk system prompt.
- Dokumentasi lengkap: **`docs/PATHY_AGENT.md`**.

**3. Mesin rate OJK untuk edge function** — `supabase/functions/_shared/ojk.ts`
Cerminan Deno dari `services/ojkRates.ts` supaya premi yang dikutip Pathy sama persis dengan angka wizard beli. Membaca baris aktif `sp_ojk_rate_sets`, dengan tabel bawaan sebagai fallback. `services/__tests__/pathy.test.ts` menguji paritas kedua mesin (rate, premi dasar, add-on, total, mobil & motor) — kalau salah satu tabel diubah tanpa yang lain, tes merah.

**4. UI chat: kartu terstruktur, bukan prosa model**
Hasil tool dirender sebagai kartu (polis, detail polis, klaim, penawaran, rincian premi, penawaran tersimpan, laporan penjualan, produk). Angka datang langsung dari hasil tool, jadi nomor polis atau premi tidak bisa melenceng saat model menceritakannya ulang. Quick-reply diganti dari paragraf kalengan ("buka tab Riwayat…") menjadi pertanyaan sungguhan ke Pathy; chip "Laporan penjualan" hanya muncul untuk akun agen.

**5. Pesan error jujur**
`PathyError` dengan kode `AUTH` / `RATE_LIMIT` / `NOT_CONFIGURED` / `UNAVAILABLE`. Sesi habis → "login ulang", kena kuota → "coba lagi sebentar", fungsi tidak terjangkau → jawaban knowledge-base yang **ditandai** "jawaban umum, aku belum bisa membaca data akunmu".

**6. Bug yang ikut ketemu & diperbaiki**
- **`sp_quotes` tidak punya kolom `details`.** Kolom payload-nya `quote_data` (NOT NULL). `SpQuote`, `saveQuote()`, `AgentQuoteBuilder`, dan action `save_quote` semuanya menulis `details` — jadi **setiap penyimpanan penawaran dari Agent Quote Builder ditolak Postgres**, baik lewat gateway maupun lewat fallback insert langsung. Sekarang memakai `quote_data` (action gateway masih menerima `details` demi klien lama). ⚠️ **`data-gateway` belum di-deploy ulang** — perbaikan sisi klien sudah cukup untuk menyimpan lewat gateway, tetapi deploy tetap disarankan.
- **Nomor WhatsApp** dipusatkan sebagai `SUREPATH_WHATSAPP` di `constants.ts` (`6282199920300`, sama dengan tombol floating di situs); PathyChat tidak lagi memakai placeholder.
- **`askPathy` riwayat percakapan** dikirim sebagai giliran chat sungguhan, bukan satu blob "Riwayat percakapan: …" di dalam pesan user.
- **`aiKnowledge.ts` produk PA** masih memuat klaim "instant approval 60 detik" yang sudah dibersihkan di tempat lain pada v1.55.0 — kini "pendaftaran online singkat", konsisten dengan halaman produk dan `llms.txt`.

---

## v1.55.0 — 2026-09-03

### Produk baru: Climate Shield (pre-launch) + halaman Teknologi AI

**1. Produk `climate` — "Proteksi Iklim / Climate Shield" (`/product/climate`)**
Produk keenam di grid, berstatus **pre-launch**: tidak ada alur beli, CTA-nya "Daftar Minat".
- `siteKit.tsx` — ikon SVG `IconClimate`, entri `PRODUCTS` baru, dan `PRODUCTS` kini diberi tipe eksplisit `SiteProduct[]` dengan flag opsional `comingSoon` (tanpa ini, akses `p.comingSoon` gagal karena TS menyimpulkan union tanpa properti tersebut).
- `productInfoContent.ts` — konten bilingual: 6 fitur, 4 segmen (Rumah & UMKM, Pertanian & Perikanan, Bisnis & Korporat, Kendaraan), 4 item cakupan, dan `disclaimer` wajib. Interface `ProductContent` diperluas: `comingSoon`, `segments`, `disclaimer`.
- `ProductInfoPage.tsx` — badge "Dalam pengembangan — belum dapat dibeli", section "Untuk Siapa", label "Rencana cakupan" di atas Jaminan Perlindungan, CTA "Daftar Minat" (navbar + hero + footer CTA), dan blok disclaimer di bawah CTA.
- Grid produk (`ProductsPage`, `HomePage`) menampilkan badge "Segera Hadir" dan CTA "Pelajari & Daftar Minat". Grid homepage diubah dari `xl:grid-cols-5` → `lg:grid-cols-3` karena produk kini 6.
- **Bahasa dijaga agar tidak mengikat**: "rencana santunan", "ambang yang disepakati", "belum dapat dibeli". Tidak ada premi, angka santunan, atau nama insurer yang disebut.

**2. Halaman baru `/ai` — "Teknologi AI SurePath"** (`src/pages/AITechPage.tsx`)
Sebelumnya website publik praktis tidak menceritakan AI sama sekali (hanya ~6 frasa lepas di file konten). Halaman ini memuat 8 kemampuan yang **sudah live dan wired** di kode, section "Bedanya di Mana" (dulu vs kini), 6 pengaman, dan catatan jujur + tautan ke T&C/Privasi.
- Masuk **navbar utama** (`SiteLayout` → 6 item) + kolom footer Perusahaan.
- Section AI baru di homepage (antara grid produk & kalkulator) dengan 4 kartu ringkas → link ke `/ai`.
- **Aturan penulisan halaman ini** (didokumentasikan sebagai komentar di file): tidak menyebut vendor model mana pun — AI diposisikan sebagai teknologi SurePath; tidak ada angka karangan; tidak ada janji durasi penyelesaian klaim; tidak memuat kemampuan yang kodenya ada tapi tak punya pemanggil.

**3. Perbaikan klaim berlebihan yang sudah tayang (temuan audit)**
- **`explainProductAI` (`services/geminiService.ts`)** — prompt lama menyuruh model memakai kosakata *"Enkripsi Kuantum"*, *"Zero-Trust"*, *"Matriks"*, *"Heuristik"* dan menjelaskan *"instant 60-second claim settlement"*, padahal `aiKnowledge.ts` sendiri menyebut klaim `3-10 hari kerja`. Prompt ditulis ulang: bahasa biasa, **dilarang** menyebut angka/premi/durasi/limit, dilarang menjanjikan hasil, dilarang mengarang fitur atau sertifikasi, dan wajib menyatakan ketentuan mengikuti polis. Interface `ProductExplanation` diganti dari `technicalSummary/neuralBenefits/securityProtocol/impactScore/payoutLogic` → `summary/benefits/dataProtection/claimProcess`; **`impactScore` dihapus** karena skor 0-100 karangan model ditampilkan ke publik.
- **`ProductAIExplainer.tsx`** — ditulis ulang: label palsu (`SECURE_SESSION_ACTIVE`, "Security Grade", progress bar diagnostik simulasi) dihapus, ditambah disclaimer wajib bahwa ringkasan dibuat otomatis, bukan penawaran harga dan bukan jaminan pertanggungan.
- **`services/NeuralGuardService.ts` DIHAPUS** — seluruh isinya data fiktif: `threatsBlocked24h: 12401 + Math.random()*50`, "Neural WAF v4", "Quantum-Resistant Layer", uptime "99.999%", dan 3 baris ancaman hardcoded. Satu-satunya pemakainya (`AdminViews.tsx` → StatCard "Uptime Server") kini menampilkan `N/A`, konsisten dengan StatCard "Latensi Server" di sebelahnya. `generateLiveThreat`/`getRecentThreats` memang sudah tidak punya pemanggil.
- **`AboutPage.tsx`** — nilai "Inovatif" tidak lagi menjanjikan *"instant approval"*.

**4. SEO**
- `seo.ts` — descriptor `/product/climate` (+ `Service` & `BreadcrumbList` JSON-LD) dan `/ai`. **Dua** regex slug produk harus diperbarui: di `App.tsx` (routing) dan di `seo.ts` `resolveSeo()` (metadata) — kalau hanya satu, halaman render tapi memakai title fallback.
- `sitemap.xml` +2 URL (24 → 26), `llms.txt` menambah bagian "Penggunaan AI" beserta batasannya dan produk climate dengan status "belum dapat dibeli".

**5. Klaim tak terverifikasi di halaman /security & produk (lanjutan dari poin 3)**
- `staticPagesContent.ts` — halaman **Keamanan Data**: klaim **"SLA uptime 99,9%"** dan **"Infrastruktur bersertifikasi SOC 2 Type II"** dihapus. Kalimatnya kini menyebut lokasi hosting (AWS ap-southeast-1) dan secara eksplisit menyatakan bahwa sertifikasi kepatuhan di lapisan infrastruktur adalah milik penyedia infrastruktur, **bukan sertifikasi atas nama SurePath** — perbedaan yang penting kalau klaim ini dipertanyakan. Istilah pemasaran **"Arsitektur Zero-Trust"** diganti deskripsi mekanisme yang benar-benar ada di kode: tabel sensitif tidak dapat diakses langsung dari browser, setiap permintaan diverifikasi ulang di server per aksi (pola data-gateway + deny-all RLS).
- `productInfoContent.ts` — produk **Kecelakaan Diri**: janji **"Pendaftaran online selesai hanya dalam 60 detik"** dan chip **"Daftar 60 Detik"** / **"Instant Approval"** diganti "Pendaftaran online singkat" / "Daftar Online" / "Proses Digital". Produk **Proteksi Barang**: **"Garansi perbaikan dengan teknisi tersertifikasi"** → "Perbaikan dikerjakan oleh teknisi rekanan kami" (menghapus klaim garansi sekaligus klaim sertifikasi teknisi).

**Verifikasi:** `tsc --noEmit` bersih · 72/72 unit test pass · `npm run build` sukses · ESLint 2 error, keduanya pre-existing (identik sebelum perubahan) · halaman `/ai`, `/product/climate`, `/products`, `/` di-render dan diperiksa lewat build produksi lokal + Chromium.

**Catatan:** tidak ada edge function yang berubah, jadi tidak ada yang perlu di-deploy ke Supabase.

---

## v1.54.0 — 2026-08-09

### SEO Audit + Fix (score ~6.5 → ~9.5/10)
Audit SEO menyeluruh. Homepage statis sudah kuat (JSON-LD @graph, OG, FAQ schema), tapi ada gap kritikal untuk SPA client-rendered ini.

**Kritikal — per-route metadata (dampak terbesar):**
- **`src/seo/seo.ts` (baru)** — head manager per-route tanpa dependency. Sebelumnya SEMUA halaman marketing/produk/blog (20+ URL) mewarisi `<title>`, description, canonical & OG homepage dari index.html → Google melihat 20+ halaman "duplicate metadata", nol keyword targeting per halaman. Sekarang tiap route punya title, meta description, canonical, robots, Open Graph, Twitter card, dan JSON-LD unik.
- **Di-wire di `App.tsx`** via satu `useEffect([currentPath])` → `applyDocumentHead(resolveSeo(path))`. Googlebot merender JS dan meng-index DOM hasilnya.
- **Per-product JSON-LD** — tiap `/product/:slug` dapat `Service` + `BreadcrumbList` schema + title kaya keyword (mis. "Asuransi Mobil All Risk & TLO Online | Premi Tarif OJK").
- **Per-blog-post** — tiap `/blog/:slug` dapat `Article` + `BreadcrumbList` schema + title/description unik.
- **App/portal routes → `noindex, follow`** — `/login`, `/custapp`, `/agapps`, `/operatorapp`, `/insurerapp`, `/admin`, `/select-app`, `/review/`, `/q/`, `/payment`, dan path tak dikenal (cegah soft-404 ke-index).

**Teknikal:**
- **hreflang phantom dihapus** (`index.html`) — `hreflang="en" → /en/` menunjuk path yang tidak ada (toggle EN client-side saja, tidak ada URL /en/ terpisah). Menyisakan `id` + `x-default`.
- **viewport a11y** — hapus `maximum-scale=1, user-scalable=no` (fail WCAG 1.4.4 + Lighthouse). Zoom kini diizinkan.
- **robots.txt dikonsolidasi** — dulu ada DUA file (root + public/) yang saling berbeda aturannya; Vite hanya serve `public/`. Root file dihapus. Canonical: disallow semua app/portal + tokenized path, allow marketing.
- **sitemap.xml diperbaiki + dikonsolidasi** — dulu ada dua file berbeda; root dihapus. Fix: buang `/agent` & `/claim` (bukan route → soft-404), hapus `/contact` duplikat, tambah 5 URL artikel blog, tambah `/cookie`, refresh semua `lastmod`. 24 URL valid.
- **Organization schema diperkaya** (`index.html`) — `legalName` (PT Ruang Proteksi Indonesia), `slogan`, logo `width/height`, `sameAs` (Twitter @SurePathID yang memang sudah dideklarasikan di twitter:site).

**Catatan:** placeholder `%VITE_GSC_VERIFY%` / `%VITE_GA4_ID%` di index.html di-inject Vercel saat build (env sudah diset di prod) — sengaja tidak diubah agar analytics prod tidak putus.

---

## v1.53.0 — 2026-08-03

### Full audit hardening (P0 + P1 fixes)
Hasil audit lengkap 2026-08-03 (skor keseluruhan B, 7.4/10): 19 npm vuln, 30+ Supabase linter warnings, 331 raw `console.*` di prod bundle, Playwright e2e mengarah ke prod. Rilis ini menutup semua P0 dan quick-win P1.

**Dependency (11 vulnerabilities eliminated: 19 → 8):**
- `react-router-dom` bumped ke `^7.18.2` (CSRF fix GHSA-qwww-vcr4-c8h2) — app pakai HashRouter jadi exposure rendah tapi patch trivial.
- `overrides` di `package.json` untuk force-resolve transitive vulns: `nanoid ^3.3.16` (GHSA-28wg-ghj8-5hjv infinite loop), `dompurify ^3.4.13` (GHSA-55q2-fjhq-7xh7 XSS), `@xmldom/xmldom ^0.8.13` (GHSA-2v35-w6hq-6mfw DoS), `picomatch ^4.0.4`, `brace-expansion ^2.0.3`, `fast-uri ^3.1.1`, `body-parser ^2.3.0`, `serialize-javascript ^7.0.3` (RCE fix).
- Sisa 8 vulns semua build-time (esbuild, postcss, vite, tar, undici, babel/*) — tidak ship ke user, dijadikan P2 backlog.

**Database security (migration `20260803_security_hardening_v1_53.sql`, sudah diapply prod):**
- **Deny-all RLS policies** eksplisit pada 7 tabel gateway-only (`admin_audit_logs`, `admin_sessions`, `sp_bot_config`, `sp_otp_codes`, `sp_payments`, `sp_policy_orders`, `sp_wa_logs`) — sebelumnya RLS on tanpa policy (implicit deny). Sekarang eksplisit dengan `USING(false) WITH CHECK(false)` untuk `anon` + `authenticated`. Tidak mengubah perilaku (gateway pakai service_role), tapi mendokumentasikan intent dan menghilangkan linter 0008.
- **REVOKE EXECUTE** dari `anon` + `authenticated` pada 6 SECURITY DEFINER helper yang seharusnya hanya dipanggil dari trigger/service_role: `force_delete`, `soft_delete`, `notify_new_withdrawal`, `notify_paid_payment`, `log_sp_users_role_change`, `increment_rate_limit`. Sebelumnya semua exposed via `/rest/v1/rpc/*` (walau ada admin check internal).
- **REVOKE EXECUTE dari `anon`** (bukan authenticated — masih dibutuhkan RLS policies) pada `is_admin`, `is_operator`, `is_staff`.
- **SET search_path** pada 3 SECURITY DEFINER function: `gen_agent_agreement_no`, `block_hard_delete`, `audit_critical_update` — mencegah search_path hijacking.

**Client & build:**
- **`console.log`/`debug`/`info` di-strip di production build** (`vite.config.ts` → terser `drop_console`) — 331 statement di 91 file tidak lagi ship. `console.error`/`warn` dipertahankan untuk Sentry breadcrumbs.
- **`playwright.config.ts` tidak lagi mengarah ke prod secara default** — sekarang baca `PLAYWRIGHT_BASE_URL` (biasanya URL Vercel preview di CI), fallback ke `http://localhost:3000`. Opt-in eksplisit ke prod via env `UNSAFE_E2E_AGAINST_PROD=1`.

**Edge function (data-gateway):**
- **`admin_apply_migration` action dihapus** — SQL executor via HTTP (bahkan dengan MASTER_ADMIN gate) adalah attack surface yang tidak perlu. Migration yang di-apply-nya sudah live sejak v1.42; source removed.

**Catatan deploy:**
- Migration DB: sudah diapply ke production via Supabase MCP.
- Client v1.53.0: auto-deploy dari Vercel setelah merge.
- Edge function bundle: masih perlu manual redeploy — hanya perubahan ini adalah remove `handleMigrationAction`; efeknya sama (kalau action ini dipanggil tanpa redeploy, tetap dijaga oleh MASTER_ADMIN check yang belum berubah di bundle lama).

---

## v1.52.0 — 2026-08-03

### Fix Login Gagal untuk Mitra Baru + Role Stickiness Guarantee
Bug lapangan (Stephen Cheng): user OAuth Google yang baru daftar sebagai Mitra kadang stuck di layar loading lalu balik ke halaman login setelah OAuth callback. Root cause: `buildAndLogin` di `App.tsx` menjalankan dua panggilan gateway paralel (`get_user_profile` + `get_my_profile`) dan bila **kedua**-nya gagal transient (5xx / network / cold-start), `profile` = null → RoleSelectionScreen. Jika user mengklik "Batal" → logout paksa → balik ke login screen tanpa error yang bisa ditindaklanjuti.

**Perilaku yang dijamin sekarang** — siapapun yang pilih *Mitra* akan tetap *Mitra*, siapapun yang pilih *Nasabah* akan tetap *Nasabah*, tidak peduli apa yang terjadi sesudahnya:

- **`fetchMyProfileForLogin(retries=3)` (services/users.ts)** — panggilan tunggal ke `get_my_profile` dengan retry backoff (0.8s / 1.6s / 2.4s). Membedakan **404 (server memastikan tidak ada profil)** dari **transient error (5xx/network/timeout)**. RoleSelectionScreen hanya muncul untuk kasus 404.
- **`callGateway` mengekspos HTTP status** (services/db.ts) — dulu semuanya dilebur ke `error: string`; sekarang caller bisa membedakan 404 dari 5xx.
- **Transient error → login screen dengan pesan Indonesia** — kalau retry mentok, `buildAndLogin` `signOut()` sesi yang gagal + tampilkan banner "Tidak bisa memuat profil kamu. Cek koneksi lalu coba masuk lagi." di AuthGate (props baru `externalError`/`onDismissExternalError`). Tidak pernah membuat profil dengan role salah karena jaringan bergejolak.
- **RoleSelectionScreen selalu percaya role dari server** (components/RoleSelectionScreen.tsx) — bila server balikkan `existed: true` dan role yang tersimpan berbeda dari yang di-klik, tampilkan pesan "Akun ini sudah terdaftar sebagai X" lalu tetap masuk ke portal X. User klik salah pun tidak bisa mengubah role.
- **Server: `ensure_profile` role-immutability guard** (supabase/functions/data-gateway/actions/users.ts) — bila `caller.spUser` sudah ada, param `role` yang berbeda **diabaikan** (log warning `[ensure_profile] role-change attempt ignored`). Sama untuk lookup by-email. Response menyertakan `existed: true/false`.
- **DB trigger: `trg_sp_users_role_change_audit`** (migration `20260803_role_change_audit.sql`, sudah diapply production) — setiap `UPDATE` pada `sp_users.role` menulis baris `ROLE_CHANGE` ke `sp_audit_log` (old & new role + allowed_apps). Jejak audit ada bahkan bila application layer entah-bagaimana bypass `ensure_profile`.

**Catatan deploy:** bundle production data-gateway (v3 lama, single-file minified) belum di-redeploy dari sesi ini — perubahan `ensure_profile` di source akan aktif ketika data-gateway di-redeploy berikutnya (`npx esbuild supabase/functions/data-gateway/index.ts --bundle --format=esm --platform=neutral --external:npm:* --minify`). Fix client + trigger DB sudah cukup untuk menghilangkan gejala; server-side hardening bersifat defense-in-depth (perilaku "return existing profile as-is" untuk user yang sudah punya row sudah ada di bundle production, jadi role stickiness pasti aktif).

---

## v1.51.0 — 2026-07-17

### Fix QR E-Quotation di PDF — 1 Quotation = 1 QR Unik, Berlaku 14 Hari
QR pada PDF quotation sebelumnya "nyasar ke aplikasi": user yang sudah login (agen/admin yang menguji QR-nya sendiri) di-redirect paksa ke portalnya, sehingga halaman `/q/{code}` tidak pernah tampil.

- **Redirect pasca-login tidak lagi membajak halaman publik** — `App.tsx` kini melewatkan `navigate(rolePath)` bila pathname adalah `/q/`, `/review/`, atau `/payment/`; siapa pun (login ataupun tidak, punya app ataupun tidak) yang scan QR mendarat di halaman e-quotation HTML khusus quotation tsb.
- **Masa berlaku link 14 hari** — kolom baru `sp_quotations.link_expires_at` (default `now() + 14 hari`, di-refresh setiap PDF digenerate ulang; migrasi `20260717_quotation_link_expiry.sql` sudah diapply ke production, row lama di-backfill dari `created_at`). Setelah lewat, halaman menampilkan status *Kedaluwarsa* dan konfirmasi ditolak (HTTP 410). Halaman publik kini menampilkan "Tautan aktif s/d …".
- **`quotations-gateway` jadi runtime kanonik** — client memanggil bridge ini DULU untuk semua action quotation (data-gateway hanya fallback jaringan), karena bundle data-gateway di production dideploy manual dan bisa tertinggal. Bridge v2 sudah dideploy dengan penegakan expiry; modul `data-gateway/actions/quotations.ts` di repo ikut disinkronkan.
- **QR PDF tidak pernah fallback ke homepage** selama `eQuoteCode` ada — 1 quotation, 1 QR unik ke `https://myinsurepath.com/q/{code}`.

---

## v1.50.0 — 2026-07-17

### Website Speed Optimization + PWA Direct-Install Popup
Audit Lighthouse (mobile, production build): skor performa **64 → 82**, FCP 3.8s → 2.4s, LCP 5.1s → 3.6s, Speed Index 25s → 6.6s, total bytes first load 3,7MB → 2,1MB.

**Performa:**
- **Hero video tidak lagi di-download 2×** — `HeroVideo` sebelumnya di-mount dua kali (varian desktop + mobile, disembunyikan CSS) sehingga `hero.mp4` 1,1MB terunduh ganda; kini satu `<video>` dengan `desktopPosition` responsif via matchMedia
- **Hero video lazy** — `preload="none"` + IntersectionObserver; poster (`promo-poster.jpg`, di-preload `fetchpriority=high`) tampil seketika sebagai LCP, mp4 menyusul setelah paint
- **Background video (`promo.mp4` dkk.) ditunda** — dimuat saat browser idle setelah `load`, tidak bersaing dengan resource kritis
- **Google Fonts non-render-blocking** — pola `media="print" onload` + fallback `<noscript>`; teks tampil langsung dengan font fallback (display=swap)
- **Precache service worker 4,2MB → ~1,5MB** — chunk portal berat (Agent/Admin/Operator/Insurer/Customer/B2B, jspdf, AnalyticsDashboard, stnkOcr, geminiService, dst.) dikeluarkan dari precache; di-cache on-demand via runtimeCaching (CacheFirst untuk asset ber-hash, SWR untuk gambar + Google Fonts)
- **Manual chunk `pdf` + `recharts` dihapus** — manual chunk menyerap dependency bersama sehingga entry utama meng-import statis ±240KB jspdf+recharts di SEMUA halaman termasuk homepage; code-splitting alami kini mengisolasi keduanya ke halaman yang memakainya
- **Logo dioptimalkan** — `surepath-logo-sm.png` (3KB, dari 102KB) untuk navbar/badge; `logo-sm.png` (11KB, dari 73KB) untuk splash/install prompt/app selector; file asli tetap ada untuk og:image

**PWA:**
- **Popup install langsung, hanya mobile view** — `InstallPrompt` + popup marketing site kini hanya muncul otomatis di mobile (viewport ≤768px / pointer coarse) dan HANYA saat browser menyediakan `beforeinstallprompt` (Android/Chromium) → tombol "Pasang Sekarang" memicu dialog install native satu ketuk
- **Sheet instruksi "cara pasang" dihapus** dari popup otomatis (iOS Safari tidak punya API install langsung, jadi tidak ada auto-popup di iOS); tombol Install di navbar tetap tersedia di desktop

---

## v1.40.0 — 2026-07-12

### Agent App World-Class Refinement (Stitch-driven, visual only)
Layar Agent app di-refine memakai design system yang digenerate Google Stitch (proyek "SurePath Agent App — Bank-Grade Refinement"):
- **Set ikon custom buatan sendiri** `components/agent/AgentIcons.tsx` — 16 ikon duotone hand-drawn (grid 48px, goresan membulat 3px, tint emerald lembut + aksen emas per ikon): Home, Polis, Buat, Dompet, Profil, Penawaran, Klien, Klaim, Ranking, Jaringan, Renewal, Endors, Koin, Notif, Target, Grafik
- **Bottom nav** — ikon custom menggantikan ikon generik; tombol tengah "Buat" dengan ikon squircle-plus + spark emas
- **Quick actions Beranda** — tile putih mengambang (radius 24px, ambient shadow navy 12%, hover lift) dengan ikon duotone custom per warna kategori
- **Hero Partner Card** — saldo komisi kini gradient emas (spec Stitch: "balance in gold"), label emas, sesuai estetika kartu premium
- **AI Coach card** — ring gradient emerald→gold pada mascot Pathy + ikon target custom
- **Dompet** — ikon wallet & koin custom di kartu saldo
- Design system Stitch tersimpan di proyek Stitch untuk referensi desain selanjutnya
- Logika, proses, menu, dan backend tidak berubah

---

## v1.39.0 — 2026-07-11

### Insurer App UI Redesign + Onboarding (visual only, identitas ungu)
Tema bank modern diterapkan ke Insurer app dengan mempertahankan identitas ungu:
- **Onboarding Insurer 4 slide** — background gradient ungu khusus, ilustrasi sesuai alur kerja insurer: Pengajuan Realtime, Review Satu Layar (skor AI + approve/reject), Terbitkan Polis (scene baru `ObInsIssue`: dokumen polis + seal + upload), Pantau Premi & Pembayaran; tampil sekali via `SP_ONBOARDED_INSURER`
- **OnboardingFlow kini mendukung aksen per-role** (emerald untuk Customer/Agent/Operator, ungu untuk Insurer)
- **`AgentHero` mendukung `tone="purple"`** — gradient navy→ungu untuk seluruh banner insurer
- **Shell InsurerPortal** — bottom nav pill gaya bank + avatar berinisial gradient ungu
- **Dashboard** — hero jadi "Insurer Command Center" bergaya kartu bank + ilustrasi
- **Hero banner + ilustrasi** di Pengajuan Polis, Klaim Polis, Notifikasi Pembayaran (dengan tombol Export CSV terintegrasi), Profil
- **Empty states berilustrasi** di semua daftar + drawer aktivitas
- Logika, proses, menu, dan backend tidak berubah

---

## v1.38.0 — 2026-07-11

### CMS / Admin Panel UI Redesign (visual only)
Tema bank modern v1.36–v1.37 diterapkan ke CMS (Admin Panel):
- **Command banner dashboard** — greeting admin bergaya kartu bank (gradient navy→emerald, pola ring, ilustrasi jaringan, tombol refresh terintegrasi)
- **Hero banner otomatis di semua ±28 menu view** — banner bertema dengan judul menu, subtitle deskriptif, dan ilustrasi yang sesuai konteks (dompet untuk pembayaran/penarikan/komisi, shield untuk klaim/keamanan/OJK, dokumen untuk polis/antrean, storefront untuk B2B/insurer/produk, dst.) — dirender sekali di shell, konsisten di seluruh CMS
- **Sidebar** — tile logo & avatar footer gradient emerald (fungsi upload logo tetap)
- Menu, role-permission, dan seluruh logika CMS tidak berubah

---

## v1.37.0 — 2026-07-11

### Operator App UI Redesign + Onboarding (visual only)
Tema bank modern v1.36 diterapkan ke Operator app:
- **Onboarding Operator 4 slide** — ilustrasi custom sesuai tugas operator: Command Center (antrean realtime), Review & Keputusan (dokumen + skor AI + approve/reject), Pencairan Berlapis (vault + L1/L2/L3), Verifikasi Mitra (ID card + verified check); tampil sekali via `SP_ONBOARDED_OPERATOR`
- **4 scene ilustrasi baru** di `AgentArt.tsx`: `ObOpsQueue`, `ObOpsReview`, `ObOpsPayout`, `ObOpsVerify`
- **Shell OperatorPortal** — bottom nav pill gaya bank + avatar berinisial gradient
- **Dashboard** — hero greeting jadi kartu command center bergaya bank (pola kartu + ilustrasi)
- **Hero banner + ilustrasi** di Antrian Polis, Antrian Klaim, Antrian Penarikan, Verifikasi Agen, Profil
- **Empty states berilustrasi** menggantikan ikon polos di semua antrean + notifikasi
- Logika, proses, menu, dan backend tidak berubah

---

## v1.36.0 — 2026-07-11

### Agent App UI Redesign (visual only — tanpa perubahan backend/fungsi/menu)
Tampilan Agent app dirombak ke gaya modern ala aplikasi bank:
- **Kit ilustrasi baru** `components/agent/AgentArt.tsx` — 4 scene onboarding + 12 spot illustration vector custom (emerald/navy/gold) + komponen `AgentHero` (banner gradient) + `AgentEmpty` (empty state berilustrasi)
- **Onboarding Agent 4 slide** — tiap slide dengan ilustrasi custom sesuai konten: Welcome (dashboard di genggaman), Quote cepat (dokumen + stempel OJK), Komisi & wallet (kartu bank + koin), Growth (trofi + jaringan)
- **Shell AgentPortal** — bottom nav gaya bank dengan tombol tengah "Buat" menonjol; avatar berinisial gradient di header
- **AgentHome** — kartu komisi bergaya kartu bank premium (chip, contactless, pola kartu, kode agen sebagai identitas kartu); teaser leaderboard dengan ilustrasi trofi
- **Hero banner + ilustrasi di semua layar**: Orders/Polis, CRM (Buku Klien), Klaim, Komisi, Dompet, Leaderboard, Jaringan Mitra, Renewal, Endorsemen, Marketplace, Notifikasi, Profil (banner gradient + avatar besar)
- **Empty states berilustrasi** menggantikan ikon polos di seluruh layar agent
- Logika, proses aplikasi, menu, dan backend 100% tidak berubah

---

## v1.35.0 — 2026-07-11

### Quotation Slip PDF di Semua Apps
Template Quotation Slip 4 halaman (v1.33) kini tersedia di seluruh aplikasi:
- **Admin (PolicyOrdersAdmin)** — tombol "Quotation Slip" di modal detail order, tersedia untuk semua status
- **Insurer (InsurerOrders)** — tombol "Unduh Quotation Slip (PDF)" di sheet detail pengajuan; nama insurer dari dashboard dipakai di slip
- **B2B (B2BQuotes)** — tombol "Unduh Quotation (PDF)" per kartu penawaran; adapter baru `fromB2BQuote` untuk penawaran korporasi non-kendaraan (coverage details → tabel jaminan)
- **Customer Car Wizard (StepFinal)** — "Unduh Proposal Penawaran" beralih dari generator lama `proposalPdf` ke template Quotation Slip yang sama via `fromAgentQuote`
- Sebelumnya sudah terpasang: Customer (OrderDetailSheet), Agent (AgentQuoteBuilder), Operator (OperatorOrders) — kini 7 titik unduh dengan 1 template konsisten

---

## v1.26.0 — 2026-07-08

### Comprehensive Test Suite + Health Check + Request ID
- **52 tests** — 43 unit tests (vitest) + 9 E2E tests (Playwright), all passing
- **Health check endpoint** — `GET /functions/v1/data-gateway` returns `{status, service, version, timestamp}`
- **X-Request-ID** — every gateway response includes `X-Request-ID` header for distributed tracing
- **E2E tests** cover: gateway auth (401/404/400), rate limiting (429 burst), insurer decision validation, admin JWT requirement
- **Unit tests** cover: OJK premium calculation (18 tests), AuthService rate limiting (5), promo codes (5), plate codes (4), callGateway pattern (4), data shapes (4)
- **Test infrastructure** — vitest.config.ts + vitest.setup.ts + playwright.config.ts + jsdom environment

---

## v1.25.0 — 2026-07-08

### ESLint + Dark Mode + Security Hardening + Dead Code Purge
- **ESLint installed** — 0 errors, 23 warnings (was configured but never installed; CI lint was silently failing)
- **Dark mode CSS** — 50+ `.dark` overrides in styles.css for admin portal (was broken: 19/21 admin files had 0 dark: variants)
- **Touch target enforcement** — CSS rule: `w-8 h-8` / `w-9 h-9` buttons get `min-width: 44px; min-height: 44px` (WCAG)
- **25 `alert()` → `console.warn()`** across 14 files (was blocking UI thread)
- **Rate limiting: fail-open → fail-closed** (blocks on DB error for security)
- **Demo accounts deactivated** — auth.users entries deleted, trust_score=0
- **Demo1234! redacted** from 4 public docs
- **`WHERE deleted_at IS NULL`** applied to admin_list_orders, admin_list_claims, admin_list_payments
- **sp_page_views RLS fixed** — GRANT SELECT to authenticated/anon (was broken)
- **FloatingWhatsApp** placeholder phone → real business number
- **jspdf lazy-loaded** in 3 car-wizard components (358KB chunk deferred)
- **Dead code deleted** — legacy InsurerPortal.tsx (509 lines), 4 junk files
- **3 overlapping docs deleted** — BLUEPRINT.md, MASTERMIND.md, surepath.md
- **`.env.example` rewritten** — removed Firebase, added all actual env vars + 19 edge functions

---

## v1.24.0 — 2026-07-07

### Phase 1 "Stop the Bleeding" — Audit Quick Wins
- **Junk files deleted** — `[full_path_of_file_1]`, `replace.js`, `replace.cjs`, `remove-unused.ts`
- **Legacy InsurerPortal.tsx deleted** (509 lines dead code, unrouted since v1.21.0)
- **FloatingWhatsApp** placeholder phone → real business number
- **Rate limiting** fail-open → fail-closed
- **`WHERE deleted_at IS NULL`** applied to 3 admin list queries
- **25 `alert()` → `console.warn()`** across 14 files
- **`.env.example`** rewritten with all actual env vars + 19 edge functions documented
- **admin_list_clients** auth clarified (non-admins see own clients only)

---

## v1.23.0 — 2026-07-07

### Rate Limiting, Activity Logging, API Config
- **Rate limiting** — IP-based (60 req/hr) and insurer-token-based (200 req/hr) limits enforced at the gateway via `sp_rate_limits` + `increment_rate_limit()` RPC
- **Activity logging** — every insurer action (login, decision, payment, policy upload) is recorded in `sp_insurer_activity_log` for full audit trail
- **API config management** — `sp_insurer_api_configs` table lets admins store per-insurer integration credentials (endpoint, key, headers) editable from Insurer CMS
- **Security audit** (Phase 3-6 follow-up) — reviewed all new endpoints, confirmed token expiry + revocation + scope checks

---

## v1.22.0 — 2026-07-07

### Reminder System, Email URL Fix, Critical Migration
- **Insurer reminder cron** — new `insurer-reminder-cron` edge function (scheduled every 4h) emails insurers with pending review links; tracks `reminder_count` + `last_reminded_at` on `sp_review_tokens` to avoid spamming
- **Email URL fix** — review-link emails now point at the correct production domain (`https://myinsurepath.com/review/<uuid>`) instead of localhost
- **Critical DB migration** — added `insurer_decision`, `insurer_decision_notes`, `insurer_decision_at`, `insurer_review_token_id` columns to `sp_policy_orders` to persist insurer verdicts
- **Security audit pass** — reviewed token-based auth flow, hardened `is_operator()` + `is_staff()` helpers (search_path fixed, EXECUTE revoked from anon)

---

## v1.21.1 — 2026-07-07

### Insurer CMS Phase 2
- **Token management UI** — admin can list, generate, and revoke `sp_insurer_auth_tokens` from Insurer CMS; expiry + last-used-at surfaced
- **Review link management** — admin can resend / revoke `sp_review_tokens` per order; status badge (pending / submitted / expired) shown
- **`pic_email` field on `sp_insurers`** — distinct from contact email; used as the default recipient for insurer review links + reminders

---

## v1.21.0 — 2026-07-07

### Insurer App (5-tab portal)
- **Complete Insurer portal** — dedicated `/insurerapp` with 5-tab bottom-nav: Beranda (dashboard), Polis (review queue), Klaim, Bayar (payments), Profil
- **Token-based auth** — insurers log in via issued bearer token (no Supabase Auth); tokens stored in `sp_insurer_auth_tokens` with TTL + last-used tracking
- **Supabase Realtime** — operator + insurer apps subscribe to `sp_admin_notifications` / `sp_insurer_activity_log` channels for live updates (new in v1.21+)
- **Authed decision flow** — `insurer_submit_decision_authed` gateway action lets logged-in insurers approve / reject / request-info without needing a fresh review link

---

## v1.20.0 — 2026-07-07

### Insurer Review Flow (operator → email → insurer)
- **Operator approve → email** — when operator approves a queue item, system generates a `sp_review_tokens` row (UUID, 7-day expiry) and emails the insurer a single-order review link
- **Insurer review page** — public `/review/:uuid` route renders order summary + documents + 3 decision buttons (Approve / Reject / Request Info); submission goes through `submit_insurer_decision` gateway action (token verified server-side)
- **Decision persisted** — verdict + notes written back to `sp_policy_orders` and the token marked used; operator sees the decision in their queue in realtime

---

## v1.19.2 — 2026-07-07

### Fix
- **Customer app logout button** — fixed z-index collision with bottom nav + enlarged touch target; button now reliably tappable on iOS + Android

---

## v1.19.1 — 2026-07-07

### Fix
- **Version-gated session refresh** — sessions older than the minimum supported app version are force-refreshed on load; fixes blank-screen bug where stale localStorage sessions referenced routes/keys removed in newer builds

---

## v1.19.0 — 2026-07-07

### Multi-App Login + Agent Verification
- **`allowed_apps` field** — `sp_users.allowed_apps` (array) controls which apps a user can enter; when >1 entry, user lands on `/select-app` to pick; admin can edit from User Management
- **Agent verification tab** — operator app gains a "Verify Agent" tab listing `sp_users` with role=AGENT + `is_verified=false`; operator can view KTP + agreement + approve (`admin_verify_agent`)
- **SettingsView fix** — broken settings tab in operator app (was 404'ing) re-wired to the right component

---

## v1.18.2 — 2026-07-07

### Fixes (Operator App polish)
- **Bottom nav fixed** — active tab state was not reflecting current route; now uses `useLocation` correctly
- **Dark mode** — operator app now respects `sp_dark_mode` localStorage like customer + agent apps
- **Polis detail sheet** — added document viewer (image + PDF) inside the operator's policy detail bottom-sheet; previously documents were download-only

---

## v1.18.1 — 2026-07-07

### Fix
- **`is_suspended` column** — production `sp_users` schema was missing the `is_suspended` column added in v1.18.0; added via hotfix migration, unblocking operator suspend/unsuspend actions

---

## v1.18.0 — 2026-07-07

### Operator App
- **Dedicated `/operatorapp` route** — separate PWA with 5-tab bottom-nav: Antrean (queue), Polis, Klaim, Penarikan (withdrawals), Profil
- **OPERATOR role** — new `sp_users.role = 'OPERATOR'` with scoped permissions; `is_operator()` SECURITY DEFINER helper gates actions
- **Realtime notifications** — operator notifications panel subscribes to `sp_admin_notifications` via Supabase Realtime; new items appear without refresh
- **Agent verification queue** — operator can review + verify newly registered agents (KTP + agreement check) before they can sell
- **New gateway actions** — `admin_queue_summary`, `admin_mark_all_notifications_read`, `admin_list_pending_agents`, `admin_get_agent_detail`, `admin_verify_agent`

---

## v1.17.0 — 2026-07-07

### Stabilization Release
- Pre-Operator-App baseline; security + RLS hardening in preparation for the Operator App launch (v1.18.0)
- Internal housekeeping, dependency bumps, and CI tweaks — no public-facing UX changes
- Build + lint green; CI gate (`tsc --noEmit` + build) active on every PR to `main`

---

## v1.16.1 — 2026-07-04

### Quote / Order Fixes (Phase 5)
- **OJK-accurate agent quotes** — AgentQuoteBuilder premium calc & rate display now use the official `getBaseRateByBand()` (SEOJK 6/2017) instead of hardcoded 2.5%/1.8%
- **Photo survey is purchase-only** — customer PreSummary makes the quote path explicit: "Unduh Penawaran" gives a quote PDF with no photo survey; survey is only required to continue to purchase / issue policy / pay
- **Silent save failures surfaced** — agent quote save now alerts on failure (RLS/connection) instead of appearing to succeed, so missing records are visible
- **Note (backend):** `sp_policies`/`sp_commissions` direct client inserts are service-role-only by design; the agent "convert" shortcut is superseded by the gateway order flow (`create_policy_order`)

---

## v1.16.0 — 2026-07-03

### Security Audit & Clean Handover (Phase 4)
- **Repo cleaned for client handover** — removed 200+ AI dev-tooling files not part of the app (`.agents/` marketing skills, `.claude-flow/`, `CLAUDE.md`, `.mcp.json`, `skills-lock.json`); all now gitignored
- **AI-vendor branding removed from UI** — "Claude AI" labels in admin AI views replaced with "SurePath AI"; error messages genericized (no vendor key names shown to users)
- **`is_admin()` hardened** — fixed `search_path` (prevents search_path injection on SECURITY DEFINER function); `EXECUTE` revoked from `anon` role
- **Security audit run** (Supabase advisor) — confirmed sensitive tables use the intended gateway-only deny-by-default RLS pattern; no secrets in repo; documented posture
- **`docs/HANDOVER.md`** — complete client onboarding guide (stack, env vars, deploy, architecture, security, docs index)
- No functional/frontend code paths changed; build + lint green

---

## v1.15.1 — 2026-07-03

### Website Footer (Phase 3)
- **Bug utama footer diperbaiki** — `navigate()` kini scroll ke atas saat pindah halaman; sebelumnya klik link footer terasa "tidak berfungsi" karena viewport tetap di bawah
- **Halaman Kontak diaktifkan** — `ContactPage` yang sebelumnya tidak pernah dirender kini terhubung ke rute `/contact`; link "Hubungi Kami" di footer berfungsi
- **Konten footer dilengkapi** — kolom kontak (email, telepon, lokasi), link Kemitraan & Kebijakan Cookie ditambahkan ke kolom yang sesuai
- **Disclaimer regulasi OJK** — pernyataan bahwa SurePath adalah platform teknologi yang memasarkan produk asuransi berizin OJK (bukan perusahaan asuransi) — kepatuhan penting untuk situs asuransi
- **Tahun copyright dinamis** + nama badan hukum `PT SurePath Digital Indonesia`
- Handle media sosial dirapikan ke `myinsurepath`

---

## v1.15.0 — 2026-07-03

### Agent Legal Agreement (Phase 2)
- **Perjanjian Kerja Sama Keagenan wajib** — agen baru harus membaca & menyetujui syarat-ketentuan sebelum bisa mengakses aplikasi; akses diblokir penuh sampai disetujui (`AgentAgreementGate`)
- **10 pasal legal komprehensif** melindungi perusahaan: definisi, ruang lingkup & status hubungan, kewajiban/larangan agen, komisi & clawback, pernyataan & jaminan, ganti rugi/indemnifikasi, sanksi & pengakhiran, kerahasiaan & UU PDP, hukum yang berlaku & domisili PN Jakpus, persetujuan elektronik (UU ITE)
- **Nomor surat otomatis** — format `SP-AGR-YYYY-NNNNN` via sequence PostgreSQL
- **Nama lengkap + Nomor KTP 16 digit wajib** dilampirkan sebagai persetujuan elektronik yang sah
- **Timestamp presisi** (`accepted_at`) + user-agent terekam untuk audit
- **Cetak PDF** dokumen perjanjian lengkap dengan blok para pihak, 10 pasal, bukti persetujuan bernomor & bertimestamp (KTP dimask sebagian)
- **Rekam CMS lengkap** — menu admin "Perjanjian Agen": tabel searchable semua agen yang menyetujui + unduh PDF per agen untuk audit internal
- **Keamanan DB** — tabel `sp_agent_agreements` dengan RLS (agen hanya insert/baca miliknya; admin baca semua; tanpa policy update/delete = immutable), constraint KTP 16 digit, unik per agen per versi dokumen

---

## v1.14.1 — 2026-07-03

### Fixes (Phase 1)
- **Popup install PWA muncul andal** — fallback 4 detik saat browser tidak mengirim `beforeinstallprompt` (menampilkan panduan pasang via menu browser); kunci dismiss kini per-versi sehingga setiap rilis menawarkan ulang sekali
- **Versi app di My Profile** — baris `SurePath · v<versi>` di bawah tombol Keluar pada profil Nasabah dan Agen

---

## v1.14.0 — 2026-07-03

### Insurer Selection, Success Animations, PWA Popup, Product Cards
- **5 asuransi dengan logo brand** — Intra Asia, Zurich Asuransi Indonesia, Tugu Insurance, Asuransi Sinar Mas, Sompo Insurance Indonesia; SVG brand mark per insurer (`InsurerLogos.tsx`), badge berwarna khas masing-masing
- **Pemilihan asuransi terhubung CMS** — StepProviders kini membaca `sp_insurers` Supabase (toggle aktif via admin InsurerAdmin); sebelumnya dari IndexedDB lokal yang basi; fallback aman ke konstanta saat offline; 5 insurer di-seed ke CMS
- **Langkah pemilihan asuransi terpisah** dari lembar coverage (langkah 3 wizard) dengan kartu kaya: logo, rating, cashback koin, kecepatan klaim, keunggulan, kelebihan/kekurangan, banding hingga N asuransi
- **SuccessBurst** — animasi perayaan reusable (confetti + centang menggambar + ring) untuk pembayaran berhasil, pengajuan terkirim, dan redirect pembayaran Xendit
- **Popup install PWA baru** — glass sheet dengan logo resmi, 3 benefit, panduan iOS langkah demi langkah, CTA gradient
- **Kartu produk asuransi lebih kreatif** — rail warna identitas produk, ikon watermark oversized, tile ikon dengan ring + tilt saat hover, chip AI emerald

---

## v1.13.0 — 2026-07-03

### 3-Page Proposal PDF + Reliability
- **Proposal penawaran 3 halaman** (`services/proposalPdf.ts`) — Hal 1: cover branded (emerald full-bleed, logo resmi, kartu nama klien, jalur dekoratif); Hal 2: penawaran + intro personal, grid info kendaraan, tarif OJK, tabel rincian premi zebra, bar total; Hal 3: ringkasan manfaat per tipe perlindungan, syarat & ketentuan PSAKBI, lembar persetujuan (kotak tanda tangan Tertanggung + Agen), footer bernomor halaman
- **Tombol "Unduh Proposal Penawaran (PDF)"** di langkah Ringkasan wizard beli nasabah — tepat sebelum tombol bayar (sebelumnya tidak ada sama sekali di app nasabah)
- **Agent quote PDF** kini memakai proposal 3 halaman yang sama (menggantikan PDF 1 halaman lama)
- **Total Dicairkan real** — AgentCommission menjumlahkan withdrawal berstatus DISBURSED dari Supabase (sebelumnya hardcoded Rp 0)
- **CI gate** — GitHub Actions: `tsc --noEmit` + build wajib hijau di setiap PR ke main
- **Sentry error monitoring** — `@sentry/react` terpasang; aktif otomatis saat `VITE_SENTRY_DSN` diisi di environment (no-op tanpa DSN)

---

## v1.12.0 — 2026-07-03

### Auth & Login Experience Overhaul
- **AuthGate redesigned** — dark aurora replaced with the app's light emerald-glass theme: ambient wash, sp-glass card, official logo, gradient CTA; all aux screens (check-email, forgot, OTP, reset) rethemed
- **Google on register** — "Daftar dengan Google" now on the Register tab (was sign-in only); OTP/magic-link stays on sign-in
- **Login success screen modernized** — new AppEntryScreen: light theme, official logo in glass tile with expanding success rings, draw-in check badge, emerald confetti burst, personalized greeting; faster (1.95s vs 2.3s)
- **AdminLogin rethemed** — near-black hacker style replaced with the same light emerald-glass language; official logo replaces generic shield icon
- **Admin CMS shell harmonized** — root/sidebar/header/notification surfaces now emerald-tinted glass (dark variant of the same design family; light variant aligned to #f6faf7)

---

## v1.11.0 — 2026-07-03

### Official Brand Assets + PWA Hardening + Creative UI
- **Official logo everywhere** — uploaded brand shield + wordmark converted to all sizes: pwa-192/512, maskable-512 (62% safe zone), apple-touch-icon 180, favicon-32/64 PNG, logo.png (in-app headers via SurePathLogo), logo-full.png, og-image 1200×630, play-store-icon
- **PWA hardened** — explicit `registerSW({ immediate: true })` in entry (was relying on auto-injected script only); brand favicons linked in index.html
- **Version badge visible in apps** — v{APP_VERSION} chip in Customer and Agent portal headers (was only on website navbar)
- **New creative loading animation** — floating official logo with ground shadow, winding SurePath 'path' being drawn with traveling dot (offset-path), rising leaf particles, light theme
- **Illustrative onboarding scenes** — 6 hand-built animated vector illustrations (protection umbrella, photo-claim with AI scan, human support, quote doc, commission coins, network nodes) replacing icon-orbit composition
- **Custom menu icons** — bottom navs of both portals now use mascot-motif Bot icons (Home, Shield, ClaimCam, Policy, Wallet, User)
- **Card design refined** — emerald-tinted glass gradient, branded borders (emerald-100/emerald glow on hover), layered depth shadows, warmer dark variant

---

## v1.10.0 — 2026-07-02

### World-Class App Refine (Gojek-grade, 4 phases — auto-deployed per phase)
- **Phase 1 — Animated loading + brand icons**: PortalLoader rebuilt (mascot shield, pulse rings, orbiting dot, ambient wash, sequenced dots); 7 new mascot-motif icons (BotWallet, BotCoin, BotPolicy, BotClaimCam, BotAgent, BotHome, BotChart)
- **Phase 2 — Illustrated onboarding**: fullscreen role-aware tour (3 slides nasabah, 3 slides agen) with floating hero badge + satellite icons, glass bottom card, progress dots, skip, safe-area, reduced-motion; wired to first-run via SP_ONBOARDED_<role>
- **Phase 3 — Quotation PDF rebrand**: emerald palette (was orange/navy), vector shield logo, 'Tarif OJK' transparency row (rate % + band), emerald notes box, myinsurepath.com footer
- **Phase 4 — CMS alignment**: 'Onboarding Apps' section in Website Editor (admin can toggle tour visibility platform-wide via sp_website_config); OnboardingFlow honors is_visible kill-switch

---

## v1.9.1 — 2026-07-02

### Mobile App UI — Glassmorphism Refine
- **True glass surfaces** — new `sp-glass` / `sp-glass-strong` utilities: backdrop blur + saturation, inset edge-refraction highlight, emerald-tinted shadows, full light/dark variants
- **Uniform across portals** — identical glass treatment for Customer and Agent apps (cards, headers, bottom navs)
- **Ambient emerald wash** — fixed radial gradient backdrop (`sp-ambient`) behind content so glass has depth to refract
- **41 surfaces converted** — CustomerPortal, AgentHome, AgentPortal chrome, AgentWallet, AgentCommission, AgentProfile, AgentCRM, AgentNetwork, AgentLeaderboard, OrderDetailSheet (bottom sheet now frosted over dimmed backdrop)
- Empty-state dashed cards intentionally kept flat for contrast

---

## v1.9.0 — 2026-07-02

### OJK Rate Engine (SEOJK No. 6/SEOJK.05/2017 — 100% accuracy)
- **Base rates corrected** — all COMP/TLO MIN/MID/MAX tables in `services/ojkRates.ts` now exact per Tabel IV.A (TLO was inverted; Cat 4/5 COMP too high; motorcycle rates wrong)
- **Motorcycle TLO zone-dependent** — W1 1.94%, W2 1.98%, W3 0.74% (was flat 0.65%)
- **Perluasan corrected per Tabel IV.B** — SRCC & Terorisme: COMP 0.05% / TLO 0.035% (was 0.07% flat); TPL now progressive (1% / 0.5% / 0.25% tiers); terrorism add-on added
- **Rate band selection** — `rate_band` (MIN/MID/MAX) column in `sp_product_configs`; three-way selector in ProductConfigAdmin; public calculator shows all three bands (Batas Bawah / Tengah / Atas)
- **Single source of truth** — `constants.ts getOJKRate()` now derives from `services/ojkRates.ts`

### Full Platform Audit Fixes
- **CRITICAL: AgentQuoteBuilder crash fixed** — `CAR_DATABASE` was referenced but never imported (ReferenceError when agent edits year on car quote)
- **CRITICAL: ProductAIExplainer crash fixed** — read nonexistent `data.benefits` (correct: `neuralBenefits`); crashed on render
- **Admin: backup date fixed** — read `createdAt` instead of `created_at`; showed "Invalid Date"
- **Admin: withdrawal disburse button fixed** — redundant condition made the button logic unreachable for APPROVED status
- **@types/react installed** — React 19 type definitions were missing entirely; surfaced 24 latent type errors, all fixed
- **Lint green** — `tsc --noEmit` now passes with 0 errors (was 79)
- **Security: internal PDFs removed from public/** — HANDOVER.pdf, MASTERMIND.pdf, PANDUAN_IT_SUREPATH.pdf were publicly downloadable
- **Dead code removed** — `CarInsuranceWizard1.tsx`, `ui/signin-page.tsx` (never imported)
- **Version aligned** — package.json + `src/version.ts` bumped to 1.9.0 (were stuck at 1.8.0 while CHANGELOG said 1.8.4)
- **Type safety** — `SpPolicyOrder.coverage_type` widened for CUSTOM/MPAR/PA/TRAVEL/LIFE wizards; `SpUser` B2B company fields typed; quote types include MOTORCYCLE

---

## v1.8.4 — 2026-06-15

### Fixes (Agent Portal)
- **AgentWallet wired** — `AgentWalletView` added as `wallet` case in `AgentPortal` renderTab; previously orphaned and unreachable
- **Withdraw button fixed** — `handleWithdraw` in `AgentCommission` now navigates to wallet tab via `onNavigate` prop instead of showing a fake success toast
- **CANCELLED status in order list** — Added `CANCELLED` to `STATUS_META` and filter tabs in `AgentOrderStatus`
- **Order load error handling** — `useEffect` in `AgentOrderStatus` now catches errors; loading spinner no longer hangs on failure

---

## v1.8.3 — 2026-06-15

### Fixes (Admin UX)
- **Approvals for ADMIN role** — "Antrean Polis" menu now accessible to `ADMIN` role (was `MASTER_ADMIN` + `INSURANCE_ADMIN` only)
- **CANCELLED order status** — Added `CANCELLED` to `SpPolicyOrder['status']` type; `STATUS_META` and filter tabs in `PolicyOrdersAdmin` now render cancelled orders correctly instead of crashing
- **Dashboard stats auto-refresh** — `adminStats` + `transaksiStats` now refresh every 2 minutes automatically; manual Refresh button added to Dashboard header
- **User list refresh** — Refresh button added to `UserManagementView` so newly registered users appear without full page reload

---

## v1.8.2 — 2026-06-14

### New Features
- **Order history refetch** — Submissions now appear instantly after wizard completion; history tab auto-refreshes; manual refresh button (spinning `RefreshCw`) added
- **Order detail sheet** — Tap any policy card in history → bottom-sheet with status timeline, vehicle/coverage/premium breakdown, AI survey result, cancel/resubmit actions
- **Cancel pending submission** — Customer can cancel `SUBMITTED`/`UNDER_REVIEW` orders; server-side ownership check (`cancel_my_order` gateway); `CANCELLED` status shown in history
- **Resubmit flow** — "Ubah & Ajukan Ulang" cancels current order and routes back to buy wizard
- **Profile: Display Size** — `AccessibilitySettings` component: pick Kecil/Normal/Besar (0.9×/1.0×/1.15×), persists to localStorage, applies as `html { font-size }` for rem-based scaling
- **Manual dark mode only** — Dark mode no longer auto-switches by time or system preference; all portals (Customer, Agent) read/write `sp_dark_mode` localStorage key

### Fixes
- **Status bar white** — `theme_color` and `<meta name="theme-color">` changed to `#ffffff`; mobile status bar now white/neutral
- **Navbar pill UX** — Active tab uses soft pill (`bg-emerald-50`, `rounded-full`, `scale-[1.08]`, `-translate-y-0.5`); inactive = `text-gray-400`; z-index `z-[1000]`
- **Wizard step indicator** — Replaced dot-connector bar with segmented pill track; gradient fill on completed segments; glow on active; label + "Langkah X/N" below
- **Animation utilities** — `animate-fade-in`, `animate-slide-up`, `animate-scale-in` keyframes in `styles.css`
- **cancel_my_order** gateway action added + `cancelMyOrder` service fn + `CANCELLED` status in `SpPolicyOrder` type

---

## v1.8.1 — 2026-06-14

### New Features
- **Banner image upload** — Admin can upload image as promo banner background; `PromoBanner` renders image with gradient overlay when set; text-only emerald fallback when no image
- **PWA update notification** — `AppUpdateNotification` toast (bottom-right, emerald border) appears on SW `controllerchange`; user-triggered reload via "Muat ulang" button
- **PWA icons rebuilt** — White background (`#FFFFFF`), emerald shield fills 78% canvas; all 4 sizes regenerated (`pwa-192x192`, `pwa-512x512`, `pwa-maskable-512`, `apple-touch-icon`)

---

## v1.8.0 — 2026-06-14

### New Features
- **Version badge** — `v1.8.0` chip displayed in Navbar; `src/version.ts` exports `APP_VERSION` constant
- **Admin-managed promo banner** — `PromoBanner` component fetches `promo_banner` from `sp_website_config`, shows emerald gradient banner with slide-down animation, dismissible (persists via localStorage). Visible in customer portal and agent home.
- **Promo Banner admin UI** — New `PromoBannerAdmin` sub-component in `WebsiteEditorAdmin`: set headline/subtitle, toggle visibility, live preview, save via `upsertWebsiteSection`

### Refactors
- **App.tsx modularized** — 1108 → 411 lines. Extracted:
  - `src/routes/splash.tsx` (407 lines) — splash screen, entry screen, mascot, keyframe CSS, i18n copy
  - `src/routes/PortalErrorBoundary.tsx` (31 lines) — portal error boundary class component

---

## v1.7.x — 2026-06-13

### Features
- **Agent home redesign** — premium single-focal commission hero, staggered motion entrance, Lucide icons replacing emoji
- **Admin dashboard data fix** — replaced IndexedDB reads with Supabase (`callGateway`) for ledger, user list, and approvals views
- **Admin approvals page** — working approve/reject flow via `updateOrderStatus()` with reviewer notes
- **Car wizard Step 5 AI survey** — photo upload → AI scoring → result panel for CLEAN/MANUAL_REQUIRED/REVIEW_REQUIRED/REJECTED verdicts
- **Payment gate** — wizard step 6 (payment) locked until AI/admin approval; SUBMITTED policies routed to approval queue
- **Insurer comparison step** — provider cards with authorized garage, claim speed, benefits badges; animated selection
- **Max discount = max commission** — `BASE_COMMISSION_PERCENT` (25%) caps discount slider in StepCoverage
- **PWA fixes** — zoom lock, overscroll-none, install prompt chip, iOS Add-to-Home-Screen hint, localStorage TC caching
- **Ecosystem brand token alignment** — orange primary → emerald across all components

### Docs
- `docs/APP_FLOWCHART.md` — full auth/customer/agent/admin/B2B flow (441 lines) + flow-issue audit
