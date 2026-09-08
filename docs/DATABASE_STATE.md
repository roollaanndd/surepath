# SurePath — Keadaan Database (Live vs Repo)

> ⚠️ Dokumen ini mencatat fakta penting: **migrasi di repo TIDAK semuanya sudah diapply ke production**.
> Snapshot per 7 Juli 2026 (v1.23.0), project Supabase `uyjgeteelnswphyzkjwi` ("Myinsurepath").

## Notifikasi admin real-time (diperbarui 8 September 2026)

Pendaftaran nasabah & agen memberi kabar ke Telegram **langsung dari database** —
tidak lewat edge function. Trigger `trg_notify_new_user` di `sp_users` memanggil
`notify_admin_telegram()`, yang mem-`POST` ke Telegram Bot API lewat `pg_net`.
Terukur ~40 ms dari INSERT sampai pesan terkirim.

| Tabel | Trigger | Fungsi | Status |
|---|---|---|---|
| `sp_users` | `trg_notify_new_user` | `notify_admin_telegram()` | aktif — nasabah & agen |
| `sp_policy_orders` | `trg_notify_new_order` | `notify_admin_telegram()` | **diperbaiki 8 Sep 2026** — sebelumnya menempel di `sp_policies` (tabel lama) sehingga tidak pernah bunyi |
| `sp_claims` | `trg_notify_new_claim` | `notify_admin_telegram()` | aktif |
| `sp_payments` | `trg_notify_paid_payment` | `notify_paid_payment()` | aktif — ⚠️ masih tanpa penangan error |
| `sp_withdrawals` | `trg_notify_new_withdrawal` | `notify_new_withdrawal()` | aktif — ⚠️ masih tanpa penangan error |

**Konfigurasi** ada di tabel `sp_bot_config` (bukan env edge function):

| Key | Kanal | Isi | Kredensial yang dibutuhkan |
|---|---|---|---|
| `telegram_bot_token` + `telegram_chat_id` | Telegram | token bot `@Surepath_bot` + chat tujuan (angka; negatif untuk grup) | — (sudah di tabel ini) |
| `whatsapp_admin_number` | WhatsApp (Fonnte) | nomor tujuan, format `62…` | `FONNTE_TOKEN` **di Vault** |
| `admin_email` | Email (Resend) | alamat penerima | `RESEND_API_KEY` **di Vault** |
| `webhook_url` | Slack / Discord | URL incoming webhook | — (URL-nya sendiri kredensialnya) |

Slot kosong = kanal mati. Nilai-nilainya **tidak boleh masuk repo**; isi langsung
ke `sp_bot_config`, yang ber-RLS `USING (false)` sehingga tidak terbaca anon
maupun authenticated (hanya service_role dan trigger `SECURITY DEFINER`).

