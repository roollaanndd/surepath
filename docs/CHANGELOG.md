# SurePath — Changelog

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
