# SurePath — Changelog

## v2.7.55 — 2026-11-05

### Portal Mitra: ikon Beranda, STNK setara Nasabah, rentang harga, diskon di step 4, handoff pembelian & approval manual

Enam direktif pemilik untuk alur kerja mitra — semuanya frontend, tanpa
perubahan skema atau edge function.

- **Ikon Beranda "Klien" & "Profil" tidak lagi kembar.** Kedua tile dulu jatuh
  ke ilustrasi generik "people" yang sama. Kini masing-masing punya gambar
  Brand sendiri di `SurePathBrandIcon`: `SpClientsIcon` (dua orang terhubung
  benang lime + badge hati oranye) dan `SpProfileIcon` (kartu ID miring +
  lencana verifikasi oranye) — tetap satu sistem ikon, tanpa gaya per-ikon.
- **Pintu masuk STNK Mitra memakai UI & layanan yang sama dengan Nasabah.**
  `STNKAutoExtract` (pipeline stub: hanya mengirim 100 karakter pertama
  dataURL lalu mengarang nilai pasar) dihapus bersama stub
  `extractSTNKAndRecommend` di aiGateway. Diganti `StnkCaptureCard` +
  `StnkOcrNotice` dari `StnkScanCard` dan layanan `extractStnkOcr` yang asli;
  hasilnya mengisi form kendaraan otomatis.
- **Rentang harga rekomendasi muncul** di step data kendaraan — ±5% dari
  `getMarketValueForYear`/`getMarketValueForMotoYear`, rumus yang sama dengan
  yang dilihat nasabah, untuk mobil maupun motor.
- **Diskon muncul dan dihitung di step 4.** Input pindah dari atas step 2 ke
  kartu ringkasan (`quote_summary` kendaraan dan `summary` produk lain),
  lengkap dengan rincian premi dasar → diskon −Rp → premi akhir. Catatan batas
  15% dipertahankan; `quote_data` tetap mengirim `discount_rate`,
  `discount_amount`, `base_premium`.
- **Handoff ke Pembelian tidak menanyakan ulang data.** "Lanjut ke Pembelian"
  kini membawa hasil pindai STNK (plat, rangka, mesin, warna) selain data
  kendaraan & nasabah yang sudah dibawa `initialQuote`. Kartu pindai STNK di
  wizard underwriting menyingkir jadi chip "Data kendaraan sudah terisi dari
  Penawaran" dengan opsi pindai ulang — mitra hanya melengkapi yang belum ada.
- **Foto yang gagal dianalisa AI bukan lagi jalan buntu.** Sebelumnya step foto
  menuntut hasil AI (`aiResult !== null`) sehingga mitra terblokir saat analisa
  gagal atau foto kurang dari 3. Kini order tetap bisa diajukan: panel amber
  "Perlu Persetujuan Manual Admin", order ditandai
  `ai_manual_review: PHOTO_ANALYSIS_UNAVAILABLE` di `vehicle_details`, masuk
  antrean `SUBMITTED` yang sudah ditangani `PolicyOrdersAdmin`, tombol bayar
  tetap tertutup sampai disetujui, dan notifikasi menjelaskan alasannya.

Guard: `services/__tests__/agentHomeStnkDisc.test.ts` (12 asersi, ditulis
merah lebih dulu).

## v2.7.54 — 2026-11-05

### Link Portal B2B di menu website

- **`/b2bapps` punya login screen sejak v2.7.53 tapi tidak ada link ke
  sana di mana pun di situs** — sama seperti `/agapps`/`/insurerapp`/
  `/operatorapp`, hanya bisa diakses kalau tahu URL-nya langsung. Untuk
  B2B ini masalah nyata: calon pengguna (mitra multifinance) tidak akan
  pernah menemukan portalnya sendiri. Ditambahkan link "Portal B2B" di
  tiga titik di `SiteLayout.tsx` (situs marketing publik), menyamai pola
  link "Admin" yang sudah ada: tombol navbar desktop, tombol menu mobile,
  dan entri kolom footer "Perusahaan" ("Portal Mitra B2B") + ikon di
  bilah bawah footer. Semua mengarah ke `/b2bapps`.

## v2.7.53 — 2026-11-05

### Login khusus portal B2B + dashboard menampilkan batch fleet

- **Portal B2B sebelumnya tidak punya layar login sendiri.** Mengunjungi
  `/b2bapps` dalam keadaan logout jatuh ke beranda marketing umum — tidak
  ada form login sama sekali (`/custapp`/`/agapps` sudah punya ini,
  `/b2bapps` tidak pernah ditambahkan). Dibuat `B2BLogin.tsx`: layar
  glassmorphism khusus, animasi masuk satu kali (blur → fokus + naik,
  staggered), identitas warna indigo yang sengaja berbeda dari oranye
  Insurer — B2B di sini berarti institusi/multifinance, bukan ritel. Email +
  kata sandi saja (akun B2B disediakan admin, tidak ada pendaftaran
  mandiri), plus alur lupa kata sandi.
