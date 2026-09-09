# SurePath — Changelog

---

> **Skema versi baru mulai rilis ini.** Deret `1.x` ditutup di v1.57.0; penomoran dilanjutkan dari **2.1.0**.

## v2.5.0 — 2026-09-09

### Pathy: unggah dokumen apa pun, dan berhenti memvonis klaim

**1. Pathy tidak lagi memutuskan klaim — itu wewenang asuransi**

`check_coverage` dan `start_claim` dulu menjawab `covered: true/false` dan kartunya menulis "Ditanggung" dengan centang hijau. Itu terbaca sebagai janji, padahal yang memutuskan liable atau tidaknya sebuah klaim adalah insurer setelah survei dan pemeriksaan berkas — SurePath adalah distributor, bukan penanggung.

Keduanya sekarang mengembalikan `indication` (`LIKELY_COVERED` / `LIKELY_NOT_COVERED` / `NEEDS_REVIEW`) plus `decision_by: 'INSURER'`, dan setiap kalimat alasannya ditulis indikatif ("berdasarkan data polismu, indikasinya…"). Kartunya ikut berubah: glyph `≈`/`≉`/`?`, bukan centang/silang. Dua kondisi yang dulu jadi vonis sekarang jadi `NEEDS_REVIEW`: polis yang belum aktif, dan tanggal kejadian di luar periode polis — dua-duanya fakta untuk insurer timbang, bukan penolakan dari Pathy.

Field lama `covered`/`eligible` tetap dikirim, jadi tidak ada jendela rusak saat web sudah rilis tapi edge function-nya belum.

**2. Disclaimer yang tidak bergantung pada kerelaan model**

`supabase/functions/pathy-agent/disclaimers.ts` (baru) menghitung caveat per giliran dari tool yang benar-benar berjalan dan kata yang benar-benar keluar — jadi disclaimer tetap ada di giliran ketika model lupa. Isinya: Pathy AI dan bisa keliru, plus siapa yang berwenang — **asuransi** untuk jaminan/klaim/nominal, **dokter** untuk hal medis, **OJK/kepolisian/penasihat hukum** untuk hal hukum. Maksimal dua baris otoritas supaya masih dibaca orang.

System prompt dapat dua bagian baru: `DIPLOMASI SOAL KLAIM & JAMINAN` (dilarang bilang "pasti dibayar"/"ditolak", jangan memihak dalam sengketa, empati dulu saat orang baru kecelakaan) dan `DISCLAIMER`. Banner atas chat diganti dari "Pathy tidak bisa mengubah polis" jadi "Pathy AI bisa keliru dan tidak memutuskan klaim".

**3. Tombol unggah gambar — yang memang belum pernah ada**

Composer dulu hanya punya "Foto STNK" dan "Foto KTP", keduanya `capture="environment"`: di ponsel itu langsung membuka kamera, sehingga foto yang **sudah ada di galeri tidak pernah bisa dipilih**. Itulah "fitur upload tidak ada".

Sekarang ada dua input: **Unggah gambar** (tanpa `capture` → galeri, file, screenshot) dan **Kamera**. Jenis dokumennya tidak perlu disebut lagi — `services/docOcr.ts` (baru) mengklasifikasi sendiri: STNK, KTP, SIM, polis, invoice/kuitansi, atau dokumen lain. STNK dan KTP tetap diarahkan ke pembaca khususnya (`stnkOcr` dengan resolusi harga pasar, `ktpOcr` dengan validasi NIK 16 digit); sisanya dibaca `extractDocumentData()` yang baru di `geminiService`. Maksimal 4 lampiran, batas 12 MB, thumbnail tampil di composer dan di gelembung pesan pengguna. Gambarnya tetap tidak pernah keluar dari browser — hanya hasil ekstraksinya yang dikirim.

**4. Data hasil ekstraksi dipakai dan disimpan**

- **Dipakai di penawaran.** `compare_offers` dan `build_quotation` kini mengisi argumen yang tidak disebut model dari lampiran giliran itu (nilai pertanggungan, provinsi, merk/tipe/tahun/plat dari STNK; nama & alamat tertanggung dari KTP). Argumen eksplisit tetap menang — pengguna bisa mengoreksi hasil OCR lewat chat.
- **Diarsipkan otomatis.** Tabel baru `sp_user_documents` (deny-all RLS, hanya service_role) menyimpan **field hasil ekstraksi, bukan gambarnya**. Berjalan deterministik sebelum model dipanggil, jadi tidak bergantung pada keputusan model, dan tidak pernah menggagalkan giliran bila tabelnya tidak ada.
- **Melengkapi akun.** Tool tulis ketiga, `save_document_data`, hanya dipanggil setelah pengguna setuju: nasabah → melengkapi profilnya sendiri (`name`, `phone`, `ktp`, `address` — tidak ada kolom lain), agen → membuat/memperbarui data klien di `sp_clients` miliknya, tidak pernah profilnya sendiri. Default-nya **hanya mengisi kolom kosong**; menimpa data yang sudah ada butuh `overwrite: true` yang hanya boleh dikirim kalau pengguna eksplisit memintanya.

**Catatan rilis**

- `supabase/migrations/20260909_pathy_user_documents.sql` **sudah diapply ke production**.
- ⚠️ `pathy-agent` **wajib di-deploy ulang** — seluruh poin 1, 2 dan 4 ada di edge function:
  `supabase functions deploy pathy-agent --project-ref uyjgeteelnswphyzkjwi`
- Uji baru: `services/__tests__/pathyDocuments.test.ts` (21 uji) mengunci bahwa tidak ada jalur kode yang menjanjikan klaim dibayar, disclaimer selalu terbit, dan tulis dokumen tetap sempit.

---

## v2.4.0 — 2026-09-08

### Aplikasi Nasabah kini satu keluarga dengan aplikasi Agen — plus satu bug token yang mematikan seluruh mode terang

**Temuan terpenting: token desain mode terang mati sejak DS v3 (2026-07-06)**

Komentar pembuka `styles.css` berbunyi `Tailwind lp-*/primary/brand` — urutan `*/` di situ **menutup komentar CSS lebih awal**. Sisa kalimatnya lalu terbaca sebagai selector, dan blok `:root { --ds-bg … }` tepat sesudahnya tertelan sebagai badan selector rusak itu. Akibatnya seluruh custom property mode terang tidak pernah terdefinisi: setiap kelas `bg-ds-*`, `text-ds-*`, `border-ds-*` di seluruh aplikasi jatuh ke `transparent`/warna warisan. Blok `.dark` tidak terdampak, jadi mode gelap selama ini justru satu-satunya yang benar.

Satu kata diganti, dan seluruh sistem token hidup kembali — di semua portal, bukan hanya nasabah.

**Kerangka portal jadi satu komponen bersama**

Header dan navigasi bawah tidak lagi disalin per portal:

- `components/shared/PortalHeader.tsx` — logo, label portal, identitas, lonceng + badge angka, tombol tema, avatar → Profil. Identitas dipotong (`truncate`), bukan dibungkus, supaya tinggi header tetap 70px; versi aplikasi menyingkir di layar sempit (profil tetap menampilkannya penuh).
- `components/shared/PortalTabBar.tsx` — pil mengambang dengan aksi tengah terangkat, ikon 23/26px, status aktif berupa chip bertint.

Agen dan nasabah sekarang memakai keduanya, jadi keduanya tidak bisa lagi berbeda diam-diam.

**Navigasi nasabah: Pathy naik ke tengah**

Susunannya kini Beranda · Beli · **[Pathy]** · Klaim · Riwayat — bentuk yang sama dengan agen (dua tab, aksi tengah, dua tab). Slot tengah membuka Pathy sebagai overlay lewat `PATHY_OPEN_EVENT`, bukan berpindah halaman, dan tombol mengambang Pathy dimatikan di portal nasabah supaya pintunya cuma satu. Profil pindah ke avatar di header — persis seperti agen. Ini melanjutkan keputusan v2.3.0: Pathy adalah pintu layanan.

**Ikon nasabah naik kelas**

`components/shared/duotone.tsx` mengangkat resep menggambar `AgentIcons` (grid 48, goresan 3px, lapisan tint, satu aksen emas) menjadi milik bersama; `components/shared/CustomerIcons.tsx` memakainya. Beranda, Profil dan Klaim sengaja digambar identik dengan set agen — konsep yang sama harus terlihat sama di semua portal. Set outline tipis 24-grid lama (`CustomIcons`) tidak lagi dipakai portal nasabah.

**Sisanya**

- Notifikasi nasabah naik dari dropdown 288px jadi drawer penuh. `AgentNotifications` sekarang tipis membungkus `shared/NotificationDrawer` — satu implementasi, dan warnanya pindah ke token sehingga mode gelap ikut benar.
- `HeroCard` punya dua rupa (`emerald`, `navy`) dengan geometri sama. Hero ungu satu-satunya di halaman Klaim dan gradien inline di Riwayat diganti; sekarang hanya ada satu bahasa hero.
- Token semantik `ds-blue-lt` / `ds-amber-lt` / `ds-red-lt` ditambahkan ke Tailwind, dipetakan ke `--ds-*-tint` yang sudah ada, lalu semua `bg-amber-50` / `bg-rose-50` / `bg-gray-100` / `bg-slate-100` / `dark:bg-[#161616]` di `CustomerPortal`, `OrderDetailSheet` dan `AccessibilitySettings` diganti. Chip status akhirnya terbaca di mode gelap.
- Portal nasabah memakai `font-sora` seperti agen.
- Aksi cepat "AI Bantu" dan CTA "Chat dengan Pathy" kini benar-benar membuka Pathy, bukan halaman HealthChat.

**Tidak disentuh:** data-gateway, dompet, alur pembayaran, dan seluruh edge function. Ini murni lapisan tampilan.

---

## v2.3.0 — 2026-09-08

### Pathy jadi satu-satunya pintu layanan + kunci zoom di aplikasi

**Keputusan desain: satu wajah, banyak otak**

Sebelum ini ada 8 mesin AI dengan 4 nama produk dan 5 pintu masuk berbeda (Pathy, ClaimSense, HealthChat, InsurerAI, plus forensik foto & review admin tanpa nama). Untuk mendapat estimasi klaim, nasabah harus tahu bahwa ada menu Klaim, di dalamnya ada panel bernama "ClaimSense AI", dan panel itu harus diketuk manual. Kalau dia tanya Pathy "mobil saya nabrak, gimana?", Pathy hanya punya `get_my_claims` — **dia tidak bisa memulai klaim sama sekali.**

Sekarang Pathy jadi satu-satunya nama yang dilihat nasabah dan agen. Mesin-mesinnya tetap terpisah — yang disatukan pintunya, bukan otaknya. Alat internal (review polis & keuangan admin, InsurerAI) sengaja **tidak** diberi persona: penggunanya bukan nasabah, dan model otorisasinya berbeda.

**Sembilan tool baru — semuanya baca-saja atau siapkan-saja**

Tidak satu pun menulis. Ini bukan jalan pintas. Pengiriman klaim sudah punya rantai kepercayaan yang dibangun hati-hati di `data-gateway/actions/claims.ts`: forensik foto berjalan lebih dulu di `analyze-claim-photos`, hasilnya di-*stage* server-side, lalu `submit_claim` mengonsumsi baris itu sekali, berdasarkan id, setelah memastikan miliknya dan belum kedaluwarsa — justru supaya pemalsu yang jadi target fitur itu tidak bisa mengirim `fraud_verdict: CLEAN` sendiri. Pembayaran lewat `create-xendit-invoice`. Memberi model AI pintu kedua ke salah satunya berarti menduplikasi penjaganya (dua tempat yang harus benar) atau melubanginya. Jadi Pathy mengerjakan bagian yang memang cocok untuknya — polis mana yang berlaku, apa yang dijamin, apa yang kurang, berapa biayanya — lalu menyerahkan tautan terisi ke alur yang sudah ada.

