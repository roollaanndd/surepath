# SurePath — Changelog

## v2.8.3 — 2026-11-06

### B2B Portal: full dashboard refresh (glassmorphism, Mercury tables)

Portal B2B (`/b2bapps`) diubah total dari shell mobile-first consumer app
ke dashboard enterprise desktop-first. User korporat (multifinance, admin
perusahaan) buka portal dari laptop — layout lama dengan `max-w-lg`
column di tengah + bottom tab bar HP terasa "apps" bukan "dashboard".

**Shell baru** (`components/b2b/dashboard/ui.tsx` — satu file design system):
- Sidebar kiri 240px dengan glass transparan indigo (`rgba(255,255,255,0.78)` +
  backdrop-blur 24px), drawer dari kiri di <lg. Grouped nav dengan sub-items
  (Pengajuan→Satuan/Massal, Buat→Pengajuan Baru/Impor Massal), active state
  gradient indigo, badge count real-time untuk Pengajuan+Penawaran.
- Topbar 64px dengan breadcrumb path (Portal B2B › Section › Subsection),
  Pathy CTA (tombol emerald gradient ganti FAB floating 56px lama),
  bell/theme/mobile menu button.
- Ambient background: dot grid indigo + dua drifting radial blobs
  (emerald + indigo) — lanjutan dari B2BLogin yang baru.
- Primitives shared: `B2BGlass`, `B2BKpi`, `B2BPill`, `B2BTable`,
  `B2BSidePanel`, `B2BSectionHeader`, `B2BSearchInput`, `B2BButton`.

**Dashboard home** (`B2BDashboard.tsx`, replace `B2BHome.tsx`):
- Hero line dengan company name (gradient indigo→emerald text), role
  indicator, quick-action buttons (Pengajuan Baru / Impor Massal).
- KPI strip 4 kartu flat glass: Menunggu Review, Penawaran Aktif, Polis
  Terbit, Unit Armada — mono JetBrains numerals, icon ring indigo, tone
  semantic (warn/accent/success/default).
- 2-column grid: Pengajuan Terbaru table (2/3) + Open Quotes callout
  panel + Pathy quick-launch panel (1/3).
- Bulk batches full-width table row saat ada batch.

**List screens** (`B2BSubmissions`, `B2BQuotes`, `B2BBulkBatches`):
- Mercury-style data tables (hairline divider, hover indigo-50 highlight,
  click row → side panel detail).
- Status pill tone-mapped (warn/info/accent/success/danger).
- Search input + filter chips scoped per-panel.
- Detail panel kanan (`B2BSidePanel`) dengan Esc + backdrop close, 480px
  width di desktop, full-width di mobile.
- B2BBulkBatches detail view: totals grid 4-kolom (Gross/Diskon/Admin/Total),
  action buttons inline di header, items table full-width.

**Create flows** (`B2BNewSubmission`, `B2BBulkImport`):
- Container diperlebar dari `max-w-lg` ke `max-w-4xl`/`max-w-5xl` + glass
  card wrapper. Internal step logic + form validation unchanged.

**Profile** (`B2BProfile`):
- 2-column layout: form 2/3 kiri, identity card 1/3 kanan.
- Avatar emerald gradient, pill "B2B Client", contact rows (mail/phone/industry).
- Master-admin monitor view: single identity card + scope explanation.

**Pathy launcher** pindah dari FAB bottom-right ke tombol di topbar +
quick-launch panel di dashboard home — hemat viewport, konsisten dengan
pola dashboard enterprise.

Data fetching, gateway calls, auth, Supabase service, dan PWA tidak
berubah — hanya chrome + layout. `B2BLogin` (glassmorphism indigo yang
baru dirilis v2.8.2) tetap. B2BHome.tsx dihapus.

Verifikasi: tsc 0 error, eslint 5 warning (pola existing), vitest 639/639
pass, vite build sukses, screenshot desktop (dashboard/submissions/quotes/
profile) + mobile drawer confirmed.

## v2.8.2 — 2026-11-06

### Insurer Portal: redesign Dashboard + Login (hybrid "Brand hero + Mercury data")

Dua layar paling impactful dari Insurer Portal di-redesign dengan arahan
yang dipilih owner setelah review dua opsi di figcraft: **hero branded
emerald (Option B) + KPI/list enterprise Mercury-style (Option A)**.

