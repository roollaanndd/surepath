# SurePath - Changelog

## v2.9.1 - 2026-11-14

### B2B — perluasan, foto kendaraan, paket admin, proposal, aksen warna

Permintaan owner (13 Nov) untuk portal B2B: tambah pilihan perluasan sesuai
formula agent/admin, implementasikan koneksi admin dashboard, perbaiki error
"company name" saat order Comprehensive, tambah paket asuransi yang
dikendalikan dari admin, tombol unduh proposal, aksen warna lebih hidup, dan
submit foto kendaraan seperti agent app.

**Order Unit B2B (`components/b2b/B2BUnitOrder.tsx`)**
- **Perluasan pertanggungan**: Banjir, Gempa Bumi, Huru-hara (SRCC), Terorisme &
  Sabotase, Bengkel Resmi/ATPM (Comprehensive saja), PA Pengemudi, PA Penumpang
  (0–7 kursi), TPL progresif (Rp 10/25/50/100 jt). Rate acuan OJK IV.B, bisa
  di-override dari rate set admin.
- **Paket asuransi** — klien pilih dari daftar `sp_b2b_plans` aktif
  (Basic/Standard/Premium di-benih default). `loading_rate` paket diterapkan
  server-side pada premi setelah diskon.
- **Foto kendaraan wajib** — minimal 3 slot (depan, belakang, nomor rangka,
  samping kiri/kanan, STNK). Unggah ke bucket `b2b-documents` di bawah
  `clientId/vehicle-photos/`, URL ditandatangan 60 hari, disematkan ke item.
- **Unduh proposal** — tombol Excel sebelum submit, memakai
  `services/b2bBulkQuoteExcel.ts` dan mencantumkan rate, perluasan, paket.
- **Perbaikan `company_name` error**: server fallback ke `sp_users.name` →
  `'Klien B2B'` saat kosong (tidak lagi menolak order).

**Rating engine (`services/b2bFleetRating.ts` + Deno mirror)**
- `FleetAddOns`, `FleetAddonRates`, `DEFAULT_FLEET_ADDON_RATES`, `TPL_OPTIONS`,
  `calcFleetAddonPremium()`.
- `BulkRateConfig.addonRates?` (opsional, rate set lama fallback ke default).
- `BulkPremiumInput.addons`, `.planLoadingRate`; `BulkPremiumResult.addonPremium`,
  `.addonsDetail`, `.planLoading`; `calcBulkTotals` menjumlahkan keduanya.
- Impor massal tanpa addons tetap byte-for-byte identik dengan v2.9.0
  (parity test lulus — 31/31).

**Admin dashboard**
- Menu baru **Katalog & Harga → Paket B2B** (`b2b_plans`), CRUD penuh
  (`components/admin/B2BPlansAdmin.tsx`): kode, nama, deskripsi, loading rate,
  manfaat, urutan, aktif/nonaktif. Hapus otomatis jatuh ke nonaktif bila sudah
  dipakai di order.
- **Detail batch** menampilkan kolom **Perluasan / Paket** (chip banjir/gempa/
  SRCC/…, loading rupiah paket) dan **Foto** (thumbnail dengan hover zoom,
  klik membuka signed URL).

**Portal B2B**
- Hero dashboard pakai gradient tri-warna (indigo → emerald → oranye) dengan
  dua blob sinar, titik pulse oranye, tombol primary CTA menjadi gradient.
- Tone baru `spark` untuk `B2BPill` dan `B2BKpi` (oranye) — dipakai saat ada
  aksi yang perlu perhatian.

**Backend / DB**
- Migrasi `20261113120000_b2b_plans_addons_photos.sql`: tabel `sp_b2b_plans`
  (deny-all RLS, benih 3 paket), kolom baru di `sp_b2b_batch_items`:
  `addons jsonb`, `addon_premium`, `plan_id`, `plan_loading`, `vehicle_photos`.
- Gateway actions baru: `list_active_b2b_plans`, `admin_list_b2b_plans`,
  `admin_save_b2b_plan`, `admin_delete_b2b_plan`.
- `b2bBulk.ts` gateway: validasi addons (seats 0–7, TPL int), resolve plan dari
  id ke loading_rate, URL foto wajib `https://`, persist semua field baru.

**Catatan**
- Edge functions (`data-gateway`) dan migrasi database **harus di-deploy** agar
  perubahan ini berfungsi di produksi. Workflow GitHub Actions
  `deploy-edge-functions.yml` menanganinya saat merge ke `main`.
- Perilaku lama (impor massal Excel) tidak berubah; parity test memastikan
  premi identik bila addons/plan tidak dikirim.

## v2.9.0 - 2026-11-13

### Apps Mitra: perombakan tampilan total — "Kaca Pagi"

Permintaan owner (12 Nov): apps mitra menjadi super app modern — glassmorphism,
ikon buatan sendiri, header dan top menu baru, desain promo, klik beranimasi,
transisi layar halus — dengan tema putih bersih, hijau, dan sedikit oranye.

Bahasa desainnya satu gagasan: kanvas **putih bersih**, cahaya **hijau** yang
mekar dari atas, panel **kaca buram** yang mengambang, dan **satu aksen oranye**
yang hanya dipakai untuk "titik tujuan" (membuat penawaran, promo, penanda
belum dibaca). Panduan lengkap: `docs/AGENT_UI_KIT.md`.

**Kerangka baru (di semua layar)**
- **Bar kaca atas** — avatar, sapaan (Beranda) atau judul layar, tema, bel
  dengan lencana oranye. Menguat saat digulir.
- **Top menu** — rel pil yang meluncur: Ringkasan, Klien, Klaim, Perpanjangan,
  Jaringan, Peringkat, Endorsemen, Tarik Dana, Pathy. Tujuan yang dulu hanya
  bisa dicapai lewat ubin Beranda kini satu ketukan dari layar mana pun.
- **Dock** — lima tujuan yang sama; pil hijau meluncur ke tab aktif, dan
  **Buat** menjadi tombol oranye di tengah.
- **Transisi layar berarah** (masuk dari kanan/kiri sesuai urutan layar),
  tekanan berpegas pada semua elemen yang bisa ditekan, kerangka muat berbentuk
  konten. Semuanya mati di bawah `prefers-reduced-motion`.

**Ikon "Jalur"** — keluarga ±55 ikon gambar sendiri (grid 24, garis 1,75
membulat). Tiap ikon punya tepat satu penanda oranye: titik tujuannya. Unggahan
Icon Manager admin tetap menang atas ikon bawaan.

**Beranda** dibangun ulang: kartu saldo hijau tua berkaca dengan garis jalur
yang menggambar dirinya menuju titik oranye, tiga aksi dompet dan tiga angka
bulan ini; rel "Jual sekarang"; kartu promo; delapan fitur mitra; kinerja
dengan cincin konversi; tip Pathy; perpanjangan; komisi terbaru. Tidak ada
tujuan atau angka yang hilang dari beranda lama.

**Promo** — kartu berbentuk tiket terang: label oranye, judul, satu baris isi,
tombol oranye; adegan vektor di potongan kanan dengan garis sobek. Jalur data
CMS, autoplay, geser, dan tutup tidak berubah.

**Layar dalam** (Polis, Komisi, Dompet, Profil, Klien, Klaim, Perpanjangan,
Jaringan, Peringkat, Endorsemen, Buat Penawaran) diselaraskan lewat satu lapisan
gaya di bawah `.ag-app` — logika layar tidak disentuh:
- kartu utama tiap layar menjadi hijau tua berkaca yang sama dengan Beranda;
- label HURUF BESAR ber-tracking lebar → huruf kalimat; angka monospace → Sora;
  tidak ada teks di bawah 11px;
- pil filter: kaca saat diam, hijau saat aktif; kolom isian 46px berkaca;
- permukaan biru-hitam lama (kartu referral, baris juara) → hijau tua.

**Perbaikan yang ikut ketemu**
- Profil: dua tombol bawah melebar 40px keluar layar di 390px (`w-full` +
  `mx-5`) — geser horizontal lama, kini hilang.
- Klien: tombol "+" mengambang tertimpa dock dan Pathy → tombol "Tambah klien"
  di baris jumlah; pil status kini "Prospek / Aktif / Tidak aktif".
- Tip Pathy: "3A-" (mojibake) → "3×".

**Yang sengaja tidak diubah**
- Logika, alur data, panggilan gateway, validasi, dan teks hukum di semua layar.
- Portal lain: semua gaya baru hidup di bawah `.ag-app`; `PortalHeader`,
  `PortalTabBar`, dan `SuperAppHeader` bersama tidak disentuh.
- Struktur dalam pembuat penawaran dan wizard underwriting (hanya ikut
  lapisan gaya); kartu partner bertema tier di Profil; gerbang perjanjian dan
  onboarding (dirender di luar root apps).

**Uji.** `tests/agentApp.spec.ts` 6/6 lulus (navigasi lima tab, tab Buat,
gerbang S&K, onboarding, Pathy, kutipan STNK). Guard desain lulus
(`agentPremiumPolish`, `portalDarkGuard`, `moduleIconIds`, `agentHomeStnkDisc`).
Ke-12 layar dipotret di 390×844 dengan backend tiruan, terang dan gelap: 0 error
konsol, tanpa geser horizontal. Path browser di `tests/agentApp.spec.ts`
diperbarui ke tautan stabil container.

## v2.8.24 - 2026-11-12

### B2B: impor Excel yang benar-benar membaca file, Comprehensive, dan pilihan merk/tipe

Tiga laporan owner (12 Nov) dari portal B2B, semuanya direproduksi dulu lalu
diperbaiki.

**1. "Menu upload data Excel tidak bisa membaca data sama sekali."**
Penyebab: pembaca selalu menganggap **baris pertama** file sebagai judul kolom.
Ekspor multifinance hampir selalu punya judul laporan, periode, dan baris
kosong di atasnya — akibatnya tidak satu kolom pun dikenali, daftar pemetaan
manual berisi potongan judul laporan, dan tombol lanjut terkunci. Nama kolom
yang sedikit berbeda dari file mitra pilot ("Nama Konsumen", "Merek", "Nopol",
"Nilai Pertanggungan") juga tidak dikenali.

- Baris judul kolom dicari otomatis di 40 baris pertama (baris dengan kolom
  terkenali terbanyak), di sheet yang paling cocok — bukan sekadar sheet
  terpanjang.
- Kamus nama kolom diperluas (±3× lipat) dan dicocokkan per kata: "OTR" tidak
  lagi cocok dengan "KONTRAK", "NAMA CABANG" tidak lagi dianggap nama nasabah,
  dan satu kolom tidak bisa dipakai dua field.
