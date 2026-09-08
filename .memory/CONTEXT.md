# SurePath Session Context
**Updated:** 2026-09-08 (v2.3.0 — Pathy jadi pintu layanan + kunci zoom aplikasi)

## Current State
- **Skema versi berubah:** deret `1.x` ditutup di v1.57.0, dilanjutkan dari **2.1.0** (keputusan owner).
- **main = v2.3.0.** `APP_VERSION` di `src/version.ts` = sumber kebenaran; `package.json` 1.40.0 lagging.
- ⚠️ **`pathy-agent` PERLU DI-DEPLOY ULANG untuk v2.3.0** (9 tool layanan baru + 2 berkas baru `common.ts`/`serviceTools.ts`). Tanpa itu tool barunya tidak ada di produksi. Web v2.3.0 sudah live, jadi tinggal:
  `supabase functions deploy pathy-agent --project-ref uyjgeteelnswphyzkjwi`

### ❌ Deploy edge function TIDAK BISA dilakukan dari sesi Claude — ini batas keras, bukan soal kehati-hatian
Sudah dicoba dua-duanya pada 2026-09-08; catat supaya tidak diulang:
1. **CLI** (`npx supabase@latest functions deploy …`) — CLI-nya tersedia lewat npx, tapi container tidak punya kredensial:
   `LegacyPlatformAuthRequiredError: Access token not provided.` `supabase login` interaktif, jadi buntu.
2. **MCP `deploy_edge_function`** — menuntut SELURUH berkas fungsi di-inline dalam SATU tool call. `pathy-agent` = 8 berkas / ~116 KB, dan itu **melebihi batas output satu giliran**: panggilannya terpotong sebelum `index.ts` sempat ditulis, server menolak dengan `BadRequestException: Entrypoint path does not exist`. **Produksi tidak tersentuh** (diverifikasi: `pathy-agent` tetap v3 ACTIVE) — gagalnya aman, tapi tetap gagal. Berlaku sama untuk `data-gateway` yang lebih besar lagi.

**Solusi permanen:** set **`SUPABASE_ACCESS_TOKEN`** sebagai environment variable di environment Claude Code Remote. Setelah itu CLI jalan dari sesi mana pun, mengunggah berkas asli dari disk, nol risiko transkripsi — dan `data-gateway` yang tertunda sejak v1.57.0 ikut bisa diberesin.
- ⚠️ **`data-gateway` MASIH belum di-deploy** (`actions/users.ts` 409 ROLE_REQUIRED + `actions/misc.ts` `save_quote` → `quote_data`). Jalankan dari mesin dengan source:
  `supabase functions deploy data-gateway --project-ref uyjgeteelnswphyzkjwi`
  Situs tidak rusak tanpa itu. Alasan tidak dilakukan dari sesi Claude: MCP deploy menuntut 17 berkas (~200 KB) di-inline; menyalin-ulang dispatcher inti (termasuk `orders.ts`/`wallet.ts` yang menyentuh uang) tanpa verifikasi byte-parity sebelum live, risikonya tidak sepadan.

## v2.3.0 — Pathy pintu layanan + kunci zoom (2026-09-08)
### Keputusan: satu wajah, banyak otak
8 mesin AI / 4 nama produk / 5 pintu masuk → **satu nama untuk user (Pathy)**. Mesin tetap terpisah; yang disatukan pintunya. Alat internal (review polis & keuangan admin, InsurerAI) sengaja **tanpa persona** — penggunanya bukan nasabah dan model auth-nya beda.

