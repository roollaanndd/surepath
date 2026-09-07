# SurePath Session Context
**Updated:** 2026-09-07 (sesi debug Pathy + Pathy agent ber-tools)

## Current State
- **main:** v1.55.0 live. Branch kerja `claude/pathy-chatbot-debug-offers-igs9g0` membawa **v1.56.0** (Pathy agent) — belum merge.
- `APP_VERSION` di `src/version.ts` = sumber kebenaran; `package.json` 1.40.0 lagging, jangan dipercaya.
- **Edge function `pathy-agent` SUDAH DI-DEPLOY (v2, verify_jwt true)** dan sumbernya diverifikasi identik byte-per-byte dengan repo. Web build-nya belum tayang sampai PR merge → Vercel.
- **PR #100 hijau** (quality-check ✅, unit-tests ✅, Vercel preview ✅), tanpa konflik dan tanpa review thread terbuka — tinggal menunggu review/merge user.
- **`data-gateway` BELUM di-deploy ulang** padahal `actions/misc.ts` berubah (`save_quote` → `quote_data`). Perbaikan sisi klien sudah cukup, tapi deploy tetap disarankan: `supabase functions deploy data-gateway --project-ref uyjgeteelnswphyzkjwi`.

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
- [ ] Chunk `index.es-*` (~156KB) + `html2canvas.esm` masih ikut build — audit siapa importer-nya
- [ ] Agent portal: AgentCommission "Total Withdrawn" hardcoded 0 (needs wallet data)
- [ ] Re-enable stat counters homepage when real data is ready
