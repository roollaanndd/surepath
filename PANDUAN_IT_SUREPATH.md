# 📘 PANDUAN LENGKAP PENGEMBANGAN SISTEM SUREPATH
**Dokumen Estafet Teknologi & IT (Handover Guide)**
**Tanggal Dokumentasi:** 19 Mei 2026

Dokumen ini ditulis secara khusus sebagai panduan komprehensif bagi Tim IT dan CTO baru. Tujuannya adalah untuk memahami seluruh struktur arsitektur, basis data, *tech stack*, dan langkah selanjutnya untuk memigrasi aplikasi dari fase simulasi (MVP) menuju Production-Ready.

---

## 1. PENDAHULUAN & OVERVIEW APLIKASI
**SurePath** adalah platform Insurtech (Insurance Technology) mutakhir. Aplikasi ini bertindak ganda sebagai:
1. **Portal Konsumen (B2C & B2B2C):** Menerima pembelian polis asuransi secara instan via antarmuka "Wizard" yang sangat ramah pengguna.
2. **Dashboard Manajemen Admin (HQ):** Melihat metrik Gross Written Premium (GWP), Monthly Recurring Revenue (MRR), daftar pengguna/agen, laporan komisi, klaim, hingga mengkonfigurasi produk baru secara on-the-fly.

Saat ini, keseluruhan aplikasi dapat berjalan 100% pada simulator *frontend-only* dengan menggunakan memori berbasis peramban (IndexedDB) guna memperlancar demonstrasi MVP.

---

## 2. SPESIFIKASI TEKNOLOGI (TECH STACK)
*   **Bahasa Pemrograman:** TypeScript, CSS, HTML5.
*   **Framework Frontend:** React 18, Vite (sebagai *build tool* secepat kilat).
*   **Styling (Perwajahan UI):** Tailwind CSS terintegrasi untuk pendekatan desain utilitas (*utility-first*), didukung animasi perpindahan layar.
*   **Manajemen Database:** Dexie.js (pembungkus IndexedDB di *client-side* untuk simulasi database relasional).
*   **Grafik & Laporan:** Recharts untuk melukis kurva, bar, dan metrik GWP/MRR yang kompleks di halaman Admin.
*   **Ikonografi:** Lucide-React.

---

## 3. ARSITEKTUR KODE & LOKASI FILE (DIRECTORY MAP)
Untuk melanjutkan *development*, tim IT wajib memahami hirarki file berikut:

*   **`src/App.tsx` (Pusat Kendali / Entry Point):**
    Mengatur proses penentuan jenis _view_ ("Switching Route" sederhana untuk home, wizard asuransi mobil/travel, admin, dll). Ini juga menangani autentikasi basis Firebase.
*   **`src/db.ts` (Mesin Simulasi Database):**
    Inilah "jantung data" platform saat ini. Terdapat deklarasi struktur tabel, dan fungsi raksasa `seedDatabase()` yang men-generate ~3.000 user dan puluhan ribu data transaksi dari 2023 hingga 2026 untuk keperluan demo.
*   **`src/types.ts`:**
    Menyimpan skema TypeScript secara ketat (`User`, `Transaction`, `Polis`, `Role`, dll). Sangat disarankan membaca file ini sebelum memanipulasi _state_ apapun.
*   **`src/constants.ts`:**
    Pusat referensi statis untuk logika harga OJK, harga asuransi perjalanan (Travel), _benefit_, hingga daftar merek mobil.
*   **`src/components/admin/`:**
    Mengontrol semua rahasia administrasi perusahaan (Laporan Transaksi, GWP, dll). Khususnya `AdminViews.tsx` dan `AdminPortal.tsx`.
*   **`src/components/*InsuranceWizard.tsx`:**
    Setiap asuransi memiliki antarmuka wizard yang terpisah. Misalnya `CarInsuranceWizard.tsx` khusus mobil, `CustomInsuranceWizard.tsx` untuk asuransi buatan mandiri dari menu produk admin.

---

## 4. BAGAIMANA MENGATUR PRODUK DINAMIS (CUSTOM PRODUCTS)
Aplikasi memiliki kapabilitas mutakhir di mana fungsi administrasi (CTO/Manajemen) dapat membuat produk asuransi baru langsung dari Dashboard.
1. Admin masuk ke halaman **Settings (Konfigurasi Sistem)**.
2. Form **Tambah Produk Baru** akan menyimpan data (Nama, Premi Dasar, Rate Persentase) ke tabel `customProducts` di Dexie DB.
3. Di *Layer Home*, `App.tsx` merender ikon produk tersebut (ditandakan sebagai `custom_${id}`).
4. Saat User klik, platform menggunakan `CustomInsuranceWizard.tsx` untuk menahan transaksi dan menalangi _logic_ pembelian asuransi buatan tersebut.

---

## 5. SKEMA DATABASE (DEXIE / INDEXEDDB)
Tim Backend perlu mentranslasikan tabel ini ke PostgreSQL / Firebase di fase produksi:
1.  **`users`**: Akun pengguna, peran (ADMIN/CUSTOMER/FINANCE), dan riwayat e-commerce.
2.  **`policies`**: Daftar polis aktif yang telah terbayar.
3.  **`claims`**: Laporan permintaan pencairan asuransi.
4.  **`transactions`**: Ledger absolut dari masuk keluarnya uang. Menjadi tiang utama penghitungan laporan finansial GWP/MRR yang dirancang sejak tahun 2023 hingga hari ini (2026).
5.  **`customProducts`**: Produk buatan admin.

---

## 6. CARA KERJA SISTEM (PROSEDUR JALANKAN DI LOKAL)
Tim Anda dapat me-*running* (mengeksekusi) kodenya di dalam mesin Mac/Windows/Linux:

1. Prasyarat: Terinstal **Node.js versi 18+** atau lebih baru.
2. Buka Terminal lokal & unduh repositori dari Github.
3. Menjalankan perintah instalasi pustaka (*Library*):
   ```bash
   npm install
   ```
4. Jalankan mode pengembangan (*Hot Reloading*):
   ```bash
   npm run dev
   ```
5. Untuk kompilasi/deployment (Nginx, Vercel, Netlify):
   ```bash
   npm run build
   ```

---

## 7. MILESTONE SELANJUTNYA UNTUK TIM IT / CTO (KEY ROADMAP)
Aplikasi ini sudah berwujud siap pakai (Production-Grade UI), namun dari segi _backend_ masih bersifat independen dan diamankan per _browser_ (Indexed DB).

Tugas selanjutnya untuk CTO Baru:
1. **Pilih Cloud Provider:** Buat Instance PostgreSQL di Google Cloud SQL, RDS AWS, atau Supabase.
2. **Kembangkan API Layer:** Ubah pemanggilan `db.transactions.toArray()` menjadi pemanggilan HTTP `fetch("https://api.surepath.id/v1/transactions")`.
3. **Sistem Payment Gateway Asli:** Buatkan koneksi ke **Midtrans** / **Xendit**, di mana pembayaran asuransi akan mengubah status polis dari `PENDING` jadi `ACTIVE` berdasarkan _Webhook_ konfirmasi uang masuk.
4. **Login Skala Produksi:** Aktivasi penuh Autentikasi Google/SSO dan JWT Token untuk pertukaran _Session_ via Backend Server.
5. **Storage Media:** Integrasikan Firebase Storage atau S3 untuk mengakomodir unggahan foto kondisi mobil saat pelanggan melakukan klaim atau input OCR KTP dan STNK.

---
**Tanda Tangan Elektronik Handover,**
*(Direksi / CTO Lama)*