- Hanya **nama nasabah** dan **nilai pertanggungan** yang wajib (OTR boleh
  mewakili nilai pertanggungan). Tenor kosong → 12 bulan, jenis barang kosong →
  Mobil (bisa diubah per baris), OTR kosong → baris ditandai. Setiap bawaan yang
  dipakai diberitahukan di layar.
- Angka `150,000,000`, `Rp 150.000.000`, `1.234.567,89` terbaca benar; baris
  TOTAL/tanda tangan di kaki tabel dibuang; tenor dalam tahun dikonversi; CSV
  dengan BOM, titik koma, atau tab terbaca.
- Layar pemetaan kini menampilkan sheet dan baris tempat judul kolom ditemukan
  serta **pratinjau tiga baris pertama sebagaimana terbaca**.

Tiga celah lain yang membuat unggahan B2B bisa "diam saja" tanpa pesan — ketemu
saat menelusuri log produksi 12 Nov (pengajuan Fleet tersimpan pukul 07.30 UTC
tanpa satu dokumen pun, dan bucket `b2b-documents` kosong total):

- **Memilih file yang sama dua kali tidak memicu apa pun.** `<input type=file>`
  tidak mengirim `change` untuk file yang sama; setelah "Kembali" lalu memilih
  file itu lagi, layar diam. Nilai input kini dikosongkan setiap kali dibaca
  (Impor Massal dan dokumen Pengajuan Baru).
- **Unggah dokumen di "Pengajuan Baru" gagal tanpa pesan.** Kegagalan apa pun
  hanya masuk `console.error`; tombol kembali ke "Unggah". Sekarang alasan
  kegagalannya tampil di bawah dokumen itu.
- **Excel/CSV dengan tipe MIME kosong ditolak penyimpanan.** Bucket hanya
  menerima daftar MIME tertentu, sedangkan di sebagian perangkat `file.type`
  untuk .xlsx/.xls/.csv kosong atau `application/octet-stream`. Tipe kini
  ditentukan dari ekstensi (`prepareB2BDocument`), batas 10 MB dan jenis file
  diperiksa sebelum mengunggah, dan atribut `accept` memuat tipe MIME supaya
  pemilih file ponsel tidak menampilkan Excel sebagai tidak bisa dipilih.

Catatan dari file mitra pilot yang pernah diunggah owner
(`DATA_PT_MMF_TLO_audit_lengkap_dikoreksi.xlsx`): file itu terbaca di produksi
lama maupun kode baru, tetapi pembaca lama menghitung **254** baris — satu baris
kaki tabel ikut dianggap nasabah dan ditagih biaya admin Rp 25.000. Pembaca baru
membaca tepat **253** nasabah (total Rp 20.650.092, sebelumnya Rp 20.675.092).

**2. "Order polis satuan tidak ada yang Comprehensive."**
Order Unit kini punya pilihan **Comprehensive** atau **TLO** untuk mobil dan
motor (bawaan Comprehensive). Tarif Comprehensive = batas bawah SEOJK No.
6/SEOJK.05/2017 Lampiran IV Tabel IV.A: mobil penumpang per kategori OTR dan
zona, pickup/truk 2,42% / 2,39% / 2,23%, motor 3,18%. Alat berat tetap TLO
(tidak ada tarif comprehensive OJK). Diskon, biaya admin, multi-tahun, dan
tanggal efektif berlaku sama. Server menghitung ulang dan menolak Comprehensive
untuk alat berat. **Impor massal tetap TLO.**

**3. "Tidak muncul pilihan merk dan tipe mobil seperti di database."**
Merk dan tipe sekarang dipilih dari database kendaraan yang sama dengan apps
mitra (38 merk mobil, 5 merk motor; harga kelolaan admin tetap menang). Memilih
merk, tipe, dan tahun menampilkan harga pasar referensi berikut rentang ±5% dan
mengisikannya ke OTR dan nilai pertanggungan — keduanya tetap bisa disunting,
dan angka yang sudah diketik pengguna tidak ditimpa. Tipe pickup/truk otomatis
ditandai bodi komersial. Kendaraan yang tidak ada di daftar bisa diketik manual
("Lainnya").

Jenis pertanggungan tampil di detail batch klien, panel detail admin, dan kolom
Catatan quotation Excel.

**Tidak ada perubahan database** — `sp_b2b_batch_items.coverage_type` sudah
ada sejak awal (sebelumnya selalu diisi `'TLO'`).

**Deploy.** `data-gateway` harus ter-deploy (workflow Deploy Edge Functions)
agar Comprehensive dihitung server; gateway lama mengabaikan field `coverage`
dan menghitung TLO.

**Uji.** 11 tes baru pembaca Excel, 4 tes persiapan unggah dokumen, 9 tes tarif Comprehensive (termasuk
paritas browser/Deno untuk semua kelas × zona × kategori). Diuji di browser:
empat file contoh (standar, judul di atas header, nama kolom lain, uang sebagai
teks) terbaca dengan total identik; Order Unit dicoba mobil/motor/alat berat/
manual di desktop dan mobile. Belum diuji: submit sungguhan ke gateway produksi
dan invoice Xendit.

## v2.8.23 - 2026-11-12

### Order Unit B2B: tanggal efektif, multi-tahun sampai 6 tahun, dan pilihan diskon

Permintaan owner (8 Nov): klien B2B bisa mengorder kendaraan dengan tanggal
efektif pertanggungan, polis multi-tahun sampai 6 tahun dengan nilai kendaraan
menyusut 10% per tahun (lengkap dengan penjelasannya), dan diskon maksimum 25%
yang bisa dipilih tertera di polis atau tidak. Semuanya masuk ke layar **Order
Unit** yang sudah ada (menu Buat) — bukan wizard kedua — sehingga tetap memakai
satu jalur yang sudah teruji: batch 1 item → recompute server → invoice Xendit
per batch → polis induk.

- **Tanggal efektif** — pilih hari ini sampai 60 hari ke depan; tanggal
  berakhir dihitung otomatis (tanggal yang sama N bulan kemudian). Server
  memvalidasi ulang rentangnya.
- **Jangka waktu** — 6 bln, 1 thn, 18 bln, lalu 2–6 thn. Sebelumnya pemilih
  tenor untuk mobil penumpang **tidak tampil sama sekali di layar desktop**
  (hanya dirender dengan `sm:hidden`); kini satu baris tombol untuk semua kelas.
- **Multi-tahun (> 12 bulan)** — nilai pertanggungan tahun ke-n = TSI ×
  0,9^(n−1). Rate dikunci dari tahun pertama, biaya admin dikenakan sekali,
  seluruh premi dibayar di muka. Layar menampilkan penjelasan dan jadwal per
  tahun (periode, nilai pertanggungan, premi gross). Contoh pickup Zona 1
  Rp 100 jt, 6 tahun: TSI 100 → 90 → 81 → 72,9 → 65,61 → 59,049 jt; premi gross
  Rp 4.123.319.
- **Diskon** — klien boleh menurunkan diskon dari plafon rate set aktif (25%
  motor/mobil, 15% alat berat); tidak pernah bisa menaikkannya. Centang "Diskon
  tertera di polis" menentukan apakah polis mencetak rincian diskon atau hanya
  premi gross. Tagihan tetap dipotong diskon di kedua pilihan.
- **Impor massal tidak berubah.** Penyusutan hanya berlaku bila item
  memintanya; baris spreadsheet tetap `nilai × rate × tenor/12` sehingga tetap
  cocok dengan metodologi audit mitra.

**Disiplin uang.** Klien hanya mengirim pilihan (tanggal, YA/TIDAK multi-tahun,
besar diskon, YA/TIDAK tertera). Besar penyusutan (10%) dan plafon diskon
ditentukan server; `calcBulkPremium` di `services/b2bFleetRating.ts` dan
mirror Deno-nya diubah identik dan diuji paritas.

**Yang melihat datanya.** Detail batch klien (kolom Periode), panel detail
batch admin (periode, lencana "TSI susut 10%/thn" dengan jadwal di tooltip,
lencana "diskon tidak tertera di polis"), dan kolom Catatan di quotation Excel.

**Login demo B2B.** Tombol "Masuk sebagai Demo" di halaman login B2B, tampil
hanya bila `VITE_B2B_DEMO_EMAIL` (dan `VITE_B2B_DEMO_PASSWORD`) diisi saat
build. Belum aktif di produksi sampai kedua variabel dan akun demonya dibuat.

**Database** (keduanya sudah diterapkan ke produksi 12 Nov):

- `20261112120000_b2b_unit_order_multiyear.sql` — `sp_b2b_batch_items` +
  `coverage_start_date`, `coverage_end_date`, `depreciation_rate`,
  `premium_schedule`, `discount_shown_on_policy`.
- `20261112121000_drop_unused_policy_order_multiyear_columns.sql` — menghapus
  empat kolom `sp_policy_orders` dari `20261108120000` (untuk wizard terpisah
  yang tidak jadi dipakai; seluruh baris masih bernilai default).

**Deploy.** `data-gateway` harus ter-deploy (workflow Deploy Edge Functions)
agar penyusutan, diskon pilihan, dan tanggal efektif dihitung dan disimpan; sampai
itu terjadi gateway lama mengabaikan field baru dan menghitung tanpa
penyusutan.

**Uji.** 11 tes baru di `b2bFleetRating.test.ts` (paritas browser/Deno,
jadwal 6 tahun, 18 bulan, plafon diskon, tanggal). Alur bayar sampai invoice
Xendit belum diuji end-to-end.

## v2.8.22 - 2026-11-12

### Aset brand: OG banner & feature graphic Play Store (dibuat dengan PhotoCraft)

Craft aset promosi memakai **PhotoCraft v0.22.0** (editor open-source
storytold/photocraft, mode headless CLI) yang diinstall portabel; komposisi
disusun manual per-layer di atas logo asli `public/logo.png` — tidak ada aset
eksternal yang masuk ke bundle app, jadi sistem ikon SVG in-code (termasuk
"Aureate Emerald" v2.8.11) dan guard test `onboardingIllustrations` tidak
tersentuh.

