# SurePath — Arsitektur Sistem

> Peta sistem untuk recall cepat. Terakhir diperbarui: 7 Juli 2026 (v1.23.0).

## Diagram Alur Data

```
┌──────────────────────────────────────────────────────────────┐
│  Klien — 5 portal apps + halaman review publik               │
│  • Customer app   (`/`)            — Supabase Auth (JWT)     │
│  • Agent app      (`/`)            — Supabase Auth (JWT)     │
│  • Operator app   (`/operatorapp`) — Supabase Auth + OPERATOR role (v1.18.0) │
│  • Insurer app    (`/insurerapp`)  — bearer token `sp_insurer_auth_tokens` (v1.21.0) │
│  • Admin CMS      (`/admin`)       — Supabase Auth (admin roles) │
│  • Insurer review (`/review/:uuid`)— token `sp_review_tokens` (7-day, v1.20.0) │
│  • Multi-app selector (`/select-app`) — saat `allowed_apps` >1 (v1.19.0)      │
│  • Web: myinsurepath.com (Vercel, branch main)               │
│  • Android: APK Capacitor (origin https://localhost)         │
│  • Preview: *.vercel.app                                     │
└──────────────┬─────────────────────────────────────────────────┘
               │
     ┌─────────┴──────────────────────────────┐
     │                                        │
     ▼ (anon key, tabel non-sensitif)         ▼ (JWT user / bearer token / review token)
┌──────────────────┐              ┌─────────────────────────┐
│ Supabase PostgREST│             │ Edge Function           │
│ (RLS membatasi)  │             │ data-gateway            │
│ sp_page_views,   │             │ • verifikasi JWT / token│
│ sp_quotes,       │             │ • resolve role sp_users │
│ sp_website_config│             │ • rate-limit check (sp_rate_limits) │
│                  │             │ • audit log insert (sp_insurer_activity_log) │
│                  │             │ • query via service_role│
└──────────────────┘             └───────────┬─────────────┘
                                  ┌───────────┴─────────────┐
                                  │                         │
                                  ▼                         ▼
                      ┌─────────────────────────┐  ┌─────────────────────────┐
                      │ Postgres (tabel sp_*)   │  │ Supabase Realtime       │
                      │ sensitif = deny-all RLS │  │ (since v1.21)           │
                      └─────────────────────────┘  │ • sp_admin_notifications│
                                                   │ • sp_insurer_activity_log│
                                                   └─────────────────────────┘
```

## Frontend (satu codebase, 5 portal apps + halaman review)

| Portal | Entry komponen | Login lewat | Versi |
|---|---|---|---|
| Customer | `components/customer/CustomerPortal.tsx` (via `App.tsx`) | `components/AuthGate.tsx` (Supabase Auth) | awal |
| Agent | `components/agent/AgentPortal.tsx` | `AuthGate.tsx` + onboarding `components/agent/AgentOnboarding.tsx` | awal |
| Operator | `components/operator/OperatorPortal.tsx` (route `/operatorapp`) | `components/operator/OperatorLogin.tsx` — role `OPERATOR` | v1.18.0 |
| Insurer | `components/insurer/InsurerPortal.tsx` (route `/insurerapp`) | `components/insurer/InsurerLogin.tsx` — bearer token di `sp_insurer_auth_tokens` (BUKAN Supabase Auth) | v1.21.0 |
| Admin CMS | `components/admin/AdminPortal.tsx` (route `/admin`) | `components/admin/AdminLogin.tsx` | awal |
| Insurer review (publik) | `components/InsuranceReviewPage.tsx` (route `/review/:uuid`) | token UUID di URL → `sp_review_tokens` (7-day expiry) | v1.20.0 |
| Multi-app selector | `components/AppSelector.tsx` (route `/select-app`) | Supabase Auth + `sp_users.allowed_apps` >1 | v1.19.0 |
| B2B | via `RoleSelectionScreen.tsx` (pasca-OAuth) | Google OAuth | awal |

### 5 portal apps + 3 model auth

