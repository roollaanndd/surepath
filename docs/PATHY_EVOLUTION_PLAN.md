# Pathy — Rencana Evolusi: Simple, Interaktif, Jalin Relasi, Dorong Penjualan

Status: **DRAFT — usulan, menunggu keputusan pemilik.** Tidak ada kode yang diubah berdasar dokumen ini.
Ditulis 2026-10-28, dipicu empat pertanyaan pemilik: "biar simple, bisa interaktif/voice,
bagaimana jadi champ customer relations, dan how to make mitra motivated".

---

## 0. Pathy hari ini (inventaris riset)

| Sisi | Kondisi |
| --- | --- |
| Otak | `pathy-agent` edge function: model `openai/gpt-4o-mini` via OpenRouter, tool-calling loop (maks 4 putaran), limit 60/jam/user |
| Alat (13+) | Baca: polis, klaim, kutipan, katalog produk, coverage, renewal, laporan penjualan, forecast komisi, pipeline. Tulis: `create_quote`, `build_quotation` (DRAFT → PDF), `save_document_data`. Baca-dokumen: `read_attachment` (lampiran/kamera/OCR) |
| Antarmuka | `components/shared/PathyChat.tsx` — kartu kaya (polis, klaim, renewal, kutipan → unduh PDF), quick-reply chips, lampiran + OCR |
| Suara | **Input sudah ada**: diktasi Web Speech API (`services/speech.ts`) — gratis, hanya Chrome/Edge; alasan desainnya sudah tertulis (nasabah di tepi jalan, tangan basah). **Output (TTS) belum ada** |
| Penempatan | Nasabah: tab tengah bottom-nav (pintu depan layanan) + kartu AI; Mitra: tombol mengambang |
| Pengawasan | `PathyTranscriptsView` — admin sudah bisa membaca transkrip (modal untuk analisis pemakaian) |
| CRM mitra | Alatnya ada (`pipeline_nudge`, `commission_forecast`, `draft_followup`, `get_sales_report`, `renewal_check`) tapi **hanya menjawab saat ditanya** — Pathy tidak pernah bicara duluan |

Kesimpulan energi: fondasinya kuat; masalahnya bukan kemampuan, melainkan (1) gesekan
menuju aksi, (2) satu arah (tunggu ditanya), (3) tidak pernah "berbicara".

---

## 1. Track A — "Simple": dari tawar-menawar ke tiga ketukan

Prinsip: setiap intensi berulang harus bisa diselesaikan **tanpa mengetik kalimat**.

1. **Aksi buka pintu** — greet card dengan 3 ketukan kontekstual, bukan kalimat sapa.
   Mitra: "Buat kutipan", "Tulis balasan", "Cek komisi". Nasabah: "Bayar", "Status polis", "Ajukan klaim".
2. **Kutipan-3-ketukan**: produk → foto STNK (OCR sudah jalan) → angka jadi. Pathy mengisi
   sisanya dari profil/mitra, minta konfirmasi satu kartu, PDF langsung dibagikan.
3. **Draft reply jadi kartu WA (deep-link `wa.me`)** — `draft_followup` sudah menulis
   teks; tambahkan tombol "Bagikan ke WA" + "Salin" sehingga balasan mitra ke nasabah
   = 1 ketukan setelah Pathy menuliskan (diktat ke tindakan, bukan ke clipboard saja).
4. **Lanjutan sesi** — saat dibuka ulang, tawarkan percakapan terakhir yang belum
   selesai ("Kemarin kamu sampai Tata Nama — lanjut?"), disimpan lokal.
5. **Kartu hasil, bukan paragraf** — audit jawaban Pathy: jawaban yang bisa jadi kartu
   (angka, status, tombol) TIDAK boleh dikirim sebagai teks panjang. Sudah sebagian;
   ratchet: setiap alat baru wajib punya kartu.

## 2. Track B — Berbicara & interaktif (gratis dulu, tanpa layanan berbayar)

1. **Output TTS — Pathy berbicara** (`speechSynthesis`, browser native, gratis Rp 0):
   - Toggle kecil ikon `volume-2` di kepala obrolan; ketika menyala, jawaban
     Pathy ikut dibacakan (teks tetap tampil — TTS selalu melengkapi, tidak
     pernah menggantikan).
   - Default MATI: suara menyala hanya setelah user menyalakannya sendiri —
     tidak mengejutkan, dan patuh pada ikhtisar "mic tidak pernah terbuka
     otomatis" yang menganai `services/speech.ts` sejak awal.
   - Pilih voice `id-ID` bila tersedia; fallback `ms-…` generic; iOS Safari
     terbatas → graceful-fallback diam (teks tetap lengkap).
2. **Mode "tekan & bicara"** — tombol mic yang ditekan-tahan: lepas jari =
   audio berhenti, transkrip langsung jadi pesan. Diktasi yang sudah ada
   pakai pola start/stop; ini hanya wrapping UX-nya. Wajib dievaluasi di
   Capacitor WebView Android saat implement (SpeechRecognition headless
   Chrome biasanya jalan — konfirmasi perangkat sebelum rilis).
