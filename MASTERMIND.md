# 🧠 SUREPATH MASTERMIND & ARCHITECTURE WORKSPACE
**Version 1.0 - Architecture & Application Flow**
**Date:** May 2026

Dokumen ini adalah cetak biru (blueprint) lengkap dari sistem SurePath. Dokumen ini merangkum *flowchart* aplikasi, arsitektur data, dan tata kelola manajemen state, yang akan berfungsi sebagai pondasi pengembangan (scaling up) ke depannya.

---

## 1. APPLICATION FLOW CHART (ALUR APLIKASI)

Alur di bawah ini memetakan perjalanan pengguna (User Journey) dan administrator di dalam platform SurePath.

```text
[ CUSTOMER JOURNEY (PENGGUNA) ]
   │
   ├── 1. Landing Page (Portal Utama)
   │      - Orientasi Produk & Bahasa (ID/EN)
   │      - Autentikasi (Firebase OTP / Mock Sign in)
   │
   ├── 2. Dashboard Pilihan Asuransi
   │      - Mobil (Smart Scan AI)
   │      - Travel (Direct Payout)
   │      - Kecelakaan Diri (PA) 
   │      - Custom (Produk buatan Admin)
   │
   ├── 3. Wizard Formulir (Multi-Step UI)
   │      - Input Data Personal / Kendaraan
   │      - Ringkasan Harga (Dynamic Pricing OJK)
   │      - Review Final
   │
   ├── 4. Proses Pembayaran (Gateway)
   │      - Transaksi status: PENDING -> SUCCESS
   │      - Polis Resmi Diterbitkan (Active)
   │
   └── 5. Manajemen Klaim & Histori
          - Pengguna mengajukan klaim baru
          - Menunggu persetujuan (Menjadi status PENDING_REVIEW)


[ ADMIN / HQ JOURNEY (MANAJEMEN) ]
   │
   ├── 1. Akses Portal (Role: ADMIN / MASTER_ADMIN)
   │      - Validasi otorisasi di App.tsx
   │
   ├── 2. Dashboard Analitik
   │      - Hitung Gross Written Premium (GWP) via Chart Recharts
   │      - Monthly Recurring Revenue (MRR)
   │      - Rasio Klaim (Loss Ratio)
   │
   ├── 3. Modul Produk Dinamis (Settings)
   │      - CTO / Admin dapat meracik produk asuransi baru
   │      - Tentukan Nama, Premi Dasar, Risiko (%)
   │      - Tampil instan di aplikasi B2C untuk dibeli pelanggan
   │
   └── 4. Approval Center
          - Eksekusi Klaim yang masuk (Approve / Reject)
          - Distribusi komisi ke dompet agen (Agents Wallet)
```

---

## 2. STATE MANAGEMENT & DATA FLOW

Karena sistem dibangun menggunakan React 18, arsitektur State-nya dioptimasi agar gesit di sisi *client*.

*   **Pusat Rute & Otorisasi (`App.tsx`):**
    Menggunakan *Local State* `currentPage` untuk transisi halaman (Simulasi *Router*) karena aplikasi berjalan dalam cangkang MVP tanpa lag memori berlebih. Status kredensial pengguna disimpan dalam `currentUser` dan di-*backup* oleh `localStorage`.
*   **Lapisan Database (`db.ts` dengan Dexie.js):**
    Kita tidak menggunakan Redux atau Context API yang berat untuk data asuransi. Setiap komponen mengakses data langsung ke-database virtual `IndexDB` di peramban pengguna. Metode ini *sangat ringan* dan menjamin respons aplikasi tanpa latensi.
*   **Dynamic Polling (UI Updates):**
    Dasbor Admin menggunakan `useLiveQuery` dari Dexie-react-hooks sehingga setiap transaksi atau perubahan data (Klaim, Pembelian Polis) akan secara instan mengubah metrik grafik tanpa perlu me-refresh halaman (*Reactive Data Pipeline*).

---

## 3. DEPLOYMENT PIPELINE (SKENARIO GO-LIVE)

Untuk mengantarkan aplikasi ini menuju skalabilitas produksi 1 Juta Pengguna, ini adalah panduan Pipeline Cloud yang harus ditindaklanjuti.

1.  **Frontend Engine (Vercel / AWS Amplify):**
    Lakukan deployment hasil kompilasi `npm run build` (folder `dist/`) ke CDN modern. Sistem berbasis SPA (*Single Page Application*) dari Vite ini akan memiliki waktu muat di bawah 1 detik.
2.  **Backend Services (Dockerized Node.js API / Go):**
    Pisahkan file `db.ts` dan bangun lapisan abstraksi API. API ini akan berhubungan dengan database ter-enkripsi.
3.  **Database Migration (Postgres):**
    - Konversi struktur `db.users`, `db.transactions`, `db.policies` ke SQL Tables.
    - Implementasikan Indeksing (B-Tree) pada kolom `userId` di tabel `policies` agar query histori pengguna tetap kilat saat dimuat.
4.  **Security & OAuth (Firebase Production):**
    Ganti *Mock Authentication* menjadi *Production Firebase Auth* (SSO Google, Apple, atau Phone OTP) agar keamanan akses sepenuhnya dikendalikan *Auth-Server*.

---
**Dokumentasi Oleh:** Tim Developer SurePath 
*Pondasi ini siap untuk di-scale up kapan pun oleh Tim IT eksekutor.*
