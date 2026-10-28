# Spesifikasi Redesign UI/UX — Admin CMS & Agent App SurePath

**Versi** 1.0 · **28 Okt 2026** · **Status** usulan review
**Lingkup** Admin CMS (gelombang 1), lalu Agent App. **Non-goal:** perubahan kode, backend, skema data, auth.
**Bukti:** pembacaan kode `surepath-app`; tiap klaim punya rujukan baris.

**Legenda:** `AP`=admin/AdminPortal.tsx · `AV`=admin/AdminViews.tsx · `AU`=admin/adminUI.tsx · `AG`=agent/AgentPortal.tsx · `AH`=AgentHome.tsx · `AW`=AgentWallet.tsx · `AQ`=AgentQuoteBuilder.tsx · `VW`=VehicleUnderwritingWizard.tsx · `DS`=docs/DESIGN_SYSTEM.md

## 1. Temuan

| # | Temuan | Bukti | Dampak |
|---|--------|-------|--------|
| 1 | Navigasi admin **29 item**, 6 grup; mobile hanya drawer 29 item. Brief menyebut 28; kode 29. | AP:74–126, 952–955 | Scroll 2 layar; item setara bersaing. |
| 2 | Hierarki: hero ilustrasi 72px di tiap view; dashboard 9 KPI + 4 panel tanpa daftar tugas. | AP:1085–1097, 635–697, 701–821 | Konten turun ±180px; prioritas tak terjawab. |
| 3 | Polling 120 dtk, kegagalan senyap, tanpa penanda kesegaran. | AP:286, 293–294, 297 | Angka basi tanpa sinyal. |
| 4 | CMS light-only, 75 `text-white` di AdminViews; catatan reviewer dan nilai drawer klaim putih di atas putih. | AP:220–231; AV:708, 185, 266 | Teks tak terbaca pada aksi kritis. |
| 5 | Review polis terpecah 2 menu; kartu hanya identitas+premi; catatan tolak divalidasi setelah klik. | AV:663, 683–684, 639–642, 688–701 | Order dicari ulang; keputusan tanpa dokumen. |
| 6 | Verifikasi mitra = toggle tanpa konfirmasi/alasan/dokumen; penarikan `load()` tanpa `catch` → spinner abadi. | AV:1688–1693, 1929–1940, 2818–2823 | Mitra aktif tanpa bukti; antrean seolah kosong. |
| 7 | Agent 5 tab, 12 rute; 7 layar (klien, klaim, dompet, peringkat, perpanjangan, jaringan, endorsement) tak terjangkau dari tab. | AG:46–52, 262–346 | Fitur ada, tidak ditemukan. |
| 8 | Dua layar uang (Komisi, Dompet) dengan status berbeda; GWP beranda = `komisi × 8`. | AG:301–304; AW:27–45; AH:260–261 | Dua "saldo" tanpa otoritas; metrik karangan. |
| 9 | Quote motor = 1 layar produk + **7 langkah** full-screen; tab bar hilang. | VW:2060, 2104, 2063–2066 | 8 layar per quote; konteks hilang. |
| 10 | 699 kelas teks ≤0.65rem (≈10px); 3 primitif 0 konsumen (`AdminStatusBadge`, `AdminPageHeader`, `AdminSectionCard`); DS tak menyebut Admin/`ds-`. | AU:54, 89, 164, 182; AV:663; DS:4 | Di bawah minimum 12px; tiap view menulis ulang badge/header/state. |

**Pertahankan:** Antrean Klaim (AV:2084–2117) sebagai pola acuan; `adminUI.tsx`; autosave draf (AQ:156–217); `lib/statusMeta`.

## 2. Information Architecture

### 2.1 Admin — 6 grup, 18 item (dari 29)

