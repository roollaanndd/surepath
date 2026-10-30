# Rencana: Mekanisme Daftar & Verifikasi Apps Mitra (dan Seluruh Portal)

Status: **Dijawab pemilik 28 Okt 2026 (§8). Tahap 2 nomor 4 (fungsi terbatas saat
`verified=false`) SUDAH TERPASANG di v2.7.18, bersama perbaikan kebuntuan yang
riset ini belum lihat — lihat §11.**

---

## 1. Masalah yang dilaporkan

> "Beberapa kali user gagal mendaftar di apps mitra melalui menu daftar,
> tetapi berhasil masuk melalui menu masuk via Google padahal belum pernah mendaftar."

## 2. Riset — kondisi kode hari ini (tayaran 2.7.7)

### 2.1 Jalur "Daftar" (email + sandi) — `components/AuthGate.tsx` metode REGISTER

- `supabase.auth.signUp` membawa metadata `{ name, role, referral_code }` — role yang
  dipilih **ikut Round-Trip konfirmasi email** (benar).
- Ras timau 15 detik (`Promise.race`) — di jaringan lambat login gagal padahal server
  sudah sukses.
- Setelah sukses `signUp` tanpa sesi → layar `CHECK_EMAIL`, user WAJIB klik tautan di
  emailnya sebelum boleh masuk.

### 2.2 Jalur Google OAuth — satu klik, tanpa gesekan

- Google memverifikasi kendali atas email (OAuth), klien melihatnya sebagai
  konfirmasi otomatis → masuk instan ke RoleSelectionScreen → profil langsung berdiri.

### 2.3 Server `ensure_profile` (`data-gateway/actions/users.ts`)

- Menolak domain email sekali-pakai (UNTRUSTED_EMAIL_DOMAIN).
- `ROLE_REQUIRED` 409 kalau tidak ada role (perbaikan v1.57.0).
- Role baru: **AGENT dibuat `verified = false`**, trust_score 80, komisi 0.1.
- `verified` tidak membatasi fungsional portal — hanya lencana profil & daftar Admin.

### 2.4 Infrastruktur verifikasi yang **sudah ada tapi yatim**

| Aset | Kondisi |
| --- | --- |
| `supabase/functions/send-otp` (Fonnte/WhatsApp, CSPRNG 6 digit, rate limit 3/nomor/10m + 10/IP/60m, `sp_otp_codes`) | Selesai, terdeklarasikan di config.toml, **tidak ada panggilan** |
| `supabase/functions/verify-otp` (maks 5 salah, generic error, fail-closed) | Selesai, tidak ada panggilan |
| `supabase/functions/send-whatsapp` | Selesai, admin/service saja |
| Tabel `sp_otp_codes`, kolom `sp_users.phone_verified_at` | Ada; perubahan sendiri oleh user diblokir (2026-10-13) |
| Admin: daftar "Pending Verifikasi" + Setujui/Cabut | Ada (AdminViews) |
| Sign up email OTP bawaan Supabase (`signInWithOtp` + `verifyOtp`) | Terpasang di AuthGate (mode EMAIL_OTP_VERIFY) |

### 2.5 Diagnosa akar masalah

1. **Deliverilitas email konfirmasi** — Supabase SMTP bawaan tanpa domain kustom
   sering masuk spam/tertahan; bersama rate limit SMTP bawaan (~2-4 email/jam),
   "Daftar" sering terasa mati. User mencoba Google karena jalur itu "succes instan".
2. **Ras timau 15 detik** — kegagalaan di jaringan lambat tampil sebagai gagal.
3. **Perbedaan janji antara jalur** — jalur strik (mesti konfirmasi email) lawan jalur
   longgar (Google) memberi pintu licik: siapa pun dengan akun Google bisa bikin
   profil AGENT (dengan `verified=false`) — pendaftaran hanya jadi layar, bukan gerbang.

Kesimpulan: **jalur Daftar tidak rusak — jalur Google-lah tidak memintanya melalui
gerbang yang sama.** Solusi terbaik bukan memperketat Daftar, melainkan mengintegrasikan
semua jalur ke satu gerbang verifikasi bertingkat.

---

## 3. Target mekanisme daftar (saat selesai)

```
[ Registrasi ]
  ├─ CUSTOMER : Email (tayaran/konfirmasi) ──────────────────────► langsung jadi nasabah
  ├─ B2B      : Formulir unjuk diri (tidak menentukroli sendiri) ─► ditinjau admin
  └─ AGENT    : Email tertainment + WhatsApp OTP (bukti nomor) ──► MENUNGGU VERIFIKASI (verified=false)
                     │                                              │
                     └─ tanpa WA OTP: tidak dapat lanjut ───────────┴─► admin approve → mitra aktif
```

