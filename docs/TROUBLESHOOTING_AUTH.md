# SurePath — Troubleshooting Auth (+ Insiden 10 Juni 2026)

> Catatan investigasi agar masalah serupa cepat didiagnosis.

## Insiden: "login dan register error di customer apps dan agents app"

### Akar masalah yang ditemukan (semua sudah diperbaiki — PR #3)

1. **Registrasi agent tidak pernah bisa berhasil.**
   `AgentOnboarding.tsx` mengumpulkan password tapi tidak pernah memanggil
   `supabase.auth.signUp`. Ia memanggil action gateway `admin_register_agent` —
   yang butuh sesi aktif DAN role admin. Pendaftar baru tidak punya keduanya →
   selalu "Pendaftaran gagal".
2. **CORS gateway memblokir aplikasi Android.** Origin WebView Capacitor =
   `https://localhost`, gateway hanya mengizinkan `http://localhost`. Akibatnya
   resolusi profil pasca-login gagal → agent jatuh ke sesi CUSTOMER.
3. **Upsert profil customer langsung dari browser** — rapuh, dan 4 akun lama
   ternyata tidak punya baris `sp_users` sama sekali (sudah di-backfill).

### Solusi yang dipasang
- Action gateway baru `ensure_profile` (buat profil dari identitas JWT; self-heal saat login).
- CORS + `https://localhost`, `capacitor://localhost` (gateway v4).
- `AgentOnboarding` melakukan signUp sungguhan; `AuthGate` & `RoleSelectionScreen` pakai `ensure_profile`.

## Playbook debug masalah auth

### 1. Tentukan lapisan yang gagal
| Gejala | Lapisan | Cek |
|---|---|---|
| "Email atau password salah" | Supabase Auth | normal — kredensial |
| "Database error saving new user" saat signup | Trigger `handle_new_user` → tabel `profiles` (milik app lain!) | `select * from pg_trigger where tgrelid='auth.users'::regclass` |
| Login sukses tapi role salah / data kosong | data-gateway (CORS/aksi/profil) | Network tab: panggilan `/functions/v1/data-gateway` |
| Hanya error di APK, web normal | CORS gateway / bundle APK lama | origin `https://localhost`; rebuild APK |
| "Pendaftaran gagal" agent | gateway `ensure_profile` | respons action di Network tab |

### 2. Query diagnosa cepat (SQL editor Supabase)
```sql
-- akun auth vs profil
select u.email, u.created_at, u.last_sign_in_at,
       (s.id is not null) as punya_profil, s.role
from auth.users u
left join public.sp_users s on s.id = u.id or lower(s.email) = lower(u.email)
order by u.created_at desc;

-- policy RLS sebuah tabel
select polname, polcmd from pg_policy where polrelid = 'public.sp_users'::regclass;
```

### 3. Log
- Supabase Dashboard → Logs → `auth` / `edge-function` / `postgres`.
- Error `permission denied for table X` = masalah **GRANT** (bukan RLS) — cek
  `information_schema.role_table_grants` untuk role `anon`/`authenticated`.

### 4. Jebakan yang pernah memakan waktu
- Project Supabase di-share dengan app lain (tabel `profiles`, function renungan) —
  jangan salah menyimpulkan kepemilikan objek.
- Folder `supabase/migrations/` ≠ keadaan live DB (lihat `DATABASE_STATE.md`).
- Edge function tidak auto-deploy dari git — versi yang jalan bisa beda dari repo
  (bandingkan via dashboard atau MCP `get_edge_function`).
- `sp_users.id` lama bisa ≠ auth id (linked by email) — gateway sudah menangani.
- Error TypeScript `npm run lint` banyak yang lama/pre-existing; Vite tetap build,
  jadi error TS bukan bukti penyebab bug runtime.
