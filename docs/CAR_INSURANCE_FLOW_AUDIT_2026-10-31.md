# Audit Flow Pembelian Asuransi Mobil (Agent App) — 2026-10-31

Audit kelayakan logika alur pembelian asuransi mobil di app Mitra, atas
permintaan roland (thread "Fix admin dashboard UI / Pembelian Asuransi Mobil").

## Peta file

- `components/agent/AgentQuoteBuilder.tsx` — hub pemilihan produk.
  CAR/MOTORCYCLE merutekan ke `VehicleUnderwritingWizard` dengan flag
  `convertQuoteToPurchase` + `initialQuote` opsional (konversi draft).
- `components/agent/VehicleUnderwritingWizard.tsx` — wizard 7 langkah.
- `services/ojkRates.ts` — tabel tarif OJK (satu-satunya kebenaran untuk
  perhitungan premi mobil/motor).
- `services/supabaseService.ts` → `orders.ts` — `createPolicyOrder`.
- `services/paymentService.ts` → `createXenditInvoice`.

## 7 langkah wizard

| # | Nama | Validasi | Simpan ke |
|---|------|----------|-----------|
| 1 | Jenis kendaraan (CAR/MOTORCYCLE) | — | state |
| 2 | Klien (pilih / baru / manual) | nama+telepon wajib | `sp_clients` jika "baru" |
| 3 | Detail kendaraan (STNK OCR + manual) | merek, model, tahun, plat | state |
| 4 | Coverage (sum insured, zona, add-ons) + pilih produk insurer | sumInsured > 0, product dipilih | state |
| 5 | Foto + AI scoring (depan/belakang/samping/odometer) | semua foto VALID | storage |
| 6 | Diskon + metode delivery | discountRate ≤ `max_discount_rate` | state |
| 7 | Order + pembayaran Xendit | — | `sp_policy_orders`, `sp_payments` |

## Logika premi — benar

`calcOjkPremium(vehicleType, coverage, sumInsured, zone, addons)` dipanggil
sekali dengan parameter yang sudah divalidasi:

```ts
const breakdown = calcPremium(vehicleType, coverageType, sumInsured, zone, addons);
// zone = getZone(province)        → 1|2|3 sesuai provinsi
// base rate = getBaseRateByBand() → sesuai (CAR|MOTO) × coverage × zone × priceBand
// addons    = flood/earthquake/riot/tplLimit/paDriver/paPassengerSeats
```

Komisi: `premium × COMMISSION_RATE[product]`
(CAR 12%, MOTORCYCLE 12%, TRAVEL 15%, PA 20%, MPAR 15%). Konsisten antara
quote builder dan wizard pembelian.

## Draft resume — berfungsi

- `sessionStorage.surepath:agent-quote-draft:<agentId>` dengan versi `1`.
- Hanya menyimpan non-PII (nama/telepon klien **tidak** disimpan).
- Resume berjalan di useEffect yang gate oleh `agentId` dan `version === 1`.
- Dibersihkan saat step = 'success' atau product null.
- AgentHome membaca `savedDraftProduct` dan menampilkan banner "Lanjutkan draf".

## Yang sudah benar

- ✓ **Zone**: lookup dari provinsi via plate code (B→DKI, D→Jabar, dll)
  atau dropdown manual. Fallback zone 3 jika kosong.
- ✓ **Market value**: `getMarketValue(brand, model, year)` dari
  `vehicleDatabase.ts` yang mapping ke tahun pembuatan.
- ✓ **Add-on validation**: hanya add-ons yang dicentang masuk ke calc;
  `tplLimit = 0` artinya tanpa TPL.
- ✓ **Insurer selection**: `getAvailableInsurerProducts()` filter dengan
  age cutoff (`excludedByAgeCount` surfaced ke UI).
- ✓ **AI scoring**: `analyzeVehicleSurvey` + `validateVehiclePhoto` per
  sudut. Wizard tidak membiarkan lanjut sampai semua foto VALID.
- ✓ **Discount cap**: `discountRate ≤ productConfig.max_discount_rate`
  dengan slider nilai yang di-clamp.
- ✓ **Xendit invoice**: dibuat setelah `createPolicyOrder` berhasil;
  `orderStarted` ref menjaga agar tidak dobel-submit saat user menekan
  tombol beberapa kali.
- ✓ **STNK OCR**: hasil ekstraksi mengisi field tapi tetap bisa diedit
  manual; validasi per-field disajikan sebagai `StnkOcrNotice`.

## Catatan untuk follow-up (bukan blocker)

1. **Konversi quote → beli** di `AgentQuoteBuilder` (`convertQuoteToPurchase`)
   hanya mengisi `initialQuote` tapi tidak memaksa step wizard loncat ke 3
   kecuali `initialQuote.price` ada. Jika quote lama hanya punya `coverage`
   tanpa `price`, wizard start di step 1 — perilaku masih benar, tapi
   bisa ambigu untuk agen. Pertimbangkan menambahkan toast "Melanjutkan
   dari quote #X".