- **FIX**: `rolePath()` (App.tsx) tidak pernah punya cabang untuk
  `B2B_CLIENT` — selalu jatuh ke `/custapp`. Tidak pernah benar-benar rusak
  (penjaga `B2BRoutes` di `src/app/routes/b2b.tsx` mengklaim path apa pun
  untuk B2B_CLIENT yang sudah login), tapi bilah URL menampilkan portal yang
  salah. Diperbaiki di sumbernya.
- **Dashboard B2B (`B2BHome.tsx`) sekarang menampilkan batch fleet massal** —
  sebelumnya statistik dan aktivitas terbaru hanya menghitung pengajuan
  satuan (`sp_b2b_submissions`), sehingga mitra yang memakai impor massal
  (fitur andalan sesi sebelumnya) melihat dashboard kosong selamanya.
  Ditambahkan: tombol kedua "Impor Massal Fleet", ringkasan batch menunggu
  bayar + total unit, dan daftar batch terbaru.

## v2.7.52 — 2026-11-05

### Kontrol admin untuk fleet B2B, Syarat & Ketentuan, dan koneksi dashboard insurer

Lanjutan v2.7.51 — menutup gap yang ditemukan saat menyambungkan fitur bulk
import B2B ke dashboard admin dan insurer.

- **Rate fleet B2B kini bisa diedit admin** (`sp_b2b_fleet_rate_sets`, menu
  CMS baru "Rate Fleet B2B") — pickup/truk, alat berat, dua tarif diskon,
  tiga biaya admin, dan premi minimum, yang sebelumnya konstanta hardcoded di
  `services/b2bFleetRating.ts`. Pola versi-aktif yang sama dengan
  `sp_ojk_rate_sets`/`OjkRateAdmin.tsx`. Rate TLO mobil penumpang & motor
  **tidak** diduplikasi ke tabel baru ini — keduanya sudah reaktif terhadap
  rate set OJK aktif (`CAR_TLO_MIN`/`MOTO_TLO_MIN` adalah binding `let` yang
  ditimpa `applyOjkRateSet()`), jadi menu Rate OJK yang sudah ada tetap satu
  sumber kebenarannya.
- **Syarat & Ketentuan kini punya editor bervensi** (`sp_tnc_documents`, menu
  CMS baru "Syarat & Ketentuan"). Sebelumnya `accept_agreement` memakai
  `doc_version` hardcoded `'v1.0-2026'` — tidak ada tempat mengedit isinya
  sama sekali. Sekarang admin menulis draft, dan "Terbitkan" (aksi terpisah
  dari simpan) mengaktifkan versi itu untuk mitra baru.
- **Admin bisa menugaskan insurer ke batch bulk** (`admin_b2b_bulk_assign_insurer`)
  sebelum batch lunas — sebelumnya `insurer_id` hanya terisi di langkah
  terakhir (`admin_b2b_bulk_issue`), jadi dashboard insurer tidak punya apa
  pun untuk dikueri.
- **Dashboard insurer kini menampilkan batch B2B** — tab "Polis" punya saklar
  Individual/Batch B2B (bukan tab ke-6; `PortalTabBar` sudah penuh di 5).
  Insurer melihat batch PAID yang ditugaskan ke mereka dan mengunggah polis
  induk sendiri (`insurer_upload_bulk_master_policy`), sama seperti
  `insurer_upload_policy` pada order retail.
- **FIX keamanan**: `b2b-documents` adalah bucket **privat**, tapi
  `admin_b2b_bulk_issue`/`uploadB2BBulkMasterPolicy` (dibangun di v2.7.51)
  menyimpan hasil `getPublicUrl()` — yang 404 di bucket privat. Diperbaiki:
  kolom `master_policy_document_url` sekarang menyimpan storage PATH, setiap
  pembaca (admin/insurer/klien) me-resolve-nya ke signed URL lewat gateway.
  Upload sisi insurer (tanpa sesi Supabase — hanya token) memakai signed
  upload URL dari service_role (`insurer_bulk_request_upload_url`), bukan
  upload klien langsung yang tidak mungkin lolos RLS folder-pemilik
  `b2b-documents` tanpa `auth.uid()`.
- **FIX CI**: `xlsx` (dipasang di v2.7.51) punya advisory HIGH severity
  (prototype pollution + ReDoS) tanpa fix di registry npm — SheetJS berhenti
  mempublikasikan versi terbaru ke npm, perbaikannya hanya ada di tarball CDN
  mereka sendiri. `package.json` sekarang memakai
  `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` — API identik, 0
  advisory. Juga: `create-b2b-bulk-invoice` belum dideklarasikan di
  `supabase/config.toml` (lolos dari `check-edge-functions.mjs`).

## v2.7.51 — 2026-11-04

### B2B Bulk Fleet TLO Import — upload → premi → invoice → polis massal

Pilot: Mutiara Finance (PT MMF). Sebelumnya `/b2bapps` hanya punya satu jalur
pengajuan manual per perusahaan dan "Terima Penawaran" adalah jalan buntu —
tidak ada invoice, pembayaran, atau penerbitan polis sama sekali. Multifinance
mengirim spreadsheet berisi ratusan kendaraan yang dibiayai (satu baris per
nasabah) yang semuanya perlu TLO sekaligus; fitur ini membangun jalur itu dari
upload file sampai polis induk + lampiran kendaraan.