1. **Supabase Auth (JWT)** — Customer, Agent, Admin CMS, Operator. JWT diverifikasi di gateway; role diresolve dari `sp_users.role`. Helper `is_admin()`, `is_operator()`, `is_staff()` (semua SECURITY DEFINER, search_path hardened).
2. **Bearer token** — Insurer app. Token di tabel `sp_insurer_auth_tokens` (TTL + last-used-at + revoked flag). Header `Authorization: Bearer <token>`. Tidak ada Supabase Auth untuk insurer.
3. **Single-use review token** — Halaman `/review/:uuid`. Token UUID di path, lookup di `sp_review_tokens`, 7-day expiry, sekali pakai setelah decision disubmit.

Operator + Insurer app berlangganan **Supabase Realtime** ke Postgres changes pada `sp_admin_notifications` + `sp_insurer_activity_log` untuk update UI live tanpa polling.

## Rate Limiting + Activity Logging (v1.23.0)

- **Rate limiting** diterapkan di `data-gateway` sebelum action dijalankan:
  - Per-IP: **60 req/jam** (key = `ip:<addr>`)
  - Per-insurer-token: **200 req/jam** (key = `insurer:<token_id>`)
  - Tracking di tabel `sp_rate_limits`; counter dinaikkan via RPC `increment_rate_limit()` (SECURITY DEFINER, atomic).
  - Jika limit terlewati → HTTP **429 Too Many Requests** + entry di activity log.
- **Activity logging** — setiap aksi insurer (login, decision, payment, policy upload, token refresh) di-append ke `sp_insurer_activity_log` (insert-only, RLS deny-by-default, hanya service_role yang menulis). Admin bisa lihat di Insurer CMS.

- Routing utama & sesi: `App.tsx` (~1000 baris). Sesi disimpan di `localStorage` key `SUREPATH_SESSION`.
- Service layer: `services/supabaseService.ts` (klien Supabase + `callGateway()` + semua query).
- Klien Supabase dibuat dari env `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`.

## Backend (Supabase `uyjgeteelnswphyzkjwi`)

### Edge Functions terpasang (19 functions)
`data-gateway` (inti, lihat `DATA_GATEWAY.md`), `create-xendit-invoice`, `xendit-webhook`, `xendit-disburse`,
`send-otp` / `verify-otp`, `send-whatsapp`, `submit-policy-insurer`, `ocr-scan`, `stnk-ocr`,
`notify-admin`, `ai-policy-review`, `ai-finance-review`, `ai-proxy`, `daily-report`, `send-insurer-email`,
`insurer-reminder-cron` (scheduled, v1.22.0 — jalannya tiap 4 jam via Supabase Cron `0 */4 * * *`, gated oleh secret `CRON_SECRET`).

### Prinsip keamanan
- Tabel sensitif (`sp_users`, `sp_policy_orders`, `sp_payments`, `sp_claims`, dll) → **hanya** lewat data-gateway.
- Gateway memverifikasi JWT (Supabase Auth apps) atau bearer token (Insurer app) atau review token (`/review/:uuid`), lalu menjalankan query dengan `service_role` dan otorisasi per-baris di kode.
- Role admin: `MASTER_ADMIN, ADMIN, FINANCE, FINANCE_MANAGER, FINANCE_DIRECTOR, INSURANCE_ADMIN, OPERATOR` (v1.18.0).
- Rate limiting (v1.23.0): 60 req/jam per IP, 200 req/jam per insurer-token, via `sp_rate_limits` + `increment_rate_limit()`.
- Activity logging (v1.23.0): setiap aksi insurer di-insert ke `sp_insurer_activity_log` (append-only).

## Deployment Surface

| Apa | Di mana | Cara update |
|---|---|---|
| Web production | Vercel project `myinsurepath` | merge ke `main` → auto deploy |
| Edge functions | Supabase | `supabase functions deploy <nama>` (MANUAL) |
| Skema DB | Supabase | migrasi di `supabase/migrations/` — **tidak semua sudah diapply** (lihat `DATABASE_STATE.md`) |
| APK Android | Play Store / sideload | `npm run build && npx cap sync android` lalu build di Android Studio |
