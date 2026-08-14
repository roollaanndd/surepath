# SurePath Session Context
**Updated:** 2026-08-12 (sesi Public API)

## Current State
- **Branch kerja:** `claude/api-setup-ykvvct` — v1.55.0 Public API (partner-api + insurer-api + spec OpenAPI)
- **main:** v1.54.0 (SEO audit). `APP_VERSION` di `src/version.ts` = sumber kebenaran; `package.json` (1.40.0) lagging, jangan dipercaya.
- **Quality gate:** tsc clean ✅ · build ✅ · 83/83 unit test pass ✅ · eslint 2 error **pre-existing** (`services/website.ts:422`, `src/pages/site/SiteLayout.tsx:321`) — sudah diverifikasi ada di tree bersih, bukan dari perubahan ini.

## v1.55.0 — Public API (2026-08-12)

Menjalankan item P0 `docs/PRD.md` / no.15 `docs/ROADMAP.md` ("Embedded insurance API B2B2C").

### Yang dibangun
| Surface | Fungsi | Auth |
|---|---|---|
| Partner API | `supabase/functions/partner-api` | API key `sp_live_…` |
| Insurer API | `supabase/functions/insurer-api` | API key `ins_live_…` |
| Data Gateway | (existing) | Supabase JWT — sekarang punya spec |

- Runtime bersama: `supabase/functions/_shared/apiRuntime.ts` (auth key, scope, router, error envelope, rate limit, idempotency, log, webhook delivery + HMAC).
- Rating server-side: `supabase/functions/_shared/ojkRating.ts` — port Deno dari `services/ojkRates.ts`, baca `sp_ojk_rate_sets` aktif, fallback ke tabel seed.
- Spec: `docs/openapi/{partner-api,insurer-api,data-gateway}.yaml` (OpenAPI 3.1, $ref semua resolve). Panduan: `docs/PUBLIC_API.md`.

### Keputusan desain yang penting diingat
- **Harga selalu server-side.** Tidak ada field di API mana pun yang bisa dipakai caller menetapkan premi. `POST /v1/orders` **re-pricing dari input quote tersimpan**, bukan dari premi cache di baris `sp_quotations`.
- **PARTNER key punya `agent_id`** → order ditulis dengan agent_id itu, jadi komisi/wallet/tier jalan tanpa special-case. Komisi ikut aturan `create_policy_order` (rate produk insurer → override rate agen → cap 30%).
- **INSURER key punya `insurer_id`**, diambil dari key, tidak pernah dari request. Tidak ada parameter yang memilih insurer lain.
- **Key manajemen ditaruh di `partner-api/admin/v1/keys`** (Supabase JWT + admin), BUKAN di data-gateway — supaya fitur ini deployable tanpa menyentuh bundle gateway yang stale.
- **Webhook di-enqueue trigger DB**, bukan kode aplikasi → perubahan lewat jalur mana pun (UI operator, dashboard insurer, xendit-webhook, API) menghasilkan event sama. Fungsi enqueue menelan exception-nya sendiri supaya tidak pernah me-rollback write payment. **xendit-webhook tidak disentuh sama sekali** — sengaja, jalur uang tidak diutak-atik.
- Kedua fungsi **tidak mengeluarkan header CORS** — kredensial server-to-server.
- Rate limiter **fail-closed**.
- **Deploy wajib `--no-verify-jwt`** untuk keduanya (autentikasi di dalam kode). Workflow sudah diupdate.