- **Mesin rating baru** (`services/b2bFleetRating.ts`, mirror Deno di
  `supabase/functions/_shared/b2bFleetRating.ts`, paritas diuji) —
  mereproduksi metodologi audit manual mitra pilot: zona dari prefix plat
  (fallback nama wilayah), klasifikasi motor/mobil/alat berat, deteksi
  pickup/mobil-barang dari nama model (menangkap kasus nyata "Suzuki GC 415 T"
  yang di audit manual awalnya salah dirate sebagai mobil penumpang), rate TLO
  OJK batas bawah (motor & mobil penumpang memakai tabel yang sama dengan
  `services/ojkRates.ts`; pickup/truk & alat berat adalah rate block-business
  terpisah), premi gross minimum Rp50.000, diskon 25%/15%, biaya admin
  25rb/45rb/65rb, pro-rata tenor. Diuji end-to-end terhadap 253 baris file
  referensi mitra — hasil rekonsiliasi dalam toleransi 2% dari TOTAL TAGIHAN
  resminya (lihat catatan pembulatan di `b2bFleetRating.ts`).
- **Parser file** (`services/b2bBulkParser.ts`) — baca .xlsx/.xls/.csv,
  pemetaan kolom otomatis (fuzzy) ke 18 field kanonik, bisa dipetakan ulang
  manual. Memakai `xlsx` (SheetJS), bukan `exceljs` — ExcelJS gagal membaca
  file referensi mitra sendiri (komentar sel VML legacy memicu bug reconcile
  di ExcelJS); parsing hanya berjalan di browser klien sendiri atas file yang
  mereka pilih sendiri, tidak pernah server-side.
- **Tabel baru** `sp_b2b_batches` + `sp_b2b_batch_items` (deny-all RLS,
  gateway/service-role saja — pola yang sama dengan `sp_policy_orders`, bukan
  pola RLS-terbatas-klien milik `sp_b2b_submissions`, karena ini membawa PII +
  uang dalam skala besar). Kolom baru `sp_payments.batch_id` (nullable,
  aditif) supaya satu invoice bisa melunasi satu batch, bukan satu order.
- **Aksi gateway baru** (`actions/b2bBulk.ts`): `b2b_bulk_create_batch`
  menghitung ulang setiap premi server-side dari input kategorikal yang
  dikirim klien (zona/jenis kendaraan/pickup — hal yang bisa dikoreksi
  manusia di grid review) — angka uang tidak pernah dipercaya dari klien.
  Plus `b2b_bulk_list_batches`, `b2b_bulk_get_batch`, `admin_b2b_bulk_issue`.
  `b2b_bulk_create_batch` masuk `ACTION_MIN_TIER` (perlu akun terverifikasi),
  sejajar dengan `create_policy_order`.
- **Edge function baru** `create-b2b-bulk-invoice` (pola sama dengan
  `create-xendit-invoice`, untuk batch bukan order) + `xendit-webhook`
  diperluas: pembayaran batch PAID memindahkan status batch & item
  (PENDING→READY), amount-mismatch diperlakukan sama hati-hatinya dengan jalur
  order yang sudah ada.
- **UI klien B2B**: tab "Buat" dan "Ajuan" masing-masing punya saklar
  satuan/massal. Impor massal = upload → pemetaan kolom → grid review
  (premi terhitung ulang live, baris bermasalah ditandai, zona/jenis
  kendaraan bisa dikoreksi manual) → submit batch → buat invoice Xendit →
  bayar. Setelah polis induk terbit: unduh dokumen polis asli dari
  penanggung + lampiran daftar kendaraan (PDF jadwal per-nasabah,
  `generateB2BBulkSchedulePDF`).
- **UI admin**: sub-tab baru "Bulk Batches" di `B2BAdminView` — admin
  mengunggah dokumen polis induk asli (bukan dibuat otomatis — polis
  sungguhan selalu berasal dari penanggung, pola yang sama dengan
  `insurer_upload_policy` pada order retail) + nomor polis, menandai batch
  ISSUED.
- **Belum dikerjakan** (lihat backlog): tahap persetujuan/underwriting
  operator sebelum invoice (saat ini klien bisa langsung membuat invoice
  begitu batch SUBMITTED — cocok untuk kerja sama rate-tetap yang sudah
  disepakati, tapi tidak ada gate manusia sebelum uang ditagihkan); sertifikat
  per-nasabah individual (saat ini hanya satu lampiran gabungan); notifikasi
  WhatsApp untuk event batch (order retail punya ini, batch belum).

## v2.7.50 — 2026-11-04

Hapus field `band` dari `TierPalette` — field itu tidak pernah dibaca kode
produksi setelah Beranda Mitra dibangun ulang sebagai super app (v2.7.39). Tes
yang menjaganya (`agentHomeHero.test.tsx`) ikut dicopot.