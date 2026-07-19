# SurePath — Keyword Map (Phase 2)

**Status:** Phase 2 dari 10
**Terakhir diperbarui:** 2026-07-19
**Prasyarat:** `docs/SEO_ARCHITECTURE.md` (Phase 1 — silo & URL structure)

## Catatan Metodologi — PENTING

Semrush MCP tersedia di environment ini tapi **akun kehabisan API unit** saat dokumen ini dibuat — tidak ada data live yang bisa ditarik. Angka volume di bawah adalah **estimasi** berdasarkan pola pencarian asuransi Indonesia yang diketahui, dan disilangkan dengan angka yang sudah ada di `docs/marketing-growth-plan.md` §1.1 (dibuat sesi sebelumnya, sumber yang sama) supaya tidak ada 2 angka berbeda untuk keyword yang sama di 2 dokumen.

**Sebelum eksekusi budget/prioritas final:** jalankan ulang riset ini lewat Semrush (`keyword_research` → Indonesia database) atau Google Keyword Planner begitu unit tersedia, lalu update tabel ini. Estimasi di sini cukup andal untuk **urutan prioritas relatif** (mana yang lebih besar dari mana) tapi jangan dipakai sebagai angka absolut untuk proyeksi traffic/revenue.

---

## 1. Kluster Keyword Master — per Search Intent

Setiap keyword diberi label intent (bisa lebih dari satu — mis. "asuransi mobil murah" adalah Commercial DAN Purchase Intent). Volume = estimasi/bulan, Indonesia.

### 1.1 Informational

| Keyword | Vol/mo (est.) | Vertikal | URL Target |
|---|---|---|---|
| apa itu asuransi all risk | 8,100 | Mobil | `/glosarium/all-risk` |
| apa itu asuransi tlo | 5,400 | Mobil | `/glosarium/tlo` |
| perbedaan asuransi all risk dan tlo | 6,600 | Mobil | `/perbandingan/asuransi-all-risk-vs-tlo` |
| cara kerja asuransi mobil | 3,600 | Mobil | `/asuransi-mobil` (hub) |
| apa itu deductible asuransi | 1,900 | Umum | `/glosarium/deductible` |
| apa itu uang pertanggungan | 2,900 | Jiwa/PA | `/glosarium/uang-pertanggungan` |
| apa itu premi asuransi | 4,400 | Umum | `/glosarium/premi` |
| syarat asuransi mobil | 2,400 | Mobil | `/asuransi-mobil/premi` |
| asuransi mobil itu wajib atau tidak | 1,300 | Mobil | `/blog/mobil/...` |
| apa itu SRCC dalam asuransi | 880 | Mobil | `/glosarium/srcc` |

### 1.2 Commercial (investigation sebelum beli)

| Keyword | Vol/mo (est.) | Vertikal | URL Target |
|---|---|---|---|
| asuransi mobil murah | 40,500 | Mobil | `/asuransi-mobil` |
| asuransi mobil terbaik | 14,800 | Mobil | `/asuransi-mobil` |
| asuransi kesehatan terbaik | 22,000 | Kesehatan | `/asuransi-kesehatan` |
| asuransi jiwa terbaik indonesia | 9,900 | PA/Jiwa | `/asuransi-kecelakaan-diri` |
| asuransi perjalanan ke luar negeri | 8,100 | Perjalanan | `/asuransi-perjalanan/internasional` |
| asuransi mobil all risk terbaik | 5,400 | Mobil | `/asuransi-mobil/all-risk` |
| asuransi hp / proteksi gadget | 4,400 | Proteksi Barang | `/proteksi-barang` |
| asuransi mobil online bayar bulanan | 2,900 | Mobil | `/asuransi-mobil/premi` |

### 1.3 Transactional (siap beli)

| Keyword | Vol/mo (est.) | Vertikal | URL Target |
|---|---|---|---|
| beli asuransi mobil online | 6,600 | Mobil | `/asuransi-mobil` → CTA checkout |
| daftar asuransi mobil | 3,600 | Mobil | `/asuransi-mobil` → CTA |
| harga asuransi mobil all risk | 5,400 | Mobil | `/asuransi-mobil/all-risk` |
| premi asuransi mobil 2026 | 18,000 | Mobil | `/asuransi-mobil/premi` |
| beli asuransi kesehatan online | 4,400 | Kesehatan | `/asuransi-kesehatan` |
| kalkulator premi asuransi mobil | 2,900 | Mobil | `/kalkulator` |

### 1.4 Navigational

