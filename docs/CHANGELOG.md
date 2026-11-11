# SurePath - Changelog

## v2.8.7 - 2026-11-11

### Status satu bahasa lintas app: lib/statusMeta jadi sumber tunggal + badge berbentuk (ikon)

Port sisa kerja branch desain v3 (v2.7.20, tertinggal dari rebuild
v2.7.35–v2.8.6) yang masih relevan di atas main v2.8.6. Audit menunjukkan
konsolidasi status lama hanya menjangkau 3 file (adminUI, AdminViews,
OperatorOrders); lima render site lain masih membawa salinan warna sendiri
untuk status yang sama.

**Badge status kini satu sumber di semua app**

- `AgentOrderStatus` (Mitra), `PolicyOrdersAdmin` (Admin), `InsurerOrders`
  (list + sheet) dan `InsurerDashboard` (status pill) tidak lagi memetakan
  warna/label sendiri — semuanya membaca `lib/statusMeta`. Untuk ISSUED,
  Mitra sebelumnya menampilkan "Polis Terbit" hijau ds-green sementara
  Admin/Operator "Polis Aktif" emerald; kini sama.
- `AdminStatusBadge` merender ikon bentuk dari statusMeta (aria-hidden):
  status tetap terbaca bagi pengguna buta warna dan ketika dua status
  berbagi keluarga warna.

**Perbaikan pada peta itu sendiri**

- Bug v2.8.6: ORDER `SUBMITTED` dan `UNDER_REVIEW` punya badgeClass persis
  sama (amber) — dua status berbeda tak terbedakan. UNDER_REVIEW kini biru,
  selaras dengan peta klaim.
- `ISSUED` dan `PAID` sedikit lebih pekat agar tidak identik dengan
  `APPROVED`; ikon tiap status dibuat unik per peta (Clock/Eye/CheckCircle/
  FileText/XCircle/Ban/AlertCircle/BadgeCheck).
- `CLAIM_STATUS_META` menambah `CLOSED` (ada di union `SpClaim['status']`,
  sebelumnya hanya dipetakan lokal di AgentClaims).
- Test baru `services/__tests__/statusMeta.test.ts`: peta menutup semua
  union dbTypes (gagal kompilasi jika union bertambah), badgeClass valid,
  tidak ada dua status dengan warna/ikon identik, fallback aman.

**Drift versi ditutup total**

- `package.json` tertinggal di "2.7.17" padahal app sudah 2.8.6 — kini ikut
  disinkronkan. `scripts/sync-android-version.mjs` menjaga ketiga sumber
  (src/version.ts, build.gradle, package.json); mode `--check` gagal jika
  salah satu melenceng.

## v2.8.6 - 2026-11-11

### B2B: login korporat premium + portal yang jujur soal kegagalan data

Port dari PR #371 yang ditutup (branch lama berbasis v2.7.55 tertinggal dari
desain ulang v2.8.3–v2.8.5) — dua bagian yang masih relevan dipindahkan ke
branch baru dari main v2.8.5.

**Login B2B premium (split desktop + transisi wipe)**

- Layout split di desktop: panel brand hijau bertema buku besar (motif garis
  ledger, tiga nilai produk: pengajuan satuan & impor armada, penawaran & PDF,
  status transparan) di kiri; kartu kaca tetap di kanan — di mobile layout lama
  dipertahankan.
- Saat login berhasil: panel hijau **menyapu layar dari kiri ke kanan**
  ("Selamat datang kembali" + progress bar) sebelum portal termuat di
  bawahnya — terbaca sebagai login menyerahkan kendali ke portal. Semua
  animasi hormat `prefers-reduced-motion`.
- Logika autentifikasi tidak disentuh: pengecualian MASTER_ADMIN (mode pantau
  v2.8.1), paksa ganti sandi `must_change_password` via email reset, dan
  penolakan role lain tetap persis perilaku main.

**Portal B2B — gagal muat tidak lagi menyamar jadi "kosong"**

- `getB2BSubmissions`, `getAllB2BSubmissions`, `getB2BQuotes`,
  `getAllB2BQuotes` (services/website.ts) dan `getB2BBulkBatches`
  (services/b2bBulk.ts) kini **melempar error** alih-alih menelan jadi `[]`.
  Array kosong terbaca "belum ada data" dan menyembunyikan kegagalan dari
  klien; try/catch yang sudah ada di B2BSubmissions ternyata tidak pernah
  terpicu karena itu.
- **B2BPortal** menangkap kegagalan → **B2BDashboard** menampilkan banner
  amber "Sebagian data dashboard belum dapat dimuat" + tombol **Coba lagi**
  (angka KPI bisa jadi tidak lengkap — jujur soal itu).