- **`public/og-banner.png` (baru, 1200×630)** — social card sungguhan untuk
  `og:image`/`twitter:image`. Sebelumnya kedua meta menunjuk logo polos yang
  dideklarasikan 1200×630 (tidak cocok). Desain: latar gelap #0a0f0a + glow
  radial emerald, logo perisai, wordmark "Sure" (putih) + "Path" (#22c55e),
  tagline "Asuransi Digital Indonesia" letterspaced, domain myinsurepath.com,
  garis aksen mengapit tagline. `index.html` + 4 entry HTML per-route
  (admin/agent/customer/operator) + `defaultOgImage` di `src/seo/seo.ts`
  diarahkan ke `https://myinsurepath.com/og-banner.png` — kini deklarasi
  `og:image:width/height` 1200×630 benar-benar sesuai filenya.
- **`public/play-store-feature-graphic.png` (redesign, 1024×500)** — file
  lama 11 KB berisi kanvas nyaris kosong. Komposisi baru: logo kiri + blok teks
  kanan dengan palet yang sama.
- **Ikon PWA/launcher/favicon tidak diubah** — sudah konsisten diturunkan
  dari logo dan guard ikon in-bundle mengharuskan vektor in-code; melukis ulang
  ikon raster justru berisiko merusak konsistensi.

Tidak ada logika aplikasi yang berubah. Penomoran v2.8.22 (versionCode 75)
menutup drift versi (version.ts 2.8.19 / gradle 2.8.17-74 di main).

## v2.8.20 - 2026-11-11

### Hardening alur penawaran B2B + notifikasi pengajuan baru (audit follow-up)

Hasil audit fitur B2B (order satuan & penawaran) 11 Nov 2026 — yang hilang,
kurang, dan tidak aman kini ditutup:

1. **Sirkuit keputusan penawaran (P0)** — tombol Terima/Tolak di portal B2B
   dulu menulis satu kolom langsung dari peramban (`updateB2BQuoteStatus`):
   admin tidak diberi kabar apa pun dan status pengajuan induk selamanya
   tampak QUOTED. Kini lewat aksi gateway baru **`b2b_decide_quote`**
   (actions/b2bBulk.ts): hanya `B2B_CLIENT` pemilik penawaran yang boleh
   memutuskan (MASTER_ADMIN mode pantau ditolak di server, bukan hanya
   disembunyikan di UI), hanya status `PENDING` yang bisa diputus (keputusan
   ganda ditolak 409), status pengajuan disinkronkan ke
   ACCEPTED/REJECTED, dan notifikasi `B2B_QUOTE_DECIDED` masuk ke admin
   lengkap dengan nama perusahaan, penanggung, dan nilai premi.
2. **Notifikasi pengajuan baru (P0)** — wizard "Pengajuan Baru" dulu insert
   langsung tanpa kabar; admin baru tahu kalau kebetulan membuka tab. Trigger
   `trg_b2b_submission_notify` (AFTER INSERT, SECURITY DEFINER — pola
   `notify_new_withdrawal`) kini menulis `B2B_SUBMISSION_NEW` untuk setiap
   jalur insert.
3. **RLS tiga tabel B2B diganti set deterministik** — policy lama dibuat
   out-of-band (dashboard) dan tidak terdokumentasi. Migrasi
   `20261111140000_b2b_quotes_submissions_hardening.sql` me-replace seluruh
   policy `sp_b2b_quotes` / `sp_b2b_submissions` / `sp_b2b_documents`:
   klien hanya SELECT (+INSERT pengajuan miliknya), admin hanya SELECT,
   penulisan lain hanya service_role via gateway. Helper
   `sp_b2b_own_client_id()` (auth.uid() ATAU email persis — akun legacy, tanpa
   pattern-match) dan `sp_b2b_is_admin()` (7 role, cermin `ADMIN_ROLES`).
4. **Trigger integritas pengajuan** — `trg_b2b_submission_integrity`
   (BEFORE INSERT) memaksa `status='SUBMITTED'`, memvalidasi `product_type`,
   dan mengosongkan `admin_notes`, sehingga status pengajuan tidak bisa
   dipalsukan lewat insert langsung.
5. **FIX bug skema `admin_create_b2b_quote`** — aksi lama membaca
   `insurer_id`/`premium` padahal UI mengirim `insurer_name`/`premium_amount`/
   `valid_until`/`terms`: setiap penawaran tersimpan dengan penanggung kosong
   dan premi Rp 0. Aksi kini menerima bentuk kanonik SpB2BQuote, mengambil
   `client_id` dari baris pengajuan (bukan params), menvalidasi isian, dan
   menyeragamkan status pengajuan ke QUOTED di server; kolom yang tidak ada di
   skema live dilempar progresif (toleran drift).
6. **Detail unit batch untuk admin (P2)** — kartu batch di tab Bulk Batches
   dulu hanya agregat; kini ada panel "Detail Unit" yang memanggil
   `b2b_bulk_get_batch` (aksi sudah ada, UI belum pernah memakainya):
   tabel per baris (nasabah, unit, plat, zona, TSI, premi total, flag,
   status item) + status faktur terakhir.
7. **Migrasi + verifikasi** — `supabase/migrations/20261111140000_*.sql`
   idempotent (guard `to_regclass` untuk tabel out-of-band); skrip
   apply-and-verify `scripts/apply_migration_20261111140000.py` (env `SBP`);
   keadaan dicatat di `docs/DATABASE_STATE.md`. Aksi gateway terdeploy otomatis
   via integrasi Supabase-GitHub setelah push.

Catatan deploy: migrasi WAJIB diapply sebelum (atau bersamaan dengan) deploy
aksi `b2b_decide_quote` — tanpa RLS baru tombol Terima/Tolak masih berfungsi,
tanpa aksi gateway tombol menjadi gagal (fail-closed, bukan fail-open).

## v2.8.19 - 2026-11-11

### Mesin premi armada disesuaikan arahan owner (formula eksak)

Araahan owner untuk flow bulk B2B (motor + mobil, tenor 3/6/12/18 bulan):

1. **Premi = nilai pencairan × rate × (tenor/12)** — rate OJK acuan 12 bulan,
   pro-rata tenor. Engine sudah seperti ini; kini dikunci test formula-eksak
   untuk tenor 3, 6, 12, dan 18 bulan.
2. **Rate = OJK batas bawah per wilayah** — sudah benar (band `MIN`, tabel
   lantai per zona); test kini menyamakan `rate` engine langsung dengan tabel
   lantai OJK (motor via `getBaseRateByBand`, mobil via `CAR_TLO_MIN` per
   kategori OTR × zona).
3. **Discount 25% dari premi** — sudah benar untuk motor & mobil.
4. **Biaya admin flat Rp 25.000** — DEVIASI DIPERBAIKI: default
   `adminFeeCar` 45.000 → **25.000** (motor memang 25.000; alat berat tetap
   65.000 per kesepakatan block business, bisa diubah via rate set admin).
5. **Total = premi − disc + biaya admin** — sudah benar.
6. **Tanpa lantai premi minimum** — DEVIASI DIPERBAIKI: default
   `minPremiumGross` 50.000 → **0** (premi kecil kini mengikuti formula penuh;
   lantai 50rb milik metodologi mitra pilot masih bisa diaktifkan lewat rate
   set admin — mekanisme + test reproduksinya dipertahankan).

Diterapkan identik di engine browser (`services/b2bFleetRating.ts`) dan mirror
Deno (`supabase/functions/_shared/b2bFleetRating.ts` — paritas tetap diuji),
plus form default Rate Set Armada admin. Angka audit referensi PT MMF pada
test di-update ke default baru (contoh row 1: premi 45.000, disc 11.250,
admin 25.000, total **58.750**; dengan lantai mitra: 62.500). Contoh hitung
terverifikasi kode: motor Z2 25jt tenor 12 → premi 450.000, disc 112.500,
admin 25.000, total **362.500**; tenor 3 → premi 112.500, total **109.375**.

Catatan deployment: kalau ada baris rate set aktif di `sp_b2b_fleet_rate_sets`,
nilai di baris itu yang berlaku — periksa `adminFeeCar` = 25.000 dan
`minPremiumGross` = 0 agar sesuai arahan, atau nonaktifkan barisnya.

## v2.8.18 - 2026-11-11

### Quotation Excel B2B + Pathy fleet parity

Eksekusi flow mitra B2B: unggah Excel berisi ratusan motor/mobil → premi,
diskon, dan total premi terisi per baris sesuai zona & cover TLO → file
Excel quotation kembali ke klien.

**Quotation Excel (file keluar).** Builder baru `services/b2bBulkQuoteExcel.ts`
(SheetJS): sheet *Quotation* — data unit + kolom `Rate (%)`, `Premi Gross`,
`Diskon (%)`, `Diskon (Rp)`, `Premi Setelah Diskon`, `Biaya Admin`, `Total
Premi`, `Catatan` + baris TOTAL; sheet *Ringkasan* — total batch dan breakdown
per kelas unit. Dua pintu unduh: tombol **Unduh Quotation (Excel)** di layar
Tinjau Premi (B2BBulkImport, angka preview engine) dan tombol **Quotation
(Excel)** di detail setiap batch (B2BBulkBatches, semua status; angka apa adanya
dari `sp_b2b_batch_items` — recompute otoritatif server). Disiplin uang
dipertahankan: builder murni format, satu-satunya penjumlahan lewat
`calcBulkTotals` agar identik dengan cara server menjumlahkan.

**Pathy fleet parity.** Tool `analyze_bulk_pricing` kini mendeteksi census
armada (kolom pembiayaan/tenor) otomatis dan menilai setiap baris dengan
`calcBulkPremium` — mesin yang sama dengan impor resmi: zona dari plat/wilayah,
rate per kelas unit, pro-rata tenor, diskon, biaya admin, lantai premi minimum,
dan **rate set admin yang aktif** (`sp_b2b_fleet_rate_sets`, loader replika
`loadActiveBulkRateConfig`). Angka Pathy, angka layar Tinjau Premi, dan angka
server kini satu sumber. Parser angka baru mengerti format uang id-ID
(`Rp 120.000.000`, `1.250.000,5`) — sebelumnya format ribuan titik membuat
baris gagal dinilai. Mode polis per-unit (tarif OJK standar) tetap untuk file
non-fleet. Kartu `bulk_analysis` kini dirender di chat: total premi gross,
diskon, setelah diskon, biaya admin, total ditagihkan + sampel per baris +
baris gagal.

**Uji.** `b2bBulkQuoteExcel.test.ts`: rantai penuh engine → workbook → dibaca
ulang (total sheet ≡ `calcBulkTotals` engine, adapter batch item snake_case,
flag engine masuk kolom Catatan).

## v2.8.17 - 2026-11-11

### Perbaikan tipe: guard rate limit v2.8.16 lolos deno check

CI `edge-function-types` menangkap TS18047 (`caller.spUser` possibly null)
pada dua guard rate limit yang ditambahkan v2.8.16 — check lokal (`tsc`,
`check-edge-functions.mjs`) tidak memeriksa file Deno, jadi ini lolos di
lokal. Perbaikan: `spUser` di-narrow eksplisit sebelum dipakai sebagai
identifier bucket — admin tanpa profil pengguna kini ditolak 403 (semantik
benar: admin selalu punya profil), bukan error tipe. Tanpa perubahan
perilaku lain; Deploy Edge Functions untuk v2.8.16 sendiri sudah sukses,
jadi guard rate limit sudah live sejak v2.8.16.

## v2.8.16 - 2026-11-11

### Hardening keamanan — rate limit penerbitan kredensial + disposisi audit dependensi

Eksekusi roadmap owner poin #18, dengan temuan yang jujur.

**Rate limit penerbitan kredensial.** Dua aksi gateway yang menerbitkan
kredensial — `admin_create_mitra` dan `admin_create_b2b_user` (set sandi
sementara / sandi manual) — kini dibatasi **10 pembuatan akun per admin per
jam** melalui rate limiter DB bersama (bucket per jam, gagal-tertutup).
Sebelumnya hanya terlindungi pagar IP global 60/menit; sebuah sesi admin
yang bocor kini tidak bisa menyalin akun massal. Alur OTP/password login
sendiri tidak melewati gateway (langsung GoTrue Supabase yang punya
rate limit sendiri) — tidak digandakan.

**Disposisi 2 alert Dependabot (moderate & low): keduanya dev-only dan
belum ada versi perbaikan upstream.** `deepmerge` (prototype poisoning,
GHSA-gcqx-w48m-w2h4) hanya dipakai jalur build (vite-plugin-pwa →
workbox-build); `minimatch` (DoS glob) hanya oleh eslint/rimraf/glob.
Tidak ada jalur runtime produksi untuk keduanya, dan advisory keduanya
belum punya versi fixed — `npm audit fix`/update tidak menyelesaikan
(17 sisa adalah rantai @typescript-eslint yang butuh major bump breaking;
bukan dieksekusi di pass hardening ini demi tidak menstabilkan toolchain).
Status: risiko diterima & tercatat; otomatis tertutup begitu upstream
merilis fix. 16 moderate lain identik (dev-only, tanpa jalur runtime).

**Supabase Preview merah di CI bukan regresi** — sudah merah sejak minimal
v2.8.10; check itu milik integrasi GitHub Supabase (Dashboard), bukan
workflow repo — perlu dikonfigurasi/diputuskan di dashboard Supabase
(konek integrasi atau matikan). Semua check milik repo (deploy produksi,
unit-tests, quality, CodeQL, audit runtime, Android, edge-function-types)
hijau di semua rilis hari ini. Audit RLS tabel baru dikonfirmasi: RLS
aktif + policy deny-direct pada sp_b2b_batches & sp_b2b_batch_items
(sejak v2.8.8).

## v2.8.15 - 2026-11-11

### B2B kalender armada — unit mana jatuh tempo kapan, ekspor CSV untuk keuangan

Eksekusi roadmap owner poin #12 (lanjutan alami order unit & bulk yang sudah
ada di v2.8.8). Tab baru **"Kalender Armada"** di Portal B2B: seluruh polis
unit milik klien (gateway `get_my_orders` mencakup pemilik agent_id ATAU
client_id — klien B2B termasuk) mengalir ke antrean mesin retensi v2.8.12,
lalu dikelompokkan per bulan jatuh tempo dengan chip urgensi berwarna
(Kedaluwarsa / Segera / Dekat / Sehat). KPI baris atas: unit terlindungi,
tempo ≤30 hari, kedaluwarsa. Tombol **CSV** mengunduh jadwal perpanjangan
(nomor polis, produk, tanggal, tier, sisa hari) untuk kalender keuangan —
deterministik dan aman-kutip (`fleetCsv`, diuji).

