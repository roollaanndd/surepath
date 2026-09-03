# SurePath Session Context
**Updated:** 2026-09-03 (sesi Climate Shield + halaman Teknologi AI)

## Current State
- **Branch kerja:** `claude/surepath-climate-ai-content-cerwtk` — v1.55.0: produk Climate Shield (pre-launch) + halaman `/ai` + perbaikan klaim berlebihan
- **main:** v1.54.0 (SEO audit). `APP_VERSION` di `src/version.ts` = sumber kebenaran; `package.json` 1.40.0 lagging, jangan dipercaya

## v1.55.0 — Climate Shield + Teknologi AI (2026-09-03)
- **Produk `climate` pre-launch** — masuk `PRODUCTS` (siteKit), `productInfoContent.ts`, route `App.tsx`, SEO, sitemap, llms.txt, footer. CTA "Daftar Minat", BUKAN beli — belum ada rating engine/wizard/insurer untuk produk ini. Copy sengaja tidak mengikat ("rencana santunan", "ambang yang disepakati"), ada blok disclaimer wajib.
- **Halaman `/ai` baru** (`src/pages/AITechPage.tsx`) + navbar (kini 6 item) + section AI di homepage. Isinya HANYA kemampuan yang live & wired.
- **PENTING — dua regex slug produk:** `App.tsx` (routing) DAN `src/seo/seo.ts` `resolveSeo()` (metadata). Menambah produk baru tanpa memperbarui keduanya = halaman render tapi title-nya fallback homepage.
- **`PRODUCTS` kini bertipe `SiteProduct[]`** — tanpa anotasi eksplisit, TS menyimpulkan union tanpa `comingSoon` dan akses properti itu gagal.

### Audit AI (dipakai sebagai sumber copy — jangan diulang dari nol)
Jalur AI produksi = edge function **`ai-proxy`** (whitelist 3 model, kunci di Vault). `supabase/functions/ai-gateway` (Gemini) **TIDAK punya pemanggil** — dead code. `services/geminiService.ts` namanya menyesatkan: **tidak ada panggilan Gemini di jalur mana pun yang live**. Gateway AI lokal di `server.ts` (cache, redaksi PII, penahan halusinasi) hanya jalan di dev/self-hosted — di Vercel jatuh ke ai-proxy.
- **Live & wired:** STNK OCR (+validasi silang plat/merek/model/VIN), forensik foto klaim (EXIF + perceptual hash anti foto daur-ulang + vision), ClaimSense, survei kendaraan 6 dimensi, validator foto, KTP OCR, kuitansi medis, Pathy, Health Chat, AI Policy Review, AI Finance Review, InsurerAI.
- **JANGAN dipasarkan:** `extractSTNKAndRecommend` (agent quote builder) — hanya mengirim 100 karakter pertama data-URL, gambar tidak pernah sampai ke model vision; `ocr-scan` (tanpa pemanggil, mengembalikan data palsu bila key kosong); `analyzeClaimPhoto` & `summarizeClaimDocument` (tanpa pemanggil); `aiAdminEngine` = rule engine, bukan LLM, dan tidak jalan di topologi Vercel.

### Klaim berlebihan yang DIPERBAIKI di rilis ini
- `explainProductAI` — prompt lama menyuruh model mengarang "Enkripsi Kuantum"/"Zero-Trust"/"klaim 60 detik" (kode sendiri bilang 3-10 hari kerja). Prompt ditulis ulang, `impactScore` dihapus.
- `services/NeuralGuardService.ts` **dihapus** — angka keamanan 100% acak. StatCard "Uptime Server" → `N/A`.
- `AboutPage` tidak lagi menjanjikan "instant approval".

### Masih perlu ditinjau (BELUM diubah — butuh keputusan user)
- `staticPagesContent.ts:269,276` — halaman `/security` mengklaim **"Arsitektur Zero-Trust"**, **"99.9% uptime SLA"**, dan **"SOC 2 Type II certified infrastructure"**. Klaim sertifikasi/SLA tidak dapat diverifikasi dari kode dan berisiko kalau ditanyakan.
- `productInfoContent.ts:97` — highlight produk PA: **"Instant Approval"** + "Daftar 60 Detik"; `:111` "Garansi perbaikan".

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
- [ ] Merge PR #86 → Vercel auto-deploy v1.50.0
- [ ] `styles.css` ada komentar berisi `*/` yang bikin warning css-syntax-error saat minify (pre-existing, non-blocking)
- [ ] Chunk `index.es-*` (~156KB) + `html2canvas.esm` masih ikut build — audit siapa importer-nya
- [ ] Agent portal: AgentCommission "Total Withdrawn" hardcoded 0 (needs wallet data)
- [ ] Re-enable stat counters homepage when real data is ready
