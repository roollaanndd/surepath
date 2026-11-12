# Apps Mitra — Bahasa Desain "Kaca Pagi" (v2.9.0)

Panduan ini mengikat setiap layar di `components/agent/`. Tujuannya satu:
layar mana pun yang dibuka mitra terasa bagian dari app yang sama.

## Gagasan

Kanvas **putih bersih**, cahaya **hijau** yang mekar dari atas, panel **kaca
buram** yang mengambang di atasnya, dan **satu aksen oranye** yang hanya
dipakai untuk "titik tujuan": aksi membuat penawaran, promo, dan penanda
belum dibaca / menunggu. SurePath = jalur yang pasti — selalu ada satu titik
tujuan, tidak lebih.

## Berkas

| Berkas | Isi |
|---|---|
| `src/styles/agent-glass.css` | Token `--ag-*` dan kelas `.ag-*`. Semua di bawah `.ag-app` (root AgentPortal). |
| `components/agent/ui/AgIcon.tsx` | Keluarga ikon "Jalur" — `<AgIcon name="wallet" />`. |
| `components/agent/ui/kit.tsx` | `AgGlass`, `AgSection`, `AgPageHeader`, `AgButton`, `AgChip`, `AgTile`, `AgRow`, `AgEmpty`, `AgSkeleton`, `AgCountUp`. |
| `components/agent/ui/shell.tsx` | `AgTopBar` (header kaca + top menu), `AgDock`. Hanya dipakai AgentPortal. |

## Token (pakai lewat `style={{ color: 'var(--ag-ink)' }}` atau kelas `.ag-*`)

- Tinta: `--ag-ink` (judul, angka), `--ag-ink2` (isi), `--ag-ink3` (keterangan).
- Hijau: `--ag-green` (isian/cahaya), `--ag-green-ink` (teks & ikon hijau di atas putih — yang lolos kontras), `--ag-green-tint` (latar lembut), `--ag-green-deep`.
- Oranye: `--ag-orange` (isian), `--ag-orange-ink` (teks oranye di atas putih), `--ag-orange-tint`.
- Permukaan: `--ag-glass`, `--ag-glass-strong`, `--ag-hairline` (garis pemisah), `--ag-shadow`.
- Token `--ds-*` lama tetap sah (mis. `text-ds-ink`, `bg-ds-red-lt`) — keduanya punya nilai mode gelap.

Semua token berbalik sendiri di mode gelap. **Jangan** menulis warna heksa
mentah untuk teks atau latar kartu; **jangan** memakai palet Tailwind mentah
(`bg-amber-50`, `text-slate-500`, `bg-white`) pada kode baru.

## Aturan tata letak

1. **Setiap layar dibuka `AgPageHeader`** (judul + subjudul satu kalimat + ikon),
   kecuali Beranda. Bar atas sudah menyebut nama layar; header halaman
   memberi konteks dan aksi utama layar itu.
2. **Konten = kartu kaca.** `AgGlass` untuk kelompok informasi, `AgGlass strong`
   untuk daftar dan formulir (lebih buram, teks lebih terbaca). Radius 24px.
   Jarak antar kartu `space-y-4`/`space-y-5`; tepi layar `px-5`.
3. **Daftar = `AgRow`** di dalam satu `AgGlass strong` (garis pemisah otomatis).
4. **Kosong = `AgEmpty`** dengan satu kalimat yang mengajak bertindak.
5. **Memuat = `AgSkeleton`** berbentuk seperti konten yang akan muncul, bukan
   spinner di tengah layar.
6. **Kartu utama uang** (saldo, total komisi) memakai `.ag-hero` + `.ag-hero__glass`
   untuk chip/tombol di dalamnya — teks putih di atas hijau tua.

## Tipografi

- Font Sora (sudah `font-sora` di root). Angka uang: kelas `.ag-num` atau
  `.ag-display` — **bukan** `font-mono`.
- Judul layar 22px/700, judul bagian `.ag-title` (17px/700), isi `.ag-body`
  (14px), keterangan `.ag-caption` (12px). Tidak ada teks di bawah 11px.