Batasan yang diakui terbuka di layar: unit di dalam batch massal baru muncul
setelah diterbitkan sebagai polis individual — penautan batch_item→
policy_order adalah migration lanjutan, bukan di-fake di sini. Tidak ada
perubahan API/DB/permission.

## v2.8.14 - 2026-11-11

### Dari log menjadi keputusan — kualitas layanan di dashboard admin + jam SLA di antrean operator

Eksekusi roadmap owner poin #9/#10: jejak aktivitas (v2.8.9) kini diagregasi
menjadi metrik yang bisa ditindaklanjuti, dan antrean operator diberi jam.

**Dashboard admin (`AdminDashboard`)** mendapat strip "Kualitas Layanan"
dari data yang sudah dimuat — tanpa query baru, tanpa permission baru:
rata-rata TAT klaim yang dibayar (diajukan→dibayar), klaim tertua yang masih
menunggu (dengan chip SLA 24 jam), jumlah polis berisiko perpanjangan
(≤7 hari/kedaluwarsa — menghitung ulang antrean dari mesin retensi v2.8.12,
bukan implementasi kedua), dan konversi pesanan→diterbitkan 7 hari. Definisi
jujur: skema tidak menyimpan timestamp per tahap, jadi TAT adalah
created_at→updated_at klaim yang selesai, dan jendela kosong menampilkan "—",
bukan 0% palsu (`services/adminMetrics.ts`, modul murni).

**Jam SLA operator (`SlaTimer`).** Setiap baris klaim di antrean Operator
App yang menunggu (SUBMITTED/UNDER_REVIEW) kini membawa chip
"umur / target 24 jam", dan setiap order yang menunggu keputusan membawa
chip 48 jam — emerald = aman, amber = paruh kedua anggaran, rose = jebol.
Warna adalah informasi: operator memprioritaskan berdasarkan angka, bukan
dengan mengingat kapan tiap baris masuk.

**Guard** (`adminMetrics.test.tsx`): definisi TAT/umur per status, rata-rata
hanya baris selesai, ambang SLA (≤½ OK, ≤target WARN, >target BREACH), chip
tiga warna, GWP/konversi berjendela 7 hari (null bila jendela kosong), dan
risiko perpanjangan menunggangi antrean retensi.

## v2.8.13 - 2026-11-11

### Alat agen #2 — QR referral yang bisa di-scan + simulator komisi berbasis riwayat sendiri

Eksekusi roadmap owner poin #5/#6/#7. Catatan: **proposal generator sudah
ada** dan tidak ditulis ulang — `AgentQuoteBuilder` + `quotationSlipPdf`
sudah menghasilkan slip penawaran eksekutif 4 halaman (jsPDF, QR e-quotation
`/q/{code}`, kartu agen, rincian premi, instruksi pembayaran).

**QR referral deep-link (`AgentNetwork`).** Kartu kode referral kini
menampilkan QR dari tautan kanonik yang sama dengan tombol WhatsApp
(`https://myinsurepath.com?ref=KODE`), digenerate lokal paket `qrcode` tanpa
panggilan backend, warna emerald brand, plus tombol **Simpan QR** (unduh PNG
untuk dicetak/stand di lapangan). Prospek scan → site publik memarkir
`?ref=` ke `SUREPATH_REF` → role selection mengikatnya saat pendaftaran —
rantai attribution yang sebelumnya bocor karena refcode harus diketik manual
kini bisa sepenuhnya scan.

**Simulator komisi (`AgentCommission` + `services/commissionSimulator.ts`).**
"Kalau saya tutup 5 polis sebulan, saya dapat apa" — dua input (polis/bulan,
rata-rata premi) dan dua output (komisi bulanan/tahunan), dihitung pada
**rate campuran milik agen sendiri** dari riwayat komisi nyata
(Σcommission/Σpremi atas baris PAID+PENDING; CANCELLED tidak ikut; fallback
rate standar 10% bila riwayat belum terukur). Modul murni: input sampah
ter-clamp (0–500 polis, rate 0–100%), tidak pernah NaN/Infinity.

**Guard** (`commissionSimulator.test.ts`): rate campuran hanya dari baris
ber-langsung, null bila tanpa premi, matematika ter-clamp. Tidak ada
perubahan API/DB/permission.

## v2.8.12 - 2026-11-11

### Lingkar retensi #1 — mesin perpanjangan satu-tap + timeline klaim yang terlihat bergerak

Eksekusi roadmap owner poin #1 dan #2: renewal adalah pendapatan termurah di
asuransi, dan klaim yang transparan adalah yang direkomendasikan orang.

**Mesin perpanjangan (`services/renewalEngine.ts`).** Logika murni: antrean
dari polis ISSUED yang benar-benar punya `end_date`, diurutkan paling genting
dulu (Kedaluwarsa → ≤7 hari "Segera perpanjang" → ≤30 hari "Jatuh tempo
dekat" → sehat), dedupe per nomor polis, toleran tanggal rusak (hasilnya
degradasi ke "tanpa banner", bukan crash). Home Customer App kini punya kartu
Perpanjangan: countdown, label urgensi berwarna, jumlah polis lain yang
mendekati jatuh tempo, dan tombol **Perpanjang** yang memarkir snapshot
kendaraan dari order lama lewat `services/renewalHandoff.ts` (kontrak
validasi, meniru claimHandoff) lalu membuka wizard mobil — wizard mengonsumsi
snapshot sekali di mount, langkah Data Mobil terisi otomatis (brand, model,
tahun, plat, usage, region, provinsi, kondisi), dengan banner "Perpanjangan
polis ORD-… — data kendaraan sudah dimuat". Nasabah tidak lagi memulai dari
nol hanya untuk memperpanjang.

**Timeline klaim (`components/shared/ClaimTimeline.tsx`).** Stepper
Diajukan → Diverifikasi → Disetujui → Dibayar pada setiap baris "Klaim Saya"
— status berjalan berdenyut, REJECTED mendapat chip terminal merah, CLOSED
(row historis) dirender rantai penuh, tanggal Diajukan/Diperbarui ditampilkan
apa adanya (skema hanya menyimpan created_at/updated_at — timeline jujur pada
yang diketahui, tidak mengarang timestamp per tahap). Varian compact untuk
baris daftar, full untuk detail.

**Guard** (`services/__tests__/retention.test.tsx`): batas tier (0/7/8/30/31),
zona waktu kalender (tier berganti di tengah malam, bukan tengah sesi),
kebersihan antrean, validasi prefill (payload rusak tidak pernah sampai ke
wizard), dan keadaan timeline (UNDER_REVIEW=2 langkah, PAID/CLOSED=4,
REJECTED berchip). Tidak ada perubahan API/permission; antarmuka wizard tidak
berubah bagi alur beli baru (tanpa prefill, state awal identik).

## v2.8.11 - 2026-11-11

### Sistem ikon global "Aureate Emerald" — ilustrasi premium, custom, bukan AI slop

Permintaan owner: ikon global dibuat premium, SVG ilustratif custom, dan tidak
berkesan "AI slop".

