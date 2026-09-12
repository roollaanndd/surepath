# Rilis Android & Google Play — Rencana, Eksekusi, Kesiapan

**Paket:** `com.myinsurepath.os` · **Versi:** 2.5.12 (versionCode 4)
**Arsitektur:** Capacitor membungkus bundel web yang sama (`dist/`) — tidak ada basis kode Android terpisah.

---

## 1. Kesiapan saat ini

Diperiksa langsung terhadap repo, bukan diasumsikan.

### Sudah siap

| Item | Bukti |
|---|---|
| `targetSdkVersion` | 36 — di atas ambang minimum Play (35) |
| `minSdkVersion` | 24 — jangkauan ±99% perangkat aktif |
| Signing config | `android/app/build.gradle` membaca `keystore.properties`; aman bila belum ada |
| Minify + ProGuard | `minifyEnabled true` pada build release |
| Cleartext traffic | `usesCleartextTraffic="false"` |
| `READ_EXTERNAL_STORAGE` | dibatasi `maxSdkVersion="32"` — tanpa ini Play menolak |
| Ikon Play Store | `public/play-store-icon.png` — **512×512**, sesuai syarat |
| Feature graphic | `public/play-store-feature-graphic.png` — **1024×500**, sesuai syarat |
| Ikon launcher | `mipmap` lengkap termasuk `ic_launcher_round` |
| Kebijakan privasi | halaman `/privacy` sudah ada dan terpublikasi |
| Backup data | `allowBackup="false"` + `data_extraction_rules.xml` (v2.5.12) |
| Sinkronisasi versi | `npm run check:android` (v2.5.12) |

### Belum siap — butuh tindakan pemilik

| # | Item | Kenapa hanya bisa Anda |
|---|---|---|
| 1 | **Keystore rilis** | Kunci penandatanganan tidak boleh masuk repo. Sekali hilang, aplikasi tidak bisa di-update selamanya. |
| 2 | **Akun Google Play Developer** | Biaya sekali USD 25 + verifikasi identitas (bisa makan beberapa hari) |
| 3 | **Data safety form** | Deklarasi hukum, harus ditandatangani pemilik |
| 4 | **Screenshot** | Minimal 2 per tipe perangkat; harus dari aplikasi berjalan |
| 5 | **Deklarasi akun uji** | Play butuh kredensial login untuk mereview aplikasi berlogin |

---

## 2. Eksekusi

### Langkah 1 — Buat keystore (sekali seumur hidup aplikasi)

```bash
keytool -genkey -v -keystore android/app/surepath-release.keystore \
  -alias surepath -keyalg RSA -keysize 2048 -validity 10000
```

Lalu `android/keystore.properties` (sudah masuk `.gitignore` — jangan pernah di-commit):

```properties
storeFile=surepath-release.keystore
storePassword=...
keyAlias=surepath
keyPassword=...
```

> **Cadangkan keystore dan sandinya di dua tempat terpisah.** Ini satu-satunya langkah yang tidak bisa diulang: kehilangannya berarti aplikasi tidak bisa di-update, dan satu-satunya jalan keluar adalah menerbitkan paket baru — pengguna lama harus install ulang dari nol.

### Langkah 2 — Build

```bash
npm run build:android      # sync versi → vite build → cap sync
cd android && ./gradlew bundleRelease
```

Keluaran: `android/app/build/outputs/bundle/release/app-release.aab`

Untuk uji langsung di perangkat: `./gradlew assembleRelease` → `app-release.apk`.

### Langkah 3 — Data safety (jawaban sesuai perilaku aplikasi)

Ini bagian paling sering ditolak. Jawaban berikut mencerminkan apa yang aplikasi ini **benar-benar** lakukan:

| Data | Dikumpulkan | Dibagikan | Alasan |
|---|---|---|---|
| Nama, email, telepon | Ya | Tidak | Akun dan polis |
| NIK/KTP | Ya | Ya — ke perusahaan asuransi | Wajib untuk penerbitan polis |
| Foto (KTP, STNK, kendaraan) | Ya | Ya — ke perusahaan asuransi | Underwriting dan klaim |
| Data keuangan | Ya | Ya — ke Xendit | Pembayaran premi |
| Lokasi | Tidak | — | |

Semua terenkripsi saat transit. Penghapusan akun harus disediakan jalurnya — Play mewajibkan ini untuk aplikasi berakun.

**Catatan:** foto diproses AI lewat OpenRouter. Ini pemrosesan pihak ketiga dan **harus** disebut di kebijakan privasi sebelum submit, kalau belum ada.

### Langkah 4 — Listing

- **Kategori:** Finance
- **Rating konten:** kuesioner IARC → kemungkinan besar Everyone
- **Kebijakan privasi:** `https://myinsurepath.com/privacy`
- **Screenshot:** ambil dari perangkat/emulator nyata, minimal 2 (telepon), disarankan tambah tablet 7" dan 10"

### Langkah 5 — Rilis bertahap

Internal testing (sampai 100 penguji, review cepat) → closed testing → production 20% → 100%.

Jangan langsung 100%. Rilis pertama aplikasi finansial paling rawan menemukan masalah yang tidak terlihat di web.

---

## 3. Risiko yang perlu diketahui sejak awal

**Aplikasi berlogin yang tidak bisa direview akan ditolak.** Play butuh akun uji yang berfungsi di kolom "App access". Siapkan satu akun nasabah dan satu akun mitra yang tidak dipakai produksi.

**Fungsi inti harus jalan saat direview.** Reviewer akan mencoba membeli polis. Saat dokumen ini ditulis, `sp_payments` masih kosong — belum pernah ada invoice yang terbentuk. Bila reviewer menemui alur pembelian yang buntu, itu alasan penolakan yang sah. **Selesaikan funnel pembayaran sebelum submit produksi**; internal testing bisa jalan lebih dulu.

**Edge function yang belum ter-deploy ikut terbawa.** APK memakai bundel web yang sama, jadi Pathy di APK juga masih versi lama selama `pathy-agent` belum di-deploy.

**Dua aplikasi tidak mungkin dari satu listing.** Rencana memisahkan entri install nasabah vs mitra (lihat catatan sesi) berlaku penuh untuk PWA. Di Play, satu listing = satu aplikasi; pemisahan peran di APK harus lewat layar pertama saat dibuka, bukan saat install.

---

## 4. Urutan yang disarankan

1. Buat keystore + cadangkan → **hari ini**, tidak bergantung apa pun
2. Daftar akun Play Developer → **hari ini**, verifikasi butuh waktu
3. Build AAB + internal testing → setelah 1 & 2
4. Perbaiki funnel pembayaran → **syarat wajib sebelum produksi**
5. Data safety + listing + screenshot → paralel dengan 4
6. Closed testing → production bertahap