- **B2BQuotes** dan **B2BBulkBatches** (keduanya memuat data sendiri) dapat
  try/catch + panel error dengan Coba lagi, menyamai pola yang sudah ada di
  B2BSubmissions. B2BAdminView sudah aman (catch-nya sendiri).

Verifikasi: eslint file terubah 0 error (warning deps pre-existing); vitest
`services/__tests__/` penuh — 51 file lolos, 3 gagal = pre-existing lokal
(theme/pwaInstall/onboardingIllustrations), bukan regresi. Versi `2.8.6`,
Android `versionCode 63`.

## v2.8.5 - 2026-11-07

### Admin: Unified AddUserWizard + KYC Matrix + Animated Charts (PR #1 dari 2)

**Masalah user yang ditangani**: "Untuk penambahan mitra dan penambahan user,
jika di klik tambah tampilannya jelek dan ga bs bikin pass manual. Perbaiki
dan sesuaikan kyc yg dibutuhkan untuk masing2 roles atau mitra.. lalu untuk
b2b jg sesuaikan."

**3 modal lama dengan 3 visual language berbeda** (AddMitraModal, AddInternalUserModal,
UsersSection inline di B2B) → **satu AddUserWizard** 5-step yang mendispatch
ke action backend yang tepat berdasarkan role.

#### Database foundation
- **Migration `20261107120000_kyc_docs_column_and_bucket.sql`**:
  - `ALTER TABLE sp_users ADD COLUMN kyc_docs jsonb DEFAULT '{}'`
  - Bucket privat `kyc-documents` (10MB cap, JPG/PNG/WebP/PDF)
  - RLS policy `service_role only` untuk SELECT/INSERT/UPDATE/DELETE
    (admin baca via signed URL yang gateway buat setelah role check)
- **Gateway actions baru** di `mitraAccounts.ts`:
  - `admin_upload_kyc_file`: base64 upload (max 3MB raw), validasi MIME +
    doc_type whitelist, merge entry ke sp_users.kyc_docs
  - `admin_get_kyc_doc_url`: signed URL 5-menit untuk baca dokumen

#### Primitives (components/admin/wizard/ui.tsx, 440 lines)
- `SmoothModal` — scale + slide enter, backdrop blur fade, esc/body-scroll-lock
- `StepIndicator` — pill progress (click-back ke step done, no skip forward)
- `FileUploadField` — click + drag-drop, preview thumbnail, inline progress,
  size/MIME validation, clear button
- `PasswordField` — animated strength meter (ease-out color-mix), visibility
  toggle, "Generate kuat" button, copy clipboard
- `RoleCard` — big visual picker dengan portal label + perms preview,
  check-pop animation on select
- `WizardButton` — ripple pada press, hover lift+shadow
- CSS keyframes: backdrop-in, panel-in/out, step-forward/back, pulse,
  pop-check, ripple. All respect `prefers-reduced-motion`.

#### KYC Matrix (components/admin/wizard/kycMatrix.ts, 325 lines)
Per-role identitas fields + document requirements:

| Role | Required Fields | Required Docs |
|---|---|---|
| Mitra | nama, email, phone, KTP, alamat, bank+rekening, nama rek, NPWP | KTP, NPWP |
| Admin/Master | nama, email, phone, NIP, department | KTP |
| Finance L1/L2/L3 | nama, email, phone, NIP, dept, approval_limit | KTP |
| Operator | nama, email, phone, NIP, assigned_insurer | KTP |
| Insurance Admin | nama, email, phone, NIP, assigned_insurer | KTP, surat penunjukan insurer |
| B2B Client | pic_name/email/phone/KTP, company_name, NIB, NPWP perusahaan, industri, alamat | NPWP perusahaan, NIB/SIUP, KTP PIC |

ROLE_META mendefinisikan: action backend, caller role yang diizinkan,
icon, accent color, portal path, canSetManualPassword flag.

#### AddUserWizard (580 lines)
5-step unified flow:
1. **Role** — visual card grid, filtered berdasarkan callerRole
2. **Identitas** — fields dinamis dari FIELD_MATRIX[role]
3. **Dokumen KYC** — files dari DOC_MATRIX[role], FileUploadField per-doc
4. **Akses** — invite vs manual password (dengan PasswordField strength meter)
5. **Review** — summary dengan edit-back per section + "Buat"

Submit flow: create user via createMitra/createInternalUser/adminCreateB2BUser
→ get user_id → upload each file via uploadKycFile sequential. Partial
upload failures dilaporkan via onCreated docErrors (user tetap dibuat).