| Tool | Untuk | Isi |
|---|---|---|
| `check_coverage` | semua | "Spion pecah ditanggung nggak?" dijawab dari polis **dia sendiri** + risiko sendiri |
| `start_claim` | semua | Cari polis yang berlaku di tanggal kejadian, daftar dokumen, prefill formulir |
| `claim_status` | semua | Tahap saat ini, langkah berikutnya, dan apa yang masih kurang |
| `renewal_check` | semua | Polis jatuh tempo + premi perpanjangan **dihitung ulang** dengan tarif OJK berjalan |
| `explain_my_policy` | semua | Ditanggung / TIDAK ditanggung, dari polisnya sendiri |
| `payment_help` | semua | Tagihan tertunda + tautan yang **sudah ada** (tidak membuat tagihan baru) |
| `pipeline_nudge` | agen | Penawaran mendekati kedaluwarsa + pengajuan mandek |
| `commission_forecast` | agen | Dompet, komisi tertunda, perkiraan dari pengajuan berjalan |
| `draft_followup` | agen | Draft pesan WhatsApp — **agen** yang menekan kirim |

**Aturan jaminan yang paling penting**

Banjir, gempa, huru-hara, terorisme, tanggung jawab pihak ketiga, dan kecelakaan diri **BUKAN jaminan dasar** polis kendaraan Indonesia (PSAKBI) — semuanya perluasan berbayar. Mengatakan "ditanggung" pada mobil terendam yang tidak punya perluasan banjir adalah jawaban paling merugikan yang bisa diberikan asisten ini. Karena itu setiap risiko punya *bucket*-nya sendiri dan jawabannya selalu diresolusi terhadap kolom `addons` pada order — bukan dari pengetahuan umum model. Ada 20 kasus ujinya.

**Struktur**

- `supabase/functions/pathy-agent/common.ts` (baru) — tipe + penjaga bersama. `ownerFilter` hidup di satu tempat supaya tidak mungkin menulis tool tanpa melewatinya.
- `supabase/functions/pathy-agent/serviceTools.ts` (baru) — sembilan tool di atas.
- `services/claimHandoff.ts` (baru) — kontrak antara chat dan formulir klaim. Payload divalidasi saat keluar (nomor polis cacat dibuang, bukan diketik ke formulir) dan sekali pakai.

**Suara**

`services/speech.ts` (baru) — dikte Web Speech API, `id-ID`. Momen paling butuh Pathy adalah berdiri di samping mobil penyok, satu tangan, sering hujan. Mengetik kronologi di situ menyiksa; bicara tidak. Transkrip masuk ke kotak input untuk dibaca dulu — tidak pernah langsung terkirim, karena dikte salah membaca nama dan nomor plat.

**Kunci zoom + fullscreen di aplikasi**

`services/appViewport.ts` (baru) — pinch-zoom, double-tap zoom, ctrl+scroll zoom, dan rubber-band dimatikan, **hanya saat berjalan sebagai aplikasi** (PWA terpasang atau build Capacitor). Di tab browser biasa halaman tetap bisa di-zoom.

Pemisahan itu disengaja: `user-scalable=no` di situs publik melanggar WCAG 1.4.4 dan menurunkan skor aksesibilitas Lighthouse, dan orang yang perlu memperbesar teks di halaman pemasaran tidak punya chrome aplikasi sebagai pengganti. Pengguna yang sudah memasang aplikasinya punya pengaturan ukuran tampilan OS, dan di sanalah pinch-zoom browser justru merusak rasa "aplikasi": cubitan tak sengaja meninggalkan tata letak melenceng tanpa cara kembali. Seleksi teks tetap menyala — nomor polis dan nomor klaim harus bisa disalin.

**Belum dikerjakan, dan alasannya**

- **Push notification & WhatsApp dua arah** — butuh kunci VAPID dan konfigurasi provider yang tidak ada di repo. Fondasinya sudah siap (`sp_notifications`, `send-whatsapp`, dan PWA-nya baru diperbaiki di v2.2.0).
- **Pathy publik tanpa login** — permukaan penyalahgunaan biaya model. Perlu rate-limit per-IP tersendiri dan review keamanan sendiri, bukan ditempel di rilis ini.
- **Bengkel rekanan** — tidak ada tabelnya; hanya teks di `aiKnowledge.ts`. Ini pekerjaan data, bukan AI.

**Uji:** `services/__tests__/pathyService.test.ts` (51 kasus), termasuk satu yang menjalankan **kesembilan** tool terhadap database palsu yang melempar error pada setiap verba tulis — jadi tool baru yang menyisipkan baris akan langsung menggagalkan suite.

---

## v2.2.0 — 2026-09-08

### "Install App" sekarang benar-benar memasang aplikasi

**Akar masalah: event pemasangan sudah lewat sebelum tombolnya lahir**

Chrome menembakkan `beforeinstallprompt` **satu kali**, tepat setelah pemeriksaan installability-nya lolos, dan **tidak pernah mengulanginya**. Sebelum rilis ini ada **tiga** komponen React yang masing-masing memasang pendengarnya sendiri di dalam `useEffect`:

| Komponen | Kapan mount |
|---|---|
| `components/InstallPrompt.tsx` | bersama app shell |
| `components/Navbar.tsx` | bersama app shell |
| `src/pages/site/SiteLayout.tsx` | **chunk lazy** — baru diunduh setelah render pertama |

Yang lazy selalu kalah balapan: saat `SiteLayout-*.js` selesai diunduh dan mount, event-nya sudah lewat. `pwaPrompt` tetap `null`, dan `handleInstallClick` jatuh ke `InstallModal` — lembar instruksi "buka menu ⋮ → Add to Home screen". **"Add to Home screen" hanya menaruh pintasan bookmark di layar utama**, bukan memasang aplikasi: tidak ada WebAPK, tetap ada bar alamat, tidak ada ikon aplikasi sungguhan. Persis keluhan yang dilaporkan.

Tiga salinan itu juga saling merebut: satu `beforeinstallprompt` hanya boleh di-`prompt()` **sekali**, jadi komponen yang lebih dulu memakainya meninggalkan dua lainnya memegang objek mati.

**Perbaikan — satu sumber kebenaran, ditangkap sedini mungkin**

- **Skrip inline di `index.html`**, di atas semua bundle, menangkap event dan memarkirnya di `window.__spInstall`. Sekarang tidak peduli selambat apa pun aplikasi mount, prompt-nya tetap ada.
- **`services/pwaInstall.ts` (baru)** — satu-satunya pembaca parkiran itu. Menyediakan `getInstallState()`, `promptInstall()`, `subscribeInstall()` dan hook `usePwaInstall()`. Melepas event setelah dipakai sekali, mendengar `appinstalled`, dan **membatalkan** penanda "sudah terpasang" begitu browser menawarkan pemasangan lagi (browser hanya menawarkan yang belum terpasang — artinya pengguna sudah menghapusnya).
- **`components/shared/InstallAppSheet.tsx` (baru)** — satu tampilan pemasangan untuk seluruh aplikasi. Aturannya: **jangan pernah menampilkan instruksi kalau browser bisa memasang sendiri.** Setiap tombol memanggil `promptInstall()` lebih dulu; panduan langkah hanya muncul kalau jawabannya `'unavailable'`.
- Panduannya jujur per platform: iOS (Bagikan → Tambahkan ke Layar Utama, dengan glif Share digambar inline karena kata "Share" tidak dikenali orang), webview dalam aplikasi (Instagram/Facebook/WhatsApp — **tidak bisa memasang sama sekali**, jadi diarahkan membuka browser + tombol salin tautan), Android tanpa prompt (menu ⋮ → **"Instal aplikasi"**, ditegaskan *bukan* "Tambahkan ke layar utama"), desktop (ikon pasang di address bar), dan browser yang memang tidak mendukung.
- Lembarnya di-**portal ke `<body>`**: navbar memakai `backdrop-blur`, dan `backdrop-filter` apa pun menjadikan elemennya containing block untuk `position: fixed` — tanpa portal lembarnya terpotong setinggi navbar.
- Tombol "Pasang" di navbar tidak lagi disembunyikan saat prompt belum ada; ia bersembunyi **hanya** kalau aplikasinya memang sudah terpasang.
- iPhone kini mendapat tawaran pemasangan pada kunjungan pertama. Sebelumnya tidak ada apa pun di iOS, jadi pengguna iPhone tidak pernah tahu aplikasinya bisa dipasang.

**Manifest — dialog pasang yang kaya, bukan infobar mungil**

- `screenshots` menunjuk `logo.png` dan mendeklarasikannya `3508x2481`; **file aslinya 348x400**. Chrome menolak screenshot yang ukurannya tidak cocok, jadi tidak ada satu pun screenshot sah — dan tanpa screenshot `form_factor: 'narrow'`, Chrome Android hanya memunculkan infobar mungil, bukan dialog pasang besar. Diganti empat screenshot 1080x1920 yang sudah ada di `public/` plus satu `wide`.
- `id: '/'` ditambahkan supaya identitas aplikasi tidak berubah kalau `start_url` disunting kelak.
- `display_override: ['standalone', 'minimal-ui']`.

**Lain-lain**

- `src/pages/site/SiteLayout.tsx:324` — satu-satunya **error** ESLint di repo (pre-existing sejak v1.50.0) diperbaiki. `npm run lint` sekarang **0 error** untuk pertama kalinya.
- `InstallModal` dan `isStandaloneMode` di `siteKit.tsx` dihapus (mati setelah perubahan ini).
- Uji: `services/__tests__/pwaInstall.test.ts` (18 kasus) — penangkapan awal, sekali-pakai, deteksi platform termasuk iPadOS yang menyamar sebagai Mac, dan penanda terpasang yang basi.

---

## v2.1.0 — 2026-09-07

### KTP kembali berfungsi, dan Pathy bisa menerbitkan proposal penawaran

**1. Akar masalah KTP: salah kredensial, bukan salah prompt**
`services/geminiService.ts` mengautentikasi ke `ai-proxy` memakai **anon key** sebagai bearer token. `ai-proxy` memverifikasi token itu dengan `auth.getUser()`, dan anon key adalah JWT proyek tanpa klaim `sub` — jadi verifikasinya gagal dan **setiap permintaan dijawab 401**. Tiap pemanggil menelan error itu dan mengembalikan `{ success: false }`, sehingga pemindaian KTP diam saja: formulir tetap kosong tanpa satu pun pesan.

Ini bukan cuma soal KTP — **semua** panggilan di file itu ikut mati: validasi foto, analisis klaim, survei kendaraan, pembaca kuitansi medis, dan penjelas produk.

- `getClient()` kini async dan memakai **access token sesi**; tanpa sesi ia melempar pesan yang jelas, bukan gagal diam-diam.
- **`services/ktpOcr.ts` (baru)** — pembaca KTP tervalidasi, sebangun dengan `stnkOcr.ts`. NIK dibersihkan dari spasi/titik/strip lalu **wajib 16 digit**; kalau tidak, dikembalikan `null` daripada mengisi formulir dengan nomor salah. Nama dan alamat dinormalkan. Statusnya `OK` / `PARTIAL` / `UNCLEAR` dengan catatan berbahasa Indonesia yang memberi tahu apa yang harus dilakukan.
- **`StepKYC`** memakai layanan itu dan **menampilkan catatannya**. Sebelumnya kegagalan tidak menghasilkan apa pun di layar.

**2. Pathy menerbitkan proposal penawaran — format yang sama dengan menu beli asuransi kendaraan**

Lampiran diproses **di klien**, bukan di edge function: browser sudah memiliki `stnk-ocr`, pembaca KTP, dan database harga kendaraan 2.500 baris. Yang dikirim ke server hanya kolom hasil ekstraksi — **gambar tidak pernah melewati `pathy-agent`**.

