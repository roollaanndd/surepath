# SurePath — Alur Autentikasi & Registrasi

> Terakhir diperbarui: 7 September 2026 (v1.57.0 — tipe akun wajib dipilih, tidak pernah diasumsikan).

## Identitas: dua lapisan

1. **Supabase Auth** (`auth.users`) — akun login (email+password, Google OAuth, OTP email).
2. **Profil SurePath** (`public.sp_users`) — nama, role, agent_code, trust_score, dll.

Keduanya dihubungkan oleh action gateway **`ensure_profile`**: membuat baris `sp_users`
dari identitas JWT terverifikasi (id & email dari token, name/phone/role dari signup metadata)
jika belum ada. Idempoten — aman dipanggil berulang.

### ⚠️ Aturan tipe akun (v1.57.0)

**`ensure_profile` tidak akan pernah membuat profil tanpa role yang dinyatakan.** Dulu ia
jatuh ke `'CUSTOMER'` ketika pemanggil maupun metadata signup tidak menyebut role — dan
`AuthGate.buildUserObj` memang memanggilnya tanpa argumen. Akibatnya setiap pendaftar baru
yang tidak membawa role (Google OAuth, dan alur apa pun tanpa metadata signup) diam-diam
dijadikan nasabah **sebelum** layar pemilihan tipe akun sempat tampil. Kini pemanggilan
tanpa role dijawab **409 `ROLE_REQUIRED`** dan tidak ada baris yang ditulis.

Satu-satunya sumber role saat pembuatan profil:
1. `params.role` — dipilih pengguna di `RoleSelectionScreen` atau `AgentOnboarding`, atau
2. `user_metadata.role` — ditanam saat `signUp`, sehingga pilihan bertahan melewati
   konfirmasi email (bahkan di perangkat lain).

Role juga **immutable** lewat endpoint ini: profil yang sudah ada tidak pernah diturunkan
ke role yang diminta klien (lihat "ROLE STICKINESS" di `actions/users.ts`). Satu-satunya
jalur ubah role adalah `admin_update_user` yang teraudit.

⚠️ Akun lama (admin `angkouw84@gmail.com`, agent `angkouw777@gmail.com`) punya `sp_users.id`
yang BERBEDA dari auth id; gateway mencocokkan `id.eq OR email.eq` sehingga tetap jalan.
Jangan "merapikan" id ini — `sp_clients`, `sp_commissions`, dll mereferensikan id lama.

## Alur per skenario

### 1. Registrasi Customer (`AuthGate.tsx` → `handleRegister`)
1. Form registrasi punya toggle **Nasabah / Mitra** (`regRole`). Pilihan Mitra dialihkan ke
   `AgentOnboarding`; Nasabah lanjut di sini.
2. `supabase.auth.signUp(email, password, { data: { name, role: regRole } })` — role yang
   dikirim adalah yang dipilih pengguna (dulu di-hardcode `'CUSTOMER'`).
3. Jika ada sesi langsung (autoconfirm aktif) → `resolveAndLogin` → `ensure_profile({ role })`.
4. Jika butuh konfirmasi email → layar CHECK_EMAIL. Saat pengguna kembali dari tautan email,
   `App.tsx` membaca `user_metadata.role` dan membuat profil dengan role itu — pemilihan
   tipe akun tidak ditanyakan ulang (menanyakan ulang berarti pilihan Mitra bisa berubah
   jadi Nasabah).

### 2. Registrasi Agent (`AgentOnboarding.tsx`)
1. Step 1: nama/email/HP/password → Step 2: KTP/alamat (opsional) + persetujuan.
2. `supabase.auth.signUp` dengan metadata `{ name, phone, role: 'AGENT', ktp, address }`.
3. Ada sesi → `ensure_profile({ role: 'AGENT', ... })` → profil agent dibuat
   (`verified=false`, `commission_rate=0.1`, `agent_code` SP-AGT-XXXX) → langsung masuk.
4. Tanpa sesi → layar "Cek Email"; profil dibuat saat login pertama.
5. Agent baru harus **diverifikasi admin** sebelum dianggap aktif penuh.

### 3. Login email+password (`AuthGate.tsx` → `handleLogin`)
1. `signInWithPassword` → `resolveAndLogin` → `buildUserObj`.
2. `buildUserObj` **membaca saja** (`get_my_profile` via `fetchMyProfileForLogin`), tidak
   membuat. Tiga kemungkinan:
   - **profil ada** → objek user dengan role aslinya;
   - **404 (belum ada profil)** → jika `user_metadata.role` ada, profil dibuat dengan role
     itu; jika tidak ada, `onNeedsRoleSelection` → `RoleSelectionScreen`;
   - **gagal sementara** (5xx/jaringan) → tampilkan error, **jangan** login dengan role
     tebakan. Role yang salah menulis baris yang salah dan tidak memperbaiki diri sendiri.