#### Replaced
- `AddMitraModal` di `AgentManagementView` (deleted ~170 lines)
- `AddInternalUserModal` di `UserManagementView` (deleted ~210 lines)
- Inline form di B2B `UsersSection` (deleted ~120 lines)

Semua tiga jalur sekarang memanggil `AddUserWizard` dengan `defaultRole`
berbeda (AGENT / ADMIN|FINANCE / B2B_CLIENT). Operator tetap bisa ganti
role di step 0 jika berubah pikiran.

#### Charts animated theme
`AdminDashboard` Financial Intelligence section:
- Custom `AdmChartTooltip` (card brand-consistent dengan left accent stripe,
  fade-up animation, tabular numerals) menggantikan recharts default
- AreaChart: `animationDuration=900` ease-out, activeDot dengan white ring,
  cursor dashed 3-3 tipis
- PieChart: `animationBegin=120` (slight stagger), center label total
  pesanan + "Pesanan" caption, hover slices via custom tooltip
- `strokeWidth=2.5` consistent brand green #076653

#### Service wrapper
`services/kyc.ts`: `uploadKycFile` (base64 encode + gateway call), 3MB cap
client-side validation, MIME allowlist, file→base64 chunked untuk avoid
stack overflow pada file besar. `getKycDocSignedUrl` untuk preview.

### Deploy steps (manual — tidak otomatis di Vercel merge)
1. Apply DB migration: `supabase db push` atau via Supabase MCP (session ini
   timeout di approval prompt, jadi user perlu run manual atau approve via
   Supabase dashboard)
2. Deploy edge function: `supabase functions deploy data-gateway --project-ref uyjgeteelnswphyzkjwi`

### Verifikasi
- tsc 0 error
- eslint 2 warning (pola existing)
- vitest 639/639 pass (termasuk `adminDesignFloor` 11px + light-surface guards)
- vite build sukses

### Follow-up PR #2 (dashboards marketing/sales/business enhance)
Scope terpisah sesuai pilihan "Full dalam 2 PR terpisah". PR #2 akan handle:
- MarketingDashboard: funnel viz, handler leaderboard sparkline, B2B pipeline Kanban
- SalesDashboard (new): combined view agents + B2B, top performers, revenue breakdown
- BusinessSupportDashboard: SLA metrics, ticket queue priority sort

## v2.8.4 — 2026-11-07

### Admin Dashboard: evolution pass (polish + context + intelligence)

Admin dashboard di-upgrade **di tempat** — bukan redesign ulang. Struktur
existing (hero editorial, 2 attention cards, 4 KPI, financial charts,
pesanan terbaru, mitra terbaik, aktivitas feed, calendar jatuh tempo,
tugas saya) semua dipertahankan. Yang berubah: polish, context, dan
beberapa fitur baru untuk operator sehari-hari.

**Primitives baru** (`components/admin/dashboard/ui.tsx`):
- `AdminCountUp` — smooth 0→value tween (ease-out-quart 800ms), reduced-
  motion honored.
- `AdminSkeleton` + variants (Hero/KpiRow/Table) — shimmer indigo-tinted
  yang mirror shape yang diganti.
- `AdminPill` + `AdminAgePill` — tone semantic, age-smart (fresh < 2h
  neutral, 2-6h accent, 6-24h warn, >24h danger).
- `AdminLiveDot` — pulsing status dot (emerald segar, amber stale > 30s).
- `AdminRangeToggle` — pill-group yang mengganti `<select>` hero.
- `AdminToastProvider` + `useAdminToast()` — top-right stack, aria-live.
- `AdminCommandPalette` — standalone (tidak dipakai di shell karena
  existing palette sudah ada; disediakan untuk konsumsi future).
- `AdminFocusBar` — sticky single-row urgent alert, dismissible per
  session.
- `AdminSidePanel` — right-slide drawer dengan Esc + backdrop close.
- `AdminSparkline` — pure SVG, 7-hari inline untuk KPI cards.

**Hero section** (`AdminDashboard.tsx`):
- Greeting kontekstual shift-aware: pagi menyebut antrean semalam, siang
  menyebut ajuan + penarikan besar, sore ringkas rangkum hari.
- `AdminCountUp` pada angka premi (0 → Rp X dalam 800ms).
- `AdminLiveDot` pulsing di sebelah "diperbarui" (amber jika > 30 detik).
- `AdminRangeToggle` 30h/90h/1th pill group ganti `<select>` native.
- Skeleton hero + 2 KPI row saat initial boot load (bukan blank).