Tiga tool baru:
- **`read_attachment({ type })`** — membaca lampiran STNK/KTP milik giliran ini. Isinya hanya bisa dijangkau lewat tool, tidak pernah masuk system prompt.
- **`compare_offers(...)`** — menghitung **tiga opsi sekaligus** dengan tarif OJK aktif: Comprehensive, Comprehensive + perluasan (banjir, gempa, huru-hara, TPL 25 juta, PA sopir + 4 penumpang), dan TLO. Tiap opsi membawa rincian baris premi yang jumlahnya persis sama dengan totalnya.
- **`build_quotation({ option_id, … })`** — menyusun proposal untuk opsi terpilih dan menyimpannya sebagai draf. Payload-nya berbentuk `AgentQuoteSource`, jadi klien meneruskannya ke `fromAgentQuote()` → `publishAndDownloadQuotation()` — **pipeline yang sama persis dengan `StepFinal.tsx` di wizard beli kendaraan**. PDF-nya slip SurePath 4 halaman ber-QR ke `/q/{code}`, bukan dokumen tiruan.

**Premi dihitung ulang saat proposal dibangun**, bukan dibawa dari hasil `compare_offers` beberapa giliran sebelumnya. Angka yang tercetak di dokumen komersial tidak boleh berasal dari percakapan.

**3. UI chat**
- Dua tombol kamera di composer: **Foto STNK** dan **Foto KTP**. Lampiran tampil sebagai chip yang bisa dihapus; kegagalan baca memberi tahu apa yang harus diperbaiki.
- Melampirkan foto **saja sudah cukup** — tidak perlu mengetik kalimat untuk menjelaskan foto STNK sendiri.
- Kartu baru: `document_read` (hasil baca + keyakinan), `offers` (tiga opsi berdampingan), dan `quotation_ready` dengan tombol **Unduh PDF penawaran**.
- Chip cepat baru: "Proposal dari STNK".

**4. Proposal kini mencantumkan alamat tertanggung**
`AgentQuoteSource` menerima `clientAddress`; `fromAgentQuote()` dulu menulis `insuredAddress: '-'` mati. Alamat dari KTP sekarang tercetak di slip.

**5. Skema versi** — `1.57.0` → **`2.1.0`**.

Uji: `services/__tests__/pathyQuotation.test.ts` (15 kasus) — normalisasi NIK, penolakan lampiran yang tidak ada, paritas harga tiga opsi dengan mesin browser, penjumlahan baris premi, penolakan nilai pertanggungan tak masuk akal, bentuk payload proposal, dan **pengabaian premi palsu yang disodorkan ke `build_quotation`**.

---

## v1.57.0 — 2026-09-07

### Tipe akun wajib dipilih — pendaftar baru tidak lagi otomatis jadi nasabah

**Gejalanya:** setiap pendaftar baru langsung masuk ke aplikasi nasabah. Layar pemilihan tipe akun (Nasabah / Mitra / Klien Korporat) yang sudah ada di kode praktis tidak pernah muncul.

**Akar masalahnya bukan layar itu, tapi siapa yang membuat profil lebih dulu.**
`AuthGate.buildUserObj` memanggil `ensureProfile()` **tanpa argumen**. Di sisi server, `ensure_profile` waktu itu jatuh ke `'CUSTOMER'` kalau tidak ada role dari pemanggil maupun dari metadata signup. Jadi begitu `AuthGate` melihat sesi hidup, ia langsung mencetak baris `sp_users` ber-role `CUSTOMER` — dan `RoleSelectionScreen` di `App.tsx` hanya tampil kalau profil **belum** ada. Profilnya sudah keburu ada. Pemilihan tipe akun kalah cepat dari kodenya sendiri.

Ada tiga jalan masuk ke kondisi itu:
1. **APK Android** — OAuth deep link (`com.myinsurepath.os://auth-callback`) tidak membawa `?code=` di URL, jadi penjaga `oauthLoading` di `App.tsx` tidak pernah aktif. `AuthGate` tetap ter-render dan ikut menangkap `SIGNED_IN`. Pengguna Android **selalu** berakhir sebagai nasabah.
2. **Web, koneksi lambat** — timeout 10 detik menurunkan `oauthLoading` walaupun pencarian profil masih berjalan, `AuthGate` mount di tengah jalan, lalu membuat profil `CUSTOMER` di bawah kaki pemilih role.
3. **Kegagalan sementara** — `resolveAndLogin` menangkap error apa pun lalu tetap login memakai objek fallback ber-role `CUSTOMER`.

**Perbaikannya — role dinyatakan, tidak pernah diasumsikan:**
- **`AuthGate.buildUserObj` sekarang read-only** (`get_my_profile` via `fetchMyProfileForLogin`). Ia hanya membuat profil kalau rolenya sudah diketahui dari `user_metadata` (ditanam saat `signUp`). Kalau tidak ada role sama sekali → prop baru `onNeedsRoleSelection` menyerahkan pengguna ke `RoleSelectionScreen`.
- **`App.tsx`** meneruskan `onNeedsRoleSelection` ke `AuthGate`, sehingga pemilih role bisa dipanggil dari jalur mana pun — bukan cuma dari alur OAuth web. State-nya diganti nama `pendingOAuthUser` → `pendingRoleUser` (dan prop `RoleSelectionScreen` `oauthUser` → `authUser`) karena layar ini bukan milik OAuth saja.
- **Timeout `oauthLoading` 10 detik** tidak lagi berlaku selagi pencarian profil berjalan.
- **Konfirmasi email tetap menghormati pilihan awal.** Saat pengguna kembali dari tautan email, `App.tsx` membaca `user_metadata.role` dan membuat profil dengan role itu — tidak menanyakan ulang. Menanyakan ulang berarti pilihan "Mitra" bisa berubah jadi "Nasabah".
- **Toggle Nasabah/Mitra di form registrasi akhirnya terpakai.** `options.data.role` di-hardcode `UserRole.CUSTOMER` dan mengabaikan `regRole`; sekarang mengirim pilihan pengguna. (Cabang AGENT memang dialihkan ke `AgentOnboarding`, jadi ini laten — tapi metadata itulah yang harus bertahan melewati konfirmasi email.)
- **Kegagalan sementara tidak lagi berujung login sebagai nasabah** — tampilkan error dan minta coba lagi. Role yang salah menulis baris yang salah dan tidak memperbaiki diri sendiri.

**Pertahanan di server (agar tidak terulang):** `ensure_profile` menolak membuat profil kalau tidak ada role dari `params.role` maupun `user_metadata.role` → **409 `ROLE_REQUIRED`**, tanpa menulis baris apa pun. Satu-satunya pemanggil tanpa role adalah `AuthGate` yang baru saja diperbaiki, jadi tidak ada jalur sah yang terdampak. Aturan "role immutable setelah profil ada" (v1.52.0) tetap berlaku.

Uji: `services/__tests__/signupRole.test.ts` (8 kasus) mengunci kontraknya — penolakan tanpa role tanpa menulis baris, pembuatan AGENT/CUSTOMER sesuai pilihan, fallback ke metadata signup, penolakan penurunan role, penautan upline referral, dan 404 `get_my_profile` yang menjadi sinyal "tampilkan pemilih role".

Dokumen: `docs/AUTH_FLOW.md` diperbarui menyeluruh.

---

## v1.56.0 — 2026-09-07

### Pathy hidup lagi + bisa membuat penawaran & membaca laporan polis

**1. Kenapa Pathy "tidak jalan" (akar masalahnya, bukan konfigurasi)**
Infrastrukturnya sehat sejak awal: `ai-proxy` v5 ACTIVE dan `OPENROUTER_KEY` ada di Vault. Yang rusak ada di jalur klien:
- `pathyChat()` memanggil `askPathy()` di dalam `try`, lalu `catch`-nya jatuh ke gateway action `pathy_chat`. Action itu butuh `ANTHROPIC_API_KEY` yang **tidak diset**, jadi selalu balas `503 "AI not configured"`.
- `PathyChat.tsx` menerjemahkan pesan itu menjadi *"Fitur AI Pathy akan segera hadir!"*. Akibatnya **setiap** kegagalan — sesi kedaluwarsa, kena rate limit, gangguan jaringan, model down — tampil sebagai "coming soon". Chatbot terlihat mati permanen padahal penyebabnya berbeda-beda.
- Setiap pesan juga membakar satu round-trip gagal ke `/api/ai-gateway`. Endpoint itu hanya ada di `server.ts` (dev); `vercel.json` mengecualikan `api/` dari rewrite SPA dan tidak ada direktori `api/`, jadi di produksi pasti 404.
- Tombol "Chat WhatsApp agen" membuka `wa.me/6280000000000` — **nomor placeholder yang tidak ada**.
- Banner "Pathy dapat melihat data kamu" tidak benar: jalur `askPathy` tidak mengirim data pengguna sama sekali. Konteks polis/klaim hanya ada di action `pathy_chat` yang sudah mati itu.

**2. Edge function baru `pathy-agent` (DEPLOYED v1)** — `supabase/functions/pathy-agent/`
Pathy sekarang asisten ber-*tools* yang jalan di server dengan `service_role`, di-scope ke JWT pemanggil. 8 tool: `get_my_policies`, `get_policy_detail`, `get_my_claims`, `get_my_quotes`, `list_products`, `estimate_premium`, `create_quote`, dan `get_sales_report` (khusus agen).
- **Membuat penawaran via chat** — `create_quote` menulis ke `sp_quotes` status `DRAFT`, berlaku 14 hari. Satu-satunya tool tulis. Untuk CUSTOMER, `agent_id` diambil dari agen pada order terakhirnya supaya penawaran masuk pipeline agen tersebut.
- **Laporan polis pengguna** — `get_my_policies` / `get_policy_detail` / `get_my_claims` membaca baris milik caller sendiri; AGENT lewat `agent_id`, CUSTOMER lewat `client_id`, memakai `ownerIds` kanonik (FIX v1.50.0) agar akun lama tetap kebaca.
- **Laporan penjualan agen** — order, premi bruto/terbayar, komisi, dan saldo dompet (read-only).
- Batas: 4 ronde tool, 60 pesan/jam/user via `sp_rate_limits`, argumen di-clamp di server, identitas tidak pernah diambil dari argumen model, teks pengguna tidak pernah masuk system prompt.
- Dokumentasi lengkap: **`docs/PATHY_AGENT.md`**.

**3. Mesin rate OJK untuk edge function** — `supabase/functions/_shared/ojk.ts`
Cerminan Deno dari `services/ojkRates.ts` supaya premi yang dikutip Pathy sama persis dengan angka wizard beli. Membaca baris aktif `sp_ojk_rate_sets`, dengan tabel bawaan sebagai fallback. `services/__tests__/pathy.test.ts` menguji paritas kedua mesin (rate, premi dasar, add-on, total, mobil & motor) — kalau salah satu tabel diubah tanpa yang lain, tes merah.

**4. UI chat: kartu terstruktur, bukan prosa model**
Hasil tool dirender sebagai kartu (polis, detail polis, klaim, penawaran, rincian premi, penawaran tersimpan, laporan penjualan, produk). Angka datang langsung dari hasil tool, jadi nomor polis atau premi tidak bisa melenceng saat model menceritakannya ulang. Quick-reply diganti dari paragraf kalengan ("buka tab Riwayat…") menjadi pertanyaan sungguhan ke Pathy; chip "Laporan penjualan" hanya muncul untuk akun agen.

**5. Pesan error jujur**
`PathyError` dengan kode `AUTH` / `RATE_LIMIT` / `NOT_CONFIGURED` / `UNAVAILABLE`. Sesi habis → "login ulang", kena kuota → "coba lagi sebentar", fungsi tidak terjangkau → jawaban knowledge-base yang **ditandai** "jawaban umum, aku belum bisa membaca data akunmu".

