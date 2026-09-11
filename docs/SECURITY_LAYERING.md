# SurePath — Pelapisan Keamanan & Verifikasi Akun

> Dibuat 11 September 2026 (v2.5.6). Menjawab dua permintaan owner:
> (1) merapikan agar kode/informasi tidak terekspos atau bisa disalin orang luar,
> (2) memastikan hanya pengguna terverifikasi yang dapat akses penuh.

---

## Bagian 1 — Yang harus diluruskan lebih dulu

**Kode yang berjalan di browser tidak bisa dibuat tak-terbaca.** Browser wajib mengeksekusinya, jadi ia wajib menerimanya utuh. DevTools selalu bisa membukanya. Ini sifat web, bukan kesalahan konfigurasi.

Obfuscation **menaikkan biaya** menyalin, tidak mencegahnya — dan membawa ongkos nyata: stack trace Sentry jadi tidak terbaca, debugging produksi melambat, ukuran bundle naik. Siapa pun yang menjanjikan proteksi total untuk kode klien sedang keliru, dan membangun rasa aman palsu lebih berbahaya daripada tahu persis di mana batasnya.

**Pertanyaan yang benar bukan "bagaimana menyembunyikan kode", melainkan "bagaimana membuat kode yang tersalin menjadi tidak berguna".**

Kalau pesaing menyalin seluruh React komponen SurePath, ia mendapat tampilan. Ia **tidak** mendapat: tarif OJK aktif Anda, daftar harga kendaraan, aturan komisi, data nasabah, atau kemampuan menerbitkan polis — sepanjang semua itu hidup di server dan dijaga otorisasi. Itulah pelapisan yang sesungguhnya.

---

## Bagian 2 — Apa yang benar-benar terekspos hari ini

Diaudit langsung terhadap bundle produksi, bukan diperkirakan.

### Sudah benar ✅

| Diperiksa | Hasil |
|---|---|
| Sourcemap bundle klien | tidak diproduksi — kode TypeScript asli tidak bisa diunduh |
| Rahasia di bundle | nihil (`service_role`, `xnd_`, `sk_live`, JWT — semua nol) |
| Env ke browser | hanya `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, keduanya memang publik |
| Otorisasi | di server (pola data-gateway) — ini proteksi yang sesungguhnya |
| Header keamanan | CSP, HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'` sudah terpasang |
| Sourcemap **server** di folder publik | **diperbaiki v2.5.5** + penjaga build agar tidak terulang |

### Aset yang benar-benar berharga dan ikut terkirim ⚠️

Ini yang layak dikhawatirkan — bukan kode React-nya:

| Berkas | Ukuran | Isi |
|---|---|---|
| `services/vehicleDatabase.ts` | **2.572 baris / 352 KB** | daftar harga pasar kendaraan per merk/tipe/tahun |
| `services/ojkRates.ts` | 434 baris | tabel tarif OJK + zona provinsi |
| `constants.ts` | 374 baris | tabel tarif & konstanta bisnis |

Terkonfirmasi ikut dalam bundle produksi. **Ini aset yang bisa disalin** — dan menyalinnya tidak butuh membaca satu baris pun logika React; cukup buka bundle dan ambil arraynya.

**Rekomendasi (belum dikerjakan, butuh keputusan Anda):** pindahkan pencarian harga kendaraan ke server — satu action gateway `lookup_vehicle_price` yang menerima merk/tipe/tahun dan mengembalikan satu angka. Efeknya ganda: aset tidak lagi bisa diunduh borongan, **dan** bundle klien turun ±350 KB sehingga aplikasi lebih cepat. Fiturnya tidak berubah sama sekali dari sisi pengguna — hanya sumber datanya yang berpindah.

Ini sengaja **tidak** saya kerjakan sekarang karena mengubah jalur data di wizard pembelian, dan Anda meminta tanpa mengubah fungsi. Ini keputusan Anda, bukan efek samping.

---

## Bagian 3 — Model pelapisan

Pertahanan berlapis, diurutkan dari yang paling menentukan:

```
Lapis 5  Hukum & akses repo          repo privat, NDA, lisensi
Lapis 4  Pengaburan (kosmetik)       minify + drop console + tanpa sourcemap   ← sudah
Lapis 3  Pengecilan aset             data berharga pindah ke server            ← direkomendasikan
Lapis 2  Gerbang kepercayaan akun    hanya akun terverifikasi untuk aksi berisiko ← v2.5.6
Lapis 1  Otorisasi server            data-gateway, RLS deny-all, identitas dari JWT ← sudah
```

Yang menentukan adalah **Lapis 1 dan 2**. Lapis 4 hanya memperlambat pengintip kasual; ia tidak pernah menahan penyerang sungguhan, dan tidak boleh diandalkan.

---

## Bagian 4 — Gerbang kepercayaan akun (v2.5.6)

### Masalah nyata yang dipecahkan

Audit 11 September 2026 terhadap 35 akun produksi:

