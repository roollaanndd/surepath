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

### E-Quotation (v1.51.0 — runtime kanonik: edge function `quotations-gateway`)
| Action | Fungsi |
|---|---|
| `save_quotation` (authed) | Snapshot quotation saat PDF digenerate; set `link_expires_at = now()+14 hari` (refresh tiap regenerate) |
| `get_public_quotation` (public) | Muat halaman `/q/{code}`; status jadi `EXPIRED` bila `valid_until` ATAU `link_expires_at` lewat |
| `confirm_public_quotation` (public) | Konfirmasi intent nasabah; 410 bila link kedaluwarsa |

> Client (`services/quotationService.ts`) memanggil **`quotations-gateway` DULU** untuk 3 action ini — data-gateway hanya fallback jaringan, karena bundle data-gateway production dideploy manual dan bisa tertinggal. Jaga `data-gateway/actions/quotations.ts` tetap sinkron dengan `quotations-gateway/index.ts`.

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

### Akun mitra (v2.7.7 — `actions/mitraAccounts.ts`)

Otorisasi **per-kapabilitas**, sengaja BUKAN `caller.isAdmin`. `ADMIN_ROLES`
memuat `OPERATOR`, `FINANCE*`, dan `INSURANCE_ADMIN`; membuat akun mitra dan
menyentuh kredensialnya bukan pekerjaan mereka.

- `CAN_MANAGE_MITRA_ACCOUNT` = `MASTER_ADMIN`, `ADMIN`
- `CAN_SET_MITRA_PASSWORD` = `MASTER_ADMIN`

| Action | Peran | Keterangan |
|---|---|---|
| `admin_create_mitra` | ADMIN, MASTER_ADMIN | Buat pengguna auth **dan** profil `sp_users` dengan id yang sama. `mode: 'invite'` (bawaan) mengirim email undangan; `mode: 'temp'` (MASTER_ADMIN saja) mengembalikan kata sandi sementara. Role dipaksa `AGENT`; nilai bawaan sama dengan cabang AGENT di `ensure_profile`. Gagal menulis profil → pengguna auth dihapus kembali. |
| `admin_send_mitra_reset` | ADMIN, MASTER_ADMIN | Dorong email setel ulang kata sandi lewat `POST /auth/v1/recover` (`redirect_to=…?reset=1`, dibaca `AuthGate`). MASTER_ADMIN juga menerima `recovery_link` sebagai cadangan bila email tidak sampai. Target harus `role = 'AGENT'`. |
| `admin_set_mitra_temp_password` | MASTER_ADMIN | Setel kata sandi sementara, dikembalikan **sekali** di respons. Menyetel `user_metadata.must_change_password`, yang memaksa layar ganti sandi di login berikutnya. Target harus `role = 'AGENT'`. |

**Tidak ada aksi "lihat kata sandi", dan tidak akan ada.** Supabase Auth
menyimpan bcrypt hash; tidak ada jalan dari hash ke teks aslinya. Satu-satunya
cara memenuhinya adalah menyimpan salinan teks terang setiap kata sandi mitra,
yang menjadikan satu kebocoran basis data sebagai kebocoran seluruh kredensial.
`admin_set_mitra_temp_password` adalah penggantinya: secara operasional setara
("saya bisa menolong mitra yang terkunci") tanpa menyimpan apa pun yang bisa
dibaca. Kata sandinya tidak pernah masuk tabel mana pun — `sp_activity_log`
sendiri hanya menyimpan **nama** kunci parameter, bukan nilainya
(`recordActivity` di `index.ts`).

Ketiganya tercatat otomatis di `sp_activity_log` lewat dispatcher; dua aksi
kata sandi juga menulis `sp_admin_notifications` supaya terlihat di lonceng
admin tanpa harus menggali log.

`admin_register_agent` yang lama **hanya** menulis baris `sp_users` tanpa
pengguna auth, jadi mitranya tampil di CMS tapi tidak pernah bisa masuk. Ia
dibiarkan apa adanya untuk pemanggil lama; untuk mitra baru pakai
`admin_create_mitra`.

### Marketing/Sales CRM (v2.6.0 — role `MARKETING`)

Otorisasi di `actions/marketing.ts`. Seorang `MARKETING` hanya melihat agen di
**subtree**-nya (`handler_id` = dirinya, atau handler yang `marketing_parent_id`-nya
dirinya). Batas itu dihitung dari peran yang sudah diverifikasi, **bukan** dari
params — aturan yang sama dengan `agent_id`/`client_id` di modul lain.

`MARKETING` **tidak** ada di `ADMIN_ROLES` maupun `FINANCE_ROLES`.

| Action | Peran | Keterangan |
|---|---|---|
| `marketing_dashboard_summary` | MARKETING, ADMIN | Pipeline per tahap + jumlah mandek >14 hari, follow-up telat, agen tanpa handler |
| `marketing_list_agents` | MARKETING, ADMIN | Agen di subtree + `stage`, `pernah_produksi`, hari sejak order/aktivitas |
| `marketing_agent_detail` | MARKETING, ADMIN | Satu agen + aktivitas + riwayat handler + order. Batas kepemilikan ditegakkan dari `handler_id` baris itu sendiri |
| `marketing_log_activity` | MARKETING | Catat follow-up. `marketing_id` diambil dari pemanggil, bukan params |
| `marketing_list_activities` | MARKETING, ADMIN | `hanya_telat: true` → antrean janji lewat tanggal |
| `marketing_list_unassigned` | MARKETING, ADMIN | Agen tanpa handler, diurutkan umur |
| `marketing_assign_agent` | **ADMIN saja** | Tugaskan/lepas handler. Riwayat ditulis trigger `sp_users_handler_change`, bukan aksi ini |
| `admin_marketing_overview` | ADMIN | Satu baris per marketing: jumlah agen, agen produktif |
| `get_my_handler` | semua user login | Agen membaca pendampingnya sendiri; hanya nama, telepon, foto |

Kolom **angka produksi** (premi, komisi, status bayar) sengaja belum disajikan:
`sp_payments` 0 baris, `sp_commissions` 0 dari 13 tertaut order, `policy_number`
0 dari 5 terisi (21 Okt 2026). Lihat `docs/MARKETING_CRM_PLAN.md` Fase 0.

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