| Grup | Item | Perubahan |
|------|------|-----------|
| Hari Ini | Ringkasan (tab: Ikhtisar, Konsol, Analitik), **Tugas Saya** | Dashboard+Konsol+Analytics → 1; 4 antrean → 1 inbox |
| Polis & Klaim | Pesanan Polis (tab default **Perlu Keputusan**), Klaim, Endorsement, Dokumen | Antrean Review jadi tab |
| Mitra | Mitra (tab: Verifikasi, Tier, Perjanjian, B2B), Pengguna | Mitra+Perjanjian+B2B → 1; Pengguna & Akses → Pengguna |
| Keuangan | Transaksi (tab: Pembayaran, Penarikan), Komisi, Laporan | Pembayaran+Penarikan → Transaksi |
| Katalog & Harga | Produk, Harga & Rate (tab: OJK, Kendaraan), Tier & Promo | 3 menu harga → 1 |
| Sistem | AI & Pathy, Konten Web, Jejak & Keamanan, Pengaturan | 3 menu AI → 1; Website+Icon → 1 |

**17 item turun jadi tab:** Antrean Review, Konsol, Analytics, Perjanjian, B2B, Pembayaran, Penarikan, Asuransi, Rate OJK, Kendaraan, Website, Icon, AI Admin, AI Finance, Pathy, Jejak, Keamanan. Tak ada kapabilitas dihapus. Maksimal 6 grup; grup tanpa akses peran disembunyikan. Mobile <1024px: bottom bar 5 (Hari Ini, Polis, Mitra, Keuangan, Lainnya) + pencarian sticky; tabel → kartu <768px.

### 2.2 Agent — 5 tab

| Tab | Isi | Menyerap |
|-----|-----|----------|
| Beranda | 3 KPI, Tugas hari ini, Pathy, kartu jaringan & peringkat | home, leaderboard, network |
| Klien | CRM, tambah klien | clients |
| Buat (tengah) | Quote builder | quotes |
| Polis | tab: Pesanan, Perpanjangan, Klaim, Perubahan | policy, renewals, claims, endorsements |
| Dompet | tab: Riwayat, Penarikan, Rekening | commission, wallet |

Profil keluar dari tab bar, tetap lewat avatar header (AG:382) — ini membebaskan slot kelima; notifikasi tetap di bell (AG:379). Hasil: 12 rute → 5 tab, **0 layar yatim**, kedalaman ≤2 tap.

### 2.3 Kontrak lintas portal (syarat produk)

Data yang diisi di app harus terlihat di admin, dan konfigurasi admin harus menjadi dasar app. Maka: (a) tiap entitas membawa `sumber` + `waktu` yang tampil di drawer admin; (b) produk, tier, dan rate membawa `versi` + `tanggal berlaku`, tampil sebagai `SyncIndicator` mode 2 di app; (c) app membaca konfigurasi aktif, bukan salinan lokal; (d) satu kosakata status untuk kedua portal.

## 3. Tiga flow terpendek

| Tugas | Sekarang | Usulan | Metrik terima |
|-------|----------|--------|---------------|
| **Review polis** | 7 langkah, 2 menu, tanpa dokumen (AV:663–701) | **3 langkah:** Tugas Saya → drawer checklist 4 bukti (identitas, kendaraan, pembayaran, dokumen) + preview PDF → "Setujui & terbitkan" / "Minta perbaikan" (alasan wajib) | median SUBMITTED→ISSUED −30%; 0 terbit tanpa dokumen |
| **Verifikasi mitra** | 2 langkah, tanpa bukti (AV:1688–1693) | **3 langkah:** antrean → drawer 4 cek (KTP, perjanjian, rekening, kontak) → "Setujui & aktifkan"; revoke wajib alasan | 0 mitra aktif tanpa dokumen; 100% aksi berjejak |
| **Quote motor** | 8 layar (produk + 7) (VW:2060) | **4 layar:** Kendaraan (plat → model/harga otomatis) → Klien (walk-in default) → Jaminan & premi live → Ringkasan & kirim | ≤4 layar; drop-off per layar <10%; draf selalu tersimpan |