2. **Delivery fee**: `POS_STANDARD` 10rb (JABODETABEK) / 15rb (OUTSIDE),
   `POS_OVERNIGHT` 20rb / 25rb. Nilai hard-coded di komponen; jika suatu
   saat tarif berubah, perlu CMS. Untuk sekarang OK.

3. **Vehicle usage** di state default `'PERSONAL'`. Underwriting commercial
   / taxi tidak di-expose di UI. Jika perlu produk comm, tambahkan UI
   selector di step 3.

4. **Province mapping untuk motor sport ≥500cc** tetap mengikuti plat
   kendaraan, bukan plat domisili owner. Jika owner pindah provinsi tanpa
   ganti plat, zona bisa salah. Secara aturan OJK tetap plat yang valid.

## Rekomendasi

Flow sudah berjalan sesuai logika. Tidak ada bug blocker. Jika ingin
peningkatan UX:

1. **Progress indicator** di top header wizard — saat ini step angka tidak
   terlihat kecuali dari tombol Back; tambahkan dots atau step-bar.
2. **Review step** sebelum submit — step 7 langsung submit; menambahkan
   layar "Ringkasan sebelum bayar" bisa mencegah fat-finger errors.
3. **Partial save server-side** — draft hanya di sessionStorage; jika
   agen ganti device, draft hilang. Pindah ke tabel draft di DB akan
   meningkatkan kontinuitas.

Semua rekomendasi di atas adalah peningkatan, bukan perbaikan bug. Status
flow sekarang: **berfungsi sesuai logika yang dirancang**.

---

## Tambahan audit — 31 Okt 2026 (sesi kedua)

Audit di atas menyimpulkan "tidak ada bug blocker". Satu temuan terlewat, dan
temuan ini menyentuh uang yang ditagih ke nasabah.

### Biaya Rp 26.000 yang tidak dirinci

`calcPremium()` (`services/ojkRates.ts:390`) sudah memasukkan biaya admin
Rp 50.000 dan bea materai Rp 10.000 ke dalam `breakdown.total`. Di atas angka
itu, `VehicleUnderwritingWizard` menambahkan **Rp 26.000** lagi di tiga tempat:

| Lokasi | Baris | Dipakai untuk |
|---|---|---|
| `VehicleUnderwritingWizard.tsx` | 651 | `total_premium` yang disimpan ke `sp_policy_orders` |
| `VehicleUnderwritingWizard.tsx` | 1740 | angka "Total Premi" yang dilihat agen & nasabah |
| `VehicleUnderwritingWizard.tsx` | 1943 | `total_premium` yang dikirim ke `create-xendit-invoice` |

Sementara rincian yang ditampilkan di layar yang sama (baris 1727–1731) hanya
menyebut **"Biaya Aplikasi SurePath — Rp 6.000"**.

Jadi: jumlah seluruh baris rincian adalah `breakdown.total + 6.000`, tetapi
baris Total — dan invoice Xendit yang benar-benar dibayar nasabah — adalah
`breakdown.total + 26.000`. **Rp 20.000 ditagih tanpa pernah muncul sebagai
baris apa pun.** Untuk perantara produk keuangan, biaya yang tidak dirinci
bukan sekadar cacat tampilan.

Catatan: `create-xendit-invoice` mengambil nominal dari DB, bukan dari klien
(perbaikan keamanan lama), jadi yang ditagih persis sama dengan `total_premium`
yang ditulis wizard — selisihnya ikut terbawa ke pembayaran.

### Ketidakkonsistenan turunan

`net_premium` disimpan sebagai `breakdown.total - discountAmount`
(`VehicleUnderwritingWizard.tsx:607`) — tanpa Rp 26.000. Akibatnya pada baris
order mana pun `total_premium - discount_amount ≠ net_premium`. Setiap laporan
atau rekonsiliasi yang memakai kedua kolom itu akan selisih Rp 26.000.

### Status

**Belum diperbaiki — menunggu keputusan pemilik.** Memilih angka mana yang
benar mengubah pendapatan atau mengubah harga ke nasabah, jadi bukan keputusan
teknis:

1. Tagih Rp 26.000 dan perbaiki rinciannya (harga ke nasabah tetap), atau
2. Tagih Rp 6.000 sesuai rincian (nasabah bayar Rp 20.000 lebih murah).

Apa pun pilihannya, angka itu sebaiknya menjadi satu konstanta bernama yang
dipakai ketiga lokasi di atas sekaligus `net_premium`, bukan literal `26000`
yang diketik ulang tiga kali — pengulangan inilah yang membuat rincian dan
total bisa menyimpang tanpa ada tes yang gagal.