**Arahan seni baru, satu bahasa untuk seluruh app.** Set fallback baru
`SurePathPremiumIcon` menggantikan set lama "flat playful" (yang memakai wajah
kartun ber-mata-senyum dan mobil mainan) di ketiga titik pemakaian:
`PathyNavIcon`, `ManagedPortalIcon`, dan pratinjau `PortalIconManager`. Aturan
sistemnya tegas dan dikunci test: canvas 48×48 dengan plate gradient emerald
bergeometri identik (rx 13), glyph putih presisi stroke 1.9, bentuk pendukung
mint, dan TEPAT satu aksen emas champagne per ikon — tanpa wajah, tanpa
warna di luar palet sistem. 22 seni (protection, home, wallet, car, document,
payment, bell, people, travel, health, settings, help, bank, library, review,
tier, palette, network, renewal, chart, box, spark) memakai rantai regex yang
sama dengan set lama, jadi semua id navigasi/upload lama tetap bermakna sama.
Gradient memakai `useId()` unik per instance — ikon yang sama dirender
puluhan kali per layar dan id SVG duplikat adalah HTML tidak valid.

**Role selection kini ber-artwork premium.** Tiga kartu tipe akun (Nasabah,
Mitra, Klien Korporat) pada `RoleSelectionScreen` berganti dari SVG generik
berwarna biru/neon-hijau/ungu (bukan warna brand) ke `RoleScene` — adegan
64-canvas dalam bahasa visual yang sama: person+shield, briefcase+growth,
corporate tower+network node. Banner referral di layar yang sama ganti emoji
🔗 menjadi ikon link SVG dan berpindah dari biru ke emerald brand; emoji 👋
pada sapaan `AppSelector` dihapus. Semua ikon tetap murni vektor (tidak ada
raster/efek 3D), dan ikon upload admin (Icon Manager) tetap menimpa fallback
— urutan prioritas tidak berubah.

**Guard design-system baru** (`premiumIcons.test.tsx`): setiap key seni
harus render SVG nyata; semua hex di dalam palet sistem (palet kartun lama
dilarang); id gradient unik antar-instance; routing id→makna ter-pin per
keluarga; ketiga konsumen wajib melewati set premium; tiga `RoleScene`
harus saling berbeda.

## v2.8.21 - 2026-11-11

### App nasabah muncul lagi untuk agen setelah app ditutup dan dibuka ulang

Laporan owner: "sy coba sebagai user agen, setelah sy tutup appsnya dan masuk
lg, saya masuk app nasabah. terjadi lagi" — dan UI itu masih bisa di-zoom.

**Akar masalah: satu akar, dua gejala.** Cold start shell Android/PWA memboot
di '/' (Capacitor membuka index.html, bukan path portal terakhir). Isolation
guard v2.7.57 hanya menjaga territory portal (/custapp, /agapps, /admin, …);
'/' bukan territory mana pun, sehingga catch-all penutup (CustomerRoutes —
sengaja TANPA role guard, "what `if (currentUser)` rendered") merender UI app
nasabah untuk agen. Dokumen yang dirender adalah index.html (situs publik,
tanpa `data-sp-app`), bukan entry portal — jadi lock zoom v2.8.10 pun tidak
aktif di atasnya: agen melihat "app nasabah yang bisa di-zoom". Fix v2.8.9
menutup URL territory; '/' lolos dari keduanya.

**Kini guard memantulkan '/' juga.** User yang sudah masuk (kecuali admin —
CMS-nya memang catch-all di semua pathname) yang membuka '/' atau '/index.html'
dipantulkan ke portal miliknya (resolvePortalPath) sebelum modul portal mana
pun mengklaim: agen → /agapps, customer → /custapp, B2B → /b2bapps, multi-app
→ /select-app. Halaman publik (/q, /review, /payment) dan halaman marketing
tetap bebas untuk semua role. Delapan unit test guard baru mengunci perilaku
ini, termasuk regresi v2.8.9 (agen di /custapp).

**Hardening zoom native.** `android.zoomEnabled: false` kini disematkan
eksplisit di capacitor.config.ts DAN salinan generated Android
(android/app/src/main/assets/capacitor.config.json — build CI native tidak
menjalankan `cap sync`, jadi salinan itu yang dibaca APK). appViewport juga
memeriksa ulang shell saat `load` + 300 ms: injeksi bridge Capacitor yang
tiba setelah evaluasi modul tidak lagi bisa meninggalkan WebView bisa
di-zoom; `apply()` no-op bila kondisi sudah aktif, jadi situs publik di tab
browser tetap zoomable demi WCAG 1.4.4 (keputusan v2.8.10 tidak berubah).

Tidak ada perubahan API, auth, bisnis logika, atau skema DB; APP_VERSION tidak
di-bump agar sesi ter-simpan tidak dipaksa logout.

## v2.8.10 - 2026-11-11

### Portal app terkunci seperti aplikasi native — tidak bisa di-zoom, full screen

Komplain owner: "di apps mobile semua bisa di zoom, jadi aneh — harusnya
bertindak just as an app yang tidak bisa di zoom in/out dan clearly on full
screen mode."

**Akar masalah.** Lock viewport yang sudah ada (`services/appViewport.ts`)
hanya aktif saat halaman benar-benar berjalan sebagai installed PWA
(`display-mode: standalone` dst.) atau build Capacitor; di tab browser biasa
keempat portal sengaja dibiarkan zoomable demi WCAG 1.4.4 (keputusan lama).
Owner membuka portal di tab browser, jadi pinch-zoom dan double-tap zoom tetap
hidup dan halaman terasa seperti website, bukan app.

**Kini portal app selalu terkunci (admin, agent, customer, operator).** Keempat
entry memakai `<html data-sp-app>` — deklarasi di HTML, bukan di JS — sehingga
lock tidak bergantung cara halaman dibuka: tab browser, PWA ter-install, atau
WebView Android semuanya menerima viewport
`maximum-scale=1.0, user-scalable=no, viewport-fit=cover`, class
`sp-app-locked`, pemblokiran gesture iOS (`gesturestart/change/end`), dan blok
ctrl/⌘+scroll. CSS `sp-app-locked` naik dari `touch-action: manipulation` ke
`touch-action: pan-x pan-y` — pinch kini ditolak di level CSS pula
(touch-action diselesaikan sebagai intersection rantai ancestor, descendant
tidak bisa menyalakan ulang zoom; double-tap zoom juga tidak termasuk gesture
yang diizinkan) — plus padding `env(safe-area-inset-top/left/right)` agar
konten tidak terbenam status bar/notch (iOS black-translucent, Android
edge-to-edge) tanpa menghitung inset bawah dua kali (itu tetap di
`.sp-modern-app`). Rubber band/pull-to-refresh tetap mati. Situs publik
(index.html) sengaja tetap zoomable — di situlah WCAG 1.4.4 paling relevan dan
pengunjung tidak punya app chrome; kebutuhan teks lebih besar di dalam portal
dilayani OS (display size / zoom aksesibilitas). Wrapper Android (Capacitor)
sudah non-zoomable secara default (`zoomableWebView=false`) — tidak diubah.
Tidak ada perubahan API, auth, bisnis logika, atau permission.

Untuk pengalaman penuh "app", pasang portal dari browser (Install / Add to
Home Screen) — portal terbuka tanpa chrome browser (standalone; iOS
black-translucent status bar).

## v2.8.9 - 2026-11-11

### Jejak aktivitas yang menjawab "apa yang dikerjakan" + agen terkunci di app agen + referral sinkron database

Tiga perbaikan atas komplain owner (11 Nov 2026).

**Log admin sekarang jelas (komplain: hanya "Get My Notifications" tanpa
detail).** Aksi polling notifikasi yang dinyalakan timer tiap portal terbuka
(30–60 detik sekali, ratusan baris per jam per perangkat) tidak ditulis lagi
ke jejak — kebisingannya menenggelamkan aksi bermakna, termasuk kolom "Paling
Sering" di ringkasan. Setiap baris jejak kini membawa kolom `detail`: ringkasan
apa yang dikerjakan (nomor order, email target, status, jumlah), dibangun
dispatcher gateway HANYA dari whitelist kunci aman — stance privasi tidak
berubah, NIK/foto/kata sandi tetap tidak pernah disalin. Kolom Target juga
kini mengenali seluruh kunci pengenal umum (dulu hanya 5, mayoritas baris
kosong). CMS (Jejak Aktivitas → rinci) menampilkan kolom Detail menggantikan
kolom Parameter yang dulu hanya berisi nama kunci. Migration menambah kolom
`sp_activity_log.detail`.

**Agen tidak bisa lagi berpindah ke app nasabah (komplain: kadang masih
terjadi).** Satu-satunya jalan agen masuk app nasabah adalah `allowed_apps`
yang mengandung 'CUSTOMER' — array basi dari backfill lama atau hibah manual:
itu yang membuat kartu "Customer App" muncul di selector, guard mengizinkan
/custapp, dan (terburuk) `hasAppAccess` menolak agen di /agapps sehingga
catch-all CustomerPortal justru merender di URL milik agen. Kini
`effectiveAppsFor`/`hasAppAccess`/guard memakai satu aturan role-authoritative
dari routeHelpers: agen hanya berada di app agen, hibah 'CUSTOMER' diabaikan
di semua titik; selector memakai daftar yang sama (entri raw-role nama lama
tidak lagi menjadi kartu hantu). Di server, migration membersihkan 'CUSTOMER'
dari allowed_apps baris AGENT dan trigger `sync_allowed_apps_with_role`
diperluas menegakkannya permanen — admin_update_user tidak bisa
mengintroduksi ulang drift.

**Referral tidak lagi gugup (komplain: kode upline di app tidak sinkron
dengan database, downline tidak masuk).** Tiga akar masalah ditutup:
(1) lookup upline memakai `.or().maybeSingle()` — satu kode dicocokkan lebih
dari satu baris (agent_code 4 digit berbenturan) dan lookup gagal SENYAP;
kini kandidat diambil semua dan pemenang dipilih deterministik
(`pickUplineMatch`: referral_code → agent_code → terlama), termasuk di
pembuatan mitra oleh admin; (2) benturan kode dicegah — data lama didedupe
migration, unique index dipasang pada agent_code & referral_code, dan
pembangkit kode baru memverifikasi keunikan sebelum insert (format tetap
persis, pembangkit kriptografis dari codes.ts); (3) app agen kini membaca
kode rujukan langsung dari database (`referral_code` kanonik, dibackfill
dari agent_code) alih-alih memakai salinan sesi yang bisa basi atau fallback
lokal yang difabrikasi — kode yang dibagikan pasti sama dengan yang
dicocokkan server, dan pencocokan juga case-insensitive.

Deploy: edge function `data-gateway` berubah (detail, noise-skip, referral,
kode unik) dan migration harus diterapkan — keduanya berjalan otomatis lewat
integrasi Supabase-GitHub saat merge ke main.

## v2.8.8 - 2026-11-11

