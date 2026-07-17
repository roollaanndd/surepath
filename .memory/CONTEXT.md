# SurePath Session Context
**Updated:** 2026-07-17 (sesi QR e-quotation)

## Current State
- **Branch kerja:** `claude/claude-md-docs-oq5okn` — PR #86 berisi CLAUDE.md + perf v1.50.0 + QR e-quotation fix v1.51.0 (user minta merge ke main + deploy)

## v1.51.0 — QR E-Quotation Fix (2026-07-17)
- **Akar masalah "QR ke apps":** redirect pasca-login di App.tsx (`handleAuthSuccess` → `navigate(rolePath)`) membajak `/q/{code}`; kini di-guard via `isPublicStandalonePath` (`/q/`, `/review/`, `/payment/`)
- **14 hari:** `sp_quotations.link_expires_at` default `now()+14d` — migrasi `20260717_quotation_link_expiry.sql` SUDAH diapply production, row lama di-backfill
- **`quotations-gateway` = runtime kanonik** (v2 deployed, verify_jwt=false) — client memanggil bridge DULU; data-gateway hanya fallback. PENTING: bundle data-gateway production (v3, minified single-file) BELUM di-redeploy — modul quotations di dalamnya stale tapi tidak dipakai client; kalau nanti redeploy data-gateway, bundle dgn `npx esbuild supabase/functions/data-gateway/index.ts --bundle --format=esm --platform=neutral --external:npm:* --minify` lalu deploy single file
- PDF QR fallback diperkuat: pakai `eQuoteCode` sebelum jatuh ke homepage
- **main:** v1.49.0 (APP_VERSION di `src/version.ts`; package.json 1.40.0 — lagging, jangan dipercaya)
- **Build:** passing ✅ — tsc clean, 72/72 unit test pass
- **Catatan sandbox:** egress policy memblokir `myinsurepath.com:443` — speed test/QA live harus lewat build lokal (`vite build` + `vite preview` + Lighthouse dgn chromium `/opt/pw-browsers`); `.env.development` TIDAK terbaca `vite build` (production mode) — export env dulu

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
