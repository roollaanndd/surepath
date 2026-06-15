# SurePath — Keadaan Database (Live vs Repo)

> ⚠️ Dokumen ini mencatat fakta penting: **migrasi di repo TIDAK semuanya sudah diapply ke production**.
> Snapshot per 15 Juni 2026, project Supabase `uyjgeteelnswphyzkjwi` ("Myinsurepath").

## Tabel inti (prefix `sp_`)

| Tabel | Isi | Akses dari klien |
|---|---|---|
| `sp_users` | Profil semua role (customer/agent/admin/b2b) | Masih ada policy terbuka `sp_users_open` (lihat catatan RLS) — target: gateway only |
| `sp_clients` | Klien milik agent | policy `sp_clients_open` masih aktif |
| `sp_policy_orders` | Order polis | **deny-all** → hanya gateway |
| `sp_payments` | Pembayaran (Xendit) | **deny-all** → hanya gateway |
| `sp_claims` | Klaim | **deny-all** → hanya gateway |
| `sp_commissions` | Komisi agent | policy terbuka masih aktif |
| `sp_coin_ledger` | Ledger koin reward | policy terbuka masih aktif |
| `sp_user_sessions` | Heartbeat sesi | policy "allow all" masih aktif |
| `sp_page_views` | Analytics halaman | anon insert + auth select (tapi lihat catatan grants!) |
| `sp_quotes`, `sp_product_configs`, `sp_website_config` | Quote publik, harga, CMS landing | publik/terbuka |
| `sp_withdrawals`, `sp_wallet_transactions` | Penarikan & wallet agent | via gateway / RPC |

## Status RLS live (per 15 Juni 2026)

- **17 scoped policies** applied via migration `rls_clear_policies_and_demo_passwords` (11 Juni 2026).
- `is_admin()` SECURITY DEFINER helper — dipakai di policy yang gate admin-only rows.
- `sp_policy_orders`, `sp_payments`, `sp_claims` → deny-all, hanya lewat data-gateway service_role.
- `sp_agent_wallets`, `sp_wallet_transactions` → hanya via `credit_agent_wallet()` + `request_withdrawal_deduct()` SECURITY DEFINER RPC.
- ~~`sp_users_open` / `sp_clients_open` / `sp_commissions_open`~~ → sudah diganti policy scoped.
- `sp_user_sessions` → allow all (intentional, untuk heartbeat sesi).
- Error `permission denied for table sp_page_views` → belum diperbaiki, analytics anonim mungkin tidak tercatat.

## Hal yang dimiliki aplikasi LAIN di project yang sama

- Tabel `public.profiles` + trigger `on_auth_user_created` → `handle_new_user()` di
  `auth.users` (mengisi `profiles` setiap signup — milik app lain, JANGAN dihapus
  sembarangan; kalau rusak, semua signup gagal dengan "Database error saving new user").
- Edge functions `generate-daily-renungan`, `backup-daily`.

## Linkage auth.users ↔ sp_users

- Aturan baru: `sp_users.id = auth.users.id` (dibuat `ensure_profile`).
- Pengecualian lama (link via email, id beda — JANGAN diubah karena FK):
  - `angkouw84@gmail.com` → sp_users id `033f1b20-...` (MASTER_ADMIN)
  - `angkouw777@gmail.com` → sp_users id `69c6670c-...` (AGENT)
- Backfill 10 Juni 2026: dibuatkan profil CUSTOMER untuk `testaja@gmail.com`,
  `angkouw888@gmail.com`, `ngetes@tes.com`, `amifebrina24@gmail.com`.

## RPC / fungsi penting
- `increment_coins_balance` (EXECUTE dicabut dari anon/authenticated — hanya service_role)
- `reverse_withdrawal` (reversal saat penarikan ditolak)
- `handle_new_user` (trigger milik app lain)