3. **Kamera-tetap-utama, bukan tipe-tipe** — untuk klaim dan KYC, kartu pertama
   Pathy menawarkan tombol kamera (OCR `read_attachment` sudah siap), bukan
   "silakan tulis detail"; jatuhnya: tangan basah di tepi jalan pun selesai.

**Suara premium (ElevenLabs/voice klon, dsb.)** memakai biaya per-karakter dan
tidak dibutuhkan untuk mulai menceritakan; nomorkan sebagai opsi P5 kelak,
dipasang hanya jika TTS browser ternyata tidak memadai secara kualitas.

## 3. Track C — Jalin relasi (nasabah)

1. **Sapaan ulang tahun poli** (`renewal_check` sudah bisa baca jatuh tempo):
   kartu hangat sebelum masa berakhir: "Asuransi mobil Anda jatuh tempo 1
   November — mau saya siapkan penawaran perpanjangannya sekarang?"
2. **Kabar klaim yang menenangkan**: `claim_status` sudah ada; tingkatkan
   nadanya — setiap perubahan status diakhiri langkah "apa lagi yang bisa saya
   bantu?" dan janji langkah berikutnya, bukan hanya status.
3. **Perhatian dari data nyata**: pola pertanyaan nasabah dari
   `PathyTranscriptsView` (premium, klaim, pembayaran — topik apa yang paling
   sering) jadi dasar konten bermanfaat dan perbaikan produk — bukan tebakan.

## 4. Track D — Dorong mitra (motivasi + marketing)

Alatnya sudah ada di server; yang hilang adalah **proaktif & perayaan**:

1. **Briefing pagi Pathy** (penggeser terbesar): saat mitra buka portal pertama
   hari itu, Pathy membuat kartu briefing dari DB murni (tanpa AI → gratis):
   pipeline belum di-follow-up, renewal jatuh tempo, target bulan
   ini vs pencapaian (kolom `monthly_target` ada), 1 saran aksi tunggal +
   tombol langsung "kerjakan". Dibuat deterministik; AI hanya merapikan nada
   bila dipakai — jadi kuota OpenRouter tidak terbebani.
2. **Progres & papan skor**: integrasi komisi/tier yang sudah ada → kartu
   "Rp X lagi menuju tier berikutnya", "posisi kamu #3 dari 12 mitra bulan ini"
   (data leaderboard lokal yang ada, tanpa membandingkan uang orang lain).
3. **Perayaan**: confetti/animasi halus saat kutipan terbit, klaim disetujui,
   target tercapai (CSS/Lottie kecil, bukan library berat).
4. **Bahan marketing jadi**: `build_quotation` + `draft_followup` → satu tombol
   "Bagikan" = PDF kutipan + pesan WA yang siap pakai. Mitra tidak perlu menulis
   copy — Pathy menawarkan 2 variasi nada (formal/santai).
5. **Kelas Pathy untuk mitra baru**: tour interaktif 5 kartu pertama kali masuk
   ("Tanya apa saja — mulai: 'buatkan kutipan mobil 2019 Honda Brio'"),
   membangun keberanian; **inilah yang membuat mitra mengerti kelebihan Pathy**
   (mereka tidak membaca, mereka mengalaminya).
6. **Analisis pemakaian** di Admin (`PathyTranscriptsView` + hitungan alat
   terpakai) → pemilik melihat mana fitur Pathy yang dipakai sungguhan dan mana
   yang tak tersentuh — dasar ratchet iterasi berikut.

## 5. Tahapan disarankan (tiap tahap = komit teruji)

| Tahap | Isi | Biaya | Kenapa dulu |
| --- | --- | --- | --- |
| P0 | Aksi buka pintu + kutipan-3-ketukan + "Bagikan ke WA" | Rp 0 (pakai alat yang ada) | Memangkas gesekan = nilai terbesar per jam kerja |
| P1 | Briefing pagi mitra (deterministik, DB) | Rp 0 | Motivasi mitra tanpa biaya token |
| P2 | TTS toggle + mode tekan-bicara | Rp 0 | Web Speech gratis; Butuh evaluasi Chromium WebView |
| P3 | Ucapan poli + nada klaim + perayaan | Rp 0 | Jalin relasi, memakai data yang ada |
| P4 | Tour mitra baru + dashboard analisis pemakaian | Rp 0–kecil | Membuat mitra mengerti kelebihan Pathy |
| P5 | Opsi berbayar (voice premium, briefing nada-AI harian) | berbayar | Hanya jika P1/P2 terbukti dipakai |

**Hambatan yang sudah ditandai riset:** TTS voice Bahasa Indonesia tidak seragam
di semua ponsel (Android OK, iOS Safari terbatas) → P2 wajib graceful-fallback ke
teks (yang memang sudah utuh). Briefing pagi TIDAK menulis tabel uang; hanya
membaca — patuh pada trust rules `pathy-agent` yang sudah tertulis.

## 6. Keputusan yang diminta pemilik

1. Mulai dari P0 (gesekan) atau P1 (motivasi mitra)?
2. TTS default MATI toggled by user (rekomendasi) atau ikut menyalakan default?
3. Apakah "bagikan ke WA" boleh memakai tombol share bawaan OS (paling aman)?