**Focus bar sticky**: muncul di atas hero kalau ada > 0 approval menumpuk
> 24 jam. Dismissible per-session. Tombol "Buka antrean" langsung ke
`approvals` view.

**KPI cards sekunder**: inline sparkline 7-hari untuk metric yang punya
per-day data (orders, claims, withdrawals). Mitra Aktif tetap tanpa
sparkline (tidak meaningful day-over-day).

**Pesanan Terbaru table**:
- Row hover accent gradient stripe (indigo→lime, 3px, 220ms ease).
- Overdue badge auto (`AdminAgePill` warn/danger) di row dengan status
  SUBMITTED/UNDER_REVIEW yang menunggu > 24 jam.

**Tugas Saya queue**:
- Smart sort: `age × 0.6 + amount × 0.4` — Rp 10jt yang 2 jam lagi
  berada di atas Rp 500K yang 5 jam.
- `AdminAgePill` tone-mapped per hours waited.
- Inline chevron button (bukan hanya baris yang clickable).

**Calendar jatuh tempo**: tiap hari dengan polis jatuh tempo kini
clickable. Side panel kanan menampilkan daftar polis berakhir hari itu
(nama nasabah, nomor polis, premi, status).

**Shell integration**: `AdminPortal` sekarang dibungkus `AdminToastProvider`
sehingga view mana pun bisa panggil `useAdminToast()` untuk feedback
sukses/error/info tanpa alert/inline bar.

**A11y**:
- `prefers-reduced-motion` honored semua animation (countup, skeleton,
  stagger, ripple).
- Skeleton `role="status"`, toast `aria-live="polite"`, palette/panel
  `role="dialog"`.
- Range toggle `role="radiogroup"` dengan `role="radio"` + `aria-checked`.
- Focus bar `role="alert"`.

**Data flow tidak berubah**: `buildDashboardModel()` + semua props sama.
Primitives tambahan tidak melakukan fetch baru; sparkline derive dari
array orders/claims/withdrawals yang sudah di-fetch oleh AdminPortal
(zero new gateway calls).

Verifikasi: tsc 0 error, eslint 2 warning (pola existing dependencies),
vitest 639/639 pass (termasuk `adminDesignFloor` yang guard typography
floor 11px), vite build sukses, screenshot dashboard + palette confirmed.

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

### Polish pass — animated micro-interactions + nice-to-haves

- **Skeleton loading** (`B2BSkeleton`, `B2BTableSkeleton`, `B2BKpiSkeleton`):
  shimmering indigo-tinted placeholders yang match shape elemen nyata,
  bukan grey slug generik. Dipakai saat initial dashboard fetch dan di
  semua table list screens.
- **CountUp animation**: KPI numerals animate 0→value dengan ease-out-quart
  700ms saat pertama kali render. Respect prefers-reduced-motion.
- **Toast system** (`B2BToastProvider` + `useB2BToast()` hook): top-right
  stack, max 3 pesan, auto-dismiss 3.5s, slide-in dari atas dengan fade.
  Wired ke save profile, accept/reject quote, create invoice.
- **Ripple effect**: tombol primary/danger/success tunjukin pointer-origin
  ripple on press; subtle lift (`-translate-y-0.5`) + shadow on hover.
- **Row hover accent**: stripe gradient indigo→emerald glide dari kiri
  pada table row hover (3px). Lift tanpa biaya layout shift.
- **Stagger animation**: KPI cards dan table rows muncul dengan stagger
  40-240ms (`b2b-stagger` class + nth-child delays).
- **Command palette ⌘K / Ctrl+K**: hidden power feature untuk quick-jump
  ke nav section. Search, arrow-key nav, Enter pilih, Esc close. Hint
  tombol visible di topbar (`⌘K` kbd) untuk discoverability.
- **Enhanced side panel**: TLS slide-in dari kanan (`b2b-slide-in-right`
  keyframe), background blur-2px backdrop, Esc close.
- **Sleek font tuning**: `font-feature-settings: "ss01","cv11","cv09","liga"`
  di `.sp-b2b-root` scope + tabular-nums + lnum untuk `.b2b-numerals`
  class. Antialiased, legibility rendering.
- **Scoped thin scrollbars** (`.b2b-scroll`) Firefox + WebKit, tipis
  dengan tint indigo-18%.
- **A11y**: `prefers-reduced-motion` honored untuk semua animation.
  Skeleton punya `role="status"` + `aria-busy="true"`. Toast punya
  `aria-live="polite"`. Command palette `role="dialog"`.

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