# CMS — Bagaimana Seharusnya Berfungsi & Tersambung ke Apps

## 1. Bagaimana CMS tersambung ke apps (kondisi nyata)

Tidak ada backend CMS terpisah, tetapi **tidak semua data melewati jalur yang sama**. Ada dua jalur yang harus dibedakan:

```
Marketing site ── anon SELECT + RLS ──► sp_website_config
Website Editor ── authenticated client + admin-only RLS ──► sp_website_config
Customer / agent / insurer / operator / finance portals
             ──► data-gateway (service_role) ──► operational tables
```

- **Konten website** — `services/website.ts` membaca `sp_website_config` langsung melalui Supabase client. Public SELECT memang disengaja agar halaman marketing dapat merender konten CMS saat pengunjung belum login.
- **CMS writes** — `WebsiteEditorAdmin` dan `PromoBannerAdmin` menyimpan konten melalui Supabase Auth session dan harus dibatasi oleh RLS ke role administrator yang benar. UI yang tersembunyi saja bukan kontrol keamanan. Migration awal di repo masih memiliki policy write yang terlalu luas; migration baru pada PR #189 mempersempitnya ke `MASTER_ADMIN` dan `ADMIN`. Jangan menganggap perubahan ini live sampai migration diterapkan dan diuji.
- **Data operasional sensitif** — order, klaim, pembayaran, wallet, komisi, dan data administrasi yang ditandai gateway-only harus tetap melewati action server-side pada `data-gateway`. Jangan menambahkan akses browser langsung ke tabel tersebut.
- **CMS operasional** — banyak menu admin memang menggunakan action `admin_*` di gateway. Menambah menu tanpa memverifikasi action, otorisasi, dan deployment backend hanya menghasilkan layar kosong atau gagal diam-diam.
- **Tidak ada push otomatis dari CMS ke semua app.** Konten website dibaca saat pemuatan halaman/section; perubahan terlihat pada refresh atau pemuatan berikutnya kecuali fitur realtime memang dirancang secara eksplisit.

Konsekuensi rilis: perubahan React naik lewat Vercel; perubahan RLS harus diterapkan lewat alur migrasi Supabase; perubahan action gateway juga memerlukan deploy Edge Function. Ketiganya adalah rilis yang berbeda dan harus diverifikasi masing-masing.

## 2. Masalahnya: CMS ini editor konfigurasi, bukan konsol operasi

Dari 25 menu yang ada, mayoritas menjawab *"atur sekali lalu ditinggal"* — Produk, Rate OJK, Tier & Promo, Database Kendaraan, Editor Website, Perusahaan Asuransi.

Yang menjawab *"jalankan bisnis hari ini"* jauh lebih sedikit, dan bukti kelemahannya nyata:

| Yang terjadi | Kenapa tidak ketahuan |
|---|---|
| 5 order mandek sejak **Juli**, dua sudah APPROVED tapi tidak pernah ditagih | Tidak ada layar "pekerjaan yang macet" |
| **0 invoice** pernah terbentuk sepanjang aplikasi hidup | Tidak ada corong pembayaran; Pembayaran Xendit hanya menampilkan yang sudah ada |
| Pendaftar `@example.com` lolos penuh | Tidak ada layar perilaku pengguna |
| `pathy-agent` tertinggal dua rilis berhari-hari | Tidak ada tampilan kesehatan sistem |

Polanya satu: **CMS bisa menampilkan apa yang ADA, tapi tidak bisa menampilkan apa yang SEHARUSNYA ada tapi tidak terjadi.** Untuk bisnis asuransi, justru yang kedua itu uangnya.

## 3. Bagaimana seharusnya CMS berfungsi

### Lapis 1 — Konsol operasi harian ✅ (dikerjakan di v2.5.16)

Satu layar pertama yang menjawab *"apa yang perlu saya kerjakan pagi ini"*:

