# SurePath — Alur Autentikasi & Registrasi

> Terakhir diperbarui: 10 Juni 2026 (setelah perbaikan besar auth — PR #3).

## Identitas: dua lapisan

1. **Supabase Auth** (`auth.users`) — akun login (email+password, Google OAuth, OTP email).
2. **Profil SurePath** (`public.sp_users`) — nama, role, agent_code, trust_score, dll.

Keduanya dihubungkan oleh action gateway **`ensure_profile`**: membuat baris `sp_users`
dari identitas JWT terverifikasi (id & email dari token, name/phone/role dari signup metadata)
jika belum ada. Idempoten — aman dipanggil berulang.

⚠️ Akun lama (admin `angkouw84@gmail.com`, agent `angkouw777@gmail.com`) punya `sp_users.id`
yang BERBEDA dari auth id; gateway mencocokkan `id.eq OR email.eq` sehingga tetap jalan.
Jangan "merapikan" id ini — `sp_clients`, `sp_commissions`, dll mereferensikan id lama.

## Alur per skenario

### 1. Registrasi Customer (`AuthGate.tsx` → `handleRegister`)
1. `supabase.auth.signUp(email, password, { data: { name, role: 'CUSTOMER' } })`
2. Jika ada sesi langsung (autoconfirm aktif) → `resolveAndLogin` → `ensure_profile` membuat profil.
3. Jika butuh konfirmasi email → layar CHECK_EMAIL; profil dibuat oleh `ensure_profile`
   saat login pertama (metadata role/nama ikut di token).

### 2. Registrasi Agent (`AgentOnboarding.tsx`)
1. Step 1: nama/email/HP/password → Step 2: KTP/alamat (opsional) + persetujuan.
2. `supabase.auth.signUp` dengan metadata `{ name, phone, role: 'AGENT', ktp, address }`.
3. Ada sesi → `ensure_profile({ role: 'AGENT', ... })` → profil agent dibuat
   (`verified=false`, `commission_rate=0.1`, `agent_code` SP-AGT-XXXX) → langsung masuk.
4. Tanpa sesi → layar "Cek Email"; profil dibuat saat login pertama.
5. Agent baru harus **diverifikasi admin** sebelum dianggap aktif penuh.

### 3. Login email+password (`AuthGate.tsx` → `handleLogin`)
1. `signInWithPassword` → `resolveAndLogin` → `buildUserObj`.
2. `buildUserObj` memanggil `ensure_profile()` (tanpa parameter; fallback ke metadata token).
3. Profil ada → objek user dengan role asli. Profil gagal dibuat → fallback CUSTOMER generik.

### 4. Google OAuth
1. `signInWithOAuth({ provider: 'google' })` — redirect ke origin (web) atau
   `com.myinsurepath.os://auth-callback` (native).
2. `App.tsx` (startup) menangkap sesi → cari profil. Tidak ada profil →
   `RoleSelectionScreen` → user pilih role → `ensure_profile({ role, phone, name })`
   (B2B masih lewat `createB2BClientProfile`).

### 5. OTP Email / Magic Link & Reset Password
- Ditangani di `AuthGate.tsx`: `signInWithOtp` (shouldCreateUser=false), `verifyOtp`,
  `resetPasswordForEmail` + mode `RESET_PASSWORD` via event `PASSWORD_RECOVERY`.

### 6. Login Admin (`components/admin/AdminLogin.tsx`)
- Supabase Auth dulu, fallback legacy IndexedDB (`db.users`) untuk akun lama.
- Validasi role harus salah satu ADMIN_ROLES.

## Riwayat bug yang sudah diperbaiki (PR #3, 10 Juni 2026)

| Bug | Akar masalah | Fix |
|---|---|---|
| Registrasi agent selalu gagal | Tidak pernah `signUp`; memanggil `admin_register_agent` (butuh admin + sesi) | signUp asli + `ensure_profile` |
| OAuth pilih role AGENT gagal | Sama — action admin-only | `ensure_profile` |
| Agent login di APK jadi CUSTOMER | CORS gateway menolak origin `https://localhost` | Izinkan `https://localhost` & `capacitor://localhost` |
| Profil customer kadang tidak tersimpan | Upsert `sp_users` langsung dari browser (rapuh terhadap RLS) | Dihapus; diganti `ensure_profile` server-side |
| 4 akun lama tanpa profil | Sisa bug lama | Backfill manual ke `sp_users` (10 Juni 2026) |