### Order unit B2B (mobil & alat berat) + kata sandi manual permanen + watermark & proteksi layar admin

Tiga permintaan owner (11 Nov 2026): order kendaraan satuan dari portal B2B
memakai rate/skema yang ada, kata sandi manual B2B yang tidak dipaksa reset,
serta penguatan dashboard admin (klik animation, watermark logo, anti-print).

**Order Unit di portal B2B — mobil, motor, dan alat berat**

- Layar baru "Buat → Order Unit" (`B2BUnitOrder`): pilih kelas kendaraan
  (Mobil / Motor / Alat Berat), isi unit (merk, tipe, tahun), plat & wilayah
  untuk deteksi zona (override manual tersedia), TSI, tenor, dan data
  nasabah/kontrak — lalu submit satu order tanpa spreadsheet.
- Preview premi live memakai mesin rating yang sama dengan impor massal
  (`buildLineItem`/`calcBulkPremium`) dan flag yang sama (zona tak terdeteksi,
  OTR kosong, dsb.). Server tetap menghitung ulang otoritatif lewat
  `b2b_bulk_create_batch` — order satuan = batch 1 item, jadi invoice Xendit
  per batch, status DRAFT→…→ISSUED, dan penerbitan polis induk semuanya
  berjalan di jalur yang sudah teruji tanpa aksi gateway baru.
- Rate alat berat (0.85%), rate pickup/truk per zona, diskon standar/heavy,
  biaya admin per kelas (25rb/45rb/65rb), dan minimum premi semuanya tetap
  satu sumber: `sp_b2b_fleet_rate_sets`, dapat diubah kapan pun admin lewat
  CMS → Katalog & Harga → Rate Fleet B2B (versi + aktivasi). Kartu skema aktif
  ditampilkan di form supaya klien melihat dasar harganya.
- Master Admin tetap mode pantau: tidak bisa membuat order (konsisten dengan
  Pengajuan Baru/Impor Massal).

**Kata sandi manual B2B berlaku permanen**

- `admin_create_b2b_user` (mode password) tidak lagi menyetel
  `must_change_password` — pengguna korporat langsung login dengan sandi yang
  di-set MASTER_ADMIN, tanpa email reset. Parameter `require_change: true`
  tersedia bila perilaku lama dibutuhkan.
- `admin_set_mitra_temp_password` kini menerima target `B2B_CLIENT` (default
  tanpa wajib ganti, selaras di atas) + parameter kata sandi kustom opsional;
  layar Pengguna Korporat mendapat tombol "Setel Sandi" per pengguna — sandi
  baru juga berlaku permanen dan tampil sekali di banner kuning.
- Teks wizard/banner (AddUserWizard, B2BAdminView) disesuaikan; AGENT dan user
  internal mempertahankan perilaku wajib ganti. 9 test baru di
  `mitraAccounts.test.ts` mengunci kontrak ini (30 test modul, semua lulus).
- Catatan deploy: perubahan ada di edge function `data-gateway` — perlu
  deploy Supabase seperti biasa.

**Dashboard admin: klik animation, watermark, anti-printscreen**

- Klik animation global: elemen interaktif mengecil halus (scale 0.97) saat
  ditekan, di admin (`sp-admin-root`) dan portal B2B (`sp-b2b-root`),
  hormat `prefers-reduced-motion` (portal-modernization.css §5b).
- Watermark logo SurePath di dashboard admin: fixed, transparan (~5%),
  non-interaktif, di atas konten di bawah modal — mengikuti logo kustom yang
  diunggah admin di Pengaturan.
- Anti-printscreen/anti-print (deteren level UX, bukan keamanan absolut —
  catatan anti-inspect lama di index.html tetap jadi pegangan): PrintScreen
  menampilkan shield + menimpa clipboard; Ctrl/Cmd+P diblokir; `@media print`
  menyembunyikan seluruh root admin dan menggantinya dengan satu baris
  penjelasan.

## v2.8.7 - 2026-11-11

### Status satu bahasa lintas app: lib/statusMeta jadi sumber tunggal + badge berbentuk (ikon)

Port sisa kerja branch desain v3 (v2.7.20, tertinggal dari rebuild
v2.7.35–v2.8.6) yang masih relevan di atas main v2.8.6. Audit menunjukkan
konsolidasi status lama hanya menjangkau 3 file (adminUI, AdminViews,
OperatorOrders); lima render site lain masih membawa salinan warna sendiri
untuk status yang sama.

**Badge status kini satu sumber di semua app**

- `AgentOrderStatus` (Mitra), `PolicyOrdersAdmin` (Admin), `InsurerOrders`
  (list + sheet) dan `InsurerDashboard` (status pill) tidak lagi memetakan
  warna/label sendiri — semuanya membaca `lib/statusMeta`. Untuk ISSUED,
  Mitra sebelumnya menampilkan "Polis Terbit" hijau ds-green sementara
  Admin/Operator "Polis Aktif" emerald; kini sama.
- `AdminStatusBadge` merender ikon bentuk dari statusMeta (aria-hidden):
  status tetap terbaca bagi pengguna buta warna dan ketika dua status
  berbagi keluarga warna.

**Perbaikan pada peta itu sendiri**

- Bug v2.8.6: ORDER `SUBMITTED` dan `UNDER_REVIEW` punya badgeClass persis
  sama (amber) — dua status berbeda tak terbedakan. UNDER_REVIEW kini biru,
  selaras dengan peta klaim.
- `ISSUED` dan `PAID` sedikit lebih pekat agar tidak identik dengan
  `APPROVED`; ikon tiap status dibuat unik per peta (Clock/Eye/CheckCircle/
  FileText/XCircle/Ban/AlertCircle/BadgeCheck).
- `CLAIM_STATUS_META` menambah `CLOSED` (ada di union `SpClaim['status']`,
  sebelumnya hanya dipetakan lokal di AgentClaims).
- Test baru `services/__tests__/statusMeta.test.ts`: peta menutup semua
  union dbTypes (gagal kompilasi jika union bertambah), badgeClass valid,
  tidak ada dua status dengan warna/ikon identik, fallback aman.

**Drift versi ditutup total**

- `package.json` tertinggal di "2.7.17" padahal app sudah 2.8.6 — kini ikut
  disinkronkan. `scripts/sync-android-version.mjs` menjaga ketiga sumber
  (src/version.ts, build.gradle, package.json); mode `--check` gagal jika
  salah satu melenceng.

## v2.8.6 - 2026-11-11

### B2B: login korporat premium + portal yang jujur soal kegagalan data

Port dari PR #371 yang ditutup (branch lama berbasis v2.7.55 tertinggal dari
desain ulang v2.8.3–v2.8.5) — dua bagian yang masih relevan dipindahkan ke
branch baru dari main v2.8.5.

**Login B2B premium (split desktop + transisi wipe)**

- Layout split di desktop: panel brand hijau bertema buku besar (motif garis
  ledger, tiga nilai produk: pengajuan satuan & impor armada, penawaran & PDF,
  status transparan) di kiri; kartu kaca tetap di kanan — di mobile layout lama
  dipertahankan.
- Saat login berhasil: panel hijau **menyapu layar dari kiri ke kanan**
  ("Selamat datang kembali" + progress bar) sebelum portal termuat di
  bawahnya — terbaca sebagai login menyerahkan kendali ke portal. Semua
  animasi hormat `prefers-reduced-motion`.
- Logika autentifikasi tidak disentuh: pengecualian MASTER_ADMIN (mode pantau
  v2.8.1), paksa ganti sandi `must_change_password` via email reset, dan
  penolakan role lain tetap persis perilaku main.

**Portal B2B — gagal muat tidak lagi menyamar jadi "kosong"**

- `getB2BSubmissions`, `getAllB2BSubmissions`, `getB2BQuotes`,
  `getAllB2BQuotes` (services/website.ts) dan `getB2BBulkBatches`
  (services/b2bBulk.ts) kini **melempar error** alih-alih menelan jadi `[]`.
  Array kosong terbaca "belum ada data" dan menyembunyikan kegagalan dari
  klien; try/catch yang sudah ada di B2BSubmissions ternyata tidak pernah
  terpicu karena itu.
- **B2BPortal** menangkap kegagalan → **B2BDashboard** menampilkan banner
  amber "Sebagian data dashboard belum dapat dimuat" + tombol **Coba lagi**
  (angka KPI bisa jadi tidak lengkap — jujur soal itu).
- **B2BQuotes** dan **B2BBulkBatches** (keduanya memuat data sendiri) dapat
  try/catch + panel error dengan Coba lagi, menyamai pola yang sudah ada di
  B2BSubmissions. B2BAdminView sudah aman (catch-nya sendiri).

Verifikasi: eslint file terubah 0 error (warning deps pre-existing); vitest
`services/__tests__/` penuh — 51 file lolos, 3 gagal = pre-existing lokal
(theme/pwaInstall/onboardingIllustrations), bukan regresi. Versi `2.8.6`,
Android `versionCode 63`.

## v2.8.5 - 2026-11-07

### Admin: Unified AddUserWizard + KYC Matrix + Animated Charts (PR #1 dari 2)

**Masalah user yang ditangani**: "Untuk penambahan mitra dan penambahan user,
jika di klik tambah tampilannya jelek dan ga bs bikin pass manual. Perbaiki
dan sesuaikan kyc yg dibutuhkan untuk masing2 roles atau mitra.. lalu untuk
b2b jg sesuaikan."

**3 modal lama dengan 3 visual language berbeda** (AddMitraModal, AddInternalUserModal,
UsersSection inline di B2B) → **satu AddUserWizard** 5-step yang mendispatch
ke action backend yang tepat berdasarkan role.

#### Database foundation
- **Migration `20261107120000_kyc_docs_column_and_bucket.sql`**:
  - `ALTER TABLE sp_users ADD COLUMN kyc_docs jsonb DEFAULT '{}'`
  - Bucket privat `kyc-documents` (10MB cap, JPG/PNG/WebP/PDF)
  - RLS policy `service_role only` untuk SELECT/INSERT/UPDATE/DELETE
    (admin baca via signed URL yang gateway buat setelah role check)
- **Gateway actions baru** di `mitraAccounts.ts`:
  - `admin_upload_kyc_file`: base64 upload (max 3MB raw), validasi MIME +
    doc_type whitelist, merge entry ke sp_users.kyc_docs
  - `admin_get_kyc_doc_url`: signed URL 5-menit untuk baca dokumen

#### Primitives (components/admin/wizard/ui.tsx, 440 lines)
- `SmoothModal` — scale + slide enter, backdrop blur fade, esc/body-scroll-lock
- `StepIndicator` — pill progress (click-back ke step done, no skip forward)
- `FileUploadField` — click + drag-drop, preview thumbnail, inline progress,
  size/MIME validation, clear button