### 4. Google OAuth
1. `signInWithOAuth({ provider: 'google' })` — redirect ke origin (web) atau
   `com.myinsurepath.os://auth-callback` (native).
2. `App.tsx` (startup) menangkap sesi → cari profil. Tidak ada profil dan tidak ada role di
   metadata → `RoleSelectionScreen` → user pilih Nasabah / Mitra / Klien Korporat →
   `ensure_profile({ role, phone, name })` (B2B lewat `createB2BClientProfile`).
3. **Dua jalur, satu layar.** Pada web, `?code=` di URL membuat `App.tsx` menahan render
   (`oauthLoading`) sampai profil selesai dicek. Pada APK native (deep link) tidak ada
   `?code=`, jadi `AuthGate` yang sedang tampil ikut menangkap event `SIGNED_IN` — karena
   itu `AuthGate` juga harus bisa memunculkan pemilih role, lewat prop
   `onNeedsRoleSelection`. Tanpa itu, pengguna Android selalu berakhir sebagai nasabah.

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

## Riwayat bug yang sudah diperbaiki (v1.57.0, 7 September 2026)

| Bug | Akar masalah | Fix |
|---|---|---|
| Setiap pendaftar baru masuk ke aplikasi nasabah, pemilihan tipe akun tidak pernah muncul | `AuthGate.buildUserObj` memanggil `ensure_profile()` **tanpa role**, dan server diam-diam default ke `CUSTOMER` — profil sudah tercipta sebelum `RoleSelectionScreen` sempat jalan | Lookup di `AuthGate` jadi read-only; profil hanya dibuat kalau rolenya sudah diketahui, selain itu `onNeedsRoleSelection` → pemilih role. Server menolak pembuatan tanpa role (409 `ROLE_REQUIRED`) |
| Pengguna APK Android selalu jadi nasabah | Deep-link OAuth tidak membawa `?code=`, jadi penjaga `oauthLoading` di `App.tsx` tidak aktif dan `AuthGate` yang menangani sesi — lalu membuat profil `CUSTOMER` | `AuthGate` kini bisa memanggil pemilih role lewat `onNeedsRoleSelection` |
| Pilihan "Mitra" di form registrasi tidak ikut ke signup | `options.data.role` di-hardcode `UserRole.CUSTOMER`, mengabaikan toggle `regRole` | Kirim `regRole` |
| Login gagal sementara → user masuk sebagai nasabah | `resolveAndLogin` menangkap error lalu login dengan objek fallback ber-role `CUSTOMER` | Tampilkan error dan minta coba lagi; jangan pernah menebak role |
| Layar login berkedip di tengah OAuth | Timeout 10 detik menurunkan `oauthLoading` walau pencarian profil masih berjalan | Timeout hanya berlaku kalau tidak ada proses yang berjalan |

---

## Pendaftaran macet — insiden 22 Oktober 2026

Laporan pemilik: *"user jd input data 2x dan saat sdh input tidak bisa lanjut"*.

Terbukti di produksi. Akun `auth.users` yang dibuat **22 Okt 01:02:44** (role `AGENT`,
lengkap dengan nomor telepon) **tidak pernah terkonfirmasi dan tidak pernah login**, dan
tidak punya baris `sp_users`. Log `auth_logs` pada menit-menit sesudahnya:

| Waktu | Kejadian |
|---|---|
| 01:02:46 | `mail.send` — email konfirmasi terkirim **satu kali** |
| 01:02:59 – 01:03:40 | **empat** `429: For security purposes, you can only request this after 45/23/22/8 seconds` |
| 01:03:46 | `400: Email address "…" is invalid` — mencoba alamat lain |
| 01:04:41 | **`429: email rate limit exceeded`** — batas email per jam proyek tercapai |
| 01:04:51 | `400: Invalid login credentials` — mencoba masuk dengan akun yang belum terkonfirmasi |
| 01:04:55 | beralih ke Google OAuth sebagai jalan terakhir |

### Empat sebab, dan statusnya

1. **Data diketik dua kali.** `AuthGate` meminta nama/email/password, lalu
   `AgentOnboarding` langkah 1 meminta **semuanya lagi** sebagai kolom kosong, ditambah
   telepon dan konfirmasi password. — **DIPERBAIKI**: `AgentOnboarding` menerima prop
   `initial`; kalau lengkap, langkah 1 dilewati dan hanya KTP/alamat/persetujuan yang
   diminta. Nomor telepon kini ditanyakan di layar daftar saat "Mitra" dipilih.
2. **Tombol kirim ulang berbohong.** `handleResend` menelan setiap error
   (`.catch(() => {})`) lalu selalu menampilkan "Terkirim!". Jadi empat penolakan 429 di
   atas tampak seperti empat keberhasilan, dan pendaftar terus menekannya sampai menabrak
   batas per jam. — **DIPERBAIKI**: hasilnya ditampilkan apa adanya, dengan hitung mundur
   (`RESEND_COOLDOWN_S`) yang mengunci tombol, dan sisa detik dari pesan Supabase dipakai
   sebagai durasi.