**6. Bug yang ikut ketemu & diperbaiki**
- **`sp_quotes` tidak punya kolom `details`.** Kolom payload-nya `quote_data` (NOT NULL). `SpQuote`, `saveQuote()`, `AgentQuoteBuilder`, dan action `save_quote` semuanya menulis `details` — jadi **setiap penyimpanan penawaran dari Agent Quote Builder ditolak Postgres**, baik lewat gateway maupun lewat fallback insert langsung. Sekarang memakai `quote_data` (action gateway masih menerima `details` demi klien lama). ⚠️ **`data-gateway` belum di-deploy ulang** — perbaikan sisi klien sudah cukup untuk menyimpan lewat gateway, tetapi deploy tetap disarankan.
- **Nomor WhatsApp** dipusatkan sebagai `SUREPATH_WHATSAPP` di `constants.ts` (`6282199920300`, sama dengan tombol floating di situs); PathyChat tidak lagi memakai placeholder.
- **`askPathy` riwayat percakapan** dikirim sebagai giliran chat sungguhan, bukan satu blob "Riwayat percakapan: …" di dalam pesan user.
- **`aiKnowledge.ts` produk PA** masih memuat klaim "instant approval 60 detik" yang sudah dibersihkan di tempat lain pada v1.55.0 — kini "pendaftaran online singkat", konsisten dengan halaman produk dan `llms.txt`.

---

## v1.55.0 — 2026-09-03

### Produk baru: Climate Shield (pre-launch) + halaman Teknologi AI

**1. Produk `climate` — "Proteksi Iklim / Climate Shield" (`/product/climate`)**
Produk keenam di grid, berstatus **pre-launch**: tidak ada alur beli, CTA-nya "Daftar Minat".
- `siteKit.tsx` — ikon SVG `IconClimate`, entri `PRODUCTS` baru, dan `PRODUCTS` kini diberi tipe eksplisit `SiteProduct[]` dengan flag opsional `comingSoon` (tanpa ini, akses `p.comingSoon` gagal karena TS menyimpulkan union tanpa properti tersebut).
- `productInfoContent.ts` — konten bilingual: 6 fitur, 4 segmen (Rumah & UMKM, Pertanian & Perikanan, Bisnis & Korporat, Kendaraan), 4 item cakupan, dan `disclaimer` wajib. Interface `ProductContent` diperluas: `comingSoon`, `segments`, `disclaimer`.
- `ProductInfoPage.tsx` — badge "Dalam pengembangan — belum dapat dibeli", section "Untuk Siapa", label "Rencana cakupan" di atas Jaminan Perlindungan, CTA "Daftar Minat" (navbar + hero + footer CTA), dan blok disclaimer di bawah CTA.
- Grid produk (`ProductsPage`, `HomePage`) menampilkan badge "Segera Hadir" dan CTA "Pelajari & Daftar Minat". Grid homepage diubah dari `xl:grid-cols-5` → `lg:grid-cols-3` karena produk kini 6.
- **Bahasa dijaga agar tidak mengikat**: "rencana santunan", "ambang yang disepakati", "belum dapat dibeli". Tidak ada premi, angka santunan, atau nama insurer yang disebut.

**2. Halaman baru `/ai` — "Teknologi AI SurePath"** (`src/pages/AITechPage.tsx`)
Sebelumnya website publik praktis tidak menceritakan AI sama sekali (hanya ~6 frasa lepas di file konten). Halaman ini memuat 8 kemampuan yang **sudah live dan wired** di kode, section "Bedanya di Mana" (dulu vs kini), 6 pengaman, dan catatan jujur + tautan ke T&C/Privasi.
- Masuk **navbar utama** (`SiteLayout` → 6 item) + kolom footer Perusahaan.
- Section AI baru di homepage (antara grid produk & kalkulator) dengan 4 kartu ringkas → link ke `/ai`.
- **Aturan penulisan halaman ini** (didokumentasikan sebagai komentar di file): tidak menyebut vendor model mana pun — AI diposisikan sebagai teknologi SurePath; tidak ada angka karangan; tidak ada janji durasi penyelesaian klaim; tidak memuat kemampuan yang kodenya ada tapi tak punya pemanggil.

**3. Perbaikan klaim berlebihan yang sudah tayang (temuan audit)**
- **`explainProductAI` (`services/geminiService.ts`)** — prompt lama menyuruh model memakai kosakata *"Enkripsi Kuantum"*, *"Zero-Trust"*, *"Matriks"*, *"Heuristik"* dan menjelaskan *"instant 60-second claim settlement"*, padahal `aiKnowledge.ts` sendiri menyebut klaim `3-10 hari kerja`. Prompt ditulis ulang: bahasa biasa, **dilarang** menyebut angka/premi/durasi/limit, dilarang menjanjikan hasil, dilarang mengarang fitur atau sertifikasi, dan wajib menyatakan ketentuan mengikuti polis. Interface `ProductExplanation` diganti dari `technicalSummary/neuralBenefits/securityProtocol/impactScore/payoutLogic` → `summary/benefits/dataProtection/claimProcess`; **`impactScore` dihapus** karena skor 0-100 karangan model ditampilkan ke publik.
- **`ProductAIExplainer.tsx`** — ditulis ulang: label palsu (`SECURE_SESSION_ACTIVE`, "Security Grade", progress bar diagnostik simulasi) dihapus, ditambah disclaimer wajib bahwa ringkasan dibuat otomatis, bukan penawaran harga dan bukan jaminan pertanggungan.
- **`services/NeuralGuardService.ts` DIHAPUS** — seluruh isinya data fiktif: `threatsBlocked24h: 12401 + Math.random()*50`, "Neural WAF v4", "Quantum-Resistant Layer", uptime "99.999%", dan 3 baris ancaman hardcoded. Satu-satunya pemakainya (`AdminViews.tsx` → StatCard "Uptime Server") kini menampilkan `N/A`, konsisten dengan StatCard "Latensi Server" di sebelahnya. `generateLiveThreat`/`getRecentThreats` memang sudah tidak punya pemanggil.
- **`AboutPage.tsx`** — nilai "Inovatif" tidak lagi menjanjikan *"instant approval"*.

**4. SEO**
- `seo.ts` — descriptor `/product/climate` (+ `Service` & `BreadcrumbList` JSON-LD) dan `/ai`. **Dua** regex slug produk harus diperbarui: di `App.tsx` (routing) dan di `seo.ts` `resolveSeo()` (metadata) — kalau hanya satu, halaman render tapi memakai title fallback.
- `sitemap.xml` +2 URL (24 → 26), `llms.txt` menambah bagian "Penggunaan AI" beserta batasannya dan produk climate dengan status "belum dapat dibeli".

**5. Klaim tak terverifikasi di halaman /security & produk (lanjutan dari poin 3)**
- `staticPagesContent.ts` — halaman **Keamanan Data**: klaim **"SLA uptime 99,9%"** dan **"Infrastruktur bersertifikasi SOC 2 Type II"** dihapus. Kalimatnya kini menyebut lokasi hosting (AWS ap-southeast-1) dan secara eksplisit menyatakan bahwa sertifikasi kepatuhan di lapisan infrastruktur adalah milik penyedia infrastruktur, **bukan sertifikasi atas nama SurePath** — perbedaan yang penting kalau klaim ini dipertanyakan. Istilah pemasaran **"Arsitektur Zero-Trust"** diganti deskripsi mekanisme yang benar-benar ada di kode: tabel sensitif tidak dapat diakses langsung dari browser, setiap permintaan diverifikasi ulang di server per aksi (pola data-gateway + deny-all RLS).
- `productInfoContent.ts` — produk **Kecelakaan Diri**: janji **"Pendaftaran online selesai hanya dalam 60 detik"** dan chip **"Daftar 60 Detik"** / **"Instant Approval"** diganti "Pendaftaran online singkat" / "Daftar Online" / "Proses Digital". Produk **Proteksi Barang**: **"Garansi perbaikan dengan teknisi tersertifikasi"** → "Perbaikan dikerjakan oleh teknisi rekanan kami" (menghapus klaim garansi sekaligus klaim sertifikasi teknisi).

**Verifikasi:** `tsc --noEmit` bersih · 72/72 unit test pass · `npm run build` sukses · ESLint 2 error, keduanya pre-existing (identik sebelum perubahan) · halaman `/ai`, `/product/climate`, `/products`, `/` di-render dan diperiksa lewat build produksi lokal + Chromium.

**Catatan:** tidak ada edge function yang berubah, jadi tidak ada yang perlu di-deploy ke Supabase.

---

## v1.54.0 — 2026-08-09

### SEO Audit + Fix (score ~6.5 → ~9.5/10)
Audit SEO menyeluruh. Homepage statis sudah kuat (JSON-LD @graph, OG, FAQ schema), tapi ada gap kritikal untuk SPA client-rendered ini.

**Kritikal — per-route metadata (dampak terbesar):**
- **`src/seo/seo.ts` (baru)** — head manager per-route tanpa dependency. Sebelumnya SEMUA halaman marketing/produk/blog (20+ URL) mewarisi `<title>`, description, canonical & OG homepage dari index.html → Google melihat 20+ halaman "duplicate metadata", nol keyword targeting per halaman. Sekarang tiap route punya title, meta description, canonical, robots, Open Graph, Twitter card, dan JSON-LD unik.
- **Di-wire di `App.tsx`** via satu `useEffect([currentPath])` → `applyDocumentHead(resolveSeo(path))`. Googlebot merender JS dan meng-index DOM hasilnya.
- **Per-product JSON-LD** — tiap `/product/:slug` dapat `Service` + `BreadcrumbList` schema + title kaya keyword (mis. "Asuransi Mobil All Risk & TLO Online | Premi Tarif OJK").
- **Per-blog-post** — tiap `/blog/:slug` dapat `Article` + `BreadcrumbList` schema + title/description unik.
- **App/portal routes → `noindex, follow`** — `/login`, `/custapp`, `/agapps`, `/operatorapp`, `/insurerapp`, `/admin`, `/select-app`, `/review/`, `/q/`, `/payment`, dan path tak dikenal (cegah soft-404 ke-index).

**Teknikal:**
- **hreflang phantom dihapus** (`index.html`) — `hreflang="en" → /en/` menunjuk path yang tidak ada (toggle EN client-side saja, tidak ada URL /en/ terpisah). Menyisakan `id` + `x-default`.
- **viewport a11y** — hapus `maximum-scale=1, user-scalable=no` (fail WCAG 1.4.4 + Lighthouse). Zoom kini diizinkan.
- **robots.txt dikonsolidasi** — dulu ada DUA file (root + public/) yang saling berbeda aturannya; Vite hanya serve `public/`. Root file dihapus. Canonical: disallow semua app/portal + tokenized path, allow marketing.
- **sitemap.xml diperbaiki + dikonsolidasi** — dulu ada dua file berbeda; root dihapus. Fix: buang `/agent` & `/claim` (bukan route → soft-404), hapus `/contact` duplikat, tambah 5 URL artikel blog, tambah `/cookie`, refresh semua `lastmod`. 24 URL valid.
- **Organization schema diperkaya** (`index.html`) — `legalName` (PT Ruang Proteksi Indonesia), `slogan`, logo `width/height`, `sameAs` (Twitter @SurePathID yang memang sudah dideklarasikan di twitter:site).

**Catatan:** placeholder `%VITE_GSC_VERIFY%` / `%VITE_GA4_ID%` di index.html di-inject Vercel saat build (env sudah diset di prod) — sengaja tidak diubah agar analytics prod tidak putus.

---

## v1.53.0 — 2026-08-03

### Full audit hardening (P0 + P1 fixes)
Hasil audit lengkap 2026-08-03 (skor keseluruhan B, 7.4/10): 19 npm vuln, 30+ Supabase linter warnings, 331 raw `console.*` di prod bundle, Playwright e2e mengarah ke prod. Rilis ini menutup semua P0 dan quick-win P1.

