# Dokumen Handover Spesifikasi Teknis - SurePath
**Tanggal Efektif:** 9 Mei 2026
**Dari:** [Nama Anda/CTO Lama]
**Kepada:** [Nama CTO Baru] & Tim Development SurePath Baru

---

## 1. Ringkasan Eksekutif (Executive Summary)
**SurePath** adalah platform Insurtech komprehensif yang dirancang untuk mempermudah penjualan, manajemen, dan pelaporan asuransi. Platform ini memiliki frontend interaktif yang membantu pengguna (pelanggan) membeli polis dengan mudah melalui fitur *Wizard*, dan sebuah *Dashboard Admin* untuk memantau performa finansial (GWP, MRR), manajemen klaim, konfigurasi sistem, dan manajemen produk tambahan (Custom Products).

## 2. Tech Stack
*   **Core Framework:** React 18, TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **Iconography:** Lucide-React
*   **Database (Mock/Lokal):** Dexie.js (IndexedDB wrapper)
*   **Visualisasi Data:** Recharts
*   **Authentication:** Firebase Auth (terintegrasi dasar)

## 3. Arsitektur Repositori (Project Structure)
Struktur *codebase* didesain agar modular dan mudah diperluas (*scalable*):

*   `App.tsx`: Titik masuk aplikasi (Entry Point). Mengatur *routing* ke halaman beranda, wizard pembelian asuransi, dan portal admin. Secara dinamis juga memuat produk dari DB (Custom Products).
*   `db.ts`: Konfigurasi Database Lokal (Dexie). Menyimpan skema tabel (`users`, `policies`, `claims`, `transactions`, `auditLogs`, `providers`, `customProducts`). File ini juga memuat logika *seeding* (Data generator historis 2023-2026).
*   `types.ts`: Berisi definisi tipe TypeScript dan skema data sentral (Enum `Language`, `UserRole`, `InsuranceType`, dll).
*   `constants.ts`: Pusat konfigurasi statis, seperti batas tarif (rate) asuransi resmi OJK, harga dasar asuransi perjalanan, properti, daftar mobil, dan benefit proteksi.
*   `components/`:
    *   `admin/`: Kode reaktor Dashboard Admin yang spesifik, termasuk laporan GWP, MRR harian/bulanan (`AdminViews.tsx` & `AdminPortal.tsx`).
    *   `car-wizard/`: Komponen UI spesifik untuk memandu workflow (Wizard) asuransi mobil dan UI *shared* seperti *SmartBot* & *Cards*.
    *   `*InsuranceWizard.tsx`: Kumpulan logic langkah demi langkah setiap produk asuransi (Motor/Mobil, Travel, PA, MPAR, Custom).

## 4. Logika Bisnis & Fitur Kunci

### A. Generator Data & Ledger Keuangan
Karena ketiadaan *backend database* sungguhan pada tahap ini, setiap kali aplikasi dibuka (jika belum tersimpan migrasi di *localStorage* `SP_DB_MIGRATED_2023`), fungsi `seedDatabase` di `db.ts` akan membangun:
- ~3.000 user fiktif (`@gmail.com`), dengan >120 agen aktif.
- Transaksi harian dari 2023 hingga tahun 2026 berjalan (dikunci hingga *current date*). Total MRR dan GWP akan muncul rasional (fluktuatif per bulan, average ~$166k di 2026 dengan konversi rate 1 USD = 16.000 IDR).

### B. Custom Products Module
Platform sudah mendukung penambahan produk secara dinamis "*On the Fly*":
- Admin mensetting produk baru dan persentase preminya di `SettingsView` (Portal Admin).
- Data direkam ke dalam IndexedDB `customProducts`.
- `App.tsx` me-render menu secara otomatis di Beranda Pengguna.
- Proses pembelian dialihkan secara aman menggunakan `CustomInsuranceWizard.tsx`.

## 5. Deployment & Github Exporting

**Cara Eksport ke GitHub:**
Jika Anda dan tim menggunakan editor Google AI Studio, mengekspor kode bisa dilakukan dengan cara mengklik menu titik tiga (Options/Settings) -> **Export to GitHub** atau bisa men-download file `.zip`. Anda dapat juga mereset *remote git* melalui command CLI lokal Anda:

```bash
git init
git add .
git commit -m "Initialize Handover SurePath project"
git remote add origin https://github.com/YourOrg/surepath.git
git branch -M main
git push -u origin main
```

**Build & Run lokal (Node JS requirement: >18):**
```bash
npm install
npm run dev      # Untuk development (Port 3000)
npm run build    # Untuk production build
```

## 6. Peta Jalan & Isu Berjalan (Roadmap)

Untuk fase *Production V1*, CTO dan tim baru direkomendasikan menyelesaikan hal berikut:
1.  **Backend Migration:** Dexie.js (IndexedDB) harus dipensiunkan; semua logika koneksi data dipindahkan menggunakan Supabase, Firebase Cloud Firestore, atau Express Middleware + PostgreSQL.
2.  **Payment Gateway:** Integrasi ke Midtrans atau Xendit. Logika checkout asuransi harus dimigrasi dari mock `status: 'SUCCESS'` ke webhook asinkron.
3.  **Authentication & KYC Flow:** Alur verifikasi KTP dan dokumen mobil masih bersifat *mock up*. Butuh OCR integration ke depannya.
4.  **Error Handling & Edge Cases:** Tingkatkan efisiensi render halaman Laporan Admin ketika total transaksi melebihi 100.000 *row* data (Perlu server-side pagination).

---
*Dokumen ini merupakan panduan estafet teknis. Untuk melihat dokumen ini maupun untuk mencetaknya, klik ikon Markdown / View pada file `HANDOVER.md` pada direktori file, Anda kemudian bisa melakukan klik Kanan > Print to PDF, atau copy/paste ke Excel & Word sesuai preferensi korporasi Anda.*
