# Deploy frontend tanpa menunggu limit Vercel

Dokumen ini menjawab satu pertanyaan: kalau Vercel menolak deploy, bagaimana
perubahan frontend tetap bisa naik?

## Apa yang terjadi pada 24 Oktober 2026

Akun Vercel kehabisan kuota deploy pada 07:48. Angkanya, dibaca dari API
Vercel:

| | |
|---|---|
| Deploy dalam 5,5 jam (02:16–07:48) | **52** |
| Di antaranya preview (bukan produksi) | **45** (87%) |
| Dari satu branch saja (`fix/transaction-lifecycle-rebased`) | **21** |
| Deploy produksi yang sebenarnya dibutuhkan | **7** |

Akibatnya commit `a1339b4` yang sudah masuk `main` tidak bisa naik ke
produksi sama sekali: `main` unggul satu commit di depan situs live, dan tidak
ada yang bisa dilakukan sampai jendela kuota bergulir.

## Tidak ada jalan pintas di Vercel — ini sudah dipastikan

Batasnya adalah **rate limit API**, bukan fitur dashboard:

| Rate limit | Batas | Jendela | Dihitung per |
|---|---|---|---|
| `api-deployments-free-per-day` | 100 | 86.400 s | **akun** |
| `api-deployments-free-per-hour` | 100 | 3.600 s | akun |
| `api-deployments-flood` | 60 | 300 s | akun |

Dua hal penting dari tabel itu:

1. **Dihitung per akun (`owner`), bukan per proyek.** Membuat proyek Vercel
   kedua tidak menambah kuota.
2. **Semua jalur masuk ke keranjang yang sama.** `vercel deploy --prebuilt
   --prod` lewat CLI atau GitHub Actions, deploy hook, panggilan REST API, dan
   push git — semuanya *membuat sebuah deployment*, jadi semuanya memakai satu
   slot. Jadi menjawab pertanyaan yang sering muncul: **CLI tidak melewati
   limit ini.**

Yang tidak memakai kuota: deploy edge function Supabase
(`.github/workflows/deploy-edge-functions.yml`) dan migrasi database. Keduanya
tidak lewat Vercel sama sekali.

## Perbaikan 1 — matikan preview deploy (sudah berlaku, tanpa tangan Anda)

`vercel.json` kini berisi blok `git.deploymentEnabled` yang mematikan deploy
otomatis untuk setiap pola branch kerja: `claude/**`, `dependabot/**`,
`feat/**`, `fix/**`, `seo/**`, `tmp/**`, dan seterusnya. Branch yang tidak
terdaftar tetap default `true`, jadi **`main` — dan hanya `main` — yang
deploy.**

Dengan aturan ini, pemakaian 24 Oktober turun dari 52 menjadi **7**. Kuota
100/hari praktis tidak mungkin tersentuh lagi.

Tidak ada yang hilang karenanya. Preview `surepath-git-*.vercel.app` ditolak
oleh network policy sesi agen, jadi tidak pernah dibaca siapa pun; dan pagar
mutu yang benar-benar menjaga sebuah merge adalah
`.github/workflows/ci.yml`, yang jalan di pull request dan tidak melibatkan
Vercel.

> Kalau nanti ada prefix branch baru, tambahkan polanya ke `vercel.json`.
> **Jangan** menggantinya dengan wildcard tunggal
> (`{"**": false, "main": true}`): urutan prioritasnya tidak didokumentasikan
> Vercel, dan salah menebak berarti deploy produksi ikut mati.

## Perbaikan 2 — jalur deploy kedua (siap, menunggu Anda menyalakan)

Supaya frontend tidak lagi bergantung pada satu host, repo sekarang punya
`.github/workflows/deploy-cloudflare-pages.yml`. Workflow itu membangun
`dist/` sendiri dari repo dan mengunggahnya ke Cloudflare Pages, yang
kuotanya **500 build per bulan**, bukan 100 deploy per hari, dan tidak
dibagi dengan Vercel.

Agar situs berperilaku sama di host mana pun, dua berkas di `public/`
menduplikasi apa yang `vercel.json` lakukan di Vercel:

- `public/_headers` — CSP dan seluruh header keamanan, plus aturan
  `Cache-Control`.
- `public/_redirects` — fallback SPA (`/* /_fallback.html 200`). Routing
  SurePath ditulis tangan di History API, jadi tanpa aturan ini setiap deep
  link (`/agapps`, `/admin`, `/blog/<slug>`) dijawab 404 dan aplikasi tidak
  pernah boot. Berkas asli menang atas aturan ini, jadi 26 halaman
  prerender tetap tersaji langsung — urutan yang sama seperti di Vercel.