### ⚠️ TEMUAN PENTING — bug production pre-existing di jalur pembayaran
`audit_critical_update()` dipasang di `sp_policy_orders` DAN `sp_payments`, tapi dereference `OLD.total_premium` / `OLD.commission_amount` / `OLD.discount_amount` tanpa syarat. `sp_payments` tidak punya kolom itu → PL/pgSQL runtime error `42703` → **setiap UPDATE ke `sp_payments` gagal**. INSERT aman (trigger UPDATE-only). Artinya `xendit-webhook` tidak bisa menandai payment PAID → order tidak maju, komisi agen tidak dikredit. Belum ketahuan karena `sp_payments` masih 0 baris.
- **BUKAN** disebabkan perubahan v1.55.0 — ditemukan olehnya.
- Fix siap tapi **BELUM diapply**: `supabase/migrations/20260812_fix_audit_critical_update.sql`. Ada di jalur uang → butuh review + idealnya tes bayar sungguhan sebelum diapply.
- Efek ke Public API: event `payment.paid` tidak akan pernah terbit sampai ini diperbaiki.

### Status deploy
- Migrasi `20260812_public_api.sql` → **SUDAH diapply ke production** (via MCP `apply_migration`, nama `public_api_keys_and_webhooks`).
- Edge function `partner-api` + `insurer-api` → **BELUM ter-deploy**. Workflow `deploy-edge-functions.yml` sudah di-dispatch di branch ini tapi step deploy **skipped**: repo secret `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` belum diset (guard-nya no-op). Sandbox ini tidak bisa deploy manual: egress ke `*.supabase.co` dan `api.supabase.com` diblokir proxy (CONNECT 403), jadi hasil deploy juga tidak bisa di-smoke-test dari sini.
- **Cara menyelesaikan:** set kedua secret itu di Settings → Secrets → Actions, lalu jalankan workflow "Deploy Edge Functions" (`functions: partner-api insurer-api`). Atau manual: `supabase functions deploy partner-api --project-ref uyjgeteelnswphyzkjwi --no-verify-jwt` (idem `insurer-api`). **`--no-verify-jwt` wajib.**

### Catatan teknis
- `sp_policy_orders` **tidak punya** kolom `client_email`, `agent_code`, `promo_code` di production (walau `create_policy_order` di repo mengirimnya). `zone` + `vehicle_category` NOT NULL tanpa default — partner-api mengisi keduanya.
- Tabel tarif seed terduplikasi (browser vs edge). Dikunci oleh test baru `services/__tests__/ojkRatingParity.test.ts` (11 test): ubah satu file tanpa yang lain → merah.
- Bundling edge function utk deploy manual: `npx esbuild supabase/functions/<fn>/index.ts --bundle --format=esm --platform=neutral --external:npm:*`. Typecheck Deno: tsconfig ad-hoc + shim `Deno` (lihat scratchpad sesi ini) — `supabase/functions/` di luar tsconfig/eslint repo.
- **Catatan sandbox:** egress memblokir `myinsurepath.com:443`; QA live harus lewat build lokal.

## Backlog
- [ ] **Sandbox terpisah** — `environment: "test"` tersimpan di key tapi memakai DB yang sama dengan live
- [ ] `sp_api_gc()` belum dijadwalkan ke cron (retensi idempotency/log/delivery)
- [ ] Public API baru produk motor (CAR + MOTORCYCLE); Travel/PA/MPAR belum diekspos
- [ ] Belum ada renewal/endorsement lewat API
- [ ] UI Admin CMS untuk kelola API key (saat ini hanya lewat route admin `partner-api`)
- [ ] `styles.css` komentar berisi `*/` bikin warning css-syntax-error saat minify (pre-existing)
- [ ] Chunk `index.es-*` (~156KB) + `html2canvas.esm` masih ikut build — audit importer-nya
- [ ] Agent portal: AgentCommission "Total Withdrawn" hardcoded 0
- [ ] 2 error eslint pre-existing di `services/website.ts` + `src/pages/site/SiteLayout.tsx`

## Demo Accounts (Supabase project `uyjgeteelnswphyzkjwi`)
| Role | Email | Password |
|------|-------|----------|
| Customer | demo.customer@myinsurepath.com | Demo1234! |
| Agent | demo.agent@myinsurepath.com | Demo1234! |
| Admin | demo.admin@myinsurepath.com | Demo1234! |