Prinsip:

1. **Janji yang verifikasi NG berbeda dengan janji yang kode verifikasinya jebak.**
   Semua jalur (Daftar, Google, OTP) dipaksa melalui gerbang yang sama.
2. **Bukti kepemilikan nomor HP WAJIB hanya untuk AGENT.** Nasabah cukup email tertainment
   (perlu L4 opsional), karena risiko finansial mitra jauh lebih tinggi.
3. **Server yang mahkamah, bukan UI.** `ensure_profile` menolak `role=AGENT` tanpa bukti
   OTP yang terikati ID auth (layar pemilih peran tidak diandalkan).
4. **`verified=false` mendapat fungsi terbatas** di mitra dash (lihat kata lalu).

---

## 4. Pilihan kanal verifikasi — fokus **gratis**

| Opsi | Gratis? | Tata kelola/Hukum | Kelebihan | Kekurangan |
| --- | --- | --- | --- | --- |
| **A. WhatsApp via Fonnte (infra yatim yang tersedia)** | Ada tier gratis* ( kuota/dentum — cek saat terapkan) | **Tidak resmi** — risiko nomor diblokir WhatsApp, ToS abu-abu | Beres infra: server+rate limit+tabel selesai; Indonesia = penetration WA maksimal | Titik pusat mati milik pihak ketiga; pelanggaran ToS |
| **B. WhatsApp Cloud API resmi Meta** | Layanan percakapan (24 jam window balasan) itu gratis**; template "utility" berbayar | Resmi, aman | Kapelus Pewidi, reputasi aman | Butuh WA Business Meta + nomor + webhook; UX Butuh banner "kirim IZIN menerima kode"; harga template harus dipastikan saat terapkan |
| **C. Email OTP Supabase bawaan** | 100% (temasuk kuota MAU 50rb) | Resmi | Sudah terpasang di AuthGate (mode EMAIL_OTP_VERIFY); Zero kerja infra | Deliverabilitas SMTP bawaan kurang tanpa domain kustom |
| **D. SMTP gratis (Brevo ~300/hari / Resend ~100–3.000/bln)** | Tier gratis tersedia** | Resmi | Solusi justru 2.1: confirmasi email ANDA yang bisa sampai | Kuota harian perlu dinilai; angka HARUS dituruti saat terapkan |
| **E. SMS (Twilio/MessageBird/Meta SMS)** | **Tidak gratis per SMS** | Resmi | Jaringan andal | Adan kecil (SMS spam/biaya per pesan) |
| **F. Sunyi (aroma panggilan hape / IVR)** | Berbayar | Resmi | — | Tidak relevan |

Rekomendasi babak dua:

- **Lapis 1 (bukti email):** pasang SMTP kustom tier gratis (BrevoodeResend) +
  tetap konfirmasi email selama Daftar. Kebih kecil biaya, jalan, ubah yog utama ==
- **Lapis 2 (bukti nomor HP, wajib AGENT):** hidupkan **send-otp/verify-otp yang
  sudah ada** dengan Fonnte dulu (menolak infrastruktur tanpa memuat vendor baru),
  DENGAN rencana pintu interchange ke Cloud API resmi — pembeda tidak mengubah
  kontrak fungsi edge function.
- B2B tidak melalui OTP apa pun: tetap formulir unjuk diri (bukti korporat, bukan bukti HP).

---

## 5. Rencana penerapan, bertingkat

Bidang garis **Riset → Pian → Uji → Implement → Review → Verify → Dokument**
(garis ecc-如期 adaptasi — **setiap tahap digabung bersih secara berasingan**).

### Tahap 0 — Perbaikan akar "Daftar terasa gagal" (kecil, cepat)
1. Gulir `CHECK_EMAIL`: tahu gmail-unreachable, spam hint, tombol "kirim ulang"
   sudah ada — tambah status determinasi "belum sampai?".
2. Hapus ras timau 15 detik yang konflik: jadikan warna-loading "server lambat",
   bukan gagal (server sukses pun tertelan).
3. Catet: fail email sudah ke situs spam → tulis diayat pada CHECK_EMAIL.
4. Update test: AuthGate register happy path + timeout label.

### Tahap 1 — SMTP kustom (buat email konfirmasi jadi *sampai*)
1. Siapkan sinyal domain `kirim.myinsurepath.com` via Brevo/Resend (tier gratis),
   set `SUPABASE_SMTP_*` di dashboard Supabase.
