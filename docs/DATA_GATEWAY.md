# SurePath — Data Gateway (Edge Function)

> Referensi `supabase/functions/data-gateway/index.ts`. Versi deploy saat ini: **v11** (15 Juni 2026).

## Konsep

Browser/APK TIDAK boleh menyentuh tabel sensitif dengan anon key. Semua lewat:

```
klien ──(POST + Bearer <JWT user>)──▶ /functions/v1/data-gateway ──(service_role)──▶ Postgres
```

- Body: `{ "action": "<nama>", "params": { ... } }` → respons `{ data }` atau `{ error }`.
- Klien JS: `callGateway(action, params)` di `services/supabaseService.ts` (otomatis melampirkan access token sesi).
- `verify_jwt: true` di level platform; di dalam fungsi JWT diverifikasi lagi via `auth.getUser()`.
- Identitas caller di-resolve dari `sp_users` dengan `id.eq(authId) OR email.eq(email)`.

## CORS

Origin yang diizinkan:
- `https://myinsurepath.com`, `https://www.myinsurepath.com`
- `https://*.vercel.app` (preview)
- `http(s)://localhost[:port]` — dev server **dan WebView Capacitor Android**
- `capacitor://localhost` — iOS custom scheme

## Daftar Action

### Self-service (semua user login)
| Action | Fungsi |
|---|---|
| `ensure_profile` | Ambil profil sendiri; buat dari identitas JWT + metadata jika belum ada (role hanya CUSTOMER/AGENT; agent mulai unverified) |
| `get_my_profile` | Profil sendiri (404 jika belum ada) |
| `get_user_profile` | Profil by id (self, atau admin untuk siapa pun) |
| `update_my_profile` | Update field aman (name, phone, address, foto, KTP doc) |
| `list_my_clients` | Klien milik agent sendiri |
| `get_agent_stats` | Komisi/klien/polis agent sendiri |
| `get_leaderboard` | Top 10 agent bulan ini |
| `redeem_coins` | Tukar koin (cek saldo server-side) |
| `create_policy_order` | Buat order — `agent_id` SELALU di-set dari caller, tidak pernah dari klien |
| `get_my_orders` / `get_my_claims` / `get_my_payments` | Data customer sendiri (scoped client_id / user_id / order milik sendiri) |
| `cancel_my_order` | Batalkan order sendiri (status SUBMITTED/UNDER_REVIEW); kepemilikan diverifikasi server-side via `client_id` |

### Admin-only (role di ADMIN_ROLES)
`admin_list_users`, `admin_get_user`, `admin_update_user`, `admin_register_agent`,
`admin_invite_user` (khusus MASTER_ADMIN), `admin_list_clients`, `admin_list_claims`,
`admin_update_claim`, `admin_list_policies`, `admin_list_orders`, `admin_update_order`
(+INSURER), `admin_list_payments`, `admin_list_withdrawals`, `admin_approve_withdrawal`
(3 level: ≥10jt→L2, ≥25jt→L3), `admin_reject_withdrawal` (reversal wallet via RPC),
`award_coins`, `admin_stats`, `admin_transaksi_overview`, `admin_financial_reports`,
`admin_financial_detail`, `admin_analytics_data`, `admin_list_commissions`,
`admin_update_commission`, `admin_list_notifications`, `admin_mark_notification_read`,
`admin_create_notification`, `admin_security_stats`, `admin_traffic_stats`.

## Cara Deploy (PENTING — tidak otomatis!)

Edge function TIDAK ikut auto-deploy Vercel. Setelah mengubah `supabase/functions/data-gateway/index.ts`:

```bash
supabase functions deploy data-gateway --project-ref uyjgeteelnswphyzkjwi
```

atau lewat Supabase Dashboard → Edge Functions → data-gateway → paste & deploy.

## Riwayat versi deploy
- v3 (awal Juni 2026): set action awal.
- v4 (10 Juni 2026): + `ensure_profile`, + CORS `https://localhost` & `capacitor://localhost`.
- v8 (13 Juni 2026): + `admin_transaksi_overview`, `admin_financial_detail`, `admin_analytics_data`, `admin_list_commissions`, `admin_update_commission`, `admin_security_stats`, `admin_traffic_stats`.
- v11 (15 Juni 2026): + `cancel_my_order` (customer self-service order cancellation, ownership enforced server-side).
