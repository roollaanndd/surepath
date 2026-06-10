# SurePath — Project Recall (Indeks Cepat)

> Dokumen indeks untuk mengingat kembali konteks project dengan cepat.
> Terakhir diperbarui: 10 Juni 2026.

## Apa itu SurePath?

Platform insurtech Indonesia (myinsurepath.com): jual asuransi mobil, jiwa, travel, PA, properti.
Satu codebase React melayani 4 "aplikasi": **Customer**, **Agent**, **Admin**, **B2B** — plus aplikasi Android (Capacitor) yang membungkus web yang sama.

## Stack Inti

| Layer | Teknologi | Catatan |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind | SPA, entry `App.tsx`, komponen di `components/` |
| Mobile | Capacitor 8 (`com.myinsurepath.os`) | Bundle web lokal di APK, folder `android/` |
| Backend | Supabase (project `uyjgeteelnswphyzkjwi`, region ap-southeast-1) | Auth, Postgres, Edge Functions, Storage |
| API aman | Edge Function **data-gateway** | Semua tabel sensitif lewat sini (service_role) |
| Hosting web | Vercel — project **myinsurepath** (production) & **surepath** | Auto-deploy dari branch `main` |
| Payment | Xendit (invoice + disburse + webhook) | Edge functions `create-xendit-invoice`, dll |

## Dokumen Terkait (folder `docs/`)

| File | Isi |
|---|---|
| `ARCHITECTURE.md` | Peta arsitektur lengkap + alur data |
| `AUTH_FLOW.md` | Alur login/registrasi semua role + perbaikan Juni 2026 |
| `DATA_GATEWAY.md` | Referensi semua action gateway + cara deploy |
| `DATABASE_STATE.md` | Keadaan live database, RLS, dan perbedaan dengan migrasi repo |
| `DEPLOYMENT.md` | Cara deploy web, edge function, dan APK Android |
| `TROUBLESHOOTING_AUTH.md` | Insiden auth 10 Juni 2026 + cara debug masalah serupa |
| `PRD.md`, `TECHNICAL_SPEC.md`, `ROADMAP.md` | Dokumen produk lama |
| `SECURITY_POLICY.md`, `REMEDIATION_CHECKLIST.md` | Keamanan & checklist perbaikan |

## Fakta Penting yang Sering Dilupakan

1. **Supabase project di-share** dengan aplikasi lain (ada tabel `profiles` + trigger `handle_new_user` di `auth.users`, juga edge function `generate-daily-renungan` yang bukan milik SurePath).
2. **Tabel SurePath berprefix `sp_`** (`sp_users`, `sp_clients`, `sp_policy_orders`, dst).
3. **`sp_users.id` tidak selalu = auth id** untuk akun lama (admin & 1 agent terhubung lewat email). Gateway mencocokkan `id OR email`.
4. **Aplikasi Android origin-nya `https://localhost`** — CORS gateway harus mengizinkan ini (sudah, sejak gateway v4).
5. **Profil user dibuat otomatis** lewat action gateway `ensure_profile` saat registrasi/login pertama (sejak fix Juni 2026).
6. **Edge function TIDAK auto-deploy dari git** — harus deploy manual (`supabase functions deploy <nama>`), berbeda dengan web yang auto-deploy via Vercel.
7. APK Android **membundel web sendiri** — perubahan frontend butuh rebuild APK, tidak otomatis seperti web.