3. **Tidak ada jalan maju dari dalam aplikasi.** Layar "Cek Email Kamu" hanya punya tombol
   kirim ulang. Kalau emailnya telat, masuk spam, atau kena batas, pendaftar buntu. —
   **DIPERBAIKI**: layar verifikasi menerima **kode 6 digit** (`verifyOtp` dengan
   `type: 'signup'`), dan `Email not confirmed` saat login mengantar langsung ke sana.
4. **Batas pengiriman email proyek.** `429: email rate limit exceeded` berasal dari SMTP
   bawaan Supabase, yang hanya mengizinkan segelintir email per jam. **TIDAK BISA
   diperbaiki dari kode** — lihat di bawah.

### ⚠️ Dua setelan yang hanya bisa diubah dari dasbor Supabase

Keduanya di luar jangkauan repo ini (Management API `api.supabase.com` diblokir kebijakan
proxy dari kontainer), dan **keduanya wajib** supaya pendaftaran berjalan normal:

1. **SMTP kustom** — *Project Settings → Authentication → SMTP Settings*. Tanpa ini,
   SMTP bawaan Supabase membatasi email ke sekitar 2–4 per jam untuk SELURUH proyek, dan
   pendaftar ke-3 pada jam yang sama tidak akan pernah menerima emailnya. Ini sebab
   paling fatal dari keempatnya.
2. **Kode 6 digit di email konfirmasi** — *Authentication → Email Templates → Confirm
   signup*. Template bawaan hanya memuat `{{ .ConfirmationURL }}`, tanpa `{{ .Token }}`,
   sehingga kolom kode di aplikasi tidak ada isinya untuk diketik. Templatenya sudah
   disiapkan di **`supabase/email-templates/confirm-signup.html`** — tinggal disalin ke
   dasbor. Sampai itu dilakukan, layar verifikasi tetap berfungsi lewat link di email.

---

## Strategi masuk: Google dulu, email belakangan

Pertanyaan pemilik (22 Okt 2026): bagaimana agar pengguna baru maupun lama bisa masuk
dengan satu klik lewat akun Google, lalu pengkinian data dan verifikasi menyusul?

Datanya mendukung arah itu, dan angkanya dari `auth.users` proyek ini sendiri:

| Jalur | Akun | Terkonfirmasi | Pernah login |
|---|---|---|---|
| **Google** | 18 | **18 (100%)** | **18 (100%)** |
| Email + password | 26 | 22 | 21 — **5 hilang (19%)** |

**Google tidak membutuhkan verifikasi email sama sekali.** Google sudah memverifikasi
alamatnya; 18 dari 18 akun Google punya `email_confirmed_at` terisi dan klaim
`email_verified: true` sejak detik pertama. Tidak ada email yang dikirim, jadi jalur ini
kebal terhadap batas SMTP, folder spam, dan keterlambatan kiriman — tiga hal yang
menghabisi 19% pendaftar di jalur satunya.

Alurnya hari ini sudah: **1 klik Google → 1 ketuk pilih Nasabah/Mitra
(`RoleSelectionScreen`) → masuk**. Yang kurang hanyalah penempatan: tombol Google dulu
terkubur DI BAWAH formulir email, sehingga jalur yang paling mungkin berhasil justru
paling tidak terlihat. Sejak v2.6.3 ia menjadi aksi utama di paling atas.

Pengkinian data (telepon, KTP, alamat) sebaiknya diminta **di dalam aplikasi setelah
masuk**, bukan sebagai penghalang di pintu depan.

### Verifikasi email yang gratis — untuk jalur email+password

Hanya relevan bagi yang tidak memakai Google. Keduanya menyambung ke Supabase sebagai
*custom SMTP*, dan angkanya dari halaman resmi masing-masing (Okt 2026):

| | Gratis | Catatan |
|---|---|---|
| **Brevo** (rekomendasi) | **300 email/hari**, tanpa batas waktu, tanpa kartu kredit | SMTP relay port 587; cocok untuk lonjakan pendaftaran |
| Resend | 3.000/bulan tetapi **hanya 100/hari** | Tanpa branding pihak ketiga; 100/hari terlalu sempit saat rekrutmen agen |

Brevo dipilih karena batas hariannya tiga kali lipat — yang menentukan saat banyak agen
mendaftar di hari yang sama, bukan totalnya per bulan.

**Syarat agar emailnya masuk inbox, bukan spam:** SPF, DKIM, dan DMARC untuk
`myinsurepath.com`. DNS domain ini **tidak** dikelola Vercel (API Vercel memulangkan nol
record), jadi recordnya ditambahkan di tempat nameserver domain berada.
