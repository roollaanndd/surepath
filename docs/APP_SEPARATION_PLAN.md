# APP SEPARATION — Pemisahan Apps per Role (CUSTOMER / AGENT / OPERATOR / ADMIN / dsb.)

> Status: **Fase 1 DIEKSEKUSI** (branch `feat/app-packages-phase1`). Owner directive 2026-11-01: pisahkan
> coding antar apps supaya setiap user mengunduh sesuai role-nya — **tanpa
> mengubah coding yang ada**, hanya re-routing / cloning sesuai apps masing-masing.
> Prioritas: tidak boleh crash, tidak boleh mengganggu pipeline rilis yang berjalan
> (#352, #350 → v2.7.41).

---

## 1. Fakta arsitektur sekarang (dipastikan dari repo, bukan asumsi)

| Area | Saat ini |
|---|---|
| Entry tunggal | `index.tsx` → `App.tsx` (AuthGate + role → route) → router di `src/app/routes/*` |
| Peta role→route | `#346` flag: `ADMIN→/admin`, `OPERATOR→/operatorapp`, `AGENT→/agapps`, `CUSTOMER→/custapp`, `B2B_CLIENT` cabang sendiri |
| Code-splitting | Sudah ada per portal (`lazy()` per `src/app/routes/{admin,agent,customer,operator,insurer,b2b,marketing}.tsx`) |
| PWA | **satu** manifest (`id: '/'`, scope `/`) di `vite.config.ts` — semua role berbagi satu install |
| Android | **satu** APK: `capacitor.config.ts` `appId: com.myinsurepath.os`, webDir `dist` |
| Vercel | `vercel.json` rewrites SPA tunggal + CSP kuat |
| Ukuran bundle (dist saat ini) | core `index-*.js` ≈ 452 KB; `AgentPortal-*.js` ≈ 450 KB; `AdminViews` + AdminPortal ≈ besar; vendor recharts/jspdf/html2canvas lazy |
| Multi-app user | `AppSelector` (localStorage mengingat pilihan) |
| Sumber kebenaran role | server-side `sp_users.allowed_apps` + fallback normalisasi role (`APP_FOR_ROLE`) |

**Kesimpulan kunci:** "unduhan per role" di level **web** sudah 80% berhasil
(portal berat masing-masing lazy); yang belum terpisah = **paket unduhan**
(PWA/APK/store listing) dan **kanal rilis** per app. Jadi fokus pemisahan =
paket & deploy, BUKAN refactor komponen.

---

## 2. Prinsip anti-crash (wajib di setiap fase)

1. **Tidak ada file lama yang diubah isinya** di Fase 1; Fase 2 hanya menambah
   file baru + satu prop *additif bersifat opsional* (default = perilaku sekarang).
2. **Bundel dibangun dari graf impor yang sama** — tidak ada copy-paste logika:
   dua app yang mengimpor `supabaseService` tetap satu implementasi.
3. **Role tetap diverifikasi server-side saat boot** (`AuthGate` sudah begitu).
   Matching paket↔role gagal → fallback ke pilih-app (`AppSelector`), BUKAN blank.
4. **Deep link lama harus tetap hidup**: `/agapps`, `/custapp`, `/admin`,
   `/operatorapp`, semua halaman publik — tidak ada route yang dinamai ulang.
5. **Service worker**: install lama (id `/`) tidak boleh repotigrate. SW baru
   punya scope sendiri; smoketest uninstall/pasang ulang.
6. Gate rilis per fase: `npm run build`, `npm run lint`, smoke login per role,
   `npm run check:android` (bila terkena), dan deploy Vercel dicek status nyata.

---

## 3. Fase eksekusi

### Fase 1 — Pemisahan "paket unduhan" (nol perubahan kode)
1. **Android Gradle flavors** (`android/app/build.gradle`):
   `{ customer, mitra, operator, admin }` dengan `applicationIdSuffix`
   (`.customer`, `.mitra`, …) → 4 listing Play Store, webhook `cap sync` per flavor.
   Diawasi `npm run check:android`.
2. **Path alias Vercel** ( Tambahan pada `vercel.json` `rewrites`):
   `/(nasabah|mitra|operator|admin)(.*)` → route SPA yang sudah ada
   (`/custapp`, `/agapps`, `/operatorapp`, `/admin`). Cosmetik, tidak menyentuh router.
3. **Hasil**: user mengunduh APK sesuai role; web tetap satu bundle (boleh —
   SPA sudah lazy per portal).

### Fase 2 — Multi-entry Vite (tambahan file baru; satu prop opsional di `App`)
1. File **baru**: `customer.html`, `agent.html`, `operator.html`, `admin.html`
   + `src/entries/<app>.tsx` (masing-masing ~8 baris: mount `App` dengan
   `initialRoute` yang di-override per role) + `vite.config.ts` menambah
   `rollupOptions.input`.
2. `App.tsx` menerima `initialRoute?: string` **opsional** — kalau tidak ada,
   perilaku identik dulu (tidak merusak). Per entry menampilkan AuthGate-path
   masing-masing; role mismatch → redirect ke `/` + `AppSelector`.
3. Build menghasilkan graf chunk **terpisah per entry** — verifikasi dengan
   `rollup-plugin-visualizer`: tidak boleh ada chunk cross-app (AdminViews tidak
   boleh nyelip di entry customer, dst.).
4. PWA & SW per entry dipasang hanya setelah SW-scope smoke test lulus.
5. Verifikasi e2e per entry: login masing-masing role → portal termuat → chunk
   portal lain TIDAK terunduh (Network tab).

### Fase 3 — Diet bundle per app (tergantung hasil Fase 2)
- `ChangePasswordModal` (523 KB!) & `AnalyticsDashboard` (404 KB) dipastikan
  tidak termasuk jalur eager core — pindah lazy jika masih eager.
- `index.es-*.js` / `jspdf` cek pemanggil — sudah lazy menurut config, ditegakkan
  oleh sweep diftogram visualizer.
- Batas sukses: core entry customer < ~250 KB LOL ls.

### Fase 4 — Clone repositori per app (TIDAK disarankan sekarang)
Pisahan repo/monorepo workspace hanya bila syarat toko menuntut codebase berbeda.
Risiko drift besar; harus bikin kanal sinkron (semver + tsconfig path alias)
dulu. Simpan sebagai opsi terakhir.

---

## 4. Urutan aman vs pekerjaan yang sedang jalan
1. Selesaikan integrasi PR #350 (v2.7.41) & rilis dulu (jangan campur).
2. Fase 1 APK flavor di branch terpisah → merge saat stabil.
3. Fase 2 multi-entry di branch behind feature flag (symbolic: entry baru belum
   dipromosikan sampai verifikasi lulus).
4. Dokumentasi tiap fase di `docs/CHANGELOG.md` + register di `design.md §15`.

## 5. Rollback per fase
- Fase 1: flavors netral terhadap web; rollback = pull flavor dari gradle file.
- Fase 2: entry-HTML baru tak bisa merusak `index.html` lama (tidak minus).
  Rollback = hapus entry + input vite.
- Fase 3: per-pindah lazy chunk 1 PR per chunk, mudah revert.
- Fase 4: rollback = hapus workspace pekerjaan; repo utama tetap perintah.