Workflow memeriksa ketiga berkas itu benar-benar sampai ke `dist/` dan gagal
keras kalau tidak, supaya situs tidak pernah tersaji tanpa CSP atau tanpa
deep link.

Selama secret belum diisi, workflow **tidak melakukan apa pun** dan menulis
alasannya di halaman run. Jadi aman dibiarkan menganggur.

### Langkah menyalakannya (sekali saja, ±10 menit)

1. Buka <https://dash.cloudflare.com/sign-up> dan daftar akun gratis.
2. Di sidebar dashboard, salin **Account ID**.
3. Klik ikon profil kanan atas → **My Profile** → **API Tokens** →
   **Create Token** → **Get started** (custom token).
   - Permissions: **Account** → **Cloudflare Pages** → **Edit**.
   - **Continue to summary** → **Create Token**, lalu salin tokennya
     (hanya ditampilkan sekali).
4. Buka
   <https://github.com/roollaanndd/surepath/settings/secrets/actions> →
   **New repository secret**, dan tambahkan empat ini:

   | Name | Value |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | token dari langkah 3 |
   | `CLOUDFLARE_ACCOUNT_ID` | Account ID dari langkah 2 |
   | `VITE_SUPABASE_URL` | nilai yang sama dengan yang dipakai Vercel |
   | `VITE_SUPABASE_ANON_KEY` | nilai yang sama dengan yang dipakai Vercel |

   Dua yang terakhir bisa disalin dari Vercel → project **surepath** →
   **Settings** → **Environment Variables**.
5. Buka
   <https://github.com/roollaanndd/surepath/actions/workflows/deploy-cloudflare-pages.yml>
   → **Run workflow**. Hasilnya tersaji di
   `https://surepath.pages.dev`.

Sampai di sini **myinsurepath.com belum berpindah.** Pages hanya menyajikan
build di URL `*.pages.dev` miliknya sendiri. Produksi tetap di Vercel.

### Memindahkan domain ke Cloudflare (hanya kalau Vercel benar-benar mati)

Ini satu-satunya langkah yang tidak bisa dibatalkan dalam hitungan detik
(propagasi DNS), jadi lakukan hanya saat memang perlu:

1. Cek dulu `https://surepath.pages.dev` jalan benar — login agen, login
   nasabah, satu halaman blog.
2. Cloudflare → **Workers & Pages** → **surepath** → **Custom domains** →
   **Set up a custom domain** → `myinsurepath.com`.
3. Cloudflare memberi nilai DNS yang harus dipasang. Pasang di tempat domain
   itu dikelola sekarang (kalau DNS-nya di Vercel: Vercel → **Domains** →
   `myinsurepath.com`).
4. Untuk kembali ke Vercel, pulihkan record DNS yang lama. Build di Vercel
   tidak terhapus oleh langkah apa pun di atas.

## Perbaikan 3 — yang sebenarnya paling tepat: naik dari Hobby

Dua alasan, dan yang kedua lebih serius daripada kuota:

1. **Pro memberi 6.000 deploy/hari** (dari 100). Masalah ini lenyap. Ada
   **Pro trial gratis**, jadi ini juga cara tercepat membuka blokir tanpa
   bayar: Vercel → **Settings** → **Billing** → **Upgrade**.
2. **Hobby secara resmi hanya untuk pemakaian non-komersial.** Dokumentasi
   Vercel menulis, pada halaman fair-use: *"the Hobby plan restricts users to
   non-commercial, personal use only"*. SurePath menjual polis asuransi dan
   memproses pembayaran Xendit — itu komersial. Risikonya bukan kuota, tapi
   akun dijeda. Ini keputusan Anda, bukan keputusan saya; saya hanya menandai
   bahwa risikonya nyata dan tidak terkait dengan kejadian 24 Oktober.

## Ringkasnya

| Kebutuhan | Jawabannya |
|---|---|
| Lewati limit via CLI | **Tidak bisa.** Satu keranjang rate limit, per akun. |
| Supaya tidak kena limit lagi | **Sudah dikerjakan** — preview deploy mati di `vercel.json`. |
| Deploy tanpa Vercel | Cloudflare Pages, workflow sudah ada, tinggal 4 secret. |
| Solusi paling benar | Pro trial (gratis) → Pro. Sekalian menyelesaikan soal lisensi Hobby. |
