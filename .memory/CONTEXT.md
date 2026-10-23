# SurePath Session Context
**Updated:** 2026-10-23 (v2.6.9 — revamp jadi 4 portal + scroll reset lintas portal)

## Status revamp UI/UX (23 Okt 2026)

Dokumen eksekusi **ganti nama**: `docs/AGENT_APP_REVAMP_EXECUTION.md` →
`docs/APP_REVAMP_EXECUTION.md`. Scope diperluas dari Customer+Agent menjadi
**4 portal: Nasabah, Mitra, Operator, Admin CMS** (permintaan pemilik). Insurer
dan B2B **bukan** target redesign tapi ikut memakai primitif bersama — setiap
perubahan shared harus diverifikasi ke enam portal.

**Jangan percaya klaim "revamp selesai".** Dari seluruh checklist, yang benar-benar
DONE hanya **S3a** (scroll reset). PR #248/#249/#250/#251 semuanya **poles kosmetik**,
bukan redesign — ledger di §5 dokumen itu mencatatnya apa adanya. S1, S2, S3b, S4 dan
semua item C/A/O/D masih terbuka. Operator & Admin baru punya audit + checklist, nol
implementasi.

### Temuan audit yang jangan ditelusuri ulang
- **Hanya CustomerPortal yang me-reset scroll** saat navigasi internal; lima portal
  lain tidak. Sudah diperbaiki v2.6.9 via `components/shared/scrollReset.ts`.
- Scroll admin itu **dua bug berbeda**, jangan dicampur: (a) sidebar ter-reset saat
  polling karena ref callback inline dibuat ulang tiap render → PR #243 `useCallback`;
  (b) area konten tidak pernah kembali ke atas saat ganti menu → v2.6.9. Keduanya
  BUKAN efek styling Agent. Konfirmasi browser atas laporan asli pemilik masih kurang.
- Operator **sepenuhnya card-based (0 `<table>`)** → aman di layar sempit; error
  handling ada di 7 dari 9 berkas. Yang kurang: hierarki queue, bukan responsif.
- Admin: 19 `<table>` vs 21 `overflow-x-auto` → tabel umumnya sudah dibungkus.
- `AnalyticsDashboard` chunk ~395 kB (113 kB gzip) — item performa.
- CustomerPortal dulu memaksa `behavior: 'smooth'`, mengabaikan `prefers-reduced-motion`.

### Baseline gate (pakai angka ini untuk membandingkan)
`npm run lint` → tsc 0 error · ESLint **0 error / 33 warning** (semua pre-existing;
catatan lama "28 warning" sudah kedaluwarsa) · vitest **299 lolos / 23 berkas**.
`npm run build` → `dist/` bersih 132 berkas, PWA release check lolos.