2. Besar in-rate test: lahir email test di integrasi (P) Konfigurasi hanya pantauan,
   tidak singgung kode app.

### Tahap 2 — Hidupkan verifikasi WhatsApp (infra yatim → terpanggil)
1. **Bind OTP ke auth user**: perluas `verify-otp` agar menerima JWT dan menulis
   `sp_phone_verifications(user_id, phone, verified_at)` (RLS send-service).
2. **Server gate**: `ensure_profile` MENOLAK `role=AGENT` tanpa baris
   `sp_phone_verifications` ≤ 30 mnt untuk caller auth ID (`AGENT_OTP_REQUIRED` 403).
3. **Klien**: di RoleSelectionScreen cabang AGENT (dan AgentOnboarding step 1) →
   UX OTP (input nomor → kirim = `send-otp` → masukkan 6 digit → `verify-otp`).
4. **Fungsi terbatas saat `verified=false`**: AgentPortal menumpuk layout PENDING
   (Tab profil/latihan aktif, tab transaksi terkunci) — tanpa topang penuh
   dari `verified=true` setelah admin approve.
5. **Uji**: unit test action GERBANG (AGENT tanpa bukti → 403, dengan bukti → sukses),
   test fungsi level server, E2E register→OTP(mock)→admin-approve.

### Tahap 3 — Lakukan Google/Jalur Heap berjanji
1. Google / OTP (role picker) → tampilan hanya CUSTOMER & AGENT; AGENT otomatis
   diarahkan ke gerbang OTP Tahap 2; tanpa pilih rolenya sendiri full.
2. B2B hilang dari pemilo role → arahkan ke form B2B submission (sudah ada di
   services/website.ts) atau ke halaman contact; tetap tanpa profil otomatis.
3. `RoleSelectionScreen` = satu pintu; B2B tampilan hanya info, bukan pilih.

### Tahap 4 — Tingkatkan review mitra di admin
1. Daftar Pending sudah ada; tambah kolom "nomor terverifikasi ✓/✗" sehingga admin
   memeriksa bukti HP dari admin (tanpa melihat datanya).
2. Audit log percobaan OTP gagal; alarm admin bila pola farming terdeteksi (opsi).

---

## 6. Hal yang BUKAN sasaran tahap berjalan

- Sistem rekrutmen upline (referral tetap jalan apa adanya).
- KYC KTP/kamera OCR (Sudah ada `stnk-ocr`, `ocr-scan` — dipertimbangkan belakangan
  kalau admin butuh lebih dari bukti HP).
- Login SMS native (tetap pakai email/Google/WA-OTP untuk daftar saja).

---

## 7. Anggaran & risiko di ringkasan

| Item | Biaya | Risiko |
| --- | --- | --- |
| SMTP gratis (Brevo/Resend) | **Rp 0** | Kuota harian; pastikan delivery rate dengan test email sendiri |
| Fonnte (tier gratis*) | **Rp 0*** | Provider tidak resmi — nomor bisa diblokir WhatsApp; tos abu-abu; angka kuota pastikan saat implementasi |
| WhatsApp Cloud API resmi | **Rp 0** **jaga layanan (balasan dalam 24 jam) — template OTP berbayar** | Angka perlu dikonfirmasi saat terapkan; butuh Meta Business + nomor |
| Email OTP bawaan Supabase | **Rp 0** | Deliverabilitas tanpa domain kustom (sudah dijawab Tahap 1) |

**Batas poros: seluruh target bisa Rp 0/bulan** asalkan: SMTP kustom tier gratis +
Fonnte tier gratis + admin verifikasi manusia. Perkiraan tambahan hanya muncul bila
volume OTP WA menembus kuota gratis atau memilih Cloud API resmi dengan template berbayar
(≈ Rp 400–600/pesan template utility — konfirmasi ke Meta saat implementasi).

---

## 8. Keputusan — DIJAWAB PEMILIK (2026-10-28)

| # | Pertanyaan | Keputusan |
| --- | --- | --- |
| 1 | Kanal bukti HP untuk AGENT: Fonnte dulu (infra selesai) vs langsung Meta Cloud API resmi? | **Fonnte dulu** — "do what u think is best; carikan cara mendapatkan token-nya" (langkah token: §10) |
| 2 | CUSTOMER perlu verifikasi HP juga, atau cukup email? | **Cukup email terverifikasi** |
| 3 | Kartu B2B di pemilih peran: dibuang atau tetap? | **Buang — arahkan ke formulir unjuk diri** |
| 4 | `verified=false`: mitra boleh melihat dashboard terbatas, atau terkunci penuh? | **Dashboard terbatas** (profil/materi), transaksi terkunci |
| 5 | Tahapan implementasi | **Bertahap: Tahap 0 → 1 → 2 → 3 → 4, tiap tahap komit teruji** |