Memperpendek flow ≠ menghapus kontrol: verifikasi memakai checklist yang memblokir, bukan tombol bebas.

## 4. Komponen bersama wajib (8)

| Komponen | Anatomi | State wajib | Dipakai |
|----------|---------|-------------|---------|
| `PageHeader` | breadcrumb, judul, meta "diperbarui", 1 aksi primer | default, disabled, sticky | admin, agent |
| `Kpi` | label, nilai, delta, sumber, tautan | skeleton, nol, error | keduanya |
| `StatusBadge` | ikon + label + warna dari satu `statusMeta` | 12 status + unknown | keduanya |
| `EmptyState` | ikon, sebab, aksi | kosong-awal, kosong-filter, tanpa-akses | semua daftar |
| `ErrorBanner` | pesan, retry, waktu | gagal-sebagian, gagal-total, retrying | keduanya |
| `DataTable`+`FilterBar` | kolom, sort, chip, cari, header sticky | loading, kosong, error, kartu mobile | Polis, Klaim, Transaksi, Mitra |
| `DetailDrawer` | 480px, ringkasan, checklist, aksi sticky, Esc + focus trap | default, dirty, submitting, error | Review, Verifikasi, Klaim |
| `SyncIndicator` | "Tersinkron 12:04"; mode 2 "Produk v12 · berlaku 1 Nov" | segar, tertunda, gagal, offline | header keduanya |

Aturan: tak ada badge/header/empty state baru per view; semua status dari `lib/statusMeta`; satu breakpoint mobile.

## 5. Sprint & kriteria terima

| Sprint | Isi | Kriteria terima (teruji) |
|--------|-----|--------------------------|
| **S1 Fondasi + shell admin** | `adminUI` → `shared/ds`; 8 komponen; IA 18 item; hapus hero per-view; bottom bar admin | Menu ≤6 grup & ≤18 item semua peran; `text-white` pada surface terang = 0 di 5 view prioritas; tiap view punya PageHeader + 1 aksi; a11y ≥95 |
| **S2 Antrean admin** | Perlu Keputusan (tabel+drawer+setujui&terbitkan); verifikasi mitra; Klaim & Penarikan pakai komponen sama | 20 order uji: median submit→ISSUED −30%; terbit disabled tanpa dokumen; gateway gagal → banner+retry; 4 view punya 4 state |
| **S3 Agent + dompet + quote** | 5 tab; hapus 7 rute yatim; gabung Komisi+Dompet; wizard motor 4 layar | Tiap rute ≤2 tap; quote ≤4 layar; indikator draf di semua langkah; metrik `×8` dihapus; tab bar terlihat |
| **S4 Paritas & hardening** | Chip provenance konfigurasi; satu kosakata status; tabel→kartu; copy & a11y | 1 status = 1 label di 2 portal (uji 12); ubah produk/tier di admin → terlihat di app ≤1 refresh, dan quote/klien baru dari app → muncul di admin ≤1 refresh; 0 teks <12px di 10 layar; 390px tanpa scroll horizontal |

Urutan ini karena admin sumber konfigurasi; agent mengonsumsi setelah kontrak status stabil.

## 6. Perlu keputusan (to-be-confirmed)

- **Lapisan warna & tipe:** `sp-*` (DS) vs `ds-*` (admin). Usul: `ds-*` kanonik, `sp-*` alias — perlu persetujuan design owner.
- **Sumber komisi:** `AgentCommission` atau `AgentWallet`? Saldo keduanya berbeda (AG:301–304).
- **"Setujui & terbitkan"** butuh nomor polis otomatis + template PDF — konfirmasi engineering; fallback: terbit setelah unggah.
- **Syarat verifikasi mitra** (KTP/AAUI) tak ada di kode — konfirmasi compliance sebelum checklist dikunci.
