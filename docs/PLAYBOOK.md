# SurePath — Playbook Operasional

> Dokumen hidup: ritme kerja, workflow, dan mini-plan per bagian yang dipakai
> setiap sesi engineering. Sumber aturan induk tetap `AGENTS.md`; arsitektur di
> `ARCHITECTURE.md` / `TECHNICAL_SPEC.md` / `CMS_ARCHITECTURE.md`; peta seluruh
> dokumen di `docs/DOCS_INDEX.md`.
>
> Terakhir disinkronkan: **v2.7.14 (2026-10-28)**.

---

## Daftar isi

0. [Ritual rilis](#bagian-0--ritual-rilis)
1. [Tema & dark mode](#bagian-1--tema--dark-mode)
2. [Apps Mitra (Agent)](#bagian-2--apps-mitra-agent)
3. [Admin CMS](#bagian-3--admin-cms)
4. [Pathy AI](#bagian-4--pathy-ai)
5. [Audit foto (wizard mobil)](#bagian-5--audit-foto-wizard-mobil)
6. [Kuotasi, komisi & pagar diskon](#bagian-6--kuotasi-komisi--pagar-diskon)
7. [Pembayaran (Xendit)](#bagian-7--pembayaran-xendit)
8. [Edge functions](#bagian-8--edge-functions)
9. [Testing](#bagian-9--testing)
10. [Deploy & verifikasi production](#bagian-10--deploy--verifikasi-production)
11. [Keadaan darurat & troubleshooting yang sudah pernah terjadi](#bagian-11--keadaan-darurat)

---

## Bagian 0 — Ritual rilis

Setiap rilis mengikuti siklus `AGENTS.md`:
**riset → rencana → uji dulu (bila defect) → implement sempit → review → verifikasi → dokumentasi → commit → push → merge → verifikasi deploy.**

### Workflow rilis (urutan tetap)

```bash
# 1. Basis bersih dan mengikuti main
git fetch origin main
git log --oneline HEAD..origin/main        # kalau main maju -> merge dulu
git merge origin/main --no-edit            # selesaikan konflik SEBELUM lanjut

# 2. Gate cepat saat iterasi (fokus berkas)
npx tsc --noEmit
npx eslint <berkas-yang-diubah>

# 3. Gate lengkap sebelum rilis
npx vitest run                             # baseline v2.7.14: 410/410 (35 file)
npx playwright test                        # 75 lulus / 15 skipped / flaky <= 1
npx eslint .                               # 0 error (hitung warning, catat baseline)
npm run build                              # 26 route + prerender + PWA ok
npm run check:android                      # selaraskan versionCode
```

Jangan gabungkan `vitest run` dan `build` dalam satu shell command — output
"Errors N" palsu pernah muncul karena tabrakan resource; jalankan terpisah.

### Checklist versi bump (semua wajib)

| Berkas | Isi |
|---|---|
| `src/version.ts` | `APP_VERSION = '2.7.x'` |
| `package.json` + `package-lock.json` | bump via **node script** (PowerShell `Set-Content` merusak encoding/BOM) |
| `android/app/build.gradle` | `versionCode` +1, `versionName "2.7.x"` |
| `README.md` | `**Current version: …**` |
| `tests/agentApp.spec.ts` | `const APP_VERSION = '2.7.x'` |
| `docs/CHANGELOG.md` | entry di atas, catat gate + alasan |
| `docs/APP_REVAMP_EXECUTION.md` §6 | execution log |

Template script bump (simpan di folder temp, jalankan `node <file>.mjs`):

```mjs
import fs from 'node:fs';
process.chdir('C:/Users/rolan/OneDrive/Documents/Default Project/surepath');
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
p.version = '2.7.x';
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
let l = fs.readFileSync('package-lock.json', 'utf8');
let n = 0;
l = l.replace(/"version": "2\.7\.OLD"/g, () => { n++; return '"version": "2.7.x"'; });
fs.writeFileSync('package-lock.json', l);
console.log('lock replaced:', n); // wajib = 2
```

### Push & merge

```bash
git add -A && git commit -m "<jenis>(<area>): subjek (v2.7.x)"
git push origin redesign/uiux-all-apps
# saat pemilik sudah mengizinkan merge:
git fetch origin main
git checkout -B main origin/main
git merge --ff-only redesign/uiux-all-apps   # hanya fast-forward, tanpa force
git push origin main
git checkout redesign/uiux-all-apps          # kembali ke branch kerja
```

Catatan Windows: `git push` di PowerShell sering mencetak `NativeCommandError`
dari stderr padahal sukses — pegang bukti pada baris `..sha.. main -> main`.

### Mini-plan ritual rilis

- [ ] Pastikan workflow "Deploy Edge Functions" hijau bila push menyentuh
      `supabase/functions/**` (lihat Bagian 8).
- [ ] Cek status Vercel Production via GitHub API setelah merge (Bagian 10).
- [ ] `npm audit`: temuan high/critical = blocker rilis; low-severity dev-only
      boleh diterima dengan catatan scope + alasan di CHANGELOG (praktik berjalan).

---

## Bagian 1 — Tema & dark mode

### Konvensi dasar

- **Pemilik tema satu-satunya**: `components/shared/theme.ts` —
  `applyDarkMode/readDarkMode/storeDarkMode`; kelas `dark` dipasang di
  **`<html>`**, kunci `localStorage` `sp_dark_mode` (stringified boolean).
  Skrip pre-paint di `index.html` mencegah flash putih.
- Tailwind `darkMode: 'class'` (`tailwind.config.cjs`); value token ds-*
  mode-aware: terang di `styles.css :root`, gelap di `styles.css .dark`.
- **Admin** punya lapisan sendiri (`components/admin/themeMode.ts`): mode
  `auto|light|dark` di `ADMIN_THEME_KEY`; `auto` gelap 18:00–06:00, diperbarui
  tiap 5 menit, dan preferensi aplikasi lain direstorasi saat keluar CMS (#326).
- Kanvas apps bervariasi per portal: Agent (`sp-agent-premium`) dan Operator
  (`sp-operator-premium`) punya escape gelap sendiri; Portal Customer/B2B/
  Insurer memakai `html.dark .sp-modern-app`. Pass admin "redesign v2"
  wajib punya kembar gelap di bawah selector
  `html.dark .sp-modern-app:has(> main > header)`.

### Workflow: menambah/mengubah style portal

1. Tanya dulu: "aturan ini hidup/mati di dark mode?" — aturan terang
   `!important` TANPA guard `.dark` adalah sumber bug kartu-putih-teks-putih.
2. Selalu berpasangan:
   - terang:  `:root:not(.dark) .sp-modern-app … { … }`, atau
   - kembar gelap di akhir berkas: `html.dark .sp-modern-app:has(…) { … }`.
3. Pakai token `--ds-*` / `--sp-*` (lihat `DESIGN_SYSTEM.md`); tidak ada hex
   literal di `components/ui/`; teks minimum 11px (`text-2xs`).
4. Escapes yang ada (`[data-sp-preserve-light]`, `.text-white:not(…)`,
   `:not(.is-default)`) jangan dilabrak — baca komentar di atasnya dulu.

### Mini-plan theming

- [ ] Tegakkan floor 11px: 434 teks di bawah floor masih hidup (hasil audit
      v2.7.14, lihat `docs/AUDIT_2026-10-28_v2.7.14.md`) — pindahkan ke token
      `text-2xs`/`badge`.
- [ ] Pertimbangkan screenshot dark otomatis semua portal (mis. workflow
      `portal-screenshots.yml`) supaya regresi tema tertangkap di CI.
- [ ] Turunkan sisa hex hardcode (~1.100 instance hasil audit) secara bertahap
      mulai dari chip status dan kartu lama.

---

## Bagian 2 — Apps Mitra (Agent)

### Peta singkat

- Routing: `App.tsx` → `src/app/routes/{index,agent}.tsx` →
  `components/agent/AgentPortal.tsx` (root `sp-modern-app sp-agent-premium`).
- Tier: satu sumber data = action `get_tier_definitions` lewat
  `hooks/useTierDefinitions.ts`. **Kebenarannya mengikuti dashboard admin**:
  daftar ringkasan menyembunyikan tier default (`is_default`) — dipakai di
  `AgentLeaderboard.tsx` (Syarat Tier) dan `AgentNetwork.tsx` (Cara Kerja).
  Deteksi tier mitra sendiri tetap memakai daftar penuh.
- Palet warna GOLD/SILVER/… di `AgentPartnerCard` adalah **palette saja**,
  bukan daftar tier (jangan disalahartikan dua sistem berbeda).

### Workflow umum

- Menambah layar: daftarkan tab di `AgentPortal` + route module
  `src/app/routes/agent.tsx`; komponen baru satu berkas; data melalui gateway.
- Mock e2e (`tests/agentApp.spec.ts`) harus meniru keluaran action yang riil
  (kasus v2.7.12: bentuk baris `sp_agent_tiers`), dan **ditaruh setelah**
  `installMocks` bila ingin menimpanya — order register menang.

### Mini-plan agent

- [ ] `MONTHLY_TARGET` di Leaderboard masih 10jt hardcode — pertimbangkan
      dari konfigurasi admin.
- [ ] Warnings `exhaustive-deps` di portal (AgentNetwork dsb) dirapikan
      bertahap saat kebetulan menyentuh berkasnya.
- [ ] Kolom target tercatat (tier matriks) bila aturan tier berubah lagi.

---

## Bagian 3 — Admin CMS

### Peta singkat

- Shell `components/admin/AdminPortal.tsx` (rail + header; tema `themeMode`).
- Routing workspace per peran: `src/admin/roleConfig.ts`
  `getAdminWorkspace(userRole)` → dashboard khusus di
  `components/admin/workspaces/<key>/` (command, finance, insurer,
  collections, support, onboarding, marketing). Master admin jatuh ke
  dashboard umum (`DashboardView` / `AnalyticsDashboard` / `AdminDashboard` #325).
- Menu terkonsolidasi 17 section+tab (#323); layar keputusan antrean = tab
  `approvals` (`PolicyOrdersAdmin initialPending`, #324). Kegagalan muat
  **tidak boleh senyap** (pelajaran #324).

### Workflow: menambah view admin

1. Buat view (file baru lazy di `AdminPortal.tsx`, atau tambah di
   `AdminViews.tsx`).
2. Daftarkan di `renderContent()` + navigasi `components/admin/navigation.ts`
   (`buildVisibleNav/groupForSection/sectionForLeaf`).
3. Loading dulu, lalu error UI jelas, lalu konten — pola `loading → error →
   data`.
4. Kartu/dashboard per-peran memakai shared workspaces (`WorkspaceShell`,
   `KpiCard`) agar tema konsisten (termasuk kembar gelap).

### Mini-plan admin

- [ ] **Migrasi kolom `sp_insurer_products`**: `rating`, `benefits`,
      `advantages`, `disadvantages` — tipe TS sudah siap (v2.7.14); wizard
      agen otomatis memakainya begitu kolom ada; form Mitra Asuransi perlu
      input kolomnya.
- [ ] CI job `unit-tests` merah pre-existing — diagnosa berikutnya (Bagian 9).
- [ ] Rapihkan warning `exhaustive-deps` beruntun di AdminViews saat disentuh.

---

## Bagian 4 — Pathy AI

### Peta singkat

- UI `components/PathyChat.tsx` + kartu tipe lokal
  `greet | briefing | quote_flow | resume_prompt | renewal_care` (v2.7.11).
- Alur: chat → edge `pathy-agent` (model `openai/gpt-4o` via whitelist
  `ai-proxy`) dengan **token sesi** (bukan anon key). Turn ber-dokumen
  (OCR) skip proxy dan langsung ke `pathy-agent` (`services/website.ts`).
- TTS `speakAnswer/stopSpeaking` default off (`sp_pathy_tts`); share OS +
  wa.me di kartu follow-up/kutipan; sesi dilanjutkan lewat
  `sp_pathy_thread_{uid}`.
- Briefing agent: deterministik dari `get_my_orders` + `get_leaderboard`,
  **tanpa tabel uang** (aturan read-only briefing).

### Workflow guardrail

- Kuota ai-proxy 200 permintaan/jam; kegagalan dipetakan `mapAiError`
  (`components/car-wizard/StepSurvey.tsx`): sesi habis / kuota / belum
  dikonfigurasi / timeout; jaringan murni tetap pesan offline.
- Sebab teknis tetap dicatat di rekaman Pathy + console (jangan hilangkan).

### Mini-plan Pathy

- [ ] P4 usage dashboard (PATHY_EVOLUTION_PLAN §6) menunggu logging
      server-side alat yang dipakai — saat ini ditunda (blocked).
- [ ] Tahap verifikasi Fonnte (WA) diparkir — menunggu keputusan pemilik.
- [ ] Trek efek 3-ketukan (pemilihan kartu → penyelesaian) bila logging siap.

---

## Bagian 5 — Audit foto (wizard mobil)

### Rantai (terverifikasi v2.7.12)

1. Step SURVEY (step 5) `CarInsuranceWizard.tsx` →
   `components/car-wizard/StepSurvey.tsx`.
2. Per foto: `validateVehiclePhoto` (kompres 800px) — **fail-open**; gagal
   validasi TIDAK memblokir analisa utama.
3. Analisa utama: kompres 768px → `pathyAnalyzeVehiclePhotos`
   (`services/pathyVision.ts`) → `pathy-agent` (token sesi) → gpt-4o.
4. Kegagalan apa pun memakai `mapAiError` — bukan pesan offline generik.

### Diagnosa keluhan pemilik (pola yang sering)

- Seluruhnya "offline" di dev lokal: `.env.development` masih placeholder —
  uji dari `.env.development.local` project nyata, APK, atau produksi.
- **Catatan penting audit 28 Okt**: `vercel.json` memakai
  `Permissions-Policy: camera=()` sementara `server.ts` (self-host) pakai
  `camera=(self)` supaya kamera agen jalan → di Vercel produksi KAMERA
  DIBLOKIR. Jika klaim foto / scan dokumen dirasa gagal di produksi,
  salah satu penyebabnya kemungkinan ini (lihat
  `docs/AUDIT_2026-10-28_v2.7.14.md`, temuan P1-C).
- Foto >12MB ditolak (guard ClaimManager); bukti pembayaran dikompres 1200px.

### Mini-plan audit foto

- [ ] Samakan `camera=(self)` di vercel.json (P1 — lihat audit).
- [ ] Pengujian ulang produksi oleh pemilik memakai pesan baru `mapAiError`
      sebagai diagnostik.
- [ ] Pertimbangkan menampilkan ringkasan `photoFlags` granuler di UI
      hasil analisa.

---

## Bagian 6 — Kuotasi, komisi & pagar diskon

### Aturan bisnis (v2.7.14, dari PR #241)

- Rate komisi dasar dibatasi `min(0.25, rate)`.
- Diskon nasabah maksimum `max(0, min(configured_max_discount, baseComm))` —
  diskon selalu dibiayai dari komisi; premium untuk insurer tetap utuh
  (akuntansi), tampilan neto nasabah dipotong jumlah sama.
- Panel diskon di wizard memakai guardrail identik dengan perhitungan
  submit — ubah keduanya bersamaan.
- `SpInsurerProduct` memiliki kolom opsional `rating/benefits/advantages/
  disadvantages` (type-safe); UI tampil fallback bila kolom DB belum ada.

### Workflow menyesuaikan diskon/komisi

- Sumber: `components/agent/VehicleUnderwritingWizard.tsx` (submit + panel).
  Precedence: `selectedInsurerProduct` > `productConfig` > default.
- Kalau guardrail dipakai di permukaan baru (mis. renewal), ekstrak helper
  bersama daripada menduplikasi.

### Mini-plan kuotasi

- [ ] Ekstrak guardrail ke util bersama saat permukaan baru muncul.
- [ ] Perubahan konfigurasi komisi dari CMS harus tercermin segera
      (cek refresh `initVehicleOverrides` analog).

---

## Bagian 7 — Pembayaran (Xendit)

### Peta

- Edge `create-xendit-invoice`, `xendit-webhook`, `xendit-disburse` (payout
  agen — sensitif, per hati-hati RLS/otorisasi).
- Webhook adalah input tak terpercaya: verifikasi signature, idempotency
  (claim atomic `.neq('status','PAID')` + cocokkan nominal), jangan catat
  payload mentah ke log (PII).

### Workflow kecil

- Perubahan payload (mis. `discountAmount`) harus lewat gateway DAN webhook
  sekaligus — dua berkas, satu PR.
- Isu terbuka dari audit v2.7.14: `payErr` masih dibalas 200 (harusnya 500
  supaya Xendit retry) dan belum memicu notifikasi admin — lihat
  `docs/AUDIT_2026-10-28_v2.7.14.md` (P2-A).

### Mini-plan pembayaran

- [ ] Perbaiki `payErr` → 500 + notify-admin (audit P2-A).
- [ ] Bandingkan timing-safe untuk token compare (audit P2-B).

---

## Bagian 8 — Edge functions

### Inventaris (23 + `_shared`)

- Data: `data-gateway`, `quotations-gateway`, `submit-policy-insurer`.
- AI: `ai-gateway`, `ai-proxy`, `pathy-agent`, `pathy-agent-proxy`,
  `ai-policy-review`, `ai-finance-review`, `analyze-claim-photos`,
  `ocr-scan`, `stnk-ocr`.
- Pembayaran & notifikasi: `create-xendit-invoice`, `xendit-webhook`,
  `xendit-disburse`, `send-otp`, `verify-otp`, `send-whatsapp`,
  `send-insurer-email`, `notify-admin`, `daily-report`,
  `insurer-reminder-cron`.

### Workflow deploy (penting)

1. Type gate: `npm run check:functions` + workflow `edge-function-types`.
2. Workflow `Deploy Edge Functions` hanya deploy fungsi yang berubah antara
   push. Guard gagalkan run bila ada fungsi berubah tapi secrets tidak
   lengkap (pesannya eksplisit berisi daftar fungsi).
3. Status JWT per fungsi dideklarasikan di `supabase/config.toml`
   (`verify_jwt`) — tidak ada special-casing CLI.
4. Push yang menyentuh `supabase/functions/**` WAJIB ditutup workflow ini
   hijau sebelum rilis dinyatakan selesai (kasus 21 Okt: pathy-agent telat
   produksi; kasus 28 Okt: `Deploy functions` gagal → perlu re-run oleh
   pemilik, log Actions butuh hak admin).

### Mini-plan edge

- [ ] Monitoring diff (hash) fungsi repo vs produksi via `daily-report`.
- [ ] `pathy-agent-proxy` dikonfigurasi bila benar-benar dipakai produksi.

---

## Bagian 9 — Testing

### Tingkatan & baseline (v2.7.14)

| Lapisan | Perintah | Baseline |
|---|---|---|
| Tipe | `npx tsc --noEmit` | 0 error |
| Lint | `npx eslint .` | 0 error, ±28 warning |
| Unit | `npm run test:unit` | 410/410 (35 file) |
| E2E | `npx playwright test` | 75+ lulus, 15 skipped, flaky <=1 |
| Build | `npm run build` | 26 route + PWA ok |
| Android | `npm run check:android` | version selaras |

### Keanehan yang sudah pernah terjadi (jangan kaget lagi)

- Setelah dependensi naik: `npm install` (kasus `@google/genai`) dan
  `npx playwright install chromium` (browser baru).
- `vitest` "Errors N" saat dijalankan serentak dengan build — ulangi
  sendirian sebelum diagnosa.
- CI job `unit-tests` gagal PRE-EXISTING (main `9c4f0b2` juga merah; lokal
  hijau) — diduga lingkungan/waktu CI; cek log saat berkesempatan.
- Mock e2e harus bentuk data riil, dan register order menang.

### Mini-plan testing

- [ ] Test regresi injeksi filter (audit P1-A) parameterik di CI.
- [ ] Screenshot tema gelap semua portal otomatis di CI.

---

## Bagian 10 — Deploy & verifikasi production

### Target (2 jalur aktif)

1. **Vercel** (production utama, `vercel.json`).
2. **Cloudflare Pages** (workflow deploy-cloudflare-pages.yml).
Plus **Supabase Edge Functions** yang dideploy workflow terpisah (Bagian 8).

### Workflow verifikasi post-merge (wajib — AGENTS.md)

1. GitHub API `deployments` + commit status: cari environment `Production`
   untuk sha baru + status context `Vercel` success (lihat target_url).
2. Produksi "completed" tapi pemilik tidak melihat perubahan → jelaskan
   cache PWA/service worker (tutup-buka 2x / Ctrl+Shift+R), admin auto-dark
   hanya 18:00–06:00, apps dark manual, dan APK tidak update sendiri.
3. CI merah → bedakan pre-existing vs baru (Bagian 9 & 11), fix-forward.

### Mini-plan deploy

- [ ] Dokumentasikan env yang dibutuhkan Vercel
      (`VITE_SUPABASE_URL/ANON_KEY`, dsb.) di `DEPLOYMENT.md` bila belum.

---

## Bagian 11 — Keadaan darurat

| Tanggal | Gejala | Akar & tindakan | Dokumen |
|---|---|---|---|
| 21 Okt | data-gateway telat di produksi | deploy workflow gagal tak terlihat; guard eksplisit ditambahkan | `INCIDENT_2026-10-21_data-gateway.md` |
| 28 Okt pagi | admin dark: kartu putih + teks putih | pass redesign-v2 tanpa guard `.dark` → dark twin | CHANGELOG v2.7.13 |
| 28 Okt pagi | kanvas apps putih di malam | selector mati `.sp-modern-app.dark` → `html.dark .sp-modern-app` | CHANGELOG v2.7.13 |
| 28 Okt siang | CI `unit-tests` & Deploy Edge Functions merah | pre-existing / perlu re-run + akses admin | CHANGELOG v2.7.14 |
| 28 Okt | audit statis v2.7.14 | 3 P1 + beberapa P2/P3 dokumen | `AUDIT_2026-10-28_v2.7.14.md` |

Aturan ketika insiden: jangan senyapkan gate merah; bangun hipotesis dari
kode+log lokal; bila butuh log Actions (akses admin), minta pemilik re-run
dan catat hasilnya di CHANGELOG.