**Dependency (11 vulnerabilities eliminated: 19 → 8):**
- `react-router-dom` bumped ke `^7.18.2` (CSRF fix GHSA-qwww-vcr4-c8h2) — app pakai HashRouter jadi exposure rendah tapi patch trivial.
- `overrides` di `package.json` untuk force-resolve transitive vulns: `nanoid ^3.3.16` (GHSA-28wg-ghj8-5hjv infinite loop), `dompurify ^3.4.13` (GHSA-55q2-fjhq-7xh7 XSS), `@xmldom/xmldom ^0.8.13` (GHSA-2v35-w6hq-6mfw DoS), `picomatch ^4.0.4`, `brace-expansion ^2.0.3`, `fast-uri ^3.1.1`, `body-parser ^2.3.0`, `serialize-javascript ^7.0.3` (RCE fix).
- Sisa 8 vulns semua build-time (esbuild, postcss, vite, tar, undici, babel/*) — tidak ship ke user, dijadikan P2 backlog.

**Database security (migration `20260803_security_hardening_v1_53.sql`, sudah diapply prod):**
- **Deny-all RLS policies** eksplisit pada 7 tabel gateway-only (`admin_audit_logs`, `admin_sessions`, `sp_bot_config`, `sp_otp_codes`, `sp_payments`, `sp_policy_orders`, `sp_wa_logs`) — sebelumnya RLS on tanpa policy (implicit deny). Sekarang eksplisit dengan `USING(false) WITH CHECK(false)` untuk `anon` + `authenticated`. Tidak mengubah perilaku (gateway pakai service_role), tapi mendokumentasikan intent dan menghilangkan linter 0008.
- **REVOKE EXECUTE** dari `anon` + `authenticated` pada 6 SECURITY DEFINER helper yang seharusnya hanya dipanggil dari trigger/service_role: `force_delete`, `soft_delete`, `notify_new_withdrawal`, `notify_paid_payment`, `log_sp_users_role_change`, `increment_rate_limit`. Sebelumnya semua exposed via `/rest/v1/rpc/*` (walau ada admin check internal).
- **REVOKE EXECUTE dari `anon`** (bukan authenticated — masih dibutuhkan RLS policies) pada `is_admin`, `is_operator`, `is_staff`.
- **SET search_path** pada 3 SECURITY DEFINER function: `gen_agent_agreement_no`, `block_hard_delete`, `audit_critical_update` — mencegah search_path hijacking.

**Client & build:**
- **`console.log`/`debug`/`info` di-strip di production build** (`vite.config.ts` → terser `drop_console`) — 331 statement di 91 file tidak lagi ship. `console.error`/`warn` dipertahankan untuk Sentry breadcrumbs.
- **`playwright.config.ts` tidak lagi mengarah ke prod secara default** — sekarang baca `PLAYWRIGHT_BASE_URL` (biasanya URL Vercel preview di CI), fallback ke `http://localhost:3000`. Opt-in eksplisit ke prod via env `UNSAFE_E2E_AGAINST_PROD=1`.

**Edge function (data-gateway):**
- **`admin_apply_migration` action dihapus** — SQL executor via HTTP (bahkan dengan MASTER_ADMIN gate) adalah attack surface yang tidak perlu. Migration yang di-apply-nya sudah live sejak v1.42; source removed.

**Catatan deploy:**
- Migration DB: sudah diapply ke production via Supabase MCP.
- Client v1.53.0: auto-deploy dari Vercel setelah merge.
- Edge function bundle: masih perlu manual redeploy — hanya perubahan ini adalah remove `handleMigrationAction`; efeknya sama (kalau action ini dipanggil tanpa redeploy, tetap dijaga oleh MASTER_ADMIN check yang belum berubah di bundle lama).

---

## v1.52.0 — 2026-08-03

### Fix Login Gagal untuk Mitra Baru + Role Stickiness Guarantee
Bug lapangan (Stephen Cheng): user OAuth Google yang baru daftar sebagai Mitra kadang stuck di layar loading lalu balik ke halaman login setelah OAuth callback. Root cause: `buildAndLogin` di `App.tsx` menjalankan dua panggilan gateway paralel (`get_user_profile` + `get_my_profile`) dan bila **kedua**-nya gagal transient (5xx / network / cold-start), `profile` = null → RoleSelectionScreen. Jika user mengklik "Batal" → logout paksa → balik ke login screen tanpa error yang bisa ditindaklanjuti.

**Perilaku yang dijamin sekarang** — siapapun yang pilih *Mitra* akan tetap *Mitra*, siapapun yang pilih *Nasabah* akan tetap *Nasabah*, tidak peduli apa yang terjadi sesudahnya:

- **`fetchMyProfileForLogin(retries=3)` (services/users.ts)** — panggilan tunggal ke `get_my_profile` dengan retry backoff (0.8s / 1.6s / 2.4s). Membedakan **404 (server memastikan tidak ada profil)** dari **transient error (5xx/network/timeout)**. RoleSelectionScreen hanya muncul untuk kasus 404.
- **`callGateway` mengekspos HTTP status** (services/db.ts) — dulu semuanya dilebur ke `error: string`; sekarang caller bisa membedakan 404 dari 5xx.
- **Transient error → login screen dengan pesan Indonesia** — kalau retry mentok, `buildAndLogin` `signOut()` sesi yang gagal + tampilkan banner "Tidak bisa memuat profil kamu. Cek koneksi lalu coba masuk lagi." di AuthGate (props baru `externalError`/`onDismissExternalError`). Tidak pernah membuat profil dengan role salah karena jaringan bergejolak.
- **RoleSelectionScreen selalu percaya role dari server** (components/RoleSelectionScreen.tsx) — bila server balikkan `existed: true` dan role yang tersimpan berbeda dari yang di-klik, tampilkan pesan "Akun ini sudah terdaftar sebagai X" lalu tetap masuk ke portal X. User klik salah pun tidak bisa mengubah role.
- **Server: `ensure_profile` role-immutability guard** (supabase/functions/data-gateway/actions/users.ts) — bila `caller.spUser` sudah ada, param `role` yang berbeda **diabaikan** (log warning `[ensure_profile] role-change attempt ignored`). Sama untuk lookup by-email. Response menyertakan `existed: true/false`.
- **DB trigger: `trg_sp_users_role_change_audit`** (migration `20260803_role_change_audit.sql`, sudah diapply production) — setiap `UPDATE` pada `sp_users.role` menulis baris `ROLE_CHANGE` ke `sp_audit_log` (old & new role + allowed_apps). Jejak audit ada bahkan bila application layer entah-bagaimana bypass `ensure_profile`.

**Catatan deploy:** bundle production data-gateway (v3 lama, single-file minified) belum di-redeploy dari sesi ini — perubahan `ensure_profile` di source akan aktif ketika data-gateway di-redeploy berikutnya (`npx esbuild supabase/functions/data-gateway/index.ts --bundle --format=esm --platform=neutral --external:npm:* --minify`). Fix client + trigger DB sudah cukup untuk menghilangkan gejala; server-side hardening bersifat defense-in-depth (perilaku "return existing profile as-is" untuk user yang sudah punya row sudah ada di bundle production, jadi role stickiness pasti aktif).

---

## v1.51.0 — 2026-07-17

### Fix QR E-Quotation di PDF — 1 Quotation = 1 QR Unik, Berlaku 14 Hari
QR pada PDF quotation sebelumnya "nyasar ke aplikasi": user yang sudah login (agen/admin yang menguji QR-nya sendiri) di-redirect paksa ke portalnya, sehingga halaman `/q/{code}` tidak pernah tampil.

- **Redirect pasca-login tidak lagi membajak halaman publik** — `App.tsx` kini melewatkan `navigate(rolePath)` bila pathname adalah `/q/`, `/review/`, atau `/payment/`; siapa pun (login ataupun tidak, punya app ataupun tidak) yang scan QR mendarat di halaman e-quotation HTML khusus quotation tsb.
- **Masa berlaku link 14 hari** — kolom baru `sp_quotations.link_expires_at` (default `now() + 14 hari`, di-refresh setiap PDF digenerate ulang; migrasi `20260717_quotation_link_expiry.sql` sudah diapply ke production, row lama di-backfill dari `created_at`). Setelah lewat, halaman menampilkan status *Kedaluwarsa* dan konfirmasi ditolak (HTTP 410). Halaman publik kini menampilkan "Tautan aktif s/d …".
- **`quotations-gateway` jadi runtime kanonik** — client memanggil bridge ini DULU untuk semua action quotation (data-gateway hanya fallback jaringan), karena bundle data-gateway di production dideploy manual dan bisa tertinggal. Bridge v2 sudah dideploy dengan penegakan expiry; modul `data-gateway/actions/quotations.ts` di repo ikut disinkronkan.
- **QR PDF tidak pernah fallback ke homepage** selama `eQuoteCode` ada — 1 quotation, 1 QR unik ke `https://myinsurepath.com/q/{code}`.

---

## v1.50.0 — 2026-07-17

### Website Speed Optimization + PWA Direct-Install Popup
Audit Lighthouse (mobile, production build): skor performa **64 → 82**, FCP 3.8s → 2.4s, LCP 5.1s → 3.6s, Speed Index 25s → 6.6s, total bytes first load 3,7MB → 2,1MB.

**Performa:**
- **Hero video tidak lagi di-download 2×** — `HeroVideo` sebelumnya di-mount dua kali (varian desktop + mobile, disembunyikan CSS) sehingga `hero.mp4` 1,1MB terunduh ganda; kini satu `<video>` dengan `desktopPosition` responsif via matchMedia
- **Hero video lazy** — `preload="none"` + IntersectionObserver; poster (`promo-poster.jpg`, di-preload `fetchpriority=high`) tampil seketika sebagai LCP, mp4 menyusul setelah paint
- **Background video (`promo.mp4` dkk.) ditunda** — dimuat saat browser idle setelah `load`, tidak bersaing dengan resource kritis
- **Google Fonts non-render-blocking** — pola `media="print" onload` + fallback `<noscript>`; teks tampil langsung dengan font fallback (display=swap)
- **Precache service worker 4,2MB → ~1,5MB** — chunk portal berat (Agent/Admin/Operator/Insurer/Customer/B2B, jspdf, AnalyticsDashboard, stnkOcr, geminiService, dst.) dikeluarkan dari precache; di-cache on-demand via runtimeCaching (CacheFirst untuk asset ber-hash, SWR untuk gambar + Google Fonts)
- **Manual chunk `pdf` + `recharts` dihapus** — manual chunk menyerap dependency bersama sehingga entry utama meng-import statis ±240KB jspdf+recharts di SEMUA halaman termasuk homepage; code-splitting alami kini mengisolasi keduanya ke halaman yang memakainya
- **Logo dioptimalkan** — `surepath-logo-sm.png` (3KB, dari 102KB) untuk navbar/badge; `logo-sm.png` (11KB, dari 73KB) untuk splash/install prompt/app selector; file asli tetap ada untuk og:image

**PWA:**
- **Popup install langsung, hanya mobile view** — `InstallPrompt` + popup marketing site kini hanya muncul otomatis di mobile (viewport ≤768px / pointer coarse) dan HANYA saat browser menyediakan `beforeinstallprompt` (Android/Chromium) → tombol "Pasang Sekarang" memicu dialog install native satu ketuk
- **Sheet instruksi "cara pasang" dihapus** dari popup otomatis (iOS Safari tidak punya API install langsung, jadi tidak ada auto-popup di iOS); tombol Install di navbar tetap tersedia di desktop

---

## v1.40.0 — 2026-07-12

### Agent App World-Class Refinement (Stitch-driven, visual only)
Layar Agent app di-refine memakai design system yang digenerate Google Stitch (proyek "SurePath Agent App — Bank-Grade Refinement"):
- **Set ikon custom buatan sendiri** `components/agent/AgentIcons.tsx` — 16 ikon duotone hand-drawn (grid 48px, goresan membulat 3px, tint emerald lembut + aksen emas per ikon): Home, Polis, Buat, Dompet, Profil, Penawaran, Klien, Klaim, Ranking, Jaringan, Renewal, Endors, Koin, Notif, Target, Grafik
- **Bottom nav** — ikon custom menggantikan ikon generik; tombol tengah "Buat" dengan ikon squircle-plus + spark emas
- **Quick actions Beranda** — tile putih mengambang (radius 24px, ambient shadow navy 12%, hover lift) dengan ikon duotone custom per warna kategori
- **Hero Partner Card** — saldo komisi kini gradient emas (spec Stitch: "balance in gold"), label emas, sesuai estetika kartu premium
- **AI Coach card** — ring gradient emerald→gold pada mascot Pathy + ikon target custom
- **Dompet** — ikon wallet & koin custom di kartu saldo
- Design system Stitch tersimpan di proyek Stitch untuk referensi desain selanjutnya
- Logika, proses, menu, dan backend tidak berubah

---

## v1.39.0 — 2026-07-11

### Insurer App UI Redesign + Onboarding (visual only, identitas ungu)
Tema bank modern diterapkan ke Insurer app dengan mempertahankan identitas ungu:
- **Onboarding Insurer 4 slide** — background gradient ungu khusus, ilustrasi sesuai alur kerja insurer: Pengajuan Realtime, Review Satu Layar (skor AI + approve/reject), Terbitkan Polis (scene baru `ObInsIssue`: dokumen polis + seal + upload), Pantau Premi & Pembayaran; tampil sekali via `SP_ONBOARDED_INSURER`
- **OnboardingFlow kini mendukung aksen per-role** (emerald untuk Customer/Agent/Operator, ungu untuk Insurer)
- **`AgentHero` mendukung `tone="purple"`** — gradient navy→ungu untuk seluruh banner insurer
- **Shell InsurerPortal** — bottom nav pill gaya bank + avatar berinisial gradient ungu
- **Dashboard** — hero jadi "Insurer Command Center" bergaya kartu bank + ilustrasi
- **Hero banner + ilustrasi** di Pengajuan Polis, Klaim Polis, Notifikasi Pembayaran (dengan tombol Export CSV terintegrasi), Profil
- **Empty states berilustrasi** di semua daftar + drawer aktivitas
- Logika, proses, menu, dan backend tidak berubah

---

## v1.38.0 — 2026-07-11

### CMS / Admin Panel UI Redesign (visual only)
Tema bank modern v1.36–v1.37 diterapkan ke CMS (Admin Panel):
- **Command banner dashboard** — greeting admin bergaya kartu bank (gradient navy→emerald, pola ring, ilustrasi jaringan, tombol refresh terintegrasi)
- **Hero banner otomatis di semua ±28 menu view** — banner bertema dengan judul menu, subtitle deskriptif, dan ilustrasi yang sesuai konteks (dompet untuk pembayaran/penarikan/komisi, shield untuk klaim/keamanan/OJK, dokumen untuk polis/antrean, storefront untuk B2B/insurer/produk, dst.) — dirender sekali di shell, konsisten di seluruh CMS
- **Sidebar** — tile logo & avatar footer gradient emerald (fungsi upload logo tetap)
- Menu, role-permission, dan seluruh logika CMS tidak berubah

---

## v1.37.0 — 2026-07-11

### Operator App UI Redesign + Onboarding (visual only)
Tema bank modern v1.36 diterapkan ke Operator app:
- **Onboarding Operator 4 slide** — ilustrasi custom sesuai tugas operator: Command Center (antrean realtime), Review & Keputusan (dokumen + skor AI + approve/reject), Pencairan Berlapis (vault + L1/L2/L3), Verifikasi Mitra (ID card + verified check); tampil sekali via `SP_ONBOARDED_OPERATOR`
- **4 scene ilustrasi baru** di `AgentArt.tsx`: `ObOpsQueue`, `ObOpsReview`, `ObOpsPayout`, `ObOpsVerify`
- **Shell OperatorPortal** — bottom nav pill gaya bank + avatar berinisial gradient
- **Dashboard** — hero greeting jadi kartu command center bergaya bank (pola kartu + ilustrasi)
- **Hero banner + ilustrasi** di Antrian Polis, Antrian Klaim, Antrian Penarikan, Verifikasi Agen, Profil
- **Empty states berilustrasi** menggantikan ikon polos di semua antrean + notifikasi
- Logika, proses, menu, dan backend tidak berubah

---

## v1.36.0 — 2026-07-11

### Agent App UI Redesign (visual only — tanpa perubahan backend/fungsi/menu)
Tampilan Agent app dirombak ke gaya modern ala aplikasi bank:
- **Kit ilustrasi baru** `components/agent/AgentArt.tsx` — 4 scene onboarding + 12 spot illustration vector custom (emerald/navy/gold) + komponen `AgentHero` (banner gradient) + `AgentEmpty` (empty state berilustrasi)
- **Onboarding Agent 4 slide** — tiap slide dengan ilustrasi custom sesuai konten: Welcome (dashboard di genggaman), Quote cepat (dokumen + stempel OJK), Komisi & wallet (kartu bank + koin), Growth (trofi + jaringan)
- **Shell AgentPortal** — bottom nav gaya bank dengan tombol tengah "Buat" menonjol; avatar berinisial gradient di header
- **AgentHome** — kartu komisi bergaya kartu bank premium (chip, contactless, pola kartu, kode agen sebagai identitas kartu); teaser leaderboard dengan ilustrasi trofi
- **Hero banner + ilustrasi di semua layar**: Orders/Polis, CRM (Buku Klien), Klaim, Komisi, Dompet, Leaderboard, Jaringan Mitra, Renewal, Endorsemen, Marketplace, Notifikasi, Profil (banner gradient + avatar besar)
- **Empty states berilustrasi** menggantikan ikon polos di seluruh layar agent
- Logika, proses aplikasi, menu, dan backend 100% tidak berubah

---

## v1.35.0 — 2026-07-11

### Quotation Slip PDF di Semua Apps
Template Quotation Slip 4 halaman (v1.33) kini tersedia di seluruh aplikasi:
- **Admin (PolicyOrdersAdmin)** — tombol "Quotation Slip" di modal detail order, tersedia untuk semua status
- **Insurer (InsurerOrders)** — tombol "Unduh Quotation Slip (PDF)" di sheet detail pengajuan; nama insurer dari dashboard dipakai di slip
- **B2B (B2BQuotes)** — tombol "Unduh Quotation (PDF)" per kartu penawaran; adapter baru `fromB2BQuote` untuk penawaran korporasi non-kendaraan (coverage details → tabel jaminan)
- **Customer Car Wizard (StepFinal)** — "Unduh Proposal Penawaran" beralih dari generator lama `proposalPdf` ke template Quotation Slip yang sama via `fromAgentQuote`
- Sebelumnya sudah terpasang: Customer (OrderDetailSheet), Agent (AgentQuoteBuilder), Operator (OperatorOrders) — kini 7 titik unduh dengan 1 template konsisten

---

## v1.26.0 — 2026-07-08

### Comprehensive Test Suite + Health Check + Request ID
- **52 tests** — 43 unit tests (vitest) + 9 E2E tests (Playwright), all passing
- **Health check endpoint** — `GET /functions/v1/data-gateway` returns `{status, service, version, timestamp}`
- **X-Request-ID** — every gateway response includes `X-Request-ID` header for distributed tracing
- **E2E tests** cover: gateway auth (401/404/400), rate limiting (429 burst), insurer decision validation, admin JWT requirement
- **Unit tests** cover: OJK premium calculation (18 tests), AuthService rate limiting (5), promo codes (5), plate codes (4), callGateway pattern (4), data shapes (4)
- **Test infrastructure** — vitest.config.ts + vitest.setup.ts + playwright.config.ts + jsdom environment

---

## v1.25.0 — 2026-07-08

### ESLint + Dark Mode + Security Hardening + Dead Code Purge
- **ESLint installed** — 0 errors, 23 warnings (was configured but never installed; CI lint was silently failing)
- **Dark mode CSS** — 50+ `.dark` overrides in styles.css for admin portal (was broken: 19/21 admin files had 0 dark: variants)
- **Touch target enforcement** — CSS rule: `w-8 h-8` / `w-9 h-9` buttons get `min-width: 44px; min-height: 44px` (WCAG)
- **25 `alert()` → `console.warn()`** across 14 files (was blocking UI thread)
- **Rate limiting: fail-open → fail-closed** (blocks on DB error for security)
- **Demo accounts deactivated** — auth.users entries deleted, trust_score=0
- **Demo1234! redacted** from 4 public docs
- **`WHERE deleted_at IS NULL`** applied to admin_list_orders, admin_list_claims, admin_list_payments
- **sp_page_views RLS fixed** — GRANT SELECT to authenticated/anon (was broken)
- **FloatingWhatsApp** placeholder phone → real business number
- **jspdf lazy-loaded** in 3 car-wizard components (358KB chunk deferred)
- **Dead code deleted** — legacy InsurerPortal.tsx (509 lines), 4 junk files
- **3 overlapping docs deleted** — BLUEPRINT.md, MASTERMIND.md, surepath.md
- **`.env.example` rewritten** — removed Firebase, added all actual env vars + 19 edge functions

---

## v1.24.0 — 2026-07-07

### Phase 1 "Stop the Bleeding" — Audit Quick Wins
- **Junk files deleted** — `[full_path_of_file_1]`, `replace.js`, `replace.cjs`, `remove-unused.ts`
- **Legacy InsurerPortal.tsx deleted** (509 lines dead code, unrouted since v1.21.0)
- **FloatingWhatsApp** placeholder phone → real business number
- **Rate limiting** fail-open → fail-closed
- **`WHERE deleted_at IS NULL`** applied to 3 admin list queries
- **25 `alert()` → `console.warn()`** across 14 files
- **`.env.example`** rewritten with all actual env vars + 19 edge functions documented
- **admin_list_clients** auth clarified (non-admins see own clients only)

---

## v1.23.0 — 2026-07-07

### Rate Limiting, Activity Logging, API Config
- **Rate limiting** — IP-based (60 req/hr) and insurer-token-based (200 req/hr) limits enforced at the gateway via `sp_rate_limits` + `increment_rate_limit()` RPC
- **Activity logging** — every insurer action (login, decision, payment, policy upload) is recorded in `sp_insurer_activity_log` for full audit trail
- **API config management** — `sp_insurer_api_configs` table lets admins store per-insurer integration credentials (endpoint, key, headers) editable from Insurer CMS
- **Security audit** (Phase 3-6 follow-up) — reviewed all new endpoints, confirmed token expiry + revocation + scope checks

---

## v1.22.0 — 2026-07-07

### Reminder System, Email URL Fix, Critical Migration
- **Insurer reminder cron** — new `insurer-reminder-cron` edge function (scheduled every 4h) emails insurers with pending review links; tracks `reminder_count` + `last_reminded_at` on `sp_review_tokens` to avoid spamming
- **Email URL fix** — review-link emails now point at the correct production domain (`https://myinsurepath.com/review/<uuid>`) instead of localhost
- **Critical DB migration** — added `insurer_decision`, `insurer_decision_notes`, `insurer_decision_at`, `insurer_review_token_id` columns to `sp_policy_orders` to persist insurer verdicts
- **Security audit pass** — reviewed token-based auth flow, hardened `is_operator()` + `is_staff()` helpers (search_path fixed, EXECUTE revoked from anon)

---

## v1.21.1 — 2026-07-07

### Insurer CMS Phase 2
- **Token management UI** — admin can list, generate, and revoke `sp_insurer_auth_tokens` from Insurer CMS; expiry + last-used-at surfaced
- **Review link management** — admin can resend / revoke `sp_review_tokens` per order; status badge (pending / submitted / expired) shown
- **`pic_email` field on `sp_insurers`** — distinct from contact email; used as the default recipient for insurer review links + reminders

---

## v1.21.0 — 2026-07-07

### Insurer App (5-tab portal)
- **Complete Insurer portal** — dedicated `/insurerapp` with 5-tab bottom-nav: Beranda (dashboard), Polis (review queue), Klaim, Bayar (payments), Profil
- **Token-based auth** — insurers log in via issued bearer token (no Supabase Auth); tokens stored in `sp_insurer_auth_tokens` with TTL + last-used tracking
- **Supabase Realtime** — operator + insurer apps subscribe to `sp_admin_notifications` / `sp_insurer_activity_log` channels for live updates (new in v1.21+)
- **Authed decision flow** — `insurer_submit_decision_authed` gateway action lets logged-in insurers approve / reject / request-info without needing a fresh review link

---

## v1.20.0 — 2026-07-07

### Insurer Review Flow (operator → email → insurer)
- **Operator approve → email** — when operator approves a queue item, system generates a `sp_review_tokens` row (UUID, 7-day expiry) and emails the insurer a single-order review link
- **Insurer review page** — public `/review/:uuid` route renders order summary + documents + 3 decision buttons (Approve / Reject / Request Info); submission goes through `submit_insurer_decision` gateway action (token verified server-side)
- **Decision persisted** — verdict + notes written back to `sp_policy_orders` and the token marked used; operator sees the decision in their queue in realtime

---

## v1.19.2 — 2026-07-07

### Fix
- **Customer app logout button** — fixed z-index collision with bottom nav + enlarged touch target; button now reliably tappable on iOS + Android

---

## v1.19.1 — 2026-07-07

### Fix
- **Version-gated session refresh** — sessions older than the minimum supported app version are force-refreshed on load; fixes blank-screen bug where stale localStorage sessions referenced routes/keys removed in newer builds

---

## v1.19.0 — 2026-07-07

### Multi-App Login + Agent Verification
- **`allowed_apps` field** — `sp_users.allowed_apps` (array) controls which apps a user can enter; when >1 entry, user lands on `/select-app` to pick; admin can edit from User Management
- **Agent verification tab** — operator app gains a "Verify Agent" tab listing `sp_users` with role=AGENT + `is_verified=false`; operator can view KTP + agreement + approve (`admin_verify_agent`)
- **SettingsView fix** — broken settings tab in operator app (was 404'ing) re-wired to the right component

---

## v1.18.2 — 2026-07-07

### Fixes (Operator App polish)
- **Bottom nav fixed** — active tab state was not reflecting current route; now uses `useLocation` correctly
- **Dark mode** — operator app now respects `sp_dark_mode` localStorage like customer + agent apps
- **Polis detail sheet** — added document viewer (image + PDF) inside the operator's policy detail bottom-sheet; previously documents were download-only

---

## v1.18.1 — 2026-07-07

### Fix
- **`is_suspended` column** — production `sp_users` schema was missing the `is_suspended` column added in v1.18.0; added via hotfix migration, unblocking operator suspend/unsuspend actions

---

## v1.18.0 — 2026-07-07

### Operator App
- **Dedicated `/operatorapp` route** — separate PWA with 5-tab bottom-nav: Antrean (queue), Polis, Klaim, Penarikan (withdrawals), Profil
- **OPERATOR role** — new `sp_users.role = 'OPERATOR'` with scoped permissions; `is_operator()` SECURITY DEFINER helper gates actions
- **Realtime notifications** — operator notifications panel subscribes to `sp_admin_notifications` via Supabase Realtime; new items appear without refresh
- **Agent verification queue** — operator can review + verify newly registered agents (KTP + agreement check) before they can sell
- **New gateway actions** — `admin_queue_summary`, `admin_mark_all_notifications_read`, `admin_list_pending_agents`, `admin_get_agent_detail`, `admin_verify_agent`

---

## v1.17.0 — 2026-07-07

### Stabilization Release
- Pre-Operator-App baseline; security + RLS hardening in preparation for the Operator App launch (v1.18.0)
- Internal housekeeping, dependency bumps, and CI tweaks — no public-facing UX changes
- Build + lint green; CI gate (`tsc --noEmit` + build) active on every PR to `main`

---

## v1.16.1 — 2026-07-04

### Quote / Order Fixes (Phase 5)
- **OJK-accurate agent quotes** — AgentQuoteBuilder premium calc & rate display now use the official `getBaseRateByBand()` (SEOJK 6/2017) instead of hardcoded 2.5%/1.8%
- **Photo survey is purchase-only** — customer PreSummary makes the quote path explicit: "Unduh Penawaran" gives a quote PDF with no photo survey; survey is only required to continue to purchase / issue policy / pay
- **Silent save failures surfaced** — agent quote save now alerts on failure (RLS/connection) instead of appearing to succeed, so missing records are visible
- **Note (backend):** `sp_policies`/`sp_commissions` direct client inserts are service-role-only by design; the agent "convert" shortcut is superseded by the gateway order flow (`create_policy_order`)

---

## v1.16.0 — 2026-07-03

### Security Audit & Clean Handover (Phase 4)
- **Repo cleaned for client handover** — removed 200+ AI dev-tooling files not part of the app (`.agents/` marketing skills, `.claude-flow/`, `CLAUDE.md`, `.mcp.json`, `skills-lock.json`); all now gitignored
- **AI-vendor branding removed from UI** — "Claude AI" labels in admin AI views replaced with "SurePath AI"; error messages genericized (no vendor key names shown to users)
- **`is_admin()` hardened** — fixed `search_path` (prevents search_path injection on SECURITY DEFINER function); `EXECUTE` revoked from `anon` role
- **Security audit run** (Supabase advisor) — confirmed sensitive tables use the intended gateway-only deny-by-default RLS pattern; no secrets in repo; documented posture
- **`docs/HANDOVER.md`** — complete client onboarding guide (stack, env vars, deploy, architecture, security, docs index)
- No functional/frontend code paths changed; build + lint green

---

## v1.15.1 — 2026-07-03

### Website Footer (Phase 3)
- **Bug utama footer diperbaiki** — `navigate()` kini scroll ke atas saat pindah halaman; sebelumnya klik link footer terasa "tidak berfungsi" karena viewport tetap di bawah
- **Halaman Kontak diaktifkan** — `ContactPage` yang sebelumnya tidak pernah dirender kini terhubung ke rute `/contact`; link "Hubungi Kami" di footer berfungsi
- **Konten footer dilengkapi** — kolom kontak (email, telepon, lokasi), link Kemitraan & Kebijakan Cookie ditambahkan ke kolom yang sesuai
- **Disclaimer regulasi OJK** — pernyataan bahwa SurePath adalah platform teknologi yang memasarkan produk asuransi berizin OJK (bukan perusahaan asuransi) — kepatuhan penting untuk situs asuransi
- **Tahun copyright dinamis** + nama badan hukum `PT SurePath Digital Indonesia`
- Handle media sosial dirapikan ke `myinsurepath`

---

## v1.15.0 — 2026-07-03

### Agent Legal Agreement (Phase 2)
- **Perjanjian Kerja Sama Keagenan wajib** — agen baru harus membaca & menyetujui syarat-ketentuan sebelum bisa mengakses aplikasi; akses diblokir penuh sampai disetujui (`AgentAgreementGate`)
- **10 pasal legal komprehensif** melindungi perusahaan: definisi, ruang lingkup & status hubungan, kewajiban/larangan agen, komisi & clawback, pernyataan & jaminan, ganti rugi/indemnifikasi, sanksi & pengakhiran, kerahasiaan & UU PDP, hukum yang berlaku & domisili PN Jakpus, persetujuan elektronik (UU ITE)
- **Nomor surat otomatis** — format `SP-AGR-YYYY-NNNNN` via sequence PostgreSQL
- **Nama lengkap + Nomor KTP 16 digit wajib** dilampirkan sebagai persetujuan elektronik yang sah
- **Timestamp presisi** (`accepted_at`) + user-agent terekam untuk audit
- **Cetak PDF** dokumen perjanjian lengkap dengan blok para pihak, 10 pasal, bukti persetujuan bernomor & bertimestamp (KTP dimask sebagian)
- **Rekam CMS lengkap** — menu admin "Perjanjian Agen": tabel searchable semua agen yang menyetujui + unduh PDF per agen untuk audit internal
- **Keamanan DB** — tabel `sp_agent_agreements` dengan RLS (agen hanya insert/baca miliknya; admin baca semua; tanpa policy update/delete = immutable), constraint KTP 16 digit, unik per agen per versi dokumen

---

## v1.14.1 — 2026-07-03

### Fixes (Phase 1)
- **Popup install PWA muncul andal** — fallback 4 detik saat browser tidak mengirim `beforeinstallprompt` (menampilkan panduan pasang via menu browser); kunci dismiss kini per-versi sehingga setiap rilis menawarkan ulang sekali
- **Versi app di My Profile** — baris `SurePath · v<versi>` di bawah tombol Keluar pada profil Nasabah dan Agen

---

## v1.14.0 — 2026-07-03

### Insurer Selection, Success Animations, PWA Popup, Product Cards
- **5 asuransi dengan logo brand** — Intra Asia, Zurich Asuransi Indonesia, Tugu Insurance, Asuransi Sinar Mas, Sompo Insurance Indonesia; SVG brand mark per insurer (`InsurerLogos.tsx`), badge berwarna khas masing-masing
- **Pemilihan asuransi terhubung CMS** — StepProviders kini membaca `sp_insurers` Supabase (toggle aktif via admin InsurerAdmin); sebelumnya dari IndexedDB lokal yang basi; fallback aman ke konstanta saat offline; 5 insurer di-seed ke CMS
- **Langkah pemilihan asuransi terpisah** dari lembar coverage (langkah 3 wizard) dengan kartu kaya: logo, rating, cashback koin, kecepatan klaim, keunggulan, kelebihan/kekurangan, banding hingga N asuransi
- **SuccessBurst** — animasi perayaan reusable (confetti + centang menggambar + ring) untuk pembayaran berhasil, pengajuan terkirim, dan redirect pembayaran Xendit
- **Popup install PWA baru** — glass sheet dengan logo resmi, 3 benefit, panduan iOS langkah demi langkah, CTA gradient
- **Kartu produk asuransi lebih kreatif** — rail warna identitas produk, ikon watermark oversized, tile ikon dengan ring + tilt saat hover, chip AI emerald

---

## v1.13.0 — 2026-07-03

### 3-Page Proposal PDF + Reliability
- **Proposal penawaran 3 halaman** (`services/proposalPdf.ts`) — Hal 1: cover branded (emerald full-bleed, logo resmi, kartu nama klien, jalur dekoratif); Hal 2: penawaran + intro personal, grid info kendaraan, tarif OJK, tabel rincian premi zebra, bar total; Hal 3: ringkasan manfaat per tipe perlindungan, syarat & ketentuan PSAKBI, lembar persetujuan (kotak tanda tangan Tertanggung + Agen), footer bernomor halaman
- **Tombol "Unduh Proposal Penawaran (PDF)"** di langkah Ringkasan wizard beli nasabah — tepat sebelum tombol bayar (sebelumnya tidak ada sama sekali di app nasabah)
- **Agent quote PDF** kini memakai proposal 3 halaman yang sama (menggantikan PDF 1 halaman lama)
- **Total Dicairkan real** — AgentCommission menjumlahkan withdrawal berstatus DISBURSED dari Supabase (sebelumnya hardcoded Rp 0)
- **CI gate** — GitHub Actions: `tsc --noEmit` + build wajib hijau di setiap PR ke main
- **Sentry error monitoring** — `@sentry/react` terpasang; aktif otomatis saat `VITE_SENTRY_DSN` diisi di environment (no-op tanpa DSN)

---

## v1.12.0 — 2026-07-03

### Auth & Login Experience Overhaul
- **AuthGate redesigned** — dark aurora replaced with the app's light emerald-glass theme: ambient wash, sp-glass card, official logo, gradient CTA; all aux screens (check-email, forgot, OTP, reset) rethemed
- **Google on register** — "Daftar dengan Google" now on the Register tab (was sign-in only); OTP/magic-link stays on sign-in
- **Login success screen modernized** — new AppEntryScreen: light theme, official logo in glass tile with expanding success rings, draw-in check badge, emerald confetti burst, personalized greeting; faster (1.95s vs 2.3s)
- **AdminLogin rethemed** — near-black hacker style replaced with the same light emerald-glass language; official logo replaces generic shield icon
- **Admin CMS shell harmonized** — root/sidebar/header/notification surfaces now emerald-tinted glass (dark variant of the same design family; light variant aligned to #f6faf7)

---

## v1.11.0 — 2026-07-03

### Official Brand Assets + PWA Hardening + Creative UI
- **Official logo everywhere** — uploaded brand shield + wordmark converted to all sizes: pwa-192/512, maskable-512 (62% safe zone), apple-touch-icon 180, favicon-32/64 PNG, logo.png (in-app headers via SurePathLogo), logo-full.png, og-image 1200×630, play-store-icon
- **PWA hardened** — explicit `registerSW({ immediate: true })` in entry (was relying on auto-injected script only); brand favicons linked in index.html
- **Version badge visible in apps** — v{APP_VERSION} chip in Customer and Agent portal headers (was only on website navbar)
- **New creative loading animation** — floating official logo with ground shadow, winding SurePath 'path' being drawn with traveling dot (offset-path), rising leaf particles, light theme
- **Illustrative onboarding scenes** — 6 hand-built animated vector illustrations (protection umbrella, photo-claim with AI scan, human support, quote doc, commission coins, network nodes) replacing icon-orbit composition
- **Custom menu icons** — bottom navs of both portals now use mascot-motif Bot icons (Home, Shield, ClaimCam, Policy, Wallet, User)
- **Card design refined** — emerald-tinted glass gradient, branded borders (emerald-100/emerald glow on hover), layered depth shadows, warmer dark variant

---

## v1.10.0 — 2026-07-02

### World-Class App Refine (Gojek-grade, 4 phases — auto-deployed per phase)
- **Phase 1 — Animated loading + brand icons**: PortalLoader rebuilt (mascot shield, pulse rings, orbiting dot, ambient wash, sequenced dots); 7 new mascot-motif icons (BotWallet, BotCoin, BotPolicy, BotClaimCam, BotAgent, BotHome, BotChart)
- **Phase 2 — Illustrated onboarding**: fullscreen role-aware tour (3 slides nasabah, 3 slides agen) with floating hero badge + satellite icons, glass bottom card, progress dots, skip, safe-area, reduced-motion; wired to first-run via SP_ONBOARDED_<role>
- **Phase 3 — Quotation PDF rebrand**: emerald palette (was orange/navy), vector shield logo, 'Tarif OJK' transparency row (rate % + band), emerald notes box, myinsurepath.com footer
- **Phase 4 — CMS alignment**: 'Onboarding Apps' section in Website Editor (admin can toggle tour visibility platform-wide via sp_website_config); OnboardingFlow honors is_visible kill-switch

---

## v1.9.1 — 2026-07-02

### Mobile App UI — Glassmorphism Refine
- **True glass surfaces** — new `sp-glass` / `sp-glass-strong` utilities: backdrop blur + saturation, inset edge-refraction highlight, emerald-tinted shadows, full light/dark variants
- **Uniform across portals** — identical glass treatment for Customer and Agent apps (cards, headers, bottom navs)
- **Ambient emerald wash** — fixed radial gradient backdrop (`sp-ambient`) behind content so glass has depth to refract
- **41 surfaces converted** — CustomerPortal, AgentHome, AgentPortal chrome, AgentWallet, AgentCommission, AgentProfile, AgentCRM, AgentNetwork, AgentLeaderboard, OrderDetailSheet (bottom sheet now frosted over dimmed backdrop)
- Empty-state dashed cards intentionally kept flat for contrast

---

## v1.9.0 — 2026-07-02

### OJK Rate Engine (SEOJK No. 6/SEOJK.05/2017 — 100% accuracy)
- **Base rates corrected** — all COMP/TLO MIN/MID/MAX tables in `services/ojkRates.ts` now exact per Tabel IV.A (TLO was inverted; Cat 4/5 COMP too high; motorcycle rates wrong)
- **Motorcycle TLO zone-dependent** — W1 1.94%, W2 1.98%, W3 0.74% (was flat 0.65%)
- **Perluasan corrected per Tabel IV.B** — SRCC & Terorisme: COMP 0.05% / TLO 0.035% (was 0.07% flat); TPL now progressive (1% / 0.5% / 0.25% tiers); terrorism add-on added
- **Rate band selection** — `rate_band` (MIN/MID/MAX) column in `sp_product_configs`; three-way selector in ProductConfigAdmin; public calculator shows all three bands (Batas Bawah / Tengah / Atas)
- **Single source of truth** — `constants.ts getOJKRate()` now derives from `services/ojkRates.ts`

### Full Platform Audit Fixes
- **CRITICAL: AgentQuoteBuilder crash fixed** — `CAR_DATABASE` was referenced but never imported (ReferenceError when agent edits year on car quote)
- **CRITICAL: ProductAIExplainer crash fixed** — read nonexistent `data.benefits` (correct: `neuralBenefits`); crashed on render
- **Admin: backup date fixed** — read `createdAt` instead of `created_at`; showed "Invalid Date"
- **Admin: withdrawal disburse button fixed** — redundant condition made the button logic unreachable for APPROVED status
- **@types/react installed** — React 19 type definitions were missing entirely; surfaced 24 latent type errors, all fixed
- **Lint green** — `tsc --noEmit` now passes with 0 errors (was 79)
- **Security: internal PDFs removed from public/** — HANDOVER.pdf, MASTERMIND.pdf, PANDUAN_IT_SUREPATH.pdf were publicly downloadable
- **Dead code removed** — `CarInsuranceWizard1.tsx`, `ui/signin-page.tsx` (never imported)
- **Version aligned** — package.json + `src/version.ts` bumped to 1.9.0 (were stuck at 1.8.0 while CHANGELOG said 1.8.4)
- **Type safety** — `SpPolicyOrder.coverage_type` widened for CUSTOM/MPAR/PA/TRAVEL/LIFE wizards; `SpUser` B2B company fields typed; quote types include MOTORCYCLE

---

## v1.8.4 — 2026-06-15

### Fixes (Agent Portal)
- **AgentWallet wired** — `AgentWalletView` added as `wallet` case in `AgentPortal` renderTab; previously orphaned and unreachable
- **Withdraw button fixed** — `handleWithdraw` in `AgentCommission` now navigates to wallet tab via `onNavigate` prop instead of showing a fake success toast
- **CANCELLED status in order list** — Added `CANCELLED` to `STATUS_META` and filter tabs in `AgentOrderStatus`
- **Order load error handling** — `useEffect` in `AgentOrderStatus` now catches errors; loading spinner no longer hangs on failure

---

## v1.8.3 — 2026-06-15

### Fixes (Admin UX)
- **Approvals for ADMIN role** — "Antrean Polis" menu now accessible to `ADMIN` role (was `MASTER_ADMIN` + `INSURANCE_ADMIN` only)
- **CANCELLED order status** — Added `CANCELLED` to `SpPolicyOrder['status']` type; `STATUS_META` and filter tabs in `PolicyOrdersAdmin` now render cancelled orders correctly instead of crashing
- **Dashboard stats auto-refresh** — `adminStats` + `transaksiStats` now refresh every 2 minutes automatically; manual Refresh button added to Dashboard header
- **User list refresh** — Refresh button added to `UserManagementView` so newly registered users appear without full page reload

---

## v1.8.2 — 2026-06-14

### New Features
- **Order history refetch** — Submissions now appear instantly after wizard completion; history tab auto-refreshes; manual refresh button (spinning `RefreshCw`) added
- **Order detail sheet** — Tap any policy card in history → bottom-sheet with status timeline, vehicle/coverage/premium breakdown, AI survey result, cancel/resubmit actions
- **Cancel pending submission** — Customer can cancel `SUBMITTED`/`UNDER_REVIEW` orders; server-side ownership check (`cancel_my_order` gateway); `CANCELLED` status shown in history
- **Resubmit flow** — "Ubah & Ajukan Ulang" cancels current order and routes back to buy wizard
- **Profile: Display Size** — `AccessibilitySettings` component: pick Kecil/Normal/Besar (0.9×/1.0×/1.15×), persists to localStorage, applies as `html { font-size }` for rem-based scaling
- **Manual dark mode only** — Dark mode no longer auto-switches by time or system preference; all portals (Customer, Agent) read/write `sp_dark_mode` localStorage key

### Fixes
- **Status bar white** — `theme_color` and `<meta name="theme-color">` changed to `#ffffff`; mobile status bar now white/neutral
- **Navbar pill UX** — Active tab uses soft pill (`bg-emerald-50`, `rounded-full`, `scale-[1.08]`, `-translate-y-0.5`); inactive = `text-gray-400`; z-index `z-[1000]`
- **Wizard step indicator** — Replaced dot-connector bar with segmented pill track; gradient fill on completed segments; glow on active; label + "Langkah X/N" below
- **Animation utilities** — `animate-fade-in`, `animate-slide-up`, `animate-scale-in` keyframes in `styles.css`
- **cancel_my_order** gateway action added + `cancelMyOrder` service fn + `CANCELLED` status in `SpPolicyOrder` type

---

## v1.8.1 — 2026-06-14

### New Features
- **Banner image upload** — Admin can upload image as promo banner background; `PromoBanner` renders image with gradient overlay when set; text-only emerald fallback when no image
- **PWA update notification** — `AppUpdateNotification` toast (bottom-right, emerald border) appears on SW `controllerchange`; user-triggered reload via "Muat ulang" button
- **PWA icons rebuilt** — White background (`#FFFFFF`), emerald shield fills 78% canvas; all 4 sizes regenerated (`pwa-192x192`, `pwa-512x512`, `pwa-maskable-512`, `apple-touch-icon`)

---

## v1.8.0 — 2026-06-14

### New Features
- **Version badge** — `v1.8.0` chip displayed in Navbar; `src/version.ts` exports `APP_VERSION` constant
- **Admin-managed promo banner** — `PromoBanner` component fetches `promo_banner` from `sp_website_config`, shows emerald gradient banner with slide-down animation, dismissible (persists via localStorage). Visible in customer portal and agent home.
- **Promo Banner admin UI** — New `PromoBannerAdmin` sub-component in `WebsiteEditorAdmin`: set headline/subtitle, toggle visibility, live preview, save via `upsertWebsiteSection`

### Refactors
- **App.tsx modularized** — 1108 → 411 lines. Extracted:
  - `src/routes/splash.tsx` (407 lines) — splash screen, entry screen, mascot, keyframe CSS, i18n copy
  - `src/routes/PortalErrorBoundary.tsx` (31 lines) — portal error boundary class component

---

## v1.7.x — 2026-06-13

### Features
- **Agent home redesign** — premium single-focal commission hero, staggered motion entrance, Lucide icons replacing emoji
- **Admin dashboard data fix** — replaced IndexedDB reads with Supabase (`callGateway`) for ledger, user list, and approvals views
- **Admin approvals page** — working approve/reject flow via `updateOrderStatus()` with reviewer notes
- **Car wizard Step 5 AI survey** — photo upload → AI scoring → result panel for CLEAN/MANUAL_REQUIRED/REVIEW_REQUIRED/REJECTED verdicts
- **Payment gate** — wizard step 6 (payment) locked until AI/admin approval; SUBMITTED policies routed to approval queue
- **Insurer comparison step** — provider cards with authorized garage, claim speed, benefits badges; animated selection
- **Max discount = max commission** — `BASE_COMMISSION_PERCENT` (25%) caps discount slider in StepCoverage
- **PWA fixes** — zoom lock, overscroll-none, install prompt chip, iOS Add-to-Home-Screen hint, localStorage TC caching
- **Ecosystem brand token alignment** — orange primary → emerald across all components

### Docs
- `docs/APP_FLOWCHART.md` — full auth/customer/agent/admin/B2B flow (441 lines) + flow-issue audit
