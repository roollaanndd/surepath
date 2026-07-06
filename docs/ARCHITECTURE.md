# SurePath — Arsitektur Sistem

> Peta sistem untuk recall cepat. Terakhir diperbarui: 10 Juni 2026.

## Diagram Alur Data

```
┌─────────────────────────────────────────────────────────┐
│  Klien                                                  │
│  • Web: myinsurepath.com (Vercel, branch main)          │
│  • Android: APK Capacitor (origin https://localhost)    │
│  • Preview: *.vercel.app                                │
└──────────────┬──────────────────────────────────────────┘
               │
     ┌─────────┴──────────────────────────────┐
     │                                        │
     ▼ (anon key, tabel non-sensitif)         ▼ (JWT user)
┌──────────────────┐              ┌─────────────────────────┐
│ Supabase PostgREST│             │ Edge Function           │
│ (RLS membatasi)  │              │ data-gateway            │
│ sp_page_views,   │              │ • verifikasi JWT        │
│ sp_quotes,       │              │ • resolve role sp_users │
│ sp_website_config│              │ • query via service_role│
└──────────────────┘              └───────────┬─────────────┘
                                              │
                                              ▼
                                  ┌─────────────────────────┐
                                  │ Postgres (tabel sp_*)   │
                                  │ sensitif = deny-all RLS │
                                  └─────────────────────────┘
```

## Frontend (satu codebase, 4 portal)

| Portal | Entry komponen | Login lewat |
|---|---|---|
| Customer | `components/CustomerPortal.tsx` (via `App.tsx`) | `components/AuthGate.tsx` |
| Agent | `components/agent/AgentPortal.tsx` | `AuthGate.tsx` + onboarding `components/agent/AgentOnboarding.tsx` |
| Admin | `components/admin/AdminPortal.tsx` | `components/admin/AdminLogin.tsx` |
| B2B | via `RoleSelectionScreen.tsx` (pasca-OAuth) | Google OAuth |

- Routing utama & sesi: `App.tsx` (~1000 baris). Sesi disimpan di `localStorage` key `SUREPATH_SESSION`.
- Service layer: `services/supabaseService.ts` (klien Supabase + `callGateway()` + semua query).
- Klien Supabase dibuat dari env `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`.

## Backend (Supabase `uyjgeteelnswphyzkjwi`)

### Edge Functions terpasang (18 functions)
`data-gateway` (inti, lihat `DATA_GATEWAY.md`), `create-xendit-invoice`, `xendit-webhook`, `xendit-disburse`,
`send-otp` / `verify-otp`, `send-whatsapp`, `submit-policy-insurer`, `ocr-scan`, `stnk-ocr`,
`notify-admin`, `ai-policy-review`, `ai-finance-review`, `ai-proxy`, `daily-report`, `send-insurer-email`.

### Prinsip keamanan
- Tabel sensitif (`sp_users`, `sp_policy_orders`, `sp_payments`, `sp_claims`, dll) → **hanya** lewat data-gateway.
- Gateway memverifikasi JWT, lalu menjalankan query dengan `service_role` dan otorisasi per-baris di kode.
- Role admin: `MASTER_ADMIN, ADMIN, FINANCE, FINANCE_MANAGER, FINANCE_DIRECTOR, INSURANCE_ADMIN`.

## Deployment Surface

| Apa | Di mana | Cara update |
|---|---|---|
| Web production | Vercel project `myinsurepath` | merge ke `main` → auto deploy |
| Edge functions | Supabase | `supabase functions deploy <nama>` (MANUAL) |
| Skema DB | Supabase | migrasi di `supabase/migrations/` — **tidak semua sudah diapply** (lihat `DATABASE_STATE.md`) |
| APK Android | Play Store / sideload | `npm run build && npx cap sync android` lalu build di Android Studio |