---

## 9. Catatan sesi (konteks)

- Riset ini menindaklanjuti gerbang hijau refactor routing v2.7.8-pending
  (lint 383/383, build+prerender+PWA, E2E Playwright 74 pas/15 skip/0 gagal, 2026-10-28).
- Pastikan angka kuota/pricing di §4 dan §7 diperiksa langsung ke provider
  pada hari implementasi — pencarian web saat riset tidak tersedia, angka tatap
  muka di skrip aman (gratis tier pernyataan) perlu konfirmasi ulang.

---

## 10. Cara mendapatkan `FONNTE_TOKEN` (dibutuhkan Tahap 2)

Fonnte mengambil alih sesi WhatsApp Web dari perangkat yang dipindai token.
**Tidak bisa saya kerjakan sendiri** — scan QR wajib dari perangkat WhatsApp
pemilik. Estimasi 10 menit:

1. **Siapkan nomor pengirim.** Gunakan nomor WA yang didedikasikan untuk SurePath
   (bukan nomor pribadinya). Satu nomor = satu device di Fonnte; perangkatnya
   harus tetap menyalakan internet agar sesi Web-nya hidup.
2. Daftar di `https://fonnte.com` (email apa pun; tier gratis oke untuk
   memulai — kuota pastikan di dashboard setelah login).
3. Di dashboard Fonnte: **Connect Device** → muncul QR → pindai dari WhatsApp
   nomor khusus itu (WhatsApp → Perangkat Tertaut → Tautkan Perangkat).
4. Di dashboard: **Menu → device info / API key** — salin tokennya. JANGAN
   tempelkan ke berkas repo apa pun.
5. Setel ke Supabase sebagai secret edge function (salah satu):
   - CLI: `npx supabase functions secrets set FONNTE_TOKEN=<token>` (butuh
     akses ke project), atau
   - Dashboard Supabase → Project Settings → Edge Functions → Secrets.
6. **Uji dengan aman** (nomor HP sendiri, bukan tabel produksi):
   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/send-otp" \
     -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"phone":"6281234567890","purpose":"LOGIN"}'
   ```
   Bila WA sampai berisi 6 digit → infra yatim resmi hidup, lanjut wiring Tahap 2.
7. Saat token terpasang, tambahkan baris ke `.env.example` (nilai dummy):
   `FONNTE_TOKEN=	set-your-secret-in-supabase-dashboard` sebagai penanda
   konfigurasi — nilai asli TIDAK PERNAH masuk repo.

**Kontrak yang tidak berubah:** `send-otp`/`verify-otp` tidak perlu rombakan bila
suatu saat Fonnte diganti Meta Cloud API resmi — gantinya hanya isi function
`send-otp` (mereka memakai `api.fonnte.com/send`); antarmuka ke aplikasi tetap.
</think><tool_call>shell<arg_key>command</arg_key><arg_value>Get-Content docs\REGISTRATION_VERIFICATION_PLAN.md -Tail 8

---

## 11. Yang berubah di v2.7.18 (30 Okt 2026) — kebuntuan gerbang perjanjian

Riset di atas menduga jalur Daftar "terasa mati" karena deliverabilitas email.
Setelah gerbang kepercayaan (v2.5.6) benar-benar ditegakkan, muncul kebuntuan
kedua yang **pasti** dan tidak ada hubungannya dengan email:

- `accept_agreement` digerbang `TIER_VERIFIED`; AGENT hanya mencapai tier itu
  lewat `verified = true` dari operator; `AgentAgreementGate` memblokir seluruh
  aplikasi sampai perjanjian ditandatangani. Melingkar, dan layar penuh — jadi
  mitra baru berhenti di situ.

Diperbaiki: `accept_agreement` turun ke `TIER_EMAIL_OK`, dan portal Mitra kini
punya mode "menunggu verifikasi" (keputusan §8 nomor 4) — Beranda, Polis,
Profil, notifikasi dan Pathy terbuka; tab **Buat** dan **Dompet** menampilkan
layar penjelasan karena aksi intinya (`create_policy_order`,
`agent_request_withdrawal`) memang ditolak server pada tier ini.

**Tahap 0, 1, 2 (OTP WhatsApp), 3 dan 4 tetap belum dikerjakan** — bukti nomor
HP belum menjadi syarat, dan `FONNTE_TOKEN` (§10) masih menunggu pemilik.