### PR #242 (vite 6.4.5) — jangan di-merge tanpa CI ulang
`browser-smoke-tests` GAGAL pada run 22 Okt karena base-nya sebelum `904b2b4`
("stabilize PDF test"). Branch sudah di-update 23 Okt; tunggu CI segar.
**Koreksi — jangan ulangi kesalahan ini:** `browser-smoke-tests` di CI jalan terhadap
**server lokal**, bukan produksi (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` di
`.github/workflows/ci.yml`). `playwright.config.ts` juga default ke `127.0.0.1:3000`
dengan `webServer` yang menjalankan `npm run dev`; produksi hanya disentuh bila
seseorang set `UNSAFE_E2E_AGAINST_PROD=1`. Jadi **kegagalan smoke test di CI itu
NYATA** — jangan dibuang sebagai "flake produksi". CLAUDE.md sempat menyatakan
sebaliknya dan sudah dikoreksi 23 Okt.

### Dependabot: #134 JANGAN di-merge selagi revamp jalan
Bump `tailwindcss` + `postcss-selector-parser` mengubah output CSS. Menggabungkannya
di tengah revamp visual membuat regresi tidak bisa dibedakan antara dep dan diff kita.
Tahan sampai S1/S2 selesai dan ada baseline visual.

---

# SurePath Session Context
**Updated:** 2026-10-21 (v2.5.20 + INSIDEN data-gateway)

## ⚠️ BACA DULU — data-gateway berjalan di jalur darurat

21 Okt 2026 `data-gateway` MATI TOTAL ±1 jam 20 menit. Sebabnya: deploy lewat MCP
dengan isi bundel ditempel inline. Payload 104 KB terpotong di ~8,5 KB, potongannya
kebetulan valid secara sintaks, Supabase MENERIMANYA, dan v4 terbit TANPA
`Deno.serve` — jadi tidak ada handler dan semua permintaan menggantung. Tanpa error
sama sekali.

**JANGAN deploy fungsi besar dengan isi inline.** Bundel data-gateway ≈ 104 ribu
token (JS minified tokenisasinya ~1 karakter/token). Itu mustahil dalam satu
panggilan, bukan sekadar berisiko. Ukur dulu.

Produksi SEKARANG: `data-gateway` v5 = shim ±60 baris yang memuat kode gateway saat
boot dari `public.dg_bundle_tmp()` (service_role saja) lalu
`import("data:text/javascript,...")`. Dua hal krusial:
- modul dinamis TIDAK BOLEH mengimpor apa pun (graf modul edge runtime statis), jadi
  `createClient` diimpor statis di shim dan dititipkan via `globalThis.__sbCreateClient`;
  penukaran baris impor dilakukan DI DALAM `dg_bundle_tmp()`
- shim gagal-tertutup dan TERLIHAT: 503 dengan sebab, bukan menggantung

**JANGAN DROP** `public.dg_src_tmp`, `public.dg_bundle_tmp()`, domain
`"application/javascript"` — produksi mati pada cold start berikutnya. Sudah diberi
COMMENT peringatan di DB. Urutan mengakhirinya ada di
`docs/INCIDENT_2026-10-21_data-gateway.md`.

### Jalur deploy yang SUDAH dibuktikan tertutup (jangan diulang)
- CLI dari kontainer: `api.supabase.com` 403 kebijakan proxy
- workflow `deploy-edge-functions.yml`: guard menolak, repo secret belum diisi
- integrasi Supabase–GitHub (sudah dihubungkan pemilik): TIDAK men-deploy function
- `import` dari host mana pun saat deploy: bundler menolak, termasuk domain Supabase
- `import` modul remote saat runtime: `Module not found`, graf statis

### Memperbarui kode gateway selagi jalur darurat dipakai (TERBUKTI 21 Okt)
`node scripts/bundle-gateway.mjs <out>` → aset transit acak di `public/_dg/` →
merge + picu deploy → `net.http_get` dari Postgres → **cocokkan md5** → cadangkan
baris ke `id=2` → UPDATE `id=1` **di dalam blok DO** (UPDATE/DELETE lepas sering
timeout lewat MCP) → deploy ulang shim untuk memaksa isolate baru → verifikasi
200/401 → hapus aset. Nol emisi manual: git dan pg_net yang membawa bytes-nya.
Langkah lengkap di `docs/INCIDENT_2026-10-21_data-gateway.md`.

`dg_src_tmp` baris **`id=2` adalah CADANGAN**, bukan sampah.

Bundel aktif per 21 Okt 15:30 UTC: md5 `d8b9c3fc30a8ce16d6a8ce852266c60d`,
112.802 karakter, **114 aksi** termasuk 9 aksi marketing v2.6.0.

Catatan lain: webhook GitHub→Vercel sempat tertunda ±8 menit, jadi merge tidak
selalu langsung memicu build. Picu manual lewat MCP Vercel `create_deployment`
dengan `gitSource` + sha, lalu cek alias `myinsurepath.com` muncul di hasilnya.

### Yang masih dibutuhkan dari pemilik
Repo secret `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF=uyjgeteelnswphyzkjwi`,
atau deploy CLI dari mesin lain. Itu mengakhiri jalur darurat DAN menyelesaikan
masalah deploy yang berulang berminggu-minggu.

## Verifikasi yang terbukti berguna
`pg_net` dari dalam Postgres (`net.http_post` + `net._http_response`) adalah satu-satunya
cara memverifikasi edge function dari lingkungan ini, karena `*.supabase.co` dan
`myinsurepath.com` dua-duanya 403 dari kontainer. Dipakai untuk semua pembuktian
insiden ini. Setelah SETIAP deploy: baca `get_edge_function` (sumber terdeploy) DAN
kirim satu permintaan nyata. Status "success" tidak membuktikan apa pun.

## Temuan data produksi (21 Okt, untuk rencana dashboard marketing)
`sp_payments` 0 baris · `sp_commissions` 0 dari 13 tertaut order · `sp_policies` 0 dari 5
tertaut order · order punya `policy_number` 0 dari 5 · `upline_id` terisi 0 dari 47 ·
role MARKETING tidak ada. Rencana di `docs/MARKETING_CRM_PLAN.md`; Fase 0 (view
kanonik `v_produksi`) adalah prasyarat, bukan opsional.

---

# SurePath Session Context
**Updated:** 2026-09-14 (v2.5.15 — latar video selaras di 10/10 halaman situs; v2.5.14 — jejak aktivitas per pengguna + rancangan arsitektur CMS; v2.5.13 — tema CMS ikut token; v2.5.12 — kesiapan Play Store)

## Current State
- **main = v2.5.15.** `APP_VERSION` di `src/version.ts` = sumber kebenaran.

### ✅ `xendit-webhook` SUDAH di-deploy (v10, 2026-09-11)
`verify_jwt` dulu `true`, sehingga platform menolak SETIAP callback Xendit dengan 401 sebelum badan fungsi jalan — padahal fungsinya punya auth sendiri lewat `x-callback-token` (fail-closed). Bukti bahwa ia tidak pernah sekali pun berjalan: `sp_payments` **kosong**. Di-deploy lewat MCP dari sumber repo (19.487 karakter, satu berkas), lalu diverifikasi: seluruh konstanta uang cocok (`> 100`, `0.02`, `25000`, 7 hari / 180 hari, kedua `Math.round`).

### ⚠️ `pathy-agent` & `data-gateway` MASIH belum di-deploy

**Diselidiki tuntas 13 Sep 2026 — jangan ulangi penelusurannya.**

Koreksi atas catatan sebelumnya: dulu tertulis "Supabase CLI tidak terpasang".
Itu **salah** — CLI-nya bisa dipasang (`npm i -g supabase` → v2.117.0 berhasil,
registry.npmjs.org ada di noProxy). Yang sebenarnya memblokir adalah **jaringan**.

| Jalur | Hasil (diuji ulang 13 Sep) |
|---|---|
| Supabase CLI | ✅ terpasang v2.117.0 — bukan pemblokir |
| `api.supabase.com` | ❌ HTTP 000 — ditolak kebijakan proxy organisasi |
| `<project>.supabase.co/functions/v1/*` | ❌ HTTP 000 — sama |
| MCP `deploy_edge_function` | ✅ berfungsi, tapi isi berkas harus inline |

Ukuran kalau dibundel esbuild (temuan baru — jauh lebih kecil dari sumber mentah):

| Fungsi | Sumber mentah | Bundel + jaga baris | Bundel minified penuh |
|---|---|---|---|
| `pathy-agent` | 152.543 | 98.143 | 80.065 |
| `data-gateway` | 220.586 | — | 103.833 |

Tetap tidak dilakukan, dan alasannya bukan ukuran semata:
- **`data-gateway` sedang BERFUNGSI** dan melayani kelima portal. Satu karakter
  salah mematikan seluruh aplikasi, dan tidak ada rollback murah (redeploy versi
  lama = mengetik ulang 100 KB lagi). Blast radius-nya tidak sepadan.
- **`pathy-agent`** blast radius-nya sempit (chat saja), tapi emisi verbatim
  80–98 KB kode hasil generate tidak punya redundansi semantik untuk menangkap
  kesalahan saat ditulis, dan verifikasinya baru terjadi SETELAH produksi berubah.
- Mem-bypass kebijakan proxy organisasi bukan opsi.

**Solusi sekali-untuk-selamanya (butuh owner):** Supabase Dashboard → Project
Settings → Integrations → GitHub → connect `roollaanndd/surepath`. Atau set repo
secret `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF=uyjgeteelnswphyzkjwi`
(workflow `deploy-edge-functions.yml` sudah memakai `supabase/setup-cli@v1`,
dan runner GitHub punya jaringan — jadi begitu secret ada, semuanya jalan).

Menunggu deploy gateway: Pathy lintas produk (v2.5.9/2.5.14), gerbang
kepercayaan (v2.5.6), `ensure_profile` tolak email palsu (v2.5.7), jejak
aktivitas (v2.5.14).

### ⚠️ Cacat yang ditangkap uji — JANGAN diulang
Versi pertama penjaga server menolak SEBELUM cek profil-sudah-ada. `ensure_profile` jalan di SETIAP login → akan **mengunci 6 akun domain mencurigakan yang sudah ada**. `signupRole.test.ts` menangkapnya (6 merah). Penjaga dipindah ke jalur profil-BARU saja + 2 uji mengunci keduanya.
### Sengaja TIDAK dikerjakan
`vehicleDatabase.ts` → server: **31 titik panggil sinkron** jadi async, termasuk wizard beli (jalur uang). Sudah di lazy-chunk, bukan bundle utama. Butuh pass tersendiri dengan aplikasi bisa dijalankan.

## v2.5.6 — Gerbang kepercayaan akun + pelapisan keamanan (2026-09-11)
### Temuan audit 35 akun
30 dari 32 dikonfirmasi **instan <2 detik** (auto-confirm MENYALA, cuma 2 yang benar-benar klik) · **6 akun (17%) domain sampah**.
Akar: pendaftar CUSTOMER ditulis `verified: true` (`verified: role !== 'AGENT'`) → kolom `verified` TIDAK bisa membedakan nasabah asli dari akun karangan. `identity_status` terisi di 40 baris tapi **tidak dibaca kode mana pun** — kolom mati.
### Rancangan (`_shared/trust.ts`) — tanpa perubahan skema
Tier 0/1/2 diturunkan dari data yang ada. **Kuncinya pemeriksaan DOMAIN email**, bukan `email_confirmed_at` — selama auto-confirm menyala kolom itu selalu terisi jadi bernilai nol. Domain `@example.com` mengunci tier 0 **meski verified:true**.
Digerbang hanya **6 dari 103 action**: create_policy_order, submit_claim, agent_request_withdrawal, redeem_coins, apply_referral, accept_agreement. Sisanya (baca, simulasi, quote draf, Pathy, profil) TETAP TERBUKA.
**Grandfathering**: akun < 12 Sep 2026 bebas sepenuhnya (termasuk 6 domain sampah lama) → menyalakan ini tidak mengubah pengalaman pengguna lama. Ada uji yang mengunci ini.
Ditegakkan di **dispatcher data-gateway** (1 titik, bukan 103). Admin selalu lolos. Tolak → 403 + `code:'VERIFICATION_REQUIRED'`. 17 uji baru.
### `docs/SECURITY_LAYERING.md`
Jujur: kode browser TIDAK bisa disembunyikan. Obfuscation menaikkan biaya, tidak mencegah, dan merusak stack trace Sentry. Frame yang benar: bikin kode tersalin jadi TIDAK BERGUNA.
⚠️ **Aset asli yang terekspos bukan kode React, tapi `services/vehicleDatabase.ts` (2.572 baris / 352 KB harga kendaraan)** + tabel OJK — ikut bundle produksi, tinggal ambil arraynya. Rekomendasi pindah ke server (bonus: bundle −350 KB) **sengaja TIDAK dikerjakan** (mengubah jalur data wizard beli) — keputusan owner.
### Butuh tangan owner
1. **Matikan auto-confirm** Supabase → Auth → Providers → Email (satu-satunya cara stop email karangan di sumbernya; tidak diubah sendiri karena mengubah alur daftar).
2. Pastikan repo GitHub privat.
### ⚠️ BELUM AKTIF
Gerbang ada di data-gateway yang **belum pernah ter-deploy**. Baru berlaku setelah integrasi GitHub Supabase dinyalakan.

## v2.5.5 — Kode sumber server terpublikasi lewat sourcemap (2026-09-11)
### Cacatnya
`npm run build` menulis `esbuild server.ts --sourcemap --outfile=dist/server.cjs` — **dist/ adalah folder publik Vercel**. Sourcemap dibuat dengan `sourcesContent`, jadi **kode TS asli** `server.ts` (AI gateway + lapisan validasi PII-leak) dan `services/aiAdminEngine.ts` bisa diunduh utuh lewat `/server.cjs.map`. `server.ts` menurut CLAUDE.md hanya untuk dev lokal — tidak pernah punya urusan di folder publik.
Keterjangkauan dari internet **tidak diverifikasi** (sandbox tanpa egress ke domain produksi); yang pasti berkasnya ada di direktori publikasi.
### Perbaikan
- Bundle server → `build-server/` (di luar dist/, masuk .gitignore, ditambahkan ke eslint ignores). `npm start` menyesuaikan.
- `scripts/check-dist-clean.mjs` (baru) jalan di **akhir `npm run build`** → build GAGAL bila dist/ memuat sourcemap / bundle server / berkas kredensial. Melekat di `build`, jadi CI **dan Vercel** ikut memeriksa otomatis.
- Diuji dua arah: dist lama → gagal & menyebut 2 berkas; sesudah perbaikan → 119 berkas, 0 sourcemap.
### Sudah benar (diverifikasi, jangan diutak-atik)
Sourcemap klien tidak diproduksi · nol rahasia di bundle klien (`service_role`/`xnd_`/`sk_live`/JWT) · hanya `VITE_SUPABASE_URL`+`VITE_SUPABASE_ANON_KEY` ke browser (memang publik) · `SUPABASE_SERVICE_ROLE_KEY` di aiAdminEngine aman (vite tak meng-`define` process.env; hanya di-import server.ts) · `re_` di bundle = `re_profile`, positif palsu.
### Jebakan yang sempat kena
Menambah `build-server/` membuat `eslint .` melahap bundel CJS → 69 error palsu (`no-var`, `require is not defined`). Ditambahkan ke `eslint.config.js` ignores; kembali ke baseline 28 warning / 0 error.

## Data pengguna per 11 Sep 2026
35 akun auth · 40 baris sp_users (selisih 5 — perlu dicek) · hari ini: **1 daftar + 1 login** (`edotbotak@example.com`, CUSTOMER, 16:56 WIB).
⚠️ **`auth.audit_log_entries` KOSONG** — tidak ada riwayat login/daftar sama sekali. `auth.users.last_sign_in_at` DITIMPA tiap login, jadi hanya login terakhir yang diketahui. `sp_page_views` (1090 baris) tidak punya kolom user_id. `sp_audit_log` hanya 4 baris, cuma UPDATE tabel kritis.

## v2.5.4 — Ranjau KEDUA jalur uang (2026-09-10) — SUDAH AKTIF DI PRODUKSI
### Setiap UPDATE ke `sp_payments` di-rollback
`audit_critical_update()` dipasang di `sp_policy_orders` DAN `sp_payments`, tapi mendereferensi `OLD.total_premium`/`commission_amount`/`discount_amount` tanpa syarat. `sp_payments` tidak punya ketiganya → di PL/pgSQL itu **error runtime, bukan NULL**. Trigger AFTER UPDATE di transaksi yang sama → **setiap UPDATE ke sp_payments gagal**. INSERT aman (trigger UPDATE-only), makanya `create-xendit-invoice` jalan dan tidak ada yang sadar.
Dibuktikan empiris di produksi (transaksi dibatalkan sendiri): `record "old" has no field "total_premium"`.
Dilaporkan PR #95 (draft, Agustus) tapi tidak pernah diverifikasi/diperbaiki. Sekarang sudah.
### ⚠️ JALUR PEMBAYARAN PUNYA DUA RANJAU — perbaiki satu saja tidak cukup
1. `verify_jwt=true` di `xendit-webhook` → callback ditolak 401 sebelum fungsi jalan. **Diperbaiki v2.5.2, MASIH menunggu deploy.**
2. Trigger audit → UPDATE PAID di-rollback. **Diperbaiki v2.5.4, SUDAH AKTIF** (migrasi DB, tidak butuh deploy edge function).
### Perbaikan & ekuivalensi
`supabase/migrations/20260910_fix_audit_critical_update.sql` — banding lewat `to_jsonb()`; `status` tetap text; tiga kolom uang di-**cast ke numeric** supaya perbandingan tetap numerik (bukan teks: `1.0` vs `1.00`). Atribut dijaga: SECURITY INVOKER, `search_path=public, pg_temp`.
Verifikasi (semua rollback): sp_payments update sepele ✓, status→PAID ✓, audit tepat 1. sp_policy_orders: sepele **+0**, status **+1**, premi **+1** → tanpa regresi.

## v2.5.3 — Memutus pola "gagal tanpa bersuara" (2026-09-10)
### Pola yang mendasari SEMUA temuan sesi ini
Auto-deploy lapor sukses tanpa deploy · `functions.invoke()` gagal tak diperiksa · kanal notifikasi dilewati diam-diam · percakapan Pathy tak pernah disimpan. **Selama sistem tidak bisa memberi tahu saat rusak, tiap perbaikan berikutnya adalah tebakan.**
### Dua perkakas
1. `npm run check:functions` (`scripts/check-edge-functions.mjs`) — **memblokir di CI**. Setiap dir di `supabase/functions/` wajib punya sikap TERTULIS di `config.toml`: dideklarasikan, atau `#!undeclared <nama> — alasan`. Menangkap dua arah (fungsi tanpa deklarasi, deklarasi tanpa sumber). Diuji dua-duanya.
2. `docs/PRODUCTION_READINESS.md` — satu query SQL read-only untuk SQL Editor. Tidak menampilkan NILAI rahasia, hanya ada/tidaknya. Cek: rahasia Vault yang dipakai fungsi DB, `sp_bot_config` kosong, kanal notifikasi, prasyarat Xendit, rate set OJK.
### ⚠️ Temuan baru: 2 dari 3 kanal notifikasi admin MATI
| Kanal | Status | Sebab |
|---|---|---|
| Telegram | ✅ | — |
| WhatsApp (Fonnte) | ❌ | `FONNTE_TOKEN` tidak ada di Vault — **nomor admin sudah diisi**, jadi tampak menyala |
| Email (Resend) | ❌ | `RESEND_API_KEY` tidak ada DAN `admin_email` kosong |
Cara isi (nilai tidak pernah masuk repo): `select vault.create_secret('<nilai>','FONNTE_TOKEN');` dst — lihat PRODUCTION_READINESS.md.
### Verifikasi ulang v2.5.2
`verify_jwt=false` di `xendit-webhook` **tidak** membuka lubang: cek `x-callback-token` fail-closed eksplisit (token tak ada → 500), dan `XENDIT_WEBHOOK_TOKEN` terkonfirmasi ADA di Vault (48 char) → setelah deploy webhook benar-benar jalan.

## v2.5.2 — Dua cacat diam yang ketahuan gara-gara config.toml (2026-09-10)
### ⚠️ `xendit-webhook` akan gagal di pembayaran PERTAMA (jalur uang)
Produksi menjalankannya `verify_jwt = true`. Fungsinya autentikasi pakai `x-callback-token` Xendit (fail-closed) dan tidak pernah mengharap JWT. Dengan verify_jwt=true, platform menolak **401 sebelum fungsi jalan** → callback Xendit tidak pernah sampai → pembayaran tak pernah `PAID` → komisi tak pernah dikredit → insurer tak pernah dinotifikasi.
**Belum meledak karena `sp_payments` KOSONG** — belum pernah ada pembayaran (order terakhir Juli 2026, total 5 order, `sp_wallet_transactions` juga kosong). Ranjau pra-peluncuran.
Diperbaiki di `config.toml` → `false`. Alasan identik data-gateway.
### `send-insurer-email` tak pernah ter-deploy padahal DIPANGGIL klien
`services/website.ts:294` memanggil `supabase.functions.invoke('send-insurer-email', …)` setelah menerbitkan token insurer + review URL. Fungsinya tidak ada di produksi → insurer **tidak pernah menerima email review-link**. Langkah terakhir alur review insurer (v1.20.0–v1.22.0) mati diam-diam. Penilaian v2.5.1 ("keputusan produk") KELIRU — ini perbaikan cacat. Sekarang dideklarasikan, `verify_jwt = true`.
### Tetap dibiarkan mati
`ai-gateway` — hanya kembaran gateway lokal `server.ts` via `/api/ai-gateway` (dev-only). Tidak ada pemanggil edge-function-nya.
### ⚠️ BELUM BERLAKU DI PRODUKSI
Kedua perbaikan ada di `config.toml`, jadi baru aktif saat deploy berikutnya benar-benar jalan — setelah integrasi GitHub di dashboard Supabase dinyalakan.

## v2.5.1 — Jalan keluar deploy TANPA secret GitHub (2026-09-10)
**Masalah owner:** tidak punya akses ke Settings→Secrets GitHub, jadi auto-deploy tidak bisa dinyalakan.
**Jawabannya:** secret GitHub memang tidak diperlukan. **Integrasi GitHub dari dashboard Supabase** (Project Settings → Integrations → GitHub) men-deploy migrasi + edge function pada setiap push ke `main`, tersedia di **semua paket**, dan kredensialnya tinggal di sisi Supabase — nol secret di repo.
**Penghalang kedua yang ditemukan:** integrasi itu hanya men-deploy fungsi yang dideklarasikan di `supabase/config.toml` — dan repo ini **tidak punya berkas itu**. Jadi kedua jalur deploy sama-sama buntu dengan sebab berbeda. Sekarang `supabase/config.toml` ada: 19 fungsi, `verify_jwt` **dicerminkan persis dari produksi** dan diverifikasi terprogram. Minimal (hanya `project_id` + `[functions.*]`) supaya setelan layanan lain tidak tertimpa.
**Langkah owner (dashboard Supabase, bukan GitHub):** Authorize GitHub → pilih repo → Working directory `.` → nyalakan **Deploy to production**.
**Temuan sampingan:**
- `send-insurer-email` & `ai-gateway` ada di repo tapi **tidak pernah ter-deploy** → fitur kirim review-link insurer (v1.20.0) kemungkinan mati di produksi. Sengaja dikomentari di config; perlu keputusan.
- `xendit-webhook` di produksi `verify_jwt = true` padahal callback Xendit pakai `x-callback-token`. Dicerminkan apa adanya; perlu ditinjau.
- Workflow CI tidak lagi hardcode `--no-verify-jwt` — `config.toml` jadi satu-satunya sumber kebenaran.
**Kenapa tidak deploy dari sesi Claude:** MCP `deploy_edge_function` menuntut seluruh isi berkas inline dalam satu panggilan. Bundle esbuild pathy-agent minified = 77 KB; harness memindahkan keluaran >28 KB ke file sehingga isinya tidak bisa masuk konteks utuh, dan mengirim artefak build lewat model bukan mekanisme yang bisa diandalkan berulang.

## v2.5.0 — Pathy: dokumen & diplomasi (2026-09-09)
### Permintaan owner (4 poin) dan bagaimana dijawab
1. **Diplomatis soal klaim** → `check_coverage`/`start_claim` tidak lagi memvonis. Mengembalikan `indication` (`LIKELY_COVERED`/`LIKELY_NOT_COVERED`/`NEEDS_REVIEW`) + `decision_by: 'INSURER'`; polis belum aktif dan tanggal di luar periode → `NEEDS_REVIEW`, bukan penolakan. Kartu UI: glyph `≈`/`≉`/`?`, bukan centang "Ditanggung". Field lama `covered`/`eligible` tetap dikirim → tidak ada jendela rusak saat web sudah live tapi function belum.
2. **Upload gambar** → penyebabnya ketemu: dua tombol lama (`Foto STNK`/`Foto KTP`) memakai `capture="environment"`, jadi ponsel langsung ke kamera dan galeri tidak pernah bisa dibuka. Sekarang **Unggah gambar** (tanpa `capture`) + **Kamera**, maks 4 lampiran, 12 MB, thumbnail di composer & gelembung pesan.
3. **Ekstraksi dipakai + disimpan** → `services/docOcr.ts` (baru) mengklasifikasi sendiri (STNK/KTP/SIM/POLIS/INVOICE/DOC) lalu merutekan ke pembaca khusus; `compare_offers`/`build_quotation` mengisi argumen yang tidak disebut model dari lampiran (argumen eksplisit tetap menang); setiap lampiran diarsipkan ke tabel baru `sp_user_documents`; tool tulis ketiga `save_document_data` melengkapi profil (nasabah) atau `sp_clients` (agen) — **hanya kolom kosong**, kecuali `overwrite: true`.
4. **Disclaimer selalu ada** → `pathy-agent/disclaimers.ts` menghitung caveat tiap giliran dari tool yang berjalan + teks jawaban, dikirim sebagai `data.disclaimer` dan dirender klien di bawah gelembung. **Tidak bergantung kerelaan model.** Otoritas: asuransi / dokter / OJK-kepolisian-hukum.

### 🔑 AKAR MASALAH DEPLOY DITEMUKAN: secret repo tidak pernah diset
Workflow `deploy-edge-functions.yml` **belum pernah men-deploy apa pun**. Setiap run berhenti di langkah guard karena `SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_REF` kosong, lalu melaporkan **sukses** — sehingga tidak ada yang sadar. Log run #7 (10 Sep) membuktikan keduanya: `Deploying: pathy-agent` (perbaikan resolusi fungsi bekerja), lalu `::warning:: … not set — skipping`.
**Yang perlu owner lakukan sekali (±1 menit):** Settings → Secrets and variables → Actions → tambahkan `SUPABASE_ACCESS_TOKEN` (token dari dashboard Supabase) dan `SUPABASE_PROJECT_REF` = `uyjgeteelnswphyzkjwi`, lalu re-run workflow. Setelah itu deploy otomatis selamanya.
Sampai itu dilakukan: `supabase functions deploy pathy-agent --project-ref uyjgeteelnswphyzkjwi` dari mesin yang punya source.
Skip-nya sekarang ditulis ke run summary ("⚠️ Edge functions NOT deployed" + perintah manualnya), supaya tidak lagi tersembunyi di dalam run hijau.
**Kenapa tidak di-deploy dari sesi Claude:** MCP `deploy_edge_function` menuntut seluruh berkas fungsi di-inline dalam satu panggilan — pathy-agent 146 KB (6 berkas + 4 `_shared`), melebihi batas keluaran satu pesan.

### Deploy edge function akhirnya otomatis untuk fungsi yang benar
`.github/workflows/deploy-edge-functions.yml` dulu selalu men-deploy **data-gateway** pada setiap push, apa pun yang berubah — itulah sebabnya `pathy-agent` tertinggal dua rilis padahal workflow-nya hijau di push yang justru mengubahnya. Sekarang ia men-deploy fungsi yang benar-benar tersentuh push (perubahan di `_shared/` → deploy semua). Tetap butuh secret `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF`; tanpa itu workflow no-op dengan peringatan, dan deploy `pathy-agent` harus manual.

### Yang perlu diingat
- Tabel `sp_user_documents` **sudah diapply ke production** (deny-all RLS, 0 policy, service_role saja). Menyimpan **field hasil ekstraksi, bukan gambar** — gambar tidak pernah keluar dari browser.
- `archiveDocuments()` sengaja tidak pernah melempar: kalau tabelnya tidak ada di suatu environment, Pathy tetap jalan, cuma tidak mengingat.
- Uji baru `services/__tests__/pathyDocuments.test.ts` (21 uji) mengunci: tidak ada jalur kode yang menjanjikan klaim dibayar, disclaimer selalu terbit, tulis profil terbatas 4 kolom, dan scan agen tidak pernah menyentuh `sp_users`.

## v2.4.0 — Audit UI: nasabah ≡ agen (2026-09-08)
### Bug terbesar: token mode terang mati sejak DS v3 (2026-07-06)
Komentar pembuka `styles.css` memuat `lp-*/primary/brand`. Urutan `*/` menutup komentar lebih awal → sisa kalimat terbaca sebagai selector → blok `:root { --ds-* }` sesudahnya tertelan sebagai badannya. **Semua `bg-ds-*`/`text-ds-*`/`border-ds-*` di seluruh aplikasi jatuh ke transparan/warna warisan di mode terang.** Blok `.dark` aman, jadi mode gelap satu-satunya yang selama ini benar. Diperbaiki (kalimatnya ditulis ulang tanpa `*/`); diverifikasi di bundle produksi lewat Playwright: `--ds-green` → `#00C16A`, `.bg-ds-green` → `rgb(0,193,106)`.
**Pelajaran:** jangan pernah tulis `*/` di dalam komentar CSS — termasuk di dalam contoh nama kelas.

### Kerangka portal jadi bersama
`components/shared/PortalHeader.tsx` + `PortalTabBar.tsx` — diekstrak dari portal agen, sekarang dipakai agen **dan** nasabah, jadi keduanya tidak bisa lagi menyimpang diam-diam. Header dikunci di 70px (identitas `truncate`, bukan wrap; versi app menyingkir di <420px). `main` nasabah karenanya `pt-[4.75rem]`.

### Navigasi nasabah
Beranda · Beli · **[Pathy]** · Klaim · Riwayat. Slot tengah = overlay Pathy via `PATHY_OPEN_EVENT` (prop baru `hideLauncher` mematikan tombol mengambang di portal nasabah — satu pintu saja). **Profil pindah ke avatar header**, sama seperti agen. Keputusan owner di sesi ini; kalau mau Profil kembali jadi tab, tinggal ubah array `TABS` di `CustomerPortal.tsx`.

### Ikon & token
`shared/duotone.tsx` (resep gambar bersama) + `shared/CustomerIcons.tsx` (grid 48, duotone, aksen emas — Beranda/Profil/Klaim digambar identik dengan set agen). `CustomIcons` 24-grid tidak dipakai lagi di portal nasabah.
Token semantik baru di Tailwind: `ds-blue-lt` / `ds-amber-lt` / `ds-red-lt` → `--ds-*-tint`. Semua `bg-amber-50`/`bg-rose-50`/`bg-gray-100`/`bg-slate-100`/`dark:bg-[#161616]` di `CustomerPortal`, `OrderDetailSheet`, `AccessibilitySettings` diganti.
`AgentNotifications` sekarang tipis membungkus `shared/NotificationDrawer` (satu implementasi, token-based). `HeroCard` dapat varian `emerald`/`navy`.

### Backlog UI (Fase 4, belum dikerjakan)
`components/ui/EmptyState.tsx` masih tidak dipakai; empty state di portal nasabah masih kotak dashed ad-hoc. Reveal berjenjang `motion/react` juga belum masuk portal nasabah (agen sudah).

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