- `PasswordField` — animated strength meter (ease-out color-mix), visibility
  toggle, "Generate kuat" button, copy clipboard
- `RoleCard` — big visual picker dengan portal label + perms preview,
  check-pop animation on select
- `WizardButton` — ripple pada press, hover lift+shadow
- CSS keyframes: backdrop-in, panel-in/out, step-forward/back, pulse,
  pop-check, ripple. All respect `prefers-reduced-motion`.

#### KYC Matrix (components/admin/wizard/kycMatrix.ts, 325 lines)
Per-role identitas fields + document requirements:

| Role | Required Fields | Required Docs |
|---|---|---|
| Mitra | nama, email, phone, KTP, alamat, bank+rekening, nama rek, NPWP | KTP, NPWP |
| Admin/Master | nama, email, phone, NIP, department | KTP |
| Finance L1/L2/L3 | nama, email, phone, NIP, dept, approval_limit | KTP |
| Operator | nama, email, phone, NIP, assigned_insurer | KTP |
| Insurance Admin | nama, email, phone, NIP, assigned_insurer | KTP, surat penunjukan insurer |
| B2B Client | pic_name/email/phone/KTP, company_name, NIB, NPWP perusahaan, industri, alamat | NPWP perusahaan, NIB/SIUP, KTP PIC |

ROLE_META mendefinisikan: action backend, caller role yang diizinkan,
icon, accent color, portal path, canSetManualPassword flag.

#### AddUserWizard (580 lines)
5-step unified flow:
1. **Role** — visual card grid, filtered berdasarkan callerRole
2. **Identitas** — fields dinamis dari FIELD_MATRIX[role]
3. **Dokumen KYC** — files dari DOC_MATRIX[role], FileUploadField per-doc
4. **Akses** — invite vs manual password (dengan PasswordField strength meter)
5. **Review** — summary dengan edit-back per section + "Buat"

Submit flow: create user via createMitra/createInternalUser/adminCreateB2BUser
→ get user_id → upload each file via uploadKycFile sequential. Partial
upload failures dilaporkan via onCreated docErrors (user tetap dibuat).

#### Replaced
- `AddMitraModal` di `AgentManagementView` (deleted ~170 lines)
- `AddInternalUserModal` di `UserManagementView` (deleted ~210 lines)
- Inline form di B2B `UsersSection` (deleted ~120 lines)

Semua tiga jalur sekarang memanggil `AddUserWizard` dengan `defaultRole`
berbeda (AGENT / ADMIN|FINANCE / B2B_CLIENT). Operator tetap bisa ganti
role di step 0 jika berubah pikiran.

#### Charts animated theme
`AdminDashboard` Financial Intelligence section:
- Custom `AdmChartTooltip` (card brand-consistent dengan left accent stripe,
  fade-up animation, tabular numerals) menggantikan recharts default
- AreaChart: `animationDuration=900` ease-out, activeDot dengan white ring,
  cursor dashed 3-3 tipis
- PieChart: `animationBegin=120` (slight stagger), center label total
  pesanan + "Pesanan" caption, hover slices via custom tooltip
- `strokeWidth=2.5` consistent brand green #076653

#### Service wrapper
`services/kyc.ts`: `uploadKycFile` (base64 encode + gateway call), 3MB cap
client-side validation, MIME allowlist, file→base64 chunked untuk avoid
stack overflow pada file besar. `getKycDocSignedUrl` untuk preview.

### Deploy steps (manual — tidak otomatis di Vercel merge)
1. Apply DB migration: `supabase db push` atau via Supabase MCP (session ini
   timeout di approval prompt, jadi user perlu run manual atau approve via
   Supabase dashboard)
2. Deploy edge function: `supabase functions deploy data-gateway --project-ref uyjgeteelnswphyzkjwi`

### Verifikasi
- tsc 0 error
- eslint 2 warning (pola existing)
- vitest 639/639 pass (termasuk `adminDesignFloor` 11px + light-surface guards)
- vite build sukses

### Follow-up PR #2 (dashboards marketing/sales/business enhance)
Scope terpisah sesuai pilihan "Full dalam 2 PR terpisah". PR #2 akan handle:
- MarketingDashboard: funnel viz, handler leaderboard sparkline, B2B pipeline Kanban
- SalesDashboard (new): combined view agents + B2B, top performers, revenue breakdown
- BusinessSupportDashboard: SLA metrics, ticket queue priority sort

## v2.8.4 — 2026-11-07

### Admin Dashboard: evolution pass (polish + context + intelligence)

Admin dashboard di-upgrade **di tempat** — bukan redesign ulang. Struktur
existing (hero editorial, 2 attention cards, 4 KPI, financial charts,
pesanan terbaru, mitra terbaik, aktivitas feed, calendar jatuh tempo,
tugas saya) semua dipertahankan. Yang berubah: polish, context, dan
beberapa fitur baru untuk operator sehari-hari.

**Primitives baru** (`components/admin/dashboard/ui.tsx`):
- `AdminCountUp` — smooth 0→value tween (ease-out-quart 800ms), reduced-
  motion honored.
- `AdminSkeleton` + variants (Hero/KpiRow/Table) — shimmer indigo-tinted
  yang mirror shape yang diganti.
- `AdminPill` + `AdminAgePill` — tone semantic, age-smart (fresh < 2h
  neutral, 2-6h accent, 6-24h warn, >24h danger).
- `AdminLiveDot` — pulsing status dot (emerald segar, amber stale > 30s).
- `AdminRangeToggle` — pill-group yang mengganti `<select>` hero.
- `AdminToastProvider` + `useAdminToast()` — top-right stack, aria-live.
- `AdminCommandPalette` — standalone (tidak dipakai di shell karena
  existing palette sudah ada; disediakan untuk konsumsi future).
- `AdminFocusBar` — sticky single-row urgent alert, dismissible per
  session.
- `AdminSidePanel` — right-slide drawer dengan Esc + backdrop close.
- `AdminSparkline` — pure SVG, 7-hari inline untuk KPI cards.

**Hero section** (`AdminDashboard.tsx`):
- Greeting kontekstual shift-aware: pagi menyebut antrean semalam, siang
  menyebut ajuan + penarikan besar, sore ringkas rangkum hari.
- `AdminCountUp` pada angka premi (0 → Rp X dalam 800ms).
- `AdminLiveDot` pulsing di sebelah "diperbarui" (amber jika > 30 detik).
- `AdminRangeToggle` 30h/90h/1th pill group ganti `<select>` native.
- Skeleton hero + 2 KPI row saat initial boot load (bukan blank).

**Focus bar sticky**: muncul di atas hero kalau ada > 0 approval menumpuk
> 24 jam. Dismissible per-session. Tombol "Buka antrean" langsung ke
`approvals` view.

**KPI cards sekunder**: inline sparkline 7-hari untuk metric yang punya
per-day data (orders, claims, withdrawals). Mitra Aktif tetap tanpa
sparkline (tidak meaningful day-over-day).

**Pesanan Terbaru table**:
- Row hover accent gradient stripe (indigo→lime, 3px, 220ms ease).
- Overdue badge auto (`AdminAgePill` warn/danger) di row dengan status
  SUBMITTED/UNDER_REVIEW yang menunggu > 24 jam.

**Tugas Saya queue**:
- Smart sort: `age × 0.6 + amount × 0.4` — Rp 10jt yang 2 jam lagi
  berada di atas Rp 500K yang 5 jam.
- `AdminAgePill` tone-mapped per hours waited.
- Inline chevron button (bukan hanya baris yang clickable).

**Calendar jatuh tempo**: tiap hari dengan polis jatuh tempo kini
clickable. Side panel kanan menampilkan daftar polis berakhir hari itu
(nama nasabah, nomor polis, premi, status).

**Shell integration**: `AdminPortal` sekarang dibungkus `AdminToastProvider`
sehingga view mana pun bisa panggil `useAdminToast()` untuk feedback
sukses/error/info tanpa alert/inline bar.

**A11y**:
- `prefers-reduced-motion` honored semua animation (countup, skeleton,
  stagger, ripple).
- Skeleton `role="status"`, toast `aria-live="polite"`, palette/panel
  `role="dialog"`.
- Range toggle `role="radiogroup"` dengan `role="radio"` + `aria-checked`.
- Focus bar `role="alert"`.

**Data flow tidak berubah**: `buildDashboardModel()` + semua props sama.
Primitives tambahan tidak melakukan fetch baru; sparkline derive dari
array orders/claims/withdrawals yang sudah di-fetch oleh AdminPortal
(zero new gateway calls).

Verifikasi: tsc 0 error, eslint 2 warning (pola existing dependencies),
vitest 639/639 pass (termasuk `adminDesignFloor` yang guard typography
floor 11px), vite build sukses, screenshot dashboard + palette confirmed.

## v2.8.3 — 2026-11-06

### B2B Portal: full dashboard refresh (glassmorphism, Mercury tables)

Portal B2B (`/b2bapps`) diubah total dari shell mobile-first consumer app
ke dashboard enterprise desktop-first. User korporat (multifinance, admin
perusahaan) buka portal dari laptop — layout lama dengan `max-w-lg`
column di tengah + bottom tab bar HP terasa "apps" bukan "dashboard".

**Shell baru** (`components/b2b/dashboard/ui.tsx` — satu file design system):
- Sidebar kiri 240px dengan glass transparan indigo (`rgba(255,255,255,0.78)` +
  backdrop-blur 24px), drawer dari kiri di <lg. Grouped nav dengan sub-items
  (Pengajuan→Satuan/Massal, Buat→Pengajuan Baru/Impor Massal), active state
  gradient indigo, badge count real-time untuk Pengajuan+Penawaran.
- Topbar 64px dengan breadcrumb path (Portal B2B › Section › Subsection),
  Pathy CTA (tombol emerald gradient ganti FAB floating 56px lama),
  bell/theme/mobile menu button.
- Ambient background: dot grid indigo + dua drifting radial blobs
  (emerald + indigo) — lanjutan dari B2BLogin yang baru.
- Primitives shared: `B2BGlass`, `B2BKpi`, `B2BPill`, `B2BTable`,
  `B2BSidePanel`, `B2BSectionHeader`, `B2BSearchInput`, `B2BButton`.

**Dashboard home** (`B2BDashboard.tsx`, replace `B2BHome.tsx`):
- Hero line dengan company name (gradient indigo→emerald text), role
  indicator, quick-action buttons (Pengajuan Baru / Impor Massal).
- KPI strip 4 kartu flat glass: Menunggu Review, Penawaran Aktif, Polis
  Terbit, Unit Armada — mono JetBrains numerals, icon ring indigo, tone
  semantic (warn/accent/success/default).