- **Tanpa label HURUF BESAR ber-tracking lebar.** `uppercase tracking-widest`
  dan `font-black` dari gaya lama diganti huruf kalimat biasa dengan bobot
  600–700. Label formulir: 12px/600, `--ag-ink2`.

## Ikon

- Ikon yang menamai modul, produk, atau tindakan: **`AgIcon`**. Nama yang ada:
  home, policy, plus, wallet, profile, quote, document, clients, claims,
  renewals, network, rank, endorsements, commission, pathy, bell, moon, sun,
  car, motor, travel, health, gadget, box, withdraw, download, history,
  chevron, back, arrow, search, check, close, lock, gift, spark, target,
  trend, calendar, copy, logout, settings, help, info, warning, chat, star,
  eye, edit, bank, headset, share, camera, filter, phone.
- Ukuran: 16 (dalam teks/tombol kecil), 20–22 (tombol, baris), 24–26 (di dalam `AgTile`).
- Ikon di dalam wadah: `<AgTile icon="claims" size={44} />`.
- Di atas isian hijau/oranye, penanda ikon dibuat putih:
  `style={{ ['--ag-icon-accent' as string]: '#fff' }}` (AgButton primary/spark sudah melakukannya).
- Lucide tetap boleh untuk kontrol yang tidak ada padanannya (mis. `Loader2`,
  panah urut). `ModuleIcon` dengan id Icon Manager tetap sah bila sudah ada.
- Butuh ikon yang belum ada? Tambahkan ke `GLYPHS` di `AgIcon.tsx` dengan
  aturan yang sama: grid 24, garis 1.75 membulat, tepat satu penanda oranye
  (`<Dot>` atau `<Mark>`).

## Tombol

- Aksi utama layar: `<AgButton>` (hijau). **Maksimum satu** per layar/kartu.
- Aksi "titik tujuan" (buat penawaran, bayar, klaim promo): `variant="spark"` (oranye). Hemat.
- Sekunder: `variant="glass"`. Tersier/tautan: `variant="quiet"`.
- Tinggi sentuh minimal 44px (`size="sm"` = 38px hanya untuk aksi di dalam baris).
- Tulisan tombol = kata kerja yang menyebut hasilnya ("Tarik dana", "Simpan klien"), huruf kalimat.

## Status

`<AgChip tone="green|spark|mute|danger">` — hijau = selesai/aktif, oranye =
menunggu/perlu tindakan, abu = netral, merah = gagal/ditolak. Status selalu
punya teks, tidak pernah warna saja.

## Gerak

- Tekan: kelas `.ag-press` (skala 0.94 dengan pegas) pada elemen yang bisa ditekan.
- Masuk layar: bungkus bagian dengan `.ag-rise` dan `style={{ ['--i' as string]: n }}`
  untuk urutan; `AgSection`/`AgPageHeader` sudah membawanya.
- Transisi antar layar ditangani AgentPortal (`.ag-screen`). Jangan menambah
  animasi masuk kedua di tingkat layar.
- Semua gerak sudah dimatikan di bawah `prefers-reduced-motion`.

## Yang tidak boleh berubah saat mendesain ulang

- **Logika, alur data, panggilan gateway, validasi, dan teks hukum.** Ini
  perombakan tampilan; perilaku setiap layar tetap.
- Teks antarmuka tetap Bahasa Indonesia (dengan padanan Inggris lewat `t()`).
- Kontrak `tests/agentApp.spec.ts`: `<nav aria-label="Navigasi utama">`, teks
  tab, tombol bernama "Pathy".
- String yang dijaga tes sumber: lihat `services/__tests__/agentPremiumPolish.test.ts`
  (AgentProfile), `agentHomeStnkDisc.test.ts` dan `agentVehicleProductCode.test.ts`
  (AgentQuoteBuilder, VehicleUnderwritingWizard), `moduleIconIds.test.ts`
  (id `ModuleIcon` harus kanonik).