### 9 tool baru — TIDAK SATU PUN MENULIS
`supabase/functions/pathy-agent/serviceTools.ts`: `check_coverage`, `start_claim`, `claim_status`, `renewal_check`, `explain_my_policy`, `payment_help` (+ agen: `pipeline_nudge`, `commission_forecast`, `draft_followup`).
**Alasan tidak menulis:** `submit_claim` sudah mengonsumsi hasil forensik foto yang di-stage server-side (sekali pakai, dicocokkan user_id, ada kedaluwarsa) supaya pemalsu tidak bisa mengirim `fraud_verdict: CLEAN`. Pembayaran lewat `create-xendit-invoice`. Pintu kedua = duplikasi penjaga atau lubang. Jadi Pathy **menyiapkan**, alur lama yang **commit** (`services/claimHandoff.ts` → formulir klaim).
**Aturan jaminan:** banjir/gempa/huru-hara/terorisme/TJH/PA **bukan** jaminan dasar PSAKBI. `check_coverage` selalu resolusi ke kolom `addons`, tidak pernah dari pengetahuan model.
`supabase/functions/pathy-agent/common.ts` (baru) — `ownerFilter` dsb. hidup di satu tempat.

### Kunci zoom aplikasi
`services/appViewport.ts` — pinch/double-tap/ctrl+scroll zoom + rubber-band mati, **hanya di app mode** (PWA terpasang / Capacitor). Tab browser tetap zoomable (WCAG 1.4.4 + Lighthouse).
⚠️ **Modul ini self-init dan WAJIB jadi import pertama di `index.tsx`.** Import ES di-hoist: `initAppViewport()` di badan index.tsx tidak pernah jalan kalau ada modul di graph `./App` yang melempar saat load (satu env var hilang sudah cukup). Diverifikasi di browser: build tanpa env (app gagal boot) → kuncinya tetap aktif.

### Suara
`services/speech.ts` — dikte Web Speech API `id-ID`, transkrip masuk kotak input (tidak auto-kirim; dikte salah baca nama & plat).

### Belum & alasannya
- Push notification + WhatsApp dua arah: butuh kunci VAPID / konfigurasi provider yang tidak ada di repo.
- Pathy publik tanpa login: permukaan penyalahgunaan biaya model — perlu rate-limit per-IP + review sendiri.
- Bengkel rekanan: tidak ada tabelnya, cuma teks di `aiKnowledge.ts`. Pekerjaan data.

### Uji
`services/__tests__/pathyService.test.ts` (51 kasus), termasuk menjalankan **kesembilan** tool terhadap db palsu yang melempar pada setiap verba tulis.

## v2.2.0 — Tombol "Install App" benar-benar memasang (2026-09-08)
### Akar masalah: event pemasangan sudah lewat sebelum tombolnya ada
`beforeinstallprompt` ditembakkan **sekali** lalu tidak pernah diulang. Ada **tiga** komponen yang masing-masing memasang listener di `useEffect`: `InstallPrompt.tsx`, `Navbar.tsx`, dan `SiteLayout.tsx`. Yang terakhir ada di **chunk lazy** — saat ia mount, event-nya sudah lewat. `pwaPrompt` tetap null → tombolnya jatuh ke `InstallModal` berisi instruksi "menu ⋮ → Add to Home screen", dan **"Add to Home screen" cuma menaruh pintasan bookmark**, bukan memasang aplikasi. Tiga salinan itu juga rebutan: satu event hanya boleh di-`prompt()` sekali.