| Keyword | Vol/mo (est.) | Catatan | URL Target |
|---|---|---|---|
| surepath | — (brand, low baseline naik seiring campaign) | brand awareness | `/` |
| myinsurepath | — | brand | `/` |
| surepath asuransi | — | brand + kategori | `/` |
| login surepath | — | existing customer | `/custapp` (noindex — behind auth, tidak masuk sitemap publik) |

### 1.5 Local

| Keyword | Vol/mo (est.) | Vertikal | URL Target |
|---|---|---|---|
| asuransi mobil jakarta | 2,400 | Mobil, Zona 1 OJK | `/asuransi-mobil/premi/zona-1` |
| asuransi mobil surabaya | 1,300 | Mobil, Zona 2 OJK | `/asuransi-mobil/premi/zona-2` |
| asuransi mobil bandung | 1,000 | Mobil, Zona 1 OJK | konten dalam `/asuransi-mobil/premi/zona-1` (bukan halaman kota terpisah — lihat catatan Phase 4) |
| agen asuransi terdekat | 1,600 | Trust/Local | `/agent` (existing) |

**Catatan Phase 4 (Programmatic SEO):** volume per-kota individual (di luar Jakarta/Surabaya/Medan/Bandung) umumnya terlalu kecil untuk halaman kota sendiri-sendiri — lebih efisien di-cover lewat **3 halaman Zona OJK** (`/asuransi-mobil/premi/zona-1|2|3`, tiap zona listing kota-kota anggotanya) daripada 30+ halaman kota tipis yang berisiko thin/duplicate content. Ini keputusan desain yang membatasi Phase 4 supaya tidak melanggar prinsip "avoid duplicate content" di brief.

### 1.6 Brand (kompetitor + perbandingan)

| Keyword | Vol/mo (est.) | Vertikal | URL Target |
|---|---|---|---|
| asuransi mobil zurich | 3,600 | Kompetitor/partner | `/perbandingan/surepath-vs-zurich-langsung` (hati-hati positioning — Zurich adalah mitra penyedia, bukan kompetitor, lihat catatan di bawah) |
| asuransi sinarmas vs allianz | 1,900 | Kompetitor | `/perbandingan/...` |
| tugu insurance vs sompo | 720 | Kompetitor | `/perbandingan/...` |

**Catatan penting:** JSON-LD global (`index.html`) menyebut Zurich, Tugu, Sinar Mas, Sompo, Intra Asia sebagai **mitra** SurePath (bukan kompetitor — SurePath adalah platform yang menyalurkan ke mereka). Konten "perbandingan" untuk nama-nama ini harus diframe sebagai "beli produk [Mitra] lewat SurePath vs beli langsung" (value prop: kemudahan platform, bukan produk lebih murah — karena tarif OJK sama), BUKAN sebagai perbandingan head-to-head produk asuransi. Positioning yang salah di sini berisiko konflik dengan mitra penyedia asuransi.

### 1.7 Question (People Also Ask / voice search)

| Keyword | Vol/mo (est.) | Vertikal | URL Target |
|---|---|---|---|
| bagaimana cara klaim asuransi mobil | 12,000 | Mobil | `/asuransi-mobil/klaim` |
| berapa lama proses klaim asuransi mobil | 2,400 | Mobil | `/asuransi-mobil/klaim/estimasi` |
| apakah asuransi mobil menanggung banjir | 3,600 | Mobil | `/asuransi-mobil/klaim/banjir` |
| kenapa klaim asuransi ditolak | 1,900 | Umum | `/panduan-klaim/klaim-ditolak` |
| bagaimana cara jadi agen asuransi | 2,900 | Agent | `/agent` (existing) |
| apakah mobil bekas bisa diasuransikan | 1,300 | Mobil | `/asuransi-mobil` FAQ |

### 1.8 Problem-aware

| Keyword | Vol/mo (est.) | Vertikal | URL Target |
|---|---|---|---|
| mobil kecelakaan tidak ada asuransi | 1,600 | Mobil | `/blog/mobil/...` |
| klaim asuransi mobil ditolak | 2,200 | Mobil | `/panduan-klaim/klaim-ditolak` |
| premi asuransi mobil naik terus | 880 | Mobil | `/blog/mobil/...` |
| mobil hilang tidak ada tlo | 590 | Mobil | `/asuransi-mobil/tlo` |

### 1.9 Comparison

| Keyword | Vol/mo (est.) | Vertikal | URL Target |
|---|---|---|---|
| all risk vs tlo | 6,600 | Mobil | `/perbandingan/asuransi-all-risk-vs-tlo` |
| asuransi mobil vs asuransi kendaraan bermotor wajib | 480 | Mobil | `/perbandingan/...` |
| asuransi swasta vs bpjs kesehatan | 5,400 | Kesehatan | `/perbandingan/asuransi-kesehatan-vs-bpjs` |
| asuransi jiwa term life vs whole life | 2,900 | PA/Jiwa | `/perbandingan/...` |