- **Antrean bertindak** — order menunggu review, klaim masuk, penarikan menunggu persetujuan, dokumen belum diverifikasi. Diurutkan berdasarkan **umur**, bukan tanggal buat. Order berumur 60 hari harus berteriak.
- **Corong yang bocor** — order dibuat → invoice terbit → dibayar → polis terbit. Angka yang jatuh di antara dua tahap adalah uang yang hilang. Kalau layar ini ada sejak Juli, "5 order / 0 invoice" ketahuan di hari pertama.
- **Macet** — apa pun yang tidak berpindah status lebih dari N hari.

Ini murni komposisi ulang data yang **sudah ada**; tidak butuh tabel baru.

**Terkirim di v2.5.16 sebagai menu Konsol Operasi**, dan sengaja dibangun hanya
di atas `admin_list_orders` + `admin_list_payments` — dua action yang sudah hidup
di gateway produksi sejak 16 Juli. Keduanya diperiksa byte-identical antara versi
terpasang dan repo sebelum dipakai. Konsekuensinya penting: layar ini **tidak
ikut antre di belakang deploy edge function** seperti Jejak Aktivitas, dan
berguna sejak hari ia mendarat.

### Lapis 2 — Pengawasan pengguna (dikerjakan di rilis ini)

`sp_activity_log` + menu **Jejak Aktivitas**. Menjawab "siapa melakukan apa dan mengakses apa", termasuk **percobaan yang ditolak** — bagian yang paling berguna untuk keamanan dan paling sering dilupakan.

Ditulis di **dispatcher** gateway, bukan ditempel di 100+ action. Itu keputusan arsitektural, bukan kemalasan: satu titik yang dilewati semua aksi membuat cakupannya lengkap dengan sendirinya dan tidak bisa dipalsukan klien — alasan yang sama kenapa gerbang kepercayaan (v2.5.6) juga duduk di sana.

**Nilai parameter sengaja tidak pernah disimpan.** Payload aplikasi ini membawa NIK, foto base64, dan kata sandi. Menyalinnya ke tabel audit justru menciptakan salinan kedua dari data yang sedang kita lindungi. Nama kuncinya saja sudah menjawab "mengakses apa".

### Lapis 3 — Kesehatan sistem

CMS seharusnya jadi tempat pertama yang memberi tahu bahwa sesuatu mati, bukan tempat terakhir:

- Versi edge function terpasang vs versi repo
- Rahasia Vault yang kosong (`FONNTE_TOKEN`, `RESEND_API_KEY` sampai sekarang belum diisi)
- Kanal notifikasi yang gagal
- Advisor keamanan Supabase

### Lapis 4 — Konfigurasi (yang sudah ada sekarang)

Tetap seperti sekarang, tapi turun prioritas. Ini yang jarang disentuh.

## 4. Urutan yang disarankan

1. ~~**Jejak Aktivitas**~~ — selesai di v2.5.14, **menunggu deploy gateway**
2. ~~**Antrean bertindak + corong**~~ — selesai di v2.5.16, **sudah live** (tanpa deploy gateway)
3. **Kesehatan sistem** — mencegah terulangnya "tertinggal berhari-hari tanpa sadar"
4. Konfigurasi — biarkan

Urutan 1 dan 2 tertukar dalam praktik, dan itu pelajarannya sendiri: fitur yang
bisa disusun dari action yang **sudah ter-deploy** mendarat utuh, sementara yang
butuh action baru berhenti di separuh jalan. Saat merencanakan fitur CMS
berikutnya, periksa dulu apakah pertanyaannya bisa dijawab dari action yang ada.

## 5. Yang harus diingat setiap menambah fitur CMS

> Fitur CMS yang membaca data baru = **action gateway baru** = **deploy edge function**.

Selama koneksi Supabase↔GitHub belum dibuat, setiap fitur CMS baru akan mendarat setengah jalan: layarnya hidup lewat Vercel, datanya kosong sampai gateway ter-deploy. Itu bukan bug, itu konsekuensi arsitektur yang perlu diingat saat merencanakan.