⚠️ **Batas penting:** trigger database hanya bisa membaca **Vault** lewat
`get_app_secret()`, dan **tidak bisa** membaca env edge function. Per 8 Sep 2026
Vault berisi `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `APP_URL`, `OPENROUTER_KEY`,
`XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN` — `FONNTE_TOKEN` dan
`RESEND_API_KEY` hanya ada di env edge function, jadi kanal WhatsApp dan Email
baru menyala setelah token-nya juga ditambahkan ke Vault.

⚠️ **Kenapa hardening itu perlu:** versi lama `notify_admin_telegram()` berjalan
`AFTER INSERT` tanpa penangan error dan melakukan `chat_id::bigint`. Satu nilai
salah ketik di `sp_bot_config` akan membuat **setiap pendaftaran baru gagal**,
bukan sekadar menghilangkan notifikasinya. Sejak `20260908_harden_admin_notifications.sql`
seluruh badan fungsi dibungkus `EXCEPTION` dan cast dijaga regex — sudah diuji
dengan config sengaja dirusak: pendaftaran tetap berhasil.

`notify_paid_payment()` dan `notify_new_withdrawal()` **masih memakai pola lama**
dan keduanya ada di jalur uang. Layak di-hardening dengan pola yang sama.

Definisi lama setiap objek yang diubah disimpan di tabel `sp_db_object_backup`.

---

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

## Tabel + kolom baru (v1.18.0 → v1.23.0)

Ditambahkan oleh rangkaian rilis Operator App + Insurer App + rate limiting. Semua sudah diapply ke production (cek `supabase/migrations/20260707_*.sql`).

### Tabel baru

| Tabel | Versi | Isi | Akses |
|---|---|---|---|
| `sp_agent_agreements` | v1.15.0 | Bukti e-sign perjanjian keagenan (nomor surat, KTP, accepted_at, user-agent) | RLS: agent insert+read miliknya, admin read all, **tidak ada UPDATE/DELETE policy** (immutable) |
| `sp_insurer_activity_log` | v1.23.0 | Audit trail aksi insurer (login, decision, payment, policy upload) — append-only | **deny-all** → hanya service_role insert via gateway; admin read via `admin_list_insurer_activity` |
| `sp_insurer_api_configs` | v1.23.0 | Config integrasi API per-insurer (endpoint, key, headers, updated_by) | **deny-all** → hanya gateway; admin edit via `admin_get_insurer_api_config` / `admin_save_insurer_api_config` |
| `sp_insurer_auth_tokens` | v1.21.0 | Bearer token untuk login Insurer app (token hash, insurer_id, expires_at, last_used_at, revoked_at) | **deny-all** → hanya gateway; admin manage via `admin_list_insurer_tokens` / `admin_generate_insurer_token` / `admin_revoke_insurer_token` |
| `sp_rate_limits` | v1.23.0 | Counter rate-limit per key (`ip:<addr>` / `insurer:<token_id>`), window 1 jam, hit_count + window_start | **deny-all** → hanya service_role via `increment_rate_limit()` RPC |
| `sp_review_tokens` | v1.20.0 | UUID token untuk halaman `/review/:uuid` (7-day expiry, submitted_at, reminder_count, last_reminded_at) | **deny-all** → gateway-only; admin manage via `admin_list_review_tokens` / `admin_send_insurer_review_link` |

### Kolom baru pada tabel existing

| Tabel | Kolom | Versi | Catatan |
|---|---|---|---|
| `sp_users` | `allowed_apps` (`text[]`) | v1.19.0 | Array nama app yang boleh dimasuki user; >1 entry → user mendarat di `/select-app`. Default `{customer}` / `{agent}` / `{admin}` sesuai role |
| `sp_users` | `is_suspended` (`boolean default false`) | v1.18.0 | Operator bisa suspend/unsuspend user; v1.18.1 hotfix menambahkan kolom ini ke production |
| `sp_users` | `is_verified` (`boolean default false`) | v1.18.0 | Agen harus diverifikasi operator sebelum bisa jual; operator approve via `admin_verify_agent` |
| `sp_policy_orders` | `insurer_decision` (`text`) | v1.22.0 | `APPROVED` / `REJECTED` / `REQUEST_INFO` dari insurer |
| `sp_policy_orders` | `insurer_decision_notes` (`text`) | v1.22.0 | Catatan insurer saat decision |
| `sp_policy_orders` | `insurer_decision_at` (`timestamptz`) | v1.22.0 | Waktu decision insurer |
| `sp_policy_orders` | `insurer_review_token_id` (`uuid` FK → `sp_review_tokens`) | v1.22.0 | Link ke review token yang dipakai untuk decision ini |
| `sp_review_tokens` | `reminder_count` (`int default 0`) | v1.22.0 | Counter email pengingat yang sudah dikirim |
| `sp_review_tokens` | `last_reminded_at` (`timestamptz`) | v1.22.0 | Timestamp email pengingat terakhir (anti-spam, 24h cooldown) |
| `sp_insurers` | `pic_email` (`text`) | v1.21.1 | Email PIC insurer — penerima default review-link + reminder |

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

### RPC baru (v1.18.0 → v1.23.0)

| RPC | Versi | Kegunaan |
|---|---|---|
| `increment_rate_limit(p_key text, p_window_seconds int)` | v1.23.0 | SECURITY DEFINER — atomic increment hit_count di `sp_rate_limits`, reset kalau window lewat, return `(hit_count, window_start)`. Gateway memanggil ini sebelum action dijalankan |
| `is_operator()` | v1.18.0 | SECURITY DEFINER — return `true` jika `auth.uid()` punya role `OPERATOR`. Search_path hardened, EXECUTE revoked dari anon |
| `is_staff()` | v1.18.0 | SECURITY DEFINER — return `true` jika role di (`MASTER_ADMIN, ADMIN, FINANCE, FINANCE_MANAGER, FINANCE_DIRECTOR, INSURANCE_ADMIN, OPERATOR`) |
| `notify_new_withdrawal(p_withdrawal_id uuid)` | v1.20.0 | Trigger → insert row baru di `sp_admin_notifications` saat withdrawal request dibuat, supaya operator dapat notifikasi realtime |
| `notify_paid_payment(p_payment_id uuid)` | v1.20.0 | Trigger → insert row baru di `sp_admin_notifications` saat payment PAID, supaya operator + agent dapat notifikasi realtime |