### Perbaikan
- **Skrip inline di `index.html`** (di atas semua bundle) menangkap event → `window.__spInstall`. **Jangan dipindahkan ke bawah skrip modul.**
- **`services/pwaInstall.ts` (baru)** = satu-satunya sumber kebenaran. `getInstallState()` / `promptInstall()` / `subscribeInstall()` / `usePwaInstall()` + snooze bersama (`isInstallOfferSnoozed`). Melepas event setelah sekali pakai; membatalkan penanda "terpasang" saat browser menawarkan lagi.
- **`components/shared/InstallAppSheet.tsx` (baru)** — satu tampilan untuk semua. Aturan: **setiap tombol memanggil `promptInstall()` dulu**; instruksi hanya kalau hasilnya `'unavailable'`. Di-portal ke `<body>` (navbar `backdrop-blur` = containing block untuk `position:fixed`).
- Panduan per platform: iOS (glif Share inline), webview in-app (tidak bisa memasang → buka browser + salin tautan), Android tanpa prompt (**"Instal aplikasi"**, ditegaskan bukan "Tambahkan ke layar utama"), desktop, dan browser tak didukung (tombolnya disembunyikan).
- iPhone kini dapat tawaran pemasangan di kunjungan pertama — sebelumnya tidak ada apa pun di iOS.
- **Manifest**: `screenshots` dulu menunjuk `logo.png` dan mengaku `3508x2481` padahal aslinya **348x400** → Chrome menolaknya, jadi tidak ada screenshot sah dan Android hanya dapat infobar mungil. Diganti 4 screenshot `narrow` 1080x1920 + 1 `wide`. Ditambah `id: '/'` dan `display_override`.
- **`npm run lint` sekarang 0 error** — `SiteLayout.tsx:324` (pre-existing sejak v1.50.0) diperbaiki.
- `InstallModal` + `isStandaloneMode` di `siteKit.tsx` dihapus (mati).
- Uji: `services/__tests__/pwaInstall.test.ts` (18 kasus). Diverifikasi juga end-to-end dengan Playwright/Chromium terhadap build produksi lokal: event yang ditembakkan **sebelum** bundle jalan tetap tertangkap, tombol memanggil `prompt()` sungguhan, iPhone dapat panduan Share, dan fallback Android menyebut "Instal aplikasi".

## v2.1.0 — KTP + proposal penawaran (2026-09-07)
### Akar masalah KTP: salah kredensial
`services/geminiService.ts` `getClient()` memakai **anon key** sebagai bearer ke `ai-proxy`. `ai-proxy` memverifikasi dengan `auth.getUser()`; anon key = JWT proyek **tanpa klaim `sub`** → **401 di setiap panggilan**. Pemanggil menelan error → `{success:false}` → formulir kosong tanpa pesan.
**Ini mematikan SEMUA fungsi di file itu**, bukan cuma KTP: validasi foto, analisis klaim, survei kendaraan, kuitansi medis, penjelas produk.
- `getClient()` kini **async + access token sesi**.
- **`services/ktpOcr.ts` (baru)** — NIK dibersihkan lalu wajib 16 digit (kalau tidak → `null`, jangan prefill nomor salah). Status OK/PARTIAL/UNCLEAR + catatan Indonesia. `StepKYC` menampilkan catatannya.

### Pathy → proposal penawaran (format = menu beli kendaraan)
- **OCR di klien**, bukan di edge function (browser sudah punya stnk-ocr + ktpOcr + vehicleDatabase 2.500 baris). Hanya kolom hasil yang dikirim; **gambar tidak pernah melewati `pathy-agent`**.
- Tool baru: `read_attachment`, `compare_offers` (3 opsi sekaligus), `build_quotation`.
- `build_quotation` mengembalikan payload berbentuk **`AgentQuoteSource`** → klien `fromAgentQuote()` → `publishAndDownloadQuotation()`. **Pipeline identik dengan `components/car-wizard/StepFinal.tsx`.**
- **Premi dihitung ulang di `build_quotation`**, tidak dibawa dari `compare_offers` — angka di dokumen komersial tidak boleh berasal dari percakapan. Ada tesnya.
- `AgentQuoteSource.clientAddress` baru; `fromAgentQuote` dulu hardcode `insuredAddress: '-'`.
- UI: tombol Foto STNK / Foto KTP, chip lampiran, kartu `document_read` / `offers` / `quotation_ready` (tombol Unduh PDF).
- Uji: `services/__tests__/pathyQuotation.test.ts` (15 kasus).

## v1.57.0 — Tipe akun wajib dipilih (2026-09-07)
### Akar masalah "user baru selalu masuk aplikasi customer"
Layar `RoleSelectionScreen` sudah ada, tapi **kalah cepat**. `AuthGate.buildUserObj` memanggil `ensureProfile()` **tanpa argumen**; server default ke `CUSTOMER`; profil tercipta duluan; `App.tsx` hanya menampilkan pemilih role kalau profil **belum** ada.
Tiga pintu masuknya:
1. **APK Android** — deep link OAuth tanpa `?code=` → penjaga `oauthLoading` tak aktif → `AuthGate` yang menangani sesi. Pengguna Android **selalu** jadi nasabah.
2. **Web lambat** — timeout 10 detik menurunkan `oauthLoading` selagi lookup jalan.
3. **Error sementara** — `resolveAndLogin` fallback login dengan role `CUSTOMER`.