- **Shared `InsurerHero`** component baru (`components/insurer/InsurerHero.tsx`):
  gradient emerald-900→700 dengan concentric rings dekoratif, pulsing
  status dot, ExtraBold insurer name, chip row (`InsurerHeroChip` helper).
  Reusable di tab lain yang butuh "command center" feel.
- **Dashboard** (`InsurerDashboard.tsx`): hero branded di atas, KPI 2x2
  flat white dengan mono JetBrains numerals + status dot semantik, Total
  Premi sebagai dark-navy block (#0F172A) dengan mono white, recent orders
  sebagai divider-separated rows (bukan card individual lagi) dengan mono
  order# dan semantic pill — data-forward, cepat scan.
- **Login** (`InsurerLogin.tsx`): split-screen di desktop (branded panel
  kiri dengan feature bullets + white card login kanan), compact branded
  header di mobile. Gradient emerald button, mono input, enter-to-submit,
  Kembali + Insurer Session chips konsisten. Mengganti palette ungu-oranye
  yang lama ke emerald-only agar sejalan dengan brand SurePath.

Data fetching, handlers, dan auth flow TIDAK berubah — hanya presentasi.
Verifikasi: tsc 0 error, eslint bersih, vite build sukses, screenshot
mobile+desktop confirmed.

**Follow-up v2.7.60** (akan menyusul di PR terpisah): Orders, Claims,
Payments, Profile, BulkBatches, Notifications — menerapkan pola Mercury
list yang sama agar seluruh portal konsisten dengan arahan baru.

## v2.7.58 — 2026-11-05

### Tambah user password manual + Kredit manual komisi/koin (four-eyes) + UX modal

Tiga direktif owner digabung dalam satu rilis — semua di Admin CMS:

**A. Admin Dashboard: tambah pengguna internal dengan kata sandi manual.**
Sebelum ini modal "Tambah Admin Baru" hanya punya mode email-undangan;
pola mode `password` yang sudah ada untuk Mitra & B2B tidak tersedia untuk
ADMIN/FINANCE/OPERATOR/INSURANCE_ADMIN. Ditambahkan aksi gateway baru
`admin_create_internal_user` (dua mode `invite` + `password`, mode password
MASTER_ADMIN only) dan modal `AddInternalUserModal` yang mencerminkan pola
AddMitraModal: role picker dengan matriks eskalasi (MASTER_ADMIN/ADMIN
hanya bisa dibuat MASTER_ADMIN), input sandi dengan kebijakan min 10 + 3
dari 4 kelas karakter, serta `CredentialModal` sekali-tampil (sandi tidak
disimpan di mana pun). Label tombol pemicu di menu Kelola Akun berubah dari
"Tambah Admin" menjadi "Tambah Pengguna".

**B. Finance: Kredit manual komisi & koin (four-eyes approval).** Untuk
polis yang ditutup mitra di luar aplikasi (telepon, kunjungan, mitra
institusi). Alurnya:
- DB: tabel baru `sp_manual_commission_requests` dengan deny-all RLS,
  CHECK constraint four-eyes (`decided_by <> requested_by`) dan status
  terbatas `PENDING → APPROVED → APPLIED` atau `PENDING → REJECTED`.
- Gateway: 3 aksi baru di `manualCommission.ts`
  - `finance_request_manual_commission` (FINANCE_ROLES — tidak termasuk
    OPERATOR, konsisten dengan gerbang wallet)
  - `admin_list_manual_commission_requests` (FINANCE_ROLES + MASTER_ADMIN)
  - `master_decide_manual_commission` (MASTER_ADMIN only; approve memanggil
    `credit_agent_wallet` RPC + `sp_coin_ledger` + `increment_coins_balance`,
    lalu pindah ke APPLIED dan menyimpan `applied_wallet_tx_id` sebagai
    audit link; reject wajib alasan min 5 karakter)
- UI: dua view baru di grup Keuangan → Komisi
  - **Kredit Manual** (`manual_credit`, Finance/Admin/MASTER_ADMIN): form
    pengajuan dengan agent picker (search), nominal IDR + koin, nomor
    polis referensi, alasan wajib (min 10 karakter), plus tabel
    permintaan milik caller dengan status real-time.
  - **Approval Kredit Manual** (`credit_approvals`, MASTER_ADMIN only):
    antrean PENDING + tab riwayat. Tombol Setujui/Tolak dimatikan untuk
    permintaan yang diajukan caller sendiri (four-eyes UX).
- Notifikasi: MASTER_ADMIN menerima lonceng CMS + Telegram tiap request
  baru; requester & mitra diberi tahu saat disetujui/ditolak.
- 18 test baru (`services/__tests__/manualCommission.test.ts`): gerbang
  peran, validasi, four-eyes anti-self-approve, dan jalur approve
  memanggil RPC yang benar.

**C. UX modal — fix "lembaran hitam".** Owner menyebut modal yang terbuka
dari CMS punya backdrop terlalu gelap dan ukuran tidak user-friendly.
Dibuat wrapper terpadu `components/admin/shared/AdminModal.tsx`:
- Backdrop standar `bg-slate-900/40 dark:bg-slate-950/55 backdrop-blur-[3px]`
  (lebih lembut dari `bg-black/80` lama), dengan tone `prominent` untuk
  modal yang memang perlu menarik perhatian (CredentialModal).
- Ukuran konsisten `sm|md|lg|xl|2xl`, `max-h-[92dvh]`, scroll contained
  (tidak "menjepit" header/footer saat konten panjang).
- Sticky footer, Escape close, klik backdrop close, `aria-modal`.
- Diterapkan ke: `CredentialModal`, `AddInternalUserModal` baru,
  `ManualCommissionRequest/ApprovalView`, `DecisionDialog`. Juga memperbaiki
  backdrop `bg-black/80` di `BulkImportModal` dan `ProductConfigAdmin`.
- Nav: dua leaf baru (`manual_credit`, `credit_approvals`) wiring ke
  AdminPortal + ADMIN_MENU_ITEMS; pinned count naik 31 → 33.

Verifikasi: `tsc --noEmit` 0 error, eslint bersih, vitest **639 lulus**
(sebelumnya 620 + 19 tes baru), vite build sukses. Migration
`20261106150000_manual_commission_requests` sudah diterapkan ke production.

## v2.7.55 — 2026-11-05

### Portal Mitra: ikon Beranda, STNK setara Nasabah, rentang harga, diskon di step 4, handoff pembelian & approval manual

Enam direktif pemilik untuk alur kerja mitra — semuanya frontend, tanpa
perubahan skema atau edge function.

- **Ikon Beranda "Klien" & "Profil" tidak lagi kembar.** Kedua tile dulu jatuh
  ke ilustrasi generik "people" yang sama. Kini masing-masing punya gambar
  Brand sendiri di `SurePathBrandIcon`: `SpClientsIcon` (dua orang terhubung
  benang lime + badge hati oranye) dan `SpProfileIcon` (kartu ID miring +
  lencana verifikasi oranye) — tetap satu sistem ikon, tanpa gaya per-ikon.
- **Pintu masuk STNK Mitra memakai UI & layanan yang sama dengan Nasabah.**
  `STNKAutoExtract` (pipeline stub: hanya mengirim 100 karakter pertama
  dataURL lalu mengarang nilai pasar) dihapus bersama stub
  `extractSTNKAndRecommend` di aiGateway. Diganti `StnkCaptureCard` +
  `StnkOcrNotice` dari `StnkScanCard` dan layanan `extractStnkOcr` yang asli;
  hasilnya mengisi form kendaraan otomatis.
- **Rentang harga rekomendasi muncul** di step data kendaraan — ±5% dari
  `getMarketValueForYear`/`getMarketValueForMotoYear`, rumus yang sama dengan
  yang dilihat nasabah, untuk mobil maupun motor.
- **Diskon muncul dan dihitung di step 4.** Input pindah dari atas step 2 ke
  kartu ringkasan (`quote_summary` kendaraan dan `summary` produk lain),
  lengkap dengan rincian premi dasar → diskon −Rp → premi akhir. Catatan batas
  15% dipertahankan; `quote_data` tetap mengirim `discount_rate`,
  `discount_amount`, `base_premium`.
- **Handoff ke Pembelian tidak menanyakan ulang data.** "Lanjut ke Pembelian"
  kini membawa hasil pindai STNK (plat, rangka, mesin, warna) selain data
  kendaraan & nasabah yang sudah dibawa `initialQuote`. Kartu pindai STNK di
  wizard underwriting menyingkir jadi chip "Data kendaraan sudah terisi dari
  Penawaran" dengan opsi pindai ulang — mitra hanya melengkapi yang belum ada.
- **Foto yang gagal dianalisa AI bukan lagi jalan buntu.** Sebelumnya step foto
  menuntut hasil AI (`aiResult !== null`) sehingga mitra terblokir saat analisa
  gagal atau foto kurang dari 3. Kini order tetap bisa diajukan: panel amber
  "Perlu Persetujuan Manual Admin", order ditandai
  `ai_manual_review: PHOTO_ANALYSIS_UNAVAILABLE` di `vehicle_details`, masuk
  antrean `SUBMITTED` yang sudah ditangani `PolicyOrdersAdmin`, tombol bayar
  tetap tertutup sampai disetujui, dan notifikasi menjelaskan alasannya.

Guard: `services/__tests__/agentHomeStnkDisc.test.ts` (12 asersi, ditulis
merah lebih dulu).

## v2.7.54 — 2026-11-05

### Link Portal B2B di menu website

- **`/b2bapps` punya login screen sejak v2.7.53 tapi tidak ada link ke
  sana di mana pun di situs** — sama seperti `/agapps`/`/insurerapp`/
  `/operatorapp`, hanya bisa diakses kalau tahu URL-nya langsung. Untuk
  B2B ini masalah nyata: calon pengguna (mitra multifinance) tidak akan
  pernah menemukan portalnya sendiri. Ditambahkan link "Portal B2B" di
  tiga titik di `SiteLayout.tsx` (situs marketing publik), menyamai pola
  link "Admin" yang sudah ada: tombol navbar desktop, tombol menu mobile,
  dan entri kolom footer "Perusahaan" ("Portal Mitra B2B") + ikon di
  bilah bawah footer. Semua mengarah ke `/b2bapps`.

## v2.7.53 — 2026-11-05

### Login khusus portal B2B + dashboard menampilkan batch fleet

- **Portal B2B sebelumnya tidak punya layar login sendiri.** Mengunjungi
  `/b2bapps` dalam keadaan logout jatuh ke beranda marketing umum — tidak
  ada form login sama sekali (`/custapp`/`/agapps` sudah punya ini,
  `/b2bapps` tidak pernah ditambahkan). Dibuat `B2BLogin.tsx`: layar
  glassmorphism khusus, animasi masuk satu kali (blur → fokus + naik,
  staggered), identitas warna indigo yang sengaja berbeda dari oranye
  Insurer — B2B di sini berarti institusi/multifinance, bukan ritel. Email +
  kata sandi saja (akun B2B disediakan admin, tidak ada pendaftaran
  mandiri), plus alur lupa kata sandi.
- **FIX**: `rolePath()` (App.tsx) tidak pernah punya cabang untuk
  `B2B_CLIENT` — selalu jatuh ke `/custapp`. Tidak pernah benar-benar rusak
  (penjaga `B2BRoutes` di `src/app/routes/b2b.tsx` mengklaim path apa pun
  untuk B2B_CLIENT yang sudah login), tapi bilah URL menampilkan portal yang
  salah. Diperbaiki di sumbernya.
- **Dashboard B2B (`B2BHome.tsx`) sekarang menampilkan batch fleet massal** —
  sebelumnya statistik dan aktivitas terbaru hanya menghitung pengajuan
  satuan (`sp_b2b_submissions`), sehingga mitra yang memakai impor massal
  (fitur andalan sesi sebelumnya) melihat dashboard kosong selamanya.
  Ditambahkan: tombol kedua "Impor Massal Fleet", ringkasan batch menunggu
  bayar + total unit, dan daftar batch terbaru.

## v2.7.52 — 2026-11-05

### Kontrol admin untuk fleet B2B, Syarat & Ketentuan, dan koneksi dashboard insurer

Lanjutan v2.7.51 — menutup gap yang ditemukan saat menyambungkan fitur bulk
import B2B ke dashboard admin dan insurer.

- **Rate fleet B2B kini bisa diedit admin** (`sp_b2b_fleet_rate_sets`, menu
  CMS baru "Rate Fleet B2B") — pickup/truk, alat berat, dua tarif diskon,
  tiga biaya admin, dan premi minimum, yang sebelumnya konstanta hardcoded di
  `services/b2bFleetRating.ts`. Pola versi-aktif yang sama dengan
  `sp_ojk_rate_sets`/`OjkRateAdmin.tsx`. Rate TLO mobil penumpang & motor
  **tidak** diduplikasi ke tabel baru ini — keduanya sudah reaktif terhadap
  rate set OJK aktif (`CAR_TLO_MIN`/`MOTO_TLO_MIN` adalah binding `let` yang
  ditimpa `applyOjkRateSet()`), jadi menu Rate OJK yang sudah ada tetap satu
  sumber kebenarannya.
- **Syarat & Ketentuan kini punya editor bervensi** (`sp_tnc_documents`, menu
  CMS baru "Syarat & Ketentuan"). Sebelumnya `accept_agreement` memakai
  `doc_version` hardcoded `'v1.0-2026'` — tidak ada tempat mengedit isinya
  sama sekali. Sekarang admin menulis draft, dan "Terbitkan" (aksi terpisah
  dari simpan) mengaktifkan versi itu untuk mitra baru.
- **Admin bisa menugaskan insurer ke batch bulk** (`admin_b2b_bulk_assign_insurer`)
  sebelum batch lunas — sebelumnya `insurer_id` hanya terisi di langkah
  terakhir (`admin_b2b_bulk_issue`), jadi dashboard insurer tidak punya apa
  pun untuk dikueri.
- **Dashboard insurer kini menampilkan batch B2B** — tab "Polis" punya saklar
  Individual/Batch B2B (bukan tab ke-6; `PortalTabBar` sudah penuh di 5).
  Insurer melihat batch PAID yang ditugaskan ke mereka dan mengunggah polis
  induk sendiri (`insurer_upload_bulk_master_policy`), sama seperti
  `insurer_upload_policy` pada order retail.
- **FIX keamanan**: `b2b-documents` adalah bucket **privat**, tapi
  `admin_b2b_bulk_issue`/`uploadB2BBulkMasterPolicy` (dibangun di v2.7.51)
  menyimpan hasil `getPublicUrl()` — yang 404 di bucket privat. Diperbaiki:
  kolom `master_policy_document_url` sekarang menyimpan storage PATH, setiap
  pembaca (admin/insurer/klien) me-resolve-nya ke signed URL lewat gateway.
  Upload sisi insurer (tanpa sesi Supabase — hanya token) memakai signed
  upload URL dari service_role (`insurer_bulk_request_upload_url`), bukan
  upload klien langsung yang tidak mungkin lolos RLS folder-pemilik
  `b2b-documents` tanpa `auth.uid()`.
- **FIX CI**: `xlsx` (dipasang di v2.7.51) punya advisory HIGH severity
  (prototype pollution + ReDoS) tanpa fix di registry npm — SheetJS berhenti
  mempublikasikan versi terbaru ke npm, perbaikannya hanya ada di tarball CDN
  mereka sendiri. `package.json` sekarang memakai
  `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` — API identik, 0
  advisory. Juga: `create-b2b-bulk-invoice` belum dideklarasikan di
  `supabase/config.toml` (lolos dari `check-edge-functions.mjs`).

## v2.7.51 — 2026-11-04

### B2B Bulk Fleet TLO Import — upload → premi → invoice → polis massal

Pilot: Mutiara Finance (PT MMF). Sebelumnya `/b2bapps` hanya punya satu jalur
pengajuan manual per perusahaan dan "Terima Penawaran" adalah jalan buntu —
tidak ada invoice, pembayaran, atau penerbitan polis sama sekali. Multifinance
mengirim spreadsheet berisi ratusan kendaraan yang dibiayai (satu baris per
nasabah) yang semuanya perlu TLO sekaligus; fitur ini membangun jalur itu dari
upload file sampai polis induk + lampiran kendaraan.

- **Mesin rating baru** (`services/b2bFleetRating.ts`, mirror Deno di
  `supabase/functions/_shared/b2bFleetRating.ts`, paritas diuji) —
  mereproduksi metodologi audit manual mitra pilot: zona dari prefix plat
  (fallback nama wilayah), klasifikasi motor/mobil/alat berat, deteksi
  pickup/mobil-barang dari nama model (menangkap kasus nyata "Suzuki GC 415 T"
  yang di audit manual awalnya salah dirate sebagai mobil penumpang), rate TLO
  OJK batas bawah (motor & mobil penumpang memakai tabel yang sama dengan
  `services/ojkRates.ts`; pickup/truk & alat berat adalah rate block-business
  terpisah), premi gross minimum Rp50.000, diskon 25%/15%, biaya admin
  25rb/45rb/65rb, pro-rata tenor. Diuji end-to-end terhadap 253 baris file
  referensi mitra — hasil rekonsiliasi dalam toleransi 2% dari TOTAL TAGIHAN
  resminya (lihat catatan pembulatan di `b2bFleetRating.ts`).
- **Parser file** (`services/b2bBulkParser.ts`) — baca .xlsx/.xls/.csv,
  pemetaan kolom otomatis (fuzzy) ke 18 field kanonik, bisa dipetakan ulang
  manual. Memakai `xlsx` (SheetJS), bukan `exceljs` — ExcelJS gagal membaca
  file referensi mitra sendiri (komentar sel VML legacy memicu bug reconcile
  di ExcelJS); parsing hanya berjalan di browser klien sendiri atas file yang
  mereka pilih sendiri, tidak pernah server-side.
- **Tabel baru** `sp_b2b_batches` + `sp_b2b_batch_items` (deny-all RLS,
  gateway/service-role saja — pola yang sama dengan `sp_policy_orders`, bukan
  pola RLS-terbatas-klien milik `sp_b2b_submissions`, karena ini membawa PII +
  uang dalam skala besar). Kolom baru `sp_payments.batch_id` (nullable,
  aditif) supaya satu invoice bisa melunasi satu batch, bukan satu order.
- **Aksi gateway baru** (`actions/b2bBulk.ts`): `b2b_bulk_create_batch`
  menghitung ulang setiap premi server-side dari input kategorikal yang
  dikirim klien (zona/jenis kendaraan/pickup — hal yang bisa dikoreksi
  manusia di grid review) — angka uang tidak pernah dipercaya dari klien.
  Plus `b2b_bulk_list_batches`, `b2b_bulk_get_batch`, `admin_b2b_bulk_issue`.
  `b2b_bulk_create_batch` masuk `ACTION_MIN_TIER` (perlu akun terverifikasi),
  sejajar dengan `create_policy_order`.
- **Edge function baru** `create-b2b-bulk-invoice` (pola sama dengan
  `create-xendit-invoice`, untuk batch bukan order) + `xendit-webhook`
  diperluas: pembayaran batch PAID memindahkan status batch & item
  (PENDING→READY), amount-mismatch diperlakukan sama hati-hatinya dengan jalur
  order yang sudah ada.
- **UI klien B2B**: tab "Buat" dan "Ajuan" masing-masing punya saklar
  satuan/massal. Impor massal = upload → pemetaan kolom → grid review
  (premi terhitung ulang live, baris bermasalah ditandai, zona/jenis
  kendaraan bisa dikoreksi manual) → submit batch → buat invoice Xendit →
  bayar. Setelah polis induk terbit: unduh dokumen polis asli dari
  penanggung + lampiran daftar kendaraan (PDF jadwal per-nasabah,
  `generateB2BBulkSchedulePDF`).
- **UI admin**: sub-tab baru "Bulk Batches" di `B2BAdminView` — admin
  mengunggah dokumen polis induk asli (bukan dibuat otomatis — polis
  sungguhan selalu berasal dari penanggung, pola yang sama dengan
  `insurer_upload_policy` pada order retail) + nomor polis, menandai batch
  ISSUED.
- **Belum dikerjakan** (lihat backlog): tahap persetujuan/underwriting
  operator sebelum invoice (saat ini klien bisa langsung membuat invoice
  begitu batch SUBMITTED — cocok untuk kerja sama rate-tetap yang sudah
  disepakati, tapi tidak ada gate manusia sebelum uang ditagihkan); sertifikat
  per-nasabah individual (saat ini hanya satu lampiran gabungan); notifikasi
  WhatsApp untuk event batch (order retail punya ini, batch belum).

## v2.7.50 — 2026-11-04

Hapus field `band` dari `TierPalette` — field itu tidak pernah dibaca kode
produksi setelah Beranda Mitra dibangun ulang sebagai super app (v2.7.39). Tes
yang menjaganya (`agentHomeHero.test.tsx`) ikut dicopot.