| Temuan | Angka |
|---|---|
| Dikonfirmasi **instan** (<2 detik) → auto-confirm menyala | **30 dari 32** |
| Benar-benar mengklik tautan email | **2** |
| Memakai domain sampah (`example`, `test`, dll) | **6 akun (17%)** |

Lebih dalam lagi: pendaftar CUSTOMER langsung ditulis `verified: true` (`actions/users.ts`: `verified: role !== 'AGENT'`). Jadi kolom `verified` **tidak pernah bisa** membedakan nasabah asli dari akun karangan — hanya agen yang benar-benar ditinjau manusia.

Kolom `identity_status` sudah ada dan terisi di 40 baris, tetapi **tidak ada satu baris kode pun yang membacanya**. Kolom mati.

### Rancangannya

Tiga tingkat, diturunkan dari data yang sudah ada — **tanpa perubahan skema**:

| Tier | Arti | Syarat |
|---|---|---|
| **0** | belum tepercaya | tidak ada profil, **atau domain email tidak sah**, atau email belum dikonfirmasi |
| **1** | email wajar | profil ada, domain wajar, email terkonfirmasi |
| **2** | terverifikasi penuh | `identity_status = APPROVED`, atau agen yang disetujui operator |

**Kenapa pemeriksaan domain, bukan `email_confirmed_at` saja?** Selama auto-confirm menyala, kolom itu selalu terisi sehingga bernilai nol sebagai sinyal. Pemeriksaan domain bekerja **hari ini** tanpa mengubah setelan apa pun. Begitu auto-confirm dimatikan, `email_confirmed_at` otomatis ikut bermakna — kodenya sudah siap.

### Yang digerbang — sengaja hanya enam

Dari **103 action**, hanya yang menciptakan catatan mengikat, menggerakkan uang, atau rawan penyalahgunaan akun massal:

| Action | Alasan |
|---|---|
| `create_policy_order` | menerbitkan order polis sungguhan |
| `submit_claim` | mengajukan klaim |
| `agent_request_withdrawal` | uang keluar |
| `redeem_coins` | menukar imbalan jadi nilai |
| `apply_referral` | jalur penyalahgunaan akun massal |
| `accept_agreement` | tanda tangan elektronik perjanjian keagenan |

**Semua sisanya tetap terbuka:** baca polis/klaim/profil/notifikasi, simulasi premi, penawaran draf, Pathy, daftar klien. Pengguna baru harus tetap bisa mencoba produk sebelum diverifikasi — menggerbang terlalu banyak sama buruknya dengan tidak menggerbang.

### Menyalakannya tidak mengubah apa pun bagi pengguna lama

Akun yang dibuat sebelum `ENFORCEMENT_FROM` (12 Sep 2026) **dibebaskan sepenuhnya** — termasuk 6 akun domain sampah yang sudah ada. Mereka tidak boleh tiba-tiba terkunci oleh rilis ini. Ada uji khusus yang mengunci jaminan itu.

### Ditegakkan di satu tempat

Gerbang duduk di dispatcher `data-gateway`, tepat setelah identitas caller terbentuk dan sebelum dispatch — satu titik untuk 103 action, bukan 103 penjaga yang bisa lupa dipasang. Peran admin selalu lolos karena sudah melewati pemeriksaan peran yang lebih ketat di modulnya.

Penolakan mengembalikan **HTTP 403** dengan `code: 'VERIFICATION_REQUIRED'` supaya klien bisa menampilkan ajakan verifikasi yang tepat, bukan sekadar pesan gagal.

---

## Bagian 5 — Yang butuh tangan Anda

Gerbang di atas menutup celah dari sisi kode. Dua hal berikut hanya bisa Anda lakukan, dan keduanya menyerang akar masalahnya:

### 1. Matikan auto-confirm email ⚠️ mengubah alur pendaftaran

Supabase Dashboard → **Authentication → Providers → Email → Confirm email: ON**

Setelah ini, pendaftar wajib mengklik tautan di email sungguhan. Ini **satu-satunya** cara menghentikan email karangan di sumbernya; pemeriksaan domain hanya menangkap yang sudah dikenal.

Saya **tidak** mengubahnya sendiri karena ini mengubah pengalaman pendaftaran — persis yang Anda minta jangan diubah. Keputusan Anda.

### 2. Pastikan repo GitHub privat

Kalau repo publik, seluruh diskusi menyembunyikan kode jadi tidak relevan — sumbernya sudah terbuka lengkap dengan riwayat.

---

## Lampiran — Cara memeriksa akun mencurigakan

Tempel di Supabase SQL Editor kapan saja:

```sql
select u.email,
       u.created_at at time zone 'Asia/Jakarta' as daftar_wib,
       (u.email_confirmed_at - u.created_at < interval '2 seconds') as konfirmasi_instan,
       s.role, s.verified, s.identity_status
from auth.users u
left join public.sp_users s on s.id = u.id or lower(s.email) = lower(u.email)
where u.email ~* '(example|test|mailinator|tempmail|guerrilla|10minute|yopmail|throwaway)\.'
   or u.email_confirmed_at is null
order by u.created_at desc;
```