### Perbaikan
- `AuthGate.buildUserObj` **read-only**; buat profil hanya kalau role diketahui dari `user_metadata`; selain itu prop baru **`onNeedsRoleSelection`** → pemilih role.
- `App.tsx`: teruskan prop itu ke kedua render `AuthGate`; `pendingOAuthUser` → **`pendingRoleUser`**; prop `RoleSelectionScreen` `oauthUser` → **`authUser`**; timeout `oauthLoading` tidak menyalip lookup yang berjalan.
- Konfirmasi email: `App.tsx` membaca `user_metadata.role` dan langsung membuat profil — **tidak menanyakan ulang** (kalau ditanya ulang, pilihan Mitra bisa berubah jadi Nasabah).
- `signUp` mengirim `regRole`, bukan hardcode `CUSTOMER`.
- Error sementara → tampilkan pesan, **jangan** login dengan role tebakan.
- **Server:** `ensure_profile` menolak membuat profil tanpa role → **409 `ROLE_REQUIRED`**, tidak menulis baris. Ini backstop supaya bug ini tidak bisa lahir lagi dari klien mana pun.
- Uji: `services/__tests__/signupRole.test.ts` (8 kasus).
- Catatan: mengimpor modul edge function ke vitest menarik file itu ke program tsconfig → `noUnusedLocals` menyala. `actions/users.ts` destructuring-nya dirapikan.

## v1.56.0 — Pathy agent (2026-09-07)
### Akar masalah "Pathy ga jalan" (infrastruktur ternyata sehat)
`ai-proxy` v5 ACTIVE, `OPENROUTER_KEY` ada di Vault, `sp_rate_limits` + `increment_rate_limit` lengkap. Yang rusak jalur klien:
1. `pathyChat()` `catch`-nya jatuh ke gateway action `pathy_chat` → butuh `ANTHROPIC_API_KEY` yang **tidak diset** → selalu 503 "AI not configured".
2. `PathyChat.tsx` memetakan pesan itu jadi *"Fitur AI Pathy akan segera hadir!"* → **semua** kegagalan (sesi habis, rate limit, jaringan) tampil sebagai "coming soon". Ini penyebab kesan "mati permanen".
3. `/api/ai-gateway` hanya ada di dev (`server.ts`); di Vercel selalu 404 → satu round-trip gagal per pesan.
4. WhatsApp quick action memakai placeholder `6280000000000`.
5. Banner "Pathy dapat melihat data kamu" bohong — jalur `askPathy` tidak mengirim data pengguna sama sekali.

### Yang dibangun
- **`supabase/functions/pathy-agent/`** — loop tool-calling (OpenRouter `openai/gpt-4o-mini`, maks 4 ronde), 8 tool: `get_my_policies`, `get_policy_detail`, `get_my_claims`, `get_my_quotes`, `list_products`, `estimate_premium`, `create_quote` (**satu-satunya tool tulis** → `sp_quotes` DRAFT 14 hari), `get_sales_report` (agen).
- **`supabase/functions/_shared/ojk.ts`** — mesin rate OJK versi Deno, baca `sp_ojk_rate_sets` aktif + fallback bawaan. **Kembar dengan `services/ojkRates.ts` — ubah satu, ubah keduanya**; `services/__tests__/pathy.test.ts` menguji paritasnya.
- **UI kartu** di `PathyChat.tsx` — angka dari hasil tool, bukan prosa model.
- **`PathyError`** kode `AUTH`/`RATE_LIMIT`/`NOT_CONFIGURED`/`UNAVAILABLE`; fallback knowledge-base ditandai `degraded`.
- Dokumen: **`docs/PATHY_AGENT.md`**.