- 2-column grid: Pengajuan Terbaru table (2/3) + Open Quotes callout
  panel + Pathy quick-launch panel (1/3).
- Bulk batches full-width table row saat ada batch.

**List screens** (`B2BSubmissions`, `B2BQuotes`, `B2BBulkBatches`):
- Mercury-style data tables (hairline divider, hover indigo-50 highlight,
  click row → side panel detail).
- Status pill tone-mapped (warn/info/accent/success/danger).
- Search input + filter chips scoped per-panel.
- Detail panel kanan (`B2BSidePanel`) dengan Esc + backdrop close, 480px
  width di desktop, full-width di mobile.
- B2BBulkBatches detail view: totals grid 4-kolom (Gross/Diskon/Admin/Total),
  action buttons inline di header, items table full-width.

**Create flows** (`B2BNewSubmission`, `B2BBulkImport`):
- Container diperlebar dari `max-w-lg` ke `max-w-4xl`/`max-w-5xl` + glass
  card wrapper. Internal step logic + form validation unchanged.

**Profile** (`B2BProfile`):
- 2-column layout: form 2/3 kiri, identity card 1/3 kanan.
- Avatar emerald gradient, pill "B2B Client", contact rows (mail/phone/industry).
- Master-admin monitor view: single identity card + scope explanation.

**Pathy launcher** pindah dari FAB bottom-right ke tombol di topbar +
quick-launch panel di dashboard home — hemat viewport, konsisten dengan
pola dashboard enterprise.

### Polish pass — animated micro-interactions + nice-to-haves

- **Skeleton loading** (`B2BSkeleton`, `B2BTableSkeleton`, `B2BKpiSkeleton`):
  shimmering indigo-tinted placeholders yang match shape elemen nyata,
  bukan grey slug generik. Dipakai saat initial dashboard fetch dan di
  semua table list screens.
- **CountUp animation**: KPI numerals animate 0→value dengan ease-out-quart
  700ms saat pertama kali render. Respect prefers-reduced-motion.
- **Toast system** (`B2BToastProvider` + `useB2BToast()` hook): top-right
  stack, max 3 pesan, auto-dismiss 3.5s, slide-in dari atas dengan fade.
  Wired ke save profile, accept/reject quote, create invoice.
- **Ripple effect**: tombol primary/danger/success tunjukin pointer-origin
  ripple on press; subtle lift (`-translate-y-0.5`) + shadow on hover.
- **Row hover accent**: stripe gradient indigo→emerald glide dari kiri
  pada table row hover (3px). Lift tanpa biaya layout shift.
- **Stagger animation**: KPI cards dan table rows muncul dengan stagger
  40-240ms (`b2b-stagger` class + nth-child delays).
- **Command palette ⌘K / Ctrl+K**: hidden power feature untuk quick-jump
  ke nav section. Search, arrow-key nav, Enter pilih, Esc close. Hint
  tombol visible di topbar (`⌘K` kbd) untuk discoverability.
- **Enhanced side panel**: TLS slide-in dari kanan (`b2b-slide-in-right`
  keyframe), background blur-2px backdrop, Esc close.
- **Sleek font tuning**: `font-feature-settings: "ss01","cv11","cv09","liga"`
  di `.sp-b2b-root` scope + tabular-nums + lnum untuk `.b2b-numerals`
  class. Antialiased, legibility rendering.
- **Scoped thin scrollbars** (`.b2b-scroll`) Firefox + WebKit, tipis
  dengan tint indigo-18%.
- **A11y**: `prefers-reduced-motion` honored untuk semua animation.
  Skeleton punya `role="status"` + `aria-busy="true"`. Toast punya
  `aria-live="polite"`. Command palette `role="dialog"`.

Data fetching, gateway calls, auth, Supabase service, dan PWA tidak
berubah — hanya chrome + layout. `B2BLogin` (glassmorphism indigo yang
baru dirilis v2.8.2) tetap. B2BHome.tsx dihapus.

Verifikasi: tsc 0 error, eslint 5 warning (pola existing), vitest 639/639
pass, vite build sukses, screenshot desktop (dashboard/submissions/quotes/
profile) + mobile drawer confirmed.

## v2.8.2 — 2026-11-06

### Insurer Portal: redesign Dashboard + Login (hybrid "Brand hero + Mercury data")

Dua layar paling impactful dari Insurer Portal di-redesign dengan arahan
yang dipilih owner setelah review dua opsi di figcraft: **hero branded
emerald (Option B) + KPI/list enterprise Mercury-style (Option A)**.

- **Shared `InsurerHero`** component baru (`components/insurer/InsurerHero.tsx`):
  gradient emerald-900→700 dengan concentric rings dekoratif, pulsing
  status dot, ExtraBold insurer name, chip row (`InsurerHeroChip` helper).
  Reusable di tab lain yang butuh "command center" feel.
- **Dashboard** (`InsurerDashboard.tsx`): hero branded di atas, KPI 2x2
  flat white dengan mono JetBrains numerals + status dot semantik, Total
  Premi sebagai dark-navy block (#0F172A) dengan mono white, recent orders
  sebagai divider-separated rows (bukan card individual lagi) dengan mono
  order# dan semantic pill — data-forward, cepat scan.
- **Login** (`InsurerLogin.tsx`): split-screen di desktop (branded panel
  kiri dengan feature bullets + white card login kanan), compact branded
  header di mobile. Gradient emerald button, mono input, enter-to-submit,
  Kembali + Insurer Session chips konsisten. Mengganti palette ungu-oranye
  yang lama ke emerald-only agar sejalan dengan brand SurePath.

Data fetching, handlers, dan auth flow TIDAK berubah — hanya presentasi.
Verifikasi: tsc 0 error, eslint bersih, vite build sukses, screenshot
mobile+desktop confirmed.

**Follow-up v2.7.60** (akan menyusul di PR terpisah): Orders, Claims,
Payments, Profile, BulkBatches, Notifications — menerapkan pola Mercury
list yang sama agar seluruh portal konsisten dengan arahan baru.

## v2.7.58 — 2026-11-05

### Tambah user password manual + Kredit manual komisi/koin (four-eyes) + UX modal

Tiga direktif owner digabung dalam satu rilis — semua di Admin CMS:

**A. Admin Dashboard: tambah pengguna internal dengan kata sandi manual.**
Sebelum ini modal "Tambah Admin Baru" hanya punya mode email-undangan;
pola mode `password` yang sudah ada untuk Mitra & B2B tidak tersedia untuk
ADMIN/FINANCE/OPERATOR/INSURANCE_ADMIN. Ditambahkan aksi gateway baru
`admin_create_internal_user` (dua mode `invite` + `password`, mode password
MASTER_ADMIN only) dan modal `AddInternalUserModal` yang mencerminkan pola
AddMitraModal: role picker dengan matriks eskalasi (MASTER_ADMIN/ADMIN
hanya bisa dibuat MASTER_ADMIN), input sandi dengan kebijakan min 10 + 3
dari 4 kelas karakter, serta `CredentialModal` sekali-tampil (sandi tidak
disimpan di mana pun). Label tombol pemicu di menu Kelola Akun berubah dari
"Tambah Admin" menjadi "Tambah Pengguna".

**B. Finance: Kredit manual komisi & koin (four-eyes approval).** Untuk
polis yang ditutup mitra di luar aplikasi (telepon, kunjungan, mitra
institusi). Alurnya:
- DB: tabel baru `sp_manual_commission_requests` dengan deny-all RLS,
  CHECK constraint four-eyes (`decided_by <> requested_by`) dan status
  terbatas `PENDING → APPROVED → APPLIED` atau `PENDING → REJECTED`.
- Gateway: 3 aksi baru di `manualCommission.ts`
  - `finance_request_manual_commission` (FINANCE_ROLES — tidak termasuk
    OPERATOR, konsisten dengan gerbang wallet)
  - `admin_list_manual_commission_requests` (FINANCE_ROLES + MASTER_ADMIN)
  - `master_decide_manual_commission` (MASTER_ADMIN only; approve memanggil
    `credit_agent_wallet` RPC + `sp_coin_ledger` + `increment_coins_balance`,
    lalu pindah ke APPLIED dan menyimpan `applied_wallet_tx_id` sebagai
    audit link; reject wajib alasan min 5 karakter)
- UI: dua view baru di grup Keuangan → Komisi
  - **Kredit Manual** (`manual_credit`, Finance/Admin/MASTER_ADMIN): form
    pengajuan dengan agent picker (search), nominal IDR + koin, nomor
    polis referensi, alasan wajib (min 10 karakter), plus tabel
    permintaan milik caller dengan status real-time.
  - **Approval Kredit Manual** (`credit_approvals`, MASTER_ADMIN only):
    antrean PENDING + tab riwayat. Tombol Setujui/Tolak dimatikan untuk
    permintaan yang diajukan caller sendiri (four-eyes UX).
- Notifikasi: MASTER_ADMIN menerima lonceng CMS + Telegram tiap request
  baru; requester & mitra diberi tahu saat disetujui/ditolak.
- 18 test baru (`services/__tests__/manualCommission.test.ts`): gerbang
  peran, validasi, four-eyes anti-self-approve, dan jalur approve
  memanggil RPC yang benar.

**C. UX modal — fix "lembaran hitam".** Owner menyebut modal yang terbuka
dari CMS punya backdrop terlalu gelap dan ukuran tidak user-friendly.
Dibuat wrapper terpadu `components/admin/shared/AdminModal.tsx`:
- Backdrop standar `bg-slate-900/40 dark:bg-slate-950/55 backdrop-blur-[3px]`
  (lebih lembut dari `bg-black/80` lama), dengan tone `prominent` untuk
  modal yang memang perlu menarik perhatian (CredentialModal).
- Ukuran konsisten `sm|md|lg|xl|2xl`, `max-h-[92dvh]`, scroll contained
  (tidak "menjepit" header/footer saat konten panjang).
- Sticky footer, Escape close, klik backdrop close, `aria-modal`.
- Diterapkan ke: `CredentialModal`, `AddInternalUserModal` baru,
  `ManualCommissionRequest/ApprovalView`, `DecisionDialog`. Juga memperbaiki
  backdrop `bg-black/80` di `BulkImportModal` dan `ProductConfigAdmin`.
- Nav: dua leaf baru (`manual_credit`, `credit_approvals`) wiring ke
  AdminPortal + ADMIN_MENU_ITEMS; pinned count naik 31 → 33.

Verifikasi: `tsc --noEmit` 0 error, eslint bersih, vitest **639 lulus**
(sebelumnya 620 + 19 tes baru), vite build sukses. Migration
`20261106150000_manual_commission_requests` sudah diterapkan ke production.

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