### 1.10 Purchase Intent (highest-converting, prioritized untuk landing page bukan blog)

| Keyword | Vol/mo (est.) | Prioritas | URL Target |
|---|---|---|---|
| asuransi mobil murah | 40,500 | **P0** | `/asuransi-mobil` |
| premi asuransi mobil 2026 | 18,000 | **P0** | `/asuransi-mobil/premi` |
| asuransi kesehatan terbaik | 22,000 | **P0** | `/asuransi-kesehatan` |
| asuransi mobil terbaik | 14,800 | **P0** | `/asuransi-mobil` (sub-angle di hub) |
| cara klaim asuransi mobil | 12,000 | **P0** | `/asuransi-mobil/klaim` |
| asuransi jiwa terbaik indonesia | 9,900 | P1 | `/asuransi-kecelakaan-diri` |
| asuransi perjalanan ke luar negeri | 8,100 | P1 | `/asuransi-perjalanan/internasional` |
| harga asuransi mobil all risk | 5,400 | P1 | `/asuransi-mobil/all-risk` |
| asuransi mobil all risk terbaik | 5,400 | P1 | `/asuransi-mobil/all-risk` |
| asuransi hp / proteksi gadget | 4,400 | P2 | `/proteksi-barang` |

---

## 2. Prioritas Eksekusi (untuk Phase 3 Landing Pages)

Berdasarkan volume + intent komersial + kesiapan produk (5 lini existing) + kesesuaian dengan silo Phase 1:

**P0 — dibangun di Phase 3 batch pertama (flagship silo Asuransi Mobil):**
1. `/asuransi-mobil` (hub) — target "asuransi mobil murah", "asuransi mobil terbaik"
2. `/asuransi-mobil/all-risk` — target "asuransi mobil all risk terbaik", "harga asuransi mobil all risk"
3. `/asuransi-mobil/tlo` — target "asuransi tlo", "apa itu asuransi tlo"
4. `/asuransi-mobil/klaim` — target "cara klaim asuransi mobil" (12K/mo — salah satu volume tertinggi di seluruh dataset)
5. `/asuransi-mobil/premi` — target "premi asuransi mobil 2026" (18K/mo)

**P1 — batch kedua (setelah flagship silo live & terindeks):**
6. `/asuransi-kesehatan` (hub) — 22K/mo, volume tertinggi kedua di seluruh dataset
7. `/asuransi-kecelakaan-diri` (hub)
8. `/asuransi-perjalanan/internasional`
9. `/perbandingan/asuransi-all-risk-vs-tlo`
10. `/glosarium` (index) + 10 istilah teratas (all-risk, tlo, premi, deductible, uang-pertanggungan, srcc, dst.)

**P2 — batch ketiga:**
11. `/proteksi-barang` (hub — proteksi gadget & elektronik, **bukan** asuransi rumah/properti fisik; lihat koreksi di `docs/SEO_ARCHITECTURE.md` §1)
12. Sisa halaman sub-kategori 4 vertikal non-mobil (klaim/premi masing-masing)
13. Halaman Zona OJK (`/asuransi-mobil/premi/zona-1|2|3`)

Progres eksekusi: **P0 batch pertama** (5 halaman flagship Asuransi Mobil) dan **P1** (Kesehatan hub, Kecelakaan Diri hub, Perjalanan hub + Internasional, 1 perbandingan, glosarium 8 istilah) sudah live — 11 dari 100 landing page. P2 sedang berjalan.

---

## 3. Mapping Keyword → Anchor Text Internal Link

Contoh anchor text untuk internal linking (§3 Phase 1) yang membawa relevansi keyword, bukan generic "klik di sini":

| Dari halaman | Ke halaman | Anchor text |
|---|---|---|
| `/asuransi-mobil` | `/asuransi-mobil/all-risk` | "asuransi mobil all risk" |
| `/asuransi-mobil` | `/asuransi-mobil/tlo` | "asuransi TLO" |
| `/asuransi-mobil/all-risk` | `/perbandingan/asuransi-all-risk-vs-tlo` | "perbedaan All Risk dan TLO" |
| `/asuransi-mobil/all-risk` | `/asuransi-mobil/klaim` | "cara klaim asuransi All Risk" |
| `/asuransi-mobil/klaim` | `/kalkulator` | "hitung estimasi premi" |
| `/asuransi-mobil/premi` | `/asuransi-mobil/premi/zona-1` (Phase 4) | "premi asuransi mobil Jakarta" |

Pola ini yang dipakai saat menulis konten Phase 3 di bawah.