### Bug lain yang ketemu di jalan
- **`sp_quotes` tidak punya kolom `details`** — payload-nya `quote_data` (NOT NULL). `SpQuote`/`saveQuote`/`AgentQuoteBuilder`/`save_quote` semuanya salah nama, jadi **Agent Quote Builder tidak pernah bisa menyimpan penawaran**. Sudah diperbaiki.
- `SUREPATH_WHATSAPP` dipusatkan di `constants.ts`.
- `aiKnowledge.ts` produk PA masih "instant approval 60 detik" (luput dari sapuan v1.55.0) → sudah diselaraskan.

### Belum dikerjakan / catatan
- `src/pages/site/SiteLayout.tsx:324` — satu-satunya **error** ESLint di repo (`no-unused-expressions`), pre-existing sejak v1.50.0, membuat `npm run lint` tidak pernah hijau. Non-blocking di CI (ESLint `continue-on-error`). Tidak disentuh karena di luar cakupan.
- Belum ada uji end-to-end langsung ke `pathy-agent` dari sesi ini: egress ke `*.supabase.co` diblokir proxy, jadi verifikasi live harus dilakukan dari browser setelah web deploy.

## What Was Done (recent sessions)

### v1.50.0 — Speed Optimization + PWA Direct-Install (PR #86, 2026-07-17)
Lighthouse mobile (build produksi lokal): **skor 64 → 82**, FCP 3.8→2.4s, LCP 5.1→3.6s, SI 25→6.6s, bytes 3.7MB→2.1MB.
- **hero.mp4 double-download fixed** — `HeroVideo` (siteKit) kini mount sekali, `desktopPosition` via matchMedia; lazy via IntersectionObserver + `preload="none"`, poster = LCP (preload fetchpriority=high di index.html)
- **Background video SiteLayout ditunda** sampai window load + idle
- **Google Fonts async** (media=print onload) — tidak render-blocking lagi
- **SW precache 4.2MB → ~1.5MB** — globIgnores chunk berat + runtimeCaching (CacheFirst assets, SWR images/fonts) di vite.config.ts
- **manualChunks `pdf` + `recharts` DIHAPUS** — manual chunk menyerap shared deps → entry utama import statis ±240KB di semua halaman (pitfall Rollup; hati-hati kalau menambah manual chunk baru)
- **Logo kecil**: `surepath-logo-sm.png` 3KB (nav/badge), `logo-sm.png` 11KB (splash/installer); file asli tetap utk og:image
- **PWA popup**: hanya mobile view (≤768px / pointer coarse), hanya saat `beforeinstallprompt` tersedia → install native 1 ketuk; sheet instruksi "cara pasang" dihapus; iOS tidak ada auto-popup (tidak ada API-nya)

### Keputusan User
- **Hero homepage TETAP** — 3 mockup redesign (Clean Trust / Premium Dark / Video+Quick Quote) sudah diajukan via screenshot, user memilih mempertahankan hero sekarang (2026-07-17)
- CLAUDE.md di-force-add (ada di .gitignore "client handover") — keputusan final menunggu review PR #86

## Demo Accounts (Supabase project `uyjgeteelnswphyzkjwi`)
| Role | Email | Password |
|------|-------|----------|
| Customer | demo.customer@myinsurepath.com | Demo1234! |
| Agent | demo.agent@myinsurepath.com | Demo1234! |
| Admin | demo.admin@myinsurepath.com | Demo1234! |

## Backlog
- [ ] `styles.css` ada komentar berisi `*/` yang bikin warning css-syntax-error saat minify (pre-existing, non-blocking)
- [ ] `vercel.json`: aturan `Cache-Control: immutable` untuk `*.js` ikut kena `/sw.js`. Browser melewati HTTP cache saat memeriksa SW dan Vercel purge tiap deploy, jadi tidak merusak — tapi lebih rapi kalau `sw.js` dikecualikan.
- [ ] Chunk `index.es-*` (~156KB) + `html2canvas.esm` masih ikut build — audit siapa importer-nya
- [ ] Agent portal: AgentCommission "Total Withdrawn" hardcoded 0 (needs wallet data)
- [ ] Re-enable stat counters homepage when real data is ready
